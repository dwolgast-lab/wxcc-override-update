import type { OverrideEntry } from "./wxcc-api";

export type MessageType = "TTS" | "WAV" | "FIXED" | null;

export function overrideNameKey(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")
    .replace(/[^A-Za-z0-9]/g, "");
}

export function findOverrideVariable<T extends { name: string }>(
  overrideName: string,
  variables: T[]
): { variable: T; type: MessageType } | null {
  const prefix = `global${overrideNameKey(overrideName)}`;
  for (const v of variables) {
    if (v.name === `${prefix}TTS`)   return { variable: v, type: "TTS" };
    if (v.name === `${prefix}WAV`)   return { variable: v, type: "WAV" };
    if (v.name === `${prefix}FIXED`) return { variable: v, type: "FIXED" };
  }
  return null;
}

export function tzAbbr(ianaTimezone: string): string {
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZoneName: "short", timeZone: ianaTimezone })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? ""
    );
  } catch {
    return "";
  }
}

function parseParts(dt: string) {
  const [datePart = "", timePart = "00:00"] = dt.split("T");
  const [hourStr = "0", minuteStr = "00"] = timePart.split(":");
  const hour = parseInt(hourStr, 10);
  return { datePart, hour, minuteStr };
}

export function fmtDate(dt: string): string {
  const [y = "", m = "", d = ""] = dt.split("T")[0].split("-");
  return `${m}/${d}/${y}`;
}

export function fmtTime(dt: string, tz: string): string {
  const { hour, minuteStr } = parseParts(dt);
  const period = hour >= 12 ? "pm" : "am";
  const h = hour % 12 || 12;
  const abbr = tz ? ` ${tz}` : "";
  return `${h}:${minuteStr}${period}${abbr}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function fmtRecurrence(entry: OverrideEntry): string {
  const { frequency, recurrence } = entry;
  if (!frequency || frequency === "DontRepeat") return "";
  const interval = recurrence?.interval ?? 1;
  if (frequency === "Daily") {
    return interval === 1 ? "Every day" : `Every ${interval} days`;
  }
  if (frequency === "Weekly") {
    const days = recurrence?.daysOfWeek?.join(", ") ?? "";
    return interval === 1 ? `Every ${days}` : `Every ${interval} weeks on ${days}`;
  }
  if (frequency === "Monthly") {
    const dom = recurrence?.daysOfMonth?.[0];
    const ord = dom != null ? ordinal(dom) : "";
    return interval === 1 ? `Monthly on the ${ord}` : `Every ${interval} months on the ${ord}`;
  }
  return frequency;
}

export function isRecurring(entry: OverrideEntry): boolean {
  return !!entry.frequency && entry.frequency !== "DontRepeat";
}

export function endDateLabel(entry: OverrideEntry): string {
  const startDate = entry.startDateTime.split("T")[0];
  const endDate   = entry.endDateTime.split("T")[0];
  return startDate === endDate ? "No End Date" : fmtDate(entry.endDateTime);
}
