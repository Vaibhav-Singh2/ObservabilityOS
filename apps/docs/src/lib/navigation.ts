export interface DocHeading {
  text: string;
  id: string;
  level: number;
}

export interface DocData {
  title: string;
  description: string;
  category: string;
  body: string;
  headings: DocHeading[];
  slug: string;
}

export interface SidebarItem {
  title: string;
  slug: string;
}

export interface SidebarCategory {
  title: string;
  items: SidebarItem[];
}

export interface SearchDoc {
  title: string;
  category: string;
  description: string;
  slug: string;
}

const SIDEBAR_NAV: SidebarCategory[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", slug: "introduction" },
      { title: "Quick Start", slug: "quickstart" },
      { title: "Installation", slug: "installation" },
      { title: "Local Development", slug: "development" },
    ],
  },
  {
    title: "Core Architecture",
    items: [
      { title: "System Architecture", slug: "architecture" },
      { title: "Database Schemas", slug: "database" },
      { title: "Security Policy", slug: "security" },
    ],
  },
  {
    title: "Reference Guides",
    items: [
      { title: "API Specification", slug: "api" },
      { title: "Production Deployment", slug: "deployment" },
      { title: "Troubleshooting", slug: "troubleshooting" },
      { title: "Technical FAQ", slug: "faq" },
    ],
  },
  {
    title: "Community & Releases",
    items: [
      { title: "Contributing Guide", slug: "contributing" },
      { title: "Product Roadmap", slug: "roadmap" },
      { title: "Changelog", slug: "changelog" },
      { title: "Source License", slug: "license" },
      { title: "Commercial License", slug: "commercial-license" },
    ],
  },
];

export function getSidebarNav(): SidebarCategory[] {
  return SIDEBAR_NAV;
}
