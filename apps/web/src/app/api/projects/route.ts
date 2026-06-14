import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectToDatabase, Project, User } from "@repo/db";
import jwt from "jsonwebtoken";
import crypto from "crypto";

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

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not logged in" } },
        { status: 401 },
      );
    }

    const projects = await Project.find({ ownerId: user._id }).sort({
      createdAt: -1,
    });
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Projects GET Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve projects",
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not logged in" } },
        { status: 401 },
      );
    }

    const { name } = await request.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Project name is required" } },
        { status: 400 },
      );
    }

    const apiKey = `obs_sk_${crypto.randomBytes(24).toString("hex")}`;
    const project = await Project.create({
      ownerId: user._id,
      name: name.trim(),
      apiKey,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Projects POST Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project",
        },
      },
      { status: 500 },
    );
  }
}
