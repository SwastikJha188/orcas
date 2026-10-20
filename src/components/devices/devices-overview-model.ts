import type { Tone } from "@/components/assets/assets-shell-ui";
import type { BrokerState } from "@/types/mqtt";
import type { EdgeBroker, EdgeGateway, EdgePoint, EdgeSource } from "@/types/edge";
import {
  type EdgeIndex,
  type LinkCounts,
  type LinkStatus,
  type PointReading,
  LINK_TONE,
  emptyLinkCounts,
  gatewayLink,
  liveGateway,
  pointReading,
  pointsOf,
  sourceLink,
  sourcesOf,
} from "./edge-model";
import { sourceCards } from "./hierarchy/edge-detect";
import { sortGateways, sortPoints, sortSources } from "./hierarchy/edge-tree-model";

/* ==========================================================================
   Devices › Overview model: the data path, layer by layer.

     broker → gateway → source → card → point (one card = one sensor)

   Each layer gets a link status (online · stale · offline · waiting ·
   disabled). A lane follows one gateway down its path and names the first
   layer where data stops, so a broken link is found without opening the tree.
   Pure functions, no React.
   ========================================================================== */

export type Layer = "broker" | "gateway" | "source" | "card" | "point";

export const LAYERS: Layer[] = ["broker", "gateway", "source", "card", "point"];

export const LAYER_LABEL: Record<Layer, string> = {
  broker: "Data connection",
  gateway: "Data collector",
  source: "Device",
  card: "Sensor card",
  point: "Reading point",
};

const BROKER_LINK: Record<BrokerState, LinkStatus> = {
  connected: "online",
  connecting: "waiting",
  reconnecting: "stale",
  offline: "offline",
  disabled: "disabled",
};

export function brokerStatus(ix: EdgeIndex, b: EdgeBroker): LinkStatus {
  if (!b.enabled) return "disabled";
  const s = ix.brokerState.get(b.id)?.state;
  return s ? BROKER_LINK[s] : "waiting";
}

export function brokerReason(ix: EdgeIndex, b: EdgeBroker): string | null {
  if (!b.enabled) return "Data connection switched off";
  const s = ix.brokerState.get(b.id);
  if (!s) return "This data connection has not started yet";
  if (s.state === "connected") return null;
  return s.lastError ?? (s.state === "connecting" ? "Connecting" : s.state === "reconnecting" ? "Reconnecting" : "Not connected");
}

/** A point carries live data when its reading is current (normal, alert or danger). */
export function pointLink(r: PointReading): LinkStatus {
  switch (r.status) {
    case "normal":
    case "alert":
    case "danger":
      return "online";
    case "stale":
      return "stale";
    case "disabled":
      return "disabled";
    default:
      return "waiting";
  }
}

/** A card is online when the wire reports it and its source is online. */
function cardLink(sourceStatus: LinkStatus, detected: boolean, enabled: boolean): LinkStatus {
  if (!enabled || sourceStatus === "disabled") return "disabled";
  if (!detected) return "waiting";
  return sourceStatus === "online" ? "online" : sourceStatus === "waiting" ? "stale" : sourceStatus;
}

// ---------------------------------------------------------------- lanes
export interface LayerCell {
  counts: LinkCounts;
  total: number;
  /** Text under the node: a name for single items, "3 of 4" for groups. */
  label: string;
  status: LinkStatus;
}

export interface Lane {
  gateway: EdgeGateway;
  broker: EdgeBroker | null;
  cells: Record<Layer, LayerCell>;
  /** First layer where data stops (nothing online below it), or null. */
  breakAt: Layer | null;
  /** First layer that is only partly online, when nothing breaks. */
  degradedAt: Layer | null;
  reason: string | null;
  lastSeenAt: string | null;
  messages: number | null;
  lost: number | null;
  machines: Array<{ id: string; name: string }>;
  tone: Tone;
}

function cell(counts: LinkCounts, single?: string): LayerCell {
  const total = counts.online + counts.stale + counts.offline + counts.waiting + counts.disabled;
  const active = total - counts.disabled;
  const status: LinkStatus =
    total === 0
      ? "waiting"
      : active === 0
        ? "disabled"
        : counts.online === active
          ? "online"
          : counts.online > 0
            ? "stale"
            : counts.offline > 0
              ? "offline"
              : counts.stale > 0
                ? "stale"
                : "waiting";
  const label = single ?? (total === 0 ? "None" : `${counts.online} of ${active || total}`);
  return { counts, total, label, status };
}

function single(status: LinkStatus): LinkCounts {
  const c = emptyLinkCounts();
  c[status] += 1;
  return c;
}

function cleanMachineName(raw: string): string {
  return raw
    .replace(/\s*\([A-Z0-9-]+\)\s*$/, "")
    .replace(/\s+[A-Z]{2,4}-\d{2,3}\s*$/, "")
    .trim();
}

export function buildLane(ix: EdgeIndex, gw: EdgeGateway): Lane {
  const broker = gw.brokerId ? (ix.brokers.get(gw.brokerId) ?? null) : null;
  const bStatus: LinkStatus = broker ? brokerStatus(ix, broker) : "waiting";
  const gLink = gatewayLink(ix, gw);
  const live = liveGateway(ix, gw);

  const sources = sortSources(sourcesOf(ix, gw.id));
  const srcCounts = emptyLinkCounts();
  const cardCounts = emptyLinkCounts();
  const ptCounts = emptyLinkCounts();
  let firstReason: { layer: Layer; text: string } | null = null;
  const machines = new Map<string, string>();

  for (const s of sources) {
    const sl = sourceLink(ix, s);
    srcCounts[sl.status] += 1;
    if (sl.status !== "online" && sl.reason && !firstReason) firstReason = { layer: "source", text: `${s.name || s.code}: ${sl.reason}` };
    for (const c of sourceCards(ix, s)) {
      if (!c.config && !c.detected) continue;
      cardCounts[cardLink(sl.status, c.detected, c.config?.enabled ?? true)] += 1;
    }
    for (const p of pointsOf(ix, s.id)) {
      ptCounts[pointLink(pointReading(ix, p))] += 1;
      if (p.machineId) {
        const rawName = ix.registry.machines.find((m) => m.id === p.machineId)?.name ?? p.machineId;
        machines.set(p.machineId, cleanMachineName(rawName));
      }
    }
    if (s.machineId && !machines.has(s.machineId)) {
      const rawName = ix.registry.machines.find((m) => m.id === s.machineId)?.name ?? s.machineId;
      machines.set(s.machineId, cleanMachineName(rawName));
    }
  }

  const cells: Record<Layer, LayerCell> = {
    broker: cell(single(bStatus), broker?.name ?? "Unassigned"),
    gateway: cell(single(gLink.status), gw.name || gw.code),
    source: cell(srcCounts),
    card: cell(cardCounts),
    point: cell(ptCounts),
  };

  let breakAt: Layer | null = null;
  let degradedAt: Layer | null = null;
  if (gLink.status !== "disabled") {
    for (const layer of LAYERS) {
      const c = cells[layer];
      if (c.status === "disabled") continue;
      if (c.counts.online === 0) {
        breakAt = layer;
        break;
      }
      if (!degradedAt && c.status !== "online") degradedAt = layer;
    }
  }

  let reason: string | null = null;
  if (gLink.status === "disabled") reason = gLink.reason;
  else if (breakAt === "broker") reason = broker ? brokerReason(ix, broker) : "Not linked to a data connection";
  else if (breakAt === "gateway") reason = gLink.reason;
  else if (breakAt === "source") reason = firstReason?.text ?? (sources.length === 0 ? "No devices registered" : "No device is sending data");
  else if (breakAt === "card") reason = cells.card.total === 0 ? "No sensor cards registered or seen" : "No sensor card is sending data";
  else if (breakAt === "point") reason = cells.point.total === 0 ? "No reading points linked to a machine" : "No reading point has a current value";
  else if (degradedAt === "source" && firstReason) reason = firstReason.text;
  else if (degradedAt) reason = `Some ${LAYER_LABEL[degradedAt].toLowerCase()}s are not sending data`;

  const tone: Tone = gLink.status === "disabled" ? "idle" : breakAt ? (breakAt === "point" && cells.point.total === 0 ? "warn" : "bad") : degradedAt ? "warn" : "good";

  return {
    gateway: gw,
    broker,
    cells,
    breakAt,
    degradedAt,
    reason,
    lastSeenAt: gLink.lastSeenAt,
    messages: live?.messages ?? null,
    lost: live?.sequenceGaps ?? null,
    machines: [...machines.entries()].map(([id, name]) => ({ id, name })),
    tone,
  };
}

export function buildLanes(ix: EdgeIndex): Lane[] {
  const rank: Record<Tone, number> = { bad: 0, warn: 1, info: 2, good: 3, idle: 4 };
  return sortGateways(ix.registry.gateways)
    .map((g) => buildLane(ix, g))
    .sort((a, b) => rank[a.tone] - rank[b.tone]);
}

// ---------------------------------------------------------------- totals
export interface LayerTotals {
  broker: LinkCounts;
  gateway: LinkCounts;
  source: LinkCounts;
  card: LinkCounts;
  point: LinkCounts;
}

export function layerTotals(ix: EdgeIndex): LayerTotals {
  const t: LayerTotals = {
    broker: emptyLinkCounts(),
    gateway: emptyLinkCounts(),
    source: emptyLinkCounts(),
    card: emptyLinkCounts(),
    point: emptyLinkCounts(),
  };
  for (const b of ix.registry.brokers) t.broker[brokerStatus(ix, b)] += 1;
  for (const g of ix.registry.gateways) t.gateway[gatewayLink(ix, g).status] += 1;
  for (const s of ix.registry.sources) {
    const sl = sourceLink(ix, s).status;
    t.source[sl] += 1;
    for (const c of sourceCards(ix, s)) {
      if (!c.config && !c.detected) continue;
      t.card[cardLink(sl, c.detected, c.config?.enabled ?? true)] += 1;
    }
  }
  for (const p of ix.registry.points) t.point[pointLink(pointReading(ix, p))] += 1;
  return t;
}

export const activeOf = (c: LinkCounts) => c.online + c.stale + c.offline + c.waiting;

export function countsTone(c: LinkCounts): Tone | undefined {
  const active = activeOf(c);
  if (active === 0) return undefined;
  return c.online === active ? "good" : c.online === 0 ? "bad" : "warn";
}

// ---------------------------------------------------------------- breaks
export interface BreakRow {
  key: string;
  layer: Layer;
  name: string;
  path: string;
  status: LinkStatus;
  tone: Tone;
  reason: string;
  lastSeenAt: string | null;
  /** Hierarchy selection key to open, or "mqtt" for a broker. */
  target: { kind: "hierarchy"; key: string } | { kind: "mqtt" };
}

/**
 * Root causes only: a layer is listed when its parent is online (or it has
 * none), so one dead gateway is one row, not one row per point below it.
 */
export function breakRows(ix: EdgeIndex): BreakRow[] {
  const out: BreakRow[] = [];
  for (const b of ix.registry.brokers) {
    const st = brokerStatus(ix, b);
    if (st === "online" || st === "disabled") continue;
    out.push({
      key: `b:${b.id}`,
      layer: "broker",
      name: b.name,
      path: `${b.host}:${b.port}`,
      status: st,
      tone: LINK_TONE[st],
      reason: brokerReason(ix, b) ?? "Not connected",
      lastSeenAt: ix.brokerState.get(b.id)?.metrics.lastMessageAt ?? null,
      target: { kind: "mqtt" },
    });
  }
  for (const g of sortGateways(ix.registry.gateways)) {
    const gl = gatewayLink(ix, g);
    const broker = g.brokerId ? ix.brokers.get(g.brokerId) : undefined;
    const brokerOk = broker ? brokerStatus(ix, broker) === "online" : false;
    if (gl.status !== "online" && gl.status !== "disabled") {
      // A gateway under a broken broker is already explained by the broker row.
      if (broker && !brokerOk && broker.enabled) continue;
      out.push({
        key: `g:${g.id}`,
        layer: "gateway",
        name: g.code,
        path: broker?.name ?? "No data connection",
        status: gl.status,
        tone: LINK_TONE[gl.status],
        reason: gl.reason ?? "Not sending data",
        lastSeenAt: gl.lastSeenAt,
        target: { kind: "hierarchy", key: `gw:${g.id}` },
      });
      continue;
    }
    if (gl.status !== "online") continue;
    for (const s of sortSources(sourcesOf(ix, g.id))) {
      const sl = sourceLink(ix, s);
      if (sl.status !== "online" && sl.status !== "disabled") {
        out.push({
          key: `s:${s.id}`,
          layer: "source",
          name: s.name || s.code,
          path: `${g.code} › ${s.code}`,
          status: sl.status,
          tone: LINK_TONE[sl.status],
          reason: sl.reason ?? "Not sending data",
          lastSeenAt: sl.lastSeenAt,
          target: { kind: "hierarchy", key: `src:${s.id}` },
        });
        continue;
      }
      if (sl.status !== "online") continue;
      for (const p of sortPoints(pointsOf(ix, s.id))) {
        const r = pointReading(ix, p);
        const pl = pointLink(r);
        if (pl === "online" || pl === "disabled") continue;
        out.push({
          key: `p:${p.id}`,
          layer: "point",
          name: p.tag,
          path: `${g.code} › ${s.code} › card ${p.slot} › ch ${p.channel}`,
          status: pl,
          tone: LINK_TONE[pl],
          reason: r.status === "stale" ? "Reading is invalid or too old" : "No message has arrived for this reading",
          lastSeenAt: r.updatedAt,
          target: { kind: "hierarchy", key: `card:${s.id}/${p.slot}` },
        });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- points
export interface PointRow {
  point: EdgePoint;
  source: EdgeSource | null;
  gateway: EdgeGateway | null;
  reading: PointReading;
  link: LinkStatus;
  machine: { id: string; name: string } | null;
}

export function pointRows(ix: EdgeIndex): PointRow[] {
  return sortPoints(ix.registry.points).map((p) => {
    const source = ix.sources.get(p.sourceId) ?? null;
    const gateway = source ? (ix.gateways.get(source.gatewayId) ?? null) : null;
    const reading = pointReading(ix, p);
    const mid = p.machineId;
    const rawName = mid ? (ix.registry.machines.find((m) => m.id === mid)?.name ?? mid) : null;
    const machine = mid && rawName ? { id: mid, name: cleanMachineName(rawName) } : null;
    return { point: p, source, gateway, reading, link: pointLink(reading), machine };
  });
}
