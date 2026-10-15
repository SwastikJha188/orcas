import type { Tone } from "@/components/assets/assets-shell-ui";
import type { EdgeBroker, EdgeGateway, EdgePoint, EdgeRegistry, EdgeSource } from "@/types/edge";
import type { MqttGateway, MqttMeasurement, MqttRack, MqttSnapshot } from "@/types/mqtt";

/* ==========================================================================
   Edge model: joins what is configured (registry) with what the brokers
   report (live snapshot). Pure functions, no React.

   Match keys
     gateway  ← live gateway with the same code on the gateway's broker
     source   ← live rack with rackId = source.code on that gateway
     point    ← live measurement on that rack with the same slot + channel
   ========================================================================== */

export const sep = "\u0000";

export type LinkStatus = "online" | "stale" | "offline" | "waiting" | "disabled";

export const LINK_TONE: Record<LinkStatus, Tone> = {
  online: "good",
  stale: "warn",
  offline: "bad",
  waiting: "idle",
  disabled: "idle",
};

export const LINK_LABEL: Record<LinkStatus, string> = {
  online: "Online",
  stale: "Stale",
  offline: "Offline",
  waiting: "No data",
  disabled: "Disabled",
};

const LINK_RANK: Record<LinkStatus, number> = { online: 0, disabled: 1, waiting: 2, stale: 3, offline: 4 };

export interface LinkState {
  status: LinkStatus;
  /** Why, when it is not plainly online: "Broker disabled", "Not assigned to a broker"… */
  reason: string | null;
  lastSeenAt: string | null;
}

export type ReadingStatus = "normal" | "alert" | "danger" | "stale" | "nodata" | "disabled";

export const READING_TONE: Record<ReadingStatus, Tone> = {
  normal: "good",
  alert: "warn",
  danger: "bad",
  stale: "warn",
  nodata: "idle",
  disabled: "idle",
};

export const READING_LABEL: Record<ReadingStatus, string> = {
  normal: "Normal",
  alert: "Warning",
  danger: "Alarm",
  stale: "Stale",
  nodata: "No data",
  disabled: "Disabled",
};

export interface PointReading {
  status: ReadingStatus;
  value: number | null;
  display: string | null;
  unit: string | null;
  updatedAt: string | null;
  measurement: MqttMeasurement | null;
}

// ---------------------------------------------------------------- index
export interface EdgeIndex {
  registry: EdgeRegistry;
  snapshot: MqttSnapshot | null;
  brokers: Map<string, EdgeBroker>;
  gateways: Map<string, EdgeGateway>;
  sources: Map<string, EdgeSource>;
  points: Map<string, EdgePoint>;
  sourcesByGateway: Map<string, EdgeSource[]>;
  pointsBySource: Map<string, EdgePoint[]>;
  liveGateways: Map<string, MqttGateway>; // brokerId·code
  liveRacks: Map<string, MqttRack>; // brokerId·gateway·rack
  liveMeasurements: Map<string, MqttMeasurement>; // brokerId·gateway·rack·slot·channel
  brokerState: Map<string, MqttSnapshot["brokers"][number]>;
}

function group<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = out.get(k);
    if (list) list.push(item);
    else out.set(k, [item]);
  }
  return out;
}

export function buildIndex(registry: EdgeRegistry, snapshot: MqttSnapshot | null): EdgeIndex {
  return {
    registry,
    snapshot,
    brokers: new Map(registry.brokers.map((b) => [b.id, b])),
    gateways: new Map(registry.gateways.map((g) => [g.id, g])),
    sources: new Map(registry.sources.map((s) => [s.id, s])),
    points: new Map(registry.points.map((p) => [p.id, p])),
    sourcesByGateway: group(registry.sources, (s) => s.gatewayId),
    pointsBySource: group(registry.points, (p) => p.sourceId),
    liveGateways: new Map((snapshot?.gateways ?? []).map((g) => [`${g.brokerId}${sep}${g.gatewayId}`, g])),
    liveRacks: new Map((snapshot?.racks ?? []).map((r) => [`${r.brokerId}${sep}${r.gatewayId}${sep}${r.rackId}`, r])),
    liveMeasurements: new Map(
      (snapshot?.measurements ?? []).map((m) => [`${m.brokerId}${sep}${m.gatewayId}${sep}${m.rackId}${sep}${m.slot}${sep}${m.channel}`, m]),
    ),
    brokerState: new Map((snapshot?.brokers ?? []).map((b) => [b.brokerId, b])),
  };
}

// ---------------------------------------------------------------- live lookup
/** The live gateway record, on its own broker (or any broker when unassigned). */
export function liveGateway(ix: EdgeIndex, gw: EdgeGateway): MqttGateway | undefined {
  if (gw.brokerId) return ix.liveGateways.get(`${gw.brokerId}${sep}${gw.code}`);
  for (const g of ix.liveGateways.values()) if (g.gatewayId === gw.code) return g;
  return undefined;
}

export function liveRack(ix: EdgeIndex, src: EdgeSource): MqttRack | undefined {
  const gw = ix.gateways.get(src.gatewayId);
  const g = gw && liveGateway(ix, gw);
  return g ? ix.liveRacks.get(`${g.brokerId}${sep}${g.gatewayId}${sep}${src.code}`) : undefined;
}

export function liveMeasurement(ix: EdgeIndex, point: EdgePoint): MqttMeasurement | undefined {
  const src = ix.sources.get(point.sourceId);
  const gw = src && ix.gateways.get(src.gatewayId);
  const g = gw && liveGateway(ix, gw);
  if (!g || !src) return undefined;
  return ix.liveMeasurements.get(`${g.brokerId}${sep}${g.gatewayId}${sep}${src.code}${sep}${point.slot}${sep}${point.channel}`);
}

const fromLive = (s: "ONLINE" | "STALE" | "OFFLINE"): LinkStatus => (s === "ONLINE" ? "online" : s === "STALE" ? "stale" : "offline");

/** Why nothing can arrive for a gateway, before looking at live data. */
function blocked(ix: EdgeIndex, gw: EdgeGateway): string | null {
  if (!gw.brokerId) return "Not assigned to a broker";
  const broker = ix.brokers.get(gw.brokerId);
  if (!broker) return "Broker removed";
  if (!broker.enabled) return `${broker.name} is disabled`;
  const state = ix.brokerState.get(broker.id)?.state;
  if (state && state !== "connected") return `${broker.name} is ${state === "disabled" ? "disabled" : "not connected"}`;
  return null;
}

export function gatewayLink(ix: EdgeIndex, gw: EdgeGateway): LinkState {
  if (!gw.enabled) return { status: "disabled", reason: "Gateway disabled", lastSeenAt: null };
  const live = liveGateway(ix, gw);
  if (live) {
    const why = blocked(ix, gw);
    // A broker that dropped keeps the last state; say so rather than show green.
    if (why && live.state === "ONLINE") return { status: "stale", reason: why, lastSeenAt: live.lastSeenAt };
    return { status: fromLive(live.state), reason: live.state === "ONLINE" ? null : "No message within the stale window", lastSeenAt: live.lastSeenAt };
  }
  return { status: "waiting", reason: blocked(ix, gw) ?? "Nothing published yet", lastSeenAt: null };
}

export function sourceLink(ix: EdgeIndex, src: EdgeSource): LinkState {
  const gw = ix.gateways.get(src.gatewayId);
  if (!src.enabled) return { status: "disabled", reason: "Source disabled", lastSeenAt: null };
  if (!gw) return { status: "waiting", reason: "Gateway removed", lastSeenAt: null };
  const parent = gatewayLink(ix, gw);
  if (parent.status === "disabled") return { status: "disabled", reason: parent.reason, lastSeenAt: null };
  const rack = liveRack(ix, src);
  if (!rack) {
    const reason = parent.status === "waiting" ? parent.reason : `${gw.code} does not report ${src.code}`;
    return { status: "waiting", reason, lastSeenAt: null };
  }
  // A rack cannot be fresher than the gateway it is reached through.
  const own = fromLive(rack.state);
  const status = LINK_RANK[parent.status] > LINK_RANK[own] && parent.status !== "waiting" ? parent.status : own;
  return { status, reason: rack.reason ?? (rack.dataCurrent ? null : "Data not current"), lastSeenAt: rack.lastSeenAt };
}

export function pointReading(ix: EdgeIndex, point: EdgePoint): PointReading {
  const src = ix.sources.get(point.sourceId);
  const empty = { value: null, display: null, unit: point.unit, updatedAt: null, measurement: null };
  if (!point.enabled || (src && sourceLink(ix, src).status === "disabled")) return { status: "disabled", ...empty };
  const m = liveMeasurement(ix, point);
  if (!m) return { status: "nodata", ...empty };
  // Payload flags when the gateway sends them, else the point's own limits.
  const over = (limit: number | null) => limit !== null && m.value !== null && m.value >= limit;
  const status: ReadingStatus =
    !m.valid || !m.fresh ? "stale" : m.dangerActive || over(point.dangerLimit) ? "danger" : m.alertActive || over(point.alertLimit) ? "alert" : "normal";
  return { status, value: m.value, display: m.display, unit: m.unit || point.unit, updatedAt: m.updatedAt, measurement: m };
}

// ---------------------------------------------------------------- roll-ups
export interface LinkCounts {
  online: number;
  stale: number;
  offline: number;
  waiting: number;
  disabled: number;
}

export interface ReadingCounts {
  normal: number;
  alert: number;
  danger: number;
  stale: number;
  nodata: number;
  disabled: number;
}

export const emptyLinkCounts = (): LinkCounts => ({ online: 0, stale: 0, offline: 0, waiting: 0, disabled: 0 });
export const emptyReadingCounts = (): ReadingCounts => ({ normal: 0, alert: 0, danger: 0, stale: 0, nodata: 0, disabled: 0 });

export function sourcesOf(ix: EdgeIndex, gatewayId: string): EdgeSource[] {
  return ix.sourcesByGateway.get(gatewayId) ?? [];
}

export function pointsOf(ix: EdgeIndex, sourceId: string): EdgePoint[] {
  return ix.pointsBySource.get(sourceId) ?? [];
}

export function gatewayPoints(ix: EdgeIndex, gatewayId: string): EdgePoint[] {
  return sourcesOf(ix, gatewayId).flatMap((s) => pointsOf(ix, s.id));
}

export function countLinks<T>(items: T[], link: (t: T) => LinkState): LinkCounts {
  const c = emptyLinkCounts();
  for (const item of items) c[link(item).status] += 1;
  return c;
}

export function countReadings(ix: EdgeIndex, points: EdgePoint[]): ReadingCounts {
  const c = emptyReadingCounts();
  for (const p of points) c[pointReading(ix, p).status] += 1;
  return c;
}

/** Worst state for a tree mark: a gateway rolls up its sources, a source its points. */
export function worstTone(...tones: Tone[]): Tone {
  const rank: Record<Tone, number> = { good: 0, info: 0, idle: 1, warn: 2, bad: 3 };
  return tones.reduce<Tone>((a, b) => (rank[b] > rank[a] ? b : a), "good");
}

export function sourceTone(ix: EdgeIndex, src: EdgeSource): Tone {
  const link = sourceLink(ix, src);
  if (link.status !== "online") return LINK_TONE[link.status];
  const r = countReadings(ix, pointsOf(ix, src.id));
  return r.danger ? "bad" : r.alert ? "warn" : "good";
}

export function gatewayTone(ix: EdgeIndex, gw: EdgeGateway): Tone {
  const link = gatewayLink(ix, gw);
  if (link.status !== "online") return LINK_TONE[link.status];
  return worstTone(...sourcesOf(ix, gw.id).map((s) => sourceTone(ix, s)));
}

// ---------------------------------------------------------------- discovery
export interface DiscoveredGateway {
  brokerId: string;
  gatewayId: string;
  ip: string;
  state: MqttGateway["state"];
  lastSeenAt: string;
  rackIds: string[];
}

export interface DiscoveredRack {
  brokerId: string;
  gatewayId: string;
  rackId: string;
  slotCount: number;
  state: MqttRack["state"];
  /** Registered gateway this rack belongs to. */
  gateway: EdgeGateway;
}

/** Gateways publishing to a broker that are not in the registry. */
export function discoveredGateways(ix: EdgeIndex): DiscoveredGateway[] {
  if (!ix.snapshot) return [];
  const known = new Set(
    ix.registry.gateways.flatMap((g) => (g.brokerId ? [`${g.brokerId}${sep}${g.code}`] : ix.registry.brokers.map((b) => `${b.id}${sep}${g.code}`))),
  );
  return ix.snapshot.gateways
    .filter((g) => !known.has(`${g.brokerId}${sep}${g.gatewayId}`))
    .map((g) => ({
      brokerId: g.brokerId,
      gatewayId: g.gatewayId,
      ip: g.ip,
      state: g.state,
      lastSeenAt: g.lastSeenAt,
      rackIds: ix.snapshot!.racks.filter((r) => r.brokerId === g.brokerId && r.gatewayId === g.gatewayId).map((r) => r.rackId),
    }));
}

/** Racks a registered gateway reports that are not configured as sources. */
export function discoveredRacks(ix: EdgeIndex, gw: EdgeGateway): DiscoveredRack[] {
  const live = liveGateway(ix, gw);
  if (!live || !ix.snapshot) return [];
  const codes = new Set(sourcesOf(ix, gw.id).map((s) => s.code));
  return ix.snapshot.racks
    .filter((r) => r.brokerId === live.brokerId && r.gatewayId === live.gatewayId && !codes.has(r.rackId))
    .map((r) => ({ brokerId: r.brokerId, gatewayId: r.gatewayId, rackId: r.rackId, slotCount: r.slotCount, state: r.state, gateway: gw }));
}

/** Channels a source publishes that no configured point maps. */
export function unmappedChannels(ix: EdgeIndex, src: EdgeSource): MqttMeasurement[] {
  const rack = liveRack(ix, src);
  if (!rack || !ix.snapshot) return [];
  const mapped = new Set(pointsOf(ix, src.id).map((p) => `${p.slot}${sep}${p.channel}`));
  return ix.snapshot.measurements.filter(
    (m) => m.brokerId === rack.brokerId && m.gatewayId === rack.gatewayId && m.rackId === rack.rackId && !mapped.has(`${m.slot}${sep}${m.channel}`),
  );
}

// ---------------------------------------------------------------- formatting
export function ago(iso: string | null, now: number): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 2) return "now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Site label for a gateway: "Plant › Area". */
export function sitePath(registry: EdgeRegistry, nodeId: string | null): string | null {
  if (!nodeId) return null;
  const byId = new Map(registry.sites.map((s) => [s.id, s]));
  const names: string[] = [];
  let n = byId.get(nodeId);
  while (n) {
    names.unshift(n.type === "plant" ? n.name.split("—")[0].split("(")[0].trim() : n.name);
    n = n.parentId ? byId.get(n.parentId) : undefined;
  }
  return names.length ? names.join(" › ") : null;
}

/** The plant (root) node a gateway sits under, for the plant filter. */
export function plantOf(registry: EdgeRegistry, nodeId: string | null): string | null {
  if (!nodeId) return null;
  const byId = new Map(registry.sites.map((s) => [s.id, s]));
  let n = byId.get(nodeId);
  while (n?.parentId) n = byId.get(n.parentId);
  return n?.id ?? null;
}
