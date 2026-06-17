export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface PlanDetails {
  id: string;
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
    maxLogVolumeBytes: 500 * 1024 * 1024,
    retentionDays: 7,
    features: [
      {
        text: "1 service · 500MB logs / month · 7-day retention",
        included: true,
      },
      {
        text: "Full-text log search, saved queries & CSV/JSON export",
        included: true,
      },
      {
        text: "TypeScript SDK with PII redaction & OTLP support",
        included: true,
      },
      { text: "Anomaly detection & auto-incident creation", included: true },
      {
        text: "Incident management with threaded comments & runbooks",
        included: true,
      },
      { text: "Service health dashboard, SLO & SSE stream", included: true },
      { text: "Multi-channel Slack, Discord & Teams alerts", included: false },
      {
        text: "AI root cause analysis, post-mortems & digests",
        included: false,
      },
      { text: "Audit log trail & team collaboration", included: false },
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
    maxLogVolumeBytes: 10 * 1024 * 1024 * 1024,
    retentionDays: 30,
    features: [
      {
        text: "10 services · 10GB logs / month · 30-day retention",
        included: true,
      },
      {
        text: "Full-text log search, saved queries & CSV/JSON export",
        included: true,
      },
      {
        text: "TypeScript SDK with PII redaction & OTLP support",
        included: true,
      },
      {
        text: "Multi-signal anomaly detection & auto-incident creation",
        included: true,
      },
      {
        text: "Incident management with threaded comments & runbooks",
        included: true,
      },
      { text: "Service health dashboard, SLO & SSE stream", included: true },
      { text: "Multi-channel Slack, Discord & Teams alerts", included: true },
      {
        text: "AI root cause analysis, post-mortems & daily digests",
        included: true,
      },
      { text: "Audit log trail & team collaboration", included: true },
    ],
    available: true,
  },
  {
    id: "self-host",
    name: "Self-Host Open Source",
    priceUSD: 0,
    priceINR: 0,
    description: "Run on your own infrastructure with full access.",
    backendPlan: "self-host",
    maxServices: 999999,
    maxLogVolumeBytes: 999999 * 1024 * 1024 * 1024,
    retentionDays: 9999,
    features: [
      {
        text: "Unlimited services · Unlimited logs · Unlimited retention",
        included: true,
      },
      {
        text: "Full-text log search, saved queries & CSV/JSON export",
        included: true,
      },
      {
        text: "TypeScript SDK with PII redaction & OTLP support",
        included: true,
      },
      {
        text: "Multi-signal anomaly detection & auto-incident creation",
        included: true,
      },
      {
        text: "Incident management with threaded comments & runbooks",
        included: true,
      },
      { text: "Service health dashboard, SLO & SSE stream", included: true },
      {
        text: "Multi-channel alerts & AI analysis (bring your own keys)",
        included: true,
      },
      { text: "Audit log trail & unlimited team members", included: true },
      {
        text: "Docker / Compose deployment & GitHub community support",
        included: true,
      },
    ],
    available: true,
  },
];
