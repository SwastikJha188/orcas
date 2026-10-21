"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { InsightsResponse } from "@shared/types/insights";
import type { AssetMachine } from "../assets-data";
import { useMachineInsights } from "../use-machine-insights";

/* ==========================================================================
   Full line forecasts: each machine's predictions (/api/insights), read
   through the same cached hook its own Prognosis and Analysis pages use.
   One invisible reader per machine reports up, so the number of hooks
   stays fixed whatever the plant holds.
   ========================================================================== */

function InsightsReader({ machine, onData }: { machine: AssetMachine; onData: (id: string, data: InsightsResponse | null, loading: boolean) => void }) {
  const ins = useMachineInsights(machine);
  useEffect(() => onData(machine.id, ins.data, ins.isLoading), [machine.id, ins.data, ins.isLoading, onData]);
  return null;
}

export interface LineInsights {
  byMachine: Record<string, InsightsResponse | null>;
  /** Machines whose predictions have not arrived yet. */
  loading: number;
  readers: React.ReactNode;
}

export function useLineInsights(units: AssetMachine[]): LineInsights {
  const [state, setState] = useState<Record<string, { data: InsightsResponse | null; loading: boolean }>>({});
  const onData = useCallback((id: string, data: InsightsResponse | null, loading: boolean) => {
    setState((s) => (s[id]?.data === data && s[id]?.loading === loading ? s : { ...s, [id]: { data, loading } }));
  }, []);
  const byMachine: Record<string, InsightsResponse | null> = {};
  let loading = 0;
  for (const m of units) {
    const st = state[m.id];
    byMachine[m.id] = st?.data ?? null;
    if (!st || (st.loading && !st.data)) loading += 1;
  }
  return {
    byMachine,
    loading,
    readers: units.map((m) => <InsightsReader key={m.id} machine={m} onData={onData} />),
  };
}
