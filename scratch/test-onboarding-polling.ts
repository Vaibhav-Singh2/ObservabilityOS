import fs from "fs";
import path from "path";
import { connectToDatabase, Project, Log } from "@repo/db";

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

  console.log(`Checking logs ingestion status for project: ${project.name}`);

  // Fetch logs to simulate polling call
  const logs = await Log.find({
    projectId: project._id,
    timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  }).limit(5);

  console.log(`Found ${logs.length} logs in the last 24h.`);
  if (logs.length > 0) {
    console.log(
      "✅ Live ingestion check simulation successful! Logs detected, wizard polling would unlock Step 5.",
    );
  } else {
    console.warn(
      "⚠️ No logs found in last 24h. Poll would remain in 'Awaiting' state.",
    );
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
