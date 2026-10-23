/**
 * Instrument metadata of the pyro line from D5-OSW-PE-PYR Rev. 00:
 * sensor class (Tables 6.1–6.17), calibrated range, accuracy, Table 9.1
 * sampling, Table 8.2 cadence to the server, Table 7.2 DAQ node, and the
 * D5 Table 9.4.2 sensor-health parameters (rate limits, neighbour pairs,
 * analyser blowback, scanner coverage target).
 *
 * `applySensorMeta` stamps `range` / `accuracy` / `sampling` on the signal
 * defs at load. The range replaces the old "1.6 × alarm" span: readings
 * saturate at the range ends, the clipping / out-of-range checks judge
 * against it, and every alarm must lie inside it.
 *
 * Where D5 gives the range "per tag" / "per drive" / "per vessel" without a
 * figure (pressure, MCC, speed, level, position) the range here is a
 * provisional demo scaling derived from the nominal value, marked so.
 *
 * Pure data and functions: imports types only, so `signals.ts` can call it.
 */
import type { PyroSignalDef } from "./signals";
import { PYRO_SPEC } from "./spec";
import { PYRO_RANGE_BY_SIGNAL, PYRO_RANGES_DOC, rangeInUnit } from "./ranges";

export type SensorClass =
  | "iepe"
  | "rtd"
  | "tc"
  | "ir"
  | "pressure"
  | "gas"
  | "level"
  | "loadcell"
  | "sfm"
  | "speed"
  | "position"
  | "mcc"
  | "status"
  | "scanner"
  | "spray"
  | "migration"
  | "camera";

export interface ClassMeta {
  /** D5 Table 6.x (sensor specification sheet). */
  table: string;
  /** D5 class name (Table 6.18). */
  name: string;
  /** D5 Table 9.1 sampling, verbatim. */
  sampling: string;
  /** D5 Table 8.2 "to server". */
  toServer: string;
  /** D5 Table 6.x accuracy. */
  accuracy: string;
  /** D5 Table 6.x output / protocol. */
  output: string;
  /** D5 Table 6.x range text (per tag / per drive classes: no figure). */
  rangeText: string;
  /** Minutes without a fresh source time stamp before the value is stale (cadence-based). */
  staleAfterMin: number;
}

/** D4 sensor type (`spec.ts`) → D5 sensor class; the counts match D5 Table 6.18. */
const CLASS_OF_SPEC_TYPE: Record<string, SensorClass> = {
  "IEPE / vibration pickup": "iepe",
  "RTD / DCS transmitter": "rtd",
  "Thermocouple / DCS": "tc",
  "IR / optical instrument": "ir",
  "DP / static PT or switch": "pressure",
  "Gas analyser channel": "gas",
  "Radar / level switch": "level",
  "Weigh load cells": "loadcell",
  "Mass-flow meter": "sfm",
  "Shaft speed / VFD": "speed",
  "Actuator / LVDT / DI": "position",
  "Oil-flow switch": "position",
  "Wear limit switch": "position",
  "MCC / VFD data": "mcc",
  "Controller PLC status": "status",
  "Scanner data / status": "scanner",
  "Divider-cycle proof (HOLD)": "spray",
  "Tyre-shell slip pickup": "migration",
  "Protected camera feed": "camera",
};

export const CLASS_META: Record<SensorClass, ClassMeta> = {
  iepe: { table: "6.1", name: "IEPE accelerometer", sampling: "25.6 kS/s snapshot; RMS 1 min", toServer: "1 min (overall); waveform 10–60 min snapshot, on alert", accuracy: "100 mV/g ±5 %", output: "IEPE to DAQ node; DAQ → gateway (Ethernet)", rangeText: "±50 g; 0.5 Hz – 10 kHz", staleAfterMin: 2 },
  rtd: { table: "6.2", name: "RTD temperature", sampling: "10 s", toServer: "1 min (avg / min / max)", accuracy: "Pt100 class A", output: "Existing PLC / DCS; read via OPC UA", rangeText: "−50 … +200 °C", staleAfterMin: 2 },
  tc: { table: "6.3", name: "Thermocouple", sampling: "5 s", toServer: "1 min (avg / min / max)", accuracy: "Type K / N class 1", output: "DCS; OPC UA", rangeText: "0 … 1,400 °C", staleAfterMin: 2 },
  ir: { table: "6.4", name: "IR / optical temperature", sampling: "1 s", toServer: "1 min (avg / min / max)", accuracy: "±0.75 … 2 % of reading", output: "4–20 mA / fieldbus to DCS", rangeText: "0 … 2,000 °C (per point)", staleAfterMin: 2 },
  pressure: { table: "6.5", name: "Pressure / differential pressure", sampling: "1 s", toServer: "1 min", accuracy: "≤ 0.1 % of span", output: "4–20 mA / HART to PLC / DCS", rangeText: "Per tag (mbar to bar)", staleAfterMin: 2 },
  gas: { table: "6.6", name: "Gas analyser channel", sampling: "5 s", toServer: "1 min with validity", accuracy: "±2 % of range", output: "DCS / Modbus TCP with status", rangeText: "O₂ 0–25 %; CO 0–5 % / 0–20,000 ppm; NOx 0–2,000 ppm", staleAfterMin: 2 },
  level: { table: "6.7", name: "Level radar / switch", sampling: "10 s / on change", toServer: "1 min", accuracy: "±5 mm (radar)", output: "PLC / DCS", rangeText: "Per vessel", staleAfterMin: 2 },
  loadcell: { table: "6.8", name: "Load cells", sampling: "1 s", toServer: "1 min", accuracy: "±0.1 % (system)", output: "Weighing controller → PLC", rangeText: "Bin capacity", staleAfterMin: 2 },
  sfm: { table: "6.9", name: "Solid-flow meter", sampling: "1 s", toServer: "1 min", accuracy: "±0.5–1 %", output: "DCS", rangeText: "Kiln feed 0–500 t/h; kiln coal 0–25 t/h", staleAfterMin: 2 },
  speed: { table: "6.10", name: "Speed / zero-speed", sampling: "1 s", toServer: "1 min", accuracy: "±0.1 % (VFD); pulse pickup", output: "PLC / VFD", rangeText: "Per machine", staleAfterMin: 2 },
  position: { table: "6.11", name: "Position, limit and flow switches", sampling: "1 s / on change", toServer: "1 min; switches immediate", accuracy: "LVDT ±0.5 mm", output: "PLC", rangeText: "Per device (LVDT ±50 mm)", staleAfterMin: 2 },
  mcc: { table: "6.12", name: "MCC / VFD electrical data", sampling: "1 s", toServer: "1 min", accuracy: "Class 0.5", output: "MCC / VFD via PLC; OPC UA", rangeText: "Per drive", staleAfterMin: 2 },
  status: { table: "6.13", name: "Controller status", sampling: "on change", toServer: "Immediate (events)", accuracy: "—", output: "PLC / DCS", rangeText: "States", staleAfterMin: 2 },
  scanner: { table: "6.14", name: "Kiln shell scanner", sampling: "scan 2–5 s; 1 min values", toServer: "Map 10 min; values 1 min", accuracy: "±2 %", output: "Scanner server; OPC UA", rangeText: "0 … 600 °C", staleAfterMin: 2 },
  spray: { table: "6.15", name: "Spray delivery feedback", sampling: "per cycle", toServer: "Immediate (events)", accuracy: "—", output: "PLC digital input", rangeText: "Pulse / state", staleAfterMin: 2 },
  migration: { table: "6.16", name: "Tyre migration", sampling: "per revolution", toServer: "1 min", accuracy: "±0.5 mm/rev", output: "Scanner option or OEM unit → OPC UA", rangeText: "0 … 30 mm/rev", staleAfterMin: 2 },
  camera: { table: "6.17", name: "Flame camera", sampling: "stream; 1 / min snapshot", toServer: "Snapshot 1 / min", accuracy: "—", output: "Camera server (RTSP)", rangeText: "Video", staleAfterMin: 2 },
};

/** Sensor class of a catalogue entry (calculated and manual entries have none). */
export function sensorClassOf(def: Pick<PyroSignalDef, "tag" | "origin">): SensorClass | null {
  if (def.origin !== "online") return null;
  const t = PYRO_SPEC[def.tag]?.sensorType;
  return t ? (CLASS_OF_SPEC_TYPE[t] ?? null) : null;
}

/* ------------------------------------------------------------------ */
/* Ranges                                                              */
/* ------------------------------------------------------------------ */

/** Ranges D5 gives per tag or per species (§6.6, 6.9, 6.11, 6.12 notes). `provisional`: demo figure, not a D5 number. */
const TAG_RANGE: Record<string, { range: [number, number]; note: string; provisional?: boolean }> = {
  "GAS-PHC-01": { range: [0, 25], note: "O₂ 0–25 % (D5 Table 6.6)" },
  "GAS-KLN-01": { range: [0, 25], note: "O₂ 0–25 % (D5 Table 6.6)" },
  "GAS-PHC-02": { range: [0, 20000], note: "CO 0–20,000 ppm (D5 Table 6.6)" },
  "GAS-KLN-02": { range: [0, 20000], note: "CO 0–20,000 ppm (D5 Table 6.6)" },
  "GAS-KLN-03": { range: [0, 2000], note: "NOx 0–2,000 ppm (D5 Table 6.6)" },
  "GAS-PHC-03": { range: [0, 25], note: "O₂ 0–25 % (calciner outlet extractive analyser, as D5 Table 6.6)" },
  "GAS-PHC-04": { range: [0, 20000], note: "CO 0–20,000 ppm (calciner outlet extractive analyser, as D5 Table 6.6)" },
  "GAS-BGH-01": { range: [0, 100], note: "0–100 mg/Nm³ (existing stack CEMS, read-only; demo span)", provisional: true },
  "GAS-BRN-01": { range: [0, 1000], note: "Coal bin CO 0–1,000 ppm (OSW-PE-SNL-PYR-01 Rev. 02)" },
  "FLO-KFS-01": { range: [0, 300], note: "0–300 t/h per meter (SFM A; two meters carry the 0–500 t/h kiln feed)", provisional: true },
  "FLO-KFS-02": { range: [0, 300], note: "0–300 t/h per meter (SFM B; two meters carry the 0–500 t/h kiln feed)", provisional: true },
  "FLO-BRN-01": { range: [0, 25], note: "0–25 t/h (D5 Table 6.9)" },
  "POS-KLN-01": { range: [-50, 50], note: "LVDT ±50 mm (D5 Table 6.11)" },
  // Kiln drive torque in % of rated: the drive can report overload above 100 %, so the 105 % alarm is reachable.
  "ELE-KLN-01": { range: [0, 150], note: "0–150 % of rated torque (per drive, D5 Table 6.12; demo scaling)", provisional: true },
  ...Object.fromEntries(
    ["WGT-KFS-02", "WGT-KFS-03", "WGT-KFS-04"].map((tg) => [tg, { range: [0, 50] as [number, number], note: "0–50 t per load cell (three cells carry the 0–125 t bin; Rev. 02 \"0–capacity\", demo capacity)", provisional: true }]),
  ),
};

/** Fixed class ranges (D5 §6). VIB: the class range is ±50 g; the velocity RMS span is a demo mapping of it. */
const CLASS_RANGE: Partial<Record<SensorClass, { range: [number, number]; note: string; provisional?: boolean }>> = {
  iepe: { range: [0, 50], note: "0–50 mm/s RMS (±50 g, 0.5 Hz–10 kHz channel, D5 Table 6.1; velocity span demo)", provisional: true },
  rtd: { range: [-50, 200], note: "−50 … +200 °C (D5 Table 6.2)" },
  tc: { range: [0, 1400], note: "0 … 1,400 °C (D5 Table 6.3)" },
  ir: { range: [0, 2000], note: "0 … 2,000 °C (D5 Table 6.4, per point)" },
  migration: { range: [0, 30], note: "0 … 30 mm/rev (D5 Table 6.16)" },
};

/** Round up to a 1 / 1.2 / 1.5 / 2 / 2.5 / 3 / 4 / 5 / 6 / 8 × 10ⁿ full scale. */
export function niceUp(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v - 1e-9) return +(m * p).toPrecision(6);
  return 10 * p;
}

export interface RangeInfo {
  range: [number, number];
  /** Where the figure comes from. */
  note: string;
  /** Demo scaling, not a D5 number. */
  provisional: boolean;
}

/** Calibrated range of a signal: D5 per tag / per class, else a provisional per-tag scaling from the nominal value. */
export function rangeInfoOf(def: PyroSignalDef): RangeInfo | null {
  if (def.type !== "analog") return null;
  // OSW-PE-SNL-PYR-01 Rev. 01 design range (the transmitter range to specify or verify) wins over D5 and the demo scaling.
  const row = PYRO_RANGE_BY_SIGNAL[def.tag];
  const u = row ? rangeInUnit(row, def.base) : null;
  if (row && u && u.designLo !== null && u.designHi !== null && u.designHi > u.designLo) {
    return { range: [u.designLo, u.designHi], note: `${row.design} ${row.docUnit} (${PYRO_RANGES_DOC}${u.basis ? `; ${u.basis}` : ""})`, provisional: false };
  }
  const tagR = TAG_RANGE[def.tag];
  if (tagR) return { range: tagR.range, note: tagR.note, provisional: !!tagR.provisional };
  const cls = sensorClassOf(def);
  if (!cls) return null;
  const clsR = CLASS_RANGE[cls];
  if (clsR) return { range: clsR.range, note: clsR.note, provisional: !!clsR.provisional };
  const per = `per ${cls === "mcc" ? "drive" : cls === "level" ? "vessel" : cls === "speed" ? "machine" : cls === "position" ? "device" : "tag"}, D5 Table ${CLASS_META[cls].table}; provisional demo scaling`;
  if (def.unit === "%") return { range: [0, 100], note: `0–100 % (${per})`, provisional: true };
  // Full scale covers the nominal value with a generous margin (process upsets such as a backed-up cooler bed must not
  // saturate the transmitter) and every limit the alarm matrix can reach (an alarm must lie inside the range).
  const reach = Math.max(...limitReach(def).map(Math.abs), 0);
  const full = (k: number) => niceUp(Math.max(k * Math.abs(def.base), 1.25 * reach, 10 * def.sigma));
  if (cls === "pressure") {
    // Drafts, signed pressures (negative nominal) and meter pressures that can reverse (FP-04 back-flow) span both sides of zero.
    if (def.base < 0 || BIPOLAR.has(def.tag)) {
      const r = full(4);
      return { range: [-r, r], note: `±${r} ${def.unit} (${per})`, provisional: true };
    }
    const r = full(4);
    return { range: [0, r], note: `0–${r} ${def.unit} (${per})`, provisional: true };
  }
  const r = full(cls === "speed" ? 2 : 3);
  return { range: [0, r], note: `0–${r} ${def.unit} (${per})`, provisional: true };
}

/** Positive-nominal pressures that can legitimately read below zero. */
const BIPOLAR = new Set(["PRS-KFS-02", "PRS-KFS-06"]);

/** Absolute values the signal's limit rule can raise at (near the design point for relative kinds). */
export function limitReach(def: PyroSignalDef): number[] {
  const l = def.limit;
  if (!l) return [];
  const band = (b?: { warnLo?: number; warnHi?: number; alarmLo?: number; alarmHi?: number }) => (b ? [b.warnLo, b.warnHi, b.alarmLo, b.alarmHi] : []);
  const out: Array<number | undefined> = [];
  switch (l.kind) {
    case "hi":
    case "lo":
    case "abs":
      out.push(l.warn, l.alarm, ...(l.kind === "abs" ? [-l.warn, -l.alarm] : []));
      break;
    case "band":
      out.push(...band(l));
      break;
    case "setpoint":
      out.push(def.base * (1 + l.alarmPct / 100), def.base * (1 - l.alarmPct / 100));
      break;
    case "modelPct":
      out.push(l.ref * (1 + (l.alarmPct ?? l.warnPct) / 100), ...band(l.abs));
      break;
    case "modelDev":
      out.push(l.ref + (l.alarm ?? l.warn), l.ref - (l.alarm ?? l.warn), ...band(l.abs));
      break;
    case "bearing":
    case "vib":
      out.push(l.alarm);
      break;
    case "speedRef":
      out.push(l.ref);
      break;
    case "command":
      out.push(...band(l.abs));
      break;
  }
  return out.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

/* ------------------------------------------------------------------ */
/* Sampling                                                            */
/* ------------------------------------------------------------------ */

/** D5 Table 9.1 sampling of a signal (Tables 6.6 / 8.2 detail where they add to it). */
export function samplingOf(def: PyroSignalDef): string | undefined {
  if (def.origin === "manual") return def.tag === "LAB-KLN-01" ? "Laboratory sample (D5 monthly; demo twice daily)" : "Handheld round (D5 weekly; demo every 4 h)";
  if (def.tag === "STS-KLN-08") return "scan 2–5 s; 1 min values (map 10 min)";
  if (def.origin === "calculated") return "1 min (gateway calculation)";
  const cls = sensorClassOf(def);
  if (!cls) return undefined;
  if (cls === "gas") return "5 s; held during blowback";
  return CLASS_META[cls].sampling;
}

/* ------------------------------------------------------------------ */
/* Apply to the catalogue                                             */
/* ------------------------------------------------------------------ */

/** Stamp D5 range / accuracy / sampling on the catalogue (called once by `signals.ts`). */
export function applySensorMeta(defs: PyroSignalDef[]): void {
  for (const def of defs) {
    const cls = sensorClassOf(def);
    const r = rangeInfoOf(def);
    if (r) def.range = r.range;
    const sampling = samplingOf(def);
    if (sampling) def.sampling = sampling;
    if (cls && def.origin === "online") def.accuracy = accuracyOf(def, cls);
  }
}

function accuracyOf(def: PyroSignalDef, cls: SensorClass): string {
  if (cls === "level" && def.type === "state") return "Switch point (function test at stops)";
  if (cls === "position") return def.tag === "POS-KLN-01" ? "LVDT ±0.5 mm" : def.type === "state" ? "Switch (on change)" : "Per device";
  return CLASS_META[cls].accuracy;
}

/* ------------------------------------------------------------------ */
/* Readings                                                            */
/* ------------------------------------------------------------------ */

/** Share of span beyond which a sensor-driven reading is a broken loop (NE 43 failure signal), not saturation. */
const LOOP_FAULT_MARGIN = 0.25;

/**
 * A reading through the instrument: saturates at the calibrated range ends;
 * a sensor fault driving it far outside the span (open loop, upscale
 * burn-out) passes through as a loop-fault value the range check marks Invalid.
 */
export function instrumentReading(def: PyroSignalDef, v: number, sensorDelta = 0): number {
  const r = def.range;
  if (!r) return def.unit === "%" ? Math.max(0, Math.min(100, v)) : v;
  const [lo, hi] = r;
  const m = LOOP_FAULT_MARGIN * (hi - lo);
  if (sensorDelta !== 0 && (v < lo - m || v > hi + m)) return v;
  return Math.max(lo, Math.min(hi, v));
}

/* ------------------------------------------------------------------ */
/* Sensor health verification parameters (D5 Table 9.4.2)              */
/* ------------------------------------------------------------------ */

/**
 * Rate of change: the largest physically possible change per 1-min value
 * (demo figures), per class. A larger step that the reference model does
 * not explain is a physically impossible jump → Suspect.
 */
export function maxStepPerMin(def: PyroSignalDef): number | null {
  const cls = sensorClassOf(def);
  const b = Math.abs(def.base);
  switch (cls) {
    case "rtd":
      return 6;
    case "tc":
      return 60;
    case "ir":
      return 100;
    case "pressure":
      return Math.max(0.3 * b, 15 * def.sigma);
    case "level":
      return def.type === "analog" ? 5 : null;
    case "loadcell":
      return 6;
    case "sfm":
      return 0.15 * b;
    case "iepe":
      return 5;
    case "gas":
      return def.unit === "vol%" ? 4 : def.tag === "GAS-KLN-03" ? 600 : 5000;
    case "position":
      return def.tag === "POS-KLN-01" ? 5 : def.type === "analog" ? 25 : null;
    case "migration":
      return 5;
    case "mcc":
      return 0.6 * b;
    case "speed":
      return 0.5 * b;
    default:
      return null;
  }
}

/** Too noisy: median |Δ| over this many 1-min values … */
export const NOISY_WINDOW = 15;
/** … above this multiple of the instrument's normal median |Δ| (loose / failing sensor; healthy runs peak ≈ 3.5×). */
export const NOISY_FACTOR = 5;
/** A noisy flag holds until the median |Δ| falls below this multiple. */
export const NOISY_RELEASE = 3;

/** Scanner coverage target (D5 Tables 5.4.7a / 9.5 / 12.1): below it the shell map is suspect. */
export const SCANNER_COVERAGE_TARGET = 95;
/** Handheld vs scanner disagreement at a matched position that makes the scanner suspect (K, emissivity-matched). */
export const HANDHELD_GAP_K = 25;

/* ------------------------------------------------------------------ */
/* Stop checks (equipment run states: ./equipment `unitRunning`)       */
/* ------------------------------------------------------------------ */

/** Pressures that read ≈ 0 when their fan / blower / pump is stopped (D5 Table 12.2 "zero with process stopped"). */
export const ZERO_AT_STOP_PRESSURES = new Set([
  "PRS-FSL-01",
  "PRS-KFS-01",
  "PRS-KFS-03",
  "PRS-KFS-04",
  "PRS-KFS-07",
  ...[1, 2, 3, 4, 5, 6].flatMap((n) => [`PRS-PHC-0${n}`, `PRS-PHC-1${n}`]),
  "PRS-KLN-04",
  "PRS-KLN-05",
  "PRS-KLN-07",
  "PRS-BRN-01",
  "PRS-BRN-02",
  "PRS-BRN-03",
  "PRS-BRN-04",
  ...[1, 2, 3, 4, 5, 6].map((n) => `PRS-CLR-0${n}`),
  "PRS-CSL-02",
  "PRS-CSL-03",
]);

/* ------------------------------------------------------------------ */
/* Named neighbour pairs (D5 Table 9.4.2 "Physical neighbours")        */
/* ------------------------------------------------------------------ */

/**
 * Signals that must move together. `subject` is flagged when it departs from
 * its model while every witness stays at model ("torque with winding and oil;
 * fan current with pressure").
 */
export const NEIGHBOUR_CHECKS: Array<{ subject: string; witnesses: string[]; label: string }> = [
  { subject: "ELE-KLN-01", witnesses: ["TMP-KLN-41", "TMP-KLN-44", "TMP-KLN-15"], label: "torque moved, motor windings and gearbox oil did not" },
  { subject: "ELE-PHC-01", witnesses: ["PRS-PHC-01"], label: "ID fan power moved, the C1 riser duct pressure did not" },
  ...[1, 2, 3, 4, 5, 6].map((k) => ({ subject: `ELE-CLR-0${k}`, witnesses: [`PRS-CLR-0${k}`], label: `fan ${k} current moved, compartment ${k} pressure did not` })),
  { subject: "ELE-BRN-01", witnesses: ["PRS-BRN-01"], label: "PA fan current moved, primary-air header pressure did not" },
  { subject: "ELE-FSL-01", witnesses: ["PRS-FSL-01"], label: "aeration blower current moved, header pressure did not" },
  { subject: "ELE-CSL-02", witnesses: ["PRS-CSL-03"], label: "dust fan current moved, baghouse outlet pressure did not" },
];

/** Vibration / bearing-temperature pairs (D5 FP-46, SW-DQ-02): vibration up with the bearing flat is flagged only. */
export const VIB_TMP_PAIRS: Array<[string, string]> = [
  ["VIB-KFS-01", "TMP-KFS-01"],
  ["VIB-KFS-04", "TMP-KFS-03"],
  ["VIB-PHC-01", "TMP-PHC-09"],
  ["VIB-PHC-02", "TMP-PHC-10"],
  ["VIB-KLN-01", "TMP-KLN-19"],
  ["VIB-KLN-05", "TMP-KLN-20"],
  ["VIB-KLN-02", "TMP-KLN-22"],
  ["VIB-KLN-03", "TMP-KLN-23"],
  ["VIB-BRN-01", "TMP-BRN-01"],
  ...[1, 2, 3, 4, 5, 6].map((n): [string, string] => [`VIB-CLR-0${n}`, `TMP-CLR-0${n}`]),
  ["VIB-CLR-07", "TMP-CLR-10"],
  ...[1, 2, 3].map((n): [string, string] => [`VIB-CLR-1${n}`, `TMP-CLR-3${n}`]),
  ["VIB-HMR-01", "TMP-HMR-01"],
  ["VIB-HMR-02", "TMP-HMR-02"],
  ["VIB-HMR-03", "TMP-HMR-04"],
  ["VIB-HMR-04", "TMP-HMR-05"],
  ["VIB-CSL-01", "TMP-CSL-03"],
  ["VIB-CSL-03", "TMP-CSL-04"],
];

/* ------------------------------------------------------------------ */
/* Gas analysers (D5 Table 6.6: 5 s; held during blowback; status)     */
/* ------------------------------------------------------------------ */

export interface AnalyserDef {
  id: "KLN" | "PHC" | "BRN";
  name: string;
  /** Status signal, when the analyser has one in the 161 (kiln inlet). */
  status: string | null;
  tags: string[];
  /** Blowback cycle phase (min). */
  offset: number;
}

export const ANALYSERS: AnalyserDef[] = [
  { id: "KLN", name: "Kiln inlet analyser", status: "STS-KLN-06", tags: ["GAS-KLN-01", "GAS-KLN-02", "GAS-KLN-03"], offset: 17 },
  { id: "PHC", name: "Preheater exit analyser", status: null, tags: ["GAS-PHC-01", "GAS-PHC-02"], offset: 37 },
  { id: "BRN", name: "Coal-bin CO analyser", status: null, tags: ["GAS-BRN-01"], offset: 52 },
];
/** Probe blowback (demo): every 60 min for 2 min; values held meanwhile. */
export const BLOWBACK_EVERY_MIN = 60;
export const BLOWBACK_MIN = 2;
/** An analyser still in blowback after this many minutes is stuck (D5 Table 12.1 every shift). */
export const BLOWBACK_STUCK_MIN = 5;

/* ------------------------------------------------------------------ */
/* Vibration DAQ nodes (D5 Table 7.2)                                  */
/* ------------------------------------------------------------------ */

export interface DaqNode {
  code: string;
  location: string;
  tags: string[];
  channels: number;
  ex: boolean;
}

export const DAQ_NODES: DaqNode[] = [
  { code: "DAQ-1", location: "Kiln drive house", tags: ["VIB-KLN-01", "VIB-KLN-05", "VIB-KLN-02", "VIB-KLN-03", "VIB-KLN-04"], channels: 8, ex: false },
  { code: "DAQ-2", location: "Preheater base / ID fan / elevator head", tags: ["VIB-PHC-01", "VIB-PHC-02", "VIB-KFS-01", "VIB-KFS-04", "VIB-BGH-01"], channels: 8, ex: false },
  { code: "DAQ-3", location: "Burner floor (coal area, Ex)", tags: ["VIB-BRN-01", "VIB-BRN-02"], channels: 8, ex: true },
  { code: "DAQ-4", location: "Cooler fans and vent fan", tags: ["VIB-CLR-01", "VIB-CLR-02", "VIB-CLR-03", "VIB-CLR-04", "VIB-CLR-05", "VIB-CLR-06", "VIB-CLR-07"], channels: 8, ex: false },
  { code: "DAQ-5", location: "Grate drives / crusher / conveyor", tags: ["VIB-CLR-11", "VIB-CLR-12", "VIB-CLR-13", "VIB-HMR-01", "VIB-HMR-02", "VIB-HMR-03", "VIB-HMR-04", "VIB-CSL-01"], channels: 8, ex: false },
  { code: "DAQ-6", location: "Pan conveyor head drive", tags: ["VIB-CSL-02", "VIB-CSL-03"], channels: 8, ex: false },
];

export const DAQ_NODE_OF_TAG: Record<string, DaqNode> = Object.fromEntries(DAQ_NODES.flatMap((n) => n.tags.map((t) => [t, n])));
