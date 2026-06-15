/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getQuotaKey,
  getLogVolumeUsage,
  incrementLogVolumeUsage,
  checkQuotaLimits,
  PLAN_LIMITS,
} from "./quota";
import { getRedisClient } from "./redis";
import { Service } from "@repo/db";

vi.mock("./redis", () => {
  return {
    getRedisClient: vi.fn(),
  };
});

vi.mock("@repo/db", () => {
  return {
    connectToDatabase: vi.fn(),
    Service: {
      countDocuments: vi.fn(),
    },
  };
});

describe("Quota Enforcement Service", () => {
  beforeEach(() => {
    vi.mocked(getRedisClient).mockReset();
    vi.mocked(Service.countDocuments).mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should generate correct monthly quota keys", () => {
    const key = getQuotaKey("project-123");
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    expect(key).toBe(`quota:volume:project-123:${year}${month}`);
  });

  it("should return log volume usage from Redis", async () => {
    const mockRedis = {
      get: vi.fn().mockResolvedValue("10240"),
    };
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

    const usage = await getLogVolumeUsage("project-123");
    expect(usage).toBe(10240);
    expect(mockRedis.get).toHaveBeenCalledWith(getQuotaKey("project-123"));
  });

  it("should increment log volume usage and set expiration on first use", async () => {
    const mockRedis = {
      incrby: vi.fn().mockResolvedValue(500), // first write returns exact bytes added
      expire: vi.fn().mockResolvedValue(1),
    };
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

    const usage = await incrementLogVolumeUsage("project-123", 500);
    expect(usage).toBe(500);
    expect(mockRedis.incrby).toHaveBeenCalledWith(
      getQuotaKey("project-123"),
      500,
    );
    expect(mockRedis.expire).toHaveBeenCalledWith(
      getQuotaKey("project-123"),
      40 * 24 * 60 * 60,
    );
  });

  it("should increment log volume usage without resetting expiration on subsequent writes", async () => {
    const mockRedis = {
      incrby: vi.fn().mockResolvedValue(1200), // subsequent write returns cumulative sum
      expire: vi.fn(),
    };
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

    const usage = await incrementLogVolumeUsage("project-123", 500);
    expect(usage).toBe(1200);
    expect(mockRedis.incrby).toHaveBeenCalledWith(
      getQuotaKey("project-123"),
      500,
    );
    expect(mockRedis.expire).not.toHaveBeenCalled();
  });

  it("should evaluate quota limits correctly when limits are exceeded", async () => {
    // Mock redis for volume usage
    const mockRedis = {
      get: vi.fn().mockResolvedValue("4500000000"), // 4.5 GB (free plan limit is 5 GB = 5368709120 bytes)
    };
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

    // Mock service count to exceed free limit (10 services)
    vi.mocked(Service.countDocuments).mockResolvedValue(12);

    const limits = await checkQuotaLimits("project-123", "free", 1000000000); // add 1 GB (total = 5.5 GB)

    expect(limits.logVolume.current).toBe(4500000000);
    expect(limits.logVolume.limit).toBe(PLAN_LIMITS.free.maxLogVolumeBytes);
    expect(limits.logVolume.exceeded).toBe(true); // 5.5 GB > 5 GB

    expect(limits.services.current).toBe(12);
    expect(limits.services.limit).toBe(PLAN_LIMITS.free.maxServices);
    expect(limits.services.exceeded).toBe(true); // 12 > 10
  });

  it("should evaluate quota limits correctly when limits are not exceeded", async () => {
    const mockRedis = {
      get: vi.fn().mockResolvedValue("10000"),
    };
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);
    vi.mocked(Service.countDocuments).mockResolvedValue(1);

    const limits = await checkQuotaLimits("project-123", "free", 5000);

    expect(limits.logVolume.exceeded).toBe(false);
    expect(limits.services.exceeded).toBe(false);
  });
});
