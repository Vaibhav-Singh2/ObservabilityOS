import { NextResponse } from "next/server";
import { connectToDatabase, User } from "@repo/db";
import jwt from "jsonwebtoken";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        {
          error: { code: "BAD_REQUEST", message: "Missing authorization code" },
        },
        { status: 400 },
      );
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const jwtSecret = process.env.JWT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/callback`;

    if (!clientId || !clientSecret || !jwtSecret) {
      console.error("Missing auth configuration environment variables");
      return NextResponse.json(
        {
          error: {
            code: "CONFIGURATION_ERROR",
            message: "Auth environment is not configured correctly",
          },
        },
        { status: 500 },
      );
    }

    // 1. Exchange code for GitHub token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("GitHub token exchange error:", tokenData);
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: tokenData.error_description || "Token exchange failed",
          },
        },
        { status: 401 },
      );
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch User Profile
    const profileResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ObservabilityOS-Auth",
      },
    });

    const githubProfile = await profileResponse.json();

    if (!githubProfile.id) {
      console.error("Failed to retrieve profile:", githubProfile);
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Failed to get user profile from GitHub",
          },
        },
        { status: 401 },
      );
    }

    // 3. Fetch user emails to find the primary one
    let email = githubProfile.email || "";
    try {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "ObservabilityOS-Auth",
        },
      });
      if (emailsResponse.ok) {
        const emails = await emailsResponse.json();
        const primary = emails.find(
          (e: { primary: boolean; email: string }) => e.primary,
        );
        if (primary) {
          email = primary.email;
        }
      }
    } catch (e) {
      console.warn(
        "Failed to retrieve user emails, falling back to profile email:",
        e,
      );
    }

    // 4. Connect to database and upsert User
    await connectToDatabase();

    let user = await User.findOne({ githubId: String(githubProfile.id) });
    if (!user) {
      user = await User.create({
        githubId: String(githubProfile.id),
        username: githubProfile.login,
        email: email,
        avatarUrl: githubProfile.avatar_url,
      });
    } else {
      user.username = githubProfile.login;
      user.email = email;
      user.avatarUrl = githubProfile.avatar_url;
      await user.save();
    }

    // 5. Generate Session JWT
    const sessionToken = jwt.sign(
      { userId: user._id.toString(), username: user.username },
      jwtSecret,
      { expiresIn: "7d" },
    );

    // 6. Redirect to dashboard with secure cookie set
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`;
    const response = NextResponse.redirect(dashboardUrl);

    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Auth Callback Exception:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process auth callback",
        },
      },
      { status: 500 },
    );
  }
}
