/**
 * Pyro-line demonstration scenarios, per machine.
 *
 * Same effect model as the kiln library (`../kiln-sim/scenarios`): timed
 * effects on a signal (physical, or `sensor` = only the reading is wrong), on
 * a line operating driver, or on the kiln shell profile. Driver effects act on
 * the whole line, so a feed cut started from KFS-01 moves every machine.
 *
 * `documentedDetection` is the detection time measured by the headless suite
 * on this simulation (D4 §8.2: simulated results demonstrate scripted demo
 * behaviour only, never a field detection rate).
 *
 * Scenarios live per machine in `scenarios/<machine>.ts`, cross-machine ones
 * in `scenarios/line.ts` (shared shapes in `scenarios/common.ts`).
 */
import { effectLevel } from "../kiln-sim/scenarios";
import { healthy, type PyroScenario } from "./scenarios/common";
import { PYRO_SIGNAL_BY_TAG, type PyroSignalDef } from "./signals";
import { FED_SCENARIOS } from "./scenarios/fed";
import { PHC_SCENARIOS } from "./scenarios/phc";
import { KLN_SCENARIOS } from "./scenarios/kln";
import { BRN_SCENARIOS } from "./scenarios/brn";
import { CLR_SCENARIOS } from "./scenarios/clr";
import { CCT_SCENARIOS } from "./scenarios/cct";
import { LINE_SCENARIOS } from "./scenarios/line";

export { effectLevel };
export type { PyroDriver, PyroEffect, PyroScenario, PyroTarget } from "./scenarios/common";

const BY_MACHINE: Record<string, PyroScenario[]> = {
  "PYR-FED-01": FED_SCENARIOS,
  "PYR-PHC-01": PHC_SCENARIOS,
  "PYR-KLN-01": KLN_SCENARIOS,
  "PYR-BRN-01": BRN_SCENARIOS,
  "PYR-CLR-01": CLR_SCENARIOS,
  "PYR-CCT-01": CCT_SCENARIOS,
};

export const PYRO_SCENARIOS: Record<string, PyroScenario[]> = Object.fromEntries(
  Object.entries(BY_MACHINE).map(([machine, list]) => [machine, [...list, ...LINE_SCENARIOS.filter((sc) => sc.machine === machine)]]),
);

const CUSTOM = new Map<string, PyroScenario>();

export function registerPyroScenario(sc: PyroScenario): void {
  CUSTOM.set(`${sc.machine}:${sc.id}`, sc);
}

export function pyroScenario(machine: string, id: string): PyroScenario {
  return CUSTOM.get(`${machine}:${id}`) ?? PYRO_SCENARIOS[machine]?.find((s) => s.id === id) ?? signalFaultFromId(machine, id) ?? healthy(machine);
}

/* ------------------------------------------------------------------ */
/* One-reading faults (Simulation page)                               */
/* ------------------------------------------------------------------ */

/** A hand-made fault on one signal (Simulation page). */
export interface SignalFaultSpec {
  machine: string;
  tag: string;
  /** step: offset · drift: grows by `delta` per `rampMin` · ramp: reaches `delta` over `rampMin` · osc: ±`delta` with period `rampMin` · spike: `delta` for `rampMin` · noise: random ±`delta` · freeze: reading stuck. */
  shape: "step" | "ramp" | "drift" | "osc" | "spike" | "noise" | "freeze";
  delta: number;
  /** Go just past this alarm level instead of moving by `delta` (the signal's own limits). */
  level?: SignalFaultLevel;
  rampMin: number;
  /** Only the reading is wrong (instrument fault); otherwise the plant itself moves. */
  sensor: boolean;
  /** Minutes until it eases off. */
  life: number;
  /** Share of its size added every 60 minutes after it is in place (keeps getting worse). */
  grow?: number;
}

export type SignalFaultLevel = "Alert" | "Critical";

/**
 * How far `def` has to move from its design value to sit just past its Alert or Critical limit (signed, in the
 * signal's unit); null when its limit is not one a fixed offset can cross (set-point and command limits, state
 * signals, no limit).
 */
export function levelDelta(def: PyroSignalDef, level: SignalFaultLevel): number | null {
  const l = def.limit;
  if (!l || def.type !== "analog") return null;
  const alert = level === "Alert";
  const base = def.base;
  // Just past the threshold; an Alert stays well short of the Critical limit.
  const past = (threshold: number, dir: 1 | -1, critical?: number) => {
    let over = Math.max(Math.abs(threshold - base) * 0.08, def.sigma * 4);
    if (alert && critical !== undefined) over = Math.min(over, Math.abs(critical - threshold) * 0.4);
    return threshold + dir * over - base;
  };
  const dirOf = (d: "hi" | "lo" | "both"): 1 | -1 => (d === "lo" ? -1 : 1);
  switch (l.kind) {
    case "hi":
    case "abs":
      return past(alert ? l.warn : l.alarm, 1, l.alarm);
    case "lo":
      return past(alert ? l.warn : l.alarm, -1, l.alarm);
    case "band": {
      const t = alert ? (l.warnHi ?? l.alarmHi) : l.alarmHi;
      if (t !== undefined) return past(t, 1, l.alarmHi);
      const lo = alert ? (l.warnLo ?? l.alarmLo) : l.alarmLo;
      return lo !== undefined ? past(lo, -1, l.alarmLo) : null;
    }
    case "bearing":
      return alert ? l.rise * 1.25 : l.alarm - l.ref + Math.max(def.sigma * 4, 1);
    case "vib":
      return (alert ? l.warn : l.alarm) * 1.08 - l.ref;
    case "modelDev": {
      const v = alert ? l.warn : l.alarm;
      return v === undefined ? null : dirOf(l.dir) * v * (alert ? 1.25 : 1.1);
    }
    case "modelPct": {
      const v = alert ? l.warnPct : l.alarmPct;
      return v === undefined ? null : (dirOf(l.dir) * l.ref * v * (alert ? 1.25 : 1.1)) / 100;
    }
    case "speedRef":
      return (-l.ref * (alert ? l.warnPct : l.alarmPct) * 1.15) / 100;
    default:
      return null;
  }
}

const SIG_PREFIX = "sig~";
const SHAPES = new Set<SignalFaultSpec["shape"]>(["step", "ramp", "drift", "osc", "spike", "noise", "freeze"]);

/**
 * Scenario id that carries the whole fault, so any engine that resumes a saved line (open pages, a restarted
 * plant runner) rebuilds the same scenario from the id alone: `sig~TAG~shape~delta|level~rampMin~sensor`.
 */
export function signalFaultId(spec: Omit<SignalFaultSpec, "machine" | "life" | "grow">): string {
  return [SIG_PREFIX + spec.tag, spec.shape, spec.level ?? String(spec.delta), String(spec.rampMin), spec.sensor ? "1" : "0"].join("~");
}

function signalFaultFromId(machine: string, id: string): PyroScenario | null {
  if (!id.startsWith(SIG_PREFIX)) return null;
  const [tag, shape, amount, ramp, sensor] = id.slice(SIG_PREFIX.length).split("~");
  if (!SHAPES.has(shape as SignalFaultSpec["shape"])) return null;
  const level = amount === "Alert" || amount === "Critical" ? amount : undefined;
  const sc = signalFaultScenario({ machine, tag, shape: shape as SignalFaultSpec["shape"], delta: level ? 0 : Number(amount), level, rampMin: Number(ramp), sensor: sensor === "1" });
  if (sc) registerPyroScenario(sc);
  return sc;
}

/** The scenario a one-reading fault stands for; null when the signal is not on that machine or the level cannot be reached. */
export function signalFaultScenario(spec: Omit<SignalFaultSpec, "life" | "grow">): PyroScenario | null {
  const def = PYRO_SIGNAL_BY_TAG[spec.tag];
  if (!def || def.machine !== spec.machine || !Number.isFinite(spec.rampMin)) return null;
  const freeze = spec.shape === "freeze";
  const delta = spec.level ? levelDelta(def, spec.level) : spec.delta;
  if (delta === null || !Number.isFinite(delta)) return null;
  const unit = def.unit && def.unit !== "state" ? ` ${def.unit}` : "";
  const both = spec.shape === "osc" || spec.shape === "noise";
  const amount = `${both ? "±" : delta >= 0 ? "+" : "−"}${Math.abs(Math.round(delta * 100) / 100)}${unit}`;
  const what = freeze
    ? "reading stuck"
    : spec.level
      ? `${delta >= 0 ? "up" : "down"} past the ${spec.level} limit`
      : `${SHAPE_WORD[spec.shape as keyof typeof SHAPE_WORD]} ${amount}`;
  const sensor = spec.sensor || freeze;
  return {
    id: signalFaultId(spec),
    machine: spec.machine,
    name: `${def.name}: ${what}${sensor ? " (sensor only)" : ""}`,
    group: "Custom",
    expected: [],
    documentedDetection: "quiet",
    description: `${sensor ? "Instrument" : "Process"} fault on ${spec.tag}.`,
    effects: [
      freeze
        ? { target: { kind: "signal", tag: spec.tag }, hold: true, onsetMin: 0, rampMin: 0, shape: "step", sensor: true }
        : { target: { kind: "signal", tag: spec.tag }, delta, onsetMin: 0, rampMin: Math.max(0, spec.rampMin), shape: spec.shape as Exclude<SignalFaultSpec["shape"], "freeze">, sensor: spec.sensor },
    ],
  };
}

const SHAPE_WORD: Record<Exclude<SignalFaultSpec["shape"], "freeze">, string> = {
  step: "jump",
  ramp: "ramp",
  drift: "drift",
  osc: "swing",
  spike: "spike",
  noise: "noise",
};
