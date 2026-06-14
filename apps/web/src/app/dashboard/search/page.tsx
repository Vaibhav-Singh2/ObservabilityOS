import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase, User, Project, Service, Log } from "@repo/db";
import jwt from "jsonwebtoken";
import SearchView from "./SearchView";
import { subDays } from "date-fns";

function getStart24h() {
  return subDays(new Date(), 1);
}

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
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
    decoded = jwt.verify(token, jwtSecret) as { userId: string } & jwt.JwtPayload;
  } catch {
    redirect("/");
  }

  await connectToDatabase();
  const user = await User.findById(decoded.userId);
  if (!user) {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;
  const projects = await Project.find({ ownerId: user._id }).sort({
    createdAt: -1,
  });

  if (projects.length === 0) {
    redirect("/dashboard");
  }

  const activeProjectId =
    resolvedSearchParams.projectId || projects[0]?._id.toString();
  const activeProject =
    projects.find((p) => p._id.toString() === activeProjectId) || projects[0];

  if (!activeProject) {
    redirect("/dashboard");
  }

  // Fetch services to populate filter options
  const services = await Service.find({ projectId: activeProject._id }).sort({
    name: 1,
  });

  // Fetch default logs for the last 24h to display immediately (limit 100)
  const start24h = getStart24h();
  const initialLogs = await Log.find({
    projectId: activeProject._id,
    timestamp: { $gte: start24h },
  })
    .populate("serviceId", "name environment")
    .sort({ timestamp: -1 })
    .limit(100);

  // Serialize objects for safe boundary crossing
  const serializedProject = {
    id: activeProject._id.toString(),
    name: activeProject.name,
    apiKey: activeProject.apiKey,
  };

  const serializedServices = services.map((s) => ({
    id: s._id.toString(),
    name: s.name,
    environment: s.environment,
  }));

  const serializedLogs = initialLogs.map((l) => {
    const s = l.serviceId as unknown as { _id: { toString: () => string }; name: string; environment: string } | null;
    return {
      id: l._id.toString(),
      timestamp: l.timestamp.toISOString(),
      level: l.level,
      message: l.message,
      traceId: l.traceId || null,
      metadata: l.metadata || {},
      service: s
        ? { id: s._id.toString(), name: s.name, environment: s.environment }
        : null,
    };
  });

  const serializedSavedQueries = activeProject.savedQueries
    ? activeProject.savedQueries.map((q) => ({
        name: q.name,
        query: q.query || "",
        level: q.level || "all",
        serviceId: q.serviceId || "all",
        environment: q.environment || "all",
        timeRange: q.timeRange || "24h",
      }))
    : [];

  return (
    <SearchView
      project={serializedProject}
      services={serializedServices}
      initialLogs={serializedLogs}
      savedQueries={serializedSavedQueries}
    />
  );
}
