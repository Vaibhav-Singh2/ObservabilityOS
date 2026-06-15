import { Logger } from "@repo/sdk";

export interface TelemetryResponse {
  timestamp: string;
  type: "logs" | "metrics";
  status: number;
  count: number;
  success: boolean;
  message: string;
}

export interface TelemetryStats {
  logs: {
    debug: number;
    info: number;
    warn: number;
    error: number;
    critical: number;
    total: number;
  };
  metrics: number;
  traces: number;
  events: number;
  responses: TelemetryResponse[];
}

class TelemetrySDKWrapper {
  private logger: Logger | null = null;
  private apiKey = "";
  private logsEndpoint = "";
  private metricsEndpoint = "";
  private defaultService = "";
  private defaultEnv: "prod" | "staging" | "dev" = "dev";

  // In-memory stats
  private stats: TelemetryStats = {
    logs: { debug: 0, info: 0, warn: 0, error: 0, critical: 0, total: 0 },
    metrics: 0,
    traces: 0,
    events: 0,
    responses: [],
  };

  // Callback to notify UI of stats updates
  private onStatsChange: ((stats: TelemetryStats) => void) | null = null;

  public init(config: {
    apiKey: string;
    logsEndpoint: string;
    metricsEndpoint: string;
    defaultService: string;
    defaultEnv?: "prod" | "staging" | "dev";
  }) {
    this.apiKey = config.apiKey;
    this.logsEndpoint = config.logsEndpoint;
    this.metricsEndpoint = config.metricsEndpoint;
    this.defaultService = config.defaultService;
    this.defaultEnv = config.defaultEnv || "dev";

    // Re-instantiate standard SDK logger
    if (this.logger) {
      this.logger.destroy();
    }

    // We intercept SDK's fetch calls if we want to trace them, but the SDK has its own background timer.
    // To count them properly, we wrap standard logging methods.
    this.logger = new Logger({
      apiKey: this.apiKey,
      endpoint: this.logsEndpoint,
      defaultService: this.defaultService,
      defaultEnvironment: this.defaultEnv,
      batchSize: 1, // Flush immediately in simulator so results appear instantly in telemetry validation view!
      flushIntervalMs: 0,
    });
  }

  public registerStatsListener(listener: (stats: TelemetryStats) => void) {
    this.onStatsChange = listener;
    // Initial call
    listener({ ...this.stats });
  }

  private notify() {
    if (this.onStatsChange) {
      this.onStatsChange({ ...this.stats });
    }
  }

  public log(
    level: "debug" | "info" | "warn" | "error" | "critical",
    message: string,
    options?: {
      service?: string;
      environment?: "prod" | "staging" | "dev";
      metadata?: Record<string, unknown>;
      traceId?: string;
    },
  ) {
    if (!this.logger) {
      console.warn("Telemetry SDK wrapper is not initialized!");
      return;
    }

    // Map critical to error since the ingestion API accepts 'error', 'warn', 'info', 'debug'
    const ingestionLevel = level === "critical" ? "error" : level;

    // Use standard SDK logger
    this.logger.log(ingestionLevel, message, {
      service: options?.service || this.defaultService,
      environment: options?.environment || this.defaultEnv,
      traceId: options?.traceId,
      metadata: {
        ...(options?.metadata || {}),
        isCritical: level === "critical" ? true : undefined,
      },
    });

    // Update stats
    this.stats.logs[level]++;
    this.stats.logs.total++;
    if (options?.traceId) {
      this.stats.traces++;
    }

    // Since SDK batching is 1, let's record a mock response for UI feedback
    this.recordResponse({
      type: "logs",
      status: 200,
      count: 1,
      success: true,
      message: `Enqueued ${level} log to SDK buffer.`,
    });

    this.notify();
  }

  public info(
    message: string,
    options?: Parameters<TelemetrySDKWrapper["log"]>[2],
  ) {
    this.log("info", message, options);
  }

  public warn(
    message: string,
    options?: Parameters<TelemetrySDKWrapper["log"]>[2],
  ) {
    this.log("warn", message, options);
  }

  public error(
    message: string,
    options?: Parameters<TelemetrySDKWrapper["log"]>[2],
  ) {
    this.log("error", message, options);
  }

  public debug(
    message: string,
    options?: Parameters<TelemetrySDKWrapper["log"]>[2],
  ) {
    this.log("debug", message, options);
  }

  public critical(
    message: string,
    options?: Parameters<TelemetrySDKWrapper["log"]>[2],
  ) {
    this.log("critical", message, options);
  }

  // Trigger metrics ingestion via HTTP fetch directly
  public async sendMetric(metric: {
    service?: string;
    environment?: "prod" | "staging" | "dev";
    cpuUsage: number;
    memoryUsage: number;
    memoryLimit: number;
    latencyMs: number;
  }): Promise<boolean> {
    if (!this.apiKey) {
      console.warn("Telemetry SDK wrapper is not initialized!");
      return false;
    }

    const payload = {
      service: metric.service || this.defaultService,
      environment: metric.environment || this.defaultEnv,
      timestamp: new Date().toISOString(),
      cpuUsage: Math.min(100, Math.max(0, metric.cpuUsage)),
      memoryUsage: metric.memoryUsage,
      memoryLimit: metric.memoryLimit,
      latencyMs: metric.latencyMs,
    };

    try {
      const res = await fetch(this.metricsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      const success = res.ok;
      this.stats.metrics++;

      this.recordResponse({
        type: "metrics",
        status: res.status,
        count: 1,
        success,
        message: success
          ? `Ingested metrics for ${payload.service}`
          : `Metrics ingestion failed: ${res.statusText}`,
      });

      this.notify();
      return success;
    } catch (err) {
      this.recordResponse({
        type: "metrics",
        status: 0,
        count: 1,
        success: false,
        message: err instanceof Error ? err.message : "Network error",
      });
      this.notify();
      return false;
    }
  }

  // Helper to trigger custom Business Events
  public recordBusinessEvent(
    name: string,
    message: string,
    metadata: Record<string, unknown>,
    options?: {
      service?: string;
      environment?: "prod" | "staging" | "dev";
      traceId?: string;
    },
  ) {
    this.stats.events++;
    this.log("info", message, {
      ...options,
      metadata: {
        eventType: "business",
        eventName: name,
        ...metadata,
      },
    });
  }

  private recordResponse(resp: Omit<TelemetryResponse, "timestamp">) {
    this.stats.responses.unshift({
      timestamp: new Date().toLocaleTimeString(),
      ...resp,
    });
    // Keep only last 100 responses
    if (this.stats.responses.length > 100) {
      this.stats.responses.pop();
    }
  }

  public getStats(): TelemetryStats {
    return { ...this.stats };
  }

  public resetStats() {
    this.stats = {
      logs: { debug: 0, info: 0, warn: 0, error: 0, critical: 0, total: 0 },
      metrics: 0,
      traces: 0,
      events: 0,
      responses: [],
    };
    this.notify();
  }

  public generateTraceId(): string {
    return `trace_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;
  }
}

// Export singleton client
export const telemetryClient = new TelemetrySDKWrapper();
