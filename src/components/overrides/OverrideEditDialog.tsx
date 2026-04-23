"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import { VariableEditor } from "./VariableEditor";
import { AudioRecorder } from "@/components/audio/AudioRecorder";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, Mic, Type } from "lucide-react";
import type { OverrideSet, OverrideEntry, GlobalVariable } from "@/lib/wxcc-api";
import { tzAbbr, fmtDate, fmtTime, fmtRecurrence, isRecurring, endDateLabel, findOverrideVariable, overrideNameKey } from "@/lib/override-format";

type Step = "edit" | "wav" | "tts";

interface Props {
  set: OverrideSet;
  entryIndex: number;
  allSets: OverrideSet[];
  variables: GlobalVariable[];
  onClose: () => void;
  onSaved: () => void;
}

function rangesOverlap(a: OverrideEntry, b: OverrideEntry): boolean {
  const aStart = new Date(a.startDateTime).getTime();
  const aEnd   = new Date(a.endDateTime).getTime();
  const bStart = new Date(b.startDateTime).getTime();
  const bEnd   = new Date(b.endDateTime).getTime();
  return aStart < bEnd && bStart < aEnd;
}

function SsmlTips() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        SSML formatting tips
      </button>
      {open && (
        <div className="mt-2 rounded-md bg-gray-50 border p-3 text-xs text-gray-600 space-y-1.5 font-mono">
          <p className="font-sans font-medium text-gray-700">Wrap content in SSML tags for special pronunciation:</p>
          <p>{`<say-as interpret-as="telephone">800-555-1234</say-as>`}</p>
          <p>{`<say-as interpret-as="cardinal">42</say-as>`}</p>
          <p>{`<say-as interpret-as="currency">$5.00</say-as>`}</p>
          <p>{`<say-as interpret-as="date" format="mdy">04/28/2026</say-as>`}</p>
          <p>{`<break time="1s"/>`}</p>
          <p>{`<emphasis level="strong">important word</emphasis>`}</p>
        </div>
      )}
    </div>
  );
}

export function OverrideEditDialog({ set, entryIndex, allSets, variables, onClose, onSaved }: Props) {
  const entry = set.overrides[entryIndex];
  const [active, setActive] = useState(entry.workingHours);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>("edit");

  const msgMatch = findOverrideVariable(entry.name, variables);
  const messageType = msgMatch?.type ?? null;
  const matchedVar  = msgMatch?.variable ?? null;

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const safeName = entry.name.replace(/\s+/g, "");
  const defaultWavFilename = `${safeName}${dateStr}.wav`;

  const conflictingEntry = (): OverrideEntry | null => {
    if (!active) return null;
    for (const s of allSets) {
      for (let i = 0; i < s.overrides.length; i++) {
        if (s.id === set.id && i === entryIndex) continue;
        const other = s.overrides[i];
        if (other.workingHours && rangesOverlap(entry, other)) return other;
      }
    }
    return null;
  };

  const saveOverride = async () => {
    const conflict = conflictingEntry();
    if (conflict) {
      toast.error(`"${conflict.name}" is already active for an overlapping period. Deactivate it first.`);
      return;
    }

    setSaving(true);
    try {
      const updatedOverrides = set.overrides.map((e, i) =>
        i === entryIndex ? { ...e, workingHours: active } : e
      );
      const payload = {
        id: set.id,
        name: set.name,
        description: set.description,
        timezone: set.timezone,
        overrides: updatedOverrides,
      };
      const res = await fetch(`/api/wxcc/overrides/${set.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        const reason =
          responseBody?.error?.reason ??
          responseBody?.error?.message?.[0]?.description ??
          responseBody?.error ??
          "Save failed";
        throw new Error(reason);
      }
      toast.success(active ? "Override activated" : "Override deactivated");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleWavUploaded = async (uploadedFilename: string) => {
    if (!matchedVar) {
      const expected = `global${overrideNameKey(entry.name)}WAV`;
      toast.warning(`Recording uploaded, but no variable found. Create a global variable named "${expected}" to link the filename automatically.`);
      setStep("edit");
      return;
    }
    try {
      const res = await fetch(`/api/wxcc/variables/${matchedVar.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...matchedVar, value: uploadedFilename, defaultValue: uploadedFilename }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Variable update failed");
      toast.success(`Variable "${matchedVar.name}" updated to "${uploadedFilename}"`);
    } catch (err: any) {
      toast.error(err.message);
    }
    setStep("edit");
  };

  const tz = tzAbbr(set.timezone);
  const currentMessage = matchedVar?.defaultValue || matchedVar?.value || null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[min(42rem,calc(100vw-2rem))] max-w-none sm:max-w-none max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg">{entry.name}</DialogTitle>
          {set.name && <p className="text-sm text-gray-500">Set: {set.name}</p>}
        </DialogHeader>

        {/* ── Edit step ─────────────────────────────────────────── */}
        {step === "edit" && (
          <div className="space-y-5 min-w-0">

            {/* Status toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border">
              <div>
                <p className="font-medium text-sm">Override Active</p>
                <p className="text-xs text-gray-500">
                  When active, incoming calls are rerouted per this override schedule.
                </p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            {/* Schedule */}
            <div className="text-xs text-gray-500 space-y-0.5 px-1">
              {isRecurring(entry) ? (
                <>
                  <p><span className="font-medium">Start Date:</span> {fmtDate(entry.startDateTime)}</p>
                  <p><span className="font-medium">End Date:</span> {endDateLabel(entry)}</p>
                  <p><span className="font-medium">Start Time:</span> {fmtTime(entry.startDateTime, tz)}</p>
                  <p><span className="font-medium">End Time:</span> {fmtTime(entry.endDateTime, tz)}</p>
                  <p><span className="font-medium">Repeats:</span> {fmtRecurrence(entry)}</p>
                </>
              ) : (
                <>
                  <p><span className="font-medium">Start:</span> {fmtDate(entry.startDateTime)} {fmtTime(entry.startDateTime, tz)}</p>
                  <p><span className="font-medium">End:</span> {fmtDate(entry.endDateTime)} {fmtTime(entry.endDateTime, tz)}</p>
                </>
              )}
            </div>

            <Separator />

            {/* Message section */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Caller Message</p>

              {messageType === "TTS" && matchedVar && (
                <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 border overflow-hidden">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="border-blue-400 text-blue-700 text-xs shrink-0">TTS</Badge>
                      <span className="text-xs text-gray-500 font-mono truncate">{matchedVar.name}</span>
                    </div>
                    {currentMessage && (
                      <p className="text-xs text-gray-500 line-clamp-2 break-words">{currentMessage}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setStep("tts")} className="gap-1.5 shrink-0">
                    <Type className="w-3.5 h-3.5" /> Update text
                  </Button>
                </div>
              )}

              {messageType === "WAV" && matchedVar && (
                <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 border overflow-hidden">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="border-orange-400 text-orange-700 text-xs shrink-0">WAV</Badge>
                      <span className="text-xs text-gray-500 font-mono truncate">{matchedVar.name}</span>
                    </div>
                    {currentMessage && (
                      <p className="text-xs text-gray-500 font-mono truncate">{currentMessage}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setStep("wav")} className="gap-1.5 shrink-0">
                    <Mic className="w-3.5 h-3.5" /> Record new
                  </Button>
                </div>
              )}

              {messageType === "FIXED" && (
                <p className="text-sm text-gray-400 italic px-1">Pre-recorded message — no update needed.</p>
              )}

              {!messageType && (
                <p className="text-sm text-gray-400 italic px-1 break-all">
                  No message variable found. Expected:{" "}
                  <span className="font-mono text-xs">global{overrideNameKey(entry.name)}TTS</span>
                  {" "}or{" "}
                  <span className="font-mono text-xs">global{overrideNameKey(entry.name)}WAV</span>.
                </p>
              )}
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={saveOverride} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* ── WAV recording ─────────────────────────────────────── */}
        {step === "wav" && (
          <div className="space-y-4 min-w-0">
            <p className="text-sm text-gray-600 break-words">
              Record a message. When you're happy with it, edit the filename if needed then click{" "}
              <strong>Accept</strong> to upload. The filename will be saved to{" "}
              <span className="font-mono text-xs break-all">{matchedVar?.name ?? "the linked variable"}</span>{" "}
              automatically.
            </p>
            <div className="rounded-lg border p-4">
              <AudioRecorder
                defaultFilename={defaultWavFilename}
                onUploaded={handleWavUploaded}
              />
            </div>
            <Separator />
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("edit")} className="gap-1.5">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button variant="outline" onClick={() => setStep("edit")}>Done</Button>
            </div>
          </div>
        )}

        {/* ── TTS editing ───────────────────────────────────────── */}
        {step === "tts" && (
          <div className="space-y-4 min-w-0">
            <SsmlTips />
            {matchedVar ? (
              <VariableEditor variable={matchedVar} />
            ) : (
              <p className="text-sm text-gray-400 italic">
                No matching variable found. Expected:{" "}
                <span className="font-mono">global{overrideNameKey(entry.name)}TTS</span>.
              </p>
            )}
            <Separator />
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("edit")} className="gap-1.5">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button variant="outline" onClick={() => setStep("edit")}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
