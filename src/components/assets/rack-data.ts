/* ==========================================================================
   Cabinet model: chassis → module (card) → channel.

   One builder serves every machine. Its input is one row per channel, from
   either source of truth:
     · the edge registry (edge_sources / edge_cards / edge_points), when the
       machine has points mapped there (KLN-01) — the same rows the
       Acquisition view reads, so both views show the same hardware;
     · mapped_signals (edge_rack / card_slot), for machines with no registry
       points yet.
   Pure TypeScript, safe on server and client.
   ========================================================================== */

export type SensorTypeCode =
  | "VIB"
  | "RTD"
  | "SPD"
  | "UVI"
  | "PRESS"
  | "GAS"
  | "TMP"
  | "POS"
  | "CAL"
  | "FLO"
  | "STS"
  | "OPT";

export type ChannelStatus = "Normal" | "Advisory" | "Critical";

/** Module positions in one 19" 3U chassis (72 HP of 6 HP modules). */
export const CHASSIS_POSITIONS = 12;

export interface CabinetChannel {
  /** Channel id on the card ("1"…). */
  channel: string;
  tag: string;
  parameter: string;
  unit: string;
  instrument: string;
  sampleRate: string;
  /** Register / address as recorded. */
  address: string;
  quality: string;
  component: string;
  normalRange: string;
  alertLimit: number | null;
  dangerLimit: number | null;
  sensorType: SensorTypeCode;
  /** Live value as display text; overlaid on the client. */
  currentValue: string;
  status: ChannelStatus;
  /** False for invalid / suspect channels. */
  ledOk: boolean;
}

export interface CabinetModule {
  /** Chassis position, 1…CHASSIS_POSITIONS. */
  position: number;
  positionLabel: string;
  /** Card id (registry card code / card number on the wire). */
  code: string;
  /** Module family or model ("PLC-RTD-01", "IEPE-8"). */
  model: string | null;
  /** Readable type ("RTD temperature"). */
  cardType: string | null;
  /** Free note, e.g. the documented field slot ("Slot 04"). */
  note: string | null;
  /** Channels the card carries (at least the mapped ones). */
  capacity: number;
  /** Glyph for the module face. */
  sensorType: SensorTypeCode;
  channels: CabinetChannel[];
}

export interface MachineRackInfo {
  /** Unique per machine. */
  rackId: string;
  rackNumber: number;
  /** Source / rack code ("PLC-01", "ULTRON-EDGE-AGIT01"). */
  code: string;
  name: string;
  tabLabel: string;
  /** "DAQ rack", "PLC", "DCS", "Analyser"… */
  kindLabel: string;
  protocol: string;
  /** Gateway / edge rack the chassis reports through. */
  gateway: string;
  positions: number;
  modules: CabinetModule[];
  /** Where the structure came from. */
  source: "edge-registry" | "mapped_signals";
  /**
   * Cabinet record linked through rack_chassis.machine_id. Attached at read
   * time (never stored); null when the machine has no chassis row.
   */
  chassis?: RackChassisInfo | null;
}

export interface RackChassisInfo {
  id: string;
  name: string;
  cabinetLocation: string;
  ipAddress: string;
  protocol: string;
  firmware: string;
  uptime: string;
  psuStatus: string;
  packetLoss: string;
  latency: string;
}

/** One channel, normalised from either source of truth. */
export interface CabinetRow {
  chassisKey: string;
  chassisCode: string;
  chassisName: string;
  kindLabel: string;
  protocol: string;
  gateway: string;
  /** Order of the chassis among the machine's chassis. */
  chassisOrder: number;
  cardCode: string;
  cardModel: string | null;
  cardType: string | null;
  cardNote: string | null;
  cardCapacity: number | null;
  /** Preferred chassis position; the card code when it is a number. */
  cardPosition: number | null;
  channel: string;
  tag: string;
  parameter: string;
  unit: string;
  instrument: string;
  sensorTypeText: string;
  sampleRate: string;
  address: string;
  quality: string;
  component: string;
  normalRange: string;
  alertLimit: number | null;
  dangerLimit: number | null;
  currentValue: string;
  status: string;
}

/** The mapped_signals columns a cabinet is built from when the registry has nothing. */
export interface RackSignalRow {
  tag: string;
  name: string;
  instrument: string;
  sensor_type: string;
  edge_rack: string;
  card_slot: string;
  modbus_address: string;
  current_value: string;
  unit: string;
  quality: string;
  sample_rate: string;
  status: string;
  normal_threshold: string | null;
  component: string | null;
}

/* ---------------------------------------------------------------- helpers */

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

function sensorTypeFor(tag: string, sensorType: string, unit: string): SensorTypeCode {
  const t = `${tag} ${sensorType} ${unit}`.toUpperCase();
  const u = unit.trim().toLowerCase();
  if (/^CAL-/.test(tag)) return "CAL";
  if (u === "°c" || /RTD|TEMP|TMP|THERMO/.test(t)) return "RTD";
  if (u === "mm/s" || u === "g" || /VIB|ACC|IEPE/.test(t)) return "VIB";
  if (u === "rpm" || /SPD|SPEED/.test(t)) return "SPD";
  if (u === "bar" || u === "kpa" || u === "mbar" || /PRS|PRESS/.test(t)) return "PRESS";
  if (u.includes("/h") || /FLO/.test(t)) return "FLO";
  if (u === "mm" || /POS|THRUST|DISP|LVDT/.test(t)) return "POS";
  if (/GAS|O2|CO\b/.test(t)) return "GAS";
  return "STS";
}

/** Module glyph from the card type, else from its first channel. */
function moduleType(cardType: string | null, first: SensorTypeCode): SensorTypeCode {
  const t = (cardType ?? "").toUpperCase();
  if (/IEPE|VIB/.test(t)) return "VIB";
  if (/THERMOCOUPLE/.test(t)) return "TMP";
  if (/RTD/.test(t)) return "RTD";
  if (/HART|4–20|4-20|ANALOG/.test(t)) return "PRESS";
  if (/DIGITAL/.test(t)) return "STS";
  if (/VFD|SPEED/.test(t)) return "SPD";
  if (/LVDT/.test(t)) return "POS";
  if (/FLOW/.test(t)) return "FLO";
  if (/GAS/.test(t)) return "GAS";
  if (/PYRO|SCANNER/.test(t)) return "OPT";
  return first;
}

function asStatus(s: string): ChannelStatus {
  return s === "Critical" ? "Critical" : s === "Advisory" ? "Advisory" : "Normal";
}

/** Readable type of a card family ("IEPE-8", "PLC-RTD-01", "AI-8"). */
export function cardTypeOf(family: string): string | null {
  const f = family.toUpperCase();
  if (/^SCANNER/.test(f)) return "Scanner network";
  if (/IEPE/.test(f)) return "IEPE vibration";
  if (/RTD/.test(f)) return "RTD temperature";
  if (/HART/.test(f)) return "4–20 mA HART";
  if (/(^|-)DI(-|$)/.test(f)) return "Digital inputs";
  if (/VFD/.test(f)) return "VFD data";
  if (/(^|-)TC(-|$)/.test(f)) return "Thermocouple";
  if (/LVDT/.test(f)) return "LVDT";
  if (/FLOW/.test(f)) return "Flow";
  if (/GAS/.test(f)) return "Gas analyser";
  if (/PYRO/.test(f)) return "Pyrometer";
  if (/(^|-)AI(-|$)/.test(f)) return "Analog input";
  if (/ANALYTICS/.test(f)) return "Edge compute";
  return null;
}

/**
 * mapped_signals.card_slot → card: "Slot 2 (IEPE-8)" → slot 2, family IEPE-8,
 * 8 channels; "PLC-RTD-01 (Slot 04)" → family PLC-RTD-01, slot 4.
 */
function parseCardSlot(cardSlot: string): { slot: number | null; family: string; capacity: number | null } {
  const slotMatch = /slot\s*0*(\d+)/i.exec(cardSlot);
  const slot = slotMatch ? Number(slotMatch[1]) : null;
  const paren = /\(([^)]*)\)/.exec(cardSlot)?.[1]?.trim() ?? "";
  const lead = cardSlot.replace(/\s*\(.*\)\s*$/, "").trim();
  const family = /^slot\s*\d+$/i.test(lead) && paren ? paren : lead || cardSlot;
  const cap = /^slot/i.test(lead) ? /-(\d+)$/.exec(family)?.[1] : undefined;
  return { slot, family, capacity: cap ? Number(cap) : null };
}

/* ---------------------------------------------------------------- builder */

/**
 * Rows → chassis. One chassis per source (chassisKey), one module per card in
 * position order, one channel per row. A card takes its preferred position
 * when it is free and inside the chassis, else the next free one; more cards
 * than positions continue on a further chassis of the same source.
 */
export function buildCabinet(rows: CabinetRow[], source: MachineRackInfo["source"] = "mapped_signals"): MachineRackInfo[] {
  const bySource = new Map<string, CabinetRow[]>();
  for (const r of rows) bySource.set(r.chassisKey, [...(bySource.get(r.chassisKey) ?? []), r]);

  const sources = [...bySource.values()].sort((a, b) => a[0].chassisOrder - b[0].chassisOrder || natural(a[0].chassisCode, b[0].chassisCode));
  const racks: MachineRackInfo[] = [];
  for (const list of sources) {
    const head = list[0];
    const byCard = new Map<string, CabinetRow[]>();
    for (const r of list) byCard.set(r.cardCode, [...(byCard.get(r.cardCode) ?? []), r]);

    const cards = [...byCard.values()]
      .map((chs) => [...chs].sort((a, b) => natural(a.channel, b.channel) || natural(a.tag, b.tag)))
      .sort((a, b) => (a[0].cardPosition ?? 1e9) - (b[0].cardPosition ?? 1e9) || natural(a[0].cardCode, b[0].cardCode));

    const modules: CabinetModule[] = cards.map((chs) => {
      const c = chs[0];
      const channels = chs.map(
        (r): CabinetChannel => ({
          channel: r.channel,
          tag: r.tag,
          parameter: r.parameter,
          unit: r.unit,
          instrument: r.instrument,
          sampleRate: r.sampleRate,
          address: r.address,
          quality: r.quality,
          component: r.component,
          normalRange: r.normalRange,
          alertLimit: r.alertLimit,
          dangerLimit: r.dangerLimit,
          sensorType: sensorTypeFor(r.tag, r.sensorTypeText, r.unit),
          currentValue: r.currentValue,
          status: asStatus(r.status),
          ledOk: !r.quality || /good|awaiting/i.test(r.quality),
        }),
      );
      const highest = Math.max(0, ...chs.map((r) => Number(r.channel)).filter(Number.isFinite));
      return {
        position: 0,
        positionLabel: "",
        code: c.cardCode,
        model: c.cardModel,
        cardType: c.cardType,
        note: c.cardNote,
        capacity: Math.max(c.cardCapacity ?? 0, channels.length, highest),
        sensorType: moduleType(c.cardType, channels[0]?.sensorType ?? "STS"),
        channels,
      };
    });

    const parts = Math.max(1, Math.ceil(modules.length / CHASSIS_POSITIONS));
    for (let part = 0; part < parts; part++) {
      const chunk = modules.slice(part * CHASSIS_POSITIONS, (part + 1) * CHASSIS_POSITIONS);
      // The documented field slot ("Slot 02") wins, so the chassis matches the
      // Acquisition view's "Card n · Slot 0x"; else the card sequence. Two
      // passes: every uncontested documented slot first, then cards that share
      // a slot take the next free position after it (no knock-on shifts).
      const wants = chunk.map((_, i) => {
        const c0 = cards[part * CHASSIS_POSITIONS + i][0];
        const documented = Number(c0.cardNote?.match(/slot\s*0*(\d+)/i)?.[1] ?? NaN);
        const want = Number.isFinite(documented) ? documented : c0.cardPosition;
        return want !== null && want >= 1 && want <= CHASSIS_POSITIONS ? want : null;
      });
      const used = new Set<number>();
      const pos = wants.map((w) => (w !== null && !used.has(w) ? (used.add(w), w) : 0));
      pos.forEach((p, i) => {
        if (p) return;
        const w = wants[i];
        let next = 0;
        if (w !== null) for (let q = w + 1; q <= CHASSIS_POSITIONS && !next; q++) if (!used.has(q)) next = q;
        if (!next) for (next = 1; used.has(next); next++);
        used.add(next);
        pos[i] = next;
      });
      const placed = chunk.map((m, i) => ({ ...m, position: pos[i], positionLabel: String(pos[i]).padStart(2, "0") }));
      placed.sort((a, b) => a.position - b.position);
      const suffix = parts > 1 ? ` · ${part + 1}` : "";
      racks.push({
        rackId: `${head.chassisKey}${parts > 1 ? `-${part + 1}` : ""}`,
        rackNumber: racks.length + 1,
        code: head.chassisCode,
        name: `${head.chassisName}${suffix}`,
        tabLabel: `${head.chassisCode} · ${head.kindLabel}${suffix}`,
        kindLabel: head.kindLabel,
        protocol: head.protocol,
        gateway: head.gateway,
        positions: CHASSIS_POSITIONS,
        modules: placed,
        source,
      });
    }
  }
  return racks;
}

/** mapped_signals rows → cabinet rows: one chassis per edge_rack, one card per card_slot. */
export function cabinetRowsFromSignals(rows: RackSignalRow[]): CabinetRow[] {
  const racks = [...new Set(rows.map((r) => r.edge_rack || "Unassigned"))].sort(natural);
  const ordinal = new Map<string, number>();
  return [...rows]
    .sort((a, b) => natural(a.card_slot, b.card_slot) || natural(a.tag, b.tag))
    .map((r): CabinetRow => {
      const rack = r.edge_rack || "Unassigned";
      const card = parseCardSlot(r.card_slot);
      const key = `${rack}\u0000${r.card_slot}`;
      const ch = (ordinal.get(key) ?? 0) + 1;
      ordinal.set(key, ch);
      return {
        chassisKey: rack,
        chassisCode: rack,
        chassisName: rack,
        kindLabel: "DAQ rack",
        protocol: "",
        gateway: rack,
        chassisOrder: racks.indexOf(rack),
        cardCode: r.card_slot,
        cardModel: card.family,
        cardType: cardTypeOf(card.family),
        cardNote: card.slot !== null ? `Slot ${String(card.slot).padStart(2, "0")}` : null,
        cardCapacity: card.capacity,
        cardPosition: card.slot,
        channel: String(ch),
        tag: r.tag,
        parameter: r.name,
        unit: r.unit ?? "",
        instrument: r.instrument ?? "",
        sensorTypeText: r.sensor_type ?? "",
        sampleRate: r.sample_rate ?? "",
        address: r.modbus_address ?? "",
        quality: r.quality ?? "",
        component: r.component ?? "",
        normalRange: r.normal_threshold ?? "",
        alertLimit: null,
        dangerLimit: null,
        currentValue: r.current_value ?? "",
        status: r.status ?? "Normal",
      };
    });
}

/** A machine's cabinet from its mapped_signals rows (machines without registry points). */
export function buildRacksFromSignals(_machine: { id: string; name: string }, rows: RackSignalRow[]): MachineRackInfo[] {
  return buildCabinet(cabinetRowsFromSignals(rows));
}

/** Channel totals of a cabinet, for the header line both Rack views show. */
export function cabinetCounts(racks: MachineRackInfo[]): { sources: number; cards: number; channels: number } {
  return {
    sources: new Set(racks.map((r) => r.code)).size,
    cards: racks.reduce((n, r) => n + r.modules.length, 0),
    channels: racks.reduce((n, r) => n + r.modules.reduce((m, mod) => m + mod.channels.length, 0), 0),
  };
}

/** "4 sources · 11 cards · 43 channels": the count line both Rack views show. */
export function hardwareCountLine(
  sources: number,
  cards: number,
  channels: number,
  /** The machine's DB catalog: total sensors and how many are calculated (no wiring). */
  catalog?: { total: number; calculated: number },
): string {
  const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;
  const wiring = `${n(sources, "source", "sources")} · ${n(cards, "card", "cards")}`;
  if (!catalog || catalog.total === 0) return `${wiring} · ${n(channels, "channel", "channels")}`;
  // Same total as every other page (mapped_signals), split by where each sensor comes from.
  const unwired = Math.max(0, catalog.total - channels - catalog.calculated);
  return [
    `${n(catalog.total, "sensor", "sensors")}: ${channels} wired (${wiring})`,
    catalog.calculated ? `${catalog.calculated} calculated on the gateway` : null,
    unwired ? `${unwired} not wired yet` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
