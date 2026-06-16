import Link from "next/link";
import {
  Activity,
  Calendar,
  Clock,
  ArrowRight,
  Github,
  Terminal,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | ObservabilityOS",
  description:
    "Engineering guides, AI observability deep dives, and DevOps best practices from the ObservabilityOS team.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/blog`,
  },
  openGraph: {
    title: "Blog | ObservabilityOS",
    description:
      "Engineering guides, AI observability deep dives, and DevOps best practices from the ObservabilityOS team.",
    url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/blog`,
    siteName: "ObservabilityOS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | ObservabilityOS",
    description:
      "Engineering guides, AI observability deep dives, and DevOps best practices from the ObservabilityOS team.",
    creator: "@observabilityos",
  },
};

interface BlogPost {
  title: string;
  slug: string;
  category: string;
  readTime: string;
  date: string;
  description: string;
}

const BLOG_POSTS: BlogPost[] = [
  {
    title:
      "Zero-Config OpenTelemetry Setup: From Zero to Production in 5 Minutes",
    slug: "opentelemetry-zero-config-setup",
    category: "Telemetry",
    readTime: "5 min read",
    date: "June 20, 2026",
    description:
      "Skip the YAML maze. Learn how to instrument any Node.js service with a single npm install command and get production-grade telemetry streaming in under five minutes.",
  },
  {
    title:
      "AI-Powered Root Cause Analysis: How LLMs Are Changing Incident Response",
    slug: "ai-root-cause-analysis-explained",
    category: "AI",
    readTime: "7 min read",
    date: "June 18, 2026",
    description:
      "How GPT-4 and Claude transform raw telemetry and commit history into plain-English incident post-mortems. A deep dive into prompt engineering for SRE workflows.",
  },
  {
    title: "Why Your Monitoring Pipeline Needs PII Scrubbing at the Edge",
    slug: "pii-scrubbing-at-the-edge",
    category: "Security",
    readTime: "6 min read",
    date: "June 16, 2026",
    description:
      "Sending raw logs to the cloud is a compliance time bomb. Learn how client-side PII redaction works and why it is critical for SOC 2 and GDPR compliance.",
  },
  {
    title: "Log Anomaly Detection: Z-Score vs Machine Learning Approaches",
    slug: "log-anomaly-detection-zscore-vs-ml",
    category: "Engineering",
    readTime: "8 min read",
    date: "June 14, 2026",
    description:
      "A technical comparison of statistical Z-score baselines versus ML-based anomaly detection for production log monitoring. When to use each and how they complement each other.",
  },
];

export default function BlogPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden relative">
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
          <Link
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-12">
        <nav className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold font-mono uppercase tracking-wider mb-8">
          <Link href="/" className="hover:text-slate-300 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-indigo-400">Blog</span>
        </nav>

        <header className="mb-12">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Blog
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl">
            Engineering guides, AI observability deep dives, and DevOps best
            practices from the ObservabilityOS team.
          </p>
        </header>

        <div className="space-y-6">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block group bg-slate-900/30 border border-slate-800/60 hover:border-slate-700/80 rounded-2xl p-6 sm:p-8 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold font-mono text-indigo-500 uppercase tracking-widest block mb-2">
                    {post.category}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-indigo-300 transition-colors mb-2 tracking-tight">
                    {post.title}
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {post.description}
                  </p>
                </div>
                <div className="hidden sm:flex items-center text-indigo-400 shrink-0 transition-transform group-hover:translate-x-1">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 font-mono">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {post.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {post.readTime}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <section className="max-w-4xl mx-auto px-6 w-full mb-16">
        <div className="bg-radial from-slate-900/60 to-slate-950 border border-slate-900 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
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
        </div>
      </section>

      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-600 font-mono">
        <div>
          &copy; {new Date().getFullYear()} ObservabilityOS. All rights
          reserved. Open Source.
        </div>
      </footer>
    </div>
  );
}
