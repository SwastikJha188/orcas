import type { PoolClient } from "pg";
import { KILN_FLEET_IDS } from "@/lib/kiln-sim/fleet";

/**
 * The kiln fleet in the 3NF database: KLN-02 and KLN-03 are cloned from KLN-01's
 * normalized records (4 systems, 15 sub-assemblies, 46 mapped_signals pointing to
 * KLN-01's shared `sensor_definitions`, process stages, rack chassis & slots,
 * SAP equipment record, diagnosis record + findings + peaks, trend records + points,
 * and operating events).
 *
 * Because `sensor_definitions` and `equipment_models` are normalized in 3NF,
 * KLN-02 and KLN-03 reuse KLN-01's `model_id` and `sensor_def_id` rows without
 * duplicating any OEM or engineering sensor metadata!
 */

const SOURCE_ID = "KLN-01";

interface KilnIdentity {
  id: string;
  order: number;
  bay: number;
  serial: string;
  sapEquipmentId: string;
  sapNumber: string;
  ip: string;
  activeWorkOrder: string;
  sapWorkOrder: string;
  commissioned: string;
  status: string;
  health: number;
}

const NEW_KILNS: KilnIdentity[] = [
  {
    id: "KLN-02",
    order: 1,
    bay: 2,
    serial: "SN-KLN-2026-SYS-02",
    sapEquipmentId: "EQ-KLN-ALL-02",
    sapNumber: "EQ-10042-A",
    ip: "10.14.22.81",
    activeWorkOrder: "WO-2026-KLN-914",
    sapWorkOrder: "WO-2026-88027",
    commissioned: "2022-03-02",
    status: "Critical",
    health: 52,
  },
  {
    id: "KLN-03",
    order: 2,
    bay: 3,
    serial: "SN-KLN-2026-SYS-03",
    sapEquipmentId: "EQ-KLN-ALL-03",
    sapNumber: "EQ-10043-A",
    ip: "10.14.22.82",
    activeWorkOrder: "",
    sapWorkOrder: "",
    commissioned: "2023-06-19",
    status: "Operational",
    health: 97,
  },
];

type Row = Record<string, unknown>;

/** Machine-id mentions only: "KLN-01" / "KLN01", never a sensor tag such as "GAS-KLN-01" or a finding id such as "F-KLN-01". */
function renamer(id: string, bay: number) {
  const compact = id.replace("-", "");
  const text = (v: string) =>
    v
      .replace(/(?<![A-Z]{3}-|\bF-)KLN-01/g, id)
      .replace(/KLN01/g, compact)
      .replace(/kln-01/g, id.toLowerCase())
      .replace(/kln01/g, compact.toLowerCase())
      .replace(/Bay 1\b/g, `Bay ${bay}`);
  const value = (v: unknown): unknown => {
    if (typeof v === "string") return text(v);
    if (v !== null && typeof v === "object" && !(v instanceof Date)) return JSON.parse(text(JSON.stringify(v)));
    return v;
  };
  return value;
}

export async function applyKilnFleet(client: PoolClient): Promise<{ machines: number; rows: number }> {
  const source = await client.query("SELECT * FROM machines WHERE id = $1", [SOURCE_ID]);
  if (!source.rowCount) return { machines: 0, rows: 0 };

  const sourceNode = await client.query("SELECT * FROM hierarchy_nodes WHERE machine_id = $1", [SOURCE_ID]);
  const sourceGroup = sourceNode.rowCount
    ? await client.query("SELECT * FROM hierarchy_nodes WHERE id = $1", [sourceNode.rows[0].parent_id])
    : null;

  const ids = NEW_KILNS.map((k) => k.id).filter((id) => KILN_FLEET_IDS.has(id));
  await removeKilns(client, ids);

  let rows = 0;
  const srcMachine = source.rows[0] as Row;

  for (const k of NEW_KILNS) {
    if (!KILN_FLEET_IDS.has(k.id)) continue;
    const rename = renamer(k.id, k.bay);

    // 1. Hierarchy group & machine node (created so process_node_id FK is available)
    let groupId: string | null = null;
    if (sourceNode.rowCount && sourceGroup?.rowCount) {
      const g = sourceGroup.rows[0] as Row;
      groupId = `${String(g.id)}-${k.id.toLowerCase()}`;
      await client.query(
        `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order)
         VALUES ($1, $2, $3, $4, $5, NULL, $6)`,
        [groupId, g.plant_id, g.parent_id, rename(g.name), g.type, Number(g.sort_order ?? 0) + k.order],
      );
      rows++;
    }

    // 2. Machine instance (references shared model_id and plant_id!)
    await client.query(
      `INSERT INTO machines (
         id, plant_id, process_node_id, model_id, name, serial_number,
         commissioned, bay_location, coordinates, criticality, status, health
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        k.id,
        srcMachine.plant_id,
        groupId ?? srcMachine.process_node_id,
        srcMachine.model_id,
        rename(srcMachine.name),
        k.serial,
        k.commissioned,
        rename(srcMachine.bay_location),
        srcMachine.coordinates,
        srcMachine.criticality,
        k.status,
        k.health,
      ],
    );
    rows++;

    // 3. Machine leaf node in hierarchy_nodes (with machine_id FK)
    if (sourceNode.rowCount && groupId) {
      const n = sourceNode.rows[0] as Row;
      await client.query(
        `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, 0)`,
        [rename(n.id), n.plant_id, groupId, rename(n.name), n.type, k.id],
      );
      rows++;
    }

    // 4. SAP Equipment Record (3NF)
    const sapRes = await client.query("SELECT * FROM sap_equipment_records WHERE machine_id = $1", [SOURCE_ID]);
    for (const r of sapRes.rows as Row[]) {
      await client.query(
        `INSERT INTO sap_equipment_records (
           sap_number, machine_id, sap_equipment_id, floc, description,
           work_center, cost_center, active_work_order, next_scheduled_pm, sync_state
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          k.sapNumber,
          k.id,
          k.sapEquipmentId,
          String(r.floc ?? "").replace(/KLN-01/g, k.id),
          rename(r.description),
          r.work_center,
          r.cost_center,
          k.sapWorkOrder || k.activeWorkOrder || null,
          r.next_scheduled_pm,
          r.sync_state,
        ],
      );
      rows++;
    }

    // 5. Machine Systems (3NF)
    const sysRes = await client.query("SELECT * FROM machine_systems WHERE machine_id = $1 ORDER BY sort_order", [SOURCE_ID]);
    for (const r of sysRes.rows as Row[]) {
      await client.query(
        `INSERT INTO machine_systems (
           id, machine_id, system_id, part_code, name, short_name, health, status,
           bbox_x, bbox_y, bbox_w, bbox_h, critical_notes, sort_order
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          rename(r.id),
          k.id,
          rename(r.system_id),
          r.part_code,
          rename(r.name),
          rename(r.short_name),
          r.health,
          r.status,
          r.bbox_x,
          r.bbox_y,
          r.bbox_w,
          r.bbox_h,
          r.critical_notes ? rename(r.critical_notes) : null,
          r.sort_order,
        ],
      );
      rows++;
    }

    // 6. Machine Sub-assemblies (3NF with FK to machine_systems)
    const saRes = await client.query("SELECT * FROM machine_subassemblies WHERE machine_id = $1 ORDER BY sort_order", [SOURCE_ID]);
    for (const r of saRes.rows as Row[]) {
      await client.query(
        `INSERT INTO machine_subassemblies (
           id, machine_id, machine_system_ref_id, system_id, subassembly_id,
           name, short_name, health, status, criticality, sort_order
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          rename(r.id),
          k.id,
          rename(r.machine_system_ref_id),
          rename(r.system_id),
          rename(r.subassembly_id),
          rename(r.name),
          rename(r.short_name),
          r.health,
          r.status,
          r.criticality,
          r.sort_order,
        ],
      );
      rows++;
    }

    // 7. Mapped Signals (3NF — reuses `sensor_def_id` without repeating sensor_definitions!)
    const sigRes = await client.query("SELECT * FROM mapped_signals WHERE machine_id = $1", [SOURCE_ID]);
    for (const r of sigRes.rows as Row[]) {
      await client.query(
        `INSERT INTO mapped_signals (
           id, machine_id, sensor_def_id, tag, subassembly_ref_id, edge_rack, card_slot,
           modbus_address, current_value, numeric_value, quality, status, position, default_baseline_override
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          rename(r.id),
          k.id,
          r.sensor_def_id, // Shared 3NF sensor_definitions row!
          r.tag,
          r.subassembly_ref_id ? rename(r.subassembly_ref_id) : null,
          rename(r.edge_rack),
          r.card_slot,
          r.modbus_address,
          r.current_value,
          r.numeric_value,
          r.quality,
          r.status,
          r.position ? rename(r.position) : null,
          r.default_baseline_override,
        ],
      );
      rows++;
    }

    // 8. Process Stages
    const procRes = await client.query("SELECT * FROM process_stages WHERE machine_id = $1 ORDER BY id", [SOURCE_ID]);
    for (const r of procRes.rows as Row[]) {
      await client.query(
        `INSERT INTO process_stages (
           machine_id, stage_id, step_number, name, role, subtitle, status, efficiency,
           health_notes, transformation, associated_parts, inputs, outputs, parameters
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb)`,
        [
          k.id,
          rename(r.stage_id),
          r.step_number,
          rename(r.name),
          r.role,
          r.subtitle ? rename(r.subtitle) : null,
          r.status,
          r.efficiency,
          r.health_notes ? rename(r.health_notes) : null,
          r.transformation ? rename(r.transformation) : null,
          JSON.stringify(rename(r.associated_parts)),
          JSON.stringify(rename(r.inputs)),
          JSON.stringify(rename(r.outputs)),
          JSON.stringify(rename(r.parameters)),
        ],
      );
      rows++;
    }

    // 9. Diagnosis Records + Findings + Peak Frequencies (3NF)
    const diagRes = await client.query("SELECT * FROM diagnosis_records WHERE machine_id = $1", [SOURCE_ID]);
    for (const r of diagRes.rows as Row[]) {
      const insertedDiag = await client.query<{ id: number }>(
        `INSERT INTO diagnosis_records (
           machine_id, overall_condition, confidence, engine_version, summary,
           maintenance_priority, prescriptive_action
         ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          k.id,
          r.overall_condition,
          r.confidence,
          r.engine_version,
          rename(r.summary),
          r.maintenance_priority,
          rename(r.prescriptive_action),
        ],
      );
      const newDiagId = insertedDiag.rows[0].id;
      rows++;

      const findingsRes = await client.query("SELECT * FROM diagnosis_findings WHERE diagnosis_id = $1 ORDER BY sort_order", [r.id]);
      for (const f of findingsRes.rows as Row[]) {
        await client.query(
          `INSERT INTO diagnosis_findings (
             diagnosis_id, finding_code, fault, probability, location, frequency, severity, recommendation, sort_order
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [newDiagId, f.finding_code, f.fault, f.probability, f.location, f.frequency, f.severity, f.recommendation, f.sort_order],
        );
        rows++;
      }

      const peaksRes = await client.query("SELECT * FROM diagnosis_peak_frequencies WHERE diagnosis_id = $1 ORDER BY sort_order", [r.id]);
      for (const p of peaksRes.rows as Row[]) {
        await client.query(
          `INSERT INTO diagnosis_peak_frequencies (
             diagnosis_id, name, freq, amplitude, status, sort_order
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [newDiagId, p.name, p.freq, p.amplitude, p.status, p.sort_order],
        );
        rows++;
      }
    }

    // 10. Trend Records + Trend Points (3NF)
    const trendRes = await client.query("SELECT * FROM trend_records WHERE machine_id = $1 ORDER BY id", [SOURCE_ID]);
    for (const r of trendRes.rows as Row[]) {
      const insertedTrend = await client.query<{ id: number }>(
        `INSERT INTO trend_records (
           machine_id, metric_key, label, unit, baseline, advisory_limit, critical_limit,
           stat_mean, stat_peak, stat_crest_factor, stat_kurtosis, stat_drift_30d
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        [
          k.id,
          r.metric_key,
          r.label,
          r.unit,
          r.baseline,
          r.advisory_limit,
          r.critical_limit,
          r.stat_mean,
          r.stat_peak,
          r.stat_crest_factor,
          r.stat_kurtosis,
          r.stat_drift_30d,
        ],
      );
      const newTrendId = insertedTrend.rows[0].id;
      rows++;

      const ptsRes = await client.query("SELECT * FROM trend_points WHERE trend_id = $1 ORDER BY sample_index", [r.id]);
      for (const pt of ptsRes.rows as Row[]) {
        await client.query(
          `INSERT INTO trend_points (trend_id, sample_index, time_label, value) VALUES ($1, $2, $3, $4)`,
          [newTrendId, pt.sample_index, pt.time_label, pt.value],
        );
        rows++;
      }
    }

    // 11. Operating Events
    const evtRes = await client.query("SELECT * FROM operating_events WHERE machine_id = $1", [SOURCE_ID]);
    for (const r of evtRes.rows as Row[]) {
      await client.query(
        `INSERT INTO operating_events (id, machine_id, actor_user_id, timestamp, type, severity, title, description, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          `${String(r.id)}-${k.id.replace("-", "")}`,
          k.id,
          r.actor_user_id,
          r.timestamp,
          r.type,
          r.severity,
          rename(r.title),
          rename(r.description),
          rename(r.source),
        ],
      );
      rows++;
    }

    // 12. Rack Chassis & Slots
    const chassisRes = await client.query("SELECT * FROM rack_chassis WHERE machine_id = $1", [SOURCE_ID]);
    for (const r of chassisRes.rows as Row[]) {
      const newRackId = String(rename(r.id)).replace(/KLN-01/g, k.id);
      await client.query(
        `INSERT INTO rack_chassis (
           id, machine_id, name, cabinet_location, ip_address, protocol, firmware, uptime, psu_status, packet_loss, latency
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          newRackId,
          k.id,
          String(rename(r.name)).replace(/KLN-01/g, k.id),
          String(rename(r.cabinet_location)).replace(/KLN-01/g, k.id),
          k.ip,
          r.protocol,
          r.firmware,
          r.uptime,
          r.psu_status,
          r.packet_loss,
          r.latency,
        ],
      );
      rows++;

      const slotsRes = await client.query("SELECT * FROM rack_slots WHERE rack_id = $1 ORDER BY slot_number", [r.id]);
      for (const s of slotsRes.rows as Row[]) {
        await client.query(
          `INSERT INTO rack_slots (
             rack_id, slot_number, card_model, module_type, channel_count, connected_probes, sample_rate, sync_state
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            newRackId,
            s.slot_number,
            s.card_model,
            s.module_type,
            s.channel_count,
            s.connected_probes,
            s.sample_rate,
            s.sync_state,
          ],
        );
        rows++;
      }
    }
  }

  return { machines: ids.length, rows };
}

async function removeKilns(client: PoolClient, ids: string[]) {
  if (!ids.length) return;
  const nodes = await client.query<{ parent_id: string | null }>(
    "SELECT parent_id FROM hierarchy_nodes WHERE machine_id = ANY($1)",
    [ids],
  );
  const groupIds = nodes.rows.map((r) => r.parent_id).filter((id): id is string => Boolean(id));
  // Because of ON DELETE CASCADE on machines(id), deleting from machines automatically cleans up all child tables!
  await client.query("DELETE FROM hierarchy_nodes WHERE machine_id = ANY($1)", [ids]);
  if (groupIds.length) {
    await client.query(
      "DELETE FROM hierarchy_nodes WHERE id = ANY($1) AND NOT EXISTS (SELECT 1 FROM hierarchy_nodes c WHERE c.parent_id = hierarchy_nodes.id)",
      [groupIds],
    );
  }
  await client.query("DELETE FROM machines WHERE id = ANY($1)", [ids]);
}
