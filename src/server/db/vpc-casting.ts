import type { PoolClient } from "pg";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { describeLimit, limitBand } from "@/lib/kiln-sim/signals";
import {
  VPC_MACHINE,
  VPC_MACHINE_ID,
  VPC_MACHINES,
  VPC_PLANT_ID,
  VPC_SIGNALS,
  VPC_SPEC,
  VPC_SUBASSEMBLIES,
  VPC_SYSTEMS,
} from "@/lib/vpc-sim/signals";
import { VPC_RULES } from "@/lib/vpc-sim/rules";
import { PYRO_LAYOUT } from "@/components/assets/pyro/pyro-layout";
import { DIAGRAM_TYPES } from "./pyro-line";

export const VPC_USER_ID = "usr-vpc";

const PLANT = {
  id: VPC_PLANT_ID,
  code: "JWL-VPC-01",
  name: "Vacuum Casting Plant — Schultheiss VPC 066",
  shortName: "Vacuum Casting",
  region: "Precious Metals Manufacturing Division",
  location: "Vacuum Casting Section — Automatic Vacuum-Pressure Casting Cell (3 Units)",
  coordinates: "19°07'14\"N 72°52'06\"E",
  timeZone: "Asia/Kolkata",
  status: "Advisory",
  description:
    "Automatic two-chamber vacuum-pressure investment casting cell with 3 Schultheiss VPC 066 Power / Supreme units (VPC-066 Healthy, VPC-067 Advisory, VPC-068 Critical) for gold, silver, platinum, palladium, brass and bronze jewellery trees. 12 kW medium-frequency induction generator (400 V, 3-phase, 16 A), bottom-pouring crucible with stopper rod actuator, -0.90 bar lower flask vacuum, +1.8 bar upper chamber overpressure, cooling-water loop and optional direct solidification vibration.",
  commissionedYear: 2024,
  designCapacity: "3 × Ø130 × 260 mm flask · 12 kW induction · max 1300–1600 °C · 3 bar overpressure",
};

export const VPC_USER = {
  id: VPC_USER_ID,
  email: "arjun.mehta@ultron.industrial",
  fullName: "Arjun Mehta",
  title: "Jewellery Casting Process & Reliability Engineer",
  department: "Jewellery Casting Section (VPC 066)",
  roleId: "role-reliability",
  avatarInitials: "AM",
  phone: "+91 98 201 44066",
  shift: "Day Shift (08:00–20:00)",
  status: "Active",
};

interface VpcUnitSeed {
  id: string;
  areaId: string;
  areaName: string;
  nodeId: string;
  name: string;
  serialNumber: string;
  bayLocation: string;
  ipAddress: string;
  rackId: string;
  gwId: string;
  dbStatus: "Operational" | "Advisory" | "Maintenance";
  sysStatus: "Normal" | "Advisory" | "Critical";
  health: number;
  diagCondition: "Nominal" | "Advisory" | "Critical";
  diagPriority: "Low" | "Medium" | "Immediate";
  diagSummary: string;
  diagAction: string;
  findingCode: string;
  findingFault: string;
  findingProb: number;
  findingLoc: string;
  findingSev: "Normal" | "Advisory" | "Critical";
  findingRec: string;
  events: Array<{
    id: string;
    timestamp: string;
    type: string;
    severity: "Normal" | "Advisory" | "Critical";
    title: string;
    description: string;
    source: string;
  }>;
}

const VPC_UNITS: VpcUnitSeed[] = [
  {
    id: "VPC-066",
    areaId: "area-vpc-casting",
    areaName: "Casting Cell Bay 01 — VPC-066",
    nodeId: "mach-vpc-066",
    name: "Schultheiss VPC 066 — Unit 01",
    serialNumber: "SCH-VPC066-2024-01",
    bayLocation: "Jewellery Casting Bay 01 (650 × 1000 × 1620 mm)",
    ipAddress: "10.24.66.10",
    rackId: "ULTRON-EDGE-VPC-066",
    gwId: "gw-vpc-066",
    dbStatus: "Operational",
    sysStatus: "Normal",
    health: 98,
    diagCondition: "Nominal",
    diagPriority: "Low",
    diagSummary:
      "All 16 VPC-066 monitoring points nominal: melt temperature T1 steady at 1,000 °C (E1 9.5 kW), lower flask vacuum P2 at -0.90 bar (branch P4 -0.92 bar), upper overpressure P1 at +1.80 bar, cooling-water flow F1 at 4.5 L/min (ΔT 6.0 °C).",
    diagAction:
      "Maintain standard pre-cast checks on chamber/flask seals (S2), crucible bottom stopper rod seat (S1), and vacuum pump oil level before each casting shift.",
    findingCode: "F-VPC066-01",
    findingFault: "Baseline Vacuum & Overpressure Integrity Verified",
    findingProb: 99,
    findingLoc: "Upper Melting & Lower Flask Chambers (P1, P2, P4)",
    findingSev: "Normal",
    findingRec: "No chamber leak or pump wear detected; P2 (-0.90 bar) tracks P4 (-0.92 bar) cleanly.",
    events: [
      {
        id: "evt-vpc066-01",
        timestamp: "10:42:18",
        type: "Operating Change",
        severity: "Normal",
        title: "Casting Cycle #184 Completed — 18 kt Yellow Gold Tree (1.0 kg)",
        description:
          "Bottom pour completed at T1 = 1,000 °C with P2 = -0.90 bar lower flask vacuum and P1 = +1.80 bar inert gas overpressure.",
        source: "Schultheiss VPC 066 PLC",
      },
      {
        id: "evt-vpc066-02",
        timestamp: "09:15:00",
        type: "Inspection",
        severity: "Normal",
        title: "Cooling Water & Vacuum Pre-Start Verification Passed",
        description:
          "Cooling flow F1 verified at 4.5 L/min (ΔT = 6.0 °C); vacuum branch P4 reached -0.92 bar in 18 s.",
        source: "ULTRON Edge Gateway",
      },
    ],
  },
  {
    id: "VPC-067",
    areaId: "area-vpc-bay-02",
    areaName: "Casting Cell Bay 02 — VPC-067",
    nodeId: "mach-vpc-067",
    name: "Schultheiss VPC 066 — Unit 02",
    serialNumber: "SCH-VPC066-2024-02",
    bayLocation: "Jewellery Casting Bay 02 (650 × 1000 × 1620 mm)",
    ipAddress: "10.24.66.11",
    rackId: "ULTRON-EDGE-VPC-067",
    gwId: "gw-vpc-067",
    dbStatus: "Advisory",
    sysStatus: "Advisory",
    health: 86,
    diagCondition: "Advisory",
    diagPriority: "Medium",
    diagSummary:
      "Advisory alert R-VPC-02 active on VPC-067: vacuum branch P4 is strong (-0.92 bar) at the pump while lower flask chamber vacuum P2 lags around -0.78 bar with S2 door/seal warning, indicating a flask flange or inter-chamber O-ring leak.",
    diagAction:
      "Clean investment debris from the lower flask silicone seal ring and upper/lower chamber flange O-ring; verify S2 door latch compression before the next casting tree.",
    findingCode: "F-VPC067-01",
    findingFault: "R-VPC-02 · Flask / Chamber Seal Leak (Advisory)",
    findingProb: 88,
    findingLoc: "Lower Flask Chamber Silicone Seal & Interlock S2 (P2, P4, S2)",
    findingSev: "Advisory",
    findingRec:
      "Inspect and clean flask silicone seal ring and chamber closure latch S2; replace O-ring if compression set exceeds 0.4 mm.",
    events: [
      {
        id: "evt-vpc067-01",
        timestamp: "10:36:10",
        type: "Telemetry Advisory",
        severity: "Advisory",
        title: "R-VPC-02 Confirmed — Chamber / Flask Seal Leak on VPC-067",
        description:
          "Lower flask chamber vacuum P2 degraded to -0.78 bar while pump suction manifold P4 held -0.92 bar; check flask flange seal.",
        source: "ULTRON Diagnostic Engine",
      },
      {
        id: "evt-vpc067-02",
        timestamp: "09:48:00",
        type: "Operating Change",
        severity: "Normal",
        title: "Casting Cycle #162 Loaded — 18 kt Rose Gold Tree",
        description: "Heated perforated flask (600 °C) loaded into Bay 02 lower chamber.",
        source: "Schultheiss VPC 066 PLC",
      },
    ],
  },
  {
    id: "VPC-068",
    areaId: "area-vpc-bay-03",
    areaName: "Casting Cell Bay 03 — VPC-068",
    nodeId: "mach-vpc-068",
    name: "Schultheiss VPC 066 — Unit 03",
    serialNumber: "SCH-VPC066-2024-03",
    bayLocation: "Jewellery Casting Bay 03 (650 × 1000 × 1620 mm)",
    ipAddress: "10.24.66.12",
    rackId: "ULTRON-EDGE-VPC-068",
    gwId: "gw-vpc-068",
    dbStatus: "Maintenance",
    sysStatus: "Critical",
    health: 64,
    diagCondition: "Critical",
    diagPriority: "Immediate",
    diagSummary:
      "Critical alert R-VPC-01 active on VPC-068: both lower flask vacuum P2 (-0.61 bar) and suction branch P4 (-0.63 bar) are poor while vacuum pump vibration V1 (4.9 mm/s), body temperature T4 (74 °C) and motor current E2 (5.0 A) are elevated.",
    diagAction:
      "Hold casting on VPC-068 immediately; inspect vacuum pump oil level/condition, clean intake filter, and check rotary vane & bearing wear.",
    findingCode: "F-VPC068-01",
    findingFault: "R-VPC-01 · Vacuum Pump Mechanical Wear & Suction Loss (Critical)",
    findingProb: 95,
    findingLoc: "Vacuum Pump Assembly & Suction Branch (P2, P4, V1, T4, E2)",
    findingSev: "Critical",
    findingRec:
      "Stop vacuum pump on Unit 03 after venting chamber; service pump oil, intake cartridge filter, shaft seal and bearings.",
    events: [
      {
        id: "evt-vpc068-01",
        timestamp: "10:28:45",
        type: "Telemetry Advisory",
        severity: "Critical",
        title: "R-VPC-01 Confirmed — Vacuum Pump Degradation on VPC-068",
        description:
          "Flask vacuum P2 (-0.61 bar) and branch P4 (-0.63 bar) failed evacuation target with pump vibration V1 = 4.9 mm/s and T4 = 74 °C.",
        source: "ULTRON Diagnostic Engine",
      },
      {
        id: "evt-vpc068-02",
        timestamp: "10:12:00",
        type: "Telemetry Advisory",
        severity: "Advisory",
        title: "Vacuum Pump Bearing Temperature & Vibration Rising (V1, T4)",
        description: "Pump housing temperature T4 crossed 65 °C warning band during evacuation stage.",
        source: "ULTRON Edge Gateway",
      },
    ],
  },
];

function cardFamily(tag: string): { slot: string; moduleType: string; cardModel: string; modbusBase: number } {
  switch (tag) {
    case "V1":
    case "V2":
      return { slot: "VIB-IEPE (Slot 01)", moduleType: "VIB", cardModel: "ULTRON-DAQ-IEPE-4CH", modbusBase: 40100 };
    case "T1":
    case "T2":
    case "T3":
    case "T4":
      return { slot: "THERMAL-TC-RTD (Slot 02)", moduleType: "TEMP", cardModel: "ULTRON-AI-THERM-8CH", modbusBase: 40200 };
    case "P1":
    case "P2":
    case "P3":
    case "P4":
    case "F1":
      return { slot: "PRESS-FLOW-420 (Slot 03)", moduleType: "PRESS", cardModel: "ULTRON-AI-420MA-8CH", modbusBase: 40300 };
    case "E1":
    case "E2":
      return { slot: "POWER-ELEC (Slot 04)", moduleType: "ELEC", cardModel: "ULTRON-PWR-CT-4CH", modbusBase: 40400 };
    case "S1":
    case "S2":
      return { slot: "PLC-DI-STATE (Slot 05)", moduleType: "STATE", cardModel: "ULTRON-DI-24VDC-8CH", modbusBase: 10100 };
    default:
      return { slot: "ANALYTICS-CALC", moduleType: "CALC", cardModel: "EDGE-ANALYTICS", modbusBase: 0 };
  }
}

function reasonsFor(tag: string) {
  return VPC_RULES.filter((r) => r.category !== "Data quality" && r.inputs.includes(tag)).map((r) => ({
    cause: `${r.id} · ${r.name}`,
    Physics: r.logic,
    Impact: r.consequence,
    Action: r.action,
    Severity: "Advisory",
    crossCheckSensors: r.inputs.filter((t) => t !== tag),
  }));
}

export async function applyVpcCasting(client: PoolClient): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  await client.query("ALTER TABLE edge_gateways ADD COLUMN IF NOT EXISTS security_zone VARCHAR(128)");
  await client.query("ALTER TABLE edge_sources ADD COLUMN IF NOT EXISTS security_zone VARCHAR(128)");
  await client.query("ALTER TABLE edge_points ADD COLUMN IF NOT EXISTS source_tag VARCHAR(255)");
  await client.query("ALTER TABLE sensor_definitions ADD COLUMN IF NOT EXISTS warning_lo_val NUMERIC(10, 2)");
  await client.query("ALTER TABLE sensor_definitions ADD COLUMN IF NOT EXISTS alarm_lo_val NUMERIC(10, 2)");

  // Ensure diagram_type check includes vpc-casting
  await client.query(`DO $$ DECLARE c text; BEGIN
    FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'equipment_models'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%diagram_type%' LOOP
      EXECUTE 'ALTER TABLE equipment_models DROP CONSTRAINT ' || quote_ident(c);
    END LOOP;
  END $$;`);

  const allVpcIds = VPC_MACHINES.map((m) => m.id);

  // Clean existing VPC rows across all 3 units
  await client.query("DELETE FROM edge_gateways WHERE id LIKE 'gw-vpc-%'");
  await client.query("DELETE FROM machines WHERE id = ANY($1)", [allVpcIds]);
  await client.query("DELETE FROM sensor_definitions WHERE id LIKE 'VPC-066-%' OR id LIKE 'VPC-067-%' OR id LIKE 'VPC-068-%'");
  await client.query("DELETE FROM equipment_models WHERE id = 'mdl-vpc-066'");
  await client.query("DELETE FROM hierarchy_nodes WHERE plant_id = $1", [VPC_PLANT_ID]);

  await client.query(
    `ALTER TABLE equipment_models ADD CONSTRAINT equipment_models_diagram_type_check CHECK (diagram_type IN (${DIAGRAM_TYPES.map((t) => `'${t}'`).join(", ")}))`,
  );

  // 1. User (before plant so manager_user_id FK is valid)
  await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT");
  const envPwd = process.env.ULTRON_DEMO_VPC_PASSWORD;
  const rawPwd = !envPwd || envPwd === "VpcCasting" ? "VpcCasting#2026" : envPwd;
  const salt = randomBytes(16).toString("hex");
  const pwdHash = `scrypt$${salt}$${scryptSync(rawPwd, salt, 32).toString("hex")}`;

  await client.query(
    `INSERT INTO users (id, email, full_name, title, department, role_id, avatar_initials, phone, shift, status, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, title = EXCLUDED.title,
       department = EXCLUDED.department, role_id = EXCLUDED.role_id, avatar_initials = EXCLUDED.avatar_initials,
       phone = EXCLUDED.phone, shift = EXCLUDED.shift, status = EXCLUDED.status, password_hash = EXCLUDED.password_hash, updated_at = NOW()`,
    [
      VPC_USER.id,
      VPC_USER.email,
      VPC_USER.fullName,
      VPC_USER.title,
      VPC_USER.department,
      VPC_USER.roleId,
      VPC_USER.avatarInitials,
      VPC_USER.phone,
      VPC_USER.shift,
      VPC_USER.status,
      pwdHash,
    ],
  );

  // 2. Plant
  const sortOrder = Number(
    (await client.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM plants WHERE id <> $1", [VPC_PLANT_ID])).rows[0].n,
  );
  await client.query(
    `INSERT INTO plants (id, code, name, short_name, region, location, coordinates, time_zone, manager_user_id, status, description, commissioned_year, design_capacity, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name, short_name = EXCLUDED.short_name, region = EXCLUDED.region,
       location = EXCLUDED.location, coordinates = EXCLUDED.coordinates, time_zone = EXCLUDED.time_zone, manager_user_id = EXCLUDED.manager_user_id,
       status = EXCLUDED.status, description = EXCLUDED.description, commissioned_year = EXCLUDED.commissioned_year,
       design_capacity = EXCLUDED.design_capacity`,
    [
      PLANT.id,
      PLANT.code,
      PLANT.name,
      PLANT.shortName,
      PLANT.region,
      PLANT.location,
      PLANT.coordinates,
      PLANT.timeZone,
      VPC_USER.id,
      PLANT.status,
      PLANT.description,
      PLANT.commissionedYear,
      PLANT.designCapacity,
      sortOrder,
    ],
  );

  await client.query("UPDATE users SET default_plant_id = $2 WHERE id = $1", [VPC_USER.id, VPC_PLANT_ID]);
  await client.query("DELETE FROM user_plant_access WHERE user_id = $1 OR plant_id = $2", [VPC_USER.id, VPC_PLANT_ID]);
  await client.query(
    `INSERT INTO user_plant_access (user_id, plant_id, access_level, is_primary) VALUES ($1, $2, 'admin', TRUE)`,
    [VPC_USER.id, VPC_PLANT_ID],
  );

  // 3. Hierarchy: plant root
  await client.query(
    `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order) VALUES ($1, $1, NULL, $2, 'plant', NULL, $3)`,
    [VPC_PLANT_ID, PLANT.name, sortOrder],
  );

  // 4. Shared Equipment Model
  await client.query(
    `INSERT INTO equipment_models (id, type_name, manufacturer, model_number, power_rating, operating_speed, diagram_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      "mdl-vpc-066",
      "Automatic Vacuum-Pressure Casting Machine",
      "Schultheiss GmbH",
      "VPC 066 Power / Supreme",
      "12 kW (400 V, 3-phase, 16 A)",
      "1000 °C Melt · -0.90 bar Vac · +1.8 bar Overpressure",
      VPC_MACHINE.diagramType,
    ],
  );

  // 5. Shared 3NF Sensor Definitions (created once under VPC-066-<tag> and referenced by all 3 machines)
  const layout = PYRO_LAYOUT[VPC_MACHINE_ID];
  for (const s of VPC_SIGNALS) {
    const spec = VPC_SPEC[s.tag];
    const pad = layout?.pads[s.tag];
    const sub = VPC_SUBASSEMBLIES.find((x) => x.id === s.sub)!;
    const defId = `${VPC_MACHINE_ID}-${s.tag}`;

    const b = limitBand(s.limit, s.base);
    const desc = describeLimit(s.limit, s.unit);
    const warnVal = b?.warnHi ?? (b?.warnLo !== undefined ? Math.abs(b.warnLo) : 0);
    const alarmVal = b?.alarmHi ?? (b?.alarmLo !== undefined ? Math.abs(b.alarmLo) : 0);
    const maxScale = s.type === "state" ? 1 : Math.max(Math.abs(alarmVal) * 1.25, Math.abs(s.base) * 1.4, 1);
    const sourceLabel =
      s.origin === "calculated"
        ? "Calculated"
        : spec?.source === "R?"
          ? "Existing — Built-in / PLC"
          : "New — External sensor";

    const warnText = s.type === "state" ? (s.states?.warn?.[0] ?? "LAG") : desc.warning;
    const alarmText = s.type === "state" ? (s.states?.alarm?.[0] ?? "FAULT") : desc.alarm;

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
        spec?.sensorType ?? "Gateway calculation",
        s.unit,
        s.type === "state" ? "On change" : s.tag === "V1" || s.tag === "V2" ? "25.6 kS/s" : "1 Hz",
        sourceLabel,
        s.origin === "calculated" ? "Calculated" : spec?.priority ?? "Required",
        s.instrument.includes("Thermocouple") ? "Class 1 (±1.5 °C)" : s.instrument.includes("RTD") ? "Class A" : "±0.5% FS",
        s.range ? `${s.range[0]} … ${s.range[1]} ${s.unit}` : s.normalBand,
        s.normalBand,
        warnText,
        alarmText,
        b?.warnHi ?? 0,
        b?.alarmHi ?? 0,
        +maxScale.toFixed(2),
        s.normalBand,
        "Schultheiss VPC 066 §7.3",
        s.type === "state" ? 1 : s.base,
        JSON.stringify(reasonsFor(s.tag)),
        pad ? +((pad[0] / layout.width) * 100).toFixed(2) : null,
        pad ? +((pad[1] / layout.height) * 100).toFixed(2) : null,
        sub.name,
        s.point,
        b?.warnLo ?? null,
        b?.alarmLo ?? null,
      ],
    );
  }
  counts.sensors = VPC_SIGNALS.length;

  const broker = (await client.query("SELECT id FROM edge_brokers ORDER BY sort_order ASC LIMIT 1")).rows[0]?.id ?? null;
  let gwOrder = Number((await client.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM edge_gateways")).rows[0].n);
  let totalPoints = 0;

  // 6. Seed each of the 3 VPC machines (VPC-066 Healthy, VPC-067 Advisory, VPC-068 Critical)
  for (const [uIdx, unit] of VPC_UNITS.entries()) {
    // Area node + Machine node
    await client.query(
      `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order)
       VALUES ($1, $2, $3, $4, 'area', NULL, $5)`,
      [unit.areaId, VPC_PLANT_ID, VPC_PLANT_ID, unit.areaName, uIdx],
    );

    await client.query(
      `INSERT INTO machines (id, plant_id, process_node_id, model_id, name, serial_number, commissioned, bay_location, coordinates, criticality, status, health)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        unit.id,
        VPC_PLANT_ID,
        unit.areaId,
        "mdl-vpc-066",
        unit.name,
        unit.serialNumber,
        "2024",
        unit.bayLocation,
        PLANT.coordinates,
        "A (Critical)",
        unit.dbStatus,
        unit.health,
      ],
    );

    await client.query(
      `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order)
       VALUES ($1, $2, $3, $4, 'machine', $5, 0)`,
      [unit.nodeId, VPC_PLANT_ID, unit.areaId, `${unit.name} (${unit.id})`, unit.id],
    );

    // Systems & Subassemblies
    for (const [i, sy] of VPC_SYSTEMS.entries()) {
      const subs = VPC_SUBASSEMBLIES.filter((x) => x.system === sy.id).map((x) => x.id);
      const pts = VPC_SIGNALS.filter((s) => subs.includes(s.sub) && layout?.pads[s.tag]).map((s) => layout.pads[s.tag]);
      const xs = pts.map(([x]) => (x / layout.width) * 100);
      const ys = pts.map(([, y]) => (y / layout.height) * 100);
      const box = pts.length
        ? {
            x: Math.max(0, Math.min(...xs) - 4),
            y: Math.max(0, Math.min(...ys) - 5),
            w: Math.max(...xs) - Math.min(...xs) + 8,
            h: Math.max(...ys) - Math.min(...ys) + 10,
          }
        : { x: 0, y: 0, w: 100, h: 100 };

      const sysAffected =
        (unit.id === "VPC-067" && sy.id === "vpc-flask") ||
        (unit.id === "VPC-068" && sy.id === "vpc-vacuum");

      await client.query(
        `INSERT INTO machine_systems (id, machine_id, system_id, part_code, name, short_name, health, status, bbox_x, bbox_y, bbox_w, bbox_h, critical_notes, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          `${unit.id}-${sy.id}`,
          unit.id,
          sy.id,
          `P${i + 1}`,
          sy.name,
          sy.name,
          sysAffected ? unit.health : 98,
          sysAffected ? unit.sysStatus : "Normal",
          box.x.toFixed(2),
          box.y.toFixed(2),
          Math.min(100, box.w).toFixed(2),
          Math.min(100, box.h).toFixed(2),
          null,
          i,
        ],
      );
    }

    for (const [i, sa] of VPC_SUBASSEMBLIES.entries()) {
      const subAffected =
        (unit.id === "VPC-067" && sa.id === "vpc-flask-ch") ||
        (unit.id === "VPC-068" && sa.id === "vpc-vac-pump");
      await client.query(
        `INSERT INTO machine_subassemblies (id, machine_id, machine_system_ref_id, system_id, subassembly_id, name, short_name, health, status, criticality, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'A', $10)`,
        [
          `${unit.id}-${sa.id}`,
          unit.id,
          `${unit.id}-${sa.system}`,
          sa.system,
          sa.id,
          sa.name,
          sa.name,
          subAffected ? unit.health : 98,
          subAffected ? unit.sysStatus : "Normal",
          i,
        ],
      );
    }

    // Mapped Signals
    const chCounters = new Map<string, number>();
    for (const s of VPC_SIGNALS) {
      const spec = VPC_SPEC[s.tag];
      const defId = `${VPC_MACHINE_ID}-${s.tag}`;
      const mapId = `${unit.id}-${s.tag}`;
      const fam = cardFamily(s.tag);
      const chIdx = (chCounters.get(fam.slot) ?? 0) + 1;
      chCounters.set(fam.slot, chIdx);

      let numVal = s.type === "state" ? 1 : s.base;
      let strVal = s.type === "state" ? (s.states?.normal ?? "OK") : s.base.toFixed(s.decimals);
      let sigStatus: "Normal" | "Advisory" | "Critical" = "Normal";

      if (unit.id === "VPC-067") {
        if (s.tag === "P2") {
          numVal = -0.78;
          strVal = "-0.78";
          sigStatus = "Advisory";
        } else if (s.tag === "S2") {
          numVal = 0.5;
          strVal = "SEAL_WARN";
          sigStatus = "Advisory";
        }
      } else if (unit.id === "VPC-068") {
        if (s.tag === "P2") {
          numVal = -0.61;
          strVal = "-0.61";
          sigStatus = "Critical";
        } else if (s.tag === "P4") {
          numVal = -0.63;
          strVal = "-0.63";
          sigStatus = "Critical";
        } else if (s.tag === "V1") {
          numVal = 4.9;
          strVal = "4.9";
          sigStatus = "Critical";
        } else if (s.tag === "T4") {
          numVal = 74.0;
          strVal = "74.0";
          sigStatus = "Critical";
        } else if (s.tag === "E2") {
          numVal = 5.0;
          strVal = "5.0";
          sigStatus = "Critical";
        }
      }

      await client.query(
        `INSERT INTO mapped_signals (id, machine_id, sensor_def_id, tag, subassembly_ref_id, edge_rack, card_slot, modbus_address, current_value, numeric_value, quality, status, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '100% Good', $11, $12)`,
        [
          mapId,
          unit.id,
          defId,
          s.tag,
          `${unit.id}-${s.sub}`,
          `${unit.rackId} (${unit.areaName})`,
          s.origin === "calculated" ? "ANALYTICS-CALC" : fam.slot,
          s.origin === "calculated" ? "Derived (T3 − T2)" : String(fam.modbusBase + chIdx),
          strVal,
          numVal,
          sigStatus,
          spec?.location ?? "Calculated on the edge gateway",
        ],
      );
    }

    // Rack Chassis & Rack Slots
    await client.query(
      `INSERT INTO rack_chassis (id, machine_id, name, cabinet_location, ip_address, protocol, firmware, uptime, psu_status, packet_loss, latency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        unit.rackId,
        unit.id,
        `${unit.name} Edge Acquisition Unit`,
        `${unit.bayLocation} — Control Cabinet Side-Mount (IP54)`,
        unit.ipAddress,
        "Modbus TCP / OPC UA + IEPE DAQ + MQTT over TLS 1.2+",
        "ULTRON-EDGE v4.8.2",
        "99.98% (142d 08h)",
        "Redundant 24V DC Active (24.1V / 24.0V)",
        "0.00%",
        "PTP Locked (0.4 ms)",
      ],
    );
    const slots = [
      [1, "ULTRON-DAQ-IEPE-4CH", "IEPE Vibration DAQ (24-bit, 25.6 kS/s)", 4, "V1, V2", "25.6 kS/s", "Synced"],
      [2, "ULTRON-AI-THERM-8CH", "Type S TC & Pt100 RTD Input Card", 8, "T1, T2, T3, T4", "10 Hz", "Synced"],
      [3, "ULTRON-AI-420MA-8CH", "Vacuum, Pressure & Flow 4–20 mA Card", 8, "P1, P2, P3, P4, F1", "10 Hz", "Synced"],
      [4, "ULTRON-PWR-CT-4CH", "Induction Generator & Pump CT Power Card", 4, "E1, E2", "10 Hz", "Synced"],
      [5, "ULTRON-DI-24VDC-8CH", "PLC Digital State & Interlock Card", 8, "S1, S2", "On Change", "Synced"],
    ] as const;
    for (const sl of slots) {
      await client.query(
        `INSERT INTO rack_slots (rack_id, slot_number, card_model, module_type, channel_count, connected_probes, sample_rate, sync_state)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [unit.rackId, sl[0], sl[1], sl[2], sl[3], sl[4], sl[5], sl[6]],
      );
    }

    // Diagnosis Record & Trend Records
    const diagIns = await client.query<{ id: number }>(
      `INSERT INTO diagnosis_records (
         machine_id, overall_condition, confidence, engine_version, summary,
         maintenance_priority, prescriptive_action
       ) VALUES ($1, $2, $3, 'ULTRON-VPC v3.2', $4, $5, $6) RETURNING id`,
      [unit.id, unit.diagCondition, unit.findingProb, unit.diagSummary, unit.diagPriority, unit.diagAction],
    );
    const diagId = diagIns.rows[0].id;
    await client.query(
      `INSERT INTO diagnosis_findings (diagnosis_id, finding_code, fault, probability, location, frequency, severity, recommendation, sort_order)
       VALUES ($1, $2, $3, $4, $5, '1 Hz Cycle Profile', $6, $7, 0)`,
      [
        diagId,
        unit.findingCode,
        unit.findingFault,
        unit.findingProb,
        unit.findingLoc,
        unit.findingSev,
        unit.findingRec,
      ],
    );
    await client.query(
      `INSERT INTO diagnosis_peak_frequencies (diagnosis_id, name, freq, amplitude, status, sort_order)
       VALUES
       ($1, 'Vacuum Pump Shaft 1X (V1)', '24.2 Hz', $2, $3, 0),
       ($1, 'Vacuum Pump Vane Pass (V1)', '96.8 Hz', $4, $3, 1),
       ($1, 'Direct Vibration Table Fundamental (V2)', '50.0 Hz', '1.80 mm/s', 'Normal', 2)`,
      [
        diagId,
        unit.id === "VPC-068" ? "4.90 mm/s" : "2.20 mm/s",
        unit.id === "VPC-068" ? "Elevated" : "Normal",
        unit.id === "VPC-068" ? "1.85 mm/s" : "0.62 mm/s",
      ],
    );

    for (const s of VPC_SIGNALS) {
      if (s.type === "state") continue;
      const b = limitBand(s.limit, s.base);
      const warn = b?.warnHi ?? b?.warnLo ?? s.base * 1.15;
      const alarm = b?.alarmHi ?? b?.alarmLo ?? s.base * 1.25;
      const tr = await client.query<{ id: number }>(
        `INSERT INTO trend_records (
           machine_id, metric_key, label, unit, baseline, advisory_limit, critical_limit,
           stat_mean, stat_peak, stat_crest_factor, stat_kurtosis, stat_drift_30d
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1.42, 2.95, '+0.1%') RETURNING id`,
        [
          unit.id,
          s.tag,
          `${s.name} (${s.tag})`,
          s.unit,
          s.base,
          warn,
          alarm,
          s.base.toFixed(s.decimals),
          (s.base + s.sigma * 1.8).toFixed(s.decimals),
        ],
      );
      const trendId = tr.rows[0].id;
      for (let i = 0; i < 12; i++) {
        const hh = String(8 + i).padStart(2, "0") + ":00";
        const val = +(s.base + Math.sin(i * 0.7) * s.sigma * 0.4).toFixed(s.decimals);
        await client.query(
          `INSERT INTO trend_points (trend_id, sample_index, time_label, value) VALUES ($1, $2, $3, $4)`,
          [trendId, i, hh, val],
        );
      }
    }

    // Operating Events
    for (const ev of unit.events) {
      await client.query(
        `INSERT INTO operating_events (id, machine_id, actor_user_id, timestamp, type, severity, title, description, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [ev.id, unit.id, VPC_USER.id, ev.timestamp, ev.type, ev.severity, ev.title, ev.description, ev.source],
      );
    }

    // Edge Gateway, Source, Cards & Points
    await client.query(
      `INSERT INTO edge_gateways (id, code, name, broker_id, site_node_id, location, ip_address, model, firmware, enabled, notes, sort_order, security_zone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11, $12)`,
      [
        unit.gwId,
        unit.rackId,
        `${unit.name} Edge Gateway`,
        broker,
        unit.areaId,
        `${unit.bayLocation} — Control Cabinet`,
        unit.ipAddress,
        "ULTRON Industrial Edge Gateway + 4-ch IEPE DAQ + Analog/PLC Interface",
        "v4.8.2",
        "Schultheiss VPC 066 monitoring gateway: reads 7 built-in / PLC tags (T1, P1, P2, F1, E1, S1, S2) + 8 external sensors (P3, T2, T3, V1, T4, P4, E2, optional V2) and computes cooling ΔT (DT1 = T3 − T2).",
        gwOrder++,
        "Level 2 — Jewellery Casting Cell Network (read-only)",
      ],
    );

    const srcId = `src-${unit.id.toLowerCase()}-${randomUUID().slice(0, 6)}`;
    await client.query(
      `INSERT INTO edge_sources (id, gateway_id, code, name, kind, protocol, machine_id, model, enabled, sort_order, notes, security_zone)
       VALUES ($1, $2, $3, $4, 'plc', 'modbus_tcp', $5, 'Schultheiss Automatic Program Control + ULTRON DAQ', TRUE, 0, 'Built-in PLC tags + external pressure, RTD, current and IEPE vibration channels', 'Level 1 — Machine Control Cabinet')`,
      [srcId, unit.gwId, `${unit.id}-PLC-DAQ`, `${unit.name} Control Cabinet & External DAQ`, unit.id],
    );

    const cardDefs = [
      { code: "1", type: "iepe", count: 4, model: "ULTRON-DAQ-IEPE-4CH", notes: "Slot 01 — Vacuum pump (V1) & optional flask vibration base (V2)" },
      { code: "2", type: "rtd", count: 8, model: "ULTRON-AI-THERM-8CH", notes: "Slot 02 — Crucible TC (T1), Cooling water In/Out (T2, T3) & Pump temp (T4)" },
      { code: "3", type: "analog_4_20", count: 8, model: "ULTRON-AI-420MA-8CH", notes: "Slot 03 — Chamber pressures (P1, P2), Gas supply (P3), Vacuum branch (P4) & Flow (F1)" },
      { code: "4", type: "ct", count: 4, model: "ULTRON-PWR-CT-4CH", notes: "Slot 04 — Induction power (E1) & Vacuum pump motor current (E2)" },
      { code: "5", type: "digital_in", count: 8, model: "ULTRON-DI-24VDC-8CH", notes: "Slot 05 — Sealing rod actuator (S1) & Chamber/flask door interlock (S2)" },
    ];
    for (const [idx, cd] of cardDefs.entries()) {
      await client.query(
        `INSERT INTO edge_cards (id, source_id, code, card_type, channel_count, model, notes, enabled, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)`,
        [`card-${unit.id.toLowerCase()}-${cd.code}`, srcId, cd.code, cd.type, cd.count, cd.model, cd.notes, idx + 1],
      );
    }

    const slotCh = new Map<string, number>();
    for (const s of VPC_SIGNALS) {
      if (s.origin === "calculated") continue;
      const b = limitBand(s.limit, s.base);
      const fam = cardFamily(s.tag);
      const slotNum = fam.slot.match(/Slot 0(\d)/)?.[1] ?? "1";
      const ch = (slotCh.get(slotNum) ?? 0) + 1;
      slotCh.set(slotNum, ch);
      await client.query(
        `INSERT INTO edge_points (id, source_id, tag, name, slot, channel, address, unit, data_type, sample_rate, alert_limit, danger_limit, machine_id, signal_tag, source_tag, enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, TRUE)`,
        [
          `pt-${unit.id.toLowerCase()}-${s.tag.toLowerCase()}`,
          srcId,
          s.tag,
          s.name,
          slotNum,
          String(ch),
          String(fam.modbusBase + ch),
          s.unit,
          s.type === "state" ? "bool" : "float",
          s.type === "state" ? "On change" : s.tag === "V1" || s.tag === "V2" ? "25.6 kS/s" : "1 Hz",
          s.type === "state" ? null : (b?.warnHi ?? b?.warnLo ?? null),
          s.type === "state" ? null : (b?.alarmHi ?? b?.alarmLo ?? null),
          unit.id,
          s.tag,
          `${unit.id.replace("-", "")}.${s.tag}`,
        ],
      );
      totalPoints++;
    }
  }

  counts.hierarchy_nodes = 1 + VPC_UNITS.length * 2;
  counts.machines = VPC_UNITS.length;
  counts.edge_points = totalPoints;
  return counts;
}
