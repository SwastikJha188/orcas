import type { EdgeFormat, EdgeRegistry, FormatFields, TimestampFormat } from "@/types/edge";
import { ULTRON_FORMAT_ID } from "@/lib/edge-format";

/* ==========================================================================
   Devices › Data formats: draft shape, presets (starting layouts, not data)
   and field labels. Pure, no React.
   ========================================================================== */

export interface FormatDraft {
  name: string;
  description: string;
  topic: string;
  records: string;
  fields: FormatFields;
  timestampFormat: TimestampFormat;
  defaults: { rack: string; card: string; channel: string };
}

export const EMPTY_FIELDS: FormatFields = {
  rack: "",
  rackName: "",
  card: "",
  channel: "",
  value: "",
  unit: "",
  name: "",
  cardType: "",
  quality: "",
  timestamp: "",
  alert: "",
  danger: "",
};

export const FIELD_META: Record<keyof FormatFields, { label: string; hint: string }> = {
  rack: { label: "Rack", hint: "Source id: rack, PLC, SCADA node" },
  rackName: { label: "Rack name", hint: "Its display name; “PLC”, “SCADA”… in it sets the kind" },
  card: { label: "Card", hint: "Slot / module id" },
  channel: { label: "Channel", hint: "Channel or tag id within the card" },
  value: { label: "Value", hint: "The reading; empty = the record itself" },
  unit: { label: "Unit", hint: "Engineering unit, or =°C" },
  name: { label: "Name", hint: "Sensor or tag description" },
  cardType: { label: "Card type", hint: "Module model or measurement type" },
  quality: { label: "Quality", hint: "true / good / OPC 192+ = valid" },
  timestamp: { label: "Timestamp", hint: "Source time of the sample" },
  alert: { label: "Alert limit", hint: "First threshold" },
  danger: { label: "Danger limit", hint: "Trip threshold" },
};

export const TIMESTAMP_OPTIONS: { value: TimestampFormat; label: string }[] = [
  { value: "iso", label: "ISO 8601 text" },
  { value: "epoch_ms", label: "Epoch milliseconds" },
  { value: "epoch_s", label: "Epoch seconds" },
  { value: "epoch_us", label: "Epoch microseconds" },
  { value: "none", label: "None (time received)" },
];

export const TIMESTAMP_LABEL: Record<TimestampFormat, string> = Object.fromEntries(
  TIMESTAMP_OPTIONS.map((o) => [o.value, o.label]),
) as Record<TimestampFormat, string>;

export function draftFrom(f: EdgeFormat | null): FormatDraft {
  return {
    name: f?.name ?? "",
    description: f?.description ?? "",
    topic: f?.topic ?? "",
    records: f?.records ?? "",
    fields: { ...EMPTY_FIELDS, ...(f?.fields ?? {}) },
    timestampFormat: f?.timestampFormat ?? "iso",
    defaults: { rack: f?.defaults.rack ?? "R1", card: f?.defaults.card ?? "1", channel: f?.defaults.channel ?? "1" },
  };
}

/** The draft as an EdgeFormat, for the parser preview. */
export function draftFormat(d: FormatDraft): EdgeFormat {
  return { id: "draft", ...d, description: d.description || null, kind: "json", builtIn: false, createdAt: "", updatedAt: "" };
}

export function draftPayload(d: FormatDraft): Record<string, unknown> {
  return {
    name: d.name.trim(),
    description: d.description.trim() || null,
    kind: "json",
    topic: d.topic.trim(),
    records: d.records.trim(),
    fields: Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, v.trim()])),
    timestampFormat: d.timestampFormat,
    defaults: { rack: d.defaults.rack.trim() || "R1", card: d.defaults.card.trim() || "1", channel: d.defaults.channel.trim() || "1" },
  };
}

// ---------------------------------------------------------------- presets
export interface Preset {
  id: string;
  label: string;
  hint: string;
  draft: Omit<FormatDraft, "name" | "description">;
}

const base = { timestampFormat: "iso" as TimestampFormat, defaults: { rack: "R1", card: "1", channel: "1" } };

export const PRESETS: Preset[] = [
  {
    id: "per-topic",
    label: "One value per topic",
    hint: "site/{gateway}/{rack}/{card}/{channel} · payload is the value",
    draft: { ...base, topic: "site/{gateway}/{rack}/{card}/{channel}", records: "", fields: { ...EMPTY_FIELDS, value: "$value" }, timestampFormat: "none" },
  },
  {
    id: "array",
    label: "Array of readings",
    hint: "plant/{gateway}/data · readings[]",
    draft: {
      ...base,
      topic: "plant/{gateway}/data",
      records: "readings",
      fields: { ...EMPTY_FIELDS, rack: "rack", card: "card", channel: "channel", value: "value", unit: "unit", name: "name", timestamp: "timestamp" },
    },
  },
  {
    id: "tag-map",
    label: "Tag map",
    hint: "{gateway}/tags · { tag: value }",
    draft: { ...base, topic: "{gateway}/tags", records: "tags", fields: { ...EMPTY_FIELDS, channel: "$key", value: "$value" } },
  },
  {
    id: "nested",
    label: "Nested racks › cards › channels",
    hint: "racks[*].cards[*].channels[*]",
    draft: {
      ...base,
      topic: "plant/{gateway}/telemetry",
      records: "racks[*].cards[*].channels[*]",
      fields: { ...EMPTY_FIELDS, rack: "rack_id", card: "slot", channel: "channel", value: "value", unit: "unit", name: "name", cardType: "card_type", quality: "valid", timestamp: "timestamp" },
    },
  },
  {
    id: "kepware",
    label: "Kepware IoT Gateway",
    hint: "iotgateway/{gateway} · values[] id / v / q / t",
    draft: {
      ...base,
      topic: "iotgateway/{gateway}",
      records: "values",
      fields: { ...EMPTY_FIELDS, channel: "id", value: "v", quality: "q", timestamp: "t" },
      timestampFormat: "epoch_ms",
    },
  },
];

// ---------------------------------------------------------------- usage
/** Gateway codes per format id; gateways without a format use the ULTRON contract. */
export function usage(registry: EdgeRegistry): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const g of registry.gateways) {
    const id = g.formatId ?? ULTRON_FORMAT_ID;
    out.set(id, [...(out.get(id) ?? []), g.code]);
  }
  return out;
}

export function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

// ---------------------------------------------------------------- picked paths
type Seg = string | number;

const keyText = (k: string) => (/^[^.[\]\s]+$/.test(k) ? k : null);

function join(segs: Seg[]): string | null {
  let out = "";
  for (const s of segs) {
    if (typeof s === "number") out += `[${s}]`;
    else {
      const k = keyText(s);
      if (k === null) return null;
      out += out ? `.${k}` : k;
    }
  }
  return out;
}

/** A clicked node as a records path: array positions become [*]. */
export function pickedRecords(segs: Seg[]): string | null {
  // Clicking an array element means "this array's elements".
  const trimmed = typeof segs[segs.length - 1] === "number" ? segs.slice(0, -1) : segs;
  let out = "";
  for (const s of trimmed) {
    if (typeof s === "number") out += "[*]";
    else {
      const k = keyText(s);
      if (k === null) return null;
      out += out ? `.${k}` : k;
    }
  }
  return out;
}

/**
 * A clicked node as a field path. Relative to the record when the click is
 * inside one (the records path is a prefix), else from the payload root
 * (fields fall back through the record's ancestors to the root).
 */
export function pickedField(
  segs: Seg[],
  records: string,
  steps: ({ key: string } | { index: number } | { all: true })[] | null,
  root: unknown,
): string | null {
  if (steps) {
    let j = 0;
    let ok = true;
    /** Position just inside the deepest object the records path stepped into. */
    let inside = 0;
    for (const step of steps) {
      if ("key" in step && typeof segs[j] === "number") j += 1; // implicit fan-out over an array
      if (j >= segs.length) {
        ok = false;
        break;
      }
      if ("all" in step) j += 1;
      else if ("index" in step) {
        if (segs[j] !== step.index) ok = false;
        j += 1;
      } else {
        if (segs[j] !== step.key) ok = false;
        j += 1;
      }
      if (!ok) break;
      // Stepping into an array element (or a map entry) enters a new ancestor scope.
      if (typeof segs[j - 1] === "number" || "all" in step) inside = j;
    }
    // Clicked on an ancestor of the record (a rack id beside its cards):
    // fields fall back through ancestors, so the path below that ancestor is enough.
    if (!ok && inside > 0 && inside < segs.length) {
      const rest = join(segs.slice(inside));
      if (rest) return rest;
    }
    if (ok) {
      const last = steps[steps.length - 1];
      // The records path ends on a container: step into the element (array) or entry (map).
      if (steps.length === 0 || !("all" in last)) {
        if (typeof segs[j] === "number") j += 1;
        else if (records.trim() && j < segs.length && isMapLike(nodeAt(root, segs.slice(0, j)))) {
          // Map entry: the key itself names the record; below it is the record's content.
          if (j === segs.length - 1) return "$key";
          j += 1;
        }
      }
      const rest = segs.slice(j);
      if (rest.length === 0) return "$value";
      return join(rest);
    }
  }
  return join(segs);
}

function nodeAt(root: unknown, segs: Seg[]): unknown {
  let cur = root;
  for (const s of segs) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, unknown>)[s];
  }
  return cur;
}

/** Same rule as the parser: all-object values, or all numeric / boolean values. */
function isMapLike(v: unknown): boolean {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const values = Object.values(v);
  if (values.length === 0) return false;
  if (values.every((x) => typeof x === "object" && x !== null && !Array.isArray(x))) return true;
  return values.every((x) => typeof x === "number" || typeof x === "boolean");
}
