import { getAuthenticatedUser } from "@/lib/auth";

import { NextResponse } from "next/server";
import { Project } from "@repo/db";

import { z } from "zod";
import razorpay from "@/lib/razorpay";
import { PLANS } from "@/lib/plans";

interface RazorpayPlan {
  id: string;
  item?: {
    name: string;
    amount: string | number;
    currency: string;
  };
}

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
    const { projectId, planId } = validatedData;

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

    // Resolve Razorpay Plan ID dynamically
    let rzpPlanId = "";
    const planName = `ObservabilityOS - ${planDetails.name}`;

    const plansList = await razorpay.plans.all({ count: 100 });
    const existingPlan = (plansList.items as unknown as RazorpayPlan[])?.find(
      (p) =>
        p.item?.name === planName &&
        Number(p.item?.amount) === amountInPaise &&
        p.item?.currency === "INR",
    );

    if (existingPlan) {
      rzpPlanId = existingPlan.id;
    } else {
      const newPlan = await razorpay.plans.create({
        period: "monthly",
        interval: 1,
        item: {
          name: planName,
          amount: amountInPaise,
          currency: "INR",
          description: `${planDetails.name} Plan Subscription`,
        },
      });
      rzpPlanId = newPlan.id;
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
