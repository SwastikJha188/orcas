/**
 * Alarm journal (ISA-18.2) read from the server evaluation's findings.
 * Pure TypeScript, no React.
 *
 * An alarm point is one condition rule on one machine. The server opens a
 * rule_pattern finding when the rule is confirmed and clears it when the rule
 * returns to quiet (/api/findings, with alarm_raised / alarm_cleared machine
 * events). Acknowledging is separate from clearing: a finding that cleared
 * before anyone acknowledged it stays unacknowledged ("returned to normal,
 * unacknowledged") until someone does.
 */
import { isConditionRule } from "@shared/lib/plant-defs";
import type { SimFrame } from "@shared/lib/kiln-sim/engine";
import type { FindingDto } from "@shared/types/monitoring";

/** A condition rule the live engine has confirmed. */
export interface RaisedAlarm {
  ruleId: string;
  /** Engine minute the rule was confirmed. */
  since: number;
  triggerTag: string | null;
  triggerValue: number | null;
}

/** Condition rules confirmed now (ACTIVE, including clearing). Data-quality and service-life rules are not alarms. */
export function raisedAlarms(frame: SimFrame): RaisedAlarm[] {
  const out: RaisedAlarm[] = [];
  for (const r of frame.rules) {
    if (r.status !== "ACTIVE" || r.since === null || !isConditionRule(r)) continue;
    const tag = r.tags[0] ?? null;
    const v = tag ? frame.signals[tag]?.value : null;
    out.push({ ruleId: r.id, since: r.since, triggerTag: tag, triggerValue: typeof v === "number" && Number.isFinite(v) ? v : null });
  }
  return out;
}

/** Changes only when an alarm is raised or clears: the journal is re-read on change. */
export function raisedKey(list: RaisedAlarm[]): string {
  return list.map((a) => `${a.ruleId}@${a.since}`).sort().join("|");
}

export interface ClearedAlarm {
  ruleId: string;
  /** Plant clock (ms) the latest unacknowledged occurrence cleared; null until the journal has recorded it. */
  clearedAt: number | null;
  triggerTag: string | null;
}

export interface JournalState {
  /** Raised rules whose current occurrence is acknowledged in the journal. */
  acked: Set<string>;
  /** Rules not raised now with an occurrence nobody acknowledged (returned to normal, unacknowledged). */
  cleared: Map<string, ClearedAlarm>;
}

/** Findings that are alarm occurrences of a condition rule (the rule code is the engine's rule id). */
export const isRuleFinding = (f: FindingDto): f is FindingDto & { rule: NonNullable<FindingDto["rule"]> } => f.rule !== null;

/** Read a machine's journal (its findings from the database) against its live frame. */
export function journalState(frame: SimFrame | null, findings: readonly FindingDto[]): JournalState {
  const raised = new Set(frame ? raisedAlarms(frame).map((a) => a.ruleId) : []);
  const acked = new Set<string>();
  const cleared = new Map<string, ClearedAlarm>();
  for (const f of findings) {
    if (!isRuleFinding(f)) continue;
    const ruleId = f.rule.code;
    // Only the machine's condition rules are alarms; data-quality and service-life rules are not.
    const def = frame?.defs.ruleById[ruleId];
    if (!def || !isConditionRule(def)) continue;
    if (raised.has(ruleId)) {
      if (f.clearedAt === null && f.acknowledgement !== null) acked.add(ruleId);
      continue;
    }
    if (f.acknowledgement !== null) continue;
    // Not raised now: cleared, even while the server evaluation has not cleared the finding yet.
    const at = f.clearedAt ? Date.parse(f.clearedAt) : null;
    const prev = cleared.get(ruleId);
    // Newest wins; a clear the evaluation has not recorded yet is the newest.
    if (!prev || (prev.clearedAt !== null && (at === null || at > prev.clearedAt))) {
      cleared.set(ruleId, { ruleId, clearedAt: at, triggerTag: null });
    }
  }
  return { acked, cleared };
}
