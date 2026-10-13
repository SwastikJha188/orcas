/**
 * The remaining D5 §5 sub-assembly windows for KLN-01 (11 of 15; main motor,
 * gearbox, thrust and shell & refractory are defined in component-health-view).
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
import { SIGNAL_BY_TAG, type SignalDef } from "@/lib/kiln-sim/signals";
import type { SubAssemblySpec } from "./component-health-view";
import type { DiagramPin } from "./kiln-component-diagrams";

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
