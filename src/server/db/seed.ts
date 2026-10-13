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
import { buildRacksFromSignals, type RackSignalRow } from "@/components/assets/rack-data";
import type { PoolClient } from "pg";
import { FLEET_CARDS, FLEET_RACKS, FLEET_SENSOR_SPECS } from "./seed-data/fleet-sensor-specs";
import { FLEET_DIAGNOSIS_RECORDS, buildTrendRecord, type TrendSignalRow } from "./seed-data/fleet-history";
import { applyKilnFleet } from "./kiln-fleet";
import { KILN_FLEET_IDS } from "@/lib/kiln-sim/fleet";

/**
 * Writes the non-kiln limits, sub-assembly mapping, acquisition mapping and
 * failure modes from FLEET_SENSOR_SPECS onto mapped_signals, and each
 * sub-assembly's sensor_tags. Idempotent; KLN-01 is not touched.
 */
export async function applyFleetSensorSpecs(client: PoolClient): Promise<number> {
  let updated = 0;
  const pointCounter = new Map<string, number>();
  const channelCounter = new Map<string, number>();
  const tagsByPart = new Map<string, string[]>();
  for (const spec of FLEET_SENSOR_SPECS) {
    const partKey = `${spec.machineId}|${spec.part}`;
    const point = (pointCounter.get(partKey) ?? 0) + 1;
    pointCounter.set(partKey, point);
    tagsByPart.set(partKey, [...(tagsByPart.get(partKey) ?? []), spec.tag]);
    const card = FLEET_CARDS[spec.card];
    const chKey = `${spec.machineId}|${spec.card}`;
    const channel = channelCounter.get(chKey) ?? 0;
    channelCounter.set(chKey, channel + 1);
    const rack = FLEET_RACKS[spec.machineId];
    const res = await client.query(
      `UPDATE mapped_signals m SET
         system_id = $3, subassembly_id = $3, sub_assembly = sa.name, point = $4,
         unit = COALESCE($5, m.unit),
         current_value = CASE WHEN $5::text IS NOT NULL THEN regexp_replace(m.current_value, '[^0-9.\-]', '', 'g') ELSE m.current_value END,
         instrument = $6, sensor_type = $7, range_val = $8,
         nominal_band = $9, normal_threshold = $10,
         warning_val = $11, alarm_val = $12, warning_threshold = $13, alarm_threshold = $14,
         standard = $15, sample_rate = $16,
         edge_rack = $17, card_slot = $18, modbus_address = $19,
         reasons = $20::jsonb
       FROM machine_subassemblies sa
       WHERE m.machine_id = $1 AND m.tag = $2 AND sa.machine_id = m.machine_id AND sa.subassembly_id = $3`,
      [
        spec.machineId,
        spec.tag,
        spec.part,
        `P${point}`,
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
        rack,
        card.card,
        String(card.base + channel),
        JSON.stringify(spec.reasons),
      ]
    );
    updated += res.rowCount ?? 0;
  }
  for (const [key, tags] of tagsByPart) {
    const [machineId, part] = key.split("|");
    await client.query(
      "UPDATE machine_subassemblies SET sensor_tags = $3::jsonb WHERE machine_id = $1 AND subassembly_id = $2",
      [machineId, part, JSON.stringify(tags)]
    );
  }
  return updated;
}

/**
 * Trend history and diagnosis records for the non-kiln machines. Trends are
 * rebuilt from each sensor's current mapped_signals row (one record per
 * numeric sensor); diagnosis records come from FLEET_DIAGNOSIS_RECORDS and
 * replace that machine's stored record. Idempotent; the live kilns
 * (KILN_FLEET) are not touched.
 */
export async function applyFleetHistory(client: PoolClient): Promise<{ trends: number; diagnoses: number }> {
  const signals = await client.query<TrendSignalRow>(
    `SELECT machine_id, tag, name, unit, numeric_value, warning_val, alarm_val, nominal_band, sensor_type, status
       FROM mapped_signals
      WHERE machine_id <> ALL($1) AND lower(unit) <> 'state'
      ORDER BY machine_id, tag`,
    [[...KILN_FLEET_IDS]]
  );
  await client.query("DELETE FROM trend_records WHERE machine_id <> ALL($1)", [[...KILN_FLEET_IDS]]);
  let trends = 0;
  for (const row of signals.rows) {
    const t = buildTrendRecord(row);
    await client.query(
      `INSERT INTO trend_records (machine_id, metric_key, label, unit, baseline, advisory_limit, critical_limit, points, stats)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [t.machineId, t.metricKey, t.label, t.unit, t.baseline, t.advisoryLimit, t.criticalLimit, JSON.stringify(t.points), JSON.stringify(t.stats)]
    );
    // The sensor's baseline is its pre-drift (healthy) level, not the current reading.
    await client.query("UPDATE mapped_signals SET default_baseline = $3 WHERE machine_id = $1 AND tag = $2", [t.machineId, t.metricKey, t.baseline]);
    trends++;
  }
  let diagnoses = 0;
  for (const d of FLEET_DIAGNOSIS_RECORDS) {
    const exists = await client.query("SELECT 1 FROM machines WHERE id = $1", [d.machineId]);
    if (!exists.rowCount) continue;
    await client.query("DELETE FROM diagnosis_records WHERE machine_id = $1", [d.machineId]);
    await client.query(
      `INSERT INTO diagnosis_records (
         machine_id, overall_condition, confidence, engine_version, summary,
         findings, peak_frequencies, maintenance_priority, prescriptive_action
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [d.machineId, d.overallCondition, d.confidence, d.engineVersion, d.summary, JSON.stringify(d.findings), JSON.stringify(d.peakFrequencies), d.maintenancePriority, d.prescriptiveAction]
    );
    diagnoses++;
  }
  return { trends, diagnoses };
}

/**
 * Regenerates machine_rack_units for every machine from its mapped_signals
 * rows (edge_rack / card_slot) as chassis → card → channel. Idempotent: a
 * machine's old rack rows are replaced. Returns the number of rack rows written.
 */
export async function rebuildRackUnitsFromSignals(client: PoolClient): Promise<number> {
  const machines = await client.query<{ id: string; name: string }>(
    "SELECT id, name FROM machines ORDER BY id"
  );
  let written = 0;
  for (const m of machines.rows) {
    const signals = await client.query<RackSignalRow>(
      `SELECT tag, name, instrument, sensor_type, edge_rack, card_slot, modbus_address,
              current_value, unit, quality, sample_rate, status, normal_threshold, component
         FROM mapped_signals WHERE machine_id = $1`,
      [m.id]
    );
    const racks = buildRacksFromSignals(m, signals.rows);
    await client.query("DELETE FROM machine_rack_units WHERE machine_id = $1", [m.id]);
    for (const rack of racks) {
      await client.query(
        `INSERT INTO machine_rack_units (machine_id, rack_id, rack_number, payload)
         VALUES ($1, $2, $3, $4)`,
        [m.id, rack.rackId, rack.rackNumber, JSON.stringify(rack)]
      );
      written++;
    }
  }
  return written;
}

export async function seedDatabase(): Promise<{
  success: boolean;
  counts: Record<string, number>;
  message: string;
}> {
  const client = await pool.connect();
  const counts: Record<string, number> = {};

  try {
    await client.query("BEGIN");

    // 1. Ensure Schema is Initialized
    await initDatabase();

    // 2. Clear Existing Data for Clean Seed
    await client.query("TRUNCATE TABLE process_stages CASCADE");
    await client.query("TRUNCATE TABLE machine_rack_units CASCADE");
    await client.query("TRUNCATE TABLE sap_equipment_records CASCADE");
    await client.query("TRUNCATE TABLE rack_slots CASCADE");
    await client.query("TRUNCATE TABLE rack_chassis CASCADE");
    await client.query("TRUNCATE TABLE operating_events CASCADE");
    await client.query("TRUNCATE TABLE trend_records CASCADE");
    await client.query("TRUNCATE TABLE diagnosis_records CASCADE");
    await client.query("TRUNCATE TABLE mapped_signals CASCADE");
    await client.query("TRUNCATE TABLE machine_hotspots CASCADE");
    await client.query("TRUNCATE TABLE machine_subassemblies CASCADE");
    await client.query("TRUNCATE TABLE machine_systems CASCADE");
    await client.query("TRUNCATE TABLE machine_parts CASCADE");
    await client.query("TRUNCATE TABLE machines CASCADE");
    await client.query("TRUNCATE TABLE hierarchy_nodes CASCADE");

    // 3. Seed Hierarchy Nodes (Recursive Tree)
    let hierarchyCount = 0;
    async function insertHierarchyNode(node: HierarchyNode, parentId: string | null = null, sortOrder: number = 0) {
      await client.query(
        `INSERT INTO hierarchy_nodes (id, name, type, parent_id, machine_id, status, health, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           parent_id = EXCLUDED.parent_id,
           machine_id = EXCLUDED.machine_id,
           status = EXCLUDED.status,
           health = EXCLUDED.health,
           sort_order = EXCLUDED.sort_order`,
        [
          node.id,
          node.name,
          node.type,
          parentId,
          node.machineId || null,
          node.status || null,
          node.health || null,
          sortOrder,
        ]
      );
      hierarchyCount++;

      if (node.children && node.children.length > 0) {
        for (let i = 0; i < node.children.length; i++) {
          await insertHierarchyNode(node.children[i], node.id, i);
        }
      }
    }

    for (let i = 0; i < PLANT_HIERARCHY.length; i++) {
      await insertHierarchyNode(PLANT_HIERARCHY[i], null, i);
    }
    counts.hierarchy_nodes = hierarchyCount;

    // 4. Seed Machines, Parts/Systems, Sub-assemblies, and Hotspots
    // Canonical rule: machines.signals_count == hotspots count == mapped_signals count.
    // KLN-01 canonical = 46 sensors / 4 systems / 15 sub-assemblies (seed-data/kiln.ts).
    let machineCount = 0;
    let partsCount = 0;
    let systemsCount = 0;
    let subassembliesCount = 0;
    let hotspotsCount = 0;

    for (const m of ASSET_MACHINES) {
      const isKiln = m.id === "KLN-01";
      // Canonical signals count: 46 for kiln, hotspots length for others.
      const canonicalSignalsCount = isKiln ? KLN_SENSORS.length : m.hotspots.length;
      await client.query(
        `INSERT INTO machines (
          id, name, area, process_cell, type, manufacturer, model, serial_number,
          commissioned, location, coordinates, power_rating, operating_speed, criticality,
          status, health, sap_equipment_id, floc, cost_center, plant, work_center,
          active_work_order, signals_count, diagram_type
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        )`,
        [
          m.id,
          m.name,
          m.area,
          m.processCell,
          m.type,
          m.manufacturer,
          m.model,
          m.serialNumber,
          m.commissioned,
          m.location,
          m.coordinates,
          m.powerRating,
          m.operatingSpeed,
          m.criticality,
          m.status,
          m.health,
          m.sapEquipmentId,
          m.floc,
          m.costCenter,
          m.plant,
          m.workCenter,
          m.activeWorkOrder || null,
          canonicalSignalsCount,
          m.diagramType,
        ]
      );
      machineCount++;

      // Parts (Overview boxes). For KLN-01 these mirror KLN_SYSTEMS (4).
      const partsToSeed = isKiln
        ? KLN_SYSTEMS.map((s, idx) => ({
            id: `P${idx + 1}`,
            name: s.name,
            health: s.health,
            status: s.status,
            bbox: s.bbox,
          }))
        : m.parts;
      if (partsToSeed && partsToSeed.length > 0) {
        for (const part of partsToSeed) {
          await client.query(
            `INSERT INTO machine_parts (machine_id, part_id, name, health, status, bbox, critical_notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              m.id,
              (part as { id: string }).id,
              (part as { name: string }).name,
              (part as { health: number }).health,
              (part as { status: string }).status,
              JSON.stringify((part as { bbox: unknown }).bbox),
              (part as { criticalNotes?: string }).criticalNotes || null,
            ]
          );
          partsCount++;
        }
      }

      // Systems (4 for kiln; 1:1 with parts for non-kiln so Overview == Health)
      if (isKiln) {
        for (const sys of KLN_SYSTEMS) {
          await client.query(
            `INSERT INTO machine_systems (id, machine_id, system_id, name, short_name, health, status, bbox)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, health = EXCLUDED.health, status = EXCLUDED.status, bbox = EXCLUDED.bbox`,
            [
              `${m.id}-${sys.id}`,
              m.id,
              sys.id,
              sys.name,
              sys.shortName,
              sys.health,
              sys.status,
              JSON.stringify(sys.bbox),
            ]
          );
          systemsCount++;
        }
        for (const sa of KLN_SUBASSEMBLIES) {
          await client.query(
            `INSERT INTO machine_subassemblies (id, machine_id, system_id, subassembly_id, name, short_name, health, status, criticality, sensor_tags)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, health = EXCLUDED.health, status = EXCLUDED.status, sensor_tags = EXCLUDED.sensor_tags`,
            [
              `${m.id}-${sa.id}`,
              m.id,
              sa.systemId,
              sa.id,
              sa.name,
              sa.shortName,
              sa.health,
              sa.status,
              sa.criticality,
              JSON.stringify(sa.sensorTags),
            ]
          );
          subassembliesCount++;
        }
      } else {
        // Non-kiln: each part is both a system and a sub-assembly (keeps counts identical everywhere).
        for (const part of m.parts) {
          await client.query(
            `INSERT INTO machine_systems (id, machine_id, system_id, name, short_name, health, status, bbox)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING`,
            [
              `${m.id}-${part.id}`,
              m.id,
              part.id,
              part.name,
              part.name,
              part.health,
              part.status,
              JSON.stringify(part.bbox),
            ]
          );
          systemsCount++;
          await client.query(
            `INSERT INTO machine_subassemblies (id, machine_id, system_id, subassembly_id, name, short_name, health, status, criticality, sensor_tags)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO NOTHING`,
            [
              `${m.id}-${part.id}-sa`,
              m.id,
              part.id,
              part.id,
              part.name,
              part.name,
              part.health,
              part.status,
              "A",
              JSON.stringify([]),
            ]
          );
          subassembliesCount++;
        }
      }

      // Hotspots — canonical sensor geometry (46 for kiln)
      if (m.hotspots && m.hotspots.length > 0) {
        for (const hs of m.hotspots) {
          await client.query(
            `INSERT INTO machine_hotspots (machine_id, hotspot_id, label, parameter, value, unit, status, x, y, component)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              m.id,
              hs.id,
              hs.label,
              hs.parameter,
              hs.value,
              hs.unit,
              hs.status,
              hs.x,
              hs.y,
              hs.component,
            ]
          );
          hotspotsCount++;
        }
      }
    }
    counts.machines = machineCount;
    counts.machine_parts = partsCount;
    counts.machine_systems = systemsCount;
    counts.machine_subassemblies = subassembliesCount;
    counts.machine_hotspots = hotspotsCount;

    // 5. Seed Mapped Signals — SINGLE canonical source (seed-data/kiln.ts).
    // KLN-01 gets exactly 46 rows (one per canonical sensor). No abbreviated duplicates.
    // Other machines get one row per hotspot so signals == hotspots == signals_count.
    let signalsCount = 0;
    for (const s of KLN_SENSORS) {
      const diag = getDiagnosticsForSensor(s.tag);
      await client.query(
        `INSERT INTO mapped_signals (
          id, machine_id, tag, name, instrument, sensor_type, edge_rack, card_slot,
          modbus_address, current_value, unit, quality, sample_rate, status,
          position, system_id, subassembly_id, sub_assembly, source, priority, accuracy, range_val,
          normal_threshold, warning_threshold, alarm_threshold,
          numeric_value, warning_val, alarm_val, max_scale,
          nominal_band, standard, default_baseline, reasons, x, y, component, point
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37
        ) ON CONFLICT (id) DO UPDATE SET
          current_value = EXCLUDED.current_value,
          status = EXCLUDED.status,
          numeric_value = EXCLUDED.numeric_value,
          reasons = EXCLUDED.reasons,
          point = EXCLUDED.point`,
        [
          `KLN-01-${s.tag}`,
          "KLN-01",
          s.tag,
          s.name,
          s.instrument,
          s.sensorType,
          s.rackId,
          s.cardId,
          s.modbusAddress,
          s.value,
          s.unit,
          "100% Good",
          s.sampleRate,
          s.status,
          s.position,
          s.systemId,
          s.subassemblyId,
          s.subassemblyName,
          s.source,
          s.priority,
          s.accuracy,
          s.range,
          s.normalThreshold,
          s.warningThreshold,
          s.alarmThreshold,
          s.numericValue,
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
        ]
      );
      signalsCount++;
    }
    // Non-kiln machines: one mapped_signal per hotspot (keeps DB == UI everywhere)
    for (const m of ASSET_MACHINES) {
      if (m.id === "KLN-01") continue;
      for (const hs of m.hotspots) {
        const num = parseFloat(hs.value) || 0;
        const isTemp = hs.unit.includes("°C");
        await client.query(
          `INSERT INTO mapped_signals (
            id, machine_id, tag, name, instrument, sensor_type, edge_rack, card_slot,
            modbus_address, current_value, unit, quality, sample_rate, status,
            position, system_id, subassembly_id, sub_assembly, source, priority, accuracy, range_val,
            normal_threshold, warning_threshold, alarm_threshold,
            numeric_value, warning_val, alarm_val, max_scale,
            nominal_band, standard, default_baseline, reasons, x, y, component
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36
          ) ON CONFLICT (id) DO NOTHING`,
          [
            `${m.id}-${hs.parameter || hs.id}`,
            m.id,
            hs.parameter || hs.id,
            hs.label,
            isTemp ? "Duplex PT100 RTD Class A" : "Industrial Sensor",
            isTemp ? "Temperature RTD" : "General Sensor",
            "ULTRON-G4-01",
            "Slot 2 (VIB-8)",
            "40001 (Float32)",
            hs.value,
            hs.unit,
            "100% Good",
            isTemp ? "1 Hz" : "25.6 kHz",
            hs.status,
            `${hs.component} · Physical Instrument Location`,
            m.parts[0]?.id ?? "P1",
            m.parts[0]?.id ?? "P1",
            m.parts[0]?.name ?? m.name,
            "Existing",
            "Required",
            "±0.5%",
            "Standard",
            "Nominal",
            "Warning",
            "Alarm",
            num,
            0,
            0,
            100,
            `Nominal ${hs.value} ${hs.unit}`,
            "Asset Baseline",
            num,
            JSON.stringify([]),
            hs.x,
            hs.y,
            hs.component,
          ]
        );
        signalsCount++;
      }
    }
    counts.mapped_signals = signalsCount;
    // Limits, sub-assembly / acquisition mapping and failure modes for non-kiln machines.
    counts.fleet_sensor_specs = await applyFleetSensorSpecs(client);

    // 5b. Seed Process Stages (sequential material/thermal conversion flow)
    let processStagesCount = 0;
    for (const m of ASSET_MACHINES) {
      const stages = getMachineProcesses(m);
      for (const stage of stages) {
        await client.query(
          `INSERT INTO process_stages (
            machine_id, stage_id, step_number, name, role, subtitle, status, efficiency,
            health_notes, transformation, associated_parts, inputs, outputs, parameters
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
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
          ]
        );
        processStagesCount++;
      }
    }
    counts.process_stages = processStagesCount;

    // 5c. Rack units: every machine's cabinet model regenerated from its
    // mapped_signals rows. Machines with edge registry points (KLN-01) are
    // served from the registry at read time; this stays their fallback.
    const rackUnitsCount = await rebuildRackUnitsFromSignals(client);
    counts.machine_rack_units = rackUnitsCount;

    // 6. Seed Diagnosis Records
    let diagnosisCount = 0;
    for (const diag of DIAGNOSIS_RECORDS) {
      if (!ASSET_MACHINES.some((m) => m.id === diag.machineId)) continue;
      await client.query(
        `INSERT INTO diagnosis_records (
          machine_id, overall_condition, confidence, engine_version, summary,
          findings, peak_frequencies, maintenance_priority, prescriptive_action
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          diag.machineId,
          diag.overallCondition,
          diag.confidence,
          diag.engineVersion,
          diag.summary,
          JSON.stringify(diag.findings),
          JSON.stringify(diag.peakFrequencies),
          diag.maintenancePriority,
          diag.prescriptiveAction,
        ]
      );
      diagnosisCount++;
    }
    counts.diagnosis_records = diagnosisCount;

    // 7. Seed Trend Records
    let trendsCount = 0;
    for (const tr of TREND_RECORDS) {
      if (!ASSET_MACHINES.some((m) => m.id === tr.machineId)) continue;
      for (const m of tr.metrics) {
        await client.query(
          `INSERT INTO trend_records (
            machine_id, metric_key, label, unit, baseline, advisory_limit, critical_limit, points, stats
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            tr.machineId,
            m.key,
            m.label,
            m.unit,
            m.baseline,
            m.advisoryLimit,
            m.criticalLimit,
            JSON.stringify(m.points),
            JSON.stringify(m.stats),
          ]
        );
        trendsCount++;
      }
    }
    counts.trend_records = trendsCount;
    // Non-kiln trend history (from each sensor's DB row) and diagnosis records.
    const fleetHistory = await applyFleetHistory(client);
    counts.fleet_trend_records = fleetHistory.trends;
    counts.fleet_diagnosis_records = fleetHistory.diagnoses;

    // 8. Seed Operating Events
    let eventsCount = 0;
    for (const evt of OPERATING_EVENTS) {
      if (!ASSET_MACHINES.some((m) => m.id === evt.machineId)) continue;
      await client.query(
        `INSERT INTO operating_events (id, machine_id, timestamp, type, severity, title, description, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          evt.id,
          evt.machineId,
          evt.timestamp,
          evt.type,
          evt.severity,
          evt.title,
          evt.description,
          evt.source,
        ]
      );
      eventsCount++;
    }
    counts.operating_events = eventsCount;

    // 9. Seed Rack Chassis & Slots
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
        ]
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
          ]
        );
        rackSlotsCount++;
      }
    }
    counts.rack_chassis = racksCount;
    counts.rack_slots = rackSlotsCount;

    // 10. Seed SAP Equipment Records
    let sapCount = 0;
    for (const sap of SAP_EQUIPMENT_RECORDS) {
      if (!ASSET_MACHINES.some((m) => m.id === sap.machineId)) continue;
      await client.query(
        `INSERT INTO sap_equipment_records (
          sap_number, machine_id, floc, description, plant, work_center, cost_center,
          active_work_order, next_scheduled_pm, sync_state
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (sap_number) DO NOTHING`,
        [
          sap.sapNumber,
          sap.machineId,
          sap.floc,
          sap.description,
          sap.plant,
          sap.workCenter,
          sap.costCenter,
          sap.activeWorkOrder || null,
          sap.nextScheduledPm,
          sap.syncState,
        ]
      );
      sapCount++;
    }
    counts.sap_equipment_records = sapCount;

    // 11. Kiln fleet: KLN-02 / KLN-03 built from KLN-01.
    const fleet = await applyKilnFleet(client);
    counts.kiln_fleet_rows = fleet.rows;

    await client.query("COMMIT");
    return {
      success: true,
      counts,
      message: `Database successfully seeded with ${machineCount} machines, ${signalsCount} signals, ${eventsCount} events, and ${diagnosisCount} diagnoses.`,
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
