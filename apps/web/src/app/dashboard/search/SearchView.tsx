"use client";

import { useState } from "react";
import { 
  Search, 
  Filter, 
  Clock, 
  Terminal, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  X, 
  RefreshCw,
  AlertCircle,
  Database,
  Download,
  Bookmark,
  Trash2
} from "lucide-react";

interface SerializedService {
  id: string;
  name: string;
  environment: string;
}

interface SerializedLog {
  id: string;
  timestamp: string;
  level: "error" | "warn" | "info" | "debug";
  message: string;
  traceId: string | null;
  metadata: Record<string, any>;
  service: {
    id: string;
    name: string;
    environment: string;
  } | null;
}

interface SavedQuery {
  name: string;
  query: string;
  level: string;
  serviceId: string;
  environment: string;
  timeRange: string;
}

interface SearchViewProps {
  project: {
    id: string;
    name: string;
    apiKey: string;
  };
  services: SerializedService[];
  initialLogs: SerializedLog[];
  savedQueries: SavedQuery[];
}

export default function SearchView({ project, services, initialLogs, savedQueries: initialSavedQueries }: SearchViewProps) {
  const [logs, setLogs] = useState<SerializedLog[]>(initialLogs);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [serviceId, setServiceId] = useState("all");
  const [environment, setEnvironment] = useState("all");
  const [timeRange, setTimeRange] = useState("24h");
  const [isSearching, setIsSearching] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Saved searches states
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>(initialSavedQueries);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSavingQuery, setIsSavingQuery] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    setExpandedLogId(null);

    try {
      const params = new URLSearchParams({
        projectId: project.id,
        query,
        level,
        serviceId,
        environment,
        timeRange,
      });

      const res = await fetch(`/api/logs/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      } else {
        console.error("Failed to fetch logs search results");
      }
    } catch (err) {
      console.error("Error during log search:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setQuery("");
    setLevel("all");
    setServiceId("all");
    setEnvironment("all");
    setTimeRange("24h");
    setLogs(initialLogs);
    setExpandedLogId(null);
  };

  const toggleLogExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const handleCopyMetadata = (logId: string, metadata: any) => {
    navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
    setCopiedLogId(logId);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  const handleSaveQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;

    setIsSavingQuery(true);
    try {
      const res = await fetch("/api/projects/saved-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          name: saveName.trim(),
          query,
          level,
          serviceId,
          environment,
          timeRange,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSavedQueries(data.savedQueries);
        setIsSaveModalOpen(false);
        setSaveName("");
      } else {
        const data = await res.json();
        alert(data.error?.message || "Failed to save query");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving search query");
    } finally {
      setIsSavingQuery(false);
    }
  };

  const handleDeleteSavedQuery = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete the saved search "${name}"?`)) return;

    try {
      const res = await fetch(
        `/api/projects/saved-queries?projectId=${project.id}&queryName=${encodeURIComponent(name)}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        const data = await res.json();
        setSavedQueries(data.savedQueries);
      } else {
        alert("Failed to delete saved query");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting saved query");
    }
  };

  const loadSavedQuery = (q: SavedQuery) => {
    setQuery(q.query || "");
    setLevel(q.level || "all");
    setServiceId(q.serviceId || "all");
    setEnvironment(q.environment || "all");
    setTimeRange(q.timeRange || "24h");
    
    // Trigger search in next tick
    setTimeout(() => {
      const searchBtn = document.getElementById("search-trigger-btn");
      searchBtn?.click();
    }, 50);
  };

  const handleExport = (format: "csv" | "json") => {
    const params = new URLSearchParams({
      projectId: project.id,
      query,
      level,
      serviceId,
      environment,
      timeRange,
      format,
    });
    window.location.href = `/api/logs/export?${params.toString()}`;
  };

  const levelStyles = {
    error: "bg-rose-500/10 border-rose-500/20 text-rose-450",
    warn: "bg-amber-500/10 border-amber-500/20 text-amber-450",
    info: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    debug: "bg-slate-500/10 border-slate-500/20 text-slate-400",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1.5">
            <Terminal className="w-3.5 h-3.5" />
            Log Console
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Log Search
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Perform indexed queries and full-text searches across all ingested service logs.
          </p>
        </div>

        {/* Export Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          <button
            onClick={() => handleExport("csv")}
            className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-805 hover:bg-slate-850 hover:border-slate-700 text-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport("json")}
            className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-805 hover:bg-slate-850 hover:border-slate-700 text-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar - Saved Searches */}
        <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-slate-550" />
              Saved Searches
            </h3>
            <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-bold">
              {savedQueries.length}
            </span>
          </div>

          <div className="space-y-2 max-h-[300px] lg:max-h-[500px] overflow-y-auto pr-1">
            {savedQueries.length === 0 ? (
              <p className="text-xs text-slate-600 italic py-4 text-center">
                No saved searches yet. Run a query and click "Save Search" to list here.
              </p>
            ) : (
              savedQueries.map((q) => (
                <div
                  key={q.name}
                  onClick={() => loadSavedQuery(q)}
                  className="flex items-center justify-between gap-3 text-xs bg-slate-900/30 hover:bg-slate-900/60 border border-slate-900 hover:border-slate-800 p-2.5 rounded-lg transition-all cursor-pointer group text-slate-350 hover:text-white"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="font-semibold block truncate text-slate-200 group-hover:text-indigo-400 transition-colors">
                      {q.name}
                    </span>
                    <span className="text-[9px] text-slate-550 font-mono block truncate">
                      {q.query ? `"${q.query}"` : "All logs"}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteSavedQuery(e, q.name)}
                    className="p-1 rounded hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                    title="Delete saved query"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search & Filter Form */}
          <form onSubmit={handleSearch} className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4">
            {/* Search Input Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-555" />
                <input
                  type="text"
                  placeholder="Search log messages (e.g. 'Database timeout', 'Failed transaction', trace ID)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 placeholder:text-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  id="search-trigger-btn"
                  type="submit"
                  disabled={isSearching}
                  className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 px-5 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(true)}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-4 py-2.5 text-xs font-semibold rounded-lg text-slate-350 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Save current search parameters"
                >
                  <Bookmark className="w-4 h-4" />
                  Save Search
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1">
              {/* Service */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Service</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-300 py-2 px-3 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  <option value="all">All Services</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.environment})
                    </option>
                  ))}
                </select>
              </div>

              {/* Environment */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Environment</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-300 py-2 px-3 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  <option value="all">All Environments</option>
                  <option value="prod">Production</option>
                  <option value="staging">Staging</option>
                  <option value="dev">Development</option>
                </select>
              </div>

              {/* Log Level */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Log Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-300 py-2 px-3 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  <option value="all">All Levels</option>
                  <option value="info">INFO</option>
                  <option value="warn">WARN</option>
                  <option value="error">ERROR</option>
                  <option value="debug">DEBUG</option>
                </select>
              </div>

              {/* Time Range */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Time Range</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-300 py-2 px-3 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  <option value="1h">Last Hour</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                </select>
              </div>

              {/* Reset Filters */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 h-9 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              </div>
            </div>
          </form>

          {/* Results Console */}
          <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 bg-slate-900/60 border-b border-slate-900 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <div className="col-span-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                Timestamp
              </div>
              <div className="col-span-1">Level</div>
              <div className="col-span-2">Service</div>
              <div className="col-span-6">Message</div>
            </div>

            {/* Results List */}
            {logs.length === 0 ? (
              <div className="p-16 text-center">
                <Database className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-300 mb-1">No logs found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  No matching log records were found for the selected filter criteria and search query in the last {timeRange === "1h" ? "hour" : timeRange === "24h" ? "24 hours" : "7 days"}.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-900/60 font-mono text-[11px] text-slate-350">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const formattedDate = new Date(log.timestamp).toLocaleString("en-US", {
                    hour12: false,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  return (
                    <div key={log.id} className={`transition-colors ${isExpanded ? "bg-slate-900/20" : "hover:bg-slate-900/10"}`}>
                      {/* Row */}
                      <div
                        onClick={() => toggleLogExpand(log.id)}
                        className="grid grid-cols-12 gap-4 px-6 py-3 items-center cursor-pointer select-none"
                      >
                        <div className="col-span-3 text-slate-500 flex items-center gap-2.5 truncate">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                          {formattedDate}
                        </div>
                        <div className="col-span-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${levelStyles[log.level]}`}>
                            {log.level}
                          </span>
                        </div>
                        <div className="col-span-2 truncate text-slate-400 font-semibold">
                          {log.service ? `${log.service.name} (${log.service.environment})` : "unknown"}
                        </div>
                        <div className="col-span-6 truncate text-slate-200" title={log.message}>
                          {log.message}
                        </div>
                      </div>

                      {/* Expanded Metadata Panel */}
                      {isExpanded && (
                        <div className="px-6 pb-4 pt-1 border-t border-slate-900/40 bg-slate-950/60">
                          <div className="rounded-lg border border-slate-900 bg-slate-950 p-4 relative">
                            {/* Copy & Trace */}
                            <div className="absolute right-3 top-3 flex items-center gap-2">
                              {log.traceId && (
                                <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-indigo-400 px-2 py-0.5 rounded">
                                  Trace ID: {log.traceId}
                                </span>
                              )}
                              <button
                                onClick={() => handleCopyMetadata(log.id, {
                                  message: log.message,
                                  level: log.level,
                                  timestamp: log.timestamp,
                                  service: log.service ? { name: log.service.name, environment: log.service.environment } : null,
                                  traceId: log.traceId,
                                  metadata: log.metadata,
                                })}
                                className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
                                title="Copy JSON Payload"
                              >
                                {copiedLogId === log.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            {/* Details header */}
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-550 mb-2 border-b border-slate-900 pb-1.5">
                              Log Details & Metadata
                            </div>

                            {/* Info grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-slate-400 mb-4 pt-1">
                              <div>
                                <span className="font-semibold text-slate-500">Service:</span>{" "}
                                <span className="font-mono text-slate-350">{log.service ? `${log.service.name} [${log.service.environment}]` : "unknown"}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-500">Log level:</span>{" "}
                                <span className="font-mono text-slate-350 capitalize">{log.level}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-500">Timestamp:</span>{" "}
                                <span className="font-mono text-slate-350">{log.timestamp}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-500">Trace ID:</span>{" "}
                                <span className="font-mono text-slate-350">{log.traceId || "none"}</span>
                              </div>
                            </div>

                            {/* JSON metadata payload */}
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Metadata Object</div>
                              <pre className="text-[11px] bg-slate-950/80 border border-slate-900 rounded p-3 overflow-x-auto text-indigo-300 font-mono">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Search Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-805 rounded-2xl w-full max-w-md shadow-2xl p-6 relative flex flex-col">
            <h3 className="text-lg font-bold text-white mb-1">Save Search Query</h3>
            <p className="text-xs text-slate-400 mb-6">
              Save these query parameters for quick-access shortcuts.
            </p>

            <form onSubmit={handleSaveQuery} className="space-y-4">
              <div>
                <label htmlFor="saveNameInput" className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">
                  Saved Search Name
                </label>
                <input
                  id="saveNameInput"
                  type="text"
                  required
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g. Payment service error spikes"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Current params preview */}
              <div className="bg-slate-950 border border-slate-900 p-3 rounded-lg text-[10px] space-y-1.5 font-mono text-slate-450">
                <span className="block font-bold text-slate-500 uppercase pb-1 border-b border-slate-900">Current Query Filter Parameters</span>
                {query.trim() && <div><span className="text-slate-600">Query:</span> "{query}"</div>}
                <div><span className="text-slate-600">Level:</span> {level}</div>
                <div><span className="text-slate-600">Service:</span> {serviceId === "all" ? "All" : services.find(s => s.id === serviceId)?.name}</div>
                <div><span className="text-slate-600">Env:</span> {environment}</div>
                <div><span className="text-slate-600">Time:</span> {timeRange}</div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuery || !saveName.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer"
                >
                  {isSavingQuery ? "Saving..." : "Save Query"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
