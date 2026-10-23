/**
 * Data quality and sensor-health verification of the pyro line
 * (D5 Table 9.4.2, all signals; D5 §12 every-shift review).
 *
 * `applyAnalyserCycle` runs on the raw readings: the gas analysers blow their
 * probes back (values held, D5 Table 6.6) and report a status.
 * `screenQuality` runs every minute before the rules:
 *
 *   Range / stale        → Invalid  out of span (broken loop), clipped at the
 *                                   range end, stale for the class cadence,
 *                                   zero vibration while running, speed ≈ 0
 *                                   with full drive current, analyser FAULT or
 *                                   stuck in blowback, camera feed lost
 *   Variability band     → Suspect  too steady (stuck) or too noisy (loose)
 *   Rate of change       → Suspect  a step no instrument of the class can
 *                                   make, unexplained by the reference model
 *   Physical neighbours  → Suspect  torque vs winding + oil, fan current vs
 *                                   pressure; witness votes on the meters;
 *                                   readings on a stopped unit (≈ 0 expected)
 *   Vibration vs temp.   → flag only (FP-46): vibration up, bearing flat
 *   Operating mode       → comparisons only on a running, settled unit
 *   Manual comparison    → Suspect  scanner vs handheld; flag only for the
 *                                   oil trend vs the laboratory
 *
 * It keeps the line's quality flags with their hysteresis (four clean
 * samples) and a per-shift validity tally. `signalQuality` turns the flags
 * into a per-tag quality, `evalQualityRules` raises the per-machine R-DQ-01 /
 * R-DQ-02 findings and the R-ANM-01 unclassified deviation.
 */
import type { Quality, ShiftValidityLog } from "../../kiln-sim/engine";
import type { Severity } from "../../kiln-sim/signals";
import type { LineState } from "../engine";
import { TAG_UNIT, unitRunning, type EquipmentStates } from "../equipment";
import { PYRO_RULES_BY_MACHINE } from "../rules";
import { PYRO_MACHINES, PYRO_SIGNALS, PYRO_SIGNAL_BY_TAG, type PyroSignalDef } from "../signals";
import {
  ANALYSERS,
  BLOWBACK_EVERY_MIN,
  BLOWBACK_MIN,
  BLOWBACK_STUCK_MIN,
  CLASS_META,
  HANDHELD_GAP_K,
  NEIGHBOUR_CHECKS,
  NOISY_FACTOR,
  NOISY_RELEASE,
  NOISY_WINDOW,
  SCANNER_COVERAGE_TARGET,
  VIB_TMP_PAIRS,
  ZERO_AT_STOP_PRESSURES,
  maxStepPerMin,
  sensorClassOf,
} from "../sensor-meta";
import { SIGNED, emissivityMatched, fmtZ, median } from "../shared";
import type { EvalContext } from "./context";

const MACHINE_IDS = PYRO_MACHINES.map((m) => m.id);
const ANALOG = PYRO_SIGNALS.filter((s) => s.type === "analog");
const WIRED = ANALOG.filter((s) => s.origin === "online");
const SERIES_ONLINE = PYRO_SIGNALS.filter((s) => s.origin === "online");
const SIGNALS_BY_MACHINE: Record<string, PyroSignalDef[]> = Object.fromEntries(MACHINE_IDS.map((id) => [id, PYRO_SIGNALS.filter((s) => s.machine === id)]));
const sigma = (tag: string) => PYRO_SIGNAL_BY_TAG[tag]?.sigma || 1;
/** AR(1) coefficient of the simulated instrument noise (engine readings). */
const phiOf = (tag: string) => (tag.startsWith("VIB") ? 0.6 : 0.75);
/** Drive current / speed feedback pairs checked for a mismatch with the operating state. */
const RUN_PAIRS: Array<[string, string]> = [
  ["ELE-PHC-01", "SPD-PHC-01"],
  ["ELE-KLN-01", "SPD-KLN-01"],
];
/**
 * Drive current / zero-speed switch pairs (OSW-PE-SNL-PYR-01 Rev. 02 HP-05: the elevator, crusher and pan conveyor have a
 * zero-speed switch, no rpm): the switch reporting a stopped shaft while the drive carries its model load is the switch.
 */
const ZERO_SPEED_PAIRS: Array<[string, string]> = [
  ["ELE-KFS-01", "SPD-KFS-01"],
  ["ELE-HMR-01", "SPD-HMR-01"],
  ["ELE-CSL-01", "SPD-CSL-01"],
];
const SPEED_CURRENT: Record<string, string> = Object.fromEntries(RUN_PAIRS.map(([e, sp]) => [sp, e]));
/** Inputs of the calculated register points (OSW-PE-SNL-PYR-01 Rev. 02 CALC.). */
const CALC_INPUTS: Record<string, string[]> = {
  "PRS-FSL-02": ["PRS-FSL-03", "PRS-FSL-04"],
  "PRS-KFS-05": ["PRS-KFS-08", "PRS-KFS-09"],
  "PRS-BGH-01": ["PRS-BGH-02", "PRS-BGH-03"],
  "PRS-CLR-20": ["PRS-CLR-21", "PRS-CLR-22"],
  "PRS-CSL-01": ["PRS-CSL-02", "PRS-CSL-03"],
  "WGT-KFS-01": ["WGT-KFS-02", "WGT-KFS-03", "WGT-KFS-04"],
};
/** Rule categories that judge sensors rather than the plant. */
const DQ_RULE = /^R-(DQ|ANM)-/;
/** Minutes a unit must have run (or stood) before the comparisons judge it. */
const SETTLE_MIN = 10;
/** Minutes a unit must have stood still before it must read ≈ 0. */
const STOP_SETTLE_MIN = 5;
/** Sustained discordance (leaky count, minutes) before a physical-neighbour flag. */
const NEIGHBOUR_MIN = 30;
const VIB_TMP_MIN = 10;
/** Witness vote persistence before a meter is flagged (minutes, leaky count). */
const VOTE_MIN = 3;
/** Shift length (06:00 / 18:00 boundaries; the simulated clock starts at 06:00). */
const SHIFT_MIN = 720;

/**
 * Signals a rule of the line already watches: a deviation there has a known pattern
 * (or is still building toward one), wherever the rule lives on the line.
 */
const WATCHED = new Set<string>();
for (const list of Object.values(PYRO_RULES_BY_MACHINE)) for (const r of list) for (const tg of r.inputs) WATCHED.add(tg);

/**
 * Instrument span used for the clipping and out-of-range checks: the D5
 * calibrated `range` (sensor-meta), else percent channels 0–100 and others a
 * span derived from the demo limits (only entries without a D5 class).
 */
export function spanOf(def: PyroSignalDef): [number, number] {
  if (def.range) return def.range;
  if (def.unit === "%") return [0, 100];
  const l = def.limit;
  const alarm = !l ? 0 : l.kind === "band" ? Math.max(Math.abs(l.alarmHi ?? 0), Math.abs(l.warnHi ?? 0), Math.abs(l.alarmLo ?? 0)) : l.kind === "setpoint" ? 0 : "alarm" in l ? Math.abs(l.alarm ?? 0) : 0;
  const hi = Math.max(alarm * 1.6, Math.abs(def.base) * 2, 1);
  return def.base < 0 || SIGNED.has(def.tag) ? [-hi, hi] : [0, hi];
}

const fmtSpread = (v: number) => (v >= 0.1 ? v.toFixed(2) : v.toPrecision(1));
const fmtV = (def: PyroSignalDef, v: number) => `${v.toFixed(def.decimals)} ${def.unit}`;

/* ------------------------------------------------------------------ */
/* Sensor-health memory (kept beside the line state, not in it)        */
/* ------------------------------------------------------------------ */

export interface ShiftTally {
  /** Minutes Suspect / Invalid / flagged-only in the shift. */
  suspect: number;
  invalid: number;
  flagOnly: number;
  /** First and last flagged minute. */
  first: number;
  last: number;
  /** Latest note. */
  note: string;
}

/** Same shape as the frame's `ShiftValidityLog` (kiln-sim engine). */
export interface ShiftValidity extends ShiftValidityLog {
  /** Tags that were flagged at least once in the shift. */
  tags: Record<string, ShiftTally>;
}

interface AnalyserMem {
  status: string;
  /** Consecutive minutes in blowback. */
  blowback: number;
}

export interface HealthMem {
  /** Sticky rate-of-change flags: residual before the jump and the jump. */
  rate: Record<string, { pre: number; jump: number }>;
  noisy: Set<string>;
  neighbour: Record<string, number>;
  vibTmp: Record<string, number>;
  stopRead: Record<string, number>;
  /** Witness-vote persistence per meter (leaky count, minutes): a single-minute coincidence of witness scatter is not a vote. */
  vote: Record<string, number>;
  /** Per tag: whether its unit was judged running last minute, and since when. */
  run: Record<string, { on: boolean; since: number }>;
  analyser: Record<string, AnalyserMem>;
  /** Flag-only and information notes of this minute (quality stays Good). */
  notes: Record<string, string>;
  shift: ShiftValidity | null;
  prevShift: ShiftValidity | null;
}

const MEM = new WeakMap<LineState, HealthMem>();

/** A line's screening memory, to carry it with the line across a worker boundary (`freezeLine` / `thawLine`). */
export function lineMemory(s: LineState): HealthMem | undefined {
  return MEM.get(s);
}

export function adoptLineMemory(s: LineState, m: HealthMem | undefined): void {
  if (m) MEM.set(s, m);
}

function memOf(s: LineState): HealthMem {
  let m = MEM.get(s);
  if (!m) {
    m = { rate: {}, noisy: new Set(), neighbour: {}, vibTmp: {}, stopRead: {}, vote: {}, run: {}, analyser: {}, notes: {}, shift: null, prevShift: null };
    MEM.set(s, m);
  }
  return m;
}

/* ------------------------------------------------------------------ */
/* Gas analysers: blowback and status (D5 Table 6.6)                   */
/* ------------------------------------------------------------------ */

export interface AnalyserInput {
  t: number;
  s: LineState;
  /** Raw readings of this minute (before the history push); held values are written back. */
  measured: Record<string, number>;
  /** State signals; the kiln-inlet analyser status is set here. */
  states: Record<string, string>;
  /** Scenario state overrides: a state on a gas tag is its analyser's status (PHC exit and coal bin have no status signal in the 161). */
  stateOverride: Record<string, string>;
}

/**
 * Probe blowback every hour for two minutes (demo): the analyser reports
 * BLOWBACK and holds its last values (D5 Table 6.6 "held during blowback").
 * A scenario can force any analyser to FAULT or keep it in BLOWBACK.
 */
export function applyAnalyserCycle({ t, s, measured, states, stateOverride }: AnalyserInput): void {
  const m = memOf(s);
  for (const a of ANALYSERS) {
    const forced = (a.status ? stateOverride[a.status] : undefined) ?? a.tags.map((tg) => stateOverride[tg]).find(Boolean);
    const phase = (((t + a.offset) % BLOWBACK_EVERY_MIN) + BLOWBACK_EVERY_MIN) % BLOWBACK_EVERY_MIN;
    const status = forced ?? (phase < BLOWBACK_MIN ? "BLOWBACK" : "OK");
    if (a.status && !forced) states[a.status] = status;
    const am = (m.analyser[a.id] ??= { status: "OK", blowback: 0 });
    am.status = status;
    am.blowback = status === "BLOWBACK" ? am.blowback + 1 : 0;
    if (status === "BLOWBACK") for (const tg of a.tags) measured[tg] = s.hist[tg]?.at(-1) ?? measured[tg];
  }
}

const ANALYSER_OF: Record<string, (typeof ANALYSERS)[number]> = Object.fromEntries(ANALYSERS.flatMap((a) => a.tags.map((tg) => [tg, a])));

/* ------------------------------------------------------------------ */
/* Screening                                                           */
/* ------------------------------------------------------------------ */

export interface QualityInput extends Pick<EvalContext, "t" | "s" | "measured" | "states" | "running" | "res" | "sig"> {
  /** Tags whose source stopped updating this minute (scenario `stale` effects). */
  staleTags: Set<string>;
  /** Witness estimates and the meters they vote on (t/h). */
  witnesses: { feedElev: number; feedTorque: number; feedMeter: number; coalLine: number; coalBz: number; coalMeter: number };
  /** Operating point changing (comparisons that need a steady state wait). */
  transient?: boolean;
  /** Equipment run states (contract §1); without them the machine running evidence is used. */
  equipment?: EquipmentStates;
  /** Whole line stopped. */
  lineStop?: boolean;
  /** Shell scanner coverage this minute (% of the shell in view; the scanner's own quality figure). */
  coverage: number;
  /** Event on the owning machine when a tag is flagged or restored. */
  notify: (tag: string, severity: Severity, title: string, detail: string) => void;
}

export interface QualityScreen {
  /** R-DQ-01 notes of this minute, by tag. */
  invalid: Record<string, string>;
  /** Scanner coverage below the D5 target (95 %): the shell maximum is suspect; SW-KLN-03 reports it. */
  scannerSuspect: boolean;
  /** Why the shell maximum (STS-KLN-08) is suspect: coverage, handheld disagreement or saturation. */
  scannerNote: string | null;
  /** Flag-only and information notes of this minute (quality stays Good). */
  notes: Record<string, string>;
}

/** Screen and validate this minute's readings and update the line's quality flags. */
export function screenQuality(q: QualityInput): QualityScreen {
  const { t, s, measured, states, running, res, staleTags } = q;
  const { feedElev, feedTorque, coalLine, coalBz, coalMeter } = q.witnesses;
  const m = memOf(s);
  m.notes = {};
  const transient = q.transient ?? false;
  const resAt = (tag: string, back: number) => {
    const h = s.hist[tag];
    const mh = s.modelHist[tag];
    const i = h.length - 1 - back;
    return i >= 0 && mh[i] !== undefined ? h[i] - mh[i] : 0;
  };
  const meanZ = (tag: string, n: number) => {
    const h = s.hist[tag];
    const k = Math.min(n, h.length);
    let acc = 0;
    for (let i = 0; i < k; i++) acc += resAt(tag, i);
    return k ? acc / k / sigma(tag) : 0;
  };
  const ratioMean = (tag: string, n: number) => {
    const h = s.hist[tag];
    const mh = s.modelHist[tag];
    const k = Math.min(n, h.length);
    let acc = 0;
    for (let i = h.length - k; i < h.length; i++) acc += h[i] / Math.max(0.05, mh[i]);
    return k ? acc / k : 1;
  };

  // Operating mode: a tag is judged while its machine runs and its own unit runs (contract §1).
  // A line stop acts through the equipment states (some units keep running, e.g. the silo aeration).
  const unitOn = (tag: string) => (q.equipment ? unitRunning(q.equipment, tag) : !q.lineStop);
  const judged = (def: PyroSignalDef) => !!running[def.machine] && unitOn(def.tag);
  for (const def of WIRED) {
    const on = judged(def);
    const r = m.run[def.tag];
    // First sight (a new line starts in its steady state): settled; afterwards, since the last run-state change.
    if (!r) m.run[def.tag] = { on, since: -Infinity };
    else if (r.on !== on) m.run[def.tag] = { on, since: t };
  }
  const settled = (tag: string, n = SETTLE_MIN) => t - (m.run[tag]?.since ?? -Infinity) >= n;
  /** A rule of the line (not data quality) is building or confirmed on this tag: its discordance has a fault pattern. */
  // Rule state does not change while the readings are screened: collect the tags once per minute.
  let patternedTags: Set<string> | null = null;
  const patterned = (tag: string) => {
    if (!patternedTags) {
      patternedTags = new Set();
      for (const id of MACHINE_IDS) {
        const rules = s.machines[id]?.rules;
        if (!rules) continue;
        for (const rid in rules) {
          const mem = rules[rid];
          if (mem.status !== "QUIET" && !DQ_RULE.test(rid)) for (const t of mem.tags) patternedTags.add(t);
        }
      }
    }
    return patternedTags.has(tag);
  };
  const analyserStatus = (tag: string) => {
    const a = ANALYSER_OF[tag];
    return a ? (m.analyser[a.id] ?? { status: "OK", blowback: 0 }) : null;
  };

  /* ---------------- range / stale (R-DQ-01, Invalid) ---------------- */
  const invalid: Record<string, string> = {};
  const dq2: Record<string, string> = {};
  for (const def of WIRED) {
    const h = s.hist[def.tag];
    const v = measured[def.tag];
    const an = analyserStatus(def.tag);
    const held = an?.status === "BLOWBACK";
    if (held && an!.blowback <= BLOWBACK_STUCK_MIN) m.notes[def.tag] = `Held during analyser probe blowback (${an!.blowback} min; D5 Table 6.6)`;
    if (!judged(def)) continue;
    const [lo, hi] = spanOf(def);
    // At rest: the reading sits at the bottom of its span (a stopped stroke, a tail shaft that no longer turns) and a
    // condition rule of the line names the tag (grate trip R-CLR-03, chain break R-CSL-05): a genuine zero the edge
    // has no run feedback for, explained by its own rule — not a clipped or stuck transmitter.
    const atBottom = h.length >= 3 && h.slice(-3).every((x) => x <= lo + 0.01 * (hi - lo));
    // Under range: the process itself sits below the instrument's LRV (a pyrometer with an 800 °C LRV on a cooling kiln,
    // OSW-PE-SNL-PYR-01 Rev. 02 design ranges): the model is down there too, so the reading at the range end is genuine.
    const underRange = atBottom && measured[def.tag] - res(def.tag) <= lo + 0.02 * (hi - lo) && lo > 0;
    if (underRange) m.notes[def.tag] = `Below the instrument range (${lo} ${def.unit} LRV): the process is under the range, the reading holds at its end`;
    const atRest = atBottom && (patterned(def.tag) || underRange);
    // Out of span: a broken loop / failure signal outside the calibrated range is not a plant value.
    if (v < lo - 1e-6 || v > hi + 1e-6) invalid[def.tag] = `Range: ${fmtV(def, v)} outside the instrument span ${lo} … ${+hi.toFixed(2)} ${def.unit} (broken loop)`;
    // Clipped: pinned at the end of the range for 3 samples (saturated transmitter).
    else if (!atRest && settled(def.tag, 3) && h.length >= 3 && h.slice(-3).every((x) => x >= hi - 1e-6 || x <= lo + 1e-6))
      invalid[def.tag] = `Range: clipped at the span end (${v >= hi - 1e-6 ? +hi.toFixed(2) : lo} ${def.unit}) for 3 samples`;
    else if (def.tag.startsWith("VIB") && settled(def.tag, 2) && v < 0.05) invalid[def.tag] = "Range: zero vibration while the unit runs (cable / sensor)";
    // Variability band — too steady (stuck transmitter, blocked tap): Suspect (D5 Table 9.4.2).
    const n = def.flatlineN ?? 6;
    if (!held && !atRest && h.length >= n && settled(def.tag, n)) {
      const last = h.slice(-n);
      if (Math.max(...last) - Math.min(...last) < (def.minVar ?? 1e-9))
        dq2[def.tag] = `Variability band: too steady — ${n} samples within ${fmtSpread(def.minVar ?? 0)} ${def.unit} while running (stuck transmitter / blocked tap)`;
    }
  }
  // Stale: the source repeats its last sample with a frozen time stamp for longer than its class cadence allows (SW-DATA-01).
  for (const tag of staleTags) {
    s.staleSince[tag] ??= t;
    const def = PYRO_SIGNAL_BY_TAG[tag];
    const cls = def ? sensorClassOf(def) : null;
    const after = cls ? CLASS_META[cls].staleAfterMin : 2;
    if (t - s.staleSince[tag] >= after) invalid[tag] = `Stale: source time stamp frozen for ${t - s.staleSince[tag]} min (${cls ? CLASS_META[cls].sampling : "1 min"} source)`;
  }
  for (const tag of Object.keys(s.staleSince)) if (!staleTags.has(tag)) delete s.staleSince[tag];
  // Mismatch with the operating state: drive loaded at its model current but its speed feedback says stopped (dead pickup).
  // A drive that unloads with the speed (chain break, coupling) or overloads with it (choke, jam) is a machine pattern
  // (D5 FP-06 / FP-42 "zero speed with drive on"), not a sensor fault.
  for (const [ele, spd] of RUN_PAIRS) {
    const eb = PYRO_SIGNAL_BY_TAG[ele].base;
    const sb = PYRO_SIGNAL_BY_TAG[spd].base;
    const eModel = measured[ele] - res(ele);
    const atModel = measured[ele] > 0.5 * eb && measured[ele] >= 0.75 * eModel && measured[ele] <= 1.15 * eModel;
    if (unitOn(spd) && atModel && measured[spd] < 0.2 * sb) invalid[spd] = `Range: ${spd} ${measured[spd].toFixed(1)} while ${ele} carries ${measured[ele].toFixed(0)} — mismatch with the operating state (pickup)`;
  }
  // A zero-speed switch reporting a stopped shaft while its drive carries the model load is a dead switch; a drive that
  // unloads (chain / belt break) or overloads (choke, jam) with it is the machine pattern (R-KFS-02, R-HMR-01, R-CSL-05).
  for (const [ele, spd] of ZERO_SPEED_PAIRS) {
    const eModel = measured[ele] - res(ele);
    const atModel = measured[ele] > 0.5 * PYRO_SIGNAL_BY_TAG[ele].base && measured[ele] >= 0.75 * eModel && measured[ele] <= 1.15 * eModel;
    if (unitOn(spd) && atModel && states[spd] === "STOPPED WHILE RUNNING")
      invalid[spd] = `Range: ${spd} reports the shaft stopped while ${ele} carries ${measured[ele].toFixed(0)} % FLA at its model load — mismatch with the operating state (switch)`;
  }
  // Instrument status: the flame camera is operator evidence (feed availability only, no classifier); analysers report a status.
  if (states["CAM-BRN-01"] === "FEED LOST") invalid["CAM-BRN-01"] = "Instrument status: camera feed lost";
  for (const a of ANALYSERS) {
    const am = m.analyser[a.id];
    if (!am) continue;
    if (am.status === "FAULT") for (const tg of a.tags) invalid[tg] = `Instrument status: ${a.name.toLowerCase()} FAULT`;
    else if (am.status === "BLOWBACK" && am.blowback > BLOWBACK_STUCK_MIN) for (const tg of a.tags) invalid[tg] = `Instrument status: analyser stuck in blowback (${am.blowback} min > ${BLOWBACK_STUCK_MIN} min)`;
  }

  /* ---------------- variability band: too noisy (Suspect) ---------------- */
  /** 1-min steps of a tag's last NOISY_WINDOW + 1 readings. */
  const stepsOf = (tag: string) => {
    const xs = s.hist[tag].slice(-(NOISY_WINDOW + 1));
    const d: number[] = [];
    for (let i = 1; i < xs.length; i++) d.push(xs[i] - xs[i - 1]);
    return d;
  };
  /** Median absolute deviation of the steps about their median (a ramp or a trend is not noise). */
  const stepSpread = (d: number[]) => {
    const md = median(d);
    return median(d.map((x) => Math.abs(x - md)));
  };
  const normalSpread = (d: PyroSignalDef) => 0.6745 * d.sigma * Math.sqrt(2 * (1 - phiOf(d.tag)));
  const corr = (a: number[], b: number[]) => {
    const n = Math.min(a.length, b.length);
    if (n < 6) return 0;
    const ma = a.reduce((x, y) => x + y, 0) / n;
    const mb = b.reduce((x, y) => x + y, 0) / n;
    let sab = 0;
    let saa = 0;
    let sbb = 0;
    for (let i = 0; i < n; i++) {
      sab += (a[i] - ma) * (b[i] - mb);
      saa += (a[i] - ma) ** 2;
      sbb += (b[i] - mb) ** 2;
    }
    return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0;
  };
  /**
   * The tag's steps move with those of another instrument on the same machine that is itself unsteady (step spread
   * ≥ 2× its normal, Good, not calculated): the process swings, not the sensor.
   */
  const coMoving = (def: PyroSignalDef) => {
    const mine = stepsOf(def.tag);
    return SIGNALS_BY_MACHINE[def.machine].some((o) => {
      if (o.tag === def.tag || o.type !== "analog" || o.origin !== "online" || o.calculated || !o.sigma || s.flags[o.tag] || !judged(o)) return false;
      if ((s.hist[o.tag]?.length ?? 0) < NOISY_WINDOW + 1) return false;
      const theirs = stepsOf(o.tag);
      return stepSpread(theirs) >= 2 * normalSpread(o) && Math.abs(corr(mine, theirs)) >= 0.6;
    });
  };
  for (const def of WIRED) {
    if (!judged(def) || !settled(def.tag, NOISY_WINDOW + 1) || transient || analyserStatus(def.tag)?.status === "BLOWBACK") {
      m.noisy.delete(def.tag);
      continue;
    }
    const h = s.hist[def.tag];
    const mh = s.modelHist[def.tag];
    if (h.length < NOISY_WINDOW + 1 || !def.sigma) continue;
    // Spread of the 1-min steps about their median (a ramp or a trend is not noise), of the reading and of its residual:
    // a noisy model input or a genuinely unsteady process moves one of them, a loose / failing sensor both.
    // Judged on each half of the window, the smaller counting: a loose sensor is erratic throughout, while a trend that
    // starts, bends or decays inside the window (a unit heating after its fan stopped, a pressure bleeding down) leaves
    // one half steady.
    const spread = (xs: number[]) => {
      const d: number[] = [];
      for (let i = 1; i < xs.length; i++) d.push(xs[i] - xs[i - 1]);
      const half = Math.ceil(d.length / 2);
      return Math.min(stepSpread(d.slice(0, half)), stepSpread(d.slice(d.length - half)));
    };
    const meas = h.slice(-(NOISY_WINDOW + 1));
    const mod = mh.slice(-(NOISY_WINDOW + 1));
    const resid = meas.map((v, i) => v - mod[i]);
    // Normal step spread of the instrument noise (AR(1), φ): 0.6745 · σ · √(2(1 − φ)).
    const normal = 0.6745 * def.sigma * Math.sqrt(2 * (1 - phiOf(def.tag)));
    const med = Math.min(spread(meas), spread(resid));
    const was = m.noisy.has(def.tag);
    // A fault pattern building on the tag explains an unsteady process (e.g. FP-03 feed variability).
    if (!was && patterned(def.tag)) continue;
    // Erratic, not a trend (D5 FP-45 "frozen or erratic"): a loose / failing sensor's steps keep changing sign; a trend
    // that starts or bends inside the window (a unit heating after its fan stopped, a pressure bleeding down) does not.
    const st = stepsOf(def.tag).filter((x) => x !== 0);
    let flips = 0;
    for (let i = 1; i < st.length; i++) if (Math.sign(st[i]) !== Math.sign(st[i - 1])) flips++;
    const erratic = st.length >= 6 && flips / (st.length - 1) >= 0.4;
    // A real process swing moves the instruments that see the same process with it (D5 Table 9.4.2 physical
    // neighbours: signals that must move together); a loose or failing sensor moves alone.
    if (med > (was ? NOISY_RELEASE : NOISY_FACTOR) * normal && erratic && !coMoving(def)) {
      m.noisy.add(def.tag);
      dq2[def.tag] = `Variability band: too noisy — step spread ${fmtSpread(med)} ${def.unit} over ${NOISY_WINDOW} samples, ${(med / normal).toFixed(1)}× normal (loose / failing sensor)`;
    } else m.noisy.delete(def.tag);
  }

  /* ---------------- rate of change (Suspect) ---------------- */
  for (const def of WIRED) {
    const lim = maxStepPerMin(def);
    const h = s.hist[def.tag];
    if (lim === null || h.length < 2) continue;
    const sticky = m.rate[def.tag];
    if (!judged(def) || !settled(def.tag) || analyserStatus(def.tag)?.status === "BLOWBACK" || invalid[def.tag]) {
      delete m.rate[def.tag];
      continue;
    }
    const step = h[h.length - 1] - h[h.length - 2];
    const dres = resAt(def.tag, 0) - resAt(def.tag, 1);
    // A speed that steps with its drive current (trip, chain break) is the plant, not the pickup.
    const ele = SPEED_CURRENT[def.tag];
    const withDrive = ele ? Math.abs((s.hist[ele].at(-1) ?? 0) - (s.hist[ele].at(-2) ?? 0)) > 0.2 * PYRO_SIGNAL_BY_TAG[ele].base : false;
    // Drives, speeds and flows can fall to rest at once (trip, jam, chain break, feed stop): only a jump away from rest is impossible.
    const cls = sensorClassOf(def);
    const toRest = (cls === "speed" || cls === "mcc" || cls === "sfm") && Math.abs(h[h.length - 1]) < Math.abs(h[h.length - 2]);
    // A step on a tag whose condition rule is already building or confirmed (a tripped blower's header collapsing) is the
    // plant moving the way that pattern says, not an impossible instrument jump.
    if (Math.abs(step) > lim && Math.abs(dres) > 0.75 * Math.abs(step) && !withDrive && !toRest && !patterned(def.tag)) m.rate[def.tag] = { pre: resAt(def.tag, 1), jump: dres };
    else if (sticky && Math.abs(resAt(def.tag, 0) - sticky.pre) <= 0.5 * Math.abs(sticky.jump)) delete m.rate[def.tag];
    const r = m.rate[def.tag];
    if (r) dq2[def.tag] ??= `Rate of change: ${r.jump > 0 ? "+" : "−"}${Math.abs(r.jump).toFixed(def.decimals)} ${def.unit} in 1 min (class limit ${+lim.toPrecision(3)} ${def.unit}/min), unexplained by drivers`;
  }

  /* ---------------- physical neighbours (Suspect) ---------------- */
  for (const nb of NEIGHBOUR_CHECKS) {
    const all = [nb.subject, ...nb.witnesses];
    const defs = all.map((tg) => PYRO_SIGNAL_BY_TAG[tg]);
    const comparable = defs.every((d) => d && judged(d) && settled(d.tag, SETTLE_MIN)) && !transient;
    const zs = meanZ(nb.subject, 10);
    const discord = comparable && Math.abs(zs) > 5 && nb.witnesses.every((w) => Math.abs(meanZ(w, 10)) < 2.5) && !all.some(patterned);
    const n = (m.neighbour[nb.subject] = discord ? (m.neighbour[nb.subject] ?? 0) + 1 : Math.max(0, (m.neighbour[nb.subject] ?? 0) - 2));
    if (n >= NEIGHBOUR_MIN)
      dq2[nb.subject] ??= `Physical neighbours: ${nb.label} (${nb.subject} ${fmtZ(zs)} vs ${nb.witnesses.map((w) => `${w} ${fmtZ(meanZ(w, 10))}`).join(", ")}, ${n} min)`;
  }
  // Witness votes; once a meter is out-voted it stays suspect until it agrees again (hysteresis).
  // The witnesses' own scatter grows with the rate, so their agreement window scales with the design feed / coal
  // (calibrated at 205 t/h and 15.8 t/h); a witness a fault pattern is building on (elevator slip, torque) does not vote.
  // Kiln feed runs through two parallel solid-flow meters (A, B) of half the feed each: each is voted as twice its reading.
  const fk = Math.max(1, (2 * (PYRO_SIGNAL_BY_TAG["FLO-KFS-01"]?.base ?? 102.5)) / 205);
  const ck = Math.max(1, (PYRO_SIGNAL_BY_TAG["FLO-BRN-01"]?.base ?? 15.8) / 15.8);
  const coalSticky = s.flags["FLO-BRN-01"]?.rule === "R-DQ-02";
  const feedWitnessFree = !(patterned("ELE-KFS-01") || patterned("ELE-KLN-01"));
  const coalWitnessOk = coalSticky || !(patterned("PRS-BRN-04") || patterned("TMP-KLN-14"));
  // Two independent estimates agree with each other and each disagrees with the meter on the same side: a witness that
  // moves on its own (elevator choke, kiln drag, dirty pyrometer) leaves the other on the meter, and the vote abstains.
  const outVoted = (a: number, b: number, meter: number, agree: number, apart: number) =>
    Math.abs(a - b) < agree && Math.sign(a - meter) === Math.sign(b - meter) && Math.min(Math.abs(a - meter), Math.abs(b - meter)) > apart;
  /** Out-voted for VOTE_MIN minutes (leaky count) before a new flag; a flagged meter stays out-voted while it disagrees. */
  const voted = (meter: string, now: boolean, sticky: boolean) => {
    const n = (m.vote[meter] = now ? Math.min(VOTE_MIN, (m.vote[meter] ?? 0) + 1) : Math.max(0, (m.vote[meter] ?? 0) - 2));
    return sticky ? now : n >= VOTE_MIN;
  };
  const feedAvg = (feedElev + feedTorque) / 2;
  for (const [tag, name] of [["FLO-KFS-01", "SFM A"], ["FLO-KFS-02", "SFM B"]] as const) {
    const meter = 2 * measured[tag];
    const sticky = s.flags[tag]?.rule === "R-DQ-02";
    const now = (sticky || feedWitnessFree) && (sticky ? Math.abs(feedElev - feedTorque) < 20 * fk && Math.abs(meter - feedAvg) > 10 : outVoted(feedElev, feedTorque, meter, 12 * fk, 10 * fk));
    if (voted(tag, now, sticky)) {
      dq2[tag] = `Physical neighbours: witness vote — elevator ${feedElev.toFixed(0)} t/h, kiln torque ${feedTorque.toFixed(0)} t/h vs ${name} ${measured[tag].toFixed(0)} t/h × 2 (half the kiln feed)`;
    }
  }
  const coalAvg = (coalLine + coalBz) / 2;
  const coalNow = coalWitnessOk && (coalSticky ? Math.abs(coalLine - coalBz) < 0.9 * ck && Math.abs(coalMeter - coalAvg) > 0.5 : outVoted(coalLine, coalBz, coalMeter, 0.4 * ck, 0.8 * ck));
  if (voted("FLO-BRN-01", coalNow, coalSticky)) {
    dq2["FLO-BRN-01"] = `Physical neighbours: witness vote — line pressure ${coalLine.toFixed(2)} t/h, burning zone ${coalBz.toFixed(2)} t/h vs meter ${coalMeter.toFixed(2)} t/h`;
  }
  // Readings on a stopped unit: vibration, current and fan / pump header pressures read ≈ 0 (D5 Tables 5.x.6, 12.2).
  for (const def of WIRED) {
    const stoppedFor = m.run[def.tag] && !m.run[def.tag].on ? t - m.run[def.tag].since : 0;
    const unitStopped = !unitOn(def.tag) || (!q.equipment && !running[def.machine]);
    const v = measured[def.tag];
    let bad: string | null = null;
    if (unitStopped && stoppedFor >= STOP_SETTLE_MIN && TAG_UNIT[def.tag]) {
      if (def.tag.startsWith("VIB") && v > 0.5) bad = `vibration ${fmtV(def, v)} while the unit is stopped (cable / ground noise)`;
      else if (def.tag.startsWith("ELE") && v > 0.05 * Math.abs(def.base)) bad = `current ${fmtV(def, v)} while the unit is stopped`;
      else if (ZERO_AT_STOP_PRESSURES.has(def.tag) && Math.abs(v) > Math.max(0.1 * Math.abs(def.base), 3 * def.sigma)) bad = `zero offset at stop: ${fmtV(def, v)} with the fan / pump stopped`;
    }
    const k = (m.stopRead[def.tag] = bad ? (m.stopRead[def.tag] ?? 0) + 1 : 0);
    if (bad && k >= 3) dq2[def.tag] ??= `Physical neighbours: ${bad}`;
  }

  /* ---------------- vibration vs temperature (flag only, FP-46) ---------------- */
  for (const [vib, tmp] of VIB_TMP_PAIRS) {
    const dv = PYRO_SIGNAL_BY_TAG[vib];
    const comparable = judged(dv) && settled(vib, SETTLE_MIN) && !transient && !s.flags[vib] && !s.flags[tmp];
    const rt = comparable ? ratioMean(vib, 10) : 1;
    const dt = comparable ? meanZ(tmp, 10) * sigma(tmp) : 0;
    // DE and NDE (or both coupling sides) rising together is a machine pattern (imbalance, misalignment), not one sensor.
    const unit = TAG_UNIT[vib];
    const together = VIB_TMP_PAIRS.some(([o]) => o !== vib && unit && TAG_UNIT[o] === unit && ratioMean(o, 10) > 1.3);
    const hit = comparable && rt > 1.4 && dt < 0.5 && !together;
    const n = (m.vibTmp[vib] = hit ? (m.vibTmp[vib] ?? 0) + 1 : 0);
    if (n >= VIB_TMP_MIN) {
      const note = `Flag only (FP-46): vibration ×${rt.toFixed(2)} model, bearing ${tmp} flat (${dt >= 0 ? "+" : "−"}${Math.abs(dt).toFixed(1)} K) — verify the sensor (mounting, cable) first`;
      if (n === VIB_TMP_MIN) q.notify(vib, "Alert", `${vib} vibration–temperature disagreement (flag only)`, note);
      m.notes[vib] = note;
    }
  }

  /* ---------------- manual comparison ---------------- */
  // Scanner vs handheld at the matched position (emissivity-matched, steady running kiln): a gap makes the shell map suspect.
  const hand = s.manual["MAN-KLN-01"];
  const handGap = hand?.scan !== undefined && hand.comparable ? hand.value - emissivityMatched(hand.scan) : 0;
  const coverage = q.coverage;
  const scannerSuspect = coverage < SCANNER_COVERAGE_TARGET;
  const scanTop = PYRO_SIGNAL_BY_TAG["STS-KLN-08"]?.range?.[1] ?? 500;
  const saturated = measured["STS-KLN-08"] >= scanTop - 1e-6;
  const scannerNote = scannerSuspect
    ? `Manual comparison: scanner coverage ${coverage.toFixed(1)} % < ${SCANNER_COVERAGE_TARGET} % target — map under-reads`
    : Math.abs(handGap) > HANDHELD_GAP_K
      ? `Manual comparison: handheld ${hand!.value.toFixed(0)} °C disagrees with the scanner by ${handGap > 0 ? "+" : "−"}${Math.abs(handGap).toFixed(0)} K at the matched position (> ${HANDHELD_GAP_K} K)`
      : saturated
        ? `Range: shell map saturated at the scanner range end (${scanTop} °C)`
        : null;
  // Oil trend vs laboratory: wear iron high while the oil instruments stay at model (flag only).
  const lab = s.manual["LAB-KLN-01"];
  if (lab && lab.value > 60 && (s.hist["TMP-KLN-15"]?.length ?? 0) >= 240 && Math.abs(meanZ("TMP-KLN-15", 240)) < 1 && Math.abs(meanZ("PRS-KLN-05", 240)) < 1)
    m.notes["LAB-KLN-01"] = `Flag only: laboratory ${lab.value.toFixed(0)} ppm Fe while gearbox oil temperature and filter ΔP stay at model — verify the sample and the oil instruments`;

  /* ---------------- flags with hysteresis ---------------- */
  const flagNow: Record<string, ["R-DQ-01" | "R-DQ-02", string]> = {};
  for (const [tag, note] of Object.entries(invalid)) flagNow[tag] = ["R-DQ-01", note];
  for (const [tag, note] of Object.entries(dq2)) if (!flagNow[tag]) flagNow[tag] = ["R-DQ-02", note];
  for (const [tag, [rule, note]] of Object.entries(flagNow)) {
    const f = s.flags[tag];
    if (!f) {
      s.flags[tag] = { rule, note, since: t, clean: 0 };
      q.notify(tag, "Alert", `${tag} marked ${rule === "R-DQ-01" ? "invalid" : "suspect"}`, note);
    } else {
      f.note = note;
      f.rule = rule;
      f.clean = 0;
    }
  }
  for (const tag of Object.keys(s.flags)) {
    if (flagNow[tag]) continue;
    s.flags[tag].clean += 1;
    if (s.flags[tag].clean >= 4) {
      q.notify(tag, "Normal", `${tag} quality restored`, "Four clean samples");
      delete s.flags[tag];
    }
  }

  const screen: QualityScreen = { invalid, scannerSuspect, scannerNote, notes: m.notes };
  tallyShift(t, s, m, screen);
  return screen;
}

/** Per-tag quality from the flags; calculated values inherit a suspect input. */
export function signalQuality(s: LineState, { invalid, scannerNote }: QualityScreen): (tag: string) => Quality {
  return (tag: string): Quality => {
    // Calculated register points (Rev. 02 CALC.) inherit a suspect input: ΔP from its inlet / outlet pressures, the bin
    // weight from its three load cells.
    const inputs = CALC_INPUTS[tag];
    if (inputs && inputs.some((tg) => s.flags[tg])) return inputs.some((tg) => s.flags[tg]?.rule === "R-DQ-01" && invalid[tg]) ? "Invalid" : "Suspect";
    if (tag === "STS-KLN-08" && scannerNote && !s.flags[tag]) return "Suspect";
    const f = s.flags[tag];
    if (!f) return "Good";
    return f.rule === "R-DQ-01" && invalid[tag] ? "Invalid" : "Suspect";
  };
}

/** Quality note shown with a signal: the flag note, why a derived value is suspect, or a flag-only / held note. */
export function qualityNoteOf(s: LineState, screen: QualityScreen, def: PyroSignalDef, q: Quality): string | null {
  if (def.tag === "STS-KLN-08" && screen.scannerNote && !s.flags[def.tag]) return screen.scannerNote;
  if (def.calculated && q !== "Good") return `Derived from a suspect input (${(CALC_INPUTS[def.tag] ?? []).filter((tg) => s.flags[tg]).join(", ")})`;
  return s.flags[def.tag]?.note ?? screen.notes[def.tag] ?? null;
}

/* ------------------------------------------------------------------ */
/* Per-shift validity (D5 Table 9.3 sensor health, Table 12.1 shift)   */
/* ------------------------------------------------------------------ */

function shiftLabel(index: number): string {
  return index % 2 === 0 ? "Day shift 06:00–18:00" : "Night shift 18:00–06:00";
}

function tallyShift(t: number, s: LineState, m: HealthMem, screen: QualityScreen): void {
  if (t < 0) return;
  const index = Math.floor(t / SHIFT_MIN);
  if (!m.shift || Math.floor(m.shift.start / SHIFT_MIN) !== index) {
    m.prevShift = m.shift;
    m.shift = { start: index * SHIFT_MIN, label: shiftLabel(index), minutes: 0, tags: {} };
  }
  const sh = m.shift;
  sh.minutes += 1;
  const quality = signalQuality(s, screen);
  for (const def of SERIES_ONLINE) {
    const qq = quality(def.tag);
    const flagOnly = qq === "Good" && screen.notes[def.tag]?.startsWith("Flag only");
    if (qq === "Good" && !flagOnly) continue;
    const e = (sh.tags[def.tag] ??= { suspect: 0, invalid: 0, flagOnly: 0, first: t, last: t, note: "" });
    if (qq === "Invalid") e.invalid += 1;
    else if (qq === "Suspect") e.suspect += 1;
    else e.flagOnly += 1;
    e.last = t;
    e.note = s.flags[def.tag]?.note ?? screen.notes[def.tag] ?? e.note;
  }
}

/** This shift's (and the previous shift's) validity tally for a set of tags. */
export function shiftValidityOf(s: LineState, tags: string[]): { current: ShiftValidity | null; previous: ShiftValidity | null } {
  const m = MEM.get(s);
  const pick = (sh: ShiftValidity | null | undefined): ShiftValidity | null =>
    sh ? { start: sh.start, label: sh.label, minutes: sh.minutes, tags: Object.fromEntries(tags.filter((tg) => sh.tags[tg]).map((tg) => [tg, { ...sh.tags[tg] }])) } : null;
  return { current: pick(m?.shift), previous: pick(m?.prevShift) };
}

/* ------------------------------------------------------------------ */
/* Findings                                                            */
/* ------------------------------------------------------------------ */

/** Data quality and anomaly, per machine. Runs after every machine's rules. */
export function evalQualityRules(c: EvalContext): void {
  const { s, good, z, hits, H } = c;
  for (const id of MACHINE_IDS) {
    const mine = (tag: string) => PYRO_SIGNAL_BY_TAG[tag]?.machine === id;
    const dq1 = Object.entries(s.flags).filter(([tg, f]) => f.rule === "R-DQ-01" && mine(tg));
    if (dq1.length) H(id, "R-DQ-01", { severity: "Alert", evidence: dq1.map(([tg, f]) => `${tg}: ${f.note}`).join(" · "), tags: dq1.map(([tg]) => tg), stateRule: true });
    const dq2f = Object.entries(s.flags).filter(([tg, f]) => f.rule === "R-DQ-02" && mine(tg));
    if (dq2f.length) H(id, "R-DQ-02", { severity: "Alert", evidence: dq2f.map(([tg, f]) => `${tg}: ${f.note}`).join(" · "), tags: dq2f.map(([tg]) => tg) });
    const covered = new Set<string>(WATCHED);
    for (const mid of MACHINE_IDS) for (const h of Object.values(hits[mid])) for (const tg of h.tags) covered.add(tg);
    // Comparable state only (D5 Table 9.4.2 operating mode): a running unit at a steady operating point; calculated values
    // inherit their inputs' deviation, which shows on the inputs themselves.
    const far = c.transient
      ? []
      : SIGNALS_BY_MACHINE[id].filter((d) => d.type === "analog" && d.origin !== "manual" && !d.calculated && c.tagRunning(d.tag) && good(d.tag) && !covered.has(d.tag) && Math.abs(z(d.tag)) > 10).map((d) => d.tag);
    if (far.length) H(id, "R-ANM-01", { severity: "Alert", evidence: `No known pattern: ${far.map((tg) => `${tg} ${fmtZ(z(tg))}`).join(", ")}`, tags: far });
  }
}
