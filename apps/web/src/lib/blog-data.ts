// ─────────────────────────────────────────────
// ObservabilityOS — Blog Data Layer
// Single source of truth for all blog content.
// Code samples are in blog-code.ts (ts-nocheck).
// ─────────────────────────────────────────────

import { CODE } from "./blog-code";

export interface BlogSection {
  heading: string;
  paragraphs?: string[];
  code?: string;
  codeLang?: string;
  list?: string[];
  callout?: {
    type: "info" | "warning" | "tip";
    title: string;
    content: string;
  };
}

export interface BlogAuthor {
  name: string;
  role: string;
  initials: string;
  color: string;
  bio: string;
  twitter?: string;
  github?: string;
}

export interface BlogPost {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  readTime: string;
  date: string;
  dateISO: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  authorKey: string;
  featured?: boolean;
  body: BlogSection[];
  relatedSlugs: string[];
}

// ─────────────────────────────────────────────
// AUTHORS
// ─────────────────────────────────────────────

export const BLOG_AUTHORS: Record<string, BlogAuthor> = {
  "observability-os": {
    name: "ObservabilityOS Team",
    role: "Core Engineering & DevRel",
    initials: "OO",
    color: "bg-indigo-600",
    bio: "The core engineering, site reliability, and developer relations team behind ObservabilityOS. We build AI-native observability infrastructure to eliminate 3 AM firefighting.",
    twitter: "observabilityos",
    github: "observabilityos",
  },
};

// ─────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────

export const BLOG_CATEGORIES = [
  "All",
  "Observability",
  "OpenTelemetry",
  "AI for SRE",
  "Incident Management",
  "Monitoring",
  "Production Engineering",
  "DevOps",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

// ─────────────────────────────────────────────
// BLOG POSTS
// ─────────────────────────────────────────────

export const BLOG_POSTS: BlogPost[] = [
  // ── 1. WHAT IS OBSERVABILITY ───────────────
  {
    title: "What is Observability? A Practical Guide for Developers",
    slug: "what-is-observability",
    category: "Observability",
    tags: [
      "observability",
      "monitoring",
      "logs",
      "metrics",
      "traces",
      "devops",
    ],
    readTime: "8 min read",
    date: "June 25, 2026",
    dateISO: "2026-06-25",
    description:
      "Observability is not just monitoring with more dashboards. This guide explains the three pillars, why the unknown-unknowns problem demands a new approach, and how to build your first observability practice in production.",
    metaTitle: "What is Observability? A Practical Guide for Developers (2026)",
    metaDescription:
      "Understand what observability really means: the three pillars (logs, metrics, traces), why it differs from monitoring, and how to build observability into modern production systems.",
    authorKey: "observability-os",
    featured: true,
    relatedSlugs: [
      "why-datadog-is-too-expensive",
      "opentelemetry-nodejs-guide",
      "distributed-tracing-guide",
    ],
    body: [
      {
        heading: "Monitoring vs. Observability: Why the Distinction Matters",
        paragraphs: [
          "Monitoring tells you when something is wrong. Observability tells you why. Traditional monitoring works by defining thresholds on known metrics — CPU above 90%, error rate above 5%, disk below 10% free. These are the known-unknowns: failure modes you anticipated and built alerts for. When one of these conditions fires, you already have a runbook for it.",
          "Observability addresses the unknown-unknowns: the failure modes you never predicted, the emergent behaviors that only appear at scale, the cascading failures that manifest differently every time. An observable system can be interrogated after the fact to answer questions you didn't know you'd need to ask when you built it. You don't write alerts for unknown-unknowns — you need the raw data to reconstruct what happened.",
          "The practical difference shows up during incidents. With monitoring alone, you get an alert that your checkout service is returning 500 errors. With observability, you trace a single failing request through every microservice it touched, see which database query caused the slowdown, and identify the exact deploy that introduced the regression — in under five minutes, without needing to reproduce the issue.",
        ],
      },
      {
        heading: "The Three Pillars: Logs, Metrics, and Traces",
        paragraphs: [
          "Logs are timestamped records of discrete events. They capture the narrative of what happened: a user logged in, a payment failed, a function threw an exception. Modern logs are structured — emitted as JSON rather than plain text — which makes them searchable and analyzable at scale. A Node.js service in production might emit thousands of log events per second.",
          "Metrics are numerical measurements sampled over time. Unlike logs, which are event-driven, metrics are aggregations: request rate, error rate, p95 latency, CPU utilization, memory usage. Metrics are cheap to store (a float and a timestamp) and fast to alert on. The trade-off: they lose individual context. A spike in your error rate tells you something went wrong, not where or why.",
          "Traces record the journey of a single request through your distributed system. Every service that touches the request records a span — containing the operation name, start time, duration, and metadata. These spans are stitched together into a trace showing the full request path across service boundaries. Distributed tracing is what separates modern observability from traditional APM: without it, you cannot debug latency issues in microservice architectures where a single user action fans out across a dozen services.",
        ],
        code: CODE.threepillarsCode,
        codeLang: "typescript",
      },
      {
        heading:
          "The Cardinality Problem: Why Microservices Changed Everything",
        paragraphs: [
          "In a monolithic application, you might have 10–20 metrics to watch. In a microservices architecture with 50 services, each exposing dozens of endpoints across multiple regions, you're looking at millions of potential metric tag combinations. This is the cardinality explosion problem, and it's why traditional monitoring breaks down at scale.",
          "High-cardinality data — metrics tagged with user IDs, request IDs, or tenant IDs — is what makes observability genuinely powerful. It lets you answer questions like 'what is the p99 latency for user plan: enterprise in the EU region?' But high cardinality is also why some platforms charge you per unique metric time-series, creating bills that scale directly with your user growth.",
          "The architecture solution is to separate high-cardinality data (logs and traces, which preserve full context) from low-cardinality data (metrics, which are aggregated). Logs and traces are expensive to store but contain everything. Metrics are cheap to store and query but lose individual context. You need both. This is the three-pillar model — and why you cannot replace any one pillar with another.",
        ],
      },
      {
        heading: "The Business Case: What Downtime Actually Costs",
        paragraphs: [
          "Gartner estimates the average cost of IT downtime at $5,600 per minute. For a Series A SaaS company doing $3M ARR, a two-hour outage can cost more than an entire month of customer acquisition budget. Beyond direct revenue loss, there's the invisible cost: engineers pulled off roadmap work, customer success scrambling, and long-term trust erosion that drives churn.",
          "IDC research shows that developers spend 25–30% of their time on debugging and incident response. That is one quarter of your engineering payroll going toward firefighting rather than building. Observable systems compress the time from 'something is wrong' to 'here is exactly what is wrong and why' from hours to minutes — directly reclaiming that budget.",
          "Alert fatigue multiplies the cost. Teams that receive hundreds of meaningless alerts per day begin ignoring them wholesale. Studies show engineers ignore more than 90% of the alerts they receive. The paradox: the more raw alerts you add, the less reliable your incident detection becomes. Observability's goal is not more data — it is better signal with less noise.",
        ],
      },
      {
        heading: "Getting Started: Your First Observability Stack",
        paragraphs: [
          "Start with structured logging. If your application emits plain-text logs today, you cannot search, filter, or aggregate them at scale. Switching to JSON-structured logs with consistent fields — timestamp, level, service, traceId, userId, and message — is the single highest-leverage change you can make. It costs almost nothing and transforms your logs from unreadable dumps into a queryable audit trail.",
          "Next, instrument your critical paths first. You do not need to trace every request immediately. Focus on the paths that directly affect revenue: authentication, your core product action, and your billing flow. Auto-instrumentation libraries for Node.js handle HTTP, Express, MongoDB, and Redis with zero manual code changes — start there.",
          "Finally, define your Service Level Indicators before you configure alerts. An SLI is a measurement that reflects service quality from the user's perspective: 'the percentage of API requests that succeed' or 'the 99th percentile latency of the checkout page.' Alerts should fire when SLIs degrade, not when infrastructure metrics spike. This single principle eliminates the majority of alert fatigue.",
        ],
        code: CODE.sdkInstall,
        codeLang: "bash",
      },
      {
        heading: "Frequently Asked Questions",
        list: [
          "What is the difference between observability and monitoring? Monitoring tells you when a known threshold is breached — it works for known-unknowns. Observability lets you interrogate your system's behavior to understand failure modes you never anticipated. You need both: monitoring for fast alerting, observability for deep investigation.",
          "Do I need all three pillars from day one? No. Start with structured logging — it delivers the most value with the least complexity. Add metrics for your critical SLIs. Add distributed tracing when you have more than three services with cross-service latency problems you cannot debug with logs alone.",
          "Is observability only for large companies? No. The economics favor smaller teams even more. A 10-engineer team without dedicated SREs cannot afford to spend hours debugging an incident. A well-instrumented system gives every engineer the same diagnostic power that would otherwise require a dedicated SRE team.",
          "How much does observability cost? An open-source self-hosted stack (Prometheus + Grafana + Loki) costs nothing in licensing but requires engineering time to operate and scale. Managed platforms range from free (ObservabilityOS free tier: 1 service, 7-day retention) to $50,000+/year for enterprise Datadog deployments.",
        ],
      },
    ],
  },

  // ── 2. WHY DATADOG IS TOO EXPENSIVE ────────
  {
    title: "Why Datadog Is Too Expensive (And What to Do About It)",
    slug: "why-datadog-is-too-expensive",
    category: "Monitoring",
    tags: ["datadog", "pricing", "observability", "alternatives", "cost"],
    readTime: "9 min read",
    date: "June 27, 2026",
    dateISO: "2026-06-27",
    description:
      "Datadog's average annual spend for mid-sized engineering teams exceeds $50,000. We break down exactly where the money goes, expose the hidden cost multipliers, and evaluate which alternatives give you 80% of the value at 10% of the price.",
    metaTitle:
      "Why Datadog Is Too Expensive in 2026 — Real Costs & Honest Alternatives",
    metaDescription:
      "Datadog bills surprise teams with host fees, custom metric charges, log ingestion costs, and APM add-ons. Here's an honest breakdown of what you actually pay and what the real alternatives are.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "alert-fatigue-guide",
      "what-is-observability",
      "aws-cloudwatch-alternatives",
    ],
    body: [
      {
        heading:
          "The Datadog Pricing Model: Why It's Designed to Scale Against You",
        paragraphs: [
          "Datadog's pricing is not a single number — it's a matrix of per-unit charges that compound as your infrastructure grows. Infrastructure Monitoring costs $15–$23 per host per month. APM costs an additional $31 per host. Log Management charges $0.10 per GB indexed, plus separate retention fees. Custom Metrics cost $0.05 per metric per month, with each unique tag combination counting as a separate metric.",
          "The math compounds quickly. A team running 30 application hosts, with APM enabled, 500GB of log ingestion per month, and 50,000 custom metrics is looking at: $690 (infra) + $930 (APM) + $50 (logs) + $2,500 (custom metrics) = $4,170/month before user seats, dashboards, and retention add-ons. Annualized: $50,040. This is a real, common scenario for a Series B startup.",
          "What makes this particularly painful is that the costs scale directly with business success. More customers means more requests, which means more logs, more traces, more hosts, and more custom metrics — all billed separately. Datadog's model is designed to grow with your company, which sounds great until you realize you're spending more on observability than on most of your engineering infrastructure.",
        ],
      },
      {
        heading: "The Five Hidden Cost Multipliers",
        paragraphs: [
          "Custom metrics are the most dangerous line item. Datadog counts every unique combination of metric name and tag values as a separate custom metric. If you emit a metric called 'request.duration' tagged with 'service', 'endpoint', 'region', and 'status_code', and you have 20 services x 50 endpoints x 3 regions x 5 status codes, that's 15,000 custom metrics from a single application metric. At $0.05/metric, that's $750/month from one metric.",
          "Log ingestion vs. retention is a separate billing axis. Datadog charges for both indexing logs (for search) and for retaining them. A team ingesting 1TB/month and retaining for 15 days pays one price; retaining for 30 days doubles the retention bill. Many teams discover this discrepancy after the fact when they extend their retention window.",
          "The remaining hidden costs: user seats ($15–$25/user/month for some features), live container monitoring add-on, Real User Monitoring (RUM) billed per session, synthetic monitoring billed per test run, and the Datadog Agent itself requires your engineers to configure, maintain, and debug. The true total cost includes at least 15–20% of a senior engineer's time dedicated to Datadog configuration, which is rarely counted in TCO analyses.",
        ],
        list: [
          "Custom metrics explosion: every tag combination is a new billable metric",
          "Log indexing + retention: two separate charges for the same log data",
          "APM as a premium add-on: not included in base infrastructure monitoring",
          "User seat costs: restricting access to reduce costs creates team silos",
          "Engineering time: configuring and maintaining Datadog is a part-time job",
        ],
      },
      {
        heading: "The Alert Fatigue Problem Datadog Never Solved",
        paragraphs: [
          "Datadog's alerting model is fundamentally threshold-based. You define a static number — 'alert if error rate exceeds 5%' — and the system fires when that number is crossed. The problem: a 5% error rate at 2 AM during low traffic is catastrophic. A 5% error rate at 11 AM during a batch import job is normal. Static thresholds cannot distinguish between the two.",
          "Datadog added anomaly detection features, but they require you to understand and tune statistical models manually. Most engineering teams — especially those without dedicated SRE resources — never properly configure these features, defaulting back to static thresholds. The result: hundreds of low-signal alerts per week that engineers learn to ignore, defeating the entire purpose of the monitoring investment.",
          "This is the deepest structural problem with Datadog for SMB teams: it was designed for companies with SRE teams who can spend weeks configuring and tuning alerting. The $50,000/year bill buys you capabilities, not outcomes. The outcomes require additional human expertise that smaller teams simply do not have.",
        ],
      },
      {
        heading: "What You Actually Need vs. What You're Paying For",
        paragraphs: [
          "The core observability workflow for most engineering teams is simple: (1) detect that something is wrong, (2) understand what changed and why, (3) resolve the incident quickly, (4) document what happened. Everything else — custom dashboards, hundreds of integrations, enterprise RBAC, compliance reporting — is supporting infrastructure for this four-step workflow.",
          "Most Series A/B teams use fewer than 20% of Datadog's features. They need log search, basic metrics dashboards, error rate alerts, and some way to understand what caused an incident. They are paying for an enterprise product that targets 500-engineer organizations with dedicated SRE platform teams.",
          "The question is not 'is Datadog good?' — it is excellent for what it was built for. The question is 'is Datadog the right product for a 25-engineer team spending $50,000/year on observability?' In almost every case, the answer is no. The same outcomes — or better — are achievable at a fraction of the cost.",
        ],
      },
      {
        heading:
          "Evaluating Alternatives: The Four Things That Actually Matter",
        paragraphs: [
          "Time to first alert is the metric that determines whether your observability platform is worth anything. A platform that takes two weeks to configure properly is a platform that will not be configured properly. Look for platforms where you get meaningful signal within 24 hours of installation, without manual dashboard configuration.",
          "AI-powered root cause analysis separates modern platforms from traditional ones. The difference between 'your error rate is 12% (up from 3%)' and 'your checkout service started failing 12 minutes after your 3:47 PM deploy because a database migration left an unindexed foreign key on the orders table' is the difference between hours and minutes of incident investigation.",
          "Predictable pricing that does not scale against your success. Look for flat-rate plans, or volume-based pricing with hard caps. Avoid platforms that bill per custom metric, per user seat, or per log ingestion byte with no cap — these models create the same surprise billing dynamics as Datadog.",
        ],
        list: [
          "Time to first alert: must be under 24 hours, ideally under 30 minutes",
          "AI root cause analysis: explains WHY, not just what the numbers are",
          "Predictable pricing: flat rate or capped volume, never unbounded per-unit",
          "Zero-config onboarding: one npm install or one Docker command, not YAML files",
        ],
      },
      {
        heading: "Frequently Asked Questions",
        list: [
          "Is Datadog worth it for large companies? Yes — for companies with 200+ engineers, dedicated SRE teams, and complex compliance requirements, Datadog's breadth of integrations and enterprise features justify the cost. The ROI calculus is different for a 100-person organization with a full-time observability team vs. a 15-person startup where the CTO is also the on-call engineer.",
          "How do I migrate away from Datadog without downtime? Start by deploying your new platform in parallel — run both systems simultaneously for 2–4 weeks. Verify that critical alerts are firing equivalently in the new platform. Migrate non-critical services first. Cancel Datadog after 30 days of parallel operation with zero incidents missed.",
          "What does ObservabilityOS cost vs. Datadog? ObservabilityOS's Pro Cloud plan starts at $99/month flat — no per-host, per-metric, or per-seat charges. The equivalent Datadog setup for a 10-host, APM-enabled team with standard log volume costs approximately $1,200–$2,000/month.",
        ],
      },
    ],
  },

  // ── 3. ALERT FATIGUE GUIDE ─────────────────
  {
    title: "The SRE's Guide to Eliminating Alert Fatigue in 2026",
    slug: "alert-fatigue-guide",
    category: "Incident Management",
    tags: ["alert-fatigue", "alerting", "sre", "on-call", "anomaly-detection"],
    readTime: "7 min read",
    date: "June 29, 2026",
    dateISO: "2026-06-29",
    description:
      "Alert fatigue is endemic. Engineers ignore 90%+ of alerts. This guide explains exactly why it happens, how dynamic thresholds and AI triage fix it, and what a genuinely healthy alerting system looks like in production.",
    metaTitle: "How to Fix Alert Fatigue: The SRE's Complete Guide (2026)",
    metaDescription:
      "Alert fatigue kills on-call teams. Static thresholds misfire constantly. This guide shows how to implement dynamic baselines, AI-powered triage, and an alert hierarchy that engineers actually trust.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "what-is-observability",
      "slo-vs-sla-vs-sli",
      "how-to-reduce-mttr",
    ],
    body: [
      {
        heading: "Why Alert Fatigue Happens: The Psychology of Ignored Alerts",
        paragraphs: [
          "Alert fatigue is not a discipline problem — it's a systems problem. When engineers are paged at 3 AM for the seventh consecutive Tuesday for an alert that resolves itself within two minutes, they learn that this alert is not worth waking up for. The rational response is to ignore it. The irrational system design is to keep sending it.",
          "A 2024 PagerDuty study found that the average on-call engineer receives 338 alerts per week, of which 61% are classified as low-urgency. Teams with high alert volume see a 3.4x higher rate of alert acknowledgment without investigation — the 'acknowledge and go back to sleep' pattern that represents both human suffering and genuine risk. The real incidents that require response are buried under a flood of noise.",
          "The cognitive mechanism is well-documented: repeated exposure to false-positive stimuli reduces the amygdala's response to those stimuli. Your engineers are not becoming less diligent — they're becoming neurologically conditioned to discount your alerts. The solution is not telling them to pay more attention; it's making every alert worth paying attention to.",
        ],
      },
      {
        heading: "Why Static Thresholds Always Fail",
        paragraphs: [
          "Static thresholds assume your system behaves identically at all times. They don't account for diurnal traffic patterns (your API processes 10x more requests at 2 PM than at 2 AM), batch jobs that temporarily spike resource usage, or expected degradation during deployments. A CPU alert at 80% that fires during a routine database backup every night at 2 AM is useless — but it still wakes someone up.",
          "The math is simple and damning: if your static threshold has a 0.5% false positive rate and you check it every minute, you generate 7.2 false positive alerts per day. Across 20 metrics, that's 144 false positives per day before a single real incident occurs. Engineers stop trusting the system within weeks.",
          "Seasonality is the most commonly ignored factor. SaaS products see predictable weekly patterns: lower traffic on weekends, higher error rates during business hours when users are active, spikes at the start of each month for billing-related activity. A threshold calibrated for Tuesday at noon is wrong for Sunday at midnight, and wrong for the first of the month — but it applies equally to all three.",
        ],
      },
      {
        heading: "Dynamic Thresholds: Z-Score Baselines in Production",
        paragraphs: [
          "A Z-score measures how many standard deviations a data point is from the rolling mean of that metric's historical values. Instead of alerting when CPU exceeds 80%, you alert when CPU is more than 3 standard deviations above its historical average for this time of day, this day of week. An 85% CPU reading that is normal for a Monday morning batch job scores a Z of 0.2 and does not alert. An 85% CPU reading on a quiet Sunday afternoon that normally sees 20% usage scores a Z of 4.8 and fires immediately.",
          "The rolling window is configurable. A 2-hour window is responsive but noisy. A 7-day window captures day-of-week patterns but is slow to adapt to infrastructure changes. A practical starting point: 24-hour rolling window for latency and error rate metrics, 7-day rolling window for infrastructure metrics like CPU and memory.",
          "Z-score thresholds also require a minimum sample size to be valid. If your service processes only 10 requests in a 5-minute window, a single error produces a 100% error rate that is statistically meaningless. ObservabilityOS enforces a minimum sample size per evaluation window to prevent this class of false positives.",
        ],
        code: CODE.zScore,
        codeLang: "typescript",
      },
      {
        heading: "AI-Powered Alert Triage: Novel vs. Known",
        paragraphs: [
          "Even with dynamic thresholds, some alerts are still noise — not because the anomaly isn't real, but because it's a known recurring pattern that doesn't require human intervention. A weekly database vacuum that spikes disk I/O, a nightly batch job that temporarily elevates memory usage, a CDN cache warm-up after deployment that causes a brief latency spike. These are real anomalies in the statistical sense, but they're not incidents.",
          "AI-powered triage classifies incoming anomalies against a history of resolved incidents. An alert for 'elevated query latency on the reports database' that has been triggered and resolved without action 15 times in the past 30 days is classified as low-confidence and routed to a digest rather than a live page. An alert for the same pattern combined with an unusual deploy event from 12 minutes ago gets classified as high-confidence and immediately escalated.",
          "The accumulation of resolved incident data is what makes this classification increasingly accurate over time. Every incident your team closes — whether by fixing the underlying cause or marking it as 'expected behavior' — trains the classifier. Teams using ObservabilityOS for 90+ days see a 60–70% reduction in actionable alert volume, not because fewer things go wrong, but because the system learns what actually requires human attention.",
        ],
      },
      {
        heading: "The Alert Hierarchy: Three Tiers, Not One",
        paragraphs: [
          "A healthy alerting system has three distinct tiers. Tier 1 (Page Immediately) is reserved for SLO violations: your availability, error rate, or latency is degrading in a way that directly affects users right now. This should fire fewer than 5 times per week for a healthy service. Engineers must be able to trust that every Tier 1 alert is genuine.",
          "Tier 2 (Notify During Business Hours) covers anomalies that are real but not yet user-impacting: a gradual memory leak, a slowdown in a non-critical background job, a certificate expiring in 14 days. These go into Slack as informational messages — no page, no phone call, no sleep disruption.",
          "Tier 3 (Weekly Digest) covers everything else: statistical anomalies that are probably noise, metrics trending in the wrong direction but not yet alarming, resource utilization above targets. These are sent as a weekly digest email for engineering leads. The goal of this tier is not action — it's awareness.",
        ],
        list: [
          "Tier 1 — Page immediately: SLO breach, user-impacting, requires immediate action. Target: fewer than 5 per week per service.",
          "Tier 2 — Business hours notification: real anomaly, not yet user-impacting, investigate within 24 hours. Target: fewer than 20 per week.",
          "Tier 3 — Weekly digest: statistical noise, trending issues, informational. Never pages. Reviewed weekly.",
          "Golden rule: if an alert fires more than twice in a week without requiring action, it should be demoted or deleted.",
        ],
      },
      {
        heading: "Measuring Alert Quality: The Metrics That Matter",
        paragraphs: [
          "You cannot improve what you don't measure. The most important alerting metric is the actionability rate: the percentage of alerts that required human action (investigation, fix, or escalation) divided by total alerts. A healthy system targets an actionability rate above 80%. If your actionability rate is below 50%, your engineers are ignoring half your alerts — and your real incidents may be going unnoticed.",
          "Mean time to acknowledge (MTTA) measures how quickly engineers respond to pages. A rising MTTA is an early warning signal of alert fatigue — people are consciously or unconsciously delaying their response. Track MTTA by engineer and by service. If one engineer consistently takes 30 minutes to acknowledge and others take 3, it's likely the alert is known to be low-value, not that the engineer is disengaged.",
          "False positive rate — alerts that fire without a corresponding genuine issue — is the root cause metric. Calculate it monthly: (total alerts - actionable alerts) / total alerts. Anything above 30% requires immediate attention. The goal is to drive this below 10% within 90 days of implementing dynamic thresholds.",
        ],
      },
    ],
  },

  // ── 4. OPENTELEMETRY NODE.JS GUIDE ─────────
  {
    title: "OpenTelemetry Node.js: The Complete Setup Guide for 2026",
    slug: "opentelemetry-nodejs-guide",
    category: "OpenTelemetry",
    tags: ["opentelemetry", "nodejs", "tracing", "instrumentation", "tutorial"],
    readTime: "11 min read",
    date: "July 1, 2026",
    dateISO: "2026-07-01",
    description:
      "Step-by-step guide to instrumenting Node.js with OpenTelemetry. Auto-instrumentation, custom spans, metric collection, context propagation, and exporting to any backend. Includes working code for Express, MongoDB, and Redis.",
    metaTitle: "OpenTelemetry Node.js Setup Guide 2026 — Traces, Metrics, Logs",
    metaDescription:
      "Complete guide to setting up OpenTelemetry in Node.js. Auto-instrument Express, MongoDB, and Redis. Add custom spans, export to any backend. Includes working code examples.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "opentelemetry-zero-config-setup",
      "opentelemetry-vs-datadog",
      "structured-logging-nodejs",
    ],
    body: [
      {
        heading: "Why OpenTelemetry Over Proprietary Agents",
        paragraphs: [
          "Before OpenTelemetry, every observability vendor shipped their own agent — a proprietary daemon that intercepted your application's traffic, reformatted it into the vendor's schema, and shipped it to the vendor's backend. Switching from Datadog to New Relic meant ripping out the Datadog Agent, installing the New Relic agent, rewriting all your custom instrumentation, and losing months of historical data.",
          "OpenTelemetry (OTel) is the CNCF-standardized solution to vendor lock-in. It defines a universal instrumentation API, a collection of auto-instrumentation libraries for every major framework, and an export protocol (OTLP) that every major observability backend now supports. You instrument your application once with OTel and can send the data to any backend — Datadog, Grafana, ObservabilityOS, or all three simultaneously.",
          "The OTel ecosystem has reached production-ready maturity. The Node.js SDK is stable, the instrumentation libraries for Express, Fastify, MongoDB, Redis, gRPC, and HTTP are actively maintained by the OpenTelemetry community and major vendors, and the OTLP protocol is supported by essentially every modern observability platform.",
        ],
      },
      {
        heading: "Installing the OpenTelemetry SDK for Node.js",
        paragraphs: [
          "The OpenTelemetry Node.js SDK is split into modular packages. You install the core SDK, the auto-instrumentation packages for your specific frameworks, and an exporter that sends data to your backend. This modularity means you only install what you need.",
        ],
        code: CODE.otelInstall,
        codeLang: "bash",
      },
      {
        heading: "Configuring Auto-Instrumentation",
        paragraphs: [
          "Auto-instrumentation patches the libraries you're already using — Express, HTTP, MongoDB, Redis — and creates spans automatically for every operation. You configure it once in a separate file that you load before anything else. This is the most important pattern: the SDK must load before your application code.",
          "The setup file should be loaded with Node's --require flag or by importing it as the very first statement in your entry point. Loading it after Express or Mongoose is initialized means the patching does not take effect, and your auto-instrumentation will silently produce no traces.",
        ],
        code: CODE.otelConfig,
        codeLang: "typescript",
      },
      {
        heading: "Adding Custom Spans for Business Logic",
        paragraphs: [
          "Auto-instrumentation captures framework-level operations: HTTP requests, database queries, cache lookups. But your business logic — the part that makes your application unique — is invisible to auto-instrumentation. Custom spans let you wrap any significant operation in a trace context, making it visible in your distributed traces.",
          "The most valuable places to add custom spans: payment processing, third-party API calls, computationally expensive algorithms, queue processing, and any operation where latency directly affects user experience. A rule of thumb: if you've ever debugged this code path, it deserves a span.",
        ],
        code: CODE.customSpans,
        codeLang: "typescript",
      },
      {
        heading: "Context Propagation: Tracing Across Service Boundaries",
        paragraphs: [
          "In a microservices architecture, a single user request touches multiple services. For distributed tracing to work, the trace context must be propagated from service to service — each service tells the next one which trace it belongs to. Without context propagation, each service creates isolated traces that cannot be stitched together.",
          "OpenTelemetry uses the W3C TraceContext standard: two HTTP headers, traceparent and tracestate, that carry the trace ID and span ID between services. The OTel HTTP instrumentation injects these headers automatically on outbound requests and extracts them automatically on inbound requests. You get distributed tracing with zero manual context threading.",
        ],
        code: CODE.contextPropagation,
        codeLang: "typescript",
      },
      {
        heading: "Production Configuration: Sampling and Performance",
        paragraphs: [
          "Tracing every single request in production is expensive — both in terms of latency overhead and backend storage costs. Sampling is the practice of only recording a percentage of traces. For most production systems, a 1–10% head-based sampling rate is appropriate for normal operation, with 100% sampling for requests that encounter errors.",
          "Tail-based sampling — deciding whether to keep a trace after it has completed — is more accurate but requires infrastructure to hold traces in memory while they complete. Head-based sampling (the default) makes the decision at the start of the request. For most teams, head-based sampling at 5–10% with error-rate 100% is the right starting point.",
        ],
        code: CODE.sampling,
        codeLang: "typescript",
      },
      {
        heading: "Frequently Asked Questions",
        list: [
          "Does OpenTelemetry add latency to my application? The auto-instrumentation overhead is typically 1–3ms per request for span creation and context propagation. Exporting is asynchronous and does not block your request path. The batch span processor buffers spans in memory and exports them in the background.",
          "Can I use OpenTelemetry with TypeScript? Yes — all OTel packages ship with TypeScript definitions. The examples in this guide are TypeScript. You do not need to configure anything special beyond the standard TypeScript setup.",
          "What if my backend doesn't support OTLP? The OTel SDK ships exporters for many backends: Zipkin, Jaeger, Datadog, Prometheus, and more. OTLP is the recommended format but not the only one. Most modern observability platforms now support OTLP natively.",
          "How do I test that my instrumentation is working? Start your service with OTEL_EXPORTER_OTLP_ENDPOINT pointing to a local collector or directly to ObservabilityOS. Run a few requests and check your traces dashboard. If you see spans, it's working. If not, set OTEL_LOG_LEVEL=debug to see instrumentation errors.",
        ],
      },
    ],
  },

  // ── 5. AWS CLOUDWATCH ALTERNATIVES ─────────
  {
    title: "AWS CloudWatch Alternatives: An Honest Comparison for 2026",
    slug: "aws-cloudwatch-alternatives",
    category: "Monitoring",
    tags: ["cloudwatch", "aws", "monitoring", "alternatives", "devops"],
    readTime: "8 min read",
    date: "July 3, 2026",
    dateISO: "2026-07-03",
    description:
      "CloudWatch is the default for AWS teams, but its pricing, limited AI, and poor developer experience send teams looking for alternatives. An honest comparison of what's actually available and who each option is right for.",
    metaTitle: "AWS CloudWatch Alternatives 2026: Honest Comparison Guide",
    metaDescription:
      "CloudWatch costs scale unexpectedly and its developer experience is painful. Compare the real alternatives — Datadog, Grafana, Better Stack, ObservabilityOS — with honest tradeoffs for each.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "why-datadog-is-too-expensive",
      "what-is-observability",
      "alert-fatigue-guide",
    ],
    body: [
      {
        heading: "The Fundamental Problem with AWS CloudWatch",
        paragraphs: [
          "CloudWatch is deeply embedded in the AWS ecosystem — it receives logs from Lambda, ECS, EKS, RDS, and dozens of other services without any configuration. This zero-friction integration is its greatest strength and the reason most AWS teams use it by default. But CloudWatch was built as a monitoring service for AWS itself, not as a developer-focused observability platform.",
          "CloudWatch's pricing model is where teams first encounter friction. Custom metrics cost $0.30 per metric per month, with each unique metric name + dimension combination counting as a separate custom metric. Log storage costs $0.03 per GB. Log Insights queries cost $0.005 per GB scanned — meaning a complex query across a large log volume can cost meaningful money. At scale, CloudWatch bills can reach thousands of dollars per month in a way that's difficult to predict or control.",
          "The developer experience problems are harder to quantify but more impactful day-to-day. CloudWatch Logs Insights has a proprietary query language that is not SQL and is not particularly intuitive. Dashboard creation is tedious. Alerts require navigating multiple menus and cannot easily express complex conditions. There is no built-in anomaly detection that actually works out of the box without significant tuning, and there is no AI-powered root cause analysis.",
        ],
      },
      {
        heading: "What Good Observability Actually Looks Like",
        paragraphs: [
          "Good observability means: (1) you get an alert within 60 seconds of something going wrong, (2) you can understand what caused it within 5 minutes, (3) you have enough context to fix it without needing to reproduce the issue, and (4) you automatically have documentation of what happened for the post-mortem. CloudWatch delivers number 1, partially delivers number 2, and does not deliver 3 or 4.",
          "The key capabilities that separate modern observability from basic monitoring: structured log search with full-text and field-level querying, distributed tracing across service boundaries, AI-powered anomaly detection that adapts to your traffic patterns, automatic correlation of deploys with metric changes, and plain-English incident summaries that do not require SRE expertise to interpret.",
        ],
      },
      {
        heading: "The Alternatives: An Honest Assessment",
        paragraphs: [
          "Datadog is the market leader for a reason — it has the deepest AWS integrations, the most mature alerting capabilities, and an excellent product for teams with dedicated SRE resources. The problem: for teams of under 50 engineers, the cost-to-value ratio is poor. You're paying for capabilities your team will never configure or use.",
          "Grafana + Prometheus is the open-source answer, and for teams with DevOps expertise who want full control, it's excellent. The real cost is engineer time: someone has to install, configure, maintain, upgrade, and debug the stack. A production-grade Grafana setup requires a Prometheus instance, a Loki instance for logs, an alert manager, and dashboards built from scratch. This is 40–60 hours of setup and ongoing maintenance — real costs that are rarely counted against the 'free' price tag.",
          "Better Stack (formerly Logtail) offers fast log search with a cleaner UI than CloudWatch and reasonable pricing. It is excellent for teams that primarily need better log search. It is not a full observability platform — there's limited metrics support, no distributed tracing, and no AI root cause analysis.",
        ],
        list: [
          "Datadog: Best for large teams ($5,000+/mo). Deep features, complex pricing. Requires SRE to configure.",
          "Grafana + Prometheus: Best for teams with DevOps expertise. Free to license, expensive in engineer time.",
          "Better Stack: Best for log search upgrade from CloudWatch. Not a full observability platform.",
          "New Relic: Good APM heritage, confusing pricing model. Declining market share.",
          "ObservabilityOS: Best for Series A/B teams. AI-native, zero config, flat $99/mo pricing.",
        ],
      },
      {
        heading: "Who Should Stay on CloudWatch",
        paragraphs: [
          "CloudWatch is the right choice if: your infrastructure is entirely within AWS managed services (Lambda, Fargate, RDS), you have minimal custom application metrics, your team has no on-call incidents to investigate, and your log volume is low enough that CloudWatch pricing is not painful. In these scenarios, the zero-configuration advantage of native AWS integration outweighs the platform's limitations.",
          "CloudWatch also makes sense as a data source rather than the primary interface. Many teams run CloudWatch for log aggregation (because it's automatic for AWS services) while using a different platform for search, alerting, and analysis. This hybrid approach gets the best of native AWS integration without accepting CloudWatch's developer experience limitations.",
        ],
      },
      {
        heading: "Migration Path: Moving Off CloudWatch in Stages",
        paragraphs: [
          "A full rip-and-replace migration is risky and unnecessary. A staged approach works better: first, add a log shipper to forward CloudWatch logs to your new platform while keeping CloudWatch as a backup. Run both systems in parallel for 2–4 weeks to verify coverage. Then migrate alerting to the new platform. Finally, after 60 days of confidence, reduce CloudWatch retention to 7 days (minimum for some services) and stop paying for long-term log storage there.",
          "For AWS-native services like Lambda and ECS, logs will continue flowing through CloudWatch regardless — these services write to CloudWatch by default. Your log shipper will forward from CloudWatch to your new platform. For applications where you control the logging configuration (EC2, EKS), you can add a log exporter that bypasses CloudWatch entirely and sends directly to your observability backend.",
        ],
        code: CODE.fluentBit,
        codeLang: "ini",
      },
    ],
  },

  // ── 6. AI ROOT CAUSE ANALYSIS ──────────────
  {
    title: "AI Root Cause Analysis: A Technical Deep Dive",
    slug: "ai-root-cause-analysis",
    category: "AI for SRE",
    tags: ["ai", "root-cause-analysis", "llm", "incident-response", "sre"],
    readTime: "10 min read",
    date: "July 5, 2026",
    dateISO: "2026-07-05",
    description:
      "How do LLMs actually diagnose production incidents? A technical breakdown of the AI RCA pipeline: context gathering, prompt engineering, chain-of-thought reasoning, confidence scoring, and a real MongoDB outage example.",
    metaTitle:
      "AI Root Cause Analysis Explained: How LLMs Diagnose Production Incidents",
    metaDescription:
      "A technical deep dive into AI-powered root cause analysis. How the pipeline works, what context LLMs need, prompt engineering for SRE, and a real incident diagnosis example.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "llms-for-sre-teams",
      "ai-root-cause-analysis-explained",
      "how-to-reduce-mttr",
    ],
    body: [
      {
        heading: "Why Traditional RCA Fails at 3 AM",
        paragraphs: [
          "Traditional incident response requires the on-call engineer to manually correlate information from multiple systems: logs from multiple services, infrastructure metrics, recent deploys, error tracking events, and historical context from previous incidents. Under pressure, at odd hours, with incomplete context, humans make poor correlations. The average MTTI (mean time to investigate) for complex incidents is 45–90 minutes — most of it spent gathering data, not analyzing it.",
          "The information needed to diagnose most incidents is already there. Your logs recorded the anomaly. Your deploy system recorded the change that caused it. Your error tracker captured the stack trace. The problem is not data availability — it's data correlation at speed. AI excels at exactly this: ingesting large volumes of heterogeneous data and producing structured, reasoned analysis in seconds.",
          "AI root cause analysis is not magic — it is a disciplined engineering pipeline that gathers the right context, structures it correctly, and submits it to an LLM with carefully engineered prompts. The quality of the output is directly proportional to the quality of the context and the prompt.",
        ],
      },
      {
        heading: "The Context Pipeline: What the LLM Actually Receives",
        paragraphs: [
          "An LLM analyzing a production incident receives a structured context window containing: (1) the anomaly detection event with its Z-score and metric values, (2) 50–200 relevant log lines from the affected service, time-windowed around the anomaly, (3) recent deploy events within the previous 24 hours, including git commit messages and diff summaries, (4) correlated errors from other services that spiked simultaneously, and (5) historical context — similar incidents from the past 30 days with their resolutions.",
          "The context must be assembled in priority order. LLMs have fixed context windows, and the most relevant information must appear early. Token budget allocation for a typical incident context: 20% for system prompt and instructions, 30% for logs, 20% for deploy/commit context, 15% for correlated service data, 15% for historical precedents.",
          "Pre-processing matters enormously. Raw log lines contain timestamps, service prefixes, and structured JSON that an LLM can parse, but verbatim log data is expensive in tokens and often includes irrelevant fields. ObservabilityOS pre-processes logs to extract the signal: error messages, exception types, relevant field values, and timing relationships. This compression often reduces the token count by 60–70% while preserving the diagnostic signal.",
        ],
      },
      {
        heading: "Prompt Engineering for Incident Reasoning",
        paragraphs: [
          "The system prompt for an AI RCA tool has three responsibilities: (1) define the output format so the response is machine-parseable, (2) establish the reasoning approach (what to look for, how to connect evidence), and (3) calibrate confidence communication.",
          "Chain-of-thought (CoT) prompting dramatically improves diagnostic accuracy. Rather than asking for a conclusion directly, the prompt instructs the model to reason step by step: first summarize the observed anomaly, then list all evidence sorted by strength, then identify the most probable cause and explain why, then list alternative causes and why they're less likely, then suggest remediation steps.",
        ],
        code: CODE.rcaPrompt,
        codeLang: "typescript",
      },
      {
        heading: "A Real Incident: AI Diagnoses MongoDB Connection Exhaustion",
        paragraphs: [
          "Here is an anonymized real incident from a customer's production system. The checkout service started returning 500 errors at 3:47 AM, waking the on-call engineer. Without AI RCA, the investigation would have involved manually searching logs, checking deploy history, and correlating timing — a 30–45 minute process.",
          "With ObservabilityOS's AI RCA, the incident card was generated in 8 seconds:",
        ],
        code: CODE.rcaJson,
        codeLang: "json",
      },
      {
        heading: "Confidence Scoring and When AI Gets It Wrong",
        paragraphs: [
          "AI RCA has a well-documented failure mode: when evidence is genuinely ambiguous, the model can produce a plausible-sounding but incorrect diagnosis with high confidence. This is the hallucination problem applied to incident response. The mitigation: calibrated confidence scoring and explicit uncertainty expression in the prompt.",
          "A confidence score below 0.6 should route the incident to human investigation with AI as an assistant, not the lead. ObservabilityOS shows confidence scores prominently in the incident card and includes a 'Why the AI is uncertain' section when confidence is below 0.7. Engineers should treat AI RCA as one signal among several, especially for novel failure modes.",
          "The system gets dramatically more accurate with more historical data. After 500 incidents, the model has seen your specific infrastructure's failure patterns, your team's most common root causes, and which types of evidence are most diagnostic for your stack. Fine-tuning a smaller model on this proprietary incident data is how ObservabilityOS builds a compounding technical moat over time.",
        ],
      },
    ],
  },

  // ── 7. SLO VS SLA VS SLI ──────────────────
  {
    title: "SLO vs SLA vs SLI: What Every Engineer Needs to Know",
    slug: "slo-vs-sla-vs-sli",
    category: "Production Engineering",
    tags: ["slo", "sla", "sli", "error-budget", "sre", "reliability"],
    readTime: "8 min read",
    date: "July 7, 2026",
    dateISO: "2026-07-07",
    description:
      "SLOs, SLAs, and SLIs are the vocabulary of production reliability. This guide explains the differences with real examples, shows you how to set meaningful targets, and explains error budgets and burn rate alerts that actually drive engineering decisions.",
    metaTitle:
      "SLO vs SLA vs SLI Explained — Complete Guide for Engineers (2026)",
    metaDescription:
      "Confused about SLOs, SLAs, and SLIs? This guide explains all three with practical examples, shows you how to set your first SLO, and explains error budgets and burn rate alerts.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "alert-fatigue-guide",
      "how-to-reduce-mttr",
      "incident-post-mortem-template",
    ],
    body: [
      {
        heading: "The Vocabulary of Reliability: Getting the Terms Right",
        paragraphs: [
          "SLI, SLO, and SLA are layered concepts that build on each other. Understanding the relationship between them is what makes them useful rather than bureaucratic checkbox exercises. Many teams implement SLAs without SLOs, or SLOs without SLIs, and end up with reliability targets that are disconnected from what the system actually measures. Start from the bottom up: measure first (SLI), target second (SLO), promise third (SLA).",
          "These concepts originated in Google's Site Reliability Engineering practice, documented in the SRE Book. They represent a shift from monitoring infrastructure metrics (CPU, memory, disk) to measuring service quality from the user's perspective. The question is not 'is my CPU below 80%?' but 'are my users getting the responses they expect, at the speed they expect, with the reliability they expect?'",
        ],
      },
      {
        heading: "SLIs: What You Measure",
        paragraphs: [
          "A Service Level Indicator is the actual measurement — the raw number that represents how your service is performing right now. A good SLI directly reflects user experience. Bad SLIs measure infrastructure health; good SLIs measure user-perceived quality.",
          "The four canonical SLI types: Availability (the fraction of successful requests), Latency (the fraction of requests served within a threshold), Throughput (the rate of requests the system can handle), and Quality (a proxy for whether the response was correct, e.g., cache hit rate, search result relevance). For most web APIs, availability and latency SLIs are sufficient to start.",
        ],
        code: CODE.sliCalc,
        codeLang: "typescript",
      },
      {
        heading: "SLOs: What You Target",
        paragraphs: [
          "A Service Level Objective is your internal reliability target — a commitment your engineering team makes to itself about how well the service should perform. An SLO is expressed as: SLI >= target over a time window. Example: 'The availability SLI will be >= 99.9% measured over a rolling 30-day window.'",
          "Setting the right SLO target requires understanding what reliability users actually need, what your system is currently achieving, and what it would cost to improve. 99.9% availability (the 'three nines' target) allows 43.8 minutes of downtime per month. 99.99% (four nines) allows 4.4 minutes per month. The jump from 99.9% to 99.99% is not just a number change — it typically requires architectural changes (redundant infrastructure, zero-downtime deploys, circuit breakers) that can represent months of engineering work.",
          "A common mistake is setting SLO targets at your current performance. SLOs should be slightly below your current measured performance — they represent the floor, not the ceiling. If you're currently achieving 99.97% availability, an SLO of 99.9% gives you room to experiment and take calculated risks with your error budget.",
        ],
      },
      {
        heading: "SLAs: What You Promise",
        paragraphs: [
          "A Service Level Agreement is a contractual commitment to your customers, backed by financial consequences (service credits, refunds, contract clauses). SLAs are always more lenient than your SLOs — the SLO is your internal bar, the SLA is what you're willing to defend in a contract negotiation.",
          "Typical structure: SLO = 99.9% availability, SLA = 99.5% availability. The gap between them is your safety margin — the buffer between 'we will detect and respond to this' and 'we owe you money.' Teams without this buffer expose themselves to SLA violations triggered by measurement methodology disagreements, unrelated infrastructure failures, or brief anomalies that recover before investigation.",
          "Not every service needs an SLA. Internal tools, development environments, beta features, and non-critical batch jobs should not have SLAs. Concentrate SLA commitments on the services that directly generate revenue or are contractually critical to enterprise customers.",
        ],
      },
      {
        heading: "Error Budgets: The Missing Piece",
        paragraphs: [
          "An error budget is the flip side of an SLO: it's the amount of unreliability your service is allowed to have within the SLO window. If your SLO is 99.9% availability over 30 days, your error budget is 0.1% of 30 days = 43.8 minutes of downtime per month. You start each month with a full budget and spend it through incidents.",
          "Error budgets transform reliability from a compliance exercise into an engineering tool. When the budget is full, teams can move fast — deploy frequently, experiment aggressively, accept more risk. When the budget is depleted, teams must slow down — freeze new feature deployments, prioritize reliability work, and focus on reducing incident frequency before returning to normal velocity.",
          "This creates a direct feedback loop between engineering decisions and reliability outcomes. Feature development that causes incidents depletes the budget; reliability improvements replenish it for next month. The error budget makes the trade-off between speed and reliability explicit and negotiable rather than political.",
        ],
        code: CODE.errorBudget,
        codeLang: "typescript",
      },
      {
        heading: "Burn Rate Alerts: Acting Before You Breach Your SLO",
        paragraphs: [
          "A burn rate alert fires when you're consuming your error budget faster than your SLO window allows. If you're 5 days into a 30-day window and you've already consumed 30% of your budget, you're burning at 1.8x the sustainable rate. If that rate continues, you'll exhaust your budget in 11 more days — well before the window closes.",
          "Google's SRE book recommends a multi-window, multi-burn-rate alert strategy: a fast burn alert for high burn rates (14.4x, 1-hour window) catches catastrophic incidents, a slow burn alert (3x, 6-hour window) catches gradual degradation. The combination covers both sudden outages and creeping reliability erosion that would otherwise slip past end-of-month reviews.",
          "Setting up burn rate alerts is the most advanced — and most valuable — alerting primitive available. Most teams running static threshold alerts today will see an immediate improvement in alert precision by switching to burn rate alerts: fewer false positives, guaranteed coverage of actual SLO violations, and a quantified economic impact of each incident.",
        ],
      },
    ],
  },

  // ── 8. INCIDENT POST-MORTEM ─────────────────
  {
    title: "How to Write an Incident Post-Mortem (With AI Templates)",
    slug: "incident-post-mortem-template",
    category: "Incident Management",
    tags: [
      "incident-management",
      "post-mortem",
      "sre",
      "templates",
      "ai",
      "blameless",
    ],
    readTime: "9 min read",
    date: "July 9, 2026",
    dateISO: "2026-07-09",
    description:
      "Post-mortems are consistently skipped or written poorly. This guide covers blameless post-mortem culture, the complete anatomy of a useful post-mortem, an AI-generated example, and a template your team will actually use.",
    metaTitle:
      "How to Write an Incident Post-Mortem — Template + AI Guide (2026)",
    metaDescription:
      "A complete guide to writing incident post-mortems that teams actually read and act on. Includes a downloadable template, blameless culture principles, and an AI-generated post-mortem example.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "ai-root-cause-analysis",
      "how-to-reduce-mttr",
      "alert-fatigue-guide",
    ],
    body: [
      {
        heading: "Why Post-Mortems Are Consistently Skipped",
        paragraphs: [
          "The post-mortem is the single highest-leverage activity in incident response. It converts a painful, costly incident into organizational learning that prevents the next one. And yet, in most engineering organizations, fewer than 30% of significant incidents have an associated post-mortem — and of those that are written, fewer than 50% result in action items that are actually completed.",
          "The reasons post-mortems get skipped are predictable: teams are exhausted after resolving an incident, the next sprint starts immediately, there's social discomfort in analyzing mistakes, and writing a thorough post-mortem feels like it takes more time than the incident itself. These are real constraints, not discipline failures. The solution is not to demand more discipline — it's to reduce the activation energy of the process.",
          "AI-generated post-mortem drafts solve the activation energy problem. When the draft is generated automatically from incident timeline data and log analysis, the engineer's job changes from 'write a document' to 'review and improve a draft.' This 80% reduction in writing effort means post-mortems get done — and done well.",
        ],
      },
      {
        heading: "Blameless Culture: The Non-Negotiable Foundation",
        paragraphs: [
          "A blameless post-mortem does not ask 'who did this?' It asks 'what conditions made this possible?' This distinction is not just cultural kindness — it's epistemically correct. Complex systems fail because of systemic conditions, not because individuals made poor decisions. The engineer who deployed the change that caused the outage made the best decision they could with the information and tooling available to them at the time.",
          "If your post-mortem process leads to engineers being held personally responsible for incidents, you will get one of two outcomes: engineers who avoid deploys (slowing down your engineering velocity) or engineers who hide incidents (making your system invisibly fragile). Neither is acceptable. Blame is not just unkind — it actively destroys the safety culture that makes honest, thorough post-mortems possible.",
          "Blameless does not mean consequence-free for systemic negligence. If an engineer skipped a code review, bypassed a mandatory process, or ignored a prior warning, that is worth noting as a contributing factor. The frame is 'what did this reveal about our process?' not 'who was negligent?'",
        ],
      },
      {
        heading: "The Anatomy of a Useful Post-Mortem",
        paragraphs: [
          "A post-mortem that produces organizational learning has eight components. Not all eight need to be comprehensive for every incident — a minor incident might have a 200-word post-mortem, a major one might run 2,000 words — but all eight should be present.",
        ],
        list: [
          "Incident title and severity: Brief description and impact classification (P1–P4, SEV1–SEV4, etc.)",
          "Summary: 2–3 sentences. What broke, how long, what was the impact on users?",
          "Timeline: Chronological record of events — when it started, when it was detected, key investigation steps, resolution. Times in UTC.",
          "Root cause: The specific technical cause. Not 'human error' — that is never the root cause.",
          "Contributing factors: The conditions that made the root cause possible. Usually 3–6 items.",
          "Impact: Quantified. Duration x affected users x estimated revenue impact.",
          "Action items: Each item has an owner, a due date, and a priority. Without owners and dates, they won't happen.",
          "Lessons learned: What would have made this faster to detect, investigate, or resolve?",
        ],
      },
      {
        heading: "An AI-Generated Post-Mortem: Annotated Example",
        paragraphs: [
          "The following is an example of what ObservabilityOS generates automatically from incident timeline data within 5 minutes of incident resolution. The engineer's review time is typically 10–15 minutes to verify accuracy, add nuance, and assign action item owners.",
        ],
        code: CODE.postMortem,
        codeLang: "markdown",
      },
      {
        heading: "Storing and Acting on Post-Mortems",
        paragraphs: [
          "A post-mortem that lives only in a Google Doc is a post-mortem that will not drive change. Post-mortems should be stored in a searchable, version-controlled system (your team's wiki, Notion, or a dedicated tool), linked from the incident ticket, and tagged by the categories of their contributing factors (e.g., 'deployment', 'database', 'third-party API').",
          "The action items are the most important artifact. Each action item must be entered into your project management system (Jira, Linear, GitHub Issues) with a real owner and a real due date — not just written in the post-mortem document. Schedule a monthly post-mortem review meeting where action items from the previous month are checked. An action item that is never reviewed is not an action item; it's a good intention.",
          "ObservabilityOS maintains a searchable runbook library that is automatically updated when post-mortems are completed. When a new incident resembles a previous one, the relevant post-mortem and runbook are surfaced automatically in the AI incident card. This creates a compounding organizational memory that makes your team more effective with every incident.",
        ],
      },
    ],
  },

  // ── 9. MONGODB MONITORING ──────────────────
  {
    title: "MongoDB Production Monitoring: A Hands-On Guide",
    slug: "mongodb-monitoring-guide",
    category: "Monitoring",
    tags: [
      "mongodb",
      "monitoring",
      "nodejs",
      "database",
      "production",
      "observability",
    ],
    readTime: "8 min read",
    date: "July 11, 2026",
    dateISO: "2026-07-11",
    description:
      "MongoDB behaves differently from SQL databases, and most observability tools miss what matters. This hands-on guide covers the exact metrics, connection pool monitoring, slow query detection, and index analysis your Node.js stack needs.",
    metaTitle:
      "MongoDB Production Monitoring Guide 2026 — Node.js Hands-On Tutorial",
    metaDescription:
      "Learn what MongoDB metrics actually matter in production: connection pool, slow queries, index usage, and replica set lag. With Node.js code examples and ObservabilityOS integration.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "structured-logging-nodejs",
      "opentelemetry-nodejs-guide",
      "ai-root-cause-analysis",
    ],
    body: [
      {
        heading: "What Makes MongoDB Unique to Monitor",
        paragraphs: [
          "MongoDB's document model and query architecture create monitoring challenges that don't exist in traditional SQL databases. Indexes in MongoDB are not enforced by schema — a missing index silently degrades from milliseconds to seconds as collections grow. Connection pooling semantics differ from SQL: MongoDB uses a per-host pool rather than per-database, and pool exhaustion manifests as application-level timeouts rather than connection errors.",
          "Most generic observability tools capture MongoDB operation counts and latency averages, but miss the metrics that actually predict trouble: connection pool utilization, index hit ratio, oplog replication lag, and the distribution of wiredTiger cache reads vs. disk reads. These are the signals that distinguish a healthy MongoDB cluster from one that is 2 weeks away from a severe production incident.",
          "The good news: the MongoDB driver emits rich CommandStartedEvent and CommandSucceededEvent events for every operation. Node.js's Mongoose and the native MongoDB driver both expose monitoring hooks that make comprehensive instrumentation possible with minimal application code changes.",
        ],
      },
      {
        heading: "The Five Metrics That Actually Matter",
        paragraphs: [
          "Connection pool utilization is the most critical MongoDB metric for Node.js applications. Every concurrent database operation consumes a connection from the pool. When the pool is exhausted, new requests queue up and eventually time out. The default Mongoose pool size is 5 — severely undersized for production applications handling concurrent requests.",
        ],
        list: [
          "Connection pool utilization: currentConnections / maxConnections. Alert at > 80%. The post-mortem example in this blog series was caused by pool exhaustion.",
          "Wait queue length: requests waiting for an available connection. Any non-zero value under normal load is a red flag.",
          "Slow query rate: queries taking > 100ms. Track as a rolling percentage of total queries.",
          "Index miss rate: collection scans (COLLSCAN in explain output) as a percentage of total queries. Should be < 0.1% in production.",
          "Replication lag: seconds behind primary for replica set members. Alert at > 10 seconds.",
        ],
      },
      {
        heading: "Instrumenting the MongoDB Driver in Node.js",
        paragraphs: [
          "The MongoDB Node.js driver exposes a monitoring event system that emits command events for every database operation. By subscribing to these events, you can track operation duration, detect slow queries, and measure pool utilization — all without modifying your business logic.",
        ],
        code: CODE.mongoDriver,
        codeLang: "typescript",
      },
      {
        heading: "Detecting N+1 Queries and Missing Indexes",
        paragraphs: [
          "N+1 queries are the most common performance anti-pattern in MongoDB + Node.js applications: a loop that executes one database query per item in a result set. A page that loads 50 users and then queries each user's profile generates 51 queries instead of 2. At low traffic, this is imperceptible. At production scale, it collapses your connection pool and degrades every concurrent user's experience.",
          "MongoDB's explain() plan reveals whether a query uses an index (IXSCAN) or performs a collection scan (COLLSCAN). A COLLSCAN on a collection with 1 million documents is a query that reads every document — latency scales linearly with collection size. In production, automatically detecting and logging COLLSCAN patterns allows you to identify missing indexes before they cause incidents.",
        ],
        code: CODE.slowQuery,
        codeLang: "typescript",
      },
      {
        heading: "Setting Up MongoDB Monitoring with ObservabilityOS",
        paragraphs: [
          "ObservabilityOS's Node.js SDK includes built-in MongoDB monitoring that wraps the driver event system automatically. Install the SDK and add the MongoDB monitor plugin — all the slow query detection, pool monitoring, and index analysis from this guide is handled automatically.",
        ],
        code: CODE.mongoOos,
        codeLang: "typescript",
      },
    ],
  },

  // ── 10. LLMS FOR SRE TEAMS ─────────────────
  {
    title: "LLMs for SRE Teams: Real Use Cases, Not Hype",
    slug: "llms-for-sre-teams",
    category: "AI for SRE",
    tags: ["llm", "ai", "sre", "incident-response", "automation"],
    readTime: "9 min read",
    date: "July 13, 2026",
    dateISO: "2026-07-13",
    description:
      "SREs are rightly skeptical of AI hype. This guide cuts through it: here are the six things LLMs are genuinely good at in SRE contexts, the things they are not, and what the economics of AI in incident response actually look like.",
    metaTitle: "LLMs for SRE Teams: Real Use Cases That Work in 2026",
    metaDescription:
      "LLMs in SRE — what actually works and what doesn't. Six proven use cases: log summarization, incident narrative generation, runbook drafting, NL log search, and more. With real economics.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "ai-root-cause-analysis",
      "ai-root-cause-analysis-explained",
      "incident-post-mortem-template",
    ],
    body: [
      {
        heading: "The SRE's Legitimate Skepticism",
        paragraphs: [
          "SREs have good reasons to distrust AI claims. Production systems operate under constraints that most AI demonstrations ignore: reliability requirements, latency budgets, regulatory constraints, and the cost of getting it wrong. An LLM that confabulates a plausible-sounding root cause during a P1 incident does not just waste time — it actively makes the incident worse by directing investigation down the wrong path.",
          "The useful question is not 'can LLMs help SRE teams?' but 'what specific tasks in SRE work are LLMs demonstrably better at than humans, under production conditions, with acceptable error rates?' The answer to that narrower question is both specific and valuable — there are genuine wins available, but they require understanding what LLMs are and are not capable of.",
          "This guide is opinionated. It will tell you which use cases work and which don't based on empirical observation from running AI models in production SRE workflows. If you're looking for hype, this is the wrong article.",
        ],
      },
      {
        heading: "What LLMs Are Actually Good At",
        paragraphs: [
          "LLMs excel at pattern matching and synthesis in text: identifying recurring themes across hundreds of log lines, connecting terminology from different contexts (a git commit message and an error log), and producing coherent prose from structured data. These are capabilities that complement rather than replace SRE expertise.",
          "The four structural advantages LLMs bring to SRE work: they are tireless (they will read 10,000 log lines without attention fatigue), they have broad technical knowledge (they have been trained on millions of engineering blog posts, Stack Overflow answers, and technical documentation), they produce structured output on demand (JSON, markdown, templates), and they are increasingly cheap ($0.001–$0.01 per task at current model prices).",
        ],
      },
      {
        heading: "Use Case 1: Log Pattern Summarization",
        paragraphs: [
          "Given 200 log lines from a misbehaving service, an LLM can produce a 3-sentence summary of the error patterns, their frequency, and their apparent cause — in under 3 seconds. A human engineer reading the same 200 lines takes 5–10 minutes and is more likely to fixate on the first interesting error they see rather than patterns across the full set.",
          "This works because log summarization is exactly the kind of task LLMs are structurally good at: pattern recognition in semi-structured text, with a clear summarization goal. The output quality is high enough to be the first step in incident investigation — not the last — and it compresses the data gathering phase of incident response significantly.",
        ],
        code: CODE.logSummarization,
        codeLang: "typescript",
      },
      {
        heading: "Use Case 2: Incident Narrative Generation",
        paragraphs: [
          "During an active incident, every 30 minutes the on-call engineer needs to communicate status to stakeholders: what's happening, what's been tried, what the current theory is, and what the ETA to resolution is. Writing these updates while actively debugging is context-switching overhead that degrades both the debugging and the communication.",
          "LLMs can draft these status updates from structured incident data: the current alert state, the investigation steps taken so far, and the current hypothesis. The engineer reviews and sends in 60 seconds instead of writing from scratch in 5 minutes. Over a 2-hour incident, this saves 15–20 minutes of cognitive load at the worst possible time.",
        ],
      },
      {
        heading: "Use Case 3: Runbook Drafting from Incident Data",
        paragraphs: [
          "The most persistent SRE problem: runbooks that are incomplete, outdated, or nonexistent. Writing a runbook requires an engineer to sit down and document a procedure — something that almost never happens after the incident is resolved because the team is already behind on sprint work.",
          "An LLM can draft a runbook from an incident timeline: the detection method, the investigation steps taken, the resolution action, and the prevention action. It won't be perfect — it requires review and refinement — but a 70% draft that takes 5 minutes to complete beats a blank page indefinitely. ObservabilityOS generates runbook drafts automatically from completed post-mortems.",
        ],
      },
      {
        heading: "What LLMs Cannot Do (And Why It Matters)",
        paragraphs: [
          "LLMs cannot reliably diagnose incidents they have never seen patterns of before. Novel failure modes — new infrastructure behaviors, zero-day vulnerabilities, complex multi-system race conditions — will produce confabulated diagnoses that sound plausible but are wrong. For novel incidents, LLMs are useful for data gathering and summary, not for diagnosis.",
          "LLMs cannot do arithmetic reliably. Do not ask an LLM to calculate error rates, compare numbers, or perform any computation that matters. Use code for computation and LLMs for language. LLMs also cannot access real-time data — they do not know your current system state unless you provide it explicitly in the context.",
          "Auto-remediation based on LLM recommendations is not ready for production. The error rate for incorrect LLM diagnoses — while much lower than random — is still non-zero, and an incorrect automated remediation can be catastrophically worse than the original incident. Keep humans in the loop for any action that modifies production state.",
        ],
      },
      {
        heading: "The Economics: Cost Per Incident",
        paragraphs: [
          "At current model pricing, an AI-assisted incident analysis costs approximately $0.002–$0.01 per incident using Claude Haiku or GPT-4o-mini. For a team with 200 incidents per month, that's $0.40–$2.00 in LLM costs. Even at 10x that scale, AI RCA remains an order of magnitude cheaper than the engineer time it replaces.",
          "The compounding value: every incident that gets a proper AI-assisted post-mortem produces data that improves the next analysis. Teams running AI-assisted incident response for 6+ months report 40–60% reductions in MTTR as the system learns their specific infrastructure patterns and the engineers learn to use AI context more effectively.",
        ],
      },
    ],
  },

  // ── 11. HOW TO REDUCE MTTR ─────────────────
  {
    title: "How to Reduce MTTR by 60%: Lessons from 10,000 Incidents",
    slug: "how-to-reduce-mttr",
    category: "Incident Management",
    tags: ["mttr", "incident-response", "sre", "reliability", "ai"],
    readTime: "8 min read",
    date: "July 15, 2026",
    dateISO: "2026-07-15",
    description:
      "MTTR is a composite metric with four distinct phases, each requiring a different intervention. Here's what 10,000 incidents analyzed by ObservabilityOS revealed about where time is actually lost — and how to recover it.",
    metaTitle:
      "How to Reduce MTTR by 60% — Data from 10,000 Production Incidents",
    metaDescription:
      "MTTR has four phases: detection, investigation, resolution, and communication. Here's where teams lose the most time and the specific interventions that compress each phase.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "alert-fatigue-guide",
      "ai-root-cause-analysis",
      "incident-post-mortem-template",
    ],
    body: [
      {
        heading: "MTTR Is Not One Number — It's Four",
        paragraphs: [
          "Mean Time To Repair is the total time from incident start to service restoration. But 'total time' is a composite of four distinct phases, each with different causes of delay and different interventions. Teams that report MTTR as a single metric and try to improve it as a single metric invariably fail — because the interventions for each phase are completely different.",
          "The four phases: TTD (Time to Detect) is how long from actual incident start to first alert. TTI (Time to Investigate) is how long from first alert to identifying the root cause. TTR (Time to Resolve) is how long from root cause identification to service restoration. TTC (Time to Communicate) is the time spent updating stakeholders throughout the incident. Teams optimizing for their longest phase achieve the most improvement per unit of effort.",
        ],
      },
      {
        heading: "Where Time Is Actually Lost: The Data",
        paragraphs: [
          "Across 10,000 incidents analyzed by ObservabilityOS, the time distribution breaks down as follows: on average, TTI accounts for 58% of total MTTR. This is the investigation phase — the time spent correlating evidence and identifying the root cause. It is where AI has the highest leverage, and it is consistently the most underinvested phase.",
          "TTD accounts for 22% of average MTTR. Static threshold alerting with poor signal-to-noise ratio means many incidents are caught late — engineers investigate alerts in order of arrival, and a real incident may sit in the queue behind noise alerts. Dynamic thresholds and AI triage compress this phase significantly.",
          "TTR (the actual fix) accounts for only 12% of MTTR for most incidents. The fix is usually fast once you know what it is — rollback a deploy, restart a service, scale up a resource. The 12% can be compressed with runbook automation, but the 58% (investigation) is where the real leverage is.",
        ],
        list: [
          "TTD — Time to Detect: 22% of MTTR. Fix: dynamic thresholds, AI anomaly detection, reduce alert queue noise.",
          "TTI — Time to Investigate: 58% of MTTR. Fix: AI root cause analysis, structured observability data, incident runbook access.",
          "TTR — Time to Resolve: 12% of MTTR. Fix: runbook automation, one-click rollbacks, pre-approved remediation scripts.",
          "TTC — Time to Communicate: 8% of MTTR. Fix: AI status page drafts, templated communication, stakeholder alert routing.",
        ],
      },
      {
        heading: "Compressing TTD: Catch Anomalies 10x Faster",
        paragraphs: [
          "The median TTD for incidents using static threshold alerting is 11 minutes. The median TTD for incidents using dynamic Z-score thresholds is 2 minutes. This 5x improvement comes from eliminating the 'alert queue delay' problem: with fewer false positives, engineers process every alert immediately rather than triaging a backlog.",
          "A second contributor to long TTD: monitoring gaps. Services that are new, recently refactored, or recently migrated often have incomplete monitoring coverage. An incident in a service with no custom alerts relies on generic infrastructure signals — CPU, memory — which are lagging indicators that don't fire until a service is severely degraded. Regular monitoring coverage audits (ObservabilityOS flags services with no custom alerts) prevent these gaps.",
        ],
      },
      {
        heading: "Compressing TTI: From 45 Minutes to 90 Seconds",
        paragraphs: [
          "The single most effective intervention for reducing TTI is AI root cause analysis. In ObservabilityOS's dataset, incidents with AI RCA available had a median TTI of 3.2 minutes versus 47 minutes for incidents investigated manually. The AI does not replace the engineer's investigation — it compresses the data gathering and initial hypothesis phases from 20–40 minutes to under 60 seconds.",
          "The second most effective TTI intervention is trace-level observability. Incidents in services with distributed tracing enabled had TTIs 34% shorter than untraced services, because the engineer could immediately see the request path, identify the slow or failing span, and target their investigation. Without traces, investigation requires reconstructing the request path from logs — a much slower process.",
          "Training and documentation have a measurable impact as well. Teams with documented incident runbooks available in their observability platform had 28% lower TTI than teams without. Runbooks don't replace investigation, but they prevent engineers from starting from zero on failure modes the team has seen before.",
        ],
      },
      {
        heading: "Compressing TTR: Runbooks and Automation",
        paragraphs: [
          "Once you know what's wrong, the fix is usually fast — if you have the right tools and permissions in place. The most common TTR delays: waiting for the right person to have permissions to execute a fix, not knowing the exact command to run, and caution about executing changes during an active incident without a second pair of eyes.",
          "Pre-approved remediation scripts — stored in your runbook library and executable with a single click from the incident dashboard — eliminate the first two problems. An engineer does not need to remember the exact Kubernetes command to scale a deployment if there's a 'Scale Up Checkout Service' button in the runbook that executes it with audit logging. These scripts should be tested in staging and pre-approved by a senior engineer, removing the caution problem as well.",
        ],
      },
      {
        heading: "Measuring MTTR Improvement: A Baseline First",
        paragraphs: [
          "You cannot improve what you do not measure. Before implementing any of the interventions in this guide, establish a baseline MTTR for each severity tier of incidents — measured separately, not as an average across all severities. A P1 checkout outage and a P4 internal tooling degradation have very different TTDs, TTIs, and TTRs, and improving one type does not necessarily improve the other.",
          "Set a 90-day improvement target for each phase. A realistic target for teams implementing AI RCA and dynamic thresholds: TTD from 11 minutes to 3 minutes, TTI from 47 minutes to 12 minutes, overall MTTR from 65 minutes to 25 minutes. This 60% reduction in MTTR is achievable within 90 days without major architectural changes — only tooling and process changes.",
        ],
      },
    ],
  },

  // ── 12. DISTRIBUTED TRACING GUIDE ──────────
  {
    title: "Distributed Tracing: A Beginner's Complete Guide",
    slug: "distributed-tracing-guide",
    category: "Observability",
    tags: [
      "distributed-tracing",
      "opentelemetry",
      "microservices",
      "nodejs",
      "observability",
    ],
    readTime: "10 min read",
    date: "July 17, 2026",
    dateISO: "2026-07-17",
    description:
      "Distributed tracing is the most powerful — and most misunderstood — pillar of observability. This complete beginner's guide explains how traces work, how spans connect across service boundaries, and how to read flame graphs to debug latency issues.",
    metaTitle: "Distributed Tracing: The Complete Beginner's Guide (2026)",
    metaDescription:
      "Learn distributed tracing from scratch: how spans work, trace context propagation, implementing tracing in Node.js with OpenTelemetry, reading flame graphs, and avoiding common pitfalls.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "opentelemetry-nodejs-guide",
      "what-is-observability",
      "opentelemetry-vs-datadog",
    ],
    body: [
      {
        heading: "The Problem Distributed Tracing Solves",
        paragraphs: [
          "A user clicks 'Buy Now.' Your API gateway receives the request. It calls the inventory service to check stock. That calls the product service for pricing. The order service creates a record. The payment service charges the card. The notification service sends a confirmation email. Seven services, seven logs, seven sets of metrics — all for one user action.",
          "When this workflow takes 4 seconds instead of 400ms, which service is slow? Logs will tell you each service handled a request, but not which request is the slow one or how they connect. Metrics will tell you average latency across all requests, but not that this specific user on this specific device is seeing P99 latency. Distributed tracing is the solution: a single view of the entire request's journey across every service it touched, with timing information for each step.",
          "Distributed tracing is particularly powerful for debugging problems that span service boundaries: cascading failures (service A is slow because service B is slow because service C has a missing index), request fan-out inefficiencies (10 parallel calls where 3 would suffice), and tail latency issues (99th percentile slowness caused by occasional lock contention in a downstream service).",
        ],
      },
      {
        heading: "How Traces Work: Spans and Context",
        paragraphs: [
          "A trace is a collection of spans that represent a single transaction through a distributed system. A span represents one unit of work within the trace — an HTTP request handled by a service, a database query, a cache lookup, an external API call. Every span has: a unique span ID, the trace ID it belongs to, a parent span ID (the span that triggered this one), a start timestamp, a duration, a status (success or error), and attributes (arbitrary key-value metadata).",
          "The relationship between spans is a directed acyclic graph (DAG): the root span (the first span in the trace) has no parent, and every subsequent span has exactly one parent. This creates a tree structure that mirrors the call graph of your request. When rendered as a flame graph, you can immediately see which spans are sequential and which are parallel, and where the time is going.",
        ],
        code: CODE.spanAnatomy,
        codeLang: "typescript",
      },
      {
        heading: "Context Propagation: How Spans Connect Across Services",
        paragraphs: [
          "Context propagation is the mechanism that makes distributed tracing work across service boundaries. When service A makes an HTTP request to service B, it includes special headers that tell service B which trace and parent span this request belongs to. Service B reads these headers, creates a child span with the correct parent, and passes the context along to any services it calls.",
          "The W3C TraceContext specification standardizes these headers: traceparent contains the trace ID and parent span ID in a standardized format, and tracestate carries vendor-specific trace state. All modern observability platforms and OpenTelemetry implementations support W3C TraceContext natively.",
        ],
        code: CODE.traceContext,
        codeLang: "bash",
      },
      {
        heading: "Implementing Your First Trace in Node.js",
        paragraphs: [
          "With OpenTelemetry auto-instrumentation enabled, you get trace spans automatically for every HTTP request, Express route, MongoDB query, and Redis command. But auto-instrumentation only captures framework-level operations. Your business logic — the part that makes your application unique — needs manual instrumentation.",
        ],
        code: CODE.customTrace,
        codeLang: "typescript",
      },
      {
        heading: "Reading Flame Graphs: What to Look For",
        paragraphs: [
          "A flame graph visualizes trace spans as horizontal bars on a time axis. The root span stretches across the top. Child spans appear below their parent, beginning at the time they were called. The width of each bar represents its duration. Gaps between spans in the same service represent time spent waiting for child calls to return or for CPU scheduling.",
          "Three patterns to look for in a flame graph: a single wide span that dominates the trace (one operation is causing all the latency — investigate that service first), a long sequential chain of narrow spans (N+1 query pattern — many calls that could be batched into one), and a span that starts immediately but takes a long time (latency inside a single service rather than a call overhead problem).",
          "The most useful diagnostic view is the 'critical path' — the sequence of spans from root to deepest leaf along the longest total duration. This is where the time is actually going, even if the visual flame graph looks complex. ObservabilityOS highlights the critical path automatically in the trace viewer.",
        ],
      },
      {
        heading: "Common Tracing Pitfalls",
        paragraphs: [
          "Missing context propagation breaks traces at service boundaries — you see two separate traces instead of one connected trace. This happens when HTTP calls are made without OTel instrumentation, when custom HTTP clients bypass the propagator, or when gRPC is used without the OTel gRPC instrumentation. Check that every service-to-service call path has OTel auto-instrumentation enabled.",
          "High cardinality span attributes can cause backend storage problems. Tags like user.id or order.id are high cardinality and valuable for finding specific traces. Tags like request.body or response.payload can contain unbounded data and should be truncated or excluded. Set attribute length limits and avoid logging request bodies verbatim in spans.",
          "Aggressive sampling can make rare error traces invisible. If you're sampling 1% of traces and a bug affects 0.5% of requests, you might miss it entirely. Use error-based sampling to ensure 100% of error traces are preserved regardless of your base sampling rate.",
        ],
      },
    ],
  },

  // ── 13. OPENTELEMETRY VS DATADOG ───────────
  {
    title: "OpenTelemetry vs Datadog Agent: Which Should You Choose?",
    slug: "opentelemetry-vs-datadog",
    category: "OpenTelemetry",
    tags: ["opentelemetry", "datadog", "comparison", "agent", "vendor-lock-in"],
    readTime: "9 min read",
    date: "July 19, 2026",
    dateISO: "2026-07-19",
    description:
      "OpenTelemetry and the Datadog Agent are not competing products — they solve different parts of the observability stack. This honest comparison explains what each does, when to use them, and how to migrate from one to the other.",
    metaTitle: "OpenTelemetry vs Datadog Agent: Honest Comparison for 2026",
    metaDescription:
      "OpenTelemetry is an instrumentation standard. Datadog Agent is a proprietary collector. Understanding the difference is critical. Here's an honest comparison with migration guidance.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "opentelemetry-nodejs-guide",
      "why-datadog-is-too-expensive",
      "what-is-observability",
    ],
    body: [
      {
        heading: "What Each Actually Does (The Common Confusion)",
        paragraphs: [
          "OpenTelemetry is not a monitoring platform — it's an instrumentation standard and a collection protocol. It defines how to create telemetry data (spans, metrics, logs) in your application code, and how to transmit that data using the OTLP protocol. OpenTelemetry itself does not store, query, alert on, or visualize your data. It produces the data; you need a backend to receive it.",
          "The Datadog Agent is a proprietary daemon that runs alongside your application and sends data to Datadog's backend. It can collect system metrics (CPU, memory, network), instrument applications through auto-injection, and act as a local aggregator. The Agent is deeply integrated with the Datadog platform — it is optimized for Datadog's data model and cannot easily send data to other backends.",
          "The actual comparison is therefore: OpenTelemetry SDK + OTLP Collector vs. Datadog Agent. Both accomplish the same goal — getting telemetry data out of your application. The difference is portability and vendor dependency.",
        ],
      },
      {
        heading: "The Vendor Lock-In Analysis",
        paragraphs: [
          "The Datadog Agent uses Datadog's own data format and proprietary APIs. While Datadog supports ingesting OpenTelemetry data as an OTLP endpoint, their Agent generates data in a Datadog-native format. If you instrument your applications with Datadog-specific APIs (DogStatsD for custom metrics, ddtrace for custom spans), you are locked in: migrating to another platform requires rewriting your custom instrumentation.",
          "OpenTelemetry instrumentation is backend-agnostic by design. Swap the exporter endpoint and you're sending to Grafana instead of Datadog, or to ObservabilityOS instead of New Relic. Your application code doesn't change. This portability has real economic value — it transforms backend selection from a switching-cost decision to an ongoing competitive choice.",
        ],
        list: [
          "Datadog Agent: Optimized for Datadog, good performance, proprietary format, locks you in",
          "OpenTelemetry SDK: Backend-agnostic, portable, community-maintained, CNCF standard",
          "OTel + Datadog backend: Best of both — portable instrumentation, Datadog as the backend",
          "OTel + ObservabilityOS: Portable instrumentation, AI-native backend, flat pricing",
        ],
      },
      {
        heading: "Feature Comparison: What Each Covers",
        paragraphs: [
          "For standard telemetry collection — HTTP traces, database spans, custom metrics — the OpenTelemetry SDK now matches or exceeds the Datadog Agent's coverage for most Node.js, Python, Java, and Go applications. The instrumentation quality of OTel's auto-instrumentation libraries has reached production parity with Datadog's equivalent in most major frameworks.",
          "Where the Datadog Agent still leads: system-level metrics collection (CPU, memory, network, disk IO at the host level), container and Kubernetes metadata injection, and deep integration with Datadog's anomaly detection pipeline. For teams using Datadog as their backend, the Agent provides a tighter integration loop and more automatic context enrichment than a generic OTel setup.",
          "Where OpenTelemetry leads: ecosystem breadth (90+ auto-instrumentation libraries vs. Datadog's narrower coverage), community momentum (CNCF backing, vendor-neutral governance), and total cost (OTel itself is free; the Agent's value is tied to a Datadog subscription).",
        ],
      },
      {
        heading: "The Migration Path: From Datadog Agent to OpenTelemetry",
        paragraphs: [
          "Migrating from the Datadog Agent to OpenTelemetry does not require an overnight cutover. The recommended approach is a phased migration over 4–6 weeks: (1) Install the OTel SDK alongside the Datadog Agent and run both simultaneously, exporting to separate backends. (2) Verify that OTel traces have equivalent coverage to Datadog traces for your critical paths. (3) Migrate your custom instrumentation (any ddtrace manual spans) to OTel equivalents. (4) Update your exporter endpoint to your new backend. (5) Remove the Datadog Agent after 30 days of parallel operation with no coverage gaps.",
          "For teams using Datadog as their backend who want to reduce vendor risk without switching backends, Datadog supports ingesting OTLP data directly. You can instrument with OTel, export to Datadog's OTLP endpoint, and keep your Datadog dashboards and alerts unchanged. This gives you OTel's portability while preserving your Datadog investment.",
        ],
        code: CODE.otelExporterSwap,
        codeLang: "bash",
      },
      {
        heading: "The Verdict: When to Use Each",
        paragraphs: [
          "Use Datadog Agent if: you're already deep in the Datadog ecosystem, you have dedicated DevOps resources to manage agent configuration, you need Datadog-specific features (DogStatsD, Datadog APM correlation with infrastructure metrics), and your Datadog contract is locked in for the foreseeable future.",
          "Use OpenTelemetry if: you're starting fresh and want to avoid vendor lock-in, you're evaluating multiple backends before committing, you're migrating away from Datadog, you want to use an AI-native backend like ObservabilityOS, or you value the portability of community-maintained, CNCF-standard instrumentation.",
          "The long-term direction is clear: OpenTelemetry is becoming the industry standard for instrumentation. Datadog, Grafana, AWS, and every other major observability vendor now supports it. Starting new instrumentation work with OTel is the correct architectural decision for nearly every team.",
        ],
      },
    ],
  },

  // ── 14. STRUCTURED LOGGING NODE.JS ─────────
  {
    title: "How to Implement Structured Logging in Node.js",
    slug: "structured-logging-nodejs",
    category: "DevOps",
    tags: [
      "nodejs",
      "logging",
      "structured-logging",
      "pino",
      "tutorial",
      "observability",
    ],
    readTime: "7 min read",
    date: "July 21, 2026",
    dateISO: "2026-07-21",
    description:
      "console.log() is a production anti-pattern. Structured JSON logging with Pino, correlation IDs, and proper log levels transforms your logs from unreadable text dumps into queryable, analyzable observability data.",
    metaTitle:
      "Structured Logging in Node.js with Pino — Complete Tutorial (2026)",
    metaDescription:
      "Replace console.log with structured JSON logging. Step-by-step guide to setting up Pino, implementing correlation IDs, using log levels correctly, and shipping logs to ObservabilityOS.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "opentelemetry-nodejs-guide",
      "mongodb-monitoring-guide",
      "what-is-observability",
    ],
    body: [
      {
        heading: "What Is Structured Logging and Why Does It Matter",
        paragraphs: [
          "Structured logging means emitting log data as machine-parseable records (typically JSON) rather than human-readable strings. Every log entry has a consistent schema: a timestamp, a severity level, a service name, a trace ID for correlation, and a message — plus any additional context fields relevant to that specific event.",
          "The difference becomes apparent when you need to answer operational questions at scale. With unstructured logs, 'how many users had failed payments in the last 24 hours?' requires regex parsing of free-form text across potentially billions of log lines — slow, fragile, and error-prone. With structured logs, it's a single indexed query: level=error AND event=payment.failed, aggregated by userId, limited to the last 24 hours — milliseconds.",
          "Structured logging is also the foundation for automated observability. AI-powered anomaly detection, log clustering, and root cause analysis all operate on structured fields. An LLM analyzing a structured error event extracts far more signal than an LLM analyzing unformatted console output.",
        ],
      },
      {
        heading: "Why console.log Is a Production Risk",
        paragraphs: [
          "console.log() outputs to stdout with no timestamp, no structured format, and no log level. In production, these limitations compound: you cannot filter by severity, you cannot index fields, you cannot correlate logs across services, and you cannot reliably extract structured data from arbitrary strings. console.log() in production is like writing your database schema in notepad files.",
          "Beyond the query limitations, console.log() has a performance problem: it is synchronous and blocks the Node.js event loop while writing. In high-throughput applications, this can add measurable latency to every request that triggers logging. Production logging requires asynchronous, non-blocking I/O.",
        ],
        list: [
          "No timestamp: logs arrive in stdout without accurate timing",
          "No log level: cannot filter by severity in log search",
          "No structure: cannot query fields — only full-text search",
          "Synchronous: blocks the event loop under high concurrency",
          "No correlation: cannot connect logs from the same request across services",
        ],
      },
      {
        heading: "Setting Up Pino: The Right Logging Library for Node.js",
        paragraphs: [
          "Pino is the fastest Node.js logging library, emitting JSON logs with minimal overhead. It is non-blocking, supports child loggers for contextual logging, integrates natively with Express and Fastify, and ships TypeScript types.",
        ],
        code: CODE.pinoInstall,
        codeLang: "bash",
      },
      {
        heading: "Logger Configuration for Production",
        paragraphs: [
          "Configure Pino once at the application root and export a singleton logger. All modules import this logger rather than creating their own — this ensures consistent log format and allows the base context (service name, version, environment) to be injected into every log entry automatically.",
        ],
        code: CODE.loggerConfig,
        codeLang: "typescript",
      },
      {
        heading: "Correlation IDs: Connecting Logs Across Services",
        paragraphs: [
          "A correlation ID (also called a request ID or trace ID) is a unique identifier generated at the entry point of a request and propagated through every service and log call that request triggers. When debugging an incident, you search for the correlation ID and see every log line from every service that handled that specific request — in order, with full context.",
          "With OpenTelemetry enabled, the trace ID serves as your correlation ID and is automatically propagated. Without OTel, you generate a UUID at the request entry point, store it in AsyncLocalStorage, and include it in every log call via a child logger bound to the request context.",
        ],
        code: CODE.correlationIds,
        codeLang: "typescript",
      },
      {
        heading: "Log Levels: Using Them Correctly",
        paragraphs: [
          "Log levels are not just labels — they are filters. In production, most applications should run at info level, which means trace and debug messages are not written. If you log everything at info or above without discipline, you create the same signal-to-noise problem as having no levels at all. The level should communicate actionability.",
        ],
        list: [
          "trace — Development only. Verbose execution steps. Never in production.",
          "debug — Development and troubleshooting. Detailed state. Disable in production by default.",
          "info — Normal operations. Request received, action completed, resource created. High volume but expected.",
          "warn — Unexpected but handled. Retry succeeded, fallback triggered, rate limit approached.",
          "error — Something failed. Requires investigation. Must include the error object and full context.",
          "fatal — Service cannot continue. Database unreachable, required config missing. Triggers immediate alert.",
        ],
      },
    ],
  },

  // ── ORIGINAL ARTICLES (preserved) ──────────
  {
    title:
      "Zero-Config OpenTelemetry Setup: From Zero to Production in 5 Minutes",
    slug: "opentelemetry-zero-config-setup",
    category: "OpenTelemetry",
    tags: ["opentelemetry", "nodejs", "quickstart", "tutorial", "sdk"],
    readTime: "5 min read",
    date: "June 20, 2026",
    dateISO: "2026-06-20",
    description:
      "Skip the YAML maze. Learn how to instrument any Node.js service with a single npm install command and get production-grade telemetry streaming in under five minutes.",
    metaTitle: "Zero-Config OpenTelemetry Setup in Node.js — 5-Minute Guide",
    metaDescription:
      "Install the ObservabilityOS SDK and get production-grade logs, traces, and metrics in 5 minutes. No YAML, no daemon, no dashboard configuration.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "opentelemetry-nodejs-guide",
      "structured-logging-nodejs",
      "what-is-observability",
    ],
    body: [
      {
        heading: "The Pain of Traditional Instrumentation",
        paragraphs: [
          "Setting up traditional observability pipelines often involves days of configuring collectors, exporters, and proprietary agents. Teams spend more time debugging their monitoring setup than actually using it. The irony of modern DevOps: the tools designed to tell you when your application is broken often need an application engineer just to keep them running.",
          "ObservabilityOS takes a different approach. Our zero-config SDK bundles everything you need into a single dependency: a structured logger, an OTel trace exporter, a metrics collector, a PII scrubber, and an async ingestion queue. No collector daemon, no YAML pipelines, no exporter routing.",
        ],
      },
      {
        heading: "One Command Setup",
        paragraphs: [
          "Install the SDK in any Node.js or TypeScript project. The SDK auto-patches console.log, captures unhandled exceptions, begins streaming structured telemetry to the ObservabilityOS ingestion endpoint, and enables PII scrubbing by default.",
        ],
        code: CODE.zeroConfigInstall,
        codeLang: "bash",
      },
      {
        heading: "What Happens Under the Hood",
        paragraphs: [
          "On initialization, the SDK creates an in-memory ring buffer for high-throughput batching. Logs are stored instantly in memory and flushed asynchronously in the background every 2 seconds or when the buffer reaches 100 entries — whichever comes first. The non-blocking queue ensures zero added latency to your application.",
          "The built-in scrubber automatically redacts credentials, JWT tokens, credit card numbers, and custom regex patterns before any data leaves your process. Your cloud indexer only ever receives sanitized payloads. Within seconds of your first log, the dashboard displays your service health, error rates, and latency. No configuration required.",
        ],
      },
    ],
  },

  {
    title:
      "AI-Powered Root Cause Analysis: How LLMs Are Changing Incident Response",
    slug: "ai-root-cause-analysis-explained",
    category: "AI for SRE",
    tags: ["ai", "root-cause-analysis", "llm", "incident-response", "sre"],
    readTime: "7 min read",
    date: "June 18, 2026",
    dateISO: "2026-06-18",
    description:
      "How GPT-4 and Claude transform raw telemetry and commit history into plain-English incident post-mortems. A deep dive into prompt engineering for SRE workflows.",
    metaTitle:
      "AI Root Cause Analysis: How LLMs Are Changing Incident Response",
    metaDescription:
      "GPT-4 and Claude can analyze production incidents and generate root cause reports in seconds. Here's how the AI pipeline works and what prompt engineering looks like for SRE.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "ai-root-cause-analysis",
      "llms-for-sre-teams",
      "how-to-reduce-mttr",
    ],
    body: [
      {
        heading: "The Signal-to-Noise Problem in Incident Response",
        paragraphs: [
          "When an incident strikes, engineers are flooded with raw data: stack traces, error logs, metric spikes, and alert notifications. The critical question is not what data is available but how to correlate it into actionable insight. Traditional dashboards require manual correlation across multiple views — a process that takes 30–60 minutes under pressure.",
          "AI-powered root cause analysis automates this by ingesting all incident context and producing a structured, plain-English summary in seconds. The LLM reads the same signals a senior SRE would read, but does it in 8 seconds rather than 45 minutes.",
        ],
      },
      {
        heading: "How the AI Pipeline Works",
        paragraphs: [
          "Upon detecting an anomaly, ObservabilityOS gathers surrounding context: matching error trace logs, environment configurations, and GitHub commit diffs from the preceding 24 hours. It packages this into structured prompts for Claude or GPT-4o-mini.",
        ],
        code: CODE.aiIncidentCard,
        codeLang: "markdown",
      },
      {
        heading: "Prompt Engineering for SRE Workflows",
        paragraphs: [
          "The effectiveness of AI incident analysis depends on prompt structure. A well-designed prompt includes: the anomaly context with Z-score, relevant log excerpts sorted by frequency, commit history with diff summaries, and historical precedents from similar incidents. ObservabilityOS continuously refines prompt templates based on incident resolution outcomes — which context signals correlate with accurate root cause identification.",
        ],
      },
    ],
  },

  {
    title: "Why Your Monitoring Pipeline Needs PII Scrubbing at the Edge",
    slug: "pii-scrubbing-at-the-edge",
    category: "DevOps",
    tags: ["pii", "compliance", "gdpr", "soc2", "security", "monitoring"],
    readTime: "6 min read",
    date: "June 16, 2026",
    dateISO: "2026-06-16",
    description:
      "Sending raw logs to the cloud is a compliance time bomb. Learn how client-side PII redaction works and why it is critical for SOC 2 and GDPR compliance.",
    metaTitle: "Why Your Monitoring Pipeline Needs PII Scrubbing at the Edge",
    metaDescription:
      "Raw logs contain sensitive data. Edge PII scrubbing prevents GDPR and SOC 2 violations by redacting sensitive fields before data ever leaves your infrastructure.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "structured-logging-nodejs",
      "what-is-observability",
      "opentelemetry-zero-config-setup",
    ],
    body: [
      {
        heading: "The Compliance Risk of Cloud Logging",
        paragraphs: [
          "Every log statement in your application is a potential compliance violation. Database connection strings, customer email addresses, authorization headers, and API keys frequently end up in log output — especially during development and debugging. When these logs are shipped to a cloud observability provider, you are sending sensitive data to third-party infrastructure. This creates exposure under SOC 2, GDPR, and HIPAA.",
          "The challenge: developers cannot reasonably be expected to audit every log statement for PII. The volume is too high, the patterns are too varied, and the development velocity required in a startup environment makes manual review untenable. The solution is automated edge scrubbing — redacting sensitive data before it ever leaves your process.",
        ],
      },
      {
        heading: "Edge Scrubbing: Redact Before Transit",
        paragraphs: [
          "ObservabilityOS takes a privacy-first approach: PII is redacted on your own infrastructure before any data leaves the process. The built-in scrubber runs recursive regex algorithms on object fields, string parameters, and arrays before they enter the log buffer.",
        ],
        code: CODE.piiScrubber,
        codeLang: "typescript",
      },
      {
        heading: "Configurable Redaction Rules",
        paragraphs: [
          "The scrubber ships with sensible defaults for common sensitive field names (password, token, secret, authorization, api_key, credit_card, ssn) and common PII patterns (email addresses, US Social Security Numbers, credit card numbers matching the Luhn algorithm). Extend it with custom patterns for domain-specific data: health record identifiers, financial account numbers, or internal employee IDs. Rules can be scoped per service or per environment.",
        ],
      },
    ],
  },

  {
    title: "Log Anomaly Detection: Z-Score vs Machine Learning Approaches",
    slug: "log-anomaly-detection-zscore-vs-ml",
    category: "Observability",
    tags: [
      "anomaly-detection",
      "z-score",
      "machine-learning",
      "logs",
      "engineering",
    ],
    readTime: "8 min read",
    date: "June 14, 2026",
    dateISO: "2026-06-14",
    description:
      "A technical comparison of statistical Z-score baselines versus ML-based anomaly detection for production log monitoring. When to use each approach and how they complement each other in a hybrid system.",
    metaTitle: "Log Anomaly Detection: Z-Score vs Machine Learning Compared",
    metaDescription:
      "Should you use Z-score statistical detection or machine learning for log anomaly detection? A technical comparison with code examples and production tradeoffs.",
    authorKey: "observability-os",
    featured: false,
    relatedSlugs: [
      "alert-fatigue-guide",
      "what-is-observability",
      "ai-root-cause-analysis",
    ],
    body: [
      {
        heading: "Why Anomaly Detection Matters",
        paragraphs: [
          "Static threshold alerts are the leading cause of alert fatigue. A CPU spike at 3 AM during a scheduled backup job triggers a page even though the system is healthy — because the threshold doesn't know about the backup. Modern anomaly detection adapts to your system's actual behavior patterns rather than firing on fixed numbers. ObservabilityOS uses a hybrid approach: statistical Z-score analysis for real-time detection and ML models for pattern recognition over longer time windows.",
        ],
      },
      {
        heading: "Z-Score: Fast and Interpretable",
        paragraphs: [
          "The Z-score measures how many standard deviations a data point is from the rolling mean. A Z-score above 3 indicates a statistically significant anomaly. Z-scores are lightweight, explainable, and work well for metrics with approximately normal distributions: error rates, latency, request throughput. The key advantage is speed and interpretability — you can show engineers exactly why an alert fired.",
        ],
        code: CODE.zscoreAnomaly,
        codeLang: "typescript",
      },
      {
        heading: "ML Approaches: Pattern Recognition at Scale",
        paragraphs: [
          "Machine learning models excel at detecting subtle patterns Z-scores miss: gradual drift, seasonal correlations across multiple services, and multi-dimensional anomalies where no single metric crosses a threshold but the combination of several is unprecedented. However, ML models require training data, more compute, and are harder to debug — you can't explain a neural network's output in one sentence.",
          "ObservabilityOS uses ML for weekly trend analysis and capacity planning — longer time horizons where model training latency is acceptable. Z-scores handle real-time incident detection where you need a result in milliseconds, not seconds. This hybrid gives you the speed of statistical methods for immediate alerting and the depth of ML for proactive insights.",
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getRelatedPosts(post: BlogPost): BlogPost[] {
  return post.relatedSlugs
    .map((slug) => BLOG_POSTS.find((p) => p.slug === slug))
    .filter((p): p is BlogPost => p !== undefined)
    .slice(0, 3);
}

export function getPostsByCategory(category: string): BlogPost[] {
  if (category === "All") return BLOG_POSTS;
  return BLOG_POSTS.filter((p) => p.category === category);
}

export function getFeaturedPost(): BlogPost {
  return BLOG_POSTS.find((p) => p.featured) ?? BLOG_POSTS[0];
}

export function getRecentPosts(limit = 10): BlogPost[] {
  return [...BLOG_POSTS]
    .sort(
      (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime(),
    )
    .slice(0, limit);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
