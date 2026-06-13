import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectToDatabase, Project, AuditLog, User } from "@repo/db";
import jwt from "jsonwebtoken";

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

    if (!projectId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "projectId is required" } },
        { status: 400 }
      );
    }

    // Verify project belongs to user
    const project = await Project.findOne({ _id: projectId, ownerId: user._id });
    if (!project) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Project not found or access denied" } },
        { status: 404 }
      );
    }

    // Retrieve audit logs populated with user info
    const logs = await AuditLog.find({ projectId: project._id })
      .populate("userId", "username email avatarUrl")
      .sort({ createdAt: -1 })
      .limit(100);

    const serialized = logs.map((log) => {
      const u = log.userId as any;
      return {
        id: log._id.toString(),
        action: log.action,
        targetEntity: log.targetEntity,
        targetId: log.targetId || null,
        metadata: log.metadata
          ? log.metadata instanceof Map
            ? Object.fromEntries(log.metadata.entries())
            : (log.metadata as any)
          : {},
        createdAt: log.createdAt.toISOString(),
        user: u
          ? {
              id: u._id.toString(),
              username: u.username,
              email: u.email || null,
              avatarUrl: u.avatarUrl || null,
            }
          : null,
      };
    });

    return NextResponse.json({ auditLogs: serialized });
  } catch (error) {
    console.error("Audit Logs GET Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve audit logs" } },
      { status: 500 }
    );
  }
}
