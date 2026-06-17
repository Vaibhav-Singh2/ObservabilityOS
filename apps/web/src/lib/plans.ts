export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface PlanDetails {
  id: string; // e.g. 'free', 'pro', 'self-host'
  name: string;
  priceUSD: number;
  priceINR: number;
  description: string;
  badge?: string;
  backendPlan: "free" | "pro" | "self-host";
  maxServices: number;
  maxLogVolumeBytes: number;
  retentionDays: number;
  features: PlanFeature[];
  available: boolean;
}

export const PLANS: PlanDetails[] = [
  {
    id: "free",
    name: "Free Developer",
    priceUSD: 0,
    priceINR: 0,
    description: "Side projects & local testing at zero cost.",
    backendPlan: "free",
    maxServices: 1,
    maxLogVolumeBytes: 500 * 1024 * 1024, // 500MB
    retentionDays: 7,
    features: [
      { text: "1 service monitored", included: true },
      { text: "500MB logs / month", included: true },
      { text: "7-day data retention", included: true },
      { text: "Real-time dashboard with service health & SLO", included: true },
      {
        text: "Full-text log search with filters (level, service, time)",
        included: true,
      },
      { text: "Saved log queries", included: true },
      { text: "CSV & JSON log export", included: true },
      { text: "Zero-dep TypeScript SDK with PII redaction", included: true },
      { text: "OpenTelemetry native OTLP HTTP support", included: true },
      { text: "GitHub deploy webhook tracking", included: true },
      { text: "Base Z-score anomaly detection", included: true },
      {
        text: "Incident list & detail views with threaded comments",
        included: true,
      },
      { text: "Shared runbooks", included: true },
      { text: "Incident simulation playground (8 scenarios)", included: true },
      { text: "SSE real-time monitoring stream", included: true },
      { text: "Multi-channel alerts (Slack, Discord, Teams)", included: false },
      { text: "AI incident root cause analysis", included: false },
      { text: "AI-powered post-mortem generation", included: false },
      { text: "AI morning digest emails", included: false },
      { text: "Multi-signal anomaly correlation", included: false },
      { text: "Audit log trail", included: false },
      { text: "Team members & collaboration", included: false },
    ],
    available: true,
  },
  {
    id: "pro",
    name: "Pro Cloud",
    priceUSD: 29,
    priceINR: 2499,
    description: "Production intelligence for solo developers & small teams.",
    badge: "Most Popular",
    backendPlan: "pro",
    maxServices: 10,
    maxLogVolumeBytes: 10 * 1024 * 1024 * 1024, // 10GB
    retentionDays: 30,
    features: [
      { text: "Up to 10 services monitored", included: true },
      { text: "10GB logs / month", included: true },
      { text: "30-day data retention", included: true },
      { text: "Real-time dashboard with service health & SLO", included: true },
      {
        text: "Full-text log search with filters (level, service, time)",
        included: true,
      },
      { text: "Saved log queries", included: true },
      { text: "CSV & JSON log export", included: true },
      { text: "Zero-dep TypeScript SDK with PII redaction", included: true },
      { text: "OpenTelemetry native OTLP HTTP support", included: true },
      { text: "GitHub deploy webhook tracking", included: true },
      { text: "Multi-signal anomaly correlation", included: true },
      {
        text: "Incident list & detail views with threaded comments",
        included: true,
      },
      { text: "Shared runbooks", included: true },
      { text: "Incident simulation playground (8 scenarios)", included: true },
      { text: "SSE real-time monitoring stream", included: true },
      { text: "Multi-channel alerts (Slack, Discord, Teams)", included: true },
      { text: "AI incident root cause analysis", included: true },
      { text: "AI-powered post-mortem generation", included: true },
      { text: "AI morning digest emails", included: true },
      { text: "Audit log trail", included: true },
      { text: "Team members & collaboration", included: true },
    ],
    available: true,
  },
  {
    id: "self-host",
    name: "Self-Host Open Source",
    priceUSD: 0,
    priceINR: 0,
    description:
      "Run ObservabilityOS on your own infrastructure with full access.",
    backendPlan: "self-host",
    maxServices: 999999, // Practically Unlimited
    maxLogVolumeBytes: 999999 * 1024 * 1024 * 1024, // Practically Unlimited
    retentionDays: 9999, // User controls their own retention
    features: [
      { text: "Unlimited services monitored", included: true },
      { text: "Unlimited logs / month", included: true },
      { text: "Unlimited data retention", included: true },
      { text: "Real-time dashboard with service health & SLO", included: true },
      {
        text: "Full-text log search with filters (level, service, time)",
        included: true,
      },
      { text: "Saved log queries", included: true },
      { text: "CSV & JSON log export", included: true },
      { text: "Zero-dep TypeScript SDK with PII redaction", included: true },
      { text: "OpenTelemetry native OTLP HTTP support", included: true },
      { text: "GitHub deploy webhook tracking", included: true },
      { text: "Multi-signal anomaly correlation", included: true },
      {
        text: "Incident list & detail views with threaded comments",
        included: true,
      },
      { text: "Shared runbooks", included: true },
      { text: "Incident simulation playground (8 scenarios)", included: true },
      { text: "SSE real-time monitoring stream", included: true },
      { text: "Multi-channel alerts (Slack, Discord, Teams)", included: true },
      {
        text: "AI incident root cause analysis (bring your own keys)",
        included: true,
      },
      {
        text: "AI-powered post-mortem generation (bring your own keys)",
        included: true,
      },
      {
        text: "AI morning digest emails (bring your own keys)",
        included: true,
      },
      { text: "Audit log trail", included: true },
      { text: "Unlimited team members", included: true },
      { text: "Self-service Docker / Compose deployment", included: true },
      { text: "GitHub community support", included: true },
    ],
    available: true,
  },
];
