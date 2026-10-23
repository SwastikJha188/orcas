/**
 * Pyro line (FSL-01 … CSL-01) signal catalog for the live demonstration.
 *
 * Source: the OSW-PE-SNL-PYR-01 Rev. 02 sensor register (`sensor-list.ts`): nine
 * machine groups run here as six machines (FSL-01 + KFS-01 = feed system FED-01,
 * PHC-01 + main baghouse BGH-01 = preheater PHC-01, HMR-01 + CSL-01 = clinker
 * transport CCT-01), one signal per register position — 294: 286 online (24 of
 * them cyclone positions whose tags are on hold, 4 conditional), 6 calculated
 * (filter / ESP ΔP = inlet − outlet, bin weight = sum of the load cells) and two
 * manual records. It builds on D4-OSW-PE-PYR Rev. 02 (verbatim in `spec.ts`). The
 * register's nominal bands and L / H / LL / HH set-points (`ranges.ts`) are design
 * proposals for site verification; the base values below sit inside the nominal
 * bands at the design point of a ~5,000 t/d six-stage preheater kiln with calciner.
 * They are not field specifications.
 *
 * Pure data, no React and no server imports.
 */
import { PYRO_REMOVED_TAGS, PYRO_SENSOR_LIST, PYRO_SENSOR_LIST_BY_TAG } from "./sensor-list";
import type { LimitRule, Severity } from "../kiln-sim/signals";
import { PYRO_SPEC } from "./spec";
import { applyD5Limits } from "./limits";
import { applySensorMeta } from "./sensor-meta";
import { CLR_BASE, CLR_FAN_FLA, CLR_FAN_RPM, CLR_FAN_VIB } from "./shared";

export type { LimitRule, Severity };

export interface PyroMachineDef {
  /** Machine id in the ULTRON catalog (prefixed: the legacy kiln already owns KLN-01). */
  id: string;
  /** D4 asset code. */
  code: string;
  /** D4 asset codes merged into this one machine (feed system FSL-01 + KFS-01, clinker transport HMR-01 + CSL-01). */
  units?: string[];
  name: string;
  shortName: string;
  /** D4 machine-diagram sheets the machine appears on. */
  diagrams: string[];
  /** Equipment kind for the drawing registry (`diagramType` in the catalog). */
  diagramType: PyroDiagramType;
  area: "feed" | "preheater" | "kiln" | "clinker";
  boundary: string;
  majorParts: string;
  intent: string;
  /** D4 section of the machine (5.1 … 5.8). */
  section: string;
  /** D4 Table 5.xb "Why it matters". */
  production: string;
  safety: string;
  cost: string;
  /** D4 "Site verification gate". */
  gate: string;
  /**
   * D4 "Engineering limitation" boxes of the machine section, verbatim, followed
   * by the MOM Table B.1 HOLD dispositions and data gaps that apply to the machine.
   */
  limitations?: string[];
}

export type PyroDiagramType = "feed-system" | "preheater" | "pyro-kiln" | "kiln-burner" | "grate-cooler" | "clinker-transport" | "vpc-casting";

export interface PyroSystemDef {
  id: string;
  machine: string;
  name: string;
  /** Included in the machine health score (process-context systems are not). */
  scored: boolean;
}

export interface PyroSubDef {
  id: string;
  machine: string;
  system: string;
  name: string;
}

/** Same shape as the kiln `SignalDef`, with string ids and pyro extras. */
export interface PyroSignalDef {
  tag: string;
  name: string;
  unit: string;
  sub: string;
  system: string;
  /** D4 point id (F-P01, K-K05 …). */
  point: string;
  type: "analog" | "state";
  sigma: number;
  decimals: number;
  limit?: LimitRule;
  states?: { normal: string; warn?: string[]; alarm?: string[] };
  calculated?: boolean;
  instrument: string;
  normalBand: string;
  /** Owning machine id. */
  machine: string;
  /** Nominal value at the design operating point (state signals: 1). */
  base: number;
  /** "online" — one of the 161 D4 entries; "calculated" — derived value; "manual" — dated record (Table 6.4). */
  origin: "online" | "calculated" | "manual";
  /**
   * SW-DQ-01 configurable variability profile ("no universal flat-line equals
   * fault"): a running channel is flat-lined when its peak-to-peak spread over
   * `flatlineN` consecutive samples stays below `minVar` (engineering units).
   */
  flatlineN?: number;
  minVar?: number;
  /** Scanner scan rate / spatial resolution metadata (MOM 1.10.1: capture in D5). */
  scanResolution?: string;
  /** Register position whose tag is on hold (OSW-PE-SNL-PYR-01 Rev. 02 doc HP-02, cyclone placeholders). */
  tagHold?: boolean;
  /** Conditional register point: fitted only if available (Rev. 02 HP-07). */
  conditional?: boolean;
  /** D5 sampling / update rate (e.g. "1 s", "10 min"). */
  sampling?: string;
  /** D5 calibrated instrument range (engineering units); the clipping and out-of-range checks use it when present. */
  range?: [number, number];
  /** D5 instrument accuracy (e.g. "±0.5 K", "±1 % of span"). */
  accuracy?: string;
}

/* ------------------------------------------------------------------ */
/* Machines                                                            */
/* ------------------------------------------------------------------ */

export const PYRO_MACHINES: PyroMachineDef[] = [
  {
    id: "PYR-FED-01",
    code: "FED-01",
    units: ["FSL-01", "KFS-01"],
    section: "5.1–5.2",
    production: "Unstable extraction or feed interruptions destabilise calcination, the temperature profile and clinker production.",
    safety: "Silo aeration, dust and moving equipment remain under plant safety procedures; elevator tracking, plug and underspeed interlocks stay in the plant protection PLC.",
    cost: "Blower, extraction and air-slide faults, elevator trips and the process instability they cause.",
    gate: "Confirm single vs separate feed silos, the extraction aeration hardware and whether blower feedback is connected. Verify the plant uses a bucket elevator (not an air lift) and request belt / chain tracking and discharge plug statuses.",
    name: "Feed Silo and Kiln Feed System",
    shortName: "Feed system",
    diagrams: ["D01"],
    diagramType: "feed-system",
    area: "feed",
    boundary: "Feed silo extraction and aeration (FSL-01), then the kiln feed bin, weigh / dosing system, air slide, solid-flow meter and feed elevator (KFS-01).",
    majorParts: "Silo shell / hopper, six motorised outlet gates, aeration header, duty / standby blower, silo dust collector; bin / load cells and dust collector, discharge gates and air slides A / B, solid-flow meters, common air slide, bucket elevator, preheater-top air slide and rotary airlocks.",
    intent: "Inventory, reliable extraction and stable kiln feed to the preheater.",
  },
  {
    id: "PYR-PHC-01",
    code: "PHC-01",
    section: "5.3",
    production: "Cyclone blockage, draft changes and fan outages can stop the entire pyro process.",
    safety: "Hot dusty process pressure ports need purging and safe OEM access.",
    cost: "Shutdowns, fuel inefficiency and unscheduled duct cleaning.",
    gate: "Confirm the six-stage nomenclature, that no calciner vessel or tertiary-air duct exists, gas routing, meal outlets and purgeable pressure taps on the plant P&ID.",
    name: "Six-Stage Preheater, Exit Gas and ID Fan",
    shortName: "Preheater",
    diagrams: ["D02", "D03"],
    diagramType: "preheater",
    area: "preheater",
    boundary: "Six cyclone stages (C1 at the top → C6 at the bottom), calciner outlet and kiln riser, preheater exit gas with the waste-heat recovery (WHRS) branch, induced-draft fan and the main baghouse with the stack CEMS.",
    majorParts: "Cyclones and cones, gas ducts and meal pipes, riser, exit-gas analyser, ID fan bearings, inlet damper and motor.",
    intent: "Stage heat / draft profile, cone blockage and riser build-up, exit-gas O₂ / CO and ID fan condition.",
    limitations: [
      "D5 Table 5.3.1 / §3.1 place 890–920 °C on the meal to the kiln (TMP-PHC-07, plant value to confirm, D5 Table 13.1 row 2); OSW-PE-SNL-PYR-01 Rev. 02 proposes 840–870 °C for the hot meal and 870–910 °C for the C6 riser duct gas (running ≈ 855 / 890 °C).",
      "Tag HOLD (OSW-PE-SNL-PYR-01 Rev. 02 doc HP-02): the 24 cyclone positions (riser duct and cone pressure and temperature, C1–C6) use group placeholders; their unique tags and the C1–C6 tap mapping are not confirmed (MOM Table B.1 1.2.1).",
      "MOM HOLD (Table B.1 1.2.2): cyclone pressure taps purge / port HOLD. Tap purge air and port positions are not confirmed, so a draft or cone-pressure change cannot yet be separated from a blocked or unpurged tap.",
    ],
  },
  {
    id: "PYR-KLN-01",
    code: "KLN-01",
    section: "5.4",
    production: "Kiln stoppage halts clinker production; an idle hot kiln risks distortion.",
    safety: "Hot shell, moving drive and girth gear, brake and lubrication systems require plant-approved procedures.",
    cost: "Long-lead gear, roller, bearing and refractory repairs.",
    gate: "Preserve the 43-tag kiln legacy where not reassigned; verify support count, tyre arrangement, spray lubrication OEM and shell scanner capability. Open (Table 6.6): the plant meeting discussed an outlet camera (CAM-KLN-01, MOM 1.8.2) and a cooling-fan temperature and status (TMP-KLN-28, STS-KLN-10, MOM 1.8.4), removed with the conditional optional entries — the priority conflict remains explicitly open.",
    limitations: [
      "Gear-spray PRX channels require OEM-permitted distributor feedback. PRX channel strokes are NOT direct proof of lubricant reaching the girth gear.",
      "Three stations and three floating tyres are reference assumptions; match bearing positions, oil-bath design and tyre-shell slip geometry to the real kiln.",
      "The burner physically enters at the hot kiln OUTLET; do not treat the shell scanner as refractory thickness or graphite seal temperature.",
      "MOM HOLD (Table B.1 1.4.1): MIG-KLN-01…03 tyre-slip pickups are an OEM pickup HOLD; slip is judged against a demo hot baseline until the support-specific OEM baseline is supplied.",
      "OSW-PE-SNL-PYR-01 Rev. 02 HP-05 removes the support-roller oil-level switches: roller lubrication is judged from the bearing temperatures alone.",
    ],
    name: "Rotary Kiln and Auxiliaries",
    shortName: "Rotary kiln",
    diagrams: ["D04", "D05", "D06", "D07"],
    diagramType: "pyro-kiln",
    area: "kiln",
    boundary: "Rotating shell, drive train, girth gear, supports / tyres, hydraulic thrust and kiln outlet.",
    majorParts: "Motor / gearbox / pinion, three assumed support stations, shell scanner, hood / shroud, lubrication and brake.",
    intent: "Kiln continuity; bearing, gearbox, lubrication, thermal and axial-movement condition.",
  },
  {
    id: "PYR-BRN-01",
    code: "BRN-01",
    section: "5.5",
    production: "Burner / fuel / air disturbances can damage refractory and destabilise clinker quality.",
    safety: "Coal-bin fire / explosion / inerting functions stay in independent EHS / PLC systems.",
    cost: "Fuel loss, burner inspections and refractory damage.",
    gate: "The MOM requests a secondary-air pressure separately (not in the OSW-PE-SNL-PYR-01 Rev. 02 register); confirm the coal-bin CO analyser, the nitrogen purge sequence and the burner OEM ports.",
    name: "Main Kiln Burner, Air and Coal Firing",
    shortName: "Kiln burner",
    diagrams: ["D08"],
    diagramType: "kiln-burner",
    area: "kiln",
    boundary: "Main burner at the kiln outlet hood — the only firing point; primary / swirl / axial air, secondary air from the cooler and the kiln coal line. No burner in the preheater.",
    majorParts: "Multi-channel burner and manifold, primary-air fan, flame camera, fine-coal bin, kiln coal feeder, coal conveying blower.",
    intent: "Flame stability, combustion-air evidence, coal feeding and fan / blower health.",
    limitations: [
      "Data gap (MOM 1.13.1, EHS HOLD): the coal-bin CO analyser GAS-BRN-01 has no analyser-status or sample-health point in the register, so analyser validity cannot be checked online.",
    ],
  },
  {
    id: "PYR-CLR-01",
    code: "CLR-01",
    section: "5.6",
    production: "Cooler failures can force kiln reduction or stop; poor cooling disrupts heat recovery.",
    safety: "Hot clinker and pressurised compartments; inspection only under lockout procedures.",
    cost: "Grate repair, premature fan bearing failure, efficiency losses.",
    gate: "Verify the number of actual fans and grate compartments. Removal of VIB-CLR-04…06 conflicts with the original plant principle for all rotating machinery.",
    name: "Clinker Cooler and Fans",
    shortName: "Grate cooler",
    diagrams: ["D09", "D10"],
    diagramType: "grate-cooler",
    area: "clinker",
    boundary: "Clinker cooler grate / under-grate compartments, cooling fans, vent fan and discharge.",
    majorParts: "Six assumed bays / fans, motor-driven grate drives 1–3 (drive 3 if fitted), vent air line (WHRS, ESP, vent exhaust fan, recirculation) and discharge IR.",
    intent: "Cooling airflow distribution, drive condition, fan reliability and hot clinker discharge.",
  },
  {
    id: "PYR-CCT-01",
    code: "CCT-01",
    units: ["HMR-01", "CSL-01"],
    section: "5.7–5.8",
    production: "A blocked crusher, a conveyor failure or a full silo stops clinker transfer and backs up the cooler.",
    safety: "Guarding and rotor proximity require de-energised maintenance access; hot clinker, dust collection and moving pans require existing protection.",
    cost: "Rotor, bearing and hammer repair, chain repair, plug clearing and dust-system service.",
    gate: "Confirm the breaker technology (hammer, roll, crossbar), the conveyor type and the baghouse arrangement; existing speed, misalignment and bag-filter DP sources are preferred.",
    name: "Clinker Crusher, Conveying and Silo",
    shortName: "Clinker transport",
    diagrams: ["D11"],
    diagramType: "clinker-transport",
    area: "clinker",
    boundary: "Clinker hammer crusher after the cooler (HMR-01), then the deep-pan conveyor to the clinker silo and its dust handling (CSL-01).",
    majorParts: "Rotor DE / NDE bearing blocks, crusher casing, motor and speed pickup; pan conveyor drive / speed, clinker silo and baghouse / dust fan feeder.",
    intent: "Rotor health and jam indications, reliable conveyance, clinker inventory and vent-filter condition.",
  },
];

export const PYRO_MACHINE_IDS: ReadonlySet<string> = new Set(PYRO_MACHINES.map((m) => m.id));
export const PYRO_MACHINE_BY_ID: Record<string, PyroMachineDef> = Object.fromEntries(PYRO_MACHINES.map((m) => [m.id, m]));
/** D4 asset codes run as one machine: the feed system and the clinker transport. */
// The main baghouse (BGH-01, OSW-PE-SNL-PYR-01) is drawn and run with the preheater it dedusts.
const MERGED: Record<string, string> = { "FSL-01": "FED-01", "KFS-01": "FED-01", "BGH-01": "PHC-01", "HMR-01": "CCT-01", "CSL-01": "CCT-01" };
/** Catalog machine id of a D4 asset code ("KLN-01" → "PYR-KLN-01", "KFS-01" → "PYR-FED-01"). */
export const idOf = (code: string) => `PYR-${MERGED[code] ?? code}`;

/* ------------------------------------------------------------------ */
/* Systems and sub-assemblies                                          */
/* ------------------------------------------------------------------ */

const sys = (machine: string, id: string, name: string, scored = true): PyroSystemDef => ({ id, machine: idOf(machine), name, scored });
const sub = (machine: string, system: string, id: string, name: string): PyroSubDef => ({ id, machine: idOf(machine), system, name });

export const PYRO_SYSTEMS: PyroSystemDef[] = [
  sys("FSL-01", "SIL-FSL-01", "Silo & extraction"),
  sys("FSL-01", "AER-FSL-01", "Aeration"),
  sys("FSL-01", "DCL-FSL-01", "Silo dust collector"),
  sys("KFS-01", "BIN-KFS-01", "Feed bin & dosing"),
  sys("KFS-01", "ELV-KFS-01", "Bucket elevator"),
  sys("PHC-01", "CYC-PHC-01", "Cyclone tower & riser"),
  sys("PHC-01", "IDF-PHC-01", "ID fan"),
  sys("PHC-01", "PRC-PHC-01", "Exit gas", false),
  sys("BGH-01", "BAG-BGH-01", "Main baghouse"),
  sys("KLN-01", "DRV-KLN-01", "Drive train"),
  sys("KLN-01", "SUP-KLN-01", "Supports, tyres & thrust"),
  sys("KLN-01", "SHL-KLN-01", "Shell, inlet & outlet"),
  sys("BRN-01", "FLM-BRN-01", "Burner & combustion air"),
  sys("BRN-01", "COL-BRN-01", "Coal firing"),
  sys("CLR-01", "GRT-CLR-01", "Grate & compartments"),
  sys("CLR-01", "FAN-CLR-01", "Cooling fans"),
  sys("CLR-01", "VNT-CLR-01", "Exhaust & vent fan"),
  sys("HMR-01", "CRS-HMR-01", "Crusher drive & rotor"),
  sys("CSL-01", "CNV-CSL-01", "Pan conveyor"),
  sys("CSL-01", "SLO-CSL-01", "Clinker silo & dedusting"),
];

export const PYRO_SUBASSEMBLIES: PyroSubDef[] = [
  sub("FSL-01", "SIL-FSL-01", "fsl-silo", "Silo bottom: air slides & gates"),
  sub("FSL-01", "AER-FSL-01", "fsl-aeration", "Aeration blowers, header & purge"),
  sub("FSL-01", "DCL-FSL-01", "fsl-dc", "Silo dust collector & fan"),
  sub("KFS-01", "BIN-KFS-01", "kfs-bin", "Kiln feed bin, load cells & dust collector"),
  sub("KFS-01", "BIN-KFS-01", "kfs-dosing", "Bin discharge: blower, air slides & gates"),
  sub("KFS-01", "BIN-KFS-01", "kfs-sfm", "Solid-flow meters A / B & common air slide"),
  sub("KFS-01", "ELV-KFS-01", "kfs-elevator", "Bucket elevator & preheater-top slide"),
  sub("PHC-01", "CYC-PHC-01", "phc-upper", "Cyclones C1–C3"),
  sub("PHC-01", "CYC-PHC-01", "phc-lower", "Cyclones C4–C6"),
  sub("PHC-01", "CYC-PHC-01", "phc-riser", "Riser & hot meal"),
  sub("PHC-01", "CYC-PHC-01", "phc-calciner", "Calciner outlet & meal split"),
  sub("PHC-01", "IDF-PHC-01", "phc-idfan", "ID fan & motor"),
  sub("PHC-01", "PRC-PHC-01", "phc-exitgas", "Exit gas & WHRS"),
  sub("BGH-01", "BAG-BGH-01", "bgh-bags", "Bags, hoppers, inlet & stack"),
  sub("BGH-01", "BAG-BGH-01", "bgh-fan", "Baghouse fan & motor"),
  sub("KLN-01", "DRV-KLN-01", "kln-motor", "Main motor"),
  sub("KLN-01", "DRV-KLN-01", "kln-gearbox", "Main gearbox"),
  sub("KLN-01", "DRV-KLN-01", "kln-lube", "Gearbox lubrication"),
  sub("KLN-01", "DRV-KLN-01", "kln-aux", "Auxiliary drive & brake"),
  sub("KLN-01", "DRV-KLN-01", "kln-girth", "Pinion, girth gear & spray"),
  sub("KLN-01", "SUP-KLN-01", "kln-st1", "Station 1 & tyre 1"),
  sub("KLN-01", "SUP-KLN-01", "kln-st2", "Station 2 & tyre 2"),
  sub("KLN-01", "SUP-KLN-01", "kln-st3", "Station 3 & tyre 3"),
  sub("KLN-01", "SUP-KLN-01", "kln-thrust", "Hydraulic thrust"),
  sub("KLN-01", "SHL-KLN-01", "kln-inlet", "Kiln inlet & gas analysis"),
  sub("KLN-01", "SHL-KLN-01", "kln-shell", "Shell & scanner"),
  sub("KLN-01", "SHL-KLN-01", "kln-outlet", "Outlet, hood & burning zone"),
  sub("BRN-01", "FLM-BRN-01", "brn-burner", "Multi-channel burner"),
  sub("BRN-01", "FLM-BRN-01", "brn-pafan", "Primary-air fan"),
  sub("BRN-01", "COL-BRN-01", "brn-coalbin", "Fine-coal bin"),
  sub("BRN-01", "COL-BRN-01", "brn-coalfeed", "Coal feeder & conveying blower"),
  sub("BRN-01", "COL-BRN-01", "brn-calciner", "Calciner firing & tertiary air"),
  sub("CLR-01", "GRT-CLR-01", "clr-hot", "Compartments 1–3 (hot zone)"),
  sub("CLR-01", "GRT-CLR-01", "clr-cold", "Compartments 4–6"),
  sub("CLR-01", "GRT-CLR-01", "clr-drive", "Grate drives 1–3"),
  sub("CLR-01", "GRT-CLR-01", "clr-discharge", "Clinker discharge"),
  sub("CLR-01", "FAN-CLR-01", "clr-fans13", "Cooling fans 1–3"),
  sub("CLR-01", "FAN-CLR-01", "clr-fans46", "Cooling fans 4–6"),
  sub("CLR-01", "VNT-CLR-01", "clr-vent", "Vent fan & exhaust"),
  sub("HMR-01", "CRS-HMR-01", "hmr-motor", "Crusher motor"),
  sub("HMR-01", "CRS-HMR-01", "hmr-rotor", "Hammer rotor & bearings"),
  sub("CSL-01", "CNV-CSL-01", "csl-conveyor", "Deep-pan conveyor"),
  sub("CSL-01", "SLO-CSL-01", "csl-silo", "Clinker silo & baghouse"),
];

const SUB_BY_ID: Record<string, PyroSubDef> = Object.fromEntries(PYRO_SUBASSEMBLIES.map((s) => [s.id, s]));

/* ------------------------------------------------------------------ */
/* Signals                                                             */
/* ------------------------------------------------------------------ */

type Opts = {
  dec?: number;
  limit?: LimitRule;
  instrument?: string;
  normal?: string;
  calculated?: boolean;
  manual?: boolean;
  point?: string;
  flatlineN?: number;
  minVar?: number;
  scanResolution?: string;
  tagHold?: boolean;
  conditional?: boolean;
};

/**
 * SW-DQ-01 default variability profile per measurement family (D4: "configurable
 * variability profiles; no universal flat-line equals fault"). Fast mechanical
 * channels show a frozen transmitter within a few samples; slow inventories and
 * process temperatures need a longer window before a steady reading is suspicious.
 * The spread threshold is a share of the channel's normal scatter (σ).
 */
function flatProfile(tag: string, sigma: number): { flatlineN: number; minVar: number } {
  const n = tag.startsWith("VIB-") ? 5 : tag.startsWith("TMP-") ? 8 : tag.startsWith("GAS-") ? 8 : tag.startsWith("LEV-") || tag.startsWith("WGT-") ? 12 : 6;
  return { flatlineN: n, minVar: Math.max(1e-9, 0.02 * sigma) };
}

const hi = (warn: number, alarm: number): LimitRule => ({ kind: "hi", warn, alarm });
const lo = (warn: number, alarm: number): LimitRule => ({ kind: "lo", warn, alarm });
const band = (warnLo?: number, warnHi?: number, alarmLo?: number, alarmHi?: number): LimitRule => ({ kind: "band", warnLo, warnHi, alarmLo, alarmHi });
const sp = (warnPct: number, alarmPct: number): LimitRule => ({ kind: "setpoint", warnPct, alarmPct });

/** Instrument family from the D4 sensor type when not given. */
function instrumentFor(tag: string): string {
  const t = PYRO_SPEC[tag]?.sensorType ?? "";
  if (/IEPE/.test(t)) return "IEPE accelerometer";
  if (/RTD/.test(t)) return "Pt100 RTD";
  if (/Thermocouple/.test(t)) return "Thermocouple type K";
  if (/IR \/ optical/.test(t)) return "IR pyrometer";
  if (/DP \/ static/.test(t)) return "Pressure transmitter";
  if (/MCC/.test(t)) return "MCC / VFD data point";
  if (/Gas analyser/.test(t)) return "Gas analyser channel";
  if (/Radar/.test(t)) return "Radar level transmitter";
  if (/Shaft speed/.test(t)) return "Speed sensor / VFD";
  if (/LVDT/.test(t)) return "Position transmitter";
  if (/Mass-flow/.test(t)) return "Solid-flow meter";
  if (/load cells/i.test(t)) return "Load cells";
  return "Status signal";
}

/** On/off points are switches, not transmitters (D4 "Radar / level switch | state", "Actuator / LVDT / DI | state"). */
function switchInstrument(tag: string): string | undefined {
  if (tag.startsWith("LEV-")) return "Level switch (status)";
  if (tag === "POS-KLN-02") return "Travel limit switches (status)";
  if (tag === "FLO-KLN-05") return "Oil-flow switch (status)";
  return undefined;
}

function analog(tag: string, name: string, unit: string, subId: string, base: number, sigma: number, o: Opts = {}): PyroSignalDef {
  const s = SUB_BY_ID[subId];
  if (!s) throw new Error(`pyro: unknown sub-assembly ${subId}`);
  const fp = flatProfile(tag, sigma);
  return {
    tag,
    name,
    unit,
    sub: subId,
    system: s.system,
    point: o.point ?? PYRO_SPEC[tag]?.point ?? (o.calculated ? "CALC" : o.manual ? "MANUAL" : ""),
    type: "analog",
    sigma,
    decimals: o.dec ?? 1,
    limit: o.limit,
    calculated: o.calculated,
    instrument: o.instrument ?? (o.calculated ? "Calculated" : o.manual ? "Manual record" : instrumentFor(tag)),
    normalBand: o.normal ?? "",
    machine: s.machine,
    base,
    origin: o.calculated ? "calculated" : o.manual ? "manual" : "online",
    ...(o.calculated || o.manual ? {} : { flatlineN: o.flatlineN ?? fp.flatlineN, minVar: o.minVar ?? fp.minVar }),
    ...(o.scanResolution ? { scanResolution: o.scanResolution } : {}),
    ...(o.tagHold ? { tagHold: true } : {}),
    ...(o.conditional ? { conditional: true } : {}),
  };
}

function state(tag: string, name: string, subId: string, normal: string, warn: string[] = [], alarm: string[] = [], instrument?: string): PyroSignalDef {
  const s = SUB_BY_ID[subId];
  if (!s) throw new Error(`pyro: unknown sub-assembly ${subId}`);
  return {
    tag,
    name,
    unit: "state",
    sub: subId,
    system: s.system,
    point: PYRO_SPEC[tag]?.point ?? "",
    type: "state",
    sigma: 0,
    decimals: 0,
    states: { normal, warn: warn.length ? warn : undefined, alarm: alarm.length ? alarm : undefined },
    instrument: instrument ?? switchInstrument(tag) ?? instrumentFor(tag),
    normalBand: normal,
    machine: s.machine,
    base: 1,
    origin: "online",
  };
}

/**
 * Under-grate compartment pressure: band at ±25 % (alert) / ±40 % (danger) of nominal, or the plant document's
 * set-points and nominal band when given (OSW-PE-SNL-PYR-01 Rev. 01, mmWG converted to mbar).
 */
function compartment(n: number, base: number, subId: string, doc?: { limit: LimitRule; normal: string }): PyroSignalDef {
  return analog(`PRS-CLR-0${n}`, `Compartment ${n} under-grate pressure`, "mbar", subId, base, base * 0.011, {
    limit: doc?.limit ?? band(+(base * 0.75).toFixed(0), +(base * 1.28).toFixed(0), +(base * 0.6).toFixed(0), +(base * 1.45).toFixed(0)),
    normal: doc?.normal ?? `${Math.round(base * 0.88)}–${Math.round(base * 1.12)}`,
  });
}

/** Motor stator winding RTD (insulation class F assumed until the nameplate is confirmed). */
function winding(tag: string, name: string, subId: string, base: number): PyroSignalDef {
  return analog(tag, name, "°C", subId, base, 0.8, { limit: hi(135, 155), normal: `${Math.round(base - 20)}–${Math.round(base + 15)}`, instrument: "Pt100 stator winding RTD" });
}

const BEARING_HI = hi(85, 95);
const ROLLER_HI = hi(70, 80);
const VIB_HI = hi(4.5, 7.1);
/** Motor current in % of full-load amps (OSW-PE-SNL-PYR-01 Rev. 02: nominal 60–90, L 40 / H 100, HH 110). */
const FLA = (warnLo = 40, warnHi = 100, alarmHi = 110): LimitRule => band(warnLo, warnHi, undefined, alarmHi);
/** Motor current in % FLA at the design point (middle of the 60–90 % nominal band unless the register says otherwise). */
const I0 = 75;

/** Running motor current in % FLA (Rev. 02 nominal 60–90). */
function fla(tag: string, name: string, subId: string, base = I0, sigma = 0.5, o: Opts = {}): PyroSignalDef {
  return analog(tag, name, "% FLA", subId, base, sigma, { dec: 1, limit: FLA(), normal: "60–90", ...o });
}
/** Rolling-element bearing RTD (Rev. 02 nominal 50–75 °C, H 85 / HH 95). */
const brg = (tag: string, name: string, subId: string, base: number, normal = "50–75") => analog(tag, name, "°C", subId, base, 0.5, { limit: BEARING_HI, normal });
/** Vibration velocity (Rev. 02 nominal 1.0–2.8 mm/s, H 4.5 / HH 7.1). */
const vibr = (tag: string, name: string, subId: string, base: number, sigma = 0.08) => analog(tag, name, "mm/s RMS", subId, base, sigma, { dec: 2, limit: VIB_HI, normal: "1.0–2.8" });
/** Zero-speed switch (Rev. 02: no rpm; "Stopped while running" is the alarm, a stopped drive reads STOPPED). */
const zeroSpeed = (tag: string, name: string, subId: string) => state(tag, name, subId, "RUNNING", [], ["STOPPED WHILE RUNNING"], "Zero-speed switch");
/** Rotary airlock zero-speed switch (Rev. 02: Stopped is abnormal). */
const airlock = (tag: string, name: string, subId: string) => state(tag, name, subId, "RUNNING", [], ["STOPPED"], "Zero-speed switch");
/** Static pressure in a dust-collector or ESP duct (Rev. 02 gives a nominal band, no set-points). */
const duct = (tag: string, name: string, subId: string, base: number, normal: string, sigma = 0.12) => analog(tag, name, "mbar", subId, base, sigma, { dec: 1, limit: band(), normal, instrument: "Pressure transmitter" });
/** Filter / ESP ΔP = inlet − outlet (Rev. 02 CALC.). */
const dP = (tag: string, name: string, subId: string, base: number, sigma: number, limit: LimitRule, normal: string) =>
  analog(tag, name, "mbar", subId, base, sigma, { dec: 1, limit, normal, calculated: true, instrument: "Calculated ΔP (inlet − outlet)" });

/**
 * Cyclone stage n (C1 top … C6 bottom), OSW-PE-SNL-PYR-01 Rev. 02 §4 with the tags on hold (doc HP-02):
 * riser duct pressure PRS-PHC-0n, riser duct temperature TMP-PHC-0n, cone pressure PRS-PHC-1n, cone temperature TMP-PHC-2n.
 */
const CYCLONES: Array<{ n: number; sub: string; p: number; pN: string; t: number; tN: string; cp: number; cpN: string; ct: number; ctN: string }> = [
  { n: 1, sub: "phc-upper", p: -57, pN: "−50 … −65", t: 510, tN: "480–540", cp: -3.5, cpN: "−2 … −5", ct: 310, ctN: "290–330" },
  { n: 2, sub: "phc-upper", p: -47, pN: "−42 … −52", t: 650, tN: "620–680", cp: -3.5, cpN: "−2 … −5", ct: 495, ctN: "470–520" },
  { n: 3, sub: "phc-upper", p: -36, pN: "−32 … −40", t: 775, tN: "750–800", cp: -4.5, cpN: "−3 … −6", ct: 640, ctN: "620–660" },
  { n: 4, sub: "phc-lower", p: -27, pN: "−24 … −30", t: 830, tN: "810–850", cp: -6, cpN: "−4 … −8", ct: 760, ctN: "740–780" },
  { n: 5, sub: "phc-lower", p: -18, pN: "−15 … −21", t: 870, tN: "850–890", cp: -5, cpN: "−3 … −7", ct: 820, ctN: "800–840" },
  { n: 6, sub: "phc-lower", p: -11.5, pN: "−9 … −14", t: 890, tN: "870–910", cp: -6, cpN: "−4 … −8", ct: 850, ctN: "830–870" },
];

export const PYRO_SIGNALS: PyroSignalDef[] = [
  // ------------------------------------------------------------- FSL-01
  analog("LEV-FSL-01", "Raw-meal silo level", "%", "fsl-silo", 62, 0.25, { limit: band(25, 90, 15, 95), normal: "40–85" }),
  // Six motorised outlet gates (manual and pneumatic gates are not monitored): opening follows the extraction demand.
  ...[1, 2, 3, 4, 5, 6].map((n) =>
    analog(`POS-FSL-0${n}`, `Motorised outlet gate ${n} opening`, "%", "fsl-silo", 66.7, 0.3, { limit: band(undefined, 98, undefined, 99.5), normal: "per demand", instrument: "Actuator position feedback" }),
  ),
  state("STS-FSL-03", "Air-slide purge sequence", "fsl-aeration", "RUNNING", ["STALLED", "STOPPED"], [], "PLC / DCS status"),
  winding("TMP-FSL-01", "Aeration blower motor winding temperature", "fsl-aeration", 95),
  analog("PRS-FSL-01", "Aeration header pressure", "mbar", "fsl-aeration", 450, 3, { dec: 0, limit: band(300, 600, 200, 700), normal: "400–500" }),
  fla("ELE-FSL-01", "Aeration blower motor current", "fsl-aeration"),
  duct("PRS-FSL-03", "Silo dust collector inlet pressure", "fsl-dc", -7.5, "−5 … −10"),
  duct("PRS-FSL-04", "Silo dust collector outlet pressure", "fsl-dc", -19, "−15 … −25"),
  dP("PRS-FSL-02", "Silo dust collector filter differential pressure", "fsl-dc", 11.5, 0.17, band(4, 20, undefined, 25), "8–15"),
  fla("ELE-FSL-02", "Silo dust-collector fan motor current", "fsl-dc"),

  // ------------------------------------------------------------- KFS-01
  // Kiln feed bin on three load cells (Rev. 02 HP-03: WGT-KFS-02/03/04 are the cells, WGT-KFS-01 the calculated bin weight).
  ...[0, 1, 2].map((i) =>
    analog(`WGT-KFS-0${i + 2}`, `Kiln feed bin load cell ${i + 1} (weight)`, "t", "kfs-bin", [23.8, 23.1, 23.1][i], 0.15, { limit: band(12, 34, 8, 36.5), normal: "balanced (± 10 % of the mean)", instrument: "Load cell" }),
  ),
  analog("WGT-KFS-01", "Kiln feed bin weight (sum of load cells 1–3)", "%", "kfs-bin", 58, 0.15, { limit: band(25, 85, 15, 95), normal: "40–80", calculated: true, instrument: "Calculated: load cells 1 + 2 + 3, % of bin capacity" }),
  duct("PRS-KFS-08", "Feed-bin dust collector inlet pressure", "kfs-bin", -5.5, "−3 … −8"),
  duct("PRS-KFS-09", "Feed-bin dust collector outlet pressure", "kfs-bin", -14.5, "−12 … −20"),
  dP("PRS-KFS-05", "Feed-bin dust collector filter differential pressure", "kfs-bin", 9, 0.17, band(3, 18, undefined, 22), "6–12"),
  fla("ELE-KFS-03", "Feed-bin dust-collector fan motor current", "kfs-bin"),
  state("POS-KFS-01", "Discharge gate A open / closed", "kfs-dosing", "OPEN", ["TRAVELLING", "CLOSED"], ["FAULT"], "Limit switches (open / closed)"),
  state("POS-KFS-02", "Discharge gate B open / closed", "kfs-dosing", "OPEN", ["TRAVELLING", "CLOSED"], ["FAULT"], "Limit switches (open / closed)"),
  analog("PRS-KFS-01", "Air slide A air pressure", "mbar", "kfs-dosing", 40, 0.45, { limit: band(20, 70, 10, 85), normal: "30–50", instrument: "Pressure transmitter" }),
  analog("PRS-KFS-03", "Air slide B air pressure", "mbar", "kfs-dosing", 40, 0.45, { limit: band(20, 70, 10, 85), normal: "30–50", instrument: "Pressure transmitter" }),
  fla("ELE-KFS-04", "Air slide A blower motor current", "kfs-dosing"),
  fla("ELE-KFS-05", "Air slide B blower motor current", "kfs-dosing"),
  // Two solid-flow meters in parallel (slides A and B), each about half the kiln feed; kiln feed = A + B.
  analog("FLO-KFS-01", "Kiln feed mass flow, SFM A", "t/h", "kfs-sfm", 165, 0.8, { dec: 0, limit: sp(5, 10), normal: "SP ± 3 %", instrument: "Solid-flow meter (impact plate)" }),
  analog("PRS-KFS-02", "SFM A pressure (P2)", "mbar", "kfs-sfm", 0, 0.1, { dec: 2, limit: band(undefined, 3, undefined, 5), normal: "−1 … +1", instrument: "Pressure transmitter" }),
  analog("FLO-KFS-02", "Kiln feed mass flow, SFM B", "t/h", "kfs-sfm", 165, 0.8, { dec: 0, limit: sp(5, 10), normal: "SP ± 3 %", instrument: "Solid-flow meter (impact plate)" }),
  analog("PRS-KFS-06", "SFM B pressure (P3)", "mbar", "kfs-sfm", 0, 0.1, { dec: 2, limit: band(undefined, 3, undefined, 5), normal: "−1 … +1", instrument: "Pressure transmitter" }),
  analog("PRS-KFS-04", "Common air slide SFM A/B → elevator pressure", "mbar", "kfs-sfm", 45, 0.5, { limit: band(25, 70, 15, 85), normal: "35–55", instrument: "Pressure transmitter" }),
  fla("ELE-KFS-06", "Common air slide blower motor current", "kfs-sfm"),
  state("LEV-KFS-04", "Elevator boot material build-up level", "kfs-elevator", "CLEAR", [], ["HIGH"], "Level switch"),
  state("LIM-KFS-01", "Elevator belt sway / misalignment switch", "kfs-elevator", "OK", [], ["TRIP"], "Belt-sway switch"),
  zeroSpeed("SPD-KFS-01", "Elevator zero-speed switch (boot)", "kfs-elevator"),
  winding("TMP-KFS-02", "Bucket elevator head motor winding temperature", "kfs-elevator", 95),
  fla("ELE-KFS-01", "Bucket elevator motor current", "kfs-elevator"),
  vibr("VIB-KFS-01", "Elevator head shaft DE vibration", "kfs-elevator", 1.8, 0.07),
  vibr("VIB-KFS-04", "Elevator head shaft NDE vibration", "kfs-elevator", 1.6, 0.07),
  brg("TMP-KFS-01", "Elevator head DE bearing temperature", "kfs-elevator", 58),
  brg("TMP-KFS-03", "Elevator head NDE bearing temperature", "kfs-elevator", 56),
  // Preheater-top air slide and its two rotary airlocks (meal into the C1 / C2 riser).
  analog("PRS-KFS-07", "Preheater-top air slide air pressure", "mbar", "kfs-elevator", 42, 0.45, { limit: band(25, 70, 15, 85), normal: "35–50", instrument: "Pressure transmitter" }),
  fla("ELE-KFS-07", "Preheater-top air slide blower motor current", "kfs-elevator"),
  airlock("SPD-KFS-02", "Preheater-top rotary airlock 1 zero-speed switch", "kfs-elevator"),
  airlock("SPD-KFS-03", "Preheater-top rotary airlock 2 zero-speed switch", "kfs-elevator"),

  // ------------------------------------------------------------- PHC-01
  // Six cyclone stages: riser duct (gas into the stage) and cone, pressure and temperature; tags on hold (doc HP-02).
  ...CYCLONES.flatMap((c) => [
    analog(`PRS-PHC-0${c.n}`, `C${c.n} riser duct pressure`, "mbar", c.sub, c.p, Math.max(0.15, 0.008 * Math.abs(c.p)), { limit: band(c.p * 1.25, c.p * 0.75), normal: c.pN, tagHold: true }),
    analog(`TMP-PHC-0${c.n}`, `C${c.n} riser duct temperature`, "°C", c.sub, c.t, c.n <= 2 ? 2 : 3, { dec: 0, limit: band(undefined, c.t + 60, undefined, c.t + 90), normal: c.tN, tagHold: true }),
    analog(`PRS-PHC-1${c.n}`, `C${c.n} cone pressure`, "mbar", c.sub, c.cp, 0.1, { limit: band(undefined, -1, undefined, 0), normal: c.cpN, tagHold: true }),
    analog(`TMP-PHC-2${c.n}`, `C${c.n} cone temperature`, "°C", c.sub, c.ct, c.n <= 2 ? 2 : 3, { dec: 0, limit: band(c.ct - 60, undefined), normal: c.ctN, tagHold: true }),
  ]),
  analog("TMP-PHC-08", "Calciner outlet gas temperature", "°C", "phc-riser", 885, 3, { dec: 0, limit: band(850, 920, 830, 950), normal: "870–900" }),
  analog("TMP-PHC-07", "Hot meal temperature to kiln (kiln inlet feed)", "°C", "phc-riser", 855, 3, { dec: 0, limit: band(820, 890), normal: "840–870" }),
  analog("TMP-PHC-30", "Preheater exit gas temperature", "°C", "phc-exitgas", 325, 1.5, { dec: 0, limit: band(undefined, 380, undefined, 420), normal: "300–350", instrument: "Thermocouple / DCS" }),
  analog("GAS-PHC-01", "Preheater exit O₂", "vol%", "phc-exitgas", 3.6, 0.06, { dec: 2, limit: band(1.5, 6.0, 1.0), normal: "2.5–4.5" }),
  analog("GAS-PHC-02", "Preheater exit CO", "ppm", "phc-exitgas", 300, 18, { dec: 0, limit: hi(1000, 2000), normal: "< 500" }),
  // Waste-heat recovery: inlet / outlet dampers in the WHRS branch, bypass damper on the main gas line.
  analog("POS-PHC-03", "WHRS inlet damper position", "%", "phc-exitgas", 85, 0.2, { limit: band(undefined, 98, undefined, 99.5), normal: "80–90", instrument: "Actuator position feedback" }),
  analog("POS-PHC-04", "WHRS outlet damper position", "%", "phc-exitgas", 85, 0.2, { limit: band(undefined, 98, undefined, 99.5), normal: "80–90", instrument: "Actuator position feedback" }),
  analog("POS-PHC-05", "Main gas line WHRS bypass damper position", "%", "phc-exitgas", 8, 0.2, { limit: band(undefined, 40, undefined, 60), normal: "0–15", instrument: "Actuator position feedback" }),
  analog("TMP-PHC-31", "Gas temperature after WHRS", "°C", "phc-exitgas", 225, 1.5, { dec: 0, limit: band(undefined, 280, undefined, 320), normal: "200–250", instrument: "Thermocouple / DCS" }),
  analog("POS-PHC-01", "ID fan inlet damper position", "%", "phc-idfan", 82, 0.2, { limit: band(40, 96, undefined, 99.5), normal: "70–90" }),
  vibr("VIB-PHC-01", "ID fan DE vibration", "phc-idfan", 2.0),
  vibr("VIB-PHC-02", "ID fan NDE vibration", "phc-idfan", 1.8),
  brg("TMP-PHC-09", "ID fan DE bearing temperature", "phc-idfan", 66, "55–75"),
  brg("TMP-PHC-10", "ID fan NDE bearing temperature", "phc-idfan", 62, "55–75"),
  analog("ELE-PHC-01", "ID fan motor power", "% rated", "phc-idfan", 80, 0.4, { dec: 1, limit: FLA(), normal: "70–90" }),
  analog("SPD-PHC-01", "ID fan speed", "rpm", "phc-idfan", 890, 1.2, { dec: 0, limit: band(700, 975, undefined, 995), normal: "per SP" }),
  winding("TMP-PHC-11", "ID fan motor winding temperature", "phc-idfan", 96),
  analog("PRS-PHC-10", "Calciner outlet draft", "mbar", "phc-calciner", -12, 0.2, { limit: band(undefined, -6, undefined, -3), normal: "−10 … −14", instrument: "Pressure transmitter" }),
  analog("GAS-PHC-03", "Calciner outlet O₂", "vol%", "phc-calciner", 2.0, 0.06, { dec: 2, limit: band(1.0, 4.5, 0.5), normal: "1.5–3.0", instrument: "Extractive gas analyser" }),
  analog("GAS-PHC-04", "Calciner outlet CO", "ppm", "phc-calciner", 450, 25, { dec: 0, limit: hi(1500, 3000), normal: "< 600", instrument: "Extractive gas analyser" }),
  analog("POS-PHC-02", "Meal split gate opening (calciner / riser)", "%", "phc-calciner", 70, 0.2, { limit: band(20, 95, 5, 99.5), normal: "per SP", instrument: "Actuator position feedback" }),

  // ------------------------------------------------------------- BGH-01 (main baghouse, run with PHC-01)
  state("STS-BGH-01", "Pulse-jet cleaning controller status", "bgh-bags", "CLEANING", ["PAUSED"], ["FAULT"], "PLC / DCS status"),
  analog("TMP-BGH-02", "Baghouse inlet gas temperature (bag protection)", "°C", "bgh-bags", 175, 1.5, { dec: 0, limit: band(110, 220, 100, 240), normal: "150–200", instrument: "Thermocouple" }),
  duct("PRS-BGH-02", "Baghouse inlet pressure", "bgh-bags", -17.5, "−15 … −20", 0.2),
  duct("PRS-BGH-03", "Baghouse outlet pressure", "bgh-bags", -30.5, "−28 … −35", 0.2),
  dP("PRS-BGH-01", "Baghouse differential pressure across bags", "bgh-bags", 13, 0.28, band(5, 18, undefined, 22), "10–15"),
  ...[1, 2, 3].map((n) => state(`LEV-BGH-0${n}`, `Baghouse hopper ${n} level switch`, "bgh-bags", "NORMAL", [], ["HIGH"], "Level switch (status)")),
  ...[1, 2, 3].map((n) => airlock(`SPD-BGH-0${n + 1}`, `Baghouse hopper ${n} rotary airlock zero-speed switch`, "bgh-bags")),
  analog("GAS-BGH-01", "Stack dust (CEMS, read-only)", "mg/Nm³", "bgh-bags", 12, 0.6, { dec: 1, limit: hi(25, 30), normal: "< 15", instrument: "CEMS (read-only link)" }),
  analog("GAS-BGH-02", "Stack SOx (CEMS, read-only)", "mg/Nm³", "bgh-bags", 60, 2, { dec: 0, limit: band(), normal: "< 100", instrument: "CEMS (read-only link)" }),
  analog("GAS-BGH-03", "Stack NOx (CEMS, read-only)", "mg/Nm³", "bgh-bags", 600, 10, { dec: 0, limit: band(), normal: "500–700", instrument: "CEMS (read-only link)" }),
  analog("GAS-BGH-04", "Stack CO (CEMS, read-only)", "mg/Nm³", "bgh-bags", 225, 12, { dec: 0, limit: hi(800, 1200), normal: "< 500", instrument: "CEMS (read-only link)" }),
  analog("GAS-BGH-05", "Stack CO₂ (CEMS, read-only)", "%", "bgh-bags", 24, 0.15, { dec: 1, limit: band(), normal: "20–28", instrument: "CEMS (read-only link)" }),
  vibr("VIB-BGH-01", "Baghouse fan bearing vibration", "bgh-fan", 2.1),
  brg("TMP-BGH-01", "Baghouse fan bearing temperature", "bgh-fan", 62),
  fla("ELE-BGH-01", "Baghouse fan motor current", "bgh-fan"),
  analog("SPD-BGH-01", "Baghouse fan speed", "rpm", "bgh-fan", 980, 1.2, { dec: 0, limit: band(800, 1010, undefined, 1030), normal: "per SP" }),
  winding("TMP-BGH-03", "Baghouse fan motor winding temperature", "bgh-fan", 92),

  // ------------------------------------------------------------- KLN-01 · drive train
  analog("ELE-KLN-01", "Kiln drive torque / load", "% rated", "kln-motor", 64, 0.9, { limit: hi(90, 105), normal: "50–75" }),
  brg("TMP-KLN-20", "Main motor NDE bearing temperature", "kln-motor", 55),
  analog("SPD-KLN-01", "Kiln speed", "rpm", "kln-motor", 3.6, 0.01, { dec: 2, limit: band(2.5, 4.0, 2.0, 4.2), normal: "3.0–4.0" }),
  brg("TMP-KLN-19", "Main motor DE bearing temperature", "kln-motor", 59),
  vibr("VIB-KLN-01", "Main motor DE vibration", "kln-motor", 1.6),
  vibr("VIB-KLN-05", "Main motor NDE vibration", "kln-motor", 1.45),
  // Six stator winding RTDs (two per phase, Rev. 02 replaces the single TMP-KLN-21).
  ...[0, 1, 2, 3, 4, 5].map((i) => winding(`TMP-KLN-4${i + 1}`, `Main motor winding temperature ${i + 1}`, "kln-motor", [92, 93, 91, 92, 94, 92][i])),
  state("STS-KLN-14", "Main motor cooling fan", "kln-motor", "RUNNING", ["STOPPED"], [], "PLC / DCS status"),
  state("STS-KLN-12", "Main-drive health (DCS)", "kln-motor", "OK", ["WARNING"], ["FAULT"], "PLC / DCS status"),
  analog("TMP-KLN-22", "Gearbox input bearing temperature", "°C", "kln-gearbox", 64, 0.6, { limit: BEARING_HI, normal: "55–75" }),
  vibr("VIB-KLN-02", "Gearbox input vibration", "kln-gearbox", 1.85, 0.09),
  vibr("VIB-KLN-03", "Gearbox output vibration", "kln-gearbox", 1.51),
  analog("TMP-KLN-23", "Gearbox output bearing temperature", "°C", "kln-gearbox", 62, 0.6, { limit: BEARING_HI, normal: "55–75" }),
  analog("TMP-KLN-15", "Gearbox oil temperature", "°C", "kln-lube", 54, 0.5, { limit: band(25, 70, undefined, 80), normal: "45–60" }),
  analog("PRS-KLN-04", "Gearbox oil supply pressure", "bar", "kln-lube", 2.24, 0.04, { dec: 2, limit: band(1.5, 4.0, 1.0, 5.0), normal: "2.0–3.0" }),
  state("LEV-KLN-01", "Gearbox oil tank level switch", "kln-lube", "LEVEL OK", [], ["LOW LEVEL"]),
  analog("PRS-KLN-05", "Gearbox oil filter differential pressure", "bar", "kln-lube", 0.65, 0.015, { dec: 2, limit: hi(1.5, 2.5), normal: "< 1.0" }),
  state("FLO-KLN-05", "Gearbox oil flow switch", "kln-lube", "FLOW OK", [], ["NO FLOW"]),
  analog("LAB-KLN-01", "Gearbox oil laboratory — wear iron (Fe)", "ppm", "kln-lube", 22, 0, { dec: 0, limit: hi(60, 120), normal: "< 50", manual: true, point: "Sample port" }),
  state("STS-KLN-11", "Auxiliary drive status", "kln-aux", "READY", ["NOT READY"]),
  state("LIM-KLN-01", "Auxiliary brake pad wear limit", "kln-aux", "OK", ["WEAR LIMIT"], [], "Wear-limit switch"),
  state("STS-KLN-05", "Girth-gear spray controller", "kln-girth", "OK", [], ["FAULT"]),
  ...[1, 2, 3, 4, 5, 6].map((n) => state(`PRX-KLN-0${n}`, `Spray circuit ${n} pulse (HOLD)`, "kln-girth", "CYCLING", [], ["NO CYCLE"], "Divider-cycle proof")),
  vibr("VIB-KLN-04", "Pinion bearing vibration", "kln-girth", 2.33, 0.1),

  // ------------------------------------------------------------- KLN-01 · supports, tyres, thrust
  ...([
    [1, "kln-st1", ["01", "02", "03", "04"], 9.0],
    [2, "kln-st2", ["05", "06", "07", "08"], 11.0],
    [3, "kln-st3", ["09", "10", "11", "12"], 8.0],
  ] as const).flatMap(([n, subId, tmp, mig]) => [
    analog(`TMP-KLN-${tmp[0]}`, `Station ${n} left roller bearing A temperature`, "°C", subId, 50, 0.8, { limit: ROLLER_HI, normal: "40–60" }),
    analog(`TMP-KLN-${tmp[1]}`, `Station ${n} left roller bearing B temperature`, "°C", subId, 51, 0.8, { limit: ROLLER_HI, normal: "40–60" }),
    analog(`TMP-KLN-${tmp[2]}`, `Station ${n} right roller bearing A temperature`, "°C", subId, 50, 0.8, { limit: ROLLER_HI, normal: "40–60" }),
    analog(`TMP-KLN-${tmp[3]}`, `Station ${n} right roller bearing B temperature`, "°C", subId, 51, 0.8, { limit: ROLLER_HI, normal: "40–60" }),
    analog(`MIG-KLN-0${n}`, `Tyre ${n} migration (tyre–shell slip)`, "mm/rev", subId, mig, 0.12, { limit: band(3, 20, 1, 25), normal: "5–15", instrument: "Tyre-shell slip pickup" }),
  ]),
  analog("POS-KLN-01", "Kiln axial position (thrust LVDT)", "mm", "kln-thrust", -3, 0.45, { limit: { kind: "abs", warn: 25, alarm: 30 }, normal: "± 10" }),
  ...[1, 2, 3].map((n) => analog(`TMP-KLN-${27 + n}`, `Tyre ${n} temperature (DCS read-only)`, "°C", `kln-st${n}`, [250, 215, 250][n - 1], 1.2, { dec: 0, limit: hi(350, 400), normal: "200–300", instrument: "DCS read-only temperature" })),
  state("POS-KLN-02", "Thrust travel limit switches", "kln-thrust", "CLEAR", [], ["LIMIT"]),
  analog("PRS-KLN-07", "Thrust hydraulic pressure", "bar", "kln-thrust", 86, 1.6, { dec: 0, limit: band(50, 150, undefined, 200), normal: "70–120" }),

  // ------------------------------------------------------------- KLN-01 · shell, inlet, outlet
  analog("TMP-KLN-13", "Kiln inlet gas temperature", "°C", "kln-inlet", 1080, 4, { dec: 0, limit: band(undefined, 1200, undefined, 1250), normal: "1,000–1,150" }),
  analog("PRS-KLN-01", "Kiln inlet draft", "mbar", "kln-inlet", -8.8, 0.15, { dec: 2, limit: band(undefined, -3, undefined, -1), normal: "−6 … −10" }),
  analog("GAS-KLN-01", "Kiln inlet O₂", "vol%", "kln-inlet", 2.4, 0.06, { dec: 2, limit: band(1.0, 5.0, 0.5), normal: "1.5–3.5" }),
  analog("GAS-KLN-02", "Kiln inlet CO", "ppm", "kln-inlet", 420, 25, { dec: 0, limit: hi(1500, 3000), normal: "< 800" }),
  analog("GAS-KLN-03", "Kiln inlet NOₓ", "ppm", "kln-inlet", 950, 20, { dec: 0, limit: band(400, 1500), normal: "600–1,200" }),
  state("STS-KLN-06", "Kiln inlet gas analyser status", "kln-inlet", "OK", ["BLOWBACK"], ["FAULT"]),
  // Rev. 02: STS-KLN-08 is the scanner reading itself — the shell maximum (°C) and its position along the kiln in the same
  // reading. Scanner coverage (the share of the shell in view) stays the scanner's own quality figure, not a register point.
  analog("STS-KLN-08", "Shell scanner: maximum shell temperature", "°C", "kln-shell", 326, 2.5, {
    dec: 0,
    limit: hi(370, 420),
    normal: "250–330",
    instrument: "IR shell scanner (maximum temperature and its position; map every 10 min)",
    scanResolution: "Map every 10 min, values every 1 min; axial / angular resolution not yet captured — pending D5 (MOM 1.10.1)",
  }),
  state("STS-KLN-13", "Shell cooling fans status (DCS)", "kln-shell", "RUNNING", ["STOPPED"], ["FAULT"], "PLC / DCS status"),
  analog("MAN-KLN-01", "Handheld shell scan, 52 m zone", "°C", "kln-shell", 318, 0, { dec: 0, limit: hi(370, 420), normal: "≈ scanner (± 30 °C)", manual: true, point: "Handheld" }),
  analog("TMP-KLN-14", "Burning-zone temperature (pyrometer)", "°C", "kln-outlet", 1300, 5, { dec: 0, limit: band(1200, 1450), normal: "1,250–1,350", instrument: "Two-colour pyrometer" }),
  analog("TMP-KLN-27", "Kiln hood temperature", "°C", "kln-outlet", 1030, 4, { dec: 0, limit: band(undefined, 1200, undefined, 1250), normal: "950–1,100" }),
  analog("PRS-KLN-03", "Kiln hood pressure", "mbar", "kln-outlet", -0.147, 0.012, { dec: 3, limit: band(undefined, 0, undefined, 0.1), normal: "−0.1 … −0.2" }),
  analog("TMP-KLN-25", "Outlet sector-plate cooling-air temperature", "°C", "kln-outlet", 85, 1, { limit: hi(120, 150), normal: "60–100" }),
  analog("TMP-KLN-26", "Cooling shroud (cow shell) surface temperature", "°C", "kln-outlet", 245, 2, { dec: 0, limit: hi(320, 380), normal: "200–280" }),

  // ------------------------------------------------------------- BRN-01
  state("CAM-BRN-01", "Flame-view camera feed (operator visual evidence)", "brn-burner", "FEED LIVE", [], ["FEED LOST"], "Protected flame camera (video stream)"),
  // Rev. 02 HP-04: PRS-BRN-01 = primary-air header, PRS-BRN-02 = burner swirl air, PRS-BRN-03 = burner axial air.
  analog("PRS-BRN-01", "Primary-air header pressure", "mbar", "brn-burner", 660, 4, { dec: 0, limit: band(500, 800, 400), normal: "600–720" }),
  analog("PRS-BRN-02", "Burner swirl (helical) air pressure", "mbar", "brn-burner", 70, 0.5, { dec: 0, limit: band(35, 120), normal: "50–90" }),
  analog("PRS-BRN-03", "Burner axial (jet) air pressure", "mbar", "brn-pafan", 625, 4, { dec: 0, limit: band(450, 800), normal: "550–700" }),
  analog("TMP-BRN-02", "Secondary air temperature", "°C", "brn-burner", 1100, 5, { dec: 0, limit: band(900, 1200), normal: "1,000–1,150" }),
  vibr("VIB-BRN-01", "Primary-air fan vibration", "brn-pafan", 1.9, 0.07),
  brg("TMP-BRN-01", "Primary-air fan bearing temperature", "brn-pafan", 60),
  fla("ELE-BRN-01", "Primary-air fan motor current", "brn-pafan"),
  winding("TMP-BRN-05", "Primary-air fan motor winding temperature", "brn-pafan", 90),
  analog("TMP-BRN-04", "Fine-coal bin temperature", "°C", "brn-coalbin", 52, 0.3, { limit: hi(75, 85), normal: "40–60" }),
  analog("GAS-BRN-01", "Fine-coal bin CO", "ppm", "brn-coalbin", 18, 2, { dec: 0, limit: hi(200, 400), normal: "< 50" }),
  analog("LEV-BRN-01", "Fine-coal bin level", "%", "brn-coalbin", 64, 0.3, { limit: band(25, 90, 15, 95), normal: "40–85" }),
  state("STS-BRN-02", "Fine-coal bin nitrogen purging", "brn-coalbin", "STANDBY", [], ["FAULT"], "PLC / DCS status"),
  state("STS-BRN-01", "Fine-coal bin aeration blower", "brn-coalbin", "RUNNING", ["STOPPED"], ["TRIPPED"], "PLC / DCS status"),
  fla("ELE-BRN-03", "Fine-coal bin aeration blower motor current", "brn-coalbin"),
  analog("FLO-BRN-01", "Kiln coal mass flow", "t/h", "brn-coalfeed", 10.5, 0.06, { dec: 2, limit: sp(5, 10), normal: "SP ± 3 %" }),
  analog("PRS-BRN-04", "Coal conveying line pressure", "mbar", "brn-coalfeed", 410, 4, { dec: 0, limit: band(250, 550, undefined, 650), normal: "350–450" }),
  vibr("VIB-BRN-02", "Coal conveying blower vibration", "brn-coalfeed", 2.2, 0.09),
  fla("ELE-BRN-02", "Coal conveying blower motor current", "brn-coalfeed"),
  winding("TMP-BRN-06", "Coal conveying blower motor winding temperature", "brn-coalfeed", 92),
  // Calciner firing and tertiary air (sheet P-5; firing belongs to the burner group).
  analog("FLO-BRN-02", "Calciner coal mass flow", "t/h", "brn-calciner", 14.5, 0.08, { dec: 2, limit: band(11.5, 17.5, 9.5, 19.5), normal: "SP ± 3 %", instrument: "Mass-flow meter" }),
  analog("POS-BRN-01", "Tertiary-air damper opening", "%", "brn-calciner", 65, 0.2, { limit: band(20, 92, 5, 99.5), normal: "55–75", instrument: "Actuator / LVDT / DI" }),
  analog("TMP-BRN-03", "Tertiary-air temperature before damper", "°C", "brn-calciner", 885, 4, { dec: 0, limit: band(800, 1000), normal: "850–950", instrument: "Thermocouple / DCS" }),
  analog("TMP-BRN-07", "Tertiary-air temperature after damper", "°C", "brn-calciner", 880, 4, { dec: 0, limit: band(800, 1000), normal: "850–950", instrument: "Thermocouple / DCS" }),
  analog("PRS-BRN-05", "Tertiary-air duct pressure before damper", "mbar", "brn-calciner", -4.2, 0.06, { dec: 2, limit: band(-8, -1), normal: "−3 … −6", instrument: "Pressure transmitter" }),
  analog("PRS-BRN-06", "Tertiary-air duct pressure after damper", "mbar", "brn-calciner", -5.0, 0.06, { dec: 2, limit: band(-8, -1), normal: "−3 … −6", instrument: "Pressure transmitter" }),

  // ------------------------------------------------------------- CLR-01
  // Motor-driven grate (Rev. 02 HP-05, drive 3 if fitted): stroke rate per drive (conditional points), motor current,
  // vibration and bearing temperature.
  ...[1, 2, 3].flatMap((n) => [
    analog(`SPD-CLR-1${n}`, `Grate ${n} stroke rate`, "/min", "clr-drive", 10.5, 0.06, { dec: 1, limit: band(4, 20), normal: "6–15", instrument: "Stroke counter / PLC (conditional)", conditional: true }),
    analog(`ELE-CLR-1${n}`, `Grate drive ${n} motor current`, "% FLA", "clr-drive", [68, 66, 64][n - 1], 0.5, { dec: 1, limit: band(30, 100, undefined, 110), normal: "50–85" }),
    vibr(`VIB-CLR-1${n}`, `Grate drive ${n} motor vibration`, "clr-drive", [1.6, 1.5, 1.4][n - 1], 0.07),
    brg(`TMP-CLR-3${n}`, `Grate drive ${n} bearing temperature`, "clr-drive", 58),
  ]),
  compartment(1, CLR_BASE[0], "clr-hot", { limit: band(55, 110, 40, 125), normal: "70–95" }),
  compartment(2, CLR_BASE[1], "clr-hot", { limit: band(), normal: "45–60" }),
  compartment(3, CLR_BASE[2], "clr-hot", { limit: band(), normal: "40–55" }),
  compartment(4, CLR_BASE[3], "clr-cold", { limit: band(), normal: "38–50" }),
  compartment(5, CLR_BASE[4], "clr-cold", { limit: band(), normal: "25–35" }),
  compartment(6, CLR_BASE[5], "clr-cold", { limit: band(), normal: "15–25" }),
  ...([1, 2, 3, 4, 5, 6] as const).flatMap((n) => {
    const subId = n <= 3 ? "clr-fans13" : "clr-fans46";
    return [
      brg(`TMP-CLR-0${n}`, `Cooling fan ${n} bearing temperature`, subId, 56),
      vibr(`VIB-CLR-0${n}`, `Cooling fan ${n} vibration`, subId, CLR_FAN_VIB[n - 1]),
      fla(`ELE-CLR-0${n}`, `Cooling fan ${n} motor current`, subId, CLR_FAN_FLA[n - 1]),
      winding(`TMP-CLR-${16 + n}`, `Cooling fan ${n} motor winding temperature`, subId, 88),
      analog(`SPD-CLR-0${n}`, `Cooling fan ${n} speed`, "rpm", subId, CLR_FAN_RPM[n - 1], +(0.003 * CLR_FAN_RPM[n - 1]).toFixed(1), { dec: 0, limit: band(), normal: "per SP", instrument: "Speed sensor / VFD" }),
    ];
  }),
  analog("TMP-CLR-08", "Clinker discharge temperature (IR)", "°C", "clr-discharge", 112, 2, { dec: 0, limit: hi(200, 250), normal: "100–150" }),
  // Vent air line: middle vent → WHRS → ESP → vent exhaust fan → recirculation (Rev. 02 HP-06).
  analog("TMP-CLR-09", "Cooler middle vent temperature (before WHRS)", "°C", "clr-vent", 350, 2.5, { dec: 0, limit: band(250, 450, undefined, 500), normal: "300–400" }),
  analog("TMP-CLR-24", "Cooler vent temperature after WHRS (before ESP)", "°C", "clr-vent", 145, 1.5, { dec: 0, limit: hi(200, 250), normal: "120–170", instrument: "Thermocouple / DCS" }),
  duct("PRS-CLR-21", "Cooler vent ESP inlet pressure", "clr-vent", -12.5, "−10 … −15", 0.15),
  duct("PRS-CLR-22", "Cooler vent ESP outlet pressure", "clr-vent", -18.5, "−16 … −22", 0.15),
  dP("PRS-CLR-20", "Cooler vent ESP differential pressure", "clr-vent", 6, 0.21, band(2, 12, undefined, 15), "4–8"),
  vibr("VIB-CLR-07", "Vent exhaust fan vibration", "clr-vent", 2.2),
  brg("TMP-CLR-10", "Vent exhaust fan bearing temperature", "clr-vent", 64),
  fla("ELE-CLR-07", "Vent exhaust fan motor current", "clr-vent"),
  winding("TMP-CLR-23", "Vent exhaust fan motor winding temperature", "clr-vent", 94),
  analog("TMP-CLR-25", "Recirculated return air temperature", "°C", "clr-vent", 110, 1, { dec: 0, limit: hi(150, 170), normal: "90–130", instrument: "Thermocouple / DCS (conditional)", conditional: true }),

  // ------------------------------------------------------------- HMR-01
  vibr("VIB-HMR-03", "Crusher motor DE vibration", "hmr-motor", 1.8),
  vibr("VIB-HMR-04", "Crusher motor NDE vibration", "hmr-motor", 1.6),
  brg("TMP-HMR-04", "Crusher motor DE bearing temperature", "hmr-motor", 60),
  brg("TMP-HMR-05", "Crusher motor NDE bearing temperature", "hmr-motor", 57),
  winding("TMP-HMR-03", "Crusher motor winding temperature", "hmr-motor", 92),
  analog("ELE-HMR-01", "Crusher motor current", "% FLA", "hmr-motor", 70, 1.1, { dec: 1, limit: band(30, 100, undefined, 115), normal: "50–85" }),
  analog("TMP-HMR-06", "Crusher outlet clinker temperature", "°C", "hmr-rotor", 130, 2, { dec: 0, limit: hi(220, 260), normal: "100–180", instrument: "Thermocouple / IR (DCS)" }),
  analog("VIB-HMR-01", "Rotor DE bearing vibration", "mm/s RMS", "hmr-rotor", 3.1, 0.12, { dec: 2, limit: hi(7.1, 11.2), normal: "2.0–4.5" }),
  analog("VIB-HMR-02", "Rotor NDE bearing vibration", "mm/s RMS", "hmr-rotor", 2.8, 0.12, { dec: 2, limit: hi(7.1, 11.2), normal: "2.0–4.5" }),
  brg("TMP-HMR-01", "Rotor DE bearing temperature", "hmr-rotor", 66),
  brg("TMP-HMR-02", "Rotor NDE bearing temperature", "hmr-rotor", 62),
  zeroSpeed("SPD-HMR-01", "Crusher rotor zero-speed switch", "hmr-rotor"),

  // ------------------------------------------------------------- CSL-01
  analog("TMP-CSL-01", "Pan conveyor clinker temperature", "°C", "csl-conveyor", 120, 2, { dec: 0, limit: hi(220, 260), normal: "100–180", instrument: "Thermocouple / IR (DCS)" }),
  vibr("VIB-CSL-01", "Pan conveyor motor DE vibration", "csl-conveyor", 1.9, 0.07),
  vibr("VIB-CSL-03", "Pan conveyor motor NDE vibration", "csl-conveyor", 1.7, 0.07),
  vibr("VIB-CSL-02", "Pan conveyor head-drive gearbox vibration", "csl-conveyor", 2.0, 0.07),
  brg("TMP-CSL-03", "Pan conveyor motor DE bearing temperature", "csl-conveyor", 58),
  brg("TMP-CSL-04", "Pan conveyor motor NDE bearing temperature", "csl-conveyor", 55),
  winding("TMP-CSL-02", "Pan conveyor motor winding temperature", "csl-conveyor", 92),
  fla("ELE-CSL-01", "Pan conveyor motor current", "csl-conveyor"),
  zeroSpeed("SPD-CSL-01", "Pan conveyor zero-speed switch (tail)", "csl-conveyor"),
  analog("LEV-CSL-01", "Clinker silo level", "%", "csl-silo", 56, 0.2, { limit: band(15, 90, undefined, 95), normal: "30–85" }),
  duct("PRS-CSL-02", "Silo baghouse inlet pressure", "csl-silo", -3, "−2 … −4", 0.1),
  duct("PRS-CSL-03", "Silo baghouse outlet pressure", "csl-silo", -15.5, "−12 … −18", 0.15),
  dP("PRS-CSL-01", "Silo baghouse differential pressure", "csl-silo", 12.5, 0.18, band(4, 18, undefined, 22), "8–15"),
  fla("ELE-CSL-02", "Silo dust collector fan motor current", "csl-silo"),
];

// D5 Table 9.2 alarm matrix (provisional logic) and the OSW-PE-SNL-PYR-01 Rev. 02 set-points (see ./limits).
applyD5Limits(PYRO_SIGNALS);
// D5 §6 / Table 9.1 instrument range, accuracy and sampling (see ./sensor-meta).
applySensorMeta(PYRO_SIGNALS);

export const PYRO_SIGNAL_BY_TAG: Record<string, PyroSignalDef> = Object.fromEntries(PYRO_SIGNALS.map((s) => [s.tag, s]));

/** Calculated / manual entries never come from a wired channel. */
export const isOnline = (s: PyroSignalDef) => s.origin === "online";

/* ------------------------------------------------------------------ */
/* Integrity (fails loudly at import if the catalog drifts from D4)    */
/* ------------------------------------------------------------------ */

{
  const online = PYRO_SIGNALS.filter(isOnline);
  const missing = Object.keys(PYRO_SPEC).filter((t) => !PYRO_SIGNAL_BY_TAG[t]);
  const extra = online.filter((s) => !PYRO_SPEC[s.tag]).map((s) => s.tag);
  const wrongMachine = PYRO_SIGNALS.filter((s) => PYRO_SPEC[s.tag] && idOf(PYRO_SPEC[s.tag].machine) !== s.machine).map((s) => s.tag);
  // The sensor register (OSW-PE-SNL-PYR-01 Rev. 02) is the catalogue of record: every register position is a signal and
  // vice versa, with the register's sub-assembly and class (calculated / manual).
  const notListed = PYRO_SIGNALS.filter((s) => !PYRO_SENSOR_LIST_BY_TAG[s.tag]).map((s) => s.tag);
  const unbuilt = PYRO_SENSOR_LIST.filter((e) => !PYRO_SIGNAL_BY_TAG[e.tag]).map((e) => e.tag);
  const wrongSub = PYRO_SIGNALS.filter((s) => PYRO_SENSOR_LIST_BY_TAG[s.tag] && PYRO_SENSOR_LIST_BY_TAG[s.tag].sub !== s.sub).map((s) => s.tag);
  const wrongClass = PYRO_SIGNALS.filter((s) => {
    const e = PYRO_SENSOR_LIST_BY_TAG[s.tag];
    return e && (e.class === "CALC" ? s.origin !== "calculated" : e.class === "MANUAL" ? s.origin !== "manual" : s.origin !== "online");
  }).map((s) => s.tag);
  const removed = PYRO_SIGNALS.filter((s) => PYRO_REMOVED_TAGS.includes(s.tag)).map((s) => s.tag);
  if (
    PYRO_SIGNALS.length !== PYRO_SENSOR_LIST.length ||
    missing.length ||
    extra.length ||
    wrongMachine.length ||
    notListed.length ||
    unbuilt.length ||
    wrongSub.length ||
    wrongClass.length ||
    removed.length ||
    new Set(PYRO_SIGNALS.map((s) => s.tag)).size !== PYRO_SIGNALS.length
  ) {
    throw new Error(
      `pyro catalog drift: ${PYRO_SIGNALS.length} signals vs ${PYRO_SENSOR_LIST.length} register positions, missing ${missing}, extra ${extra}, machine ${wrongMachine}, not listed ${notListed}, unbuilt ${unbuilt}, sub ${wrongSub}, class ${wrongClass}, removed ${removed}`,
    );
  }
}
