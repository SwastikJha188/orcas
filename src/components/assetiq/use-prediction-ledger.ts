"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SIGNAL_BY_TAG, limitPair } from "@/lib/kiln-sim/signals";
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
   ties predictions to one simulation lifetime. */

const MACHINE_ID = "KLN-01";
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
  return json.data as T;
}

export interface PredictionLedger {
  items: Prediction[];
  stats: PredictionStats;
  isLoading: boolean;
  error: string | null;
}

export function usePredictionLedger(
  frame: SimFrame | null,
  emit: PushTicker,
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

  const refresh = useCallback(() => {
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      api<{ items: Prediction[]; stats: PredictionStats }>(
        `/api/predictions?machineId=${MACHINE_ID}`,
      )
        .then((d) => {
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
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api(`/api/predictions`, {
          method: "PATCH",
          body: JSON.stringify({ machineId: MACHINE_ID, keepRunId: RUN_ID }),
        });
        const d = await api<{ items: Prediction[]; stats: PredictionStats }>(
          `/api/predictions?machineId=${MACHINE_ID}`,
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
  }, []);

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
      api<Prediction>("/api/predictions", {
        method: "POST",
        body: JSON.stringify({
          machineId: MACHINE_ID,
          runId: RUN_ID,
          episodeKey: `${key}@${t}`,
          createdT: t,
          createdClock: simStamp(t),
          ...body,
        }),
      })
        .then((p) => {
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
      const def = SIGNAL_BY_TAG[sig.tag];
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
      const lim = limitPair(def);
      const limitValue = lim
        ? level === "warning"
          ? lim.warn
          : lim.alarm
        : null;
      const limitText =
        limitValue === null
          ? ""
          : ` (${limitValue}${def.unit ? ` ${def.unit}` : ""})`;
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
        `Predicted rule ${rule.id} (${rule.name}) confirms within ~${remaining} min · ${confidence}% confidence`,
      );
    }
  }, [frame, emit, refresh]);

  return { items, stats, isLoading, error };
}
