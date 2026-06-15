/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { connectToDatabase, Project, Service, Log } from "@repo/db";
import { hashApiKey } from "@/lib/crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRedisClient } from "@/lib/redis";
import { triggerAnomalyCheck } from "@/lib/anomaly";
import mongoose from "mongoose";

// Mock rate limiting, redis pubsub, and anomaly engine
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(),
}));

vi.mock("@/lib/anomaly", () => ({
  triggerAnomalyCheck: vi.fn().mockResolvedValue(undefined),
}));

describe("Ingestion API Route", () => {
  let project: any;
  const rawApiKey = "obs_sk_test_api_key_12345";
  const hashedKey = hashApiKey(rawApiKey);

  beforeEach(async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/observability_test";
    await connectToDatabase();

    // Clean DB collections
    await Project.deleteMany({});
    await Service.deleteMany({});
    await Log.deleteMany({});

    // Reset mocks
    vi.mocked(checkRateLimit).mockReset();
    vi.mocked(getRedisClient).mockReset();
    vi.mocked(triggerAnomalyCheck).mockReset();

    // Default rate limit allow
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, count: 1 });

    // Create a dummy project
    project = await Project.create({
      name: "Ingest Test Project",
      apiKey: hashedKey,
      plan: "free",
      subscriptionStatus: "active",
      billingProvider: "none",
    });
  });

  afterEach(async () => {
    // Make sure we clear connections after run
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it("should return 401 if x-api-key header is missing", async () => {
    const req = new Request("http://localhost:3000/api/ingest", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toContain("Missing x-api-key");
  });

  it("should return 401 if x-api-key is invalid", async () => {
    const req = new Request("http://localhost:3000/api/ingest", {
      method: "POST",
      headers: { "x-api-key": "obs_sk_wrong_key" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.message).toContain("Invalid API key");
  });

  it("should return 429 if rate limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, count: 101 });

    const req = new Request("http://localhost:3000/api/ingest", {
      method: "POST",
      headers: { "x-api-key": rawApiKey },
      body: JSON.stringify({
        service: "test-service",
        environment: "dev",
        level: "info",
        message: "hello",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("TOO_MANY_REQUESTS");
  });

  it("should return 400 on payload validation failure", async () => {
    const req = new Request("http://localhost:3000/api/ingest", {
      method: "POST",
      headers: { "x-api-key": rawApiKey },
      body: JSON.stringify({
        service: "", // empty - invalid
        environment: "invalid-env", // invalid env enum
        level: "info",
        message: "",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("should ingest single log, scrub PII, create service, and return 200", async () => {
    // Mock redis client
    const mockRedis = {
      get: vi.fn().mockResolvedValue("0"),
      incrby: vi.fn().mockResolvedValue(100),
      expire: vi.fn().mockResolvedValue(1),
      publish: vi.fn().mockResolvedValue(1),
    };
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

    const payload = {
      service: "payment-portal",
      environment: "prod" as const,
      level: "error" as const,
      message:
        "Checkout failed for user contact@hacker.com on card 4111111111111111",
      metadata: {
        password: "supersecretpassword",
        ip: "127.0.0.1",
      },
      traceId: "trace-xyz",
    };

    const req = new Request("http://localhost:3000/api/ingest", {
      method: "POST",
      headers: { "x-api-key": rawApiKey },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const resBody = await res.json();
    expect(resBody.success).toBe(true);
    expect(resBody.count).toBe(1);

    // Verify service was created
    const service = await Service.findOne({
      projectId: project._id,
      name: "payment-portal",
    });
    expect(service).toBeDefined();
    expect(service?.environment).toBe("prod");

    // Verify log was saved and PII was scrubbed
    const savedLog = await Log.findOne({ projectId: project._id });
    expect(savedLog).toBeDefined();
    expect(savedLog?.serviceId.toString()).toBe(service?._id.toString());
    expect(savedLog?.message).toBe(
      "Checkout failed for user [EMAIL_REDACTED] on card [CARD_REDACTED]",
    );
    expect(savedLog?.metadata?.password).toBe("[REDACTED]");
    expect(savedLog?.metadata?.ip).toBe("127.0.0.1");

    // Check Redis Publish and Anomaly Trigger calls
    expect(mockRedis.publish).toHaveBeenCalled();
    expect(triggerAnomalyCheck).toHaveBeenCalledWith(
      project._id.toString(),
      service?._id.toString(),
      "prod",
    );
  });

  it("should reject log if log volume quota is exceeded", async () => {
    // Return high volume usage (free limit is 5GB)
    const mockRedis = {
      get: vi.fn().mockResolvedValue("6000000000"), // 6GB
    };
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

    const req = new Request("http://localhost:3000/api/ingest", {
      method: "POST",
      headers: { "x-api-key": rawApiKey },
      body: JSON.stringify({
        service: "auth-service",
        environment: "dev",
        level: "info",
        message: "some log message",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("QUOTA_EXCEEDED");
    expect(body.error.message).toContain(
      "Monthly log ingestion limit exceeded",
    );
  });

  it("should reject log if service count quota is exceeded", async () => {
    const mockRedis = {
      get: vi.fn().mockResolvedValue("0"),
    };
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

    // Create 10 existing services (Free limit is 10 services)
    for (let i = 0; i < 10; i++) {
      await Service.create({
        projectId: project._id,
        name: `service-${i}`,
        environment: "dev",
      });
    }

    // Attempt to ingest a log for a NEW service (service-11)
    const req = new Request("http://localhost:3000/api/ingest", {
      method: "POST",
      headers: { "x-api-key": rawApiKey },
      body: JSON.stringify({
        service: "new-eleventh-service",
        environment: "dev",
        level: "info",
        message: "hello",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("QUOTA_EXCEEDED");
    expect(body.error.message).toContain("Service limit reached");
  });
});
