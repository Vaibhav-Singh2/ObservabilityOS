# Frequently Asked Questions — ObservabilityOS

This document provides answers to common technical, product, and architectural questions about ObservabilityOS.

---

## 🔌 1. Technical & Integration FAQs

### Q: Is ObservabilityOS compatible with OpenTelemetry?

**Yes.** ObservabilityOS is fully compliant with OpenTelemetry standards. You can configure your existing OpenTelemetry collector agent pipelines to forward JSON payloads directly to our `/api/ingest` HTTP REST routes.

### Q: Do you support languages other than Node.js, Express, and Next.js?

**Yes.** While we provide a zero-dependency npm SDK for JavaScript/TypeScript environments, you can monitor Python, Go, Rust, Java, or Ruby apps by deploying our Docker sidecar agent. The sidecar mounts your container log files, scrubs them locally, and ships them to our Ingestion API.

### Q: How does deploy event tracking work?

We register deploy webhooks from GitHub, GitLab, or Vercel. When a new release deployment completes, we save the event (commit message, author, branch, SHA) in MongoDB. When a latency or error spike is flagged, we overlay the deployment event on your metric timeline to check if the new commit caused the regression.

---

## 🛡️ 2. Security & AI Privacy FAQs

### Q: Is my sensitive log data sent to external AI providers?

**No.** To comply with data privacy policies, we redact sensitive variables locally in the Winston SDK and API gateway before storage. Only metadata schemas, anonymous error types, and deployment contexts are fed to our Claude/GPT-4 prompt templates to diagnose root causes. Your raw client logs never leave your server borders.

### Q: What PII is scrubbed by default?

Our scrubber (`scrubber.ts`) checks text fields and nested JSON key arrays using RegExp patterns. It redacts:

- Email addresses
- JWT session tokens
- Credit card numbers
- Database connection URIs
- HTTP Authorization headers

---

## 🗄️ 3. Database & Cache FAQs

### Q: Why does the codebase fall back to regex search queries locally?

In production environments, we query logs using MongoDB Atlas Search indexes (`$search`), which are powered by Lucene. Since local standalone MongoDB instances (running via Docker Compose) do not support Atlas Search, the API includes a regex fallback query pipeline to allow local testing.

### Q: How does Redis cache invalidation work?

We store service metric aggregates in Redis under `cache:project:<id>:metrics` with a default TTL of 60 seconds. Whenever a new log ingestion anomaly is detected or project settings change, we programmatically call a cache invalidate routine, flushing stale keys to keep dashboard stats synchronized.

---

## 💳 4. Billing & Sandbox FAQs

### Q: Does the sandbox manual billing override modify Razorpay settings?

**No.** The sandbox manual billing route (`POST /api/billing/manual`) bypasses the Razorpay processor completely. It directly mutates the database's `plan` schema value to the requested tier (`free`, `pro`, or `self-host`) for offline developer testing.

### Q: How does subscription cancellation work?

**Cancellation is confirmed and scheduled.** When a user clicks "Cancel Subscription" or "Downgrade to Free", a confirmation modal appears detailing the feature limits they'll lose. On confirm, the app calls `POST /api/billing/cancel`, which:

1. Cancels the Razorpay subscription **at the end of the current billing period** (no immediate feature loss).
2. Sets the subscription status to `cancelling` in the database.
3. Razorpay stops auto-pay — the user will not be charged again.
4. At the end of the billing period, Razorpay sends a `subscription.cancelled` webhook which automatically downgrades the project to the **Free Tier**.

Users can re-subscribe at any time before the billing period ends to retain paid features.

---

## 📜 5. Licensing & Commercial Restrictions FAQs

### Q: Why did ObservabilityOS choose a source-available license?

We wanted to ensure that the code remains fully open and accessible for developers to view, learn from, self-host, and contribute, while protecting our startup from large hosting providers and competitors who might rebrand, monetize, or sell hosted versions of our platform without contributing back.

### Q: Can I self-host ObservabilityOS for internal company projects?

**Yes.** You can fully self-host ObservabilityOS for internal development, staging, production monitoring, and personal side projects. This is permitted under the default source-available license as long as you are not offering the platform itself as a service to third parties.

### Q: Can my company build proprietary products that integrate with the SDK?

**Yes.** The SDK package (`packages/sdk`) is licensed under the permissive **MIT License**. This ensures you can integrate it into your apps, libraries, and microservices without copyleft concerns.

### Q: What is considered a "commercial SaaS or managed service" violation?

You violate the license if you package ObservabilityOS (or modified versions of it) and sell access to the telemetry platform itself as a service to external customers (e.g., offering a hosted dashboard, ingestion endpoints, or root-cause diagnostics as a paid subscription).

### Q: How do I obtain commercial rights or enterprise support?

If you want to bypass the SaaS restrictions, obtain enterprise SLA support, or request custom branding options, please refer to the [COMMERCIAL_LICENSE.md](../COMMERCIAL_LICENSE.md) file or contact sales@observabilityos.com.

---

## 🔗 Related Documents

- 📜 **[LICENSE](../LICENSE)**: ObservabilityOS Source Available License.
- 💳 **[COMMERCIAL_LICENSE.md](../COMMERCIAL_LICENSE.md)**: Commercial licensing options.
- 🛡️ **[SECURITY.md](SECURITY.md)**: Scrubber code details.
- 🗄️ **[DATABASE.md](DATABASE.md)**: MongoDB schemas and index definitions.
- 🛠️ **[DEVELOPMENT.md](DEVELOPMENT.md)**: Sandbox billing override commands.
