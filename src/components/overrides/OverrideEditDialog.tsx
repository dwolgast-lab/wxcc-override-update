"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import { VariableEditor } from "./VariableEditor";
import { AudioRecorder } from "@/components/audio/AudioRecorder";
import { toast } from "sonner";
import { ChevronDown, Mic, Type } from "lucide-react";
import type { OverrideSet, OverrideEntry } from "@/lib/wxcc-api";
import type { GlobalVariable } from "./OverridesDashboard";
import { tzAbbr, fmtDate, fmtTime, fmtRecurrence, isRecurring, endDateLabel, findOverrideVariable } from "@/lib/override-format";

type Step = "edit" | "message-prompt" | "wav" | "tts";

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
  const wavFilename = entry.description?.trim() || matchedVar?.value?.trim() || null;
  const messageStep: Step = messageType === "WAV" ? "wav" : "tts";

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

      if (active && messageType !== "FIXED") {
        onSaved();
        setStep("message-prompt");
      } else {
        toast.success(active ? "Override activated" : "Override deactivated");
        onSaved();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tz = tzAbbr(set.timezone);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{entry.name}</DialogTitle>
          {set.name && <p className="text-sm text-gray-500">Set: {set.name}</p>}
        </DialogHeader>

        {/* ── Step 1: edit ─────────────────────────────────────── */}
        {step === "edit" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border">
              <div>
                <p className="font-medium text-sm">Override Active</p>
                <p className="text-xs text-gray-500">
                  When active, incoming calls are rerouted per this override schedule.
                </p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

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

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={saveOverride} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: message prompt ────────────────────────────── */}
        {step === "message-prompt" && (
          <div className="space-y-5">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800 font-medium">
              Override activated successfully.
            </div>
            <p className="text-sm text-gray-700">
              {messageStep === "wav"
                ? "Do you need to record a new message to be played to callers?"
                : "Do you need to enter message text to be played to callers via TTS?"
              }
            </p>
            <div className="flex gap-3">
              <Button className="gap-2" onClick={() => setStep(messageStep)}>
                {messageStep === "wav"
                  ? <><Mic className="w-4 h-4" /> Yes, record a new message</>
                  : <><Type className="w-4 h-4" /> Yes, enter TTS text</>
                }
              </Button>
              <Button variant="outline" onClick={onClose}>No, skip</Button>
            </div>
          </div>
        )}

        {/* ── Step 3a: WAV recording ────────────────────────────── */}
        {step === "wav" && (
          <div className="space-y-4">
            {wavFilename && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                Record the message for: <span className="font-mono font-semibold">{wavFilename}</span>
              </div>
            )}
            <AudioRecorder defaultFilename={wavFilename ?? undefined} />
            {matchedVar && (
              <>
                <Separator />
                <p className="text-xs text-gray-500">
                  After uploading, confirm the filename is set in the variable:
                </p>
                <VariableEditor variable={matchedVar} />
              </>
            )}
            <Separator />
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>Done</Button>
            </div>
          </div>
        )}

        {/* ── Step 3b: TTS editing ──────────────────────────────── */}
        {step === "tts" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Update the text-to-speech message for this override.
            </p>
            <SsmlTips />
            {matchedVar ? (
              <VariableEditor variable={matchedVar} />
            ) : (
              <p className="text-sm text-gray-400 italic">
                No matching variable found. Expected a variable named{" "}
                <span className="font-mono">global{entry.name.replace(/\s+/g, "")}TTS</span>.
              </p>
            )}
            <Separator />
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
