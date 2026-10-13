import type { PoolClient } from "pg";
import { KILN_FLEET_IDS } from "@/lib/kiln-sim/fleet";

/**
 * The kiln fleet in the database: KLN-02 and KLN-03 are built from KLN-01's
 * catalog (46 sensors, 4 systems, 15 sub-assemblies, process stages, rack,
 * SAP record, stored history). Each copy gets its own identity — name, serial,
 * SAP / FLOC numbers, bay, cabinet address — and its own hierarchy group under
 * the kiln area. Sensor tags (GAS-KLN-01 …) are the kiln's channel names, not
 * the machine id, so they stay as they are.
 *
 * Edge registry rows (gateways / sources / points) are not cloned: like the
 * rest of the fleet, the new kilns' acquisition is connected from Devices.
 */

const SOURCE_ID = "KLN-01";

interface KilnIdentity {
  id: string;
  /** Hierarchy sort order inside the kiln area. */
  order: number;
  bay: number;
  serial: string;
  sapEquipmentId: string;
  sapNumber: string;
  ip: string;
  activeWorkOrder: string;
  sapWorkOrder: string;
  commissioned: string;
  /** Stored (offline) status; the live engine overrides it while the app runs. */
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

async function insertRow(client: PoolClient, table: string, row: Row, jsonCols: Set<string>) {
  const cols = Object.keys(row);
  await client.query(
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((c, i) => (jsonCols.has(c) ? `$${i + 1}::jsonb` : `$${i + 1}`)).join(", ")})`,
    cols.map((c) => (jsonCols.has(c) && row[c] !== null ? JSON.stringify(row[c]) : row[c])),
  );
}

async function jsonColumns(client: PoolClient, table: string): Promise<Set<string>> {
  const res = await client.query<{ column_name: string }>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND data_type IN ('json', 'jsonb')",
    [table],
  );
  return new Set(res.rows.map((r) => r.column_name));
}

/** Tables copied row by row; `omit` lists generated columns (serial ids, timestamps). */
const MACHINE_TABLES: Array<{ table: string; omit: string[] }> = [
  { table: "machine_parts", omit: ["id"] },
  { table: "machine_systems", omit: [] },
  { table: "machine_subassemblies", omit: [] },
  { table: "machine_hotspots", omit: ["id"] },
  { table: "mapped_signals", omit: [] },
  { table: "process_stages", omit: ["id"] },
  { table: "diagnosis_records", omit: ["id"] },
  { table: "trend_records", omit: ["id"] },
  { table: "operating_events", omit: ["created_at"] },
  { table: "rack_chassis", omit: [] },
  { table: "machine_rack_units", omit: ["id"] },
  { table: "sap_equipment_records", omit: [] },
];

/** Idempotent: removes and rebuilds KLN-02 / KLN-03 from KLN-01. Needs KLN-01 in the DB. */
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
  for (const k of NEW_KILNS) {
    if (!KILN_FLEET_IDS.has(k.id)) continue;
    const rename = renamer(k.id, k.bay);

    // Machine
    const m: Row = {};
    for (const [c, v] of Object.entries(source.rows[0] as Row)) {
      if (c === "created_at" || c === "updated_at") continue;
      m[c] = rename(v);
    }
    Object.assign(m, {
      id: k.id,
      serial_number: k.serial,
      sap_equipment_id: k.sapEquipmentId,
      commissioned: k.commissioned,
      active_work_order: k.activeWorkOrder || null,
      status: k.status,
      health: k.health,
    });
    await insertRow(client, "machines", m, await jsonColumns(client, "machines"));
    rows++;

    // Hierarchy: its own "Rotary Kiln System (KLN-0x)" group beside KLN-01's.
    if (sourceNode.rowCount && sourceGroup?.rowCount) {
      const g = sourceGroup.rows[0] as Row;
      const groupId = `${String(g.id)}-${k.id.toLowerCase()}`;
      await client.query(
        `INSERT INTO hierarchy_nodes (id, name, type, parent_id, machine_id, status, health, sort_order)
         VALUES ($1, $2, $3, $4, NULL, $5, $6, $7)`,
        [groupId, rename(g.name), g.type, g.parent_id, g.status, g.health, Number(g.sort_order ?? 0) + k.order],
      );
      const n = sourceNode.rows[0] as Row;
      await client.query(
        `INSERT INTO hierarchy_nodes (id, name, type, parent_id, machine_id, status, health, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
        [rename(n.id), rename(n.name), n.type, groupId, k.id, k.status, k.health],
      );
      rows += 2;
    }

    for (const { table, omit } of MACHINE_TABLES) {
      const json = await jsonColumns(client, table);
      const src = await client.query(`SELECT * FROM ${table} WHERE machine_id = $1`, [SOURCE_ID]);
      for (const r of src.rows as Row[]) {
        const out: Row = {};
        for (const [c, v] of Object.entries(r)) if (!omit.includes(c)) out[c] = rename(v);
        out.machine_id = k.id;
        if (table === "operating_events") out.id = `${String(r.id)}-${k.id.replace("-", "")}`;
        if (table === "sap_equipment_records") {
          out.sap_number = k.sapNumber;
          out.active_work_order = k.sapWorkOrder || null;
        }
        if (table === "rack_chassis") out.ip_address = k.ip;
        await insertRow(client, table, out, json);
        rows++;
      }
    }

    // Rack slots hang off the chassis id, not the machine.
    const json = await jsonColumns(client, "rack_slots");
    const slots = await client.query(
      "SELECT s.* FROM rack_slots s JOIN rack_chassis c ON c.id = s.rack_id WHERE c.machine_id = $1",
      [SOURCE_ID],
    );
    for (const r of slots.rows as Row[]) {
      const out: Row = {};
      for (const [c, v] of Object.entries(r)) if (c !== "id") out[c] = rename(v);
      await insertRow(client, "rack_slots", out, json);
      rows++;
    }
  }
  return { machines: ids.length, rows };
}

async function removeKilns(client: PoolClient, ids: string[]) {
  if (ids.length === 0) return;
  await client.query("DELETE FROM rack_slots WHERE rack_id IN (SELECT id FROM rack_chassis WHERE machine_id = ANY($1))", [ids]);
  for (const { table } of [...MACHINE_TABLES].reverse()) await client.query(`DELETE FROM ${table} WHERE machine_id = ANY($1)`, [ids]);
  const nodes = await client.query<{ id: string; parent_id: string | null }>(
    "SELECT id, parent_id FROM hierarchy_nodes WHERE machine_id = ANY($1)",
    [ids],
  );
  await client.query("DELETE FROM hierarchy_nodes WHERE machine_id = ANY($1)", [ids]);
  const groups = nodes.rows.map((n) => n.parent_id).filter((p): p is string => Boolean(p));
  // A group made for a cloned kiln goes with it once it is empty.
  if (groups.length) {
    await client.query(
      "DELETE FROM hierarchy_nodes h WHERE h.id = ANY($1) AND NOT EXISTS (SELECT 1 FROM hierarchy_nodes c WHERE c.parent_id = h.id)",
      [groups],
    );
  }
  await client.query("DELETE FROM machines WHERE id = ANY($1)", [ids]);
}
