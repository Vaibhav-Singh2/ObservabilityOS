import { notFound } from "next/navigation";
import Link from "next/link";
import { Activity, Github, Terminal, Clock, Calendar } from "lucide-react";
import type { Metadata } from "next";

interface BlogPost {
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

const BLOG_POSTS: Record<string, BlogPost> = {
  "opentelemetry-zero-config-setup": {
    title:
      "Zero-Config OpenTelemetry Setup: From Zero to Production in 5 Minutes",
    slug: "opentelemetry-zero-config-setup",
    category: "Telemetry",
    readTime: "5 min read",
    date: "June 20, 2026",
    description:
      "Skip the YAML maze. Learn how to instrument any Node.js service with a single npm install command and get production-grade telemetry streaming in under five minutes.",
    body: [
      {
        heading: "1. The Pain of Traditional Instrumentation",
        paragraphs: [
          "Setting up traditional observability pipelines often involves days of configuring collectors, exporters, and proprietary agents. Teams spend more time debugging their monitoring setup than actually using it.",
          "ObservabilityOS takes a different approach. Our zero-config SDK bundles everything you need into a single dependency. No collector daemon, no YAML pipelines, no exporter routing.",
        ],
      },
      {
        heading: "2. One Command Setup",
        paragraphs: [
          "Start by installing the SDK in any Node.js or TypeScript project:",
          "That is it. The SDK automatically patches console.log, captures unhandled exceptions, and begins streaming structured telemetry to the ObservabilityOS ingestion endpoint. PII scrubbing is enabled by default.",
        ],
        code: `npm install @observability-os/sdk`,
        codeLang: "bash",
      },
      {
        heading: "3. What Happens Under the Hood",
        paragraphs: [
          "On initialization, the SDK creates an in-memory ring buffer for high-throughput batching. Logs are stored instantly in memory and flushed asynchronously in the background. The non-blocking queue ensures zero added latency to your application.",
          "The built-in scrubber automatically redacts credentials, JWT tokens, credit card numbers, and custom regex patterns before any data leaves your process. Your cloud indexer only receives sanitized payloads.",
          "Within seconds of your first log, the dashboard will display your service health, error rates, and latency metrics. No configuration required.",
        ],
      },
    ],
  },
  "ai-root-cause-analysis-explained": {
    title:
      "AI-Powered Root Cause Analysis: How LLMs Are Changing Incident Response",
    slug: "ai-root-cause-analysis-explained",
    category: "AI",
    readTime: "7 min read",
    date: "June 18, 2026",
    description:
      "How GPT-4 and Claude transform raw telemetry and commit history into plain-English incident post-mortems. A deep dive into prompt engineering for SRE workflows.",
    body: [
      {
        heading: "1. The Signal-to-Noise Problem in Incident Response",
        paragraphs: [
          "When an incident strikes, engineers are flooded with raw data: stack traces, error logs, metric spikes, and alert notifications. The critical question is not what data is available but how to correlate it into actionable insight.",
          "Traditional dashboards require manual correlation across multiple views. AI-powered root cause analysis automates this by ingesting all incident context and producing a structured, plain-English summary.",
        ],
      },
      {
        heading: "2. How the AI Pipeline Works",
        paragraphs: [
          "Upon detecting an anomaly, ObservabilityOS gathers surrounding context: matching error trace logs, environment configurations, and GitHub commit diffs. It packages this into structured prompts for a large language model.",
          "The LLM analyzes the correlation between the anomaly timestamp, recent deployments, and error patterns to identify the most probable root cause. The result is a complete post-mortem delivered in seconds.",
        ],
        code: `## Incident #29401 - Payments Microservice Outage
- **Severity**: Critical (Z-Score: +4.8)
- **Root Cause**: Database timeout on POST /api/payments
- **Correlated Commit**: 8f3a021 ("Update SQL query mapping in userModel.ts")
- **Diagnosis**: Missing index on customer_id with thread pool locking
- **Action**: Revert commit 8f3a021 or run migration index_customer.sql`,
        codeLang: "markdown",
      },
      {
        heading: "3. Prompt Engineering for SRE Workflows",
        paragraphs: [
          "The effectiveness of AI incident analysis depends on prompt structure. A well-designed prompt includes: anomaly context, relevant log excerpts, commit history, and environment metadata.",
          "ObservabilityOS continuously refines its prompt templates based on incident resolution outcomes, learning which context signals correlate with accurate root cause identification.",
        ],
      },
    ],
  },
  "pii-scrubbing-at-the-edge": {
    title: "Why Your Monitoring Pipeline Needs PII Scrubbing at the Edge",
    slug: "pii-scrubbing-at-the-edge",
    category: "Security",
    readTime: "6 min read",
    date: "June 16, 2026",
    description:
      "Sending raw logs to the cloud is a compliance time bomb. Learn how client-side PII redaction works and why it is critical for SOC 2 and GDPR compliance.",
    body: [
      {
        heading: "1. The Compliance Risk of Cloud Logging",
        paragraphs: [
          "Every log statement in your application is a potential compliance violation. Database connection strings, customer email addresses, authorization headers, and API keys frequently end up in log output during debugging.",
          "When these logs are shipped to a cloud observability provider, you are sending sensitive data across the network and storing it in third-party infrastructure. This creates exposure under SOC 2, GDPR, and HIPAA regulations.",
        ],
      },
      {
        heading: "2. Edge Scrubbing: Redact Before Transit",
        paragraphs: [
          "ObservabilityOS takes a privacy-first approach: PII is redacted on your own infrastructure before any data leaves the process. The built-in scrubber runs recursive regex algorithms directly on object fields, string parameters, and arrays.",
          "This means sensitive data never hits the network, never reaches our servers, and never appears in log indexes. The cloud tier only receives sanitized telemetry.",
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
  email: "user@example.com",
  password: "super_secret"
});
// → { msg: "User login failure", email: "user@example.com", password: "[REDACTED]" }`,
        codeLang: "typescript",
      },
      {
        heading: "3. Configurable Redaction Rules",
        paragraphs: [
          "The scrubber ships with sensible defaults for common sensitive fields, but you can extend it with custom regex patterns for domain-specific data. Rules can be scoped per service, environment, or log level.",
          "This gives security teams fine-grained control over data governance without slowing down developers.",
        ],
      },
    ],
  },
  "log-anomaly-detection-zscore-vs-ml": {
    title: "Log Anomaly Detection: Z-Score vs Machine Learning Approaches",
    slug: "log-anomaly-detection-zscore-vs-ml",
    category: "Engineering",
    readTime: "8 min read",
    date: "June 14, 2026",
    description:
      "A technical comparison of statistical Z-score baselines versus ML-based anomaly detection for production log monitoring. When to use each and how they complement each other.",
    body: [
      {
        heading: "1. Why Anomaly Detection Matters",
        paragraphs: [
          "Static threshold alerts are the leading cause of alert fatigue. A CPU spike at 3 AM during a backup job triggers a page even though the system is healthy. Modern anomaly detection adapts to traffic patterns rather than firing on fixed thresholds.",
          "ObservabilityOS uses a hybrid approach: statistical Z-score analysis for real-time detection and ML models for pattern recognition over longer time windows.",
        ],
      },
      {
        heading: "2. Z-Score: Fast and Interpretable",
        paragraphs: [
          "The Z-score measures how many standard deviations a data point is from the rolling mean. A Z-score above 3 indicates a statistically significant anomaly. This is lightweight, explainable, and works well for metrics with normal distributions like error rates and latency.",
          "The key advantage is speed: Z-scores can be calculated server-side on every ingestion batch with minimal overhead. Engineers can inspect exactly why an alert fired.",
        ],
        code: `// Simplified rolling Z-score calculation
function calculateZScore(value, window) {
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  const variance = window.reduce((s, v) => s + (v - mean) ** 2, 0) / window.length;
  const stdDev = Math.sqrt(variance);
  return stdDev === 0 ? 0 : (value - mean) / stdDev;
}`,
        codeLang: "typescript",
      },
      {
        heading: "3. ML Approaches: Pattern Recognition at Scale",
        paragraphs: [
          "Machine learning models excel at detecting subtle patterns that Z-scores miss: gradual drift, seasonal correlations across services, and multi-dimensional anomalies. However, they require training data, more compute, and are harder to debug.",
          "ObservabilityOS uses ML for weekly trend analysis and capacity planning, while Z-scores handle real-time incident detection. This gives you the speed of statistical methods with the depth of ML-based insights.",
        ],
      },
    ],
  },
};

export async function generateStaticParams() {
  return Object.keys(BLOG_POSTS).map((slug) => ({
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
  const post = BLOG_POSTS[resolvedParams.slug];

  if (!post) {
    return { title: "Not Found" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    title: `${post.title} | ObservabilityOS Blog`,
    description: post.description,
    alternates: {
      canonical: `${baseUrl}/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | ObservabilityOS Blog`,
      description: post.description,
      url: `${baseUrl}/blog/${post.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | ObservabilityOS Blog`,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const resolvedParams = await params;
  const post = BLOG_POSTS[resolvedParams.slug];

  if (!post) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    inLanguage: "en-US",
    datePublished: new Date(post.date).toISOString(),
    mainEntityOfPage: `${baseUrl}/blog/${post.slug}`,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="absolute top-0 left-1/4 w-120 h-120 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-120 h-120 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

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
              href="/blog"
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
            >
              Back to Blog
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-12">
        <nav className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold font-mono uppercase tracking-wider mb-8">
          <Link href="/" className="hover:text-slate-300 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-slate-300 transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-indigo-400">{post.category}</span>
        </nav>

        <header className="mb-12 border-b border-slate-900 pb-8">
          <span className="text-[10px] font-bold font-mono text-indigo-500 uppercase tracking-widest block mb-3">
            {post.category}
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            {post.title}
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6 font-medium">
            {post.description}
          </p>
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              {post.date}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              {post.readTime}
            </span>
          </div>
        </header>

        <article className="prose prose-slate prose-invert max-w-none mb-16 font-sans">
          {post.body.map((section, idx) => (
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
              href={process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:3001"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 h-11 px-6 rounded-xl transition-all font-semibold"
            >
              <Terminal className="w-4 h-4 text-indigo-400" />
              Read Setup Docs
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-600 font-mono">
        <div>
          &copy; {new Date().getFullYear()} ObservabilityOS. All rights
          reserved. Open Source.
        </div>
      </footer>
    </div>
  );
}
