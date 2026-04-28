import { NextRequest, NextResponse } from "next/server";
import { getSession, getEffectiveAccessToken } from "@/lib/session";
import { listAudioFiles, uploadAudioFile } from "@/lib/wxcc-api";

export async function GET() {
  const session = await getSession();
  if (!(await getEffectiveAccessToken())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.orgId ?? "";
  try {
    const files = await listAudioFiles(orgId);
    return NextResponse.json(files);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!(await getEffectiveAccessToken())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const filename = form.get("filename") as string | null;

  if (!file || !filename) return NextResponse.json({ error: "Missing file or filename" }, { status: 400 });

  const orgId = session.orgId ?? "";
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadAudioFile(orgId, filename, buffer);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
