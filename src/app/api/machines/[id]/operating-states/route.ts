import type { NextRequest } from "next/server";
import { failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";
import { listOperatingStates } from "@/server/services/monitoring-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/machines/:id/operating-states → states, how each is recognised, and the recorded state periods. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMachine(await requestScope(request), decodeURIComponent((await params).id));
    return ok(await listOperatingStates(decodeURIComponent((await params).id)));
  } catch (error) {
    return failFrom(error, "OPERATING_STATES_FAILED");
  }
}
