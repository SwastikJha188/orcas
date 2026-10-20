import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, numParam, ok, timeParam, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";
import { createEvent, listEvents } from "@/server/services/monitoring-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/machines/:id/events?from&limit → starts, stops, alarms, measurement changes, inspections, maintenance. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMachine(await requestScope(request), decodeURIComponent((await params).id));
    return ok(await listEvents({ machineId: decodeURIComponent((await params).id), from: timeParam(request, "from"), limit: numParam(request, "limit", 200) }));
  } catch (error) {
    return failFrom(error, "EVENTS_FAILED");
  }
}

/** POST /api/machines/:id/events { type, title, description?, severity?, occurredAt?, measurementId?, source? } */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = (await request.json().catch(() => null)) as Parameters<typeof createEvent>[1] | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send a JSON object");
    requireMachine(await requestScope(request), decodeURIComponent((await params).id));
    return ok(await createEvent(decodeURIComponent((await params).id), body, await currentUserId(request)), { status: 201 });
  } catch (error) {
    return failFrom(error, "EVENT_CREATE_FAILED");
  }
}
