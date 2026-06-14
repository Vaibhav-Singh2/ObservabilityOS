# System Architecture — ObservabilityOS

This document details the software architecture, package relationships, ingestion data pipelines, and anomaly detection loops of ObservabilityOS.

---

## 🏗️ Monorepo Package Topology

ObservabilityOS is managed as a monorepo workspace using **Turborepo**. The codebase separates visual presentation, data schemas, AI logic, and client SDKs into independent, compiled packages to enforce modularity and prevent dependency bloat.

```mermaid
graph TD
    subgraph Applications
        WEB[Next.js App: apps/web]
    end

    subgraph Packages
        DB[Database Connection & Schemas: packages/db]
        AI[AI narratives & summaries: packages/ai]
        SDK[TypeScript Logger SDK: packages/sdk]
        UI[Radix component workspace: packages/ui]
    end

    subgraph Data Stores
        MONGO[(MongoDB Database)]
        REDIS[(Redis Cache / Rate Limiting)]
    end

    WEB --> DB
    WEB --> AI
    WEB --> UI
    SDK --> WEB
    DB --> MONGO
    WEB --> REDIS
```

---

## 📦 System Components & Packages

### 1. apps/web

- The core Next.js application that serves the frontend developer console (`/dashboard`) and REST APIs.
- Houses public telemetry ingestion APIs, GitHub OAuth handlers, payment processing webhooks, and SSE live log streaming channels.
- Configures Redis rate-limiting and JWT user session validation.

### 2. packages/db

- Shared data layer containing Mongoose models and database connection handlers.
- Defines schemas and indexes for: `Project`, `Service`, `Log`, `Incident`, `Metric`, and `AuditLog`.

### 3. packages/ai

- Interfaces with AI models (such as Gemini/Claude/GPT-4) using optimized prompt contexts.
- Formats unstructured log traces and deployment commit messages into readable incident post-mortems.

### 4. packages/sdk

- Zero-dependency client-side Winston/Pino-like logger SDK.
- Integrates a memory-buffered background ring-buffer queue to flush logs asynchronously, preventing request loop blocks in client applications.

---

## 🔌 Telemetry Ingestion Pipeline (Data Flow)

This diagram tracks the lifecycle of a log entry, from the client SDK invocation to persistent storage inside MongoDB, highlighting the local PII scrubbing process:

```mermaid
sequenceDiagram
    autonumber
    participant App as Client Application
    participant SDK as Logger SDK (packages/sdk)
    participant API as Ingestion API (apps/web)
    participant DB as MongoDB (packages/db)

    App->>SDK: logger.info("User login successful", { email })
    Note over SDK: Local Ring-Buffer Queue<br/>PII Scrubbing: email, jwt, authorization redacted
    SDK->>API: POST /api/ingest (Scrubbed Batched Payload)
    Note over API: 1. API Key Authentication<br/>2. Rate-Limiting Check (Redis)
    API->>DB: Log.insertMany(scrubbedLogs)
    DB-->>API: Insertion Verified
    API-->>SDK: Status 200 OK
```

---

## 🚨 Anomaly Detection & AI Post-Mortem Loop

When error rates or response latencies breach statistical baselines, the anomaly loop triggers, diagnosing issues using deployment history and dispatching webhooks:

```mermaid
graph TD
    A[Log Ingested] --> B{Z-Score Anomaly Engine}
    B -- Z-Score < Threshold --> C[Skip. Store Log]
    B -- Z-Score >= Threshold --> D[Flag Anomaly]
    D --> E{Active Cooldown Check}
    E -- Active incident in last 5m --> F[Merge logs to incident]
    E -- No active incident --> G[Trigger AI Diagnosis]

    subgraph AI Pipeline
        G --> H[Fetch surrounding logs & active endpoint metadata]
        H --> I[Fetch GitHub deployment commits & diffs]
        I --> J[Compile prompt context]
        J --> K[Query Gemini/Claude model]
    end

    K --> L[Generate Structured Markdown Post-Mortem]
    L --> M[Save Incident to MongoDB]
    M --> N[Dispatch Slack/Discord Webhook alerts]
```

### Anomaly Z-Score Formula

The statistical anomaly detector calculates standard deviation spikes (Z-score) on historical baselines for error rates, latency, and CPU usage:

$$Z = \frac{x - \mu}{\sigma}$$

Where:

- $x$: Current metric value (e.g. error rate in the last 5 minutes).
- $\mu$: Historical baseline average (mean) over the last 12 windows (60 minutes).
- $\sigma$: Standard deviation of the baseline windows.
- If $Z \geq$ configured threshold (default `3.0`), the system triggers an anomaly alert.

---

## 🔗 Related Documents

- 🔌 **[API.md](API.md)**: Full REST API specs for Ingest, Metrics, and Queries.
- 🗄️ **[DATABASE.md](DATABASE.md)**: Schemas, relationships, indexes, and cache key structures.
- 🛡️ **[SECURITY.md](SECURITY.md)**: Security boundaries and scrubbing regular expressions.
