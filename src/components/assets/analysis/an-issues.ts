/**
 * Analysis · issues — one entry per thing worth explaining, in fixed order:
 *
 *   fault      a condition rule the engine is matching now (confirming,
 *              active or clearing), rule-library order — "why is it happening"
 *   predicted  a sub-assembly Prognosis gives a failure chance within 6 months
 *              and no matching fault, sub-assembly definition order — "why will
 *              it happen"
 *
 * Per issue: the evidence (rule inputs against the reference model), the
 * order in which sub-assemblies left the model, alternatives, the forecast
 * signals and correlation shifts behind a prediction, and what it affects
 * (health points it costs, remaining life it sets, time to limit). Every
 * value comes from the live frame, the health roll-up or the Prognosis
 * payload; nothing is estimated here.
 */

import type { RuleState, SimFrame } from "@shared/lib/kiln-sim/engine";
import { isConditionRule, type PlantDefs } from "@shared/lib/plant-defs";
import { displayName } from "@/lib/display-name";
import type { CorrelationPair } from "@backend/services/insights-service";
import type { Contribution } from "../health-derive";
import { failureChance, FAILURE_HORIZONS, type PrognosisData, type RulRow } from "../prognosis/prognosis-derive";
import type { SignalForecastRow } from "../prognosis/prog-signals";
import { deviationChain, detectionRows, isUnknown, type ChainNode } from "./an-derive";

export type IssueKind = "fault" | "predicted";

export interface Issue {
  key: string;
  kind: IssueKind;
  title: string;
  /** Sub-assemblies, comma separated. */
  where: string;
  subIds: string[];
  /** Live rule (fault issues). */
  rule: RuleState | null;
  /** Prognosis remaining-life rows this issue sets or concerns. */
  life: RulRow[];
}

const subNames = (defs: PlantDefs, ids: string[]) =>
  ids.map((x) => defs.subassemblies.find((sa) => sa.id === x)?.name ?? x).join(", ");

export function buildIssues(frame: SimFrame | null, rul: RulRow[], defs: PlantDefs | null): Issue[] {
  const out: Issue[] = [];
  if (frame) {
    const order = new Map(frame.defs.rules.map((r, i) => [r.id, i]));
    const firing = frame.rules
      .filter((r) => r.status !== "QUIET" && isConditionRule(r))
      .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
    for (const r of firing) {
      out.push({
        key: `fault-${r.id}`,
        kind: "fault",
        title: r.plainTitle || r.name,
        where: subNames(frame.defs, r.subs) || r.system,
        subIds: r.subs,
        rule: r,
        life: rul.filter((x) => x.driver?.id === r.id || r.subs.includes(x.id)),
      });
    }
  }
  const covered = new Set(out.flatMap((i) => i.subIds));
  const subOrder = new Map((defs?.subassemblies ?? []).map((sa, i) => [sa.id, i]));
  const sixMonths = FAILURE_HORIZONS[FAILURE_HORIZONS.length - 1].hours;
  const predicted = rul
    // A reading heading toward its limit always counts; a part's life only once it is more likely than not to fail within 6 months.
    .filter((x) => x.band !== null && failureChance(x.band, sixMonths) > (x.life ? 50 : 0) && !covered.has(x.id))
    .sort((a, b) => (subOrder.get(a.id) ?? 999) - (subOrder.get(b.id) ?? 999));
  for (const x of predicted) {
    out.push({ key: `pred-${x.id}`, kind: "predicted", title: x.name, where: x.name, subIds: [x.id], rule: null, life: [x] });
  }
  return out;
}

/** The issue another page asked for: by rule id, else by sub-assembly name. */
export function issueFor(issues: Issue[], ruleId: string | null, component: string | null): Issue | null {
  if (ruleId) {
    const hit = issues.find((i) => i.rule?.id === ruleId);
    if (hit) return hit;
  }
  if (component) {
    const c = component.toLowerCase();
    const hit = issues.find((i) => i.where.toLowerCase().split(/,\s*/).some((w) => w === c || c.includes(w)));
    if (hit) return hit;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Why it is happening                                                 */
/* ------------------------------------------------------------------ */

export interface EvidenceRow {
  tag: string;
  name: string;
  unit: string;
  value: number | null;
  display: string;
  expected: number | null;
  z: number | null;
  /** The rule fired on this sensor. */
  fired: boolean;
  validity: "Valid" | "Suspect" | "Invalid" | "No data";
}

export function evidenceFor(rule: RuleState, frame: SimFrame): EvidenceRow[] {
  const inputs = frame.defs.ruleById[rule.id]?.inputs ?? [];
  const tags = Array.from(new Set([...inputs, ...rule.tags]));
  const fired = new Set(rule.tags);
  return tags.map((tag) => {
    const s = frame.signals[tag];
    const def = frame.defs.signalByTag[tag];
    return {
      tag,
      name: def ? displayName(def.name) : tag,
      unit: def?.unit ?? "",
      value: s?.value ?? null,
      display: s?.display ?? "—",
      expected: s?.model ?? null,
      z: s?.z ?? null,
      fired: fired.has(tag),
      validity: !s ? "No data" : s.quality === "Good" ? "Valid" : s.quality,
    };
  });
}

/** Sub-assemblies currently off the reference model, in process-flow order, with when each left it. */
export const deviationOrder = (frame: SimFrame): ChainNode[] => deviationChain(frame);

/**
 * Other explanations for a fault: other firing rules that read the same
 * sensors, and evidence sensors that validation does not trust.
 */
export function alternatives(rule: RuleState, frame: SimFrame): string[] {
  const out: string[] = [];
  const mine = new Set([...(frame.defs.ruleById[rule.id]?.inputs ?? []), ...rule.tags]);
  for (const o of frame.rules) {
    if (o.id === rule.id || o.status === "QUIET" || !isConditionRule(o)) continue;
    const shared = [...new Set([...(frame.defs.ruleById[o.id]?.inputs ?? []), ...o.tags])].filter((t) => mine.has(t));
    const names = shared.map((t) => displayName(frame.defs.signalByTag[t]?.name ?? t));
    if (shared.length) out.push(`${o.plainTitle || o.name}: also uses ${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}`);
  }
  const untrusted = [...mine].filter((t) => frame.signals[t] && frame.signals[t].quality !== "Good");
  if (untrusted.length) out.push(`A sensor may be faulty: ${untrusted.map((t) => displayName(frame.defs.signalByTag[t]?.name ?? t)).join(", ")} failed the sensor checks, so its reading may be wrong`);
  return out;
}

/** Signals beyond 3σ that no rule accounts for (unknown anomalies). */
export const unexplained = (frame: SimFrame) => detectionRows(frame).filter(isUnknown);

/* ------------------------------------------------------------------ */
/* Why it will happen                                                  */
/* ------------------------------------------------------------------ */

/** Forecast signals of the issue's sub-assemblies whose forecast reaches a limit within 30 d. */
export function trendingSignals(issue: Issue, rows: SignalForecastRow[], data: PrognosisData): SignalForecastRow[] {
  const subs = new Set(issue.subIds);
  return rows.filter((r) => subs.has(data.locations[r.tag]?.subassemblyId ?? "") && (r.alarmEarly !== null || r.alarmLate !== null));
}

/** Correlation shifts (|Δr| ≥ 0.3 on a pair that was or became strong) touching the issue's sensors. */
export function couplingShifts(issue: Issue, data: PrognosisData): (CorrelationPair & { baseline: number; recent: number; delta: number })[] {
  const subs = new Set(issue.subIds);
  const inIssue = (tag: string) => subs.has(data.locations[tag]?.subassemblyId ?? "");
  return data.correlation.pairs
    .filter((p): p is CorrelationPair & { baseline: number; recent: number } => p.baseline !== undefined && p.recent !== undefined)
    .map((p) => ({ ...p, delta: p.recent - p.baseline }))
    .filter((p) => (inIssue(p.a) || inIssue(p.b)) && Math.abs(p.delta) >= 0.3 && Math.max(Math.abs(p.baseline), Math.abs(p.recent)) >= 0.5)
    // Stable order (by pair), so rows do not move as the coefficients update.
    .sort((x, y) => `${x.a}|${x.b}`.localeCompare(`${y.a}|${y.b}`));
}

/* ------------------------------------------------------------------ */
/* What it affects                                                     */
/* ------------------------------------------------------------------ */

export interface ImpactRow {
  subId: string;
  name: string;
  /** Health now (0–100) and points this issue costs it now (fault issues). */
  health: number | null;
  points: number | null;
  life: RulRow | null;
}

export function impactFor(issue: Issue, frame: SimFrame | null, contributions: Contribution[] | null, rul: RulRow[]): ImpactRow[] {
  return issue.subIds.map((id) => {
    const pts = issue.rule ? (contributions ?? []).filter((c) => c.kind === "rule" && c.rule?.id === issue.rule?.id && c.subId === id) : [];
    const life = rul.find((x) => x.id === id) ?? null;
    const cell = frame?.subs[id];
    return {
      subId: id,
      name: life?.name ?? frame?.defs.subassemblies.find((s) => s.id === id)?.name ?? id,
      health: cell ? Math.round(cell.health) : (life?.health ?? null),
      points: issue.rule ? Math.round(pts.reduce((a, c) => a + c.points, 0) * 10) / 10 : null,
      life,
    };
  });
}
