"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loading, PillButton } from "@/components/ui";
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
import { VALUE_PX, stageMetrics, usePxPerUnit, useStageLayout } from "@/components/assets/pyro/line-sheets/stage-callouts";
import { useArtBusyMap } from "@/components/assets/art-busy-map";
import { textWidth } from "@/components/assets/pyro/line-sheets/text-width";
import { PartBlock, blockLeader, blockMetrics, clusterPads, layoutPartBlocks, linkColor, measureBlock, rowLeader, type BlockMetrics, type PartGroup, type PlacedBlock } from "./part-blocks";
import { MachineHealthShade, useSheetBox } from "@/components/assets/pyro/line-sheets/line-sheet";
import { HealthOutline, type OutlineOwner } from "@/components/assets/pyro/line-sheets/health-outline";
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
import { formatClock, type LiveSignal, type SimFrame } from "@shared/lib/kiln-sim/engine";
import { AlarmPanelToggle, OperatorAlarmLog, OperatorTrendPanel, rateFromSamples, useAlarmPanel, useLatchedAlarms } from "./operator-telemetry";
import { ValuePill, pillContentWidth, stateWords, type PillContent, type RunState } from "./value-pill";
import { hmiLabel } from "@/lib/hmi-label";
import { LineHealthLayer, LineHealthTint, type LineHealthCell } from "./line-health-layer";
import { AlertPopupLayer, AlertPopupToggle, useAlertPopupControl, type AlertPopupControl } from "./alert-popups";
import { ComponentQuickLook } from "./component-quick-look";
import { componentOptions, type ComponentOption } from "@/components/assets/component-scope";
import { MachineQuickLook } from "./machine-quick-look";
import {
  ArrangeBar,
  CanvasViewMenu,
  READING_PX,
  ShortcutsPanel,
  useCanvasPrefs,
  useCanvasShortcuts,
  useSheetLayouts,
  type CanvasPrefs,
  type SheetLayout,
} from "./canvas-prefs";
import type { HealthPoint } from "@shared/lib/health-recorder";
import { isLiveMachine, useKilnFleet, useKilnSimulationFor, useLivePlantStarting, usePlantEngineOf, usePrimaryMachineId } from "@/providers/kiln-simulation-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useHierarchyData } from "@/components/assets/hierarchy/use-hierarchy-data";
import { defsFor } from "@/lib/live-defs";
import { useHealthModels, type HealthBands } from "@/lib/reference-data";
import { isConditionRule } from "@shared/lib/plant-defs";
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
  StatusSummary,
  usePlantStatus,
  PYRO_COMBO_TABS,
  PYRO_SECTION_TABS,
  VPC_DIAGRAM,
  comboTabs,
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
  /** Sub-assembly the point measures (id unique across machines, name from the machine's defs); null when unknown. */
  part: { id: string; name: string } | null;
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
        part: (() => {
          const sub = def && "sub" in def && typeof def.sub === "string" ? def.sub : null;
          if (!sub) return null;
          const owner = ownerId ?? otherId ?? null;
          const name = (srcFrame?.defs ?? defsFor(owner))?.subassemblies.find((x) => x.id === sub)?.name ?? sub;
          return { id: `${owner}:${sub}`, name };
        })(),
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
  alertsLoading = false,
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
  let navigateToLine: ((page: "diagnosis" | "prognosis" | "analysis") => void) | undefined;
  // Practice faults (simulation) belong to the Oswar super administrator alone.
  let canSimulate = false;
  /** The plant's records are in (false while the first load runs). */
  let plantLoaded = true;
  try {
    const dataContext = useIndustrialData();
    plantLoaded = dataContext.hasLoaded && !(dataContext.isLoading && dataContext.hierarchy.length === 0);
    navigateToLine = dataContext.navigateToLine;
    canSimulate = Boolean(dataContext.currentUser?.role.allPlants);
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
    // A combined sheet stands for its primary machine, when the plant has all of its machines.
    for (const c of PYRO_COMBO_TABS) {
      if (c.sections.every((sec) => out[sec])) out[c.id] = out[c.primary];
    }
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

  // One machine on the plant: its section stands in for the full line everywhere.
  const onlySection: PyroSectionId | null = plantCatalog.length === 1 ? (machineToSection[plantCatalog[0].id] ?? null) : null;
  const initialMachineId = focusMachine?.id ?? contextSelectedMachineId ?? (plantCatalog.length === 1 ? plantCatalog[0].id : null);
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

  // Nothing opens the full line of a one-machine plant: any way back to it lands on the machine.
  useEffect(() => {
    if (!onlySection) return;
    if (pyroSection === "line") setPyroSection(onlySection);
    if (appleUnitFilter === "line") setAppleUnitFilter(onlySection);
  }, [onlySection, pyroSection, appleUnitFilter]);

  const [detailSheetId, setDetailSheetId] = useState<string | null>(null);
  const [detailPartId, setDetailPartId] = useState<string | null>(null);
  const [pickedUnitId, setPickedUnitId] = useState<string | null>(() => initialMachineId);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // What the drawing shows and how (View menu, kept per browser): readings all / alerts only / none, short or
  // full names, size, alarm links, hidden parts; and how each drawing was arranged.
  const [canvasPrefs, setCanvasPrefs] = useCanvasPrefs();
  const sheetLayouts = useSheetLayouts();
  const [arranging, setArranging] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const pointLabelMode: PointLabelMode =
    canvasPrefs.readings === "none" ? "off" : canvasPrefs.readings === "alerts" ? "alerts" : canvasPrefs.names === "full" ? "tag-value" : "value";

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

  /** Combined sheet open in place of one machine's (several stages drawn together). */
  const activeCombo = useMemo(() => PYRO_COMBO_TABS.find((t) => t.id === pyroSection) ?? null, [pyroSection]);
  const activeTabSpec = useMemo(
    () =>
      activeCombo
        ? { id: activeCombo.id, label: activeCombo.label, code: "", sheetId: activeCombo.sheetId, diagramType: null }
        : PYRO_SECTION_TABS.find((t) => t.id === pyroSection) ?? PYRO_SECTION_TABS[0],
    [activeCombo, pyroSection],
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
    // A combined sheet is one drawing: no part drawings to step through.
    if (isPyroPlant && activeCombo) return [LINE_SHEET_BY_ID[activeCombo.sheetId]].filter((s) => Boolean(s && LINE_SHEET_ART[s.id]?.ready));
    if (isPyroPlant || isVpcPlant) {
      return lineSheetsForMachine(activeMachineId).filter((s) => LINE_SHEET_ART[s.id]?.ready);
    }
    return [];
    // A copy of a line machine resolves its sheets once the live plant's configuration is in (its first frame).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPyroPlant, isVpcPlant, pyroSection, activeCombo, activeMachineId, activeFrame !== null]);

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
    if (isPyroPlant && activeCombo) {
      return [...new Set(activeCombo.sections.flatMap((sec) => tagsOf(sectionMachineIds[sec])))];
    }
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
  }, [activePart, detailSheetId, isPyroPlant, isVpcPlant, pyroSection, activeCombo, appleUnitFilter, activeCatalog.sensors, activeMachineId, sectionMachineIds]);

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
  // The machines on the drawing: one, or every machine of a combined sheet.
  const viewMachineIds = useMemo(
    () => new Set(activeCombo ? activeCombo.sections.flatMap((sec) => sectionMachineIds[sec] ?? []) : [activeMachineId]),
    [activeCombo, sectionMachineIds, activeMachineId],
  );
  const viewAlertCount = isFullLine ? activeAlerts.length : activeAlerts.filter((a) => viewMachineIds.has(a.machineId)).length;
  const sidebarAlarms = useMemo(
    () => (isFullLine ? latchedAlarms : latchedAlarms.filter((a) => viewMachineIds.has(a.machineId))),
    [latchedAlarms, isFullLine, viewMachineIds],
  );
  // The alarm list floats over the drawing; the operator's open / closed choice is remembered.
  const alarmPanel = useAlarmPanel();

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

  // The top bar's logo: back to the Full line, closing whatever unit, sheet or popup was open.
  const openFullLineRef = useRef<() => void>(() => undefined);
  openFullLineRef.current = () => {
    if (focusMachine) return;
    setTrendModalTag(null);
    handleSelectUnitById(null);
  };
  useEffect(() => {
    const onOpenFullLine = () => openFullLineRef.current();
    window.addEventListener("ultron:open-full-line", onOpenFullLine);
    return () => window.removeEventListener("ultron:open-full-line", onOpenFullLine);
  }, []);

  /* ------------------------------------------------------ key figures (for Sub-assembly / Operating point / Status by area) */
  const hasDigestData = digestSensors.length > 0 || digestGroups.rows.length > 0 || isLiveHealth;
  // The machine's record and live checks still on their way: placeholders, never "No data" / "None".
  const liveStarting = useLivePlantStarting() && !activeFrame && isLiveMachine(activeCatalogMachine?.id);
  const digestLoading = (digest.catalog.isLoading && digestSensors.length === 0) || liveStarting;
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
      loading: !hasDigestData && digestLoading,
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
      loading: digestFindings.source === "none" && digestLoading,
    },
    {
      label: "Sensors out of range",
      value: digestSensors.length ? String(offNormalCount) : "—",
      unit: digestSensors.length ? `/ ${digestSensors.length}` : undefined,
      tone: digestCounts.Critical ? "bad" : offNormalCount ? "warn" : "idle",
      foot: digestSensors.length ? `${digestCounts.Critical} critical · ${digestCounts.Alert} alert` : "No sensors linked to this machine",
      loading: !digestSensors.length && digestLoading,
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
          loading: !digestQuality.live && digestLoading,
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
    // Before the plant loads its stand-in has no machines: no pills yet (the bar shows a placeholder).
    const ids = nonPyroUnitIds.filter(Boolean);
    if (!plantLoaded && ids.length === 0) return [];
    return machineTabs("plain", ids.map((id) => ({ id, name: name(id) }))).filter((t) => t.label);
  }, [isPyroPlant, isVpcPlant, plantCatalog, vpcUnits, lookup, contextMachines, nonPyroUnitIds, plantLoaded]);

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

  /** A combined sheet's status from its machines, as the Full line's: health 0.6 × worst + 0.4 × mean. */
  const comboStatus = useMemo(() => {
    if (!activeCombo) return null;
    const units = factoryRollupUnits.filter((u) => u.secId && (activeCombo.sections as string[]).includes(u.secId));
    const scores = units.map((u) => u.health).filter((h): h is number => h !== null);
    const health = scores.length ? Math.round(0.6 * Math.min(...scores) + (0.4 * scores.reduce((n, v) => n + v, 0)) / scores.length) : null;
    const tone: Tone = units.some((u) => u.tone === "bad") ? "bad" : units.some((u) => u.tone === "warn") ? "warn" : units.some((u) => u.tone === "good") ? "good" : "idle";
    return {
      units,
      health,
      tone,
      offNormal: units.reduce((n, u) => n + u.offNormal, 0),
      alarms: units.reduce((n, u) => n + u.findingsCount, 0),
    };
  }, [activeCombo, factoryRollupUnits]);

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

  // Navbar 2's pills scroll sideways when the row runs short: keep the active one in view.
  const subbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    subbarRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [detailSheetId, detailPartId, activeMachineId, isFullLine]);

  /* ------------------------------------------------------------------------
     CANVAS CHOICES, ARRANGING AND KEYS
     ------------------------------------------------------------------------ */
  const activeSheetArt = activeSheetId ? LINE_SHEET_ART[activeSheetId] : undefined;
  // Composed sheets move their machines; sheets with readout blocks move their blocks.
  const sheetHasBlocks = Boolean(activeSheetArt?.callouts || activeSheetArt?.readouts) && LINE_SHEET_BY_ID[activeSheetId ?? ""]?.kind !== "line";
  const canArrange = Boolean(activeSheetArt?.arrange) || sheetHasBlocks;
  const activeLayout = sheetLayouts.of(activeSheetId);
  useEffect(() => {
    setArranging(false);
  }, [activeSheetId]);
  // Parts with readings on the drawing, for hiding their readout blocks (View › Parts).
  const sheetParts = useMemo(() => {
    if (!activeSheetId || isFullLine) return [];
    const out = new Map<string, string>();
    for (const t of lineSheetTags(activeSheetId)) {
      const p = resolveTag(t).part;
      if (p && !out.has(p.id)) out.set(p.id, p.name);
    }
    return [...out].map(([id, name]) => ({ id, name }));
  }, [activeSheetId, isFullLine, resolveTag]);

  // Top-bar tabs in the order shown (machines, then the combined sheets): digits and [ ] walk them.
  const keyTabs = useMemo(
    () => [...topbarTabs, ...(isPyroPlant && !focusMachine ? comboTabs(plantCatalog) : [])],
    [topbarTabs, isPyroPlant, focusMachine, plantCatalog],
  );
  const activeTabKey = effectiveLayer === "overview" ? "line" : isPyroPlant ? pyroSection : activeMachineId;
  const openTab = (t: (typeof keyTabs)[number]) => (isPyroPlant ? handleSelectPyroSection(t.key as PyroSectionId) : handleSelectUnitById(t.machineId));
  useCanvasShortcuts(
    {
      tab: (i) => keyTabs[i] && openTab(keyTabs[i]),
      machine: (d) => {
        if (!keyTabs.length) return;
        const i = keyTabs.findIndex((t) => t.key === activeTabKey);
        openTab(keyTabs[(Math.max(0, i) + d + keyTabs.length) % keyTabs.length]);
      },
      sheet: (d) => {
        if (totalStepCount > 1) stepSheet(d);
      },
      nextAlarm: (d) => {
        // Full line: the next component with an active alarm opens its quick look.
        if (isFullLine) {
          const places = activeAlerts.flatMap((a) => (a.subs?.[0] ? [{ machineId: a.machineId, subId: a.subs[0] }] : []));
          if (!places.length) return;
          const i = partLook ? places.findIndex((p) => p.machineId === partLook.machineId && p.subId === partLook.subId) : -1;
          setPartLook(places[i < 0 ? (d > 0 ? 0 : places.length - 1) : (i + d + places.length) % places.length]);
          return;
        }
        // A drawing: the next reading in alarm (Critical first) is selected and linked to its sensor.
        const tags = (activeSheetId ? lineSheetTags(activeSheetId) : scopeTags)
          .map((t) => resolveTag(t))
          .filter((r) => r.status !== "Normal")
          .sort((a, b) => (a.status === b.status ? 0 : a.status === "Critical" ? -1 : 1))
          .map((r) => r.tag);
        if (!tags.length) return;
        const i = selectedTag ? tags.indexOf(selectedTag) : -1;
        setSelectedTag(tags[i < 0 ? (d > 0 ? 0 : tags.length - 1) : (i + d + tags.length) % tags.length]);
      },
      view: () => onChangeView?.(view === "operator" ? "twin" : "operator"),
      readings: () =>
        setCanvasPrefs({ readings: canvasPrefs.readings === "all" ? "alerts" : canvasPrefs.readings === "alerts" ? "none" : "all" }),
      arrange: () => {
        if (canArrange && view === "operator") setArranging((a) => !a);
      },
      alarms: () => {
        if (showAlarmRail) alarmPanel.setOpen(!alarmPanel.open);
      },
      messages: () => popupControl.setShow(!popupControl.show),
      fullscreen: toggleFullscreen,
      zoom: (dir) => (dir === 0 ? resetZoom() : setZoom((z) => clampZoom(z + dir * 0.15))),
      help: () => setKeysOpen((o) => !o),
      escape: () => {
        if (keysOpen) {
          setKeysOpen(false);
          return true;
        }
        if (arranging) {
          setArranging(false);
          return true;
        }
        return false;
      },
    },
    view === "operator" || view === "twin",
  );

  // The sheet's key and its controls (messages, zoom, full screen) sit at the right end of navbar 2, off the
  // drawing; in full screen, where the navbars are hidden, they float on the drawing's bottom edge instead.
  const drawingTools = (
    <>
      {activeSheetId && !isFullLine && <SheetKey />}
      <div className="opc-stage-toggles opc-canvas-controls" role="toolbar" aria-label="Drawing controls">
        {activeSheetId && (
          <CanvasViewMenu
            prefs={canvasPrefs}
            onChange={setCanvasPrefs}
            parts={sheetParts}
            readingsOnSheet={!isFullLine}
            canArrange={canArrange}
            arranging={arranging}
            onArrange={setArranging}
            arranged={Boolean(activeLayout)}
            onReset={() => activeSheetId && sheetLayouts.reset(activeSheetId)}
            onShowKeys={() => setKeysOpen(true)}
            up={paneFullscreen}
          />
        )}
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
        {showAlarmRail && (
          <AlarmPanelToggle open={alarmPanel.open} onToggle={() => alarmPanel.setOpen(!alarmPanel.open)} alarms={sidebarAlarms} />
        )}
      </div>
    </>
  );

  return (
    <div
      className="opc-shell"
      role="region"
      aria-label="Control room view of the plant"
    >
      {/* Row 1 (shared with Assets): the plant's machines and the view toggle. */}
      <MachineTopbar
        tabs={topbarTabs}
        combos={isPyroPlant && !focusMachine ? comboTabs(plantCatalog) : undefined}
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
              <div ref={subbarRef} className="opc-subbar" role="region" aria-label="Machine parts and drawing controls">
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
                    <div className="opc-pill-group opc-subassembly-pills" role="tablist" aria-label={comboStatus ? "Machines on this drawing" : "Machines on the line"}>
                      {!comboStatus && (
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
                      )}
                      {/* The stand-in plant before the real one loads has a nameless unit: no pill for it. A combined
                          sheet lists its own machines, each opening that machine's drawing. */}
                      {(comboStatus ? comboStatus.units : factoryRollupUnits.filter((u) => u.name)).map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          role="tab"
                          aria-selected={!isFullLine && !comboStatus && activeMachineId === u.id}
                          className="opc-pill-btn"
                          data-active={(!isFullLine && !comboStatus && activeMachineId === u.id) || undefined}
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
                {!paneFullscreen && <div className="opc-subbar-tools">{drawingTools}</div>}
              </div>

              {/* ============================================================
                  NAVBAR 3 (`.opc-context-bar` — Temporary Contextual Navbar):
                  Appears on the Machine 2D view so the machine/sub-assembly
                  health summary and all direct popup (`↗`) & page-link (`→`)
                  buttons fit comfortably across their own row without clipping.
                  ============================================================ */}
              {/* Full line: the plant's status and the page toggle. Diagnosis, Prognosis and Analysis open the
                  whole line's pages in Assets; Sensors stays a machine page (the machine needing attention most). */}
              {isFullLine && !focusMachine && (
                <PlantStatusBar
                  label="Full line"
                  status={plantStatus}
                  active="overview"
                  onSelect={(page) => {
                    if (page === "overview") return;
                    if (page === "sensors") {
                      if (plantStatus.focusMachineId) onNavigateToMachine(plantStatus.focusMachineId, page);
                    } else navigateToLine?.(page);
                  }}
                />
              )}
              {!isFullLine && effectiveLayer === "machine" && (
                <div className="opc-context-bar" role="region" aria-label="Machine status, quick views and pages">
                  <div className="opc-context-left">
                    {/* Same summary as Full line and Assets; a picked component shows its own health and sensors. */}
                    {(() => {
                      const off = componentRollup ? componentRollup.offNormalSigs.length : comboStatus ? comboStatus.offNormal : offNormalCount;
                      return (
                        <StatusSummary
                          tone={componentRollup ? componentRollup.tone : comboStatus ? comboStatus.tone : conditionTone(conditionLabel)}
                          label={componentRollup ? componentRollup.scope.label : activeTabSpec.label}
                          health={comboStatus && !componentRollup ? comboStatus.health : stageHealth}
                          offNormal={off > 0 ? `${off} ${off === 1 ? "sensor needs" : "sensors need"} attention` : null}
                        />
                      );
                    })()}
                  </div>

                  <div className="opc-context-right">
                    {/* Quick views are one machine's: a combined sheet has none. */}
                    {!comboStatus && (
                      <>
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
                      </>
                    )}

                    {/* Row 2 (shared with Assets): Overview is this view, the other pages open in Assets (a combined
                        sheet's open on its primary machine). */}
                    <MachinePageToggle
                      alarms={comboStatus ? comboStatus.alarms : digestFindings.active.length}
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
                    data-full-stage={(showAlarmRail || effectiveLayer === "overview") || undefined}
                  >
                    <div className="opc-center-stage">
                      <div
                        ref={diagramPaneRef}
                        className={`opc-diagram-pane${paneFullscreen ? " mx-canvas" : ""}`}
                        data-alarm-panel={(showAlarmRail && alarmPanel.open) || undefined}
                      >
                    {paneFullscreen && (
                      <button type="button" className="opc-fullscreen-exit" onClick={toggleFullscreen} aria-label="Leave full screen">
                        Exit full screen
                      </button>
                    )}

                    {paneFullscreen && drawingTools}
                    {arranging && activeSheetId && (
                      <ArrangeBar
                        machines={Boolean(activeSheetArt?.arrange)}
                        arranged={Boolean(activeLayout)}
                        onReset={() => sheetLayouts.reset(activeSheetId)}
                        onDone={() => setArranging(false)}
                      />
                    )}
                    {keysOpen && <ShortcutsPanel onClose={() => setKeysOpen(false)} />}
                    {activeSheetId ? (
                      <SheetMimicCanvas
                        sheetId={activeSheetId}
                        pointLabelMode={pointLabelMode}
                        prefs={canvasPrefs}
                        layout={activeLayout}
                        arranging={arranging}
                        onMovePiece={(id, off) => sheetLayouts.movePiece(activeSheetId, id, off)}
                        onMoveBlock={(id, at) => sheetLayouts.moveBlock(activeSheetId, id, at)}
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

                    {/* Alarms panel on the drawing's right edge (also in full screen): while it is open the drawing re-fits
                        to the space left of it; the toolbar button brings it back. */}
                    {showAlarmRail && alarmPanel.open && (
                      <OperatorAlarmLog
                        alarms={sidebarAlarms}
                        loading={alertsLoading || !plantFrame}
                        onDiagnose={(machineId) => navigateWithinConsole(machineId, "diagnosis")}
                        onClose={() => alarmPanel.setOpen(false)}
                      />
                    )}
                  </div>
                </div>
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

              {activeDetailModal === "simulation" && canSimulate && (
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
    value: res.isState ? stateWords(res.display) : `${res.display}${res.available && res.unit ? ` ${res.unit}` : ""}`,
    sp: res.sp ? `${res.sp}` : null,
    run: res.run,
    state: res.isState,
  };
}

/** One value block for several points (the sheet's `averages`): their mean, the worst member status, the members' mean trend. */
function averageResolved(key: string, label: string, members: ResolvedTag[]): ResolvedTag {
  // A block of on/off states (six spray circuits) shows their one shared state; the canvas expands it back
  // into its members as soon as one differs or is abnormal (stateBlockSplits), so a mean is never needed.
  if (members.length && members.every((m) => m.isState)) {
    const first = members[0];
    const status = members.some((m) => m.status === "Critical") ? "Critical" : members.some((m) => m.status === "Alert") ? "Alert" : "Normal";
    const available = members.every((m) => m.available);
    return {
      ...first,
      tag: key,
      available,
      name: `${label.charAt(0)}${label.slice(1).toLowerCase()} (${members.length} points)`,
      status,
      tone: !available ? "idle" : status === "Critical" ? "bad" : status === "Alert" ? "warn" : "good",
      short: label,
      sp: null,
      run: null,
    };
  }
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

/**
 * What the marks on a machine sheet mean, in the sheet's corner (Recognition over recall): a measuring
 * point is a quiet ring while Normal and fills in its status colour when not; a drive's run dot is filled
 * while it runs and hollow when stopped.
 */
function SheetKey() {
  return (
    <div className="opc-sheet-key" role="note" aria-label="What the marks mean">
      <span>
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="3.6" fill="none" stroke="var(--mx-label)" strokeWidth="1.4" />
        </svg>
        Normal
      </span>
      <span>
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="4.2" fill="var(--status-warning)" />
        </svg>
        Alert
      </span>
      <span>
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="4.2" fill="var(--status-danger)" />
        </svg>
        Critical
      </span>
      <span className="opc-sheet-key-sep" aria-hidden="true" />
      <span>
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="3.4" fill="var(--dx-ink)" />
        </svg>
        Running
      </span>
      <span>
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="3.2" fill="none" stroke="var(--dx-ink)" strokeWidth="1.2" />
        </svg>
        Stopped
      </span>
    </div>
  );
}

/** A block of states splits into its members when they disagree or any is not Normal; numeric blocks never split. */
function stateBlockSplits(members: ResolvedTag[]): boolean {
  if (!members.length || !members.every((m) => m.isState)) return false;
  return members.some((m) => m.status !== "Normal") || new Set(members.map((m) => m.display)).size > 1;
}

const NO_CLOSED: ReadonlySet<string> = new Set();

/**
 * Title of a readout block: the part's name, or — for one piece of a part spread over the sheet — what its
 * readings' labels share when that names the piece ("FAN 1" of Cooling fans 1–3).
 */
function clusterTitle(part: string, labels: string[], whole: boolean): string {
  if (whole || labels.length < 2) return part;
  const words = labels.map((l) => l.split(/\s+/));
  const common: string[] = [];
  for (let i = 0; i < words[0].length && words.every((w) => w[i] === words[0][i]); i++) common.push(words[0][i]);
  const prefix = common.join(" ");
  return /\d/.test(prefix) ? prefix : part;
}
/** Stage sheets: blocks pack with gaps (area they need × PACKING), may use INSIDE_USE of the drawing's empty
 * space, and the drawing keeps at least MIN_DRAWING of its fitted size. */
const PACKING = 1.15;
const INSIDE_USE = 0.5;
const MIN_DRAWING = 0.78;
/** At most this share of the readout blocks' area may lie on drawn equipment before the drawing gives way. */
const BURY_MAX = 0.11;
/** Each drawing size tried is this share of the one before. */
const DRAWING_STEP = 0.95;
/** Reading sizes tried (shares of the operator's size) when a sheet's readings do not fit the canvas. */
const READING_STEPS = [1, 0.94, 0.88, 0.83, 0.78];

/** Two placed blocks overlap (not merely touch). */
function blocksOverlap(blocks: PlacedBlock[]): boolean {
  for (let i = 0; i < blocks.length; i++) {
    const a = blocks[i];
    for (let j = i + 1; j < blocks.length; j++) {
      const b = blocks[j];
      if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) return true;
    }
  }
  return false;
}

/** A combined sheet's staircase drawing is mostly empty corners (where its blocks sit): it may go smaller. */
const MIN_COMBINED = 0.68;
/** Designed sheets: the drawing keeps at least this share of the size at which the whole design fits the canvas. */
const MIN_DESIGN = 0.62;
/** Designed sheets: the blocks stand round the drawing, so they may cover less of it. */
const DESIGN_BURY_MAX = 0.06;
/** Designed sheets: the smallest share of the chosen reading size taken to keep the drawing large. */
const DESIGN_READING_MIN = 0.88;
/** Half-size of the area round a pad in alarm whose equipment outline is drawn (sheet units). */
const ALARM_REACH = 60;

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
  prefs,
  layout,
  arranging = false,
  onMovePiece,
  onMoveBlock,
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
  /** The operator's canvas choices: readings shown, names, size, alarm links, hidden parts. */
  prefs: CanvasPrefs;
  /** How the operator arranged this drawing (machines moved, blocks placed by hand). */
  layout?: SheetLayout;
  /** Arrange mode: machines and readout blocks are dragged instead of clicked. */
  arranging?: boolean;
  onMovePiece?: (id: string, offset: [number, number]) => void;
  onMoveBlock?: (id: string, at: [number, number]) => void;
}) {
  const registered = LINE_SHEET_ART[sheetId];
  const pieceOffsets = layout?.pieces;
  // A composed sheet as the operator arranged it: its machines where they were moved to (flows follow).
  const art = useMemo(
    () => (registered?.arrange && pieceOffsets && Object.keys(pieceOffsets).length ? registered.arrange.with(pieceOffsets) : registered),
    [registered, pieceOffsets],
  );
  const meta = LINE_SHEET_BY_ID[sheetId];
  // Readings carry the operator's name choice; which ones show is filtered below.
  const nameMode: PointLabelMode = prefs.names === "full" ? "tag-value" : "value";
  const hiddenParts = useMemo(() => new Set(prefs.hiddenParts), [prefs.hiddenParts]);
  const sizeK = READING_PX[prefs.size] / VALUE_PX;
  /** A drag in arrange mode: what moves and by how much so far (sheet units). */
  const [drag, setDrag] = useState<{ kind: "piece" | "block"; id: string; dx: number; dy: number } | null>(null);
  const grabRef = React.useRef<{ x0: number; y0: number; k: number } | null>(null);
  const [hoverTag, setHoverTag] = useState<string | null>(null);
  /** Readout block whose header is hovered: its part is outlined on the drawing. */
  const [hoverPart, setHoverPart] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const dragRef = React.useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const sheetTags = useMemo(() => lineSheetTags(sheetId), [sheetId]);
  const { box, measure } = useSheetBox(sheetId, false, art);

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
  // A block of states stays one plate only while every member agrees and is Normal (Miller); otherwise its
  // members show on their own pads, so the odd one out is where it is (progressive disclosure on anomaly).
  const splitKey = useMemo(
    () =>
      Object.entries(averages ?? {})
        .filter(([, a]) => stateBlockSplits(a.tags.map(resolveMember)))
        .map(([key]) => key)
        .join("|"),
    [averages, resolveMember],
  );
  const split = useMemo(() => new Set(splitKey ? splitKey.split("|") : []), [splitKey]);
  const blockFor = useCallback((t: string) => {
    const k = blockOf.get(t);
    return k && !split.has(k) ? k : null;
  }, [blockOf, split]);
  const visibleTags = useMemo(
    () => [...new Set(sheetTags.map((t) => blockFor(t) ?? t))].filter((t) => Boolean(activePads[t])),
    [sheetTags, blockFor, activePads],
  );
  const resolveTag = useCallback(
    (tag: string): ResolvedTag => {
      const a = averages?.[tag];
      return a ? averageResolved(tag, a.label, a.tags.map(resolveMember)) : resolveMember(tag);
    },
    [averages, resolveMember],
  );
  // Stage and part sheets with authored slots: readings embedded as plates on their pads, text at a readable on-screen size.
  const isStage = Boolean(art?.callouts || art?.readouts) && meta?.kind !== "line";
  const sheetW = art?.width ?? 1654;
  const sheetH = art?.height ?? 774;
  const busy = useArtBusyMap(art && isStage ? `art:v3:${art.id}` : null, art?.Art, sheetW, sheetH);
  /** A combined sheet: several machines' stages drawn together. */
  const composed = isStage && Boolean(registered?.arrange);

  // Stage sheets: the readings shown, grouped into one readout block per piece of equipment.
  const blockGroups = useMemo(() => {
    if (!isStage || !art) return null;
    const pads = art.pads;
    const pointOf = (tag: string, label?: string) => {
      const res = resolveTag(tag);
      const c = pillContentOf(res, nameMode);
      const [px, py] = pads[tag] ?? [NaN, NaN];
      return { tag, px, py, part: res.part, row: { tag, label: nameMode === "value" && label ? label : c.label, value: c.value, tone: res.tone, run: res.run, state: Boolean(c.state), sp: c.sp } };
    };
    // The operator's choice: none, only the rows that need a look, or all but the parts they hid (whose
    // readings in alarm still show).
    const shown = (p: ReturnType<typeof pointOf>) => {
      const abnormal = p.row.tone === "warn" || p.row.tone === "bad";
      if (prefs.readings === "none") return false;
      if (prefs.readings === "alerts") return abnormal;
      return abnormal || !(p.part && hiddenParts.has(p.part.id));
    };
    const design = art.readouts;
    if (design) {
      // A designed sheet: its blocks, titles and labels as the design has them. A reading of the sheet the design
      // leaves out joins the block whose equipment is nearest its pad, so every reading still shows.
      const listed = new Set(design.blocks.flatMap((b) => b.rows.map(([t]) => t)));
      const anchor = (b: (typeof design.blocks)[number]): [number, number] => b.leader ?? [b.box[0] + b.box[2] / 2, b.box[1] + b.box[3] / 2];
      const extra = new Map<number, string[]>();
      for (const t of visibleTags) {
        if (listed.has(t) || averages?.[t]?.tags.every((m) => listed.has(m)) || !pads[t]) continue;
        let best = 0;
        design.blocks.forEach((b, i) => {
          const [ax, ay] = anchor(b);
          const [bx, by] = anchor(design.blocks[best]);
          if (Math.hypot(ax - pads[t][0], ay - pads[t][1]) < Math.hypot(bx - pads[t][0], by - pads[t][1])) best = i;
        });
        extra.set(best, [...(extra.get(best) ?? []), t]);
      }
      const all: Array<ReturnType<typeof pointOf>> = [];
      const groups: PartGroup[] = [];
      const boxes = new Map<string, [number, number, number, number]>();
      design.blocks.forEach((b, i) => {
        const pts = [...b.rows.map(([t, label]) => pointOf(t, label)), ...(extra.get(i) ?? []).map((t) => pointOf(t))].filter(shown);
        if (!pts.length) return;
        all.push(...pts);
        const id = `d:${b.title}`;
        const padded = pts.filter((p) => Number.isFinite(p.px));
        boxes.set(id, b.box);
        groups.push({
          id,
          name: b.title,
          head: true,
          rows: pts.map((p) => p.row),
          pads: padded.length ? padded.map((p) => [p.px, p.py]) : [anchor(b)],
          leader: b.leader,
        });
      });
      return { groups, pads: all.filter((p) => Number.isFinite(p.px)).map((p): [number, number] => [p.px, p.py]), design: boxes };
    }
    const points = visibleTags
      .filter((t) => pads[t])
      .map((tag) => pointOf(tag))
      .filter(shown);
    const byPart = new Map<string, typeof points>();
    for (const p of points) {
      const key = p.part?.id ?? `tag:${p.tag}`;
      byPart.set(key, [...(byPart.get(key) ?? []), p]);
    }
    const groups: PartGroup[] = [];
    for (const [key, pts] of byPart) {
      // One block per piece of equipment: a part spread over the sheet (three fans, a tyre on the shell and its
      // station plan below) gets one block per cluster of pads, beside where it is measured.
      // A combined sheet (several machines, twice the readings) keeps one block per part: fewer headers, so its
      // readings fit the canvas at full size.
      const clusters = composed ? [pts] : clusterPads(pts, Math.min(sheetW, 1654) / 22);
      clusters.forEach((cluster, k) => {
        const name = clusterTitle(cluster[0].part?.name ?? "", cluster.map((p) => p.row.label), clusters.length === 1);
        groups.push({ id: `${key}#${k}`, name, rows: cluster.map((p) => p.row), pads: cluster.map((p) => [p.px, p.py]) });
      });
    }
    return { groups, pads: points.map((p): [number, number] => [p.px, p.py]), design: null };
  }, [isStage, art, visibleTags, resolveTag, nameMode, prefs.readings, hiddenParts, sheetW, composed, averages]);

  const [measuredPx, wrapRef, canvasAspect] = usePxPerUnit(artBox);
  // The canvas in screen px (UI zoom divided out), from the drawing's fitted scale and the canvas shape.
  // Rounded to 24 px steps: the first measurements settle by a few px, and each change re-runs the layout.
  const canvasRawW = measuredPx && canvasAspect ? (canvasAspect >= artBox[2] / artBox[3] ? measuredPx * artBox[3] * canvasAspect : measuredPx * artBox[2]) : null;
  const canvasW = canvasRawW ? Math.round(canvasRawW / 24) * 24 : null;
  const canvasH = canvasRawW && canvasAspect ? Math.round(canvasRawW / canvasAspect / 24) * 24 : null;
  const readingPx = READING_PX[prefs.size];
  // Block sizes on screen at the reading size; the layout keys on them (not on the values, whose widths are held
  // in steps), so a 30 s value update keeps every block where it is and only refreshes its rows.
  const pm = useMemo(() => blockMetrics(readingPx), [readingPx]);
  const sizeSig = useMemo(
    () =>
      blockGroups
        ? blockGroups.groups.map((g) => {
            const m = measureBlock(g, pm);
            return `${g.id}:${m.w.toFixed(0)}x${m.h.toFixed(0)}`;
          }).join("|")
        : "",
    [blockGroups, pm],
  );
  const groupsRef = useRef(blockGroups);
  groupsRef.current = blockGroups;
  const pinnedBlocks = layout?.blocks;
  // Stage sheets: the drawing is drawn as large as its readings allow. The blocks need a fixed area on screen at
  // the reading size; the drawing gives up just enough of the canvas for them (counting part of its own empty
  // space, where blocks may also sit), and never less than MIN_DRAWING of its fitted size — past that, blocks rest
  // on quiet parts of the drawing. The frame is the whole canvas in sheet units: drawing, blocks and canvas share
  // one scale.
  const plan = useMemo(() => {
    const bg = groupsRef.current;
    // Laid out once the drawing's busy map is in (a layout without it would only be redone).
    if (!isStage || !canvasW || !canvasH || !bg || !sizeSig || !busy || !box) return null;
    const [x, y, w, h] = artBox;
    const gap = pm.rowH * 0.5;
    let need = 0;
    // The drawing moves away from where most readings are (a cooler's fans along its bottom: the drawing goes
    // up), so the crowded side gets the room: the blocks' area-weighted pad centre, as a share of the drawing,
    // shifts the frame within its slack.
    let vx = 0;
    let vy = 0;
    let total = 0;
    for (const g of bg.groups) {
      const m = measureBlock(g, pm);
      const area = m.w * m.h;
      need += (m.w + gap) * (m.h + gap);
      vx += (area * (g.pads.reduce((a2, p) => a2 + p[0], 0) / g.pads.length - (x + w / 2))) / w;
      vy += (area * (g.pads.reduce((a2, p) => a2 + p[1], 0) / g.pads.length - (y + h / 2))) / h;
      total += area;
    }
    const free = 1 - busy.cover(x, y, x + w, y + h);
    const room = (canvasW * canvasH - PACKING * need) / (w * h * (1 - INSIDE_USE * free));
    const fit = Math.min(canvasW / (w * 1.02), canvasH / (h * 1.02));
    const designFrame = art?.readouts?.frame;
    const designScale = art?.readouts?.scale ?? 1;
    // A designed sheet starts from its whole design on the canvas and gives way from there.
    const designFit = designFrame ? Math.min(canvasW / designFrame[2], canvasH / designFrame[3]) : 0;
    const minSc = designFrame ? designFit * MIN_DESIGN : fit * (composed ? MIN_COMBINED : MIN_DRAWING);
    const shift = (v: number, slack: number) => Math.max(-slack / 2, Math.min(slack / 2, (total ? (2 * v) / total : 0) * slack));
    /**
     * A designed block's spot on this canvas: the design's frame stretched to the canvas, each block keeping its
     * distance (as a share of the frame) from the frame edges nearest it, so a larger reading size grows a block
     * toward the drawing and a wider canvas moves the side columns out.
     */
    const preferred = (g: PartGroup, frame: [number, number, number, number], m: BlockMetrics): PartGroup => {
      const b = bg.design?.get(g.id);
      if (!b || !designFrame) return g;
      const [mx, my, mw, mh] = designFrame;
      const size = measureBlock(g, m);
      const kx = frame[2] / mw;
      const ky = frame[3] / mh;
      const left = b[0] + b[2] / 2 < mx + mw / 2;
      const top = b[1] + b[3] / 2 < my + mh / 2;
      const px = left ? frame[0] + (b[0] - mx) * kx : frame[0] + (b[0] + b[2] - mx) * kx - size.w;
      const py = top ? frame[1] + (b[1] - my) * ky : frame[1] + (b[1] + b[3] - my) * ky - size.h;
      return { ...g, prefer: [px, py] };
    };
    /** The frame (whole canvas, sheet units) with the drawing at `sc` px per unit, the readings at `k` × the size. */
    const layoutAt = (sc: number, k: number, coarse: boolean) => {
      const fw = canvasW / sc;
      const fh = canvasH / sc;
      // A designed sheet keeps its design's centre, moved only as far as needed to keep the whole drawing on the canvas.
      const keep = (c: number, a: number, aw: number, f: number) => (f <= aw ? a + aw / 2 : Math.min(a + f / 2, Math.max(a + aw - f / 2, c)));
      const cx = designFrame ? keep(designFrame[0] + designFrame[2] / 2, x, w, fw) : x + w / 2 + shift(vx, fw - w);
      const cy = designFrame ? keep(designFrame[1] + designFrame[3] / 2, y, h, fh) : y + h / 2 + shift(vy, fh - h);
      const frame: [number, number, number, number] = [cx - fw / 2, cy - fh / 2, fw, fh];
      const m = blockMetrics((readingPx * k * designScale) / sc);
      const pad = m.rowH * 0.5;
      const space: [number, number, number, number] = [frame[0] + pad, frame[1] + pad, fw - 2 * pad, fh - 2 * pad];
      const groups = designFrame ? bg.groups.map((g) => preferred(g, frame, m)) : bg.groups;
      return { sc, frame, m, layout: layoutPartBlocks(groups, frame, space, m, busy, bg.pads, pinnedBlocks, { coarse }) };
    };
    // Readings keep the operator's size first: the drawing gives way, step by step from its fitted size (or a
    // little above the estimate of what fits) down to its floor, until no block overlaps another and the blocks
    // keep off the equipment. Only a sheet whose readings do not fit even then (a combined sheet on a short
    // screen) has its readings step down. Quick trials choose; the full layout runs once and is checked again.
    const tries: Array<[number, number]> = [];
    // A designed sheet starts from its drawing as large as the canvas allows (the design's margins are what a 16:9
    // screen leaves; a wider or busier canvas may need less), and gives way step by step until its blocks fit.
    const start = designFrame ? Math.max(designFit, fit * 0.85) : Math.min(fit, Math.max(minSc, room > 0 ? Math.sqrt(room) * 1.12 : minSc));
    // Designed sheets trade a step of reading size for drawing size: at each drawing size the readings may come down to
    // DESIGN_READING_MIN before the drawing gives way, so the equipment stays large.
    for (let sc = start; sc > minSc * 1.001; sc *= DRAWING_STEP) for (const k of designFrame ? [1, DESIGN_READING_MIN] : [1]) tries.push([sc, k]);
    for (const k of READING_STEPS) tries.push([minSc, k]);
    /** Share of the blocks' area lying on drawn equipment (lines and bodies). */
    const buried = (blocks: PlacedBlock[]) => {
      let on = 0;
      let all = 0;
      for (const b of blocks) {
        const area = b.w * b.h;
        on += area * busy.cover(b.x, b.y, b.x + b.w, b.y + b.h);
        all += area;
      }
      return all ? on / all : 0;
    };
    // Quick trials, largest drawing first: the first with readings at full size, no block on another and the
    // blocks (mostly) off the equipment wins; failing that, the full-size trial burying the least; only past
    // that do the readings step down (first trial without overlaps).
    let pick = -1;
    let least: { i: number; buried: number } | null = null;
    let nearly = -1;
    for (let i = 0; i < tries.length; i++) {
      const [tsc, k] = tries[i];
      // A designed sheet keeps its blocks off the equipment first: its readings step down before they would bury it.
      if (k < 1 && least && !designFrame) break;
      const blocks = layoutAt(tsc, k, true).layout.blocks;
      if (blocksOverlap(blocks)) continue;
      if (k < 1 && !designFrame) {
        pick = i;
        break;
      }
      const b = buried(blocks);
      if (b <= (designFrame ? DESIGN_BURY_MAX : BURY_MAX)) {
        pick = i;
        break;
      }
      if (!least || b < least.buried) least = { i, buried: b };
      // A designed sheet that cannot keep fully clear takes the largest drawing that keeps nearly clear.
      if (designFrame && nearly < 0 && b <= BURY_MAX) nearly = i;
    }
    if (pick < 0) pick = nearly >= 0 ? nearly : least?.i ?? tries.length - 1;
    let chosen = layoutAt(tries[pick][0], tries[pick][1], false);
    // The full layout can settle differently from the quick trial: a designed sheet whose blocks then cover its equipment
    // takes the next smaller drawing (up to ten steps).
    const misfit = (c: typeof chosen) => blocksOverlap(c.layout.blocks) || (Boolean(designFrame) && buried(c.layout.blocks) > BURY_MAX);
    for (let i = pick + 1, n = 0; i < tries.length && misfit(chosen) && n < 10; i++, n++) chosen = layoutAt(tries[i][0], tries[i][1], false);
    const { sc, frame } = chosen;
    return { sc, frame, m: chosen.m, layout: chosen.layout };
  }, [isStage, canvasW, canvasH, sizeSig, artBox, busy, box, readingPx, pm, pinnedBlocks, composed, art]);
  const frameBox = plan?.frame ?? artBox;
  const pxPerUnit = plan ? plan.sc : measuredPx;

  /** A block opens its first member; a member selected elsewhere lights its block. */
  const selectTag = (tag: string) => onSelectTag(averages?.[tag]?.tags[0] ?? tag);
  const selectedKey = selectedTag ? blockFor(selectedTag) ?? selectedTag : null;
  const stageWidth = useCallback(
    (tag: string, sz: number) => pillContentWidth(pillContentOf(resolveTag(tag), nameMode), sz),
    [resolveTag, nameMode],
  );
  // Stage sheets show their readings as one readout block per part (part-blocks.tsx), so the layout of
  // single plates runs only for the other sheet kinds.
  const stage = useStageLayout(art, [], artBox, pxPerUnit, stageWidth, canvasAspect);
  // Block text at the operator's reading size on screen.
  const bm = useMemo(
    () => plan?.m ?? blockMetrics(stageMetrics(pxPerUnit, sheetW, visibleTags.length, readingPx).fontSz),
    [plan, pxPerUnit, sheetW, visibleTags.length, readingPx],
  );
  // The kept layout with each block's rows as they read now.
  const blockLayout = useMemo(() => {
    if (!plan || !blockGroups) return null;
    const byId = new Map(blockGroups.groups.map((g) => [g.id, g]));
    return { ...plan.layout, blocks: plan.layout.blocks.map((b) => ({ ...b, group: byId.get(b.group.id) ?? b.group })) };
  }, [plan, blockGroups]);
  const blockOfTag = useMemo(() => {
    const map = new Map<string, (typeof blockLayout extends null ? never : NonNullable<typeof blockLayout>)["blocks"][number]>();
    for (const b of blockLayout?.blocks ?? []) for (const r of b.group.rows) map.set(r.tag, b);
    return map;
  }, [blockLayout]);
  // Stage sheets carry no part areas, so the hovered part is the equipment around its own pads: the traced
  // outline within a square about each pad, in the part's worst status colour.
  const hotBlock = hoverPart ? blockLayout?.blocks.find((b) => b.group.id === hoverPart) ?? null : null;
  const hotOwners = useMemo<OutlineOwner[]>(() => {
    if (!hotBlock) return [];
    const rows = hotBlock.group.rows;
    const tone = rows.some((r) => r.tone === "bad") ? "bad" : rows.some((r) => r.tone === "warn") ? "warn" : rows.some((r) => r.tone === "good") ? "good" : null;
    const r = (60 * sheetW) / 1654;
    return hotBlock.group.pads.map(([x, y]) => ({ box: [x - r, y - r, 2 * r, 2 * r], tone }));
  }, [hotBlock, sheetW]);
  // Readings in alarm, tied to their sensor: a line from the row to the pad, a ring on the pad (blinking while
  // Critical) and the equipment round the pad outlined in the status colour — whatever readings show.
  const alarmPads = useMemo(() => {
    if (!prefs.alarmLinks || !art) return [];
    return visibleTags.flatMap((tag) => {
      const pad = art.pads[tag];
      const res = resolveTag(tag);
      if (!pad || (res.tone !== "warn" && res.tone !== "bad")) return [];
      return [{ tag, pad, tone: res.tone as "warn" | "bad" }];
    });
  }, [prefs.alarmLinks, art, visibleTags, resolveTag]);
  const alarmOwners = useMemo<OutlineOwner[]>(
    () => alarmPads.map(({ pad: [x, y], tone }) => ({ box: [x - ALARM_REACH, y - ALARM_REACH, 2 * ALARM_REACH, 2 * ALARM_REACH], tone })),
    [alarmPads],
  );
  const titleOf = (tag: string) => {
    const res = resolveTag(tag);
    return `${displayName(res.name)}: ${res.display} ${res.unit} (normal ${res.normalBand}; changing ${res.rocMinDisplay})`;
  };
  /** Pads of a stage sheet: every visible point on its authored pad. */
  const stagePads = useMemo(() => (isStage && art ? visibleTags.filter((t) => art.pads[t]).map((tag) => ({ tag, px: art.pads[tag][0], py: art.pads[tag][1] })) : []), [isStage, art, visibleTags]);
  const isDenseLine = visibleTags.length > 80 && !isStage;
  const isDetailSheet = meta?.kind === "detail";
  // The line sheet carries few points over a wide drawing: larger blocks, read across the room.
  const isLineSheet = meta?.kind === "line";
  const sm = stage.metrics;
  // Other sheets size their plates in sheet units, scaled by the operator's reading size.
  const fontSz = isStage ? sm.fontSz : (isDetailSheet ? 15.5 : isDenseLine ? 7.8 : isLineSheet ? 10 : 8.6) * sizeK;
  const padW = (isDetailSheet ? 22 : isDenseLine ? 10 : 14) * sizeK;
  const cardH = (isDetailSheet ? 26.5 : isDenseLine ? 14.5 : isLineSheet ? 18 : 16) * sizeK;
  const padR = isStage ? sm.padR : isDetailSheet ? 7.5 : isDenseLine ? 4.5 : 5.5;
  const padScale = isStage ? sm.padScale : isDetailSheet ? 1.15 : isDenseLine ? 0.65 : 0.85;
  const cardRx = isStage ? sm.rx : isDetailSheet ? 6 : 4;
  const textDy = isStage ? sm.textDy : isDetailSheet ? 5.2 : isLineSheet ? 3.5 : 2.9;

  // Compute callout card positions directly on top of every mapped dot
  const auto = useMemo(() => {
    if (isStage) return null;
    return layoutSensorCallouts(
      visibleTags.map((tag) => {
        const content = pillContentOf(resolveTag(tag), nameMode);
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
  }, [isStage, visibleTags, activePads, artBox, resolveTag, nameMode, fontSz, padW, cardH, padR, isDetailSheet]);
  const { callouts, viewBox: stageVb } = auto ?? stage;
  const vb = blockLayout?.viewBox ?? stageVb;

  if (!art || !meta) return null;
  const Art = art.Art;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1 && e.button !== 1) return;
    if ((e.target as HTMLElement).closest("button, [role='button']")) return;
    setPanning(true);
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  /** Arrange mode: a machine or block is grabbed; it follows the pointer (in sheet units) until let go. */
  const grab = (kind: "piece" | "block", id: string) => (e: React.PointerEvent<SVGElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const ctm = (e.currentTarget as SVGGraphicsElement).ownerSVGElement?.getScreenCTM();
    grabRef.current = { x0: e.clientX, y0: e.clientY, k: ctm ? Math.hypot(ctm.a, ctm.b) || 1 : 1 };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ kind, id, dx: 0, dy: 0 });
  };
  const dropGrab = (commit: boolean) => {
    const d = drag;
    grabRef.current = null;
    setDrag(null);
    if (!commit || !d || (Math.abs(d.dx) < 1 && Math.abs(d.dy) < 1)) return;
    if (d.kind === "piece") {
      const cur = art?.arrange?.offsets[d.id] ?? [0, 0];
      onMovePiece?.(d.id, [cur[0] + d.dx, cur[1] + d.dy]);
    } else {
      const b = blockLayout?.blocks.find((x) => x.group.id === d.id);
      if (b) onMoveBlock?.(d.id, [b.x + d.dx, b.y + d.dy]);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = grabRef.current;
    if (g && drag) {
      setDrag({ ...drag, dx: (e.clientX - g.x0) / g.k, dy: (e.clientY - g.y0) / g.k });
      return;
    }
    if (!panning || !dragRef.current) return;
    onChangePan({
      x: dragRef.current.px + (e.clientX - dragRef.current.x),
      y: dragRef.current.py + (e.clientY - dragRef.current.y),
    });
  };

  const onPointerUp = () => {
    if (grabRef.current) dropGrab(true);
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

  const padLayer = (isStage ? stagePads : callouts).map((c) => {
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
                    <MachinePad x={0} y={0} status={res.status} selected={isHot} scale={padScale} quiet />
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
      onPointerCancel={() => {
        dropGrab(false);
        onPointerUp();
      }}
      onWheel={onWheel}
      onDoubleClick={arranging ? undefined : onResetView}
      data-arranging={arranging || undefined}
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
              {Object.entries(art.links).flatMap(([mId, link]) => (art.areas?.[mId] ?? [link]).map((b, i) => [mId, b, i] as const)).map(([mId, [x, y, w, h], i]) => {
                const unitLabel = unitName?.(mId) ?? mId;
                return (
                  <g
                    key={`${mId}-${i}`}
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

          {/* Arrange mode: each machine of a composed sheet is a frame the operator drags (flows follow on drop). */}
          {arranging && art.arrange && (
            <g className="opc-arrange-pieces">
              {art.arrange.pieces.map((p) => {
                const d = drag?.kind === "piece" && drag.id === p.id ? drag : null;
                const [x, y, w, h] = p.box;
                const u = 1 / (pxPerUnit || 1);
                return (
                  <g key={p.id} transform={d ? `translate(${d.dx} ${d.dy})` : undefined}>
                    <rect
                      className="opc-arrange-piece"
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx={6 * u}
                      strokeWidth={1.5 * u}
                      strokeDasharray={`${6 * u} ${4 * u}`}
                      data-dragging={d ? true : undefined}
                      onPointerDown={grab("piece", p.id)}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Readings in alarm on sheets without readout blocks: a ring on the pad (blinking while Critical) and the
              equipment round it outlined. */}
          {!blockLayout && alarmPads.length > 0 && !isLineSheet && (
            <g className="opc-alarm-links" pointerEvents="none" aria-hidden="true">
              <g style={{ ["--mx-health-w" as string]: 1.6 }}>
                <HealthOutline art={art} owners={alarmOwners} mute={false} />
              </g>
              {alarmPads.map(({ tag, pad: [x, y], tone }) => (
                <circle
                  key={tag}
                  className={tone === "bad" ? "opc-blink" : undefined}
                  cx={x}
                  cy={y}
                  r={padR * 2}
                  fill="none"
                  stroke={linkColor(tone)}
                  strokeWidth={Math.max(1.4, padR * 0.35)}
                />
              ))}
            </g>
          )}

          {/* Sensor pads (stage sheets: on top of their embedded plates) */}
          {!isStage && padLayer}

          {/* Stage sheets: one readout block per part, beside its pads; the hovered or selected row is linked to its pad. */}
          {blockLayout && (
            <g className="opc-part-blocks">
              {/* Readings in alarm: each row tied to its pad by a line in its status colour, under the blocks. */}
              {alarmPads.length > 0 && (
                <g className="opc-alarm-links" pointerEvents="none" aria-hidden="true">
                  {alarmPads.map(({ tag, pad, tone }) => {
                    const b = blockOfTag.get(tag);
                    if (!b || (drag?.kind === "block" && drag.id === b.group.id)) return null;
                    const link = rowLeader(b, tag, pad, bm);
                    if (!link) return null;
                    const w = bm.fontSz * 0.14;
                    const color = linkColor(tone);
                    return (
                      <g key={tag}>
                        <path d={link.d} fill="none" stroke={MX.padPanel} strokeWidth={w * 3.2} strokeLinejoin="round" strokeLinecap="round" />
                        <path d={link.d} fill="none" stroke={color} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" />
                        <circle cx={link.start[0]} cy={link.start[1]} r={w * 1.7} fill={color} />
                      </g>
                    );
                  })}
                </g>
              )}
              {/* Designed sheets: each block's dashed leader to its equipment, under the blocks. */}
              <g className="opc-block-leaders" pointerEvents="none" aria-hidden="true">
                {blockLayout.blocks.map((b) => {
                  const d = drag?.kind === "block" && drag.id === b.group.id ? drag : null;
                  const ln = blockLeader(d ? { ...b, x: b.x + d.dx, y: b.y + d.dy } : b);
                  if (!ln) return null;
                  return (
                    <line
                      key={b.group.id}
                      x1={ln[0]}
                      y1={ln[1]}
                      x2={ln[2]}
                      y2={ln[3]}
                      stroke={MX.label}
                      strokeWidth={bm.fontSz * 0.065}
                      strokeDasharray={`${bm.fontSz * 0.3} ${bm.fontSz * 0.24}`}
                      opacity={hotBlock && hotBlock !== b ? 0.15 : 0.6}
                    />
                  );
                })}
              </g>
              {blockLayout.blocks.map((b) => {
                const d = drag?.kind === "block" && drag.id === b.group.id ? drag : null;
                return (
                  <g key={b.group.id} transform={d ? `translate(${d.dx} ${d.dy})` : undefined}>
                    <PartBlock
                      block={b}
                      m={bm}
                      hoverTag={hoverTag}
                      selectedTag={selectedKey}
                      partHot={hoverPart === b.group.id}
                      dimmed={Boolean(hotBlock) && hotBlock !== b}
                      onHover={setHoverTag}
                      onHoverPart={setHoverPart}
                      onSelect={selectTag}
                      titleOf={titleOf}
                      onGrab={arranging ? grab("block", b.group.id) : undefined}
                    />
                  </g>
                );
              })}
              {/* Hovered block header: the other blocks fade back and its part is outlined and its pads ringed above
                  them, so no block hides it; a copy of the hovered block sits on top (the original keeps the pointer).
                  The trace stays mounted so the hover is instant. */}
              <g style={{ ["--mx-health-w" as string]: 1.8 }}>
                <HealthOutline art={art} owners={hotBlock ? hotOwners : alarmOwners} mute={false} />
              </g>
              {/* Pads of readings in alarm: a ring above the blocks, blinking while Critical. */}
              {alarmPads.map(({ tag, pad: [x, y], tone }) => (
                <g key={`ring-${tag}`} pointerEvents="none" aria-hidden="true">
                  <circle cx={x} cy={y} r={bm.fontSz * 0.95} fill="none" stroke={MX.padPanel} strokeWidth={bm.fontSz * 0.42} />
                  <circle className={tone === "bad" ? "opc-blink" : undefined} cx={x} cy={y} r={bm.fontSz * 0.95} fill="none" stroke={linkColor(tone)} strokeWidth={bm.fontSz * 0.2} />
                </g>
              ))}
              {hotBlock && !arranging && (
                <g pointerEvents="none" aria-hidden="true">
                  {hotBlock.group.pads.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r={bm.fontSz * 0.95} fill="none" stroke={linkColor(hotBlock.group.rows[i]?.tone ?? "idle")} strokeWidth={bm.fontSz * 0.24} />
                  ))}
                  <PartBlock block={hotBlock} m={bm} hoverTag={hoverTag} selectedTag={selectedKey} partHot dimmed={false} onHover={() => {}} onHoverPart={() => {}} onSelect={() => {}} titleOf={titleOf} />
                </g>
              )}
              {/* The link, above the blocks and the drawing, in the reading's status colour (Normal green, Alert amber,
                  Critical red): a line on a halo, a dot at the row, a ring on the pad. */}
              {(hoverTag ?? selectedKey) &&
                (() => {
                  const tag = hoverTag ?? selectedKey!;
                  const b = blockOfTag.get(tag);
                  const pad = art.pads[tag];
                  if (!b || !pad) return null;
                  const link = rowLeader(b, tag, pad, bm);
                  const w = bm.fontSz * 0.2;
                  const color = linkColor(resolveTag(tag).tone);
                  return (
                    <g pointerEvents="none" aria-hidden="true">
                      {link && (
                        <>
                          <path d={link.d} fill="none" stroke={MX.padPanel} strokeWidth={w * 3.2} strokeLinejoin="round" strokeLinecap="round" />
                          <path d={link.d} fill="none" stroke={color} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" />
                          <circle cx={link.start[0]} cy={link.start[1]} r={w * 1.6} fill={color} />
                        </>
                      )}
                      <circle cx={pad[0]} cy={pad[1]} r={bm.fontSz * 0.95} fill="none" stroke={MX.padPanel} strokeWidth={w * 3} />
                      <circle cx={pad[0]} cy={pad[1]} r={bm.fontSz * 0.95} fill="none" stroke={color} strokeWidth={w * 1.2} />
                    </g>
                  );
                })()}
            </g>
          )}

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
            const abnormal = res.status !== "Normal";
            const showCard =
              isHot ||
              ((pointLabelMode === "value" || pointLabelMode === "tag-value") && (abnormal || !(res.part && hiddenParts.has(res.part.id)))) ||
              (pointLabelMode === "alerts" && abnormal);
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
                  content={pillContentOf(res, nameMode)}
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

          {/* Arrange mode: each machine's name, on its frame's top edge above the readout blocks, is a handle
              that always shows (a frame may be covered by blocks). */}
          {arranging && art.arrange && (
            <g className="opc-arrange-handles">
              {art.arrange.pieces.map((p) => {
                const d = drag?.kind === "piece" && drag.id === p.id ? drag : null;
                const u = 1 / (pxPerUnit || 1);
                const name = unitName?.(p.id) ?? p.id;
                const fs = 12 * u;
                const hw = textWidth(name, fs, 600, 0.01) + 22 * u;
                const hh = 22 * u;
                const [x, y, w] = p.box;
                const hx = Math.max(x, x + w / 2 - hw / 2);
                return (
                  <g key={p.id} transform={d ? `translate(${d.dx} ${d.dy})` : undefined} className="opc-arrange-handle" onPointerDown={grab("piece", p.id)}>
                    <rect x={hx} y={y - hh / 2} width={hw} height={hh} rx={hh / 2} strokeWidth={1.2 * u} />
                    <path d={`M ${hx + 8 * u} ${y - 3 * u} h ${6 * u} M ${hx + 8 * u} ${y} h ${6 * u} M ${hx + 8 * u} ${y + 3 * u} h ${6 * u}`} strokeWidth={1.2 * u} />
                    <text x={hx + 18 * u} y={y + fs * 0.36} fontSize={fs} fontWeight={600}>
                      {name}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Alert popups over the component / sensor that raised them, above everything else. */}
          {alerts && alerts.length > 0 && (alertPopups?.show ?? true) && !arranging && (
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
  // No machine yet because the plant (its data or its tree) is still loading: say so, never "no drawing".
  const { hasLoaded } = useIndustrialData();
  const { isLoading: treeLoading } = useHierarchyData();
  if (!machine) {
    return (
      <div className="opc-svg-wrap">
        {hasLoaded && !treeLoading ? <span className="opc-no-data">No drawing for this machine yet</span> : <Loading label="Loading the plant…" />}
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

