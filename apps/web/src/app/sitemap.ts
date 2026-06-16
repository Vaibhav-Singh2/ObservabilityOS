import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const routes = [
    "",
    "/privacy",
    "/terms",
    "/blog",
    "/blog/opentelemetry-zero-config-setup",
    "/blog/ai-root-cause-analysis-explained",
    "/blog/pii-scrubbing-at-the-edge",
    "/blog/log-anomaly-detection-zscore-vs-ml",
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
