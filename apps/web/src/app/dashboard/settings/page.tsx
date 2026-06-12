import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase, User, Project } from "@repo/db";
import jwt from "jsonwebtoken";
import SettingsView from "./SettingsView";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
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

  const resolvedSearchParams = await searchParams;
  const projects = await Project.find({ ownerId: user._id }).sort({ createdAt: -1 });

  if (projects.length === 0) {
    redirect("/dashboard");
  }

  const activeProjectId = resolvedSearchParams.projectId || projects[0]?._id.toString();
  const activeProject = projects.find(p => p._id.toString() === activeProjectId) || projects[0];

  if (!activeProject) {
    redirect("/dashboard");
  }

  const serializedProject = {
    id: activeProject._id.toString(),
    name: activeProject.name,
    apiKey: activeProject.apiKey,
    slackWebhookUrl: activeProject.slackWebhookUrl || "",
    discordWebhookUrl: activeProject.discordWebhookUrl || "",
    teamsWebhookUrl: activeProject.teamsWebhookUrl || "",
    minErrorCount: activeProject.minErrorCount ?? 3,
    zScoreThreshold: activeProject.zScoreThreshold ?? 3.0,
  };

  return (
    <SettingsView
      project={serializedProject}
    />
  );
}
