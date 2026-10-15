/**
 * Cross-machine scenarios of the pyro line: trips and disturbances that start
 * on one machine and propagate down the line through the process. Each names
 * the machine whose Simulation tab lists it (`machine`); `../scenarios.ts`
 * appends it to that machine's library.
 *
 * One scenario per D5 propagation path (Table 3.1 process chains, Table 9.4.5
 * cross-machine propagation, §5.x.4 failure-mode effects on other machines).
 * Trips use equipment effects (contract §1); the engine applies the line
 * interlocks (standby blower, aux drive, feed / fuel cut, kiln turn-down,
 * cooler back-up and kiln output cut). `expected` names the rule on the
 * machine where the fault starts; `expectedElsewhere` the findings the
 * propagation raises on other machines.
 */
import { drv, prof, sig, type PyroScenario } from "./common";

const FED = "PYR-FED-01";
const PHC = "PYR-PHC-01";
const KLN = "PYR-KLN-01";
const BRN = "PYR-BRN-01";
const CLR = "PYR-CLR-01";
const CCT = "PYR-CCT-01";

export const LINE_SCENARIOS: PyroScenario[] = [
  {
    id: "line-aeration-loss",
    machine: FED,
    name: "Line – silo aeration lost, feed bin runs down",
    group: "Process change",
    expected: ["R-FSL-01", "R-KFS-04"],
    documentedDetection: "+0h 03m",
    description:
      "D5 Table 9.4.5 row 1. The duty aeration blower trips and the standby takes over; 25 min later the standby trips too. Extraction stops, the feed bin runs down within minutes, the dosing loses head and the kiln feed swings, then stops: preheater and kiln follow, the fuel is cut over 5 min.",
    effects: [
      { equipment: "fsl-blower-duty", state: "tripped", onsetMin: 5 },
      { equipment: "fsl-blower-standby", state: "tripped", onsetMin: 30 },
    ],
  },
  {
    id: "line-elevator-trip",
    machine: FED,
    name: "Line – bucket elevator trip, kiln feed stops",
    group: "Process change",
    expected: ["R-KFS-02"],
    documentedDetection: "+0h 10m",
    description:
      "D5 Table 9.4.5 row 2 / FP-06 effect. The bucket elevator trips: the kiln feed stops at once and the fuel is cut over 5 min; the kiln is turned down, the preheater and kiln temperatures fall and clinker stops reaching the cooler about 25 min later.",
    effects: [{ equipment: "kfs-elevator", state: "tripped", onsetMin: 10 }],
  },
  {
    id: "line-feed-stop",
    machine: FED,
    name: "Line – planned kiln feed stop and restart",
    group: "Process change",
    expected: [],
    documentedDetection: "quiet",
    description:
      "Operating stop, not a fault: the operator stops the kiln feed (elevator and dosing off) for 2 h; the fuel is cut over 5 min and the kiln turned down. Every stopped unit reads ≈ 0 / ambient, the solid-flow meter pressure ≈ 0, the bin holds its weight. At 130 min the feed restarts and ramps back at 2 % / min. Nothing alarms.",
    effects: [{ equipment: "kfs-elevator", state: "stopped", onsetMin: 10, untilMin: 130 }],
  },
  {
    id: "line-cone-feed-loss",
    machine: PHC,
    name: "Line – C5 cone blockage, kiln loses feed",
    group: "Process change",
    expected: ["SW-PHC-01"],
    documentedDetection: "+2h 18m",
    description:
      "D5 Table 9.4.5 row 3. Sticky meal builds up in the C5 cone: cone pressure rises toward zero, the hot meal to the kiln cools, and part of the meal is held up in the tower, so the kiln gets less feed than the meter shows (burning zone and inlet run hotter, torque falls). At 5 h the operator stops the feed for cleaning.",
    effects: [
      { target: sig("PRS-PHC-08"), delta: 12, onsetMin: 5, rampMin: 240, shape: "accel" },
      { target: sig("TMP-PHC-07"), delta: -30, onsetMin: 5, rampMin: 240, shape: "accel" },
      { target: sig("TMP-PHC-05"), delta: 16, onsetMin: 5, rampMin: 240, shape: "accel" },
      { target: drv("mealLoss"), delta: 0.12, onsetMin: 60, rampMin: 200, shape: "ramp" },
      { equipment: "kfs-elevator", state: "stopped", onsetMin: 300 },
    ],
  },
  {
    id: "line-idfan-trip",
    machine: PHC,
    name: "Line – ID fan trip, draft lost line-wide",
    group: "Process change",
    expected: [],
    expectedElsewhere: ["PYR-KLN-01 · R-KLN-18"],
    documentedDetection: "+0h 02m",
    description:
      "D5 Table 9.4.5 row 4, Table 3.1 gas chain, FP-10 / FP-11 effect. The ID fan trips and coasts down: preheater and kiln-inlet draft collapse, the hood pressure turns positive (hot gas blow-back), and the interlock stops the kiln feed and the fuel at once; the kiln is turned down.",
    effects: [{ equipment: "phc-idfan", state: "tripped", onsetMin: 10 }],
  },
  {
    id: "line-kiln-drive-trip",
    machine: KLN,
    name: "Line – kiln main drive trip, aux drive",
    group: "Process change",
    expected: [],
    documentedDetection: "+0h 01m",
    description:
      "D5 Table 9.4.5 row 5. The kiln main drive trips: feed and fuel are cut at once, the auxiliary drive turns the hot kiln 5 min later at 0.15 rpm, clinker stops reaching the cooler, and the cooler bed, crusher and conveyor run empty.",
    effects: [{ equipment: "kln-main-drive", state: "tripped", onsetMin: 10 }],
  },
  {
    id: "line-lube-oil-loss",
    machine: KLN,
    name: "Line – gearbox oil pump trip, main drive trips",
    group: "Process change",
    expected: ["SW-KLN-05"],
    documentedDetection: "+0h 11m",
    description:
      "D5 FP-15 / Table 9.4.5 row 5. The gearbox lube-oil pump trips: oil supply pressure collapses and the flow switch reads NO FLOW (urgent, 1 sample); the main drive trips on low oil pressure one minute later and the line stops on the aux drive.",
    effects: [{ equipment: "kln-lube-pump", state: "tripped", onsetMin: 10 }],
  },
  {
    id: "line-spray-stop",
    machine: KLN,
    name: "Line – girth-gear spray system trip",
    group: "Process change",
    expected: ["SW-KLN-02"],
    documentedDetection: "+0h 11m",
    description: "D5 Table 9.4.5 row 6. The girth-gear spray controller trips: every circuit stops cycling. The gear runs dry (wear, long outage) while the line keeps running.",
    effects: [{ equipment: "kln-spray", state: "tripped", onsetMin: 10 }],
  },
  {
    id: "line-thrust-hpu-trip",
    machine: KLN,
    name: "Line – thrust hydraulics trip, kiln creeps downhill",
    group: "Process change",
    expected: ["R-KLN-09"],
    documentedDetection: "+0h 12m",
    description: "D5 FP-25. The thrust hydraulic unit trips: thrust pressure collapses, the kiln stops floating and creeps downhill toward its travel limit (tyre and roller wear).",
    effects: [{ equipment: "kln-thrust-hpu", state: "tripped", onsetMin: 10 }],
  },
  {
    id: "line-outlet-fan-trip",
    machine: KLN,
    name: "Line – outlet sector-plate cooling fan trip",
    group: "Process change",
    expected: ["R-KLN-17"],
    documentedDetection: "+0h 24m",
    description: "D5 FP-29. The outlet cooling fan trips: the cooling air and the cow shell heat up, the sector plates are at risk (cracking, clinker spillage).",
    effects: [{ equipment: "kln-outlet-fan", state: "tripped", onsetMin: 10 }],
  },
  {
    id: "line-burner-impingement",
    machine: BRN,
    name: "Line – burner air blockage, shell hot band, molten clinker on the cooler",
    group: "Process change",
    expected: ["SW-BRN-01"],
    expectedElsewhere: ["PYR-KLN-01 · SW-KLN-04"],
    documentedDetection: "+1h 03m",
    description:
      "D5 Table 9.4.5 row 8, Table 3.1 flame → shell chain. The swirl channel blocks: the flame lengthens and impinges near 54–58 m, where the shell runs hot, and sticky molten clinker reaches the cooler (hot discharge, first compartment pressure up).",
    effects: [
      { target: sig("PRS-BRN-01"), delta: -40, onsetMin: 5, rampMin: 120, shape: "accel" },
      { target: prof("hotBand"), delta: 60, onsetMin: 40, rampMin: 200, shape: "ramp" },
      { target: sig("TMP-CLR-08"), delta: 18, onsetMin: 80, rampMin: 200, shape: "ramp" },
      { target: sig("PRS-CLR-01"), delta: 6, onsetMin: 80, rampMin: 200, shape: "ramp" },
    ],
  },
  {
    id: "line-pafan-trip",
    machine: BRN,
    name: "Line – primary-air fan trip, flame loss",
    group: "Process change",
    expected: [],
    documentedDetection: "+0h 01m",
    description: "D5 FP-33 effect / Table 5.5.3. The primary-air fan trips: the burner loses its flame, so feed and fuel are cut at once and the kiln is turned down; the burning zone, hood and shell cool.",
    effects: [{ equipment: "brn-pafan", state: "tripped", onsetMin: 10 }],
  },
  {
    id: "line-coal-blower-trip",
    machine: BRN,
    name: "Line – coal conveying blower trip, fuel lost",
    group: "Process change",
    expected: [],
    documentedDetection: "+0h 01m",
    description: "D5 FP-32 / FP-33 effect. The coal conveying blower trips: coal stops reaching the burner, the flame is lost and the line stops (feed and fuel cut).",
    effects: [{ equipment: "brn-coal-blower", state: "tripped", onsetMin: 10 }],
  },
  {
    id: "line-cooler-fan-trip",
    machine: CLR,
    name: "Line – cooling fan 2 trip, hot zone and secondary air",
    group: "Process change",
    expected: [],
    documentedDetection: "+0h 05m",
    description:
      "D5 Table 9.4.5 row 9, Table 3.1 air chain, FP-37 effect. Hot-zone cooling fan 2 trips: its compartment loses pressure, the hot zone cools worse (hot clinker downstream, red-river risk), the secondary air drops by about 100 K so the burning zone and hood follow, and the hood draws slightly harder.",
    effects: [{ equipment: "clr-fan-2", state: "tripped", onsetMin: 10 }],
  },
  {
    id: "line-grate-trip",
    machine: CLR,
    name: "Line – grate drive trip, bed builds, kiln output cut",
    group: "Process change",
    expected: ["R-CLR-03"],
    documentedDetection: "+0h 10m",
    description:
      "D5 FP-38 effect. The grate hydraulic unit trips: the stroke stops, the clinker bed builds in the hot zone (under-grate pressures rise), the operator cuts the kiln feed 30 % and slows the kiln after 15 min and stops the feed after 45 min.",
    effects: [{ equipment: "clr-grate-hpu", state: "tripped", onsetMin: 10 }],
  },
  {
    id: "line-vent-fan-trip",
    machine: CLR,
    name: "Line – cooler vent fan trip, hood pressure up",
    group: "Process change",
    expected: [],
    expectedElsewhere: ["PYR-KLN-01 · R-KLN-18"],
    documentedDetection: "+0h 02m",
    description: "D5 FP-39 effect. The cooler vent fan trips: the excess cooler air has nowhere to go but the hood, which turns positive.",
    effects: [{ equipment: "clr-vent-fan", state: "tripped", onsetMin: 10 }],
  },
  {
    id: "line-crusher-trip",
    machine: CCT,
    name: "Line – hammer crusher trip, cooler backs up",
    group: "Process change",
    expected: [],
    documentedDetection: "+0h 01m",
    description:
      "D5 Table 9.4.5 row 10, Table 3.1 clinker chain, FP-41 effect. The crusher trips: the cooler discharge is blocked, the cold-end bed backs up (compartments 4–6 and the grate hydraulics rise), the kiln feed is cut 30 % after 15 min and stopped after 45 min.",
    effects: [{ equipment: "hmr-crusher", state: "tripped", onsetMin: 10 }],
  },
  {
    id: "line-conveyor-trip",
    machine: CCT,
    name: "Line – pan conveyor trip, cooler backs up",
    group: "Process change",
    expected: [],
    documentedDetection: "+0h 01m",
    description:
      "D5 Table 9.4.5 row 10, FP-42 / FP-43 effect, Table 5.8.3. The pan conveyor trips: clinker transport stops, the crusher runs empty, the silo stops filling and the cooler backs up until the kiln feed is cut and then stopped.",
    effects: [{ equipment: "csl-conveyor", state: "tripped", onsetMin: 10 }],
  },
  {
    id: "line-silo-full",
    machine: CCT,
    name: "Line – cement mill down, clinker silo full",
    group: "Process change",
    expected: ["R-CSL-03"],
    documentedDetection: "+2h 40m",
    description:
      "D5 Table 5.8.3 'full silo backs up crusher and cooler'. The cement mill stops drawing clinker; the silo fills to its high-high level, which stops the pan conveyor, and the cooler backs up until the kiln feed is cut.",
    effects: [
      { target: drv("clinkerDraw"), delta: -1, onsetMin: 0, rampMin: 0, shape: "step" },
      { target: sig("LEV-CSL-01"), delta: 34, onsetMin: 0, rampMin: 300, shape: "ramp" },
    ],
  },
  {
    id: "line-coal-choke",
    machine: BRN,
    name: "Line – coal line choking, fuel surges and CO",
    group: "Process change",
    expected: ["R-BRN-04"],
    documentedDetection: "+1h 48m",
    description: "D5 FP-32 effect / Table 9.4.5 row 8. The coal conveying line chokes: line pressure rises and the coal reaches the flame in surges, so the burning zone, O₂ and CO at the kiln inlet swing.",
    effects: [
      { target: sig("PRS-BRN-04"), delta: 90, onsetMin: 5, rampMin: 150, shape: "accel" },
      // Roots blower load follows the line pressure (≈ 0.15 A/mbar at the design point).
      { target: sig("ELE-BRN-02"), delta: 13.5, onsetMin: 5, rampMin: 150, shape: "accel" },
      { target: drv("coalSurge"), delta: 0.5, onsetMin: 60, rampMin: 20, shape: "osc" },
    ],
  },
  {
    id: "line-grate-holes",
    machine: CLR,
    name: "Line – grate holes, secondary air drops",
    group: "Process change",
    expected: ["SW-CLR-01"],
    documentedDetection: "+2h 32m",
    description: "D5 Table 9.4.5 row 9, Table 3.1 air chain, FP-35 effect. Holes in compartment 2 let the air short-circuit: its pressure falls at a higher fan current, the cooler recuperates less heat, so the secondary air cools and the burning zone and hood follow (fuel use).",
    effects: [
      { target: sig("PRS-CLR-02"), delta: -21, onsetMin: 5, rampMin: 200, shape: "accel" },
      { target: sig("ELE-CLR-02"), delta: 14, onsetMin: 5, rampMin: 200, shape: "accel" },
      { target: sig("TMP-CLR-08"), delta: 20, onsetMin: 5, rampMin: 200, shape: "accel" },
      { target: drv("coolerRecup"), delta: 0.12, onsetMin: 5, rampMin: 200, shape: "accel" },
    ],
  },
];
