import { NextRequest, NextResponse } from "next/server";
import { CommandError, getMqttRuntime } from "@/server/mqtt/runtime";
import { isValidFilter } from "@/server/mqtt/topics";
import type { ApiFailure, ApiSuccess } from "@/types/api";
import type { RawSample } from "@/types/edge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(status: number, code: string, message: string) {
  const body: ApiFailure = { error: { code, message } };
  return NextResponse.json(body, { status });
}

// The latest message per topic a broker delivered (max 200, newest first;
// all brokers merged when `brokerId` is omitted),
// for designing data formats from what gateways really send. `q` filters on
// a topic substring; repeated `filter` params keep only topics matching any of
// those MQTT filters.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  // Without brokerId: every broker's samples merged.
  const brokerId = (params.get("brokerId") ?? "").trim() || null;
  try {
    const filters = params.getAll("filter").map((f) => f.trim()).filter(isValidFilter).slice(0, 32);
    const body: ApiSuccess<RawSample[]> = { data: getMqttRuntime().samples(brokerId, params.get("q"), filters) };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof CommandError && err.code === "UNKNOWN_BROKER") return fail(404, err.code, err.message);
    return fail(500, "SAMPLES_FAILED", err instanceof Error ? err.message : "Could not read samples.");
  }
}
