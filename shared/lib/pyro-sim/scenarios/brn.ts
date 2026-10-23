/**
 * Kiln burner and coal firing PYR-BRN-01 demonstration scenarios.
 * Expected rules are defined in `../rules/brn.ts`.
 *
 * One scenario per D5 §5.5.4 failure mode / Table 9.4.3 pattern (FP-31 …
 * FP-34, both directions where D5 names two) and per §5.5.6 verification
 * check. Cross-machine effects (shell hot spot, molten material on the
 * cooler, flame loss → kiln stop) belong to the line scenarios.
 */
import { list, sig, type PyroScenario } from "./common";

export const BRN_SCENARIOS: PyroScenario[] = list("PYR-BRN-01", [
  {
    id: "brn-flame-swirl",
    name: "Burner swirl channel blockage",
    group: "Equipment fault",
    expected: ["SW-BRN-01"],
    documentedDetection: "+0h 26m",
    description: "FP-31. The swirl channel partly blocks upstream of its tap: swirl air pressure falls at a steady header, the flame lengthens (operator camera review) and the burning zone cools.",
    effects: [
      { target: sig("PRS-BRN-02"), delta: -40, onsetMin: 5, rampMin: 100, shape: "ramp" },
      { target: sig("TMP-KLN-14"), delta: -25, onsetMin: 10, rampMin: 140, shape: "ramp" },
    ],
  },
  {
    id: "brn-axial-tip-blockage",
    name: "Burner axial (jet) tip blockage",
    group: "Equipment fault",
    expected: ["SW-BRN-01"],
    documentedDetection: "+0h 31m",
    description: "FP-31, rising direction. Coating builds on the burner tip and restricts the jet-air nozzles: axial air pressure rises at a steady header and coal rate.",
    effects: [{ target: sig("PRS-BRN-03"), delta: 93, onsetMin: 5, rampMin: 100, shape: "ramp" }],
  },
  {
    id: "brn-header-leak",
    name: "Primary-air header leak",
    group: "Equipment fault",
    expected: ["SW-BRN-01"],
    documentedDetection: "+0h 51m",
    description: "FP-31, header branch. A flange on the primary-air header opens: the header pressure falls, both burner channels follow it down and the PA fan delivers more air (current up).",
    effects: [
      { target: sig("PRS-BRN-01"), delta: -83, onsetMin: 5, rampMin: 90, shape: "ramp" },
      { target: sig("PRS-BRN-02"), delta: -8.6, onsetMin: 5, rampMin: 90, shape: "ramp" },
      { target: sig("PRS-BRN-03"), delta: -74, onsetMin: 5, rampMin: 90, shape: "ramp" },
      { target: sig("ELE-BRN-01"), delta: 3.2, onsetMin: 5, rampMin: 90, shape: "ramp" },
    ],
  },
  {
    id: "brn-coal-bin-smoulder",
    name: "Fine-coal bin smouldering",
    group: "Equipment fault",
    expected: ["SW-BRN-02"],
    documentedDetection: "+2h 45m",
    description: "FP-34. Coal smoulders in the bin after a long hold: bin temperature and CO rise together; on high CO the nitrogen purge sequence goes active.",
    effects: [
      { target: sig("TMP-BRN-04"), delta: 20, onsetMin: 5, rampMin: 300, shape: "accel" },
      { target: sig("GAS-BRN-01"), delta: 240, onsetMin: 5, rampMin: 300, shape: "accel" },
    ],
  },
  {
    id: "brn-coal-bin-selfheat",
    name: "Fine-coal bin self-heating (steady rise)",
    group: "Equipment fault",
    expected: ["SW-BRN-02"],
    documentedDetection: "+0h 41m",
    description: "FP-34, rate branch. Hot mill product starts self-heating in a full bin: the bin temperature climbs steadily at about 7 K/h with CO rising, before any absolute limit is reached; the bin level is cited as residence-time context.",
    effects: [
      { target: sig("TMP-BRN-04"), delta: 21, onsetMin: 5, rampMin: 180, shape: "ramp" },
      { target: sig("GAS-BRN-01"), delta: 90, onsetMin: 5, rampMin: 180, shape: "ramp" },
    ],
  },
  {
    id: "brn-pafan-bearing",
    name: "Primary-air fan bearing defect",
    group: "Equipment fault",
    expected: ["R-BRN-03"],
    documentedDetection: "+2h 57m",
    description: "FP-33. The primary-air fan bearing wears: vibration and bearing temperature rise together, the motor current follows.",
    effects: [
      { target: sig("VIB-BRN-01"), delta: 3.2, onsetMin: 5, rampMin: 360, shape: "accel" },
      { target: sig("TMP-BRN-01"), delta: 15, onsetMin: 5, rampMin: 360, shape: "accel" },
      { target: sig("ELE-BRN-01"), delta: 3.2, onsetMin: 5, rampMin: 360, shape: "accel" },
    ],
  },
  {
    id: "brn-coal-line-plug",
    name: "Coal line partial plug",
    group: "Equipment fault",
    expected: ["R-BRN-04"],
    documentedDetection: "+1h 15m",
    description: "FP-32, choke. Coal starts to plug the conveying line: line pressure climbs well above what the coal rate explains and the Roots blower works against it (current up).",
    effects: [
      { target: sig("PRS-BRN-04"), delta: 165, onsetMin: 5, rampMin: 120, shape: "accel" },
      { target: sig("ELE-BRN-02"), delta: 9.1, onsetMin: 5, rampMin: 120, shape: "accel" },
    ],
  },
  {
    id: "brn-blower-weak",
    name: "Coal conveying blower weakening",
    group: "Equipment fault",
    expected: ["R-BRN-04"],
    documentedDetection: "+2h 04m",
    description: "FP-32, falling direction. The Roots blower clearances open up: internal slip grows, the line pressure falls below what the coal rate needs and the blower current drops with it.",
    effects: [
      { target: sig("PRS-BRN-04"), delta: -90, onsetMin: 5, rampMin: 200, shape: "ramp" },
      { target: sig("ELE-BRN-02"), delta: -4.4, onsetMin: 5, rampMin: 200, shape: "ramp" },
    ],
  },
  {
    id: "brn-blower-wear",
    name: "Coal blower rotor wear",
    group: "Equipment fault",
    expected: ["R-BRN-05"],
    documentedDetection: "+4h 05m",
    description: "FP-33, coal blower. The Roots blower rotors wear: vibration and current rise together.",
    effects: [
      { target: sig("VIB-BRN-02"), delta: 3.8, onsetMin: 5, rampMin: 400, shape: "accel" },
      { target: sig("ELE-BRN-02"), delta: 7.3, onsetMin: 5, rampMin: 400, shape: "accel" },
    ],
  },
  {
    id: "brn-camera-feed-lost",
    name: "Sensor – flame camera feed lost",
    group: "Sensor validation",
    expected: ["R-DQ-01"],
    documentedDetection: "+0h 03m",
    description: "The protected flame camera stops streaming. The camera is operator visual evidence only (no automatic flame classifier), so only its feed availability is judged.",
    effects: [{ target: sig("CAM-BRN-01"), state: "FEED LOST", onsetMin: 2, rampMin: 0, shape: "step" }],
  },
  {
    id: "brn-coal-meter-bias",
    name: "Sensor – coal meter reads low",
    group: "Sensor validation",
    expected: ["R-DQ-02"],
    documentedDetection: "+0h 04m",
    description: "The coal dosing meter under-reads 1.4 t/h; conveying-line pressure and the burning zone say coal is unchanged (D5 5.5.6: flow agrees with the burning-zone response).",
    effects: [{ target: sig("FLO-BRN-01"), delta: -1.4, onsetMin: 2, rampMin: 0, shape: "step", sensor: true }],
  },
  {
    id: "brn-header-pt-drift",
    name: "Sensor – primary-air header transmitter drift",
    group: "Sensor validation",
    expected: ["SV-BRN-01"],
    documentedDetection: "+0h 44m",
    description: "D5 5.5.6: the header pressure must agree with the channels and the PA fan current. The header transmitter drifts low while swirl, axial and fan current stay where they were.",
    effects: [{ target: sig("PRS-BRN-01"), delta: -67, onsetMin: 2, rampMin: 60, shape: "ramp", sensor: true }],
  },
  {
    id: "brn-line-pt-drift",
    name: "Sensor – coal line pressure transmitter drift",
    group: "Sensor validation",
    expected: ["SV-BRN-01"],
    documentedDetection: "+0h 46m",
    description: "D5 5.5.6: the line pressure must agree with the blower current. The line transmitter drifts high while the Roots blower load stays unchanged, so no choke is called.",
    effects: [{ target: sig("PRS-BRN-04"), delta: 85, onsetMin: 2, rampMin: 60, shape: "ramp", sensor: true }],
  },
]);
