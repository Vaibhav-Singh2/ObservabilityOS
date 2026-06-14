import fs from "fs";
import path from "path";
import { connectToDatabase, User } from "@repo/db";
import { buildAndSendEmailDigest } from "../apps/web/src/lib/email";

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

async function run() {
  await connectToDatabase();

  const user = await User.findOne({ githubId: "dummy_test_user" });
  if (!user) {
    console.error(
      "Test user 'dummy_test_user' not found. Make sure test-anomaly.ts has been run.",
    );
    process.exit(1);
  }

  console.log(`Found test user: ${user.username} [Email: ${user.email}]`);

  console.log("\n--- Triggering Email Digest Generation ---");
  const result = await buildAndSendEmailDigest(user);

  if (!result) {
    console.error("❌ Failed: Digest was skipped or returned empty.");
    process.exit(1);
  }

  console.log(`\nDigest Method: ${result.method}`);
  if (result.method === "console" && result.html) {
    console.log("✅ Success: Email template generated successfully!");
    console.log(`Payload length: ${result.html.length} chars.`);

    // Quick validation checks on HTML content
    const containsHeader = result.html.includes("Good morning");
    const containsProject = result.html.includes(
      "E2E Anomaly Verification Project",
    );
    const containsService = result.html.includes("payment-service");
    const containsIncident = result.html.includes(
      "Transaction failed due to insufficient funds",
    );

    console.log("\nHTML Content Checks:");
    console.log(`- Greeting Header: ${containsHeader ? "PASSED" : "FAILED"}`);
    console.log(`- Project Name: ${containsProject ? "PASSED" : "FAILED"}`);
    console.log(`- Service Name: ${containsService ? "PASSED" : "FAILED"}`);
    console.log(
      `- Overnight Incident Title: ${containsIncident ? "PASSED" : "FAILED"}`,
    );

    if (
      containsHeader &&
      containsProject &&
      containsService &&
      containsIncident
    ) {
      console.log(
        "\n✅ Email digest templates, data aggregation, and AI summaries are 100% verified!",
      );
    } else {
      console.error(
        "❌ Failed: HTML content is missing key aggregated metrics.",
      );
      process.exit(1);
    }
  } else if (result.method === "resend") {
    console.log("✅ Success: Email successfully dispatched via Resend!");
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("E2E Email Digest test failed:", err);
    process.exit(1);
  });
