"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { invalidateApi } from "@/lib/api-cache";
import { limitNum, limitPair, type SignalDef } from "@/lib/kiln-sim/signals";
import { formatDuration, type SimFrame } from "@/lib/kiln-sim/engine";
import {
  parseDurationMinutes,
  simStamp,
  type Prediction,
  type PredictionStats,
  type PushTicker,
} from "./ai-shared";

/* Records what the AI predicts and later checks it against what the plant did.
   One prediction per tag/rule episode; a resolved episode rests before it can
   be predicted again. The simulated clock restarts with the page, so a run id
   ties predictions to one simulation lifetime. The ledger is per machine: the
   shared one (AiEngineProvider) records the active plant's primary machine
   (`PredictionLedger.machineId`). */

const RUN_ID = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const HORIZON_MIN = 240;
const STREAK_TO_RECORD = 8;
const MAX_OPEN_SIGNAL = 10;
const COOLDOWN_SIGNAL = 90;
const COOLDOWN_RULE = 30;

const EMPTY_STATS: PredictionStats = {
  made: 0,
  pending: 0,
  confirmed: 0,
  missed: 0,
  precision: null,
  meanLeadMinutes: null,
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data)
    throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  if (init?.method && init.method !== "GET") invalidateApi("/api/predictions");
  return json.data as T;
}

export interface PredictionLedger {
  /** Machine the ledger records predictions for. */
  machineId: string;
  items: Prediction[];
  stats: PredictionStats;
  isLoading: boolean;
  error: string | null;
}

export function usePredictionLedger(
  frame: SimFrame | null,
  emit: PushTicker,
  machineId: string,
): PredictionLedger {
  const [items, setItems] = useState<Prediction[]>([]);
  const [stats, setStats] = useState<PredictionStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const open = useRef(new Map<string, Prediction>()); // episodeKey -> pending prediction
  const inflight = useRef(new Set<string>());
  const streak = useRef(new Map<string, number>());
  const restUntil = useRef(new Map<string, number>());
  const lastT = useRef<number | null>(null);
  const ready = useRef(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const machineRef = useRef(machineId);
  machineRef.current = machineId;
  /** Bumped on a machine switch so late responses for the previous machine are dropped. */
  const generation = useRef(0);

  const refresh = useCallback(() => {
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      const g = generation.current;
      api<{ items: Prediction[]; stats: PredictionStats }>(
        `/api/predictions?machineId=${encodeURIComponent(machineRef.current)}`,
      )
        .then((d) => {
          if (g !== generation.current) return;
          setItems(d.items);
          setStats(d.stats);
          setError(null);
        })
        .catch((e: unknown) =>
          setError(e instanceof Error ? e.message : String(e)),
        );
    }, 350);
  }, []);

  // Load history; retire open predictions from earlier simulation runs; resume this run's.
  // Runs again when the active plant (and so the primary machine) changes.
  useEffect(() => {
    let cancelled = false;
    generation.current++;
    open.current.clear();
    streak.current.clear();
    restUntil.current.clear();
    lastT.current = null;
    ready.current = false;
    setItems([]);
    setStats(EMPTY_STATS);
    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        await api(`/api/predictions`, {
          method: "PATCH",
          body: JSON.stringify({ machineId, keepRunId: RUN_ID }),
        });
        const d = await api<{ items: Prediction[]; stats: PredictionStats }>(
          `/api/predictions?machineId=${encodeURIComponent(machineId)}`,
        );
        if (cancelled) return;
        for (const p of d.items)
          if (p.runId === RUN_ID && p.status === "pending")
            open.current.set(p.episodeKey, p);
        setItems(d.items);
        setStats(d.stats);
        ready.current = true;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    };
  }, [machineId]);

  useEffect(() => {
    if (!frame || !ready.current || lastT.current === frame.t) return;
    const t = frame.t;
    const clock = frame.clock;

    // A rewound clock cannot resolve earlier predictions: retire them.
    if (lastT.current !== null && t < lastT.current) {
      for (const p of open.current.values()) {
        void api(`/api/predictions/${p.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "void" }),
        }).catch(() => undefined);
      }
      open.current.clear();
      streak.current.clear();
      restUntil.current.clear();
      refresh();
    }
    lastT.current = t;

    const resolve = (
      key: string,
      p: Prediction,
      status: "confirmed" | "missed",
    ) => {
      open.current.delete(key);
      restUntil.current.set(
        key,
        t + (p.kind === "rule" ? COOLDOWN_RULE : COOLDOWN_SIGNAL),
      );
      const lead = t - p.createdT;
      emit({
        t,
        clock,
        model: "Prediction ledger",
        text:
          status === "confirmed"
            ? `Confirmed · ${p.label} ${p.predictedEvent.toLowerCase()} · lead time ${formatDuration(lead)}`
            : `Did not occur · ${p.label} ${p.predictedEvent.toLowerCase()}`,
        tone: status === "confirmed" ? "good" : "info",
      });
      void api(`/api/predictions/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          outcomeT: t,
          outcomeClock: simStamp(t),
        }),
      })
        .then(refresh)
        .catch((e: unknown) =>
          setError(e instanceof Error ? e.message : String(e)),
        );
    };

    // 1. Evaluate open predictions against the plant.
    for (const [key, p] of [...open.current]) {
      if (p.kind === "signal") {
        const sig = frame.signals[p.subject];
        const need = p.targetLevel === "alarm" ? "Critical" : "Advisory";
        const reached =
          sig &&
          (sig.limitSeverity === "Critical" ||
            (need === "Advisory" && sig.limitSeverity === "Advisory"));
        if (reached) resolve(key, p, "confirmed");
        else if (t > p.expiresT) resolve(key, p, "missed");
      } else {
        const rule = frame.rules.find((r) => r.id === p.subject);
        if (rule?.status === "ACTIVE") resolve(key, p, "confirmed");
        else if (!rule || rule.status === "QUIET" || t > p.expiresT)
          resolve(key, p, "missed");
      }
    }

    // 2. Record new predictions.
    const create = (
      key: string,
      body: Record<string, unknown>,
      message: string,
    ) => {
      if (
        open.current.has(key) ||
        inflight.current.has(key) ||
        (restUntil.current.get(key) ?? -1) > t
      )
        return;
      inflight.current.add(key);
      const g = generation.current;
      api<Prediction>("/api/predictions", {
        method: "POST",
        body: JSON.stringify({
          machineId,
          runId: RUN_ID,
          episodeKey: `${key}@${t}`,
          createdT: t,
          createdClock: simStamp(t),
          ...body,
        }),
      })
        .then((p) => {
          if (g !== generation.current) return;
          open.current.set(key, p);
          emit({
            t,
            clock,
            model: "Prediction ledger",
            text: message,
            tone: "warn",
          });
          refresh();
        })
        .catch((e: unknown) =>
          setError(e instanceof Error ? e.message : String(e)),
        )
        .finally(() => inflight.current.delete(key));
    };

    const seen = new Set<string>();
    let openSignals = [...open.current.values()].filter(
      (p) => p.kind === "signal",
    ).length;
    for (const sig of Object.values(frame.signals)) {
      const def = frame.defs.signalByTag[sig.tag];
      if (
        !def ||
        def.type !== "analog" ||
        sig.quality !== "Good" ||
        sig.limitSeverity === "Critical"
      )
        continue;
      const minutes = parseDurationMinutes(sig.timeToLimit);
      if (minutes === null || minutes > HORIZON_MIN) continue;
      const level = sig.limitSeverity === "Normal" ? "warning" : "alarm";
      const key = `signal:${sig.tag}:${level}`;
      seen.add(key);
      const n = (streak.current.get(key) ?? 0) + 1;
      streak.current.set(key, n);
      if (n < STREAK_TO_RECORD || openSignals >= MAX_OPEN_SIGNAL) continue;
      // limitPair only reads `limit`, which kiln and pyro definitions share; relative limits (pyro D5) at the live model.
      const lim = limitPair(def as SignalDef, undefined, sig.model);
      const limitValue = lim
        ? level === "warning"
          ? lim.warn
          : lim.alarm
        : null;
      const limitText =
        limitValue === null
          ? ""
          : ` (${limitNum(limitValue)}${def.unit ? ` ${def.unit}` : ""})`;
      const confidence = Math.max(
        55,
        Math.min(95, Math.round(92 - minutes / 12)),
      );
      const before = open.current.size;
      create(
        key,
        {
          kind: "signal",
          subject: sig.tag,
          label: `${def.name} · ${sig.tag}`,
          predictedEvent: `Crosses ${level} limit${limitText}`,
          targetLevel: level,
          confidence,
          predictedT: t + minutes,
          expiresT: Math.round(t + minutes * 1.5 + 20),
        },
        `Predicted ${def.name} (${sig.tag}) crosses ${level} limit in ${formatDuration(minutes)} · ${confidence}% confidence`,
      );
      if (open.current.size > before) openSignals++;
    }
    for (const k of [...streak.current.keys()])
      if (!seen.has(k)) streak.current.delete(k);

    for (const rule of frame.rules) {
      if (rule.status !== "PENDING") continue;
      const confidence = Math.max(
        55,
        Math.min(90, Math.round(55 + rule.persistence * 12)),
      );
      const remaining = Math.max(1, rule.threshold - rule.persistence);
      create(
        `rule:${rule.id}`,
        {
          kind: "rule",
          subject: rule.id,
          label: `${rule.id} · ${rule.name}`,
          predictedEvent: "Rule confirms as a finding",
          targetLevel: "confirm",
          confidence,
          predictedT: t + remaining,
          expiresT: t + rule.threshold * 4 + 10,
        },
        `Predicted rule ${rule.id} (${rule.name}) confirms within ~${formatDuration(remaining)} · ${confidence}% confidence`,
      );
    }
  }, [frame, emit, refresh, machineId]);

  return { machineId, items, stats, isLoading, error };
}

/* ---------------------------------------------------------------------------
   Shared read-outs. Prognosis, Analysis and AssetIQ · Accuracy all read the
   one ledger above (useAiEngine().ledger) through these helpers, so counts,
   precision and lead times agree on every page. Durations are simulated
   minutes and always pass through formatDuration (leadLabel).
   ------------------------------------------------------------------------- */

export interface LedgerSummary {
  made: number;
  resolved: number;
  confirmed: number;
  missed: number;
  pending: number;
  /** Confirmed / resolved, %; null before anything resolved. */
  precision: number | null;
  /** Mean warning given before confirmed events, simulated minutes. */
  meanLeadMinutes: number | null;
  /** Mean lead time as shown (formatDuration). */
  meanLead: string;
}

/** Headline figures of the ledger, identical on every page that shows them. */
export function summarizeLedger(stats: PredictionStats | null | undefined): LedgerSummary {
  const s = stats ?? EMPTY_STATS;
  return {
    made: s.made,
    resolved: s.confirmed + s.missed,
    confirmed: s.confirmed,
    missed: s.missed,
    pending: s.pending,
    precision: s.precision === null ? null : Math.round(s.precision),
    meanLeadMinutes: s.meanLeadMinutes,
    meanLead: s.meanLeadMinutes === null ? "—" : formatDuration(s.meanLeadMinutes),
  };
}

/** Brier score over resolved predictions (0 = perfect); null when none resolved. */
export function ledgerBrier(items: Prediction[]): number | null {
  const r = items.filter((p) => p.status === "confirmed" || p.status === "missed");
  if (!r.length) return null;
  return r.reduce((a, p) => a + (p.confidence / 100 - (p.status === "confirmed" ? 1 : 0)) ** 2, 0) / r.length;
}

/** Relative tolerance for "predicted time to event was right" (±20 %). */
export const LEAD_ALPHA = 0.2;

export interface LedgerEventStat {
  id: string;
  label: string;
  kind: Prediction["kind"];
  n: number;
  confirmed: number;
  missed: number;
  precision: number | null;
  /** Median actual lead, simulated minutes. */
  medianLead: number | null;
  /** Share of confirmed predictions whose predicted time was within ±LEAD_ALPHA, %. */
  coverage: number | null;
  /** Median predicted − actual time to event, simulated minutes (+ = late). */
  bias: number | null;
}

const medianOf = (v: number[]): number | null => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Predicted vs actual minutes to the event for each confirmed prediction. */
export function ledgerLeadPoints(items: Prediction[]): { id: string; pred: number; actual: number }[] {
  return items
    .filter((p) => p.status === "confirmed" && p.outcomeT !== null)
    .map((p) => ({ id: p.id, pred: p.predictedT - p.createdT, actual: (p.outcomeT as number) - p.createdT }))
    .filter((x) => x.actual >= 0 && x.pred > 0);
}

/** Resolved predictions grouped per predicted event (tag or rule), most frequent first. */
export function ledgerByEvent(items: Prediction[]): LedgerEventStat[] {
  const by = new Map<string, Prediction[]>();
  for (const p of items) {
    if (p.status !== "confirmed" && p.status !== "missed") continue;
    by.set(p.subject, [...(by.get(p.subject) ?? []), p]);
  }
  return [...by.entries()]
    .map(([id, ps]) => {
      const hit = ps.filter((p) => p.status === "confirmed");
      const lp = ledgerLeadPoints(hit);
      return {
        id,
        label: ps[0].label,
        kind: ps[0].kind,
        n: ps.length,
        confirmed: hit.length,
        missed: ps.length - hit.length,
        precision: ps.length ? (hit.length / ps.length) * 100 : null,
        medianLead: medianOf(lp.map((x) => x.actual)),
        coverage: lp.length ? (lp.filter((x) => Math.abs(x.pred - x.actual) <= LEAD_ALPHA * Math.max(1, x.actual)).length / lp.length) * 100 : null,
        bias: medianOf(lp.map((x) => x.pred - x.actual)),
      };
    })
    .sort((a, b) => b.n - a.n);
}
