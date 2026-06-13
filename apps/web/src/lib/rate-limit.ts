import { getRedisClient } from "./redis";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
}

export async function checkRateLimit(
  apiKey: string,
  limit = 100,
  windowMs = 60000
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (!redis) {
    console.warn("Redis client not available, bypassing rate limiting (fail-open).");
    return { allowed: true, count: 0 };
  }

  const key = `rate_limit:ingest:${apiKey}`;
  const now = Date.now();
  const clearBefore = now - windowMs;
  const identifier = `${now}:${Math.random().toString(36).substring(2, 7)}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, "-inf", clearBefore);
    pipeline.zcard(key);
    const results = await pipeline.exec();

    if (!results) {
      return { allowed: true, count: 0 };
    }

    const [, cardResult] = results[1];
    const count = typeof cardResult === "number" ? cardResult : 0;

    if (count >= limit) {
      return { allowed: false, count };
    }

    const addPipeline = redis.pipeline();
    addPipeline.zadd(key, now, identifier);
    addPipeline.expire(key, Math.ceil((windowMs * 2) / 1000));
    await addPipeline.exec();

    return { allowed: true, count: count + 1 };
  } catch (err) {
    console.warn("Error running sliding-window rate limit, fail-open:", err);
    return { allowed: true, count: 0 };
  }
}
