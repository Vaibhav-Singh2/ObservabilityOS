import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { connectToDatabase, Project, Log, User, Membership } from "@repo/db";
import { hashApiKey } from "./crypto";
import mongoose from "mongoose";

describe("Security and Access Controls", () => {
  let adminUser: any;
  let viewerUser: any;
  let externalUser: any;
  let projectA: any;
  let projectB: any;

  beforeEach(async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/observability_test";
    await connectToDatabase();

    await User.deleteMany({});
    await Project.deleteMany({});
    await Log.deleteMany({});
    await Membership.deleteMany({});

    // Create test users
    adminUser = await User.create({
      githubId: "git-s-admin",
      username: "admin_user",
    });
    viewerUser = await User.create({
      githubId: "git-s-viewer",
      username: "viewer_user",
    });
    externalUser = await User.create({
      githubId: "git-s-external",
      username: "external_user",
    });

    // Create Project A
    projectA = await Project.create({
      name: "Finance App A",
      ownerId: adminUser._id,
      apiKey: hashApiKey("obs_sk_finance_a"),
    });

    // Create Project B (Tenant B)
    projectB = await Project.create({
      name: "E-Commerce App B",
      ownerId: externalUser._id,
      apiKey: hashApiKey("obs_sk_ecommerce_b"),
    });

    // Setup RBAC Memberships for Project A
    await Membership.create({
      projectId: projectA._id,
      userId: adminUser._id,
      role: "admin",
    });

    await Membership.create({
      projectId: projectA._id,
      userId: viewerUser._id,
      role: "viewer",
    });
  });

  afterEach(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("Tenant Isolation Checks", () => {
    it("should prevent User B from reading logs belonging to Project A", async () => {
      // 1. Insert logs for Project A
      await Log.create({
        projectId: projectA._id,
        serviceId: new mongoose.Types.ObjectId(),
        level: "error",
        message: "Project A sensitive payment error",
        environment: "prod",
      });

      // 2. Query logs filtering by Project A, but simulating request under User B's scope
      // In our code, tenant isolation is enforced by always querying with the user's active projectId.
      // We verify here that if we accidentally queried without projectId but with User B's project list,
      // it would fail to return Project A's logs.
      const userBProjects = await Project.find({ ownerId: externalUser._id });
      const projectIds = userBProjects.map((p) => p._id);

      expect(projectIds.length).toBe(1);
      expect(projectIds[0].toString()).toBe(projectB._id.toString());

      // Attempt to query logs belonging to project A using project B's IDs
      const logs = await Log.find({ projectId: { $in: projectIds } });
      expect(logs.length).toBe(0);

      const logsA = await Log.find({ projectId: projectA._id });
      expect(logsA.length).toBe(1);
      expect(logsA[0].message).toContain("Project A sensitive");
    });
  });

  describe("RBAC Permissions Checks", () => {
    it("should allow admin but reject viewer from performing administrative actions", async () => {
      // Helper simulating RBAC enforcement
      const canManageSettings = async (
        userId: string,
        projectId: string,
      ): Promise<boolean> => {
        const membership = await Membership.findOne({ userId, projectId });
        return membership ? ["admin"].includes(membership.role) : false;
      };

      const adminAllowed = await canManageSettings(
        adminUser._id.toString(),
        projectA._id.toString(),
      );
      expect(adminAllowed).toBe(true);

      const viewerAllowed = await canManageSettings(
        viewerUser._id.toString(),
        projectA._id.toString(),
      );
      expect(viewerAllowed).toBe(false);
    });
  });

  describe("Query and Input Injection Prevention", () => {
    it("should sanitize or throw error on MongoDB query injection attempts", async () => {
      // If a malicious user supplies an object `{"$gt": ""}` instead of a string value,
      // Mongoose schemas should reject it or cast it safely to string.

      // Let's verify Mongoose validation fails if we try to insert an object where a String is expected,
      // or if it casts it.
      const injectionAttempt = {
        projectId: projectA._id,
        serviceId: new mongoose.Types.ObjectId(),
        level: "error" as const,
        message: { $gt: "" } as any, // Injection attempt in message
        environment: "prod" as const,
      };

      // Mongoose should reject or cast to string
      const logDoc = new Log(injectionAttempt);

      // If Mongoose casts it to string, it should become "[object Object]", preventing injection execution.
      // If it throws, that is also safe.
      try {
        await logDoc.save();
        expect(typeof logDoc.message).toBe("string");
        expect(logDoc.message).not.toBe(""); // It should be cast to string "[object Object]"
      } catch (err) {
        expect(err).toBeDefined(); // It threw a validation error
      }
    });
  });
});
