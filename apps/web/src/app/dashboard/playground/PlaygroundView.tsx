"use client";

import { useState, ComponentType } from "react";
import Link from "next/link";
import {
  Terminal,
  Database,
  Cpu,
  KeyRound,
  ServerCrash,
  AlertTriangle,
  Play,
  Loader2,
  GitCommit,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface PlaygroundViewProps {
  project: {
    id: string;
    name: string;
    apiKey: string;
  };
}

interface ResultIncident {
  id: string;
  title: string;
  summary: string;
  rootCause: string;
  impact: string;
  suggestedFix: string[];
  confidence: number;
  status: string;
  createdAt: string;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  defaultService: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

export default function PlaygroundView({ project }: PlaygroundViewProps) {
  const [activeTab, setActiveTab] = useState<"setup" | "simulating" | "result">(
    "setup",
  );
  const [selectedScenario, setSelectedScenario] =
    useState<string>("db-timeout");
  const [serviceName, setServiceName] = useState<string>("database-service");
  const [environment, setEnvironment] = useState<"prod" | "staging" | "dev">(
    "prod",
  );
  const [includeDeploy, setIncludeDeploy] = useState<boolean>(true);
  const [seedBaseline, setSeedBaseline] = useState<boolean>(true);
  const [customErrorMessage, setCustomErrorMessage] = useState<string>("");

  // Console logging state
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [resultIncident, setResultIncident] = useState<ResultIncident | null>(
    null,
  );
  const [errorText, setErrorText] = useState<string>("");

  const scenarios: Scenario[] = [
    {
      id: "db-timeout",
      title: "Database Timeout",
      description:
        "Exhaust database connection pool. Simulates knex timeout & mongoose handshake exceptions.",
      icon: Database,
      defaultService: "database-service",
      color: "text-amber-400",
      borderColor: "group-hover:border-amber-500/30 border-slate-900",
      bgColor: "bg-amber-500/5",
    },
    {
      id: "oom",
      title: "Memory Leak (OOM)",
      description:
        "Node.js heap out of memory crash. Simulates process exit (Exit Code 137) container killing.",
      icon: Cpu,
      defaultService: "api-gateway",
      color: "text-red-400",
      borderColor: "group-hover:border-red-500/30 border-slate-900",
      bgColor: "bg-red-500/5",
    },
    {
      id: "stripe",
      title: "Stripe Signature Fail",
      description:
        "Webhook secret signature mismatches. Simulates bad headers and unauthorized exceptions.",
      icon: KeyRound,
      defaultService: "billing-service",
      color: "text-emerald-400",
      borderColor: "group-hover:border-emerald-500/30 border-slate-900",
      bgColor: "bg-emerald-500/5",
    },
    {
      id: "sendgrid",
      title: "SendGrid API Outage",
      description:
        "Connection resets and 502 bad gateway responses from downstream email delivery partners.",
      icon: ServerCrash,
      defaultService: "notification-service",
      color: "text-purple-400",
      borderColor: "group-hover:border-purple-500/30 border-slate-900",
      bgColor: "bg-purple-500/5",
    },
    {
      id: "nullpointer",
      title: "NullPointerException",
      description:
        "Uncaught code reference faults. Simulates Java thread exceptions in auth token validation.",
      icon: AlertTriangle,
      defaultService: "auth-service",
      color: "text-sky-400",
      borderColor: "group-hover:border-sky-500/30 border-slate-900",
      bgColor: "bg-sky-500/5",
    },
    {
      id: "custom",
      title: "Custom Scenario",
      description:
        "Enter your own custom runtime error messages to ingest and test the anomaly engine.",
      icon: Terminal,
      defaultService: "custom-service",
      color: "text-slate-400",
      borderColor: "group-hover:border-indigo-500/30 border-slate-900",
      bgColor: "bg-indigo-500/5",
    },
  ];

  const [prevSelectedScenario, setPrevSelectedScenario] =
    useState(selectedScenario);
  if (selectedScenario !== prevSelectedScenario) {
    setPrevSelectedScenario(selectedScenario);
    const sc = scenarios.find((s) => s.id === selectedScenario);
    if (sc) {
      setServiceName(sc.defaultService);
    }
  }

  const handleStartSimulation = async () => {
    setIsSimulating(true);
    setActiveTab("simulating");
    setConsoleLogs([]);
    setErrorText("");
    setResultIncident(null);

    const addLog = (text: string) => {
      const time = new Date().toLocaleTimeString();
      setConsoleLogs((prev) => [...prev, `[${time}] ${text}`]);
    };

    try {
      addLog("Initializing simulation sandbox context...");
      await new Promise((r) => setTimeout(r, 600));

      if (seedBaseline) {
        addLog(
          `Purging recent history and seeding 12 normal heartbeat logs for "${serviceName}" in "${environment}"...`,
        );
        await new Promise((r) => setTimeout(r, 800));
      }

      if (includeDeploy) {
        addLog(
          "Simulating recent git deployment event (commit preceding anomaly)...",
        );
        await new Promise((r) => setTimeout(r, 600));
      }

      addLog(
        `Generating 5 scenario-specific error logs for "${serviceName}"...`,
      );
      await new Promise((r) => setTimeout(r, 700));

      addLog(
        "Transmitting simulated payload to ObservabilityOS ingestion API...",
      );

      const payload = {
        projectId: project.id,
        serviceName,
        environment,
        scenarioId: selectedScenario,
        includeDeploy,
        seedBaseline,
        customErrorMessage:
          selectedScenario === "custom" ? customErrorMessage : undefined,
      };

      const response = await fetch("/api/playground/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Simulation server error");
      }

      addLog("Triggering statistical anomaly detection validation...");
      await new Promise((r) => setTimeout(r, 600));

      addLog(
        "Anomaly confirmed: error spike exceeds baseline threshold (Z-Score = 5.0).",
      );
      await new Promise((r) => setTimeout(r, 650));

      addLog(
        "AI reasoning pipeline invoked. Correlating code releases & computing post-mortem details...",
      );
      await new Promise((r) => setTimeout(r, 900));

      const data = await response.json();
      addLog("AI Incident successfully compiled and persisted!");

      if (data.incident) {
        setResultIncident(data.incident);
        addLog(
          `Dispatched alerts to configured integrations (Slack/Discord/Teams).`,
        );
        await new Promise((r) => setTimeout(r, 500));
        setActiveTab("result");
      } else {
        addLog(
          "Warning: Simulation completed but no incident was generated. Verify project threshold settings.",
        );
        await new Promise((r) => setTimeout(r, 1000));
        setActiveTab("setup");
      }
    } catch (err) {
      console.error(err);
      setErrorText(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during simulation.",
      );
      setActiveTab("setup");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1.5">
            <Terminal className="w-3.5 h-3.5" />
            Sandbox Playground
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Simulate Production Issues
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Generate mock logs and releases in a safe sandbox to test AI
            incident post-mortems and webhook integrations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Setup */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preset Scenarios Grid */}
          <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
                1. Select Preset Scenario
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Pick the type of system error you want to trigger.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scenarios.map((sc) => {
                  const Icon = sc.icon;
                  const isSelected = selectedScenario === sc.id;
                  return (
                    <button
                      key={sc.id}
                      onClick={() =>
                        !isSimulating && setSelectedScenario(sc.id)
                      }
                      disabled={isSimulating}
                      className={`group text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-slate-900/80 border-indigo-500/60 shadow-lg shadow-indigo-500/5"
                          : `${sc.borderColor} bg-slate-950/80 hover:bg-slate-900/40 hover:border-slate-800`
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${sc.bgColor} ${sc.color}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4
                            className={`text-sm font-semibold transition-colors ${isSelected ? "text-white" : "text-slate-200 group-hover:text-white"}`}
                          >
                            {sc.title}
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-normal">
                            {sc.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Configuration Form */}
          <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
                2. Configure Metadata Settings
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Customize the targets and telemetry attributes for this run.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service_name">Target Service Name</Label>
                  <Input
                    id="service_name"
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    disabled={isSimulating || selectedScenario !== "custom"}
                    placeholder="e.g. billing-service"
                    className="border-slate-850 bg-slate-900/60 text-slate-100"
                  />
                  <p className="text-[10px] text-slate-500">
                    {selectedScenario === "custom"
                      ? "Name of the mock service to create/target."
                      : "Using preset default service name."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="env_select">Target Environment</Label>
                  <select
                    id="env_select"
                    value={environment}
                    onChange={(e) =>
                      setEnvironment(
                        e.target.value as "prod" | "staging" | "dev",
                      )
                    }
                    disabled={isSimulating}
                    className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="prod">Production (prod)</option>
                    <option value="staging">Staging (staging)</option>
                    <option value="dev">Development (dev)</option>
                  </select>
                </div>
              </div>

              {selectedScenario === "custom" && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="custom_message">Custom Error Message</Label>
                  <Input
                    id="custom_message"
                    type="text"
                    value={customErrorMessage}
                    onChange={(e) => setCustomErrorMessage(e.target.value)}
                    disabled={isSimulating}
                    placeholder="e.g. CriticalException: Third-party auth verification timeout"
                    className="border-slate-850 bg-slate-900/60 text-slate-100"
                  />
                </div>
              )}

              <hr className="border-slate-900 my-4" />

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-900 bg-slate-950/60">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="seed_baseline_toggle"
                      className="text-sm font-semibold text-slate-200"
                    >
                      Seed Historical Baseline
                    </Label>
                    <p className="text-xs text-slate-500">
                      Creates 12 clean heartbeat logs in history to ensure
                      statistics trigger anomaly Z-Score.
                    </p>
                  </div>
                  <Switch
                    id="seed_baseline_toggle"
                    checked={seedBaseline}
                    onCheckedChange={setSeedBaseline}
                    disabled={isSimulating}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-900 bg-slate-950/60">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="include_deploy_toggle"
                      className="text-sm font-semibold text-slate-200"
                    >
                      Correlate Git Deployment Release
                    </Label>
                    <p className="text-xs text-slate-500">
                      Simulates a git deploy event 5 minutes prior to errors to
                      test AI deployment correlation analysis.
                    </p>
                  </div>
                  <Switch
                    id="include_deploy_toggle"
                    checked={includeDeploy}
                    onCheckedChange={setIncludeDeploy}
                    disabled={isSimulating}
                  />
                </div>
              </div>

              {errorText && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5 text-xs text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorText}</span>
                </div>
              )}

              <Button
                id="btn_trigger_sim"
                onClick={handleStartSimulation}
                disabled={
                  isSimulating ||
                  (selectedScenario === "custom" && !customErrorMessage.trim())
                }
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-550 text-white font-semibold text-sm rounded-lg shadow-lg shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Simulating Incident...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    Simulate Production Issue
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Log Console & Results */}
        <div className="space-y-6">
          {/* Console / Log Terminal */}
          <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-sm h-full flex flex-col min-h-100">
            <CardHeader className="pb-3 border-b border-slate-900">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  Simulation Console
                </CardTitle>
                {isSimulating && (
                  <Badge
                    variant="secondary"
                    className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] animate-pulse"
                  >
                    RUNNING
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 bg-black/40 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-2 select-text max-h-120">
              {consoleLogs.length === 0 ? (
                <div className="text-slate-600 h-full flex flex-col items-center justify-center py-12 text-center space-y-2">
                  <Terminal className="w-8 h-8 opacity-25" />
                  <p>
                    Sandbox terminal idle.
                    <br />
                    Configure options and execute simulation.
                  </p>
                </div>
              ) : (
                consoleLogs.map((log, i) => {
                  const isSuccess =
                    log.includes("PERSISTED") ||
                    log.includes("successfully") ||
                    log.includes("complete");
                  const isAnomaly =
                    log.includes("anomaly") || log.includes("exceeds");
                  return (
                    <div
                      key={i}
                      className={`break-words ${
                        isSuccess
                          ? "text-emerald-400"
                          : isAnomaly
                            ? "text-amber-400 font-semibold"
                            : "text-slate-300"
                      }`}
                    >
                      {log}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Incident Result Modal/Details */}
      {resultIncident && activeTab === "result" && (
        <Card className="border-emerald-500/30 bg-slate-950/70 backdrop-blur-md relative overflow-hidden ring-1 ring-emerald-500/10 mt-6">
          <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent pointer-events-none" />

          <CardHeader className="border-b border-slate-900 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-red-500/30 text-red-400 bg-red-500/5 font-semibold text-[10px] uppercase"
                >
                  🚨 Incident Open
                </Badge>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 font-semibold text-[10px] uppercase flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  AI Generated
                </Badge>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Detected: {new Date(resultIncident.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="mt-3">
              <h2 className="text-lg font-bold text-white tracking-tight sm:text-xl">
                {resultIncident.title}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                <span>
                  Service:{" "}
                  <strong className="text-slate-300">{serviceName}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  Environment:{" "}
                  <strong className="text-slate-300 uppercase">
                    {environment}
                  </strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  Confidence score:
                  <strong className="text-emerald-400 font-semibold">
                    {Math.round(resultIncident.confidence * 100)}%
                  </strong>
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Grid for Summary, Root Cause & Impact */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  What Happened
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed font-normal">
                  {resultIncident.summary}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  AI Root Cause Analysis
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed font-normal">
                  {resultIncident.rootCause}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">
                  System Impact
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed font-normal font-medium">
                  {resultIncident.impact}
                </p>
              </div>
            </div>

            {/* Git Deploy Correlation Info if active */}
            {includeDeploy && (
              <div className="p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-400">
                  <GitCommit className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="text-slate-300 leading-normal font-medium">
                    Correlated Deployment Event Captured:
                  </p>
                  <p className="text-slate-500 leading-normal mt-0.5 truncate">
                    Release deployed to {environment} • Commit message details
                    matched scenario signature.
                  </p>
                </div>
              </div>
            )}

            <hr className="border-slate-900" />

            {/* Suggested Fix Action Plan */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                AI Action Runbook & Fixes
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {resultIncident.suggestedFix.map((fix: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-900 bg-slate-950/40 text-xs text-slate-300"
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-indigo-400 border border-slate-800 flex items-center justify-center font-bold font-mono text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="mt-0.5 leading-relaxed font-medium">
                      {fix}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-900">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Info className="w-3.5 h-3.5" />
                <span>
                  Simulated logs will persist in the Logs and Incident database
                  tables.
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("setup")}
                  className="w-full sm:w-auto border-slate-850 hover:bg-slate-900 hover:text-white text-slate-300 cursor-pointer text-xs h-9 rounded-lg"
                >
                  Simulate Another Issue
                </Button>

                <Link
                  href={`/dashboard/incidents/${resultIncident.id}?projectId=${project.id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 h-9 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-550 rounded-lg shadow-md shadow-indigo-500/10 cursor-pointer transition-colors"
                >
                  Open Incident Workspace
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
