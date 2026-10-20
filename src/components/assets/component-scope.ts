"use client";

/**
 * Component (sub-assembly) filter of a machine's pages — Diagnosis, Prognosis,
 * Analysis and Sensors. The selection lives in the industrial-data context (and
 * the URL), so every page of the machine shows the same component; the
 * component list, health and sensor tags come from the machine catalog.
 */
import { useMemo } from "react";
import type { AssetMachine } from "./assets-data";
import { useMachineCatalog, type MachineCatalog } from "./use-machine-catalog";
import { useIndustrialData } from "@/providers/industrial-data-context";

export interface ComponentScope {
  /** Sub-assembly id. */
  id: string;
  name: string;
  /** Its measurement tags. */
  tags: string[];
}

export interface ComponentOption extends ComponentScope {
  health: number | null;
  status: "Normal" | "Alert" | "Critical";
}

/** The machine's components from its catalog, with health and sensor tags. */
export function componentOptions(catalog: Pick<MachineCatalog, "subassemblies" | "sensors">): ComponentOption[] {
  return catalog.subassemblies.map((sa) => ({
    id: sa.subassemblyId,
    name: sa.name,
    tags: sa.sensorTags?.length ? sa.sensorTags : catalog.sensors.filter((s) => s.subassemblyId === sa.subassemblyId).map((s) => s.tag),
    health: Number.isFinite(sa.health) ? Math.round(sa.health) : null,
    status: sa.status,
  }));
}

export function useComponentScope(machine: AssetMachine) {
  const { selectedComponentId, selectComponent } = useIndustrialData();
  const catalog = useMachineCatalog(machine);
  const options = useMemo<ComponentOption[]>(
    () => componentOptions({ subassemblies: catalog.subassemblies, sensors: catalog.sensors }),
    [catalog.subassemblies, catalog.sensors],
  );
  const selected = useMemo<ComponentScope | null>(() => options.find((o) => o.id === selectedComponentId) ?? null, [options, selectedComponentId]);
  const select = (subId: string | null) => selectComponent(machine.id, subId);
  return { options, selected, select };
}
