# Security Policy & Architecture — ObservabilityOS

This document outlines the security architecture, data scrubbing rules, API key validation, and authentication processes built into ObservabilityOS to protect developer telemetry.

---

## 🛡️ Telemetry Ingestion Security

### 1. API Key Protection (`crypto.ts`)

To protect against database compromises, Project API Keys are not stored in plain-text inside MongoDB.

- Upon project creation, a plain-text API Key is shown to the developer **once**.
- We hash the key using **SHA-256** and store only the hashed signature in the database:
  $$\text{HashedKey} = \text{SHA-256}(\text{ApiKey})$$
- Incoming requests pass their plain-text key in the `x-api-key` header. The server hashes the incoming key and matches it against the database index, ensuring $O(1)$ validation speed.

### 2. Redis-Based Rate Limiting

To defend ingestion API endpoints against denial-of-service (DoS) attacks, we implement a sliding-window rate limiter powered by Redis sorted sets (ZSET):

- Public endpoints (`/api/ingest`, `/api/metrics/ingest`) verify key quotas over a rolling window (e.g. max 100 requests per minute).
- Requests exceeding the window rate quota are blocked with a `429 Too Many Requests` status.

---

## 🧹 Telemetry PII Scrubbing Engine (`scrubber.ts`)

A key security feature is our recursive PII scrubbing engine. The client-side Winston SDK and REST API scrub sensitive credentials _before_ telemetry is saved to MongoDB.

### Redaction Regular Expressions

We use highly optimized RegExp definitions to scan log message strings:

| Target PII       | Regular Expression Pattern                                                                  | Redaction Output      |
| :--------------- | :------------------------------------------------------------------------------------------ | :-------------------- |
| **Emails**       | `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g`                                         | `[EMAIL_REDACTED]`    |
| **JWTs**         | `/eyJhbGciOi[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g`                        | `[JWT_REDACTED]`      |
| **Credit Cards** | `/\b(?:4[0-9]{12}(?:[0-9]{3})?\|5[1-5][0-9]{14}\|6(?:011\|5[0-9]{12})\|3[47][0-9]{13})\b/g` | `[CARD_REDACTED]`     |
| **DB URIs**      | `/(mongodb(?:\+srv)?\|postgres(?:ql)?\|mysql\|redis):\/\/[^:]+:([^@]+)@/gi`                 | `[PASSWORD_REDACTED]` |
| **Auth Headers** | `/(Bearer\s+\|Basic\s+\|Token\s+)[A-Za-z0-9-_=.]+/gi`                                       | `[TOKEN_REDACTED]`    |

### Metadata Key Redaction

In addition to log messages, JSON metadata objects are parsed recursively. If any key name matches the sensitive keys list, its value is redacted entirely:

- **Sensitive keys list**: `password`, `secret`, `client_secret`, `token`, `api_key`, `cvv`, `ssn`, `card`, `cc`, `cvv`, `authorization`.

---

## 🔑 User Authentication & Session Management

- **Authentication Provider**: We use **GitHub OAuth** to register and sign in users. We request the minimum user profile scopes (`read:user`, `user:email`).
- **Session Cookies**:
  - User sessions are signed with **JWTs** (`jsonwebtoken` package) using your `JWT_SECRET`.
  - Cookies are stored with the `HttpOnly`, `Secure` (in production), and `SameSite=Lax` flags, preventing cross-site scripting (XSS) and cross-site request forgery (CSRF) token hijacking.

---

## 🔗 Related Documents

- 🏗️ **[ARCHITECTURE.md](ARCHITECTURE.md)**: Data processing paths.
- 🔌 **[API.md](API.md)**: Ingestion endpoints details.
- 🛠️ **[DEVELOPMENT.md](DEVELOPMENT.md)**: Verification sandbox billing bypasses.
