import { NextResponse } from "next/server";
import { connectToDatabase, Project, Service, Log } from "@repo/db";
import { z } from "zod";
import { Types } from "mongoose";
import { triggerAnomalyCheck } from "@/lib/anomaly";

// Validation schema for single log items
const logItemSchema = z.object({
  service: z.string().min(1, "Service name is required"),
  environment: z.enum(["prod", "staging", "dev"]),
  timestamp: z.string().datetime().optional(), // Must be ISO datetime format if provided
  level: z.enum(["error", "warn", "info", "debug"]),
  message: z.string().min(1, "Message is required"),
  metadata: z.record(z.any()).optional(),
  traceId: z.string().optional(),
});

// Payload can be a single log or an array of logs
const ingestPayloadSchema = z.union([
  logItemSchema,
  z.array(logItemSchema),
]);

export async function POST(request: Request) {
  try {
    // 1. Authenticate Request
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Missing x-api-key header",
          },
        },
        { status: 401 }
      );
    }

    // 2. Connect to Database
    await connectToDatabase();

    // 3. Find Project (Tenant Isolation)
    const project = await Project.findOne({ apiKey });
    if (!project) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid API key",
          },
        },
        { status: 401 }
      );
    }

    // 4. Parse & Validate Payload
    const rawBody = await request.json();
    const validatedData = ingestPayloadSchema.parse(rawBody);

    // Standardize to an array of log items
    const logItems = Array.isArray(validatedData) ? validatedData : [validatedData];

    if (logItems.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // 5. Cache/Fetch Services
    const existingServices = await Service.find({ projectId: project._id });
    const serviceMap = new Map<string, Types.ObjectId>();
    for (const s of existingServices) {
      serviceMap.set(`${s.name}-${s.environment}`, s._id);
    }

    // Ensure all services mentioned in the logs exist
    for (const logItem of logItems) {
      const cacheKey = `${logItem.service}-${logItem.environment}`;
      if (!serviceMap.has(cacheKey)) {
        let s = await Service.findOne({
          projectId: project._id,
          name: logItem.service,
          environment: logItem.environment,
        });

        if (!s) {
          try {
            s = await Service.create({
              projectId: project._id,
              name: logItem.service,
              environment: logItem.environment,
            });
          } catch (err) {
            // In case of concurrent request race conditions, retrieve the created service
            s = await Service.findOne({
              projectId: project._id,
              name: logItem.service,
              environment: logItem.environment,
            });
            if (!s) {
              throw new Error(`Failed to resolve service ${logItem.service}`);
            }
          }
        }
        serviceMap.set(cacheKey, s._id);
      }
    }

    // 6. Map Logs & Bulk Insert
    const logsToInsert = logItems.map((logItem) => {
      const serviceId = serviceMap.get(`${logItem.service}-${logItem.environment}`);
      return {
        projectId: project._id,
        serviceId,
        timestamp: logItem.timestamp ? new Date(logItem.timestamp) : new Date(),
        level: logItem.level,
        message: logItem.message,
        metadata: logItem.metadata || {},
        traceId: logItem.traceId,
        environment: logItem.environment,
      };
    });

    await Log.insertMany(logsToInsert);

    // Trigger Anomaly Detection asynchronously for each unique service+environment in the batch
    const uniqueServiceEnvs = new Map<string, { serviceId: Types.ObjectId; environment: "prod" | "staging" | "dev" }>();
    for (const logItem of logsToInsert) {
      if (logItem.serviceId) {
        const key = `${logItem.serviceId.toString()}-${logItem.environment}`;
        uniqueServiceEnvs.set(key, { 
          serviceId: logItem.serviceId as Types.ObjectId, 
          environment: logItem.environment as "prod" | "staging" | "dev"
        });
      }
    }

    for (const { serviceId, environment } of uniqueServiceEnvs.values()) {
      triggerAnomalyCheck(project._id.toString(), serviceId.toString(), environment).catch((err) => {
        console.error(`[Ingest Route] Failed to trigger anomaly check for service ${serviceId}:`, err);
      });
    }

    return NextResponse.json({
      success: true,
      count: logsToInsert.length,
    });
  } catch (error) {
    console.error("Ingestion API Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Validation failed",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}
