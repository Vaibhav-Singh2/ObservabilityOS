import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/callback`;

  if (!clientId) {
    console.error("Missing GITHUB_CLIENT_ID in environment variables");
    return NextResponse.json(
      {
        error: { code: "CONFIGURATION_ERROR", message: "OAuth misconfigured" },
      },
      { status: 500 },
    );
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri,
  )}&scope=user:email`;

  return NextResponse.redirect(githubAuthUrl);
}
