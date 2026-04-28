import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, WIDGET_TOKEN_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  session.destroy();
  const cookieStore = await cookies();
  cookieStore.delete(WIDGET_TOKEN_COOKIE);
  return NextResponse.redirect(new URL("/login", req.url));
}
