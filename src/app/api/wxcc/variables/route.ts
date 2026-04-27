import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listGlobalVariables } from "@/lib/wxcc-api";

export async function GET() {
  const session = await getSession();
  if (!session.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.orgId ?? "";
  try {
    const vars = await listGlobalVariables(orgId);
    return NextResponse.json(vars);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
