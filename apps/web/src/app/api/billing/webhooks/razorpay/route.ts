import { NextResponse } from "next/server";
import { connectToDatabase, Project } from "@repo/db";
import Razorpay from "razorpay";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";

  let event: any;
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = Razorpay.validateWebhookSignature(
        body,
        signature,
        webhookSecret,
      );
      if (!isValid) {
        throw new Error("Invalid signature verify result");
      }
    }
    event = JSON.parse(body);
  } catch (err: any) {
    console.error(`[Razorpay Webhook] Error:`, err.message);
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 400 },
    );
  }

  await connectToDatabase();
  const payload = event.payload?.subscription?.entity || event.payload || {};
  const eventName = event.event;

  try {
    switch (eventName) {
      case "subscription.activated":
      case "subscription.charged": {
        const projectId = payload.notes?.projectId;
        if (projectId) {
          await Project.findByIdAndUpdate(projectId, {
            plan: "pro",
            subscriptionStatus: "active",
            billingProvider: "razorpay",
            razorpaySubscriptionId: payload.id as string,
            razorpayCustomerId: payload.customer_id as string,
          });
          console.log(
            `[Razorpay Webhook] Project ${projectId} upgraded to PRO via Razorpay.`,
          );
        }
        break;
      }
      case "subscription.cancelled":
      case "subscription.halted": {
        const subscriptionId = payload.id;
        await Project.findOneAndUpdate(
          { razorpaySubscriptionId: subscriptionId },
          {
            plan: "free",
            subscriptionStatus: "none",
            billingProvider: "none",
          },
        );
        break;
      }
      default:
        console.log(`[Razorpay Webhook] Unhandled event: ${eventName}`);
    }
  } catch (dbErr) {
    console.error("[Razorpay Webhook] Database update error:", dbErr);
    return NextResponse.json(
      { error: "Database error occurred" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
export const dynamic = "force-dynamic";
