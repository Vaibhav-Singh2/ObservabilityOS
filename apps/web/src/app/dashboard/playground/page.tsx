import { redirect } from "next/navigation";
import PlaygroundView from "./PlaygroundView";
import { getAuthSession } from "@/lib/auth-cache";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function PlaygroundPage({ searchParams }: PageProps) {
  const { user, projects } = await getAuthSession();

  const resolvedSearchParams = await searchParams;

  if (projects.length === 0) {
    redirect("/dashboard");
  }

  const activeProjectId =
    resolvedSearchParams.projectId || projects[0]?._id.toString();
  const activeProject =
    projects.find((p) => p._id.toString() === activeProjectId) || projects[0];

  if (!activeProject) {
    redirect("/dashboard");
  }

  const serializedProject = {
    id: activeProject._id.toString(),
    name: activeProject.name,
    apiKey: activeProject.apiKey,
  };

  return <PlaygroundView project={serializedProject} />;
}
