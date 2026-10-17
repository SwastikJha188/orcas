import type { PoolClient } from "pg";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { describeLimit, limitBand } from "@/lib/kiln-sim/signals";
import {
  VPC_MACHINE,
  VPC_MACHINE_ID,
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
  name: "Jewellery Casting Plant — Schultheiss VPC 066",
  shortName: "Jewellery Casting",
  region: "Precious Metals Manufacturing Division",
  location: "Jewellery Casting Section — Automatic Vacuum-Pressure Casting Cell",
  coordinates: "19°07'14\"N 72°52'06\"E",
  timeZone: "Asia/Kolkata",
  status: "Operational",
  description:
    "Automatic two-chamber vacuum-pressure investment casting cell (Schultheiss VPC 066 Power / Supreme) for gold, silver, platinum, palladium, brass and bronze jewellery trees. 12 kW medium-frequency induction generator (400 V, 3-phase, 16 A), bottom-pouring crucible with stopper rod actuator, -0.90 bar lower flask vacuum, +1.8 bar upper chamber overpressure, cooling-water loop and optional direct solidification vibration.",
  commissionedYear: 2024,
  designCapacity: "Ø130 × 260 mm flask · 12 kW induction · max 1300–1600 °C · 3 bar overpressure",
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

const AREA_ID = "area-vpc-casting";
const AREA_NAME = "Jewellery vacuum-pressure casting cell";

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

  // Clean existing VPC rows
  await client.query("DELETE FROM edge_gateways WHERE id = 'gw-vpc-066'");
  await client.query("DELETE FROM machines WHERE id = $1", [VPC_MACHINE_ID]);
  await client.query("DELETE FROM sensor_definitions WHERE id LIKE 'VPC-066-%'");
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

  // 3. Hierarchy: plant -> area -> machine
  await client.query(
    `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order) VALUES ($1, $1, NULL, $2, 'plant', NULL, $3)`,
    [VPC_PLANT_ID, PLANT.name, sortOrder],
  );
  await client.query(
    `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order) VALUES ($1, $2, $3, $4, 'area', NULL, 0)`,
    [AREA_ID, VPC_PLANT_ID, VPC_PLANT_ID, AREA_NAME],
  );

  // 4. Equipment model & Machine VPC-066
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

  await client.query(
    `INSERT INTO machines (id, plant_id, process_node_id, model_id, name, serial_number, commissioned, bay_location, coordinates, criticality, status, health)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Operational', 99)`,
    [
      VPC_MACHINE_ID,
      VPC_PLANT_ID,
      AREA_ID,
      "mdl-vpc-066",
      VPC_MACHINE.name,
      "SCH-VPC066-2024-01",
      "2024",
      "Jewellery Casting Bay 01 (650 × 1000 × 1620 mm)",
      PLANT.coordinates,
      "A (Critical)",
    ],
  );

  await client.query(
    `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order)
     VALUES ($1, $2, $3, $4, 'machine', $5, 0)`,
    ["mach-vpc-066", VPC_PLANT_ID, AREA_ID, `Schultheiss VPC 066 (${VPC_MACHINE_ID})`, VPC_MACHINE_ID],
  );
  counts.hierarchy_nodes = 3;
  counts.machines = 1;

  // 5. Systems & Subassemblies
  const layout = PYRO_LAYOUT[VPC_MACHINE_ID];
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
    await client.query(
      `INSERT INTO machine_systems (id, machine_id, system_id, part_code, name, short_name, health, status, bbox_x, bbox_y, bbox_w, bbox_h, critical_notes, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, 99, 'Normal', $7, $8, $9, $10, $11, $12)`,
      [
        `${VPC_MACHINE_ID}-${sy.id}`,
        VPC_MACHINE_ID,
        sy.id,
        `P${i + 1}`,
        sy.name,
        sy.name,
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
    await client.query(
      `INSERT INTO machine_subassemblies (id, machine_id, machine_system_ref_id, system_id, subassembly_id, name, short_name, health, status, criticality, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 99, 'Normal', 'A', $8)`,
      [`${VPC_MACHINE_ID}-${sa.id}`, VPC_MACHINE_ID, `${VPC_MACHINE_ID}-${sa.system}`, sa.system, sa.id, sa.name, sa.name, i],
    );
  }

  // 6. Sensor Definitions & Mapped Signals
  const chCounters = new Map<string, number>();
  for (const s of VPC_SIGNALS) {
    const spec = VPC_SPEC[s.tag];
    const pad = layout?.pads[s.tag];
    const sub = VPC_SUBASSEMBLIES.find((x) => x.id === s.sub)!;
    const defId = `${VPC_MACHINE_ID}-${s.tag}`;
    const fam = cardFamily(s.tag);
    const chIdx = (chCounters.get(fam.slot) ?? 0) + 1;
    chCounters.set(fam.slot, chIdx);

    const b = limitBand(s.limit, s.base);
    const desc = describeLimit(s.limit, s.unit);
    const warnVal = b?.warnHi ?? (b?.warnLo !== undefined ? Math.abs(b.warnLo) : 0);
    const alarmVal = b?.alarmHi ?? (b?.alarmLo !== undefined ? Math.abs(b.alarmLo) : 0);
    const maxScale = s.type === "state" ? 1 : Math.max(Math.abs(alarmVal) * 1.25, Math.abs(s.base) * 1.4, 1);
    const value = s.type === "state" ? (s.states?.normal ?? "OK") : s.base.toFixed(s.decimals);
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

    await client.query(
      `INSERT INTO mapped_signals (id, machine_id, sensor_def_id, tag, subassembly_ref_id, edge_rack, card_slot, modbus_address, current_value, numeric_value, quality, status, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '100% Good', 'Normal', $11)`,
      [
        defId,
        VPC_MACHINE_ID,
        defId,
        s.tag,
        `${VPC_MACHINE_ID}-${s.sub}`,
        "ULTRON-EDGE-VPC-066 (Jewellery Casting Cell)",
        s.origin === "calculated" ? "ANALYTICS-CALC" : fam.slot,
        s.origin === "calculated" ? "Derived (T3 − T2)" : String(fam.modbusBase + chIdx),
        value,
        s.type === "state" ? 1 : s.base,
        spec?.location ?? "Calculated on the edge gateway",
      ],
    );
  }
  counts.sensors = VPC_SIGNALS.length;

  // 7. Rack Chassis & Rack Slots
  const rackId = "ULTRON-EDGE-VPC-066";
  await client.query(
    `INSERT INTO rack_chassis (id, machine_id, name, cabinet_location, ip_address, protocol, firmware, uptime, psu_status, packet_loss, latency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      rackId,
      VPC_MACHINE_ID,
      "Schultheiss VPC 066 Edge Acquisition Unit",
      "Jewellery Casting Bay 01 — Control Cabinet Side-Mount (IP54)",
      "10.24.66.10",
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
      [rackId, sl[0], sl[1], sl[2], sl[3], sl[4], sl[5], sl[6]],
    );
  }

  // 8. Diagnosis Record & Trend Records
  const diagIns = await client.query<{ id: number }>(
    `INSERT INTO diagnosis_records (
       machine_id, overall_condition, confidence, engine_version, summary,
       maintenance_priority, prescriptive_action
     ) VALUES ($1, 'Nominal', 98.5, 'ULTRON-VPC v3.2', $2, 'Low', $3) RETURNING id`,
    [
      VPC_MACHINE_ID,
      "All 16 VPC 066 monitoring points nominal: melt temperature T1 steady at 1,020 °C (E1 8.40 kW), lower flask vacuum P2 at 300 mbar abs (branch P4 285 mbar), upper overpressure P1 at 1.20 bar(g), cooling-water flow F1 at 14.0 L/min (ΔT 5.0 °C).",
      "Maintain standard pre-cast checks on chamber/flask seals (S2), crucible bottom stopper rod seat (S1), and vacuum pump oil level before each casting shift.",
    ],
  );
  const diagId = diagIns.rows[0].id;
  await client.query(
    `INSERT INTO diagnosis_findings (diagnosis_id, finding_code, fault, probability, location, frequency, severity, recommendation, sort_order)
     VALUES ($1, 'F-VPC-01', 'Baseline Vacuum & Overpressure Integrity Verified', 99, 'Upper Melting & Lower Flask Chambers (P1, P2, P4)', '1 Hz Cycle Profile', 'Normal', 'No chamber leak or pump wear detected; P2 (300 mbar abs) tracks P4 (285 mbar abs) within 15 mbar.', 0)`,
    [diagId],
  );
  await client.query(
    `INSERT INTO diagnosis_peak_frequencies (diagnosis_id, name, freq, amplitude, status, sort_order)
     VALUES
     ($1, 'Vacuum Pump Shaft 1X (V1)', '24.2 Hz', '1.80 mm/s', 'Normal', 0),
     ($1, 'Vacuum Pump Vane Pass (V1)', '96.8 Hz', '0.62 mm/s', 'Normal', 1),
     ($1, 'Direct Vibration Table Fundamental (V2)', '50.0 Hz', '3.20 mm/s', 'Normal', 2)`,
    [diagId],
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
        VPC_MACHINE_ID,
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

  // 9. Operating Events
  await client.query(
    `INSERT INTO operating_events (id, machine_id, actor_user_id, timestamp, type, severity, title, description, source)
     VALUES
     ('evt-vpc-01', $1, $2, '10:42:18', 'Operating Change', 'Normal', 'Casting Cycle #184 Completed — 18 kt Yellow Gold Tree (1.0 kg)', 'Bottom pour completed at T1 = 1,020 °C with P2 = 300 mbar abs lower flask vacuum and P1 = 1.20 bar(g) inert gas overpressure.', 'Schultheiss VPC 066 PLC'),
     ('evt-vpc-02', $1, $2, '09:15:00', 'Inspection', 'Normal', 'Cooling Water & Vacuum Pre-Start Verification Passed', 'Cooling flow F1 verified at 14.0 L/min (ΔT = 5.0 °C); vacuum branch P4 reached 285 mbar abs in 18 s.', 'ULTRON Edge Gateway')`,
    [VPC_MACHINE_ID, VPC_USER.id],
  );

  // 10. Edge Gateway, Sources, Cards & Points
  const broker = (await client.query("SELECT id FROM edge_brokers ORDER BY sort_order ASC LIMIT 1")).rows[0]?.id ?? null;
  const gwOrder = Number((await client.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM edge_gateways")).rows[0].n);
  const gwId = "gw-vpc-066";
  await client.query(
    `INSERT INTO edge_gateways (id, code, name, broker_id, site_node_id, location, ip_address, model, firmware, enabled, notes, sort_order, security_zone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11, $12)`,
    [
      gwId,
      rackId,
      "Jewellery Casting Cell Edge Gateway (VPC 066)",
      broker,
      AREA_ID,
      "Jewellery Casting Bay 01 — Control Cabinet",
      "10.24.66.10",
      "ULTRON Industrial Edge Gateway + 4-ch IEPE DAQ + Analog/PLC Interface",
      "v4.8.2",
      "Schultheiss VPC 066 monitoring gateway: reads 7 built-in / PLC tags (T1, P1, P2, F1, E1, S1, S2) + 8 external sensors (P3, T2, T3, V1, T4, P4, E2, optional V2) and computes cooling ΔT (DT1 = T3 − T2).",
      gwOrder,
      "Level 2 — Jewellery Casting Cell Network (read-only)",
    ],
  );

  const srcId = `src-${randomUUID().slice(0, 8)}`;
  await client.query(
    `INSERT INTO edge_sources (id, gateway_id, code, name, kind, protocol, machine_id, model, enabled, sort_order, notes, security_zone)
     VALUES ($1, $2, 'VPC-PLC-DAQ', 'Schultheiss VPC 066 Control Cabinet & External DAQ', 'plc', 'modbus_tcp', $3, 'Schultheiss Automatic Program Control + ULTRON DAQ', TRUE, 0, 'Built-in PLC tags + external pressure, RTD, current and IEPE vibration channels', 'Level 1 — Machine Control Cabinet')`,
    [srcId, gwId, VPC_MACHINE_ID],
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
      [`card-vpc-${cd.code}`, srcId, cd.code, cd.type, cd.count, cd.model, cd.notes, idx + 1],
    );
  }

  let points = 0;
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
        `pt-vpc-${s.tag.toLowerCase()}`,
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
        VPC_MACHINE_ID,
        s.tag,
        `VPC066.${s.tag}`,
      ],
    );
    points++;
  }
  counts.edge_points = points;
  return counts;
}
