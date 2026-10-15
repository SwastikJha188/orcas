"use client";

/**
 * Machine sub-page · Health — one scrolling page.
 * "How healthy is this machine and its sub-assemblies, and what is lowering it?"
 *
 *   KPI strip     machine health · change · lowest sub-assembly · inputs valid
 *   Breakdown     machine → system → sub-assembly roll-up in one table (D5 §9.4)
 *   Trend         machine + system health with 85 / 60 limits and rule events
 *   Indicators    signals vs reference model (D5 Table 9.5) and limits
 *   Deductions    points lost per rule / limit / residual + input validation (D5 Table 9.6)
 *
 * Sections without data for a machine are hidden. Diagnosis owns active
 * findings, Analysis the root cause, Prognosis what next — linked, not repeated.
 * Machine score: liveMachineStatus() (one source everywhere).
 */

import React, { useEffect, useMemo, useState } from "react";
import { conditionTone, toCondition } from "@/components/ui/status";
import type { AssetMachine } from "./assets-data";
import type { AssetsSubPage } from "./assets-view";
import { isLiveMachine, useKilnSimulationFor, useLiveMachineStatus } from "@/providers/kiln-simulation-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatDuration, simTimeMs, type SimFrame } from "@/lib/kiln-sim/engine";
import { formatLocalTime } from "@/lib/time";
import { useMachineCatalog } from "./use-machine-catalog";
import { KpiStrip, PageHeader, SectionIndex, type KpiItem, type SectionIndexItem } from "./analysis/an-ui";
import { BAND_ADVISORY, HEALTH_ANCHOR_KEY, HEALTH_SECTIONS, kilnHealthModel, signed, storedHealthModel } from "./health-derive";
import {
  ConditionIndicators,
  HealthBar,
  HealthBreakdown,
  HealthDeductions,
  HealthTrend,
  scoreTone,
  type HealthSectionProps,
} from "./health-sections";
import "./analysis/analysis-page.css";
import "./health-page.css";

export { HEALTH_ANCHOR_KEY };

/** Sub-assembly samples kept while the page is open (the engine keeps no per-sub history). */
const SUB_WINDOW = 60;

type SubSample = { t: number; health: Record<string, number> };

function useSubHealthWindow(frame: SimFrame | null, machineId: string): SubSample[] {
  const [buf, setBuf] = useState<{ id: string; samples: SubSample[] }>({ id: machineId, samples: [] });
  const t = frame?.t ?? null;
  useEffect(() => {
    if (!frame) return;
    setBuf((prev) => {
      const samples = prev.id === machineId ? prev.samples : [];
      if (samples.length > 0 && samples[samples.length - 1].t === frame.t) return prev;
      const health: Record<string, number> = {};
      for (const c of Object.values(frame.subs)) health[c.id] = c.health;
      return { id: machineId, samples: [...samples, { t: frame.t, health }].slice(-SUB_WINDOW) };
    });
    // Sample once per engine tick; `frame` identity changes with `t`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, machineId]);
  return buf.id === machineId ? buf.samples : [];
}

export function MachineHealthPage({ machine }: { machine: AssetMachine }) {
  const isKiln = isLiveMachine(machine.id);
  const frame = useKilnSimulationFor(isKiln ? machine.id : null)?.frame ?? null;
  const catalog = useMachineCatalog(machine);
  const live = useLiveMachineStatus(machine.id, { health: machine.health, status: machine.status });
  const { setActiveSubPage } = useIndustrialData();
  const { timeZone } = useSiteTimeZone({ machineId: machine.id });
  const samples = useSubHealthWindow(frame, machine.id);
  const go = (sub: AssetsSubPage) => setActiveSubPage(sub);

  const model = useMemo(() => (frame ? kilnHealthModel(frame, catalog) : storedHealthModel(catalog)), [frame, catalog]);

  const score = Math.round(live.health);
  // One machine condition everywhere (same source as every other machine page).
  const condition = toCondition(live.status);

  const subDelta = useMemo(() => {
    const out: Record<string, number> = {};
    if (samples.length < 2) return out;
    const first = samples[0].health;
    const last = samples[samples.length - 1].health;
    for (const k of Object.keys(last)) if (first[k] !== undefined) out[k] = last[k] - first[k];
    return out;
  }, [samples]);
  const windowMin = samples.length > 1 ? samples[samples.length - 1].t - samples[0].t : 0;

  const hist = frame?.healthHistory.overall ?? [];
  const trendDelta = hist.length > 1 ? hist[hist.length - 1] - hist[0] : null;
  const trendSpan = frame && hist.length > 1 ? (frame.times[frame.times.length - 1] ?? 0) - (frame.times[frame.times.length - hist.length] ?? 0) : 0;
  const updated = frame ? formatLocalTime(simTimeMs(frame.t), { seconds: false, zone: true, timeZone }) : null;
  const q = model.quality;
  const loading = catalog.isLoading && !frame;

  const scored = model.subs.filter((s) => s.scored && s.health !== null);
  const lowest = scored.reduce<(typeof scored)[number] | null>((a, s) => (!a || (s.health as number) < (a.health as number) ? s : a), null);
  const below = scored.filter((s) => (s.health as number) < BAND_ADVISORY).length;

  const show = {
    breakdown: model.subs.length > 0,
    trend: Boolean(frame && hist.length > 1),
    indicators: model.indicators.length > 0,
    drivers: model.contributions !== null || q !== null,
  };
  const props: HealthSectionProps = { model, frame, score, condition, timeZone, go, subDelta, windowMin };

  const offModel = model.indicators.filter((r) => r.z !== null && Math.abs(r.z) >= 3).length;
  const index: SectionIndexItem[] = [
    show.breakdown && { id: HEALTH_SECTIONS.breakdown, label: "Breakdown", tone: lowest ? scoreTone(lowest.health) : undefined },
    show.trend && { id: HEALTH_SECTIONS.trend, label: "Trend" },
    show.indicators && { id: HEALTH_SECTIONS.indicators, label: "Indicators", tone: offModel ? ("warn" as const) : undefined },
    show.drivers && { id: HEALTH_SECTIONS.drivers, label: "Deductions" },
  ].filter(Boolean) as SectionIndexItem[];

  const kpis: KpiItem[] = [
    { label: "Machine health", value: String(score), unit: "/100", tone: scoreTone(score), bar: <HealthBar value={score} /> },
    trendDelta !== null
      ? { label: `Change · ${formatDuration(trendSpan)}`, value: signed(trendDelta), unit: "pts", foot: `${hist[0]} → ${hist[hist.length - 1]}` }
      : { label: `Below ${BAND_ADVISORY}`, value: loading ? "—" : String(below), unit: `/ ${scored.length}`, foot: "sub-assemblies" },
    {
      label: "Lowest sub-assembly",
      value: lowest ? String(lowest.health) : "—",
      unit: lowest ? "/100" : undefined,
      tone: lowest ? scoreTone(lowest.health) : undefined,
      foot: lowest ? `${lowest.name} · ${lowest.systemName}` : loading ? "Loading sub-assemblies…" : "No sub-assembly scores",
    },
    q
      ? {
          label: "Inputs valid",
          value: String(q.valid),
          unit: `/ ${q.total}`,
          tone: q.invalid ? "bad" : q.suspect ? "warn" : undefined,
          foot: `${q.suspect} suspect · ${q.invalid} invalid · ${q.held} held`,
        }
      : { label: "Signals mapped", value: loading ? "—" : String(model.indicators.length), foot: "No validation status" },
  ];

  return (
    <div className="ast-root pg-frame pg-health" aria-label="Health">
      <PageHeader
        title="Health"
        status={{ label: condition, tone: conditionTone(condition) }}
        meta={[
          { label: "Source", value: live.isLive ? "Live (simulated)" : "Stored" },
          updated && { label: "Updated", value: updated },
          q && { label: "Inputs valid", value: `${q.valid} / ${q.total}` },
        ]}
      />

      <KpiStrip page items={kpis} label="Health summary" />

      {index.length > 1 && <SectionIndex items={index} label="Health sections" pendingKey={HEALTH_ANCHOR_KEY} />}

      {!show.breakdown && (
        <p className="pg-health-missing">
          {loading ? "Loading sub-assemblies…" : "No systems or sub-assemblies recorded for this machine."}
        </p>
      )}
      {show.breakdown && <HealthBreakdown {...props} />}
      {show.trend && <HealthTrend {...props} />}
      {show.indicators && <ConditionIndicators {...props} />}
      {show.drivers && <HealthDeductions {...props} />}
    </div>
  );
}
