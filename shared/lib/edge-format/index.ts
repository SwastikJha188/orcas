// Gateway data formats: turn one MQTT message into readings keyed by
// (rack, card, channel). Pure TypeScript with no Node or DOM APIs, so the
// server runtime ingests with it and the format editor previews with it.
//
//   template  plant/{gateway}/{rack}/data   →  filter plant/GW-7/+/data
//   records   racks[*].cards[*].channels[*] →  one record per channel
//   fields    resolved on the record, then its card, its rack, the payload

import type { EdgeFormat, FormatFields, ParseResult, ParsedReading, TimestampFormat } from "@shared/types/edge";

export const ULTRON_FORMAT_ID = "fmt-ultron-v2";
export const MAX_RECORDS = 5000;

const EMPTY_FIELDS: FormatFields = {
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

/** The built-in contract, described as a format so it can be listed and previewed. */
export const ULTRON_FORMAT: EdgeFormat = {
  id: ULTRON_FORMAT_ID,
  name: "ULTRON gateway contract v2",
  description: "Envelopes on ultron/v1/gateways/{gateway}/…: status, topology, rack health, inventory, telemetry, events.",
  kind: "ultron-v2",
  topic: "{gateway}/racks/{rack}/telemetry",
  records: "payload.slots",
  fields: {
    ...EMPTY_FIELDS,
    rack: "rack_id",
    card: "slot_number",
    channel: "channel_id",
    value: "value",
    unit: "unit",
    name: "sensor",
    cardType: "card_type",
    quality: "measurement_valid",
    timestamp: "created_at",
    alert: "alert_threshold",
    danger: "danger_threshold",
  },
  timestampFormat: "iso",
  defaults: { rack: "R1", card: "1", channel: "1" },
  builtIn: true,
  createdAt: "",
  updatedAt: "",
};

// ---------------------------------------------------------------- topics
type Capture = "gateway" | "rack" | "card" | "channel";
const PLACEHOLDER = /^\{(gateway|rack|card|channel)\}$/;

export interface TemplateIssue {
  ok: boolean;
  message: string | null;
}

/** A template is levels of literal text, one placeholder, `+`, or a final `#`. */
export function checkTemplate(template: string): TemplateIssue {
  const t = template.trim();
  if (!t) return { ok: false, message: "Topic template is required." };
  const levels = t.split("/");
  for (let i = 0; i < levels.length; i += 1) {
    const level = levels[i];
    if (level === "#") {
      if (i !== levels.length - 1) return { ok: false, message: "“#” may only be the last level." };
      continue;
    }
    if (level === "+" || PLACEHOLDER.test(level)) continue;
    if (!level) return { ok: false, message: "Empty level (“//”) in the template." };
    if (/[{}+#]/.test(level)) return { ok: false, message: `Level “${level}” must be literal text, one placeholder, “+” or “#”.` };
  }
  const names = levels.filter((l) => PLACEHOLDER.test(l));
  if (new Set(names).size !== names.length) return { ok: false, message: "Each placeholder may appear once." };
  return { ok: true, message: null };
}

/** Join a broker root and a template ("" root = template is absolute). */
export function joinTopic(root: string, template: string): string {
  const r = root.replace(/\/+$/, "");
  const t = template.replace(/^\/+/, "");
  return r ? `${r}/${t}` : t;
}

/** MQTT subscription filter for one gateway: {gateway} → its code, other placeholders → `+`. */
export function templateFilter(template: string, gatewayCode: string | null): string {
  return template
    .split("/")
    .map((level) => {
      const m = PLACEHOLDER.exec(level);
      if (!m) return level;
      return m[1] === "gateway" && gatewayCode ? encodeURIComponent(gatewayCode) : "+";
    })
    .join("/");
}

/** Match a concrete topic against a template; returns the captured ids or null. */
export function matchTemplate(template: string, topic: string): Partial<Record<Capture, string>> | null {
  const want = template.split("/");
  const got = topic.split("/");
  const out: Partial<Record<Capture, string>> = {};
  for (let i = 0; i < want.length; i += 1) {
    const level = want[i];
    if (level === "#") return i <= got.length ? out : null;
    if (i >= got.length) return null;
    const m = PLACEHOLDER.exec(level);
    if (m) {
      let v: string;
      try {
        v = decodeURIComponent(got[i]);
      } catch {
        v = got[i];
      }
      if (!v) return null;
      out[m[1] as Capture] = v;
    } else if (level !== "+" && level !== got[i]) return null;
  }
  return want.length === got.length ? out : null;
}

// ---------------------------------------------------------------- paths
type Json = unknown;
type Step = { key: string } | { index: number } | { all: true };

interface Record_ {
  value: Json;
  /** Enclosing objects, nearest first, ending with the payload root. */
  ancestors: Json[];
  key: string | null;
  index: number | null;
}

/** "a.b[2].c" → steps. `[*]` expands every element. */
export function parsePath(path: string): Step[] | null {
  const steps: Step[] = [];
  const re = /([^.[\]]+)|\[(\d+|\*)\]/g;
  const cleaned = path.trim().replace(/^\$\.?/, "");
  if (!cleaned) return [];
  let m: RegExpExecArray | null;
  let consumed = 0;
  while ((m = re.exec(cleaned))) {
    const gap = cleaned.slice(consumed, m.index).replace(/\./g, "");
    if (gap) return null;
    consumed = m.index + m[0].length;
    if (m[1] !== undefined) steps.push({ key: m[1] });
    else if (m[2] === "*") steps.push({ all: true });
    else steps.push({ index: Number(m[2]) });
  }
  if (cleaned.slice(consumed).replace(/\./g, "")) return null;
  return steps;
}

const isObject = (v: Json): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Walk a path without wildcards; `undefined` when any step is missing. */
function walk(value: Json, steps: Step[]): Json {
  let cur = value;
  for (const s of steps) {
    if ("all" in s) return undefined;
    if ("index" in s) {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[s.index];
    } else {
      if (!isObject(cur)) return undefined;
      cur = cur[s.key];
    }
    if (cur === undefined) return undefined;
  }
  return cur;
}

/**
 * Expand the records path into records. A path ending on an array yields its
 * elements; ending on an object of scalars or objects ("map") yields one record
 * per key with `$key`. Each `[*]` (or array met mid-path) fans out.
 */
function expand(root: Json, path: string, errors: string[]): Record_[] {
  const steps = parsePath(path);
  if (steps === null) {
    errors.push(`Records path “${path}” is not valid.`);
    return [];
  }
  let frontier: Record_[] = [{ value: root, ancestors: [], key: null, index: null }];
  for (const step of steps) {
    const next: Record_[] = [];
    for (const r of frontier) {
      const chain = [r.value, ...r.ancestors];
      if ("all" in step) {
        if (Array.isArray(r.value)) r.value.forEach((v, i) => next.push({ value: v, ancestors: chain, key: null, index: i }));
        else if (isObject(r.value)) Object.entries(r.value).forEach(([k, v], i) => next.push({ value: v, ancestors: chain, key: k, index: i }));
        continue;
      }
      // An array met before a key step fans out implicitly: "racks.cards" ≡ "racks[*].cards".
      const bases: Record_[] =
        "key" in step && Array.isArray(r.value) ? r.value.map((v, i) => ({ value: v, ancestors: chain, key: null, index: i })) : [r];
      for (const b of bases) {
        const v = walk(b.value, [step]);
        // The object stepped into stays in scope for field lookups (a rack id held on the rack).
        if (v !== undefined) next.push({ value: v, ancestors: [b.value, ...b.ancestors], key: b.key, index: b.index });
      }
    }
    frontier = next;
    if (frontier.length === 0) {
      errors.push(`Records path “${path}” matched nothing in this message.`);
      return [];
    }
  }
  // The container the path ends on becomes its entries: an array's elements,
  // a map's keys. A path ending in [*] has already fanned out; an empty path on
  // an array payload means "each element is a reading".
  const last = steps[steps.length - 1];
  const fanOut = steps.length === 0 ? Array.isArray(root) : !("all" in last);
  const out: Record_[] = [];
  for (const r of frontier) {
    const chain = [r.value, ...r.ancestors];
    if (fanOut && Array.isArray(r.value)) {
      r.value.forEach((v, i) => out.push({ value: v, ancestors: chain, key: r.key, index: i }));
    } else if (fanOut && steps.length > 0 && isObject(r.value) && isMap(r.value)) {
      Object.entries(r.value).forEach(([k, v], i) => out.push({ value: v, ancestors: chain, key: k, index: i }));
    } else {
      out.push(r);
    }
    if (out.length > MAX_RECORDS) break;
  }
  if (out.length > MAX_RECORDS) {
    errors.push(`More than ${MAX_RECORDS} records; the rest were ignored.`);
    out.length = MAX_RECORDS;
  }
  return out;
}

/**
 * An object is a map of readings when it has at least one key and its values
 * are all scalars or all objects (`{ "TT101": 23.4, … }`, `{ "TT101": { v: 23.4 } }`),
 * as opposed to one reading with mixed fields (`{ id, value, unit }`).
 */
function isMap(o: Record<string, Json>): boolean {
  const values = Object.values(o);
  if (values.length === 0) return false;
  const scalars = values.every((v) => v === null || ["number", "string", "boolean"].includes(typeof v));
  const objects = values.every((v) => isObject(v));
  if (objects) return true;
  // All-scalar objects are maps only when every value is numeric or boolean:
  // a reading like { id: "TT1", value: 2 } has a string field.
  return scalars && values.every((v) => typeof v === "number" || typeof v === "boolean");
}

/** Resolve a field path on a record, then its ancestors. */
function resolve(rec: Record_, path: string): Json {
  const p = path.trim();
  if (!p) return undefined;
  if (p.startsWith("=")) return p.slice(1);
  if (p === "$key") return rec.key ?? undefined;
  if (p === "$index") return rec.index ?? undefined;
  if (p === "$value") return rec.value;
  const steps = parsePath(p);
  if (!steps || steps.length === 0) return undefined;
  for (const scope of [rec.value, ...rec.ancestors]) {
    const v = walk(scope, steps);
    if (v !== undefined) return v;
  }
  return undefined;
}

// ---------------------------------------------------------------- coercion
const asText = (v: Json): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
};

const asNumber = (v: Json): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/** Good: true, "good"/"ok"/"valid", OPC quality 192–255, 1. Anything else given is bad; absent is good. */
export function qualityGood(v: Json): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1 || (v >= 192 && v <= 255);
  if (typeof v === "string") return /^(good|ok|valid|true|1)$/i.test(v.trim()) || /^good/i.test(v.trim());
  return false;
}

export function parseTimestamp(v: Json, format: TimestampFormat): number | null {
  if (format === "none" || v === undefined || v === null) return null;
  if (format === "iso") {
    const ms = typeof v === "string" ? Date.parse(v) : NaN;
    return Number.isFinite(ms) ? ms : null;
  }
  const n = asNumber(v);
  if (n === null) return null;
  return format === "epoch_s" ? n * 1000 : format === "epoch_us" ? n / 1000 : n;
}

// ---------------------------------------------------------------- parse
export interface ParseContext {
  /** The full topic (JSON templates are full topics; the ULTRON contract's prefix may be included). */
  topic: string;
  /** When given, a {gateway} capture must equal it. */
  gatewayCode?: string | null;
}

/** Parse one message with a JSON format. ULTRON contract messages go through `parseUltron`. */
export function parseMessage(format: EdgeFormat, payload: string, ctx: ParseContext): ParseResult {
  if (format.kind === "ultron-v2") return parseUltron(payload, ctx);
  const errors: string[] = [];
  const captures = matchTemplate(format.topic, ctx.topic);
  if (!captures) return { matched: false, captures: {}, readings: [], errors: [`Topic does not match “${format.topic}”.`] };
  if (ctx.gatewayCode && captures.gateway && captures.gateway !== ctx.gatewayCode) {
    return { matched: false, captures, readings: [], errors: [`Topic names gateway “${captures.gateway}”, not “${ctx.gatewayCode}”.`] };
  }

  let root: Json;
  try {
    root = JSON.parse(payload);
  } catch {
    // A bare number or word is a one-value payload ("23.4", "RUN").
    const t = payload.trim();
    if (!t) return { matched: true, captures, readings: [], errors: ["Empty payload."] };
    root = asNumber(t) ?? t;
  }

  const records = expand(root, format.records, errors);
  const readings: ParsedReading[] = [];
  let missingValue = 0;
  for (const rec of records) {
    const f = format.fields;
    const raw = f.value ? resolve(rec, f.value) : typeof rec.value !== "object" ? rec.value : undefined;
    if (raw === undefined) {
      missingValue += 1;
      continue;
    }
    // A scalar record read through $key: the record itself is the value.
    const id = (field: keyof FormatFields, cap: Capture & keyof typeof format.defaults) =>
      asText(resolve(rec, f[field])) ?? captures[cap] ?? format.defaults[cap];
    const value = asNumber(raw);
    readings.push({
      rack: id("rack", "rack"),
      rackName: asText(resolve(rec, f.rackName)),
      card: id("card", "card"),
      channel: id("channel", "channel"),
      value,
      display: value === null ? asText(raw) : null,
      unit: asText(resolve(rec, f.unit)),
      name: asText(resolve(rec, f.name)),
      cardType: asText(resolve(rec, f.cardType)),
      valid: qualityGood(f.quality ? resolve(rec, f.quality) : undefined) && (value !== null || asText(raw) !== null),
      at: parseTimestamp(resolve(rec, f.timestamp), format.timestampFormat),
      alert: asNumber(resolve(rec, f.alert)),
      danger: asNumber(resolve(rec, f.danger)),
    });
  }
  if (missingValue) errors.push(`${missingValue} record${missingValue === 1 ? "" : "s"} had no value at “${format.fields.value || "(record)"}”.`);
  const ids = new Set(readings.map((r) => `${r.rack}\u0000${r.card}\u0000${r.channel}`));
  if (ids.size < readings.length) errors.push("Several readings share one rack · card · channel; map card or channel to a field that differs per reading.");
  return { matched: true, captures, readings, errors };
}

/**
 * Preview of the ULTRON contract: telemetry envelopes give readings; other
 * contract messages match but carry none.
 */
export function parseUltron(payload: string, ctx: ParseContext): ParseResult {
  const m = /^(?:.*\/)?([^/]+)\/racks\/([^/]+)\/telemetry$/.exec(ctx.topic);
  const isContract = /(^|\/)[^/]+\/(status|topology|racks\/[^/]+\/(health|inventory|telemetry|events\/[^/]+|commands\/response))$/.test(ctx.topic);
  if (!isContract) return { matched: false, captures: {}, readings: [], errors: ["Not an ULTRON contract topic."] };
  const captures = m ? { gateway: safeDecode(m[1]), rack: safeDecode(m[2]) } : {};
  if (!m) return { matched: true, captures, readings: [], errors: [] };
  let env: Json;
  try {
    env = JSON.parse(payload);
  } catch {
    return { matched: true, captures, readings: [], errors: ["Invalid JSON."] };
  }
  const p = isObject(env) && isObject(env.payload) ? env.payload : null;
  const slots = p && Array.isArray(p.slots) ? p.slots : null;
  if (!slots) return { matched: true, captures, readings: [], errors: ["payload.slots is missing."] };
  const at = isObject(env) ? parseTimestamp(env.created_at, "iso") : null;
  const readings: ParsedReading[] = slots.filter(isObject).map((s) => {
    const value = asNumber(s.value) ?? asNumber(s.value_formatted);
    return {
      rack: captures.rack ?? "",
      rackName: null,
      card: asText(s.slot_number) ?? "1",
      channel: asText(s.channel_id ?? s.channel_number ?? s.channel) ?? "1",
      value,
      display: value === null ? asText(s.value_display ?? s.value_formatted) : null,
      unit: asText(s.unit),
      name: asText(s.sensor ?? s.measurement_type),
      cardType: asText(s.card_type),
      valid: s.measurement_valid === true,
      at,
      alert: asNumber(s.alert_threshold),
      danger: asNumber(s.danger_threshold),
    };
  });
  return { matched: true, captures, readings, errors: [] };
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Validation for a format before it is saved. Returns problems a person can fix. */
export function checkFormat(format: Pick<EdgeFormat, "kind" | "topic" | "records" | "fields">): string[] {
  if (format.kind === "ultron-v2") return [];
  const problems: string[] = [];
  const t = checkTemplate(format.topic);
  if (!t.ok && t.message) problems.push(t.message);
  if (parsePath(format.records) === null) problems.push("Records path is not valid.");
  for (const [k, v] of Object.entries(format.fields) as [string, string][]) {
    const p = v.trim();
    if (!p || p.startsWith("=") || p.startsWith("$")) continue;
    const steps = parsePath(p);
    if (steps === null || steps.some((s) => "all" in s)) problems.push(`Field “${k}” path “${v}” is not valid (no [*] in field paths).`);
  }
  return problems;
}

/** Natural order for card / channel ids: "2" before "10", "AI-2" before "AI-10". */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/** MQTT filter matching: `+` is one level, a trailing `#` is the parent and everything below it. */
export function topicMatchesFilter(topic: string, filter: string): boolean {
  if (filter === "#") return true;
  const topicParts = topic.split("/");
  const filterParts = filter.split("/");
  for (let i = 0; i < filterParts.length; i += 1) {
    const part = filterParts[i];
    if (part === "#") return i === filterParts.length - 1;
    if (i >= topicParts.length) return false;
    if (part !== "+" && part !== topicParts[i]) return false;
  }
  return topicParts.length === filterParts.length;
}
