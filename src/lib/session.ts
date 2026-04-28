import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number; // unix ms
  userId?: string;
  displayName?: string;
  email?: string;
  orgId?: string;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "wxcc_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    // SameSite=None required for the /embed route when loaded inside the WxCC
    // Supervisor Desktop (a cross-site iframe). SameSite=None is safe here
    // because the cookie is encrypted by iron-session. In local dev we stay on
    // "lax" because SameSite=None requires Secure (HTTPS).
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
