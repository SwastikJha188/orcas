/**
 * Fault library of the pyro line (OSW-PE-FLT-PYR-01 Rev. 01, migration 032).
 *
 * One entry per fault reference sheet: what / where / alternatives / impact,
 * the Alert and Critical conditions against the sensor-list set-points, what
 * prognosis may show, and the site check. Entries are linked to the
 * measurements they read (primary / support) and to the rules that implement
 * them, so a finding, a sensor or a part can show its library sheet.
 */
import { query } from "@backend/db";

export type FaultInputRole = "primary" | "support";

export interface FaultEntry {
  id: string;
  /** null: line-wide entry (shared pattern, data quality, conditional). */
  machineId: string | null;
  group: string;
  component: string;
  title: string;
  origin: string;
  revStatus: string;
  conditional: boolean;
  applicability: string | null;
  inputs: Array<{ tag: string; measurementId: string; role: FaultInputRole }>;
  baseline: string | null;
  setpoints: string | null;
  detection: string | null;
  what: string | null;
  where: string | null;
  alternatives: string | null;
  impact: string | null;
  developing: string | null;
  alert: string | null;
  danger: string | null;
  prognosis: string | null;
  discriminate: string | null;
  check: string | null;
  source: string | null;
}

export interface FaultLibrary {
  document: string;
  faults: FaultEntry[];
  /** Rule code → library entries it implements, main entry first. */
  rules: Record<string, string[]>;
}

interface Row {
  id: string;
  machine_id: string | null;
  document: string;
  group_code: string;
  component: string;
  title: string;
  origin: string;
  rev_status: string;
  conditional: boolean;
  applicability: string | null;
  baseline: string | null;
  setpoints: string | null;
  detection: string | null;
  what: string | null;
  where_text: string | null;
  alternatives: string | null;
  impact: string | null;
  developing: string | null;
  alert: string | null;
  danger: string | null;
  prognosis: string | null;
  discriminate: string | null;
  check_text: string | null;
  source: string | null;
}

/**
 * Active library entries of one machine (its own sheets plus the line-wide
 * entries its rules or measurements use), or of a whole plant.
 */
export async function getFaultLibrary(filter: { machineId?: string | null; plantId?: string | null }): Promise<FaultLibrary> {
  const machineId = filter.machineId ?? null;
  const plantId = filter.plantId ?? null;
  const rules = machineId
    ? await query<{ code: string; fault_id: string }>(
        `SELECT r.code, rf.fault_id FROM rule_faults rf JOIN rules r ON r.id = rf.rule_id
          WHERE r.machine_id = $1 ORDER BY r.sort_order, r.code, rf.sort_order`,
        [machineId],
      )
    : { rows: [] as Array<{ code: string; fault_id: string }> };
  const faults = await query<Row>(
    `SELECT f.*, f.rev_status = 'Conditional' AS conditional FROM fault_library f
      WHERE f.rev_status <> 'Retired'
        AND ($2::varchar IS NULL OR f.plant_id = $2)
        AND ($1::varchar IS NULL
             OR f.machine_id = $1
             OR (f.machine_id IS NULL AND (
                   f.id IN (SELECT rf.fault_id FROM rule_faults rf JOIN rules r ON r.id = rf.rule_id WHERE r.machine_id = $1)
                   OR f.id IN (SELECT i.fault_id FROM fault_library_inputs i JOIN v_measurement_context c ON c.measurement_id = i.measurement_id WHERE c.machine_id = $1))))
      ORDER BY f.sort_order`,
    [machineId, plantId],
  );
  const ids = faults.rows.map((f) => f.id);
  const inputs = ids.length
    ? await query<{ fault_id: string; tag: string; measurement_id: string; role: FaultInputRole }>(
        `SELECT i.fault_id, m.tag, i.measurement_id, i.role FROM fault_library_inputs i JOIN measurements m ON m.id = i.measurement_id
          WHERE i.fault_id = ANY($1) ORDER BY i.fault_id, i.sort_order`,
        [ids],
      )
    : { rows: [] as Array<{ fault_id: string; tag: string; measurement_id: string; role: FaultInputRole }> };
  const byFault = new Map<string, FaultEntry["inputs"]>();
  for (const i of inputs.rows) {
    const list = byFault.get(i.fault_id) ?? [];
    list.push({ tag: i.tag, measurementId: i.measurement_id, role: i.role });
    byFault.set(i.fault_id, list);
  }
  const ruleMap: Record<string, string[]> = {};
  for (const r of rules.rows) (ruleMap[r.code] ??= []).push(r.fault_id);
  return {
    document: faults.rows[0]?.document ?? "OSW-PE-FLT-PYR-01 Rev. 01",
    faults: faults.rows.map((f) => ({
      id: f.id,
      machineId: f.machine_id,
      group: f.group_code,
      component: f.component,
      title: f.title,
      origin: f.origin,
      revStatus: f.rev_status,
      conditional: f.conditional,
      applicability: f.applicability,
      inputs: byFault.get(f.id) ?? [],
      baseline: f.baseline,
      setpoints: f.setpoints,
      detection: f.detection,
      what: f.what,
      where: f.where_text,
      alternatives: f.alternatives,
      impact: f.impact,
      developing: f.developing,
      alert: f.alert,
      danger: f.danger,
      prognosis: f.prognosis,
      discriminate: f.discriminate,
      check: f.check_text,
      source: f.source,
    })),
    rules: ruleMap,
  };
}
