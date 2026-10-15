/* ==========================================================================
   Machine › Sensors — data model.
   Pure derivations for the Sensors page: data-quality verdicts, the D5
   sensor-validation method behind each verdict (Table 9.6), the D4
   instrument specification used for coverage (Tables 5.xc, 6.2, 7.1), and
   the calculated values of D5 Table 9.2. No React.
   ========================================================================== */

import type { MachineLivePoint } from "@/types/edge";
import type { SimEvent, SimFrame } from "@/lib/kiln-sim/engine";
import { KILN_DEFS } from "@/lib/kiln-sim/defs";
import { EQUATION_BY_TARGET } from "@/lib/kiln-sim/relationships";
import type { DefSignal, PlantDefs } from "@/lib/plant-defs";
import { PYRO_DEFS } from "@/lib/pyro-sim/defs";
import { PYRO_SPEC, type PyroSpecEntry } from "@/lib/pyro-sim/spec";
import {
  ANALYSERS as PYRO_ANALYSERS,
  BLOWBACK_STUCK_MIN as PYRO_BLOWBACK_STUCK_MIN,
  HANDHELD_GAP_K as PYRO_HANDHELD_GAP_K,
  NEIGHBOUR_CHECKS as PYRO_NEIGHBOUR_CHECKS,
  NOISY_FACTOR as PYRO_NOISY_FACTOR,
  NOISY_WINDOW as PYRO_NOISY_WINDOW,
  SCANNER_COVERAGE_TARGET as PYRO_COVERAGE_TARGET,
  VIB_TMP_PAIRS as PYRO_VIB_TMP_PAIRS,
} from "@/lib/pyro-sim/sensor-meta";
import type { Tone } from "./assets-shell-ui";
import type { DetailedSensorInfo } from "./machine-sensor-mapping-view";

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
  if (/change/i.test(s)) return { sps: null, label: "On change" };
  if (/model|internal|derived/i.test(s)) return { sps: null, label: "Derived" };
  return { sps: null, label: "—" };
}

function finalize(sps: number) {
  return { sps, label: formatSps(sps) };
}

export function formatSps(sps: number): string {
  if (sps >= 1000) return `${+(sps / 1000).toFixed(1)} kS/s`;
  if (sps >= 1) return `${+sps.toFixed(1)} S/s`;
  if (sps >= 1 / 60) return `1 / ${+(1 / sps).toFixed(0)} s`;
  return `1 / ${+(1 / sps / 60).toFixed(0)} min`;
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

/** The check that produced the current verdict (task / D5 Table 9.6 vocabulary). */
export type CheckKind = "range" | "rate" | "flatline" | "band" | "cross" | "status" | "manual" | "input" | "link";

export const CHECK_LABEL: Record<CheckKind, string> = {
  range: "Range / zero",
  rate: "Rate of change",
  flatline: "Flat-line / stale",
  band: "Variability band",
  cross: "Cross-check",
  status: "Instrument status",
  manual: "Manual comparison",
  input: "Input validity",
  link: "Gateway link",
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
      basis: "Sensor validation (R-DQ-01 / R-DQ-02)",
      note:
        s.live.qualityNote ??
        (quality === "Valid" ? "Passes data-quality and sensor-validation checks." : `Marked ${quality.toLowerCase()} by sensor validation.`),
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
        ? `Live reading from ${point.source.code} · card ${point.card} · ch ${point.channel}.`
        : quality === "Stale"
          ? `No fresh reading from ${point.source.code} · card ${point.card}; showing the last value.`
          : `Channel ${point.card}/${point.channel} on ${point.source.code} has not reported.`;
    return {
      quality,
      tone: QUALITY_TONE[quality],
      basis: "Gateway channel (MQTT)",
      note,
      check: quality === "Valid" ? null : quality === "Stale" ? "flatline" : "link",
      method: null,
      rule: null,
    };
  }
  return {
    quality: "No live feed",
    tone: "idle",
    basis: "Stored value",
    note: isCalculated(s)
      ? "Calculated value; no live calculation is running for this machine."
      : isManual(s)
        ? "Manual record entered in ULTRON; showing the stored DB value."
        : "No gateway channel is mapped to this sensor; showing the stored DB value.",
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
  /** D4-OSW-PE-PYR schedule entry (pyro line online signals). */
  d4?: PyroSpecEntry;
  /** Process context vs condition monitoring (PCM terminology). */
  role: "Process" | "Condition";
  /** Out of the D5 instrument range (checked on this page, calc.). */
  outOfRange: boolean;
}

/** D4-OSW-PE-PYR schedule entry for a tag of a pyro machine (the kiln fleet has none). */
export function d4Of(defs: PlantDefs | null, tag: string): PyroSpecEntry | undefined {
  return defs?.plant === "pyro" ? PYRO_SPEC[tag] : undefined;
}

/**
 * D4 source codes (D4-OSW-PE-PYR §5). The "?" marks an unconfirmed source:
 * the label never asserts that a device is installed or approved.
 */
export const D4_SOURCE_LABEL: Record<PyroSpecEntry["source"], string> = {
  "R?": "Existing (R?, not verified)",
  "N?": "New (N?, not approved)",
  "R/N?": "Existing or new (R/N?, to be established)",
};

/** Caption for every pyro-line limit and limit status (D4 §7.2: no limit is plant-approved). */
/** Pyro line: D5 Table 9.2 provisional logic; nothing is plant-approved (D4 §7.2). */
export const PYRO_DEMO_LIMIT = "Provisional limit (D5 Table 9.2) · not plant-approved (D4 §7.2)";

/** Caption for every pyro-line rack slot / channel: an allocation proposal, not installed hardware. */
export const PYRO_PROPOSED_RACK = "Vibration on four IEPE DAQ nodes (D5 Table 7.2); every other signal read-only from PLC / DCS and the scanner, analyser and camera servers. Addresses and slots pending the D3 walkdown (D5 Table 13.1).";

/** D4 Table 11.1 acceptance: valid readings of the Required tags. */
export const D4_REQUIRED_TARGET_PCT = 95;

/**
 * Valid share of the machine's D4 Required online tags in the current frame
 * (pyro line; D4 Table 11.1 acceptance ≥ 95 %). Null for machines without a
 * D4 schedule or without Required tags.
 */
export function requiredAvailability(frame: SimFrame | null | undefined): { valid: number; total: number; pct: number; invalid: string[] } | null {
  if (frame?.defs.plant !== "pyro") return null;
  const tags = frame.defs.signals.filter((s) => PYRO_SPEC[s.tag]?.priority === "Required").map((s) => s.tag);
  if (!tags.length) return null;
  const invalid = tags.filter((t) => frame.signals[t]?.quality !== "Good");
  const valid = tags.length - invalid.length;
  return { valid, total: tags.length, pct: Math.round((valid / tags.length) * 1000) / 10, invalid };
}

/** Channel design still on HOLD (D4 Table 3.1: PRX-KLN-01…06 metering-channel candidates). */
export function isHoldChannel(name: string | undefined, d4?: PyroSpecEntry): boolean {
  return /\(HOLD\)/i.test(name ?? "") || /\(HOLD\)/i.test(d4?.sensorType ?? "");
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

const RTD = KILN_DEFS.signals.filter((s) => s.instrument === "Pt100 RTD").map((s) => s.tag);
const ANALOG_WIRED = KILN_DEFS.signals.filter((s) => s.type === "analog" && !s.calculated).map((s) => s.tag);

/** Kiln-seal fleet (D5 Table 9.6). Other plants: `validationMethods(defs)`. */
export const VALIDATION_METHODS: ValidationMethod[] = [
  {
    id: "range",
    method: "Range / flat / zero",
    check: "flatline",
    rule: "R-DQ-01",
    appliesTo: "All wired analog signals",
    flagsWhen: "Six identical samples while running (flat-line), or vibration ≈ 0 while the kiln turns",
    tags: ANALOG_WIRED,
    evaluated: true,
  },
  {
    id: "status",
    method: "Instrument status",
    check: "status",
    rule: "R-DQ-01",
    appliesTo: "Gas analyser O₂ / CO, shell maximum",
    flagsWhen: "Analyser status FAULT, or shell-scanner coverage below 90 %",
    tags: ["GAS-KLN-01", "GAS-KLN-02", "CAL-KLN-03"],
    evaluated: true,
  },
  {
    id: "plausibility",
    method: "Physical plausibility",
    check: "rate",
    rule: "R-DQ-02",
    appliesTo: "Thermal signals (Pt100 RTDs)",
    flagsWhen: "One-sample step > 6 K and > 75 % of the remaining deviation, unexplained by drivers",
    tags: RTD,
    evaluated: true,
  },
  {
    id: "driven",
    method: "Driven signals disagree",
    check: "cross",
    rule: "R-DQ-02",
    appliesTo: "Torque, gearbox oil temperature",
    flagsWhen: "Reading moved > 5σ but the signals it drives follow the model, not the reading",
    tags: ["ELE-KLN-01", "TMP-KLN-15"],
    evaluated: true,
  },
  {
    id: "witness",
    method: "Witness vote",
    check: "cross",
    rule: "R-DQ-02",
    appliesTo: "Feed meter, fuel meter",
    flagsWhen: "Two independent estimates agree with each other but not with the meter (feed > 22 t/h, fuel > 0.8 t/h)",
    tags: ["FLO-KLN-01", "FLO-KLN-02"],
    evaluated: true,
  },
  {
    id: "thermal",
    method: "Thermal signature",
    check: "cross",
    rule: "R-DQ-02",
    appliesTo: "O₂ analyser",
    flagsWhen: "O₂ > 0.35 vol% above model with no inlet-temperature drop and a steady process",
    tags: ["GAS-KLN-01"],
    evaluated: true,
  },
  {
    id: "noise",
    method: "Noise",
    check: "rate",
    rule: "R-DQ-02",
    appliesTo: "All non-moving signals",
    flagsWhen: "Second-difference noise > 6 × normal",
    tags: ANALOG_WIRED,
    evaluated: false,
  },
];

/**
 * The validation methods the machine's engine evaluates, with the tags each
 * covers from its own catalog. Kiln fleet: D5 Table 9.6 as above. Pyro line:
 * the D5-OSW-PE-PYR Table 9.4.2 sensor-health verification (all signals).
 */
export function validationMethods(defs: PlantDefs | null): ValidationMethod[] {
  if (!defs || defs.plant === "kiln") return VALIDATION_METHODS;
  const sig = defs.signals;
  const online = (s: DefSignal) => (s.origin ?? (s.calculated ? "calculated" : "online")) === "online";
  const mine = (tags: string[]) => tags.filter((t) => defs.signalByTag[t]);
  const wired = sig.filter((s) => online(s)).map((s) => s.tag);
  const analog = sig.filter((s) => s.type === "analog" && online(s)).map((s) => s.tag);
  const analyser = mine(PYRO_ANALYSERS.flatMap((a) => a.tags));
  const status = mine([...analyser, "CAM-BRN-01", ...PYRO_ANALYSERS.flatMap((a) => (a.status ? [a.status] : []))]);
  const meters = [defs.driverTags.feed, defs.driverTags.fuel].filter((t): t is string => Boolean(t && defs.signalByTag[t]));
  const neighbours = mine(PYRO_NEIGHBOUR_CHECKS.flatMap((n) => [n.subject, ...n.witnesses]));
  const vibTmp = mine(PYRO_VIB_TMP_PAIRS.flat());
  const manual = mine(["CAL-KLN-03", "MAN-KLN-01", "LAB-KLN-01"]);

  const out: ValidationMethod[] = [
    {
      id: "range",
      method: "Range / stale",
      check: "range",
      rule: "R-DQ-01",
      appliesTo: "All wired signals",
      flagsWhen: "Outside the D5 instrument range (broken loop), clipped at a range end 3 samples, source frozen beyond its cadence, vibration ≈ 0 on a running unit, speed ≈ 0 at model drive current",
      tags: wired,
      evaluated: true,
    },
    {
      id: "band",
      method: "Variability band",
      check: "band",
      rule: "R-DQ-02",
      appliesTo: "All wired analog signals",
      flagsWhen: `Too steady: spread below the family minimum over its window (stuck, blocked tap). Too noisy: 1-min step spread > ${PYRO_NOISY_FACTOR} × normal over ${PYRO_NOISY_WINDOW} samples (loose, failing)`,
      tags: analog,
      evaluated: true,
    },
    {
      id: "rate",
      method: "Rate of change",
      check: "rate",
      rule: "R-DQ-02",
      appliesTo: "All wired analog signals, limit per sensor class",
      flagsWhen: "A 1-min step no instrument of its class can make (RTD 6 K, TC 60 K, IR 100 K, pressure 30 % of nominal, level 5 %, vibration 5 mm/s …), unexplained by the reference model",
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
      appliesTo: "Torque with winding and oil; fan current with pressure; meters with their witnesses; any unit at stop",
      flagsWhen: "One signal > 5σ from model for 30 min while the signals it must move with stay at model; meter out-voted by two witnesses; vibration, current or header pressure not ≈ 0 on a stopped unit",
      tags: [...new Set([...neighbours, ...meters])],
      evaluated: true,
    });
  if (vibTmp.length)
    out.push({
      id: "vibtmp",
      method: "Vibration vs temperature",
      check: "cross",
      rule: "R-DQ-02",
      appliesTo: "Bearing vibration / temperature pairs",
      flagsWhen: "Flag only (FP-46): vibration > 1.4 × model for 10 min with the bearing flat (< +0.5 K) — verify the sensor first; quality stays valid",
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
      flagsWhen: `Analyser FAULT or stuck in probe blowback > ${PYRO_BLOWBACK_STUCK_MIN} min (values held during a normal blowback); camera feed lost`,
      tags: status,
      evaluated: true,
    });
  if (manual.length)
    out.push({
      id: "manual",
      method: "Manual comparison",
      check: "manual",
      rule: "R-DQ-02",
      appliesTo: "Shell scanner vs handheld; gearbox oil trend vs laboratory",
      flagsWhen: `Handheld > ${PYRO_HANDHELD_GAP_K} K from the scanner at the matched position, or coverage < ${PYRO_COVERAGE_TARGET} %: shell maximum suspect. Laboratory Fe high with flat oil instruments: flag only`,
      tags: manual,
      evaluated: true,
    });
  return out;
}

/** Which method flagged a row now (by its classified note). */
export function methodFlagging(row: SensorRow, methods: ValidationMethod[] = VALIDATION_METHODS): ValidationMethod | null {
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
export function impactOf(tag: string, defs: PlantDefs | null = KILN_DEFS): Impact {
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
  // Pyro calculated values can read another machine's signal (CAL-PHC-01 uses the kiln-inlet O₂).
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

export interface CalcDef {
  tag: string;
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
 * Derived values of the pyro line (pyro-sim engine). Tags are the pyro machines' own.
 * CAL-KLN-03 is not a gateway calculation: it is the map maximum of the single
 * D4 entry K-K33 "STS-KLN-08 / CAL-KLN-03" (R?, Required, scanner data).
 */
const PYRO_CALC_DEFS: Record<string, CalcDef> = {
  "CAL-PHC-01": {
    tag: "CAL-PHC-01",
    value: "Preheater false-air rise",
    formula: "O₂ preheater exit − O₂ kiln inlet",
    ref: "Gateway calculation",
    inputs: ["GAS-PHC-01", "GAS-KLN-01"],
    validity: "Suspect when either O₂ reading is flagged",
  },
  "CAL-KLN-06": {
    tag: "CAL-KLN-06",
    value: "Inlet false-air index",
    formula: "O₂ measured − O₂ model",
    ref: "Gateway calculation",
    inputs: ["GAS-KLN-01", "TMP-KLN-13"],
    validity: "Follows O₂: suspect or invalid when O₂ (or inlet temperature) is flagged",
  },
  "CAL-KLN-03": {
    tag: "CAL-KLN-03",
    value: "Shell maximum temperature",
    formula: "max(scanner shell map)",
    ref: "D4 K-K33 · scanner map maximum (STS-KLN-08 / CAL-KLN-03)",
    inputs: ["STS-KLN-08"],
    validity: `Suspect when scanner coverage < ${PYRO_COVERAGE_TARGET} % (D5 target), the handheld disagrees by > ${PYRO_HANDHELD_GAP_K} K at the matched position, or the map saturates at 600 °C`,
  },
  "CAL-BRN-01": {
    tag: "CAL-BRN-01",
    value: "Coal-to-feed ratio",
    formula: "coal feed ÷ kiln feed × 100",
    ref: "Gateway calculation",
    inputs: ["FLO-BRN-01", "FLO-KFS-01"],
    validity: "Suspect when the coal or kiln-feed meter is flagged",
  },
};

/**
 * Pyro line: the D4 scanner entry (status + temperature map, K-K33) behind a
 * tag — the entry itself (STS-KLN-08) or the derived map maximum read from it
 * (CAL-KLN-03). Undefined for every other tag and for the kiln fleet.
 */
export function scannerEntryOf(defs: PlantDefs | null, tag: string): PyroSpecEntry | undefined {
  if (defs?.plant !== "pyro") return undefined;
  const isMap = (e: PyroSpecEntry | undefined): e is PyroSpecEntry => Boolean(e && /map/i.test(e.specUnit));
  const own = PYRO_SPEC[tag];
  if (isMap(own)) return own;
  return PYRO_CALC_DEFS[tag]?.inputs.map((t) => PYRO_SPEC[t]).find(isMap);
}

/** Calculated-value definitions of the machine's plant (kiln fleet: D5 Table 9.2). */
export function calcDefsFor(defs: PlantDefs | null): Record<string, CalcDef> {
  if (defs?.plant !== "pyro") return CALC_DEFS;
  return Object.fromEntries(Object.entries(PYRO_CALC_DEFS).filter(([tag]) => defs.signalByTag[tag]));
}

/** Pyro machine that owns `tag` (calculation inputs on another machine), else null. */
export function pyroOwnerOf(tag: string): string | null {
  for (const [id, d] of Object.entries(PYRO_DEFS)) if (d.signalByTag[tag]) return id;
  return null;
}

/* ------------------------------------------------------------ D4 specification */

/** D4 Table 7.1 basic sensor requirements, by instrument family. */
export const D4_SENSOR_SPEC: Record<string, { range: string; accuracy: string; output: string; mounting: string; source: "New" | "Existing" }> = {
  "IEPE accelerometer": { range: "±50 g · 0.5 Hz–10 kHz", accuracy: "100 mV/g ±5 %", output: "IEPE to DAQ", mounting: "Stud on bearing housing", source: "New" },
  "Pt100 RTD": { range: "−50…+200 °C", accuracy: "Class A", output: "PLC / DCS", mounting: "Existing, embedded", source: "Existing" },
  "Thermocouple type K": { range: "0…1,400 °C", accuracy: "Class 1", output: "DCS", mounting: "Existing probe", source: "Existing" },
  "Two-colour pyrometer": { range: "800…2,000 °C", accuracy: "±0.75 %", output: "4–20 mA", mounting: "Existing, hood", source: "Existing" },
  "Pressure transmitter": { range: "per tag", accuracy: "≤ 0.1 % span", output: "4–20 mA / HART", mounting: "Existing", source: "Existing" },
  "LVDT position transmitter": { range: "±50 mm", accuracy: "±0.5 mm", output: "4–20 mA to thrust PLC", mounting: "Existing on cylinder", source: "Existing" },
  "Solid flow meter": { range: "0–500 / 0–25 t/h", accuracy: "±0.5–1 %", output: "DCS", mounting: "Existing", source: "Existing" },
  "Gas analyser channel": { range: "O₂ 0–25 %; CO 0–20,000 ppm", accuracy: "±2 % range", output: "DCS / Modbus", mounting: "Existing, extractive", source: "Existing" },
  "VFD data point": { range: "torque, speed", accuracy: "Class 0.5", output: "PLC / OPC UA", mounting: "Data point", source: "Existing" },
  "IR shell scanner": { range: "0–600 °C", accuracy: "±2 %", output: "Scanner server", mounting: "Existing", source: "Existing" },
  "Status signal": { range: "state", accuracy: "—", output: "PLC / DCS", mounting: "Data point", source: "Existing" },
};
