/**
 * The 27 demonstration scenarios of D5 Table 9.8 / D4 Table 8.3.
 *
 * Each scenario is a list of timed effects on the plant. Times are in
 * simulated minutes after the scenario starts. A "physical" effect changes
 * what the plant does, so it shows on the sensor and on anything modelled
 * from it. A "sensor" effect changes only the reading, which is how the
 * sensor-validation scenarios isolate one bad instrument.
 */

/**
 * `drift` keeps growing past `rampMin`, `osc` swings ± with period `rampMin`,
 * `spike` holds full severity for `rampMin` then clears, `noise` is
 * deterministic scatter of amplitude `delta`. The last four come from the
 * Test Lab builder; the library uses the first four.
 */
export type EffectShape = "ramp" | "step" | "accel" | "settle" | "drift" | "osc" | "spike" | "noise";

export type EffectTarget =
  | { kind: "signal"; tag: string }
  /** Operating drivers. `feedSp` / `fuelSp` move the operator set-point with them. */
  | { kind: "driver"; name: "feed" | "fuel" | "speed" | "draft" | "ambient" | "feedSp" | "fuelSp" }
  /** Scanner profile features. */
  | { kind: "profile"; name: "hotSpot" | "coldBand" };

export interface ScenarioEffect {
  target: EffectTarget;
  /** Additive change at full severity (analog). */
  delta?: number;
  /** State written while the effect is active (state signals). */
  state?: string;
  /** Freeze the reading at its value when the effect starts (flat-line). */
  hold?: boolean;
  onsetMin: number;
  rampMin: number;
  shape: EffectShape;
  /** Only the reading is wrong; the plant itself is unaffected. */
  sensor?: boolean;
}

export type ScenarioGroup =
  | "Baseline"
  | "Process change"
  | "Support & thrust"
  | "Drive train"
  | "Shell & seals"
  | "Sensor validation"
  /** Built in the Test Lab; never part of `KILN_SCENARIOS`. */
  | "Custom";

export interface KilnScenario {
  id: string;
  name: string;
  group: ScenarioGroup;
  /** Rules the validation suite expects; empty means "no alarm". */
  expected: string[];
  /** D5 Table 9.8 "detected after" figure. */
  documentedDetection: string;
  description: string;
  effects: ScenarioEffect[];
}

const sig = (tag: string) => ({ kind: "signal", tag }) as const;
const drv = (name: "feed" | "fuel" | "speed" | "draft" | "ambient" | "feedSp" | "fuelSp") => ({ kind: "driver", name }) as const;
const prof = (name: "hotSpot" | "coldBand") => ({ kind: "profile", name }) as const;

export const KILN_SCENARIOS: KilnScenario[] = [
  {
    id: "healthy",
    name: "Healthy baseline",
    group: "Baseline",
    expected: [],
    documentedDetection: "quiet",
    description: "Steady 5,000 t/d operation at 100 % feed. Every signal follows the healthy-kiln reference model.",
    effects: [],
  },
  {
    id: "hot-afternoon",
    name: "Hot afternoon (+12 K ambient)",
    group: "Process change",
    expected: [],
    documentedDetection: "quiet",
    description: "Ambient rises 12 K. Bearings, winding and oil warm with it; the ambient estimate compensates, so nothing alarms.",
    effects: [{ target: drv("ambient"), delta: 12, onsetMin: 0, rampMin: 90, shape: "settle" }],
  },
  {
    id: "production-increase",
    name: "Production increase (+10 %)",
    group: "Process change",
    expected: [],
    documentedDetection: "quiet",
    description: "Feed and fuel set-points raised 10 %. Torque, O₂ and temperatures move exactly as the model predicts.",
    effects: [
      { target: drv("feed"), delta: 33, onsetMin: 0, rampMin: 40, shape: "settle" },
      { target: drv("feedSp"), delta: 33, onsetMin: 0, rampMin: 40, shape: "settle" },
      { target: drv("fuel"), delta: 1.06, onsetMin: 0, rampMin: 40, shape: "settle" },
      { target: drv("fuelSp"), delta: 1.06, onsetMin: 0, rampMin: 40, shape: "settle" },
      { target: drv("speed"), delta: 0.18, onsetMin: 0, rampMin: 40, shape: "settle" },
    ],
  },
  {
    id: "feed-cut",
    name: "Process change – feed cut 15 %",
    group: "Process change",
    expected: [],
    documentedDetection: "quiet",
    description: "Feed cut 15 % with fuel trimmed. Drivers explain every change, so the model stays quiet.",
    effects: [
      { target: drv("feed"), delta: -49.5, onsetMin: 0, rampMin: 30, shape: "settle" },
      { target: drv("feedSp"), delta: -49.5, onsetMin: 0, rampMin: 30, shape: "settle" },
      { target: drv("fuel"), delta: -1.1, onsetMin: 0, rampMin: 30, shape: "settle" },
      { target: drv("fuelSp"), delta: -1.1, onsetMin: 0, rampMin: 30, shape: "settle" },
    ],
  },
  {
    id: "roller-skew-st2",
    name: "Roller skew – Station 2",
    group: "Support & thrust",
    expected: ["R-SUP-01"],
    documentedDetection: "+2h 40m",
    description: "Station 2 left roller skews. The A bearing heats slowly ahead of B and the thrust roller carries more load.",
    effects: [
      { target: sig("TMP-KLN-05"), delta: 20, onsetMin: 10, rampMin: 300, shape: "accel" },
      { target: sig("TMP-KLN-06"), delta: 1.5, onsetMin: 10, rampMin: 300, shape: "ramp" },
      { target: sig("PRS-KLN-07"), delta: 18, onsetMin: 10, rampMin: 300, shape: "ramp" },
    ],
  },
  {
    id: "bearing-lube-st3",
    name: "Bearing lubrication loss – Station 3",
    group: "Support & thrust",
    expected: ["R-SUP-02"],
    documentedDetection: "+0h 30m",
    description: "Oil bath of the station 3 right A bearing runs dry. One bearing heats fast while thrust stays normal.",
    effects: [{ target: sig("TMP-KLN-11"), delta: 32, onsetMin: 5, rampMin: 70, shape: "ramp" }],
  },
  {
    id: "thrust-hydraulic",
    name: "Thrust hydraulic fault",
    group: "Support & thrust",
    expected: ["R-SUP-03"],
    documentedDetection: "+1h 15m",
    description: "Hydraulic power unit loses pressure. The kiln drifts downhill toward the lower limit switch.",
    effects: [
      { target: sig("PRS-KLN-07"), delta: -62, onsetMin: 10, rampMin: 120, shape: "accel" },
      { target: sig("POS-KLN-01"), delta: -24, onsetMin: 30, rampMin: 150, shape: "accel" },
    ],
  },
  {
    id: "axial-drift",
    name: "Axial drift – seal overlap",
    group: "Support & thrust",
    expected: ["R-SUP-04", "R-SHL-05"],
    documentedDetection: "+3h 10m",
    description: "Thrust control lets the kiln creep downhill. The LVDT passes ±22 mm and the seal overlap margin falls below 10 mm.",
    effects: [{ target: sig("POS-KLN-01"), delta: -36, onsetMin: 10, rampMin: 260, shape: "ramp" }],
  },
  {
    id: "gearbox-input-bearing",
    name: "Gearbox input bearing defect",
    group: "Drive train",
    expected: ["R-DRV-01"],
    documentedDetection: "+2h 25m",
    description: "Outer-race defect on the gearbox input bearing. Vibration rises against the model, confirmed by bearing temperature.",
    effects: [
      { target: sig("VIB-KLN-02"), delta: 3.4, onsetMin: 10, rampMin: 260, shape: "accel" },
      { target: sig("TMP-KLN-22"), delta: 9, onsetMin: 10, rampMin: 260, shape: "accel" },
    ],
  },
  {
    id: "coupling-misalignment",
    name: "Motor–gearbox coupling misalignment",
    group: "Drive train",
    expected: ["R-DRV-06"],
    documentedDetection: "+1h 10m",
    description: "Thermal growth misaligns the motor–gearbox coupling. Vibration rises on both coupling sides together.",
    effects: [
      { target: sig("VIB-KLN-01"), delta: 1.5, onsetMin: 10, rampMin: 150, shape: "ramp" },
      { target: sig("VIB-KLN-02"), delta: 1.7, onsetMin: 10, rampMin: 150, shape: "ramp" },
    ],
  },
  {
    id: "gearbox-oil-supply",
    name: "Gearbox oil supply loss",
    group: "Drive train",
    expected: ["R-DRV-03"],
    documentedDetection: "+0h 35m",
    description: "Duty pump wear and a clogging filter. Oil pressure falls below what oil temperature explains; the flow switch drops out.",
    effects: [
      { target: sig("PRS-KLN-04"), delta: -1.45, onsetMin: 5, rampMin: 55, shape: "accel" },
      { target: sig("FLO-KLN-05"), state: "NO FLOW", onsetMin: 52, rampMin: 0, shape: "step" },
    ],
  },
  {
    id: "oil-cooler",
    name: "Gearbox oil cooler fault",
    group: "Drive train",
    expected: ["R-DRV-07"],
    documentedDetection: "+2h 05m",
    description: "Fouled oil cooler. Oil temperature climbs at normal torque; the pressure dip is explained by thinner hot oil.",
    effects: [
      { target: sig("TMP-KLN-15"), delta: 15, onsetMin: 10, rampMin: 240, shape: "accel" },
      { target: sig("TMP-KLN-22"), delta: 13, onsetMin: 10, rampMin: 240, shape: "accel" },
      { target: sig("TMP-KLN-23"), delta: 13, onsetMin: 10, rampMin: 240, shape: "accel" },
      { target: sig("PRS-KLN-04"), delta: -0.27, onsetMin: 10, rampMin: 240, shape: "accel" },
    ],
  },
  {
    id: "drive-overload",
    name: "Drive mechanical drag / overload",
    group: "Drive train",
    expected: ["R-DRV-08"],
    documentedDetection: "+2h 15m",
    description: "Mechanical drag on the drive. Torque rises above model with winding and oil temperature following.",
    effects: [
      { target: sig("ELE-KLN-01"), delta: 21, onsetMin: 10, rampMin: 260, shape: "accel" },
      { target: sig("TMP-KLN-21"), delta: 24, onsetMin: 10, rampMin: 260, shape: "accel" },
      { target: sig("TMP-KLN-15"), delta: 6, onsetMin: 10, rampMin: 260, shape: "accel" },
      { target: sig("TMP-KLN-22"), delta: 6, onsetMin: 10, rampMin: 260, shape: "accel" },
      { target: sig("TMP-KLN-23"), delta: 6, onsetMin: 10, rampMin: 260, shape: "accel" },
    ],
  },
  {
    id: "pinion-misalignment",
    name: "Pinion / girth-gear misalignment",
    group: "Drive train",
    expected: ["R-DRV-02"],
    documentedDetection: "+1h 10m",
    description: "Pinion runout after foundation settling. Pinion vibration rises at steady torque; spray system healthy.",
    effects: [{ target: sig("VIB-KLN-04"), delta: 2.6, onsetMin: 10, rampMin: 200, shape: "ramp" }],
  },
  {
    id: "girth-spray",
    name: "Girth-gear spray failure",
    group: "Drive train",
    expected: ["R-DRV-04"],
    documentedDetection: "+0h 05m",
    description: "Spray controller faults. The open gear runs without fresh lubricant; pinion vibration begins to creep.",
    effects: [
      { target: sig("STS-KLN-05"), state: "FAULT", onsetMin: 4, rampMin: 0, shape: "step" },
      { target: sig("VIB-KLN-04"), delta: 0.7, onsetMin: 10, rampMin: 300, shape: "ramp" },
    ],
  },
  {
    id: "aux-drive",
    name: "Auxiliary drive not ready",
    group: "Drive train",
    expected: ["R-DRV-05"],
    documentedDetection: "+0h 05m",
    description: "Auxiliary drive reports NOT READY. A hot kiln could not be turned if the main drive stopped.",
    effects: [{ target: sig("STS-KLN-11"), state: "NOT READY", onsetMin: 4, rampMin: 0, shape: "step" }],
  },
  {
    id: "ring-buildup",
    name: "Ring / coating build-up",
    group: "Shell & seals",
    expected: ["R-SHL-02"],
    documentedDetection: "+2h 25m",
    description: "A coating ring forms at 29–37 m. The scanner sees a cold band and drive torque rises; drive vibration stays normal.",
    effects: [
      { target: prof("coldBand"), delta: -70, onsetMin: 10, rampMin: 240, shape: "accel" },
      { target: sig("ELE-KLN-01"), delta: 9, onsetMin: 10, rampMin: 240, shape: "accel" },
      { target: sig("TMP-KLN-21"), delta: 19, onsetMin: 10, rampMin: 240, shape: "accel" },
      { target: sig("TMP-KLN-15"), delta: 1.3, onsetMin: 10, rampMin: 240, shape: "accel" },
      { target: sig("TMP-KLN-22"), delta: 1.3, onsetMin: 10, rampMin: 240, shape: "accel" },
      { target: sig("TMP-KLN-23"), delta: 1.3, onsetMin: 10, rampMin: 240, shape: "accel" },
    ],
  },
  {
    id: "refractory-hot-spot",
    name: "Refractory loss – hot spot",
    group: "Shell & seals",
    expected: ["R-SHL-01"],
    documentedDetection: "+1h 15m",
    description: "Refractory spalls in the burning zone at 52 m. A local hot spot rises fast on the shell scanner map.",
    effects: [{ target: prof("hotSpot"), delta: 110, onsetMin: 10, rampMin: 150, shape: "accel" }],
  },
  {
    id: "inlet-false-air",
    name: "Inlet seal false air",
    group: "Shell & seals",
    expected: ["R-SHL-03"],
    documentedDetection: "+1h 50m",
    description: "Lamella wear at the inlet seal. Cold air enters: O₂ rises above model and inlet temperature falls below it.",
    effects: [
      { target: sig("GAS-KLN-01"), delta: 1.25, onsetMin: 10, rampMin: 220, shape: "accel" },
      { target: sig("TMP-KLN-13"), delta: -62, onsetMin: 10, rampMin: 220, shape: "accel" },
      { target: sig("PRS-KLN-01"), delta: 0.5, onsetMin: 10, rampMin: 220, shape: "accel" },
    ],
  },
  {
    id: "outlet-fan-stop",
    name: "Outlet seal fan stop + leakage",
    group: "Shell & seals",
    expected: ["R-SHL-04"],
    documentedDetection: "+0h 05m",
    description: "Outlet seal cooling fan trips. Hood pressure swings toward positive and the outlet shell warms.",
    effects: [
      { target: sig("STS-KLN-10"), state: "STOPPED", onsetMin: 4, rampMin: 0, shape: "step" },
      { target: sig("PRS-KLN-03"), delta: 0.5, onsetMin: 4, rampMin: 30, shape: "settle" },
    ],
  },
  {
    id: "sensor-winding",
    name: "Sensor error – winding RTD +18 K",
    group: "Sensor validation",
    expected: ["R-DQ-02"],
    documentedDetection: "+0h 10m",
    description: "Winding RTD jumps 18 K with no change in torque or oil temperature. Flagged as a sensor, not a motor fault.",
    effects: [{ target: sig("TMP-KLN-21"), delta: 18, onsetMin: 6, rampMin: 0, shape: "step", sensor: true }],
  },
  {
    id: "sensor-torque",
    name: "Sensor error – torque signal +10 %",
    group: "Sensor validation",
    expected: ["R-DQ-02"],
    documentedDetection: "+0h 10m",
    description: "Torque reading offsets +10 % while the signals it drives — winding and oil — follow the model.",
    effects: [{ target: sig("ELE-KLN-01"), delta: 6.2, onsetMin: 6, rampMin: 0, shape: "step", sensor: true }],
  },
  {
    id: "sensor-feed",
    name: "Sensor error – feed meter −40 t/h",
    group: "Sensor validation",
    expected: ["R-DQ-02"],
    documentedDetection: "+0h 15m",
    description: "Feed meter under-reads 40 t/h. Torque and O₂ witnesses agree on 330 t/h, so the meter is isolated.",
    effects: [{ target: sig("FLO-KLN-01"), delta: -40, onsetMin: 6, rampMin: 0, shape: "step", sensor: true }],
  },
  {
    id: "sensor-o2",
    name: "Sensor error – O₂ analyser drift",
    group: "Sensor validation",
    expected: ["R-DQ-02"],
    documentedDetection: "+1h 05m",
    description: "O₂ analyser drifts up with no thermal signature at the inlet. Calibration drift, not false air.",
    effects: [{ target: sig("GAS-KLN-01"), delta: 1.6, onsetMin: 5, rampMin: 120, shape: "accel", sensor: true }],
  },
  {
    id: "analyser-fault",
    name: "Gas analyser fault",
    group: "Sensor validation",
    expected: ["R-DQ-01"],
    documentedDetection: "+0h 10m",
    description: "Analyser status goes to FAULT. O₂ and CO freeze at their last value and are marked invalid.",
    effects: [
      { target: sig("STS-KLN-06"), state: "FAULT", onsetMin: 6, rampMin: 0, shape: "step" },
      { target: sig("GAS-KLN-01"), hold: true, onsetMin: 6, rampMin: 0, shape: "step", sensor: true },
      { target: sig("GAS-KLN-02"), hold: true, onsetMin: 6, rampMin: 0, shape: "step", sensor: true },
    ],
  },
  {
    id: "sensor-flatline",
    name: "Sensor fault – gearbox output flat-line",
    group: "Sensor validation",
    expected: ["R-DQ-01"],
    documentedDetection: "+0h 10m",
    description: "Gearbox output accelerometer cable fault. The channel reads a frozen value while the drive runs.",
    effects: [{ target: sig("VIB-KLN-03"), hold: true, onsetMin: 4, rampMin: 0, shape: "step", sensor: true }],
  },
  {
    id: "scanner-fouling",
    name: "Scanner lens fouling",
    group: "Sensor validation",
    expected: ["R-DQ-01"],
    documentedDetection: "+0h 55m",
    description: "Dust on the scanner lens. Coverage falls below 90 % and the shell maximum is marked suspect.",
    effects: [{ target: sig("STS-KLN-08"), delta: -15, onsetMin: 5, rampMin: 80, shape: "accel", sensor: true }],
  },
];

export const SCENARIO_GROUPS: ScenarioGroup[] = [
  "Baseline",
  "Process change",
  "Support & thrust",
  "Drive train",
  "Shell & seals",
  "Sensor validation",
];

/** Test Lab scenarios, registered at run time (see `registerScenario`). */
const CUSTOM_SCENARIOS = new Map<string, KilnScenario>();

/** Register or replace a run-time scenario so the engine can run it by id. */
export function registerScenario(sc: KilnScenario): void {
  CUSTOM_SCENARIOS.set(sc.id, sc);
}

export function scenarioById(id: string): KilnScenario {
  return CUSTOM_SCENARIOS.get(id) ?? KILN_SCENARIOS.find((s) => s.id === id) ?? KILN_SCENARIOS[0];
}

/** Repeatable scatter in −1…1 for whole minute `m` (no shared RNG, so tests stay deterministic). */
function hashNoise(m: number): number {
  let h = Math.imul(Math.floor(m) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

/**
 * Fraction of full severity for an effect at `minutes` after scenario start:
 * 0…1 for the library shapes, unbounded for `drift`, −1…1 for `osc` / `noise`.
 */
export function effectLevel(e: ScenarioEffect, minutes: number): number {
  if (minutes < e.onsetMin) return 0;
  const k = minutes - e.onsetMin;
  const d = Math.max(1, e.rampMin);
  switch (e.shape) {
    case "drift":
      return k / d;
    case "osc":
      return Math.sin((2 * Math.PI * k) / d);
    case "spike":
      return k <= d ? 1 : 0;
    case "noise":
      return hashNoise(minutes);
  }
  if (e.rampMin <= 0 || e.shape === "step") return 1;
  const x = Math.min(1, (minutes - e.onsetMin) / e.rampMin);
  switch (e.shape) {
    case "accel":
      return x * x;
    case "settle":
      return 1 - (1 - x) * (1 - x);
    default:
      return x;
  }
}
