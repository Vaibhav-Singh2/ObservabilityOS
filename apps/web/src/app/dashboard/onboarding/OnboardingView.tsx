"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Rocket, 
  Terminal, 
  Code, 
  Check, 
  Copy, 
  RefreshCw, 
  Volume2, 
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Activity,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface OnboardingViewProps {
  project: {
    id: string;
    name: string;
    apiKey: string;
    slackWebhookUrl: string;
    discordWebhookUrl: string;
    teamsWebhookUrl: string;
  };
}

export default function OnboardingView({ project }: OnboardingViewProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(project.slackWebhookUrl || "");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(project.discordWebhookUrl || "");
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState(project.teamsWebhookUrl || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SLO Config state
  const [enableAvailSlo, setEnableAvailSlo] = useState(true);
  const [availSloTarget, setAvailSloTarget] = useState(99.0);
  const [availSloWindow, setAvailSloWindow] = useState(30);

  const [enableLatencySlo, setEnableLatencySlo] = useState(true);
  const [latencySloTarget, setLatencySloTarget] = useState(95.0);
  const [latencySloThreshold, setLatencySloThreshold] = useState(500);
  const [latencySloWindow, setLatencySloWindow] = useState(30);

  const [services, setServices] = useState<any[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isSavingSlos, setIsSavingSlos] = useState(false);
  
  // Ingestion tracking states
  const [isIngested, setIsIngested] = useState(false);
  const [ingestionCount, setIngestionCount] = useState(0);
  const [pollingStatus, setPollingStatus] = useState<"idle" | "polling" | "success" | "error">("idle");
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const endpointUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}/api/ingest`
    : "http://localhost:3000/api/ingest";

  const installCmd = "npm install @repo/sdk";
  const sdkIntegrationSnippet = `import { Logger } from "@repo/sdk";

const logger = new Logger({
  apiKey: "${project.apiKey}",
  endpoint: "${endpointUrl}",
  defaultService: "main-api",
  defaultEnvironment: "staging"
});

// Ship your first log stream
logger.info("ObservabilityOS integration successful!", {
  metadata: { version: "1.0.0" }
});`;

  // Start polling when on Step 4
  useEffect(() => {
    if (step === 4) {
      setPollingStatus("polling");
      const checkIngestion = async () => {
        try {
          const res = await fetch(`/api/logs/search?projectId=${project.id}&timeRange=24h`);
          if (res.ok) {
            const data = await res.json();
            if (data.logs && data.logs.length > 0) {
              setIsIngested(true);
              setIngestionCount(data.logs.length);
              setPollingStatus("success");
            }
          }
        } catch (err) {
          console.error("Ingestion check error:", err);
        }
      };

      // Run immediately
      checkIngestion();

      // Poll every 2.5 seconds
      pollIntervalRef.current = setInterval(checkIngestion, 2500);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (step !== 4) {
        setPollingStatus("idle");
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [step, project.id]);

  // Fetch services when entering SLO setup step
  useEffect(() => {
    if (step === 5 && services.length === 0) {
      setIsLoadingServices(true);
      fetch(`/api/services?projectId=${project.id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch services");
          return res.json();
        })
        .then((data) => {
          if (data.services) {
            setServices(data.services);
          }
        })
        .catch((err) => console.error("[Onboarding] Fetch services error:", err))
        .finally(() => setIsLoadingServices(false));
    }
  }, [step, project.id, services.length]);

  const handleCopyText = (text: string, type: "key" | "code" | "install") => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else if (type === "code") {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else if (type === "install") {
      setCopiedInstall(true);
      setTimeout(() => setCopiedInstall(false), 2000);
    }
  };

  const handleSaveSlos = async () => {
    setIsSavingSlos(true);
    try {
      const targetService = services[0];
      if (!targetService) {
        // No services, skip to webhooks step
        setStep(6);
        return;
      }

      const promises = [];

      if (enableAvailSlo) {
        promises.push(
          fetch("/api/services/slo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: project.id,
              serviceId: targetService._id,
              slo: {
                name: "Availability SLO",
                type: "availability",
                target: availSloTarget,
                windowDays: availSloWindow,
              },
            }),
          })
        );
      }

      if (enableLatencySlo) {
        promises.push(
          fetch("/api/services/slo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: project.id,
              serviceId: targetService._id,
              slo: {
                name: "Latency SLO",
                type: "latency",
                target: latencySloTarget,
                windowDays: latencySloWindow,
                latencyThresholdMs: latencySloThreshold,
              },
            }),
          })
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      setStep(6);
    } catch (err) {
      console.error("[Onboarding] Error saving SLOs:", err);
      setStep(6);
    } finally {
      setIsSavingSlos(false);
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/projects/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          name: project.name,
          slackWebhookUrl: slackWebhookUrl.trim(),
          discordWebhookUrl: discordWebhookUrl.trim(),
          teamsWebhookUrl: teamsWebhookUrl.trim(),
          minErrorCount: 3, // keep original defaults
          zScoreThreshold: 3.0,
        }),
      });

      if (res.ok) {
        router.push(`/dashboard?projectId=${project.id}`);
        router.refresh();
      } else {
        alert("Failed to complete onboarding setups");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    "Welcome",
    "Install SDK",
    "Integrate Code",
    "Ingest Logs",
    "Define SLOs",
    "Webhooks"
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Horizontal Stepper */}
      <div className="relative">
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-900 -z-10" />
        <div 
          className="absolute top-4 left-4 h-0.5 bg-indigo-600 -z-10 transition-all duration-300"
          style={{ width: `${((step - 1) / 5) * 100}%` }}
        />
        
        <div className="flex justify-between items-center px-2">
          {stepTitles.map((title, index) => {
            const stepNum = index + 1;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum || (stepNum === 4 && isIngested);

            return (
              <div key={title} className="flex flex-col items-center gap-2">
                <div 
                  className={`w-9 h-9 rounded-full border flex items-center justify-center font-mono text-xs font-bold transition-all duration-300 ${
                    isCompleted 
                      ? "bg-indigo-600 border-indigo-500 text-white" 
                      : isActive 
                      ? "bg-slate-950 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-500/10" 
                      : "bg-slate-950 border-slate-900 text-slate-500"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold ${
                  isActive ? "text-indigo-400" : isCompleted ? "text-slate-350" : "text-slate-600"
                }`}>
                  {title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Steps Cards */}
      <div className="bg-slate-900 border border-slate-900 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />

        {/* STEP 1: Project Identity */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center mb-2 text-indigo-400">
                <Rocket className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-white">Welcome to your new project!</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                You've successfully created <strong className="text-white font-semibold">"{project.name}"</strong>. We have generated a unique API Ingestion Key.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Project ID</label>
                <div className="text-xs font-mono text-slate-400 select-all">{project.id}</div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Your API Ingestion Key</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-indigo-300 select-all truncate">
                    {project.apiKey}
                  </div>
                  <button
                    onClick={() => handleCopyText(project.apiKey, "key")}
                    className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-450 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Let's get started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Install SDK */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center mb-2 text-indigo-400">
                <Terminal className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Install the SDK client</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Install our lightweight Node.js SDK logger client in your application root directory.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-850 rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <code className="text-xs font-mono text-indigo-300 select-all">{installCmd}</code>
                <button
                  onClick={() => handleCopyText(installCmd, "install")}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-450 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedInstall ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Code Integration */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center mb-2 text-indigo-400">
                <Code className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Initialize the logger client</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Initialize the `Logger` instance in your code. Copy the snippet containing your active API credentials:
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute right-3 top-3">
                <button
                  onClick={() => handleCopyText(sdkIntegrationSnippet, "code")}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-455 hover:text-white transition-colors cursor-pointer"
                  title="Copy Code Snippet"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <pre className="text-[10px] font-mono text-indigo-300 overflow-x-auto whitespace-pre leading-relaxed select-all max-h-60 pt-2">
                {sdkIntegrationSnippet}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Live Ingestion Polling */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center mb-2 text-indigo-400">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-white">Ingest your first log stream</h2>
              <p className="text-sm text-slate-400 leading-relaxed font-sans">
                Run your application (or a quick script) to ship a log entry. The console will automatically detect the stream.
              </p>
            </div>

            {/* Ingestion Polling Card */}
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-8 flex flex-col items-center justify-center min-h-[160px] text-center">
              {pollingStatus === "polling" && (
                <div className="space-y-4">
                  <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Awaiting Log Streams</h4>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1 leading-normal">
                      Listening on port 3000 at `/api/ingest`. Send a test POST request or run your logger client...
                    </p>
                  </div>
                </div>
              )}

              {pollingStatus === "success" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-450">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-400">Log Ingestion Successful!</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1 leading-normal">
                      We successfully received and indexed <strong className="text-white">{ingestionCount} log {ingestionCount === 1 ? "entry" : "entries"}</strong> in the database for this project!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick curl instructions */}
            <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Or test instantly using cURL:</h4>
              <pre className="text-[9px] font-mono text-indigo-400 overflow-x-auto whitespace-pre-wrap select-all bg-slate-950 p-2.5 rounded border border-slate-900 break-all leading-normal">
{`curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${project.apiKey}" \\
  -d '{"service": "main-api", "environment": "staging", "level": "info", "message": "First test log shipped successfully!"}'`}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep(5)}
                disabled={!isIngested}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 disabled:text-slate-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-indigo-600/10"
              >
                Define SLO Targets
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Define SLO Targets */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center mb-2 text-indigo-400">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-white">Define Service Level Objectives (SLOs)</h2>
              <p className="text-sm text-slate-400 leading-relaxed font-sans">
                Set compliance targets for the ingested services. We've detected your service <span className="text-white font-semibold">"{services[0]?.name || "main-api"}"</span> in <span className="text-indigo-400 font-semibold">{services[0]?.environment || "staging"}</span>.
              </p>
            </div>

            {isLoadingServices ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                <span className="text-xs text-slate-500 font-medium">Resolving ingested services...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Availability SLO preset card */}
                <div className={`p-4 border rounded-xl transition-all duration-200 ${
                  enableAvailSlo 
                    ? "bg-slate-950/80 border-indigo-500/50 shadow-lg shadow-indigo-500/5" 
                    : "bg-slate-900/40 border-slate-850 opacity-60"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="enableAvail"
                        checked={enableAvailSlo}
                        onChange={(e) => setEnableAvailSlo(e.target.checked)}
                        className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="enableAvail" className="text-sm font-bold text-slate-200 cursor-pointer select-none">
                          Availability Target (Preset Default: 99.0%)
                        </label>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Alerts if error logs exceed the error budget percentage in the given window.
                        </p>
                      </div>
                    </div>
                  </div>

                  {enableAvailSlo && (
                    <div className="mt-4 grid grid-cols-2 gap-4 pl-7 border-l-2 border-indigo-950 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Compliance Target (%)</label>
                        <input 
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="100"
                          value={availSloTarget}
                          onChange={(e) => setAvailSloTarget(parseFloat(e.target.value) || 99.0)}
                          className="w-full bg-slate-905 border border-slate-800 text-slate-100 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Rolling Window (Days)</label>
                        <input 
                          type="number"
                          min="1"
                          max="90"
                          value={availSloWindow}
                          onChange={(e) => setAvailSloWindow(parseInt(e.target.value) || 30)}
                          className="w-full bg-slate-905 border border-slate-800 text-slate-100 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Latency SLO preset card */}
                <div className={`p-4 border rounded-xl transition-all duration-200 ${
                  enableLatencySlo 
                    ? "bg-slate-950/80 border-indigo-500/50 shadow-lg shadow-indigo-500/5" 
                    : "bg-slate-900/40 border-slate-850 opacity-60"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="enableLatency"
                        checked={enableLatencySlo}
                        onChange={(e) => setEnableLatencySlo(e.target.checked)}
                        className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="enableLatency" className="text-sm font-bold text-slate-200 cursor-pointer select-none">
                          Latency Performance (Preset Default: 500ms at 95.0%)
                        </label>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Tracks the percentage of requests completing within the threshold speed limit.
                        </p>
                      </div>
                    </div>
                  </div>

                  {enableLatencySlo && (
                    <div className="mt-4 grid grid-cols-3 gap-4 pl-7 border-l-2 border-indigo-950 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Threshold (ms)</label>
                        <input 
                          type="number"
                          min="1"
                          value={latencySloThreshold}
                          onChange={(e) => setLatencySloThreshold(parseInt(e.target.value) || 500)}
                          className="w-full bg-slate-905 border border-slate-800 text-slate-100 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Compliance (%)</label>
                        <input 
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="100"
                          value={latencySloTarget}
                          onChange={(e) => setLatencySloTarget(parseFloat(e.target.value) || 95.0)}
                          className="w-full bg-slate-905 border border-slate-800 text-slate-100 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Window (Days)</label>
                        <input 
                          type="number"
                          min="1"
                          max="90"
                          value={latencySloWindow}
                          onChange={(e) => setLatencySloWindow(parseInt(e.target.value) || 30)}
                          className="w-full bg-slate-905 border border-slate-800 text-slate-100 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-850/40">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleSaveSlos}
                disabled={isSavingSlos}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-indigo-600/10"
              >
                {isSavingSlos ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving SLOs...
                  </>
                ) : (
                  <>
                    Configure Alerts
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Webhooks & Finish */}
        {step === 6 && (
          <form onSubmit={handleCompleteOnboarding} className="space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center mb-2 text-indigo-400">
                <Volume2 className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-white">Setup Webhook Notifications</h2>
              <p className="text-sm text-slate-400 leading-relaxed font-sans">
                Finally, set up alerting integrations to get instant AI diagnostic summaries and SLO budget updates pushed directly to your team's communication channels.
              </p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div>
                <label htmlFor="slackWebhookInput" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Slack Incoming Webhook URL
                </label>
                <input
                  id="slackWebhookInput"
                  type="url"
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-mono placeholder:text-slate-700"
                />
              </div>

              <div>
                <label htmlFor="discordWebhookInput" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Discord Incoming Webhook URL
                </label>
                <input
                  id="discordWebhookInput"
                  type="url"
                  value={discordWebhookUrl}
                  onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/XXXX"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-mono placeholder:text-slate-700"
                />
              </div>

              <div>
                <label htmlFor="teamsWebhookInput" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Microsoft Teams Webhook URL
                </label>
                <input
                  id="teamsWebhookInput"
                  type="url"
                  value={teamsWebhookUrl}
                  onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                  placeholder="https://outlook.office.com/webhook/XXXX"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-mono placeholder:text-slate-700"
                />
              </div>

              <p className="text-[10px] text-slate-500 mt-1.5">
                You can skip these webhooks and configure notification channels later inside your Project Settings page.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => setStep(5)}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20"
              >
                <Sparkles className="w-4 h-4" />
                {isSubmitting ? "Finishing..." : "Complete Setup & Go to Dashboard"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
