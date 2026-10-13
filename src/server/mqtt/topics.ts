// The ultron/v1 topic tree (contract v2.0). Gateway and rack segments are
// UTF-8 percent-encoded identity values and are decoded exactly once.

export type TopicKind =
  | "status"
  | "topology"
  | "rack_health"
  | "inventory"
  | "telemetry"
  | "alarm"
  | "fault"
  | "system"
  | "command_response";

export interface ParsedTopic {
  gatewayId: string;
  rackId: string | null;
  kind: TopicKind;
}

/** The contract's default root. Each broker in the edge registry may override it. */
export const DEFAULT_TOPIC_PREFIX = "ultron/v1/gateways";

const RACK_KINDS: Record<string, TopicKind> = {
  inventory: "inventory",
  health: "rack_health",
  telemetry: "telemetry",
  "events/alarm": "alarm",
  "events/fault": "fault",
  "events/system": "system",
  "commands/response": "command_response",
};

/** A configured prefix without stray slashes; empty falls back to the default. */
export function normalizePrefix(prefix: string | null | undefined): string {
  const trimmed = (prefix ?? "").trim().replace(/^\/+|\/+$/g, "");
  return trimmed || DEFAULT_TOPIC_PREFIX;
}

/** Splits `<prefix>/<gateway>/…` after stripping the broker's prefix (any number of levels). */
export function parseTopic(topic: string, prefix: string = DEFAULT_TOPIC_PREFIX): ParsedTopic | null {
  const root = normalizePrefix(prefix);
  if (!topic.startsWith(`${root}/`)) return null;
  const parts = topic.slice(root.length + 1).split("/");
  if (parts.length < 2) return null;

  const gatewayId = decodeSegment(parts[0]);
  if (!gatewayId) return null;

  if (parts.length === 2 && parts[1] === "status") return { gatewayId, rackId: null, kind: "status" };
  if (parts.length === 2 && parts[1] === "topology") return { gatewayId, rackId: null, kind: "topology" };
  if (parts.length < 4 || parts[1] !== "racks") return null;

  const rackId = decodeSegment(parts[2]);
  if (!rackId) return null;
  const kind = RACK_KINDS[parts.slice(3).join("/")];
  return kind ? { gatewayId, rackId, kind } : null;
}

export function decodeSegment(segment: string): string | null {
  try {
    const decoded = decodeURIComponent(segment);
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

export const encodeSegment = (segment: string) => encodeURIComponent(segment);

/**
 * What this application subscribes to under one broker's prefix.
 * `commands/response` is included so the downlink completes over the broker.
 * `telemetry/latest` is deliberately absent: it is a retained copy of
 * `telemetry` and would double every sample.
 */
export function gatewaySubscriptions(prefix: string = DEFAULT_TOPIC_PREFIX): string[] {
  const root = normalizePrefix(prefix);
  return [
    `${root}/+/status`,
    `${root}/+/topology`,
    `${root}/+/racks/+/health`,
    `${root}/+/racks/+/inventory`,
    `${root}/+/racks/+/telemetry`,
    // All event kinds, not only alarms: every gateway message consumes a sequence
    // number, so an unsubscribed kind would read as loss.
    `${root}/+/racks/+/events/+`,
    `${root}/+/racks/+/commands/response`,
  ];
}

export function commandRequestTopic(prefix: string, gatewayId: string, rackId: string): string {
  return `${normalizePrefix(prefix)}/${encodeSegment(gatewayId)}/racks/${encodeSegment(rackId)}/commands/request`;
}

// Shared with the browser (gateway Topics view), so it lives in the edge-format lib.
export { topicMatchesFilter } from "@/lib/edge-format";

/** A filter is valid when `#` only appears as the last level and wildcards occupy whole levels. */
export function isValidFilter(filter: string): boolean {
  if (!filter || filter.length > 512) return false;
  const parts = filter.split("/");
  return parts.every((part, i) => {
    if (part === "#") return i === parts.length - 1;
    if (part === "+") return true;
    return !part.includes("#") && !part.includes("+");
  });
}
