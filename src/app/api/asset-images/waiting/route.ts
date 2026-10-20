import type { NextRequest } from "next/server";
import { canAdminister, fail, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { waitingForDraft, waitingForDrawing } from "@/server/services/asset-image-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/asset-images/waiting?plantId=… | ?draftKey=… → the photos waiting to be drawn, each with its machine (and sensor tags) or the plant. */
export async function GET(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const draftKey = request.nextUrl.searchParams.get("draftKey");
    if (draftKey) return ok(await waitingForDraft(draftKey));
    const plantId = request.nextUrl.searchParams.get("plantId");
    if (!plantId) return fail(400, "INVALID_INPUT", "plantId or draftKey is required");
    return ok(await waitingForDrawing(plantId));
  } catch (error) {
    return failFrom(error, "ASSET_IMAGES_WAITING_FAILED");
  }
}
