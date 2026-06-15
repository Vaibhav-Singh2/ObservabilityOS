/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "./route";
import { connectToDatabase, Project, User } from "@repo/db";
import { getAuthenticatedUser } from "@/lib/auth";
import mongoose from "mongoose";

// Mock authentication helper
vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

describe("Projects API Route", () => {
  let user1: any;
  let user2: any;

  beforeEach(async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/observability_test";
    await connectToDatabase();

    await User.deleteMany({});
    await Project.deleteMany({});

    vi.mocked(getAuthenticatedUser).mockReset();

    // Create test users
    user1 = await User.create({
      githubId: "git-u1",
      username: "user_one",
    });

    user2 = await User.create({
      githubId: "git-u2",
      username: "user_two",
    });
  });

  afterEach(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it("should return 401 for GET when not logged in", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 401 for POST when not logged in", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "My Project" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return empty projects list for GET if user owns no projects", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(user1);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.projects.length).toBe(0);
  });

  it("should return projects for GET and enforce tenant isolation", async () => {
    // Create projects for user 1
    await Project.create({
      name: "User1 Project A",
      ownerId: user1._id,
      apiKey: "hash-1a",
    });

    await Project.create({
      name: "User1 Project B",
      ownerId: user1._id,
      apiKey: "hash-1b",
    });

    // Create project for user 2
    await Project.create({
      name: "User2 Project",
      ownerId: user2._id,
      apiKey: "hash-2",
    });

    // Request projects as User 1
    vi.mocked(getAuthenticatedUser).mockResolvedValue(user1);

    const res1 = await GET();
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.projects.length).toBe(2);
    expect(body1.projects[0].name).toBe("User1 Project B"); // Sorted by latest
    expect(body1.projects[1].name).toBe("User1 Project A");

    // Request projects as User 2
    vi.mocked(getAuthenticatedUser).mockResolvedValue(user2);

    const res2 = await GET();
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.projects.length).toBe(1);
    expect(body2.projects[0].name).toBe("User2 Project");
  });

  it("should create a project on POST and generate API keys", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(user1);

    const req = new Request("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Mobile App Project" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();

    expect(body.project).toBeDefined();
    expect(body.project.name).toBe("Mobile App Project");
    expect(body.project.ownerId.toString()).toBe(user1._id.toString());
    expect(body.plainApiKey).toBeDefined();
    expect(body.plainApiKey.startsWith("obs_sk_")).toBe(true);

    // Verify hashed key matches DB
    const projectInDb = await Project.findById(body.project._id);
    expect(projectInDb?.apiKey).not.toBe(body.plainApiKey); // should be hashed
  });

  it("should return 400 on POST if project name is missing or invalid", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(user1);

    const req = new Request("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "   " }), // empty string
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
