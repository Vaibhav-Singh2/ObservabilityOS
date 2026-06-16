import fs from "fs";
import path from "path";
import {
  DocHeading,
  DocData,
  SidebarItem,
  SearchDoc,
  getSidebarNav,
} from "./navigation";

// Map logical slugs to their actual file paths relative to apps/docs
const DOCS_MAP: Record<
  string,
  {
    filePath: string;
    category: string;
    defaultTitle: string;
    defaultDesc: string;
  }
> = {
  introduction: {
    filePath: "../../README.md",
    category: "Getting Started",
    defaultTitle: "Introduction",
    defaultDesc:
      "Overview of the ObservabilityOS DevOps Intelligence Platform.",
  },
  quickstart: {
    filePath: "../../docs/QUICKSTART.md",
    category: "Getting Started",
    defaultTitle: "Quick Start",
    defaultDesc: "5-minute setup guide to ship your first telemetry log.",
  },
  installation: {
    filePath: "../../docs/INSTALLATION.md",
    category: "Getting Started",
    defaultTitle: "Installation",
    defaultDesc:
      "System requirements, environment setups, and production configurations.",
  },
  development: {
    filePath: "../../docs/DEVELOPMENT.md",
    category: "Getting Started",
    defaultTitle: "Local Development",
    defaultDesc:
      "Running workspace tests, local commands, and sandbox debugging.",
  },
  architecture: {
    filePath: "../../docs/ARCHITECTURE.md",
    category: "Core Architecture",
    defaultTitle: "System Architecture",
    defaultDesc:
      "Monorepo topology, log ingestion flow, and anomaly detection loops.",
  },
  database: {
    filePath: "../../docs/DATABASE.md",
    category: "Core Architecture",
    defaultTitle: "Database Schemas",
    defaultDesc:
      "MongoDB Mongoose models, index settings, and Redis cache structures.",
  },
  security: {
    filePath: "../../docs/SECURITY.md",
    category: "Core Architecture",
    defaultTitle: "Security Policy",
    defaultDesc:
      "Encryption, rate limit parameters, and PII data scrubbing rules.",
  },
  api: {
    filePath: "../../docs/API.md",
    category: "Reference Guides",
    defaultTitle: "API Specification",
    defaultDesc:
      "REST API schema specifications for Ingest, Metrics, and queries.",
  },
  deployment: {
    filePath: "../../docs/DEPLOYMENT.md",
    category: "Reference Guides",
    defaultTitle: "Production Deployment",
    defaultDesc:
      "Docker configuration, Vercel pipeline settings, and health checkups.",
  },
  troubleshooting: {
    filePath: "../../docs/TROUBLESHOOTING.md",
    category: "Reference Guides",
    defaultTitle: "Troubleshooting Guide",
    defaultDesc:
      "Common errors like date formats hydration mismatches and database timeouts.",
  },
  testing: {
    filePath: "../../docs/TESTING.md",
    category: "Reference Guides",
    defaultTitle: "Automated Testing",
    defaultDesc:
      "Overview of unit, integration, and Playwright end-to-end verification suites.",
  },
  faq: {
    filePath: "../../docs/FAQ.md",
    category: "Reference Guides",
    defaultTitle: "Technical FAQ",
    defaultDesc:
      "Common developer questions on OpenTelemetry compatibility and AI privacy.",
  },
  contributing: {
    filePath: "../../docs/CONTRIBUTING.md",
    category: "Community & Releases",
    defaultTitle: "Contributing Guide",
    defaultDesc:
      "Git branching workflows, Conventional Commits, and code review criteria.",
  },
  "recruiter-guide": {
    filePath: "../../docs/RECRUITER_GUIDE.md",
    category: "Community & Releases",
    defaultTitle: "Recruiter & Portfolio Guide",
    defaultDesc:
      "A walkthrough of system architecture challenges and developer skills shown in the project.",
  },
  roadmap: {
    filePath: "../../docs/ROADMAP.md",
    category: "Community & Releases",
    defaultTitle: "Product Roadmap",
    defaultDesc: "Completed milestones and future development sprints.",
  },
  changelog: {
    filePath: "../../docs/CHANGELOG.md",
    category: "Community & Releases",
    defaultTitle: "Release Changelog",
    defaultDesc: "Release tags mapping completed features and visual layouts.",
  },
  license: {
    filePath: "../../LICENSE",
    category: "Community & Releases",
    defaultTitle: "Source License",
    defaultDesc: "ObservabilityOS Source Available License Agreement.",
  },
  "commercial-license": {
    filePath: "../../COMMERCIAL_LICENSE.md",
    category: "Community & Releases",
    defaultTitle: "Commercial License",
    defaultDesc: "Commercial licensing terms and enterprise SLA support.",
  },
};

/**
 * Extracts h2/h3 markdown headers for the right-side Table of Contents
 */
function parseHeadings(markdown: string): DocHeading[] {
  const headings: DocHeading[] = [];
  const lines = markdown.split("\n");

  lines.forEach((line) => {
    // Match h2 (## Heading) or h3 (### Heading)
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      let text = match[2].trim();
      // Remove any trailing markdown characters
      text = text.replace(/[*_`]/g, "");

      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");

      headings.push({ text, id, level });
    }
  });

  return headings;
}

/**
 * Parses frontmatter YAML block recursively without external dependencies
 */
function parseFrontmatter(content: string): {
  data: Record<string, string>;
  content: string;
} {
  const frontmatterRegex = /^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (match) {
    const rawYaml = match[1];
    const body = match[2];
    const data: Record<string, string> = {};

    rawYaml.split("\n").forEach((line) => {
      const parts = line.split(":");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts
          .slice(1)
          .join(":")
          .trim()
          .replace(/^["']|["']$/g, "");
        data[key] = value;
      }
    });

    return { data, content: body };
  }

  return { data: {}, content };
}

/**
 * Resolves the file path for a doc entry.
 *
 * In production (Vercel), the docs app runs standalone and cannot traverse
 * outside its own directory. A prebuild script (scripts/copy-docs.mjs) copies
 * all markdown files into apps/docs/content/ so they are bundled with the app.
 *
 * In local development, the monorepo-relative path from DOCS_MAP is used directly.
 */
function resolveDocPath(mapItem: (typeof DOCS_MAP)[string]): string {
  const contentDir = path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "content",
  );
  const filename = path.basename(mapItem.filePath);

  // First try the local content/ directory (bundled on Vercel)
  const localPath = path.join(/*turbopackIgnore: true*/ contentDir, filename);
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  // Fall back to the monorepo-relative path (local development)
  const monorepoPath = path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    mapItem.filePath,
  );
  if (fs.existsSync(monorepoPath)) {
    return monorepoPath;
  }

  // Log and return the local path (will be caught by caller)
  return localPath;
}

export function getDocBySlug(slugArray: string[] | undefined): DocData | null {
  const slug =
    slugArray && slugArray.length > 0 ? slugArray[0] : "introduction";
  const mapItem = DOCS_MAP[slug];

  if (!mapItem) return null;

  const absolutePath = resolveDocPath(mapItem);

  if (!fs.existsSync(absolutePath)) {
    console.error(`[Docs Engine] File not found: ${absolutePath}`);
    return null;
  }

  const rawContent = fs.readFileSync(absolutePath, "utf-8");
  const { data, content } = parseFrontmatter(rawContent);
  const headings = parseHeadings(content);

  return {
    title: data.title || mapItem.defaultTitle,
    description: data.description || mapItem.defaultDesc,
    category: mapItem.category,
    body: content,
    headings,
    slug,
  };
}

export interface PrevNextLink {
  title: string;
  slug: string;
}

export function getPrevNextLinks(currentSlug: string): {
  prev: PrevNextLink | null;
  next: PrevNextLink | null;
} {
  const sidebarData = getSidebarNav();
  // Flatten all items in sidebar categories
  const flatItems: SidebarItem[] = [];
  sidebarData.forEach((cat) => {
    flatItems.push(...cat.items);
  });

  const currentIndex = flatItems.findIndex((item) => item.slug === currentSlug);

  const prev = currentIndex > 0 ? flatItems[currentIndex - 1] : null;
  const next =
    currentIndex < flatItems.length - 1 && currentIndex !== -1
      ? flatItems[currentIndex + 1]
      : null;

  return { prev, next };
}

export function getAllDocsForSearch(): SearchDoc[] {
  return Object.keys(DOCS_MAP).map((slug) => {
    const doc = getDocBySlug([slug]);
    return {
      title: doc?.title || DOCS_MAP[slug].defaultTitle,
      category: DOCS_MAP[slug].category,
      description: doc?.description || DOCS_MAP[slug].defaultDesc,
      slug,
    };
  });
}
