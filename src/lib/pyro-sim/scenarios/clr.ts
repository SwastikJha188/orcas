/**
 * Grate cooler PYR-CLR-01 demonstration scenarios.
 * Expected rules are defined in `../rules/clr.ts`.
 *
 * One scenario per D5 §5.6.4 failure mode / Table 9.4.3 pattern (FP-35 …
 * FP-39, both directions where D5 names two) and per §5.6.6 verification
 * check. Cross-machine effects (fan trip → red river, cool secondary air →
 * flame, hood pressure rising, bed build-up → kiln slows) belong to the line
 * scenarios.
 */
import { drv, list, sig, type PyroScenario } from "./common";

export const CLR_SCENARIOS: PyroScenario[] = list("PYR-CLR-01", [
  {
    id: "clr-grate-plate",
    name: "Grate plate damage — compartment 2",
    group: "Equipment fault",
    expected: ["SW-CLR-01"],
    documentedDetection: "+1h 19m",
    description: "FP-35. A grate plate fails over compartment 2: air short-circuits, the compartment pressure falls while the fan draws more current, and clinker leaves hotter.",
    effects: [
      { target: sig("PRS-CLR-02"), delta: -21, onsetMin: 5, rampMin: 120, shape: "ramp" },
      { target: sig("ELE-CLR-02"), delta: 14, onsetMin: 5, rampMin: 120, shape: "ramp" },
      { target: sig("TMP-CLR-08"), delta: 20, onsetMin: 20, rampMin: 180, shape: "ramp" },
      // Less heat recuperated: the secondary air (TMP-BRN-02) cools by ≈ 50 K and the flame and hood follow (D5 Table 3.1 air chain).
      { target: drv("coolerRecup"), delta: 0.12, onsetMin: 20, rampMin: 180, shape: "ramp" },
    ],
  },
  {
    id: "clr-fan2-bearing",
    name: "Cooling fan 2 bearing defect",
    group: "Equipment fault",
    expected: ["R-CLR-02"],
    documentedDetection: "+3h 20m",
    description: "FP-37. Cooling fan 2 bearing wears: vibration and bearing temperature rise together.",
    effects: [
      { target: sig("VIB-CLR-02"), delta: 3.4, onsetMin: 5, rampMin: 360, shape: "accel" },
      { target: sig("TMP-CLR-02"), delta: 16, onsetMin: 5, rampMin: 360, shape: "accel" },
    ],
  },
  {
    id: "clr-fan5-bearing",
    name: "Cooling fan 5 bearing (no pickup)",
    group: "Equipment fault",
    expected: ["R-CLR-02"],
    documentedDetection: "+2h 44m",
    description: "FP-37, fans 4–6. Fan 5 has no vibration pickup (removed in Rev. 00): only its bearing temperature and current show the defect.",
    effects: [
      { target: sig("TMP-CLR-05"), delta: 22, onsetMin: 5, rampMin: 300, shape: "accel" },
      { target: sig("ELE-CLR-05"), delta: 9, onsetMin: 5, rampMin: 300, shape: "accel" },
    ],
  },
  {
    id: "clr-hydraulic",
    name: "Grate drive stiffening (snowman)",
    group: "Equipment fault",
    expected: ["R-CLR-03"],
    documentedDetection: "+2h 39m",
    description: "FP-38, rising direction. A heavy bed / snowman loads the grate: the grate needs more hydraulic pressure and the HPU oil warms.",
    effects: [
      { target: sig("PRS-CLR-07"), delta: 60, onsetMin: 5, rampMin: 220, shape: "accel" },
      { target: sig("TMP-CLR-07"), delta: 12, onsetMin: 5, rampMin: 260, shape: "ramp" },
    ],
  },
  {
    id: "clr-hpu-pressure-loss",
    name: "Grate HPU pressure loss",
    group: "Equipment fault",
    expected: ["R-CLR-03"],
    documentedDetection: "+0h 33m",
    description: "FP-38, collapsing direction. The HPU pump wears and a relief valve leaks: the working pressure collapses, the grate strokes slower than the feed-following target and the cold-end bed starts to build.",
    effects: [
      { target: sig("PRS-CLR-07"), delta: -58, onsetMin: 5, rampMin: 120, shape: "ramp" },
      { target: sig("SPD-CLR-01"), delta: -2.6, onsetMin: 5, rampMin: 120, shape: "ramp" },
      { target: sig("PRS-CLR-04"), delta: 3, onsetMin: 30, rampMin: 120, shape: "ramp" },
      { target: sig("PRS-CLR-05"), delta: 2.5, onsetMin: 30, rampMin: 120, shape: "ramp" },
      { target: sig("PRS-CLR-06"), delta: 2, onsetMin: 30, rampMin: 120, shape: "ramp" },
    ],
  },
  {
    id: "clr-stroke-slow",
    name: "Grate stroke rate below target",
    group: "Equipment fault",
    expected: ["R-CLR-03"],
    documentedDetection: "+0h 42m",
    description: "FP-38, stroke rate off. A worn proportional valve lets the grate run about 12 % slower than its feed-following target at normal working pressure; the bed thickens slowly.",
    effects: [
      { target: sig("SPD-CLR-01"), delta: -1.3, onsetMin: 5, rampMin: 60, shape: "settle" },
      { target: sig("PRS-CLR-04"), delta: 2.5, onsetMin: 20, rampMin: 120, shape: "ramp" },
      { target: sig("PRS-CLR-05"), delta: 2, onsetMin: 20, rampMin: 120, shape: "ramp" },
    ],
  },
  {
    id: "clr-vent-imbalance",
    name: "Vent fan impeller build-up",
    group: "Equipment fault",
    expected: ["R-CLR-04"],
    documentedDetection: "+1h 35m",
    description: "FP-39. Dust builds on the vent fan impeller: vibration rises, the bearing does not heat and the fan moves less air (current falls).",
    effects: [
      { target: sig("VIB-CLR-07"), delta: 3.0, onsetMin: 5, rampMin: 320, shape: "ramp" },
      { target: sig("ELE-CLR-07"), delta: -25, onsetMin: 5, rampMin: 320, shape: "ramp" },
    ],
  },
  {
    id: "clr-vent-bearing",
    name: "Vent fan bearing defect",
    group: "Equipment fault",
    expected: ["R-CLR-04"],
    documentedDetection: "+3h 34m",
    description: "FP-39, bearing. The vent fan bearing wears: its temperature climbs with the vibration.",
    effects: [
      { target: sig("VIB-CLR-07"), delta: 2.6, onsetMin: 5, rampMin: 360, shape: "accel" },
      { target: sig("TMP-CLR-10"), delta: 16, onsetMin: 5, rampMin: 360, shape: "accel" },
    ],
  },
  {
    id: "clr-red-river",
    name: "Red river",
    group: "Equipment fault",
    expected: ["R-CLR-05"],
    documentedDetection: "+1h 30m",
    description: "FP-36. Fine clinker channels through the bed: the hot-zone compartment pressures diverge and a hot stream reaches the discharge.",
    effects: [
      { target: sig("TMP-CLR-08"), delta: 95, onsetMin: 5, rampMin: 140, shape: "accel" },
      { target: sig("PRS-CLR-01"), delta: 7, onsetMin: 5, rampMin: 140, shape: "ramp" },
      { target: sig("PRS-CLR-02"), delta: -6, onsetMin: 5, rampMin: 140, shape: "ramp" },
    ],
  },
  {
    id: "clr-snowman",
    name: "Snowman at the cooler inlet",
    group: "Equipment fault",
    expected: ["R-CLR-05"],
    documentedDetection: "+1h 39m",
    description: "FP-36, snowman. Sticky clinker builds a mound at the inlet: compartment 1 pressure rises under it while compartment 3 thins out, and the poorly distributed bed sends hotter clinker to the discharge.",
    effects: [
      { target: sig("PRS-CLR-01"), delta: 13, onsetMin: 5, rampMin: 150, shape: "ramp" },
      { target: sig("PRS-CLR-03"), delta: -7, onsetMin: 5, rampMin: 150, shape: "ramp" },
      { target: sig("TMP-CLR-08"), delta: 28, onsetMin: 10, rampMin: 150, shape: "ramp" },
    ],
  },
  {
    id: "clr-vib-dropout",
    name: "Sensor – fan 1 vibration pickup dropout",
    group: "Sensor validation",
    expected: ["R-DQ-01"],
    documentedDetection: "+0h 03m",
    description: "The fan 1 accelerometer cable breaks: the reading falls to zero while the fan runs.",
    effects: [{ target: sig("VIB-CLR-01"), delta: -2.1, onsetMin: 2, rampMin: 0, shape: "step", sensor: true }],
  },
  {
    id: "clr-vib-loose-cable",
    name: "Sensor – fan 3 vibration cable loose",
    group: "Sensor validation",
    expected: ["R-DQ-02"],
    documentedDetection: "+0h 15m",
    description: "D5 Table 9.4.2 variability band \"too noisy\": the fan 3 accelerometer connector works loose and the reading turns erratic while the fan runs normally — Suspect (loose / failing sensor), not a fan fault.",
    effects: [{ target: sig("VIB-CLR-03"), delta: 0.6, onsetMin: 2, rampMin: 0, shape: "noise", sensor: true }],
  },
  {
    id: "clr-tap-blocked",
    name: "Sensor – compartment 3 pressure tap blocked",
    group: "Sensor validation",
    expected: ["R-DQ-02"],
    documentedDetection: "+0h 08m",
    description: "D5 5.6.6 \"flat = blocked tap\": clinker dust plugs the compartment 3 tap and the transmitter holds its last value while the fans run — variability band too steady, Suspect (D5 Table 9.4.2); rod the tap.",
    effects: [{ target: sig("PRS-CLR-03"), hold: true, onsetMin: 2, rampMin: 0, shape: "step", sensor: true }],
  },
  {
    id: "clr-pt-drift",
    name: "Sensor – compartment 4 transmitter drift",
    group: "Sensor validation",
    expected: ["SV-CLR-01"],
    documentedDetection: "+0h 48m",
    description: "D5 5.6.6: each compartment pressure must agree with its fan current. The compartment 4 transmitter drifts 30 % low while fan 4 draws its normal current.",
    effects: [{ target: sig("PRS-CLR-04"), delta: -13, onsetMin: 2, rampMin: 60, shape: "ramp", sensor: true }],
  },
  {
    id: "clr-ir-window-dirty",
    name: "Sensor – discharge IR window dirty",
    group: "Sensor validation",
    expected: ["SV-CLR-01"],
    documentedDetection: "+2h 01m",
    description: "D5 5.6.6: discharge window clean; compare with handheld. Dust coats the discharge pyrometer window and it reads about 40 K low; the next 4-hourly handheld round disagrees.",
    effects: [{ target: sig("TMP-CLR-08"), delta: -40, onsetMin: 2, rampMin: 90, shape: "ramp", sensor: true }],
  },
]);
