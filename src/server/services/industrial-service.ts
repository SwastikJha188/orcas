import pool, { query } from "@/server/db";
import { seedDatabase, rebuildRackUnitsFromSignals, applyFleetSensorSpecs, applyFleetHistory } from "@/server/db/seed";
import { applyKilnFleet } from "@/server/db/kiln-fleet";
import {
  HierarchyNode,
  AssetMachine,
  MappedSignal,
  DiagnosisRecord,
  OperatingEvent,
  RackChassisRecord,
  MachineTrendRecord,
} from "@/components/assets/assets-data";
import type { MachineProcessStage } from "@/components/assets/process-data";
import type { MachineRackInfo, RackChassisInfo } from "@/components/assets/rack-data";

/**
 * Ensures the database is initialized and seeded before reading.
 */
let isAutoSeedChecking = false;
export async function ensureDatabaseSeeded(): Promise<void> {
  if (isAutoSeedChecking) return;
  isAutoSeedChecking = true;
  try {
    const res = await query("SELECT COUNT(*)::int as count FROM machines");
    if (!res.rows[0] || res.rows[0].count === 0) {
      console.log("Empty database detected. Auto-seeding PostgreSQL database...");
      await seedDatabase();
      console.log("Auto-seeding completed.");
    }
  } catch (err) {
    console.warn("Database check triggered seed attempt:", err);
    try {
      await seedDatabase();
    } catch (seedErr) {
      console.error("Auto-seed error:", seedErr);
    }
  } finally {
    isAutoSeedChecking = false;
  }
}

/**
 * Fetches the complete plant hierarchy tree from PostgreSQL
 */
export async function getPlantHierarchy(): Promise<HierarchyNode[]> {
  await ensureDatabaseSeeded();

  const res = await query<{
    id: string;
    name: string;
    type: "plant" | "area" | "group" | "machine";
    parent_id: string | null;
    machine_id: string | null;
    status: "Operational" | "Advisory" | "Standby" | "Maintenance" | null;
    health: number | null;
    sort_order: number;
    time_zone: string | null;
  }>("SELECT * FROM hierarchy_nodes ORDER BY sort_order ASC");

  const nodes = res.rows;
  const nodeMap = new Map<string, HierarchyNode>();

  // First pass: create nodes
  for (const row of nodes) {
    nodeMap.set(row.id, {
      id: row.id,
      name: row.name,
      type: row.type,
      machineId: row.machine_id || undefined,
      status: row.status || undefined,
      health: row.health ?? undefined,
      ...(row.type === "plant" ? { timeZone: row.time_zone ?? null } : {}),
      children: [],
    });
  }

  // Second pass: link tree
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
  constructor(readonly code: "NOT_FOUND" | "NOT_A_PLANT" | "INVALID_TIME_ZONE", message: string, readonly status: number) {
    super(message);
  }
}

/** Sets (or clears, with null) a plant's time zone. Only plants carry one; areas and machines inherit it. */
export async function setPlantTimeZone(id: string, timeZone: string | null): Promise<{ id: string; timeZone: string | null }> {
  await ensureDatabaseSeeded();
  if (timeZone !== null && !isTimeZone(timeZone)) {
    throw new HierarchyError("INVALID_TIME_ZONE", `“${timeZone}” is not a known time zone.`, 400);
  }
  const found = await query<{ type: string }>("SELECT type FROM hierarchy_nodes WHERE id = $1", [id]);
  if (!found.rows[0]) throw new HierarchyError("NOT_FOUND", `No hierarchy node “${id}”.`, 404);
  if (found.rows[0].type !== "plant") throw new HierarchyError("NOT_A_PLANT", "Only a plant (site) has a time zone; areas and machines inherit it.", 400);
  await query("UPDATE hierarchy_nodes SET time_zone = $2 WHERE id = $1", [id, timeZone]);
  return { id, timeZone };
}

/**
 * Fetches all machines or a single machine with parts & hotspots
 */
export async function getMachines(): Promise<AssetMachine[]> {
  await ensureDatabaseSeeded();

  const mRes = await query<{
    id: string;
    name: string;
    area: string;
    process_cell: string;
    type: string;
    manufacturer: string;
    model: string;
    serial_number: string;
    commissioned: string;
    location: string;
    coordinates: string;
    power_rating: string;
    operating_speed: string;
    criticality: "A (Critical)" | "B (Essential)" | "C (General)";
    status: "Operational" | "Advisory" | "Standby" | "Maintenance";
    health: number;
    sap_equipment_id: string;
    floc: string;
    cost_center: string;
    plant: string;
    work_center: string;
    active_work_order: string | null;
    signals_count: number;
    diagram_type: "mill" | "crusher" | "pump" | "blower" | "kiln";
  }>("SELECT * FROM machines ORDER BY id ASC");

  const partsRes = await query<{
    machine_id: string;
    part_id: string;
    name: string;
    health: number;
    status: "Normal" | "Advisory" | "Critical";
    bbox: { x: number; y: number; width: number; height: number };
    critical_notes: string | null;
  }>("SELECT * FROM machine_parts ORDER BY id ASC");

  const hotspotsRes = await query<{
    machine_id: string;
    hotspot_id: string;
    label: string;
    parameter: string;
    value: string;
    unit: string;
    status: "Normal" | "Advisory" | "Critical";
    x: string;
    y: string;
    component: string;
  }>("SELECT * FROM machine_hotspots ORDER BY id ASC");

  const partsByMachine = new Map<string, typeof partsRes.rows>();
  for (const p of partsRes.rows) {
    const list = partsByMachine.get(p.machine_id) || [];
    list.push(p);
    partsByMachine.set(p.machine_id, list);
  }

  const hotspotsByMachine = new Map<string, typeof hotspotsRes.rows>();
  for (const h of hotspotsRes.rows) {
    const list = hotspotsByMachine.get(h.machine_id) || [];
    list.push(h);
    hotspotsByMachine.set(h.machine_id, list);
  }

  return mRes.rows.map((row) => ({
    id: row.id,
    name: row.name,
    area: row.area,
    processCell: row.process_cell,
    type: row.type,
    manufacturer: row.manufacturer,
    model: row.model,
    serialNumber: row.serial_number,
    commissioned: row.commissioned,
    location: row.location,
    coordinates: row.coordinates,
    powerRating: row.power_rating,
    operatingSpeed: row.operating_speed,
    criticality: row.criticality,
    status: row.status,
    health: row.health,
    sapEquipmentId: row.sap_equipment_id,
    floc: row.floc,
    costCenter: row.cost_center,
    plant: row.plant,
    workCenter: row.work_center,
    activeWorkOrder: row.active_work_order || undefined,
    signalsCount: row.signals_count,
    diagramType: row.diagram_type,
    parts: (partsByMachine.get(row.id) || []).map((p) => ({
      id: p.part_id,
      name: p.name,
      health: p.health,
      status: p.status,
      bbox: p.bbox,
      criticalNotes: p.critical_notes || undefined,
    })),
    hotspots: (hotspotsByMachine.get(row.id) || []).map((h) => ({
      id: h.hotspot_id,
      label: h.label,
      parameter: h.parameter,
      value: h.value,
      unit: h.unit,
      status: h.status,
      x: parseFloat(h.x),
      y: parseFloat(h.y),
      component: h.component,
    })),
  }));
}

/**
 * Fetches machine by ID
 */
export async function getMachineById(id: string): Promise<AssetMachine | null> {
  const all = await getMachines();
  return all.find((m) => m.id === id) || null;
}

/**
 * Fetches mapped signals for a machine or all.
 * Returns canonical enriched rows (system/subassembly/reasons included when present).
 */
export async function getMappedSignals(machineId?: string): Promise<MappedSignal[]> {
  await ensureDatabaseSeeded();

  let sql = "SELECT * FROM mapped_signals";
  const params: unknown[] = [];
  if (machineId) {
    sql += " WHERE machine_id = $1";
    params.push(machineId);
  }
  sql += " ORDER BY tag ASC";

  const res = await query<{
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
  /** D5 measurement point (P1…P6 per sub-assembly diagram). */
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
 * Single canonical catalog for a machine — the DB source of truth
 * that every page (Overview / Sensor Mapping / Component Health /
 * Diagnosis / Trends / Rack) must read from.
 */
export async function getMachineCatalog(machineId: string): Promise<MachineCatalog> {
  await ensureDatabaseSeeded();

  const sysRes = await query<{
    id: string;
    machine_id: string;
    system_id: string;
    name: string;
    short_name: string;
    health: number;
    status: "Normal" | "Advisory" | "Critical";
    bbox: { x: number; y: number; width: number; height: number };
  }>("SELECT * FROM machine_systems WHERE machine_id = $1 ORDER BY system_id ASC", [machineId]);

  const saRes = await query<{
    id: string;
    machine_id: string;
    system_id: string;
    subassembly_id: string;
    name: string;
    short_name: string;
    health: number;
    status: "Normal" | "Advisory" | "Critical";
    criticality: string;
    sensor_tags: string[];
  }>("SELECT * FROM machine_subassemblies WHERE machine_id = $1 ORDER BY subassembly_id ASC", [machineId]);

  const sigRes = await query<{
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
  }>("SELECT * FROM mapped_signals WHERE machine_id = $1 ORDER BY tag ASC", [machineId]);

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
    numericValue: r.numeric_value ?? parseFloat(r.current_value) ?? 0,
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
    warningVal: r.warning_val,
    alarmVal: r.alarm_val,
    maxScale: r.max_scale,
    nominalBand: r.nominal_band,
    standard: r.standard,
    defaultBaseline: r.default_baseline,
    reasons: Array.isArray(r.reasons) ? r.reasons : [],
    x: r.x !== null && r.x !== undefined ? Number(r.x) : null,
    y: r.y !== null && r.y !== undefined ? Number(r.y) : null,
  }));

  const sensorsBySystem = new Map<string, number>();
  for (const s of sensors) {
    if (s.systemId) sensorsBySystem.set(s.systemId, (sensorsBySystem.get(s.systemId) || 0) + 1);
  }

  const systems: CatalogSystem[] = sysRes.rows.map((r) => ({
    id: r.id,
    machineId: r.machine_id,
    systemId: r.system_id,
    name: r.name,
    shortName: r.short_name,
    health: r.health,
    status: r.status,
    bbox: r.bbox,
    sensorCount: sensorsBySystem.get(r.system_id) || 0,
  }));

  const subassemblies: CatalogSubassembly[] = saRes.rows.map((r) => ({
    id: r.id,
    machineId: r.machine_id,
    systemId: r.system_id,
    subassemblyId: r.subassembly_id,
    name: r.name,
    shortName: r.short_name,
    health: r.health,
    status: r.status,
    criticality: r.criticality,
    sensorTags: Array.isArray(r.sensor_tags) ? r.sensor_tags : [],
    sensorCount: Array.isArray(r.sensor_tags) ? r.sensor_tags.length : 0,
  }));

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

/** Cabinet records by machine, through rack_chassis.machine_id (not payload text). */
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
    machineId ? [machineId] : []
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
 * A machine's cabinet model (chassis → card → channel) as stored in
 * machine_rack_units, regenerated from mapped_signals. Machines with edge
 * registry points are served from the registry instead (see /api/rack-units).
 */
export async function getMachineRackUnits(machineId?: string): Promise<MachineRackInfo[]> {
  await ensureDatabaseSeeded();

  let sql = "SELECT machine_id, rack_id, rack_number, payload FROM machine_rack_units";
  const params: unknown[] = [];
  if (machineId) {
    sql += " WHERE machine_id = $1";
    params.push(machineId);
  }
  sql += " ORDER BY machine_id ASC, rack_number ASC";

  const res = await query<{
    machine_id: string;
    rack_id: string;
    rack_number: number;
    payload: MachineRackInfo;
  }>(sql, params);

  const chassisByMachine = await getRackChassisByMachine(machineId);
  // Payloads written before the chassis → card → channel model have no modules.
  return res.rows
    .filter((r) => Array.isArray(r.payload?.modules))
    .map((r) => ({ ...r.payload, chassis: chassisByMachine.get(r.machine_id) ?? null }));
}

/**
 * Applies the non-kiln sensor specs (limits, sub-assembly and acquisition
 * mapping, failure modes) to the live DB, then regenerates those machines'
 * rack payloads, trend history and diagnosis records. One transaction.
 */
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

/** Rebuilds the cloned kilns (KLN-02 / KLN-03) from KLN-01. Idempotent. */
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

export async function rebuildMachineRackUnits(): Promise<{ racksWritten: number }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const racksWritten = await rebuildRackUnitsFromSignals(client);
    await client.query("COMMIT");
    return { racksWritten };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Fetches diagnosis records
 */
export async function getDiagnosisRecords(machineId?: string): Promise<DiagnosisRecord[]> {
  await ensureDatabaseSeeded();

  let sql = "SELECT * FROM diagnosis_records";
  const params: unknown[] = [];
  if (machineId) {
    sql += " WHERE machine_id = $1";
    params.push(machineId);
  }

  const res = await query<{
    machine_id: string;
    overall_condition: "Nominal" | "Advisory" | "Critical";
    confidence: string;
    engine_version: string;
    summary: string;
    findings: DiagnosisRecord["findings"];
    peak_frequencies: DiagnosisRecord["peakFrequencies"];
    maintenance_priority: "Low" | "Medium" | "High" | "Immediate";
    prescriptive_action: string;
  }>(sql, params);

  return res.rows.map((row) => ({
    machineId: row.machine_id,
    overallCondition: row.overall_condition as "Nominal" | "Advisory" | "Critical",
    confidence: parseFloat(row.confidence),
    engineVersion: row.engine_version,
    summary: row.summary,
    findings: row.findings,
    peakFrequencies: row.peak_frequencies,
    maintenancePriority: row.maintenance_priority,
    prescriptiveAction: row.prescriptive_action,
  }));
}

/**
 * Fetches trend records for a machine
 */
export async function getTrendRecords(machineId?: string): Promise<MachineTrendRecord[]> {
  await ensureDatabaseSeeded();

  let sql = "SELECT * FROM trend_records";
  const params: unknown[] = [];
  if (machineId) {
    sql += " WHERE machine_id = $1";
    params.push(machineId);
  }

  const res = await query<{
    machine_id: string;
    metric_key: string;
    label: string;
    unit: string;
    baseline: string;
    advisory_limit: string;
    critical_limit: string;
    points: Array<{ time: string; value: number }>;
    stats: { mean: string; peak: string; crestFactor: string; kurtosis: string; drift30d: string };
  }>(sql, params);

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
      points: row.points,
      stats: row.stats,
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
  sql += " ORDER BY id DESC";

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

  const rackRes = await query<{
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

  const slotsRes = await query<{
    rack_id: string;
    slot_number: number;
    card_model: string;
    module_type: string;
    channel_count: number;
    connected_probes: string;
    sample_rate: string;
    sync_state: "Standby" | "Synced" | "Acquiring";
  }>("SELECT * FROM rack_slots ORDER BY slot_number ASC");

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
 * Fleet stats summary for executive Home view
 */
export async function getFleetStats() {
  await ensureDatabaseSeeded();

  const machines = await getMachines();
  const events = await getOperatingEvents();
  const signals = await getMappedSignals();
  const racks = await getRackRecords();

  const totalMachines = machines.length;
  const operationalCount = machines.filter((m) => m.status === "Operational").length;
  const advisoryCount = machines.filter((m) => m.status === "Advisory").length;
  const standbyCount = machines.filter((m) => m.status === "Standby").length;
  const avgHealth = Math.round(
    machines.reduce((acc, m) => acc + m.health, 0) / (machines.length || 1)
  );

  return {
    totalMachines,
    operationalCount,
    advisoryCount,
    standbyCount,
    avgHealth,
    totalSignals: signals.length,
    totalEvents: events.length,
    recentEvents: events.slice(0, 6),
    racksCount: racks.length,
    racks,
    machines: machines.map((m) => ({
      id: m.id,
      name: m.name,
      plant: m.plant,
      area: m.area,
      status: m.status,
      health: m.health,
      criticality: m.criticality,
      signalsCount: m.signalsCount,
    })),
  };
}
