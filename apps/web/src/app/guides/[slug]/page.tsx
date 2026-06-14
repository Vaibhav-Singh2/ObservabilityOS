import { notFound } from "next/navigation";
import Link from "next/link";
import { Activity, Github, Terminal, Clock, Calendar } from "lucide-react";
import type { Metadata } from "next";

interface GuideData {
  title: string;
  slug: string;
  category: string;
  readTime: string;
  date: string;
  description: string;
  body: Array<{
    heading: string;
    paragraphs: string[];
    code?: string;
    codeLang?: string;
  }>;
}

const GUIDES: Record<string, GuideData> = {
  "opentelemetry-monitoring-guide": {
    title: "OpenTelemetry (OTLP) Monitoring Guide for Production Clusters",
    slug: "opentelemetry-monitoring-guide",
    category: "Telemetry Setup",
    readTime: "6 min read",
    date: "June 12, 2026",
    description:
      "Learn how to configure OpenTelemetry collectors, format HTTP payloads, and stream structured metrics directly into ObservabilityOS without proprietary exporters.",
    body: [
      {
        heading: "1. Understanding OpenTelemetry & OTLP Compatibility",
        paragraphs: [
          "OpenTelemetry (OTel) has emerged as the global standard for cloud-native telemetry. Instead of using vendor-specific agents that trap you in high-cost proprietary ecosystems, OTel allows you to collect traces, metrics, and logs using open protocols.",
          "ObservabilityOS supports native OTLP HTTP/JSON standards. This means any active collector, agent, or microservice configured with an OpenTelemetry exporter can direct its output straight to our ingestion gateway. Let's see how to configure it.",
        ],
      },
      {
        heading: "2. Setting up the OpenTelemetry Collector Daemon",
        paragraphs: [
          "To begin forwarding traces and logs, modify your local or cluster-level otel-collector-config.yaml. You will add a standard otlphttp exporter pointing to the ObservabilityOS ingestion endpoint.",
          "Note the inclusion of the x-api-key header; this is your project authentication token found in your settings dashboard panel.",
        ],
        code: `receivers:
  otlp:
    protocols:
      grpc:
      http:

exporters:
  otlphttp/observabilityos:
    endpoint: "https://ingest.observabilityos.com/v1/telemetry"
    headers:
      x-api-key: "your_project_secret_api_key_here"

service:
  pipelines:
    logs:
      receivers: [otlp]
      exporters: [otlphttp/observabilityos]`,
        codeLang: "yaml",
      },
      {
        heading: "3. Local Testing and SDK Integration",
        paragraphs: [
          "If you are running microservices in Node.js, Express, or Next.js, you don't even need a collector daemon. You can use our zero-dependency SDK. It automatically respects OTLP formats, scrubbing PII parameters locally on the host before sending payloads in background batches.",
          "Simply initialize the logger as a shared utility throughout your microservices to trace errors, latency spikes, and SQL slow-downs.",
        ],
      },
    ],
  },
  "ai-incident-analysis-guide": {
    title: "AI-Powered Incident Analysis and MTTR Reduction",
    slug: "ai-incident-analysis-guide",
    category: "Incident Management",
    readTime: "8 min read",
    date: "June 14, 2026",
    description:
      "A technical walkthrough on correlating deployment commits, parsing telemetry metadata, and leveraging GPT-4/Claude for automated incident responses.",
    body: [
      {
        heading: "1. The Devastating Cost of Alert Noise",
        paragraphs: [
          "Traditional monitoring platforms report when thresholds are breached, but they dump raw stack traces and log streams directly onto developers. During an active incident, engineers waste time searching through logs or matching commit history graphs to find out what broke.",
          "AI Incident Analysis automates this workflow. By parsing incident context (error streams, API metadata, call traces) alongside commit histories, LLMs provide clear, plain-English answers to resolve production bugs.",
        ],
      },
      {
        heading: "2. Calculating Standard-Deviation Anomaly Z-Scores",
        paragraphs: [
          "To prevent alert fatigue, ObservabilityOS does not rely on static thresholds. Instead, it evaluates telemetry in real-time using rolling Z-Score models. When error frequencies exceed a standard deviation of 3, an anomaly is flagged.",
          "This adaptively fits weekly and daily usage curves, meaning harmless scheduled backups do not trigger alerts at 3 AM.",
        ],
      },
      {
        heading: "3. Generating Structured Post-Mortems dynamically",
        paragraphs: [
          "Upon detecting an anomaly, the platform gathers the surrounding context: matching error trace logs, environment configurations, and GitHub commit diffs. It packages this into structured prompts for GPT-4 or Claude, producing a complete post-mortem report in seconds:",
          "Developers receive an alert outlining: (1) What happened, (2) The exact commit SHA that introduced the regression, and (3) A recommended fix.",
        ],
        code: `## [Incident #29401] - Payments Microservice Outage
- **Severity**: Critical (Anomaly Z-Score: +4.8)
- **Root Cause**: Database timeout spike on POST /api/payments
- **Correlated Commit**: 8f3a021 ("Update SQL query mapping in userModel.ts")
- **Diagnosis**: Missing index on customer_id field combined with thread pool locking.
- **Recommended Action**: Revert commit 8f3a021 or run migration script index_customer.sql.`,
        codeLang: "markdown",
      },
    ],
  },
  "log-analytics-best-practices": {
    title:
      "Modern Log Analytics Best Practices: Redaction, Search, and Storage",
    slug: "log-analytics-best-practices",
    category: "Security & Compliance",
    readTime: "7 min read",
    date: "June 10, 2026",
    description:
      "Developer guidelines on scrubbing sensitive client data at the local agent level, optimizing search queries, and avoiding logging compliance traps.",
    body: [
      {
        heading: "1. The Compliance Risk of Logging Sensitive Data",
        paragraphs: [
          "Logging database connection strings, client email addresses, authorization headers, or plain-text credentials violates key security compliance standards (SOC2, GDPR, HIPAA). Sending these logs to cloud indexes exposes your organization to severe security and regulatory risks.",
          "A robust log design system must scrub telemetry at the source. Secrets should never be written to disk or sent over network sockets.",
        ],
      },
      {
        heading: "2. Setting up Client-Side PII Scrubbing Rules",
        paragraphs: [
          "ObservabilityOS includes a high-performance local scrubbing engine (scrubber.ts). It runs recursive regex algorithms directly on object fields, string parameters, and arrays before they leave the application memory space.",
          "This redacts sensitive objects (like Authorization headers or JWT tokens) at the host level. The cloud indexer only receives sanitized values.",
        ],
        code: `import { createScrubber } from "@observability-os/sdk";

const scrubber = createScrubber({
  redactKeys: ["password", "token", "credit_card"],
  customPatterns: [
    { name: "SocialSecurity", regex: /\\d{3}-\\d{2}-\\d{4}/g }
  ]
});

const cleanPayload = scrubber.scrub({
  msg: "User login failure",
  user: "alex@example.com",
  password: "super_secret_password_123"
});
// Outcome: { msg: "User login failure", user: "alex@example.com", password: "[REDACTED]" }`,
        codeLang: "typescript",
      },
      {
        heading: "3. Optimizing High-Throughput Search Indices",
        paragraphs: [
          "When searching through gigabytes of logs, query performance is critical. Instead of executing recursive regex matches across raw tables, leverage Lucene-based search indexes.",
          "Structuring your logs as flat JSON key-value blocks enables faster indexing, lowering query latency from minutes to milliseconds.",
        ],
      },
    ],
  },
};

export async function generateStaticParams() {
  return Object.keys(GUIDES).map((slug) => ({
    slug,
  }));
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const guide = GUIDES[resolvedParams.slug];

  if (!guide) {
    return { title: "Not Found" };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://observabilityos.com";

  return {
    title: `${guide.title} | ObservabilityOS Guides`,
    description: guide.description,
    alternates: {
      canonical: `${baseUrl}/guides/${guide.slug}`,
    },
    openGraph: {
      title: `${guide.title} | ObservabilityOS Guides`,
      description: guide.description,
      url: `${baseUrl}/guides/${guide.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${guide.title} | ObservabilityOS Guides`,
      description: guide.description,
    },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const resolvedParams = await params;
  const guide = GUIDES[resolvedParams.slug];

  if (!guide) {
    notFound();
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://observabilityos.com";

  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: guide.title,
    description: guide.description,
    inLanguage: "en-US",
    datePublished: "2026-06-12T00:00:00Z",
    mainEntityOfPage: `${baseUrl}/guides/${guide.slug}`,
    publisher: {
      "@type": "Organization",
      name: "ObservabilityOS",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/favicon.ico`,
      },
    },
    author: {
      "@type": "Organization",
      name: "ObservabilityOS Dev Team",
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleSchema) }}
      />

      {/* Background patterns */}
      <div className="absolute top-0 left-1/4 w-120 h-120 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-120 h-120 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/75 border-b border-slate-900/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight bg-linear-to-r from-white to-slate-400 bg-clip-text text-transparent">
              ObservabilityOS
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-12">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold font-mono uppercase tracking-wider mb-8">
          <Link href="/" className="hover:text-slate-300 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-600">Guides</span>
          <span>/</span>
          <span className="text-indigo-400">{guide.category}</span>
        </nav>

        {/* Article Header */}
        <header className="mb-12 border-b border-slate-900 pb-8">
          <span className="text-[10px] font-bold font-mono text-indigo-500 uppercase tracking-widest block mb-3">
            {guide.category}
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            {guide.title}
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6 font-medium">
            {guide.description}
          </p>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              {guide.date}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              {guide.readTime}
            </span>
          </div>
        </header>

        {/* Article Content */}
        <article className="prose prose-slate prose-invert max-w-none mb-16 font-sans">
          {guide.body.map((section, idx) => (
            <div key={idx} className="mb-10 space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-150 tracking-tight">
                {section.heading}
              </h2>
              {section.paragraphs.map((para, pIdx) => (
                <p
                  key={pIdx}
                  className="text-slate-450 text-sm sm:text-base leading-relaxed"
                >
                  {para}
                </p>
              ))}
              {section.code && (
                <pre className="bg-slate-900/60 border border-slate-900 p-5 rounded-xl overflow-x-auto text-xs font-mono leading-relaxed text-indigo-200">
                  <code>{section.code}</code>
                </pre>
              )}
            </div>
          ))}
        </article>

        {/* CTA section */}
        <section className="bg-radial from-slate-900/60 to-slate-950 border border-slate-900 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-4 text-white">
            Get Started with ObservabilityOS
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8 leading-relaxed">
            Ready to reduce alert noise and automate incident post-mortems?
            Connect your systems in under 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-950 font-bold h-11 px-6 rounded-xl transition-all"
            >
              <Github className="w-4 h-4" />
              Sign Up with GitHub
            </Link>
            <Link
              href="https://docs.observabilityos.com"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 h-11 px-6 rounded-xl transition-all font-semibold"
            >
              <Terminal className="w-4 h-4 text-indigo-400" />
              Read Setup Docs
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-600 font-mono">
        <div>
          &copy; {new Date().getFullYear()} ObservabilityOS. All rights
          reserved. Open Source.
        </div>
      </footer>
    </div>
  );
}
