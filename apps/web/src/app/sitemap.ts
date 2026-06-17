import { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const staticRoutes = [
    { route: "", priority: 1.0, changeFrequency: "weekly" as const },
    { route: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { route: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
    { route: "/blog", priority: 0.9, changeFrequency: "daily" as const },
    {
      route: "/vs/datadog",
      priority: 0.9,
      changeFrequency: "monthly" as const,
    },
    {
      route: "/vs/new-relic",
      priority: 0.9,
      changeFrequency: "monthly" as const,
    },
    {
      route: "/vs/grafana",
      priority: 0.9,
      changeFrequency: "monthly" as const,
    },
    { route: "/vs/sentry", priority: 0.9, changeFrequency: "monthly" as const },
    {
      route: "/vs/better-stack",
      priority: 0.9,
      changeFrequency: "monthly" as const,
    },
    {
      route: "/guides/opentelemetry-monitoring-guide",
      priority: 0.8,
      changeFrequency: "monthly" as const,
    },
    {
      route: "/guides/ai-incident-analysis-guide",
      priority: 0.8,
      changeFrequency: "monthly" as const,
    },
    {
      route: "/guides/log-analytics-best-practices",
      priority: 0.8,
      changeFrequency: "monthly" as const,
    },
  ];

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.dateISO),
    changeFrequency: "monthly" as const,
    priority: post.featured ? 0.9 : 0.8,
  }));

  const staticSitemapEntries: MetadataRoute.Sitemap = staticRoutes.map(
    ({ route, priority, changeFrequency }) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency,
      priority,
    }),
  );

  return [...staticSitemapEntries, ...blogRoutes];
}
