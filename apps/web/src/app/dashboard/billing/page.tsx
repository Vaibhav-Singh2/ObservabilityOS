import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  connectToDatabase,
  User,
  Project,
  Service,
  type IProject,
} from "@repo/db";
import jwt from "jsonwebtoken";
import BillingView from "./BillingView";
import { getLogVolumeUsage } from "@/lib/quota";

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

  const isSelfHosted = process.env.NEXT_PUBLIC_SELF_HOSTED === "true";

  // Self-host users get redirected — billing is cloud-only
  if (isSelfHosted) {
    // Auto-upgrade to self-host plan before redirecting
    if (activeProject.plan !== "self-host") {
      activeProject.plan = "self-host";
      activeProject.subscriptionStatus = "none";
      activeProject.billingProvider = "none";
      activeProject.stripeCustomerId = undefined;
      activeProject.stripeSubscriptionId = undefined;
      activeProject.razorpayCustomerId = undefined;
      activeProject.razorpaySubscriptionId = undefined;
      (activeProject as IProject).subscriptionEndsAt = undefined;
      await activeProject.save();
      console.log(
        `[Self-Host] Auto-upgraded project ${activeProject._id} to self-host plan.`,
      );
    }
    redirect(`/dashboard?projectId=${activeProject._id}`);
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
    subscriptionEndsAt: (
      activeProject as IProject
    ).subscriptionEndsAt?.toISOString(),
  };

  const serviceCount = await Service.countDocuments({
    projectId: activeProject._id,
  });
  let logVolumeBytes = 0;
  try {
    logVolumeBytes = await getLogVolumeUsage(activeProject._id.toString());
  } catch (err) {
    console.error("Failed to fetch log volume usage:", err);
  }

  const isSandbox =
    !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;

  const usage = {
    serviceCount,
    logVolumeBytes,
  };

  return (
    <BillingView
      project={serializedProject}
      usage={usage}
      isSandbox={isSandbox}
    />
  );
}
