import type { NextRequest } from "next/server";
import { canAdminister, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { redrawImage } from "@/server/services/asset-image-service";
import { processorStatus, startRunFor } from "@/server/onboarding/claude-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/asset-images/:id/redraw { note? } → draws the photo again (with what to change), same drawing kind. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { note?: string } | null;
    const image = await redrawImage(Number((await params).id), body?.note ?? null);
    const subject = image.draftKey ? { kind: "draft" as const, id: image.draftKey } : image.plantId ? { kind: "plant" as const, id: image.plantId } : null;
    const run = subject && processorStatus().available ? await startRunFor(subject, request.nextUrl.origin).catch(() => null) : null;
    return ok({ image, run });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGE_REDRAW_FAILED");
  }
}
