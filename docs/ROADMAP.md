# Product Roadmap — ObservabilityOS

This document specifies completed features, near-term sprints, and the long-term roadmap for ObservabilityOS.

---

## ✅ Completed Milestones

- **AI incident diagnostics**: Correlates error logs and commit messages to generate structured root-cause summaries.
- **PII Redaction Scrubber**: Recursive local and API data scrubbing to redact sensitive customer keys.
- **Statistical Anomaly Engine**: Rolling standard deviation Z-score calculations on latency and error rate telemetries.
- **Deploy Sync**: Integrates GitHub webhook callbacks to correlate release changes with regression spikes.
- **Elastic Search caching**: Speeds up dashboard aggregates using a Redis caching layer.
- **Lucene Full-text search**: Fast searches using MongoDB Atlas `$search` with a local RegExp query fallback.
- **Multi-channel webhook alerts**: Native notifications to Slack, Discord, and Microsoft Teams.
- **Data exports**: Stream download logs in CSV/JSON format.
- **Administrative Audit Trail**: Setting console mutation trails for compliance.
- **Saved Queries Sidebar**: Extend dashboard settings to allow developers to save queries and pin shortcuts to their sidebar.
- **Automated Morning Digest**: Integrated Resend to email engineers summaries of microservice health and incident alerts.
- **Documentation Platform & SEO**: Separate statically-rendered Next.js documentation platform with dynamic marked link mapping, structured JSON-LD data, and sitemaps/robots configs.
- **Hybrid Licensing Framework**: Core system licensed under Source Available terms and packages/sdk under permissive MIT.

---

## 📅 Short-Term Roadmap (Next 30 Days)

- **Docker Sidecar Agent**: Provide a lightweight Docker sidecar container to tail log files and redirect stdout for non-Node.js systems (Go, Python, Nginx, PostgreSQL).

---

## 🗺️ Medium-Term Roadmap (90 Days)

- **Distributed Tracing (APM)**: Introduce OpenTelemetry-compliant trace correlation support (span mappings, trace visualizations) to identify downstream bottlenecks.
- **Jira & PagerDuty Integrations**: Automatically open Jira tickets or trigger PagerDuty schedules when critical incidents are detected.
- **Custom ML Model Fine-tuning**: Support fine-tuning open-source LLMs (Llama-3) on historical system incidents to generate more accurate, context-aware suggestions.

---

## 🚀 Long-Term Vision (1 Year)

- **Kubernetes Helm Setup**: Release official Helm charts to allow enterprise companies to self-host ObservabilityOS within their private AWS VPC or Google Cloud clusters.
- **SAML SSO & SOC2 Compliance**: Add Okta/ActiveDirectory SAML SSO and SOC2 audit trail exports to unlock enterprise contracts.
- **Custom Dashboard Builder**: Allow developers to drag-and-drop metrics, logs, and custom Z-score check graphs into customized views.

---

## 🔗 Related Documents

- 🏗️ **[ARCHITECTURE.md](ARCHITECTURE.md)**: Current system layout.
- ⚙️ **[INSTALLATION.md](INSTALLATION.md)**: Local and production setup configurations.
- 📜 **[CHANGELOG.md](CHANGELOG.md)**: Release history.
