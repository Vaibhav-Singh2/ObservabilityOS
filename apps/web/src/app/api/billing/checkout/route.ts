import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectToDatabase, Project, User } from "@repo/db";
import jwt from "jsonwebtoken";
import { z } from "zod";
import stripe from "@/lib/stripe";
import razorpay from "@/lib/razorpay";

const checkoutSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  gateway: z.enum(["stripe", "razorpay"]),
});

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return null;

  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    await connectToDatabase();
    return await User.findById(decoded.userId);
  } catch {
    return null;
  }
}

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
    const { projectId, gateway } = validatedData;

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

    const origin = request.headers.get("origin") || "http://localhost:3000";

    if (gateway === "stripe") {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

      // If Stripe API key is not present, mock successful redirect for sandbox testing
      if (!stripeSecretKey) {
        console.log(
          "[Mock Billing] No Stripe key found. Redirecting to mock success URL.",
        );
        return NextResponse.json({
          url: `${origin}/dashboard/billing?projectId=${projectId}&checkout_status=success&gateway=stripe`,
          isMock: true,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID || "price_pro_tier",
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${origin}/dashboard/billing?projectId=${projectId}&checkout_status=success&gateway=stripe`,
        cancel_url: `${origin}/dashboard/billing?projectId=${projectId}&checkout_status=cancel&gateway=stripe`,
        metadata: { projectId },
      });

      return NextResponse.json({ url: session.url });
    } else {
      // Razorpay checkout
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!razorpayKeyId || !razorpayKeySecret) {
        console.log(
          "[Mock Billing] No Razorpay keys found. Returning mock subscription payload.",
        );
        return NextResponse.json({
          subscriptionId: `sub_mock_${Math.random().toString(36).substr(2, 9)}`,
          keyId: "rzp_test_mock",
          amount: 4900,
          currency: "INR",
          name: "ObservabilityOS",
          description: "Pro Plan Subscription (Mock)",
          isMock: true,
        });
      }

      // Create subscription in Razorpay
      const planId = process.env.RAZORPAY_PLAN_ID || "plan_pro_tier";
      const subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        customer_notify: 1,
        total_count: 12,
        notes: {
          projectId,
        },
      });

      return NextResponse.json({
        subscriptionId: subscription.id,
        keyId: razorpayKeyId,
        amount: 4900, // Rs. 49.00 or custom price
        currency: "INR",
        name: "ObservabilityOS",
        description: "Pro Plan Subscription",
      });
    }
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
