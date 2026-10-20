import { failFrom, ok } from "@/app/api/_lib/respond";
import { listHealthModels } from "@/server/services/monitoring-service";

export const runtime = "nodejs";

/** GET /api/health-models → Machine Health Index models, their parameters and status bands. */
export async function GET() {
  try {
    return ok(await listHealthModels());
  } catch (error) {
    return failFrom(error, "HEALTH_MODELS_FAILED");
  }
}
