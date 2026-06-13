import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectToDatabase, Project, Incident, Log, Comment, User } from "@repo/db";
import jwt from "jsonwebtoken";
import { generatePostMortemMarkdown, PostMortemIncident, PostMortemLog, PostMortemComment } from "@/lib/postmortem";

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return null;

  try {
    const decoded: any = jwt.verify(token, jwtSecret);
    await connectToDatabase();
    return await User.findById(decoded.userId);
  } catch (e) {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not logged in" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const incidentId = searchParams.get("incidentId");

    if (!projectId || !incidentId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "projectId and incidentId are required" } },
        { status: 400 }
      );
    }

    // Tenant check: Ensure user owns this project
    const project = await Project.findOne({ _id: projectId, ownerId: user._id });
    if (!project) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden: Access denied" } },
        { status: 403 }
      );
    }

    // Fetch Incident
    const incident = await Incident.findOne({ _id: incidentId, projectId: project._id })
      .populate("serviceId")
      .populate("deployId");

    if (!incident) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Incident not found" } },
        { status: 404 }
      );
    }

    // Fetch related logs
    const logs = await Log.find({ _id: { $in: incident.relatedLogs } }).sort({ timestamp: 1 });

    // Fetch comments
    const comments = await Comment.find({ incidentId: incident._id })
      .populate("userId", "username email avatarUrl")
      .sort({ createdAt: 1 });

    // Prepare serialization for post-mortem utility
    const serviceObj = incident.serviceId as any;
    const deployObj = incident.deployId as any;

    const pmIncident: PostMortemIncident = {
      id: incident._id.toString(),
      title: incident.title,
      summary: incident.summary,
      rootCause: incident.rootCause,
      impact: incident.impact,
      suggestedFix: incident.suggestedFix || [],
      confidence: incident.confidence,
      status: incident.status,
      createdAt: incident.createdAt.toISOString(),
      resolvedAt: incident.resolvedAt ? incident.resolvedAt.toISOString() : null,
      ttd: incident.ttd,
      ttr: incident.ttr || null,
      service: serviceObj
        ? {
            name: serviceObj.name,
            environment: serviceObj.environment,
          }
        : null,
      deploy: deployObj
        ? {
            commitSha: deployObj.commitSha,
            commitMessage: deployObj.commitMessage,
            branch: deployObj.branch,
            deployedAt: deployObj.deployedAt ? deployObj.deployedAt.toISOString() : null,
          }
        : null,
    };

    const pmLogs: PostMortemLog[] = logs.map((l) => ({
      timestamp: l.timestamp.toISOString(),
      level: l.level,
      message: l.message,
      traceId: l.traceId || null,
      metadata: l.metadata || null,
    }));

    const pmComments: PostMortemComment[] = comments.map((c) => {
      const u = c.userId as any;
      return {
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        user: u
          ? {
              username: u.username,
              email: u.email || undefined,
            }
          : null,
      };
    });

    const markdownContent = generatePostMortemMarkdown(pmIncident, pmLogs, pmComments);

    // Format incident title for safe file naming
    const safeTitle = incident.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const filename = `postmortem-${safeTitle || "incident"}-${incident._id.toString().slice(-6)}.md`;

    return new Response(markdownContent, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export PostMortem GET Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to export postmortem" } },
      { status: 500 }
    );
  }
}
