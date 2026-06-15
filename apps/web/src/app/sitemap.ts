import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://observabilityos.com";

  const routes = [
    "",
    "/privacy",
    "/terms",
    "/vs/datadog",
    "/vs/new-relic",
    "/vs/grafana",
    "/vs/sentry",
    "/vs/better-stack",
    "/guides/opentelemetry-monitoring-guide",
    "/guides/ai-incident-analysis-guide",
    "/guides/log-analytics-best-practices",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));
}
