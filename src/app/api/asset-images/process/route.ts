import type { NextRequest } from "next/server";
import { canAdminister, fail, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { processorStatus, startRunFor, stopRunFor, type RunSubject } from "@/server/onboarding/claude-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ?plantId=… (an existing plant's photos) or ?draftKey=… (an unsaved form's photos). */
const subjectOf = (request: NextRequest): RunSubject | null => {
  const p = request.nextUrl.searchParams;
  const draftKey = p.get("draftKey");
  const plantId = p.get("plantId");
  return draftKey ? { kind: "draft", id: draftKey } : plantId ? { kind: "plant", id: plantId } : null;
};

/** POST /api/asset-images/process?plantId=… | ?draftKey=… → starts Claude Code (Haiku) on the waiting photos. */
export async function POST(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  const subject = subjectOf(request);
  if (!subject) return fail(400, "INVALID_INPUT", "plantId or draftKey is required");
  try {
    return ok({ processor: processorStatus(), run: await startRunFor(subject, request.nextUrl.origin) });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGES_PROCESS_FAILED");
  }
}

/** DELETE /api/asset-images/process?plantId=… | ?draftKey=… → stops the running drawing run. */
export async function DELETE(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  const subject = subjectOf(request);
  if (!subject) return fail(400, "INVALID_INPUT", "plantId or draftKey is required");
  try {
    return ok({ processor: processorStatus(), run: await stopRunFor(subject) });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGES_STOP_FAILED");
  }
}
