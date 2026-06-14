import { NextResponse } from "next/server";
import { connectToDatabase, Project } from "@repo/db";
import stripe from "@/lib/stripe";
import Stripe from "stripe";

interface StripeWebhookSession {
  metadata?: { projectId?: string };
  customer?: string | null;
  subscription?: string | null;
  id?: string;
  status?: string;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Direct parsing fallback for dev testing
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[Stripe Webhook] Error:`, errorMessage);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 },
    );
  }

  await connectToDatabase();
  const session = (event.data?.object || {}) as StripeWebhookSession;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const projectId = session.metadata?.projectId;
        if (projectId) {
          await Project.findByIdAndUpdate(projectId, {
            plan: "pro",
            subscriptionStatus: "active",
            billingProvider: "stripe",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          });
          console.log(
            `[Stripe Webhook] Project ${projectId} upgraded to PRO via Stripe.`,
          );
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscriptionId = session.id;
        const status = session.status === "active" ? "active" : "past_due";
        await Project.findOneAndUpdate(
          { stripeSubscriptionId: subscriptionId },
          { subscriptionStatus: status },
        );
        break;
      }
      case "customer.subscription.deleted": {
        const subscriptionId = session.id;
        await Project.findOneAndUpdate(
          { stripeSubscriptionId: subscriptionId },
          {
            plan: "free",
            subscriptionStatus: "none",
            billingProvider: "none",
          },
        );
        break;
      }
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (dbErr) {
    console.error("[Stripe Webhook] Database update error:", dbErr);
    return NextResponse.json(
      { error: "Database error occurred" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
export const dynamic = "force-dynamic";
