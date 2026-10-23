/**
 * Equipment run states of the pyro line (D5 Table 9.4.1 "motor run states";
 * Phase 2 contract §1; units of the OSW-PE-SNL-PYR-01 Rev. 02 register: motor-driven
 * grate drives 1–3, air-slide blowers A / B / common / preheater top, kiln motor
 * cooling fan, fine-coal bin aeration blower).
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
  "kfs-slide-blower-a",
  "kfs-slide-blower-b",
  "kfs-common-blower",
  "kfs-elevator",
  "kfs-top-blower",
  "phc-idfan",
  "kln-main-drive",
  "kln-motor-fan",
  "kln-aux-drive",
  "kln-lube-pump",
  "kln-spray",
  "kln-thrust-hpu",
  "kln-outlet-fan",
  "brn-pafan",
  "brn-coal-feeder",
  "brn-coal-blower",
  "brn-bin-blower",
  "clr-fan-1",
  "clr-fan-2",
  "clr-fan-3",
  "clr-fan-4",
  "clr-fan-5",
  "clr-fan-6",
  "clr-grate-1",
  "clr-grate-2",
  "clr-grate-3",
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
  "fsl-gate": "Silo air-slide outlet gates",
  "kfs-slide-blower-a": "Air slide A blower",
  "kfs-slide-blower-b": "Air slide B blower",
  "kfs-common-blower": "Common air slide blower",
  "kfs-elevator": "Bucket elevator",
  "kfs-top-blower": "Preheater-top air slide blower",
  "phc-idfan": "ID fan",
  "kln-main-drive": "Kiln main drive",
  "kln-motor-fan": "Main motor cooling fan",
  "kln-aux-drive": "Kiln auxiliary drive",
  "kln-lube-pump": "Gearbox lube-oil pump",
  "kln-spray": "Girth-gear spray system",
  "kln-thrust-hpu": "Thrust hydraulic unit",
  "kln-outlet-fan": "Outlet sector-plate cooling fan",
  "brn-pafan": "Primary-air fan",
  "brn-coal-feeder": "Kiln coal feeder",
  "brn-coal-blower": "Coal conveying blower",
  "brn-bin-blower": "Fine-coal bin aeration blower",
  "clr-fan-1": "Cooling fan 1",
  "clr-fan-2": "Cooling fan 2",
  "clr-fan-3": "Cooling fan 3",
  "clr-fan-4": "Cooling fan 4",
  "clr-fan-5": "Cooling fan 5",
  "clr-fan-6": "Cooling fan 6",
  "clr-grate-1": "Grate drive 1",
  "clr-grate-2": "Grate drive 2",
  "clr-grate-3": "Grate drive 3 (if fitted)",
  "clr-vent-fan": "Cooler vent fan",
  "hmr-crusher": "Hammer crusher",
  "csl-conveyor": "Deep-pan conveyor",
  "csl-dust-fan": "Silo dust-collector fan",
};

export const EQUIPMENT_MACHINE: Record<EquipmentId, string> = {
  "fsl-blower-duty": "PYR-FED-01",
  "fsl-blower-standby": "PYR-FED-01",
  "fsl-gate": "PYR-FED-01",
  "kfs-slide-blower-a": "PYR-FED-01",
  "kfs-slide-blower-b": "PYR-FED-01",
  "kfs-common-blower": "PYR-FED-01",
  "kfs-elevator": "PYR-FED-01",
  "kfs-top-blower": "PYR-FED-01",
  "phc-idfan": "PYR-PHC-01",
  "kln-main-drive": "PYR-KLN-01",
  "kln-motor-fan": "PYR-KLN-01",
  "kln-aux-drive": "PYR-KLN-01",
  "kln-lube-pump": "PYR-KLN-01",
  "kln-spray": "PYR-KLN-01",
  "kln-thrust-hpu": "PYR-KLN-01",
  "kln-outlet-fan": "PYR-KLN-01",
  "brn-pafan": "PYR-BRN-01",
  "brn-coal-feeder": "PYR-BRN-01",
  "brn-coal-blower": "PYR-BRN-01",
  "brn-bin-blower": "PYR-BRN-01",
  "clr-fan-1": "PYR-CLR-01",
  "clr-fan-2": "PYR-CLR-01",
  "clr-fan-3": "PYR-CLR-01",
  "clr-fan-4": "PYR-CLR-01",
  "clr-fan-5": "PYR-CLR-01",
  "clr-fan-6": "PYR-CLR-01",
  "clr-grate-1": "PYR-CLR-01",
  "clr-grate-2": "PYR-CLR-01",
  "clr-grate-3": "PYR-CLR-01",
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
  ["fsl-aeration", ["PRS-FSL-01", "ELE-FSL-01", "TMP-FSL-01"]],
  ["kfs-slide-blower-a", ["PRS-KFS-01", "ELE-KFS-04"]],
  ["kfs-slide-blower-b", ["PRS-KFS-03", "ELE-KFS-05"]],
  ["kfs-common-blower", ["PRS-KFS-04", "ELE-KFS-06"]],
  ["kfs-top-blower", ["PRS-KFS-07", "ELE-KFS-07"]],
  ["kfs-elevator", ["FLO-BRN-02", "ELE-KFS-01", "VIB-KFS-01", "VIB-KFS-04", "TMP-KFS-01", "TMP-KFS-03", "TMP-KFS-02", "SPD-KFS-01", "FLO-KFS-01", "FLO-KFS-02", "PRS-KFS-02", "PRS-KFS-06"]],
  [
    "phc-idfan",
    ["SPD-PHC-01", "ELE-PHC-01", "TMP-PHC-11", "PRS-PHC-10", "VIB-PHC-01", "VIB-PHC-02", "TMP-PHC-09", "TMP-PHC-10", "POS-PHC-01", ...[1, 2, 3, 4, 5, 6].flatMap((n) => [`PRS-PHC-0${n}`, `PRS-PHC-1${n}`]), "PRS-KLN-01"],
  ],
  ["kln-main-drive", ["ELE-KLN-01", "SPD-KLN-01", ...[1, 2, 3, 4, 5, 6].map((n) => `TMP-KLN-4${n}`), "TMP-KLN-19", "TMP-KLN-20", "VIB-KLN-01", "VIB-KLN-05", "VIB-KLN-02", "VIB-KLN-03", "VIB-KLN-04", "TMP-KLN-22", "TMP-KLN-23"]],
  ["kln-lube-pump", ["PRS-KLN-04", "PRS-KLN-05"]],
  ["kln-thrust-hpu", ["PRS-KLN-07"]],
  ["kln-outlet-fan", ["TMP-KLN-25"]],
  ["brn-pafan", ["PRS-BRN-01", "PRS-BRN-02", "PRS-BRN-03", "VIB-BRN-01", "TMP-BRN-01", "ELE-BRN-01", "TMP-BRN-05"]],
  ["brn-coal-feeder", ["FLO-BRN-01"]],
  ["brn-coal-blower", ["PRS-BRN-04", "VIB-BRN-02", "ELE-BRN-02", "TMP-BRN-06"]],
  ["brn-bin-blower", ["ELE-BRN-03"]],
  ...([1, 2, 3, 4, 5, 6] as const).map((k): [EquipmentId, string[]] => [
    `clr-fan-${k}` as EquipmentId,
    [`PRS-CLR-0${k}`, `ELE-CLR-0${k}`, `TMP-CLR-0${k}`, `TMP-CLR-${16 + k}`, `VIB-CLR-0${k}`, `SPD-CLR-0${k}`],
  ]),
  ...([1, 2, 3] as const).map((k): [EquipmentId, string[]] => [`clr-grate-${k}` as EquipmentId, [`SPD-CLR-1${k}`, `ELE-CLR-1${k}`, `VIB-CLR-1${k}`, `TMP-CLR-3${k}`]]),
  ["clr-vent-fan", ["VIB-CLR-07", "TMP-CLR-10", "ELE-CLR-07", "TMP-CLR-23"]],
  ["hmr-crusher", ["TMP-HMR-03", "ELE-HMR-01", "VIB-HMR-01", "VIB-HMR-02", "VIB-HMR-03", "VIB-HMR-04", "TMP-HMR-01", "TMP-HMR-02", "TMP-HMR-04", "TMP-HMR-05", "SPD-HMR-01"]],
  ["csl-conveyor", ["VIB-CSL-01", "VIB-CSL-02", "VIB-CSL-03", "ELE-CSL-01", "SPD-CSL-01", "TMP-CSL-02", "TMP-CSL-03", "TMP-CSL-04"]],
  ["csl-dust-fan", ["ELE-CSL-02", "PRS-CSL-02", "PRS-CSL-03"]],
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
 * Units without a run-feedback point in the OSW-PE-SNL-PYR-01 Rev. 02 register (no motor current / status tag): the
 * edge cannot see that they stopped, so the reference model and the rules assume they run and their loss shows in
 * their process signals (gearbox oil pressure / flow switch FP-15, thrust pressure / axial position FP-25,
 * sector-plate cooling air FP-29). Rev. 02 gives the air-slide blowers and the grate drives their own motor currents.
 */
export const PROCESS_ONLY: readonly EquipmentId[] = ["kln-lube-pump", "kln-thrust-hpu", "kln-outlet-fan"];

/** Equipment states as the edge sees them (MCC / status feedback): process-only units read "run". */
export function observedEquipment(eq: EquipmentStates): EquipmentStates {
  const o = { ...eq };
  for (const id of PROCESS_ONLY) o[id] = "run";
  return o;
}

/** Tags each unit governs (the shared aeration header goes to neither blower: the header pressure and current say which one runs). */
const TAGS_OF_UNIT: Partial<Record<EquipmentId, string[]>> = Object.fromEntries(
  UNIT_TAGS.filter(([u]) => u !== "fsl-aeration").map(([u, tags]) => [u, tags]),
);

/**
 * Run states of one machine's units with run feedback, as the edge sees them
 * (process-only units are left out: the edge cannot see them stop).
 */
export function machineEquipment(eqObs: EquipmentStates, machineId: string): Record<string, { label: string; state: EquipmentState; tags: string[] }> {
  const out: Record<string, { label: string; state: EquipmentState; tags: string[] }> = {};
  for (const id of EQUIPMENT_IDS) {
    if (EQUIPMENT_MACHINE[id] !== machineId || PROCESS_ONLY.includes(id)) continue;
    out[id] = { label: EQUIPMENT_LABEL[id], state: eqObs[id], tags: TAGS_OF_UNIT[id] ?? [] };
  }
  return out;
}
