import type { NextRequest } from "next/server";
import { failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";
import { machineCondition } from "@/server/services/monitoring-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/machines/:id/condition → operating state, health index, component scores, open findings and data validity. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMachine(await requestScope(request), decodeURIComponent((await params).id));
    return ok(await machineCondition(decodeURIComponent((await params).id)));
  } catch (error) {
    return failFrom(error, "CONDITION_FAILED");
  }
}
