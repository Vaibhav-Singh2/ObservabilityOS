import fs from "fs";
import path from "path";
import { connectToDatabase, Project, Service, Log, User } from "@repo/db";
import { GET as triggerSloMonitoring } from "../apps/web/src/app/api/cron/slo-monitoring/route";

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

const TEST_API_KEY = "obs_sk_slo_alert_test_key_xyz";
const TEST_GITHUB_ID = "dummy_slo_alert_user";

// Intercept fetch calls to mock webhooks
const fetchCalls: { url: string; body: any }[] = [];
const originalFetch = global.fetch;

global.fetch = async (url: any, options: any) => {
  const urlStr = typeof url === "string" ? url : url?.toString() || "";
  if (
    urlStr.includes("hooks.slack.com") ||
    urlStr.includes("discord.com") ||
    urlStr.includes("outlook.office.com")
  ) {
    fetchCalls.push({
      url: urlStr,
      body: options?.body ? JSON.parse(options.body) : null,
    });
    return {
      ok: true,
      status: 200,
      text: async () => "ok",
    } as any;
  }
  return originalFetch(url, options);
};

async function runTest() {
  console.log("Connecting to database at:", process.env.MONGODB_URI);
  await connectToDatabase();

  // 1. Clean up old test data
  console.log(
    "\n--- [Step 1] Cleaning up and setting up test user and project ---",
  );
  const existingUser = await User.findOne({ githubId: TEST_GITHUB_ID });
  if (existingUser) {
    const existingProject = await Project.findOne({
      ownerId: existingUser._id,
    });
    if (existingProject) {
      await Log.deleteMany({ projectId: existingProject._id });
      await Service.deleteMany({ projectId: existingProject._id });
      await Project.deleteOne({ _id: existingProject._id });
    }
    await User.deleteOne({ _id: existingUser._id });
  }

  const user = await User.create({
    githubId: TEST_GITHUB_ID,
    username: "sloalertuser",
    email: "sloalertuser@example.com",
  });

  const project = await Project.create({
    ownerId: user._id,
    name: "SLO Alerting E2E Project",
    apiKey: TEST_API_KEY,
    slackWebhookUrl: "https://hooks.slack.com/services/T000/B000/SLACK_MOCK",
    discordWebhookUrl: "https://discord.com/api/webhooks/DISCORD_MOCK",
    teamsWebhookUrl: "https://outlook.office.com/webhook/TEAMS_MOCK",
  });

  const service = await Service.create({
    projectId: project._id,
    name: "payment-api",
    environment: "prod",
    slos: [
      {
        name: "Availability SLO",
        type: "availability",
        target: 99.0,
        windowDays: 7,
        status: "healthy", // Start as healthy
      },
    ],
  });

  console.log(
    `Setup complete. Project ID: ${project._id}, Service ID: ${service._id}`,
  );

  // Helper to call SLO monitoring endpoint
  const runMonitoring = async () => {
    const request = new Request(
      "http://localhost:3000/api/cron/slo-monitoring?secret=dev_cron_secret_123",
    );
    const response = await triggerSloMonitoring(request);
    return await response.json();
  };

  // 2. Rerun monitoring on fresh (empty logs) setup
  console.log(
    "\n--- [Step 2] Running monitoring on empty logs (should be healthy, no alerts) ---",
  );
  let result = await runMonitoring();
  console.log("Monitoring result:", JSON.stringify(result, null, 2));
  console.log("Fetch calls captured:", fetchCalls.length);

  if (fetchCalls.length !== 0) {
    throw new Error(
      "Expected 0 alerts dispatched for steady healthy state, got " +
        fetchCalls.length,
    );
  }

  // 3. Seed failure logs to trigger breach
  console.log(
    "\n--- [Step 3] Seeding failure logs to trigger a breach (80% compliance, target 99.0%) ---",
  );
  const now = new Date();
  const logs = [];
  // 8 normal logs
  for (let i = 0; i < 8; i++) {
    logs.push({
      projectId: project._id,
      serviceId: service._id,
      environment: "prod",
      timestamp: new Date(now.getTime() - i * 10 * 60 * 1000),
      level: "info",
      message: `Transaction ${i} successful`,
    });
  }
  // 2 error logs
  for (let i = 0; i < 2; i++) {
    logs.push({
      projectId: project._id,
      serviceId: service._id,
      environment: "prod",
      timestamp: new Date(now.getTime() - i * 15 * 60 * 1000),
      level: "error",
      message: `Transaction failed due to network timeout`,
    });
  }
  await Log.insertMany(logs);
  console.log(`Seeded ${logs.length} logs.`);

  // 4. Run monitoring again
  console.log("\n--- [Step 4] Running monitoring on breached logs ---");
  fetchCalls.length = 0; // Clear queue
  result = await runMonitoring();
  console.log("Monitoring result:", JSON.stringify(result, null, 2));
  console.log("Fetch calls captured:", fetchCalls.length);

  if (fetchCalls.length !== 3) {
    throw new Error(
      "Expected exactly 3 alerts (Slack, Discord, Teams) for the breach, got " +
        fetchCalls.length,
    );
  }

  // Validate alert payloads
  const slackAlert = fetchCalls.find((c) => c.url.includes("slack"));
  const discordAlert = fetchCalls.find((c) => c.url.includes("discord"));
  const teamsAlert = fetchCalls.find((c) => c.url.includes("outlook"));

  if (!slackAlert || !discordAlert || !teamsAlert) {
    throw new Error("Missing alert delivery channels in captured fetch calls.");
  }

  console.log("Slack Alert structure verified:", !!slackAlert.body.attachments);
  console.log("Discord Alert structure verified:", !!discordAlert.body.embeds);
  console.log("Teams Alert structure verified:", !!teamsAlert.body.sections);

  // Check database state updated
  const updatedService = await Service.findById(service._id);
  const updatedSlo = updatedService?.slos?.[0];
  console.log(`SLO Status in DB: ${updatedSlo?.status}`);
  if (updatedSlo?.status !== "breached") {
    throw new Error("SLO status in DB was not updated to 'breached'");
  }

  // 5. Run monitoring again (status shouldn't change, so no alerts should fire)
  console.log(
    "\n--- [Step 5] Rerunning monitoring while still breached (should not fire again) ---",
  );
  fetchCalls.length = 0; // Clear queue
  result = await runMonitoring();
  if (fetchCalls.length !== 0) {
    throw new Error(
      "Expected 0 alerts for no status change (already breached), got " +
        fetchCalls.length,
    );
  }
  console.log("Passed: alert deduplication verified (0 alerts fired).");

  // 6. Seed success logs to recover
  console.log(
    "\n--- [Step 6] Seeding 500 success logs to recover compliance to >99.0% and healthy budget ---",
  );
  const recoveryLogs = [];
  for (let i = 0; i < 500; i++) {
    recoveryLogs.push({
      projectId: project._id,
      serviceId: service._id,
      environment: "prod",
      timestamp: new Date(now.getTime() - i * 1 * 60 * 1000),
      level: "info",
      message: `Transaction recovery log ${i}`,
    });
  }
  await Log.insertMany(recoveryLogs);

  // 7. Run monitoring to verify recovery transition
  console.log(
    "\n--- [Step 7] Running monitoring to trigger recovery alert ---",
  );
  fetchCalls.length = 0; // Clear queue
  result = await runMonitoring();
  console.log("Monitoring result:", JSON.stringify(result, null, 2));
  console.log("Fetch calls captured:", fetchCalls.length);

  if (fetchCalls.length !== 3) {
    throw new Error(
      "Expected exactly 3 alerts (Slack, Discord, Teams) for recovery, got " +
        fetchCalls.length,
    );
  }

  const recoverySlackAlert = fetchCalls.find((c) => c.url.includes("slack"));
  const transitionText = recoverySlackAlert?.body.attachments[0].blocks.find(
    (b: any) => b.text?.text?.includes("Transition"),
  ).text.text;
  console.log("Slack Transition Text:", transitionText);

  if (
    !transitionText ||
    !transitionText.includes("breached") ||
    !transitionText.includes("healthy")
  ) {
    throw new Error(
      "Slack recovery transition alert formatting incorrect: " + transitionText,
    );
  }

  const finalService = await Service.findById(service._id);
  console.log(`Final SLO Status in DB: ${finalService?.slos?.[0]?.status}`);
  if (finalService?.slos?.[0]?.status !== "healthy") {
    throw new Error("SLO status in DB was not updated back to 'healthy'");
  }

  console.log(
    "\n✅ E2E SLO Alerts and Multi-channel Webhook adapters verified successfully!",
  );

  // Cleanup
  console.log("\n--- [Cleanup] Deleting test records ---");
  await Log.deleteMany({ projectId: project._id });
  await Service.deleteOne({ _id: service._id });
  await Project.deleteOne({ _id: project._id });
  await User.deleteOne({ _id: user._id });
  console.log("Database cleaned up successfully.");
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed with error:", err);
    process.exit(1);
  });
