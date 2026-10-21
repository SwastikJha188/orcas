import type { Tone } from "@/components/assets/assets-shell-ui";
import { ULTRON_FORMAT_ID, naturalCompare, templateFilter } from "@shared/lib/edge-format";
import type { EdgeCard, EdgeCommissionInput, EdgeFormat, EdgeGateway, EdgePoint, EdgeSource, SourceKind } from "@shared/types/edge";
import type { MqttCard, MqttMeasurement, MqttRack } from "@shared/types/mqtt";
import {
  type EdgeIndex,
  type ReadingStatus,
  READING_TONE,
  liveGateway,
  pointReading,
  pointsOf,
  sourcesOf,
  worstTone,
} from "../edge-model";
import { DEFAULT_TOPIC_PREFIX } from "./edge-tree-model";

/* ==========================================================================
   What a gateway's data shows, merged with what is registered:

     rack (source.code / rackId) ─▶ card (slot) ─▶ channel

   A rack, card or channel appears when the registry has it, the live
   snapshot reports it, or both. Ids are text and sort naturally.
   ========================================================================== */

export interface DetectedChannel {
  id: string;
  card: string;
  rack: string;
  measurement: MqttMeasurement | null;
  point: EdgePoint | null;
  status: ReadingStatus;
  value: number | null;
  display: string | null;
  unit: string | null;
  /** Sensor name from the payload, else the point name. */
  label: string | null;
}

export interface DetectedCard {
  id: string;
  rack: string;
  /** The configured card, when registered. */
  config: EdgeCard | null;
  /** The card as the rack reports it (ULTRON inventory or readings). */
  reported: MqttCard | null;
  /** Reported type, else the type from readings, else the configured type. */
  cardType: string | null;
  channels: DetectedChannel[];
  /** Channels heard on the wire. */
  live: number;
  mapped: number;
  /** Reported or reading, but not configured. */
  isNew: boolean;
  /** Seen on the wire at all (inventory or readings). */
  detected: boolean;
  tone: Tone;
}

export interface DetectedRack {
  rackId: string;
  source: EdgeSource | null;
  live: MqttRack | null;
  cards: DetectedCard[];
}

export interface Detection {
  /** Broker + gateway id the live data is keyed on, when any. */
  brokerId: string | null;
  racks: DetectedRack[];
  /** Counts of what arrived on the wire (not what is registered). */
  heard: { racks: number; cards: number; channels: number };
}

/** Reading state of a channel with no point: payload flags only. */
function measurementStatus(m: MqttMeasurement): ReadingStatus {
  if (!m.valid || !m.fresh) return "stale";
  return m.dangerActive ? "danger" : m.alertActive ? "alert" : "normal";
}

function channelOf(ix: EdgeIndex, rack: string, card: string, id: string, m: MqttMeasurement | null, p: EdgePoint | null): DetectedChannel {
  if (p) {
    const r = pointReading(ix, p);
    // A point whose rack is matched only through the measurement still shows it.
    const useM = !r.measurement && m;
    return {
      id,
      card,
      rack,
      measurement: r.measurement ?? m,
      point: p,
      status: useM ? measurementStatus(m) : r.status,
      value: useM ? m.value : r.value,
      display: useM ? m.display : r.display,
      unit: (useM ? m.unit : r.unit) || p.unit,
      label: m?.sensor ?? p.name,
    };
  }
  return {
    id,
    card,
    rack,
    measurement: m,
    point: null,
    status: m ? measurementStatus(m) : "nodata",
    value: m?.value ?? null,
    display: m?.display ?? null,
    unit: m?.unit || null,
    label: m?.sensor ?? null,
  };
}

function cardsOf(
  ix: EdgeIndex,
  rack: string,
  configs: EdgeCard[],
  points: EdgePoint[],
  measurements: MqttMeasurement[],
  reported: MqttCard[],
): DetectedCard[] {
  interface Acc {
    config: EdgeCard | null;
    reported: MqttCard | null;
    points: Map<string, EdgePoint>;
    ms: Map<string, MqttMeasurement>;
  }
  const byCard = new Map<string, Acc>();
  const slot = (id: string) => {
    let c = byCard.get(id);
    if (!c) byCard.set(id, (c = { config: null, reported: null, points: new Map(), ms: new Map() }));
    return c;
  };
  for (const c of configs) slot(c.code).config = c;
  for (const r of reported) slot(r.card).reported = r;
  for (const p of points) slot(p.slot).points.set(p.channel, p);
  for (const m of measurements) slot(m.slot).ms.set(m.channel, m);

  return [...byCard.entries()]
    .sort((a, b) => naturalCompare(a[0], b[0]))
    .map(([id, c]) => {
      const heard = new Set([...c.ms.keys(), ...(c.reported?.channels ?? [])]);
      const ids = [...new Set([...c.points.keys(), ...heard])].sort(naturalCompare);
      const channels = ids.map((ch) => channelOf(ix, rack, id, ch, c.ms.get(ch) ?? null, c.points.get(ch) ?? null));
      const fromReadings = [...c.ms.values()].find((m) => m.cardType)?.cardType ?? null;
      const detected = Boolean(c.reported) || c.ms.size > 0;
      return {
        id,
        rack,
        config: c.config,
        reported: c.reported,
        cardType: c.reported?.cardType ?? fromReadings ?? c.config?.cardType ?? null,
        channels,
        live: heard.size,
        mapped: c.points.size,
        isNew: detected && !c.config,
        detected,
        tone: worstTone(...channels.map((ch) => (ch.status === "nodata" || ch.status === "disabled" ? "good" : READING_TONE[ch.status]))),
      };
    });
}

export function configuredCards(ix: EdgeIndex, sourceId: string): EdgeCard[] {
  return ix.registry.cards.filter((c) => c.sourceId === sourceId);
}

/** Live keys for a gateway: its live record, else its broker and code. */
function liveKey(ix: EdgeIndex, gw: EdgeGateway): { brokerId: string | null; code: string } {
  const live = liveGateway(ix, gw);
  return { brokerId: live?.brokerId ?? gw.brokerId, code: live?.gatewayId ?? gw.code };
}

export function detectGateway(ix: EdgeIndex, gw: EdgeGateway): Detection {
  const { brokerId, code } = liveKey(ix, gw);
  const mine = <T extends { brokerId: string; gatewayId: string }>(r: T) => r.gatewayId === code && (!brokerId || r.brokerId === brokerId);
  const liveRacks = (ix.snapshot?.racks ?? []).filter(mine);
  const measurements = (ix.snapshot?.measurements ?? []).filter(mine);
  const sources = sourcesOf(ix, gw.id);

  const rackIds = new Set<string>([...sources.map((s) => s.code), ...liveRacks.map((r) => r.rackId), ...measurements.map((m) => m.rackId)]);
  const racks = [...rackIds].sort(naturalCompare).map((rackId) => {
    const source = sources.find((s) => s.code === rackId) ?? null;
    return {
      rackId,
      source,
      live: liveRacks.find((r) => r.rackId === rackId) ?? null,
      cards: cardsOf(
        ix,
        rackId,
        source ? configuredCards(ix, source.id) : [],
        source ? pointsOf(ix, source.id) : [],
        measurements.filter((m) => m.rackId === rackId),
        liveRacks.find((r) => r.rackId === rackId)?.cards ?? [],
      ),
    };
  });

  const heardRacks = new Set([...liveRacks.map((r) => r.rackId), ...measurements.map((m) => m.rackId)]);
  let cards = 0;
  let channels = 0;
  for (const r of racks)
    for (const c of r.cards) {
      if (c.detected) cards += 1;
      channels += c.live;
    }
  return { brokerId, racks, heard: { racks: heardRacks.size, cards, channels } };
}

/** Cards of one registered source (registry + live). */
export function sourceCards(ix: EdgeIndex, src: EdgeSource): DetectedCard[] {
  const gw = ix.gateways.get(src.gatewayId);
  if (!gw) return cardsOf(ix, src.code, configuredCards(ix, src.id), pointsOf(ix, src.id), [], []);
  const { brokerId, code } = liveKey(ix, gw);
  const measurements = (ix.snapshot?.measurements ?? []).filter(
    (m) => m.gatewayId === code && m.rackId === src.code && (!brokerId || m.brokerId === brokerId),
  );
  const rack = (ix.snapshot?.racks ?? []).find((r) => r.gatewayId === code && r.rackId === src.code && (!brokerId || r.brokerId === brokerId));
  return cardsOf(ix, src.code, configuredCards(ix, src.id), pointsOf(ix, src.id), measurements, rack?.cards ?? []);
}

// ---------------------------------------------------------------- subscription
export function gatewayFormat(ix: EdgeIndex, formatId: string | null): EdgeFormat | null {
  return ix.registry.formats.find((f) => f.id === (formatId ?? ULTRON_FORMAT_ID)) ?? null;
}

/** The MQTT filter the runtime listens on for a gateway in a format. */
export function subscriptionFor(ix: EdgeIndex, gw: { code: string; brokerId: string | null; formatId: string | null }): string {
  const format = gatewayFormat(ix, gw.formatId);
  const code = gw.code.trim() || "{gateway}";
  if (!format || format.kind === "ultron-v2") {
    const broker = gw.brokerId ? ix.brokers.get(gw.brokerId) : undefined;
    return `${broker?.topicPrefix || DEFAULT_TOPIC_PREFIX}/${code}/#`;
  }
  return templateFilter(format.topic, gw.code.trim() || null);
}

export function formatLabel(ix: EdgeIndex, formatId: string | null): string {
  return gatewayFormat(ix, formatId)?.name ?? "ULTRON gateway contract";
}

// ---------------------------------------------------------------- commissioning
export const KIND_DEFAULT_PROTOCOL = (kind: SourceKind) => (kind === "rack" ? "Backplane" : kind === "other" ? "Other" : "OPC UA");

/** Detected racks and cards the registry does not have yet, as a commission body. */
export function pendingFromDetection(detection: Detection): EdgeCommissionInput["sources"] {
  const out: EdgeCommissionInput["sources"] = [];
  for (const r of detection.racks) {
    const cards = r.cards.filter((c) => c.isNew).map((c) => ({ code: c.id, cardType: c.cardType, channelCount: c.live || null }));
    if (r.source && cards.length === 0) continue;
    if (!r.source && !r.live && cards.length === 0) continue;
    out.push({
      code: r.rackId,
      name: r.source?.name ?? r.rackId,
      kind: r.source?.kind ?? "rack",
      protocol: r.source?.protocol ?? "Backplane",
      cards,
    });
  }
  return out;
}
