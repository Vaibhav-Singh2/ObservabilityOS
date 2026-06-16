import fs from "fs";
import path from "path";
import { connectToDatabase, Project, Service, Log, Incident } from "@repo/db";
import { processAnomalyDetection } from "../apps/web/src/lib/anomaly";

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

async function run() {
  await connectToDatabase();

  const project = await Project.findOne({
    apiKey: "obs_sk_TEST_KEY_DO_NOT_USE",
  });
  if (!project) {
    console.error(
      "Test project not found. Make sure test-anomaly.ts has been run.",
    );
    process.exit(1);
  }

  const service = await Service.findOne({
    projectId: project._id,
    name: "payment-service",
  });
  if (!service) {
    console.error("Test service not found.");
    process.exit(1);
  }

  console.log(`Found Project: ${project.name}`);
  console.log(`Found Service: ${service.name} [ID: ${service._id}]`);

  // Clear previous incidents and logs to have a clean slate
  await Incident.deleteMany({ projectId: project._id });
  await Log.deleteMany({ projectId: project._id });

  // Insert fresh test logs aligned with current timestamp
  const now = Date.now();
  const logsToInsert = [];

  // 12 historical logs
  for (let i = 1; i <= 12; i++) {
    logsToInsert.push({
      projectId: project._id,
      serviceId: service._id,
      timestamp: new Date(now - i * 5 * 60 * 1000 - 1000),
      level: i === 6 ? "error" : "info",
      message:
        i === 6
          ? "Database connection timed out during handshake"
          : "Transaction processed successfully",
      environment: "staging",
      metadata: { latency: i === 6 ? 5000 : 120 },
    });
  }

  // 5 current window error logs
  for (let i = 0; i < 5; i++) {
    logsToInsert.push({
      projectId: project._id,
      serviceId: service._id,
      timestamp: new Date(),
      level: "error",
      message:
        "Transaction failed: insufficient funds in customer balance account",
      environment: "staging",
      metadata: {
        amount: 500,
        currency: "USD",
        errorCode: "ERR_FUNDS",
        gatewayStatus: 402,
      },
      traceId: `trace_anomaly_10${i}`,
    });
  }

  await Log.insertMany(logsToInsert);

  // 1. Set minErrorCount to 10 (which is higher than the 5 errors we have logged)
  console.log(
    "\n--- [Test 1] Setting minErrorCount = 10 (expecting NO anomalies) ---",
  );
  project.minErrorCount = 10;
  project.zScoreThreshold = 3.0;
  await project.save();

  console.log("Running processAnomalyDetection...");
  await processAnomalyDetection(
    project._id.toString(),
    service._id.toString(),
    "staging",
  );

  let incidents = await Incident.find({ projectId: project._id });
  console.log(`Incidents found: ${incidents.length} (Expected: 0)`);
  if (incidents.length !== 0) {
    console.error(
      "❌ Failed: Incidents were created despite minErrorCount = 10.",
    );
    process.exit(1);
  } else {
    console.log(
      "✅ Success: No incidents created when error count < threshold.",
    );
  }

  // 2. Set minErrorCount to 2 (which is lower than the 5 errors we have logged)
  console.log(
    "\n--- [Test 2] Setting minErrorCount = 2 (expecting anomaly alert) ---",
  );
  project.minErrorCount = 2;
  project.zScoreThreshold = 1.5;
  await project.save();

  console.log("Running processAnomalyDetection...");
  await processAnomalyDetection(
    project._id.toString(),
    service._id.toString(),
    "staging",
  );

  incidents = await Incident.find({ projectId: project._id });
  console.log(`Incidents found: ${incidents.length} (Expected: 1)`);
  if (incidents.length === 0) {
    console.error(
      "❌ Failed: No incidents created when thresholds were exceeded.",
    );
    process.exit(1);
  } else {
    console.log(
      `✅ Success: Incident created successfully! Title: ${incidents[0].title}`,
    );
  }

  console.log(
    "\n✅ All Alert Settings configuration tests passed successfully!",
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test settings failed:", err);
    process.exit(1);
  });
