import { getAuthenticatedUser } from "@/lib/auth";

import { NextResponse } from "next/server";
import { Project, Incident, Comment } from "@repo/db";

import { z } from "zod";



const commentCreateSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  incidentId: z.string().min(1, "incidentId is required"),
  content: z.string().min(1, "Comment content cannot be empty"),
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
    const { projectId, incidentId, content } =
      commentCreateSchema.parse(rawBody);

    // Tenant check: Ensure user owns this project
    const project = await Project.findOne({
      _id: projectId,
      ownerId: user._id,
    });
    if (!project) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Forbidden: You do not own this project",
          },
        },
        { status: 403 },
      );
    }

    // Verify incident belongs to this project
    const incident = await Incident.findOne({
      _id: incidentId,
      projectId: project._id,
    });
    if (!incident) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Incident not found in this project",
          },
        },
        { status: 404 },
      );
    }

    // Create the comment
    const comment = await Comment.create({
      incidentId: incident._id,
      userId: user._id,
      content: content.trim(),
    });

    // Populate user info for the response
    const populated = await Comment.findById(comment._id).populate(
      "userId",
      "username email avatarUrl",
    );
    if (!populated) {
      throw new Error("Failed to retrieve created comment");
    }

    const u = populated.userId as unknown as {
      _id: { toString: () => string };
      username: string;
      email?: string | null;
      avatarUrl?: string | null;
    } | null;
    const serializedComment = {
      id: populated._id.toString(),
      incidentId: populated.incidentId.toString(),
      content: populated.content,
      createdAt: populated.createdAt.toISOString(),
      user: u
        ? {
            id: u._id.toString(),
            username: u.username,
            email: u.email || null,
            avatarUrl: u.avatarUrl || null,
          }
        : null,
    };

    return NextResponse.json({ comment: serializedComment }, { status: 201 });
  } catch (error) {
    console.error("Comment POST Error:", error);
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
          message: "Failed to create comment",
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
    const commentId = searchParams.get("commentId");

    if (!projectId || !commentId) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "projectId and commentId are required",
          },
        },
        { status: 400 },
      );
    }

    // Tenant check: Ensure user owns this project
    const project = await Project.findOne({
      _id: projectId,
      ownerId: user._id,
    });
    if (!project) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Forbidden: You do not own this project",
          },
        },
        { status: 403 },
      );
    }

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Comment not found" } },
        { status: 404 },
      );
    }

    // Verify comment belongs to an incident in this project
    const incident = await Incident.findOne({
      _id: comment.incidentId,
      projectId: project._id,
    });
    if (!incident) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Forbidden: Comment not associated with this project",
          },
        },
        { status: 403 },
      );
    }

    // Auth check: Only comment author OR project owner can delete comment
    const isCommentAuthor = comment.userId.toString() === user._id.toString();
    const isProjectOwner = project.ownerId.toString() === user._id.toString();

    if (!isCommentAuthor && !isProjectOwner) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Forbidden: You cannot delete this comment",
          },
        },
        { status: 403 },
      );
    }

    await comment.deleteOne();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Comment DELETE Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete comment",
        },
      },
      { status: 500 },
    );
  }
}
