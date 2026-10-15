/**
 * Pyro line alarm matrix — D5-OSW-PE-PYR Rev. 00 Table 9.2 "Alarm matrix
 * (161 signals)", provisional logic.
 *
 * D5 p. 61: "Final values are set from OEM data and the conditioned baseline
 * (D4 Rev. 02, Section 7.2). The logic below is the provisional implementation
 * basis; 'model' means the value expected for the current feed, fuel, speed,
 * load and ambient." D4 §7.2: no automatic warning or alarm set-point is
 * approved. Every number here is a demonstration value.
 *
 * Most rows are relative (to the reference model, a baseline, a bearing pair,
 * a speed reference, a command, a rate or a count), so the limit kinds of
 * `../kiln-sim/signals` carry them (`modelPct`, `modelDev`, `bearing`, `vib`,
 * `speedRef`, `command`, the `rate` modifier). Where D5 says "or OEM" the
 * catalogue's former absolute alarm stays as the OEM placeholder (`abs`).
 *
 * `applyD5Limits` runs once when `./signals` loads and replaces each signal's
 * limit (and, for the state rows, the severity mapping of its states), so the
 * engine, the frames' `defs`, the UI and the DB seed all read the same matrix.
 *
 * Pure data, no React and no server imports.
 */
import type { LimitBand, LimitContext, LimitRule, Severity } from "../kiln-sim/signals";
import type { PyroSignalDef } from "./signals";
import { slope } from "./shared";

/** Shown wherever a pyro limit is listed. */
export const PYRO_LIMIT_DISCLAIMER =
  "Provisional logic (D5 Table 9.2). No warning / alarm set-point is plant-approved (D4 §7.2); final values come from OEM data and the conditioned baseline.";

/** One row of D5 Table 9.2, as printed. */
export interface D5LimitText {
  normal: string;
  warning: string;
  alarm: string;
  source: string;
}

export interface PyroD5Limit extends D5LimitText {
  tag: string;
  /** How this implementation reads the row where D5 is ambiguous, inconsistent or needs data the plant does not yet send. */
  note?: string;
}

/* ------------------------------------------------------------------ */
/* D5 row templates (verbatim)                                         */
/* ------------------------------------------------------------------ */

const T = {
  load: { normal: "Follows load model", warning: "+ 10 % over model", alarm: "+ 20 % over model or OEM", source: "Motor / drive OEM" },
  band: { normal: "Within operating band", warning: "Low / high band", alarm: "Low-low / high-high or switch", source: "Plant" },
  prs: { normal: "Matches model for current operation", warning: "± 20 % from model", alarm: "± 35 % from model", source: "Process baseline" },
  draft: { normal: "Matches model; draft staircase C1 → C6", warning: "± 20 % from model", alarm: "± 35 % from model", source: "Process baseline" },
  state: { normal: "Normal state", warning: "Abnormal state", alarm: "Fault state", source: "Plant" },
  setpoint: { normal: "At set-point", warning: "± 5 % of set-point", alarm: "± 10 % of set-point", source: "Plant process" },
  command: { normal: "Follows command / floats", warning: "Deviation from command; LVDT ± 30 mm", alarm: "Limit reached; LVDT ± 40 mm", source: "OEM" },
  speed: { normal: "Matches reference", warning: "− 5 % of reference", alarm: "Zero speed with drive on / − 10 %", source: "OEM, plant" },
  bearing: { normal: "Follows load and ambient; pair similar", warning: "Baseline + 15 K or pair split > 10 K", alarm: "OEM bearing limit (≈ 95 °C)", source: "OEM, baseline" },
  vib: { normal: "Low, steady; ≈ 0 stopped", warning: "≥ 4.5 mm/s or 1.5 × baseline", alarm: "≥ 7.1 mm/s (ISO 20816-3 zone C/D)", source: "ISO 20816-3, OEM, baseline" },
  gas: { normal: "Steady; analyser valid", warning: "Plant warning limit (CO, O₂)", alarm: "Plant alarm limit", source: "Plant process / EHS" },
  tmp: { normal: "Matches model for current feed / fuel", warning: "± 25 K from model", alarm: "± 50 K from model or OEM limit", source: "Process baseline, OEM" },
  mig: { normal: "Steady in OEM band", warning: "Outside OEM band", alarm: "Far outside band", source: "Kiln OEM" },
  hood: { normal: "Slightly negative", warning: "≥ 0 mbar", alarm: "≥ +0.3 mbar", source: "Plant process" },
  oilP: { normal: "Steady in band", warning: "Below model / OEM low", alarm: "OEM trip-warning margin", source: "OEM" },
  dp: { normal: "Slow rise; drops after service", warning: "Rate of rise high / OEM change point", alarm: "OEM maximum ΔP", source: "OEM" },
  hyd: { normal: "Cycles with operation", warning: "± 20 % from model", alarm: "Collapse or OEM maximum", source: "OEM" },
  prx: { normal: "Pulse every cycle", warning: "1 missed cycle", alarm: "2 missed cycles", source: "Spray OEM" },
  scanner: { normal: "Profile normal; coverage ≥ 95 %", warning: "Local +40 K over profile or > 15 K/h", alarm: "OEM shell limit; coverage < 80 %", source: "Kiln OEM, baseline" },
  oilT: { normal: "Follows load", warning: "Model + 10 K", alarm: "OEM maximum oil temperature", source: "OEM, baseline" },
  winding: { normal: "Follows torque and ambient", warning: "Insulation-class limit − 20 K", alarm: "Insulation-class limit", source: "Motor OEM" },
  camera: { normal: "Live image", warning: "Image lost", alarm: "—", source: "Plant" },
  coalBin: { normal: "Flat, follows ambient", warning: "Rise > 5 K/h or plant limit", alarm: "Plant EHS limit", source: "Plant EHS" },
} satisfies Record<string, D5LimitText>;

/* ------------------------------------------------------------------ */
/* Limit builders                                                      */
/* ------------------------------------------------------------------ */

type Build = (d: PyroSignalDef) => LimitRule | undefined;

/** The catalogue's former absolute alarm sides: the OEM / plant placeholder where D5 says "or OEM". */
function oemAlarms(d: PyroSignalDef): LimitBand {
  const l = d.limit;
  if (!l) return {};
  if (l.kind === "hi") return { alarmHi: l.alarm };
  if (l.kind === "lo") return { alarmLo: l.alarm };
  if (l.kind === "band") return { alarmLo: l.alarmLo, alarmHi: l.alarmHi };
  return {};
}

/** ELE: + 10 % / + 20 % over the load model, or the OEM rating. */
const load =
  (oemHi?: number): Build =>
  (d) => ({ kind: "modelPct", dir: "hi", warnPct: 10, alarmPct: 20, ref: d.base, abs: { alarmHi: oemHi ?? oemAlarms(d).alarmHi } });
/** PRS: ± 20 % / ± 35 % from the process model (|model| for drafts). */
const prsModel: Build = (d) => ({ kind: "modelPct", dir: "both", warnPct: 20, alarmPct: 35, ref: d.base });
/** Process temperatures: ± 25 K / ± 50 K from the model, or the OEM limit (former absolute alarms). */
const tmpModel: Build = (d) => ({ kind: "modelDev", dir: "both", warn: 25, alarm: 50, ref: d.base, abs: oemAlarms(d) });
/** Bearings: baseline + 15 K or residual split > 10 K to the pair partner; OEM limit ≈ 95 °C. */
const bearing =
  (pair?: string, alarm = 95): Build =>
  (d) => ({ kind: "bearing", rise: 15, ...(pair ? { split: 10, pair } : {}), alarm, ref: d.base });
/** Vibration: ≥ 4.5 mm/s or 1.5 × baseline; ≥ 7.1 mm/s (ISO 20816-3 zone C/D). */
const vib: Build = (d) => ({ kind: "vib", warn: 4.5, ratio: 1.5, alarm: 7.1, ref: d.base });
/** Speed: − 5 % / − 10 % of the reference, zero speed while the drive (≥ ⅓ of its design value) is on. */
const speed =
  (drive: string, driveBase: number): Build =>
  (d) => ({ kind: "speedRef", warnPct: 5, alarmPct: 10, drive, driveOn: +(driveBase / 3).toFixed(1), ref: d.base });
const keep: Build = (d) => d.limit;
const fixed =
  (l: LimitRule): Build =>
  () =>
    l;

/* ------------------------------------------------------------------ */
/* The matrix                                                          */
/* ------------------------------------------------------------------ */

interface Row {
  text: D5LimitText;
  limit?: Build;
  states?: { normal: string; warn?: string[]; alarm?: string[] };
  normalBand?: string;
  note?: string;
}

const ROWS: Record<string, Row> = {};
const row = (tags: string[], r: Row) => {
  for (const t of tags) ROWS[t] = r;
};
const seq = (prefix: string, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${String(from + i).padStart(2, "0")}`);

// ---------------------------------------------------------------- ELE (16)
row(["ELE-FSL-01", "ELE-KFS-01", "ELE-PHC-01", "ELE-BRN-01", "ELE-BRN-02", ...seq("ELE-CLR-", 1, 7), "ELE-HMR-01", "ELE-CSL-01"], { text: T.load, limit: load() });
row(["ELE-KLN-01"], {
  text: T.load,
  limit: load(),
  note: "OEM placeholder 105 % of rated torque; reachable because the torque channel spans 0–150 % (overload), not the 0–100 % clamp of other % channels.",
});
row(["ELE-CSL-02"], {
  text: T.load,
  limit: load(),
  note: "D5 has no low-side limit: low fan current stays rule evidence (blocked filter / damper), not a limit.",
});

// ---------------------------------------------------------------- LEV (13)
row(["LEV-FSL-01", "LEV-KFS-01", "LEV-BRN-01", "LEV-KFS-03", ...seq("LEV-KLN-", 1, 7)], { text: T.band, limit: keep });
row(["LEV-CSL-01"], { text: T.band, limit: fixed({ kind: "band", warnLo: 12, warnHi: 88, alarmLo: 5, alarmHi: 94 }), note: "Low-low added (5 %); the catalogue had no low-side alarm." });
row(["LEV-KFS-02"], {
  text: T.band,
  states: { normal: "CLEAR", alarm: ["HIGH"] },
  note: "D5 puts the level switch in the alarm column: HIGH is an alarm (it was a warning).",
});

// ---------------------------------------------------------------- PRS (process model, 23)
row(["PRS-FSL-01", "PRS-KFS-01", "PRS-KFS-02", "PRS-KLN-01", ...seq("PRS-BRN-", 1, 4), ...seq("PRS-CLR-", 1, 6)], { text: T.prs, limit: prsModel });
row(seq("PRS-PHC-", 1, 9), {
  text: T.draft,
  limit: prsModel,
  note: "Judged on |model| (drafts are negative). The staircase C1 → C6 is a plausibility check of the taps (sensor validation), not a limit.",
});

// ---------------------------------------------------------------- STS (5)
row(["STS-FSL-01"], {
  text: T.state,
  states: { normal: "OPEN", warn: ["TRAVELLING", "CLOSED"], alarm: ["FAULT"] },
  note: "A closed gate is an abnormal state (warning), not a fault (it was an alarm).",
});
row(["STS-FSL-02"], { text: T.state });
row(["STS-KLN-06"], {
  text: T.state,
  states: { normal: "OK", alarm: ["FAULT"] },
  note: "Routine probe blowback (values held, D5 Table 6.6) is part of normal operation, not an abnormal state; an analyser stuck in blowback is the abnormal case and is judged by sensor validation (R-DQ-01). FAULT is the fault state.",
});
row(["STS-KLN-05"], {
  text: T.state,
  states: { normal: "OK", warn: ["LOW LUBRICANT"], alarm: ["FAULT"] },
  note: "Abnormal state added: the spray controller's low-lubricant (reservoir) status.",
});
row(["STS-KLN-11"], {
  text: T.state,
  states: { normal: "READY", warn: ["NOT READY"], alarm: ["FAULT"] },
  note: "Fault state added: auxiliary drive trip.",
});

// ---------------------------------------------------------------- set-point (3)
row(["FLO-KFS-01", "FLO-BRN-01"], { text: T.setpoint, limit: keep });
row(["WGT-KFS-01"], {
  text: T.setpoint,
  limit: (d) => ({ kind: "modelPct", dir: "both", warnPct: 5, alarmPct: 10, ref: d.base }),
  note: "The plant sends no bin-weight set-point: the weight is judged ± 5 / ± 10 % against the bin-inventory model (weight expected from the level) until it does.",
});

// ---------------------------------------------------------------- position / limit / flow switches (6)
row(["POS-KFS-01"], {
  text: T.command,
  limit: (d) => ({ kind: "command", warnDev: 5, ref: d.base, abs: { alarmLo: 0.5, alarmHi: 99.5 } }),
  note: "% gate: deviation ≥ 5 %-pt from the dosing command, limit reached at an end stop. The LVDT ± 30 / ± 40 mm values of the row apply to the kiln thrust LVDT only.",
});
row(["POS-PHC-01"], {
  text: T.command,
  limit: (d) => ({ kind: "command", warnDev: 5, ref: d.base, abs: { warnHi: 96, alarmHi: 99.5 } }),
  note: "The DCS damper command is not in the signal list, so the reference is the measured position and only the end stop (limit reached, 99.5 %) and the near-open warning (96 %, no draft margin) can fire. LVDT values do not apply to a % damper.",
});
row(["FLO-KLN-05"], { text: T.command, note: "D5 applies the position template to an oil-flow switch; read as: NO FLOW = limit reached (alarm)." });
row(["LIM-KLN-01"], {
  text: T.command,
  states: { normal: "OK", alarm: ["WEAR LIMIT"] },
  note: "Brake-pad wear limit reached = alarm (it was a warning). LVDT values do not apply to a switch.",
});
row(["POS-KLN-01"], { text: T.command, limit: keep });
row(["POS-KLN-02"], { text: T.command });

// ---------------------------------------------------------------- SPD (6)
row(["SPD-KFS-01"], { text: T.speed, limit: speed("ELE-KFS-01", 118) });
row(["SPD-PHC-01"], { text: T.speed, limit: speed("ELE-PHC-01", 1850) });
row(["SPD-KLN-01"], { text: T.speed, limit: speed("ELE-KLN-01", 64), normalBand: "3.0–4.5" });
row(["SPD-CLR-01"], { text: T.speed, limit: speed("PRS-CLR-07", 118), note: "The grate has no drive current in the list: hydraulic working pressure ≥ ⅓ of design is 'drive on'." });
row(["SPD-HMR-01"], { text: T.speed, limit: speed("ELE-HMR-01", 96) });
row(["SPD-CSL-01"], { text: T.speed, limit: speed("ELE-CSL-01", 74) });

// ---------------------------------------------------------------- bearing RTDs (31)
const PAIRS: Array<[string, string]> = [
  ["TMP-PHC-09", "TMP-PHC-10"],
  ["TMP-KLN-19", "TMP-KLN-20"],
  ["TMP-KLN-22", "TMP-KLN-23"],
  ["TMP-HMR-01", "TMP-HMR-02"],
  // Support rollers: bearings A / B of the same roller.
  ["TMP-KLN-01", "TMP-KLN-02"],
  ["TMP-KLN-03", "TMP-KLN-04"],
  ["TMP-KLN-05", "TMP-KLN-06"],
  ["TMP-KLN-07", "TMP-KLN-08"],
  ["TMP-KLN-09", "TMP-KLN-10"],
  ["TMP-KLN-11", "TMP-KLN-12"],
];
for (const [a, b] of PAIRS) {
  row([a], { text: T.bearing, limit: bearing(b) });
  row([b], { text: T.bearing, limit: bearing(a) });
}
row(["TMP-KFS-01", "TMP-BRN-01", ...seq("TMP-CLR-", 1, 6), "TMP-CLR-10"], { text: T.bearing, limit: bearing(), note: "Single bearing: no pair, so the split test does not apply." });
row(["TMP-KLN-25"], {
  text: T.bearing,
  limit: bearing(undefined, 80),
  note: "D5 applies the bearing template to the sector-plate cooling-air RTD: baseline + 15 K kept; 95 °C is not physical for cooling air, so the alarm stays at the 80 °C plant value.",
});
row(["TMP-CLR-07"], {
  text: T.bearing,
  limit: bearing(undefined, 72),
  note: "D5 applies the bearing template to the grate hydraulic-oil RTD: baseline + 15 K kept; 95 °C is not physical for hydraulic oil, so the alarm stays at the 72 °C OEM-type value.",
});

// ---------------------------------------------------------------- VIB (16)
row(["VIB-KFS-01", "VIB-PHC-01", "VIB-PHC-02", ...seq("VIB-KLN-", 1, 3), "VIB-BRN-01", ...seq("VIB-CLR-", 1, 3), "VIB-CLR-07", "VIB-HMR-02", "VIB-CSL-01"], { text: T.vib, limit: vib });
row(["VIB-KLN-04", "VIB-BRN-02"], { text: T.vib, limit: vib, note: "D5 values (4.5 / 7.1 mm/s) replace the former 5.6–6.3 / 9.0 demo limits; a flexible-support class needs an OEM deviation." });
row(["VIB-HMR-01"], { text: T.vib, limit: vib, normalBand: "2.0–4.0", note: "D5 values (4.5 / 7.1 mm/s) replace the former 7.1 / 11 demo limits; the normal band now ends below the warning." });

// ---------------------------------------------------------------- GAS (6)
row(["GAS-PHC-01", "GAS-PHC-02", "GAS-KLN-01", "GAS-KLN-02", "GAS-BRN-01"], { text: T.gas, limit: keep });
row(["GAS-KLN-03"], {
  text: T.gas,
  limit: fixed({ kind: "band", warnLo: 400, warnHi: 1700, alarmHi: 1900 }),
  note: "Alarm lowered to 1,900 ppm: the former 2,100 ppm sat above the 0–2,000 ppm NOₓ analyser range (D5 Table 6.6) and could never be reached.",
});

// ---------------------------------------------------------------- process temperatures (15)
row([...seq("TMP-PHC-", 1, 8), "TMP-KLN-13", "TMP-KLN-14", "TMP-KLN-26", "TMP-KLN-27", "TMP-CLR-08", "TMP-CLR-09"], { text: T.tmp, limit: tmpModel });
row(["TMP-BRN-02"], {
  text: T.tmp,
  limit: () => undefined,
  note: "Display only: D5 §5.5.6 makes the secondary-air temperature a trend only (radiation and dust affect it), so no warning or alarm is applied. The Table 9.2 row (± 25 K / ± 50 K from model) is kept for reference.",
});

// ---------------------------------------------------------------- KLN singles
row(seq("MIG-KLN-", 1, 3), { text: T.mig, limit: keep });
row(["PRS-KLN-03"], { text: T.hood, limit: keep });
row(["PRS-KLN-04"], {
  text: T.oilP,
  limit: (d) => ({ kind: "modelDev", dir: "lo", warn: 0.3, ref: d.base, abs: { warnLo: 1.2, alarmLo: 0.8 } }),
  note: "Warning 0.3 bar below the oil-temperature-corrected model or at the 1.2 bar OEM low; alarm 0.8 bar as the trip-warning margin (trip value pending from the OEM).",
});
row(["PRS-KLN-05"], {
  text: T.dp,
  limit: (d) => ({ ...(d.limit as LimitRule), rate: { perH: 0.1, of: "residual", window: 60 } }),
  note: "Rate of rise judged on the oil-temperature-corrected residual over 60 min (> 0.1 bar/h); change point 1.4 bar, maximum ΔP 2.0 bar.",
});
row(["PRS-CSL-01"], {
  text: T.dp,
  limit: (d) => ({ ...(d.limit as LimitRule), rate: { perH: 0.5, of: "residual", window: 120 } }),
  note: "Rate of rise on the residual to the cleaning-cycle model over 2 h (> 0.5 mbar/h), so the pulse-cleaning sawtooth is not a rise.",
});
row(["PRS-KLN-07"], {
  text: T.hyd,
  limit: (d) => ({ kind: "modelPct", dir: "both", warnPct: 20, collapsePct: 50, ref: d.base, abs: { alarmHi: 180 } }),
  note: "Collapse read as ≤ 50 % of the model; OEM maximum 180 bar (demo).",
});
row(["PRS-CLR-07"], {
  text: T.hyd,
  limit: (d) => ({ kind: "modelPct", dir: "both", warnPct: 20, collapsePct: 50, ref: d.base, abs: { alarmHi: 205 } }),
  note: "Collapse read as ≤ 50 % of the model; OEM maximum 205 bar (demo).",
});
row(seq("PRX-KLN-", 1, 6), {
  text: T.prx,
  states: { normal: "CYCLING", warn: ["1 MISSED"], alarm: ["NO CYCLE"] },
  note: "1 MISSED = one missed divider cycle (warning); NO CYCLE = two or more consecutive missed cycles (alarm).",
});
row(["STS-KLN-08"], {
  text: T.scanner,
  limit: fixed({ kind: "lo", warn: 95, alarm: 80 }),
  note: "Coverage: warning below the 95 % target, alarm at 80 %.",
});
row(["CAL-KLN-03"], {
  text: T.scanner,
  limit: (d) => ({ kind: "modelDev", dir: "hi", warn: 40, ref: d.base, abs: { alarmHi: 420 }, rate: { perH: 15, of: "value", window: 30 } }),
  note: "Warning 40 K over the profile model or a rise > 15 K/h; alarm at the 420 °C demo shell limit (D5 Table 9.5). 380 °C stays the map alert colour only.",
});
row(["TMP-KLN-15"], {
  text: T.oilT,
  limit: (d) => ({ kind: "modelDev", dir: "hi", warn: 10, ref: d.base, abs: { alarmHi: 85 } }),
  note: "OEM maximum oil temperature 85 °C (demo).",
});
row(["TMP-KLN-21", "TMP-HMR-03"], {
  text: T.winding,
  limit: fixed({ kind: "hi", warn: 135, alarm: 155 }),
  note: "Insulation class F (155 °C) assumed until the motor nameplate is confirmed: warning 135 °C, alarm 155 °C. The former 140 °C matched no insulation class.",
});
row(["CAM-BRN-01"], {
  text: T.camera,
  states: { normal: "FEED LIVE", warn: ["FEED LOST"] },
  note: "Image lost is a warning; D5 has no alarm for the camera (it was an alarm).",
});
row(["TMP-BRN-04"], {
  text: T.coalBin,
  limit: (d) => ({ ...(d.limit as LimitRule), rate: { perH: 5, of: "residual", window: 60 } }),
  note: "Rise > 5 K/h judged on the residual to the ambient model over 60 min (ambient swings are not a rise); plant warning 70 °C, EHS limit 80 °C (demo, MOM 1.13.1).",
});

/* ------------------------------------------------------------------ */
/* Apply                                                               */
/* ------------------------------------------------------------------ */

/** D5 Table 9.2 row of each tag (161 online entries; STS-KLN-08 / CAL-KLN-03 share one row). */
export const PYRO_D5_LIMITS: Record<string, PyroD5Limit> = Object.fromEntries(
  Object.entries(ROWS).map(([tag, r]) => [tag, { tag, ...r.text, ...(r.note ? { note: r.note } : {}) }]),
);

/**
 * Replace each signal's limit / state severities with the D5 matrix. Called
 * once by `./signals` at load; throws when an online entry has no row.
 */
export function applyD5Limits(signals: PyroSignalDef[]): void {
  const missing = signals.filter((s) => s.origin === "online" && !ROWS[s.tag]).map((s) => s.tag);
  if (missing.length) throw new Error(`pyro D5 alarm matrix: no row for ${missing.join(", ")}`);
  for (const s of signals) {
    const r = ROWS[s.tag];
    if (!r) continue;
    if (r.states && s.type === "state") s.states = r.states;
    if (r.normalBand) s.normalBand = r.normalBand;
    if (s.type !== "analog") continue;
    const l = r.limit ? r.limit(s) : s.limit;
    s.limit = l ? { ...l, d5: { ...r.text, ...(r.note ? { note: r.note } : {}) } } : undefined;
  }
}

/* ------------------------------------------------------------------ */
/* Live context for the engine                                         */
/* ------------------------------------------------------------------ */

export interface PyroLimitInput {
  measured: Record<string, number>;
  model: Record<string, number>;
  /** Per-minute readings and reference values, current sample last. */
  hist: Record<string, number[]>;
  modelHist: Record<string, number[]>;
  /** The owning machine is running (D5 "≈ 0 stopped"). */
  running: boolean;
  /** Operating point changing (D4 §8.2): relative tests hold the previous severity. */
  transient: boolean;
  /** Limit severity of the previous sample. */
  hold?: Severity;
  setpoint?: number;
}

/** Samples the residual is averaged over before a relative test (one-minute noise is not a deviation). */
const RES_MEAN_N = 3;

/** Everything `evaluateLimit` needs for one pyro signal this minute. */
export function pyroLimitContext(def: PyroSignalDef, x: PyroLimitInput): LimitContext {
  const l = def.limit;
  const ctx: LimitContext = { setpoint: x.setpoint, running: x.running, transient: x.transient, hold: x.hold };
  if (!l) return ctx;
  const h = x.hist[def.tag] ?? [];
  const mh = x.modelHist[def.tag] ?? [];
  if ("ref" in l) {
    ctx.model = x.model[def.tag];
    const k = Math.min(RES_MEAN_N, h.length, mh.length);
    if (k > 0) {
      let acc = 0;
      for (let i = 1; i <= k; i++) acc += h[h.length - i] - mh[mh.length - i];
      ctx.residual = acc / k;
    }
  }
  if (l.kind === "bearing" && l.pair) {
    ctx.pair = x.measured[l.pair];
    ctx.pairModel = x.model[l.pair];
  }
  if (l.kind === "speedRef" && l.drive) ctx.drive = x.measured[l.drive];
  if (l.rate) {
    ctx.rate = (of, window) => {
      if (of === "value") {
        const sl = slope(h, window);
        return sl === null ? null : sl * 60;
      }
      const n = Math.min(h.length, mh.length, window);
      const rs = h.slice(h.length - n).map((v, i) => v - mh[mh.length - n + i]);
      const sl = slope(rs, window);
      return sl === null ? null : sl * 60;
    };
  }
  return ctx;
}
