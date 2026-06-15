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
} from "lucide-react";

interface BillingViewProps {
  project: {
    id: string;
    name: string;
    plan: string;
    subscriptionStatus: string;
    billingProvider: string;
  };
  usage: {
    serviceCount: number;
    logVolumeBytes: number;
  };
}

import { PLANS, PlanDetails as Plan } from "@/lib/plans";

const PLAN_ORDER = ["free", "pro", "self-host"];

export default function BillingView({ project, usage }: BillingViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gateway = "razorpay";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSandboxUpdating, setIsSandboxUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [currentPlan, setCurrentPlan] = useState(project.plan);
  const [currentSubStatus, setCurrentSubStatus] = useState(
    project.subscriptionStatus,
  );
  const [currentBillingProvider, setCurrentBillingProvider] = useState(
    project.billingProvider,
  );
  const [isVerifyingUpgrade, setIsVerifyingUpgrade] = useState(false);
  const [targetPlanId, setTargetPlanId] = useState<string | null>(null);

  const planDetails =
    PLANS.find((p) => p.backendPlan === currentPlan) || PLANS[0];
  const maxServices = planDetails.maxServices;
  const maxLogVolumeBytes = planDetails.maxLogVolumeBytes;
  const retentionDays = planDetails.retentionDays;

  const servicePercentage = Math.min(
    (usage.serviceCount / maxServices) * 100,
    100,
  );
  const logVolumePercentage = Math.min(
    (usage.logVolumeBytes / maxLogVolumeBytes) * 100,
    100,
  );

  const formatVolume = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) {
      return `${mb.toFixed(2)} MB`;
    }
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  useEffect(() => {
    const status = searchParams.get("checkout_status");
    if (status === "success") {
      const planIdParam = searchParams.get("planId");
      Promise.resolve().then(() => {
        setTargetPlanId(planIdParam);
        setSuccessMsg("Upgrading plan... Verifying payment with Razorpay...");
        setIsVerifyingUpgrade(true);
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

  useEffect(() => {
    if (!isVerifyingUpgrade) return;

    const pollStatus = async () => {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const { projects } = await res.json();
          const activeProj = projects.find(
            (p: { _id: string; plan: string; billingProvider: string }) =>
              p._id === project.id,
          );
          if (activeProj) {
            const planDetails = PLANS.find((p) => p.id === targetPlanId);
            const targetBackendPlan = planDetails
              ? planDetails.backendPlan
              : "pro";
            if (
              activeProj.plan === targetBackendPlan ||
              (targetBackendPlan === "pro" && activeProj.plan !== "free")
            ) {
              setCurrentPlan(activeProj.plan);
              setCurrentSubStatus("active");
              setCurrentBillingProvider(activeProj.billingProvider);
              setIsVerifyingUpgrade(false);
              const displayName =
                activeProj.plan === "pro"
                  ? "Starter"
                  : activeProj.plan.charAt(0).toUpperCase() +
                    activeProj.plan.slice(1);
              setSuccessMsg(
                `Upgrade verified successfully! Welcome to ${displayName} Tier.`,
              );
              router.refresh();
            }
          }
        }
      } catch (err) {
        console.error("Billing status check failed:", err);
      }
    };

    // Poll every 2 seconds
    const intervalId = setInterval(pollStatus, 2000);

    // Stop after 2 minutes (safeguard)
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      setIsVerifyingUpgrade(false);
      setErrorMsg(
        "Billing verification timed out. If you made a payment, it will activate shortly once processed.",
      );
    }, 120000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [isVerifyingUpgrade, project.id, router, targetPlanId]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
              router.push(
                `/dashboard/billing?projectId=${project.id}&checkout_status=success&gateway=razorpay`,
              );
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

  const handleSandboxOverride = async (
    targetPlan: "free" | "pro" | "self-host",
  ) => {
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
      setCurrentPlan(targetPlan);
      setCurrentSubStatus(targetPlan !== "free" ? "active" : "none");
      setCurrentBillingProvider(targetPlan !== "free" ? "manual" : "none");
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
    return currentPlan;
  };

  const isCurrentPlan = (plan: Plan) => plan.id === currentPlanId();

  const isUpgrade = (plan: Plan) => {
    const currentIndex = PLAN_ORDER.indexOf(currentPlanId());
    return PLAN_ORDER.indexOf(plan.id) > currentIndex;
  };

  const currentDisplayName = () => {
    if (currentPlan === "pro") return "Pro Cloud";
    if (currentPlan === "self-host") return "Self-Host OSS";
    if (currentPlan === "free") return "Free Tier";
    return currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
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
                  currentPlan !== "free"
                    ? "bg-linear-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent"
                    : "text-white"
                }`}
              >
                {currentDisplayName()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {currentPlan !== "free"
                ? `Active subscription managed via ${(currentBillingProvider || "").toUpperCase()}`
                : "Limited to 1 service, 500MB logs/month & 7-day retention."}
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full self-start sm:self-center ${
              currentSubStatus === "active"
                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                : "text-slate-400 bg-slate-950 border border-slate-800"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                currentSubStatus === "active"
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-slate-600"
              }`}
            />
            Status: {currentSubStatus === "active" ? "Active" : "None / Unpaid"}
          </span>
        </div>
      </div>

      {/* Usage & Plan Limits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Services Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">
              Services Monitored
            </span>
            <span className="text-xs font-black text-white bg-slate-800 px-2 py-0.5 rounded-md">
              {usage.serviceCount} / {maxServices}
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 mb-2">
            <div
              className="bg-linear-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${servicePercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-550">
            {servicePercentage >= 100
              ? "Service limit reached. Upgrade your plan to monitor more services."
              : `${maxServices - usage.serviceCount} more services available.`}
          </p>
        </div>

        {/* Log Volume Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">
              Monthly Log Volume
            </span>
            <span className="text-xs font-black text-white bg-slate-800 px-2 py-0.5 rounded-md">
              {formatVolume(usage.logVolumeBytes)} /{" "}
              {formatVolume(maxLogVolumeBytes)}
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 mb-2">
            <div
              className="bg-linear-to-r from-violet-500 to-fuchsia-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${logVolumePercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-555">
            {logVolumePercentage >= 100
              ? "Log ingestion limit reached. Logs are now being rejected."
              : `${(100 - logVolumePercentage).toFixed(1)}% of quota remaining.`}
          </p>
        </div>

        {/* Retention Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Data Retention Window
            </span>
            <span className="text-xs font-black text-indigo-450 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {retentionDays} Days
            </span>
          </div>
          <p className="text-xs text-slate-350 mt-3">
            Logs and performance metrics are securely retained for{" "}
            {retentionDays} days before being automatically purged.
          </p>
        </div>
      </div>

      <div className="pt-2" />

      {/* Pricing Cards — responsive 1→3 column grid aligned with usage stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const price = formatPrice(plan);
          const isCurrent = isCurrentPlan(plan);
          const isHighlighted = plan.id === "pro";

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
                  {plan.id === "pro" && (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  )}
                  {plan.id === "self-host" && (
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
                            ? "text-emerald-400"
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
                ) : plan.id === "pro" ? (
                  <button
                    onClick={() =>
                      router.push(
                        `/dashboard/billing/checkout?projectId=${project.id}&planId=${plan.id}`,
                      )
                    }
                    className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-[11px] font-bold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all cursor-pointer"
                  >
                    Select Plan
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : plan.id === "self-host" ? (
                  <a
                    href={`${
                      process.env.NEXT_PUBLIC_DOCS_URL ||
                      "http://localhost:3001"
                    }/docs/deployment`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-xl text-[11px] font-bold border border-slate-750 transition-all cursor-pointer text-center"
                  >
                    Deploy Now
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
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
          simulate Razorpay webhook outcomes instantly without configuring keys.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {["free", "pro", "self-host"].map((p) => {
            if (p === currentPlan) return null;
            return (
              <button
                key={p}
                onClick={() =>
                  handleSandboxOverride(p as "free" | "pro" | "self-host")
                }
                disabled={isSandboxUpdating}
                className="px-3.5 py-2 bg-slate-955 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold tracking-wide transition-all disabled:opacity-50 cursor-pointer uppercase"
              >
                Set to {p === "self-host" ? "self-host" : p}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
