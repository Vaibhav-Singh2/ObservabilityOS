/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processAnomalyDetection } from "./anomaly";
import {
  connectToDatabase,
  Project,
  Service,
  Log,
  Metric,
  Incident,
  Deploy,
} from "@repo/db";
import { generateIncidentAnalysis } from "@repo/ai";
import { dispatchMultiChannelIncidentAlert } from "./alerts";
import mongoose, { Types } from "mongoose";

// Mock AI engine and notification dispatcher
vi.mock("@repo/ai", () => ({
  generateIncidentAnalysis: vi.fn(),
  generateIncidentPrompt: vi.fn(),
}));

vi.mock("./alerts", () => ({
  dispatchMultiChannelIncidentAlert: vi.fn().mockResolvedValue(undefined),
}));

describe("Anomaly Detection Integration Tests", () => {
  let project: any;
  let service: any;

  beforeEach(async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/observability_test";
    await connectToDatabase();

    // Clear collections
    await Project.deleteMany({});
    await Service.deleteMany({});
    await Log.deleteMany({});
    await Metric.deleteMany({});
    await Incident.deleteMany({});
    await Deploy.deleteMany({});

    vi.mocked(generateIncidentAnalysis).mockReset();
    vi.mocked(dispatchMultiChannelIncidentAlert).mockReset();

    // Create dummy project and service
    project = await Project.create({
      name: "Test Ops",
      apiKey: "test-key-hash",
      minErrorCount: 3,
      zScoreThreshold: 2.5,
    });

    service = await Service.create({
      projectId: project._id,
      name: "auth-service",
      environment: "prod",
    });
  });

  afterEach(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it("should not create an incident under normal conditions (low error count)", async () => {
    // 1. Create a quiet baseline of logs (1 log per 5 minutes for the last hour)
    const now = Date.now();
    for (let i = 1; i <= 12; i++) {
      await Log.create({
        projectId: project._id,
        serviceId: service._id,
        environment: "prod",
        level: "info",
        message: `baseline log ${i}`,
        timestamp: new Date(now - i * 5 * 60 * 1000),
      });
    }

    // 2. Insert 1 error log in the current window (fails minErrorCount = 3 threshold)
    await Log.create({
      projectId: project._id,
      serviceId: service._id,
      environment: "prod",
      level: "error",
      message: "unauthorized request",
      timestamp: new Date(),
    });

    await processAnomalyDetection(
      project._id.toString(),
      service._id.toString(),
      "prod",
    );

    const incidents = await Incident.find({ projectId: project._id });
    expect(incidents.length).toBe(0);
    expect(generateIncidentAnalysis).not.toHaveBeenCalled();
  });

  it("should detect a spike, generate an AI summary, create an incident, and send alerts", async () => {
    // 1. Establish a low baseline (e.g. 0 errors per minute for the last hour)
    const now = Date.now();

    // 2. Insert a spike of errors in the last 2 minutes (exceeds minErrorCount = 3 and raises Z-score)
    for (let i = 0; i < 5; i++) {
      await Log.create({
        projectId: project._id,
        serviceId: service._id,
        environment: "prod",
        level: "error",
        message: `Fatal db error ${i}`,
        timestamp: new Date(now - i * 10000), // very recent
      });
    }

    // Mock AI return
    vi.mocked(generateIncidentAnalysis).mockResolvedValue({
      title: "AI Resolved DB Outage",
      summary: "Database connection pool exhaustion detected",
      rootCause: "High concurrent traffic",
      impact: "Authentication endpoints failing",
      suggestedFix: ["Scale connection pool size"],
      confidence: 0.95,
    });

    await processAnomalyDetection(
      project._id.toString(),
      service._id.toString(),
      "prod",
    );

    // Verify Incident was saved to DB
    const incidents = await Incident.find({ projectId: project._id });
    expect(incidents.length).toBe(1);
    expect(incidents[0].title).toBe("AI Resolved DB Outage");
    expect(incidents[0].status).toBe("open");
    expect(incidents[0].confidence).toBe(0.95);

    // Verify AI generator was called
    expect(generateIncidentAnalysis).toHaveBeenCalled();

    // Verify dispatcher was called
    expect(dispatchMultiChannelIncidentAlert).toHaveBeenCalled();
  });

  it("should skip incident creation if cooldown is active", async () => {
    const now = Date.now();

    // 1. Create a recent incident (2 minutes ago) to trigger cooldown
    const existingIncident = await Incident.create({
      projectId: project._id,
      serviceId: service._id,
      title: "Previous Outage",
      summary: "Previous db issue",
      rootCause: "exhaustion",
      impact: "all",
      suggestedFix: ["restart"],
      confidence: 0.9,
      status: "open",
      createdAt: new Date(now - 2 * 60 * 1000),
    });

    // 2. Inject an error log spike
    for (let i = 0; i < 5; i++) {
      await Log.create({
        projectId: project._id,
        serviceId: service._id,
        environment: "prod",
        level: "error",
        message: `fatal crash during cooldown ${i}`,
        timestamp: new Date(now - i * 1000),
      });
    }

    await processAnomalyDetection(
      project._id.toString(),
      service._id.toString(),
      "prod",
    );

    // Verify no NEW incident is created, count remains 1
    const incidents = await Incident.find({ projectId: project._id });
    expect(incidents.length).toBe(1);
    expect(incidents[0]._id.toString()).toBe(existingIncident._id.toString());
    expect(generateIncidentAnalysis).not.toHaveBeenCalled();
  });
});
