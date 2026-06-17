import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase, User, Project } from "@repo/db";
import jwt from "jsonwebtoken";
import CheckoutView from "./CheckoutView";
import { PLANS } from "@/lib/plans";

interface PageProps {
  searchParams: Promise<{ projectId?: string; planId?: string }>;
}

export default async function CheckoutPage({ searchParams }: PageProps) {
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
  const planId = resolvedSearchParams.planId;
  const projectId = resolvedSearchParams.projectId;

  if (!planId || !projectId) {
    redirect("/dashboard/billing");
  }

  // Validate planId (Only Pro uses checkout flow)
  const planDetails = PLANS.find((p) => p.id === planId && p.id === "pro");
  if (!planDetails) {
    redirect(`/dashboard/billing?projectId=${projectId}`);
  }

  // Fetch target project
  const project = await Project.findOne({
    _id: projectId,
    ownerId: user._id,
  });

  if (!project) {
    redirect("/dashboard/billing");
  }

  // Self-host users don't use billing
  if (
    !process.env.RAZORPAY_KEY_ID ||
    !process.env.RAZORPAY_KEY_SECRET ||
    project.plan === "self-host"
  ) {
    redirect(`/dashboard?projectId=${projectId}`);
  }

  const serializedProject = {
    id: project._id.toString(),
    name: project.name,
    plan: project.plan || "free",
    subscriptionStatus: project.subscriptionStatus || "none",
    billingProvider: project.billingProvider || "none",
  };

  return <CheckoutView project={serializedProject} planId={planId} />;
}
