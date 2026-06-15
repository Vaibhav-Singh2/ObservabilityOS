import { telemetryClient } from "./sdk-wrapper";

// List of standard microservices used in the simulator
export const SERVICES = {
  GATEWAY: "web-gateway",
  CHECKOUT: "checkout-service",
  PAYMENT: "payment-service",
  INVENTORY: "inventory-service",
  AUTH: "auth-service",
  DATABASE: "postgres-db",
  REDIS: "redis-cache",
};

// --- LOG SCENARIOS ---
export function generateLogScenario(
  level: "debug" | "info" | "warn" | "error" | "critical",
) {
  const traceId = telemetryClient.generateTraceId();

  switch (level) {
    case "debug":
      telemetryClient.debug("Querying cache for active session key", {
        service: SERVICES.GATEWAY,
        traceId,
        metadata: { cacheKey: "session:active:usr_998342", ttl: 3600 },
      });
      break;
    case "info":
      telemetryClient.info("HTTP request completed successfully", {
        service: SERVICES.GATEWAY,
        traceId,
        metadata: {
          path: "/api/v1/products",
          method: "GET",
          status: 200,
          durationMs: 42,
        },
      });
      break;
    case "warn":
      telemetryClient.warn("Database connection pool utilization is high", {
        service: SERVICES.CHECKOUT,
        traceId,
        metadata: {
          activeConnections: 89,
          maxConnections: 100,
          waitTimeMs: 140,
        },
      });
      break;
    case "error":
      telemetryClient.error("Failed to compile user discount voucher code", {
        service: SERVICES.CHECKOUT,
        traceId,
        metadata: {
          voucherCode: "SUMMER25",
          error: "Voucher validation timeout after 5000ms",
        },
      });
      break;
    case "critical":
      telemetryClient.critical(
        "OUTAGE DETECTED: Primary payment gateway returned 502 Bad Gateway",
        {
          service: SERVICES.PAYMENT,
          traceId,
          metadata: {
            provider: "Stripe",
            endpoint: "/v1/charges",
            errorCode: "gateway_failure",
          },
        },
      );
      break;
  }
}

// --- EXCEPTION SCENARIOS ---
export function generateExceptionScenario(
  type: "uncaught" | "handled" | "nested" | "validation" | "database",
) {
  const traceId = telemetryClient.generateTraceId();

  switch (type) {
    case "uncaught":
      telemetryClient.error(
        "Uncaught TypeError: Cannot read properties of undefined (reading 'map')",
        {
          service: SERVICES.GATEWAY,
          traceId,
          metadata: {
            stack:
              "TypeError: Cannot read properties of undefined (reading 'map')\n    at ProductGrid (webpack-internal:///./components/ProductGrid.tsx:32:21)\n    at renderWithHooks (node_modules/react-dom/cjs/react-dom.development.js:15486:18)",
            route: "/products/categories",
          },
        },
      );
      break;
    case "handled":
      telemetryClient.warn(
        "Handled promise rejection in Stripe gateway integration",
        {
          service: SERVICES.PAYMENT,
          traceId,
          metadata: {
            attempt: 3,
            warning:
              "Stripe connection dropped, falling back to cached queue retry flow.",
            error: "ECONNRESET: Connection reset by peer",
          },
        },
      );
      break;
    case "nested":
      telemetryClient.error(
        "Checkout process failed due to upstream Service Failure",
        {
          service: SERVICES.CHECKOUT,
          traceId,
          metadata: {
            context: "Checkout process initialization",
            innerError: {
              service: SERVICES.PAYMENT,
              error: "Failed to authorize credit card",
              rootCause: {
                service: SERVICES.AUTH,
                error: "OAuth server token handshake timed out",
              },
            },
          },
        },
      );
      break;
    case "validation":
      telemetryClient.info(
        "Registration payload rejected by validation rules",
        {
          service: SERVICES.CHECKOUT,
          traceId,
          metadata: {
            errors: [
              { field: "email", issue: "Must contain valid domain name" },
              {
                field: "password",
                issue: "Must contain at least 1 special character",
              },
            ],
            attemptedUser: "malicious_user12",
          },
        },
      );
      break;
    case "database":
      telemetryClient.error(
        "DatabaseQueryException: relation 'inventories_backup' does not exist",
        {
          service: SERVICES.INVENTORY,
          traceId,
          metadata: {
            sql: "SELECT * FROM inventories_backup WHERE item_id = $1 FOR UPDATE",
            parameters: ["prod_id_894"],
            code: "42P01",
          },
        },
      );
      break;
  }
}

// --- LATENCY SCENARIOS ---
export async function generateLatencyScenario(
  type: "500ms" | "2s" | "5s" | "random" | "spike",
  env: "prod" | "staging" | "dev" = "dev",
) {
  let latency = 50;
  if (type === "500ms") latency = 500;
  else if (type === "2s") latency = 2000;
  else if (type === "5s") latency = 5000;
  else if (type === "random") latency = Math.floor(Math.random() * 3000) + 100;
  else if (type === "spike") latency = 8500;

  const traceId = telemetryClient.generateTraceId();

  // Log warning if latency is high
  if (latency > 1000) {
    telemetryClient.warn(
      `HTTP request took longer than average threshold: ${latency}ms`,
      {
        service: SERVICES.CHECKOUT,
        traceId,
        environment: env,
        metadata: {
          path: "/api/checkout/submit",
          thresholdMs: 1000,
          durationMs: latency,
        },
      },
    );
  } else {
    telemetryClient.info(`HTTP request executed in ${latency}ms`, {
      service: SERVICES.CHECKOUT,
      traceId,
      environment: env,
      metadata: { path: "/api/checkout/submit", durationMs: latency },
    });
  }

  // Send metrics
  await telemetryClient.sendMetric({
    service: SERVICES.CHECKOUT,
    environment: env,
    cpuUsage: latency > 3000 ? 82 : 25,
    memoryUsage: 320 * 1024 * 1024,
    memoryLimit: 1024 * 1024 * 1024,
    latencyMs: latency,
  });
}

// --- ERROR RATE SPIKES ---
export function generateErrorRateScenario(
  ratePercent: 5 | 25 | 50 | 100,
  env: "prod" | "staging" | "dev" = "dev",
) {
  const batchSize = 20;
  const errorCount = Math.round((batchSize * ratePercent) / 100);

  for (let i = 0; i < batchSize; i++) {
    const isError = i < errorCount;
    const traceId = telemetryClient.generateTraceId();

    if (isError) {
      telemetryClient.error(
        "API gateway request failed with 500 Internal Server Error",
        {
          service: SERVICES.GATEWAY,
          traceId,
          environment: env,
          metadata: {
            path: "/api/v1/orders",
            error: "Checkout payment handler failed to respond",
          },
        },
      );
    } else {
      telemetryClient.info("API gateway request succeeded with 200 OK", {
        service: SERVICES.GATEWAY,
        traceId,
        environment: env,
        metadata: { path: "/api/v1/orders", method: "GET" },
      });
    }
  }

  // Trigger metrics
  telemetryClient.sendMetric({
    service: SERVICES.GATEWAY,
    environment: env,
    cpuUsage: ratePercent > 50 ? 94 : 35,
    memoryUsage: 450 * 1024 * 1024,
    memoryLimit: 1024 * 1024 * 1024,
    latencyMs: ratePercent === 100 ? 3200 : ratePercent > 20 ? 800 : 80,
  });
}

// --- DATABASE FAILURE SCENARIOS ---
export async function generateDatabaseScenario(
  type: "timeout" | "refused" | "slow" | "deadlock" | "migration",
) {
  const traceId = telemetryClient.generateTraceId();

  switch (type) {
    case "timeout":
      telemetryClient.error("Database connection query timeout after 15000ms", {
        service: SERVICES.DATABASE,
        traceId,
        metadata: {
          query: "SELECT * FROM orders WHERE processed = false",
          activeConnections: 100,
        },
      });
      await telemetryClient.sendMetric({
        service: SERVICES.DATABASE,
        cpuUsage: 99,
        memoryUsage: 890 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 15000,
      });
      break;
    case "refused":
      telemetryClient.critical(
        "Database Connection Refused: FATAL: remaining connection slots are reserved for non-replication superuser connections",
        {
          service: SERVICES.DATABASE,
          traceId,
          metadata: {
            host: "10.0.4.15",
            port: 5432,
            username: "app_server_worker",
          },
        },
      );
      break;
    case "slow":
      telemetryClient.warn(
        "Slow query detected: 4200ms executed in database engine",
        {
          service: SERVICES.DATABASE,
          traceId,
          metadata: {
            sql: "SELECT items.*, users.name FROM items CROSS JOIN users WHERE items.stock = 0",
            durationMs: 4200,
          },
        },
      );
      await telemetryClient.sendMetric({
        service: SERVICES.DATABASE,
        cpuUsage: 78,
        memoryUsage: 720 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 4200,
      });
      break;
    case "deadlock":
      telemetryClient.error(
        "Database deadlock detected: transaction 4492 aborted due to conflict",
        {
          service: SERVICES.DATABASE,
          traceId,
          metadata: {
            abortedTx: 4492,
            heldLocks: ["orders_pk", "inventory_sku"],
            blockingTx: 4495,
          },
        },
      );
      break;
    case "migration":
      telemetryClient.critical(
        "MigrationFailureException: Migration 042_add_billing_address failed to apply",
        {
          service: SERVICES.DATABASE,
          traceId,
          metadata: {
            migrationFile: "042_add_billing_address.sql",
            error:
              "column 'zip_code' contains null values, cannot make column NOT NULL",
          },
        },
      );
      break;
  }
}

// --- REDIS FAILURE SCENARIOS ---
export async function generateRedisScenario(
  type: "cache-storm" | "unavailable" | "slow" | "memory",
) {
  const traceId = telemetryClient.generateTraceId();

  switch (type) {
    case "cache-storm":
      telemetryClient.warn(
        "Cache Miss Storm: key 'catalog:all_products' expired, triggering 120 database re-fetches concurrently",
        {
          service: SERVICES.REDIS,
          traceId,
          metadata: {
            expiredKey: "catalog:all_products",
            concurrentLockGets: 120,
          },
        },
      );
      telemetryClient.error(
        "Database connections spike due to Cache Miss Storm",
        {
          service: SERVICES.DATABASE,
          traceId,
        },
      );
      break;
    case "unavailable":
      telemetryClient.critical(
        "Redis Connection Failure: Redis server at 127.0.0.1:6379 is unavailable",
        {
          service: SERVICES.REDIS,
          traceId,
          metadata: { code: "ECONNREFUSED", host: "127.0.0.1", port: 6379 },
        },
      );
      break;
    case "slow":
      telemetryClient.warn(
        "Redis response time high: command GET 'session:usr_1' took 350ms",
        {
          service: SERVICES.REDIS,
          traceId,
          metadata: { command: "GET", key: "session:usr_1", durationMs: 350 },
        },
      );
      await telemetryClient.sendMetric({
        service: SERVICES.REDIS,
        cpuUsage: 89,
        memoryUsage: 990 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 350,
      });
      break;
    case "memory":
      telemetryClient.error(
        "Redis Memory Pressure: maxmemory limit reached (1024MB), evicting keys with volatile-lru",
        {
          service: SERVICES.REDIS,
          traceId,
          metadata: {
            usedMemoryBytes: 1073741824,
            evictionPolicy: "volatile-lru",
            evictedKeysCount: 1422,
          },
        },
      );
      break;
  }
}

// --- API FAILURES ---
export function generateApiScenario(type: "404" | "429" | "500" | "timeout") {
  const traceId = telemetryClient.generateTraceId();

  switch (type) {
    case "404":
      for (let i = 0; i < 5; i++) {
        telemetryClient.warn("API route not found (404 Resource Not Found)", {
          service: SERVICES.GATEWAY,
          traceId,
          metadata: {
            path: `/api/v2/unreleased-feature-${i}`,
            ipAddress: "192.168.1.100",
          },
        });
      }
      break;
    case "429":
      for (let i = 0; i < 8; i++) {
        telemetryClient.warn("Rate limit exceeded (429 Too Many Requests)", {
          service: SERVICES.GATEWAY,
          traceId,
          metadata: {
            clientIp: "203.0.113.4",
            path: "/api/checkout/discount",
            rateLimitLimit: 100,
            rateLimitRemaining: 0,
          },
        });
      }
      break;
    case "500":
      telemetryClient.error(
        "Unhandled upstream gateway error (500 Internal Server Error)",
        {
          service: SERVICES.GATEWAY,
          traceId,
          metadata: {
            upstreamService: SERVICES.CHECKOUT,
            error: "Malformed payload returned",
          },
        },
      );
      break;
    case "timeout":
      telemetryClient.error("API Gateway request timed out after 30000ms", {
        service: SERVICES.GATEWAY,
        traceId,
        metadata: {
          upstreamEndpoint: "http://thirdparty.payment.com/v1/charge",
          timeoutMs: 30000,
        },
      });
      break;
  }
}

// --- AUTHENTICATION PROBLEMS ---
export function generateAuthScenario(type: "invalid" | "expired" | "denied") {
  const traceId = telemetryClient.generateTraceId();

  switch (type) {
    case "invalid":
      telemetryClient.warn(
        "Authentication rejected: invalid signature on JWT token",
        {
          service: SERVICES.AUTH,
          traceId,
          metadata: {
            authHeader: "Bearer eyJhbGciOi...",
            reason: "signature_verification_failed",
          },
        },
      );
      break;
    case "expired":
      telemetryClient.warn(
        "Session token validation failed: token is expired",
        {
          service: SERVICES.AUTH,
          traceId,
          metadata: {
            expiredAt: new Date(Date.now() - 3600000).toISOString(),
            tokenAgeSeconds: 86400,
          },
        },
      );
      break;
    case "denied":
      telemetryClient.error(
        "Access Denied: User role 'viewer' lacks permission to call POST /api/admin/roles",
        {
          service: SERVICES.AUTH,
          traceId,
          metadata: {
            userId: "usr_228",
            requiredRole: "admin",
            userRole: "viewer",
          },
        },
      );
      break;
  }
}

// --- TRAFFIC EVENTS ---
export async function generateTrafficScenario(
  type: "x10" | "x100" | "drop" | "burst",
) {
  const scale =
    type === "x10" ? 10 : type === "x100" ? 100 : type === "burst" ? 25 : 1;
  const traceId = telemetryClient.generateTraceId();

  if (type === "drop") {
    telemetryClient.warn(
      "Traffic anomaly: Sudden drop in transaction requests detected",
      {
        service: SERVICES.GATEWAY,
        traceId,
        metadata: { currentRpm: 12, expectedRpm: 450, deviationPercent: -97.3 },
      },
    );
    return;
  }

  // Simulate multiple calls
  for (let i = 0; i < scale; i++) {
    telemetryClient.info("Traffic transaction request processed", {
      service: SERVICES.GATEWAY,
      metadata: {
        method: "POST",
        route: "/api/cart/add",
        productSku: `SKU-${i}`,
      },
    });
  }

  // Send spiked metric
  await telemetryClient.sendMetric({
    service: SERVICES.GATEWAY,
    cpuUsage: type === "x100" ? 95 : type === "x10" ? 65 : 45,
    memoryUsage: (type === "x100" ? 850 : 380) * 1024 * 1024,
    memoryLimit: 1024 * 1024 * 1024,
    latencyMs: type === "x100" ? 2200 : type === "x10" ? 400 : 75,
  });
}

// --- MEMORY PROBLEMS ---
export async function generateMemoryScenario(
  type: "leak" | "heap-growth" | "gc-pressure",
) {
  const traceId = telemetryClient.generateTraceId();

  switch (type) {
    case "leak":
      telemetryClient.error(
        "MemoryLeakWarning: Retained detached DOM nodes in heap memory increasing dynamically",
        {
          service: SERVICES.GATEWAY,
          traceId,
          metadata: { leakedElements: 45902, leakRateBytesPerSec: 154200 },
        },
      );
      await telemetryClient.sendMetric({
        service: SERVICES.GATEWAY,
        cpuUsage: 45,
        memoryUsage: 995 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 120,
      });
      break;
    case "heap-growth":
      telemetryClient.warn(
        "Heap size approaching configured Node limit (92%)",
        {
          service: SERVICES.CHECKOUT,
          traceId,
          metadata: { heapUsedBytes: 1482930291, heapLimitBytes: 1610612736 },
        },
      );
      await telemetryClient.sendMetric({
        service: SERVICES.CHECKOUT,
        cpuUsage: 35,
        memoryUsage: 1480 * 1024 * 1024,
        memoryLimit: 1600 * 1024 * 1024,
        latencyMs: 80,
      });
      break;
    case "gc-pressure":
      telemetryClient.warn(
        "GC Pressure: garbage collector paused Node main thread for 180ms",
        {
          service: SERVICES.CHECKOUT,
          traceId,
          metadata: {
            gcPauseMs: 180,
            heapFreedBytes: 128948120,
            gcType: "Scavenge (Incremental)",
          },
        },
      );
      await telemetryClient.sendMetric({
        service: SERVICES.CHECKOUT,
        cpuUsage: 92, // GC blocks CPU
        memoryUsage: 640 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 220,
      });
      break;
  }
}

// --- CPU PROBLEMS ---
export async function generateCpuScenario(
  type: "spike" | "saturation" | "expensive-loop",
) {
  const traceId = telemetryClient.generateTraceId();

  switch (type) {
    case "spike":
      telemetryClient.warn("Host system CPU utilization spiked above 95%", {
        service: SERVICES.CHECKOUT,
        traceId,
        metadata: {
          coresCount: 4,
          systemLoad: 12.4,
          trigger: "Image compression runner",
        },
      });
      await telemetryClient.sendMetric({
        service: SERVICES.CHECKOUT,
        cpuUsage: 98,
        memoryUsage: 512 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 80,
      });
      break;
    case "saturation":
      telemetryClient.error(
        "Process CPU Saturation: request queue backlog growing due to lack of thread pools",
        {
          service: SERVICES.GATEWAY,
          traceId,
          metadata: {
            cpuCoreUtilization: [99.5, 99.8, 98.9, 99.1],
            eventLoopLagMs: 850,
          },
        },
      );
      await telemetryClient.sendMetric({
        service: SERVICES.GATEWAY,
        cpuUsage: 99.3,
        memoryUsage: 620 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 4500,
      });
      break;
    case "expensive-loop":
      telemetryClient.warn(
        "Slow operation detected: JSON parsing of large inventory matrix took 1800ms blocking event loop",
        {
          service: SERVICES.INVENTORY,
          traceId,
          metadata: { dataSizeBytes: 1492040, blockingTimeMs: 1800 },
        },
      );
      await telemetryClient.sendMetric({
        service: SERVICES.INVENTORY,
        cpuUsage: 100,
        memoryUsage: 890 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 1800,
      });
      break;
  }
}

// --- SERVICE HEALTH PROBLEMS ---
export function generateServiceHealthScenario(
  type: "unhealthy" | "intermittent" | "dependency",
) {
  const traceId = telemetryClient.generateTraceId();

  switch (type) {
    case "unhealthy":
      telemetryClient.critical(
        "Service marked UNHEALTHY by Kubernetes liveness probe",
        {
          service: SERVICES.INVENTORY,
          traceId,
          metadata: {
            probePath: "/healthz",
            failuresCount: 3,
            lastStatusCode: 503,
          },
        },
      );
      break;
    case "intermittent":
      for (let i = 0; i < 5; i++) {
        if (i % 2 === 0) {
          telemetryClient.error(
            "Intermittent database connection failure (connection reset)",
            {
              service: SERVICES.CHECKOUT,
              traceId,
              metadata: { retryCount: i },
            },
          );
        } else {
          telemetryClient.info("Retry connection succeeded", {
            service: SERVICES.CHECKOUT,
            traceId,
            metadata: { retryCount: i },
          });
        }
      }
      break;
    case "dependency":
      telemetryClient.error(
        "Downstream dependency billing-service is unreachable at billing.internal.cluster",
        {
          service: SERVICES.PAYMENT,
          traceId,
          metadata: {
            protocol: "gRPC",
            endpoint: "billing.internal:50051",
            error: "DeadlineExceeded",
          },
        },
      );
      break;
  }
}

// --- BUSINESS EVENTS (Real-world logs) ---
export function generateBusinessEvent(
  type: "checkout" | "payment-failed" | "order" | "signup" | "refund",
) {
  const traceId = telemetryClient.generateTraceId();
  const userId = `usr_acc_${Math.floor(Math.random() * 90000) + 10000}`;
  const orderId = `ord_shp_${Math.floor(Math.random() * 900000) + 100000}`;

  switch (type) {
    case "checkout":
      telemetryClient.recordBusinessEvent(
        "CheckoutCompleted",
        `User ${userId} completed checkout for order ${orderId}`,
        {
          userId,
          orderId,
          checkoutAmount: 149.99,
          currency: "USD",
          itemsCount: 3,
          paymentProvider: "Stripe",
        },
        { service: SERVICES.CHECKOUT, traceId },
      );
      break;
    case "payment-failed":
      telemetryClient.recordBusinessEvent(
        "PaymentFailed",
        `Payment failed for user ${userId} processing order ${orderId} - Card Declined`,
        {
          userId,
          orderId,
          attempt: 1,
          amount: 89.5,
          cardBrand: "Visa",
          declinedCode: "insufficient_funds",
        },
        { service: SERVICES.PAYMENT, traceId },
      );
      break;
    case "order":
      telemetryClient.recordBusinessEvent(
        "OrderCreated",
        `Provisioned warehouse shipment order ${orderId}`,
        {
          orderId,
          userId,
          warehouseLoc: "US-EAST-1",
          carrier: "FedEx",
          deliverySpeed: "Standard Overnight",
        },
        { service: SERVICES.CHECKOUT, traceId },
      );
      break;
    case "signup":
      telemetryClient.recordBusinessEvent(
        "UserSignupCompleted",
        `New registration: User account ${userId} created`,
        {
          userId,
          referralSource: "Google Ads",
          marketingConsent: true,
          authProvider: "github",
        },
        { service: SERVICES.AUTH, traceId },
      );
      break;
    case "refund":
      const refundId = `ref_api_${Math.floor(Math.random() * 90000) + 10000}`;
      telemetryClient.recordBusinessEvent(
        "RefundProcessed",
        `Refund ${refundId} issued for order ${orderId}`,
        {
          refundId,
          orderId,
          amount: 45.0,
          reason: "customer_return",
          originalChargeId: "ch_stripe_2841",
        },
        { service: SERVICES.PAYMENT, traceId },
      );
      break;
  }
}
