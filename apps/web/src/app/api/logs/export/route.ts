import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectToDatabase, Project, Log, User } from "@repo/db";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { exportLogsToCSV, exportLogsToJSON, ExportableLog } from "@/lib/log-export";

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
    const query = searchParams.get("query") || "";
    const level = searchParams.get("level") || "all";
    const serviceId = searchParams.get("serviceId") || "all";
    const environment = searchParams.get("environment") || "all";
    const timeRange = searchParams.get("timeRange") || "24h";
    const format = searchParams.get("format") || "csv";

    if (!projectId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "projectId is required" } },
        { status: 400 }
      );
    }

    // Verify project belongs to user (Tenant isolation)
    const project = await Project.findOne({ _id: projectId, ownerId: user._id });
    if (!project) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Project not found or access denied" } },
        { status: 404 }
      );
    }

    // Time filter
    const now = Date.now();
    let startTime = now - 24 * 60 * 60 * 1000; // default 24h
    if (timeRange === "1h") {
      startTime = now - 60 * 60 * 1000;
    } else if (timeRange === "7d") {
      startTime = now - 7 * 24 * 60 * 60 * 1000;
    }

    let logs: any[] = [];
    let searchUsed = false;

    if (query.trim() !== "") {
      try {
        const pipeline: any[] = [
          {
            $search: {
              index: "default",
              text: {
                query: query.trim(),
                path: "message",
              },
            },
          },
          {
            $match: {
              projectId: project._id,
            },
          },
        ];

        // Apply filters in match stage
        const matchStage = pipeline[1].$match;
        if (level !== "all") {
          matchStage.level = level;
        }
        if (serviceId !== "all") {
          matchStage.serviceId = new Types.ObjectId(serviceId);
        }
        if (environment !== "all") {
          matchStage.environment = environment;
        }
        matchStage.timestamp = { $gte: new Date(startTime) };

        pipeline.push({ $sort: { timestamp: -1 } });
        pipeline.push({ $limit: 1000 });

        const aggResult = await Log.aggregate(pipeline);
        logs = await Log.populate(aggResult, { path: "serviceId", select: "name environment" });
        searchUsed = true;
      } catch (err) {
        console.warn("Atlas Search ($search) failed/unsupported in export, falling back to regex search:", err);
      }
    }

    if (!searchUsed) {
      // Build conditions
      const conditions: Record<string, any> = {
        projectId: project._id,
      };

      if (level !== "all") {
        conditions.level = level;
      }

      if (serviceId !== "all") {
        conditions.serviceId = new Types.ObjectId(serviceId);
      }

      if (environment !== "all") {
        conditions.environment = environment;
      }

      conditions.timestamp = { $gte: new Date(startTime) };

      // Text search query
      if (query.trim() !== "") {
        conditions.message = { $regex: query.trim(), $options: "i" };
      }

      // Fetch logs, limited to 1000 for export performance
      logs = await Log.find(conditions)
        .populate("serviceId", "name environment")
        .sort({ timestamp: -1 })
        .limit(1000);
    }

    const exportableLogs: ExportableLog[] = logs.map((l) => {
      const s = l.serviceId as any;
      return {
        timestamp: l.timestamp.toISOString(),
        level: l.level,
        message: l.message,
        traceId: l.traceId || null,
        metadata: l.metadata || {},
        service: s ? { name: s.name, environment: s.environment } : null,
      };
    });

    let formattedContent = "";
    let contentType = "";
    let filename = "";

    if (format === "json") {
      formattedContent = exportLogsToJSON(exportableLogs);
      contentType = "application/json; charset=utf-8";
      filename = `logs-export-${Date.now()}.json`;
    } else {
      formattedContent = exportLogsToCSV(exportableLogs);
      contentType = "text/csv; charset=utf-8";
      filename = `logs-export-${Date.now()}.csv`;
    }

    return new Response(formattedContent, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Log Export GET Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to export logs" } },
      { status: 500 }
    );
  }
}
