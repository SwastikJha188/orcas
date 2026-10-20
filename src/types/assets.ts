/**
 * Asset read models served by /api/machines, /api/hierarchy, /api/signals,
 * /api/catalog, /api/trends, /api/diagnosis, /api/history and /api/racks.
 * Every value comes from the database or is calculated from stored readings;
 * a value that is not known is null, never a placeholder.
 */
import type { PyroDiagramType } from "@/lib/pyro-sim/signals";

export type ConditionSeverity = "Normal" | "Alert" | "Critical";

/**
 * A manual service state (Standby, Maintenance), or the evaluated condition
 * while in service; "No data" when no current reading supports an assessment
 * (a silent machine must never look healthy).
 */
export type MachineStatus = "Operational" | "Alert" | "Critical" | "Standby" | "Maintenance" | "No data";

export interface HierarchyNode {
  id: string;
  name: string;
  type: "plant" | "area" | "group" | "machine";
  machineId?: string;
  status?: MachineStatus;
  /** Latest Machine Health Index (machines only); absent when not yet evaluated. */
  health?: number;
  /** Plants only: IANA time zone of the site (e.g. "Africa/Lusaka"). Areas and machines inherit it. */
  timeZone?: string | null;
  children?: HierarchyNode[];
}

export interface MachineComponentPart {
  id: string;
  name: string;
  /** 0–100, null until the evaluation has scored it. */
  health: number | null;
  status: ConditionSeverity | null;
  bbox: { x: number; y: number; width: number; height: number };
  criticalNotes?: string;
}

export interface DiagramHotspot {
  id: string;
  label: string;
  parameter: string;
  value: string;
  unit: string;
  status: ConditionSeverity;
  x: number; // percentage
  y: number; // percentage
  component: string;
  criticalNotes?: string;
}

export interface AssetMachine {
  id: string;
  name: string;
  plantId?: string;
  area: string;
  processCell: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  commissioned: string;
  location: string;
  coordinates: string;
  powerRating: string;
  operatingSpeed: string;
  criticality: "A (Critical)" | "B (Essential)" | "C (General)";
  status: MachineStatus;
  /** Latest Machine Health Index, null until the machine has been evaluated. */
  health: number | null;
  sapEquipmentId: string | null;
  floc: string | null;
  costCenter: string | null;
  plant: string;
  workCenter: string | null;
  activeWorkOrder?: string;
  signalsCount: number;
  /** Health model the machine is scored with (its bands give the status of a score). */
  healthModelId: string | null;
  /** Drawing kind: the original five schematics, or a pyro-line drawing (`pyroDrawingForType`). */
  diagramType: "mill" | "crusher" | "pump" | "blower" | "kiln" | PyroDiagramType;
  parts: MachineComponentPart[];
  hotspots: DiagramHotspot[];
}

export interface MappedSignal {
  id: string;
  machineId: string;
  tag: string;
  instrument: string;
  sensorType: string;
  edgeRack: string;
  cardSlot: string;
  modbusAddress: string;
  currentValue: string;
  unit: string;
  /** Share of usable readings over the last hour ("97% Good"), or "No data". */
  quality: string;
  sampleRate: string;
  status: ConditionSeverity;
}

export interface OperatingEvent {
  id: string;
  machineId: string;
  /** ISO 8601 time the event occurred. */
  timestamp: string;
  type: "Telemetry Alert" | "Maintenance Log" | "Operating Change" | "Inspection";
  severity: ConditionSeverity;
  title: string;
  description: string;
  source: string;
}

export interface SapEquipmentRecord {
  machineId: string;
  sapNumber: string;
  floc: string;
  description: string;
  plant: string;
  workCenter: string;
  costCenter: string;
  activeWorkOrder?: string;
  nextScheduledPm: string;
  syncState: "Synced" | "Pending Approval";
}

export interface SpectralFinding {
  id: string;
  fault: string;
  /** Only an analysis that estimates probabilities sets this; the rule and limit evaluation does not. */
  probability: number | null;
  location: string;
  frequency: string;
  severity: ConditionSeverity;
  recommendation: string;
}

export interface DiagnosisRecord {
  machineId: string;
  overallCondition: "Nominal" | "Alert" | "Critical" | "No data";
  /** Share of the machine's measurements with a current valid reading (%), null without readings. */
  confidence: number | null;
  engineVersion: string;
  summary: string;
  findings: SpectralFinding[];
  peakFrequencies: Array<{ name: string; freq: string; amplitude: string; status: "Normal" | "Elevated" }>;
  /** Name of the work-order priority the condition calls for. */
  maintenancePriority: string;
  prescriptiveAction: string;
}

export interface TrendMetricConfig {
  key: string;
  label: string;
  unit: string;
  /** Expected value of the accepted reference, null without one. */
  baseline: number | null;
  advisoryLimit: number | null;
  criticalLimit: number | null;
  stats: {
    mean: string;
    peak: string;
    crestFactor: string;
    kurtosis: string;
    drift30d: string;
  };
  /** `time` is the ISO acquisition time of the reading. */
  points: Array<{ time: string; value: number }>;
}

export interface MachineTrendRecord {
  machineId: string;
  metrics: TrendMetricConfig[];
}

export interface RackSlotCard {
  slotNumber: number;
  cardModel: string;
  moduleType: string;
  channelCount: number;
  connectedProbes: string;
  sampleRate: string;
}

export interface RackChassisRecord {
  machineId: string;
  primaryRack: {
    rackId: string;
    name: string;
    cabinetLocation: string;
    ipAddress: string;
    protocol: string;
    firmware: string;
  };
  slots: RackSlotCard[];
}
