import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Calendar,
  Clock,
  ChevronRight,
} from "lucide-react";
import type { Metadata } from "next";
import {
  BLOG_POSTS,
  BLOG_CATEGORIES,
  BLOG_AUTHORS,
  getFeaturedPost,
  getPostsByCategory,
} from "@/lib/blog-data";

export const metadata: Metadata = {
  title: "Blog | ObservabilityOS",
  description:
    "Engineering guides, AI observability deep dives, and DevOps best practices from the ObservabilityOS team. OpenTelemetry, SRE, incident management, and more.",
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

const CATEGORY_COLORS: Record<string, string> = {
  Observability: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  OpenTelemetry: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  "AI for SRE": "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  "Incident Management":
    "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Monitoring: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Production Engineering":
    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  DevOps: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  Telemetry: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  Security: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Engineering: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  AI: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
};

function getCategoryColor(cat: string) {
  return (
    CATEGORY_COLORS[cat] ?? "text-slate-400 bg-slate-500/10 border-slate-500/20"
  );
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeCategory = category || "All";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Blog | ObservabilityOS",
    description:
      "Engineering guides, AI observability deep dives, and DevOps best practices from the ObservabilityOS team.",
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: "ObservabilityOS",
      url: baseUrl,
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: `${baseUrl}/blog`,
        },
      ],
    },
  };

  const featured = getFeaturedPost();
  const featuredAuthor = BLOG_AUTHORS[featured.authorKey];

  const filteredPosts =
    activeCategory === "All"
      ? BLOG_POSTS
      : BLOG_POSTS.filter((p) => p.category === activeCategory);

  const showFeatured = activeCategory === "All";
  const allPosts = showFeatured
    ? filteredPosts.filter((p) => p.slug !== featured.slug)
    : filteredPosts;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden relative">
      {/* Ambient background */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/4 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-violet-500/4 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-cyan-500/3 rounded-full blur-[140px] pointer-events-none" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-900/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight bg-linear-to-r from-white to-slate-400 bg-clip-text text-transparent hidden min-[480px]:inline-block">
              ObservabilityOS
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link
              href="/blog"
              className="text-xs font-semibold text-indigo-400 hidden min-[380px]:inline-block"
            >
              Blog
            </Link>
            <Link
              href={process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:3001"}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors hidden min-[380px]:inline-block"
            >
              Docs
            </Link>
            <Link
              href="/"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold font-mono uppercase tracking-wider mb-10">
          <Link href="/" className="hover:text-slate-300 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-indigo-400">Blog</span>
        </nav>

        {/* Page header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-5 font-mono">
            Engineering Blog
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Production Intelligence,{" "}
            <span className="bg-linear-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Deeply Explained
            </span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-2xl">
            OpenTelemetry guides, AI-powered incident response, SRE best
            practices, and observability deep dives from the engineers who build
            ObservabilityOS.
          </p>
        </div>

        {/* Featured article */}
        {showFeatured && (
          <Link
            href={`/blog/${featured.slug}`}
            className="block group mb-14 bg-linear-to-br from-slate-900/60 to-slate-900/20 border border-slate-800/60 hover:border-indigo-500/30 rounded-3xl p-8 sm:p-10 transition-all duration-300 hover:shadow-[0_0_60px_rgba(99,102,241,0.07)] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <span
                  className={`text-[10px] font-bold font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border ${getCategoryColor(featured.category)}`}
                >
                  Featured · {featured.category}
                </span>
                {featured.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono text-slate-500 bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white group-hover:text-indigo-300 transition-colors mb-4 tracking-tight max-w-3xl">
                {featured.title}
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-2xl">
                {featured.description}
              </p>
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${featuredAuthor?.color ?? "bg-indigo-600"}`}
                  >
                    {featuredAuthor?.initials ?? "OO"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-300 leading-none">
                      {featuredAuthor?.name ?? "ObservabilityOS Team"}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {featuredAuthor?.role}
                    </p>
                  </div>
                </div>
                <span className="text-slate-700">·</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  {featured.date}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  {featured.readTime}
                </span>
                <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  Read article
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {BLOG_CATEGORIES.map((cat) => {
            const count =
              cat === "All"
                ? BLOG_POSTS.length
                : BLOG_POSTS.filter((p) => p.category === cat).length;
            if (count === 0) return null;
            const isActive = cat === activeCategory;
            return (
              <Link
                key={cat}
                href={
                  cat === "All"
                    ? "/blog"
                    : `/blog?category=${encodeURIComponent(cat)}`
                }
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  isActive
                    ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                    : "border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 bg-slate-900/40"
                }`}
              >
                {cat}
                <span
                  className={`ml-1.5 text-[10px] ${isActive ? "text-indigo-400" : "text-slate-600"}`}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Post grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-20">
          {allPosts.map((post) => {
            const author = BLOG_AUTHORS[post.authorKey];
            return (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col bg-slate-900/30 border border-slate-800/60 hover:border-slate-700/80 rounded-2xl p-6 transition-all duration-200 hover:bg-slate-900/50 hover:-translate-y-0.5"
              >
                {/* Category */}
                <span
                  className={`self-start text-[10px] font-bold font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border mb-4 ${getCategoryColor(post.category)}`}
                >
                  {post.category}
                </span>

                {/* Title */}
                <h2 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors mb-2.5 tracking-tight leading-snug flex-1">
                  {post.title}
                </h2>

                {/* Description */}
                <p className="text-slate-400 text-xs leading-relaxed mb-5 line-clamp-2">
                  {post.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono text-slate-600 bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 mt-auto">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${author?.color ?? "bg-indigo-600"}`}
                    >
                      {author?.initials ?? "OO"}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 leading-none">
                        {author?.name ?? "ObservabilityOS"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-600 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Newsletter CTA */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-900 bg-linear-to-br from-slate-900/80 to-slate-950 p-10 sm:p-14 text-center">
          <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-violet-500/5 pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/8 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-5 font-mono">
              Get ObservabilityOS Free
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-white tracking-tight">
              Stop debugging production at 3 AM
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8 leading-relaxed">
              AI-native observability. Zero-config setup. Incident root cause in
              seconds. Connect your stack in under 5 minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 px-7 rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20"
              >
                Start Free — No Credit Card
              </Link>
              <Link
                href={
                  process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:3001"
                }
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 h-11 px-7 rounded-xl transition-all font-semibold text-sm"
              >
                Read the Docs
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-600 font-mono mt-8">
        <div>
          &copy; {new Date().getFullYear()} ObservabilityOS. All rights
          reserved. Open Source.
        </div>
      </footer>
    </div>
  );
}
