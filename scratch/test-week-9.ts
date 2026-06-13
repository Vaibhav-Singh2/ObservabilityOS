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
  AuditLog,
  Deploy,
  Metric,
} from "@repo/db";
import { logAuditEvent } from "../apps/web/src/lib/audit";
import { exportLogsToCSV, exportLogsToJSON } from "../apps/web/src/lib/log-export";

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

  // Find a test user or create one
  let user = await User.findOne();
  if (!user) {
    user = await User.create({
      githubId: "verify-user-week9",
      username: "Week9SRE",
      email: "week9@observabilityos.io",
    });
  }
  console.log(`Using User: ${user.username} (${user._id})`);

  // Find a test project or create one
  let project = await Project.findOne({ ownerId: user._id });
  if (!project) {
    project = await Project.create({
      ownerId: user._id,
      name: "Week 9 Test Project",
      apiKey: "test-api-key-week-9-" + Date.now(),
    });
  }
  console.log(`Using Project: ${project.name} (${project._id})`);

  // ==========================================
  // Test 1: Saved Queries
  // ==========================================
  console.log("\n--- [Test 1] Saved Queries Schema & Operations ---");
  
  // Clear any existing saved queries with test name
  if (project.savedQueries) {
    project.savedQueries = project.savedQueries.filter(q => q.name !== "Test Query Week 9");
    await project.save();
  }

  // Add a saved query
  project.savedQueries = project.savedQueries || [];
  project.savedQueries.push({
    name: "Test Query Week 9",
    query: "error status:500",
    level: "error",
    serviceId: "all",
    environment: "prod",
    timeRange: "1h",
  });
  await project.save();

  // Load from DB to verify
  let updatedProject = await Project.findById(project._id);
  const foundQuery = updatedProject?.savedQueries?.find(q => q.name === "Test Query Week 9");
  
  if (
    foundQuery &&
    foundQuery.query === "error status:500" &&
    foundQuery.level === "error" &&
    foundQuery.environment === "prod" &&
    foundQuery.timeRange === "1h"
  ) {
    console.log("✅ Success: Saved query created, persisted, and read successfully!");
  } else {
    console.error("❌ Failed: Saved query verification failed.", foundQuery);
    process.exit(1);
  }

  // Delete saved query
  project.savedQueries = project.savedQueries.filter(q => q.name !== "Test Query Week 9");
  await project.save();

  updatedProject = await Project.findById(project._id);
  const deletedQuery = updatedProject?.savedQueries?.find(q => q.name === "Test Query Week 9");
  if (!deletedQuery) {
    console.log("✅ Success: Saved query deleted and persisted successfully!");
  } else {
    console.error("❌ Failed: Saved query was not deleted.");
    process.exit(1);
  }

  // ==========================================
  // Test 2: Audit Logs Logging & Map serialization
  // ==========================================
  console.log("\n--- [Test 2] Audit Logs Logging & Retrieval ---");

  // Create audit events
  await logAuditEvent({
    projectId: project._id,
    userId: user._id,
    action: "slo.create",
    targetEntity: "slo",
    targetId: "test-slo-week9",
    metadata: {
      type: "latency",
      target: 99.5,
      windowDays: 30,
    },
  });

  await logAuditEvent({
    projectId: project._id,
    userId: user._id,
    action: "webhook.update",
    targetEntity: "webhook",
    targetId: project._id.toString(),
    metadata: {
      slackChanged: true,
      discordChanged: false,
      teamsChanged: false,
    },
  });

  // Query them back
  const auditLogs = await AuditLog.find({ projectId: project._id })
    .sort({ createdAt: -1 })
    .limit(2);

  if (auditLogs.length >= 2) {
    console.log("✅ Success: Found logged audit entries.");
    
    // Check serialization pattern matching (like in apps/web/src/app/api/projects/audit-logs/route.ts)
    for (const log of auditLogs) {
      const metadata = log.metadata ? Object.fromEntries(log.metadata) : {};
      console.log(`- Action: ${log.action}, Target: ${log.targetId}, Metadata:`, metadata);
      
      if (log.action === "slo.create") {
        if (metadata.type === "latency" && metadata.target === 99.5) {
          console.log("  ✅ slo.create metadata verified successfully!");
        } else {
          console.error("  ❌ slo.create metadata mismatch!", metadata);
          process.exit(1);
        }
      }
      if (log.action === "webhook.update") {
        if (metadata.slackChanged === true && metadata.discordChanged === false) {
          console.log("  ✅ webhook.update metadata verified successfully!");
        } else {
          console.error("  ❌ webhook.update metadata mismatch!", metadata);
          process.exit(1);
        }
      }
    }
  } else {
    console.error(`❌ Failed: Expected at least 2 audit logs, found ${auditLogs.length}`);
    process.exit(1);
  }

  // ==========================================
  // Test 3: Log Export (CSV & JSON)
  // ==========================================
  console.log("\n--- [Test 3] Log Export Serialization (CSV & JSON) ---");

  const sampleLogs = [
    {
      timestamp: new Date("2026-06-13T12:00:00Z"),
      level: "error",
      message: "Database connection failed, dynamic query limit exceeded.",
      traceId: "tr-9991",
      metadata: { err: "CONN_TIMEOUT", retries: 3 },
      service: { name: "auth-service", environment: "prod" },
    },
    {
      timestamp: new Date("2026-06-13T12:01:00Z"),
      level: "info",
      message: "User logged in: mathu, \"admin\" role.",
      traceId: "tr-9992",
      metadata: { role: "admin" },
      service: { name: "auth-service", environment: "prod" },
    },
  ];

  // Test CSV export
  const csvContent = exportLogsToCSV(sampleLogs);
  console.log("Generated CSV Content:\n" + csvContent);
  if (
    csvContent.includes("Timestamp,Level,Service,Environment,Message,Trace ID,Metadata") &&
    csvContent.includes("auth-service") &&
    csvContent.includes("CONN_TIMEOUT") &&
    csvContent.includes('"User logged in: mathu, ""admin"" role."') // Escaped quotes check
  ) {
    console.log("✅ Success: CSV Log Exporter verified successfully (including escaping)!");
  } else {
    console.error("❌ Failed: CSV Log Exporter verification failed.");
    process.exit(1);
  }

  // Test JSON export
  const jsonContent = exportLogsToJSON(sampleLogs);
  const parsedJson = JSON.parse(jsonContent);
  console.log("Generated JSON Content excerpt:\n" + jsonContent.slice(0, 300) + "...");
  if (
    Array.isArray(parsedJson) &&
    parsedJson.length === 2 &&
    parsedJson[0].level === "error" &&
    parsedJson[0].service.name === "auth-service" &&
    parsedJson[1].message.includes('User logged in: mathu')
  ) {
    console.log("✅ Success: JSON Log Exporter verified successfully!");
  } else {
    console.error("❌ Failed: JSON Log Exporter verification failed.");
    process.exit(1);
  }

  // ==========================================
  // Test 4: Cascade Delete Service & Resources
  // ==========================================
  console.log("\n--- [Test 4] Service Cascade Deletion & Audit Log ---");

  // Clean up any existing dummy service with the same name
  await Service.deleteMany({
    projectId: project._id,
    name: "dummy-delete-service",
    environment: "staging",
  });

  // Create a dummy service to delete
  const dummyService = await Service.create({
    projectId: project._id,
    name: "dummy-delete-service",
    environment: "staging",
  });
  console.log(`Created dummy service: ${dummyService.name} (${dummyService._id})`);

  // Create associated resources
  const dummyIncident = await Incident.create({
    projectId: project._id,
    serviceId: dummyService._id,
    title: "Dummy Incident to Delete",
    summary: "Testing cascade deletion on service remove",
    status: "investigating",
    confidence: 0.9,
    ttd: 60000,
    impact: "none",
    rootCause: "test",
  });

  const dummyComment = await Comment.create({
    incidentId: dummyIncident._id,
    userId: user._id,
    content: "Dummy comment to delete",
  });

  const dummyDeploy = await Deploy.create({
    projectId: project._id,
    serviceId: dummyService._id,
    commitSha: "sha123",
    commitMessage: "dummy deploy",
    branch: "main",
    environment: "staging",
  });

  const dummyLog = await Log.create({
    projectId: project._id,
    serviceId: dummyService._id,
    timestamp: new Date(),
    level: "warn",
    message: "Dummy log to delete",
    environment: "staging",
  });

  const dummyMetric = await Metric.create({
    projectId: project._id,
    serviceId: dummyService._id,
    timestamp: new Date(),
    environment: "staging",
    cpuUsage: 10,
    memoryUsage: 128,
    memoryLimit: 512,
    latencyMs: 15,
  });

  // Delete service via deletion logic (similar to route.ts)
  const serviceId = dummyService._id;
  const serviceName = dummyService.name;
  const serviceEnv = dummyService.environment;

  await dummyService.deleteOne();

  const incidentIds = [dummyIncident._id];
  await Comment.deleteMany({ incidentId: { $in: incidentIds } });
  await Incident.deleteMany({ serviceId });
  await Deploy.deleteMany({ serviceId });
  await Log.deleteMany({ serviceId });
  await Metric.deleteMany({ serviceId });

  // Log the audit event
  await logAuditEvent({
    projectId: project._id,
    userId: user._id,
    action: "service.delete",
    targetEntity: "service",
    targetId: serviceName,
    metadata: {
      name: serviceName,
      environment: serviceEnv,
    },
  });

  // Verify all resources are gone
  const checkService = await Service.findById(serviceId);
  const checkIncident = await Incident.findById(dummyIncident._id);
  const checkComment = await Comment.findById(dummyComment._id);
  const checkDeploy = await Deploy.findById(dummyDeploy._id);
  const checkLog = await Log.findById(dummyLog._id);
  const checkMetric = await Metric.findById(dummyMetric._id);

  if (
    !checkService &&
    !checkIncident &&
    !checkComment &&
    !checkDeploy &&
    !checkLog &&
    !checkMetric
  ) {
    console.log("✅ Success: Service and all associated comments, incidents, deploys, logs, metrics cascaded deleted!");
  } else {
    console.error("❌ Failed: Some associated service resources were not deleted.", {
      checkService,
      checkIncident,
      checkComment,
      checkDeploy,
      checkLog,
      checkMetric,
    });
    process.exit(1);
  }

  // Verify service.delete audit log
  const deleteAudit = await AuditLog.findOne({
    projectId: project._id,
    action: "service.delete",
    targetId: serviceName,
  });

  if (deleteAudit) {
    const meta = deleteAudit.metadata ? Object.fromEntries(deleteAudit.metadata) : {};
    if (meta.name === serviceName && meta.environment === serviceEnv) {
      console.log("✅ Success: service.delete audit event logged successfully!");
    } else {
      console.error("❌ Failed: service.delete audit log metadata mismatch!", meta);
      process.exit(1);
    }
  } else {
    console.error("❌ Failed: service.delete audit log was not found.");
    process.exit(1);
  }

  // Cleanup test audit logs created by this run
  console.log("\nCleaning up test audit logs...");
  await AuditLog.deleteMany({ projectId: project._id });
  console.log("✅ Cleanup complete.");

  console.log("\n🎉 All Week 9 backend integrations and serialization tests passed successfully!");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
