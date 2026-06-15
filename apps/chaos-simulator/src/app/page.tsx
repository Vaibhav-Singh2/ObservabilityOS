"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Flame,
  Zap,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Database,
  Cpu,
  Clock,
  HardDrive,
  Terminal,
  Settings,
  AlertTriangle,
  Server,
  Key,
  Globe,
  Radio,
  FileText,
  Workflow,
  Plus,
  RefreshCw,
} from "lucide-react";

import {
  telemetryClient,
  TelemetryStats,
  TelemetryResponse,
} from "@/lib/sdk-wrapper";
import {
  SERVICES,
  generateLogScenario,
  generateExceptionScenario,
  generateLatencyScenario,
  generateErrorRateScenario,
  generateDatabaseScenario,
  generateRedisScenario,
  generateApiScenario,
  generateAuthScenario,
  generateTrafficScenario,
  generateMemoryScenario,
  generateCpuScenario,
  generateServiceHealthScenario,
  generateBusinessEvent,
} from "@/lib/generators";
import { scenarioEngine, ScenarioStatus } from "@/lib/scenario-engine";
import { chaosEngine, ChaosStatus } from "@/lib/chaos-engine";
import { trafficGenerator, TrafficStatus } from "@/lib/traffic-generator";

interface SetupInfo {
  success: boolean;
  projectId: string;
  projectName: string;
  apiKey: string;
  endpoint: string;
  metricsEndpoint: string;
}

export default function ChaosSimulatorPage() {
  const [setup, setSetup] = useState<SetupInfo | null>(null);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "controls" | "presets" | "incidents" | "chaos" | "load"
  >("controls");
  const [environment, setEnvironment] = useState<"prod" | "staging" | "dev">(
    "dev",
  );

  // Telemetry client stats
  const [stats, setStats] = useState<TelemetryStats>({
    logs: { debug: 0, info: 0, warn: 0, error: 0, critical: 0, total: 0 },
    metrics: 0,
    traces: 0,
    events: 0,
    responses: [],
  });

  // Chaos parameters
  const [chaosDuration, setChaosDuration] = useState(60); // seconds
  const [chaosInterval, setChaosInterval] = useState(1000); // ms
  const [chaosStatus, setChaosStatus] = useState<ChaosStatus>({
    active: false,
    timeLeft: 0,
    lastEvent: "None",
  });

  // Load testing parameters
  const [loadRate, setLoadRate] = useState<number>(0); // 0 = idle
  const [trafficStatus, setTrafficStatus] = useState<TrafficStatus>({
    active: false,
    rate: 0,
    totalSent: 0,
  });

  // Scenario engine parameters
  const [scenarioStatus, setScenarioStatus] = useState<ScenarioStatus>({
    active: false,
    scenarioName: "",
    currentStep: "Idle",
  });

  // Preset status
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Terminal logs state
  const [terminalLogs, setTerminalLogs] = useState<
    Array<{
      time: string;
      type: "info" | "warn" | "error" | "success" | "system";
      text: string;
    }>
  >([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial configuration setup on mount
  useEffect(() => {
    fetchSetup();
  }, []);

  const fetchSetup = async () => {
    setLoadingSetup(true);
    addTerminalLog(
      "system",
      "Initializing connection to ObservabilityOS database...",
    );
    try {
      const res = await fetch("/api/setup");
      const data: SetupInfo = await res.json();
      if (data.success) {
        setSetup(data);
        telemetryClient.init({
          apiKey: data.apiKey,
          logsEndpoint: data.endpoint,
          metricsEndpoint: data.metricsEndpoint,
          defaultService: SERVICES.GATEWAY,
          defaultEnv: environment,
        });
        addTerminalLog(
          "success",
          `Connection verified. Project: "${data.projectName}" | Key: ${data.apiKey.slice(0, 15)}...`,
        );
      } else {
        addTerminalLog(
          "error",
          "Database setup failed. Sandbox project could not be seeded.",
        );
      }
    } catch (err) {
      addTerminalLog(
        "error",
        `Network failure during initialization: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoadingSetup(false);
    }
  };

  // 2. Synchronize telemetry wrapper stats & environment
  useEffect(() => {
    if (setup) {
      telemetryClient.init({
        apiKey: setup.apiKey,
        logsEndpoint: setup.endpoint,
        metricsEndpoint: setup.metricsEndpoint,
        defaultService: SERVICES.GATEWAY,
        defaultEnv: environment,
      });
      addTerminalLog(
        "system",
        `Switched active simulator environment to: ${environment.toUpperCase()}`,
      );
    }
  }, [environment, setup]);

  useEffect(() => {
    telemetryClient.registerStatsListener((newStats) => {
      setStats(newStats);
    });

    chaosEngine.registerStatusListener((status) => {
      setChaosStatus(status);
      if (status.active) {
        addTerminalLog(
          "warn",
          `[Chaos] ${status.lastEvent} (Time left: ${status.timeLeft}s)`,
        );
      } else if (status.lastEvent.includes("Completed")) {
        addTerminalLog("success", `[Chaos] Chaos test run completed.`);
      }
    });

    trafficGenerator.registerStatusListener((status) => {
      setTrafficStatus(status);
    });

    scenarioEngine.registerStepListener((status) => {
      setScenarioStatus(status);
      if (status.active) {
        addTerminalLog(
          "info",
          `[Scenario Engine] ${status.scenarioName} - Step: ${status.currentStep}`,
        );
      } else if (status.currentStep.startsWith("Completed")) {
        addTerminalLog("success", `[Scenario Engine] ${status.currentStep}`);
      }
    });
  }, []);

  // Auto scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  const addTerminalLog = (
    type: "info" | "warn" | "error" | "success" | "system",
    text: string,
  ) => {
    const time = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [...prev.slice(-99), { time, type, text }]);
  };

  // Actions trigger helper
  const handleAction = async (name: string, fn: () => any) => {
    addTerminalLog("info", `Triggering action: ${name}`);
    try {
      await fn();
      addTerminalLog("success", `Action completed: ${name}`);
    } catch (err) {
      addTerminalLog(
        "error",
        `Action failed: ${name} | Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  // Preset controller
  const triggerPreset = async (presetName: string) => {
    setActivePreset(presetName);
    addTerminalLog(
      "system",
      `Activating Test Preset: ${presetName.toUpperCase()}`,
    );

    // Stop all active engines
    chaosEngine.stop("Resetting for new Preset");
    trafficGenerator.stop();
    setLoadRate(0);

    await delay(300);

    switch (presetName) {
      case "Healthy System":
        trafficGenerator.start(10, environment);
        setLoadRate(10);
        addTerminalLog(
          "success",
          "Preset loaded: Healthy system, running background load at 10 req/sec",
        );
        telemetryClient.info("System operational health checks passing", {
          service: SERVICES.GATEWAY,
        });
        await telemetryClient.sendMetric({
          service: SERVICES.GATEWAY,
          cpuUsage: 12.5,
          memoryUsage: 250 * 1024 * 1024,
          memoryLimit: 1024 * 1024 * 1024,
          latencyMs: 32,
        });
        break;

      case "Slow Database":
        trafficGenerator.start(10, environment);
        setLoadRate(10);
        addTerminalLog(
          "warn",
          "Preset loaded: Database latency degradation injected",
        );
        // Trigger database slow query loops
        for (let i = 0; i < 3; i++) {
          generateDatabaseScenario("slow");
          await delay(200);
        }
        break;

      case "Cache Failure":
        trafficGenerator.start(10, environment);
        setLoadRate(10);
        addTerminalLog(
          "warn",
          "Preset loaded: Redis cache outage and DB cache storm",
        );
        generateRedisScenario("unavailable");
        await delay(500);
        generateRedisScenario("cache-storm");
        break;

      case "Payment Outage":
        trafficGenerator.start(25, environment);
        setLoadRate(25);
        addTerminalLog(
          "error",
          "Preset loaded: High rate of credit card checkout failures",
        );
        for (let i = 0; i < 4; i++) {
          generateBusinessEvent("payment-failed");
          generateApiScenario("timeout");
          await delay(300);
        }
        break;

      case "High Traffic Event":
        trafficGenerator.start(100, environment);
        setLoadRate(100);
        addTerminalLog(
          "success",
          "Preset loaded: Spiking system traffic to 100 req/sec",
        );
        generateTrafficScenario("x10");
        break;

      case "Black Friday Traffic":
        trafficGenerator.start(1000, environment);
        setLoadRate(1000);
        addTerminalLog(
          "warn",
          "Preset loaded: BLACK FRIDAY SALE - Generating 1000 req/sec load",
        );
        generateTrafficScenario("x100");
        break;

      case "Incident Storm":
        trafficGenerator.start(50, environment);
        setLoadRate(50);
        chaosEngine.start({
          durationSeconds: 60,
          intervalMs: 800,
          environment,
        });
        addTerminalLog(
          "error",
          "Preset loaded: Triggering full service Incident Storm (Chaos active)",
        );
        break;
    }
  };

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const clearStats = () => {
    telemetryClient.resetStats();
    trafficGenerator.resetCounters();
    setTerminalLogs([]);
    addTerminalLog("system", "Stats counters and terminal output cleared.");
  };

  // Success rate calculator
  const getSuccessRate = () => {
    const total = stats.responses.length;
    if (total === 0) return 100;
    const successes = stats.responses.filter((r) => r.success).length;
    return Math.round((successes / total) * 100);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 mb-8 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white animate-pulse">
              <Flame className="w-5 h-5" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              Chaos Simulator
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            Generate realistic telemetry workloads and trigger production
            outages to validate ObservabilityOS alerts, dashboards, and AI
            pipeline.
          </p>
        </div>

        {/* Environment and Controls */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {(["dev", "staging", "prod"] as const).map((env) => (
              <button
                key={env}
                onClick={() => setEnvironment(env)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  environment === env
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {env.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={clearStats}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Stats
          </button>
        </div>
      </header>

      {/* Database/Connection Status Banner */}
      <div className="mb-8">
        {loadingSetup ? (
          <div className="flex items-center gap-2 p-3 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse">
            <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
            <span className="text-sm text-slate-400">
              Verifying database and seeding Chaos Sandbox Project...
            </span>
          </div>
        ) : setup ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl glass-panel">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="truncate">
                <p className="text-xs text-slate-500 font-medium uppercase">
                  Sandbox DB Project
                </p>
                <p className="text-sm font-semibold text-slate-200 truncate">
                  {setup.projectName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="truncate">
                <p className="text-xs text-slate-500 font-medium uppercase">
                  Client SDK API Key
                </p>
                <p className="text-sm font-mono text-indigo-300 truncate">
                  {setup.apiKey}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="truncate">
                <p className="text-xs text-slate-500 font-medium uppercase">
                  Ingest Endpoint
                </p>
                <p className="text-sm font-mono text-slate-300 truncate">
                  {setup.endpoint}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase">
                  Simulator Ingestion Status
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-sm font-medium text-emerald-400">
                    Online & Ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-3 bg-red-950/30 border border-red-900/60 text-red-300 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span className="text-sm font-medium">
              Failed to connect to backend database. Telemetry might not ingest
              correctly. Ensure web service is running.
            </span>
          </div>
        )}
      </div>

      {/* Stats Cards Section */}
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl flex flex-col justify-between">
          <p className="text-xs text-slate-400 font-medium uppercase">
            Total Logs
          </p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-extrabold tracking-tight">
              {stats.logs.total}
            </span>
            <span className="text-xs text-slate-500">items</span>
          </div>
          <div className="mt-2 text-xs flex gap-1.5 flex-wrap">
            <span className="text-emerald-400 font-semibold">
              {stats.logs.info} inf
            </span>
            <span className="text-amber-400 font-semibold">
              {stats.logs.warn} wrn
            </span>
            <span className="text-red-400 font-semibold">
              {stats.logs.error} err
            </span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl flex flex-col justify-between">
          <p className="text-xs text-slate-400 font-medium uppercase">
            Metrics Sent
          </p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-indigo-400">
              {stats.metrics}
            </span>
            <span className="text-xs text-slate-500">records</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Resource limits & latencies
          </p>
        </div>

        <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl flex flex-col justify-between">
          <p className="text-xs text-slate-400 font-medium uppercase">
            Traces Logged
          </p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-violet-400">
              {stats.traces}
            </span>
            <span className="text-xs text-slate-500">spans</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Linked by trace context
          </p>
        </div>

        <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl flex flex-col justify-between">
          <p className="text-xs text-slate-400 font-medium uppercase">
            Business Events
          </p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-400">
              {stats.events}
            </span>
            <span className="text-xs text-slate-500">events</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Checkout / payment transactions
          </p>
        </div>

        <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl flex flex-col justify-between">
          <p className="text-xs text-slate-400 font-medium uppercase">
            API Success Rate
          </p>
          <div className="flex items-baseline gap-1 mt-2">
            <span
              className={`text-3xl font-extrabold tracking-tight ${getSuccessRate() > 80 ? "text-emerald-400" : "text-amber-400"}`}
            >
              {getSuccessRate()}%
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${getSuccessRate() > 80 ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${getSuccessRate()}%` }}
            ></div>
          </div>
        </div>

        {/* Load Rate status */}
        <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl flex flex-col justify-between">
          <p className="text-xs text-slate-400 font-medium uppercase">
            Workload Rate
          </p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-indigo-400">
              {trafficStatus.active ? trafficStatus.rate : 0}
            </span>
            <span className="text-xs text-slate-500">req/s</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Total sent: {trafficStatus.totalSent}
          </p>
        </div>
      </section>

      {/* Main Grid: Controls + Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
        {/* Left Side: Controls Tabs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-2 flex gap-1.5">
            {[
              { id: "controls", label: "Scenario buttons", icon: Zap },
              { id: "presets", label: "Presets", icon: Settings },
              { id: "incidents", label: "AI Incidents", icon: Workflow },
              { id: "chaos", label: "Chaos Mode", icon: Flame },
              { id: "load", label: "Load Testing", icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === tab.id
                      ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-md"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6 bg-slate-900/20 border border-slate-800 rounded-2xl min-h-[400px]">
            {/* Tab: Scenario Buttons */}
            {activeTab === "controls" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-200 mb-2">
                    Simulate Telemetry and Failures
                  </h3>
                  <p className="text-xs text-slate-400">
                    Click a button to fire an individual metric/log anomaly
                    immediately.
                  </p>
                </div>

                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                  {/* Logs Section */}
                  <div>
                    <h4 className="text-xs text-slate-500 font-semibold uppercase mb-2">
                      Standard Logs
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          handleAction("Info Log", () =>
                            generateLogScenario("info"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 font-semibold"
                      >
                        Info Log
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Debug Log", () =>
                            generateLogScenario("debug"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 font-semibold"
                      >
                        Debug Log
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Warning Log", () =>
                            generateLogScenario("warn"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-amber-300 font-semibold"
                      >
                        Warning Log
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Error Log", () =>
                            generateLogScenario("error"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        Error Log
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Critical Log", () =>
                            generateLogScenario("critical"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-red-950/20 hover:bg-red-950/30 border border-red-900 rounded-lg text-red-300 font-bold"
                      >
                        Critical Log
                      </button>
                    </div>
                  </div>

                  {/* Exceptions */}
                  <div>
                    <h4 className="text-xs text-slate-500 font-semibold uppercase mb-2">
                      Exceptions & Code Failures
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          handleAction("Uncaught Exception", () =>
                            generateExceptionScenario("uncaught"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        Uncaught Error
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Handled Exception", () =>
                            generateExceptionScenario("handled"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-amber-300 font-semibold"
                      >
                        Handled Rejection
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Nested Exception", () =>
                            generateExceptionScenario("nested"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        Nested Exception
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Validation Exception", () =>
                            generateExceptionScenario("validation"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 font-semibold"
                      >
                        Validation Error
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Database Exception", () =>
                            generateExceptionScenario("database"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        DB Syntax Error
                      </button>
                    </div>
                  </div>

                  {/* Latency */}
                  <div>
                    <h4 className="text-xs text-slate-500 font-semibold uppercase mb-2">
                      Latency Problems
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          handleAction("500ms Latency", () =>
                            generateLatencyScenario("500ms", environment),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 font-semibold"
                      >
                        500ms
                      </button>
                      <button
                        onClick={() =>
                          handleAction("2s Latency", () =>
                            generateLatencyScenario("2s", environment),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-amber-300 font-semibold"
                      >
                        2s Delay
                      </button>
                      <button
                        onClick={() =>
                          handleAction("5s Latency", () =>
                            generateLatencyScenario("5s", environment),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        5s Timeout
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Random Latency", () =>
                            generateLatencyScenario("random", environment),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 font-semibold"
                      >
                        Random
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Latency Spike", () =>
                            generateLatencyScenario("spike", environment),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-bold"
                      >
                        Latency Spike
                      </button>
                    </div>
                  </div>

                  {/* Database Failures */}
                  <div>
                    <h4 className="text-xs text-slate-500 font-semibold uppercase mb-2">
                      Database Outages
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          handleAction("DB Connection Timeout", () =>
                            generateDatabaseScenario("timeout"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        Timeout (15s)
                      </button>
                      <button
                        onClick={() =>
                          handleAction("DB Connection Refused", () =>
                            generateDatabaseScenario("refused"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-red-950/20 hover:bg-red-950/30 border border-red-900 rounded-lg text-red-300 font-semibold"
                      >
                        Connection Refused
                      </button>
                      <button
                        onClick={() =>
                          handleAction("DB Slow Query", () =>
                            generateDatabaseScenario("slow"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-amber-300 font-semibold"
                      >
                        Slow Query (4.2s)
                      </button>
                      <button
                        onClick={() =>
                          handleAction("DB Deadlock Conflict", () =>
                            generateDatabaseScenario("deadlock"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        Deadlock
                      </button>
                      <button
                        onClick={() =>
                          handleAction("DB Migration Failure", () =>
                            generateDatabaseScenario("migration"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        Migration Error
                      </button>
                    </div>
                  </div>

                  {/* Redis Failures */}
                  <div>
                    <h4 className="text-xs text-slate-500 font-semibold uppercase mb-2">
                      Redis Cache Problems
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          handleAction("Redis Cache Miss Storm", () =>
                            generateRedisScenario("cache-storm"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-amber-300 font-semibold"
                      >
                        Cache Miss Storm
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Redis Connection Refused", () =>
                            generateRedisScenario("unavailable"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-red-950/20 hover:bg-red-950/30 border border-red-900 rounded-lg text-red-300 font-semibold"
                      >
                        Redis Offline
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Redis Slow Get", () =>
                            generateRedisScenario("slow"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-amber-300 font-semibold"
                      >
                        Slow Redis (350ms)
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Redis OOM eviction", () =>
                            generateRedisScenario("memory"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        OOM Eviction Limit
                      </button>
                    </div>
                  </div>

                  {/* API Failures */}
                  <div>
                    <h4 className="text-xs text-slate-500 font-semibold uppercase mb-2">
                      REST API Failures
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          handleAction("404 Not Found burst", () =>
                            generateApiScenario("404"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 font-semibold"
                      >
                        404 Burst
                      </button>
                      <button
                        onClick={() =>
                          handleAction("429 Too Many Requests", () =>
                            generateApiScenario("429"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-amber-300 font-semibold"
                      >
                        429 Flood
                      </button>
                      <button
                        onClick={() =>
                          handleAction("500 Internal Error", () =>
                            generateApiScenario("500"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        500 Error
                      </button>
                      <button
                        onClick={() =>
                          handleAction("HTTP Gateway Timeout", () =>
                            generateApiScenario("timeout"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        Gateway Timeout
                      </button>
                    </div>
                  </div>

                  {/* Auth Problems */}
                  <div>
                    <h4 className="text-xs text-slate-500 font-semibold uppercase mb-2">
                      Auth & Security Problems
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          handleAction("Invalid Signature", () =>
                            generateAuthScenario("invalid"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-amber-300 font-semibold"
                      >
                        Invalid Token
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Expired Token", () =>
                            generateAuthScenario("expired"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-amber-300 font-semibold"
                      >
                        Expired Session
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Access Denied", () =>
                            generateAuthScenario("denied"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        Permission Denied
                      </button>
                    </div>
                  </div>

                  {/* Business Events */}
                  <div>
                    <h4 className="text-xs text-slate-500 font-semibold uppercase mb-2">
                      ECommerce Business Events
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          handleAction("User Signup Completed", () =>
                            generateBusinessEvent("signup"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-emerald-400 font-semibold"
                      >
                        User Signup
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Order Created", () =>
                            generateBusinessEvent("order"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 font-semibold"
                      >
                        Order Created
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Checkout Completed", () =>
                            generateBusinessEvent("checkout"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-emerald-400 font-semibold"
                      >
                        Checkout Success
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Payment Transaction Failed", () =>
                            generateBusinessEvent("payment-failed"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        Payment Declined
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Refund Issued", () =>
                            generateBusinessEvent("refund"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 font-semibold"
                      >
                        Refund Processed
                      </button>
                    </div>
                  </div>

                  {/* Host Hardware Metrics */}
                  <div>
                    <h4 className="text-xs text-slate-500 font-semibold uppercase mb-2">
                      System Resources (CPU & Memory)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          handleAction("CPU Spike", () =>
                            generateCpuScenario("spike"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-amber-300 font-semibold"
                      >
                        CPU Spike
                      </button>
                      <button
                        onClick={() =>
                          handleAction("CPU Thread Saturation", () =>
                            generateCpuScenario("saturation"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        Event Loop Saturation
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Expensive JSON Parse", () =>
                            generateCpuScenario("expensive-loop"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 font-semibold"
                      >
                        Expensive Loop (1.8s)
                      </button>
                      <button
                        onClick={() =>
                          handleAction("Memory Leak", () =>
                            generateMemoryScenario("leak"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 font-semibold"
                      >
                        Memory Leak
                      </button>
                      <button
                        onClick={() =>
                          handleAction("GC Pressure Pause", () =>
                            generateMemoryScenario("gc-pressure"),
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-amber-300 font-semibold"
                      >
                        GC Lockup (180ms)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Test Presets */}
            {activeTab === "presets" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-200 mb-2">
                    One-Click Test Presets
                  </h3>
                  <p className="text-xs text-slate-400">
                    Trigger complex, multi-service topologies in a single click
                    to assert system behavior.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      name: "Healthy System",
                      desc: "Sets a steady 10 req/sec flow of successful requests. Low latencies and low CPU utilization.",
                      type: "success",
                    },
                    {
                      name: "Slow Database",
                      desc: "Injects slow query lock conflicts and query time warnings in PostgreSQL.",
                      type: "warn",
                    },
                    {
                      name: "Cache Failure",
                      desc: "Redis goes offline. Triggers an explosion of cache miss falls back to the database layer.",
                      type: "warn",
                    },
                    {
                      name: "Payment Outage",
                      desc: "Fires critical API gateway timeouts and merchant gateway declined transactions.",
                      type: "error",
                    },
                    {
                      name: "High Traffic Event",
                      desc: "Generates a sustained load of 100 req/sec. Moderately elevated metrics.",
                      type: "success",
                    },
                    {
                      name: "Black Friday Traffic",
                      desc: "Stress-tests ingestion scaling. Fires 1000 req/sec logs and metrics spikes.",
                      type: "warn",
                    },
                    {
                      name: "Incident Storm",
                      desc: "Injects random exceptions, timeouts, and latency spikes across all services concurrently.",
                      type: "error",
                    },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => triggerPreset(preset.name)}
                      className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between hover:-translate-y-0.5 ${
                        activePreset === preset.name
                          ? "bg-slate-900 border-indigo-500 ring-1 ring-indigo-500"
                          : "bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
                      }`}
                    >
                      {activePreset === preset.name && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 rounded-bl-lg"></span>
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              preset.type === "success"
                                ? "bg-emerald-500"
                                : preset.type === "warn"
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                          ></span>
                          <h4 className="text-sm font-bold text-slate-200">
                            {preset.name}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">
                          {preset.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: AI Incidents */}
            {activeTab === "incidents" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-200 mb-2">
                    Assert AI Anomaly and Incident Reports
                  </h3>
                  <p className="text-xs text-slate-400">
                    Trigger multi-stage cascades designed to assert that the AI
                    agent correctly groups correlated logs, identifies root
                    causes, and creates summaries.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Scenario A */}
                  <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-950 border border-indigo-800 text-indigo-300 rounded">
                          Scenario A
                        </span>
                        <h4 className="text-sm font-bold text-slate-200">
                          DB Latency Cascade
                        </h4>
                      </div>
                      <button
                        onClick={() =>
                          handleAction("Scenario A", () =>
                            scenarioEngine.runScenarioA(environment),
                          )
                        }
                        disabled={scenarioStatus.active}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" />
                        Trigger
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-normal">
                      Postgres lock wait latency spikes $\rightarrow$ Checkout
                      service blocks $\rightarrow$ Public API Gateway returns
                      504 Gateway Timeouts to users.
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span>Flow:</span>
                      <span className="font-semibold text-slate-400">
                        postgres-db
                      </span>
                      <span>&rarr;</span>
                      <span className="font-semibold text-slate-400">
                        checkout-service
                      </span>
                      <span>&rarr;</span>
                      <span className="font-semibold text-slate-400">
                        web-gateway
                      </span>
                    </div>
                  </div>

                  {/* Scenario B */}
                  <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-violet-950 border border-violet-800 text-violet-300 rounded">
                          Scenario B
                        </span>
                        <h4 className="text-sm font-bold text-slate-200">
                          Redis Cache Outage & SQL Overload
                        </h4>
                      </div>
                      <button
                        onClick={() =>
                          handleAction("Scenario B", () =>
                            scenarioEngine.runScenarioB(environment),
                          )
                        }
                        disabled={scenarioStatus.active}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" />
                        Trigger
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-normal">
                      Redis instance drops connections $\rightarrow$ Catalog
                      service falls back to direct database fetches
                      $\rightarrow$ Event loop lag spike & CPU saturates at 99%.
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span>Flow:</span>
                      <span className="font-semibold text-slate-400">
                        redis-cache
                      </span>
                      <span>&rarr;</span>
                      <span className="font-semibold text-slate-400">
                        checkout-service
                      </span>
                      <span>&rarr;</span>
                      <span className="font-semibold text-slate-400">
                        postgres-db
                      </span>
                    </div>
                  </div>

                  {/* Scenario C */}
                  <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-pink-950 border border-pink-800 text-pink-300 rounded">
                          Scenario C
                        </span>
                        <h4 className="text-sm font-bold text-slate-200">
                          Payment Timeout Queue Backlog
                        </h4>
                      </div>
                      <button
                        onClick={() =>
                          handleAction("Scenario C", () =>
                            scenarioEngine.runScenarioC(environment),
                          )
                        }
                        disabled={scenarioStatus.active}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" />
                        Trigger
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-normal">
                      Stripe API fails to respond (15s timeout) $\rightarrow$
                      Job queue 'payment-jobs' backlog grows past threshold
                      $\rightarrow$ Failed jobs fall to dead-letter queue.
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span>Flow:</span>
                      <span className="font-semibold text-slate-400">
                        payment-service
                      </span>
                      <span>&rarr;</span>
                      <span className="font-semibold text-slate-400">
                        checkout-service
                      </span>
                      <span>&rarr;</span>
                      <span className="font-semibold text-slate-400">
                        web-gateway
                      </span>
                    </div>
                  </div>

                  {/* Correlated engine active state */}
                  {scenarioStatus.active && (
                    <div className="p-3 bg-indigo-950/20 border border-indigo-900 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
                        <span className="text-xs font-bold text-slate-300">
                          Scenario Engine Running:
                        </span>
                        <span className="text-xs text-indigo-400 font-semibold">
                          {scenarioStatus.scenarioName}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {scenarioStatus.currentStep}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Chaos Engine */}
            {activeTab === "chaos" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-200 mb-2">
                    Automated Chaos Injector
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inject random, automated outages, API errors, and latency
                    problems at regular intervals.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
                  {/* Slider: Chaos Duration */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Chaos Run Duration</span>
                      <span className="text-indigo-400 font-mono">
                        {chaosDuration} seconds
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="600"
                      step="10"
                      value={chaosDuration}
                      onChange={(e) => setChaosDuration(Number(e.target.value))}
                      disabled={chaosStatus.active}
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>10s</span>
                      <span>5m</span>
                      <span>10m</span>
                    </div>
                  </div>

                  {/* Slider: Tick rate */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Tick Injection Interval</span>
                      <span className="text-indigo-400 font-mono">
                        {chaosInterval / 1000}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="10000"
                      step="500"
                      value={chaosInterval}
                      onChange={(e) => setChaosInterval(Number(e.target.value))}
                      disabled={chaosStatus.active}
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>500ms</span>
                      <span>5s</span>
                      <span>10s</span>
                    </div>
                  </div>
                </div>

                {/* Status and Action Buttons */}
                <div className="flex items-center gap-4">
                  {chaosStatus.active ? (
                    <button
                      onClick={() => chaosEngine.stop()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors text-sm"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      Stop Chaos Test
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        chaosEngine.start({
                          durationSeconds: chaosDuration,
                          intervalMs: chaosInterval,
                          environment,
                        })
                      }
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors text-sm"
                    >
                      <Play className="w-4 h-4 fill-white animate-pulse" />
                      Start Chaos Test
                    </button>
                  )}

                  {chaosStatus.active && (
                    <div className="flex items-center gap-4 text-sm font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                        <span className="text-red-400">Chaos Active</span>
                      </div>
                      <div className="text-slate-400 font-mono">
                        Time Remaining:{" "}
                        <span className="text-slate-200">
                          {chaosStatus.timeLeft}s
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Display Current Chaos Action */}
                {chaosStatus.active && (
                  <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-300 rounded-xl">
                    <span className="font-bold text-xs">
                      Last Injected Event:{" "}
                    </span>
                    <span className="font-mono text-xs">
                      {chaosStatus.lastEvent}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Load Testing */}
            {activeTab === "load" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-200 mb-2">
                    Throughput Load Generator
                  </h3>
                  <p className="text-xs text-slate-400">
                    Simulate low, medium, or high volumes of continuous
                    requests. The logs will be batched to optimize network
                    pipelines.
                  </p>
                </div>

                <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl space-y-4">
                  <h4 className="text-xs text-slate-500 font-semibold uppercase">
                    Target Traffic Throughput
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { rate: 0, label: "Idle / Off" },
                      { rate: 10, label: "10 req/sec" },
                      { rate: 100, label: "100 req/sec" },
                      { rate: 1000, label: "1000 req/sec" },
                    ].map((item) => (
                      <button
                        key={item.rate}
                        onClick={() => {
                          setLoadRate(item.rate);
                          if (item.rate === 0) {
                            trafficGenerator.stop();
                            addTerminalLog(
                              "system",
                              "Stopped load testing traffic.",
                            );
                          } else {
                            trafficGenerator.start(item.rate, environment);
                            addTerminalLog(
                              "success",
                              `Load testing started at ${item.rate} req/sec`,
                            );
                          }
                        }}
                        className={`p-3 rounded-lg border text-xs font-bold transition-all ${
                          loadRate === item.rate
                            ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {trafficStatus.active && (
                  <div className="p-4 bg-indigo-950/20 border border-indigo-900 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                      <span className="text-slate-300">
                        Background Load Active:
                      </span>
                      <span className="font-bold text-indigo-400">
                        {trafficStatus.rate} req/sec
                      </span>
                    </div>
                    <span className="font-mono text-slate-400">
                      Total Sent: {trafficStatus.totalSent} events
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Live Terminal Console Log */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-200">
                Simulator Log Console
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">
              Autoscroll ON
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
            {/* Header bar */}
            <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-slate-500 text-[10px]">
              <span>SHELL: yarn run sim:workload</span>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
              </div>
            </div>

            {/* Terminal logs list */}
            <div className="p-4 h-[358px] overflow-y-auto space-y-2 leading-relaxed selection:bg-indigo-900/40">
              {terminalLogs.length === 0 ? (
                <div className="text-slate-600 italic flex items-center justify-center h-full">
                  Terminal ready. Trigger scenarios or presets to output
                  telemetry stream.
                </div>
              ) : (
                terminalLogs.map((log, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-start text-[11px]"
                  >
                    <span className="text-slate-600 select-none">
                      [{log.time}]
                    </span>
                    <span
                      className={`font-semibold shrink-0 select-none ${
                        log.type === "info"
                          ? "text-slate-400"
                          : log.type === "warn"
                            ? "text-amber-500"
                            : log.type === "error"
                              ? "text-red-500"
                              : log.type === "success"
                                ? "text-emerald-500"
                                : "text-indigo-400"
                      }`}
                    >
                      {log.type === "info"
                        ? "[INFO]"
                        : log.type === "warn"
                          ? "[WARN]"
                          : log.type === "error"
                            ? "[FAIL]"
                            : log.type === "success"
                              ? "[OK  ]"
                              : "[SYS ]"}
                    </span>
                    <span className="text-slate-300 break-all">{log.text}</span>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Validation Logs Grid */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <h3 className="text-lg font-bold text-slate-200">
            Telemetry Ingestion Validation View
          </h3>
        </div>

        <div className="bg-slate-900/10 border border-slate-800 rounded-xl overflow-hidden glass-panel">
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Ingestion Status</th>
                  <th className="px-6 py-3">Payload Size</th>
                  <th className="px-6 py-3">Response Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {stats.responses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-slate-500 italic"
                    >
                      No validation logs recorded. Generate telemetry to capture
                      HTTP ingestion responses.
                    </td>
                  </tr>
                ) : (
                  stats.responses.slice(0, 10).map((resp, index) => (
                    <tr
                      key={index}
                      className="hover:bg-slate-900/20 transition-colors"
                    >
                      <td className="px-6 py-3.5 text-slate-400">
                        {resp.timestamp}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            resp.type === "logs"
                              ? "bg-violet-950/40 text-violet-300 border border-violet-900/60"
                              : "bg-indigo-950/40 text-indigo-300 border border-indigo-900/60"
                          }`}
                        >
                          {resp.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {resp.success ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                          )}
                          <span
                            className={
                              resp.success
                                ? "text-emerald-400 font-semibold"
                                : "text-red-400 font-semibold"
                            }
                          >
                            {resp.status === 0 ? "Network Error" : resp.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-slate-300">
                        {resp.count} item(s)
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 truncate max-w-xs">
                        {resp.message}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
