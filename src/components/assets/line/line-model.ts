import { useMemo } from "react";
import type { AssetMachine } from "../assets-data";
import { liveMachineStatus, useKilnFleet, useKilnLiveStatus } from "@/providers/kiln-simulation-context";
import { useKilnOps } from "@/providers/kiln-ops-context";
import { toCondition, type Condition } from "@/components/ui/status";
import { journalState } from "@shared/lib/alarm-journal";
import type { SimFrame } from "@shared/lib/kiln-sim/engine";
import { ackedFromEvents, dxSensorsFromFrame, type DxSensor } from "../diagnosis-model";
import { buildSensorRows, diagnosisTotals, inDefinitionOrder, type SensorRow } from "../diagnosis-rows";

/* ==========================================================================
   Full line: the plant's machines side by side for the line pages
   (Diagnosis, Prognosis, Analysis). Each machine is read exactly as its own
   page reads it — the live frame, the alarm journal, the same row builders —
   so a number on the line page is the sum of the machines' own numbers.
   ========================================================================== */

export interface LineMachine {
  m: AssetMachine;
  frame: SimFrame | null;
  health: number | null;
  condition: Condition;
}

export interface LineDiagnosisMachine extends LineMachine {
  sensors: DxSensor[];
  rows: SensorRow[];
  totals: ReturnType<typeof diagnosisTotals>;
  inAlarm: number;
}

/** The plant's machines with their live frame and status, in plant order. */
export function useLineMachines(units: AssetMachine[]): LineMachine[] {
  const fleet = useKilnFleet();
  const live = useKilnLiveStatus();
  return useMemo(
    () =>
      units.map((m) => {
        const st = liveMachineStatus(live, m.id, { health: m.health ?? null, status: m.status });
        return {
          m,
          frame: fleet[m.id]?.frame ?? null,
          health: st.health === null ? null : Math.round(st.health),
          condition: toCondition(st.status),
        };
      }),
    [units, fleet, live],
  );
}

/** Each machine's Diagnosis model: sensors in definition order, sensor rows and totals. */
export function useLineDiagnosis(machines: LineMachine[]): LineDiagnosisMachine[] {
  const ops = useKilnOps();
  return useMemo(
    () =>
      machines.map((lm) => {
        const f = lm.frame;
        if (!f) return { ...lm, sensors: [], rows: [], totals: diagnosisTotals(null, new Set(), []), inAlarm: 0 };
        const sensors = inDefinitionOrder(dxSensorsFromFrame(f), f.defs);
        const journal = journalState(f, ops.journal[lm.m.id] ?? []);
        const acked = ackedFromEvents(f);
        for (const id of journal.acked) acked.add(id);
        const rows = buildSensorRows(sensors, f, acked, journal.cleared);
        return { ...lm, sensors, rows, totals: diagnosisTotals(f, acked, sensors, journal.cleared), inAlarm: rows.filter((r) => r.inAlarm).length };
      }),
    [machines, ops.journal],
  );
}

export const sum = <T>(xs: T[], f: (x: T) => number) => xs.reduce((n, x) => n + f(x), 0);
