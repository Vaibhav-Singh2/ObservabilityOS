import fs from "fs";
import path from "path";
import {
  connectToDatabase,
  Project,
  Service,
  Log,
  Incident,
  Comment,
  User,
} from "@repo/db";
import {
  generatePostMortemMarkdown,
  PostMortemIncident,
  PostMortemLog,
  PostMortemComment,
} from "../apps/web/src/lib/postmortem";

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
  console.log("Connecting to database...");
  await connectToDatabase();

  // Find a test project
  const project = await Project.findOne();
  if (!project) {
    console.error(
      "No project found. Run test-settings.ts or test-anomaly.ts first.",
    );
    process.exit(1);
  }
  console.log(`Using Project: ${project.name} (${project._id})`);

  // Find or create a service
  let service = await Service.findOne({ projectId: project._id });
  if (!service) {
    service = await Service.create({
      projectId: project._id,
      name: "verify-service",
      environment: "staging",
    });
  }
  console.log(`Using Service: ${service.name} (${service._id})`);

  // Find or create a user
  let user = await User.findOne();
  if (!user) {
    user = await User.create({
      githubId: "verify-user-123",
      username: "VerifySRE",
      email: "support@observabilityos.in",
    });
  }
  console.log(`Using User: ${user.username} (${user._id})`);

  // Test 1: Update service runbooks & troubleshooting steps
  console.log("\n--- [Test 1] Modifying service runbooks and steps ---");
  const testUrl = "https://docs.observabilityos.in/runbooks/db-outage";
  const testSteps =
    "1. Check MongoDB Atlas connection string.\n2. Verify local docker-compose service status.\n3. Validate replica set member health.";

  service.runbookUrl = testUrl;
  service.troubleshootingSteps = testSteps;
  await service.save();

  const updatedService = await Service.findById(service._id);
  if (
    updatedService?.runbookUrl === testUrl &&
    updatedService?.troubleshootingSteps === testSteps
  ) {
    console.log(
      "✅ Success: Service runbookUrl and troubleshootingSteps updated correctly!",
    );
  } else {
    console.error("❌ Failed: Service settings did not persist.");
    process.exit(1);
  }

  // Clear previous test incidents for clean slate
  await Incident.deleteMany({
    projectId: project._id,
    title: "Test DB Outage Anomaly",
  });

  // Create a test Incident
  const incident = await Incident.create({
    projectId: project._id,
    serviceId: service._id,
    title: "Test DB Outage Anomaly",
    summary:
      "Service verify-service is experiencing a database connectivity degradation.",
    rootCause:
      "MongoDB primary node replication lag exceeded threshold after a bulk write operation.",
    impact: "API Gateway latency spikes and write operation time-outs.",
    suggestedFix: [
      "Scale up replica set nodes on MongoDB Atlas",
      "Optimize indexing on the logs collection",
      "Verify connection pool size configurations",
    ],
    confidence: 0.94,
    status: "investigating",
    relatedLogs: [],
    ttd: 45000,
  });
  console.log(`Created test incident: ${incident.title} (${incident._id})`);

  // Test 2: Add comments to Incident
  console.log("\n--- [Test 2] Adding SRE comments ---");
  const comment1 = await Comment.create({
    incidentId: incident._id,
    userId: user._id,
    content:
      "Investigating the primary replication lag. CPU on primary replica node is at 88%.",
  });
  const comment2 = await Comment.create({
    incidentId: incident._id,
    userId: user._id,
    content: "Indexing fix applied. replication lag is decreasing.",
  });

  const commentsList = await Comment.find({ incidentId: incident._id }).sort({
    createdAt: 1,
  });
  if (commentsList.length === 2) {
    console.log("✅ Success: SRE comments successfully added to the incident!");
  } else {
    console.error(
      `❌ Failed: Expected 2 comments but found ${commentsList.length}`,
    );
    process.exit(1);
  }

  // Test 3: Generate Post-Mortem Markdown
  console.log("\n--- [Test 3] Generating Post-Mortem Report ---");
  const pmIncident: PostMortemIncident = {
    id: incident._id.toString(),
    title: incident.title,
    summary: incident.summary,
    rootCause: incident.rootCause,
    impact: incident.impact,
    suggestedFix: incident.suggestedFix,
    confidence: incident.confidence,
    status: incident.status,
    createdAt: incident.createdAt.toISOString(),
    resolvedAt: incident.resolvedAt ? incident.resolvedAt.toISOString() : null,
    ttd: incident.ttd,
    ttr: incident.ttr || null,
    service: {
      name: service.name,
      environment: service.environment,
    },
    deploy: null,
  };

  const pmLogs: PostMortemLog[] = [
    {
      timestamp: new Date().toISOString(),
      level: "error",
      message: "Database connection failed during query write timeout limit",
      traceId: "tr_verify_1",
      metadata: { latency: 12000 },
    },
  ];

  const pmComments: PostMortemComment[] = commentsList.map((c) => ({
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    user: {
      username: user.username,
      email: user.email || undefined,
    },
  }));

  const postMortemMd = generatePostMortemMarkdown(
    pmIncident,
    pmLogs,
    pmComments,
  );
  console.log("Generated Markdown Excerpt:");
  console.log(postMortemMd.slice(0, 300) + "...\n[excerpt ends]");

  if (
    postMortemMd.includes("Post-Mortem Report:") &&
    postMortemMd.includes("MongoDB primary node replication lag") &&
    postMortemMd.includes("Investigating the primary replication lag")
  ) {
    console.log(
      "✅ Success: Post-mortem generated with correct metadata and SRE comments!",
    );
  } else {
    console.error("❌ Failed: Post-mortem generation verification failed.");
    process.exit(1);
  }

  // Test 4: Delete comment
  console.log("\n--- [Test 4] Deleting comment ---");
  await comment1.deleteOne();
  const commentsAfterDelete = await Comment.find({ incidentId: incident._id });
  if (commentsAfterDelete.length === 1) {
    console.log("✅ Success: Comment deleted successfully!");
  } else {
    console.error(
      `❌ Failed: Expected 1 comment after deletion but found ${commentsAfterDelete.length}`,
    );
    process.exit(1);
  }

  // Cleanup test resources
  console.log("\nCleaning up test resources...");
  await Comment.deleteMany({ incidentId: incident._id });
  await Incident.findByIdAndDelete(incident._id);
  console.log("✅ Cleanup complete.");

  console.log("\n🎉 All Week 8 backend and utility tests passed successfully!");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
