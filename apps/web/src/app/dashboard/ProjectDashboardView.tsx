"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Eye, EyeOff, Plus, Terminal, Activity, Server, Layers, Calendar, GitBranch, GitCommit } from "lucide-react";

interface SerializedService {
  id: string;
  name: string;
  environment: "prod" | "staging" | "dev";
  createdAt: string;
  totalLogs: number;
  errorRate: number;
  availability: number;
  avgLatency: number | null;
  healthStatus: "healthy" | "warning" | "incident";
}

interface SerializedDeployment {
  id: string;
  serviceId: string;
  serviceName: string;
  commitSha: string;
  commitMessage: string;
  branch: string;
  environment: "prod" | "staging" | "dev";
  deployedAt: string | null;
}

interface ProjectDashboardViewProps {
  project: {
    id: string;
    name: string;
    apiKey: string;
  };
  services: SerializedService[];
  deployments: SerializedDeployment[];
}

function formatDate(dateString: string) {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "N/A";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeAgo(dateString: string | null) {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "N/A";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function ProjectDashboardView({ project, services, deployments = [] }: ProjectDashboardViewProps) {

  const router = useRouter();
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [environment, setEnvironment] = useState<"prod" | "staging" | "dev">("dev");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sdkTab, setSdkTab] = useState<"basic" | "multi" | "deploy">("basic");


  const endpointUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}/api/ingest`
    : "http://localhost:3000/api/ingest";

  const handleCopyKey = () => {
    navigator.clipboard.writeText(project.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          name: serviceName.trim(),
          environment,
        }),
      });

      if (res.ok) {
        setServiceName("");
        setEnvironment("dev");
        setIsModalOpen(false);
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to create service");
      }
    } catch (e) {
      console.error(e);
      alert("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Page Title & Ingestion Card */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{project.name}</h1>
            <p className="text-sm text-slate-400">Configure client SDK and manage services for this project.</p>
          </div>

          {/* Credentials Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Ingestion Configuration</h2>
            
            <div className="space-y-4">
              {/* Endpoint URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Ingestion Endpoint</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-330 select-all truncate">
                    {endpointUrl}
                  </div>
                  <button
                    onClick={handleCopyUrl}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">API Ingestion Key</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 select-all truncate flex items-center justify-between">
                    <span>
                      {showKey ? project.apiKey : "••••••••••••••••••••••••••••••••••••••••••••••••"}
                    </span>
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="text-slate-500 hover:text-slate-300 ml-2"
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={handleCopyKey}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Integration card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800/60 pb-2.5">
              <div className="flex items-center gap-2 text-indigo-400">
                <Terminal className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">SDK Setup</h3>
              </div>
              <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSdkTab("basic")}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    sdkTab === "basic" ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Basic
                </button>
                <button
                  type="button"
                  onClick={() => setSdkTab("multi")}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    sdkTab === "multi" ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Multi
                </button>
                <button
                  type="button"
                  onClick={() => setSdkTab("deploy")}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    sdkTab === "deploy" ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Git Deploy
                </button>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              {sdkTab === "basic" 
                ? "Install the SDK and configure a default service name to start routing logs:" 
                : sdkTab === "multi"
                ? "Override the service per log or instantiate separate loggers for different components:"
                : "Notify ObservabilityOS of new releases to correlate errors with deployments:"}
            </p>

            {sdkTab === "basic" && (
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[10px] font-mono text-indigo-300 whitespace-pre-wrap break-all mb-4 select-all">
{`import { Logger } from "@repo/sdk";

const logger = new Logger({
  apiKey: "${project.apiKey.slice(0, 10)}...",
  endpoint: "${endpointUrl}",
  // Required default service name
  defaultService: "main-api"
});

logger.info("Service started successfully");`}
              </pre>
            )}

            {sdkTab === "multi" && (
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[10px] font-mono text-indigo-300 whitespace-pre-wrap break-all mb-4 select-all">
{`import { Logger } from "@repo/sdk";

const logger = new Logger({
  apiKey: "${project.apiKey.slice(0, 10)}...",
  endpoint: "${endpointUrl}",
  defaultService: "main-api"
});

// 1. Override service dynamically:
logger.info("Order processed", {
  service: "payment-service",
  metadata: { amount: 99.99 }
});

// 2. Or create a dedicated instance:
const authLogger = new Logger({
  apiKey: "${project.apiKey.slice(0, 10)}...",
  defaultService: "auth-service"
});`}
              </pre>
            )}

            {sdkTab === "deploy" && (
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[10px] font-mono text-indigo-300 whitespace-pre-wrap break-all mb-4 select-all">
{`# Send release webhook in CI/CD pipeline:
curl -X POST "${endpointUrl.replace('/api/ingest', '/api/webhooks/github')}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${project.apiKey.slice(0, 10)}..." \\
  -d '{
    "service": "main-api",
    "environment": "prod",
    "commitSha": "sha256...",
    "commitMessage": "Release production v1.0",
    "branch": "main"
  }'`}
              </pre>
            )}
          </div>
          <span className="text-[10px] text-slate-500">
            {sdkTab === "deploy"
              ? "Ensure the commit SHA is passed when deploying."
              : "For monorepo projects, run "}<code className="font-mono text-slate-400">{sdkTab === "deploy" ? "POST /api/webhooks/github" : "yarn add @repo/sdk"}</code>.
          </span>
        </div>
      </section>

      {/* Services List Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Monitored Services</h2>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 font-semibold">
              {services.length}
            </span>
          </div>

          <button
            id="add_service_btn"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 h-8.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        </div>

        {services.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-2xl mx-auto">
            <Layers className="w-10 h-10 text-slate-600 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-300 mb-1">No services registered</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
              Services are automatically registered as logs are ingested, or you can register your service names manually beforehand.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register Service Manually
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              const healthColors = {
                healthy: {
                  bg: "bg-emerald-500",
                  ping: "bg-emerald-400",
                  text: "text-emerald-400",
                  label: "Healthy"
                },
                warning: {
                  bg: "bg-amber-500",
                  ping: "bg-amber-400",
                  text: "text-amber-400",
                  label: "Warning"
                },
                incident: {
                  bg: "bg-rose-500",
                  ping: "bg-rose-400",
                  text: "text-rose-400",
                  label: "Incident"
                }
              };
              const health = healthColors[service.healthStatus] || healthColors.healthy;

              return (
                <div
                  key={service.id}
                  onClick={() => router.push(`/dashboard/services/${service.id}?projectId=${project.id}`)}
                  className="bg-slate-900/50 border border-slate-900 hover:border-indigo-500/40 rounded-xl p-5 transition-all duration-200 cursor-pointer hover:bg-slate-900/80 group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${health.ping}`} />
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${health.bg}`} />
                      </span>
                      <h3 className="text-sm font-bold text-white truncate max-w-[130px] group-hover:text-indigo-400 transition-colors">{service.name}</h3>
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        service.environment === "prod"
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                          : service.environment === "staging"
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {service.environment}
                    </span>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-3 gap-2 border-t border-b border-slate-800/60 py-3 mb-3">
                    <div className="text-center">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Uptime</span>
                      <span className={`text-xs font-mono font-bold ${
                        service.totalLogs === 0 
                          ? "text-slate-400"
                          : service.availability >= 99 
                          ? "text-emerald-400" 
                          : service.availability >= 95 
                          ? "text-amber-400" 
                          : "text-rose-400"
                      }`}>
                        {service.totalLogs === 0 ? "100.0%" : `${service.availability.toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="text-center border-l border-r border-slate-800/60">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Error Rate</span>
                      <span className={`text-xs font-mono font-bold ${
                        service.totalLogs === 0 
                          ? "text-slate-400"
                          : service.errorRate > 5 
                          ? "text-rose-400" 
                          : service.errorRate > 1 
                          ? "text-amber-400" 
                          : "text-emerald-400"
                      }`}>
                        {service.totalLogs === 0 ? "0.0%" : `${service.errorRate.toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Avg Latency</span>
                      <span className={`text-xs font-mono font-bold ${
                        service.avgLatency === null 
                          ? "text-slate-550" 
                          : service.avgLatency > 500 
                          ? "text-rose-400" 
                          : service.avgLatency > 200 
                          ? "text-amber-400" 
                          : "text-emerald-400"
                      }`}>
                        {service.avgLatency === null ? "—" : `${service.avgLatency}ms`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2.5 text-xs text-slate-500">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Created: {formatDate(service.createdAt)}</span>
                      </div>
                      <span className="text-[10px] text-slate-650 font-mono">{service.totalLogs} logs</span>
                    </div>

                    {service.totalLogs === 0 ? (
                      <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium bg-slate-950/40 border border-slate-900/60 rounded px-2 py-1">
                        <Activity className="w-3.5 h-3.5 text-slate-600" />
                        <span>Awaiting incoming streams</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[11px] font-semibold bg-slate-950/60 border border-slate-900 rounded px-2 py-1 justify-between">
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                          <span className={health.text}>{health.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">Active streams</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Releases & Deployments Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <GitBranch className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Recent Releases & Deployments</h2>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 font-semibold">
              {deployments.length}
            </span>
          </div>
        </div>

        {deployments.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-2xl mx-auto">
            <GitCommit className="w-10 h-10 text-slate-600 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-300 mb-1">No tracked deployments</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Log code deployments in your CI/CD pipeline to immediately correlate error spikes and latency regressions with code changes.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/20 border border-slate-905 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Release Commit / Branch</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Environment</th>
                    <th className="py-3 px-4 text-right">Deployed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 bg-slate-950/20">
                  {deployments.map((deploy) => (
                    <tr key={deploy.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex flex-col gap-0.5 max-w-xs md:max-w-md lg:max-w-xl">
                          <span className="font-semibold text-slate-200 truncate">{deploy.commitMessage}</span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-850/60 text-slate-400">
                              {deploy.commitSha.slice(0, 7)}
                            </span>
                            <span className="flex items-center gap-1">
                              <GitBranch className="w-3 h-3 text-slate-600" />
                              {deploy.branch}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">
                        {deploy.serviceName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            deploy.environment === "prod"
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-450"
                              : deploy.environment === "staging"
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-450"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-450"
                          }`}
                        >
                          {deploy.environment}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-450 font-medium">
                        <div className="flex flex-col items-end font-sans">
                          <span>{timeAgo(deploy.deployedAt)}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {deploy.deployedAt ? new Date(deploy.deployedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Register Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-1">Register Service</h3>
            <p className="text-xs text-slate-400 mb-6">
              Establish a new target service environment for your log streams.
            </p>

            <form onSubmit={handleCreateService}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="serviceName" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Service Name
                  </label>
                  <input
                    id="serviceName"
                    type="text"
                    required
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="e.g. payment-gateway"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Environment
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {["dev", "staging", "prod"].map((env) => (
                      <button
                        key={env}
                        type="button"
                        onClick={() => setEnvironment(env as any)}
                        className={`py-2 rounded-lg border text-xs font-semibold capitalize transition-all cursor-pointer ${
                          environment === env
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {env}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="create_service_submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? "Registering..." : "Register Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
