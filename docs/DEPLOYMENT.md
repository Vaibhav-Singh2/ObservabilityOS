# Production Deployment Guide — ObservabilityOS

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

**How this affects deployment:**

| Workspace                 | Builds To                   | Requires Pre-build                  | Notes                             |
| ------------------------- | --------------------------- | ----------------------------------- | --------------------------------- |
| `@repo/typescript-config` | Shared config (no build)    | —                                   | Used at compile time only         |
| `@repo/eslint-config`     | Shared config (no build)    | —                                   | devDependency                     |
| `@repo/ai`                | `./dist/` (via `tsc`)       | `typescript-config`                 | Must be built before web          |
| `@repo/db`                | `./dist/` (via `tsc`)       | `typescript-config`                 | Must be built before web          |
| `@observability-os/sdk`   | `./dist/` (via `tsc`)       | `typescript-config`                 | Must be built before web          |
| `@repo/ui`                | Raw TSX (no build step)     | —                                   | Next.js compiles it at build time |
| `apps/web`                | `.next/` (via `next build`) | All `@repo/*` packages              | Primary deployment target         |
| `apps/chaos-simulator`    | `.next/` (via `next build`) | `@repo/db`, `@observability-os/sdk` | Separate deployable app           |

The `turbo.json` file defines the build execution order:

```json
"build": {
  "dependsOn": ["^build"],
  "inputs": ["$TURBO_DEFAULT$", ".env*"],
  "outputs": [".next/**", "!.next/cache/**"]
}
```

The `"dependsOn": ["^build"]` directive tells Turborepo to build all upstream workspace dependencies **before** building the app that depends on them. This is the core mechanism that makes monorepo deployment work correctly.

---

## 1. Managed Databases Setup

### MongoDB Atlas

We recommend **MongoDB Atlas** for database hosting to support Lucene-backed full-text search indexes (`$search`):

1. **Create Cluster**: Register on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and spin up a cluster.
2. **Retrieve Connection String**: Copy the connection string:
   `mongodb+srv://<username>:<password>@cluster0.mongodb.net/observability-os`
3. **Whitelist IPs**: In the Atlas panel under _Network Access_, add `0.0.0.0/0` (Allow Access from Anywhere) or add Vercel's IP ranges to permit serverless connections.
4. **Create Search Index**:
   - Go to **Database** → **Search**.
   - Create a search index named `default` on the `logs` collection with default JSON options to enable `$search` query routes.

### Managed Redis

Provision a Redis database to handle API rate limiting and aggregates caching:

- **Upstash**: Ideal serverless Redis provider with per-request billing and zero connection pool issues.
- **Redis Labs**: Managed Redis instances.
- Copy the connection URL (`redis://:<password>@host-name.upstash.io:6379`).

---

## 2. Deploying to Vercel

Vercel has first-class support for **Turborepo** monorepos. It automatically detects the monorepo structure and the `.next` output directory.

### Project Configuration in Vercel

| Setting              | Value                             | Notes                                                          |
| -------------------- | --------------------------------- | -------------------------------------------------------------- |
| **Root Directory**   | `/`                               | Monorepo root (Vercel needs access to `packages/` and `apps/`) |
| **Framework Preset** | Next.js                           | Auto-detected from `apps/web/next.config.ts`                   |
| **Build Command**    | `npx turbo build --filter=web...` | The `...` suffix includes **all** upstream dependencies        |
| **Output Directory** | `apps/web/.next`                  | Auto-detected                                                  |
| **Install Command**  | `yarn install --immutable`        | Yarn v4 equivalent of `--frozen-lockfile`                      |

### ⚠️ Critical Setting: The `--filter` Suffix

The difference between `--filter=web` and `--filter=web...` is crucial:

| Command                           | Behavior                                                                                | When to Use                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npx turbo build --filter=web`    | Builds **only** the `web` app                                                           | Only if all `@repo/*` packages are already built in the same environment |
| `npx turbo build --filter=web...` | Builds `web` **and all** of its dependencies (`@repo/ai`, `@repo/db`, `@repo/ui`, etc.) | **Always use this** for fresh deployments                                |

**The `...` suffix** means "include the workspace and all of its upstream dependencies." This is the correct choice for Vercel because the build environment starts from scratch — the dependency packages need to be compiled before the Next.js app can import them.

### Vercel Monorepo Setting

In your Vercel project settings under **Build & Development Settings**, ensure you enable:

- **Include source files outside of the Root Directory** — ON

This setting tells Vercel to watch and include files from `packages/*` and other directories outside the root, which is required for the Turborepo build cache to work correctly.

### Step-by-Step Setup

#### Step 1 — Import Repository

Connect your GitHub repository to Vercel.

#### Step 2 — Configure Root Directory

Vercel will ask **"What is your Root Directory?"** — this determines where Vercel looks for the framework configuration (`package.json`, `next.config.ts`, `turbo.json`, etc.).

| Option                    | Action                                               |
| ------------------------- | ---------------------------------------------------- |
| Auto-detected directories | Ignore these (they may show `apps/web` as an option) |
| **Select "Other"**        | ✅ **Choose this**                                   |
| Then enter                | `/` (just the slash character)                       |

> ⚠️ **Do not** select `apps/web` as the root directory. If you set root to `apps/web`, Vercel will not be able to access `packages/` or `turbo.json`, causing the build to fail with "cannot find @repo/\*" errors.

Setting root to `/` tells Vercel: "The monorepo root is the project root, and the Next.js app lives inside `apps/web`."

#### Step 3 — Framework Settings

After setting the root directory, Vercel will show the **Framework** section with these fields. Configure them exactly as below:

| Setting                 | Value                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| **Framework Preset**    | `Next.js` (Vercel auto-detects this once root is set to `/`)     |
| **Build Command**       | `npx turbo build --filter=web...`                                |
| **Output Directory**    | `apps/web/.next` (usually auto-detected)                         |
| **Install Command**     | `yarn install --immutable`                                       |
| **Development Command** | Leave empty (or `next dev` if required — not used in production) |

**Explanation of each field:**

- **Framework Preset** — Vercel uses this to know the framework conventions. Set to `Next.js`.
- **Build Command** — What Vercel runs to produce the production build. The `--filter=web...` (with three dots) tells Turborepo to build `web` and all its `@repo/*` dependency packages in the correct order.
- **Output Directory** — Where the built files will be located. Next.js outputs to `apps/web/.next` by default. Vercel should auto-detect this once root is `/`.
- **Install Command** — How to install dependencies. `yarn install --immutable` ensures the exact versions from `yarn.lock` are used (Yarn v4 equivalent of the old `--frozen-lockfile` flag). See the **Yarn v4 on Vercel** note below for the required companion setting.
- **Development Command** — The command used for local development preview on Vercel (not needed for production deployment; can be left blank).

> **❗ Yarn v4 on Vercel — Choose One of Two Options**
>
> This project uses **Yarn v4** (`"packageManager": "yarn@4.16.0"`) but Vercel's default build image ships with **Yarn v1**. If you run `yarn install --immutable` without telling Vercel to use Yarn v4, it will run Yarn v1 and fail because the lockfile is in Yarn v4 format.
>
> Vercel offers two ways to make it use Yarn 4:
>
> **Option A: Enable Corepack (Recommended — no extra files)**
>
> Add this **Environment Variable** in Vercel project _Settings → Environment Variables_:
>
> | Key                            | Value |
> | ------------------------------ | ----- |
> | `ENABLE_EXPERIMENTAL_COREPACK` | `1`   |
>
> Corepack reads the `"packageManager"` field in `package.json` and automatically downloads and uses the correct Yarn version (v4.16.0). This requires no changes to the repository.
>
> **Option B: Commit the Yarn v4 binary to `.yarn/releases/`**
>
> Run this command locally once to download the Yarn v4 binary and commit it:
>
> ```bash
> yarn set version 4.16.0 --yarn-path
> ```
>
> This creates `.yarn/releases/yarn-4.16.0.cjs` and updates `.yarnrc.yml`. Commit both files:
>
> ```bash
> git add .yarn/releases/yarn-4.16.0.cjs .yarnrc.yml
> git commit -m "chore: commit Yarn v4 binary for Vercel detection"
> ```
>
> Vercel detects the `.yarn/releases/` directory and automatically uses the bundled Yarn v4 instead of the default Yarn v1.
>
> **Without one of these two options, the build will fail with:**
>
> ```
> error Your lockfile needs to be updated, but yarn was run with `--frozen-lockfile`.
> ```
>
> (or `error --immutable` with Yarn v1 trying to read a Yarn v4 lockfile).

#### Step 4 — Environment Variables

Add all mandatory environment variables inside Vercel's _Settings → Environment Variables_:

- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `GEMINI_API_KEY`

#### Step 5 — Deploy

Click **Deploy**.

### Turborepo Remote Caching (Optional)

To speed up builds across team members and CI:

1. Set up [Vercel Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) for Turborepo.
2. Add to Vercel environment variables:
   - `TURBO_TOKEN` — Your Vercel access token
   - `TURBO_TEAM` — Your Vercel team slug
3. Turborepo will automatically upload and download build artifacts, skipping recompilation of unchanged packages.

---

## 3. Vercel Configuration Reference

### `turbo.json` — Build Outputs

The `outputs` field tells Turborepo which files are cacheable:

```json
"outputs": [".next/**", "!.next/cache/**"]
```

- `.next/**` — All Next.js build output
- `!.next/cache/**` — Excludes the Next.js build cache (it's large and not needed remotely)

### Package-Specific Build Behavior

Your `@repo` packages have different build requirements:

| Package                   | Package.json `main` / `exports` | Needs Build? | Deployment Impact                                                           |
| ------------------------- | ------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `@repo/ai`                | `./dist/index.js`               | ✅ Yes (tsc) | Turborepo builds this before web                                            |
| `@repo/db`                | `./dist/index.js`               | ✅ Yes (tsc) | Turborepo builds this before web                                            |
| `@observability-os/sdk`   | `./dist/index.js`               | ✅ Yes (tsc) | Turborepo builds this before web                                            |
| `@repo/ui`                | `./src/*.tsx` (raw source)      | ❌ No        | Next.js compiles TSX directly at build time; Turborepo treats it as a no-op |
| `@repo/typescript-config` | Config files only               | ❌ No        | Used at compile time only                                                   |
| `@repo/eslint-config`     | Config files only               | ❌ No        | devDependency only                                                          |

---

## 4. Deploying with Docker (Self-Hosted)

For self-hosted or on-premise deployments, you can build and run the Next.js app inside a Docker container.

### Prerequisites: Enable Next.js Standalone Output

First, add the `output: "standalone"` configuration to `apps/web/next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // <-- enables a minimal production build
  // ... other config
};

export default nextConfig;
```

The `standalone` output creates a minimal `apps/web/.next/standalone/` directory containing only the necessary files to run the app without `node_modules`.

### Dockerfile (Monorepo Root)

Create `Dockerfile` at the monorepo root:

```dockerfile
# ----------------------------------------
# Stage 1: Install dependencies & build
# ----------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy lockfiles and workspace manifests first (for Docker layer caching)
COPY package.json yarn.lock ./
COPY turbo.json ./
COPY apps/web/package.json apps/web/
COPY apps/chaos-simulator/package.json apps/chaos-simulator/
COPY packages/ ./packages/

# Install all dependencies
RUN yarn install --frozen-lockfile

# Copy the full source code
COPY . .

# Build all dependencies, then the web app
RUN npx turbo build --filter=web...

# ----------------------------------------
# Stage 2: Production runner
# ----------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "apps/web/server.js"]
```

### Build & Run

```bash
# Build the Docker image
docker build -t observability-os-web .

# Run it
docker run -p 3000:3000 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e REDIS_URL="redis://..." \
  -e JWT_SECRET="your-secret" \
  observability-os-web
```

### Docker Compose

Your existing `docker-compose.yml` can reference the built image:

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

## 5. GitHub Application Callback Settings

Ensure your GitHub OAuth settings match your new production domain:

1. Go to **GitHub** → **Settings** → **Developer settings** → **OAuth Apps**.
2. Select your registered app.
3. Update the fields:
   - _Homepage URL_: `https://your-domain.vercel.app`
   - _Authorization callback URL_: `https://your-domain.vercel.app/api/auth/callback`

---

## 6. CI/CD & Verification Pipelines

Before merging feature PRs, run automated verification pipelines using GitHub Actions or your local terminal to guarantee build compliance:

```bash
# Verify TypeScript compile rules across workspaces
yarn check-types

# Verify code formatting and linting rules
yarn lint

# Verify that all workspaces build successfully
yarn build
```

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Verify & Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "yarn"

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Type check
        run: yarn check-types

      - name: Lint
        run: yarn lint

      - name: Build all workspaces
        run: yarn build
```

---

## 7. Troubleshooting

### Problem: "Cannot find module @repo/db" during Vercel build

**Cause**: The `@repo/db` package wasn't built before the Next.js build started.

**Fix**: Ensure the build command is `npx turbo build --filter=web...` (with the `...` suffix), not just `--filter=web`.

### Problem: Vercel build succeeds but app crashes at runtime with module errors

**Cause**: Vercel's serverless functions may not have access to the built dependency files if they expect them in a specific location.

**Fix**: Verify that the dependency `dist/` directories are included in the Vercel deployment. Enable "Include source files outside of the Root Directory" in Vercel project settings.

### Problem: Docker build is slow

**Cause**: Docker layer caching is not being utilized effectively.

**Fix**: Restructure the Dockerfile so that `COPY` of `package.json` and `yarn.lock` happens **before** copying source code. This way, `yarn install` is cached unless dependencies change.

### Problem: `@repo/ui` imports fail in production

**Cause**: `@repo/ui` exports raw `.tsx` files via `"exports": { "./*": "./src/*.tsx" }`. Next.js must be configured to handle TypeScript files from outside its own directory.

**Fix**: This is a Next.js monorepo concern — ensure that `next.config.ts` has the correct `transpilePackages` config (Next.js 16 typically handles this automatically with Yarn workspaces, but explicitly adding it ensures it works):

```typescript
const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui"],
  // ...
};
```

---

## 🔗 Related Documents

- ⏱️ **[QUICKSTART.md](QUICKSTART.md)**: Jumpstart guide for local onboarding.
- ⚙️ **[INSTALLATION.md](INSTALLATION.md)**: System specifications and node configurations.
- 🛡️ **[SECURITY.md](SECURITY.md)**: OAuth scopes, rate limit filters, and data scrubbing algorithms.
- 📐 **[ARCHITECTURE.md](ARCHITECTURE.md)**: System architecture and design decisions.
