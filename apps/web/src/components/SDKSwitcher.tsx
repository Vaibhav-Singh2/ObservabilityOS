"use client";

import { useState } from "react";
import { Terminal, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const SDK_DATA = {
  nodejs: {
    label: "Node.js SDK",
    filename: "server.js",
    lang: "javascript",
    code: `// Install SDK
// npm install observability-os

import { Observability } from "observability-os";

const obs = new Observability({
  apiKey: process.env.OBS_API_KEY,
  serviceName: "payment-service",
  environment: "production",
});

// Logs are automatically buffered and scrubbed of PII
obs.info("Payment processed successfully", {
  userId: "user_98234",
  amount: 49.00,
  gateway: "stripe"
});`
  },
  nextjs: {
    label: "Next.js",
    filename: "instrumentation.ts",
    lang: "typescript",
    code: `// Install SDK
// npm install observability-os

// Setup Next.js instrumentation file
import { initObservability } from "observability-os/next";

export function register() {
  initObservability({
    apiKey: process.env.OBS_API_KEY,
    serviceName: "nextjs-storefront",
    environment: process.env.NODE_ENV,
    scrubHeaders: ["authorization", "cookie"], // Auto-PII scrubbing
  });
}`
  },
  express: {
    label: "Express.js",
    filename: "app.js",
    lang: "javascript",
    code: `// Install SDK
// npm install express observability-os

const express = require("express");
const { expressMiddleware } = require("observability-os/express");

const app = express();

// Intercept requests and forward telemetry
app.use(expressMiddleware({
  apiKey: process.env.OBS_API_KEY,
  serviceName: "auth-service",
}));

app.get("/api/session", (req, res) => {
  res.status(200).json({ ok: true });
});`
  },
  docker: {
    label: "Docker Sidecar",
    filename: "docker-compose.yml",
    lang: "yaml",
    code: `# Run ObservabilityOS Agent as a sidecar
version: "3.8"
services:
  web:
    image: node:20
    # ... your web container configuration
    
  observability-agent:
    image: public.ecr.aws/observability-os/agent:latest
    restart: always
    environment:
      - OBS_API_KEY=\${OBS_API_KEY}
      - ENVIRONMENT=production
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /var/log/nginx:/var/log/app-logs:ro`
  }
};

type SDKKey = keyof typeof SDK_DATA;

export default function SDKSwitcher() {
  const [activeTab, setActiveTab] = useState<SDKKey>("nodejs");
  const [copied, setCopied] = useState(false);

  const activeSdk = SDK_DATA[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSdk.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
      {/* Switcher Header tabs */}
      <div className="flex items-center justify-between border-b border-slate-900 bg-slate-900/40 px-4 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {(Object.keys(SDK_DATA) as SDKKey[]).map((key) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key);
                setCopied(false);
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap",
                activeTab === key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80"
              )}
            >
              {SDK_DATA[key].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono select-none pl-4">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span>{activeSdk.filename}</span>
        </div>
      </div>

      {/* Code Container */}
      <div className="relative p-6 bg-slate-950/80 font-mono text-[13px] leading-relaxed text-slate-300 overflow-x-auto min-h-55">
        <button
          onClick={handleCopy}
          className="absolute top-4 right-4 p-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
          aria-label="Copy code snippet"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>

        <pre className="whitespace-pre overflow-x-auto font-mono text-left select-text">
          <code>{activeSdk.code}</code>
        </pre>
      </div>
    </div>
  );
}
