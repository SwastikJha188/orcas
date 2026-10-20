/**
 * Converts a measurement limit between its database row (`measurement_limits`)
 * and the `LimitRule` the evaluation code reads. The database is the source of
 * truth; this is the one place the two shapes meet.
 *
 * Pure data, no React and no server imports.
 */
import type { LimitBand, LimitDir, LimitRule } from "./kiln-sim/signals";

/** `measurement_limits` columns, camel-cased; pair / drive are tags of the same machine. */
export interface LimitRow {
  kind: LimitRule["kind"];
  direction: LimitDir | null;
  warnValue: number | null;
  alarmValue: number | null;
  warnLo: number | null;
  warnHi: number | null;
  alarmLo: number | null;
  alarmHi: number | null;
  warnPct: number | null;
  alarmPct: number | null;
  collapsePct: number | null;
  ratio: number | null;
  rise: number | null;
  split: number | null;
  pairTag: string | null;
  driveTag: string | null;
  driveOn: number | null;
  referenceValue: number | null;
  absWarnLo: number | null;
  absWarnHi: number | null;
  absAlarmLo: number | null;
  absAlarmHi: number | null;
  ratePerHour: number | null;
  rateOf: "value" | "residual" | null;
  rateWindow: number | null;
  raiseSamples: number;
  clearSamples: number;
  basisNormal: string | null;
  basisWarning: string | null;
  basisAlarm: string | null;
  source: string | null;
  note: string | null;
  approval: "provisional" | "approved";
}

const n = (v: number | null | undefined): number | undefined => (v === null || v === undefined || !Number.isFinite(v) ? undefined : v);
const req = (v: number | null | undefined, what: string): number => {
  const x = n(v);
  if (x === undefined) throw new Error(`limit is missing ${what}`);
  return x;
};

function bandOf(lo1: number | null, hi1: number | null, lo2: number | null, hi2: number | null): LimitBand | undefined {
  const b: LimitBand = { warnLo: n(lo1), warnHi: n(hi1), alarmLo: n(lo2), alarmHi: n(hi2) };
  return Object.values(b).some((x) => x !== undefined) ? b : undefined;
}

/** The evaluation rule a stored limit describes. */
export function limitRuleFromRow(r: LimitRow): LimitRule {
  const abs = bandOf(r.absWarnLo, r.absWarnHi, r.absAlarmLo, r.absAlarmHi);
  const dir = (r.direction ?? "both") as LimitDir;
  let rule: LimitRule;
  switch (r.kind) {
    case "hi":
    case "lo":
    case "abs":
      rule = { kind: r.kind, warn: req(r.warnValue, "warn"), alarm: req(r.alarmValue, "alarm") };
      break;
    case "band":
      rule = { kind: "band", warnLo: n(r.warnLo), warnHi: n(r.warnHi), alarmLo: n(r.alarmLo), alarmHi: n(r.alarmHi) };
      break;
    case "setpoint":
      rule = { kind: "setpoint", warnPct: req(r.warnPct, "warnPct"), alarmPct: req(r.alarmPct, "alarmPct") };
      break;
    case "modelPct":
      rule = { kind: "modelPct", dir, warnPct: req(r.warnPct, "warnPct"), alarmPct: n(r.alarmPct), collapsePct: n(r.collapsePct), ref: req(r.referenceValue, "reference"), abs };
      break;
    case "modelDev":
      rule = { kind: "modelDev", dir, warn: req(r.warnValue, "warn"), alarm: n(r.alarmValue), ref: req(r.referenceValue, "reference"), abs };
      break;
    case "bearing":
      rule = { kind: "bearing", rise: req(r.rise, "rise"), split: n(r.split), pair: r.pairTag ?? undefined, alarm: req(r.alarmValue, "alarm"), ref: req(r.referenceValue, "reference") };
      break;
    case "vib":
      rule = { kind: "vib", warn: req(r.warnValue, "warn"), ratio: req(r.ratio, "ratio"), alarm: req(r.alarmValue, "alarm"), ref: req(r.referenceValue, "reference") };
      break;
    case "speedRef":
      rule = { kind: "speedRef", warnPct: req(r.warnPct, "warnPct"), alarmPct: req(r.alarmPct, "alarmPct"), drive: r.driveTag ?? undefined, driveOn: n(r.driveOn), ref: req(r.referenceValue, "reference") };
      break;
    case "command":
      rule = { kind: "command", warnDev: req(r.warnValue, "warn"), ref: req(r.referenceValue, "reference"), abs };
      break;
    default:
      throw new Error(`unknown limit kind ${String(r.kind)}`);
  }
  if (n(r.ratePerHour) !== undefined) rule.rate = { perH: r.ratePerHour!, of: r.rateOf ?? undefined, window: n(r.rateWindow) };
  if (r.basisNormal || r.basisWarning || r.basisAlarm || r.source) {
    rule.d5 = { normal: r.basisNormal ?? "", warning: r.basisWarning ?? "", alarm: r.basisAlarm ?? "", source: r.source ?? "", note: r.note ?? undefined };
  }
  return stripUndefined(rule);
}

function stripUndefined<T extends object>(o: T): T {
  for (const k of Object.keys(o) as Array<keyof T>) {
    if (o[k] === undefined) delete o[k];
    else if (o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) stripUndefined(o[k] as object);
  }
  return o;
}

const EMPTY: Omit<LimitRow, "kind"> = {
  direction: null,
  warnValue: null,
  alarmValue: null,
  warnLo: null,
  warnHi: null,
  alarmLo: null,
  alarmHi: null,
  warnPct: null,
  alarmPct: null,
  collapsePct: null,
  ratio: null,
  rise: null,
  split: null,
  pairTag: null,
  driveTag: null,
  driveOn: null,
  referenceValue: null,
  absWarnLo: null,
  absWarnHi: null,
  absAlarmLo: null,
  absAlarmHi: null,
  ratePerHour: null,
  rateOf: null,
  rateWindow: null,
  raiseSamples: 3,
  clearSamples: 6,
  basisNormal: null,
  basisWarning: null,
  basisAlarm: null,
  source: null,
  note: null,
  approval: "provisional",
};

const v = (x: number | undefined): number | null => (x === undefined ? null : x);

/** The stored row for an evaluation rule (used when importing a specification). */
export function limitRowFromRule(l: LimitRule, persistence?: { raise: number; clear: number }): LimitRow {
  const row: LimitRow = { ...EMPTY, kind: l.kind };
  if (persistence) {
    row.raiseSamples = persistence.raise;
    row.clearSamples = persistence.clear;
  }
  const absOf = (b: LimitBand | undefined) => {
    row.absWarnLo = v(b?.warnLo);
    row.absWarnHi = v(b?.warnHi);
    row.absAlarmLo = v(b?.alarmLo);
    row.absAlarmHi = v(b?.alarmHi);
  };
  switch (l.kind) {
    case "hi":
    case "lo":
    case "abs":
      row.warnValue = l.warn;
      row.alarmValue = l.alarm;
      break;
    case "band":
      row.warnLo = v(l.warnLo);
      row.warnHi = v(l.warnHi);
      row.alarmLo = v(l.alarmLo);
      row.alarmHi = v(l.alarmHi);
      break;
    case "setpoint":
      row.warnPct = l.warnPct;
      row.alarmPct = l.alarmPct;
      break;
    case "modelPct":
      row.direction = l.dir;
      row.warnPct = l.warnPct;
      row.alarmPct = v(l.alarmPct);
      row.collapsePct = v(l.collapsePct);
      row.referenceValue = l.ref;
      absOf(l.abs);
      break;
    case "modelDev":
      row.direction = l.dir;
      row.warnValue = l.warn;
      row.alarmValue = v(l.alarm);
      row.referenceValue = l.ref;
      absOf(l.abs);
      break;
    case "bearing":
      row.rise = l.rise;
      row.split = v(l.split);
      row.pairTag = l.pair ?? null;
      row.alarmValue = l.alarm;
      row.referenceValue = l.ref;
      break;
    case "vib":
      row.warnValue = l.warn;
      row.ratio = l.ratio;
      row.alarmValue = l.alarm;
      row.referenceValue = l.ref;
      break;
    case "speedRef":
      row.warnPct = l.warnPct;
      row.alarmPct = l.alarmPct;
      row.driveTag = l.drive ?? null;
      row.driveOn = v(l.driveOn);
      row.referenceValue = l.ref;
      break;
    case "command":
      row.warnValue = l.warnDev;
      row.referenceValue = l.ref;
      absOf(l.abs);
      break;
  }
  if (l.rate) {
    row.ratePerHour = l.rate.perH;
    row.rateOf = l.rate.of ?? null;
    row.rateWindow = v(l.rate.window);
  }
  if (l.d5) {
    row.basisNormal = l.d5.normal || null;
    row.basisWarning = l.d5.warning || null;
    row.basisAlarm = l.d5.alarm || null;
    row.source = l.d5.source || null;
    row.note = l.d5.note ?? null;
  }
  return row;
}
