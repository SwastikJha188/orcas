import { Pool, QueryResult, QueryResultRow } from "pg";
import fs from "fs";
import path from "path";

// Initialize PostgreSQL connection pool
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://swastikjha@localhost:5432/ultron";

// Hosted Postgres (Supabase) requires TLS; local development does not.
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
  max: isLocal ? 20 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

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
 * Initializes database tables using schema.sql
 */
export async function initDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    const schemaPath = path.join(process.cwd(), "src/server/db/schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");

    await pool.query(schemaSql);
    return { success: true, message: "Schema initialized successfully." };
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
    const res = await pool.query(
      "SELECT version(), current_database() as database"
    );
    const row = res.rows[0];

    // Count rows across primary tables
    const tableCounts: Record<string, number> = {};
    const tables = [
      "machines",
      "machine_systems",
      "machine_subassemblies",
      "machine_hotspots",
      "mapped_signals",
      "operating_events",
      "diagnosis_records",
      "trend_records",
      "rack_chassis",
    ];

    for (const t of tables) {
      try {
        const countRes = await pool.query(`SELECT COUNT(*)::int as c FROM ${t}`);
        tableCounts[t] = countRes.rows[0].c;
      } catch {
        tableCounts[t] = 0;
      }
    }

    return {
      connected: true,
      version: row.version,
      database: row.database,
      counts: tableCounts,
    };
  } catch (err: unknown) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default pool;
