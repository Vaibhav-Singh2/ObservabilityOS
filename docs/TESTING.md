# Automated Testing Guide — ObservabilityOS

This guide covers the testing architecture, script commands, memory constraints, and CI/CD validation pipelines for ObservabilityOS.

---

## 🏗️ Testing Architecture

We split our testing suite into distinct layers, allowing rapid local iteration on utility libraries while guaranteeing total contract and E2E system stability.

```text
observabilityos/
├── apps/
│   ├── chaos-simulator/        # Workload and failure generator UI & API
│   └── web/
│       ├── playwright.config.ts        # Playwright E2E configuration
│       ├── e2e/
│       │   └── auth.spec.ts            # Web app user flow specs
│       └── src/
│           ├── app/api/
│           │   ├── ingest/route.test.ts # API contract & ingestion pipeline integration
│           │   └── projects/projects.test.ts # Tenant isolation & auth boundary integration
│           └── lib/
│               ├── scrubber.test.ts     # PII scrubber unit checks
│               ├── crypto.test.ts       # API key secure hashes unit checks
│               ├── rate-limit.test.ts   # Sliding-window rate limit checks
│               ├── quota.test.ts        # Volume & services limits checks
│               ├── anomaly.test.ts      # Statistical anomaly engine checks
│               ├── security.test.ts     # NoSQL injection & RBAC permission checks
│               └── performance.test.ts  # Latitude & write throughput benchmarks
├── packages/
│   ├── sdk/src/index.test.ts           # Logger queueing, flushing, and retry tests
│   ├── ai/src/llm.test.ts              # Circuit breakers, cooldowns, and failover tests
│   └── db/src/
│       ├── connection.test.ts          # MongoDB caching & health check tests
│       └── migrate.test.ts             # Migration pipeline runner tests
└── vitest.config.ts                    # Root-level Vitest config
```

---

## 🏃 Run Test Suites

### 1. Run all tests (Vitest)

Executes all unit, integration, database, and performance benchmarks across packages and applications:

```bash
yarn test
```

### 2. Run with coverage reports

Launches tests and generates a code coverage report under the `coverage/` directory:

```bash
yarn test:coverage
```

### 3. Run individual modules

You can target a specific package or test file directly to skip other suites:

```bash
# Test only the SDK logger
npx vitest run packages/sdk/src/index.test.ts

# Test only the AI subsystem
npx vitest run packages/ai/src/llm.test.ts

# Test only database schemas and connection limits
npx vitest run packages/db/src/connection.test.ts
```

### 4. Run Playwright E2E Tests

Requires starting the local dev server first:

```bash
# Start Next.js local server
yarn dev

# (In a separate terminal) Run E2E specs
npx playwright test
```

---

## ⚡ Memory & Performance Optimization

To prevent V8 worker memory exhaustion (common in monorepos resolving massive workspace symlinks), the root [vitest.config.ts](file:///d:/Projects/ObservabilityOS/vitest.config.ts) is configured to disable file parallelism and process isolation for tests:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    fileParallelism: false,
    isolate: false,
    pool: "forks",
    forks: {
      isolate: false,
    },
  },
});
```

### Local CLI Memory Limit Overrides

If your test runner encounters heap allocation leaks on local development machines, prefix execution commands with Node memory parameters:

```bash
$env:NODE_OPTIONS="--max-old-space-size=4096"; npx vitest run
```

---

## 🤖 CI/CD Integration

All pull requests and commits to the `main` branch are automatically validated in GitHub Actions via [.github/workflows/ci.yml](file:///d:/Projects/ObservabilityOS/.github/workflows/ci.yml).

The pipeline:

1. Provisions temporary **MongoDB** and **Redis** services in Docker containers.
2. Boots code under **Node 20.x (LTS stable)** for robust, memory-safe execution.
3. Enforces formatting (`Prettier`), styles (`ESLint`), and type constraints (`tsc`).
4. Executes all Vitest suites and generates coverage reports.
5. Installs Chromium dependencies and triggers the Playwright E2E browser checks.

---

## ⚡ Chaos and Load Testing (Chaos Simulator)

We maintain a dedicated simulator application at [apps/chaos-simulator](file:///d:/Projects/ObservabilityOS/apps/chaos-simulator) to validate system resilience, statistical anomaly detection, and AI incident generation.

### Triggering Outages & Incidents

1. Boot the platform server (`yarn dev` on `http://localhost:3000`).
2. Boot the simulator:
   ```bash
   yarn --cwd apps/chaos-simulator dev
   ```
3. Navigate to `http://localhost:3005` and verify the sandbox seeding status.
4. Run testing presets (e.g. **Payment Outage**, **Black Friday Traffic**, **Incident Storm**) or manual scenario engines to assert correct pipeline ingestion, Redis invalidations, and AI incident report creations.

> [!NOTE]
> By default, the seeded sandbox project runs on the `free` tier. This automatically bypasses LLM calls and writes incident summaries using local heuristic templates, consuming 0 tokens. To test the full AI incident reasoning pipeline, use the **Use Custom API Key / Endpoints** form in the header to paste the credentials of a project upgraded to a `pro` (or higher) plan.
