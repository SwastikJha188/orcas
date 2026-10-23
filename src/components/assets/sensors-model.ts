/* ==========================================================================
   Machine › Sensors — data model.
   Pure derivations for the Sensors page: data-quality verdicts, the D5
   sensor-validation method behind each verdict (Table 9.6) with the tags it
   covers derived from the DB catalog, limit approval captions from the DB
   limit rows, and the calculated values of D5 Table 9.2. No React.
   ========================================================================== */

import type { MachineLivePoint } from "@shared/types/edge";
import type { MeasurementDto, MeasurementLimitDto } from "@shared/types/monitoring";
import type { SimEvent, SimFrame } from "@shared/lib/kiln-sim/engine";
import { EQUATION_BY_TARGET } from "@/lib/kiln-sim/relationships";
import type { DefSignal, PlantDefs } from "@shared/lib/plant-defs";
import { PYRO_DEFS } from "@shared/lib/pyro-sim/defs";
import { PYRO_SPEC, type PyroSpecEntry } from "@shared/lib/pyro-sim/spec";
import { VPC_SPEC } from "@shared/lib/vpc-sim/signals";
import {
  ANALYSERS as PYRO_ANALYSERS,
  BLOWBACK_STUCK_MIN as PYRO_BLOWBACK_STUCK_MIN,
  HANDHELD_GAP_K as PYRO_HANDHELD_GAP_K,
  NEIGHBOUR_CHECKS as PYRO_NEIGHBOUR_CHECKS,
  NOISY_FACTOR as PYRO_NOISY_FACTOR,
  NOISY_WINDOW as PYRO_NOISY_WINDOW,
  SCANNER_COVERAGE_TARGET as PYRO_COVERAGE_TARGET,
  VIB_TMP_PAIRS as PYRO_VIB_TMP_PAIRS,
} from "@shared/lib/pyro-sim/sensor-meta";
import type { Tone } from "./assets-shell-ui";
import type { DetailedSensorInfo } from "./machine-sensor-mapping-view";
import { VALIDITY_WORDS } from "@/components/ui/status";

/* ------------------------------------------------------------ basics */

export const tagOf = (s: DetailedSensorInfo) => s.parameter || s.id;
export const isCalculated = (s: DetailedSensorInfo) => s.source === "Calculated" || /ANALYTICS/i.test(s.cardId);
/** Dated manual record (laboratory, handheld round): entered in ULTRON, never a wired channel. */
export const isManual = (s: DetailedSensorInfo) => s.source === "Manual" || /MANUAL/i.test(s.cardId);
/** On a wired gateway channel: neither calculated nor a manual record. */
export const isWired = (s: DetailedSensorInfo) => !isCalculated(s) && !isManual(s);
export const isOnOff = (s: DetailedSensorInfo) => s.unit === "state";
export const unitText = (s: DetailedSensorInfo) => (s.unit && s.unit !== "state" ? s.unit : "");

export function fmt(v: number): string {
  const a = Math.abs(v);
  return v.toFixed(a >= 100 ? 0 : a >= 10 ? 1 : 2);
}

/** Normalises free-text DB sample rates to samples per second. */
export function parseSampleRate(raw: string): { sps: number | null; label: string } {
  const s = (raw || "").trim();
  if (!s) return { sps: null, label: "—" };
  let m = s.match(/([\d.]+)\s*(k)?\s*(S\/s|Hz)\b/i);
  if (m) return finalize(parseFloat(m[1]) * (m[2] ? 1000 : 1));
  m = s.match(/([\d.]+)\s*ms\b/i);
  if (m) return finalize(1000 / parseFloat(m[1]));
  if (/rev\/s/i.test(s)) return finalize(1);
  m = s.match(/([\d.]+)\s*min\b/i);
  if (m) return finalize(1 / (60 * parseFloat(m[1])));
  m = s.match(/([\d.]+)\s*s\b/);
  if (m) return finalize(1 / parseFloat(m[1]));
  if (/change/i.test(s)) return { sps: null, label: "When it changes" };
  if (/model|internal|derived/i.test(s)) return { sps: null, label: "Worked out" };
  return { sps: null, label: "—" };
}

function finalize(sps: number) {
  return { sps, label: formatSps(sps) };
}

export function formatSps(sps: number): string {
  if (sps >= 1000) return `${+(sps / 1000).toFixed(1)}k per s`;
  if (sps >= 1) return `${+sps.toFixed(1)} per s`;
  if (sps >= 1 / 60) return `every ${+(1 / sps).toFixed(0)} s`;
  return `every ${+(1 / sps / 60).toFixed(0)} min`;
}

export function slotOf(cardId: string): { slot: string; module: string } {
  const m = cardId.match(/^(.*?)\s*\((Slot\s*\d+)\)/i);
  if (m) return { slot: m[2], module: m[1] };
  return { slot: cardId || "—", module: "" };
}

/** "0–50 mm/s", "−50 … +50 mm", "−20 … +5" → numeric span, or null. */
export function parseRange(raw: string | undefined): { lo: number; hi: number } | null {
  if (!raw) return null;
  const s = raw.replace(/[−–]/g, (c) => (c === "−" ? "-" : "–")).replace(/,/g, "");
  const m = s.match(/([+-]?\d+(?:\.\d+)?)\s*(?:–|\.\.\.|…|to)\s*([+-]?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lo = parseFloat(m[1]);
  const hi = parseFloat(m[2]);
  return Number.isFinite(lo) && Number.isFinite(hi) && hi > lo ? { lo, hi } : null;
}

/* ------------------------------------------------------------ quality */

export type Quality = "Valid" | "Suspect" | "Invalid" | "Stale" | "No data" | "No live feed";

export const QUALITY_TONE: Record<Quality, Tone> = {
  Valid: "good",
  Suspect: "warn",
  Invalid: "bad",
  Stale: "warn",
  "No data": "bad",
  "No live feed": "idle",
};

export const QUALITY_ORDER: Quality[] = ["Valid", "Suspect", "Invalid", "Stale", "No data", "No live feed"];

/** What each data-quality verdict means, in words anyone can read (docs/plain-language.md). */
export const QUALITY_LABEL: Record<Quality, string> = { ...VALIDITY_WORDS, "No live feed": "Not live" };

/** The check that produced the current verdict (task / D5 Table 9.6 vocabulary). */
export type CheckKind = "range" | "rate" | "flatline" | "band" | "cross" | "status" | "manual" | "input" | "link";

export const CHECK_LABEL: Record<CheckKind, string> = {
  range: "Out of range or zero",
  rate: "Jumped too fast",
  flatline: "Stuck or not updating",
  band: "Too steady or too noisy",
  cross: "Disagrees with related sensors",
  status: "Instrument reports a fault",
  manual: "Disagrees with a hand reading",
  input: "Uses a doubtful reading",
  link: "Connection lost",
};

export interface QualityInfo {
  quality: Quality;
  tone: Tone;
  /** Where the verdict comes from. */
  basis: string;
  note: string;
  /** Validation check that flagged the sensor (null when valid or unknown). */
  check: CheckKind | null;
  /** D5 Table 9.6 method name, when the verdict comes from the engine. */
  method: string | null;
  /** Rule that carries the flag (R-DQ-01 / R-DQ-02), when known. */
  rule: "R-DQ-01" | "R-DQ-02" | null;
}

/** Map an engine quality note to the D5 Table 9.6 method that raised it. */
export function classifyNote(note: string | null | undefined): { check: CheckKind; method: string; rule: "R-DQ-01" | "R-DQ-02" } | null {
  const n = note ?? "";
  if (!n) return null;
  // Pyro line: notes name their D5 Table 9.4.2 check.
  if (/^Range:/.test(n)) return { check: "range", method: "Range / stale", rule: "R-DQ-01" };
  if (/^Stale:/.test(n)) return { check: "flatline", method: "Range / stale", rule: "R-DQ-01" };
  if (/^Instrument status:/.test(n)) return { check: "status", method: "Instrument status", rule: "R-DQ-01" };
  if (/^Variability band:/.test(n)) return { check: "band", method: "Variability band", rule: "R-DQ-02" };
  if (/^Rate of change:/.test(n)) return { check: "rate", method: "Rate of change", rule: "R-DQ-02" };
  if (/^Physical neighbours:/.test(n)) return { check: "cross", method: "Physical neighbours", rule: "R-DQ-02" };
  if (/^Manual comparison:/.test(n)) return { check: "manual", method: "Manual comparison", rule: "R-DQ-02" };
  if (/^Flag only \(FP-46\)/.test(n)) return { check: "cross", method: "Vibration vs temperature", rule: "R-DQ-02" };
  if (/flat-?line/i.test(n)) return { check: "flatline", method: "Range / flat / zero", rule: "R-DQ-01" };
  if (/zero vibration/i.test(n)) return { check: "range", method: "Range / flat / zero", rule: "R-DQ-01" };
  if (/analyser fault/i.test(n)) return { check: "status", method: "Instrument status (analyser)", rule: "R-DQ-01" };
  if (/coverage/i.test(n)) return { check: "status", method: "Instrument status (scanner coverage)", rule: "R-DQ-01" };
  if (/implausible/i.test(n)) return { check: "rate", method: "Physical plausibility", rule: "R-DQ-02" };
  if (/follow the model/i.test(n)) return { check: "cross", method: "Driven signals disagree", rule: "R-DQ-02" };
  if (/witness vote/i.test(n)) return { check: "cross", method: "Witness vote", rule: "R-DQ-02" };
  if (/thermal signature/i.test(n)) return { check: "cross", method: "Thermal signature", rule: "R-DQ-02" };
  if (/derived from/i.test(n)) return { check: "input", method: "Input validity (calculated value)", rule: "R-DQ-02" };
  return null;
}

/**
 * Is this sensor delivering valid data? KLN machines: the engine's R-DQ-01
 * data-quality and R-DQ-02 sensor-validation verdict. Real machines: the
 * mapped gateway channel's MQTT state. Without either, the row shows the
 * stored DB value and says so.
 */
export function qualityOf(s: DetailedSensorInfo, point: MachineLivePoint | undefined): QualityInfo {
  if (s.live) {
    const quality: Quality = s.live.quality === "Good" ? "Valid" : s.live.quality;
    const cls = quality === "Valid" ? null : classifyNote(s.live.qualityNote);
    return {
      quality,
      tone: QUALITY_TONE[quality],
      basis: "Automatic sensor checks",
      note:
        s.live.qualityNote ??
        (quality === "Valid" ? "Passes every automatic check that the reading can be trusted." : `The automatic sensor checks say: ${QUALITY_LABEL[quality].toLowerCase()}.`),
      check: cls?.check ?? null,
      method: cls?.method ?? null,
      // The verdict decides the rule: invalid readings are R-DQ-01, suspect ones R-DQ-02.
      rule: quality === "Invalid" ? "R-DQ-01" : quality === "Suspect" ? "R-DQ-02" : (cls?.rule ?? null),
    };
  }
  if (point) {
    const st = point.live.state;
    const quality: Quality = st === "stale" ? "Stale" : st === "nodata" ? "No data" : "Valid";
    const note =
      quality === "Valid"
        ? `Live reading from ${point.source.code}, card ${point.card}, channel ${point.channel}.`
        : quality === "Stale"
          ? `No new reading from ${point.source.code}, card ${point.card}; showing the last value received.`
          : `Card ${point.card}, channel ${point.channel} on ${point.source.code} has not sent any reading.`;
    return {
      quality,
      tone: QUALITY_TONE[quality],
      basis: "Live feed from the plant network",
      note,
      check: quality === "Valid" ? null : quality === "Stale" ? "flatline" : "link",
      method: null,
      rule: null,
    };
  }
  return {
    quality: "No live feed",
    tone: "idle",
    basis: "Last saved value",
    note: isCalculated(s)
      ? "Worked out from other sensors, but that calculation is not running live for this machine."
      : isManual(s)
        ? "Typed in by hand; showing the last saved value."
        : "This sensor is not connected to a live feed yet; showing the last saved value.",
    check: null,
    method: null,
    rule: null,
  };
}

export interface SensorRow extends DetailedSensorInfo {
  q: QualityInfo;
  livePoint?: MachineLivePoint;
  /** Engine signal definition (live machines), when the tag is specified. */
  spec?: DefSignal;
  /** D4-OSW-PE-PYR schedule entry (pyro line online signals): drawing sheet and purpose text. */
  d4?: PyroSpecEntry;
  /** DB measurement (GET /api/measurements): specification, priority, install status, full limit, reference. */
  m?: MeasurementDto;
  /** Process context vs condition monitoring (PCM terminology). */
  role: "Process" | "Condition";
  /** Out of the D5 instrument range (checked on this page, calc.). */
  outOfRange: boolean;
}

/** D4-OSW-PE-PYR / VPC 066 schedule entry for a tag (the kiln fleet has none): drawing sheet, purpose and location text. */
export function d4Of(defs: PlantDefs | null, tag: string): PyroSpecEntry | undefined {
  return defs?.plant === "pyro" ? (PYRO_SPEC[tag] ?? VPC_SPEC[tag]) : undefined;
}

/**
 * D4 source codes (D4-OSW-PE-PYR §5). The "?" marks an unconfirmed source:
 * the label never asserts that a device is installed or approved.
 */
export const D4_SOURCE_LABEL: Record<PyroSpecEntry["source"], string> = {
  "R?": "Existing, not yet checked on site",
  "N?": "New, not yet approved",
  "R/N?": "Existing or new, not yet decided",
};

/** Approval caption of a DB limit row ("Provisional limit · not plant-approved · final from …"); null without a limit. */
export function limitApprovalText(limit: MeasurementLimitDto | null | undefined): string | null {
  if (!limit) return null;
  if (limit.approval === "approved") return ["Approved limit", limit.approvedBy ? `by ${limit.approvedBy}` : ""].filter(Boolean).join(" ");
  return ["Draft limit, not yet approved by the plant", limit.source ? `final value will come from ${limit.source}` : ""].filter(Boolean).join(" · ");
}

/** Approval summary of a set of DB limit rows: "Provisional · not plant-approved" when any is provisional; null when none has a limit. */
export function limitsApprovalText(limits: ReadonlyArray<MeasurementLimitDto | null | undefined>): string | null {
  const rows = limits.filter((l): l is MeasurementLimitDto => Boolean(l));
  if (!rows.length) return null;
  const provisional = rows.filter((l) => l.approval === "provisional").length;
  if (!provisional) return "Approved limits";
  return provisional === rows.length ? "Draft limits, not yet approved by the plant" : `${provisional} of ${rows.length} limits are drafts, not yet approved by the plant`;
}

/** Warning / alarm values of a DB limit row in words ("warn 380 · alarm 420"); null when it holds no values. */
export function limitValuesText(limit: MeasurementLimitDto | null | undefined, unit?: string | null): string | null {
  if (!limit) return null;
  const u = unit && unit !== "state" ? ` ${unit}` : "";
  const v = (x: number | null) => (x === null ? null : `${fmt(x)}${limit.relative || limit.warnPct !== null ? "" : u}`);
  const band = (lo: number | null, hi: number | null) => [lo !== null ? `below ${v(lo)}` : null, hi !== null ? `above ${v(hi)}` : null].filter(Boolean).join(" or ");
  const warn = limit.warnValue !== null ? v(limit.warnValue) : band(limit.warnLo, limit.warnHi) || (limit.warnPct !== null ? `${limit.warnPct} %` : null);
  const alarm = limit.alarmValue !== null ? v(limit.alarmValue) : band(limit.alarmLo, limit.alarmHi) || (limit.alarmPct !== null ? `${limit.alarmPct} %` : null);
  const rate = limit.ratePerHour !== null ? `changing faster than ${fmt(limit.ratePerHour)}${u} per hour` : null;
  const out = [warn ? `Alert at ${warn}` : null, alarm ? `Critical at ${alarm}` : null, rate].filter(Boolean).join(" · ");
  return out ? `${limit.kindName}: ${out}` : null;
}

/** D4 Table 11.1 acceptance: valid readings of the Required tags. */
export const D4_REQUIRED_TARGET_PCT = 95;

/**
 * Valid share of the machine's Required online tags in the current frame
 * (pyro line; D4 Table 11.1 acceptance ≥ 95 %). The priority is the DB
 * measurement's. Null for machines without Required tags (or before the
 * measurements load).
 */
export function requiredAvailability(
  frame: SimFrame | null | undefined,
  measurements: ReadonlyMap<string, MeasurementDto>,
  /** Only these sensors (one part); every sensor when omitted. */
  within: ReadonlySet<string> | null = null,
): { valid: number; total: number; pct: number; invalid: string[] } | null {
  if (frame?.defs.plant !== "pyro") return null;
  const tags = frame.defs.signals
    .filter((s) => (!within || within.has(s.tag)) && measurements.get(s.tag)?.origin === "online" && measurements.get(s.tag)?.priority === "Required")
    .map((s) => s.tag);
  if (!tags.length) return null;
  const invalid = tags.filter((t) => frame.signals[t]?.quality !== "Good");
  const valid = tags.length - invalid.length;
  return { valid, total: tags.length, pct: Math.round((valid / tags.length) * 1000) / 10, invalid };
}

/** Channel design still on HOLD (D4 Table 3.1: PRX-KLN-01…06 metering-channel candidates), per the DB name / sensor type. */
export function isHoldChannel(name: string | undefined, m?: Pick<MeasurementDto, "sensorType"> | null): boolean {
  return /\(HOLD\)/i.test(name ?? "") || /\(HOLD\)/i.test(m?.sensorType ?? "");
}

const PROCESS_RX = /flow|feed|fuel|o₂|o2|co\b|gas|draft|pressure|hood|burning|speed|torque|current|level/i;
/** D4 purposes that describe process context rather than machine condition. */
const D4_PROCESS_PURPOSE = /^(Process thermal|Combustion|Draft|Flow stability|Material inventory|Weigh-bin|Pressure trend|Metering|Clinker discharge|Cooling-air)/i;

/**
 * Process context vs condition signal: the machine's process-context systems
 * (kiln fleet: PRC-KLN-01), else the D4 purpose (pyro line), else the
 * measurement name.
 */
export function roleOf(s: DetailedSensorInfo, spec: DefSignal | undefined, defs?: PlantDefs | null, d4?: PyroSpecEntry): "Process" | "Condition" {
  if (spec && defs) {
    if (defs.processSystems.includes(spec.system)) return "Process";
    if (defs.plant === "kiln") return "Condition";
    if (d4) return D4_PROCESS_PURPOSE.test(d4.purpose) ? "Process" : "Condition";
  }
  if (s.systemId && /^PRC-/i.test(s.systemId)) return "Process";
  if (/vib|bearing|winding|temperature/i.test(s.name) && !/gas|inlet|burning/i.test(s.name)) return "Condition";
  return PROCESS_RX.test(`${s.name} ${s.sensorType}`) ? "Process" : "Condition";
}

/* ------------------------------------------------------------ validation methods (D5 Table 9.6) */

export interface ValidationMethod {
  id: string;
  method: string;
  check: CheckKind;
  rule: "R-DQ-01" | "R-DQ-02";
  appliesTo: string;
  flagsWhen: string;
  /** Tags the method covers. */
  tags: string[];
  /** false = specified in D5 but not evaluated by the demonstration engine. */
  evaluated: boolean;
}

/** DB facts a validation method's tag set is derived from. */
export interface ValidationSource {
  /** The machine's DB measurements (GET /api/measurements). */
  measurements: ReadonlyArray<MeasurementDto>;
  /** Rule code → input tags from the DB (catalog `sensors[].reasons[]`). */
  ruleInputs: ReadonlyMap<string, string[]>;
}

const isOnline = (m: MeasurementDto) => m.origin === "online";
const isAnalog = (m: MeasurementDto) => m.valueKind === "analog";

/**
 * Tags a method covers: the DB inputs of its rule (R-DQ-01 / R-DQ-02) when the
 * DB lists any, else every DB measurement — narrowed to the measurements the
 * method applies to (DB instrument, origin, value kind, quantity).
 */
function coveredTags(src: ValidationSource, rule: "R-DQ-01" | "R-DQ-02", applies: (m: MeasurementDto) => boolean): string[] {
  const inputs = src.ruleInputs.get(rule);
  const pool = inputs?.length ? src.measurements.filter((m) => inputs.includes(m.tag)) : src.measurements;
  return pool.filter(applies).map((m) => m.tag);
}

/** Kiln-seal fleet (D5 Table 9.6): methods and conditions; covered tags from the DB. Other plants: `validationMethods(defs, src)`. */
function kilnValidationMethods(src: ValidationSource): ValidationMethod[] {
  const analogWired = (m: MeasurementDto) => isOnline(m) && isAnalog(m);
  const inst = (m: MeasurementDto) => m.instrument ?? m.sensorType ?? "";
  return [
    {
      id: "range",
      method: "Range / flat / zero",
      check: "flatline",
      rule: "R-DQ-01",
      appliesTo: "Every wired sensor that gives a number",
      flagsWhen: "The same value six times in a row while running (stuck), or no vibration at all while the kiln turns",
      tags: coveredTags(src, "R-DQ-01", analogWired),
      evaluated: true,
    },
    {
      id: "status",
      method: "Instrument status",
      check: "status",
      rule: "R-DQ-01",
      appliesTo: "Oxygen and carbon monoxide analysers, hottest shell point",
      flagsWhen: "The analyser reports a fault, or the shell scanner sees less of the shell than it should",
      tags: coveredTags(src, "R-DQ-01", (m) => (isOnline(m) && isAnalog(m) && /analyser/i.test(inst(m))) || (m.origin === "calculated" && /scanner/i.test(`${m.sensorType ?? ""} ${m.name}`))),
      evaluated: true,
    },
    {
      id: "plausibility",
      method: "Physical plausibility",
      check: "rate",
      rule: "R-DQ-02",
      appliesTo: "Temperature sensors (Pt100)",
      flagsWhen: "Jumps more than 6 °C in one reading, and more than 75 % of the remaining gap, with nothing in the process to explain it",
      tags: coveredTags(src, "R-DQ-02", (m) => isOnline(m) && /RTD/i.test(inst(m))),
      evaluated: true,
    },
    {
      id: "driven",
      method: "Driven signals disagree",
      check: "cross",
      rule: "R-DQ-02",
      appliesTo: "Drive torque, gearbox oil temperature",
      flagsWhen: "The reading moved far from expected (over 5 × its usual spread), but the readings it should affect did not move",
      tags: coveredTags(src, "R-DQ-02", (m) => isOnline(m) && isAnalog(m) && (/torque/i.test(m.name) || (m.quantity.id === "temperature" && /gearbox oil/i.test(m.name)))),
      evaluated: true,
    },
    {
      id: "witness",
      method: "Witness vote",
      check: "cross",
      rule: "R-DQ-02",
      appliesTo: "Feed meter, fuel meter",
      flagsWhen: "Two separate estimates agree with each other but not with the meter (feed above 22 t/h, fuel above 0.8 t/h)",
      tags: coveredTags(src, "R-DQ-02", (m) => isOnline(m) && isAnalog(m) && /flow meter/i.test(inst(m))),
      evaluated: true,
    },
    {
      id: "thermal",
      method: "Thermal signature",
      check: "cross",
      rule: "R-DQ-02",
      appliesTo: "Oxygen (O₂) analyser",
      flagsWhen: "Oxygen reads more than 0.35 % above expected, but the inlet temperature has not dropped and the process is steady",
      tags: coveredTags(src, "R-DQ-02", (m) => isOnline(m) && /analyser/i.test(inst(m)) && /O₂|\bO2\b/i.test(m.name)),
      evaluated: true,
    },
    {
      id: "noise",
      method: "Noise",
      check: "rate",
      rule: "R-DQ-02",
      appliesTo: "Sensors on parts that do not move",
      flagsWhen: "The reading jumps around more than 6 × normal",
      tags: coveredTags(src, "R-DQ-02", analogWired),
      evaluated: false,
    },
  ];
}

/**
 * The validation methods the machine's engine evaluates, with the tags each
 * covers from the DB. Kiln fleet: D5 Table 9.6 as above. Pyro line: the
 * D5-OSW-PE-PYR Table 9.4.2 sensor-health verification (all signals); the
 * engine-specific groups (analysers, neighbour checks, vibration / temperature
 * pairs) come from the engine's sensor meta, kept to tags the DB holds.
 */
export function validationMethods(defs: PlantDefs | null, src: ValidationSource): ValidationMethod[] {
  if (!defs || defs.plant === "kiln") return kilnValidationMethods(src);
  const dbTags = new Set(src.measurements.map((m) => m.tag));
  const mine = (tags: string[]) => tags.filter((t) => dbTags.has(t));
  const wired = coveredTags(src, "R-DQ-01", isOnline);
  const analog = coveredTags(src, "R-DQ-02", (m) => isOnline(m) && isAnalog(m));
  const analyser = mine(PYRO_ANALYSERS.flatMap((a) => a.tags));
  const camera = src.measurements.filter((m) => /camera/i.test(`${m.sensorType ?? ""} ${m.name}`)).map((m) => m.tag);
  const status = mine([...analyser, ...camera, ...PYRO_ANALYSERS.flatMap((a) => (a.status ? [a.status] : []))]);
  const meters = [defs.driverTags.feed, defs.driverTags.fuel].filter((t): t is string => Boolean(t && dbTags.has(t)));
  const neighbours = mine(PYRO_NEIGHBOUR_CHECKS.flatMap((n) => [n.subject, ...n.witnesses]));
  const vibTmp = mine(PYRO_VIB_TMP_PAIRS.flat());
  // Manual records and the scanner map maximum they are compared with (DB origin / sensor type).
  const manual = src.measurements
    .filter((m) => m.origin === "manual" || (m.origin === "calculated" && /scanner/i.test(`${m.sensorType ?? ""} ${m.name}`)))
    .map((m) => m.tag);

  const out: ValidationMethod[] = [
    {
      id: "range",
      method: "Range / stale",
      check: "range",
      rule: "R-DQ-01",
      appliesTo: "Every wired sensor",
      flagsWhen: "Outside what the instrument can measure (broken wire), stuck at the end of its range for 3 readings, not updated for longer than usual, no vibration on a running machine, or no speed while the drive draws normal current",
      tags: wired,
      evaluated: true,
    },
    {
      id: "band",
      method: "Variability band",
      check: "band",
      rule: "R-DQ-02",
      appliesTo: "Every wired sensor that gives a number",
      flagsWhen: `Too steady: barely moves over its time window (stuck or blocked). Too noisy: jumps around more than ${PYRO_NOISY_FACTOR} × normal over ${PYRO_NOISY_WINDOW} readings (loose or failing)`,
      tags: analog,
      evaluated: true,
    },
    {
      id: "rate",
      method: "Rate of change",
      check: "rate",
      rule: "R-DQ-02",
      appliesTo: "Every wired sensor that gives a number, with a limit for each sensor type",
      flagsWhen: "Changes in one minute faster than any instrument of its type can (6 °C for a resistance thermometer, 60 °C for a thermocouple, 100 °C for an infrared sensor, 30 % for pressure, 5 % for level, 5 mm/s for vibration …), with nothing in the process to explain it",
      tags: analog,
      evaluated: true,
    },
  ];
  if (neighbours.length || meters.length)
    out.push({
      id: "neighbour",
      method: "Physical neighbours",
      check: "cross",
      rule: "R-DQ-02",
      appliesTo: "Drive torque with motor and oil temperatures; fan current with pressure; meters with their cross-checks; any stopped machine",
      flagsWhen: "One reading is far from expected (over 5 × its usual spread) for 30 min while the readings that should move with it do not; a meter disagrees with two other estimates; vibration, current or pressure is not near zero on a stopped machine",
      tags: [...new Set([...neighbours, ...meters])],
      evaluated: true,
    });
  if (vibTmp.length)
    out.push({
      id: "vibtmp",
      method: "Vibration vs temperature",
      check: "cross",
      rule: "R-DQ-02",
      appliesTo: "Bearings with both a vibration and a temperature sensor",
      flagsWhen: "A note only (FP-46): vibration is over 1.4 × expected for 10 min but the bearing has not warmed up (less than 0.5 °C). Check the sensor first; the reading still counts as good",
      tags: vibTmp,
      evaluated: true,
    });
  if (status.length)
    out.push({
      id: "status",
      method: "Instrument status",
      check: "status",
      rule: "R-DQ-01",
      appliesTo: "Gas analysers, flame camera",
      flagsWhen: `The analyser reports a fault, or stays in its probe-cleaning cycle for more than ${PYRO_BLOWBACK_STUCK_MIN} min (values are held during a normal cleaning); the camera picture is lost`,
      tags: status,
      evaluated: true,
    });
  if (manual.length)
    out.push({
      id: "manual",
      method: "Manual comparison",
      check: "manual",
      rule: "R-DQ-02",
      appliesTo: "Shell scanner against hand-held readings; gearbox oil against the laboratory",
      flagsWhen: `A hand-held reading differs from the scanner by more than ${PYRO_HANDHELD_GAP_K} °C at the same spot, or the scanner sees less than ${PYRO_COVERAGE_TARGET} % of the shell: the hottest-point reading may be wrong. The laboratory finds a lot of iron in the oil while the oil sensors stay flat: a note only`,
      tags: manual,
      evaluated: true,
    });
  return out;
}

/** Which method flagged a row now (by its classified note). */
export function methodFlagging(row: SensorRow, methods: ValidationMethod[]): ValidationMethod | null {
  const m = row.q.method ?? "";
  if (!m) return null;
  if (m.startsWith("Range")) return methods.find((v) => v.id === "range") ?? null;
  if (m.startsWith("Variability band")) return methods.find((v) => v.id === "band") ?? null;
  if (m.startsWith("Instrument status")) return methods.find((v) => v.id === "status") ?? null;
  return methods.find((v) => v.method === m) ?? null;
}

/* ------------------------------------------------------------ impact */

export interface Impact {
  /** Diagnostic rules (D5 Table 9.7) that read the tag; held while it is not valid. */
  rules: { id: string; name: string }[];
  /** Health input: sub-assembly and system it scores. */
  health: { sub: string; system: string; scored: boolean } | null;
  /** Calculated values computed from this tag. */
  feeds: string[];
}

/** Rules, health input and calculated values a tag feeds, from the machine's own definitions. */
export function impactOf(tag: string, defs: PlantDefs | null): Impact {
  if (!defs) return { rules: [], health: null, feeds: [] };
  const def = defs.signalByTag[tag];
  const rules = defs.rules
    .filter((r) => r.category !== "Data quality" && r.category !== "Anomaly" && r.inputs.includes(tag))
    .map((r) => ({ id: r.id, name: r.name }));
  let health: Impact["health"] = null;
  if (def) {
    const sub = defs.subassemblies.find((x) => x.id === def.sub);
    const sys = defs.systems.find((x) => x.id === def.system);
    health = { sub: sub?.name ?? def.sub, system: sys?.name ?? def.system, scored: sys?.scored ?? false };
  }
  // Pyro calculated values read their own machine's inputs (ΔP from its inlet / outlet pressures, bin weight from its load cells).
  const calcs = defs.plant === "pyro" ? PYRO_CALC_DEFS : CALC_DEFS;
  const feeds = Object.values(calcs)
    .filter((c) => c.inputs.includes(tag))
    .map((c) => c.tag);
  return { rules, health, feeds };
}

/** Simulated minute the current flag on `tag` was raised (latest "TAG marked …" event), or null. */
export function flaggedSince(events: SimEvent[] | undefined, tag: string): number | null {
  if (!events) return null;
  let t: number | null = null;
  for (const e of events) {
    if (e.kind !== "quality") continue;
    if (e.title.startsWith(`${tag} marked`)) t = t === null ? e.t : Math.max(t, e.t);
  }
  return t;
}

/* ------------------------------------------------------------ calculated values (D5 Table 9.2) */

/**
 * Gateway calculations. The DB decides which tags are calculated (measurement
 * origin) and names them; it holds no formulas (the never-filled
 * `measurement_formulas` table was dropped in 048), so the formula text and
 * its input tags stay here, keyed by tag.
 */
export interface CalcDef {
  tag: string;
  /** Name of the calculated value (the DB measurement name once resolved by `calcDefsFor`). */
  value: string;
  formula: string;
  ref: string;
  inputs: string[];
  /** What makes it suspect / invalid. */
  validity: string;
}

export const CALC_DEFS: Record<string, CalcDef> = {
  "CAL-KLN-03": {
    tag: "CAL-KLN-03",
    value: "Shell maximum temperature",
    formula: "max(scanner shell map, 0–74 m × 360°)",
    ref: "D5 Table 9.2 · model: " + (EQUATION_BY_TARGET["CAL-KLN-03"]?.expr ?? "expected shell profile"),
    inputs: ["STS-KLN-08"],
    validity: "Suspect when scanner coverage < 90 % (map under-reads the shell)",
  },
  "CAL-KLN-06": {
    tag: "CAL-KLN-06",
    value: "Inlet false-air index",
    formula: "O₂ measured − O₂ model",
    ref: "D5 Table 9.2 · O₂ model: " + (EQUATION_BY_TARGET["GAS-KLN-01"]?.expr ?? "D5 Table 9.5"),
    inputs: ["GAS-KLN-01", "FLO-KLN-01", "FLO-KLN-02", "PRS-KLN-01"],
    validity: "Follows O₂: suspect or invalid when O₂ (or inlet temperature) is flagged",
  },
  "CAL-KLN-07": {
    tag: "CAL-KLN-07",
    value: "Seal overlap margin",
    formula: EQUATION_BY_TARGET["CAL-KLN-07"]?.expr ?? "40 − |axial position|",
    ref: "D5 Table 9.2 · LVDT vs seal travel",
    inputs: ["POS-KLN-01"],
    validity: "Follows the LVDT axial position",
  },
};

/**
 * Calculated points of the pyro line (OSW-PE-SNL-PYR-01 Rev. 02 class CALC.): the filter / ESP differential pressures
 * (inlet − outlet) and the kiln-feed bin weight (sum of the three load cells). Tags are the pyro machines' own.
 */
const dpCalc = (tag: string, value: string, inlet: string, outlet: string): CalcDef => ({
  tag,
  value,
  formula: `${inlet} − ${outlet} (inlet − outlet pressure)`,
  ref: "OSW-PE-SNL-PYR-01 Rev. 02 · calculated ΔP",
  inputs: [inlet, outlet],
  validity: "Suspect or invalid when either pressure is flagged",
});
const PYRO_CALC_DEFS: Record<string, CalcDef> = {
  "PRS-FSL-02": dpCalc("PRS-FSL-02", "Silo dust collector filter ΔP", "PRS-FSL-03", "PRS-FSL-04"),
  "PRS-KFS-05": dpCalc("PRS-KFS-05", "Feed-bin dust collector filter ΔP", "PRS-KFS-08", "PRS-KFS-09"),
  "PRS-BGH-01": dpCalc("PRS-BGH-01", "Baghouse bag ΔP", "PRS-BGH-02", "PRS-BGH-03"),
  "PRS-CLR-20": dpCalc("PRS-CLR-20", "Cooler vent ESP ΔP", "PRS-CLR-21", "PRS-CLR-22"),
  "PRS-CSL-01": dpCalc("PRS-CSL-01", "Silo baghouse ΔP", "PRS-CSL-02", "PRS-CSL-03"),
  "WGT-KFS-01": {
    tag: "WGT-KFS-01",
    value: "Kiln feed bin weight",
    formula: "(WGT-KFS-02 + WGT-KFS-03 + WGT-KFS-04) ÷ bin capacity × 100",
    ref: "OSW-PE-SNL-PYR-01 Rev. 02 HP-03 · sum of load cells 1–3, % of capacity",
    inputs: ["WGT-KFS-02", "WGT-KFS-03", "WGT-KFS-04"],
    validity: "Suspect or invalid when a load cell is flagged",
  },
  DT1: {
    tag: "DT1",
    value: "Cooling-water temperature rise",
    formula: "T3 − T2",
    ref: "VPC 066 §7.2 · Cooling-water temperature rise across induction coil & chamber",
    inputs: ["T2", "T3"],
    validity: "Suspect when either cooling-water inlet (T2) or outlet (T3) temperature is flagged",
  },
};

/**
 * Pyro line: the scanner entry (D4 K-K33; OSW-PE-SNL-PYR-01 Rev. 02 STS-KLN-08, the shell maximum and its position in
 * one reading) behind a tag — the entry itself, or a value derived from it. Undefined for every other tag and for the
 * kiln fleet.
 */
export function scannerEntryOf(defs: PlantDefs | null, tag: string): PyroSpecEntry | undefined {
  if (defs?.plant !== "pyro") return undefined;
  const isMap = (e: PyroSpecEntry | undefined): e is PyroSpecEntry => Boolean(e && (e.sensorType === "Scanner data / status" || /map/i.test(e.specUnit)));
  const own = PYRO_SPEC[tag];
  if (isMap(own)) return own;
  return PYRO_CALC_DEFS[tag]?.inputs.map((t) => PYRO_SPEC[t]).find(isMap);
}

/**
 * Calculated values of the machine: every DB measurement whose origin is
 * "calculated" and that has a gateway formula on file, named as the DB names
 * it. Empty until the measurements load.
 */
export function calcDefsFor(defs: PlantDefs | null, measurements: ReadonlyMap<string, MeasurementDto>): Record<string, CalcDef> {
  const formulas = defs?.plant === "pyro" ? PYRO_CALC_DEFS : CALC_DEFS;
  const out: Record<string, CalcDef> = {};
  for (const [tag, def] of Object.entries(formulas)) {
    const m = measurements.get(tag);
    if (m?.origin === "calculated") out[tag] = { ...def, value: m.name };
  }
  return out;
}

/** Pyro/VPC machine that owns `tag` (calculation inputs on another machine), else null. */
export function pyroOwnerOf(tag: string): string | null {
  for (const [id, d] of Object.entries(PYRO_DEFS)) if (d.signalByTag[tag]) return id;
  if (VPC_SPEC[tag]) return "VPC-066";
  return null;
}
