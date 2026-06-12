"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Settings, 
  Save, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  Terminal,
  Volume2
} from "lucide-react";

interface SettingsViewProps {
  project: {
    id: string;
    name: string;
    apiKey: string;
    slackWebhookUrl: string;
    minErrorCount: number;
    zScoreThreshold: number;
  };
}

export default function SettingsView({ project }: SettingsViewProps) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(project.slackWebhookUrl);
  const [minErrorCount, setMinErrorCount] = useState(project.minErrorCount);
  const [zScoreThreshold, setZScoreThreshold] = useState(project.zScoreThreshold);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleCopyKey = () => {
    navigator.clipboard.writeText(project.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveStatus("idle");
    setErrorMessage("");

    try {
      const res = await fetch("/api/projects/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          name: name.trim(),
          slackWebhookUrl: slackWebhookUrl.trim(),
          minErrorCount: Number(minErrorCount),
          zScoreThreshold: Number(zScoreThreshold),
        }),
      });

      if (res.ok) {
        setSaveStatus("success");
        router.refresh();
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        const data = await res.json();
        setSaveStatus("error");
        setErrorMessage(data.error?.message || "Failed to update settings");
      }
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1.5">
          <Settings className="w-3.5 h-3.5" />
          Project Settings
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Configuration
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure incident detection thresholds, notification integrations, and access credentials.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Profile Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-800/60 pb-2.5">
            General Settings
          </h2>
          
          <div className="space-y-4 max-w-xl">
            <div>
              <label htmlFor="projectName" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Project Name
              </label>
              <input
                id="projectName"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                API Ingestion Key
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-350 select-all truncate flex items-center justify-between">
                  <span>
                    {showKey ? project.apiKey : "••••••••••••••••••••••••••••••••••••••••••••••••"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-slate-500 hover:text-slate-300 ml-2"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="p-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Use this API key in your customer SDK to route log streams into this project environment.
              </p>
            </div>
          </div>
        </section>

        {/* Incident Alert Threshold Settings */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800/60 pb-2.5">
            <Volume2 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Anomaly & Alert Thresholds
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            {/* Minimum Error Count */}
            <div>
              <label htmlFor="minErrorCount" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Min Error Trigger Limit
              </label>
              <input
                id="minErrorCount"
                type="number"
                required
                min="1"
                value={minErrorCount}
                onChange={(e) => setMinErrorCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-855 focus:border-indigo-500 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                Minimum number of error logs in a 5-minute sliding window required to evaluate for anomalies. Avoids alerting on single noise occurrences.
              </p>
            </div>

            {/* Z-Score Sensitivity */}
            <div>
              <label htmlFor="zScoreThreshold" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Statistical Sensitivity (Z-Score)
              </label>
              <input
                id="zScoreThreshold"
                type="number"
                required
                min="1.0"
                step="0.1"
                value={zScoreThreshold}
                onChange={(e) => setZScoreThreshold(Math.max(1.0, parseFloat(e.target.value) || 1.0))}
                className="w-full bg-slate-950 border border-slate-855 focus:border-indigo-500 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                Standard deviations above the historical baseline required to trigger an alert. 
                <span className="block mt-0.5 text-slate-400">Recommended: 3.0 (higher = less sensitive, lower = more sensitive).</span>
              </p>
            </div>
          </div>
        </section>

        {/* Integration settings */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-800/60 pb-2.5">
            Slack Notification Integration
          </h2>
          
          <div className="space-y-4 max-w-xl">
            <div>
              <label htmlFor="slackWebhook" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Slack Incoming Webhook URL
              </label>
              <input
                id="slackWebhook"
                type="url"
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                placeholder="e.g. https://hooks.slack.com/services/T000/B000/XXXX"
                className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-mono placeholder:text-slate-700"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                When an anomaly triggers an incident, a rich diagnostic incident card will be pushed to this Slack channel. 
                {process.env.SLACK_WEBHOOK_URL && (
                  <span className="block mt-0.5 text-indigo-400/90 font-medium">Default server webhook configuration is active as fallback.</span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Feedback / Save Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {saveStatus === "success" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Check className="w-4 h-4" />
                Settings saved successfully
              </span>
            )}
            {saveStatus === "error" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-4 h-4" />
                {errorMessage}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Saving changes..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
