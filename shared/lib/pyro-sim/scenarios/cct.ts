/**
 * Clinker transport PYR-CCT-01 (HMR-01 + CSL-01) demonstration scenarios.
 * Expected rules are defined in `../rules/cct.ts`.
 *
 * One scenario per D5 §5.7.4 / §5.8.4 failure mode / Table 9.4.3 pattern
 * (FP-40 … FP-44, both directions where D5 names two) and per §5.7.6 / §5.8.6
 * verification check. Cross-machine effects (crusher trip or chain break →
 * cooler backs up → kiln output cut, hot clinker from the cooler) belong to
 * the line scenarios.
 */
import { drv, list, sig, type PyroScenario } from "./common";

export const CCT_SCENARIOS: PyroScenario[] = list("PYR-CCT-01", [
  {
    id: "hmr-rotor-bearing",
    name: "Crusher rotor DE bearing defect",
    group: "Equipment fault",
    expected: ["R-HMR-01"],
    documentedDetection: "+3h 13m",
    description: "FP-41, bearing. The rotor drive-end bearing wears: vibration and bearing temperature rise together.",
    effects: [
      { target: sig("VIB-HMR-01"), delta: 4.4, onsetMin: 5, rampMin: 360, shape: "accel" },
      { target: sig("TMP-HMR-01"), delta: 15, onsetMin: 5, rampMin: 360, shape: "accel" },
    ],
  },
  {
    id: "hmr-bearing-lube",
    name: "Crusher NDE bearing lubrication failure",
    group: "Equipment fault",
    expected: ["R-HMR-01"],
    documentedDetection: "+3h 31m",
    description: "FP-41, bearing temperature up with current high. The NDE bearing runs short of grease: it heats and the motor load rises before any vibration change.",
    effects: [
      { target: sig("TMP-HMR-02"), delta: 18, onsetMin: 5, rampMin: 300, shape: "accel" },
      { target: sig("ELE-HMR-01"), delta: 7.3, onsetMin: 5, rampMin: 300, shape: "accel" },
    ],
  },
  {
    id: "hmr-jam",
    name: "Crusher overload — coating fall",
    group: "Equipment fault",
    expected: ["R-HMR-02"],
    documentedDetection: "+0h 35m",
    description: "FP-41, jam. A coating fall sends large clinker into the crusher: the motor current climbs past its 100 % FLA set-point and the winding heats (OSW-PE-SNL-PYR-01 Rev. 02: the rotor has a zero-speed switch, no rpm).",
    effects: [
      { target: sig("ELE-HMR-01"), delta: 33, onsetMin: 5, rampMin: 40, shape: "accel" },
      { target: sig("TMP-HMR-03"), delta: 18, onsetMin: 10, rampMin: 80, shape: "ramp" },
    ],
  },
  {
    id: "hmr-hammer-loss",
    name: "Crusher hammer loss",
    group: "Equipment fault",
    expected: ["R-HMR-03"],
    documentedDetection: "+0h 34m",
    description: "FP-40. A hammer pin shears and a hammer leaves the rotor: rotor vibration steps up on both bearings at once, the bearings do not heat.",
    effects: [
      { target: sig("VIB-HMR-01"), delta: 2.6, onsetMin: 30, rampMin: 0, shape: "step" },
      { target: sig("VIB-HMR-02"), delta: 2.2, onsetMin: 30, rampMin: 0, shape: "step" },
    ],
  },
  {
    id: "hmr-speed-pickup-dead",
    name: "Sensor – rotor speed pickup reads zero",
    group: "Sensor validation",
    expected: ["R-DQ-01"],
    documentedDetection: "+0h 03m",
    description: "D5 5.7.6 speed matches run state. The rotor zero-speed switch reports the shaft stopped while the crusher motor still draws its running current: a mismatch with the operating state, not a stall.",
    effects: [{ target: sig("SPD-HMR-01"), state: "STOPPED WHILE RUNNING", onsetMin: 2, rampMin: 0, shape: "step", sensor: true }],
  },
  {
    id: "hmr-de-pickup-loose",
    name: "Sensor – rotor DE vibration pickup loose",
    group: "Sensor validation",
    expected: ["SV-HMR-01"],
    documentedDetection: "+0h 27m",
    description: "D5 5.7.6 DE / NDE trend together. The DE accelerometer magnet base works loose: the DE reading climbs alone while the NDE pickup and both bearing temperatures stay where they were.",
    effects: [{ target: sig("VIB-HMR-01"), delta: 2.6, onsetMin: 2, rampMin: 30, shape: "ramp", sensor: true }],
  },
  {
    id: "hmr-nde-rtd-drift",
    name: "Sensor – rotor NDE bearing RTD drift",
    group: "Sensor validation",
    expected: ["SV-HMR-01"],
    documentedDetection: "+1h 27m",
    description: "D5 5.7.6 DE / NDE trend together. The NDE bearing RTD drifts high (lead resistance) while the DE bearing, both vibrations and the motor load are unchanged.",
    effects: [{ target: sig("TMP-HMR-02"), delta: 13, onsetMin: 2, rampMin: 120, shape: "ramp", sensor: true }],
  },
  {
    id: "hmr-winding-rtd-drift",
    name: "Sensor – crusher winding RTD drift",
    group: "Sensor validation",
    expected: ["SV-HMR-01"],
    documentedDetection: "+1h 17m",
    description: "D5 5.7.6 winding follows current. The winding RTD reads high while the motor current is unchanged.",
    effects: [{ target: sig("TMP-HMR-03"), delta: 20, onsetMin: 2, rampMin: 120, shape: "ramp", sensor: true }],
  },
  {
    id: "csl-chain-drag",
    name: "Pan conveyor roller drag",
    group: "Equipment fault",
    expected: ["R-CSL-01"],
    documentedDetection: "+2h 43m",
    description: "FP-43, overload. Seized pan rollers drag on the track: motor current climbs, the winding heats with it and the head drive runs a little rougher.",
    effects: [
      { target: sig("ELE-CSL-01"), delta: 28, onsetMin: 5, rampMin: 260, shape: "accel" },
      { target: sig("VIB-CSL-02"), delta: 0.4, onsetMin: 5, rampMin: 260, shape: "ramp" },
    ],
  },
  {
    id: "csl-gearbox-wear",
    name: "Conveyor head-drive gearbox wear",
    group: "Equipment fault",
    expected: ["R-CSL-04"],
    documentedDetection: "+3h 03m",
    description: "FP-43, head-drive vibration. The head-drive gearbox bearings wear: drive vibration climbs and the motor works a little harder.",
    effects: [
      { target: sig("VIB-CSL-02"), delta: 2.8, onsetMin: 5, rampMin: 360, shape: "accel" },
      { target: sig("ELE-CSL-01"), delta: 6.1, onsetMin: 5, rampMin: 360, shape: "accel" },
    ],
  },
  {
    id: "csl-chain-break",
    name: "Pan conveyor chain break",
    group: "Equipment fault",
    expected: ["R-CSL-05"],
    // The backed-up cooler bed loads the grate (D5 Table 9.4.5 row 10 propagation).
    expectedElsewhere: ["PYR-CLR-01 · R-CLR-03"],
    documentedDetection: "+0h 20m",
    description:
      "FP-42 / D5 Table 9.4.5 row 10. A worn chain link parts: the tail shaft stops while the head drive keeps turning, now unloaded (current falls toward no-load). Clinker transport stops, the silo stops filling, the crusher runs empty and the cooler backs up until the kiln feed is cut and then stopped.",
    effects: [{ target: drv("chainBreak"), delta: 1, onsetMin: 20, rampMin: 0, shape: "step" }],
  },
  {
    id: "csl-speed-pickup-dead",
    name: "Sensor – tail speed pickup lost",
    group: "Sensor validation",
    expected: ["R-DQ-01"],
    documentedDetection: "+0h 03m",
    description: "D5 5.8.6 tail speed matches drive. The tail zero-speed switch reports the shaft stopped while the head drive still carries its full load: a switch fault, not a chain break.",
    effects: [{ target: sig("SPD-CSL-01"), state: "STOPPED WHILE RUNNING", onsetMin: 2, rampMin: 0, shape: "step", sensor: true }],
  },
  {
    id: "csl-bag-blinding",
    name: "Baghouse bag blinding",
    group: "Equipment fault",
    expected: ["R-CSL-02"],
    documentedDetection: "+1h 50m",
    description: "FP-44, rising ΔP. Damp air blinds the silo bags: filter ΔP climbs beyond the pulse-cleaning cycle and the dust-fan current falls as the extraction flow chokes.",
    effects: [
      // ΔP is calculated (inlet − outlet): the blinded cloth deepens the outlet suction.
      { target: sig("PRS-CSL-03"), delta: -9, onsetMin: 5, rampMin: 360, shape: "ramp" },
      { target: sig("ELE-CSL-02"), delta: -7.8, onsetMin: 5, rampMin: 360, shape: "ramp" },
    ],
  },
  {
    id: "csl-bag-torn",
    name: "Baghouse torn bag",
    group: "Equipment fault",
    expected: ["R-CSL-02"],
    documentedDetection: "+0h 22m",
    description: "FP-44, falling ΔP. A bag tears at its cuff: air bypasses the cloth, the filter ΔP drops below the cleaning cycle and the dust fan moves more air (current up). Dust leaves through the stack.",
    effects: [
      { target: sig("PRS-CSL-03"), delta: 5, onsetMin: 5, rampMin: 40, shape: "settle" },
      { target: sig("ELE-CSL-02"), delta: 3.9, onsetMin: 5, rampMin: 40, shape: "settle" },
    ],
  },
  {
    id: "csl-level-radar-drift",
    name: "Sensor – silo level radar drifting low",
    group: "Sensor validation",
    expected: ["SV-CSL-01"],
    documentedDetection: "+0h 43m",
    description: "D5 5.8.6 level rises with conveying. Build-up on the radar antenna makes the silo level read lower and lower while the conveyor keeps filling the silo.",
    effects: [{ target: sig("LEV-CSL-01"), delta: -50, onsetMin: 2, rampMin: 600, shape: "ramp", sensor: true }],
  },
  {
    id: "csl-silo-full",
    name: "Clinker silo filling up",
    group: "Process change",
    expected: ["R-CSL-03"],
    documentedDetection: "+6h 58m",
    description: "The cement mill stops for 8 h: nothing is drawn from the clinker silo and the kiln keeps filling it toward its high level (mass balance), until the mill restarts.",
    effects: [{ target: drv("clinkerDraw"), delta: -1, onsetMin: 0, rampMin: 480, shape: "spike" }],
  },
]);
