/**
 * Pyro line (FSL-01 … CSL-01) signal catalog for the live demonstration.
 *
 * Source: the OSW-PE-SNL-PYR-01 Rev. 00 sensor list (19 Oct 2026, `sensor-list.ts`):
 * nine machine groups run here as six machines (FSL-01 + KFS-01 = feed system
 * FED-01, PHC-01 + main baghouse BGH-01 = preheater PHC-01, HMR-01 + CSL-01 =
 * clinker transport CCT-01), 223 online signals and two manual records. It builds
 * on D4-OSW-PE-PYR Rev. 02 (verbatim in `spec.ts`), which states that no warning /
 * alarm set-point is approved (§7.2); the sensor list gives none either, so the
 * ranges and limits below are demo values chosen from typical cement-plant practice
 * for a ~5,000 t/d six-stage preheater kiln with calciner, so the simulation has
 * something to judge against. They are not field specifications.
 *
 * Pure data, no React and no server imports.
 */
import { PYRO_SENSOR_LIST, PYRO_SENSOR_LIST_BY_TAG } from "./sensor-list";
import type { LimitRule, Severity } from "../kiln-sim/signals";
import { PYRO_SPEC } from "./spec";
import { applyD5Limits } from "./limits";
import { applySensorMeta } from "./sensor-meta";
import { CLR_BASE } from "./shared";

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
    majorParts: "Silo shell / hopper, outlet gate, aeration header, duty / standby blower; bin / load cells, dosing gate, aeration chamber, meter, bucket elevator drive / speed.",
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
    boundary: "Six cyclone stages (C1 at the top → C6 at the bottom), kiln riser duct, preheater exit gas and induced-draft fan. No calciner firing.",
    majorParts: "Cyclones and cones, gas ducts and meal pipes, riser, exit-gas analyser, ID fan bearings, inlet damper and motor.",
    intent: "Stage heat / draft profile, cone blockage and riser build-up, exit-gas O₂ / CO and ID fan condition.",
    limitations: [
      "D5 Table 5.3.1 / §3.1 place 890–920 °C on the meal to the kiln (TMP-PHC-07, plant value to confirm, D5 Table 13.1 row 2); the C6 gas outlet TMP-PHC-06 runs about 20 K hotter (OSW-PE-SNL-PYR-01 Rev. 01 nominals: meal 830–870 °C, C6 860–890 °C; running ≈ 850 / 866 °C). MOM HOLD (Table B.1 1.2.1): stage identities stay on HOLD; the C1–C6 tap mapping is not confirmed.",
      "MOM HOLD (Table B.1 1.2.2): PRS-PHC-01…09 purge / port HOLD. Tap purge air and port positions are not confirmed, so a draft or cone-pressure change cannot yet be separated from a blocked or unpurged tap.",
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
      "MOM HOLD (Table B.1 1.4.3): LEV-KLN-02…07 oil-bath design HOLD; the bath and switch arrangement is a reference assumption until matched to the real support rollers.",
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
    gate: "The MOM requests secondary-air pressure separately (PRS-BRN-06, HOLD outside the 161); confirm CO vs CO₂ at the coal bin and the burner OEM ports.",
    name: "Main Kiln Burner, Air and Coal Firing",
    shortName: "Kiln burner",
    diagrams: ["D08"],
    diagramType: "kiln-burner",
    area: "kiln",
    boundary: "Main burner at the kiln outlet hood — the only firing point; primary / swirl / axial air, secondary air from the cooler and the kiln coal line. No burner in the preheater.",
    majorParts: "Multi-channel burner and manifold, primary-air fan, flame camera, fine-coal bin, kiln coal feeder, coal conveying blower.",
    intent: "Flame stability, combustion-air evidence, coal feeding and fan / blower health.",
    limitations: [
      "Data gap (MOM 1.13.1, EHS HOLD): GAS-BRN-01 has no analyser-status or sample-health point in the schedule, so analyser validity cannot be checked online, and the gas species (CO vs CO₂) is still open.",
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
    majorParts: "Six assumed bays / fans, hydraulic grate drive, exhaust duct and discharge IR.",
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
  sub("KFS-01", "ELV-KFS-01", "kfs-elevator", "Bucket elevator"),
  sub("PHC-01", "CYC-PHC-01", "phc-upper", "Cyclones C1–C3"),
  sub("PHC-01", "CYC-PHC-01", "phc-lower", "Cyclones C4–C6"),
  sub("PHC-01", "CYC-PHC-01", "phc-riser", "Riser & hot meal"),
  sub("PHC-01", "CYC-PHC-01", "phc-calciner", "Calciner outlet & meal split"),
  sub("PHC-01", "IDF-PHC-01", "phc-idfan", "ID fan & motor"),
  sub("PHC-01", "PRC-PHC-01", "phc-exitgas", "Exit-gas analyser"),
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
  sub("CLR-01", "GRT-CLR-01", "clr-drive", "Grate drive & HPU"),
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
const ROLLER_HI = hi(75, 85);
const VIB_HI = hi(4.5, 7.1);

export const PYRO_SIGNALS: PyroSignalDef[] = [
  // ------------------------------------------------------------- FSL-01
  analog("LEV-FSL-01", "Raw-meal silo level", "%", "fsl-silo", 62, 0.25, { limit: band(25, 92, 15, 96), normal: "40–85" }),
  ...[1, 2, 3, 4, 5, 6].map((n) => state(`POS-FSL-0${n}`, `Air slide ${n} outlet gate open / closed`, "fsl-silo", "OPEN", ["TRAVELLING", "CLOSED"], ["FAULT"], "Limit switches (open / closed)")),
  state("STS-FSL-03", "Air-slide purge sequence step", "fsl-aeration", "SEQUENCE RUN", ["HOLD"], ["FAULT"], "PLC / DCS status"),
  winding("TMP-FSL-01", "Aeration blower motor winding temperature", "fsl-aeration", 84),
  analog("PRS-FSL-02", "Silo dust collector differential pressure", "mbar", "fsl-dc", 11.5, 0.15, { limit: hi(18, 22), normal: "8–15", instrument: "Differential-pressure transmitter" }),
  analog("ELE-FSL-02", "Silo dust-collector fan motor current", "A", "fsl-dc", 34, 0.4, { limit: hi(41, 46), normal: "30–38" }),
  analog("PRS-FSL-01", "Aeration header pressure", "mbar", "fsl-aeration", 420, 3, { dec: 0, limit: band(340, 540, 290, 600), normal: "380–480" }),
  analog("ELE-FSL-01", "Aeration blower motor current", "A", "fsl-aeration", 66, 0.6, { limit: hi(80, 88), normal: "58–74" }),
  state("STS-FSL-02", "Aeration blower duty / standby", "fsl-aeration", "DUTY RUN", ["STANDBY RUN"], ["NOT AVAILABLE"]),

  // ------------------------------------------------------------- KFS-01
  // Kiln feed bin on three load cells, no level sensor (plant confirmation 19 Oct 2026): bin weight = sum of the cells.
  ...[1, 2, 3].map((n) => analog(`WGT-KFS-0${n}`, `Kiln feed bin load cell ${n} (weight)`, "t", "kfs-bin", 23.3, 0.15, { limit: band(12, 34, 8, 36.5), normal: "18–28", instrument: "Load cell" })),
  analog("PRS-KFS-05", "Feed-bin dust collector differential pressure", "mbar", "kfs-bin", 10, 0.15, { limit: hi(18, 22), normal: "7–13", instrument: "Differential-pressure transmitter" }),
  analog("ELE-KFS-03", "Feed-bin dust-collector fan motor current", "A", "kfs-bin", 22, 0.3, { limit: hi(27, 30), normal: "19–25" }),
  state("POS-KFS-01", "Discharge gate A open / closed", "kfs-dosing", "OPEN", ["TRAVELLING", "CLOSED"], ["FAULT"], "Limit switches (open / closed)"),
  state("POS-KFS-02", "Discharge gate B open / closed", "kfs-dosing", "OPEN", ["TRAVELLING", "CLOSED"], ["FAULT"], "Limit switches (open / closed)"),
  analog("PRS-KFS-01", "Air-slide air pressure at bin bottom (P1, slides A + B)", "mbar", "kfs-dosing", 39.2, 0.45, { limit: band(19.6, 63.7, 14.7, 78.5), normal: "29–49", instrument: "Pressure transmitter" }),
  state("STS-KFS-01", "Bin air-slide blower running status", "kfs-dosing", "RUNNING", [], ["STOPPED", "TRIPPED"], "PLC / DCS status"),
  analog("ELE-KFS-02", "Bin air-slide blower motor current", "A", "kfs-dosing", 38, 0.4, { limit: hi(46, 52), normal: "33–43" }),
  // Two solid-flow meters in parallel (slides A and B), each about half the kiln feed; kiln feed = A + B.
  analog("FLO-KFS-01", "Kiln feed mass flow, SFM A", "t/h", "kfs-sfm", 165, 0.8, { dec: 0, limit: sp(5, 10), normal: "155–175", instrument: "Solid-flow meter (impact plate)" }),
  analog("PRS-KFS-02", "SFM A pressure (P2)", "mbar", "kfs-sfm", 0, 0.1, { dec: 2, limit: band(undefined, 1.96, undefined, 3.92), normal: "−0.49 … +0.49", instrument: "Pressure transmitter" }),
  analog("FLO-KFS-02", "Kiln feed mass flow, SFM B", "t/h", "kfs-sfm", 165, 0.8, { dec: 0, limit: sp(5, 10), normal: "155–175", instrument: "Solid-flow meter (impact plate)" }),
  analog("PRS-KFS-06", "SFM B pressure (P3)", "mbar", "kfs-sfm", 0, 0.1, { dec: 2, limit: band(undefined, 1.96, undefined, 3.92), normal: "−0.49 … +0.49", instrument: "Pressure transmitter" }),
  analog("PRS-KFS-04", "Common air slide SFM A/B → elevator pressure", "mbar", "kfs-sfm", 45, 0.5, { limit: band(32, 62, 25, 72), normal: "38–55", instrument: "Pressure transmitter" }),
  state("LEV-KFS-04", "Elevator boot material build-up level", "kfs-elevator", "CLEAR", [], ["HIGH"], "Level switch"),
  state("LIM-KFS-01", "Elevator belt sway / misalignment switch", "kfs-elevator", "OK", [], ["SWAY"], "Belt-sway switch"),
  winding("TMP-KFS-02", "Bucket elevator head motor winding temperature", "kfs-elevator", 86),
  analog("ELE-KFS-01", "Bucket elevator motor current", "A", "kfs-elevator", 118, 1, { dec: 0, limit: hi(148, 162), normal: "105–130" }),
  analog("VIB-KFS-01", "Elevator head drive vibration", "mm/s RMS", "kfs-elevator", 1.8, 0.07, { dec: 2, limit: VIB_HI, normal: "0.8–2.8" }),
  analog("TMP-KFS-01", "Elevator head bearing temperature", "°C", "kfs-elevator", 58, 0.5, { limit: BEARING_HI, normal: "45–70" }),
  analog("SPD-KFS-01", "Elevator head shaft speed", "rpm", "kfs-elevator", 24.5, 0.03, { dec: 2, limit: band(23.3, 25.7, 22), normal: "24.0–25.0" }),

  // ------------------------------------------------------------- PHC-01
  analog("TMP-PHC-01", "C1 gas outlet temperature", "°C", "phc-upper", 330, 1.5, { dec: 0, limit: band(250, 330, undefined, 360), normal: "300–360" }),
  analog("PRS-PHC-01", "C1 / preheater exit draft", "mbar", "phc-upper", -62, 0.5, { limit: band(-78, -48, -85, -40), normal: "−55 … −70" }),
  analog("TMP-PHC-02", "C2 gas outlet temperature", "°C", "phc-upper", 505, 2, { dec: 0, limit: band(430, 530, undefined, 560), normal: "480–530" }),
  analog("PRS-PHC-02", "C2 stage draft", "mbar", "phc-upper", -51, 0.45, { limit: band(-64, -40), normal: "−45 … −57" }),
  analog("TMP-PHC-03", "C3 gas outlet temperature", "°C", "phc-upper", 650, 2.5, { dec: 0, limit: band(580, 680, undefined, 710), normal: "625–675" }),
  analog("PRS-PHC-03", "C3 stage draft", "mbar", "phc-upper", -40, 0.4, { limit: band(-50, -31), normal: "−35 … −45" }),
  analog("TMP-PHC-04", "C4 gas outlet temperature", "°C", "phc-lower", 775, 3, { dec: 0, limit: band(715, 815, undefined, 845), normal: "750–800" }),
  analog("PRS-PHC-04", "C4 stage draft", "mbar", "phc-lower", -30, 0.35, { limit: band(-38, -22), normal: "−26 … −34" }),
  analog("PRS-PHC-07", "C4 cone pressure (purged tap)", "mbar", "phc-lower", -5.9, 0.1, { limit: band(-11.77, -0.98, undefined, 0.98), normal: "−2.9 … −7.8" }),
  analog("TMP-PHC-05", "C5 gas outlet temperature", "°C", "phc-lower", 832, 3, { dec: 0, limit: band(790, 890, undefined, 920), normal: "820–860" }),
  analog("PRS-PHC-05", "C5 stage draft", "mbar", "phc-lower", -21, 0.3, { limit: band(-27, -15), normal: "−18 … −24" }),
  analog("PRS-PHC-08", "C5 cone pressure (purged tap)", "mbar", "phc-lower", -4.9, 0.1, { limit: band(-11.77, -0.98, undefined, 0.98), normal: "−2.9 … −7.8" }),
  // OSW-PE-SNL-PYR-01 Rev. 01: meal to kiln 830–870 °C (TMP-PHC-07); the C6 gas outlet runs ≈ 20 K above the meal and ≈ 20 K
  // below the riser gas (stage identities on HOLD, MOM 1.2.1).
  analog("TMP-PHC-06", "C6 gas outlet temperature", "°C", "phc-lower", 866, 3, { dec: 0, limit: band(830, 920, undefined, 950), normal: "860–890" }),
  analog("PRS-PHC-06", "C6 / riser draft", "mbar", "phc-lower", -11.2, 0.2, { limit: band(-17.65, -3.92, undefined, -1.96), normal: "−5.9 … −11.8" }),
  analog("PRS-PHC-09", "C6 cone pressure (purged tap)", "mbar", "phc-lower", -7, 0.25, { limit: hi(-3, -1), normal: "−5.5 … −8.5" }),
  analog("TMP-PHC-08", "Kiln riser duct gas temperature", "°C", "phc-riser", 892, 3.4, { dec: 0, limit: band(850, 920, 830, 950), normal: "870–900" }),
  analog("TMP-PHC-07", "Hot meal temperature to kiln", "°C", "phc-riser", 850, 3, { dec: 0, limit: band(800, 900, 780, 930), normal: "830–870" }),
  analog("GAS-PHC-01", "Preheater exit O₂", "vol%", "phc-exitgas", 3.6, 0.06, { dec: 2, limit: band(2.2, 5.8, 1.4, 7), normal: "3.0–4.5" }),
  analog("GAS-PHC-02", "Preheater exit CO", "ppm", "phc-exitgas", 300, 18, { dec: 0, limit: hi(1200, 2500), normal: "< 600" }),
  analog("CAL-PHC-01", "Preheater false-air rise (exit − inlet O₂)", "vol%", "phc-exitgas", 1.2, 0.08, { dec: 2, limit: hi(2.0, 2.8), normal: "0.8–1.5", calculated: true, instrument: "Gateway calculation (not a D4 entry)" }),
  analog("POS-PHC-01", "ID fan inlet damper position", "%", "phc-idfan", 82, 0.2, { limit: band(40, 96, undefined, 99.5), normal: "70–90" }),
  analog("VIB-PHC-01", "ID fan DE vibration", "mm/s RMS", "phc-idfan", 2.3, 0.08, { dec: 2, limit: VIB_HI, normal: "1.2–3.2" }),
  analog("VIB-PHC-02", "ID fan NDE vibration", "mm/s RMS", "phc-idfan", 2.0, 0.08, { dec: 2, limit: VIB_HI, normal: "1.0–3.0" }),
  analog("TMP-PHC-09", "ID fan DE bearing temperature", "°C", "phc-idfan", 68, 0.5, { limit: BEARING_HI, normal: "55–78" }),
  analog("TMP-PHC-10", "ID fan NDE bearing temperature", "°C", "phc-idfan", 63, 0.5, { limit: BEARING_HI, normal: "50–74" }),
  analog("ELE-PHC-01", "ID fan motor power", "kW", "phc-idfan", 1850, 9, { dec: 0, limit: hi(2250, 2450), normal: "1,700–2,050" }),
  analog("SPD-PHC-01", "ID fan speed", "rpm", "phc-idfan", 890, 1.2, { dec: 0, limit: band(700, 975, undefined, 995), normal: "850–930" }),
  winding("TMP-PHC-11", "ID fan motor winding temperature", "phc-idfan", 96),
  analog("PRS-PHC-10", "Calciner outlet draft", "mbar", "phc-calciner", -11, 0.2, { limit: band(-15, -7, undefined, -4), normal: "−9 … −13", instrument: "Pressure transmitter" }),
  analog("GAS-PHC-03", "Calciner outlet O₂", "vol%", "phc-calciner", 2.0, 0.06, { dec: 2, limit: band(1.0, 4.0, 0.5), normal: "1.5–3.0", instrument: "Extractive gas analyser" }),
  analog("GAS-PHC-04", "Calciner outlet CO", "ppm", "phc-calciner", 450, 25, { dec: 0, limit: hi(2500, 4500), normal: "< 1,000", instrument: "Extractive gas analyser" }),
  analog("POS-PHC-02", "C5 meal-split gate position (calciner / riser)", "%", "phc-calciner", 70, 0.2, { limit: band(20, 95, 5, 99.5), normal: "60–80", instrument: "Actuator position feedback" }),

  // ------------------------------------------------------------- BGH-01 (main baghouse, run with PHC-01)
  state("STS-BGH-01", "Pulse-cleaning controller status", "bgh-bags", "CLEANING", ["PAUSED"], ["FAULT"], "PLC / DCS status"),
  analog("TMP-BGH-02", "Baghouse inlet gas temperature (bag protection)", "°C", "bgh-bags", 175, 1.5, { dec: 0, limit: hi(220, 240), normal: "150–200", instrument: "Thermocouple" }),
  analog("PRS-BGH-02", "Baghouse inlet draft", "mbar", "bgh-bags", -18, 0.25, { limit: band(-26, -11, undefined, -6), normal: "−15 … −21", instrument: "Pressure transmitter" }),
  analog("PRS-BGH-01", "Baghouse differential pressure across bags", "mbar", "bgh-bags", 14, 0.2, { limit: hi(20, 25), normal: "10–17", instrument: "Differential-pressure transmitter" }),
  state("LEV-BGH-01", "Baghouse dust-hopper level", "bgh-bags", "NORMAL", [], ["HIGH"], "Level switch (status)"),
  analog("ELE-BGH-02", "Dust-discharge airlock / screw motor current", "A", "bgh-bags", 9.5, 0.12, { limit: hi(12, 14), normal: "8–11" }),
  analog("GAS-BGH-01", "Stack dust (existing CEMS, read-only)", "mg/Nm³", "bgh-bags", 12, 0.6, { dec: 1, limit: hi(25, 30), normal: "< 20", instrument: "CEMS (read-only link)" }),
  analog("VIB-BGH-01", "Baghouse fan bearing vibration", "mm/s RMS", "bgh-fan", 2.1, 0.08, { dec: 2, limit: VIB_HI, normal: "1.0–3.0", instrument: "IEPE accelerometer" }),
  analog("TMP-BGH-01", "Baghouse fan bearing temperature", "°C", "bgh-fan", 62, 0.5, { limit: BEARING_HI, normal: "50–72" }),
  analog("ELE-BGH-01", "Baghouse fan motor current", "A", "bgh-fan", 310, 2, { dec: 0, limit: hi(360, 390), normal: "285–335" }),
  analog("SPD-BGH-01", "Baghouse fan speed", "rpm", "bgh-fan", 980, 1.2, { dec: 0, limit: band(800, 1010, undefined, 1030), normal: "950–1,000" }),
  winding("TMP-BGH-03", "Baghouse fan motor winding temperature", "bgh-fan", 92),

  // ------------------------------------------------------------- KLN-01 · drive train
  analog("TMP-KLN-21", "Main motor winding temperature", "°C", "kln-motor", 92, 1.2, { limit: hi(130, 140), normal: "70–110" }),
  analog("ELE-KLN-01", "Kiln drive torque / motor current", "%", "kln-motor", 64, 0.9, { limit: hi(90, 105), normal: "50–78" }),
  analog("TMP-KLN-20", "Main motor NDE bearing temperature", "°C", "kln-motor", 55, 0.6, { limit: BEARING_HI, normal: "45–70" }),
  analog("SPD-KLN-01", "Kiln speed", "rpm", "kln-motor", 3.6, 0.01, { dec: 2, limit: band(2.5, 4.0, 2.0, 4.2), normal: "3.0–4.5" }),
  analog("TMP-KLN-19", "Main motor DE bearing temperature", "°C", "kln-motor", 59, 0.6, { limit: BEARING_HI, normal: "50–75" }),
  analog("VIB-KLN-01", "Main motor DE vibration", "mm/s RMS", "kln-motor", 1.6, 0.08, { dec: 2, limit: VIB_HI, normal: "0.5–2.5" }),
  analog("TMP-KLN-22", "Gearbox input bearing temperature", "°C", "kln-gearbox", 64, 0.6, { limit: hi(90, 100), normal: "55–80" }),
  analog("VIB-KLN-02", "Gearbox input vibration", "mm/s RMS", "kln-gearbox", 1.85, 0.09, { dec: 2, limit: VIB_HI, normal: "0.5–2.5" }),
  analog("VIB-KLN-03", "Gearbox output vibration", "mm/s RMS", "kln-gearbox", 1.51, 0.08, { dec: 2, limit: VIB_HI, normal: "0.5–2.5" }),
  analog("TMP-KLN-23", "Gearbox output bearing temperature", "°C", "kln-gearbox", 62, 0.6, { limit: hi(90, 100), normal: "55–80" }),
  analog("TMP-KLN-15", "Gearbox oil temperature", "°C", "kln-lube", 54, 0.5, { limit: hi(75, 85), normal: "45–65" }),
  analog("PRS-KLN-04", "Gearbox oil supply pressure", "bar", "kln-lube", 2.24, 0.04, { dec: 2, limit: lo(1.2, 0.8), normal: "1.5–3.0" }),
  state("LEV-KLN-01", "Gearbox oil tank level switch", "kln-lube", "LEVEL OK", [], ["LOW LEVEL"]),
  analog("PRS-KLN-05", "Gearbox oil filter differential pressure", "bar", "kln-lube", 0.65, 0.015, { dec: 2, limit: hi(1.4, 2.0), normal: "0.4–0.9" }),
  state("FLO-KLN-05", "Gearbox oil flow switch", "kln-lube", "FLOW OK", [], ["NO FLOW"]),
  analog("LAB-KLN-01", "Gearbox oil laboratory — wear iron (Fe)", "ppm", "kln-lube", 22, 0, { dec: 0, limit: hi(60, 120), normal: "< 40", manual: true, point: "Sample port" }),
  state("STS-KLN-11", "Auxiliary drive status", "kln-aux", "READY", ["NOT READY"]),
  state("LIM-KLN-01", "Auxiliary brake pad wear limit", "kln-aux", "OK", ["WEAR LIMIT"], [], "Wear-limit switch"),
  state("STS-KLN-05", "Girth-gear spray controller", "kln-girth", "OK", [], ["FAULT"]),
  ...[1, 2, 3, 4, 5, 6].map((n) => state(`PRX-KLN-0${n}`, `Spray circuit ${n} metering cycle (HOLD)`, "kln-girth", "CYCLING", [], ["NO CYCLE"], "Divider-cycle proof")),
  analog("VIB-KLN-04", "Pinion vibration, girth-gear side", "mm/s RMS", "kln-girth", 2.33, 0.1, { dec: 2, limit: hi(5.6, 9.0), normal: "0.5–3.5" }),
  state("STS-KLN-12", "Main-drive health and motor cooling fans (DCS)", "kln-motor", "OK", ["COOLING FAN OFF"], ["FAULT"], "PLC / DCS status"),

  // ------------------------------------------------------------- KLN-01 · supports, tyres, thrust
  ...([
    [1, "kln-st1", ["01", "02", "03", "04"], ["02", "03"], 9.0],
    [2, "kln-st2", ["05", "06", "07", "08"], ["04", "05"], 11.0],
    [3, "kln-st3", ["09", "10", "11", "12"], ["06", "07"], 8.0],
  ] as const).flatMap(([n, subId, tmp, lev, mig]) => [
    analog(`TMP-KLN-${tmp[0]}`, `Station ${n} left roller bearing A temperature`, "°C", subId, 52, 0.8, { limit: ROLLER_HI, normal: "40–65" }),
    analog(`TMP-KLN-${tmp[1]}`, `Station ${n} left roller bearing B temperature`, "°C", subId, 53, 0.8, { limit: ROLLER_HI, normal: "40–65" }),
    analog(`TMP-KLN-${tmp[2]}`, `Station ${n} right roller bearing A temperature`, "°C", subId, 52, 0.8, { limit: ROLLER_HI, normal: "40–65" }),
    analog(`TMP-KLN-${tmp[3]}`, `Station ${n} right roller bearing B temperature`, "°C", subId, 53, 0.8, { limit: ROLLER_HI, normal: "40–65" }),
    state(`LEV-KLN-${lev[0]}`, `Station ${n} left roller oil bath level`, subId, "LEVEL OK", [], ["LOW LEVEL"]),
    state(`LEV-KLN-${lev[1]}`, `Station ${n} right roller oil bath level`, subId, "LEVEL OK", [], ["LOW LEVEL"]),
    analog(`MIG-KLN-0${n}`, `Tyre ${n} migration (tyre–shell slip)`, "mm/rev", subId, mig, 0.12, { limit: band(4, 16, 2, 22), normal: "6–13", instrument: "Tyre-shell slip pickup" }),
  ]),
  analog("POS-KLN-01", "Kiln axial position (thrust LVDT)", "mm", "kln-thrust", -3, 0.45, { limit: { kind: "abs", warn: 30, alarm: 40 }, normal: "± 20" }),
  ...[1, 2, 3].map((n) => analog(`TMP-KLN-${27 + n}`, `Tyre ${n} temperature (DCS read-only)`, "°C", `kln-st${n}`, [250, 215, 250][n - 1], 1.2, { dec: 0, limit: hi(350, 400), normal: "200–300", instrument: "DCS read-only temperature" })),
  state("POS-KLN-02", "Thrust travel limit switches", "kln-thrust", "CLEAR", [], ["LIMIT"]),
  analog("PRS-KLN-07", "Thrust hydraulic pressure", "bar", "kln-thrust", 86, 1.6, { dec: 0, limit: band(30, 150, 20, 180), normal: "40–120" }),

  // ------------------------------------------------------------- KLN-01 · shell, inlet, outlet
  analog("TMP-KLN-13", "Kiln inlet gas temperature", "°C", "kln-inlet", 1080, 4, { dec: 0, limit: band(980, 1180, undefined, 1230), normal: "1,040–1,120" }),
  // OSW-PE-SNL-PYR-01 Rev. 01 nominal −7.8 … −14.7 mbar; held at −8.8 so the C6 / riser draft (−11.2, nominal −5.9 … −11.8) stays deeper.
  analog("PRS-KLN-01", "Kiln inlet draft", "mbar", "kln-inlet", -8.8, 0.15, { dec: 2, limit: band(-19.6, -4.9, undefined, -1.96), normal: "−7.8 … −14.7" }),
  analog("GAS-KLN-01", "Kiln inlet O₂", "vol%", "kln-inlet", 2.4, 0.06, { dec: 2, limit: band(1.0, 5.0, 0.5), normal: "1.5–3.5" }),
  analog("GAS-KLN-02", "Kiln inlet CO", "ppm", "kln-inlet", 420, 25, { dec: 0, limit: hi(3000, 5000), normal: "< 1,000" }),
  analog("GAS-KLN-03", "Kiln inlet NOₓ", "ppm", "kln-inlet", 950, 20, { dec: 0, limit: band(400, 1700, undefined, 2100), normal: "700–1,300" }),
  state("STS-KLN-06", "Kiln inlet gas analyser status", "kln-inlet", "OK", ["BLOWBACK"], ["FAULT"]),
  analog("CAL-KLN-06", "Inlet false-air index (O₂ above model)", "vol%", "kln-inlet", 0, 0.06, { dec: 2, limit: hi(0.5, 1.0), normal: "< 0.3", calculated: true, instrument: "Gateway calculation (not a D4 entry)" }),
  // D4 K-K33 is one entry, "STS-KLN-08 / CAL-KLN-03" (R?, Required, scanner data / status, map/status): the scanner
  // status (coverage) and its temperature map. CAL-KLN-03 stays a separate derived value — the map maximum of that
  // same entry — so the register keeps 161 online entries + 4 derived values.
  analog("STS-KLN-08", "Shell scanner status (coverage %)", "%", "kln-shell", 95.9, 0.15, {
    limit: lo(90, 80),
    normal: "≥ 95",
    instrument: "IR shell scanner (K-K33 status + temperature map)",
    scanResolution: "Map every 10 min, values every 1 min; axial / angular resolution not yet captured — pending D5 (MOM 1.10.1)",
  }),
  analog("CAL-KLN-03", "Shell temperature map maximum (K-K33 STS-KLN-08 / CAL-KLN-03)", "°C", "kln-shell", 326, 2.5, {
    dec: 0,
    limit: hi(380, 420),
    normal: "250–340",
    calculated: true,
    point: "K-K33",
    instrument: "IR shell scanner map maximum (D4 K-K33, R?, Required, scanner data)",
  }),
  state("STS-KLN-13", "Shell cooling fans status (DCS)", "kln-shell", "RUNNING", ["STANDBY"], ["FAULT"], "PLC / DCS status"),
  analog("MAN-KLN-01", "Handheld shell scan, 52 m zone", "°C", "kln-shell", 318, 0, { dec: 0, limit: hi(380, 420), normal: "250–340", manual: true, point: "Handheld" }),
  analog("TMP-KLN-14", "Burning-zone temperature (pyrometer)", "°C", "kln-outlet", 1300, 5, { dec: 0, limit: band(1200, 1400, 1150, 1450), normal: "1,250–1,350", instrument: "Two-colour pyrometer" }),
  analog("TMP-KLN-27", "Kiln hood temperature", "°C", "kln-outlet", 1030, 4, { dec: 0, limit: band(880, 1150, undefined, 1220), normal: "960–1,100" }),
  analog("PRS-KLN-03", "Kiln hood pressure", "mbar", "kln-outlet", -0.147, 0.012, { dec: 3, limit: band(-0.49, 0, undefined, 0.098), normal: "−0.098 … −0.196" }),
  analog("TMP-KLN-25", "Outlet sector-plate cooling-air temperature", "°C", "kln-outlet", 90, 1, { limit: hi(150, 180), normal: "60–120" }),
  analog("TMP-KLN-26", "Cooling shroud (cow shell) surface temperature", "°C", "kln-outlet", 250, 2, { dec: 0, limit: hi(350, 400), normal: "200–300" }),

  // ------------------------------------------------------------- BRN-01
  state("CAM-BRN-01", "Flame-view camera feed (operator visual evidence)", "brn-burner", "FEED LIVE", [], ["FEED LOST"], "Protected flame camera (video stream)"),
  analog("PRS-BRN-01", "Swirl (helical) air pressure", "mbar", "brn-burner", 65, 0.5, { dec: 0, limit: band(20, 150, undefined, 200), normal: "30–100" }),
  analog("PRS-BRN-02", "Axial (jet) air pressure", "mbar", "brn-burner", 625, 4, { dec: 0, limit: band(450, 800, undefined, 900), normal: "550–700" }),
  analog("TMP-BRN-02", "Secondary air temperature", "°C", "brn-burner", 1100, 5, { dec: 0, limit: band(950, 1200, undefined, 1250), normal: "1,050–1,150" }),
  analog("PRS-BRN-03", "Primary-air header pressure", "mbar", "brn-pafan", 675, 4, { dec: 0, limit: band(500, 850, 400, 950), normal: "600–750" }),
  analog("VIB-BRN-01", "Primary-air fan vibration", "mm/s RMS", "brn-pafan", 1.9, 0.07, { dec: 2, limit: VIB_HI, normal: "1.0–2.8" }),
  analog("TMP-BRN-01", "Primary-air fan bearing temperature", "°C", "brn-pafan", 60, 0.5, { limit: BEARING_HI, normal: "48–70" }),
  analog("ELE-BRN-01", "Primary-air fan motor current", "A", "brn-pafan", 142, 1, { dec: 0, limit: hi(170, 185), normal: "130–155" }),
  winding("TMP-BRN-05", "Primary-air fan motor winding temperature", "brn-pafan", 88),
  analog("TMP-BRN-04", "Fine-coal bin temperature", "°C", "brn-coalbin", 56, 0.3, { limit: hi(70, 80), normal: "45–62" }),
  // D4 unit "vol%/ppm": ppm if the species is CO, vol% if CO₂ (EHS HOLD, MOM 1.13.1). Simulated values follow a CO-type ppm scale.
  analog("GAS-BRN-01", "Fine-coal bin CO / CO₂ indication (species pending)", "ppm / vol%", "brn-coalbin", 18, 2, { dec: 0, limit: hi(80, 200), normal: "< 40" }),
  analog("LEV-BRN-01", "Fine-coal bin level", "%", "brn-coalbin", 64, 0.3, { limit: band(25, 90, 15, 95), normal: "40–80" }),
  analog("FLO-BRN-01", "Kiln coal mass flow", "t/h", "brn-coalfeed", 10.5, 0.06, { dec: 2, limit: sp(5, 10), normal: "9–12" }),
  analog("PRS-BRN-04", "Coal conveying line pressure", "mbar", "brn-coalfeed", 410, 4, { dec: 0, limit: band(300, 540, 250, 620), normal: "370–450" }),
  analog("VIB-BRN-02", "Coal conveying blower vibration", "mm/s RMS", "brn-coalfeed", 2.6, 0.09, { dec: 2, limit: hi(6.3, 9.0), normal: "1.5–3.5" }),
  analog("ELE-BRN-02", "Coal conveying blower current", "A", "brn-coalfeed", 205, 1.5, { dec: 0, limit: hi(245, 265), normal: "190–220" }),
  winding("TMP-BRN-06", "Coal conveying blower motor winding temperature", "brn-coalfeed", 92),
  // Calciner firing and tertiary air (sheet P-5; firing belongs to the burner group).
  analog("FLO-BRN-02", "Calciner coal mass flow", "t/h", "brn-calciner", 14.5, 0.08, { dec: 2, limit: band(11.5, 17.5, 9.5, 19.5), normal: "13–16", instrument: "Mass-flow meter" }),
  analog("POS-BRN-01", "Tertiary-air damper position", "%", "brn-calciner", 65, 0.2, { limit: band(20, 92, 5, 99.5), normal: "55–75", instrument: "Actuator / LVDT / DI" }),
  analog("TMP-BRN-03", "Tertiary-air temperature", "°C", "brn-calciner", 880, 4, { dec: 0, limit: band(720, 980, 650, 1040), normal: "820–940", instrument: "Thermocouple / DCS" }),
  analog("PRS-BRN-05", "Tertiary-air duct pressure", "mbar", "brn-calciner", -3.43, 0.06, { dec: 2, limit: band(-7.85, -0.49, undefined, 0.49), normal: "−2.0 … −4.9", instrument: "Pressure transmitter" }),
  analog("CAL-BRN-01", "Coal-to-feed ratio", "%", "brn-coalfeed", 3.18, 0.025, { dec: 2, limit: band(2.9, 3.5, undefined, 3.8), normal: "3.0–3.4", calculated: true, instrument: "Gateway calculation (not a D4 entry)" }),

  // ------------------------------------------------------------- CLR-01
  compartment(1, CLR_BASE[0], "clr-hot"),
  compartment(2, CLR_BASE[1], "clr-hot", { limit: band(37.3, 70.6, undefined, 78.5), normal: "49–64" }),
  compartment(3, CLR_BASE[2], "clr-hot", { limit: band(29.4, 60.8, undefined, 68.6), normal: "39–54" }),
  compartment(4, CLR_BASE[3], "clr-cold"),
  compartment(5, CLR_BASE[4], "clr-cold", { limit: band(17.7, 41.2, undefined, 47.1), normal: "25–34" }),
  compartment(6, CLR_BASE[5], "clr-cold", { limit: band(9.8, 29.4, undefined, 34.3), normal: "15–25" }),
  ...([1, 2, 3] as const).flatMap((n) => [
    analog(`TMP-CLR-0${n}`, `Cooling fan ${n} bearing temperature`, "°C", "clr-fans13", 56, 0.5, { limit: BEARING_HI, normal: "45–68" }),
    analog(`VIB-CLR-0${n}`, `Cooling fan ${n} vibration`, "mm/s RMS", "clr-fans13", [2.1, 2.4, 1.9][n - 1], 0.08, { dec: 2, limit: VIB_HI, normal: "1.0–3.2" }),
    analog(`ELE-CLR-0${n}`, `Cooling fan ${n} motor current`, "A", "clr-fans13", [215, 196, 172][n - 1], 1.2, {
      dec: 0,
      limit: hi(Math.round([215, 196, 172][n - 1] * 1.15), Math.round([215, 196, 172][n - 1] * 1.25)),
      normal: `${Math.round([215, 196, 172][n - 1] * 0.9)}–${Math.round([215, 196, 172][n - 1] * 1.08)}`,
    }),
  ]),
  ...([4, 5, 6] as const).flatMap((n) => [
    analog(`TMP-CLR-0${n}`, `Cooling fan ${n} bearing temperature`, "°C", "clr-fans46", 54, 0.5, { limit: BEARING_HI, normal: "45–66" }),
    analog(`ELE-CLR-0${n}`, `Cooling fan ${n} motor current`, "A", "clr-fans46", [148, 126, 104][n - 4], 1, {
      dec: 0,
      limit: hi(Math.round([148, 126, 104][n - 4] * 1.15), Math.round([148, 126, 104][n - 4] * 1.25)),
      normal: `${Math.round([148, 126, 104][n - 4] * 0.9)}–${Math.round([148, 126, 104][n - 4] * 1.08)}`,
    }),
  ]),
  ...[1, 2, 3, 4, 5, 6].map((n) =>
    // Hoppers 3–6 at the OSW-PE-SNL-PYR-01 Rev. 01 nominal mid-point (80–150 °C, H 250 / HH 350).
    analog(`TMP-CLR-${10 + n}`, `Under-grate hopper ${n} temperature (DCS read-only)`, "°C", n <= 3 ? "clr-hot" : "clr-cold", [95, 86, 115, 115, 115, 115][n - 1], 1, {
      dec: 0,
      limit: n <= 2 ? hi(150, 200) : hi(250, 350),
      normal: n <= 2 ? "70–120" : "80–150",
      instrument: "DCS read-only temperature",
    }),
  ),
  ...[1, 2, 3, 4, 5, 6].map((n) => winding(`TMP-CLR-${16 + n}`, `Cooling fan ${n} motor winding temperature`, n <= 3 ? "clr-fans13" : "clr-fans46", 86)),
  state("STS-CLR-01", "Cooler grease-lube pumps status (DCS)", "clr-drive", "RUNNING", ["LOW GREASE"], ["FAULT"], "PLC / DCS status"),
  analog("SPD-CLR-01", "Grate stroke rate", "stroke/min", "clr-drive", 10.5, 0.08, { limit: band(6, 17, 4, 20), normal: "8–14" }),
  analog("PRS-CLR-07", "Grate hydraulic working pressure", "bar", "clr-drive", 118, 1.2, { dec: 0, limit: band(70, 175, undefined, 205), normal: "95–140" }),
  analog("TMP-CLR-07", "Grate hydraulic oil temperature", "°C", "clr-drive", 48, 0.4, { limit: hi(62, 72), normal: "40–55" }),
  analog("TMP-CLR-08", "Clinker discharge temperature (IR)", "°C", "clr-discharge", 112, 2, { dec: 0, limit: hi(160, 200), normal: "90–135" }),
  analog("TMP-CLR-09", "Cooler exhaust gas temperature", "°C", "clr-vent", 255, 2.5, { dec: 0, limit: hi(320, 370), normal: "220–290" }),
  analog("VIB-CLR-07", "Vent fan vibration", "mm/s RMS", "clr-vent", 2.2, 0.08, { dec: 2, limit: VIB_HI, normal: "1.0–3.2" }),
  analog("TMP-CLR-10", "Vent fan bearing temperature", "°C", "clr-vent", 64, 0.5, { limit: BEARING_HI, normal: "50–74" }),
  analog("ELE-CLR-07", "Vent fan motor current", "A", "clr-vent", 385, 2.5, { dec: 0, limit: hi(440, 470), normal: "350–410" }),
  winding("TMP-CLR-23", "Vent fan motor winding temperature", "clr-vent", 94),

  // ------------------------------------------------------------- HMR-01
  analog("TMP-HMR-03", "Crusher motor winding temperature", "°C", "hmr-motor", 82, 0.8, { limit: hi(130, 140), normal: "65–100" }),
  analog("ELE-HMR-01", "Crusher motor current", "A", "hmr-motor", 96, 1.5, { dec: 0, limit: hi(135, 155), normal: "80–110" }),
  analog("VIB-HMR-01", "Rotor DE bearing vibration", "mm/s RMS", "hmr-rotor", 3.1, 0.12, { dec: 2, limit: hi(7.1, 11.0), normal: "2.0–4.5" }),
  analog("VIB-HMR-02", "Rotor NDE bearing vibration", "mm/s RMS", "hmr-rotor", 2.8, 0.12, { dec: 2, limit: hi(7.1, 11.0), normal: "1.8–4.2" }),
  analog("TMP-HMR-01", "Rotor DE bearing temperature", "°C", "hmr-rotor", 66, 0.5, { limit: BEARING_HI, normal: "52–76" }),
  analog("TMP-HMR-02", "Rotor NDE bearing temperature", "°C", "hmr-rotor", 62, 0.5, { limit: BEARING_HI, normal: "50–72" }),
  analog("SPD-HMR-01", "Crusher rotor speed", "rpm", "hmr-rotor", 345, 0.6, { dec: 0, limit: band(325, 360, 300), normal: "338–352" }),

  // ------------------------------------------------------------- CSL-01
  analog("VIB-CSL-01", "Pan conveyor drive vibration", "mm/s RMS", "csl-conveyor", 1.9, 0.07, { dec: 2, limit: VIB_HI, normal: "1.0–2.8" }),
  analog("ELE-CSL-01", "Pan conveyor motor current", "A", "csl-conveyor", 74, 0.8, { dec: 0, limit: hi(95, 108), normal: "65–85" }),
  analog("SPD-CSL-01", "Pan conveyor chain speed (tail shaft)", "rpm", "csl-conveyor", 6.2, 0.02, { dec: 2, limit: band(5.6, undefined, 4.0), normal: "6.0–6.4" }),
  winding("TMP-CSL-02", "Pan conveyor motor winding temperature", "csl-conveyor", 80),
  analog("PRS-CSL-01", "Silo baghouse differential pressure", "mbar", "csl-silo", 12.5, 0.15, { limit: hi(18, 22), normal: "9–15" }),
  analog("ELE-CSL-02", "Dust collector fan motor current", "A", "csl-silo", 58, 0.5, { limit: band(42, 70, 30, 78), normal: "52–64" }),
  analog("LEV-CSL-01", "Clinker silo level", "%", "csl-silo", 56, 0.2, { limit: band(12, 88, undefined, 94), normal: "30–80" }),
];

// D5 Table 9.2 alarm matrix (provisional logic) over the demo limits above (see ./limits).
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
  const wrongMachine = online.filter((s) => idOf(PYRO_SPEC[s.tag]?.machine ?? "") !== s.machine).map((s) => s.tag);
  // The sensor list (OSW-PE-SNL-PYR-01 Rev. 00) is the register of record: 223 online + 2 manual points.
  const listed = PYRO_SENSOR_LIST.filter((e) => e.status !== "MANUAL").map((e) => e.tag);
  const notListed = online.filter((s) => !PYRO_SENSOR_LIST_BY_TAG[s.tag]).map((s) => s.tag);
  const unbuilt = listed.filter((t) => !PYRO_SIGNAL_BY_TAG[t]);
  if (online.length !== 223 || missing.length || extra.length || wrongMachine.length || notListed.length || unbuilt.length || new Set(PYRO_SIGNALS.map((s) => s.tag)).size !== PYRO_SIGNALS.length) {
    throw new Error(`pyro catalog drift: online ${online.length}, missing ${missing}, extra ${extra}, machine ${wrongMachine}, not listed ${notListed}, unbuilt ${unbuilt}`);
  }
}
