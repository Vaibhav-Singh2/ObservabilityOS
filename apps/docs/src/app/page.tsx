import { getAllDocsForSearch } from "@/lib/docs";
import DocsLandingClient from "@/components/DocsLandingClient";

export default function Page() {
  const searchIndex = getAllDocsForSearch();
  return <DocsLandingClient searchIndex={searchIndex} />;
}
