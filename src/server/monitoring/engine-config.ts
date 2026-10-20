/**
 * Reads the engine configuration (see src/lib/engine-config.ts) from the
 * database: the simulation registry, and per simulated machine its
 * measurements (name, unit, decimals, instrument, normal band, limit, states)
 * and its rule texts.
 */
import { query } from "@/server/db";
import { limitRuleFromRow, type LimitRow } from "@/lib/limit-codec";
import type { EngineConfig, EngineId, EngineRuleConfig, EngineSignalConfig } from "@/lib/engine-config";
import type { LineSimSettings } from "@/lib/pyro-sim/engine";

const n = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export async function readEngineConfig(): Promise<EngineConfig> {
  const fleet = await query<{ machine_id: string; engine_id: EngineId; seed: number | null; profile: string | null }>(
    "SELECT machine_id, engine_id, seed, profile FROM machine_simulations WHERE enabled ORDER BY engine_id, machine_id",
  );
  const ids = fleet.rows.map((f) => f.machine_id);
  const [signals, states, rules] = await Promise.all([
    query<Record<string, unknown>>(
      `SELECT c.machine_id, c.measurement_id, c.tag, c.name, c.unit, c.value_kind, c.decimals, it.name AS instrument, m.normal_text,
              l.kind_id, l.direction, l.warn_value, l.alarm_value, l.warn_lo, l.warn_hi, l.alarm_lo, l.alarm_hi, l.warn_pct, l.alarm_pct,
              l.collapse_pct, l.ratio, l.rise, l.split, pm.tag AS pair_tag, dm.tag AS drive_tag, l.drive_on, l.reference_value,
              l.abs_warn_lo, l.abs_warn_hi, l.abs_alarm_lo, l.abs_alarm_hi, l.rate_per_hour, l.rate_of, l.rate_window,
              l.raise_samples, l.clear_samples, l.basis_normal, l.basis_warning, l.basis_alarm, l.source, l.note, l.approval
         FROM v_measurement_context c
         JOIN measurements m ON m.id = c.measurement_id
         LEFT JOIN instrument_types it ON it.id = m.instrument_type_id
         LEFT JOIN measurement_limits l ON l.measurement_id = c.measurement_id
         LEFT JOIN measurements pm ON pm.id = l.pair_measurement_id
         LEFT JOIN measurements dm ON dm.id = l.drive_measurement_id
        WHERE c.machine_id = ANY($1)`,
      [ids],
    ),
    query<{ measurement_id: string; state: string; severity_id: string }>(
      "SELECT measurement_id, state, severity_id FROM measurement_states ORDER BY measurement_id, sort_order",
    ),
    query<{ machine_id: string; code: string; name: string; logic: string; cause: string; consequence: string; action: string; owner: string | null; unproven: string | null; hold: string | null }>(
      "SELECT machine_id, code, name, logic, cause, consequence, action, owner, unproven, hold FROM rules WHERE machine_id = ANY($1) AND enabled",
      [ids],
    ),
  ]);
  const statesBy = new Map<string, { normal: string; warn: string[]; alarm: string[] }>();
  for (const s of states.rows) {
    const cur = statesBy.get(s.measurement_id) ?? { normal: "", warn: [], alarm: [] };
    if (s.severity_id === "Normal") cur.normal = s.state;
    else if (s.severity_id === "Alert") cur.warn.push(s.state);
    else cur.alarm.push(s.state);
    statesBy.set(s.measurement_id, cur);
  }
  const engineOf = new Map(fleet.rows.map((f) => [f.machine_id, f.engine_id]));
  const machines: EngineConfig["machines"] = {};
  for (const f of fleet.rows) machines[f.machine_id] = { engine: f.engine_id, signals: [], rules: [] };
  for (const r of signals.rows) {
    let limit = null;
    if (r.kind_id) {
      const row: LimitRow = {
        kind: r.kind_id as LimitRow["kind"],
        direction: (r.direction as LimitRow["direction"]) ?? null,
        warnValue: n(r.warn_value),
        alarmValue: n(r.alarm_value),
        warnLo: n(r.warn_lo),
        warnHi: n(r.warn_hi),
        alarmLo: n(r.alarm_lo),
        alarmHi: n(r.alarm_hi),
        warnPct: n(r.warn_pct),
        alarmPct: n(r.alarm_pct),
        collapsePct: n(r.collapse_pct),
        ratio: n(r.ratio),
        rise: n(r.rise),
        split: n(r.split),
        pairTag: (r.pair_tag as string) ?? null,
        driveTag: (r.drive_tag as string) ?? null,
        driveOn: n(r.drive_on),
        referenceValue: n(r.reference_value),
        absWarnLo: n(r.abs_warn_lo),
        absWarnHi: n(r.abs_warn_hi),
        absAlarmLo: n(r.abs_alarm_lo),
        absAlarmHi: n(r.abs_alarm_hi),
        ratePerHour: n(r.rate_per_hour),
        rateOf: (r.rate_of as LimitRow["rateOf"]) ?? null,
        rateWindow: n(r.rate_window),
        raiseSamples: Number(r.raise_samples),
        clearSamples: Number(r.clear_samples),
        basisNormal: (r.basis_normal as string) ?? null,
        basisWarning: (r.basis_warning as string) ?? null,
        basisAlarm: (r.basis_alarm as string) ?? null,
        source: (r.source as string) ?? null,
        note: (r.note as string) ?? null,
        approval: r.approval as LimitRow["approval"],
      };
      try {
        limit = limitRuleFromRow(row);
      } catch {
        limit = null;
      }
    }
    const machineId = String(r.machine_id);
    if (!engineOf.has(machineId)) continue;
    const sig: EngineSignalConfig = {
      tag: String(r.tag),
      name: String(r.name),
      unit: r.value_kind === "state" ? "state" : String(r.unit ?? ""),
      decimals: Number(r.decimals),
      instrument: (r.instrument as string) ?? null,
      normalBand: (r.normal_text as string) ?? null,
      limit,
      states: statesBy.get(String(r.measurement_id)) ?? null,
    };
    machines[machineId].signals.push(sig);
  }
  for (const r of rules.rows) {
    const rule: EngineRuleConfig = { code: r.code, name: r.name, logic: r.logic, cause: r.cause, consequence: r.consequence, action: r.action, owner: r.owner, unproven: r.unproven, hold: r.hold };
    machines[r.machine_id]?.rules.push(rule);
  }
  const [sim, parts] = await Promise.all([
    query<{ settings: Partial<LineSimSettings>; version: number }>("SELECT settings, version FROM simulation_settings WHERE id = 'pyro-line'"),
    query<{ id: string; machine_id: string; sub: string | null; name: string; basis: "h" | "d"; life: string; due_share: string; used: string; counter_h: string; installed: string | null; duty: string | null }>(
      `SELECT c.id, c.machine_id, sa.subassembly_id AS sub, c.name, c.basis, c.life, c.due_share, c.used, c.counter_h, c.installed, c.duty
         FROM component_service_lives c LEFT JOIN machine_subassemblies sa ON sa.id = c.subassembly_ref_id
        WHERE c.machine_id = ANY($1) ORDER BY c.machine_id, c.sort_order`,
      [ids],
    ),
  ]);
  return {
    lineSim: sim.rows[0] ? { settings: sim.rows[0].settings, version: Number(sim.rows[0].version) } : null,
    // pg returns numeric as strings.
    serviceParts: parts.rows.map((p) => ({
      id: p.id,
      machine: p.machine_id,
      sub: p.sub,
      name: p.name,
      basis: p.basis,
      life: Number(p.life),
      dueShare: Number(p.due_share),
      used: Number(p.used),
      counterH: Number(p.counter_h),
      installed: p.installed,
      duty: p.duty,
    })),
    fleet: fleet.rows
      .filter((f) => f.seed !== null && f.profile !== null)
      .map((f) => ({ machineId: f.machine_id, engine: f.engine_id, seed: f.seed!, profile: f.profile! })),
    machines,
    at: new Date().toISOString(),
  };
}
