// The edge registry: what the plant is wired to, configured in the app and
// stored in PostgreSQL (never in .env).
//
//   broker ◀── gateway ──▶ source (rack · PLC · SCADA · DCS · analyser) ──▶ point (sensor / tag)
//
// A gateway publishes to one broker in one data format (EdgeFormat): the
// built-in ultron/v1 contract, or a JSON layout described in the app. Whatever
// the format, every reading resolves to (rack, card, channel): the rack is a
// source (`source.code`), the card its slot, the channel a point. Card and
// channel ids are text because many gateways name them ("AI-3", "TT-101").
// Live state is joined to the registry on (gateway.code, source.code, card, channel).

export type SourceKind = "rack" | "plc" | "scada" | "dcs" | "analyzer" | "other";

export const SOURCE_KINDS: SourceKind[] = ["rack", "plc", "scada", "dcs", "analyzer", "other"];

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  rack: "DAQ rack",
  plc: "PLC",
  scada: "SCADA",
  dcs: "DCS",
  analyzer: "Analyser",
  other: "Other",
};

export const SOURCE_PROTOCOLS = [
  "Backplane",
  "OPC UA",
  "Modbus TCP",
  "Modbus RTU",
  "EtherNet/IP",
  "PROFINET",
  "S7",
  "HART-IP",
  "BACnet/IP",
  "Other",
] as const;

export type PointDataType = "float" | "int" | "bool" | "string";

export interface EdgeBroker {
  id: string;
  name: string;
  host: string;
  port: number;
  tls: boolean;
  /** 5 or 4 (3.1.1). `null` tries 5 and steps down to 4 once if the broker refuses it. */
  protocolVersion: 4 | 5 | null;
  username: string | null;
  /** The password itself never leaves the server. */
  hasPassword: boolean;
  clientIdPrefix: string;
  /** Root of the gateway tree, default `ultron/v1/gateways`. */
  topicPrefix: string;
  qos: 0 | 1;
  rejectUnauthorized: boolean;
  /** PEM of a private CA. Public, so it is returned. */
  caCert: string | null;
  /** mTLS client certificate + key are stored; only their presence is returned. */
  hasClientCert: boolean;
  /** Commands the console may publish to gateways on this broker. */
  allowedCommands: string[];
  enabled: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EdgeGateway {
  id: string;
  /** The gateway_id the gateway publishes (topic segment + envelope). Unique per broker. */
  code: string;
  name: string;
  brokerId: string | null;
  /** EdgeFormat.id; `null` = the built-in ULTRON contract. */
  formatId: string | null;
  /**
   * Extra MQTT topic filters subscribed for this gateway, on top of the ones its
   * data format implies. Messages on them are parsed with the gateway's format
   * when it matches, and are always kept as raw samples.
   */
  topics: string[];
  /** Plant / area / group node in the asset hierarchy this gateway serves. */
  siteNodeId: string | null;
  location: string | null;
  ipAddress: string | null;
  model: string | null;
  firmware: string | null;
  enabled: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EdgeSource {
  id: string;
  /** Parent gateway's internal id. */
  gatewayId: string;
  /** The rack_id this source appears under on the wire. Unique per gateway. */
  code: string;
  name: string;
  kind: SourceKind;
  protocol: string;
  /** opc.tcp://…, 10.0.0.5:502, slot path, … */
  endpoint: string | null;
  location: string | null;
  /** Primary machine this source instruments. Points may map to others. */
  machineId: string | null;
  model: string | null;
  pollIntervalMs: number | null;
  enabled: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A card (module / slot) in a source. Points on it share its `code` as their `slot`. */
export interface EdgeCard {
  id: string;
  sourceId: string;
  /** Card id on the wire (ULTRON: slot number). Unique per source. */
  code: string;
  /** VIBRATION, PROCESS, AI, RTD… as reported or typed. */
  cardType: string | null;
  /** Channels on the card; null when unknown. */
  channelCount: number | null;
  model: string | null;
  notes: string | null;
  enabled: boolean;
}

export interface EdgePoint {
  id: string;
  /** Parent source's internal id. */
  sourceId: string;
  tag: string;
  name: string;
  /** Card (slot) id in the source's telemetry. Unique per source with `channel`. */
  slot: string;
  /** Channel id on that card. */
  channel: string;
  /** Register, OPC UA node id, PLC tag path… */
  address: string | null;
  unit: string | null;
  dataType: PointDataType;
  sampleRate: string | null;
  alertLimit: number | null;
  dangerLimit: number | null;
  /** Machine + signal tag this point feeds in the asset model. */
  machineId: string | null;
  signalTag: string | null;
  enabled: boolean;
}

/** Hierarchy node a gateway can be placed under. */
export interface EdgeSiteOption {
  id: string;
  name: string;
  type: "plant" | "area" | "group";
  parentId: string | null;
}

export interface EdgeMachineOption {
  id: string;
  name: string;
}

export interface EdgeRegistry {
  formats: EdgeFormat[];
  brokers: EdgeBroker[];
  gateways: EdgeGateway[];
  sources: EdgeSource[];
  cards: EdgeCard[];
  points: EdgePoint[];
  sites: EdgeSiteOption[];
  machines: EdgeMachineOption[];
}

// ---------------------------------------------------------------- inputs
// Create takes every required field; update takes any subset.

export interface EdgeBrokerInput {
  name: string;
  host: string;
  port: number;
  tls: boolean;
  protocolVersion: 4 | 5 | null;
  username: string | null;
  /** `undefined` keeps the stored password, `""` or `null` clears it. */
  password?: string | null;
  clientIdPrefix: string;
  topicPrefix: string;
  qos: 0 | 1;
  rejectUnauthorized: boolean;
  caCert: string | null;
  /** `undefined` keeps the stored value, `""` or `null` clears it. */
  clientCert?: string | null;
  clientKey?: string | null;
  allowedCommands: string[];
  enabled: boolean;
  notes: string | null;
}

export type EdgeGatewayInput = Omit<EdgeGateway, "id" | "createdAt" | "updatedAt" | "topics"> & { topics?: string[] };
export type EdgeSourceInput = Omit<EdgeSource, "id" | "createdAt" | "updatedAt">;
export type EdgePointInput = Omit<EdgePoint, "id">;
export type EdgeCardInput = Omit<EdgeCard, "id">;

export type EdgeKind = "formats" | "brokers" | "gateways" | "sources" | "cards" | "points";

export interface EdgeInputByKind {
  formats: EdgeFormatInput;
  brokers: EdgeBrokerInput;
  gateways: EdgeGatewayInput;
  sources: EdgeSourceInput;
  cards: EdgeCardInput;
  points: EdgePointInput;
}

export interface EdgeEntityByKind {
  formats: EdgeFormat;
  brokers: EdgeBroker;
  gateways: EdgeGateway;
  sources: EdgeSource;
  cards: EdgeCard;
  points: EdgePoint;
}

/** Result of opening a throwaway connection with a broker's settings. */
export interface BrokerTestResult {
  ok: boolean;
  /** Time to CONNACK, or to failure. */
  ms: number;
  protocolVersion: 4 | 5 | null;
  error: string | null;
}

// ---------------------------------------------------------------- data formats
// How a gateway's messages are read. Parsed by src/lib/edge-format (shared by
// the server runtime and the browser preview).

/** `ultron-v2`: the built-in gateway contract (envelopes, topology, inventory). `json`: described below. */
export type FormatKind = "ultron-v2" | "json";

export type TimestampFormat = "iso" | "epoch_ms" | "epoch_s" | "epoch_us" | "none";

/**
 * Field paths, resolved against each record and then its ancestors up to the
 * payload root (so a rack id held once per rack applies to every channel in it).
 *
 *   "value"              key on the record           "data.v"     nested key
 *   "items[0].id"        array index                 "$key"       key of an object-map record
 *   "$index"             position in its array       "=°C"        literal value
 *   "" (empty)           not in the payload: take it from the topic, else the default
 */
export interface FormatFields {
  rack: string;
  /** Display name of the rack / PLC / SCADA node; also picks its kind when it is registered. */
  rackName: string;
  card: string;
  channel: string;
  value: string;
  unit: string;
  name: string;
  cardType: string;
  quality: string;
  timestamp: string;
  alert: string;
  danger: string;
}

export const FORMAT_FIELD_KEYS: (keyof FormatFields)[] = [
  "rack",
  "rackName",
  "card",
  "channel",
  "value",
  "unit",
  "name",
  "cardType",
  "quality",
  "timestamp",
  "alert",
  "danger",
];

export interface EdgeFormat {
  id: string;
  name: string;
  description: string | null;
  kind: FormatKind;
  /**
   * Full topic template, e.g. `plant/{gateway}/{rack}/data` (not under the
   * broker's ULTRON prefix; the built-in contract alone is relative to it).
   * Placeholders {gateway} {rack} {card} {channel} capture one level; `+` and a
   * trailing `#` match like MQTT filters. The runtime subscribes with {gateway}
   * replaced by each assigned gateway's code. Ignored for `ultron-v2`.
   */
  topic: string;
  /**
   * Where readings sit in the payload: "" = the payload is one reading;
   * "data" = an array (or an object map: each key becomes a record with $key);
   * "racks[*].cards[*].channels[*]" = nested arrays, flattened.
   */
  records: string;
  fields: FormatFields;
  timestampFormat: TimestampFormat;
  /** Used when neither the payload nor the topic gives the id. */
  defaults: { rack: string; card: string; channel: string };
  /** Built-in formats cannot be edited or deleted. */
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EdgeFormatInput = Omit<EdgeFormat, "id" | "builtIn" | "createdAt" | "updatedAt">;

/** One reading produced by a format from one message. */
export interface ParsedReading {
  rack: string;
  /** Rack / PLC / SCADA display name, when the payload carries one. */
  rackName: string | null;
  card: string;
  channel: string;
  value: number | null;
  /** The raw value as text when it is not numeric ("RUN", "OPEN"). */
  display: string | null;
  unit: string | null;
  name: string | null;
  cardType: string | null;
  valid: boolean;
  /** Source timestamp, ms since epoch. */
  at: number | null;
  alert: number | null;
  danger: number | null;
}

export interface ParseResult {
  /** Topic matched the format's template (for the given gateway). */
  matched: boolean;
  /** Ids captured from the topic. */
  captures: Partial<Record<"gateway" | "rack" | "card" | "channel", string>>;
  readings: ParsedReading[];
  /** Problems a person can act on: bad JSON, path not found, value not numeric… */
  errors: string[];
}

// ---------------------------------------------------------------- mapping
/** Map one live (or typed) channel to a machine signal. Creates the source and point if needed. */
export interface EdgeMapInput {
  gatewayId: string;
  /** Rack id on the wire (= source code). */
  rack: string;
  card: string;
  channel: string;
  machineId: string;
  /** Signal tag; an existing tag of that machine is linked, a new one is created in its sensor list. */
  tag: string;
  name: string;
  unit: string | null;
  alertLimit: number | null;
  dangerLimit: number | null;
  /** Used only when the rack is not yet a source. */
  sourceKind?: SourceKind;
}

export interface EdgeMapResult {
  source: EdgeSource;
  point: EdgePoint;
  sourceCreated: boolean;
  /** A new row was added to the machine's sensor list (mapped_signals). */
  signalCreated: boolean;
}

/** A broker message kept for designing formats. */
export interface RawSample {
  brokerId: string;
  topic: string;
  at: string;
  bytes: number;
  /** UTF-8 text, cut at 16 kB. */
  payload: string;
  truncated: boolean;
  /** Messages received on this topic since the server started. */
  count?: number;
}

// ---------------------------------------------------------------- machine view
/** One mapped point of a machine with its live reading, resolved on the server. */
export interface MachineLivePoint {
  pointId: string;
  tag: string;
  name: string;
  signalTag: string | null;
  unit: string | null;
  alertLimit: number | null;
  dangerLimit: number | null;
  gateway: { id: string; code: string; name: string; brokerId: string | null };
  source: { id: string; code: string; name: string; kind: SourceKind; protocol: string };
  card: string;
  /** The registry's card row (edge_cards) the point sits on; nulls when none is recorded. */
  cardInfo: { type: string | null; model: string | null; note: string | null; channelCount: number | null };
  channel: string;
  address: string | null;
  live: {
    state: "normal" | "alert" | "danger" | "stale" | "nodata";
    value: number | null;
    display: string | null;
    unit: string | null;
    updatedAt: string | null;
    cardType: string | null;
  };
}

export interface MachineAcquisition {
  machineId: string;
  serverNow: string;
  points: MachineLivePoint[];
  /** Per gateway: link state now. */
  gateways: { id: string; code: string; name: string; brokerName: string | null; state: "online" | "stale" | "offline" | "waiting" | "disabled"; lastSeenAt: string | null; ip: string | null }[];
}

// ---------------------------------------------------------------- commissioning
/**
 * Register a gateway with what it reports (or what was typed) in one step:
 * the gateway, its sources and their cards. Commissioning an existing gateway
 * (`gatewayId`) adds the sources and cards it does not have yet and leaves the
 * rest unchanged.
 */
export interface EdgeCommissionInput {
  /** Existing gateway to extend; omit to create `gateway`. */
  gatewayId?: string;
  gateway?: EdgeGatewayInput;
  sources: {
    code: string;
    name: string;
    kind: SourceKind;
    protocol: string;
    machineId?: string | null;
    cards: { code: string; cardType: string | null; channelCount: number | null }[];
  }[];
}

export interface EdgeCommissionResult {
  gateway: EdgeGateway;
  sourcesCreated: number;
  cardsCreated: number;
  /** Sources / cards that already existed and were left as they were. */
  skipped: number;
}
