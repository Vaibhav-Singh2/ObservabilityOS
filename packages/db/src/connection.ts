import mongoose from "mongoose";

// Setup global Mongoose caching variable to survive hot reloads in development
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached: MongooseCache = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

// Setup connection lifecycle listeners
if (mongoose.connection) {
  mongoose.connection.on("connected", () => {
    console.log("[MongoDB] Connection established successfully.");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[MongoDB] Connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Connection disconnected.");
  });
}

// Graceful shutdown registration
let isShutdownRegistered = false;
function registerGracefulShutdown() {
  if (isShutdownRegistered) return;
  // Make sure we only register standard process event hooks if running in Node.js environment
  if (typeof process !== "undefined" && typeof process.once === "function") {
    isShutdownRegistered = true;
    const handleShutdown = async (signal: string) => {
      console.warn(
        `[MongoDB] Received ${signal}. Closing Mongoose connection gracefully...`,
      );
      try {
        await mongoose.disconnect();
        console.log("[MongoDB] Mongoose connection closed successfully.");
      } catch (err) {
        console.error("[MongoDB] Error during Mongoose disconnect:", err);
      }
    };

    process.once("SIGINT", () => handleShutdown("SIGINT"));
    process.once("SIGTERM", () => handleShutdown("SIGTERM"));
  }
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside your environment or .env file",
    );
  }

  registerGracefulShutdown();

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 5000,
    };

    let attempts = 0;
    const maxAttempts = 3;

    const connectWithRetry = async (): Promise<typeof mongoose> => {
      while (attempts < maxAttempts) {
        try {
          return await mongoose.connect(MONGODB_URI, opts);
        } catch (err) {
          attempts++;
          console.error(
            `[MongoDB] Connection attempt ${attempts}/${maxAttempts} failed:`,
            err,
          );
          if (attempts >= maxAttempts) throw err;
          // Exponential backoff
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempts)));
        }
      }
      throw new Error("Failed to connect to MongoDB after retries");
    };

    cached.promise = connectWithRetry();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export async function checkDatabaseHealth(): Promise<{
  status: "healthy" | "unhealthy";
  details?: {
    readyState: number;
    readyStateLabel: string;
  };
}> {
  try {
    const state = mongoose.connection.readyState;
    const states: Record<number, string> = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    const isHealthy = state === 1; // 1 = connected

    return {
      status: isHealthy ? "healthy" : "unhealthy",
      details: {
        readyState: state,
        readyStateLabel: states[state] || "unknown",
      },
    };
  } catch (err) {
    return {
      status: "unhealthy",
      details: {
        readyState: 0,
        readyStateLabel: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
