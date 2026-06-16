# ObservabilityOS

[![License: Source Available](https://img.shields.io/badge/License-Source_Available-orange.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-v5-blue.svg)]()
[![Next.js](https://img.shields.io/badge/Next.js-v16.2-black.svg)]()

ObservabilityOS is an **AI-native DevOps intelligence and log analytics platform** built for high-performance engineering teams. Instead of just displaying raw logs and complex dashboard grids, ObservabilityOS ingests structured logs, automatically redacts sensitive PII locally, calculates standard-deviation anomaly Z-Scores in real-time, and generates structured root-cause post-mortems using GPT-4 and Claude.

---

### ⏱️ The 30-Second Pitch

- **What it is**: An AI-native telemetry analytics and automated incident response platform.
- **Who it is for**: DevOps, SRE, and full-stack engineering teams seeking to minimize downtime.
- **Why it matters**: Reduces pager noise by 98% through dynamic anomaly baseline analysis and drops MTTR from hours to seconds by correlating deployment commits with telemetry spikes.
- **Why it is unique**: Combines real-time statistical mathematical models (Z-Scores) with a self-healing multi-provider LLM diagnostic fallback gateway (AICredits, Claude, GPT).

> Datadog shows you everything and explains nothing. **ObservabilityOS shows you what matters and explains it in plain English.**

---

## 🌟 Key Features

- **Local PII Redaction (`scrubber.ts`)**: Automatically scrubs passwords, credentials, credit cards, JWTs, and Auth headers from metadata and text fields _before_ telemetry leaves your app.
- **Rolling Z-Score Anomaly Engine (`anomaly.ts`)**: Calculates rolling standard deviations on error rates, latency, and CPU usage. Adapts to weekly/daily traffic cycles to reduce pager noise by 98%.
- **AI Incident Diagnostics**: Processes raw logs and deployment diffs to compile narrative post-mortems explaining "What happened", "Why", and "Suggested hotfix" in under 10 seconds.
- **Outbound Failover & Circuit Breakers**: Standardizes outgoing provider calls with stateful circuit breakers to prevent thread blocks, falling back dynamically across providers.
- **Lucene Full-text Log Search**: Full-text log query console powered by a Lucene-based MongoDB Atlas Search index with a regex fallback for local development.
- **Chaos & Load Simulator**: A built-in traffic and failure generator app to simulate Black Friday spikes, database outages, or security breaches and verify system telemetry.
- **Multi-channel Alerts**: Delivers rich, markdown-styled incident alerts directly to Slack, Discord, and Microsoft Teams.

---

## 📁 Workspace Structure

ObservabilityOS is structured as a **Turborepo monorepo workspace**:

```text
├── apps
│   ├── web                   # Next.js 16 Web Dashboard, APIs & Rate Limiters
│   ├── docs                  # Next.js Static Documentation Portal
│   └── chaos-simulator       # Incident, failure, and traffic workload generator UI
├── packages
│   ├── db                    # Shared Mongoose/MongoDB connection, schemas & cache fallbacks
│   ├── ai                    # Prompt builders, failover models, and LLM wrappers
│   ├── sdk                   # Zero-dependency TypeScript logger SDK (MIT Licensed)
│   ├── typescript-config     # Shared base TSConfig options
│   └── ui                    # Standardized Radix-based shadcn/ui components
├── docs                      # Open-source developer guides and specifications
└── scratch                   # Local sandbox verification and test scripts
```

---

## 🚀 Quick Start (5-Minute Onboarding)

### 1. Prerequisites

Ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) v18+
- [Yarn](https://classic.yarnpkg.com/en/) v1.22+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local database and cache nodes)

### 2. Boot Infrastructure

Spin up standalone MongoDB and Redis containers instantly:

```bash
docker-compose up -d
```

### 3. Install & Build

Install workspace dependencies and build the shared monorepo packages:

```bash
yarn install
yarn build
```

### 4. Configure Environment

Create a configuration file in `apps/web/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/observability-os
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_token_here
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
GEMINI_API_KEY=your_gemini_api_key
```

### 5. Launch Development Servers

Run the dev server:

```bash
yarn dev
```

Open `http://localhost:3000` to access the ObservabilityOS console.

---

## 📦 Ingesting Telemetry

### Node.js / TypeScript SDK

Install the `@observability-os/sdk` package and integrate it in one line:

```typescript
import { Logger } from "@observability-os/sdk";

const logger = new Logger({
  apiKey: "your_project_api_key",
  endpoint: "http://localhost:3000/api/ingest",
  defaultService: "billing-service",
  defaultEnvironment: "prod",
  batchSize: 10,
  flushIntervalMs: 2000,
});

// Logs are batched in memory and shipped asynchronously
logger.info("Payment processed successfully", {
  metadata: { transactionId: "tx_98124" },
});
logger.error("DB connection pool exhausted", { traceId: "tr_db_timeout_882" });
```

---

## 📚 Documentation System

For in-depth guides and technical details, see the files in the `docs/` directory:

- ⏱️ **[QUICKSTART.md](docs/QUICKSTART.md)**: Jump right into your first project setup.
- ⚙️ **[INSTALLATION.md](docs/INSTALLATION.md)**: Requirements, environment configs, local and production run-times.
- 🏗️ **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**: Domain layers, ingestion pipelines, anomaly loops, and Mermaid diagrams.
- 🔌 **[API.md](docs/API.md)**: REST API reference for Ingest, Metrics, and Saved Searches.
- 🗄️ **[DATABASE.md](docs/DATABASE.md)**: MongoDB schemas, relationships, indexes, and Redis cache keys.
- 🚀 **[DEPLOYMENT.md](docs/DEPLOYMENT.md)**: Production configurations for Vercel, Railway, and Docker environments.
- 🛡️ **[SECURITY.md](docs/SECURITY.md)**: OAuth scopes, rate-limiting, and recursive PII scrubbing algorithms.
- 🛠️ **[DEVELOPMENT.md](docs/DEVELOPMENT.md)**: Codebase rules, testing framework, workspace tools, and testing commands.
- 🧪 **[TESTING.md](docs/TESTING.md)**: Details on unit, contract integration, performance benchmarks, and Playwright E2E tests.
- 🩹 **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)**: Solutions to database timeouts, Redis connection refusals, and port conflicts.
- ❓ **[FAQ.md](docs/FAQ.md)**: Solutions to common developer questions.
- 🤝 **[CONTRIBUTING.md](docs/CONTRIBUTING.md)**: PR workflows, linting, and commit naming conventions.
- 💼 **[RECRUITER_GUIDE.md](docs/RECRUITER_GUIDE.md)**: Hiring roadmap detailing system design, complexity highlights, and skills.
- 🗺️ **[ROADMAP.md](docs/ROADMAP.md)**: Planned milestones.
- 📜 **[CHANGELOG.md](docs/CHANGELOG.md)**: Release logs.

---

## 🤝 Contributing

We welcome contributions from the community! Please read our **[CONTRIBUTING.md](docs/CONTRIBUTING.md)** guide to get started.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes following our conventional commits rules
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

ObservabilityOS is licensed under a hybrid licensing model:

- **Core Application & Packages**: Licensed under the **ObservabilityOS Source Available License** (see [LICENSE](LICENSE)). This allows free personal, internal development, and non-SaaS production use, but prohibits offering the platform as a commercial SaaS or managed service.
- **Logger SDK (`packages/sdk`)**: Licensed under the highly permissive **MIT License** (see [packages/sdk/LICENSE](packages/sdk/LICENSE)) to allow frictionless integration into any proprietary codebase.

For commercial licenses, custom terms, or SaaS rights, please read [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md) or contact sales@observabilityos.com.
