import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

function decodeWebexOrgId(hydraId: string): string | undefined {
  try {
    const decoded = Buffer.from(hydraId, "base64").toString("utf8");
    return decoded.split("/").pop() || undefined;
  } catch {
    return undefined;
  }
}

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

  const session = await getSession();
  session.accessToken = accessToken;
  session.userId = profile.id;
  session.displayName = profile.displayName;
  session.email = profile.emails?.[0];
  session.orgId = decodeWebexOrgId(profile.orgId ?? "");
  // No refresh token when using the desktop token — the desktop manages its own refresh.
  // The session expiry is set conservatively; the web component will re-post an updated
  // token when the desktop refreshes, which will call this endpoint again.
  session.expiresAt = Date.now() + 60 * 60 * 1000;
  try {
    await session.save();
  } catch (saveErr: any) {
    console.error("[widget] session.save() failed:", saveErr?.message ?? saveErr);
    return NextResponse.json({ error: "Session save failed: " + (saveErr?.message ?? "unknown") }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
