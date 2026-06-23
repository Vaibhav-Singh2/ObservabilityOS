import Link from "next/link";
import {
  Activity,
  Github,
  ShieldAlert,
  Scale,
  CheckSquare,
} from "lucide-react";
import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Terms of Service | ObservabilityOS",
  description:
    "Read our terms of service: Licensing options, user responsibilities, SLA terms, and billing guidelines.",
  alternates: {
    canonical: `${baseUrl}/terms`,
  },
  openGraph: {
    title: "Terms of Service | ObservabilityOS",
    description:
      "Read our terms of service: Licensing options, user responsibilities, SLA terms, and billing guidelines.",
    url: `${baseUrl}/terms`,
    siteName: "ObservabilityOS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service | ObservabilityOS",
    description:
      "Read our terms of service: Licensing options, user responsibilities, SLA terms, and billing guidelines.",
    creator: "@observabilityos",
  },
};

export default function TermsPage() {
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: "Terms of Service | ObservabilityOS",
              description:
                "Read our terms of service: Licensing options, user responsibilities, SLA terms, and billing guidelines.",
              inLanguage: "en-US",
              isPartOf: {
                "@type": "WebSite",
                name: "ObservabilityOS",
                url: baseUrl,
              },
            }),
          }}
        />
        <section className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-6 font-mono">
            Legal Terms
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-4 bg-linear-to-b from-white to-slate-400 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-slate-400 text-sm font-mono">
            Last Updated: June 15, 2026
          </p>
        </section>

        <article className="prose prose-invert max-w-none text-slate-300 space-y-8 text-sm sm:text-base leading-relaxed">
          <p>
            Welcome to ObservabilityOS. By accessing or using our developer
            tools, software development kits (SDKs), cloud-hosted dashboards,
            and API endpoints (collectively, the &quot;Service&quot;), you agree
            to be bound by these Terms of Service (&quot;Terms&quot;).
          </p>

          <div className="border-t border-slate-900 pt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-400" />
              1. Services and License Grants
            </h2>
            <p>
              We license certain portions of the Service under distinct
              agreements:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Source Available Code:</strong> Standard repository
                components are licensed under the ObservabilityOS Source
                Available License Agreement. You may inspect and run the code
                for internal evaluation.
              </li>
              <li>
                <strong>Commercial Licensing:</strong> High-throughput,
                production deployment clusters require a valid commercial
                license subscription (refer to our Commercial License terms).
              </li>
              <li>
                <strong>Hosted Cloud Console:</strong> We grant you a revocable,
                non-exclusive, non-transferable license to access our dashboards
                for your project&apos;s monitoring purposes.
              </li>
            </ul>
          </div>

          <div className="border-t border-slate-900 pt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-400" />
              2. Acceptable Use and Rate Limits
            </h2>
            <p>
              To maintain system performance and stability for all tenants, you
              agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Not deploy the client SDKs in a way that generates intentional
                traffic loops or distributed denial attacks.
              </li>
              <li>
                Adhere to the rate limits matching your active subscription
                tier. Payloads exceeding these bounds may be delayed or rejected
                at our ingestion gateway.
              </li>
              <li>
                Scrub database credentials and cryptographic tokens before
                uploading telemetry (utilizing our built-in local SDK scrubbing
                engine).
              </li>
            </ul>
          </div>

          <div className="border-t border-slate-900 pt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
              3. Disclaimer of Warranties & Limitation of Liability
            </h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY
              KIND, EXPRESS OR IMPLIED. IN NO EVENT SHALL OBSERVABILITYOS BE
              LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN
              ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM OR IN
              CONNECTION WITH YOUR USE OF THE SERVICE.
            </p>
          </div>

          <div className="border-t border-slate-900 pt-8 space-y-4">
            <h2 className="text-xl font-bold text-white">
              4. Subscription Billing & Cancellations
            </h2>
            <p>
              Paid subscription tiers are billed on a flat, monthly cycle. You
              can cancel your subscription plan at any time through the billing
              dashboard. Upon cancellation, your project metrics remain
              accessible until the end of your current active billing period.
            </p>
          </div>

          <div className="border-t border-slate-900 pt-8 space-y-4">
            <h2 className="text-xl font-bold text-white">
              5. Governing Law & Amendments
            </h2>
            <p>
              These terms are governed by and construed in accordance with the
              laws of Delaware, without regard to conflict of law principles. We
              reserve the right to modify these terms. We will notify users of
              substantial changes by updating the last modified date of this
              page.
            </p>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-650 font-mono">
        <div>
          &copy; {new Date().getFullYear()} ObservabilityOS. All rights
          reserved. Source-Available.
        </div>
      </footer>
    </div>
  );
}
