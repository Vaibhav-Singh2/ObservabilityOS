import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase, User, Project, Service, Log, Incident } from "@repo/db";
import jwt from "jsonwebtoken";
import ProjectDashboardView from "./ProjectDashboardView";
import ZeroStateView from "./ZeroStateView";

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

  let decoded: any;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (e) {
    redirect("/");
  }

  await connectToDatabase();
  const user = await User.findById(decoded.userId);
  if (!user) {
    redirect("/");
  }

  // Await searchParams as required by Next 15+
  const resolvedSearchParams = await searchParams;
  const projects = await Project.find({ ownerId: user._id }).sort({ createdAt: -1 });

  if (projects.length === 0) {
    return <ZeroStateView />;
  }

  const activeProjectId = resolvedSearchParams.projectId || projects[0]?._id.toString();
  const activeProject = projects.find(p => p._id.toString() === activeProjectId) || projects[0];

  if (!activeProject) {
    return <ZeroStateView />;
  }

  // Fetch all services for the active project
  const services = await Service.find({ projectId: activeProject._id }).sort({ name: 1, environment: 1 });

  // Calculate 24h statistics using aggregation
  const start24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stats = await Log.aggregate([
    {
      $match: {
        projectId: activeProject._id,
        timestamp: { $gte: start24h }
      }
    },
    {
      $group: {
        _id: "$serviceId",
        totalLogs: { $sum: 1 },
        errorLogs: {
          $sum: {
            $cond: [{ $eq: ["$level", "error"] }, 1, 0]
          }
        },
        avgLatency: {
          $avg: {
            $ifNull: ["$metadata.latencyMs", "$metadata.latency"]
          }
        }
      }
    }
  ]);

  // Fetch open/investigating incidents for this project
  const openIncidents = await Incident.find({
    projectId: activeProject._id,
    status: { $in: ["open", "investigating"] }
  });

  // Create maps for efficient lookups
  const statsMap = new Map(stats.map(s => [s._id.toString(), s]));
  const openIncidentsServiceIds = new Set(openIncidents.map(inc => inc.serviceId.toString()));

  const serializedProject = {
    id: activeProject._id.toString(),
    name: activeProject.name,
    apiKey: activeProject.apiKey,
  };

  const serializedServices = services.map(s => {
    const serviceStats = statsMap.get(s._id.toString()) || { totalLogs: 0, errorLogs: 0, avgLatency: null };
    const totalLogs = serviceStats.totalLogs;
    const errorLogs = serviceStats.errorLogs;
    const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;
    const availability = totalLogs > 0 ? ((totalLogs - errorLogs) / totalLogs) * 100 : 100;
    const avgLatency = serviceStats.avgLatency !== null && serviceStats.avgLatency !== undefined
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

  return (
    <ProjectDashboardView
      project={serializedProject}
      services={serializedServices}
    />
  );
}
