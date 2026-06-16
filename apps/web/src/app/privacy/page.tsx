import Link from "next/link";
import { Activity, Github, Shield, Lock, Eye } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | ObservabilityOS",
  description:
    "Read our privacy commitment: Local telemetry scrubbing, GDPR/HIPAA compliance patterns, and secure incident data ingestion policies.",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden relative">
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
            <a
              href="https://github.com/Vaibhav-Singh2/ObservabilityOS"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <Link
              href="/"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
            >
              Launch Console
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-16">
        <section className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-6 font-mono">
            Security & Trust
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-4 bg-linear-to-b from-white to-slate-400 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-slate-400 text-sm font-mono">
            Last Updated: June 15, 2026
          </p>
        </section>

        <article className="prose prose-invert max-w-none text-slate-300 space-y-8 text-sm sm:text-base leading-relaxed">
          <p>
            At ObservabilityOS, we are committed to building an observability
            platform that respects your organization&apos;s privacy and keeps
            sensitive data safe. We design our client-side SDKs and ingestion
            engines with high-security scrubbing rules, ensuring that your
            customers&apos; Personally Identifiable Information (PII) is
            redacted before it ever leaves your network.
          </p>

          <div className="border-t border-slate-900 pt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              1. Telemetry Data & Local PII Scrubbing
            </h2>
            <p>
              Unlike traditional cloud logging applications, ObservabilityOS
              provides a local, client-side SDK scrubbing mechanism (via{" "}
              <code className="font-mono bg-slate-900 px-1 py-0.5 rounded text-indigo-300">
                scrubber.ts
              </code>
              ) that automatically processes all telemetry payloads.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Sensitive Parameter Redaction:</strong> Database
                passwords, authorization bearer headers, JWT tokens, credit card
                numbers, and custom regex pattern matches are automatically
                replaced with a{" "}
                <code className="font-mono text-indigo-300">[REDACTED]</code>{" "}
                string at the microservice application runtime.
              </li>
              <li>
                <strong>Ingestion Integrity:</strong> Only sanitized metrics,
                anonymized logs, and structural trace outlines are submitted to
                our ingestion gateways.
              </li>
            </ul>
          </div>

          <div className="border-t border-slate-900 pt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" />
              2. Data Encryption and Storage Security
            </h2>
            <p>
              For telemetry data stored on our platforms, we implement strict
              standard enterprise-grade compliance architectures:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Encryption in Transit:</strong> All web transactions and
                API calls are secured with Transport Layer Security (TLS 1.3).
              </li>
              <li>
                <strong>Encryption at Rest:</strong> All log fragments and trace
                metadata are stored in AES-256 encrypted storage volumes.
              </li>
              <li>
                <strong>Retention Lifespans:</strong> Customers specify custom
                retention periods. Once the configured threshold is met, index
                records are purged from both active memory caches and backups.
              </li>
            </ul>
          </div>

          <div className="border-t border-slate-900 pt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-400" />
              3. Information Collected
            </h2>
            <p>
              When you create an account, we retrieve basic profile metadata
              from GitHub (username, avatar URL, email addresses) to manage
              authentication and workspaces. We do not sell, trade, or share
              your profile details with external advertising brokers or tracking
              agencies.
            </p>
          </div>

          <div className="border-t border-slate-900 pt-8 space-y-4">
            <h2 className="text-xl font-bold text-white">
              4. GDPR and Compliance Alignment
            </h2>
            <p>
              By utilizing our local scrubbing SDK configurations, you satisfy
              standard GDPR and HIPAA compliance mandates regarding telemetry
              data. Under GDPR rules, you retain complete rights to view,
              export, delete, or restrict processing of your tenant profile
              configurations by contacting support.
            </p>
          </div>

          <div className="border-t border-slate-900 pt-8 space-y-4">
            <h2 className="text-xl font-bold text-white">
              5. Contact and Inquiries
            </h2>
            <p>
              If you have any questions about this privacy statement, data
              protection guidelines, or your developer workspace configuration,
              reach out to our privacy compliance officer at:
            </p>
            <p className="font-mono text-indigo-400">
              <a
                href="mailto:vaibhav.fullstack.dev@gmail.com"
                className="hover:underline"
              >
                vaibhav.fullstack.dev@gmail.com
              </a>
            </p>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-650 font-mono">
        <div>
          &copy; {new Date().getFullYear()} ObservabilityOS. All rights
          reserved. Open Source.
        </div>
      </footer>
    </div>
  );
}
