/**
 * Versioned schema migrations.
 *
 * The schema lives in `backend/src/db/migrations/NNN_name.sql`, applied once
 * each, in file-name order, inside its own transaction. 000_base is the schema
 * from before versioning; a database that already has it skips it. Applied
 * versions are recorded in `ultron_migrations` (the database is shared with
 * other tools that own `schema_migrations` / `migrations`).
 *
 * One server at a time: an advisory lock serialises concurrent boots.
 *
 * A brand-new (empty) database is built in one go: several migrations insert
 * reference rows for machines and plants that only the fixture brings, so the
 * migrations run with foreign-key triggers off (session_replication_role =
 * replica), the fixture then empties and reloads every configuration table,
 * and the result is checked for rows whose references point nowhere.
 */
import fs from "fs";
import path from "path";
import pool, { invalidateReadCache } from "./index";
import { BACKEND_DIR } from "@backend/paths";

const LOCK_KEY = 7346513;
const DIR = path.join(BACKEND_DIR, "src/db/migrations");

const g = globalThis as typeof globalThis & { __ultronMigrations?: Promise<string[]> };

export interface MigrationFile {
  version: string;
  name: string;
  sql: string;
}

export function listMigrationFiles(): MigrationFile[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => /^\d{3,}_[\w-]+\.sql$/.test(f))
    .sort()
    .map((f) => ({ version: f.split("_")[0], name: f.replace(/\.sql$/, ""), sql: fs.readFileSync(path.join(DIR, f), "utf-8") }));
}

/** Applies every pending migration; returns the names applied by this call. */
export async function runMigrations(): Promise<string[]> {
  const client = await pool.connect();
  let locked = false;
  let fresh = false;
  const applied: string[] = [];
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS ultron_migrations (
      version VARCHAR(16) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    // Session-level advisory locks do not survive a transaction-mode pooler
    // between statements, so take a transaction-level lock per migration.
    // A database created before versioned migrations already has the base schema.
    await client.query(
      `INSERT INTO ultron_migrations (version, name)
       SELECT '000', '000_base' WHERE to_regclass('public.machines') IS NOT NULL
       ON CONFLICT (version) DO NOTHING`,
    );
    const done = new Set((await client.query<{ version: string }>("SELECT version FROM ultron_migrations")).rows.map((r) => r.version));
    fresh = done.size === 0 && (await isEmptyDatabase());
    for (const m of listMigrationFiles()) {
      if (done.has(m.version)) continue;
      await client.query("BEGIN");
      try {
        if (fresh) await client.query("SET LOCAL session_replication_role = replica");
        locked = Boolean((await client.query<{ ok: boolean }>("SELECT pg_try_advisory_xact_lock($1) AS ok", [LOCK_KEY])).rows[0]?.ok);
        if (!locked) {
          await client.query("ROLLBACK");
          break; // another server is migrating; it will finish the rest
        }
        const again = await client.query("SELECT 1 FROM ultron_migrations WHERE version = $1", [m.version]);
        if (again.rowCount) {
          await client.query("ROLLBACK");
          continue;
        }
        await client.query(m.sql);
        await client.query("INSERT INTO ultron_migrations (version, name) VALUES ($1, $2)", [m.version, m.name]);
        await client.query("COMMIT");
        applied.push(m.name);
        console.log(`[db] migration ${m.name} applied`);
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw new Error(`Migration ${m.name} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } finally {
    client.release();
  }
  if (fresh && applied.length) {
    const { loadFixture, findDanglingReferences } = await import("./fixture-seed");
    await loadFixture();
    const dangling = await findDanglingReferences();
    if (dangling.length) throw new Error(`Fresh database built with rows that reference nothing: ${dangling.join("; ")}`);
    console.log("[db] fresh database built from the migrations and the reference fixture");
  }
  if (applied.length) invalidateReadCache("all");
  return applied;
}

/** True when the database has none of the application's tables yet (000_base creates machines first). */
export async function isEmptyDatabase(): Promise<boolean> {
  const res = await pool.query<{ empty: boolean }>("SELECT to_regclass('public.machines') IS NULL AS empty");
  return Boolean(res.rows[0]?.empty);
}

/** Runs the migrations once per process; later callers share the result. */
export function ensureMigrations(): Promise<string[]> {
  g.__ultronMigrations ??= runMigrations().catch((err) => {
    g.__ultronMigrations = undefined;
    throw err;
  });
  return g.__ultronMigrations;
}
