import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit } from "./rate-limit";
import { getRedisClient } from "./redis";

// Mock the Redis client helper
vi.mock("./redis", () => {
  return {
    getRedisClient: vi.fn(),
  };
});

describe("Rate Limiting Service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getRedisClient).mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("In-Memory Sliding Window Fallback", () => {
    it("should allow requests under the limit and block once exceeded", async () => {
      // Return null to trigger in-memory rate limiting fallback
      vi.mocked(getRedisClient).mockReturnValue(null);

      const apiKey = "test-api-key-mem";
      const limit = 3;
      const windowMs = 10000; // 10s

      // Call 1
      const res1 = await checkRateLimit(apiKey, limit, windowMs);
      expect(res1.allowed).toBe(true);
      expect(res1.count).toBe(1);

      // Call 2
      const res2 = await checkRateLimit(apiKey, limit, windowMs);
      expect(res2.allowed).toBe(true);
      expect(res2.count).toBe(2);

      // Call 3
      const res3 = await checkRateLimit(apiKey, limit, windowMs);
      expect(res3.allowed).toBe(true);
      expect(res3.count).toBe(3);

      // Call 4 - Should be blocked
      const res4 = await checkRateLimit(apiKey, limit, windowMs);
      expect(res4.allowed).toBe(false);
      expect(res4.count).toBe(3);
    });

    it("should slide window and allow new requests after timeout window passes", async () => {
      vi.mocked(getRedisClient).mockReturnValue(null);

      const apiKey = "test-api-key-slide";
      const limit = 2;
      const windowMs = 5000; // 5s

      // Trigger 2 requests to fill limit
      await checkRateLimit(apiKey, limit, windowMs);
      await checkRateLimit(apiKey, limit, windowMs);

      // Verify third is blocked
      const blockedRes = await checkRateLimit(apiKey, limit, windowMs);
      expect(blockedRes.allowed).toBe(false);

      // Advance clock by 6 seconds
      vi.advanceTimersByTime(6000);

      // Should be allowed again
      const allowedRes = await checkRateLimit(apiKey, limit, windowMs);
      expect(allowedRes.allowed).toBe(true);
      expect(allowedRes.count).toBe(1);
    });
  });

  describe("Redis-based sliding window", () => {
    it("should call Redis pipeline and allow requests under limit", async () => {
      const mockPipeline = {
        zadd: vi.fn().mockReturnThis(),
        zremrangebyscore: vi.fn().mockReturnThis(),
        zcard: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [null, 1], // zadd
          [null, 0], // zremrange
          [null, 2], // zcard (current count = 2)
          [null, 1], // expire
        ]),
      };

      const mockRedis = {
        status: "ready",
        pipeline: vi.fn().mockReturnValue(mockPipeline),
        zrem: vi.fn().mockResolvedValue(1),
      };

      vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

      const apiKey = "redis-api-key";
      const limit = 5;
      const windowMs = 60000;

      const result = await checkRateLimit(apiKey, limit, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(2);

      expect(mockPipeline.zadd).toHaveBeenCalled();
      expect(mockPipeline.zremrangebyscore).toHaveBeenCalled();
      expect(mockPipeline.zcard).toHaveBeenCalled();
      expect(mockPipeline.expire).toHaveBeenCalled();
      expect(mockRedis.zrem).not.toHaveBeenCalled();
    });

    it("should call zrem to remove active token if limit is exceeded", async () => {
      const mockPipeline = {
        zadd: vi.fn().mockReturnThis(),
        zremrangebyscore: vi.fn().mockReturnThis(),
        zcard: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [null, 1],
          [null, 0],
          [null, 6], // count = 6, limit is 5
          [null, 1],
        ]),
      };

      const mockRedis = {
        status: "ready",
        pipeline: vi.fn().mockReturnValue(mockPipeline),
        zrem: vi.fn().mockResolvedValue(1),
      };

      vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

      const apiKey = "redis-api-key-exceeded";
      const limit = 5;
      const windowMs = 60000;

      const result = await checkRateLimit(apiKey, limit, windowMs);
      expect(result.allowed).toBe(false);
      expect(result.count).toBe(5); // 6 - 1

      expect(mockRedis.zrem).toHaveBeenCalled();
    });
  });
});
