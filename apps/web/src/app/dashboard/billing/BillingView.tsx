"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CreditCard,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  AlertCircle,
  Cpu,
  Globe2,
  DollarSign,
} from "lucide-react";

interface BillingViewProps {
  project: {
    id: string;
    name: string;
    plan: string;
    subscriptionStatus: string;
    billingProvider: string;
  };
}

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  priceUSD: number;
  priceINR: number;
  description: string;
  badge?: string;
  features: PlanFeature[];
  backendPlan: string;
  available: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free Developer",
    priceUSD: 0,
    priceINR: 0,
    description: "Side projects & local testing.",
    features: [
      { text: "1 service monitored", included: true },
      { text: "500MB logs / month", included: true },
      { text: "7-day data retention", included: true },
      { text: "Basic statistical anomaly checking", included: true },
      { text: "Multi-channel alerts (Slack, Discord, Teams)", included: false },
      { text: "AI incident root cause analysis", included: false },
    ],
    backendPlan: "free",
    available: true,
  },
  {
    id: "starter",
    name: "Starter",
    priceUSD: 29,
    priceINR: 2499,
    description: "Solo founders & small teams in production.",
    badge: "Most Popular",
    features: [
      { text: "Up to 5 services monitored", included: true },
      { text: "5GB logs / month", included: true },
      { text: "30-day secure data retention", included: true },
      { text: "Instant alerts (Slack, Discord, Teams)", included: true },
      { text: "AI SRE Analyst — incident diagnostics", included: true },
      { text: "1 team member seat", included: true },
    ],
    backendPlan: "pro",
    available: true,
  },
  {
    id: "team",
    name: "Team",
    priceUSD: 99,
    priceINR: 7999,
    description: "Growing engineering teams with production complexity.",
    features: [
      { text: "Unlimited services", included: true },
      { text: "20GB logs / month", included: true },
      { text: "30-day log retention", included: true },
      { text: "Advanced AI root cause analysis", included: true },
      { text: "GitHub + Jira + PagerDuty integrations", included: true },
      { text: "Up to 10 team members", included: true },
      { text: "SLO/SLA tracking + AI post-mortems", included: true },
      { text: "Priority support", included: true },
    ],
    backendPlan: "team",
    available: false,
  },
  {
    id: "scale",
    name: "Scale",
    priceUSD: 299,
    priceINR: 24999,
    description: "Series A+ companies with compliance & security needs.",
    features: [
      { text: "Everything in Team", included: true },
      { text: "100GB logs / month", included: true },
      { text: "90-day retention", included: true },
      { text: "Unlimited team members", included: true },
      { text: "SAML SSO + SOC2 audit log exports", included: true },
      { text: "Custom AI model fine-tuning", included: true },
      { text: "SLA guarantee + Dedicated Slack support", included: true },
    ],
    backendPlan: "scale",
    available: false,
  },
];

const PLAN_ORDER = ["free", "starter", "team", "scale"];

export default function BillingView({ project }: BillingViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [gateway, setGateway] = useState<"stripe" | "razorpay">("stripe");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSandboxUpdating, setIsSandboxUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const status = searchParams.get("checkout_status");
    const gatewayParam = searchParams.get("gateway");
    if (status === "success") {
      Promise.resolve().then(() => {
        setSuccessMsg(
          `Congratulations! Your subscription upgrade via ${gatewayParam === "stripe" ? "Stripe" : "Razorpay"} was processed successfully.`,
        );
      });
      router.replace(`/dashboard/billing?projectId=${project.id}`);
    } else if (status === "cancel") {
      Promise.resolve().then(() => {
        setErrorMsg(
          "Checkout was cancelled. Please try again when you are ready.",
        );
      });
      router.replace(`/dashboard/billing?projectId=${project.id}`);
    }
  }, [searchParams, project.id, router]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
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
          gateway,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to initiate checkout");
      }

      if (gateway === "stripe") {
        window.location.assign(data.url);
      } else {
        // Razorpay checkout flow
        if (data.isMock) {
          setSuccessMsg(
            "Initiating Mock Razorpay Checkout... (Upgrading account in sandbox mode)",
          );
          setTimeout(async () => {
            await handleSandboxOverride("pro");
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
              setSuccessMsg(
                "Razorpay authorization approved! Reloading settings...",
              );
              setTimeout(() => {
                router.push(`/dashboard/billing?projectId=${project.id}&checkout_status=success&gateway=razorpay`);
              }, 1500);
            },
            prefill: { name: "", email: "" },
            theme: { color: "#4f46e5" },
          };

          const rzp = new (window as unknown as { Razorpay: new (o: unknown) => { open: () => void } }).Razorpay(options);
          rzp.open();
          setIsSubmitting(false);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error ? err.message : "An unexpected error occurred during checkout",
      );
      setIsSubmitting(false);
    }
  };

  const handleSandboxOverride = async (targetPlan: "free" | "pro") => {
    setIsSandboxUpdating(true);
    setErrorMsg("");
    setSuccessMsg("");

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

      setSuccessMsg(
        `Plan successfully changed to ${targetPlan.toUpperCase()} via Dev Override.`,
      );
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Dev override failed");
    } finally {
      setIsSandboxUpdating(false);
    }
  };

  /** Resolve the display price based on gateway selection */
  const formatPrice = (
    plan: Plan,
  ): { primary: string; secondary: string | null } => {
    if (plan.priceUSD === 0) return { primary: "$0", secondary: null };
    if (gateway === "razorpay") {
      return {
        primary: `₹${plan.priceINR.toLocaleString("en-IN")}`,
        secondary: `$${plan.priceUSD} USD`,
      };
    }
    return { primary: `$${plan.priceUSD}`, secondary: null };
  };

  /** Map backend plan name to our UI plan id */
  const currentPlanId = (): string => {
    if (project.plan === "pro") return "starter";
    return project.plan; // "free" | "team" | "scale"
  };

  const isCurrentPlan = (plan: Plan) => plan.id === currentPlanId();

  const isUpgrade = (plan: Plan) => {
    const currentIndex = PLAN_ORDER.indexOf(currentPlanId());
    return PLAN_ORDER.indexOf(plan.id) > currentIndex;
  };

  const currentDisplayName = () => {
    if (project.plan === "pro") return "Starter";
    if (project.plan === "free") return "Free Tier";
    return project.plan.charAt(0).toUpperCase() + project.plan.slice(1);
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1.5">
          <CreditCard className="w-3.5 h-3.5" />
          Subscription &amp; Plans
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Billing Management
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Scale your project&apos;s limits. Upgrade to unlock advanced anomaly
          alerts, webhook integration channels, and team notifications.
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

      {/* Current Subscription Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Active Project: {project.name}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg text-slate-350">Current Plan:</span>
              <span
                className={`text-2xl font-black uppercase tracking-wide ${
                  project.plan !== "free"
                    ? "bg-linear-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent"
                    : "text-white"
                }`}
              >
                {currentDisplayName()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {project.plan !== "free"
                ? `Active subscription managed via ${project.billingProvider.toUpperCase()}`
                : "Limited to 1 service, 500MB logs/month & 7-day retention."}
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full self-start sm:self-center ${
              project.subscriptionStatus === "active"
                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                : "text-slate-400 bg-slate-950 border border-slate-800"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                project.subscriptionStatus === "active"
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-slate-600"
              }`}
            />
            Status:{" "}
            {project.subscriptionStatus === "active"
              ? "Active"
              : "None / Unpaid"}
          </span>
        </div>
      </div>

      {/* Gateway Selection */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 shrink-0">
          Payment Gateway
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setGateway("stripe")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              gateway === "stripe"
                ? "bg-indigo-600/15 border-indigo-500 text-white"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            Stripe
            <span className="text-[9px] text-slate-500 font-normal hidden sm:inline">
              · International Cards
            </span>
          </button>
          <button
            type="button"
            onClick={() => setGateway("razorpay")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              gateway === "razorpay"
                ? "bg-indigo-600/15 border-indigo-500 text-white"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Razorpay
            <span className="text-[9px] text-slate-500 font-normal hidden sm:inline">
              · UPI, Net Banking
            </span>
          </button>
        </div>
        {gateway === "razorpay" && (
          <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1">
            🇮🇳 Prices shown in INR
          </span>
        )}
      </div>

      {/* Pricing Cards — responsive 1→2→4 column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {PLANS.map((plan) => {
          const price = formatPrice(plan);
          const isCurrent = isCurrentPlan(plan);
          const upgrade = isUpgrade(plan);
          const isHighlighted = plan.id === "starter";

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-6 flex flex-col justify-between relative transition-all ${
                isHighlighted
                  ? "bg-slate-900 border-2 border-indigo-500/40 shadow-2xl shadow-indigo-500/5"
                  : "bg-slate-900/60 border border-slate-800/80 hover:border-slate-700"
              } ${!plan.available ? "opacity-70" : ""}`}
            >
              {/* Badges */}
              {plan.badge && (
                <div className="absolute top-0 right-5 -translate-y-1/2 bg-linear-to-r from-indigo-600 to-violet-600 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                  {plan.badge}
                </div>
              )}
              {!plan.available && (
                <div className="absolute top-0 left-5 -translate-y-1/2 bg-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-slate-700">
                  Coming Soon
                </div>
              )}

              {/* Plan Name */}
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  {plan.name}
                  {plan.id === "starter" && (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  )}
                  {plan.id === "scale" && (
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mt-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">
                      {price.primary}
                    </span>
                    <span className="text-slate-500 text-[11px] font-medium">
                      / mo
                    </span>
                  </div>
                  {price.secondary && (
                    <span className="text-[10px] text-slate-600 mt-0.5 block">
                      ≈ {price.secondary}
                    </span>
                  )}
                </div>

                {/* Features */}
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2 text-[12px] leading-relaxed ${
                        feature.included
                          ? "text-slate-300"
                          : "text-slate-600 line-through"
                      }`}
                    >
                      <Check
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          feature.included
                            ? plan.id === "free"
                              ? "text-indigo-400"
                              : "text-emerald-400"
                            : "text-slate-700"
                        }`}
                      />
                      {feature.text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="mt-6">
                {!plan.available ? (
                  <button
                    disabled
                    className="w-full py-2 rounded-xl text-[11px] font-semibold bg-slate-950 border border-slate-800 text-slate-600 cursor-not-allowed"
                  >
                    Notify Me
                  </button>
                ) : isCurrent ? (
                  <div className="text-center py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Current Plan
                  </div>
                ) : upgrade ? (
                  <button
                    onClick={handleCheckout}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 disabled:cursor-not-allowed text-white py-2 rounded-xl text-[11px] font-bold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all cursor-pointer"
                  >
                    {isSubmitting ? "Processing..." : "Upgrade"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSandboxOverride("free")}
                    disabled={isSandboxUpdating}
                    className="w-full py-2 rounded-xl text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white cursor-pointer transition-all disabled:opacity-50"
                  >
                    Downgrade to Free
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expansion Revenue Info */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <span className="text-slate-400 font-semibold">
            Usage-based add-ons:
          </span>{" "}
          Log overages at <span className="text-slate-300">$0.10/GB</span> above
          plan limit · Additional AI analysis credits at{" "}
          <span className="text-slate-300">$20 / 100 credits</span> · Extra
          seats at <span className="text-slate-300">$30/seat/mo</span> ·{" "}
          <span className="text-indigo-400 font-semibold">20% off</span> with
          annual billing.
        </p>
      </div>

      {/* Sandbox Tools */}
      <section className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2.5 mb-2.5">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-350">
            Developer Sandbox Bypass
          </h4>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          Local sandbox environment detected. Use the quick toggle below to
          simulate Stripe/Razorpay webhook outcomes instantly without
          configuring keys.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              handleSandboxOverride(project.plan === "pro" ? "free" : "pro")
            }
            disabled={isSandboxUpdating}
            className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold tracking-wide transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSandboxUpdating
              ? "Updating..."
              : project.plan === "pro"
                ? "Simulate Free Downgrade"
                : "Simulate Pro Upgrade"}
          </button>
        </div>
      </section>
    </div>
  );
}
