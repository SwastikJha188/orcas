import { Pool, QueryResult, QueryResultRow } from "pg";
import fs from "fs";
import path from "path";

// Initialize PostgreSQL connection pool
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://swastikjha@localhost:5432/ultron";

// Hosted Postgres (Supabase) requires TLS; local development does not.
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);

// One pool per process. A dev server re-evaluates this module on every hot
// reload; without the globalThis cache each reload opened a fresh pool and the
// old one (with its sockets and TLS buffers) was never closed.
const globalForDb = globalThis as typeof globalThis & { __orcasPgPool?: Pool };

const pool =
  globalForDb.__orcasPgPool ??
  (globalForDb.__orcasPgPool = new Pool({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    max: isLocal ? 20 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  }));

if (pool.listenerCount("error") === 0) {
  pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client", err);
  });
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development" && duration > 100) {
    console.log(`Executed query in ${duration}ms: ${text.slice(0, 80)}...`);
  }
  return res;
}

export async function getClient() {
  return await pool.connect();
}

/**
 * Initializes database tables using schema.sql (automatically drops legacy pre-3NF tables if present).
 */
export async function initDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    // Check if legacy pre-3NF tables exist (`machine_parts` or `machines` without `model_id`)
    const legacyCheck = await pool.query<{ is_legacy: boolean }>(`
      SELECT (
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'machine_parts')
        OR (
          EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'machines')
          AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'model_id')
        )
      ) AS is_legacy
    `);

    if (legacyCheck.rows[0]?.is_legacy) {
      console.log("Migrating database from legacy schema to 3NF normalized schema...");
      await pool.query(`
        DROP TABLE IF EXISTS
          ai_predictions,
          alert_acks,
          work_orders,
          edge_points,
          edge_cards,
          edge_sources,
          edge_gateways,
          edge_brokers,
          edge_formats,
          process_stages,
          sap_equipment_records,
          machine_rack_units,
          rack_slots,
          rack_chassis,
          operating_events,
          trend_points,
          trend_records,
          diagnosis_peak_frequencies,
          diagnosis_findings,
          diagnosis_records,
          mapped_signals,
          sensor_definitions,
          machine_hotspots,
          machine_subassemblies,
          machine_systems,
          machine_parts,
          machines,
          equipment_models,
          hierarchy_nodes,
          user_plant_access,
          plants,
          users,
          roles
        CASCADE;
      `);
    }

    const schemaPath = path.join(process.cwd(), "src/server/db/schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");

    await pool.query(schemaSql);
    return { success: true, message: "3NF Schema initialized successfully." };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Database schema initialization failed:", errorMsg);
    return { success: false, message: errorMsg };
  }
}

/**
 * Health check for PostgreSQL connection
 */
export async function isDatabaseHealthy(): Promise<{
  connected: boolean;
  version?: string;
  database?: string;
  counts?: Record<string, number>;
  error?: string;
}> {
  try {
    // One round trip: hosted Postgres is far away, so per-table queries add up.
    const tables = [
      "roles",
      "users",
      "plants",
      "user_plant_access",
      "hierarchy_nodes",
      "equipment_models",
      "machines",
      "machine_systems",
      "machine_subassemblies",
      "sensor_definitions",
      "mapped_signals",
      "operating_events",
      "diagnosis_records",
      "trend_records",
      "rack_chassis",
    ];
    const res = await pool.query<{ version: string; database: string; counts: Record<string, number> }>(
      `SELECT version(), current_database() AS database, json_build_object(${tables
        .map((t) => `'${t}', (SELECT COUNT(*)::int FROM ${t})`)
        .join(", ")}) AS counts`
    );
    const row = res.rows[0];

    return {
      connected: true,
      version: row.version,
      database: row.database,
      counts: row.counts,
    };
  } catch (err: unknown) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default pool;
