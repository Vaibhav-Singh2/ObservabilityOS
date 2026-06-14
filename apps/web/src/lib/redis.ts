import Redis from "ioredis";

interface RedisCache {
  client: Redis | null;
}

let cached: RedisCache = (globalThis as unknown as { redisCache: RedisCache }).redisCache;

if (!cached) {
  cached = (globalThis as unknown as { redisCache: RedisCache }).redisCache = { client: null };
}

export function getRedisClient(): Redis | null {
  const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

  if (cached.client) {
    return cached.client;
  }

  try {
    const client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000, // 2s timeout
      lazyConnect: true, // don't block on startup
    });

    client.on("error", (err) => {
      console.warn("Redis client connection error:", err.message);
    });

    cached.client = client;
    return client;
  } catch (e) {
    console.error("Failed to initialize Redis client:", e);
    return null;
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn(`Redis getCache failed for key ${key}:`, err);
    return null;
  }
}

export async function setCache(
  key: string,
  value: unknown,
  ttlSeconds = 300,
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    const serialized = JSON.stringify(value);
    await client.set(key, serialized, "EX", ttlSeconds);
  } catch (err) {
    console.warn(`Redis setCache failed for key ${key}:`, err);
  }
}

export async function delCache(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.del(key);
  } catch (err) {
    console.warn(`Redis delCache failed for key ${key}:`, err);
  }
}
