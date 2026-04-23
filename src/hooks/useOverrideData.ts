"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { OverrideSet, GlobalVariable } from "@/lib/wxcc-api";

interface OverrideData {
  sets: OverrideSet[];
  variables: GlobalVariable[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useOverrideData(): OverrideData {
  const [sets, setSets] = useState<OverrideSet[]>([]);
  const [variables, setVariables] = useState<GlobalVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
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
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { sets, variables, loading, error, refresh };
}
