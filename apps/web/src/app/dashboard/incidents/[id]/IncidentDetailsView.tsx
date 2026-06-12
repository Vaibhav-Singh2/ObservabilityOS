"use client";

import { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  GitBranch, 
  GitCommit, 
  Terminal, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Cpu,
  ChevronDown,
  ChevronUp,
  Square,
  CheckSquare
} from "lucide-react";

interface LogItem {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  traceId: string | null;
  metadata: any | null;
}

interface IncidentDetailsProps {
  projectId: string;
  incident: {
    id: string;
    projectId: string;
    title: string;
    summary: string;
    rootCause: string;
    impact: string;
    suggestedFix: string[];
    confidence: number;
    status: "open" | "investigating" | "resolved";
    createdAt: string;
    updatedAt: string;
    resolvedAt: string | null;
    ttd: number;
    ttr: number | null;
    service: {
      id: string;
      name: string;
      environment: string;
    } | null;
    deploy: {
      id: string;
      commitSha: string;
      commitMessage: string;
      branch: string;
      deployedAt: string | null;
    } | null;
  };
  initialLogs: LogItem[];
}

export default function IncidentDetailsView({ projectId, incident: initialIncident, initialLogs }: IncidentDetailsProps) {
  const router = useRouter();
  const [incident, setIncident] = useState(initialIncident);
  const [logs] = useState<LogItem[]>(initialLogs);
  const [actionChecked, setActionChecked] = useState<Record<number, boolean>>({});
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = async (newStatus: "open" | "investigating" | "resolved") => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: incident.id,
          status: newStatus,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIncident({
          ...incident,
          status: data.incident.status,
          resolvedAt: data.incident.resolvedAt ? new Date(data.incident.resolvedAt).toISOString() : null,
          ttr: data.incident.ttr || null,
        });
        router.refresh();
      } else {
        alert("Failed to update status");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating status");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleAction = (idx: number) => {
    setActionChecked((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const toggleLogExpand = (id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  const statusClass = 
    incident.status === "open"
      ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
      : incident.status === "investigating"
      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <NextLink
          href={`/dashboard/incidents?projectId=${projectId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Incidents
        </NextLink>
      </div>

      {/* Incident Header Card */}
      <div className="p-6 rounded-2xl border border-slate-900 bg-slate-950 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Pill */}
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${statusClass}`}>
              {incident.status}
            </span>

            {/* Service & Env Pill */}
            <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              {incident.service ? `${incident.service.name} • ${incident.service.environment.toUpperCase()}` : "unknown service"}
            </span>

            {/* AI tag */}
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/5 border border-indigo-500/15">
              <Sparkles className="w-2.5 h-2.5" />
              AI Analysis ({Math.round(incident.confidence * 100)}%)
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-tight">
            {incident.title}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {incident.status !== "resolved" ? (
            <>
              {incident.status === "open" && (
                <button
                  onClick={() => updateStatus("investigating")}
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Start Investigation
                </button>
              )}
              <button
                onClick={() => updateStatus("resolved")}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                Mark as Resolved
              </button>
            </>
          ) : (
            <button
              onClick={() => updateStatus("open")}
              disabled={isUpdating}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-850 border border-slate-850 text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Reopen Incident
            </button>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) - Incident Data */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Narrative Card */}
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              AI Narrative Summary
            </h2>
            <div className="space-y-4 text-slate-350 text-sm leading-relaxed">
              <p className="p-3.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-slate-300 font-medium">
                {incident.summary}
              </p>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Impact Analysis</h3>
                <p>{incident.impact}</p>
              </div>
            </div>
          </div>

          {/* Root Cause & Git Correlation Card */}
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Root Cause & Correlation
            </h2>
            <div className="space-y-4 text-sm">
              <p className="text-slate-350 leading-relaxed">{incident.rootCause}</p>
              
              {incident.deploy ? (
                <div className="p-4 rounded-xl border border-indigo-950/40 bg-indigo-950/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                      Correlated Deployment
                    </span>
                    {incident.deploy.deployedAt && (
                      <span className="text-xs text-slate-500">
                        Deployed {new Date(incident.deploy.deployedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-650/10 border border-indigo-650/30 flex items-center justify-center shrink-0">
                      <GitCommit className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-slate-200 font-semibold truncate">
                        {incident.deploy.commitMessage}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-mono text-slate-400">
                          {incident.deploy.commitSha.slice(0, 7)}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3.5 h-3.5 text-slate-650" />
                          {incident.deploy.branch}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic bg-slate-900/50 p-3 rounded-lg border border-slate-900">
                  No software deployment events were recorded close to the onset of this anomaly.
                </p>
              )}
            </div>
          </div>

          {/* Log Stream Card */}
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-slate-500" />
              Anomalous Log Stream
            </h2>
            <p className="text-xs text-slate-500">
              The following {logs.length} error logs occurred in the anomalous window. Click on any log to inspect its metadata.
            </p>

            <div className="border border-slate-900 rounded-lg overflow-hidden bg-slate-950/60 font-mono text-xs">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const dateStr = new Date(log.timestamp).toLocaleTimeString();
                
                return (
                  <div key={log.id} className="border-b border-slate-900 last:border-b-0 hover:bg-slate-900/40 transition-colors">
                    {/* Log Row Trigger */}
                    <div
                      onClick={() => toggleLogExpand(log.id)}
                      className="p-3 flex items-start gap-3 cursor-pointer select-none"
                    >
                      <span className="text-slate-600 shrink-0 select-none">{dateStr}</span>
                      <span className="text-rose-500 font-bold shrink-0 select-none">[ERROR]</span>
                      {log.traceId && (
                        <span className="text-indigo-400/80 shrink-0 font-semibold select-none">
                          [{log.traceId.slice(0, 8)}]
                        </span>
                      )}
                      <span className="text-slate-350 truncate flex-1 min-w-0">{log.message}</span>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <span className="text-slate-600 hover:text-slate-400 shrink-0">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </span>
                      )}
                    </div>

                    {/* Metadata Panel */}
                    {isExpanded && log.metadata && (
                      <div className="p-3 bg-slate-950 border-t border-slate-900 text-slate-400 overflow-x-auto select-text leading-relaxed">
                        <span className="block text-slate-600 mb-1 border-b border-slate-900 pb-1 text-[10px] uppercase font-bold tracking-wider">Log Metadata Payload</span>
                        <pre className="text-indigo-300">{JSON.stringify(log.metadata, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width) - Plan & Stats */}
        <div className="space-y-6">
          {/* Action Checklist */}
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Troubleshooting Plan
            </h2>
            <p className="text-xs text-slate-500">
              Follow these AI-suggested steps to isolate and fix the root issue:
            </p>
            <div className="space-y-3">
              {incident.suggestedFix.map((step, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleAction(idx)}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                    actionChecked[idx]
                      ? "bg-emerald-500/5 border-emerald-500/10 text-slate-500 line-through"
                      : "bg-slate-900/40 border-slate-900 hover:border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="shrink-0 pt-0.5">
                    {actionChecked[idx] ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <span className="text-xs leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Incident Metadata Stats */}
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-6 space-y-4 text-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Incident Diagnostics
            </h2>
            
            <div className="space-y-3">
              {/* Service */}
              <div className="flex justify-between py-1.5 border-b border-slate-900">
                <span className="text-slate-500 text-xs">Service</span>
                <span className="text-slate-200 font-semibold font-mono">
                  {incident.service ? incident.service.name : "N/A"}
                </span>
              </div>

              {/* Environment */}
              <div className="flex justify-between py-1.5 border-b border-slate-900">
                <span className="text-slate-500 text-xs">Environment</span>
                <span className="text-slate-200 font-bold uppercase font-mono text-xs">
                  {incident.service ? incident.service.environment : "N/A"}
                </span>
              </div>

              {/* Detected */}
              <div className="flex flex-col py-1.5 border-b border-slate-900 gap-0.5">
                <span className="text-slate-500 text-xs flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Time Detected
                </span>
                <span className="text-slate-250 font-semibold">
                  {new Date(incident.createdAt).toLocaleString()}
                </span>
              </div>

              {/* Resolved */}
              {incident.resolvedAt && (
                <div className="flex flex-col py-1.5 border-b border-slate-900 gap-0.5">
                  <span className="text-slate-500 text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Time Resolved
                  </span>
                  <span className="text-slate-250 font-semibold">
                    {new Date(incident.resolvedAt).toLocaleString()}
                  </span>
                </div>
              )}

              {/* TTD */}
              <div className="flex justify-between py-1.5 border-b border-slate-900">
                <span className="text-slate-500 text-xs">Detection Delay</span>
                <span className="text-slate-200 font-semibold font-mono">
                  {Math.round(incident.ttd / 1000)}s
                </span>
              </div>

              {/* TTR */}
              {incident.ttr && (
                <div className="flex justify-between py-1.5 border-b border-slate-900">
                  <span className="text-slate-500 text-xs">Time-to-Resolve</span>
                  <span className="text-emerald-400 font-semibold font-mono">
                    {Math.round(incident.ttr / 1000 / 60)}m {Math.round((incident.ttr / 1000) % 60)}s
                  </span>
                </div>
              )}

              {/* AI Confidence */}
              <div className="flex flex-col py-1.5 gap-1.5">
                <span className="text-slate-500 text-xs flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" />
                  AI Classification Confidence
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-slate-900 rounded-full h-1.5 border border-slate-800">
                    <div 
                      className="bg-indigo-500 h-1.5 rounded-full" 
                      style={{ width: `${incident.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-indigo-400 font-bold font-mono">
                    {Math.round(incident.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
