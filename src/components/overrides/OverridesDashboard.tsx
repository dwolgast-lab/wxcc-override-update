"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OverrideEditDialog } from "./OverrideEditDialog";
import { CalendarClock, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { OverrideSet, OverrideEntry } from "@/lib/wxcc-api";
import { tzAbbr, fmtDate, fmtTime, fmtRecurrence, isRecurring, endDateLabel, findOverrideVariable } from "@/lib/override-format";

export interface GlobalVariable {
  id: string;
  name: string;
  value: string;
  type: string;
  description?: string;
}

function EntryMeta({ entry, timezone }: { entry: OverrideEntry; timezone: string }) {
  const tz = tzAbbr(timezone);
  if (!isRecurring(entry)) {
    return (
      <p className="text-xs text-gray-500">
        {fmtDate(entry.startDateTime)} {fmtTime(entry.startDateTime, tz)}
        {" → "}
        {fmtDate(entry.endDateTime)} {fmtTime(entry.endDateTime, tz)}
      </p>
    );
  }
  return (
    <div className="text-xs text-gray-500 space-y-0.5">
      <p><span className="text-gray-400">Start Date:</span> {fmtDate(entry.startDateTime)}</p>
      <p><span className="text-gray-400">End Date:</span> {endDateLabel(entry)}</p>
      <p><span className="text-gray-400">Start Time:</span> {fmtTime(entry.startDateTime, tz)}</p>
      <p><span className="text-gray-400">End Time:</span> {fmtTime(entry.endDateTime, tz)}</p>
      <p><span className="text-gray-400">Repeats:</span> {fmtRecurrence(entry)}</p>
    </div>
  );
}

export function OverridesDashboard() {
  const [sets, setSets] = useState<OverrideSet[]>([]);
  const [variables, setVariables] = useState<GlobalVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ set: OverrideSet; entryIndex: number } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, varRes] = await Promise.all([
        fetch("/api/wxcc/overrides"),
        fetch("/api/wxcc/variables"),
      ]);

      if (!ovRes.ok) {
        const body = await ovRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Overrides request failed (${ovRes.status})`);
      }
      if (!varRes.ok) {
        const body = await varRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Variables request failed (${varRes.status})`);
      }

      const [ovData, varData] = await Promise.all([ovRes.json(), varRes.json()]);
      setSets(Array.isArray(ovData) ? ovData : []);
      setVariables(Array.isArray(varData) ? varData : []);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const totalEntries = sets.reduce((sum, s) => sum + (s.overrides?.length ?? 0), 0);
  const activeEntries = sets.reduce(
    (sum, s) => sum + (s.overrides?.filter((e) => e.workingHours).length ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Hours Overrides</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalEntries} total &mdash; {activeEntries} active
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && sets.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <CalendarClock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No overrides found</p>
            <p className="text-sm">Check your organization ID and API scopes.</p>
          </CardContent>
        </Card>
      )}

      {!loading && sets.map((set) => (
        <div key={set.id} className="space-y-2">
          {sets.length > 1 && (
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
              {set.name}
            </h2>
          )}
          {(!set.overrides || set.overrides.length === 0) && (
            <p className="text-sm text-gray-400 italic px-1">No entries in this set.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {set.overrides?.map((entry, idx) => {
              const msgMatch = findOverrideVariable(entry.name, variables);
              return (
              <Card
                key={idx}
                className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-2 ${
                  entry.workingHours
                    ? "border-green-300 bg-green-50/50"
                    : "border-transparent"
                }`}
                onClick={() => setSelected({ set, entryIndex: idx })}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-tight">{entry.name}</CardTitle>
                    <div className="flex gap-1.5 shrink-0">
                      {msgMatch && (
                        <Badge
                          variant="outline"
                          className={
                            msgMatch.type === "TTS"   ? "border-blue-400 text-blue-700" :
                            msgMatch.type === "WAV"   ? "border-orange-400 text-orange-700" :
                            "border-gray-400 text-gray-500"
                          }
                        >
                          {msgMatch.type === "FIXED" ? "Pre-recorded" : msgMatch.type}
                        </Badge>
                      )}
                      <Badge
                        variant={entry.workingHours ? "default" : "secondary"}
                        className={entry.workingHours ? "bg-green-600" : ""}
                      >
                        {entry.workingHours ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1.5">
                  <EntryMeta entry={entry} timezone={set.timezone} />
                  <p className="text-xs text-gray-400 font-medium pt-0.5">Click to edit &rarr;</p>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>
      ))}

      {selected && (
        <OverrideEditDialog
          set={selected.set}
          entryIndex={selected.entryIndex}
          allSets={sets}
          variables={variables}
          onClose={() => setSelected(null)}
          onSaved={() => {
            fetchData(); // refresh list; dialog controls its own close timing
          }}
        />
      )}
    </div>
  );
}
