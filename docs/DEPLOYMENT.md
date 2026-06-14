# Production Deployment Guide — ObservabilityOS

This guide covers deploying ObservabilityOS to production environments using **Vercel** (for the Next.js frontend and API router) and managed database services.

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

## 1. Managed Databases Setup

### MongoDB Atlas
We recommend **MongoDB Atlas** for database hosting to support Lucene-backed full-text search indexes (`$search`):

1. **Create Cluster**: Register on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and spin up a cluster.
2. **Retrieve Connection String**: Copy the connection string:
   `mongodb+srv://<username>:<password>@cluster0.mongodb.net/observability-os`
3. **Whitelist IPs**: In the Atlas panel under *Network Access*, add `0.0.0.0/0` (Allow Access from Anywhere) or add Vercel's IP ranges to permit serverless connections.
4. **Create Search Index**:
   - Go to **Database** $\rightarrow$ **Search**.
   - Create a search index named `default` on the `logs` collection with default JSON options to enable `$search` query routes.

### Managed Redis
Provision a Redis database to handle API rate limiting and aggregates caching:
* **Upstash**: Ideal serverless Redis provider with per-request billing and zero connection pool issues.
* **Redis Labs**: Managed Redis instances.
* Copy the connection URL (`redis://:<password>@host-name.upstash.io:6379`).

---

## 2. Web Application Setup (Vercel)

Deploy the Next.js workspace monorepo directly to **Vercel**:

1. **Import Repository**: Connect your GitHub repository to Vercel.
2. **Configure Project**:
   * *Framework Preset*: Next.js
   * *Root Directory*: `/` (monorepo root)
3. **Build & Development Settings**:
   * *Build Command*: `npx turbo run build --filter=web`
   * *Output Directory*: `apps/web/.next`
   * *Install Command*: `yarn install`
4. **Environment Variables**: Add all mandatory environment variables inside Vercel's *Settings $\rightarrow$ Environment Variables*:
   * `MONGODB_URI`
   * `REDIS_URL`
   * `JWT_SECRET`
   * `GITHUB_CLIENT_ID`
   * `GITHUB_CLIENT_SECRET`
   * `NEXT_PUBLIC_APP_URL`
   * `GEMINI_API_KEY`
5. **Deploy**: Click **Deploy**.

---

## 3. GitHub Application Callback Settings

Ensure your GitHub OAuth settings match your new production domain:

1. Go to **GitHub** $\rightarrow$ **Settings** $\rightarrow$ **Developer settings** $\rightarrow$ **OAuth Apps**.
2. Select your registered app.
3. Update the fields:
   * *Homepage URL*: `https://your-domain.vercel.app`
   * *Authorization callback URL*: `https://your-domain.vercel.app/api/auth/callback`

---

## 4. CI/CD & Verification Pipelines

Before merging feature PRs, run automated verification pipelines using GitHub Actions or your local terminal to guarantee build compliance:

```bash
# Verify TypeScript compile rules across workspaces
yarn check-types

# Verify code formatting and linting rules
yarn lint

# Verify that Next.js successfully compiles and bundles
yarn build
```

---

## 🔗 Related Documents
* ⏱️ **[QUICKSTART.md](QUICKSTART.md)**: Jumpstart guide for local onboarding.
* ⚙️ **[INSTALLATION.md](INSTALLATION.md)**: System specifications and node configurations.
* 🛡️ **[SECURITY.md](SECURITY.md)**: OAuth scopes, rate limit filters, and data scrubbing algorithms.
