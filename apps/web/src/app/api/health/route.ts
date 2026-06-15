import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@repo/db";
import { checkRedisHealth } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbHealth = await checkDatabaseHealth();
  const redisHealth = await checkRedisHealth();

  // AI config checks
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const aiHealth = {
    status: hasAnthropicKey || hasOpenAIKey ? "healthy" : "degraded",
    details: {
      hasAnthropicKey,
      hasOpenAIKey,
      activeProvider: hasAnthropicKey
        ? "Anthropic Claude"
        : hasOpenAIKey
          ? "OpenAI GPT"
          : "Mock Heuristic Analyzer Fallback",
    },
  };

  const timestamp = new Date().toISOString();

  const isHealthy = dbHealth.status === "healthy"; // Redis can be degraded/failover, AI can be mock fallback. Database is critical.

  const payload = {
    status: isHealthy ? "operational" : "degraded",
    timestamp,
    services: {
      database: dbHealth,
      redis: redisHealth,
      ai: aiHealth,
    },
  };

  return NextResponse.json(payload, { status: isHealthy ? 200 : 503 });
}
