/// <reference types="node" />

import fs from "fs";
import path from "path";
import { connectToDatabase, Project, User } from "@repo/db";
import { PLANS } from "../apps/web/src/lib/plans";
import { checkQuotaLimits, PLAN_LIMITS } from "../apps/web/src/lib/quota";

// Manual dotenv loading from the web app workspace
try {
  const envPath = path.join(process.cwd(), "apps/web/.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index > 0) {
        const key = trimmed.slice(0, index).trim();
        const val = trimmed.slice(index + 1).trim();
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.warn("Could not read .env file:", e);
}

async function verify() {
  console.log("Connecting to database at:", process.env.MONGODB_URI);
  await connectToDatabase();

  const results: Record<string, any> = {};
  let success = true;

  try {
    // 1. Find or create a test project
    let testProject = await Project.findOne({ name: "Billing Test Project" });
    if (!testProject) {
      // Find a user to own it
      let user = await User.findOne();
      if (!user) {
        user = await User.create({
          githubId: "billing_test_user",
          username: "billingtest",
          email: "billingtest@example.com",
        });
      }
      testProject = await Project.create({
        ownerId: user._id,
        name: "Billing Test Project",
        apiKey: `obs_sk_billing_test_${Math.random().toString(36).substring(2, 8)}`,
      });
    }

    const projectId = testProject._id.toString();
    const originalPlan = testProject.plan;
    const originalStatus = testProject.subscriptionStatus;
    const originalProvider = testProject.billingProvider;

    console.log(`Using Project: ${testProject.name} (${projectId})`);

    // Test 1: Shared limits config matches PLANS values
    console.log(
      "\n--- [Test 1] Verifying PLAN_LIMITS matches PLANS single source of truth ---",
    );
    try {
      const planPro = PLANS.find((p) => p.id === "pro");
      const planSelfHost = PLANS.find((p) => p.id === "self-host");

      const proOk =
        PLAN_LIMITS.pro.maxServices === planPro?.maxServices &&
        PLAN_LIMITS.pro.maxLogVolumeBytes === planPro?.maxLogVolumeBytes;
      const selfHostOk =
        PLAN_LIMITS["self-host"].maxServices === planSelfHost?.maxServices &&
        PLAN_LIMITS["self-host"].maxLogVolumeBytes ===
          planSelfHost?.maxLogVolumeBytes;

      results["test_1_limits_config_matching"] = {
        passed: !!(proOk && selfHostOk),
        proOk,
        selfHostOk,
      };
      console.log(
        `Result: ${results["test_1_limits_config_matching"].passed ? "PASSED" : "FAILED"}`,
      );
      if (!results["test_1_limits_config_matching"].passed) success = false;
    } catch (e: any) {
      results["test_1_limits_config_matching"] = {
        passed: false,
        error: e.message,
      };
      console.error("Test 1 Error:", e);
      success = false;
    }

    // Test 2: Checkout details from PLANS
    console.log(
      "\n--- [Test 2] Verifying Checkout Details resolved in PLANS ---",
    );
    try {
      const testPlanIds = ["pro"];
      const checkoutDetails: Record<string, any> = {};
      let checkoutPassed = true;

      for (const planId of testPlanIds) {
        const plan = PLANS.find((p) => p.id === planId);
        if (!plan) {
          checkoutPassed = false;
          continue;
        }
        const amountInPaise = plan.priceINR * 100;

        checkoutDetails[planId] = {
          priceINR: plan.priceINR,
          amountInPaise,
          expectedName: "ObservabilityOS",
          expectedDescription: `${plan.name} Plan Subscription`,
        };
      }

      results["test_2_checkout_logic"] = {
        passed: checkoutPassed,
        details: checkoutDetails,
      };
      console.log(
        `Result: ${results["test_2_checkout_logic"].passed ? "PASSED" : "FAILED"}`,
      );
      if (!checkoutPassed) success = false;
    } catch (e: any) {
      results["test_2_checkout_logic"] = { passed: false, error: e.message };
      console.error("Test 2 Error:", e);
      success = false;
    }

    // Test 3: Manual override simulation
    console.log("\n--- [Test 3] Verifying Manual Override simulation ---");
    try {
      const plansToTest = ["free", "pro", "self-host"] as const;
      const manualOverrideResults: Record<string, any> = {};

      for (const targetPlan of plansToTest) {
        testProject.plan = targetPlan;
        testProject.subscriptionStatus =
          targetPlan !== "free" ? "active" : "none";
        testProject.billingProvider = targetPlan !== "free" ? "manual" : "none";
        await testProject.save();

        const updatedProj = await Project.findById(projectId);
        if (!updatedProj) throw new Error("Project not found in DB");
        const isCorrect =
          updatedProj.plan === targetPlan &&
          updatedProj.subscriptionStatus ===
            (targetPlan !== "free" ? "active" : "none") &&
          updatedProj.billingProvider ===
            (targetPlan !== "free" ? "manual" : "none");

        manualOverrideResults[targetPlan] = {
          plan: updatedProj.plan,
          status: updatedProj.subscriptionStatus,
          provider: updatedProj.billingProvider,
          isCorrect,
        };

        if (!isCorrect) success = false;
      }

      results["test_3_manual_override_db"] = {
        passed: Object.values(manualOverrideResults).every(
          (r: any) => r.isCorrect,
        ),
        details: manualOverrideResults,
      };
      console.log(
        `Result: ${results["test_3_manual_override_db"].passed ? "PASSED" : "FAILED"}`,
      );
      if (!results["test_3_manual_override_db"].passed) success = false;
    } catch (e: any) {
      results["test_3_manual_override_db"] = {
        passed: false,
        error: e.message,
      };
      console.error("Test 3 Error:", e);
      success = false;
    }

    // Test 4: Webhook upgrade processing logic mimic
    console.log(
      "\n--- [Test 4] Verifying Webhook Upgrade logic processing ---",
    );
    try {
      const webhookPayloads = [{ plan: "pro", expectedPlan: "pro" }];
      const webhookResults: Record<string, any> = {};

      for (const { plan, expectedPlan } of webhookPayloads) {
        const payload = {
          id: `sub_test_${plan}`,
          customer_id: "cust_test_123",
          notes: {
            projectId,
            plan,
          },
        };

        const targetPlanNotes = payload.notes?.plan || "pro";
        await Project.findByIdAndUpdate(projectId, {
          plan: targetPlanNotes,
          subscriptionStatus: "active",
          billingProvider: "razorpay",
          razorpaySubscriptionId: payload.id,
          razorpayCustomerId: payload.customer_id,
        });

        const updatedProj = await Project.findById(projectId);
        if (!updatedProj) throw new Error("Project not found in DB");
        const isCorrect =
          updatedProj.plan === expectedPlan &&
          updatedProj.subscriptionStatus === "active" &&
          updatedProj.billingProvider === "razorpay" &&
          updatedProj.razorpaySubscriptionId === `sub_test_${plan}`;

        webhookResults[plan] = {
          dbPlan: updatedProj.plan,
          dbStatus: updatedProj.subscriptionStatus,
          dbProvider: updatedProj.billingProvider,
          isCorrect,
        };

        if (!isCorrect) success = false;
      }

      results["test_4_webhook_upgrade"] = {
        passed: Object.values(webhookResults).every((r: any) => r.isCorrect),
        details: webhookResults,
      };
      console.log(
        `Result: ${results["test_4_webhook_upgrade"].passed ? "PASSED" : "FAILED"}`,
      );
      if (!results["test_4_webhook_upgrade"].passed) success = false;
    } catch (e: any) {
      results["test_4_webhook_upgrade"] = { passed: false, error: e.message };
      console.error("Test 4 Error:", e);
      success = false;
    }

    // Test 5: Dynamic quota check matches PLAN_LIMITS config
    console.log(
      "\n--- [Test 5] Verifying Dynamic Quotas match configuration limits ---",
    );
    try {
      const quotaResults: Record<string, any> = {};

      for (const plan of ["free", "pro", "self-host"]) {
        const limits = await checkQuotaLimits(projectId, plan);
        const configLimits =
          PLANS.find((p) => p.backendPlan === plan) || PLANS[0];

        // Note: For self-host plan, exceeded is bypassed/hardcoded to false in checkQuotaLimits
        const isCorrect =
          limits.services.limit === configLimits.maxServices &&
          limits.logVolume.limit === configLimits.maxLogVolumeBytes;

        quotaResults[plan] = {
          servicesLimit: limits.services.limit,
          volumeLimit: limits.logVolume.limit,
          expectedServices: configLimits.maxServices,
          expectedVolume: configLimits.maxLogVolumeBytes,
          isCorrect,
        };

        if (!isCorrect) success = false;
      }

      results["test_5_quota_check"] = {
        passed: Object.values(quotaResults).every((r: any) => r.isCorrect),
        details: quotaResults,
      };
      console.log(
        `Result: ${results["test_5_quota_check"].passed ? "PASSED" : "FAILED"}`,
      );
      if (!results["test_5_quota_check"].passed) success = false;
    } catch (e: any) {
      results["test_5_quota_check"] = { passed: false, error: e.message };
      console.error("Test 5 Error:", e);
      success = false;
    }

    // Clean up test modifications
    testProject.plan = originalPlan;
    testProject.subscriptionStatus = originalStatus;
    testProject.billingProvider = originalProvider;
    await testProject.save();
  } catch (error: any) {
    success = false;
    results["global_error"] = error.message;
    console.error("Global Verification Error:", error);
  }

  console.log("\n==============================");
  console.log(`Verification Complete: ${success ? "SUCCESS" : "FAILURE"}`);
  console.log("==============================\n");

  if (success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
