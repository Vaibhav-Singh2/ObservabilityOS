import { getAuthenticatedUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Project, type IProject } from "@repo/db";
import { z } from "zod";
import razorpay from "@/lib/razorpay";

const restoreSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
});

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_SELF_HOSTED === "true") {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 },
    );
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not logged in" } },
        { status: 401 },
      );
    }

    const rawBody = await request.json();
    const validatedData = restoreSchema.parse(rawBody);
    const { projectId } = validatedData;

    const project = await Project.findOne({
      _id: projectId,
      ownerId: user._id,
    });

    if (!project) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Project not found" } },
        { status: 404 },
      );
    }

    if (project.plan === "self-host") {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Self-host projects do not have subscriptions",
          },
        },
        { status: 400 },
      );
    }

    if (project.subscriptionStatus !== "cancelling") {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "No pending cancellation to restore",
          },
        },
        { status: 400 },
      );
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (
      !razorpayKeyId ||
      !razorpayKeySecret ||
      !project.razorpaySubscriptionId
    ) {
      project.subscriptionStatus = "active";
      (project as IProject).subscriptionEndsAt = undefined;
      await project.save();

      return NextResponse.json({
        success: true,
        restored: true,
        project: {
          id: project._id.toString(),
          plan: project.plan,
          subscriptionStatus: project.subscriptionStatus,
        },
      });
    }

    await razorpay.subscriptions.update(project.razorpaySubscriptionId, {
      cancel_at_cycle_end: false,
    } as Record<string, unknown>);

    project.subscriptionStatus = "active";
    (project as IProject).subscriptionEndsAt = undefined;
    await project.save();

    console.log(
      `[Restore Subscription] Project ${projectId} subscription ${project.razorpaySubscriptionId} restored.`,
    );

    return NextResponse.json({
      success: true,
      restored: true,
      project: {
        id: project._id.toString(),
        plan: project.plan,
        subscriptionStatus: project.subscriptionStatus,
      },
    });
  } catch (error) {
    console.error("Restore Subscription Error:", error);

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
          message: "Failed to restore subscription",
        },
      },
      { status: 500 },
    );
  }
}
