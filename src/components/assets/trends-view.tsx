"use client";

/**
 * Machine sub-page · Trends — the historian / investigation workspace.
 * Main question: "How have this machine's signals and events evolved over time?"
 *
 * One scrolling page with a sticky scroll-spy index (sibling of Analysis,
 * Prognosis, Diagnosis and Health):
 *   KPI strip    outside limits now · excursions · max deviation · events
 *   Signal       one signal vs reference model ±3σ, limits, residual
 *   Compare      2–4 signals normalised on one axis, synced crosshair
 *   Signals      every analog signal by system (D4 §4): card with value, sparkline, window stats
 *   Excursions   periods outside limits or the model band: cards, most severe first
 *   Events       engine + stored operating events, plant time
 *   States       on/off timelines
 * Sections with no data for the machine are not rendered.
 *
 * Data: catalogue (`useMachineCatalog`), stored history (`useMachineHistory`)
 * and, on a live machine (kiln-seal fleet or pyro line), the engine frame
 * (`useKilnSimulationFor`) with its plant definitions (`frame.defs`). Diagnosis
 * owns live alarms, Analysis the "why" and Prognosis the forecasts; this page
 * links there. Open it on a sensor with `focusSensorOn("trends", tag)` or
 * `&sensor=<tag>` (trends-focus.ts).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { PillButton, PillNav } from "@/components/ui";
import type { AssetMachine } from "./assets-data";
import type { AssetsSubPage } from "./assets-view";
import type { KilnSimulation } from "./kiln-seals-simulation";
import { simTimeMs } from "@/lib/kiln-sim/engine";
import { defsFor } from "@/lib/live-defs";
import { useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { useMachineCatalog } from "./use-machine-catalog";
import { useMachineHistory } from "./use-machine-history";
import { TrendTimeZoneContext, type TrendSample } from "./sensor-trend-graph";
import { clearTrendsFocus, peekTrendsFocus, syncTrendsFocusUrl } from "./trends-focus";
import { Empty, PageHeader, SectionIndex, scrollToSection, type SectionIndexItem } from "./analysis/an-ui";
import { createCrosshair } from "./trends-chart";
import {
  TREND_GROUP,
  buildChannels,
  buildEvents,
  channelSeries,
  channelZone,
  downloadCsv,
  findExcursions,
  hasHistory,
  windowItems,
  windowLabel,
  windowSpan,
  windowStats,
  type Channel,
  type TimeWindow,
  type WindowStats,
} from "./trends-model";
import {
  SECTION,
  EventsSection,
  ExcursionsSection,
  ExplorerSection,
  KpiRow,
  SignalsSection,
  OverlaySection,
  StatesSection,
  rankChanged,
  type TrendsCtx,
} from "./trends-sections";
import "./analysis/analysis-page.css";
import "./diagnosis/trends.css";

export interface TrendsViewProps {
  machine: AssetMachine;
  simulation?: KilnSimulation;
  /** @deprecated Navigation goes through the industrial-data context; kept so existing callers compile. */
  onNavigateToSensors?: () => void;
  /** @deprecated Navigation goes through the industrial-data context; kept so existing callers compile. */
  onNavigateToDiagnosis?: () => void;
}

/** sessionStorage key another page can set to open Trends at a section id. */
export const TRENDS_SECTION_KEY = "ultron.trends.section";

/* --------------------------------------------------------------------------
   Wall clock for stored-history machines (SSR-safe: server snapshot 0, 5 s tick)
   -------------------------------------------------------------------------- */

let clockNow = 0;
let clockTimer: ReturnType<typeof setInterval> | null = null;
const clockListeners = new Set<() => void>();

function subscribeClock(cb: () => void) {
  clockListeners.add(cb);
  if (!clockTimer) {
    clockNow = Date.now();
    clockTimer = setInterval(() => {
      clockNow = Date.now();
      clockListeners.forEach((l) => l());
    }, 5000);
  }
  return () => {
    clockListeners.delete(cb);
    if (clockListeners.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

const useWallClock = (enabled: boolean) =>
  useSyncExternalStore(
    enabled ? subscribeClock : () => () => {},
    () => {
      if (!enabled) return 0;
      if (!clockNow) clockNow = Date.now();
      return clockNow;
    },
    () => 0
  );

/** Latest value, at most once per `ms` (small multiples refresh slower than the 1 s live tick). */
function useThrottled<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  const last = useRef(0);
  useEffect(() => {
    const wait = ms - (Date.now() - last.current);
    if (wait <= 0) {
      last.current = Date.now();
      setV(value);
      return;
    }
    const id = setTimeout(() => {
      last.current = Date.now();
      setV(value);
    }, wait);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/* ==========================================================================
   Page
   ========================================================================== */

export function TrendsView({ machine, simulation }: TrendsViewProps) {
  const { setActiveSubPage } = useIndustrialData();
  const catalog = useMachineCatalog(machine);
  const history = useMachineHistory(machine.id);
  const { timeZone, label: zoneText } = useSiteTimeZone({ machineId: machine.id });
  const liveSim = useKilnSimulationFor(machine.id);
  const frame = liveSim?.frame ?? simulation?.frame ?? null;
  const live = frame !== null;
  const defs = frame?.defs ?? defsFor(machine.id);
  const wallNow = useWallClock(!live);
  // Live machine: the axis runs on the simulated plant clock, mapped to local time.
  const now = frame ? simTimeMs(frame.t) : wallNow;

  const wins = windowItems(live);
  const [winPick, setWin] = useState<TimeWindow>(live ? "live" : "24h");
  const win = wins.some((w) => w.id === winPick) ? winPick : wins[0].id;
  const winLabel = windowLabel(win, live);
  const span = windowSpan(win, live);
  const domain = useMemo<[number, number]>(() => [now - span, now], [now, span]);

  const [initialFocus] = useState(() => peekTrendsFocus(machine.id));
  const [selectedId, setSelectedId] = useState<string>(initialFocus ?? "");
  const [stateHighlight, setStateHighlight] = useState<string | null>(null);
  const cross = useMemo(createCrosshair, []);

  useEffect(() => {
    clearTrendsFocus();
  }, []);

  const go = useCallback((sub: AssetsSubPage) => setActiveSubPage(sub), [setActiveSubPage]);

  /* ---- channels, series, statistics, excursions, events ---- */
  const { channels, states } = useMemo(() => buildChannels(catalog, history, frame, defs), [catalog, history, frame, defs]);
  const byId = useMemo(() => new Map(channels.map((c) => [c.id, c])), [channels]);

  const groupName = useMemo(() => {
    const names = new Map(catalog.systems.map((sy) => [sy.systemId, sy.name || sy.shortName]));
    return (g: string) => (g === TREND_GROUP ? "Stored trend records" : (names.get(g) ?? (g || "Unassigned")));
  }, [catalog.systems]);

  const series = useMemo(() => {
    const m = new Map<string, TrendSample[]>();
    for (const c of channels) m.set(c.id, channelSeries(c, span, now, frame, timeZone));
    return m;
  }, [channels, span, now, frame, timeZone]);

  const stats = useMemo(() => {
    const m = new Map<string, WindowStats | null>();
    for (const c of channels) m.set(c.id, windowStats(series.get(c.id) ?? [], c));
    return m;
  }, [channels, series]);

  const excursions = useMemo(() => channels.flatMap((c) => findExcursions(c, series.get(c.id) ?? [], frame)), [channels, series, frame]);
  const events = useMemo(() => buildEvents(history, frame, now, timeZone, defs), [history, frame, now, timeZone, defs]);

  const slowSource = useMemo(() => ({ series, domain, stats }), [series, domain, stats]);
  const slow = useThrottled(slowSource, live ? 5000 : 0);

  const loading = catalog.isLoading || !history.loaded;

  /* ---- focus: ?sensor= / focusSensorOn, then user picks ---- */
  const ranked = useMemo(() => rankChanged({ channels, stats }), [channels, stats]);
  const [autoId, setAutoId] = useState("");
  useEffect(() => {
    if (!selectedId && !autoId && ranked.length) setAutoId(ranked[0].ch.id);
  }, [selectedId, autoId, ranked]);

  const resolve = useCallback((tag: string) => byId.get(tag) ?? channels.find((c) => c.id.toLowerCase() === tag.toLowerCase()), [byId, channels]);
  const active: Channel | undefined = (selectedId ? resolve(selectedId) : undefined) ?? (autoId ? byId.get(autoId) : undefined) ?? channels[0];

  // Keep `&sensor=` in the address bar for an explicitly chosen signal so the view is shareable.
  useEffect(() => {
    const t = setTimeout(() => syncTrendsFocusUrl(machine.id, selectedId ? (active?.id ?? null) : null), 0);
    return () => clearTimeout(t);
  }, [machine.id, selectedId, active?.id]);

  // Cold deep link / cross-page focus: scroll to the explorer (or the state row) once data is in.
  const focusedOnce = useRef(false);
  useEffect(() => {
    if (focusedOnce.current || loading || !initialFocus) return;
    focusedOnce.current = true;
    const isState = states.some((s) => s.id.toLowerCase() === initialFocus.toLowerCase());
    if (isState) setStateHighlight(states.find((s) => s.id.toLowerCase() === initialFocus.toLowerCase())!.id);
    requestAnimationFrame(() => scrollToSection(isState && !resolve(initialFocus) ? SECTION.states : SECTION.explorer));
  }, [loading, initialFocus, states, resolve]);

  const focus = useCallback(
    (tag: string) => {
      setSelectedId(tag);
      scrollToSection(SECTION.explorer);
    },
    []
  );

  const ctx: TrendsCtx = {
    machine,
    frame,
    defs,
    live,
    now,
    span,
    domain,
    winLabel,
    timeZone,
    channels,
    byId,
    states,
    groupName,
    series,
    stats,
    excursions,
    events,
    cross,
    focus,
    go,
  };

  /* ---- which sections have data (empty sections are not rendered) ---- */
  const withHist = channels.filter(hasHistory).length;
  const trendable = useMemo(() => channels.filter((c) => (series.get(c.id)?.length ?? 0) > 1), [channels, series]);
  const outNow = channels.filter((c) => channelZone(c) !== "normal").length;
  const alarmNow = channels.some((c) => channelZone(c) === "alarm");
  const basis = live ? "Live engine · sim." : withHist ? "Stored history" : "No stored history";
  const exAlarm = excursions.some((e) => e.kind === "alarm");
  const stateOff = states.some((s) => s.status !== "Normal");

  const show = {
    explorer: Boolean(active),
    overlay: trendable.length > 1,
    signals: channels.length > 0,
    excursions: excursions.length > 0,
    events: events.length > 0,
    states: states.length > 0,
  };
  const index: SectionIndexItem[] = [
    show.explorer && { id: SECTION.explorer, label: "Signal" },
    show.overlay && { id: SECTION.overlay, label: "Compare" },
    show.signals && { id: SECTION.signals, label: "Signals", tone: alarmNow ? "bad" : outNow ? "warn" : undefined },
    show.excursions && { id: SECTION.excursions, label: "Excursions", tone: exAlarm ? "bad" : "warn" },
    show.events && { id: SECTION.events, label: "Events" },
    show.states && { id: SECTION.states, label: "States", tone: stateOff ? "warn" : undefined },
  ].filter(Boolean) as SectionIndexItem[];

  const exportAll = () => {
    const rows = channels.map((ch) => ({ ch, samples: series.get(ch.id) ?? [] })).filter((r) => r.samples.length);
    downloadCsv(`${machine.id}_trends_${win}.csv`, rows, `${machine.name} · ${basis} · last ${winLabel} · times UTC`);
  };
  const exportOne = (ch: Channel, samples: TrendSample[]) =>
    downloadCsv(`${machine.id}_${ch.id}_${win}.csv`, [{ ch, samples }], `${machine.name} · ${basis} · last ${winLabel} · times UTC`);
  const canExport = trendable.length > 0;

  const windowPills = <PillNav className="pg-trends-pills" ariaLabel="Time range" items={wins} activeId={win} onChange={setWin} />;

  return (
    <TrendTimeZoneContext.Provider value={timeZone}>
      <div className="ast-root pg-frame pg-analysis pg-trends" aria-label="Trends">
        <PageHeader
          title="Trends"
          status={loading ? null : { label: alarmNow ? "Alarm" : outNow ? `${outNow} outside limits` : "Normal", tone: alarmNow ? "bad" : outNow ? "warn" : undefined }}
          meta={[
            { label: "Source", value: live ? "Live (simulated)" : withHist ? "Stored history" : "No stored history" },
            { label: "Window", value: `Last ${winLabel}` },
            { label: "Time zone", value: zoneText },
            { label: "Signals", value: loading ? "—" : `${channels.length} analog · ${states.length} on/off` },
          ]}
          actions={
            <PillButton variant="secondary" onClick={exportAll} disabled={!canExport} title="Download every sample in this window as CSV">
              Export CSV
            </PillButton>
          }
        />

        {!loading && channels.length > 0 && <KpiRow ctx={ctx} />}

        {!loading && index.length > 0 && <SectionIndex items={index} label="Trends sections" pendingKey={TRENDS_SECTION_KEY} right={windowPills} />}

        {loading ? (
          <section className="ast-card" role="status" aria-live="polite">
            <Empty title="Loading trends…" />
          </section>
        ) : channels.length === 0 && states.length === 0 && events.length === 0 ? (
          <p className="pg-trends-muted">No trend data stored for {machine.name}.</p>
        ) : (
          <div className="pg-frame-body pg-analysis-body pg-trends-body">
            {show.explorer && active && <ExplorerSection ctx={ctx} active={active} onSelect={setSelectedId} onExport={exportOne} />}
            {show.overlay && <OverlaySection ctx={ctx} active={active} trendable={trendable} />}
            {show.signals && <SignalsSection ctx={ctx} slow={slow} ranked={ranked} activeId={active?.id} />}
            {show.excursions && <ExcursionsSection ctx={ctx} />}
            {show.events && <EventsSection ctx={ctx} />}
            {show.states && <StatesSection ctx={ctx} highlight={stateHighlight} />}
          </div>
        )}
      </div>
    </TrendTimeZoneContext.Provider>
  );
}
