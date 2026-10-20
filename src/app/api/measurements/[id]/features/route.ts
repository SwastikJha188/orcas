import type { NextRequest } from "next/server";
import { failFrom, ok, timeParam, requestScope } from "@/app/api/_lib/respond";
import { requireMeasurement } from "@/server/services/access-service";
import { measurementFeatures } from "@/server/services/monitoring-service";
import { setting } from "@/server/monitoring/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/measurements/:id/features?from&to → latest, min, max, mean, σ, RMS, peak, crest, change and rate over the window. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireMeasurement(await requestScope(request), decodeURIComponent((await params).id));
    const to = timeParam(request, "to") ?? new Date();
    const from = timeParam(request, "from") ?? new Date(to.getTime() - (await setting("evaluation.trend_window_h")) * 3_600_000);
    return ok(await measurementFeatures(decodeURIComponent((await params).id), from, to));
  } catch (error) {
    return failFrom(error, "FEATURES_FAILED");
  }
}
