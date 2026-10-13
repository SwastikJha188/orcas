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

export type Severity = "Normal" | "Advisory" | "Critical";

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

/** How an analog value is judged against its limits. */
export type LimitRule =
  | { kind: "hi"; warn: number; alarm: number }
  | { kind: "lo"; warn: number; alarm: number }
  | { kind: "abs"; warn: number; alarm: number }
  | { kind: "band"; warnLo?: number; warnHi?: number; alarmLo?: number; alarmHi?: number }
  /** Percentage deviation from the operator set-point (feed, fuel). */
  | { kind: "setpoint"; warnPct: number; alarmPct: number };

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

/** Absolute-limit severity for an analog value. */
export function limitSeverity(def: SignalDef, value: number, setpoint?: number): Severity {
  const l = def.limit;
  if (!l || !Number.isFinite(value)) return "Normal";
  switch (l.kind) {
    case "hi":
      return value >= l.alarm ? "Critical" : value >= l.warn ? "Advisory" : "Normal";
    case "lo":
      return value <= l.alarm ? "Critical" : value <= l.warn ? "Advisory" : "Normal";
    case "abs": {
      const a = Math.abs(value);
      return a >= l.alarm ? "Critical" : a >= l.warn ? "Advisory" : "Normal";
    }
    case "band":
      if ((l.alarmLo !== undefined && value <= l.alarmLo) || (l.alarmHi !== undefined && value >= l.alarmHi)) return "Critical";
      if ((l.warnLo !== undefined && value <= l.warnLo) || (l.warnHi !== undefined && value >= l.warnHi)) return "Advisory";
      return "Normal";
    case "setpoint": {
      if (!setpoint) return "Normal";
      const pct = (Math.abs(value - setpoint) / setpoint) * 100;
      return pct >= l.alarmPct ? "Critical" : pct >= l.warnPct ? "Advisory" : "Normal";
    }
  }
}

export function stateSeverity(def: SignalDef, state: string): Severity {
  if (def.states?.alarm?.includes(state)) return "Critical";
  if (def.states?.warn?.includes(state)) return "Advisory";
  return "Normal";
}

/** Warning / alarm values as single numbers, for gauges that need one each. */
export function limitPair(def: SignalDef, setpoint?: number): { warn: number; alarm: number } | null {
  const l = def.limit;
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
  }
}
