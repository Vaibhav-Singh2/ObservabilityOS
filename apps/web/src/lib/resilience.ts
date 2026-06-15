/**
 * Custom SRE resilience utilities.
 * Includes timeout control, exponential backoff retries, and a stateful circuit breaker.
 */

/**
 * Rejection error thrown when an operation times out.
 */
export class TimeoutError extends Error {
  constructor(message = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Rejection error thrown when the circuit breaker is open.
 */
export class CircuitBreakerOpenError extends Error {
  constructor(breakerName: string) {
    super(`Circuit breaker "${breakerName}" is currently OPEN`);
    this.name = "CircuitBreakerOpenError";
  }
}

/**
 * Wraps a promise with a timeout. If the promise does not resolve within the specified timeout,
 * it rejects with a TimeoutError.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = "Operation timed out",
): Promise<T> {
  let timerId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(new TimeoutError(errorMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timerId) {
      clearTimeout(timerId);
    }
  }
}

export interface RetryOptions {
  maxRetries?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  jitter?: boolean;
  onRetry?: (error: unknown, attempt: number) => void;
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Retries a function with exponential backoff and optional jitter.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const backoffMs = options.backoffMs ?? 200;
  const maxBackoffMs = options.maxBackoffMs ?? 3000;
  const jitter = options.jitter ?? true;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (
        attempt > maxRetries ||
        (options.shouldRetry && !options.shouldRetry(error))
      ) {
        throw error;
      }

      if (options.onRetry) {
        options.onRetry(error, attempt);
      }

      // Calculate exponential backoff
      let delay = backoffMs * Math.pow(2, attempt - 1);
      delay = Math.min(delay, maxBackoffMs);

      // Apply jitter (plus/minus 25% randomize)
      if (jitter) {
        const jitterAmt = delay * 0.25;
        delay = delay - jitterAmt + Math.random() * (jitterAmt * 2);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number; // Number of failures before opening (default: 5)
  recoveryTimeoutMs?: number; // Time to wait before transition to half-open (default: 10,000ms)
  requestTimeoutMs?: number; // Timeout for internal requests (default: 5000ms)
}

type BreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * A stateful circuit breaker to prevent cascading failures.
 */
export class CircuitBreaker {
  public readonly name: string;
  private state: BreakerState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastStateChange: number = Date.now();

  private readonly failureThreshold: number;
  private readonly recoveryTimeoutMs: number;
  private readonly requestTimeoutMs: number;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.recoveryTimeoutMs = options.recoveryTimeoutMs ?? 10000;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 5000;
  }

  /**
   * Execute an operation protected by the circuit breaker.
   */
  public async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T> | T,
  ): Promise<T> {
    this.checkStateTransition();

    if (this.state === "OPEN") {
      if (fallback) {
        console.warn(`[CircuitBreaker:${this.name}] OPEN. Returning fallback.`);
        return await fallback();
      }
      throw new CircuitBreakerOpenError(this.name);
    }

    try {
      // Execute the call with a request timeout limit
      const result = await withTimeout(
        fn(),
        this.requestTimeoutMs,
        `Request inside circuit breaker "${this.name}" timed out after ${this.requestTimeoutMs}ms`,
      );

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      if (fallback) {
        console.warn(
          `[CircuitBreaker:${this.name}] Call failed. Returning fallback. Error:`,
          error instanceof Error ? error.message : error,
        );
        return await fallback();
      }
      throw error;
    }
  }

  /**
   * Returns current state of the breaker
   */
  public getState(): BreakerState {
    this.checkStateTransition();
    return this.state;
  }

  private checkStateTransition(): void {
    if (
      this.state === "OPEN" &&
      Date.now() - this.lastStateChange > this.recoveryTimeoutMs
    ) {
      this.transitionTo("HALF_OPEN");
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      // Require 2 consecutive successes in half-open state to close the circuit
      if (this.successCount >= 2) {
        this.transitionTo("CLOSED");
      }
    }
  }

  private onFailure(error: unknown): void {
    this.successCount = 0;
    this.failureCount++;
    console.warn(
      `[CircuitBreaker:${this.name}] Failure #${this.failureCount}:`,
      error instanceof Error ? error.message : error,
    );

    if (this.state === "CLOSED" && this.failureCount >= this.failureThreshold) {
      this.transitionTo("OPEN");
    } else if (this.state === "HALF_OPEN") {
      // Any failure in HALF_OPEN immediately re-opens the circuit
      this.transitionTo("OPEN");
    }
  }

  private transitionTo(newState: BreakerState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    this.successCount = 0;
    if (newState === "CLOSED") {
      this.failureCount = 0;
    }
    console.warn(
      `[CircuitBreaker:${this.name}] State transition: ${oldState} -> ${newState}`,
    );
  }
}

// Global registry to share circuit breakers across import boundaries in Serverless route hot-reloads
interface BreakerCache {
  breakers: Map<string, CircuitBreaker>;
}

let cached: BreakerCache = (
  globalThis as unknown as { breakerCache: BreakerCache }
).breakerCache;
if (!cached) {
  cached = (
    globalThis as unknown as { breakerCache: BreakerCache }
  ).breakerCache = {
    breakers: new Map(),
  };
}

/**
 * Helper to fetch or create a named singleton CircuitBreaker.
 */
export function getCircuitBreaker(
  options: CircuitBreakerOptions,
): CircuitBreaker {
  let breaker = cached.breakers.get(options.name);
  if (!breaker) {
    breaker = new CircuitBreaker(options);
    cached.breakers.set(options.name, breaker);
  }
  return breaker;
}
