import { getRedisClient } from "./redis";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
}

export async function checkRateLimit(
  apiKey: string,
  limit = 100,
  windowMs = 60000,
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (!redis) {
    console.warn(
      "Redis client not available, bypassing rate limiting (fail-open).",
    );
    return { allowed: true, count: 0 };
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
    console.warn("Error running sliding-window rate limit, fail-open:", err);
    return { allowed: true, count: 0 };
  }
}
