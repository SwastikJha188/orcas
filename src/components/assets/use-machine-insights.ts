"use client";

import { useEffect, useRef, useState } from "react";
import { revalidateApi, useApi } from "@/lib/api-cache";
import { useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import type { AssetMachine } from "./assets-data";
import type { InsightsResponse } from "@backend/services/insights-service";

export interface MachineInsightsState {
  data: InsightsResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  /** Reads the predictions again now (after a failed load). */
  retry: () => void;
  /** True while a retry is on its way. */
  retrying: boolean;
}

/**
 * How often the predictions are re-read: calm, about every 12 minutes, so forecasts and remaining-life
 * figures hold still long enough to read (the user asked for changes once every 10–15 minutes). A change in
 * the machine's active problems re-reads them at once, so a new fault and its prediction appear together.
 */
const REFRESH_MS = 12 * 60_000;

/**
 * Prognosis & analysis payload for a machine, calculated on the server from
 * the stored readings, findings and health scores (/api/insights): trend
 * forecasts with prediction intervals, correlations, time to limit, anomalies
 * against the accepted reference, and the open findings. The same for every
 * machine, simulated or not.
 */
export function useMachineInsights(machine: AssetMachine): MachineInsightsState {
  // No id yet (a placeholder machine while the plant loads): ask nothing rather than a 400.
  const url = machine.id ? `/api/insights?machineId=${encodeURIComponent(machine.id)}` : null;
  const { data, isLoading, error } = useApi<InsightsResponse | null>(url, { refreshMs: REFRESH_MS });
  // The machine's active problems (from the calm display snapshot); a change re-reads the predictions now.
  const frame = useKilnSimulationFor(machine.id)?.frame ?? null;
  const active = frame ? frame.rules.filter((r) => r.status === "ACTIVE" && r.severity !== "Normal").map((r) => r.id).sort().join(",") : null;
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (active === null || !url) return;
    if (seen.current !== null && seen.current !== active) void revalidateApi(url);
    seen.current = active;
  }, [active, url]);
  const [retrying, setRetrying] = useState(false);
  const retry = () => {
    if (!url || retrying) return;
    setRetrying(true);
    void revalidateApi(url).finally(() => setRetrying(false));
  };
  return { data: data ?? null, isLoading, isError: error !== null, error, retry, retrying };
}
