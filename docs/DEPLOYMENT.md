# Production Deployment Guide — ObservabilityOS

> ⚠️ **License Restriction**
>
> ObservabilityOS is released under a **source-available license** (see [`LICENSE`](../LICENSE)). You are free to self-host, modify, and use the platform for **internal company projects, personal use, and development**. However, you may **not** offer ObservabilityOS (or modified versions of it) as a **commercial SaaS or managed service** to third parties. This includes, but is not limited to, selling access to the hosted dashboard, ingestion endpoints, or root-cause diagnostics as a paid subscription. Contact `support@observabilityos.in` for commercial licensing if needed.

This guide covers deploying ObservabilityOS to production environments using **Vercel** (for the Next.js frontend and API router), **Docker** (for self-hosted deployments), and managed database services.

---

## 🌐 Production Architecture

In production, we decouple the web dashboard from data storage and caching to achieve optimal scaling and isolation:

```text
               ┌───────────────────────────────┐
               │    Vercel: apps/web (Next.js)  │
               └───────────────┬───────────────┘
                                │
               ┌───────────────┴───────────────┐
               ▼                               ▼
     ┌──────────────────┐            ┌──────────────────┐
     │  MongoDB Atlas   │            │   Managed Redis  │
     │  (Data Storage)  │            │ (Cache/RateLimit)│
     └──────────────────┘            └──────────────────┘
```

---

## 📦 Monorepo Dependency Graph

Understanding the inter-package dependencies is critical for correct deployment. This monorepo (Turborepo) has the following build dependency chain:

```text
@repo/typescript-config ─┬──> @repo/ai ─┐
                         ├──> @repo/db ─┤
                         └──> @repo/ui ─┤
@repo/eslint-config (devDependency)     │
                                         ├──> apps/web (Next.js)
                                         ├──> apps/chaos-simulator (Next.js)
```

The `turbo.json` file defines the build execution order:

```json
"build": {
  "dependsOn": ["^build"],
  "inputs": ["$TURBO_DEFAULT$", ".env*"],
  "outputs": [".next/**", "!.next/cache/**"]
}
```

Next.js standalone mode is configured conditionally in `apps/web/next.config.ts` — set `DOCKER_BUILD=true` to enable `output: "standalone"`. This keeps `yarn start` working normally outside Docker.

---

## 1. Managed Databases Setup

### MongoDB Atlas

We recommend **MongoDB Atlas** for database hosting to support Lucene-backed full-text search indexes (`$search`):

1. **Create Cluster**: Register on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and spin up a cluster.
2. **Retrieve Connection String**: Copy the connection string.
3. **Whitelist IPs**: In the Atlas panel under _Network Access_, add `0.0.0.0/0` (Allow Access from Anywhere).
4. **Create Search Index**:
   - Go to **Database** → **Search**.
   - Create a search index named `default` on the `logs` collection with default JSON options to enable `$search` query routes.

### Managed Redis

Provision a Redis database to handle API rate limiting and aggregates caching (e.g. Upstash). Copy the connection URL (`redis://...`).

---

## 2. Deploying to Vercel

Vercel has first-class support for **Turborepo** monorepos.

### Project Configuration in Vercel

| Setting              | Value                             | Notes                                                          |
| -------------------- | --------------------------------- | -------------------------------------------------------------- |
| **Root Directory**   | `/`                               | Monorepo root (Vercel needs access to `packages/` and `apps/`) |
| **Framework Preset** | Next.js                           | Auto-detected                                                  |
| **Build Command**    | `npx turbo build --filter=web...` | The `...` suffix includes **all** upstream dependencies        |
| **Output Directory** | `apps/web/.next`                  | Auto-detected                                                  |
| **Install Command**  | `yarn install --immutable`        | Yarn v4 equivalent of `--frozen-lockfile`                      |

### Environment Variables

Add all mandatory environment variables inside Vercel's _Settings → Environment Variables_:

- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `AICREDITS_API_KEY` (optional, for primary LLM diagnoses and embeddings RAG search)
- `AICREDITS_MODEL` (optional, target model override, e.g., `anthropic/claude-3-5-haiku-20241022`)
- `OPENAI_API_KEY` (optional, direct OpenAI provider fallback)
- `ANTHROPIC_API_KEY` (optional, direct Anthropic provider fallback)

---

## 3. Deploying with Docker (Self-Hosted)

A production-ready multi-stage `Dockerfile` and `.dockerignore` are pre-configured at the **monorepo root**.

### Build & Run

To build the standalone image and run it locally or inside your private cloud:

```bash
# Build the Docker image from the root directory
docker build -t observability-os-web .

# Run the container exposing port 3000
docker run -p 3000:3000 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e REDIS_URL="redis://..." \
  -e JWT_SECRET="your-secret" \
  observability-os-web
```

### Docker Compose

Your existing `docker-compose.yml` can run database services, and you can add the web container directly:

```yaml
version: "3.8"
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. GitHub Application Settings

Ensure your GitHub OAuth settings match your new production domain:

1. Go to **GitHub** → **Settings** → **Developer settings** → **OAuth Apps**.
2. Update the fields:
   - _Homepage URL_: `https://your-domain.vercel.app`
   - _Authorization callback URL_: `https://your-domain.vercel.app/api/auth/callback`

---

## 5. CI/CD & Verification Pipelines

The project features a pre-configured GitHub Actions validation pipeline in **`.github/workflows/ci.yml`**. It automatically runs checks (compilations, lints, builds, unit/db tests, and Playwright E2E tests) on every push or pull request to `main`.

You can also run verification checks locally:

```bash
# Verify TypeScript compile rules across workspaces
yarn check-types

# Verify code formatting and linting rules
yarn lint

# Verify that all workspaces build successfully
yarn build
```

---

## 🔗 Related Documents

- ⏱️ **[QUICKSTART.md](QUICKSTART.md)**: Jumpstart guide for local onboarding.
- ⚙️ **[INSTALLATION.md](INSTALLATION.md)**: System specifications and node configurations.
- 🛡️ **[SECURITY.md](SECURITY.md)**: OAuth scopes, rate limit filters, and data scrubbing algorithms.
- 📐 **[ARCHITECTURE.md](ARCHITECTURE.md)**: System architecture and design decisions.
