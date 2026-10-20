// Shared shapes for the MQTT ingest runtime (src/server/mqtt) and the browser.
// The server owns the current state; the browser receives it whole over SSE.
// The runtime holds one connection per enabled broker in the edge registry
// (src/types/edge.ts); every live record names the broker it arrived on.

export type BrokerState = "disabled" | "connecting" | "connected" | "reconnecting" | "offline";

export interface BrokerStatus {
  /** EdgeBroker.id */
  brokerId: string;
  name: string;
  state: BrokerState;
  enabled: boolean;
  /** `host:port` */
  host: string;
  tls: boolean;
  /** Negotiated version once connected; the configured one before. */
  protocolVersion: number | null;
  clientId: string | null;
  topicPrefix: string;
  connectedAt: string | null;
  reconnects: number;
  lastError: string | null;
  subscriptions: string[];
  pendingCommands: number;
  allowedCommands: string[];
  metrics: MqttMetrics;
  /** A temporary capture subscription (Devices › Data formats › Listen), if one is running. */
  listening: { filter: string; until: string } | null;
}

export type LinkState = "ONLINE" | "STALE" | "OFFLINE";

export interface MqttGateway {
  brokerId: string;
  gatewayId: string;
  ip: string;
  bootId: string;
  state: LinkState;
  lastSeenAt: string;
  lastSequence: number;
  /** Messages missing between consecutive sequence numbers within one boot. */
  sequenceGaps: number;
  replayed: number;
  messages: number;
}

export interface MqttRack {
  brokerId: string;
  gatewayId: string;
  rackId: string;
  state: LinkState;
  status: string;
  dataCurrent: boolean;
  reason: string | null;
  slotCount: number;
  lastSeenAt: string;
  lastTelemetryAt: string | null;
  /**
   * Cards the rack reports, in natural order: from the ULTRON inventory
   * (retained, so known at subscribe time) merged with every card that has
   * sent a reading; custom formats only have the latter.
   */
  cards: MqttCard[];
}

export interface MqttCard {
  /** Card id (ULTRON: slot number as text). */
  card: string;
  cardType: string | null;
  /** Channel ids seen in telemetry, natural order. Empty until a reading arrives. */
  channels: string[];
  /** Inventory presence/online state when reported ("PRESENT", "ONLINE"…). */
  presence: string | null;
}

export interface MqttMeasurement {
  /** brokerId · gatewayId · rackId · slot · channel */
  key: string;
  brokerId: string;
  gatewayId: string;
  rackId: string;
  /** Card id (ULTRON contract: slot number as text). */
  slot: string;
  channel: string;
  cardType: string | null;
  sensor: string | null;
  value: number | null;
  display: string | null;
  unit: string;
  valid: boolean;
  fresh: boolean;
  channelStatus: string | null;
  alertThreshold: number | null;
  dangerThreshold: number | null;
  alertActive: boolean;
  dangerActive: boolean;
  updatedAt: string;
  /** When the source says the value was acquired (ISO), when it says; null when only the receipt time is known. */
  sampledAt?: string | null;
}

export interface MqttAlarm {
  id: string;
  brokerId: string;
  gatewayId: string;
  rackId: string;
  severity: "WARNING" | "CRITICAL";
  state: "ACTIVE" | "CLEARED";
  message: string | null;
  slot: string | null;
  channel: string | null;
  value: number | null;
  threshold: number | null;
  unit: string | null;
  at: string;
}

export interface MqttTrafficEntry {
  /** Unique across brokers for the life of the process. */
  id: number;
  brokerId: string;
  at: string;
  topic: string;
  kind: string;
  schema: string | null;
  bytes: number;
  retained: boolean;
  replayed: boolean;
  duplicate: boolean;
  latencyMs: number | null;
  outcome: "accepted" | "quarantined";
}

export interface MqttQuarantineEntry {
  id: number;
  brokerId: string;
  at: string;
  topic: string;
  reason: string;
  gatewayId: string | null;
}

export interface MqttMetrics {
  messagesTotal: number;
  messagesPerSecond: number;
  bytesTotal: number;
  duplicates: number;
  quarantined: number;
  schemaFailures: number;
  identityMismatches: number;
  parseFailures: number;
  payloadTooLarge: number;
  sequenceGaps: number;
  /** Median gateway sample → app receipt over the last 200 messages. Includes clock skew. */
  latencyP50Ms: number | null;
  latencyP95Ms: number | null;
  lastMessageAt: string | null;
}

export interface MqttSnapshot {
  serverNow: string;
  /** One per broker in the registry, enabled or not, in registry order. */
  brokers: BrokerStatus[];
  /** Summed across brokers (latency percentiles over the merged window). */
  metrics: MqttMetrics;
  gateways: MqttGateway[];
  racks: MqttRack[];
  measurements: MqttMeasurement[];
  alarms: MqttAlarm[];
  quarantine: MqttQuarantineEntry[];
}

/** One SSE `tick`: the current state plus traffic seen since the last tick. */
export interface MqttTick {
  snapshot: MqttSnapshot;
  traffic: MqttTrafficEntry[];
}

export interface MqttCommandResult {
  brokerId: string;
  requestId: string;
  topic: string;
  roundTripMs: number;
  response: { status: string; message?: string; result?: unknown };
}
