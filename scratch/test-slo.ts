/// <reference types="node" />

import fs from "fs";
import path from "path";
import { connectToDatabase, Project, Service, Log, User } from "@repo/db";
import jwt from "jsonwebtoken";

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

const TEST_API_KEY = "obs_sk_TEST_KEY_DO_NOT_USE";
const TEST_GITHUB_ID = "dummy_slo_test_user";

async function verify() {
  console.log("Connecting to database at:", process.env.MONGODB_URI);
  await connectToDatabase();

  // 1. Setup Test User, Project, and Service
  console.log("\n--- [Step 1] Setting up test user, project, and service ---");

  // Clean up any existing test records first
  const existingUser = await User.findOne({ githubId: TEST_GITHUB_ID });
  if (existingUser) {
    const existingProject = await Project.findOne({
      ownerId: existingUser._id,
    });
    if (existingProject) {
      await Log.deleteMany({ projectId: existingProject._id });
      await Service.deleteMany({ projectId: existingProject._id });
      await Project.deleteOne({ _id: existingProject._id });
    }
    await User.deleteOne({ _id: existingUser._id });
  }

  const user = await User.create({
    githubId: TEST_GITHUB_ID,
    username: "slotestuser",
    email: "slotestuser@example.com",
  });

  const project = await Project.create({
    ownerId: user._id,
    name: "SLO Verification Project",
    apiKey: TEST_API_KEY,
  });

  const service = await Service.create({
    projectId: project._id,
    name: "slo-service",
    environment: "prod",
    slos: [],
  });

  console.log(`User created: ${user._id}`);
  console.log(`Project created: ${project._id}`);
  console.log(`Service created: ${service._id}`);

  // Generate Session Token
  const jwtSecret = process.env.JWT_SECRET || "dev-jwt-secret-for-testing-only";
  const sessionToken = jwt.sign({ userId: user._id.toString() }, jwtSecret);
  const cookieHeader = `session=${sessionToken}`;

  const apiBaseUrl = "http://127.0.0.1:3000";

  try {
    // 2. Seed Mock Logs
    console.log("\n--- [Step 2] Seeding mock logs for SLO calculations ---");
    const now = new Date();
    const logsToInsert: any[] = [];

    // Seed Availability Logs: 100 total logs, 4 are errors.
    // Together with 200 latency logs (which are level: info), total logs = 300.
    // Out of 300 logs, 4 are errors.
    // Compliance = (296/300) * 100 = 98.667%.
    console.log("Creating 100 availability logs (96 normal, 4 error)...");
    for (let i = 0; i < 96; i++) {
      logsToInsert.push({
        projectId: project._id,
        serviceId: service._id,
        environment: "prod",
        timestamp: new Date(now.getTime() - i * 5 * 60 * 1000), // Spanned over last ~8 hours
        level: "info",
        message: `Request ${i} succeeded`,
        metadata: {},
      });
    }
    for (let i = 0; i < 4; i++) {
      logsToInsert.push({
        projectId: project._id,
        serviceId: service._id,
        environment: "prod",
        timestamp: new Date(now.getTime() - i * 15 * 60 * 1000),
        level: "error",
        message: `Request error ${i}`,
        metadata: {},
      });
    }

    // Seed Latency Logs: 200 total logs, 10 are bad (latency > 200ms)
    // This should result in a 95.0% Latency compliance.
    console.log(
      "Creating 200 latency logs (190 good <=200ms, 10 bad >200ms)...",
    );
    for (let i = 0; i < 190; i++) {
      logsToInsert.push({
        projectId: project._id,
        serviceId: service._id,
        environment: "prod",
        timestamp: new Date(now.getTime() - i * 10 * 60 * 1000), // Spanned over last ~31 hours
        level: "info",
        message: `HTTP GET /api/v1/resource - 200 OK`,
        metadata: { latencyMs: 120 },
      });
    }
    for (let i = 0; i < 10; i++) {
      logsToInsert.push({
        projectId: project._id,
        serviceId: service._id,
        environment: "prod",
        timestamp: new Date(now.getTime() - i * 45 * 60 * 1000),
        level: "info",
        message: `HTTP GET /api/v1/resource - 200 OK (Slow)`,
        metadata: { latencyMs: 350 },
      });
    }

    await Log.insertMany(logsToInsert);
    console.log(`Successfully seeded ${logsToInsert.length} logs!`);

    // 3. Configure Availability SLO
    console.log("\n--- [Step 3] Configuring Availability SLO via POST ---");
    const availSloPayload = {
      projectId: project._id.toString(),
      serviceId: service._id.toString(),
      slo: {
        name: "Availability SLO",
        type: "availability",
        target: 99.0,
        windowDays: 7,
      },
    };

    let response = await fetch(`${apiBaseUrl}/api/services/slo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify(availSloPayload),
    });

    let body = await response.json();
    console.log("POST Availability SLO Response status:", response.status);
    if (!response.ok) {
      throw new Error(
        `Failed to configure Availability SLO: ${JSON.stringify(body)}`,
      );
    }
    console.log("Active SLOs in response:", JSON.stringify(body.slos, null, 2));

    // 4. Configure Latency SLO
    console.log("\n--- [Step 4] Configuring Latency SLO via POST ---");
    const latencySloPayload = {
      projectId: project._id.toString(),
      serviceId: service._id.toString(),
      slo: {
        name: "Latency SLO",
        type: "latency",
        target: 95.0,
        windowDays: 30,
        latencyThresholdMs: 200,
      },
    };

    response = await fetch(`${apiBaseUrl}/api/services/slo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify(latencySloPayload),
    });

    body = await response.json();
    console.log("POST Latency SLO Response status:", response.status);
    if (!response.ok) {
      throw new Error(
        `Failed to configure Latency SLO: ${JSON.stringify(body)}`,
      );
    }
    console.log("Active SLOs in response:", JSON.stringify(body.slos, null, 2));

    // 5. Query SLO status and budgets
    console.log(
      "\n--- [Step 5] Retrieving and verifying calculated SLO status ---",
    );
    response = await fetch(
      `${apiBaseUrl}/api/services/slo/status?projectId=${project._id}&serviceId=${service._id}`,
      {
        headers: {
          Cookie: cookieHeader,
        },
      },
    );

    body = await response.json();
    console.log("GET SLO Status Response status:", response.status);
    if (!response.ok) {
      throw new Error(
        `Failed to calculate SLO status: ${JSON.stringify(body)}`,
      );
    }
    console.log(
      "Calculated status results:",
      JSON.stringify(body.slos, null, 2),
    );

    // Verify mathematical correctness
    const availResult = body.slos.find(
      (s: any) => s.name === "Availability SLO",
    );
    const latencyResult = body.slos.find((s: any) => s.name === "Latency SLO");

    if (!availResult || !latencyResult) {
      throw new Error(
        "Missing availability or latency SLO results from status endpoint.",
      );
    }

    console.log("\nVerifying Availability SLO Calculations...");
    console.log(
      `Expected Compliance: 98.667%, Actual: ${availResult.compliance}%`,
    );
    console.log(`Expected Bad Requests: 4, Actual: ${availResult.badRequests}`);
    console.log(
      `Expected Total Requests: 300, Actual: ${availResult.totalRequests}`,
    );
    // Target is 99%, so allowable failures is 300 * 0.01 = 3.
    // Bad count is 4. Remaining budget is 3 - 4 = -1.
    // status should be "breached"
    console.log(
      `Expected Budget Remaining: -1, Actual: ${availResult.budgetRemaining}`,
    );
    console.log(`Expected Status: breached, Actual: ${availResult.status}`);

    if (
      Math.abs(availResult.compliance - 98.667) > 0.01 ||
      availResult.badRequests !== 4 ||
      availResult.totalRequests !== 300 ||
      availResult.budgetRemaining !== -1.0 ||
      availResult.status !== "breached"
    ) {
      throw new Error("Availability SLO math mismatch!");
    }
    console.log("✅ Availability SLO calculations verified successfully!");

    console.log("\nVerifying Latency SLO Calculations...");
    console.log(
      `Expected Compliance: 95.000%, Actual: ${latencyResult.compliance}%`,
    );
    console.log(
      `Expected Bad Requests: 10, Actual: ${latencyResult.badRequests}`,
    );
    console.log(
      `Expected Total Requests: 200, Actual: ${latencyResult.totalRequests}`,
    );
    // Target is 95.0%, so allowable failures is 200 * 0.05 = 10.
    // Bad count is 10. Remaining budget is 10 - 10 = 0.
    // status should be "warning"
    console.log(
      `Expected Budget Remaining: 0, Actual: ${latencyResult.budgetRemaining}`,
    );
    console.log(`Expected Status: warning, Actual: ${latencyResult.status}`);

    if (
      Math.abs(latencyResult.compliance - 95.0) > 0.01 ||
      latencyResult.badRequests !== 10 ||
      latencyResult.totalRequests !== 200 ||
      latencyResult.budgetRemaining !== 0.0 ||
      latencyResult.status !== "warning"
    ) {
      throw new Error("Latency SLO math mismatch!");
    }
    console.log("✅ Latency SLO calculations verified successfully!");

    // 6. Delete Latency SLO
    console.log("\n--- [Step 6] Deleting Latency SLO via DELETE ---");
    response = await fetch(
      `${apiBaseUrl}/api/services/slo?projectId=${project._id}&serviceId=${service._id}&sloName=${encodeURIComponent("Latency SLO")}`,
      {
        method: "DELETE",
        headers: {
          Cookie: cookieHeader,
        },
      },
    );

    body = await response.json();
    console.log("DELETE Latency SLO Response status:", response.status);
    if (!response.ok) {
      throw new Error(`Failed to delete SLO: ${JSON.stringify(body)}`);
    }
    console.log(
      "Active SLOs remaining in response:",
      JSON.stringify(body.slos, null, 2),
    );

    if (body.slos.length !== 1 || body.slos[0].name !== "Availability SLO") {
      throw new Error(
        "Expected only Availability SLO to remain after deletion.",
      );
    }
    console.log("✅ Latency SLO deletion verified successfully!");

    console.log(
      "\n🎉 ALL E2E SLO Target Tracking and Error Budget Verification Tests Passed!",
    );
  } catch (err) {
    console.error("\n❌ Verification failed during API calls:");
    throw err;
  } finally {
    // 7. Cleanup
    console.log("\n--- [Step 7] Cleaning up database ---");
    await Log.deleteMany({ projectId: project._id });
    await Service.deleteOne({ _id: service._id });
    await Project.deleteOne({ _id: project._id });
    await User.deleteOne({ _id: user._id });
    console.log("Database cleaned up successfully.");
  }
}

verify()
  .then(() => {
    console.log("\nProcess completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Verification failed with error:", err);
    process.exit(1);
  });
