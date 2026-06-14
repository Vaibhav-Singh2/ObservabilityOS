# Changelog — ObservabilityOS

All notable changes to the ObservabilityOS project are documented here, grouped by release tags.

---

## [v1.2.0] — Security Hardening, Rate Limiting & PII Scrubbing

### Added
* **PII Redaction Scrubber**: Recursive local Winston/Pino logger data scrubbing (`scrubber.ts`) for authorization, tokens, email addresses, credit cards, and MongoDB connection URIs.
* **Redis rate limiter**: sliding-window rate limit configuration on public ingest API paths (`/api/ingest`, `/api/metrics/ingest`).
* **SSE log streaming**: Live stdout/stream logging route (`/api/logs/stream`) with dashboard toggle selectors.
* **SHA-256 API Hashing**: Secured API keys inside MongoDB via SHA-256 validation.

### Changed
* **Centralized Auth**: Consolidated user session loading in `getAuthenticatedUser()` helper function to prevent token redundancy.

---

## [v1.1.0] — UI Refactoring & shadcn UI Integration

### Added
* **shadcn/ui Integration**: Replaced raw HTML/CSS inputs, dropdowns, and button containers with Radix primitives (Button, Card, Switch, Input, Select).
* **Tailwind CSS v4 CSS variables**: Refactored styling tokens into Tailwind CSS variables inside `globals.css`.

---

## [v1.0.0] — Production search indexes, Cache, & Core Ingest

### Added
* **Lucene Full-text Search**: Lucene-backed MongoDB Atlas Search index configuration for rapid log query performance.
* **Redis Metrics Cache**: Caches dashboard aggregates and CPU/RAM/Latency aggregates, invalidating cached data dynamically upon new anomaly detection triggers.

---

## [v0.9.0] — Data Exports, Saved Queries & Audit Trail

### Added
* **Log Exporter**: CSV/JSON download streams on logs queries.
* **Saved Queries**: Custom search console configurations pinned to the dashboard sidebar.
* **Administrative Audit Trail**: Setting console mutation trails capturing SLO deletions and webhook edits.

---

## [v0.8.0] — Incident Collaboration & Post-Mortem Export

### Added
* **Incident Comments**: Threaded commenting on active microservice incident cards.
* **Runbook Links**: Links diagnostic alerts directly to runbooks and troubleshooting checklists.
* **Markdown Post-Mortem Exporter**: One-click markdown export files for incident summaries.

---

## [v0.7.0] — SLO Alerting, Webhooks & Onboarding

### Added
* **SLO budgets**: Dynamic calculations of error budgets entirely within index-based MongoDB counts.
* **Multi-channel Alerts**: Dispatch alerts automatically to Slack, Discord, and Teams webhooks.
* **Onboarding Wizard**: 3-step project onboarding wizard flow.

---

## 🔗 Related Documents
* 🏗️ **[ARCHITECTURE.md](ARCHITECTURE.md)**: Workspace package flow and telemetry pipelines.
* 🗺️ **[ROADMAP.md](ROADMAP.md)**: Planned milestones.
