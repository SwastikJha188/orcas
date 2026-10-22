"use client";

/**
 * Machine sub-page · Analysis — the investigation workspace.
 *
 * Diagnosis says what is happening, Prognosis what is likely to happen,
 * Sensors what is measured. Analysis investigates them, in three windows:
 *
 *   Diagnosis   a problem the engine is matching now
 *   Prognosis   a part Prognosis expects may fail within 6 months
 *   Sensors     a sensor whose reading or signal is abnormal
 *
 * Each window: four KPIs → what there is to investigate (one row each) →
 * the picked investigation in eight numbered steps (what changed, evidence,
 * explanation, likely causes, impact, how it develops, what to do, how to
 * confirm). Every fact says whether it was measured, inferred, predicted or
 * still needs verifying.
 *
 * Other pages open a window with `focusLayer({ ruleId, component, tag,
 * section })`: section "an-diagnosis" (default), "an-prognosis" or
 * "an-sensors" picks the window, the rule / part / sensor the investigation.
 */

import { useComponentScope, type ComponentScope } from "../component-scope";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useKilnFleet, useKilnSimulationFor, useLiveMachineStatus, useLivePlantStarting } from "@/providers/kiln-simulation-context";
import { conditionTone, toCondition } from "@/components/ui/status";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import { formatDuration, simTimeMs, type SimFrame } from "@shared/lib/kiln-sim/engine";
import { isConditionRule } from "@shared/lib/plant-defs";
import { defsFor } from "@/lib/live-defs";
import type { AssetMachine } from "../assets-data";
import type { AssetsSubPage } from "../assets-view";
import { useMachineInsights } from "../use-machine-insights";
import { useMachineCatalog } from "../use-machine-catalog";
import { dxSensorsFromFrame, toDxSensors } from "../diagnosis-model";
import { inDefinitionOrder } from "../diagnosis-rows";
import { ReadingsAgainstExpected } from "./an-readings";
import { kilnHealthModel } from "../health-derive";
import { failureChance, FAILURE_HORIZONS, rangeText, roundHours, rulRows, type RulRow } from "../prognosis/prognosis-derive";
import { reachesAlarm, signalForecastRows } from "../prognosis/prog-signals";
import { PillNav, Loading } from "@/components/ui";
import { focusLayer, focusSensorOn, LAYER_FOCUS_EVENT, readLayerFocus, type LayerFocusPayload } from "../sensor-focus";
import { Empty, KpiStrip, PageHeader, Section, scrollToSection, type AnalysisModuleId, type KpiItem } from "./an-ui";
import { useFeedbackLabels } from "./an-actions";
import { buildIssues, deviationOrder, impactFor, issueFor, unexplained, type Issue } from "./an-issues";
import { issueState } from "./an-issue-view";
import { useFaultLibrary } from "../fault-library";
import { worstProgress } from "./an-intel";
import { SubjectTable, type Subject } from "./an-intel-ui";
import { DiagnosisInvestigation, issueChanges, issueOnset } from "./an-intel-diagnosis";
import { PrognosisInvestigation } from "./an-intel-prognosis";
import { SensorInvestigation, sensorSubjects } from "./an-intel-sensor";
import "./analysis-page.css";
import "../prognosis/prognosis-page.css";

export type { AnalysisModuleId };

/** sessionStorage key another page can set to open Analysis at a section id. */
export const ANALYSIS_ANCHOR_KEY = "ultron.analysis.anchor";
/** The window last open (per viewer, this browser tab). */
const WINDOW_KEY = "ultron.analysis.window";

export type AnalysisWindow = "diagnosis" | "prognosis" | "sensors";

/** Section ids: one per window (the Diagnosis one keeps the id other pages already link to), plus the list. */
export const AN_SECTIONS = {
  diagnosis: "an-diagnosis",
  prognosis: "an-prognosis",
  sensors: "an-sensors",
  list: "an-list",
} as const;

const WINDOWS: { id: AnalysisWindow; label: string }[] = [
  { id: "diagnosis", label: "Diagnosis" },
  { id: "prognosis", label: "Prognosis" },
  { id: "sensors", label: "Sensors" },
];

const windowOf = (section: string | null | undefined): AnalysisWindow | null =>
  section === AN_SECTIONS.prognosis ? "prognosis" : section === AN_SECTIONS.sensors ? "sensors" : section === AN_SECTIONS.diagnosis ? "diagnosis" : null;

const BASIS_WORDS: Record<RulRow["basis"], string> = { finding: "Reading trend", life: "Part life", health: "Health trend" };

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

interface Wanted {
  window: AnalysisWindow | null;
  ruleId: string | null;
  component: string | null;
  tag: string | null;
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
  const { setActiveSubPage, allMachines } = useIndustrialData();
  const insights = useMachineInsights(machine);
  const frame = useKilnSimulationFor(machine.id)?.frame ?? null;
  const fleetSims = useKilnFleet();
  const starting = useLivePlantStarting();
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
  const compTags = useMemo(() => (scope ? new Set(scope.tags) : null), [scope]);
  const inScope = useCallback((subIds: string[]) => !scope || subIds.includes(scope.id), [scope]);
  const contributions = useMemo(() => (frame ? kilnHealthModel(frame, catalog).contributions : null), [frame, catalog]);
  const fleet = useMemo(() => Object.fromEntries(Object.entries(fleetSims).map(([id, s]) => [id, s?.frame ?? null])) as Record<string, SimFrame | null>, [fleetSims]);
  const machineName = useCallback((id: string) => allMachines.find((m) => m.id === id)?.name ?? id, [allMachines]);

  // Diagnosis window: the problems the engine is matching now.
  const faults = useMemo(() => buildIssues(frame, rul, defs).filter((i) => i.kind === "fault" && inScope(i.subIds)), [frame, rul, defs, inScope]);
  // Prognosis window: every part with a time-left estimate, those that may fail within 6 months first
  // (a part's life only once failing is more likely than not: the count every page shows).
  const mayFail = useCallback((x: RulRow) => x.band !== null && failureChance(x.band, FAILURE_HORIZONS[FAILURE_HORIZONS.length - 1].hours) > (x.life ? 50 : 0), []);
  const forecasts = useMemo<Issue[]>(() => {
    const order = new Map((defs?.subassemblies ?? []).map((sa, i) => [sa.id, i]));
    return rul
      .filter((x) => x.band !== null && inScope([x.id]))
      .sort((a, b) => Number(mayFail(b)) - Number(mayFail(a)) || (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999))
      .map((x) => ({ key: `pred-${x.id}`, kind: "predicted", title: x.name, where: x.name, subIds: [x.id], rule: null, life: [x] }));
  }, [rul, defs, inScope, mayFail]);
  const predicted = useMemo(() => forecasts.filter((i) => mayFail(i.life[0])), [forecasts, mayFail]);
  // Sensors window: abnormal sensors (+ one another page asked about).
  const [extraTag, setExtraTag] = useState<string | null>(null);
  const sensorRows = useMemo(() => (frame ? sensorSubjects(frame, compTags, extraTag) : []), [frame, compTags, extraTag]);

  const unknown = useMemo(() => (frame ? unexplained(frame) : []).filter((u) => !compTags || compTags.has(u.tag)), [frame, compTags]);
  const chain = useMemo(
    () => (frame ? deviationOrder(frame).sort((a, b) => b.minutesAgo - a.minutesAgo) : []).filter((c) => !compTags || c.tags.some((t) => compTags.has(t))),
    [frame, compTags],
  );
  const readings = useMemo(() => {
    const list = catalog.sensors.length === 0 && frame ? dxSensorsFromFrame(frame) : toDxSensors(catalog.sensors, frame?.defs ?? null);
    return inDefinitionOrder(list, defs).filter((x) => !compTags || compTags.has(x.tag));
  }, [catalog.sensors, frame, defs, compTags]);

  /* ------------------------------ Selection ------------------------------ */
  const [wanted, setWanted] = useState<Wanted | null>(() => {
    const f = readLayerFocus(false);
    let section: string | null = null;
    try {
      section = sessionStorage.getItem(ANALYSIS_ANCHOR_KEY);
    } catch {
      /* storage unavailable */
    }
    return f.ruleId || f.component || section ? { window: windowOf(section), ruleId: f.ruleId, component: f.component, tag: windowOf(section) === "sensors" ? f.tag : null } : null;
  });
  const [win, setWin] = useState<AnalysisWindow>(() => {
    try {
      const w = sessionStorage.getItem(WINDOW_KEY);
      return w === "prognosis" || w === "sensors" ? w : "diagnosis";
    } catch {
      return "diagnosis";
    }
  });
  const [picked, setPicked] = useState<Record<AnalysisWindow, string | null>>({ diagnosis: null, prognosis: null, sensors: null });
  const [scrollTo, setScrollTo] = useState<string | null>(null);

  const pickWindow = useCallback((w: AnalysisWindow) => {
    setWin(w);
    try {
      sessionStorage.setItem(WINDOW_KEY, w);
    } catch {
      /* storage unavailable: the page opens on Diagnosis next time */
    }
  }, []);

  useEffect(() => {
    const onFocus = (ev: Event) => {
      const d = (ev as CustomEvent<LayerFocusPayload>).detail;
      if (d?.ruleId || d?.component || d?.section) {
        const w = windowOf(d.section);
        setWanted({ window: w, ruleId: d.ruleId ?? null, component: d.component ?? null, tag: w === "sensors" ? (d.tag ?? null) : null });
      }
    };
    window.addEventListener(LAYER_FOCUS_EVENT, onFocus);
    return () => window.removeEventListener(LAYER_FOCUS_EVENT, onFocus);
  }, [machine.id]);

  // Resolve a request from another page once what it names exists.
  const forecastWait = insights.isLoading && !insights.data;
  useEffect(() => {
    if (!wanted) return;
    if (wanted.window === "sensors" || (wanted.tag && !wanted.ruleId)) {
      if (!frame) return;
      if (wanted.tag) {
        setExtraTag(wanted.tag);
        setPicked((p) => ({ ...p, sensors: wanted.tag }));
      }
      pickWindow("sensors");
    } else {
      const fault = faults.length ? issueFor(faults, wanted.ruleId, wanted.window === "prognosis" ? null : wanted.component) : null;
      const pred = forecasts.length ? issueFor(forecasts, null, wanted.component) : null;
      // Wait for the data the request needs: the live frame for a problem, the forecasts for a part.
      if (wanted.window !== "prognosis" && !fault && !frame && starting) return;
      if ((wanted.window === "prognosis" || !fault) && !pred && forecastWait) return;
      if (wanted.window !== "prognosis" && fault) {
        setPicked((p) => ({ ...p, diagnosis: fault.key }));
        pickWindow("diagnosis");
      } else if (pred) {
        setPicked((p) => ({ ...p, prognosis: pred.key }));
        pickWindow("prognosis");
      } else if (wanted.window) {
        pickWindow(wanted.window);
      }
    }
    try {
      sessionStorage.removeItem(ANALYSIS_ANCHOR_KEY);
    } catch {
      /* storage unavailable */
    }
    setScrollTo("an-subject");
    setWanted(null);
  }, [wanted, faults, forecasts, frame, starting, forecastWait, pickWindow]);

  const subjects: Record<AnalysisWindow, Issue[] | null> = { diagnosis: faults, prognosis: forecasts, sensors: null };
  const activeKey = (() => {
    const k = picked[win];
    if (win === "sensors") return sensorRows.find((s) => s.key === k)?.key ?? sensorRows[0]?.key ?? null;
    const list = subjects[win] ?? [];
    // Prognosis opens on its first part at risk; a part with nothing expected opens only when picked.
    const first = win === "prognosis" ? predicted[0] : list[0];
    return list.find((i) => i.key === k)?.key ?? first?.key ?? null;
  })();
  const issue = win === "sensors" ? null : ((subjects[win] ?? []).find((i) => i.key === activeKey) ?? null);
  const sensorTag = win === "sensors" ? activeKey : null;

  // Scroll once the requested investigation has rendered.
  useEffect(() => {
    if (!scrollTo || !(issue || sensorTag)) return;
    const t = window.setTimeout(() => scrollToSection(scrollTo), 120);
    setScrollTo(null);
    return () => window.clearTimeout(t);
  }, [scrollTo, issue, sensorTag]);

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
  const toDiagnosis = () => {
    const ruleId = issue?.rule?.id ?? null;
    focusLayer({ ruleId, component: issue?.where ?? null, section: "dx-diagnosis" });
    if (onNavigateToDiagnosis) onNavigateToDiagnosis(ruleId, issue?.where ?? null, null);
    else setActiveSubPage("diagnosis");
  };
  const toPrognosis = () => {
    const ruleId = issue?.rule?.id ?? null;
    focusLayer({ ruleId, component: issue?.where ?? null, section: "prog-life" });
    if (onNavigateToPrognosis) onNavigateToPrognosis(ruleId, issue?.where ?? null, null);
    else setActiveSubPage("prognosis");
  };
  const investigateSensor = (tag: string) => {
    setExtraTag(tag);
    setPicked((p) => ({ ...p, sensors: tag }));
    pickWindow("sensors");
    setScrollTo("an-subject");
  };
  const investigateProblem = (ruleId: string) => {
    const hit = faults.find((i) => i.rule?.id === ruleId);
    if (!hit) return;
    setPicked((p) => ({ ...p, diagnosis: hit.key }));
    pickWindow("diagnosis");
    setScrollTo("an-subject");
  };

  /* ------------------------------ Subjects ------------------------------- */
  const faultRows: Subject[] = useMemo(
    () =>
      faults.map((i) => {
        const changes = frame ? issueChanges(i, frame) : [];
        const onset = issueOnset(changes);
        return {
          key: i.key,
          title: i.title,
          where: i.where,
          state: issueState(i, frame),
          how: worstProgress(changes.map((c) => c.progress)) ?? onset.how,
          tone: i.rule?.status !== "PENDING" && i.rule?.severity === "Critical" ? "bad" : "warn",
        };
      }),
    [faults, frame],
  );
  const predRows: Subject[] = useMemo(
    () =>
      forecasts.map((i) => {
        const x = i.life[0];
        const risk = mayFail(x);
        return {
          key: i.key,
          title: i.title,
          where: x.band ? rangeText(x.band.lo, x.band.hi) : x.dueLabel,
          state: x.band ? `${failureChance(x.band, 720)} % · ${failureChance(x.band, 4320)} %` : "—",
          how: x.band?.curve ? BASIS_WORDS.life : BASIS_WORDS[x.basis],
          tone: !risk ? undefined : x.band && failureChance(x.band, 720) >= 50 ? "bad" : "warn",
        };
      }),
    [forecasts, mayFail],
  );

  // Parts listed by default: at risk, or at least a 5 % chance of failing within 6 months; the rest on request.
  const [allParts, setAllParts] = useState(false);
  const noticeable = useMemo(() => new Set(forecasts.filter((i) => i.life[0].band && failureChance(i.life[0].band, 4320) >= 5).map((i) => i.key)), [forecasts]);
  const shownParts = predRows.filter((r) => r.tone || r.key === activeKey || noticeable.has(r.key)).length;

  /* -------------------------------- KPIs -------------------------------- */
  const confirming = faults.filter((i) => i.rule?.status === "PENDING").length;
  const worsening = faultRows.filter((r) => r.how?.startsWith("Worsening")).length;
  const first = chain[0] ?? null;
  const forecastFail = insights.isError && !insights.data;
  const liveWait = !frame && starting;
  const soonest = predicted.reduce<RulRow | null>((m, i) => {
    const x = i.life[0];
    return x.band && (!m || !m.band || x.band.lo < m.band.lo) ? x : m;
  }, null);
  const scopedForecasts = forecastRows.filter((r) => !compTags || compTags.has(r.tag));
  const toAlarm = scopedForecasts.filter(reachesAlarm);
  const outOfStep = (data?.correlation.pairs ?? []).filter(
    (p) =>
      p.baseline !== undefined &&
      p.recent !== undefined &&
      Math.abs(p.recent - p.baseline) >= 0.3 &&
      Math.max(Math.abs(p.baseline), Math.abs(p.recent)) >= 0.5 &&
      (!compTags || compTags.has(p.a) || compTags.has(p.b)),
  );
  const pl = frame?.pipeline;
  // Sensors working (not invalid or suspect): the machine's from the engine, a part's from its own sensors.
  const working = useMemo(() => {
    if (!frame) return null;
    if (!compTags) return pl ? { ok: pl.valid, of: pl.valid + pl.held + pl.invalid + pl.suspect } : null;
    const mine = [...compTags].map((t) => frame.signals[t]).filter(Boolean);
    return { ok: mine.filter((x) => x.quality !== "Invalid" && x.quality !== "Suspect").length, of: mine.length };
  }, [frame, pl, compTags]);
  const untrusted = frame ? Object.values(frame.signals).filter((s) => s.quality !== "Good" && (!compTags || compTags.has(s.tag))) : [];
  const untrustedTags = new Set(untrusted.map((s) => s.tag));
  const blinded = frame
    ? frame.rules.filter((r) => isConditionRule(r) && [...(frame.defs.ruleById[r.id]?.inputs ?? []), ...r.tags].some((t) => untrustedTags.has(t))).length
    : 0;
  const unusual = sensorRows.filter((s) => s.tone && Math.floor(s.group / 1000) >= 2).length;

  const kpis: Record<AnalysisWindow, KpiItem[]> = {
    diagnosis: [
      {
        label: "Problems now",
        loading: liveWait,
        value: frame ? String(faults.length) : "—",
        foot: frame ? `${faults.length - confirming} confirmed · ${confirming} being checked` : "No live data for this machine",
        tone: faults.length - confirming > 0 ? (faults.some((i) => i.rule?.status !== "PENDING" && i.rule?.severity === "Critical") ? "bad" : "warn") : undefined,
      },
      {
        label: "Getting worse",
        loading: liveWait,
        value: frame ? String(worsening) : "—",
        unit: worsening === 1 ? "problem" : "problems",
        foot: faults.length ? `Of ${faults.length}, the gap to expected still growing` : "No problem to follow",
        tone: worsening ? "warn" : undefined,
      },
      {
        label: "Where it started",
        loading: liveWait,
        value: first ? first.name : "None",
        text: true,
        foot: first ? `${first.minutesAgo > 0 ? `${formatDuration(first.minutesAgo)} ago` : "Just now"} · ${first.tags.length} sensor${first.tags.length === 1 ? "" : "s"} off expected` : "Every sensor reads as expected",
      },
      {
        label: "Unusual, cause unknown",
        loading: liveWait,
        value: frame ? String(unknown.length) : "—",
        unit: "sensors",
        foot: unknown.length ? "Investigate them under Sensors" : "No unexplained reading",
        tone: unknown.length ? "warn" : undefined,
      },
    ],
    prognosis: [
      {
        label: "Parts that may fail in 6 months",
        loading: forecastWait,
        value: data ? String(predicted.length) : "—",
        unit: "parts",
        foot: predicted[0] ? `First listed: ${predicted[0].title}` : data ? "No part expected to fail" : "No forecast for this machine",
        tone: predicted.length ? "warn" : undefined,
      },
      {
        label: "Earliest likely failure",
        loading: forecastWait,
        value: soonest?.band ? roundHours(soonest.band.lo) : "None",
        text: !soonest?.band,
        foot: soonest ? soonest.name : "Nothing expected within 6 months",
        tone: soonest?.band && soonest.band.lo <= 720 ? "warn" : undefined,
      },
      {
        label: "Readings heading for alarm",
        loading: forecastWait,
        value: data ? String(toAlarm.length) : "—",
        unit: "sensors",
        foot: "May reach the alarm limit in the next 30 days",
        tone: toAlarm.length ? "warn" : undefined,
      },
      {
        label: "Sensors out of step",
        loading: forecastWait,
        value: data ? String(outOfStep.length) : "—",
        unit: "pairs",
        foot: "No longer rise and fall together as before",
        tone: outOfStep.length ? "warn" : undefined,
      },
    ],
    sensors: [
      {
        label: "Sensors working",
        loading: liveWait,
        value: working ? `${working.ok}` : "—",
        unit: working ? `of ${working.of}` : undefined,
        foot: "Pass the sensor checks",
        bar: working && working.of ? (working.ok / working.of) * 100 : undefined,
      },
      {
        label: "Readings not trusted",
        loading: liveWait,
        value: frame ? String(untrusted.length) : "—",
        unit: "sensors",
        foot: untrusted.length ? `${untrusted.filter((s) => s.quality === "Invalid").length} invalid · ${untrusted.filter((s) => s.quality === "Suspect").length} suspect` : "Every reading passes its checks",
        tone: untrusted.some((s) => s.quality === "Invalid") ? "bad" : untrusted.length ? "warn" : undefined,
      },
      {
        label: "Unusual signals",
        loading: liveWait,
        value: frame ? String(unusual) : "—",
        unit: "sensors",
        foot: "Off expected with no known cause, or an odd signal shape",
        tone: unusual ? "warn" : undefined,
      },
      {
        label: "Checks affected",
        loading: liveWait,
        value: frame ? String(blinded) : "—",
        unit: "checks",
        foot: "Problem checks that read an untrusted sensor",
        tone: blinded ? "warn" : undefined,
      },
    ],
  };

  const inferredAt = frame
    ? formatLocalTime(simTimeMs(frame.t), { seconds: false, zone: true, timeZone: tz.timeZone })
    : insights.data?.generatedAt
      ? Number.isNaN(Date.parse(insights.data.generatedAt))
        ? insights.data.generatedAt
        : formatLocalTime(insights.data.generatedAt, { date: true, seconds: false, zone: true, timeZone: tz.timeZone })
      : null;
  const checks = frame ? (scope ? frame.rules.filter((r) => r.subs.includes(scope.id)).length : frame.rules.length) : 0;
  const impact = issue ? impactFor(issue, frame, contributions, rul) : [];

  /* ------------------------------- Render ------------------------------- */
  const counts: Record<AnalysisWindow, number | null> = {
    diagnosis: frame ? faults.length : null,
    prognosis: data ? predicted.length : null,
    sensors: frame ? sensorRows.filter((s) => s.tone).length : null,
  };
  const listTitle: Record<AnalysisWindow, string> = {
    diagnosis: "Problems now",
    prognosis: "Time left by part",
    sensors: "Sensors to look at",
  };
  const sensorSubject = sensorRows.find((s) => s.key === sensorTag) ?? null;
  const subjectHead = issue
    ? { title: issue.title, sub: win === "diagnosis" ? `${issue.where} · ${issueState(issue, frame)}` : issueState(issue, frame) }
    : sensorSubject
      ? { title: sensorSubject.title, sub: `${sensorSubject.where} · ${sensorSubject.state}` }
      : null;

  const listBody = (() => {
    if (win === "prognosis") {
      if (forecastWait) return <Loading label="Loading the forecasts…" rows={3} />;
      if (forecastFail)
        return (
          <Empty title="The forecasts could not be loaded.">
            <button type="button" className="pg-diag-inline-link" onClick={insights.retry} disabled={insights.retrying}>
              {insights.retrying ? "Trying again…" : "Try again"}
            </button>
          </Empty>
        );
      if (!data) return <Empty title="No forecast is available for this machine." />;
      return predRows.length ? (
        <>
          {!predicted.length && <Empty title={`No part${scope ? ` of ${scope.name}` : ""} is likely to fail in the next 6 months. Pick a part to see what its estimate rests on.`} />}
          <SubjectTable
            rows={allParts ? predRows : predRows.filter((r) => r.tone || r.key === activeKey || noticeable.has(r.key))}
            activeKey={activeKey}
            onPick={(k) => setPicked((p) => ({ ...p, prognosis: k }))}
            headers={{ where: "Likely time left", state: "Chance of failure in 1 mo · 6 mo", how: "Based on" }}
          />
          {predRows.length > shownParts && (
            <button type="button" className="pg-diag-inline-link pg-in-more" onClick={() => setAllParts((v) => !v)}>
              {allParts ? "Show only parts with a real chance of failing" : `Show all ${predRows.length} parts`}
            </button>
          )}
        </>
      ) : (
        <Empty title={`No time-left estimate${scope ? ` for ${scope.name}` : ""} yet.`} />
      );
    }
    if (liveWait) return <Loading label="Loading the live readings…" rows={3} />;
    if (!frame) return <Empty title="No live readings for this machine, so there is nothing to investigate yet." />;
    if (win === "diagnosis")
      return faultRows.length ? (
        <SubjectTable
          rows={faultRows}
          activeKey={activeKey}
          onPick={(k) => {
            setPicked((p) => ({ ...p, diagnosis: k }));
            const next = faults.find((i) => i.key === k);
            if (next?.rule) focusLayer({ ruleId: next.rule.id });
          }}
          headers={{ how: "Trend" }}
        />
      ) : (
        <Empty
          title={
            readings.length === 0 && !catalog.isLoading
              ? `${scope ? scope.name : machine.name} has no sensors yet, so nothing on it can be checked.`
              : `No problem has been found${scope ? ` on ${scope.name}` : ""}. Every reading against what is expected is below.`
          }
        />
      );
    return sensorRows.length ? (
      <SubjectTable rows={sensorRows} activeKey={activeKey} onPick={(k) => setPicked((p) => ({ ...p, sensors: k }))} headers={{ how: "Signal" }} />
    ) : (
      <Empty title="Every sensor passes its checks and reads as expected." />
    );
  })();

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

      <PillNav
        className="pg-in-windows"
        items={WINDOWS.map((w) => ({
          id: w.id,
          label: w.label,
          suffix: counts[w.id] !== null ? <span className="pg-in-window-count ast-num">{counts[w.id]}</span> : undefined,
        }))}
        activeId={win}
        onChange={pickWindow}
        ariaLabel="What to investigate"
      />

      <KpiStrip page items={kpis[win]} label={`${WINDOWS.find((w) => w.id === win)!.label} investigation summary`} />

      <Section
        id={AN_SECTIONS.list}
        title={win === "prognosis" ? listTitle[win] : counts[win] ? `${listTitle[win]} (${counts[win]})` : listTitle[win]}
        right={
          win === "diagnosis" && issue ? (
            <button type="button" className="pg-diag-inline-link" onClick={toDiagnosis}>
              See on Diagnosis <span aria-hidden="true">→</span>
            </button>
          ) : win === "prognosis" && issue ? (
            <button type="button" className="pg-diag-inline-link" onClick={toPrognosis}>
              See on Prognosis <span aria-hidden="true">→</span>
            </button>
          ) : undefined
        }
      >
        {listBody}
      </Section>

      {subjectHead && (
        <div id="an-subject" className="pg-in-subject">
          <h2 className="pg-in-subject-title">{subjectHead.title}</h2>
          <span className="pg-in-subject-sub">{subjectHead.sub}</span>
        </div>
      )}

      <div id={AN_SECTIONS[win]} className="pg-in-steps">
        {win === "diagnosis" && issue && frame && (
          <DiagnosisInvestigation
            key={issue.key}
            issue={issue}
            frame={frame}
            library={library}
            feedback={feedback}
            machineId={machine.id}
            impact={impact}
            fleet={fleet}
            machineName={machineName}
            onOpenTrend={openTrend}
            onInvestigateSensor={investigateSensor}
            onSeeSensors={toDiagnosis}
            onSeeTimeLeft={data && issue.life.length > 0 ? toPrognosis : null}
          />
        )}
        {win === "diagnosis" && !issue && frame && readings.length > 0 && (
          <Section id="an-readings" title="Readings against what is expected" right={<span className="ast-num pg-diag-muted">{readings.length} sensors</span>}>
            <ReadingsAgainstExpected sensors={readings} frame={frame} onOpenTrend={openTrend} />
          </Section>
        )}
        {win === "prognosis" && issue && data && (
          <PrognosisInvestigation
            key={issue.key}
            issue={issue}
            data={data}
            defs={defs}
            frame={frame}
            library={library}
            forecastRows={forecastRows}
            impact={impact}
            onOpenTrend={openTrend}
            onSeeTimeLeft={toPrognosis}
          />
        )}
        {win === "sensors" && sensorTag && frame && (
          <SensorInvestigation key={sensorTag} tag={sensorTag} frame={frame} library={library} onOpenTrend={openTrend} onInvestigateProblem={investigateProblem} />
        )}
      </div>
    </div>
  );
}

export default MachineAnalysisPage;
