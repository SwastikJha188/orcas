"use client";

import { useMemo } from "react";
import { useApi } from "@/lib/api-cache";
import type { AssetMachine } from "./assets-data";
import { isLiveMachine, useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { useMachineAcquisition } from "./acquisition/use-machine-acquisition";
import type { MachineAcquisition } from "@shared/types/edge";
import type { MeasurementDto } from "@shared/types/monitoring";
import type { LiveSignal } from "@shared/lib/kiln-sim/engine";

export interface CatalogSensorView {
  tag: string;
  id: string;
  name: string;
  systemId: string;
  subassemblyId: string;
  subAssembly: string;
  /** D5 measurement point (P1…P6 per sub-assembly diagram), DB-backed. */
  point: string;
  component: string;
  unit: string;
  value: string;
  numericValue: number;
  status: "Normal" | "Alert" | "Critical";
  x: number | null;
  y: number | null;
  instrument: string;
  sensorType: string;
  rackId: string;
  cardId: string;
  modbusAddress: string;
  sampleRate: string;
  source: string;
  priority: string;
  accuracy: string;
  rangeVal: string;
  normalThreshold: string;
  warningThreshold: string;
  alarmThreshold: string;
  warningVal: number;
  alarmVal: number;
  maxScale: number;
  nominalBand: string;
  standard: string;
  reasons: Array<{
    ruleId: string;
    ruleName: string;
    primaryCause: string;
    mechanism: string;
    symptomSignature: string;
    consequence: string;
    prescriptiveAction: string;
    crossCheckSensors?: string[];
  }>;
  /** Live reading from the KLN-01 engine: model, residual, σ, quality, trend. */
  live?: LiveSignal;
}

interface ApiCatalogResponse {
  machineId: string;
  systems: Array<{
    systemId: string;
    name: string;
    shortName: string;
    health: number;
    status: "Normal" | "Alert" | "Critical";
    bbox: { x: number; y: number; width: number; height: number };
    sensorCount: number;
  }>;
  subassemblies: Array<{
    subassemblyId: string;
    systemId: string;
    name: string;
    shortName: string;
    health: number;
    status: "Normal" | "Alert" | "Critical";
    criticality: string;
    sensorTags: string[];
    sensorCount: number;
  }>;
  sensors: Array<{
    tag: string;
    name: string;
    unit: string;
    currentValue: string;
    numericValue: number;
    status: "Normal" | "Alert" | "Critical";
    component: string | null;
    position: string | null;
    instrument: string;
    sensorType: string;
    edgeRack: string;
    cardSlot: string;
    modbusAddress: string;
    sampleRate: string;
    source?: string | null;
    priority?: string | null;
    accuracy?: string | null;
    rangeVal?: string | null;
    systemId: string | null;
    subassemblyId: string | null;
    subAssembly: string | null;
    point?: string | null;
    normalThreshold: string | null;
    warningThreshold: string | null;
    alarmThreshold: string | null;
    warningVal: number | null;
    alarmVal: number | null;
    maxScale: number | null;
    nominalBand: string | null;
    standard: string | null;
    reasons: CatalogSensorView["reasons"];
    x: number | null;
    y: number | null;
  }>;
  counts: { systems: number; subassemblies: number; sensors: number };
}

export interface MachineCatalog {
  /** True once the DB-backed catalog has loaded. */
  isLive: boolean;
  /** True while the catalog request is in flight (or before it starts). */
  isLoading: boolean;
  systems: ApiCatalogResponse["systems"];
  subassemblies: ApiCatalogResponse["subassemblies"];
  sensors: CatalogSensorView[];
  counts: { systems: number; subassemblies: number; sensors: number };
}

const EMPTY_COUNTS = { systems: 0, subassemblies: 0, sensors: 0 };

/** PostgreSQL `numeric` columns arrive as strings ("85.00"); coerce before comparing. */
function toNumber(v: number | string | null | undefined, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Single hook every page must use. The PostgreSQL `mapped_signals` /
 * `machine_*` tables are the only source of truth — there is no static
 * catalog fallback. While loading (or if the DB is unreachable) the catalog
 * is empty and `isLoading` / `isLive` describe the state.
 */
export function useMachineCatalog(machine: AssetMachine): MachineCatalog {
  const base = useMqttOverlay(useStoredCatalog(machine), machine.id);
  const frame = useKilnSimulationFor(machine.id)?.frame ?? null;

  return useMemo(() => {
    if (!frame || !base.isLive) return base;
    const sensors = base.sensors.map((s) => {
      const sig = frame.signals[s.tag];
      if (!sig) return s;
      return {
        ...s,
        value: sig.display,
        numericValue: sig.value ?? (sig.status === "Normal" ? 1 : 0),
        status: sig.status,
        live: sig,
      };
    });
    const systems = base.systems.map((sy) => {
      const cell = frame.systems[sy.systemId as keyof typeof frame.systems];
      return cell ? { ...sy, health: cell.health, status: cell.status } : sy;
    });
    const subassemblies = base.subassemblies.map((sa) => {
      const cell = frame.subs[sa.subassemblyId as keyof typeof frame.subs];
      return cell ? { ...sa, health: cell.health, status: cell.status } : sa;
    });
    return { ...base, sensors, systems, subassemblies };
  }, [base, frame]);
}

/* ---------------------------------------------------------------- MQTT overlay
   Real (non-kiln) machines: a sensor whose tag is mapped to a gateway channel
   (Devices › Hierarchy) shows that channel's live MQTT reading. Stale or
   missing readings keep the stored value. KLN-01 is driven by the kiln
   simulation above and is not polled here. */

type MqttReading = [tag: string, value: string, numeric: number | null, status: CatalogSensorView["status"]];

const MQTT_STATUS = { normal: "Normal", alert: "Alert", danger: "Critical" } as const;

function formatReading(v: number): string {
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 100 ? 1 : 2);
}

/** Live readings as a compact key, so the overlay re-runs only when a value or state changes. */
function mqttKey(data: MachineAcquisition | null): string {
  if (!data) return "[]";
  const out: MqttReading[] = [];
  for (const p of data.points) {
    const st = p.live.state;
    if (st !== "normal" && st !== "alert" && st !== "danger") continue;
    if (p.live.value === null && !p.live.display) continue;
    const value = p.live.value !== null ? formatReading(p.live.value) : (p.live.display as string);
    out.push([p.signalTag ?? p.tag, value, p.live.value, MQTT_STATUS[st]]);
  }
  return JSON.stringify(out);
}

function useMqttOverlay(base: MachineCatalog, machineId: string): MachineCatalog {
  const { data } = useMachineAcquisition(isLiveMachine(machineId) ? null : machineId);
  const key = useMemo(() => mqttKey(data), [data]);
  return useMemo(() => {
    const readings = JSON.parse(key) as MqttReading[];
    if (!base.isLive || readings.length === 0) return base;
    const byTag = new Map(readings.map((r) => [r[0], r]));
    let hit = false;
    const sensors = base.sensors.map((s) => {
      const r = byTag.get(s.tag);
      if (!r) return s;
      hit = true;
      return { ...s, value: r[1], numericValue: r[2] ?? s.numericValue, status: r[3] };
    });
    return hit ? { ...base, sensors } : base;
  }, [base, key]);
}

/* ---------------------------------------------------------------- measurements
   GET /api/measurements?machineId= — per-measurement specification (range,
   accuracy, priority, install status), the full engineering limit (values,
   basis texts, approval) and the accepted reference band. */

export interface MachineMeasurements {
  list: MeasurementDto[];
  byTag: ReadonlyMap<string, MeasurementDto>;
  isLoading: boolean;
}

const EMPTY_MEASUREMENTS: MeasurementDto[] = [];

export function useMachineMeasurements(machineId: string | null | undefined): MachineMeasurements {
  const { data, isLoading } = useApi<MeasurementDto[]>(machineId ? `/api/measurements?machineId=${encodeURIComponent(machineId)}` : null);
  const list = Array.isArray(data) ? data : EMPTY_MEASUREMENTS;
  return useMemo(() => ({ list, byTag: new Map(list.map((m) => [m.tag, m])), isLoading }), [list, isLoading]);
}

/**
 * Rule code → the measurement tags the DB lists as its inputs (catalog
 * `sensors[].reasons[]`: the rules each sensor feeds, with the rule's other inputs).
 */
export function ruleInputsOf(sensors: ReadonlyArray<Pick<CatalogSensorView, "tag" | "reasons">>): Map<string, string[]> {
  const out = new Map<string, Set<string>>();
  for (const s of sensors)
    for (const r of s.reasons) {
      const set = out.get(r.ruleId) ?? out.set(r.ruleId, new Set()).get(r.ruleId)!;
      set.add(s.tag);
      for (const t of r.crossCheckSensors ?? []) set.add(t);
    }
  return new Map([...out].map(([k, v]) => [k, [...v]]));
}

/** The DB catalog alone (no live overlay): which sensors exist, names, units, limits, locations. */
export function useStoredCatalog(machine: AssetMachine): MachineCatalog {
  // No id yet (a placeholder machine while the plant loads): ask nothing rather than a 400.
  const { data, isLoading } = useApi<ApiCatalogResponse | null>(machine.id ? `/api/catalog?machineId=${encodeURIComponent(machine.id)}` : null);
  const live = data && Array.isArray(data.sensors) && data.sensors.length > 0 ? data : null;

  return useMemo(() => {
    if (!live) {
      return {
        isLive: false,
        isLoading,
        systems: [],
        subassemblies: [],
        sensors: [],
        counts: EMPTY_COUNTS,
      };
    }
    const sensors: CatalogSensorView[] = live.sensors.map((s) => ({
      tag: s.tag,
      id: s.tag,
      name: s.name,
      systemId: s.systemId || "",
      subassemblyId: s.subassemblyId || "",
      subAssembly: s.subAssembly || s.systemId || "",
      point: s.point || "",
      component: s.component || "",
      unit: s.unit,
      value: s.currentValue,
      numericValue: s.numericValue ?? parseFloat(s.currentValue) ?? 0,
      status: s.status,
      x: s.x,
      y: s.y,
      instrument: s.instrument,
      sensorType: s.sensorType,
      rackId: s.edgeRack,
      cardId: s.cardSlot,
      modbusAddress: s.modbusAddress,
      sampleRate: s.sampleRate,
      source: s.source || "",
      priority: s.priority || "",
      accuracy: s.accuracy || "",
      rangeVal: s.rangeVal || "",
      normalThreshold: s.normalThreshold || "—",
      warningThreshold: s.warningThreshold || "—",
      alarmThreshold: s.alarmThreshold || "—",
      warningVal: toNumber(s.warningVal, 0),
      alarmVal: toNumber(s.alarmVal, 0),
      maxScale: toNumber(s.maxScale, 100),
      nominalBand: s.nominalBand || "—",
      standard: s.standard || "",
      reasons: Array.isArray(s.reasons) ? s.reasons : [],
    }));
    return {
      isLive: true,
      isLoading: false,
      systems: live.systems,
      subassemblies: live.subassemblies,
      sensors,
      counts: live.counts,
    };
  }, [live, isLoading]);
}
