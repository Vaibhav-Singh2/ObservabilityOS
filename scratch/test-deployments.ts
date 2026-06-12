/// <reference types="node" />

import fs from "fs";
import path from "path";
import { connectToDatabase, Project, Service, Deploy, User } from "@repo/db";

// Manual dotenv loading from the web app workspace
try {
  const envPath = path.join(process.cwd(), "apps/web/.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index > 0) {
        const key = trimmed.slice(0, index).trim();
        const val = trimmed.slice(index + 1).trim();
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.warn("Could not read .env file:", e);
}

const TEST_API_KEY = "obs_sk_test_api_key_987654";

async function verify() {
  console.log("Connecting to database at:", process.env.MONGODB_URI);
  await connectToDatabase();

  // 1. Setup Test User and Project (using the same user/project as ingestion tests)
  console.log("\n--- [Step 1] Setting up project credentials ---");
  let project = await Project.findOne({ apiKey: TEST_API_KEY });
  if (!project) {
    let user = await User.findOne({ githubId: "dummy_test_user" });
    if (!user) {
      user = await User.create({
        githubId: "dummy_test_user",
        username: "testuser",
        email: "testuser@example.com",
      });
    }
    project = await Project.create({
      ownerId: user._id,
      name: "E2E Verification Project",
      apiKey: TEST_API_KEY,
    });
  }
  console.log(`Using project ID: ${project._id}`);

  // 2. Clean up past deployments for this project
  await Deploy.deleteMany({ projectId: project._id });

  // 3. Trigger Deployment Webhook
  console.log("\n--- [Step 2] Triggering GitHub Deployment Webhook ---");
  const payload = {
    service: "payment-service",
    environment: "staging",
    commitSha: "a9bfdc145e67923f114c0a56e9c9d901f654b9d0",
    commitMessage: "feat(payment): integrate stripe payment checkout intent flow",
    branch: "main",
    metadata: {
      ciBuildId: "run_88123",
      actor: "dev-builder"
    }
  };

  const endpoint = "http://127.0.0.1:3000/api/webhooks/github";
  console.log(`Sending POST request to ${endpoint}...`);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TEST_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json();
    console.log("Webhook Response:", JSON.stringify(body, null, 2));

    if (!response.ok) {
      throw new Error(`Webhook returned status ${response.status}: ${JSON.stringify(body)}`);
    }
  } catch (err) {
    console.error("Failed to connect to API server. Make sure Next.js dev server is running on port 3000.", err);
    process.exit(1);
  }

  // 4. Verify in DB
  console.log("\n--- [Step 3] Verifying deployment record in MongoDB ---");
  // Allow brief moment to save
  await new Promise((resolve) => setTimeout(resolve, 500));

  const deploys = await Deploy.find({ projectId: project._id }).populate("serviceId");
  console.log(`Found ${deploys.length} deployments in DB:`);
  for (const d of deploys) {
    console.log(`- ID: ${d._id}`);
    console.log(`  Service: ${(d.serviceId as any)?.name} (Env: ${d.environment})`);
    console.log(`  Commit SHA: ${d.commitSha}`);
    console.log(`  Message: ${d.commitMessage}`);
    console.log(`  Branch: ${d.branch}`);
    console.log(`  Deployed At: ${d.deployedAt.toISOString()}`);
  }

  if (deploys.length === 1 && deploys[0]?.commitSha === payload.commitSha) {
    console.log("\n✅ E2E Webhook Deployment Tracking Verification Successful!");
  } else {
    console.log("\n❌ E2E Webhook Deployment Tracking Verification Failed.");
  }
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed with error:", err);
    process.exit(1);
  });
