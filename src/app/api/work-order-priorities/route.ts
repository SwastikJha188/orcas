import { failFrom, ok } from "@/app/api/_lib/respond";
import { listWorkOrderPriorities } from "@/server/services/monitoring-service";

export const runtime = "nodejs";

/** GET /api/work-order-priorities → priorities and their response times. */
export async function GET() {
  try {
    return ok(await listWorkOrderPriorities());
  } catch (error) {
    return failFrom(error, "PRIORITIES_FAILED");
  }
}
