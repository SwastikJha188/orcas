"use client";

import { useEffect, useState } from "react";
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

async function getData<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: T };
    return j.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Stored history for one machine, straight from PostgreSQL: trend records,
 * the operating-event log and the per-sensor default baselines. No fallback
 * data — a machine without stored rows gets empty arrays.
 */
export function useMachineHistory(machineId: string): MachineHistory {
  const [state, setState] = useState<{ id: string; data: MachineHistory }>({ id: "", data: EMPTY });

  useEffect(() => {
    let cancelled = false;
    const q = encodeURIComponent(machineId);
    Promise.all([
      getData<Array<{ machineId: string; metrics: TrendRecordMetric[] }>>(`/api/trends?machineId=${q}`),
      getData<OperatingEvent[]>(`/api/history?machineId=${q}`),
      getData<{ sensors?: Array<{ tag: string; defaultBaseline?: unknown }> }>(`/api/catalog?machineId=${q}`),
    ]).then(([trends, events, catalog]) => {
      if (cancelled) return;
      const records = (trends ?? [])
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
      for (const s of catalog?.sensors ?? []) {
        const b = num(s.defaultBaseline);
        if (b !== null) baselines[s.tag] = b;
      }
      setState({
        id: machineId,
        data: { loaded: true, records, events: (events ?? []).filter((e) => e.machineId === machineId), baselines },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [machineId]);

  return state.id === machineId ? state.data : EMPTY;
}
