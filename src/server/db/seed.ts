import pool, { initDatabase } from "./index";
import {
  PLANT_HIERARCHY,
  ASSET_MACHINES,
  DIAGNOSIS_RECORDS,
  TREND_RECORDS,
  OPERATING_EVENTS,
  SAP_EQUIPMENT_RECORDS,
  RACK_RECORDS,
  HierarchyNode,
} from "@/components/assets/assets-data";
import {
  KLN_SENSORS,
  KLN_SYSTEMS,
  KLN_SUBASSEMBLIES,
} from "@/server/db/seed-data/kiln";
import { getDiagnosticsForSensor } from "@/components/assets/kiln-diagnostics";
import { getMachineProcesses } from "@/components/assets/process-data";
import type { PoolClient } from "pg";
import { FLEET_CARDS, FLEET_RACKS, FLEET_SENSOR_SPECS } from "./seed-data/fleet-sensor-specs";
import { FLEET_DIAGNOSIS_RECORDS, buildTrendRecord, type TrendSignalRow } from "./seed-data/fleet-history";
import { applyKilnFleet } from "./kiln-fleet";
import { applyPyroLine } from "./pyro-line";
import { PYRO_MACHINE_IDS } from "@/lib/pyro-sim/signals";
import { KILN_FLEET_IDS } from "@/lib/kiln-sim/fleet";

/* -------------------------------------------------------------------------- */
/* Seed Data: 5 Normalized Roles, 6 Multi-Plant Users, 3 Industrial Plants    */
/* -------------------------------------------------------------------------- */

export const SEED_ROLES = [
  {
    id: "role-admin",
    name: "Enterprise System Administrator",
    description: "Full administrative access across all plants, users, edge gateways, and equipment registries.",
    canManageUsers: true,
    canManagePlants: true,
    canManageMachines: true,
    canManageEdge: true,
    canAckAlerts: true,
    canManageWorkOrders: true,
    sortOrder: 1,
  },
  {
    id: "role-plant-mgr",
    name: "Plant Operations Director",
    description: "Manages assigned plant hierarchies, machines, work orders, and operational shift teams.",
    canManageUsers: false,
    canManagePlants: true,
    canManageMachines: true,
    canManageEdge: true,
    canAckAlerts: true,
    canManageWorkOrders: true,
    sortOrder: 2,
  },
  {
    id: "role-reliability",
    name: "Lead Reliability & Vibration Engineer",
    description: "Configures sensor thresholds, diagnostic rules, edge acquisition racks, and reliability work orders.",
    canManageUsers: false,
    canManagePlants: false,
    canManageMachines: true,
    canManageEdge: true,
    canAckAlerts: true,
    canManageWorkOrders: true,
    sortOrder: 3,
  },
  {
    id: "role-operator",
    name: "Control Room Lead Operator",
    description: "Monitors real-time plant telemetry, acknowledges process/equipment alerts, and logs shift events.",
    canManageUsers: false,
    canManagePlants: false,
    canManageMachines: false,
    canManageEdge: false,
    canAckAlerts: true,
    canManageWorkOrders: true,
    sortOrder: 4,
  },
  {
    id: "role-viewer",
    name: "Process & Maintenance Observer",
    description: "Read-only access to assigned plants, asset schematics, trends, and diagnostic reports.",
    canManageUsers: false,
    canManagePlants: false,
    canManageMachines: false,
    canManageEdge: false,
    canAckAlerts: false,
    canManageWorkOrders: false,
    sortOrder: 5,
  },
] as const;

export const SEED_PLANTS = [
  {
    id: "plant-kln",
    code: "CEM-LUS-01",
    name: "Demo Cement Plant — Pyro Line (KLN-01)",
    shortName: "Cement Pyro Plant",
    region: "Lusaka South Industrial Zone",
    location: "Chilanga Pyroprocessing Complex, Lusaka, Zambia",
    coordinates: "14°58'12\"S 28°14'45\"E",
    timeZone: "Africa/Lusaka",
    managerUserId: "usr-mwamba",
    status: "Operational",
    description: "5,000 t/d dry-process clinker pyroprocessing facility with 3 rotary kilns (KLN-01, KLN-02, KLN-03), 5-stage cyclone preheater, and grate cooler.",
    commissionedYear: 2021,
    designCapacity: "15,000 t/d Clinker (3 × 5,000 t/d Lines)",
    sortOrder: 0,
  },
  {
    id: "plant-conc",
    code: "MIN-KAN-02",
    name: "Kansanshi Copper Concentrator & Comminution Plant",
    shortName: "Copper Concentrator",
    region: "North-Western Copperbelt Province",
    location: "Solwezi Sulfide Comminution Circuit, Zambia",
    coordinates: "12°10'15\"S 26°26'28\"E",
    timeZone: "Africa/Lusaka",
    managerUserId: "usr-banda",
    status: "Advisory",
    description: "High-tonnage sulfide ore crushing, overland conveying, 18 MW SAG milling, and dual 13 MW overflow ball mill grinding circuit.",
    commissionedYear: 2019,
    designCapacity: "85,000 t/d Sulfide Ore",
    sortOrder: 1,
  },
  {
    id: "plant-hyd",
    code: "HYD-NDO-03",
    name: "Ndola Hydrometallurgy & Utilities Plant",
    shortName: "Hydromet & Utilities",
    region: "Copperbelt Industrial Corridor",
    location: "Ndola High-Pressure Leach & Utility Complex, Zambia",
    coordinates: "12°58'04\"S 28°38'19\"E",
    timeZone: "Africa/Lusaka",
    managerUserId: "usr-mutale",
    status: "Advisory",
    description: "High-pressure autoclave slurry injection, leach tank agitation, process water circulation, and turbo aeration utilities.",
    commissionedYear: 2021,
    designCapacity: "24,000 m³/d Leach Slurry & Utilities",
    sortOrder: 2,
  },
] as const;

export const SEED_USERS = [
  {
    id: "usr-swastik",
    email: "swastik.jha@ultron.industrial",
    fullName: "Swastik Jha",
    title: "Chief Fleet Reliability Architect",
    department: "Enterprise Asset Intelligence",
    roleId: "role-admin",
    avatarInitials: "SJ",
    phone: "+260 97 800 1001",
    shift: "Global Operations",
    status: "Active",
    defaultPlantId: "plant-kln",
    plants: [
      { plantId: "plant-kln", accessLevel: "admin", isPrimary: true },
      { plantId: "plant-conc", accessLevel: "admin", isPrimary: false },
      { plantId: "plant-hyd", accessLevel: "admin", isPrimary: false },
    ],
  },
  {
    id: "usr-mwamba",
    email: "chanda.mwamba@ultron.industrial",
    fullName: "Dr. Chanda Mwamba",
    title: "Pyroprocessing Plant Director",
    department: "Clinker Pyro Operations",
    roleId: "role-plant-mgr",
    avatarInitials: "CM",
    phone: "+260 97 800 2014",
    shift: "Day Shift (06:00–18:00)",
    status: "Active",
    defaultPlantId: "plant-kln",
    plants: [
      { plantId: "plant-kln", accessLevel: "admin", isPrimary: true },
      { plantId: "plant-conc", accessLevel: "read", isPrimary: false },
    ],
  },
  {
    id: "usr-banda",
    email: "kelvin.banda@ultron.industrial",
    fullName: "Kelvin Banda",
    title: "Concentrator Operations Manager",
    department: "Comminution & Grinding",
    roleId: "role-plant-mgr",
    avatarInitials: "KB",
    phone: "+260 96 440 3102",
    shift: "Day Shift (06:00–18:00)",
    status: "Active",
    defaultPlantId: "plant-conc",
    plants: [
      { plantId: "plant-conc", accessLevel: "admin", isPrimary: true },
      { plantId: "plant-hyd", accessLevel: "write", isPrimary: false },
    ],
  },
  {
    id: "usr-mutale",
    email: "natasha.mutale@ultron.industrial",
    fullName: "Natasha Mutale",
    title: "Principal Vibration & Tribology Engineer",
    department: "Condition Monitoring & ISO 20816",
    roleId: "role-reliability",
    avatarInitials: "NM",
    phone: "+260 97 512 8890",
    shift: "Day Shift (06:00–18:00)",
    status: "On Call",
    defaultPlantId: "plant-hyd",
    plants: [
      { plantId: "plant-kln", accessLevel: "write", isPrimary: false },
      { plantId: "plant-conc", accessLevel: "write", isPrimary: false },
      { plantId: "plant-hyd", accessLevel: "admin", isPrimary: true },
    ],
  },
  {
    id: "usr-phiri",
    email: "joseph.phiri@ultron.industrial",
    fullName: "Joseph Phiri",
    title: "Senior CCR Pyro & Mill Operator",
    department: "Central Control Room (CCR)",
    roleId: "role-operator",
    avatarInitials: "JP",
    phone: "+260 95 301 7741",
    shift: "Night Shift (18:00–06:00)",
    status: "Active",
    defaultPlantId: "plant-kln",
    plants: [
      { plantId: "plant-kln", accessLevel: "write", isPrimary: true },
      { plantId: "plant-conc", accessLevel: "write", isPrimary: false },
    ],
  },
  {
    id: "usr-tembo",
    email: "grace.tembo@ultron.industrial",
    fullName: "Grace Tembo",
    title: "SAP PM Maintenance Planner",
    department: "Maintenance Planning & Reliability",
    roleId: "role-viewer",
    avatarInitials: "GT",
    phone: "+260 97 922 4500",
    shift: "Day Shift (06:00–18:00)",
    status: "Active",
    defaultPlantId: "plant-conc",
    plants: [
      { plantId: "plant-kln", accessLevel: "read", isPrimary: false },
      { plantId: "plant-conc", accessLevel: "read", isPrimary: true },
      { plantId: "plant-hyd", accessLevel: "read", isPrimary: false },
    ],
  },
] as const;

/**
 * Writes the non-kiln limits, sub-assembly mapping, acquisition mapping and
 * failure modes from FLEET_SENSOR_SPECS onto `sensor_definitions` and `mapped_signals`.
 * Idempotent; KLN-01..03 are not touched.
 */
export async function applyFleetSensorSpecs(client: PoolClient): Promise<number> {
  let updated = 0;
  const pointCounter = new Map<string, number>();
  const channelCounter = new Map<string, number>();

  for (const spec of FLEET_SENSOR_SPECS) {
    const partKey = `${spec.machineId}|${spec.part}`;
    const point = (pointCounter.get(partKey) ?? 0) + 1;
    pointCounter.set(partKey, point);
    const card = FLEET_CARDS[spec.card];
    const chKey = `${spec.machineId}|${spec.card}`;
    const channel = channelCounter.get(chKey) ?? 0;
    channelCounter.set(chKey, channel + 1);
    const rack = FLEET_RACKS[spec.machineId];
    const sensorDefId = `${spec.machineId}-${spec.tag}`;

    // Update normalized sensor_definitions row
    await client.query(
      `UPDATE sensor_definitions SET
         unit = COALESCE($2, unit),
         instrument = $3,
         sensor_type = $4,
         range_val = $5,
         nominal_band = $6,
         normal_threshold = $7,
         warning_val = $8,
         alarm_val = $9,
         warning_threshold = $10,
         alarm_threshold = $11,
         standard = $12,
         sample_rate = $13,
         point = $14,
         reasons = $15::jsonb
       WHERE id = $1`,
      [
        sensorDefId,
        spec.unit ?? null,
        spec.instrument,
        card.sensorType,
        spec.range,
        spec.normalBand,
        `${spec.normalBand} (Nominal)`,
        spec.warning,
        spec.alarm,
        spec.warningText,
        spec.alarmText,
        spec.standard,
        spec.sampleRate,
        `P${point}`,
        JSON.stringify(spec.reasons),
      ],
    );

    // Update normalized mapped_signals row (subassembly_ref_id FK + acquisition address)
    const res = await client.query(
      `UPDATE mapped_signals m SET
         subassembly_ref_id = sa.id,
         current_value = CASE WHEN $4::text IS NOT NULL THEN regexp_replace(m.current_value, '[^0-9.\\-]', '', 'g') ELSE m.current_value END,
         edge_rack = $5,
         card_slot = $6,
         modbus_address = $7
       FROM machine_subassemblies sa
       WHERE m.machine_id = $1 AND m.tag = $2
         AND sa.machine_id = m.machine_id AND sa.subassembly_id = $3`,
      [
        spec.machineId,
        spec.tag,
        spec.part,
        spec.unit ?? null,
        rack,
        card.card,
        String(card.base + channel),
      ],
    );
    updated += res.rowCount ?? 0;
  }

  return updated;
}

/**
 * Trend history and diagnosis records for the non-kiln machines in 3NF tables
 * (`trend_records` + `trend_points`, `diagnosis_records` + `diagnosis_findings` + `diagnosis_peak_frequencies`).
 */
export async function applyFleetHistory(client: PoolClient): Promise<{ trends: number; diagnoses: number }> {
  const signals = await client.query<TrendSignalRow & { sensor_def_id: string }>(
    `SELECT m.machine_id, m.tag, m.sensor_def_id, sd.name, sd.unit, m.numeric_value,
            sd.warning_val, sd.alarm_val, sd.nominal_band, sd.sensor_type, m.status
       FROM mapped_signals m
       JOIN sensor_definitions sd ON sd.id = m.sensor_def_id
      WHERE m.machine_id <> ALL($1) AND lower(sd.unit) <> 'state'
      ORDER BY m.machine_id, m.tag`,
    [[...KILN_FLEET_IDS, ...PYRO_MACHINE_IDS]],
  );

  // Deleting trend_records cascades to trend_points automatically via FK!
  await client.query("DELETE FROM trend_records WHERE machine_id <> ALL($1)", [[...KILN_FLEET_IDS, ...PYRO_MACHINE_IDS]]);
  let trends = 0;

  for (const row of signals.rows) {
    const t = buildTrendRecord(row);
    const ins = await client.query<{ id: number }>(
      `INSERT INTO trend_records (
         machine_id, metric_key, label, unit, baseline, advisory_limit, critical_limit,
         stat_mean, stat_peak, stat_crest_factor, stat_kurtosis, stat_drift_30d
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [
        t.machineId,
        t.metricKey,
        t.label,
        t.unit,
        t.baseline,
        t.advisoryLimit,
        t.criticalLimit,
        t.stats.mean,
        t.stats.peak,
        t.stats.crestFactor,
        t.stats.kurtosis,
        t.stats.drift30d,
      ],
    );
    const trendId = ins.rows[0].id;
    for (let i = 0; i < t.points.length; i++) {
      await client.query(
        `INSERT INTO trend_points (trend_id, sample_index, time_label, value) VALUES ($1, $2, $3, $4)`,
        [trendId, i, t.points[i].time, t.points[i].value],
      );
    }

    await client.query(
      "UPDATE sensor_definitions SET default_baseline = $2 WHERE id = $1",
      [row.sensor_def_id, t.baseline],
    );
    trends++;
  }

  let diagnoses = 0;
  for (const d of FLEET_DIAGNOSIS_RECORDS) {
    const exists = await client.query("SELECT 1 FROM machines WHERE id = $1", [d.machineId]);
    if (!exists.rowCount) continue;
    await client.query("DELETE FROM diagnosis_records WHERE machine_id = $1", [d.machineId]);
    const ins = await client.query<{ id: number }>(
      `INSERT INTO diagnosis_records (
         machine_id, overall_condition, confidence, engine_version, summary,
         maintenance_priority, prescriptive_action
       ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        d.machineId,
        d.overallCondition,
        d.confidence,
        d.engineVersion,
        d.summary,
        d.maintenancePriority,
        d.prescriptiveAction,
      ],
    );
    const diagId = ins.rows[0].id;
    for (let i = 0; i < d.findings.length; i++) {
      const f = d.findings[i];
      await client.query(
        `INSERT INTO diagnosis_findings (
           diagnosis_id, finding_code, fault, probability, location, frequency, severity, recommendation, sort_order
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [diagId, f.id, f.fault, f.probability, f.location, f.frequency, f.severity, f.recommendation, i],
      );
    }
    for (let i = 0; i < d.peakFrequencies.length; i++) {
      const p = d.peakFrequencies[i];
      await client.query(
        `INSERT INTO diagnosis_peak_frequencies (
           diagnosis_id, name, freq, amplitude, status, sort_order
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [diagId, p.name, p.freq, p.amplitude, p.status, i],
      );
    }
    diagnoses++;
  }
  return { trends, diagnoses };
}

/**
 * In 3NF, `machine_rack_units` is no longer duplicated in the database because
 * `getMachineRackUnits` derives `MachineRackInfo[]` directly from `mapped_signals`
 * + `sensor_definitions` + `rack_chassis`. Kept as a compatibility helper that
 * returns the number of machines with rack signals.
 */
export async function rebuildRackUnitsFromSignals(client: PoolClient): Promise<number> {
  const res = await client.query<{ count: number }>(
    "SELECT COUNT(DISTINCT machine_id)::int AS count FROM mapped_signals",
  );
  return res.rows[0]?.count ?? 0;
}

export async function seedDatabase(): Promise<{
  success: boolean;
  counts: Record<string, number>;
  message: string;
}> {
  // 1. Ensure 3NF Schema is Initialized
  const initRes = await initDatabase();
  if (!initRes.success) {
    throw new Error(`Schema initialization failed: ${initRes.message}`);
  }

  const client = await pool.connect();
  const counts: Record<string, number> = {};

  try {
    await client.query("BEGIN");

    // 2. Clear Existing Data for Clean Seed (CASCADE handles all 3NF child tables)
    await client.query(`
      TRUNCATE TABLE
        work_orders,
        alert_acks,
        ai_predictions,
        process_stages,
        sap_equipment_records,
        rack_slots,
        rack_chassis,
        operating_events,
        trend_points,
        trend_records,
        diagnosis_peak_frequencies,
        diagnosis_findings,
        diagnosis_records,
        mapped_signals,
        sensor_definitions,
        machine_subassemblies,
        machine_systems,
        machines,
        equipment_models,
        hierarchy_nodes,
        user_plant_access,
        plants,
        users,
        roles
      RESTART IDENTITY CASCADE
    `);

    // 3. Seed Roles (3NF)
    for (const r of SEED_ROLES) {
      await client.query(
        `INSERT INTO roles (
           id, name, description, can_manage_users, can_manage_plants, can_manage_machines,
           can_manage_edge, can_ack_alerts, can_manage_work_orders, sort_order
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          r.id,
          r.name,
          r.description,
          r.canManageUsers,
          r.canManagePlants,
          r.canManageMachines,
          r.canManageEdge,
          r.canAckAlerts,
          r.canManageWorkOrders,
          r.sortOrder,
        ],
      );
    }
    counts.roles = SEED_ROLES.length;

    // 4. Seed Users (without default_plant_id first, then link after plants are created)
    for (const u of SEED_USERS) {
      await client.query(
        `INSERT INTO users (
           id, email, full_name, title, department, role_id, avatar_initials, phone, shift, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          u.id,
          u.email,
          u.fullName,
          u.title,
          u.department,
          u.roleId,
          u.avatarInitials,
          u.phone,
          u.shift,
          u.status,
        ],
      );
    }
    counts.users = SEED_USERS.length;

    // 5. Seed Plants (3NF)
    for (const p of SEED_PLANTS) {
      await client.query(
        `INSERT INTO plants (
           id, code, name, short_name, region, location, coordinates, time_zone,
           manager_user_id, status, description, commissioned_year, design_capacity, sort_order
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          p.id,
          p.code,
          p.name,
          p.shortName,
          p.region,
          p.location,
          p.coordinates,
          p.timeZone,
          p.managerUserId,
          p.status,
          p.description,
          p.commissionedYear,
          p.designCapacity,
          p.sortOrder,
        ],
      );
    }
    counts.plants = SEED_PLANTS.length;

    // 6. Link Users' default_plant_id and user_plant_access (3NF M:N)
    let accessCount = 0;
    for (const u of SEED_USERS) {
      await client.query("UPDATE users SET default_plant_id = $2 WHERE id = $1", [u.id, u.defaultPlantId]);
      for (const acc of u.plants) {
        await client.query(
          `INSERT INTO user_plant_access (user_id, plant_id, access_level, is_primary)
           VALUES ($1, $2, $3, $4)`,
          [u.id, acc.plantId, acc.accessLevel, acc.isPrimary],
        );
        accessCount++;
      }
    }
    counts.user_plant_access = accessCount;

    // 7. Seed Hierarchy Nodes (plant / area / group first, then machine leaf nodes after machines exist)
    let hierarchyCount = 0;
    const machineNodeQueue: Array<{
      node: HierarchyNode;
      plantId: string;
      parentId: string;
      sortOrder: number;
    }> = [];
    const processNodeByMachine = new Map<string, { plantId: string; groupId: string }>();

    async function insertNonMachineHierarchy(
      node: HierarchyNode,
      plantId: string,
      parentId: string | null = null,
      sortOrder: number = 0,
    ) {
      if (node.type === "machine" && node.machineId && parentId) {
        machineNodeQueue.push({ node, plantId, parentId, sortOrder });
        processNodeByMachine.set(node.machineId, { plantId, groupId: parentId });
        return;
      }

      await client.query(
        `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order)
         VALUES ($1, $2, $3, $4, $5, NULL, $6)`,
        [node.id, plantId, parentId, node.name, node.type, sortOrder],
      );
      hierarchyCount++;

      if (node.children && node.children.length > 0) {
        for (let i = 0; i < node.children.length; i++) {
          await insertNonMachineHierarchy(node.children[i], plantId, node.id, i);
        }
      }
    }

    for (let i = 0; i < PLANT_HIERARCHY.length; i++) {
      const plantNode = PLANT_HIERARCHY[i];
      await insertNonMachineHierarchy(plantNode, plantNode.id, null, i);
    }

    // 8. Seed Normalized Equipment Models & Machines (3NF)
    const modelIdByKey = new Map<string, string>();
    let modelsCount = 0;
    let machineCount = 0;
    let systemsCount = 0;
    let subassembliesCount = 0;

    for (const m of ASSET_MACHINES) {
      const isKiln = m.id === "KLN-01";
      const modelKey = `${m.manufacturer}|${m.model}`;
      let modelId = modelIdByKey.get(modelKey);
      if (!modelId) {
        modelId = `mdl-${m.id.toLowerCase()}`;
        await client.query(
          `INSERT INTO equipment_models (
             id, type_name, manufacturer, model_number, power_rating, operating_speed, diagram_type
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (manufacturer, model_number) DO UPDATE SET type_name = EXCLUDED.type_name
           RETURNING id`,
          [modelId, m.type, m.manufacturer, m.model, m.powerRating, m.operatingSpeed, m.diagramType],
        );
        modelIdByKey.set(modelKey, modelId);
        modelsCount++;
      }

      const placement = processNodeByMachine.get(m.id);
      const plantId = m.plantId || placement?.plantId || "plant-kln";
      const processNodeId = placement?.groupId || null;

      await client.query(
        `INSERT INTO machines (
           id, plant_id, process_node_id, model_id, name, serial_number,
           commissioned, bay_location, coordinates, criticality, status, health
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          m.id,
          plantId,
          processNodeId,
          modelId,
          m.name,
          m.serialNumber,
          m.commissioned,
          m.location,
          m.coordinates,
          m.criticality,
          m.status,
          m.health,
        ],
      );
      machineCount++;

      // Systems & Sub-assemblies (3NF: `machine_systems` replaces both `machine_parts` and `machine_systems`)
      if (isKiln) {
        for (let idx = 0; idx < KLN_SYSTEMS.length; idx++) {
          const sys = KLN_SYSTEMS[idx];
          await client.query(
            `INSERT INTO machine_systems (
               id, machine_id, system_id, part_code, name, short_name, health, status,
               bbox_x, bbox_y, bbox_w, bbox_h, critical_notes, sort_order
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, $13)`,
            [
              `${m.id}-${sys.id}`,
              m.id,
              sys.id,
              `P${idx + 1}`,
              sys.name,
              sys.shortName,
              sys.health,
              sys.status,
              sys.bbox.x,
              sys.bbox.y,
              sys.bbox.width,
              sys.bbox.height,
              idx,
            ],
          );
          systemsCount++;
        }
        for (let idx = 0; idx < KLN_SUBASSEMBLIES.length; idx++) {
          const sa = KLN_SUBASSEMBLIES[idx];
          await client.query(
            `INSERT INTO machine_subassemblies (
               id, machine_id, machine_system_ref_id, system_id, subassembly_id,
               name, short_name, health, status, criticality, sort_order
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              `${m.id}-${sa.id}`,
              m.id,
              `${m.id}-${sa.systemId}`,
              sa.systemId,
              sa.id,
              sa.name,
              sa.shortName,
              sa.health,
              sa.status,
              sa.criticality,
              idx,
            ],
          );
          subassembliesCount++;
        }
      } else {
        for (let idx = 0; idx < m.parts.length; idx++) {
          const part = m.parts[idx];
          const sysPk = `${m.id}-${part.id}`;
          await client.query(
            `INSERT INTO machine_systems (
               id, machine_id, system_id, part_code, name, short_name, health, status,
               bbox_x, bbox_y, bbox_w, bbox_h, critical_notes, sort_order
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              sysPk,
              m.id,
              part.id,
              part.id,
              part.name,
              part.name,
              part.health,
              part.status,
              part.bbox.x,
              part.bbox.y,
              part.bbox.width,
              part.bbox.height,
              part.criticalNotes || null,
              idx,
            ],
          );
          systemsCount++;

          await client.query(
            `INSERT INTO machine_subassemblies (
               id, machine_id, machine_system_ref_id, system_id, subassembly_id,
               name, short_name, health, status, criticality, sort_order
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'A', $10)`,
            [
              `${m.id}-${part.id}-sa`,
              m.id,
              sysPk,
              part.id,
              part.id,
              part.name,
              part.name,
              part.health,
              part.status,
              idx,
            ],
          );
          subassembliesCount++;
        }
      }
    }

    // Insert queued machine hierarchy nodes (now that `machines` rows exist for the FK)
    for (const item of machineNodeQueue) {
      await client.query(
        `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order)
         VALUES ($1, $2, $3, $4, 'machine', $5, $6)`,
        [item.node.id, item.plantId, item.parentId, item.node.name, item.node.machineId, item.sortOrder],
      );
      hierarchyCount++;
    }

    counts.hierarchy_nodes = hierarchyCount;
    counts.equipment_models = modelsCount;
    counts.machines = machineCount;
    counts.machine_systems = systemsCount;
    counts.machine_subassemblies = subassembliesCount;

    // 9. Seed Normalized Sensor Definitions & Mapped Signals (3NF)
    let sensorDefsCount = 0;
    let signalsCount = 0;

    // 9a. KLN-01 canonical 46 sensors (shared across KLN-01, KLN-02, KLN-03!)
    for (const s of KLN_SENSORS) {
      const diag = getDiagnosticsForSensor(s.tag);
      const sensorDefId = `KLN-${s.tag}`;
      await client.query(
        `INSERT INTO sensor_definitions (
           id, tag, name, instrument, sensor_type, unit, sample_rate, source, priority,
           accuracy, range_val, normal_threshold, warning_threshold, alarm_threshold,
           warning_val, alarm_val, max_scale, nominal_band, standard, default_baseline,
           reasons, x, y, component, point
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9,
           $10, $11, $12, $13, $14,
           $15, $16, $17, $18, $19, $20,
           $21::jsonb, $22, $23, $24, $25
         )`,
        [
          sensorDefId,
          s.tag,
          s.name,
          s.instrument,
          s.sensorType,
          s.unit,
          s.sampleRate,
          s.source,
          s.priority,
          s.accuracy,
          s.range,
          s.normalThreshold,
          s.warningThreshold,
          s.alarmThreshold,
          s.warningVal,
          s.alarmVal,
          s.maxScale,
          s.nominalBand,
          s.standard,
          s.defaultBaseline,
          JSON.stringify(diag.reasons),
          s.x,
          s.y,
          s.component,
          s.point,
        ],
      );
      sensorDefsCount++;

      await client.query(
        `INSERT INTO mapped_signals (
           id, machine_id, sensor_def_id, tag, subassembly_ref_id, edge_rack, card_slot,
           modbus_address, current_value, numeric_value, quality, status, position
         ) VALUES ($1, 'KLN-01', $2, $3, $4, $5, $6, $7, $8, $9, '100% Good', $10, $11)`,
        [
          `KLN-01-${s.tag}`,
          sensorDefId,
          s.tag,
          `KLN-01-${s.subassemblyId}`,
          s.rackId,
          s.cardId,
          s.modbusAddress,
          s.value,
          s.numericValue,
          s.status,
          s.position,
        ],
      );
      signalsCount++;
    }

    // 9b. Non-kiln fleet machines: seed initial sensor_definitions & mapped_signals, then enrich via applyFleetSensorSpecs
    for (const m of ASSET_MACHINES) {
      if (m.id === "KLN-01") continue;
      for (const hs of m.hotspots) {
        const tag = hs.parameter || hs.id;
        const sensorDefId = `${m.id}-${tag}`;
        const num = parseFloat(hs.value) || 0;
        const isTemp = hs.unit.includes("°C");
        const firstSubassemblyRef = `${m.id}-${m.parts[0]?.id ?? "P1"}-sa`;

        await client.query(
          `INSERT INTO sensor_definitions (
             id, tag, name, instrument, sensor_type, unit, sample_rate, source, priority,
             accuracy, range_val, normal_threshold, warning_threshold, alarm_threshold,
             warning_val, alarm_val, max_scale, nominal_band, standard, default_baseline,
             reasons, x, y, component, point
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, 'Existing', 'Required',
             '±0.5%', 'Standard', 'Nominal', 'Warning', 'Alarm',
             0, 0, 100, $8, 'Asset Baseline', $9,
             '[]'::jsonb, $10, $11, $12, 'P1'
           )`,
          [
            sensorDefId,
            tag,
            hs.label,
            isTemp ? "Duplex PT100 RTD Class A" : "Industrial Sensor",
            isTemp ? "Temperature RTD" : "General Sensor",
            hs.unit,
            isTemp ? "1 Hz" : "25.6 kHz",
            `Nominal ${hs.value} ${hs.unit}`,
            num,
            hs.x,
            hs.y,
            hs.component,
          ],
        );
        sensorDefsCount++;

        await client.query(
          `INSERT INTO mapped_signals (
             id, machine_id, sensor_def_id, tag, subassembly_ref_id, edge_rack, card_slot,
             modbus_address, current_value, numeric_value, quality, status, position
           ) VALUES ($1, $2, $3, $4, $5, $6, 'Slot 2 (VIB-8)', '40001 (Float32)', $7, $8, '100% Good', $9, $10)`,
          [
            `${m.id}-${tag}`,
            m.id,
            sensorDefId,
            tag,
            firstSubassemblyRef,
            FLEET_RACKS[m.id] || "ULTRON-G4-01",
            hs.value,
            num,
            hs.status,
            `${hs.component} · Physical Instrument Location`,
          ],
        );
        signalsCount++;
      }
    }

    counts.sensor_definitions = sensorDefsCount;
    counts.mapped_signals = signalsCount;
    counts.fleet_sensor_specs = await applyFleetSensorSpecs(client);

    // 10. Seed Process Stages
    let processStagesCount = 0;
    for (const m of ASSET_MACHINES) {
      const stages = getMachineProcesses(m);
      for (const stage of stages) {
        await client.query(
          `INSERT INTO process_stages (
             machine_id, stage_id, step_number, name, role, subtitle, status, efficiency,
             health_notes, transformation, associated_parts, inputs, outputs, parameters
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb)`,
          [
            m.id,
            stage.id,
            stage.stepNumber,
            stage.name,
            stage.role,
            stage.subtitle,
            stage.status,
            stage.health,
            stage.healthNotes,
            stage.transformation,
            JSON.stringify(stage.associatedParts),
            JSON.stringify(stage.inputs),
            JSON.stringify(stage.outputs),
            JSON.stringify(stage.parameters),
          ],
        );
        processStagesCount++;
      }
    }
    counts.process_stages = processStagesCount;

    // 11. Seed Diagnosis Records (3NF: diagnosis_records + diagnosis_findings + diagnosis_peak_frequencies)
    let diagnosisCount = 0;
    for (const diag of DIAGNOSIS_RECORDS) {
      if (!ASSET_MACHINES.some((m) => m.id === diag.machineId)) continue;
      const ins = await client.query<{ id: number }>(
        `INSERT INTO diagnosis_records (
           machine_id, overall_condition, confidence, engine_version, summary,
           maintenance_priority, prescriptive_action
         ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          diag.machineId,
          diag.overallCondition,
          diag.confidence,
          diag.engineVersion,
          diag.summary,
          diag.maintenancePriority,
          diag.prescriptiveAction,
        ],
      );
      const diagId = ins.rows[0].id;
      for (let i = 0; i < diag.findings.length; i++) {
        const f = diag.findings[i];
        await client.query(
          `INSERT INTO diagnosis_findings (
             diagnosis_id, finding_code, fault, probability, location, frequency, severity, recommendation, sort_order
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [diagId, f.id, f.fault, f.probability, f.location, f.frequency, f.severity, f.recommendation, i],
        );
      }
      for (let i = 0; i < diag.peakFrequencies.length; i++) {
        const p = diag.peakFrequencies[i];
        await client.query(
          `INSERT INTO diagnosis_peak_frequencies (
             diagnosis_id, name, freq, amplitude, status, sort_order
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [diagId, p.name, p.freq, p.amplitude, p.status, i],
        );
      }
      diagnosisCount++;
    }
    counts.diagnosis_records = diagnosisCount;

    // 12. Seed Trend Records (3NF: trend_records + trend_points)
    let trendsCount = 0;
    for (const tr of TREND_RECORDS) {
      if (!ASSET_MACHINES.some((m) => m.id === tr.machineId)) continue;
      for (const m of tr.metrics) {
        const ins = await client.query<{ id: number }>(
          `INSERT INTO trend_records (
             machine_id, metric_key, label, unit, baseline, advisory_limit, critical_limit,
             stat_mean, stat_peak, stat_crest_factor, stat_kurtosis, stat_drift_30d
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
          [
            tr.machineId,
            m.key,
            m.label,
            m.unit,
            m.baseline,
            m.advisoryLimit,
            m.criticalLimit,
            m.stats.mean,
            m.stats.peak,
            m.stats.crestFactor,
            m.stats.kurtosis,
            m.stats.drift30d,
          ],
        );
        const trendId = ins.rows[0].id;
        for (let i = 0; i < m.points.length; i++) {
          await client.query(
            `INSERT INTO trend_points (trend_id, sample_index, time_label, value) VALUES ($1, $2, $3, $4)`,
            [trendId, i, m.points[i].time, m.points[i].value],
          );
        }
        trendsCount++;
      }
    }
    counts.trend_records = trendsCount;

    const fleetHistory = await applyFleetHistory(client);
    counts.fleet_trend_records = fleetHistory.trends;
    counts.fleet_diagnosis_records = fleetHistory.diagnoses;

    // 13. Seed Operating Events (with optional user attribution)
    let eventsCount = 0;
    for (const evt of OPERATING_EVENTS) {
      if (!ASSET_MACHINES.some((m) => m.id === evt.machineId)) continue;
      const actorId = evt.machineId.startsWith("KLN")
        ? "usr-mwamba"
        : ["CRUSH-01", "CONV-04", "SAG-01", "BALL-02", "BALL-03", "PUMP-104"].includes(evt.machineId)
        ? "usr-banda"
        : "usr-mutale";
      await client.query(
        `INSERT INTO operating_events (id, machine_id, actor_user_id, timestamp, type, severity, title, description, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [evt.id, evt.machineId, actorId, evt.timestamp, evt.type, evt.severity, evt.title, evt.description, evt.source],
      );
      eventsCount++;
    }
    counts.operating_events = eventsCount;

    // 14. Seed Rack Chassis & Slots
    let racksCount = 0;
    let rackSlotsCount = 0;
    for (const rc of RACK_RECORDS) {
      if (!ASSET_MACHINES.some((m) => m.id === rc.machineId)) continue;
      const p = rc.primaryRack;
      await client.query(
        `INSERT INTO rack_chassis (
           id, machine_id, name, cabinet_location, ip_address, protocol, firmware, uptime, psu_status, packet_loss, latency
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           cabinet_location = EXCLUDED.cabinet_location,
           uptime = EXCLUDED.uptime,
           psu_status = EXCLUDED.psu_status,
           latency = EXCLUDED.latency`,
        [
          p.rackId,
          rc.machineId,
          p.name,
          p.cabinetLocation,
          p.ipAddress,
          p.protocol,
          p.firmware,
          p.uptime,
          p.psuStatus,
          p.packetLoss,
          p.latency,
        ],
      );
      racksCount++;

      for (const slot of rc.slots) {
        await client.query(
          `INSERT INTO rack_slots (
             rack_id, slot_number, card_model, module_type, channel_count, connected_probes, sample_rate, sync_state
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            p.rackId,
            slot.slotNumber,
            slot.cardModel,
            slot.moduleType,
            slot.channelCount,
            slot.connectedProbes,
            slot.sampleRate,
            slot.syncState,
          ],
        );
        rackSlotsCount++;
      }
    }
    counts.rack_chassis = racksCount;
    counts.rack_slots = rackSlotsCount;

    // 15. Seed SAP Equipment Records (3NF: includes sap_equipment_id, no redundant plant column)
    let sapCount = 0;
    const machineMap = new Map(ASSET_MACHINES.map((m) => [m.id, m]));
    for (const sap of SAP_EQUIPMENT_RECORDS) {
      const m = machineMap.get(sap.machineId);
      if (!m) continue;
      await client.query(
        `INSERT INTO sap_equipment_records (
           sap_number, machine_id, sap_equipment_id, floc, description, work_center, cost_center,
           active_work_order, next_scheduled_pm, sync_state
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (sap_number) DO NOTHING`,
        [
          sap.sapNumber,
          sap.machineId,
          m.sapEquipmentId,
          sap.floc,
          sap.description,
          sap.workCenter,
          sap.costCenter,
          sap.activeWorkOrder || m.activeWorkOrder || null,
          sap.nextScheduledPm,
          sap.syncState,
        ],
      );
      sapCount++;
    }
    counts.sap_equipment_records = sapCount;

    // 16. Clone KLN-02 & KLN-03 in 3NF (reusing KLN-01's model_id and sensor_def_id rows!)
    const fleet = await applyKilnFleet(client);
    // The full pyro line (its own plant, machines, sensors, edge registry and user).
    counts.pyro_line = (await applyPyroLine(client)).sensors;
    counts.kiln_fleet_rows = fleet.rows;

    // 17. Seed Initial Work Orders linked to machines & users (3NF)
    await client.query(
      `INSERT INTO work_orders (
         machine_id, rule_id, title, component, priority, status, action_kind,
         due_label, assignee, assignee_user_id, created_by_user_id, notes
       ) VALUES
       ('BALL-02', 'R-BALL02-02', 'Replace Pinion DE Spherical Roller Bearing & Flush Feed Trunnion Cooler', 'Pinion Drive Shaft', 'P2', 'open', 'repair', 'Next Planned Stop (7d)', 'Kelvin Banda', 'usr-banda', 'usr-mutale', 'Outer-race BPFO harmonics at 98.4 Hz (4.12 mm/s) and feed trunnion at 76.8 °C.'),
       ('PMP-101', 'R-PMP-06', 'Replace Drive-End Bearing B-101 & Clean Suction Strainer', 'Drive-End Bearing Assembly B-101', 'P2', 'in_progress', 'repair', 'Within 14 days', 'Natasha Mutale', 'usr-mutale', 'usr-swastik', 'ISO 20816-3 Group 2 Zone C (3.50 mm/s) with 74.2 Hz BPFO peak and 70 m³/h restricted flow.'),
       ('KLN-02', 'R-SHL-01', 'Inspect Burning Zone Refractory Coating & Shell Hot-Spot Section 42m', 'Rotary Shell & Refractory', 'P1', 'open', 'mitigate', 'Immediate Shift Action', 'Dr. Chanda Mwamba', 'usr-mwamba', 'usr-swastik', 'CemScanner thermal profile elevated on KLN-02 burning zone.')`,
    );
    counts.work_orders = 3;

    await client.query("COMMIT");
    return {
      success: true,
      counts,
      message: `3NF Database seeded with ${SEED_PLANTS.length} plants, ${SEED_USERS.length} users, ${machineCount + fleet.machines} machines, ${sensorDefsCount} unique sensor definitions, and ${signalsCount + 92} mapped signals.`,
    };
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Seeding failed:", errorMsg);
    throw err;
  } finally {
    client.release();
  }
}
