import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectToDatabase, Project, Service, User } from "@repo/db";
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

    const services = await Service.find({ projectId: project._id }).sort({ name: 1, environment: 1 });
    return NextResponse.json({ services });
  } catch (error) {
    console.error("Services GET Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve services" } },
      { status: 500 }
    );
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

    const { projectId, name, environment } = await request.json();
    if (!projectId || !name || !environment) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "projectId, name, and environment are required" } },
        { status: 400 }
      );
    }

    if (!["prod", "staging", "dev"].includes(environment)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid environment value" } },
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

    // Check if service with same name and environment already exists in the project
    const existing = await Service.findOne({
      projectId: project._id,
      name: name.trim(),
      environment,
    });

    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Service already exists with this name and environment" } },
        { status: 409 }
      );
    }

    const service = await Service.create({
      projectId: project._id,
      name: name.trim(),
      environment,
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error("Services POST Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create service" } },
      { status: 500 }
    );
  }
}
