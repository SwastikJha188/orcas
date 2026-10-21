/**
 * Operators' answers to "Is this problem real?" (Analysis page), per machine rule.
 * The answer words come from verdict_kinds; rule_verdicts keeps every answer with
 * who gave it and when, and the latest one per rule is the current answer.
 */
import { query } from "@backend/db";
import { InputError, NotFoundError } from "@backend/errors";

export interface VerdictKindDto {
  id: string;
  name: string;
}

export interface RuleVerdictDto {
  kind: string;
  at: string;
  by: string | null;
}

export interface MachineVerdictsDto {
  kinds: VerdictKindDto[];
  /** Current answer by rule code (e.g. R-BRN-05); rules without an answer are absent. */
  byRule: Record<string, RuleVerdictDto>;
}

export async function machineVerdicts(machineId: string): Promise<MachineVerdictsDto> {
  const kinds = await query<{ id: string; name: string }>("SELECT id, name FROM verdict_kinds ORDER BY sort_order");
  const latest = await query<{ code: string; kind: string | null; at: Date; by: string | null }>(
    `SELECT DISTINCT ON (v.rule_id) r.code, v.verdict_kind_id AS kind, v.recorded_at AS at, u.full_name AS by
       FROM rule_verdicts v
       JOIN rules r ON r.id = v.rule_id
       LEFT JOIN users u ON u.id = v.user_id
      WHERE r.machine_id = $1
      ORDER BY v.rule_id, v.recorded_at DESC, v.id DESC`,
    [machineId],
  );
  const byRule: Record<string, RuleVerdictDto> = {};
  for (const row of latest.rows) if (row.kind) byRule[row.code] = { kind: row.kind, at: row.at.toISOString(), by: row.by };
  return { kinds: kinds.rows, byRule };
}

/** Records an answer (or withdraws it with `kind: null`) for one rule of a machine. */
export async function setMachineVerdict(machineId: string, input: { ruleCode?: string; kind?: string | null }, userId: string | null): Promise<MachineVerdictsDto> {
  const code = input.ruleCode?.trim();
  if (!code) throw new InputError("ruleCode is required");
  const rule = await query<{ id: number }>("SELECT id FROM rules WHERE machine_id = $1 AND code = $2", [machineId, code]);
  if (!rule.rowCount) throw new NotFoundError(`Rule ${code} does not exist on machine ${machineId}`);
  const kind = input.kind ?? null;
  if (kind !== null) {
    const ok = await query("SELECT 1 FROM verdict_kinds WHERE id = $1", [kind]);
    if (!ok.rowCount) throw new InputError(`kind ${kind} is not a known answer`);
  }
  await query("INSERT INTO rule_verdicts (rule_id, verdict_kind_id, user_id) VALUES ($1, $2, $3)", [rule.rows[0].id, kind, userId]);
  return machineVerdicts(machineId);
}
