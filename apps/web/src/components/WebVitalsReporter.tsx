"use client";

import { useEffect } from "react";
import { getPosthog, type PostHogClient } from "@/lib/posthog";

export default function WebVitalsReporter() {
  useEffect(() => {
    async function reportWebVitals() {
      const { onLCP, onINP, onCLS, onTTFB } = await import("web-vitals");

      const sendMetric = (metric: {
        name: string;
        value: number;
        rating?: string;
      }) => {
        const ph = getPosthog() as PostHogClient | null;
        if (!ph) return;

        ph.capture("$web_vitals", {
          metric: metric.name,
          value: metric.value,
          rating: metric.rating || "needs-improvement",
          url: window.location.href,
        });
      };

      onLCP(sendMetric);
      onINP(sendMetric);
      onCLS(sendMetric);
      onTTFB(sendMetric);
    }

    reportWebVitals();
  }, []);

  return null;
}
