import { telemetryClient } from "./sdk-wrapper";
import { SERVICES } from "./generators";

export interface TrafficStatus {
  active: boolean;
  rate: number; // req/sec
  totalSent: number;
}

class TrafficGenerator {
  private timer: NodeJS.Timeout | null = null;
  private onStatusChange: ((status: TrafficStatus) => void) | null = null;
  private isActive = false;
  private rate = 0; // req/sec
  private totalSent = 0;

  // Paths to simulate
  private paths = [
    "/api/v1/products",
    "/api/v1/catalog",
    "/api/v1/cart",
    "/api/v1/user/profile",
    "/api/v1/search",
  ];

  public registerStatusListener(listener: (status: TrafficStatus) => void) {
    this.onStatusChange = listener;
  }

  private notify() {
    if (this.onStatusChange) {
      this.onStatusChange({
        active: this.isActive,
        rate: this.rate,
        totalSent: this.totalSent,
      });
    }
  }

  public start(rate: number, env: "prod" | "staging" | "dev" = "dev") {
    if (this.isActive) {
      if (this.rate === rate) return;
      this.stop(); // Stop current rate to restart with new rate
    }

    this.isActive = true;
    this.rate = rate;
    this.notify();

    // 10 ticks per second (every 100ms)
    const tickIntervalMs = 100;
    const itemsPerTick = Math.max(1, Math.round(rate / 10));

    this.timer = setInterval(() => {
      try {
        this.generateTickTraffic(itemsPerTick, env);
      } catch (err) {
        console.error("[Traffic Generator] Error during tick:", err);
      }
    }, tickIntervalMs);
  }

  public stop() {
    if (!this.isActive) return;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.isActive = false;
    this.rate = 0;
    this.notify();
  }

  public resetCounters() {
    this.totalSent = 0;
    this.notify();
  }

  private generateTickTraffic(count: number, env: "prod" | "staging" | "dev") {
    for (let i = 0; i < count; i++) {
      const traceId = telemetryClient.generateTraceId();
      const path = this.paths[Math.floor(Math.random() * this.paths.length)];
      const rand = Math.random();

      // 96% info/debug logs (successes), 3% warnings, 1% errors
      if (rand < 0.8) {
        telemetryClient.info(`HTTP GET ${path} completed`, {
          service: SERVICES.GATEWAY,
          traceId,
          environment: env,
          metadata: {
            path,
            status: 200,
            durationMs: Math.floor(Math.random() * 40) + 10,
          },
        });
      } else if (rand < 0.96) {
        telemetryClient.debug(`Cache lookup hit for path ${path}`, {
          service: SERVICES.GATEWAY,
          traceId,
          environment: env,
          metadata: { path, cacheKey: `path_cache:${path}` },
        });
      } else if (rand < 0.99) {
        telemetryClient.warn(
          `Database connection pool near capacity (84%) during fetch on ${path}`,
          {
            service: SERVICES.CHECKOUT,
            traceId,
            environment: env,
            metadata: { path, connectionsCount: 84 },
          },
        );
      } else {
        telemetryClient.error(
          `Failed to retrieve recommended products on ${path}`,
          {
            service: SERVICES.CHECKOUT,
            traceId,
            environment: env,
            metadata: {
              path,
              error: "Recommendation-service service unavailable",
            },
          },
        );
      }

      this.totalSent++;
    }

    // Occasionally send a metric item (roughly once a second)
    if (Math.random() < 0.1) {
      telemetryClient.sendMetric({
        service: SERVICES.GATEWAY,
        environment: env,
        cpuUsage: this.rate > 500 ? 75 : this.rate > 50 ? 40 : 15,
        memoryUsage: (this.rate > 500 ? 512 : 280) * 1024 * 1024,
        memoryLimit: 1024 * 1024 * 1024,
        latencyMs: this.rate > 500 ? 450 : this.rate > 50 ? 120 : 35,
      });
    }

    this.notify();
  }
}

export const trafficGenerator = new TrafficGenerator();
