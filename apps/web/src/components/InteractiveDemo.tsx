"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Zap,
  Server,
  AlertTriangle,
  CheckCircle,
  Clock,
  GitCommit,
  TrendingUp,
  ArrowRight,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState<
    "services" | "ai" | "metrics" | "timeline"
  >("services");

  // Simulated logs/metrics counter
  const [ingestedCount, setIngestedCount] = useState(1450280);
  useEffect(() => {
    const interval = setInterval(() => {
      setIngestedCount((prev) => prev + Math.floor(Math.random() * 45) + 5);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-950/80 shadow-2xl overflow-hidden backdrop-blur-sm">
      {/* Top Bar / Window Controls */}
      <div className="flex items-center justify-between border-b border-slate-900 bg-slate-900/60 px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-slate-500 font-mono select-none">
            dashboard.observabilityos.in/project_devops_prod
          </span>
        </div>

        {/* Live Ingestion Indicator */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span>{ingestedCount.toLocaleString("en-US")} logs ingested</span>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex overflow-x-auto scrollbar-none whitespace-nowrap border-b border-slate-900 bg-slate-900/20 px-6">
        <button
          onClick={() => setActiveTab("services")}
          className={cn(
            "flex shrink-0 items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "services"
              ? "border-indigo-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200",
          )}
        >
          <Server className="w-3.5 h-3.5" />
          Services Overview
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          className={cn(
            "flex shrink-0 items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer relative",
            activeTab === "ai"
              ? "border-indigo-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200",
          )}
        >
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          AI Incident Room
          <span className="absolute top-2 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab("metrics")}
          className={cn(
            "flex shrink-0 items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "metrics"
              ? "border-indigo-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200",
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          Live Metrics
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          className={cn(
            "flex shrink-0 items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "timeline"
              ? "border-indigo-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200",
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          Anomaly Timeline
        </button>
      </div>

      {/* View Content */}
      <div className="p-6 min-h-90 bg-slate-950/40">
        {/* 1. SERVICES OVERVIEW TAB */}
        {activeTab === "services" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Microservice Health Registry
              </h4>
              <span className="text-[11px] text-slate-400">
                Environment:{" "}
                <strong className="text-slate-200">production</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Auth Service */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-slate-200 font-mono">
                      auth-service
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Handles JWT validation & sessions
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                    Healthy
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-900/60 pt-3">
                  <div>
                    <span className="block text-[10px] text-slate-500 font-mono uppercase">
                      Err Rate
                    </span>
                    <strong className="text-xs text-slate-300">0.03%</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-mono uppercase">
                      Latency
                    </span>
                    <strong className="text-xs text-slate-300">42 ms</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-mono uppercase">
                      Uptime
                    </span>
                    <strong className="text-xs text-slate-300">99.99%</strong>
                  </div>
                </div>
              </div>

              {/* Card 2: Payment Service (Active Incident) */}
              <div className="p-4 rounded-xl border border-red-900/30 bg-red-950/5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-slate-200 font-mono">
                      payment-service
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Stripe billing integrations
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 border border-red-500/20 text-red-400 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />{" "}
                    Anomaly Detected
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-red-950/35 pt-3">
                  <div>
                    <span className="block text-[10px] text-red-400/50 font-mono uppercase">
                      Err Rate
                    </span>
                    <strong className="text-xs text-red-400">14.2%</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-red-400/50 font-mono uppercase">
                      Latency
                    </span>
                    <strong className="text-xs text-red-400">1,240 ms</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-mono uppercase">
                      Uptime
                    </span>
                    <strong className="text-xs text-slate-300">98.15%</strong>
                  </div>
                </div>
              </div>

              {/* Card 3: API Gateway */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-slate-200 font-mono">
                      api-gateway
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Proxy routing & rate-limiting
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />{" "}
                    Warning
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-900/60 pt-3">
                  <div>
                    <span className="block text-[10px] text-slate-500 font-mono uppercase">
                      Err Rate
                    </span>
                    <strong className="text-xs text-yellow-500">1.1%</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-mono uppercase">
                      Latency
                    </span>
                    <strong className="text-xs text-slate-300">182 ms</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-mono uppercase">
                      Uptime
                    </span>
                    <strong className="text-xs text-slate-300">99.92%</strong>
                  </div>
                </div>
              </div>

              {/* Card 4: Notification Service */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-slate-200 font-mono">
                      notification-service
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Slack & email alerts dispatch
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                    Healthy
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-900/60 pt-3">
                  <div>
                    <span className="block text-[10px] text-slate-500 font-mono uppercase">
                      Err Rate
                    </span>
                    <strong className="text-xs text-slate-300">0.00%</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-mono uppercase">
                      Latency
                    </span>
                    <strong className="text-xs text-slate-300">12 ms</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-mono uppercase">
                      Uptime
                    </span>
                    <strong className="text-xs text-slate-300">100.00%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick explanation hint */}
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-xs text-indigo-400 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>
                  One of your services has triggered a threshold anomaly. Click
                  the <strong>AI Incident Room</strong> tab to see the
                  post-mortem.
                </span>
              </span>
              <button
                onClick={() => setActiveTab("ai")}
                className="text-xs font-bold underline flex items-center gap-1 hover:text-indigo-300 cursor-pointer"
              >
                Go to Incident <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* 2. AI INCIDENT ROOM TAB */}
        {activeTab === "ai" && (
          <div className="space-y-4 animate-fadeIn text-left">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-900 pb-3 gap-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-red-950 border border-red-800 text-[10px] font-bold text-red-400 font-mono uppercase">
                  INC-8823
                </span>
                <h4 className="text-sm font-bold text-slate-200">
                  payment-service connection timeouts
                </h4>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>
                  Detected:{" "}
                  <strong className="text-slate-300">2 minutes ago</strong>
                </span>
              </div>
            </div>

            {/* AI Summary Box */}
            <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 mb-3 uppercase tracking-wider">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span>AI-Native Post-Mortem Diagnosis</span>
              </div>

              <h5 className="text-sm font-bold text-slate-200 mb-2">
                What Happened & Why
              </h5>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                A sudden database connection pool exhaustion occurred on{" "}
                <code className="bg-slate-950 text-indigo-300 px-1 py-0.5 rounded text-[11px] font-mono">
                  payment-service
                </code>
                . The database client pool reached{" "}
                <strong className="text-slate-300">100/100 connections</strong>{" "}
                at 14:38:00, leading to socket timeout errors on client
                checkouts. This is 100% correlated with the deployment of
                release{" "}
                <code className="bg-slate-950 text-slate-300 px-1 py-0.5 rounded text-[11px] font-mono">
                  v1.2.4
                </code>
                (commit{" "}
                <code className="text-indigo-400 font-mono">8d3e9f</code>) which
                took place 2 minutes prior.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-900/60 pt-4 text-xs">
                <div>
                  <h6 className="font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" /> Affected
                    Endpoints
                  </h6>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-[11px]">
                    <li>
                      POST /api/charge{" "}
                      <span className="text-red-400 font-bold">
                        (100% error rate)
                      </span>
                    </li>
                    <li>
                      POST /api/refund{" "}
                      <span className="text-red-400/80">(85% error rate)</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h6 className="font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <GitCommit className="w-3.5 h-3.5 text-indigo-400" />{" "}
                    Correlated Deployment
                  </h6>
                  <div className="p-2 rounded bg-slate-950 border border-slate-900 text-[11px] leading-relaxed">
                    <div className="font-semibold text-slate-200">
                      v1.2.4 - Add auto-retry queue
                    </div>
                    <div className="text-slate-500 font-mono mt-0.5">
                      Author: @mathur | Commit: 8d3e9f3
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Action Steps */}
            <div className="p-4 rounded-xl border border-indigo-500/15 bg-indigo-500/5 text-xs">
              <h5 className="font-bold text-slate-200 flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Recommended Resolution
              </h5>
              <p className="text-slate-400 leading-relaxed mb-3">
                Review{" "}
                <code className="bg-slate-950 px-1 py-0.5 rounded text-[11px] text-slate-300 font-mono">
                  payment-service/lib/charge.ts:L42-L58
                </code>
                . The connection is opened in a recursive loop retry block
                without a corresponding{" "}
                <code className="text-emerald-400 font-mono">db.close()</code> /{" "}
                <code className="text-emerald-400 font-mono">
                  client.release()
                </code>{" "}
                call in the error catch block.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => alert("Simulated Rollback Initiated!")}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Trigger Rollback (v1.2.3)
                </button>
                <button
                  onClick={() =>
                    alert("Viewing code context in dashboard playground...")
                  }
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  View Code Context
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. LIVE METRICS TAB */}
        {activeTab === "metrics" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Real-Time Microsecond Metrics
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                Polling interval: 100ms
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Metric 1 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/25">
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                  Ingestion Load
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <strong className="text-2xl font-bold text-white tracking-tight">
                    4,282
                  </strong>
                  <span className="text-xs text-slate-400">logs/sec</span>
                </div>
                <div className="mt-3 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: "68%" }}
                  />
                </div>
              </div>

              {/* Metric 2 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/25">
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                  Global Latency (p99)
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <strong className="text-2xl font-bold text-red-400 tracking-tight">
                    1,240ms
                  </strong>
                  <span className="text-xs text-red-500 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +350%
                  </span>
                </div>
                <div className="mt-3 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full animate-pulse"
                    style={{ width: "95%" }}
                  />
                </div>
              </div>

              {/* Metric 3 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/25">
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                  AI Scrape Coverage
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <strong className="text-2xl font-bold text-emerald-400 tracking-tight">
                    100.0%
                  </strong>
                  <span className="text-[10px] text-slate-500">compliant</span>
                </div>
                <div className="mt-3 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            </div>

            {/* Custom chart simulation */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider mb-4 block">
                Telemetry Feed Latency (last 30 seconds)
              </span>

              <div className="h-28 flex items-end gap-0.5 sm:gap-1 px-2">
                {[
                  30, 32, 28, 35, 42, 38, 39, 41, 35, 30, 28, 32, 120, 380, 850,
                  1100, 1240, 1150, 1200, 1240, 1210, 1190, 1240, 1220, 1230,
                  1240,
                ].map((val, idx) => {
                  const percentage = Math.max(
                    8,
                    Math.min(100, (val / 1240) * 100),
                  );
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex-1 rounded-t-sm transition-all duration-300 relative group",
                        val > 200
                          ? "bg-red-500/80 hover:bg-red-400"
                          : "bg-indigo-600/60 hover:bg-indigo-500",
                      )}
                      style={{ height: `${percentage}%` }}
                    >
                      {/* Tooltip on hover */}
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white font-mono text-[9px] px-1 py-0.5 rounded border border-slate-800 whitespace-nowrap z-50">
                        {val}ms
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-slate-900/60 mt-2 pt-2 text-[10px] text-slate-500 font-mono">
                <span>30s ago</span>
                <span className="text-red-400 font-bold">
                  Deploy correlation point (14:40:15)
                </span>
                <span>Just now</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. ANOMALY TIMELINE TAB */}
        {activeTab === "timeline" && (
          <div className="space-y-4 animate-fadeIn text-left">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                System Activity Stream
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                Total anomalies logged:{" "}
                <strong className="text-slate-200">12</strong>
              </span>
            </div>

            <div className="relative border-l border-slate-900 pl-4 ml-2 space-y-5">
              {/* Event 1 */}
              <div className="relative">
                <div className="absolute -left-5.25 top-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-slate-950" />
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-200 font-mono">
                    14:38:00 — Anomaly Registered
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    payment-service
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Latency spiked to 1,240ms on{" "}
                  <code className="text-red-400">/api/charge</code>. Error rate
                  crossed threshold with Z-score = 4.28. AI diagnosis triggered
                  automatically.
                </p>
              </div>

              {/* Event 2 */}
              <div className="relative">
                <div className="absolute -left-5.25 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-slate-950" />
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-200 font-mono">
                    14:40:15 — GitHub Deploy Event
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    payment-service
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Deployment of version{" "}
                  <code className="text-indigo-400">v1.2.4</code> completed
                  successfully by developer{" "}
                  <code className="text-slate-300">@mathur</code>. Correlated
                  with latency spike.
                </p>
              </div>

              {/* Event 3 */}
              <div className="relative">
                <div className="absolute -left-5.25 top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950" />
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-200 font-mono">
                    14:21:40 — Incident Resolved
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    auth-service
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Incident <code className="text-slate-300">INC-8821</code> (JWT
                  verify error surge) marked as RESOLVED after roll-back script
                  executed successfully.
                </p>
              </div>

              {/* Event 4 */}
              <div className="relative">
                <div className="absolute -left-5.25 top-1.5 w-2.5 h-2.5 rounded-full bg-yellow-500 border border-slate-950" />
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-200 font-mono">
                    14:02:11 — Log Pattern Alert
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    api-gateway
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  High frequency of 429 Too Many Requests logs (230/min)
                  detected from client IP 192.168.1.144. Automated IP
                  rate-limiter engaged.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
