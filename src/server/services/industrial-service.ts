import pool, { query } from "@/server/db";
import { seedDatabase, rebuildRackUnitsFromSignals, applyFleetSensorSpecs, applyFleetHistory } from "@/server/db/seed";
import { applyKilnFleet } from "@/server/db/kiln-fleet";
import { applyPyroLine } from "@/server/db/pyro-line";
import { applyVpcCasting } from "@/server/db/vpc-casting";
import {
  HierarchyNode,
  AssetMachine,
  MappedSignal,
  DiagnosisRecord,
  OperatingEvent,
  RackChassisRecord,
  MachineTrendRecord,
} from "@/components/assets/assets-data";
import { getMachineProcesses, type MachineProcessStage } from "@/components/assets/process-data";
import { buildRacksFromSignals, type MachineRackInfo, type RackChassisInfo, type RackSignalRow } from "@/components/assets/rack-data";

/**
 * Ensures the 3NF database is initialized and seeded before reading.
 * Runs once per process and caches the settled promise on globalThis.
 */
const globalForSeed = globalThis as typeof globalThis & { __orcasSeedCheck?: Promise<void> };

export function ensureDatabaseSeeded(): Promise<void> {
  if (!globalForSeed.__orcasSeedCheck) {
    globalForSeed.__orcasSeedCheck = checkAndSeed().then((ok) => {
      if (!ok) globalForSeed.__orcasSeedCheck = undefined;
    });
  }
  return globalForSeed.__orcasSeedCheck;
}

export function resetSeedCheckCache(): void {
  globalForSeed.__orcasSeedCheck = undefined;
}

async function checkAndSeed(): Promise<boolean> {
  try {
    // Check that the 3NF schema tables (`plants`, `users`, `machines` with `model_id`) are present and populated
    const res = await query<{ machine_count: number; plant_count: number; user_count: number }>(`
      SELECT
        (SELECT COUNT(*)::int FROM machines) AS machine_count,
        (SELECT COUNT(*)::int FROM plants) AS plant_count,
        (SELECT COUNT(*)::int FROM users) AS user_count
    `);
    const row = res.rows[0];
    if (!row || row.machine_count < 4 || row.plant_count < 2 || row.user_count === 0) {
      console.log("Database missing 3NF multi-plant/multi-user records. Auto-seeding PostgreSQL database...");
      await seedDatabase();
      console.log("Auto-seeding completed.");
    }
    return true;
  } catch (err) {
    // A failed check (timeout, lock wait, network) is not an empty database:
    // seeding starts with TRUNCATE, so never seed on an error. Retry next read.
    console.warn("Database seed check failed; not seeding:", err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Fetches the complete plant hierarchy tree from PostgreSQL (3NF: joins `plants` and `machines`
 * so `status`, `health`, and `timeZone` are never duplicated on `hierarchy_nodes`).
 */
export async function getPlantHierarchy(plantId?: string): Promise<HierarchyNode[]> {
  await ensureDatabaseSeeded();

  const params: unknown[] = [];
  let whereClause = "";
  if (plantId) {
    params.push(plantId);
    whereClause = "WHERE hn.plant_id = $1";
  }

  const res = await query<{
    id: string;
    plant_id: string;
    name: string;
    type: "plant" | "area" | "group" | "machine";
    parent_id: string | null;
    machine_id: string | null;
    sort_order: number;
    plant_status: "Operational" | "Advisory" | "Standby" | "Maintenance" | null;
    plant_time_zone: string | null;
    machine_status: "Operational" | "Advisory" | "Standby" | "Maintenance" | null;
    machine_health: number | null;
  }>(
    `SELECT
       hn.id,
       hn.plant_id,
       hn.name,
       hn.type,
       hn.parent_id,
       hn.machine_id,
       hn.sort_order,
       p.status AS plant_status,
       p.time_zone AS plant_time_zone,
       m.status AS machine_status,
       m.health AS machine_health
     FROM hierarchy_nodes hn
     JOIN plants p ON p.id = hn.plant_id
     LEFT JOIN machines m ON m.id = hn.machine_id
     ${whereClause}
     ORDER BY p.sort_order ASC, hn.sort_order ASC, hn.name ASC`,
    params,
  );

  const nodes = res.rows;
  const nodeMap = new Map<string, HierarchyNode>();

  for (const row of nodes) {
    nodeMap.set(row.id, {
      id: row.id,
      name: row.name,
      type: row.type,
      machineId: row.machine_id || undefined,
      status: (row.type === "machine" ? row.machine_status : row.type === "plant" ? row.plant_status : undefined) || undefined,
      health: row.type === "machine" && row.machine_health !== null ? row.machine_health : undefined,
      ...(row.type === "plant" ? { timeZone: row.plant_time_zone ?? null } : {}),
      children: [],
    });
  }

  const rootNodes: HierarchyNode[] = [];
  for (const row of nodes) {
    const current = nodeMap.get(row.id)!;
    if (row.parent_id && nodeMap.has(row.parent_id)) {
      const parent = nodeMap.get(row.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(current);
    } else {
      rootNodes.push(current);
    }
  }

  return rootNodes;
}

/** A real IANA zone name, as the runtime knows it ("Asia/Kolkata", "UTC"). */
export function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone.length <= 64;
  } catch {
    return false;
  }
}

export class HierarchyError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "NOT_A_PLANT" | "INVALID_TIME_ZONE" | "VALIDATION",
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Sets (or clears, with null) a plant's time zone on the normalized `plants` table. */
export async function setPlantTimeZone(
  id: string,
  timeZone: string | null,
): Promise<{ id: string; timeZone: string | null }> {
  await ensureDatabaseSeeded();
  const normalizedZone = timeZone === null ? "UTC" : timeZone;
  if (!isTimeZone(normalizedZone)) {
    throw new HierarchyError("INVALID_TIME_ZONE", `“${timeZone}” is not a known time zone.`, 400);
  }
  const found = await query<{ type: string; plant_id: string }>(
    "SELECT type, plant_id FROM hierarchy_nodes WHERE id = $1",
    [id],
  );
  if (!found.rows[0]) {
    // Also check direct plant ID
    const directPlant = await query<{ id: string }>("SELECT id FROM plants WHERE id = $1", [id]);
    if (!directPlant.rows[0]) {
      throw new HierarchyError("NOT_FOUND", `No plant or hierarchy node “${id}”.`, 404);
    }
    await query("UPDATE plants SET time_zone = $2, updated_at = NOW() WHERE id = $1", [id, normalizedZone]);
    return { id, timeZone };
  }
  if (found.rows[0].type !== "plant") {
    throw new HierarchyError("NOT_A_PLANT", "Only a plant (site) has a time zone; areas and machines inherit it.", 400);
  }
  await query("UPDATE plants SET time_zone = $2, updated_at = NOW() WHERE id = $1", [found.rows[0].plant_id, normalizedZone]);
  return { id, timeZone };
}

/**
 * Fetches all machines (or filtered by plantId) with parts & hotspots derived from 3NF tables:
 * - Plant/Area/ProcessCell derived from `plants` and `hierarchy_nodes`
 * - OEM metadata derived from `equipment_models`
 * - SAP ERP fields derived from `sap_equipment_records`
 * - `parts` derived from `machine_systems`
 * - `hotspots` derived from `mapped_signals` + `sensor_definitions`
 */
export async function getMachines(plantId?: string): Promise<AssetMachine[]> {
  await ensureDatabaseSeeded();

  const params: unknown[] = [];
  let whereSql = "";
  if (plantId) {
    params.push(plantId);
    whereSql = "WHERE m.plant_id = $1";
  }

  const machinesQ = query<{
    id: string;
    plant_id: string;
    name: string;
    plant_name: string;
    area_name: string | null;
    process_cell_name: string | null;
    type_name: string;
    manufacturer: string;
    model_number: string;
    serial_number: string;
    commissioned: string;
    bay_location: string;
    coordinates: string;
    power_rating: string;
    operating_speed: string;
    criticality: "A (Critical)" | "B (Essential)" | "C (General)";
    status: "Operational" | "Advisory" | "Standby" | "Maintenance";
    health: number;
    sap_equipment_id: string | null;
    floc: string | null;
    cost_center: string | null;
    work_center: string | null;
    active_work_order: string | null;
    diagram_type: "mill" | "crusher" | "pump" | "blower" | "kiln";
  }>(
    `SELECT
       m.id,
       m.plant_id,
       m.name,
       p.name AS plant_name,
       area_node.name AS area_name,
       grp_node.name AS process_cell_name,
       em.type_name,
       em.manufacturer,
       em.model_number,
       m.serial_number,
       m.commissioned,
       m.bay_location,
       m.coordinates,
       em.power_rating,
       em.operating_speed,
       m.criticality,
       m.status,
       m.health,
       sap.sap_equipment_id,
       sap.floc,
       sap.cost_center,
       sap.work_center,
       sap.active_work_order,
       em.diagram_type
     FROM machines m
     JOIN plants p ON p.id = m.plant_id
     JOIN equipment_models em ON em.id = m.model_id
     LEFT JOIN hierarchy_nodes grp_node ON grp_node.id = m.process_node_id
     LEFT JOIN hierarchy_nodes area_node ON area_node.id = grp_node.parent_id
     LEFT JOIN sap_equipment_records sap ON sap.machine_id = m.id
     ${whereSql}
     ORDER BY p.sort_order ASC, m.id ASC`,
    params,
  );

  const systemsQ = query<{
    machine_id: string;
    part_code: string;
    name: string;
    health: number;
    status: "Normal" | "Advisory" | "Critical";
    bbox_x: string;
    bbox_y: string;
    bbox_w: string;
    bbox_h: string;
    critical_notes: string | null;
  }>("SELECT machine_id, part_code, name, health, status, bbox_x, bbox_y, bbox_w, bbox_h, critical_notes FROM machine_systems ORDER BY sort_order ASC, id ASC");

  const hotspotsQ = query<{
    machine_id: string;
    tag: string;
    label: string;
    current_value: string;
    unit: string;
    status: "Normal" | "Advisory" | "Critical";
    x: string | null;
    y: string | null;
    component: string | null;
  }>(
    `SELECT
       ms.machine_id,
       ms.tag,
       sd.name AS label,
       ms.current_value,
       sd.unit,
       ms.status,
       sd.x,
       sd.y,
       sd.component
     FROM mapped_signals ms
     JOIN sensor_definitions sd ON sd.id = ms.sensor_def_id
     ORDER BY ms.id ASC`,
  );

  const [mRes, sysRes, hsRes] = await Promise.all([machinesQ, systemsQ, hotspotsQ]);

  const partsByMachine = new Map<string, typeof sysRes.rows>();
  for (const p of sysRes.rows) {
    const list = partsByMachine.get(p.machine_id) || [];
    list.push(p);
    partsByMachine.set(p.machine_id, list);
  }

  const signalsByMachine = new Map<string, typeof hsRes.rows>();
  for (const h of hsRes.rows) {
    const list = signalsByMachine.get(h.machine_id) || [];
    list.push(h);
    signalsByMachine.set(h.machine_id, list);
  }

  return mRes.rows.map((row) => {
    const sigs = signalsByMachine.get(row.id) || [];
    return {
      id: row.id,
      name: row.name,
      plantId: row.plant_id,
      area: row.area_name || "Main Process Area",
      processCell: row.process_cell_name || row.name,
      type: row.type_name,
      manufacturer: row.manufacturer,
      model: row.model_number,
      serialNumber: row.serial_number,
      commissioned: row.commissioned,
      location: row.bay_location,
      coordinates: row.coordinates,
      powerRating: row.power_rating,
      operatingSpeed: row.operating_speed,
      criticality: row.criticality,
      status: row.status,
      health: row.health,
      sapEquipmentId: row.sap_equipment_id || `EQ-${row.id}`,
      floc: row.floc || `FLOC-${row.id}`,
      costCenter: row.cost_center || "CC-1000-OPS",
      plant: row.plant_name,
      workCenter: row.work_center || "WC-MAIN",
      activeWorkOrder: row.active_work_order || undefined,
      signalsCount: sigs.length,
      diagramType: row.diagram_type,
      parts: (partsByMachine.get(row.id) || []).map((p) => ({
        id: p.part_code,
        name: p.name,
        health: p.health,
        status: p.status,
        bbox: {
          x: parseFloat(p.bbox_x),
          y: parseFloat(p.bbox_y),
          width: parseFloat(p.bbox_w),
          height: parseFloat(p.bbox_h),
        },
        criticalNotes: p.critical_notes || undefined,
      })),
      hotspots: sigs
        .filter((h) => h.x !== null && h.y !== null)
        .map((h) => ({
          id: h.tag,
          label: h.label,
          parameter: h.tag,
          value: h.current_value,
          unit: h.unit,
          status: h.status,
          x: parseFloat(h.x || "0"),
          y: parseFloat(h.y || "0"),
          component: h.component || row.name,
        })),
    };
  });
}

/**
 * Fetches machine by ID
 */
export async function getMachineById(id: string): Promise<AssetMachine | null> {
  const all = await getMachines();
  return all.find((m) => m.id === id) || null;
}

export interface CreateMachineInput {
  id: string;
  name: string;
  plantId: string;
  areaId?: string;
  areaName?: string;
  processCellName?: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  commissioned?: string;
  location?: string;
  coordinates?: string;
  powerRating?: string;
  operatingSpeed?: string;
  criticality?: "A (Critical)" | "B (Essential)" | "C (General)";
  status?: "Operational" | "Advisory" | "Standby" | "Maintenance";
  health?: number;
  diagramType?: "mill" | "crusher" | "pump" | "blower" | "kiln";
  sapEquipmentId?: string;
  floc?: string;
  costCenter?: string;
  workCenter?: string;
}

/**
 * Creates a new machine in a plant & hierarchy group (3NF).
 */
export async function createMachineRecord(input: CreateMachineInput): Promise<AssetMachine> {
  await ensureDatabaseSeeded();
  const id = input.id.trim().toUpperCase();
  if (!id || !input.name?.trim() || !input.plantId?.trim()) {
    throw new HierarchyError("VALIDATION", "id, name, and plantId are required.", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const plantRes = await client.query<{ id: string; coordinates: string }>(
      "SELECT id, coordinates FROM plants WHERE id = $1",
      [input.plantId],
    );
    if (!plantRes.rows[0]) {
      throw new HierarchyError("NOT_FOUND", `Plant ${input.plantId} does not exist.`, 404);
    }

    // 1. Find or create equipment_model (3NF)
    const mfg = (input.manufacturer || "ULTRON OEM").trim();
    const mdl = (input.model || "Standard Industrial Unit").trim();
    const diagType = input.diagramType || "pump";
    const modelRes = await client.query<{ id: string }>(
      `INSERT INTO equipment_models (id, type_name, manufacturer, model_number, power_rating, operating_speed, diagram_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (manufacturer, model_number) DO UPDATE SET type_name = EXCLUDED.type_name
       RETURNING id`,
      [
        `mdl-${id.toLowerCase()}`,
        input.type || "Industrial Asset",
        mfg,
        mdl,
        input.powerRating || "250 kW",
        input.operatingSpeed || "1,480 RPM",
        diagType,
      ],
    );
    const modelId = modelRes.rows[0].id;

    // 2. Find or create area & group hierarchy nodes in the plant
    let areaNodeId = input.areaId || null;
    if (!areaNodeId) {
      const existingArea = await client.query<{ id: string }>(
        "SELECT id FROM hierarchy_nodes WHERE plant_id = $1 AND type = 'area' ORDER BY sort_order LIMIT 1",
        [input.plantId],
      );
      if (existingArea.rows[0]) {
        areaNodeId = existingArea.rows[0].id;
      } else {
        areaNodeId = `area-${input.plantId}-${Date.now().toString(36)}`;
        await client.query(
          `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, sort_order)
           VALUES ($1, $2, $2, $3, 'area', 0)`,
          [areaNodeId, input.plantId, input.areaName || "Main Process Area"],
        );
      }
    }

    const groupId = `group-${id.toLowerCase()}`;
    await client.query(
      `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, sort_order)
       VALUES ($1, $2, $3, $4, 'group', 99)
       ON CONFLICT (id) DO NOTHING`,
      [groupId, input.plantId, areaNodeId, input.processCellName || `${input.name} Cell`],
    );

    // 3. Insert Machine
    const status = input.status || "Operational";
    const health = input.health ?? 96;
    await client.query(
      `INSERT INTO machines (
         id, plant_id, process_node_id, model_id, name, serial_number,
         commissioned, bay_location, coordinates, criticality, status, health
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        input.plantId,
        groupId,
        modelId,
        input.name.trim(),
        input.serialNumber || `SN-${id}-${new Date().getFullYear()}`,
        input.commissioned || new Date().toISOString().slice(0, 10),
        input.location || "Bay 1",
        input.coordinates || plantRes.rows[0].coordinates,
        input.criticality || "B (Essential)",
        status,
        health,
      ],
    );

    // 4. Insert Machine Hierarchy Leaf Node
    await client.query(
      `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order)
       VALUES ($1, $2, $3, $4, 'machine', $5, 0)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, machine_id = EXCLUDED.machine_id`,
      [`mach-${id.toLowerCase()}`, input.plantId, groupId, input.name.trim(), id],
    );

    // 5. Insert SAP Equipment Record
    await client.query(
      `INSERT INTO sap_equipment_records (
         sap_number, machine_id, sap_equipment_id, floc, description, work_center, cost_center, next_scheduled_pm, sync_state
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Scheduled Next Quarter', 'Synced')
       ON CONFLICT (sap_number) DO NOTHING`,
      [
        `SAP-${id}`,
        id,
        input.sapEquipmentId || `EQ-${id}`,
        input.floc || `FLOC-${input.plantId.toUpperCase()}-${id}`,
        input.name.trim().toUpperCase(),
        input.workCenter || "WC-MECH-MAIN",
        input.costCenter || "CC-1000-OPS",
      ],
    );

    // 6. Default machine systems & subassemblies so Overview and Health work immediately
    const defaultParts = [
      { code: "P1", name: "Drive Motor & Coupling", x: 115, y: 110, w: 185, h: 155 },
      { code: "P2", name: "Bearing & Shaft Pedestal", x: 325, y: 135, w: 195, h: 110 },
      { code: "P3", name: "Main Process Casing", x: 540, y: 85, w: 345, h: 185 },
    ];
    for (let i = 0; i < defaultParts.length; i++) {
      const p = defaultParts[i];
      const sysPk = `${id}-${p.code}`;
      await client.query(
        `INSERT INTO machine_systems (
           id, machine_id, system_id, part_code, name, short_name, health, status,
           bbox_x, bbox_y, bbox_w, bbox_h, sort_order
         ) VALUES ($1, $2, $3, $4, $5, $5, $6, 'Normal', $7, $8, $9, $10, $11)`,
        [sysPk, id, p.code, p.code, p.name, health, p.x, p.y, p.w, p.h, i],
      );
      await client.query(
        `INSERT INTO machine_subassemblies (
           id, machine_id, machine_system_ref_id, system_id, subassembly_id,
           name, short_name, health, status, criticality, sort_order
         ) VALUES ($1, $2, $3, $4, $4, $5, $5, $6, 'Normal', 'A', $7)`,
        [`${id}-${p.code}-sa`, id, sysPk, p.code, p.name, health, i],
      );
    }

    // 7. Default 3 core sensors (Vibration, Bearing Temp, Process Pressure)
    const defaultSensors = [
      { tag: `VIB-${id}-01`, name: "Drive-End Vibration RMS", inst: "IEPE Accelerometer (100 mV/g)", type: "High-Freq Vibration RMS", unit: "mm/s", val: "1.45", num: 1.45, warn: 2.8, alarm: 4.5, x: 24, y: 48, part: "P1" },
      { tag: `TMP-${id}-01`, name: "Main Bearing Temperature", inst: "Duplex Pt100 RTD Class A", type: "Bearing Temperature", unit: "°C", val: "56.2", num: 56.2, warn: 75, alarm: 85, x: 42, y: 50, part: "P2" },
      { tag: `PRS-${id}-01`, name: "Process Discharge Pressure", inst: "4–20 mA HART Pressure Transmitter", type: "Process Pressure", unit: "bar", val: "5.10", num: 5.1, warn: 7.0, alarm: 8.5, x: 74, y: 34, part: "P3" },
    ];
    for (let i = 0; i < defaultSensors.length; i++) {
      const s = defaultSensors[i];
      const defId = `${id}-${s.tag}`;
      await client.query(
        `INSERT INTO sensor_definitions (
           id, tag, name, instrument, sensor_type, unit, sample_rate, source, priority,
           accuracy, range_val, normal_threshold, warning_threshold, alarm_threshold,
           warning_val, alarm_val, max_scale, nominal_band, standard, default_baseline,
           reasons, x, y, component, point
         ) VALUES (
           $1, $2, $3, $4, $5, $6, '1 s Continuous', 'Existing', 'Required',
           '±0.5%', 'Standard', 'Nominal', $7, $8, $9, $10, 100, 'Nominal', 'ISO 20816-3', $11,
           '[]'::jsonb, $12, $13, $14, 'P1'
         )`,
        [defId, s.tag, s.name, s.inst, s.type, s.unit, `${s.warn} ${s.unit}`, `${s.alarm} ${s.unit}`, s.warn, s.alarm, s.num, s.x, s.y, defaultParts[i].name],
      );
      await client.query(
        `INSERT INTO mapped_signals (
           id, machine_id, sensor_def_id, tag, subassembly_ref_id, edge_rack, card_slot,
           modbus_address, current_value, numeric_value, quality, status, position
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '100% Good', 'Normal', $11)`,
        [
          `${id}-${s.tag}`,
          id,
          defId,
          s.tag,
          `${id}-${s.part}-sa`,
          `ULTRON-EDGE-${id}`,
          `Slot 0${i + 1} (DAQ-MOD)`,
          `400${11 + i}`,
          s.val,
          s.num,
          defaultParts[i].name,
        ],
      );
    }

    // 8. Default Diagnosis & Process Stages
    const insDiag = await client.query<{ id: number }>(
      `INSERT INTO diagnosis_records (
         machine_id, overall_condition, confidence, engine_version, summary, maintenance_priority, prescriptive_action
       ) VALUES ($1, 'Nominal', 96.5, 'AssetIQ ML v4.2 + ISO 20816-3', $2, 'Low', 'Continue continuous condition-based monitoring.') RETURNING id`,
      [id, `${input.name} commissioned and operating within ISO 20816-3 Zone A baseline parameters.`],
    );
    await client.query(
      `INSERT INTO diagnosis_findings (diagnosis_id, finding_code, fault, probability, location, frequency, severity, recommendation, sort_order)
       VALUES ($1, $2, '1X Rotational Balance Baseline', 1.5, 'Drive Motor & Coupling', '24.7 Hz (1.0X)', 'Normal', 'Vibration spectrum nominal.', 0)`,
      [insDiag.rows[0].id, `F-${id}-01`],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const created = await getMachineById(id);
  if (!created) throw new Error("Failed to load created machine");
  return created;
}

export async function deleteMachineRecord(id: string): Promise<void> {
  await ensureDatabaseSeeded();
  const res = await query("DELETE FROM machines WHERE id = $1", [id]);
  if (!res.rowCount) {
    throw new HierarchyError("NOT_FOUND", `Machine ${id} not found.`, 404);
  }
}

/**
 * Fetches mapped signals for a machine or all (joined with `sensor_definitions` in 3NF).
 */
export async function getMappedSignals(machineId?: string): Promise<MappedSignal[]> {
  await ensureDatabaseSeeded();

  let sql = `
    SELECT
      ms.id,
      ms.machine_id,
      ms.tag,
      sd.instrument,
      sd.sensor_type,
      ms.edge_rack,
      ms.card_slot,
      ms.modbus_address,
      ms.current_value,
      sd.unit,
      ms.quality,
      sd.sample_rate,
      ms.status
    FROM mapped_signals ms
    JOIN sensor_definitions sd ON sd.id = ms.sensor_def_id
  `;
  const params: unknown[] = [];
  if (machineId) {
    sql += " WHERE ms.machine_id = $1";
    params.push(machineId);
  }
  sql += " ORDER BY ms.tag ASC";

  const res = await query<{
    id: string;
    machine_id: string;
    tag: string;
    instrument: string;
    sensor_type: string;
    edge_rack: string;
    card_slot: string;
    modbus_address: string;
    current_value: string;
    unit: string;
    quality: "100% Good" | "98% Good" | "Degraded";
    sample_rate: string;
    status: "Normal" | "Advisory" | "Critical";
  }>(sql, params);

  return res.rows.map((row) => ({
    id: row.id,
    machineId: row.machine_id,
    tag: row.tag,
    instrument: row.instrument,
    sensorType: row.sensor_type,
    edgeRack: row.edge_rack,
    cardSlot: row.card_slot,
    modbusAddress: row.modbus_address,
    currentValue: row.current_value,
    unit: row.unit,
    quality: row.quality,
    sampleRate: row.sample_rate,
    status: row.status,
  }));
}

export interface CatalogSystem {
  id: string;
  machineId: string;
  systemId: string;
  name: string;
  shortName: string;
  health: number;
  status: "Normal" | "Advisory" | "Critical";
  bbox: { x: number; y: number; width: number; height: number };
  sensorCount: number;
}

export interface CatalogSubassembly {
  id: string;
  machineId: string;
  systemId: string;
  subassemblyId: string;
  name: string;
  shortName: string;
  health: number;
  status: "Normal" | "Advisory" | "Critical";
  criticality: string;
  sensorTags: string[];
  sensorCount: number;
}

export interface CatalogSensor {
  id: string;
  machineId: string;
  tag: string;
  name: string;
  instrument: string;
  sensorType: string;
  edgeRack: string;
  cardSlot: string;
  modbusAddress: string;
  currentValue: string;
  numericValue: number;
  unit: string;
  quality: string;
  sampleRate: string;
  status: "Normal" | "Advisory" | "Critical";
  position: string | null;
  component: string | null;
  systemId: string | null;
  subassemblyId: string | null;
  subAssembly: string | null;
  point: string | null;
  source: string | null;
  priority: string | null;
  accuracy: string | null;
  rangeVal: string | null;
  normalThreshold: string | null;
  warningThreshold: string | null;
  alarmThreshold: string | null;
  warningVal: number | null;
  alarmVal: number | null;
  maxScale: number | null;
  nominalBand: string | null;
  standard: string | null;
  defaultBaseline: number | null;
  reasons: Array<{
    ruleId: string;
    ruleName: string;
    primaryCause: string;
    mechanism: string;
    symptomSignature: string;
    consequence: string;
    prescriptiveAction: string;
    crossCheckSensors?: string[];
  }>;
  x: number | null;
  y: number | null;
}

export interface MachineCatalog {
  machineId: string;
  systems: CatalogSystem[];
  subassemblies: CatalogSubassembly[];
  sensors: CatalogSensor[];
  counts: { systems: number; subassemblies: number; sensors: number };
}

/**
 * Single canonical catalog for a machine — assembled via 3NF joins across
 * `machine_systems`, `machine_subassemblies`, `mapped_signals`, and `sensor_definitions`.
 */
export async function getMachineCatalog(machineId: string): Promise<MachineCatalog> {
  await ensureDatabaseSeeded();

  const sysQ = query<{
    id: string;
    machine_id: string;
    system_id: string;
    name: string;
    short_name: string;
    health: number;
    status: "Normal" | "Advisory" | "Critical";
    bbox_x: string;
    bbox_y: string;
    bbox_w: string;
    bbox_h: string;
  }>(
    "SELECT id, machine_id, system_id, name, short_name, health, status, bbox_x, bbox_y, bbox_w, bbox_h FROM machine_systems WHERE machine_id = $1 ORDER BY sort_order ASC, system_id ASC",
    [machineId],
  );

  const saQ = query<{
    id: string;
    machine_id: string;
    system_id: string;
    subassembly_id: string;
    name: string;
    short_name: string;
    health: number;
    status: "Normal" | "Advisory" | "Critical";
    criticality: string;
  }>(
    "SELECT id, machine_id, system_id, subassembly_id, name, short_name, health, status, criticality FROM machine_subassemblies WHERE machine_id = $1 ORDER BY sort_order ASC, subassembly_id ASC",
    [machineId],
  );

  const sigQ = query<{
    id: string;
    machine_id: string;
    tag: string;
    name: string;
    instrument: string;
    sensor_type: string;
    edge_rack: string;
    card_slot: string;
    modbus_address: string;
    current_value: string;
    numeric_value: number | null;
    unit: string;
    quality: string;
    sample_rate: string;
    status: "Normal" | "Advisory" | "Critical";
    position: string | null;
    component: string | null;
    system_id: string | null;
    subassembly_id: string | null;
    sub_assembly: string | null;
    point: string | null;
    source: string | null;
    priority: string | null;
    accuracy: string | null;
    range_val: string | null;
    normal_threshold: string | null;
    warning_threshold: string | null;
    alarm_threshold: string | null;
    warning_val: number | null;
    alarm_val: number | null;
    max_scale: number | null;
    nominal_band: string | null;
    standard: string | null;
    default_baseline: number | null;
    reasons: CatalogSensor["reasons"] | null;
    x: number | null;
    y: number | null;
  }>(
    `SELECT
       ms.id,
       ms.machine_id,
       ms.tag,
       sd.name,
       sd.instrument,
       sd.sensor_type,
       ms.edge_rack,
       ms.card_slot,
       ms.modbus_address,
       ms.current_value,
       ms.numeric_value,
       sd.unit,
       ms.quality,
       sd.sample_rate,
       ms.status,
       ms.position,
       sd.component,
       sa.system_id,
       sa.subassembly_id,
       sa.name AS sub_assembly,
       sd.point,
       sd.source,
       sd.priority,
       sd.accuracy,
       sd.range_val,
       sd.normal_threshold,
       sd.warning_threshold,
       sd.alarm_threshold,
       sd.warning_val,
       sd.alarm_val,
       sd.max_scale,
       sd.nominal_band,
       sd.standard,
       COALESCE(ms.default_baseline_override, sd.default_baseline) AS default_baseline,
       sd.reasons,
       sd.x,
       sd.y
     FROM mapped_signals ms
     JOIN sensor_definitions sd ON sd.id = ms.sensor_def_id
     LEFT JOIN machine_subassemblies sa ON sa.id = ms.subassembly_ref_id
     WHERE ms.machine_id = $1
     ORDER BY ms.tag ASC`,
    [machineId],
  );

  const [sysRes, saRes, sigRes] = await Promise.all([sysQ, saQ, sigQ]);

  const sensors: CatalogSensor[] = sigRes.rows.map((r) => ({
    id: r.id,
    machineId: r.machine_id,
    tag: r.tag,
    name: r.name,
    instrument: r.instrument,
    sensorType: r.sensor_type,
    edgeRack: r.edge_rack,
    cardSlot: r.card_slot,
    modbusAddress: r.modbus_address,
    currentValue: r.current_value,
    numericValue: r.numeric_value !== null ? Number(r.numeric_value) : parseFloat(r.current_value) || 0,
    unit: r.unit,
    quality: r.quality,
    sampleRate: r.sample_rate,
    status: r.status,
    position: r.position,
    component: r.component,
    systemId: r.system_id,
    subassemblyId: r.subassembly_id,
    subAssembly: r.sub_assembly,
    point: r.point,
    source: r.source,
    priority: r.priority,
    accuracy: r.accuracy,
    rangeVal: r.range_val,
    normalThreshold: r.normal_threshold,
    warningThreshold: r.warning_threshold,
    alarmThreshold: r.alarm_threshold,
    warningVal: r.warning_val !== null ? Number(r.warning_val) : null,
    alarmVal: r.alarm_val !== null ? Number(r.alarm_val) : null,
    maxScale: r.max_scale !== null ? Number(r.max_scale) : null,
    nominalBand: r.nominal_band,
    standard: r.standard,
    defaultBaseline: r.default_baseline !== null ? Number(r.default_baseline) : null,
    reasons: Array.isArray(r.reasons) ? r.reasons : [],
    x: r.x !== null && r.x !== undefined ? Number(r.x) : null,
    y: r.y !== null && r.y !== undefined ? Number(r.y) : null,
  }));

  const sensorsBySystem = new Map<string, number>();
  const tagsBySubassembly = new Map<string, string[]>();
  for (const s of sensors) {
    if (s.systemId) {
      sensorsBySystem.set(s.systemId, (sensorsBySystem.get(s.systemId) || 0) + 1);
    }
    if (s.subassemblyId) {
      const list = tagsBySubassembly.get(s.subassemblyId) || [];
      list.push(s.tag);
      tagsBySubassembly.set(s.subassemblyId, list);
    }
  }

  const systems: CatalogSystem[] = sysRes.rows.map((r) => ({
    id: r.id,
    machineId: r.machine_id,
    systemId: r.system_id,
    name: r.name,
    shortName: r.short_name,
    health: r.health,
    status: r.status,
    bbox: {
      x: parseFloat(r.bbox_x),
      y: parseFloat(r.bbox_y),
      width: parseFloat(r.bbox_w),
      height: parseFloat(r.bbox_h),
    },
    sensorCount: sensorsBySystem.get(r.system_id) || 0,
  }));

  const subassemblies: CatalogSubassembly[] = saRes.rows.map((r) => {
    const tags = tagsBySubassembly.get(r.subassembly_id) || [];
    return {
      id: r.id,
      machineId: r.machine_id,
      systemId: r.system_id,
      subassemblyId: r.subassembly_id,
      name: r.name,
      shortName: r.short_name,
      health: r.health,
      status: r.status,
      criticality: r.criticality,
      sensorTags: tags,
      sensorCount: tags.length,
    };
  });

  return {
    machineId,
    systems,
    subassemblies,
    sensors,
    counts: { systems: systems.length, subassemblies: subassemblies.length, sensors: sensors.length },
  };
}

/**
 * Fetches ordered process stages for a machine (sequential conversion flow).
 */
export async function getProcessStages(machineId?: string): Promise<MachineProcessStage[]> {
  await ensureDatabaseSeeded();

  let sql = "SELECT * FROM process_stages";
  const params: unknown[] = [];
  if (machineId) {
    sql += " WHERE machine_id = $1";
    params.push(machineId);
  }
  sql += " ORDER BY machine_id ASC, id ASC";

  const res = await query<{
    machine_id: string;
    stage_id: string;
    step_number: string | null;
    name: string;
    role: string | null;
    subtitle: string | null;
    status: "Normal" | "Advisory" | "Critical";
    efficiency: number;
    health_notes: string | null;
    transformation: string | null;
    associated_parts: string[] | null;
    inputs: MachineProcessStage["inputs"];
    outputs: MachineProcessStage["outputs"];
    parameters: MachineProcessStage["parameters"];
  }>(sql, params);

  if (res.rows.length === 0 && machineId) {
    const machine = await getMachineById(machineId);
    if (machine) return getMachineProcesses(machine);
  }

  return res.rows.map((r) => ({
    id: r.stage_id,
    stepNumber: r.step_number || "",
    name: r.name,
    role: r.role || "",
    subtitle: r.subtitle || "",
    health: r.efficiency,
    status: r.status,
    healthNotes: r.health_notes || "",
    transformation: r.transformation || "",
    associatedParts: Array.isArray(r.associated_parts) ? r.associated_parts : [],
    parameters: Array.isArray(r.parameters) ? r.parameters : [],
    inputs: Array.isArray(r.inputs) ? r.inputs : [],
    outputs: Array.isArray(r.outputs) ? r.outputs : [],
  }));
}

/** Cabinet records by machine, through rack_chassis.machine_id. */
export async function getRackChassisByMachine(machineId?: string): Promise<Map<string, RackChassisInfo>> {
  const chassisRes = await query<{
    id: string;
    machine_id: string;
    name: string;
    cabinet_location: string;
    ip_address: string;
    protocol: string;
    firmware: string;
    uptime: string;
    psu_status: string;
    packet_loss: string;
    latency: string;
  }>(
    machineId
      ? "SELECT * FROM rack_chassis WHERE machine_id = $1 ORDER BY id"
      : "SELECT * FROM rack_chassis WHERE machine_id IS NOT NULL ORDER BY id",
    machineId ? [machineId] : [],
  );
  const chassisByMachine = new Map<string, RackChassisInfo>();
  for (const c of chassisRes.rows) {
    if (chassisByMachine.has(c.machine_id)) continue;
    chassisByMachine.set(c.machine_id, {
      id: c.id,
      name: c.name,
      cabinetLocation: c.cabinet_location,
      ipAddress: c.ip_address,
      protocol: c.protocol,
      firmware: c.firmware,
      uptime: c.uptime,
      psuStatus: c.psu_status,
      packetLoss: c.packet_loss,
      latency: c.latency,
    });
  }
  return chassisByMachine;
}

/**
 * In 3NF, a machine's cabinet model (chassis → card → channel) is derived directly
 * from `mapped_signals` + `sensor_definitions` + `rack_chassis`, eliminating the
 * redundant `machine_rack_units` JSONB table.
 */
export async function getMachineRackUnits(machineId?: string): Promise<MachineRackInfo[]> {
  await ensureDatabaseSeeded();

  const machinesSql = machineId
    ? "SELECT id, name FROM machines WHERE id = $1 ORDER BY id"
    : "SELECT id, name FROM machines ORDER BY id";
  const signalsSql = machineId
    ? `SELECT
         ms.machine_id,
         ms.tag,
         sd.name,
         sd.instrument,
         sd.sensor_type,
         ms.edge_rack,
         ms.card_slot,
         ms.modbus_address,
         ms.current_value,
         sd.unit,
         ms.quality,
         sd.sample_rate,
         ms.status,
         sd.normal_threshold,
         sd.component
       FROM mapped_signals ms
       JOIN sensor_definitions sd ON sd.id = ms.sensor_def_id
       WHERE ms.machine_id = $1
       ORDER BY ms.tag`
    : `SELECT
         ms.machine_id,
         ms.tag,
         sd.name,
         sd.instrument,
         sd.sensor_type,
         ms.edge_rack,
         ms.card_slot,
         ms.modbus_address,
         ms.current_value,
         sd.unit,
         ms.quality,
         sd.sample_rate,
         ms.status,
         sd.normal_threshold,
         sd.component
       FROM mapped_signals ms
       JOIN sensor_definitions sd ON sd.id = ms.sensor_def_id
       ORDER BY ms.machine_id, ms.tag`;

  const params = machineId ? [machineId] : [];
  const [mRes, sigRes, chassisByMachine] = await Promise.all([
    query<{ id: string; name: string }>(machinesSql, params),
    query<RackSignalRow & { machine_id: string }>(signalsSql, params),
    getRackChassisByMachine(machineId),
  ]);

  const sigsByMachine = new Map<string, RackSignalRow[]>();
  for (const s of sigRes.rows) {
    const list = sigsByMachine.get(s.machine_id) || [];
    list.push(s);
    sigsByMachine.set(s.machine_id, list);
  }

  const out: MachineRackInfo[] = [];
  for (const m of mRes.rows) {
    const sigs = sigsByMachine.get(m.id) || [];
    const racks = buildRacksFromSignals(m, sigs);
    for (const rack of racks) {
      out.push({
        ...rack,
        chassis: chassisByMachine.get(m.id) ?? null,
      });
    }
  }
  return out;
}

export async function applyMachineSensorSpecs(): Promise<{
  signalsUpdated: number;
  racksWritten: number;
  trendRecords: number;
  diagnosisRecords: number;
}> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const signalsUpdated = await applyFleetSensorSpecs(client);
    const racksWritten = await rebuildRackUnitsFromSignals(client);
    const history = await applyFleetHistory(client);
    await client.query("COMMIT");
    return { signalsUpdated, racksWritten, trendRecords: history.trends, diagnosisRecords: history.diagnoses };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function rebuildKilnFleet(): Promise<{ machines: number; rows: number }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await applyKilnFleet(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** The full pyro line and VPC 066 casting cell in one transaction. */
export async function rebuildPyroLine(): Promise<Record<string, number>> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await applyPyroLine(client);
    const vpc = await applyVpcCasting(client);
    await client.query("COMMIT");
    return { ...result, vpc_sensors: vpc.sensors };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function rebuildMachineRackUnits(): Promise<{ racksWritten: number }> {
  const client = await pool.connect();
  try {
    const racksWritten = await rebuildRackUnitsFromSignals(client);
    return { racksWritten };
  } finally {
    client.release();
  }
}

/**
 * Fetches diagnosis records (assembled from 3NF `diagnosis_records`, `diagnosis_findings`, and `diagnosis_peak_frequencies`).
 */
export async function getDiagnosisRecords(machineId?: string): Promise<DiagnosisRecord[]> {
  await ensureDatabaseSeeded();

  let sql = "SELECT * FROM diagnosis_records";
  const params: unknown[] = [];
  if (machineId) {
    sql += " WHERE machine_id = $1";
    params.push(machineId);
  }
  sql += " ORDER BY id ASC";

  const diagRes = await query<{
    id: number;
    machine_id: string;
    overall_condition: "Nominal" | "Advisory" | "Critical";
    confidence: string;
    engine_version: string;
    summary: string;
    maintenance_priority: "Low" | "Medium" | "High" | "Immediate";
    prescriptive_action: string;
  }>(sql, params);

  if (diagRes.rows.length === 0) return [];

  const diagIds = diagRes.rows.map((r) => r.id);
  const [findingsRes, peaksRes] = await Promise.all([
    query<{
      diagnosis_id: number;
      finding_code: string;
      fault: string;
      probability: string;
      location: string;
      frequency: string;
      severity: "Normal" | "Advisory" | "Critical";
      recommendation: string;
    }>("SELECT * FROM diagnosis_findings WHERE diagnosis_id = ANY($1) ORDER BY sort_order ASC, id ASC", [diagIds]),
    query<{
      diagnosis_id: number;
      name: string;
      freq: string;
      amplitude: string;
      status: "Normal" | "Elevated";
    }>("SELECT * FROM diagnosis_peak_frequencies WHERE diagnosis_id = ANY($1) ORDER BY sort_order ASC, id ASC", [diagIds]),
  ]);

  const findingsByDiag = new Map<number, DiagnosisRecord["findings"]>();
  for (const f of findingsRes.rows) {
    const list = findingsByDiag.get(f.diagnosis_id) || [];
    list.push({
      id: f.finding_code,
      fault: f.fault,
      probability: parseFloat(f.probability),
      location: f.location,
      frequency: f.frequency,
      severity: f.severity,
      recommendation: f.recommendation,
    });
    findingsByDiag.set(f.diagnosis_id, list);
  }

  const peaksByDiag = new Map<number, DiagnosisRecord["peakFrequencies"]>();
  for (const p of peaksRes.rows) {
    const list = peaksByDiag.get(p.diagnosis_id) || [];
    list.push({
      name: p.name,
      freq: p.freq,
      amplitude: p.amplitude,
      status: p.status,
    });
    peaksByDiag.set(p.diagnosis_id, list);
  }

  return diagRes.rows.map((row) => ({
    machineId: row.machine_id,
    overallCondition: row.overall_condition,
    confidence: parseFloat(row.confidence),
    engineVersion: row.engine_version,
    summary: row.summary,
    findings: findingsByDiag.get(row.id) || [],
    peakFrequencies: peaksByDiag.get(row.id) || [],
    maintenancePriority: row.maintenance_priority,
    prescriptiveAction: row.prescriptive_action,
  }));
}

/**
 * Fetches trend records for a machine (assembled from 3NF `trend_records` + `trend_points`).
 */
export async function getTrendRecords(machineId?: string): Promise<MachineTrendRecord[]> {
  await ensureDatabaseSeeded();

  let sql = "SELECT * FROM trend_records";
  const params: unknown[] = [];
  if (machineId) {
    sql += " WHERE machine_id = $1";
    params.push(machineId);
  }
  sql += " ORDER BY id ASC";

  const res = await query<{
    id: number;
    machine_id: string;
    metric_key: string;
    label: string;
    unit: string;
    baseline: string;
    advisory_limit: string;
    critical_limit: string;
    stat_mean: string;
    stat_peak: string;
    stat_crest_factor: string;
    stat_kurtosis: string;
    stat_drift_30d: string;
  }>(sql, params);

  if (res.rows.length === 0) return [];

  const trendIds = res.rows.map((r) => r.id);
  const ptsRes = await query<{
    trend_id: number;
    time_label: string;
    value: string;
  }>("SELECT trend_id, time_label, value FROM trend_points WHERE trend_id = ANY($1) ORDER BY sample_index ASC", [trendIds]);

  const pointsByTrend = new Map<number, Array<{ time: string; value: number }>>();
  for (const pt of ptsRes.rows) {
    const list = pointsByTrend.get(pt.trend_id) || [];
    list.push({ time: pt.time_label, value: parseFloat(pt.value) });
    pointsByTrend.set(pt.trend_id, list);
  }

  const byMachine = new Map<string, MachineTrendRecord>();
  for (const row of res.rows) {
    let rec = byMachine.get(row.machine_id);
    if (!rec) {
      rec = { machineId: row.machine_id, metrics: [] };
      byMachine.set(row.machine_id, rec);
    }
    rec.metrics.push({
      key: row.metric_key,
      label: row.label,
      unit: row.unit,
      baseline: parseFloat(row.baseline),
      advisoryLimit: parseFloat(row.advisory_limit),
      criticalLimit: parseFloat(row.critical_limit),
      points: pointsByTrend.get(row.id) || [],
      stats: {
        mean: row.stat_mean,
        peak: row.stat_peak,
        crestFactor: row.stat_crest_factor,
        kurtosis: row.stat_kurtosis,
        drift30d: row.stat_drift_30d,
      },
    });
  }

  return Array.from(byMachine.values());
}

/**
 * Fetches operating events
 */
export async function getOperatingEvents(machineId?: string): Promise<OperatingEvent[]> {
  await ensureDatabaseSeeded();

  let sql = "SELECT * FROM operating_events";
  const params: unknown[] = [];
  if (machineId) {
    sql += " WHERE machine_id = $1";
    params.push(machineId);
  }
  sql += " ORDER BY created_at DESC, id DESC";

  const res = await query<{
    id: string;
    machine_id: string;
    timestamp: string;
    type: OperatingEvent["type"];
    severity: OperatingEvent["severity"];
    title: string;
    description: string;
    source: string;
  }>(sql, params);

  return res.rows.map((row) => ({
    id: row.id,
    machineId: row.machine_id,
    timestamp: row.timestamp,
    type: row.type,
    severity: row.severity,
    title: row.title,
    description: row.description,
    source: row.source,
  }));
}

export async function createOperatingEvent(input: {
  machineId: string;
  actorUserId?: string | null;
  type: OperatingEvent["type"];
  severity: OperatingEvent["severity"];
  title: string;
  description: string;
  source?: string;
}): Promise<OperatingEvent> {
  await ensureDatabaseSeeded();
  const id = `EVT-${input.machineId}-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = "Just now";
  const res = await query<{
    id: string;
    machine_id: string;
    timestamp: string;
    type: OperatingEvent["type"];
    severity: OperatingEvent["severity"];
    title: string;
    description: string;
    source: string;
  }>(
    `INSERT INTO operating_events (id, machine_id, actor_user_id, timestamp, type, severity, title, description, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      input.machineId,
      input.actorUserId || null,
      timestamp,
      input.type,
      input.severity,
      input.title.trim(),
      input.description.trim(),
      input.source?.trim() || "Operator Log",
    ],
  );
  const row = res.rows[0];
  return {
    id: row.id,
    machineId: row.machine_id,
    timestamp: row.timestamp,
    type: row.type,
    severity: row.severity,
    title: row.title,
    description: row.description,
    source: row.source,
  };
}

/**
 * Fetches rack records
 */
export async function getRackRecords(machineId?: string): Promise<RackChassisRecord[]> {
  await ensureDatabaseSeeded();

  let sql = "SELECT * FROM rack_chassis";
  const params: unknown[] = [];
  if (machineId) {
    sql += " WHERE machine_id = $1";
    params.push(machineId);
  }

  const rackQ = query<{
    id: string;
    machine_id: string;
    name: string;
    cabinet_location: string;
    ip_address: string;
    protocol: string;
    firmware: string;
    uptime: string;
    psu_status: string;
    packet_loss: string;
    latency: string;
  }>(sql, params);

  const slotsQ = query<{
    rack_id: string;
    slot_number: number;
    card_model: string;
    module_type: string;
    channel_count: number;
    connected_probes: string;
    sample_rate: string;
    sync_state: "Standby" | "Synced" | "Acquiring";
  }>("SELECT * FROM rack_slots ORDER BY slot_number ASC");

  const [rackRes, slotsRes] = await Promise.all([rackQ, slotsQ]);

  const slotsByRack = new Map<string, typeof slotsRes.rows>();
  for (const s of slotsRes.rows) {
    const list = slotsByRack.get(s.rack_id) || [];
    list.push(s);
    slotsByRack.set(s.rack_id, list);
  }

  return rackRes.rows.map((r) => ({
    machineId: r.machine_id,
    primaryRack: {
      rackId: r.id,
      name: r.name,
      cabinetLocation: r.cabinet_location,
      ipAddress: r.ip_address,
      protocol: r.protocol,
      firmware: r.firmware,
      uptime: r.uptime,
      psuStatus: r.psu_status,
      packetLoss: r.packet_loss,
      latency: r.latency,
    },
    slots: (slotsByRack.get(r.id) || []).map((s) => ({
      slotNumber: s.slot_number,
      cardModel: s.card_model,
      moduleType: s.module_type,
      channelCount: s.channel_count,
      connectedProbes: s.connected_probes,
      sampleRate: s.sample_rate,
      syncState: s.sync_state,
    })),
  }));
}

/**
 * Fleet stats summary for executive Home view (optionally filtered by plantId)
 */
export async function getFleetStats(plantId?: string) {
  await ensureDatabaseSeeded();

  const [machines, events, signals, racks] = await Promise.all([
    getMachines(plantId),
    getOperatingEvents(),
    getMappedSignals(),
    getRackRecords(),
  ]);

  const machineIds = new Set(machines.map((m) => m.id));
  const filteredEvents = plantId ? events.filter((e) => machineIds.has(e.machineId)) : events;
  const filteredSignals = plantId ? signals.filter((s) => machineIds.has(s.machineId)) : signals;
  const filteredRacks = plantId ? racks.filter((r) => machineIds.has(r.machineId)) : racks;

  const totalMachines = machines.length;
  const operationalCount = machines.filter((m) => m.status === "Operational").length;
  const advisoryCount = machines.filter((m) => m.status === "Advisory").length;
  const standbyCount = machines.filter((m) => m.status === "Standby").length;
  const avgHealth = Math.round(
    machines.reduce((acc, m) => acc + m.health, 0) / (machines.length || 1),
  );

  return {
    totalMachines,
    operationalCount,
    advisoryCount,
    standbyCount,
    avgHealth,
    totalSignals: filteredSignals.length,
    totalEvents: filteredEvents.length,
    recentEvents: filteredEvents.slice(0, 6),
    racksCount: filteredRacks.length,
    racks: filteredRacks,
    machines: machines.map((m) => ({
      id: m.id,
      name: m.name,
      plantId: m.plantId,
      plant: m.plant,
      area: m.area,
      status: m.status,
      health: m.health,
      criticality: m.criticality,
      signalsCount: m.signalsCount,
    })),
  };
}
