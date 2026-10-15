/**
 * The 15 D5 §5 sub-assembly windows for KLN-01: the four core windows (main
 * motor, gearbox, thrust, shell & refractory) and the remaining 11.
 *
 * Details, failure modes and signal schedules follow D5-OSW-PE-KLN Rev. 01
 * Tables 5.1.1–5.4.5 and D4 Tables 5.1c–5.4c. Pin coordinates sit on the
 * matching features of the schematics in kiln-component-diagrams.tsx
 * (720 × 310 drawing plane).
 *
 * Enrichment only: the Health › Components page builds its rows, health,
 * sensors, limits and failure modes from the DB catalog and uses these specs
 * solely for pin geometry, descriptive text and upstream-driver labels.
 */
import { SIGNAL_BY_TAG, describeLimit, limitPair, type SignalDef } from "@/lib/kiln-sim/signals";
import type { DiagramPin } from "./kiln-component-diagrams";

export interface SubAssemblySpec {
  id: string;
  machineTag: string;
  machineName: string;
  name: string;
  shortName: string;
  health: number;
  status: "Normal" | "Advisory" | "Critical";
  criticality: "A" | "Context";
  makeModel: string;
  rating: string;
  speed: string;
  gearRatio: string;
  bearings: string;
  lubrication: string;
  environment: string;
  upstreamDrivers: Array<{ label: string; value: string }>;
  failureModes: Array<{
    mode: string;
    cause: string;
    symptom: string;
    rule: string;
    status: "Clear" | "Alert" | "Active";
  }>;
  pins: DiagramPin[];
  signals: Array<{
    tag: string;
    param: string;
    measured: string;
    model: string;
    residual: string;
    sigma: string;
    unit: string;
    normal: string;
    warning: string;
    alarm: string;
    status: "Normal" | "Advisory" | "Critical";
    valNum: number;
    warnNum: number;
    alarmNum: number;
    /** False when the DB holds no numeric warning / alarm limits for the signal. */
    hasLimits?: boolean;
  }>;
}

/* =========================================================================
   KILN PRIMARY SUB-ASSEMBLIES (Kiln Pyroprocessing Unit KLN-01)
   Static D5 enrichment only: drawing pin geometry, descriptive spec text and
   upstream-driver labels, keyed by DB sub-assembly id. Which components
   exist, their health, sensors, limits and failure modes come from the DB
   catalog (`useMachineCatalog`); the numbers below are never rendered.
   ========================================================================= */
const KILN_CORE_SUB_ASSEMBLIES: SubAssemblySpec[] = [
  // 1. MAIN MOTOR
  {
    id: "main-motor",
    machineTag: "DRV-KLN-01",
    machineName: "Drive Train",
    name: "Main Drive Motor (630 kW VFD Induction)",
    shortName: "Main Motor",
    health: 98,
    status: "Normal",
    criticality: "A",
    makeModel: "IEC 6-Pole Induction Motor IP55 (Siemens Flender)",
    rating: "630 kW, 690 V, VFD-fed Inverter Duty",
    speed: "745–1,120 rpm (Motor) · 3.80 rpm (Kiln)",
    gearRatio: "Direct coupling to gearbox input shaft",
    bearings: "Drive End: NU 228 + 6228 C3 · Non-Drive End: 6228 C3",
    lubrication: "High-temperature synthetic grease (interval 1,500 h)",
    environment: "5–45 °C ambient dust; radiant heat from kiln shell",
    upstreamDrivers: [
      { label: "Kiln Feed Rate", value: "330.0 t/h" },
      { label: "Kiln Operating Speed", value: "3.80 rpm" },
      { label: "Drive Torque Load", value: "62.1%" },
    ],
    failureModes: [
      { mode: "Motor bearing wear", cause: "Fatigue, grease degradation", symptom: "DE vibration × model ↑, bearing temperature ↑", rule: "R-DRV-01", status: "Clear" },
      { mode: "Coupling misalignment", cause: "Thermal growth, foundation settling", symptom: "Vibration ↑ on both coupling sides together", rule: "R-DRV-06", status: "Clear" },
      { mode: "Drive overload / mechanical drag", cause: "Shell rubbing, internal dam friction", symptom: "Torque ↑ with winding and oil following", rule: "R-DRV-08", status: "Clear" },
    ],
    pins: [
      { id: "P1", tag: "TMP-KLN-20", label: "Motor NDE Bearing Temp", value: "60.5", unit: "°C", status: "Normal", x: 216, y: 171, calloutX: 160, calloutY: 140, anchor: "right" },
      { id: "P2", tag: "TMP-KLN-21", label: "Motor Winding Temp", value: "100.0", unit: "°C", status: "Normal", x: 280, y: 152, calloutX: 160, calloutY: 215, anchor: "right" },
      { id: "P3", tag: "ELE-KLN-01", label: "Drive Torque / Current", value: "62.1", unit: "%", status: "Normal", x: 405, y: 52, calloutX: 520, calloutY: 52, anchor: "left" },
      { id: "P4", tag: "VIB-KLN-01", label: "Motor DE Vibration RMS", value: "1.60", unit: "mm/s", status: "Normal", x: 464, y: 151, calloutX: 520, calloutY: 125, anchor: "left" },
      { id: "P5", tag: "TMP-KLN-19", label: "Motor DE Bearing Temp", value: "65.0", unit: "°C", status: "Normal", x: 464, y: 191, calloutX: 520, calloutY: 195, anchor: "left" },
      { id: "P6", tag: "SPD-KLN-01", label: "Kiln Rotational Speed", value: "3.80", unit: "rpm", status: "Normal", x: 535, y: 172, calloutX: 520, calloutY: 265, anchor: "left" },
    ],
    signals: [
      { tag: "VIB-KLN-01", param: "Motor drive-end vibration (RMS)", measured: "1.60 mm/s", model: "1.52 mm/s", residual: "+0.08 mm/s", sigma: "+0.1 σ", unit: "mm/s", normal: "0.5–2.5", warning: "4.5", alarm: "7.1", status: "Normal", valNum: 1.6, warnNum: 4.5, alarmNum: 7.1 },
      { tag: "TMP-KLN-21", param: "Motor stator winding temperature", measured: "100.0 °C", model: "99.4 °C", residual: "+0.6 K", sigma: "+0.7 σ", unit: "°C", normal: "70–110", warning: "130", alarm: "140", status: "Normal", valNum: 100, warnNum: 130, alarmNum: 140 },
      { tag: "ELE-KLN-01", param: "Kiln drive torque / motor current", measured: "62.1 %", model: "62.0 %", residual: "+0.1 %", sigma: "+0.0 σ", unit: "%", normal: "45–75", warning: "90", alarm: "105", status: "Normal", valNum: 62.1, warnNum: 90, alarmNum: 105 },
      { tag: "SPD-KLN-01", param: "Kiln rotational speed", measured: "3.80 rpm", model: "3.80 rpm", residual: "0.00 rpm", sigma: "0.0 σ", unit: "rpm", normal: "3.0–4.5", warning: "< 2.9 / > 4.6", alarm: "< 2.5 / > 4.8", status: "Normal", valNum: 3.8, warnNum: 4.6, alarmNum: 4.8 },
      { tag: "TMP-KLN-19", param: "Motor DE bearing temperature", measured: "65.0 °C", model: "64.8 °C", residual: "+0.2 K", sigma: "+0.3 σ", unit: "°C", normal: "50–75", warning: "85", alarm: "95", status: "Normal", valNum: 65, warnNum: 85, alarmNum: 95 },
      { tag: "TMP-KLN-20", param: "Motor NDE bearing temperature", measured: "60.5 °C", model: "60.2 °C", residual: "+0.3 K", sigma: "+0.3 σ", unit: "°C", normal: "45–70", warning: "85", alarm: "95", status: "Normal", valNum: 60.5, warnNum: 85, alarmNum: 95 },
    ],
  },

  // 2. MAIN GEARBOX
  {
    id: "gearbox",
    machineTag: "DRV-KLN-01",
    machineName: "Drive Train",
    name: "Main Gearbox (3-Stage Helical · 35.5 : 1)",
    shortName: "Main Gearbox",
    health: 97,
    status: "Normal",
    criticality: "A",
    makeModel: "Siemens Flender KMPP 3-Stage Helical Reducer",
    rating: "Nominal power 950 kW; service factor 1.85",
    speed: "Input 944 rpm → Intermediate 152 rpm → Output 26.6 rpm",
    gearRatio: "35.5 : 1 total mechanical reduction",
    bearings: "Heavy-duty spherical roller & cylindrical roller bearings",
    lubrication: "Forced circulating oil ISO VG 320 with thermostatic control",
    environment: "Drive house; enclosed casing; forced oil cooling circuit",
    upstreamDrivers: [
      { label: "Motor Input Speed", value: "944 rpm" },
      { label: "Drive Torque Load", value: "62.1%" },
      { label: "Gearbox Oil Temp", value: "59.8 °C" },
    ],
    failureModes: [
      { mode: "Gearbox bearing wear", cause: "Fatigue, contaminated lube oil", symptom: "Input/output vibration ↑ with bearing temperature", rule: "R-DRV-01", status: "Clear" },
      { mode: "Gear teeth spalling / pitting", cause: "High contact stress, lubricant breakdown", symptom: "Meshing vibration harmonics rise with temperature", rule: "R-DRV-02", status: "Clear" },
      { mode: "Oil cooling loss", cause: "Fouled heat exchanger, water loss", symptom: "Oil temp ↑ at normal torque; pressure dip consistent", rule: "R-DRV-07", status: "Clear" },
    ],
    pins: [
      { id: "P1", tag: "VIB-KLN-02", label: "Gearbox Input Vibration", value: "1.85", unit: "mm/s", status: "Normal", x: 265, y: 160, calloutX: 160, calloutY: 85, anchor: "right" },
      { id: "P2", tag: "TMP-KLN-22", label: "Gearbox Input Bearing Temp", value: "69.9", unit: "°C", status: "Normal", x: 265, y: 195, calloutX: 160, calloutY: 175, anchor: "right" },
      { id: "P3", tag: "VIB-KLN-03", label: "Gearbox Output Vibration", value: "1.51", unit: "mm/s", status: "Normal", x: 430, y: 170, calloutX: 520, calloutY: 95, anchor: "left" },
      { id: "P4", tag: "TMP-KLN-23", label: "Gearbox Output Bearing Temp", value: "67.7", unit: "°C", status: "Normal", x: 430, y: 205, calloutX: 520, calloutY: 185, anchor: "left" },
    ],
    signals: [
      { tag: "VIB-KLN-02", param: "Gearbox input vibration (RMS)", measured: "1.85 mm/s", model: "1.80 mm/s", residual: "+0.05 mm/s", sigma: "+0.1 σ", unit: "mm/s", normal: "0.5–2.5", warning: "4.5", alarm: "7.1", status: "Normal", valNum: 1.85, warnNum: 4.5, alarmNum: 7.1 },
      { tag: "VIB-KLN-03", param: "Gearbox output vibration (RMS)", measured: "1.51 mm/s", model: "1.48 mm/s", residual: "+0.03 mm/s", sigma: "+0.1 σ", unit: "mm/s", normal: "0.5–2.5", warning: "4.5", alarm: "7.1", status: "Normal", valNum: 1.51, warnNum: 4.5, alarmNum: 7.1 },
      { tag: "TMP-KLN-22", param: "Gearbox input bearing temp", measured: "69.9 °C", model: "69.5 °C", residual: "+0.4 K", sigma: "+0.3 σ", unit: "°C", normal: "55–80", warning: "90", alarm: "100", status: "Normal", valNum: 69.9, warnNum: 90, alarmNum: 100 },
      { tag: "TMP-KLN-23", param: "Gearbox output bearing temp", measured: "67.7 °C", model: "67.4 °C", residual: "+0.3 K", sigma: "+0.3 σ", unit: "°C", normal: "55–80", warning: "90", alarm: "100", status: "Normal", valNum: 67.7, warnNum: 90, alarmNum: 100 },
    ],
  },

  // 3. HYDRAULIC THRUST STATION
  {
    id: "thrust",
    machineTag: "SUP-KLN-01",
    machineName: "Support & Thrust",
    name: "Thrust Station (Hydraulic Cylinder & LVDT Float)",
    shortName: "Thrust Station",
    health: 96,
    status: "Normal",
    criticality: "A",
    makeModel: "Hydraulic Thrust Roller with Integrated LVDT Cylinder & HPU",
    rating: "HPU 7.5 kW; normal operating pressure 40–120 bar; ±50 mm stroke",
    speed: "Controlled axial oscillation cycle (4–6 h period for full stroke)",
    gearRatio: "—",
    bearings: "Heavy-duty spherical roller thrust guide bearings",
    lubrication: "Hydraulic fluid ISO VG 46; continuous filtration",
    environment: "Station 2 pier; protected hydraulic cabinet; 3.5% downhill slope",
    upstreamDrivers: [
      { label: "Kiln Feed Rate", value: "330.0 t/h" },
      { label: "Downhill Gravity Component", value: "W·sin(3.5°)" },
      { label: "Hydraulic Pressure", value: "90.0 bar" },
    ],
    failureModes: [
      { mode: "Thrust hydraulic system fault", cause: "HPU pump failure, relief valve stick, oil leak", symptom: "Pressure collapse, downhill drift, limit switch hit", rule: "R-SUP-03", status: "Clear" },
      { mode: "Kiln not floating / near travel limit", cause: "Thrust control logic fault, excessive roller skew", symptom: "LVDT beyond ±22 mm or < 3 mm movement in 6 h", rule: "R-SUP-04", status: "Clear" },
    ],
    pins: [
      { id: "P1", tag: "POS-KLN-01", label: "Kiln Axial Float (LVDT)", value: "-3.1", unit: "mm", status: "Normal", x: 420, y: 135, calloutX: 520, calloutY: 85, anchor: "left" },
      { id: "P2", tag: "PRS-KLN-07", label: "Thrust Hydraulic Pressure", value: "90.0", unit: "bar", status: "Normal", x: 430, y: 205, calloutX: 520, calloutY: 175, anchor: "left" },
      { id: "P3", tag: "POS-KLN-02", label: "Travel Limit Switches", value: "CLEAR", unit: "state", status: "Normal", x: 204, y: 268, calloutX: 160, calloutY: 175, anchor: "right" },
    ],
    signals: [
      { tag: "POS-KLN-01", param: "Kiln axial position (LVDT on cylinder)", measured: "-3.1 mm", model: "-3.0 mm", residual: "-0.1 mm", sigma: "-0.0 σ", unit: "mm", normal: "± 20", warning: "± 30", alarm: "± 40", status: "Normal", valNum: -3.1, warnNum: 30, alarmNum: 40 },
      { tag: "PRS-KLN-07", param: "Thrust hydraulic pressure", measured: "90.0 bar", model: "86.0 bar", residual: "+4.0 bar", sigma: "+0.1 σ", unit: "bar", normal: "40–120", warning: "< 30 / > 150", alarm: "< 20 / > 180", status: "Normal", valNum: 90, warnNum: 150, alarmNum: 180 },
      { tag: "POS-KLN-02", param: "Thrust travel limit switches", measured: "CLEAR", model: "CLEAR", residual: "0", sigma: "0.0 σ", unit: "state", normal: "CLEAR", warning: "—", alarm: "LIMIT", status: "Normal", valNum: 1, warnNum: 0, alarmNum: 0 },
    ],
  },

  // 4. SHELL SCANNER & REFRACTORY
  {
    id: "shell-refractory",
    machineTag: "SHL-KLN-01",
    machineName: "Shell, Refractory & Seals",
    name: "Shell Scanner (Rotary Shell & IR Thermography)",
    shortName: "Shell Scanner",
    health: 98,
    status: "Normal",
    criticality: "A",
    makeModel: "Welded Steel Shell Ø4.8 m × 74 m + 200 mm Alumina/Magnesite Brick",
    rating: "Operating shell surface 250–330 °C; peak hot spot limit 380 °C",
    speed: "3.80 rpm rotational speed",
    gearRatio: "—",
    bearings: "Supported on 3 riding tyres (11 m, 39 m, 60 m)",
    lubrication: "Graphite lubrication bars on tyre bore inner diameters",
    environment: "Shell exterior 200–350 °C; interior combustion zone up to 1,450 °C",
    upstreamDrivers: [
      { label: "Burning Zone Temp", value: "1,448 °C" },
      { label: "Coal Fuel Rate", value: "10.57 t/h" },
      { label: "Kiln Feed Rate", value: "330.0 t/h" },
    ],
    failureModes: [
      { mode: "Refractory loss / casing hot spot", cause: "Thermal spalling, clinker chemical attack", symptom: "Local shell maximum above profile, fast rise", rule: "R-SHL-01", status: "Clear" },
      { mode: "Ring / coating build-up", cause: "Sulfur/alkali recirculation cycles", symptom: "Cold band 29–37 m + torque above model", rule: "R-SHL-02", status: "Clear" },
    ],
    pins: [
      { id: "P1", tag: "CAL-KLN-03", label: "Shell Maximum Temp", value: "327", unit: "°C", status: "Normal", x: 360, y: 220, calloutX: 160, calloutY: 85, anchor: "right" },
      { id: "P2", tag: "STS-KLN-08", label: "Scanner Area Coverage", value: "95.9", unit: "%", status: "Normal", x: 330, y: 27, calloutX: 520, calloutY: 85, anchor: "left" },
    ],
    signals: [
      { tag: "STS-KLN-08", param: "Shell scanner area coverage", measured: "95.9 %", model: "98.0 %", residual: "-2.1 %", sigma: "-0.2 σ", unit: "%", normal: "≥ 95 %", warning: "coverage < 90 %", alarm: "coverage < 80 %", status: "Normal", valNum: 95.9, warnNum: 90, alarmNum: 80 },
      { tag: "CAL-KLN-03", param: "Shell maximum temperature", measured: "327 °C", model: "323 °C", residual: "+4 K", sigma: "+0.4 σ", unit: "°C", normal: "250–330", warning: "380 or > 20 K/h", alarm: "420", status: "Normal", valNum: 327, warnNum: 380, alarmNum: 420 },
    ],
  },
];

type PinSeed = [id: string, tag: string, x: number, y: number, calloutX: number, calloutY: number, anchor: "left" | "right"];

/** D4/D5 warning / alarm text for a signal. */
function limitText(def: SignalDef): { normal: string; warning: string; alarm: string; warnNum: number; alarmNum: number } {
  const l = def.limit;
  if (def.type === "state") {
    return { normal: def.states!.normal, warning: def.states!.warn?.join(" / ") ?? "—", alarm: def.states!.alarm?.join(" / ") ?? "—", warnNum: 1, alarmNum: 0 };
  }
  if (!l) return { normal: def.normalBand, warning: "—", alarm: "—", warnNum: 0, alarmNum: 0 };
  switch (l.kind) {
    case "hi":
      return { normal: def.normalBand, warning: `${l.warn}${def.sub.startsWith("station-") ? " or pair split > 10 K" : ""}`, alarm: `${l.alarm}`, warnNum: l.warn, alarmNum: l.alarm };
    case "lo":
      return { normal: def.normalBand, warning: `< ${l.warn}`, alarm: `< ${l.alarm}`, warnNum: l.warn, alarmNum: l.alarm };
    case "abs":
      return { normal: def.normalBand, warning: `± ${l.warn}`, alarm: `± ${l.alarm}`, warnNum: l.warn, alarmNum: l.alarm };
    case "band": {
      const w = [l.warnLo !== undefined ? `< ${l.warnLo}` : null, l.warnHi !== undefined ? `> ${l.warnHi}` : null].filter(Boolean).join(" / ");
      const a = [l.alarmLo !== undefined ? `< ${l.alarmLo}` : null, l.alarmHi !== undefined ? `> ${l.alarmHi}` : null].filter(Boolean).join(" / ");
      return { normal: def.normalBand, warning: w || "—", alarm: a || "—", warnNum: l.warnHi ?? l.warnLo ?? 0, alarmNum: l.alarmHi ?? l.alarmLo ?? l.warnHi ?? 0 };
    }
    case "setpoint":
      return { normal: def.normalBand, warning: `± ${l.warnPct} % of set-point`, alarm: `± ${l.alarmPct} %`, warnNum: 0, alarmNum: 0 };
    default: {
      // Relative limits (pyro D5 Table 9.2 kinds): the logic in words, values at the design point.
      const d = describeLimit(l, def.unit);
      const p = limitPair(def);
      return { normal: def.normalBand, warning: d.warning, alarm: d.alarm, warnNum: p?.warn ?? 0, alarmNum: p?.alarm ?? 0 };
    }
  }
}

function pins(seeds: PinSeed[]): DiagramPin[] {
  return seeds.map(([id, tag, x, y, calloutX, calloutY, anchor]) => {
    const def = SIGNAL_BY_TAG[tag];
    return { id, tag, label: def.name, value: "—", unit: def.unit, status: "Normal", x, y, calloutX, calloutY, anchor };
  });
}

function signals(tags: string[]): SubAssemblySpec["signals"] {
  return tags.map((tag) => {
    const def = SIGNAL_BY_TAG[tag];
    const lim = limitText(def);
    return {
      tag,
      param: def.name,
      measured: "—",
      model: "—",
      residual: "—",
      sigma: "—",
      unit: def.unit,
      normal: lim.normal,
      warning: lim.warning,
      alarm: lim.alarm,
      status: "Normal",
      valNum: 0,
      warnNum: lim.warnNum,
      alarmNum: lim.alarmNum,
    };
  });
}

const station = (n: 1 | 2 | 3, tags: [string, string, string, string], distance: string): SubAssemblySpec => ({
  id: `station-${n}`,
  machineTag: "SUP-KLN-01",
  machineName: "Support & Thrust",
  name: `Support Station ${n} (${distance} · Tyre ${n} & Rollers)`,
  shortName: `Station ${n}`,
  health: 97,
  status: "Normal",
  criticality: "A",
  makeModel: "OEM to be confirmed; tyre Ø5.6 m; rollers Ø1.6 m",
  rating: n === 2 ? "Carries the thrust roller; HPU 7.5 kW" : "Two support rollers per station",
  speed: "Rollers 10.5–15.8 rpm",
  gearRatio: "—",
  bearings: "Each roller: bearing A (inlet side) / B (outlet side), hydrodynamic",
  lubrication: "Oil bath ISO VG 460; cooling water",
  environment: "40–80 °C near tyres; dust; radiant heat",
  upstreamDrivers: [
    { label: "Kiln Speed", value: "3.80 rpm" },
    { label: "Kiln Feed Rate", value: "330 t/h" },
    { label: "Ambient (estimated)", value: "35.8 °C" },
  ],
  failureModes: [
    { mode: "Roller skew", cause: "Settlement, wrong adjustment", symptom: "Bearing-pair split > 10 K + thrust pressure ↑, slow heating", rule: "R-SUP-01", status: "Clear" },
    { mode: "Bearing lubrication / cooling loss", cause: "Oil bath, cooling water", symptom: "Fast single-bearing heating, thrust normal", rule: "R-SUP-02", status: "Clear" },
    { mode: "Station load shift", cause: "Alignment, foundation", symptom: "All four bearings of the station above model", rule: "R-SUP-05", status: "Clear" },
  ],
  pins: pins([
    ["P1", tags[0], 292, 87, 160, 50, "right"],
    ["P2", tags[2], 292, 257, 160, 285, "right"],
    ["P3", tags[1], 408, 87, 540, 50, "left"],
    ["P4", tags[3], 408, 257, 540, 285, "left"],
  ]),
  signals: signals(tags),
});

export const KILN_EXTRA_SUB_ASSEMBLIES: SubAssemblySpec[] = [
  {
    id: "pinion-gear",
    machineTag: "DRV-KLN-01",
    machineName: "Drive Train",
    name: "Pinion & Girth Gear (24 / 168 T · 7 : 1)",
    shortName: "Pinion & Girth Gear",
    health: 96,
    status: "Normal",
    criticality: "A",
    makeModel: "Open girth gear 168 T, pinion 24 T",
    rating: "Driven by the 630 kW main drive",
    speed: "Pinion 26.6 rpm · kiln 3.0–4.5 rpm",
    gearRatio: "168 / 24 = 7 : 1 · GMF ≈ 10.6 Hz at 3.8 rpm",
    bearings: "Pinion 23156 CC/W33 spherical roller",
    lubrication: "Open-gear spray system",
    environment: "Radiant heat from shell; dust",
    upstreamDrivers: [
      { label: "Kiln Operating Speed", value: "3.80 rpm" },
      { label: "Drive Torque Load", value: "62.1%" },
    ],
    failureModes: [
      { mode: "Pinion / girth-gear mesh damage", cause: "Misalignment, runout, spray failure", symptom: "Pinion vibration ↑ at steady torque", rule: "R-DRV-02", status: "Clear" },
      { mode: "Girth-gear spray failure", cause: "Spray controller, air supply, reservoir", symptom: "Spray status FAULT", rule: "R-DRV-04", status: "Clear" },
    ],
    pins: pins([
      ["P1", "STS-KLN-05", 360, 160, 160, 80, "right"],
      ["P2", "VIB-KLN-04", 421, 215, 540, 150, "left"],
      ["P3", "SPD-KLN-01", 360, 208, 160, 250, "right"],
    ]),
    signals: signals(["STS-KLN-05", "VIB-KLN-04", "SPD-KLN-01"]),
  },
  {
    id: "lubrication",
    machineTag: "DRV-KLN-01",
    machineName: "Drive Train",
    name: "Gearbox Forced Lubrication Skid (800 L)",
    shortName: "Lubrication",
    health: 99,
    status: "Normal",
    criticality: "A",
    makeModel: "Duty / standby pumps, filter, cooler, 800 L tank",
    rating: "Forced oil ISO VG 320",
    speed: "—",
    gearRatio: "—",
    bearings: "—",
    lubrication: "Gearbox forced oil ISO VG 320",
    environment: "Drive house; cooling water circuit",
    upstreamDrivers: [
      { label: "Drive Torque Load", value: "62.1%" },
      { label: "Ambient (estimated)", value: "35.8 °C" },
    ],
    failureModes: [
      { mode: "Gearbox oil supply loss", cause: "Pump, filter, leak, low level", symptom: "Pressure below what oil temperature explains; flow switch", rule: "R-DRV-03", status: "Clear" },
      { mode: "Gearbox oil cooling loss", cause: "Fouled cooler, water loss", symptom: "Oil temperature ↑ at normal torque; pressure dip consistent", rule: "R-DRV-07", status: "Clear" },
    ],
    pins: pins([
      ["P1", "TMP-KLN-15", 370, 185, 160, 60, "right"],
      ["P2", "LEV-KLN-01", 230, 166, 160, 230, "right"],
      ["P3", "FLO-KLN-05", 550, 130, 570, 60, "left"],
      ["P4", "PRS-KLN-04", 530, 185, 570, 245, "left"],
    ]),
    signals: signals(["TMP-KLN-15", "LEV-KLN-01", "FLO-KLN-05", "PRS-KLN-04"]),
  },
  {
    id: "auxiliary-drive",
    machineTag: "DRV-KLN-01",
    machineName: "Drive Train",
    name: "Auxiliary Inching Drive & Overrunning Clutch",
    shortName: "Auxiliary Drive",
    health: 100,
    status: "Normal",
    criticality: "A",
    makeModel: "Small motor, brake, overrunning clutch",
    rating: "Turns the kiln ≈ 0.1 rpm when the main drive is stopped",
    speed: "≈ 0.1 rpm (kiln)",
    gearRatio: "Into main gearbox auxiliary input",
    bearings: "—",
    lubrication: "Shared with main gearbox",
    environment: "Drive house",
    upstreamDrivers: [{ label: "Kiln Operating Speed", value: "3.80 rpm" }],
    failureModes: [
      { mode: "Auxiliary drive unavailable", cause: "Power, clutch, engine", symptom: "Status NOT READY", rule: "R-DRV-05", status: "Clear" },
    ],
    pins: pins([["P1", "STS-KLN-11", 334, 192, 560, 110, "left"]]),
    signals: signals(["STS-KLN-11"]),
  },
  station(1, ["TMP-KLN-01", "TMP-KLN-02", "TMP-KLN-03", "TMP-KLN-04"], "11 m"),
  station(2, ["TMP-KLN-05", "TMP-KLN-06", "TMP-KLN-07", "TMP-KLN-08"], "39 m"),
  station(3, ["TMP-KLN-09", "TMP-KLN-10", "TMP-KLN-11", "TMP-KLN-12"], "60 m"),
  {
    id: "inlet-seal",
    machineTag: "SHL-KLN-01",
    machineName: "Shell, Refractory & Seals",
    name: "Inlet Lamella Seal & Spillage Boundary (0 m)",
    shortName: "Inlet Seal",
    health: 99,
    status: "Normal",
    criticality: "A",
    makeModel: "Lamella-type inlet seal",
    rating: "Monitored indirectly (no hot-zone sensors)",
    speed: "Kiln 3.0–4.5 rpm",
    gearRatio: "—",
    bearings: "—",
    lubrication: "—",
    environment: "Inlet gas 1,000–1,150 °C",
    upstreamDrivers: [
      { label: "Kiln Feed Rate", value: "330 t/h" },
      { label: "Inlet Draft", value: "−3.82 mbar" },
      { label: "Axial Position (LVDT)", value: "−3.1 mm" },
    ],
    failureModes: [
      { mode: "Inlet seal false air", cause: "Lamella / block wear", symptom: "O₂ above model + inlet temperature below model; process steady", rule: "R-SHL-03", status: "Clear" },
      { mode: "Seal overlap low", cause: "Excess axial travel", symptom: "Overlap margin < 10 mm", rule: "R-SHL-05", status: "Clear" },
    ],
    pins: pins([
      ["P1", "GAS-KLN-01", 215, 175, 150, 120, "right"],
      ["P2", "TMP-KLN-13", 215, 215, 150, 245, "right"],
      ["P3", "CAL-KLN-06", 280, 110, 560, 70, "left"],
      ["P4", "CAL-KLN-07", 280, 250, 560, 265, "left"],
    ]),
    signals: signals(["GAS-KLN-01", "TMP-KLN-13", "CAL-KLN-06", "CAL-KLN-07"]),
  },
  {
    id: "outlet-seal",
    machineTag: "SHL-KLN-01",
    machineName: "Shell, Refractory & Seals",
    name: "Outlet Air-Cooled Lamella Seal & Cooling Fan (74 m)",
    shortName: "Outlet Seal",
    health: 98,
    status: "Normal",
    criticality: "A",
    makeModel: "Air-cooled lamella outlet seal",
    rating: "Outlet seal cooling fan",
    speed: "Kiln 3.0–4.5 rpm",
    gearRatio: "—",
    bearings: "—",
    lubrication: "—",
    environment: "Hood radiation; hot dust",
    upstreamDrivers: [
      { label: "Axial Position (LVDT)", value: "−3.1 mm" },
      { label: "Kiln Fuel", value: "10.58 t/h" },
    ],
    failureModes: [
      { mode: "Outlet seal cooling loss / leakage", cause: "Fan stop, plate wear", symptom: "Fan stopped; hood pressure toward positive", rule: "R-SHL-04", status: "Clear" },
      { mode: "Seal overlap low", cause: "Excess axial travel", symptom: "Overlap margin < 10 mm", rule: "R-SHL-05", status: "Clear" },
    ],
    pins: pins([
      ["P1", "CAL-KLN-07", 425, 115, 160, 70, "right"],
      ["P2", "STS-KLN-10", 400, 285, 160, 280, "right"],
      ["P3", "PRS-KLN-03", 505, 75, 570, 60, "left"],
    ]),
    signals: signals(["CAL-KLN-07", "STS-KLN-10", "PRS-KLN-03"]),
  },
  {
    id: "kiln-inlet",
    machineTag: "PRC-KLN-01",
    machineName: "Process Context",
    name: "Kiln Inlet Chamber & Extractive Gas Analyser",
    shortName: "Kiln Inlet",
    health: 99,
    status: "Normal",
    criticality: "Context",
    makeModel: "Extractive gas analyser (O₂, CO), thermocouple, draft tap",
    rating: "—",
    speed: "—",
    gearRatio: "—",
    bearings: "—",
    lubrication: "—",
    environment: "Hot, dusty",
    upstreamDrivers: [
      { label: "Kiln Feed Rate", value: "330 t/h" },
      { label: "Kiln Fuel", value: "10.58 t/h" },
    ],
    failureModes: [
      { mode: "Analyser drift / fault", cause: "Probe, calibration", symptom: "O₂ high without thermal signature; status FAULT", rule: "R-DQ-01 / R-DQ-02", status: "Clear" },
      { mode: "Inlet seal false air", cause: "Lamella / block wear", symptom: "O₂ above model with inlet temperature below model", rule: "R-SHL-03", status: "Clear" },
    ],
    pins: pins([
      ["P1", "STS-KLN-06", 215, 108, 150, 50, "right"],
      ["P2", "GAS-KLN-01", 250, 200, 150, 170, "right"],
      ["P3", "GAS-KLN-02", 250, 235, 150, 270, "right"],
      ["P4", "TMP-KLN-13", 300, 178, 560, 120, "left"],
      ["P5", "PRS-KLN-01", 315, 258, 560, 260, "left"],
    ]),
    signals: signals(["STS-KLN-06", "GAS-KLN-01", "GAS-KLN-02", "TMP-KLN-13", "PRS-KLN-01"]),
  },
  {
    id: "feed-fuel",
    machineTag: "PRC-KLN-01",
    machineName: "Process Context",
    name: "Kiln Feed & Fuel Mass Flow Meters",
    shortName: "Feed & Fuel",
    health: 99,
    status: "Normal",
    criticality: "Context",
    makeModel: "Solid flow meters on kiln feed and kiln coal",
    rating: "0–500 t/h feed · 0–25 t/h fuel",
    speed: "—",
    gearRatio: "—",
    bearings: "—",
    lubrication: "—",
    environment: "Burner platform may be Zone 22 (coal dust)",
    upstreamDrivers: [
      { label: "Kiln Feed Rate", value: "330 t/h" },
      { label: "Kiln Fuel", value: "10.58 t/h" },
    ],
    failureModes: [
      { mode: "Feed / fuel meter error", cause: "Calibration, blockage", symptom: "Meter disagrees with two agreeing witnesses", rule: "R-DQ-02", status: "Clear" },
    ],
    pins: pins([
      ["P1", "FLO-KLN-01", 250, 145, 150, 200, "right"],
      ["P2", "FLO-KLN-02", 480, 160, 580, 100, "left"],
    ]),
    signals: signals(["FLO-KLN-01", "FLO-KLN-02"]),
  },
  {
    id: "burner-hood",
    machineTag: "PRC-KLN-01",
    machineName: "Process Context",
    name: "Firing Hood & Burning-Zone Pyrometer",
    shortName: "Burner & Hood",
    health: 99,
    status: "Normal",
    criticality: "Context",
    makeModel: "Two-colour pyrometer, hood pressure tap, multi-channel burner",
    rating: "—",
    speed: "—",
    gearRatio: "—",
    bearings: "—",
    lubrication: "—",
    environment: "Hood radiation; burner platform",
    upstreamDrivers: [
      { label: "Kiln Fuel", value: "10.58 t/h" },
      { label: "Kiln Feed Rate", value: "330 t/h" },
    ],
    failureModes: [
      { mode: "Outlet seal leakage", cause: "Fan stop, plate wear", symptom: "Hood pressure toward positive", rule: "R-SHL-04", status: "Clear" },
      { mode: "Fuel meter error", cause: "Calibration", symptom: "Burning zone and inlet temperature disagree with meter", rule: "R-DQ-02", status: "Clear" },
    ],
    pins: pins([
      ["P1", "TMP-KLN-14", 460, 40, 300, 40, "right"],
      ["P2", "PRS-KLN-03", 490, 135, 570, 135, "left"],
    ]),
    signals: signals(["TMP-KLN-14", "PRS-KLN-03"]),
  },
];

/** All 15 D5 sub-assembly windows, in D5 §5 order. */
const KILN_WINDOW_ORDER = [
  "main-motor", "gearbox", "pinion-gear", "lubrication", "auxiliary-drive",
  "station-1", "station-2", "station-3", "thrust",
  "shell-refractory", "inlet-seal", "outlet-seal",
  "kiln-inlet", "feed-fuel", "burner-hood",
];
export const KILN_SUB_ASSEMBLIES: SubAssemblySpec[] = [...KILN_CORE_SUB_ASSEMBLIES, ...KILN_EXTRA_SUB_ASSEMBLIES].sort(
  (a, b) => KILN_WINDOW_ORDER.indexOf(a.id) - KILN_WINDOW_ORDER.indexOf(b.id),
);
