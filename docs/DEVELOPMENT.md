# Local Development Guide — ObservabilityOS

This guide covers local code compilation, workspace script commands, test suites, and debugging tools.

---

## 🏃 Running the Workspace Locally

Follow these steps to run a local development workspace:

1. **Verify Infrastructure**: Ensure Docker containers are running:

   ```bash
   docker ps
   ```

   _Should show active instances of MongoDB (port 27017) and Redis (port 6379)._

2. **Clean build files**: If you encounter dependency cache issues, run:

   ```bash
   # Remove all built files, node_modules, and cache files
   yarn clean
   ```

3. **Install dependencies**:

   ```bash
   yarn install
   ```

4. **Build Packages**: Compile the shared monorepo packages (`packages/db`, `packages/ai`, `packages/sdk`, `packages/ui`):

   ```bash
   yarn build
   ```

5. **Start Dev Workspace**: Start live compilation and hot-reloading for the Next.js console:

   ```bash
   yarn dev
   ```

   _Dev server binds to `http://localhost:3000`._

6. **Start Chaos Simulator (Optional)**: Start the telemetry workload and failure generator:
   ```bash
   yarn --cwd apps/chaos-simulator dev
   ```
   _Simulator binds to `http://localhost:3005`._

---

## 🧪 Running Validation & Verification Scripts

We maintain week-by-week verification scripts in the [scratch/](../scratch/) directory to test database connections, full-text searches, and cache invalidation.

```bash
# Run week 9 tests (Saved queries, CSV exports, Cascade microservice deletion, Audit logs)
npx tsx scratch/test-week-9.ts

# Run week 10 tests (Atlas Search fallbacks, Redis caching, Rate-limit middlewares)
npx tsx scratch/test-week-10.ts

# Run billing flow tests (Cancel, restore, self-host auto-detection)
npx tsx scratch/test-billing-flows.ts
```

### TypeScript Validation

Run strict type checking across all monorepo directories:

```bash
yarn check-types
```

---

## 🛠️ Workspace Commands Reference

The root `package.json` maps script operations across individual workspaces via Turborepo:

- `yarn dev`: Launches Next.js hot-reload dev servers.
- `yarn build`: Compiles all packages and Next.js static pages for production.
- `yarn lint`: Runs ESLint analysis across applications.
- `yarn lint:fix`: Automatically fixes ESLint styling warnings.
- `yarn check-types`: Compiles code files without writing outputs to find syntax type mismatches.
- `yarn test`: Runs the Vitest unit, integration, database, performance, and security test suites.
- `yarn test:coverage`: Executes Vitest tests and generates coverage reports.

For a detailed walkthrough of our automated testing architecture, refer to the **[TESTING.md](TESTING.md)** guide.

---

## 🐞 Debugging Telemetry & APIs

### 1. Local Ingestion Testing

You can manually test local log ingestion endpoints without booting the Winston SDK by sending a cURL POST:

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_sandbox_api_key" \
  -d '{
    "service": "billing-service",
    "environment": "dev",
    "level": "error",
    "message": "Payment failed: Stripe checkout session timeout",
    "metadata": {
      "transactionId": "tx_99812",
      "currency": "INR",
      "amount": 2499
    }
  }'
```

### 2. Self-Host Plan: Billing Disabled

When a project is on the `self-host` plan, the billing page redirects to `/dashboard`, the sidebar "Billing" link is hidden, and all billing API routes return 404. All features are unlocked without any subscription or payment.

**Self-host mode is auto-detected**: if `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are not set (or commented out), the app automatically runs in self-host mode. This:

- Auto-upgrades all projects to the `self-host` plan (unlimited services, logs, retention).
- Hides the billing UI, sidebar "Billing" link, and all billing API routes (return 404).
- Is the default behavior when running locally without Razorpay credentials.

To enable Cloud Mode (billing UI, plan limits), uncomment the Razorpay keys in your `.env` file.

### 3. Sandbox Billing Toggles

Our local environment includes a developer sandbox bypass card located on the Billing Management page.

- You can click any of the tier buttons (**Set to free**, **pro**, or **self-host**) to instantly trigger database plan overrides.
- This calls `POST /api/billing/manual`, bypassing external payment processor keys (Razorpay) for frictionless offline testing.

### 4. Cancel / Downgrade Subscription Flow

Production users can cancel their Razorpay subscription or downgrade to the Free Tier from the Billing Management page:

- **"Cancel Subscription"** button — shown in the plan status card when the user has an active Razorpay subscription.
- **"Downgrade to Free"** button — shown on the Free plan card when the user is on a paid plan.

Both actions open a **confirmation modal** that clearly warns about feature loss (service limit, log volume, retention, alerts) and confirms auto-pay will be stopped. The user can confirm or keep their plan.

On confirm, the frontend calls `POST /api/billing/cancel`, which:

1. Calls `razorpay.subscriptions.cancel(id, true)` to cancel the Razorpay subscription **at the end of the current billing period** (customer retains paid features until then).
2. Sets `subscriptionStatus: "cancelling"` in MongoDB — the plan remains unchanged.
3. When the billing period ends, Razorpay sends a `subscription.cancelled` webhook, which the webhook handler catches and downgrades the project to `free`.

If the user changes their mind before the cycle ends, they can click **"Undo Cancel"** to restore the subscription via `POST /api/billing/restore`.

If no Razorpay keys are configured (self-host mode), the cancel, restore, and checkout API routes all return 404 — billing is fully disabled. Use the sandbox manual billing override (`POST /api/billing/manual`) to change plans locally for testing.

### 5. Redis Invalidation Monitoring

If your dashboard cache is out of sync, you can flush local cache entries manually using Redis-CLI:

```bash
docker exec -it <redis-container-id> redis-cli flushall
```

The codebase invalidates Redis cache keys dynamically upon new log ingestion anomalies or microservice state updates (refer to the cache schema details in **[DATABASE.md](DATABASE.md)**).

---

## ⚡ Chaos Simulator & Local Load Injection

To test SRE resilience features (such as cache invalidations, circuit breakers, rate-limiting, and AI diagnostic failovers), you can run the Chaos Simulator:

```bash
yarn --cwd apps/chaos-simulator dev
```

The simulator binds to `http://localhost:3005`. It offers a dashboard UI containing several outage simulation presets:

1. **Stripe Timeout Outage**: Seeds logs with high latency and database network failures. Tests if the Z-Score engine detects standard-deviation anomaly spikes and compiles AI incident summaries.
2. **Black Friday Peak Traffic**: Injects sudden spikes in log ingestion rates, verifying if the Redis sliding-window rate limiters trigger `429 Too Many Requests` correctly.
3. **AI Provider Failure Loop**: Tripps the outbound LLM circuit breaker (`SimpleCircuitBreaker` inside `packages/ai`) to verify that the system gracefully falls back to direct OpenAI, direct Anthropic, or local heuristics.
4. **Plan Limit Bypasses**: Simulates logging under `free` plan tiers to assert that live API credits are not consumed and local mock summaries are loaded instead.
