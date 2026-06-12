import { connectToDatabase, Log, Service, Deploy, Incident, Project } from "@repo/db";
import { generateIncidentAnalysis, LogContext, DeployContext } from "@repo/ai";
import { Types } from "mongoose";

// Setup queue and worker dependencies dynamically to avoid crash if ioredis fails to connect.
let queue: any = null;

const REDIS_URL = process.env.REDIS_URL;

async function initQueue() {
  if (REDIS_URL && !queue) {
    try {
      const { Queue, Worker } = await import("bullmq");
      const { default: IORedis } = await import("ioredis");
      
      const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
      queue = new Queue("anomaly-detection-queue", { connection });

      new Worker(
        "anomaly-detection-queue",
        async (job) => {
          const { projectId, serviceId, environment } = job.data;
          try {
            await processAnomalyDetection(projectId, serviceId, environment);
          } catch (err) {
            console.error(`[Anomaly Worker] Job ${job.id} failed:`, err);
            throw err;
          }
        },
        { connection }
      );
      console.log("[Anomaly Queue] BullMQ Queue and Worker initialized successfully.");
    } catch (err) {
      console.error("[Anomaly Queue] Failed to initialize BullMQ worker:", err);
    }
  }
}

// Proactively run initialization
initQueue().catch(err => console.error("Failed to initialize queue:", err));

/**
 * Triggers anomaly check asynchronously, offloading to BullMQ if Redis is configured
 * or running directly in the background if not.
 */
export async function triggerAnomalyCheck(
  projectId: string,
  serviceId: string,
  environment: string
): Promise<void> {
  await initQueue();
  if (queue) {
    try {
      await queue.add("check-anomaly", { projectId, serviceId, environment });
      console.log(`[Anomaly Queue] Enqueued anomaly check job for service ${serviceId}`);
      return;
    } catch (err) {
      console.warn("[Anomaly Queue] Failed to add job to queue, falling back to inline background run...", err);
    }
  }

  // Fallback: run in background promise without awaiting
  processAnomalyDetection(projectId, serviceId, environment).catch((err) => {
    console.error("[Anomaly Detection Fallback] Background execution failed:", err);
  });
}

/**
 * Main execution logic for anomaly detection. Runs a Z-score statistical check
 * and triggers LLM reasoning and Slack alert dispatching if an anomaly is confirmed.
 */
export async function processAnomalyDetection(
  projectId: string,
  serviceId: string,
  environment: string
): Promise<void> {
  await connectToDatabase();

  // Fetch Project to read custom alert configurations
  const projectDoc = await Project.findById(projectId);
  const minErrorCount = projectDoc?.minErrorCount ?? 3;
  const zScoreThreshold = projectDoc?.zScoreThreshold ?? 3.0;

  const now = new Date();
  const nowMs = now.getTime();
  const currentWindowStart = nowMs - 5 * 60 * 1000; // Last 5 minutes
  const sixtyFiveMinsAgo = nowMs - 65 * 60 * 1000;   // 65 minutes ago

  // 1. Fetch error logs for this service in the last 65 minutes
  const errorLogs = await Log.find({
    projectId: new Types.ObjectId(projectId),
    serviceId: new Types.ObjectId(serviceId),
    environment,
    level: "error",
    timestamp: { $gte: new Date(sixtyFiveMinsAgo), $lte: now },
  }).select("timestamp message level metadata traceId");

  if (errorLogs.length === 0) {
    return; // No errors, no anomaly
  }

  // 2. Count current window errors
  const currentCount = errorLogs.filter(
    (l) => l.timestamp.getTime() >= currentWindowStart
  ).length;

  // Anomaly baseline: require at least minErrorCount errors in the current 5 min window to trigger.
  // This avoids spamming alerts on isolated occurrences.
  if (currentCount < minErrorCount) {
    return; 
  }

  // 3. Segment historical data into 12 blocks of 5 minutes
  const historicalCounts: number[] = [];
  for (let i = 0; i < 12; i++) {
    const start = nowMs - (i + 2) * 5 * 60 * 1000;
    const end = nowMs - (i + 1) * 5 * 60 * 1000;
    const count = errorLogs.filter(
      (l) => l.timestamp.getTime() >= start && l.timestamp.getTime() < end
    ).length;
    historicalCounts.push(count);
  }

  // 4. Calculate Z-score
  const sum = historicalCounts.reduce((a, b) => a + b, 0);
  const mean = sum / historicalCounts.length;
  const variance =
    historicalCounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
    historicalCounts.length;
  const stdDev = Math.sqrt(variance);

  let zScore = 0;
  let isAnomalous = false;

  if (stdDev === 0) {
    // If historical baseline is completely quiet (stdDev = 0) and we suddenly get >= minErrorCount errors
    if (currentCount >= minErrorCount) {
      isAnomalous = true;
      zScore = 5.0; // High default Z-Score for spike from 0 baseline
    }
  } else {
    zScore = (currentCount - mean) / stdDev;
    if (zScore >= zScoreThreshold) {
      isAnomalous = true;
    }
  }

  if (!isAnomalous) {
    return; // No anomaly detected
  }

  console.log(
    `[Anomaly Detected] Project: ${projectId}, Service: ${serviceId}, Env: ${environment}. Z-Score: ${zScore.toFixed(
      2
    )} (Errors: ${currentCount}, Historical Avg: ${mean.toFixed(2)})`
  );

  // 5. Deduplication check: Is there already an open/investigating incident created recently?
  const recentIncident = await Incident.findOne({
    projectId: new Types.ObjectId(projectId),
    serviceId: new Types.ObjectId(serviceId),
    status: { $in: ["open", "investigating"] },
    createdAt: { $gte: new Date(nowMs - 15 * 60 * 1000) }, // last 15 minutes
  });

  const currentWindowLogs = errorLogs.filter(
    (l) => l.timestamp.getTime() >= currentWindowStart
  );

  if (recentIncident) {
    console.log(`[Anomaly Engine] Appending logs to existing incident: ${recentIncident._id}`);
    
    // Add new log IDs to relatedLogs array
    const existingLogIds = recentIncident.relatedLogs.map((id) => id.toString());
    const newLogIds = currentWindowLogs.map((l) => l._id.toString());
    const mergedLogIds = Array.from(new Set([...existingLogIds, ...newLogIds])).map(
      (id) => new Types.ObjectId(id)
    );

    recentIncident.relatedLogs = mergedLogIds;
    await recentIncident.save();
    return;
  }

  // 6. Gather context for LLM Analysis
  // Get recent deploys (preceding 30 minutes before anomaly started)
  const thirtyMinsBeforeAnomaly = currentWindowStart - 30 * 60 * 1000;
  const recentDeploys = await Deploy.find({
    projectId: new Types.ObjectId(projectId),
    serviceId: new Types.ObjectId(serviceId),
    environment,
    deployedAt: { $gte: new Date(thirtyMinsBeforeAnomaly), $lte: now },
  }).sort({ deployedAt: -1 });

  // Map to LLM structures
  const logContexts: LogContext[] = currentWindowLogs.slice(0, 15).map((l) => ({
    timestamp: l.timestamp.toISOString(),
    level: l.level,
    message: l.message,
    metadata: l.metadata,
    traceId: l.traceId,
  }));

  const deployContexts: DeployContext[] = recentDeploys.map((d) => ({
    deployedAt: d.deployedAt.toISOString(),
    commitSha: d.commitSha,
    commitMessage: d.commitMessage,
    branch: d.branch,
  }));

  // Fetch Service Name
  const service = await Service.findById(serviceId);
  const serviceName = service ? service.name : "unknown-service";

  // 7. Invoke AI reasoning pipeline
  let analysis;
  try {
    analysis = await generateIncidentAnalysis({
      serviceName,
      environment,
      detectedAt: now.toISOString(),
      anomalyMetric: `Z-Score: ${zScore.toFixed(2)}, Current error count: ${currentCount} (baseline average: ${mean.toFixed(2)})`,
      logs: logContexts,
      deploys: deployContexts,
    });
  } catch (err) {
    console.error("[Anomaly Engine] LLM Incident reasoning failed, creating baseline fallback...", err);
    analysis = {
      title: `High error volume in ${serviceName}`,
      summary: `The service "${serviceName}" encountered an unexpected error spike of ${currentCount} issues in 5 minutes.`,
      rootCause: `Exception rate exceeded normal baseline threshold.`,
      impact: `Affected service operations in ${environment} environment.`,
      suggestedFix: ["Inspect recent error logs for service exceptions.", "Verify server availability."],
      confidence: 0.5,
    };
  }

  // 8. Create Incident
  const incident = await Incident.create({
    projectId: new Types.ObjectId(projectId),
    serviceId: new Types.ObjectId(serviceId),
    title: analysis.title,
    summary: analysis.summary,
    rootCause: analysis.rootCause,
    impact: analysis.impact,
    suggestedFix: analysis.suggestedFix,
    confidence: analysis.confidence,
    status: "open",
    relatedLogs: currentWindowLogs.map((l) => l._id),
    deployId: recentDeploys[0]?._id || undefined,
    ttd: 5 * 60 * 1000,
  });

  console.log(`[Anomaly Engine] Created Incident: ${incident._id} - ${analysis.title}`);

  // 9. Dispatch Slack Webhook Alert
  const slackWebhookUrl = projectDoc?.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL;
  await dispatchSlackAlert(projectId, serviceName, environment, incident._id.toString(), analysis, slackWebhookUrl);
}

async function dispatchSlackAlert(
  projectId: string,
  serviceName: string,
  environment: string,
  incidentId: string,
  analysis: any,
  slackWebhookUrl?: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const dashboardLink = `${appUrl}/dashboard/incidents?projectId=${projectId}&incidentId=${incidentId}`;

  const slackPayload = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚨 ObservabilityOS Incident Alert",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Service:*\n\`${serviceName}\``,
          },
          {
            type: "mrkdwn",
            text: `*Environment:*\n\`${environment}\``,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Title:*\n*${analysis.title}*`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*AI Analysis Summary:*\n${analysis.summary}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Root Cause:*\n${analysis.rootCause}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Suggested Troubleshooting Steps:*\n${analysis.suggestedFix
            .map((step: string, idx: number) => `${idx + 1}. ${step}`)
            .join("\n")}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Investigate Incident",
              emoji: true,
            },
            style: "danger",
            url: dashboardLink,
            action_id: "view_incident_dashboard",
          },
        ],
      },
    ],
  };

  if (slackWebhookUrl) {
    try {
      const response = await fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackPayload),
      });

      if (!response.ok) {
        console.error(`[Slack Webhook] Failed with status ${response.status}: ${await response.text()}`);
      } else {
        console.log(`[Slack Webhook] Dispatched incident alert for incident ${incidentId}`);
      }
    } catch (err) {
      console.error("[Slack Webhook] Connection error:", err);
    }
  } else {
    console.log("\n--- [Slack Alert Payload Logged (No Webhook Destination Configured)] ---");
    console.log(JSON.stringify(slackPayload, null, 2));
    console.log("--------------------------------------------------------------------\n");
  }
}
