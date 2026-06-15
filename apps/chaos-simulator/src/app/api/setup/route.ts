import { NextResponse } from "next/server";
import { connectToDatabase, Project, User } from "@repo/db";
import crypto from "crypto";

const PLAIN_API_KEY = "obs_sk_simulator_api_key_123456";

function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Ensure dummy user exists
    let user = await User.findOne({ githubId: "chaos_simulator_user" });
    if (!user) {
      user = await User.create({
        githubId: "chaos_simulator_user",
        username: "simulated_user",
        email: "simulator@observabilityos.test",
      });
      console.log(`[Chaos Setup] Created simulated user: ${user._id}`);
    }

    // 2. Ensure simulator project exists with hashed version of PLAIN_API_KEY
    const hashedKey = hashApiKey(PLAIN_API_KEY);
    let project = await Project.findOne({ apiKey: hashedKey });

    if (!project) {
      // Create project with hashed key
      project = await Project.create({
        ownerId: user._id,
        name: "Chaos Simulator Sandbox",
        apiKey: hashedKey,
        plan: "free", // Default to free tier so we bypass the LLM and cost nothing
        subscriptionStatus: "none",
        billingProvider: "none",
      });
      console.log(
        `[Chaos Setup] Created simulator project: ${project.name} (${project._id})`,
      );
    } else if (
      project.name !== "Chaos Simulator Sandbox" ||
      project.plan !== "free"
    ) {
      project.name = "Chaos Simulator Sandbox";
      project.plan = "free";
      project.subscriptionStatus = "none";
      await project.save();
    }

    return NextResponse.json({
      success: true,
      projectId: project._id.toString(),
      projectName: project.name,
      apiKey: PLAIN_API_KEY,
      endpoint:
        process.env.NEXT_PUBLIC_INGEST_ENDPOINT ||
        "http://localhost:3000/api/ingest",
      metricsEndpoint:
        process.env.NEXT_PUBLIC_METRICS_ENDPOINT ||
        "http://localhost:3000/api/metrics/ingest",
    });
  } catch (err) {
    console.error("[Chaos Setup] Error setting up database project:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Database setup failed",
      },
      { status: 500 },
    );
  }
}
