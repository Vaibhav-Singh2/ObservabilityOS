# Changelog — ObservabilityOS

All notable changes to the ObservabilityOS project are documented here, grouped by release tags.

## [v1.7.0] — AI Incident Diagnostics: Vector RAG & Embeddings Pipeline

### Added

- **Vector RAG Diagnostic Loop**: Integrates a Retrieval-Augmented Generation (RAG) loop to search MongoDB using semantic embeddings and cosine similarity. It retrieves the top 3 similar historical resolved incidents and developer comments to inject as context into the LLM incident diagnosis prompt.
- **Incident Embeddings persisted on Resolution**: The system computes and stores a 1536-dimensional float vector embedding (`embeddings` field on `Incident`) using the `text-embedding-3-small` model upon incident resolution.
- **Deterministic Mock Embedding Fallback**: Implements a zero-dependency, local sin-hash based 1536-dimensional float vector generator for local fallback and offline development when LLM API keys are absent or rate-limit cooldowns are active.
- **Full-Screen Architecture Modal**: Added responsive pan/zoom controls for full-screen architecture diagram viewing in the documentation site.

### Fixed

- **SDK Package License**: Added missing license configuration to `@observability-os/sdk`'s `package.json`, explicitly packaged the `LICENSE` file, and bumped the SDK package version to `0.1.2`.

---

## [v1.6.0] — Blog Overhaul, Yarn Modern, Sentry/PostHog & Observability

### Added

- **Centralized Blog metadata**: Centralized blog posts database (`blog-data.ts` and `blog-code.ts`) with responsive layout hero grid and dynamic category filtering.
- **Sticky Table of Contents & Reading Progress**: Added reading progress bar and Table of Contents sidebar for detailed blog reading experience.
- **Sitemap & SEO Optimization**: Added dynamic blog routes inside sitemap XML configuration and structured JSON-LD schemas.
- **Yarn Modern & Dependencies**: Migrated workspace to Yarn Modern (Yarn 4, v4.16.0) with immutable installs, and added a vulnerability check script.
- **Observability Integrations**: Integrated Sentry (error tracking), PostHog (analytics), and Lighthouse CI.

---

## [v1.5.0] — Billing Overhaul: Self-Host Auto-Detection, Cancel/Restore, Plan Realignment

### Added

- **Self-Host Mode Auto-Detection**: Removed `NEXT_PUBLIC_SELF_HOSTED` env var. The app now auto-detects self-host mode based on Razorpay key presence. When `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are missing, all billing API routes return 404, the billing page redirects to `/dashboard`, and the sidebar "Billing" link is hidden.
- **Subscription Cancel/Restore Flow**: Added `POST /api/billing/cancel` (cancels Razorpay subscription at cycle end, sets `cancelling` status) and `POST /api/billing/restore` (undoes pending cancellation via `cancel_at_cycle_end: false`). Billing UI now includes confirmation modals, cancel/restore buttons, and status badges showing the end date.
- **Data-Driven Landing Page Pricing**: Landing page pricing section now iterates the centralized `PLANS` config instead of hardcoded cards, keeping billing view and marketing page in sync.

### Changed

- **Plan Features Realigned**: Free plan no longer claims gated access to "Multi-channel alerts" or "Audit log trail & team collaboration" — these features work for all tiers. Free plan correctly shows only AI analysis as a gated feature. Pro plan differentiates with "AI-powered anomaly detection" instead of "Multi-signal" (same Z-score engine for all plans).
- **Billing Dead Code Removed**: Cleaned up `BillingView.tsx` (removed header variants, info card, sandbox guards no longer needed).
- **TypeScript Fixes**: Fixed `subscriptionEndsAt` Mongoose type, `cancel_at_cycle_end` cast in Razorpay subscription update, and `Record` cast for billing API routes.

---

## [v1.4.1] — AI Gateway Consolidation & Dynamic Routing

### Added

- **Third-Party AI Gateway Integration**: Added support for the AICredits gateway endpoint (`https://aicredits.in/v1/chat/completions`) as the primary LLM provider.
- **Dynamic Model Selection**: Enabled setting and failing over custom models dynamically via `process.env.AICREDITS_MODEL`, with standard defaults for Claude 3.5 Haiku and GPT-4o mini.
- **Sandbox Protection & Cost Safeguard**: Integrated automatic playground/sandbox detection via `trace_playground_` trace IDs to bypass external LLM calls and fallback directly to Local Mock Heuristics.
- **Plan-based Limit Controls**: Enforced Free Developer plan limits by automatically bypassing live LLM calls and defaulting to Local Mock Heuristics for projects on the free tier.
- **API Health Check Reporting**: Integrated AICredits active status checks inside `/api/health`.

---

## [v1.4.0] — SRE Resilience & Fault Tolerance

### Added

- **Resilience Core Utilities (`resilience.ts`)**: Implemented zero-dependency timeout control, exponential backoff retries with jitter, and a stateful `CircuitBreaker` pattern supporting CLOSED, OPEN, and HALF_OPEN states.
- **Central API Health Route (`/api/health`)**: Created SRE health endpoint returning JSON health status reports for MongoDB, Redis, and configured AI services.
- **React Client Error Boundaries**: Integrated custom error boundary overlays at root and dashboard levels, preventing page blanking and facilitating client-side retries.

### Changed

- **Database Hardening**: Refactored Mongoose connection module to use database connection pooling (`maxPoolSize: 10`, `minPoolSize: 2`), custom connect/socket timeouts, automatic retries, and graceful process shutdown listeners.
- **Redis Failover Layer**: Refactored caching module to monitor connection states and transparently fall back to local in-memory Map cache layers during Redis outages.
- **AI Integration Safeguards**: Configured provider failover chains (Anthropic ➡️ OpenAI ➡️ Mock) wrapped in timeouts and rate limit retries, along with regex JSON validation parsing.
- **Alert Webhook Circuit Breaker**: Wrapped Slack, Discord, and Teams notification calls in circuit breakers to avoid blocking event loops.
- **In-Memory Rate Limiting Fallback**: Modified rate limiting validation to drop to a local in-memory sliding-window token bucket when Redis is down.

---

## [v1.3.0] — Documentation Platform, Licensing & SEO Optimization

### Added

- **Documentation Portal (`apps/docs`)**: Built a standalone statically-rendered Next.js documentation platform with dynamic routing support.

* **Marked Markdown Compiler Link Resolution**: Developed custom marked compiler extensions rewriting relative markdown and licensing references to target web paths or remote GitHub links dynamically.
* **Hybrid Licensing Framework**: Standardized commercial and open-source boundaries, releasing `packages/sdk` under MIT and the core platform (`apps/web`, `apps/worker`) under a custom Source Available license.
* **Advanced SEO / Discoverability**: Programmed sitemap generators, robots configurations, meta metadata, and JSON-LD structured schemas to facilitate search ranking and AI crawler discoverability.
* **Branding Refinements**: Added heartbeat-style favicon, app icons, and OpenGraph/Twitter social media preview visuals for both platforms.

### Fixed

- **Layout Scroll Correction**: Resolved Next.js client-side layout jumping warnings by embedding scroll attributes.
- **Scroll & Navigation Overflows**: Hardened header containment heights, mobile responsiveness layouts, and container scroll containment.

## [v1.2.0] — Security Hardening, Rate Limiting & PII Scrubbing

### Added

- **PII Redaction Scrubber**: Recursive local Winston/Pino logger data scrubbing (`scrubber.ts`) for authorization, tokens, email addresses, credit cards, and MongoDB connection URIs.
- **Redis rate limiter**: sliding-window rate limit configuration on public ingest API paths (`/api/ingest`, `/api/metrics/ingest`).
- **SSE log streaming**: Live stdout/stream logging route (`/api/logs/stream`) with dashboard toggle selectors.
- **SHA-256 API Hashing**: Secured API keys inside MongoDB via SHA-256 validation.

### Changed

- **Centralized Auth**: Consolidated user session loading in `getAuthenticatedUser()` helper function to prevent token redundancy.

---

## [v1.1.0] — UI Refactoring & shadcn UI Integration

### Added

- **shadcn/ui Integration**: Replaced raw HTML/CSS inputs, dropdowns, and button containers with Radix primitives (Button, Card, Switch, Input, Select).
- **Tailwind CSS v4 CSS variables**: Refactored styling tokens into Tailwind CSS variables inside `globals.css`.

---

## [v1.0.0] — Production search indexes, Cache, & Core Ingest

### Added

- **Lucene Full-text Search**: Lucene-backed MongoDB Atlas Search index configuration for rapid log query performance.
- **Redis Metrics Cache**: Caches dashboard aggregates and CPU/RAM/Latency aggregates, invalidating cached data dynamically upon new anomaly detection triggers.

---

## [v0.9.0] — Data Exports, Saved Queries & Audit Trail

### Added

- **Log Exporter**: CSV/JSON download streams on logs queries.
- **Saved Queries**: Custom search console configurations pinned to the dashboard sidebar.
- **Administrative Audit Trail**: Setting console mutation trails capturing SLO deletions and webhook edits.

---

## [v0.8.0] — Incident Collaboration & Post-Mortem Export

### Added

- **Incident Comments**: Threaded commenting on active microservice incident cards.
- **Runbook Links**: Links diagnostic alerts directly to runbooks and troubleshooting checklists.
- **Markdown Post-Mortem Exporter**: One-click markdown export files for incident summaries.

---

## [v0.7.0] — SLO Alerting, Webhooks & Onboarding

### Added

- **SLO budgets**: Dynamic calculations of error budgets entirely within index-based MongoDB counts.
- **Multi-channel Alerts**: Dispatch alerts automatically to Slack, Discord, and Teams webhooks.
- **Onboarding Wizard**: 3-step project onboarding wizard flow.

---

## 🔗 Related Documents

- 🏗️ **[ARCHITECTURE.md](ARCHITECTURE.md)**: Workspace package flow and telemetry pipelines.
- 🗺️ **[ROADMAP.md](ROADMAP.md)**: Planned milestones.
