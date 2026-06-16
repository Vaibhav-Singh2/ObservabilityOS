# @observability-os/sdk

**Zero-dependency TypeScript logger SDK** for [ObservabilityOS](https://github.com/Vaibhav-Singh2/ObservabilityOS) — an AI-native DevOps intelligence and log analytics platform.

## Features

- **Zero runtime dependencies** — uses only built-in `fetch`, `setInterval`, `clearInterval`
- **Batch-and-flush architecture** — logs are queued in memory and flushed when the batch size or flush interval is reached
- **Automatic retry** — failed API calls re-queue logs for the next flush attempt
- **Timer safety** — flush interval uses `.unref()` so it doesn't block Node.js process exit
- **TypeScript first** — full type definitions included

## Installation

```bash
npm install @observability-os/sdk
# or
yarn add @observability-os/sdk
# or
pnpm add @observability-os/sdk
```

## Quick Start

```typescript
import { Logger } from "@observability-os/sdk";

const logger = new Logger({
  apiKey: "your-api-key",
  defaultService: "my-app",
  defaultEnvironment: "prod",
});

logger.info("Application started");
logger.warn("High memory usage", { metadata: { memoryMb: 2048 } });
logger.error("Failed to connect to database", {
  service: "db-worker",
  traceId: "abc-123",
});
```

## API

### `LoggerConfig`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | — | API key for the ingestion endpoint |
| `endpoint` | `string` | `http://localhost:3000/api/ingest` | Ingestion API URL |
| `defaultService` | `string` | — | Default service name for logs |
| `defaultEnvironment` | `"prod" \| "staging" \| "dev"` | `"dev"` | Default deployment environment |
| `batchSize` | `number` | `20` | Logs queued before automatic flush |
| `flushIntervalMs` | `number` | `1000` | Interval in ms between automatic flushes (set to `0` to disable) |

### `LogOptions`

| Option | Type | Description |
|---|---|---|
| `service` | `string` | Override the service name for this log |
| `environment` | `"prod" \| "staging" \| "dev"` | Override the environment for this log |
| `timestamp` | `Date` | Custom timestamp (defaults to `new Date()`) |
| `traceId` | `string` | Trace identifier for distributed tracing |
| `metadata` | `Record<string, any>` | Arbitrary key-value metadata |

### `Logger` methods

| Method | Description |
|---|---|
| `log(level, message, options?)` | Log at any severity level |
| `info(message, options?)` | Log at `info` level |
| `warn(message, options?)` | Log at `warn` level |
| `error(message, options?)` | Log at `error` level |
| `debug(message, options?)` | Log at `debug` level |
| `flush()` | Immediately flush all queued logs |
| `destroy()` | Clear the flush interval timer for cleanup |

## Architecture

Logs are queued in memory and flushed to the ObservabilityOS ingestion API in batches. If the API is unreachable or returns an error, logs are automatically re-queued and retried on the next flush cycle.

```
Your App → Logger.log() → In-memory Queue → /api/ingest → ObservabilityOS
                          (flush on batch  │
                           size or timer)  └→ Re-queue on failure
```

## License

MIT
