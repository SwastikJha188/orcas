/**
 * Loads the reference fixture (backend/src/db/fixtures, exported from a
 * database by scripts/db-export-fixture.mjs) into an empty or reset database.
 *
 * Every table of the fixture is emptied with the application's runtime tables,
 * then filled in foreign-key order. Columns the manifest lists as deferred
 * (references into a later table or into the same table) are written after all
 * rows exist. Identity sequences continue after the loaded ids.
 */
import fs from "fs";
import path from "path";
import pool, { invalidateReadCache } from "./index";
import { isEmptyDatabase, runMigrations } from "./migrate";
import { BACKEND_DIR } from "@backend/paths";

interface ManifestTable {
  name: string;
  columns: string[];
  primaryKey: string[];
  deferred: string[];
  rows: number;
  file: string;
}

interface Manifest {
  exportedAt: string;
  migrations: string[];
  tables: ManifestTable[];
}

const DIR = path.join(BACKEND_DIR, "src/db/fixtures");

/** Runtime history that a reset clears (it refers to fixture rows). */
const RUNTIME_TABLES = [
  "readings",
  "reading_hourly",
  "investigation_entries",
  "finding_acknowledgements",
  "findings",
  "machine_events",
  "machine_state_periods",
  "machine_health_scores",
  "subassembly_health_scores",
  "plant_state",
  "user_sessions",
  "maintenance_events",
  "maintenance_wo_stages",
  "maintenance_records",
  "maintenance_custom_tasks",
  "maintenance_removed_tasks",
  "maintenance_plan_states",
  "alert_checks",
  "component_service_events",
  "maintenance_job_sources",
  "work_orders",
  "sap_sim_measurement_documents",
  "sap_sim_measuring_points",
  "sap_sim_production_orders",
  "sap_sim_order_components",
  "sap_sim_orders",
  "sap_sim_notifications",
  "sap_sim_stock_movements",
  "sap_sim_stock",
  "sap_sim_bom",
  "sap_sim_materials",
  "sap_sim_equipment",
  "sap_sim_systems",
  "sap_outbox",
  "sap_audit_log",
  "sap_sync_run_resources",
  "sap_sync_runs",
  "sap_object_cache",
  "sap_connection_paths",
  "sap_connections",
];

const ident = (s: string) => `"${s.replace(/"/g, '""')}"`;

function readManifest(): Manifest {
  return JSON.parse(fs.readFileSync(path.join(DIR, "manifest.json"), "utf8")) as Manifest;
}

export interface SeedResult {
  success: true;
  tables: number;
  rows: number;
  fixture: string;
}

/** Brings the schema up to date and (re)loads the fixture. An empty database gets the fixture as part of its build. */
export async function seedDatabase(): Promise<SeedResult> {
  const fresh = await isEmptyDatabase();
  await runMigrations();
  if (!fresh) return loadFixture();
  const manifest = readManifest();
  return { success: true, tables: manifest.tables.length, rows: manifest.tables.reduce((n, t) => n + t.rows, 0), fixture: manifest.exportedAt };
}

/** Empties the fixture's tables and the runtime tables, then loads the fixture (schema must be current). */
export async function loadFixture(): Promise<SeedResult> {
  const manifest = readManifest();
  const c = await pool.connect();
  let total = 0;
  try {
    await c.query("BEGIN");
    const existing = new Set(
      (await c.query<{ t: string }>("SELECT table_name AS t FROM information_schema.tables WHERE table_schema = 'public'")).rows.map((r) => r.t),
    );
    const wipe = [...RUNTIME_TABLES, ...manifest.tables.map((t) => t.name)].filter((t) => existing.has(t));
    await c.query(`TRUNCATE ${wipe.map(ident).join(", ")} RESTART IDENTITY CASCADE`);

    for (const t of manifest.tables) {
      const rows = JSON.parse(fs.readFileSync(path.join(DIR, t.file), "utf8")) as unknown[][];
      if (!rows.length) continue;
      const records = rows.map((r) => Object.fromEntries(t.columns.map((col, i) => [col, t.deferred.includes(col) ? null : r[i]])));
      for (let i = 0; i < records.length; i += 2000) {
        await c.query(
          `INSERT INTO ${ident(t.name)} (${t.columns.map(ident).join(", ")})
           SELECT ${t.columns.map(ident).join(", ")} FROM jsonb_populate_recordset(NULL::${ident(t.name)}, $1::jsonb)`,
          [JSON.stringify(records.slice(i, i + 2000))],
        );
      }
      total += rows.length;
    }

    // Deferred references, now that every row exists.
    for (const t of manifest.tables) {
      if (!t.deferred.length || !t.primaryKey.length) continue;
      const rows = JSON.parse(fs.readFileSync(path.join(DIR, t.file), "utf8")) as unknown[][];
      const cols = [...t.primaryKey, ...t.deferred];
      const records = rows
        .map((r) => Object.fromEntries(cols.map((col) => [col, r[t.columns.indexOf(col)]])))
        .filter((r) => t.deferred.some((d) => r[d] !== null && r[d] !== undefined));
      if (!records.length) continue;
      await c.query(
        `UPDATE ${ident(t.name)} AS tgt SET ${t.deferred.map((d) => `${ident(d)} = src.${ident(d)}`).join(", ")}
           FROM jsonb_populate_recordset(NULL::${ident(t.name)}, $1::jsonb) AS src
          WHERE ${t.primaryKey.map((k) => `tgt.${ident(k)} = src.${ident(k)}`).join(" AND ")}`,
        [JSON.stringify(records)],
      );
    }

    // Serial columns continue after the loaded ids.
    const serials = await c.query<{ tbl: string; col: string; seq: string }>(
      `SELECT c.relname AS tbl, a.attname AS col, pg_get_serial_sequence(quote_ident(c.relname), a.attname) AS seq
         FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid
        WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
          AND pg_get_serial_sequence(quote_ident(c.relname), a.attname) IS NOT NULL`,
    );
    const loaded = new Set(manifest.tables.map((t) => t.name));
    for (const s of serials.rows) {
      if (!loaded.has(s.tbl)) continue;
      await c.query(`SELECT setval($1, GREATEST(COALESCE((SELECT MAX(${ident(s.col)}) FROM ${ident(s.tbl)}), 0), 1), (SELECT COUNT(*) > 0 FROM ${ident(s.tbl)}))`, [s.seq]);
    }
    await c.query("COMMIT");
  } catch (err) {
    await c.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    c.release();
  }
  invalidateReadCache("all");
  return { success: true, tables: manifest.tables.length, rows: total, fixture: manifest.exportedAt };
}

/**
 * Foreign keys with rows whose reference points nowhere, as "child(cols) → parent: n".
 * Only possible after loading with triggers off (a fresh build); empty when the data is whole.
 */
export async function findDanglingReferences(): Promise<string[]> {
  const fks = await pool.query<{ child: string; parent: string; ccols: string[]; pcols: string[] }>(
    `SELECT c.conrelid::regclass::text AS child, c.confrelid::regclass::text AS parent,
            ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY k(n, i) JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.n ORDER BY k.i)::text[] AS ccols,
            ARRAY(SELECT a.attname FROM unnest(c.confkey) WITH ORDINALITY k(n, i) JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.n ORDER BY k.i)::text[] AS pcols
       FROM pg_constraint c WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace`,
  );
  if (!fks.rows.length) return [];
  const checks = fks.rows.map(
    (f, i) =>
      `SELECT ${i} AS i, COUNT(*)::int AS n FROM ${f.child} c
        WHERE ${f.ccols.map((col) => `c.${ident(col)} IS NOT NULL`).join(" AND ")}
          AND NOT EXISTS (SELECT 1 FROM ${f.parent} p WHERE ${f.ccols.map((col, k) => `p.${ident(f.pcols[k])} = c.${ident(col)}`).join(" AND ")})`,
  );
  const res = await pool.query<{ i: number; n: number }>(checks.join(" UNION ALL "));
  return res.rows.filter((r) => r.n > 0).map((r) => {
    const f = fks.rows[r.i];
    return `${f.child}(${f.ccols.join(", ")}) → ${f.parent}: ${r.n}`;
  });
}
