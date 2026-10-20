/**
 * KLN-01 signal catalog for the live demonstration simulation.
 *
 * Source: D4-OSW-PE-KLN Rev. 02 (signal schedule) and D5-OSW-PE-KLN Rev. 01
 * (Table 9.1 parameter list, Table 9.2 calculated values, Table 9.3 alarm
 * matrix). Ranges and limits are demo values, exactly as the documents state.
 *
 * Pure data, no React and no server imports, so the client engine and any
 * server code can share it.
 */

export type Severity = "Normal" | "Alert" | "Critical";

export type SystemId = "DRV-KLN-01" | "SUP-KLN-01" | "SHL-KLN-01" | "PRC-KLN-01";

export type SubassemblyId =
  | "main-motor"
  | "gearbox"
  | "pinion-gear"
  | "lubrication"
  | "auxiliary-drive"
  | "station-1"
  | "station-2"
  | "station-3"
  | "thrust"
  | "shell-refractory"
  | "inlet-seal"
  | "outlet-seal"
  | "kiln-inlet"
  | "feed-fuel"
  | "burner-hood";

/** Absolute warning / alarm values on either side; a side without a value is undefined. */
export interface LimitBand {
  warnLo?: number;
  warnHi?: number;
  alarmLo?: number;
  alarmHi?: number;
}

/** Which side of the reference a relative limit judges. */
export type LimitDir = "hi" | "lo" | "both";

/**
 * Provenance and modifiers every limit kind may carry (pyro line, D5 Table 9.2).
 * The kiln-seal fleet uses none of them.
 */
export interface LimitMeta {
  /**
   * Rate-of-rise warning: Alert when the reading (or its residual to the
   * model, which removes ambient and load swings) rises faster than `perH`
   * engineering units per hour over `window` samples (default 30).
   */
  rate?: { perH: number; of?: "value" | "residual"; window?: number };
  /** D5 Table 9.2 row text: normal behaviour, provisional warning / alarm, final limit source. */
  d5?: { normal: string; warning: string; alarm: string; source: string; note?: string };
}

/** How an analog value is judged against its limits. */
export type LimitRule = (
  | { kind: "hi"; warn: number; alarm: number }
  | { kind: "lo"; warn: number; alarm: number }
  | { kind: "abs"; warn: number; alarm: number }
  | ({ kind: "band" } & LimitBand)
  /** Percentage deviation from the operator set-point (feed, fuel). */
  | { kind: "setpoint"; warnPct: number; alarmPct: number }
  /*
   * Relative kinds (D5 Table 9.2). `ref` is the reference at the design
   * operating point, used when no live reference model is at hand; `abs` adds
   * absolute OEM / plant limits judged as a band alongside the relative test.
   */
  /** Deviation from the reference model in % of the model (load model, process baseline); `collapsePct` is a low-side alarm. */
  | { kind: "modelPct"; dir: LimitDir; warnPct: number; alarmPct?: number; collapsePct?: number; ref: number; abs?: LimitBand }
  /** Deviation from the reference model in engineering units (K for temperatures). */
  | { kind: "modelDev"; dir: LimitDir; warn: number; alarm?: number; ref: number; abs?: LimitBand }
  /** Bearing: baseline (model) + `rise`, or a split > `split` to the pair partner's residual; alarm at the OEM bearing limit. */
  | { kind: "bearing"; rise: number; split?: number; pair?: string; alarm: number; ref: number }
  /** Vibration: ≥ `warn` or ≥ `ratio` × baseline (model) while running; alarm ≥ `alarm` (ISO 20816-3 zones). */
  | { kind: "vib"; warn: number; ratio: number; alarm: number; ref: number }
  /** Speed below its reference by `warnPct` / `alarmPct`, or zero speed while the drive is on. */
  | { kind: "speedRef"; warnPct: number; alarmPct: number; drive?: string; driveOn?: number; ref: number }
  /** Position against its command: deviation ≥ `warnDev` (units of the signal); end stops in `abs`. */
  | { kind: "command"; warnDev: number; ref: number; abs?: LimitBand }
) &
  LimitMeta;

/** Limit kinds judged against a live reference (model, baseline, speed reference, command). */
export const RELATIVE_LIMIT_KINDS = new Set<LimitRule["kind"]>(["modelPct", "modelDev", "bearing", "vib", "speedRef", "command"]);
export const isRelativeLimit = (l: LimitRule | null | undefined): boolean => !!l && RELATIVE_LIMIT_KINDS.has(l.kind);

export interface SignalDef {
  tag: string;
  name: string;
  unit: string;
  sub: SubassemblyId;
  system: SystemId;
  /** D5 measurement point within its sub-assembly window. */
  point: string;
  type: "analog" | "state";
  /** Normal scatter of the signal around its model value (σ). */
  sigma: number;
  decimals: number;
  limit?: LimitRule;
  /** State signals: the healthy state, plus states that raise a warning or alarm. */
  states?: { normal: string; warn?: string[]; alarm?: string[] };
  calculated?: boolean;
  /** Instrument family from D5 §6. */
  instrument: string;
  normalBand: string;
}

const S = (d: SignalDef) => d;

export const SIGNALS: SignalDef[] = [
  // ---------------------------------------------------------------- DRV-KLN-01
  S({ tag: "VIB-KLN-01", name: "Motor drive-end vibration (RMS)", unit: "mm/s", sub: "main-motor", system: "DRV-KLN-01", point: "P4", type: "analog", sigma: 0.08, decimals: 2, limit: { kind: "hi", warn: 4.5, alarm: 7.1 }, instrument: "IEPE accelerometer", normalBand: "0.5–2.5" }),
  S({ tag: "TMP-KLN-21", name: "Motor winding temperature", unit: "°C", sub: "main-motor", system: "DRV-KLN-01", point: "P2", type: "analog", sigma: 1.2, decimals: 1, limit: { kind: "hi", warn: 130, alarm: 140 }, instrument: "Pt100 RTD", normalBand: "70–110" }),
  S({ tag: "ELE-KLN-01", name: "Kiln drive torque / motor current", unit: "%", sub: "main-motor", system: "DRV-KLN-01", point: "P3", type: "analog", sigma: 0.9, decimals: 1, limit: { kind: "hi", warn: 90, alarm: 105 }, instrument: "VFD data point", normalBand: "45–75" }),
  S({ tag: "SPD-KLN-01", name: "Kiln speed", unit: "rpm", sub: "main-motor", system: "DRV-KLN-01", point: "P6", type: "analog", sigma: 0.01, decimals: 2, limit: { kind: "band", warnLo: 2.9, warnHi: 4.6, alarmLo: 2.5, alarmHi: 4.8 }, instrument: "VFD data point", normalBand: "3.0–4.5" }),
  S({ tag: "TMP-KLN-19", name: "Motor DE bearing temperature", unit: "°C", sub: "main-motor", system: "DRV-KLN-01", point: "P5", type: "analog", sigma: 0.6, decimals: 1, limit: { kind: "hi", warn: 85, alarm: 95 }, instrument: "Pt100 RTD", normalBand: "50–75" }),
  S({ tag: "TMP-KLN-20", name: "Motor NDE bearing temperature", unit: "°C", sub: "main-motor", system: "DRV-KLN-01", point: "P1", type: "analog", sigma: 0.6, decimals: 1, limit: { kind: "hi", warn: 85, alarm: 95 }, instrument: "Pt100 RTD", normalBand: "45–70" }),
  S({ tag: "VIB-KLN-02", name: "Gearbox input vibration (RMS)", unit: "mm/s", sub: "gearbox", system: "DRV-KLN-01", point: "P1", type: "analog", sigma: 0.09, decimals: 2, limit: { kind: "hi", warn: 4.5, alarm: 7.1 }, instrument: "IEPE accelerometer", normalBand: "0.5–2.5" }),
  S({ tag: "VIB-KLN-03", name: "Gearbox output vibration (RMS)", unit: "mm/s", sub: "gearbox", system: "DRV-KLN-01", point: "P3", type: "analog", sigma: 0.08, decimals: 2, limit: { kind: "hi", warn: 4.5, alarm: 7.1 }, instrument: "IEPE accelerometer", normalBand: "0.5–2.5" }),
  S({ tag: "TMP-KLN-22", name: "Gearbox input bearing temperature", unit: "°C", sub: "gearbox", system: "DRV-KLN-01", point: "P2", type: "analog", sigma: 0.6, decimals: 1, limit: { kind: "hi", warn: 90, alarm: 100 }, instrument: "Pt100 RTD", normalBand: "55–80" }),
  S({ tag: "TMP-KLN-23", name: "Gearbox output bearing temperature", unit: "°C", sub: "gearbox", system: "DRV-KLN-01", point: "P4", type: "analog", sigma: 0.6, decimals: 1, limit: { kind: "hi", warn: 90, alarm: 100 }, instrument: "Pt100 RTD", normalBand: "55–80" }),
  S({ tag: "VIB-KLN-04", name: "Pinion vibration, girth-gear side (RMS)", unit: "mm/s", sub: "pinion-gear", system: "DRV-KLN-01", point: "P2", type: "analog", sigma: 0.1, decimals: 2, limit: { kind: "hi", warn: 5.6, alarm: 9.0 }, instrument: "IEPE accelerometer", normalBand: "0.5–3.5" }),
  S({ tag: "STS-KLN-05", name: "Girth-gear spray system status", unit: "state", sub: "pinion-gear", system: "DRV-KLN-01", point: "P1", type: "state", sigma: 0, decimals: 0, states: { normal: "OK", alarm: ["FAULT"] }, instrument: "Status signal", normalBand: "OK" }),
  S({ tag: "TMP-KLN-15", name: "Gearbox oil temperature", unit: "°C", sub: "lubrication", system: "DRV-KLN-01", point: "P1", type: "analog", sigma: 0.5, decimals: 1, limit: { kind: "hi", warn: 75, alarm: 85 }, instrument: "Pt100 RTD", normalBand: "45–65" }),
  S({ tag: "PRS-KLN-04", name: "Gearbox oil pressure", unit: "bar", sub: "lubrication", system: "DRV-KLN-01", point: "P4", type: "analog", sigma: 0.04, decimals: 2, limit: { kind: "lo", warn: 1.2, alarm: 0.8 }, instrument: "Pressure transmitter", normalBand: "1.5–3.0" }),
  S({ tag: "FLO-KLN-05", name: "Gearbox oil flow switch", unit: "state", sub: "lubrication", system: "DRV-KLN-01", point: "P3", type: "state", sigma: 0, decimals: 0, states: { normal: "FLOW OK", alarm: ["NO FLOW"] }, instrument: "Status signal", normalBand: "FLOW OK" }),
  S({ tag: "LEV-KLN-01", name: "Gearbox oil level switch", unit: "state", sub: "lubrication", system: "DRV-KLN-01", point: "P2", type: "state", sigma: 0, decimals: 0, states: { normal: "LEVEL OK", alarm: ["LOW LEVEL"] }, instrument: "Status signal", normalBand: "LEVEL OK" }),
  S({ tag: "STS-KLN-11", name: "Auxiliary drive status", unit: "state", sub: "auxiliary-drive", system: "DRV-KLN-01", point: "P1", type: "state", sigma: 0, decimals: 0, states: { normal: "READY", warn: ["NOT READY"] }, instrument: "Status signal", normalBand: "READY" }),

  // ---------------------------------------------------------------- SUP-KLN-01
  ...([
    ["01", "1", "left A", "station-1", "P1"],
    ["02", "1", "left B", "station-1", "P3"],
    ["03", "1", "right A", "station-1", "P2"],
    ["04", "1", "right B", "station-1", "P4"],
    ["05", "2", "left A", "station-2", "P1"],
    ["06", "2", "left B", "station-2", "P3"],
    ["07", "2", "right A", "station-2", "P2"],
    ["08", "2", "right B", "station-2", "P4"],
    ["09", "3", "left A", "station-3", "P1"],
    ["10", "3", "left B", "station-3", "P3"],
    ["11", "3", "right A", "station-3", "P2"],
    ["12", "3", "right B", "station-3", "P4"],
  ] as const).map(([n, st, pos, sub, point]) =>
    S({
      tag: `TMP-KLN-${n}`,
      name: `Station ${st} ${pos} bearing temperature`,
      unit: "°C",
      sub,
      system: "SUP-KLN-01",
      point,
      type: "analog",
      sigma: 0.8,
      decimals: 1,
      limit: { kind: "hi", warn: 75, alarm: 85 },
      instrument: "Pt100 RTD",
      normalBand: "40–65",
    }),
  ),
  S({ tag: "PRS-KLN-07", name: "Thrust hydraulic pressure", unit: "bar", sub: "thrust", system: "SUP-KLN-01", point: "P2", type: "analog", sigma: 1.6, decimals: 0, limit: { kind: "band", warnLo: 30, warnHi: 150, alarmLo: 20, alarmHi: 180 }, instrument: "Pressure transmitter", normalBand: "40–120" }),
  S({ tag: "POS-KLN-01", name: "Kiln axial position (LVDT on thrust cylinder)", unit: "mm", sub: "thrust", system: "SUP-KLN-01", point: "P1", type: "analog", sigma: 0.45, decimals: 1, limit: { kind: "abs", warn: 30, alarm: 40 }, instrument: "LVDT position transmitter", normalBand: "± 20" }),
  S({ tag: "POS-KLN-02", name: "Thrust travel limit switches", unit: "state", sub: "thrust", system: "SUP-KLN-01", point: "P3", type: "state", sigma: 0, decimals: 0, states: { normal: "CLEAR", alarm: ["LIMIT"] }, instrument: "Status signal", normalBand: "CLEAR" }),

  // ---------------------------------------------------------------- SHL-KLN-01
  S({ tag: "STS-KLN-08", name: "Shell scanner coverage", unit: "%", sub: "shell-refractory", system: "SHL-KLN-01", point: "P2", type: "analog", sigma: 0.15, decimals: 1, limit: { kind: "lo", warn: 90, alarm: 80 }, instrument: "IR shell scanner", normalBand: "≥ 95" }),
  S({ tag: "STS-KLN-10", name: "Outlet seal cooling-fan status", unit: "state", sub: "outlet-seal", system: "SHL-KLN-01", point: "P2", type: "state", sigma: 0, decimals: 0, states: { normal: "RUNNING", alarm: ["STOPPED"] }, instrument: "Status signal", normalBand: "RUNNING" }),
  S({ tag: "CAL-KLN-03", name: "Shell maximum temperature (scanner map)", unit: "°C", sub: "shell-refractory", system: "SHL-KLN-01", point: "P1", type: "analog", sigma: 2.5, decimals: 0, limit: { kind: "hi", warn: 380, alarm: 420 }, calculated: true, instrument: "Calculated", normalBand: "250–330" }),
  S({ tag: "CAL-KLN-06", name: "Inlet false-air index (O₂ above model)", unit: "vol%", sub: "inlet-seal", system: "SHL-KLN-01", point: "P3", type: "analog", sigma: 0.06, decimals: 2, limit: { kind: "hi", warn: 0.5, alarm: 1.0 }, calculated: true, instrument: "Calculated", normalBand: "< 0.3" }),
  S({ tag: "CAL-KLN-07", name: "Seal overlap margin (LVDT vs seal travel)", unit: "mm", sub: "inlet-seal", system: "SHL-KLN-01", point: "P4", type: "analog", sigma: 0.45, decimals: 1, limit: { kind: "lo", warn: 10, alarm: 5 }, calculated: true, instrument: "Calculated", normalBand: "> 15" }),

  // ---------------------------------------------------------------- PRC-KLN-01
  S({ tag: "GAS-KLN-01", name: "Kiln-inlet O₂", unit: "vol%", sub: "kiln-inlet", system: "PRC-KLN-01", point: "P2", type: "analog", sigma: 0.06, decimals: 2, limit: { kind: "band", warnLo: 1.0, warnHi: 5.0, alarmLo: 0.5 }, instrument: "Gas analyser channel", normalBand: "1.5–3.5" }),
  S({ tag: "GAS-KLN-02", name: "Kiln-inlet CO", unit: "ppm", sub: "kiln-inlet", system: "PRC-KLN-01", point: "P3", type: "analog", sigma: 25, decimals: 0, limit: { kind: "hi", warn: 3000, alarm: 5000 }, instrument: "Gas analyser channel", normalBand: "< 1,000" }),
  S({ tag: "TMP-KLN-13", name: "Kiln-inlet gas temperature", unit: "°C", sub: "kiln-inlet", system: "PRC-KLN-01", point: "P4", type: "analog", sigma: 4, decimals: 0, limit: { kind: "band", warnLo: 950, warnHi: 1200, alarmHi: 1250 }, instrument: "Thermocouple type K", normalBand: "1,000–1,150" }),
  S({ tag: "PRS-KLN-01", name: "Kiln-inlet draft", unit: "mbar", sub: "kiln-inlet", system: "PRC-KLN-01", point: "P5", type: "analog", sigma: 0.06, decimals: 2, limit: { kind: "hi", warn: -1.5, alarm: -0.5 }, instrument: "Pressure transmitter", normalBand: "−2.5 … −5.0" }),
  S({ tag: "STS-KLN-06", name: "Gas analyser status", unit: "state", sub: "kiln-inlet", system: "PRC-KLN-01", point: "P1", type: "state", sigma: 0, decimals: 0, states: { normal: "OK", warn: ["BLOWBACK"], alarm: ["FAULT"] }, instrument: "Status signal", normalBand: "OK" }),
  S({ tag: "FLO-KLN-01", name: "Kiln feed", unit: "t/h", sub: "feed-fuel", system: "PRC-KLN-01", point: "P1", type: "analog", sigma: 1.4, decimals: 0, limit: { kind: "setpoint", warnPct: 5, alarmPct: 10 }, instrument: "Solid flow meter", normalBand: "310–350" }),
  S({ tag: "FLO-KLN-02", name: "Kiln burner fuel", unit: "t/h", sub: "feed-fuel", system: "PRC-KLN-01", point: "P2", type: "analog", sigma: 0.05, decimals: 2, limit: { kind: "setpoint", warnPct: 5, alarmPct: 10 }, instrument: "Solid flow meter", normalBand: "9–12" }),
  S({ tag: "TMP-KLN-14", name: "Burning-zone temperature", unit: "°C", sub: "burner-hood", system: "PRC-KLN-01", point: "P1", type: "analog", sigma: 5, decimals: 0, limit: { kind: "band", warnLo: 1300, warnHi: 1550 }, instrument: "Two-colour pyrometer", normalBand: "1,350–1,500" }),
  S({ tag: "PRS-KLN-03", name: "Hood pressure", unit: "mbar", sub: "burner-hood", system: "PRC-KLN-01", point: "P2", type: "analog", sigma: 0.025, decimals: 2, limit: { kind: "hi", warn: 0, alarm: 0.3 }, instrument: "Pressure transmitter", normalBand: "−0.1 … −0.5" }),
];

export const SIGNAL_BY_TAG: Record<string, SignalDef> = Object.fromEntries(SIGNALS.map((s) => [s.tag, s]));

export const SYSTEMS: Array<{ id: SystemId; name: string; scored: boolean }> = [
  { id: "DRV-KLN-01", name: "Drive train", scored: true },
  { id: "SUP-KLN-01", name: "Support & thrust", scored: true },
  { id: "SHL-KLN-01", name: "Shell, refractory & seals", scored: true },
  { id: "PRC-KLN-01", name: "Process context", scored: false },
];

export const SUBASSEMBLIES: Array<{ id: SubassemblyId; system: SystemId; name: string }> = [
  { id: "main-motor", system: "DRV-KLN-01", name: "Main motor" },
  { id: "gearbox", system: "DRV-KLN-01", name: "Gearbox" },
  { id: "pinion-gear", system: "DRV-KLN-01", name: "Pinion & girth gear" },
  { id: "lubrication", system: "DRV-KLN-01", name: "Lubrication" },
  { id: "auxiliary-drive", system: "DRV-KLN-01", name: "Auxiliary drive" },
  { id: "station-1", system: "SUP-KLN-01", name: "Station 1" },
  { id: "station-2", system: "SUP-KLN-01", name: "Station 2" },
  { id: "station-3", system: "SUP-KLN-01", name: "Station 3" },
  { id: "thrust", system: "SUP-KLN-01", name: "Thrust" },
  { id: "shell-refractory", system: "SHL-KLN-01", name: "Shell & refractory" },
  { id: "inlet-seal", system: "SHL-KLN-01", name: "Inlet seal" },
  { id: "outlet-seal", system: "SHL-KLN-01", name: "Outlet seal" },
  { id: "kiln-inlet", system: "PRC-KLN-01", name: "Kiln inlet" },
  { id: "feed-fuel", system: "PRC-KLN-01", name: "Feed & fuel" },
  { id: "burner-hood", system: "PRC-KLN-01", name: "Burner & hood" },
];

/**
 * Signals a sub-assembly window shows that belong to another machine
 * (D5 §5.3.5: "also shown on these diagrams").
 */
export const SHARED_SIGNALS: Partial<Record<SubassemblyId, string[]>> = {
  "inlet-seal": ["GAS-KLN-01", "TMP-KLN-13"],
  "outlet-seal": ["CAL-KLN-07", "PRS-KLN-03"],
  "pinion-gear": ["SPD-KLN-01"],
};

/* ------------------------------------------------------------------ */
/* Limit evaluation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Live context for judging a limit. The kiln-seal fleet passes only a
 * set-point; the pyro line passes the reference model and the readings the
 * relative kinds of D5 Table 9.2 need.
 */
export interface LimitContext {
  setpoint?: number;
  /** Reference now: load model, process baseline, speed reference or command. */
  model?: number;
  /** Smoothed residual (reading − model); defaults to value − model. */
  residual?: number;
  /** Pair partner's reading and reference (bearing pair split). */
  pair?: number;
  pairModel?: number;
  /** Drive reading (current / power) for the speed "drive on" test. */
  drive?: number;
  /** False while the machine is stopped: relative tests are not judged ("≈ 0 stopped"); absolute ones are. */
  running?: boolean;
  /** Operating point changing (D4 §8.2 comparable state): relative tests hold `hold` instead of judging. */
  transient?: boolean;
  hold?: Severity;
  /** Rate per hour of the reading or of its residual over `window` samples; null when unknown. */
  rate?: (of: "value" | "residual", window: number) => number | null;
}

export interface LimitResult {
  severity: Severity;
  /** The branch that fired ("+14 % over model", "pair split 12 K", "≥ 95 °C"); null when Normal. */
  why: string | null;
}

const LIMIT_RANK: Record<Severity, number> = { Normal: 0, Alert: 1, Critical: 2 };
const NORMAL: LimitResult = { severity: "Normal", why: null };
const worse = (a: LimitResult, b: LimitResult): LimitResult => (LIMIT_RANK[b.severity] > LIMIT_RANK[a.severity] ? b : a);
const adv = (why: string): LimitResult => ({ severity: "Alert", why });
const crit = (why: string): LimitResult => ({ severity: "Critical", why });

/** Compact number for limit texts (≤ 4 significant digits, no trailing zeros). */
export function limitNum(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  const s = a >= 1000 ? v.toFixed(0) : a >= 100 ? v.toFixed(a >= 500 ? 0 : 1) : a >= 10 ? v.toFixed(1) : v.toFixed(2);
  return String(+s).replace(/\B(?=(\d{3})+(?!\d))/g, ",").replace("-", "−");
}
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${limitNum(Math.abs(v))}`;
/** Deviations of a °C signal are in K. */
const devUnit = (unit: string) => (unit === "°C" ? "K" : unit);
const sp = (unit: string) => (unit && unit !== "state" ? ` ${unit}` : "");

function bandResult(b: LimitBand | undefined, v: number, unit: string, tag = ""): LimitResult {
  if (!b) return NORMAL;
  const u = sp(unit);
  const t = tag ? ` (${tag})` : "";
  if (b.alarmHi !== undefined && v >= b.alarmHi) return crit(`≥ ${limitNum(b.alarmHi)}${u}${t}`);
  if (b.alarmLo !== undefined && v <= b.alarmLo) return crit(`≤ ${limitNum(b.alarmLo)}${u}${t}`);
  if (b.warnHi !== undefined && v >= b.warnHi) return adv(`≥ ${limitNum(b.warnHi)}${u}${t}`);
  if (b.warnLo !== undefined && v <= b.warnLo) return adv(`≤ ${limitNum(b.warnLo)}${u}${t}`);
  return NORMAL;
}

/** Severity of an analog value against its limit, with the branch that fired. */
export function evaluateLimit(def: Pick<SignalDef, "limit" | "unit">, value: number, ctx: LimitContext = {}): LimitResult {
  const l = def.limit;
  if (!l || !Number.isFinite(value)) return NORMAL;
  const unit = def.unit;
  const u = sp(unit);
  let base: LimitResult;
  switch (l.kind) {
    case "hi":
      base = value >= l.alarm ? crit(`≥ ${limitNum(l.alarm)}${u}`) : value >= l.warn ? adv(`≥ ${limitNum(l.warn)}${u}`) : NORMAL;
      break;
    case "lo":
      base = value <= l.alarm ? crit(`≤ ${limitNum(l.alarm)}${u}`) : value <= l.warn ? adv(`≤ ${limitNum(l.warn)}${u}`) : NORMAL;
      break;
    case "abs": {
      const a = Math.abs(value);
      base = a >= l.alarm ? crit(`|x| ≥ ${limitNum(l.alarm)}${u}`) : a >= l.warn ? adv(`|x| ≥ ${limitNum(l.warn)}${u}`) : NORMAL;
      break;
    }
    case "band":
      base = bandResult(l, value, unit);
      break;
    case "setpoint": {
      const s = ctx.setpoint;
      if (!s) {
        base = NORMAL;
        break;
      }
      const pct = (Math.abs(value - s) / s) * 100;
      base = pct >= l.alarmPct ? crit(`${limitNum(pct)} % off set-point`) : pct >= l.warnPct ? adv(`${limitNum(pct)} % off set-point`) : NORMAL;
      break;
    }
    default:
      base = relativeLimit(l, value, unit, ctx);
  }
  if (l.rate && ctx.rate && !(ctx.transient && l.rate.of === "residual")) {
    const r = ctx.rate(l.rate.of ?? "value", l.rate.window ?? 30);
    if (r !== null && Number.isFinite(r) && r >= l.rate.perH) base = worse(base, adv(`rising ${limitNum(r)} ${devUnit(unit)}/h > ${limitNum(l.rate.perH)} ${devUnit(unit)}/h`));
  }
  return base;
}

type RelativeLimit = Extract<LimitRule, { kind: "modelPct" | "modelDev" | "bearing" | "vib" | "speedRef" | "command" }>;

function relativeLimit(l: RelativeLimit, value: number, unit: string, ctx: LimitContext): LimitResult {
  const ref = ctx.model !== undefined && Number.isFinite(ctx.model) ? ctx.model : l.ref;
  const r = ctx.residual !== undefined && Number.isFinite(ctx.residual) ? ctx.residual : value - ref;
  // Relative tests need a running machine and a live reference ("≈ 0 stopped" is normal).
  const live = ctx.running !== false && Math.abs(ref) >= 0.1 * (Math.abs(l.ref) || 1);
  const du = devUnit(unit);
  // A stopped machine reads ≈ 0 by design: low-side OEM / plant values are judged only while it runs.
  const absBand = (b: LimitBand | undefined): LimitBand | undefined => (b && ctx.running === false ? { warnHi: b.warnHi, alarmHi: b.alarmHi } : b);
  let abs: LimitResult = NORMAL;
  let rel: LimitResult = NORMAL;
  switch (l.kind) {
    case "modelPct": {
      abs = bandResult(absBand(l.abs), value, unit, "OEM / plant");
      if (!live) break;
      const pct = (r / Math.abs(ref)) * 100;
      const hi = l.dir !== "lo";
      const lo = l.dir !== "hi";
      const loAlarm = l.collapsePct ?? l.alarmPct;
      const over = `${signed(pct)} % ${pct >= 0 ? "over" : "under"} model`;
      if (hi && l.alarmPct !== undefined && pct >= l.alarmPct) rel = crit(over);
      else if (lo && loAlarm !== undefined && pct <= -loAlarm) rel = crit(l.collapsePct !== undefined ? `${over} (collapse)` : over);
      else if ((hi && pct >= l.warnPct) || (lo && pct <= -l.warnPct)) rel = adv(over);
      break;
    }
    case "modelDev": {
      abs = bandResult(absBand(l.abs), value, unit, "OEM / plant");
      if (!live) break;
      const hi = l.dir !== "lo";
      const lo = l.dir !== "hi";
      const over = `${signed(r)} ${du} ${r >= 0 ? "over" : "under"} model`;
      if (l.alarm !== undefined && ((hi && r >= l.alarm) || (lo && r <= -l.alarm))) rel = crit(over);
      else if ((hi && r >= l.warn) || (lo && r <= -l.warn)) rel = adv(over);
      break;
    }
    case "bearing": {
      if (value >= l.alarm) abs = crit(`≥ ${limitNum(l.alarm)}${sp(unit)} (OEM bearing limit)`);
      if (!live) break;
      if (r >= l.rise) rel = adv(`${signed(r)} ${du} over baseline`);
      else if (l.split !== undefined && ctx.pair !== undefined && Number.isFinite(ctx.pair)) {
        // Split of the residuals: the pair's nominal offset is not a fault (raw split when no pair model).
        const split = ctx.pairModel !== undefined && Number.isFinite(ctx.pairModel) ? r - (ctx.pair - ctx.pairModel) : value - ctx.pair;
        if (split > l.split) rel = adv(`pair split ${signed(split)} ${du}${l.pair ? ` vs ${l.pair}` : ""}`);
      }
      break;
    }
    case "vib": {
      abs = value >= l.alarm ? crit(`≥ ${limitNum(l.alarm)}${sp(unit)} (ISO 20816-3 zone C/D)`) : value >= l.warn ? adv(`≥ ${limitNum(l.warn)}${sp(unit)}`) : NORMAL;
      if (!live || ref < 0.3 * l.ref) break;
      const ratio = (ref + r) / ref;
      if (ratio >= l.ratio) rel = adv(`${limitNum(ratio)} × baseline`);
      break;
    }
    case "speedRef": {
      const driveOn = ctx.drive !== undefined && l.driveOn !== undefined ? ctx.drive >= l.driveOn : ctx.running !== false;
      if (!driveOn || Math.abs(ref) < 0.1 * Math.abs(l.ref)) break;
      // Zero speed while the drive is on (shear pin, coupling, chain): judged on the raw reading, never held.
      if (value <= 0.05 * ref) {
        abs = crit("zero speed with drive on");
        break;
      }
      const pct = (r / ref) * 100;
      if (pct <= -l.alarmPct) rel = crit(`${signed(pct)} % of reference`);
      else if (pct <= -l.warnPct) rel = adv(`${signed(pct)} % of reference`);
      break;
    }
    case "command": {
      abs = bandResult(absBand(l.abs), value, unit, "limit reached");
      if (!live) break;
      if (Math.abs(r) >= l.warnDev) rel = adv(`${signed(r)}${sp(unit)} from command`);
      break;
    }
  }
  if (ctx.transient) rel = ctx.hold && ctx.hold !== "Normal" ? { severity: ctx.hold, why: "held while the operating point changes" } : NORMAL;
  return worse(abs, rel);
}

/** Limit severity for an analog value (third argument: a set-point, or the live context). */
export function limitSeverity(def: SignalDef | Pick<SignalDef, "limit" | "unit">, value: number, setpoint?: number | LimitContext): Severity {
  const ctx: LimitContext = typeof setpoint === "object" ? setpoint : { setpoint };
  return evaluateLimit(def, value, ctx).severity;
}

export function stateSeverity(def: SignalDef, state: string): Severity {
  if (def.states?.alarm?.includes(state)) return "Critical";
  if (def.states?.warn?.includes(state)) return "Alert";
  return "Normal";
}

/* ------------------------------------------------------------------ */
/* Resolution and text                                                 */
/* ------------------------------------------------------------------ */

const round4 = (v: number) => +v.toPrecision(5);
const minDef = (...v: Array<number | undefined>) => {
  const d = v.filter((x): x is number => x !== undefined && Number.isFinite(x));
  return d.length ? Math.min(...d) : undefined;
};
const maxDef = (...v: Array<number | undefined>) => {
  const d = v.filter((x): x is number => x !== undefined && Number.isFinite(x));
  return d.length ? Math.max(...d) : undefined;
};

/** Combine two bands: the tighter value on each side. */
function mergeBand(a: LimitBand, b: LimitBand | undefined): LimitBand {
  if (!b) return a;
  return { warnHi: minDef(a.warnHi, b.warnHi), alarmHi: minDef(a.alarmHi, b.alarmHi), warnLo: maxDef(a.warnLo, b.warnLo), alarmLo: maxDef(a.alarmLo, b.alarmLo) };
}

/** The band of any limit at a reference (relative kinds), as warning / alarm values on each side. */
export function limitBand(l: LimitRule | null | undefined, ref?: number | null, setpoint?: number | null): LimitBand | null {
  if (!l) return null;
  const r0 = "ref" in l ? (ref !== null && ref !== undefined && Number.isFinite(ref) ? ref : l.ref) : 0;
  const m = Math.abs(r0);
  let b: LimitBand;
  switch (l.kind) {
    case "hi":
      return { warnHi: l.warn, alarmHi: l.alarm };
    case "lo":
      return { warnLo: l.warn, alarmLo: l.alarm };
    case "abs":
      return { warnLo: -l.warn, alarmLo: -l.alarm, warnHi: l.warn, alarmHi: l.alarm };
    case "band":
      return { warnLo: l.warnLo, warnHi: l.warnHi, alarmLo: l.alarmLo, alarmHi: l.alarmHi };
    case "setpoint":
      return setpoint
        ? { warnLo: round4(setpoint * (1 - l.warnPct / 100)), warnHi: round4(setpoint * (1 + l.warnPct / 100)), alarmLo: round4(setpoint * (1 - l.alarmPct / 100)), alarmHi: round4(setpoint * (1 + l.alarmPct / 100)) }
        : null;
    case "modelPct": {
      const hi = l.dir !== "lo";
      const lo = l.dir !== "hi";
      const loA = l.collapsePct ?? l.alarmPct;
      b = mergeBand(
        {
          warnHi: hi ? r0 + (m * l.warnPct) / 100 : undefined,
          alarmHi: hi && l.alarmPct !== undefined ? r0 + (m * l.alarmPct) / 100 : undefined,
          warnLo: lo ? r0 - (m * l.warnPct) / 100 : undefined,
          alarmLo: lo && loA !== undefined ? r0 - (m * loA) / 100 : undefined,
        },
        l.abs,
      );
      break;
    }
    case "modelDev": {
      const hi = l.dir !== "lo";
      const lo = l.dir !== "hi";
      b = mergeBand(
        {
          warnHi: hi ? r0 + l.warn : undefined,
          alarmHi: hi && l.alarm !== undefined ? r0 + l.alarm : undefined,
          warnLo: lo ? r0 - l.warn : undefined,
          alarmLo: lo && l.alarm !== undefined ? r0 - l.alarm : undefined,
        },
        l.abs,
      );
      break;
    }
    case "bearing":
      b = { warnHi: Math.min(r0 + l.rise, l.alarm), alarmHi: l.alarm };
      break;
    case "vib":
      b = { warnHi: r0 > 0 ? Math.min(l.warn, l.ratio * r0) : l.warn, alarmHi: l.alarm };
      break;
    case "speedRef":
      b = { warnLo: r0 * (1 - l.warnPct / 100), alarmLo: r0 * (1 - l.alarmPct / 100) };
      break;
    case "command":
      b = mergeBand({ warnLo: r0 - l.warnDev, warnHi: r0 + l.warnDev }, l.abs);
      break;
  }
  // A warning never sits beyond its alarm on the same side.
  if (b.warnHi !== undefined && b.alarmHi !== undefined && b.warnHi > b.alarmHi) b.warnHi = b.alarmHi;
  if (b.warnLo !== undefined && b.alarmLo !== undefined && b.warnLo < b.alarmLo) b.warnLo = b.alarmLo;
  const out: LimitBand = {};
  for (const k of ["warnLo", "warnHi", "alarmLo", "alarmHi"] as const) if (b[k] !== undefined) out[k] = round4(b[k]!);
  return out;
}

/**
 * Any limit as an absolute `hi` / `lo` / `band` limit at a reference (the live
 * model when given, else the design-point `ref`). Absolute kinds pass through,
 * so consumers that draw warning / alarm values keep working for every kind.
 */
export function resolveLimit(l: LimitRule | null | undefined, ref?: number | null): LimitRule | undefined {
  if (!l) return undefined;
  if (!RELATIVE_LIMIT_KINDS.has(l.kind)) return l;
  const b = limitBand(l, ref) ?? {};
  const meta: LimitMeta = { ...(l.rate ? { rate: l.rate } : {}), ...(l.d5 ? { d5: l.d5 } : {}) };
  const hasLo = b.warnLo !== undefined || b.alarmLo !== undefined;
  const hasHi = b.warnHi !== undefined || b.alarmHi !== undefined;
  if (hasHi && !hasLo && b.warnHi !== undefined && b.alarmHi !== undefined) return { kind: "hi", warn: b.warnHi, alarm: b.alarmHi, ...meta };
  if (hasLo && !hasHi && b.warnLo !== undefined && b.alarmLo !== undefined) return { kind: "lo", warn: b.warnLo, alarm: b.alarmLo, ...meta };
  return { kind: "band", ...b, ...meta };
}

/** Warning / alarm values as single numbers, for gauges that need one each (relative kinds at `ref`). */
export function limitPair(def: Pick<SignalDef, "limit">, setpoint?: number, ref?: number | null): { warn: number; alarm: number } | null {
  const l = resolveLimit(def.limit, ref);
  if (!l) return null;
  switch (l.kind) {
    case "hi":
    case "lo":
    case "abs":
      return { warn: l.warn, alarm: l.alarm };
    case "band":
      return { warn: l.warnHi ?? l.warnLo ?? 0, alarm: l.alarmHi ?? l.alarmLo ?? l.warnHi ?? l.warnLo ?? 0 };
    case "setpoint":
      return setpoint ? { warn: setpoint * (1 + l.warnPct / 100), alarm: setpoint * (1 + l.alarmPct / 100) } : null;
    default:
      return null;
  }
}

function bandText(b: LimitBand | undefined, side: "warn" | "alarm", u: string): string | null {
  if (!b) return null;
  const lo = side === "warn" ? b.warnLo : b.alarmLo;
  const hi = side === "warn" ? b.warnHi : b.alarmHi;
  const parts = [lo !== undefined ? `≤ ${limitNum(lo)}` : null, hi !== undefined ? `≥ ${limitNum(hi)}` : null].filter(Boolean);
  return parts.length ? `${parts.join(" / ")}${u}` : null;
}

/**
 * Warning and alarm logic in words: absolute values for absolute kinds, the
 * D5 relative logic for the others (“+ 10 % over model”, “baseline + 15 K or
 * pair split > 10 K”). `ref` adds nothing here; see `limitSummary`.
 */
export function describeLimit(l: LimitRule | null | undefined, unit: string): { warning: string; alarm: string } {
  if (!l) return { warning: "—", alarm: "—" };
  const u = sp(unit);
  const du = sp(devUnit(unit));
  const join = (...p: Array<string | null | undefined | false>) => p.filter(Boolean).join(" or ") || "—";
  let w: string;
  let a: string;
  switch (l.kind) {
    case "hi":
      [w, a] = [`≥ ${limitNum(l.warn)}${u}`, `≥ ${limitNum(l.alarm)}${u}`];
      break;
    case "lo":
      [w, a] = [`≤ ${limitNum(l.warn)}${u}`, `≤ ${limitNum(l.alarm)}${u}`];
      break;
    case "abs":
      [w, a] = [`|x| ≥ ${limitNum(l.warn)}${u}`, `|x| ≥ ${limitNum(l.alarm)}${u}`];
      break;
    case "band":
      [w, a] = [bandText(l, "warn", u) ?? "—", bandText(l, "alarm", u) ?? "—"];
      break;
    case "setpoint":
      [w, a] = [`± ${l.warnPct} % of set-point`, `± ${l.alarmPct} % of set-point`];
      break;
    case "modelPct": {
      const sym = l.dir === "hi" ? "+" : l.dir === "lo" ? "−" : "±";
      const rel = l.dir === "hi" ? "over" : l.dir === "lo" ? "under" : "from";
      w = join(`${sym} ${l.warnPct} % ${rel} model`, bandText(l.abs, "warn", u));
      a = join(
        l.alarmPct !== undefined && `${l.collapsePct !== undefined && l.dir === "both" ? "+" : sym} ${l.alarmPct} % ${l.collapsePct !== undefined && l.dir === "both" ? "over" : rel} model`,
        l.collapsePct !== undefined && `collapse (− ${l.collapsePct} % under model)`,
        bandText(l.abs, "alarm", u) && `${bandText(l.abs, "alarm", u)} (OEM)`,
      );
      break;
    }
    case "modelDev": {
      const sym = l.dir === "hi" ? "+" : l.dir === "lo" ? "−" : "±";
      const rel = l.dir === "hi" ? "over" : l.dir === "lo" ? "under" : "from";
      w = join(`${sym} ${limitNum(l.warn)}${du} ${rel} model`, bandText(l.abs, "warn", u));
      a = join(l.alarm !== undefined && `${sym} ${limitNum(l.alarm)}${du} ${rel} model`, bandText(l.abs, "alarm", u) && `${bandText(l.abs, "alarm", u)} (OEM)`);
      break;
    }
    case "bearing":
      w = join(`baseline + ${limitNum(l.rise)}${du}`, l.split !== undefined && `pair split > ${limitNum(l.split)}${du}${l.pair ? ` (${l.pair})` : ""}`);
      a = `≥ ${limitNum(l.alarm)}${u} (OEM limit)`;
      break;
    case "vib":
      w = join(`≥ ${limitNum(l.warn)}${u}`, `${l.ratio} × baseline`);
      a = `≥ ${limitNum(l.alarm)}${u} (ISO 20816-3 zone C/D)`;
      break;
    case "speedRef":
      w = `− ${l.warnPct} % of reference`;
      a = join(`− ${l.alarmPct} % of reference`, "zero speed with drive on");
      break;
    case "command":
      w = `± ${limitNum(l.warnDev)}${u} from command`;
      a = bandText(l.abs, "alarm", u) ? `end stop ${bandText(l.abs, "alarm", u)} (limit reached)` : "—";
      break;
  }
  if (l.rate) w = join(w !== "—" && w, `rise > ${limitNum(l.rate.perH)}${du}/h`);
  return { warning: w, alarm: a };
}

/**
 * One line for a limit: “warn ≥ 85 °C · alarm ≥ 95 °C”, or for the relative
 * kinds the D5 logic and the live reference, e.g.
 * “warn + 10 % / alarm + 20 % over model (now 118 A)”.
 */
export function limitSummary(l: LimitRule | null | undefined, unit: string, ref?: number | null): string {
  if (!l) return "";
  const d = describeLimit(l, unit);
  const u = sp(unit);
  const now = ref !== null && ref !== undefined && Number.isFinite(ref) ? ref : null;
  const tail = (what: string) => (now !== null ? ` (${what} now ${limitNum(now)}${u})` : "");
  if ((l.kind === "modelPct" || l.kind === "modelDev") && !l.abs) {
    // “warn + 10 % / alarm + 20 % over model”: one relation word for both.
    const rel = l.dir === "hi" ? "over" : l.dir === "lo" ? "under" : "from";
    const strip = (s: string) => s.replace(new RegExp(` ${rel} model`, "g"), "");
    if (!l.rate && !(l.kind === "modelPct" && l.collapsePct !== undefined)) return `warn ${strip(d.warning)} / alarm ${strip(d.alarm)} ${rel} model${now !== null ? ` (now ${limitNum(now)}${u})` : ""}`;
  }
  const what = l.kind === "speedRef" ? "reference" : l.kind === "command" ? "command" : l.kind === "bearing" || l.kind === "vib" ? "baseline" : "model";
  return `warn ${d.warning} · alarm ${d.alarm}${isRelativeLimit(l) ? tail(what) : ""}`;
}
