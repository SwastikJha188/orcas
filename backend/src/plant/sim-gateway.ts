/**
 * Simulated gateway.
 *
 * The simulation engines stand in for the plant and its edge gateways. This
 * module publishes what a gateway would send for every machine registered in
 * `machine_simulations`: the latest acquired value (or discrete state) of each
 * of the machine's measurements, with the source's quality flag and the
 * acquisition time. Which tags exist, and which measurement row each one
 * lands in, comes from the database; nothing here lists machines or tags.
 */
import { query } from "@backend/db";
import type { FleetEngines } from "@shared/lib/fleet-boot";
import { COPY_SOURCE } from "@shared/lib/pyro-sim/fleet";
import type { QualityCode, ReadingIn } from "@backend/monitoring/readings";

export interface SimBinding {
  machineId: string;
  engine: "kiln" | "pyro" | "pyro-kln" | "vpc";
  measurementId: string;
  tag: string;
  valueKind: "analog" | "state";
}

const BINDINGS_TTL_MS = 60_000;
const g = globalThis as typeof globalThis & { __ultronSimBindings?: { at: number; rows: SimBinding[] } };

export async function loadSimBindings(force = false): Promise<SimBinding[]> {
  const hit = g.__ultronSimBindings;
  if (!force && hit && Date.now() - hit.at < BINDINGS_TTL_MS) return hit.rows;
  const res = await query<{ machine_id: string; engine_id: SimBinding["engine"]; measurement_id: string; tag: string; value_kind: SimBinding["valueKind"] }>(
    `SELECT s.machine_id, s.engine_id, c.measurement_id, c.tag, c.value_kind
       FROM machine_simulations s
       JOIN v_measurement_context c ON c.machine_id = s.machine_id
      WHERE s.enabled AND s.engine_id <> 'limits' AND c.origin_id <> 'manual'
      ORDER BY s.machine_id, c.sort_order`,
  );
  const rows = res.rows.map((r) => ({ machineId: r.machine_id, engine: r.engine_id, measurementId: r.measurement_id, tag: r.tag, valueKind: r.value_kind }));
  g.__ultronSimBindings = { at: Date.now(), rows };
  return rows;
}

/** Engine per-sample validity code (0 Good, 1 Suspect, 2 Invalid) → source quality flag. */
const qualityOf = (code: number | undefined): QualityCode => (code === 2 ? "BAD" : code === 1 ? "UNCERTAIN" : "GOOD");

/**
 * What the gateways publish for the minute that just ran, stamped `acquiredAt`.
 * Measurements the engine does not produce are skipped (the evaluation reports
 * them missing), never filled in.
 */
export function sampleFleet(e: FleetEngines, bindings: SimBinding[], acquiredAt: number): ReadingIn[] {
  const out: ReadingIn[] = [];
  for (const b of bindings) {
    let value: number | null = null;
    let state: string | null = null;
    let quality: QualityCode = "GOOD";
    if (b.engine === "kiln") {
      const s = e.sims[b.machineId];
      if (!s) continue;
      if (b.valueKind === "state") state = s.prevStates[b.tag] ?? null;
      else value = s.hist[b.tag]?.at(-1) ?? null;
      const flag = s.flags[b.tag]?.rule;
      quality = flag === "R-DQ-01" ? "BAD" : flag === "R-DQ-02" ? "UNCERTAIN" : "GOOD";
    } else if (b.engine === "pyro") {
      const ms = e.line.machines[b.machineId];
      if (!ms) continue;
      if (b.valueKind === "state") state = ms.prevStates[b.tag] ?? null;
      else value = e.line.hist[b.tag]?.at(-1) ?? null;
      quality = qualityOf(e.line.qualHist[b.tag]?.at(-1));
    } else if (b.engine === "pyro-kln") {
      // A copy of the line: its kiln's readings, published under the copy's machine id.
      const line = e.copies?.[b.machineId];
      const ms = line?.machines[COPY_SOURCE];
      if (!line || !ms) continue;
      if (b.valueKind === "state") state = ms.prevStates[b.tag] ?? null;
      else value = line.hist[b.tag]?.at(-1) ?? null;
      quality = qualityOf(line.qualHist[b.tag]?.at(-1));
    } else {
      const v = e.vpcs?.[b.machineId];
      if (!v) continue;
      if (b.valueKind === "state") state = v.lastStates?.[b.tag] ?? null;
      else value = v.history[b.tag]?.at(-1) ?? null;
      quality = qualityOf(v.qualityHistory[b.tag]?.at(-1));
    }
    if (value === null && state === null) continue;
    out.push({ measurementId: b.measurementId, acquiredAt, value, state, quality, timeSource: "device" });
  }
  return out;
}
