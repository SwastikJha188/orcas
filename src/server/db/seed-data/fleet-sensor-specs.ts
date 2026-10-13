/**
 * Limits, sub-assembly mapping, acquisition mapping and failure modes for the
 * non-kiln demonstration machines (KLN-01 has its own catalog from D4/D5).
 *
 * Vibration limits follow ISO 20816-3 zone boundaries (Group 1 > 300 kW:
 * B/C 4.5, C/D 7.1 mm/s; Group 2 15–300 kW: 2.8 / 4.5 mm/s). Temperature,
 * pressure, flow and displacement limits are typical OEM / plant practice.
 * Like D4 §values, these are demo values: final limits come from OEM data and
 * a two-week baseline. A warning above the alarm means a low limit.
 */

export interface FleetReason {
  ruleId: string;
  ruleName: string;
  primaryCause: string;
  mechanism: string;
  symptomSignature: string;
  consequence: string;
  crossCheckSensors: string[];
  prescriptiveAction: string;
}

export interface FleetSensorSpec {
  machineId: string;
  tag: string;
  /** machine_systems / machine_subassemblies id (P1…P5) the sensor sits on. */
  part: string;
  unit?: string;
  instrument: string;
  range: string;
  normalBand: string;
  warning: number;
  alarm: number;
  warningText: string;
  alarmText: string;
  standard: string;
  sampleRate: string;
  card: "vib" | "rtd" | "ai";
  reasons: FleetReason[];
}

/** Edge cabinet per machine; SAG-01 and CRUSH-01 have rack_chassis records. */
export const FLEET_RACKS: Record<string, string> = {
  "AGIT-01": "ULTRON-EDGE-AGIT01",
  "BALL-02": "ULTRON-EDGE-BALL02",
  "BALL-03": "ULTRON-EDGE-BALL03",
  "BLOW-03": "ULTRON-EDGE-BLOW03",
  "CONV-04": "ULTRON-EDGE-CONV04",
  "CRUSH-01": "ULTRON-RACK-C1",
  "HP-PUMP-01": "ULTRON-EDGE-HPPUMP01",
  "PMP-101": "ULTRON-EDGE-PMP101",
  "PUMP-104": "ULTRON-EDGE-PUMP104",
  "SAG-01": "ULTRON-RACK-G4",
};

export const FLEET_CARDS = {
  vib: { card: "Slot 2 (IEPE-8)", base: 40011, sensorType: "IEPE Accelerometer (100 mV/g)" },
  ai: { card: "Slot 3 (AI-8)", base: 40201, sensorType: "4–20 mA Transmitter (HART)" },
  rtd: { card: "Slot 4 (RTD-8)", base: 40101, sensorType: "Pt100 RTD (Class A 3-Wire)" },
} as const;

const VIB_RATE = "25.6 kS/s waveform; RMS / envelope 1 min";
const RTD_RATE = "10 s (PLC / DCS · OPC UA)";
const AI_RATE = "1 s Continuous";

const vib = (o: { machineId: string; tag: string; part: string; group1: boolean; normal: string; reasons: FleetReason[]; warning?: number; alarm?: number; standard?: string }): FleetSensorSpec => {
  const warning = o.warning ?? (o.group1 ? 4.5 : 2.8);
  const alarm = o.alarm ?? (o.group1 ? 7.1 : 4.5);
  return {
    machineId: o.machineId,
    tag: o.tag,
    part: o.part,
    instrument: "IEPE Accelerometer (100 mV/g)",
    range: "0–50 mm/s",
    normalBand: o.normal,
    warning,
    alarm,
    warningText: `${warning} mm/s (Alert)`,
    alarmText: `${alarm} mm/s (Trip Alarm)`,
    standard: o.standard ?? `ISO 20816-3 Group ${o.group1 ? 1 : 2}`,
    sampleRate: VIB_RATE,
    card: "vib",
    reasons: o.reasons,
  };
};

const rtd = (o: { machineId: string; tag: string; part: string; normal: string; warning: number; alarm: number; reasons: FleetReason[]; range?: string }): FleetSensorSpec => ({
  machineId: o.machineId,
  tag: o.tag,
  part: o.part,
  instrument: "Pt100 RTD (Class A 3-Wire)",
  range: o.range ?? "0–150 °C",
  normalBand: o.normal,
  warning: o.warning,
  alarm: o.alarm,
  warningText: `${o.warning} °C (Warning)`,
  alarmText: `${o.alarm} °C (Trip Alarm)`,
  standard: "OEM / Plant Limit",
  sampleRate: RTD_RATE,
  card: "rtd",
  reasons: o.reasons,
});

const ai = (o: { machineId: string; tag: string; part: string; unit: string; instrument: string; range: string; normal: string; warning: number; alarm: number; reasons: FleetReason[]; setUnit?: boolean; standard?: string }): FleetSensorSpec => {
  const low = o.warning > o.alarm;
  return {
    machineId: o.machineId,
    tag: o.tag,
    part: o.part,
    unit: o.setUnit ? o.unit : undefined,
    instrument: o.instrument,
    range: o.range,
    normalBand: o.normal,
    warning: o.warning,
    alarm: o.alarm,
    warningText: `${low ? "< " : ""}${o.warning} ${o.unit} (${low ? "Low " : ""}Warning)`,
    alarmText: `${low ? "< " : ""}${o.alarm} ${o.unit} (${low ? "Low " : ""}Trip Alarm)`,
    standard: o.standard ?? "OEM / Plant Limit",
    sampleRate: AI_RATE,
    card: "ai",
    reasons: o.reasons,
  };
};

const r = (
  ruleId: string,
  ruleName: string,
  primaryCause: string,
  mechanism: string,
  symptomSignature: string,
  consequence: string,
  crossCheckSensors: string[],
  prescriptiveAction: string,
): FleetReason => ({ ruleId, ruleName, primaryCause, mechanism, symptomSignature, consequence, crossCheckSensors, prescriptiveAction });

export const FLEET_SENSOR_SPECS: FleetSensorSpec[] = [
  // ------------------------------------------------------------------ AGIT-01
  vib({
    machineId: "AGIT-01", tag: "GEAR-HS-VIB", part: "P2", group1: false, normal: "0.8 – 2.2 mm/s",
    reasons: [r("R-AGIT-01", "Gearbox HS Stage Wear", "High-speed pinion tooth wear or bearing fatigue", "Gear-mesh and bearing defect frequencies raise overall RMS on the input stage.", "RMS above 2.8 mm/s with rising gear-mesh sidebands.", "Agitator stop lets solids settle; restart under load risks shaft damage.", ["SHAFT-RUNOUT"], "Take an FFT at the input bearing, check oil condition and plan pinion inspection at next stop.")],
  }),
  rtd({
    machineId: "AGIT-01", tag: "SEAL-TEMP", part: "P3", normal: "55 – 75 °C", warning: 80, alarm: 90,
    reasons: [r("R-AGIT-02", "Mechanical Seal Overheating", "Loss of barrier-fluid circulation or seal-face distress", "Friction heat at the seal faces is no longer carried away by the barrier fluid.", "Barrier-fluid temperature above 80 °C, rising with constant load.", "Seal leakage of process slurry; vessel must be emptied for seal change.", ["SHAFT-RUNOUT"], "Check barrier pot level and pressure, thermosiphon flow and cooler; inspect seal faces if trend persists.")],
  }),
  ai({
    machineId: "AGIT-01", tag: "SHAFT-RUNOUT", part: "P3", unit: "mm", instrument: "Eddy-Current Proximity Probe (8 mm)", range: "0–2 mm", normal: "0.10 – 0.35 mm", warning: 0.4, alarm: 0.6,
    reasons: [r("R-AGIT-03", "Shaft Deflection / Runout", "Impeller imbalance from build-up or a bent shaft", "Hydraulic or mass imbalance deflects the overhung shaft at the seal.", "Runout above 0.4 mm with 1× running-speed dominance.", "Seal and gearbox bearing overload; shaft fatigue cracking.", ["GEAR-HS-VIB", "SEAL-TEMP"], "Inspect impeller for build-up or blade loss; check shaft straightness at next stop.")],
  }),

  // ------------------------------------------------------------------ BALL-02
  ai({
    machineId: "BALL-02", tag: "GIRTH-ACOUSTIC", part: "P4", unit: "dB", instrument: "Acoustic Emission Microphone (Class 1)", range: "40–120 dB", normal: "75 – 84 dB", warning: 85, alarm: 95,
    reasons: [r("R-BALL02-01", "Girth Gear Mesh Distress", "Insufficient girth-gear lubrication or pinion misalignment", "Poor mesh contact raises impact noise at gear-mesh frequency.", "Mesh acoustic level above 85 dB with pinion sideband growth.", "Accelerated tooth pitting; girth gear replacement is a long outage.", ["PINION-ACC-RMS"], "Check spray lubrication pattern and quantity; verify pinion alignment by thermography.")],
  }),
  vib({
    machineId: "BALL-02", tag: "PINION-ACC-RMS", part: "P2", group1: true, warning: 3.5, alarm: 5.6, standard: "OEM Pinion Limit (ISO 20816-3 basis)", normal: "1.5 – 3.0 mm/s",
    reasons: [r("R-BALL02-02", "Pinion DE Bearing Outer-Race Defect", "Outer-race spalling on the pinion drive-end bearing", "Rolling elements striking a raceway defect generate BPFO and sidebands.", "BPFO harmonics with RMS above 3.5 mm/s.", "Bearing seizure stops the mill; pinion damage if run to failure.", ["GIRTH-ACOUSTIC", "VIB-RMS-DE"], "Confirm BPFO with envelope analysis; plan bearing change at the next planned stop.")],
  }),
  rtd({
    machineId: "BALL-02", tag: "TRUNNION-TEMP-01", part: "P3", normal: "55 – 72 °C", warning: 75, alarm: 85,
    reasons: [r("R-BALL02-03", "Feed Trunnion Bearing Overheating", "Lube-oil film breakdown or high slurry temperature at the feed end", "Hydrodynamic film thins, babbitt friction rises.", "Feed trunnion above 75 °C, rising faster than discharge trunnion.", "Babbitt wipe forces a long stop and re-metalling.", ["TRUNNION-TEMP-02"], "Check HP lift and LP lube pressures, oil cooler and feed slurry temperature.")],
  }),
  rtd({
    machineId: "BALL-02", tag: "TRUNNION-TEMP-02", part: "P5", normal: "55 – 72 °C", warning: 75, alarm: 85,
    reasons: [r("R-BALL02-04", "Discharge Trunnion Bearing Overheating", "Lube-oil film breakdown at the discharge end", "Hydrodynamic film thins, babbitt friction rises.", "Discharge trunnion above 75 °C.", "Babbitt wipe forces a long stop and re-metalling.", ["TRUNNION-TEMP-01"], "Check lube pressures, oil cooler and discharge trommel spillage.")],
  }),
  vib({
    machineId: "BALL-02", tag: "VIB-RMS-DE", part: "P1", group1: true, normal: "1.0 – 3.0 mm/s",
    reasons: [r("R-BALL02-05", "Motor Bearing / Unbalance", "Motor DE bearing wear or rotor unbalance", "Rotor forces raise 1× and bearing defect frequencies.", "Motor DE RMS above 4.5 mm/s.", "Motor trip on vibration; mill stop.", ["PINION-ACC-RMS"], "Trend 1× amplitude and phase; inspect coupling and bearing.")],
  }),

  // ------------------------------------------------------------------ BALL-03
  vib({
    machineId: "BALL-03", tag: "PINION-ACC-RMS", part: "P2", group1: true, warning: 3.5, alarm: 5.6, standard: "OEM Pinion Limit (ISO 20816-3 basis)", normal: "1.5 – 3.0 mm/s",
    reasons: [r("R-BALL03-01", "Pinion Gearbox Bearing Defect", "Pinion bearing raceway fatigue", "Defect impacts generate bearing tones and sidebands.", "RMS above 3.5 mm/s with bearing tones.", "Bearing seizure stops the mill.", ["VIB-RMS-DE"], "Confirm with envelope analysis; plan bearing change.")],
  }),
  ai({
    machineId: "BALL-03", tag: "SHELL-DISP", part: "P4", unit: "mm", instrument: "Laser Displacement Sensor", range: "0–5 mm", normal: "0.05 – 0.25 mm", warning: 0.3, alarm: 0.5,
    reasons: [r("R-BALL03-02", "Shell Deflection / Liner Bolt Loss", "Loose liner bolts or shell ovality", "Uneven liner support changes shell deflection per revolution.", "Shell displacement above 0.3 mm once per revolution.", "Shell cracking and slurry leakage.", ["PINION-ACC-RMS"], "Inspect liner bolts and shell for leaks; survey shell ovality.")],
  }),
  rtd({
    machineId: "BALL-03", tag: "TRUNNION-TEMP-01", part: "P3", normal: "55 – 72 °C", warning: 75, alarm: 85,
    reasons: [r("R-BALL03-03", "Feed Trunnion Bearing Overheating", "Lube-oil film breakdown at the feed end", "Hydrodynamic film thins, babbitt friction rises.", "Feed trunnion above 75 °C.", "Babbitt wipe forces a long stop.", ["TRUNNION-TEMP-02"], "Check HP lift and LP lube pressures and oil cooler.")],
  }),
  rtd({
    machineId: "BALL-03", tag: "TRUNNION-TEMP-02", part: "P5", normal: "55 – 72 °C", warning: 75, alarm: 85,
    reasons: [r("R-BALL03-04", "Discharge Trunnion Bearing Overheating", "Lube-oil film breakdown at the discharge end", "Hydrodynamic film thins, babbitt friction rises.", "Discharge trunnion above 75 °C.", "Babbitt wipe forces a long stop.", ["TRUNNION-TEMP-01"], "Check lube pressures and oil cooler.")],
  }),
  vib({
    machineId: "BALL-03", tag: "VIB-RMS-DE", part: "P1", group1: true, normal: "1.0 – 3.0 mm/s",
    reasons: [r("R-BALL03-05", "Motor Bearing / Unbalance", "Motor DE bearing wear or rotor unbalance", "Rotor forces raise 1× and bearing defect frequencies.", "Motor DE RMS above 4.5 mm/s.", "Motor trip on vibration; mill stop.", ["PINION-ACC-RMS"], "Trend 1× amplitude and phase; inspect coupling and bearing.")],
  }),

  // ------------------------------------------------------------------ BLOW-03
  rtd({
    machineId: "BLOW-03", tag: "AIR-TEMP-DISCH", part: "P3", range: "0–200 °C", normal: "60 – 90 °C", warning: 95, alarm: 110,
    reasons: [r("R-BLOW-01", "Discharge Overheating / Surge", "Operation near surge or blocked discharge", "Recirculation raises gas temperature at the discharge.", "Discharge air above 95 °C with falling flow.", "Impeller and casing overheating; surge damage.", ["COUPLING-VIB"], "Check discharge valve position, anti-surge control and inlet filter.")],
  }),
  rtd({
    machineId: "BLOW-03", tag: "BEAR-TEMP-IB", part: "P2", normal: "40 – 75 °C", warning: 90, alarm: 105,
    reasons: [r("R-BLOW-02", "Thrust Bearing Overheating", "Lube-oil degradation or excessive axial load", "Pad temperature rises as the oil film thins under thrust.", "Inboard pad temperature above 90 °C.", "Pad wipe and rotor rub.", ["COUPLING-VIB"], "Check lube oil temperature, pressure and filter; review operating point.")],
  }),
  vib({
    machineId: "BLOW-03", tag: "COUPLING-VIB", part: "P2", group1: true, normal: "0.5 – 2.0 mm/s",
    reasons: [r("R-BLOW-03", "Coupling Misalignment", "Thermal growth or foundation settlement misaligning the disc coupling", "Misalignment raises 2× running-speed vibration.", "Coupling RMS above 4.5 mm/s with 2× dominance.", "Disc-pack fatigue and bearing overload.", ["MOTOR-DE-VIB", "BEAR-TEMP-IB"], "Hot-alignment check; inspect disc pack.")],
  }),
  vib({
    machineId: "BLOW-03", tag: "MOTOR-DE-VIB", part: "P1", group1: true, normal: "0.5 – 2.0 mm/s",
    reasons: [r("R-BLOW-04", "Motor Bearing / Unbalance", "Motor DE bearing wear or rotor unbalance", "Rotor forces raise 1× and bearing defect frequencies.", "Motor DE RMS above 4.5 mm/s.", "Motor trip on vibration.", ["COUPLING-VIB"], "Trend 1× amplitude and phase; inspect bearing.")],
  }),

  // ------------------------------------------------------------------ CONV-04
  ai({
    machineId: "CONV-04", tag: "BELT-RIP-STATUS", part: "P3", unit: "%", setUnit: true, instrument: "Steel-Cord Belt Scanner (magnetic)", range: "0–100 %", normal: "≥ 98 %", warning: 95, alarm: 90,
    reasons: [r("R-CONV-01", "Belt Splice / Cord Damage", "Splice degradation or longitudinal rip", "Broken or displaced steel cords reduce the scanner's signal integrity.", "Belt integrity below 95 % at a repeating splice position.", "Belt rip stops the overland conveyor for days.", ["PULLEY-DE-VIB"], "Inspect the flagged splice; check chutes and skirts for tramp material.")],
  }),
  rtd({
    machineId: "CONV-04", tag: "GEARBOX-OIL-TEMP", part: "P2", normal: "45 – 70 °C", warning: 80, alarm: 90,
    reasons: [r("R-CONV-02", "Reducer Oil Overheating", "Overload, low oil level or fouled cooler", "Friction losses exceed cooling capacity.", "Oil temperature above 80 °C.", "Oil oxidation and gear scuffing.", ["PULLEY-DE-VIB"], "Check oil level, cooler and belt load.")],
  }),
  vib({
    machineId: "CONV-04", tag: "PULLEY-DE-VIB", part: "P2", group1: true, normal: "0.8 – 2.5 mm/s",
    reasons: [r("R-CONV-03", "Head Pulley Bearing Defect", "Pulley bearing wear or lagging damage", "Bearing defects and lagging loss raise RMS at the drive end.", "Pulley DE RMS above 4.5 mm/s.", "Pulley bearing failure stops the conveyor.", ["GEARBOX-OIL-TEMP"], "Envelope analysis on the pulley bearing; inspect lagging.")],
  }),

  // ------------------------------------------------------------------ CRUSH-01
  vib({
    machineId: "CRUSH-01", tag: "COUNTERSHAFT-VIB", part: "P3", group1: true, normal: "1.0 – 3.0 mm/s",
    reasons: [r("R-CRUSH-01", "Countershaft Bearing / Gear Defect", "Countershaft bearing wear or bevel pinion damage", "Bearing and bevel-mesh frequencies raise RMS.", "Countershaft RMS above 4.5 mm/s.", "Bevel gear damage; crusher stop.", ["MOTOR-AMP"], "FFT for bevel-mesh sidebands; check backlash and lubrication.")],
  }),
  ai({
    machineId: "CRUSH-01", tag: "ECC-HYD-PRESS", part: "P4", unit: "bar", instrument: "Pressure Transmitter (4–20 mA / HART)", range: "0–300 bar", normal: "140 – 185 bar", warning: 200, alarm: 230,
    reasons: [r("R-CRUSH-02", "Hydroset Overpressure / Tramp", "Tramp metal or packing in the crushing cavity", "Crushing force rises, raising Hydroset support pressure.", "Pressure spikes above 200 bar.", "Main shaft and spider overload.", ["MOTOR-AMP", "SHAFT-THRUST"], "Check feed for tramp metal; review CSS setting and feed gradation.")],
  }),
  ai({
    machineId: "CRUSH-01", tag: "MOTOR-AMP", part: "P3", unit: "A", instrument: "Current Transducer (MCC)", range: "0–150 A", normal: "60 – 90 A", warning: 95, alarm: 105,
    reasons: [r("R-CRUSH-03", "Drive Overload", "Choke feeding or hard ore", "Crushing power draw exceeds motor rating.", "Current above 95 A sustained.", "Motor thermal trip; crusher stop under load.", ["ECC-HYD-PRESS"], "Reduce feed rate; check CSS and liner wear.")],
  }),
  ai({
    machineId: "CRUSH-01", tag: "SHAFT-THRUST", part: "P2", unit: "mm", instrument: "Eddy-Current Proximity Probe (8 mm)", range: "0–2 mm", normal: "0.20 – 0.50 mm", warning: 0.6, alarm: 0.8,
    reasons: [r("R-CRUSH-04", "Main Shaft Step Bearing Wear", "Step bearing wear or loss of Hydroset support", "Main shaft drops axially as the step bearing wears.", "Axial position above 0.6 mm.", "Mantle/concave contact and shaft damage.", ["ECC-HYD-PRESS"], "Measure step bearing wear; check Hydroset oil level.")],
  }),
  ai({
    machineId: "CRUSH-01", tag: "SPIDER-LUBE-FLOW", part: "P1", unit: "L/min", instrument: "Flow Transmitter (4–20 mA)", range: "0–40 L/min", normal: "16 – 22 L/min", warning: 15, alarm: 12,
    reasons: [r("R-CRUSH-05", "Spider Bushing Lube Starvation", "Blocked line or low reservoir", "Reduced flow lets the spider bushing run dry.", "Lube flow below 15 L/min.", "Spider bushing seizure.", ["SHAFT-THRUST"], "Check lube reservoir, pump and line for blockage.")],
  }),

  // ---------------------------------------------------------------- HP-PUMP-01
  vib({
    machineId: "HP-PUMP-01", tag: "CRANK-VIB-RMS", part: "P2", group1: true, normal: "0.8 – 2.5 mm/s",
    reasons: [r("R-HPP-01", "Crankshaft Bearing Wear", "Crank or crosshead bearing wear", "Clearance growth raises impacts at plunger frequency.", "Crank RMS above 4.5 mm/s.", "Connecting rod damage.", ["INJECT-PRESS"], "Check bearing clearances and lube oil condition.")],
  }),
  ai({
    machineId: "HP-PUMP-01", tag: "DIAPH-DISP", part: "P3", unit: "mm", instrument: "Diaphragm Position Transmitter (inductive)", range: "0–30 mm", normal: "15 – 20 mm", warning: 22, alarm: 25,
    reasons: [r("R-HPP-02", "Diaphragm Over-Stroke", "Propelling-fluid imbalance or check-valve leakage", "Excess fill drives the diaphragm beyond its normal stroke.", "Displacement above 22 mm.", "Diaphragm rupture; slurry in the propelling fluid.", ["INJECT-PRESS"], "Check propelling-fluid fill/drain valves and check valves.")],
  }),
  ai({
    machineId: "HP-PUMP-01", tag: "INJECT-PRESS", part: "P3", unit: "bar", instrument: "Pressure Transmitter (4–20 mA / HART)", range: "0–100 bar", normal: "44 – 50 bar", warning: 52, alarm: 55,
    reasons: [r("R-HPP-03", "Discharge Overpressure", "Blocked autoclave inlet or closed discharge valve", "Line resistance rises against the positive-displacement pump.", "Injection pressure above 52 bar.", "Relief valve lift; pipe and diaphragm overload.", ["DIAPH-DISP"], "Check discharge valves and autoclave inlet for scale.")],
  }),

  // ------------------------------------------------------------------ PMP-101
  ai({
    machineId: "PMP-101", tag: "ELE-PMP-01", part: "P1", unit: "A", instrument: "Current Transducer (MCC)", range: "0–30 A", normal: "14 – 16.5 A", warning: 16.5, alarm: 18.5,
    reasons: [r("R-PMP-01", "Motor Overload", "Rising hydraulic load from impeller wear or bearing drag", "Mechanical drag raises current at constant speed.", "Current above 16.5 A (≈ 110 % FLA).", "Motor thermal trip.", ["TMP-PMP-01", "FLO-PMP-01"], "Check bearing condition and pump operating point.")],
  }),
  ai({
    machineId: "PMP-101", tag: "FLO-PMP-01", part: "P4", unit: "m³/h", instrument: "Electromagnetic Flowmeter", range: "0–150 m³/h", normal: "85 – 110 m³/h", warning: 75, alarm: 60,
    reasons: [r("R-PMP-02", "Low Flow / Filtration Blockage", "Strainer or filter blockage, impeller wear", "Rising system resistance moves the pump to low flow.", "Flow below 75 m³/h.", "Low-flow recirculation and cavitation damage.", ["PRS-PMP-01"], "Clean strainers/filters; check impeller clearance.")],
  }),
  ai({
    machineId: "PMP-101", tag: "PRS-PMP-01", part: "P4", unit: "bar", instrument: "Pressure Transmitter (4–20 mA / HART)", range: "0–10 bar", normal: "5.0 – 6.0 bar", warning: 4.5, alarm: 3.8,
    reasons: [r("R-PMP-03", "Low Discharge Pressure", "Impeller wear or suction starvation", "Head falls as clearances open or NPSH drops.", "Discharge pressure below 4.5 bar.", "Loss of circulation to users.", ["FLO-PMP-01"], "Check suction level and impeller wear-ring clearance.")],
  }),
  ai({
    machineId: "PMP-101", tag: "SPD-PMP-01", part: "P1", unit: "RPM", instrument: "Speed Sensor (VFD data point)", range: "0–1800 RPM", normal: "1440 – 1460 RPM", warning: 1480, alarm: 1520,
    reasons: [r("R-PMP-04", "Overspeed", "VFD set-point or control fault", "Speed above design raises head and power.", "Speed above 1480 RPM.", "Motor and pump overload.", ["ELE-PMP-01"], "Check VFD set-point and speed feedback.")],
  }),
  rtd({
    machineId: "PMP-101", tag: "TMP-PMP-01", part: "P2", normal: "50 – 68 °C", warning: 70, alarm: 80,
    reasons: [r("R-PMP-05", "Bearing B-101 Overheating", "Grease degradation or bearing raceway wear", "Friction heat rises as lubrication fails.", "Bearing temperature above 70 °C with rising vibration.", "Bearing seizure stops the pump.", ["VIB-PMP-01"], "Re-grease per schedule; confirm defect by envelope analysis.")],
  }),
  vib({
    machineId: "PMP-101", tag: "VIB-PMP-01", part: "P2", group1: false, normal: "1.0 – 2.5 mm/s",
    reasons: [r("R-PMP-06", "Bearing B-101 Defect", "Outer-race fatigue on the drive-end bearing", "Rolling-element impacts raise RMS and BPFO harmonics.", "RMS above 2.8 mm/s (ISO 20816-3 Group 2 zone C).", "Bearing failure and shaft damage.", ["TMP-PMP-01"], "Envelope FFT for BPFO; plan bearing replacement.")],
  }),

  // ----------------------------------------------------------------- PUMP-104
  ai({
    machineId: "PUMP-104", tag: "DISCH-PRESS", part: "P3", unit: "bar", instrument: "Pressure Transmitter (diaphragm seal)", range: "0–10 bar", normal: "0 – 6.0 bar", warning: 6.5, alarm: 7.5,
    reasons: [r("R-PUMP104-01", "Discharge Line Blockage", "Sanding up of the discharge line", "Settled solids raise line resistance.", "Discharge pressure above 6.5 bar.", "Line blockage and pump overload.", ["GLAND-WATER-PRESS"], "Flush the discharge line; check slurry density.")],
  }),
  ai({
    machineId: "PUMP-104", tag: "GLAND-WATER-PRESS", part: "P3", unit: "bar", instrument: "Pressure Transmitter (4–20 mA)", range: "0–10 bar", normal: "4.5 – 5.5 bar", warning: 4.0, alarm: 3.5,
    reasons: [r("R-PUMP104-02", "Gland Water Loss", "Gland water supply failure", "Gland pressure falls below casing pressure, letting slurry into the packing.", "Gland water pressure below 4.0 bar.", "Packing and shaft sleeve wear.", ["DISCH-PRESS"], "Check gland water supply, valves and filter.")],
  }),
  rtd({
    machineId: "PUMP-104", tag: "MOTOR-DE-TEMP", part: "P1", normal: "20 – 75 °C", warning: 85, alarm: 95,
    reasons: [r("R-PUMP104-03", "Motor DE Bearing Overheating", "Bearing lubrication failure", "Friction heat rises as lubrication fails.", "Motor DE bearing above 85 °C.", "Bearing seizure.", ["PUMP-BEAR-VIB"], "Re-grease and check bearing condition.")],
  }),
  vib({
    machineId: "PUMP-104", tag: "PUMP-BEAR-VIB", part: "P2", group1: true, normal: "0 – 3.0 mm/s",
    reasons: [r("R-PUMP104-04", "Pump Bearing Defect", "Bearing wear or impeller imbalance from uneven wear", "Bearing defect frequencies and 1× raise RMS.", "Pump bearing RMS above 4.5 mm/s.", "Bearing failure and shaft damage.", ["MOTOR-DE-TEMP"], "Envelope analysis; inspect impeller wear.")],
  }),

  // ------------------------------------------------------------------- SAG-01
  ai({
    machineId: "SAG-01", tag: "AXIAL-THRUST-MM", part: "P4", unit: "mm", instrument: "Eddy-Current Proximity Probe (8 mm)", range: "0–2 mm", normal: "0.10 – 0.30 mm", warning: 0.35, alarm: 0.5,
    reasons: [r("R-SAG-01", "Drum Displacement / Liner Loss", "Liner bolt loss or trunnion wear", "Uneven support changes drum displacement per revolution.", "Displacement above 0.35 mm.", "Shell cracking and trunnion damage.", ["TRUNNION-TEMP-01", "TRUNNION-TEMP-02"], "Inspect liner bolts; check trunnion clearances.")],
  }),
  vib({
    machineId: "SAG-01", tag: "PINION-ACC-RMS", part: "P2", group1: true, warning: 3.5, alarm: 5.6, standard: "OEM Pinion Limit (ISO 20816-3 basis)", normal: "1.5 – 3.0 mm/s",
    reasons: [r("R-SAG-02", "Pinion Gear Mesh Distress", "Pinion misalignment or lubrication shortfall", "Poor mesh contact raises gear-mesh frequency and sidebands.", "Pinion RMS above 3.5 mm/s with sideband growth.", "Tooth pitting; pinion and girth gear damage.", ["VIB-RMS-DE"], "Check spray lubrication and pinion alignment by thermography.")],
  }),
  rtd({
    machineId: "SAG-01", tag: "TRUNNION-TEMP-01", part: "P3", normal: "55 – 72 °C", warning: 75, alarm: 85,
    reasons: [r("R-SAG-03", "Feed Trunnion Bearing Overheating", "Lube-oil film breakdown at the feed end", "Hydrodynamic film thins, babbitt friction rises.", "Feed trunnion above 75 °C.", "Babbitt wipe forces a long stop.", ["TRUNNION-TEMP-02"], "Check HP lift and LP lube pressures and oil cooler.")],
  }),
  rtd({
    machineId: "SAG-01", tag: "TRUNNION-TEMP-02", part: "P5", normal: "55 – 72 °C", warning: 75, alarm: 85,
    reasons: [r("R-SAG-04", "Discharge Trunnion Bearing Overheating", "Lube-oil film breakdown at the discharge end", "Hydrodynamic film thins, babbitt friction rises.", "Discharge trunnion above 75 °C.", "Babbitt wipe forces a long stop.", ["TRUNNION-TEMP-01"], "Check lube pressures and oil cooler.")],
  }),
  vib({
    machineId: "SAG-01", tag: "VIB-RMS-DE", part: "P1", group1: true, normal: "1.0 – 3.0 mm/s",
    reasons: [r("R-SAG-05", "Motor Bearing / Unbalance", "Motor DE bearing wear or rotor unbalance", "Rotor forces raise 1× and bearing defect frequencies.", "Motor DE RMS above 4.5 mm/s.", "Motor trip on vibration; mill stop.", ["PINION-ACC-RMS"], "Trend 1× amplitude and phase; inspect coupling and bearing.")],
  }),
];
