import { describe, it, expect, beforeEach, afterEach } from "vitest";
import mongoose from "mongoose";
import { connectToDatabase, checkDatabaseHealth } from "./connection";
import { User } from "./models/User";
import { Project } from "./models/Project";
import { Membership } from "./models/Membership";

describe("Database Connection and Models", () => {
  beforeEach(async () => {
    // Force MONGODB_URI to test database
    process.env.MONGODB_URI = "mongodb://localhost:27017/observability_test";
    await connectToDatabase();
  });

  afterEach(async () => {
    // Clear test collections
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key of Object.keys(collections)) {
        const collection = collections[key];
        if (collection) {
          await collection.deleteMany({});
        }
      }
    }
  });

  it("should successfully connect to database and cache the connection", async () => {
    const conn1 = await connectToDatabase();
    const conn2 = await connectToDatabase();
    expect(conn1).toBe(conn2); // Caching check
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });

  it("should return healthy status when database is connected", async () => {
    const health = await checkDatabaseHealth();
    expect(health.status).toBe("healthy");
    expect(health.details?.readyState).toBe(1);
    expect(health.details?.readyStateLabel).toBe("connected");
  });

  it("should create user and enforce validations", async () => {
    await User.init();
    const user = await User.create({
      githubId: "git-123456",
      username: "testuser",
      email: "testuser@example.com",
    });

    expect(user._id).toBeDefined();
    expect(user.username).toBe("testuser");
    expect(user.createdAt).toBeDefined();

    // Check unique constraint on githubId
    await expect(
      User.create({
        githubId: "git-123456",
        username: "anotheruser",
      }),
    ).rejects.toThrow();
  });

  it("should create project and link to owner", async () => {
    const user = await User.create({
      githubId: "git-9999",
      username: "projectowner",
    });

    const project = await Project.create({
      name: "Acme Web",
      ownerId: user._id,
      apiKey: "test-api-key-hash",
      plan: "free",
      subscriptionStatus: "active",
      billingProvider: "none",
    });

    expect(project._id).toBeDefined();
    expect(project.name).toBe("Acme Web");
    expect(project.ownerId.toString()).toBe(user._id.toString());
  });

  it("should enforce Membership constraints", async () => {
    const user = await User.create({
      githubId: "git-m1",
      username: "member1",
    });

    const project = await Project.create({
      name: "Acme Analytics",
      ownerId: user._id,
      apiKey: "hash-key-xyz",
    });

    const membership = await Membership.create({
      projectId: project._id,
      userId: user._id,
      role: "admin",
    });

    expect(membership._id).toBeDefined();
    expect(membership.role).toBe("admin");

    // Invalid role check
    await expect(
      Membership.create({
        projectId: project._id,
        userId: user._id,
        role: "invalid-role" as any,
      }),
    ).rejects.toThrow();

    // Unique index constraint (user can only have 1 membership per project)
    await expect(
      Membership.create({
        projectId: project._id,
        userId: user._id,
        role: "member",
      }),
    ).rejects.toThrow();
  });
});
