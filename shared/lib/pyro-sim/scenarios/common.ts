/**
 * Shared pieces of the pyro-line scenario library: the scenario / effect
 * shapes, effect-target helpers and the per-machine list builder (every
 * machine's list starts with its healthy baseline).
 */
import type { EffectShape, ScenarioGroup } from "../../kiln-sim/scenarios";
import type { EquipmentId, EquipmentState } from "../equipment";

/**
 * Line operating drivers. `feed` / `coal` / `kilnSpeed` / `idFan` / `coolerAir` / `ambient` are the true values
 * (`feedSp` / `coalSp` move the operator set-point with them). Hidden process drivers the reference model does
 * not see (fractions, 0 = healthy): `extraction` silo extraction capacity (−0.9 = bridged silo), `mealLoss` share
 * of the meal held up in the preheater instead of reaching the kiln, `coolerRecup` loss of cooler heat
 * recuperation (secondary air), `clinkerDraw` change of the cement-mill draw from the clinker silo (−1 = stopped),
 * `chainBreak` pan-conveyor chain broken (≥ 0.5: no transport, drive at no-load, tail shaft stopped, cooler backs up),
 * `pulseStop` baghouse pulse cleaning stopped (1: ΔP stops cycling and the cake adds ≈ 3 mbar), `coalSurge` coal
 * reaching the flame in surges after the weigh feeder (t/h, use an `osc` shape; the feeder FLO-BRN-01 stays steady),
 * `scannerCoverage` shell scanner coverage lost to a fouled window (% of the shell in view; the scanner's own quality
 * figure, not a register point).
 */
export type PyroDriver =
  | "feed"
  | "feedSp"
  | "coal"
  | "coalSp"
  | "kilnSpeed"
  | "idFan"
  | "coolerAir"
  | "ambient"
  | "extraction"
  | "mealLoss"
  | "coolerRecup"
  | "clinkerDraw"
  | "chainBreak"
  | "pulseStop"
  | "coalSurge"
  | "scannerCoverage";

/**
 * Kiln shell field features (thermal map, RULES-B): `hotSpot` refractory hot spot at 52 m (local around the
 * circumference), `coldBand` ring / coating build-up 30–36 m, `warmBand` coating loss 46–58 m, `hotBand` flame
 * impingement 54–58 m, `outletEnd` outlet end 66–74 m running hot (all full-circumference bands). Delta in K.
 */
export type ShellProfileFeature = "hotSpot" | "coldBand" | "warmBand" | "hotBand" | "outletEnd";

export type PyroTarget =
  | { kind: "signal"; tag: string }
  | { kind: "driver"; name: PyroDriver }
  | { kind: "profile"; name: ShellProfileFeature };

/** Effect on a signal, a line driver or the shell profile. */
export interface PyroSignalEffect {
  target: PyroTarget;
  delta?: number;
  state?: string;
  hold?: boolean;
  /** The source stops sending: the last value repeats with a frozen timestamp (stale, not flat-line). */
  stale?: boolean;
  onsetMin: number;
  rampMin: number;
  shape: EffectShape;
  sensor?: boolean;
}

/**
 * Equipment run state from `onsetMin` (contract §1): a trip or stop of one unit. The engine applies the
 * line interlocks (standby blower start, aux drive, feed / fuel cut, cooler back-up …) and the unit's
 * signals go to ≈ 0 / ambient. `untilMin` (optional) restarts the unit; a repair also restarts it.
 */
export interface PyroEquipmentEffect {
  equipment: EquipmentId;
  state: Exclude<EquipmentState, "run">;
  onsetMin: number;
  untilMin?: number;
}

export type PyroEffect = PyroSignalEffect | PyroEquipmentEffect;

export const isEquipmentEffect = (e: PyroEffect): e is PyroEquipmentEffect => "equipment" in e;

export interface PyroScenario {
  id: string;
  /** Machine whose Simulation tab lists the scenario. */
  machine: string;
  name: string;
  group: ScenarioGroup;
  expected: string[];
  /**
   * Findings a cross-machine scenario expects on other machines of the line, as "<machine> · <rule>"
   * (e.g. "PYR-KLN-01 · R-KLN-18"): they are part of the propagation, not unexpected rules.
   */
  expectedElsewhere?: string[];
  documentedDetection: string;
  description: string;
  effects: PyroEffect[];
}

export const sig = (tag: string) => ({ kind: "signal", tag }) as const;
export const drv = (name: PyroDriver) => ({ kind: "driver", name }) as const;
export const prof = (name: ShellProfileFeature) => ({ kind: "profile", name }) as const;

export const healthy = (machine: string): PyroScenario => ({
  id: "healthy",
  machine,
  name: "Healthy baseline",
  group: "Baseline",
  expected: [],
  documentedDetection: "quiet",
  description: "Steady ~5,000 t/d clinker operation at 330 t/h kiln feed (D5 310–350 t/h), 10.5 t/h kiln coal (D5 9–12 t/h) and 3.6 rpm kiln speed. Every signal follows the line reference model.",
  effects: [],
});

export type S = Omit<PyroScenario, "machine">;
export const list = (machine: string, items: S[]): PyroScenario[] => [healthy(machine), ...items.map((s) => ({ ...s, machine }))];
