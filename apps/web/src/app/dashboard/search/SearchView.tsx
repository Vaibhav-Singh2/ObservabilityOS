"use client";

import { useState, useEffect } from "react";
import {
  Search as SearchIcon,
  Clock,
  Terminal,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  X,
  RefreshCw,
  Database,
  Download,
  Bookmark,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  metadata: Record<string, unknown>;
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

export default function SearchView({
  project,
  services,
  initialLogs,
  savedQueries: initialSavedQueries,
}: SearchViewProps) {
  const [logs, setLogs] = useState<SerializedLog[]>(initialLogs);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [serviceId, setServiceId] = useState("all");
  const [environment, setEnvironment] = useState("all");
  const [timeRange, setTimeRange] = useState("24h");
  const [isSearching, setIsSearching] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!isLive) return;

    const eventSource = new EventSource(`/api/logs/stream?projectId=${project.id}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "connected" || data.event === "heartbeat") {
          return;
        }

        setLogs((prevLogs) => {
          if (prevLogs.some((l) => l.id === data.id)) return prevLogs;
          // Filter client-side based on currently selected filters in live view
          if (level !== "all" && data.level !== level) return prevLogs;
          if (serviceId !== "all" && data.service?.id !== serviceId) return prevLogs;
          if (environment !== "all" && data.service?.environment !== environment) return prevLogs;
          if (query.trim() && !data.message.toLowerCase().includes(query.toLowerCase())) return prevLogs;

          return [data, ...prevLogs.slice(0, 99)];
        });
      } catch (err) {
        console.error("Error parsing streaming log data:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      eventSource.close();
      setIsLive(false);
    };

    return () => {
      eventSource.close();
    };
  }, [isLive, project.id, level, serviceId, environment, query]);

  // Saved searches states
  const [savedQueries, setSavedQueries] =
    useState<SavedQuery[]>(initialSavedQueries);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSavingQuery, setIsSavingQuery] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLive(false); // Stop live streaming on manual query search
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

  const handleCopyMetadata = (logId: string, metadata: Record<string, unknown>) => {
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
    if (!confirm(`Are you sure you want to delete the saved search "${name}"?`))
      return;

    try {
      const res = await fetch(
        `/api/projects/saved-queries?projectId=${project.id}&queryName=${encodeURIComponent(name)}`,
        { method: "DELETE" },
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
    const link = document.createElement("a");
    link.href = `/api/logs/export?${params.toString()}`;
    link.setAttribute("download", "");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            Perform indexed queries and full-text searches across all ingested
            service logs.
          </p>
        </div>

        {/* Export Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport("csv")}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport("json")}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar - Saved Searches */}
        <div className="bg-slate-955 border border-slate-900 rounded-xl p-5 space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-slate-500" />
              Saved Searches
            </h3>
            <Badge variant="secondary">{savedQueries.length}</Badge>
          </div>

          <div className="space-y-2 max-h-75 lg:max-h-125 overflow-y-auto pr-1">
            {savedQueries.length === 0 ? (
              <p className="text-xs text-slate-600 italic py-4 text-center">
                No saved searches yet. Run a query and click &quot;Save Search&quot; to
                list here.
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
                    <span className="text-[9px] text-slate-500 font-mono block truncate">
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
          <form
            onSubmit={handleSearch}
            className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4"
          >
            {/* Search Input Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search log messages (e.g. 'Database timeout', 'Failed transaction', trace ID)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  id="search-trigger-btn"
                  type="submit"
                  disabled={isSearching}
                  className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  {isSearching ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <SearchIcon className="w-4 h-4 mr-1" />
                  )}
                  Search
                </Button>
                <Button
                  type="button"
                  variant={isLive ? "default" : "outline"}
                  onClick={() => setIsLive(!isLive)}
                  className={`flex-1 sm:flex-initial font-bold transition-all relative ${
                    isLive
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
                      : "text-slate-350 hover:text-white"
                  }`}
                  title={isLive ? "Pause Live Feed" : "Start Live Feed"}
                >
                  <span
                    className={`w-2 h-2 rounded-full mr-2 shrink-0 ${
                      isLive ? "bg-white animate-pulse" : "bg-emerald-500"
                    }`}
                  />
                  {isLive ? "Live Streaming..." : "Go Live"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSaveModalOpen(true)}
                  title="Save current search parameters"
                >
                  <Bookmark className="w-4 h-4 mr-1.5" />
                  Save Search
                </Button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1">
              {/* Service */}
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500">Service</Label>
                <Select
                  value={serviceId}
                  onValueChange={(val) => setServiceId(val)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="All Services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.environment})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Environment */}
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500">
                  Environment
                </Label>
                <Select
                  value={environment}
                  onValueChange={(val) => setEnvironment(val)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="All Environments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Environments</SelectItem>
                    <SelectItem value="prod">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="dev">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Log Level */}
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500">Log Level</Label>
                <Select value={level} onValueChange={(val) => setLevel(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="info">INFO</SelectItem>
                    <SelectItem value="warn">WARN</SelectItem>
                    <SelectItem value="error">ERROR</SelectItem>
                    <SelectItem value="debug">DEBUG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Range */}
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500">Time Range</Label>
                <Select
                  value={timeRange}
                  onValueChange={(val) => setTimeRange(val)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Last 24 Hours" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Filters */}
              <div className="space-y-1.5">
                <Label className="text-[10px] opacity-0 select-none block">
                  Reset
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="w-full text-xs font-semibold h-9"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Reset Filters
                </Button>
              </div>
            </div>
          </form>

          {/* Results Console */}
          <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 bg-slate-900/60 border-b border-slate-900 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <div className="col-span-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-650" />
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
                <h3 className="text-sm font-bold text-slate-300 mb-1">
                  No logs found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  No matching log records were found for the selected filter
                  criteria and search query in the last{" "}
                  {timeRange === "1h"
                    ? "hour"
                    : timeRange === "24h"
                      ? "24 hours"
                      : "7 days"}
                  .
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-900/60 font-mono text-[11px] text-slate-350">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const formattedDate = new Date(log.timestamp).toLocaleString(
                    "en-US",
                    {
                      hour12: false,
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    },
                  );

                  return (
                    <div
                      key={log.id}
                      className={`transition-colors ${isExpanded ? "bg-slate-900/20" : "hover:bg-slate-900/10"}`}
                    >
                      {/* Row */}
                      <div
                        onClick={() => toggleLogExpand(log.id)}
                        className="grid grid-cols-12 gap-4 px-6 py-3 items-center cursor-pointer select-none"
                      >
                        <div className="col-span-3 text-slate-500 flex items-center gap-2.5 truncate">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          )}
                          {formattedDate}
                        </div>
                        <div className="col-span-1">
                          <Badge
                            variant={
                              log.level === "error"
                                ? "destructive"
                                : log.level === "warn"
                                  ? "warning"
                                  : log.level === "info"
                                    ? "default"
                                    : "outline"
                            }
                            className="text-[9px] font-bold"
                          >
                            {log.level}
                          </Badge>
                        </div>
                        <div className="col-span-2 truncate text-slate-400 font-semibold">
                          {log.service
                            ? `${log.service.name} (${log.service.environment})`
                            : "unknown"}
                        </div>
                        <div
                          className="col-span-6 truncate text-slate-200"
                          title={log.message}
                        >
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
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-mono text-indigo-400"
                                >
                                  Trace ID: {log.traceId}
                                </Badge>
                              )}
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleCopyMetadata(log.id, {
                                    message: log.message,
                                    level: log.level,
                                    timestamp: log.timestamp,
                                    service: log.service
                                      ? {
                                          name: log.service.name,
                                          environment: log.service.environment,
                                        }
                                      : null,
                                    traceId: log.traceId,
                                    metadata: log.metadata,
                                  })
                                }
                                title="Copy JSON Payload"
                              >
                                {copiedLogId === log.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </div>

                            {/* Details header */}
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 border-b border-slate-900 pb-1.5">
                              Log Details & Metadata
                            </div>

                            {/* Info grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-slate-400 mb-4 pt-1">
                              <div>
                                <span className="font-semibold text-slate-500 font-sans">
                                  Service:
                                </span>{" "}
                                <span className="font-mono text-slate-350">
                                  {log.service
                                    ? `${log.service.name} [${log.service.environment}]`
                                    : "unknown"}
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-500 font-sans">
                                  Log level:
                                </span>{" "}
                                <span className="font-mono text-slate-350 capitalize">
                                  {log.level}
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-500 font-sans">
                                  Timestamp:
                                </span>{" "}
                                <span className="font-mono text-slate-350">
                                  {log.timestamp}
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-500 font-sans">
                                  Trace ID:
                                </span>{" "}
                                <span className="font-mono text-slate-350">
                                  {log.traceId || "none"}
                                </span>
                              </div>
                            </div>

                            {/* JSON metadata payload */}
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Metadata Object
                              </div>
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
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Search Query</DialogTitle>
            <DialogDescription>
              Save these query parameters for quick-access shortcuts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveQuery}>
            <div className="space-y-4 my-4">
              <div className="space-y-2">
                <Label htmlFor="saveNameInput">Saved Search Name</Label>
                <Input
                  id="saveNameInput"
                  type="text"
                  required
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g. Payment service error spikes"
                />
              </div>

              {/* Current params preview */}
              <div className="bg-slate-950 border border-slate-900 p-3 rounded-lg text-[10px] space-y-1.5 font-mono text-slate-400">
                <span className="block font-bold text-slate-500 uppercase pb-1 border-b border-slate-900">
                  Current Query Filter Parameters
                </span>
                {query.trim() && (
                  <div>
                    <span className="text-slate-650">Query:</span> &quot;{query}&quot;
                  </div>
                )}
                <div>
                  <span className="text-slate-650">Level:</span> {level}
                </div>
                <div>
                  <span className="text-slate-650">Service:</span>{" "}
                  {serviceId === "all"
                    ? "All"
                    : services.find((s) => s.id === serviceId)?.name}
                </div>
                <div>
                  <span className="text-slate-650">Env:</span> {environment}
                </div>
                <div>
                  <span className="text-slate-650">Time:</span> {timeRange}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsSaveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingQuery || !saveName.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                {isSavingQuery ? "Saving..." : "Save Query"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
