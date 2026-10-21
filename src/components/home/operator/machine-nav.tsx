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
import { useKilnFleet, usePlantEngineOf } from "@/providers/kiln-simulation-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { isConditionRule } from "@shared/lib/plant-defs";
import type { MapView } from "../plant-home";

export type PyroSectionId = "line" | "phc" | "kln" | "clr" | "fed" | "brn" | "cct";

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

/** The plant's machine pills: Full line, then the pyro sections, the VPC units or the machines. */
export function machineTabs(kind: PlantKind, units: Array<{ id: string; name: string; diagramType?: string | null }>): MachineTab[] {
  const line: MachineTab = { key: "line", label: "Full line", machineId: null };
  if (kind === "pyro") {
    return [
      line,
      ...PYRO_SECTION_TABS.flatMap((t) => {
        const m = t.diagramType ? units.find((u) => u.diagramType === t.diagramType) : undefined;
        return m ? [{ key: t.id, label: t.label, machineId: m.id }] : [];
      }),
    ];
  }
  const shown = kind === "vpc" ? units.filter((m) => m.diagramType === VPC_DIAGRAM) : units;
  return [line, ...shown.map((m) => ({ key: m.id, label: m.name, machineId: m.id }))];
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

/** Row 1: the plant's machines (left) and the view toggle (right). */
export function MachineTopbar({
  tabs,
  activeKey,
  onSelect,
  view,
  onChangeView,
}: {
  tabs: MachineTab[];
  activeKey: string | null;
  onSelect: (tab: MachineTab) => void;
  view: MapView;
  onChangeView?: (view: MapView) => void;
}) {
  return (
    <header className="opc-topbar" aria-label="Machines and view">
      <div className="opc-stage-tabs">
        <div className="opc-pill-group" role="tablist" aria-label="Select machine">
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

/** Row 2, left: dot · scope · Health % · off-normal count. */
export function StatusSummary({ tone, label, health, offNormal }: { tone: Tone; label: string; health: number | null; offNormal: string | null }) {
  return (
    <div className="opc-subbar-summary">
      <span className="ph-unit-dot" data-tone={tone} aria-hidden="true" />
      <span className="opc-tag-bar-id">{label}</span>
      <span className="opc-tag-bar-val ast-num" data-tone={tone}>
        Health {health !== null ? `${health}%` : "—"}
      </span>
      {offNormal && <span className="opc-tag-bar-band">{offNormal}</span>}
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
