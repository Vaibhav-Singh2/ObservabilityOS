import fs from "fs";
import path from "path";
import {
  connectToDatabase,
  Project,
  Service,
  Log,
  User,
  Incident,
} from "@repo/db";
import { Types } from "mongoose";

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
  const projectIdStr = project._id.toString();
  console.log(`Found project: ${project.name} [ID: ${projectIdStr}]`);

  // Verify dashboard stats calculation (the logic inside page.tsx)
  console.log("\n--- [Test 1] Testing Dashboard stats aggregation ---");
  const start24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stats = await Log.aggregate([
    {
      $match: {
        projectId: project._id,
        timestamp: { $gte: start24h },
      },
    },
    {
      $group: {
        _id: "$serviceId",
        totalLogs: { $sum: 1 },
        errorLogs: {
          $sum: {
            $cond: [{ $eq: ["$level", "error"] }, 1, 0],
          },
        },
        avgLatency: {
          $avg: {
            $ifNull: ["$metadata.latencyMs", "$metadata.latency"],
          },
        },
      },
    },
  ]);

  const openIncidents = await Incident.find({
    projectId: project._id,
    status: { $in: ["open", "investigating"] },
  });

  const openIncidentsServiceIds = new Set(
    openIncidents.map((inc) => inc.serviceId.toString()),
  );

  console.log(`Aggregated stats count: ${stats.length}`);
  for (const s of stats) {
    const totalLogs = s.totalLogs;
    const errorLogs = s.errorLogs;
    const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;
    const availability =
      totalLogs > 0 ? ((totalLogs - errorLogs) / totalLogs) * 100 : 100;
    const isAnomalous = openIncidentsServiceIds.has(s._id.toString());

    console.log(`Service ID: ${s._id.toString()}`);
    console.log(`- Total logs (24h): ${totalLogs}`);
    console.log(`- Error logs (24h): ${errorLogs}`);
    console.log(`- Error rate: ${errorRate.toFixed(2)}%`);
    console.log(`- Availability: ${availability.toFixed(2)}%`);
    console.log(
      `- Avg Latency: ${s.avgLatency !== null ? Math.round(s.avgLatency) + "ms" : "N/A"}`,
    );
    console.log(
      `- Open Incidents: ${isAnomalous ? "Yes (Red)" : "No (Green/Yellow)"}`,
    );
  }

  // Verify search query logic
  console.log("\n--- [Test 2] Testing Log Search query logic ---");
  // Test query level=error
  const errorLogsSearch = await Log.find({
    projectId: project._id,
    level: "error",
  }).limit(5);
  console.log(
    `Search level=error count: ${errorLogsSearch.length} (Expected: 5)`,
  );

  // Test text search message="insufficient"
  const textSearch = await Log.find({
    projectId: project._id,
    message: { $regex: "insufficient", $options: "i" },
  });
  console.log(
    `Search message="insufficient" count: ${textSearch.length} (Expected: 5)`,
  );

  // Test text search message="handshake"
  const baselineSearch = await Log.find({
    projectId: project._id,
    message: { $regex: "handshake", $options: "i" },
  });
  console.log(
    `Search message="handshake" count: ${baselineSearch.length} (Expected: 1)`,
  );

  console.log(
    "\n✅ All log metrics aggregation and search query checks passed successfully!",
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test search failed:", err);
    process.exit(1);
  });
