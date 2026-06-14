import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | ObservabilityOS Docs",
    default: "ObservabilityOS Documentation",
  },
  description:
    "Developer guides, architectural specifications, and API references for the ObservabilityOS AI-native telemetry platform.",
  metadataBase: new URL("http://localhost:3001"),
  openGraph: {
    title: "ObservabilityOS Documentation",
    description: "Developer guides, architectural specifications, and API references.",
    url: "http://localhost:3001/docs",
    siteName: "ObservabilityOS",
    locale: "en_US",
    type: "website",
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
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
