const WEBEX_AUTH_URL = "https://webexapis.com/v1/authorize";
const WEBEX_TOKEN_URL = "https://webexapis.com/v1/access_token";

// Scopes needed for WxCC config API
export const WEBEX_SCOPES = [
  "spark:all",
  "spark-admin:organization_read",
  "cjp:config",
  "cjp:config_read",
  "cjp:config_write",
].join(" ");

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.WEBEX_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.WEBEX_REDIRECT_URI!,
    scope: WEBEX_SCOPES,
    state,
  });
  return `${WEBEX_AUTH_URL}?${params}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.WEBEX_CLIENT_ID!,
    client_secret: process.env.WEBEX_CLIENT_SECRET!,
    code,
    redirect_uri: process.env.WEBEX_REDIRECT_URI!,
  });

  const res = await fetch(WEBEX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.WEBEX_CLIENT_ID!,
    client_secret: process.env.WEBEX_CLIENT_SECRET!,
    refresh_token: refreshToken,
  });

  const res = await fetch(WEBEX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) throw new Error("Token refresh failed");
  return res.json();
}
