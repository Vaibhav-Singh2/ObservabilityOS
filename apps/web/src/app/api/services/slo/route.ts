import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectToDatabase, Project, Service, User } from "@repo/db";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return null;

  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    await connectToDatabase();
    return await User.findById(decoded.userId);
  } catch {
    return null;
  }
}

const sloConfigSchema = z.object({
  projectId: z.string().min(1),
  serviceId: z.string().min(1),
  slo: z.object({
    name: z.string().min(1, "SLO name is required"),
    type: z.enum(["availability", "latency"]),
    target: z
      .number()
      .min(0)
      .max(100, "SLO target must be a percentage between 0 and 100"),
    windowDays: z.number().min(1).default(30),
    latencyThresholdMs: z.number().optional(),
  }),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not logged in" } },
        { status: 401 },
      );
    }

    const rawBody = await request.json();
    const { projectId, serviceId, slo } = sloConfigSchema.parse(rawBody);

    // Verify project ownership
    const project = await Project.findOne({
      _id: projectId,
      ownerId: user._id,
    });
    if (!project) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Project not found or access denied",
          },
        },
        { status: 404 },
      );
    }

    // Find service
    const service = await Service.findOne({
      _id: serviceId,
      projectId: project._id,
    });
    if (!service) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Service not found under this project",
          },
        },
        { status: 404 },
      );
    }

    // Initialize slos if not present
    if (!service.slos) {
      service.slos = [];
    }

    // Check if SLO with same name exists
    const existingIndex = service.slos.findIndex(
      (s) => s.name.toLowerCase() === slo.name.toLowerCase(),
    );

    const newSlo = {
      name: slo.name,
      type: slo.type,
      target: slo.target,
      windowDays: slo.windowDays,
      latencyThresholdMs:
        slo.type === "latency" ? slo.latencyThresholdMs : undefined,
    };

    const action = existingIndex > -1 ? "slo.update" : "slo.create";

    if (existingIndex > -1) {
      service.slos[existingIndex] = newSlo;
    } else {
      service.slos.push(newSlo);
    }

    await service.save();

    await logAuditEvent({
      projectId: project._id.toString(),
      userId: user._id.toString(),
      action,
      targetEntity: "slo",
      targetId: slo.name,
      metadata: {
        serviceId,
        type: slo.type,
        target: slo.target,
        windowDays: slo.windowDays,
      },
    });

    return NextResponse.json({ success: true, slos: service.slos });
  } catch (error) {
    console.error("SLO Config POST Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Validation failed",
            details: error.errors,
          },
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save SLO configuration",
        },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not logged in" } },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const serviceId = searchParams.get("serviceId");
    const sloName = searchParams.get("sloName");

    if (!projectId || !serviceId || !sloName) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "projectId, serviceId, and sloName are required",
          },
        },
        { status: 400 },
      );
    }

    // Verify project ownership
    const project = await Project.findOne({
      _id: projectId,
      ownerId: user._id,
    });
    if (!project) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Project not found or access denied",
          },
        },
        { status: 404 },
      );
    }

    // Find service
    const service = await Service.findOne({
      _id: serviceId,
      projectId: project._id,
    });
    if (!service) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Service not found under this project",
          },
        },
        { status: 404 },
      );
    }

    if (!service.slos || service.slos.length === 0) {
      return NextResponse.json({ success: true, slos: [] });
    }

    // Filter out the SLO
    service.slos = service.slos.filter(
      (s) => s.name.toLowerCase() !== sloName.toLowerCase(),
    );
    await service.save();

    await logAuditEvent({
      projectId: project._id.toString(),
      userId: user._id.toString(),
      action: "slo.delete",
      targetEntity: "slo",
      targetId: sloName,
      metadata: {
        serviceId,
      },
    });

    return NextResponse.json({ success: true, slos: service.slos });
  } catch (error) {
    console.error("SLO Config DELETE Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete SLO target",
        },
      },
      { status: 500 },
    );
  }
}
