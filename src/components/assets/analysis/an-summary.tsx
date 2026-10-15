"use client";

import React, { useMemo } from "react";
import { formatDuration } from "@/lib/kiln-sim/engine";
import { EvidenceChip, STAGE_MAX, alertTone, stageTone, useElementWidth, type KpiItem } from "./an-ui";
import { Z_UNCLASSIFIED, deviationChain, detectionRows, isAnomalous, liveDetail, liveRules, machineFaults, machineSources, maxZSeries, sevToTone, sumZ2Series, type SectionProps } from "./an-derive";
import { isConditionRule } from "@/lib/plant-defs";

/** Max residual over the rolling window: 1.5px line, 3σ hairline, no fill. */
function MaxResidualSpark({ values }: { values: number[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const H = 32;
  const max = Math.max(6, ...values);
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * width;
  const y = (v: number) => 2 + (1 - Math.min(v, max) / max) * (H - 4);
  const last = values[values.length - 1] ?? 0;
  return (
    <div ref={ref} className="pg-analysis-summary-spark">
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={`Max residual over the last ${values.length} minutes; now ${last.toFixed(1)} sigma`}>
        <line x1={0} x2={width} y1={y(3)} y2={y(3)} className="pg-analysis-threshold" />
        <path d={values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")} className="pg-analysis-line" data-tone={alertTone(last > 6 ? "bad" : last > 3 ? "warn" : undefined)} />
      </svg>
    </div>
  );
}

/**
 * Page KPI strip, analysis-specific figures only (Diagnosis owns the top
 * fault, worst residual and alarm counts): signals off the reference model,
 * the combined residual against its 99 % limit, the first deviation along
 * the process flow and the degradation stage. Numbers only; no padding tiles.
 */
export function useAnalysisKpis({ insights, frame }: Pick<SectionProps, "insights" | "frame">): KpiItem[] {
  const a = insights.analysis;
  const p = insights.prognosis;
  const worst = [...a.degradation.items].sort((x, y) => y.stageIndex - x.stageIndex || x.health - y.health)[0] ?? null;
  const rows = useMemo(() => (frame ? detectionRows(frame) : []), [frame]);
  const t2 = useMemo(() => (frame ? sumZ2Series(frame) : null), [frame]);
  const chain = useMemo(() => (frame ? deviationChain(frame) : []), [frame]);
  const off = rows.filter(isAnomalous);
  const unclassified = off.filter((r) => Math.abs(r.z ?? 0) > Z_UNCLASSIFIED && r.rules.length === 0).length;
  const t2Now = t2 && t2.values.length ? t2.values[t2.values.length - 1] : null;
  const ratio = t2 && t2Now !== null && t2.l99 > 0 ? t2Now / t2.l99 : null;
  const first = chain.reduce<(typeof chain)[number] | null>((m, n) => (m === null || n.minutesAgo > m.minutesAgo ? n : m), null);
  const stage: KpiItem | null = worst
    ? {
        label: "Degradation stage",
        value: `${worst.stageIndex}`,
        unit: `/ ${STAGE_MAX}`,
        foot: `${worst.stageLabel} · ${worst.name}`,
        tone: stageTone(worst.stageIndex),
      }
    : null;
  if (!frame) {
    return [
      { label: "Off model", value: String(p.anomalies.length), unit: "signals", tone: p.anomalies.length ? "warn" : undefined },
      ...(stage ? [stage] : []),
    ];
  }
  return [
    {
      label: "Off model",
      value: String(off.length),
      unit: `/ ${rows.length}`,
      foot: unclassified ? `${unclassified} unclassified` : "beyond ±3σ",
      tone: unclassified ? "bad" : off.length ? "warn" : undefined,
    },
    {
      label: "Combined residual",
      value: ratio !== null ? ratio.toFixed(1) : "—",
      unit: ratio !== null ? "× limit" : undefined,
      foot: t2Now !== null && t2 ? `${Math.round(t2Now)} of ${Math.round(t2.l99)} (99 %)` : undefined,
      tone: ratio !== null && ratio > 1 ? "warn" : undefined,
    },
    {
      label: "First deviation",
      value: first ? `${formatDuration(first.minutesAgo)}` : "—",
      unit: first ? "ago" : undefined,
      foot: first ? first.name : "All signals on model",
    },
    ...(stage ? [stage] : []),
  ];
}

/**
 * Top of the Detection section: max-residual sparkline over the rolling window
 * and the active rule IDs (with persistence) + evidence chips of the lead source.
 */
export function AnSignals({ insights, frame }: Pick<SectionProps, "insights" | "frame">) {
  const a = insights.analysis;
  const top = machineFaults(a)[0] ?? null;
  const src = (top && a.sources.find((s) => s.id === top.id)) || machineSources(a)[0] || null;
  const maxZ = useMemo(() => (frame ? maxZSeries(frame) : []), [frame]);
  const rules = liveRules(frame).filter((r) => isConditionRule(r));
  const chips = rules.length > 0 || Boolean(src?.evidence.length);
  if (!(frame && maxZ.length > 1) && !chips) return null;
  return (
    <div className="pg-analysis-summary">
      {frame && maxZ.length > 1 && <MaxResidualSpark values={maxZ} />}
      {chips && (
        <div className="pg-analysis-summary-row">
          {rules.map((r) => (
            <span key={r.id} className="pg-analysis-rule-pill" data-tone={alertTone(r.status === "ACTIVE" ? sevToTone(r.severity) : undefined)}>
              {r.status === "ACTIVE" && alertTone(sevToTone(r.severity)) && <span className="ast-chip-dot" aria-hidden="true" />}
              <span className="ast-num">{r.id}</span>
              <span className="ast-muted ast-num">{r.status === "ACTIVE" ? "confirmed" : `${r.persistence}/${r.threshold}`}</span>
            </span>
          ))}
          {src?.evidence.slice(0, 5).map((e) => (
            <EvidenceChip key={e.tag} tag={e.tag} detail={liveDetail(frame, e.tag, "").replace(" vs model", "")} tone={sevToTone(e.severity)} />
          ))}
        </div>
      )}
    </div>
  );
}
