import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectToDatabase, Incident, Project, User } from "@repo/db";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { delCache } from "@/lib/redis";

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

    // Tenant Check: Ensure user owns this project
    const project = await Project.findOne({ _id: projectId, ownerId: user._id });
    if (!project) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden: You do not own this project" } },
        { status: 403 }
      );
    }

    const incidents = await Incident.find({ projectId })
      .populate("serviceId")
      .populate("deployId")
      .sort({ createdAt: -1 });

    return NextResponse.json({ incidents });
  } catch (error) {
    console.error("Incidents GET Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve incidents" } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not logged in" } },
        { status: 401 }
      );
    }

    const { incidentId, status } = await request.json();

    if (!incidentId || !status || !["open", "investigating", "resolved"].includes(status)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid payload parameters" } },
        { status: 400 }
      );
    }

    // Find Incident
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Incident not found" } },
        { status: 404 }
      );
    }

    // Tenant Check: Ensure user owns the project this incident belongs to
    const project = await Project.findOne({ _id: incident.projectId, ownerId: user._id });
    if (!project) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden: Access denied" } },
        { status: 403 }
      );
    }

    // Update status
    const previousStatus = incident.status;
    incident.status = status;

    if (status === "resolved" && previousStatus !== "resolved") {
      incident.resolvedAt = new Date();
      incident.ttr = incident.resolvedAt.getTime() - incident.createdAt.getTime();
    } else if (status !== "resolved" && previousStatus === "resolved") {
      incident.resolvedAt = undefined;
      incident.ttr = undefined;
    }

    await incident.save();

    // Invalidate dashboard cache
    await delCache(`dashboard:project:${incident.projectId.toString()}`);

    // Populate service and deploy to return full object
    const updatedIncident = await Incident.findById(incidentId)
      .populate("serviceId")
      .populate("deployId");

    return NextResponse.json({ incident: updatedIncident });
  } catch (error) {
    console.error("Incidents PATCH Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update incident" } },
      { status: 500 }
    );
  }
}
