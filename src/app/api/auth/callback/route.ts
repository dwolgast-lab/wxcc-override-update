import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/webex-auth";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, req.url));
  }

  const storedState = req.cookies.get("oauth_state")?.value;
  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // Fetch user profile
    const profileRes = await fetch("https://webexapis.com/v1/people/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = profileRes.ok ? await profileRes.json() : {};

    const session = await getSession();
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    session.expiresAt = Date.now() + tokens.expires_in * 1000;
    session.userId = profile.id;
    session.displayName = profile.displayName;
    session.email = profile.emails?.[0];
    session.orgId = profile.orgId ?? process.env.WXCC_ORG_ID;
    await session.save();

    const response = NextResponse.redirect(new URL("/dashboard", req.url));
    response.cookies.delete("oauth_state");
    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=auth_failed", req.url));
  }
}
