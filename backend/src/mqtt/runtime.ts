// The application's broker connections: one MQTT client per broker in the edge
// registry (PostgreSQL, edited from Devices › MQTT), each subscribing to its
// gateway tree and publishing command requests down it.
//
//   gateway ──publish──▶ broker ──subscribe──▶ this process ──SSE──▶ browsers
//   this process ──publish──▶ broker ──subscribe──▶ gateway   (commands)
//
// Each broker always carries the ULTRON contract under its topic prefix; a
// gateway configured with a JSON data format (src/lib/edge-format) adds its own
// topic filter, and its readings are parsed into racks · cards · channels
// discovered from the data. The latest message per topic is kept as a raw
// sample, and a temporary "listen" subscription captures anything else, for
// designing formats from what the plant actually sends.
//
// Nothing about the plant network comes from .env. `reload()` re-reads the
// registry and diffs it against the live connections; it also runs every 30 s
// so edits made by another process are picked up.
//
// The runtime lives on globalThis so route handlers, instrumentation and dev
// hot-reloads all share one set of connections instead of each opening their
// own (two clients with one client id would evict each other in a loop).

import { randomUUID } from "node:crypto";
import type { IClientOptions, MqttClient } from "mqtt";
import { parseMessage, templateFilter, naturalCompare } from "@shared/lib/edge-format";
import { type RuntimeBrokerConfig, type RuntimeGatewayConfig, registerDetected } from "@backend/services/edge-service";
import type { BrokerTestResult, ParsedReading, RawSample } from "@shared/types/edge";
import { query } from "@backend/db";
import { writeReadings, type ReadingIn } from "@backend/monitoring/readings";
import { setting } from "@backend/monitoring/settings";
import type {
  BrokerState,
  BrokerStatus,
  MqttCommandResult,
  MqttMetrics,
  MqttSnapshot,
  MqttTick,
  MqttTrafficEntry,
} from "@shared/types/mqtt";
import { FleetStore, rackKey } from "./store";
import { commandRequestTopic, gatewaySubscriptions, normalizePrefix, parseTopic, topicMatchesFilter } from "./topics";
import { SCHEMA_FOR_KIND, validateEnvelope, validatePayload, normalizeLegacyTelemetry, type Envelope } from "./validate";

// ---------------------------------------------------------------- constants
const MAX_PAYLOAD_BYTES = 262_144;
const COMMAND_TIMEOUT_MS = 10_000;
const STALE_AFTER_MS = 15_000;
const TICK_MS = 250;
const SWEEP_MS = 5_000;
const SYNC_MS = 30_000;
const TEST_TIMEOUT_MS = 8_000;
const ERROR_LOG_EVERY_MS = 30_000;
const MERGED_CAP = 200;
const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "REJECTED"]);
const SAMPLE_TOPICS = 200;
const SAMPLE_BYTES = 16_384;

type Connect = typeof import("mqtt").connect;
type Listener = (tick: MqttTick) => void;
type Pending = { resolve: (payload: Record<string, unknown>) => void; reject: (err: Error) => void; timer: NodeJS.Timeout };

export class CommandError extends Error {
  constructor(
    readonly code: "BROKER_UNAVAILABLE" | "PUBLISH_FAILED" | "GATEWAY_TIMEOUT" | "UNKNOWN_RACK" | "COMMAND_NOT_ALLOWED" | "UNKNOWN_BROKER",
    message: string,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------- helpers
/** Every field that needs a new connection when it changes, secrets included. */
function fingerprint(c: RuntimeBrokerConfig): string {
  return JSON.stringify([
    c.enabled,
    c.host.trim(),
    c.port,
    c.tls,
    c.protocolVersion,
    c.username,
    c.password,
    c.clientIdPrefix,
    normalizePrefix(c.topicPrefix),
    c.qos,
    c.rejectUnauthorized,
    c.caCert,
    c.clientCert,
    c.clientKey,
  ]);
}

const upper = (commands: string[]) => commands.map((c) => c.trim().toUpperCase()).filter(Boolean);

/** Client options shared by the live connection and the connection test. */
function clientOptions(config: RuntimeBrokerConfig, clientId: string, protocolVersion: 4 | 5): IClientOptions {
  const pem = (v: string | null) => (config.tls && v && v.trim() ? v : undefined);
  return {
    host: config.host.trim(),
    port: config.port,
    protocol: config.tls ? "mqtts" : "mqtt",
    clientId,
    protocolVersion,
    username: config.username || undefined,
    password: config.password || undefined,
    clean: true,
    rejectUnauthorized: config.rejectUnauthorized,
    // PEM text from the registry, not file paths.
    ca: pem(config.caCert),
    cert: pem(config.clientCert),
    key: pem(config.clientKey),
  };
}

/** MQTT 5 CONNACK 132 and 3.1.1 return code 1 both read "…protocol version". */
const refusedProtocol = (err: Error) => /protocol version/i.test(err.message);

function emptyMetrics(): MqttMetrics {
  return {
    messagesTotal: 0,
    messagesPerSecond: 0,
    bytesTotal: 0,
    duplicates: 0,
    quarantined: 0,
    schemaFailures: 0,
    identityMismatches: 0,
    parseFailures: 0,
    payloadTooLarge: 0,
    sequenceGaps: 0,
    latencyP50Ms: null,
    latencyP95Ms: null,
    lastMessageAt: null,
  };
}

// ---------------------------------------------------------------- one broker
class BrokerConnection {
  readonly store: FleetStore;
  readonly fingerprint: string;
  private client: MqttClient | null = null;
  private state: BrokerState = "disabled";
  private clientId: string | null = null;
  /** The version in use: configured, or 5 → 4 after a step-down. */
  private protocolVersion: 4 | 5 | null;
  private negotiated = false;
  private connectedAt: string | null = null;
  private reconnects = 0;
  private lastError: string | null = null;
  private lastErrorLoggedAt = 0;
  private pending = new Map<string, Pending>();
  private closed = false;
  /** Gateways on this broker with a JSON format, each with its subscription filter. */
  private custom: (RuntimeGatewayConfig & { filter: string })[] = [];
  /** Extra topic filters gateways asked for (Devices › gateway › Topics), with their owner. */
  private extra: (RuntimeGatewayConfig & { filter: string })[] = [];
  /** gateway·rack·card already registered (or being registered); cleared on each registry sync. */
  private registered = new Set<string>();
  /** Messages received per topic since start, for the gateway Topics view. */
  private topicCounts = new Map<string, number>();
  /** Permanent subscriptions: the ULTRON contract plus every custom gateway's filter. */
  private filters: string[];
  /** Latest message per topic, least recently updated first. */
  private samples = new Map<string, RawSample>();
  private listening: { filter: string; until: string; timer: NodeJS.Timeout } | null = null;

  constructor(
    public config: RuntimeBrokerConfig,
    nextId: () => number,
    private readonly markDirty: () => void,
  ) {
    this.fingerprint = fingerprint(config);
    this.store = new FleetStore(config.id, nextId);
    this.protocolVersion = config.protocolVersion;
    this.filters = gatewaySubscriptions(this.prefix);
  }

  get id() {
    return this.config.id;
  }

  get prefix() {
    return normalizePrefix(this.config.topicPrefix);
  }

  get allowedCommands() {
    return upper(this.config.allowedCommands);
  }

  /** Name and command list change without a reconnect. */
  refresh(config: RuntimeBrokerConfig) {
    this.config = config;
  }

  /**
   * The registry's gateways on this broker. JSON-format gateways add their
   * topic filter; changes subscribe / unsubscribe on the live client without
   * reconnecting.
   */
  setGateways(gateways: RuntimeGatewayConfig[]) {
    // Re-checked against the registry after each sync, so a deleted rack or card comes back once data names it again.
    this.registered.clear();
    this.custom = gateways
      .filter((g) => g.format.kind === "json" && g.format.topic.trim())
      .map((g) => ({ ...g, filter: templateFilter(g.format.topic.trim(), g.code) }));
    this.extra = gateways.flatMap((g) => g.topics.map((filter) => ({ ...g, filter })));
    const next = [...new Set([...gatewaySubscriptions(this.prefix), ...this.custom.map((g) => g.filter), ...this.extra.map((g) => g.filter)])];
    const added = next.filter((f) => !this.filters.includes(f));
    const removed = this.filters.filter((f) => !next.includes(f) && f !== this.listening?.filter);
    this.filters = next;
    const client = this.client;
    if (!client || this.state !== "connected") return;
    if (added.length) this.subscribeAll(client, added);
    if (removed.length) client.unsubscribe(removed);
    if (added.length || removed.length) {
      console.log(`[mqtt:${this.id}] subscriptions updated (+${added.length} −${removed.length})`);
      this.markDirty();
    }
  }

  private subscribeAll(client: MqttClient, filters: string[]) {
    client.subscribe(Object.fromEntries(filters.map((filter) => [filter, { qos: this.config.qos }])), (err, granted) => {
      if (err) {
        this.recordError(`subscribe failed: ${err.message}`);
        return;
      }
      // A broker ACL refusal comes back as a granted QoS of 128, not an error.
      const refused = (granted ?? []).filter((g) => g.qos === 128).map((g) => g.topic);
      if (refused.length) this.recordError(`subscription refused by broker ACL: ${refused.join(", ")}`, true);
      this.markDirty();
    });
  }

  // -------------------------------------------------------------- samples / listen
  private recordSample(topic: string, buf: Buffer) {
    const truncated = buf.length > SAMPLE_BYTES;
    const count = (this.topicCounts.get(topic) ?? 0) + 1;
    this.topicCounts.delete(topic);
    this.topicCounts.set(topic, count);
    if (this.topicCounts.size > SAMPLE_TOPICS * 5) {
      const oldest = this.topicCounts.keys().next().value;
      if (oldest !== undefined) this.topicCounts.delete(oldest);
    }
    this.samples.delete(topic);
    this.samples.set(topic, {
      brokerId: this.id,
      topic,
      at: new Date().toISOString(),
      bytes: buf.length,
      payload: (truncated ? buf.subarray(0, SAMPLE_BYTES) : buf).toString("utf8"),
      truncated,
      count,
    });
    if (this.samples.size > SAMPLE_TOPICS) {
      const oldest = this.samples.keys().next().value;
      if (oldest !== undefined) this.samples.delete(oldest);
    }
  }

  /** Latest message per topic, newest first, optionally filtered by topic substring. */
  rawSamples(q?: string | null, limit = SAMPLE_TOPICS, filters: string[] = []): RawSample[] {
    const needle = q?.trim().toLowerCase() ?? "";
    const out: RawSample[] = [];
    for (const s of [...this.samples.values()].reverse()) {
      if (needle && !s.topic.toLowerCase().includes(needle)) continue;
      if (filters.length && !filters.some((f) => topicMatchesFilter(s.topic, f))) continue;
      out.push(s);
      if (out.length >= limit) break;
    }
    return out;
  }

  /** Subscribe to `filter` for `seconds`, then unsubscribe. Replaces a running listen. */
  listen(filter: string, seconds: number): { filter: string; until: string } {
    const client = this.client;
    if (!client || this.state !== "connected") throw new CommandError("BROKER_UNAVAILABLE", `Broker ${this.config.name} is not connected.`);
    this.stopListening();
    const until = new Date(Date.now() + seconds * 1000).toISOString();
    const timer = setTimeout(() => this.stopListening(), seconds * 1000);
    timer.unref?.();
    this.listening = { filter, until, timer };
    if (!this.filters.includes(filter)) this.subscribeAll(client, [filter]);
    console.log(`[mqtt:${this.id}] listening on ${filter} for ${seconds} s`);
    this.markDirty();
    return { filter, until };
  }

  private stopListening() {
    const l = this.listening;
    if (!l) return;
    clearTimeout(l.timer);
    this.listening = null;
    if (this.client && !this.filters.includes(l.filter)) this.client.unsubscribe(l.filter);
    this.markDirty();
  }

  /** Delivered only because of a listen subscription, not a permanent one. */
  private listenOnly(topic: string) {
    return !this.filters.some((f) => topicMatchesFilter(topic, f));
  }

  start(connect: Connect) {
    if (!this.config.enabled) return;
    if (!this.config.host.trim()) {
      this.state = "offline";
      this.lastError = "No host configured.";
      return;
    }
    // Random suffix: two app instances must never share a client id.
    this.clientId = `${this.config.clientIdPrefix}-${randomUUID().slice(0, 8)}`;
    this.open(connect, this.config.protocolVersion ?? 5);
  }

  private open(connect: Connect, version: 4 | 5) {
    const config = this.config;
    this.state = "connecting";
    this.protocolVersion = version;
    let client: MqttClient;
    try {
      client = connect({
        ...clientOptions(config, this.clientId!, version),
        reconnectPeriod: 2000,
        connectTimeout: 15_000,
        resubscribe: true,
      });
    } catch (err) {
      // A malformed certificate throws synchronously; report it, never crash.
      this.state = "offline";
      this.recordError((err as Error).message);
      return;
    }
    this.client = client;
    const tag = `[mqtt:${config.id}]`;

    client.on("connect", () => {
      this.state = "connected";
      this.negotiated = true;
      this.connectedAt = new Date().toISOString();
      this.lastError = null;
      this.markDirty();
      console.log(`${tag} connected to ${config.host}:${config.port} as ${this.clientId} (MQTT ${version === 5 ? "5" : "3.1.1"})`);
      const filters = [...this.filters];
      if (this.listening && !filters.includes(this.listening.filter)) filters.push(this.listening.filter);
      this.subscribeAll(client, filters);
    });
    client.on("reconnect", () => {
      this.reconnects += 1;
      this.state = "reconnecting";
      this.markDirty();
    });
    client.on("offline", () => {
      this.state = "offline";
      this.markDirty();
    });
    client.on("close", () => {
      if (this.state === "connected") this.state = "reconnecting";
      this.markDirty();
    });
    client.on("error", (err) => {
      // Many plant and dev brokers (Mosquitto < 2, Aedes) speak 3.1.1 only.
      // Unless the version was pinned, step down once instead of failing forever.
      if (version === 5 && config.protocolVersion === null && !this.negotiated && refusedProtocol(err)) {
        console.warn(`${tag} ${config.host} refused MQTT 5; retrying with MQTT 3.1.1`);
        this.discard(client);
        if (!this.closed) this.open(connect, 4);
        return;
      }
      this.recordError(err.message);
    });
    client.on("message", (topic, payload, packet) => {
      try {
        this.recordSample(topic, payload);
        this.onMessage(topic, payload, packet.retain === true);
      } catch (err) {
        // A bug in one handler must cost one message, never the subscription.
        this.store.reject(topic, `internal error: ${(err as Error).message}`, null);
      }
      this.markDirty();
    });
  }

  private discard(client: MqttClient) {
    client.removeAllListeners();
    client.on("error", () => undefined);
    client.end(true);
    if (this.client === client) this.client = null;
  }

  /** A broker that stays down fails every 2 s; log the first and then every 30 s. */
  private recordError(message: string, always = false) {
    this.lastError = message;
    this.markDirty();
    if (always || Date.now() - this.lastErrorLoggedAt > ERROR_LOG_EVERY_MS) {
      this.lastErrorLoggedAt = Date.now();
      console.error(`[mqtt:${this.config.id}] ${message}`);
    }
  }

  /** Force-close: the registry removed, disabled or changed this broker. */
  close() {
    this.closed = true;
    if (this.listening) clearTimeout(this.listening.timer);
    this.listening = null;
    if (this.client) this.discard(this.client);
    for (const [id, waiter] of this.pending) {
      clearTimeout(waiter.timer);
      waiter.reject(new CommandError("BROKER_UNAVAILABLE", `Broker ${this.config.name} was reconfigured while the command was pending.`));
      this.pending.delete(id);
    }
    this.state = "disabled";
  }

  // -------------------------------------------------------------- pipeline
  // topic parse → size → JSON → envelope → schema/kind → payload → identity → dedup → state
  private onMessage(topic: string, buf: Buffer, retained: boolean) {
    const parsed = parseTopic(topic, this.prefix);
    const base = { at: new Date().toISOString(), topic, bytes: buf.length, retained, replayed: false, duplicate: false, latencyMs: null as number | null };
    const reject = (reason: string, gatewayId: string | null, counter?: Parameters<FleetStore["reject"]>[3], schema: string | null = null) => {
      this.store.reject(topic, reason, gatewayId, counter);
      this.store.recordTraffic({ ...base, kind: parsed?.kind ?? "unknown", schema, outcome: "quarantined" });
    };

    if (!parsed) {
      if (this.onCustom(topic, buf, retained, base)) return;
      // A listen capture is for looking at, not a contract violation.
      if (this.listenOnly(topic)) return;
      return reject("unknown topic", null);
    }
    if (buf.length === 0) {
      // Empty retained publish = the retained state was deleted.
      this.store.clear(parsed);
      return;
    }
    if (buf.length > MAX_PAYLOAD_BYTES) return reject(`payload too large (${buf.length} bytes)`, parsed.gatewayId, "payloadTooLarge");

    let msg: unknown;
    try {
      msg = JSON.parse(buf.toString("utf8"));
    } catch {
      return reject("invalid JSON", parsed.gatewayId, "parseFailures");
    }

    const envelopeErrors = validateEnvelope(msg);
    if (envelopeErrors.length) return reject(`envelope: ${envelopeErrors.join("; ")}`, parsed.gatewayId, "schemaFailures");
    const env = msg as Envelope;

    const expected = SCHEMA_FOR_KIND[parsed.kind];
    if (env.schema !== expected) return reject(`schema ${env.schema} does not match topic kind ${parsed.kind}`, parsed.gatewayId, "schemaFailures", env.schema);

    normalizeLegacyTelemetry(env.schema, env.payload);
    const payloadErrors = validatePayload(env.schema, env.payload, env.rack_id);
    if (payloadErrors.length) return reject(`payload: ${payloadErrors.join("; ")}`, parsed.gatewayId, "schemaFailures", env.schema);

    // Identity: topic segments must match the envelope. A mismatch is a
    // misconfigured or hostile gateway and is recorded, never merged.
    if (parsed.rackId === null && env.rack_id !== undefined) return reject("gateway topic must not carry rack_id", parsed.gatewayId, "identityMismatches", env.schema);
    if (parsed.rackId !== null && env.rack_id === undefined) return reject("rack topic missing rack_id", parsed.gatewayId, "identityMismatches", env.schema);
    if (parsed.gatewayId !== env.gateway_id) return reject(`topic gateway ${parsed.gatewayId} ≠ payload ${env.gateway_id}`, parsed.gatewayId, "identityMismatches", env.schema);
    if (parsed.rackId !== null && parsed.rackId !== env.rack_id) return reject(`topic rack ${parsed.rackId} ≠ payload ${env.rack_id}`, parsed.gatewayId, "identityMismatches", env.schema);

    const sourceMs = Number(env.created_at_us) / 1000;
    // Gateway sample → receipt. Replays and retained replays describe the past, not the link.
    const latencyMs = !env.replayed && !retained && sourceMs > 0 ? Math.max(0, Date.now() - sourceMs) : null;
    const fresh = this.store.claim(env.message_id);
    this.store.recordTraffic({ ...base, kind: parsed.kind, schema: env.schema, replayed: env.replayed, duplicate: !fresh, latencyMs, outcome: "accepted" });
    if (!fresh) {
      this.store.counters.duplicates += 1;
      return;
    }

    if (parsed.kind === "command_response") this.resolveCommand(env.payload);
    this.store.apply(parsed, env, retained);
  }

  /**
   * A gateway on a configured JSON format. Returns false when no custom
   * gateway of this broker claims the topic.
   */
  private onCustom(
    topic: string,
    buf: Buffer,
    retained: boolean,
    base: Omit<MqttTrafficEntry, "id" | "brokerId" | "kind" | "schema" | "outcome">,
  ): boolean {
    const extra = this.extra.filter((g) => topicMatchesFilter(topic, g.filter));
    const byFormat = this.custom.filter((g) => topicMatchesFilter(topic, g.filter));
    // A gateway's own extra topics are read with its format too, when that format is JSON.
    const candidates = [...byFormat, ...extra.filter((g) => g.format.kind === "json" && !byFormat.some((c) => c.id === g.id))];
    // Subscribed on request, in no known format: kept as a raw sample, never a contract violation.
    const raw = () => {
      if (extra.length === 0) return false;
      this.store.recordTraffic({ ...base, kind: "subscribed", schema: null, outcome: "accepted" });
      return true;
    };
    if (candidates.length === 0) return raw();
    if (buf.length === 0) return true; // a cleared retained topic: nothing to read
    const first = candidates[0];
    const quarantine = (reason: string, gatewayId: string, schema: string, counter: Parameters<FleetStore["reject"]>[3]) => {
      this.store.reject(topic, reason, gatewayId, counter);
      this.store.recordTraffic({ ...base, kind: "custom", schema, outcome: "quarantined" });
    };
    if (buf.length > MAX_PAYLOAD_BYTES) {
      quarantine(`payload too large (${buf.length} bytes)`, first.code, first.format.name, "payloadTooLarge");
      return true;
    }

    const text = buf.toString("utf8");
    for (const g of candidates) {
      const result = parseMessage(g.format, text, { topic, gatewayCode: g.code });
      if (!result.matched) continue;
      if (result.readings.length === 0 && result.errors.length > 0) {
        quarantine(`${g.format.name}: ${result.errors[0]}`, g.code, g.format.name, "schemaFailures");
        return true;
      }
      // Sample time → receipt, from the newest timestamp the payload carries.
      const stamps = result.readings.map((r) => r.at).filter((at): at is number => at !== null && Number.isFinite(at));
      const latencyMs = !retained && stamps.length ? Math.max(0, Date.now() - Math.max(...stamps)) : null;
      this.store.recordTraffic({ ...base, kind: "custom", schema: g.format.name, latencyMs, outcome: "accepted" });
      this.store.applyReadings(g.code, result.readings);
      if (g.format.kind === "json") this.registerNew(g.id, result.readings);
      return true;
    }
    return raw();
  }

  /** Drops a deleted tag's live reading; it comes back (and is registered again) if the gateway still sends it. */
  forgetCard(gatewayId: string, gatewayCode: string, rackId: string, card: string) {
    this.store.forgetCard(gatewayCode, rackId, card);
    this.registered.delete(`${gatewayId}\u0000${rackId}\u0000${card}`);
    this.markDirty();
  }

  /** Adds racks / PLCs / SCADA and cards a JSON gateway reports to the registry, once each. */
  private registerNew(gatewayId: string, readings: ParsedReading[]) {
    const keys: string[] = [];
    const fresh = readings.filter((r) => {
      const key = `${gatewayId}\u0000${r.rack}\u0000${r.card}`;
      if (this.registered.has(key)) return false;
      this.registered.add(key);
      keys.push(key);
      return true;
    });
    if (fresh.length === 0) return;
    registerDetected(
      gatewayId,
      fresh.map((r) => ({ rack: r.rack, rackName: r.rackName, card: r.card, channel: r.channel, cardType: r.cardType })),
    )
      .then((added) => {
        if (!added) return;
        console.log(`[mqtt:${this.id}] registered ${added} new rack/card row${added === 1 ? "" : "s"} for ${gatewayId}`);
        this.markDirty();
      })
      .catch((err: Error) => {
        for (const k of keys) this.registered.delete(k);
        console.error(`[mqtt:${this.id}] auto-register failed for ${gatewayId}:`, err.message);
      });
  }

  // -------------------------------------------------------------- commands
  hasRack(gatewayId: string, rackId: string) {
    return this.store.racks.has(rackKey(gatewayId, rackId));
  }

  private resolveCommand(payload: Record<string, unknown>) {
    const requestId = payload.request_id as string;
    const waiter = this.pending.get(requestId);
    // ACCEPTED is progress; keep waiting for the outcome.
    if (!waiter || !TERMINAL_STATUSES.has(payload.status as string)) return;
    clearTimeout(waiter.timer);
    this.pending.delete(requestId);
    waiter.resolve(payload);
  }

  async sendCommand(gatewayId: string, rackId: string, command: string, args: Record<string, unknown>): Promise<MqttCommandResult> {
    const allowed = this.allowedCommands;
    if (!allowed.includes(command)) {
      throw new CommandError(
        "COMMAND_NOT_ALLOWED",
        allowed.length ? `Allowed commands on ${this.config.name}: ${allowed.join(", ")}.` : `${this.config.name} allows no commands.`,
      );
    }
    const client = this.client;
    if (!client || this.state !== "connected") throw new CommandError("BROKER_UNAVAILABLE", `Broker ${this.config.name} is not connected.`);
    const requestId = randomUUID();
    const topic = commandRequestTopic(this.prefix, gatewayId, rackId);
    const now = new Date();
    const message = {
      schema: "ultron.command.request",
      schema_version: "2.0",
      message_id: randomUUID(),
      gateway_id: gatewayId,
      rack_id: rackId,
      created_at: now.toISOString(),
      created_at_us: String(now.getTime() * 1000),
      replayed: false,
      // The deployed ULTRON gateway (command_consumer.py) reads these at the top
      // level; the v2 contract puts them in `payload`. Send both so either answers.
      request_id: requestId,
      command,
      args,
      payload: { request_id: requestId, command, args },
    };

    // Register before publishing: a fast gateway can answer before the PUBACK.
    const response = new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new CommandError("GATEWAY_TIMEOUT", `No response from ${gatewayId} within ${COMMAND_TIMEOUT_MS} ms.`));
      }, COMMAND_TIMEOUT_MS);
      this.pending.set(requestId, { resolve, reject, timer });
    });

    const started = Date.now();
    try {
      // QoS 1, never retained: a retained command would re-run on a gateway that reconnects hours later.
      await client.publishAsync(topic, JSON.stringify(message), { qos: 1, retain: false });
    } catch (err) {
      // Cancel the waiter, or it would reject later with nobody listening.
      const waiter = this.pending.get(requestId);
      if (waiter) clearTimeout(waiter.timer);
      this.pending.delete(requestId);
      response.catch(() => undefined);
      throw new CommandError("PUBLISH_FAILED", `Command publish failed: ${(err as Error).message}`);
    }
    const payload = await response;
    return {
      brokerId: this.id,
      requestId,
      topic,
      roundTripMs: Date.now() - started,
      response: {
        status: String(payload.status),
        message: typeof payload.message === "string" ? payload.message : undefined,
        result: payload.result,
      },
    };
  }

  // -------------------------------------------------------------- read side
  status(): BrokerStatus {
    const c = this.config;
    const live = c.enabled && Boolean(c.host.trim());
    return {
      brokerId: c.id,
      name: c.name,
      state: c.enabled ? this.state : "disabled",
      enabled: c.enabled,
      host: `${c.host}:${c.port}`,
      tls: c.tls,
      protocolVersion: this.negotiated ? this.protocolVersion : c.protocolVersion,
      clientId: live ? this.clientId : null,
      topicPrefix: this.prefix,
      connectedAt: this.connectedAt,
      reconnects: this.reconnects,
      lastError: this.lastError,
      subscriptions: live ? [...this.filters] : [],
      pendingCommands: this.pending.size,
      allowedCommands: this.allowedCommands,
      metrics: this.store.metrics(),
      listening: this.listening ? { filter: this.listening.filter, until: this.listening.until } : null,
    };
  }
}

// ---------------------------------------------------------------- runtime
class MqttRuntime {
  readonly version = RUNTIME_VERSION;
  /** Registry order. */
  private connections: BrokerConnection[] = [];
  private listeners = new Set<Listener>();
  private dirty = true;
  private timers: NodeJS.Timeout[] = [];
  private trafficSeq = 0;
  private started: Promise<void> | null = null;
  private reloading: Promise<void> = Promise.resolve();
  private connect: Connect | null = null;
  /** Last failure to read the registry; running connections are kept meanwhile. */
  lastSyncError: string | null = null;
  private syncErrorLoggedAt = 0;

  private readonly nextId = () => ++this.trafficSeq;
  private readonly markDirty = () => {
    this.dirty = true;
  };

  /** Idempotent: timers once, then a first registry read. Never rejects. */
  start(): Promise<void> {
    this.started ??= (() => {
      this.startTimers();
      return this.reload();
    })();
    return this.started;
  }

  /**
   * Re-read the registry and converge on it: unchanged brokers keep their live
   * connection, changed ones reconnect, removed ones close. Serialized, and it
   * never rejects — a database outage keeps the current connections running.
   */
  reload(): Promise<void> {
    const run = this.reloading
      .then(() => this.sync())
      .catch((err: Error) => console.error("[mqtt] reload failed", err.message));
    this.reloading = run;
    return run;
  }

  private async sync() {
    let configs: RuntimeBrokerConfig[];
    let gateways: RuntimeGatewayConfig[];
    try {
      this.connect ??= (await import("mqtt")).connect;
      const { getRuntimeBrokers, getRuntimeGateways } = await import("@backend/services/edge-service");
      [configs, gateways] = await Promise.all([getRuntimeBrokers(), getRuntimeGateways()]);
    } catch (err) {
      this.lastSyncError = (err as Error).message;
      if (Date.now() - this.syncErrorLoggedAt > ERROR_LOG_EVERY_MS) {
        this.syncErrorLoggedAt = Date.now();
        console.error("[mqtt] cannot read the broker registry; keeping current connections:", this.lastSyncError);
      }
      return;
    }
    if (this.lastSyncError) console.log("[mqtt] broker registry readable again");
    this.lastSyncError = null;

    const current = new Map(this.connections.map((c) => [c.id, c]));
    const next: BrokerConnection[] = [];
    for (const config of configs) {
      const existing = current.get(config.id);
      current.delete(config.id);
      const own = gateways.filter((g) => g.brokerId === config.id);
      if (existing && existing.fingerprint === fingerprint(config)) {
        existing.refresh(config);
        existing.setGateways(own);
        next.push(existing);
        continue;
      }
      if (existing) {
        console.log(`[mqtt:${config.id}] ${config.enabled ? "settings changed; reconnecting" : "disabled; closing"}`);
        existing.close();
      }
      const conn = new BrokerConnection(config, this.nextId, this.markDirty);
      conn.setGateways(own);
      conn.start(this.connect);
      next.push(conn);
    }
    for (const removed of current.values()) {
      console.log(`[mqtt:${removed.id}] removed from the registry; closing`);
      removed.close();
    }
    this.connections = next;
    this.dirty = true;
  }

  private startTimers() {
    if (this.timers.length) return;
    const sweep = setInterval(() => {
      for (const c of this.connections) c.store.sweep(STALE_AFTER_MS);
      this.dirty = true;
    }, SWEEP_MS);
    // Coalesce: subscribers get at most one tick per TICK_MS however fast the
    // brokers deliver, so a 2 Hz × N-rack fleet cannot flood a browser.
    const tick = setInterval(() => this.flush(), TICK_MS);
    const resync = setInterval(() => void this.reload(), SYNC_MS);
    const record = setInterval(() => void this.recordReadings(), RECORD_CHECK_MS);
    for (const t of [sweep, tick, resync, record]) t.unref?.();
    this.timers.push(sweep, tick, resync, record);
  }

  // -------------------------------------------------------------- readings
  /** Last persisted sample per measurement key, so each sample is written once. */
  private persisted = new Map<string, string>();
  private lastRecordMs = 0;
  private recording = false;

  /**
   * Writes the latest value of every live channel that is mapped to a
   * measurement (edge_points.measurement_id) into `readings`, once per publish
   * period (system setting readings.publish_period_s). The acquisition time is
   * the gateway's sample time when it sends one, else the receipt time, and is
   * marked accordingly. Invalid or stale channels are not written: missing is
   * missing, never zero.
   */
  private async recordReadings(): Promise<void> {
    if (this.recording) return;
    this.recording = true;
    try {
      const periodMs = (await setting("readings.publish_period_s")) * 1000;
      if (Date.now() - this.lastRecordMs < periodMs) return;
      this.lastRecordMs = Date.now();
      const bindings = await query<{ broker_id: string | null; code: string; rack: string; slot: string; channel: string; measurement_id: string; value_kind: string }>(
        `SELECT g.broker_id, g.code, s.code AS rack, p.slot, p.channel, p.measurement_id, m.value_kind
           FROM edge_points p
           JOIN edge_sources s ON s.id = p.source_id
           JOIN edge_gateways g ON g.id = s.gateway_id
           JOIN measurements m ON m.id = p.measurement_id
          WHERE p.enabled AND g.enabled`,
      );
      const byKey = new Map(bindings.rows.map((b) => [`${b.broker_id ?? ""}|${b.code}|${b.rack}|${b.slot}|${b.channel}`, b]));
      const rows: ReadingIn[] = [];
      for (const c of this.connections) {
        for (const m of c.store.measurements.values()) {
          if (!m.valid || !m.fresh) continue;
          const b = byKey.get(`${m.brokerId}|${m.gatewayId}|${m.rackId}|${m.slot}|${m.channel}`);
          if (!b) continue;
          const at = m.sampledAt ?? m.updatedAt;
          if (this.persisted.get(m.key) === at) continue;
          this.persisted.set(m.key, at);
          const state = b.value_kind === "state" ? (m.display ?? (m.value !== null ? String(m.value) : null)) : null;
          const value = b.value_kind === "state" ? null : m.value;
          if (value === null && state === null) continue;
          rows.push({ measurementId: b.measurement_id, acquiredAt: Date.parse(at), value, state, quality: "GOOD", timeSource: m.sampledAt ? "device" : "server" });
        }
      }
      if (rows.length) await writeReadings(rows);
    } catch (err) {
      console.error("[mqtt] recording readings failed:", (err as Error).message);
    } finally {
      this.recording = false;
    }
  }

  /** Stop timers and close every connection (tests, hot-reload replacement). */
  shutdown() {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    for (const c of this.connections) c.close();
    this.connections = [];
    this.listeners.clear();
  }

  // -------------------------------------------------------------- commands
  /** The connection that knows this gateway / rack (optionally on one broker). */
  private findConnection(gatewayId: string, rackId: string, brokerId?: string | null) {
    return this.connections.find((c) => (!brokerId || c.id === brokerId) && c.hasRack(gatewayId, rackId)) ?? null;
  }

  /** Which broker a command for this rack would go to, and what it allows. Null when unknown. */
  resolveTarget(gatewayId: string, rackId: string, brokerId?: string | null): { brokerId: string; name: string; allowedCommands: string[] } | null {
    const conn = this.findConnection(gatewayId, rackId, brokerId);
    return conn ? { brokerId: conn.id, name: conn.config.name, allowedCommands: conn.allowedCommands } : null;
  }

  async sendCommand(
    gatewayId: string,
    rackId: string,
    command: string,
    args: Record<string, unknown> = {},
    brokerId?: string | null,
  ): Promise<MqttCommandResult> {
    const conn = this.findConnection(gatewayId, rackId, brokerId);
    if (!conn) {
      throw new CommandError("UNKNOWN_RACK", `${gatewayId} / ${rackId} has not published to ${brokerId ? `broker ${brokerId}` : "any broker"}.`);
    }
    return conn.sendCommand(gatewayId, rackId, command.trim().toUpperCase(), args);
  }

  // -------------------------------------------------------------- read side
  snapshot(): MqttSnapshot {
    const stores = this.connections.map((c) => c.store);
    const byGateway = <T extends { brokerId: string; gatewayId: string }>(a: T, b: T) =>
      a.brokerId.localeCompare(b.brokerId) || a.gatewayId.localeCompare(b.gatewayId);
    const newestFirst = <T extends { at: string }>(a: T, b: T) => Date.parse(b.at) - Date.parse(a.at);
    const brokers = this.connections.map((c) => c.status());
    return {
      serverNow: new Date().toISOString(),
      brokers,
      metrics: this.aggregateMetrics(brokers.map((b) => b.metrics)),
      gateways: stores.flatMap((s) => [...s.gateways.values()]).sort(byGateway),
      racks: stores.flatMap((s) => [...s.racks.values()]).sort((a, b) => byGateway(a, b) || a.rackId.localeCompare(b.rackId)),
      measurements: stores
        .flatMap((s) => [...s.measurements.values()])
        .sort(
          (a, b) =>
            byGateway(a, b) || naturalCompare(a.rackId, b.rackId) || naturalCompare(a.slot, b.slot) || naturalCompare(a.channel, b.channel),
        ),
      alarms: stores.flatMap((s) => s.alarms).sort(newestFirst).slice(0, MERGED_CAP),
      quarantine: stores
        .flatMap((s) => s.quarantine)
        .sort((a, b) => newestFirst(a, b) || b.id - a.id)
        .slice(0, MERGED_CAP),
    };
  }

  private aggregateMetrics(per: MqttMetrics[]): MqttMetrics {
    const total = emptyMetrics();
    const sum = [
      "messagesTotal",
      "bytesTotal",
      "duplicates",
      "quarantined",
      "schemaFailures",
      "identityMismatches",
      "parseFailures",
      "payloadTooLarge",
      "sequenceGaps",
    ] as const;
    for (const m of per) {
      for (const k of sum) total[k] += m[k];
      total.messagesPerSecond += m.messagesPerSecond;
      if (m.lastMessageAt && (!total.lastMessageAt || m.lastMessageAt > total.lastMessageAt)) total.lastMessageAt = m.lastMessageAt;
    }
    total.messagesPerSecond = Math.round(total.messagesPerSecond * 10) / 10;
    const sorted = this.connections.flatMap((c) => [...c.store.latencyWindow()]).sort((a, b) => a - b);
    const pct = (q: number) => (sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]) : null);
    total.latencyP50Ms = pct(0.5);
    total.latencyP95Ms = pct(0.95);
    return total;
  }

  private connection(brokerId: string): BrokerConnection {
    const conn = this.connections.find((c) => c.id === brokerId);
    if (!conn) throw new CommandError("UNKNOWN_BROKER", `Broker ${brokerId} is not in the registry.`);
    return conn;
  }

  /**
   * Latest raw message per topic, newest first (max 200): one broker's, or
   * every broker's merged when `brokerId` is omitted. Throws UNKNOWN_BROKER.
   */
  /** Clears a deleted tag's live reading on its broker. */
  forgetCard(brokerId: string, gatewayId: string, gatewayCode: string, rackId: string, card: string) {
    this.connections.find((c) => c.id === brokerId)?.forgetCard(gatewayId, gatewayCode, rackId, card);
  }

  samples(brokerId?: string | null, q?: string | null, filters: string[] = []): RawSample[] {
    if (brokerId) return this.connection(brokerId).rawSamples(q, SAMPLE_TOPICS, filters);
    return this.connections
      .flatMap((c) => c.rawSamples(q, SAMPLE_TOPICS, filters))
      .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
      .slice(0, SAMPLE_TOPICS);
  }

  /**
   * Temporarily subscribe one broker to `filter` (default `#`) so its messages
   * show up as samples. Throws UNKNOWN_BROKER, or BROKER_UNAVAILABLE when not connected.
   */
  listen(brokerId: string, filter: string, seconds: number): { filter: string; until: string } {
    return this.connection(brokerId).listen(filter, seconds);
  }

  /** The last `limit` traffic entries across every broker, oldest first. */
  recentTraffic(limit = 100): MqttTrafficEntry[] {
    return this.connections
      .flatMap((c) => c.store.traffic)
      .sort((a, b) => a.id - b.id)
      .slice(-limit);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private flush() {
    if (!this.dirty) return;
    const traffic = this.connections.flatMap((c) => c.store.drainTraffic()).sort((a, b) => a.id - b.id);
    this.dirty = false;
    if (this.listeners.size === 0) return;
    const tick: MqttTick = { snapshot: this.snapshot(), traffic };
    for (const listener of this.listeners) listener(tick);
  }
}

export type { MqttRuntime };

// ---------------------------------------------------------------- connection test
/**
 * Opens a throwaway client with these settings and reports how far it got.
 * Resolves on CONNACK, the first error, or after 8 s; never throws for a
 * connection failure. With `protocolVersion: null` it tries 5 and steps down
 * to 3.1.1 once, exactly like the live connection.
 */
export async function testBrokerConnection(config: RuntimeBrokerConfig): Promise<BrokerTestResult> {
  const started = Date.now();
  const fail = (error: string): BrokerTestResult => ({ ok: false, ms: Date.now() - started, protocolVersion: null, error });
  if (!config.host.trim()) return fail("No host configured.");
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) return fail(`Invalid port ${config.port}.`);

  let connect: Connect;
  try {
    connect = (await import("mqtt")).connect;
  } catch (err) {
    return fail(`MQTT client unavailable: ${(err as Error).message}`);
  }
  const clientId = `${config.clientIdPrefix}-test-${randomUUID().slice(0, 8)}`;

  const attempt = (version: 4 | 5, budgetMs: number) =>
    new Promise<{ ok: true } | { ok: false; error: string; refusedProtocol: boolean }>((resolve) => {
      let settled = false;
      let client: MqttClient | null = null;
      const finish = (result: { ok: true } | { ok: false; error: string; refusedProtocol: boolean }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (client) {
          client.removeAllListeners();
          client.on("error", () => undefined);
          client.end(true);
        }
        resolve(result);
      };
      const timer = setTimeout(
        () => finish({ ok: false, error: `No CONNACK within ${Math.round(TEST_TIMEOUT_MS / 1000)} s.`, refusedProtocol: false }),
        Math.max(0, budgetMs),
      );
      try {
        client = connect({ ...clientOptions(config, clientId, version), reconnectPeriod: 0, connectTimeout: TEST_TIMEOUT_MS });
      } catch (err) {
        finish({ ok: false, error: (err as Error).message, refusedProtocol: false });
        return;
      }
      client.on("connect", () => finish({ ok: true }));
      client.on("error", (err) => finish({ ok: false, error: err.message || String(err), refusedProtocol: refusedProtocol(err) }));
      client.on("close", () => finish({ ok: false, error: "Connection closed before CONNACK.", refusedProtocol: false }));
    });

  let version: 4 | 5 = config.protocolVersion ?? 5;
  let result = await attempt(version, TEST_TIMEOUT_MS);
  if (!result.ok && result.refusedProtocol && config.protocolVersion === null && version === 5) {
    version = 4;
    result = await attempt(version, TEST_TIMEOUT_MS - (Date.now() - started));
  }
  return result.ok ? { ok: true, ms: Date.now() - started, protocolVersion: version, error: null } : fail(result.error);
}

// ---------------------------------------------------------------- singleton
type LegacyRuntime = { client?: { end?: (force?: boolean) => unknown } | null; timers?: NodeJS.Timeout[] };
/** Identity of the runtime's shape; see getMqttRuntime. */
/** How often the recorder checks whether a publish period has passed. */
const RECORD_CHECK_MS = 5_000;
const RUNTIME_VERSION = 15;

const globalForMqtt = globalThis as typeof globalThis & { __orcasMqttV2?: MqttRuntime; __orcasMqtt?: LegacyRuntime };

/** The process-wide runtime, started on first use. */
export function getMqttRuntime(): MqttRuntime {
  // A dev server keeps the instance across hot reloads. One built by older code
  // (lower RUNTIME_VERSION) is shut down and replaced, so a runtime change takes
  // effect without a restart. Bump the version when the class changes shape.
  const existing = globalForMqtt.__orcasMqttV2 as (MqttRuntime & { version?: number }) | undefined;
  if (existing && existing.version !== RUNTIME_VERSION) {
    try {
      existing.shutdown?.();
    } catch {
      /* best effort */
    }
    delete globalForMqtt.__orcasMqttV2;
  }
  if (!globalForMqtt.__orcasMqttV2) {
    // A dev server hot-reloaded from the single-broker runtime still holds its
    // client; end it so it does not keep a subscription nobody reads.
    const legacy = globalForMqtt.__orcasMqtt;
    if (legacy) {
      try {
        for (const t of legacy.timers ?? []) clearInterval(t);
        legacy.client?.end?.(true);
      } catch {
        /* best effort */
      }
      delete globalForMqtt.__orcasMqtt;
    }
    globalForMqtt.__orcasMqttV2 = new MqttRuntime();
  }
  const runtime = globalForMqtt.__orcasMqttV2;
  void runtime.start();
  return runtime;
}
