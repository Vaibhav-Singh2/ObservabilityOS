import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  connectToDatabase,
  User,
  Project,
  Service,
  Log,
  Incident,
  Deploy,
} from "@repo/db";
import jwt from "jsonwebtoken";
import ProjectDashboardView, {
  SerializedService,
  SerializedDeployment,
} from "./ProjectDashboardView";
import ZeroStateView from "./ZeroStateView";
import { getCache, setCache } from "@/lib/redis";
import { subDays } from "date-fns";

function getStart24h() {
  return subDays(new Date(), 1);
}

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    redirect("/");
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    redirect("/");
  }

  let decoded: { userId: string } & jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
    } & jwt.JwtPayload;
  } catch {
    redirect("/");
  }

  await connectToDatabase();
  const user = await User.findById(decoded.userId);
  if (!user) {
    redirect("/");
  }

  // Await searchParams as required by Next 15+
  const resolvedSearchParams = await searchParams;
  const projects = await Project.find({ ownerId: user._id }).sort({
    createdAt: -1,
  });

  if (projects.length === 0) {
    return <ZeroStateView />;
  }

  const activeProjectId =
    resolvedSearchParams.projectId || projects[0]?._id.toString();
  const activeProject =
    projects.find((p) => p._id.toString() === activeProjectId) || projects[0];

  if (!activeProject) {
    return <ZeroStateView />;
  }

  const cacheKey = `dashboard:project:${activeProjectId}`;
  const cachedDashboard = await getCache<{
    services: SerializedService[];
    deployments: SerializedDeployment[];
  }>(cacheKey);

  let serializedServices: SerializedService[] = [];
  let serializedDeployments: SerializedDeployment[] = [];

  if (cachedDashboard) {
    serializedServices = cachedDashboard.services;
    serializedDeployments = cachedDashboard.deployments;
  } else {
    // Fetch all services for the active project
    const services = await Service.find({ projectId: activeProject._id }).sort({
      name: 1,
      environment: 1,
    });

    // Calculate 24h statistics using aggregation
    const start24h = getStart24h();
    const stats = await Log.aggregate([
      {
        $match: {
          projectId: activeProject._id,
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

    // Fetch open/investigating incidents for this project
    const openIncidents = await Incident.find({
      projectId: activeProject._id,
      status: { $in: ["open", "investigating"] },
    });

    // Fetch recent deployments
    const recentDeploys = await Deploy.find({ projectId: activeProject._id })
      .populate("serviceId")
      .sort({ deployedAt: -1 })
      .limit(10);

    // Create maps for efficient lookups
    const statsMap = new Map(stats.map((s) => [s._id.toString(), s]));
    const openIncidentsServiceIds = new Set(
      openIncidents.map((inc) => inc.serviceId.toString()),
    );

    serializedServices = services.map((s) => {
      const serviceStats = statsMap.get(s._id.toString()) || {
        totalLogs: 0,
        errorLogs: 0,
        avgLatency: null,
      };
      const totalLogs = serviceStats.totalLogs;
      const errorLogs = serviceStats.errorLogs;
      const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;
      const availability =
        totalLogs > 0 ? ((totalLogs - errorLogs) / totalLogs) * 100 : 100;
      const avgLatency =
        serviceStats.avgLatency !== null &&
        serviceStats.avgLatency !== undefined
          ? Math.round(serviceStats.avgLatency as number)
          : null;

      // Determine health status:
      // Incident (red) if there is an active open incident for this service
      // Warning (yellow) if error rate > 5% (and totalLogs > 0)
      // Healthy (green) otherwise
      let healthStatus: "healthy" | "warning" | "incident" = "healthy";
      if (openIncidentsServiceIds.has(s._id.toString())) {
        healthStatus = "incident";
      } else if (totalLogs > 0 && errorRate > 5) {
        healthStatus = "warning";
      }

      return {
        id: s._id.toString(),
        name: s.name,
        environment: s.environment,
        createdAt: s.createdAt.toISOString(),
        totalLogs,
        errorRate: Number(errorRate.toFixed(2)),
        availability: Number(availability.toFixed(2)),
        avgLatency,
        healthStatus,
      };
    });

    serializedDeployments = recentDeploys.map((d) => {
      const serviceObj = d.serviceId as unknown as {
        _id: { toString: () => string };
        name: string;
      } | null;
      const serviceName = serviceObj?.name || "unknown-service";
      const serviceIdStr = serviceObj?._id
        ? serviceObj._id.toString()
        : d.serviceId?.toString() || "";
      return {
        id: d._id.toString(),
        serviceId: serviceIdStr,
        serviceName,
        commitSha: d.commitSha,
        commitMessage: d.commitMessage,
        branch: d.branch,
        environment: d.environment,
        deployedAt: d.deployedAt ? d.deployedAt.toISOString() : null,
      };
    });

    // Cache the serialized results for 5 minutes (300 seconds)
    await setCache(
      cacheKey,
      { services: serializedServices, deployments: serializedDeployments },
      300,
    );
  }

  const serializedProject = {
    id: activeProject._id.toString(),
    name: activeProject.name,
    apiKey: activeProject.apiKey,
  };

  return (
    <ProjectDashboardView
      project={serializedProject}
      services={serializedServices}
      deployments={serializedDeployments}
    />
  );
}
