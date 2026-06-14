import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase, User, Project } from "@repo/db";
import jwt from "jsonwebtoken";
import BillingView from "./BillingView";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function BillingPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    redirect("/");
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    redirect("/");
  }

  let decoded: { userId: string };
  try {
    decoded = jwt.verify(token, jwtSecret) as { userId: string };
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

  const serializedProject = {
    id: activeProject._id.toString(),
    name: activeProject.name,
    plan: activeProject.plan || "free",
    subscriptionStatus: activeProject.subscriptionStatus || "none",
    billingProvider: activeProject.billingProvider || "none",
    stripeCustomerId: activeProject.stripeCustomerId || "",
    stripeSubscriptionId: activeProject.stripeSubscriptionId || "",
    razorpayCustomerId: activeProject.razorpayCustomerId || "",
    razorpaySubscriptionId: activeProject.razorpaySubscriptionId || "",
  };

  return <BillingView project={serializedProject} />;
}
