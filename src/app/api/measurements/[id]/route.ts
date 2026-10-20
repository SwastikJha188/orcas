import type { NextRequest } from "next/server";
import { failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requireMeasurement } from "@/server/services/access-service";
import { getMeasurement } from "@/server/services/monitoring-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireMeasurement(await requestScope(request), decodeURIComponent((await params).id));
    return ok(await getMeasurement(decodeURIComponent((await params).id)));
  } catch (error) {
    return failFrom(error, "MEASUREMENT_FAILED");
  }
}
