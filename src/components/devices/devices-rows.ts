import type { Tone } from "@/components/assets/assets-shell-ui";
import { isLiveMachine } from "@/providers/kiln-simulation-context";
import type { LiveSignal } from "@shared/lib/kiln-sim/engine";
import { SOURCE_KIND_LABEL, type EdgeGateway } from "@shared/types/edge";
import { type EdgeIndex, type LinkStatus, LINK_LABEL, LINK_TONE, READING_LABEL, READING_TONE, sourceLink } from "./edge-model";
import { type DetectedCard, type DetectedChannel, type DetectedRack, type Detection, detectGateway } from "./hierarchy/edge-detect";
import { fmt, machineName } from "./hierarchy/edge-tree-model";

/* ==========================================================================
   Devices rows: what the Gateways and Machine mapping tables list, built
   from the registry joined with live data (detectGateway). Pure functions.

     rack row     one rack (registered source and/or heard on the wire)
     channel row  one card · channel, with the machine sensor it feeds

   A channel mapped to a live machine with no MQTT reading shows the
   machine's running signal (labelled by its condition, like any reading).
   ========================================================================== */

export type Signals = Record<string, Record<string, LiveSignal>>;

const SIM_TONE: Record<LiveSignal["status"], Tone> = { Normal: "good", Alert: "warn", Critical: "bad" };

export interface ChannelRow {
  key: string;
  gw: EdgeGateway;
  rack: DetectedRack;
  card: DetectedCard;
  ch: DetectedChannel;
  /** Machine the channel feeds, when linked. */
  machineId: string | null;
  tag: string | null;
  /** Reading shown in the row. */
  value: string | null;
  unit: string;
  tone: Tone;
  status: string;
  updatedAt: string | null;
}

export interface RackRow {
  key: string;
  gw: EdgeGateway;
  rack: DetectedRack;
  kind: string;
  machineId: string | null;
  machine: string | null;
  channels: number;
  linked: number;
  link: LinkStatus | "new";
  tone: Tone;
  status: string;
  reason: string | null;
  lastSeenAt: string | null;
}

export function detections(ix: EdgeIndex): Map<string, Detection> {
  return new Map(ix.registry.gateways.map((gw) => [gw.id, detectGateway(ix, gw)]));
}

function channelRow(gw: EdgeGateway, rack: DetectedRack, card: DetectedCard, ch: DetectedChannel, signals: Signals): ChannelRow {
  const p = ch.point;
  const machineId = p?.machineId ?? null;
  const tag = p?.tag ?? null;
  const sim = ch.status === "nodata" && machineId && tag && isLiveMachine(machineId) ? (signals[machineId]?.[tag] ?? null) : null;
  const base = { key: `${gw.id}/${rack.rackId}/${card.id}/${ch.id}`, gw, rack, card, ch, machineId, tag };
  if (sim && sim.value !== null) {
    return { ...base, value: sim.display, unit: p?.unit ?? "", tone: SIM_TONE[sim.status], status: sim.status, updatedAt: null };
  }
  return {
    ...base,
    value: ch.display ?? (ch.value === null ? null : fmt(ch.value)),
    unit: ch.unit ?? p?.unit ?? "",
    tone: READING_TONE[ch.status],
    status: READING_LABEL[ch.status],
    updatedAt: ch.measurement?.updatedAt ?? null,
  };
}

/** Every channel of a rack, in card then channel order. */
export function rackChannels(gw: EdgeGateway, rack: DetectedRack, signals: Signals): ChannelRow[] {
  return rack.cards.flatMap((card) => card.channels.map((ch) => channelRow(gw, rack, card, ch, signals)));
}

/** Every channel under every gateway. */
export function allChannels(ix: EdgeIndex, det: Map<string, Detection>, signals: Signals): ChannelRow[] {
  return ix.registry.gateways.flatMap((gw) => (det.get(gw.id)?.racks ?? []).flatMap((rack) => rackChannels(gw, rack, signals)));
}

export function rackRow(ix: EdgeIndex, gw: EdgeGateway, rack: DetectedRack): RackRow {
  const channels = rack.cards.flatMap((c) => c.channels);
  const src = rack.source;
  const machineId = src?.machineId ?? channels.find((ch) => ch.point?.machineId)?.point?.machineId ?? null;
  const base = {
    key: `${gw.id}/${rack.rackId}`,
    gw,
    rack,
    machineId,
    machine: machineName(ix.registry, machineId),
    channels: channels.length,
    linked: channels.filter((ch) => ch.point?.machineId).length,
    lastSeenAt: rack.live?.lastSeenAt ?? null,
  };
  if (!src) return { ...base, kind: "Not added", link: "new", tone: "info", status: "New", reason: "Sending readings, but not added yet" };
  const link = sourceLink(ix, src);
  return { ...base, kind: SOURCE_KIND_LABEL[src.kind], link: link.status, tone: LINK_TONE[link.status], status: LINK_LABEL[link.status], reason: link.reason };
}

/** Natural order for tags and codes: VIB-2 before VIB-10. */
export const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
