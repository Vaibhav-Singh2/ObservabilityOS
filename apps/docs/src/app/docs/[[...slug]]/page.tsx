import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { marked } from "marked";
import {
  getDocBySlug,
  getPrevNextLinks,
  getAllDocsForSearch,
} from "@/lib/docs";
import DocsNavShell from "@/components/DocsNavShell";
import DocInteractivity from "@/components/DocInteractivity";
import { ArrowLeft, ArrowRight, Edit3, ChevronRight, Hash } from "lucide-react";

// Configure marked with a custom renderer for heading IDs to match our TOC IDs and convert document links
const renderer = new marked.Renderer();
renderer.heading = function (arg1: unknown, arg2?: unknown, arg3?: unknown) {
  let text = "";
  let depth = 2;
  let raw = "";

  if (typeof arg1 === "object" && arg1 !== null) {
    const obj = arg1 as Record<string, unknown>;
    text = String(obj.text || "");
    depth = Number(obj.depth || obj.level || 2);
    raw = String(obj.raw || text);
  } else {
    text = String(arg1 || "");
    depth = Number(arg2 || 2);
    raw = String(arg3 || text);
  }

  const cleanText = raw.replace(/[*_`]/g, "").trim();
  const id = cleanText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  return `<h${depth} id="${id}" class="group scroll-mt-20"><a href="#${id}" class="absolute -ml-6 pr-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 font-normal select-none">#</a>${text}</h${depth}>`;
};

renderer.link = function (arg1: unknown, arg2?: unknown, arg3?: unknown) {
  let href = "";
  let title = "";
  let text = "";

  if (typeof arg1 === "object" && arg1 !== null) {
    const obj = arg1 as Record<string, unknown>;
    href = String(obj.href || "");
    title = String(obj.title || "");
    text = String(obj.text || "");
  } else {
    href = String(arg1 || "");
    title = String(arg2 || "");
    text = String(arg3 || "");
  }

  // Resolve internal markdown links to docs route paths
  let resolvedHref = href;
  if (
    !href.startsWith("http://") &&
    !href.startsWith("https://") &&
    !href.startsWith("#") &&
    !href.startsWith("mailto:")
  ) {
    let cleanHref = href.replace(/\\/g, "/");
    if (cleanHref.startsWith("file:///")) {
      const parts = cleanHref.split("/ObservabilityOS/");
      if (parts.length > 1) {
        cleanHref = parts[1];
      } else {
        cleanHref = cleanHref.replace(/^file:\/\/\/(?:[a-zA-Z]:\/)?/, "");
      }
    }

    if (cleanHref.endsWith("packages/sdk/LICENSE")) {
      resolvedHref =
        "https://github.com/Vaibhav-Singh2/ObservabilityOS/blob/main/packages/sdk/LICENSE";
    } else if (cleanHref === "LICENSE" || cleanHref.endsWith("/LICENSE")) {
      resolvedHref = "/docs/license";
    } else if (cleanHref.toLowerCase().includes("commercial_license.md")) {
      resolvedHref = "/docs/commercial-license";
    } else if (cleanHref.endsWith(".md")) {
      const match =
        cleanHref.match(/\/([^/]+)\.md$/) || cleanHref.match(/^([^/]+)\.md$/);
      if (match) {
        resolvedHref = `/docs/${match[1].toLowerCase()}`;
      }
    } else if (!cleanHref.startsWith("/")) {
      resolvedHref = `https://github.com/Vaibhav-Singh2/ObservabilityOS/blob/main/${cleanHref}`;
    }
  }

  const titleAttr = title ? ` title="${title}"` : "";
  const isExternal =
    resolvedHref.startsWith("http://") || resolvedHref.startsWith("https://");
  const targetAttr = isExternal
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";

  return `<a href="${resolvedHref}"${titleAttr}${targetAttr}>${text}</a>`;
};

marked.use({ renderer });

interface PageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

/**
 * Pre-render all doc pages at build time into static HTML.
 *
 * This is critical for Vercel: instead of reading markdown files from the
 * filesystem at request time (which fails on Vercel's serverless functions
 * because Next.js can't trace dynamic fs.readFile calls), we read them once
 * during the build and generate static pages. All content is embedded in the
 * output bundle.
 */
export async function generateStaticParams() {
  const { getSidebarNav } = await import("@/lib/navigation");
  const nav = getSidebarNav();
  const params: { slug?: string[] }[] = [];

  for (const category of nav) {
    for (const item of category.items) {
      params.push({ slug: [item.slug] });
    }
  }
  return params;
}

export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const doc = getDocBySlug(resolvedParams.slug);

  if (!doc) {
    return {
      title: "Not Found",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:3001";

  return {
    title: doc.title,
    description: doc.description,
    alternates: {
      canonical: `${baseUrl}/docs/${doc.slug}`,
    },
    openGraph: {
      title: `${doc.title} | ObservabilityOS Docs`,
      description: doc.description,
      url: `${baseUrl}/docs/${doc.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${doc.title} | ObservabilityOS Docs`,
      description: doc.description,
    },
  };
}

function parseCallouts(html: string): string {
  const blockquoteRegex = /<blockquote>([\s\S]*?)<\/blockquote>/g;

  return html.replace(blockquoteRegex, (match, content) => {
    const alertMatch = content.match(
      /\[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\]/i,
    );
    if (!alertMatch) return match;

    const alertType = alertMatch[1].toUpperCase();
    let cleanContent = content.replace(
      /\[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\]/i,
      "",
    );

    cleanContent = cleanContent.replace(/^[\s\r\n|<br>|<p><\/p>]+/i, "").trim();
    if (cleanContent.startsWith("</p>")) {
      cleanContent = cleanContent.replace(/^<\/p>/, "");
    }
    if (!cleanContent.startsWith("<p>")) {
      cleanContent = `<p>${cleanContent}`;
    }

    let borderClass = "border-l-4 border-indigo-500 bg-indigo-500/5";
    let textClass = "text-indigo-400";
    let title = "Note";
    let iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;

    if (alertType === "WARNING") {
      borderClass = "border-l-4 border-amber-500 bg-amber-500/5";
      textClass = "text-amber-500";
      title = "Warning";
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else if (alertType === "TIP") {
      borderClass = "border-l-4 border-emerald-500 bg-emerald-500/5";
      textClass = "text-emerald-400";
      title = "Tip";
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`;
    } else if (alertType === "IMPORTANT") {
      borderClass = "border-l-4 border-purple-500 bg-purple-500/5";
      textClass = "text-purple-400";
      title = "Important";
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    } else if (alertType === "CAUTION") {
      borderClass = "border-l-4 border-rose-500 bg-rose-500/5";
      textClass = "text-rose-450";
      title = "Caution";
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    }

    return `
      <div class="callout my-6 p-4 rounded-r-xl border-y border-r border-slate-900 ${borderClass} flex flex-col gap-2.5">
        <div class="flex items-center gap-2 text-xs font-bold font-mono tracking-wider uppercase select-none ${textClass}">
          ${iconSvg}
          <span>${title}</span>
        </div>
        <div class="callout-body text-[13.5px] leading-relaxed text-slate-400 font-medium">
          ${cleanContent}
        </div>
      </div>
    `;
  });
}

function parseMermaidBlocks(html: string): string {
  return html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_, source: string) => `
      <div class="mermaid-shell" data-mermaid-container>
        <div class="mermaid-toolbar">
          <span class="mermaid-label">Architecture diagram</span>
          <div class="mermaid-actions">
            <span class="mermaid-status" data-mermaid-status>Rendering</span>
            <button class="mermaid-expand-button" type="button" data-expand-mermaid aria-label="Open diagram in large view">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
              <span>Expand</span>
            </button>
          </div>
        </div>
        <div class="mermaid" data-mermaid-source>${source}</div>
      </div>
    `,
  );
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const slugArray = resolvedParams.slug;

  // Handle redirect from bare /docs to /docs/introduction
  if (!slugArray || slugArray.length === 0) {
    redirect("/docs/introduction");
  }

  const doc = getDocBySlug(slugArray);

  if (!doc) {
    notFound();
  }

  // Pre-render markdown body to HTML on the server
  const htmlContent = parseMermaidBlocks(
    parseCallouts(await marked.parse(doc.body)),
  );

  // Get navigation links
  const { prev, next } = getPrevNextLinks(doc.slug);

  // Generate GitHub Edit URL
  const repoFilePath =
    doc.slug === "introduction"
      ? "README.md"
      : doc.slug === "license"
        ? "LICENSE"
        : doc.slug === "commercial-license"
          ? "COMMERCIAL_LICENSE.md"
          : `docs/${doc.slug.toUpperCase() === "ROADMAP" ? "ROADMAP.md" : doc.slug.toUpperCase() === "QUICKSTART" ? "QUICKSTART.md" : doc.slug.toUpperCase() === "INSTALLATION" ? "INSTALLATION.md" : doc.slug.toUpperCase() === "DEVELOPMENT" ? "DEVELOPMENT.md" : doc.slug.toUpperCase() === "ARCHITECTURE" ? "ARCHITECTURE.md" : doc.slug.toUpperCase() === "DATABASE" ? "DATABASE.md" : doc.slug.toUpperCase() === "SECURITY" ? "SECURITY.md" : doc.slug.toUpperCase() === "API" ? "API.md" : doc.slug.toUpperCase() === "DEPLOYMENT" ? "DEPLOYMENT.md" : doc.slug.toUpperCase() === "TROUBLESHOOTING" ? "TROUBLESHOOTING.md" : doc.slug.toUpperCase() === "FAQ" ? "FAQ.md" : doc.slug.toUpperCase() === "CONTRIBUTING" ? "CONTRIBUTING.md" : doc.slug.toUpperCase() === "CHANGELOG" ? "CHANGELOG.md" : `${doc.slug}.md`}`;
  const githubEditUrl = `https://github.com/Vaibhav-Singh2/ObservabilityOS/edit/main/${repoFilePath}`;

  const searchIndex = getAllDocsForSearch();
  const baseUrl = process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:3001";

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Docs",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: doc.category,
        item: `${baseUrl}/docs/${doc.slug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: doc.title,
        item: `${baseUrl}/docs/${doc.slug}`,
      },
    ],
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: doc.title,
    description: doc.description,
    inLanguage: "en-US",
    mainEntityOfPage: `${baseUrl}/docs/${doc.slug}`,
    publisher: {
      "@type": "Organization",
      name: "ObservabilityOS",
      logo: {
        "@type": "ImageObject",
        url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/favicon.ico`,
      },
    },
    author: {
      "@type": "Organization",
      name: "ObservabilityOS Dev Team",
    },
  };

  return (
    <DocsNavShell searchIndex={searchIndex}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {/* Grid columns: Center Content and Right TOC */}
      <div className="flex w-full flex-col gap-12 lg:flex-row">
        {/* Left/Center Main Column */}
        <div className="min-w-0 flex-1">
          {/* Breadcrumbs */}
          <nav className="mb-7 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Link
              href="/docs"
              className="transition-colors hover:text-slate-200"
            >
              Docs
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-700" />
            <span>{doc.category}</span>
            <ChevronRight className="h-3 w-3 text-slate-700" />
            <span className="truncate text-slate-300">{doc.title}</span>
          </nav>

          {/* Heading */}
          <header className="mb-10 border-b border-slate-800/80 pb-8">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">
              {doc.category}
            </span>
            <h1 className="text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              {doc.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              {doc.description}
            </p>
          </header>

          {/* Mobile Collapsible Table of Contents */}
          {doc.headings.length > 0 && (
            <div className="xl:hidden mb-8 border border-slate-900 bg-slate-950/40 rounded-xl p-4">
              <details className="group">
                <summary className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between cursor-pointer list-none select-none">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-500" />
                    On this page
                  </span>
                  <span className="text-slate-500 transition-transform group-open:rotate-90">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </summary>
                <ul className="mt-3.5 space-y-2.5 text-xs font-semibold text-slate-400 border-t border-slate-900/60 pt-3.5">
                  {doc.headings.map((heading, idx) => (
                    <li
                      key={idx}
                      className={
                        heading.level === 3
                          ? "pl-3.5 border-l border-slate-900"
                          : ""
                      }
                    >
                      <Link
                        href={`#${heading.id}`}
                        className="hover:text-indigo-400 transition-all block truncate"
                      >
                        {heading.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          {/* Markdown compiled HTML */}
          <article className="prose prose-slate prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </article>

          {/* Next / Prev Navigation */}
          {(prev || next) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-16 pt-8 border-t border-slate-900/60">
              {prev ? (
                <Link
                  href={`/docs/${prev.slug}`}
                  className="group flex flex-col items-start p-4 rounded-xl border border-slate-900 hover:border-slate-800 bg-slate-950/40 hover:bg-slate-900/10 transition-all cursor-pointer"
                >
                  <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-1 group-hover:text-slate-400 transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> Previous
                  </span>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors truncate w-full">
                    {prev.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}

              {next ? (
                <Link
                  href={`/docs/${next.slug}`}
                  className="group flex flex-col items-end p-4 rounded-xl border border-slate-900 hover:border-slate-800 bg-slate-950/40 hover:bg-slate-900/10 transition-all cursor-pointer"
                >
                  <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-1 group-hover:text-slate-400 transition-colors">
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors truncate w-full text-right">
                    {next.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Table of Contents */}
        {doc.headings.length > 0 && (
          <aside className="hidden xl:flex w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] flex-col justify-between pb-6 pr-2">
            {/* Scrollable Headings List */}
            <div className="flex-1 overflow-y-auto scrollbar-none space-y-4 pr-1">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                On this page
              </h4>
              <ul className="space-y-2.5 text-[11px] font-semibold text-slate-400">
                {doc.headings.map((heading, idx) => (
                  <li
                    key={idx}
                    className={
                      heading.level === 3
                        ? "pl-3.5 border-l border-slate-900"
                        : ""
                    }
                  >
                    <Link
                      href={`#${heading.id}`}
                      className="hover:text-indigo-400 transition-all block truncate"
                    >
                      {heading.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Fixed Edit Link */}
            <div className="mt-4 pt-4 border-t border-slate-900/60 shrink-0">
              <a
                href={githubEditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-350 transition-colors font-mono cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-650" />
                Edit on GitHub
              </a>
            </div>
          </aside>
        )}
      </div>

      <DocInteractivity />
    </DocsNavShell>
  );
}
