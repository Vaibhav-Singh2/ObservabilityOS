import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  connectToDatabase,
  User,
  Project,
  Incident,
  Log,
  Comment,
} from "@repo/db";
import jwt from "jsonwebtoken";
import IncidentDetailsView from "./IncidentDetailsView";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ projectId?: string }>;
}

export default async function IncidentDetailPage({
  params,
  searchParams,
}: PageProps) {
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

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const incidentId = resolvedParams.id;
  const projectId = resolvedSearchParams.projectId;

  if (!incidentId) {
    redirect("/dashboard/incidents");
  }

  // Fetch the Incident
  const incident = await Incident.findById(incidentId)
    .populate("serviceId")
    .populate("deployId");

  if (!incident) {
    redirect("/dashboard/incidents");
  }

  // Tenant isolation verification: Ensure the user owns the project this incident belongs to
  const project = await Project.findOne({
    _id: incident.projectId,
    ownerId: user._id,
  });
  if (!project) {
    redirect("/dashboard/incidents");
  }

  // Fetch the actual log documents that triggered this incident
  const logs = await Log.find({ _id: { $in: incident.relatedLogs } }).sort({
    timestamp: 1,
  });

  // Serialize Mongoose objects
  const serviceObj = incident.serviceId as any;
  const deployObj = incident.deployId as any;

  const serializedIncident = {
    id: incident._id.toString(),
    projectId: incident.projectId.toString(),
    title: incident.title,
    summary: incident.summary,
    rootCause: incident.rootCause,
    impact: incident.impact,
    suggestedFix: incident.suggestedFix,
    confidence: incident.confidence,
    status: incident.status,
    createdAt: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
    resolvedAt: incident.resolvedAt ? incident.resolvedAt.toISOString() : null,
    ttd: incident.ttd,
    ttr: incident.ttr || null,
    service: serviceObj
      ? {
          id: serviceObj._id.toString(),
          name: serviceObj.name,
          environment: serviceObj.environment,
          runbookUrl: serviceObj.runbookUrl || null,
          troubleshootingSteps: serviceObj.troubleshootingSteps || null,
        }
      : null,
    deploy: deployObj
      ? {
          id: deployObj._id.toString(),
          commitSha: deployObj.commitSha,
          commitMessage: deployObj.commitMessage,
          branch: deployObj.branch,
          deployedAt: deployObj.deployedAt
            ? deployObj.deployedAt.toISOString()
            : null,
        }
      : null,
  };

  const serializedLogs = logs.map((l) => ({
    id: l._id.toString(),
    timestamp: l.timestamp.toISOString(),
    level: l.level,
    message: l.message,
    traceId: l.traceId || null,
    metadata: l.metadata || null,
  }));

  // Fetch comments
  const comments = await Comment.find({ incidentId: incident._id })
    .populate("userId")
    .sort({ createdAt: 1 });

  const serializedComments = comments.map((c) => {
    const u = c.userId as any;
    return {
      id: c._id.toString(),
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      user: u
        ? {
            id: u._id.toString(),
            username: u.username,
            avatarUrl: u.avatarUrl || null,
          }
        : null,
    };
  });

  const serializedUser = {
    id: user._id.toString(),
    username: user.username,
    avatarUrl: user.avatarUrl || null,
  };

  return (
    <IncidentDetailsView
      projectId={project._id.toString()}
      incident={serializedIncident}
      initialLogs={serializedLogs}
      comments={serializedComments}
      currentUser={serializedUser}
    />
  );
}
