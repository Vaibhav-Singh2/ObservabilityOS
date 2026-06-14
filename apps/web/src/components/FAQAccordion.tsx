"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "How does ObservabilityOS ensure log data privacy & security?",
    answer: "All incoming telemetry passes through our high-performance PII scrubbing engine (scrubber.ts) before database storage. It automatically redacts database credentials, authorization headers, JWT strings, credit card numbers, and custom regex patterns you define. None of your sensitive client data is sent to external LLMs; only sanitized schema metadata, anonymized error types, and deployment contexts are processed."
  },
  {
    question: "Does the SDK add network latency to my API endpoints?",
    answer: "No. The Node.js SDK utilizes an in-memory ring-buffer for high-throughput batching. Logs are stored instantly in memory and flushed asynchronously in the background. The SDK runs on a non-blocking queue, meaning database query and request cycles are completely decoupled. If the buffer fills during network outages, a fail-safe drop policy prevents memory leaks."
  },
  {
    question: "How accurate is the statistical Z-score anomaly detection?",
    answer: "We use dynamic rolling baselines to calculate standard deviation spikes (Z-score) on error rates, latency, and CPU usage. Instead of static thresholds that wake you up at 3 AM for harmless database maintenance, our model adapts to weekly/daily traffic cycles, reducing pager noise by up to 98%."
  },
  {
    question: "How does the AI incident root-cause diagnosis work?",
    answer: "When a Z-score threshold is breached, we package the surrounding context: matching error log context, active route signatures, and GitHub webhook deployment events. We pipeline this to GPT-4/Claude via structured prompts to generate a comprehensive markdown post-mortem outlining 'What happened', 'Why', and 'Recommended Hotfix' in under 10 seconds."
  },
  {
    question: "Is ObservabilityOS compatible with OpenTelemetry (OTLP)?",
    answer: "Yes, fully. The ObservabilityOS ingestion API supports native OTLP HTTP/JSON protocols. If you already use OpenTelemetry collectors, you can simply append our ingestion endpoint and API key to your configuration. No code modifications required."
  },
  {
    question: "Do you support languages other than Node.js, Express, and Next.js?",
    answer: "Yes. While we provide a zero-dependency npm package for JS/TS environments, we also supply a Docker sidecar agent. The Docker sidecar mounts local log files (Nginx, Postgres, Go, Python, etc.) or listens to container stdout, scrubbing and forwarding data to our API automatically."
  },
  {
    question: "How does GitHub integration track code deployments?",
    answer: "During onboarding, you can install our GitHub App or add a webhook to your repositories. Every merge to main/master registers a deployment event (commit SHA, author, message). If an anomaly is detected, we immediately correlate the timeline to pinpoint if a bad commit caused the failure."
  },
  {
    question: "Is there a self-hosted or on-premise option?",
    answer: "Yes, for Enterprise customers. We offer fully-configured Kubernetes Helm charts and Docker Compose stacks. This allows you to host ObservabilityOS entirely within your private cloud (AWS VPC, GCP, or Azure), ensuring no data ever leaves your company borders."
  },
  {
    question: "What notice channels are supported for alerts?",
    answer: "We support Slack, Discord, and Microsoft Teams webhooks natively. Alert payloads are formatted with markdown layout cards, showing the AI incident report directly in your chat channels with quick rollback action buttons."
  },
  {
    question: "What happens if I exceed my log ingestion limit on the Pro plan?",
    answer: "The Pro plan includes 50GB of log ingestion. If you exceed this, we do not block your services. Additional logs are charged at a flat rate of $1.50 per GB. You can set up ingestion cap limits in your Project Settings to prevent surprise invoices."
  },
  {
    question: "Can I try ObservabilityOS without a credit card?",
    answer: "Yes, our Free plan is free forever, requires no credit card, and includes 1GB of log ingestion per month, 3 services, and Slack integration. It is perfect for indie hackers, small side projects, and developer evaluation."
  },
  {
    question: "Does the pricing align with Stripe and Razorpay integrations?",
    answer: "Yes, our backend utilizes automated billing webhooks connected to Stripe and Razorpay for global currency support. Plans update dynamically upon payment, with instant access to higher ingestion volume and team collaboration seats."
  }
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {FAQS.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className={cn(
              "rounded-xl border transition-all duration-200",
              isOpen
                ? "border-slate-800 bg-slate-900/30"
                : "border-slate-900/60 bg-slate-950/40 hover:border-slate-850"
            )}
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full flex items-center justify-between p-5 text-left font-semibold text-sm sm:text-base text-slate-200 hover:text-white transition-colors cursor-pointer"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{faq.question}</span>
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200",
                  isOpen && "transform rotate-180 text-indigo-400"
                )}
              />
            </button>

            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isOpen ? "max-h-75 border-t border-slate-900/60" : "max-h-0"
              )}
            >
              <div className="p-5 text-sm leading-relaxed text-slate-400 font-sans">
                {faq.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
