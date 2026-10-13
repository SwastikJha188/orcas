import { NextRequest, NextResponse } from "next/server";
import { CommandError, getMqttRuntime } from "@/server/mqtt/runtime";
import type { ApiFailure, ApiSuccess } from "@/types/api";
import type { MqttCommandResult } from "@/types/mqtt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same rule as registry codes (edge-service CODE_PATTERN): any identity that can be
// saved and ingested must also be commandable.
const ID_RE = /^[^/#+\s]{1,128}$/;

function fail(status: number, code: string, message: string) {
  const body: ApiFailure = { error: { code, message } };
  return NextResponse.json(body, { status });
}

// Downlink: publish a command on the gateway's commands/request topic of the
// broker that gateway publishes to, and wait for its commands/response on this
// process's own subscription. `brokerId` is optional: without it the broker
// that has seen this gateway / rack is used. A gateway that never answers is a
// plant condition (504), not a server fault.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return fail(400, "INVALID_JSON", "Request body must be JSON.");
  }

  const gatewayId = typeof body.gatewayId === "string" ? body.gatewayId.trim() : "";
  const rackId = typeof body.rackId === "string" ? body.rackId.trim() : "";
  const command = typeof body.command === "string" ? body.command.trim().toUpperCase() : "";
  const brokerId = typeof body.brokerId === "string" && body.brokerId.trim() ? body.brokerId.trim() : null;
  if (!ID_RE.test(gatewayId) || !ID_RE.test(rackId)) return fail(400, "INVALID_TARGET", "gatewayId and rackId are required.");
  if (brokerId !== null && !ID_RE.test(brokerId)) return fail(400, "INVALID_TARGET", "brokerId is invalid.");
  if (!command) return fail(400, "COMMAND_NOT_ALLOWED", "command is required.");
  const args = typeof body.args === "object" && body.args !== null && !Array.isArray(body.args) ? (body.args as Record<string, unknown>) : {};

  const mqtt = getMqttRuntime();
  const target = mqtt.resolveTarget(gatewayId, rackId, brokerId);
  if (!target) {
    return fail(404, "UNKNOWN_RACK", `${gatewayId} / ${rackId} has not published to ${brokerId ? `broker ${brokerId}` : "any connected broker"}.`);
  }
  if (!target.allowedCommands.includes(command)) {
    const list = target.allowedCommands.length ? `Allowed commands: ${target.allowedCommands.join(", ")}.` : "No commands are allowed.";
    return fail(400, "COMMAND_NOT_ALLOWED", `${target.name}: ${list}`);
  }

  try {
    const data = await mqtt.sendCommand(gatewayId, rackId, command, args, target.brokerId);
    const res: ApiSuccess<MqttCommandResult> = { data };
    return NextResponse.json(res);
  } catch (err) {
    if (err instanceof CommandError) {
      const status =
        err.code === "GATEWAY_TIMEOUT" ? 504 : err.code === "UNKNOWN_RACK" ? 404 : err.code === "COMMAND_NOT_ALLOWED" ? 400 : 503;
      return fail(status, err.code, err.message);
    }
    return fail(500, "COMMAND_FAILED", err instanceof Error ? err.message : "Command failed.");
  }
}
