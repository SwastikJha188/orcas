/**
 * Pyro line live demonstration engine — FSL-01 → CSL-01 (D4-OSW-PE-PYR Rev. 02).
 *
 * One engine runs the whole line, one sample per simulated minute, because
 * the machines are coupled through the process: kiln feed (KFS-01), kiln coal
 * (BRN-01), kiln speed, ID-fan draft (PHC-01), cooler air (CLR-01) and the
 * ambient move every machine downstream (D4 §8.1 "Process influence").
 *
 * The analysis chain is the kiln engine's (D4 §8.2):
 *
 *   data quality → operating-state reference model → sensor validation →
 *   rules → persistence (2–3 samples, 1 critical) / hysteresis (4 clean) →
 *   per-machine diagnosis, sub-assembly / machine health, time to limit.
 *
 * The true plant is simulated from its operating drivers; sensors add noise
 * and scenario faults. The reference model is computed from the *measured*
 * drivers, with witness estimates substituted once a meter is out-voted, so a
 * bad instrument shows up as disagreement rather than as a machine fault.
 *
 * Each machine has its own scenario, autopilot story and hold profile; a
 * driver effect from any machine's scenario acts on the whole line. Frames
 * are emitted per machine in the kiln `SimFrame` shape, stamped with that
 * machine's `defs`, so every machine page reads them unchanged.
 *
 * Deterministic for a given seed.
 */
import {
  HISTORY_LEN,
  formatClock,
  formatDuration,
  type HealthCell,
  type LiveSignal,
  type OperatorAction,
  type RuleState,
  type RuleStatus,
  type SimEvent,
  type SimFrame,
  type StoryPhase,
  type StoryProfile,
} from "../kiln-sim/engine";
import { describeLimit, evaluateLimit, resolveLimit, stateSeverity, type Severity, type SignalDef } from "../kiln-sim/signals";
import { pyroLimitContext } from "./limits";
import { PYRO_MACHINES, PYRO_SIGNALS, PYRO_SIGNAL_BY_TAG, PYRO_SUBASSEMBLIES, PYRO_SYSTEMS, type PyroSignalDef } from "./signals";
import { PYRO_RULES_BY_MACHINE, pyroRule } from "./rules";
import { PYRO_SCENARIOS, effectLevel, pyroScenario, registerPyroScenario, signalFaultScenario, type PyroScenario, type SignalFaultSpec } from "./scenarios";
import { isEquipmentEffect, type PyroSignalEffect } from "./scenarios/common";
import { EQUIPMENT_IDS, EQUIPMENT_LABEL, EQUIPMENT_MACHINE, defaultEquipment, machineEquipment, machineRunning, observedEquipment, unitRunning, type EquipmentId, type EquipmentState, type EquipmentStates } from "./equipment";
import { PYRO_DEFS } from "./defs";
import type { ManualRecord } from "../plant-defs";
import { CLR_BASE, HANDHELD_EMISSIVITY, PROFILE_N, SCANNER_EMISSIVITY, SIGNED, clamp, emissivityMatched, median, slope } from "./shared";
import { adoptLineMemory, applyAnalyserCycle, evaluateRules, lineMemory, qualityNoteOf, screenQuality, shiftValidityOf, signalQuality, type HealthMem, type Hit, type Lead } from "./eval";
import { instrumentReading } from "./sensor-meta";
import {
  SHELL_ALERT,
  SHELL_COVERAGE_TARGET,
  SHELL_DANGER,
  SHELL_NA,
  buildShellMap,
  shellAreaAbove,
  shellCell,
  shellColdBand,
  shellSpanResidual,
  shellWarmBand,
  type HandheldPoint,
  type ShellFindingMaps,
  type ShellThermal,
} from "../kiln-sim/shell-map";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const EPOCH_MIN = 6 * 60;
const MACHINE_IDS = PYRO_MACHINES.map((m) => m.id);
const ANALOG = PYRO_SIGNALS.filter((s) => s.type === "analog");
const SIGNALS_BY_MACHINE: Record<string, PyroSignalDef[]> = Object.fromEntries(MACHINE_IDS.map((id) => [id, PYRO_SIGNALS.filter((s) => s.machine === id)]));
/** Signals with a per-minute history: manual records stay dated records (D4 Table 6.4), never a live series. */
const SERIES_SIGNALS = PYRO_SIGNALS.filter((s) => s.origin !== "manual");

/**
 * Design operating point (D5 §3.1, Tables 5.2.1, 5.4.1, 5.5.1 demo values): kiln feed 330 t/h (310–350),
 * kiln coal 10.5 t/h (9–12), kiln speed 3.6 rpm (3.0–4.5), ID fan 890 rpm, ambient 30 °C.
 */
const F0 = 330;
const C0 = 10.5;
const N0 = 3.6;
const S0 = 890;
const TA0 = 30;
/** Burning-zone temperature at the design point (°C, OSW-PE-SNL-PYR-01 Rev. 01 nominal 1,250–1,350). */
const BZ0 = 1300;
/** Solid-flow meter tap pressure per unit of the meter's feed share about the design rate (mbar). */
const SFM_P_GAIN = 1.5;

/** Kiln shell tyres at 11, 39, 60 m (profile 0 … 74 m at 0.5 m). Same geometry as the kiln-seal demo so the Thermal views apply. */
const TYRE_M = [11, 39, 60];
const MAN_ZONE_M = 52;
/** Scanner map interval and how many maps are kept (10 h: covers the last 8 h shift). */
const SCAN_EVERY = 10;
const SCAN_KEEP = 61;
/** Refractory hot spot of the demo scenario: centre (m) and axial spread σ (m), D5 Fig. 5.4.6 (≈ 4.6 m² above alert at 495 °C). */
const HOT_SPOT_M = MAN_ZONE_M;
const HOT_SPOT_SIGMA = 1.93;
/**
 * Handheld round (MAN-KLN-01) at the same metre / angle as scanner cells (D5 Table 5.4.5b): transition, burning zone
 * (the 52 m point at the hot-spot angle) and outlet. Demo cadence every 4 h (D5: weekly comparison).
 */
const HANDHELD_POINTS = [
  { m: 25, angle: 30, station: "Station 1–2" },
  { m: 33, angle: 200, station: "Station 1–2" },
  { m: 52, angle: 120, station: "Station 2–3" },
  { m: 70, angle: 300, station: "Outlet" },
] as const;
const HANDHELD_EVERY = 240;
/** Shell findings whose maps are kept around the moment they became active (D5 Table 5.4.7a storage / 9.5 outputs). */
const THERMAL_FINDINGS = ["SW-KLN-04", "R-KLN-19", "R-KLN-14", "R-KLN-17", "SW-KLN-03"];
const FINDING_MAPS_KEEP = 8;
/** Operating-point window: a set-point change inside it is a transient (D4 §8.2 comparable state). */
const TRANSIENT_WIN = 30;
/** ID-fan inlet damper position at the design operating point (%). */
const DAMPER0 = 82;

/** Support-roller bearing offsets above ambient (K), per tag. */
const ROLLER_OFFSET: Record<string, number> = {
  "TMP-KLN-01": 22.0, "TMP-KLN-02": 23.4, "TMP-KLN-03": 21.6, "TMP-KLN-04": 22.8,
  "TMP-KLN-05": 25.6, "TMP-KLN-06": 26.1, "TMP-KLN-07": 25.2, "TMP-KLN-08": 25.9,
  "TMP-KLN-09": 23.0, "TMP-KLN-10": 22.4, "TMP-KLN-11": 23.8, "TMP-KLN-12": 23.1,
};
const ROLLER_TAGS = Object.keys(ROLLER_OFFSET);
const CLR_FAN_I = [215, 196, 172, 148, 126, 104];
const CLR_FAN_T = [26, 27, 25, 24, 23, 22];
const CLR_FAN_V = [2.1, 2.4, 1.9];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type Rng = (() => number) & { state: () => number };

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const next = (() => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;
  next.state = () => a;
  return next;
}

const sevRank: Record<Severity, number> = { Normal: 0, Alert: 1, Critical: 2 };
const maxSev = (a: Severity, b: Severity): Severity => (sevRank[a] >= sevRank[b] ? a : b);
const asKiln = (d: PyroSignalDef) => d as unknown as SignalDef;

function groupThousands(fixed: string): string {
  const neg = fixed.startsWith("-");
  const body = neg ? fixed.slice(1) : fixed;
  const [int, frac] = body.split(".");
  const grouped = int.length > 3 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : int;
  return `${neg ? "-" : ""}${grouped}${frac !== undefined ? `.${frac}` : ""}`;
}

function displayValue(def: PyroSignalDef, value: number | null, state: string | null): string {
  if (def.type === "state") return state ?? "—";
  if (value === null || !Number.isFinite(value)) return "—";
  const s = groupThousands(value.toFixed(def.decimals));
  return SIGNED.has(def.tag) && value > 0 ? `+${s}` : s;
}

/**
 * Healthy shell profile along the kiln (°C): cooler under the tyres, burning-zone hump near 52–55 m.
 * D5 Fig. 5.4.5: healthy maximum 326 °C; Fig. 5.4.7: model 321 °C at the 52 m hot spot.
 */
function shellBaseline(xm: number): number {
  const rise = 210 + 100 / (1 + Math.exp(-(xm - 34) / 6.5));
  const burn = 20 * Math.exp(-Math.pow((xm - 54) / 7, 2));
  const tyres = TYRE_M.reduce((acc, t) => acc - 28 * Math.exp(-Math.pow((xm - t) / 1.3, 2)), 0);
  const outletDrop = xm > 66 ? -(xm - 66) * 7 : 0;
  return rise + burn + tyres + outletDrop;
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

interface RuleMemory {
  persistence: number;
  clean: number;
  status: RuleStatus;
  since: number | null;
  severity: Severity;
  evidence: string;
  tags: string[];
  subs: string[] | null;
  lead: Lead | null;
  stateRule: boolean;
}

/** Rule categories that never lower health or condition. */
const NOT_SCORED = new Set<string>(["Data quality", "Anomaly", "Service life"]);

interface Fx {
  scMin: number;
  intensity: number;
  mitigated: boolean;
  repairStart: number | null;
  repairFrom: number;
  repairDur: number;
  hold: number | null;
}

interface Story {
  autopilot: boolean;
  phase: StoryPhase;
  pace: number;
  nextFaultAt: number;
  rotation: number;
  detectedAt: number | null;
  mitigatedAt: number | null;
  settledAt: number;
  acked: boolean;
  label: string;
  profile: StoryProfile;
  holdUntil: number;
}

export interface MachineState {
  id: string;
  scenarioId: string;
  scenarioStart: number;
  fx: Fx;
  story: Story;
  bg: { scenarioId: string; start: number; end: number } | null;
  bgNextAt: number;
  rules: Record<string, RuleMemory>;
  smooth: Record<string, number>;
  prevStates: Record<string, string>;
  limits: Record<string, { shown: Severity; next: Severity; n: number; /** Side the shown limit was crossed on. */ dir?: "high" | "low" }>;
  events: SimEvent[];
  healthHist: { overall: number[] } & Record<string, number[]>;
  frame: SimFrame | null;
}

export interface LineState {
  t: number;
  rand: Rng;
  ar: Record<string, number>;
  holds: Record<string, number>;
  hist: Record<string, number[]>;
  modelHist: Record<string, number[]>;
  /** Per-sample data validity (0 Good, 1 Suspect, 2 Invalid), aligned with `hist`. */
  qualHist: Record<string, number[]>;
  times: number[];
  /** Commanded operating point per minute (feed / coal set-points, kiln speed, ID-fan speed), last TRANSIENT_WIN. */
  opHist: Array<{ feed: number; coal: number; speed: number; fan: number }>;
  /** Shell scanner maps, one per SCAN_EVERY minutes, oldest first. */
  shellScans: Array<{ t: number; profile: number[]; coverage: number; valid: boolean; local: number[]; model: number[] }>;
  /** Thermal-map processing state (D5 Table 9.5): last-good cell values, area history, maps kept around findings. */
  thermal: ThermalState;
  flags: Record<string, { rule: "R-DQ-01" | "R-DQ-02"; note: string; since: number; clean: number }>;
  /**
   * Manual records: last value and when it was taken. Handheld scans also keep
   * the scanner value at the same zone and time, and whether the kiln was
   * running at a steady operating point then (SW-KLN-03 comparability).
   */
  manual: Record<
    string,
    {
      value: number;
      model: number;
      at: number;
      scan?: number;
      comparable?: boolean;
      /** Handheld round (MAN-KLN-01): every point against the scanner cell at the same metre and angle. */
      points?: HandheldPoint[];
      /** Laboratory oil result (LAB-KLN-01): viscosity at 40 °C (cSt), water (ppm) and the previous sample's Fe (ppm). */
      visc?: number;
      water?: number;
      prev?: { value: number; at: number };
    }
  >;
  /** Dated manual record log (D4 Table 6.4), newest first. */
  records: ManualRecord[];
  /** Minute each stale source stopped updating. */
  staleSince: Record<string, number>;
  /** Process state: inventories, transport lags, cooler bed, equipment run states and interlocks. */
  plant: PlantState;
  machines: Record<string, MachineState>;
  /** Live-demo knobs (event generator, sensor noise, health response, hold rotation). */
  sim: LineSimSettings;
  /** Fault and instrument events layered on top of each machine's own scenario. */
  injections: Injection[];
  /** Minute the event generator next considers an event. */
  nextEventAt: number;
  /** Live demo: no new fault (held or generated) starts anywhere on the line before this minute. */
  calmUntil?: number;
  /** Version of the database simulation settings last applied (src/lib/fleet-boot syncFleetConfig). */
  simVersion?: number;
  injSeq: number;
}

/**
 * Live-demo knobs of the line, set from the Simulation page. Every alert the
 * generator causes still comes from the rules: an event only moves signals
 * (a fault on the plant, or a wrong reading), the rules judge them.
 */
export interface LineSimSettings {
  /** Event generator on. */
  events: boolean;
  /** Mean simulated minutes between generated events (1 min = 1 s at 1×). */
  eventEvery: number;
  /** Minutes an event takes to drive its signals to the alerting point. */
  eventLead: number;
  /** Minutes an event holds there before it eases off and its rules clear. */
  eventLife: number;
  /** Most generated events running at once. */
  maxEvents: number;
  /** Share of generated events that are instrument faults; the rest are equipment / process faults. */
  sensorShare: number;
  /** Severity of generated events: 1 = the calibrated alerting point. */
  intensity: number;
  /** Measurement noise × each signal's D5 sigma. */
  noise: number;
  /** Health response to normal sensor scatter (0: flat while every signal is within 3σ). */
  healthDrift: number;
  /** Minutes a held fault stays before the crew repairs it and the next develops (0: hold until changed). */
  holdMinutes: number;
  /** Machines the generator may pick (missing = allowed). */
  machines: Record<string, boolean>;
  /** Least minutes between two new faults anywhere on the line (± 20 %), so the picture changes calmly (0: off). */
  changeGap?: number;
  /** Version of the live pacing these settings follow; a saved line on an older one takes the current pacing. */
  pacing?: number;
  /** Scenario minutes a held fault keeps worsening per minute after reaching its hold point (0: holds still). */
  holdCreep?: number;
  /** Calm minutes before a shown limit alarm clears (live demo; the validation suite uses LIMIT_CLEAR_N). */
  limitClear?: number;
}

/** One event layered on a machine: a library scenario's effects, time-compressed to `target`. */
export interface Injection {
  id: number;
  machine: string;
  scenarioId: string;
  name: string;
  kind: "sensor" | "fault" | "trip" | "custom";
  start: number;
  /** Minute the event starts easing off. */
  end: number;
  /** Scenario minute it holds at (Infinity: runs on in real time). */
  target: number;
  /** Scenario minutes per simulated minute while developing. */
  pace: number;
  scale: number;
  /** Share of `scale` added every 60 minutes once it reaches its alerting point (0 / absent: stays the same). */
  grow?: number;
  auto: boolean;
}

/** Off: the validation suite and fresh lines run exactly as calibrated. */
export const QUIET_SIM_SETTINGS: LineSimSettings = {
  events: false,
  eventEvery: 5,
  eventLead: 4,
  eventLife: 14,
  maxEvents: 6,
  sensorShare: 0.4,
  intensity: 1,
  noise: 1,
  healthDrift: 0,
  holdMinutes: 0,
  machines: {},
};

/**
 * The live demonstration, calm enough to read (1 simulated minute = 1 real second): one generated fault at a
 * time, a new one about every 12 real minutes (± 20 %), each developing over a minute and staying ~10 minutes
 * a little past its alerting point (so it does not blink on and off); a held fault keeps slowly worsening for
 * about 30 real minutes (so the prognosis sees it heading for its limit) before it is repaired and the next one
 * develops; any two new faults on the line start at least ~10 real minutes apart.
 */
export const LIVE_SIM_SETTINGS: LineSimSettings = {
  ...QUIET_SIM_SETTINGS,
  events: true,
  eventEvery: 720,
  eventLead: 60,
  eventLife: 600,
  maxEvents: 1,
  intensity: 1.25,
  healthDrift: 1,
  holdMinutes: 1800,
  changeGap: 600,
  pacing: 2,
  holdCreep: 0.05,
  limitClear: 300,
};

/** Minutes an event takes to fade out after `end`. */
const EVENT_FADE = 6;

function freshFx(): Fx {
  return { scMin: 0, intensity: 1, mitigated: false, repairStart: null, repairFrom: 1, repairDur: 30, hold: null };
}

function emptyRule(): RuleMemory {
  return { persistence: 0, clean: 0, status: "QUIET", since: null, severity: "Normal", evidence: "", tags: [], subs: null, lead: null, stateRule: false };
}

function blankMachine(id: string): MachineState {
  const systems = PYRO_SYSTEMS.filter((s) => s.machine === id);
  return {
    id,
    scenarioId: "healthy",
    scenarioStart: -HISTORY_LEN,
    fx: freshFx(),
    story: { autopilot: false, phase: "healthy", pace: 1, nextFaultAt: 0, rotation: 0, detectedAt: null, mitigatedAt: null, settledAt: 0, acked: false, label: "", profile: "story", holdUntil: 0 },
    bg: null,
    bgNextAt: 0,
    rules: Object.fromEntries((PYRO_RULES_BY_MACHINE[id] ?? []).map((r) => [r.id, emptyRule()])),
    smooth: {},
    prevStates: {},
    limits: {},
    events: [],
    healthHist: Object.assign({ overall: [] as number[] }, Object.fromEntries(systems.map((s) => [s.id, [] as number[]]))),
    frame: null,
  };
}

/** Thermal-map processing state kept by the line (D5 Table 9.5 gridding and storage). */
export interface ThermalState {
  /** Last good reading of every map cell (`i · 72 + k`, °C) and the minute it was seen (−1: never). */
  lastGood: Float32Array;
  lastGoodAt: Int32Array;
  /** Area at or above the alert limit, one value per minute (last 61 min). */
  areaHist: number[];
  /** Maps kept around shell findings, newest first. */
  findingMaps: ShellFindingMaps[];
}

function blankThermal(): ThermalState {
  const n = PROFILE_N * SHELL_NA;
  return { lastGood: new Float32Array(n), lastGoodAt: new Int32Array(n).fill(-1), areaHist: [], findingMaps: [] };
}

function blankLine(rand: Rng): LineState {
  return {
    t: -HISTORY_LEN,
    rand,
    ar: {},
    holds: {},
    hist: Object.fromEntries(SERIES_SIGNALS.map((d) => [d.tag, [] as number[]])),
    modelHist: Object.fromEntries(SERIES_SIGNALS.map((d) => [d.tag, [] as number[]])),
    qualHist: Object.fromEntries(SERIES_SIGNALS.map((d) => [d.tag, [] as number[]])),
    times: [],
    opHist: [],
    shellScans: [],
    thermal: blankThermal(),
    flags: {},
    manual: {},
    records: [],
    staleSince: {},
    plant: blankPlant(),
    machines: Object.fromEntries(MACHINE_IDS.map((id) => [id, blankMachine(id)])),
    sim: { ...QUIET_SIM_SETTINGS, machines: {} },
    injections: [],
    nextEventAt: 0,
    injSeq: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Process model                                                       */
/* ------------------------------------------------------------------ */

export interface Drivers {
  feed: number;
  coal: number;
  kilnSpeed: number;
  idFan: number;
  coolerAir: number;
  ambient: number;
  /** ID-fan inlet damper position, % (POS-PHC-01). */
  idDamper: number;
}

type Values = Record<string, number>;

/**
 * Material transport and hold-up of the line (D5 Table 3.1: upstream swings reach the machines downstream
 * "within minutes"): dead time and first-order time constant in minutes. Demo values (D5 gives none).
 */
const LAG = {
  /** Dosed feed → bucket elevator → preheater stages → kiln inlet. */
  meal: [2, 1],
  /** Meal heating in the kiln inlet zone (inlet gas temperature, O₂). */
  inlet: [0, 3],
  /** Kiln hold-up: drive torque and thrust load. */
  kilnLoad: [0, 15],
  /** Meal reaching the burning zone. */
  burn: [15, 5],
  /** Clinker leaving the kiln into the cooler (kiln residence ≈ 30 min). */
  kilnOut: [25, 6],
  /** Clinker crossing the cooler to the discharge pyrometer. */
  cooler: [15, 5],
  /** Crusher discharge to the clinker silo (pan conveyor). */
  conveyor: [2, 1],
} as const satisfies Record<string, readonly [number, number]>;
/** Cooler bed: hot (compartments 1–3) and cold (4–6) zone hold-up time at design stroke, min. */
const T_BED = 20;
/** Air resistance of a compartment: grate plates ≈ 30 %, the clinker bed the rest (1 at design depth). */
const bedResistance = (bed: number) => 0.3 + 0.7 * Math.max(0, bed);
/** Bleed-down time constant of a hydraulic / lube pressure after its pump stops, min. */
const PUMP_BLEED = 4;
/** Minimum grate stroke share (≈ 4 stroke/min) that keeps an emptying cooler moving. */
const STROKE_MIN = 0.4;
/** Deepest bed the grate holds (× design depth) before clinker spills back to the kiln outlet. */
const BED_MAX = 2.2;
/** Cooling-fan shut-off pressure as a share of its design pressure (the most a fan can push against a deep bed). */
const FAN_SHUTOFF = 1.45;
/** Time constants (min): process gas / air temperatures once the line is stopped (refractory heat), bearings and windings, support rollers, gearbox oil. */
const TAU_STOPPED = 45;
const TAU_BEARING = 30;
const TAU_ROLLER = 60;
const TAU_OIL = 40;
/** Residual vibration of a stopped machine (mm/s RMS): background from the running plant around it. */
const VIB_STOPPED = 0.02;
/** Raw meal to clinker (loss on ignition): clinker t/h = kiln feed / CLINKER_FACTOR. */
const CLINKER_FACTOR = 1.6;
/** Inventories (demo; D5 capacities TBC at D3): tonnes per % of level. */
const SILO_T_PER_PCT = 60;
const BIN_T_PER_PCT = 1.207;
/** Share of the kiln feed bin weight on each of its three load cells (the outlet sits slightly off-centre). */
const LOAD_CELL_SHARE = [0.34, 0.33, 0.33];
/** Kiln feed bin weight from its three load cells. */
const binWeight = (v: Record<string, number>) => v["WGT-KFS-01"] + v["WGT-KFS-02"] + v["WGT-KFS-03"];
const COALBIN_T_PER_PCT = 1.2;
const CSILO_T_PER_PCT = 50;
/** Kiln feed bin weight set-point (t) and the weigh-bin extraction controller gain (t/h per t of error). */
const BIN_SP = 70;
const BIN_GAIN = 6;
/** Raw mill, coal mill and cement mill rates (t/h) and their level-control bands (% on / off). */
const RAW_MILL = 450;
const COAL_MILL = 26;
const CEMENT_MILL_DRAW = 330;
/** Kiln speed on the auxiliary drive (rpm) and while the feed is off (operator turn-down, rpm). */
const AUX_SPEED = 0.15;
const STOP_SPEED = 1.2;
const CLR_I_SUM = CLR_FAN_I.reduce((a, b) => a + b, 0);
const CLR_HOT_I = CLR_FAN_I[0] + CLR_FAN_I[1] + CLR_FAN_I[2];

interface LagCell {
  buf: number[];
  y: number;
}
type LagStore = Record<string, LagCell>;

/** Dead time + first-order lag of `x` (one call per minute per key). */
function lagStep(store: LagStore, key: string, x: number, dead: number, tau: number): number {
  let cell = store[key];
  if (!cell) cell = store[key] = { buf: [], y: x };
  cell.buf.push(x);
  while (cell.buf.length > dead + 1) cell.buf.shift();
  const xd = cell.buf[0];
  cell.y = tau <= 0 ? xd : cell.y + (xd - cell.y) * (1 - Math.exp(-1 / tau));
  return cell.y;
}

/** Inventories (t) and cooler bed depth (1 = design) of one side: the plant, or the reference model. */
interface Inventory {
  silo: number;
  bin: number;
  coalBin: number;
  cSilo: number;
  bedHot: number;
  bedCold: number;
}

/** Process state of the line that persists minute to minute (mass balance, hold-ups, interlocks). */
export interface PlantState {
  /** Lag cells: "T:" plant, "M:" reference model, "W:" witness corrections. */
  lag: LagStore;
  truth: Inventory;
  model: Inventory;
  /** Raw mill (silo fill), coal mill (coal-bin fill) and cement mill (clinker-silo draw) running. */
  rawMill: boolean;
  coalMill: boolean;
  cementMill: boolean;
  /** Kiln axial offset from the float centre (mm): drifts downhill while the thrust hydraulics are off. */
  axial: number;
  /** Commanded share of the design feed, coal and kiln speed (dropped on a stop, ramped on a restart). */
  feedCmd: number;
  coalCmd: number;
  speedCmd: number;
  /** Equipment states of the last minute and the minute each unit left "run". */
  eq: EquipmentStates;
  downSince: Partial<Record<EquipmentId, number>>;
  /** Line stop (kiln feed off) since, and why. */
  lineStopSince: number | null;
  lineStopCause: string | null;
  /** Cooler bed backed up (discharge blocked or grate stopped) since. */
  backupSince: number | null;
  /** True feed-bin level (%) and clinker-silo level of the last minute (feed head, high-high interlock). */
  binLevel: number;
  cSiloLevel: number;
  /** Clinker-silo high-high level switch (stops the pan conveyor). */
  siloHigh: boolean;
}

function blankInventory(): Inventory {
  return { silo: 62 * SILO_T_PER_PCT, bin: BIN_SP, coalBin: 64 * COALBIN_T_PER_PCT, cSilo: 56 * CSILO_T_PER_PCT, bedHot: 1, bedCold: 1 };
}

function blankPlant(): PlantState {
  return {
    lag: {},
    truth: blankInventory(),
    model: blankInventory(),
    rawMill: true,
    coalMill: true,
    cementMill: true,
    axial: 0,
    feedCmd: 1,
    coalCmd: 1,
    speedCmd: 1,
    eq: defaultEquipment(),
    downSince: {},
    lineStopSince: null,
    lineStopCause: null,
    backupSince: null,
    binLevel: BIN_SP / BIN_T_PER_PCT,
    cSiloLevel: 56,
    siloHigh: false,
  };
}

/** Material flows along the line on one side (plant or model), as shares of the design feed. */
interface Zones {
  /** Dosed kiln feed (solid-flow meter, elevator). */
  fFeed: number;
  /** Meal entering the kiln inlet; meal heating in the inlet zone; kiln hold-up; meal at the burning zone. */
  fMeal: number;
  fInlet: number;
  fK: number;
  fBz: number;
  /** Clinker into the cooler, at the cooler discharge, through the crusher and on the pan conveyor. */
  fIn: number;
  fDis: number;
  fHmr: number;
  fCsl: number;
  /** Grate stroke share (stroke / 10.5 stroke/min); cooler hot / cold bed depth. */
  sr: number;
  bedHot: number;
  bedCold: number;
}

/**
 * Advance the material flows of one side by a minute: transport lags along the
 * line, the kiln that only moves material while it turns, and the two-zone
 * cooler bed that backs up when the crusher, the pan conveyor or a full
 * clinker silo blocks its discharge (D5 Table 3.1 clinker chain).
 */
function zoneStep(store: LagStore, k: string, feed: number, mealLoss: number, kilnSpeed: number, eq: EquipmentStates, inv: Inventory, discharge: boolean): Zones {
  const fFeed = Math.max(0, feed / F0);
  const fMeal = lagStep(store, `${k}meal`, fFeed * (1 - mealLoss), LAG.meal[0], LAG.meal[1]);
  const fInlet = lagStep(store, `${k}inlet`, fMeal, LAG.inlet[0], LAG.inlet[1]);
  const fK = lagStep(store, `${k}kload`, fMeal, LAG.kilnLoad[0], LAG.kilnLoad[1]);
  const fBz = lagStep(store, `${k}burn`, fMeal, LAG.burn[0], LAG.burn[1]);
  // The kiln only transports material while it turns (≥ half the design speed for the full rate).
  const moving = clamp(kilnSpeed / (0.5 * N0), 0, 1);
  const fIn = lagStep(store, `${k}kout`, fMeal, LAG.kilnOut[0], LAG.kilnOut[1]) * moving;
  // Grate stroke follows the clinker rate (bed-depth control), with a minimum stroke that drains an empty kiln's bed.
  const sr = eq["clr-grate-hpu"] === "run" ? Math.max(fIn, STROKE_MIN) : 0;
  const hotOut = inv.bedHot * sr;
  const coldOut = discharge ? inv.bedCold * sr : 0;
  inv.bedHot = clamp(inv.bedHot + (fIn - hotOut) / T_BED, 0, BED_MAX);
  inv.bedCold = clamp(inv.bedCold + (hotOut - coldOut) / T_BED, 0, BED_MAX);
  const fDis = lagStep(store, `${k}cool`, fIn, LAG.cooler[0], LAG.cooler[1]);
  const fHmr = lagStep(store, `${k}hmr`, coldOut, 0, 1);
  const fCsl = lagStep(store, `${k}csl`, fHmr, LAG.conveyor[0], LAG.conveyor[1]);
  return { fFeed, fMeal, fInlet, fK, fBz, fIn, fDis, fHmr, fCsl, sr, bedHot: inv.bedHot, bedCold: inv.bedCold };
}

interface PhysicsIn {
  d: Drivers;
  z: Zones;
  eq: EquipmentStates;
  inv: Inventory;
  t: number;
  shellAtTyre: number[];
  /** First-order lag of a temperature (rise above ambient for drive temperatures), keyed per tag on this side. */
  th: (tag: string, x: number, tau: number) => number;
  /** Line stopped or restarting: process temperatures follow the refractory, slowly. */
  slowHeat: boolean;
  /** Loss of cooler heat recuperation (0 healthy). */
  recupLoss: number;
  /** Kiln axial offset (mm). */
  axial: number;
  /** Hidden faults the model does not see (0 healthy): pan-conveyor chain broken, baghouse pulse cleaning stopped. */
  chainBreak: number;
  pulseStop: number;
  /** Coal reaching the flame in surges after the feeder (t/h, choking line); the weigh feeder still reads steady. */
  coalSurge: number;
}

/**
 * Line physics: every analog value as a function of the operating drivers, the
 * material flows along the line, the equipment run states and the
 * inventories. A stopped unit's current, speed and vibration are ≈ 0 and its
 * bearings and windings cool to ambient (D5 Tables 5.x.6 "≈ 0 / ambient when
 * stopped"). Design point (D5 §3.1, Tables 5.2.1, 5.3.1, 5.4.1, 5.5.1): kiln
 * feed 330 t/h, coal 10.5 t/h, kiln 3.6 rpm, C1 gas 330 °C; OSW-PE-SNL-PYR-01 Rev. 01
 * nominals: meal to kiln 850 °C, kiln inlet draft −8.8 mbar, burning zone 1,300 °C,
 * secondary air 1,100 °C.
 */
function physics(p: PhysicsIn): Values {
  const { d, z, eq, inv, t, th } = p;
  const run = (id: EquipmentId) => eq[id] === "run";
  const c = Math.max(0, d.coal + p.coalSurge) / C0;
  const n = d.kilnSpeed / N0;
  const s = d.idFan / S0;
  // Draft follows fan speed squared and the inlet damper opening.
  const dmp = d.idDamper / DAMPER0;
  const dr = Math.max(0, s * s * (1 + 0.8 * (dmp - 1)));
  const Ta = d.ambient;
  const gasTau = p.slowHeat ? TAU_STOPPED : 0;
  const gas = (tag: string, x: number) => th(`g:${tag}`, x, gasTau);
  const rise = (tag: string, x: number, tau = TAU_BEARING) => Ta + th(tag, x, tau);
  // Stator winding RTD: copper losses rise with the square of the load; a stopped motor cools to ambient.
  const wdg = (tag: string, on: boolean, load = 1) => rise(tag, on ? (PYRO_SIGNAL_BY_TAG[tag].base - TA0) * (0.55 + 0.45 * load * load) : 0);
  // Pulse-jet filter ΔP: saw-tooth over the cleaning cycle.
  const saw = (period: number) => (((t % period) + period) % period) / period;
  const v: Values = {};

  // Cooler air: each running fan's share of the design air (shares ∝ fan current); compartments 1–3 recuperate the heat.
  const A = d.coolerAir;
  const fanRun = CLR_FAN_I.map((_, i) => run(`clr-fan-${i + 1}` as EquipmentId));
  const Aeff = A * CLR_FAN_I.reduce((acc, b, i) => acc + (fanRun[i] ? b / CLR_I_SUM : 0), 0);
  const hotShare = CLR_FAN_I.slice(0, 3).reduce((acc, b, i) => acc + (fanRun[i] ? b / CLR_HOT_I : 0), 0);
  const vent = run("clr-vent-fan");

  // Kiln heat balance (single firing point at the outlet).
  const tSec = gas("TMP-BRN-02", 1100 + 260 * (z.fIn - 1) - 130 * (A - 1) - 300 * (1 - hotShare) - 400 * p.recupLoss);
  const tbz = gas("TMP-KLN-14", BZ0 + 900 * (c - 1) - 280 * (z.fBz - 1) - 60 * (dr - 1) + 0.15 * (tSec - 1100));
  const tIn = gas("TMP-KLN-13", 1080 + 500 * (c - 1) - 170 * (z.fInlet - 1) - 40 * (dr - 1));
  const r = (tIn - 20) / 1060;
  const o2In = clamp(2.4 + 5 * (dr - 1) - 7 * (c - 1) + 1.2 * (1 - z.fInlet), 0.2, 20.9);
  const o2Ex = Math.min(20.9, o2In + 1.2);

  // FSL-01 · duty / standby aeration blower on the header; silo inventory.
  const duty = run("fsl-blower-duty");
  const stby = run("fsl-blower-standby");
  v["LEV-FSL-01"] = inv.silo / SILO_T_PER_PCT;
  v["PRS-FSL-01"] = duty ? 420 + 0.4 * (Ta - TA0) : stby ? 365 + 0.35 * (Ta - TA0) : 4;
  v["ELE-FSL-01"] = duty ? 66 + 0.12 * (Ta - TA0) : stby ? 58 + 0.1 * (Ta - TA0) : 0;
  v["TMP-FSL-01"] = wdg("TMP-FSL-01", duty || stby, v["ELE-FSL-01"] / 66);
  v["PRS-FSL-02"] = 10.4 + 2.2 * saw(40);
  v["ELE-FSL-02"] = 34 + 0.06 * (Ta - TA0);

  // KFS-01 · weigh bin inventory, dosing follows feed.
  const elev = run("kfs-elevator");
  // Three load cells carry the bin; there is no level sensor.
  LOAD_CELL_SHARE.forEach((k, i) => (v[`WGT-KFS-0${i + 1}`] = inv.bin * k));
  v["PRS-KFS-05"] = 9 + 2 * saw(36);
  v["ELE-KFS-03"] = 22 + 0.04 * (Ta - TA0);
  const slide = run("kfs-airslide-blower");
  v["PRS-KFS-01"] = slide ? 39.2 * (0.9 + 0.1 * z.fFeed) : 0.4;
  v["ELE-KFS-02"] = slide ? 38 * (0.92 + 0.08 * z.fFeed) : 0;
  // Gates A and B split the bin discharge over slides A and B to the two solid-flow meters (half each).
  v["FLO-KFS-01"] = 0.5 * z.fFeed * F0;
  v["FLO-KFS-02"] = 0.5 * z.fFeed * F0;
  // Meter pressure taps P2 / P3 sit near atmospheric (OSW-PE-SNL-PYR-01: −5 … +5 mmWG) and move with the meter's
  // throughput around the design rate; with no flow through the meter they read 0.
  const pSfm = SFM_P_GAIN * (z.fFeed - 1) * Math.min(1, z.fFeed / 0.2);
  v["PRS-KFS-02"] = pSfm;
  v["PRS-KFS-06"] = pSfm;
  v["PRS-KFS-04"] = slide ? 45 * (0.9 + 0.1 * z.fFeed) : 0.5;
  v["ELE-KFS-01"] = elev ? 118 * (0.35 + 0.65 * Math.pow(z.fFeed, 1.1)) : 0;
  v["VIB-KFS-01"] = elev ? 1.8 * (1 + 0.1 * (z.fFeed - 1)) : VIB_STOPPED;
  v["TMP-KFS-01"] = rise("TMP-KFS-01", elev ? 28 + 4 * (z.fFeed - 1) : 0);
  v["SPD-KFS-01"] = elev ? 24.5 : 0;
  v["TMP-KFS-02"] = wdg("TMP-KFS-02", elev, v["ELE-KFS-01"] / 118);

  // PHC-01 · stage temperatures scale with the kiln exit gas, drafts with the fan (D5 5.3.1: C1 300–360 °C; OSW-PE-SNL-PYR-01
  // Rev. 01: C5 820–860, C6 860–890, riser 870–900, meal to kiln 830–870 °C). C5 / C6 / riser sit apart inside their
  // nominals so the stage order (C6 < riser, R-PHC-V1) holds with the thermocouple scatter.
  const STAGE = [330, 505, 650, 775, 832, 866];
  STAGE.forEach((b, i) => (v[`TMP-PHC-0${i + 1}`] = 20 + (b - 20) * r * (1 + 0.04 * (dr - 1)) * (1 - 0.02 * (i < 2 ? z.fMeal - 1 : 0))));
  v["TMP-PHC-08"] = 20 + 872 * r;
  // Less meal runs a little hotter; the sensitivity keeps the meal below the riser gas (≈ 40 K above it) with no meal at all.
  v["TMP-PHC-07"] = 20 + 830 * r * (1 - 0.015 * (z.fMeal - 1));
  // C6 / riser draft −11.2 mbar (nominal −5.9 … −11.8) stays below the kiln inlet (−8.8 mbar): the staircase C1 → C6 → inlet.
  const DRAFT = [-62, -51, -40, -30, -21, -11.2];
  DRAFT.forEach((b, i) => (v[`PRS-PHC-0${i + 1}`] = b * dr * (1 + 0.12 * (z.fMeal - 1))));
  v["PRS-PHC-07"] = -5.9 * dr;
  v["PRS-PHC-08"] = -4.9 * dr;
  v["PRS-PHC-09"] = -7 * dr;
  v["GAS-PHC-01"] = o2Ex;
  v["GAS-PHC-02"] = 300 + 1600 * Math.max(0, 2.6 - o2Ex);
  const fan = run("phc-idfan");
  v["POS-PHC-01"] = d.idDamper;
  // A tripped fan coasts down: its vibration and power follow the falling speed.
  v["VIB-PHC-01"] = Math.max(VIB_STOPPED, 2.3 * dr);
  v["VIB-PHC-02"] = Math.max(VIB_STOPPED, 2.0 * dr);
  v["TMP-PHC-09"] = rise("TMP-PHC-09", fan ? 38 + 10 * (s - 1) : 0);
  v["TMP-PHC-10"] = rise("TMP-PHC-10", fan ? 33 + 10 * (s - 1) : 0);
  v["ELE-PHC-01"] = fan ? 1850 * s * s * s * (1 + 0.08 * (z.fMeal - 1)) * (1 + 0.6 * (dmp - 1)) : 0;
  v["SPD-PHC-01"] = d.idFan;
  v["TMP-PHC-11"] = wdg("TMP-PHC-11", fan, Math.cbrt(v["ELE-PHC-01"] / 1850));
  // Calciner outlet (C5 meal split to calciner / riser) and the main baghouse after the ID fan.
  v["PRS-PHC-10"] = -11 * dr;
  // Calciner outlet: its own firing keeps O₂ steady; the draft moves it.
  v["GAS-PHC-03"] = clamp(2.0 + 4 * (dr - 1), 0.2, 20.9);
  v["GAS-PHC-04"] = 450 + 2400 * Math.max(0, 1.4 - v["GAS-PHC-03"]);
  v["POS-PHC-02"] = 70;
  v["TMP-BGH-02"] = 20 + 155 * (v["TMP-PHC-01"] - 20) / 310;
  v["PRS-BGH-02"] = -18 * dr;
  v["PRS-BGH-01"] = 12.6 + 2.6 * saw(30);
  v["ELE-BGH-02"] = 9.5 * (0.9 + 0.1 * z.fFeed);
  v["GAS-BGH-01"] = 12;
  v["VIB-BGH-01"] = 2.1;
  v["TMP-BGH-01"] = rise("TMP-BGH-01", 32);
  v["ELE-BGH-01"] = 310 * (0.92 + 0.08 * dr);
  v["SPD-BGH-01"] = 980;
  v["TMP-BGH-03"] = wdg("TMP-BGH-03", true, v["ELE-BGH-01"] / 310);

  // KLN-01 · drive train (load from the kiln hold-up and speed); the aux drive turns the kiln through the gearbox.
  const main = run("kln-main-drive");
  const aux = run("kln-aux-drive");
  const torque = main ? 64 * (0.3 + 0.7 * Math.pow(Math.max(0, z.fK), 0.9)) * Math.pow(Math.max(n, 0.05), 0.3) : 0;
  const tr = main ? torque / 64 - 1 : 0;
  const oil = rise("TMP-KLN-15", main ? 24 + 9 * tr : aux ? 10 : 4, TAU_OIL);
  const lube = run("kln-lube-pump");
  v["ELE-KLN-01"] = torque;
  v["SPD-KLN-01"] = d.kilnSpeed;
  v["TMP-KLN-21"] = rise("TMP-KLN-21", main ? 62 * Math.pow(torque / 64, 2) : 0);
  v["TMP-KLN-19"] = rise("TMP-KLN-19", main ? 29 + 4 * tr : 0);
  v["TMP-KLN-20"] = rise("TMP-KLN-20", main ? 25 + 4 * tr : 0);
  v["TMP-KLN-15"] = oil;
  // Pump pressures bleed down over a few minutes when the pump stops (accumulators, oil in the lines).
  v["PRS-KLN-04"] = th("p:PRS-KLN-04", lube ? 2.2 - 0.018 * (oil - 56) : 0.02, PUMP_BLEED);
  v["PRS-KLN-05"] = th("p:PRS-KLN-05", lube ? 0.65 - 0.012 * (oil - 54) : 0, PUMP_BLEED);
  v["TMP-KLN-22"] = oil + th("TMP-KLN-22", main ? 10 + 2 * tr : aux ? 3 : 0, TAU_BEARING);
  v["TMP-KLN-23"] = oil + th("TMP-KLN-23", main ? 8 + 2 * tr : aux ? 2 : 0, TAU_BEARING);
  const vk = (b: number) => Math.max(VIB_STOPPED, b * n * (1 + 0.12 * tr));
  v["VIB-KLN-01"] = main ? vk(1.6) : VIB_STOPPED;
  v["VIB-KLN-02"] = vk(1.85);
  v["VIB-KLN-03"] = vk(1.51);
  v["VIB-KLN-04"] = vk(2.33);
  for (const tag of ROLLER_TAGS) v[tag] = rise(tag, ROLLER_OFFSET[tag] + 6 * (n - 1) + 3 * (z.fK - 1), TAU_ROLLER);
  const hpu = run("kln-thrust-hpu");
  const floatPhase = (2 * Math.PI * t) / 240;
  v["POS-KLN-01"] = -3 + p.axial + (hpu ? 2.2 * Math.sin(floatPhase) : 0);
  v["PRS-KLN-07"] = th("p:PRS-KLN-07", hpu ? 86 * (0.5 + 0.5 * Math.pow(Math.max(0, z.fK), 1.2)) + 4 * Math.cos(floatPhase) : 3, PUMP_BLEED);
  [9, 11, 8].forEach((b, i) => (v[`MIG-KLN-0${i + 1}`] = b - 0.05 * p.shellAtTyre[i]));
  // Tyre temperatures (DCS read-only) follow the shell under each tyre.
  [250, 215, 250].forEach((b, i) => (v[`TMP-KLN-${28 + i}`] = b + 0.5 * (Ta - TA0) + 0.3 * p.shellAtTyre[i]));
  v["TMP-KLN-13"] = tIn;
  v["PRS-KLN-01"] = -8.8 * dr;
  v["GAS-KLN-01"] = o2In;
  v["GAS-KLN-02"] = 420 + 2600 * Math.max(0, 1.6 - o2In);
  v["GAS-KLN-03"] = Math.max(60, 950 + 4.5 * (tbz - BZ0) + 120 * (o2In - 2.4));
  v["STS-KLN-08"] = 95.9;
  v["TMP-KLN-14"] = tbz;
  v["TMP-KLN-27"] = 1030 + 0.6 * (tSec - 1100) + 0.1 * (tbz - BZ0);
  // Hood: held slightly negative by the ID fan; without draft the cooler air (and without the vent fan its excess) blows back (D5 FP-30).
  v["PRS-KLN-03"] = -0.147 * dr + 0.074 * (Aeff - 1) + 0.17 * (1 - Math.min(1, dr)) * Math.min(1, Aeff) + (vent ? 0 : 0.2);
  const outFan = run("kln-outlet-fan");
  v["TMP-KLN-25"] = rise("TMP-KLN-25", outFan ? 60 : 140, 15);
  v["TMP-KLN-26"] = 250 + 0.16 * (tbz - BZ0) + 0.5 * (Ta - TA0) + th("TMP-KLN-26", outFan ? 0 : 115, 30);
  v["LAB-KLN-01"] = 22;

  // BRN-01 · primary air on a controlled header, coal on its own line.
  const pa = run("brn-pafan");
  const blower = run("brn-coal-blower");
  v["PRS-BRN-03"] = pa ? 675 : 2;
  v["PRS-BRN-01"] = pa ? 65 : 1.5;
  v["PRS-BRN-02"] = pa ? 625 : 2;
  v["VIB-BRN-01"] = pa ? 1.9 : VIB_STOPPED;
  v["TMP-BRN-01"] = rise("TMP-BRN-01", pa ? 30 : 0);
  v["ELE-BRN-01"] = pa ? 142 + 0.1 * (Ta - TA0) : 0;
  v["TMP-BRN-05"] = wdg("TMP-BRN-05", pa, v["ELE-BRN-01"] / 142);
  v["TMP-BRN-02"] = tSec;
  v["TMP-BRN-04"] = Ta + 26;
  v["GAS-BRN-01"] = 18;
  v["LEV-BRN-01"] = inv.coalBin / COALBIN_T_PER_PCT;
  v["FLO-BRN-01"] = d.coal;
  // Line pressure: conveying air alone carries ≈ 10 %, the coal load the rest.
  v["PRS-BRN-04"] = blower ? 410 * (0.1 + 0.9 * Math.pow(Math.max(0, c), 0.7)) : 3;
  v["VIB-BRN-02"] = blower ? 2.6 : VIB_STOPPED;
  v["ELE-BRN-02"] = blower ? 205 * (1 + 0.08 * (c - 1)) : 0;
  v["TMP-BRN-06"] = wdg("TMP-BRN-06", blower, v["ELE-BRN-02"] / 205);
  // Calciner coal runs on its own outlet-temperature control (steady here), interlocked with the meal feed (elevator);
  // tertiary air comes hot from the cooler hood.
  v["FLO-BRN-02"] = run("kfs-elevator") ? 14.5 : 0;
  v["POS-BRN-01"] = 65;
  v["TMP-BRN-03"] = 880 + 0.5 * (tSec - 1100);
  v["PRS-BRN-05"] = -3.43 * dr;

  // CLR-01 · grate stroke follows the clinker rate so the bed stays at depth; a stopped fan's chamber only sees leakage.
  CLR_BASE.forEach((b, i) => {
    const res = bedResistance(i < 3 ? z.bedHot : z.bedCold);
    // A centrifugal fan cannot push past its shut-off pressure (≈ 1.45 × design), however deep the bed gets.
    v[`PRS-CLR-0${i + 1}`] = (fanRun[i] ? A * A : 0.08) * b * Math.min(Math.pow(res, 0.8), FAN_SHUTOFF);
    v[`ELE-CLR-0${i + 1}`] = fanRun[i] ? CLR_FAN_I[i] * A * A * A * Math.pow(res, 0.3) : 0;
    v[`TMP-CLR-0${i + 1}`] = rise(`TMP-CLR-0${i + 1}`, fanRun[i] ? CLR_FAN_T[i] + 4 * (A - 1) : 0);
  });
  CLR_FAN_V.forEach((b, i) => (v[`VIB-CLR-0${i + 1}`] = fanRun[i] ? b * A : VIB_STOPPED));
  // Cooling-fan windings follow the fan's run state (its load moves with the bed, which the reference model cannot see).
  CLR_FAN_I.forEach((_, i) => (v[`TMP-CLR-${17 + i}`] = wdg(`TMP-CLR-${17 + i}`, fanRun[i])));
  // Under-grate hoppers (DCS read-only): fine clinker falling through the grate; hotter where the bed is hot.
  [95, 86, 115, 115, 115, 115].forEach((b, i) => (v[`TMP-CLR-${11 + i}`] = gas(`TMP-CLR-${11 + i}`, b + 0.6 * (Ta - TA0) + (fanRun[i] ? 0 : 25))));
  const grate = run("clr-grate-hpu");
  v["SPD-CLR-01"] = 10.5 * z.sr;
  // Hydraulic working pressure: moving the empty grate frame takes about 60 %, the clinker load the rest.
  v["PRS-CLR-07"] = th("p:PRS-CLR-07", grate ? 118 * (0.6 + 0.4 * Math.pow(bedResistance((z.bedHot + z.bedCold) / 2), 0.8) * Math.pow(Math.max(z.sr, STROKE_MIN), 0.3)) : 8, PUMP_BLEED);
  v["TMP-CLR-07"] = rise("TMP-CLR-07", grate ? 18 : 0);
  // Discharge: clinker heat left after cooling; a lost hot-zone fan or a backed-up bed sends hot clinker downstream (D5 FP-36 / FP-37).
  v["TMP-CLR-08"] =
    0.6 * Ta + 12 + 82 * Math.pow(Math.max(0, z.fDis), 1.95) * (1 - 1.1 * (Aeff - 1)) * Math.pow(clamp(z.bedCold, 0.5, BED_MAX), 0.3) + 80 * (1 - hotShare) * z.fDis;
  v["TMP-CLR-09"] = gas("TMP-CLR-09", 255 + 180 * (z.fIn - 1) - 60 * (Aeff - 1));
  v["VIB-CLR-07"] = vent ? 2.2 : VIB_STOPPED;
  v["TMP-CLR-10"] = rise("TMP-CLR-10", vent ? 34 : 0);
  v["ELE-CLR-07"] = vent ? 385 * (1 + 0.1 * (A - 1)) : 0;
  v["TMP-CLR-23"] = wdg("TMP-CLR-23", vent, v["ELE-CLR-07"] / 385);

  // HMR-01 · crusher load follows the clinker rate (no-load current when empty).
  const crush = run("hmr-crusher");
  const iHmr = crush ? 96 * (0.4 + 0.6 * z.fHmr) : 0;
  v["ELE-HMR-01"] = iHmr;
  v["TMP-HMR-03"] = rise("TMP-HMR-03", 52 * Math.pow(iHmr / 96, 2));
  v["VIB-HMR-01"] = crush ? 3.1 : VIB_STOPPED;
  v["VIB-HMR-02"] = crush ? 2.8 : VIB_STOPPED;
  // Hot clinker from the cooler warms the crusher (D5 FP-36 "hot clinker downstream").
  const hotClinker = 0.04 * Math.max(0, v["TMP-CLR-08"] - 112) * z.fHmr;
  v["TMP-HMR-01"] = rise("TMP-HMR-01", crush ? 36 + 3 * (z.fHmr - 1) + hotClinker : 0);
  v["TMP-HMR-02"] = rise("TMP-HMR-02", crush ? 32 + 3 * (z.fHmr - 1) + hotClinker : 0);
  v["SPD-HMR-01"] = crush ? 345 : 0;

  // CSL-01 · conveyor, silo inventory and its pulse-jet filter.
  const conv = run("csl-conveyor");
  const dust = run("csl-dust-fan");
  // A broken chain unloads the drive to no-load and the tail shaft stops (D5 FP-42).
  const brk = clamp(p.chainBreak, 0, 1);
  v["ELE-CSL-01"] = conv ? 74 * (0.45 + 0.55 * z.fCsl * (1 - brk)) : 0;
  v["VIB-CSL-01"] = conv ? 1.9 : VIB_STOPPED;
  v["SPD-CSL-01"] = conv ? 6.2 * (1 - brk) : 0;
  v["TMP-CSL-02"] = wdg("TMP-CSL-02", conv);
  // Baghouse ΔP: saw-tooth with the pulse-cleaning cycle; without cleaning the cake builds and ΔP stops cycling.
  const pulse = clamp(p.pulseStop, 0, 1);
  v["PRS-CSL-01"] = dust ? 11.4 + 2.2 * (1 - pulse) * ((((t % 30) + 30) % 30) / 30) + 3 * pulse : 0.4;
  v["ELE-CSL-02"] = dust ? 58 : 0;
  v["LEV-CSL-01"] = inv.cSilo / CSILO_T_PER_PCT;
  return v;
}

/* ------------------------------------------------------------------ */
/* Line control: interlocks, operator response, inventories            */
/* ------------------------------------------------------------------ */

/** Units whose loss stops the kiln feed and the fuel at once (protection interlock), not after the 5-min fuel cut. */
const FAST_CUT: Partial<Record<EquipmentId, string>> = {
  "phc-idfan": "ID fan",
  "kln-main-drive": "kiln main drive",
  "brn-pafan": "primary-air fan (flame loss)",
  "brn-coal-blower": "coal conveying blower (flame loss)",
  "brn-coal-feeder": "kiln coal feeder (flame loss)",
};

interface LineControl {
  eq: EquipmentStates;
  lineStop: boolean;
  cause: string | null;
}

/**
 * Resolve this minute's equipment states from the scenario trips / stops and
 * the line interlocks, and move the commanded feed, coal and kiln speed:
 * - duty / standby aeration change-over (standby starts 1 min after the duty blower is lost);
 * - gearbox lube-oil loss trips the main drive; the auxiliary drive turns the kiln 5 min after the main drive is lost;
 * - ID fan, kiln drive or flame loss stops the kiln feed and the fuel at once; an elevator / air-slide stop,
 *   an empty feed bin or a long cooler back-up stops the feed, and the fuel is cut over 5 min (D5 9.4.5);
 * - a backed-up cooler cuts the kiln feed 30 % after 15 min and stops it after 45 min (D5 9.4.5 "kiln output cut");
 * - on a stop the kiln is turned down; on a restart feed, coal and speed ramp back at 2 % / min.
 */
function controlLine(P: PlantState, t: number, forced: Partial<Record<EquipmentId, EquipmentState>>): LineControl {
  const eq = defaultEquipment();
  for (const [id, st] of Object.entries(forced) as Array<[EquipmentId, EquipmentState]>) eq[id] = st;
  const downFor = (id: EquipmentId) => (P.downSince[id] === undefined ? 0 : t - P.downSince[id]!);
  if (eq["fsl-blower-duty"] !== "run" && !forced["fsl-blower-standby"] && downFor("fsl-blower-duty") >= 1) eq["fsl-blower-standby"] = "run";
  if (eq["kln-lube-pump"] !== "run" && !forced["kln-main-drive"] && downFor("kln-lube-pump") >= 1) eq["kln-main-drive"] = "tripped";
  if (eq["kln-main-drive"] !== "run" && !forced["kln-aux-drive"] && downFor("kln-main-drive") >= 5) eq["kln-aux-drive"] = "run";

  // Why the kiln feed is off, if it is (protection trips first).
  let cause: string | null = null;
  let fast = false;
  for (const [id, label] of Object.entries(FAST_CUT) as Array<[EquipmentId, string]>) {
    const lost = id === "brn-coal-feeder" ? forced[id] !== undefined : eq[id] !== "run";
    if (lost && !cause) {
      cause = label;
      fast = true;
    }
  }
  if (!cause && forced["kfs-elevator"]) cause = "bucket elevator";
  if (!cause && forced["kfs-airslide-blower"]) cause = "air-slide blower";
  const binEmpty = P.lineStopCause === "feed bin empty" ? P.binLevel < 30 : P.binLevel < 2;
  if (!cause && binEmpty) cause = "feed bin empty";
  const backedFor = P.backupSince === null ? 0 : t - P.backupSince;
  if (!cause && backedFor >= 45) cause = "cooler discharge backed up";
  const lineStop = cause !== null;

  // Clinker silo high-high level stops the pan conveyor (restarts below 92 %).
  P.siloHigh = P.siloHigh ? P.cSiloLevel >= 92 : P.cSiloLevel >= 96;
  if (P.siloHigh && !forced["csl-conveyor"]) eq["csl-conveyor"] = "stopped";
  if (lineStop) {
    if (!forced["kfs-elevator"]) eq["kfs-elevator"] = "stopped";
    if (!forced["brn-coal-feeder"] && (fast || P.coalCmd <= 0.001)) eq["brn-coal-feeder"] = "stopped";
  }

  // Commanded rates: a stop drops the feed at once; restarts ramp at 2 % / min; the cooler back-up trims 30 %.
  const feedTarget = lineStop ? 0 : backedFor >= 15 ? 0.7 : 1;
  const coalTarget = lineStop || eq["brn-coal-feeder"] !== "run" ? 0 : feedTarget;
  // A backed-up cooler also slows the kiln (D5 FP-38 "bed builds → kiln slows").
  const speedTarget = lineStop ? STOP_SPEED / N0 : backedFor >= 15 ? 0.85 : 1;
  const ramp = (cur: number, target: number, down: number) => (target < cur ? Math.max(target, cur - down) : Math.min(target, cur + 0.02));
  P.feedCmd = lineStop ? 0 : ramp(P.feedCmd, feedTarget, 0.03);
  P.coalCmd = eq["brn-coal-feeder"] !== "run" ? 0 : ramp(P.coalCmd, coalTarget, 0.2);
  P.speedCmd = ramp(P.speedCmd, speedTarget, 0.01);
  return { eq, lineStop, cause };
}

/* ------------------------------------------------------------------ */
/* Story / autopilot (per machine, same behaviour as the kiln engine)  */
/* ------------------------------------------------------------------ */

const FIRST_FAULT_DELAY = 20;
const ACK_AFTER = 8;
const MITIGATE_AFTER = 25;
const REPAIR_AFTER = 80;
const REPAIR_MIN = 30;
const DISTURBANCE_MIN = 40;
const HOLD_LEAD = 30;
/** Live demo: scenario minutes a held fault advances per minute after reaching its hold point. */
const HOLD_CREEP = 0.05;
const HOLD_MIN = 150;
const HOLD_VAR = 90;
const BG_GAP_MIN = 120;
const BG_GAP_VAR = 180;
const BG_LEN_MIN = 18;
const BG_LEN_VAR = 20;
const LIMIT_RAISE_N = 3;
const LIMIT_CLEAR_N = 6;
/** Live demo: calm minutes (= real seconds) before a shown limit alarm clears. */
const LIVE_LIMIT_CLEAR_N = 300;

/**
 * Hold profiles: the faults each condition rotates through, with the scenario
 * minute where the finding sits firmly at that severity (and machine health on
 * the same side of 60). Calibrated headless against the D5 physics: every entry
 * holds ≥ 90 % of the time at its profile's condition (seed 20261014). The
 * elevator slip never turns critical (D5 FP-06 slip is advisory evidence), so
 * the FED critical rotation uses the torn aeration pad instead.
 */
export const PYRO_HOLDS: Record<string, { advisory: Array<{ id: string; at: number }>; critical: Array<{ id: string; at: number }> }> = {
  "PYR-FED-01": {
    advisory: [{ id: "kfs-head-bearing", at: 225 }, { id: "fsl-blower-trip", at: 60 }, { id: "kfs-elevator-slip", at: 115 }],
    critical: [{ id: "kfs-head-bearing", at: 330 }, { id: "fsl-blower-trip", at: 160 }, { id: "fsl-pad-torn", at: 210 }],
  },
  "PYR-PHC-01": {
    advisory: [{ id: "phc-idfan-buildup", at: 130 }, { id: "phc-false-air", at: 165 }, { id: "phc-idfan-bearing", at: 240 }],
    critical: [{ id: "phc-c5-blockage", at: 170 }, { id: "phc-riser-buildup", at: 250 }, { id: "phc-idfan-bearing", at: 320 }],
  },
  "PYR-KLN-01": {
    advisory: [{ id: "kln-tyre2-tight", at: 200 }, { id: "kln-filter-clog", at: 212 }, { id: "kln-spray-circuit", at: 150 }, { id: "kln-inlet-false-air", at: 120 }],
    critical: [{ id: "kln-hot-spot", at: 265 }, { id: "kln-roller-oil-bath", at: 155 }, { id: "kln-filter-clog", at: 320 }],
  },
  "PYR-BRN-01": {
    advisory: [{ id: "brn-coal-bin-smoulder", at: 210 }, { id: "brn-flame-swirl", at: 50 }, { id: "brn-pafan-bearing", at: 245 }],
    // SW-BRN-02 is advisory-only while the gas species is on HOLD, so it is not a critical hold.
    critical: [{ id: "brn-pafan-bearing", at: 360 }, { id: "brn-coal-line-plug", at: 140 }, { id: "brn-flame-swirl", at: 120 }],
  },
  "PYR-CLR-01": {
    advisory: [{ id: "clr-fan2-bearing", at: 245 }, { id: "clr-hydraulic", at: 185 }, { id: "clr-vent-imbalance", at: 170 }, { id: "clr-fan5-bearing", at: 215 }],
    // SW-CLR-01 (grate plate) is a suspicion capped at Alert (no flow / bed-depth / damper inputs), so it is not a critical hold.
    critical: [{ id: "clr-red-river", at: 170 }, { id: "clr-fan2-bearing", at: 330 }],
  },
  "PYR-CCT-01": {
    advisory: [{ id: "csl-chain-drag", at: 175 }, { id: "hmr-rotor-bearing", at: 265 }, { id: "csl-bag-blinding", at: 160 }],
    critical: [{ id: "csl-chain-drag", at: 300 }, { id: "hmr-jam", at: 60 }, { id: "csl-bag-blinding", at: 310 }, { id: "hmr-rotor-bearing", at: 380 }],
  },
};

/** Story rotation per machine: its own equipment faults, a process change now and then. */
function storyRotation(machine: string): string[] {
  // Cross-machine trips (scenarios/line.ts) stop the whole line: they are run on demand, not in the autopilot story.
  return (PYRO_SCENARIOS[machine] ?? []).filter((s) => s.id !== "healthy" && s.group !== "Sensor validation" && !s.id.startsWith("line-")).map((s) => s.id);
}

/** Short instrument faults the autopilot layers on top, per machine. */
function backgroundPool(machine: string): string[] {
  return (PYRO_SCENARIOS[machine] ?? []).filter((s) => s.group === "Sensor validation").map((s) => s.id);
}

function paceFor(sc: PyroScenario): number {
  if (!sc.expected.length) return 3;
  const m = /\+(\d+)h\s*(\d+)m/.exec(sc.documentedDetection);
  const minutes = m ? Number(m[1]) * 60 + Number(m[2]) : 30;
  return clamp(minutes / 18, 1, 8);
}

function pushEvent(line: LineState, ms: MachineState, e: Omit<SimEvent, "t" | "clock">) {
  const { clock, day } = formatClock(line.t);
  ms.events.unshift({ ...e, t: line.t, clock: day > 0 ? `D+${day} ${clock}` : clock });
  if (ms.events.length > 60) ms.events.length = 60;
}

function storyLabel(ms: MachineState): string {
  const sc = pyroScenario(ms.id, ms.scenarioId);
  switch (ms.story.phase) {
    case "healthy":
      if (sc.id !== "healthy") return `${sc.name}: drivers explain the change, no fault expected`;
      return "Machine healthy: every signal follows the reference model";
    case "developing":
      return `${sc.name} developing, not yet confirmed`;
    case "detected":
      return `${sc.name} confirmed (${sc.expected.join(", ")}), awaiting operator action`;
    case "mitigated":
      return `${sc.name} mitigated by a temporary measure, repair still needed`;
    default:
      return ms.scenarioId === "healthy" ? "Repair complete: rules clearing, signals returning to the model" : `Repair under way: ${sc.name} recovering toward the model`;
  }
}

function syncStory(ms: MachineState): void {
  ms.story.label = storyLabel(ms);
  if (ms.frame) ms.frame = { ...ms.frame, events: ms.events.slice(), phase: ms.story.phase, storyLabel: ms.story.label, autopilot: ms.story.autopilot, profile: ms.story.profile, background: ms.bg?.scenarioId ?? null };
}

function beginScenario(line: LineState, ms: MachineState, scenarioId: string, quiet = false): void {
  const sc = pyroScenario(ms.id, scenarioId);
  ms.scenarioId = sc.id;
  ms.scenarioStart = line.t;
  ms.fx = freshFx();
  for (const e of sc.effects) if (!isEquipmentEffect(e) && e.target.kind === "signal") delete line.holds[e.target.tag];
  if (quiet) return;
  pushEvent(line, ms, {
    kind: "scenario",
    severity: "Normal",
    title: `Scenario: ${sc.name}`,
    detail: sc.expected.length ? `Expected ${sc.expected.join(", ")} · demo detection ${sc.documentedDetection}` : "Expected quiet — no alarm",
  });
}

export function setScenario(line: LineState, machine: string, scenarioId: string): void {
  const ms = line.machines[machine];
  if (!ms) return;
  beginScenario(line, ms, scenarioId);
  const sc = pyroScenario(machine, scenarioId);
  const st = ms.story;
  st.phase = sc.expected.length ? "developing" : "healthy";
  st.detectedAt = null;
  st.mitigatedAt = null;
  st.acked = false;
  st.pace = st.autopilot ? paceFor(sc) : 1;
  syncStory(ms);
}

export function setAutopilot(line: LineState, machine: string, on: boolean): void {
  const ms = line.machines[machine];
  if (!ms || ms.story.autopilot === on) return;
  const st = ms.story;
  st.autopilot = on;
  if (on) {
    // Stagger the first background instrument fault so machines do not all start one together.
    ms.bgNextAt = line.t + Math.floor(BG_GAP_MIN / 2 + line.rand() * BG_GAP_VAR);
    if (ms.scenarioId === "healthy" && st.phase === "healthy") st.nextFaultAt = line.t + FIRST_FAULT_DELAY;
    const sc = pyroScenario(machine, ms.scenarioId);
    if (sc.id !== "healthy") st.pace = paceFor(sc);
  } else st.pace = 1;
  pushEvent(line, ms, { kind: "action", severity: "Normal", title: `Autopilot ${on ? "on" : "off"}`, detail: on ? "Plant story resumed: faults develop and recover on their own" : "Manual control: scenarios change only when selected" });
  syncStory(ms);
}

function startHold(line: LineState, ms: MachineState): void {
  const st = ms.story;
  if (st.profile !== "advisory" && st.profile !== "critical") return;
  const list = PYRO_HOLDS[ms.id]?.[st.profile];
  if (!list?.length) return;
  const h = list[st.rotation % list.length];
  st.rotation += 1;
  setScenario(line, ms.id, h.id);
  // Fast-forward to the hold point over ~HOLD_LEAD minutes rather than jumping
  // there: a step change would (rightly) trip the RTD plausibility check.
  st.pace = Math.max(1, h.at / HOLD_LEAD);
  ms.fx.scMin = 0;
  ms.fx.hold = h.at;
  // A held fault is repaired at a planned stop after `holdMinutes` (± 20 %) and the next one develops.
  const hm = line.sim.holdMinutes;
  st.holdUntil = hm > 0 ? line.t + HOLD_LEAD + Math.round(hm * (0.8 + 0.4 * line.rand())) : Infinity;
}

/* ------------------------------------------------------------------ */
/* Events (live demo layer)                                            */
/* ------------------------------------------------------------------ */

/** Line drivers that move the operating point: a change holds every model-residual rule on the line, so the generator leaves them alone. */
const OPERATING_DRIVERS = new Set(["feed", "feedSp", "coal", "coalSp", "kilnSpeed", "idFan", "coolerAir", "ambient"]);

/**
 * Library scenarios the generator skips: compressed to a few minutes they do not reach their own finding
 * reliably (slow ramps, inventory faults, faults that read as a data-quality issue first). Still available as
 * manual triggers on the Simulation page. Measured headless (seed 20261014, lead 4 min).
 */
const EVENT_SKIP = new Set([
  "fsl-status-stuck",
  "fsl-gate-sticking",
  "fsl-silo-low",
  "fsl-silo-bridging",
  "kfs-sfm-backflow",
  "kln-scanner-underread",
  "kln-bearing-rtd-drift",
  "kln-oil-degradation",
  "clr-vib-loose-cable",
  "clr-ir-window-dirty",
  "hmr-bearing-lube",
  "csl-silo-full",
]);

function eventKindOf(sc: PyroScenario): Injection["kind"] {
  if (sc.group === "Custom") return "custom";
  if (sc.effects.some(isEquipmentEffect)) return "trip";
  return sc.group === "Sensor validation" ? "sensor" : "fault";
}

/**
 * Library scenarios the generator may raise on a machine: ones that end in a
 * finding, stay on their own machine (no trips, no operating-point moves) and
 * are not cross-machine line scenarios.
 */
export function eventPool(machine: string, kind: "sensor" | "fault"): PyroScenario[] {
  return (PYRO_SCENARIOS[machine] ?? []).filter(
    (sc) =>
      sc.expected.length > 0 &&
      !sc.id.startsWith("line-") &&
      !EVENT_SKIP.has(sc.id) &&
      eventKindOf(sc) === kind &&
      !sc.effects.some((e) => !isEquipmentEffect(e) && e.target.kind === "driver" && OPERATING_DRIVERS.has(e.target.name)),
  );
}

/** "+2h 40m" → 160 plant minutes (null when quiet). */
function detectionMinutes(sc: PyroScenario): number | null {
  const m = /(\d+)h\s*(\d+)m/.exec(sc.documentedDetection);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Scenario minute where the finding sits firmly raised: the calibrated hold point, else past the measured detection. */
function alertingMinute(machine: string, sc: PyroScenario): number {
  const held = PYRO_HOLDS[machine]?.advisory.find((h) => h.id === sc.id) ?? PYRO_HOLDS[machine]?.critical.find((h) => h.id === sc.id);
  if (held) return held.at;
  const det = detectionMinutes(sc) ?? 30;
  return det + Math.max(8, Math.round(det * 0.25));
}

/** Scenario minute an event has reached at `t`. */
function injectionMinute(j: Injection, t: number): number {
  return Math.min((t - j.start) * j.pace, j.target);
}

/** Most an event can grow to (× its starting scale). */
const GROW_MAX = 4;

/** Effect scale at `t`: full (growing by `grow` once in place) until `end`, then fading to zero over EVENT_FADE minutes. */
function injectionScale(j: Injection, t: number): number {
  const reached = Number.isFinite(j.target) ? j.start + j.target / j.pace : j.start;
  const grown = j.scale * Math.min(GROW_MAX, 1 + ((j.grow ?? 0) * Math.max(0, Math.min(t, j.end) - reached)) / 60);
  return t <= j.end ? grown : grown * Math.max(0, 1 - (t - j.end) / EVENT_FADE);
}

export interface InjectOptions {
  /** Minutes until it eases off (default: lead + `eventLife`; trips and custom faults run in real time). */
  life?: number;
  /** Severity scale (default `intensity`). */
  scale?: number;
  /** Share of `scale` added every 60 minutes once in place (keeps getting worse). */
  grow?: number;
  auto?: boolean;
}

/**
 * Layer a library or custom scenario on `machine` as an event. Faults are
 * time-compressed so they reach their alerting point in about `eventLead`
 * minutes and hold there; trips and custom faults run in real time.
 */
export function injectEvent(line: LineState, machine: string, scenarioId: string, opts: InjectOptions = {}): Injection | null {
  const ms = line.machines[machine];
  const sc = pyroScenario(machine, scenarioId);
  if (!ms || sc.id === "healthy") return null;
  const cfg = line.sim;
  const kind = eventKindOf(sc);
  const realTime = kind === "trip" || kind === "custom";
  const target = realTime ? Infinity : alertingMinute(machine, sc);
  const pace = realTime ? 1 : Math.max(1, target / Math.max(1, cfg.eventLead));
  const life = opts.life ?? (realTime ? Math.max(cfg.eventLife, 20) : Math.ceil(target / pace) + cfg.eventLife);
  const j: Injection = {
    id: ++line.injSeq,
    machine,
    scenarioId: sc.id,
    name: sc.name,
    kind,
    start: line.t,
    end: line.t + Math.max(1, Math.round(life)),
    target,
    pace,
    scale: opts.scale ?? cfg.intensity,
    ...(opts.grow ? { grow: opts.grow } : {}),
    auto: opts.auto ?? false,
  };
  line.injections.push(j);
  pushEvent(line, ms, {
    kind: "scenario",
    severity: "Normal",
    title: `Event: ${sc.name}`,
    detail: `${opts.auto ? "Event generator" : "Operator"} · ${kind === "sensor" ? "instrument fault" : kind === "trip" ? "equipment trip" : kind === "custom" ? "custom signal fault" : "equipment fault"} · expected ${sc.expected.join(", ") || "no alarm"}`,
  });
  syncStory(ms);
  return j;
}

/** Ease an event off now (its rules clear through hysteresis). */
export function clearEvent(line: LineState, id: number): void {
  const j = line.injections.find((x) => x.id === id);
  if (j && j.end > line.t) j.end = line.t;
}

export function clearEvents(line: LineState, machine?: string): void {
  for (const j of line.injections) if ((!machine || j.machine === machine) && j.end > line.t) j.end = line.t;
}

export function setLineSettings(line: LineState, patch: Partial<LineSimSettings>): void {
  const was = line.sim;
  line.sim = { ...was, ...patch, machines: { ...was.machines, ...(patch.machines ?? {}) } };
  // A faster cadence applies at once rather than after the old wait.
  if (patch.eventEvery !== undefined || (patch.events && !was.events)) line.nextEventAt = Math.min(line.nextEventAt, line.t + 1);
}

/** Generator: one event about every `eventEvery` minutes on a random allowed machine. */
function stepEvents(s: LineState): void {
  const t = s.t;
  s.injections = s.injections.filter((j) => t < j.end + EVENT_FADE);
  const cfg = s.sim;
  if (!cfg.events || cfg.eventEvery <= 0 || t < s.nextEventAt) return;
  s.nextEventAt = t + Math.max(1, Math.round(cfg.eventEvery * (0.8 + 0.4 * s.rand())));
  if (s.injections.filter((j) => j.auto && t < j.end).length >= cfg.maxEvents) return;
  if (!lineCalm(s)) {
    // Too soon after the last new fault: try again once the line's calm gap has passed.
    s.nextEventAt = s.calmUntil ?? t + 1;
    return;
  }
  if (raiseEvent(s, s.rand() < cfg.sensorShare ? "sensor" : "fault", undefined, true)) markChange(s);
}

/**
 * Raise one event from the pool now: on `machine`, or on the allowed machine
 * with the fewest running events. Skips scenarios already running there or
 * touching the signals of the machine's own scenario.
 */
export function raiseEvent(s: LineState, kind: "sensor" | "fault", machine?: string, auto = false): Injection | null {
  const t = s.t;
  const live = s.injections.filter((j) => t < j.end);
  const busy = new Set(live.map((j) => `${j.machine}:${j.scenarioId}`));
  const machines = machine ? [machine] : MACHINE_IDS.filter((id) => s.sim.machines[id] !== false);
  if (!machines.length) return null;
  // Machines with the fewest running events first, so alerts spread over the line.
  const load = (id: string) => live.filter((j) => j.machine === id).length;
  const least = Math.min(...machines.map(load));
  const order = machines.filter((id) => load(id) === least);
  for (let tries = 0; tries < 6; tries++) {
    const id = order[Math.floor(s.rand() * order.length)];
    const ms = s.machines[id];
    const own = pyroScenario(id, ms.scenarioId);
    const ownTags = new Set(own.effects.filter((e): e is PyroSignalEffect => !isEquipmentEffect(e)).map((e) => (e.target.kind === "signal" ? e.target.tag : e.target.name)));
    const pool = eventPool(id, kind).filter(
      (sc) =>
        sc.id !== ms.scenarioId &&
        !busy.has(`${id}:${sc.id}`) &&
        !sc.effects.some((e) => !isEquipmentEffect(e) && ownTags.has(e.target.kind === "signal" ? e.target.tag : e.target.name)),
    );
    if (pool.length) return injectEvent(s, id, pool[Math.floor(s.rand() * pool.length)].id, { auto });
  }
  return null;
}

export type { SignalFaultSpec } from "./scenarios";

/** Run a one-reading fault as an event in real time (its scenario id carries the whole fault; `signalFaultId`). */
export function injectSignalFault(line: LineState, spec: SignalFaultSpec): Injection | null {
  if (!line.machines[spec.machine]) return null;
  const sc = signalFaultScenario(spec);
  if (!sc) return null;
  registerPyroScenario(sc);
  return injectEvent(line, spec.machine, sc.id, { life: spec.life, scale: 1, grow: spec.grow });
}

const isHeld = (ms: MachineState) => ms.fx.hold !== null && (ms.story.profile === "advisory" || ms.story.profile === "critical");

export function setProfile(line: LineState, machine: string, profile: StoryProfile): void {
  const ms = line.machines[machine];
  if (!ms || ms.story.profile === profile) return;
  ms.story.profile = profile;
  if (profile === "advisory" || profile === "critical") {
    if (ms.scenarioId === "healthy" && ms.story.phase === "healthy") startHold(line, ms);
  } else if (profile === "healthy") {
    const sc = pyroScenario(machine, ms.scenarioId);
    if (sc.id !== "healthy" && ms.fx.repairStart === null) startRepair(line, ms, sc.expected[0] ?? sc.id, true);
  }
  syncStory(ms);
}

function mitigationNote(ruleId: string): string {
  if (/BRN|PHC-02/.test(ruleId)) return "Burner air re-balanced and coal rate trimmed";
  if (/CLR/.test(ruleId)) return "Compartment air raised and grate speed adjusted";
  if (/DQ/.test(ruleId)) return "Instrument set to manual and value substituted from witnesses";
  return "Load reduced and lubrication / cooling checked as a stop-gap";
}

function startRepair(line: LineState, ms: MachineState, ruleId: string, auto: boolean): void {
  const fx = ms.fx;
  if (fx.repairStart !== null) return;
  fx.repairStart = line.t;
  fx.repairFrom = Math.max(fx.intensity, 0.05);
  fx.repairDur = REPAIR_MIN;
  ms.story.phase = "recovering";
  const rule = pyroRule(ms.id, ruleId);
  pushEvent(line, ms, {
    kind: "action",
    severity: "Normal",
    title: `Repair started${rule ? `: ${ruleId} ${rule.name}` : ""}`,
    detail: `${auto ? "Maintenance dispatched automatically. " : ""}Fault clears toward the reference model over about ${REPAIR_MIN} min`,
    action: { ruleId, kind: "repair", auto },
  });
}

export function performAction(line: LineState, machine: string, ruleId: string, kind: OperatorAction, auto = false): void {
  const ms = line.machines[machine];
  if (!ms) return;
  const st = ms.story;
  const sc = pyroScenario(machine, ms.scenarioId);
  const rule = pyroRule(machine, ruleId);
  const label = rule ? `${ruleId} ${rule.name}` : ruleId;
  if (kind === "acknowledge") {
    st.acked = true;
    pushEvent(line, ms, { kind: "action", severity: "Normal", title: `Acknowledged ${label}`, detail: "Operator acknowledged the finding", action: { ruleId, kind, auto } });
  } else if (!sc.expected.length || ms.scenarioId === "healthy" || ms.fx.repairStart !== null) {
    pushEvent(line, ms, { kind: "action", severity: "Normal", title: `${kind === "repair" ? "Repair" : "Mitigation"} not needed for ${label}`, detail: "No active fault on the machine to act on" });
  } else if (kind === "mitigate") {
    if (!ms.fx.mitigated) {
      ms.fx.mitigated = true;
      st.mitigatedAt = line.t;
      st.phase = "mitigated";
      pushEvent(line, ms, { kind: "action", severity: "Normal", title: `Mitigation applied: ${label}`, detail: `${mitigationNote(ruleId)}. Severity halved and progression slowed; repair still needed`, action: { ruleId, kind, auto } });
    }
  } else startRepair(line, ms, ruleId, auto);
  syncStory(ms);
}

function stepBackground(_line: LineState, ms: MachineState): void {
  ms.bg = null;
}

/** True when a new fault may start now (the line's calm gap since the last one has passed). */
function lineCalm(line: LineState): boolean {
  return !line.sim.changeGap || line.t >= (line.calmUntil ?? 0);
}

/** A new fault started: hold the next one off for the calm gap (± 20 %). */
function markChange(line: LineState): void {
  const gap = line.sim.changeGap ?? 0;
  if (gap > 0) line.calmUntil = line.t + Math.round(gap * (0.8 + 0.4 * line.rand()));
}

function stepStory(line: LineState, ms: MachineState): void {
  const st = ms.story;
  const fx = ms.fx;
  const t = line.t;
  let sc = pyroScenario(ms.id, ms.scenarioId);
  const rules = PYRO_RULES_BY_MACHINE[ms.id] ?? [];

  if (fx.repairStart !== null && fx.intensity <= 0.001 && sc.id !== "healthy") {
    const fault = sc.expected.length > 0;
    beginScenario(line, ms, "healthy", true);
    st.settledAt = t;
    pushEvent(line, ms, {
      kind: "action",
      severity: "Normal",
      title: fault ? `Repair complete: ${sc.name}` : `${sc.name} ended`,
      detail: fault ? "Fault removed, rules clearing through hysteresis" : "Drivers back at baseline",
      action: fault ? { ruleId: sc.expected[0], kind: "complete", auto: st.autopilot } : undefined,
    });
    if (!fault) st.nextFaultAt = t + 12;
    sc = pyroScenario(ms.id, "healthy");
  }

  if (st.phase === "recovering" && sc.id === "healthy") {
    const quiet = rules.every((r) => ms.rules[r.id].status === "QUIET");
    if (quiet || t - st.settledAt > 45) {
      st.phase = "healthy";
      st.nextFaultAt = t + (st.profile === "story" ? 30 + ((st.rotation * 11) % 40) : 6);
      pushEvent(line, ms, { kind: "action", severity: "Normal", title: "Machine healthy again", detail: "All rules cleared; signals follow the reference model" });
    }
  } else if (st.phase === "developing") {
    if (sc.expected.some((id) => ms.rules[id]?.status === "ACTIVE")) {
      st.phase = "detected";
      st.detectedAt = t;
    } else if (st.autopilot && t - ms.scenarioStart > 480) startRepair(line, ms, sc.expected[0], true);
  }

  if (st.autopilot) stepBackground(line, ms);

  if (st.autopilot && isHeld(ms) && (st.phase === "developing" || st.phase === "detected")) {
    if (st.phase === "detected" && st.detectedAt !== null && !st.acked && t - st.detectedAt >= ACK_AFTER) performAction(line, ms.id, sc.expected[0], "acknowledge", true);
    if (t >= st.holdUntil && (st.phase === "detected" || t - ms.scenarioStart > 240) && lineCalm(line)) {
      pushEvent(line, ms, {
        kind: "action",
        severity: "Normal",
        title: `Repair complete: ${sc.name}`,
        detail: "Fault removed at the planned stop, rules clearing through hysteresis",
        action: { ruleId: sc.expected[0], kind: "complete", auto: true },
      });
      startHold(line, ms);
      markChange(line);
    }
  } else if (st.autopilot) {
    if ((st.phase === "detected" || st.phase === "mitigated") && st.detectedAt !== null) {
      const dt = t - st.detectedAt;
      const lead = sc.expected[0];
      if (!st.acked && dt >= ACK_AFTER) performAction(line, ms.id, lead, "acknowledge", true);
      if (st.phase === "detected" && dt >= MITIGATE_AFTER) performAction(line, ms.id, lead, "mitigate", true);
      if (dt >= REPAIR_AFTER && (st.phase === "detected" || (st.mitigatedAt !== null && t - st.mitigatedAt >= 25))) startRepair(line, ms, lead, true);
    } else if (st.phase === "healthy") {
      if (sc.id === "healthy") {
        if (t >= st.nextFaultAt && st.profile === "story") {
          const rot = storyRotation(ms.id);
          if (rot.length) {
            const id = rot[st.rotation % rot.length];
            st.rotation += 1;
            setScenario(line, ms.id, id);
            sc = pyroScenario(ms.id, id);
          }
        } else if (t >= st.nextFaultAt && (st.profile === "advisory" || st.profile === "critical") && lineCalm(line)) {
          startHold(line, ms);
          markChange(line);
          sc = pyroScenario(ms.id, ms.scenarioId);
        }
      } else if (fx.repairStart === null && t - ms.scenarioStart >= DISTURBANCE_MIN) {
        fx.repairStart = t;
        fx.repairFrom = Math.max(fx.intensity, 0.05);
        fx.repairDur = REPAIR_MIN;
      }
    }
  }
  st.label = storyLabel(ms);
}

/* ------------------------------------------------------------------ */
/* Limits (debounced announcements)                                    */
/* ------------------------------------------------------------------ */

function limitText(def: PyroSignalDef, sev: Severity): string {
  if (!def.limit) return "";
  const d = describeLimit(def.limit, def.unit);
  return sev === "Critical" ? d.alarm : d.warning;
}

function trackLimit(line: LineState, ms: MachineState, def: PyroSignalDef, sev: Severity, display: string, residual = 0): void {
  const m = (ms.limits[def.tag] ??= { shown: "Normal", next: "Normal", n: 0 });
  if (sev === m.shown) {
    m.next = sev;
    m.n = 0;
    return;
  }
  if (sev !== m.next) {
    m.next = sev;
    m.n = 0;
  }
  m.n += 1;
  const rising = sevRank[sev] > sevRank[m.shown];
  if (m.n < (rising ? LIMIT_RAISE_N : line.sim.events ? (line.sim.limitClear ?? LIVE_LIMIT_CLEAR_N) : LIMIT_CLEAR_N)) return;
  const was = m.shown;
  m.shown = sev;
  m.n = 0;
  if (rising) m.dir = residual >= 0 ? "high" : "low";
  const u = def.unit ? ` ${def.unit}` : "";
  pushEvent(line, ms, {
    kind: "limit",
    severity: sev,
    title: sev === "Normal" ? `${def.name} back within limits` : `${def.name} ${rising ? "beyond" : "eased to"} ${sev === "Critical" ? "danger" : "alert"} limit`,
    detail: `${def.tag} ${display}${u}${sev === "Normal" ? ` · was ${was === "Critical" ? "danger" : "alert"} (${limitText(def, was)})` : ` · limit ${limitText(def, sev)}`}`,
  });
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

type WarmLine = Omit<LineState, "rand" | "machines"> & { machines: Record<string, Omit<MachineState, "frame">> };
const warmCache = new Map<number, { state: WarmLine; rng: number }>();

/** Healthy warm-up, deterministic per seed, run once per process and cloned. */
function warmLine(seed: number): LineState {
  let warm = warmCache.get(seed);
  if (!warm) {
    const rand = mulberry32(seed);
    const s = blankLine(rand);
    for (let i = 0; i < HISTORY_LEN; i++) stepLine(s, false);
    for (const ms of Object.values(s.machines)) {
      ms.events = [];
      ms.frame = null;
    }
    const { rand: _r, ...rest } = s;
    void _r;
    warm = { state: rest as WarmLine, rng: rand.state() };
    warmCache.set(seed, warm);
  }
  const state = structuredClone(warm.state) as unknown as LineState;
  state.rand = mulberry32(warm.rng);
  return state;
}

export function createLine(seed = 20261014): LineState {
  const s = warmLine(seed);
  stepLine(s, true);
  return s;
}

/**
 * An independent line forked from a running one at its current minute: the
 * same process state and timers, its own random stream from `seed`, so noise,
 * events and faults go their own way from here (a copy joining a running plant).
 */
export function forkLine(s: LineState, seed: number): LineState {
  const f = thawLine(freezeLine(s));
  f.rand = mulberry32(seed);
  return f;
}

/** A running line as structured-cloneable data: the PRNG as its state, frames without their defs. */
export type FrozenLine = Omit<LineState, "rand"> & { rand: number; mem: HealthMem | undefined };

/** Snapshot `s` to post across a worker boundary; `thawLine` resumes the exact same run. */
export function freezeLine(s: LineState): FrozenLine {
  const machines = Object.fromEntries(
    Object.entries(s.machines).map(([id, ms]) => [id, { ...ms, frame: ms.frame && ({ ...ms.frame, defs: undefined } as unknown as SimFrame) }]),
  );
  return { ...s, rand: s.rand.state(), machines, mem: lineMemory(s) };
}

export function thawLine(f: FrozenLine): LineState {
  const machines = Object.fromEntries(
    Object.entries(f.machines).map(([id, ms]) => [id, { ...ms, frame: ms.frame && { ...ms.frame, defs: PYRO_DEFS[id] } }]),
  );
  const { mem, ...rest } = f;
  const s: LineState = { ...rest, rand: mulberry32(f.rand), machines };
  adoptLineMemory(s, mem);
  // A snapshot from before the OSW-PE-SNL-PYR-01 sensor list: WGT-KFS-01 was the whole bin (now load cell 1),
  // FLO-KFS-01 the whole kiln feed (now SFM A, half) and POS-KFS-01 a % dosing gate (now gate A open / closed).
  if (!s.hist["WGT-KFS-02"]) {
    for (const h of [s.hist, s.modelHist]) {
      if (h["WGT-KFS-01"]) h["WGT-KFS-01"] = h["WGT-KFS-01"].map((v) => v * LOAD_CELL_SHARE[0]);
      if (h["FLO-KFS-01"]) h["FLO-KFS-01"] = h["FLO-KFS-01"].map((v) => v / 2);
      if (h["POS-KFS-01"]) h["POS-KFS-01"] = h["POS-KFS-01"].map(() => 1);
    }
    for (const [i, k] of LOAD_CELL_SHARE.entries()) if (i > 0) for (const h of [s.hist, s.modelHist]) h[`WGT-KFS-0${i + 1}`] = (h["WGT-KFS-01"] ?? []).map((v) => (v / LOAD_CELL_SHARE[0]) * k);
  }
  // Signals added to the catalogue after the snapshot was taken start with a flat history at their base value.
  for (const def of SERIES_SIGNALS) {
    const flat = () => s.times.map(() => (def.type === "state" ? 1 : def.base));
    if (!s.hist[def.tag]) s.hist[def.tag] = flat();
    if (!s.modelHist[def.tag]) s.modelHist[def.tag] = flat();
    if (!s.qualHist[def.tag]) s.qualHist[def.tag] = s.times.map(() => 0);
  }
  // A live snapshot from before the calm pacing (a fault every few seconds): take the calm live pacing, keeping
  // the noise, health and machine choices the snapshot carries.
  if (s.sim.events && (s.sim.pacing ?? 0) < (LIVE_SIM_SETTINGS.pacing ?? 0)) {
    const { eventEvery, eventLead, eventLife, maxEvents, intensity, holdMinutes, changeGap, pacing } = LIVE_SIM_SETTINGS;
    s.sim = { ...s.sim, eventEvery, eventLead, eventLife, maxEvents, intensity, holdMinutes, changeGap, pacing };
    s.nextEventAt = Math.min(s.nextEventAt, s.t + 1);
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* Step                                                                */
/* ------------------------------------------------------------------ */

/**
 * Advance the whole line one simulated minute and return each machine's frame.
 * `emit: false` skips copying histories (warm-up and fast-forward minutes).
 */
export function stepLine(s: LineState, emit = true): Record<string, SimFrame> {
  s.t += 1;
  const t = s.t;
  const rnd = s.rand;
  const gauss = () => {
    const u = 1 - rnd();
    const v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const ar = (key: string, sigma: number, phi = 0.82) => {
    const prev = s.ar[key] ?? 0;
    const next = phi * prev + Math.sqrt(1 - phi * phi) * sigma * gauss();
    s.ar[key] = next;
    return next;
  };

  stepEvents(s);

  /* ---------------- per-machine scenario progression ---------------- */
  const scenarioOf: Record<string, PyroScenario> = {};
  const smOf: Record<string, number> = {};
  for (const ms of Object.values(s.machines)) {
    const sc = pyroScenario(ms.id, ms.scenarioId);
    scenarioOf[ms.id] = sc;
    const fx = ms.fx;
    // Live demo: a held fault keeps slowly worsening (as a real one would) instead of sitting still, so its
    // readings trend toward the next limit and the prognosis has a time left to show.
    if (fx.hold !== null && s.sim.events && fx.repairStart === null && !fx.mitigated && fx.scMin >= fx.hold) fx.hold += s.sim.holdCreep ?? HOLD_CREEP;
    const advanced = fx.scMin + (fx.repairStart !== null ? 0 : fx.mitigated ? 0.3 : ms.story.pace);
    const sm = fx.hold !== null ? Math.min(advanced, Math.max(fx.hold, fx.scMin)) : advanced;
    fx.scMin = sm;
    smOf[ms.id] = sm;
    if (fx.repairStart !== null) fx.intensity = Math.max(0, fx.repairFrom * (1 - (t - fx.repairStart) / fx.repairDur));
    else fx.intensity += ((fx.mitigated ? 0.5 : 1) - fx.intensity) * 0.12;
  }

  /* ---------------- scenario effects (all machines layered) ---------------- */
  const driverDelta: Record<string, number> = {};
  const physDelta: Record<string, number> = {};
  const sensorDelta: Record<string, number> = {};
  const stateOverride: Record<string, string> = {};
  const holdTags = new Set<string>();
  const staleTags = new Set<string>();
  const profileDelta = { hotSpot: 0, coldBand: 0, warmBand: 0, hotBand: 0, outletEnd: 0 };

  /** Equipment trips / stops of the scenarios (contract §1); a repair (intensity < 0.3) restarts the unit. */
  const forced: Partial<Record<EquipmentId, EquipmentState>> = {};
  for (const ms of Object.values(s.machines)) {
    const scenario = scenarioOf[ms.id];
    const bgScenario = ms.bg && t <= ms.bg.end ? pyroScenario(ms.id, ms.bg.scenarioId) : null;
    // Events on this machine: each one's effects at its own (compressed) scenario minute and fade.
    const events = s.injections
      .filter((j) => j.machine === ms.id)
      .map((j) => ({ sc: pyroScenario(ms.id, j.scenarioId), at: injectionMinute(j, t), scale: injectionScale(j, t) }));
    const equipmentLayers = [
      ...scenario.effects.map((e) => ({ e, at: smOf[ms.id], scale: ms.fx.intensity })),
      ...(bgScenario ? bgScenario.effects.map((e) => ({ e, at: t - ms.bg!.start, scale: 1 })) : []),
      ...events.flatMap((v) => v.sc.effects.map((e) => ({ e, at: v.at, scale: v.scale }))),
    ];
    for (const { e, at, scale } of equipmentLayers) {
      if (!isEquipmentEffect(e) || scale < 0.3 || at < e.onsetMin || (e.untilMin !== undefined && at >= e.untilMin)) continue;
      if (forced[e.equipment] !== "tripped") forced[e.equipment] = e.state;
    }
    const mainEffects = scenario.effects.filter((e): e is PyroSignalEffect => !isEquipmentEffect(e));
    const bgEffects = bgScenario ? bgScenario.effects.filter((e): e is PyroSignalEffect => !isEquipmentEffect(e)) : [];
    const mainTags = new Set(mainEffects.map((e) => (e.target.kind === "signal" ? e.target.tag : e.target.name)));
    const layered = [
      ...mainEffects.map((e) => ({ e, at: smOf[ms.id], scale: ms.fx.intensity })),
      ...bgEffects.filter((e) => !mainTags.has(e.target.kind === "signal" ? e.target.tag : e.target.name)).map((e) => ({ e, at: t - ms.bg!.start, scale: 1 })),
      ...events.flatMap((v) =>
        v.sc.effects
          .filter((e): e is PyroSignalEffect => !isEquipmentEffect(e) && !mainTags.has(e.target.kind === "signal" ? e.target.tag : e.target.name))
          .map((e) => ({ e, at: v.at, scale: v.scale })),
      ),
    ];
    for (const { e, at, scale } of layered) {
      let lvl = effectLevel(e as never, at);
      if (lvl === 0 || ((e.state || e.hold || e.stale) && lvl < 0)) continue;
      if (e.state || e.hold || e.stale) {
        if (scale < 0.3) continue;
      } else lvl *= scale;
      const tg = e.target;
      if (tg.kind === "driver") driverDelta[tg.name] = (driverDelta[tg.name] ?? 0) + (e.delta ?? 0) * lvl;
      else if (tg.kind === "profile") profileDelta[tg.name] += (e.delta ?? 0) * lvl;
      else {
        if (e.state) stateOverride[tg.tag] = e.state;
        if (e.hold || e.stale) holdTags.add(tg.tag);
        if (e.stale) staleTags.add(tg.tag);
        if (e.delta) {
          const bucket = e.sensor ? sensorDelta : physDelta;
          bucket[tg.tag] = (bucket[tg.tag] ?? 0) + e.delta * lvl;
        }
      }
    }
  }

  /* ---------------- true drivers ---------------- */
  const { clock, day } = formatClock(t);
  const hourOfDay = ((((EPOCH_MIN + t) % 1440) + 1440) % 1440) / 60;
  /* ---------------- line control: equipment states, interlocks, commanded rates ---------------- */
  const P = s.plant;
  const ctl = controlLine(P, t, forced);
  const eq = ctl.eq;
  const run = (id: EquipmentId) => eq[id] === "run";
  // What the edge sees (run feedback); units without feedback are assumed running by the model and the rules.
  const eqObs = observedEquipment(eq);
  const runObs = (id: EquipmentId) => eqObs[id] === "run";
  const tagRunning = (tag: string) => unitRunning(eqObs, tag);
  // Equipment state changes and line stops are events on the owning machine.
  if (t > 0) {
    for (const id of EQUIPMENT_IDS) {
      if (eq[id] === P.eq[id]) continue;
      const ms = s.machines[EQUIPMENT_MACHINE[id]];
      const sev: Severity = eq[id] === "tripped" ? "Critical" : eq[id] === "run" ? "Normal" : "Alert";
      pushEvent(s, ms, { kind: "state", severity: sev, title: `${EQUIPMENT_LABEL[id]} ${eq[id] === "run" ? "running" : eq[id]}`, detail: `${id}: ${P.eq[id]} → ${eq[id]}${forced[id] ? "" : " (interlock / change-over)"}` });
    }
    if (ctl.lineStop && P.lineStopSince === null) for (const ms of Object.values(s.machines)) pushEvent(s, ms, { kind: "state", severity: "Alert", title: "Line stop: kiln feed off", detail: `Cause: ${ctl.cause}. Kiln feed stopped${ctl.cause && /fan|drive|flame/.test(ctl.cause) ? " and fuel cut at once" : ", fuel cut over 5 min"}; kiln turned down` });
    if (!ctl.lineStop && P.lineStopSince !== null) for (const ms of Object.values(s.machines)) pushEvent(s, ms, { kind: "state", severity: "Normal", title: "Line restart", detail: "Kiln feed, coal and speed ramp back at 2 % / min" });
  }
  for (const id of EQUIPMENT_IDS) {
    if (eq[id] === "run") delete P.downSince[id];
    else P.downSince[id] ??= t;
  }
  P.eq = eq;
  P.lineStopSince = ctl.lineStop ? (P.lineStopSince ?? t) : null;
  P.lineStopCause = ctl.cause;
  // Slow process heat while the line is stopped or ramping back (refractory and cooler bed hold their heat).
  const slowHeat = ctl.lineStop || P.feedCmd < 0.98;

  const feedSp = (F0 + (driverDelta.feedSp ?? 0)) * P.feedCmd;
  const headSp = clamp(P.binLevel / 12, 0, 1);
  const coalSp = (C0 + (driverDelta.coalSp ?? 0)) * P.coalCmd * headSp;
  const speedRef = run("kln-main-drive") ? (N0 + (driverDelta.kilnSpeed ?? 0)) * P.speedCmd : run("kln-aux-drive") ? AUX_SPEED : 0;
  const fanRef = run("phc-idfan") ? S0 + (driverDelta.idFan ?? 0) : 0;
  // Dosing loses head below 12 % bin level and surges below 20 % (D5 FP-01 / 9.4.5 row 1: feed bin → feed swing).
  const head = clamp(P.binLevel / 12, 0, 1);
  const surge = P.binLevel < 20 ? 0.07 * (1 - P.binLevel / 20) * Math.sin((2 * Math.PI * t) / 5) : 0;
  const feeding = P.feedCmd > 0.001;
  const firing = P.coalCmd > 0.001 && run("brn-coal-feeder") && run("brn-coal-blower");
  const feedNoise = ar("d:feed", 1.0, 0.9);
  const coalNoise = ar("d:coal", 0.04, 0.9);
  const speedNoise = ar("d:speed", 0.004, 0.9);
  const fanNoise = ar("d:fan", 1.0, 0.9);
  const truthDrivers: Drivers = {
    feed: feeding ? Math.max(0, ((F0 + (driverDelta.feed ?? 0)) * P.feedCmd * (1 + surge) + feedNoise) * head) : 0,
    // Coal is ratio-trimmed to the delivered feed when the dosing loses head.
    coal: firing ? Math.max(0, (C0 + (driverDelta.coal ?? 0)) * P.coalCmd * head + coalNoise) : 0,
    kilnSpeed: run("kln-main-drive") ? (N0 + (driverDelta.kilnSpeed ?? 0)) * P.speedCmd + speedNoise : run("kln-aux-drive") ? AUX_SPEED + 0.1 * speedNoise : 0,
    // A tripped ID fan coasts down over a few minutes.
    idFan: lagStep(P.lag, "T:fan", fanRef + (run("phc-idfan") ? fanNoise : 0), 0, run("phc-idfan") ? 0 : 3),
    coolerAir: 1 + (driverDelta.coolerAir ?? 0) + ar("d:air", 0.003, 0.9),
    ambient: TA0 + 4 * Math.sin((2 * Math.PI * (hourOfDay - 10)) / 24) + (driverDelta.ambient ?? 0),
    idDamper: DAMPER0,
  };

  // Outlet sector-plate cooling fan lost: the outlet end of the shell runs hot (D5 FP-29), over ~30 min.
  profileDelta.outletEnd += lagStep(P.lag, "T:outletShell", run("kln-outlet-fan") ? 0 : 45, 0, 30);

  /* ---------------- shell profile (true) ---------------- */
  // Expected profile (D5 Table 9.5): more coal heats the shell, more feed absorbs heat, a faster kiln carries a thinner
  // bed and less coating, the ambient shifts the surface loss.
  const fuelShift = (c: number, feed: number, amb: number, speed: number) => 60 * (c / C0 - 1) - 25 * (feed / F0 - 1) - 15 * (speed / N0 - 1) + 0.4 * (amb - TA0);
  // Full-circumference band with soft edges: 1 inside [a, b], cosine taper over `edge` metres outside.
  const band = (xm: number, a: number, b: number, edge: number) =>
    xm >= a && xm <= b ? 1 : xm < a - edge || xm > b + edge ? 0 : 0.5 * (1 + Math.cos((Math.PI * (xm < a ? a - xm : xm - b)) / edge));
  const shellBase: number[] = [];
  const shellTrue: number[] = [];
  // Part of the true field that is local around the circumference (refractory hot spot); bands are full-circumference.
  const shellLocal: number[] = [];
  for (let i = 0; i < PROFILE_N; i++) {
    const xm = i * 0.5;
    const base = shellBaseline(xm) + fuelShift(truthDrivers.coal, truthDrivers.feed, truthDrivers.ambient, truthDrivers.kilnSpeed);
    shellBase.push(base);
    const hot = profileDelta.hotSpot * Math.exp(-Math.pow((xm - HOT_SPOT_M) / HOT_SPOT_SIGMA, 2));
    // Ring / coating build-up: cold band across the shell at about 30–36 m (D5 Fig. 5.4.8).
    const cold = profileDelta.coldBand * band(xm, 30.5, 35.5, 1.5);
    // Coating loss: broad warm area in the burning zone; flame impingement: narrower hot band near the flame tip.
    const warm = profileDelta.warmBand * band(xm, 46, 58, 3) + profileDelta.hotBand * band(xm, 54, 58, 2);
    // Outlet cooling loss: the outlet end (66–74 m) runs hot.
    const outlet = profileDelta.outletEnd * (xm <= 64 ? 0 : xm >= 70 ? 1 : 0.5 * (1 - Math.cos((Math.PI * (xm - 64)) / 6)));
    shellLocal.push(Math.max(0, hot));
    shellTrue.push(base + hot + cold + warm + outlet);
  }
  const tyreIdx = TYRE_M.map((m) => Math.round(m * 2));
  const tyreDelta = (prof: number[]) => tyreIdx.map((i) => prof[i] - shellBaseline(i * 0.5));

  /* ---------------- plant: mass balance silo → bin → kiln, kiln → cooler → crusher → silo ---------------- */
  const TI = P.truth;
  // A broken pan-conveyor chain stops transport like a stopped conveyor (the drive still runs at no-load).
  const chainBreak = (driverDelta.chainBreak ?? 0) >= 0.5 ? 1 : 0;
  const discharge = run("hmr-crusher") && run("csl-conveyor") && !chainBreak;
  const zT = zoneStep(P.lag, "T:", truthDrivers.feed, clamp(driverDelta.mealLoss ?? 0, 0, 1), truthDrivers.kilnSpeed, eq, TI, discharge);
  // Feed silo: the raw mill fills it in a level band; extraction keeps the weigh bin at its set-point (load-cell control)
  // within a capacity that needs aeration, an open gate and no bridging.
  const aeration = lagStep(P.lag, "T:aer", run("fsl-blower-duty") ? 1 : run("fsl-blower-standby") ? 0.92 : 0, 0, 3);
  const extractionCap = 1.5 * F0 * aeration * clamp(1 + (driverDelta.extraction ?? 0), 0, 1.5) * (run("fsl-gate") ? 1 : 0);
  // Bin weight for the extraction control from the valid load cells (a flagged cell is left out, the others scaled up).
  const okCells = LOAD_CELL_SHARE.map((k, i) => [k, `WGT-KFS-0${i + 1}`] as const).filter(([, tg]) => !s.flags[tg]);
  const okShare = okCells.reduce((acc, [k]) => acc + k, 0);
  const wgtPrev = okCells.length ? okCells.reduce((acc, [k, tg]) => acc + (s.hist[tg]?.at(-1) ?? BIN_SP * k), 0) / okShare : BIN_SP;
  const extraction = clamp(truthDrivers.feed + BIN_GAIN * (BIN_SP - wgtPrev), 0, Math.min(extractionCap, TI.silo * 60));
  P.rawMill = P.rawMill ? TI.silo / SILO_T_PER_PCT < 74 : TI.silo / SILO_T_PER_PCT < 52;
  TI.silo = clamp(TI.silo + ((P.rawMill ? RAW_MILL : 0) - extraction) / 60, 0, 98.5 * SILO_T_PER_PCT);
  TI.bin = clamp(TI.bin + (extraction - truthDrivers.feed) / 60, 0, 98.5 * BIN_T_PER_PCT);
  P.coalMill = P.coalMill ? TI.coalBin / COALBIN_T_PER_PCT < 76 : TI.coalBin / COALBIN_T_PER_PCT < 52;
  TI.coalBin = clamp(TI.coalBin + ((P.coalMill ? COAL_MILL : 0) - truthDrivers.coal) / 60, 0, 98.5 * COALBIN_T_PER_PCT);
  P.cementMill = P.cementMill ? TI.cSilo / CSILO_T_PER_PCT > 48 : TI.cSilo / CSILO_T_PER_PCT > 62;
  const draw = P.cementMill ? CEMENT_MILL_DRAW * clamp(1 + (driverDelta.clinkerDraw ?? 0), 0, 2) : 0;
  TI.cSilo = clamp(TI.cSilo + ((F0 / CLINKER_FACTOR) * zT.fCsl - draw) / 60, 0, 99 * CSILO_T_PER_PCT);
  // Kiln float: without the thrust hydraulics the kiln creeps downhill toward its travel limit.
  P.axial = run("kln-thrust-hpu") ? P.axial + clamp(-P.axial, -0.3, 0.3) : Math.max(-42, P.axial - 0.12);
  // Cooler back-up (discharge blocked, grate stopped): the operator cuts the kiln feed (controlLine).
  P.backupSince = TI.bedHot > 1.6 || TI.bedCold > 1.6 ? (P.backupSince ?? t) : null;

  const truth = physics({
    d: truthDrivers,
    z: zT,
    eq,
    inv: TI,
    t,
    shellAtTyre: tyreDelta(shellTrue),
    th: (tag, x, tau) => lagStep(P.lag, `T:th:${tag}`, x, 0, tau),
    slowHeat,
    recupLoss: clamp(driverDelta.coolerRecup ?? 0, 0, 1),
    axial: P.axial,
    chainBreak: chainBreak,
    pulseStop: driverDelta.pulseStop ?? 0,
    coalSurge: truthDrivers.coal > 0 ? (driverDelta.coalSurge ?? 0) : 0,
  });
  for (const [tag, dlt] of Object.entries(physDelta)) if (tag in truth) truth[tag] += dlt;
  // A scripted red river (discharge physically hotter) also reaches the crusher bearings.
  if ((physDelta["TMP-CLR-08"] ?? 0) > 0 && run("hmr-crusher")) {
    const heat = lagStep(P.lag, "T:hotClinker", 0.04 * physDelta["TMP-CLR-08"] * zT.fHmr, 0, TAU_BEARING);
    truth["TMP-HMR-01"] += heat;
    truth["TMP-HMR-02"] += heat;
  }
  // A physical load change on a drive heats its motor winding with the winding's thermal lag (D5 9.4.2 physical neighbours).
  for (const [load, wdg, base, k] of [["ELE-KLN-01", "TMP-KLN-21", 64, 62], ["ELE-HMR-01", "TMP-HMR-03", 96, 52]] as const) {
    // A scenario that scripts the winding itself keeps its own value.
    if (physDelta[wdg] !== undefined) continue;
    const i0 = truth[load] - (physDelta[load] ?? 0);
    const extra = i0 > 0.05 * base ? k * (Math.pow(truth[load] / base, 2) - Math.pow(i0 / base, 2)) : 0;
    truth[wdg] += lagStep(P.lag, `T:wdg:${wdg}`, extra, 0, TAU_BEARING);
  }
  // Material levels are physical: a silo or bin is never below empty or above its brim.
  for (const def of ANALOG) if (def.unit === "%" && def.tag.startsWith("LEV-") && def.tag in truth) truth[def.tag] = clamp(truth[def.tag], 1, 98.5);
  P.binLevel = binWeight(truth) / BIN_T_PER_PCT;
  P.cSiloLevel = truth["LEV-CSL-01"];

  /* ---------------- readings ---------------- */
  const measured: Values = {};
  for (const def of ANALOG) {
    if (def.calculated || def.origin === "manual") continue;
    const base = truth[def.tag];
    if (base === undefined) continue;
    let noise = ar(`n:${def.tag}`, def.sigma * s.sim.noise, def.tag.startsWith("VIB") ? 0.6 : 0.75);
    // A stopped unit: the MCC reports zero current / speed, the flow meter its low-flow cut-off, a pickup only background.
    if (!unitRunning(eq, def.tag) || (def.tag === "FLO-BRN-01" && base < 0.01 * C0)) {
      if (/^(ELE|SPD|FLO)-/.test(def.tag) && base < 0.01 * Math.max(1, def.base)) noise = 0;
      else if (def.tag.startsWith("VIB")) noise *= 0.1;
      else if (def.tag.startsWith("PRS")) noise *= 0.3;
    }
    let v = base + noise + (sensorDelta[def.tag] ?? 0);
    if (def.tag.startsWith("GAS-") && def.unit.includes("ppm")) v = Math.max(0, v);
    if (def.tag.startsWith("VIB")) v = Math.max(0, v);
    // An instrument saturates at the ends of its calibrated D5 range; a gross sensor failure reads as a broken loop (sensor-meta).
    v = instrumentReading(def, v, sensorDelta[def.tag] ?? 0);
    if (holdTags.has(def.tag)) {
      if (s.holds[def.tag] === undefined) s.holds[def.tag] = s.hist[def.tag].at(-1) ?? v;
      v = s.holds[def.tag];
    }
    measured[def.tag] = v;
  }
  for (const tag of Object.keys(s.holds)) if (!holdTags.has(tag)) delete s.holds[tag];

  const states: Record<string, string> = {};
  for (const def of PYRO_SIGNALS) if (def.type === "state") states[def.tag] = stateOverride[def.tag] ?? def.states!.normal;
  // Switches are independent instruments: they see the true level / position, not the radar or the LVDT reading.
  const setState = (tag: string, value: string) => {
    if (stateOverride[tag] === undefined) states[tag] = value;
  };
  if (Math.abs(truth["POS-KLN-01"]) >= 40) setState("POS-KLN-02", "LIMIT");
  // Status points follow the equipment run states (D5 Table 6.13 controller status).
  setState("STS-FSL-02", run("fsl-blower-duty") ? "DUTY RUN" : run("fsl-blower-standby") ? "STANDBY RUN" : "NOT AVAILABLE");
  for (const k of [1, 2, 3, 4, 5, 6]) setState(`POS-FSL-0${k}`, run("fsl-gate") ? "OPEN" : eq["fsl-gate"] === "tripped" ? "FAULT" : "CLOSED");
  setState("STS-FSL-03", run("fsl-blower-duty") || run("fsl-blower-standby") ? "SEQUENCE RUN" : "HOLD");
  // Discharge gates A / B close when the kiln feed stops; the slide blower reports its own run state.
  for (const g of ["POS-KFS-01", "POS-KFS-02"]) setState(g, truth["FLO-KFS-01"] + truth["FLO-KFS-02"] > 0.02 * F0 ? "OPEN" : "CLOSED");
  setState("STS-KFS-01", run("kfs-airslide-blower") ? "RUNNING" : eq["kfs-airslide-blower"] === "tripped" ? "TRIPPED" : "STOPPED");
  setState("STS-KLN-11", run("kln-aux-drive") ? "RUNNING" : eq["kln-aux-drive"] === "tripped" ? "NOT READY" : states["STS-KLN-11"]);
  if (!run("kln-lube-pump")) setState("FLO-KLN-05", "NO FLOW");
  if (!run("kln-spray")) {
    if (eq["kln-spray"] === "tripped") setState("STS-KLN-05", "FAULT");
    for (const k of [1, 2, 3, 4, 5, 6]) setState(`PRX-KLN-0${k}`, "NO CYCLE");
  }
  // Gas analysers: hourly probe blowback holds their values; a scenario may force an analyser status (D5 Table 6.6).
  applyAnalyserCycle({ t, s, measured, states, stateOverride });

  // Dust on the scanner optics reads low (D5 §5.4.7, FP-27): about 3 K per % of coverage lost to the fouled window.
  // A scanner calibration / emissivity offset is a sensor effect on the map maximum (CAL-KLN-03).
  const scanBias = Math.min(0, measured["STS-KLN-08"] - 95.9) * 3 + (sensorDelta["CAL-KLN-03"] ?? 0);
  const shellProfile = shellTrue.map((v, i) => v + ar(`sh:${i % 8}`, 1.2, 0.6) + scanBias);

  /* ---------------- witnesses & measured drivers ---------------- */
  const flagged = (tag: string) => Boolean(s.flags[tag]);
  const nM = measured["SPD-KLN-01"] / N0;
  // Ambient from the 12 support-roller RTDs (D5 Table 9.4.1) less the model's load / speed rise of each (it lags the kiln).
  const ambSamples = ROLLER_TAGS.filter((tg) => !flagged(tg)).map((tg) => measured[tg] - (P.lag[`M:th:${tg}`]?.y ?? ROLLER_OFFSET[tg]));
  const ambientEst = median(ambSamples);
  // Kiln feed = solid-flow meters A + B (two parallel slides); a flagged meter is replaced by twice the other.
  const sfmA = flagged("FLO-KFS-01");
  const sfmB = flagged("FLO-KFS-02");
  const feedMeter = sfmA && !sfmB ? 2 * measured["FLO-KFS-02"] : sfmB && !sfmA ? 2 * measured["FLO-KFS-01"] : measured["FLO-KFS-01"] + measured["FLO-KFS-02"];
  const coalMeter = measured["FLO-BRN-01"];
  // Witnesses (D5 Table 5.2.6 "flow agrees with … elevator current"; Table 5.5.6 "flow agrees with burning-zone
  // response"). The kiln torque and the burning zone see the feed after the kiln transport lag (meter feed lagged the same way).
  const wMeal = lagStep(P.lag, "W:meal", feedMeter / F0, LAG.meal[0], LAG.meal[1]);
  const wBz = lagStep(P.lag, "W:burn", wMeal, LAG.burn[0], LAG.burn[1]);
  const feedElev = run("kfs-elevator") ? F0 * Math.pow(Math.max(0, (measured["ELE-KFS-01"] / 118 - 0.35) / 0.65), 1 / 1.1) : feedMeter;
  const torqueRel = measured["ELE-KLN-01"] / 64 / Math.pow(Math.max(nM, 0.05), 0.3);
  // The torque witness is the kiln's lagged load: during a real feed change it disagrees with the elevator and the vote
  // abstains; a meter step at a steady feed is out-voted at once.
  const feedTorque = run("kln-main-drive") ? F0 * Math.pow(Math.max(0, (torqueRel - 0.3) / 0.7), 1 / 0.9) : feedMeter;
  const coalLine = run("brn-coal-blower") ? C0 * Math.pow(Math.max(0, (measured["PRS-BRN-04"] / 410 - 0.1) / 0.9), 1 / 0.7) : coalMeter;
  const dM = Math.pow(measured["SPD-PHC-01"] / S0, 2);
  const coalBz = slowHeat ? coalMeter : C0 * (1 + (measured["TMP-KLN-14"] - BZ0 + 280 * (wBz - 1) + 60 * (dM - 1)) / 900);
  const feedForModel = sfmA && sfmB ? (feedElev + feedTorque) / 2 : feedMeter;
  const coalForModel = flagged("FLO-BRN-01") ? (coalLine + coalBz) / 2 : coalMeter;

  // Reference-model flows: the same transport lags and cooler bed on the measured feed and the known run states.
  const MI = P.model;
  // The model does not know about a broken chain (hidden fault): it expects the conveyor to carry the clinker.
  const zM = zoneStep(P.lag, "M:", feedForModel, 0, measured["SPD-KLN-01"], eqObs, MI, run("hmr-crusher") && run("csl-conveyor"));
  // Inventories: mass balance on the measured / commanded flows, held to the readings by a slow observer.
  {
    // No level sensor: the bin is observed through its three load cells; a flagged cell is replaced by the other two.
    const okCells = LOAD_CELL_SHARE.map((k, i) => [k, `WGT-KFS-0${i + 1}`] as const).filter(([, tg]) => !flagged(tg));
    const shareOk = okCells.reduce((acc, [k]) => acc + k, 0);
    const binObs = okCells.length ? okCells.reduce((acc, [, tg]) => acc + measured[tg], 0) / shareOk : MI.bin;
    const aerationM = lagStep(P.lag, "M:aer", run("fsl-blower-duty") ? 1 : run("fsl-blower-standby") ? 0.92 : 0, 0, 3);
    const capM = 1.5 * F0 * aerationM * (run("fsl-gate") ? 1 : 0);
    const extractionM = clamp(feedForModel + BIN_GAIN * (BIN_SP - wgtPrev), 0, capM);
    // The silos are large: the meter scatter integrates to well under 0.1 % a day, so their model is the pure mass
    // balance (a level reading that does not follow the flows shows as a residual). The small weigh bin is held to
    // its two instruments by a weak observer (τ ≈ 50 min) so the feed-meter scatter does not accumulate.
    MI.bin = clamp(MI.bin + (extractionM - feedForModel) / 60 + 0.02 * (binObs - MI.bin), 0, 98.5 * BIN_T_PER_PCT);
    MI.silo = clamp(MI.silo + ((P.rawMill ? RAW_MILL : 0) - extractionM) / 60, 0, 98.5 * SILO_T_PER_PCT);
    MI.coalBin = clamp(MI.coalBin + ((P.coalMill ? COAL_MILL : 0) - coalForModel) / 60, 0, 98.5 * COALBIN_T_PER_PCT);
    MI.cSilo = clamp(MI.cSilo + ((F0 / CLINKER_FACTOR) * zM.fCsl - (P.cementMill ? CEMENT_MILL_DRAW : 0)) / 60, 0, 99 * CSILO_T_PER_PCT);
  }
  // Cooler air from the running fans' currents (cube-root fan law over the bed's load share).
  const fanI = [1, 2, 3, 4, 5, 6]
    .filter((k) => !flagged(`ELE-CLR-0${k}`) && runObs(`clr-fan-${k}` as EquipmentId))
    .map((k) => Math.cbrt(measured[`ELE-CLR-0${k}`] / CLR_FAN_I[k - 1] / Math.pow(bedResistance(k <= 3 ? zM.bedHot : zM.bedCold), 0.3)));
  const airEst = fanI.length ? median(fanI) : 1;

  const modelDrivers: Drivers = {
    feed: feedForModel,
    coal: coalForModel,
    kilnSpeed: measured["SPD-KLN-01"],
    idFan: measured["SPD-PHC-01"],
    coolerAir: airEst,
    ambient: ambientEst,
    idDamper: measured["POS-PHC-01"],
  };

  /* ---------------- reference model ---------------- */
  const shellModel: number[] = [];
  for (let i = 0; i < PROFILE_N; i++) shellModel.push(shellBaseline(i * 0.5) + fuelShift(coalForModel, feedForModel, ambientEst, measured["SPD-KLN-01"]));
  const model = physics({
    d: modelDrivers,
    z: zM,
    eq: eqObs,
    inv: MI,
    t,
    shellAtTyre: tyreDelta(shellModel),
    th: (tag, x, tau) => lagStep(P.lag, `M:th:${tag}`, x, 0, tau),
    slowHeat,
    recupLoss: 0,
    axial: P.axial,
    chainBreak: 0,
    pulseStop: 0,
    coalSurge: 0,
  });
  // Oil pressure and filter ΔP follow the *measured* oil temperature; CO follows measured O₂.
  if (!flagged("TMP-KLN-15")) {
    model["PRS-KLN-04"] = 2.2 - 0.018 * (measured["TMP-KLN-15"] - 56);
    model["PRS-KLN-05"] = 0.65 - 0.012 * (measured["TMP-KLN-15"] - 54);
  }
  model["GAS-KLN-02"] = 420 + 2600 * Math.max(0, 1.6 - measured["GAS-KLN-01"]);
  model["GAS-PHC-02"] = 300 + 1600 * Math.max(0, 2.6 - measured["GAS-PHC-01"]);
  model["FLO-KFS-01"] = feedSp / 2;
  model["FLO-KFS-02"] = feedSp / 2;
  model["FLO-BRN-01"] = coalSp;
  // Speed references are the commands (main drive / aux drive / stopped); a tripped fan's reference is zero.
  model["SPD-KLN-01"] = speedRef;
  model["SPD-PHC-01"] = fanRef;
  model["STS-KLN-08"] = 95.9;
  // The grate stroke is controlled: its reference is the DCS controller's target, set on the clinker that actually reaches
  // the cooler (bed-depth control, minimum stroke on an emptying cooler). The controller has no run feedback from the
  // hydraulic unit (process-only unit), so a tripped grate still has its target: the stroke falls away from it.
  model["SPD-CLR-01"] = 10.5 * Math.max(zT.fIn, STROKE_MIN);

  /* ---------------- operating state (D4 §8.2 comparable state) ---------------- */
  // Running evidence: the machine's main unit runs (MCC run feedback, D5 Table 9.4.1 "motor run states").
  const running = machineRunning(eqObs);
  s.opHist.push({ feed: feedSp, coal: coalSp, speed: speedRef, fan: fanRef });
  if (s.opHist.length > TRANSIENT_WIN) s.opHist.shift();
  const opRange = (k: "feed" | "coal" | "speed" | "fan", n = TRANSIENT_WIN) => {
    const w = s.opHist.slice(-n).map((o) => o[k]);
    return Math.max(...w) - Math.min(...w);
  };
  const transient = opRange("feed") > 0.02 * F0 || opRange("coal") > 0.02 * C0 || opRange("speed") > 0.03 || opRange("fan") > 0.015 * S0;
  const feedSpSteady = opRange("feed", 15) < 1;

  /* ---------------- calculated & manual values ---------------- */
  // Thermal-map processing (D5 Table 9.5): the scan unrolled into the 0.5 m × 5° map, section statistics against the
  // expected profile, the hottest visible cell and the model value at that position, area above alert, cold / warm
  // bands, outlet end, and the last-good value of every cell (hidden cells keep it with its age).
  const shellMap = buildShellMap(shellProfile, shellModel, measured["STS-KLN-08"], t, shellLocal);
  measured["CAL-KLN-03"] = shellMap.max;
  model["CAL-KLN-03"] = shellModel[shellMap.maxI];
  const shellThermal: ShellThermal = (() => {
    const th = s.thermal;
    for (let j = 0; j < shellMap.temp.length; j++) {
      if (shellMap.mask[j]) continue;
      th.lastGood[j] = shellMap.temp[j];
      th.lastGoodAt[j] = t;
    }
    const areaAboveAlert = shellAreaAbove(shellMap, SHELL_ALERT);
    th.areaHist.push(areaAboveAlert);
    if (th.areaHist.length > 61) th.areaHist.shift();
    const i = shellMap.maxI;
    return {
      local: shellLocal,
      hotPos: shellMap.maxZ,
      hotAngle: shellMap.maxAngle,
      hotModel: shellModel[i],
      hotResidual: shellMap.max - shellModel[i],
      hotSpread: (shellMap.colMax[i] ?? shellMap.max) - (shellMap.colMean[i] ?? shellMap.max),
      areaAboveAlert,
      areaAboveDanger: shellAreaAbove(shellMap, SHELL_DANGER),
      areaAboveAlert1h: th.areaHist.length > 60 ? th.areaHist[0] : null,
      coldBand: shellColdBand(shellMap),
      warmBand: shellWarmBand(shellMap),
      outletResidual: shellSpanResidual(shellMap, 66, 74),
      coverageTarget: SHELL_COVERAGE_TARGET,
      lastGood: th.lastGood,
      lastGoodAt: th.lastGoodAt,
      handheld: null,
      findingMaps: th.findingMaps,
    };
  })();
  measured["CAL-KLN-06"] = measured["GAS-KLN-01"] - model["GAS-KLN-01"];
  model["CAL-KLN-06"] = 0;
  measured["CAL-PHC-01"] = measured["GAS-PHC-01"] - measured["GAS-KLN-01"];
  model["CAL-PHC-01"] = model["GAS-PHC-01"] - model["GAS-KLN-01"];
  // Coal-to-feed ratio: not computed while the kiln feed is off (below 5 % of design).
  const feedAB = measured["FLO-KFS-01"] + measured["FLO-KFS-02"];
  measured["CAL-BRN-01"] = feedAB >= 0.05 * F0 ? (measured["FLO-BRN-01"] / feedAB) * 100 : 0;
  model["CAL-BRN-01"] = feedSp * headSp >= 0.05 * F0 ? (coalSp / (feedSp * headSp)) * 100 : 0;
  {
    // Laboratory oil sample twice a day; handheld shell round every four hours.
    const lab = s.manual["LAB-KLN-01"];
    if (!lab || t - lab.at >= 720) {
      const fe = Math.max(0, truth["LAB-KLN-01"] + gauss() * 1.5);
      const wear = Math.max(0, (fe - 22) / 40);
      // Degrading oil thins and takes up water as wear iron rises (FP-17: viscosity, water, iron judged as numbers).
      const visc = 320 - wear * 25 + gauss() * 3;
      const water = Math.max(0, 140 + wear * 240 + gauss() * 20);
      s.manual["LAB-KLN-01"] = { value: fe, model: 22, at: t, visc, water, prev: lab ? { value: lab.value, at: lab.at } : undefined };
      const iso = [18, 16, 13].map((c) => c + Math.round(wear * 2));
      s.records.unshift({
        id: `LAB-KLN-01@${t}`,
        tag: "LAB-KLN-01",
        t,
        where: "Gearbox lubricating-oil sample port S-1 · qualified laboratory",
        method: "ICP-OES wear metals · ISO 4406 particle count · Karl Fischer water · ASTM D445 viscosity",
        value: Math.round(fe),
        unit: "ppm Fe",
        fields: [
          { label: "Sample point", value: "Lube skid return line, port S-1" },
          { label: "Viscosity 40 °C", value: `${visc.toFixed(0)} cSt` },
          { label: "Water", value: `${Math.round(water)} ppm` },
          { label: "Particles", value: `ISO 4406 ${iso.join("/")}` },
          { label: "Wear iron", value: `${Math.round(fe)} ppm` },
        ],
        by: "Plant laboratory — C. Zulu",
        review: "Pending review",
      });
    }
    const man = s.manual["MAN-KLN-01"];
    const zone = Math.round(MAN_ZONE_M * 2);
    if (!man || t - man.at >= HANDHELD_EVERY) {
      // Handheld round at the same metre / angle as scanner cells: the handheld reads the true shell (no optics), the
      // scanner cell is this minute's map (no view → no comparison at that point).
      const trueMap = buildShellMap(shellTrue, shellModel, 100, t, shellLocal);
      const points: HandheldPoint[] = HANDHELD_POINTS.map((p) => {
        const j = shellCell(p.m, p.angle);
        const hand = trueMap.temp[j] + gauss() * 3;
        const scan = shellMap.mask[j] ? null : shellMap.temp[j];
        return { m: p.m, angle: p.angle, hand, scan, gap: scan === null ? null : hand - emissivityMatched(scan) };
      });
      const main = points.find((p) => p.m === MAN_ZONE_M)!;
      // Operating state at the round: only a steady running kiln gives a comparable pair (SW-KLN-03).
      const comparable = running["PYR-KLN-01"] && !transient;
      s.manual["MAN-KLN-01"] = { value: main.hand, model: shellModel[zone], at: t, scan: main.scan ?? undefined, comparable, points };
      const sgn = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(0)}`;
      s.records.unshift({
        id: `MAN-KLN-01@${t}`,
        tag: "MAN-KLN-01",
        t,
        where: `Kiln shell round · ${HANDHELD_POINTS.map((p) => `${p.m} m · ${p.angle}°`).join(" / ")}`,
        method: "Calibrated handheld IR thermometer at the scanner cell positions (demo round every 4 h; D5: weekly)",
        value: Math.round(main.hand),
        unit: "°C",
        fields: [
          { label: "Station / metre / angle", value: HANDHELD_POINTS.map((p) => `${p.station} · ${p.m} m · ${p.angle}°`).join(" / ") },
          { label: "Emissivity, handheld / scanner", value: `${HANDHELD_EMISSIVITY.toFixed(2)} / ${SCANNER_EMISSIVITY.toFixed(2)}` },
          { label: "Handheld", value: `${main.hand.toFixed(0)} °C (52 m)` },
          { label: "Scanner (same zone)", value: main.scan === null ? "no view (52 m)" : `${main.scan.toFixed(0)} °C (52 m)` },
          ...points.map((p) => ({
            label: `${p.m} m · ${p.angle}°`,
            value: `handheld ${p.hand.toFixed(0)} °C · scanner ${p.scan === null ? "no view" : `${p.scan.toFixed(0)} °C`}${p.gap === null ? "" : ` · ${sgn(p.gap)} K`}`,
          })),
          {
            label: "Difference",
            value: main.gap === null ? "no scanner view at 52 m" : `${sgn(main.gap)} K at 52 m (emissivity-matched); worst ${sgn(points.reduce((w, p) => (p.gap !== null && Math.abs(p.gap) > Math.abs(w) ? p.gap : w), 0))} K`,
          },
          { label: "Operating state", value: comparable ? "Kiln running, steady operating point" : running["PYR-KLN-01"] ? "Kiln running, operating point changing — not comparable" : "Kiln stopped — not comparable" },
        ],
        by: "Shift operator — B. Mumba",
        review: "Pending review",
      });
    }
    const round = s.manual["MAN-KLN-01"];
    if (round?.points) shellThermal.handheld = { at: round.at, points: round.points };
    for (const r of s.records)
      if (r.review === "Pending review" && t - r.t >= 45) {
        r.review = "Reviewed";
        r.reviewedBy = r.tag === "LAB-KLN-01" ? "Reliability engineer — T. Phiri" : "Kiln process engineer — M. Banda";
        r.reviewedAt = t;
      }
    if (s.records.length > 40) s.records.length = 40;
    // The latest record is the current value of a manual tag; it never enters the per-minute history.
    for (const tag of ["LAB-KLN-01", "MAN-KLN-01"]) {
      measured[tag] = s.manual[tag].value;
      model[tag] = s.manual[tag].model;
    }
  }
  // Residual coupling the model cannot see for the coal-to-feed ratio when a meter is out-voted.
  if ((sfmA || sfmB || flagged("FLO-BRN-01")) && feedForModel >= 0.05 * F0) model["CAL-BRN-01"] = (coalForModel / feedForModel) * 100;

  /* ---------------- history ---------------- */
  s.times.push(t);
  if (s.times.length > HISTORY_LEN) s.times.shift();
  for (const def of SERIES_SIGNALS) {
    const h = s.hist[def.tag];
    const mh = s.modelHist[def.tag];
    if (def.type === "state") {
      h.push(states[def.tag] === def.states!.normal ? 1 : 0);
      mh.push(1);
    } else {
      h.push(measured[def.tag]);
      mh.push(model[def.tag]);
    }
    if (h.length > HISTORY_LEN) h.shift();
    if (mh.length > HISTORY_LEN) mh.shift();
  }

  const res = (tag: string) => measured[tag] - model[tag];
  const sig = (tag: string) => PYRO_SIGNAL_BY_TAG[tag].sigma || 1;
  const z = (tag: string) => res(tag) / sig(tag);
  const meanRes = (tag: string, n = 10) => {
    const h = s.hist[tag];
    const mh = s.modelHist[tag];
    const k = Math.min(n, h.length);
    let acc = 0;
    for (let i = h.length - k; i < h.length; i++) acc += h[i] - mh[i];
    return k ? acc / k : 0;
  };
  const resStd = (tag: string, n = 15) => {
    const h = s.hist[tag];
    const mh = s.modelHist[tag];
    const k = Math.min(n, h.length);
    if (k < 4) return 0;
    const rs: number[] = [];
    for (let i = h.length - k; i < h.length; i++) rs.push(h[i] - mh[i]);
    const m = rs.reduce((a, b) => a + b, 0) / k;
    return Math.sqrt(rs.reduce((a, b) => a + (b - m) * (b - m), 0) / k);
  };
  const ratio = (tag: string) => measured[tag] / Math.max(0.05, model[tag]);

  /* ---------------- data quality (R-DQ-01) & sensor validation (R-DQ-02) ---------------- */
  const ownerOf = (tag: string) => s.machines[PYRO_SIGNAL_BY_TAG[tag]?.machine ?? ""] ?? null;
  const screen = screenQuality({
    t,
    s,
    measured,
    states,
    running,
    res,
    sig,
    staleTags,
    transient,
    // Units stopped by the line interlocks are already "stopped" here; the cooler, burner air and kiln keep running at a line stop.
    equipment: eqObs,
    witnesses: { feedElev, feedTorque, feedMeter, coalLine, coalBz, coalMeter },
    notify: (tag, severity, title, detail) => {
      const ms = ownerOf(tag);
      if (ms && t > 0) pushEvent(s, ms, { kind: "quality", severity, title, detail });
    },
  });
  const { scannerSuspect } = screen;
  const quality = signalQuality(s, screen);
  const good = (...tags: string[]) => tags.every((tg) => quality(tg) === "Good");
  const steadyFeed = ["FLO-KFS-01", "FLO-KFS-02"].every((tg) => Math.abs(z(tg)) < 4 && resStd(tg, 10) < 2.5 / Math.SQRT2);
  const steadyCoal = Math.abs(z("FLO-BRN-01")) < 4 && resStd("FLO-BRN-01", 10) < 0.15;

  // Per-sample validity, aligned with the history (Trends greys out invalid / suspect spans).
  for (const def of SERIES_SIGNALS) {
    const q = quality(def.tag);
    const qh = s.qualHist[def.tag];
    qh.push(q === "Good" ? 0 : q === "Suspect" ? 1 : 2);
    if (qh.length > HISTORY_LEN) qh.shift();
  }
  // Scanner map history: one map per scan interval, so zones can be compared scan to scan and shift to shift.
  const scanNow = (((t % SCAN_EVERY) + SCAN_EVERY) % SCAN_EVERY) === 0;
  if (scanNow) {
    s.shellScans.push({ t, profile: shellProfile, coverage: measured["STS-KLN-08"], valid: !scannerSuspect && quality("STS-KLN-08") === "Good", local: shellLocal, model: shellModel });
    if (s.shellScans.length > SCAN_KEEP) s.shellScans.shift();
  }
  // Maps around every shell finding kept at full resolution (D5 Table 5.4.7a storage, Table 9.5 "map snapshot attached
  // to each finding"): from one hour before the finding became active to one hour after, beyond the rolling scan store.
  {
    const kilnRules = s.machines["PYR-KLN-01"]?.rules ?? {};
    const fm = s.thermal.findingMaps;
    for (const id of THERMAL_FINDINGS) {
      const mem = kilnRules[id];
      if (!mem || mem.status !== "ACTIVE" || mem.since === null || fm.some((f) => f.ruleId === id && f.since === mem.since)) continue;
      const since = mem.since;
      const maps = s.shellScans.filter((sc) => sc.t >= since - 60).map((sc) => ({ t: sc.t, profile: sc.profile, model: sc.model, local: sc.local, coverage: sc.coverage }));
      if (!scanNow) maps.push({ t, profile: shellProfile, model: shellModel, local: shellLocal, coverage: measured["STS-KLN-08"] });
      fm.unshift({ ruleId: id, since, maps });
      if (fm.length > FINDING_MAPS_KEEP) fm.length = FINDING_MAPS_KEEP;
    }
    if (scanNow) for (const f of fm) if (t <= f.since + 60 && f.maps.at(-1)?.t !== t) f.maps.push({ t, profile: shellProfile, model: shellModel, local: shellLocal, coverage: measured["STS-KLN-08"] });
  }
  // Shell residual along the kiln (scanner minus profile model), for the localised-gradient and burner shell checks.
  const shellRes = shellProfile.map((v, i) => v - shellModel[i]);
  const shellResMean = (fromM: number, toM: number) => {
    let acc = 0;
    let k = 0;
    for (let i = Math.round(fromM * 2); i <= Math.min(PROFILE_N - 1, Math.round(toM * 2)); i++) {
      acc += shellRes[i];
      k++;
    }
    return k ? acc / k : 0;
  };

  // Handheld IR round at the cooler discharge every 4 h (D5 Table 5.6.6 "compare with handheld"; SV-CLR-01).
  // Internal comparison value only, not a catalogue signal or dated record: D5 fixes the catalogue at 161 online entries
  // plus two manual records (LAB-KLN-01, MAN-KLN-01). Deterministic reading scatter (±4 K) so the line's random
  // sequence is untouched.
  if (!s.manual["MAN-CLR-01"] || t - s.manual["MAN-CLR-01"].at >= 240) {
    const u = Math.sin(t * 78.233) * 43758.5453;
    s.manual["MAN-CLR-01"] = { value: truth["TMP-CLR-08"] + 8 * (u - Math.floor(u) - 0.5), model: model["TMP-CLR-08"], at: t, scan: measured["TMP-CLR-08"], comparable: running["PYR-CLR-01"] && !transient };
  }

  /* ---------------- rules ---------------- */
  const hits: Record<string, Record<string, Hit>> = Object.fromEntries(MACHINE_IDS.map((id) => [id, {}]));
  evaluateRules({
    t,
    s,
    measured,
    model,
    states,
    drivers: modelDrivers,
    running,
    equipment: eqObs,
    lineStop: ctl.lineStop,
    tagRunning,
    transient,
    feedSp,
    coalSp,
    feedSpSteady,
    steadyFeed,
    steadyCoal,
    shellProfile,
    shellModel,
    shellRes,
    shellResMean,
    tyreIdx,
    scannerSuspect,
    thermal: shellThermal,
    res,
    sig,
    z,
    meanRes,
    resStd,
    ratio,
    quality,
    good,
    flagged,
    hits,
    H: (machine, id, h) => {
      hits[machine][id] = h;
    },
  });

  /* ---------------- per-machine output ---------------- */
  const frames: Record<string, SimFrame> = {};
  const drivers = {
    feed: feedMeter,
    feedSp,
    fuel: coalMeter,
    fuelSp: coalSp,
    speed: measured["SPD-KLN-01"],
    draft: measured["PRS-KLN-01"],
    ambientEst,
  };

  for (const id of MACHINE_IDS) {
    const ms = s.machines[id];
    const defs = PYRO_DEFS[id];
    const ruleDefs = PYRO_RULES_BY_MACHINE[id] ?? [];
    const mHits = hits[id];
    // Comparable operating state (D4 §8.2): while the machine is stopped, condition rules hold their
    // last judgement; during an operating-point change, model-residual rules hold theirs (status
    // evidence such as a tripped blower or a silent spray circuit is still judged).
    const stopped = !running[id];
    // A stopped machine still judges state evidence (a trip, a status point), so the cause of its stop is reported.
    // Urgent (critical, one-sample) findings are never frozen by a stop either (D5 9.4.5: 1 sample for urgent faults), and a
    // state rule that is building or confirmed keeps being judged, so it also clears while the machine stands.
    const urgent = (hit: Hit | undefined) => !!hit && (hit.stateRule || hit.severity === "Critical");
    const frozen = (def: (typeof ruleDefs)[number], hit: Hit | undefined) =>
      !NOT_SCORED.has(def.category) && ((stopped && !urgent(hit) && !ms.rules[def.id].stateRule) || (transient && !hit?.stateRule && !ms.rules[def.id].stateRule));
    let judged = 0;

    for (const def of ruleDefs) {
      const mem = ms.rules[def.id];
      const hit = mHits[def.id];
      if (frozen(def, hit)) continue;
      if (hit) judged += 1;
      if (hit) {
        mem.persistence += 1;
        mem.clean = 0;
        mem.severity = hit.severity;
        mem.evidence = hit.evidence;
        mem.tags = hit.tags;
        mem.lead = hit.lead ?? null;
        mem.subs = hit.subs ?? null;
        mem.stateRule = !!hit.stateRule;
        const threshold = hit.severity === "Critical" ? 1 : hit.stateRule ? 2 : 3;
        if (mem.status !== "ACTIVE" && mem.persistence >= threshold) {
          mem.status = "ACTIVE";
          mem.since = t;
          if (t > 0) pushEvent(s, ms, { kind: "rule", severity: hit.severity, title: `${def.id} ${def.name} confirmed`, detail: hit.evidence });
        } else if (mem.status === "QUIET") mem.status = "PENDING";
      } else if (mem.status !== "QUIET") {
        mem.clean += 1;
        if (mem.status === "PENDING" || mem.clean >= 4) {
          if (mem.status === "ACTIVE" && t > 0) pushEvent(s, ms, { kind: "rule", severity: "Normal", title: `${def.id} ${def.name} cleared`, detail: "Four clean samples (hysteresis)" });
          Object.assign(mem, emptyRule());
        }
      } else mem.persistence = 0;
    }

    const mySignals = SIGNALS_BY_MACHINE[id];
    for (const def of mySignals) {
      if (def.type !== "state") continue;
      const now = states[def.tag];
      const prev = ms.prevStates[def.tag];
      if (prev !== undefined && prev !== now && t > 0) pushEvent(s, ms, { kind: "state", severity: stateSeverity(asKiln(def), now), title: `${def.tag} ${now}`, detail: `${def.name}: ${prev} → ${now}` });
      ms.prevStates[def.tag] = now;
    }

    const ruleSevByTag: Record<string, Severity> = {};
    for (const def of ruleDefs) {
      const mem = ms.rules[def.id];
      if (mem.status !== "ACTIVE") continue;
      for (const tg of mem.tags) ruleSevByTag[tg] = maxSev(ruleSevByTag[tg] ?? "Normal", def.category === "Data quality" ? "Alert" : mem.severity);
    }

    const signals: Record<string, LiveSignal> = {};
    for (const def of mySignals) {
      const q = quality(def.tag);
      // SW-DATA-01: source time is frozen while a source is stale; a manual record carries its record time.
      const manualAt = def.origin === "manual" ? s.manual[def.tag]?.at : undefined;
      const sourceTs = manualAt ?? (s.staleSince[def.tag] !== undefined ? s.staleSince[def.tag] - 1 : t);
      const receivedTs = manualAt ?? t;
      const qNote = qualityNoteOf(s, screen, def, q);
      if (def.type === "state") {
        const stt = states[def.tag];
        const ls = stateSeverity(asKiln(def), stt);
        signals[def.tag] = { tag: def.tag, value: null, state: stt, display: stt, model: null, residual: null, z: null, limitSeverity: ls, status: maxSev(ls, ruleSevByTag[def.tag] ?? "Normal"), quality: q, qualityNote: qNote, slopePerHour: null, timeToLimit: null, sourceTs, receivedTs };
        continue;
      }
      const v = measured[def.tag];
      const mv = model[def.tag];
      const r = v - mv;
      const zz = r / (def.sigma || 1);
      const spKey = defs.setpoints[def.tag];
      // D5 Table 9.2 (./limits): relative kinds judge against the reference model, pair, drive and rate.
      const lr = evaluateLimit(asKiln(def), v, pyroLimitContext(def, { measured, model, hist: s.hist, modelHist: s.modelHist, running: running[id], transient, hold: ms.frame?.signals[def.tag]?.limitSeverity, setpoint: spKey ? (spKey === "feedSp" ? feedSp : coalSp) * (defs.setpointShare?.[def.tag] ?? 1) : undefined }));
      const ls = lr.severity;
      const sl = def.origin === "manual" ? null : slope(s.hist[def.tag], 30);
      let ttl: string | null = null;
      const lim = resolveLimit(def.limit, mv);
      if (sl !== null && lim && (lim.kind === "hi" || lim.kind === "lo") && def.origin !== "manual") {
        const target = lim.kind === "hi" ? (v < lim.warn ? lim.warn : lim.alarm) : v > lim.warn ? lim.warn : lim.alarm;
        const gap = target - v;
        if (Math.abs(sl) > (def.sigma || 0.01) * 0.02 && Math.sign(gap) === Math.sign(sl) && Math.abs(gap / sl) < 72 * 60) ttl = formatDuration(gap / sl);
      }
      if (q === "Good" && (!def.calculated || s.sim.events) && def.origin !== "manual" && t > 0) trackLimit(s, ms, def, ls, displayValue(def, v, null), r);
      // Live demo: the limit state people see is the debounced one (raised after LIMIT_RAISE_N minutes, cleared
      // after LIVE_LIMIT_CLEAR_N calm minutes), so a reading sitting on its limit does not blink on and off.
      const shownLs = s.sim.events && ms.limits[def.tag] ? ms.limits[def.tag].shown : ls;
      let status = maxSev(shownLs, ruleSevByTag[def.tag] ?? "Normal");
      if (q !== "Good") status = maxSev(status, "Alert");
      signals[def.tag] = { tag: def.tag, value: v, state: null, display: displayValue(def, v, null), model: mv, residual: r, z: def.sigma ? zz : null, limitSeverity: shownLs, limitNow: ls, limitDir: ms.limits[def.tag]?.dir ?? null, limitNote: lr.why, status, quality: q, qualityNote: qNote, slopePerHour: sl === null ? null : sl * 60, timeToLimit: ttl, sourceTs, receivedTs };
    }

    const rules: RuleState[] = ruleDefs.map((def) => {
      const mem = ms.rules[def.id];
      let ttl = "—";
      if (mem.status !== "QUIET" && mem.lead) {
        const h = s.hist[mem.lead.tag];
        const sl = slope(h, 30);
        const v = h.at(-1) ?? 0;
        const gap = mem.lead.target - v;
        if (sl !== null && Math.abs(sl) > 1e-6 && Math.sign(gap) === Math.sign(sl)) {
          const mins = gap / sl;
          ttl = mins < 72 * 60 ? `${formatDuration(mins)} (${formatDuration(mins * 0.75)}–${formatDuration(mins * 1.3)})` : "> 72 h";
        } else if ((mem.lead.target - v) * (sl ?? 0) <= 0) ttl = Math.abs(gap) < 1e-6 ? "at limit" : "stable";
      } else if (mem.status !== "QUIET" && mem.severity === "Critical") ttl = "at limit";
      const isDq = def.category === "Data quality" || def.category === "Anomaly" || def.category === "Service life";
      const confidence = mem.status === "QUIET" ? 0 : Math.min(98, Math.round(62 + Math.min(mem.persistence, 20) * 1.6 + (mem.severity === "Critical" ? 6 : 0)));
      const priority: RuleState["priority"] = mem.status === "QUIET" ? "P4" : mem.severity === "Critical" && !isDq ? "P1" : !isDq ? "P2" : "P3";
      return {
        id: def.id,
        name: def.name,
        category: def.category,
        system: def.system,
        subs: mem.subs && mem.subs.length ? mem.subs : def.subs,
        logic: def.logic,
        severity: mem.status === "QUIET" ? "Normal" : mem.severity,
        status: mem.status,
        evidence: mem.status === "QUIET" ? "Quiet — signals follow the model" : mem.evidence,
        tags: mem.tags,
        persistence: mem.persistence,
        threshold: mem.severity === "Critical" ? 1 : mem.stateRule ? 2 : 3,
        clean: mem.clean,
        confidence,
        timeToLimit: ttl,
        priority,
        cause: def.cause,
        consequence: def.consequence,
        action: def.action,
        plainTitle: def.plainTitle,
        plainWhat: def.plainWhat,
        plainTodo: def.plainTodo,
        since: mem.since,
        owner: def.owner,
        unproven: def.unproven,
        hold: def.hold,
      };
    });

    // Health: residual and limit penalties per sub-assembly, rule penalties on top.
    const subs: Record<string, HealthCell> = {};
    // Health drift: normal sensor scatter inside 3σ also costs a little, so health follows the readings minute to minute.
    const drift = s.sim.healthDrift;
    for (const sa of defs.subassemblies) {
      let penalty = 0;
      let scatter = 0;
      let scattered = 0;
      for (const def of mySignals) {
        if (def.sub !== sa.id || def.origin === "manual") continue;
        const sg = signals[def.tag];
        if (sg.quality !== "Good") continue;
        if (sg.z !== null) {
          penalty += Math.min(12, Math.max(0, Math.abs(sg.z) - 3.0) * 1.4);
          scatter += Math.min(3, Math.abs(sg.z));
          scattered += 1;
        }
        penalty += sg.limitSeverity === "Critical" ? 22 : sg.limitSeverity === "Alert" ? 9 : 0;
      }
      for (const r of rules) {
        if (r.status === "QUIET" || NOT_SCORED.has(r.category)) continue;
        if (!r.subs.includes(sa.id)) continue;
        penalty += r.status === "PENDING" ? 4 : r.severity === "Critical" ? 30 : 13;
      }
      let raw: number;
      let sm2: number;
      const key = `sub:${sa.id}`;
      if (drift > 0) {
        // Findings and limits move health over minutes (a short event dents it, a held fault drags it down);
        // the scatter of the readings moves it every minute or two by a point or so.
        const penKey = `pen:${sa.id}`;
        const pen = ms.smooth[penKey] ?? penalty;
        const penS = pen + (penalty - pen) * (penalty > pen ? 0.14 : 0.08);
        ms.smooth[penKey] = penS;
        raw = clamp(99 - penS - (scattered ? drift * 3.5 * (scatter / scattered) : 0), 12, 99);
        const prev = ms.smooth[key] ?? raw;
        sm2 = prev + (raw - prev) * 0.5;
      } else {
        raw = clamp(99 - penalty, 12, 99);
        const prev = ms.smooth[key] ?? raw;
        sm2 = prev + (raw - prev) * 0.25;
      }
      ms.smooth[key] = sm2;
      const intKey = `int:${sa.id}`;
      const prevInt = ms.smooth[intKey];
      const h = prevInt !== undefined && Math.abs(sm2 - prevInt) < (drift > 0 ? 0.4 : 0.7) ? prevInt : Math.round(sm2);
      ms.smooth[intKey] = h;
      let status: Severity = h < 60 ? "Critical" : h < 85 ? "Alert" : "Normal";
      for (const r of rules) if (r.status === "ACTIVE" && r.subs.includes(sa.id) && !NOT_SCORED.has(r.category)) status = maxSev(status, r.severity);
      subs[sa.id] = { id: sa.id, name: sa.name, health: h, status };
    }
    const systems: Record<string, HealthCell> = {};
    for (const sy of defs.systems) {
      const cells = defs.subassemblies.filter((x) => x.system === sy.id).map((x) => subs[x.id]);
      const mean = cells.reduce((a, c) => a + c.health, 0) / Math.max(1, cells.length);
      const min = cells.length ? Math.min(...cells.map((c) => c.health)) : 99;
      const status = cells.reduce<Severity>((acc, c) => maxSev(acc, c.status), "Normal");
      systems[sy.id] = { id: sy.id, name: sy.name, health: Math.round(0.5 * mean + 0.5 * min), status };
    }
    const scored = defs.systems.filter((x) => x.scored).map((x) => systems[x.id]);
    const overall = Math.round(0.5 * (scored.reduce((a, c) => a + c.health, 0) / Math.max(1, scored.length)) + 0.5 * Math.min(...scored.map((c) => c.health)));
    const anyCrit = rules.some((r) => r.status === "ACTIVE" && r.severity === "Critical" && r.category !== "Data quality" && r.category !== "Service life");
    const anyAdv = rules.some((r) => r.status === "ACTIVE" && r.category !== "Data quality" && r.category !== "Service life");
    const condition: SimFrame["condition"] = anyCrit || overall < 60 ? "Critical" : anyAdv || overall < 85 ? "Alert" : "Healthy";

    ms.healthHist.overall.push(overall);
    for (const sy of defs.systems) (ms.healthHist[sy.id] ??= []).push(systems[sy.id].health);
    for (const k of Object.keys(ms.healthHist)) if (ms.healthHist[k].length > HISTORY_LEN) ms.healthHist[k].shift();

    const sigList = Object.values(signals);
    const invalidN = sigList.filter((x) => x.quality === "Invalid").length;
    const suspectN = sigList.filter((x) => x.quality === "Suspect").length;
    const pipeline: SimFrame["pipeline"] = {
      valid: sigList.length - invalidN - suspectN,
      held: mySignals.filter((d) => s.holds[d.tag] !== undefined).length,
      invalid: invalidN,
      suspect: suspectN,
      beyond3s: sigList.filter((x) => x.quality === "Good" && x.z !== null && Math.abs(x.z) > 3).length,
      evaluated: ruleDefs.length,
      matching: judged,
      confirmed: rules.filter((r) => r.status === "ACTIVE").length,
      pending: rules.filter((r) => r.status === "PENDING").length,
      p1: rules.filter((r) => r.priority === "P1").length,
      p2: rules.filter((r) => r.priority === "P2").length,
      p3: rules.filter((r) => r.priority === "P3").length,
    };

    const isKiln = id === "PYR-KLN-01";
    // Manual records are dated records, not a live series: they have no per-minute history.
    const myTags = mySignals.filter((d) => d.origin !== "manual").map((d) => d.tag);
    const frame: SimFrame = {
      t,
      clock,
      day,
      scenarioId: ms.scenarioId,
      scenarioMinute: t - ms.scenarioStart,
      drivers,
      witnesses: { feedTorque, feedO2: feedElev, fuelBurning: coalBz, fuelInlet: coalLine },
      signals,
      rules,
      subs,
      systems,
      overall,
      condition,
      pipeline,
      shellProfile: isKiln ? shellProfile : [],
      shellModel: isKiln ? shellModel : [],
      coldBandResidual: isKiln ? (shellThermal.coldBand?.residual ?? shellResMean(30, 36)) : 0,
      times: s.times,
      history: emit ? Object.fromEntries(myTags.map((tg) => [tg, s.hist[tg]])) : s.hist,
      modelHistory: emit ? Object.fromEntries(myTags.map((tg) => [tg, s.modelHist[tg]])) : s.modelHist,
      healthHistory: (emit ? { ...ms.healthHist } : ms.healthHist) as SimFrame["healthHistory"],
      events: ms.events,
      phase: ms.story.phase,
      storyLabel: ms.story.label,
      autopilot: ms.story.autopilot,
      profile: ms.story.profile,
      background: ms.bg?.scenarioId ?? null,
      defs,
      records: isKiln ? s.records : undefined,
      qualityHistory: emit ? Object.fromEntries(myTags.map((tg) => [tg, s.qualHist[tg]])) : s.qualHist,
      shiftValidity: shiftValidityOf(s, myTags),
      equipment: machineEquipment(eqObs, id),
      shellScans: isKiln ? s.shellScans : undefined,
      shellThermal: isKiln ? shellThermal : undefined,
      operatingState: {
        running: !stopped,
        transient,
        note: stopped
          ? `Machine not running${ctl.lineStop ? ` (line stop: ${ctl.cause})` : ""}: condition rules hold their last judgement`
          : ctl.lineStop
            ? `Line stop (${ctl.cause}): kiln feed and fuel off${transient ? "; model-residual rules hold their last judgement" : ", line settled at the stopped state"}`
            : transient
            ? "Operating point changing (feed, coal, kiln speed or ID-fan set-point): model-residual rules hold their last judgement"
            : "Running at a steady operating point",
      },
    };
    stepStory(s, ms);
    frame.phase = ms.story.phase;
    frame.storyLabel = ms.story.label;
    frame.autopilot = ms.story.autopilot;
    frame.profile = ms.story.profile;
    frame.background = ms.bg?.scenarioId ?? null;
    frame.events = emit ? ms.events.slice() : ms.events;
    ms.frame = frame;
    frames[id] = frame;
  }
  return frames;
}

export { PYRO_SCENARIOS, PYRO_SUBASSEMBLIES };
