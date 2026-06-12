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
  };
}

export default function OnboardingView({ project }: OnboardingViewProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(project.slackWebhookUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    if (step === 4 && !isIngested) {
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
              // Clear polling
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
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
  }, [step, isIngested, project.id]);

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
    "Alert Webhook"
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Horizontal Stepper */}
      <div className="relative">
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-900 -z-10" />
        <div 
          className="absolute top-4 left-4 h-0.5 bg-indigo-600 -z-10 transition-all duration-300"
          style={{ width: `${((step - 1) / 4) * 100}%` }}
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
                Configure Alerts
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Webhooks & Finish */}
        {step === 5 && (
          <form onSubmit={handleCompleteOnboarding} className="space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center mb-2 text-indigo-400">
                <Volume2 className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-white">Setup Slack Alerts</h2>
              <p className="text-sm text-slate-400 leading-relaxed font-sans">
                Finally, set up alerting integrations to get instant AI diagnostic summaries pushed directly to your team's Slack.
              </p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div>
                <label htmlFor="webhookInput" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Slack Incoming Webhook URL
                </label>
                <input
                  id="webhookInput"
                  type="url"
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-mono placeholder:text-slate-700"
                />
                <p className="text-[10px] text-slate-500 mt-1.5">
                  You can skip this step and configure webhook preferences later inside your Project Settings page.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => setStep(4)}
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
