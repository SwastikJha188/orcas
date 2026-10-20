import type { Tone } from "@/components/assets/assets-shell-ui";
import type { EdgeBroker, EdgeGateway, EdgeRegistry } from "@/types/edge";
import type { BrokerState, BrokerStatus, LinkState, MqttMetrics, MqttSnapshot } from "@/types/mqtt";

/* ==========================================================================
   Devices › MQTT: joins the broker registry (what is configured) with the
   runtime's per-broker status (what is connected). Pure functions, no React.
   ========================================================================== */

export const BROKER_STATE: Record<BrokerState, [Tone, string]> = {
  connected: ["good", "Connected"],
  connecting: ["info", "Connecting"],
  reconnecting: ["warn", "Reconnecting"],
  offline: ["bad", "Offline"],
  disabled: ["idle", "Switched off"],
};

export const LIVE_LINK_TONE: Record<LinkState, Tone> = { ONLINE: "good", STALE: "warn", OFFLINE: "bad" };
export const LIVE_LINK_LABEL: Record<LinkState, string> = { ONLINE: "Online", STALE: "Old data", OFFLINE: "Offline" };

export const nf = new Intl.NumberFormat("en-GB");
const nf1 = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const rate = (n: number) => nf1.format(n);

export function bytes(n: number): string {
  if (n < 1024) return `${nf.format(n)} B`;
  if (n < 1024 * 1024) return `${nf1.format(n / 1024)} kB`;
  if (n < 1024 * 1024 * 1024) return `${nf1.format(n / 1024 / 1024)} MB`;
  return `${nf1.format(n / 1024 / 1024 / 1024)} GB`;
}

export function clock(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

export function protocolLabel(v: number | null): string {
  return v === 5 ? "MQTT 5.0" : v === 4 ? "MQTT 3.1.1" : "Auto";
}

export function brokerUrl(b: Pick<EdgeBroker, "tls" | "host" | "port">): string {
  const host = b.host.includes(":") && !b.host.startsWith("[") ? `[${b.host}]` : b.host;
  return `${b.tls ? "mqtts" : "mqtt"}://${host}:${b.port}`;
}

/** A configured broker with its runtime status (absent until the runtime reloads). */
export interface BrokerRow {
  broker: EdgeBroker;
  status: BrokerStatus | null;
  state: BrokerState;
  /** Registry gateways assigned to this broker. */
  registered: number;
  /** Gateways on this broker: registered ∪ seen live. */
  known: number;
  online: number;
  /** Seen live, not in the registry. */
  unregistered: number;
}

export function brokerRows(registry: EdgeRegistry, snapshot: MqttSnapshot | null): BrokerRow[] {
  const status = new Map((snapshot?.brokers ?? []).map((s) => [s.brokerId, s]));
  return registry.brokers.map((broker) => {
    const s = status.get(broker.id) ?? null;
    const state: BrokerState = !broker.enabled ? "disabled" : s ? s.state : "connecting";
    const codes = new Set(registry.gateways.filter((g) => g.brokerId === broker.id).map((g) => g.code));
    const live = (snapshot?.gateways ?? []).filter((g) => g.brokerId === broker.id);
    const known = new Set([...codes, ...live.map((g) => g.gatewayId)]);
    const unregistered = live.filter((g) => !registeredGateway(registry, g.brokerId, g.gatewayId)).length;
    return {
      broker,
      status: s,
      state,
      registered: codes.size,
      known: known.size,
      online: live.filter((g) => g.state === "ONLINE").length,
      unregistered,
    };
  });
}

/** Registry gateway for a live gateway id: assigned to that broker, or unassigned. */
export function registeredGateway(registry: EdgeRegistry, brokerId: string, code: string): EdgeGateway | undefined {
  return (
    registry.gateways.find((g) => g.code === code && g.brokerId === brokerId) ??
    registry.gateways.find((g) => g.code === code && g.brokerId === null)
  );
}

/** Header summary: "2 of 3 connected", toned by the worst enabled broker. */
export function connectionSummary(rows: BrokerRow[]): [Tone, string] {
  const enabled = rows.filter((r) => r.broker.enabled);
  if (rows.length === 0) return ["idle", "No data connections"];
  if (enabled.length === 0) return ["idle", "All switched off"];
  const connected = enabled.filter((r) => r.state === "connected").length;
  const tone: Tone =
    connected === enabled.length ? "good" : enabled.some((r) => r.state === "offline") ? "bad" : "warn";
  return [tone, `${connected} of ${enabled.length} connected`];
}

/** The part of a topic below the broker's prefix — the part that varies. */
export function shortTopic(topic: string, prefix: string | undefined): string {
  if (!prefix) return topic;
  const p = prefix.replace(/\/+$/, "") + "/";
  return topic.startsWith(p) ? topic.slice(p.length) : topic;
}

export const EMPTY_METRICS: MqttMetrics = {
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
