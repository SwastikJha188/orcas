// Edge registry: brokers, gateways, sources (rack · PLC · SCADA · DCS) and
// points, stored in PostgreSQL and edited from Devices. The MQTT runtime reads
// broker settings from here; nothing about the plant network lives in .env.

import { randomUUID } from "node:crypto";
import pool, { query } from "@backend/db";
import { ensureMigrations } from "@backend/db/migrate";
import { ULTRON_FORMAT, ULTRON_FORMAT_ID, checkFormat } from "@shared/lib/edge-format";
import { isValidFilter } from "@backend/mqtt/topics";
import { ensureDatabaseSeeded } from "@backend/services/industrial-service";
import { latestReadings } from "@backend/monitoring/readings";
import { dataQualityNow, measurementSeverityNow } from "@backend/monitoring/condition";
import { buildCabinet, type CabinetRow, type MachineRackInfo } from "@shared/lib/rack-data";
import {
  SOURCE_KINDS,
  SOURCE_KIND_LABEL,
  FORMAT_FIELD_KEYS,
  type EdgeBroker,
  type EdgeFormat,
  type EdgeMapInput,
  type EdgeMapResult,
  type EdgeCard,
  type EdgeCommissionResult,
  type FormatFields,
  type TimestampFormat,
  type EdgeBrokerInput,
  type EdgeEntityByKind,
  type EdgeGateway,
  type EdgeGatewayInput,
  type EdgeKind,
  type EdgeMachineOption,
  type EdgePoint,
  type EdgePointInput,
  type EdgeRegistry,
  type EdgeSiteOption,
  type EdgeSource,
  type EdgeSourceInput,
  type PointDataType,
  type SourceKind,
} from "@shared/types/edge";

export const DEFAULT_TOPIC_PREFIX = "ultron/v1/gateways";
export const DEFAULT_CLIENT_ID_PREFIX = "ultron-orcas-ingest";

export class EdgeError extends Error {
  constructor(
    readonly code: "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "INVALID_KIND",
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Everything the runtime needs to open a broker connection, secrets included. Server only. */
export interface RuntimeBrokerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  tls: boolean;
  protocolVersion: 4 | 5 | null;
  username: string | null;
  password: string | null;
  clientIdPrefix: string;
  topicPrefix: string;
  qos: 0 | 1;
  rejectUnauthorized: boolean;
  caCert: string | null;
  clientCert: string | null;
  clientKey: string | null;
  allowedCommands: string[];
  enabled: boolean;
}

// ---------------------------------------------------------------- bootstrap
// On globalThis, not module scope: Next compiles each route separately in dev,
// so a module variable re-ran the whole schema on the first hit of every route.
const globalForEdge = globalThis as typeof globalThis & { __orcasEdgeReady?: Promise<void> | null; __orcasEdgeSync?: Promise<void> };

/**
 * Waits for the schema migrations, then makes sure the built-in data format
 * and the card rows implied by the points exist. The registry's contents come
 * from the database (seeded from the reference fixture), never from code.
 */
export function ensureEdgeRegistry(): Promise<void> {
  globalForEdge.__orcasEdgeReady ??= (async () => {
    await ensureMigrations();
    globalForEdge.__orcasEdgeSync = (async () => {
      await ensureBuiltInFormats();
      await backfillCards();
    })().catch((err) => console.error("[edge] background registry sync failed:", (err as Error).message));
  })().catch((err) => {
    globalForEdge.__orcasEdgeReady = null;
    throw err;
  });
  return globalForEdge.__orcasEdgeReady;
}

/** Resolves once this process's background schema sync (if any) has finished. */
export async function edgeSchemaSynced(): Promise<void> {
  await ensureEdgeRegistry();
  await globalForEdge.__orcasEdgeSync;
}

/** The ULTRON contract is always present as a read-only format row. */
async function ensureBuiltInFormats() {
  const f = ULTRON_FORMAT;
  await query(
    `INSERT INTO edge_formats (id, name, description, kind, topic, records, fields, timestamp_format, defaults, built_in)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, kind = EXCLUDED.kind,
       topic = EXCLUDED.topic, records = EXCLUDED.records, fields = EXCLUDED.fields,
       timestamp_format = EXCLUDED.timestamp_format, defaults = EXCLUDED.defaults, built_in = TRUE`,
    [f.id, f.name, f.description, f.kind, f.topic, f.records, JSON.stringify(f.fields), f.timestampFormat, JSON.stringify(f.defaults)],
  );
}

// ---------------------------------------------------------------- row mapping
type Row = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v ?? ""));
const numOrNull = (v: unknown) => (v === null || v === undefined ? null : Number(v));

function toBroker(r: Row): EdgeBroker {
  const pv = numOrNull(r.protocol_version);
  return {
    id: String(r.id),
    name: String(r.name),
    host: String(r.host),
    port: Number(r.port),
    tls: r.tls === true,
    protocolVersion: pv === 4 || pv === 5 ? pv : null,
    username: str(r.username),
    hasPassword: Boolean(r.password),
    clientIdPrefix: String(r.client_id_prefix),
    topicPrefix: String(r.topic_prefix),
    qos: Number(r.qos) === 0 ? 0 : 1,
    rejectUnauthorized: r.reject_unauthorized !== false,
    caCert: str(r.ca_cert),
    hasClientCert: Boolean(r.client_cert) && Boolean(r.client_key),
    allowedCommands: Array.isArray(r.allowed_commands) ? (r.allowed_commands as string[]) : [],
    enabled: r.enabled === true,
    notes: str(r.notes),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function toRuntimeBroker(r: Row): RuntimeBrokerConfig {
  const b = toBroker(r);
  return {
    id: b.id,
    name: b.name,
    host: b.host,
    port: b.port,
    tls: b.tls,
    protocolVersion: b.protocolVersion,
    username: b.username,
    password: str(r.password),
    clientIdPrefix: b.clientIdPrefix,
    topicPrefix: b.topicPrefix,
    qos: b.qos,
    rejectUnauthorized: b.rejectUnauthorized,
    caCert: b.caCert,
    clientCert: str(r.client_cert),
    clientKey: str(r.client_key),
    allowedCommands: b.allowedCommands,
    enabled: b.enabled,
  };
}

const TIMESTAMP_FORMATS: TimestampFormat[] = ["iso", "epoch_ms", "epoch_s", "epoch_us", "none"];

function toFormat(r: Row): EdgeFormat {
  const raw = (typeof r.fields === "object" && r.fields !== null ? r.fields : {}) as Record<string, unknown>;
  const fields = Object.fromEntries(FORMAT_FIELD_KEYS.map((k) => [k, typeof raw[k] === "string" ? raw[k] : ""])) as unknown as FormatFields;
  const d = (typeof r.defaults === "object" && r.defaults !== null ? r.defaults : {}) as Record<string, unknown>;
  const ts = String(r.timestamp_format);
  return {
    id: String(r.id),
    name: String(r.name),
    description: str(r.description),
    kind: r.kind === "ultron-v2" ? "ultron-v2" : "json",
    topic: String(r.topic ?? ""),
    records: String(r.records ?? ""),
    fields,
    timestampFormat: (TIMESTAMP_FORMATS as string[]).includes(ts) ? (ts as TimestampFormat) : "none",
    defaults: { rack: String(d.rack ?? "R1"), card: String(d.card ?? "1"), channel: String(d.channel ?? "1") },
    builtIn: r.built_in === true,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function toGateway(r: Row): EdgeGateway {
  return {
    id: String(r.id),
    code: String(r.code),
    name: String(r.name),
    brokerId: str(r.broker_id),
    formatId: str(r.format_id),
    topics: Array.isArray(r.topics) ? (r.topics as unknown[]).filter((t): t is string => typeof t === "string") : [],
    siteNodeId: str(r.site_node_id),
    location: str(r.location),
    ipAddress: str(r.ip_address),
    model: str(r.model),
    firmware: str(r.firmware),
    enabled: r.enabled === true,
    notes: str(r.notes),
    securityZone: str(r.security_zone),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function toSource(r: Row): EdgeSource {
  return {
    id: String(r.id),
    gatewayId: String(r.gateway_id),
    code: String(r.code),
    name: String(r.name),
    kind: (SOURCE_KINDS as string[]).includes(String(r.kind)) ? (r.kind as SourceKind) : "other",
    protocol: String(r.protocol),
    endpoint: str(r.endpoint),
    location: str(r.location),
    machineId: str(r.machine_id),
    model: str(r.model),
    pollIntervalMs: numOrNull(r.poll_interval_ms),
    enabled: r.enabled === true,
    notes: str(r.notes),
    securityZone: str(r.security_zone),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function toCard(r: Row): EdgeCard {
  return {
    id: String(r.id),
    sourceId: String(r.source_id),
    code: String(r.code),
    cardType: str(r.card_type),
    channelCount: numOrNull(r.channel_count),
    model: str(r.model),
    notes: str(r.notes),
    enabled: r.enabled === true,
  };
}

/**
 * Every card a point sits on is a card row. Runs at startup and after a
 * seed, so registries built before cards existed gain them; it never
 * overwrites a card that is already there.
 */
async function backfillCards(db: { query: typeof query } = { query }) {
  await db.query(
    `INSERT INTO edge_cards (id, source_id, code, channel_count, enabled)
     SELECT 'card-' || substr(md5(source_id || '/' || slot), 1, 10), source_id, slot, COUNT(*), TRUE
       FROM edge_points GROUP BY source_id, slot
     ON CONFLICT (source_id, code) DO NOTHING`,
  );
}

/** A v_edge_points row: tag, name, unit and machine are the linked measurement's. */
function toPoint(r: Row): EdgePoint {
  return {
    id: String(r.id),
    sourceId: String(r.source_id),
    slot: String(r.slot),
    channel: String(r.channel),
    address: str(r.address),
    dataType: (["float", "int", "bool", "string", "video", "status+map"].includes(String(r.data_type)) ? r.data_type : "float") as PointDataType,
    sampleRate: str(r.sample_rate),
    measurementId: str(r.measurement_id),
    machineId: str(r.machine_id),
    tag: str(r.tag),
    name: str(r.name),
    unit: str(r.unit),
    sourceTag: str(r.source_tag),
    enabled: r.enabled === true,
  };
}

// ---------------------------------------------------------------- reads
export async function getEdgeRegistry(): Promise<EdgeRegistry> {
  await ensureDatabaseSeeded();
  await ensureEdgeRegistry();
  const [formats, brokers, gateways, sources, cards, points, sites, machines] = await Promise.all([
    query("SELECT * FROM edge_formats ORDER BY built_in DESC, name"),
    query("SELECT * FROM edge_brokers ORDER BY sort_order, created_at, name"),
    query("SELECT * FROM v_edge_gateways ORDER BY sort_order, name"),
    query("SELECT * FROM edge_sources ORDER BY sort_order, name"),
    query("SELECT * FROM edge_cards ORDER BY source_id, sort_order, length(code), code"),
    // Natural order: card "2" before "10".
    query("SELECT * FROM v_edge_points ORDER BY source_id, length(slot), slot, length(channel), channel"),
    // v_hierarchy_nodes: a plant node's name is the plant's.
    query("SELECT id, name, type, parent_id FROM v_hierarchy_nodes WHERE type <> 'machine' ORDER BY sort_order, name"),
    query("SELECT id, name FROM machines ORDER BY id"),
  ]);
  return {
    formats: formats.rows.map(toFormat),
    brokers: brokers.rows.map(toBroker),
    gateways: gateways.rows.map(toGateway),
    sources: sources.rows.map(toSource),
    cards: cards.rows.map(toCard),
    points: points.rows.map(toPoint),
    sites: sites.rows.map(
      (r): EdgeSiteOption => ({ id: String(r.id), name: String(r.name), type: r.type as EdgeSiteOption["type"], parentId: str(r.parent_id) }),
    ),
    machines: machines.rows.map((r): EdgeMachineOption => ({ id: String(r.id), name: String(r.name) })),
  };
}

/** Broker settings for the MQTT runtime, secrets included. Never send to a browser. */
export async function getRuntimeBrokers(): Promise<RuntimeBrokerConfig[]> {
  await ensureEdgeRegistry();
  const res = await query("SELECT * FROM edge_brokers ORDER BY sort_order, created_at, name");
  return res.rows.map(toRuntimeBroker);
}

/** One stored broker with secrets, for a connection test that keeps the saved password. */
export async function getRuntimeBroker(id: string): Promise<RuntimeBrokerConfig | null> {
  await ensureEdgeRegistry();
  const res = await query("SELECT * FROM edge_brokers WHERE id = $1", [id]);
  return res.rows[0] ? toRuntimeBroker(res.rows[0]) : null;
}

/** An enabled gateway assigned to a broker, with its resolved data format. Server only. */
export interface RuntimeGatewayConfig {
  id: string;
  code: string;
  brokerId: string;
  /** The ULTRON contract when the gateway has no format (or an unknown one). */
  format: EdgeFormat;
  /** Extra subscribed topic filters (EdgeGateway.topics). */
  topics: string[];
}

/** Enabled gateways with a broker, for the MQTT runtime's subscriptions and parsing. */
export async function getRuntimeGateways(): Promise<RuntimeGatewayConfig[]> {
  await ensureEdgeRegistry();
  const [gateways, formats] = await Promise.all([
    query("SELECT id, code, broker_id, format_id, topics FROM v_edge_gateways WHERE enabled = TRUE AND broker_id IS NOT NULL ORDER BY sort_order, name"),
    query("SELECT * FROM edge_formats"),
  ]);
  const byId = new Map(formats.rows.map((r) => [String(r.id), toFormat(r)]));
  return gateways.rows.map((r) => ({
    id: String(r.id),
    code: String(r.code),
    brokerId: String(r.broker_id),
    format: (r.format_id ? byId.get(String(r.format_id)) : undefined) ?? ULTRON_FORMAT,
    topics: Array.isArray(r.topics) ? (r.topics as unknown[]).filter((t): t is string => typeof t === "string") : [],
  }));
}

// ---------------------------------------------------------------- validation
// Each normaliser reads an untrusted body. `partial` (PATCH) validates only the
// fields present; create requires the full set.

type Issues = string[];

class Reader {
  issues: Issues = [];
  constructor(
    private body: Record<string, unknown>,
    private partial: boolean,
  ) {}

  private has(key: string) {
    return Object.prototype.hasOwnProperty.call(this.body, key);
  }

  private skip(key: string, required: boolean): boolean {
    if (this.has(key)) return false;
    if (required && !this.partial) this.issues.push(`${key} is required`);
    return true;
  }

  text(key: string, { required = false, max = 255, pattern }: { required?: boolean; max?: number; pattern?: [RegExp, string] } = {}) {
    if (this.skip(key, required)) return undefined;
    const v = this.body[key];
    if (v === null || v === "") {
      if (required) this.issues.push(`${key} is required`);
      return required ? undefined : null;
    }
    if (typeof v !== "string") return void this.issues.push(`${key} must be text`);
    const t = v.trim();
    if (!t && required) return void this.issues.push(`${key} is required`);
    if (t.length > max) return void this.issues.push(`${key} is longer than ${max} characters`);
    if (pattern && t && !pattern[0].test(t)) return void this.issues.push(`${key} ${pattern[1]}`);
    return t || null;
  }

  /** Card / channel id: text or a number, stored as text. */
  ident(key: string, required = false) {
    if (this.skip(key, required)) return undefined;
    const v = this.body[key];
    if (v === null || v === "") {
      if (required) this.issues.push(`${key} is required`);
      return required ? undefined : null;
    }
    const t = typeof v === "number" && Number.isFinite(v) ? String(v) : typeof v === "string" ? v.trim() : null;
    if (!t || t.length > 128) return void this.issues.push(`${key} must be text up to 128 characters`);
    return t;
  }

  int(key: string, { required = false, min = -Infinity, max = Infinity }: { required?: boolean; min?: number; max?: number } = {}) {
    if (this.skip(key, required)) return undefined;
    const v = this.body[key];
    if (v === null || v === "") {
      if (required) this.issues.push(`${key} is required`);
      return required ? undefined : null;
    }
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
      return void this.issues.push(`${key} must be a whole number${Number.isFinite(min) ? ` from ${min}` : ""}${Number.isFinite(max) ? ` to ${max}` : ""}`);
    }
    return n;
  }

  num(key: string) {
    if (this.skip(key, false)) return undefined;
    const v = this.body[key];
    if (v === null || v === "") return null;
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n !== "number" || !Number.isFinite(n)) return void this.issues.push(`${key} must be a number`);
    return n;
  }

  bool(key: string, required = false) {
    if (this.skip(key, required)) return undefined;
    const v = this.body[key];
    if (typeof v !== "boolean") return void this.issues.push(`${key} must be true or false`);
    return v;
  }

  oneOf<T extends string | number>(key: string, values: readonly T[], { required = false, nullable = false } = {}) {
    if (this.skip(key, required)) return undefined;
    const v = this.body[key];
    if (v === null && nullable) return null;
    if (!values.includes(v as T)) return void this.issues.push(`${key} must be one of ${values.join(", ")}`);
    return v as T;
  }

  /** Secrets: absent keeps the stored value, "" / null clears it. */
  secret(key: string, max = 16_384) {
    if (!this.has(key)) return undefined;
    const v = this.body[key];
    if (v === null || v === "") return null;
    if (typeof v !== "string" || v.length > max) return void this.issues.push(`${key} invalid`);
    return v;
  }

  list(key: string, required = false) {
    if (this.skip(key, required)) return undefined;
    const v = this.body[key];
    if (!Array.isArray(v) || v.some((c) => typeof c !== "string")) return void this.issues.push(`${key} must be a list of text`);
    return [...new Set((v as string[]).map((c) => c.trim().toUpperCase()).filter(Boolean))].slice(0, 32);
  }

  /** MQTT topic filters: wildcards whole levels only, `#` last, and a fixed first level (no fleet-wide `#`). */
  topicFilters(key: string) {
    if (this.skip(key, false)) return undefined;
    const v = this.body[key];
    if (!Array.isArray(v) || v.some((t) => typeof t !== "string")) return void this.issues.push(`${key} must be a list of topic filters`);
    const filters = [...new Set((v as string[]).map((t) => t.trim()).filter(Boolean))];
    if (filters.length > MAX_GATEWAY_TOPICS) return void this.issues.push(`${key}: at most ${MAX_GATEWAY_TOPICS} topics per gateway`);
    for (const f of filters) {
      if (!isValidFilter(f)) this.issues.push(`“${f}” is not a valid MQTT topic filter`);
      else if (f.split("/")[0] === "+" || f.split("/")[0] === "#" || f.startsWith("$")) {
        this.issues.push(`“${f}” must start with a fixed topic level, not a wildcard or a $SYS topic`);
      }
    }
    return filters;
  }

  done() {
    if (this.issues.length) throw new EdgeError("VALIDATION", this.issues.join("; "), 400);
  }
}

// MQTT identity segments: no wildcards or separators, which would break the topic tree.
const MAX_GATEWAY_TOPICS = 16;
const CODE_PATTERN: [RegExp, string] = [/^[^/#+\s]+$/, "must not contain spaces, “/”, “#” or “+”"];
const PREFIX_PATTERN: [RegExp, string] = [/^[^#+\s]+(\/[^#+\s]+)*$/, "must be a topic path without wildcards"];
const HOST_PATTERN: [RegExp, string] = [/^[A-Za-z0-9.\-:[\]]+$/, "must be a host name or IP address"];

type Columns = Record<string, unknown>;

function brokerColumns(body: Record<string, unknown>, partial: boolean): Columns {
  const r = new Reader(body, partial);
  const c: Columns = {
    name: r.text("name", { required: true }),
    host: r.text("host", { required: true, pattern: HOST_PATTERN }),
    port: r.int("port", { required: true, min: 1, max: 65535 }),
    tls: r.bool("tls", true),
    protocol_version: r.oneOf("protocolVersion", [4, 5] as const, { nullable: true }),
    username: r.text("username"),
    password: r.secret("password", 1024),
    client_id_prefix: r.text("clientIdPrefix", { max: 100, pattern: CODE_PATTERN }),
    topic_prefix: r.text("topicPrefix", { pattern: PREFIX_PATTERN }),
    qos: r.oneOf("qos", [0, 1] as const),
    reject_unauthorized: r.bool("rejectUnauthorized"),
    ca_cert: r.secret("caCert"),
    client_cert: r.secret("clientCert"),
    client_key: r.secret("clientKey"),
    allowed_commands: r.list("allowedCommands"),
    enabled: r.bool("enabled"),
    notes: r.text("notes", { max: 2000 }),
  };
  r.done();
  if (c.allowed_commands !== undefined) c.allowed_commands = JSON.stringify(c.allowed_commands);
  // Empty prefixes fall back to the contract defaults.
  if (c.client_id_prefix === null) c.client_id_prefix = DEFAULT_CLIENT_ID_PREFIX;
  if (c.topic_prefix === null) c.topic_prefix = DEFAULT_TOPIC_PREFIX;
  if (typeof c.topic_prefix === "string") c.topic_prefix = c.topic_prefix.replace(/\/+$/, "");
  return c;
}

function gatewayColumns(body: Record<string, unknown>, partial: boolean): Columns {
  const r = new Reader(body, partial);
  const c: Columns = {
    code: r.text("code", { required: true, max: 128, pattern: CODE_PATTERN }),
    name: r.text("name", { required: true }),
    broker_id: r.text("brokerId", { max: 64 }),
    format_id: r.text("formatId", { max: 64 }),
    // Stored as rows of edge_gateway_topics (see writeExtras).
    topics: r.topicFilters("topics"),
    site_node_id: r.text("siteNodeId", { max: 64 }),
    location: r.text("location"),
    ip_address: r.text("ipAddress", { max: 64 }),
    model: r.text("model"),
    firmware: r.text("firmware", { max: 128 }),
    enabled: r.bool("enabled"),
    notes: r.text("notes", { max: 2000 }),
  };
  r.done();
  return c;
}

function cardColumns(body: Record<string, unknown>, partial: boolean): Columns {
  const r = new Reader(body, partial);
  const c: Columns = {
    source_id: r.text("sourceId", { required: true, max: 64 }),
    code: r.ident("code", true),
    card_type: r.text("cardType", { max: 64 }),
    channel_count: r.int("channelCount", { min: 0, max: 4096 }),
    model: r.text("model"),
    notes: r.text("notes", { max: 2000 }),
    enabled: r.bool("enabled"),
  };
  r.done();
  return c;
}

function sourceColumns(body: Record<string, unknown>, partial: boolean): Columns {
  const r = new Reader(body, partial);
  const c: Columns = {
    gateway_id: r.text("gatewayId", { required: true, max: 64 }),
    code: r.text("code", { required: true, max: 128, pattern: CODE_PATTERN }),
    name: r.text("name", { required: true }),
    kind: r.oneOf("kind", SOURCE_KINDS, { required: true }),
    protocol: r.text("protocol", { required: true, max: 64 }),
    endpoint: r.text("endpoint", { max: 512 }),
    location: r.text("location"),
    machine_id: r.text("machineId", { max: 64 }),
    model: r.text("model"),
    poll_interval_ms: r.int("pollIntervalMs", { min: 1, max: 86_400_000 }),
    enabled: r.bool("enabled"),
    notes: r.text("notes", { max: 2000 }),
  };
  r.done();
  return c;
}

function pointColumns(body: Record<string, unknown>, partial: boolean): Columns {
  const r = new Reader(body, partial);
  // Hardware only: tag, name, unit and limits belong to the measurement.
  const c: Columns = {
    source_id: r.text("sourceId", { required: true, max: 64 }),
    slot: r.ident("slot", true),
    channel: r.ident("channel"),
    address: r.text("address"),
    data_type: r.oneOf("dataType", ["float", "int", "bool", "string", "video", "status+map"] as const),
    sample_rate: r.text("sampleRate", { max: 128 }),
    source_tag: r.text("sourceTag"),
    // Resolved to measurement_id (see writeExtras); the point stores only the measurement.
    machine_id: r.text("machineId", { max: 64 }),
    tag: r.text("tag", { max: 128 }),
    enabled: r.bool("enabled"),
  };
  r.done();
  if (c.channel === null) c.channel = "1";
  return c;
}

function formatColumns(body: Record<string, unknown>, partial: boolean): Columns {
  const r = new Reader(body, partial);
  const c: Columns = {
    name: r.text("name", { required: true }),
    description: r.text("description", { max: 2000 }),
    kind: r.oneOf("kind", ["json"] as const),
    topic: r.text("topic", { required: true, max: 512 }),
    records: r.text("records", { max: 512 }),
    timestamp_format: r.oneOf("timestampFormat", TIMESTAMP_FORMATS),
  };
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
  let fields: FormatFields | undefined;
  if (has("fields")) {
    const f = body.fields;
    if (typeof f !== "object" || f === null || Array.isArray(f)) r.issues.push("fields must be an object");
    else {
      const raw = f as Record<string, unknown>;
      fields = Object.fromEntries(FORMAT_FIELD_KEYS.map((k) => [k, typeof raw[k] === "string" ? (raw[k] as string).trim().slice(0, 256) : ""])) as unknown as FormatFields;
      c.fields = JSON.stringify(fields);
    }
  } else if (!partial) r.issues.push("fields is required");
  if (has("defaults")) {
    const d = body.defaults as Record<string, unknown> | null;
    const pick = (k: string, fb: string) => (d && typeof d[k] === "string" && (d[k] as string).trim() ? (d[k] as string).trim().slice(0, 128) : fb);
    c.defaults = JSON.stringify({ rack: pick("rack", "R1"), card: pick("card", "1"), channel: pick("channel", "1") });
  }
  r.done();
  if (c.records === null) c.records = "";
  // Structural checks shared with the editor's preview.
  const problems = checkFormat({
    kind: "json",
    topic: typeof c.topic === "string" ? c.topic : "x",
    records: typeof c.records === "string" ? c.records : "",
    fields: fields ?? (Object.fromEntries(FORMAT_FIELD_KEYS.map((k) => [k, ""])) as unknown as FormatFields),
  });
  if (problems.length) throw new EdgeError("VALIDATION", problems.join(" "), 400);
  return c;
}

const KINDS: Record<
  EdgeKind,
  { table: string; view?: string; prefix: string; columns: (b: Record<string, unknown>, partial: boolean) => Columns; map: (r: Row) => unknown; label: string; timestamps: boolean }
> = {
  formats: { table: "edge_formats", prefix: "fmt", columns: formatColumns, map: toFormat, label: "Format", timestamps: true },
  brokers: { table: "edge_brokers", prefix: "brk", columns: brokerColumns, map: toBroker, label: "Broker", timestamps: true },
  gateways: { table: "edge_gateways", view: "v_edge_gateways", prefix: "gw", columns: gatewayColumns, map: toGateway, label: "Gateway", timestamps: true },
  sources: { table: "edge_sources", prefix: "src", columns: sourceColumns, map: toSource, label: "Source", timestamps: true },
  cards: { table: "edge_cards", prefix: "card", columns: cardColumns, map: toCard, label: "Card", timestamps: false },
  points: { table: "edge_points", view: "v_edge_points", prefix: "pt", columns: pointColumns, map: toPoint, label: "Point", timestamps: false },
};

export function isEdgeKind(kind: string): kind is EdgeKind {
  return Object.prototype.hasOwnProperty.call(KINDS, kind);
}

/** Postgres constraint failures become messages a person can act on. */
function translate(err: unknown, kind: EdgeKind): never {
  const e = err as { code?: string; constraint?: string };
  if (e?.code === "23505") {
    const what =
      kind === "gateways" ? "A gateway with this ID already exists on this broker." :
      kind === "sources" ? "This gateway already has a source with this ID." :
      kind === "points" ? "This source already has a point on that card and channel." :
      "That ID is already in use.";
    throw new EdgeError("CONFLICT", what, 409);
  }
  if (e?.code === "23503") {
    const what = kind === "gateways" ? "The selected broker or data format does not exist." : kind === "sources" ? "The parent gateway does not exist." : "The parent source does not exist.";
    throw new EdgeError("VALIDATION", what, 400);
  }
  throw err;
}

function defined(cols: Columns): [string, unknown][] {
  return Object.entries(cols).filter(([, v]) => v !== undefined);
}

// ---------------------------------------------------------------- writes
/** Columns that are not stored on the row itself: a gateway's topics, a point's machine + measurement tag. */
type Extras = { topics?: unknown; machineId?: string | null; tag?: string | null };

function splitExtras(kind: EdgeKind, entries: [string, unknown][]): { entries: [string, unknown][]; extras: Extras } {
  const extras: Extras = {};
  const kept = entries.filter(([k, v]) => {
    if (kind === "gateways" && k === "topics") return void (extras.topics = v), false;
    if (kind === "points" && k === "machine_id") return void (extras.machineId = v as string | null), false;
    if (kind === "points" && k === "tag") return void (extras.tag = v as string | null), false;
    return true;
  });
  return { entries: kept, extras };
}

/** Writes the extras to their own tables: topics rows, or the point's measurement link. */
async function writeExtras(kind: EdgeKind, id: string, extras: Extras, db: { query: typeof query } = { query }): Promise<void> {
  if (kind === "gateways" && extras.topics !== undefined) {
    const filters = Array.isArray(extras.topics) ? (extras.topics as string[]) : [];
    await db.query("DELETE FROM edge_gateway_topics WHERE gateway_id = $1", [id]);
    for (const [i, f] of filters.entries()) await db.query("INSERT INTO edge_gateway_topics (gateway_id, filter, sort_order) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [id, f, i]);
  }
  if (kind === "points" && (extras.machineId !== undefined || extras.tag !== undefined)) {
    let measurementId: string | null = null;
    // A tag alone (machine absent from a PATCH) keeps the point's machine.
    const machineId = extras.machineId !== undefined ? extras.machineId : (await db.query<{ machine_id: string | null }>("SELECT machine_id FROM v_edge_points WHERE id = $1", [id])).rows[0]?.machine_id ?? null;
    if (machineId) {
      const tag = extras.tag !== undefined ? extras.tag : (await db.query<{ tag: string | null }>("SELECT tag FROM v_edge_points WHERE id = $1", [id])).rows[0]?.tag;
      if (!tag) throw new EdgeError("VALIDATION", `Pick the ${machineId} sensor this reading point feeds.`, 400);
      const m = (await db.query<{ measurement_id: string }>("SELECT measurement_id FROM v_measurement_context WHERE machine_id = $1 AND tag = $2", [machineId, tag])).rows[0];
      if (!m) throw new EdgeError("VALIDATION", `${extras.machineId} has no measurement ${tag}; map the channel to create one.`, 400);
      measurementId = m.measurement_id;
    }
    await db.query("UPDATE edge_points SET measurement_id = $2 WHERE id = $1", [id, measurementId]);
  }
}

async function readBack<K extends EdgeKind>(kind: K, id: string): Promise<EdgeEntityByKind[K]> {
  const spec = KINDS[kind];
  const res = await query(`SELECT * FROM ${spec.view ?? spec.table} WHERE id = $1`, [id]);
  if (!res.rows[0]) throw new EdgeError("NOT_FOUND", `${spec.label} ${id} not found.`, 404);
  return spec.map(res.rows[0]) as EdgeEntityByKind[K];
}

export async function createEdgeEntity<K extends EdgeKind>(kind: K, body: Record<string, unknown>): Promise<EdgeEntityByKind[K]> {
  await ensureEdgeRegistry();
  const spec = KINDS[kind];
  const { entries, extras } = splitExtras(kind, defined(spec.columns(body, false)));
  const id = `${spec.prefix}-${randomUUID().slice(0, 8)}`;
  const names = ["id", ...entries.map(([k]) => k)];
  const values = [id, ...entries.map(([, v]) => v)];
  const sql = `INSERT INTO ${spec.table} (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")})`;
  try {
    await query(sql, values);
    await writeExtras(kind, id, extras);
    return await readBack(kind, id);
  } catch (err) {
    if (err instanceof EdgeError) throw err;
    translate(err, kind);
  }
}

function guardBuiltIn(kind: EdgeKind, id: string) {
  if (kind === "formats" && id === ULTRON_FORMAT_ID) throw new EdgeError("VALIDATION", "The ULTRON contract is built in and cannot be changed.", 400);
}

export async function updateEdgeEntity<K extends EdgeKind>(kind: K, id: string, body: Record<string, unknown>): Promise<EdgeEntityByKind[K]> {
  await ensureEdgeRegistry();
  guardBuiltIn(kind, id);
  const spec = KINDS[kind];
  const { entries, extras } = splitExtras(kind, defined(spec.columns(body, true)));
  if (spec.timestamps) entries.push(["updated_at", new Date()]);
  if (entries.length === 0 && Object.keys(extras).length === 0) throw new EdgeError("VALIDATION", "Nothing to update.", 400);
  try {
    if (entries.length) {
      const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(", ");
      const res = await query(`UPDATE ${spec.table} SET ${sets} WHERE id = $1`, [id, ...entries.map(([, v]) => v)]);
      if (!res.rowCount) throw new EdgeError("NOT_FOUND", `${spec.label} ${id} not found.`, 404);
    }
    await writeExtras(kind, id, extras);
    return await readBack(kind, id);
  } catch (err) {
    if (err instanceof EdgeError) throw err;
    translate(err, kind);
  }
}

export async function deleteEdgeEntity(kind: EdgeKind, id: string): Promise<void> {
  await ensureEdgeRegistry();
  guardBuiltIn(kind, id);
  const spec = KINDS[kind];
  const res = await query(`DELETE FROM ${spec.table} WHERE id = $1`, [id]);
  if (res.rowCount === 0) throw new EdgeError("NOT_FOUND", `${spec.label} ${id} not found.`, 404);
}

// ---------------------------------------------------------------- mapping
/**
 * Map one channel to a machine signal in one transaction: the rack becomes a
 * source if it is not one yet, the channel a point (updated if it exists), and
 * the tag joins the machine's sensor list (mapped_signals) when it is new, so
 * every machine page lists it.
 */
export async function mapEdgeChannel(body: Record<string, unknown>): Promise<EdgeMapResult> {
  await ensureEdgeRegistry();
  const r = new Reader(body, false);
  const input = {
    gatewayId: r.text("gatewayId", { required: true, max: 64 }),
    rack: r.text("rack", { required: true, max: 128, pattern: CODE_PATTERN }),
    card: r.ident("card", true),
    channel: r.ident("channel", true),
    machineId: r.text("machineId", { required: true, max: 64 }),
    tag: r.text("tag", { required: true, max: 128 }),
    // Only for a new measurement (checked below); an existing one keeps its own.
    name: r.text("name"),
    unit: r.text("unit", { max: 32 }),
    alertLimit: r.num("alertLimit"),
    dangerLimit: r.num("dangerLimit"),
    sourceKind: r.oneOf("sourceKind", SOURCE_KINDS),
    subassemblyId: r.text("subassemblyId", { max: 64 }),
  } as Partial<Record<keyof EdgeMapInput, unknown>>;
  r.done();
  const v = input as unknown as EdgeMapInput;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const gw = (await client.query("SELECT * FROM edge_gateways WHERE id = $1", [v.gatewayId])).rows[0];
    if (!gw) throw new EdgeError("NOT_FOUND", `Gateway ${v.gatewayId} not found.`, 404);
    const machine = (await client.query("SELECT id, name FROM machines WHERE id = $1", [v.machineId])).rows[0];
    if (!machine) throw new EdgeError("VALIDATION", `Machine ${v.machineId} does not exist.`, 400);

    let src = (await client.query("SELECT * FROM edge_sources WHERE gateway_id = $1 AND code = $2", [v.gatewayId, v.rack])).rows[0];
    const sourceCreated = !src;
    if (!src) {
      const kind = v.sourceKind ?? "rack";
      src = (
        await client.query(
          `INSERT INTO edge_sources (id, gateway_id, code, name, kind, protocol, machine_id, enabled)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING *`,
          [`src-${randomUUID().slice(0, 8)}`, v.gatewayId, v.rack, `${v.rack}`, kind, kind === "rack" ? "Backplane" : "OPC UA", v.machineId],
        )
      ).rows[0];
    }

    await client.query(
      `INSERT INTO edge_cards (id, source_id, code, enabled) VALUES ($1, $2, $3, TRUE) ON CONFLICT (source_id, code) DO NOTHING`,
      [`card-${randomUUID().slice(0, 8)}`, src.id, v.card],
    );
    const existing = (await client.query("SELECT * FROM edge_points WHERE source_id = $1 AND slot = $2 AND channel = $3", [src.id, v.card, v.channel])).rows[0];
    const point = existing
      ? (await client.query("UPDATE edge_points SET enabled = TRUE WHERE id = $1 RETURNING *", [existing.id])).rows[0]
      : (
          await client.query(
            `INSERT INTO edge_points (id, source_id, slot, channel, data_type, enabled)
             VALUES ($1, $2, $3, $4, 'float', TRUE) RETURNING *`,
            [`pt-${randomUUID().slice(0, 8)}`, src.id, v.card, v.channel],
          )
        ).rows[0];

    // The machine's measurement. An existing tag is linked as it is (its name,
    // unit and limits are not touched); a new one is created on the chosen
    // component, with its name, unit, limit and the acquisition path of this
    // channel. The point stores only the link.
    const known = (
      await client.query<{ measurement_id: string }>("SELECT measurement_id FROM v_measurement_context WHERE machine_id = $1 AND tag = $2", [v.machineId, v.tag])
    ).rows[0];
    let measurementId = known?.measurement_id ?? null;
    let signalCreated = false;
    if (!measurementId) {
      if (!v.name) throw new EdgeError("VALIDATION", "name is required for a new sensor", 400);
      const subs = (
        await client.query<{ id: string }>(
          "SELECT sa.id FROM machine_subassemblies sa JOIN machine_systems sy ON sy.id = sa.machine_system_ref_id WHERE sy.machine_id = $1",
          [v.machineId],
        )
      ).rows.map((x) => x.id);
      const subId = v.subassemblyId ?? (subs.length === 1 ? subs[0] : null);
      if (!subId) throw new EdgeError("VALIDATION", subs.length ? "Choose the component this new sensor sits on." : `${v.machineId} has no components yet; add one before mapping new sensors.`, 400);
      if (!subs.includes(subId)) throw new EdgeError("VALIDATION", `Component ${subId} is not part of ${v.machineId}.`, 400);
      const unit = v.unit?.trim() || null;
      let unitId: string | null = null;
      let quantity = "state";
      if (unit) {
        unitId = (await client.query<{ id: string }>("SELECT id FROM units WHERE symbol = $1", [unit])).rows[0]?.id ?? null;
        if (!unitId) {
          unitId = `u-${randomUUID().slice(0, 8)}`;
          await client.query("INSERT INTO units (id, symbol, name) VALUES ($1, $2, $2)", [unitId, unit]);
        }
        // The quantity most measurements with this unit describe; a new unit is an unclassified ratio until edited.
        quantity =
          (await client.query<{ quantity_id: string }>("SELECT quantity_id FROM measurements WHERE unit_id = $1 GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1", [unitId])).rows[0]
            ?.quantity_id ?? "ratio";
      }
      const pointId = (
        await client.query<{ id: number }>(
          `INSERT INTO measurement_points (subassembly_id, code, location) VALUES ($1, $2, $3)
           ON CONFLICT (subassembly_id, code) DO UPDATE SET code = EXCLUDED.code RETURNING id`,
          [subId, v.tag, `${gw.code} › ${v.rack} › card ${v.card} · ch ${v.channel}`],
        )
      ).rows[0].id;
      measurementId = `${v.machineId}-${v.tag}`;
      await client.query(
        `INSERT INTO measurements (id, point_id, tag, name, quantity_id, unit_id, statistic_id, origin_id, value_kind, decimals, acquisition_text)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'online', $8, 2, 'As published by the gateway')`,
        [measurementId, pointId, v.tag, v.name, quantity, unitId, unit ? "instantaneous" : "state", unit ? "analog" : "state"],
      );
      await client.query("INSERT INTO measurement_acquisition (measurement_id, rack, card, address) VALUES ($1, $2, $3, $4)", [
        measurementId,
        `${gw.code} › ${v.rack}`,
        `Card ${v.card} · Ch ${v.channel}`,
        `${gw.code}/${v.rack}/${v.card}/${v.channel}`,
      ]);
      if (v.alertLimit != null && v.dangerLimit != null) {
        await client.query(
          "INSERT INTO measurement_limits (measurement_id, kind_id, warn_value, alarm_value, source) VALUES ($1, 'hi', $2, $3, 'Entered when the channel was mapped')",
          [measurementId, v.alertLimit, v.dangerLimit],
        );
      }
      await client.query(
        `INSERT INTO machine_events (machine_id, event_type_id, occurred_at, measurement_id, title, description, source)
         VALUES ($1, 'measurement_change', NOW(), $2, $3, $4, 'Edge mapping')`,
        [v.machineId, measurementId, `New measurement ${v.tag}`, `Mapped from ${gw.code} › ${v.rack} › card ${v.card} · ch ${v.channel}`],
      );
      signalCreated = true;
    }
    await client.query("UPDATE edge_points SET measurement_id = $2 WHERE id = $1", [point.id, measurementId]);
    const mapped = (await client.query("SELECT * FROM v_edge_points WHERE id = $1", [point.id])).rows[0];

    await client.query("COMMIT");
    return { source: toSource(src), point: toPoint(mapped), sourceCreated, signalCreated };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (err instanceof EdgeError) throw err;
    translate(err, "points");
  } finally {
    client.release();
  }
}

/** Points mapped to a machine with their gateway and source, for the machine's acquisition view. */
export async function getMachinePointRows(machineId: string) {
  await ensureEdgeRegistry();
  const res = await query(
    `SELECT p.*, row_to_json(s.*) AS source_row, row_to_json(g.*) AS gateway_row, row_to_json(c.*) AS card_row, b.name AS broker_name
       FROM v_edge_points p
       JOIN edge_sources s ON s.id = p.source_id
       JOIN v_edge_gateways g ON g.id = s.gateway_id
       LEFT JOIN edge_cards c ON c.source_id = p.source_id AND c.code = p.slot
       LEFT JOIN edge_brokers b ON b.id = g.broker_id
      WHERE p.machine_id = $1 OR (p.machine_id IS NULL AND s.machine_id = $1)
      ORDER BY g.name, s.sort_order, s.name, length(p.slot), p.slot, length(p.channel), p.channel`,
    [machineId],
  );
  return res.rows.map((r) => ({
    point: toPoint(r),
    source: toSource(r.source_row as Row),
    gateway: toGateway(r.gateway_row as Row),
    card: r.card_row ? toCard(r.card_row as Row) : null,
    brokerName: str(r.broker_name),
  }));
}

/**
 * A machine's cabinet (chassis → card → channel) from the registry: one
 * chassis per source, one module per card, one channel per point, joined with
 * the machine's signal register for instrument and register details. The same
 * points the Acquisition view reads (getMachinePointRows), so both views count
 * the same hardware. Null when the machine has no registry points.
 */
export async function getMachineCabinet(machineId: string): Promise<MachineRackInfo[] | null> {
  await ensureEdgeRegistry();
  const res = await query(
    `SELECT p.tag, p.name, p.source_tag, p.slot, p.channel, p.address, p.unit, p.sample_rate,
            s.id AS source_id, s.code AS source_code, s.name AS source_name, s.kind, s.protocol, s.sort_order,
            g.code AS gateway_code, g.name AS gateway_name, g.sort_order AS gateway_order,
            c.card_type, c.model AS card_model, c.notes AS card_notes, c.channel_count,
            p.measurement_id, it.name AS instrument, ms.sensor_type, ms.normal_text AS normal_threshold, mc.subassembly_name AS component
       FROM v_edge_points p
       JOIN edge_sources s ON s.id = p.source_id
       JOIN edge_gateways g ON g.id = s.gateway_id
       LEFT JOIN edge_cards c ON c.source_id = p.source_id AND c.code = p.slot
       LEFT JOIN measurements ms ON ms.id = p.measurement_id
       LEFT JOIN v_measurement_context mc ON mc.measurement_id = p.measurement_id
       LEFT JOIN instrument_types it ON it.id = ms.instrument_type_id
      WHERE p.machine_id = $1 OR (p.machine_id IS NULL AND s.machine_id = $1)`,
    [machineId],
  );
  if (res.rows.length === 0) return null;
  const ids = res.rows.map((r) => r.measurement_id).filter(Boolean) as string[];
  const [latest, severity, quality] = await Promise.all([
    latestReadings({ measurementIds: ids }),
    measurementSeverityNow([machineId]),
    dataQualityNow([machineId], 1),
  ]);
  const sourceOrder = [...new Map(res.rows.map((r) => [String(r.source_id), r])).values()].sort(
    (a, b) => Number(a.gateway_order) - Number(b.gateway_order) || Number(a.sort_order) - Number(b.sort_order) || String(a.source_code).localeCompare(String(b.source_code)),
  );
  const orderOf = new Map(sourceOrder.map((r, i) => [String(r.source_id), i]));
  const text = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const rows: CabinetRow[] = res.rows.map((r) => {
    const kind = (SOURCE_KINDS as string[]).includes(String(r.kind)) ? (r.kind as SourceKind) : "other";
    const slot = String(r.slot);
    return {
      chassisKey: String(r.source_id),
      chassisCode: String(r.source_code),
      chassisName: String(r.source_name),
      kindLabel: SOURCE_KIND_LABEL[kind],
      protocol: String(r.protocol),
      gateway: String(r.gateway_code),
      chassisOrder: orderOf.get(String(r.source_id)) ?? 0,
      cardCode: slot,
      cardModel: str(r.card_model),
      cardType: str(r.card_type),
      cardNote: str(r.card_notes),
      cardCapacity: numOrNull(r.channel_count),
      cardPosition: /^[1-9]\d*$/.test(slot) ? Number(slot) : null,
      channel: String(r.channel),
      // The measurement's tag and name; a point that feeds none shows its device tag.
      tag: text(r.tag ?? r.source_tag),
      parameter: text(r.name),
      unit: text(r.unit),
      instrument: text(r.instrument),
      sensorTypeText: text(r.sensor_type),
      sampleRate: text(r.sample_rate),
      address: text(r.address),
      quality: r.measurement_id && quality.get(String(r.measurement_id)) ? `${quality.get(String(r.measurement_id))!.usablePct}% Good` : "No data",
      component: text(r.component),
      normalRange: text(r.normal_threshold),
      currentValue: (() => {
        const l = r.measurement_id ? latest.get(String(r.measurement_id)) : undefined;
        return !l ? "No data" : (l.state ?? (l.value === null ? "—" : String(l.value)));
      })(),
      status: (r.measurement_id && severity.get(String(r.measurement_id))) || "Normal",
    };
  });
  return buildCabinet(rows, "edge-registry");
}


// ---------------------------------------------------------------- tags
/**
 * Delete a tag: its card (one card = one sensor) and the points on it, under
 * a gateway's rack / PLC / SCADA. A tag that is only in the live data has no
 * rows; the caller still clears its reading. Returns where the live data sits.
 */
export async function deleteEdgeTag(body: Record<string, unknown>): Promise<{ brokerId: string | null; gatewayCode: string; cards: number; points: number }> {
  await ensureEdgeRegistry();
  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const gatewayId = str("gatewayId");
  const rack = str("rack");
  const card = str("card");
  if (!gatewayId || !rack || !card) throw new EdgeError("VALIDATION", "gatewayId, rack and card are required", 400);
  const gw = (await query("SELECT code, broker_id FROM edge_gateways WHERE id = $1", [gatewayId])).rows[0];
  if (!gw) throw new EdgeError("NOT_FOUND", `Gateway ${gatewayId} not found.`, 404);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const src = (await client.query("SELECT id FROM edge_sources WHERE gateway_id = $1 AND code = $2", [gatewayId, rack])).rows[0];
    let points = 0;
    let cards = 0;
    if (src) {
      points = (await client.query("DELETE FROM edge_points WHERE source_id = $1 AND slot::text = $2", [src.id, card])).rowCount ?? 0;
      cards = (await client.query("DELETE FROM edge_cards WHERE source_id = $1 AND code = $2", [src.id, card])).rowCount ?? 0;
    }
    await client.query("COMMIT");
    return { brokerId: gw.broker_id ? String(gw.broker_id) : null, gatewayCode: String(gw.code), cards, points };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------- auto-registration
export interface DetectedItem {
  rack: string;
  rackName: string | null;
  card: string;
  channel: string;
  cardType: string | null;
}

/** Rack / PLC / SCADA kind from what the payload calls it. */
export function kindFromName(...names: (string | null)[]): SourceKind {
  const text = names.filter(Boolean).join(" ").toLowerCase();
  if (/\bplc\b/.test(text)) return "plc";
  if (/\bscada\b/.test(text)) return "scada";
  if (/\bdcs\b/.test(text)) return "dcs";
  if (/analy[sz]er/.test(text)) return "analyzer";
  return "rack";
}

/**
 * Racks / PLCs / SCADA nodes and cards a JSON-format gateway reported that the
 * registry does not have yet. One card per id the payload gives (one card =
 * one sensor); existing rows are left as they are. Returns how many were added.
 */
export async function registerDetected(gatewayId: string, items: DetectedItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const racks = new Map<string, { name: string | null; cards: Map<string, { cardType: string | null; channels: Set<string> }> }>();
  for (const it of items) {
    const rack = it.rack.trim().slice(0, 128);
    const card = it.card.trim().slice(0, 128);
    if (!rack || !card) continue;
    let r = racks.get(rack);
    if (!r) racks.set(rack, (r = { name: it.rackName?.trim() || null, cards: new Map() }));
    let c = r.cards.get(card);
    if (!c) r.cards.set(card, (c = { cardType: it.cardType?.trim().slice(0, 64) || null, channels: new Set() }));
    c.channels.add(it.channel);
  }

  const client = await pool.connect();
  let added = 0;
  try {
    await client.query("BEGIN");
    for (const [code, r] of racks) {
      const src = await client.query(
        `INSERT INTO edge_sources (id, gateway_id, code, name, kind, protocol, sort_order)
         SELECT $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar, 'MQTT', COALESCE(MAX(sort_order) + 1, 0) FROM edge_sources WHERE gateway_id = $2::varchar
         ON CONFLICT (gateway_id, code) DO NOTHING`,
        [`src-${randomUUID().slice(0, 8)}`, gatewayId, code, (r.name ?? code).slice(0, 255), kindFromName(r.name, code)],
      );
      added += src.rowCount ?? 0;
      for (const [card, c] of r.cards) {
        const res = await client.query(
          `INSERT INTO edge_cards (id, source_id, code, card_type, channel_count, sort_order)
           SELECT $1::varchar, s.id, $4::varchar, $5::varchar, $6::int, (SELECT COALESCE(MAX(x.sort_order) + 1, 0) FROM edge_cards x WHERE x.source_id = s.id)
           FROM edge_sources s WHERE s.gateway_id = $2::varchar AND s.code = $3::varchar
           ON CONFLICT (source_id, code) DO NOTHING`,
          [`card-${randomUUID().slice(0, 8)}`, gatewayId, code, card, c.cardType, c.channels.size],
        );
        added += res.rowCount ?? 0;
      }
    }
    await client.query("COMMIT");
    return added;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
// ---------------------------------------------------------------- commissioning
/** Gateway + sources + cards in one transaction (see EdgeCommissionInput). */
export async function commissionGateway(body: Record<string, unknown>): Promise<EdgeCommissionResult> {
  await ensureEdgeRegistry();
  const gatewayIdIn = typeof body.gatewayId === "string" && body.gatewayId ? body.gatewayId : null;
  const gwBody = body.gateway;
  if (!gatewayIdIn && (typeof gwBody !== "object" || gwBody === null)) throw new EdgeError("VALIDATION", "gateway or gatewayId is required", 400);
  const sourcesIn = Array.isArray(body.sources) ? (body.sources as unknown[]) : null;
  if (!sourcesIn) throw new EdgeError("VALIDATION", "sources must be a list", 400);
  if (sourcesIn.length > 256) throw new EdgeError("VALIDATION", "At most 256 sources at once.", 400);

  // Validate everything before touching the database.
  const gwCols = gatewayIdIn ? null : gatewayColumns(gwBody as Record<string, unknown>, false);
  const sources = sourcesIn.map((raw, i) => {
    if (typeof raw !== "object" || raw === null) throw new EdgeError("VALIDATION", `sources[${i}] must be an object`, 400);
    const src = raw as Record<string, unknown>;
    // gatewayId is filled in after the gateway exists.
    const cols = sourceColumns({ ...src, gatewayId: "pending" }, false);
    const cardsRaw = Array.isArray(src.cards) ? (src.cards as unknown[]) : [];
    if (cardsRaw.length > 512) throw new EdgeError("VALIDATION", `sources[${i}] has more than 512 cards`, 400);
    const cards = cardsRaw.map((c) => cardColumns({ ...(c as Record<string, unknown>), sourceId: "pending" }, false));
    return { cols, cards };
  });

  const client = await pool.connect();
  let sourcesCreated = 0;
  let cardsCreated = 0;
  let skipped = 0;
  try {
    await client.query("BEGIN");
    let gwRow: Row;
    if (gatewayIdIn) {
      const found = (await client.query("SELECT * FROM v_edge_gateways WHERE id = $1", [gatewayIdIn])).rows[0];
      if (!found) throw new EdgeError("NOT_FOUND", `Gateway ${gatewayIdIn} not found.`, 404);
      gwRow = found;
    } else {
      const { entries, extras } = splitExtras("gateways", defined(gwCols!));
      const names = ["id", ...entries.map(([k]) => k)];
      const newId = `gw-${randomUUID().slice(0, 8)}`;
      await client.query(`INSERT INTO edge_gateways (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")})`, [newId, ...entries.map(([, v]) => v)]);
      await writeExtras("gateways", newId, extras, client as unknown as { query: typeof query });
      gwRow = (await client.query("SELECT * FROM v_edge_gateways WHERE id = $1", [newId])).rows[0];
    }

    for (const [order, { cols, cards }] of sources.entries()) {
      let src = (await client.query("SELECT id FROM edge_sources WHERE gateway_id = $1 AND code = $2", [gwRow.id, cols.code])).rows[0];
      if (src) skipped += 1;
      else {
        const entries = defined({ ...cols, gateway_id: gwRow.id, sort_order: order });
        const names = ["id", ...entries.map(([k]) => k)];
        src = (
          await client.query(
            `INSERT INTO edge_sources (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`,
            [`src-${randomUUID().slice(0, 8)}`, ...entries.map(([, v]) => v)],
          )
        ).rows[0];
        sourcesCreated += 1;
      }
      for (const [cardOrder, card] of cards.entries()) {
        const res = await client.query(
          `INSERT INTO edge_cards (id, source_id, code, card_type, channel_count, model, notes, enabled, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, TRUE), $9) ON CONFLICT (source_id, code) DO NOTHING`,
          [`card-${randomUUID().slice(0, 8)}`, src.id, card.code, card.card_type ?? null, card.channel_count ?? null, card.model ?? null, card.notes ?? null, card.enabled ?? null, cardOrder],
        );
        if (res.rowCount) cardsCreated += 1;
        else skipped += 1;
      }
    }
    await client.query("COMMIT");
    return { gateway: toGateway(gwRow), sourcesCreated, cardsCreated, skipped };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (err instanceof EdgeError) throw err;
    translate(err, gatewayIdIn ? "sources" : "gateways");
  } finally {
    client.release();
  }
}

/** Reads a stored broker merged with unsaved form values, for a connection test. */
export async function brokerConfigForTest(body: Record<string, unknown>, id: string | null): Promise<RuntimeBrokerConfig> {
  const stored = id ? await getRuntimeBroker(id) : null;
  if (id && !stored) throw new EdgeError("NOT_FOUND", `Broker ${id} not found.`, 404);
  const c = brokerColumns(body, stored !== null);
  const pick = <T>(col: string, fallback: T): T => (c[col] === undefined ? fallback : (c[col] as T));
  const pv = pick<number | null>("protocol_version", stored?.protocolVersion ?? null);
  return {
    id: stored?.id ?? "test",
    name: pick("name", stored?.name ?? "test"),
    host: pick("host", stored?.host ?? ""),
    port: pick("port", stored?.port ?? 1883),
    tls: pick("tls", stored?.tls ?? true),
    protocolVersion: pv === 4 || pv === 5 ? pv : null,
    username: pick("username", stored?.username ?? null),
    password: pick("password", stored?.password ?? null),
    clientIdPrefix: pick("client_id_prefix", stored?.clientIdPrefix ?? DEFAULT_CLIENT_ID_PREFIX),
    topicPrefix: pick("topic_prefix", stored?.topicPrefix ?? DEFAULT_TOPIC_PREFIX),
    qos: pick("qos", stored?.qos ?? 1),
    rejectUnauthorized: pick("reject_unauthorized", stored?.rejectUnauthorized ?? true),
    caCert: pick("ca_cert", stored?.caCert ?? null),
    clientCert: pick("client_cert", stored?.clientCert ?? null),
    clientKey: pick("client_key", stored?.clientKey ?? null),
    allowedCommands: [],
    enabled: true,
  };
}

// ---------------------------------------------------------------- seed
// Built from the plant data already in the database, so the registry starts
// as the network that feeds the existing machines. Nothing here is invented:
// sources and points come from the mapped signals' acquisition cards.

export type { EdgeBrokerInput, EdgeGatewayInput, EdgeSourceInput, EdgePointInput };
