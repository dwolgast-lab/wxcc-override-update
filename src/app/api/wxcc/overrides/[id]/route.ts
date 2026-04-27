import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateOverrideSet } from "@/lib/wxcc-api";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const orgId = session.orgId ?? "";

  try {
    const result = await updateOverrideSet(orgId, id, body);
    return NextResponse.json(result ?? { success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
