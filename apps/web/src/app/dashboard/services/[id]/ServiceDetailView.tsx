"use client";

import { useState, useEffect, useRef } from "react";
import NextLink from "next/link";
import { 
  ArrowLeft, 
  Cpu, 
  HardDrive, 
  Clock, 
  GitBranch, 
  GitCommit, 
  AlertCircle, 
  CheckCircle2, 
  Activity, 
  RefreshCw 
} from "lucide-react";

interface ServiceProps {
  id: string;
  name: string;
  environment: "prod" | "staging" | "dev";
  createdAt: string;
}

interface DeploymentProps {
  id: string;
  commitSha: string;
  commitMessage: string;
  branch: string;
  deployedAt: string | null;
}

interface IncidentProps {
  id: string;
  title: string;
  status: "open" | "investigating" | "resolved";
  createdAt: string;
  confidence: number;
}

interface ServiceDetailProps {
  projectId: string;
  service: ServiceProps;
  deployments: DeploymentProps[];
  incidents: IncidentProps[];
}

interface MetricPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  memoryLimit: number;
  latency: number;
}

export default function ServiceDetailView({ 
  projectId, 
  service, 
  deployments, 
  incidents 
}: ServiceDetailProps) {
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d">("24h");
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const activeIncidents = incidents.filter(i => i.status !== "resolved");
  const isHealthy = activeIncidents.length === 0;

  useEffect(() => {
    let active = true;
    async function loadMetrics() {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/metrics/query?projectId=${projectId}&serviceId=${service.id}&timeRange=${timeRange}`
        );
        const data = await res.json();
        if (!active) return;
        if (res.ok) {
          setMetrics(data.metrics || []);
        } else {
          setError(data.error?.message || "Failed to load metrics");
        }
      } catch (err) {
        if (active) {
          setError("Failed to communicate with metrics server");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadMetrics();
    return () => {
      active = false;
    };
  }, [timeRange, projectId, service.id]);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <NextLink
          href={`/dashboard?projectId=${projectId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </NextLink>
      </div>

      {/* Service Header Info */}
      <div className="p-6 rounded-2xl border border-slate-900 bg-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                service.environment === "prod"
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-450"
                  : service.environment === "staging"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-450"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-450"
              }`}
            >
              {service.environment}
            </span>
            <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              Service
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isHealthy ? "bg-emerald-400" : "bg-rose-400"}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isHealthy ? "bg-emerald-500" : "bg-rose-500"}`} />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{service.name}</h1>
          </div>
        </div>

        {/* Time Selector */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs self-start md:self-center shrink-0">
          {(["1h", "24h", "7d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                timeRange === r 
                  ? "bg-indigo-600 text-white shadow" 
                  : "text-slate-450 hover:text-slate-200"
              }`}
            >
              {r === "1h" ? "1 Hour" : r === "24h" ? "24 Hours" : "7 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Charts Console */}
      {isLoading ? (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-3 min-h-[300px]">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-450">Loading timeseries metrics metrics...</p>
        </div>
      ) : error ? (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-3 min-h-[300px] text-rose-400">
          <AlertCircle className="w-8 h-8" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : metrics.length === 0 ? (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-4 min-h-[300px]">
          <Activity className="w-10 h-10 text-slate-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-350 mb-1">No Metrics Data Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              We haven't received any CPU, memory, or latency metrics for this service during this period. Ingest metrics to see statistics.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CPU utilization */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Cpu className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">CPU Usage</h3>
            </div>
            <SVGMetricChart data={metrics} type="cpu" color="indigo" unit="%" />
          </div>

          {/* Memory Utilization */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <HardDrive className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Memory Usage</h3>
            </div>
            <SVGMetricChart data={metrics} type="memory" color="amber" unit="MB" />
          </div>

          {/* Latency statistics */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-450">
              <Clock className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Response Latency</h3>
            </div>
            <SVGMetricChart data={metrics} type="latency" color="emerald" unit="ms" />
          </div>
        </div>
      )}

      {/* History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Releases */}
        <section className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-900">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            Recent Service Deployments
          </h2>
          {deployments.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4">No deployments recorded for this service.</p>
          ) : (
            <div className="space-y-4">
              {deployments.map((d) => (
                <div key={d.id} className="flex items-start gap-3 text-xs bg-slate-900/40 border border-slate-900 p-3 rounded-lg hover:border-slate-800 transition-colors">
                  <GitCommit className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold text-slate-200 truncate">{d.commitMessage}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span className="font-mono bg-slate-950 px-1 py-0.5 rounded border border-slate-800/80 text-slate-400">{d.commitSha.slice(0, 7)}</span>
                      <span>Branch: {d.branch}</span>
                      <span>{d.deployedAt ? new Date(d.deployedAt).toLocaleString() : ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Incidents */}
        <section className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-900">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            Recent Service Incidents
          </h2>
          {incidents.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4">No incidents detected for this service.</p>
          ) : (
            <div className="space-y-4">
              {incidents.map((i) => {
                const statusColor = 
                  i.status === "open"
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    : i.status === "investigating"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-450"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-450";
                return (
                  <NextLink 
                    key={i.id} 
                    href={`/dashboard/incidents/${i.id}?projectId=${projectId}`}
                    className="flex items-start justify-between gap-3 text-xs bg-slate-900/40 border border-slate-900 p-3 rounded-lg hover:border-slate-800 transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors truncate">{i.title}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span>Confidence: {Math.round(i.confidence * 100)}%</span>
                        <span>{new Date(i.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${statusColor}`}>
                      {i.status}
                    </span>
                  </NextLink>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

interface ChartProps {
  data: MetricPoint[];
  type: "cpu" | "memory" | "latency";
  color: "indigo" | "amber" | "emerald";
  unit: string;
}

function SVGMetricChart({ data, type, color, unit }: ChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: number; time: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const values = data.map((d) => d[type]);
  const minValue = 0;
  // Pad the max value so chart is scaled properly
  const dataMax = Math.max(...values, 1);
  const maxValue = type === "cpu" ? 100 : dataMax * 1.15;

  const width = 500;
  const height = 180;
  const padding = { top: 15, right: 15, bottom: 25, left: 40 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Generate SVG coordinate points
  const points = data.map((pt, i) => {
    const val = pt[type];
    const x = padding.left + (i / Math.max(1, data.length - 1)) * plotWidth;
    const y = padding.top + plotHeight - ((val - minValue) / (maxValue - minValue)) * plotHeight;
    return { x, y, val, time: new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
  });

  const linePath = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
    : "";

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${padding.top + plotHeight} Z`
    : "";

  const colorThemes = {
    indigo: {
      stroke: "#6366f1",
      fill: "url(#grad-indigo)",
      gradient: (
        <linearGradient id="grad-indigo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0"/>
        </linearGradient>
      )
    },
    amber: {
      stroke: "#f59e0b",
      fill: "url(#grad-amber)",
      gradient: (
        <linearGradient id="grad-amber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0"/>
        </linearGradient>
      )
    },
    emerald: {
      stroke: "#10b981",
      fill: "url(#grad-emerald)",
      gradient: (
        <linearGradient id="grad-emerald" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
        </linearGradient>
      )
    }
  };

  const theme = colorThemes[color];

  // Mouse move event tracker to trigger tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Scaling factor from real mouse coordinates to SVG viewBox coords
    const svgMouseX = (mouseX / rect.width) * width;

    // Find nearest point
    let nearest = points[0];
    let minDiff = Math.abs(points[0].x - svgMouseX);

    for (let i = 1; i < points.length; i++) {
      const diff = Math.abs(points[i].x - svgMouseX);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = points[i];
      }
    }

    setHoveredPoint(nearest);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const yTicks = [
    minValue,
    minValue + (maxValue - minValue) * 0.33,
    minValue + (maxValue - minValue) * 0.66,
    maxValue
  ];

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none cursor-crosshair overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>{theme.gradient}</defs>

        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = padding.top + plotHeight - ((tick - minValue) / (maxValue - minValue)) * plotHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#1e293b"
                strokeWidth="0.8"
                strokeDasharray={i === 0 || i === yTicks.length - 1 ? "0" : "4 4"}
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                fill="#64748b"
                fontSize="9"
                fontWeight="600"
                fontFamily="monospace"
                textAnchor="end"
              >
                {Math.round(tick)}
                {i === yTicks.length - 1 ? unit : ""}
              </text>
            </g>
          );
        })}

        {/* Ingested metrics path rendering */}
        {points.length > 0 && (
          <>
            <path d={areaPath} fill={theme.fill} />
            <path d={linePath} fill="none" stroke={theme.stroke} strokeWidth="1.8" />
            
            {/* Draw single boundary circle markers if data set is very small */}
            {data.length <= 15 && points.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r="3"
                fill="#0f172a"
                stroke={theme.stroke}
                strokeWidth="1.5"
              />
            ))}
          </>
        )}

        {/* Hover elements */}
        {hoveredPoint && (
          <>
            <line
              x1={hoveredPoint.x}
              y1={padding.top}
              x2={hoveredPoint.x}
              y2={padding.top + plotHeight}
              stroke="#475569"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="4.5"
              fill={theme.stroke}
              stroke="#0f172a"
              strokeWidth="2"
            />
          </>
        )}

        {/* X Axis Time Labels */}
        {points.length > 1 && (
          <>
            {/* Start label */}
            <text
              x={points[0].x}
              y={height - 8}
              fill="#64748b"
              fontSize="9"
              fontFamily="sans-serif"
              textAnchor="start"
            >
              {points[0].time}
            </text>
            {/* Middle label */}
            <text
              x={points[Math.floor(points.length / 2)].x}
              y={height - 8}
              fill="#64748b"
              fontSize="9"
              fontFamily="sans-serif"
              textAnchor="middle"
            >
              {points[Math.floor(points.length / 2)].time}
            </text>
            {/* End label */}
            <text
              x={points[points.length - 1].x}
              y={height - 8}
              fill="#64748b"
              fontSize="9"
              fontFamily="sans-serif"
              textAnchor="end"
            >
              {points[points.length - 1].time}
            </text>
          </>
        )}
      </svg>

      {/* Floating HTML tooltip */}
      {hoveredPoint && (
        <div 
          className="absolute z-10 bg-slate-900 border border-slate-800/80 rounded-lg p-2 text-[10px] pointer-events-none shadow-xl flex flex-col gap-0.5 animate-fade-in"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100 - 35}%`,
            transform: "translateX(-50%)",
          }}
        >
          <span className="font-mono text-slate-550">{hoveredPoint.time}</span>
          <span className="font-bold text-white font-mono">
            {hoveredPoint.val.toFixed(1)} {unit}
          </span>
        </div>
      )}
    </div>
  );
}
