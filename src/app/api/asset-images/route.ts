import type { NextRequest } from "next/server";
import { canAdminister, fail, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { addDraftImage, addImage, deleteDraft, listDraft, listImages } from "@/server/services/asset-image-service";
import { latestRunFor, processorStatus, startRunFor, stopRunFor, type RunSubject } from "@/server/onboarding/claude-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Starts Claude Code (Haiku) on what waits, when it can run here and is not already running. */
async function kick(subject: RunSubject, origin: string) {
  let run = await latestRunFor(subject);
  if (processorStatus().available && run?.status !== "running") run = await startRunFor(subject, origin).catch(() => run);
  return run;
}

/**
 * GET /api/asset-images?plantId=… → the plant's photos (with drawing state), whether Claude Code can draw here, and its latest run.
 * GET /api/asset-images?draftKey=… → the same for the photos of an unsaved Add plant / Add machine form.
 */
export async function GET(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const p = request.nextUrl.searchParams;
    const draftKey = p.get("draftKey");
    const plantId = p.get("plantId");
    if (draftKey) return ok({ images: await listDraft(draftKey), processor: processorStatus(), run: await latestRunFor({ kind: "draft", id: draftKey }) });
    if (!plantId) return fail(400, "INVALID_INPUT", "plantId or draftKey is required");
    return ok({ images: await listImages(plantId), processor: processorStatus(), run: await latestRunFor({ kind: "plant", id: plantId }) });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGES_FAILED");
  }
}

/**
 * POST /api/asset-images (multipart) → stores a photo and starts Claude Code (Haiku) drawing it.
 *   plantId, machineId?                         a photo of an existing plant or machine
 *   draftKey, subject, name?, type?, code?, plantId?   a photo picked in an unsaved form (drawn for a preview)
 */
export async function POST(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const str = (k: string) => {
      const v = form?.get(k);
      return typeof v === "string" && v ? v : null;
    };
    if (!form || !(file instanceof File)) return fail(400, "INVALID_INPUT", "Send multipart form data with the file");
    const base = { fileName: file.name, mime: file.type, bytes: Buffer.from(await file.arrayBuffer()) };
    const draftKey = str("draftKey");
    if (draftKey) {
      const subject = str("subject") === "plant" ? "plant" : "machine";
      const image = await addDraftImage({ ...base, draftKey, subject, name: str("name"), type: str("type"), code: str("code"), plantId: str("plantId") });
      return ok({ image, run: await kick({ kind: "draft", id: draftKey }, request.nextUrl.origin) }, { status: 201 });
    }
    const plantId = str("plantId");
    if (!plantId) return fail(400, "INVALID_INPUT", "plantId (or draftKey) is required");
    const image = await addImage({ ...base, plantId, machineId: str("machineId") });
    return ok({ image, run: await kick({ kind: "plant", id: plantId }, request.nextUrl.origin) }, { status: 201 });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGE_UPLOAD_FAILED");
  }
}

/** DELETE /api/asset-images?draftKey=… → the form was cancelled: stops its drawing run and removes its photos. */
export async function DELETE(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const draftKey = request.nextUrl.searchParams.get("draftKey");
    if (!draftKey) return fail(400, "INVALID_INPUT", "draftKey is required");
    await stopRunFor({ kind: "draft", id: draftKey }).catch(() => null);
    await deleteDraft(draftKey);
    return ok({ deleted: true });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGES_DRAFT_DELETE_FAILED");
  }
}
