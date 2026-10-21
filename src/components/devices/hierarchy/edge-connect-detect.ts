import type { FormatFields, TimestampFormat } from "@shared/types/edge";

/* ==========================================================================
   Connect gateway · reading the first message. A flat JSON reading such as

     { gateway_id, gateway_name, device_id, device_name, tag_id, tag_name,
       value, unit, timestamp, quality }

   becomes gateway = gateway_id, rack / PLC / SCADA = device_id (named by
   device_name), card = tag_id (one card = one sensor, channel 1).
   ========================================================================== */

const KEYS: Record<keyof FormatFields | "gateway" | "gatewayName", string[]> = {
  gateway: ["gateway_id", "gatewayId", "gateway"],
  gatewayName: ["gateway_name", "gatewayName"],
  rack: ["device_id", "deviceId", "rack_id", "rackId", "plc_id", "source_id", "device", "rack"],
  rackName: ["device_name", "deviceName", "rack_name", "rackName", "plc_name", "source_name"],
  card: ["tag_id", "tagId", "point_id", "pointId", "card_id", "slot_number", "slot", "card", "tag"],
  channel: ["channel_id", "channelId", "channel"],
  value: ["value", "val", "v"],
  unit: ["unit", "units", "uom"],
  name: ["tag_name", "tagName", "sensor", "point_name", "name"],
  cardType: ["card_type", "cardType"],
  quality: ["quality", "measurement_valid", "valid"],
  timestamp: ["timestamp", "ts", "time", "created_at"],
  alert: ["alert_threshold", "alert"],
  danger: ["danger_threshold", "danger"],
};

export interface DetectedFormat {
  fields: FormatFields;
  timestampFormat: TimestampFormat;
  gateway: string | null;
  gatewayName: string | null;
}

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);

/** The mapping for a one-reading-per-message JSON payload, or null when it is not one. */
export function detectFormat(payload: string): DetectedFormat | null {
  let root: unknown;
  try {
    root = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!root || typeof root !== "object" || Array.isArray(root)) return null;
  const rec = root as Record<string, unknown>;
  const pick = (k: keyof typeof KEYS) => KEYS[k].find((key) => key in rec && rec[key] !== null && typeof rec[key] !== "object") ?? "";

  const value = pick("value");
  const rack = pick("rack");
  if (!value || !rack) return null;
  const fields: FormatFields = {
    rack,
    rackName: pick("rackName"),
    card: pick("card"),
    channel: pick("channel"),
    value,
    unit: pick("unit"),
    name: pick("name"),
    cardType: pick("cardType"),
    quality: pick("quality"),
    timestamp: pick("timestamp"),
    alert: pick("alert"),
    danger: pick("danger"),
  };
  // One card = one sensor: a payload with only a channel id makes that the card.
  if (!fields.card && fields.channel) [fields.card, fields.channel] = [fields.channel, ""];
  // The tag id names the card; its display name must not be the same key.
  if (fields.name === fields.card) fields.name = "";

  const ts = fields.timestamp ? rec[fields.timestamp] : undefined;
  const timestampFormat: TimestampFormat =
    typeof ts === "number" ? (ts > 1e14 ? "epoch_us" : ts > 1e11 ? "epoch_ms" : "epoch_s") : typeof ts === "string" ? "iso" : "none";

  const gw = pick("gateway");
  const gwName = pick("gatewayName");
  return { fields, timestampFormat, gateway: gw ? text(rec[gw]) : null, gatewayName: gwName ? text(rec[gwName]) : null };
}

/**
 * One filter covering every topic, so a single format reads them all: equal
 * depth → differing levels become `+`; otherwise the shared prefix + `#`.
 * Null when they share no fixed first level.
 */
export function coverFilter(topics: string[]): string | null {
  if (topics.length === 0) return null;
  const split = topics.map((t) => t.split("/"));
  const sameDepth = split.every((p) => p.length === split[0].length);
  let out: string[];
  const hashes = split.filter((p) => p[p.length - 1] === "#").length;
  if (sameDepth && (hashes === 0 || hashes === split.length)) {
    out = split[0].map((lvl, i) => (split.every((p) => p[i] === lvl) ? lvl : "+"));
  } else {
    const prefix: string[] = [];
    for (let i = 0; split.every((p) => i < p.length && p[i] === split[0][i] && p[i] !== "#"); i += 1) prefix.push(split[0][i]);
    out = [...prefix, "#"];
  }
  if (out[0] === "+" || out[0] === "#") return null;
  return out.join("/");
}
