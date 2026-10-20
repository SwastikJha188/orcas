import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok } from "@/app/api/_lib/respond";
import { ingestReadings } from "@/server/services/monitoring-service";

export const runtime = "nodejs";

/**
 * POST /api/readings → store readings from a gateway, laboratory or person.
 * Body: { readings: [{ measurementId | (machineId, tag), acquiredAt?, value | state, quality? }] }.
 * Callers authenticate with a signed-in session or the `x-ultron-ingest-key` header (ULTRON_INGEST_KEY).
 */
export async function POST(request: NextRequest) {
  try {
    const key = process.env.ULTRON_INGEST_KEY;
    const keyOk = Boolean(key) && request.headers.get("x-ultron-ingest-key") === key;
    if (!keyOk && !(await currentUserId(request)) && process.env.NODE_ENV === "production") {
      return fail(401, "NOT_AUTHORISED", "Send a session or the ingest key.");
    }
    const body = (await request.json().catch(() => null)) as { readings?: unknown } | null;
    if (!body || !Array.isArray(body.readings)) return fail(400, "INVALID_INPUT", "Send { readings: [...] }");
    return ok(await ingestReadings(body.readings as Parameters<typeof ingestReadings>[0]));
  } catch (error) {
    return failFrom(error, "INGEST_FAILED");
  }
}
