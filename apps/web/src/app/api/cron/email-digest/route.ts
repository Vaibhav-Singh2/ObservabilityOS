import { NextResponse } from "next/server";
import { connectToDatabase, User } from "@repo/db";
import { buildAndSendEmailDigest } from "@/lib/email";

export async function GET(request: Request) {
  try {
    // 1. Authenticate Cron Trigger
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get("Authorization");
    const secretParam = searchParams.get("secret");

    if (!process.env.CRON_SECRET) {
      console.error("[Cron Email Digest] CRON_SECRET not configured");
      return NextResponse.json(
        {
          error: {
            code: "CONFIG_ERROR",
            message: "Cron secret not configured",
          },
        },
        { status: 500 },
      );
    }

    const isAuthorized =
      authHeader === `Bearer ${process.env.CRON_SECRET}` ||
      secretParam === process.env.CRON_SECRET;

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: { code: "UNAUTHORIZED", message: "Unauthorized trigger call" },
        },
        { status: 401 },
      );
    }

    // 2. Connect to Database
    await connectToDatabase();

    // 3. Find all users
    const users = await User.find({});
    console.log(`[Cron Email Digest] Found ${users.length} users to process.`);

    const results = [];
    for (const user of users) {
      try {
        const result = await buildAndSendEmailDigest(user);
        if (result) {
          results.push({
            userId: user._id.toString(),
            email: user.email,
            success: true,
            method: result.method,
          });
        }
      } catch (err) {
        console.error(
          `[Cron Email Digest] Failed for user ${user.username}:`,
          err,
        );
        results.push({
          userId: user._id.toString(),
          email: user.email,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      details: results,
    });
  } catch (error) {
    console.error("Cron Email Digest Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Cron email digest trigger failed",
        },
      },
      { status: 500 },
    );
  }
}
