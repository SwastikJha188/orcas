/**
 * Equipment run states of the pyro line (D5 Table 9.4.1 "motor run states";
 * Phase 2 contract §1).
 *
 * Every drive / blower / fan / pump the D5 machine tables name has a run
 * state: "run", "stopped" (by the operator or an interlock) or "tripped"
 * (protection trip). The engine resolves the states every minute from the
 * scenario equipment effects and the line interlocks (duty / standby
 * change-over, aux drive on main-drive loss, feed and fuel cut on a line
 * stop) and uses them as reference-model drivers: a stopped unit's current,
 * speed and vibration are ≈ 0 and its bearings cool to ambient, in the plant
 * and in the model alike, so a stopped unit is neither a machine fault nor a
 * sensor fault. Pure data, no state.
 */

export const EQUIPMENT_IDS = [
  "fsl-blower-duty",
  "fsl-blower-standby",
  "fsl-gate",
  "kfs-airslide-blower",
  "kfs-elevator",
  "phc-idfan",
  "kln-main-drive",
  "kln-aux-drive",
  "kln-lube-pump",
  "kln-spray",
  "kln-thrust-hpu",
  "kln-outlet-fan",
  "brn-pafan",
  "brn-coal-feeder",
  "brn-coal-blower",
  "clr-fan-1",
  "clr-fan-2",
  "clr-fan-3",
  "clr-fan-4",
  "clr-fan-5",
  "clr-fan-6",
  "clr-grate-hpu",
  "clr-vent-fan",
  "hmr-crusher",
  "csl-conveyor",
  "csl-dust-fan",
] as const;

export type EquipmentId = (typeof EQUIPMENT_IDS)[number];
export type EquipmentState = "run" | "stopped" | "tripped";
export type EquipmentStates = Record<EquipmentId, EquipmentState>;

export const EQUIPMENT_LABEL: Record<EquipmentId, string> = {
  "fsl-blower-duty": "Aeration blower (duty)",
  "fsl-blower-standby": "Aeration blower (standby)",
  "fsl-gate": "Silo extraction gate",
  "kfs-airslide-blower": "Air-slide blower",
  "kfs-elevator": "Bucket elevator",
  "phc-idfan": "ID fan",
  "kln-main-drive": "Kiln main drive",
  "kln-aux-drive": "Kiln auxiliary drive",
  "kln-lube-pump": "Gearbox lube-oil pump",
  "kln-spray": "Girth-gear spray system",
  "kln-thrust-hpu": "Thrust hydraulic unit",
  "kln-outlet-fan": "Outlet sector-plate cooling fan",
  "brn-pafan": "Primary-air fan",
  "brn-coal-feeder": "Kiln coal feeder",
  "brn-coal-blower": "Coal conveying blower",
  "clr-fan-1": "Cooling fan 1",
  "clr-fan-2": "Cooling fan 2",
  "clr-fan-3": "Cooling fan 3",
  "clr-fan-4": "Cooling fan 4",
  "clr-fan-5": "Cooling fan 5",
  "clr-fan-6": "Cooling fan 6",
  "clr-grate-hpu": "Grate drive hydraulic unit",
  "clr-vent-fan": "Cooler vent fan",
  "hmr-crusher": "Hammer crusher",
  "csl-conveyor": "Deep-pan conveyor",
  "csl-dust-fan": "Silo dust-collector fan",
};

export const EQUIPMENT_MACHINE: Record<EquipmentId, string> = {
  "fsl-blower-duty": "PYR-FED-01",
  "fsl-blower-standby": "PYR-FED-01",
  "fsl-gate": "PYR-FED-01",
  "kfs-airslide-blower": "PYR-FED-01",
  "kfs-elevator": "PYR-FED-01",
  "phc-idfan": "PYR-PHC-01",
  "kln-main-drive": "PYR-KLN-01",
  "kln-aux-drive": "PYR-KLN-01",
  "kln-lube-pump": "PYR-KLN-01",
  "kln-spray": "PYR-KLN-01",
  "kln-thrust-hpu": "PYR-KLN-01",
  "kln-outlet-fan": "PYR-KLN-01",
  "brn-pafan": "PYR-BRN-01",
  "brn-coal-feeder": "PYR-BRN-01",
  "brn-coal-blower": "PYR-BRN-01",
  "clr-fan-1": "PYR-CLR-01",
  "clr-fan-2": "PYR-CLR-01",
  "clr-fan-3": "PYR-CLR-01",
  "clr-fan-4": "PYR-CLR-01",
  "clr-fan-5": "PYR-CLR-01",
  "clr-fan-6": "PYR-CLR-01",
  "clr-grate-hpu": "PYR-CLR-01",
  "clr-vent-fan": "PYR-CLR-01",
  "hmr-crusher": "PYR-CCT-01",
  "csl-conveyor": "PYR-CCT-01",
  "csl-dust-fan": "PYR-CCT-01",
};

/** Normal line: everything runs except the standby blower and the auxiliary drive, which stand by. */
export function defaultEquipment(): EquipmentStates {
  const eq = Object.fromEntries(EQUIPMENT_IDS.map((id) => [id, "run"])) as EquipmentStates;
  eq["fsl-blower-standby"] = "stopped";
  eq["kln-aux-drive"] = "stopped";
  return eq;
}

/**
 * Unit whose run state governs a signal: its drive current, speed, vibration
 * and bearing temperatures are ≈ 0 / ambient while that unit is stopped, so
 * the data-quality screen and the relative limits only judge it while the
 * unit runs. Tags not listed (inventories, process temperatures, gas
 * analysers, calculated values) are judged whenever their machine runs.
 * The aeration header and blower current follow whichever blower carries it.
 */
const UNIT_TAGS: Array<[EquipmentId | "fsl-aeration", string[]]> = [
  ["fsl-aeration", ["PRS-FSL-01", "ELE-FSL-01"]],
  ["kfs-airslide-blower", ["PRS-KFS-01"]],
  ["kfs-elevator", ["ELE-KFS-01", "VIB-KFS-01", "TMP-KFS-01", "SPD-KFS-01", "FLO-KFS-01", "PRS-KFS-02", "POS-KFS-01"]],
  ["phc-idfan", ["SPD-PHC-01", "ELE-PHC-01", "VIB-PHC-01", "VIB-PHC-02", "TMP-PHC-09", "TMP-PHC-10", "POS-PHC-01", "PRS-PHC-01", "PRS-PHC-02", "PRS-PHC-03", "PRS-PHC-04", "PRS-PHC-05", "PRS-PHC-06", "PRS-PHC-07", "PRS-PHC-08", "PRS-PHC-09", "PRS-KLN-01"]],
  ["kln-main-drive", ["ELE-KLN-01", "SPD-KLN-01", "TMP-KLN-21", "TMP-KLN-19", "TMP-KLN-20", "VIB-KLN-01", "VIB-KLN-02", "VIB-KLN-03", "VIB-KLN-04", "TMP-KLN-22", "TMP-KLN-23"]],
  ["kln-lube-pump", ["PRS-KLN-04", "PRS-KLN-05"]],
  ["kln-thrust-hpu", ["PRS-KLN-07"]],
  ["kln-outlet-fan", ["TMP-KLN-25"]],
  ["brn-pafan", ["PRS-BRN-01", "PRS-BRN-02", "PRS-BRN-03", "VIB-BRN-01", "TMP-BRN-01", "ELE-BRN-01"]],
  ["brn-coal-feeder", ["FLO-BRN-01", "CAL-BRN-01"]],
  ["brn-coal-blower", ["PRS-BRN-04", "VIB-BRN-02", "ELE-BRN-02"]],
  ...([1, 2, 3, 4, 5, 6] as const).map((k): [EquipmentId, string[]] => [
    `clr-fan-${k}` as EquipmentId,
    [`PRS-CLR-0${k}`, `ELE-CLR-0${k}`, `TMP-CLR-0${k}`, ...(k <= 3 ? [`VIB-CLR-0${k}`] : [])],
  ]),
  ["clr-grate-hpu", ["SPD-CLR-01", "PRS-CLR-07", "TMP-CLR-07"]],
  ["clr-vent-fan", ["VIB-CLR-07", "TMP-CLR-10", "ELE-CLR-07"]],
  ["hmr-crusher", ["TMP-HMR-03", "ELE-HMR-01", "VIB-HMR-01", "VIB-HMR-02", "TMP-HMR-01", "TMP-HMR-02", "SPD-HMR-01"]],
  ["csl-conveyor", ["VIB-CSL-01", "ELE-CSL-01", "SPD-CSL-01"]],
  ["csl-dust-fan", ["PRS-CSL-01", "ELE-CSL-02"]],
];

export const TAG_UNIT: Record<string, EquipmentId | "fsl-aeration"> = Object.fromEntries(UNIT_TAGS.flatMap(([u, tags]) => tags.map((tg) => [tg, u])));

/** True when the unit that drives `tag` runs (tags without a unit: always true). */
export function unitRunning(eq: EquipmentStates, tag: string): boolean {
  const u = TAG_UNIT[tag];
  if (!u) return true;
  if (u === "fsl-aeration") return eq["fsl-blower-duty"] === "run" || eq["fsl-blower-standby"] === "run";
  return eq[u] === "run";
}

/** Machine running evidence (D4 §8.2 comparable state) from its main unit's run state. */
export function machineRunning(eq: EquipmentStates): Record<string, boolean> {
  const clrFans = ([1, 2, 3, 4, 5, 6] as const).some((k) => eq[`clr-fan-${k}` as EquipmentId] === "run");
  return {
    "PYR-FED-01": eq["kfs-elevator"] === "run",
    "PYR-PHC-01": eq["phc-idfan"] === "run",
    "PYR-KLN-01": eq["kln-main-drive"] === "run",
    "PYR-BRN-01": eq["brn-pafan"] === "run",
    "PYR-CLR-01": clrFans || eq["clr-vent-fan"] === "run",
    "PYR-CCT-01": eq["hmr-crusher"] === "run" || eq["csl-conveyor"] === "run",
  };
}

/**
 * Units without a run-feedback point in the D5 signal schedule (no motor current / status tag): the edge cannot
 * see that they stopped, so the reference model and the rules assume they run and their loss shows in their
 * process signals (air-slide pressure FP-03, gearbox oil pressure / flow switch FP-15, thrust pressure / axial
 * position FP-25, sector-plate cooling air FP-29, grate stroke / hydraulic pressure FP-38).
 */
export const PROCESS_ONLY: readonly EquipmentId[] = ["kfs-airslide-blower", "kln-lube-pump", "kln-thrust-hpu", "kln-outlet-fan", "clr-grate-hpu"];

/** Equipment states as the edge sees them (MCC / status feedback): process-only units read "run". */
export function observedEquipment(eq: EquipmentStates): EquipmentStates {
  const o = { ...eq };
  for (const id of PROCESS_ONLY) o[id] = "run";
  return o;
}
