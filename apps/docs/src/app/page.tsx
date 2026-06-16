import Link from "next/link";
import {
  Rocket,
  Layers,
  Terminal,
  Milestone,
  Activity,
  ChevronRight,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { getAllDocsForSearch } from "@/lib/docs";
import LandingHeaderAndSearch from "@/components/LandingHeaderAndSearch";
import LandingHeroSearch from "@/components/LandingHeroSearch";

export const metadata = {
  title: "ObservabilityOS Documentation & Developer Reference Guides",
  description:
    "Explore the setup instructions, architecture design specifications, API schemas, security models, and developer guides for ObservabilityOS.",
  alternates: {
    canonical: process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:3001",
  },
};

export default function Page() {
  const searchIndex = getAllDocsForSearch();
  const baseUrl = process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:3001";

  const siteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ObservabilityOS Docs",
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const categories = [
    {
      title: "Getting Started",
      description:
        "Set up your sandbox, install dependencies, and start shipping telemetry logs in minutes.",
      icon: Rocket,
      color:
        "from-blue-500/20 to-indigo-500/20 border-indigo-500/10 hover:border-indigo-500/30 text-indigo-400",
      links: [
        {
          title: "Introduction",
          href: "/docs/introduction",
          desc: "Platform overview & capabilities",
        },
        {
          title: "Quick Start",
          href: "/docs/quickstart",
          desc: "Ship your first telemetry log",
        },
        {
          title: "Installation",
          href: "/docs/installation",
          desc: "Environment setups & requirements",
        },
        {
          title: "Local Development",
          href: "/docs/development",
          desc: "Sandbox debugging & testing",
        },
      ],
    },
    {
      title: "Core Architecture",
      description:
        "Deep dive into the monorepo topology, log ingestion flow, and anomaly detection loops.",
      icon: Layers,
      color:
        "from-purple-500/20 to-fuchsia-500/20 border-purple-500/10 hover:border-purple-500/30 text-purple-400",
      links: [
        {
          title: "System Architecture",
          href: "/docs/architecture",
          desc: "Monorepo topology & pipelines",
        },
        {
          title: "Database Schemas",
          href: "/docs/database",
          desc: "MongoDB Mongoose & Redis cache",
        },
        {
          title: "Security Policy",
          href: "/docs/security",
          desc: "Encryption & PII scrubbing rules",
        },
      ],
    },
    {
      title: "Reference Guides",
      description:
        "Complete REST API specifications, Docker configurations, and operational troubleshooting manuals.",
      icon: Terminal,
      color:
        "from-emerald-500/20 to-teal-500/20 border-emerald-500/10 hover:border-emerald-500/30 text-emerald-400",
      links: [
        {
          title: "API Specification",
          href: "/docs/api",
          desc: "Ingest, Metrics, and queries API",
        },
        {
          title: "Production Deployment",
          href: "/docs/deployment",
          desc: "Docker & Vercel configuration",
        },
        {
          title: "Troubleshooting Guide",
          href: "/docs/troubleshooting",
          desc: "Common errors & database fixes",
        },
        {
          title: "Technical FAQ",
          href: "/docs/faq",
          desc: "OpenTelemetry & privacy details",
        },
      ],
    },
    {
      title: "Community & Releases",
      description:
        "Find branching protocols, contribution rules, roadmap milestones, and release changelogs.",
      icon: Milestone,
      color:
        "from-amber-500/20 to-orange-500/20 border-amber-500/10 hover:border-amber-500/30 text-amber-450",
      links: [
        {
          title: "Contributing Guide",
          href: "/docs/contributing",
          desc: "Branching workflow & reviews",
        },
        {
          title: "Product Roadmap",
          href: "/docs/roadmap",
          desc: "Completed & planned milestones",
        },
        {
          title: "Release Changelog",
          href: "/docs/changelog",
          desc: "Feature history & tags",
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
      />

      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden relative selection:bg-indigo-500 selection:text-white">
        {/* Background Decorative Gradients & Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40 z-0 h-[600px]" />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-650/10 blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="absolute top-[350px] right-[10%] w-[350px] h-[250px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none z-0" />

        {/* Client side Header & Search Dialog */}
        <LandingHeaderAndSearch searchIndex={searchIndex} />

        {/* Hero Section */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 md:py-20 flex flex-col items-center justify-center relative z-10">
          <div className="max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/15 bg-indigo-500/5 text-indigo-400 text-xs font-mono font-bold animate-pulse">
              <Activity className="w-3.5 h-3.5" />
              <span>v1.0.0 Production Release</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.15]">
              <span className="bg-linear-to-b from-white to-slate-300 bg-clip-text text-transparent">
                ObservabilityOS
              </span>
              <br />
              <span className="bg-linear-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                DevOps Intelligence Platform
              </span>
            </h1>

            <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto font-medium">
              Explore deep technical guides, architecture specifications, API
              references, and deployment pipelines. Everything you need to scale
              log analytics.
            </p>

            {/* Interactive Search Trigger Component */}
            <LandingHeroSearch />
          </div>

          {/* Feature Cards Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mt-16 md:mt-24">
            {categories.map((cat, index) => {
              const Icon = cat.icon;
              return (
                <div
                  key={index}
                  className="group relative rounded-2xl border border-slate-900 bg-slate-950/40 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-slate-900/10 hover:border-slate-800 hover:shadow-[0_0_40px_-15px_rgba(99,102,241,0.15)] flex flex-col gap-6"
                >
                  {/* Header of Card */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl bg-linear-to-br border shadow-md flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${cat.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg text-slate-100 group-hover:text-white transition-colors">
                        {cat.title}
                      </h3>
                      <p className="text-slate-400 text-xs leading-relaxed font-medium">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  {/* Document Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-4 border-t border-slate-900/60">
                    {cat.links.map((link, lIdx) => (
                      <Link
                        key={lIdx}
                        href={link.href}
                        className="group/link flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-slate-900 hover:bg-slate-950/90 transition-all duration-200 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{link.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono font-medium truncate mt-0.5 group-hover/link:text-slate-450 transition-colors">
                            {link.desc}
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-650 group-hover/link:text-indigo-400 group-hover/link:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Developer CTA Section */}
          <section className="w-full max-w-5xl mt-16 md:mt-24 p-6 md:p-8 rounded-2xl border border-indigo-500/10 bg-indigo-950/5 relative overflow-hidden backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-indigo-500/5 blur-[50px] rounded-full pointer-events-none" />

            <div className="space-y-2 text-center sm:text-left max-w-xl">
              <h3 className="font-bold text-lg text-slate-100">
                Looking for a quick integration?
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Jump straight into our step-by-step Quick Start guide.
                Initialize the server workspace, connect your logging agents,
                and visualize metrics instantly.
              </p>
            </div>

            <Link
              href="/docs/quickstart"
              className="flex items-center gap-2 bg-indigo-650 hover:bg-indigo-650/90 text-white font-bold text-xs px-5 py-3.5 rounded-xl shadow-lg shadow-indigo-600/10 transition-all shrink-0 cursor-pointer"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900/80 bg-slate-950/80 py-8 relative z-10 mt-12">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-600" />
              <span>
                © {new Date().getFullYear()} ObservabilityOS Dev Team. Open
                Source.
              </span>
            </div>

            <div className="flex items-center gap-4 font-semibold">
              <a
                href="https://github.com/Vaibhav-Singh2/ObservabilityOS"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-350 transition-colors flex items-center gap-1 cursor-pointer"
              >
                GitHub <ArrowUpRight className="w-3 h-3 text-slate-600" />
              </a>
              <span className="text-slate-800">|</span>
              <Link
                href="/docs/introduction"
                className="hover:text-slate-350 transition-colors cursor-pointer"
              >
                Docs
              </Link>
              <span className="text-slate-800">|</span>
              <Link
                href="/docs/api"
                className="hover:text-slate-350 transition-colors cursor-pointer"
              >
                API Spec
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
