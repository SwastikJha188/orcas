"use client";

/**
 * Machine sub-page · Analysis — why the machine behaves as it does.
 *
 * Follows the D5 §8.1 analytics pipeline (data quality → reference model →
 * sensor validation → rules → confirmation → diagnosis) and the AI capability
 * specifications (condition monitoring, expected behaviour, unknown anomaly,
 * issue source & fault diagnosis, degradation, explainable AI, maintenance
 * recommendations). Layout: header → summary strip → scroll-spy index →
 * Detection · Mechanism · Explanation · Feedback · Model quality, one card
 * each; sections without data for this machine are hidden.
 *
 * Diagnosis owns the fault list, actions and rule / alarm board; Prognosis
 * owns RUL, risk and forecasts; AssetIQ · Accuracy owns prediction accuracy.
 * This page links to them with one summary line rather than duplicating them.
 */

import React, { useMemo } from "react";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useKilnSimulationFor, useLiveMachineStatus } from "@/providers/kiln-simulation-context";
import { conditionTone, toCondition } from "@/components/ui/status";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import { simTimeMs } from "@/lib/kiln-sim/engine";
import type { AssetMachine } from "../assets-data";
import type { AssetsSubPage } from "../assets-view";
import { useMachineInsights } from "../use-machine-insights";
import { Empty, KpiStrip, PageHeader, SectionIndex, openActions, type AnalysisModuleId, type SectionIndexItem } from "./an-ui";
import { SECTION_IDS, detectionRows, isAnomalous, machineFaults, machineSources, type SectionProps } from "./an-derive";
import { useAnalysisKpis } from "./an-summary";
import { AnDetection } from "./an-detection";
import { AnFaults } from "./an-faults";
import { AnExplain } from "./an-explain";
import { AnActions, useFeedbackLabels } from "./an-actions";
import { AnQuality, useMachineLedger } from "./an-quality";
import "./analysis-page.css";

export type { AnalysisModuleId };

/** sessionStorage key another page can set to open Analysis at a section id. */
export const ANALYSIS_ANCHOR_KEY = "ultron.analysis.anchor";

export interface MachineAnalysisPageProps {
  machine: AssetMachine;
}

export function MachineAnalysisPage({ machine }: MachineAnalysisPageProps) {
  const { setActiveSubPage } = useIndustrialData();
  const insights = useMachineInsights(machine);
  const frame = useKilnSimulationFor(machine.id)?.frame ?? null;
  const tz = useSiteTimeZone({ machineId: machine.id });
  const ledger = useMachineLedger(machine.id);
  const live = useLiveMachineStatus(machine.id, { health: machine.health, status: machine.status });
  const condition = toCondition(live.status);
  const feedback = useFeedbackLabels(machine.id);
  const go = (sub: AssetsSubPage) => setActiveSubPage(sub);

  const data = insights.data;
  const a = data?.analysis ?? null;

  const inferredAt = frame
    ? formatLocalTime(simTimeMs(frame.t), { seconds: false, zone: true, timeZone: tz.timeZone })
    : data?.generatedAt
      ? Number.isNaN(Date.parse(data.generatedAt))
        ? data.generatedAt
        : formatLocalTime(data.generatedAt, { date: true, seconds: false, zone: true, timeZone: tz.timeZone })
      : null;

  const rows = useMemo(() => (frame ? detectionRows(frame) : []), [frame]);
  const pl = frame?.pipeline;

  // Which sections have data for this machine (empty sections are hidden).
  const faults = a ? machineFaults(a) : [];
  const hyps = a ? faults.length + machineSources(a).filter((s) => !faults.some((f) => f.id === s.id)).length : 0;
  const anomalies = frame ? rows.filter(isAnomalous).length : (data?.prognosis.anomalies.length ?? 0);
  const actions = a ? openActions(a) : [];
  const show = {
    detection: Boolean(a) && (frame !== null || anomalies > 0),
    diagnosis: hyps > 0,
    explanation: Boolean(a?.features.length),
    actions: actions.length > 0 || faults.length > 0 || (frame !== null && frame.rules.some((r) => r.status !== "QUIET")),
    quality: frame !== null || (ledger.stats?.made ?? 0) > 0,
  };
  const index: (SectionIndexItem & { on: boolean })[] = [
    { id: SECTION_IDS.detection, label: "Detection", tone: anomalies ? "warn" : undefined, on: show.detection },
    { id: SECTION_IDS.diagnosis, label: "Mechanism", tone: faults.some((f) => f.severity === "Critical") ? "bad" : faults.length ? "warn" : undefined, on: show.diagnosis },
    { id: SECTION_IDS.explanation, label: "Explanation", on: show.explanation },
    { id: SECTION_IDS.actions, label: "Feedback", on: show.actions },
    { id: SECTION_IDS.quality, label: "Model quality", tone: pl && pl.invalid + pl.suspect > 0 ? "warn" : undefined, on: show.quality },
  ];
  const visible = index.filter((i) => i.on);

  const props: SectionProps | null = data ? { machine, insights: data, frame, go } : null;

  return (
    <div className="ast-root pg-frame pg-analysis" aria-label="Analysis">
      <PageHeader
        title="Analysis"
        status={{ label: condition, tone: conditionTone(condition) }}
        meta={[
          { label: "Model", value: frame ? `Reference model · ${frame.rules.length} rules` : data ? "Stored snapshot" : "—" },
          { label: "Updated", value: inferredAt ?? "—" },
          pl && { label: "Inputs valid", value: `${pl.valid} / ${pl.valid + pl.held + pl.invalid + pl.suspect}` },
        ]}
      />

      {insights.isLoading && !data ? (
        <section className="ast-card pg-analysis-section" role="status" aria-live="polite">
          <Empty title="Loading analysis…" />
        </section>
      ) : insights.isError && !data ? (
        <section className="ast-card pg-analysis-section" role="alert">
          <Empty title="Analysis unavailable. Retry." />
        </section>
      ) : !props ? (
        <section className="ast-card pg-analysis-section">
          <Empty title="No model output for this machine." />
        </section>
      ) : (
        <>
          <AnalysisKpis insights={props.insights} frame={frame} />
          {visible.length > 1 && <SectionIndex items={visible} label="Analysis sections" pendingKey={ANALYSIS_ANCHOR_KEY} />}
          <div className="pg-frame-body pg-analysis-body">
            {show.detection && <AnDetection {...props} />}
            {show.diagnosis && <AnFaults {...props} />}
            {show.explanation && <AnExplain {...props} />}
            {show.actions && <AnActions {...props} feedback={feedback} />}
            {show.quality && <AnQuality {...props} ledger={ledger} feedback={feedback} />}
          </div>
        </>
      )}
    </div>
  );
}

/** Page KPI strip (a component so its hooks run only once data is in). */
function AnalysisKpis(props: Pick<SectionProps, "insights" | "frame">) {
  return <KpiStrip page items={useAnalysisKpis(props)} label="Analysis summary" />;
}

export default MachineAnalysisPage;
