import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase, User, Project } from "@repo/db";
import jwt from "jsonwebtoken";
import DashboardShell from "./DashboardShell";

export const metadata = {
  title: "Dashboard — ObservabilityOS",
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
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

  const projects = await Project.find({ ownerId: user._id }).sort({ createdAt: -1 });
  const serializedProjects = projects.map(p => ({
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
