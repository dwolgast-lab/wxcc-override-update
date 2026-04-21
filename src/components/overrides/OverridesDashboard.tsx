"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OverrideEditDialog } from "./OverrideEditDialog";
import { CalendarClock, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export interface Override {
  id: string;
  name: string;
  active: boolean;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface GlobalVariable {
  id: string;
  name: string;
  value: string;
  type: string;
  description?: string;
}

export function OverridesDashboard() {
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [variables, setVariables] = useState<GlobalVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Override | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, varRes] = await Promise.all([
        fetch("/api/wxcc/overrides"),
        fetch("/api/wxcc/variables"),
      ]);

      if (!ovRes.ok) throw new Error("Failed to load overrides");
      if (!varRes.ok) throw new Error("Failed to load global variables");

      const [ovData, varData] = await Promise.all([ovRes.json(), varRes.json()]);
      setOverrides(Array.isArray(ovData) ? ovData : []);
      setVariables(Array.isArray(varData) ? varData : []);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const activeCount = overrides.filter((o) => o.active).length;

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Hours Overrides</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {overrides.length} total &mdash; {activeCount} active
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Override cards */}
      {!loading && overrides.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <CalendarClock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No overrides found</p>
            <p className="text-sm">Check your organization ID and API scopes.</p>
          </CardContent>
        </Card>
      )}

      {!loading && overrides.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {overrides.map((ov) => (
            <Card
              key={ov.id}
              className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-2 ${
                ov.active ? "border-blue-200 bg-blue-50/40" : "border-transparent"
              }`}
              onClick={() => setSelected(ov)}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold leading-tight">{ov.name}</CardTitle>
                  <Badge
                    variant={ov.active ? "default" : "secondary"}
                    className={ov.active ? "bg-blue-600" : ""}
                  >
                    {ov.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1">
                {ov.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{ov.description}</p>
                )}
                {(ov.startDate || ov.endDate) && (
                  <p className="text-xs text-gray-400">
                    {ov.startDate} {ov.startDate && ov.endDate && "→"} {ov.endDate}
                  </p>
                )}
                <p className="text-xs text-blue-600 font-medium pt-1">Click to edit &rarr;</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {selected && (
        <OverrideEditDialog
          override={selected}
          variables={variables}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
