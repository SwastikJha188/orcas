#!/usr/bin/env node
/**
 * Exports the reference fixture: the configuration and master data a fresh
 * ULTRON database starts from (plants, users, machines, the monitoring core,
 * the edge registry, …), straight from a database, into
 * src/server/db/fixtures/. Runtime history (readings, findings, events, health
 * scores, work orders, sessions) is never exported, and secrets are blanked.
 *
 *   node --env-file=.env.local scripts/db-export-fixture.mjs
 *
 * Tables are ordered by their foreign keys; a column pointing at a table that
 * comes later (or at its own table) is listed as deferred and filled in after
 * every row exists (see src/server/db/fixture-seed.ts).
 */
import fs from "fs";
import path from "path";
import pg from "pg";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_URL or DATABASE_URL must be set");
  process.exit(1);
}
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const client = new pg.Client({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: false } });
const outDir = path.join(process.cwd(), "src/server/db/fixtures");

/** Runtime history and per-process state: never part of the fixture. */
const RUNTIME = new Set([
  "readings", "reading_hourly", "findings", "finding_acknowledgements", "investigation_entries", "machine_events",
  "machine_state_periods", "machine_health_scores", "subassembly_health_scores", "plant_state",
  "plant_runner_lease", "user_sessions", "ai_predictions", "alarm_events", "alert_acks", "work_orders", "maintenance_records",
  "maintenance_custom_tasks", "maintenance_removed_tasks", "maintenance_plan_states", "maintenance_wo_stages", "maintenance_events",
  "alert_checks", "component_service_events", "maintenance_job_sources",
  "ultron_migrations",
]);
/** Columns blanked on export (secrets). */
const BLANK = { users: ["password_hash"], edge_brokers: ["password", "client_key"] };

await client.connect();
try {
  const owned = (await client.query("SELECT version FROM ultron_migrations ORDER BY version")).rows.map((r) => r.version);
  // Tables created by the application's migrations (anything else in the schema belongs to other tools).
  const migrationSql = fs.readdirSync(path.join(process.cwd(), "src/server/db/migrations")).map((f) => fs.readFileSync(path.join(process.cwd(), "src/server/db/migrations", f), "utf8")).join("\n");
  const declared = new Set([...migrationSql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()));
  const tables = (await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`)).rows
    .map((r) => r.table_name)
    .filter((t) => declared.has(t) && !RUNTIME.has(t));

  const fks = (
    await client.query(`
      SELECT c.conrelid::regclass::text AS tbl, c.confrelid::regclass::text AS ref, a.attname AS col
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
       WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace`)
  ).rows;

  const nullable = new Set(
    (await client.query(`SELECT table_name || '.' || column_name AS k FROM information_schema.columns WHERE table_schema = 'public' AND is_nullable = 'YES'`)).rows.map((r) => r.k),
  );
  // Topological order by foreign key. NOT NULL references are hard; a cycle is
  // broken only through nullable references, which are then deferred.
  const edges = fks.filter((f) => tables.includes(f.tbl) && tables.includes(f.ref) && f.ref !== f.tbl);
  const order = [];
  const placed = new Set();
  const waived = new Set();
  const pending = (t, hardOnly) =>
    edges.filter((e) => e.tbl === t && !placed.has(e.ref) && !waived.has(`${e.tbl}.${e.col}`) && (!hardOnly || !nullable.has(`${e.tbl}.${e.col}`)));
  while (order.length < tables.length) {
    const ready = tables.filter((t) => !placed.has(t) && pending(t, false).length === 0).sort();
    if (ready.length) {
      for (const t of ready) {
        order.push(t);
        placed.add(t);
      }
      continue;
    }
    // Stuck in a cycle: place the table whose remaining references are all nullable, waiving the fewest.
    const candidates = tables.filter((t) => !placed.has(t) && pending(t, true).length === 0).sort((a, b) => pending(a, false).length - pending(b, false).length || a.localeCompare(b));
    if (!candidates.length) throw new Error("foreign-key cycle through NOT NULL columns; cannot order the fixture");
    for (const e of pending(candidates[0], false)) waived.add(`${e.tbl}.${e.col}`);
  }
  const position = new Map(order.map((t, i) => [t, i]));

  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (f.endsWith(".json")) fs.unlinkSync(path.join(outDir, f));
  const manifest = { exportedAt: new Date().toISOString(), migrations: owned, tables: [] };
  for (const t of order) {
    const cols = (await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`, [t])).rows.map((r) => r.column_name);
    const deferred = [...new Set(fks.filter((f) => f.tbl === t && tables.includes(f.ref) && position.get(f.ref) >= position.get(t)).map((f) => f.col))];
    for (const c of deferred) if (!nullable.has(`${t}.${c}`)) throw new Error(`${t}.${c} is NOT NULL but would need deferring`);
    const pk = (
      await client.query(
        `SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = $1::regclass AND i.indisprimary`,
        [t],
      )
    ).rows.map((r) => r.attname);
    const rows = (await client.query(`SELECT * FROM ${t} ORDER BY ${pk.length ? pk.join(", ") : "1"}`)).rows;
    for (const r of rows) for (const c of BLANK[t] ?? []) if (c in r) r[c] = null;
    const file = `${t}.json`;
    fs.writeFileSync(path.join(outDir, file), JSON.stringify(rows.map((r) => cols.map((c) => r[c])), null, 0) + "\n");
    manifest.tables.push({ name: t, columns: cols, primaryKey: pk, deferred, rows: rows.length, file });
    console.log(`${t.padEnd(32)} ${String(rows.length).padStart(6)} rows${deferred.length ? `  (deferred: ${deferred.join(", ")})` : ""}`);
  }
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\n${order.length} tables → ${path.relative(process.cwd(), outDir)}`);
} finally {
  await client.end();
}
