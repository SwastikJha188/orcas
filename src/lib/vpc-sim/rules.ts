/**
 * Schultheiss VPC 066 — Diagnostic and Fault-Finding Rule Library.
 *
 * Source: TECHNICAL SPECIFICATIONS: VPC 066 - Automatic Vacuum-Pressure Casting Machine
 * Section 7.3 (Indicative Demo Alert Levels) & Section 7.4 (Combined Fault-Finding Rules).
 */
import type { PyroRuleDef } from "../pyro-sim/rules";
import { VPC_MACHINE_ID, VPC_SIGNALS } from "./signals";

export interface VpcCombinedRuleSpec {
  id: string;
  pattern: string;
  meaning: string;
  action: string;
  inputs: string[];
}

/** Section 7.4: Exact 10 Combined Fault-Finding Rules from the specification table. */
export const VPC_COMBINED_FAULT_TABLE: readonly VpcCombinedRuleSpec[] = [
  {
    id: "R-VPC-01",
    pattern: "P2 pump-down slow + V1/T4 rising",
    meaning: "Possible vacuum pump degradation or restriction",
    action: "Compare pump-side P4 and valve states; inspect pump/filters.",
    inputs: ["P2", "V1", "T4", "P4", "E2"],
  },
  {
    id: "R-VPC-02",
    pattern: "P2 pump-down slow + V1/T4 normal",
    meaning: "Possible flask seal leak, hose leak or valve passing",
    action: "Investigate chamber sealing and approved isolation test.",
    inputs: ["P2", "V1", "T4", "S2"],
  },
  {
    id: "R-VPC-03",
    pattern: "P1 pressure rise slow + P3 low",
    meaning: "Insufficient gas supply or regulator issue",
    action: "Check supply pressures and regulator.",
    inputs: ["P1", "P3"],
  },
  {
    id: "R-VPC-04",
    pattern: "P1 pressure rise slow + P3 stable",
    meaning: "Valve, chamber leakage or switching delay",
    action: "Check valve command, response and chamber condition.",
    inputs: ["P1", "P3", "S2"],
  },
  {
    id: "R-VPC-05",
    pattern: "T1 heat-up slow + E1 low",
    meaning: "Power unavailable, generator derating or supply issue",
    action: "Inspect generator diagnostics, supply and cooling.",
    inputs: ["T1", "E1"],
  },
  {
    id: "R-VPC-06",
    pattern: "T1 heat-up slow + E1 normal",
    meaning: "Different charge/alloy; probe error; thermal process issue",
    action: "Validate batch mass, alloy and thermocouple reference.",
    inputs: ["T1", "E1"],
  },
  {
    id: "R-VPC-07",
    pattern: "F1 low + T3-T2 rises",
    meaning: "Cooling-flow restriction or lower circulation",
    action: "Inspect coolant supply, filter, hoses; protect per OEM.",
    inputs: ["F1", "T2", "T3", "DT1"],
  },
  {
    id: "R-VPC-08",
    pattern: "T2 high + F1 normal",
    meaning: "Cooling supply temperature too warm",
    action: "Check chiller/plant-water source and ambient.",
    inputs: ["T2", "T3", "F1", "DT1"],
  },
  {
    id: "R-VPC-09",
    pattern: "S1 lag + P1/P2 profile altered",
    meaning: "Stopper mechanism or actuation problem possible",
    action: "Inspect position feedback and planned mechanical checks.",
    inputs: ["S1", "P1", "P2"],
  },
  {
    id: "R-VPC-10",
    pattern: "Casting reject high; process signals normal",
    meaning: "Mould, burnout, alloy, sprues or other upstream quality issue",
    action: "Correlate quality data rather than blame a component.",
    inputs: ["P1", "P2", "P3", "T1", "F1", "S1"],
  },
];

const ALL_ONLINE = VPC_SIGNALS.filter((s) => s.origin === "online").map((s) => s.tag);

export const VPC_RULES: PyroRuleDef[] = [
  {
    id: "R-VPC-01",
    machine: VPC_MACHINE_ID,
    name: "Vacuum pump degradation or suction restriction",
    category: "Rotating equipment",
    system: "vpc-vacuum",
    subs: ["vpc-vac-pump"],
    logic:
      "P2 flask vacuum > 1.30 × baseline (≥ 390 mbar warn, ≥ 450 mbar alert) AND vacuum pump vibration V1 > 1.5 × normal (≥ 2.70 mm/s) or pump housing temperature T4 > normal + 10 °C (≥ 67 °C)",
    cause: "Possible vacuum pump degradation, vane/rotor wear, or suction filter/line restriction (§7.4 #1)",
    consequence: "Slow lower-chamber evacuation, incomplete differential pressure across the investment flask, and risk of unscheduled pump failure",
    action: "Compare pump-side P4 and valve states; inspect vacuum pump oil, intake filter, and exhaust/suction lines.",
    inputs: ["P2", "V1", "T4", "P4", "E2"],
    owner: "Mechanical maintenance",
    unproven: "Whether the root cause is internal pump wear or intake filter restriction until P4 vs P2 differential is checked",
  },
  {
    id: "R-VPC-02",
    machine: VPC_MACHINE_ID,
    name: "Flask chamber seal leak, hose leak or valve passing",
    category: "Shell & seals",
    system: "vpc-flask",
    subs: ["vpc-flask-ch"],
    logic:
      "P2 flask vacuum > 1.30 × baseline (≥ 390 mbar warn, ≥ 450 mbar alert) while vacuum pump vibration V1 (< 2.70 mm/s) and temperature T4 (< 67 °C) remain normal",
    cause: "Possible flask chamber seal leak, vacuum hose leak, or isolation valve passing (§7.4 #2)",
    consequence: "Insufficient vacuum in the lower flask chamber during stage 5/6, causing gas porosity or incomplete filling of fine jewellery details",
    action: "Investigate lower-chamber flange/gasket sealing, flask adapter seating, and run approved chamber isolation leak-rate test.",
    inputs: ["P2", "V1", "T4", "S2"],
    owner: "Casting operator / maintenance",
    unproven: "Exact leak location (flask rim gasket vs lower chamber door seal vs branch valve) until isolation test",
  },
  {
    id: "R-VPC-03",
    machine: VPC_MACHINE_ID,
    name: "Insufficient gas supply or regulator issue",
    category: "Process",
    system: "vpc-gas",
    subs: ["vpc-gas-reg"],
    logic:
      "P1 upper chamber pressure deviation > 0.15 bar below 1.20 bar target (≤ 1.05 bar warn, ≤ 0.90 bar alert) AND regulated gas supply P3 < 90 % baseline (≤ 4.50 bar warn, ≤ 4.00 bar alert)",
    cause: "Insufficient inert/casting gas cylinder pressure or pressure regulator droop (§7.4 #3)",
    consequence: "Slow or incomplete upper-chamber pressurisation during casting (stage 6) and oxidation risk during melt protection (stage 2/3)",
    action: "Check inert gas cylinder inventory, manifold supply pressure, and pressure regulator setting.",
    inputs: ["P1", "P3"],
    owner: "Casting operator / utilities",
    unproven: "Whether supply drop is an empty cylinder bank or a failing regulator diaphragm until upstream gauge is checked",
  },
  {
    id: "R-VPC-04",
    machine: VPC_MACHINE_ID,
    name: "Gas valve sticking, chamber leakage or switching delay",
    category: "Process",
    system: "vpc-gas",
    subs: ["vpc-gas-reg"],
    logic:
      "P1 upper chamber pressure deviation > 0.15 bar from 1.20 bar target (≤ 1.05 or ≥ 1.35 bar) while regulated gas supply P3 remains stable (> 4.50 bar)",
    cause: "Solenoid valve sticking, upper-chamber lid seal leakage, or valve switching delay (§7.4 #4)",
    consequence: "Delayed or inaccurate casting overpressure profile at metal release, reducing mould filling repeatability",
    action: "Check solenoid valve command vs P1 pressure response timing and inspect upper-chamber cover O-ring condition.",
    inputs: ["P1", "P3", "S2"],
    owner: "E&I / mechanical maintenance",
    unproven: "Solenoid coil/spool delay vs upper cover seal bypass until valve timing test is run",
  },
  {
    id: "R-VPC-05",
    machine: VPC_MACHINE_ID,
    name: "Induction power unavailable, generator derating or supply issue",
    category: "Drive train",
    system: "vpc-induction",
    subs: ["vpc-ind-gen"],
    logic:
      "T1 melt temperature error > 15 °C below 1,020 °C target (≤ 1,005 °C warn, ≤ 990 °C alert) AND induction electrical power E1 < 90 % matched normal (≤ 7.56 kW warn, ≤ 6.72 kW alert)",
    cause: "Induction generator power derating, 400 V 3-phase supply issue, or coil/capacitor fault (§7.4 #5)",
    consequence: "Extended melting time, incomplete alloy homogenisation, or cycle abort with precious metal in the crucible",
    action: "Inspect induction generator diagnostics, 400 V 3-phase feeder supply, and generator cooling interlocks.",
    inputs: ["T1", "E1"],
    owner: "Electrical / OEM service",
    unproven: "Internal inverter thermal derating vs external 400 V supply dip until generator fault log is read",
  },
  {
    id: "R-VPC-06",
    machine: VPC_MACHINE_ID,
    name: "Charge/alloy mismatch, probe error or crucible thermal issue",
    category: "Process",
    system: "vpc-induction",
    subs: ["vpc-ind-gen"],
    logic:
      "T1 melt temperature deviation > 15 °C from 1,020 °C setpoint (≤ 1,005 or ≥ 1,035 °C) while induction power E1 remains normal (> 7.56 kW)",
    cause: "Different charge mass/alloy than recipe, Type-S thermocouple drift, or crucible/sheath thermal contact issue (§7.4 #6)",
    consequence: "Overheating (alloy evaporation, crucible degradation near 1,450 °C limit) or cold casting (misruns in filigree sections)",
    action: "Validate batch mass (1.0 kg demo basis), alloy recipe (18 kt yellow gold), and verify Type-S thermocouple reference and sheath.",
    inputs: ["T1", "E1"],
    owner: "Metallurgist / E&I",
    unproven: "Thermocouple calibration drift vs unrecorded charge mass difference until verified against reference probe",
  },
  {
    id: "R-VPC-07",
    machine: VPC_MACHINE_ID,
    name: "Cooling-water flow restriction or reduced circulation",
    category: "Process",
    system: "vpc-cooling",
    subs: ["vpc-cool-loop"],
    logic:
      "F1 cooling-water flow < 85 % baseline (≤ 11.9 L/min warn, ≤ 10.5 L/min alert) AND cooling temperature rise DT1 (T3 − T2) > baseline + 3 °C (≥ 8.0 °C warn, ≥ 11.0 °C alert)",
    cause: "Cooling-water strainer/filter restriction, pinched hose, scale build-up in coil, or cooling pump degradation (§7.4 #7)",
    consequence: "Overheating of induction coil and power electronics; safety-critical OEM thermal trip during active melt",
    action: "Inspect coolant supply pump, inline strainer, hoses and manifold valves; protect equipment per OEM interlocks.",
    inputs: ["F1", "T2", "T3", "DT1"],
    owner: "Utilities / mechanical maintenance",
    unproven: "External strainer blockage vs internal induction coil scale until differential pressure across loop is checked",
  },
  {
    id: "R-VPC-08",
    machine: VPC_MACHINE_ID,
    name: "Cooling-water supply temperature too warm",
    category: "Process",
    system: "vpc-cooling",
    subs: ["vpc-cool-loop"],
    logic:
      "T2 cooling-water inlet temperature > 26 °C (warn > 26 °C, alert > 29 °C) while cooling flow F1 remains normal (> 11.9 L/min)",
    cause: "Chiller overload, warm plant-water supply, or high ambient temperature (§7.4 #8)",
    consequence: "Elevated outlet temperature T3 (≥ 30 °C warn, ≥ 33 °C alert) reducing thermal margin on induction generator",
    action: "Check chiller setpoint, condenser airflow, plant-water heat exchanger, and ambient conditions.",
    inputs: ["T2", "T3", "F1", "DT1"],
    owner: "Utilities / facility maintenance",
    unproven: "Chiller refrigeration fault vs high shop ambient load until chiller unit is inspected",
  },
  {
    id: "R-VPC-09",
    machine: VPC_MACHINE_ID,
    name: "Stopper / sealing rod actuation lag or mechanism problem",
    category: "Material handling",
    system: "vpc-stopper",
    subs: ["vpc-crucible"],
    logic:
      "S1 stopper state shows LAG or FAULT on cast command AND P1/P2 casting pressure profile is altered",
    cause: "Sealing rod actuator linkage bind, graphite stopper tip wear/sticking at crucible nozzle, or pneumatic/actuator delay (§7.4 #9)",
    consequence: "Delayed or uneven vertical metal release into investment mould, causing turbulence, cold shuts, or nozzle dripping",
    action: "Inspect sealing rod actuator travel, position feedback switch S1, and crucible/stopper tip alignment and wear.",
    inputs: ["S1", "P1", "P2"],
    owner: "Casting technician / mechanical",
    unproven: "Graphite stopper tip slag adhesion vs upper actuator mechanical bind until cold inspection",
  },
  {
    id: "R-VPC-10",
    machine: VPC_MACHINE_ID,
    name: "Flask vibration response outside mode envelope",
    category: "Rotating equipment",
    system: "vpc-vibration",
    subs: ["vpc-vib-base"],
    logic:
      "V2 flask vibration outside mode-specific envelope (≤ 2.00 or ≥ 4.80 mm/s warn; ≤ 1.20 or ≥ 6.00 mm/s alert) during hold/vibrate stage",
    cause: "Direct-vibration actuator fault, loose spring mount on lower flask support, or unbalance (§6 / §7.1)",
    consequence: "Inconsistent grain refinement and porosity control during solidification stage (stage 7)",
    action: "Inspect lower flask support spring mounts, vibration actuator fasteners, and OEM vibration feedback.",
    inputs: ["V2", "P2"],
    owner: "Mechanical maintenance",
    unproven: "Spring mount fatigue vs vibrator exciter fault until lower flask table is inspected",
  },
  {
    id: "R-VPC-11",
    machine: VPC_MACHINE_ID,
    name: "Chamber closure or safety permissive fault",
    category: "Shell & seals",
    system: "vpc-flask",
    subs: ["vpc-flask-ch"],
    logic: "S2 chamber closure state is UNSEALED or OPEN_FAULT when cycle requires locked containment",
    cause: "Upper melting cover or lower flask chamber door not fully latched, investment spatter on seal face, or interlock switch misalignment (§6 / §7.1)",
    consequence: "OEM safety interlock prevents cycle start or aborts evacuation/pressurisation",
    action: "Clean chamber seal faces, verify cover latch engagement, and check OEM closure switch alignment (read-only in ULTRON).",
    inputs: ["S2", "P1", "P2"],
    owner: "Casting operator / E&I",
    unproven: "Physical seal obstruction vs limit-switch bracket shift until visual check",
  },
  {
    id: "R-DQ-01",
    machine: VPC_MACHINE_ID,
    name: "Sensor validity — range, flat-line or loop fault",
    category: "Data quality",
    system: "vpc-vacuum",
    subs: ["vpc-vac-pump"],
    logic:
      "Any online 4–20 mA / Pt100 / Type-S channel outside calibrated instrument range, clipped at range end, or flat-lined across 8 consecutive samples",
    cause: "Open 4–20 mA loop, frozen transmitter, disconnected thermocouple, or blocked pressure tap",
    consequence: "Downstream condition rules reading the flagged channel are held so a sensor fault never triggers a false machine alarm",
    action: "Check transmitter loop current, terminal block in ULTRON edge rack, and sensor connector on VPC 066.",
    inputs: ALL_ONLINE,
    owner: "E&I / instrumentation",
    unproven: "Field transducer failure vs wiring terminal looseness until loop check",
  },
  {
    id: "R-DQ-02",
    machine: VPC_MACHINE_ID,
    name: "Cross-channel physical plausibility check",
    category: "Data quality",
    system: "vpc-cooling",
    subs: ["vpc-cool-loop"],
    logic:
      "Single channel deviates > 5σ from physical neighbours (e.g. P4 vs P2 during open evacuation, or T3 below T2 while E1 > 0 kW)",
    cause: "Calibration offset or drift on one pressure or RTD transmitter while paired witness channels remain normal",
    consequence: "Derived differential (DT1 or P2−P4) becomes suspect until the drifting channel is zero-checked",
    action: "Compare P2 and P4 at atmospheric equalisation (stage 8) and compare T2 and T3 with induction off (stage 1).",
    inputs: ["P2", "P4", "T2", "T3", "DT1", "E1"],
    owner: "E&I / instrumentation",
    unproven: "Which of the two paired sensors drifted until compared at zero/ambient reference",
  },
];
