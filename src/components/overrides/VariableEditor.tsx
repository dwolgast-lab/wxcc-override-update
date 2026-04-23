"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, FileAudio, Type } from "lucide-react";
import type { GlobalVariable } from "./OverridesDashboard";

interface Props {
  variable: GlobalVariable;
}

// Heuristic: if the value ends in .wav or the name contains "file"/"audio"/"recording",
// treat it as an audio filename reference; otherwise treat as TTS text.
function looksLikeAudioRef(v: GlobalVariable) {
  return (
    /\.(wav|mp3|ulaw)$/i.test(v.value) ||
    /audio|file|record|prompt/i.test(v.name)
  );
}

export function VariableEditor({ variable }: Props) {
  const initial = variable.defaultValue ?? variable.value ?? "";
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const isAudio = looksLikeAudioRef(variable);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/wxcc/variables/${variable.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...variable, value }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Update failed");
      toast.success(`"${variable.name}" updated`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold">{variable.name}</Label>
          {variable.description && (
            <p className="text-xs text-gray-400 mt-0.5">{variable.description}</p>
          )}
        </div>
        <Badge variant="outline" className="gap-1 text-xs">
          {isAudio ? <FileAudio className="w-3 h-3" /> : <Type className="w-3 h-3" />}
          {isAudio ? "Audio file" : "TTS text"}
        </Badge>
      </div>

      {isAudio ? (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. holiday-closed.wav"
          className="font-mono text-sm"
        />
      ) : (
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter TTS message text…"
          rows={3}
        />
      )}

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={save}
          disabled={saving || value === initial}
          className="gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
