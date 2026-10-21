// Envelope and payload validation for the v2.0 current-state contract.
// Every function returns a list of problems; an empty list means valid.

import type { TopicKind } from "./topics";

export interface Envelope {
  schema: string;
  schema_version: "2.0";
  message_id: string;
  gateway_id: string;
  gateway_boot_id: string;
  gateway_ip: string;
  gateway_sequence: number;
  created_at: string;
  created_at_us: string;
  replayed: boolean;
  rack_id?: string;
  payload: Record<string, unknown>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Dotted-quad IPv4 with every octet in 0–255 and no leading zeros. */
export function isIPv4(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const octets = value.split(".");
  return octets.length === 4 && octets.every((o) => /^(0|[1-9]\d{0,2})$/.test(o) && Number(o) <= 255);
}

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.length > 0;

export function validateEnvelope(msg: unknown): string[] {
  if (!isRecord(msg)) return ["message is not a JSON object"];
  const errors: string[] = [];
  if (typeof msg.schema !== "string" || !msg.schema.startsWith("ultron.")) errors.push("schema missing/invalid");
  if (msg.schema_version !== "2.0") errors.push('schema_version must be "2.0"');
  if (typeof msg.message_id !== "string" || !UUID_RE.test(msg.message_id)) errors.push("message_id must be a UUID");
  if (!nonEmpty(msg.gateway_id)) errors.push("gateway_id missing");
  if (!nonEmpty(msg.gateway_boot_id)) errors.push("gateway_boot_id missing");
  if (!isIPv4(msg.gateway_ip)) errors.push("gateway_ip missing/invalid");
  if (msg.rack_id !== undefined && !nonEmpty(msg.rack_id)) errors.push("rack_id must be a non-empty string");
  if (!Number.isInteger(msg.gateway_sequence) || (msg.gateway_sequence as number) < 0) errors.push("gateway_sequence must be a non-negative integer");
  if (typeof msg.created_at !== "string" || Number.isNaN(Date.parse(msg.created_at))) errors.push("created_at invalid");
  if (typeof msg.created_at_us !== "string" || !/^\d+$/.test(msg.created_at_us)) errors.push("created_at_us must be a decimal string");
  // Spooled messages are republished with replayed=true and their original
  // identity; rejecting them would quarantine exactly what the spool saves.
  if (typeof msg.replayed !== "boolean") errors.push("replayed must be a boolean");
  if (!isRecord(msg.payload)) errors.push("payload must be a JSON object");
  return errors;
}

function slotErrors(slots: unknown, label: string): string[] {
  if (!Array.isArray(slots)) return [`${label}.slots must be an array`];
  const errors: string[] = [];
  slots.forEach((slot, i) => {
    if (!isRecord(slot)) {
      errors.push(`${label}.slots[${i}] is not an object`);
      return;
    }
    if (!Number.isInteger(slot.slot_number) || (slot.slot_number as number) < 1) errors.push(`${label}.slots[${i}].slot_number invalid`);
    if (slot.measurement_valid !== undefined && typeof slot.measurement_valid !== "boolean") {
      errors.push(`${label}.slots[${i}].measurement_valid invalid`);
    }
  });
  return errors;
}

/**
 * ULTRON's browser gateway simulator (projects/gateway-simulator) still sends
 * the pre-v2 telemetry slot shape: `slot` / `channel` / `name`, no
 * `slot_count`, no `measurement_valid`. Rewrite it to v2 field names in place
 * so it passes the same checks; anything still wrong is quarantined as usual.
 */
export function normalizeLegacyTelemetry(schema: string, payload: Record<string, unknown>): void {
  if (schema !== "ultron.rack.telemetry" || !Array.isArray(payload.slots)) return;
  let legacy = false;
  for (const slot of payload.slots) {
    if (!isRecord(slot) || slot.slot_number !== undefined || slot.slot === undefined) continue;
    legacy = true;
    slot.slot_number = typeof slot.slot === "string" && /^\d+$/.test(slot.slot) ? Number(slot.slot) : slot.slot;
    if (slot.channel_id === undefined && slot.channel !== undefined) slot.channel_id = slot.channel;
    if (slot.sensor === undefined && typeof slot.name === "string") slot.sensor = slot.name;
    // The legacy shape has no quality flag: a numeric value is a reading.
    if (slot.measurement_valid === undefined) slot.measurement_valid = typeof slot.value === "number" && Number.isFinite(slot.value);
  }
  if (legacy && payload.slot_count === undefined) payload.slot_count = payload.slots.length;
}

export function validatePayload(schema: string, payload: Record<string, unknown>, envelopeRackId?: string): string[] {
  const errors: string[] = [];
  // A rack payload that names a different rack than its envelope is the same
  // identity fault as a topic/envelope mismatch.
  const rackIdMatches = () => {
    if (!nonEmpty(payload.rack_id)) errors.push("payload.rack_id invalid");
    else if (envelopeRackId !== undefined && payload.rack_id !== envelopeRackId) errors.push("payload.rack_id does not match envelope rack_id");
  };

  switch (schema) {
    case "ultron.gateway.status":
      if (payload.state !== "ONLINE" && payload.state !== "OFFLINE") errors.push("status.state invalid");
      if (payload.rack_summary !== undefined && !isRecord(payload.rack_summary)) errors.push("status.rack_summary invalid");
      break;
    case "ultron.gateway.topology":
      if (!Array.isArray(payload.racks)) errors.push("topology.racks must be an array");
      else if (payload.racks.some((rack) => !isRecord(rack) || !nonEmpty(rack.rack_id))) errors.push("topology.rack_id invalid");
      break;
    case "ultron.rack.inventory":
      if (!Number.isInteger(payload.snapshot_revision)) errors.push("inventory.snapshot_revision invalid");
      if (!Number.isInteger(payload.slot_count) || (payload.slot_count as number) < 0) errors.push("inventory.slot_count invalid");
      errors.push(...slotErrors(payload.slots, "inventory"));
      break;
    case "ultron.rack.health":
      rackIdMatches();
      if (!nonEmpty(payload.status)) errors.push("health.status invalid");
      if (typeof payload.data_current !== "boolean") errors.push("health.data_current invalid");
      break;
    case "ultron.rack.telemetry":
      rackIdMatches();
      if (!Number.isInteger(payload.slot_count) || (payload.slot_count as number) < 0) errors.push("telemetry.slot_count invalid");
      errors.push(...slotErrors(payload.slots, "telemetry"));
      break;
    case "ultron.event.alarm":
      if (payload.severity !== "WARNING" && payload.severity !== "CRITICAL") errors.push("alarm.severity invalid");
      if (payload.state !== "ACTIVE" && payload.state !== "CLEARED") errors.push("alarm.state invalid");
      break;
    case "ultron.event.fault":
      if (payload.state !== "ACTIVE" && payload.state !== "CLEARED") errors.push("fault.state invalid");
      break;
    case "ultron.event.system":
      if (!nonEmpty(payload.event_type)) errors.push("system.event_type missing");
      break;
    case "ultron.command.response":
      if (!nonEmpty(payload.request_id)) errors.push("response.request_id missing");
      if (!["ACCEPTED", "COMPLETED", "FAILED", "REJECTED"].includes(payload.status as string)) errors.push("response.status invalid");
      break;
    default:
      break;
  }
  return errors;
}

/** The envelope schema each topic kind must carry. */
export const SCHEMA_FOR_KIND: Record<TopicKind, string> = {
  status: "ultron.gateway.status",
  topology: "ultron.gateway.topology",
  rack_health: "ultron.rack.health",
  inventory: "ultron.rack.inventory",
  telemetry: "ultron.rack.telemetry",
  alarm: "ultron.event.alarm",
  fault: "ultron.event.fault",
  system: "ultron.event.system",
  command_response: "ultron.command.response",
};
