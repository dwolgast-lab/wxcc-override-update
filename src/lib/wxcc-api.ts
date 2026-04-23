import { getSession } from "./session";
import { refreshAccessToken } from "./webex-auth";

const WXCC_BASE = "https://api.wxcc-us1.cisco.com"; // US datacenter; override via env if needed
const WEBEX_BASE = "https://webexapis.com/v1";

async function getValidToken(): Promise<string> {
  const session = await getSession();
  if (!session.accessToken) throw new Error("Not authenticated");

  // Refresh if expiring within 5 minutes
  if (session.expiresAt && Date.now() > session.expiresAt - 5 * 60 * 1000) {
    if (!session.refreshToken) throw new Error("Session expired");
    const tokens = await refreshAccessToken(session.refreshToken);
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    session.expiresAt = Date.now() + tokens.expires_in * 1000;
    await session.save();
  }

  return session.accessToken;
}

async function wxccFetch(path: string, init?: RequestInit) {
  const token = await getValidToken();
  const url = path.startsWith("http") ? path : `${WXCC_BASE}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WxCC API error ${res.status}: ${body}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── Business Hours Overrides ──────────────────────────────────────────────────

export interface OverrideEntry {
  name: string;
  description?: string;
  startDateTime: string;  // "2026-04-24T09:00"
  endDateTime: string;
  workingHours: boolean;  // false = closed override, true = open override
  frequency: string;      // "DontRepeat" | "Daily" | "Weekly" | "Monthly"
  active?: boolean;
  recurrence?: {
    interval: number;
    daysOfWeek?: string[];
    daysOfMonth?: number[];
  };
}

export interface OverrideSet {
  id: string;
  name: string;
  description?: string;
  timezone: string;
  overrides: OverrideEntry[];
  createdTime?: number;
  lastUpdatedTime?: number;
}

export async function listOverrideSets(orgId: string): Promise<OverrideSet[]> {
  const data = await wxccFetch(`/organization/${orgId}/v2/overrides`);
  return data?.data ?? data ?? [];
}

export async function updateOverrideSet(orgId: string, setId: string, payload: Omit<OverrideSet, "createdTime" | "lastUpdatedTime">) {
  return wxccFetch(`/organization/${orgId}/overrides/${setId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ── CAD (Global) Variables ────────────────────────────────────────────────────

export interface GlobalVariable {
  id: string;
  name: string;
  value: string;
  defaultValue?: string;
  type: "string" | "boolean" | "integer" | "decimal" | "date";
  description?: string;
  agentEditable?: boolean;
  reportable?: boolean;
}

export async function listGlobalVariables(orgId: string): Promise<GlobalVariable[]> {
  const data = await wxccFetch(`/organization/${orgId}/v2/cad-variable`);
  return data?.data ?? data ?? [];
}

export async function updateGlobalVariable(orgId: string, id: string, variable: Partial<GlobalVariable> & { value: string }) {
  return wxccFetch(`/organization/${orgId}/cad-variable/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...variable, id, defaultValue: variable.value }),
  });
}

// ── Audio Files ───────────────────────────────────────────────────────────────

export interface AudioFile {
  id: string;
  name: string;
  size?: number;
  duration?: number;
}

export async function listAudioFiles(orgId: string): Promise<AudioFile[]> {
  const data = await wxccFetch(`/organization/${orgId}/v2/audio-file`);
  return data?.data ?? data ?? [];
}

export async function uploadAudioFile(orgId: string, filename: string, wavBuffer: Buffer): Promise<AudioFile> {
  const token = await getValidToken();

  const form = new FormData();
  form.set("mediaFile", new File([new Uint8Array(wavBuffer)], filename, { type: "audio/x-wav" }));

  const res = await fetch(`${WXCC_BASE}/organization/${orgId}/audio-file`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Audio upload failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// ── Current user ──────────────────────────────────────────────────────────────

export async function getMe() {
  const token = await getValidToken();
  const res = await fetch(`${WEBEX_BASE}/people/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to get user profile");
  return res.json();
}
