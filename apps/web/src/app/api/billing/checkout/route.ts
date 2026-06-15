import { getAuthenticatedUser } from "@/lib/auth";

import { NextResponse } from "next/server";
import { Project } from "@repo/db";

import { z } from "zod";
import stripe from "@/lib/stripe";
import razorpay from "@/lib/razorpay";
import { PLANS } from "@/lib/plans";

const checkoutSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  gateway: z.enum(["razorpay"]), // Stripe is disabled
  planId: z.enum(["starter", "team", "scale"]),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not logged in" } },
        { status: 401 },
      );
    }

    const rawBody = await request.json();
    const validatedData = checkoutSchema.parse(rawBody);
    const { projectId, gateway, planId } = validatedData;

    // Verify project ownership
    const project = await Project.findOne({
      _id: projectId,
      ownerId: user._id,
    });

    if (!project) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Project not found" } },
        { status: 404 },
      );
    }

    const planDetails = PLANS.find((p) => p.id === planId);
    if (!planDetails) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid planId" } },
        { status: 400 },
      );
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Razorpay checkout
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    const amountInPaise = planDetails.priceINR * 100;

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.log(
        `[Mock Billing] No Razorpay keys found. Returning mock subscription payload for plan: ${planDetails.name}`,
      );
      return NextResponse.json({
        subscriptionId: `sub_mock_${Math.random().toString(36).substring(2, 11)}`,
        keyId: "rzp_test_mock",
        amount: amountInPaise,
        currency: "INR",
        name: "ObservabilityOS",
        description: `${planDetails.name} Plan Subscription (Mock)`,
        isMock: true,
      });
    }

    // Resolve Razorpay Plan ID from environment variables or use fallback mock IDs
    let rzpPlanId = "";
    if (planId === "starter") {
      rzpPlanId =
        process.env.RAZORPAY_PLAN_STARTER_ID ||
        process.env.RAZORPAY_PLAN_ID ||
        "plan_pro_tier";
    } else if (planId === "team") {
      rzpPlanId = process.env.RAZORPAY_PLAN_TEAM_ID || "plan_team_tier";
    } else if (planId === "scale") {
      rzpPlanId = process.env.RAZORPAY_PLAN_SCALE_ID || "plan_scale_tier";
    }

    // Create subscription in Razorpay
    const subscription = await razorpay.subscriptions.create({
      plan_id: rzpPlanId,
      customer_notify: 1,
      total_count: 12,
      notes: {
        projectId,
        plan: planDetails.backendPlan,
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: razorpayKeyId,
      amount: amountInPaise,
      currency: "INR",
      name: "ObservabilityOS",
      description: `${planDetails.name} Plan Subscription`,
    });
  } catch (error) {
    console.error("Billing Checkout POST Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message:
              "Validation failed: " +
              error.errors.map((e) => e.message).join(", "),
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate billing checkout",
        },
      },
      { status: 500 },
    );
  }
}
