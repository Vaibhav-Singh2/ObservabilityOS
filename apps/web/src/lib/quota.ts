import { getRedisClient } from "./redis";
import { connectToDatabase, Service } from "@repo/db";
import { PLANS } from "./plans";

export interface PlanLimit {
  maxServices: number;
  maxLogVolumeBytes: number;
  retentionDays: number;
}

// Derive PLAN_LIMITS dynamically from PLANS single source of truth
export const PLAN_LIMITS: Record<string, PlanLimit> = PLANS.reduce(
  (acc, plan) => {
    acc[plan.backendPlan] = {
      maxServices: plan.maxServices,
      maxLogVolumeBytes: plan.maxLogVolumeBytes,
      retentionDays: plan.retentionDays,
    };
    return acc;
  },
  {} as Record<string, PlanLimit>,
);

/**
 * Returns the Redis key for the monthly log quota of a project.
 * Uses format: quota:volume:{projectId}:{YYYYMM}
 */
export function getQuotaKey(projectId: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `quota:volume:${projectId}:${year}${month}`;
}

/**
 * Get current calendar month's log ingestion volume in bytes.
 */
export async function getLogVolumeUsage(projectId: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis) {
    console.warn("Redis client not available, returning 0 usage.");
    return 0;
  }
  const key = getQuotaKey(projectId);
  try {
    const val = await redis.get(key);
    return val ? parseInt(val, 10) : 0;
  } catch (err) {
    console.warn(`Failed to retrieve log volume usage for key ${key}:`, err);
    return 0;
  }
}

/**
 * Increment current calendar month's log ingestion volume in bytes.
 */
export async function incrementLogVolumeUsage(
  projectId: string,
  bytes: number,
): Promise<number> {
  const redis = getRedisClient();
  if (!redis) {
    return 0;
  }
  const key = getQuotaKey(projectId);
  try {
    const newVal = await redis.incrby(key, bytes);
    // Set expiration to 40 days on first increment to avoid key leaks
    if (newVal === bytes) {
      await redis.expire(key, 40 * 24 * 60 * 60);
    }
    return newVal;
  } catch (err) {
    console.warn(`Failed to increment log volume usage for key ${key}:`, err);
    return 0;
  }
}

/**
 * Query current service count and monthly log volume to see if limits are exceeded.
 */
export async function checkQuotaLimits(
  projectId: string,
  plan: string,
  bytesToAdd = 0,
) {
  await connectToDatabase();
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  // 1. Check Log Volume
  const currentVolume = await getLogVolumeUsage(projectId);
  const logVolumeExceeded =
    currentVolume + bytesToAdd > limits.maxLogVolumeBytes;

  // 2. Check Service Count
  const serviceCount = await Service.countDocuments({ projectId });
  const serviceCountExceeded = serviceCount > limits.maxServices;

  return {
    logVolume: {
      current: currentVolume,
      limit: limits.maxLogVolumeBytes,
      exceeded: logVolumeExceeded,
    },
    services: {
      current: serviceCount,
      limit: limits.maxServices,
      exceeded: serviceCountExceeded,
    },
  };
}
