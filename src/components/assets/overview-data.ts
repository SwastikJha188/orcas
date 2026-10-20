"use client";

import { useMemo } from "react";
import type { AssetMachine } from "./assets-data";
import type { KilnSimulation } from "./kiln-seals-simulation";
import { liveMachineStatus, useKilnLiveStatus, useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { useMachineCatalog } from "./use-machine-catalog";
import { toCondition } from "@/components/ui/status";
import { buildDetailedSensors, hotspotSensors } from "./machine-sensor-mapping-view";
import type { SchematicDot } from "./machine-schematic";

type Severity = "Normal" | "Alert" | "Critical";

/**
 * The Overview's numbers for one machine: mapped sensors as schematic dots,
 * subsystems (DB systems when live, else seeded parts) and the machine-level
 * health. Machine health and condition come from `liveMachineStatus()` — the
 * single source shared with the header, directory, tree, fleet home and
 * Diagnosis. Shared with the Home machine twin so both always agree.
 */
export function useMachineOverview(
  machine: AssetMachine,
  sensorData?: KilnSimulation["sensorData"]
) {
  // Simulation only overlays LIVE values (kiln fleet and pyro line); components / sensors / mapping come from the DB catalog.
  const kiln = useKilnSimulationFor(machine.id);
  const frame = kiln?.frame ?? null;
  const liveStatus = useKilnLiveStatus();

  const catalog = useMachineCatalog(machine);

  // Same builder as the Sensor Mapping page → identical rows/values.
  const sensors = useMemo(() => {
    const db = buildDetailedSensors(catalog.sensors, sensorData);
    return db.length > 0 ? db : hotspotSensors(machine);
  }, [catalog.sensors, sensorData, machine]);

  // DB systems when live; otherwise the machine's DB-seeded parts.
  const systems = useMemo(() => {
    if (catalog.isLive && catalog.systems.length > 0) {
      return catalog.systems.map((s) => ({
        id: s.systemId,
        name: s.shortName || s.name,
        health: s.health,
        status: s.status,
        sensorCount: s.sensorCount,
        bbox: s.bbox,
      }));
    }
    return machine.parts.map((p) => ({ id: p.id, name: p.name, health: p.health, status: p.status, sensorCount: 0, bbox: p.bbox }));
  }, [catalog.isLive, catalog.systems, machine.parts]);

  const systemByTag = useMemo(() => new Map(catalog.sensors.map((s) => [s.tag, s.systemId])), [catalog.sensors]);

  const dots = useMemo<SchematicDot[]>(
    () =>
      sensors.map((s) => ({
        tag: s.parameter || s.id,
        name: s.name,
        value: String(s.value ?? ""),
        unit: s.unit || "",
        status: s.status,
        x: s.x,
        y: s.y,
        systemId: systemByTag.get(s.parameter || s.id),
      })),
    [sensors, systemByTag]
  );

  // One machine-health source everywhere: the live plant, else the stored record.
  const live = liveMachineStatus(liveStatus, machine.id, { health: machine.health, status: machine.status });
  const overall = live.health === null ? null : Math.round(live.health);
  const worst: Severity = live.status === "Critical" ? "Critical" : live.status === "Alert" ? "Alert" : "Normal";
  // Display word on the one condition scale (Normal / Alert / Critical).
  const conditionLabel = toCondition(live.status);

  const counts = useMemo(() => {
    const c = { Normal: 0, Alert: 0, Critical: 0 };
    for (const s of sensors) c[s.status] += 1;
    return c;
  }, [sensors]);

  return { catalog, frame, sensors, systems, dots, overall, worst, conditionLabel, counts, isLiveHealth: live.isLive };
}
