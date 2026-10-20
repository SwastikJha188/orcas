import type { NextRequest } from "next/server";
import { failFrom, numParam, ok, timeParam, requestScope } from "@/app/api/_lib/respond";
import { requireMeasurement } from "@/server/services/access-service";
import { measurementReadings } from "@/server/services/monitoring-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/measurements/:id/readings?from&to[&bucket=seconds] → raw readings, or bucketed summaries. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireMeasurement(await requestScope(request), decodeURIComponent((await params).id));
    const to = timeParam(request, "to") ?? new Date();
    const from = timeParam(request, "from") ?? new Date(to.getTime() - 3_600_000);
    const bucket = numParam(request, "bucket", 0);
    return ok(await measurementReadings(decodeURIComponent((await params).id), from, to, bucket || null));
  } catch (error) {
    return failFrom(error, "READINGS_FAILED");
  }
}
