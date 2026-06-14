import Link from "next/link";
import { Github, Activity, Shield, Terminal, Zap } from "lucide-react";

export const metadata = {
  title: "ObservabilityOS — AI-Native DevOps Intelligence Platform",
  description:
    "Transform raw logs into structured AI post-mortems, detect anomalies instantly, and solve incidents 10x faster.",
};

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans overflow-hidden">
      {/* Background gradients for premium aesthetic */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/75 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              ObservabilityOS
            </span>
          </div>

          <div>
            <a
              id="header_login_btn"
              href="/api/auth/github"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 px-4 h-9 rounded-lg text-sm font-medium transition-all duration-200"
            >
              <Github className="w-4 h-4" />
              Sign In
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-20 flex flex-col items-center justify-center relative z-10">
        <div className="text-center max-w-3xl flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-8 animate-pulse">
            <Zap className="w-3.5 h-3.5" />
            AI-Native Observability
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Go from raw logs to AI post-mortems in seconds.
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl leading-relaxed mb-10">
            ObservabilityOS ingests structured logs, detects statistical
            anomalies in real time, and automatically compiles root-cause
            summaries that save hours of debugging.
          </p>

          {/* Call to Action Card */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-8 backdrop-blur-sm max-w-md w-full shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-2xl pointer-events-none" />
            <h2 className="text-xl font-bold text-slate-200 mb-2">
              Get Started Free
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Connect your GitHub account to set up your first project and
              receive your ingestion keys.
            </p>
            <a
              id="landing_github_oauth_btn"
              href="/api/auth/github"
              className="w-full inline-flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-950 font-semibold h-12 rounded-xl transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-white/5"
            >
              <Github className="w-5 h-5" />
              Sign up with GitHub
            </a>
            <div className="mt-4 text-[11px] text-slate-500 flex justify-center gap-4">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-500" /> Secure OAuth
              </span>
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3 text-indigo-500" /> One-line SDK
                config
              </span>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="mt-32 w-full grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/20 border border-slate-900/60 p-6 rounded-xl hover:border-slate-800 transition-colors duration-200">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <Terminal className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">
              High-Throughput SDK
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Log directly from your services with a zero-dependency package.
              Features memory-buffered background batching and fail-safe
              flushes.
            </p>
          </div>

          <div className="bg-slate-900/20 border border-slate-900/60 p-6 rounded-xl hover:border-slate-800 transition-colors duration-200">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">
              Anomaly Detection
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Detect sudden latency spikes or surge in error rates automatically
              without manual threshold settings using statistical modeling.
            </p>
          </div>

          <div className="bg-slate-900/20 border border-slate-900/60 p-6 rounded-xl hover:border-slate-800 transition-colors duration-200">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">
              AI Incident Reports
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Recieve instant Slack notifications containing clear, concise, and
              structured summaries of what went wrong, why, and which endpoints
              were affected.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/40 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            &copy; {new Date().getFullYear()} ObservabilityOS. All rights
            reserved.
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-300">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-slate-300">
              Terms of Service
            </a>
            <a href="#" className="hover:text-slate-300">
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
