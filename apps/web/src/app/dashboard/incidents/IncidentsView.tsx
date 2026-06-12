"use client";

import { useState, useMemo } from "react";
import NextLink from "next/link";
import { 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Filter, 
  Sparkles, 
  Activity, 
  RefreshCw 
} from "lucide-react";

interface SerializedService {
  id: string;
  name: string;
  environment: string;
}

interface SerializedIncident {
  id: string;
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
  } | null;
}

interface IncidentsViewProps {
  project: {
    id: string;
    name: string;
    apiKey: string;
  };
  services: SerializedService[];
  initialIncidents: SerializedIncident[];
}

export default function IncidentsView({ project, services, initialIncidents }: IncidentsViewProps) {
  const [incidents, setIncidents] = useState<SerializedIncident[]>(initialIncidents);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync / refresh logic
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/incidents?projectId=${project.id}`);
      if (res.ok) {
        const data = await res.json();
        const formattedIncidents = data.incidents.map((inc: any) => {
          return {
            id: inc._id.toString(),
            title: inc.title,
            summary: inc.summary,
            rootCause: inc.rootCause,
            impact: inc.impact,
            suggestedFix: inc.suggestedFix,
            confidence: inc.confidence,
            status: inc.status,
            createdAt: new Date(inc.createdAt).toISOString(),
            updatedAt: new Date(inc.updatedAt).toISOString(),
            resolvedAt: inc.resolvedAt ? new Date(inc.resolvedAt).toISOString() : null,
            ttd: inc.ttd,
            ttr: inc.ttr || null,
            service: inc.serviceId
              ? {
                  id: inc.serviceId._id.toString(),
                  name: inc.serviceId.name,
                  environment: inc.serviceId.environment,
                }
              : null,
            deploy: inc.deployId
              ? {
                  id: inc.deployId._id.toString(),
                  commitSha: inc.deployId.commitSha,
                  commitMessage: inc.deployId.commitMessage,
                  branch: inc.deployId.branch,
                }
              : null,
          };
        });
        setIncidents(formattedIncidents);
      }
    } catch (e) {
      console.error("Failed to refresh incidents:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchesSearch = 
        inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.summary.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "all" || inc.status === statusFilter;
      
      const matchesService = 
        serviceFilter === "all" || (inc.service && inc.service.name === serviceFilter);

      return matchesSearch && matchesStatus && matchesService;
    });
  }, [incidents, searchQuery, statusFilter, serviceFilter]);

  const openCount = useMemo(() => {
    return incidents.filter((inc) => inc.status !== "resolved").length;
  }, [incidents]);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1.5">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            AI Intelligence Layer
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Incident Console
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review and investigate anomalies detected by the statistical engine and parsed by AI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {openCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              {openCount} Active {openCount === 1 ? "Incident" : "Incidents"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              All Systems Operational
            </span>
          )}

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 hover:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Incidents"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/70 backdrop-blur-sm flex flex-col md:flex-row md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search incidents by symptom or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 text-slate-250 placeholder:text-slate-600 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Service filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="bg-slate-950 border border-slate-850 hover:border-slate-700 text-slate-350 py-1.5 px-3 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="all">All Services</option>
              {Array.from(new Set(services.map((s) => s.name))).map((serviceName) => (
                <option key={serviceName} value={serviceName}>
                  {serviceName}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-850 hover:border-slate-700 text-slate-350 py-1.5 px-3 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Incidents List */}
      {filteredIncidents.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-900 bg-slate-950/40 p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
          <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center mb-4 text-slate-500 shadow-inner">
            <CheckCircle2 className="w-6 h-6 text-indigo-500/60" />
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">No Incidents Found</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            Everything looks completely quiet. There are no active anomalies or incident reports matches your filter configuration.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredIncidents.map((inc) => {
            const timeAgo = new Date(inc.createdAt).toLocaleString();
            const statusClass = 
              inc.status === "open"
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : inc.status === "investigating"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";

            return (
              <div
                key={inc.id}
                className="group relative rounded-xl border border-slate-900 bg-slate-950 hover:border-slate-800/80 transition-all duration-200 p-5 md:p-6 flex flex-col md:flex-row md:items-start justify-between gap-6 hover:shadow-xl hover:shadow-indigo-950/20"
              >
                {/* Visual Accent for Open Incidents */}
                {inc.status !== "resolved" && (
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${
                    inc.status === "open" ? "bg-rose-500" : "bg-amber-500"
                  }`} />
                )}

                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Status Pill */}
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${statusClass}`}>
                      {inc.status}
                    </span>

                    {/* Service & Env Pill */}
                    <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {inc.service ? `${inc.service.name} • ${inc.service.environment.toUpperCase()}` : "unknown service"}
                    </span>

                    {/* AI Tag */}
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/5 border border-indigo-500/15">
                      <Sparkles className="w-2.5 h-2.5" />
                      AI Summary ({Math.round(inc.confidence * 100)}%)
                    </span>
                  </div>

                  {/* Incident Title */}
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                    {inc.title}
                  </h3>

                  {/* Summary Snippet */}
                  <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
                    {inc.summary}
                  </p>

                  <div className="flex items-center gap-4 pt-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Detected {timeAgo}
                    </span>
                    {inc.ttr && (
                      <span className="flex items-center gap-1.5 text-emerald-500/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" />
                        Resolved in {Math.round(inc.ttr / 1000 / 60)}m
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center self-end md:self-center shrink-0">
                  <NextLink
                    href={`/dashboard/incidents/${inc.id}?projectId=${project.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 transition-all cursor-pointer"
                  >
                    Investigate
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
                  </NextLink>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
