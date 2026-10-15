"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import { formatDuration } from "@/lib/kiln-sim/engine";
import type { Tone } from "@/components/assets/assets-shell-ui";
import { rul } from "@/lib/kiln-sim/live-insights";
import type { RulItem } from "@/server/services/insights-service";
import { formatRulHours } from "@/components/assets/prognosis/prognosis-derive";
import { conditionTone } from "@/components/ui/status";
import {
  parseDurationMinutes,
  type PushTicker,
  type TickerEntry,
} from "./ai-shared";

/* The AI stack as the operator sees it: six stages, each re-run every
   simulated minute, on the active plant's primary machine. Counts come from
   the live frame and its definitions (`frame.defs`); latency is a fixed
   function of frame size so it is stable, not noise. */

export interface ModelCard {
  id: string;
  name: string;
  spec: string;
  tone: Tone;
  status: string;
  lastRun: string;
  throughput: number;
  latencyMs: number;
  headline: string;
  headlineLabel: string;
  series: number[];
  seriesLabel: string;
}

const SERIES_LEN = 60;
const TICKER_LEN = 40;
const push = (arr: number[], v: number) => {
  arr.push(v);
  if (arr.length > SERIES_LEN) arr.shift();
};

interface Metrics {
  n: number;
  meanAbsZ: number;
  maxZ: number;
  maxZTag: string;
  forecastable: number;
  soonest: { tag: string; minutes: number } | null;
  weakest: { name: string; health: number } | null;
}

function measure(frame: SimFrame): Metrics {
  let n = 0;
  let sumZ = 0;
  let nz = 0;
  let maxZ = 0;
  let maxZTag = "—";
  let forecastable = 0;
  let soonest: Metrics["soonest"] = null;
  for (const def of frame.defs.signals) {
    if (def.type !== "analog") continue;
    const s = frame.signals[def.tag];
    if (!s || s.value === null) continue;
    n++;
    if (s.z !== null && s.quality === "Good") {
      const a = Math.abs(s.z);
      sumZ += a;
      nz++;
      if (a > maxZ) {
        maxZ = a;
        maxZTag = def.tag;
      }
    }
    const m = parseDurationMinutes(s.timeToLimit);
    if (m !== null) {
      forecastable++;
      if (!soonest || m < soonest.minutes)
        soonest = { tag: def.tag, minutes: m };
    }
  }
  let weakest: Metrics["weakest"] = null;
  for (const sa of frame.defs.subassemblies) {
    const c = frame.subs[sa.id];
    if (c && (!weakest || c.health < weakest.health))
      weakest = { name: sa.name, health: c.health };
  }
  return {
    n,
    meanAbsZ: nz ? sumZ / nz : 0,
    maxZ,
    maxZTag,
    forecastable,
    soonest,
    weakest,
  };
}

/** Shortest remaining useful life on the machine, from the same live model Prognosis reads. */
function shortestLife(frame: SimFrame): RulItem | null {
  return rul(frame)[0] ?? null;
}

function cards(
  frame: SimFrame,
  m: Metrics,
  series: Record<string, number[]>,
  life: RulItem | null,
): ModelCard[] {
  const p = frame.pipeline;
  const n = m.n;
  const rules = frame.defs.rules.length;
  const subs = frame.defs.subassemblies.length;
  const dq = p.suspect + p.invalid + p.held;
  const common = { lastRun: frame.clock, throughput: n };
  const refTone: Tone =
    m.meanAbsZ < 1.2 ? "good" : m.meanAbsZ < 2 ? "warn" : "bad";
  const anomTone: Tone =
    p.beyond3s === 0 ? "good" : p.beyond3s <= 3 ? "warn" : "bad";
  return [
    {
      id: "reference",
      name: "Reference model",
      spec: "Expected value per signal",
      ...common,
      tone: refTone,
      status:
        refTone === "good"
          ? "Tracking"
          : refTone === "warn"
            ? "Elevated residual"
            : "Diverging",
      latencyMs: 0.8 + 0.09 * n,
      headline: m.meanAbsZ.toFixed(2),
      headlineLabel: "σ mean residual",
      series: series.reference,
      seriesLabel: "Mean |residual| in σ",
    },
    {
      id: "validation",
      name: "Sensor validation",
      spec: "Quality gate · held, suspect, invalid",
      ...common,
      tone: dq === 0 ? "good" : p.invalid > 0 ? "bad" : "warn",
      status: dq === 0 ? "All valid" : `${dq} flagged`,
      latencyMs: 0.4 + 0.05 * n,
      headline: String(p.valid),
      headlineLabel: `of ${p.valid + dq} valid`,
      series: series.validation,
      seriesLabel: "Flagged signals",
    },
    {
      id: "rules",
      name: "Rule library",
      spec: `${rules} rules · persistence 2–4, hysteresis 4`,
      ...common,
      tone: p.confirmed > 0 ? "bad" : p.pending > 0 ? "warn" : "good",
      status:
        p.confirmed > 0
          ? `${p.confirmed} confirmed`
          : p.pending > 0
            ? `${p.pending} pending`
            : "Quiet",
      latencyMs: 1.2 + 0.06 * rules + 0.04 * n,
      headline: String(p.matching),
      headlineLabel: `of ${p.evaluated} matching`,
      series: series.rules,
      seriesLabel: "Confirmed findings",
    },
    {
      id: "anomaly",
      name: "Anomaly detector",
      spec: "Residual beyond 3σ · unknown patterns",
      ...common,
      tone: anomTone,
      status: p.beyond3s === 0 ? "No deviation" : `${p.beyond3s} beyond 3σ`,
      latencyMs: 0.6 + 0.07 * n,
      headline: String(p.beyond3s),
      headlineLabel: "signals beyond 3σ",
      series: series.anomaly,
      seriesLabel: "Signals beyond 3σ",
    },
    {
      id: "forecaster",
      name: "Forecaster",
      spec: "Trend projection · 1 h to 30 d horizons",
      ...common,
      tone: m.forecastable === 0 ? "good" : "warn",
      status:
        m.forecastable === 0
          ? "No limit ahead"
          : `${m.forecastable} nearing limit`,
      latencyMs: 3.1 + 0.28 * n,
      headline: m.soonest ? formatDuration(m.soonest.minutes) : "—",
      headlineLabel: m.soonest ? `to ${m.soonest.tag}` : "no limit within 72 h",
      series: series.forecaster,
      seriesLabel: "Signals nearing a limit",
    },
    {
      id: "rul",
      name: "RUL estimator",
      spec: `${subs} sub-assemblies · remaining useful life`,
      ...common,
      tone: life ? conditionTone(life.status) : "idle",
      status: life ? life.status : "No data",
      latencyMs: 5 + 1.1 * subs,
      headline: life ? formatRulHours(life.hours) : "—",
      headlineLabel: life ? `shortest life · ${life.name}` : "remaining life",
      series: series.rul,
      seriesLabel: "Shortest remaining life, plant hours",
    },
  ];
}

export interface InferenceEngine {
  models: ModelCard[];
  ticker: TickerEntry[];
  push: PushTicker;
}

export function useInferenceEngine(frame: SimFrame | null, machineId: string): InferenceEngine {
  const series = useRef<Record<string, number[]>>({
    reference: [],
    validation: [],
    rules: [],
    anomaly: [],
    forecaster: [],
    rul: [],
  });
  const lastT = useRef<number | null>(null);
  const lastMachine = useRef(machineId);
  const seq = useRef(0);
  const [models, setModels] = useState<ModelCard[]>([]);
  const [ticker, setTicker] = useState<TickerEntry[]>([]);

  const pushTicker = useCallback<PushTicker>((e) => {
    setTicker((prev) =>
      [{ ...e, id: ++seq.current }, ...prev].slice(0, TICKER_LEN),
    );
  }, []);

  useEffect(() => {
    // A plant switch changes the machine: its series start afresh.
    const switched = lastMachine.current !== machineId;
    if (!frame || (!switched && lastT.current === frame.t)) return;
    if (switched || (lastT.current !== null && frame.t < lastT.current))
      for (const k of Object.keys(series.current)) series.current[k] = [];
    if (switched) setTicker([]);
    lastMachine.current = machineId;
    lastT.current = frame.t;
    const m = measure(frame);
    const p = frame.pipeline;
    const s = series.current;
    push(s.reference, m.meanAbsZ);
    push(s.validation, p.suspect + p.invalid + p.held);
    // Confirmed findings only: pending ones toggle minute to minute before
    // persistence confirms them, which reads as noise in a sparkline.
    push(s.rules, p.confirmed);
    push(s.anomaly, p.beyond3s);
    push(s.forecaster, m.forecastable);
    const life = shortestLife(frame);
    push(s.rul, life?.hours ?? 0);
    // Re-render source: one state update per simulated minute.
    setModels(cards(frame, m, { ...s }, life));

    // One stage reports per simulated minute, in turn, so the ticker reads as a pipeline running.
    const stage = ((frame.t % 6) + 6) % 6;
    let model = "";
    let text = "";
    let tone: TickerEntry["tone"] = "info";
    if (stage === 0) {
      model = "Reference model";
      text = `Scored ${m.n} signals against the reference model · peak ${m.maxZ.toFixed(1)}σ on ${m.maxZTag}`;
      tone = m.maxZ > 3 ? "warn" : "info";
    } else if (stage === 1) {
      model = "Sensor validation";
      text = `Gated ${m.n} signals · ${p.valid} valid, ${p.suspect} suspect, ${p.invalid} invalid, ${p.held} held`;
      tone = p.invalid > 0 ? "bad" : p.suspect + p.held > 0 ? "warn" : "info";
    } else if (stage === 2) {
      model = "Rule library";
      text = `Evaluated ${p.evaluated} rules · ${p.matching} matching, ${p.pending} pending, ${p.confirmed} confirmed`;
      tone = p.confirmed > 0 ? "bad" : p.pending > 0 ? "warn" : "info";
    } else if (stage === 3) {
      model = "Anomaly detector";
      text =
        p.beyond3s === 0
          ? `Scanned ${m.n} residuals · none beyond 3σ`
          : `Scanned ${m.n} residuals · ${p.beyond3s} beyond 3σ`;
      tone = p.beyond3s > 0 ? "warn" : "info";
    } else if (stage === 4) {
      model = "Forecaster";
      text = m.soonest
        ? `Re-projected ${m.n} signals · ${m.soonest.tag} limit in ${formatDuration(m.soonest.minutes)}`
        : `Re-projected ${m.n} signals · no limit within 72 h`;
      tone = m.soonest ? "warn" : "info";
    } else {
      model = "RUL estimator";
      text = life
        ? `Refreshed ${frame.defs.subassemblies.length} sub-assemblies · shortest life ${life.name} ${formatRulHours(life.hours)}`
        : "Refreshed sub-assembly life";
      tone = life && life.status !== "Normal" ? (life.status === "Critical" ? "bad" : "warn") : "info";
    }
    pushTicker({ t: frame.t, clock: frame.clock, model, text, tone });
  }, [frame, pushTicker, machineId]);

  return { models, ticker, push: pushTicker };
}
