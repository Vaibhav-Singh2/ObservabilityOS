"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS } from "@/lib/plans";
import {
  ArrowLeft,
  Check,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Zap,
  Lock,
  AlertCircle,
} from "lucide-react";

interface CheckoutViewProps {
  project: {
    id: string;
    name: string;
    plan: string;
    subscriptionStatus: string;
    billingProvider: string;
  };
  planId: string;
}

export default function CheckoutView({ project, planId }: CheckoutViewProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const plan = PLANS.find((p) => p.id === planId);

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Invalid Plan</h2>
        <p className="text-slate-400 text-sm mb-6">
          The requested subscription plan could not be found.
        </p>
        <button
          onClick={() =>
            router.push(`/dashboard/billing?projectId=${project.id}`)
          }
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
        >
          Return to Billing
        </button>
      </div>
    );
  }

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleManualOverride = async (targetPlan: string) => {
    try {
      const res = await fetch("/api/billing/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          plan: targetPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error?.message || "Failed to trigger sandbox override",
        );
      }

      setSuccessMsg(`Mock Upgrade Verified! Welcome to ${plan.name} Tier.`);
      setTimeout(() => {
        router.push(`/dashboard/billing?projectId=${project.id}`);
        router.refresh();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Dev override failed");
      setIsSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          gateway: "razorpay",
          planId: plan.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to initiate checkout");
      }

      if (data.isMock) {
        setSuccessMsg(
          "Initiating Mock Razorpay Subscription... (Upgrading in sandbox mode)",
        );
        setTimeout(async () => {
          await handleManualOverride(plan.backendPlan);
        }, 1500);
      } else {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error("Razorpay SDK failed to load. Are you offline?");
        }

        const options = {
          key: data.keyId,
          subscription_id: data.subscriptionId,
          amount: data.amount,
          currency: data.currency,
          name: data.name,
          description: data.description,
          handler: async function () {
            setSuccessMsg("Subscription approved! Activating tier...");
            setTimeout(() => {
              router.push(
                `/dashboard/billing?projectId=${project.id}&checkout_status=success&gateway=razorpay&planId=${plan.id}`,
              );
              router.refresh();
            }, 1500);
          },
          prefill: { name: "", email: "" },
          theme: { color: "#4f46e5" },
        };

        const rzp = new (
          window as unknown as {
            Razorpay: new (o: unknown) => { open: () => void };
          }
        ).Razorpay(options);
        rzp.open();
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during checkout",
      );
      setIsSubmitting(false);
    }
  };

  const formattedPrice = `₹${plan.priceINR.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back to Billing */}
      <button
        onClick={() =>
          router.push(`/dashboard/billing?projectId=${project.id}`)
        }
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Billing
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Review &amp; Checkout
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Complete your subscription to unlock {plan.name} features for{" "}
          <span className="text-indigo-400 font-semibold">{project.name}</span>.
        </p>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 text-sm font-semibold">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{successMsg}</div>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left Column: Order Summary */}
        <div className="md:col-span-3 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Selected Plan
            </span>
            <h2 className="text-xl font-bold text-white flex items-center gap-1.5 mt-1">
              {plan.name}
              {plan.id === "pro" && (
                <Sparkles className="w-4 h-4 text-indigo-400" />
              )}
              {plan.id === "self-host" && (
                <Zap className="w-4 h-4 text-amber-400" />
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {plan.description}
            </p>

            <div className="border-t border-slate-800 my-5" />

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-3">
              Included Features
            </h3>
            <ul className="space-y-2.5">
              {plan.features
                .filter((f) => f.included)
                .map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-xs text-slate-300"
                  >
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feature.text}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Invoice & Payment */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between h-full">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Payment Summary
              </span>
              <div className="space-y-3 mt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{plan.name} Plan</span>
                  <span className="text-white font-medium">
                    {formattedPrice}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Billing Interval</span>
                  <span className="text-slate-300">Monthly</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">GST / Tax</span>
                  <span className="text-slate-500">Included</span>
                </div>
                <div className="border-t border-slate-850 pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-white">
                    Total Due
                  </span>
                  <span className="text-xl font-black text-indigo-400">
                    {formattedPrice}
                    <span className="text-[10px] font-normal text-slate-500">
                      /mo
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {/* Security Banner */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-850">
                <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 leading-normal">
                  Secured by Razorpay auto-pay. Subscription renewals occur
                  automatically. Cancel anytime from your billing page.
                </p>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 disabled:cursor-not-allowed text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 cursor-pointer transition-all uppercase tracking-wider"
              >
                <CreditCard className="w-4 h-4" />
                {isSubmitting ? "Initiating..." : "Pay & Subscribe"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
