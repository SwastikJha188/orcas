import { NextRequest, NextResponse } from "next/server";
import { CommandError, getMqttRuntime } from "@/server/mqtt/runtime";
import { isValidFilter } from "@/server/mqtt/topics";
import type { ApiFailure, ApiSuccess } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_S = 5;
const MAX_S = 300;

function fail(status: number, code: string, message: string) {
  const body: ApiFailure = { error: { code, message } };
  return NextResponse.json(body, { status });
}

// Temporarily subscribe one broker to a filter (default `#`) so whatever it
// carries lands in /api/mqtt/samples. Unsubscribes on its own after `seconds`;
// a new listen replaces a running one.
export async function POST(request: NextRequest) {
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
    return NextResponse.json(res);
  } catch (err) {
    if (err instanceof CommandError) {
      if (err.code === "UNKNOWN_BROKER") return fail(404, err.code, err.message);
      if (err.code === "BROKER_UNAVAILABLE") return fail(409, err.code, err.message);
    }
    return fail(500, "LISTEN_FAILED", err instanceof Error ? err.message : "Could not start listening.");
  }
}
