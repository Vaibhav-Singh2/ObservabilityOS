import { NextResponse } from "next/server";
import { connectToDatabase, Project, Service, Log } from "@repo/db";
import { dispatchMultiChannelSloAlert } from "@/lib/alerts";

export async function GET(request: Request) {
  try {
    // 1. Authenticate Cron Trigger
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get("Authorization");
    const secretParam = searchParams.get("secret");

    const expectedSecret = process.env.CRON_SECRET || "dev_cron_secret_123";

    const isAuthorized = 
      authHeader === `Bearer ${expectedSecret}` || 
      secretParam === expectedSecret || 
      process.env.NODE_ENV === "development";

    if (!isAuthorized) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized trigger call" } },
        { status: 401 }
      );
    }

    // 2. Connect to Database
    await connectToDatabase();

    // 3. Find all services that have configured SLOs
    const services = await Service.find({ slos: { $exists: true, $not: { $size: 0 } } });
    console.log(`[SLO Monitoring] Found ${services.length} services with configured SLOs.`);

    const alertsDispatched = [];
    const now = new Date();

    for (const service of services) {
      // Find associated project to retrieve webhook URLs
      const project = await Project.findById(service.projectId);
      if (!project) {
        console.warn(`[SLO Monitoring] Project ${service.projectId} not found for service ${service.name}. Skipping.`);
        continue;
      }

      let hasChanges = false;
      const slos = service.slos || [];

      for (const slo of slos) {
        const startTime = new Date(now.getTime() - slo.windowDays * 24 * 60 * 60 * 1000);
        let totalCount = 0;
        let badCount = 0;

        if (slo.type === "availability") {
          // Count total logs in window
          totalCount = await Log.countDocuments({
            projectId: project._id,
            serviceId: service._id,
            environment: service.environment,
            timestamp: { $gte: startTime }
          });

          // Count error logs in window
          badCount = await Log.countDocuments({
            projectId: project._id,
            serviceId: service._id,
            environment: service.environment,
            level: "error",
            timestamp: { $gte: startTime }
          });
        } else if (slo.type === "latency") {
          const threshold = slo.latencyThresholdMs ?? 500;

          // Count logs with latency metadata
          totalCount = await Log.countDocuments({
            projectId: project._id,
            serviceId: service._id,
            environment: service.environment,
            timestamp: { $gte: startTime },
            $or: [
              { "metadata.latencyMs": { $exists: true } },
              { "metadata.latency": { $exists: true } }
            ]
          });

          // Count logs exceeding threshold
          badCount = await Log.countDocuments({
            projectId: project._id,
            serviceId: service._id,
            environment: service.environment,
            timestamp: { $gte: startTime },
            $or: [
              { "metadata.latencyMs": { $gt: threshold } },
              { "metadata.latency": { $gt: threshold } }
            ]
          });
        }

        const goodCount = totalCount - badCount;
        const compliance = totalCount > 0 ? (goodCount / totalCount) * 100 : 100.0;
        
        // Error Budget Calculations
        const allowedFailureRate = (100 - slo.target) / 100;
        const totalBudget = totalCount * allowedFailureRate;
        const budgetRemaining = totalBudget - badCount;
        const budgetRemainingPercent = totalBudget > 0 ? (budgetRemaining / totalBudget) * 100 : 100.0;

        // Determine current status
        let currentStatus: "healthy" | "warning" | "breached" = "healthy";
        if (budgetRemaining < 0 || compliance < slo.target) {
          currentStatus = "breached";
        } else if (budgetRemainingPercent < 50) {
          currentStatus = "warning";
        }

        // Get previous status (default to healthy if undefined)
        const previousStatus = slo.status || "healthy";

        // Check for transition
        if (currentStatus !== previousStatus) {
          console.log(`[SLO Monitoring] Transition detected on service ${service.name} for SLO "${slo.name}": ${previousStatus} -> ${currentStatus}`);
          
          const alertPayload = {
            projectId: project._id.toString(),
            serviceId: service._id.toString(),
            serviceName: service.name,
            environment: service.environment,
            sloName: slo.name,
            sloType: slo.type,
            latencyThresholdMs: slo.latencyThresholdMs,
            target: slo.target,
            compliance: Number(compliance.toFixed(3)),
            budgetRemaining: Number(budgetRemaining.toFixed(1)),
            budgetRemainingPercent: Number(budgetRemainingPercent.toFixed(1)),
            previousStatus,
            currentStatus
          };

          // Dispatch multi-channel alerts
          const dispatchResult = await dispatchMultiChannelSloAlert(project, alertPayload);
          
          alertsDispatched.push({
            serviceName: service.name,
            sloName: slo.name,
            transition: `${previousStatus} -> ${currentStatus}`,
            dispatch: dispatchResult
          });

          // Update persisted status
          slo.status = currentStatus;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await service.save();
      }
    }

    return NextResponse.json({
      success: true,
      servicesChecked: services.length,
      alertsDispatchedCount: alertsDispatched.length,
      alertsDispatched
    });
  } catch (error) {
    console.error("Cron SLO Monitoring Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Cron SLO monitoring trigger failed" } },
      { status: 500 }
    );
  }
}
