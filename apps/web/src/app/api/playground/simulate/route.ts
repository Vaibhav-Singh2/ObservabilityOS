import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  connectToDatabase,
  Project,
  Service,
  Log,
  Deploy,
  Incident,
  User,
} from "@repo/db";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Types } from "mongoose";
import { processAnomalyDetection } from "@/lib/anomaly";
import { delCache } from "@/lib/redis";

const simulateSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  serviceName: z.string().min(1, "Service name is required"),
  environment: z.enum(["prod", "staging", "dev"]),
  scenarioId: z.string().min(1, "Scenario ID is required"),
  includeDeploy: z.boolean(),
  seedBaseline: z.boolean(),
  customErrorMessage: z.string().optional(),
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
    // 1. Authenticate Request
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not logged in" } },
        { status: 401 },
      );
    }

    // 2. Parse and Validate Request Body
    const rawBody = await request.json();
    const validatedData = simulateSchema.parse(rawBody);

    // 3. Find and verify Project ownership
    const project = await Project.findOne({
      _id: validatedData.projectId,
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

    // 4. Resolve Service
    let service = await Service.findOne({
      projectId: project._id,
      name: validatedData.serviceName.trim(),
      environment: validatedData.environment,
    });

    if (!service) {
      service = await Service.create({
        projectId: project._id,
        name: validatedData.serviceName.trim(),
        environment: validatedData.environment,
      });
    }

    const now = new Date();

    // 5. Seed Baseline logs if requested
    if (validatedData.seedBaseline) {
      // Clear recent logs to prevent interference
      await Log.deleteMany({
        projectId: project._id,
        serviceId: service._id,
        environment: validatedData.environment,
        timestamp: { $gte: new Date(now.getTime() - 75 * 60 * 1000) },
      });

      // Insert historical normal logs (low error baseline: 12 normal/heartbeat logs over past hour)
      const historicalLogs = [];
      for (let i = 1; i <= 12; i++) {
        historicalLogs.push({
          projectId: project._id,
          serviceId: service._id,
          timestamp: new Date(now.getTime() - i * 5 * 60 * 1000 - 1000), // i * 5 mins ago
          level: "info",
          message:
            i === 6
              ? "Periodic database optimization heartbeat checked"
              : "Request processed successfully",
          environment: validatedData.environment,
          metadata: { latencyMs: 40 + Math.floor(Math.random() * 80) },
        });
      }
      await Log.insertMany(historicalLogs);
    }

    // 6. Simulate git deployment if requested
    let deployId: Types.ObjectId | undefined = undefined;
    if (validatedData.includeDeploy) {
      let commitMessage =
        "Deploy general performance patches and minor enhancements";
      if (validatedData.scenarioId === "db-timeout") {
        commitMessage =
          "Configure knex database pool sizing configuration to 10 max";
      } else if (validatedData.scenarioId === "oom") {
        commitMessage =
          "Reduce worker thread allocation parameters in package.json";
      } else if (validatedData.scenarioId === "stripe") {
        commitMessage =
          "Refactor billing portal and webhook signature validations";
      } else if (validatedData.scenarioId === "sendgrid") {
        commitMessage = "Upgrade sendgrid email transporter library dependency";
      } else if (validatedData.scenarioId === "nullpointer") {
        commitMessage =
          "Refactor user authentication token session validation routine";
      }

      const commitSha =
        Math.random().toString(16).substring(2, 10) +
        Math.random().toString(16).substring(2, 10);
      const deploy = await Deploy.create({
        projectId: project._id,
        serviceId: service._id,
        commitSha,
        commitMessage,
        branch: "main",
        environment: validatedData.environment,
        deployedAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
      });
      deployId = deploy._id;
    }

    // 7. Generate scenario-specific logs
    let errorMessages: string[] = [];
    let scenarioMetadata: Record<string, any> = {};

    switch (validatedData.scenarioId) {
      case "db-timeout":
        errorMessages = [
          "MongooseError: Connection timeout after 30000ms at connectionPool.js:45",
          "MongooseError: Connection timeout after 30000ms at connectionPool.js:45",
          "Error: Knex: Timeout acquiring a connection. The pool is probably full. Are you missing a .transacting(tx)?",
          "Error: Knex: Timeout acquiring a connection. The pool is probably full. Are you missing a .transacting(tx)?",
          "Error: Knex: Timeout acquiring a connection. The pool is probably full. Are you missing a .transacting(tx)?",
        ];
        scenarioMetadata = {
          poolSize: 10,
          activeConnections: 10,
          dbName: "observability-prod",
        };
        break;
      case "oom":
        errorMessages = [
          "FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory",
          "FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory",
          "Process exited with code 137 (OOM Killed)",
          "Process exited with code 137 (OOM Killed)",
          "Process exited with code 137 (OOM Killed)",
        ];
        scenarioMetadata = {
          heapUsedBytes: 536870912,
          heapLimitBytes: 536870912,
          nodeVersion: "v20.10.0",
        };
        break;
      case "stripe":
        errorMessages = [
          "Error: Webhook signature verification failed. Invalid signature header.",
          "Error: Webhook signature verification failed. Invalid signature header.",
          "UnauthorizedAccessException: Failed to verify webhook event signature from Stripe. IP: 3.18.12.1",
          "UnauthorizedAccessException: Failed to verify webhook event signature from Stripe. IP: 3.18.12.1",
          "Error: webhook signature validation failed for stripe event: evt_abc123",
        ];
        scenarioMetadata = {
          provider: "stripe",
          gatewayStatus: 401,
          endpoint: "/api/billing/webhooks/stripe",
        };
        break;
      case "sendgrid":
        errorMessages = [
          "Error: Failed to send email via SendGrid API: 502 Bad Gateway",
          "Error: Failed to send email via SendGrid API: 502 Bad Gateway",
          "SendGrid API connection reset by peer at mail.sendgrid.com",
          "SendGrid API connection reset by peer at mail.sendgrid.com",
          "Error: Failed to send email via SendGrid API: 502 Bad Gateway",
        ];
        scenarioMetadata = {
          provider: "sendgrid",
          recipientCount: 1,
          statusCode: 502,
        };
        break;
      case "nullpointer":
        errorMessages = [
          "java.lang.NullPointerException: Cannot invoke 'String.length()' because 'token' is null at com.example.auth.AuthService.validateToken(AuthService.java:112)",
          "java.lang.NullPointerException: Cannot invoke 'String.length()' because 'token' is null at com.example.auth.AuthService.validateToken(AuthService.java:112)",
          "java.lang.NullPointerException: Cannot invoke 'String.length()' because 'token' is null at com.example.auth.AuthService.validateToken(AuthService.java:112)",
          "java.lang.NullPointerException: Cannot invoke 'String.length()' because 'token' is null at com.example.auth.AuthService.validateToken(AuthService.java:112)",
          "java.lang.NullPointerException: Cannot invoke 'String.length()' because 'token' is null at com.example.auth.AuthService.validateToken(AuthService.java:112)",
        ];
        scenarioMetadata = {
          class: "com.example.auth.AuthService",
          method: "validateToken",
          exceptionLine: 112,
        };
        break;
      case "custom":
      default:
        const msg =
          validatedData.customErrorMessage?.trim() ||
          "Simulated critical runtime error";
        errorMessages = Array(5).fill(msg);
        scenarioMetadata = { customSimulation: true };
        break;
    }

    const logsToInsert = errorMessages.map((message, i) => ({
      projectId: project._id,
      serviceId: service._id,
      timestamp: new Date(now.getTime() - i * 1000), // slightly offset in last few seconds
      level: "error",
      message,
      metadata: scenarioMetadata,
      traceId: `trace_playground_${Math.random().toString(36).substring(2, 9)}`,
      environment: validatedData.environment,
    }));

    await Log.insertMany(logsToInsert);

    // 8. Clear Cache
    await delCache(`dashboard:project:${project._id.toString()}`);

    // 9. Process Anomaly Detection synchronously to create the Incident immediately
    await processAnomalyDetection(
      project._id.toString(),
      service._id.toString(),
      validatedData.environment,
    );

    // 10. Fetch the newly created Incident
    const incident = await Incident.findOne({
      projectId: project._id,
      serviceId: service._id,
    })
      .sort({ createdAt: -1 })
      .populate("serviceId")
      .populate("deployId");

    return NextResponse.json({
      success: true,
      message: "Simulation completed successfully",
      incident: incident
        ? {
            id: incident._id.toString(),
            title: incident.title,
            summary: incident.summary,
            rootCause: incident.rootCause,
            impact: incident.impact,
            suggestedFix: incident.suggestedFix,
            confidence: incident.confidence,
            status: incident.status,
            createdAt: incident.createdAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    console.error("Simulation Ingestion API Error:", error);

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
          message:
            error instanceof Error
              ? error.message
              : "Internal server error during simulation",
        },
      },
      { status: 500 },
    );
  }
}
