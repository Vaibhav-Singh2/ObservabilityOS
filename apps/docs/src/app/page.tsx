import { getAllDocsForSearch } from "@/lib/docs";
import DocsLandingClient from "@/components/DocsLandingClient";

export const metadata = {
  title: "ObservabilityOS Documentation & Developer Reference Guides",
  description: "Explore the setup instructions, architecture design specifications, API schemas, security models, and developer guides for ObservabilityOS.",
  alternates: {
    canonical: "https://docs.observabilityos.com",
  },
};

export default function Page() {
  const searchIndex = getAllDocsForSearch();
  const baseUrl = process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.observabilityos.com";
  
  const siteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "ObservabilityOS Docs",
    "url": baseUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
      />
      <DocsLandingClient searchIndex={searchIndex} />
    </>
  );
}
