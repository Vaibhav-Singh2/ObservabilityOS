# Installation Guide — ObservabilityOS

This guide covers system requirements, database setup, environment variable configurations, and step-by-step installation guides for both local development and production.

---

## 💻 Requirements

Before installing, ensure your host environment meets the following specifications:

- **Node.js**: `v24.x` (or `v18+` compatible; LTS recommended).
- **Yarn**: `v4.16.0` (Turborepo monorepo workspaces configured via Yarn Modern).
- **MongoDB**: `v6.0+` (Standalone local database or MongoDB Atlas cluster).
- **Redis**: `v6.2+` (Standalone instances on port `6379`).
- **Docker Desktop / Compose**: Required for running MongoDB & Redis dependencies locally.

---

## 🛠️ Environment Variables Configuration

Create an `.env` file in `apps/web/.env` to configure the web app and API gateways.

### Database & Cache Configurations

- `MONGODB_URI`: The connection string for your MongoDB instance.
  - _Local_: `mongodb://localhost:27017/observability-os`
  - _Production_: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/observability-os`
- `REDIS_URL`: The Redis endpoint URL.
  - _Local_: `redis://localhost:6379`
  - _Production_: `redis://:<password>@redis-server-domain:6379`

### Authentication Settings

- `JWT_SECRET`: A secure hash key used to sign browser user sessions.
  - _Generate_: Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` in your terminal.
- `GITHUB_CLIENT_ID`: The Client ID of your GitHub OAuth application.
- `GITHUB_CLIENT_SECRET`: The Client Secret of your GitHub OAuth application.

### App Locations

- `NEXT_PUBLIC_APP_URL`: The base URL where the user dashboard can be accessed.
  - _Local_: `http://localhost:3000`
  - _Production_: `https://observabilityos.yourdomain.com`

### AI Core configurations (Optional)

- `AICREDITS_API_KEY`: API Key for the third-party AICredits gateway (`https://aicredits.in`).
- `AICREDITS_MODEL`: Target model to run through the gateway (e.g., `anthropic/claude-3-5-haiku-20241022`, `openai/gpt-4o-mini`).
- `ANTHROPIC_API_KEY`: Direct API Key for Anthropic Claude.
- `OPENAI_API_KEY`: Direct API Key for OpenAI GPT.

---

## 📦 Local Workspace Installation

### Step 1: Spin up local database and cache

Run the docker compose file in the root directory:

```bash
docker-compose up -d
```

### Step 2: Install node dependencies

Install packages across all Turborepo workspaces:

```bash
yarn install
```

### Step 3: Build shared packages

Compile the database schemas, AI modules, and Winston SDK:

```bash
yarn build
```

### Step 4: Boot Dev Server

Start Next.js and live builders:

```bash
yarn dev
```

Navigate to `http://localhost:3000`.

---

## 🚀 Production Deployment Setup

Deploying ObservabilityOS in production requires hosting the Next.js monorepo workspace and provisioning managed databases.

### 1. Database Provisioning

We recommend hosting MongoDB and Redis on managed platforms:

- **MongoDB**: Provision a MongoDB Atlas cluster. Ensure network access rules allow traffic from your hosting provider's IP addresses.
- **Redis**: Set up a managed Redis instance (e.g. Upstash, Redis Labs, or AWS ElastiCache).

### 2. GitHub OAuth App Setup

To allow users to register and sign in:

1. Go to **GitHub** $\rightarrow$ **Settings** $\rightarrow$ **Developer settings** $\rightarrow$ **OAuth Apps**.
2. Click **New OAuth App**.
3. Set the URLs to your production domain:
   - _Homepage URL_: `https://your-domain.com`
   - _Authorization callback URL_: `https://your-domain.com/api/auth/callback`
4. Register the app, then copy the Client ID and Client Secret.

### 3. Deploying the Workspace

The Next.js workspace can be deployed to Vercel, Railway, AWS ECS, or digital Ocean:

- **Root Directory**: Select the root folder `/`.
- **Build Command**: `npx turbo run build --filter=web`
- **Output Directory**: `apps/web/.next`
- **Install Command**: `yarn install`
- **Environment Variables**: Configure the production variables described in the section above.

---

## 🔗 Related Documents

- ⏱️ **[QUICKSTART.md](QUICKSTART.md)**: 5-minute setup checklist.
- 🏗️ **[ARCHITECTURE.md](ARCHITECTURE.md)**: Workspace package flow and telemetry pipelines.
- 🚀 **[DEPLOYMENT.md](DEPLOYMENT.md)**: Detailed configuration templates for Vercel and Railway deployments.
