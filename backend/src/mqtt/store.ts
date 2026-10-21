// In-memory current state of the gateway fleet, built from validated envelopes.
// Status, topology, health and inventory are retained on the broker, so this
// state is rebuilt within one connect after a restart; telemetry refills at the
// gateway's publish rate.
//
// One store per broker connection: dedup, sequence tracking and counters are
// scoped to that broker, and every record carries its brokerId.

import type {
  LinkState,
  MqttAlarm,
  MqttCard,
  MqttGateway,
  MqttMeasurement,
  MqttMetrics,
  MqttQuarantineEntry,
  MqttRack,
  MqttTrafficEntry,
} from "@shared/types/mqtt";
import { naturalCompare } from "@shared/lib/edge-format";
import type { ParsedReading } from "@shared/types/edge";
import type { ParsedTopic } from "./topics";
import { isRecord, type Envelope } from "./validate";

const MAX_ALARMS = 200;
const MAX_QUARANTINE = 200;
const MAX_TRAFFIC = 300;
const DEDUP_WINDOW = 5000;
const LATENCY_WINDOW = 200;
/** Sequence numbers held open for a late (reordered) arrival before counting them lost. */
const MISSING_WINDOW = 1000;
const INVALID_DISPLAY = new Set(["", "invalid", "nan", "null", "none"]);

// ---------------------------------------------------------------- coercion
const text = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

function numeric(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Card / channel ids are text: numbers are written out, strings trimmed. */
function ident(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return null;
}

/**
 * A reading's numeric value. The real CC v3 gateway sends no `value`: the
 * scaled `value_formatted` string, else `value_raw` / 10^decimal_places.
 */
function scaled(slot: Record<string, unknown>, prefix: "value" | "alert_value" | "danger_value"): number | null {
  const formatted = numeric(slot[`${prefix}_formatted`]);
  if (formatted !== null) return formatted;
  const raw = numeric(slot[`${prefix}_raw`]);
  if (raw === null) return null;
  const decimals = integer(slot.decimal_places);
  return decimals !== null && decimals > 0 ? raw / 10 ** decimals : raw;
}

function integer(v: unknown): number | null {
  const n = numeric(v);
  return n !== null && Number.isInteger(n) ? n : null;
}

/** Accepts both the CC v3 field names and the gateway rack model's names. */
function isActive(...values: unknown[]): boolean {
  return values.some((v) => typeof v === "string" && ["ACTIVE", "ALARM", "ON", "TRUE"].includes(v.toUpperCase()) || v === true);
}

/** Key of a rack inside one broker's store. */
export const rackKey = (gatewayId: string, rackId: string) => `${gatewayId}\u0000${rackId}`;
/** Process-wide key of a measurement: brokerId · gatewayId · rackId · slot · channel. */
export const measurementKey = (brokerId: string, gatewayId: string, rackId: string, slot: string, channel: string) =>
  [brokerId, gatewayId, rackId, slot, channel].join("\u0000");

// ---------------------------------------------------------------- state
export class FleetStore {
  gateways = new Map<string, MqttGateway>();
  racks = new Map<string, MqttRack>();
  measurements = new Map<string, MqttMeasurement>();
  alarms: MqttAlarm[] = [];
  quarantine: MqttQuarantineEntry[] = [];
  traffic: MqttTrafficEntry[] = [];
  private pendingTraffic: MqttTrafficEntry[] = [];
  private seen = new Set<string>();
  private latencies: number[] = [];
  private arrivals: number[] = [];

  /**
   * `nextId` is shared by every store in the process, so traffic and
   * quarantine ids stay unique across brokers (the browser dedups on them).
   */
  constructor(
    readonly brokerId: string,
    private readonly nextId: () => number,
  ) {}

  counters = {
    messagesTotal: 0,
    bytesTotal: 0,
    duplicates: 0,
    quarantined: 0,
    schemaFailures: 0,
    identityMismatches: 0,
    parseFailures: 0,
    payloadTooLarge: 0,
    sequenceGaps: 0,
  };
  lastMessageAt: string | null = null;

  /** QoS 1 is at-least-once; the message id is the dedup key. Returns false for a repeat. */
  claim(messageId: string): boolean {
    if (this.seen.has(messageId)) return false;
    this.seen.add(messageId);
    if (this.seen.size > DEDUP_WINDOW) {
      const oldest = this.seen.values().next().value;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
    return true;
  }

  recordTraffic(entry: Omit<MqttTrafficEntry, "id" | "brokerId">) {
    const full: MqttTrafficEntry = { ...entry, id: this.nextId(), brokerId: this.brokerId };
    this.traffic.push(full);
    if (this.traffic.length > MAX_TRAFFIC) this.traffic.shift();
    this.pendingTraffic.push(full);
    if (this.pendingTraffic.length > MAX_TRAFFIC) this.pendingTraffic.shift();
    this.counters.bytesTotal += entry.bytes;
    this.arrivals.push(Date.now());
    if (entry.latencyMs !== null) {
      this.latencies.push(entry.latencyMs);
      if (this.latencies.length > LATENCY_WINDOW) this.latencies.shift();
    }
  }

  drainTraffic(): MqttTrafficEntry[] {
    const out = this.pendingTraffic;
    this.pendingTraffic = [];
    return out;
  }

  reject(topic: string, reason: string, gatewayId: string | null, counter?: keyof FleetStore["counters"]) {
    this.counters.quarantined += 1;
    if (counter) this.counters[counter] += 1;
    this.quarantine.unshift({ id: this.nextId(), brokerId: this.brokerId, at: new Date().toISOString(), topic, reason, gatewayId });
    if (this.quarantine.length > MAX_QUARANTINE) this.quarantine.pop();
  }

  // -------------------------------------------------------------- apply
  apply(parsed: ParsedTopic, msg: Envelope, retained = false) {
    const received = Date.now();
    // A retained message is the broker replaying the past: it is as old as the
    // gateway says it is, not as new as its delivery. The sweep then ages it.
    const now = new Date(retained ? Math.min(received, Date.parse(msg.created_at)) : received).toISOString();
    this.counters.messagesTotal += 1;
    this.lastMessageAt = new Date(received).toISOString();
    const gateway = this.touchGateway(msg, now, retained);
    const p = msg.payload;

    switch (parsed.kind) {
      case "status": {
        if (p.state === "OFFLINE") {
          // Last will or a clean shutdown: the gateway and everything behind it is dark.
          gateway.state = "OFFLINE";
          for (const rack of this.racks.values()) {
            if (rack.gatewayId === gateway.gatewayId) rack.state = "OFFLINE";
          }
        }
        break;
      }
      case "topology": {
        const listed = new Set<string>();
        for (const entry of p.racks as unknown[]) {
          if (!isRecord(entry) || typeof entry.rack_id !== "string") continue;
          listed.add(entry.rack_id);
          this.patchRack(msg.gateway_id, entry.rack_id, now, {
            status: text(entry.status) ?? "unknown",
            dataCurrent: entry.data_current === true,
          });
        }
        // Racks the gateway no longer reports are gone, not stale.
        for (const [key, rack] of this.racks) {
          if (rack.gatewayId === msg.gateway_id && !listed.has(rack.rackId)) this.dropRack(key);
        }
        break;
      }
      case "rack_health": {
        const connection = isRecord(p.connection) ? p.connection : {};
        this.patchRack(msg.gateway_id, parsed.rackId!, now, {
          status: text(p.status) ?? "unknown",
          dataCurrent: p.data_current === true,
          reason: text(connection.status_reason) ?? text(p.status_reason),
        });
        break;
      }
      case "inventory": {
        // The rack's card list. Retained, so it is known right after
        // subscribing; each revision replaces the list, keeping channels seen.
        const previous = this.cards.get(rackKey(msg.gateway_id, parsed.rackId!));
        const next = new Map<string, { cardType: string | null; presence: string | null; channels: Set<string> }>();
        for (const entry of p.slots as unknown[]) {
          if (!isRecord(entry)) continue;
          const card = ident(entry.slot_number);
          if (card === null) continue;
          next.set(card, {
            cardType: text(entry.card_type) ?? ident(entry.card_type_code),
            presence: text(entry.online_state) ?? text(entry.presence),
            channels: previous?.get(card)?.channels ?? new Set(),
          });
        }
        this.cards.set(rackKey(msg.gateway_id, parsed.rackId!), next);
        const rack = this.patchRack(msg.gateway_id, parsed.rackId!, now, { slotCount: integer(p.slot_count) ?? 0 }, false);
        this.syncCards(rack);
        break;
      }
      case "telemetry": {
        const telemetry = isRecord(p.telemetry) ? p.telemetry : {};
        // Older gateways omit the block; treat its absence as current data.
        const dataCurrent = telemetry.data_current === undefined ? true : telemetry.data_current === true;
        // Telemetry `slot_count` counts reading records (a 4-channel card is 4),
        // not cards: the deployed gateway sends 36 for 12 cards. Card counts come
        // from the inventory and the cards actually seen (syncCards).
        const rack = this.patchRack(msg.gateway_id, parsed.rackId!, now, {
          status: "connected",
          dataCurrent,
        });
        rack.lastTelemetryAt = now;
        for (const slot of p.slots as Record<string, unknown>[]) this.applyReading(msg, slot, dataCurrent, now);
        this.syncCards(rack);
        break;
      }
      case "alarm": {
        this.alarms.unshift({
          id: msg.message_id,
          brokerId: this.brokerId,
          gatewayId: msg.gateway_id,
          rackId: parsed.rackId!,
          severity: p.severity as MqttAlarm["severity"],
          state: p.state as MqttAlarm["state"],
          message: text(p.message),
          slot: ident(p.slot_number ?? p.slot_id),
          channel: ident(p.channel_id),
          value: numeric(p.value),
          threshold: numeric(p.threshold),
          unit: text(p.unit),
          at: msg.created_at,
        });
        if (this.alarms.length > MAX_ALARMS) this.alarms.pop();
        break;
      }
      case "fault":
      case "system":
      case "command_response":
        break;
    }
  }

  // -------------------------------------------------------------- cards
  /**
   * Cards per rack (rackKey → card id → card). Inventory replaces the list;
   * telemetry and custom-format readings add cards and their channel ids.
   */
  private cards = new Map<string, Map<string, { cardType: string | null; presence: string | null; channels: Set<string> }>>();

  private cardsOf(gatewayId: string, rackId: string) {
    const key = rackKey(gatewayId, rackId);
    let cards = this.cards.get(key);
    if (!cards) this.cards.set(key, (cards = new Map()));
    return cards;
  }

  /** A card that sent a reading: add it (and its channel) if new; fill a missing type. */
  private seeCard(gatewayId: string, rackId: string, card: string, channel: string, cardType: string | null) {
    const cards = this.cardsOf(gatewayId, rackId);
    let c = cards.get(card);
    if (!c) cards.set(card, (c = { cardType, presence: null, channels: new Set() }));
    else if (c.cardType === null && cardType !== null) c.cardType = cardType;
    c.channels.add(channel);
  }

  /** Publish the card index onto the rack: natural order, slotCount ≥ cards. */
  private syncCards(rack: MqttRack) {
    const cards = this.cards.get(rackKey(rack.gatewayId, rack.rackId));
    const list: MqttCard[] = cards
      ? [...cards.entries()]
          .sort(([a], [b]) => naturalCompare(a, b))
          .map(([card, c]) => ({ card, cardType: c.cardType, presence: c.presence, channels: [...c.channels].sort(naturalCompare) }))
      : [];
    rack.cards = list;
    if (rack.slotCount < list.length) rack.slotCount = list.length;
  }

  // -------------------------------------------------------------- custom formats
  /**
   * Readings from a gateway on a configured JSON format: no envelope, so no
   * sequence or boot tracking. Racks, cards and channels are discovered from
   * the readings themselves.
   */
  applyReadings(gatewayId: string, readings: ParsedReading[]) {
    const received = Date.now();
    const now = new Date(received).toISOString();
    this.counters.messagesTotal += 1;
    this.lastMessageAt = now;

    let gateway = this.gateways.get(gatewayId);
    if (!gateway) {
      gateway = { brokerId: this.brokerId, gatewayId, ip: "", bootId: "", state: "ONLINE", lastSeenAt: now, lastSequence: 0, sequenceGaps: 0, replayed: 0, messages: 0 };
      this.gateways.set(gatewayId, gateway);
    }
    gateway.state = "ONLINE";
    gateway.lastSeenAt = now;
    gateway.messages += 1;

    for (const r of readings) {
      this.seeCard(gatewayId, r.rack, r.card, r.channel, r.cardType);
      const rack = this.patchRack(gatewayId, r.rack, now, { status: "connected", dataCurrent: true, reason: null });
      rack.lastTelemetryAt = now;
      this.syncCards(rack);

      const key = measurementKey(this.brokerId, gatewayId, r.rack, r.card, r.channel);
      const over = (limit: number | null) => limit !== null && r.value !== null && r.value >= limit;
      this.measurements.set(key, {
        key,
        brokerId: this.brokerId,
        gatewayId,
        rackId: r.rack,
        slot: r.card,
        channel: r.channel,
        cardType: r.cardType,
        sensor: r.name,
        value: r.value,
        display: r.display ?? (r.value !== null ? String(r.value) : null),
        unit: r.unit ?? "",
        valid: r.valid,
        fresh: true,
        channelStatus: null,
        alertThreshold: r.alert,
        dangerThreshold: r.danger,
        alertActive: over(r.alert),
        dangerActive: over(r.danger),
        updatedAt: now,
        sampledAt: r.at !== null && Number.isFinite(r.at) ? new Date(r.at).toISOString() : null,
      });
    }
  }

  /** An empty retained publish clears that topic's state. */
  clear(parsed: ParsedTopic) {
    if (parsed.rackId === null) {
      if (parsed.kind !== "status") return;
      this.gateways.delete(parsed.gatewayId);
      for (const [key, rack] of this.racks) if (rack.gatewayId === parsed.gatewayId) this.dropRack(key);
      return;
    }
    if (parsed.kind === "rack_health" || parsed.kind === "inventory") this.dropRack(rackKey(parsed.gatewayId, parsed.rackId));
  }

  /** Last-will backstop: a gateway that stops publishing goes STALE, then OFFLINE. */
  sweep(staleAfterMs: number) {
    const now = Date.now();
    for (const gateway of this.gateways.values()) {
      if (gateway.state === "OFFLINE") continue;
      const age = now - Date.parse(gateway.lastSeenAt);
      gateway.state = age > staleAfterMs * 2 ? "OFFLINE" : age > staleAfterMs ? "STALE" : gateway.state;
    }
    for (const rack of this.racks.values()) {
      if (rack.state === "OFFLINE") continue;
      const age = now - Date.parse(rack.lastSeenAt);
      if (age > staleAfterMs * 2) rack.state = "OFFLINE";
      else if (age > staleAfterMs) rack.state = "STALE";
    }
    for (const m of this.measurements.values()) {
      if (m.fresh && now - Date.parse(m.updatedAt) > staleAfterMs) m.fresh = false;
    }
  }

  /** Recent gateway → receipt latencies, for percentiles merged across brokers. */
  latencyWindow(): readonly number[] {
    return this.latencies;
  }

  metrics(): MqttMetrics {
    const cutoff = Date.now() - 5000;
    while (this.arrivals.length && this.arrivals[0] < cutoff) this.arrivals.shift();
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const pct = (q: number) => (sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]) : null);
    return {
      ...this.counters,
      messagesPerSecond: Math.round((this.arrivals.length / 5) * 10) / 10,
      latencyP50Ms: pct(0.5),
      latencyP95Ms: pct(0.95),
      lastMessageAt: this.lastMessageAt,
    };
  }

  // -------------------------------------------------------------- helpers
  private touchGateway(msg: Envelope, now: string, retained: boolean): MqttGateway {
    let gateway = this.gateways.get(msg.gateway_id);
    if (!gateway) {
      gateway = {
        brokerId: this.brokerId,
        gatewayId: msg.gateway_id,
        ip: msg.gateway_ip,
        bootId: msg.gateway_boot_id,
        state: "ONLINE",
        lastSeenAt: now,
        lastSequence: msg.gateway_sequence,
        sequenceGaps: 0,
        replayed: 0,
        messages: 0,
      };
      this.gateways.set(msg.gateway_id, gateway);
    }
    this.trackSequence(gateway, msg, retained);
    if (Date.parse(now) >= Date.parse(gateway.lastSeenAt)) {
      gateway.lastSeenAt = now;
      gateway.ip = msg.gateway_ip;
    }
    gateway.messages += 1;
    if (msg.replayed) gateway.replayed += 1;
    // A retained OFFLINE will is handled by the status branch; anything else
    // the gateway publishes proves it was alive at `now`, and the sweep ages it.
    if (!(msg.schema === "ultron.gateway.status" && msg.payload.state === "OFFLINE")) gateway.state = "ONLINE";
    return gateway;
  }

  /**
   * Loss detection on the gateway-wide sequence. Only live deliveries count:
   * retained and replayed messages carry old numbers by design, and a new boot
   * id restarts the sequence.
   */
  private liveSequence = new Map<string, { bootId: string; last: number; missing: Set<number> }>();

  private trackSequence(gateway: MqttGateway, msg: Envelope, retained: boolean) {
    if (msg.gateway_boot_id !== gateway.bootId && !retained) {
      gateway.bootId = msg.gateway_boot_id;
      gateway.lastSequence = msg.gateway_sequence;
    }
    if (msg.gateway_boot_id === gateway.bootId) gateway.lastSequence = Math.max(gateway.lastSequence, msg.gateway_sequence);
    if (retained || msg.replayed) return;
    const track = this.liveSequence.get(gateway.gatewayId);
    if (!track || track.bootId !== msg.gateway_boot_id) {
      this.liveSequence.set(gateway.gatewayId, { bootId: msg.gateway_boot_id, last: msg.gateway_sequence, missing: new Set() });
      return;
    }
    const seq = msg.gateway_sequence;
    if (seq > track.last + 1) {
      for (let n = track.last + 1; n < seq; n += 1) track.missing.add(n);
      gateway.sequenceGaps += seq - track.last - 1;
      this.counters.sequenceGaps += seq - track.last - 1;
    } else if (track.missing.delete(seq)) {
      // QoS 0 telemetry and QoS 1 events take different paths through the
      // broker, so a message can overtake an older one. A late arrival was
      // reordered, not lost: take it back off the loss count.
      gateway.sequenceGaps -= 1;
      this.counters.sequenceGaps -= 1;
    }
    track.last = Math.max(track.last, seq);
    // Anything still missing this far behind is lost for good; stop tracking it.
    if (track.missing.size > MISSING_WINDOW) {
      for (const n of track.missing) if (n < track.last - MISSING_WINDOW) track.missing.delete(n);
    }
  }

  private patchRack(
    gatewayId: string,
    rackId: string,
    now: string,
    patch: { status?: string; dataCurrent?: boolean; reason?: string | null; slotCount?: number },
    seen = true,
  ): MqttRack {
    const key = rackKey(gatewayId, rackId);
    let rack = this.racks.get(key);
    if (!rack) {
      rack = { brokerId: this.brokerId, gatewayId, rackId, state: "STALE", status: "unknown", dataCurrent: false, reason: null, slotCount: 0, lastSeenAt: now, lastTelemetryAt: null, cards: [] };
      this.racks.set(key, rack);
    }
    if (patch.status !== undefined) rack.status = patch.status;
    if (patch.dataCurrent !== undefined) rack.dataCurrent = patch.dataCurrent;
    if (patch.reason !== undefined) rack.reason = patch.reason;
    if (patch.slotCount !== undefined && patch.slotCount > 0) rack.slotCount = patch.slotCount;
    if (seen && Date.parse(now) >= Date.parse(rack.lastSeenAt)) {
      rack.lastSeenAt = now;
      const linked: LinkState = rack.status.toLowerCase() === "connected" && rack.dataCurrent ? "ONLINE" : "STALE";
      rack.state = linked;
    }
    return rack;
  }

  /** Forget a card the operator deleted: its readings and its place in the rack's card list. */
  forgetCard(gatewayId: string, rackId: string, card: string) {
    const key = rackKey(gatewayId, rackId);
    this.cards.get(key)?.delete(card);
    const rack = this.racks.get(key);
    if (rack) this.syncCards(rack);
    for (const [mKey, m] of this.measurements) {
      if (m.gatewayId === gatewayId && m.rackId === rackId && m.slot === card) this.measurements.delete(mKey);
    }
  }

  private dropRack(key: string) {
    const rack = this.racks.get(key);
    if (!rack) return;
    this.racks.delete(key);
    this.cards.delete(key);
    for (const [mKey, m] of this.measurements) {
      if (m.gatewayId === rack.gatewayId && m.rackId === rack.rackId) this.measurements.delete(mKey);
    }
  }

  private applyReading(msg: Envelope, slot: Record<string, unknown>, dataCurrent: boolean, now: string) {
    const slotNo = integer(slot.slot_number);
    if (slotNo === null) return;
    // The real CC v3 gateway sends no channel id: one channel per slot.
    const channel = ident(slot.channel_id ?? slot.channel_number ?? slot.channel) ?? "1";
    // Every card that sends a reading is a card of the rack, valid or not.
    this.seeCard(msg.gateway_id, msg.rack_id!, String(slotNo), channel, text(slot.card_type) ?? ident(slot.card_type_code));
    const display = text(slot.value_display) ?? text(slot.value_formatted);
    const channelStatus = text(slot.channel_status);
    const valid =
      slot.measurement_valid === true &&
      (channelStatus ?? "ok").toLowerCase() === "ok" &&
      // An absent display string is not an invalid one (value_raw-only slots).
      !(display !== null && INVALID_DISPLAY.has(display.trim().toLowerCase()));
    // Only readings that would be shown as live are kept; an invalid reading
    // marks the existing one stale rather than overwriting it with garbage.
    const key = measurementKey(this.brokerId, msg.gateway_id, msg.rack_id!, String(slotNo), channel);
    const existing = this.measurements.get(key);
    if (!valid || !dataCurrent) {
      if (existing) {
        existing.fresh = false;
        existing.valid = false;
        existing.channelStatus = channelStatus;
      }
      return;
    }
    const freshness = text(slot.freshness) ?? text(slot.data_status);
    this.measurements.set(key, {
      key,
      brokerId: this.brokerId,
      gatewayId: msg.gateway_id,
      rackId: msg.rack_id!,
      slot: String(slotNo),
      channel,
      cardType: text(slot.card_type),
      sensor: text(slot.sensor) ?? text(slot.measurement_type),
      // `value` is the numeric field; `value_formatted` may be a display string.
      value: numeric(slot.value) ?? scaled(slot, "value"),
      display,
      unit: text(slot.unit) ?? "",
      valid: true,
      fresh: freshness === null || ["fresh", "current"].includes(freshness.toLowerCase()),
      channelStatus,
      alertThreshold: numeric(slot.alert_threshold) ?? scaled(slot, "alert_value"),
      dangerThreshold: numeric(slot.danger_threshold) ?? scaled(slot, "danger_value"),
      alertActive: isActive(slot.alert_state, slot.alert_status) || slot.alert_status_code === 1,
      dangerActive: isActive(slot.danger_state, slot.danger_status) || slot.danger_status_code === 1,
      updatedAt: now,
      // The gateway stamps the telemetry message when it read the rack.
      sampledAt: msg.created_at ?? null,
    });
  }
}
