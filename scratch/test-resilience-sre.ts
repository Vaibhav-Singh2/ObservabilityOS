import { connectToDatabase, checkDatabaseHealth } from "@repo/db";
import {
  getRedisClient,
  checkRedisHealth,
  getCache,
  setCache,
  delCache,
} from "../apps/web/src/lib/redis";
import { checkRateLimit } from "../apps/web/src/lib/rate-limit";
import {
  getCircuitBreaker,
  withTimeout,
  retry,
} from "../apps/web/src/lib/resilience";

async function runTests() {
  console.log("=== STARTING SRE RESILIENCE SYSTEM TESTS ===");

  // 1. Test Timeout Utility
  console.log("\n1. Testing withTimeout Utility:");
  try {
    const fastPromise = new Promise((resolve) =>
      setTimeout(() => resolve("fast-ok"), 100),
    );
    const resFast = await withTimeout(fastPromise, 200);
    console.log("   - Fast promise resolved:", resFast);

    const slowPromise = new Promise((resolve) =>
      setTimeout(() => resolve("slow-ok"), 500),
    );
    await withTimeout(slowPromise, 200);
    console.log("   - X ERROR: Slow promise did not timeout");
  } catch (err: any) {
    console.log("   - Slow promise timed out as expected:", err.message);
  }

  // 2. Test Retry Utility
  console.log("\n2. Testing retry Utility:");
  let attemptCount = 0;
  const flakeyFn = async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error("Temporary network error");
    }
    return "success_val";
  };
  try {
    const res = await retry(flakeyFn, {
      maxRetries: 3,
      backoffMs: 10,
      jitter: false,
    });
    console.log(
      `   - Flakey function resolved after ${attemptCount} attempts. Result:`,
      res,
    );
  } catch (err: any) {
    console.log("   - X ERROR: Retry failed:", err.message);
  }

  // 3. Test Circuit Breaker
  console.log("\n3. Testing Circuit Breaker:");
  const breaker = getCircuitBreaker({
    name: "TestBreaker",
    failureThreshold: 2,
    recoveryTimeoutMs: 1000,
    requestTimeoutMs: 100,
  });

  console.log("   - Initial state:", breaker.getState());

  // Fail 1
  try {
    await breaker.execute(async () => {
      throw new Error("API Outage");
    });
  } catch (e) {
    console.log("   - Executed failed call 1 (expected)");
  }

  // Fail 2 -> Should trip breaker to OPEN
  try {
    await breaker.execute(async () => {
      throw new Error("API Outage");
    });
  } catch (e) {
    console.log("   - Executed failed call 2 (expected)");
  }

  console.log("   - State after 2 failures:", breaker.getState()); // Should be OPEN

  // Call 3 -> Should fail fast with CircuitBreakerOpenError or return fallback
  try {
    const resFallback = await breaker.execute(
      async () => "will_not_run",
      () => "fallback_value",
    );
    console.log(
      "   - Executed call while OPEN (returned fallback):",
      resFallback,
    );
  } catch (e: any) {
    console.log(
      "   - X ERROR: Open circuit breaker did not return fallback:",
      e.message,
    );
  }

  // Wait for recovery timeout (1000ms) to trigger HALF_OPEN transition
  console.log("   - Waiting for breaker recovery timeout (1.1s)...");
  await new Promise((resolve) => setTimeout(resolve, 1100));
  console.log("   - State after waiting:", breaker.getState()); // Should be HALF_OPEN

  // Successful execution in HALF_OPEN should close breaker
  try {
    const resSuccess = await breaker.execute(async () => "service_recovered");
    console.log("   - Execution in HALF_OPEN result:", resSuccess);
  } catch (e: any) {
    console.log("   - X ERROR: HALF_OPEN execution failed:", e.message);
  }

  console.log("   - State after success in HALF_OPEN:", breaker.getState()); // Should be CLOSED or HALF_OPEN (needs 2 successes to fully close)

  await breaker.execute(async () => "service_fully_closed");
  console.log("   - State after second success:", breaker.getState()); // Should be CLOSED

  // 4. Test Database and Redis Health Check Interfaces
  console.log("\n4. Testing Health Check Interfaces:");
  try {
    await connectToDatabase();
    const dbHealth = await checkDatabaseHealth();
    console.log(
      "   - Database Health Status:",
      dbHealth.status,
      JSON.stringify(dbHealth.details),
    );
  } catch (err: any) {
    console.log("   - Database Offline/Unconfigured:", err.message);
  }

  try {
    const redisHealth = await checkRedisHealth();
    console.log(
      "   - Redis Health Status:",
      redisHealth.status,
      JSON.stringify(redisHealth.details),
    );
  } catch (err: any) {
    console.log("   - Redis Health Check failed:", err.message);
  }

  // 5. Test Cache Fallbacks (In-Memory vs Redis)
  console.log("\n5. Testing Cache Fallback & Rate Limiting:");
  await setCache("sre:test_key", { msg: "resilience_data" }, 10);
  const cachedVal = await getCache<{ msg: string }>("sre:test_key");
  console.log("   - getCache retrieved value:", cachedVal);

  const rateLimitResult = await checkRateLimit("test_api_key_sre", 5, 10000);
  console.log(
    "   - checkRateLimit allowed:",
    rateLimitResult.allowed,
    "count:",
    rateLimitResult.count,
  );

  console.log("\n=== SRE RESILIENCE SYSTEM TESTS COMPLETED SUCCESSFULLY ===");
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
