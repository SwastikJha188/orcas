import crypto from "crypto";
import type { PoolClient } from "pg";
import { getClient, query } from "@backend/db";
import { InputError, NotFoundError } from "@backend/errors";

/**
 * The SAP simulator: a stand-in SAP S/4HANA system per plant (migration 059).
 *
 * Its master data is made once from the plant's own machines (equipment),
 * machine parts (spare materials, matched to a kind of part by
 * part_kind_lives, with an equipment bill of material and stock) and
 * measurements (measuring points). From then on `advanceSapSim` plays what
 * SAP's own people and processes do, in time order and deterministically
 * from the plant's seed:
 *
 *   planner      a notification becomes a maintenance order after
 *                planner_delay_min; released release_delay_min later; started
 *                by priority; runs ~work_hours; closed verify_hours after
 *   stores       parts are issued when the order is released; stock below its
 *                reorder point is reordered and arrives lead_days later; an
 *                order whose parts are missing waits for them
 *   preventive   every equipment gets a routine order every preventive_every_days
 *   operators    report about one malfunction every few days
 *   production   a rolling week of production orders on the plant's main machine
 *
 * Statuses are never stored: the OData answers read them from the times.
 */

export { SIM_ORIGIN, isSimUrl } from "./origin";

const H = 3600_000;
const D = 24 * H;
/** SAP plans this far ahead (preventive orders, production). */
const LOOKAHEAD = 7 * D;
/** History made when a plant's SAP is first set up. */
const HISTORY = 21 * D;
/** Hours from release to start, by SAP priority (1 very high … 4 low). */
const START_AFTER_H: Record<string, number> = { "1": 1, "2": 8, "3": 24, "4": 72 };
/** Operator malfunction reports per plant per day. */
const REPORTS_PER_DAY = 0.35;
/** Part kinds that are not kept as spares. */
const NOT_SPARES = new Set(["structure", "process", "other"]);

/* ------------------------------------------------------------------- random */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A number in [0, 1) fixed by the plant's seed and `key`. */
function rnd(seed: number, key: string): number {
  let t = (hash(`${seed}|${key}`) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(seed: number, key: string, list: T[]): T => list[Math.floor(rnd(seed, key) * list.length)];
const between = (seed: number, key: string, lo: number, hi: number) => lo + rnd(seed, key) * (hi - lo);

export const secretHash = (secret: string) => crypto.createHash("sha256").update(secret).digest("hex");

/* ----------------------------------------------------------------- settings */

export interface SapSimSettings {
  plantId: string;
  plantCode: string;
  startedAt: string;
  plannerDelayMin: number;
  releaseDelayMin: number;
  workHours: number;
  verifyHours: number;
  preventiveEveryDays: number;
  productionHours: number;
  latencyMs: number;
  failureRate: number;
  slowResourceId: string | null;
  stockLevel: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface SimRow {
  plant_id: string;
  seed: number;
  plant_code: string;
  client_id: string;
  client_secret_hash: string;
  started_at: Date;
  advanced_to: Date;
  planner_delay_min: number;
  release_delay_min: number;
  work_hours: number;
  verify_hours: number;
  preventive_every_days: number;
  production_hours: number;
  latency_ms: number;
  failure_rate: number;
  slow_resource_id: string | null;
  stock_level: number;
  updated_at: Date;
  updated_by: string | null;
}

const toSettings = (r: SimRow & { updated_by_name?: string | null }): SapSimSettings => ({
  plantId: r.plant_id,
  plantCode: r.plant_code,
  startedAt: r.started_at.toISOString(),
  plannerDelayMin: r.planner_delay_min,
  releaseDelayMin: r.release_delay_min,
  workHours: r.work_hours,
  verifyHours: r.verify_hours,
  preventiveEveryDays: r.preventive_every_days,
  productionHours: r.production_hours,
  latencyMs: r.latency_ms,
  failureRate: r.failure_rate,
  slowResourceId: r.slow_resource_id,
  stockLevel: r.stock_level,
  updatedAt: r.updated_at.toISOString(),
  updatedBy: r.updated_by_name ?? null,
});

/** The plant's simulator settings, or null when the plant has none. Uncached: settings change under it. */
export async function getSapSim(plantId: string): Promise<SapSimSettings | null> {
  const client = await getClient();
  try {
    const r = (
      await client.query<SimRow & { updated_by_name: string | null }>(
        "SELECT s.*, u.full_name AS updated_by_name FROM sap_sim_systems s LEFT JOIN users u ON u.id = s.updated_by WHERE s.plant_id = $1",
        [plantId],
      )
    ).rows[0];
    return r ? toSettings(r) : null;
  } finally {
    client.release();
  }
}

/** Raw row for the request handler (seed, latency, failures). */
export async function simRow(plantId: string): Promise<SimRow | null> {
  const client = await getClient();
  try {
    return (await client.query<SimRow>("SELECT * FROM sap_sim_systems WHERE plant_id = $1", [plantId])).rows[0] ?? null;
  } finally {
    client.release();
  }
}

type SimNumber = "plannerDelayMin" | "releaseDelayMin" | "workHours" | "verifyHours" | "preventiveEveryDays" | "productionHours" | "latencyMs" | "failureRate" | "stockLevel";

const LIMITS: Record<SimNumber, [number, number]> = {
  plannerDelayMin: [1, 1440],
  releaseDelayMin: [0, 1440],
  workHours: [0.25, 72],
  verifyHours: [0, 720],
  preventiveEveryDays: [1, 365],
  productionHours: [1, 72],
  latencyMs: [0, 10000],
  failureRate: [0, 1],
  stockLevel: [0, 10],
};

export async function updateSapSim(plantId: string, input: Partial<Record<SimNumber, number>> & { slowResourceId?: string | null }, userId: string | null): Promise<SapSimSettings> {
  if (!(await getSapSim(plantId))) throw new NotFoundError("This plant's SAP is not running.");
  const cols: Record<string, string> = {
    plannerDelayMin: "planner_delay_min",
    releaseDelayMin: "release_delay_min",
    workHours: "work_hours",
    verifyHours: "verify_hours",
    preventiveEveryDays: "preventive_every_days",
    productionHours: "production_hours",
    latencyMs: "latency_ms",
    failureRate: "failure_rate",
    stockLevel: "stock_level",
  };
  const sets: string[] = [];
  const vals: unknown[] = [plantId];
  for (const [k, col] of Object.entries(cols)) {
    const v = input[k as SimNumber];
    if (v === undefined) continue;
    const [lo, hi] = LIMITS[k as SimNumber];
    if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi) throw new InputError(`${k} must be between ${lo} and ${hi}.`);
    vals.push(["plannerDelayMin", "releaseDelayMin", "preventiveEveryDays", "latencyMs"].includes(k) ? Math.round(v) : v);
    sets.push(`${col} = $${vals.length}`);
  }
  if (input.slowResourceId !== undefined) {
    vals.push(input.slowResourceId || null);
    sets.push(`slow_resource_id = $${vals.length}`);
  }
  vals.push(userId);
  sets.push(`updated_by = $${vals.length}`, "updated_at = now()");
  await query(`UPDATE sap_sim_systems SET ${sets.join(", ")} WHERE plant_id = $1`, vals);
  return (await getSapSim(plantId))!;
}

/** One multi-row INSERT (the database is a long round trip away). */
async function insertRows(c: PoolClient, table: string, cols: string[], rows: unknown[][]): Promise<void> {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const params: unknown[] = [];
    const values = chunk.map((r) => `(${r.map((v) => (params.push(v), `$${params.length}`)).join(",")})`);
    await c.query(`INSERT INTO ${table} (${cols.join(", ")}) VALUES ${values.join(",")}`, params);
  }
}

/* -------------------------------------------------------------- master data */

/** Builds the plant's SAP system from its machines, parts and measurements, and plays three weeks of history. */
export async function createSapSim(plantId: string, userId: string | null): Promise<{ clientId: string; clientSecret: string; plantCode: string }> {
  const plant = (await query<{ id: string; code: string | null; primary_machine_id: string | null }>("SELECT id, code, primary_machine_id FROM plants WHERE id = $1", [plantId])).rows[0];
  if (!plant) throw new NotFoundError(`Plant '${plantId}' not found.`);
  const products = await query("SELECT 1 FROM sap_sim_products WHERE plant_id = $1", [plantId]);
  if (!products.rowCount) throw new InputError("Add what this plant makes (sap_sim_products) before starting its SAP.");
  const seed = hash(`${plantId}|${Date.now()}`) % 1_000_000;
  const rank = Number((await query<{ n: string }>("SELECT count(*) AS n FROM plants WHERE id < $1", [plantId])).rows[0].n);
  const plantCode = String(1000 + rank * 100);
  const clientId = `ULTRON_${plantCode}`;
  const clientSecret = crypto.randomBytes(24).toString("base64url");

  const machines = (
    await query<{ id: string; name: string; sap_equipment_id: string | null; floc: string | null; work_center: string | null; cost_center: string | null }>(
      `SELECT m.id, m.name, s.sap_equipment_id, s.floc, s.work_center, s.cost_center
         FROM machines m LEFT JOIN sap_equipment_records s ON s.machine_id = m.id
        WHERE m.plant_id = $1 ORDER BY m.id`,
      [plantId],
    )
  ).rows;
  if (!machines.length) throw new InputError("This plant has no machines to put in SAP.");
  const parts = (
    await query<{ id: string; machine_id: string; name: string; kind: string; life_h: number }>(
      `SELECT sa.id, s.machine_id, sa.name,
              (SELECT k.id FROM part_kind_lives k WHERE sa.name ~* k.name_pattern ORDER BY k.sort_order LIMIT 1) AS kind,
              (SELECT k.life_h FROM part_kind_lives k WHERE sa.name ~* k.name_pattern ORDER BY k.sort_order LIMIT 1) AS life_h
         FROM machine_subassemblies sa
         JOIN machine_systems s ON s.id = sa.machine_system_ref_id
         JOIN machines m ON m.id = s.machine_id
        WHERE m.plant_id = $1 ORDER BY s.machine_id, sa.sort_order, sa.id`,
      [plantId],
    )
  ).rows;
  const measurements = (
    await query<{ id: string; machine_id: string; name: string; unit: string | null }>(
      `SELECT v.measurement_id AS id, v.machine_id, v.name, v.unit FROM v_measurement_context v
        WHERE v.plant_id = $1 AND v.value_kind = 'analog' ORDER BY v.machine_id, v.sort_order, v.measurement_id`,
      [plantId],
    )
  ).rows;

  const client = await getClient();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM sap_sim_systems WHERE plant_id = $1", [plantId]);
    await client.query(
      "INSERT INTO sap_sim_systems (plant_id, seed, plant_code, client_id, client_secret_hash, started_at, advanced_to, updated_by) VALUES ($1,$2,$3,$4,$5,now(),now() - $6::interval,$7)",
      [plantId, seed, plantCode, clientId, secretHash(clientSecret), `${HISTORY / H} hours`, userId],
    );
    // Equipment: a machine's SAP number where ULTRON already knows it, else a new one.
    const eqOf = new Map<string, string>();
    const eqRows: unknown[][] = [];
    const matRows: unknown[][] = [];
    const bomRows: unknown[][] = [];
    const stockRows: unknown[][] = [];
    const mpRows: unknown[][] = [];
    let n = 0;
    const code = (plant.code ?? plantId).toUpperCase().replace(/[^A-Z0-9-]/g, "");
    for (const m of machines) {
      n += 1;
      const eq = (m.sap_equipment_id ?? String(10_000_000 + Math.floor(rnd(seed, "eqbase") * 80_000) * 10 + n)).slice(0, 18);
      eqOf.set(m.id, eq);
      const short = m.id.replace(/^[A-Z]+-(?=[A-Z]+-\d)/, "");
      eqRows.push([
          plantId,
          eq,
          m.id,
          m.name.toUpperCase().slice(0, 40),
          (m.floc ?? `${code}-${short}`).slice(0, 40),
          (m.work_center ?? `MECH${String(1 + (n % 4)).padStart(2, "0")}`).replace(/^WC-/, "").slice(0, 8),
          (m.cost_center ?? `${plantCode}${String(100 + n)}`).slice(0, 10),
      ]);
    }
    await insertRows(client, "sap_sim_equipment", ["plant_id", "equipment", "machine_id", "description", "floc", "work_center", "cost_center"], eqRows);
    // Spare materials per part, with the equipment's bill of material and stock in two stores.
    const kindN = new Map<string, number>();
    for (const p of parts) {
      if (!p.kind || NOT_SPARES.has(p.kind)) continue;
      const k = (kindN.get(p.kind) ?? 0) + 1;
      kindN.set(p.kind, k);
      const material = `${p.kind.slice(0, 3).toUpperCase()}-${plantCode}-${String(k).padStart(3, "0")}`;
      const unit = p.kind === "lube" ? "L" : "EA";
      const price = Math.round((p.life_h / 25) * between(seed, `price|${p.id}`, 0.5, 1.6));
      matRows.push([plantId, material, `${p.name} spare`.slice(0, 40), unit, price]);
      bomRows.push([
        plantId,
        eqOf.get(p.machine_id),
        material,
        p.id,
        unit === "L" ? Math.round(between(seed, `bomq|${p.id}`, 10, 40)) : rnd(seed, `bomq|${p.id}`) < 0.75 ? 1 : 2,
      ]);
      const big = unit === "L" ? 20 : 1;
      stockRows.push([plantId, material, "0001", Math.round(between(seed, `open|${material}`, 0, 5)) * big, big, Math.round(between(seed, `rq|${material}`, 2, 5)) * big, Math.round(between(seed, `lead|${material}`, 2, 12) * 10) / 10]);
      if (rnd(seed, `stage|${material}`) < 0.3) {
        stockRows.push([plantId, material, "0002", Math.round(between(seed, `open2|${material}`, 0, 2)) * big, 0, big, 1]);
      }
    }
    // Measuring points for every analog measurement.
    let mp = 0;
    for (const m of measurements) {
      mp += 1;
      mpRows.push([plantId, String(310_000 + Math.floor(rnd(seed, "mpbase") * 400) * 100 + mp), eqOf.get(m.machine_id), m.id, m.name.slice(0, 40), m.unit?.slice(0, 8) ?? null]);
    }
    await insertRows(client, "sap_sim_materials", ["plant_id", "material", "description", "base_unit", "price"], matRows);
    await insertRows(client, "sap_sim_bom", ["plant_id", "equipment", "material", "subassembly_id", "quantity"], bomRows);
    await insertRows(client, "sap_sim_stock", ["plant_id", "material", "storage_location", "opening_qty", "reorder_point", "reorder_qty", "lead_days"], stockRows);
    await insertRows(client, "sap_sim_measuring_points", ["plant_id", "measuring_point", "equipment", "measurement_id", "description", "unit"], mpRows);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await advanceSapSim(plantId, new Date());
  return { clientId, clientSecret, plantCode };
}

export async function deleteSapSim(plantId: string): Promise<void> {
  await query("DELETE FROM sap_sim_systems WHERE plant_id = $1", [plantId]);
}

/* ------------------------------------------------------------------ advance */

interface Store {
  opening: number;
  reorderPoint: number;
  reorderQty: number;
  leadDays: number;
  /** Movements by time (existing and made in this advance). */
  moves: { qty: number; at: number }[];
}

/**
 * One advance, held in memory and written at the end: the database is a long
 * round trip away, and the planner checks stock many times per order.
 */
interface Ctx {
  c: PoolClient;
  plantId: string;
  s: SimRow;
  /** Last number used per number range (read once per advance). */
  numbers: Map<string, number>;
  /** material|storage location → store. */
  stores: Map<string, Store>;
  slocs: Map<string, string[]>;
  bom: Map<string, { material: string; quantity: number; part: string | null }[]>;
  moveRows: unknown[][];
  orderRows: unknown[][];
  componentRows: unknown[][];
}

async function nextNumber(ctx: Ctx, table: string, col: string, start: number): Promise<string> {
  let n = ctx.numbers.get(table);
  if (n === undefined) {
    const r = await ctx.c.query<{ n: string | null }>(`SELECT max(${col}::bigint) AS n FROM ${table} WHERE plant_id = $1`, [ctx.plantId]);
    n = r.rows[0].n ? Number(r.rows[0].n) : start - 1;
  }
  ctx.numbers.set(table, n + 1);
  return String(n + 1);
}

async function loadCtx(c: PoolClient, plantId: string, s: SimRow): Promise<Ctx> {
  const [stock, moves, bom] = [
    await c.query<{ material: string; storage_location: string; opening_qty: number; reorder_point: number; reorder_qty: number; lead_days: number }>("SELECT * FROM sap_sim_stock WHERE plant_id = $1 ORDER BY material, storage_location DESC", [plantId]),
    await c.query<{ material: string; storage_location: string; quantity: number; at: Date }>("SELECT material, storage_location, quantity, at FROM sap_sim_stock_movements WHERE plant_id = $1", [plantId]),
    await c.query<{ equipment: string; material: string; quantity: number; part: string | null }>(
      "SELECT b.equipment, b.material, b.quantity, sa.name AS part FROM sap_sim_bom b LEFT JOIN machine_subassemblies sa ON sa.id = b.subassembly_id WHERE b.plant_id = $1 ORDER BY b.equipment, b.material",
      [plantId],
    ),
  ];
  const ctx: Ctx = { c, plantId, s, numbers: new Map(), stores: new Map(), slocs: new Map(), bom: new Map(), moveRows: [], orderRows: [], componentRows: [] };
  for (const r of stock.rows) {
    ctx.stores.set(`${r.material}|${r.storage_location}`, { opening: r.opening_qty * s.stock_level, reorderPoint: r.reorder_point, reorderQty: r.reorder_qty, leadDays: r.lead_days, moves: [] });
    ctx.slocs.set(r.material, [...(ctx.slocs.get(r.material) ?? []), r.storage_location]);
  }
  for (const m of moves.rows) ctx.stores.get(`${m.material}|${m.storage_location}`)?.moves.push({ qty: m.quantity, at: m.at.getTime() });
  for (const b of bom.rows) ctx.bom.set(b.equipment, [...(ctx.bom.get(b.equipment) ?? []), { material: b.material, quantity: b.quantity, part: b.part }]);
  return ctx;
}

const stockAt = (st: Store, at: number) => st.opening + st.moves.reduce((q, m) => (m.at <= at ? q + m.qty : q), 0);

function move(ctx: Ctx, material: string, sloc: string, qty: number, at: number, order: string | null): void {
  ctx.stores.get(`${material}|${sloc}`)!.moves.push({ qty, at });
  ctx.moveRows.push([ctx.plantId, material, sloc, qty, new Date(at), order]);
}

/** Issues `qty` at `at`; reorders when the store drops to its reorder point. Answers when the parts are all there. */
function issue(ctx: Ctx, order: string, material: string, sloc: string, qty: number, at: number): number {
  const st = ctx.stores.get(`${material}|${sloc}`)!;
  const before = stockAt(st, at);
  // Everything already on order arrives eventually: count it for the reorder decision.
  const onOrder = st.moves.reduce((q, m) => (m.qty > 0 && m.at > at ? q + m.qty : q), 0);
  move(ctx, material, sloc, -qty, at, order);
  let ready = at;
  let position = before + onOrder - qty;
  if (before < qty) {
    // Short now: the order waits for the earliest receipt, or orders one.
    const next = st.moves.filter((m) => m.qty > 0 && m.at > at).sort((a, b) => a.at - b.at)[0];
    ready = next ? next.at : at + st.leadDays * D;
    if (!next) {
      const q = Math.max(st.reorderQty, qty - before);
      move(ctx, material, sloc, q, ready, null);
      position += q;
    }
  }
  if (position <= st.reorderPoint) move(ctx, material, sloc, st.reorderQty, at + st.leadDays * D, null);
  return ready;
}

interface OrderPlan {
  type: "PM01" | "PM02";
  equipment: string;
  notification: string | null;
  description: string;
  priority: string | null;
  created: number;
  released: number;
  start: number;
  hours: number;
  key: string;
  parts: number;
}

/** A maintenance order with its parts; the work starts once the parts are all there. */
async function makeOrder(ctx: Ctx, o: OrderPlan): Promise<void> {
  const number = await nextNumber(ctx, "sap_sim_orders", "maintenance_order", 4_000_100);
  const bom = ctx.bom.get(o.equipment) ?? [];
  const chosen: { material: string; quantity: number }[] = [];
  for (let i = 0; i < Math.min(o.parts, bom.length); i += 1) {
    const b = pick(ctx.s.seed, `${o.key}|part${i}`, bom.filter((x) => !chosen.includes(x)));
    if (b) chosen.push(b);
  }
  let start = o.start;
  let item = 0;
  for (const b of chosen) {
    // Parts are reserved and issued at release, from the staging store when it holds enough.
    const slocs = ctx.slocs.get(b.material) ?? ["0001"];
    const sloc = slocs.find((l) => l !== "0001" && stockAt(ctx.stores.get(`${b.material}|${l}`)!, o.released) >= b.quantity) ?? "0001";
    const ready = issue(ctx, number, b.material, sloc, b.quantity, o.released);
    if (ready + 2 * H > start) start = ready + 2 * H;
    item += 10;
    ctx.componentRows.push([ctx.plantId, number, item, b.material, sloc, b.quantity]);
  }
  const finish = start + o.hours * H;
  const closed = finish + (o.type === "PM01" ? ctx.s.verify_hours : 2) * H;
  ctx.orderRows.push([ctx.plantId, number, o.type, o.equipment, o.notification, o.description.slice(0, 40), o.priority, new Date(o.created), new Date(o.released), new Date(start), new Date(finish), new Date(closed)]);
}

const busy = new Map<string, Promise<void>>();

/** Plays SAP's own work for the plant up to `until` (once at a time per plant). */
export function advanceSapSim(plantId: string, until: Date = new Date()): Promise<void> {
  const running = busy.get(plantId);
  if (running) return running;
  const p = runAdvance(plantId, until).finally(() => busy.delete(plantId));
  busy.set(plantId, p);
  return p;
}

async function runAdvance(plantId: string, untilDate: Date): Promise<void> {
  const c = await getClient();
  try {
    await c.query("BEGIN");
    const s = (await c.query<SimRow>("SELECT * FROM sap_sim_systems WHERE plant_id = $1 FOR UPDATE SKIP LOCKED", [plantId])).rows[0];
    const until = untilDate.getTime();
    if (!s || until - s.advanced_to.getTime() < 30_000) {
      await c.query("COMMIT");
      return;
    }
    const ctx = await loadCtx(c, plantId, s);
    const from = s.advanced_to.getTime();
    const equipment = (await c.query<{ equipment: string; description: string }>("SELECT equipment, description FROM sap_sim_equipment WHERE plant_id = $1 ORDER BY equipment", [plantId])).rows;

    // Operators report malfunctions in SAP (about one every few days).
    const reports: unknown[][] = [];
    for (let day = Math.floor(from / D); day <= Math.floor(until / D); day += 1) {
      if (rnd(s.seed, `report|${day}`) >= REPORTS_PER_DAY || !equipment.length) continue;
      const at = day * D + between(s.seed, `reportAt|${day}`, 6, 20) * H;
      if (at <= from || at > until) continue;
      const eq = pick(s.seed, `reportEq|${day}`, equipment);
      const parts = (ctx.bom.get(eq.equipment) ?? []).filter((b) => b.part);
      const what = parts.length ? pick(s.seed, `reportPart|${day}`, parts).part! : eq.description.toLowerCase();
      reports.push([plantId, await nextNumber(ctx, "sap_sim_notifications", "notification", 10_004_000), eq.equipment, "M2", pick(s.seed, `reportPrio|${day}`, ["2", "3", "3", "4"]), `Check ${what}`.slice(0, 40), `Reported on the shop floor during the round: ${what}.`, pick(s.seed, `reportBy|${day}`, ["OPERATOR1", "OPERATOR2", "SHIFTLEAD"]), new Date(at)]);
    }
    await insertRows(c, "sap_sim_notifications", ["plant_id", "notification", "equipment", "notification_type", "priority", "text", "long_text", "reported_by", "created_at"], reports);

    const plans: OrderPlan[] = [];
    // The planner turns each notification into an order.
    const open = (
      await c.query<{ notification: string; equipment: string; text: string; priority: string | null; created_at: Date }>(
        `SELECT n.notification, n.equipment, n.text, n.priority, n.created_at FROM sap_sim_notifications n
          WHERE n.plant_id = $1 AND NOT EXISTS (SELECT 1 FROM sap_sim_orders o WHERE o.plant_id = n.plant_id AND o.notification = n.notification)
            AND n.created_at + make_interval(mins => $2) <= $3
          ORDER BY n.created_at`,
        [plantId, s.planner_delay_min, untilDate],
      )
    ).rows;
    for (const n of open) {
      const created = n.created_at.getTime() + s.planner_delay_min * 60_000;
      const released = created + s.release_delay_min * 60_000;
      plans.push({
        type: "PM01",
        equipment: n.equipment,
        notification: n.notification,
        description: n.text,
        priority: n.priority,
        created,
        released,
        start: released + (START_AFTER_H[n.priority ?? "3"] ?? 24) * H,
        hours: s.work_hours * between(s.seed, `hours|${n.notification}`, 0.75, 1.3),
        key: n.notification,
        parts: 1 + Math.floor(rnd(s.seed, `nparts|${n.notification}`) * 2),
      });
    }

    // Routine (preventive) orders, planned a week ahead.
    const every = s.preventive_every_days * D;
    for (const eq of equipment) {
      const offset = rnd(s.seed, `pm|${eq.equipment}`) * every;
      const first = Math.floor((from + LOOKAHEAD - offset) / every) + 1;
      for (let k = first; offset + k * every <= until + LOOKAHEAD; k += 1) {
        const due = Math.floor((offset + k * every) / H) * H + 6 * H;
        plans.push({
          type: "PM02",
          equipment: eq.equipment,
          notification: null,
          description: `Routine service ${eq.description}`,
          priority: "4",
          created: due - LOOKAHEAD,
          released: due - D,
          start: due,
          hours: Math.max(1, s.work_hours * between(s.seed, `pmh|${eq.equipment}|${k}`, 0.4, 0.9)),
          key: `pm|${eq.equipment}|${k}`,
          parts: rnd(s.seed, `pmparts|${eq.equipment}|${k}`) < 0.5 ? 1 : 0,
        });
      }
    }
    // Stores see the issues in the order they happen.
    plans.sort((a, b) => a.released - b.released || a.key.localeCompare(b.key));
    for (const o of plans) await makeOrder(ctx, o);
    await insertRows(c, "sap_sim_orders", ["plant_id", "maintenance_order", "order_type", "equipment", "notification", "description", "priority", "created_at", "released_at", "start_at", "finish_at", "closed_at"], ctx.orderRows);
    await insertRows(c, "sap_sim_order_components", ["plant_id", "maintenance_order", "item", "material", "storage_location", "quantity"], ctx.componentRows);
    await insertRows(c, "sap_sim_stock_movements", ["plant_id", "material", "storage_location", "quantity", "at", "maintenance_order"], ctx.moveRows);

    // A rolling week of production orders on the plant's main machine.
    const main = (await c.query<{ equipment: string }>("SELECT e.equipment FROM sap_sim_equipment e JOIN plants p ON p.primary_machine_id = e.machine_id WHERE e.plant_id = $1", [plantId])).rows[0] ?? equipment[0];
    const products = (await c.query<{ material: string; rate_per_hour: number }>("SELECT material, rate_per_hour FROM sap_sim_products WHERE plant_id = $1 ORDER BY material", [plantId])).rows;
    if (main && products.length) {
      const last = (await c.query<{ end_at: Date | null }>("SELECT max(end_at) AS end_at FROM sap_sim_production_orders WHERE plant_id = $1", [plantId])).rows[0]?.end_at;
      let t = last ? last.getTime() : from - 2 * D;
      const prodRows: unknown[][] = [];
      while (t < until + LOOKAHEAD) {
        const key = `prod|${t}`;
        const idle = rnd(s.seed, `${key}|idle`) < 0.3 ? between(s.seed, `${key}|gap`, 3, 8) : between(s.seed, `${key}|gap`, 0, 1);
        const start = Math.round((t + idle * H) / (15 * 60_000)) * 15 * 60_000;
        const hours = s.production_hours * between(s.seed, `${key}|len`, 0.6, 1.4);
        const end = start + hours * H;
        const product = pick(s.seed, `${key}|mat`, products);
        const number = await nextNumber(ctx, "sap_sim_production_orders", "production_order", 1_000_200);
        prodRows.push([plantId, number, product.material, main.equipment, Math.round(product.rate_per_hour * hours), new Date(Math.min(start - 3 * D, until)), new Date(start), new Date(end)]);
        t = end;
      }
      await insertRows(c, "sap_sim_production_orders", ["plant_id", "production_order", "material", "equipment", "quantity", "created_at", "start_at", "end_at"], prodRows);
    }

    await c.query("UPDATE sap_sim_systems SET advanced_to = $2 WHERE plant_id = $1", [plantId, untilDate]);
    await c.query("COMMIT");
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
  }
}

/* ----------------------------------------------------------- writes from ULTRON */

/** A notification ULTRON raised: checked like SAP checks it. */
export async function simCreateNotification(plantId: string, body: Record<string, unknown>, user: string): Promise<Record<string, unknown>> {
  const text = typeof body.NotificationText === "string" ? body.NotificationText.trim() : "";
  if (!text) throw new SimODataError(400, "Enter a short text for the notification");
  if (text.length > 40) throw new SimODataError(400, "Short text is longer than 40 characters");
  const type = typeof body.NotificationType === "string" ? body.NotificationType.trim().toUpperCase() : "";
  if (!["M1", "M2", "M3"].includes(type)) throw new SimODataError(400, `Notification type ${type || "(blank)"} is not defined`);
  const eq = typeof body.TechnicalObject === "string" ? body.TechnicalObject.trim() : "";
  const found = (await query<{ equipment: string }>("SELECT equipment FROM sap_sim_equipment WHERE plant_id = $1 AND ltrim(equipment, '0') = ltrim($2, '0')", [plantId, eq])).rows[0];
  if (!found) throw new SimODataError(400, `Equipment ${eq || "(blank)"} does not exist`);
  const priority = typeof body.MaintPriority === "string" && /^[1-4]$/.test(body.MaintPriority) ? body.MaintPriority : null;
  const client = await getClient();
  try {
    await client.query("BEGIN");
    await client.query("SELECT 1 FROM sap_sim_systems WHERE plant_id = $1 FOR UPDATE", [plantId]);
    const n = (await client.query<{ n: string | null }>("SELECT max(notification::bigint) AS n FROM sap_sim_notifications WHERE plant_id = $1", [plantId])).rows[0].n;
    const number = String(n ? Number(n) + 1 : 10_004_000);
    const now = new Date();
    await client.query(
      "INSERT INTO sap_sim_notifications (plant_id, notification, equipment, notification_type, priority, text, long_text, reported_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [plantId, number, found.equipment, type, priority, text, typeof body.MaintNotifLongTextForEdit === "string" ? body.MaintNotifLongTextForEdit : null, user.slice(0, 12), now],
    );
    await client.query("COMMIT");
    return { MaintenanceNotification: number, NotificationText: text, NotificationType: type, TechnicalObject: found.equipment, MaintPriority: priority, NotificationCreationDate: now.toISOString().slice(0, 10) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function simCreateMeasurementDocument(plantId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const point = typeof body.MeasuringPoint === "string" ? body.MeasuringPoint.trim() : "";
  const mp = (await query<{ unit: string | null }>("SELECT unit FROM sap_sim_measuring_points WHERE plant_id = $1 AND ltrim(measuring_point,'0') = ltrim($2,'0')", [plantId, point])).rows[0];
  if (!mp) throw new SimODataError(400, `Measuring point ${point || "(blank)"} does not exist`);
  const reading = Number(body.MeasurementReading);
  if (!Number.isFinite(reading)) throw new SimODataError(400, "Enter a measurement reading");
  const at = new Date(`${String(body.MsmtRdngDate ?? "").slice(0, 10)}T${String(body.MsmtRdngTime ?? "00:00:00").slice(0, 8)}Z`);
  if (Number.isNaN(at.getTime())) throw new SimODataError(400, "Reading date or time is not valid");
  const document = crypto.randomInt(10 ** 9, 10 ** 10 - 1).toString();
  await query("INSERT INTO sap_sim_measurement_documents (plant_id, document, measuring_point, reading, unit, reading_at) VALUES ($1,$2,$3,$4,$5,$6)", [plantId, document, point, reading, mp.unit, at]);
  return { MeasurementDocument: document, MeasuringPoint: point, MeasurementReading: reading };
}

/** "/Date(ms)/" + "PThhHmmMssS" (OData v2) as an instant; null when either is not given. */
function v2Instant(date: unknown, time: unknown): Date | null {
  const d = /\/Date\((-?\d+)\)\//.exec(String(date ?? ""));
  if (!d) return null;
  const t = /^PT(\d{1,2})H(\d{1,2})M(\d{1,2})S$/.exec(String(time ?? "PT00H00M00S"));
  return new Date(Number(d[1]) + (t ? (Number(t[1]) * 3600 + Number(t[2]) * 60 + Number(t[3])) * 1000 : 0));
}

/** A planned maintenance order created from outside (a shutdown's work list): released now, worked in its basic dates. */
export async function simCreateMaintenanceOrder(plantId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const type = typeof body.MaintenanceOrderType === "string" ? body.MaintenanceOrderType.trim().toUpperCase() : "";
  if (type !== "PM01" && type !== "PM02") throw new SimODataError(400, `Order type ${type || "(blank)"} is not defined`);
  const text = typeof body.MaintenanceOrderDesc === "string" ? body.MaintenanceOrderDesc.trim() : "";
  if (!text) throw new SimODataError(400, "Enter a description for the order");
  if (text.length > 40) throw new SimODataError(400, "Description is longer than 40 characters");
  const eq = typeof body.Equipment === "string" ? body.Equipment.trim() : "";
  const found = (await query<{ equipment: string }>("SELECT equipment FROM sap_sim_equipment WHERE plant_id = $1 AND ltrim(equipment, '0') = ltrim($2, '0')", [plantId, eq])).rows[0];
  if (!found) throw new SimODataError(400, `Equipment ${eq || "(blank)"} does not exist`);
  const start = v2Instant(body.MaintOrdBasicStartDate, body.MaintOrdBasicStartTime);
  const finish = v2Instant(body.MaintOrdBasicEndDate, body.MaintOrdBasicEndTime);
  if (!start || !finish || finish <= start) throw new SimODataError(400, "Basic start and end dates are not valid");
  const ops = (body.to_MaintenanceOrderOperation as { results?: unknown[] } | undefined)?.results;
  const priority = typeof body.MaintPriority === "string" && /^[1-4]$/.test(body.MaintPriority) ? body.MaintPriority : null;
  const client = await getClient();
  try {
    await client.query("BEGIN");
    await client.query("SELECT 1 FROM sap_sim_systems WHERE plant_id = $1 FOR UPDATE", [plantId]);
    const n = (await client.query<{ n: string | null }>("SELECT max(maintenance_order::bigint) AS n FROM sap_sim_orders WHERE plant_id = $1", [plantId])).rows[0].n;
    const number = String(n ? Number(n) + 1 : 4_000_100);
    const now = new Date();
    await client.query(
      `INSERT INTO sap_sim_orders (plant_id, maintenance_order, order_type, equipment, notification, description, priority, created_at, released_at, start_at, finish_at, closed_at)
       VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$7,$8,$9,$10)`,
      [plantId, number, type, found.equipment, text, priority, now, start, finish, new Date(finish.getTime() + 2 * H)],
    );
    await client.query("COMMIT");
    return { MaintenanceOrder: number, MaintenanceOrderType: type, MaintenanceOrderDesc: text, Equipment: found.equipment, OperationCount: Array.isArray(ops) ? ops.length : 0 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** An error SAP itself would answer, with its HTTP status. */
export class SimODataError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
