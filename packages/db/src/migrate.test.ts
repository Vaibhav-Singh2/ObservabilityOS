import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import mongoose from "mongoose";
import { connectToDatabase } from "./connection";
import { Migration } from "./models/Migration";
import { runMigrations } from "./migrate";

describe("Database Migrations", () => {
  beforeEach(async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/observability_test";
    await connectToDatabase();
    // Clean Migration collection before tests
    if (mongoose.connection.readyState === 1) {
      await Migration.deleteMany({});
    }
  });

  afterEach(async () => {
    // Make sure we are disconnected
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it("should run migrations successfully and record them in the db", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Stub process.exit to prevent crashing the test runner if it gets called
    const processExitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => {}) as any);

    await runMigrations();

    // Reconnect to check since runMigrations disconnects at the end
    await connectToDatabase();

    const appliedMigrations = await Migration.find({}).sort({ appliedAt: 1 });
    expect(appliedMigrations.length).toBe(2);
    expect(appliedMigrations[0].name).toBe("001_create_membership_schema");
    expect(appliedMigrations[1].name).toBe(
      "002_create_project_api_key_indexes",
    );

    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("should skip already run migrations on subsequent runs", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const processExitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => {}) as any);

    // Run first time
    await runMigrations();

    // Reconnect and check count
    await connectToDatabase();
    const count1 = await Migration.countDocuments();
    expect(count1).toBe(2);

    // Run second time - should skip executing migrations but log "Already run: ..."
    await runMigrations();

    await connectToDatabase();
    const count2 = await Migration.countDocuments();
    expect(count2).toBe(2); // Still 2

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Already run: 001_create_membership_schema"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Already run: 002_create_project_api_key_indexes",
      ),
    );

    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
  });
});
