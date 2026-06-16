import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:3001";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    template: "%s | ObservabilityOS Docs",
    default: "ObservabilityOS Documentation",
  },
  description:
    "Developer guides, architectural specifications, and API references for the ObservabilityOS AI-native telemetry platform.",
  keywords: [
    "observability documentation",
    "OpenTelemetry setup",
    "AI incident response guide",
    "telemetry SDK API",
    "DevOps guides",
    "ObservabilityOS docs",
  ],
  alternates: {
    canonical: "./",
  },
  openGraph: {
    title: "ObservabilityOS Documentation",
    description:
      "Developer guides, architectural specifications, and API references for the ObservabilityOS AI-native telemetry platform.",
    url: baseUrl,
    siteName: "ObservabilityOS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ObservabilityOS Documentation",
    description:
      "Developer guides, architectural specifications, and API references for the ObservabilityOS AI-native telemetry platform.",
    creator: "@observabilityos",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark scroll-smooth antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
