import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase, User, Project, Service } from "@repo/db";
import jwt from "jsonwebtoken";
import ProjectDashboardView from "./ProjectDashboardView";
import ZeroStateView from "./ZeroStateView";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    redirect("/");
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    redirect("/");
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (e) {
    redirect("/");
  }

  await connectToDatabase();
  const user = await User.findById(decoded.userId);
  if (!user) {
    redirect("/");
  }

  // Await searchParams as required by Next 15+
  const resolvedSearchParams = await searchParams;
  const projects = await Project.find({ ownerId: user._id }).sort({ createdAt: -1 });

  if (projects.length === 0) {
    return <ZeroStateView />;
  }

  const activeProjectId = resolvedSearchParams.projectId || projects[0]?._id.toString();
  const activeProject = projects.find(p => p._id.toString() === activeProjectId) || projects[0];

  if (!activeProject) {
    return <ZeroStateView />;
  }

  const services = await Service.find({ projectId: activeProject._id }).sort({ name: 1, environment: 1 });

  const serializedProject = {
    id: activeProject._id.toString(),
    name: activeProject.name,
    apiKey: activeProject.apiKey,
  };

  const serializedServices = services.map(s => ({
    id: s._id.toString(),
    name: s.name,
    environment: s.environment,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <ProjectDashboardView
      project={serializedProject}
      services={serializedServices}
    />
  );
}
