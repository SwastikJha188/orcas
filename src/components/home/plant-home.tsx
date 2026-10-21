"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import { revalidateApi, useApi } from "@/lib/api-cache";
import { conditionUrl, type ConditionStrip as ConditionData } from "@/components/problems/cases-api";
import { useHealthModels, type HealthBands } from "@/lib/reference-data";
import { combinedTrack } from "@shared/lib/health-recorder";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { isLiveMachine, useKilnFleet, usePlantEngine } from "@/providers/kiln-simulation-context";
import type { KilnSimulation } from "@/components/assets/kiln-seals-simulation";
import { formatClock } from "@shared/lib/kiln-sim/engine";
import type { HierarchyNode } from "@/components/assets/assets-data";
import { IconChevron, IconClose, StatusTag, Ticks, healthTone, machineTone } from "@/components/assets/assets-shell-ui";
import { Sparkline } from "@/components/ui/sparkline";
import { TypeIcon } from "@/components/assets/hierarchy/hierarchy-icons";
import { toCondition } from "@/components/ui/status";
import {
  type MachineLookup,
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
import { OperatorConsole } from "./operator/operator-console";
import { usePlantStatus } from "./operator/machine-nav";
import "@/components/assets/assets-shell.css";
import "./plant-home.css";
import { homeActive } from "./home-active";
import { liveFrameAlerts } from "./live-alerts";
import { formatLocalTime } from "@/lib/time";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";

/** A sub-assembly's name, for "where" in an alarm. */

/* The pyro line's site overview replaces the generic plant twin for that plant only (three.js stays out of the first chunk). */
const PyroSiteOverview = dynamic(() => import("./twin/pyro-site-overview").then((m) => m.PyroSiteOverview), {
  ssr: false,
  loading: () => <div className="ph-twin-loading" role="status">Loading the 3D model of the plant…</div>,
});

/* ==========================================================================
   Home — the operator overview (Operator view, 3D twin, Layout). Its Assets
   toggle opens the Assets workspace (asset directory and machine pages).
   3D twin view: the twin fills the page, with no header, and the plant health
   gauge, alerts feed and health-over-time float over it as HUD panels. Layout view: gauge
   and alerts in a sidebar beside the 2D plan and the trend. One plant at a time.
   ========================================================================== */

const CLEARED_HOLD_MS = 60_000;
/** Live activity entries shown under the alerts, newest first across the kiln fleet. */
const ACTIVITY_LIMIT = 24;
export const MAP_VIEW_KEY = "ultron.home.viewMode";
export type MapView = "operator" | "twin" | "layout" | "assets";

const VIEW_ITEMS = [
  { id: "operator", label: "Operator view" },
  { id: "twin", label: "3D twin" },
  { id: "assets", label: "Assets" },
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



export function PlantHome() {
  const { navigateToMachine, setActiveTab, selectedPlantId, selectedMachine, setSelectedMachineId } = useIndustrialData();
  const { roots, lookup, isLoading: hierarchyLoading, loadError } = useHierarchyData();
  const fleet = useKilnFleet();
  const isPyroLine = usePlantEngine() === "pyro";

  // The plant comes from the top bar's plant switcher.
  const plantId = selectedPlantId;
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => setSelected(null), [plantId]);

  const [view, setView] = useState<MapView>("operator");
  useEffect(() => {
    const v = readStored(MAP_VIEW_KEY);
    if (v === "operator" || v === "twin") setView(v);
  }, []);
  // Assets is its own workspace: the toggle opens it on the machine open here (or the directory).
  const chooseView = useCallback(
    (v: MapView) => {
      if (v === "assets") {
        setActiveTab("assets");
        return;
      }
      setView(v);
      store(MAP_VIEW_KEY, v);
    },
    [setActiveTab],
  );
  const toLayout = useCallback(() => setView("operator"), []);

  // When any part of the app opens a machine (e.g. from Assets directory, Alerts, Copilot),
  // switch Home to Operator view so the unified OperatorConsole opens the machine immediately.
  useEffect(() => {
    const onOpenOperatorMachine = () => {
      setView("operator");
      store(MAP_VIEW_KEY, "operator");
    };
    const onSetHomeView = (e: Event) => {
      const custom = e as CustomEvent<MapView>;
      if (custom.detail === "operator" || custom.detail === "twin") {
        setView(custom.detail);
        store(MAP_VIEW_KEY, custom.detail);
      }
    };
    window.addEventListener("ultron:open-operator-machine", onOpenOperatorMachine);
    window.addEventListener("ultron:open-full-line", onOpenOperatorMachine);
    window.addEventListener("ultron:set-home-view", onSetHomeView);
    return () => {
      window.removeEventListener("ultron:open-operator-machine", onOpenOperatorMachine);
      window.removeEventListener("ultron:open-full-line", onOpenOperatorMachine);
      window.removeEventListener("ultron:set-home-view", onSetHomeView);
    };
  }, []);

  const stageRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hudPanels = useMemo<Array<[Side, React.RefObject<HTMLElement | null>]>>(
    () => [["right", sideRef], ["bottom", bottomRef]],
    [],
  );
  const plant = roots.find((p) => p.id === plantId) ?? roots[0];
  const fallbackPlant = useMemo<HierarchyNode>(
    () =>
      plant ?? {
        id: plantId ?? "",
        name: "Plant",
        type: "plant",
        children: [],
      },
    [plant, plantId],
  );
  // Measure only once the twin stage is actually mounted: on first load the page
  // renders a loading state (no stage), and a measurement taken then never re-ran,
  // so the camera framed the plant under the HUD panels.
  const covered = useCoveredInset(stageRef, hudPanels, view === "twin" && Boolean(plant) && !selectedMachine);
  const machines = useMemo(() => (plant ? subtreeMachines(plant) : []), [plant]);
  const dist = distribution(machines, lookup);
  /* Plant health, shared with the Full line status bars (machine-nav): pyro line
     round(0.6 × worst + 0.4 × mean) of the live scores, so one bad machine shows;
     other plants the plain mean. */
  const score = usePlantStatus(plant, lookup).score;
  /* The plant's live kilns, each with its own running engine. All engines
     share one clock, so the first one's frame dates the plant. */
  const live = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ node: HierarchyNode; sim: KilnSimulation }> = [];
    for (const m of machines) {
      if (!m.machineId || !isLiveMachine(m.machineId) || !fleet[m.machineId]) continue;
      if (seen.has(m.machineId)) continue;
      seen.add(m.machineId);
      out.push({ node: m, sim: fleet[m.machineId] as KilnSimulation });
    }
    return out;
  }, [machines, fleet]);
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
      // Machines without a score are left out of the average (never counted as 0).
      const scored = machines
        .filter((m) => !liveNodes.has(m))
        .map((m) => machineCondition(m, lookup).health)
        .filter((h): h is number => h !== null);
      const others = scored.reduce((n, h) => n + h, 0);
      const ids = live.map((l) => l.node.machineId!);
      return combinedTrack(ids, from, (v) => (others + ids.reduce((n, id) => n + v[id], 0)) / Math.max(1, scored.length + ids.length));
    },
    [live, machines, lookup],
  );

  /* Alerts: the plant's open alarms as the server records them (/api/cases/condition: limits
     crossed and matched problem patterns, plus alarms recorded by hand), the same list and the
     same cache entry as the Problems page and the rail's alarm count, so every place shows the
     same number. A live machine's alarm keeps the engine's everyday-words row (text, parts and
     tags for the drawing); the engine list only stands in until the server list has arrived. */
  const { timeZone: siteTimeZone } = useSiteTimeZone();
  const alarmUrl = selectedPlantId ? conditionUrl({ plantId: selectedPlantId }) : null;
  const serverAlarms = useApi<ConditionData>(alarmUrl, { refreshMs: 30_000 });
  const engineAlerts = useMemo(() => {
    const byId = new Map<string, HomeAlert>();
    for (const { node, sim } of live) for (const a of liveFrameAlerts(node, sim.frame)) if (!byId.has(a.id)) byId.set(a.id, a);
    return byId;
  }, [live]);
  // When the live engine raises or clears an alarm, read the server list at once instead of waiting.
  const engineAlarmKey = useMemo(() => [...engineAlerts.keys()].sort().join("|"), [engineAlerts]);
  useEffect(() => {
    if (alarmUrl) void revalidateApi(alarmUrl);
  }, [engineAlarmKey, alarmUrl]);
  const activeAlerts = useMemo<HomeAlert[]>(() => {
    const rows = serverAlarms.data?.alarms;
    if (!rows) return [...engineAlerts.values()];
    const nameById = new Map(machines.filter((m) => m.machineId).map((m) => [m.machineId!, m.name.replace(/\s*\([A-Z0-9-]+\)\s*$/, "")]));
    const out: HomeAlert[] = [];
    const used = new Set<string>();
    for (const a of rows) {
      const level = a.severity === "Critical" ? ("danger" as const) : ("alert" as const);
      // Same id the engine gives the alarm, so a row keeps its place when the source behind it changes.
      const engineId = a.ruleCode ? `${a.machineId}:${a.ruleCode}` : a.tag ? `${a.machineId}:sig:${a.tag}` : null;
      const live = engineId ? engineAlerts.get(engineId) : undefined;
      let id = engineId ?? `${a.machineId}:${a.key}`;
      if (used.has(id)) id = `${id}#${a.key}`;
      used.add(id);
      if (live) {
        out.push({ ...live, id, level });
        continue;
      }
      const raised = formatLocalTime(a.since, { timeZone: siteTimeZone });
      out.push({
        id,
        level,
        machine: nameById.get(a.machineId) ?? a.machineName,
        machineId: a.machineId,
        finding: a.title,
        reading: a.where ?? "",
        recommendation: "",
        plainTitle: a.title,
        where: a.where ?? undefined,
        tags: a.tag ? [a.tag] : undefined,
        age: raised,
        raised,
        t: null,
        origin: a.source,
      });
    }
    return out;
  }, [serverAlarms.data, engineAlerts, machines, siteTimeZone]);

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
          : e.severity === "Alert" ? "warn"
          : "idle";
        const tag =
          e.kind === "action" ? (e.action ? (e.action.auto ? "CREW" : "OPERATOR") : "PLANT")
          : e.kind === "rule" || e.kind === "limit" ? (restored ? "CLEARED" : e.severity === "Critical" ? "CRITICAL" : "ALERT")
          : e.kind === "quality" ? "SENSOR"
          : "MACHINE";
        return {
          id: `${base}:${n}`,
          clock: e.clock,
          machine: shortName(node.name),
          machineId: node.machineId!,
          tag,
          tone,
          title: e.kind === "limit" ? `Out of range · ${e.title}` : e.title,
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

  const alerts = useMemo(() => {
    const seen = new Set<string>();
    const combined: HomeAlert[] = [];
    for (const a of [...activeAlerts, ...cleared]) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      combined.push(a);
    }
    return combined.sort((a, b) => (b.t ?? -Infinity) - (a.t ?? -Infinity));
  }, [activeAlerts, cleared]);
  const alertsByMachine = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of activeAlerts) map.set(a.machineId, (map.get(a.machineId) ?? 0) + 1);
    return map;
  }, [activeAlerts]);

  const liveIds = useMemo(
    () =>
      new Set(
        machines.filter((m) => m.machineId && machineCondition(m, lookup).isLive).map((m) => m.machineId!),
      ),
    [machines, lookup],
  );

  const openDiagnosis = (machineId: string) => navigateToMachine(machineId, "diagnosis");

  return (
    <div className="ph-root ph-operator-canvas ast-root" aria-label="Plant overview">
      <OperatorConsole
        plant={fallbackPlant}
        lookup={lookup}
        score={score}
        dist={dist}
        alerts={alerts}
        activity={activity}
        alertsLoading={serverAlarms.isLoading && !serverAlarms.data}
        alertsError={serverAlarms.error ?? null}
        trackHealth={trackPlant}
        view={view}
        onChangeView={chooseView}
        onNavigateToMachine={(mId, sub) => navigateToMachine(mId, sub ?? "overview")}
        renderCustomStage={({ view: stageView, isFullLine, activeCatalogMachine: activeMachine }) => {
          if (!plant && hierarchyLoading) {
            return (
              <div className="opc-module-stage">
                <div className="ast-card ast-empty ph-empty-workspace" role="status" aria-live="polite">
                  <strong>Loading plant…</strong>
                </div>
              </div>
            );
          }

          if (!plant && loadError) {
            return (
              <div className="opc-module-stage">
                <div className="ast-card ast-empty ph-empty-workspace" role="alert">
                  <strong>Could not load the plant. Reload the page to try again.</strong>
                </div>
              </div>
            );
          }

          if (!plant) {
            return (
              <div className="opc-module-stage">
                <div className="ast-card ast-empty ph-empty-workspace">
                  <strong>No plant has been set up yet.</strong>
                  <PillButton onClick={() => setActiveTab("configure")}>Set up a plant</PillButton>
                </div>
              </div>
            );
          }

          if (stageView === "twin") {
            if (!isFullLine) {
              return (
                <div className="opc-module-stage" style={{ padding: 0, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
                  <MachineTwinHome
                    machine={activeMachine}
                    alerts={alerts.filter((a) => a.machineId === activeMachine.id)}
                    activity={activity.filter((a) => a.machineId === activeMachine.id)}
                    alertsLoading={serverAlarms.isLoading && !serverAlarms.data}
                    alertsError={serverAlarms.error ?? null}
                    onOpenDiagnosis={openDiagnosis}
                    onBack={() => setSelectedMachineId(null)}
                    onOpen={(sub) => navigateToMachine(activeMachine.id, sub)}
                    viewMode="twin"
                    onChangeViewMode={(m) => chooseView(m)}
                    hideTopBar
                  />
                </div>
              );
            }

            return (
              <div className="ph-immersive" style={{ position: "relative", flex: 1, minHeight: 0, width: "100%", height: "100%", overflow: "hidden" }}>
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
                  <aside ref={sideRef} className="ph-hud-side" aria-label="Plant condition">
                    <PlantHealthGauge score={score} dist={dist} />
                    <AlertsFeed
                      alerts={alerts}
                      activity={activity}
                      onOpen={openDiagnosis}
                      onNavigate={(mId, sub) => navigateToMachine(mId, sub)}
                      loading={serverAlarms.isLoading && !serverAlarms.data}
                      error={serverAlarms.error ?? null}
                    />
                  </aside>
                  <div ref={bottomRef} className="ph-hud-bottom ph-strip">
                    <HealthTrendCard track={trackPlant} />
                  </div>
                </div>
              </div>
            );
          }

          if (stageView === "layout") {
            return (
              <div className="opc-module-stage" aria-label="Plant layout">
                <div className="ph-body">
                  <aside className="ph-side" aria-label="Plant condition">
                    <PlantHealthGauge score={score} dist={dist} />
                    <AlertsFeed
                      alerts={alerts}
                      activity={activity}
                      onOpen={openDiagnosis}
                      onNavigate={(mId, sub) => navigateToMachine(mId, sub)}
                      loading={serverAlarms.isLoading && !serverAlarms.data}
                      error={serverAlarms.error ?? null}
                    />
                  </aside>
                  <div className="ph-main">
                    <PlantMap
                      plant={plant}
                      lookup={lookup}
                      selected={selected}
                      onSelect={setSelected}
                      liveHistory={liveHistory}
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

          return null;
        }}
      />
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
  onOpen,
}: {
  plant: HierarchyNode;
  lookup: MachineLookup;
  selected: string | null;
  onSelect: (machineId: string | null) => void;
  /** Recent health per live machine id. */
  liveHistory: Record<string, number[]>;
  onOpen: (machineId: string) => void;
}) {
  const areas = (plant.children ?? []).filter(isFolder);
  const loose = (plant.children ?? []).filter((c) => c.type === "machine");
  const node = selected ? subtreeMachines(plant).find((m) => m.machineId === selected) : undefined;
  // Each machine's health tone uses the bands of its own health model (from the database).
  const { machines } = useIndustrialData();
  const models = useHealthModels();
  const bandsOf = (machineId: string): HealthBands | null => {
    const model = models?.find((x) => x.id === machines.find((m) => m.id === machineId)?.healthModelId);
    const advisory = model?.bands.find((b) => b.severity === "Alert")?.below;
    const critical = model?.bands.find((b) => b.severity === "Critical")?.below;
    return advisory != null && critical != null ? { advisory, critical } : null;
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => homeActive.current && e.key === "Escape" && onSelect(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, onSelect]);

  const unit = (m: HierarchyNode) => {
    if (!m.machineId) return null;
    const bands = bandsOf(m.machineId);
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
        aria-label={`${m.name}, ${toCondition(c.status)}, ${c.health === null ? "no health score yet" : `health ${c.health} of 100`}`}
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
            {c.health ?? "—"}
            {c.health !== null && <span className="ast-unit">/100</span>}
          </span>
        </span>
        {live ? (
          <Sparkline values={live} unit="/100" height={26} tone={c.health === null ? undefined : healthTone(c.health, bands)} digits={0} ariaLabel={`${m.name} health trend`} />
        ) : c.health !== null ? (
          <Ticks value={c.health} tone={healthTone(c.health, bands)} ticks={24} />
        ) : null}
      </button>
    );
  };

  return (
    <section className="ast-card ph-card ph-map" aria-label="Plant map">
      <div className="ast-card-head ph-card-head">
        <h2 className="ast-card-title">Plant map</h2>
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
                  {tone !== "good" && <span className="ph-zone-mark" aria-label="Needs attention" />}
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
    ["Health", c.health === null ? "—" : <>{c.health}<span className="ast-unit">/100</span></>],
    ["Area", m?.area ?? "—"],
    ["Production unit", m?.processCell || "—"],
    ["Type", m?.type ?? "—"],
    ["Importance", m?.criticality ?? "—"],
    ["Sensors", m?.signalsCount ?? "—"],
    ["Power", m?.powerRating ?? "—"],
    ["Speed", m?.operatingSpeed ?? "—"],
    ["Work order", m?.activeWorkOrder ?? "None open"],
    ["Readings", c.isLive ? "Live" : "Saved record only"],
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
            <dd className={k === "Health" || k === "Sensors" ? "ast-num" : undefined}>{v}</dd>
          </div>
        ))}
      </dl>
      <PillButton onClick={() => onOpen(node.machineId!)}>
        Open machine <IconChevron size={10} />
      </PillButton>
    </aside>
  );
}
