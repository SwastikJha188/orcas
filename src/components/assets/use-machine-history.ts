"use client";

import { useMemo } from "react";
import { useApi } from "@/lib/api-cache";
import type { OperatingEvent } from "./assets-data";

/** One `trend_records` row as served by `/api/trends`. */
export interface TrendRecordMetric {
  key: string;
  label: string;
  unit: string;
  baseline: number;
  advisoryLimit: number;
  criticalLimit: number;
  points: Array<{ time: string; value: number }>;
}

export interface MachineHistory {
  /** True once all requests have settled (successfully or not). */
  loaded: boolean;
  /** `trend_records` for the machine (empty when none are stored). */
  records: TrendRecordMetric[];
  /** `operating_events` for the machine (empty when none are stored). */
  events: OperatingEvent[];
  /** `mapped_signals.default_baseline` by sensor tag (only tags with a stored baseline). */
  baselines: Record<string, number>;
}

const EMPTY: MachineHistory = { loaded: false, records: [], events: [], baselines: {} };

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : null;
};

/**
 * Stored history for one machine, straight from PostgreSQL: trend records,
 * the operating-event log and the per-sensor default baselines. No fallback
 * data — a machine without stored rows gets empty arrays.
 */
export function useMachineHistory(machineId: string): MachineHistory {
  const q = encodeURIComponent(machineId);
  // No id yet: ask nothing (an empty id is a 400) and report empty history.
  const trends = useApi<Array<{ machineId: string; metrics: TrendRecordMetric[] }>>(machineId ? `/api/trends?machineId=${q}` : null);
  const events = useApi<OperatingEvent[]>(machineId ? `/api/history?machineId=${q}` : null);
  const catalog = useApi<{ sensors?: Array<{ tag: string; defaultBaseline?: unknown }> }>(machineId ? `/api/catalog?machineId=${q}` : null);
  const loaded = !trends.isLoading && !events.isLoading && !catalog.isLoading;

  return useMemo(() => {
    if (!loaded) return EMPTY;
    const records = (trends.data ?? [])
      .filter((r) => r.machineId === machineId)
      .flatMap((r) => r.metrics)
      .map((m) => ({
        ...m,
        baseline: num(m.baseline) ?? NaN,
        advisoryLimit: num(m.advisoryLimit) ?? NaN,
        criticalLimit: num(m.criticalLimit) ?? NaN,
        points: Array.isArray(m.points) ? m.points.filter((p) => num(p.value) !== null).map((p) => ({ time: p.time, value: Number(p.value) })) : [],
      }));
    const baselines: Record<string, number> = {};
    for (const s of catalog.data?.sensors ?? []) {
      const b = num(s.defaultBaseline);
      if (b !== null) baselines[s.tag] = b;
    }
    return { loaded: true, records, events: (events.data ?? []).filter((e) => e.machineId === machineId), baselines };
  }, [loaded, machineId, trends.data, events.data, catalog.data]);
}
