import { getAuthSession } from "@/lib/auth-cache";
import DashboardShell from "./DashboardShell";

export const metadata = {
  title: "Dashboard — ObservabilityOS",
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const { user, projects } = await getAuthSession();

  const serializedProjects = projects.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    apiKey: p.apiKey,
  }));

  const userObj = {
    username: user.username,
    avatarUrl: user.avatarUrl || "",
    email: user.email || "",
  };

  return (
    <DashboardShell user={userObj} projects={serializedProjects}>
      {children}
    </DashboardShell>
  );
}
