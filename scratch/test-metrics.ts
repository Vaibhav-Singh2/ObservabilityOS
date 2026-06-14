/// <reference types="node" />

import fs from "fs";
import path from "path";
import { connectToDatabase, Project, Service, Metric, User } from "@repo/db";

// Manual dotenv loading from the web app workspace
try {
  const envPath = path.join(process.cwd(), "apps/web/.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index > 0) {
        const key = trimmed.slice(0, index).trim();
        const val = trimmed.slice(index + 1).trim();
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.warn("Could not read .env file:", e);
}

const TEST_API_KEY = "obs_sk_test_api_key_987654";

async function verify() {
  console.log("Connecting to database at:", process.env.MONGODB_URI);
  await connectToDatabase();

  // 1. Setup Test User, Project, and Service
  console.log("\n--- [Step 1] Setting up project and service ---");
  await User.deleteOne({ githubId: "dummy_test_user" });
  const user = await User.create({
    githubId: "dummy_test_user",
    username: "testuser",
    email: "testuser@example.com",
  });

  await Project.deleteOne({ apiKey: TEST_API_KEY });
  const project = await Project.create({
    ownerId: user._id,
    name: "E2E Verification Project",
    apiKey: TEST_API_KEY,
  });

  let service = await Service.findOne({
    projectId: project._id,
    name: "payment-service",
    environment: "staging",
  });
  if (!service) {
    service = await Service.create({
      projectId: project._id,
      name: "payment-service",
      environment: "staging",
    });
  }

  console.log(`Using Project: ${project._id}, Service: ${service._id}`);

  // 2. Clean up past metrics for this project
  await Metric.deleteMany({ projectId: project._id });

  // 3. Inject Historical Metrics Data directly in MongoDB (to simulate 24 hours of data)
  console.log("\n--- [Step 2] Injecting 24 hours of system metrics ---");
  const nowMs = Date.now();
  const metricsToSeed = [];

  // Seed 48 points, one every 30 minutes
  for (let i = 0; i < 48; i++) {
    const timestamp = new Date(nowMs - i * 30 * 60 * 1000);
    // Sine-wave pattern for visual variation
    const wave = Math.sin(i * 0.5);
    metricsToSeed.push({
      projectId: project._id,
      serviceId: service._id,
      timestamp,
      environment: "staging",
      cpuUsage: Math.round(30 + wave * 15),
      memoryUsage: Math.round(200 + wave * 50),
      memoryLimit: 512,
      latencyMs: Math.round(120 + wave * 40),
    });
  }

  await Metric.insertMany(metricsToSeed);
  console.log(`Successfully seeded ${metricsToSeed.length} metrics documents.`);

  // 4. Test Ingestion API Endpoint
  console.log(
    "\n--- [Step 3] Testing Ingestion API Endpoint (/api/metrics/ingest) ---",
  );
  const livePayload = {
    service: "payment-service",
    environment: "staging",
    cpuUsage: 45.5,
    memoryUsage: 256,
    memoryLimit: 512,
    latencyMs: 145,
  };

  const ingestEndpoint = "http://127.0.0.1:3000/api/metrics/ingest";
  try {
    const response = await fetch(ingestEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TEST_API_KEY,
      },
      body: JSON.stringify(livePayload),
    });

    const body = await response.json();
    console.log("Ingestion Response:", JSON.stringify(body, null, 2));

    if (!response.ok) {
      throw new Error(
        `Ingestion endpoint returned status ${response.status}: ${JSON.stringify(body)}`,
      );
    }
  } catch (err) {
    console.error(
      "Failed to connect to dev server on port 3000. Start it in watch mode before testing.",
      err,
    );
    process.exit(1);
  }

  // 5. Test Query / Aggregation API Endpoint
  console.log(
    "\n--- [Step 4] Testing Aggregation Query API Endpoint (/api/metrics/query) ---",
  );
  const queryUrl = `http://127.0.0.1:3000/api/metrics/query?projectId=${project._id}&serviceId=${service._id}&timeRange=24h`;

  // Create a session cookie by logging in (since query API checks for cookies session JWT)
  // To bypass browser auth during testing, we can write a quick dev bypass option or sign a token using jwt
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is missing from environment variables.");
  }
  const token = require("jsonwebtoken").sign(
    { userId: project.ownerId.toString() },
    jwtSecret,
  );

  try {
    const response = await fetch(queryUrl, {
      method: "GET",
      headers: {
        Cookie: `session=${token}`,
      },
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(
        `Query endpoint returned status ${response.status}: ${JSON.stringify(body)}`,
      );
    }

    console.log(`Aggregation returned ${body.metrics.length} query intervals.`);
    console.log("Sample point:", JSON.stringify(body.metrics[0], null, 2));

    if (body.metrics.length > 0) {
      console.log(
        "\n✅ E2E System Metrics Ingestion & Query Verification Successful!",
      );
    } else {
      console.log(
        "\n❌ E2E System Metrics Verification Failed: Empty aggregation returned.",
      );
    }
  } catch (err) {
    console.error("Aggregation Query request failed:", err);
    process.exit(1);
  }
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification script failed:", err);
    process.exit(1);
  });
