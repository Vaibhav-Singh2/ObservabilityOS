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
    description: "Side projects & local testing.",
    backendPlan: "free",
    maxServices: 1,
    maxLogVolumeBytes: 500 * 1024 * 1024, // 500MB
    retentionDays: 7,
    features: [
      { text: "1 service monitored", included: true },
      { text: "500MB logs / month", included: true },
      { text: "7-day data retention", included: true },
      { text: "Basic statistical anomaly checking", included: true },
      { text: "Multi-channel alerts (Slack, Discord, Teams)", included: false },
      { text: "AI incident root cause analysis", included: false },
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
      { text: "30-day secure data retention", included: true },
      { text: "Instant alerts (Slack, Discord, Teams)", included: true },
      { text: "AI SRE Analyst — incident diagnostics", included: true },
      { text: "1 team member seat", included: true },
    ],
    available: true,
  },
  {
    id: "self-host",
    name: "Self-Host Open Source",
    priceUSD: 0,
    priceINR: 0,
    description: "Run ObservabilityOS on your own infrastructure.",
    backendPlan: "self-host",
    maxServices: 999999, // Practically Unlimited
    maxLogVolumeBytes: 999999 * 1024 * 1024 * 1024, // Practically Unlimited
    retentionDays: 9999, // User controls their own retention
    features: [
      { text: "Unlimited services monitored", included: true },
      { text: "Unlimited logs / month", included: true },
      { text: "Unlimited data retention", included: true },
      { text: "Community anomaly checking & SRE helpers", included: true },
      { text: "Self-service Docker/Compose deployment", included: true },
      { text: "GitHub community support", included: true },
    ],
    available: true,
  },
];
