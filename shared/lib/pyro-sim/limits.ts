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
import { PYRO_RANGE_BY_SIGNAL, PYRO_RANGES_DOC, rangeInUnit } from "./ranges";
import { CLR_FAN_FLA } from "./shared";

/** Running motor current at the design point (% FLA). */
const I_FLA = 75;

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

// ---------------------------------------------------------------- ELE
row(
  [
    "ELE-FSL-01",
    "ELE-FSL-02",
    "ELE-KFS-01",
    ...seq("ELE-KFS-", 3, 7),
    "ELE-BGH-01",
    ...seq("ELE-BRN-", 1, 3),
    ...seq("ELE-CLR-", 1, 7),
    ...seq("ELE-CLR-", 11, 13),
    "ELE-HMR-01",
    "ELE-CSL-01",
  ],
  { text: T.load, limit: load(), note: "OSW-PE-SNL-PYR-01 Rev. 02 states motor currents in % of full-load amps (FLA): the load model and the set-points are in % FLA." },
);
row(["ELE-PHC-01"], { text: T.load, limit: load(), note: "ID fan motor power in % of rated power (OSW-PE-SNL-PYR-01 Rev. 02)." });
row(["ELE-KLN-01"], {
  text: T.load,
  limit: load(),
  note: "Kiln drive torque / load in % of rated (OSW-PE-SNL-PYR-01 Rev. 02): HH 105 % is reachable because the torque channel spans 0–150 % (overload), not the 0–100 % clamp of other % channels.",
});
row(["ELE-CSL-02"], {
  text: T.load,
  limit: load(),
  note: "D5 has no low-side limit: low fan current stays rule evidence (blocked filter / damper), not a limit.",
});

// ---------------------------------------------------------------- LEV
row(["LEV-FSL-01", "LEV-BRN-01", "LEV-KLN-01", "LEV-CSL-01"], { text: T.band, limit: keep });
row(["LEV-KFS-04", ...seq("LEV-BGH-", 1, 3)], {
  text: T.band,
  note: "Level switch: HIGH (material build-up in the elevator boot / full dust hopper) is the switch alarm.",
});
row(["WGT-KFS-01"], { text: T.band, limit: keep, note: "Calculated bin weight (sum of load cells 1–3) in % of bin capacity (OSW-PE-SNL-PYR-01 Rev. 02 HP-03)." });

// ---------------------------------------------------------------- PRS (process model)
row(["PRS-FSL-01", "PRS-KFS-01", "PRS-KFS-02", "PRS-KFS-03", "PRS-KFS-04", "PRS-KFS-06", "PRS-KFS-07", "PRS-KLN-01", ...seq("PRS-BRN-", 1, 6), ...seq("PRS-CLR-", 1, 6)], { text: T.prs, limit: prsModel });
row(["PRS-FSL-03", "PRS-FSL-04", "PRS-KFS-08", "PRS-KFS-09", "PRS-BGH-02", "PRS-BGH-03", "PRS-CLR-21", "PRS-CLR-22", "PRS-CSL-02", "PRS-CSL-03"], {
  text: T.prs,
  limit: () => undefined,
  note: "Dust-collector / ESP static pressure: OSW-PE-SNL-PYR-01 Rev. 02 gives a nominal band and no set-points; the filter is judged on its calculated ΔP (inlet − outlet), so the two pressures carry no limit of their own (display and trend).",
});
row([...seq("PRS-PHC-", 1, 6), "PRS-PHC-10"], {
  text: T.draft,
  limit: prsModel,
  note: "Judged on |model| (drafts are negative); OSW-PE-SNL-PYR-01 Rev. 02 sets H / L at nominal ± 20 %. The staircase C1 → C6 is a plausibility check of the taps (sensor validation), not a limit.",
});
row(seq("PRS-PHC-", 11, 16), {
  text: T.draft,
  limit: prsModel,
  note: "Cyclone cone pressure (tags on hold, doc HP-02): judged on |model|; OSW-PE-SNL-PYR-01 Rev. 02 H −1.0 mbar (build-up) and HH 0 mbar as the absolute sides.",
});

// ---------------------------------------------------------------- STS
row(["STS-FSL-03", "STS-BGH-01", "STS-KLN-12", "STS-KLN-13", "STS-KLN-14", "STS-BRN-01", "STS-BRN-02"], { text: T.state });
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

// ---------------------------------------------------------------- set-point
row(["FLO-KFS-01", "FLO-KFS-02"], {
  text: T.setpoint,
  limit: keep,
  note: "Each solid-flow meter is judged against its share of the kiln-feed set-point (half each, slides A and B).",
});
row(["FLO-BRN-01"], { text: T.setpoint, limit: keep });
row(["FLO-BRN-02"], { text: T.band, limit: keep, note: "The calciner coal set-point is not in the signal list: the flow is judged against its operating band." });
row(seq("WGT-KFS-", 2, 4), {
  text: T.setpoint,
  limit: (d) => ({ kind: "modelPct", dir: "both", warnPct: 10, alarmPct: 20, ref: d.base }),
  note: "OSW-PE-SNL-PYR-01 Rev. 02: each load cell ± 10 % (Alert) / ± 20 % (Critical) of the mean, read as its share of the bin-inventory model (the bin has no level sensor); a cell far from the other two is a load-cell fault.",
});

// ---------------------------------------------------------------- position / limit / flow switches
row(seq("POS-FSL-", 1, 6), {
  text: T.command,
  limit: (d) => ({ kind: "command", warnDev: 5, ref: d.base, abs: { warnHi: 98, alarmHi: 99.5 } }),
  note: "Motorised outlet gate opening (OSW-PE-SNL-PYR-01 Rev. 02): ± 5 % from the command (the extraction controller's demand, the reference model) is the Alert; fully open is the end stop. Manual and pneumatic gates are not monitored.",
});
row(["POS-KFS-01", "POS-KFS-02"], {
  text: T.command,
  note: "Open / closed limit switches: CLOSED or TRAVELLING while the line feeds is abnormal (warning); FAULT (both or neither switch made) is the fault. OSW-PE-SNL-PYR-01 Rev. 02 heads the discharge 'line A running, line B standby'; the simulation runs both slides (see the register remarks).",
});
row(["POS-PHC-02", "POS-BRN-01"], {
  text: T.command,
  limit: keep,
  note: "The DCS command is not in the signal list: the measured position is judged against its operating band and the end stops.",
});
row(["POS-PHC-03", "POS-PHC-04", "POS-PHC-05"], {
  text: T.command,
  limit: (d) => ({ kind: "command", warnDev: 5, ref: d.base, abs: { warnHi: 98, alarmHi: 99.5 } }),
  note: "WHRS damper (OSW-PE-SNL-PYR-01 Rev. 02): ± 5 % from the command; the DCS command is not in the list, so the reference is the damper's set position.",
});
row(["LIM-KFS-01"], { text: T.command, note: "Belt-sway switch made = alarm (misaligned belt)." });
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

// ---------------------------------------------------------------- SPD
row(["SPD-KFS-01", "SPD-HMR-01", "SPD-CSL-01"], {
  text: T.speed,
  states: { normal: "RUNNING", alarm: ["STOPPED WHILE RUNNING"] },
  note: "Zero-speed switch (OSW-PE-SNL-PYR-01 Rev. 02 HP-05: no rpm): STOPPED with the drive off is normal; stopped while the drive runs is the alarm (shear pin, coupling, chain or belt).",
});
row(["SPD-KFS-02", "SPD-KFS-03", ...seq("SPD-BGH-", 2, 4)], {
  text: T.speed,
  states: { normal: "RUNNING", alarm: ["STOPPED"] },
  note: "Rotary airlock zero-speed switch: a stopped airlock (no meal or dust discharge, false air) is the alarm.",
});
row(["SPD-PHC-01"], { text: T.speed, limit: speed("ELE-PHC-01", 80) });
row(["SPD-KLN-01"], { text: T.speed, limit: speed("ELE-KLN-01", 64) });
row(["SPD-BGH-01"], { text: T.speed, limit: speed("ELE-BGH-01", I_FLA) });
for (const [k, i0] of CLR_FAN_FLA.entries())
  row([`SPD-CLR-0${k + 1}`], {
    text: T.speed,
    limit: (d) => ({ kind: "speedRef", warnPct: 3, alarmPct: 6, drive: `ELE-CLR-0${k + 1}`, driveOn: +(i0 / 3).toFixed(1), ref: d.base }),
    note: "Cooling fan speed (OSW-PE-SNL-PYR-01 Rev. 02): ± 3 % from the speed set-point is the Alert.",
  });
for (const n of [1, 2, 3])
  row([`SPD-CLR-1${n}`], {
    text: T.speed,
    limit: speed(`ELE-CLR-1${n}`, 66),
    note: "Grate stroke rate (conditional point, Rev. 02 HP-07): judged against the bed-depth controller target; motor current ≥ ⅓ of design is 'drive on'.",
  });

// ---------------------------------------------------------------- bearing RTDs
const PAIRS: Array<[string, string]> = [
  ["TMP-KFS-01", "TMP-KFS-03"],
  ["TMP-PHC-09", "TMP-PHC-10"],
  ["TMP-KLN-19", "TMP-KLN-20"],
  ["TMP-KLN-22", "TMP-KLN-23"],
  ["TMP-HMR-01", "TMP-HMR-02"],
  ["TMP-HMR-04", "TMP-HMR-05"],
  ["TMP-CSL-03", "TMP-CSL-04"],
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
row(["TMP-BGH-01", "TMP-BRN-01", ...seq("TMP-CLR-", 1, 6), "TMP-CLR-10", ...seq("TMP-CLR-", 31, 33)], { text: T.bearing, limit: bearing(), note: "Single bearing: no pair, so the split test does not apply." });
row(["TMP-KLN-25"], {
  text: T.bearing,
  limit: bearing(undefined, 150),
  note: "D5 applies the bearing template to the sector-plate cooling-air RTD: baseline + 15 K kept; 95 °C is not physical for cooling air, so the alarm is the OSW-PE-SNL-PYR-01 Rev. 02 HH 150 °C.",
});

// ---------------------------------------------------------------- VIB
row(
  [
    "VIB-KFS-01",
    "VIB-KFS-04",
    "VIB-PHC-01",
    "VIB-PHC-02",
    "VIB-BGH-01",
    ...seq("VIB-KLN-", 1, 5),
    "VIB-BRN-01",
    "VIB-BRN-02",
    ...seq("VIB-CLR-", 1, 7),
    ...seq("VIB-CLR-", 11, 13),
    "VIB-HMR-03",
    "VIB-HMR-04",
    ...seq("VIB-CSL-", 1, 3),
  ],
  { text: T.vib, limit: vib },
);
row(["VIB-HMR-01", "VIB-HMR-02"], { text: T.vib, limit: vib, note: "Crusher rotor bearings: OSW-PE-SNL-PYR-01 Rev. 02 sets H 7.1 / HH 11.2 mm/s (nominal 2.0–4.5) for the heavily loaded rotor." });

// ---------------------------------------------------------------- GAS
row(["GAS-PHC-01", "GAS-PHC-02", "GAS-PHC-03", "GAS-PHC-04", "GAS-KLN-01", "GAS-KLN-02", "GAS-KLN-03", "GAS-BRN-01"], { text: T.gas, limit: keep });
row(seq("GAS-BGH-", 1, 5), {
  text: T.gas,
  limit: keep,
  note: "Read-only link to the stack CEMS: plant emission limits apply (Rev. 02 HP-09: consent, reference basis and analyser ranges to be checked against the site permit; SOx / NOx have no numeric set-point yet).",
});

// ---------------------------------------------------------------- process temperatures
row(
  [
    ...seq("TMP-PHC-", 1, 8),
    ...seq("TMP-PHC-", 21, 26),
    "TMP-PHC-30",
    "TMP-PHC-31",
    "TMP-BGH-02",
    "TMP-BRN-03",
    "TMP-BRN-07",
    "TMP-KLN-13",
    "TMP-KLN-14",
    "TMP-KLN-26",
    "TMP-KLN-27",
    "TMP-CLR-08",
    "TMP-CLR-09",
    "TMP-CLR-24",
    "TMP-CLR-25",
    "TMP-HMR-06",
    "TMP-CSL-01",
  ],
  { text: T.tmp, limit: tmpModel },
);
row(seq("TMP-KLN-", 28, 30), {
  text: T.tmp,
  limit: tmpModel,
  note: "DCS read-only temperature: judged against the model; the alarm side is the plant DCS limit (demo).",
});
row(["TMP-BRN-02"], {
  text: T.tmp,
  limit: () => undefined,
  note: "Display only: D5 §5.5.6 makes the secondary-air temperature a trend only (radiation and dust affect it), so no warning or alarm is applied. The Table 9.2 row (± 25 K / ± 50 K from model) and the Rev. 02 L 900 / H 1,200 °C are kept for reference.",
});

// ---------------------------------------------------------------- KLN singles
row(seq("MIG-KLN-", 1, 3), { text: T.mig, limit: keep });
row(["PRS-KLN-03"], { text: T.hood, limit: keep });
row(["PRS-KLN-04"], {
  text: T.oilP,
  limit: (d) => ({ kind: "modelDev", dir: "lo", warn: 0.3, ref: d.base, abs: { warnLo: 1.5, alarmLo: 1.0 } }),
  note: "Warning 0.3 bar below the oil-temperature-corrected model or at the OSW-PE-SNL-PYR-01 Rev. 02 L 1.5 bar; alarm at LL 1.0 bar as the trip-warning margin (trip value pending from the OEM).",
});
row(["PRS-KLN-05"], {
  text: T.dp,
  limit: (d) => ({ ...(d.limit as LimitRule), rate: { perH: 0.1, of: "residual", window: 60 } }),
  note: "Rate of rise judged on the oil-temperature-corrected residual over 60 min (> 0.1 bar/h); change point 1.5 bar, maximum ΔP 2.5 bar (Rev. 02).",
});
row(["PRS-FSL-02", "PRS-KFS-05", "PRS-BGH-01"], {
  text: T.dp,
  limit: (d) => ({ ...(d.limit as LimitRule), rate: { perH: 0.5, of: "residual", window: 120 } }),
  note: "Filter ΔP, calculated as inlet − outlet pressure (OSW-PE-SNL-PYR-01 Rev. 02): rate of rise on the residual to the cleaning-cycle model over 2 h (> 0.5 mbar/h); change point and maximum ΔP from the register.",
});
row(["PRS-CSL-01"], {
  text: T.dp,
  limit: (d) => ({ ...(d.limit as LimitRule), rate: { perH: 0.5, of: "residual", window: 120 } }),
  note: "Calculated inlet − outlet ΔP: rate of rise on the residual to the cleaning-cycle model over 2 h (> 0.5 mbar/h), so the pulse-cleaning sawtooth is not a rise.",
});
row(["PRS-CLR-20"], {
  text: T.dp,
  limit: (d) => ({ ...(d.limit as LimitRule), rate: { perH: 0.5, of: "residual", window: 120 } }),
  note: "Cooler vent ESP ΔP, calculated as inlet − outlet (OSW-PE-SNL-PYR-01 Rev. 02 HP-06): high ΔP is plate build-up or rapping failure, low ΔP a bypass or an open inspection door.",
});
row(["PRS-KLN-07"], {
  text: T.hyd,
  limit: (d) => ({ kind: "modelPct", dir: "both", warnPct: 20, collapsePct: 50, ref: d.base, abs: { alarmHi: 200 } }),
  note: "Collapse read as ≤ 50 % of the model; OSW-PE-SNL-PYR-01 Rev. 02 L 50 / H 150 / HH 200 bar.",
});
row(seq("PRX-KLN-", 1, 6), {
  text: T.prx,
  states: { normal: "CYCLING", warn: ["1 MISSED"], alarm: ["NO CYCLE"] },
  note: "1 MISSED = one missed divider cycle (warning); NO CYCLE = two or more consecutive missed cycles (alarm).",
});
row(["STS-KLN-08"], {
  text: T.scanner,
  limit: (d) => ({ kind: "modelDev", dir: "hi", warn: 40, ref: d.base, abs: { alarmHi: 420 }, rate: { perH: 15, of: "value", window: 30 } }),
  note: "Shell scanner maximum (OSW-PE-SNL-PYR-01 Rev. 02: STS-KLN-08 is the shell maximum and its position in one reading): warning 40 K over the profile model or a rise > 15 K/h, H 370 °C, HH 420 °C. Scanner coverage is the scanner's own quality figure (R-DQ-01), not a register point.",
});
row(["TMP-KLN-15"], {
  text: T.oilT,
  limit: (d) => ({ kind: "modelDev", dir: "hi", warn: 10, ref: d.base, abs: { alarmHi: 80 } }),
  note: "Oil temperature: L 25 / H 70 / HH 80 °C (OSW-PE-SNL-PYR-01 Rev. 02).",
});
row([...seq("TMP-KLN-", 41, 46), "TMP-HMR-03", "TMP-FSL-01", "TMP-KFS-02", "TMP-PHC-11", "TMP-BGH-03", "TMP-BRN-05", "TMP-BRN-06", ...seq("TMP-CLR-", 17, 23), "TMP-CSL-02"], {
  text: T.winding,
  limit: fixed({ kind: "hi", warn: 135, alarm: 155 }),
  note: "Stator winding RTD: OSW-PE-SNL-PYR-01 Rev. 02 H 130 / HH 145 °C (nominal 80–110 °C) inside the insulation class F limit (155 °C) until the motor nameplate is confirmed. The kiln main motor has six winding RTDs (two per phase).",
});
row(["CAM-BRN-01"], {
  text: T.camera,
  states: { normal: "FEED LIVE", warn: ["FEED LOST"] },
  note: "Image lost is a warning; D5 has no alarm for the camera (it was an alarm).",
});
row(["TMP-BRN-04"], {
  text: T.coalBin,
  limit: (d) => ({ ...(d.limit as LimitRule), rate: { perH: 5, of: "residual", window: 60 } }),
  note: "Rise > 5 K/h judged on the residual to the ambient model over 60 min (ambient swings are not a rise); OSW-PE-SNL-PYR-01 Rev. 02 H 75 / HH 85 °C.",
});

/* ------------------------------------------------------------------ */
/* Apply                                                               */
/* ------------------------------------------------------------------ */

/** D5 Table 9.2 row of each tag (every online register position, plus the calculated ΔP and bin-weight rows). */
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
  applyRangeLimits(signals);
}

/** "−11.8 … −5.9" / "870–900": a range in our unit, at a sensible precision. */
function rangeText(lo: number | null, hi: number | null): string | null {
  if (lo === null && hi === null) return null;
  const f = (v: number) => {
    const a = Math.abs(v);
    const d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
    return (+v.toFixed(d)).toLocaleString("en-US", { maximumFractionDigits: d }).replace(/-/g, "−");
  };
  if (lo === null) return `< ${f(hi!)}`;
  if (hi === null || lo === hi) return f(lo);
  return lo < 0 || hi < 0 ? `${f(lo)} … ${f(hi)}` : `${f(lo)}–${f(hi)}`;
}

/**
 * OSW-PE-SNL-PYR-01 Rev. 02 set-points (./ranges) on top of the D5 matrix: L / H are the Alert band,
 * LL / HH the Critical band, in our signal's unit. Absolute limit kinds take them as their band; relative
 * kinds (model, command) keep their D5 test and judge the set-points alongside it (`abs`); bearings and
 * vibration take H / HH as their warning / alarm; speed and set-point kinds keep their relative test.
 * The nominal band becomes the signal's normal band.
 */
export function applyRangeLimits(signals: PyroSignalDef[]): void {
  for (const s of signals) {
    const row = PYRO_RANGE_BY_SIGNAL[s.tag];
    if (!row || s.type !== "analog") continue;
    const u = rangeInUnit(row, s.base);
    if (!u) continue;
    const normal = rangeText(u.nominalLo, u.nominalHi);
    if (normal) s.normalBand = normal;
    const band: LimitBand = {};
    if (u.l !== null) band.warnLo = u.l;
    if (u.h !== null) band.warnHi = u.h;
    if (u.ll !== null) band.alarmLo = u.ll;
    if (u.hh !== null) band.alarmHi = u.hh;
    if (!Object.keys(band).length || !s.limit) continue;
    const note = `${PYRO_RANGES_DOC}: L ${row.L} · H ${row.H} · LL ${row.LL} · HH ${row.HH} ${row.docUnit}${u.basis ? ` (${u.basis})` : ""}`;
    const d5 = s.limit.d5 ? { ...s.limit.d5, note: [s.limit.d5.note, note].filter(Boolean).join(" · ") } : undefined;
    const l = s.limit;
    switch (l.kind) {
      case "hi":
      case "lo":
      case "abs":
      case "band":
        s.limit = { kind: "band", ...band, ...(l.rate ? { rate: l.rate } : {}), ...(d5 ? { d5 } : {}) };
        break;
      case "modelPct":
        // A model near zero (a meter pressure at about atmospheric) makes "± % of model" meaningless: the set-points alone judge it.
        if (Math.abs(l.ref) < 1) s.limit = { kind: "band", ...band, ...(l.rate ? { rate: l.rate } : {}), ...(d5 ? { d5 } : {}) };
        else s.limit = { ...l, abs: band, ...(d5 ? { d5 } : {}) };
        break;
      case "modelDev":
      case "command":
        s.limit = { ...l, abs: band, ...(d5 ? { d5 } : {}) };
        break;
      case "bearing":
        s.limit = { ...l, alarm: u.hh ?? l.alarm, ...(d5 ? { d5 } : {}) };
        break;
      case "vib":
        s.limit = { ...l, warn: u.h ?? l.warn, alarm: u.hh ?? l.alarm, ...(d5 ? { d5 } : {}) };
        break;
      default:
        if (d5) s.limit = { ...l, d5 };
    }
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
