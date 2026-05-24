import fs from "fs";
import path from "path";
import { connectToDatabase, Project, Service, Log, User } from "@repo/db";
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

const TEST_API_KEY = "obs_sk_test_api_key_987654";

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
    name: "E2E Verification Project",
    apiKey: TEST_API_KEY,
  });
  console.log(`Successfully created test project! ID: ${project._id}`);

  // 2. Clean up past logs/services for this project
  await Service.deleteMany({ projectId: project._id });
  await Log.deleteMany({ projectId: project._id });

  // 3. Initialize Logger SDK
  console.log("\n--- [Step 2] Initializing Logger SDK ---");
  const logger = new Logger({
    apiKey: TEST_API_KEY,
    endpoint: "http://127.0.0.1:3000/api/ingest",
    defaultService: "payment-service",
    defaultEnvironment: "staging",
    batchSize: 2, // Ship immediately when 2 items are logged
  });

  // 4. Ship Logs
  console.log("\n--- [Step 3] Shipping logs via SDK ---");
  console.log("Sending log 1...");
  logger.info("Transaction initialized", {
    metadata: { amount: 250, currency: "USD" },
    traceId: "trace_101",
  });

  console.log("Sending log 2 (triggers batch flush)...");
  logger.warn("Transaction took longer than expected", {
    metadata: { latencyMs: 350 },
    traceId: "trace_101",
  });

  console.log("Sending log 3 (requires manual flush)...");
  logger.error("Transaction failed: insufficient funds", {
    metadata: { errorCode: "ERR_FUNDS", cardType: "Visa" },
    traceId: "trace_102",
  });

  console.log("Executing manual flush for remaining logs...");
  await logger.flush();
  logger.destroy();
  console.log("SDK Logging finished.");

  // 5. Verify Ingest in DB
  console.log("\n--- [Step 4] Querying database to verify ---");
  // Give MongoDB a brief moment to settle
  await new Promise((resolve) => setTimeout(resolve, 500));

  const services = await Service.find({ projectId: project._id });
  console.log(`Found ${services.length} services:`);
  for (const s of services) {
    console.log(`- Service: ${s.name} (Env: ${s.environment}) [ID: ${s._id}]`);
  }

  const logs = await Log.find({ projectId: project._id }).sort({ timestamp: 1 });
  console.log(`Found ${logs.length} logs in DB:`);
  for (const l of logs) {
    console.log(
      `[${l.timestamp.toISOString()}] [${l.level.toUpperCase()}] [Service ID: ${
        l.serviceId
      }] ${l.message} (Trace: ${l.traceId || "none"})`
    );
    console.log(`  Metadata: ${JSON.stringify(l.metadata)}`);
  }

  if (logs.length === 3) {
    console.log("\n✅ E2E Ingestion Verification Successful! All 3 logs were received and saved.");
  } else {
    console.log(`\n❌ E2E Ingestion Verification Failed. Expected 3 logs, found ${logs.length}.`);
  }
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed with error:", err);
    process.exit(1);
  });
