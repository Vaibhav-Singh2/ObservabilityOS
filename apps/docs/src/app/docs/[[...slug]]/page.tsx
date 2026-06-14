import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { marked } from "marked";
import { getDocBySlug, getPrevNextLinks, getAllDocsForSearch } from "@/lib/docs";
import DocsLayoutClient from "@/components/DocsLayoutClient";
import { ArrowLeft, ArrowRight, Edit3, ChevronRight, Hash } from "lucide-react";

// Configure marked with a custom renderer for heading IDs to match our TOC IDs
const renderer = new marked.Renderer();
renderer.heading = function (
  arg1: unknown,
  arg2?: unknown,
  arg3?: unknown
) {
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

marked.use({ renderer });

interface PageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const doc = getDocBySlug(resolvedParams.slug);
  
  if (!doc) {
    return {
      title: "Not Found",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.observabilityos.com";
  
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
    }
  };
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
  const htmlContent = await marked.parse(doc.body);

  // Get navigation links
  const { prev, next } = getPrevNextLinks(doc.slug);

  // Generate GitHub Edit URL
  const repoFilePath = doc.slug === "introduction" ? "README.md" : `docs/${doc.slug.toUpperCase() === "ROADMAP" ? "ROADMAP.md" : doc.slug.toUpperCase() === "QUICKSTART" ? "QUICKSTART.md" : doc.slug.toUpperCase() === "INSTALLATION" ? "INSTALLATION.md" : doc.slug.toUpperCase() === "DEVELOPMENT" ? "DEVELOPMENT.md" : doc.slug.toUpperCase() === "ARCHITECTURE" ? "ARCHITECTURE.md" : doc.slug.toUpperCase() === "DATABASE" ? "DATABASE.md" : doc.slug.toUpperCase() === "SECURITY" ? "SECURITY.md" : doc.slug.toUpperCase() === "API" ? "API.md" : doc.slug.toUpperCase() === "DEPLOYMENT" ? "DEPLOYMENT.md" : doc.slug.toUpperCase() === "TROUBLESHOOTING" ? "TROUBLESHOOTING.md" : doc.slug.toUpperCase() === "FAQ" ? "FAQ.md" : doc.slug.toUpperCase() === "CONTRIBUTING" ? "CONTRIBUTING.md" : doc.slug.toUpperCase() === "CHANGELOG" ? "CHANGELOG.md" : `${doc.slug}.md`}`;
  const githubEditUrl = `https://github.com/Vaibhav-Singh2/ObservabilityOS/edit/main/${repoFilePath}`;

  const searchIndex = getAllDocsForSearch();
  const baseUrl = process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.observabilityos.com";

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Docs",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": doc.category,
        "item": `${baseUrl}/docs/${doc.slug}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": doc.title,
        "item": `${baseUrl}/docs/${doc.slug}`
      }
    ]
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": doc.title,
    "description": doc.description,
    "inLanguage": "en-US",
    "mainEntityOfPage": `${baseUrl}/docs/${doc.slug}`,
    "publisher": {
      "@type": "Organization",
      "name": "ObservabilityOS",
      "logo": {
        "@type": "ImageObject",
        "url": `https://observabilityos.com/favicon.ico`
      }
    },
    "author": {
      "@type": "Organization",
      "name": "ObservabilityOS Dev Team"
    }
  };

  return (
    <DocsLayoutClient searchIndex={searchIndex}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {/* Grid columns: Center Content and Right TOC */}
      <div className="flex flex-col lg:flex-row gap-10 w-full relative">
        
        {/* Left/Center Main Column */}
        <div className="flex-1 min-w-0 max-w-3xl">
          
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold font-mono uppercase tracking-wider mb-6">
            <Link href="/docs" className="hover:text-slate-350 transition-colors">Docs</Link>
            <ChevronRight className="w-3 h-3 text-slate-700" />
            <span className="text-slate-600">{doc.category}</span>
            <ChevronRight className="w-3 h-3 text-slate-700" />
            <span className="text-indigo-400 truncate">{doc.title}</span>
          </nav>

          {/* Heading */}
          <header className="space-y-2 mb-8">
            <span className="text-[10px] font-bold font-mono text-indigo-500 uppercase tracking-widest">{doc.category}</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{doc.title}</h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-2xl font-medium">{doc.description}</p>
            <div className="border-b border-slate-900/60 pt-4" />
          </header>

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
          <aside className="hidden xl:block w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 pb-6 scrollbar-none">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                On this page
              </h4>
              <ul className="space-y-2.5 text-[11px] font-semibold text-slate-400">
                {doc.headings.map((heading, idx) => (
                  <li 
                    key={idx}
                    className={heading.level === 3 ? "pl-3.5 border-l border-slate-900" : ""}
                  >
                    <a
                      href={`#${heading.id}`}
                      className="hover:text-indigo-400 transition-all block truncate"
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="border-t border-slate-900/60 my-4 pt-4" />

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
    </DocsLayoutClient>
  );
}
