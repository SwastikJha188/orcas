/**
 * KLN-01 live demonstration engine.
 *
 * One sample per simulated minute, following D5 §8.2 (values transmitted
 * every minute) and the analysis chain of D5 §9.4:
 *
 *   data quality → reference model → sensor validation → rules →
 *   persistence / hysteresis → diagnosis, health and time to limit.
 *
 * The plant is simulated from its *true* operating drivers. Sensor readings
 * add noise and any scenario faults. The reference model is computed from the
 * *measured* drivers — substituting witness estimates once a meter has been
 * isolated — so a bad sensor shows up as disagreement rather than as a fault.
 *
 * Deterministic for a given seed: the server render and the first client
 * render produce the same frame.
 */
import {
  SIGNALS,
  SIGNAL_BY_TAG,
  SUBASSEMBLIES,
  SYSTEMS,
  describeLimit,
  limitSeverity,
  stateSeverity,
  type Severity,
  type SignalDef,
  type SubassemblyId,
  type SystemId,
} from "./signals";
import { KILN_SCENARIOS, effectLevel, scenarioById, type KilnScenario } from "./scenarios";
import { RULES, RULE_BY_ID, type RuleCategory } from "./rules";
import { KILN_DEFS } from "./defs";
import type { ManualRecord, PlantDefs } from "../plant-defs";
import type { ShellThermal } from "./shell-map";

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export type Quality = "Good" | "Suspect" | "Invalid";

export interface LiveSignal {
  tag: string;
  value: number | null;
  state: string | null;
  display: string;
  model: number | null;
  residual: number | null;
  /** Residual in multiples of σ. */
  z: number | null;
  limitSeverity: Severity;
  /** The limit branch that fired ("+ 14 % over model", "pair split + 12 K"); pyro line only, null when within limits. */
  limitNote?: string | null;
  /** The limit state of this very reading (limitSeverity may be the debounced one people see). */
  limitNow?: Severity;
  /** Side the shown limit was crossed on (pyro line). */
  limitDir?: "high" | "low" | null;
  /** Limit severity, raised to the severity of any confirmed finding the signal is evidence for. */
  status: Severity;
  quality: Quality;
  qualityNote: string | null;
  slopePerHour: number | null;
  timeToLimit: string | null;
  /**
   * Simulated minute the source stamped the value (SW-DATA-01). Frozen while a
   * source is stale; the record time for a manual record. Optional: engines
   * that do not track it leave it out.
   */
  sourceTs?: number;
  /** Simulated minute ULTRON received the value (SW-DATA-01). */
  receivedTs?: number;
}

export type RuleStatus = "ACTIVE" | "PENDING" | "QUIET";

export interface RuleState {
  id: string;
  name: string;
  category: RuleCategory;
  /** System id, or "DQ" for data-quality rules. */
  system: string;
  subs: string[];
  logic: string;
  severity: Severity;
  status: RuleStatus;
  evidence: string;
  tags: string[];
  persistence: number;
  threshold: number;
  clean: number;
  confidence: number;
  timeToLimit: string;
  priority: "P1" | "P2" | "P3" | "P4";
  cause: string;
  consequence: string;
  action: string;
  /** Headline anyone can read: what is wrong, in everyday words (docs/plain-language.md). */
  plainTitle?: string;
  /** What is happening and why it matters, in everyday words (1–2 sentences). */
  plainWhat?: string;
  /** What to do next, as an instruction to a person (1 sentence). */
  plainTodo?: string;
  /** Simulated minute the rule was confirmed. */
  since: number | null;
  /** Default action owner (role) when no work order names one. */
  owner?: string;
  /** What the evidence does not yet prove. */
  unproven?: string;
  /** HOLD disclosure: the rule's channels are not yet approved. */
  hold?: string;
}

export interface HealthCell {
  id: string;
  name: string;
  health: number;
  status: Severity;
}

export interface SimEvent {
  t: number;
  clock: string;
  kind: "rule" | "state" | "scenario" | "quality" | "action" | "limit";
  severity: Severity;
  title: string;
  detail: string;
  /** Operator action this event records; `auto` when the autopilot crew acted. */
  action?: { ruleId: string; kind: OperatorAction | "complete"; auto: boolean };
}

export interface SimFrame {
  t: number;
  clock: string;
  day: number;
  scenarioId: string;
  scenarioMinute: number;
  drivers: {
    feed: number;
    feedSp: number;
    fuel: number;
    fuelSp: number;
    speed: number;
    draft: number;
    ambientEst: number;
  };
  witnesses: { feedTorque: number; feedO2: number; fuelBurning: number; fuelInlet: number };
  signals: Record<string, LiveSignal>;
  rules: RuleState[];
  subs: Record<string, HealthCell>;
  systems: Record<string, HealthCell>;
  overall: number;
  condition: "Healthy" | "Alert" | "Critical";
  pipeline: {
    valid: number;
    held: number;
    invalid: number;
    suspect: number;
    beyond3s: number;
    evaluated: number;
    matching: number;
    confirmed: number;
    pending: number;
    p1: number;
    p2: number;
    p3: number;
  };
  /** Shell temperature along 0–74 m at 0.5 m (scanner maximum per section). */
  shellProfile: number[];
  shellModel: number[];
  coldBandResidual: number;
  /** Rolling histories, one value per simulated minute, oldest first. */
  times: number[];
  history: Record<string, number[]>;
  modelHistory: Record<string, number[]>;
  healthHistory: { overall: number[] } & Record<string, number[]>;
  events: SimEvent[];
  /** Plant-story phase and one plain sentence describing what is happening now. */
  phase: StoryPhase;
  storyLabel: string;
  autopilot: boolean;
  /** What the autopilot keeps this machine at (see `setProfile`). */
  profile: StoryProfile;
  /** Short instrument fault running in the background, if any (autopilot only). */
  background: string | null;
  /** Signal / rule / sub-assembly definitions this frame was computed from. */
  defs: PlantDefs;
  /** Dated manual records of this machine (laboratory, handheld), newest first. */
  records?: ManualRecord[];
  /**
   * Per-sample data validity, aligned with `history` / `times`:
   * 0 Good, 1 Suspect, 2 Invalid. Optional (pyro line only).
   */
  qualityHistory?: Record<string, number[]>;
  /**
   * Shell scanner maps kept per scan (every 10 simulated minutes), oldest
   * first, so a zone can be compared with the previous scan or shift.
   * `valid`: scanner coverage was good enough to trust the map. Optional (pyro kiln only).
   */
  shellScans?: Array<{ t: number; profile: number[]; coverage: number; valid: boolean; local?: number[]; model?: number[] }>;
  /**
   * Thermal-map processing outputs of the engine (D5 Table 9.5): hottest
   * position and model there, area above alert, cold / warm bands, last-good
   * cell values, the handheld round and the maps kept around findings.
   * Optional (pyro kiln only).
   */
  shellThermal?: ShellThermal;
  /**
   * Operating state the condition rules were judged in (D4 §8.2: compare only
   * in a comparable state). While `running` is false or `transient` is true,
   * condition rules hold their last judgement. Optional (pyro line only).
   */
  operatingState?: { running: boolean; transient: boolean; note: string };
  /**
   * Per-shift data validity (D5 Table 9.3 "valid / suspect / invalid list per
   * shift", Table 12.1 every-shift review): minutes each flagged tag spent
   * Suspect / Invalid / flagged-only in the current and the previous shift.
   * Optional (pyro line only).
   */
  shiftValidity?: { current: ShiftValidityLog | null; previous: ShiftValidityLog | null };
  /**
   * Run state of each drive / fan / pump of this machine that has run feedback
   * (MCC current, status point), as the edge sees it: id → state, with the
   * unit's label and the tags it governs. Optional (pyro line only).
   */
  equipment?: Record<string, { label: string; state: "run" | "stopped" | "tripped"; tags: string[] }>;
}

export interface ShiftValidityLog {
  /** Shift start (simulated minute) and label ("Day shift 06:00–18:00"). */
  start: number;
  label: string;
  /** Minutes of the shift evaluated so far. */
  minutes: number;
  tags: Record<string, { suspect: number; invalid: number; flagOnly: number; first: number; last: number; note: string }>;
}

export type StoryPhase = "healthy" | "developing" | "detected" | "mitigated" | "recovering";
export type OperatorAction = "acknowledge" | "mitigate" | "repair";
/**
 * Autopilot behaviour. "story" rotates through every scenario with healthy
 * gaps; the hold profiles keep the machine in one condition: "healthy" runs
 * no machine fault, "advisory" / "critical" keep a seal or shell fault held at
 * that severity and hand over to the next one now and then.
 */
export type StoryProfile = "story" | "healthy" | "advisory" | "critical";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const HISTORY_LEN = 360;
const EPOCH_MIN = 6 * 60; // simulated clock starts 06:00 on day 0
export const BEARING_OFFSETS: Record<string, number> = {
  "TMP-KLN-01": 22.0,
  "TMP-KLN-02": 23.6,
  "TMP-KLN-03": 21.3,
  "TMP-KLN-04": 22.7,
  "TMP-KLN-05": 26.2,
  "TMP-KLN-06": 26.7,
  "TMP-KLN-07": 25.5,
  "TMP-KLN-08": 26.2,
  "TMP-KLN-09": 23.2,
  "TMP-KLN-10": 22.2,
  "TMP-KLN-11": 24.2,
  "TMP-KLN-12": 23.4,
};
const BEARING_TAGS = Object.keys(BEARING_OFFSETS);
const STATIONS: Array<{ n: 1 | 2 | 3; sub: SubassemblyId; lA: string; lB: string; rA: string; rB: string }> = [
  { n: 1, sub: "station-1", lA: "TMP-KLN-01", lB: "TMP-KLN-02", rA: "TMP-KLN-03", rB: "TMP-KLN-04" },
  { n: 2, sub: "station-2", lA: "TMP-KLN-05", lB: "TMP-KLN-06", rA: "TMP-KLN-07", rB: "TMP-KLN-08" },
  { n: 3, sub: "station-3", lA: "TMP-KLN-09", lB: "TMP-KLN-10", rA: "TMP-KLN-11", rB: "TMP-KLN-12" },
];
export const VIB_BASE: Record<string, number> = { "VIB-KLN-01": 1.6, "VIB-KLN-02": 1.85, "VIB-KLN-03": 1.51, "VIB-KLN-04": 2.33 };
const RTD_TAGS = SIGNALS.filter((s) => s.instrument === "Pt100 RTD").map((s) => s.tag);
const PROFILE_N = 149; // 0 … 74 m at 0.5 m
const ANALOG = SIGNALS.filter((s) => s.type === "analog");

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type Rng = (() => number) & { state: () => number };

/** Seeded PRNG. `mulberry32(rng.state())` continues the exact same sequence. */
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

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const sevRank: Record<Severity, number> = { Normal: 0, Alert: 1, Critical: 2 };
const maxSev = (a: Severity, b: Severity): Severity => (sevRank[a] >= sevRank[b] ? a : b);

/* ------------------------------------------------------------------ */
/* Wall clock                                                          */
/* ------------------------------------------------------------------ */

/**
 * Display mapping from simulated minutes to the viewer's local time. The
 * plant runs faster than real time (one simulated minute per real second by
 * default), so every clock and duration the UI shows is relabelled in real
 * time: an event is stamped with the local time it happened, a duration of
 * N simulated minutes reads as N × `msPerMin` of real time. Set by the React
 * fleet hook each tick; without it (headless runs) the engine keeps its own
 * 06:00-based plant clock and plant-time durations.
 */
let wall: { t: number; ms: number; msPerMin: number } | null = null;

/** Anchor simulated minute `t` at epoch `ms`; one simulated minute lasts `msPerMin`. */
export function setWallClock(t: number, ms: number, msPerMin: number): void {
  wall = { t, ms, msPerMin };
}

/** Real milliseconds one simulated minute stands for on screen. */
export function simMinuteMs(): number {
  return wall ? wall.msPerMin : 60_000;
}

const PLANT_EPOCH_MS = new Date(2026, 9, 12, 0, 0, 0).getTime();

/** Epoch milliseconds at which simulated minute `t` is shown. */
export function simTimeMs(t: number): number {
  return wall ? wall.ms + (t - wall.t) * wall.msPerMin : PLANT_EPOCH_MS + (EPOCH_MIN + t) * 60_000;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function formatClock(t: number): { clock: string; day: number } {
  if (wall) {
    const d = new Date(simTimeMs(t));
    return { clock: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`, day: 0 };
  }
  const total = EPOCH_MIN + t;
  const day = Math.floor(total / 1440);
  const m = ((total % 1440) + 1440) % 1440;
  return { clock: `${pad2(Math.floor(m / 60))}:${pad2(Math.floor(m % 60))}`, day };
}

/** A duration of `minutes` simulated minutes, as shown: "42s", "3m 05s", "2h 10m", "3 d" (real time when the wall clock is set). */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes)) return "—";
  const sec = Math.max(0, Math.round((minutes * simMinuteMs()) / 1000));
  if (sec < 60 && wall) return `${sec}s`;
  if (sec < 3600 && wall) return `${Math.floor(sec / 60)}m ${pad2(sec % 60)}s`;
  const m = Math.round(sec / 60);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h >= 48) return `${Math.round(h / 24)} d`;
  return h > 0 ? `${h}h ${pad2(r)}m` : `${r}m`;
}

/** Inverse of `formatDuration`: simulated minutes from a label, or null when unparsable. */
export function parseDuration(label: string | null | undefined): number | null {
  if (!label) return null;
  const x = label.trim();
  let sec: number | null = null;
  const d = /^(\d+)\s*d\b/.exec(x);
  const hm = /^(?:(\d+)h\s*)?(\d+)m(?:\s*(\d+)s)?\b/.exec(x);
  const h = /^(\d+)h\b/.exec(x);
  const s = /^(\d+)s\b/.exec(x);
  if (d) sec = Number(d[1]) * 86_400;
  else if (hm) sec = Number(hm[1] ?? 0) * 3600 + Number(hm[2]) * 60 + Number(hm[3] ?? 0);
  else if (h) sec = Number(h[1]) * 3600;
  else if (s) sec = Number(s[1]);
  return sec === null ? null : (sec * 1000) / simMinuteMs();
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Least-squares slope per sample over the last `n` values. */
function slope(values: number[], n = 30): number | null {
  const len = Math.min(n, values.length);
  if (len < 6) return null;
  const ys = values.slice(values.length - len);
  const xm = (len - 1) / 2;
  const ym = ys.reduce((a, b) => a + b, 0) / len;
  let num = 0;
  let den = 0;
  for (let i = 0; i < len; i++) {
    num += (i - xm) * (ys[i] - ym);
    den += (i - xm) * (i - xm);
  }
  return den === 0 ? 0 : num / den;
}

function displayValue(def: SignalDef, value: number | null, state: string | null): string {
  if (def.type === "state") return state ?? "—";
  if (value === null || !Number.isFinite(value)) return "—";
  const signed = def.tag === "POS-KLN-01" || def.tag === "PRS-KLN-01" || def.tag === "PRS-KLN-03" || def.tag === "CAL-KLN-06";
  const s = groupThousands(value.toFixed(def.decimals));
  return signed && value > 0 ? `+${s}` : s;
}

/** "1234.5" → "1,234.5" without Intl (Intl formatting is far too slow to run per sample). */
function groupThousands(fixed: string): string {
  const neg = fixed.startsWith("-");
  const body = neg ? fixed.slice(1) : fixed;
  const [int, frac] = body.split(".");
  const grouped = int.length > 3 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : int;
  return `${neg ? "-" : ""}${grouped}${frac !== undefined ? `.${frac}` : ""}`;
}

function fmtZ(z: number): string {
  return `${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(1)}σ`;
}

/** Baseline shell temperature along the kiln (°C). Tyres at 11, 39, 60 m are cooler under the tyre. */
function shellBaseline(xm: number): number {
  const rise = 205 + 105 / (1 + Math.exp(-(xm - 36) / 6));
  const burn = 22 * Math.exp(-Math.pow((xm - 56) / 7, 2));
  const outletDrop = xm > 66 ? -(xm - 66) * 7 : 0;
  return rise + burn + outletDrop;
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
  lead: Lead | null;
}

interface Lead {
  tag: string;
  target: number;
}

export interface SimState {
  t: number;
  scenarioId: string;
  scenarioStart: number;
  rand: () => number;
  ar: Record<string, number>;
  holds: Record<string, number>;
  hist: Record<string, number[]>;
  modelHist: Record<string, number[]>;
  times: number[];
  healthHist: { overall: number[] } & Record<SystemId, number[]>;
  rules: Record<string, RuleMemory>;
  flags: Record<string, { rule: "R-DQ-01" | "R-DQ-02"; note: string; since: number; clean: number }>;
  smooth: Record<string, number>;
  prevStates: Record<string, string>;
  events: SimEvent[];
  frame: SimFrame | null;
  /** Fault intensity / progression control (mitigation, repair). */
  fx: Fx;
  /** Autopilot "plant story" state machine. */
  story: Story;
  /** Background instrument fault layered on top of the scenario (autopilot only). */
  bg: { scenarioId: string; start: number; end: number } | null;
  bgNextAt: number;
  /** Debounced limit band per analog signal: what was last announced and what is pending. */
  limits: Record<string, { shown: Severity; next: Severity; n: number }>;
}

interface Fx {
  /** Effective scenario minute: advances slower when mitigated, stops when repairing. */
  scMin: number;
  /** Multiplier on every fault effect, 1 = full severity. */
  intensity: number;
  mitigated: boolean;
  repairStart: number | null;
  repairFrom: number;
  repairDur: number;
  /** Scenario minute where progression stops (hold profiles); null = no hold. */
  hold: number | null;
}

interface Story {
  autopilot: boolean;
  phase: StoryPhase;
  /** Scenario time compression while autopilot runs (so faults develop within a demo minute). */
  pace: number;
  nextFaultAt: number;
  rotation: number;
  detectedAt: number | null;
  mitigatedAt: number | null;
  settledAt: number;
  acked: boolean;
  label: string;
  profile: StoryProfile;
  /** Simulated minute a held fault hands over to the next one. */
  holdUntil: number;
}

function freshFx(): Fx {
  return { scMin: 0, intensity: 1, mitigated: false, repairStart: null, repairFrom: 1, repairDur: 30, hold: null };
}

function emptyRuleMemory(): RuleMemory {
  return { persistence: 0, clean: 0, status: "QUIET", since: null, severity: "Normal", evidence: "", tags: [], lead: null };
}

/**
 * The six-hour healthy warm-up is deterministic per seed, so it runs once per
 * process and is cloned afterwards. Without this every server render and every
 * client mount spent hundreds of milliseconds re-simulating the same history.
 */
type WarmState = Omit<SimState, "rand" | "frame"> & { rand: undefined; frame: undefined };
const warmCache = new Map<number, { state: WarmState; rng: number }>();

function warmSim(seed: number): SimState {
  let warm = warmCache.get(seed);
  if (!warm) {
    const rand = mulberry32(seed);
    const s = blankSim(rand);
    for (let i = 0; i < HISTORY_LEN; i++) stepSim(s, false);
    s.events = [];
    warm = { state: { ...s, rand: undefined, frame: undefined }, rng: rand.state() };
    warmCache.set(seed, warm);
  }
  return { ...structuredClone(warm.state), rand: mulberry32(warm.rng), frame: null };
}

export function createSim(scenarioId = "healthy", seed = 20261012): SimState {
  const s = warmSim(seed);
  setScenario(s, scenarioId);
  stepSim(s, true);
  return s;
}

/** A running engine as structured-cloneable data: the PRNG as its state, the frame without its defs. */
export type FrozenSim = Omit<SimState, "rand"> & { rand: number };

/** Snapshot `s` to post across a worker boundary; `thawSim` resumes the exact same run. */
export function freezeSim(s: SimState): FrozenSim {
  return { ...s, rand: (s.rand as Rng).state(), frame: s.frame && ({ ...s.frame, defs: undefined } as unknown as SimFrame) };
}

export function thawSim(f: FrozenSim): SimState {
  return { ...f, rand: mulberry32(f.rand), frame: f.frame && { ...f.frame, defs: KILN_DEFS } };
}

function blankSim(rand: () => number): SimState {
  return {
    t: -HISTORY_LEN,
    scenarioId: "healthy",
    scenarioStart: -HISTORY_LEN,
    rand,
    ar: {},
    holds: {},
    hist: Object.fromEntries(SIGNALS.map((d) => [d.tag, [] as number[]])),
    modelHist: Object.fromEntries(SIGNALS.map((d) => [d.tag, [] as number[]])),
    times: [],
    healthHist: { overall: [], "DRV-KLN-01": [], "SUP-KLN-01": [], "SHL-KLN-01": [], "PRC-KLN-01": [] },
    rules: Object.fromEntries(RULES.map((r) => [r.id, emptyRuleMemory()])),
    flags: {},
    smooth: {},
    prevStates: {},
    events: [],
    frame: null,
    fx: freshFx(),
    story: { autopilot: false, phase: "healthy", pace: 1, nextFaultAt: 0, rotation: 0, detectedAt: null, mitigatedAt: null, settledAt: 0, acked: false, label: "", profile: "story", holdUntil: 0 },
    bg: null,
    bgNextAt: 0,
    limits: {},
  };
}

/** Switch scenario without touching the story phase. */
function beginScenario(s: SimState, scenarioId: string, quiet = false): void {
  const sc = scenarioById(scenarioId);
  s.scenarioId = sc.id;
  s.scenarioStart = s.t;
  s.holds = {};
  s.fx = freshFx();
  if (quiet) return;
  pushEvent(s, {
    kind: "scenario",
    severity: "Normal",
    title: `Scenario: ${sc.name}`,
    detail: sc.expected.length ? `Expected ${sc.expected.join(", ")} · documented ${sc.documentedDetection}` : "Expected quiet — no alarm",
  });
}

export function setScenario(s: SimState, scenarioId: string): void {
  beginScenario(s, scenarioId);
  const st = s.story;
  const sc = scenarioById(scenarioId);
  st.phase = sc.expected.length ? "developing" : "healthy";
  st.detectedAt = null;
  st.mitigatedAt = null;
  st.acked = false;
  st.pace = st.autopilot ? paceFor(sc) : 1;
  st.label = storyLabel(s);
  syncStory(s);
}

/* ------------------------------------------------------------------ */
/* Plant story: autopilot, operator actions, recovery                  */
/* ------------------------------------------------------------------ */

/** Varied rotation: mostly machine faults, some process disturbances and sensor faults. */
const STORY_ROTATION = [
  "gearbox-input-bearing",
  "hot-afternoon",
  "bearing-lube-st3",
  "inlet-false-air",
  "sensor-winding",
  "oil-cooler",
  "refractory-hot-spot",
  "production-increase",
  "coupling-misalignment",
  "thrust-hydraulic",
  "ring-buildup",
  "sensor-o2",
  "drive-overload",
  "pinion-misalignment",
  "feed-cut",
  "roller-skew-st2",
  "gearbox-oil-supply",
  "scanner-fouling",
  "outlet-fan-stop",
  "axial-drift",
  "sensor-flatline",
  "girth-spray",
];
const FIRST_FAULT_DELAY = 20;
const ACK_AFTER = 8;
const MITIGATE_AFTER = 25;
const REPAIR_AFTER = 80;
const REPAIR_MIN = 30;
const DISTURBANCE_MIN = 40;

/**
 * Hold profiles: the seal and shell faults each condition rotates through,
 * with the scenario minute (at the scenario's own pace) where its finding sits
 * firmly at that severity. Calibrated headless; see `setProfile`.
 */
const HOLD_SCENARIOS: Record<"advisory" | "critical", Array<{ id: string; at: number }>> = {
  advisory: [
    { id: "inlet-false-air", at: 175 },
    { id: "ring-buildup", at: 240 },
    { id: "axial-drift", at: 175 },
  ],
  critical: [
    { id: "inlet-false-air", at: 300 },
    { id: "outlet-fan-stop", at: 40 },
    { id: "axial-drift", at: 260 },
    { id: "refractory-hot-spot", at: 200 },
  ],
};
/** A held fault develops over this many scenario minutes before it is held. */
const HOLD_LEAD = 25;
/** How long a held fault stays before the crew repairs it and the next one shows. */
const HOLD_MIN = 150;
const HOLD_VAR = 90;

/**
 * Short instrument faults the autopilot layers on top of whatever the machine
 * is doing: they raise and clear data-quality findings, quality flags and
 * state changes, so a live plant always has some activity.
 */
const BACKGROUND_POOL = [
  "sensor-winding",
  "sensor-torque",
  "sensor-feed",
  "analyser-fault",
  "sensor-flatline",
  "scanner-fouling",
  "sensor-o2",
];
const BG_GAP_MIN = 4;
const BG_GAP_VAR = 16;
const BG_LEN_MIN = 20;
const BG_LEN_VAR = 25;
/** Samples a limit band must hold before it is announced: raising, and returning. */
const LIMIT_RAISE_N = 3;
const LIMIT_CLEAR_N = 6;

/** "≥ 85 °C" style text for the limit a severity refers to. */
function limitText(def: SignalDef, sev: Severity): string {
  const l = def.limit;
  if (!l) return "";
  const u = def.unit ? ` ${def.unit}` : "";
  const crit = sev === "Critical";
  switch (l.kind) {
    case "hi":
      return `≥ ${crit ? l.alarm : l.warn}${u}`;
    case "lo":
      return `≤ ${crit ? l.alarm : l.warn}${u}`;
    case "abs":
      return `|x| ≥ ${crit ? l.alarm : l.warn}${u}`;
    case "band": {
      const lo = crit ? l.alarmLo : l.warnLo;
      const hi = crit ? l.alarmHi : l.warnHi;
      return `outside ${lo ?? "−∞"}–${hi ?? "∞"}${u}`;
    }
    case "setpoint":
      return `${crit ? l.alarmPct : l.warnPct} % off set-point`;
    default: {
      // Relative kinds (pyro line, D5 Table 9.2); the kiln-seal catalogue uses none.
      const d = describeLimit(l, def.unit);
      return crit ? d.alarm : d.warning;
    }
  }
}

/** Announce a limit band only once it has held for a few samples (no flapping). */
function trackLimit(s: SimState, def: SignalDef, sev: Severity, display: string): void {
  const m = (s.limits[def.tag] ??= { shown: "Normal", next: "Normal", n: 0 });
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
  if (m.n < (rising ? LIMIT_RAISE_N : LIMIT_CLEAR_N)) return;
  const was = m.shown;
  m.shown = sev;
  m.n = 0;
  const u = def.unit ? ` ${def.unit}` : "";
  pushEvent(s, {
    kind: "limit",
    severity: sev,
    title:
      sev === "Normal"
        ? `${def.name} back within limits`
        : `${def.name} ${rising ? "beyond" : "eased to"} ${sev === "Critical" ? "danger" : "alert"} limit`,
    detail: `${def.tag} ${display}${u}${sev === "Normal" ? ` · was ${was === "Critical" ? "danger" : "alert"} (${limitText(def, was)})` : ` · limit ${limitText(def, sev)}`}`,
  });
}

function paceFor(sc: KilnScenario): number {
  if (!sc.expected.length) return 3;
  const m = /\+(\d+)h\s*(\d+)m/.exec(sc.documentedDetection);
  const minutes = m ? Number(m[1]) * 60 + Number(m[2]) : 30;
  return clamp(minutes / 18, 1, 8);
}

function storyLabel(s: SimState): string {
  const sc = scenarioById(s.scenarioId);
  const st = s.story;
  switch (st.phase) {
    case "healthy":
      if (sc.id !== "healthy") return `${sc.name}: drivers explain the change, no fault expected`;
      return "Plant healthy: every signal follows the reference model";
    case "developing":
      return `${sc.name} developing, not yet confirmed`;
    case "detected":
      return `${sc.name} confirmed (${sc.expected.join(", ")}), awaiting operator action`;
    case "mitigated":
      return `${sc.name} mitigated by a temporary measure, repair still needed`;
    default:
      return s.scenarioId === "healthy" ? "Repair complete: rules clearing, plant returning to the model" : `Repair under way: ${sc.name} recovering toward the model`;
  }
}

/** Refresh the story fields on the current frame (after an out-of-step change). */
function syncStory(s: SimState): void {
  s.story.label = storyLabel(s);
  if (s.frame) s.frame = { ...s.frame, events: s.events.slice(), phase: s.story.phase, storyLabel: s.story.label, autopilot: s.story.autopilot, profile: s.story.profile, background: s.bg?.scenarioId ?? null };
}

export function setAutopilot(s: SimState, on: boolean): void {
  const st = s.story;
  if (st.autopilot === on) return;
  st.autopilot = on;
  if (on) {
    if (s.scenarioId === "healthy" && st.phase === "healthy") st.nextFaultAt = s.t + FIRST_FAULT_DELAY;
    const sc = scenarioById(s.scenarioId);
    if (sc.id !== "healthy") st.pace = paceFor(sc);
  } else st.pace = 1;
  pushEvent(s, { kind: "action", severity: "Normal", title: `Autopilot ${on ? "on" : "off"}`, detail: on ? "Plant story resumed: faults develop and recover on their own" : "Manual control: scenarios change only when selected" });
  syncStory(s);
}

/** Choose what the autopilot keeps this machine at. Takes effect on the next step. */
export function setProfile(s: SimState, profile: StoryProfile): void {
  const st = s.story;
  if (st.profile === profile) return;
  st.profile = profile;
  if (profile === "advisory" || profile === "critical") {
    // Start the first held fault right away when the plant is quiet.
    if (s.scenarioId === "healthy" && st.phase === "healthy") startHold(s);
  } else if (profile === "healthy") {
    const sc = scenarioById(s.scenarioId);
    if (sc.id !== "healthy" && s.fx.repairStart === null) startRepair(s, sc.expected[0] ?? sc.id, true);
  }
  syncStory(s);
}

/** Start the next held fault of the current profile, already developing toward its hold point. */
function startHold(s: SimState): void {
  const st = s.story;
  if (st.profile !== "advisory" && st.profile !== "critical") return;
  const list = HOLD_SCENARIOS[st.profile];
  const h = list[st.rotation % list.length];
  st.rotation += 1;
  setScenario(s, h.id);
  st.pace = 1;
  s.fx.scMin = Math.max(0, h.at - HOLD_LEAD);
  s.fx.hold = h.at;
  st.holdUntil = Infinity;
}

function isHeld(s: SimState): boolean {
  return s.fx.hold !== null && (s.story.profile === "advisory" || s.story.profile === "critical");
}

/** Background instrument faults: disabled so live telemetry does not randomly switch sensor states on its own. */
function stepBackground(s: SimState): void {
  s.bg = null;
}

function mitigationNote(ruleId: string): string {
  if (ruleId.startsWith("R-SUP")) return "Load reduced and bearing lubrication topped up";
  if (ruleId.startsWith("R-DRV")) return "Kiln feed reduced 10 % and drive lubrication checked";
  if (ruleId.startsWith("R-SHL")) return "Feed trimmed and cooling air raised as a stop-gap";
  return "Instrument set to manual and value substituted from witnesses";
}

function startRepair(s: SimState, ruleId: string, auto: boolean): void {
  const fx = s.fx;
  if (fx.repairStart !== null) return;
  fx.repairStart = s.t;
  fx.repairFrom = Math.max(fx.intensity, 0.05);
  fx.repairDur = REPAIR_MIN;
  s.story.phase = "recovering";
  const rule = RULE_BY_ID[ruleId];
  pushEvent(s, {
    kind: "action",
    severity: "Normal",
    title: `Repair started${rule ? `: ${ruleId} ${rule.name}` : ""}`,
    detail: `${auto ? "Maintenance dispatched automatically. " : ""}Fault clears toward the reference model over about ${REPAIR_MIN} min`,
    action: { ruleId, kind: "repair", auto },
  });
}

/** Operator action on a finding. "mitigate" relieves the fault temporarily; "repair" recovers it. */
export function performAction(s: SimState, ruleId: string, kind: OperatorAction, auto = false): void {
  const st = s.story;
  const sc = scenarioById(s.scenarioId);
  const rule = RULE_BY_ID[ruleId];
  const label = rule ? `${ruleId} ${rule.name}` : ruleId;
  if (kind === "acknowledge") {
    st.acked = true;
    pushEvent(s, { kind: "action", severity: "Normal", title: `Acknowledged ${label}`, detail: "Operator acknowledged the finding", action: { ruleId, kind, auto } });
  } else if (!sc.expected.length || s.scenarioId === "healthy" || s.fx.repairStart !== null) {
    pushEvent(s, { kind: "action", severity: "Normal", title: `${kind === "repair" ? "Repair" : "Mitigation"} not needed for ${label}`, detail: "No active fault on the plant to act on" });
  } else if (kind === "mitigate") {
    if (!s.fx.mitigated) {
      s.fx.mitigated = true;
      st.mitigatedAt = s.t;
      st.phase = "mitigated";
      pushEvent(s, { kind: "action", severity: "Normal", title: `Mitigation applied: ${label}`, detail: `${mitigationNote(ruleId)}. Severity halved and progression slowed; repair still needed`, action: { ruleId, kind, auto } });
    }
  } else {
    startRepair(s, ruleId, auto);
  }
  syncStory(s);
}

function stepStory(s: SimState): void {
  const st = s.story;
  const fx = s.fx;
  const t = s.t;
  let sc = scenarioById(s.scenarioId);

  // The fade-out (repair, or the end of a process disturbance) has finished.
  if (fx.repairStart !== null && fx.intensity <= 0.001 && sc.id !== "healthy") {
    const fault = sc.expected.length > 0;
    beginScenario(s, "healthy", true);
    st.settledAt = t;
    pushEvent(s, {
      kind: "action",
      severity: "Normal",
      title: fault ? `Repair complete: ${sc.name}` : `${sc.name} ended`,
      detail: fault ? "Fault removed, rules clearing through hysteresis" : "Drivers back at baseline",
      action: fault ? { ruleId: sc.expected[0], kind: "complete", auto: st.autopilot } : undefined,
    });
    if (!fault) st.nextFaultAt = t + 12;
    sc = scenarioById("healthy");
  }

  if (st.phase === "recovering" && sc.id === "healthy") {
    const quiet = RULES.every((r) => s.rules[r.id].status === "QUIET");
    if (quiet || t - st.settledAt > 45) {
      st.phase = "healthy";
      st.nextFaultAt = t + (st.profile === "story" ? 18 + ((st.rotation * 7) % 15) : 6);
      pushEvent(s, { kind: "action", severity: "Normal", title: "Plant healthy again", detail: "All rules cleared; signals follow the reference model" });
    }
  } else if (st.phase === "developing") {
    if (sc.expected.some((id) => s.rules[id].status === "ACTIVE")) {
      st.phase = "detected";
      st.detectedAt = t;
    } else if (st.autopilot && t - s.scenarioStart > 480) startRepair(s, sc.expected[0], true);
  }

  if (st.autopilot) stepBackground(s);

  if (st.autopilot && isHeld(s) && (st.phase === "developing" || st.phase === "detected")) {
    // Held fault: the crew acknowledges it but leaves it running; after its
    // hold time it is repaired and the next fault of the profile takes over.
    if (st.phase === "detected" && st.detectedAt !== null && !st.acked && t - st.detectedAt >= ACK_AFTER) {
      performAction(s, sc.expected[0], "acknowledge", true);
    }
    if (t >= st.holdUntil && (st.phase === "detected" || t - s.scenarioStart > 240)) {
      pushEvent(s, {
        kind: "action",
        severity: "Normal",
        title: `Repair complete: ${sc.name}`,
        detail: "Fault removed at the planned stop, rules clearing through hysteresis",
        action: { ruleId: sc.expected[0], kind: "complete", auto: true },
      });
      startHold(s);
    }
  } else if (st.autopilot) {
    if ((st.phase === "detected" || st.phase === "mitigated") && st.detectedAt !== null) {
      const d = t - st.detectedAt;
      const lead = sc.expected[0];
      if (!st.acked && d >= ACK_AFTER) performAction(s, lead, "acknowledge", true);
      if (st.phase === "detected" && d >= MITIGATE_AFTER) performAction(s, lead, "mitigate", true);
      if (d >= REPAIR_AFTER && (st.phase === "detected" || (st.mitigatedAt !== null && t - st.mitigatedAt >= 25))) startRepair(s, lead, true);
    } else if (st.phase === "healthy") {
      if (sc.id === "healthy") {
        if (t >= st.nextFaultAt && st.profile === "story") {
          const id = STORY_ROTATION[st.rotation % STORY_ROTATION.length];
          st.rotation += 1;
          setScenario(s, id);
          sc = scenarioById(id);
        } else if (t >= st.nextFaultAt && (st.profile === "advisory" || st.profile === "critical")) {
          startHold(s);
          sc = scenarioById(s.scenarioId);
        }
      } else if (fx.repairStart === null && t - s.scenarioStart >= DISTURBANCE_MIN) {
        fx.repairStart = t;
        fx.repairFrom = Math.max(fx.intensity, 0.05);
        fx.repairDur = REPAIR_MIN;
      }
    }
  }
  st.label = storyLabel(s);
}

function pushEvent(s: SimState, e: Omit<SimEvent, "t" | "clock">) {
  const { clock, day } = formatClock(s.t);
  s.events.unshift({ ...e, t: s.t, clock: day > 0 ? `D+${day} ${clock}` : clock });
  if (s.events.length > 60) s.events.length = 60;
}

/* ------------------------------------------------------------------ */
/* Step                                                                */
/* ------------------------------------------------------------------ */

/**
 * Advance one simulated minute. `emit: false` skips copying histories into a
 * new frame — used for warm-up and for the extra minutes of a fast-forward tick.
 */
export function stepSim(s: SimState, emit = true): SimFrame {
  s.t += 1;
  const t = s.t;
  const scenario: KilnScenario = scenarioById(s.scenarioId);
  const advanced = s.fx.scMin + (s.fx.repairStart !== null ? 0 : s.fx.mitigated ? 0.3 : s.story.pace);
  const sm = s.fx.hold !== null ? Math.min(advanced, Math.max(s.fx.hold, s.fx.scMin)) : advanced;
  {
    const fx = s.fx;
    fx.scMin = sm;
    if (fx.repairStart !== null) fx.intensity = Math.max(0, fx.repairFrom * (1 - (t - fx.repairStart) / fx.repairDur));
    else fx.intensity += ((fx.mitigated ? 0.5 : 1) - fx.intensity) * 0.12;
  }
  const intensity = s.fx.intensity;
  const rnd = s.rand;

  const gauss = () => {
    const u = 1 - rnd();
    const v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  /** First-order autoregressive noise: looks like real process wander, not white noise. */
  const ar = (key: string, sigma: number, phi = 0.82) => {
    const prev = s.ar[key] ?? 0;
    const next = phi * prev + Math.sqrt(1 - phi * phi) * sigma * gauss();
    s.ar[key] = next;
    return next;
  };

  /* ---------------- scenario effects ---------------- */
  const driverDelta: Record<string, number> = {};
  const physDelta: Record<string, number> = {};
  const sensorDelta: Record<string, number> = {};
  const stateOverride: Record<string, string> = {};
  const holdTags = new Set<string>();
  const profileDelta = { hotSpot: 0, coldBand: 0 };

  // The background instrument fault adds its own effects at full strength,
  // skipping any signal the main scenario already drives.
  const mainTags = new Set(scenario.effects.map((e) => (e.target.kind === "signal" ? e.target.tag : e.target.name)));
  const bgScenario = s.bg && t <= s.bg.end ? scenarioById(s.bg.scenarioId) : null;
  const layered = [
    ...scenario.effects.map((e) => ({ e, at: sm, scale: intensity })),
    ...(bgScenario
      ? bgScenario.effects
          .filter((e) => !mainTags.has(e.target.kind === "signal" ? e.target.tag : e.target.name))
          .map((e) => ({ e, at: t - s.bg!.start, scale: 1 }))
      : []),
  ];

  for (const { e, at, scale } of layered) {
    let lvl = effectLevel(e, at);
    // Oscillating and noise effects swing negative; only state/hold effects need a positive level.
    if (lvl === 0 || ((e.state || e.hold) && lvl < 0)) continue;
    if (e.state || e.hold) {
      if (scale < 0.3) continue;
    } else lvl *= scale;
    const tg = e.target;
    if (tg.kind === "driver") driverDelta[tg.name] = (driverDelta[tg.name] ?? 0) + (e.delta ?? 0) * lvl;
    else if (tg.kind === "profile") profileDelta[tg.name] += (e.delta ?? 0) * lvl;
    else {
      if (e.state) stateOverride[tg.tag] = e.state;
      if (e.hold) holdTags.add(tg.tag);
      if (e.delta) {
        const bucket = e.sensor ? sensorDelta : physDelta;
        bucket[tg.tag] = (bucket[tg.tag] ?? 0) + e.delta * lvl;
      }
    }
  }

  /* ---------------- true operating drivers ---------------- */
  const { clock, day } = formatClock(t);
  const hourOfDay = (((EPOCH_MIN + t) % 1440) + 1440) % 1440 / 60;
  const feedSp = 330 + (driverDelta.feedSp ?? 0);
  const fuelSp = 10.58 + (driverDelta.fuelSp ?? 0);
  const trueFeed = 330 + (driverDelta.feed ?? 0) + ar("d:feed", 1.3, 0.9);
  const trueFuel = 10.58 + (driverDelta.fuel ?? 0) + ar("d:fuel", 0.04, 0.9);
  const trueSpeed = 3.8 + (driverDelta.speed ?? 0) + ar("d:speed", 0.004, 0.9);
  const trueDraft = -3.82 + (driverDelta.draft ?? 0) + ar("d:draft", 0.05, 0.85);
  const ambient = 35.8 + 1.2 * Math.sin((2 * Math.PI * (hourOfDay - 10)) / 24) + (driverDelta.ambient ?? 0);
  const floatPhase = (2 * Math.PI * t) / 240;

  /* ---------------- plant physics (true values) ---------------- */
  type Physics = Record<string, number>;
  const physics = (feed: number, fuel: number, speed: number, draft: number, amb: number): Physics => {
    const torque = 62 * Math.pow(feed / 330, 0.8) * Math.pow(speed / 3.8, 0.3);
    const tr = torque / 62 - 1;
    const oil = amb + 24 + 9 * tr;
    const p: Physics = {
      "ELE-KLN-01": torque,
      "SPD-KLN-01": speed,
      "TMP-KLN-21": amb + 64 * Math.pow(torque / 62, 2),
      "TMP-KLN-19": amb + 29.2 + 4 * tr,
      "TMP-KLN-20": amb + 24.7 + 4 * tr,
      "TMP-KLN-15": oil,
      "PRS-KLN-04": 2.2 - 0.018 * (oil - 56),
      "TMP-KLN-22": oil + 10.1 + 2 * tr,
      "TMP-KLN-23": oil + 7.9 + 2 * tr,
      "PRS-KLN-07": 86 * Math.pow(feed / 330, 0.6) + 4 * Math.cos(floatPhase),
      "POS-KLN-01": -3.1 + 2.2 * Math.sin(floatPhase),
      "GAS-KLN-01": 2.6 + 0.028 * (330 - feed) - 0.4 * (fuel - 10.6) - 0.12 * (draft + 3.8),
      "TMP-KLN-13": 1085 + 35 * (fuel - 10.6) + 0.35 * (330 - feed),
      "TMP-KLN-14": 1445 + 40 * (fuel - 10.6) - 0.3 * (feed - 330),
      "PRS-KLN-01": draft,
      "PRS-KLN-03": -0.3,
      "FLO-KLN-01": feed,
      "FLO-KLN-02": fuel,
      "STS-KLN-08": 95.9,
    };
    for (const [tag, base] of Object.entries(VIB_BASE)) p[tag] = base * (speed / 3.8) * (1 + 0.12 * tr);
    for (const tag of BEARING_TAGS) p[tag] = amb + BEARING_OFFSETS[tag] + 6 * (speed / 3.8 - 1) + 3 * (feed / 330 - 1);
    p["GAS-KLN-02"] = 420 + 2500 * Math.max(0, 1.6 - p["GAS-KLN-01"]);
    return p;
  };

  const truth = physics(trueFeed, trueFuel, trueSpeed, trueDraft, ambient);
  for (const [tag, d] of Object.entries(physDelta)) if (tag in truth) truth[tag] += d;

  // Shell profile (true) and its scanner reading.
  const shellModelBase: number[] = [];
  const shellTrue: number[] = [];
  const fuelShift = 6 * (trueFuel - 10.6) + 0.4 * (ambient - 35.8);
  for (let i = 0; i < PROFILE_N; i++) {
    const xm = i * 0.5;
    const base = shellBaseline(xm) + fuelShift;
    shellModelBase.push(base);
    const hot = profileDelta.hotSpot * Math.exp(-Math.pow((xm - 52) / 2.4, 2));
    const cold = xm >= 29 && xm <= 37 ? profileDelta.coldBand * Math.sin(((xm - 29) / 8) * Math.PI) : 0;
    shellTrue.push(base + hot + cold);
  }

  /* ---------------- sensor readings ---------------- */
  const measured: Record<string, number> = {};
  for (const def of ANALOG) {
    if (def.calculated) continue;
    const base = truth[def.tag];
    if (base === undefined) continue;
    const noise = ar(`n:${def.tag}`, def.sigma, def.tag.startsWith("VIB") ? 0.6 : 0.75);
    let v = base + noise + (sensorDelta[def.tag] ?? 0);
    if (def.tag === "GAS-KLN-02") v = Math.max(0, v);
    if (holdTags.has(def.tag)) {
      if (s.holds[def.tag] === undefined) s.holds[def.tag] = s.hist[def.tag].at(-1) ?? v;
      v = s.holds[def.tag];
    }
    measured[def.tag] = v;
  }
  for (const tag of Object.keys(s.holds)) if (!holdTags.has(tag)) delete s.holds[tag];

  const states: Record<string, string> = {};
  for (const def of SIGNALS) if (def.type === "state") states[def.tag] = stateOverride[def.tag] ?? def.states!.normal;
  if (Math.abs(measured["POS-KLN-01"]) >= 44) states["POS-KLN-02"] = "LIMIT";

  const scanBias = (measured["STS-KLN-08"] - 95.9) * 0.6; // fouled lens under-reads
  const shellProfile = shellTrue.map((v, i) => v + ar(`sh:${i % 8}`, 1.2, 0.6) + scanBias);

  /* ---------------- ambient estimate & witnesses ---------------- */
  const speedM = measured["SPD-KLN-01"];
  const feedMeter = measured["FLO-KLN-01"];
  const fuelMeter = measured["FLO-KLN-02"];
  const draftM = measured["PRS-KLN-01"];
  const flagged = (tag: string) => Boolean(s.flags[tag]);

  const ambSamples = BEARING_TAGS.filter((tg) => !flagged(tg)).map(
    (tg) => measured[tg] - BEARING_OFFSETS[tg] - 6 * (speedM / 3.8 - 1) - 3 * (feedMeter / 330 - 1),
  );
  const ambientEst = median(ambSamples);

  const torqueM = measured["ELE-KLN-01"];
  const o2M = measured["GAS-KLN-01"];
  const feedTorque = 330 * Math.pow(torqueM / 62 / Math.pow(speedM / 3.8, 0.3), 1 / 0.8);
  const feedO2 = 330 - (o2M - 2.6 + 0.4 * (fuelMeter - 10.6) + 0.12 * (draftM + 3.8)) / 0.028;
  const fuelBurning = 10.6 + (measured["TMP-KLN-14"] - 1445 + 0.3 * (feedMeter - 330)) / 40;
  const fuelInlet = 10.6 + (measured["TMP-KLN-13"] - 1085 - 0.35 * (330 - feedMeter)) / 35;

  const feedForModel = flagged("FLO-KLN-01") ? (feedTorque + feedO2) / 2 : feedMeter;
  const fuelForModel = flagged("FLO-KLN-02") ? (fuelBurning + fuelInlet) / 2 : fuelMeter;

  /* ---------------- reference model ---------------- */
  const model = physics(feedForModel, fuelForModel, speedM, draftM, ambientEst);
  // Oil pressure follows the *measured* oil temperature (D5 Table 9.5); CO follows measured O₂.
  if (!flagged("TMP-KLN-15")) model["PRS-KLN-04"] = 2.2 - 0.018 * (measured["TMP-KLN-15"] - 56);
  model["GAS-KLN-02"] = 420 + 2500 * Math.max(0, 1.6 - o2M);
  model["FLO-KLN-01"] = feedSp;
  model["FLO-KLN-02"] = fuelSp;
  model["PRS-KLN-01"] = -3.82;
  model["SPD-KLN-01"] = 3.8 + (driverDelta.speed ?? 0);
  model["STS-KLN-08"] = 95.9;

  const shellModel = shellModelBase.map((v) => v - 6 * (trueFuel - fuelForModel));
  // Calculated values.
  measured["CAL-KLN-03"] = Math.max(...shellProfile);
  model["CAL-KLN-03"] = Math.max(...shellModel);
  measured["CAL-KLN-06"] = o2M - model["GAS-KLN-01"];
  model["CAL-KLN-06"] = 0;
  measured["CAL-KLN-07"] = 40 - Math.abs(measured["POS-KLN-01"]);
  model["CAL-KLN-07"] = 40 - Math.abs(model["POS-KLN-01"]);

  const bandIdx = (a: number, b: number) => [Math.round(a * 2), Math.round(b * 2)];
  const [b0, b1] = bandIdx(29, 37);
  let bandRes = 0;
  for (let i = b0; i <= b1; i++) bandRes += shellProfile[i] - shellModel[i];
  const coldBandResidual = bandRes / (b1 - b0 + 1);

  /* ---------------- history ---------------- */
  s.times.push(t);
  if (s.times.length > HISTORY_LEN) s.times.shift();
  for (const def of SIGNALS) {
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
  const sig = (tag: string) => SIGNAL_BY_TAG[tag].sigma || 1;
  const z = (tag: string) => res(tag) / sig(tag);
  /** Mean residual over the last `n` samples — filters process wander out of slow trends. */
  const meanRes = (tag: string, n = 10) => {
    const h = s.hist[tag];
    const mh = s.modelHist[tag];
    const k = Math.min(n, h.length);
    let acc = 0;
    for (let i = h.length - k; i < h.length; i++) acc += h[i] - mh[i];
    return k ? acc / k : 0;
  };

  /* ---------------- data quality (R-DQ-01) ---------------- */
  const invalid: Record<string, string> = {};
  for (const def of ANALOG) {
    if (def.calculated) continue;
    const h = s.hist[def.tag];
    if (h.length >= 6) {
      const last = h.slice(-6);
      if (last.every((v) => Math.abs(v - last[0]) < 1e-9)) invalid[def.tag] = "Flat-line while running";
    }
    if (def.tag.startsWith("VIB") && measured[def.tag] < 0.05 && speedM > 1) invalid[def.tag] = "Zero vibration while running";
  }
  if (states["STS-KLN-06"] === "FAULT") {
    invalid["GAS-KLN-01"] = "Gas analyser FAULT";
    invalid["GAS-KLN-02"] = "Gas analyser FAULT";
  }
  const suspect: Record<string, string> = {};
  if (measured["STS-KLN-08"] < 90) suspect["CAL-KLN-03"] = `Scanner coverage ${measured["STS-KLN-08"].toFixed(1)} % < 90 %`;

  /* ---------------- sensor validation (R-DQ-02) ---------------- */
  const dq2: Record<string, string> = {};
  for (const tag of RTD_TAGS) {
    const h = s.hist[tag];
    if (h.length < 2) continue;
    const step = h[h.length - 1] - h[h.length - 2];
    const r = res(tag);
    if ((step > 6 && Math.abs(r) > 6 && step > 0.75 * Math.abs(r)) || (s.flags[tag]?.rule === "R-DQ-02" && Math.abs(r) > 3 * sig(tag))) {
      dq2[tag] = `Implausible ${step > 0 ? "jump" : "step"}: ${r > 0 ? "+" : ""}${r.toFixed(1)} K unexplained by drivers`;
    }
  }
  // Driven signals disagree: a torque step should move winding ≈ 2 K per % torque.
  const eleTrend = meanRes("ELE-KLN-01", 3);
  if (eleTrend / sig("ELE-KLN-01") > 5 && meanRes("TMP-KLN-21", 3) < 0.25 * 2 * eleTrend && meanRes("TMP-KLN-15", 3) < 1.5) {
    dq2["ELE-KLN-01"] = `Torque ${fmtZ(z("ELE-KLN-01"))} but winding and oil follow the model`;
  }
  const oilTrend = meanRes("TMP-KLN-15", 3);
  if (oilTrend / sig("TMP-KLN-15") > 6 && Math.max(meanRes("TMP-KLN-22", 3), meanRes("TMP-KLN-23", 3)) < 0.3 * oilTrend) {
    dq2["TMP-KLN-15"] = `Oil temperature ${fmtZ(z("TMP-KLN-15"))} but gearbox bearings follow the model`;
  }
  if (Math.abs(feedTorque - feedO2) < 12 && Math.abs(feedMeter - (feedTorque + feedO2) / 2) > 22) {
    dq2["FLO-KLN-01"] = `Witness vote: torque ${feedTorque.toFixed(0)} t/h, O₂ ${feedO2.toFixed(0)} t/h vs meter ${feedMeter.toFixed(0)} t/h`;
  }
  if (Math.abs(fuelBurning - fuelInlet) < 0.5 && Math.abs(fuelMeter - (fuelBurning + fuelInlet) / 2) > 0.8) {
    dq2["FLO-KLN-02"] = `Witness vote: burning zone ${fuelBurning.toFixed(2)} t/h, inlet ${fuelInlet.toFixed(2)} t/h vs meter ${fuelMeter.toFixed(2)} t/h`;
  }
  const o2Sticky = s.flags["GAS-KLN-01"]?.rule === "R-DQ-02" && res("GAS-KLN-01") > 0.25 && res("TMP-KLN-13") > -25;
  if (!invalid["GAS-KLN-01"] && ((res("GAS-KLN-01") > 0.35 && res("TMP-KLN-13") > -4 && Math.abs(z("FLO-KLN-01")) < 3) || o2Sticky)) {
    dq2["GAS-KLN-01"] = `Thermal signature: O₂ +${res("GAS-KLN-01").toFixed(2)} vol% above model with no inlet-temperature drop`;
  }

  // Update sticky flags (4 clean samples to clear).
  const raise = (tag: string, rule: "R-DQ-01" | "R-DQ-02", note: string) => {
    const f = s.flags[tag];
    if (!f) {
      s.flags[tag] = { rule, note, since: t, clean: 0 };
      pushEvent(s, { kind: "quality", severity: "Alert", title: `${tag} marked ${rule === "R-DQ-01" ? "invalid" : "suspect"}`, detail: note });
    } else {
      f.note = note;
      f.rule = rule;
      f.clean = 0;
    }
  };
  const flagNow: Record<string, ["R-DQ-01" | "R-DQ-02", string]> = {};
  for (const [tag, note] of Object.entries(invalid)) flagNow[tag] = ["R-DQ-01", note];
  for (const [tag, note] of Object.entries(suspect)) flagNow[tag] = ["R-DQ-01", note];
  for (const [tag, note] of Object.entries(dq2)) if (!flagNow[tag]) flagNow[tag] = ["R-DQ-02", note];
  for (const [tag, [rule, note]] of Object.entries(flagNow)) raise(tag, rule, note);
  for (const tag of Object.keys(s.flags)) {
    if (flagNow[tag]) continue;
    s.flags[tag].clean += 1;
    if (s.flags[tag].clean >= 4) {
      pushEvent(s, { kind: "quality", severity: "Normal", title: `${tag} quality restored`, detail: "Four clean samples" });
      delete s.flags[tag];
    }
  }
  // A suspect O₂ makes the false-air index suspect too.
  const quality = (tag: string): Quality => {
    if (tag === "CAL-KLN-06" && (s.flags["GAS-KLN-01"] || s.flags["TMP-KLN-13"])) return s.flags["GAS-KLN-01"]?.rule === "R-DQ-01" ? "Invalid" : "Suspect";
    const f = s.flags[tag];
    if (!f) return "Good";
    return f.rule === "R-DQ-01" && invalid[tag] ? "Invalid" : "Suspect";
  };
  const good = (...tags: string[]) => tags.every((tg) => quality(tg) === "Good");

  /* ---------------- rules ---------------- */
  interface Hit {
    severity: Severity;
    evidence: string;
    tags: string[];
    subs?: SubassemblyId[];
    lead?: Lead;
    stateRule?: boolean;
  }
  const hits: Record<string, Hit | null> = {};
  const ratio = (tag: string) => measured[tag] / Math.max(0.05, model[tag]);
  const thrustTrendZ = meanRes("PRS-KLN-07") / sig("PRS-KLN-07");
  const steadyProcess = Math.abs(z("FLO-KLN-01")) < 3;

  // R-SUP-02 single-bearing heating, thrust normal
  {
    const tz = thrustTrendZ;
    let best: { tag: string; r: number; st: (typeof STATIONS)[number] } | null = null;
    for (const st of STATIONS) {
      const pairs: Array<[string, string]> = [[st.lA, st.lB], [st.lB, st.lA], [st.rA, st.rB], [st.rB, st.rA]];
      for (const [a, b] of pairs) {
        if (!good(a, b)) continue;
        const r = res(a);
        if (r > 6 && res(b) < 2.5 && Math.abs(tz) < 2.5 && (!best || r > best.r)) best = { tag: a, r, st };
      }
    }
    if (best) {
      const sl = slope(s.hist[best.tag], 15) ?? 0;
      hits["R-SUP-02"] = {
        severity: best.r > 14 || measured[best.tag] >= 75 ? "Critical" : "Alert",
        evidence: `${best.tag} +${best.r.toFixed(1)} K above model, heating ${(sl * 60).toFixed(1)} K/h · thrust normal (${fmtZ(tz)})`,
        tags: [best.tag],
        subs: [best.st.sub],
        lead: { tag: best.tag, target: measured[best.tag] < 75 ? 75 : 85 },
      };
    }
  }
  // R-SUP-01 Roller skew
  {
    let best: { split: number; st: (typeof STATIONS)[number]; side: string; a: string; b: string } | null = null;
    for (const st of STATIONS) {
      for (const [side, a, b] of [["left", st.lA, st.lB], ["right", st.rA, st.rB]] as const) {
        if (!good(a, b)) continue;
        const split = Math.abs(res(a) - res(b));
        if (!best || split > best.split) best = { split, st, side, a, b };
      }
    }
    const tz = thrustTrendZ;
    if (best && best.split > 4.5 && tz > 2 && good("PRS-KLN-07") && !hits["R-SUP-02"] && s.rules["R-SUP-02"].status === "QUIET") {
      const hotter = res(best.a) > res(best.b) ? best.a : best.b;
      hits["R-SUP-01"] = {
        severity: best.split > 8 || measured[hotter] >= 75 ? "Critical" : "Alert",
        evidence: `Station ${best.st.n} ${best.side} pair split ${best.split.toFixed(1)} K (compensated) · thrust ${fmtZ(tz)}`,
        tags: [best.a, best.b, "PRS-KLN-07"],
        subs: [best.st.sub, "thrust"],
        lead: { tag: hotter, target: measured[hotter] < 75 ? 75 : 85 },
      };
    }
  }
  // R-SUP-05 Station load shift
  for (const st of STATIONS) {
    const tags = [st.lA, st.lB, st.rA, st.rB];
    if (!good(...tags)) continue;
    const rs = tags.map(res);
    if (rs.every((r) => r > 3.5)) {
      hits["R-SUP-05"] = {
        severity: rs.every((r) => r > 7) ? "Critical" : "Alert",
        evidence: `All four station ${st.n} bearings above model (min +${Math.min(...rs).toFixed(1)} K)`,
        tags,
        subs: [st.sub],
      };
    }
  }
  // R-SUP-03 Thrust hydraulic fault
  if (good("PRS-KLN-07") && z("PRS-KLN-07") < -5) {
    const pos = measured["POS-KLN-01"];
    hits["R-SUP-03"] = {
      severity: pos < -12 || states["POS-KLN-02"] === "LIMIT" || measured["PRS-KLN-07"] <= 30 ? "Critical" : "Alert",
      evidence: `Thrust pressure ${measured["PRS-KLN-07"].toFixed(0)} bar (${fmtZ(z("PRS-KLN-07"))}) · axial ${pos.toFixed(1)} mm`,
      tags: ["PRS-KLN-07", "POS-KLN-01", "POS-KLN-02"],
      lead: { tag: "PRS-KLN-07", target: measured["PRS-KLN-07"] > 30 ? 30 : 20 },
    };
  }
  // R-SUP-04 Axial position abnormal / not floating
  if (good("POS-KLN-01")) {
    const pos = measured["POS-KLN-01"];
    const h = s.hist["POS-KLN-01"];
    const range6h = h.length >= HISTORY_LEN ? Math.max(...h) - Math.min(...h) : Infinity;
    if ((Math.abs(pos) > 22 || range6h < 3) && !hits["R-SUP-03"]) {
      hits["R-SUP-04"] = {
        severity: Math.abs(pos) > 30 ? "Critical" : "Alert",
        evidence: Math.abs(pos) > 22 ? `LVDT ${pos.toFixed(1)} mm beyond ±22 mm` : `Only ${range6h.toFixed(1)} mm floating movement in 6 h`,
        tags: ["POS-KLN-01", "PRS-KLN-07"],
        lead: { tag: "POS-KLN-01", target: pos < 0 ? (pos > -30 ? -30 : -40) : pos < 30 ? 30 : 40 },
      };
    }
  }
  // R-DRV-01 Drive bearing defect
  {
    const groups: Array<[string, string, SubassemblyId, string]> = [
      ["VIB-KLN-01", "TMP-KLN-19", "main-motor", "Motor DE"],
      ["VIB-KLN-02", "TMP-KLN-22", "gearbox", "Gearbox input"],
      ["VIB-KLN-03", "TMP-KLN-23", "gearbox", "Gearbox output"],
    ];
    for (const [vib, tmp, sub, label] of groups) {
      if (!good(vib, tmp)) continue;
      const rt = ratio(vib);
      if (rt > 1.4 && meanRes(tmp, 10) > 1.5 && s.rules["R-DRV-06"].status === "QUIET") {
        hits["R-DRV-01"] = {
          severity: rt > 2.2 || measured[vib] >= 4.5 ? "Critical" : "Alert",
          evidence: `${label} vibration ×${rt.toFixed(2)} model with bearing +${meanRes(tmp, 10).toFixed(1)} K`,
          tags: [vib, tmp],
          subs: [sub],
          lead: { tag: vib, target: measured[vib] < 4.5 ? 4.5 : 7.1 },
        };
      }
    }
  }
  // R-DRV-06 Coupling misalignment
  if (good("VIB-KLN-01", "VIB-KLN-02", "TMP-KLN-19", "TMP-KLN-22")) {
    const r1 = ratio("VIB-KLN-01");
    const r2 = ratio("VIB-KLN-02");
    if (r1 > 1.3 && r2 > 1.3 && meanRes("TMP-KLN-19", 10) < 1.5 && meanRes("TMP-KLN-22", 10) < 1.5) {
      hits["R-DRV-06"] = {
        severity: r1 > 1.9 && r2 > 1.9 ? "Critical" : "Alert",
        evidence: `Both coupling sides up together: motor DE ×${r1.toFixed(2)}, gearbox input ×${r2.toFixed(2)}`,
        tags: ["VIB-KLN-01", "VIB-KLN-02"],
        lead: { tag: "VIB-KLN-02", target: 4.5 },
      };
    }
  }
  // R-DRV-07 Gearbox oil cooling loss
  if (good("TMP-KLN-15", "ELE-KLN-01") && res("TMP-KLN-15") > 4 && Math.abs(z("ELE-KLN-01")) < 3) {
    hits["R-DRV-07"] = {
      severity: measured["TMP-KLN-15"] >= 75 ? "Critical" : "Alert",
      evidence: `Oil +${res("TMP-KLN-15").toFixed(1)} K above model at normal torque · pressure ${fmtZ(z("PRS-KLN-04"))} (explained by hot oil)`,
      tags: ["TMP-KLN-15", "PRS-KLN-04", "TMP-KLN-22", "TMP-KLN-23"],
      lead: { tag: "TMP-KLN-15", target: measured["TMP-KLN-15"] < 75 ? 75 : 85 },
    };
  }
  // R-DRV-08 Drive overload / drag
  if (good("ELE-KLN-01", "TMP-KLN-21", "TMP-KLN-15") && z("ELE-KLN-01") > 4 && res("TMP-KLN-21") > 4 && res("TMP-KLN-15") > 1.5 && coldBandResidual > -15) {
    hits["R-DRV-08"] = {
      severity: measured["ELE-KLN-01"] >= 90 || measured["TMP-KLN-21"] >= 130 ? "Critical" : "Alert",
      evidence: `Torque ${fmtZ(z("ELE-KLN-01"))} with winding +${res("TMP-KLN-21").toFixed(1)} K and oil +${res("TMP-KLN-15").toFixed(1)} K following · no cold band`,
      tags: ["ELE-KLN-01", "TMP-KLN-21", "TMP-KLN-15", "TMP-KLN-22", "TMP-KLN-23"],
      lead: { tag: "ELE-KLN-01", target: measured["ELE-KLN-01"] < 90 ? 90 : 105 },
    };
  }
  // R-DRV-02 Gear mesh / pinion
  if (good("VIB-KLN-04") && ratio("VIB-KLN-04") > 1.35) {
    const rt = ratio("VIB-KLN-04");
    const spray = states["STS-KLN-05"];
    hits["R-DRV-02"] = {
      severity: rt > 1.9 || measured["VIB-KLN-04"] >= 5.6 ? "Critical" : "Alert",
      evidence: `Pinion vibration ×${rt.toFixed(2)} model at steady torque · cause ranked: ${spray === "OK" ? "misalignment / runout (spray OK)" : "lubrication starvation (spray FAULT)"}`,
      tags: ["VIB-KLN-04", "STS-KLN-05"],
      lead: { tag: "VIB-KLN-04", target: measured["VIB-KLN-04"] < 5.6 ? 5.6 : 9 },
    };
  }
  // R-DRV-03 Gearbox lubrication failure
  {
    const noFlow = states["FLO-KLN-05"] === "NO FLOW";
    const low = states["LEV-KLN-01"] === "LOW LEVEL";
    const pz = good("PRS-KLN-04") ? z("PRS-KLN-04") : 0;
    if (pz < -5 || noFlow || low) {
      hits["R-DRV-03"] = {
        severity: noFlow || low || measured["PRS-KLN-04"] <= 0.8 ? "Critical" : "Alert",
        evidence: `Oil pressure ${measured["PRS-KLN-04"].toFixed(2)} bar (${fmtZ(pz)} below what oil temperature explains)${noFlow ? " · flow switch NO FLOW" : ""}${low ? " · level LOW" : ""}`,
        tags: ["PRS-KLN-04", "FLO-KLN-05", "LEV-KLN-01", "TMP-KLN-15"],
        lead: { tag: "PRS-KLN-04", target: measured["PRS-KLN-04"] > 1.2 ? 1.2 : 0.8 },
      };
    }
  }
  if (states["STS-KLN-05"] === "FAULT") hits["R-DRV-04"] = { severity: "Critical", evidence: "Girth-gear spray controller reports FAULT", tags: ["STS-KLN-05"], stateRule: true };
  if (states["STS-KLN-11"] !== "READY") hits["R-DRV-05"] = { severity: "Alert", evidence: "Auxiliary drive reports NOT READY", tags: ["STS-KLN-11"], stateRule: true };
  // R-SHL-01 Refractory hot spot
  if (good("CAL-KLN-03")) {
    const r = res("CAL-KLN-03");
    const sl = (slope(s.hist["CAL-KLN-03"], 20) ?? 0) * 60;
    if (r > 12.5) {
      const idx = shellProfile.indexOf(Math.max(...shellProfile));
      hits["R-SHL-01"] = {
        severity: measured["CAL-KLN-03"] >= 380 || sl > 20 ? "Critical" : "Alert",
        evidence: `Shell max ${measured["CAL-KLN-03"].toFixed(0)} °C at ${(idx * 0.5).toFixed(1)} m, +${r.toFixed(0)} K above profile, rising ${sl.toFixed(0)} K/h`,
        tags: ["CAL-KLN-03"],
        lead: { tag: "CAL-KLN-03", target: measured["CAL-KLN-03"] < 380 ? 380 : 420 },
      };
    }
  }
  // R-SHL-02 Ring / coating build-up
  if (good("CAL-KLN-03", "ELE-KLN-01") && coldBandResidual < -15 && z("ELE-KLN-01") > 2.5 && ratio("VIB-KLN-01") < 1.25 && ratio("VIB-KLN-02") < 1.25) {
    hits["R-SHL-02"] = {
      severity: measured["ELE-KLN-01"] >= 90 ? "Critical" : "Alert",
      evidence: `Cold band 29–37 m ${coldBandResidual.toFixed(0)} K vs model · torque ${fmtZ(z("ELE-KLN-01"))} · drive vibration normal`,
      tags: ["CAL-KLN-03", "ELE-KLN-01", "TMP-KLN-21", "TMP-KLN-15"],
      lead: { tag: "ELE-KLN-01", target: 90 },
    };
  }
  // R-SHL-03 Inlet seal false air
  if (good("GAS-KLN-01", "TMP-KLN-13") && z("GAS-KLN-01") > 3 && res("TMP-KLN-13") < -8 && steadyProcess) {
    const fa = measured["CAL-KLN-06"];
    hits["R-SHL-03"] = {
      severity: fa >= 1.0 ? "Critical" : "Alert",
      evidence: `O₂ +${res("GAS-KLN-01").toFixed(2)} vol% above model with inlet ${res("TMP-KLN-13").toFixed(0)} K below · false-air index ${fa.toFixed(2)}`,
      tags: ["GAS-KLN-01", "TMP-KLN-13", "PRS-KLN-01", "CAL-KLN-06"],
      lead: { tag: "CAL-KLN-06", target: fa < 0.5 ? 0.5 : 1.0 },
    };
  }
  // R-SHL-04 Outlet seal cooling / leakage
  if (states["STS-KLN-10"] === "STOPPED") {
    hits["R-SHL-04"] = { severity: "Critical", evidence: `Seal cooling fan STOPPED · hood ${measured["PRS-KLN-03"].toFixed(2)} mbar`, tags: ["STS-KLN-10", "PRS-KLN-03"], stateRule: true };
  } else if (good("PRS-KLN-03") && res("PRS-KLN-03") > 0.12) {
    hits["R-SHL-04"] = { severity: "Alert", evidence: `Hood pressure ${fmtZ(z("PRS-KLN-03"))} toward positive`, tags: ["PRS-KLN-03"], lead: { tag: "PRS-KLN-03", target: 0 } };
  }
  // R-SHL-05 Seal overlap low
  if (good("POS-KLN-01") && measured["CAL-KLN-07"] < 10) {
    hits["R-SHL-05"] = {
      severity: measured["CAL-KLN-07"] < 5 ? "Critical" : "Alert",
      evidence: `Seal overlap margin ${measured["CAL-KLN-07"].toFixed(1)} mm (< 10 mm)`,
      tags: ["CAL-KLN-07", "POS-KLN-01"],
      lead: { tag: "CAL-KLN-07", target: measured["CAL-KLN-07"] > 5 ? 5 : 0 },
    };
  }
  // R-DQ-01 / R-DQ-02
  {
    const dq1 = Object.entries(s.flags).filter(([, f]) => f.rule === "R-DQ-01");
    if (dq1.length) {
      hits["R-DQ-01"] = { severity: "Alert", evidence: dq1.map(([tg, f]) => `${tg}: ${f.note}`).join(" · "), tags: dq1.map(([tg]) => tg), stateRule: true };
    }
    const dq2f = Object.entries(s.flags).filter(([, f]) => f.rule === "R-DQ-02");
    if (dq2f.length) {
      hits["R-DQ-02"] = { severity: "Alert", evidence: dq2f.map(([tg, f]) => `${tg}: ${f.note}`).join(" · "), tags: dq2f.map(([tg]) => tg) };
    }
  }
  // R-ANM-01 Unclassified deviation
  {
    const covered = new Set<string>();
    for (const r of RULES) {
      const mem = s.rules[r.id];
      if (hits[r.id] || mem.status !== "QUIET") for (const tg of [...r.inputs, ...(hits[r.id]?.tags ?? []), ...mem.tags]) covered.add(tg);
    }
    const far = ANALOG.filter((d) => good(d.tag) && !covered.has(d.tag) && Math.abs(z(d.tag)) > 10).map((d) => d.tag);
    if (far.length) {
      hits["R-ANM-01"] = { severity: "Alert", evidence: `No known pattern: ${far.map((tg) => `${tg} ${fmtZ(z(tg))}`).join(", ")}`, tags: far };
    }
  }

  /* ---------------- persistence & hysteresis ---------------- */
  for (const def of RULES) {
    const mem = s.rules[def.id];
    const hit = hits[def.id];
    if (hit) {
      mem.persistence += 1;
      mem.clean = 0;
      mem.severity = hit.severity;
      mem.evidence = hit.evidence;
      mem.tags = hit.tags;
      mem.lead = hit.lead ?? null;
      (mem as RuleMemory & { subs?: SubassemblyId[] }).subs = hit.subs;
      const threshold = hit.severity === "Critical" ? 1 : hit.stateRule ? 2 : 3;
      if (mem.status !== "ACTIVE" && mem.persistence >= threshold) {
        mem.status = "ACTIVE";
        mem.since = t;
        pushEvent(s, { kind: "rule", severity: hit.severity, title: `${def.id} ${def.name} confirmed`, detail: hit.evidence });
      } else if (mem.status === "QUIET") {
        mem.status = "PENDING";
      }
    } else if (mem.status !== "QUIET") {
      mem.clean += 1;
      if (mem.status === "PENDING" || mem.clean >= 4) {
        if (mem.status === "ACTIVE") pushEvent(s, { kind: "rule", severity: "Normal", title: `${def.id} ${def.name} cleared`, detail: "Four clean samples (hysteresis)" });
        Object.assign(mem, emptyRuleMemory());
      }
    } else {
      mem.persistence = 0;
    }
  }

  // State-change events.
  for (const def of SIGNALS) {
    if (def.type !== "state") continue;
    const now = states[def.tag];
    const prev = s.prevStates[def.tag];
    if (prev !== undefined && prev !== now) {
      pushEvent(s, { kind: "state", severity: stateSeverity(def, now), title: `${def.tag} ${now}`, detail: `${def.name}: ${prev} → ${now}` });
    }
    s.prevStates[def.tag] = now;
  }

  /* ---------------- signals out ---------------- */
  const ruleSevByTag: Record<string, Severity> = {};
  for (const def of RULES) {
    const mem = s.rules[def.id];
    if (mem.status !== "ACTIVE") continue;
    for (const tg of mem.tags) ruleSevByTag[tg] = maxSev(ruleSevByTag[tg] ?? "Normal", def.category === "Data quality" ? "Alert" : mem.severity);
  }

  const signals: Record<string, LiveSignal> = {};
  for (const def of SIGNALS) {
    const q = quality(def.tag);
    const qNote = def.tag === "CAL-KLN-06" && q !== "Good" ? "Derived from a suspect O₂ reading" : s.flags[def.tag]?.note ?? null;
    if (def.type === "state") {
      const st = states[def.tag];
      const ls = stateSeverity(def, st);
      signals[def.tag] = {
        tag: def.tag,
        value: null,
        state: st,
        display: st,
        model: null,
        residual: null,
        z: null,
        limitSeverity: ls,
        status: maxSev(ls, ruleSevByTag[def.tag] ?? "Normal"),
        quality: q,
        qualityNote: qNote,
        slopePerHour: null,
        timeToLimit: null,
      };
      continue;
    }
    const v = measured[def.tag];
    const mv = model[def.tag];
    const r = v - mv;
    const zz = r / (def.sigma || 1);
    const ls = limitSeverity(def, v, def.tag === "FLO-KLN-01" ? feedSp : def.tag === "FLO-KLN-02" ? fuelSp : undefined);
    const sl = slope(s.hist[def.tag], 30);
    let ttl: string | null = null;
    if (sl !== null && def.limit && (def.limit.kind === "hi" || def.limit.kind === "lo")) {
      const target = def.limit.kind === "hi" ? (v < def.limit.warn ? def.limit.warn : def.limit.alarm) : v > def.limit.warn ? def.limit.warn : def.limit.alarm;
      const gap = target - v;
      if (Math.abs(sl) > def.sigma * 0.02 && Math.sign(gap) === Math.sign(sl) && Math.abs(gap / sl) < 72 * 60) ttl = formatDuration(gap / sl);
    }
    let status = maxSev(ls, ruleSevByTag[def.tag] ?? "Normal");
    if (q !== "Good") status = maxSev(status, "Alert");
    // Instrument alarms: announced only for trusted readings, and not during warm-up.
    if (q === "Good" && !def.calculated && t > 0) trackLimit(s, def, ls, displayValue(def, v, null));
    signals[def.tag] = {
      tag: def.tag,
      value: v,
      state: null,
      display: displayValue(def, v, null),
      model: mv,
      residual: r,
      z: zz,
      limitSeverity: ls,
      status,
      quality: q,
      qualityNote: qNote,
      slopePerHour: sl === null ? null : sl * 60,
      timeToLimit: ttl,
    };
  }

  /* ---------------- rules out ---------------- */
  const rules: RuleState[] = RULES.map((def) => {
    const mem = s.rules[def.id];
    const memSubs = (mem as RuleMemory & { subs?: SubassemblyId[] }).subs;
    let ttl = "—";
    if (mem.status !== "QUIET" && mem.lead) {
      const h = s.hist[mem.lead.tag];
      const sl = slope(h, 30);
      const v = h.at(-1) ?? 0;
      const gap = mem.lead.target - v;
      if (sl !== null && Math.abs(sl) > 1e-6 && Math.sign(gap) === Math.sign(sl)) {
        const mins = gap / sl;
        ttl = mins < 72 * 60 ? `${formatDuration(mins)} (${formatDuration(mins * 0.75)}–${formatDuration(mins * 1.3)})` : "> 72 h";
      } else if ((mem.lead.target - v) * (sl ?? 0) <= 0) {
        ttl = Math.abs(gap) < 1e-6 ? "at limit" : "stable";
      }
    } else if (mem.status !== "QUIET" && mem.severity === "Critical") {
      ttl = "at limit";
    }
    const isDq = def.category === "Data quality" || def.category === "Anomaly";
    const confidence = mem.status === "QUIET" ? 0 : Math.min(98, Math.round(62 + Math.min(mem.persistence, 20) * 1.6 + (mem.severity === "Critical" ? 6 : 0)));
    const priority: RuleState["priority"] =
      mem.status === "QUIET" ? "P4" : mem.severity === "Critical" && !isDq ? "P1" : !isDq ? "P2" : "P3";
    return {
      id: def.id,
      name: def.name,
      category: def.category,
      system: def.system,
      subs: memSubs && memSubs.length ? memSubs : def.subs,
      logic: def.logic,
      severity: mem.status === "QUIET" ? "Normal" : mem.severity,
      status: mem.status,
      evidence: mem.status === "QUIET" ? "Quiet — signals follow the model" : mem.evidence,
      tags: mem.tags,
      persistence: mem.persistence,
      threshold: mem.severity === "Critical" ? 1 : 3,
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
    };
  });

  /* ---------------- health ---------------- */
  const subs = {} as Record<SubassemblyId, HealthCell>;
  for (const sa of SUBASSEMBLIES) {
    let penalty = 0;
    for (const def of SIGNALS) {
      if (def.sub !== sa.id) continue;
      const sg = signals[def.tag];
      if (sg.quality !== "Good") continue;
      if (sg.z !== null) penalty += Math.min(12, Math.max(0, Math.abs(sg.z) - 3.0) * 1.4);
      penalty += sg.limitSeverity === "Critical" ? 22 : sg.limitSeverity === "Alert" ? 9 : 0;
    }
    for (const r of rules) {
      if (r.status === "QUIET" || r.category === "Data quality" || r.category === "Anomaly") continue;
      if (!r.subs.includes(sa.id)) continue;
      penalty += r.status === "PENDING" ? 4 : r.severity === "Critical" ? 30 : 13;
    }
    const raw = clamp(99 - penalty, 12, 99);
    const key = `sub:${sa.id}`;
    const prev = s.smooth[key] ?? raw;
    const sm2 = prev + (raw - prev) * 0.25;
    s.smooth[key] = sm2;
    const intKey = `int:${sa.id}`;
    const prevInt = s.smooth[intKey];
    const h = prevInt !== undefined && Math.abs(sm2 - prevInt) < 0.7 ? prevInt : Math.round(sm2);
    s.smooth[intKey] = h;
    const activeHere = rules.filter((r) => r.status === "ACTIVE" && r.subs.includes(sa.id) && r.category !== "Data quality" && r.category !== "Anomaly");
    let status: Severity = h < 60 ? "Critical" : h < 85 ? "Alert" : "Normal";
    for (const r of activeHere) status = maxSev(status, r.severity);
    subs[sa.id] = { id: sa.id, name: sa.name, health: h, status };
  }
  const systems = {} as Record<SystemId, HealthCell>;
  for (const sy of SYSTEMS) {
    const cells = SUBASSEMBLIES.filter((x) => x.system === sy.id).map((x) => subs[x.id]);
    const mean = cells.reduce((a, c) => a + c.health, 0) / cells.length;
    const min = Math.min(...cells.map((c) => c.health));
    const h = Math.round(0.5 * mean + 0.5 * min);
    const status = cells.reduce<Severity>((acc, c) => maxSev(acc, c.status), "Normal");
    systems[sy.id] = { id: sy.id, name: sy.name, health: h, status };
  }
  const scored = SYSTEMS.filter((x) => x.scored).map((x) => systems[x.id]);
  const overall = Math.round(0.5 * (scored.reduce((a, c) => a + c.health, 0) / scored.length) + 0.5 * Math.min(...scored.map((c) => c.health)));
  const anyCrit = rules.some((r) => r.status === "ACTIVE" && r.severity === "Critical" && r.category !== "Data quality");
  const anyAdv = rules.some((r) => r.status === "ACTIVE" && r.category !== "Data quality");
  const condition: SimFrame["condition"] = anyCrit || overall < 60 ? "Critical" : anyAdv || overall < 85 ? "Alert" : "Healthy";

  s.healthHist.overall.push(overall);
  for (const sy of SYSTEMS) s.healthHist[sy.id].push(systems[sy.id].health);
  for (const k of Object.keys(s.healthHist) as Array<keyof SimState["healthHist"]>) {
    if (s.healthHist[k].length > HISTORY_LEN) s.healthHist[k].shift();
  }

  /* ---------------- pipeline ---------------- */
  const sigList = Object.values(signals);
  const invalidN = sigList.filter((x) => x.quality === "Invalid").length;
  const suspectN = sigList.filter((x) => x.quality === "Suspect").length;
  const pipeline: SimFrame["pipeline"] = {
    valid: sigList.length - invalidN - suspectN,
    held: Object.keys(s.holds).length,
    invalid: invalidN,
    suspect: suspectN,
    beyond3s: sigList.filter((x) => x.quality === "Good" && x.z !== null && Math.abs(x.z) > 3).length,
    evaluated: RULES.length,
    matching: Object.values(hits).filter(Boolean).length,
    confirmed: rules.filter((r) => r.status === "ACTIVE").length,
    pending: rules.filter((r) => r.status === "PENDING").length,
    p1: rules.filter((r) => r.priority === "P1").length,
    p2: rules.filter((r) => r.priority === "P2").length,
    p3: rules.filter((r) => r.priority === "P3").length,
  };

  const frame: SimFrame = {
    t,
    clock,
    day,
    scenarioId: s.scenarioId,
    scenarioMinute: t - s.scenarioStart,
    drivers: { feed: feedMeter, feedSp, fuel: fuelMeter, fuelSp, speed: speedM, draft: draftM, ambientEst },
    witnesses: { feedTorque, feedO2, fuelBurning, fuelInlet },
    signals,
    rules,
    subs,
    systems,
    overall,
    condition,
    pipeline,
    shellProfile,
    shellModel,
    coldBandResidual,
    times: s.times,
    history: emit ? { ...s.hist } : s.hist,
    modelHistory: emit ? { ...s.modelHist } : s.modelHist,
    healthHistory: emit ? { ...s.healthHist } : s.healthHist,
    events: s.events,
    phase: s.story.phase,
    storyLabel: s.story.label,
    autopilot: s.story.autopilot,
    profile: s.story.profile,
    background: s.bg?.scenarioId ?? null,
    defs: KILN_DEFS,
  };
  stepStory(s);
  frame.phase = s.story.phase;
  frame.storyLabel = s.story.label;
  frame.autopilot = s.story.autopilot;
  frame.profile = s.story.profile;
  frame.background = s.bg?.scenarioId ?? null;
  frame.events = emit ? s.events.slice() : s.events;
  s.frame = frame;
  return frame;
}

export { KILN_SCENARIOS, RULE_BY_ID };
