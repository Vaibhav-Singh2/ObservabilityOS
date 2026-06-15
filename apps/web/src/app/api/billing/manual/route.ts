import { getAuthenticatedUser } from "@/lib/auth";

import { NextResponse } from "next/server";
import { Project } from "@repo/db";

import { z } from "zod";

const manualSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  plan: z.enum(["free", "pro", "self-host"]),
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
    const validatedData = manualSchema.parse(rawBody);
    const { projectId, plan } = validatedData;

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

    // Update plan and status
    project.plan = plan;
    project.subscriptionStatus = plan !== "free" ? "active" : "none";
    project.billingProvider = plan !== "free" ? "manual" : "none";

    await project.save();

    console.log(`[Manual Override] Set project ${projectId} to plan: ${plan}`);

    return NextResponse.json({
      success: true,
      project: {
        id: project._id.toString(),
        name: project.name,
        plan: project.plan,
        subscriptionStatus: project.subscriptionStatus,
        billingProvider: project.billingProvider,
      },
    });
  } catch (error) {
    console.error("Manual Billing POST Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message:
              "Validation failed: " +
              error.errors.map((e) => e.message).join(", "),
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to perform manual plan change",
        },
      },
      { status: 500 },
    );
  }
}
