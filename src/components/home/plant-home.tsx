"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import { useApi } from "@/lib/api-cache";
import { combinedTrack } from "@/lib/health-recorder";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { PRIMARY_PYRO_ID, isLiveMachine, useKilnFleet, usePrimaryMachineId } from "@/providers/kiln-simulation-context";
import type { KilnSimulation } from "@/components/assets/kiln-seals-simulation";
import { formatClock, formatDuration } from "@/lib/kiln-sim/engine";
import type { DiagnosisRecord, HierarchyNode, OperatingEvent } from "@/components/assets/assets-data";
import { IconChevron, IconClose, StatusTag, Ticks, healthTone, machineTone } from "@/components/assets/assets-shell-ui";
import { Sparkline } from "@/components/ui/sparkline";
import { TypeIcon } from "@/components/assets/hierarchy/hierarchy-icons";
import { toCondition } from "@/components/ui/status";
import {
  type MachineLookup,
  averageHealth,
  distribution,
  isFolder,
  machineCondition,
  rollupTone,
  shortName,
  subtreeMachines,
} from "@/components/assets/hierarchy/hierarchy-model";
import { useHierarchyData } from "@/components/assets/hierarchy/use-hierarchy-data";
import { OpsCenter } from "@/components/ops/ops-center";
import { PlantTwin } from "./twin/plant-twin";
import { MachineTwinHome } from "./twin/machine-twin-view";
import { useCoveredInset, type Side } from "./twin/use-covered-inset";
import { AlertsFeed, HealthTrendCard, PlantHealthGauge, conditionSummary, type HomeActivity, type HomeAlert } from "./home-widgets";
import "@/components/assets/assets-shell.css";
import "./plant-home.css";
import { homeActive } from "./home-active";

/* The pyro line's site overview replaces the generic plant twin for that plant only (three.js stays out of the first chunk). */
const PyroSiteOverview = dynamic(() => import("./twin/pyro-site-overview").then((m) => m.PyroSiteOverview), {
  ssr: false,
  loading: () => <div className="ph-twin-loading" role="status">Loading 3D twin…</div>,
});

/* ==========================================================================
   Home — plant overview (ULTRON DashboardOverview, Home / Digital Twin view).
   3D twin view: the twin fills the page, with no header, and the plant health
   gauge, alerts feed and health-over-time float over it as HUD panels. Layout view: gauge
   and alerts in a sidebar beside the 2D plan and the trend. One plant at a time.
   ========================================================================== */

const CLEARED_HOLD_MS = 60_000;
/** Live activity entries shown under the alerts, newest first across the kiln fleet. */
const ACTIVITY_LIMIT = 24;
const MAP_VIEW_KEY = "ultron.home.viewMode";
export type MapView = "operator" | "twin" | "layout";

const VIEW_ITEMS = [
  { id: "operator", label: "Operator view" },
  { id: "twin", label: "3D twin" },
  { id: "layout", label: "Layout" },
];

const NO_INSET = { top: 0, right: 0, bottom: 0, left: 0 };

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}


/** Stored alert sources for machines without live telemetry: diagnosis_records and operating_events. */
function useStoredAlertSources() {
  const d = useApi<DiagnosisRecord[]>("/api/diagnosis");
  const e = useApi<OperatingEvent[]>("/api/history");
  const diagnosis = useMemo(() => (Array.isArray(d.data) ? d.data : []), [d.data]);
  const events = useMemo(() => (Array.isArray(e.data) ? e.data : []), [e.data]);
  const failed = [d.error && `/api/diagnosis · ${d.error}`, e.error && `/api/history · ${e.error}`].filter(Boolean);
  return { diagnosis, events, loading: d.isLoading || e.isLoading, error: failed.length > 0 ? failed.join(" · ") : null };
}

export function PlantHome() {
  const { navigateToMachine, setActiveTab, selectedPlantId, selectedMachine, setSelectedMachineId } = useIndustrialData();
  const { roots, lookup, isLoading: hierarchyLoading, loadError } = useHierarchyData();
  const stored = useStoredAlertSources();
  const fleet = useKilnFleet();
  const isPyroLine = usePrimaryMachineId() === PRIMARY_PYRO_ID;

  // The plant comes from the top bar's plant switcher.
  const plantId = selectedPlantId;
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => setSelected(null), [plantId]);

  const [view, setView] = useState<MapView>("operator");
  useEffect(() => {
    const v = readStored(MAP_VIEW_KEY);
    if (v === "operator" || v === "twin" || v === "layout") setView(v);
  }, []);
  const chooseView = useCallback((v: MapView) => {
    setView(v);
    store(MAP_VIEW_KEY, v);
  }, []);
  const toLayout = useCallback(() => setView("layout"), []);

  const stageRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const hudPanels = useMemo<Array<[Side, React.RefObject<HTMLElement | null>]>>(
    () => [["right", sideRef], ["bottom", bottomRef], ["top", topRef]],
    [],
  );
  const plant = roots.find((p) => p.id === plantId) ?? roots[0];
  // Measure only once the twin stage is actually mounted: on first load the page
  // renders a loading state (no stage), and a measurement taken then never re-ran,
  // so the camera framed the plant under the HUD panels.
  const covered = useCoveredInset(stageRef, hudPanels, view === "twin" && Boolean(plant) && !selectedMachine);
  const machines = useMemo(() => (plant ? subtreeMachines(plant) : []), [plant]);
  const dist = distribution(machines, lookup);
  /* Pyro plant: the gauge shows the line-card number (pyro-site-overview `line`):
     round(0.6 × worst + 0.4 × mean) of the machines' live scores, so one bad
     machine shows. Kiln Home keeps the plain mean. */
  const pyroScore = useMemo(() => {
    if (!isPyroLine) return null;
    const scores = machines.flatMap((m) => {
      const f = m.machineId ? fleet[m.machineId]?.frame : null;
      return f ? [Math.round(f.overall)] : [];
    });
    if (!scores.length) return null;
    return Math.round(0.6 * Math.min(...scores) + (0.4 * scores.reduce((n, v) => n + v, 0)) / scores.length);
  }, [isPyroLine, machines, fleet]);
  const score = pyroScore ?? averageHealth(machines, lookup);
  /* The plant's live kilns, each with its own running engine. All engines
     share one clock, so the first one's frame dates the plant. */
  const live = useMemo(
    () =>
      machines
        .filter((m) => isLiveMachine(m.machineId) && fleet[m.machineId!])
        .map((m) => ({ node: m, sim: fleet[m.machineId!] as KilnSimulation })),
    [machines, fleet],
  );
  const frame = live[0]?.sim.frame ?? null;
  const hasLive = live.length > 0;
  const liveHistory = useMemo(
    () => Object.fromEntries(live.map(({ node, sim }) => [node.machineId!, sim.frame.healthHistory.overall.slice(-90)])),
    [live],
  );

  /* Health over time, on the real clock (@/lib/health-recorder): live machines
     are recorded every tick; the others hold their recorded health, so the
     plant average moves with the live plant. */
  const trackPlant = useCallback(
    (from: number) => {
      const liveNodes = new Set(live.map((l) => l.node));
      const others = machines.filter((m) => !liveNodes.has(m)).reduce((n, m) => n + machineCondition(m, lookup).health, 0);
      const ids = live.map((l) => l.node.machineId!);
      return combinedTrack(ids, from, (v) => (others + ids.reduce((n, id) => n + v[id], 0)) / machines.length);
    },
    [live, machines, lookup],
  );

  /* Alerts: confirmed rules from the live engine; for machines without live
     telemetry, the Advisory / Critical findings in diagnosis_records and the
     Advisory / Critical entries in operating_events. Nothing is derived from
     a machine's status alone. */
  const activeAlerts = useMemo<HomeAlert[]>(() => {
    const out: HomeAlert[] = [];
    for (const { node, sim } of live) {
      const f = sim.frame;
      for (const r of f.rules) {
        if (r.status !== "ACTIVE" || r.severity === "Normal") continue;
        out.push({
          id: `${node.machineId}:${r.id}`,
          level: r.severity === "Critical" ? "danger" : "alert",
          machine: node.name,
          machineId: node.machineId!,
          finding: r.name,
          reading: r.evidence,
          recommendation: `${r.action} Likely cause: ${r.cause}.`,
          cause: r.cause,
          consequence: r.consequence,
          ruleLogic: `${r.id} — ${r.logic}`,
          action: r.action,
          age: r.since !== null ? `${formatDuration(f.t - r.since)} ago` : null,
          raised: r.since !== null ? formatClock(r.since).clock : null,
          t: r.since,
        });
      }
      for (const sig of Object.values(f.signals)) {
        if (sig.limitSeverity !== "Critical" && sig.limitSeverity !== "Advisory") continue;
        const def = f.defs.signalByTag[sig.tag];
        if (!def) continue;
        const onset = f.t - Math.max(1, f.scenarioMinute);
        out.push({
          id: `${node.machineId}:sig:${sig.tag}`,
          level: sig.limitSeverity === "Critical" ? "danger" : "alert",
          machine: node.name,
          machineId: node.machineId!,
          finding: `${def.name} (${sig.tag}) — ${sig.limitSeverity === "Critical" ? "Alarm" : "Warning"} limit`,
          reading: `${sig.display}${def.unit ? ` ${def.unit}` : ""}${sig.limitNote ? ` · ${sig.limitNote}` : ` · normal ${def.normalBand}`}`,
          recommendation: `Check ${def.name} (${sig.tag}) against normal band (${def.normalBand}).`,
          age: f.scenarioMinute > 0 ? `${formatDuration(f.scenarioMinute)} ago` : "live",
          raised: formatClock(onset).clock,
          t: onset,
        });
      }
    }
    const nameById = new Map<string, string>();
    for (const m of machines) {
      if (m.machineId && !machineCondition(m, lookup).isLive) nameById.set(m.machineId, m.name);
    }
    for (const rec of stored.diagnosis) {
      const name = nameById.get(rec.machineId);
      if (!name) continue;
      for (const f of rec.findings) {
        if (f.severity !== "Advisory" && f.severity !== "Critical") continue;
        out.push({
          id: `${rec.machineId}:dx:${f.id}`,
          level: f.severity === "Critical" ? "danger" : "alert",
          machine: name,
          machineId: rec.machineId,
          finding: f.fault,
          reading: `${f.location} · ${f.frequency} · ${f.probability} %`,
          recommendation: f.recommendation,
          cause: f.fault,
          action: f.recommendation,
          age: null,
          raised: null,
          t: null,
          origin: `diagnosis_records · ${rec.engineVersion}`,
        });
      }
    }
    for (const evt of stored.events) {
      const name = nameById.get(evt.machineId);
      if (!name || (evt.severity !== "Advisory" && evt.severity !== "Critical")) continue;
      out.push({
        id: `${evt.machineId}:evt:${evt.id}`,
        level: evt.severity === "Critical" ? "danger" : "alert",
        machine: name,
        machineId: evt.machineId,
        finding: evt.title,
        reading: evt.type,
        recommendation: evt.description,
        cause: evt.title,
        action: evt.description,
        age: evt.timestamp,
        raised: evt.timestamp,
        t: null,
        origin: `operating_events · ${evt.source}`,
      });
    }
    return out;
  }, [live, machines, lookup, stored.diagnosis, stored.events]);

  /* Live activity: every live kiln's event stream merged, newest first (rules
     confirmed and cleared, limit alarms, crew actions, signal quality, state
     changes). Scenario switches are demo mechanics and stay on the
     Simulation tab. */
  const activity = useMemo<HomeActivity[]>(() => {
    const seen = new Map<string, number>();
    return live
      .flatMap(({ node, sim }) => sim.frame.events.filter((e) => e.kind !== "scenario").map((e) => ({ e, node })))
      .sort((a, b) => b.e.t - a.e.t)
      .slice(0, ACTIVITY_LIMIT)
      .map(({ e, node }) => {
        const base = `${node.machineId}:${e.t}:${e.kind}:${e.title}`;
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        const restored = (e.kind === "rule" || e.kind === "quality" || e.kind === "limit") && e.severity === "Normal";
        const tone: HomeActivity["tone"] =
          e.kind === "action" ? (e.title.startsWith("Plant healthy") || e.action?.kind === "complete" ? "good" : "info")
          : restored ? "good"
          : e.severity === "Critical" ? "bad"
          : e.severity === "Advisory" ? "warn"
          : "idle";
        const tag =
          e.kind === "action" ? (e.action ? (e.action.auto ? "CREW" : "OPERATOR") : "PLANT")
          : e.kind === "rule" || e.kind === "limit" ? (restored ? "CLEARED" : e.severity === "Critical" ? "CRITICAL" : "ADVISORY")
          : e.kind === "quality" ? "SENSOR"
          : "STATE";
        return {
          id: `${base}:${n}`,
          clock: e.clock,
          machine: node.machineId!,
          machineId: node.machineId!,
          tag,
          tone,
          title: e.kind === "limit" ? `Limit · ${e.title}` : e.title,
          detail: e.detail,
        };
      });
  }, [live]);

  // Cleared alerts linger for a minute, marked CLEARED (ULTRON AlertsFindings).
  const [cleared, setCleared] = useState<Array<HomeAlert & { at: number }>>([]);
  const [prev, setPrev] = useState<HomeAlert[]>([]);
  if (prev !== activeAlerts) {
    const ids = new Set(activeAlerts.map((a) => a.id));
    // Only alerts of this plant can clear; switching plant is not a clearance.
    const inPlant = new Set(machines.map((m) => m.machineId));
    const now = Date.now();
    const gone = prev
      .filter((a) => !ids.has(a.id) && inPlant.has(a.machineId))
      .map((a) => ({ ...a, at: now, cleared: frame ? formatClock(frame.t).clock : "now" }));
    setPrev(activeAlerts);
    setCleared((c) => [
      ...c.filter((a) => !ids.has(a.id) && inPlant.has(a.machineId) && now - a.at < CLEARED_HOLD_MS),
      ...gone,
    ]);
  }
  useEffect(() => {
    if (cleared.length === 0) return;
    const timer = setInterval(() => setCleared((c) => c.filter((a) => Date.now() - a.at < CLEARED_HOLD_MS)), 5_000);
    return () => clearInterval(timer);
  }, [cleared.length]);

  const alerts = useMemo(
    () => [...activeAlerts, ...cleared].sort((a, b) => (b.t ?? -Infinity) - (a.t ?? -Infinity)),
    [activeAlerts, cleared],
  );
  const alertsByMachine = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of activeAlerts) map.set(a.machineId, (map.get(a.machineId) ?? 0) + 1);
    return map;
  }, [activeAlerts]);

  const plantSummary = conditionSummary(dist);

  const liveIds = useMemo(
    () =>
      new Set(
        machines.filter((m) => m.machineId && machineCondition(m, lookup).isLive).map((m) => m.machineId!),
      ),
    [machines, lookup],
  );

  const openDiagnosis = (machineId: string) => navigateToMachine(machineId, "diagnosis");

  if (!plant && hierarchyLoading) {
    return (
      <div className="ph-root ast-root">
        <div className="ast-card ast-empty ph-empty-workspace" role="status" aria-live="polite">
          <strong>Loading plant…</strong>
        </div>
      </div>
    );
  }

  if (!plant && loadError) {
    return (
      <div className="ph-root ast-root">
        <div className="ast-card ast-empty ph-empty-workspace" role="alert">
          <strong>Plant data unavailable. Retry.</strong>
        </div>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="ph-root ast-root">
        <div className="ast-card ast-empty ph-empty-workspace">
          <strong>No plant configured.</strong>
          <PillButton onClick={() => setActiveTab("configure")}>Open Configure</PillButton>
        </div>
      </div>
    );
  }

  // A machine picked in the top bar's machine switcher replaces the plant with its
  // 3D twin, in the same page: the HUD panels stay and show the machine's data.
  if (selectedMachine) {
    return (
      <MachineTwinHome
        machine={selectedMachine}
        alerts={alerts.filter((a) => a.machineId === selectedMachine.id)}
        activity={activity.filter((a) => a.machineId === selectedMachine.id)}
        alertsLoading={stored.loading}
        alertsError={stored.error}
        onOpenDiagnosis={openDiagnosis}
        onBack={() => setSelectedMachineId(null)}
        onOpen={(sub) => navigateToMachine(selectedMachine.id, sub)}
        viewMode={view === "twin" ? "twin" : "operator"}
        onChangeViewMode={(m) => chooseView(m)}
      />
    );
  }

  const head = (
    <header className="ast-head ph-head">
      <div className="ast-head-main">
        <ol className="ast-crumbs" aria-label="Location">
          <li>Home</li>
          <li>Plant overview</li>
        </ol>
        <div className="ast-title-row">
          <h1 className="ast-title">{shortName(plant.name)}</h1>
          <StatusTag tone={plantSummary.tone} label={plantSummary.label} />
          {hasLive && (
            <span className="ph-live">
              <i aria-hidden="true" />
              Live
            </span>
          )}
        </div>
      </div>
      <div className="pg-actions" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <PillNav items={VIEW_ITEMS} activeId={view} onChange={(id) => chooseView(id as MapView)} className="ph-head-nav" />
      </div>
    </header>
  );

  if (view === "twin") {
    return (
      <div className="ph-root ph-immersive ast-root" aria-label="Plant overview">
        <div ref={stageRef} className="ph-stage">
          {isPyroLine ? (
            <PyroSiteOverview inset={covered} onUnsupported={toLayout} />
          ) : (
            <PlantTwin
              plant={plant}
              lookup={lookup}
              alertsByMachine={alertsByMachine}
              liveIds={liveIds}
              onOpenMachine={(id) => navigateToMachine(id, "overview")}
              onUnsupported={toLayout}
              inset={covered}
            />
          )}
        </div>
        <div className="ph-hud">
          <div ref={topRef} className="mt3-bar ph-top-bar">
            <span className="mt3-title">
              <span className="mt3-name">{shortName(plant.name)}</span>
            </span>
            <StatusTag tone={plantSummary.tone} label={plantSummary.label} />
            <PillNav items={VIEW_ITEMS} activeId="twin" onChange={(id) => chooseView(id as MapView)} className="ph-head-nav" />
          </div>
          <aside ref={sideRef} className="ph-hud-side" aria-label="Plant condition">
            <PlantHealthGauge score={score} dist={dist} />
            <AlertsFeed
              alerts={alerts}
              activity={activity}
              onOpen={openDiagnosis}
              onNavigate={(mId, sub) => navigateToMachine(mId, sub)}
              loading={stored.loading}
              error={stored.error}
            />
          </aside>
          <div ref={bottomRef} className="ph-hud-bottom ph-strip">
            <HealthTrendCard track={trackPlant} />
          </div>
        </div>
      </div>
    );
  }

  if (view === "operator") {
    return (
      <div className="ph-root ph-operator ast-root" aria-label="Plant overview — Operator view">
        {head}

        <div className="ph-operator-grid">
          <div className="ph-operator-main">
            <section className="ast-card ph-card ph-twin-card" aria-label="Digital twin">
              <div className="ph-twin-card-stage">
                {isPyroLine ? (
                  <PyroSiteOverview inset={NO_INSET} onUnsupported={toLayout} />
                ) : (
                  <PlantTwin
                    plant={plant}
                    lookup={lookup}
                    alertsByMachine={alertsByMachine}
                    liveIds={liveIds}
                    onOpenMachine={(id) => navigateToMachine(id, "overview")}
                    onUnsupported={toLayout}
                    inset={NO_INSET}
                  />
                )}
              </div>
            </section>
            <div className="ph-strip ph-strip-compact">
              <HealthTrendCard track={trackPlant} compact />
            </div>
          </div>

          <aside className="ph-operator-side" aria-label="Plant condition">
            <PlantHealthGauge score={score} dist={dist} compact />
            <AlertsFeed
              alerts={alerts}
              activity={activity}
              onOpen={openDiagnosis}
              onNavigate={(mId, sub) => navigateToMachine(mId, sub)}
              loading={stored.loading}
              error={stored.error}
              operatorMode
            />
          </aside>
        </div>

        {hasLive && <OpsCenter />}
      </div>
    );
  }

  return (
    <div className="ph-root ast-root" aria-label="Plant overview">
      {head}

      <div className="ph-body">
        <aside className="ph-side" aria-label="Plant condition">
          <PlantHealthGauge score={score} dist={dist} />
          <AlertsFeed
            alerts={alerts}
            activity={activity}
            onOpen={openDiagnosis}
            onNavigate={(mId, sub) => navigateToMachine(mId, sub)}
            loading={stored.loading}
            error={stored.error}
          />
        </aside>
        <div className="ph-main">
          <PlantMap
            plant={plant}
            lookup={lookup}
            selected={selected}
            onSelect={setSelected}
            liveHistory={liveHistory}
            onChangeView={chooseView}
            onOpen={(id) => navigateToMachine(id, "overview")}
          />
          <div className="ph-strip">
            <HealthTrendCard track={trackPlant} />
          </div>
          {hasLive && <OpsCenter />}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- plant map */

function PlantMap({
  plant,
  lookup,
  selected,
  onSelect,
  liveHistory,
  onChangeView,
  onOpen,
}: {
  plant: HierarchyNode;
  lookup: MachineLookup;
  selected: string | null;
  onSelect: (machineId: string | null) => void;
  /** Recent health per live machine id. */
  liveHistory: Record<string, number[]>;
  onChangeView: (view: MapView) => void;
  onOpen: (machineId: string) => void;
}) {
  const areas = (plant.children ?? []).filter(isFolder);
  const loose = (plant.children ?? []).filter((c) => c.type === "machine");
  const node = selected ? subtreeMachines(plant).find((m) => m.machineId === selected) : undefined;

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => homeActive.current && e.key === "Escape" && onSelect(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, onSelect]);

  const unit = (m: HierarchyNode) => {
    if (!m.machineId) return null;
    const c = machineCondition(m, lookup);
    const tone = machineTone(c.status);
    const live = c.isLive ? liveHistory[m.machineId] : undefined;
    return (
      <button
        key={m.id}
        type="button"
        className="ph-unit"
        data-tone={tone}
        aria-pressed={selected === m.machineId}
        aria-label={`${m.name}, ${toCondition(c.status)}, health ${c.health} of 100`}
        onClick={() => onSelect(selected === m.machineId ? null : m.machineId!)}
      >
        <span className="ph-unit-top">
          <span className="ph-unit-icon">
            <TypeIcon type="machine" size={13} />
          </span>
          <span className="ph-unit-name">{m.name}</span>
          <span className="ph-unit-dot" aria-hidden="true" />
        </span>
        <span className="ph-unit-meta ast-num">
          <span>{toCondition(c.status)}</span>
          <span>
            {c.health}
            <span className="ast-unit">/100</span>
          </span>
        </span>
        {live ? (
          <Sparkline values={live} unit="/100" height={26} tone={healthTone(c.health)} digits={0} ariaLabel={`${m.name} health trend`} />
        ) : (
          <Ticks value={c.health} tone={healthTone(c.health)} ticks={24} />
        )}
      </button>
    );
  };

  return (
    <section className="ast-card ph-card ph-map" aria-label="Plant map">
      <div className="ast-card-head ph-card-head">
        <h2 className="ast-card-title">Plant map</h2>
        <PillNav items={VIEW_ITEMS} activeId="layout" onChange={(id) => onChangeView(id as MapView)} className="ph-head-nav" />
      </div>
      <div className="ph-map-body">
        <div className="ph-canvas mx-canvas" onClick={(e) => e.target === e.currentTarget && onSelect(null)}>
          {loose.length > 0 && <div className="ph-zone-units">{loose.map(unit)}</div>}
          {areas.map((area) => {
            const tone = rollupTone(area, lookup);
            const groups = (area.children ?? []).filter(isFolder);
            const direct = (area.children ?? []).filter((c) => c.type === "machine");
            const count = subtreeMachines(area).length;
            return (
              <div key={area.id} className="ph-zone" data-tone={tone}>
                <div className="ph-zone-head">
                  <span className="ph-zone-icon">
                    <TypeIcon type="area" size={12} />
                  </span>
                  <span className="ph-zone-name">{area.name}</span>
                  <span className="ph-zone-meta ast-num">
                    {count} {count === 1 ? "machine" : "machines"}
                  </span>
                  {tone !== "good" && <span className="ph-zone-mark" aria-label="Advisory" />}
                </div>
                {direct.length > 0 && <div className="ph-zone-units">{direct.map(unit)}</div>}
                {groups.map((g) => (
                  <div key={g.id} className="ph-group">
                    <span className="ph-group-name">{g.name}</span>
                    <div className="ph-zone-units">{subtreeMachines(g).map(unit)}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {node?.machineId && <Inspector node={node} lookup={lookup} onClose={() => onSelect(null)} onOpen={onOpen} />}
      </div>
    </section>
  );
}

function Inspector({
  node,
  lookup,
  onClose,
  onOpen,
}: {
  node: HierarchyNode;
  lookup: MachineLookup;
  onClose: () => void;
  onOpen: (machineId: string) => void;
}) {
  const c = machineCondition(node, lookup);
  const m = c.machine;
  const rows: Array<[string, React.ReactNode]> = [
    ["Health", <>{c.health}<span className="ast-unit">/100</span></>],
    ["Area", m?.area ?? "—"],
    ["Process cell", m?.processCell ?? "—"],
    ["Type", m?.type ?? "—"],
    ["Criticality", m?.criticality ?? "—"],
    ["Signals", m?.signalsCount ?? "—"],
    ["Power", m?.powerRating ?? "—"],
    ["Speed", m?.operatingSpeed ?? "—"],
    ["Work order", m?.activeWorkOrder ?? "None open"],
    ["Telemetry", c.isLive ? "Live" : "Asset record"],
  ];
  return (
    <aside className="ph-inspector" aria-label={`${node.name} details`}>
      <div className="ph-insp-head">
        <div>
          <span className="ph-insp-name">{node.name}</span>
          <span className="ph-sub ast-num">{node.machineId}</span>
        </div>
        <button type="button" className="ast-icon-btn" onClick={onClose} aria-label="Close details">
          <IconClose />
        </button>
      </div>
      <StatusTag tone={machineTone(c.status)} label={toCondition(c.status)} />
      <dl className="ph-insp-rows">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className="ast-num">{v}</dd>
          </div>
        ))}
      </dl>
      <PillButton onClick={() => onOpen(node.machineId!)}>
        Open machine <IconChevron size={10} />
      </PillButton>
    </aside>
  );
}
