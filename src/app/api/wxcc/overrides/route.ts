import { NextRequest, NextResponse } from "next/server";
import { getSession, getEffectiveAccessToken } from "@/lib/session";
import { listOverrideSets } from "@/lib/wxcc-api";

function getOrgId(session: Awaited<ReturnType<typeof getSession>>) {
  return session.orgId ?? "";
}

export async function GET() {
  const session = await getSession();
  if (!(await getEffectiveAccessToken())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const overrides = await listOverrideSets(getOrgId(session));
    return NextResponse.json(overrides);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
