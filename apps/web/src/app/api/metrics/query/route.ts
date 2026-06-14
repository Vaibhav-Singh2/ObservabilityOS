import { getAuthenticatedUser } from "@/lib/auth";

import { NextResponse } from "next/server";
import { Project, Service, Metric } from "@repo/db";

import { getCache, setCache } from "@/lib/redis";

interface MetricDataPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  memoryLimit: number;
  latency: number;
}

export async function GET(request: Request) {
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
    const serviceId = searchParams.get("serviceId");
    const timeRange = searchParams.get("timeRange") || "24h";

    if (!projectId || !serviceId) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "projectId and serviceId are required",
          },
        },
        { status: 400 },
      );
    }

    // Tenant Isolation Check
    const project = await Project.findOne({
      _id: projectId,
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

    // Verify service belongs to project
    const service = await Service.findOne({
      _id: serviceId,
      projectId: project._id,
    });
    if (!service) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Service not found under this project",
          },
        },
        { status: 404 },
      );
    }

    // Time window & bucket sizing configuration
    const nowMs = Date.now();
    let startTimeMs = nowMs - 24 * 60 * 60 * 1000; // default 24h
    let bucketMs = 15 * 60 * 1000; // 15 mins for 24h

    if (timeRange === "1h") {
      startTimeMs = nowMs - 60 * 60 * 1000;
      bucketMs = 1 * 60 * 1000; // 1 min for 1h
    } else if (timeRange === "7d") {
      startTimeMs = nowMs - 7 * 24 * 60 * 60 * 1000;
      bucketMs = 2 * 60 * 60 * 1000; // 2 hours for 7 days
    }

    const cacheKey = `metrics:query:${project._id.toString()}:${service._id.toString()}:${timeRange}`;
    const cachedData = await getCache<MetricDataPoint[]>(cacheKey);
    if (cachedData) {
      return NextResponse.json({ metrics: cachedData });
    }

    const startTime = new Date(startTimeMs);

    // Grouping by time bucket using Mongo aggregate
    const aggregatedData = await Metric.aggregate([
      {
        $match: {
          projectId: project._id,
          serviceId: service._id,
          timestamp: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: {
            $toDate: {
              $subtract: [
                { $toLong: "$timestamp" },
                { $mod: [{ $toLong: "$timestamp" }, bucketMs] },
              ],
            },
          },
          avgCpu: { $avg: "$cpuUsage" },
          avgMemory: { $avg: "$memoryUsage" },
          avgLimit: { $avg: "$memoryLimit" },
          avgLatency: { $avg: "$latencyMs" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedMetrics = aggregatedData.map((d) => ({
      timestamp: d._id.toISOString(),
      cpu: Number(d.avgCpu.toFixed(2)),
      memory: Number(d.avgMemory.toFixed(2)),
      memoryLimit: Number(d.avgLimit.toFixed(2)),
      latency: Number(d.avgLatency.toFixed(2)),
    }));

    // Cache results for 5 minutes (300 seconds)
    await setCache(cacheKey, formattedMetrics, 300);

    return NextResponse.json({ metrics: formattedMetrics });
  } catch (error) {
    console.error("Metrics Query GET Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to query system metrics",
        },
      },
      { status: 500 },
    );
  }
}
