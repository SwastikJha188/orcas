import pool, { query } from "@backend/db";
import { seedDatabase } from "@backend/db/fixture-seed";
import {
  EVENT_TYPE_FROM_LEGACY,
  readDiagnosisRecords,
  readMachineCatalog,
  readMachines,
  readMappedSignals,
  readOperatingEvents,
  readPlantHierarchy,
  readTrendRecords,
} from "@backend/services/asset-read-service";
import type {
  AssetMachine,
  DiagnosisRecord,
  HierarchyNode,
  MachineTrendRecord,
  MappedSignal,
  OperatingEvent,
} from "@shared/types/assets";
import { buildRacksFromSignals, type MachineRackInfo, type RackChassisInfo, type RackSignalRow } from "@shared/lib/rack-data";

export type { CatalogSensor, CatalogSubassembly, CatalogSystem, MachineCatalog } from "@backend/services/asset-read-service";

/**
 * Ensures the database schema is migrated and holds data before reading.
 * An empty database is loaded from the reference fixture once; a failed
 * check (timeout, network) never seeds. Runs once per process.
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
    const { ensureMigrations } = await import("@backend/db/migrate");
    await ensureMigrations();
    const res = await query<{ machines: number; plants: number; users: number }>(
      "SELECT (SELECT COUNT(*)::int FROM machines) AS machines, (SELECT COUNT(*)::int FROM plants) AS plants, (SELECT COUNT(*)::int FROM users) AS users",
    );
    const row = res.rows[0];
    if (row && row.machines === 0 && row.plants === 0 && row.users === 0) {
      console.log("Empty database: loading the reference fixture…");
      await seedDatabase();
    }
    return true;
  } catch (err) {
    console.warn("Database check failed; not seeding:", err instanceof Error ? err.message : err);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Hierarchy                                                           */
/* ------------------------------------------------------------------ */

export async function getPlantHierarchy(plantId?: string): Promise<HierarchyNode[]> {
  await ensureDatabaseSeeded();
  return readPlantHierarchy(plantId);
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

/** Sets a plant's time zone. Every plant has one; clearing it is not allowed. */
export async function setPlantTimeZone(id: string, timeZone: string | null): Promise<{ id: string; timeZone: string | null }> {
  await ensureDatabaseSeeded();
  if (timeZone === null) throw new HierarchyError("VALIDATION", "A plant needs a time zone; choose one instead of clearing it.", 400);
  if (!isTimeZone(timeZone)) throw new HierarchyError("INVALID_TIME_ZONE", `“${timeZone}” is not a known time zone.`, 400);
  const found = await query<{ type: string; plant_id: string }>("SELECT type, plant_id FROM hierarchy_nodes WHERE id = $1", [id]);
  let plantId = found.rows[0]?.plant_id;
  if (!found.rows[0]) {
    const direct = await query<{ id: string }>("SELECT id FROM plants WHERE id = $1", [id]);
    if (!direct.rows[0]) throw new HierarchyError("NOT_FOUND", `No plant or hierarchy node “${id}”.`, 404);
    plantId = id;
  } else if (found.rows[0].type !== "plant") {
    throw new HierarchyError("NOT_A_PLANT", "Only a plant (site) has a time zone; areas and machines inherit it.", 400);
  }
  await query("UPDATE plants SET time_zone = $2, updated_at = NOW() WHERE id = $1", [plantId, timeZone]);
  return { id, timeZone };
}

/* ------------------------------------------------------------------ */
/* Machines                                                            */
/* ------------------------------------------------------------------ */

export async function getMachines(plantId?: string): Promise<AssetMachine[]> {
  await ensureDatabaseSeeded();
  return readMachines(plantId);
}

export async function getMachineById(id: string): Promise<AssetMachine | null> {
  const plant = await query<{ plant_id: string }>("SELECT plant_id FROM machines WHERE id = $1", [id]);
  if (!plant.rows[0]) return null;
  return (await getMachines(plant.rows[0].plant_id)).find((m) => m.id === id) ?? null;
}

export interface CreateMachineInput {
  id: string;
  name: string;
  plantId: string;
  /** Existing area node, or the name of a new area. */
  areaId?: string;
  areaName?: string;
  /** Optional process cell (group) between the area and the machine. */
  processCellName?: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber?: string;
  commissioned?: string;
  location?: string;
  coordinates?: string;
  powerRating?: string;
  operatingSpeed?: string;
  criticality: "A (Critical)" | "B (Essential)" | "C (General)";
  serviceState?: "Operational" | "Standby" | "Maintenance";
  diagramType: string;
  sapEquipmentId?: string;
  floc?: string;
  costCenter?: string;
  workCenter?: string;
}

const optional = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

/**
 * Registers a machine: its equipment model, its place in the hierarchy and its
 * ERP reference. Components, measurements and limits are added afterwards
 * (Configure, the edge mapping or the API); nothing is invented here.
 */
export async function createMachineRecord(input: CreateMachineInput): Promise<AssetMachine> {
  await ensureDatabaseSeeded();
  const id = input.id?.trim().toUpperCase();
  const required: Array<[string, unknown]> = [
    ["id", id],
    ["name", input.name?.trim()],
    ["plantId", input.plantId?.trim()],
    ["type", input.type?.trim()],
    ["manufacturer", input.manufacturer?.trim()],
    ["model", input.model?.trim()],
    ["criticality", input.criticality],
    ["diagramType", input.diagramType],
  ];
  const missing = required.filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new HierarchyError("VALIDATION", `Required: ${missing.join(", ")}.`, 400);
  if (!input.areaId && !input.areaName?.trim()) throw new HierarchyError("VALIDATION", "Choose an area or name a new one.", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const plant = await client.query("SELECT id FROM plants WHERE id = $1", [input.plantId]);
    if (!plant.rowCount) throw new HierarchyError("NOT_FOUND", `Plant ${input.plantId} does not exist.`, 404);

    const model = await client.query<{ id: string }>(
      `INSERT INTO equipment_models (id, type_name, manufacturer, model_number, power_rating, operating_speed, diagram_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (manufacturer, model_number) DO UPDATE SET type_name = EXCLUDED.type_name
       RETURNING id`,
      [`mdl-${id.toLowerCase()}`, input.type.trim(), input.manufacturer.trim(), input.model.trim(), optional(input.powerRating), optional(input.operatingSpeed), input.diagramType],
    );

    let areaId = input.areaId ?? null;
    if (areaId) {
      const area = await client.query("SELECT 1 FROM hierarchy_nodes WHERE id = $1 AND plant_id = $2 AND type = 'area'", [areaId, input.plantId]);
      if (!area.rowCount) throw new HierarchyError("VALIDATION", `Area ${areaId} is not in plant ${input.plantId}.`, 400);
    } else {
      const plantNode = await client.query<{ id: string }>("SELECT id FROM hierarchy_nodes WHERE plant_id = $1 AND type = 'plant' LIMIT 1", [input.plantId]);
      areaId = `area-${id.toLowerCase()}`;
      await client.query(
        `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, sort_order)
         VALUES ($1, $2, $3, $4, 'area', (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM hierarchy_nodes WHERE plant_id = $2 AND type = 'area'))`,
        [areaId, input.plantId, plantNode.rows[0]?.id ?? null, input.areaName!.trim()],
      );
    }
    let parentId = areaId;
    if (input.processCellName?.trim()) {
      parentId = `group-${id.toLowerCase()}`;
      await client.query(
        `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, sort_order) VALUES ($1, $2, $3, $4, 'group',
           (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM hierarchy_nodes WHERE parent_id = $5))`,
        [parentId, input.plantId, areaId, input.processCellName.trim(), areaId],
      );
    }

    await client.query(
      `INSERT INTO machines (id, plant_id, model_id, name, serial_number, commissioned, bay_location, coordinates, criticality, service_state, health_model_id, code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, (SELECT id FROM health_models ORDER BY id LIMIT 1), $1)`,
      [
        id,
        input.plantId,
        model.rows[0].id,
        input.name.trim(),
        optional(input.serialNumber),
        optional(input.commissioned),
        optional(input.location),
        optional(input.coordinates),
        input.criticality,
        input.serviceState ?? "Operational",
      ],
    );
    await client.query(
      `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order)
       VALUES ($1, $2, $3, NULL, 'machine', $4, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM hierarchy_nodes WHERE parent_id = $5))`,
      // The parent goes in twice ($3, $5): one parameter used as a column value and in a comparison gets two different deduced types.
      // The node keeps no name: v_hierarchy_nodes reads the machine's.
      [`mach-${id.toLowerCase()}`, input.plantId, parentId, id, parentId],
    );
    if (optional(input.sapEquipmentId)) {
      await client.query(
        `INSERT INTO sap_equipment_records (sap_number, machine_id, sap_equipment_id, floc, description, work_center, cost_center, sync_state)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending Approval')`,
        [`SAP-${id}`, id, input.sapEquipmentId!.trim(), optional(input.floc), input.name.trim().toUpperCase(), optional(input.workCenter), optional(input.costCenter)],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof Error && /duplicate key/.test(err.message)) throw new HierarchyError("VALIDATION", `Machine ${id} (or its serial number) already exists.`, 400);
    throw err;
  } finally {
    client.release();
  }
  const created = await getMachineById(id);
  if (!created) throw new Error("Failed to load created machine");
  return created;
}

export interface UpdateMachineInput {
  name?: string;
  /** An area node of the machine's own plant; the machine moves directly under it. */
  areaId?: string;
  criticality?: AssetMachine["criticality"];
}

const CRITICALITIES: AssetMachine["criticality"][] = ["A (Critical)", "B (Essential)", "C (General)"];

/** Renames a machine, moves it to another area of its plant, or changes its criticality. */
export async function updateMachineRecord(id: string, patch: UpdateMachineInput): Promise<AssetMachine> {
  await ensureDatabaseSeeded();
  const name = patch.name?.trim();
  if (patch.name !== undefined && !name) throw new HierarchyError("VALIDATION", "A machine needs a name.", 400);
  if (patch.criticality !== undefined && !CRITICALITIES.includes(patch.criticality))
    throw new HierarchyError("VALIDATION", `Criticality must be one of: ${CRITICALITIES.join(", ")}.`, 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const machine = await client.query<{ plant_id: string }>("SELECT plant_id FROM machines WHERE id = $1", [id]);
    if (!machine.rowCount) throw new HierarchyError("NOT_FOUND", `Machine ${id} not found.`, 404);
    if (name) await client.query("UPDATE machines SET name = $2 WHERE id = $1", [id, name]);
    if (patch.criticality !== undefined) await client.query("UPDATE machines SET criticality = $2 WHERE id = $1", [id, patch.criticality]);
    if (patch.areaId !== undefined) {
      const area = await client.query("SELECT 1 FROM hierarchy_nodes WHERE id = $1 AND plant_id = $2 AND type = 'area'", [patch.areaId, machine.rows[0].plant_id]);
      if (!area.rowCount) throw new HierarchyError("VALIDATION", `Area ${patch.areaId} is not in this machine's plant.`, 400);
      await client.query(
        `UPDATE hierarchy_nodes SET parent_id = $2,
                sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM hierarchy_nodes WHERE parent_id = $3)
          WHERE machine_id = $1 AND type = 'machine' AND parent_id IS DISTINCT FROM $3`,
        // The area goes in twice ($2, $3): one parameter used as a value and in a comparison gets two deduced types.
        [id, patch.areaId, patch.areaId],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  const updated = await getMachineById(id);
  if (!updated) throw new Error("Failed to load the updated machine");
  return updated;
}

export async function deleteMachineRecord(id: string): Promise<void> {
  await ensureDatabaseSeeded();
  const res = await query("DELETE FROM machines WHERE id = $1", [id]);
  if (!res.rowCount) throw new HierarchyError("NOT_FOUND", `Machine ${id} not found.`, 404);
}

/* ------------------------------------------------------------------ */
/* Signals, catalog, trends, diagnosis, events                         */
/* ------------------------------------------------------------------ */

export async function getMappedSignals(machineId?: string): Promise<MappedSignal[]> {
  await ensureDatabaseSeeded();
  return readMappedSignals(machineId);
}

export async function getMachineCatalog(machineId: string) {
  await ensureDatabaseSeeded();
  return readMachineCatalog(machineId);
}

export async function getTrendRecords(machineId?: string): Promise<MachineTrendRecord[]> {
  await ensureDatabaseSeeded();
  return readTrendRecords(machineId);
}

export async function getDiagnosisRecords(machineId?: string): Promise<DiagnosisRecord[]> {
  await ensureDatabaseSeeded();
  return readDiagnosisRecords(machineId);
}

export async function getOperatingEvents(machineId?: string): Promise<OperatingEvent[]> {
  await ensureDatabaseSeeded();
  return readOperatingEvents(machineId);
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
  const type = EVENT_TYPE_FROM_LEGACY[input.type];
  if (!type) throw new HierarchyError("VALIDATION", `Unknown event type ${input.type}.`, 400);
  if (!input.title?.trim()) throw new HierarchyError("VALIDATION", "title is required.", 400);
  const res = await query<{ id: number }>(
    `INSERT INTO machine_events (machine_id, event_type_id, occurred_at, severity_id, title, description, source, actor_user_id)
     VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7) RETURNING id`,
    [input.machineId, type, input.severity, input.title.trim(), input.description?.trim() ?? "", input.source?.trim() || "Operator log", input.actorUserId ?? null],
  );
  const created = (await readOperatingEvents(input.machineId, 20)).find((e) => e.id === `EVT-${res.rows[0].id}`);
  if (!created) throw new Error("Failed to load the created event");
  return created;
}

/* ------------------------------------------------------------------ */
/* Racks                                                               */
/* ------------------------------------------------------------------ */

/** Documented acquisition cabinet per machine. */
export async function getRackChassisByMachine(machineId?: string): Promise<Map<string, RackChassisInfo>> {
  const res = await query<{ id: string; machine_id: string; name: string; cabinet_location: string; ip_address: string; protocol: string; firmware: string }>(
    "SELECT id, machine_id, name, cabinet_location, ip_address, protocol, firmware FROM rack_chassis WHERE ($1::varchar IS NULL OR machine_id = $1) AND machine_id IS NOT NULL ORDER BY id",
    [machineId ?? null],
  );
  const out = new Map<string, RackChassisInfo>();
  for (const c of res.rows) {
    if (out.has(c.machine_id)) continue;
    out.set(c.machine_id, { id: c.id, name: c.name, cabinetLocation: c.cabinet_location, ipAddress: c.ip_address, protocol: c.protocol, firmware: c.firmware });
  }
  return out;
}

/** A machine's cabinet (chassis → card → channel) from the documented acquisition path of its measurements. */
export async function getMachineRackUnits(machineId?: string): Promise<MachineRackInfo[]> {
  await ensureDatabaseSeeded();
  const [machines, signals, chassisByMachine] = await Promise.all([
    query<{ id: string; name: string }>("SELECT id, name FROM machines WHERE ($1::varchar IS NULL OR id = $1) ORDER BY id", [machineId ?? null]),
    getMappedSignals(machineId),
    getRackChassisByMachine(machineId),
  ]);
  const rows = await query<{ measurement_id: string; name: string; normal_text: string | null; subassembly_name: string }>(
    `SELECT c.measurement_id, c.name, m.normal_text, c.subassembly_name FROM v_measurement_context c JOIN measurements m ON m.id = c.measurement_id
      WHERE ($1::varchar IS NULL OR c.machine_id = $1)`,
    [machineId ?? null],
  );
  const extra = new Map(rows.rows.map((r) => [r.measurement_id, r]));
  const out: MachineRackInfo[] = [];
  for (const m of machines.rows) {
    const sigs: RackSignalRow[] = signals
      .filter((s) => s.machineId === m.id)
      .map((s) => ({
        tag: s.tag,
        name: extra.get(s.id)?.name ?? s.tag,
        instrument: s.instrument,
        sensor_type: s.sensorType,
        edge_rack: s.edgeRack,
        card_slot: s.cardSlot,
        modbus_address: s.modbusAddress,
        current_value: s.currentValue,
        unit: s.unit,
        quality: s.quality,
        sample_rate: s.sampleRate,
        status: s.status,
        normal_threshold: extra.get(s.id)?.normal_text ?? null,
        component: extra.get(s.id)?.subassembly_name ?? null,
      }));
    for (const rack of buildRacksFromSignals(m, sigs)) out.push({ ...rack, chassis: chassisByMachine.get(m.id) ?? null });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Fleet summary                                                       */
/* ------------------------------------------------------------------ */

/** `plantIds`: the plants to count; undefined = every plant. */
export async function getFleetStats(plantIds?: string[]) {
  await ensureDatabaseSeeded();
  const [allMachines, events] = await Promise.all([getMachines(), readOperatingEvents(undefined, 200)]);
  const machines = plantIds ? allMachines.filter((m) => m.plantId && plantIds.includes(m.plantId)) : allMachines;
  const ids = new Set(machines.map((m) => m.id));
  const scoped = <T extends { machineId: string }>(list: T[]) => (plantIds ? list.filter((x) => ids.has(x.machineId)) : list);
  const scored = machines.filter((m) => m.health !== null);
  const signals = await query<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM v_measurement_context WHERE ($1::varchar[] IS NULL OR plant_id = ANY($1))",
    [plantIds ?? null],
  );
  const filteredEvents = scoped(events);
  return {
    totalMachines: machines.length,
    operationalCount: machines.filter((m) => m.status === "Operational").length,
    advisoryCount: machines.filter((m) => m.status === "Alert" || m.status === "Critical").length,
    standbyCount: machines.filter((m) => m.status === "Standby").length,
    /** Mean Machine Health Index of the machines that have one; null when none is evaluated. */
    avgHealth: scored.length ? Math.round(scored.reduce((a, m) => a + (m.health ?? 0), 0) / scored.length) : null,
    totalSignals: signals.rows[0]?.n ?? 0,
    totalEvents: filteredEvents.length,
    recentEvents: filteredEvents.slice(0, 6),
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
