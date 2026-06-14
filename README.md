# ObservabilityOS

ObservabilityOS is an AI-native log analytics and system performance monitoring startup platform built for high-performance engineering teams. It provides automatic anomaly detection, AI-generated incident analysis, metrics visualization, SLO budget tracking, multi-channel alerts, saved search console shortcuts, log CSV/JSON exports, and administrative audit logs.

---

## 🌟 Key Features

- **Ingestion Engine**: Structured JSON log ingestion and timeseries metrics ingestion via secure high-throughput REST APIs.
- **AI-Native Anomaly Analysis**: Statistical Z-Score anomaly engine combined with Claude/GPT-4 models to generate descriptive incident cards ("What happened, Why, and how to fix it").
- **Correlated Deployments**: Links incoming deploy webhooks (GitHub) to regression spikes within a 30-minute window for faster MTTR.
- **SLO & Error Budget Tracking**: Configure Service Level Objectives (availability & latency) over rolling windows, computing budgets entirely within MongoDB index-based counts.
- **Performance Optimization**:
  - **Atlas Search Index**: Lucene-backed full-text log search with a graceful regex fallback for local testing.
  - **Redis Cache Layer**: Caches heavy dashboard aggregates and metrics query buckets with automated mutation-based invalidations.
- **Security Hardening**: Enforces sliding-window rate limiting on public ingest paths, global Helmet security headers, secure cookies, and strict tenant isolation.
- **Multi-channel Alerting**: Alerts SREs when SLOs transition between states (healthy, warning, breached) via Slack, Discord, and Microsoft Teams.
- **Saved Queries & Exporting**: Stream download logs in CSV/JSON format and save search configurations to a quick-access console sidebar.
- **Administrative Audit Trail**: Log administrative configuration mutations (SLOs, webhooks, service deletions) chronologically in the settings console.

---

## 📂 Repository Structure

ObservabilityOS is managed as a **Turborepo** monorepo workspace:

```text
├── apps
│   ├── web                   # Next.js 16 App Router Web Console & APIs
│   └── docs                  # Next.js Documentation site
├── packages
│   ├── db                    # Shared Mongoose/MongoDB connection & model schemas
│   ├── ai                    # LLM Prompt builders & narrative incident summarizers
│   ├── sdk                   # TypeScript Logger Winston/Pino-like wrapper SDK
│   ├── typescript-config     # Shared base TSConfig options
│   └── ui                    # Shared React UI components
├── scratch                   # Week-by-week verification and validation scripts
└── context                   # Product, Business, and Technical architectural guidelines
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed locally:

- **Node.js**: `v18` or higher
- **Yarn**: `1.22` (default workspace package manager)
- **MongoDB**: Standalone local instance (e.g. Docker, replica set) or Atlas cluster
- **Redis**: Standalone local instance (listening on port `6379`)

To spin up MongoDB and Redis quickly using Docker:

```bash
docker-compose up -d
```

### Installation

1. Clone this repository and run Yarn to install monorepo dependencies:

   ```bash
   yarn install
   ```

2. Create a `.env` file in `apps/web/.env` with the following variables:

   ```env
   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/observability-os

   # Redis Configuration
   REDIS_URL=redis://localhost:6379

   # Auth Configuration
   JWT_SECRET=your_jwt_secret_token_here

   # GitHub OAuth Configuration
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret

   # App URL Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # AI / LLM Configuration (Optional for mock fallback)
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. Build the shared packages:

   ```bash
   yarn build
   ```

4. Spin up the local development servers:
   ```bash
   yarn dev
   ```
   Open `http://localhost:3000` to access the ObservabilityOS console.

---

## 📦 Ingesting Data

### 1. Ingesting Logs via the SDK

Install the `@repo/sdk` package inside your application:

```typescript
import { Logger } from "@repo/sdk";

const logger = new Logger({
  apiKey: "your_project_api_key",
  endpoint: "http://localhost:3000/api/ingest",
  defaultService: "billing-service",
  defaultEnvironment: "prod",
  batchSize: 10,
  flushIntervalMs: 2000,
});

// Logs are batched and shipped automatically
logger.info("Payment succeeded", { metadata: { transactionId: "tx_12345" } });
logger.error("Database connection refused", { traceId: "tr_abc123" });
```

### 2. Ingesting Metrics via REST API

Ship system metrics (CPU, memory, latency) via a POST request:

```bash
curl -X POST http://localhost:3000/api/metrics/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_project_api_key" \
  -d '{
    "service": "auth-service",
    "environment": "prod",
    "cpuUsage": 12.4,
    "memoryUsage": 512.0,
    "memoryLimit": 2048.0,
    "latencyMs": 42.5
  }'
```

---

## 🧪 Verification & Testing

Verify that all caching, rate limiting, and cascade deletion scripts are fully passing:

```bash
# Run week 9 tests (Saved queries, Exports, Cascade Service deletes, Audits)
npx tsx scratch/test-week-9.ts

# Run week 10 tests (Atlas search fallback, Redis cache, Rate limiters)
npx tsx scratch/test-week-10.ts

# Run typescript compilation across all monorepo apps and packages
yarn check-types
```
