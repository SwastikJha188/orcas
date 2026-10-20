import type { NextRequest } from "next/server";
import { failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { singlePlant } from "@/server/services/access-service";
import { listRequests } from "@/server/services/case-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/cases/requests[?plantId] → maintenance requests made from cases, with their work order status. */
export async function GET(request: NextRequest) {
  try {
    return ok(await listRequests({ plantId: singlePlant(await requestScope(request), request.nextUrl.searchParams.get("plantId")) }));
  } catch (error) {
    return failFrom(error, "REQUESTS_FAILED");
  }
}
