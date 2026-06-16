import { MetadataRoute } from "next";
import { getSidebarNav } from "@/lib/navigation";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:3001";

  const sidebarData = getSidebarNav();
  const flatSlugs: string[] = [];
  sidebarData.forEach((cat) => {
    cat.items.forEach((item) => {
      flatSlugs.push(item.slug);
    });
  });

  const sitemapEntries = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1.0,
    },
    ...flatSlugs.map((slug) => ({
      url: `${baseUrl}/docs/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  return sitemapEntries;
}
