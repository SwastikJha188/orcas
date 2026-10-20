import type { NextRequest } from "next/server";
import { fail, failFrom, numParam, ok, requestScope, timeParam } from "@/app/api/_lib/respond";
import { singlePlant } from "@/server/services/access-service";
import { listFindings } from "@/server/services/monitoring-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/findings?machineId|plantId&status=open|cleared|all&since&limit → findings with their evidence and investigation record. */
export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const status = (p.get("status") ?? "open") as "open" | "cleared" | "all";
    if (!["open", "cleared", "all"].includes(status)) return fail(400, "INVALID_INPUT", "status must be open, cleared or all");
    const machineId = p.get("machineId") ?? undefined;
    const plantId = singlePlant(await requestScope(request), p.get("plantId"), machineId) ?? undefined;
    return ok(
      await listFindings({
        machineId,
        plantId,
        status,
        since: timeParam(request, "since"),
        limit: numParam(request, "limit", 200),
      }),
    );
  } catch (error) {
    return failFrom(error, "FINDINGS_FAILED");
  }
}
