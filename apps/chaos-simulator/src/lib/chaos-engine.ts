import {
  generateLogScenario,
  generateExceptionScenario,
  generateLatencyScenario,
  generateErrorRateScenario,
  generateDatabaseScenario,
  generateRedisScenario,
  generateApiScenario,
  generateAuthScenario,
  generateTrafficScenario,
  generateMemoryScenario,
  generateCpuScenario,
  generateServiceHealthScenario,
  generateBusinessEvent,
} from "./generators";

export interface ChaosStatus {
  active: boolean;
  timeLeft: number;
  lastEvent: string;
}

class ChaosEngine {
  private timer: NodeJS.Timeout | null = null;
  private durationTimer: NodeJS.Timeout | null = null;
  private onStatusChange: ((status: ChaosStatus) => void) | null = null;
  private isActive = false;
  private timeLeft = 0;
  private lastEvent = "None";

  public registerStatusListener(listener: (status: ChaosStatus) => void) {
    this.onStatusChange = listener;
  }

  private notify() {
    if (this.onStatusChange) {
      this.onStatusChange({
        active: this.isActive,
        timeLeft: this.timeLeft,
        lastEvent: this.lastEvent,
      });
    }
  }

  public start(config: {
    durationSeconds: number;
    intervalMs: number;
    environment?: "prod" | "staging" | "dev";
  }) {
    if (this.isActive) return;

    this.isActive = true;
    this.timeLeft = config.durationSeconds;
    this.lastEvent = "Started Chaos Test";
    const env = config.environment || "dev";
    this.notify();

    // Setup tick interval for generating events
    this.timer = setInterval(() => {
      try {
        this.triggerRandomFailure(env);
      } catch (err) {
        console.error("[Chaos Engine] Error during tick:", err);
      }
    }, config.intervalMs);

    // Setup countdown timer
    this.durationTimer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.stop("Completed Chaos Test duration");
      } else {
        this.notify();
      }
    }, 1000);
  }

  public stop(reason = "Stopped manually") {
    if (!this.isActive) return;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }

    this.isActive = false;
    this.timeLeft = 0;
    this.lastEvent = reason;
    this.notify();
  }

  private triggerRandomFailure(env: "prod" | "staging" | "dev") {
    const failureTypes = [
      "log",
      "exception",
      "latency",
      "error-rate",
      "database",
      "redis",
      "api",
      "auth",
      "traffic",
      "memory",
      "cpu",
      "service-health",
      "business-event",
    ];

    const chosenType =
      failureTypes[Math.floor(Math.random() * failureTypes.length)];

    switch (chosenType) {
      case "log": {
        const levels: Array<"debug" | "info" | "warn" | "error" | "critical"> =
          ["debug", "info", "warn", "error", "critical"];
        const level = levels[Math.floor(Math.random() * levels.length)];
        generateLogScenario(level);
        this.lastEvent = `Triggered Log: ${level}`;
        break;
      }
      case "exception": {
        const types: Array<
          "uncaught" | "handled" | "nested" | "validation" | "database"
        > = ["uncaught", "handled", "nested", "validation", "database"];
        const type = types[Math.floor(Math.random() * types.length)];
        generateExceptionScenario(type);
        this.lastEvent = `Triggered Exception: ${type}`;
        break;
      }
      case "latency": {
        const types: Array<"500ms" | "2s" | "5s" | "random" | "spike"> = [
          "500ms",
          "2s",
          "5s",
          "random",
          "spike",
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        generateLatencyScenario(type, env);
        this.lastEvent = `Triggered Latency: ${type}`;
        break;
      }
      case "error-rate": {
        const rates: Array<5 | 25 | 50 | 100> = [5, 25, 50, 100];
        const rate = rates[Math.floor(Math.random() * rates.length)];
        generateErrorRateScenario(rate, env);
        this.lastEvent = `Triggered Error Rate: ${rate}%`;
        break;
      }
      case "database": {
        const types: Array<
          "timeout" | "refused" | "slow" | "deadlock" | "migration"
        > = ["timeout", "refused", "slow", "deadlock", "migration"];
        const type = types[Math.floor(Math.random() * types.length)];
        generateDatabaseScenario(type);
        this.lastEvent = `Triggered DB Failure: ${type}`;
        break;
      }
      case "redis": {
        const types: Array<"cache-storm" | "unavailable" | "slow" | "memory"> =
          ["cache-storm", "unavailable", "slow", "memory"];
        const type = types[Math.floor(Math.random() * types.length)];
        generateRedisScenario(type);
        this.lastEvent = `Triggered Redis Failure: ${type}`;
        break;
      }
      case "api": {
        const types: Array<"404" | "429" | "500" | "timeout"> = [
          "404",
          "429",
          "500",
          "timeout",
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        generateApiScenario(type);
        this.lastEvent = `Triggered API Failure: ${type}`;
        break;
      }
      case "auth": {
        const types: Array<"invalid" | "expired" | "denied"> = [
          "invalid",
          "expired",
          "denied",
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        generateAuthScenario(type);
        this.lastEvent = `Triggered Auth Problem: ${type}`;
        break;
      }
      case "traffic": {
        const types: Array<"x10" | "x100" | "drop" | "burst"> = [
          "x10",
          "x100",
          "drop",
          "burst",
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        generateTrafficScenario(type);
        this.lastEvent = `Triggered Traffic Event: ${type}`;
        break;
      }
      case "memory": {
        const types: Array<"leak" | "heap-growth" | "gc-pressure"> = [
          "leak",
          "heap-growth",
          "gc-pressure",
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        generateMemoryScenario(type);
        this.lastEvent = `Triggered Memory Problem: ${type}`;
        break;
      }
      case "cpu": {
        const types: Array<"spike" | "saturation" | "expensive-loop"> = [
          "spike",
          "saturation",
          "expensive-loop",
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        generateCpuScenario(type);
        this.lastEvent = `Triggered CPU Problem: ${type}`;
        break;
      }
      case "service-health": {
        const types: Array<"unhealthy" | "intermittent" | "dependency"> = [
          "unhealthy",
          "intermittent",
          "dependency",
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        generateServiceHealthScenario(type);
        this.lastEvent = `Triggered Service Health: ${type}`;
        break;
      }
      case "business-event": {
        const types: Array<
          "checkout" | "payment-failed" | "order" | "signup" | "refund"
        > = ["checkout", "payment-failed", "order", "signup", "refund"];
        const type = types[Math.floor(Math.random() * types.length)];
        generateBusinessEvent(type);
        this.lastEvent = `Triggered Business Event: ${type}`;
        break;
      }
    }
    this.notify();
  }
}

export const chaosEngine = new ChaosEngine();
