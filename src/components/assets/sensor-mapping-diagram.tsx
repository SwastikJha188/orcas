"use client";

import { useMemo } from "react";
import type { MachineCatalog } from "./use-machine-catalog";
import type { DetailedSensorInfo } from "./machine-sensor-mapping-view";
import { subAssemblyPadMap, type DiagramPin } from "./kiln-component-diagrams";
import { KILN_SUB_ASSEMBLIES } from "./kiln-subassembly-specs";
import { isPyroMachineId, isVpcMachineId } from "@/lib/live-defs";

/* ==========================================================================
   Machine components for the sensor views: each catalog sub-assembly with
   its sensors and, where a dedicated component drawing exists, its pins.
   The drawings themselves live on the machine Overview (pick a component
   there): kiln-seal fleet → component drawing, pyro line → diagram sheet.
   ========================================================================== */

type Status = DetailedSensorInfo["status"];
const SEVERITY: Record<Status, number> = { Normal: 0, Advisory: 1, Critical: 2 };
const worst = (list: Status[]): Status =>
  list.reduce<Status>((w, s) => (SEVERITY[s] > SEVERITY[w] ? s : w), "Normal");

const tagOf = (s: DetailedSensorInfo) => s.parameter || s.id;

/** Reading as a share of its alarm limit — only for rising, non-negative limits. */
export function sensorAlarmLoad(s: DetailedSensorInfo): number | null {
  const warn = Number(s.warningVal);
  const alarm = Number(s.alarmVal);
  if (!(alarm > 0) || !(s.numericValue >= 0) || warn >= alarm) return null;
  if (!Number.isFinite(parseFloat(s.value))) return null;
  const load = Math.round((s.numericValue / alarm) * 100);
  if (load > 100 && s.status === "Normal") return null;
  return load;
}

export interface Component {
  id: string;
  systemId: string;
  name: string;
  shortName: string;
  health: number | null;
  status: Status;
  tags: string[];
  /** Pins on the dedicated 720 × 310 component drawing, when one exists. */
  pins: DiagramPin[] | null;
}

/**
 * The machine's components (catalog sub-assemblies with sensors), each with its
 * pins on the dedicated component drawing when one exists (kiln-seal fleet;
 * pyro / VPC components use the diagram-pack sheets on the Overview instead).
 */
export function useMachineComponents(machineId: string, catalog: MachineCatalog, sensors: DetailedSensorInfo[]): Component[] {
  const byTag = useMemo(() => new Map(sensors.map((s) => [tagOf(s), s])), [sensors]);
  const pyro = isPyroMachineId(machineId) || isVpcMachineId(machineId);
  return useMemo<Component[]>(() => {
    const specs = new Map(pyro ? [] : KILN_SUB_ASSEMBLIES.map((a) => [a.id, a]));
    const subByTag = new Map(catalog.sensors.map((s) => [s.tag, s.subassemblyId]));
    return catalog.subassemblies
      .map((sa) => {
        const spec = specs.get(sa.subassemblyId);
        const padMap = subAssemblyPadMap(machineId, sa.subassemblyId);
        const tags = spec
          ? spec.pins.map((p) => p.tag)
          : sensors.filter((s) => subByTag.get(tagOf(s)) === sa.subassemblyId).map(tagOf);
        // Callout cards replace the drawing's own in-SVG callouts.
        const pins: DiagramPin[] | null = spec
          ? spec.pins.map((p) => {
              const s = byTag.get(p.tag);
              const pin = { ...p, calloutX: undefined, calloutY: undefined };
              return s ? { ...pin, label: s.name, value: s.value, unit: s.unit, status: s.status } : pin;
            })
          : padMap
            ? tags.flatMap((tag, idx) => {
                const pad = padMap[tag];
                if (!pad) return [];
                const s = byTag.get(tag);
                return [
                  {
                    id: s?.point || `P${idx + 1}`,
                    tag,
                    label: s?.name ?? tag,
                    value: s?.value ?? "",
                    unit: s?.unit ?? "",
                    status: s?.status ?? "Normal",
                    x: pad[0],
                    y: pad[1],
                  },
                ];
              })
            : null;
        const statuses = tags.map((t) => byTag.get(t)?.status ?? "Normal");
        return {
          id: sa.subassemblyId,
          systemId: sa.systemId,
          name: sa.name,
          shortName: sa.shortName || sa.name,
          health: Number.isFinite(sa.health) ? sa.health : null,
          status: SEVERITY[sa.status] >= SEVERITY[worst(statuses)] ? sa.status : worst(statuses),
          tags,
          pins,
        };
      })
      .filter((c) => c.tags.length > 0);
  }, [catalog, sensors, byTag, pyro, machineId]);
}

/** The part of the machine the drawing is showing; null = whole machine. */
export interface SensorScope {
  id: string;
  label: string;
  tags: string[];
}
