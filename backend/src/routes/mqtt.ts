import { Hono } from "hono";
import { CommandError, getMqttRuntime } from "@backend/mqtt/runtime";
import { isValidFilter, topicMatchesFilter } from "@backend/mqtt/topics";
import { type ApiFailure, type ApiSuccess } from "@shared/types/api";
import { type RawSample } from "@shared/types/edge";
import { type MqttCommandResult, type MqttSnapshot, type MqttTick } from "@shared/types/mqtt";

/** /api/mqtt */
export const mqtt = new Hono();

// Same rule as registry codes (edge-service CODE_PATTERN): any identity that can be
// saved and ingested must also be commandable.
const ID_RE = /^[^/#+\s]{1,128}$/;

function fail(status: number, code: string, message: string) {
  const body: ApiFailure = { error: { code, message } };
  return Response.json(body, { status });
}

const MIN_S = 5;

const MAX_S = 300;

const HEARTBEAT_MS = 15_000;

const MAX_FILTERS = 32;
mqtt.post("/command", async (c) => {
  const request = c.req.raw;
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
    return Response.json(res);
  } catch (err) {
    if (err instanceof CommandError) {
      const status =
        err.code === "GATEWAY_TIMEOUT" ? 504 : err.code === "UNKNOWN_RACK" ? 404 : err.code === "COMMAND_NOT_ALLOWED" ? 400 : 503;
      return fail(status, err.code, err.message);
    }
    return fail(500, "COMMAND_FAILED", err instanceof Error ? err.message : "Command failed.");
  }
});

mqtt.post("/listen", async (c) => {
  const request = c.req.raw;
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return fail(400, "INVALID_JSON", "Request body must be JSON.");
  }
  const brokerId = typeof body.brokerId === "string" ? body.brokerId.trim() : "";
  if (!brokerId) return fail(400, "INVALID_BROKER", "brokerId is required.");
  const filter = typeof body.filter === "string" && body.filter.trim() ? body.filter.trim() : "#";
  if (!isValidFilter(filter)) return fail(400, "INVALID_FILTER", `“${filter}” is not a valid MQTT filter.`);
  const raw = body.seconds === undefined || body.seconds === null ? 60 : Number(body.seconds);
  if (!Number.isFinite(raw)) return fail(400, "INVALID_SECONDS", "seconds must be a number.");
  const seconds = Math.round(Math.min(MAX_S, Math.max(MIN_S, raw)));

  try {
    const res: ApiSuccess<{ filter: string; until: string }> = { data: getMqttRuntime().listen(brokerId, filter, seconds) };
    return Response.json(res);
  } catch (err) {
    if (err instanceof CommandError) {
      if (err.code === "UNKNOWN_BROKER") return fail(404, err.code, err.message);
      if (err.code === "BROKER_UNAVAILABLE") return fail(409, err.code, err.message);
    }
    return fail(500, "LISTEN_FAILED", err instanceof Error ? err.message : "Could not start listening.");
  }
});

mqtt.get("/samples", async (c) => {
  const request = c.req.raw;
  const params = new URL(request.url).searchParams;
  // Without brokerId: every broker's samples merged.
  const brokerId = (params.get("brokerId") ?? "").trim() || null;
  try {
    const filters = params.getAll("filter").map((f) => f.trim()).filter(isValidFilter).slice(0, 32);
    const body: ApiSuccess<RawSample[]> = { data: getMqttRuntime().samples(brokerId, params.get("q"), filters) };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof CommandError && err.code === "UNKNOWN_BROKER") return fail(404, err.code, err.message);
    return fail(500, "SAMPLES_FAILED", err instanceof Error ? err.message : "Could not read samples.");
  }
});

mqtt.get("/status", async () => {
  const body: ApiSuccess<MqttSnapshot> = { data: getMqttRuntime().snapshot() };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
});

mqtt.get("/stream", async (c) => {
  const request = c.req.raw;
  const filters = (new URL(request.url).searchParams.get("topics") ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(isValidFilter)
    .slice(0, MAX_FILTERS);

  const mqtt = getMqttRuntime();
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const event = (tick: MqttTick) => {
        const traffic = filters.length ? tick.traffic.filter((t) => filters.some((f) => topicMatchesFilter(t.topic, f))) : tick.traffic;
        send(`event: tick\ndata: ${JSON.stringify({ ...tick, traffic })}\n\n`);
      };

      send("retry: 3000\n\n");
      event({ snapshot: mqtt.snapshot(), traffic: mqtt.recentTraffic(100) });
      const unsubscribe = mqtt.subscribe(event);
      const heartbeat = setInterval(() => send(": keep-alive\n\n"), HEARTBEAT_MS);

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
        cleanup = () => {};
      };
      request.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
