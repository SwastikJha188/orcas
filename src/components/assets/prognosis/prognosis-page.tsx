"use client";

/**
 * Machine sub-page · Prognosis — one scrolling page holding the prediction
 * capabilities (Degradation & Prediction specification): remaining life and
 * failure risk, future condition (signal forecasts), health projection,
 * maintenance window and prediction confidence; accuracy is a summary that
 * links to AssetIQ · Accuracy (its home).
 *
 * Header → four KPIs → sticky scroll-spy pill index → sections (charts and long
 * tables in a card; short lists as cards in a bare section).
 * Sections without data for this machine are hidden with their index entry.
 * Sibling of Analysis (shared primitives from ../analysis/an-ui).
 */

import React, { useMemo, useState } from "react";
import { PillButton } from "@/components/ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useKilnSimulationFor, useLiveMachineStatus } from "@/providers/kiln-simulation-context";
import { conditionTone, toCondition } from "@/components/ui/status";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import { simTimeMs } from "@/lib/kiln-sim/engine";
import type { AssetMachine } from "../assets-data";
import type { Tone } from "../assets-shell-ui";
import { useMachineInsights } from "../use-machine-insights";
import { crossingsAt, horizonText, isBaselineRisk, rulRows, seriesFor, worst } from "./prognosis-derive";
import { Empty, KpiStrip, PageHeader, PROG_SECTION_KEY, Section, SectionIndex, toneFor, type ProgSectionProps } from "./prog-ui";
import { downloadReport, progKpis } from "./prog-summary";
import { ProgRul } from "./prog-rul";
import { ProgRisk } from "./prog-risk";
import { ProgForecast } from "./prog-forecast";
import { ProgDegradation } from "./prog-degradation";
import { ProgAccuracy, useLedger } from "./prog-accuracy";
import "../analysis/analysis-page.css";
import "./prognosis-page.css";

export { PROG_SECTION_KEY };

export interface MachinePrognosisPageProps {
  machine: AssetMachine;
}

export function MachinePrognosisPage({ machine }: MachinePrognosisPageProps) {
  const insights = useMachineInsights(machine);
  const { setActiveSubPage } = useIndustrialData();
  const frame = useKilnSimulationFor(machine.id)?.frame ?? null;
  const live = frame !== null;
  const tz = useSiteTimeZone({ machineId: machine.id });
  const ledger = useLedger(machine.id);
  const liveStatus = useLiveMachineStatus(machine.id, { health: machine.health, status: machine.status });
  const condition = toCondition(liveStatus.status);

  const data = insights.data?.prognosis ?? null;
  const analysis = insights.data?.analysis ?? null;
  const keySensors = useMemo(() => insights.data?.keySensors ?? [], [insights.data]);
  const rows = useMemo(() => (data ? rulRows(data, analysis) : []), [data, analysis]);
  const go = (sub: Parameters<typeof setActiveSubPage>[0]) => setActiveSubPage(sub);

  const generatedAt = insights.data?.generatedAt ?? null;
  const stamp = frame
    ? formatLocalTime(simTimeMs(frame.t), { seconds: false, zone: true, timeZone: tz.timeZone })
    : generatedAt
      ? Number.isNaN(Date.parse(generatedAt))
        ? generatedAt
        : formatLocalTime(generatedAt, { date: true, seconds: false, zone: true, timeZone: tz.timeZone })
      : null;

  const [modeId, setModeId] = useState<string | null>(null);
  const mode = useMemo(() => {
    if (!data) return null;
    return (
      data.risks.find((r) => r.id === modeId) ??
      data.risks.filter((r) => !isBaselineRisk(r)).sort((x, y) => y.probability - x.probability)[0] ??
      null
    );
  }, [data, modeId]);

  const sections = useMemo(() => {
    if (!data) return [];
    const longestId = data.horizons[data.horizons.length - 1]?.id ?? "";
    const cAll = crossingsAt(data, longestId);
    const modelled = seriesFor(data, longestId).some((s) => s.confidence > 0);
    const findings = data.risks.filter((r) => !isBaselineRisk(r));
    const list: { id: string; label: string; tone?: Tone; show: boolean }[] = [
      { id: "prog-life", label: "Remaining life", tone: rows.length ? quiet(toneFor(worst(rows.map((r) => r.status)))) : undefined, show: rows.length > 0 },
      {
        id: "prog-risk",
        label: "Failure risk",
        tone: findings.some((r) => r.severity === "Critical") ? "bad" : findings.length ? "warn" : undefined,
        show: data.risks.length > 0,
      },
      { id: "prog-forecast", label: "Forecasts", tone: cAll.length ? (cAll.some((x) => x.c.level === "alarm") ? "bad" : "warn") : undefined, show: modelled },
      { id: "prog-degradation", label: "Degradation", show: data.condition.points.length > 1 && rows.length > 0 },
      { id: "prog-accuracy", label: "Accuracy", show: (ledger.stats?.made ?? 0) > 0 },
    ];
    return list.filter((s) => s.show);
  }, [data, rows, ledger.stats]);

  const titles: Record<string, string> = {
    "prog-life": "Remaining life",
    "prog-risk": "Failure-mode risk",
    "prog-forecast": "Signal forecasts",
    "prog-degradation": "Degradation & evidence",
    "prog-accuracy": "Prediction accuracy",
  };

  const longest = data?.horizons[data.horizons.length - 1];
  const lastDay = data?.condition.points[data.condition.points.length - 1]?.day;
  const props: ProgSectionProps | null = data ? { machine, data, analysis, rows, keySensors, live, go, frame, mode, setMode: setModeId } : null;

  return (
    <div className="ast-root pg-frame pg-prog" aria-label="Prognosis">
      <PageHeader
        title="Prognosis"
        status={{ label: condition, tone: conditionTone(condition) }}
        meta={[
          { label: "Source", value: live ? "Live (simulated)" : data ? "Snapshot" : insights.isLoading ? "Loading…" : "No output" },
          { label: "Last run", value: stamp ?? "—" },
          longest && { label: "Horizon", value: `signals ${horizonText(longest.id)}${lastDay !== undefined ? ` · health ${lastDay} d` : ""}` },
        ]}
        actions={
          props && (
            <PillButton variant="secondary" onClick={() => downloadReport(props, stamp)}>
              Prognosis report
            </PillButton>
          )
        }
      />

      {insights.isLoading && !data ? (
        <section className="ast-card" role="status" aria-live="polite">
          <Empty title="Loading prognosis…" />
        </section>
      ) : insights.isError && !data ? (
        <section className="ast-card" role="alert">
          <Empty title="Prognosis unavailable. Retry." />
        </section>
      ) : !props ? (
        <section className="ast-card">
          <Empty title="No prognosis for this machine." />
        </section>
      ) : (
        <>
          {rows.length > 0 && <KpiStrip page items={progKpis(props)} label="Prognosis summary" />}
          <SectionIndex label="Prognosis sections" pendingKey={PROG_SECTION_KEY} items={sections.map(({ id, label, tone }) => ({ id, label, tone }))} />
          <div className="pg-frame-body pg-analysis-body">
            {sections.map((s) => (
              <Section
                key={s.id}
                id={s.id}
                title={titles[s.id]}
                bare={BARE.has(s.id)}
              >
                {s.id === "prog-life" && <ProgRul {...props} />}
                {s.id === "prog-risk" && <ProgRisk {...props} />}
                {s.id === "prog-forecast" && <ProgForecast {...props} />}
                {s.id === "prog-degradation" && <ProgDegradation {...props} />}
                {s.id === "prog-accuracy" && <ProgAccuracy ledger={ledger} />}
              </Section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const quiet = (t: Tone): Tone | undefined => (t === "good" ? undefined : t);

/** Sections whose body is cards (heading on the workspace, no section card). */
const BARE = new Set(["prog-life", "prog-risk", "prog-degradation"]);

export default MachinePrognosisPage;
