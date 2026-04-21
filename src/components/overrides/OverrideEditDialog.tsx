"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VariableEditor } from "./VariableEditor";
import { AudioRecorder } from "@/components/audio/AudioRecorder";
import { toast } from "sonner";
import type { Override, GlobalVariable } from "./OverridesDashboard";

interface Props {
  override: Override;
  variables: GlobalVariable[];
  onClose: () => void;
  onSaved: () => void;
}

export function OverrideEditDialog({ override, variables, onClose, onSaved }: Props) {
  const [active, setActive] = useState(override.active);
  const [saving, setSaving] = useState(false);

  const saveOverride = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/wxcc/overrides/${override.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...override, active }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Override updated");
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Show only string-type variables that could plausibly be for this override
  // (In real usage, you may filter by naming convention or tags)
  const stringVars = variables.filter((v) => v.type === "string");

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{override.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Active toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border">
            <div>
              <p className="font-medium text-sm">Override Active</p>
              <p className="text-xs text-gray-500">
                When active, this override takes precedence over standard hours.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <Separator />

          {/* Tabs: Variables | Audio */}
          <Tabs defaultValue="variables">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="variables">Message / TTS</TabsTrigger>
              <TabsTrigger value="audio">Record Audio</TabsTrigger>
            </TabsList>

            <TabsContent value="variables" className="pt-4 space-y-4">
              <p className="text-sm text-gray-600">
                Update Global Variables that control what message is played during this override. Set a filename for a pre-recorded .wav, or enter TTS text.
              </p>
              {stringVars.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No string Global Variables found in this tenant.</p>
              ) : (
                stringVars.map((v) => (
                  <VariableEditor key={v.id} variable={v} />
                ))
              )}
            </TabsContent>

            <TabsContent value="audio" className="pt-4">
              <AudioRecorder />
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={saveOverride} disabled={saving}>
              {saving ? "Saving…" : "Save Override"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
