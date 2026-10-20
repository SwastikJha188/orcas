import type { NextRequest } from "next/server";
import { canAdminister, fail, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { attachDraft } from "@/server/services/asset-image-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/asset-images/attach { draftKey, plantId, machineId? } → the form was saved: its photos (and drawings) belong to the new plant / machine. */
export async function POST(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { draftKey?: string; plantId?: string; machineId?: string | null } | null;
    if (!body?.draftKey || !body.plantId) return fail(400, "INVALID_INPUT", "Send { draftKey, plantId, machineId? }");
    return ok(await attachDraft(body.draftKey, body.plantId, body.machineId ?? null));
  } catch (error) {
    return failFrom(error, "ASSET_IMAGES_ATTACH_FAILED");
  }
}
