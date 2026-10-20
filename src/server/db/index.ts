import { Client, Pool, QueryResult, QueryResultRow } from "pg";

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

/* --------------------------------------------------------------------------
   Read cache.
   The database is a long round trip away (hosted Postgres) and pages ask for
   the same rows many times, so reads through `query()` are cached per SQL +
   params. Every write on any connection of this process (pool.query, query(),
   transaction clients) retires the cached reads that mention the tables it
   wrote — INSERT / UPDATE by table, DELETE / TRUNCATE / DDL everything (FK
   cascades reach other tables) — so the app always reads its own writes.
   Writes from another process show up within FRESH_MS: older entries are
   served once while they refresh in the background (stale-while-revalidate).
   -------------------------------------------------------------------------- */

const FRESH_MS = 10_000;
// Same-process writes retire entries at once; this only bounds what another
// process wrote, which the first read after FRESH_MS refreshes in the background.
const MAX_STALE_MS = 24 * 60 * 60_000;
const MAX_ENTRIES = 1_000;

type Res = QueryResult<QueryResultRow>;
type CacheEntry = { at: number; words: Set<string>; res: Res };
type Inflight = { p: Promise<Res>; words: Set<string> };
interface ReadCache {
  seq: number;
  /** seq of the last "everything" invalidation. */
  allSeq: number;
  /** seq of the last write per table. */
  tableSeq: Map<string, number>;
  entries: Map<string, CacheEntry>;
  inflight: Map<string, Inflight>;
}
const cacheState = globalThis as typeof globalThis & { __orcasReadCache2?: ReadCache; __orcasWriteHook2?: boolean };
const cache = (cacheState.__orcasReadCache2 ??= { seq: 0, allSeq: 0, tableSeq: new Map(), entries: new Map(), inflight: new Map() });

const READ_HEAD = /^\s*(?:--[^\n]*\n\s*)*(SELECT|WITH|SHOW|EXPLAIN|BEGIN|START|ROLLBACK|SET|RESET|SAVEPOINT|RELEASE)\b/i;
const WRITE_IN_WITH = /\b(INSERT|UPDATE|DELETE|MERGE)\b/i;
const TX_END = /^\s*(COMMIT|END|ROLLBACK)\b/i;
/** Reads that must never be served from cache (sequences, locks, randomness, live stats). */
const UNCACHEABLE = /\b(nextval|setval|pg_advisory\w*|pg_try_advisory\w*|random|FOR\s+UPDATE|FOR\s+SHARE|pg_stat_activity)\b/i;
const IDENT = "(?:[a-z_][a-z0-9_]*\\.)?([a-z_][a-z0-9_]*)";
const TARGETS = [new RegExp(`\\binsert\\s+into\\s+${IDENT}`, "gi"), new RegExp(`\\bupdate\\s+${IDENT}\\s+set\\b`, "gi"), new RegExp(`\\bmerge\\s+into\\s+${IDENT}`, "gi")];
const WIDE_WRITE = /\b(delete|truncate|drop|alter|create|grant|revoke|comment|copy|vacuum|reindex)\b/i;

function isWrite(text: string): boolean {
  const m = READ_HEAD.exec(text);
  if (!m) return true; // INSERT / UPDATE / DELETE / DDL / COMMIT / TRUNCATE …
  return m[1].toUpperCase() === "WITH" && WRITE_IN_WITH.test(text);
}

/** Tables a write touches, or "all" when it may reach beyond them. */
function writeTargets(text: string): Set<string> | "all" {
  if (WIDE_WRITE.test(text)) return "all";
  const out = new Set<string>();
  for (const re of TARGETS) for (const m of text.matchAll(re)) out.add(m[1].toLowerCase());
  return out.size ? out : "all";
}

const wordsOf = (text: string) => new Set(text.toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? []);

/** Retires cached reads: those mentioning `tables`, or every one. Also call after out-of-band changes. */
export function invalidateReadCache(tables: Set<string> | "all" = "all"): void {
  const seq = ++cache.seq;
  if (tables === "all") {
    cache.allSeq = seq;
    cache.entries.clear();
    cache.inflight.clear();
    return;
  }
  for (const t of tables) cache.tableSeq.set(t, seq);
  const touches = (words: Set<string>) => [...tables].some((t) => words.has(t));
  for (const [k, e] of cache.entries) if (touches(e.words)) cache.entries.delete(k);
  for (const [k, f] of cache.inflight) if (touches(f.words)) cache.inflight.delete(k);
}

/** True when nothing a read depends on was written after it started. */
function stillValid(words: Set<string>, startSeq: number): boolean {
  if (cache.allSeq > startSeq) return false;
  for (const [t, seq] of cache.tableSeq) if (seq > startSeq && words.has(t)) return false;
  return true;
}

// Every client the pool hands out is a pg Client, so one hook sees every write.
// A transaction's tables are retired again at COMMIT, when the rows become visible.
type TxClient = Client & { __orcasDirty?: Set<string> | "all" };
if (!cacheState.__orcasWriteHook2) {
  cacheState.__orcasWriteHook2 = true;
  const original = Client.prototype.query as (...args: unknown[]) => unknown;
  Client.prototype.query = function (this: TxClient, ...args: unknown[]) {
    const config = args[0] as string | { text?: string } | undefined;
    const text = typeof config === "string" ? config : config?.text ?? "";
    if (!text || !isWrite(text)) {
      if (text && /^\s*ROLLBACK\b/i.test(text)) this.__orcasDirty = undefined;
      return original.apply(this, args);
    }
    let targets: Set<string> | "all";
    if (TX_END.test(text)) {
      targets = this.__orcasDirty ?? new Set();
      this.__orcasDirty = undefined;
    } else {
      targets = writeTargets(text);
      const dirty = this.__orcasDirty;
      this.__orcasDirty = targets === "all" || dirty === "all" ? "all" : new Set([...(dirty ?? []), ...targets]);
    }
    if (targets !== "all" && targets.size === 0) return original.apply(this, args);
    invalidateReadCache(targets);
    const out = original.apply(this, args);
    // Retire reads that ran while the write was in flight, too.
    const again = () => invalidateReadCache(targets);
    if (out && typeof (out as Promise<unknown>).then === "function") (out as Promise<unknown>).then(again, again);
    return out;
  } as typeof Client.prototype.query;
}

const clone = <T extends QueryResultRow>(res: QueryResult<T>): QueryResult<T> => ({ ...res, rows: structuredClone(res.rows) });

async function timedQuery<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development" && duration > 100) {
    console.log(`Executed query in ${duration}ms: ${text.slice(0, 80)}...`);
  }
  return res;
}

function refresh(key: string, text: string, params: unknown[] | undefined, words: Set<string>): Promise<Res> {
  const running = cache.inflight.get(key);
  if (running) return running.p;
  const startSeq = cache.seq;
  const p = timedQuery(text, params)
    .then((res) => {
      if (stillValid(words, startSeq)) {
        cache.entries.delete(key);
        cache.entries.set(key, { at: Date.now(), words, res: clone(res) });
        if (cache.entries.size > MAX_ENTRIES) cache.entries.delete(cache.entries.keys().next().value!);
      }
      return res;
    })
    .finally(() => {
      if (cache.inflight.get(key)?.p === p) cache.inflight.delete(key);
    });
  cache.inflight.set(key, { p, words });
  return p;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  if (isWrite(text) || UNCACHEABLE.test(text)) return timedQuery<T>(text, params);
  const key = params?.length ? `${text}\u0000${JSON.stringify(params)}` : text;
  const hit = cache.entries.get(key);
  if (hit) {
    const age = Date.now() - hit.at;
    if (age < FRESH_MS) return clone(hit.res as QueryResult<T>);
    if (age < MAX_STALE_MS) {
      void refresh(key, text, params, hit.words).catch(() => {});
      return clone(hit.res as QueryResult<T>);
    }
  }
  return clone((await refresh(key, text, params, wordsOf(text))) as QueryResult<T>);
}

export async function getClient() {
  return await pool.connect();
}

/**
 * Brings the schema up to date by applying the versioned migrations
 * (src/server/db/migrations). Safe to call from any number of servers.
 */
export async function initDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    const { runMigrations } = await import("./migrate");
    const applied = await runMigrations();
    return { success: true, message: applied.length ? `Applied ${applied.join(", ")}` : "Schema up to date." };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Database migration failed:", errorMsg);
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
      "measurements",
      "measurement_limits",
      "rules",
      "readings",
      "findings",
      "machine_events",
      "rack_chassis",
    ];
    const res = await query<{ version: string; database: string; counts: Record<string, number> }>(
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
