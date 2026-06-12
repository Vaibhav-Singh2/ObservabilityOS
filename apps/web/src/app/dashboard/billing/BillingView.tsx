"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  CreditCard, 
  Check, 
  HelpCircle, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  AlertCircle,
  TrendingUp,
  Cpu,
  Globe2,
  DollarSign
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
      setSuccessMsg(`Congratulations! Your subscription upgrade via ${gatewayParam === "stripe" ? "Stripe" : "Razorpay"} was processed successfully.`);
      router.replace(`/dashboard/billing?projectId=${project.id}`);
    } else if (status === "cancel") {
      setErrorMsg("Checkout was cancelled. Please try again when you are ready.");
      router.replace(`/dashboard/billing?projectId=${project.id}`);
    }
  }, [searchParams]);

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
        if (data.isMock) {
          // Redirect to the mock callback url
          window.location.href = data.url;
        } else {
          window.location.href = data.url;
        }
      } else {
        // Razorpay checkout flow
        if (data.isMock) {
          // Simulate the popup & automatically trigger manual override upgrade for local developer convenience
          setSuccessMsg("Initiating Mock Razorpay Checkout... (Upgrading account in sandbox mode)");
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
            handler: async function (response: any) {
              setSuccessMsg("Razorpay authorization approved! Reloading settings...");
              // We'll update the plan manually or reload to fetch webhook result
              // Wait 1.5 seconds then reload
              setTimeout(() => {
                window.location.href = `/dashboard/billing?projectId=${project.id}&checkout_status=success&gateway=razorpay`;
              }, 1500);
            },
            prefill: {
              name: "",
              email: "",
            },
            theme: {
              color: "#4f46e5",
            },
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
          setIsSubmitting(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during checkout");
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
        throw new Error(data.error?.message || "Failed to trigger sandbox override");
      }

      setSuccessMsg(`Plan successfully changed to ${targetPlan.toUpperCase()} via Dev Override.`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Dev override failed");
    } finally {
      setIsSandboxUpdating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1.5">
          <CreditCard className="w-3.5 h-3.5" />
          Subscription & Plans
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Billing Management
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Scale your project's limits. Upgrade to unlock advanced anomaly alerts, webhook integration channels, and team notifications.
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
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Active Project: {project.name}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg text-slate-350">Current Plan:</span>
              <span className={`text-2xl font-black uppercase tracking-wide ${
                project.plan === "pro" ? "bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent" : "text-white"
              }`}>
                {project.plan === "pro" ? "Pro Tier" : "Free Tier"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {project.plan === "pro" 
                ? `Active subscription managed via ${project.billingProvider.toUpperCase()}`
                : "Limited to 10,000 log events per month & statistical alerts."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
              project.subscriptionStatus === "active" 
                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" 
                : "text-slate-400 bg-slate-950 border border-slate-850"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                project.subscriptionStatus === "active" ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
              }`} />
              Status: {project.subscriptionStatus === "active" ? "Active" : "None / Unpaid"}
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Free Plan */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 flex flex-col justify-between hover:border-slate-800 transition-colors">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white">Free Developer</h3>
                <p className="text-xs text-slate-500 mt-1">Ideal for side projects & local testing.</p>
              </div>
            </div>
            
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">$0</span>
              <span className="text-slate-500 text-xs font-medium">/ month</span>
            </div>

            <ul className="mt-8 space-y-4 text-sm text-slate-400">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Up to 10,000 logs per month</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Basic statistical anomaly checking</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>3-day data retention window</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-600 line-through">
                <Check className="w-4 h-4 shrink-0" />
                <span>Slack instant alert cards</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-600 line-through">
                <Check className="w-4 h-4 shrink-0" />
                <span>AI incident root cause generator</span>
              </li>
            </ul>
          </div>

          <div className="mt-8">
            <button 
              disabled={project.plan === "free"}
              onClick={() => handleSandboxOverride("free")}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                project.plan === "free"
                  ? "bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed"
                  : "bg-slate-900 hover:bg-slate-850 border-slate-800 text-white cursor-pointer"
              }`}
            >
              {project.plan === "free" ? "Current Tier" : "Downgrade to Free"}
            </button>
          </div>
        </div>

        {/* Pro Plan */}
        <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-8 flex flex-col justify-between relative shadow-2xl shadow-indigo-500/5">
          <div className="absolute top-0 right-6 -translate-y-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
            Popular Choice
          </div>

          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                  Pro Production
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                </h3>
                <p className="text-xs text-slate-400 mt-1">For professional apps running in production.</p>
              </div>
            </div>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">$49</span>
              <span className="text-slate-400 text-xs font-medium">/ month</span>
            </div>

            <ul className="mt-8 space-y-4 text-sm text-slate-350">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Unlimited</strong> log aggregation</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Real-time custom threshold checks</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>30-day</strong> secure data retention</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant Slack diagnostics webhook alerts</span>
              </li>
              <li className="flex items-center gap-2.5 text-indigo-400">
                <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>AI SRE Analyst:</strong> Automates incident diagnostics</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 space-y-4">
            {project.plan !== "pro" ? (
              <>
                {/* Gateway Selection */}
                <div className="space-y-2">
                  <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-500">Choose Gateway Method</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGateway("stripe")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                        gateway === "stripe"
                          ? "bg-indigo-600/15 border-indigo-500 text-white font-semibold"
                          : "bg-slate-950 border-slate-900 text-slate-450 hover:bg-slate-900/60"
                      }`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1">
                        <Globe2 className="w-3.5 h-3.5" />
                        Stripe
                      </span>
                      <span className="text-[9px] text-slate-500 mt-0.5">International Cards</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setGateway("razorpay")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                        gateway === "razorpay"
                          ? "bg-indigo-600/15 border-indigo-500 text-white font-semibold"
                          : "bg-slate-950 border-slate-900 text-slate-450 hover:bg-slate-900/60"
                      }`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        Razorpay
                      </span>
                      <span className="text-[9px] text-slate-500 mt-0.5">UPI, Net Banking, Wallets</span>
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all cursor-pointer"
                >
                  {isSubmitting ? "Proceeding..." : `Upgrade via ${gateway === "stripe" ? "Stripe" : "Razorpay"}`}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="text-center py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                Pro Tier Active
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sandbox Tools */}
      <section className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2.5 mb-2.5">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-350">Developer Sandbox Bypass</h4>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          Local sandbox environment detected. Use the quick toggle below to simulate Stripe/Razorpay webhook outcomes instantly without configuring keys.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSandboxOverride(project.plan === "pro" ? "free" : "pro")}
            disabled={isSandboxUpdating}
            className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-750 text-slate-300 hover:text-white rounded-lg text-xs font-semibold tracking-wide transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSandboxUpdating 
              ? "Updating..." 
              : project.plan === "pro" 
                ? "Simulate Free Downgrade" 
                : "Simulate Pro Upgrade"
            }
          </button>
        </div>
      </section>
    </div>
  );
}
