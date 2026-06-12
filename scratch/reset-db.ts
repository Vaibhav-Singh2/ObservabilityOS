import { connectToDatabase } from "@repo/db";
import mongoose from "mongoose";

// Manual dotenv loading
import fs from "fs";
import path from "path";
try {
  const envPath = path.join(process.cwd(), "apps/web/.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index > 0) {
        process.env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
      }
    }
  }
} catch (e) {}

async function run() {
  await connectToDatabase();
  console.log("Connecting to:", process.env.MONGODB_URI);
  console.log("Dropping metrics collection/view...");
  try {
    await mongoose.connection.db.dropCollection("metrics");
    console.log("Dropped metrics successfully!");
  } catch (e) {
    console.log("Failed or not found:", e);
  }
}
run().then(() => process.exit(0)).catch(() => process.exit(1));
