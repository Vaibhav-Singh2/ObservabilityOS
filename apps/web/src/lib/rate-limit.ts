import { getRedisClient } from "./redis";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
}

// In-Memory sliding-window rate limiter fallback
const memoryRateLimits = new Map<string, number[]>();

function checkMemoryRateLimit(
  apiKey: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const key = `mem_limit:${apiKey}`;
  const timestamps = memoryRateLimits.get(key) || [];

  // Filter out expired timestamps
  const activeTimestamps = timestamps.filter((ts) => now - ts < windowMs);

  if (activeTimestamps.length >= limit) {
    memoryRateLimits.set(key, activeTimestamps);
    return { allowed: false, count: activeTimestamps.length };
  }

  activeTimestamps.push(now);
  memoryRateLimits.set(key, activeTimestamps);
  return { allowed: true, count: activeTimestamps.length };
}

export async function checkRateLimit(
  apiKey: string,
  limit = 100,
  windowMs = 60000,
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const isRedisReady =
    redis && (redis as { status?: string }).status === "ready";

  if (!isRedisReady) {
    console.warn(
      `[RateLimit] Redis client not ready/available. Falling back to local in-memory rate limiting for API key: ${apiKey.slice(0, 8)}...`,
    );
    return checkMemoryRateLimit(apiKey, limit, windowMs);
  }

  const key = `rate_limit:ingest:${apiKey}`;
  const now = Date.now();
  const clearBefore = now - windowMs;
  const identifier = `${now}:${Math.random().toString(36).substring(2, 7)}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.zadd(key, now, identifier);
    pipeline.zremrangebyscore(key, "-inf", clearBefore);
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil((windowMs * 2) / 1000));
    const results = await pipeline.exec();

    if (!results) {
      return { allowed: true, count: 1 };
    }

    // Index mapping: 0=zadd, 1=zremrange, 2=zcard, 3=expire
    const cardResult = results[2][1];
    const count = typeof cardResult === "number" ? cardResult : 1;

    if (count > limit) {
      // Exceeded! Remove our token so it doesn't bloat the sliding window
      await redis.zrem(key, identifier);
      return { allowed: false, count: count - 1 };
    }

    return { allowed: true, count };
  } catch (err) {
    console.warn(
      `[RateLimit] Error running sliding-window rate limit on Redis. Falling back to local memory:`,
      err,
    );
    return checkMemoryRateLimit(apiKey, limit, windowMs);
  }
}
