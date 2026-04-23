import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/webex-auth";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const state = randomBytes(16).toString("hex");
  const redirectUri = `${req.nextUrl.origin}/api/auth/callback`;
  const url = buildAuthUrl(state, redirectUri);

  const response = NextResponse.redirect(url);
  // Store state in a short-lived cookie to validate on callback
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
