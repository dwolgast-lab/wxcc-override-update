import { NextResponse } from "next/server";
import { getSession, getEffectiveAccessToken } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!(await getEffectiveAccessToken())) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    userId: session.userId,
    displayName: session.displayName,
    email: session.email,
    orgId: session.orgId,
  });
}
