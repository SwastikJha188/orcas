import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { PYRO_MACHINES, PYRO_SIGNALS, PYRO_SUBASSEMBLIES, PYRO_SYSTEMS, type PyroSignalDef } from "@/lib/pyro-sim/signals";
import { PYRO_SPEC } from "@/lib/pyro-sim/spec";
import { PYRO_D5_LIMITS } from "@/lib/pyro-sim/limits";
import { describeLimit, limitBand } from "@/lib/kiln-sim/signals";
import { PYRO_RULES } from "@/lib/pyro-sim/rules";
import { CLASS_META, DAQ_NODES, DAQ_NODE_OF_TAG, rangeInfoOf, sensorClassOf } from "@/lib/pyro-sim/sensor-meta";
import { PYRO_LAYOUT } from "@/components/assets/pyro/pyro-layout";

/**
 * The full pyro line (D4-OSW-PE-PYR Rev. 02) in the 3NF database, with its own
 * plant, hierarchy, six machines, systems, sub-assemblies, 167 sensors
 * (161 online + 4 calculated + 2 manual records), its edge acquisition
 * registry and a plant user scoped to it.
 *
 * D4 Rev. 02 is a proposal, not an approved design: source codes keep their
 * Table 4.3 qualifier (R? not verified, N? not approved), limits are marked
 * demo (§7.2) and nameplates / plant tags are pending. Sampling, accuracy,
 * range and the vibration DAQ allocation follow D5-OSW-PE-PYR Rev. 00
 * (Tables 6.1–6.17, 7.1, 7.2, 8.2, 9.1; per-tag ranges without a D5 figure are
 * marked provisional); register addresses wait for the D3 walkdown.
 *
 * Idempotent and non-destructive for everything else: it rebuilds only rows
 * the pyro line owns (plant-pyro, PYR-* machines, gw-pyro-* gateways) and
 * never touches the kiln fleet, other gateways or brokers.
 */

export const PYRO_PLANT_ID = "plant-pyro";
export const PYRO_USER_ID = "usr-pyro";
const MACHINE_IDS = PYRO_MACHINES.map((m) => m.id);

/** Every drawing type the catalog accepts (the pyro line and VPC 066 add their own). */
export const DIAGRAM_TYPES = ["mill", "crusher", "pump", "blower", "kiln", "vpc-casting", ...new Set(PYRO_MACHINES.map((m) => m.diagramType))];

const PLANT = {
  id: PYRO_PLANT_ID,
  code: "CEM-PYR-01",
  name: "Cement Plant",
  shortName: "Cement Plant",
  region: "Lusaka South Industrial Zone",
  location: "Pyroprocessing & clinker line, Lusaka, Zambia",
  coordinates: "14°58'12\"S 28°14'45\"E",
  timeZone: "Africa/Lusaka",
  status: "Advisory",
  description:
    "One cement plant, one pyroprocessing & clinker line from the raw-meal feed silo to the clinker silo: FSL-01 → KFS-01 → PHC-01 → KLN-01 → BRN-01 → CLR-01 → HMR-01 → CSL-01. Six-stage preheater without calciner firing, single main burner at the kiln outlet. Monitored to D4-OSW-PE-PYR Rev. 02 (161 online entries, 11 machine diagrams).",
  commissionedYear: 2021,
  designCapacity: "≈ 5,000 t/d clinker · 330 t/h kiln feed (D5 310–350 t/h)",
};

const USER = {
  id: PYRO_USER_ID,
  email: "thandiwe.phiri@ultron.industrial",
  fullName: "Thandiwe Phiri",
  title: "Pyro Line Process Engineer",
  department: "Clinker Production — Pyro Line",
  // Reliability role: scoped to its plant (plant-manager and admin roles see every plant).
  roleId: "role-reliability",
  avatarInitials: "TP",
  phone: "+260 97 800 3301",
  shift: "Day Shift (06:00–18:00)",
  status: "Active",
};

/** One line: the six machines in process order (D4 Figure 4.1; feed system and clinker transport each merge two D4 groups). */
const LINE = {
  id: "area-pyro-line",
  name: "Pyroprocessing & clinker line",
  machines: ["PYR-FED-01", "PYR-PHC-01", "PYR-KLN-01", "PYR-BRN-01", "PYR-CLR-01", "PYR-CCT-01"],
};
const AREAS = [{ id: LINE.id, name: LINE.name, groups: [{ id: LINE.id, name: LINE.name, machines: LINE.machines }] }];

/**
 * Machine identity. D4 gives no nameplate data (manufacturer, model, serial,
 * rating, speed, commissioning date), so every nameplate field is "TBC" until
 * the plant asset register is supplied. Only the area (from the D4 process
 * description) and the ULTRON criticality class are recorded.
 */
const TBC = "TBC — nameplate pending (plant asset register)";
const IDENTITY: Record<string, { bay: string; criticality: string }> = {
  "PYR-FED-01": { bay: "Raw-meal feed silo and kiln feed tower", criticality: "B (Essential)" },
  "PYR-PHC-01": { bay: "Preheater tower", criticality: "A (Critical)" },
  "PYR-KLN-01": { bay: "Kiln line", criticality: "A (Critical)" },
  "PYR-BRN-01": { bay: "Kiln outlet hood (burner platform)", criticality: "A (Critical)" },
  "PYR-CLR-01": { bay: "Clinker cooler", criticality: "A (Critical)" },
  "PYR-CCT-01": { bay: "Cooler discharge, clinker transport & silo", criticality: "B (Essential)" },
};

/** D4 Table 4.3 source codes, stored with their qualifier: none of them is a verified, installed device. */
const SOURCE_LABEL: Record<string, string> = {
  "R?": "Existing — R?, not verified",
  "N?": "New — N?, not approved",
  "R/N?": "Existing / New — R/N?, to be established",
};

/** No D5 register map exists for the pyro line; the channel allocation below is a proposal only. */
const REGISTER_PENDING = "pending D3 walkdown (D5 Table 13.1)";
const PLANT_TAG_PENDING = "pending plant tag list";
const ALLOCATION_NOTE = "allocation per D5 Tables 6.x / 7.2 — addresses pending the D3 walkdown (D5 Table 13.1)";

/** Network security zones (IEC 62443 / Purdue levels), proposed until the D5 network design. */
const ZONE = {
  gateway: "Level 3 — site DMZ (proposed)",
  dcs: "Level 2 — DCS / control (proposed)",
  plc: "Level 2 — PLC / control (proposed)",
  scanner: "Level 2 — scanner server network (proposed)",
  video: "Level 2 — camera / CCTV network (proposed)",
  daq: "Level 1 — field I/O, ULTRON DAQ (proposed)",
};

/* ------------------------------------------------------------------ */
/* Sensor engineering text                                             */
/* ------------------------------------------------------------------ */

/** Demo limits (D4 §7.2: no warning / alarm set-point is plant-approved): the strings say so. */
type LimitText = {
  normal: string;
  warning: string;
  alarm: string;
  /** High side (or the only side) — the existing warning_val / alarm_val columns. */
  warningVal: number;
  alarmVal: number;
  /** Low side of a two-sided limit (band, |x|) or a low-only limit; null otherwise. */
  warningLoVal: number | null;
  alarmLoVal: number | null;
  /** High-side alert / danger for the edge point (compared value ≥ limit); null when there is no high side. */
  pointAlert: number | null;
  pointDanger: number | null;
};

function limitText(s: PyroSignalDef): LimitText {
  const t = limitTextRaw(s);
  // D5 Table 9.2 rows are provisional logic, the rest demo values (D4 §7.2: nothing is plant-approved).
  const tagged = (v: string) => (v === "—" ? v : `${v} · ${PYRO_D5_LIMITS[s.tag] ? "provisional (D5)" : "demo"}`);
  const d5 = PYRO_D5_LIMITS[s.tag];
  return { ...t, normal: d5 ? `${t.normal} · ${d5.normal}` : t.normal, warning: tagged(t.warning), alarm: tagged(t.alarm) };
}

/** `standard` column: where the final limit comes from (D5 Table 9.2) and that it is not approved. */
function limitStandard(s: PyroSignalDef): string {
  const d5 = PYRO_D5_LIMITS[s.tag];
  return d5 ? `Provisional (D5 Table 9.2) — final from ${d5.source}; D4 §7.2: OEM / plant approval pending` : "Demo limit — D4 §7.2: OEM / plant approval pending";
}

const NO_SIDES = { warningLoVal: null, alarmLoVal: null, pointAlert: null, pointDanger: null };

function limitTextRaw(s: PyroSignalDef): LimitText {
  const u = s.unit === "state" ? "" : ` ${s.unit}`;
  const l = s.limit;
  const normal = s.normalBand ? `${s.normalBand}${s.type === "state" ? "" : u} (Nominal, demo)` : "Nominal";
  if (s.type === "state") {
    return {
      normal: `${s.states?.normal ?? "OK"} (Normal state)`,
      warning: s.states?.warn?.length ? `${s.states.warn.join(" / ")} (Alert state)` : "—",
      alarm: s.states?.alarm?.length ? `${s.states.alarm.join(" / ")} (Danger state)` : "—",
      warningVal: 0,
      alarmVal: 0,
      ...NO_SIDES,
    };
  }
  if (!l) return { normal, warning: "—", alarm: "—", warningVal: 0, alarmVal: 0, ...NO_SIDES };
  switch (l.kind) {
    case "hi":
      return { normal, warning: `≥ ${l.warn}${u} (Alert)`, alarm: `≥ ${l.alarm}${u} (Danger)`, warningVal: l.warn, alarmVal: l.alarm, warningLoVal: null, alarmLoVal: null, pointAlert: l.warn, pointDanger: l.alarm };
    case "lo":
      return { normal, warning: `≤ ${l.warn}${u} (Alert)`, alarm: `≤ ${l.alarm}${u} (Danger)`, warningVal: l.warn, alarmVal: l.alarm, warningLoVal: l.warn, alarmLoVal: l.alarm, pointAlert: null, pointDanger: null };
    case "abs":
      return { normal, warning: `|x| ≥ ${l.warn}${u} (Alert)`, alarm: `|x| ≥ ${l.alarm}${u} (Danger)`, warningVal: l.warn, alarmVal: l.alarm, warningLoVal: -l.warn, alarmLoVal: -l.alarm, pointAlert: l.warn, pointDanger: l.alarm };
    case "setpoint":
      return {
        normal,
        warning: `± ${l.warnPct} % of set-point (Alert)`,
        alarm: `± ${l.alarmPct} % of set-point (Danger)`,
        warningVal: +(s.base * (1 + l.warnPct / 100)).toFixed(2),
        alarmVal: +(s.base * (1 + l.alarmPct / 100)).toFixed(2),
        warningLoVal: +(s.base * (1 - l.warnPct / 100)).toFixed(2),
        alarmLoVal: +(s.base * (1 - l.alarmPct / 100)).toFixed(2),
        pointAlert: +(s.base * (1 + l.warnPct / 100)).toFixed(2),
        pointDanger: +(s.base * (1 + l.alarmPct / 100)).toFixed(2),
      };
    case "band": {
      const w = [l.warnLo !== undefined ? `≤ ${l.warnLo}` : null, l.warnHi !== undefined ? `≥ ${l.warnHi}` : null].filter(Boolean).join(" or ");
      const a = [l.alarmLo !== undefined ? `≤ ${l.alarmLo}` : null, l.alarmHi !== undefined ? `≥ ${l.alarmHi}` : null].filter(Boolean).join(" or ");
      return {
        normal,
        warning: w ? `${w}${u} (Alert)` : "—",
        alarm: a ? `${a}${u} (Danger)` : "—",
        // Both sides are persisted: high side in warning_val / alarm_val (never mixed with
        // the low side), low side in warning_lo_val / alarm_lo_val, both in the text.
        warningVal: l.warnHi ?? l.alarmHi ?? l.warnLo ?? l.alarmLo ?? 0,
        alarmVal: l.warnHi !== undefined || l.alarmHi !== undefined ? (l.alarmHi ?? l.warnHi ?? 0) : (l.alarmLo ?? l.warnLo ?? 0),
        warningLoVal: l.warnLo ?? null,
        alarmLoVal: l.alarmLo ?? null,
        pointAlert: l.warnHi ?? null,
        pointDanger: l.alarmHi ?? null,
      };
    }
    default: {
      // Relative limits (D5 Table 9.2): the logic in words; values at the design point, where the reference model sits.
      const d = describeLimit(l, s.unit);
      const b = limitBand(l, s.base) ?? {};
      const hiSide = b.warnHi !== undefined || b.alarmHi !== undefined;
      return {
        normal,
        warning: d.warning === "—" ? "—" : `${d.warning} (Alert)`,
        alarm: d.alarm === "—" ? "—" : `${d.alarm} (Danger)`,
        warningVal: +(hiSide ? (b.warnHi ?? b.alarmHi ?? 0) : (b.warnLo ?? b.alarmLo ?? 0)).toFixed(4),
        alarmVal: +(hiSide ? (b.alarmHi ?? b.warnHi ?? 0) : (b.alarmLo ?? b.warnLo ?? 0)).toFixed(4),
        warningLoVal: b.warnLo ?? null,
        alarmLoVal: b.alarmLo ?? null,
        pointAlert: b.warnHi ?? null,
        pointDanger: b.alarmHi ?? null,
      };
    }
  }
}

/**
 * Acquisition cadence: D5 Table 9.1 sampling per signal (Tables 6.x / 8.2
 * detail). Worded so the register's rate parser reads the acquisition rate;
 * every value reaches the server as a 1-min value (D5 Table 8.2).
 */
function sampleRate(s: PyroSignalDef): string {
  const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
  if (s.origin === "manual") return s.sampling ?? "On entry";
  if (s.tag === SCANNER_MAX) return "Values every 60 s from the 10-min map (scan 2–5 s; D5 Table 9.1)";
  if (s.origin === "calculated") return "1 min (gateway calculation)";
  const cls = sensorClassOf(s);
  if (!cls) return "1 min";
  if (cls === "camera") return "Stream; snapshot every 60 s to ULTRON (D5 Table 9.1)";
  if (cls === "scanner") return "Scan 2–5 s; values every 60 s, map 10-min (D5 Table 9.1)";
  if (cls === "spray") return "Per spray cycle, on change (D5 Table 9.1)";
  if (cls === "migration") {
    const rpm = PYRO_SIGNALS.find((x) => x.tag === "SPD-KLN-01")?.base ?? 3.2;
    return `Per kiln revolution (≈ ${Math.round(60 / rpm)} s at ${rpm} rpm; D5 Table 9.1)`;
  }
  if (cls === "gas") return "5 s; held during blowback (D5 Tables 6.6 / 9.1)";
  return `${cap(CLASS_META[cls].sampling)} (D5 Table 9.1)`;
}

/**
 * CAL-KLN-03 is the map maximum of the single D4 entry K-K33 "STS-KLN-08 /
 * CAL-KLN-03" (scanner data, R?, Required). It stays a separate sensor row
 * (167 = 161 online + 4 derived + 2 manual) but is never a gateway calculation.
 */
const SCANNER_MAX = "CAL-KLN-03";
const SCANNER_MAX_ROW = {
  source: "R? — K-K33 (STS-KLN-08 / CAL-KLN-03)",
  priority: "Required",
  sensorType: "Scanner map maximum (part of K-K33)",
};

/** Edge point value type: the flame camera is a video stream, the shell scanner a status plus a map. */
function dataType(s: PyroSignalDef): string {
  if (s.tag === "CAM-BRN-01") return "video";
  if (s.tag === "STS-KLN-08") return "status+map";
  return s.type === "state" ? "bool" : "float";
}

const num = (v: number) => (v < 0 ? `−${Math.abs(v).toLocaleString("en-GB")}` : v.toLocaleString("en-GB"));

/**
 * Accuracy and calibrated range from the D5 sensor specification sheets
 * (Tables 6.1–6.17, via sensor-meta). Where D5 gives the range per tag / drive
 * / vessel without a figure, the range is a provisional demo scaling and says so.
 */
function accuracy(s: PyroSignalDef): { accuracy: string; range: string } {
  const cls = sensorClassOf(s);
  const r = rangeInfoOf(s);
  const unit = s.unit === "state" ? "" : ` ${s.unit}`;
  const range = r ? `${num(r.range[0])} … ${num(r.range[1])}${unit} (D5 Table ${CLASS_META[cls ?? "scanner"].table}${r.provisional ? ", provisional scaling" : ""})` : "—";
  if (s.tag === SCANNER_MAX) return { accuracy: `${CLASS_META.scanner.accuracy} (D5 Table 6.14)`, range };
  if (s.origin === "calculated") return { accuracy: "Derived", range: "—" };
  if (s.origin === "manual") return { accuracy: "Per method", range: "—" };
  if (!cls) return { accuracy: "—", range: "—" };
  const acc = s.accuracy && s.accuracy !== "—" ? `${s.accuracy} (D5 Table ${CLASS_META[cls].table})` : "—";
  if (s.tag === "STS-KLN-06") return { accuracy: acc, range: "States: OK / BLOWBACK (values held, D5 Table 6.6) / FAULT" };
  if (s.type === "state") return { accuracy: acc, range: s.states ? `States: ${[s.states.normal, ...(s.states.warn ?? []), ...(s.states.alarm ?? [])].join(" / ")}` : "—" };
  return { accuracy: acc, range };
}

/** Speed pickups (driven-shaft / tail-shaft pulse sensors, D4 location) — not VFD data points. */
const PULSE_TAGS = new Set(["SPD-HMR-01", "SPD-CSL-01"]);

/**
 * Acquisition card family (module) of a signal per D5 §6 / Table 7.2:
 * vibration DAQ node, existing PLC / DCS, scanner server, video, analytics.
 * Addresses and slots stay pending the D3 walkdown; not a wiring record.
 */
function cardFamily(s: PyroSignalDef): string {
  if (s.origin === "calculated") return "ANALYTICS-CORE";
  if (s.origin === "manual") return "MANUAL-ENTRY";
  // D4 Table 6.4a: the flame camera is a video stream, not an analogue / discrete channel.
  if (s.tag === "CAM-BRN-01") return "VIDEO-STREAM";
  const src = PYRO_SPEC[s.tag]?.source ?? "R?";
  const i = s.instrument;
  const cls = sensorClassOf(s);
  // D5 Tables 6.14 / 6.16: shell map and status from the scanner server; tyre migration from the scanner option / OEM unit (OPC UA).
  if (s.tag === "STS-KLN-08") return "SCANNER-MAP-01";
  if (cls === "migration") return "SCANNER-MIG-01";
  // D5 Table 7.2: the 16 accelerometers go to the nearest of four 8-channel IEPE DAQ nodes.
  const node = DAQ_NODE_OF_TAG[s.tag];
  if (node) return `${node.code.replace("-", "")}-IEPE-01`;
  // D5 Table 6.8: load cells through the weighing controller to the PLC.
  if (cls === "loadcell") return "PLC-WGT-01";
  const kind = PULSE_TAGS.has(s.tag) || /pickup/i.test(i)
    ? "PULSE"
    : /IEPE/.test(i)
    ? "IEPE"
    : /RTD/.test(i)
      ? "RTD"
      : /Thermocouple/.test(i)
        ? "TC"
        : /pyrometer/i.test(i)
          ? "PYRO"
          : /Gas analyser/.test(i)
            ? "GAS"
            : /MCC|Speed/.test(i)
              ? "VFD"
              : s.type === "state"
                ? "DI"
                : /Position/.test(i)
                  ? "LVDT"
                  : /flow meter/i.test(i)
                    ? "FLOW"
                    : "HART";
  // Every other new / confirmed device is read from the plant systems (D5 Tables 6.x output, 7.1): kiln drive train and
  // auxiliaries, position / limit / flow switches and spray pulses from the PLC; process values from the line DCS.
  const kilnPlc = s.machine === "PYR-KLN-01" && ["DRV-KLN-01", "SUP-KLN-01"].includes(s.system);
  const plc = kilnPlc || src === "R/N?" || cls === "position" || cls === "spray";
  return `${plc ? "PLC" : "DCS"}-${kind}-01`;
}

/**
 * Sources by card-family prefix. The video feed is its own source (kind
 * "other": the registry's SourceKind has no video kind) with no register map.
 */
const SOURCE_KIND: Record<string, { code: string; kind: string; name: string; protocol: string; model: string | null; zone: string; notes: string }> = {
  // D5 Tables 7.1 / 7.2: four 8-channel IEPE DAQ nodes in local IP54 panels; DAQ-3 Ex-certified for the coal area.
  ...Object.fromEntries(
    DAQ_NODES.map((n) => [
      n.code.replace("-", ""),
      {
        code: n.code,
        kind: "rack",
        name: `Vibration DAQ node ${n.code} — ${n.location} (N?, not approved)`,
        protocol: "Ethernet / fibre to the edge gateway",
        model: `8-ch IEPE DAQ, 24-bit, ≤ 51.2 kS/s, IP54 panel${n.ex ? ", Ex-certified" : ""} (D5 Table 7.1); product TBC`,
        zone: ZONE.daq,
        notes: `D5 Table 7.2: ${n.tags.join(", ")} — ${n.tags.length} of ${n.channels} channels used${n.ex ? "; Ex-certified for the coal area (D5 Table 10.1)" : ""}. No purchase before the D3 walkdown (D5 §11).`,
      },
    ]),
  ),
  PLC: {
    code: "PLC-01",
    kind: "plc",
    name: "Kiln drive & auxiliaries PLC (read-only)",
    protocol: "OPC UA",
    model: null,
    zone: ZONE.plc,
    notes: `Read-only OPC UA client (D5 Table 7.1; ULTRON never writes): kiln drive, auxiliaries, switches, spray pulses, weighing controller. Tag, scaling, time stamps and quality to be confirmed; ${ALLOCATION_NOTE}.`,
  },
  DCS: {
    code: "DCS-01",
    kind: "dcs",
    name: "Pyro line DCS (read-only)",
    protocol: "OPC UA",
    model: null,
    zone: ZONE.dcs,
    notes: `Read-only OPC UA / Modbus TCP client (D5 Table 7.1; ULTRON never writes): process values, analysers (with status), flow meters, pyrometers. Tag, scaling, time stamps and quality to be confirmed; ${ALLOCATION_NOTE}.`,
  },
  SCANNER: {
    code: "SCAN-01",
    kind: "analyzer",
    name: "Kiln shell scanner server (read-only)",
    protocol: "OPC UA (scanner server)",
    model: null,
    zone: ZONE.scanner,
    notes: "Shell temperature map (dataset, not a single channel) and status, scan 2–5 s, map 10 min, values 1 min (D5 Tables 6.14 / 8.2); tyre migration from the scanner option or OEM unit (D5 Table 6.16).",
  },
  VIDEO: {
    code: "CAM-01",
    kind: "other",
    name: "Burner flame camera — video stream (operator review)",
    protocol: "RTSP (camera server)",
    model: null,
    zone: ZONE.video,
    notes: "Video is a stream, not an analogue instrument: no register. Snapshot 1 / min to ULTRON (D5 Table 8.2); only feed availability is tracked, no automatic flame classifier.",
  },
};

const CARD_TYPE: Record<string, string> = {
  IEPE: "IEPE vibration",
  RTD: "RTD temperature",
  TC: "Thermocouple",
  PYRO: "Pyrometer",
  GAS: "Gas analyser",
  VFD: "VFD data",
  PULSE: "Pulse / speed input",
  DI: "Digital inputs",
  LVDT: "LVDT",
  FLOW: "Flow",
  HART: "4–20 mA HART",
  STREAM: "Video stream",
  WGT: "Weighing controller",
  MAP: "Scanner map / status",
  MIG: "Tyre migration (scanner option / OEM)",
};

function reasonsFor(tag: string, machine: string) {
  return PYRO_RULES.filter((r) => r.machine === machine && r.inputs.includes(tag)).map((r) => ({
    ruleId: r.id,
    ruleName: r.name,
    primaryCause: r.cause,
    mechanism: r.logic,
    symptomSignature: r.logic,
    consequence: r.consequence,
    prescriptiveAction: r.action,
    crossCheckSensors: r.inputs.filter((t) => t !== tag).slice(0, 6),
  }));
}

/** Area of a machine → its gateway. */
const areaOf = (machineId: string) => AREAS.find((a) => a.groups.some((g) => g.machines.includes(machineId)))!;

/* ------------------------------------------------------------------ */
/* Apply                                                               */
/* ------------------------------------------------------------------ */

export async function applyPyroLine(client: PoolClient): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  // Edge registry provenance (D4 Table 8.1): security zone per gateway / source,
  // original plant tag per point. Nullable, so other plants' rows are unaffected.
  await client.query("ALTER TABLE edge_gateways ADD COLUMN IF NOT EXISTS security_zone VARCHAR(128)");
  await client.query("ALTER TABLE edge_sources ADD COLUMN IF NOT EXISTS security_zone VARCHAR(128)");
  await client.query("ALTER TABLE edge_points ADD COLUMN IF NOT EXISTS source_tag VARCHAR(255)");
  // Two-sided limits (D4 §7.2 demo bands): the low side beside the existing high-side warning_val / alarm_val.
  await client.query("ALTER TABLE sensor_definitions ADD COLUMN IF NOT EXISTS warning_lo_val NUMERIC(10, 2)");
  await client.query("ALTER TABLE sensor_definitions ADD COLUMN IF NOT EXISTS alarm_lo_val NUMERIC(10, 2)");
  // Edge point value types beyond float / bool (video stream, scanner status + map): drop any CHECK on data_type.
  await client.query(`DO $$ DECLARE c text; BEGIN
    FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'edge_points'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%data_type%' LOOP
      EXECUTE 'ALTER TABLE edge_points DROP CONSTRAINT ' || quote_ident(c);
    END LOOP;
  END $$;`);

  // Drawing types: widen the catalog CHECK to the pyro machines' drawings.
  await client.query(`DO $$ DECLARE c text; BEGIN
    FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'equipment_models'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%diagram_type%' LOOP
      EXECUTE 'ALTER TABLE equipment_models DROP CONSTRAINT ' || quote_ident(c);
    END LOOP;
  END $$;`);

  // Rebuild only what the pyro line owns.
  await client.query("DELETE FROM edge_gateways WHERE id LIKE 'gw-pyro-%'");
  // Every PYR-* machine, including ids a merge retired (FSL-01, KFS-01 → FED-01; HMR-01, CSL-01 → CCT-01).
  await client.query("DELETE FROM machines WHERE id = ANY($1) OR id LIKE 'PYR-%'", [MACHINE_IDS]);
  await client.query("DELETE FROM sensor_definitions WHERE id LIKE 'PYR-%'");
  await client.query("DELETE FROM equipment_models WHERE id LIKE 'mdl-pyr-%'");
  await client.query("DELETE FROM hierarchy_nodes WHERE plant_id = $1", [PYRO_PLANT_ID]);
  // Re-add the widened CHECK once the retired drawing types' models are gone.
  await client.query(
    `ALTER TABLE equipment_models ADD CONSTRAINT equipment_models_diagram_type_check CHECK (diagram_type IN (${DIAGRAM_TYPES.map((t) => `'${t}'`).join(", ")}))`,
  );

  // User (before the plant: the plant names its manager).
  await client.query(
    `INSERT INTO users (id, email, full_name, title, department, role_id, avatar_initials, phone, shift, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, title = EXCLUDED.title,
       department = EXCLUDED.department, role_id = EXCLUDED.role_id, avatar_initials = EXCLUDED.avatar_initials,
       phone = EXCLUDED.phone, shift = EXCLUDED.shift, status = EXCLUDED.status, updated_at = NOW()`,
    [USER.id, USER.email, USER.fullName, USER.title, USER.department, USER.roleId, USER.avatarInitials, USER.phone, USER.shift, USER.status],
  );

  const sortOrder = Number((await client.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM plants WHERE id <> $1", [PYRO_PLANT_ID])).rows[0].n);
  await client.query(
    `INSERT INTO plants (id, code, name, short_name, region, location, coordinates, time_zone, manager_user_id, status, description, commissioned_year, design_capacity, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name, short_name = EXCLUDED.short_name, region = EXCLUDED.region,
       location = EXCLUDED.location, coordinates = EXCLUDED.coordinates, time_zone = EXCLUDED.time_zone, manager_user_id = EXCLUDED.manager_user_id,
       status = EXCLUDED.status, description = EXCLUDED.description, commissioned_year = EXCLUDED.commissioned_year,
       design_capacity = EXCLUDED.design_capacity`,
    [PLANT.id, PLANT.code, PLANT.name, PLANT.shortName, PLANT.region, PLANT.location, PLANT.coordinates, PLANT.timeZone, USER.id, PLANT.status, PLANT.description, PLANT.commissionedYear, PLANT.designCapacity, sortOrder],
  );
  await client.query("UPDATE users SET default_plant_id = $2 WHERE id = $1", [USER.id, PYRO_PLANT_ID]);
  await client.query(
    `INSERT INTO user_plant_access (user_id, plant_id, access_level, is_primary) VALUES ($1, $2, 'admin', TRUE)
     ON CONFLICT (user_id, plant_id) DO UPDATE SET access_level = 'admin', is_primary = TRUE`,
    [USER.id, PYRO_PLANT_ID],
  );
  // The pyro line is a separate workspace: only its own user has access. Remove any
  // access rows other accounts were given by an earlier build.
  await client.query("DELETE FROM user_plant_access WHERE plant_id = $1 AND user_id <> $2", [PYRO_PLANT_ID, USER.id]);

  // Hierarchy: plant → area → group (machines are added once they exist).
  await client.query(`INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order) VALUES ($1, $1, NULL, $2, 'plant', NULL, $3)`, [PYRO_PLANT_ID, PLANT.name, sortOrder]);
  let nodes = 1;
  for (const [ai, area] of AREAS.entries()) {
    await client.query(`INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order) VALUES ($1, $2, $3, $4, 'area', NULL, $5)`, [area.id, PYRO_PLANT_ID, PYRO_PLANT_ID, area.name, ai]);
    nodes++;
  }

  // Models and machines.
  for (const m of PYRO_MACHINES) {
    const id = IDENTITY[m.id];
    const group = areaOf(m.id).groups.find((g) => g.machines.includes(m.id))!;
    await client.query(
      `INSERT INTO equipment_models (id, type_name, manufacturer, model_number, power_rating, operating_speed, diagram_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      // (manufacturer, model_number) is unique: the machine code keeps the TBC model numbers apart.
      [`mdl-${m.id.toLowerCase()}`, m.name, TBC, `TBC (${m.code})`, "TBC", "TBC", m.diagramType],
    );
    await client.query(
      `INSERT INTO machines (id, plant_id, process_node_id, model_id, name, serial_number, commissioned, bay_location, coordinates, criticality, status, health)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Operational', 96)`,
      [m.id, PYRO_PLANT_ID, group.id, `mdl-${m.id.toLowerCase()}`, `${m.name} ${m.code}`, `TBC (${m.id})`, "TBC", id.bay, PLANT.coordinates, id.criticality],
    );
    await client.query(`INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order) VALUES ($1, $2, $3, $4, 'machine', $5, $6)`, [
      `mach-${m.id.toLowerCase()}`,
      PYRO_PLANT_ID,
      group.id,
      `${m.name} (${m.code})`,
      m.id,
      group.machines.indexOf(m.id),
    ]);
    nodes++;
  }
  counts.hierarchy_nodes = nodes;
  counts.machines = PYRO_MACHINES.length;

  // Systems (bounding box = their pads, % of the drawing) and sub-assemblies.
  for (const m of PYRO_MACHINES) {
    const layout = PYRO_LAYOUT[m.id];
    const systems = PYRO_SYSTEMS.filter((s) => s.machine === m.id);
    for (const [i, sy] of systems.entries()) {
      const subs = PYRO_SUBASSEMBLIES.filter((x) => x.system === sy.id).map((x) => x.id);
      const pts = PYRO_SIGNALS.filter((s) => subs.includes(s.sub) && layout?.pads[s.tag]).map((s) => layout.pads[s.tag]);
      const xs = pts.map(([x]) => (x / layout.width) * 100);
      const ys = pts.map(([, y]) => (y / layout.height) * 100);
      const box = pts.length ? { x: Math.max(0, Math.min(...xs) - 3), y: Math.max(0, Math.min(...ys) - 4), w: Math.max(...xs) - Math.min(...xs) + 6, h: Math.max(...ys) - Math.min(...ys) + 8 } : { x: 0, y: 0, w: 100, h: 100 };
      await client.query(
        `INSERT INTO machine_systems (id, machine_id, system_id, part_code, name, short_name, health, status, bbox_x, bbox_y, bbox_w, bbox_h, critical_notes, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, 96, 'Normal', $7, $8, $9, $10, $11, $12)`,
        [`${m.id}-${sy.id}`, m.id, sy.id, `P${i + 1}`, sy.name, sy.name, box.x.toFixed(2), box.y.toFixed(2), Math.min(100, box.w).toFixed(2), Math.min(100, box.h).toFixed(2), sy.scored ? null : "Process context — not scored in machine health", i],
      );
    }
    for (const [i, sa] of PYRO_SUBASSEMBLIES.filter((x) => x.machine === m.id).entries()) {
      await client.query(
        `INSERT INTO machine_subassemblies (id, machine_id, machine_system_ref_id, system_id, subassembly_id, name, short_name, health, status, criticality, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 96, 'Normal', $8, $9)`,
        [`${m.id}-${sa.id}`, m.id, `${m.id}-${sa.system}`, sa.system, sa.id, sa.name, sa.name, PYRO_SYSTEMS.find((x) => x.id === sa.system)?.scored ? "A" : "Context", i],
      );
    }
  }

  // Sensors: one definition and one mapped signal each.
  const slotOrder = new Map<string, number>();
  for (const s of PYRO_SIGNALS) {
    const spec = PYRO_SPEC[s.tag];
    const layout = PYRO_LAYOUT[s.machine];
    const pad = layout?.pads[s.tag];
    const lim = limitText(s);
    const acc = accuracy(s);
    const fam = cardFamily(s);
    const famKey = `${areaOf(s.machine).id}|${fam}`;
    if (fam !== "VIDEO-STREAM" && !slotOrder.has(famKey)) slotOrder.set(famKey, [...slotOrder.keys()].filter((k) => k.startsWith(`${areaOf(s.machine).id}|`)).length + 2);
    const slot = slotOrder.get(famKey) ?? 0;
    const scannerMax = s.tag === SCANNER_MAX;
    const source = scannerMax ? SCANNER_MAX_ROW.source : s.origin === "calculated" ? "Calculated" : s.origin === "manual" ? "Manual" : SOURCE_LABEL[spec?.source ?? "R?"] ?? SOURCE_LABEL["R?"];
    const video = fam === "VIDEO-STREAM";
    const sub = PYRO_SUBASSEMBLIES.find((x) => x.id === s.sub)!;
    const defId = `${s.machine}-${s.tag}`;
    const value = s.type === "state" ? (s.states?.normal ?? "OK") : s.base.toFixed(s.decimals);
    const maxScale = s.type === "state" ? 1 : Math.max(Math.abs(lim.alarmVal) * 1.25, Math.abs(s.base) * 1.6, 1);
    await client.query(
      `INSERT INTO sensor_definitions (
         id, tag, name, instrument, sensor_type, unit, sample_rate, source, priority, accuracy, range_val,
         normal_threshold, warning_threshold, alarm_threshold, warning_val, alarm_val, max_scale, nominal_band,
         standard, default_baseline, reasons, x, y, component, point, warning_lo_val, alarm_lo_val
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb, $22, $23, $24, $25, $26, $27)`,
      [
        defId,
        s.tag,
        s.name,
        s.instrument,
        scannerMax ? SCANNER_MAX_ROW.sensorType : spec?.sensorType ?? (s.origin === "calculated" ? "Gateway calculation" : "Manual record"),
        s.unit,
        sampleRate(s),
        source,
        scannerMax ? SCANNER_MAX_ROW.priority : s.origin === "online" ? spec?.priority ?? "Required" : s.origin === "calculated" ? "Calculated" : "Manual",
        acc.accuracy,
        acc.range,
        lim.normal,
        lim.warning,
        lim.alarm,
        lim.warningVal,
        lim.alarmVal,
        +maxScale.toFixed(2),
        s.normalBand || null,
        limitStandard(s),
        s.type === "state" ? 1 : s.base,
        JSON.stringify(reasonsFor(s.tag, s.machine)),
        pad ? +((pad[0] / layout.width) * 100).toFixed(2) : null,
        pad ? +((pad[1] / layout.height) * 100).toFixed(2) : null,
        sub.name,
        (scannerMax ? "K-K33" : spec?.point ?? s.point).slice(0, 16),
        lim.warningLoVal,
        lim.alarmLoVal,
      ],
    );
    await client.query(
      `INSERT INTO mapped_signals (id, machine_id, sensor_def_id, tag, subassembly_ref_id, edge_rack, card_slot, modbus_address, current_value, numeric_value, quality, status, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Awaiting data', 'Normal', $11)`,
      [
        defId,
        s.machine,
        defId,
        s.tag,
        `${s.machine}-${s.sub}`,
        `ULTRON-EDGE-${areaOf(s.machine).id.replace("area-", "").toUpperCase()} (${areaOf(s.machine).name})`,
        // Slot per card family (DAQ node per D5 Table 7.2); register addresses pending the D3 walkdown, and a video stream has no register.
        s.origin === "online" && !video ? `${fam} (Slot ${String(slot).padStart(2, "0")})` : fam,
        video ? "n/a — video stream" : s.origin === "online" ? REGISTER_PENDING : "—",
        value,
        s.type === "state" ? 1 : s.base,
        scannerMax
          ? "External shell scanner — map maximum of K-K33"
          : spec?.location ?? (s.origin === "calculated" ? "Calculated on the edge gateway" : "Manual record entered in ULTRON"),
      ],
    );
  }
  counts.sensors = PYRO_SIGNALS.length;

  // Acquisition cabinet per machine (identity, clock and power of the area's edge gateway).
  for (const m of PYRO_MACHINES) {
    const area = areaOf(m.id);
    await client.query(
      `INSERT INTO rack_chassis (id, machine_id, name, cabinet_location, ip_address, protocol, firmware, uptime, psu_status, packet_loss, latency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        `ULTRON-EDGE-PYR-${m.code.replace("-", "")}`,
        m.id,
        `${m.name} ${m.code} Acquisition & Edge Gateway`,
        `${area.name} MCC room cabinet IP54 (safe area)`,
        // Not commissioned: no cabinet record exists yet, so nothing is reported (empty = "Not reported").
        `TBC (walkdown) · ${m.code}`,
        "Read-only OPC UA / Modbus TCP + MQTT over TLS 1.2+ (D5 Table 7.1)",
        "TBC",
        "",
        "",
        "",
        "",
      ],
    );
  }

  // Edge acquisition registry: one gateway per area; sources by card family; cards; points.
  const broker = (await client.query("SELECT id FROM edge_brokers ORDER BY sort_order ASC LIMIT 1")).rows[0]?.id ?? null;
  let gwOrder = Number((await client.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM edge_gateways")).rows[0].n);
  let points = 0;
  for (const area of AREAS) {
    const ids = area.groups.flatMap((g) => g.machines);
    const sigs = PYRO_SIGNALS.filter((s) => ids.includes(s.machine) && s.origin === "online");
    if (!sigs.length) continue;
    const gwId = `gw-${area.id.replace("area-", "")}`;
    const code = `ULTRON-EDGE-${area.id.replace("area-", "").toUpperCase()}`;
    await client.query(
      `INSERT INTO edge_gateways (id, code, name, broker_id, site_node_id, location, ip_address, model, firmware, enabled, notes, sort_order, security_zone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11, $12)`,
      [
        gwId,
        code,
        `${area.name} edge gateway`,
        broker,
        area.id,
        `${area.name} MCC room`,
        null,
        "Industrial PC (ULTRON edge), safe area · ≥ 500 tags · 256 GB SSD (D5 Table 7.1, demo); product TBC",
        null,
        "Pyro line (D5-OSW-PE-PYR Rev. 00) — values simulated until the plant tag export is mapped. Vibration on four IEPE DAQ nodes (D5 Table 7.2); every other signal read-only from the PLC / DCS, scanner, analyser and camera servers (D5 Table 7.1). Store-and-forward ≥ 7 days scalar, ≥ 48 h waveforms; MQTT over TLS 1.2+ through the DMZ. Addresses and slots pending the D3 walkdown (D5 Table 13.1).",
        gwOrder++,
        ZONE.gateway,
      ],
    );
    const bySource = new Map<string, PyroSignalDef[]>();
    for (const s of sigs) {
      const prefix = cardFamily(s).split("-")[0];
      bySource.set(prefix, [...(bySource.get(prefix) ?? []), s]);
    }
    let srcOrder = 0;
    for (const [prefix, list] of bySource) {
      const kind = SOURCE_KIND[prefix] ?? SOURCE_KIND.DCS;
      const srcId = `src-${randomUUID().slice(0, 8)}`;
      await client.query(
        `INSERT INTO edge_sources (id, gateway_id, code, name, kind, protocol, machine_id, model, enabled, sort_order, notes, security_zone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, $11)`,
        [srcId, gwId, kind.code, kind.name, kind.kind, kind.protocol, list[0].machine, kind.model, srcOrder++, kind.notes, kind.zone],
      );
      const families = new Map<string, PyroSignalDef[]>();
      for (const s of list) families.set(cardFamily(s), [...(families.get(cardFamily(s)) ?? []), s]);
      let cardNo = 0;
      for (const [family, chans] of families) {
        cardNo++;
        const famKind = family.split("-")[1];
        const stream = family === "VIDEO-STREAM";
        // D5 Table 7.2: a DAQ node card has 8 IEPE inputs, of which the listed accelerometers are used.
        const node = DAQ_NODES.find((n) => family.startsWith(`${n.code.replace("-", "")}-`));
        await client.query(
          `INSERT INTO edge_cards (id, source_id, code, card_type, channel_count, model, notes, enabled, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)`,
          [
            `card-${randomUUID().slice(0, 8)}`,
            srcId,
            String(cardNo),
            CARD_TYPE[famKind] ?? null,
            node ? node.channels : chans.length,
            stream ? family : node ? `${family} · 8-ch IEPE, 24-bit, ≤ 51.2 kS/s (D5 Table 7.1)` : `${family} (proposed)`,
            stream
              ? "No slot — video stream"
              : node
                ? `${node.code} ${node.location}: ${chans.length} of ${node.channels} channels used (D5 Table 7.2)${node.ex ? " · Ex-certified (coal area)" : ""}`
                : `Proposed slot ${String(slotOrder.get(`${area.id}|${family}`) ?? cardNo).padStart(2, "0")} — pending walkdown`,
            cardNo,
          ],
        );
        const order = (tag: string) => (node ? node.tags.indexOf(tag) : 0);
        for (const [ci, s] of [...chans].sort((a, b) => order(a.tag) - order(b.tag) || a.tag.localeCompare(b.tag)).entries()) {
          const lim = limitText(s);
          await client.query(
            `INSERT INTO edge_points (id, source_id, tag, name, slot, channel, address, unit, data_type, sample_rate, alert_limit, danger_limit, machine_id, signal_tag, source_tag, enabled)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, TRUE)`,
            [
              `pt-${randomUUID().slice(0, 8)}`,
              srcId,
              s.tag,
              s.name,
              String(cardNo),
              String(ci + 1),
              // No D5 register map yet; a video stream has no register at all.
              stream ? null : REGISTER_PENDING,
              s.unit,
              dataType(s),
              sampleRate(s),
              // High side only (the edge runtime flags value ≥ limit); the low side lives on the sensor definition.
              s.type === "state" ? null : lim.pointAlert,
              s.type === "state" ? null : lim.pointDanger,
              s.machine,
              s.tag,
              // Original DCS / PLC / historian tag: unknown until the plant tag list is supplied.
              PLANT_TAG_PENDING,
            ],
          );
          points++;
        }
      }
    }
  }
  counts.edge_points = points;
  return counts;
}
