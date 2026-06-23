import { redirect } from "next/navigation";
import { Service, Deploy, Incident } from "@repo/db";
import ServiceDetailView from "./ServiceDetailView";
import { getAuthSession } from "@/lib/auth-cache";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ projectId?: string }>;
}

export default async function ServiceDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { user, projects } = await getAuthSession();

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const serviceId = resolvedParams.id;
  const projectId = resolvedSearchParams.projectId;

  if (!serviceId || !projectId) {
    redirect("/dashboard");
  }

  // Tenant isolation verification: Ensure the user owns the project
  const project = projects.find((p) => p._id.toString() === projectId);
  if (!project) {
    redirect("/dashboard");
  }

  // Fetch the Service
  const service = await Service.findOne({
    _id: serviceId,
    projectId: project._id,
  });
  if (!service) {
    redirect(`/dashboard?projectId=${project._id}`);
  }

  // Fetch recent deployments for this service
  const deployments = await Deploy.find({ serviceId: service._id })
    .sort({ deployedAt: -1 })
    .limit(5);

  // Fetch recent active incidents for this service
  const incidents = await Incident.find({ serviceId: service._id })
    .sort({ createdAt: -1 })
    .limit(5);

  // Serialize Mongoose models for hydration safety in client component
  const serializedService = {
    id: service._id.toString(),
    name: service.name,
    environment: service.environment,
    createdAt: service.createdAt.toISOString(),
    runbookUrl: service.runbookUrl || null,
    troubleshootingSteps: service.troubleshootingSteps || null,
  };

  const serializedDeployments = deployments.map((d) => ({
    id: d._id.toString(),
    commitSha: d.commitSha,
    commitMessage: d.commitMessage,
    branch: d.branch,
    deployedAt: d.deployedAt ? d.deployedAt.toISOString() : null,
  }));

  const serializedIncidents = incidents.map((i) => ({
    id: i._id.toString(),
    title: i.title,
    status: i.status,
    createdAt: i.createdAt.toISOString(),
    confidence: i.confidence,
  }));

  return (
    <ServiceDetailView
      projectId={project._id.toString()}
      service={serializedService}
      deployments={serializedDeployments}
      incidents={serializedIncidents}
    />
  );
}
