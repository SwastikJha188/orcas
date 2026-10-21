"use client";

/**
 * Machine sub-page · Analysis — "Why is it happening, why will it happen,
 * and what does it affect?"
 *
 *   Header → four KPIs (faults now, failures predicted within 6 months,
 *   first deviation, unexplained deviations) → one issue at a time, picked
 *   from a fixed-order list of the faults Diagnosis shows and the failures
 *   Prognosis predicts → Why it is happening / Why it will happen (a fault
 *   that also shortens a part's life links to its time left on Prognosis) →
 *   What it affects → Past episodes → Unexplained deviations.
 *
 * Diagnosis says what is wrong, Prognosis what will happen; both link here
 * ("Why →") with the rule or sub-assembly, and this page opens on it.
 */

import { useComponentScope, type ComponentScope } from "../component-scope";
import React, { useEffect, useMemo, useState } from "react";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useKilnSimulationFor, useLiveMachineStatus } from "@/providers/kiln-simulation-context";
import { conditionTone, toCondition } from "@/components/ui/status";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import { formatDuration, simTimeMs } from "@shared/lib/kiln-sim/engine";
import { defsFor } from "@/lib/live-defs";
import type { AssetMachine } from "../assets-data";
import type { AssetsSubPage } from "../assets-view";
import { useMachineInsights } from "../use-machine-insights";
import { useMachineCatalog } from "../use-machine-catalog";
import { dxSensorsFromFrame, toDxSensors } from "../diagnosis-model";
import { inDefinitionOrder } from "../diagnosis-rows";
import { ReadingsAgainstExpected } from "./an-readings";
import { kilnHealthModel } from "../health-derive";
import { rulRows } from "../prognosis/prognosis-derive";
import { signalForecastRows } from "../prognosis/prog-signals";
import { PillNav } from "@/components/ui";
import { focusLayer, focusSensorOn, LAYER_FOCUS_EVENT, readLayerFocus, type LayerFocusPayload } from "../sensor-focus";
import { Empty, KpiStrip, PageHeader, Section, scrollToSection, type AnalysisModuleId, type KpiItem } from "./an-ui";
import { useFeedbackLabels } from "./an-actions";
import { buildIssues, deviationOrder, impactFor, issueFor, unexplained } from "./an-issues";
import { IssueHead, PastEpisodes, UnexplainedTable, WhatItAffects, WhyHappening, WhyWillHappen, pastEpisodes } from "./an-issue-view";
import { useFaultLibrary } from "../fault-library";
import "./analysis-page.css";
import "../prognosis/prognosis-page.css";

export type { AnalysisModuleId };

/** sessionStorage key another page can set to open Analysis at a section id. */
export const ANALYSIS_ANCHOR_KEY = "ultron.analysis.anchor";

/** Section ids (the why-section keeps the id other pages already link to). */
export const AN_SECTIONS = {
  issue: "an-issue",
  why: "an-diagnosis",
  impact: "an-impact",
  episodes: "an-episodes",
  unexplained: "an-unexplained",
  readings: "an-readings",
} as const;

export interface MachineAnalysisPageProps {
  machine: AssetMachine;
  onNavigateToDiagnosis?: (ruleId?: string | null, component?: string | null, tag?: string | null) => void;
  onNavigateToPrognosis?: (ruleId?: string | null, component?: string | null, tag?: string | null) => void;
  onNavigateToSensors?: () => void;
  onNavigateToTrends?: () => void;
  onNavigateToOverview?: () => void;
  /** Component the page is filtered to (null: the whole machine). */
  component?: ComponentScope | null;
}

export function MachineAnalysisPage({
  machine,
  onNavigateToDiagnosis,
  onNavigateToPrognosis,
  onNavigateToSensors,
  onNavigateToTrends,
  onNavigateToOverview,
  component: scopeProp,
}: MachineAnalysisPageProps) {
  // The machine's component filter (shared by its pages) unless the host passes one.
  const sharedScope = useComponentScope(machine).selected;
  const scope = scopeProp !== undefined ? scopeProp : sharedScope;
  const { setActiveSubPage } = useIndustrialData();
  const insights = useMachineInsights(machine);
  const frame = useKilnSimulationFor(machine.id)?.frame ?? null;
  const catalog = useMachineCatalog(machine);
  const tz = useSiteTimeZone({ machineId: machine.id });
  const live = useLiveMachineStatus(machine.id, { health: machine.health, status: machine.status });
  const condition = toCondition(live.status);
  const feedback = useFeedbackLabels(machine.id);
  const library = useFaultLibrary(machine.id);

  /* ------------------------------- Model -------------------------------- */
  const data = insights.data?.prognosis ?? null;
  const analysis = insights.data?.analysis ?? null;
  const defs = frame?.defs ?? defsFor(machine.id);
  const rul = useMemo(() => (data ? rulRows(data, analysis) : []), [data, analysis]);
  const forecastRows = useMemo(() => (data ? signalForecastRows(data, defs) : []), [data, defs]);
  // Component filter (Assets component bar): its issues and its sensors' deviations only.
  const compTags = useMemo(() => (scope ? new Set(scope.tags) : null), [scope]);
  const issues = useMemo(() => {
    const all = buildIssues(frame, rul, defs);
    return scope ? all.filter((i) => i.subIds.includes(scope.id) || i.life.some((r) => r.id === scope.id)) : all;
  }, [frame, rul, defs, scope]);
  const contributions = useMemo(() => (frame ? kilnHealthModel(frame, catalog).contributions : null), [frame, catalog]);
  // Every sensor of the machine (or picked part) in definition order, as Diagnosis reads them.
  const readings = useMemo(() => {
    const list = catalog.sensors.length === 0 && frame ? dxSensorsFromFrame(frame) : toDxSensors(catalog.sensors, frame?.defs ?? null);
    return inDefinitionOrder(list, defs).filter((x) => !compTags || compTags.has(x.tag));
  }, [catalog.sensors, frame, defs, compTags]);
  const unknown = useMemo(() => (frame ? unexplained(frame) : []).filter((u) => !compTags || compTags.has(u.tag)), [frame, compTags]);
  const chain = useMemo(
    () => (frame ? deviationOrder(frame).sort((a, b) => b.minutesAgo - a.minutesAgo) : []).filter((c) => !compTags || c.tags.some((t) => compTags.has(t))),
    [frame, compTags],
  );

  /* ------------------------------ Selection ------------------------------ */
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [wanted, setWanted] = useState<{ ruleId: string | null; component: string | null } | null>(() => {
    const f = readLayerFocus(false);
    return f.ruleId || f.component ? { ruleId: f.ruleId, component: f.component } : null;
  });
  useEffect(() => {
    const onFocus = (ev: Event) => {
      const d = (ev as CustomEvent<LayerFocusPayload>).detail;
      if (d?.ruleId || d?.component) setWanted({ ruleId: d.ruleId ?? null, component: d.component ?? null });
    };
    window.addEventListener(LAYER_FOCUS_EVENT, onFocus);
    return () => window.removeEventListener(LAYER_FOCUS_EVENT, onFocus);
  }, [machine.id]);
  // Resolve a request from another page once its issue exists.
  useEffect(() => {
    if (!wanted || issues.length === 0) return;
    const hit = issueFor(issues, wanted.ruleId, wanted.component);
    if (hit) setSelectedKey(hit.key);
    setWanted(null);
  }, [wanted, issues]);
  const issue = issues.find((i) => i.key === selectedKey) ?? issues[0] ?? null;

  // A section requested by another page (Diagnosis "Why →" sends an-diagnosis): scroll once it renders.
  const ready = issue !== null;
  useEffect(() => {
    if (!ready) return;
    let id: string | null = null;
    try {
      id = sessionStorage.getItem(ANALYSIS_ANCHOR_KEY);
      sessionStorage.removeItem(ANALYSIS_ANCHOR_KEY);
    } catch {
      /* storage unavailable */
    }
    if (!id) return;
    const t = window.setTimeout(() => scrollToSection(id as string), 120);
    return () => window.clearTimeout(t);
  }, [ready]);

  /* ----------------------------- Navigation ----------------------------- */
  const go = (sub: AssetsSubPage) => {
    if (sub === "sensors" && onNavigateToSensors) return onNavigateToSensors();
    if (sub === "trends" && onNavigateToTrends) return onNavigateToTrends();
    if (sub === "overview" && onNavigateToOverview) return onNavigateToOverview();
    setActiveSubPage(sub);
  };
  const openTrend = (tag: string) => {
    focusSensorOn("trends", tag);
    go("trends");
  };
  const ruleId = issue?.rule?.id ?? null;
  const component = issue?.where ?? null;
  const toDiagnosis = () => {
    focusLayer({ ruleId, component, section: "dx-diagnosis" });
    if (onNavigateToDiagnosis) onNavigateToDiagnosis(ruleId, component, null);
    else setActiveSubPage("diagnosis");
  };
  const toPrognosis = () => {
    focusLayer({ ruleId, component, section: "prog-life" });
    if (onNavigateToPrognosis) onNavigateToPrognosis(ruleId, component, null);
    else setActiveSubPage("prognosis");
  };

  /* -------------------------------- KPIs -------------------------------- */
  const faults = issues.filter((i) => i.kind === "fault");
  const predicted = issues.filter((i) => i.kind === "predicted");
  const confirming = faults.filter((i) => i.rule?.status === "PENDING").length;
  const first = chain[0] ?? null;
  const kpis: KpiItem[] = [
    {
      label: "Problems now",
      value: frame ? String(faults.length) : "—",
      foot: frame ? `${faults.length - confirming} confirmed · ${confirming} being checked` : "No live data for this machine",
      // Critical only when a confirmed problem is Critical; otherwise Alert.
      tone:
        faults.length - confirming > 0
          ? faults.some((i) => i.rule?.status !== "PENDING" && i.rule?.severity === "Critical")
            ? "bad"
            : "warn"
          : undefined,
    },
    {
      label: "Parts that may fail in 6 months",
      value: String(predicted.length),
      unit: "parts",
      foot: predicted[0] ? `First: ${predicted[0].where}` : "None apart from the problems now",
      tone: predicted.length ? "warn" : undefined,
    },
    {
      label: "Where it started",
      value: first ? first.name : "None",
      text: true,
      foot: first
        ? `${first.minutesAgo > 0 ? `${formatDuration(first.minutesAgo)} ago` : "Just now"} · ${first.tags.length} sensor${first.tags.length === 1 ? "" : "s"} off expected`
        : "Every sensor reads as expected",
    },
    {
      label: "Unusual readings, cause unknown",
      value: frame ? String(unknown.length) : "—",
      unit: "sensors",
      foot: "Off expected, and no known problem explains them",
      tone: unknown.length ? "warn" : undefined,
    },
  ];

  const inferredAt = frame
    ? formatLocalTime(simTimeMs(frame.t), { seconds: false, zone: true, timeZone: tz.timeZone })
    : insights.data?.generatedAt
      ? Number.isNaN(Date.parse(insights.data.generatedAt))
        ? insights.data.generatedAt
        : formatLocalTime(insights.data.generatedAt, { date: true, seconds: false, zone: true, timeZone: tz.timeZone })
      : null;
  const pl = frame?.pipeline;
  // Sensors working (not invalid or suspect): the machine's from the engine, a part's from its own sensors.
  const working = useMemo(() => {
    if (!frame) return null;
    if (!compTags) return pl ? { ok: pl.valid, of: pl.valid + pl.held + pl.invalid + pl.suspect } : null;
    const mine = [...compTags].map((t) => frame.signals[t]).filter(Boolean);
    return { ok: mine.filter((x) => x.quality !== "Invalid" && x.quality !== "Suspect").length, of: mine.length };
  }, [frame, pl, compTags]);
  // Checks (rules) watching the machine, or only those on the picked part.
  const checks = frame ? (scope ? frame.rules.filter((r) => r.subs.includes(scope.id)).length : frame.rules.length) : 0;
  const impact = issue ? impactFor(issue, frame, contributions, rul) : [];
  const past = issue ? pastEpisodes(issue, frame) : [];

  return (
    <div className="ast-root pg-frame pg-analysis" aria-label="Analysis">
      <PageHeader
        title="Analysis"
        status={{ label: condition, tone: conditionTone(condition) }}
        meta={[
          { label: "Checks", value: frame ? `${checks} known problems watched` : insights.data ? "Saved snapshot" : "—" },
          { label: "Updated", value: inferredAt ?? "—" },
          working && { label: "Sensors working", value: `${working.ok} of ${working.of}` },
          scope && { label: "Part", value: scope.name },
        ]}
      />

      {insights.isLoading && !insights.data && !frame ? (
        <section className="ast-card pg-analysis-section" role="status" aria-live="polite">
          <Empty title="Loading analysis…" />
        </section>
      ) : (
        <>
          <KpiStrip page items={kpis} label="Analysis summary" />

          {issue ? (
            <>
              <Section id={AN_SECTIONS.issue} title={issues.length > 1 ? `Problems (${issues.length})` : "Problem"}>
                {/* One problem: its title below says it; the picker would only repeat it. */}
                {issues.length > 1 && (
                  <PillNav
                    items={issues.map((i) => ({ id: i.key, label: i.rule ? i.title : `May fail: ${i.title}` }))}
                    activeId={issue.key}
                    onChange={(k) => {
                      setSelectedKey(k);
                      const next = issues.find((i) => i.key === k);
                      if (next?.rule) focusLayer({ ruleId: next.rule.id });
                    }}
                    arrows
                    ariaLabel="Problems"
                  />
                )}
                <IssueHead issue={issue} frame={frame} feedback={feedback} machineId={machine.id} />
              </Section>

              <Section
                id={AN_SECTIONS.why}
                title={issue.kind === "fault" ? "Why it is happening" : "Why it will happen"}
                right={
                  <span className="pg-analysis-links">
                    <button type="button" className="pg-diag-inline-link" onClick={issue.kind === "fault" ? toDiagnosis : toPrognosis}>
                      {issue.kind === "fault" ? "See its sensors" : "See time left"} <span aria-hidden="true">→</span>
                    </button>
                    {/* A problem now that also shortens a part's life: where it is heading is on Prognosis. */}
                    {issue.kind === "fault" && data && issue.life.length > 0 && (
                      <button type="button" className="pg-diag-inline-link" onClick={toPrognosis}>
                        See time left <span aria-hidden="true">→</span>
                      </button>
                    )}
                  </span>
                }
              >
                {issue.kind === "fault" && frame ? (
                  <WhyHappening issue={issue} frame={frame} library={library} onOpenTrend={openTrend} />
                ) : data ? (
                  <WhyWillHappen issue={issue} data={data} forecastRows={forecastRows} onOpenTrend={openTrend} />
                ) : (
                  <Empty title="No forecast is available for this machine." />
                )}
              </Section>

              <Section id={AN_SECTIONS.impact} title={issue.kind === "fault" ? "What it affects" : "What it will affect"}>
                <WhatItAffects issue={issue} frame={frame} impact={impact} library={library} />
              </Section>

              {past.length > 0 && (
                <Section id={AN_SECTIONS.episodes} title="Past times this happened">
                  <PastEpisodes rows={past} />
                </Section>
              )}
            </>
          ) : (
            // No problem to explain: the evidence that nothing is wrong, sensor by sensor.
            <Section
              id={AN_SECTIONS.readings}
              title="Readings against what is expected"
              right={readings.length ? <span className="ast-num pg-diag-muted">{readings.length} sensors</span> : undefined}
            >
              <Empty
                title={
                  readings.length === 0 && !catalog.isLoading
                    ? `${scope ? scope.name : machine.name} has no sensors yet, so nothing on it can be checked or explained.`
                    : scope
                    ? `No problem has been found on ${scope.name}, and no failure is expected in the next 6 months.`
                    : "No problem has been found, and no failure is expected in the next 6 months."
                }
              />
              {readings.length > 0 && <ReadingsAgainstExpected sensors={readings} frame={frame} onOpenTrend={openTrend} />}
            </Section>
          )}

          {unknown.length > 0 && (
            <Section id={AN_SECTIONS.unexplained} title="Unusual readings, cause unknown">
              <UnexplainedTable rows={unknown} onOpenTrend={openTrend} />
            </Section>
          )}
        </>
      )}
    </div>
  );
}

export default MachineAnalysisPage;
