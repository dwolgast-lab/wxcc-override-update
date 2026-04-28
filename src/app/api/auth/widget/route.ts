import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, WIDGET_TOKEN_COOKIE } from "@/lib/session";

function decodeWebexOrgId(hydraId: string): string | undefined {
  try {
    const decoded = Buffer.from(hydraId, "base64").toString("utf8");
    return decoded.split("/").pop() || undefined;
  } catch {
    return undefined;
  }
}

const isProduction = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  const { accessToken } = await req.json().catch(() => ({}));
  if (!accessToken) {
    return NextResponse.json({ error: "Missing accessToken" }, { status: 400 });
  }

  const profileRes = await fetch("https://webexapis.com/v1/people/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    return NextResponse.json({ error: "Token validation failed" }, { status: 401 });
  }
  const profile = await profileRes.json();

  // Store user metadata in the iron-session (deliberately excludes the access
  // token — the WxCC desktop JWT can exceed the 4096-byte cookie size limit
  // when sealed by iron-session). The raw token goes into its own httpOnly
  // cookie instead.
  const session = await getSession();
  session.userId = profile.id;
  session.displayName = profile.displayName;
  session.email = profile.emails?.[0];
  session.orgId = decodeWebexOrgId(profile.orgId ?? "");
  session.expiresAt = Date.now() + 60 * 60 * 1000;
  await session.save();

  // Store the raw token in a separate httpOnly cookie so API routes can use it.
  const cookieStore = await cookies();
  cookieStore.set(WIDGET_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 60 * 60,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
