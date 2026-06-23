import { redirect } from "next/navigation";
import CheckoutView from "./CheckoutView";
import { PLANS } from "@/lib/plans";
import { getAuthSession } from "@/lib/auth-cache";

interface PageProps {
  searchParams: Promise<{ projectId?: string; planId?: string }>;
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const { user, projects } = await getAuthSession();

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
  const project = projects.find((p) => p._id.toString() === projectId);

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
