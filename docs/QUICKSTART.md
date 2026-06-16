# Quickstart Guide — ObservabilityOS

Get up and running with a local instance of **ObservabilityOS** and send your first telemetry log in under 5 minutes.

---

## ⏱️ Step-by-Step Walkthrough

### Step 1: Boot Local Infrastructure

ObservabilityOS requires **MongoDB** (data storage) and **Redis** (caching and rate limiting). Spin them up instantly using the pre-configured [docker-compose.yml](../docker-compose.yml):

```bash
docker-compose up -d
```

_Verify they are running by checking `docker ps`._

### Step 2: Install Workspace Dependencies

Clone the repository, navigate to the root folder, and install the npm packages:

```bash
yarn install
```

### Step 3: Configure Environment Variables

Create an `.env` file in the Next.js web application directory `apps/web/.env` with the following variables:

```env
# Database & Cache Locations
MONGODB_URI=mongodb://localhost:27017/observability-os
REDIS_URL=redis://localhost:6379

# Cryptography signing key
JWT_SECRET=super_secret_jwt_key_here

# GitHub Application credentials (Required for user authentication)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Server Locations
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI Models (Optional - fallbacks to mock summaries if not configured)
GEMINI_API_KEY=your_gemini_api_key
```

### Step 4: Compile & Run

Build the shared monorepo packages, then start the workspace development servers:

```bash
# Compile DB schemas, AI wrappers, and client SDKs
yarn build

# Run Next.js dashboard and API handlers
yarn dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📦 Setting Up Your First Project

1. **Sign In**: Click "Sign in with GitHub" on the homepage.
2. **Onboarding**: Complete the short 3-step onboarding wizard.
3. **Copy Credentials**: Copy your **Ingestion Endpoint** (`http://localhost:3000/api/ingest`) and **API Key** from the project credentials dashboard.
4. **Create a Service**: Click "Create Service", enter `payment-service`, and set the environment to `dev`.

---

## 🚀 Shipping Your First Telemetry Packet

Create a local node script `test-ingest.js` in a scratch directory to send your first telemetry log:

```javascript
const { Logger } = require("./packages/sdk/dist"); // If running inside monorepo

const logger = new Logger({
  apiKey: "YOUR_PROJECT_API_KEY", // Replace with your copied API Key
  endpoint: "http://localhost:3000/api/ingest",
  defaultService: "payment-service",
  defaultEnvironment: "dev",
  batchSize: 1, // Flush instantly for this test
});

logger.info("Checkout completed successfully", {
  metadata: {
    userId: "usr_99824",
    amount: 129.5,
    currency: "USD",
    cartItems: 3,
  },
});
```

Run the script:

```bash
node test-ingest.js
```

Return to your **ObservabilityOS Dashboard** to view your log inside the log stream and check your microservice health status registry!

---

## 🔗 Related Documents

- ⚙️ **[INSTALLATION.md](INSTALLATION.md)**: Deep dive on node variables, custom databases, and workspace dependencies.
- 🏗️ **[ARCHITECTURE.md](ARCHITECTURE.md)**: Details on telemetry ingestion filters and Z-Score math.
- 🔌 **[API.md](API.md)**: Complete request/response schemas for manual REST integration.
