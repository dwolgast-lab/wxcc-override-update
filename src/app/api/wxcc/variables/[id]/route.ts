import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateGlobalVariable } from "@/lib/wxcc-api";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const orgId = session.orgId ?? process.env.WXCC_ORG_ID ?? "";

  try {
    const result = await updateGlobalVariable(orgId, id, body);
    return NextResponse.json(result ?? { success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
