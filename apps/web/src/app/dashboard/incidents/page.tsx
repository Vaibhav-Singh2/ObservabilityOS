import { redirect } from "next/navigation";
import { Service, Incident } from "@repo/db";
import { getAuthSession } from "@/lib/auth-cache";
import IncidentsView from "./IncidentsView";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function IncidentsPage({ searchParams }: PageProps) {
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

  // Fetch services to populate filter options
  const services = await Service.find({ projectId: activeProject._id }).sort({
    name: 1,
  });

  // Fetch incidents, populating service and deploy relations
  const incidents = await Incident.find({ projectId: activeProject._id })
    .populate("serviceId")
    .populate("deployId")
    .sort({ createdAt: -1 });

  // Serialize Mongoose models for safe Client Component boundary transfer
  const serializedProject = {
    id: activeProject._id.toString(),
    name: activeProject.name,
    apiKey: activeProject.apiKey,
  };

  const serializedServices = services.map((s) => ({
    id: s._id.toString(),
    name: s.name,
    environment: s.environment,
  }));

  const serializedIncidents = incidents.map((inc) => {
    const serviceObj = inc.serviceId as unknown as {
      name: string;
      environment: string;
      _id: string;
    };
    const deployObj = inc.deployId as unknown as {
      _id: { toString: () => string };
      commitSha: string;
      commitMessage: string;
      branch: string;
    } | null;

    return {
      id: inc._id.toString(),
      title: inc.title,
      summary: inc.summary,
      rootCause: inc.rootCause,
      impact: inc.impact,
      suggestedFix: inc.suggestedFix,
      confidence: inc.confidence,
      status: inc.status,
      createdAt: inc.createdAt.toISOString(),
      updatedAt: inc.updatedAt.toISOString(),
      resolvedAt: inc.resolvedAt ? inc.resolvedAt.toISOString() : null,
      ttd: inc.ttd,
      ttr: inc.ttr || null,
      service: serviceObj
        ? {
            id: serviceObj._id.toString(),
            name: serviceObj.name,
            environment: serviceObj.environment,
          }
        : null,
      deploy: deployObj
        ? {
            id: deployObj._id.toString(),
            commitSha: deployObj.commitSha,
            commitMessage: deployObj.commitMessage,
            branch: deployObj.branch,
          }
        : null,
    };
  });

  return (
    <IncidentsView
      project={serializedProject}
      services={serializedServices}
      initialIncidents={serializedIncidents}
    />
  );
}
