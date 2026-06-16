import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    template: "%s | ObservabilityOS",
    default:
      "ObservabilityOS — AI-Native DevOps Intelligence & Log Anomaly Detection Platform",
  },
  description:
    "Zero-config npm SDK and Docker sidecar. Ingest telemetry, auto-scrub PII, detect anomalies using Z-scores, and generate GPT-4/Claude root-cause post-mortems in seconds.",
  keywords: [
    "AI observability",
    "log analytics",
    "anomaly detection",
    "root cause analysis",
    "observability platform",
    "developer monitoring",
    "OpenTelemetry monitoring",
    "DevOps intelligence",
    "server monitoring",
    "error tracking",
  ],
  alternates: {
    canonical: "./",
  },
  openGraph: {
    title:
      "ObservabilityOS — AI-Native DevOps Intelligence & Log Anomaly Detection Platform",
    description:
      "Zero-config npm SDK and Docker sidecar. Ingest telemetry, auto-scrub PII, detect anomalies using Z-scores, and generate GPT-4/Claude root-cause post-mortems in seconds.",
    url: baseUrl,
    siteName: "ObservabilityOS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "ObservabilityOS — AI-Native DevOps Intelligence & Log Anomaly Detection Platform",
    description:
      "Zero-config npm SDK and Docker sidecar. Ingest telemetry, auto-scrub PII, detect anomalies using Z-scores, and generate GPT-4/Claude root-cause post-mortems in seconds.",
    creator: "@observabilityos",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
