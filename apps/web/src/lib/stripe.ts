import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_mock";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    "[ObservabilityOS Stripe] Warning: STRIPE_SECRET_KEY is not configured in environment variables. Stripe features will run in mock mode.",
  );
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2022-11-15" as any,
  typescript: true,
});

export default stripe;
