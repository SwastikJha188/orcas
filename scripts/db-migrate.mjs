#!/usr/bin/env node
/**
 * Applies pending SQL migrations (src/server/db/migrations) from the command
 * line, exactly as the server does on boot (src/server/db/migrate.ts).
 *
 *   node --env-file=.env.local scripts/db-migrate.mjs          apply pending
 *   node --env-file=.env.local scripts/db-migrate.mjs --status list applied / pending
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
const dir = path.join(process.cwd(), "src/server/db/migrations");
const files = fs.readdirSync(dir).filter((f) => /^\d{3,}_[\w-]+\.sql$/.test(f)).sort();

await client.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS ultron_migrations (
    version VARCHAR(16) PRIMARY KEY, name VARCHAR(255) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await client.query(
    `INSERT INTO ultron_migrations (version, name) SELECT '000', '000_base' WHERE to_regclass('public.machines') IS NOT NULL ON CONFLICT (version) DO NOTHING`,
  );
  const done = new Set((await client.query("SELECT version FROM ultron_migrations")).rows.map((r) => r.version));
  if (process.argv.includes("--status")) {
    for (const f of files) console.log(`${done.has(f.split("_")[0]) ? "applied" : "pending"}  ${f}`);
  } else {
    for (const f of files) {
      const version = f.split("_")[0];
      if (done.has(version)) continue;
      const sql = fs.readFileSync(path.join(dir, f), "utf-8");
      await client.query("BEGIN");
      try {
        await client.query("SELECT pg_advisory_xact_lock(7346513)");
        if ((await client.query("SELECT 1 FROM ultron_migrations WHERE version = $1", [version])).rowCount) {
          await client.query("ROLLBACK");
          continue;
        }
        await client.query(sql);
        await client.query("INSERT INTO ultron_migrations (version, name) VALUES ($1, $2)", [version, f.replace(/\.sql$/, "")]);
        await client.query("COMMIT");
        console.log(`applied  ${f}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`FAILED   ${f}: ${err.message}`);
        process.exitCode = 1;
        break;
      }
    }
  }
} finally {
  await client.end();
}
