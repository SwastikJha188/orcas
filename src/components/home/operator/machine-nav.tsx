"use client";

/* ==========================================================================
   Machine navigation shared by the Operator view and the Assets workspace, so
   both read as one place:

     Row 1  .opc-topbar       the plant's machines (Full line first) · view toggle
                              (Operator view | 3D twin | Assets)
     Row 2  .opc-context-bar  machine (or plant) status · quick-look popups · page toggle
                              (Overview | Diagnosis | Prognosis | Analysis | Sensors)

   Overview is the Operator view; the other pages are Assets (`navigateToMachine`).
   On Full line the status is the plant's and the pages open on the machine that
   needs attention most.
   ========================================================================== */

import React, { useMemo } from "react";
import { PillNav } from "@/components/ui";
import type { Tone } from "@/components/ui/status";
import type { HierarchyNode } from "@/components/assets/assets-data";
import {
  type MachineLookup,
  averageHealth,
  distribution,
  machineCondition,
  nodeTone,
  rollupTone,
  subtreeMachines,
  toneRank,
} from "@/components/assets/hierarchy/hierarchy-model";
import { useKilnFleet, useLivePlantStarting, usePlantEngineOf } from "@/providers/kiln-simulation-context";
import { Skel } from "@/components/ui";
import { useHierarchyData } from "@/components/assets/hierarchy/use-hierarchy-data";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { isConditionRule } from "@shared/lib/plant-defs";
import type { MapView } from "../plant-home";

export type PyroMachineSectionId = "phc" | "kln" | "clr" | "fed" | "brn" | "cct";
/** Stages drawn together on one combined sheet (top bar, after the machines). */
export type PyroComboId = "pk" | "pkb" | "cc";
export type PyroSectionId = "line" | PyroMachineSectionId | PyroComboId;

/**
 * Pyro-line drawing sections: each section's overview sheet draws one machine
 * kind (`AssetMachine.diagramType`). The machine a section shows is the plant
 * machine with that diagram type; the full line opens on the plant's primary
 * machine.
 */
export const PYRO_SECTION_TABS: Array<{
  id: PyroSectionId;
  label: string;
  code: string;
  sheetId: string;
  diagramType: string | null;
}> = [
  { id: "line", label: "Full line", code: "PYR-0", sheetId: "PYR-0", diagramType: null },
  { id: "fed", label: "Feed", code: "FED-01", sheetId: "F-0", diagramType: "feed-system" },
  { id: "phc", label: "Preheater", code: "PHC-01", sheetId: "P-0", diagramType: "preheater" },
  { id: "kln", label: "Rotary kiln", code: "KLN-01", sheetId: "K-0", diagramType: "pyro-kiln" },
  { id: "brn", label: "Burner", code: "BRN-01", sheetId: "B-0", diagramType: "kiln-burner" },
  { id: "clr", label: "Grate cooler", code: "CLR-01", sheetId: "C-0", diagramType: "grate-cooler" },
  { id: "cct", label: "Clinker", code: "CCT-01", sheetId: "H-0", diagramType: "clinker-transport" },
];

/**
 * Combined sheets: several stages on one drawing with all their readings.
 * `sections` are the machines it draws; `primary` is the machine its pages
 * (Diagnosis, Prognosis …) open on.
 */
export const PYRO_COMBO_TABS: Array<{
  id: PyroComboId;
  label: string;
  sheetId: string;
  sections: PyroMachineSectionId[];
  primary: PyroMachineSectionId;
}> = [
  { id: "pk", label: "Preheater + kiln", sheetId: "PYR-PK", sections: ["phc", "kln"], primary: "kln" },
  { id: "pkb", label: "Preheater + kiln + burner", sheetId: "PYR-PKB", sections: ["phc", "kln", "brn"], primary: "kln" },
  { id: "cc", label: "Grate cooler + clinker", sheetId: "PYR-CC", sections: ["clr", "cct"], primary: "clr" },
];

export const isPyroCombo = (id: string): id is PyroComboId => PYRO_COMBO_TABS.some((t) => t.id === id);

/** A plant's combined-sheet pills: those whose machines are all on the plant. */
export function comboTabs(units: Array<{ id: string; diagramType?: string | null }>): MachineTab[] {
  const machineOf = (sec: PyroMachineSectionId) => {
    const dt = PYRO_SECTION_TABS.find((t) => t.id === sec)?.diagramType;
    return dt ? units.find((u) => u.diagramType === dt)?.id ?? null : null;
  };
  return PYRO_COMBO_TABS.filter((c) => c.sections.every((sec) => machineOf(sec))).map((c) => ({ key: c.id, label: c.label, machineId: machineOf(c.primary) }));
}

export const VPC_DIAGRAM = "vpc-casting";

export const isPyroLineDiagram = (dt: string | null | undefined) =>
  Boolean(dt && PYRO_SECTION_TABS.some((t) => t.diagramType === dt));

export type PlantKind = "pyro" | "vpc" | "plain";

/** How a plant's machines are grouped in the top bar: by engine, else by drawing kind. */
export function plantKindOf(engine: string | null | undefined, units: Array<{ diagramType?: string | null }>): PlantKind {
  if (engine === "pyro" || units.some((m) => isPyroLineDiagram(m.diagramType))) return "pyro";
  if (engine === "vpc" || units.some((m) => m.diagramType === VPC_DIAGRAM)) return "vpc";
  return "plain";
}

/** One machine pill of the top bar; key "line" (machineId null) is the plant itself. */
export interface MachineTab {
  key: string;
  label: string;
  machineId: string | null;
}

/** A plant that shows one machine (a one-machine account, or a one-machine plant) has no full line: only that machine. */
export const isSingleMachine = (units: ReadonlyArray<unknown>) => units.length === 1;

/** The plant's machine pills: Full line, then the pyro sections, the VPC units or the machines (no Full line for one machine). */
export function machineTabs(kind: PlantKind, units: Array<{ id: string; name: string; diagramType?: string | null }>): MachineTab[] {
  const line: MachineTab[] = isSingleMachine(units) ? [] : [{ key: "line", label: "Full line", machineId: null }];
  if (kind === "pyro") {
    return [
      ...line,
      ...PYRO_SECTION_TABS.flatMap((t) => {
        const m = t.diagramType ? units.find((u) => u.diagramType === t.diagramType) : undefined;
        return m ? [{ key: t.id, label: t.label, machineId: m.id }] : [];
      }),
    ];
  }
  const shown = kind === "vpc" ? units.filter((m) => m.diagramType === VPC_DIAGRAM) : units;
  return [...line, ...shown.map((m) => ({ key: m.id, label: m.name, machineId: m.id }))];
}

/**
 * The active plant's machine pills, as the Operator view and Assets show them, for
 * workspaces that share Row 1 (Maintenance, Devices) so every page names the
 * machines the same way and the bar stays on one line.
 */
export function usePlantMachineTabs(): MachineTab[] {
  const { machines, selectedPlantId } = useIndustrialData();
  const engine = usePlantEngineOf(selectedPlantId);
  return useMemo(() => {
    const units = machines.filter((m) => m.plantId === selectedPlantId);
    return machineTabs(plantKindOf(engine, units), units);
  }, [machines, selectedPlantId, engine]);
}

const VIEW_ITEMS = [
  { id: "operator", label: "Operator view" },
  { id: "twin", label: "3D twin" },
  { id: "assets", label: "Assets" },
];

/** One pill group of Row 1. */
function TopbarPills({ tabs, activeKey, onSelect, label }: { tabs: MachineTab[]; activeKey: string | null; onSelect: (tab: MachineTab) => void; label: string }) {
  return (
    <div className="opc-pill-group" role="tablist" aria-label={label}>
      {tabs.map((t) => {
        const isActive = t.key === activeKey;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className="opc-pill-btn"
            data-active={isActive || undefined}
            onClick={() => onSelect(t)}
          >
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Row 1: the plant's machines, then (after a rule) the combined sheets (left), and the view toggle (right). */
export function MachineTopbar({
  tabs,
  combos = [],
  activeKey,
  onSelect,
  view,
  onChangeView,
}: {
  tabs: MachineTab[];
  /** Combined sheets of several machines (Operator view only). */
  combos?: MachineTab[];
  activeKey: string | null;
  onSelect: (tab: MachineTab) => void;
  view: MapView;
  onChangeView?: (view: MapView) => void;
}) {
  return (
    <header className="opc-topbar" aria-label="Machines and view">
      <div className="opc-stage-tabs">
        {/* No machines yet: the plant is still loading. */}
        {tabs.length === 0 ? (
          <div className="opc-pill-group" aria-hidden="true">
            <span className="opc-pill-btn">
              <Skel width="8ch" />
            </span>
          </div>
        ) : (
          <TopbarPills tabs={tabs} activeKey={activeKey} onSelect={onSelect} label="Select machine" />
        )}
        {tabs.length > 0 && combos.length > 0 && (
          <>
            <span className="opc-bar-sep opc-topbar-sep" aria-hidden="true" />
            <TopbarPills tabs={combos} activeKey={activeKey} onSelect={onSelect} label="Machines drawn together" />
          </>
        )}
      </div>
      <div className="opc-topbar-right">
        {onChangeView && (
          <PillNav items={VIEW_ITEMS} activeId={view} onChange={(id) => onChangeView(id as MapView)} className="ph-head-nav" />
        )}
      </div>
    </header>
  );
}

/**
 * The plant at Full line. Health is the Home gauge's number: pyro line
 * round(0.6 × worst + 0.4 × mean) of the live machine scores, else the mean of
 * the machines' health. `focusMachineId` is the machine needing attention most
 * (worst condition, then lowest health), as the asset directory's "Diagnose".
 */
export function usePlantStatus(plant: HierarchyNode | null | undefined, lookup: MachineLookup | null | undefined) {
  const fleet = useKilnFleet();
  const isPyro = usePlantEngineOf(plant?.id) === "pyro";
  return useMemo(() => {
    const machines = plant ? subtreeMachines(plant) : [];
    const ids = [...new Set(machines.flatMap((m) => (m.machineId ? [m.machineId] : [])))];
    const frames = ids.flatMap((id) => (fleet[id]?.frame ? [fleet[id]!.frame] : []));
    let score: number | null = null;
    if (isPyro && frames.length) {
      const scores = frames.map((f) => Math.round(f.overall));
      score = Math.round(0.6 * Math.min(...scores) + (0.4 * scores.reduce((n, v) => n + v, 0)) / scores.length);
    }
    if (!lookup) return { machines, score, tone: "idle" as Tone, offNormal: 0, alarms: 0, focusMachineId: null };
    score ??= averageHealth(machines, lookup);
    const d = distribution(machines, lookup);
    const focus = [...machines]
      .filter((m) => m.machineId)
      .sort(
        (a, b) =>
          toneRank(nodeTone(a, lookup)) - toneRank(nodeTone(b, lookup)) ||
          (machineCondition(a, lookup).health ?? Infinity) - (machineCondition(b, lookup).health ?? Infinity),
      )[0];
    return {
      machines,
      score,
      tone: plant ? rollupTone(plant, lookup) : ("idle" as Tone),
      offNormal: d.critical + d.atRisk,
      // Active alarms of the live machines (rule engine), as each machine's Diagnosis count.
      alarms: frames.reduce((n, f) => n + f.rules.filter((r) => r.status === "ACTIVE" && isConditionRule(r)).length, 0),
      focusMachineId: focus?.machineId ?? null,
    };
  }, [plant, lookup, fleet, isPyro]);
}

/** Row 2, left: dot · scope · Health % with a 0–100 meter · off-normal count. */
export function StatusSummary({ tone, label, health, offNormal }: { tone: Tone; label: string; health: number | null; offNormal: string | null }) {
  // Until the plant and its live readings are in, the number is on its way, not missing.
  const { hasLoaded } = useIndustrialData();
  const starting = useLivePlantStarting();
  const { isLoading: treeLoading } = useHierarchyData();
  const loading = health === null && (!hasLoaded || starting || treeLoading);
  return (
    <div className="opc-subbar-summary">
      <span className="ph-unit-dot" data-tone={loading ? "idle" : tone} aria-hidden="true" />
      <span className="opc-tag-bar-id">{label}</span>
      <span className="opc-health" data-tone={loading ? "idle" : tone} title={health !== null ? `Health ${health} out of 100` : undefined}>
        <span className="opc-health-num ast-num">
          {health !== null ? (
            <>
              {health}
              <small>%</small>
            </>
          ) : loading ? (
            <Skel width="2.2ch" label="Loading health" />
          ) : (
            "—"
          )}
        </span>
        <span className="opc-health-side">
          <span className="opc-health-label">Health</span>
          <span className="opc-health-meter" aria-hidden="true">
            <i style={{ width: `${Math.max(0, Math.min(100, health ?? 0))}%` }} />
          </span>
        </span>
      </span>
      {offNormal && <span className="opc-tag-bar-band opc-health-note">{offNormal}</span>}
    </div>
  );
}

/** Row 2 at Full line: the plant's status, then the page toggle. */
export function PlantStatusBar({
  label,
  status,
  active,
  onSelect,
}: {
  label: string;
  status: ReturnType<typeof usePlantStatus>;
  active: MachinePageId | null;
  onSelect: (page: MachinePageId) => void;
}) {
  const off = status.offNormal;
  return (
    <div className="opc-context-bar" role="region" aria-label="Plant status and pages">
      <div className="opc-context-left">
        <StatusSummary
          tone={status.tone}
          label={label}
          health={status.score}
          offNormal={off > 0 ? `${off} ${off === 1 ? "machine needs" : "machines need"} attention` : null}
        />
      </div>
      <div className="opc-context-right">
        <MachinePageToggle alarms={status.alarms} active={active} onSelect={onSelect} disabled={!status.focusMachineId} />
      </div>
    </div>
  );
}

export type MachinePageId = "overview" | "diagnosis" | "prognosis" | "analysis" | "sensors";

const MACHINE_PAGES: Array<{ id: MachinePageId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "diagnosis", label: "Diagnosis" },
  { id: "prognosis", label: "Prognosis" },
  { id: "analysis", label: "Analysis" },
  { id: "sensors", label: "Sensors" },
];

/**
 * Row 2, right: the machine's pages as one toggle. Diagnosis carries the machine's
 * active alarms (`useOverviewDigest().findings.active`, as on both bars' status).
 */
export function MachinePageToggle({
  alarms,
  active,
  onSelect,
  disabled = false,
}: {
  alarms: number;
  /** Null on the asset directory, which is none of these pages. */
  active: MachinePageId | null;
  onSelect: (page: MachinePageId) => void;
  /** Machine pages without a machine to open (empty plant). */
  disabled?: boolean;
}) {
  return (
    <div className="opc-pill-group" role="tablist" aria-label="Pages about this machine">
      {MACHINE_PAGES.map((p) => {
        const isActive = p.id === active;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className="opc-pill-btn"
            data-active={isActive || undefined}
            disabled={disabled && p.id !== "overview"}
            onClick={() => onSelect(p.id)}
          >
            <span title={p.id === "diagnosis" && alarms > 0 ? `${alarms} ${alarms === 1 ? "problem" : "problems"} found` : undefined}>{p.id === "diagnosis" && alarms > 0 ? `${p.label} (${alarms})` : p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
