export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface PlanDetails {
  id: string; // e.g. 'free', 'starter', 'team', 'scale'
  name: string;
  priceUSD: number;
  priceINR: number;
  description: string;
  badge?: string;
  backendPlan: "free" | "pro" | "team" | "scale";
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
    id: "starter",
    name: "Starter",
    priceUSD: 29,
    priceINR: 2499,
    description: "Solo founders & small teams in production.",
    badge: "Most Popular",
    backendPlan: "pro",
    maxServices: 5,
    maxLogVolumeBytes: 5 * 1024 * 1024 * 1024, // 5GB
    retentionDays: 30,
    features: [
      { text: "Up to 5 services monitored", included: true },
      { text: "5GB logs / month", included: true },
      { text: "30-day secure data retention", included: true },
      { text: "Instant alerts (Slack, Discord, Teams)", included: true },
      { text: "AI SRE Analyst — incident diagnostics", included: true },
      { text: "1 team member seat", included: true },
    ],
    available: true,
  },
  {
    id: "team",
    name: "Team",
    priceUSD: 99,
    priceINR: 7999,
    description: "Growing engineering teams with production complexity.",
    backendPlan: "team",
    maxServices: 100, // High limit for team
    maxLogVolumeBytes: 20 * 1024 * 1024 * 1024, // 20GB
    retentionDays: 30,
    features: [
      { text: "Unlimited services", included: true },
      { text: "20GB logs / month", included: true },
      { text: "30-day log retention", included: true },
      { text: "Advanced AI root cause analysis", included: true },
      { text: "GitHub + Jira + PagerDuty integrations", included: true },
      { text: "Up to 10 team members", included: true },
      { text: "SLO/SLA tracking + AI post-mortems", included: true },
      { text: "Priority support", included: true },
    ],
    available: true,
  },
  {
    id: "scale",
    name: "Scale",
    priceUSD: 299,
    priceINR: 24999,
    description: "Series A+ companies with compliance & security needs.",
    backendPlan: "scale",
    maxServices: 1000, // High limit for scale
    maxLogVolumeBytes: 100 * 1024 * 1024 * 1024, // 100GB
    retentionDays: 90,
    features: [
      { text: "Everything in Team", included: true },
      { text: "100GB logs / month", included: true },
      { text: "90-day retention", included: true },
      { text: "Unlimited team members", included: true },
      { text: "SAML SSO + SOC2 audit log exports", included: true },
      { text: "Custom AI model fine-tuning", included: true },
      { text: "SLA guarantee + Dedicated Slack support", included: true },
    ],
    available: true,
  },
];
