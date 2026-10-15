/**
 * Condition report accumulator (D4-OSW-PE-PYR Rev. 02 Table 11.1, outputs:
 * "monthly condition report").
 *
 * Frames only keep a 6 h history and the last 60 events, so a report period
 * needs its own running totals. `recordFrames` is called with every simulated
 * minute the line engine produces (fast-forward included); `conditionReport`
 * returns a snapshot per machine. Pure TypeScript, no React.
 */
import type { SimFrame } from "./kiln-sim/engine";
import { isConditionRule } from "./plant-defs";

type Condition = SimFrame["condition"];

export interface ReportFinding {
  id: string;
  name: string;
  /** Times the rule was confirmed in the period. */
  confirmed: number;
  worst: "Advisory" | "Critical";
  /** Simulated minute of the last confirmation. */
  lastT: number;
}

export interface MachineReport {
  machineId: string;
  /** First and last simulated minute recorded. */
  fromT: number;
  toT: number;
  minutes: number;
  minutesIn: Record<Condition, number>;
  healthStart: number;
  healthNow: number;
  healthMin: number;
  healthMean: number;
  /** Mean share of online entries trusted (not suspect / invalid), 0–1. */
  availability: number;
  findings: ReportFinding[];
  /** Operator actions logged in the period (acknowledge, mitigate, repair …). */
  actions: number;
  /** Service-life advisories open at the end of the period (SW-ALL-01). */
  serviceDue: string | null;
  openNow: number;
}

interface Acc {
  fromT: number;
  toT: number;
  minutes: number;
  minutesIn: Record<Condition, number>;
  healthStart: number;
  healthNow: number;
  healthMin: number;
  healthSum: number;
  availSum: number;
  findings: Map<string, ReportFinding>;
  prevStatus: Map<string, string>;
  actions: number;
  lastEventT: number;
}

const ACC = new Map<string, Acc>();

/** Online entries per machine (manual records and derived values excluded). */
function onlineTags(f: SimFrame): string[] {
  return f.defs.signals.filter((d) => (d.origin ?? (d.calculated ? "calculated" : "online")) === "online").map((d) => d.tag);
}

const tagCache = new WeakMap<object, string[]>();

/** Add one simulated minute of frames (machine id → frame); returns the frames unchanged. */
export function recordFrames<T extends Record<string, SimFrame>>(frames: T): T {
  for (const [id, f] of Object.entries(frames)) {
    if (!f) continue;
    let a = ACC.get(id);
    if (!a) {
      a = {
        fromT: f.t,
        toT: f.t,
        minutes: 0,
        minutesIn: { Healthy: 0, Advisory: 0, Critical: 0 },
        healthStart: f.overall,
        healthNow: f.overall,
        healthMin: f.overall,
        healthSum: 0,
        availSum: 0,
        findings: new Map(),
        prevStatus: new Map(),
        actions: 0,
        lastEventT: f.t,
      };
      ACC.set(id, a);
    }
    if (f.t <= a.toT && a.minutes > 0) continue;
    a.toT = f.t;
    a.minutes += 1;
    a.minutesIn[f.condition] += 1;
    a.healthNow = f.overall;
    a.healthMin = Math.min(a.healthMin, f.overall);
    a.healthSum += f.overall;

    let tags = tagCache.get(f.defs);
    if (!tags) {
      tags = onlineTags(f);
      tagCache.set(f.defs, tags);
    }
    let ok = 0;
    for (const tg of tags) {
      const q = f.signals[tg]?.quality;
      if (q && q !== "Invalid" && q !== "Suspect") ok++;
    }
    a.availSum += tags.length ? ok / tags.length : 1;

    for (const r of f.rules) {
      const prev = a.prevStatus.get(r.id) ?? "QUIET";
      a.prevStatus.set(r.id, r.status);
      if (r.status !== "ACTIVE" || prev === "ACTIVE" || !isConditionRule(r)) continue;
      const sev = r.severity === "Critical" ? "Critical" : "Advisory";
      const cur = a.findings.get(r.id);
      if (cur) {
        cur.confirmed += 1;
        cur.lastT = f.t;
        if (sev === "Critical") cur.worst = "Critical";
      } else a.findings.set(r.id, { id: r.id, name: r.name, confirmed: 1, worst: sev, lastT: f.t });
    }
    for (const e of f.events) if (e.kind === "action" && e.t > a.lastEventT) a.actions += 1;
    for (const e of f.events) if (e.t > a.lastEventT) a.lastEventT = e.t;
  }
  return frames;
}

/** Snapshot of the report for the given machines (missing machines are skipped). */
export function conditionReport(machineIds: string[], frames: Record<string, SimFrame | null | undefined>): MachineReport[] {
  const out: MachineReport[] = [];
  for (const id of machineIds) {
    const a = ACC.get(id);
    const f = frames[id];
    if (!a || !f) continue;
    const svc = f.rules.find((r) => r.category === "Service life" && r.status === "ACTIVE");
    out.push({
      machineId: id,
      fromT: a.fromT,
      toT: a.toT,
      minutes: a.minutes,
      minutesIn: { ...a.minutesIn },
      healthStart: a.healthStart,
      healthNow: a.healthNow,
      healthMin: a.healthMin,
      healthMean: a.minutes ? a.healthSum / a.minutes : a.healthNow,
      availability: a.minutes ? a.availSum / a.minutes : 1,
      findings: [...a.findings.values()].sort((x, y) => (x.worst === y.worst ? y.confirmed - x.confirmed : x.worst === "Critical" ? -1 : 1)),
      actions: a.actions,
      serviceDue: svc ? svc.evidence : null,
      openNow: f.rules.filter((r) => r.status === "ACTIVE" && isConditionRule(r)).length,
    });
  }
  return out;
}
