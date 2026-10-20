import type { NextRequest } from "next/server";
import { canAdminister, fail, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { setImageResult } from "@/server/services/asset-image-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/asset-images/:id/result { status: "processed", diagramType } | { status: "failed", note } → links the drawing made to the machine or plant. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { status: "processed" | "failed"; diagramType?: string; note?: string } | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send { status, diagramType?, note? } as JSON");
    return ok(await setImageResult(Number((await params).id), body));
  } catch (error) {
    return failFrom(error, "ASSET_IMAGE_RESULT_FAILED");
  }
}
