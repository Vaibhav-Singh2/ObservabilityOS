import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Calendar,
  Clock,
  Github,
  ChevronRight,
  Terminal,
} from "lucide-react";
import type { Metadata } from "next";
import {
  BLOG_POSTS,
  BLOG_AUTHORS,
  getPostBySlug,
  getRelatedPosts,
  slugify,
} from "@/lib/blog-data";
import ReadingProgress from "@/components/ReadingProgress";
import BlogTableOfContents from "@/components/BlogTableOfContents";

// ─────────────────────────────────────────────
// Static params + metadata
// ─────────────────────────────────────────────

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Not Found" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    keywords: post.tags,
    alternates: { canonical: `${baseUrl}/blog/${post.slug}` },
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      url: `${baseUrl}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.dateISO,
      authors: [BLOG_AUTHORS[post.authorKey]?.name ?? "ObservabilityOS"],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle,
      description: post.metaDescription,
      creator: "@observabilityos",
    },
  };
}

// ─────────────────────────────────────────────
// Category colors
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const author = BLOG_AUTHORS[post.authorKey];
  const relatedPosts = getRelatedPosts(post);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const headings = post.body.map((s) => s.heading);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    inLanguage: "en-US",
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    mainEntityOfPage: `${baseUrl}/blog/${post.slug}`,
    keywords: post.tags.join(", "),
    author: {
      "@type": "Person",
      name: author?.name ?? "ObservabilityOS Team",
      url: `${baseUrl}/blog`,
    },
    publisher: {
      "@type": "Organization",
      name: "ObservabilityOS",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.png`,
      },
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Ambient */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/4 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-0 w-[400px] h-[400px] bg-violet-500/4 rounded-full blur-[100px] pointer-events-none" />

      {/* Reading progress */}
      <ReadingProgress />

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
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/blog"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden min-[380px]:inline">All Articles</span>
            </Link>
            <Link
              href="/"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
            >
              <span className="hidden sm:inline">Get Started Free</span>
              <span className="inline sm:hidden">Get Started</span>
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
          <Link href="/blog" className="hover:text-slate-300 transition-colors">
            Blog
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-indigo-400">{post.category}</span>
        </nav>

        {/* Article header */}
        <header className="mb-10 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2.5 mb-5">
            <span
              className={`text-[10px] font-bold font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border ${getCategoryColor(post.category)}`}
            >
              {post.category}
            </span>
            {post.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono text-slate-600 bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
            {post.title}
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-6 max-w-3xl">
            {post.description}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 pb-8 border-b border-slate-900">
            {/* Author */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${author?.color ?? "bg-indigo-600"}`}
              >
                {author?.initials ?? "OO"}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200 leading-none mb-0.5">
                  {author?.name ?? "ObservabilityOS Team"}
                </p>
                <p className="text-xs text-slate-500">{author?.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
              <span className="text-slate-700 hidden sm:inline-block">·</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                {post.date}
              </span>
              <span className="text-slate-700">•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                {post.readTime}
              </span>
            </div>
          </div>
        </header>

        {/* Two-column layout: article + ToC sidebar */}
        <div className="flex gap-12 items-start">
          {/* Article body */}
          <article id="article-body" className="flex-1 min-w-0 max-w-3xl">
            {post.body.map((section, idx) => (
              <section key={idx} className="mb-12">
                <h2
                  id={slugify(section.heading)}
                  className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-4 scroll-mt-24"
                >
                  {section.heading}
                </h2>

                {section.paragraphs?.map((para, pIdx) => (
                  <p
                    key={pIdx}
                    className="text-slate-400 text-sm sm:text-base leading-relaxed mb-4"
                  >
                    {para}
                  </p>
                ))}

                {section.list && (
                  <ul className="space-y-3 my-5">
                    {section.list.map((item, iIdx) => {
                      const colonIdx = item.indexOf(":");
                      const hasLabel = colonIdx > 0 && colonIdx < 60;
                      const label = hasLabel ? item.slice(0, colonIdx) : null;
                      const text = hasLabel
                        ? item.slice(colonIdx + 1).trim()
                        : item;
                      return (
                        <li
                          key={iIdx}
                          className="flex gap-3 text-sm text-slate-400 leading-relaxed"
                        >
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span>
                            {label && (
                              <span className="font-semibold text-slate-200">
                                {label}:{" "}
                              </span>
                            )}
                            {text}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {section.code && (
                  <div className="relative group my-5">
                    <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-t-xl px-4 py-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        {section.codeLang ?? "code"}
                      </span>
                    </div>
                    <pre className="bg-slate-900/50 border border-t-0 border-slate-800 rounded-b-xl overflow-x-auto p-5 text-xs font-mono leading-relaxed text-indigo-200">
                      <code>{section.code}</code>
                    </pre>
                  </div>
                )}

                {section.callout && (
                  <div className="my-5 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1.5">
                      {section.callout.title}
                    </p>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {section.callout.content}
                    </p>
                  </div>
                )}
              </section>
            ))}

            {/* Inline CTA */}
            <section className="bg-linear-to-br from-slate-900/80 to-slate-950 border border-slate-900 rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden mb-12">
              <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/6 rounded-full blur-[80px] pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-xl sm:text-2xl font-extrabold mb-3 text-white">
                  Stop debugging production in the dark
                </h2>
                <p className="text-slate-400 text-sm max-w-xl mx-auto mb-6 leading-relaxed">
                  ObservabilityOS gives every engineer AI-powered incident
                  intelligence. Zero config. Connects in 5 minutes.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 px-6 rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20"
                  >
                    Start Free — No Credit Card
                  </Link>
                  <Link
                    href={
                      process.env.NEXT_PUBLIC_DOCS_URL ||
                      "http://localhost:3001"
                    }
                    className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 h-10 px-6 rounded-xl transition-all font-semibold text-sm"
                  >
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    Read the Docs
                  </Link>
                </div>
              </div>
            </section>

            {/* Author card */}
            {author && (
              <div className="border border-slate-800/60 rounded-2xl p-6 bg-slate-900/20 mb-12">
                <p className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest mb-4">
                  About the Author
                </p>
                <div className="flex gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0 ${author.color}`}
                  >
                    {author.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-200 mb-0.5">
                      {author.name}
                    </p>
                    <p className="text-xs text-indigo-400 mb-3">
                      {author.role}
                    </p>
                    <p className="text-sm text-slate-400 leading-relaxed mb-3">
                      {author.bio}
                    </p>
                    <div className="flex gap-3">
                      {author.twitter && (
                        <a
                          href={`https://twitter.com/${author.twitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          @{author.twitter}
                        </a>
                      )}
                      {author.github && (
                        <a
                          href={`https://github.com/${author.github}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <Github className="w-3 h-3" />
                          {author.github}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Related posts */}
            {relatedPosts.length > 0 && (
              <div className="mb-12">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono mb-5">
                  Related Articles
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {relatedPosts.map((related) => {
                    const relAuthor = BLOG_AUTHORS[related.authorKey];
                    return (
                      <Link
                        key={related.slug}
                        href={`/blog/${related.slug}`}
                        className="group bg-slate-900/30 border border-slate-800/60 hover:border-slate-700/80 rounded-xl p-4 transition-all hover:-translate-y-0.5"
                      >
                        <span
                          className={`text-[9px] font-bold font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border mb-3 block w-fit ${getCategoryColor(related.category)}`}
                        >
                          {related.category}
                        </span>
                        <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors leading-snug mb-2">
                          {related.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-3">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${relAuthor?.color ?? "bg-indigo-600"}`}
                          >
                            {relAuthor?.initials ?? "OO"}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {related.readTime}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </article>

          {/* Sticky ToC sidebar — desktop only */}
          <aside className="hidden xl:block w-64 shrink-0">
            <div className="sticky top-28">
              <BlogTableOfContents headings={headings} />

              {/* Quick CTA in sidebar */}
              <div className="mt-8 p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5">
                <p className="text-xs font-bold text-indigo-300 mb-2">
                  Try ObservabilityOS free
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                  AI root cause analysis. Zero config setup. First service free.
                </p>
                <Link
                  href="/"
                  className="block text-center bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-all"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </aside>
        </div>
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
