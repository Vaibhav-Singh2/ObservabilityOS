import { telemetryClient } from "./sdk-wrapper";
import { SERVICES } from "./generators";

// Helper delay function
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ScenarioStatus {
  active: boolean;
  scenarioName: string;
  currentStep: string;
}

class ScenarioEngine {
  private activeScenario: string | null = null;
  private onStepChange: ((status: ScenarioStatus) => void) | null = null;

  public registerStepListener(listener: (status: ScenarioStatus) => void) {
    this.onStepChange = listener;
  }

  private updateStatus(
    active: boolean,
    scenarioName: string,
    currentStep: string,
  ) {
    if (this.onStepChange) {
      this.onStepChange({ active, scenarioName, currentStep });
    }
  }

  /**
   * Scenario A: Database latency increases -> API latency increases -> Checkout failures increase
   */
  public async runScenarioA(env: "prod" | "staging" | "dev" = "dev") {
    if (this.activeScenario) return;
    this.activeScenario = "Scenario A: Database Latency Cascade";
    const traceId = telemetryClient.generateTraceId();

    try {
      // Step 1: Database latency increases
      this.updateStatus(
        true,
        this.activeScenario,
        "1. Injecting Database Latency",
      );
      telemetryClient.warn(
        "Database slow query detected: 3200ms processing lock acquisition",
        {
          service: SERVICES.DATABASE,
          traceId,
          environment: env,
          metadata: {
            sql: "SELECT * FROM inventory WHERE sku = 'SKU-ULTRA' FOR UPDATE",
            durationMs: 3200,
          },
        },
      );
      await telemetryClient.sendMetric({
        service: SERVICES.DATABASE,
        environment: env,
        cpuUsage: 82,
        memoryUsage: 450 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 3200,
      });

      await delay(1500);

      // Step 2: API latency increases (checkout service bottleneck)
      this.updateStatus(
        true,
        this.activeScenario,
        "2. Propagating to API Latency",
      );
      telemetryClient.warn(
        "Upstream service timeout: checkout-service responded in 4800ms",
        {
          service: SERVICES.CHECKOUT,
          traceId,
          environment: env,
          metadata: {
            path: "/api/checkout/submit",
            downstreamService: SERVICES.DATABASE,
            durationMs: 4800,
          },
        },
      );
      await telemetryClient.sendMetric({
        service: SERVICES.CHECKOUT,
        environment: env,
        cpuUsage: 60,
        memoryUsage: 350 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 4800,
      });

      await delay(1500);

      // Step 3: Checkout errors spike
      this.updateStatus(
        true,
        this.activeScenario,
        "3. Triggering Checkout Failures",
      );
      telemetryClient.error(
        "Checkout transaction failed: 504 Gateway Timeout from backend API",
        {
          service: SERVICES.GATEWAY,
          traceId,
          environment: env,
          metadata: {
            method: "POST",
            path: "/api/checkout",
            clientIp: "198.51.100.44",
            statusCode: 504,
          },
        },
      );

      // Send multiple correlated failures
      for (let i = 0; i < 4; i++) {
        const subTraceId = telemetryClient.generateTraceId();
        telemetryClient.error(
          `User checkout aborted: HTTP 504 Gateway Timeout (Attempt ${i + 1}/3)`,
          {
            service: SERVICES.CHECKOUT,
            traceId: subTraceId,
            environment: env,
            metadata: {
              userId: `usr_acc_${200 + i}`,
              reason: "checkout_timeout_upstream",
            },
          },
        );
      }

      await telemetryClient.sendMetric({
        service: SERVICES.GATEWAY,
        environment: env,
        cpuUsage: 90,
        memoryUsage: 512 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 5200,
      });

      this.updateStatus(false, "", "Completed Scenario A");
    } finally {
      this.activeScenario = null;
    }
  }

  /**
   * Scenario B: Redis unavailable -> Cache misses explode -> CPU usage spikes
   */
  public async runScenarioB(env: "prod" | "staging" | "dev" = "dev") {
    if (this.activeScenario) return;
    this.activeScenario = "Scenario B: Cache Failure CPU Spike";
    const traceId = telemetryClient.generateTraceId();

    try {
      // Step 1: Redis unavailable
      this.updateStatus(
        true,
        this.activeScenario,
        "1. Simulating Redis Outage",
      );
      telemetryClient.critical(
        "Redis client failed to connect: Redis server at 10.0.8.45:6379 refused connection",
        {
          service: SERVICES.REDIS,
          traceId,
          environment: env,
          metadata: {
            host: "10.0.8.45",
            port: 6379,
            code: "ECONNREFUSED",
            attempt: 5,
          },
        },
      );

      await delay(1500);

      // Step 2: Cache misses explode
      this.updateStatus(true, this.activeScenario, "2. Exploding Cache Misses");
      telemetryClient.warn(
        "Cache Miss Storm: fallback to database read for catalog items active",
        {
          service: SERVICES.CHECKOUT,
          traceId,
          environment: env,
          metadata: {
            expiredKey: "catalog:active_skus",
            activeFallbackThreads: 450,
          },
        },
      );
      telemetryClient.warn(
        "Database Connection Pool overloaded by cached bypass queries",
        {
          service: SERVICES.DATABASE,
          traceId,
          environment: env,
          metadata: {
            activeConnections: 98,
            poolLimit: 100,
            waitingQueries: 142,
          },
        },
      );

      await delay(1500);

      // Step 3: CPU usage spikes
      this.updateStatus(
        true,
        this.activeScenario,
        "3. Injecting CPU Saturation",
      );
      telemetryClient.error(
        "Process thread pool blocked: Event loop delay exceeded 920ms threshold",
        {
          service: SERVICES.CHECKOUT,
          traceId,
          environment: env,
          metadata: {
            cpuCoreUtilization: [99.5, 99.8, 98.9, 99.2],
            eventLoopLagMs: 920,
          },
        },
      );

      await telemetryClient.sendMetric({
        service: SERVICES.CHECKOUT,
        environment: env,
        cpuUsage: 99.5,
        memoryUsage: 890 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 1450,
      });

      await telemetryClient.sendMetric({
        service: SERVICES.DATABASE,
        environment: env,
        cpuUsage: 94.2,
        memoryUsage: 780 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 890,
      });

      this.updateStatus(false, "", "Completed Scenario B");
    } finally {
      this.activeScenario = null;
    }
  }

  /**
   * Scenario C: Third-party API timeout -> Queue backlog grows -> Error rate increases
   */
  public async runScenarioC(env: "prod" | "staging" | "dev" = "dev") {
    if (this.activeScenario) return;
    this.activeScenario = "Scenario C: Third-Party Timeout Queue Backlog";
    const traceId = telemetryClient.generateTraceId();

    try {
      // Step 1: Third-party API timeout
      this.updateStatus(
        true,
        this.activeScenario,
        "1. Simulating Stripe Timeout",
      );
      telemetryClient.warn(
        "External HTTP API warning: Stripe POST /v1/charges took 15000ms and timed out",
        {
          service: SERVICES.PAYMENT,
          traceId,
          environment: env,
          metadata: {
            endpoint: "https://api.stripe.com/v1/charges",
            timeoutThresholdMs: 15000,
          },
        },
      );
      await telemetryClient.sendMetric({
        service: SERVICES.PAYMENT,
        environment: env,
        cpuUsage: 35,
        memoryUsage: 280 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 15000,
      });

      await delay(1500);

      // Step 2: Queue backlog grows
      this.updateStatus(true, this.activeScenario, "2. Growing Queue Backlog");
      telemetryClient.warn(
        "Queue backlog size exceeded threshold: BullMQ 'payment-jobs' backlog is 1540",
        {
          service: SERVICES.CHECKOUT,
          traceId,
          environment: env,
          metadata: {
            queueName: "payment-jobs",
            jobsCount: 1540,
            warnThreshold: 500,
          },
        },
      );

      await delay(1500);

      // Step 3: Error rate increases
      this.updateStatus(
        true,
        this.activeScenario,
        "3. Escalating Queue Error Rates",
      );
      telemetryClient.error(
        "Payment job execution failed: retry limit (5) reached, moving job to DLQ",
        {
          service: SERVICES.PAYMENT,
          traceId,
          environment: env,
          metadata: {
            jobId: "job_stripe_ch_89412",
            attempt: 5,
            targetQueue: "payment-jobs:failed",
          },
        },
      );

      for (let i = 0; i < 5; i++) {
        const subTraceId = telemetryClient.generateTraceId();
        telemetryClient.error(
          "Order processing aborted: Billing payment verification timeout",
          {
            service: SERVICES.CHECKOUT,
            traceId: subTraceId,
            environment: env,
            metadata: {
              orderId: `ord_${400000 + i}`,
              reason: "billing_verification_timeout",
            },
          },
        );
      }

      await telemetryClient.sendMetric({
        service: SERVICES.GATEWAY,
        environment: env,
        cpuUsage: 55,
        memoryUsage: 410 * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: 800,
      });

      this.updateStatus(false, "", "Completed Scenario C");
    } finally {
      this.activeScenario = null;
    }
  }
}

export const scenarioEngine = new ScenarioEngine();
