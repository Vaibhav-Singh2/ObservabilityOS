import { NextResponse } from "next/server";
import { connectToDatabase, Project, Service, Metric } from "@repo/db";
import { z } from "zod";
import { Types } from "mongoose";

// Validation schema for single metric item
const metricItemSchema = z.object({
  service: z.string().min(1, "Service name is required"),
  environment: z.enum(["prod", "staging", "dev"]),
  timestamp: z.string().datetime().optional(),
  cpuUsage: z.number().min(0, "CPU usage must be at least 0").max(100, "CPU usage cannot exceed 100"),
  memoryUsage: z.number().min(0, "Memory usage must be at least 0"),
  memoryLimit: z.number().min(0, "Memory limit must be at least 0"),
  latencyMs: z.number().min(0, "Latency must be at least 0"),
});

// Payload can be a single metric item or an array of items
const ingestPayloadSchema = z.union([
  metricItemSchema,
  z.array(metricItemSchema),
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

    // Standardize to an array
    const metricItems = Array.isArray(validatedData) ? validatedData : [validatedData];

    if (metricItems.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // 5. Cache/Fetch Services
    const existingServices = await Service.find({ projectId: project._id });
    const serviceMap = new Map<string, Types.ObjectId>();
    for (const s of existingServices) {
      serviceMap.set(`${s.name}-${s.environment}`, s._id);
    }

    // Ensure all services mentioned in the metrics exist
    for (const item of metricItems) {
      const cacheKey = `${item.service}-${item.environment}`;
      if (!serviceMap.has(cacheKey)) {
        let s = await Service.findOne({
          projectId: project._id,
          name: item.service,
          environment: item.environment,
        });

        if (!s) {
          try {
            s = await Service.create({
              projectId: project._id,
              name: item.service,
              environment: item.environment,
            });
          } catch (err) {
            // Retrieve in case of concurrent creation race condition
            s = await Service.findOne({
              projectId: project._id,
              name: item.service,
              environment: item.environment,
            });
            if (!s) {
              throw new Error(`Failed to resolve service ${item.service}`);
            }
          }
        }
        serviceMap.set(cacheKey, s._id);
      }
    }

    // 6. Map Metrics & Bulk Insert
    const metricsToInsert = metricItems.map((item) => {
      const serviceId = serviceMap.get(`${item.service}-${item.environment}`);
      return {
        projectId: project._id,
        serviceId,
        timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
        environment: item.environment,
        cpuUsage: item.cpuUsage,
        memoryUsage: item.memoryUsage,
        memoryLimit: item.memoryLimit,
        latencyMs: item.latencyMs,
      };
    });

    await Metric.insertMany(metricsToInsert);

    return NextResponse.json({
      success: true,
      count: metricsToInsert.length,
    });
  } catch (error) {
    console.error("Metrics Ingestion API Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Validation failed",
            details: error.errors,
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
