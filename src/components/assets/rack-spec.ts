/* ==========================================================================
   Machine › Rack — what the edge registry records for the machine's
   acquisition hardware, so the page can compare the cabinet record
   (rack_chassis) and the live link against it.

   Source: GET /api/edge — gateways (model, location, notes, security zone),
   sources (kind, protocol, model) and cards (type, model, channel count).
   Nothing here is typed in: a fact the registry does not hold is left out,
   and a machine without registry entries gets `null`.
   ========================================================================== */

import type { EdgeCard, EdgeGateway, EdgeRegistry, EdgeSource } from "@shared/types/edge";

/** A vibration DAQ node of the machine: a rack source carrying IEPE cards. */
export interface DaqNodeSpec {
  code: string;
  name: string;
  /** IEPE channels on the node's cards; null when the registry has no count. */
  channels: number | null;
}

/** Registry record a machine's Rack page compares against, or null when none is on file. */
export interface RackSpecSet {
  gateways: EdgeGateway[];
  sources: EdgeSource[];
  /** Registered gateway model(s). */
  devices: string | null;
  /** Registered gateway location(s). */
  location: string | null;
  /** Registered gateway name(s). */
  gateway: string | null;
  /** Plant-side protocols of the machine's sources. */
  protocols: string | null;
  /** IEPE cards on the machine's sources: model · channels. */
  iepe: string | null;
  /** Registry notes of the gateway(s). */
  notes: string | null;
  daqNodes: DaqNodeSpec[];
}

const isIepe = (c: EdgeCard) => /iepe|vib/i.test(`${c.cardType ?? ""} ${c.model ?? ""}`);
const joined = (list: Array<string | null | undefined>) => {
  const out = [...new Set(list.filter((v): v is string => Boolean(v && v.trim())))];
  return out.length ? out.join(" · ") : null;
};

/** The machine's sources (points mapped to it, or the source's primary machine), their gateways and cards. */
export function rackSpecFrom(registry: EdgeRegistry | null | undefined, machineId: string): RackSpecSet | null {
  if (!registry) return null;
  const sourceIds = new Set(registry.points.filter((p) => p.machineId === machineId).map((p) => p.sourceId));
  for (const s of registry.sources) if (s.machineId === machineId) sourceIds.add(s.id);
  const sources = registry.sources.filter((s) => sourceIds.has(s.id));
  if (!sources.length) return null;
  const gatewayIds = new Set(sources.map((s) => s.gatewayId));
  const gateways = registry.gateways.filter((g) => gatewayIds.has(g.id));
  const cardsOf = (s: EdgeSource) => registry.cards.filter((c) => c.sourceId === s.id);
  const iepeCards = sources.flatMap(cardsOf).filter(isIepe);
  const daqNodes = sources
    .filter((s) => s.kind === "rack" && cardsOf(s).some(isIepe))
    .map((s) => {
      const counts = cardsOf(s).filter(isIepe).map((c) => c.channelCount);
      return { code: s.code, name: s.name, channels: counts.every((n) => n === null) ? null : counts.reduce<number>((a, n) => a + (n ?? 0), 0) };
    });
  return {
    gateways,
    sources,
    devices: joined(gateways.map((g) => g.model)),
    location: joined(gateways.map((g) => g.location)),
    gateway: joined(gateways.map((g) => g.name)),
    protocols: joined(sources.map((s) => s.protocol)),
    iepe: joined(iepeCards.map((c) => [c.model, c.channelCount !== null ? `${c.channelCount} ch` : null].filter(Boolean).join(" · "))),
    notes: joined(gateways.map((g) => g.notes)),
    daqNodes,
  };
}

/** Field signal a card type carries (generic; D5 Table 11.1 names the kiln instruments). */
export function signalTypeOf(cardType: string | null, protocol: string): string {
  const t = (cardType ?? "").toLowerCase();
  const via = protocol ? ` · ${protocol}` : "";
  if (/iepe|vib/.test(t)) return "Vibration sensor (IEPE accelerometer)";
  if (/rtd/.test(t)) return `Temperature probe (Pt100)${via}`;
  if (/thermocouple/.test(t)) return `Temperature probe (thermocouple)${via}`;
  if (/hart|4–20|4-20/.test(t)) return `Standard 4–20 mA signal${via}`;
  if (/lvdt/.test(t)) return `Position sensor, 4–20 mA${via}`;
  if (/pyro/.test(t)) return `Infrared thermometer, 4–20 mA${via}`;
  if (/digital/.test(t)) return `On or off status, sent when it changes${via}`;
  if (/vfd/.test(t)) return `Value from the speed drive${via}`;
  if (/pulse|speed input/.test(t)) return `Speed pulses${via}`;
  if (/video/.test(t)) return `Video picture, no data address${via}`;
  if (/flow/.test(t)) return `Flow meter value${via}`;
  if (/gas/.test(t)) return `Analyser channel${via}`;
  if (/scanner/.test(t)) return `Scanner server value${via}`;
  return protocol || "Not recorded";
}
