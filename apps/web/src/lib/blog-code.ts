/* eslint-disable */
// @ts-nocheck
// ─────────────────────────────────────────────
// Blog Code Samples — raw display strings
// TypeScript checking disabled intentionally.
// These strings are rendered into <pre><code> blocks.
// ─────────────────────────────────────────────

export const CODE = {
  // Article 1: What is Observability
  structuredLogging: `// Structured logging with Pino (Node.js)
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// ✅ Structured: searchable, filterable, analyzable
logger.info({
  event: 'payment.processed',
  userId: 'usr_123',
  amount: 4900,
  currency: 'USD',
  durationMs: 342,
  traceId: 'abc-def-123',
}, 'Payment processed successfully');

// ❌ Unstructured: impossible to query at scale
console.log('Payment processed for user usr_123: $49.00 in 342ms');`,

  threepillarsCode: `// The three pillars working together — a single request
// METRIC: request counter increments by 1
// TRACE: spans recorded across service boundaries
// LOG: structured event with full context

logger.info({
  event: 'payment.processed',
  traceId: span.spanContext().traceId,  // connects log to trace
  userId: 'usr_9a2f',
  amount: 4900,
  currency: 'USD',
  durationMs: 342,
  checkoutService: 'v2.4.1',
}, 'Payment processed successfully');`,

  // Article 1: SDK install
  sdkInstall: `# Install ObservabilityOS SDK — structured logging + OTel in one package
npm install @observability-os/sdk

# In your app entry point (before any other imports):
import '@observability-os/sdk/register';

# That's it. Auto-instruments:
# ✅ HTTP requests (incoming + outgoing)
# ✅ Express/Fastify middleware
# ✅ MongoDB operations
# ✅ Redis commands
# ✅ Unhandled exceptions + promise rejections
# ✅ PII scrubbing (passwords, tokens, credit cards)`,

  // Article 3: Alert fatigue — Z-score
  zScore: `// Rolling Z-score calculation — what ObservabilityOS uses internally
function calculateZScore(
  currentValue: number,
  windowValues: number[]
): number {
  if (windowValues.length < 30) return 0; // insufficient sample

  const mean =
    windowValues.reduce((sum, v) => sum + v, 0) / windowValues.length;
  const variance =
    windowValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
    windowValues.length;
  const stdDev = Math.sqrt(variance);

  // Avoid division by zero on perfectly stable metrics
  return stdDev === 0 ? 0 : (currentValue - mean) / stdDev;
}

// Alert threshold: Z > 3.0 = statistically significant anomaly
const zScore = calculateZScore(currentErrorRate, rollingWindow);
if (zScore > 3.0 && windowValues.length >= 30) {
  await triggerIncident({ metric: 'error_rate', zScore, currentValue });
}`,

  // Article 4: OTel install
  otelInstall: `# Core SDK
npm install @opentelemetry/sdk-node

# Auto-instrumentation (loads all supported libraries automatically)
npm install @opentelemetry/auto-instrumentations-node

# OTLP exporter (sends to any OTLP-compatible backend)
npm install @opentelemetry/exporter-trace-otlp-http
npm install @opentelemetry/exporter-metrics-otlp-http`,

  // Article 4: OTel config
  otelConfig: `// instrumentation.ts — load BEFORE any other imports
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: process.env.SERVICE_NAME ?? 'my-service',
    [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version ?? '0.0.0',
    'deployment.environment': process.env.NODE_ENV ?? 'development',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces',
    headers: { Authorization: \`Bearer \${process.env.OBSERVABILITY_API_KEY}\` },
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/metrics',
    }),
    exportIntervalMillis: 30_000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-mongodb': { enabled: true },
      '@opentelemetry/instrumentation-ioredis': { enabled: true },
      // Disable filesystem instrumentation — too noisy in production
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

// Ensure clean shutdown sends remaining spans
process.on('SIGTERM', () => sdk.shutdown());
process.on('SIGINT', () => sdk.shutdown());`,

  // Article 4: Custom spans
  customSpans: `import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('checkout-service');

async function processPayment(userId: string, amount: number) {
  // Create a custom span — visible in traces and dashboards
  return tracer.startActiveSpan('payment.process', async (span) => {
    // Add attributes — these become searchable dimensions
    span.setAttributes({
      'payment.user_id': userId,
      'payment.amount_cents': amount,
      'payment.currency': 'USD',
      'payment.provider': 'stripe',
    });

    try {
      const result = await stripe.charges.create({ amount, currency: 'usd' });
      span.setAttributes({ 'payment.charge_id': result.id });
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      // Record the error — shows up in error tracking
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end(); // Always end the span
    }
  });
}`,

  // Article 4: Context propagation
  contextPropagation: `// Context propagation is automatic with OTel HTTP instrumentation.
// This outbound request will automatically include W3C TraceContext headers:

import axios from 'axios';

// The OTel SDK patches axios automatically — no manual code needed:
const response = await axios.get('https://inventory-service/api/stock', {
  params: { productId: '123' },
});
// → Sends headers: traceparent: 00-{traceId}-{spanId}-01
// → inventory-service continues the same trace automatically`,

  // Article 4: Sampling
  sampling: `import { TraceIdRatioBasedSampler, ParentBasedSampler } from '@opentelemetry/sdk-trace-base';

// Sample 10% of requests by default,
// but always sample requests that are already part of a trace (parent-based)
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(
    process.env.NODE_ENV === 'production' ? 0.1 : 1.0
  ),
});

// Add to NodeSDK config:
const sdk = new NodeSDK({ sampler, /* ... */ });`,

  // Article 5: CloudWatch Fluent Bit config
  fluentBit: `# CloudWatch to ObservabilityOS log forwarding
# Use the Fluent Bit CloudWatch plugin to forward logs

[OUTPUT]
    Name            http
    Match           *
    Host            ingest.observabilityos.com
    Port            443
    URI             /v1/logs
    Format          json
    Header          Authorization Bearer YOUR_API_KEY
    tls             On
    tls.verify      On`,

  // Article 6: AI RCA prompt
  rcaPrompt: `// Simplified version of ObservabilityOS's RCA prompt structure
const systemPrompt = \`
You are an expert SRE analyzing a production incident.
Reason step by step. Format your response as JSON.

STEP 1 — Summarize the anomaly (2 sentences max)
STEP 2 — List evidence ranked by diagnostic strength
STEP 3 — Identify the root cause with confidence (0.0-1.0)
STEP 4 — List alternative causes with confidence scores
STEP 5 — Suggest immediate remediation steps (ordered by priority)

Rules:
- Never state certainty above 0.95 — production systems are complex
- If evidence conflicts, lower your confidence and note the conflict
- Always correlate timing: causation requires temporal precedence
- Distinguish between direct causes and contributing factors
\`;

const userPrompt = \`
INCIDENT CONTEXT:
- Anomaly detected: 2026-07-05T03:47:12Z
- Service: checkout-api (Z-score: +4.8 on error_rate)
- Anomaly value: 23.4% error rate (baseline: 1.2%)

RELEVANT LOGS (last 50 errors):
MongoServerError: connection pool exhausted (timeout after 30000ms)
  at checkout-api/src/db/mongo.ts:47

RECENT DEPLOYS:
- 2026-07-05T03:35:00Z: checkout-api v2.4.1 → v2.4.2
  Commit: "Add eager loading of related products on checkout"
  Changed files: checkout.service.ts, mongo.ts

CORRELATED ANOMALIES:
- inventory-service: query_time p99 spike (+340%) at 03:47
\`;`,

  // Article 6: AI RCA JSON response
  rcaJson: `{
  "summary": "Checkout service connection pool exhaustion caused by a recent deploy that added N+1 queries to the product loading path, overwhelming MongoDB connection limits under normal load.",

  "root_cause": {
    "description": "Deploy v2.4.2 (03:35 UTC) introduced eager loading of related products, which executes one MongoDB query per cart item. A cart with 12 items now triggers 12 concurrent queries. The connection pool (max: 10) became exhausted within 12 minutes of the deploy.",
    "confidence": 0.91,
    "evidence": [
      "MongoServerError: connection pool exhausted — 847 occurrences post-deploy",
      "Deploy timing: errors begin exactly 12 min after v2.4.2 deployment",
      "inventory-service query time spike: corroborates MongoDB contention",
      "Changed file mongo.ts — connection pool config unchanged at max:10"
    ]
  },

  "alternatives": [
    {
      "cause": "MongoDB server resource exhaustion (CPU/Memory)",
      "confidence": 0.06,
      "reason": "No MongoDB server metrics indicate resource saturation"
    }
  ],

  "remediation": [
    "IMMEDIATE: Revert to v2.4.1 (git revert 8f3a021)",
    "SHORT-TERM: Increase connection pool max to 50 in mongo.ts",
    "PERMANENT: Replace N+1 queries with a single aggregation pipeline"
  ]
}`,

  // Article 7: SLI calculation
  sliCalc: `// Availability SLI: percentage of requests that succeed
// Definition: HTTP 2xx + 3xx responses / total requests
function calculateAvailabilitySLI(
  successfulRequests: number,
  totalRequests: number
): number {
  if (totalRequests === 0) return 1.0;
  return successfulRequests / totalRequests;
}

// Latency SLI: percentage of requests served within threshold
// Definition: requests under 200ms / total requests
function calculateLatencySLI(
  requestDurationsMs: number[],
  thresholdMs: number = 200
): number {
  if (requestDurationsMs.length === 0) return 1.0;
  const fast = requestDurationsMs.filter(d => d <= thresholdMs).length;
  return fast / requestDurationsMs.length;
}`,

  // Article 7: Error budget
  errorBudget: `// Error budget tracking — what ObservabilityOS SLO dashboard shows
interface ErrorBudget {
  sloTarget: number;          // e.g., 0.999 (99.9%)
  windowDays: number;         // e.g., 30
  currentSLI: number;         // measured availability
  budgetMinutes: number;      // total allowed downtime
  spentMinutes: number;       // downtime consumed so far
  remainingPercent: number;   // budget remaining (0-100%)
  burnRate: number;           // current consumption rate vs budget
}

function calculateErrorBudget(
  sloTarget: number,
  windowDays: number,
  currentSLI: number,
  elapsedDays: number
): ErrorBudget {
  const budgetMinutes = (1 - sloTarget) * windowDays * 24 * 60;
  const spentMinutes = (1 - currentSLI) * elapsedDays * 24 * 60;
  const remainingPercent = Math.max(0, (1 - spentMinutes / budgetMinutes) * 100);
  // Burn rate > 1.0 means you'll exhaust the budget before the window ends
  const burnRate = spentMinutes / budgetMinutes / (elapsedDays / windowDays);

  return { sloTarget, windowDays, currentSLI, budgetMinutes, spentMinutes, remainingPercent, burnRate };
}`,

  // Article 8: Post-mortem template
  postMortem: `# Incident Post-Mortem: Checkout Service Outage
**Date:** 2026-07-05 | **Severity:** P1 | **Duration:** 23 minutes
**Author:** AI-generated draft — reviewed by @alex.chen

## Summary
The checkout service returned HTTP 500 errors for 23 minutes from 03:47 to
04:10 UTC due to MongoDB connection pool exhaustion triggered by a deploy
that introduced N+1 queries on the product loading path.

## Timeline (UTC)
03:35 — Deploy v2.4.2 deployed to checkout-api (3 instances)
03:47 — Error rate anomaly detected (Z-score: 4.8) → incident opened
03:49 — On-call engineer paged. AI RCA card generated.
03:52 — Engineer identifies root cause from AI card (N+1 query pattern)
04:02 — Rollback to v2.4.1 initiated
04:10 — Error rate returns to baseline. Incident resolved.

## Root Cause
Deploy v2.4.2 added eager loading of related products, executing one
MongoDB query per cart item instead of a single aggregation. A cart with
12 items triggered 12 concurrent queries, exhausting the connection pool
(max: 10 connections) 12 minutes after deployment as traffic ramped up.

## Contributing Factors
- Connection pool max (10) was not documented or reviewed during code review
- No load test was run against the eager loading implementation
- The deployment monitoring window (5 min) was too short to catch gradual exhaustion

## Impact
- 23 minutes of checkout unavailability
- ~340 failed checkout attempts (estimated)
- ~$17,000 in potentially lost GMV (estimated at $50 average cart)
- 0 customer SLA violations (SLA threshold: 99.5% monthly availability)

## Action Items
| Action | Owner | Due | Priority |
|--------|-------|-----|----------|
| Add connection pool config to code review checklist | @marcus.reid | Jul 12 | P1 |
| Implement query count assertions in CI for N+1 detection | @priya.sharma | Jul 19 | P1 |
| Extend deployment monitoring window to 15 minutes | @alex.chen | Jul 12 | P2 |
| Document MongoDB connection pool sizing guidelines | @priya.sharma | Jul 26 | P2 |`,

  // Article 9: MongoDB driver monitoring
  mongoDriver: `import { MongoClient, MongoClientOptions } from 'mongodb';

function createMongoClientWithMonitoring(uri: string): MongoClient {
  const options: MongoClientOptions = {
    maxPoolSize: 50,       // Production-appropriate pool size
    minPoolSize: 5,        // Keep connections warm
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,

    // Enable all monitoring events
    monitorCommands: true,
  };

  const client = new MongoClient(uri, options);
  const slowQueryThresholdMs = 100;

  // Track command durations for slow query detection
  client.on('commandStarted', (event) => {
    (event as any)._startTime = Date.now();
  });

  client.on('commandSucceeded', (event) => {
    const durationMs = Date.now() - ((event as any)._startTime ?? Date.now());

    // Emit to your observability platform
    metrics.histogram('mongodb.command.duration_ms', durationMs, {
      command: event.commandName,
      database: event.databaseName,
    });

    if (durationMs > slowQueryThresholdMs) {
      logger.warn({
        event: 'mongodb.slow_query',
        command: event.commandName,
        database: event.databaseName,
        durationMs,
        query: JSON.stringify(event.reply).slice(0, 500),
      }, 'Slow MongoDB query detected');
    }
  });

  client.on('commandFailed', (event) => {
    metrics.increment('mongodb.command.errors', {
      command: event.commandName,
      error: event.failure.message,
    });
  });

  // Monitor connection pool
  client.on('connectionPoolCreated', (event) => {
    logger.info({ event: 'mongodb.pool.created', address: event.address }, 'MongoDB connection pool created');
  });

  client.on('connectionCheckOutFailed', (event) => {
    // This fires when pool is exhausted — critical signal
    metrics.increment('mongodb.pool.checkout_failed', { reason: event.reason });
    logger.error({ event: 'mongodb.pool.exhausted', reason: event.reason }, 'MongoDB connection pool exhausted');
  });

  return client;
}`,

  // Article 9: Slow query analysis
  slowQuery: `// Automated slow query analysis with explain() plan logging
async function analyzeSlowQuery(
  collection: Collection,
  filter: object,
  durationMs: number
): Promise<void> {
  if (durationMs < 100) return; // Only analyze slow queries

  const plan = await collection.find(filter).explain('executionStats');
  const stage = plan.queryPlanner?.winningPlan?.stage;

  if (stage === 'COLLSCAN') {
    logger.error({
      event: 'mongodb.missing_index',
      collection: collection.collectionName,
      filter: JSON.stringify(filter),
      durationMs,
      docsExamined: plan.executionStats?.totalDocsExamined,
      docsReturned: plan.executionStats?.totalKeysExamined,
    }, 'Collection scan detected — index missing');

    // Auto-create an alert in ObservabilityOS
    await observability.createAlert({
      title: \`Missing index on \${collection.collectionName}\`,
      severity: 'high',
      metadata: { filter, durationMs },
    });
  }
}`,

  // Article 9: ObservabilityOS MongoDB setup
  mongoOos: `import { init, mongoMonitor } from '@observability-os/sdk';

// Initialize with MongoDB monitoring plugin
init({
  apiKey: process.env.OBSERVABILITY_API_KEY,
  service: 'my-api',
  plugins: [
    mongoMonitor({
      slowQueryThresholdMs: 100,
      logExplainOnSlowQuery: true,
      alertOnPoolExhaustion: true,
    }),
  ],
});

// Your existing Mongoose connection — no other changes needed
await mongoose.connect(process.env.MONGODB_URI);`,

  // Article 10: Log summarization prompt
  logSummarization: `// Log summarization prompt structure used by ObservabilityOS
const summarizeLogsPrompt = (logs: string[]) => \`
Analyze these \${logs.length} log entries from a production incident.

LOGS:
\${logs.join('\\n')}

Produce a JSON response with:
{
  "dominant_error": "the most common error pattern",
  "error_count": number of distinct error types,
  "timeline": "when errors started, any escalation pattern",
  "affected_components": ["list", "of", "services"],
  "key_patterns": ["up to 3 notable patterns"],
  "suggested_investigation": "what to look at next"
}
\`;`,

  // Article 12: Span anatomy
  spanAnatomy: `// Anatomy of a span — what OpenTelemetry records
interface Span {
  traceId: string;       // "4bf92f3577b34da6a3ce929d0e0e4736" — same across all spans in the trace
  spanId: string;        // "00f067aa0ba902b7" — unique per span
  parentSpanId: string;  // "a2fb4a1d1a96d312" — who triggered this span
  name: string;          // "POST /api/checkout" or "mongodb.find" or "redis.get"
  startTime: number;     // epoch nanoseconds
  endTime: number;       // epoch nanoseconds
  status: 'OK' | 'ERROR';
  attributes: {
    'http.method': 'POST',
    'http.url': '/api/checkout',
    'http.status_code': 200,
    'db.system': 'mongodb',
    'db.operation': 'find',
    // ... any custom attributes
  };
  events: SpanEvent[];   // timestamped annotations within the span
}`,

  // Article 12: TraceContext headers
  traceContext: `// W3C TraceContext header format
// traceparent: {version}-{trace-id}-{parent-span-id}-{trace-flags}
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
//            ^  ^                               ^               ^
//            |  trace ID (32 hex chars)         span ID        sampled flag
//            version

// With OpenTelemetry, this propagation is AUTOMATIC.
// When you call fetch() or axios.get(), OTel injects traceparent automatically.
// When your Express server receives a request, OTel extracts it automatically.
// You don't write a single line of propagation code.`,

  // Article 12: Custom trace
  customTrace: `// Adding tracing to a business logic function
import { trace, SpanStatusCode, context, propagation } from '@opentelemetry/api';

const tracer = trace.getTracer('order-service', '1.0.0');

export async function createOrder(
  userId: string,
  items: CartItem[]
): Promise<Order> {
  return tracer.startActiveSpan('order.create', async (span) => {
    span.setAttributes({
      'order.user_id': userId,
      'order.item_count': items.length,
      'order.total_cents': items.reduce((sum, i) => sum + i.priceCents, 0),
    });

    try {
      // These nested calls automatically become child spans
      const inventory = await checkInventory(items);    // child span
      const payment = await processPayment(userId);     // child span
      const order = await saveOrder(userId, items);     // child span (mongo)

      span.addEvent('order.created', { orderId: order.id });
      span.setStatus({ code: SpanStatusCode.OK });
      return order;

    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (err as Error).message,
      });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  });
}`,

  // Article 13: OTel exporter swap
  otelExporterSwap: `# Send OTel data to Datadog (keeps your Datadog setup)
# Set these environment variables in your OTel config:
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.datadoghq.com
OTEL_EXPORTER_OTLP_HEADERS=DD-API-KEY=your_api_key

# OR send to ObservabilityOS instead:
OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.observabilityos.com
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer your_api_key

# Your application code is IDENTICAL in both cases.
# Only the environment variables change when you switch backends.`,

  // Article 14: Pino install
  pinoInstall: `npm install pino pino-http
npm install --save-dev pino-pretty  # human-readable output in development`,

  // Article 14: Logger config
  loggerConfig: `// logger.ts — configure once, import everywhere
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',

  // In development: pretty-print for human readability
  // In production: raw JSON for machine parsing
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,

  // Base fields included in every log line
  base: {
    service: process.env.SERVICE_NAME ?? 'api',
    version: process.env.npm_package_version ?? '0.0.0',
    env: process.env.NODE_ENV ?? 'development',
  },

  // Redact sensitive fields before logging — PII compliance
  redact: {
    paths: ['*.password', '*.token', '*.authorization', '*.credit_card', '*.ssn'],
    censor: '[REDACTED]',
  },

  // ISO timestamps in production
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Usage:
logger.info({ event: 'server.started', port: 3000 }, 'HTTP server listening');
logger.error({ event: 'db.connection_failed', err }, 'MongoDB connection failed');`,

  // Article 14: Correlation IDs
  correlationIds: `// Request correlation with AsyncLocalStorage
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { logger } from './logger';

const requestContext = new AsyncLocalStorage<{ requestId: string; userId?: string }>();

// Express middleware — runs on every request
export function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string ?? randomUUID();
  res.setHeader('x-request-id', requestId);

  // Store request context — available in all async calls from this request
  requestContext.run({ requestId }, () => {
    next();
  });
}

// Get a request-scoped child logger — includes requestId automatically
export function getLogger() {
  const ctx = requestContext.getStore();
  if (!ctx) return logger;
  return logger.child({ requestId: ctx.requestId, userId: ctx.userId });
}

// In your route handlers:
app.post('/api/checkout', async (req, res) => {
  const log = getLogger();
  log.info({ event: 'checkout.started', itemCount: req.body.items.length }, 'Checkout initiated');
  // All logs from this request share the same requestId — searchable together
});`,

  // Original articles code
  zeroConfigInstall: `npm install @observability-os/sdk

# In your main entry point — before any other imports:
import '@observability-os/sdk/register';

# Environment variables:
OBSERVABILITY_API_KEY=your_key_here
SERVICE_NAME=checkout-api
NODE_ENV=production`,

  aiIncidentCard: `## Incident #29401 — Payments Microservice Outage
- **Severity**: Critical (Z-Score: +4.8)
- **Root Cause**: Database timeout on POST /api/payments
- **Correlated Commit**: 8f3a021 ("Update SQL query mapping in userModel.ts")
- **Diagnosis**: Missing index on customer_id causing full collection scan
- **Confidence**: 0.87
- **Action**: Revert commit 8f3a021 OR run migration add_customer_id_index.sql`,

  piiScrubber: `import { createScrubber } from "@observability-os/sdk";

const scrubber = createScrubber({
  redactKeys: ["password", "token", "authorization", "credit_card"],
  customPatterns: [
    { name: "SocialSecurity", regex: /\\d{3}-\\d{2}-\\d{4}/g },
    { name: "Email", regex: /[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}/gi },
  ],
});

const clean = scrubber.scrub({
  msg: "User login failure",
  email: "user@example.com",
  password: "super_secret_123",
  token: "eyJhbGci...",
});
// → { msg: "User login", email: "[REDACTED]", password: "[REDACTED]", token: "[REDACTED]" }`,

  zscoreAnomaly: `function calculateZScore(value: number, window: number[]): number {
  if (window.length < 30) return 0; // insufficient data
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  const variance = window.reduce((s, v) => s + (v - mean) ** 2, 0) / window.length;
  const stdDev = Math.sqrt(variance);
  return stdDev === 0 ? 0 : (value - mean) / stdDev;
}
// Z > 3.0 → anomaly | Z > 4.0 → critical`,
};
