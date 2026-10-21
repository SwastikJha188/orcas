/**
 * Schultheiss VPC 066 — Demonstration Scenarios (§7.3 & §7.4).
 *
 * Covers the defined demo operating case (VPC 066 Power, 18 kt yellow gold, 1.0 kg),
 * all combined fault-finding scenarios from Section 7.4, optional vibration and
 * closure faults, and sensor data-quality validation.
 */
import { sig, type PyroScenario } from "../pyro-sim/scenarios/common";
import { VPC_MACHINE_ID } from "./signals";

export const VPC_SCENARIOS: PyroScenario[] = [
  {
    id: "healthy",
    machine: VPC_MACHINE_ID,
    name: "Healthy — 18 kt yellow gold 1.0 kg cycle (VPC 066 Power)",
    group: "Baseline",
    expected: [],
    documentedDetection: "— (no finding)",
    description:
      "Nominal VPC 066 Power demo cycle: T1 = 1,020 °C melt setpoint, P2 = 300 mbar abs flask vacuum, P1 = 1.20 bar(g) casting overpressure, P3 = 5.00 bar(g) regulated gas supply, F1 = 14.0 L/min cooling water (22 °C in / 27 °C out, DT1 = 5.0 °C rise), V1 = 1.80 mm/s, T4 = 57.0 °C, E1 = 8.40 kW.",
    effects: [],
  },
  {
    id: "vpc-vac-pump-wear",
    machine: VPC_MACHINE_ID,
    name: "Vacuum pump degradation / suction restriction (§7.4 #1)",
    group: "Equipment fault",
    expected: ["R-VPC-01"],
    documentedDetection: "~12 min",
    description:
      "Flask vacuum pump-down slows (P2 rises to 468 mbar abs, P4 rises to 442 mbar) while vacuum pump vibration V1 climbs to 3.95 mm/s RMS, housing temperature T4 rises to 79 °C, and motor current E2 increases to 6.6 A.",
    effects: [
      { target: sig("P2"), delta: 168, onsetMin: 2, rampMin: 12, shape: "ramp" },
      { target: sig("V1"), delta: 2.15, onsetMin: 2, rampMin: 12, shape: "ramp" },
      { target: sig("T4"), delta: 22.0, onsetMin: 3, rampMin: 14, shape: "ramp" },
      { target: sig("P4"), delta: 157, onsetMin: 2, rampMin: 12, shape: "ramp" },
      { target: sig("E2"), delta: 2.40, onsetMin: 2, rampMin: 12, shape: "ramp" },
    ],
  },
  {
    id: "vpc-flask-seal-leak",
    machine: VPC_MACHINE_ID,
    name: "Flask chamber seal leak or hose/valve passing (§7.4 #2)",
    group: "Shell & seals",
    expected: ["R-VPC-02"],
    documentedDetection: "~10 min",
    description:
      "Lower flask chamber vacuum P2 fails to reach the 300 mbar target (stalls at 462 mbar abs) while vacuum pump vibration V1 (1.80 mm/s) and housing temperature T4 (57 °C) remain completely normal — isolating a chamber seal or branch leak from pump wear.",
    effects: [
      { target: sig("P2"), delta: 162, onsetMin: 2, rampMin: 10, shape: "ramp" },
    ],
  },
  {
    id: "vpc-gas-supply-low",
    machine: VPC_MACHINE_ID,
    name: "Insufficient gas supply or regulator droop (§7.4 #3)",
    group: "Process change",
    expected: ["R-VPC-03"],
    documentedDetection: "~8 min",
    description:
      "Regulated casting/protective gas supply pressure P3 drops from 5.00 bar to 3.75 bar (< 80 % baseline), causing upper melting chamber overpressure P1 to fall short at 0.84 bar during the casting step.",
    effects: [
      { target: sig("P3"), delta: -1.25, onsetMin: 2, rampMin: 8, shape: "ramp" },
      { target: sig("P1"), delta: -0.36, onsetMin: 2, rampMin: 8, shape: "ramp" },
    ],
  },
  {
    id: "vpc-gas-valve-stick",
    machine: VPC_MACHINE_ID,
    name: "Solenoid valve sticking or upper-chamber leak (§7.4 #4)",
    group: "Equipment fault",
    expected: ["R-VPC-04"],
    documentedDetection: "~8 min",
    description:
      "Upper melting chamber overpressure P1 only reaches 0.85 bar during the pressure step even though regulated gas supply P3 remains rock-steady at 5.00 bar — pointing to a sticking solenoid valve or upper lid seal leak.",
    effects: [
      { target: sig("P1"), delta: -0.35, onsetMin: 2, rampMin: 8, shape: "ramp" },
    ],
  },
  {
    id: "vpc-ind-power-derate",
    machine: VPC_MACHINE_ID,
    name: "Induction generator power derating / supply loss (§7.4 #5)",
    group: "Drive train",
    expected: ["R-VPC-05"],
    documentedDetection: "~10 min",
    description:
      "Main/induction electrical power E1 drops from 8.40 kW to 6.30 kW (< 80 % matched normal) and melt temperature T1 lags at 978 °C (-42 °C error vs 1,020 °C setpoint).",
    effects: [
      { target: sig("E1"), delta: -2.10, onsetMin: 2, rampMin: 10, shape: "ramp" },
      { target: sig("T1"), delta: -42, onsetMin: 2, rampMin: 10, shape: "ramp" },
    ],
  },
  {
    id: "vpc-tc-drift-charge",
    machine: VPC_MACHINE_ID,
    name: "Charge/alloy mismatch or Type-S thermocouple drift (§7.4 #6)",
    group: "Process change",
    expected: ["R-VPC-06"],
    documentedDetection: "~10 min",
    description:
      "Melt temperature T1 deviates to 982 °C while induction electrical power E1 remains normal at 8.40 kW — indicating an unrecorded heavier charge/alloy mismatch, crucible thermal contact issue, or Type-S thermocouple drift.",
    effects: [
      { target: sig("T1"), delta: -38, onsetMin: 2, rampMin: 10, shape: "ramp" },
    ],
  },
  {
    id: "vpc-cooling-restrict",
    machine: VPC_MACHINE_ID,
    name: "Cooling-water flow restriction & coil ΔT rise (§7.4 #7)",
    group: "Equipment fault",
    expected: ["R-VPC-07"],
    documentedDetection: "~9 min",
    description:
      "Machine cooling-water flow F1 drops from 14.0 L/min to 9.8 L/min (< 75 % baseline) due to strainer/hose restriction while outlet temperature T3 rises to 34.5 °C, driving cooling temperature rise DT1 (T3 − T2) to 12.5 °C.",
    effects: [
      { target: sig("F1"), delta: -4.2, onsetMin: 2, rampMin: 9, shape: "ramp" },
      { target: sig("T3"), delta: 7.5, onsetMin: 2, rampMin: 9, shape: "ramp" },
    ],
  },
  {
    id: "vpc-cooling-warm-inlet",
    machine: VPC_MACHINE_ID,
    name: "Cooling-water supply temperature too warm (§7.4 #8)",
    group: "Process change",
    expected: ["R-VPC-08"],
    documentedDetection: "~9 min",
    description:
      "Cooling-water inlet temperature T2 rises from 22.0 °C to 30.2 °C (lifting outlet T3 to 35.2 °C) while cooling flow F1 remains normal at 14.0 L/min — pointing to chiller overload or warm plant cooling water.",
    effects: [
      { target: sig("T2"), delta: 8.2, onsetMin: 2, rampMin: 9, shape: "ramp" },
      { target: sig("T3"), delta: 8.2, onsetMin: 2, rampMin: 9, shape: "ramp" },
    ],
  },
  {
    id: "vpc-stopper-lag",
    machine: VPC_MACHINE_ID,
    name: "Stopper / sealing rod actuation lag (§7.4 #9)",
    group: "Equipment fault",
    expected: ["R-VPC-09"],
    documentedDetection: "~5 min",
    description:
      "Sealing rod actuator position feedback S1 reports LAG on cast release and the P1/P2 casting pressure profile is disturbed (P1 dips to 1.01 bar, P2 rises to 405 mbar).",
    effects: [
      { target: sig("S1"), state: "LAG", onsetMin: 3, rampMin: 1, shape: "step" },
      { target: sig("P1"), delta: -0.19, onsetMin: 3, rampMin: 6, shape: "ramp" },
      { target: sig("P2"), delta: 105, onsetMin: 3, rampMin: 6, shape: "ramp" },
    ],
  },
  {
    id: "vpc-vib-mount-fault",
    machine: VPC_MACHINE_ID,
    name: "Flask vibration actuator / spring mount fault (§6 / §7.1)",
    group: "Support & thrust",
    expected: ["R-VPC-10"],
    documentedDetection: "~8 min",
    description:
      "Lower flask vibration response V2 exceeds the mode-specific envelope (rising from 3.20 mm/s to 6.45 mm/s RMS) during the hold/vibrate stage due to a loose spring mount or actuator fault.",
    effects: [
      { target: sig("V2"), delta: 3.25, onsetMin: 2, rampMin: 8, shape: "ramp" },
    ],
  },
  {
    id: "vpc-sensor-flatline",
    machine: VPC_MACHINE_ID,
    name: "Flask vacuum transmitter P2 frozen / flat-line (R-DQ-01)",
    group: "Sensor validation",
    expected: ["R-DQ-01"],
    documentedDetection: "~9 min",
    description:
      "Flask chamber vacuum transmitter P2 freezes at a constant value across consecutive samples while P4 and pump signals continue to vary normally. R-DQ-01 flags P2 and holds downstream vacuum rules.",
    effects: [
      { target: sig("P2"), hold: true, onsetMin: 2, rampMin: 1, shape: "step", sensor: true },
    ],
  },
];

export function vpcScenario(id: string): PyroScenario {
  return VPC_SCENARIOS.find((s) => s.id === id) ?? VPC_SCENARIOS[0];
}
