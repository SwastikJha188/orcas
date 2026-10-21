import type { Tone } from "@/components/assets/assets-shell-ui";
import { shortName } from "@/components/assets/hierarchy/hierarchy-model";
import { naturalCompare } from "@shared/lib/edge-format";
import type { EdgeGateway, EdgePoint, EdgeRegistry, EdgeSource, SourceKind } from "@shared/types/edge";
import {
  type DiscoveredGateway,
  type EdgeIndex,
  type LinkCounts,
  type ReadingCounts,
  LINK_LABEL,
  LINK_TONE,
  READING_LABEL,
  READING_TONE,
  plantOf,
  pointsOf,
  sourcesOf,
} from "../edge-model";

/* ==========================================================================
   Device hierarchy model: selection keys, tree filtering, roll-up segments
   and display helpers on top of edge-model.ts. Pure functions, no React.

     Edge network ─▶ gateway ─▶ source (leaf)
     Discovered   ─▶ gateway publishing but not registered
   ========================================================================== */

export type Selection =
  | { type: "network" }
  | { type: "gateway"; id: string }
  | { type: "source"; id: string }
  | { type: "card"; sourceId: string; card: string }
  | { type: "discovered"; brokerId: string; gatewayId: string };

export const NETWORK: Selection = { type: "network" };
export const NETWORK_KEY = "net";
export const DISCOVERED_KEY = "disc";

export const ALL_PLANTS = "all";

/** Stable string id for a selection (tree row ids, sessionStorage). */
export function selectionKey(sel: Selection): string {
  if (sel.type === "network") return NETWORK_KEY;
  if (sel.type === "gateway") return `gw:${sel.id}`;
  if (sel.type === "source") return `src:${sel.id}`;
  if (sel.type === "card") return `card:${sel.sourceId}/${sel.card}`;
  return `disc:${sel.brokerId}/${sel.gatewayId}`;
}

export function parseSelection(key: string | null): Selection {
  if (!key) return NETWORK;
  if (key.startsWith("gw:")) return { type: "gateway", id: key.slice(3) };
  if (key.startsWith("src:")) return { type: "source", id: key.slice(4) };
  if (key.startsWith("card:")) {
    const rest = key.slice(5);
    const cut = rest.indexOf("/");
    if (cut > 0) return { type: "card", sourceId: rest.slice(0, cut), card: rest.slice(cut + 1) };
  }
  if (key.startsWith("disc:")) {
    const rest = key.slice(5);
    const cut = rest.indexOf("/");
    if (cut > 0) return { type: "discovered", brokerId: rest.slice(0, cut), gatewayId: rest.slice(cut + 1) };
  }
  return NETWORK;
}

/** A selection that no longer exists (deleted, registered) falls back to the root. */
export function resolveSelection(ix: EdgeIndex, sel: Selection, discovered: DiscoveredGateway[]): Selection {
  if (sel.type === "gateway") return ix.gateways.has(sel.id) ? sel : NETWORK;
  if (sel.type === "source") return ix.sources.has(sel.id) ? sel : NETWORK;
  // A card with no point and no live data left disappears; fall back to its source.
  if (sel.type === "card") return ix.sources.has(sel.sourceId) ? sel : NETWORK;
  if (sel.type === "discovered") return discovered.some((d) => d.brokerId === sel.brokerId && d.gatewayId === sel.gatewayId) ? sel : NETWORK;
  return sel;
}

// ---------------------------------------------------------------- plants
export interface PlantOption {
  id: string;
  label: string;
}

export function plantOptions(registry: EdgeRegistry): PlantOption[] {
  return registry.sites.filter((s) => s.type === "plant").map((s) => ({ id: s.id, label: shortName(s.name) }));
}

/** Gateways in the chosen plant; "All plants" includes those without a site. */
export function gatewaysInPlant(registry: EdgeRegistry, plantId: string): EdgeGateway[] {
  if (plantId === ALL_PLANTS) return registry.gateways;
  return registry.gateways.filter((g) => plantOf(registry, g.siteNodeId) === plantId);
}

/** Site select options in tree order, indented by depth. */
export function siteOptions(registry: EdgeRegistry): Array<{ value: string; label: string }> {
  const out: Array<{ value: string; label: string }> = [];
  const kids = (parentId: string | null) =>
    registry.sites.filter((s) => s.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name));
  const walk = (parentId: string | null, depth: number) => {
    for (const s of kids(parentId)) {
      out.push({ value: s.id, label: `${"   ".repeat(depth)}${s.type === "plant" ? shortName(s.name) : s.name}` });
      walk(s.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

// ---------------------------------------------------------------- filter
const has = (q: string, ...values: Array<string | null | undefined>) => values.some((v) => v && v.toLowerCase().includes(q));

export const KIND_PLURAL: Record<SourceKind, [string, string]> = {
  rack: ["rack", "racks"],
  plc: ["PLC", "PLCs"],
  scada: ["SCADA", "SCADA"],
  dcs: ["DCS", "DCS"],
  analyzer: ["analyser", "analysers"],
  other: ["other", "other"],
};

export function sourceMatches(ix: EdgeIndex, src: EdgeSource, q: string): boolean {
  if (!q) return true;
  if (has(q, src.code, src.name, src.kind, KIND_PLURAL[src.kind][0], src.protocol, src.endpoint)) return true;
  return pointsOf(ix, src.id).some((p) => has(q, p.tag, p.name, p.sourceTag));
}

export function gatewayMatches(gw: EdgeGateway, q: string): boolean {
  return !q || has(q, gw.code, gw.name, gw.ipAddress);
}

export function discoveredMatches(d: DiscoveredGateway, q: string): boolean {
  return !q || has(q, d.gatewayId, d.ip, ...d.rackIds);
}

/** Sources of a gateway that survive the filter: all of them when the gateway itself matches. */
export function visibleSources(ix: EdgeIndex, gw: EdgeGateway, q: string): EdgeSource[] {
  const all = sortSources(sourcesOf(ix, gw.id));
  if (!q || gatewayMatches(gw, q)) return all;
  return all.filter((s) => sourceMatches(ix, s, q));
}

// ---------------------------------------------------------------- ordering
const KIND_ORDER: Record<SourceKind, number> = { rack: 0, plc: 1, dcs: 2, scada: 3, analyzer: 4, other: 5 };

export function sortSources(list: EdgeSource[]): EdgeSource[] {
  return [...list].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.code.localeCompare(b.code));
}

export function sortGateways(list: EdgeGateway[]): EdgeGateway[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

export function sortPoints(list: EdgePoint[]): EdgePoint[] {
  return [...list].sort((a, b) => naturalCompare(a.slot, b.slot) || naturalCompare(a.channel, b.channel) || pointLabel(a).localeCompare(pointLabel(b)));
}

// ---------------------------------------------------------------- summaries
/** "4 racks · 1 PLC · 1 DCS" */
export function kindSummary(sources: EdgeSource[]): string {
  const counts = new Map<SourceKind, number>();
  for (const s of sources) counts.set(s.kind, (counts.get(s.kind) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => KIND_ORDER[a[0]] - KIND_ORDER[b[0]])
    .map(([k, n]) => `${n} ${KIND_PLURAL[k][n === 1 ? 0 : 1]}`)
    .join(" · ");
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export interface Segment {
  id: string;
  value: number;
  tone: Tone;
  label: string;
}

const LINK_ORDER = ["online", "stale", "offline", "waiting", "disabled"] as const;
const READING_ORDER = ["normal", "alert", "danger", "stale", "nodata", "disabled"] as const;

export function linkSegments(c: LinkCounts): Segment[] {
  return LINK_ORDER.map((k) => ({ id: k, value: c[k], tone: LINK_TONE[k], label: LINK_LABEL[k] }));
}

export function readingSegments(c: ReadingCounts): Segment[] {
  return READING_ORDER.map((k) => ({ id: k, value: c[k], tone: READING_TONE[k], label: READING_LABEL[k] }));
}

/** Accessible text for a segment bar: "2 online, 4 no data". */
export function segmentText(segments: Segment[]): string {
  const parts = segments.filter((s) => s.value > 0).map((s) => `${s.value} ${s.label.toLowerCase()}`);
  return parts.length ? parts.join(", ") : "none";
}

// ---------------------------------------------------------------- display
export const DEFAULT_TOPIC_PREFIX = "ultron/v1/gateways";

export function machineName(registry: EdgeRegistry, id: string | null): string | null {
  if (!id) return null;
  return registry.machines.find((m) => m.id === id)?.name ?? null;
}

const nf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

export function fmt(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? "—" : nf.format(n);
}

/** A point's name in lists: its measurement's tag, else its plant tag, else its card and channel. */
export function pointLabel(p: EdgePoint): string {
  return p.tag ?? p.sourceTag ?? `Card ${p.slot} · Ch ${p.channel}`;
}
