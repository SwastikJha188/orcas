"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PillButton } from "@/components/ui";
import { smoothPath } from "@/components/ui/sparkline";
import type { AssetMachine, HierarchyNode } from "@/components/assets/assets-data";
import type { AssetsSubPage } from "@/components/assets/assets-view";
import {
  IconBack,
  IconChevron,
  IconClose,
  healthTone,
  severityTone,
  type Tone,
} from "@/components/assets/assets-shell-ui";
import { conditionTone, toCondition, worstCondition } from "@/components/ui/status";
import {
  type Distribution,
  type MachineLookup,
  subtreeMachines,
} from "@/components/assets/hierarchy/hierarchy-model";
import { useMachineOverview } from "@/components/assets/overview-data";
import { MachineSchematic } from "@/components/assets/machine-schematic";
import { useMachineCatalog, type CatalogSensorView } from "@/components/assets/use-machine-catalog";
import { MachineSensorMappingView, buildDetailedSensors } from "@/components/assets/machine-sensor-mapping-view";
import { MachineAnalysisPage } from "@/components/assets/analysis/analysis-page";
import { MachinePrognosisPage } from "@/components/assets/prognosis/prognosis-page";
import { DiagnosisView } from "@/components/assets/diagnosis-view";
import { TrendsView } from "@/components/assets/trends-view";
import { MachineRackTab } from "@/components/assets/acquisition/acquisition-view";
import { SimulationView } from "@/components/assets/simulation-view";
import { ThermalView } from "@/components/assets/thermal-view";
import { useMachineComponents, type Component as MachineComponent } from "@/components/assets/sensor-mapping-diagram";
import { KilnSubAssemblyArt } from "@/components/assets/kiln-component-diagrams";
import { useContentBox } from "@/components/assets/use-content-box";
import { calloutElbowPath, calloutLeaderPath, layoutSensorCallouts } from "@/components/assets/sensor-callout-layout";
import { usePxPerUnit, useStageLayout } from "@/components/assets/pyro/line-sheets/stage-callouts";
import { MachineHealthShade, useSheetBox } from "@/components/assets/pyro/line-sheets/line-sheet";
import { MX, MachinePad, MachineSvg } from "@/components/assets/machine-kit/machine-kit";
import {
  LINE_SHEET_ART,
  LINE_SHEET_BY_ID,
  LINE_SHEET_FOCUS_KEY,
  lineSheetTags,
  lineSheetsForMachine,
  lineSheetsForTags,
} from "@/components/assets/pyro/line-sheets";
import { KpiStrip, Section, scrollToSection, type KpiItem } from "@/components/assets/analysis/an-ui";
import { useOverviewDigest, type OverviewDigest } from "@/components/assets/overview-digest";
import { OV_SECTIONS, OVERVIEW_SECTION_KEY, OvAreasSection, OvOperatingSection, areaRows } from "@/components/assets/overview-sections";
import type { KilnSimulation } from "@/components/assets/kiln-seals-simulation";
import { formatClock, type LiveSignal, type SimFrame } from "@/lib/kiln-sim/engine";
import { OperatorAlarmLog, OperatorTrendPanel, rateFromSamples, useLatchedAlarms } from "./operator-telemetry";
import { ValuePill, pillContentWidth, type PillContent, type RunState } from "./value-pill";
import { hmiLabel } from "@/lib/hmi-label";
import { LineHealthLayer, LineHealthTint, type LineHealthCell } from "./line-health-layer";
import { AlertPopupLayer, AlertPopupToggle, useAlertPopupControl, type AlertPopupControl } from "./alert-popups";
import { ComponentQuickLook } from "./component-quick-look";
import { componentOptions, type ComponentOption } from "@/components/assets/component-scope";
import { MachineQuickLook } from "./machine-quick-look";
import type { HealthPoint } from "@/lib/health-recorder";
import { isLiveMachine, useKilnFleet, useKilnSimulationFor, usePlantEngineOf, usePrimaryMachineId } from "@/providers/kiln-simulation-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { defsFor } from "@/lib/live-defs";
import { useHealthModels, type HealthBands } from "@/lib/reference-data";
import { isConditionRule } from "@/lib/plant-defs";
import { conditionSummary, HEALTH_TARGET, type HomeActivity, type HomeAlert } from "../home-widgets";
import type { MapView } from "../plant-home";
import { focusLayer, focusSensorOn } from "@/components/assets/sensor-focus";
import "@/components/assets/analysis/analysis-page.css";
import "@/components/assets/overview-page.css";
import { displayName } from "@/lib/display-name";
import {
  MachinePageToggle,
  MachineTopbar,
  PlantStatusBar,
  usePlantStatus,
  PYRO_SECTION_TABS,
  VPC_DIAGRAM,
  isPyroLineDiagram,
  machineTabs,
  type PyroSectionId,
} from "./machine-nav";
import "./operator-console.css";

/* ==========================================================================
   ULTRON Unified 2D DCS / SCADA Operator & Machine Workspace
   Shared between Home › Operator View and Assets › Machine › Overview:
   - Row 1 (`.opc-topbar`): Equipment units on left (`Full line`, `FED-01`…`CCT-01`),
     Main module tabs (`Overview | Diagnosis & Prognosis | Telemetry & Sensors`) +
     View switcher (`Operator view | 3D twin | Layout`) on right.
   - Row 2 (`.opc-subbar`): Detail sheets (`Overview`, `F-1`… + `1/N ‹ ›` stepper)
     or active machine identity on left, context sub-tabs on right:
     · Overview: `Machine | Sub-assembly | Operating point | Status by area`
     · Diagnosis & Prognosis: `Diagnosis (incl. machine health) | Root Cause | Prognosis & RUL | Thermal`
     · Telemetry & Sensors: `All Sensors | Multi-Tag Trends | DAQ Rack | Simulation`
   ========================================================================== */

export type { PyroSectionId };
export type OperatorLayerId =
  | "overview"
  | "machine"
  | "sensors"
  | "diagnosis"
  | "prognosis"
  | "analysis";
export type OperatorSubpageId =
  | OperatorLayerId
  | "telemetry"
  | "subassemblies"
  | "operating"
  | "areas";

type TelemetryLensId = "values" | "trends" | "roc" | "alarms" | "curves" | "combined";
type PointLabelMode = "value" | "tag-value" | "alerts" | "off";

export const OPERATOR_LAYERS: ReadonlyArray<{
  id: OperatorLayerId;
  step: number;
  label: string;
  summary: string;
}> = [
  { id: "overview", step: 1, label: "Overview", summary: "Plant & full-line overview" },
  { id: "machine", step: 2, label: "Machine", summary: "2D machine & sub-assembly mimic" },
  { id: "sensors", step: 3, label: "Sensors", summary: "Live telemetry, rate of change & signal mapping" },
  { id: "diagnosis", step: 4, label: "Diagnosis", summary: "Machine & sub-assembly health, alarms and possible faults per sensor" },
  { id: "prognosis", step: 5, label: "Prognosis", summary: "Remaining useful life (RUL), failure risk & forecast" },
  { id: "analysis", step: 6, label: "Analysis", summary: "Root cause mechanism, model residuals & rule logic" },
];

/** Status bands of a health model from the loaded model list (null while loading or when it has none). */
function bandsOf(models: ReturnType<typeof useHealthModels>, modelId: string | null | undefined): HealthBands | null {
  const m = models?.find((x) => x.id === modelId);
  const advisory = m?.bands.find((b) => b.severity === "Alert")?.below;
  const critical = m?.bands.find((b) => b.severity === "Critical")?.below;
  return advisory != null && critical != null ? { advisory, critical } : null;
}

const SHEET_PROPER_NAMES: Record<string, { short: string; full: string }> = {
  "PYR-0": { short: "Full line", full: "Feed silo to clinker silo" },
  "F-0": { short: "All", full: "Feed system" },
  "F-1": { short: "Silo gates", full: "Silo bottom: six air slides and outlet gates" },
  "F-2": { short: "Aeration blowers", full: "Aeration blowers, header and purge sequence" },
  "F-3": { short: "Silo dust collector", full: "Silo dust collector and fan" },
  "F-4": { short: "Feed bin", full: "Kiln feed bin, load cells and bin dust collector" },
  "F-5": { short: "Bin discharge", full: "Bin discharge: blower, air slides A and B, gates A and B" },
  "F-6": { short: "Flow meters", full: "Feed flow meters A and B and the shared air slide" },
  "F-7": { short: "Bucket elevator", full: "Bucket elevator" },
  "P-0": { short: "All", full: "Preheater" },
  "P-1": { short: "Cyclone stages", full: "Cyclone stages: gas temperature and draft" },
  "P-2": { short: "Cones & riser", full: "Lower cones, riser and meal to kiln" },
  "P-3": { short: "Exit gas & damper", full: "Exit gas analysis and fan damper" },
  "P-4": { short: "Exhaust fan & motor", full: "Exhaust fan (ID fan) and motor" },
  "P-5": { short: "Calciner", full: "Calciner (extra burner), its fuel and the hot-air duct" },
  "G-1": { short: "Baghouse", full: "Main baghouse: bags, hoppers, inlet and stack" },
  "G-2": { short: "Baghouse fan", full: "Baghouse fan and motor" },
  "K-0": { short: "All", full: "Rotary kiln" },
  "K-1": { short: "Inlet & gas", full: "Inlet: seal, chamber and gas analysis" },
  "K-2": { short: "Gear train", full: "Gear train: motor, gearbox, pinion and girth gear" },
  "K-3": { short: "Backup drive", full: "Backup drive and brake" },
  "K-4": { short: "Gearbox oil", full: "Gearbox oil system" },
  "K-5": { short: "Gear grease spray", full: "Grease spray for the kiln ring gear and its drive gear" },
  "K-6": { short: "Rollers & tyres", full: "Roller stations and tyres" },
  "K-7": { short: "Lengthwise hold", full: "Axial thrust system (holds the kiln in place lengthwise)" },
  "K-8": { short: "Shell & heat scanner", full: "Kiln shell and its temperature scanner" },
  "K-9": { short: "Outlet & hood", full: "Outlet and hood" },
  "B-0": { short: "All", full: "Main burner" },
  "B-1": { short: "Burner & air", full: "Burner and air streams" },
  "B-2": { short: "Primary-air fan", full: "Primary-air fan" },
  "B-3": { short: "Coal bin & feeder", full: "Fine-coal bin and kiln coal feeder" },
  "B-4": { short: "Coal blower", full: "Coal conveying blower and line" },
  "C-0": { short: "All", full: "Clinker cooler" },
  "C-1": { short: "Grate compartments", full: "Grate and compartments" },
  "C-2": { short: "Cooling fans 1–3", full: "Cooling fans 1–3 (hot zone)" },
  "C-3": { short: "Cooling fans 4–6", full: "Cooling fans 4–6" },
  "C-4": { short: "Grate hydraulics", full: "Hydraulic unit that moves the grate" },
  "C-5": { short: "Discharge & vent", full: "Discharge, exhaust and vent fan" },
  "H-0": { short: "All", full: "Crusher and clinker transport" },
  "H-1": { short: "Hammer crusher", full: "Hammer crusher and motor" },
  "H-2": { short: "Pan conveyor", full: "Deep-pan conveyor" },
  "H-3": { short: "Clinker silo", full: "Clinker silo and baghouse" },
  "V-0": { short: "All", full: "Vacuum-pressure casting machine" },
  "V-1": { short: "Induction heating", full: "Induction heating" },
  "V-2": { short: "Crucible & stopper", full: "Crucible and stopper" },
  "V-3": { short: "Gas & valves", full: "Gas and valves" },
  "V-4": { short: "Flask seals", full: "Flask seals and closure" },
  "V-5": { short: "Vacuum system", full: "Vacuum system" },
  "V-6": { short: "Cooling water", full: "Cooling water" },
  "V-7": { short: "Vibration base", full: "Vibration base" },
};

/** Everyday word for a breakdown level of the machine ("Sub-assembly" → "Part"), singular or plural. */
function levelWord(level: string, plural = false): string {
  const word = level === "Sub-assembly" ? "Part" : level;
  return plural ? `${word}s` : word;
}

function sheetProperName(sheetId: string, compact = false): string {
  const mapped = SHEET_PROPER_NAMES[sheetId];
  if (mapped) return compact ? mapped.short : mapped.full;
  const meta = LINE_SHEET_BY_ID[sheetId];
  if (!meta) return sheetId;
  if (meta.kind === "overview") return compact ? "All" : meta.equipment;
  return meta.title.split(":")[0];
}


/* ==========================================================================
   Resolved Sensor Telemetry (Value + Trend + Rate of Change + Band Position)
   ========================================================================== */

interface ResolvedTag {
  tag: string;
  available: boolean;
  name: string;
  display: string;
  numValue: number | null;
  unit: string;
  status: "Normal" | "Alert" | "Critical";
  tone: Tone;
  normalBand: string;
  history: number[];
  samples: Array<{ t: number; value: number }>;
  modelSamples: Array<{ t: number; value: number }>;
  isState: boolean;
  minVal: number;
  maxVal: number;
  deltaWindow: number;
  rocPerMin: number;
  rocMinDisplay: string;
  rocPerHour: number;
  rocHourDisplay: string;
  rocDir: "up" | "down" | "flat";
  rocNorm: number;
  rocFast: boolean;
  timeToLimit: string;
  residualDisplay: string;
  bandPct: number;
  ownerId: string | null;
  /** Control-room label of the point ("C3 OUT", "MTR DE BRG"). */
  short: string;
  /** Operator set-point of a controlled flow (kiln feed, kiln coal), formatted; null when the point has none. */
  sp: string | null;
  /** Run state of the drive this point is the run feedback of; null for every other point. */
  run: RunState | null;
}

/** Run feedback point of each unit: its motor current / power, else its speed, else its first point. */
function runStateOf(frame: SimFrame | null, tag: string): RunState | null {
  for (const u of Object.values(frame?.equipment ?? {})) {
    const fb = u.tags.find((t) => t.startsWith("ELE-")) ?? u.tags.find((t) => t.startsWith("SPD-")) ?? u.tags[0];
    if (fb === tag) return u.state;
  }
  return null;
}

function useTagResolver(activeMachineId: string | null, activeFrame: SimFrame | null, catalogSensors: CatalogSensorView[]) {
  const fleet = useKilnFleet();
  const catalogByTag = useMemo(() => new Map(catalogSensors.map((s) => [s.tag, s])), [catalogSensors]);
  return useMemo(() => {
    return (tag: string): ResolvedTag => {
      const ownDef = defsFor(activeMachineId)?.signalByTag[tag];
      // A tag the active machine does not carry (full-line scope) belongs to another live machine of the plant.
      const otherId = ownDef
        ? undefined
        : Object.keys(fleet).find((id) => id !== activeMachineId && (fleet[id]?.frame?.defs.signalByTag[tag] || defsFor(id)?.signalByTag[tag]));
      const def = ownDef ?? (otherId ? fleet[otherId]?.frame?.defs.signalByTag[tag] ?? defsFor(otherId)?.signalByTag[tag] : undefined);
      const catalog = catalogByTag.get(tag);

      let srcFrame: SimFrame | null = activeFrame;
      let ownerId = activeMachineId;
      if (!srcFrame?.signals[tag]) {
        if (otherId && fleet[otherId]?.frame) {
          srcFrame = fleet[otherId]!.frame;
          ownerId = otherId;
        } else if (activeMachineId && fleet[activeMachineId]?.frame?.signals[tag]) {
          srcFrame = fleet[activeMachineId]!.frame;
        }
      }

      const live: LiveSignal | undefined = srcFrame?.signals[tag];
      const available = Boolean(live || catalog);
      const rawUnit = def?.unit ?? catalog?.unit ?? "";
      const unit = rawUnit === "state" ? "" : rawUnit;
      const status = (live?.status ?? catalog?.status ?? "Normal") as "Normal" | "Alert" | "Critical";
      const tone: Tone = !available ? "idle" : status === "Critical" ? "bad" : status === "Alert" ? "warn" : "good";
      const display = live ? live.display : catalog?.value ?? "—";
      const rawHistory = srcFrame?.history[tag] ?? [];
      const baseNum = live?.value ?? catalog?.numericValue ?? 0;
      const history = rawHistory.length >= 2 ? rawHistory : [];
      const times = srcFrame?.times ?? [];
      const seriesStart = Math.max(0, times.length - rawHistory.length);
      const samples = rawHistory.map((value, i) => ({ t: times[seriesStart + i], value }))
        .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.value));
      const rawModel = srcFrame?.modelHistory[tag] ?? [];
      const modelStart = Math.max(0, times.length - rawModel.length);
      const modelSamples = rawModel.map((value, i) => ({ t: times[modelStart + i], value }))
        .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.value));

      const minVal = history.length ? Math.min(...history) : NaN;
      const maxVal = history.length ? Math.max(...history) : NaN;
      const deltaWindow = history.length > 1 ? history.at(-1)! - history[0] : 0;

      const sigma = def && "sigma" in def && def.sigma > 0 ? def.sigma : Math.max(Math.abs(baseNum) * 0.01, 0.1);
      const rate5 = rateFromSamples(samples, 5);
      const rocPerMin = def?.type === "state" ? 0 : rate5?.perMinute ?? 0;
      const rocPerHour =
        def?.type === "state"
          ? 0
          : rate5 ? rate5.perMinute * 60 : 0;

      const dec = def && "decimals" in def ? Math.min(2, Math.max(1, def.decimals)) : 1;
      const absMin = Math.abs(rocPerMin);
      const rocDir: "up" | "down" | "flat" =
        def?.type === "state" || absMin < sigma * 0.08 ? "flat" : rocPerMin > 0 ? "up" : "down";
      const rocNorm = Math.max(-1, Math.min(1, rocPerMin / (sigma * 1.2)));
      const rocFast = Math.abs(rocNorm) > 0.55;

      const signMin = rocPerMin > 0 ? "+" : rocPerMin < 0 ? "−" : "";
      const rocMinDisplay =
        !rate5 ? "—" : def?.type === "state"
          ? "—"
          : `${signMin}${Math.abs(rocPerMin).toFixed(dec)} ${unit ? `${unit}/min` : "/min"}`;

      const signHr = rocPerHour > 0 ? "+" : rocPerHour < 0 ? "−" : "";
      const rocHourDisplay =
        !rate5 ? "—" : def?.type === "state"
          ? "—"
          : `${signHr}${Math.abs(rocPerHour).toFixed(dec)} ${unit ? `${unit}/h` : "/h"}`;

      const spKey = srcFrame?.defs?.setpoints?.[tag];
      const spVal = spKey && srcFrame ? srcFrame.drivers[spKey] * (srcFrame.defs.setpointShare?.[tag] ?? 1) : null;
      const spDec = def && "decimals" in def ? def.decimals : 1;

      const residual = live?.residual ?? 0;
      const residualDisplay =
        !available ? "—" : def?.type === "state"
          ? "—"
          : `${residual >= 0 ? "+" : "−"}${Math.abs(residual).toFixed(dec)} ${unit}`;

      const normRatio = 0.5 + residual / (sigma * 6);
      const bandPct = Math.max(6, Math.min(94, Math.round(normRatio * 100)));

      return {
        tag,
        available,
        name: def?.name ?? catalog?.name ?? tag,
        display,
        numValue: available ? baseNum : null,
        unit,
        status,
        tone,
        normalBand: def?.normalBand || catalog?.nominalBand || "not set",
        history,
        samples,
        modelSamples,
        isState: def?.type === "state",
        minVal,
        maxVal,
        deltaWindow,
        rocPerMin,
        rocMinDisplay,
        rocPerHour,
        rocHourDisplay,
        rocDir,
        rocNorm,
        rocFast,
        timeToLimit: !available ? "—" : live?.timeToLimit ?? (status !== "Normal" ? "At its limit now" : "Stable"),
        residualDisplay,
        bandPct,
        ownerId: ownerId ?? otherId ?? null,
        short: hmiLabel(def?.name ?? catalog?.name ?? ""),
        sp: live && spVal !== null && Number.isFinite(spVal) ? spVal.toFixed(spDec) : null,
        run: runStateOf(srcFrame, tag),
      };
    };
  }, [activeMachineId, activeFrame, fleet, catalogByTag]);
}

/* ==========================================================================
   Main Unified Operator & Machine Overview Component
   ========================================================================== */

export interface OperatorCustomStageContext {
  view: MapView;
  activeMachineId: string;
  activeCatalogMachine: AssetMachine;
  isFullLine: boolean;
  onSelectUnit: (machineId: string | null) => void;
}

export function OperatorConsole({
  plant,
  lookup,
  focusMachine,
  sensorData,
  score,
  dist,
  alerts = [],
  trackHealth,
  view = "operator",
  onChangeView,
  onBackToPlant,
  onNavigateToMachine,
  renderCustomStage,
}: {
  plant?: HierarchyNode;
  lookup?: MachineLookup;
  focusMachine?: AssetMachine;
  sensorData?: KilnSimulation["sensorData"];
  score?: number | null;
  dist?: Distribution;
  alerts?: HomeAlert[];
  activity?: HomeActivity[];
  alertsLoading?: boolean;
  alertsError?: string | null;
  trackHealth?: (from: number) => HealthPoint[];
  view?: MapView;
  onChangeView?: (v: MapView) => void;
  onBackToPlant?: () => void;
  onNavigateToMachine: (machineId: string, subPage?: AssetsSubPage) => void;
  renderCustomStage?: (ctx: OperatorCustomStageContext) => React.ReactNode;
}) {
  const fleet = useKilnFleet();
  const machines = useMemo(() => (plant ? subtreeMachines(plant) : []), [plant]);
  const primaryMachineId = usePrimaryMachineId();
  const healthModels = useHealthModels();
  const plantEngine = usePlantEngineOf(plant?.id ?? focusMachine?.plantId);

  let contextSubPage: AssetsSubPage | undefined;
  let contextSetSubPage: ((page: AssetsSubPage) => void) | undefined;
  let contextSelectedMachineId: string | null | undefined;
  let contextSetMachineId: ((id: string | null) => void) | undefined;
  let contextMachines: AssetMachine[] | undefined;
  let selectComponent: (machineId: string, subId: string | null) => void = () => undefined;
  let contextSelectedComponentId: string | null = null;
  try {
    const dataContext = useIndustrialData();
    contextSubPage = dataContext.activeSubPage;
    contextSetSubPage = dataContext.setActiveSubPage;
    contextSelectedMachineId = dataContext.selectedMachineId;
    contextSetMachineId = dataContext.setSelectedMachineId;
    contextMachines = dataContext.allMachines.length ? dataContext.allMachines : dataContext.machines;
    selectComponent = dataContext.selectComponent;
    contextSelectedComponentId = dataContext.selectedComponentId;
  } catch {
    // Fallback when outside provider
  }

  /** The plant's machine records (database), in hierarchy order. */
  const plantCatalog = useMemo<AssetMachine[]>(() => {
    const byId = (id: string) => lookup?.get(id)?.machine ?? contextMachines?.find((m) => m.id === id);
    const ids = machines.map((m) => m.machineId).filter((id): id is string => Boolean(id));
    if (ids.length) return ids.map(byId).filter((m): m is AssetMachine => Boolean(m));
    if (focusMachine?.plantId) return (contextMachines ?? []).filter((m) => m.plantId === focusMachine.plantId);
    return focusMachine ? [focusMachine] : [];
  }, [machines, lookup, contextMachines, focusMachine]);

  const isPyroPlant = useMemo(() => {
    if (focusMachine) return isPyroLineDiagram(focusMachine.diagramType);
    return plantEngine === "pyro" || plantCatalog.some((m) => isPyroLineDiagram(m.diagramType));
  }, [focusMachine, plantEngine, plantCatalog]);

  const vpcUnits = useMemo(() => plantCatalog.filter((m) => m.diagramType === VPC_DIAGRAM), [plantCatalog]);
  const isVpcPlant = useMemo(() => {
    if (focusMachine) return focusMachine.diagramType === VPC_DIAGRAM;
    return plantEngine === "vpc" || vpcUnits.length > 0;
  }, [focusMachine, plantEngine, vpcUnits]);

  // Section → machine id from the plant's machines (by drawing kind); "line" = the plant's primary machine.
  const sectionSig = useMemo(() => {
    const byDiagram = (dt: string | null) => (dt ? plantCatalog.find((m) => m.diagramType === dt)?.id ?? "" : "");
    const units = PYRO_SECTION_TABS.map((t) => byDiagram(t.diagramType));
    const line = plantCatalog.some((m) => m.id === primaryMachineId) ? primaryMachineId : units.find(Boolean) ?? "";
    return PYRO_SECTION_TABS.map((t, i) => (t.id === "line" ? line : units[i])).join("|");
  }, [plantCatalog, primaryMachineId]);
  const sectionMachineIds = useMemo(() => {
    const ids = sectionSig.split("|");
    const out: Partial<Record<PyroSectionId, string>> = {};
    PYRO_SECTION_TABS.forEach((t, i) => {
      if (ids[i]) out[t.id] = ids[i];
    });
    return out;
  }, [sectionSig]);
  const machineToSection = useMemo(() => {
    const out: Record<string, PyroSectionId> = {};
    for (const t of PYRO_SECTION_TABS) {
      const id = sectionMachineIds[t.id];
      if (t.id !== "line" && id) out[id] = t.id;
    }
    return out;
  }, [sectionMachineIds]);

  const initialMachineId = focusMachine?.id ?? contextSelectedMachineId ?? null;
  const [pyroSection, setPyroSection] = useState<PyroSectionId>(() =>
    initialMachineId && machineToSection[initialMachineId] ? machineToSection[initialMachineId] : "line",
  );
  const [appleUnitFilter, setAppleUnitFilter] = useState<PyroSectionId>(() =>
    initialMachineId && machineToSection[initialMachineId] ? machineToSection[initialMachineId] : "line",
  );
  const [lastPyroUnit, setLastPyroUnit] = useState<Exclude<PyroSectionId, "line">>(() =>
    initialMachineId && machineToSection[initialMachineId] && machineToSection[initialMachineId] !== "line"
      ? (machineToSection[initialMachineId] as Exclude<PyroSectionId, "line">)
      : "kln",
  );

  // The plant's machines may arrive after mount: open the section of the initially selected machine once they do.
  const sectionsBound = useRef(false);
  useEffect(() => {
    if (sectionsBound.current || Object.keys(machineToSection).length === 0) return;
    sectionsBound.current = true;
    const sec = initialMachineId ? machineToSection[initialMachineId] : undefined;
    if (!sec || sec === "line") return;
    setPyroSection(sec);
    setAppleUnitFilter(sec);
    setLastPyroUnit(sec);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the section binding first resolves
  }, [machineToSection]);

  useEffect(() => {
    if (pyroSection !== "line") {
      setLastPyroUnit(pyroSection);
    }
  }, [pyroSection]);

  const [detailSheetId, setDetailSheetId] = useState<string | null>(null);
  const [detailPartId, setDetailPartId] = useState<string | null>(null);
  const [pickedUnitId, setPickedUnitId] = useState<string | null>(() => initialMachineId);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Point value callouts next to measurement points on the machine (Default: "value" so all sensor values appear next to their points!)
  const [pointLabelMode] = useState<PointLabelMode>("value");

  // Contextual Detail Popup Modal (eliminates separate sub-pages in a second navbar)
  type DetailModalId =
    | "subassemblies"
    | "operating"
    | "areas"
    | "sensors"
    | "diagnosis"
    | "prognosis"
    | "analysis"
    | "thermal"
    | "trends"
    | "rack"
    | "simulation"
    | null;
  const [activeDetailModal, setActiveDetailModal] = useState<DetailModalId>(null);
  /** Machine clicked on the PYR-0 line sheet: its summary popup. */
  const [quickLookId, setQuickLookId] = useState<string | null>(null);
  /** Sub-assembly picked on the line sheet: its quick look. */
  const [partLook, setPartLook] = useState<{ machineId: string; subId: string } | null>(null);

  useEffect(() => {
    if (!activeDetailModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveDetailModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeDetailModal]);

  // Active Overview Subpage (always "machine" on the main canvas; subassemblies/operating/areas open as popups)
  const setSubpage = (tab: OperatorSubpageId) => {
    setActiveDetailModal(tab === "subassemblies" || tab === "operating" || tab === "areas" ? tab : null);
  };

  // Map AssetsSubPage + machine selection into the 7 ordered layers:
  // overview -> machine -> sensors -> diagnosis (incl. health) -> prognosis -> analysis
  const subPageToLayer = (
    p: AssetsSubPage | OperatorLayerId | undefined,
    hasFocusedMachine: boolean,
  ): OperatorLayerId => {
    if (!p || p === "overview") return hasFocusedMachine ? "machine" : "overview";
    if (p === "machine") return "machine";
    if (p === "sensors" || p === "trends" || p === "rack" || p === "simulation") return "sensors";
    if (p === "health" || p === "thermal" || p === "diagnosis") return "diagnosis";
    if (p === "prognosis") return "prognosis";
    if (p === "analysis") return "analysis";
    return hasFocusedMachine ? "machine" : "overview";
  };

  const layerToContextSubPage = (layer: OperatorLayerId): AssetsSubPage => {
    if (layer === "overview" || layer === "machine") return "overview";
    return layer;
  };

  // Sensors, Diagnosis, Prognosis and Analysis open in the Assets workspace (see selectLayer).
  const isAssetsLayer = (layer: OperatorLayerId) =>
    layer === "sensors" || layer === "diagnosis" || layer === "prognosis" || layer === "analysis";

  const [internalLayer, setInternalLayer] = useState<OperatorLayerId>(() => {
    const layer = subPageToLayer(contextSubPage, Boolean(initialMachineId));
    return isAssetsLayer(layer) ? "machine" : layer;
  });
  const prevContextSubPage = useRef<AssetsSubPage | undefined>(contextSubPage);
  const prevContextMachineId = useRef<string | null | undefined>(contextSelectedMachineId);

  const selectLayer = (layer: OperatorLayerId) => {
    setActiveDetailModal(null);
    if (isAssetsLayer(layer)) {
      onNavigateToMachine(activeMachineId, layer as AssetsSubPage);
      return;
    }
    if (layer === "overview") {
      if (isPyroPlant && !focusMachine) {
        setPyroSection("line");
        setAppleUnitFilter("line");
      } else if (!focusMachine) {
        setPickedUnitId(null);
        setFactoryFocusUnitId(null);
      }
      setDetailSheetId(null);
      setDetailPartId(null);
      setSelectedTag(null);
      resetZoom();
      setInternalLayer("overview");
      prevContextSubPage.current = "overview";
      contextSetSubPage?.("overview");
      return;
    }
    if (layer === "machine") {
      if (isPyroPlant && pyroSection === "line") {
        setPyroSection(lastPyroUnit);
        setAppleUnitFilter(lastPyroUnit);
      } else if (!isPyroPlant && !pickedUnitId && !focusMachine) {
        const defaultUnit = factoryFocusUnitId ?? machines[0]?.machineId ?? (primaryMachineId || null);
        if (defaultUnit) {
          setPickedUnitId(defaultUnit);
          setFactoryFocusUnitId(defaultUnit);
        }
      }
    }
    setInternalLayer(layer);
    const mapped = layerToContextSubPage(layer);
    prevContextSubPage.current = mapped;
    contextSetSubPage?.(mapped);
  };

  const routeSubPage = (next: AssetsSubPage | OperatorLayerId) => {
    if (next === "trends" || next === "rack" || next === "simulation" || next === "thermal") {
      setActiveDetailModal(next);
      return;
    }
    selectLayer(subPageToLayer(next, true));
  };

  useEffect(() => {
    if (contextSubPage && contextSubPage !== prevContextSubPage.current) {
      prevContextSubPage.current = contextSubPage;
      // Machine pages and their popups belong to the Assets workspace, which follows
      // the same context: only a return to the Overview concerns the Operator view.
      if (contextSubPage === "overview") routeSubPage(contextSubPage);
    }
  }, [contextSubPage]);

  const [, setCardPageIdx] = useState<number>(0);

  // Viewport Zoom & Pan for the full-screen 2D Machine stage
  const [zoom, setZoom] = useState<number>(1);
  // Full screen: the drawing pane alone fills the screen (Esc or the exit button leaves).
  const diagramPaneRef = useRef<HTMLDivElement>(null);
  const [paneFullscreen, setPaneFullscreen] = useState(false);
  useEffect(() => {
    const sync = () => setPaneFullscreen(Boolean(diagramPaneRef.current) && document.fullscreenElement === diagramPaneRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void diagramPaneRef.current?.requestFullscreen?.();
  }, []);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const clampZoom = (z: number) => Math.max(0.75, Math.min(2.5, +z.toFixed(2)));
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (focusMachine && machineToSection[focusMachine.id]) {
      const sec = machineToSection[focusMachine.id];
      setPyroSection(sec);
      setAppleUnitFilter(sec);
      setCardPageIdx(0);
      setDetailSheetId(null);
      setDetailPartId(null);
      resetZoom();
    } else if (focusMachine) {
      setPickedUnitId(focusMachine.id);
      setCardPageIdx(0);
      setDetailSheetId(null);
      setDetailPartId(null);
      resetZoom();
    }
  }, [focusMachine, machineToSection]);

  // Synchronize when selectedMachineId changes from top-bar MachineSwitcher or navigateToMachine
  useEffect(() => {
    if (focusMachine) return;
    if (contextSelectedMachineId === prevContextMachineId.current) return;
    prevContextMachineId.current = contextSelectedMachineId;

    if (!contextSelectedMachineId) {
      if (isPyroPlant) {
        setPyroSection("line");
        setAppleUnitFilter("line");
      } else {
        setPickedUnitId(null);
      }
      setDetailSheetId(null);
      setDetailPartId(null);
      setSelectedTag(null);
      setInternalLayer("overview");
      resetZoom();
      return;
    }

    if (machineToSection[contextSelectedMachineId]) {
      const sec = machineToSection[contextSelectedMachineId];
      setPyroSection(sec);
      setAppleUnitFilter(sec);
      setDetailSheetId(null);
      setDetailPartId(null);
      setSelectedTag(null);
      setInternalLayer((prev) => (prev === "overview" ? "machine" : prev));
      resetZoom();
    } else {
      setPickedUnitId(contextSelectedMachineId);
      setDetailSheetId(null);
      setDetailPartId(null);
      setSelectedTag(null);
      setInternalLayer((prev) => (prev === "overview" ? "machine" : prev));
      resetZoom();
    }
  }, [contextSelectedMachineId, focusMachine, isPyroPlant, machineToSection]);

  // Listen to explicit navigateToMachine custom events (even if the machine ID was already selected)
  useEffect(() => {
    const onOpenMachine = (ev: Event) => {
      const detail = (ev as CustomEvent<{ machineId: string; subPage?: AssetsSubPage }>).detail;
      if (!detail?.machineId) return;
      prevContextMachineId.current = detail.machineId;
      if (machineToSection[detail.machineId]) {
        const sec = machineToSection[detail.machineId];
        setPyroSection(sec);
        setAppleUnitFilter(sec);
      } else {
        setPickedUnitId(detail.machineId);
      }
      setDetailSheetId(null);
      setDetailPartId(null);
      setSelectedTag(null);
      resetZoom();
      if (detail.subPage) {
        prevContextSubPage.current = detail.subPage;
        routeSubPage(detail.subPage);
      } else {
        setInternalLayer("machine");
      }
    };
    window.addEventListener("ultron:open-operator-machine", onOpenMachine);
    return () => window.removeEventListener("ultron:open-operator-machine", onOpenMachine);
  }, [machineToSection]);

  const activeTabSpec = useMemo(
    () => PYRO_SECTION_TABS.find((t) => t.id === pyroSection) ?? PYRO_SECTION_TABS[0],
    [pyroSection],
  );

  const isFullLine = useMemo(() => {
    if (focusMachine && !isPyroPlant) return false;
    if (isPyroPlant) return pyroSection === "line";
    return pickedUnitId === null;
  }, [focusMachine, isPyroPlant, pyroSection, pickedUnitId]);

  const [factoryFocusUnitId, setFactoryFocusUnitId] = useState<string | null>(null);
  const [telemetryCardLens, setTelemetryCardLens] = useState<"combined" | "values" | "trends" | "roc">("combined");
  const [telemetryStatusFilter, setTelemetryStatusFilter] = useState<"all" | "offnormal">("all");
  const [telemetryLayoutMode, setTelemetryLayoutMode] = useState<"both" | "cards" | "register">("both");

  const activeMachineId = useMemo(() => {
    if (isPyroPlant) {
      if (pyroSection === "line") {
        const fallbackSec = appleUnitFilter !== "line" ? appleUnitFilter : lastPyroUnit;
        return sectionMachineIds[fallbackSec] ?? sectionMachineIds.line ?? primaryMachineId;
      }
      return sectionMachineIds[activeTabSpec.id] ?? primaryMachineId;
    }
    if (isVpcPlant) return pickedUnitId ?? factoryFocusUnitId ?? focusMachine?.id ?? vpcUnits[0]?.id ?? primaryMachineId;
    const candidateId = pickedUnitId ?? factoryFocusUnitId;
    if (candidateId && machines.some((m) => m.machineId === candidateId)) return candidateId;
    if (focusMachine) return focusMachine.id;
    return machines[0]?.machineId ?? primaryMachineId;
  }, [isPyroPlant, isVpcPlant, pyroSection, appleUnitFilter, lastPyroUnit, activeTabSpec, pickedUnitId, factoryFocusUnitId, machines, focusMachine, sectionMachineIds, vpcUnits, primaryMachineId]);

  const navigateWithinConsole = (targetMachineId: string, sub: AssetsSubPage | OperatorLayerId = "machine") => {
    prevContextMachineId.current = targetMachineId;
    contextSetMachineId?.(targetMachineId);
    if (isPyroPlant && machineToSection[targetMachineId]) {
      const sec = machineToSection[targetMachineId];
      setPyroSection(sec);
      setAppleUnitFilter(sec);
      setDetailSheetId(null);
      setDetailPartId(null);
    } else if (machines.some((m) => m.machineId === targetMachineId)) {
      setPickedUnitId(targetMachineId);
      setFactoryFocusUnitId(targetMachineId);
      setDetailSheetId(null);
      setDetailPartId(null);
    } else if (focusMachine && targetMachineId !== focusMachine.id) {
      onNavigateToMachine(targetMachineId, sub === "machine" ? "overview" : (sub as AssetsSubPage));
      return;
    }
    routeSubPage(sub === "overview" ? "machine" : sub);
  };

  const activeSim = fleet[activeMachineId] ?? null;
  const activeFrame = activeSim?.frame ?? null;
  const activeCatalogRecord = useMemo<AssetMachine | null>(
    () =>
      (focusMachine?.id === activeMachineId ? focusMachine : undefined) ??
      lookup?.get(activeMachineId)?.machine ??
      contextMachines?.find((m) => m.id === activeMachineId) ??
      null,
    [focusMachine, lookup, contextMachines, activeMachineId],
  );
  // Until the machine record loads: its id only, no data (pages show their empty states).
  const activeCatalogMachine = useMemo<AssetMachine>(
    () =>
      activeCatalogRecord ??
      ({
        id: activeMachineId,
        name: activeMachineId,
        type: "",
        plant: "",
        area: "",
        processCell: "",
        status: "No data",
        health: null,
        signalsCount: 0,
        powerRating: "—",
        operatingSpeed: "—",
        parts: [],
        hotspots: [],
      } as unknown as AssetMachine),
    [activeCatalogRecord, activeMachineId],
  );

  const kilnSimulation = useKilnSimulationFor(activeCatalogMachine.id) ?? activeSim ?? undefined;
  const activeHealthBands = bandsOf(healthModels, activeCatalogRecord?.healthModelId);
  const hasShell = Boolean(defsFor(activeCatalogMachine.id)?.hasShell);
  const effectiveLayer: OperatorLayerId = internalLayer === "overview" && !isFullLine ? "machine" : internalLayer;
  const effectiveMainPage: AssetsSubPage =
    effectiveLayer === "overview" || effectiveLayer === "machine" ? "overview" : effectiveLayer;

  // Honor sessionStorage overview section deep links
  useEffect(() => {
    if (effectiveMainPage !== "overview") return;
    try {
      const wanted = sessionStorage.getItem(OVERVIEW_SECTION_KEY);
      if (!wanted) return;
      sessionStorage.removeItem(OVERVIEW_SECTION_KEY);
      if (wanted === OV_SECTIONS.operating) setSubpage("operating");
      else if (wanted === OV_SECTIONS.areas) setSubpage("areas");
      else if (wanted === "ov-subassemblies") setSubpage("subassemblies");
      else setSubpage("machine");
    } catch {
      /* storage unavailable */
    }
  }, [activeMachineId, effectiveMainPage]);

  // Unified Overview Digest for Sub-assembly, Operating point, Status by area, and Key figures
  const digest = useOverviewDigest(activeCatalogMachine, sensorData ?? activeSim?.sensorData);
  const {
    overall: digestOverall,
    conditionLabel,
    isLiveHealth,
    counts: digestCounts,
    sensors: digestSensors,
    findings: digestFindings,
    outlook: digestOutlook,
    groups: digestGroups,
    dataQuality: digestQuality,
  } = digest;

  const showSubassemblies = digestGroups.rows.length > 0;
  const showOperating = digest.operating.rows.length > 0;
  const showAreas = areaRows({ machine: activeCatalogMachine, d: digest }).length > 0;

  const effectiveSubpage: OperatorSubpageId = "machine";

  const activeCatalog = useMachineCatalog(activeCatalogMachine);
  const resolveTag = useTagResolver(activeMachineId, activeFrame, activeCatalog.sensors);
  const activeDetailedSensors = useMemo(
    () => buildDetailedSensors(activeCatalog.sensors, undefined, activeMachineId),
    [activeCatalog.sensors, activeMachineId],
  );
  const detailedByTag = useMemo(
    () => new Map(activeDetailedSensors.map((s) => [s.parameter || s.id, s])),
    [activeDetailedSensors],
  );
  const machineComponents = useMachineComponents(activeMachineId, activeCatalog, activeDetailedSensors);
  const fleetParts = useMemo<MachineComponent[]>(() => {
    if (isPyroPlant || isVpcPlant) return [];
    // The machine's sub-assemblies come from its catalogue (GET /api/catalog); none while it loads.
    return machineComponents.filter((part) => part.pins?.length);
  }, [isPyroPlant, isVpcPlant, machineComponents]);
  const activePart = fleetParts.find((part) => part.id === detailPartId) ?? null;

  const unitSheets = useMemo(() => {
    if (isPyroPlant && pyroSection === "line") {
      return PYRO_SECTION_TABS.map((t) => LINE_SHEET_BY_ID[t.sheetId]).filter(
        (s): s is NonNullable<typeof s> => Boolean(s && LINE_SHEET_ART[s.id]?.ready),
      );
    }
    if (isPyroPlant || isVpcPlant) {
      return lineSheetsForMachine(activeMachineId).filter((s) => LINE_SHEET_ART[s.id]?.ready);
    }
    return [];
  }, [isPyroPlant, isVpcPlant, pyroSection, activeMachineId]);

  // Honor sessionStorage focus sheet key (when navigating from sheet index)
  useEffect(() => {
    if (unitSheets.length === 0) return;
    try {
      const wanted = sessionStorage.getItem(LINE_SHEET_FOCUS_KEY);
      if (!wanted || !unitSheets.some((s) => s.id === wanted)) return;
      sessionStorage.removeItem(LINE_SHEET_FOCUS_KEY);
      const target = unitSheets.find((s) => s.id === wanted);
      const sheet = target && target.kind !== "overview" && target.kind !== "line" ? target.id : null;
      setDetailSheetId(sheet);
      pickSheetPart(sheet);
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once the drawings are known; pickSheetPart is recreated every render
  }, [unitSheets]);

  const activeSheetId = useMemo(() => {
    if (detailSheetId && LINE_SHEET_ART[detailSheetId]?.ready) return detailSheetId;
    if (isPyroPlant) {
      return activeTabSpec.sheetId;
    }
    if (isVpcPlant) return "V-0";
    return null;
  }, [detailSheetId, isPyroPlant, activeTabSpec, isVpcPlant]);

  // Sheet stepper index & handler (`1/6 ‹ ›`) — preserves active Lens!
  const activeSheetIndex = useMemo(() => {
    if (unitSheets.length === 0) return activePart ? fleetParts.findIndex((part) => part.id === activePart.id) + 1 : 0;
    if (!detailSheetId) return 0;
    const idx = unitSheets.findIndex((s) => s.id === detailSheetId);
    return idx >= 0 ? idx : 0;
  }, [unitSheets, detailSheetId, activePart, fleetParts]);

  const stepSheet = (delta: number) => {
    if (unitSheets.length < 2) {
      if (!fleetParts.length) return;
      const idx = (activeSheetIndex + delta + fleetParts.length + 1) % (fleetParts.length + 1);
      setDetailPartId(idx === 0 ? null : fleetParts[idx - 1].id);
      selectComponent(activeMachineId, idx === 0 ? null : fleetParts[idx - 1].id);
      setCardPageIdx(0);
      resetZoom();
      return;
    }
    const nextIdx = (activeSheetIndex + delta + unitSheets.length) % unitSheets.length;
    const target = unitSheets[nextIdx];
    const isRootSheet = nextIdx === 0 || target.kind === "line" || (pyroSection !== "line" && target.kind === "overview");
    setDetailSheetId(isRootSheet ? null : target.id);
    pickSheetPart(isRootSheet ? null : target.id);
    setCardPageIdx(0);
    resetZoom();
  };

  /* ------------------------------------------------------------------------
     DRAWINGS ↔ PARTS
     A part's drawing is the detail sheet holding most of its sensors. Picking a
     drawing (or a fleet part) here picks its part for every machine page — the
     Assets part bar — and while a part is picked its drawing stays open (the
     console's own resets on navigation put it back). "All" is the whole machine;
     a drawing of several parts keeps the part if it is one of them, else shows
     the whole machine. Only user picks change the part, never a reset.
     ------------------------------------------------------------------------ */
  const partOptions = useMemo(
    () => componentOptions({ subassemblies: activeCatalog.subassemblies, sensors: activeCatalog.sensors }),
    [activeCatalog.subassemblies, activeCatalog.sensors],
  );
  const sheetLinks = useMemo(() => {
    const sheetOf = new Map<string, string>();
    const partsOf = new Map<string, ComponentOption[]>();
    if (isFullLine) return { sheetOf, partsOf };
    const detail = new Set(unitSheets.filter((s, i) => i > 0 && s.kind !== "line" && s.kind !== "overview").map((s) => s.id));
    for (const o of partOptions) {
      const sheet = lineSheetsForTags(o.tags).find((id) => detail.has(id));
      if (!sheet) continue;
      sheetOf.set(o.id, sheet);
      partsOf.set(sheet, [...(partsOf.get(sheet) ?? []), o]);
    }
    return { sheetOf, partsOf };
  }, [unitSheets, partOptions, isFullLine]);
  const selectedPartId = contextSelectedMachineId === activeMachineId ? contextSelectedComponentId : null;

  /** A drawing the user picked → its part (call beside `setDetailSheetId` in user handlers only). */
  const pickSheetPart = (sheetId: string | null) => {
    if (sheetLinks.sheetOf.size === 0) return;
    const parts = sheetId ? (sheetLinks.partsOf.get(sheetId) ?? []) : [];
    if (sheetId && parts.some((o) => o.id === selectedPartId)) return;
    selectComponent(activeMachineId, parts.length === 1 ? parts[0].id : null);
  };

  // A picked part keeps its drawing open; the part going back to the whole machine closes its own drawing.
  const linkedPart = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (sheetLinks.sheetOf.size === 0) return;
    const prev = linkedPart.current;
    linkedPart.current = selectedPartId;
    let next: string | null | undefined;
    if (selectedPartId) {
      const sheet = sheetLinks.sheetOf.get(selectedPartId);
      if (sheet && sheet !== detailSheetId) next = sheet;
    } else if (prev && detailSheetId && sheetLinks.sheetOf.get(prev) === detailSheetId && (sheetLinks.partsOf.get(detailSheetId)?.length ?? 0) === 1) {
      next = null;
    }
    if (next === undefined) return;
    setDetailSheetId(next);
    setCardPageIdx(0);
    resetZoom();
  }, [selectedPartId, sheetLinks, detailSheetId]);

  // Fleet machines (one part per pill): the pill and the part are the same id, kept in step the same way.
  const linkedFleetPart = useRef<string | null>(null);
  useEffect(() => {
    if (!fleetParts.length) return;
    const prev = linkedFleetPart.current;
    linkedFleetPart.current = selectedPartId;
    if (selectedPartId && fleetParts.some((p) => p.id === selectedPartId)) {
      if (detailPartId !== selectedPartId) setDetailPartId(selectedPartId);
    } else if (!selectedPartId && prev && detailPartId === prev) {
      setDetailPartId(null);
    }
  }, [selectedPartId, fleetParts, detailPartId]);

  /** Dot tone and lowest health of a drawing's (or fleet pill's) parts. */
  const partBadge = (parts: ComponentOption[]) => {
    if (!parts.length) return null;
    const tone = parts.some((o) => o.status === "Critical") ? "bad" : parts.some((o) => o.status === "Alert") ? "warn" : "good";
    const scores = parts.map((o) => o.health).filter((h): h is number => h !== null);
    return { tone, health: scores.length ? Math.min(...scores) : null, names: parts.map((o) => `${o.name} ${o.health ?? "—"}%`).join(", ") };
  };

  // Focus group state for Sub-assembly table selection -> opens detail sheet or part on Machine view
  const [focusGroup, setFocusGroup] = useState<string | null>(null);
  const handleSelectGroupFromTable = (groupId: string | null) => {
    setFocusGroup(groupId);
    // A row of the parts table is a part: it becomes the machine's part (and opens its drawing).
    if (partOptions.some((o) => o.id === groupId) || !groupId) selectComponent(activeMachineId, groupId);
    if (!groupId) {
      setDetailSheetId(null);
      setDetailPartId(null);
      return;
    }
    const grp = digestGroups.rows.find((g) => g.id === groupId);
    if (grp && unitSheets.length > 0) {
      const targetSheet = lineSheetsForTags(grp.tags).find((id) => unitSheets.some((s) => s.id === id));
      if (targetSheet) {
        const sMeta = LINE_SHEET_BY_ID[targetSheet];
        setDetailSheetId(sMeta?.kind === "overview" ? null : targetSheet);
        setSubpage("machine");
        resetZoom();
        return;
      }
    }
    if (fleetParts.some((p) => p.id === groupId)) {
      setDetailPartId(groupId);
      setSubpage("machine");
      resetZoom();
      return;
    }
    setSubpage("machine");
  };

  /* ------------------------------------------------------------------------
     ACTIVE COMPONENT SCOPE & RESOLVED SIGNALS
     Synchronized across Overview, Diagnosis, Prognosis, Analysis & Sensors
     ------------------------------------------------------------------------ */
  const activeComponentScope = useMemo(() => {
    if (activePart) {
      return {
        id: activePart.id,
        shortLabel: activePart.shortName,
        label: activePart.name,
        tags: activePart.tags,
      };
    }
    if (detailSheetId && LINE_SHEET_BY_ID[detailSheetId]) {
      return {
        id: detailSheetId,
        shortLabel: sheetProperName(detailSheetId, true),
        label: sheetProperName(detailSheetId, false),
        tags: lineSheetTags(detailSheetId),
      };
    }
    return null;
  }, [activePart, detailSheetId]);

  const scopeTags = useMemo<string[]>(() => {
    if (activePart) return activePart.tags;
    if (detailSheetId && LINE_SHEET_BY_ID[detailSheetId]) {
      const st = lineSheetTags(detailSheetId);
      if (st.length > 0) return st;
    }
    const tagsOf = (id: string | undefined) => (id ? defsFor(id)?.signals.map((s) => s.tag) ?? [] : []);
    if (isPyroPlant) {
      const targetSec = pyroSection === "line" ? appleUnitFilter : pyroSection;
      if (targetSec === "line") {
        return [...new Set(PYRO_SECTION_TABS.filter((t) => t.id !== "line").flatMap((t) => tagsOf(sectionMachineIds[t.id])))];
      }
      return tagsOf(sectionMachineIds[targetSec] ?? activeMachineId);
    }
    if (isVpcPlant) {
      return tagsOf(activeMachineId);
    }
    return activeCatalog.sensors.length ? activeCatalog.sensors.map((s) => s.tag) : tagsOf(activeMachineId);
  }, [activePart, detailSheetId, isPyroPlant, isVpcPlant, pyroSection, appleUnitFilter, activeCatalog.sensors, activeMachineId, sectionMachineIds]);

  const visibleSubpageSignals = useMemo(() => {
    return scopeTags.map((t) => resolveTag(t));
  }, [scopeTags, resolveTag]);

  const filteredTelemetrySignals = useMemo(() => {
    if (telemetryStatusFilter === "offnormal") {
      return visibleSubpageSignals.filter((s) => s.status !== "Normal");
    }
    return visibleSubpageSignals;
  }, [visibleSubpageSignals, telemetryStatusFilter]);

  const subpageGridCols = useMemo(() => {
    const n = filteredTelemetrySignals.length;
    if (n <= 4) return Math.max(2, n);
    if (n <= 9) return 3;
    if (n <= 12) return 4;
    return 5;
  }, [filteredTelemetrySignals.length]);

  const cleanCatalogMachineName = useMemo(
    () => activeCatalogMachine.name.replace(/\s*\([A-Z0-9-]+\)\s*$/, ""),
    [activeCatalogMachine.name],
  );

  // Sidebar alarm list: every plant alarm raised since the tab opened stays listed (active red, cleared normal).
  // Latched on the plant-wide list, which is the same on every view, so switching machine never clears an alarm.
  const plantFrame = useMemo(() => plantCatalog.map((m) => fleet[m.id]?.frame).find(Boolean) ?? null, [plantCatalog, fleet]);
  const latchedAlarms = useLatchedAlarms(
    plantCatalog[0]?.plantId ?? "plant",
    alerts,
    plantFrame ? formatClock(plantFrame.t).clock : null,
    Boolean(plantFrame),
  );
  // Problem messages on the drawing: on/off and the ones closed one by one, kept across sheets.
  const activeAlerts = useMemo(() => alerts.filter((a) => !a.cleared), [alerts]);
  const popupControl = useAlertPopupControl(useMemo(() => activeAlerts.map((a) => a.id), [activeAlerts]));
  const viewAlertCount = isFullLine ? activeAlerts.length : activeAlerts.filter((a) => a.machineId === activeMachineId).length;
  const sidebarAlarms = useMemo(
    () => (isFullLine ? latchedAlarms : latchedAlarms.filter((a) => a.machineId === activeMachineId)),
    [latchedAlarms, isFullLine, activeMachineId],
  );

  const selectedResolved = useMemo(() => (selectedTag ? resolveTag(selectedTag) : null), [selectedTag, resolveTag]);
  const [rateWindowMin, setRateWindowMin] = useState(60);
  const [trendModalTag, setTrendModalTag] = useState<string | null>(null);
  const trendModalSignal = useMemo(() => (trendModalTag ? resolveTag(trendModalTag) : null), [trendModalTag, resolveTag]);
  const trendModalDetail = useMemo(
    () => (trendModalTag ? detailedByTag.get(trendModalTag) ?? null : null),
    [trendModalTag, detailedByTag],
  );
  const trendModalSheetId = useMemo(() => {
    if (!trendModalTag) return null;
    const sheets = lineSheetsForTags([trendModalTag]);
    return sheets.find((id) => LINE_SHEET_BY_ID[id]?.kind !== "line" && LINE_SHEET_BY_ID[id]?.kind !== "overview") ?? sheets[0] ?? null;
  }, [trendModalTag]);
  const trendModalRules = useMemo(() => {
    if (!trendModalTag || !activeFrame) return [];
    return activeFrame.rules.filter(
      (r) =>
        r.evidence.includes(trendModalTag) ||
        r.logic.includes(trendModalTag) ||
        r.name.toLowerCase().includes(trendModalSignal?.name.toLowerCase() ?? "___"),
    );
  }, [trendModalTag, activeFrame, trendModalSignal]);

  useEffect(() => {
    if (!trendModalTag) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTrendModalTag(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trendModalTag]);

  const openSensorTrendPopup = (tag: string) => {
    setSelectedTag(tag);
    setTrendModalTag(tag);
  };

  const toggleTag = (tag: string | null) => {
    setSelectedTag(tag);
    setTrendModalTag(tag);
  };

  const locateTag = (tag: string) => {
    if (isPyroPlant) {
      const owner = Object.keys(machineToSection).find((id) => defsFor(id)?.signalByTag[tag]);
      const sec = owner ? machineToSection[owner] : undefined;
      if (sec) setPyroSection(sec);
    }
    const targetSheets = lineSheetsForTags([tag]);
    const detailSheet = targetSheets.find(
      (id) => LINE_SHEET_BY_ID[id]?.kind !== "line" && LINE_SHEET_BY_ID[id]?.kind !== "overview",
    );
    setDetailSheetId(detailSheet ?? null);
    pickSheetPart(detailSheet ?? null);
    setDetailPartId(null);
    setSelectedTag(tag);
    setTrendModalTag(null);
    selectLayer("machine");
    onChangeView?.("operator");
    resetZoom();
  };

  const handleSelectPyroSection = (sec: PyroSectionId) => {
    setPyroSection(sec);
    setAppleUnitFilter(sec);
    setCardPageIdx(0);
    setDetailSheetId(null);
    setDetailPartId(null);
    setSelectedTag(null);
    setTrendModalTag(null);
    setActiveDetailModal(null);
    resetZoom();
    if (sec === "line") {
      setInternalLayer("overview");
      prevContextSubPage.current = "overview";
      contextSetSubPage?.("overview");
    } else {
      setInternalLayer("machine");
      prevContextSubPage.current = "overview";
      contextSetSubPage?.("overview");
    }
    const nextMachineId = sec === "line" ? null : (sectionMachineIds[sec] ?? null);
    prevContextMachineId.current = nextMachineId;
    contextSetMachineId?.(nextMachineId);
  };

  const handleSelectUnitById = (mId: string | null) => {
    if (!mId) {
      if (isPyroPlant) {
        handleSelectPyroSection("line");
      } else {
        setPickedUnitId(null);
        setFactoryFocusUnitId(null);
        prevContextMachineId.current = null;
        contextSetMachineId?.(null);
        setDetailSheetId(null);
        setDetailPartId(null);
        setSelectedTag(null);
        setActiveDetailModal(null);
        setInternalLayer("overview");
        prevContextSubPage.current = "overview";
        contextSetSubPage?.("overview");
        resetZoom();
      }
      return;
    }
    if (isPyroPlant && machineToSection[mId]) {
      handleSelectPyroSection(machineToSection[mId]);
      return;
    }
    setPickedUnitId(mId);
    setFactoryFocusUnitId(mId);
    prevContextMachineId.current = mId;
    contextSetMachineId?.(mId);
    setCardPageIdx(0);
    setDetailSheetId(null);
    setDetailPartId(null);
    setSelectedTag(null);
    setActiveDetailModal(null);
    setInternalLayer("machine");
    prevContextSubPage.current = "overview";
    contextSetSubPage?.("overview");
    resetZoom();
  };

  /* ------------------------------------------------------ key figures (for Sub-assembly / Operating point / Status by area) */
  const hasDigestData = digestSensors.length > 0 || digestGroups.rows.length > 0 || isLiveHealth;
  const offNormalCount = digestCounts.Alert + digestCounts.Critical;
  const firstOutlook = digestOutlook?.first ?? null;
  const topFinding = digestFindings.active[0] ?? null;
  const topFindingText = topFinding ? (activeFrame?.rules.find((r) => r.id === topFinding.id)?.plainTitle ?? topFinding.name) : null;
  const kpis: KpiItem[] = [
    {
      label: "Health score",
      value: hasDigestData ? String(digestOverall) : "—",
      unit: hasDigestData ? "%" : undefined,
      bar: hasDigestData ? digestOverall : undefined,
      tone: hasDigestData ? conditionTone(conditionLabel) : "idle",
      foot: isLiveHealth ? "Live" : hasDigestData ? "Saved record" : "No data",
    },
    {
      label: "Problems found",
      value: digestFindings.source === "none" ? "—" : String(digestFindings.active.length),
      tone: digestFindings.active.some((f) => f.severity === "Critical") ? "bad" : digestFindings.active.length ? "warn" : "idle",
      foot: topFindingText
        ? topFindingText
        : digestFindings.source === "none"
        ? "No live checks on this machine"
        : digestFindings.pending
        ? `${digestFindings.pending} being checked`
        : "None",
    },
    {
      label: "Sensors out of range",
      value: digestSensors.length ? String(offNormalCount) : "—",
      unit: digestSensors.length ? `/ ${digestSensors.length}` : undefined,
      tone: digestCounts.Critical ? "bad" : offNormalCount ? "warn" : "idle",
      foot: digestSensors.length ? `${digestCounts.Critical} critical · ${digestCounts.Alert} alert` : "No sensors linked to this machine",
    },
    firstOutlook && digestOutlook?.intervene
      ? {
          label: "Act within",
          value: digestOutlook.intervene,
          text: true,
          tone: digestOutlook.condition === "Normal" ? "idle" : severityTone(digestOutlook.condition),
          foot: displayName(firstOutlook.name),
        }
      : {
          label: "Sensors reading correctly",
          value: digestQuality.live && digestQuality.total ? String(digestQuality.valid) : "—",
          unit: digestQuality.live && digestQuality.total ? `/ ${digestQuality.total}` : undefined,
          tone: digestQuality.live && digestQuality.valid !== digestQuality.total ? "warn" : "idle",
          foot: digestQuality.live ? "Checked live" : "Not reported",
        },
  ];

  const totalStepCount = unitSheets.length > 1 ? unitSheets.length : fleetParts.length > 0 ? fleetParts.length + 1 : 1;
  const currentStepDisplay = unitSheets.length > 1 ? activeSheetIndex + 1 : fleetParts.length > 0 ? activeSheetIndex + 1 : 1;
  const showAlarmRail =
    effectiveMainPage === "overview" && effectiveSubpage === "machine";

  const nonPyroUnitIds = useMemo(() => {
    const fromPlant = machines.map((m) => m.machineId).filter((id): id is string => Boolean(id));
    if (fromPlant.length > 0) return fromPlant;
    const fromCtx = (contextMachines ?? []).map((m) => m.id).filter(Boolean);
    if (fromCtx.length > 0) return fromCtx;
    return [activeMachineId];
  }, [machines, contextMachines, activeMachineId]);

  const plantStatus = usePlantStatus(plant, lookup);

  const topbarTabs = useMemo(() => {
    if (isPyroPlant) return machineTabs("pyro", plantCatalog);
    if (isVpcPlant) return machineTabs("vpc", vpcUnits);
    const name = (id: string) => lookup?.get(id)?.machine?.name ?? contextMachines?.find((m) => m.id === id)?.name ?? id;
    return machineTabs("plain", nonPyroUnitIds.map((id) => ({ id, name: name(id) })));
  }, [isPyroPlant, isVpcPlant, plantCatalog, vpcUnits, lookup, contextMachines, nonPyroUnitIds]);

  // Factory Fleet Rollup items when Full line (Factory scope) is active
  const factoryRollupUnits = useMemo(() => {
    if (isPyroPlant) {
      return PYRO_SECTION_TABS.flatMap((t) => {
        const mId = t.id === "line" ? undefined : sectionMachineIds[t.id];
        return mId ? [{ ...t, machineId: mId }] : [];
      }).map((t) => {
        const sim = fleet[t.machineId];
        const frame = sim?.frame;
        const catMachine = plantCatalog.find((m) => m.id === t.machineId);
        const unitTags = defsFor(t.machineId)?.signals.map((s) => s.tag) ?? [];
        const unitSigs = unitTags.map((tag) => frame?.signals[tag]).filter(Boolean);
        const offNormal = unitSigs.filter((s) => s && s.status !== "Normal").length;
        const critical = unitSigs.filter((s) => s && s.status === "Critical").length;
        const activeRules = frame ? frame.rules.filter((r) => r.status === "ACTIVE" && r.severity !== "Normal" && isConditionRule(r)) : [];
        const health: number | null = frame ? Math.round(frame.overall) : (catMachine?.health ?? null);
        const tone: Tone = critical > 0 || activeRules.some((r) => r.severity === "Critical")
          ? "bad"
          : offNormal > 0 || activeRules.length > 0
          ? "warn"
          : health !== null ? healthTone(health, bandsOf(healthModels, catMachine?.healthModelId)) : "idle";
        return {
          id: t.machineId,
          secId: t.id,
          code: t.code,
          name: t.label,
          health,
          tone,
          offNormal,
          totalSensors: unitTags.length,
          findingsCount: activeRules.length,
          topFinding: activeRules[0]?.name ?? "All rules nominal",
          isFocused: activeMachineId === t.machineId,
        };
      });
    }
    return nonPyroUnitIds.map((mId) => {
      const sim = fleet[mId];
      const frame = sim?.frame;
      const catMachine = lookup?.get(mId)?.machine ?? contextMachines?.find((m) => m.id === mId);
      const sigs = frame ? Object.values(frame.signals) : [];
      const offNormal = sigs.filter((s) => s.status !== "Normal").length;
      const critical = sigs.filter((s) => s.status === "Critical").length;
      const activeRules = frame ? frame.rules.filter((r) => r.status === "ACTIVE" && r.severity !== "Normal" && isConditionRule(r)) : [];
      const health: number | null = frame ? Math.round(frame.overall) : (catMachine?.health ?? null);
      const tone: Tone = critical > 0 || activeRules.some((r) => r.severity === "Critical")
        ? "bad"
        : offNormal > 0 || activeRules.length > 0
        ? "warn"
        : health !== null ? healthTone(health, bandsOf(healthModels, catMachine?.healthModelId)) : "idle";
      return {
        id: mId,
        secId: null as PyroSectionId | null,
        code: mId,
        name: (catMachine?.name ?? mId).replace(/\s*\([A-Z0-9-]+\)\s*$/, ""),
        health,
        tone,
        offNormal,
        totalSensors: sigs.length || (catMachine?.signalsCount ?? 0),
        findingsCount: activeRules.length,
        topFinding: activeRules[0]?.name ?? "All rules nominal",
        isFocused: activeMachineId === mId,
      };
    });
  }, [isPyroPlant, fleet, nonPyroUnitIds, lookup, contextMachines, activeMachineId, sectionMachineIds, plantCatalog, healthModels]);

  // Component-specific Diagnostic & Prognostic rollup when a Component/Sheet is selected in Row 1
  const componentRollup = useMemo(() => {
    if (!activeComponentScope) return null;
    const sigs = visibleSubpageSignals;
    const offNormalSigs = sigs.filter((s) => s.status !== "Normal");
    const criticalSigs = sigs.filter((s) => s.status === "Critical");
    const tagSet = new Set(activeComponentScope.tags);
    const matchingRules = (activeFrame?.rules ?? []).filter(
      (r) =>
        r.status === "ACTIVE" &&
        r.severity !== "Normal" &&
        isConditionRule(r) &&
        activeComponentScope.tags.some((t) => r.evidence.includes(t) || r.logic.includes(t)),
    );
    const matchedGroup = digestGroups.rows.find(
      (g) => g.id === activeComponentScope.id || g.tags.some((t) => tagSet.has(t)),
    );
    const health: number | null = activePart?.health ?? matchedGroup?.health ?? null;
    const fastestDrift = [...sigs]
      .filter((s) => s.available && !s.isState)
      .sort((a, b) => Math.abs(b.rocNorm) - Math.abs(a.rocNorm))[0] ?? null;
    const shortestTtlSig = sigs.find((s) => s.timeToLimit && s.timeToLimit !== "Stable" && s.timeToLimit !== "—") ?? null;
    const tone: Tone =
      criticalSigs.length > 0 || matchingRules.some((r) => r.severity === "Critical")
        ? "bad"
        : offNormalSigs.length > 0 || matchingRules.length > 0
        ? "warn"
        : health !== null ? healthTone(health, activeHealthBands) : "idle";
    return {
      scope: activeComponentScope,
      health,
      tone,
      sigs,
      offNormalSigs,
      criticalSigs,
      matchingRules,
      fastestDrift,
      shortestTtlSig,
    };
  }, [activeComponentScope, visibleSubpageSignals, activeFrame, digestGroups.rows, activePart, activeHealthBands]);
  const stageHealth: number | null = componentRollup ? componentRollup.health : hasDigestData ? digestOverall : null;

  const activeScopeBadgeText = useMemo(() => {
    const unitLabel = isFullLine
      ? "Whole plant · Full line"
      : isPyroPlant
      ? `Machine · ${activeTabSpec.label}`
      : `Machine · ${cleanCatalogMachineName}`;
    if (activeComponentScope) {
      return `${unitLabel} › ${activeComponentScope.label}`;
    }
    return `${unitLabel} · All parts`;
  }, [isFullLine, isPyroPlant, activeTabSpec.label, cleanCatalogMachineName, activeComponentScope]);

  const showCustomStage =
    Boolean(renderCustomStage) &&
    view !== "operator" &&
    effectiveMainPage === "overview" &&
    effectiveSubpage === "machine";

  return (
    <div
      className="opc-shell"
      role="region"
      aria-label="Control room view of the plant"
    >
      {/* Row 1 (shared with Assets): the plant's machines and the view toggle. */}
      <MachineTopbar
        tabs={topbarTabs}
        activeKey={effectiveLayer === "overview" ? "line" : isPyroPlant ? pyroSection : activeMachineId}
        onSelect={(t) => (isPyroPlant ? handleSelectPyroSection(t.key as PyroSectionId) : handleSelectUnitById(t.machineId))}
        view={view}
        onChangeView={onChangeView}
      />

      {/* ====================================================================
          100% FULL-SCREEN WORKSPACE
          ==================================================================== */}
      <div className="opc-workspace">
        <div
          className="opc-main-col"
          data-custom-stage={showCustomStage ? "true" : undefined}
        >
          {showCustomStage && renderCustomStage ? (
            renderCustomStage({
              view,
              activeMachineId,
              activeCatalogMachine,
              isFullLine,
              onSelectUnit: handleSelectUnitById,
            })
          ) : (
            <>
              {/* ============================================================
                  NAVBAR 2 (`.opc-subbar` — Permanent, Non-Scrollable):
                  Left: Sub-assembly pill buttons + `1/N ‹ ›` stepper (no dropdowns)
                  Right: Next/Prev Layer buttons (on subpages) or Canvas Zoom (`− 100% +`)
                  ============================================================ */}
              <div className="opc-subbar" role="region" aria-label="Machine parts and drawing controls">
                <div className="opc-stage-tabs">
                  {!isFullLine && unitSheets.length > 1 ? (
                    <>
                      <div className="opc-pill-group opc-subassembly-pills" role="tablist" aria-label="Drawings of the machine's parts">
                        {unitSheets.map((s, idx) => {
                          const isRootSheet =
                            idx === 0 || s.kind === "line" || (pyroSection !== "line" && s.kind === "overview");
                          const isActive = isRootSheet ? detailSheetId === null : detailSheetId === s.id;
                          const fullLabel = isRootSheet ? "All parts" : sheetProperName(s.id, false);
                          const compactLabel = isRootSheet ? "All" : sheetProperName(s.id, true);
                          const badge = isRootSheet ? null : partBadge(sheetLinks.partsOf.get(s.id) ?? []);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              role="tab"
                              aria-selected={isActive}
                              className="opc-pill-btn"
                              data-active={isActive || undefined}
                              title={badge ? `${fullLabel} · ${badge.names}` : fullLabel}
                              onClick={() => {
                                setDetailSheetId(isRootSheet ? null : s.id);
                                pickSheetPart(isRootSheet ? null : s.id);
                                setCardPageIdx(0);
                                resetZoom();
                              }}
                            >
                              {badge && <span className="ph-unit-dot" data-tone={badge.tone} aria-hidden="true" />}
                              <span>{compactLabel}</span>
                              {badge && badge.health !== null && <span className="opc-app-count">{badge.health}%</span>}
                            </button>
                          );
                        })}
                      </div>
                      {totalStepCount > 1 && (
                        <div className="opc-stepper" role="group" aria-label="Step through the part drawings">
                          <span className="opc-stepper-pos ast-num">
                            {currentStepDisplay}/{totalStepCount}
                          </span>
                          <button
                            type="button"
                            className="opc-step-btn"
                            onClick={() => stepSheet(-1)}
                            aria-label="Previous part"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            className="opc-step-btn"
                            onClick={() => stepSheet(1)}
                            aria-label="Next part"
                          >
                            ›
                          </button>
                        </div>
                      )}
                    </>
                  ) : !isFullLine && fleetParts.length > 0 ? (
                    <>
                      <div className="opc-pill-group opc-subassembly-pills" role="tablist" aria-label="Machine parts">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={detailPartId === null}
                          className="opc-pill-btn"
                          data-active={detailPartId === null || undefined}
                          onClick={() => {
                            setDetailPartId(null);
                            selectComponent(activeMachineId, null);
                            setCardPageIdx(0);
                            resetZoom();
                          }}
                        >
                          All
                        </button>
                        {(() => {
                          const maxVisible = 7;
                          let visibleParts = fleetParts;
                          if (fleetParts.length > maxVisible) {
                            const activeIdx = detailPartId ? fleetParts.findIndex((p) => p.id === detailPartId) : 0;
                            const start = Math.max(
                              0,
                              Math.min(activeIdx - Math.floor(maxVisible / 2), fleetParts.length - maxVisible),
                            );
                            visibleParts = fleetParts.slice(start, start + maxVisible);
                          }
                          return visibleParts.map((part) => {
                            const isActive = detailPartId === part.id;
                            const opt = partOptions.find((o) => o.id === part.id);
                            const badge = opt ? partBadge([opt]) : null;
                            return (
                              <button
                                key={part.id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                className="opc-pill-btn"
                                data-active={isActive || undefined}
                                title={part.name}
                                onClick={() => {
                                  setDetailPartId(part.id);
                                  selectComponent(activeMachineId, part.id);
                                  setCardPageIdx(0);
                                  resetZoom();
                                }}
                              >
                                {badge && <span className="ph-unit-dot" data-tone={badge.tone} aria-hidden="true" />}
                                <span>{part.shortName}</span>
                                {badge && badge.health !== null && <span className="opc-app-count">{badge.health}%</span>}
                              </button>
                            );
                          });
                        })()}
                      </div>
                      {totalStepCount > 1 && (
                        <div className="opc-stepper" role="group" aria-label="Step through the parts">
                          <span className="opc-stepper-pos ast-num">
                            {currentStepDisplay}/{totalStepCount}
                          </span>
                          <button
                            type="button"
                            className="opc-step-btn"
                            onClick={() => stepSheet(-1)}
                            aria-label="Previous part"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            className="opc-step-btn"
                            onClick={() => stepSheet(1)}
                            aria-label="Next part"
                          >
                            ›
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="opc-pill-group" role="tablist" aria-label="Machines on the line">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={isFullLine}
                        className="opc-pill-btn"
                        data-active={isFullLine || undefined}
                        onClick={() => handleSelectUnitById(null)}
                      >
                        All
                      </button>
                      {factoryRollupUnits.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          role="tab"
                          aria-selected={!isFullLine && activeMachineId === u.id}
                          className="opc-pill-btn"
                          data-active={(!isFullLine && activeMachineId === u.id) || undefined}
                          onClick={() => {
                            if (u.secId) handleSelectPyroSection(u.secId);
                            else handleSelectUnitById(u.id);
                          }}
                        >
                          <span className="ph-unit-dot" data-tone={u.tone} aria-hidden="true" />
                          <span>{u.name}</span>
                          <span className="opc-app-count" title="Health score">{u.health !== null ? `${u.health}%` : "—"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="opc-stage-toggles">
                  {activeSheetId && <AlertPopupToggle control={popupControl} activeCount={viewAlertCount} />}
                  <div className="opc-zoom-group" role="group" aria-label="Drawing zoom">
                    <button
                      type="button"
                      className="opc-zoom-btn"
                      onClick={() => setZoom((z) => clampZoom(z - 0.15))}
                      aria-label="Zoom out"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="opc-zoom-btn opc-zoom-pct ast-num"
                      onClick={resetZoom}
                      title="Back to normal size"
                    >
                      {Math.round(zoom * 100)}%
                    </button>
                    <button
                      type="button"
                      className="opc-zoom-btn"
                      onClick={() => setZoom((z) => clampZoom(z + 0.15))}
                      aria-label="Zoom in"
                    >
                      +
                    </button>
                    <button type="button" className="opc-zoom-btn" onClick={toggleFullscreen} aria-label="Full screen" title="Full screen (press Esc to leave)">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
                        <path d="M1 4.5V1h3.5M7.5 1H11v3.5M11 7.5V11H7.5M4.5 11H1V7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* ============================================================
                  NAVBAR 3 (`.opc-context-bar` — Temporary Contextual Navbar):
                  Appears on the Machine 2D view so the machine/sub-assembly
                  health summary and all direct popup (`↗`) & page-link (`→`)
                  buttons fit comfortably across their own row without clipping.
                  ============================================================ */}
              {/* Full line: the plant's status and the page toggle (pages open on the machine needing attention). */}
              {isFullLine && !focusMachine && (
                <PlantStatusBar
                  label="Full line"
                  status={plantStatus}
                  active="overview"
                  onSelect={(page) => {
                    if (page !== "overview" && plantStatus.focusMachineId) onNavigateToMachine(plantStatus.focusMachineId, page);
                  }}
                />
              )}
              {!isFullLine && effectiveLayer === "machine" && (
                <div className="opc-context-bar" role="region" aria-label="Machine status, quick views and pages">
                  <div className="opc-context-left">
                    <div className="opc-subbar-summary">
                      <span
                        className="ph-unit-dot"
                        data-tone={componentRollup ? componentRollup.tone : conditionTone(conditionLabel)}
                        aria-hidden="true"
                      />
                      <span className="opc-tag-bar-id">
                        {componentRollup ? componentRollup.scope.label : activeTabSpec.label}
                      </span>
                      <span
                        className="opc-tag-bar-val ast-num"
                        data-tone={componentRollup ? componentRollup.tone : conditionTone(conditionLabel)}
                      >
                        Health {stageHealth !== null ? `${stageHealth}%` : "—"}
                      </span>
                      {offNormalCount > 0 && (
                        <span className="opc-tag-bar-band ast-num">
                          {offNormalCount} {offNormalCount === 1 ? "sensor" : "sensors"} out of range
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="opc-context-right">
                    <div className="opc-pill-group opc-subassembly-pills" role="group" aria-label="Quick views">
                      {showSubassemblies && (
                        <button
                          type="button"
                          className="opc-pill-btn"
                          onClick={() => setActiveDetailModal("subassemblies")}
                        >
                          {levelWord(digestGroups.level, true)} ({digestGroups.rows.length}) ↗
                        </button>
                      )}
                      {showOperating && (
                        <button
                          type="button"
                          className="opc-pill-btn"
                          onClick={() => setActiveDetailModal("operating")}
                        >
                          Running conditions ↗
                        </button>
                      )}
                      {showAreas && (
                        <button
                          type="button"
                          className="opc-pill-btn"
                          onClick={() => setActiveDetailModal("areas")}
                        >
                          Areas ↗
                        </button>
                      )}
                      {hasShell && (
                        <button
                          type="button"
                          className="opc-pill-btn"
                          onClick={() => setActiveDetailModal("thermal")}
                        >
                          Shell temperature ↗
                        </button>
                      )}
                      <button
                        type="button"
                        className="opc-pill-btn"
                        onClick={() => setActiveDetailModal("trends")}
                      >
                        Trends ↗
                      </button>
                      <button
                        type="button"
                        className="opc-pill-btn"
                        onClick={() => setActiveDetailModal("rack")}
                      >
                        Rack ↗
                      </button>
                    </div>

                    <span className="opc-bar-sep" aria-hidden="true" />

                    {/* Row 2 (shared with Assets): Overview is this view, the other pages open in Assets. */}
                    <MachinePageToggle
                      alarms={digestFindings.active.length}
                      active="overview"
                      onSelect={(page) => page !== "overview" && selectLayer(page)}
                    />
                  </div>
                </div>
              )}

                <div className="opc-stage mx-canvas">
                  <div
                    className="opc-integrated"
                    data-no-sensor-rail="true"
                    data-full-stage={(!showAlarmRail && effectiveLayer === "overview") || undefined}
                  >
                    <div className="opc-center-stage">
                      <div ref={diagramPaneRef} className={`opc-diagram-pane${paneFullscreen ? " mx-canvas" : ""}`}>
                    {paneFullscreen && (
                      <button type="button" className="opc-fullscreen-exit" onClick={toggleFullscreen} aria-label="Leave full screen">
                        Exit full screen
                      </button>
                    )}

                    {activeSheetId ? (
                      <SheetMimicCanvas
                        sheetId={activeSheetId}
                        pointLabelMode={pointLabelMode}
                        selectedTag={selectedTag}
                        onSelectTag={toggleTag}
                        resolveTag={resolveTag}
                        zoom={zoom}
                        pan={pan}
                        onChangeZoom={(z) => setZoom(clampZoom(z))}
                        onChangePan={setPan}
                        onResetView={resetZoom}
                        unitName={(mId) => plantCatalog.find((m) => m.id === mId)?.name}
                        unitTone={(mId) => factoryRollupUnits.find((u) => u.id === mId)?.tone}
                        onSelectUnit={setQuickLookId}
                        alerts={alerts}
                        alertPopups={popupControl}
                        lineMachineOf={(mId) => {
                          const u = factoryRollupUnits.find((x) => x.id === mId);
                          return u ? { name: u.name, health: u.health, tone: u.tone } : null;
                        }}
                        linePartOf={(mId, sub) => {
                          const cell = fleet[mId]?.frame?.subs[sub];
                          if (!cell) return null;
                          const tone: Tone = cell.status === "Critical" ? "bad" : cell.status === "Alert" ? "warn" : "good";
                          return { name: displayName(cell.name), health: Math.round(cell.health), tone };
                        }}
                        onSelectPart={(machineId, subId) => setPartLook({ machineId, subId })}
                      />
                    ) : (
                      <KilnFleetMimicCanvas
                        machineId={activeMachineId}
                        machine={activeCatalogRecord}
                        part={activePart}
                        pointLabelMode={pointLabelMode}
                        selectedTag={selectedTag}
                        onSelectTag={toggleTag}
                        resolveTag={resolveTag}
                        zoom={zoom}
                        pan={pan}
                        onChangeZoom={(z) => setZoom(clampZoom(z))}
                        onChangePan={setPan}
                        onResetView={resetZoom}
                      />
                    )}
                  </div>
                </div>

                {/* Right-hand sidebar: latched alarm list */}
                {showAlarmRail && (
                  <OperatorAlarmLog
                    alarms={sidebarAlarms}
                    onDiagnose={(machineId) => navigateWithinConsole(machineId, "diagnosis")}
                  />
                )}
              </div>
            </div>
            </>
          )}
        </div>
      </div>

      {/* ====================================================================
          CONTEXTUAL DETAIL POPUP MODAL
          Opens supporting views (Sub-assemblies, Operating Point, Status by Area,
          Shell Thermal, Multi-Tag Trends, DAQ Rack, Simulation) or quick-peeks
          any of the 7 layers without leaving the current layer
          ==================================================================== */}
      {partLook && plantCatalog.find((m) => m.id === partLook.machineId) && (
        <ComponentQuickLook
          machine={plantCatalog.find((m) => m.id === partLook.machineId) as AssetMachine}
          subId={partLook.subId}
          onClose={() => setPartLook(null)}
          onOpenMachine={() => {
            const id = partLook.machineId;
            setPartLook(null);
            setQuickLookId(id);
          }}
          onOpenPage={(page) => {
            const { machineId: id, subId } = partLook;
            setPartLook(null);
            // The component's pages: Diagnosis / Prognosis / Analysis / Sensors filtered to it.
            selectComponent(id, subId);
            onNavigateToMachine(id, page);
          }}
          onOpenSheet={(sheetId) => {
            const id = partLook.machineId;
            setPartLook(null);
            try {
              sessionStorage.setItem(LINE_SHEET_FOCUS_KEY, sheetId);
            } catch {
              /* storage unavailable */
            }
            const sec = machineToSection[id];
            if (sec) handleSelectPyroSection(sec);
            else navigateWithinConsole(id, "machine");
          }}
        />
      )}

      {quickLookId && plantCatalog.find((m) => m.id === quickLookId) && (
        <MachineQuickLook
          machine={plantCatalog.find((m) => m.id === quickLookId) as AssetMachine}
          onClose={() => setQuickLookId(null)}
          onOpenPage={(page) => {
            setQuickLookId(null);
            onNavigateToMachine(quickLookId, page);
          }}
          onOpenOperator={() => {
            setQuickLookId(null);
            // handleSelectPyroSection already opens the machine layer; a following
            // selectLayer("machine") would read the stale "line" section and jump to lastPyroUnit.
            const sec = machineToSection[quickLookId];
            if (sec) handleSelectPyroSection(sec);
            else navigateWithinConsole(quickLookId, "machine");
          }}
        />
      )}

      {activeDetailModal && (
        <div
          className="opc-trend-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Detail view"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveDetailModal(null);
          }}
        >
          <div className="opc-detail-modal">
            <div className="opc-detail-modal-head">
              <div className="opc-detail-modal-title-wrap">
                <strong className="opc-detail-modal-title">
                  {activeDetailModal === "subassemblies" && `Health of each ${levelWord(digestGroups.level).toLowerCase()}`}
                  {activeDetailModal === "operating" && "Running conditions and their normal ranges"}
                  {activeDetailModal === "areas" && "Condition by area"}
                  {activeDetailModal === "sensors" && "Sensors and their live readings"}
                  {activeDetailModal === "diagnosis" && "What is wrong now"}
                  {activeDetailModal === "prognosis" && "What may fail next, and when"}
                  {activeDetailModal === "analysis" && "Why problems are happening"}
                  {activeDetailModal === "thermal" && "Kiln shell temperature along its length"}
                  {activeDetailModal === "trends" && "Sensor readings over time"}
                  {activeDetailModal === "rack" && "Where each sensor is wired in"}
                  {activeDetailModal === "simulation" && "Practice faults"}
                </strong>
                <span className="opc-detail-modal-scope">
                  <span
                    className="ph-unit-dot"
                    data-tone={componentRollup ? componentRollup.tone : conditionTone(conditionLabel)}
                    aria-hidden="true"
                  />
                  <span>{activeScopeBadgeText}</span>
                </span>
              </div>

              <div className="opc-detail-modal-actions">
                {(activeDetailModal === "subassemblies" ||
                  activeDetailModal === "operating" ||
                  activeDetailModal === "areas") && (
                  <div className="opc-pill-group" role="tablist" aria-label="Machine summary views">
                    {showSubassemblies && (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeDetailModal === "subassemblies"}
                        className="opc-pill-btn"
                        data-active={activeDetailModal === "subassemblies" || undefined}
                        onClick={() => setActiveDetailModal("subassemblies")}
                      >
                        {levelWord(digestGroups.level, true)} ({digestGroups.rows.length})
                      </button>
                    )}
                    {showOperating && (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeDetailModal === "operating"}
                        className="opc-pill-btn"
                        data-active={activeDetailModal === "operating" || undefined}
                        onClick={() => setActiveDetailModal("operating")}
                      >
                        Running conditions ({digest.operating.rows.length})
                      </button>
                    )}
                    {showAreas && (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeDetailModal === "areas"}
                        className="opc-pill-btn"
                        data-active={activeDetailModal === "areas" || undefined}
                        onClick={() => setActiveDetailModal("areas")}
                      >
                        Areas
                      </button>
                    )}
                  </div>
                )}

                {(activeDetailModal === "sensors" ||
                  activeDetailModal === "diagnosis" ||
                  activeDetailModal === "prognosis" ||
                  activeDetailModal === "analysis") && (
                  <PillButton
                    variant="secondary"
                    className="opc-next-layer-cta"
                    onClick={() => {
                      const target = activeDetailModal;
                      setActiveDetailModal(null);
                      selectLayer(target);
                    }}
                  >
                    Open full page →
                  </PillButton>
                )}

                <PillButton
                  variant="secondary"
                  onClick={() => setActiveDetailModal(null)}
                >
                  Close ×
                </PillButton>
              </div>
            </div>

            <div className="opc-detail-modal-body assets-machine-workspace">
              {activeDetailModal === "subassemblies" && showSubassemblies && (
                <div className="pg-ov-body">
                  <Section id="ov-subassemblies" title={`${levelWord(digestGroups.level, true)} (${digestGroups.rows.length})`}>
                    <UnifiedGroupList
                      d={digest}
                      cap={conditionLabel}
                      focusGroup={focusGroup}
                      setFocusGroup={(gId) => {
                        handleSelectGroupFromTable(gId);
                        setActiveDetailModal(null);
                      }}
                      onDrillLayer={(group, targetPage) => {
                        const matchingRule = activeFrame?.rules.find((r) =>
                          group.tags.some((t) => r.evidence.includes(t) || r.logic.includes(t)),
                        );
                        focusLayer({
                          ruleId: matchingRule?.id ?? null,
                          component: group.name,
                          tag: group.tags[0] ?? null,
                        });
                        if (fleetParts.some((p) => p.id === group.id)) {
                          setDetailPartId(group.id);
                        } else if (unitSheets.length > 0) {
                          const targetSheet = lineSheetsForTags(group.tags).find((id) =>
                            unitSheets.some((s) => s.id === id),
                          );
                          if (targetSheet && LINE_SHEET_BY_ID[targetSheet]?.kind !== "overview") {
                            setDetailSheetId(targetSheet);
                          }
                        }
                        setActiveDetailModal(null);
                        routeSubPage(targetPage);
                      }}
                    />
                  </Section>
                </div>
              )}

              {activeDetailModal === "operating" && showOperating && (
                <div className="pg-ov-body">
                  <OvOperatingSection
                    machine={activeCatalogMachine}
                    d={digest}
                    go={(page) => {
                      setActiveDetailModal(null);
                      navigateWithinConsole(activeMachineId, page);
                    }}
                  />
                </div>
              )}

              {activeDetailModal === "areas" && showAreas && (
                <div className="pg-ov-body">
                  <KpiStrip page items={kpis} label="Main numbers" />
                  <OvAreasSection
                    machine={activeCatalogMachine}
                    d={digest}
                    go={(page) => {
                      setActiveDetailModal(null);
                      navigateWithinConsole(activeMachineId, page);
                    }}
                  />
                </div>
              )}

              {activeDetailModal === "sensors" && (
                <MachineSensorMappingView
                  machine={activeCatalogMachine}
                  simulation={kilnSimulation}
                  onNavigateToHealth={() => {
                    setActiveDetailModal(null);
                    selectLayer("diagnosis");
                  }}
                  onNavigateToDiagnosis={() => {
                    setActiveDetailModal(null);
                    selectLayer("diagnosis");
                  }}
                  onNavigateToTrends={() => setActiveDetailModal("trends")}
                  onSelectSensor={(tag) => openSensorTrendPopup(tag)}
                  externalScope={
                    activeComponentScope
                      ? {
                          id: activeComponentScope.id,
                          label: activeComponentScope.label,
                          tags: activeComponentScope.tags,
                        }
                      : null
                  }
                />
              )}

              {activeDetailModal === "diagnosis" && (
                <DiagnosisView
                  key={activeCatalogMachine.id}
                  machine={activeCatalogMachine}
                  externalScope={activeComponentScope}
                  onNavigateToTrends={() => setActiveDetailModal("trends")}
                  onNavigateToAnalysis={() => {
                    setActiveDetailModal(null);
                    selectLayer("analysis");
                  }}
                  onNavigateToPrognosis={() => {
                    setActiveDetailModal(null);
                    selectLayer("prognosis");
                  }}
                />
              )}

              {activeDetailModal === "prognosis" && (
                <MachinePrognosisPage
                  key={`prog-${activeCatalogMachine.id}`}
                  machine={activeCatalogMachine}
                  onNavigateToDiagnosis={() => {
                    setActiveDetailModal(null);
                    selectLayer("diagnosis");
                  }}
                  onNavigateToAnalysis={() => {
                    setActiveDetailModal(null);
                    selectLayer("analysis");
                  }}
                  onNavigateToSensors={() => {
                    setActiveDetailModal(null);
                    selectLayer("sensors");
                  }}
                  onNavigateToTrends={() => setActiveDetailModal("trends")}
                  onNavigateToOverview={() => {
                    setActiveDetailModal(null);
                    selectLayer("machine");
                  }}
                />
              )}

              {activeDetailModal === "analysis" && (
                <MachineAnalysisPage
                  key={activeCatalogMachine.id}
                  machine={activeCatalogMachine}
                  onNavigateToDiagnosis={() => {
                    setActiveDetailModal(null);
                    selectLayer("diagnosis");
                  }}
                  onNavigateToPrognosis={() => {
                    setActiveDetailModal(null);
                    selectLayer("prognosis");
                  }}
                  onNavigateToSensors={() => {
                    setActiveDetailModal(null);
                    selectLayer("sensors");
                  }}
                  onNavigateToTrends={() => setActiveDetailModal("trends")}
                  onNavigateToOverview={() => {
                    setActiveDetailModal(null);
                    selectLayer("machine");
                  }}
                />
              )}

              {activeDetailModal === "thermal" && hasShell && (
                <ThermalView machine={activeCatalogMachine} />
              )}

              {activeDetailModal === "trends" && (
                <TrendsView
                  key={activeCatalogMachine.id}
                  machine={activeCatalogMachine}
                  simulation={kilnSimulation}
                  onNavigateToSensors={() => {
                    setActiveDetailModal(null);
                    selectLayer("sensors");
                  }}
                  onNavigateToDiagnosis={() => {
                    setActiveDetailModal(null);
                    selectLayer("diagnosis");
                  }}
                />
              )}

              {activeDetailModal === "rack" && (
                <MachineRackTab
                  key={activeCatalogMachine.id}
                  machine={activeCatalogMachine}
                  simulation={kilnSimulation}
                />
              )}

              {activeDetailModal === "simulation" && (
                <SimulationView simulation={kilnSimulation ?? null} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          GLOBAL UNIFIED SENSOR INSPECTOR MODAL (Accessible from any Lens/Page)
          Shows Live Value, Rate of Change, Interactive Multi-Window Trend,
          Component Mapping, Thresholds, DAQ Rack/Slot & Diagnosis/Prognosis Links
          ==================================================================== */}
      {trendModalSignal && (
        <div
          className="opc-trend-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`${displayName(trendModalSignal.name)} sensor details`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setTrendModalTag(null);
          }}
        >
          <div className="opc-trend-modal opc-unified-inspector-modal">
            <OperatorTrendPanel
              signal={trendModalSignal}
              windowMin={rateWindowMin}
              onWindowChange={setRateWindowMin}
              expanded
              onLocate={locateTag}
              onClose={() => setTrendModalTag(null)}
            />

            <div className="opc-inspector-footer">
              {/* Column 1: Sensor Mapping, Component & Thresholds */}
              <div className="opc-inspector-card">
                <div className="opc-inspector-card-title">Where it is and its limits</div>
                <div className="opc-inspector-kv-list">
                  <div className="opc-inspector-kv">
                    <span>Machine</span>
                    <strong>
                      {contextMachines?.find((m) => m.id === (trendModalSignal.ownerId ?? activeMachineId))?.name ??
                        activeCatalogMachine.name}
                    </strong>
                  </div>
                  <div className="opc-inspector-kv">
                    <span>Part</span>
                    {trendModalSheetId ? (
                      <button
                        type="button"
                        className="opc-inline-tag-link"
                        onClick={() => {
                          setDetailSheetId(trendModalSheetId);
                          setTrendModalTag(null);
                        }}
                      >
                        {sheetProperName(trendModalSheetId, false)} ↗
                      </button>
                    ) : (
                      <strong>{trendModalDetail?.subAssembly || trendModalDetail?.component || "Whole machine"}</strong>
                    )}
                  </div>
                  <div className="opc-inspector-kv">
                    <span>Normal range</span>
                    <strong>{trendModalSignal.normalBand}</strong>
                  </div>
                  <div className="opc-inspector-kv">
                    <span>Warning at</span>
                    <strong>{trendModalDetail?.warningThreshold || "—"}</strong>
                  </div>
                  <div className="opc-inspector-kv">
                    <span>Alarm at</span>
                    <strong>{trendModalDetail?.alarmThreshold || "—"}</strong>
                  </div>
                  <div className="opc-inspector-kv">
                    <span>Gap from expected</span>
                    <strong>{trendModalSignal.residualDisplay}</strong>
                  </div>
                  <div className="opc-inspector-kv">
                    <span>Time to limit</span>
                    <strong>{trendModalSignal.timeToLimit}</strong>
                  </div>
                </div>
              </div>

              {/* Column 2: DAQ Hardware & Signal Chain */}
              <div className="opc-inspector-card">
                <div className="opc-inspector-card-title">How the sensor is wired in</div>
                <div className="opc-inspector-kv-list">
                  <div className="opc-inspector-kv">
                    <span>Input rack</span>
                    <strong>{trendModalDetail?.rackId || "—"}</strong>
                  </div>
                  <div className="opc-inspector-kv">
                    <span>Input card</span>
                    <strong>{trendModalDetail?.cardId || "—"}</strong>
                  </div>
                  <div className="opc-inspector-kv">
                    <span>Sensor type</span>
                    <strong>{trendModalDetail?.sensorType || "—"}</strong>
                  </div>
                  <div className="opc-inspector-kv">
                    <span>Read rate</span>
                    <strong>{trendModalDetail?.sampleRate || "—"}</strong>
                  </div>
                  <div className="opc-inspector-kv">
                    <span>Reading quality</span>
                    <strong data-tone={trendModalSignal.available ? "good" : "warn"}>
                      {trendModalSignal.available ? "Good, live" : "No live reading"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Column 3: Connected Diagnosis, Root Cause, Prognosis & Navigation */}
              <div className="opc-inspector-card">
                <div className="opc-inspector-card-title">Problems linked to this sensor</div>
                <div className="opc-inspector-rules">
                  {trendModalRules.length > 0 ? (
                    trendModalRules.slice(0, 2).map((r) => (
                      <div key={r.id} className="opc-inspector-rule-pill" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span
                            className="ph-unit-dot"
                            data-tone={r.severity === "Critical" ? "bad" : r.severity === "Alert" ? "warn" : "good"}
                            aria-hidden="true"
                          />
                          <span>
                            <strong title={r.plainTitle ? r.name : undefined}>{r.plainTitle ?? r.name}</strong> ({r.status === "ACTIVE" ? "confirmed" : r.status === "PENDING" ? "being checked" : "not active"})
                          </span>
                        </span>
                        <span style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            type="button"
                            className="opc-inline-tag-link"
                            onClick={() => {
                              focusLayer({
                                ruleId: r.id,
                                component: trendModalDetail?.subAssembly || trendModalDetail?.component || null,
                                tag: trendModalSignal.tag,
                              });
                              setTrendModalTag(null);
                              selectLayer("analysis");
                            }}
                          >
                            Why →
                          </button>
                          <button
                            type="button"
                            className="opc-inline-tag-link"
                            onClick={() => {
                              focusLayer({
                                ruleId: r.id,
                                component: trendModalDetail?.subAssembly || trendModalDetail?.component || null,
                                tag: trendModalSignal.tag,
                              });
                              setTrendModalTag(null);
                              selectLayer("prognosis");
                            }}
                          >
                            Time left →
                          </button>
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="opc-inspector-rule-pill">
                      <span className="ph-unit-dot" data-tone={trendModalSignal.tone} aria-hidden="true" />
                      <span>
                        Status: <strong>{trendModalSignal.status}</strong>
                        {!trendModalSignal.isState && trendModalSignal.rocMinDisplay !== "—" && <> · changing {trendModalSignal.rocMinDisplay}</>}
                      </span>
                    </div>
                  )}
                </div>
                <div className="opc-inspector-actions">
                  <PillButton
                    variant="secondary"
                    className="opc-next-layer-cta"
                    onClick={() => {
                      focusSensorOn("sensors", trendModalSignal.tag);
                      setTrendModalTag(null);
                      selectLayer("sensors");
                    }}
                  >
                    Sensors →
                  </PillButton>
                  <PillButton
                    variant="secondary"
                    onClick={() => {
                      focusLayer({
                        ruleId: trendModalRules[0]?.id ?? null,
                        component: trendModalDetail?.subAssembly || trendModalDetail?.component || null,
                        tag: trendModalSignal.tag,
                      });
                      setTrendModalTag(null);
                      selectLayer("diagnosis");
                    }}
                  >
                    Diagnosis →
                  </PillButton>
                  <PillButton
                    variant="secondary"
                    onClick={() => {
                      focusLayer({
                        ruleId: trendModalRules[0]?.id ?? null,
                        component: trendModalDetail?.subAssembly || trendModalDetail?.component || null,
                        tag: trendModalSignal.tag,
                      });
                      setTrendModalTag(null);
                      selectLayer("prognosis");
                    }}
                  >
                    Prognosis →
                  </PillButton>
                  <PillButton
                    variant="secondary"
                    onClick={() => {
                      focusLayer({
                        ruleId: trendModalRules[0]?.id ?? null,
                        component: trendModalDetail?.subAssembly || trendModalDetail?.component || null,
                        tag: trendModalSignal.tag,
                      });
                      setTrendModalTag(null);
                      selectLayer("analysis");
                    }}
                  >
                    Analysis →
                  </PillButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Sub-assembly List (Shared between Operator View & Machine Overview)
   ========================================================================== */

function UnifiedGroupList({
  d,
  cap,
  focusGroup,
  setFocusGroup,
  onDrillLayer,
}: {
  d: OverviewDigest;
  cap: string;
  focusGroup: string | null;
  setFocusGroup: (id: string | null) => void;
  onDrillLayer?: (group: OverviewDigest["sortedGroups"][number], targetPage: AssetsSubPage) => void;
}) {
  const { groups, sortedGroups, statusByTag } = d;
  const listRef = useRef<HTMLDivElement>(null);
  const focusable = useMemo(() => sortedGroups.filter((g) => g.tags.length > 0), [sortedGroups]);
  const activeIdx = focusGroup ? focusable.findIndex((g) => g.id === focusGroup) : -1;

  const stepGroup = (delta: number) => {
    if (focusable.length === 0) return;
    let nextId: string | null;
    if (activeIdx === -1) {
      nextId = delta > 0 ? focusable[0].id : focusable[focusable.length - 1].id;
    } else {
      const next = activeIdx + delta;
      if (next < 0 || next >= focusable.length) nextId = null;
      else nextId = focusable[next].id;
    }
    setFocusGroup(nextId);
    if (nextId && listRef.current) {
      const row = listRef.current.querySelector<HTMLElement>(`[data-group-id="${CSS.escape(nextId)}"]`);
      row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };

  if (groups.rows.length === 0) return null;
  return (
    <div ref={listRef} className="pg-ov-groups">
      <table className="pg-ov-table pg-ov-groups-table">
        <thead>
          <tr>
            <th scope="col">
              <span className="pg-ov-groups-th">
                <span>{levelWord(groups.level)}</span>
                {focusable.length > 1 && (
                  <span className="pg-ov-stepper" role="group" aria-label={`Step through ${levelWord(groups.level, true).toLowerCase()}`}>
                    {focusGroup && (
                      <button
                        type="button"
                        className="pg-ov-step-reset"
                        onClick={() => setFocusGroup(null)}
                        title="Show whole machine"
                      >
                        All
                      </button>
                    )}
                    <span className="pg-ov-stepper-pos ast-num">
                      {activeIdx >= 0 ? `${activeIdx + 1}/${focusable.length}` : `${focusable.length}`}
                    </span>
                    <button
                      type="button"
                      className="pg-ov-step-btn"
                      onClick={() => stepGroup(-1)}
                      aria-label={`Previous ${levelWord(groups.level).toLowerCase()}`}
                      title={`Previous ${levelWord(groups.level).toLowerCase()}`}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="pg-ov-step-btn"
                      onClick={() => stepGroup(1)}
                      aria-label={`Next ${levelWord(groups.level).toLowerCase()}`}
                      title={`Next ${levelWord(groups.level).toLowerCase()}`}
                    >
                      ›
                    </button>
                  </span>
                )}
              </span>
            </th>
            <th scope="col" className="pg-ov-num">Health</th>
            {onDrillLayer && <th scope="col" className="pg-ov-num">Open</th>}
          </tr>
        </thead>
        <tbody>
          {sortedGroups.map((g) => {
            const off = g.tags.filter((t) => (statusByTag.get(t) ?? "Normal") !== "Normal").length;
            const status =
              worstCondition([g.status]) === "Critical" && toCondition(cap) !== "Critical"
                ? toCondition(cap)
                : toCondition(g.status);
            const alert = status === "Alert" || status === "Critical";
            const t: Tone = alert ? conditionTone(status) : "idle";
            const canFocus = g.tags.length > 0;
            const active = focusGroup === g.id;
            return (
              <tr
                key={g.id}
                data-group-id={g.id}
                className="pg-ov-row"
                data-active={active || undefined}
                tabIndex={canFocus ? 0 : undefined}
                aria-pressed={canFocus ? active : undefined}
                onClick={() => canFocus && setFocusGroup(active ? null : g.id)}
                onKeyDown={(e) => {
                  if (canFocus && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setFocusGroup(active ? null : g.id);
                  }
                }}
              >
                <td>
                  <span className="pg-ov-group-name">
                    <span className="pg-ov-state" data-tone={alert ? t : undefined}>
                      <i aria-hidden="true" />
                    </span>
                    <span className="pg-ov-item-text">
                      <span className="pg-ov-item-name" title={g.name}>
                        {g.name}
                      </span>
                      {(g.parent !== g.name || off > 0) && (
                        <span className="pg-ov-item-meta">
                          {[g.parent !== g.name ? g.parent : null, off ? `${off} ${off === 1 ? "sensor" : "sensors"} out of range` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td className="pg-ov-num">
                  <span className="pg-ov-health ast-num" data-tone={alert ? t : undefined}>
                    <span>
                      {g.health}
                      <span className="ast-unit">%</span>
                    </span>
                    <span className="pg-ov-bar" aria-hidden="true">
                      <i style={{ width: `${Math.max(0, Math.min(100, g.health))}%` }} />
                    </span>
                  </span>
                </td>
                {onDrillLayer && (
                  <td className="pg-ov-num" onClick={(e) => e.stopPropagation()}>
                    <span style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="opc-inline-tag-link"
                        onClick={() => onDrillLayer(g, "diagnosis")}
                      >
                        What is wrong
                      </button>
                      <button
                        type="button"
                        className="opc-inline-tag-link"
                        onClick={() => onDrillLayer(g, "analysis")}
                      >
                        Why
                      </button>
                      <button
                        type="button"
                        className="opc-inline-tag-link"
                        onClick={() => onDrillLayer(g, "prognosis")}
                      >
                        What next
                      </button>
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ==========================================================================
   2D Sheet Mimic Canvas with Live Sensor Value Callout Cards Next to Points
   ========================================================================== */

/** What a point's value block shows: its control-room label (full name in tag-value mode), value, set-point and run state. */
function pillContentOf(res: ResolvedTag, mode: PointLabelMode): PillContent {
  return {
    label: mode === "tag-value" ? displayName(res.name) : res.short,
    value: `${res.display}${res.available && res.unit ? ` ${res.unit}` : ""}`,
    sp: res.sp ? `${res.sp}` : null,
    run: res.run,
  };
}

/** One value block for several points (the sheet's `averages`): their mean, the worst member status, the members' mean trend. */
function averageResolved(key: string, label: string, members: ResolvedTag[]): ResolvedTag {
  const live = members.filter((m) => m.available && m.numValue !== null);
  const first = members[0];
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const dec = live.length ? Math.max(...live.map((m) => (m.display.split(".")[1] ?? "").match(/^\d*/)![0].length)) : 0;
  const status = members.some((m) => m.status === "Critical") ? "Critical" : members.some((m) => m.status === "Alert") ? "Alert" : "Normal";
  const n = live.length ? Math.min(...live.map((m) => m.history.length)) : 0;
  const history = Array.from({ length: n }, (_, i) => mean(live.map((m) => m.history[m.history.length - n + i])));
  const ns = live.length ? Math.min(...live.map((m) => m.samples.length)) : 0;
  const samples = Array.from({ length: ns }, (_, i) => {
    const at = live.map((m) => m.samples[m.samples.length - ns + i]);
    return { t: at[0].t, value: mean(at.map((x) => x.value)) };
  });
  const value = live.length ? mean(live.map((m) => m.numValue!)) : null;
  const rocPerMin = live.length ? mean(live.map((m) => m.rocPerMin)) : 0;
  const sign = rocPerMin > 0 ? "+" : rocPerMin < 0 ? "−" : "";
  return {
    ...first,
    tag: key,
    available: live.length > 0,
    name: `${first.name.replace(/\s*\d+\s*(\(.*\))?$/, "")}s, average of ${members.length}`,
    display: value === null ? "—" : value.toFixed(dec),
    numValue: value,
    status,
    tone: !live.length ? "idle" : status === "Critical" ? "bad" : status === "Alert" ? "warn" : "good",
    history,
    samples,
    modelSamples: [],
    minVal: history.length ? Math.min(...history) : NaN,
    maxVal: history.length ? Math.max(...history) : NaN,
    deltaWindow: history.length > 1 ? history.at(-1)! - history[0] : 0,
    rocPerMin,
    rocPerHour: rocPerMin * 60,
    rocMinDisplay: live.length && live.every((m) => m.rocMinDisplay !== "—") ? `${sign}${Math.abs(rocPerMin).toFixed(Math.max(1, dec))} ${first.unit ? `${first.unit}/min` : "/min"}` : "—",
    rocHourDisplay: live.length && live.every((m) => m.rocHourDisplay !== "—") ? `${sign}${Math.abs(rocPerMin * 60).toFixed(Math.max(1, dec))} ${first.unit ? `${first.unit}/h` : "/h"}` : "—",
    short: label,
    sp: null,
    run: null,
  };
}

const NO_CLOSED: ReadonlySet<string> = new Set();

function SheetMimicCanvas({
  sheetId,
  pointLabelMode,
  selectedTag,
  onSelectTag,
  resolveTag: resolveMember,
  zoom,
  pan,
  onChangeZoom,
  onChangePan,
  onResetView,
  onSelectUnit,
  unitName,
  unitTone,
  lineMachineOf,
  linePartOf,
  onSelectPart,
  alerts,
  alertPopups,
}: {
  sheetId: string;
  pointLabelMode: PointLabelMode;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  resolveTag: (tag: string) => ResolvedTag;
  zoom: number;
  pan: { x: number; y: number };
  onChangeZoom: (z: number) => void;
  onChangePan: (p: { x: number; y: number }) => void;
  onResetView: () => void;
  onSelectUnit: (machineId: string) => void;
  /** Database name of a machine the line sheet links to. */
  unitName?: (machineId: string) => string | undefined;
  /** Condition of a machine on the line sheet (the Full line chips' tone); shades its drawing. */
  unitTone?: (machineId: string) => Tone | undefined;
  /** Line sheet: name and health of a machine (its chip) and of a sub-assembly (its badge). */
  lineMachineOf?: (machineId: string) => LineHealthCell | null;
  linePartOf?: (machineId: string, subId: string) => LineHealthCell | null;
  /** Line sheet: a sub-assembly badge was clicked. */
  onSelectPart?: (machineId: string, subId: string) => void;
  /** Active alerts of the plant: each is pinned as a popup where it is raised on this sheet. */
  alerts?: HomeAlert[];
  /** The operator's message choices (all on/off, closed ones); without it every message shows. */
  alertPopups?: AlertPopupControl;
}) {
  const art = LINE_SHEET_ART[sheetId];
  const meta = LINE_SHEET_BY_ID[sheetId];
  const [hoverTag, setHoverTag] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const dragRef = React.useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const sheetTags = useMemo(() => lineSheetTags(sheetId), [sheetId]);
  const { box, measure } = useSheetBox(sheetId, false);

  const artBox = useMemo<[number, number, number, number]>(
    () => box ?? [0, 0, art?.width ?? 824, art?.height ?? 704],
    [box, art],
  );

  const activePads = useMemo(() => art?.pads ?? {}, [art]);

  // Points the sheet averages into one block: the block replaces its members in the member's sheet order.
  const averages = art?.averages;
  const blockOf = useMemo(
    () => new Map(Object.entries(averages ?? {}).flatMap(([key, a]) => a.tags.map((t) => [t, key] as const))),
    [averages],
  );
  const visibleTags = useMemo(
    () => [...new Set(sheetTags.map((t) => blockOf.get(t) ?? t))].filter((t) => Boolean(activePads[t])),
    [sheetTags, blockOf, activePads],
  );
  const resolveTag = useCallback(
    (tag: string): ResolvedTag => {
      const a = averages?.[tag];
      return a ? averageResolved(tag, a.label, a.tags.map(resolveMember)) : resolveMember(tag);
    },
    [averages, resolveMember],
  );
  /** A block opens its first member; a member selected elsewhere lights its block. */
  const selectTag = (tag: string) => onSelectTag(averages?.[tag]?.tags[0] ?? tag);
  const selectedKey = selectedTag ? blockOf.get(selectedTag) ?? selectedTag : null;
  // Stage and part sheets with authored slots: readings embedded as plates on their pads, text at a readable on-screen size.
  const isStage = Boolean(art?.callouts) && meta?.kind !== "line";
  const [pxPerUnit, wrapRef, canvasAspect] = usePxPerUnit(artBox);
  const stageWidth = useCallback(
    (tag: string, sz: number) => pillContentWidth(pillContentOf(resolveTag(tag), pointLabelMode), sz),
    [resolveTag, pointLabelMode],
  );
  const stage = useStageLayout(art, isStage ? visibleTags : [], artBox, pxPerUnit, stageWidth, canvasAspect);
  const isDenseLine = visibleTags.length > 80 && !isStage;
  const isDetailSheet = meta?.kind === "detail";
  // The line sheet carries few points over a wide drawing: larger blocks, read across the room.
  const isLineSheet = meta?.kind === "line";
  const sm = stage.metrics;
  const fontSz = isStage ? sm.fontSz : isDetailSheet ? 15.5 : isDenseLine ? 7.8 : isLineSheet ? 10 : 8.6;
  const padW = isDetailSheet ? 22 : isDenseLine ? 10 : 14;
  const cardH = isDetailSheet ? 26.5 : isDenseLine ? 14.5 : isLineSheet ? 18 : 16;
  const padR = isStage ? sm.padR : isDetailSheet ? 7.5 : isDenseLine ? 4.5 : 5.5;
  const padScale = isStage ? sm.padScale : isDetailSheet ? 1.15 : isDenseLine ? 0.65 : 0.85;
  const cardRx = isStage ? sm.rx : isDetailSheet ? 6 : 4;
  const textDy = isStage ? sm.textDy : isDetailSheet ? 5.2 : isLineSheet ? 3.5 : 2.9;

  // Compute callout card positions directly on top of every mapped dot
  const auto = useMemo(() => {
    if (isStage) return null;
    return layoutSensorCallouts(
      visibleTags.map((tag) => {
        const content = pillContentOf(resolveTag(tag), pointLabelMode);
        return {
          tag,
          px: activePads[tag][0],
          py: activePads[tag][1],
          label: content.value,
          // The layout spaces pills by baseW: the drawn block, label and set-point included.
          w: pillContentWidth(content, fontSz) + padW,
          baseW: pillContentWidth(content, fontSz) + padW,
        };
      }),
      artBox,
      { cardH, padR, gapX: isDetailSheet ? 6 : 4, gapY: isDetailSheet ? 4.5 : 3 },
    );
  }, [isStage, visibleTags, activePads, artBox, resolveTag, pointLabelMode, fontSz, padW, cardH, padR, isDetailSheet]);
  const { callouts, viewBox: vb } = auto ?? stage;

  if (!art || !meta) return null;
  const Art = art.Art;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1 && e.button !== 1) return;
    if ((e.target as HTMLElement).closest("button, [role='button']")) return;
    setPanning(true);
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panning || !dragRef.current) return;
    onChangePan({
      x: dragRef.current.px + (e.clientX - dragRef.current.x),
      y: dragRef.current.py + (e.clientY - dragRef.current.y),
    });
  };

  const onPointerUp = () => {
    setPanning(false);
    dragRef.current = null;
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    const next = zoom + delta;
    onChangeZoom(next);
    if (Math.abs(next - 1) < 0.05) onChangePan({ x: 0, y: 0 });
  };

  const padLayer = callouts.map((c) => {
            const res = resolveTag(c.tag);
            const isSel = selectedKey === c.tag;
            const isHot = isSel || hoverTag === c.tag;
            return (
              <g
                key={`pad-${c.tag}`}
                role="button"
                tabIndex={0}
                aria-pressed={isSel}
                aria-label={`${displayName(res.name)}: ${res.display} ${res.unit}`}
                className="lsh-point"
                onClick={() => selectTag(c.tag)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectTag(c.tag);
                  }
                }}
                onPointerEnter={() => setHoverTag(c.tag)}
                onPointerLeave={() => setHoverTag((h) => (h === c.tag ? null : h))}
              >
                <title>{`${displayName(res.name)}: ${res.display} ${res.unit} (normal ${res.normalBand}; changing ${res.rocMinDisplay}) · ${averages?.[c.tag]?.tags.join(", ") ?? c.tag}`}</title>
                <g transform={`translate(${c.px} ${c.py})`}>
                  <circle r={isDenseLine ? 8 : isDetailSheet ? 14 : 10} fill="transparent" />
                  {res.available ? (
                    <MachinePad x={0} y={0} status={res.status} selected={isHot} scale={padScale} />
                  ) : (
                    <circle r={isDenseLine ? 3.2 : isDetailSheet ? 5.5 : 4.2} fill={MX.padPanel} stroke={MX.fine} strokeWidth={1.3} />
                  )}
                </g>
              </g>
            );
          });

  return (
    <div
      ref={wrapRef}
      className="opc-svg-wrap"
      data-stage={isStage || undefined}
      data-zoomed={zoom > 1 ? "true" : undefined}
      data-panning={panning ? "true" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={onResetView}
    >
      {measure}
      <div
        className="opc-svg-pan-layer"
        style={{
          transform: zoom !== 1 || pan.x !== 0 || pan.y !== 0 ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` : undefined,
        }}
      >
        <MachineSvg
          // The line sheet keeps its whole frame: machine chips sit in its margins.
          viewBox={(isLineSheet ? [0, 0, art.width, art.height] : vb).join(" ")}
          label={`${meta.title} (${sheetId})`}
          interactive
          cadFrame={false}
          autoFit={false}
        >
          <g aria-hidden="true">
            <Art />
          </g>

          {/* Condition wash only where the line sheet asks for it (the composed line shows health as dots instead). */}
          {meta.kind === "line" && unitTone && art.shades && <MachineHealthShade art={art} toneOf={unitTone} />}
          {/* Machines and components coloured by their own health (equipment only, under the dots). */}
          {meta.kind === "line" && lineMachineOf && linePartOf && art.partRegions && (
            <LineHealthTint art={art} machineOf={lineMachineOf} partOf={linePartOf} />
          )}

          {/* Clickable Unit Regions on PYR-0 */}
          {meta.kind === "line" && art.links && (
            <g>
              {Object.entries(art.links).map(([mId, [x, y, w, h]]) => {
                const unitLabel = unitName?.(mId) ?? mId;
                return (
                  <g
                    key={mId}
                    className="lsh-link"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open the ${unitLabel} summary`}
                    onClick={() => onSelectUnit(mId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectUnit(mId);
                      }
                    }}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx={8}
                      fill="transparent"
                      stroke="transparent"
                      className="lsh-link-hit"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* PYR-0 health: machine chips and sub-assembly badges, above the machine regions so their clicks win. */}
          {meta.kind === "line" && lineMachineOf && linePartOf && (
            <LineHealthLayer
              art={art}
              machineOf={lineMachineOf}
              partOf={linePartOf}
              onSelectMachine={onSelectUnit}
              onSelectPart={(mId, sub) => onSelectPart?.(mId, sub)}
            />
          )}

          {/* Sensor pads (stage sheets: on top of their embedded plates) */}
          {!isStage && padLayer}

          {/* Sensor Value Pills Directly On Top of Mapped Dots */}
          {[...callouts]
            .sort((a, b) => {
              const aHot = a.tag === hoverTag ? 2 : a.tag === selectedKey ? 1 : 0;
              const bHot = b.tag === hoverTag ? 2 : b.tag === selectedKey ? 1 : 0;
              return aHot - bHot;
            })
            .map((c) => {
            const res = resolveTag(c.tag);
            const isSel = selectedKey === c.tag;
            const isHot = isSel || hoverTag === c.tag;
            const showCard =
              isHot ||
              pointLabelMode === "value" ||
              pointLabelMode === "tag-value" ||
              (pointLabelMode === "alerts" && res.status !== "Normal");
            if (!showCard) return null;

            const leader = c.side ? null : isStage ? calloutElbowPath(c, padR - 1.5) : calloutLeaderPath(c, padR);

            return (
              <g
                key={`card-${c.tag}`}
                className="lsh-point"
                onClick={() => selectTag(c.tag)}
                onPointerEnter={() => setHoverTag(c.tag)}
                onPointerLeave={() => setHoverTag((h) => (h === c.tag ? null : h))}
              >
                <title>{`${displayName(res.name)}: ${res.display} ${res.unit} (normal ${res.normalBand}; changing ${res.rocMinDisplay}) · ${averages?.[c.tag]?.tags.join(", ") ?? c.tag}`}</title>
                {leader && (
                  <path
                    d={leader}
                    fill="none"
                    stroke={isHot ? "var(--dx-ink)" : MX.label}
                    // Stage sheets: a plate moved off busy equipment is tied to its pad by a leader you can follow on screen.
                    strokeWidth={isStage ? fontSz * 0.11 : isDetailSheet ? 1.1 : 0.85}
                    strokeLinejoin="round"
                    opacity={isHot ? 0.95 : isStage ? 0.8 : 0.6}
                  />
                )}
                <ValuePill
                  content={pillContentOf(res, pointLabelMode)}
                  cx={c.textCx ?? c.cx}
                  cy={c.cy}
                  w={c.w}
                  h={c.h}
                  frame={c.side ? { x: c.cx - c.w / 2, w: c.w } : undefined}
                  rx={cardRx}
                  fontSz={fontSz}
                  textDy={textDy}
                  tone={res.tone}
                  hot={isHot}
                  strokeW={isHot || res.tone !== "good" ? 1.35 : isDetailSheet ? 1.1 : 0.85}
                />
              </g>
            );
          })}
          {isStage && padLayer}

          {/* Alert popups over the component / sensor that raised them, above everything else. */}
          {alerts && alerts.length > 0 && (alertPopups?.show ?? true) && (
            <AlertPopupLayer
              closed={alertPopups?.closed ?? NO_CLOSED}
              onClose={(ids) => alertPopups?.close(ids)}
              alerts={alerts.filter((a) => !a.cleared)}
              art={art}
              line={isLineSheet}
              overview={meta.kind === "overview"}
              machines={meta.machines}
              pxPerUnit={pxPerUnit}
              viewBox={isLineSheet ? [0, 0, art.width, art.height] : vb}
              onOpen={({ machineId, sub, tag }) => {
                if (tag) onSelectTag(tag);
                else if (sub && onSelectPart) onSelectPart(machineId, sub);
                else onSelectUnit(machineId);
              }}
            />
          )}
        </MachineSvg>
      </div>
    </div>
  );
}

/* ==========================================================================
   Sensor Subpage Card (Supports 4 Lenses: Combined | Values | Trends | RoC)
   ========================================================================== */

function SensorSubpageCard({
  sig,
  lens,
  selected,
  onSelect,
}: {
  sig: ResolvedTag;
  lens: Exclude<TelemetryLensId, "alarms" | "curves">;
  selected: boolean;
  onSelect: () => void;
}) {
  const dirArrow = !sig.available ? null : sig.rocDir === "up" ? (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "-1px" }}>
      <path d="M5 8V2M2.5 4.5L5 2l2.5 2.5" />
    </svg>
  ) : sig.rocDir === "down" ? (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "-1px" }}>
      <path d="M5 2v6M2.5 5.5L5 8l2.5-2.5" />
    </svg>
  ) : (
    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "0px" }}>
      <circle cx="5" cy="5" r="2.2" />
    </svg>
  );
  const strokeColor =
    sig.tone === "bad"
      ? "var(--status-bad)"
      : sig.tone === "warn"
      ? "var(--status-warn)"
      : sig.tone === "idle" ? "var(--text-muted)" : "var(--status-good)";

  const sparkPath = useMemo(() => {
    const pts = sig.history;
    if (pts.length < 2) return "";
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = Math.max(max - min, 1e-4);
    const coords = pts.map((v, i) => ({
      x: 2 + (i / (pts.length - 1)) * 136,
      y: 18 - ((v - min) / span) * 14,
    }));
    return smoothPath(coords);
  }, [sig.history]);

  if (lens === "values") {
    return (
      <button
        type="button"
        className="opc-scard"
        data-selected={selected || undefined}
        data-tone={sig.tone !== "good" ? sig.tone : undefined}
        onClick={onSelect}
        title={`${sig.tag} · ${sig.name} (Normal: ${sig.normalBand})`}
      >
        <div className="opc-scard-top">
          <span className="ph-unit-dot" data-tone={sig.tone} aria-hidden="true" />
          <span className="opc-roc-pill ast-num">ΔModel {sig.residualDisplay}</span>
        </div>
        <div className="opc-scard-name">{displayName(sig.name)}</div>
        <div className="opc-scard-mid">
          <span className="opc-scard-val ast-num">
            {sig.display}
            {sig.available && sig.unit && <span className="opc-scard-unit"> {sig.unit}</span>}
          </span>
          <span className="opc-scard-band ast-num">Band: {sig.normalBand}</span>
        </div>
        <div className="opc-band-track" aria-hidden="true">
          <div className="opc-band-normal" />
          {sig.available && <div className="opc-band-marker" data-tone={sig.tone} style={{ left: `${sig.bandPct}%` }} />}
        </div>
      </button>
    );
  }

  if (lens === "trends") {
    const deltaSign = sig.deltaWindow > 0 ? "+" : sig.deltaWindow < 0 ? "−" : "";
    return (
      <button
        type="button"
        className="opc-scard"
        data-selected={selected || undefined}
        data-tone={sig.tone !== "good" ? sig.tone : undefined}
        onClick={onSelect}
        title={`${sig.tag} · ${sig.name}`}
      >
        <div className="opc-scard-top">
          <span className="ph-unit-dot" data-tone={sig.tone} aria-hidden="true" />
          <span className="opc-scard-val ast-num" style={{ marginLeft: "auto", fontSize: 12 }}>
            {sig.display}
            {sig.available && sig.unit && <span className="opc-scard-unit"> {sig.unit}</span>}
          </span>
        </div>
        <div className="opc-scard-name">{displayName(sig.name)}</div>
        <div className="opc-scard-spark-lg" aria-hidden="true">
          <svg viewBox="0 0 140 22" preserveAspectRatio="none">
            <line x1={0} y1={11} x2={140} y2={11} stroke="var(--card-border)" strokeWidth={0.8} strokeDasharray="2 2" />
            {sparkPath && (
              <path d={sparkPath} fill="none" stroke={strokeColor} strokeWidth={1.6} strokeLinecap="round" />
            )}
          </svg>
        </div>
        <div className="opc-scard-foot ast-num">
          <span>Min {sig.available ? sig.minVal.toFixed(1) : "—"}</span>
          <span>Δ60m {sig.available ? `${deltaSign}${Math.abs(sig.deltaWindow).toFixed(1)}` : "—"}</span>
          <span>Max {sig.available ? sig.maxVal.toFixed(1) : "—"}</span>
        </div>
      </button>
    );
  }

  if (lens === "roc") {
    const barLeft = sig.rocNorm >= 0 ? 50 : 50 + sig.rocNorm * 50;
    const barWidth = Math.max(2, Math.abs(sig.rocNorm) * 50);
    return (
      <button
        type="button"
        className="opc-scard"
        data-selected={selected || undefined}
        data-tone={sig.tone !== "good" ? sig.tone : undefined}
        onClick={onSelect}
        title={`${sig.tag} · ${sig.name} · Rate of change`}
      >
        <div className="opc-scard-top">
          <span className="ph-unit-dot" data-tone={sig.tone} aria-hidden="true" />
          <span className="opc-scard-band ast-num" style={{ marginLeft: "auto" }}>
            {sig.display} {sig.available ? sig.unit : ""}
          </span>
        </div>
        <div className="opc-scard-name">{displayName(sig.name)}</div>
        <div className="opc-roc-row">
          <span className="opc-roc-main ast-num" data-fast={sig.rocFast || undefined}>
            {dirArrow} {sig.rocMinDisplay}
          </span>
          <span className="opc-roc-hr ast-num">{sig.rocHourDisplay}</span>
        </div>
        <div className="opc-roc-track" aria-hidden="true">
          <div className="opc-roc-zero" />
          {sig.available && <div className="opc-roc-bar" data-fast={sig.rocFast || undefined} style={{ left: `${barLeft}%`, width: `${barWidth}%` }} />}
        </div>
        <div className="opc-scard-foot ast-num">
          <span>Band: {sig.normalBand}</span>
          <span>TTL: {sig.timeToLimit}</span>
        </div>
      </button>
    );
  }

  // Default: "combined" — Name + Value/Unit + Rate of Change + Trend Sparkline
  return (
    <button
      type="button"
      className="opc-scard"
      data-selected={selected || undefined}
      data-tone={sig.tone !== "good" ? sig.tone : undefined}
      onClick={onSelect}
      title={`${sig.name} · ${sig.display}${sig.unit ? ` ${sig.unit}` : ""} (${sig.rocMinDisplay})`}
    >
      <div className="opc-scard-top">
        <span className="ph-unit-dot" data-tone={sig.tone} aria-hidden="true" />
        <span className="opc-scard-name">{sig.name}</span>
      </div>
      <div className="opc-scard-mid">
        <span className="opc-scard-val ast-num">
          {sig.display}
          {sig.available && sig.unit && <span className="opc-scard-unit"> {sig.unit}</span>}
        </span>
        <span
          className="opc-roc-pill ast-num"
          data-dir={sig.rocDir}
          data-fast={sig.rocFast || undefined}
        >
          {dirArrow} {sig.rocMinDisplay}
        </span>
      </div>
      <div className="opc-scard-spark" aria-hidden="true">
        <svg viewBox="0 0 140 24" preserveAspectRatio="none">
          <line x1={0} y1={12} x2={140} y2={12} stroke="var(--card-border)" strokeWidth={0.7} strokeDasharray="2 2" />
          {sparkPath && (
            <path d={sparkPath} fill="none" stroke={strokeColor} strokeWidth={1.6} strokeLinecap="round" />
          )}
        </svg>
      </div>
    </button>
  );
}

/* ==========================================================================
   Kiln Fleet Mimic Canvas (machines drawn from their own hotspots / sub-assembly drawings)
   ========================================================================== */

function KilnFleetMimicCanvas({ machine, ...rest }: Omit<KilnFleetMimicProps, "machine"> & { machine: AssetMachine | null }) {
  if (!machine) {
    return (
      <div className="opc-svg-wrap">
        <span className="opc-no-data">No drawing for this machine yet</span>
      </div>
    );
  }
  return <KilnFleetMimicDrawing machine={machine} {...rest} />;
}

interface KilnFleetMimicProps {
  machineId: string;
  /** The machine record (database): its diagram type and hotspots. */
  machine: AssetMachine;
  part: MachineComponent | null;
  pointLabelMode: PointLabelMode;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  resolveTag: (tag: string) => ResolvedTag;
  zoom: number;
  pan: { x: number; y: number };
  onChangeZoom: (z: number) => void;
  onChangePan: (p: { x: number; y: number }) => void;
  onResetView: () => void;
}

function KilnFleetMimicDrawing({
  machineId,
  machine,
  part,
  pointLabelMode,
  selectedTag,
  onSelectTag,
  resolveTag,
  zoom,
  pan,
  onChangeZoom,
  onChangePan,
  onResetView,
}: KilnFleetMimicProps) {
  const [hoverTag, setHoverTag] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const dragRef = React.useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const { dots: rawDots } = useMachineOverview(machine);
  const dots = useMemo(
    () =>
      rawDots.map((d) => {
        const res = resolveTag(d.tag);
        if (!res.available) return d;
        return {
          ...d,
          value: res.display,
          unit: res.unit,
          status: res.status,
          tone: res.tone === "idle" ? ("good" as const) : res.tone,
        };
      }),
    [rawDots, resolveTag],
  );
  const schematicPill = useCallback((tag: string) => pillContentOf(resolveTag(tag), pointLabelMode), [resolveTag, pointLabelMode]);
  const isKilnPart = Boolean(part?.pins && part.pins.length > 0);
  const { box, measure } = useContentBox(isKilnPart ? `operator-part:${machineId}:${part?.id}` : null, () =>
    isKilnPart && part ? <><KilnSubAssemblyArt machineId={machineId} subAssemblyId={part.id} />
      {part.pins?.map((pin) => <circle key={pin.tag} cx={pin.x} cy={pin.y} r={15} />)}</> : null,
  );
  const artBox = useMemo<[number, number, number, number]>(() => box ?? [0, 0, 720, 310], [box]);
  const partFontSz = 14;
  const partLayout = useMemo(() => part?.pins ? layoutSensorCallouts(part.pins.map((pin) => {
    const content = pillContentOf(resolveTag(pin.tag), pointLabelMode);
    return {
      tag: pin.tag,
      px: pin.x,
      py: pin.y,
      label: content.value,
      w: pillContentWidth(content, partFontSz) + 20,
      baseW: pillContentWidth(content, partFontSz) + 20,
    };
  }), artBox, { cardH: 24, padR: 7, gapX: 5, gapY: 4 }) : null, [part, artBox, resolveTag, pointLabelMode]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1 && e.button !== 1) return;
    setPanning(true);
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panning || !dragRef.current) return;
    onChangePan({ x: dragRef.current.px + e.clientX - dragRef.current.x, y: dragRef.current.py + e.clientY - dragRef.current.y });
  };
  const onPointerUp = () => { setPanning(false); dragRef.current = null; };
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    onChangeZoom(zoom + (e.deltaY < 0 ? 0.15 : -0.15));
  };

  return (
    <div className="opc-svg-wrap" data-zoomed={zoom > 1 || undefined} data-panning={panning || undefined}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onWheel={onWheel} onDoubleClick={onResetView}>
      {measure}
      <div className="opc-svg-pan-layer" style={{ transform: zoom !== 1 || pan.x || pan.y ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` : undefined }}>
        {isKilnPart && part && partLayout ? (
          <MachineSvg viewBox={partLayout.viewBox.join(" ")} label={`${part.name} — ${machine.name}`} interactive cadFrame={false} autoFit={false}>
            <KilnSubAssemblyArt machineId={machineId} subAssemblyId={part.id} />
            {[...partLayout.callouts]
              .sort((a, b) => {
                const aHot = a.tag === hoverTag ? 2 : a.tag === selectedTag ? 1 : 0;
                const bHot = b.tag === hoverTag ? 2 : b.tag === selectedTag ? 1 : 0;
                return aHot - bHot;
              })
              .map((c) => {
              const sig = resolveTag(c.tag);
              const isHot = selectedTag === c.tag || hoverTag === c.tag;
              const showCard = isHot || pointLabelMode === "value" || pointLabelMode === "tag-value" || pointLabelMode === "alerts" && sig.status !== "Normal";
              const leader = calloutLeaderPath(c, 7);
              return <g key={c.tag} className="lsh-point" role="button" tabIndex={0} aria-pressed={selectedTag === c.tag}
                aria-label={`${displayName(sig.name)}: ${sig.display} ${sig.unit}`}
                onClick={() => onSelectTag(c.tag)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectTag(c.tag); } }}
                onPointerEnter={() => setHoverTag(c.tag)} onPointerLeave={() => setHoverTag((tag) => tag === c.tag ? null : tag)}>
                <g transform={`translate(${c.px} ${c.py})`}><circle r={13} fill="transparent" />
                  {sig.available ? <MachinePad x={0} y={0} status={sig.status} selected={isHot} scale={1.1} />
                    : <circle r={5.2} fill={MX.padPanel} stroke={MX.fine} strokeWidth={1.3} />}
                </g>
                {showCard && <g>
                  {leader && <path d={leader} fill="none" stroke={isHot ? "var(--dx-ink)" : MX.label} strokeWidth={1} opacity={isHot ? 0.9 : 0.6} />}
                  <ValuePill content={pillContentOf(sig, pointLabelMode)} cx={c.cx} cy={c.cy} w={c.w} h={c.h} rx={5.5} fontSz={partFontSz} textDy={4.8}
                    tone={sig.tone} hot={isHot} strokeW={isHot || sig.tone !== "good" ? 1.3 : 1.05} />
                </g>}
              </g>;
            })}
          </MachineSvg>
        ) : (
          <MachineSchematic diagramType={machine.diagramType} dots={part ? dots.filter((dot) => part.tags.includes(dot.tag)) : dots} selectedTag={selectedTag}
            onSelect={onSelectTag} showAllValues={pointLabelMode} isComponent={Boolean(part)} pillContent={schematicPill} label={`${machine.name} drawing`} />
        )}
      </div>
    </div>
  );
}

