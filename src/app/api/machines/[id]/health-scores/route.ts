import type { NextRequest } from "next/server";
import { failFrom, ok, timeParam, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";
import { machineHealthHistory } from "@/server/services/monitoring-service";
import { setting } from "@/server/monitoring/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/machines/:id/health-scores?from → the Machine Health Index the server evaluation stored. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMachine(await requestScope(request), decodeURIComponent((await params).id));
    const from = timeParam(request, "from") ?? new Date(Date.now() - (await setting("health.sample_keep_h")) * 3_600_000);
    return ok(await machineHealthHistory(decodeURIComponent((await params).id), from));
  } catch (error) {
    return failFrom(error, "HEALTH_HISTORY_FAILED");
  }
}
