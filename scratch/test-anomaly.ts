/// <reference types="node" />

import fs from "fs";
import path from "path";
import {
  connectToDatabase,
  Project,
  Service,
  Log,
  User,
  Deploy,
  Incident,
} from "@repo/db";
import { Logger } from "@repo/sdk";

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

const TEST_API_KEY = "obs_sk_TEST_KEY_DO_NOT_USE";

async function verify() {
  console.log("Connecting to database at:", process.env.MONGODB_URI);
  await connectToDatabase();

  // 1. Setup Test User and Project
  console.log("\n--- [Step 1] Setting up user and project ---");
  await User.deleteOne({ githubId: "dummy_test_user" });
  const user = await User.create({
    githubId: "dummy_test_user",
    username: "testuser",
    email: "testuser@example.com",
  });

  await Project.deleteOne({ apiKey: TEST_API_KEY });
  const project = await Project.create({
    ownerId: user._id,
    name: "E2E Anomaly Verification Project",
    apiKey: TEST_API_KEY,
  });
  console.log(`Successfully created test project! ID: ${project._id}`);

  // Create Service
  const service = await Service.create({
    projectId: project._id,
    name: "payment-service",
    environment: "staging",
  });
  console.log(`Successfully created test service! ID: ${service._id}`);

  // Clean up old incidents and deploys
  await Deploy.deleteMany({ projectId: project._id });
  await Incident.deleteMany({ projectId: project._id });
  await Log.deleteMany({ projectId: project._id });

  // 2. Simulate Software Deployment via GitHub Webhook API
  console.log("\n--- [Step 2] Logging deployment event via Webhook ---");
  const deployPayload = {
    service: "payment-service",
    environment: "staging",
    commitSha: "a2c4e6g8h1j3k5l7",
    commitMessage: "Optimize billing webhook transaction speeds",
    branch: "main",
    metadata: { author: "alice", repo: "ObservabilityOS" },
  };

  const deployResponse = await fetch(
    "http://127.0.0.1:3000/api/webhooks/github",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TEST_API_KEY,
      },
      body: JSON.stringify(deployPayload),
    },
  );

  if (deployResponse.ok) {
    const data: any = await deployResponse.json();
    console.log(
      `✅ Webhook deployment logged successfully! Deploy ID: ${data.deployId}`,
    );
  } else {
    console.error(
      `❌ Webhook deployment logging failed:`,
      await deployResponse.text(),
    );
    process.exit(1);
  }

  // 3. Setup historical normal logs (low error rate baseline: 1 error per 10 mins)
  console.log("\n--- [Step 3] Seeding historical log baseline ---");
  const historicalLogs = [];
  const now = Date.now();
  for (let i = 1; i <= 12; i++) {
    // Generate scattered info logs and 1 historical error log
    historicalLogs.push({
      projectId: project._id,
      serviceId: service._id,
      timestamp: new Date(now - i * 5 * 60 * 1000 - 1000), // i * 5 mins ago
      level: i === 6 ? "error" : "info", // 1 error log 30 minutes ago
      message:
        i === 6
          ? "Database connection timed out during handshake"
          : "Transaction processed successfully",
      environment: "staging",
      metadata: { latency: i === 6 ? 5000 : 120 },
    });
  }
  await Log.insertMany(historicalLogs);
  console.log(
    `Successfully seeded ${historicalLogs.length} historical logs directly in DB.`,
  );

  // 4. Ingest high-volume burst of error logs via Logger SDK
  console.log("\n--- [Step 4] Logging a sudden burst of errors via SDK ---");
  const logger = new Logger({
    apiKey: TEST_API_KEY,
    endpoint: "http://127.0.0.1:3000/api/ingest",
    defaultService: "payment-service",
    defaultEnvironment: "staging",
    batchSize: 1, // Flush immediately
  });

  for (let i = 0; i < 5; i++) {
    console.log(`Sending error log ${i + 1}...`);
    logger.error(
      "Transaction failed: insufficient funds in customer balance account",
      {
        metadata: {
          amount: 500,
          currency: "USD",
          errorCode: "ERR_FUNDS",
          gatewayStatus: 402,
        },
        traceId: `trace_anomaly_10${i}`,
      },
    );
    // Wait briefly between calls
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  logger.destroy();
  console.log("SDK logging complete.");

  // 5. Wait for async anomaly detection process to run
  console.log("\n--- [Step 5] Waiting for async anomaly engine to process ---");
  await new Promise((resolve) => setTimeout(resolve, 3500));

  // 6. Query DB to verify Incident creation
  console.log("\n--- [Step 6] Verifying Incident creation in DB ---");
  const incidents = await Incident.find({ projectId: project._id })
    .populate("serviceId")
    .populate("deployId");

  console.log(`Found ${incidents.length} incidents:`);
  for (const inc of incidents) {
    const serviceName = (inc.serviceId as any)?.name;
    const commitSha = (inc.deployId as any)?.commitSha;
    console.log(`\n======================================================`);
    console.log(`🚨 INCIDENT DETECTED: [${inc.status.toUpperCase()}]`);
    console.log(
      `Service: ${serviceName} (Env: ${inc.serviceId ? (inc.serviceId as any).environment : "N/A"})`,
    );
    console.log(`Title: ${inc.title}`);
    console.log(`Confidence: ${Math.round(inc.confidence * 100)}%`);
    console.log(`Time-to-Detect (TTD): ${inc.ttd / 1000}s`);
    console.log(`\nAI Summary:\n${inc.summary}`);
    console.log(`\nAI Root Cause:\n${inc.rootCause}`);
    console.log(`\nCorrelated Deploy SHA: ${commitSha || "None"}`);
    console.log(`\nSuggested Troubleshooting Plan:`);
    inc.suggestedFix.forEach((fix, index) => {
      console.log(`  ${index + 1}. ${fix}`);
    });
    console.log(`======================================================\n`);
  }

  if (incidents.length > 0) {
    console.log(
      "✅ E2E Anomaly and AI Reasoning pipeline verified successfully!",
    );
    process.exit(0);
  } else {
    console.log(
      "❌ Failed to detect any incidents. Check anomaly threshold or logs in DB.",
    );
    process.exit(1);
  }
}

verify().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
