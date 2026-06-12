import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectToDatabase, Project, User } from "@repo/db";
import jwt from "jsonwebtoken";
import { z } from "zod";

const manualSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  plan: z.enum(["free", "pro"]),
});

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

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not logged in" } },
        { status: 401 }
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
        { error: { code: "NOT_FOUND", message: "Project not found or access denied" } },
        { status: 404 }
      );
    }

    // Update plan and status
    project.plan = plan;
    project.subscriptionStatus = plan === "pro" ? "active" : "none";
    project.billingProvider = plan === "pro" ? "manual" : "none";

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
            message: "Validation failed: " + error.errors.map((e) => e.message).join(", "),
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to perform manual plan change" } },
      { status: 500 }
    );
  }
}
