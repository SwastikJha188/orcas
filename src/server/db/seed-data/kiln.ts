/**
 * ULTRON Canonical Single Source of Truth — KLN-01 Rotary Kiln
 *
 * This module is the ONLY place where KLN-01 sensor / system / sub-assembly
 * counts are defined. Every page (Overview, Machine Sensor Mapping,
 * Component Health, Diagnosis Overview, Trends, Rack) AND the PostgreSQL
 * seed MUST derive from here, so counts can never drift again.
 *
 * Canonical truth (aligned to D4/D5 spec + assets-data hotspots):
 * - 4 systems (DRV, SUP, SHL, PRC) — shown in Overview as dotted boxes
 * - 15 sub-assemblies — shown in Component Health
 * - 46 sensors (17 + 15 + 5 + 9) — shown in Sensor Mapping, Diagnosis, Trends, Rack
 */

import { KILN_ALL_HOTSPOTS } from "@/components/assets/assets-data";
import { KILN_SENSOR_CATALOG } from "./kiln-sensor-catalog";
import { fallbackDiagnostics, systemForTag, type SystemId } from "@/components/assets/kiln-diagnostics";

export type { SystemId };

export interface CanonicalSystem {
  id: SystemId;
  name: string;
  shortName: string;
  health: number;
  status: "Normal" | "Advisory" | "Critical";
  bbox: { x: number; y: number; width: number; height: number };
}

export interface CanonicalSubassembly {
  id: string;
  systemId: SystemId;
  systemName: string;
  name: string;
  shortName: string;
  health: number;
  status: "Normal" | "Advisory" | "Critical";
  criticality: "A" | "Context";
  /** Primary sensor tags owned by this sub-assembly (unique partition, no duplicates). */
  sensorTags: string[];
}

export interface CanonicalSensor {
  tag: string;
  id: string;
  name: string;
  systemId: SystemId;
  systemName: string;
  subassemblyId: string;
  subassemblyName: string;
  component: string;
  position: string;
  /** D5 measurement point (P1…P6 numbered per sub-assembly diagram). */
  point: string;
  unit: string;
  value: string;
  numericValue: number;
  status: "Normal" | "Advisory" | "Critical";
  x: number;
  y: number;
  instrument: string;
  sensorType: string;
  rackId: string;
  cardId: string;
  modbusAddress: string;
  sampleRate: string;
  source: "New" | "Existing" | "Calculated";
  priority: "Required" | "Optional-High";
  accuracy: string;
  range: string;
  normalThreshold: string;
  warningThreshold: string;
  alarmThreshold: string;
  warningVal: number;
  alarmVal: number;
  maxScale: number;
  nominalBand: string;
  standard: string;
  defaultBaseline: number;
}

// ---------------------------------------------------------------------------
// 4 systems — must match ASSET_MACHINES KLN-01 parts (Overview dotted boxes)
// ---------------------------------------------------------------------------
export const KLN_SYSTEMS: CanonicalSystem[] = [
  {
    id: "DRV-KLN-01",
    name: "Drive Train DRV-KLN-01 (630 kW)",
    shortName: "Drive Train",
    health: 97,
    status: "Normal",
    bbox: { x: 335, y: 98, width: 175, height: 215 },
  },
  {
    id: "SUP-KLN-01",
    name: "Support & Thrust SUP-KLN-01",
    shortName: "Support & Thrust",
    health: 96,
    status: "Normal",
    bbox: { x: 230, y: 198, width: 615, height: 108 },
  },
  {
    id: "SHL-KLN-01",
    name: "Shell, Refractory & Seals SHL-KLN-01",
    shortName: "Shell & Seals",
    health: 98,
    status: "Normal",
    bbox: { x: 148, y: 115, width: 725, height: 118 },
  },
  {
    id: "PRC-KLN-01",
    name: "Process Context PRC-KLN-01",
    shortName: "Process Context",
    health: 99,
    status: "Normal",
    bbox: { x: 50, y: 35, width: 900, height: 275 },
  },
];

// ---------------------------------------------------------------------------
// 15 sub-assemblies — must match Component Health page.
// sensorTags is a UNIQUE partition of the 46 sensors (no double counting).
// ---------------------------------------------------------------------------
export const KLN_SUBASSEMBLIES: CanonicalSubassembly[] = [
  { id: "main-motor", systemId: "DRV-KLN-01", systemName: "Drive Train", name: "Main Drive Motor (630 kW VFD)", shortName: "Main Motor", health: 98, status: "Normal", criticality: "A", sensorTags: ["VIB-KLN-01", "TMP-KLN-21", "ELE-KLN-01", "SPD-KLN-01", "TMP-KLN-19", "TMP-KLN-20"] },
  { id: "gearbox", systemId: "DRV-KLN-01", systemName: "Drive Train", name: "3-Stage Helical Gearbox (35.5 : 1)", shortName: "Gearbox", health: 97, status: "Normal", criticality: "A", sensorTags: ["VIB-KLN-02", "VIB-KLN-03", "TMP-KLN-22", "TMP-KLN-23"] },
  { id: "pinion-gear", systemId: "DRV-KLN-01", systemName: "Drive Train", name: "Pinion & Girth Gear (24 / 168 T · 7 : 1)", shortName: "Pinion & Girth Gear", health: 96, status: "Normal", criticality: "A", sensorTags: ["VIB-KLN-04", "STS-KLN-05"] },
  { id: "lubrication", systemId: "DRV-KLN-01", systemName: "Drive Train", name: "Gearbox Forced Lubrication Skid (800 L)", shortName: "Lubrication Skid", health: 99, status: "Normal", criticality: "A", sensorTags: ["TMP-KLN-15", "PRS-KLN-04", "FLO-KLN-05", "LEV-KLN-01"] },
  { id: "auxiliary-drive", systemId: "DRV-KLN-01", systemName: "Drive Train", name: "Auxiliary Inching Drive & Overrunning Clutch", shortName: "Auxiliary Drive", health: 100, status: "Normal", criticality: "A", sensorTags: ["STS-KLN-11"] },
  { id: "station-1", systemId: "SUP-KLN-01", systemName: "Support & Thrust", name: "Support Station 1 (11 m · Tyre 1 & Rollers)", shortName: "Station 1", health: 98, status: "Normal", criticality: "A", sensorTags: ["TMP-KLN-01", "TMP-KLN-02", "TMP-KLN-03", "TMP-KLN-04"] },
  { id: "station-2", systemId: "SUP-KLN-01", systemName: "Support & Thrust", name: "Support Station 2 (39 m · Tyre 2 & Hydraulic Thrust)", shortName: "Station 2", health: 96, status: "Normal", criticality: "A", sensorTags: ["TMP-KLN-05", "TMP-KLN-06", "TMP-KLN-07", "TMP-KLN-08"] },
  { id: "station-3", systemId: "SUP-KLN-01", systemName: "Support & Thrust", name: "Support Station 3 (60 m · Tyre 3 & Rollers)", shortName: "Station 3", health: 97, status: "Normal", criticality: "A", sensorTags: ["TMP-KLN-09", "TMP-KLN-10", "TMP-KLN-11", "TMP-KLN-12"] },
  { id: "thrust", systemId: "SUP-KLN-01", systemName: "Support & Thrust", name: "Hydraulic Thrust System & LVDT Position Control", shortName: "Thrust System", health: 96, status: "Normal", criticality: "A", sensorTags: ["POS-KLN-01", "PRS-KLN-07", "POS-KLN-02"] },
  { id: "shell-refractory", systemId: "SHL-KLN-01", systemName: "Shell, Refractory & Seals", name: "Rotary Shell, Refractory Lining & IR Scanner", shortName: "Shell & Refractory", health: 98, status: "Normal", criticality: "A", sensorTags: ["STS-KLN-08", "CAL-KLN-03"] },
  { id: "inlet-seal", systemId: "SHL-KLN-01", systemName: "Shell, Refractory & Seals", name: "Inlet Lamella Seal & Spillage Boundary (0 m)", shortName: "Inlet Seal", health: 99, status: "Normal", criticality: "A", sensorTags: ["CAL-KLN-06", "CAL-KLN-07"] },
  { id: "outlet-seal", systemId: "SHL-KLN-01", systemName: "Shell, Refractory & Seals", name: "Outlet Air-Cooled Lamella Seal & Cooling Fan (74 m)", shortName: "Outlet Seal", health: 98, status: "Normal", criticality: "A", sensorTags: ["STS-KLN-10"] },
  { id: "kiln-inlet", systemId: "PRC-KLN-01", systemName: "Process Context", name: "Kiln Inlet Chamber & Extractive Gas Analyser", shortName: "Kiln Inlet", health: 99, status: "Normal", criticality: "Context", sensorTags: ["GAS-KLN-01", "GAS-KLN-02", "TMP-KLN-13", "PRS-KLN-01", "STS-KLN-06"] },
  { id: "feed-fuel", systemId: "PRC-KLN-01", systemName: "Process Context", name: "Kiln Feed & Fuel Mass Flow Meters", shortName: "Feed & Fuel", health: 99, status: "Normal", criticality: "Context", sensorTags: ["FLO-KLN-01", "FLO-KLN-02"] },
  { id: "burner-hood", systemId: "PRC-KLN-01", systemName: "Process Context", name: "Firing Hood & Burning-Zone Pyrometer", shortName: "Burner & Hood", health: 99, status: "Normal", criticality: "Context", sensorTags: ["TMP-KLN-14", "PRS-KLN-03"] },
];

// Reverse lookup: sensor tag -> primary sub-assembly
const SUB_BY_SENSOR = new Map<string, CanonicalSubassembly>();
for (const sa of KLN_SUBASSEMBLIES) {
  for (const t of sa.sensorTags) {
    if (!SUB_BY_SENSOR.has(t)) SUB_BY_SENSOR.set(t, sa);
  }
}

function systemNameFor(id: SystemId): string {
  switch (id) {
    case "DRV-KLN-01":
      return "Drive Train";
    case "SUP-KLN-01":
      return "Support & Thrust";
    case "SHL-KLN-01":
      return "Shell, Refractory & Seals";
    case "PRC-KLN-01":
      return "Process Context";
  }
}

/**
 * 46 canonical sensors — merged from hotspots (live value/position) +
 * catalog (engineering metadata) + diagnostics (limits/reasons).
 */
export const KLN_SENSORS: CanonicalSensor[] = KILN_ALL_HOTSPOTS.map((hs) => {
  const tag = hs.parameter || hs.id;
  const cat = KILN_SENSOR_CATALOG[tag] ?? KILN_SENSOR_CATALOG[hs.id] ?? {};
  const sysId = systemForTag(tag);
  const sub = SUB_BY_SENSOR.get(tag);
  const diag = fallbackDiagnostics(tag, sysId)!;
  const num = parseFloat(hs.value) || diag.defaultBaseline || 0;
  return {
    tag,
    id: hs.id,
    name: (cat.name as string) || diag.name || hs.label,
    systemId: sysId,
    systemName: systemNameFor(sysId),
    subassemblyId: sub?.id ?? "unknown",
    subassemblyName: sub?.shortName ?? diag.subAssemblyName ?? systemNameFor(sysId),
    component: (cat.component as string) || diag.component || hs.component,
    position: (cat.position as string) || `${hs.component} · Physical Instrument Location`,
    point: (cat.point as string) || "",
    unit: hs.unit,
    value: hs.value,
    numericValue: num,
    status: hs.status,
    x: hs.x,
    y: hs.y,
    instrument: (cat.sensorType as string) || diag.sensorType || "Industrial Sensor",
    sensorType: (cat.sensorType as string) || diag.sensorType || "Industrial Sensor",
    rackId: (cat.rackId as string) || "ULTRON-EDGE-KLN01 (MCC Room Cabinet IP54)",
    cardId: (cat.cardId as string) || "DAQ-SLOT-01",
    modbusAddress: (cat.modbusAddress as string) || "40001",
    sampleRate: (cat.sampleRate as string) || "1 s Continuous",
    source: (cat.source as CanonicalSensor["source"]) || "Existing",
    priority: (cat.priority as CanonicalSensor["priority"]) || "Required",
    accuracy: (cat.accuracy as string) || "±0.5%",
    range: (cat.range as string) || "Standard",
    normalThreshold: (cat.normalThreshold as string) || diag.nominalBand || "Nominal",
    warningThreshold: (cat.warningThreshold as string) || String(diag.warningAlertLabel),
    alarmThreshold: (cat.alarmThreshold as string) || String(diag.alarmDangerLabel),
    warningVal: (cat.warningVal as number) ?? (typeof diag.warningAlertLimit === "number" ? diag.warningAlertLimit : 0),
    alarmVal: (cat.alarmVal as number) ?? (typeof diag.alarmDangerLimit === "number" ? diag.alarmDangerLimit : 0),
    maxScale: (cat.maxScale as number) ?? 100,
    nominalBand: diag.nominalBand,
    standard: diag.standard,
    defaultBaseline: typeof diag.defaultBaseline === "number" ? diag.defaultBaseline : num,
  };
});

export const KLN_SENSOR_COUNT = KLN_SENSORS.length; // 46
export const KLN_SYSTEM_COUNT = KLN_SYSTEMS.length; // 4
export const KLN_SUBASSEMBLY_COUNT = KLN_SUBASSEMBLIES.length; // 15

export function getSensorsForSystem(systemId: SystemId): CanonicalSensor[] {
  return KLN_SENSORS.filter((s) => s.systemId === systemId);
}

export function getSensorsForSubassembly(subassemblyId: string): CanonicalSensor[] {
  return KLN_SENSORS.filter((s) => s.subassemblyId === subassemblyId);
}

/** Counts per system — used to render pill labels dynamically (never hardcode). */
export function systemSensorCounts(): Record<SystemId, number> {
  return {
    "DRV-KLN-01": getSensorsForSystem("DRV-KLN-01").length,
    "SUP-KLN-01": getSensorsForSystem("SUP-KLN-01").length,
    "SHL-KLN-01": getSensorsForSystem("SHL-KLN-01").length,
    "PRC-KLN-01": getSensorsForSystem("PRC-KLN-01").length,
  };
}

export function subassemblySensorCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const sa of KLN_SUBASSEMBLIES) out[sa.id] = sa.sensorTags.length;
  return out;
}
