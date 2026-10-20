/**
 * Asset read models served by the established routes (/api/machines,
 * /api/hierarchy, /api/signals, /api/catalog, /api/trends, /api/diagnosis,
 * /api/history, /api/fleet), assembled from the monitoring core:
 *
 * - identity and wiring from measurements and their points / components;
 * - live values from the latest stored readings;
 * - status and health from the server evaluation (findings, health scores);
 * - trends and statistics calculated from stored readings;
 * - diagnosis from open findings and the rule library.
 *
 * No value here is a stored copy of something that can be derived, and no
 * response is padded with defaults: what is unknown is returned as null.
 */
import { query } from "@/server/db";
import { limitRuleFromRow, type LimitRow } from "@/lib/limit-codec";
import { limitBand } from "@/lib/kiln-sim/signals";
import { latestReadings } from "@/server/monitoring/readings";
import { dataQualityNow, machineHealthNow, measurementSeverityNow, subassemblyHealthNow, statusOf } from "@/server/monitoring/condition";
import { setting } from "@/server/monitoring/settings";
import type {
  AssetMachine,
  DiagnosisRecord,
  HierarchyNode,
  MachineTrendRecord,
  MappedSignal,
  OperatingEvent,
} from "@/types/assets";
import type { SeverityId } from "@/types/monitoring";

const n = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const fmtNum = (v: number | null, d: number) => (v === null || !Number.isFinite(v) ? "—" : (Math.round(v * 10 ** d) / 10 ** d).toLocaleString("en-US", { maximumFractionDigits: d }));

type ServiceState = "Operational" | "Standby" | "Maintenance";
type MachineStatus = AssetMachine["status"];

/** Displayed machine status: a manual service state wins; otherwise the evaluated condition. */
export function machineStatus(service: ServiceState, condition: SeverityId | null): MachineStatus {
  if (service !== "Operational") return service;
  if (condition === null) return "No data";
  if (condition === "Critical") return "Critical";
  if (condition === "Alert") return "Alert";
  return "Operational";
}

/* ------------------------------------------------------------------ */
/* Measurement rows shared by several read models                      */
/* ------------------------------------------------------------------ */

interface MeasurementRow {
  measurement_id: string;
  machine_id: string;
  tag: string;
  name: string;
  unit: string | null;
  value_kind: "analog" | "state";
  origin_id: string;
  decimals: number;
  instrument: string | null;
  sensor_type: string | null;
  acquisition_text: string | null;
  range_text: string | null;
  range_hi: number | null;
  normal_text: string | null;
  install_status: string | null;
  priority: string | null;
  accuracy: string | null;
  standard: string | null;
  point_code: string;
  point_location: string | null;
  diagram_x: number | null;
  diagram_y: number | null;
  subassembly_id: string;
  subassembly_code: string;
  subassembly_name: string;
  system_id: string;
  system_code: string;
  rack: string | null;
  card: string | null;
  address: string | null;
  sort_order: number;
}

async function measurementRows(machineIds?: string[]): Promise<MeasurementRow[]> {
  const res = await query<MeasurementRow>(
    `SELECT c.measurement_id, c.machine_id, c.tag, c.name, c.unit, c.value_kind, c.origin_id, c.decimals,
            it.name AS instrument, m.sensor_type, m.acquisition_text, m.range_text, m.range_hi, m.normal_text,
            m.install_status, m.priority, m.accuracy, m.standard,
            c.point_code, c.point_location, p.diagram_x, p.diagram_y,
            c.subassembly_id, c.subassembly_code, c.subassembly_name, c.system_id, c.system_code,
            a.rack, a.card, a.address, c.sort_order
       FROM v_measurement_context c
       JOIN measurements m ON m.id = c.measurement_id
       JOIN measurement_points p ON p.id = c.point_id
       LEFT JOIN instrument_types it ON it.id = m.instrument_type_id
       LEFT JOIN measurement_acquisition a ON a.measurement_id = c.measurement_id
      WHERE ($1::varchar[] IS NULL OR c.machine_id = ANY($1))
      ORDER BY c.machine_id, c.tag`,
    [machineIds ?? null],
  );
  return res.rows;
}

interface LimitBandNow {
  warn: number | null;
  alarm: number | null;
  warnText: string | null;
  alarmText: string | null;
  normalText: string | null;
}

/** Warning / alarm boundary per measurement (for relative limits: at the current reference). */
async function limitBands(machineIds?: string[]): Promise<Map<string, LimitBandNow>> {
  const res = await query<Record<string, unknown>>(
    `SELECT l.*, pm.tag AS pair_tag, dm.tag AS drive_tag, rv.expected
       FROM measurement_limits l
       JOIN v_measurement_context c ON c.measurement_id = l.measurement_id
       LEFT JOIN measurements pm ON pm.id = l.pair_measurement_id
       LEFT JOIN measurements dm ON dm.id = l.drive_measurement_id
       LEFT JOIN LATERAL (
         SELECT v.expected FROM reference_sets s JOIN reference_values v ON v.reference_set_id = s.id
          WHERE s.machine_id = c.machine_id AND s.status = 'accepted' AND v.measurement_id = l.measurement_id
          ORDER BY (s.state_id IS NULL) LIMIT 1
       ) rv ON TRUE
      WHERE ($1::varchar[] IS NULL OR c.machine_id = ANY($1))`,
    [machineIds ?? null],
  );
  const out = new Map<string, LimitBandNow>();
  for (const r of res.rows) {
    const row: LimitRow = {
      kind: r.kind_id as LimitRow["kind"],
      direction: (r.direction as LimitRow["direction"]) ?? null,
      warnValue: n(r.warn_value),
      alarmValue: n(r.alarm_value),
      warnLo: n(r.warn_lo),
      warnHi: n(r.warn_hi),
      alarmLo: n(r.alarm_lo),
      alarmHi: n(r.alarm_hi),
      warnPct: n(r.warn_pct),
      alarmPct: n(r.alarm_pct),
      collapsePct: n(r.collapse_pct),
      ratio: n(r.ratio),
      rise: n(r.rise),
      split: n(r.split),
      pairTag: (r.pair_tag as string) ?? null,
      driveTag: (r.drive_tag as string) ?? null,
      driveOn: n(r.drive_on),
      referenceValue: n(r.reference_value),
      absWarnLo: n(r.abs_warn_lo),
      absWarnHi: n(r.abs_warn_hi),
      absAlarmLo: n(r.abs_alarm_lo),
      absAlarmHi: n(r.abs_alarm_hi),
      ratePerHour: n(r.rate_per_hour),
      rateOf: (r.rate_of as LimitRow["rateOf"]) ?? null,
      rateWindow: n(r.rate_window),
      raiseSamples: Number(r.raise_samples),
      clearSamples: Number(r.clear_samples),
      basisNormal: (r.basis_normal as string) ?? null,
      basisWarning: (r.basis_warning as string) ?? null,
      basisAlarm: (r.basis_alarm as string) ?? null,
      source: (r.source as string) ?? null,
      note: (r.note as string) ?? null,
      approval: r.approval as LimitRow["approval"],
    };
    let band = null;
    try {
      band = limitBand(limitRuleFromRow(row), n(r.expected));
    } catch {
      band = null;
    }
    out.set(String(r.measurement_id), {
      warn: band ? (band.warnHi ?? band.warnLo ?? null) : null,
      alarm: band ? (band.alarmHi ?? band.alarmLo ?? null) : null,
      warnText: row.basisWarning,
      alarmText: row.basisAlarm,
      normalText: row.basisNormal,
    });
  }
  return out;
}

/** "97% Good" over the last hour, or "No data". */
function qualityText(q: { usablePct: number; samples: number } | undefined): string {
  return q ? `${q.usablePct}% Good` : "No data";
}

function valueText(latest: { value: number | null; state: string | null } | undefined, decimals: number): string {
  if (!latest) return "No data";
  if (latest.state !== null) return latest.state;
  return fmtNum(latest.value, decimals);
}

/* ------------------------------------------------------------------ */
/* Hierarchy and machines                                              */
/* ------------------------------------------------------------------ */

export async function readPlantHierarchy(plantId?: string): Promise<HierarchyNode[]> {
  const res = await query<{
    id: string;
    plant_id: string;
    name: string;
    type: HierarchyNode["type"];
    parent_id: string | null;
    machine_id: string | null;
    plant_status: HierarchyNode["status"] | null;
    plant_time_zone: string | null;
    service_state: ServiceState | null;
  }>(
    `SELECT hn.id, hn.plant_id, hn.name, hn.type, hn.parent_id, hn.machine_id,
            p.status AS plant_status, p.time_zone AS plant_time_zone, m.service_state
       FROM hierarchy_nodes hn
       JOIN plants p ON p.id = hn.plant_id
       LEFT JOIN machines m ON m.id = hn.machine_id
      WHERE ($1::varchar IS NULL OR hn.plant_id = $1)
      ORDER BY p.sort_order ASC, hn.sort_order ASC, hn.name ASC`,
    [plantId ?? null],
  );
  const health = await machineHealthNow(res.rows.filter((r) => r.machine_id).map((r) => r.machine_id!));
  const nodeMap = new Map<string, HierarchyNode>();
  for (const row of res.rows) {
    const h = row.machine_id ? health.get(row.machine_id) : undefined;
    nodeMap.set(row.id, {
      id: row.id,
      name: row.name,
      type: row.type,
      machineId: row.machine_id || undefined,
      status:
        row.type === "machine"
          ? machineStatus(row.service_state ?? "Operational", h?.status ?? null)
          : row.type === "plant"
            ? (row.plant_status ?? undefined)
            : undefined,
      health: row.type === "machine" && h ? Math.round(h.score) : undefined,
      ...(row.type === "plant" ? { timeZone: row.plant_time_zone ?? null } : {}),
      children: [],
    });
  }
  const roots: HierarchyNode[] = [];
  for (const row of res.rows) {
    const cur = nodeMap.get(row.id)!;
    const parent = row.parent_id ? nodeMap.get(row.parent_id) : undefined;
    if (parent) (parent.children ??= []).push(cur);
    else roots.push(cur);
  }
  return roots;
}

export async function readMachines(plantId?: string): Promise<AssetMachine[]> {
  const mRes = await query<{
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
    criticality: AssetMachine["criticality"];
    service_state: ServiceState;
    sap_equipment_id: string | null;
    floc: string | null;
    cost_center: string | null;
    work_center: string | null;
    active_work_order: number | null;
    diagram_type: AssetMachine["diagramType"];
    health_model_id: string | null;
  }>(
    `SELECT m.id, m.plant_id, m.name, p.name AS plant_name,
            -- A machine sits under a process cell inside an area, or straight under an area.
            CASE WHEN grp_node.type = 'area' THEN grp_node.name WHEN area_node.type = 'area' THEN area_node.name END AS area_name,
            CASE WHEN grp_node.type = 'group' THEN grp_node.name END AS process_cell_name,
            em.type_name, em.manufacturer, em.model_number, m.serial_number, m.commissioned, m.bay_location, m.coordinates,
            em.power_rating, em.operating_speed, m.criticality, m.service_state,
            sap.sap_equipment_id, sap.floc, sap.cost_center, sap.work_center,
            (SELECT wo.id FROM work_orders wo WHERE wo.machine_id = m.id AND wo.status IN ('open', 'in_progress') ORDER BY wo.created_at DESC LIMIT 1) AS active_work_order,
            em.diagram_type, m.health_model_id
       FROM machines m
       JOIN plants p ON p.id = m.plant_id
       JOIN equipment_models em ON em.id = m.model_id
       LEFT JOIN hierarchy_nodes mnode ON mnode.machine_id = m.id
       LEFT JOIN hierarchy_nodes grp_node ON grp_node.id = mnode.parent_id
       LEFT JOIN hierarchy_nodes area_node ON area_node.id = grp_node.parent_id
       LEFT JOIN sap_equipment_records sap ON sap.machine_id = m.id
      WHERE ($1::varchar IS NULL OR m.plant_id = $1)
      ORDER BY p.sort_order ASC, m.id ASC`,
    [plantId ?? null],
  );
  if (!mRes.rows.length) return [];
  const ids = mRes.rows.map((r) => r.id);
  const [systems, subsRes, rows, latest, severity, health, subHealth, params] = await Promise.all([
    query<{ id: string; machine_id: string; part_code: string; name: string; scored: boolean; bbox_x: string; bbox_y: string; bbox_w: string; bbox_h: string; critical_notes: string | null }>(
      "SELECT id, machine_id, part_code, name, scored, bbox_x, bbox_y, bbox_w, bbox_h, critical_notes FROM machine_systems WHERE machine_id = ANY($1) ORDER BY sort_order ASC, id ASC",
      [ids],
    ),
    query<{ id: string; system_id: string }>(
      "SELECT sa.id, sa.machine_system_ref_id AS system_id FROM machine_subassemblies sa JOIN machine_systems sy ON sy.id = sa.machine_system_ref_id WHERE sy.machine_id = ANY($1)",
      [ids],
    ),
    measurementRows(ids),
    latestReadings({}),
    measurementSeverityNow(ids),
    machineHealthNow(ids),
    subassemblyHealthNow(ids),
    query<{ machine_id: string; key: string; value: number }>(
      `SELECT m.id AS machine_id, p.key, p.value FROM machines m JOIN health_model_parameters p ON p.model_id = m.health_model_id
        WHERE m.id = ANY($1) AND p.key IN ('system_min_weight', 'band_advisory', 'band_critical')`,
      [ids],
    ),
  ]);
  const paramOf = (machineId: string, key: string) => {
    const r = params.rows.find((p) => p.machine_id === machineId && p.key === key);
    return r ? Number(r.value) : null;
  };
  return mRes.rows.map((row) => {
    const sigs = rows.filter((r) => r.machine_id === row.id);
    const h = health.get(row.id);
    const w = paramOf(row.id, "system_min_weight");
    const bands = { advisory: paramOf(row.id, "band_advisory"), critical: paramOf(row.id, "band_critical") };
    return {
      id: row.id,
      name: row.name,
      plantId: row.plant_id,
      area: row.area_name ?? "",
      processCell: row.process_cell_name ?? "",
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
      status: machineStatus(row.service_state, h?.status ?? null),
      health: h ? Math.round(h.score) : null,
      sapEquipmentId: row.sap_equipment_id,
      floc: row.floc,
      costCenter: row.cost_center,
      plant: row.plant_name,
      workCenter: row.work_center,
      activeWorkOrder: row.active_work_order !== null ? `WO-${row.active_work_order}` : undefined,
      signalsCount: sigs.length,
      healthModelId: row.health_model_id,
      diagramType: row.diagram_type,
      parts: systems.rows
        .filter((p) => p.machine_id === row.id)
        .map((p) => {
          const scores = subsRes.rows.filter((s) => s.system_id === p.id).map((s) => subHealth.get(s.id)?.score).filter((x): x is number => x !== undefined);
          const score = scores.length && w !== null ? w * Math.min(...scores) + (1 - w) * (scores.reduce((a, b) => a + b, 0) / scores.length) : null;
          return {
            id: p.part_code,
            name: p.name,
            health: score === null ? null : Math.round(score),
            status: score === null ? null : statusOf(score, bands),
            bbox: { x: parseFloat(p.bbox_x), y: parseFloat(p.bbox_y), width: parseFloat(p.bbox_w), height: parseFloat(p.bbox_h) },
            criticalNotes: p.critical_notes || undefined,
          };
        }),
      hotspots: sigs
        .filter((s) => s.diagram_x !== null && s.diagram_y !== null)
        .map((s) => ({
          id: s.tag,
          label: s.name,
          parameter: s.tag,
          value: valueText(latest.get(s.measurement_id), s.decimals),
          unit: s.unit ?? "",
          status: severity.get(s.measurement_id) ?? "Normal",
          x: Number(s.diagram_x),
          y: Number(s.diagram_y),
          component: s.subassembly_name,
        })),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Signals and catalog                                                 */
/* ------------------------------------------------------------------ */

export async function readMappedSignals(machineId?: string): Promise<MappedSignal[]> {
  const ids = machineId ? [machineId] : undefined;
  const [rows, latest, severity, quality] = await Promise.all([measurementRows(ids), latestReadings(machineId ? { machineId } : {}), measurementSeverityNow(ids), dataQualityNow(ids, 1)]);
  return rows.map((r) => ({
    id: r.measurement_id,
    machineId: r.machine_id,
    tag: r.tag,
    instrument: r.instrument ?? "",
    sensorType: r.sensor_type ?? "",
    edgeRack: r.rack ?? "",
    cardSlot: r.card ?? "",
    modbusAddress: r.address ?? "",
    currentValue: valueText(latest.get(r.measurement_id), r.decimals),
    unit: r.unit ?? "state",
    quality: qualityText(quality.get(r.measurement_id)),
    sampleRate: r.acquisition_text ?? "",
    status: severity.get(r.measurement_id) ?? "Normal",
  }));
}

export interface CatalogSystem {
  id: string;
  machineId: string;
  systemId: string;
  name: string;
  shortName: string;
  health: number | null;
  status: SeverityId | null;
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
  health: number | null;
  status: SeverityId | null;
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
  numericValue: number | null;
  unit: string;
  quality: string;
  sampleRate: string;
  status: SeverityId;
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

export async function readMachineCatalog(machineId: string): Promise<MachineCatalog> {
  const ids = [machineId];
  const [sysRes, saRes, rows, latest, severity, quality, bands, refs, rules, subHealth, machines] = await Promise.all([
    query<{ id: string; system_id: string; name: string; short_name: string; bbox_x: string; bbox_y: string; bbox_w: string; bbox_h: string }>(
      "SELECT id, system_id, name, short_name, bbox_x, bbox_y, bbox_w, bbox_h FROM machine_systems WHERE machine_id = $1 ORDER BY sort_order ASC, system_id ASC",
      [machineId],
    ),
    query<{ id: string; system_ref: string; system_id: string; subassembly_id: string; name: string; short_name: string; criticality: string }>(
      `SELECT sa.id, sy.id AS system_ref, sy.system_id, sa.subassembly_id, sa.name, sa.short_name, sa.criticality
         FROM machine_subassemblies sa JOIN machine_systems sy ON sy.id = sa.machine_system_ref_id
        WHERE sy.machine_id = $1 ORDER BY sy.sort_order, sa.sort_order ASC, sa.subassembly_id ASC`,
      [machineId],
    ),
    measurementRows(ids),
    latestReadings({ machineId }),
    measurementSeverityNow(ids),
    dataQualityNow(ids, 1),
    limitBands(ids),
    query<{ measurement_id: string; expected: number | null }>(
      `SELECT DISTINCT ON (v.measurement_id) v.measurement_id, v.expected
         FROM reference_sets s JOIN reference_values v ON v.reference_set_id = s.id
        WHERE s.machine_id = $1 AND s.status = 'accepted' ORDER BY v.measurement_id, (s.state_id IS NULL)`,
      [machineId],
    ),
    query<{ code: string; name: string; logic: string; cause: string; consequence: string; action: string; measurement_id: string; inputs: string[] }>(
      `SELECT r.code, r.name, r.logic, r.cause, r.consequence, r.action, ri.measurement_id,
              ARRAY(SELECT m2.tag FROM rule_inputs r2 JOIN measurements m2 ON m2.id = r2.measurement_id WHERE r2.rule_id = r.id ORDER BY r2.sort_order) AS inputs
         FROM rules r JOIN rule_inputs ri ON ri.rule_id = r.id
        WHERE r.machine_id = $1 AND r.enabled ORDER BY r.sort_order`,
      [machineId],
    ),
    subassemblyHealthNow(ids),
    query<{ key: string; value: number }>(
      `SELECT p.key, p.value FROM machines m JOIN health_model_parameters p ON p.model_id = m.health_model_id
        WHERE m.id = $1 AND p.key IN ('system_min_weight', 'band_advisory', 'band_critical')`,
      [machineId],
    ),
  ]);
  const P = (k: string) => {
    const r = machines.rows.find((x) => x.key === k);
    return r ? Number(r.value) : null;
  };
  const expectedBy = new Map(refs.rows.map((r) => [r.measurement_id, n(r.expected)]));
  const reasonsBy = new Map<string, CatalogSensor["reasons"]>();
  for (const r of rules.rows) {
    const list = reasonsBy.get(r.measurement_id) ?? reasonsBy.set(r.measurement_id, []).get(r.measurement_id)!;
    const self = rows.find((x) => x.measurement_id === r.measurement_id)?.tag;
    list.push({
      ruleId: r.code,
      ruleName: r.name,
      primaryCause: r.cause,
      mechanism: r.logic,
      symptomSignature: r.logic,
      consequence: r.consequence,
      prescriptiveAction: r.action,
      crossCheckSensors: r.inputs.filter((t) => t !== self),
    });
  }
  const sensors: CatalogSensor[] = rows.map((r) => {
    const l = latest.get(r.measurement_id);
    const b = bands.get(r.measurement_id);
    return {
      id: r.measurement_id,
      machineId: r.machine_id,
      tag: r.tag,
      name: r.name,
      instrument: r.instrument ?? "",
      sensorType: r.sensor_type ?? "",
      edgeRack: r.rack ?? "",
      cardSlot: r.card ?? "",
      modbusAddress: r.address ?? "",
      currentValue: valueText(l, r.decimals),
      numericValue: l?.value ?? null,
      unit: r.unit ?? "state",
      quality: qualityText(quality.get(r.measurement_id)),
      sampleRate: r.acquisition_text ?? "",
      status: severity.get(r.measurement_id) ?? "Normal",
      position: r.point_location,
      component: r.subassembly_name,
      systemId: r.system_code,
      subassemblyId: r.subassembly_code,
      subAssembly: r.subassembly_name,
      point: r.point_code,
      source: r.install_status,
      priority: r.priority,
      accuracy: r.accuracy,
      rangeVal: r.range_text,
      normalThreshold: b?.normalText ?? r.normal_text,
      warningThreshold: b?.warnText ?? null,
      alarmThreshold: b?.alarmText ?? null,
      warningVal: b?.warn ?? null,
      alarmVal: b?.alarm ?? null,
      maxScale: n(r.range_hi),
      nominalBand: r.normal_text,
      standard: r.standard,
      defaultBaseline: expectedBy.get(r.measurement_id) ?? null,
      reasons: reasonsBy.get(r.measurement_id) ?? [],
      x: n(r.diagram_x),
      y: n(r.diagram_y),
    };
  });
  const sensorsBySystem = new Map<string, number>();
  const tagsBySub = new Map<string, string[]>();
  for (const s of rows) {
    sensorsBySystem.set(s.system_code, (sensorsBySystem.get(s.system_code) ?? 0) + 1);
    (tagsBySub.get(s.subassembly_code) ?? tagsBySub.set(s.subassembly_code, []).get(s.subassembly_code)!).push(s.tag);
  }
  const w = P("system_min_weight");
  const bandsOf = { advisory: P("band_advisory"), critical: P("band_critical") };
  const systems: CatalogSystem[] = sysRes.rows.map((r) => {
    const scores = saRes.rows.filter((s) => s.system_ref === r.id).map((s) => subHealth.get(s.id)?.score).filter((x): x is number => x !== undefined);
    const score = scores.length && w !== null ? w * Math.min(...scores) + (1 - w) * (scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return {
      id: r.id,
      machineId,
      systemId: r.system_id,
      name: r.name,
      shortName: r.short_name,
      health: score === null ? null : Math.round(score),
      status: score === null ? null : statusOf(score, bandsOf),
      bbox: { x: parseFloat(r.bbox_x), y: parseFloat(r.bbox_y), width: parseFloat(r.bbox_w), height: parseFloat(r.bbox_h) },
      sensorCount: sensorsBySystem.get(r.system_id) ?? 0,
    };
  });
  const subassemblies: CatalogSubassembly[] = saRes.rows.map((r) => {
    const tags = tagsBySub.get(r.subassembly_id) ?? [];
    const h = subHealth.get(r.id);
    return {
      id: r.id,
      machineId,
      systemId: r.system_id,
      subassemblyId: r.subassembly_id,
      name: r.name,
      shortName: r.short_name,
      health: h ? Math.round(h.score) : null,
      status: h?.status ?? null,
      criticality: r.criticality,
      sensorTags: tags,
      sensorCount: tags.length,
    };
  });
  return { machineId, systems, subassemblies, sensors, counts: { systems: systems.length, subassemblies: subassemblies.length, sensors: sensors.length } };
}

/* ------------------------------------------------------------------ */
/* Trends, from stored readings                                        */
/* ------------------------------------------------------------------ */

/** Excess kurtosis-free (Pearson) kurtosis of a sample. */
function kurtosis(values: number[]): number | null {
  if (values.length < 4) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const m2 = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  const m4 = values.reduce((a, v) => a + (v - mean) ** 4, 0) / values.length;
  return m2 > 0 ? m4 / (m2 * m2) : null;
}

export async function readTrendRecords(machineId?: string): Promise<MachineTrendRecord[]> {
  const windowH = await setting("evaluation.trend_window_h");
  const ids = machineId ? [machineId] : undefined;
  const [rows, bands, refs, pts, drift] = await Promise.all([
    measurementRows(ids),
    limitBands(ids),
    query<{ measurement_id: string; expected: number | null }>(
      `SELECT DISTINCT ON (v.measurement_id) v.measurement_id, v.expected
         FROM reference_sets s JOIN reference_values v ON v.reference_set_id = s.id
        WHERE s.status = 'accepted' AND ($1::varchar IS NULL OR s.machine_id = $1)
        ORDER BY v.measurement_id, (s.state_id IS NULL)`,
      [machineId ?? null],
    ),
    query<{ measurement_id: string; t: Date; value: number }>(
      `SELECT r.measurement_id, r.acquired_at AS t, r.value
         FROM readings r
         JOIN quality_codes q ON q.id = r.quality_id AND q.usable
         JOIN v_measurement_context c ON c.measurement_id = r.measurement_id
        WHERE r.value IS NOT NULL AND r.acquired_at > NOW() - make_interval(secs => $2)
          AND ($1::varchar IS NULL OR c.machine_id = $1)
        ORDER BY r.measurement_id, r.acquired_at`,
      [machineId ?? null, windowH * 3600],
    ),
    // Drift over the summarised history (up to the hourly retention window).
    query<{ measurement_id: string; first: number | null; last: number | null; span_h: number | null }>(
      `SELECT h.measurement_id,
              (ARRAY_AGG(h.v_sum / NULLIF(h.good_count, 0) ORDER BY h.hour_start) FILTER (WHERE h.good_count > 0))[1] AS first,
              (ARRAY_AGG(h.v_sum / NULLIF(h.good_count, 0) ORDER BY h.hour_start DESC) FILTER (WHERE h.good_count > 0))[1] AS last,
              extract(epoch FROM MAX(h.hour_start) - MIN(h.hour_start)) / 3600 AS span_h
         FROM reading_hourly h JOIN v_measurement_context c ON c.measurement_id = h.measurement_id
        WHERE ($1::varchar IS NULL OR c.machine_id = $1)
        GROUP BY h.measurement_id`,
      [machineId ?? null],
    ),
  ]);
  const expectedBy = new Map(refs.rows.map((r) => [r.measurement_id, n(r.expected)]));
  const pointsBy = new Map<string, Array<{ t: Date; value: number }>>();
  for (const p of pts.rows) (pointsBy.get(p.measurement_id) ?? pointsBy.set(p.measurement_id, []).get(p.measurement_id)!).push({ t: p.t, value: Number(p.value) });
  const driftBy = new Map(drift.rows.map((d) => [d.measurement_id, d]));
  const out = new Map<string, MachineTrendRecord>();
  for (const r of rows) {
    if (r.value_kind !== "analog") continue;
    const series = pointsBy.get(r.measurement_id) ?? [];
    const values = series.map((p) => p.value);
    const unit = r.unit ?? "";
    const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    const rms = values.length ? Math.sqrt(values.reduce((a, v) => a + v * v, 0) / values.length) : null;
    const peak = values.length ? Math.max(...values.map(Math.abs)) : null;
    const k = kurtosis(values);
    const d = driftBy.get(r.measurement_id);
    const recentDrift = values.length >= 2 ? values[values.length - 1] - values[0] : null;
    const driftVal = d && d.first !== null && d.last !== null ? Number(d.last) - Number(d.first) : recentDrift;
    const driftSpan = d && d.span_h !== null ? `${fmtNum(Number(d.span_h), 0)} h` : `${fmtNum(windowH, 0)} h`;
    const b = bands.get(r.measurement_id);
    const rec = out.get(r.machine_id) ?? out.set(r.machine_id, { machineId: r.machine_id, metrics: [] }).get(r.machine_id)!;
    // Down-sample to at most ~240 points for transport; the full series stays in /api/measurements/:id/readings.
    const step = Math.max(1, Math.ceil(series.length / 240));
    rec.metrics.push({
      key: r.tag,
      label: `${r.name} (${r.tag})`,
      unit,
      baseline: expectedBy.get(r.measurement_id) ?? null,
      advisoryLimit: b?.warn ?? null,
      criticalLimit: b?.alarm ?? null,
      points: series.filter((_, i) => i % step === 0 || i === series.length - 1).map((p) => ({ time: p.t.toISOString(), value: p.value })),
      stats: {
        mean: mean === null ? "—" : `${fmtNum(mean, r.decimals)} ${unit}`.trim(),
        peak: peak === null ? "—" : `${fmtNum(peak, r.decimals)} ${unit}`.trim(),
        crestFactor: rms && peak !== null ? fmtNum(peak / rms, 2) : "—",
        kurtosis: k === null ? "—" : fmtNum(k, 2),
        drift30d: driftVal === null ? "—" : `${driftVal >= 0 ? "+" : ""}${fmtNum(driftVal, r.decimals)} ${unit} over ${driftSpan}`.trim(),
      },
    });
  }
  return [...out.values()];
}

/* ------------------------------------------------------------------ */
/* Diagnosis, from open findings                                       */
/* ------------------------------------------------------------------ */

export async function readDiagnosisRecords(machineId?: string): Promise<DiagnosisRecord[]> {
  const machines = await query<{ id: string; model_name: string | null; service_state: ServiceState }>(
    `SELECT m.id, h.name AS model_name, m.service_state FROM machines m LEFT JOIN health_models h ON h.id = m.health_model_id
      WHERE ($1::varchar IS NULL OR m.id = $1) ORDER BY m.id`,
    [machineId ?? null],
  );
  const ids = machines.rows.map((m) => m.id);
  const [findings, health, coverage, priorities] = await Promise.all([
    query<{ id: number; machine_id: string; type_name: string; severity_id: SeverityId; summary: string; tag: string | null; sub_name: string | null; rule_name: string | null; rule_code: string | null; action: string | null; finding_type_id: string }>(
      `SELECT f.id, f.machine_id, ft.name AS type_name, f.severity_id, f.summary, m.tag, c.subassembly_name AS sub_name,
              r.name AS rule_name, r.code AS rule_code, r.action, f.finding_type_id
         FROM findings f
         JOIN finding_types ft ON ft.id = f.finding_type_id
         LEFT JOIN measurements m ON m.id = f.measurement_id
         LEFT JOIN v_measurement_context c ON c.measurement_id = f.measurement_id
         LEFT JOIN rules r ON r.id = f.rule_id
        WHERE f.cleared_at IS NULL AND f.machine_id = ANY($1)
        ORDER BY CASE f.severity_id WHEN 'Critical' THEN 0 WHEN 'Alert' THEN 1 ELSE 2 END, f.opened_at`,
      [ids],
    ),
    machineHealthNow(ids),
    query<{ machine_id: string; total: string; valid: string }>(
      `SELECT c.machine_id, COUNT(*) AS total,
              COUNT(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM readings r JOIN quality_codes q ON q.id = r.quality_id
                 WHERE r.measurement_id = c.measurement_id AND q.usable AND r.acquired_at > NOW() - interval '10 minutes')) AS valid
         FROM v_measurement_context c WHERE c.machine_id = ANY($1) AND c.origin_id <> 'manual' GROUP BY c.machine_id`,
      [ids],
    ),
    query<{ id: string; name: string; sort_order: number }>("SELECT id, name, sort_order FROM work_order_priorities ORDER BY sort_order"),
  ]);
  const prioByRank = priorities.rows.map((p) => p.name);
  return machines.rows.map((m) => {
    const fs = findings.rows.filter((f) => f.machine_id === m.id);
    const worst: SeverityId = fs.some((f) => f.severity_id === "Critical") ? "Critical" : fs.some((f) => f.severity_id === "Alert") ? "Alert" : "Normal";
    const h = health.get(m.id);
    const cov = coverage.rows.find((c) => c.machine_id === m.id);
    const pct = cov && Number(cov.total) ? Math.round((Number(cov.valid) / Number(cov.total)) * 100) : null;
    const top = fs.find((f) => f.action) ?? null;
    // Priority follows the work-order priority table: worst severity → highest available rank.
    const priorityName = worst === "Critical" ? prioByRank[0] : worst === "Alert" ? prioByRank[Math.min(2, prioByRank.length - 1)] : prioByRank.at(-1);
    return {
      machineId: m.id,
      overallCondition: !h && !fs.length ? "No data" : worst === "Critical" ? "Critical" : worst === "Alert" ? "Alert" : "Nominal",
      confidence: pct,
      engineVersion: m.model_name ?? "ULTRON evaluation",
      summary: fs.length
        ? `${fs.length} open finding${fs.length === 1 ? "" : "s"}: ${fs.filter((f) => f.severity_id === "Critical").length} critical, ${fs.filter((f) => f.severity_id === "Alert").length} advisory. ${fs[0].summary}`
        : h
          ? "No open findings: valid measurements fit their limits and the accepted reference."
          : "No current readings: condition cannot be assessed.",
      findings: fs.map((f) => ({
        id: `F-${f.id}`,
        fault: f.rule_name ? `${f.rule_name} (${f.rule_code})` : f.type_name,
        probability: null,
        location: f.sub_name ?? "",
        frequency: f.tag ?? "",
        severity: f.severity_id,
        recommendation: f.action ?? f.summary,
      })),
      // No waveform is acquired, so no spectrum peaks exist to report.
      peakFrequencies: [],
      maintenancePriority: (priorityName ?? "") as DiagnosisRecord["maintenancePriority"],
      prescriptiveAction: top?.action ?? (fs.length ? "Review the open findings and their evidence." : ""),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

const LEGACY_TYPE: Record<string, OperatingEvent["type"]> = {
  alarm: "Telemetry Alert",
  maintenance: "Maintenance Log",
  inspection: "Inspection",
  operation: "Operating Change",
  process: "Operating Change",
  measurement: "Operating Change",
};
export const EVENT_TYPE_FROM_LEGACY: Record<OperatingEvent["type"], string> = {
  "Telemetry Alert": "telemetry_advisory",
  "Maintenance Log": "maintenance",
  "Operating Change": "operating_change",
  Inspection: "inspection",
};

export async function readOperatingEvents(machineId?: string, limit = 500): Promise<OperatingEvent[]> {
  const res = await query<{ id: number; machine_id: string; occurred_at: Date; category: string; severity_id: SeverityId; title: string; description: string | null; source: string }>(
    `SELECT e.id, e.machine_id, e.occurred_at, t.category, e.severity_id, e.title, e.description, e.source
       FROM machine_events e JOIN event_types t ON t.id = e.event_type_id
      WHERE ($1::varchar IS NULL OR e.machine_id = $1)
      ORDER BY e.occurred_at DESC, e.id DESC LIMIT $2`,
    [machineId ?? null, limit],
  );
  return res.rows.map((r) => ({
    id: `EVT-${r.id}`,
    machineId: r.machine_id,
    timestamp: r.occurred_at.toISOString(),
    type: LEGACY_TYPE[r.category] ?? "Operating Change",
    severity: r.severity_id,
    title: r.title,
    description: r.description ?? "",
    source: r.source,
  }));
}
