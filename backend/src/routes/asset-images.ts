import { Hono } from "hono";
import { canAdminister, fail, failFrom, forbidden, ok } from "@backend/http";
import { latestRunFor, processorStatus, startRunFor, stopRunFor, type RunSubject } from "@backend/onboarding/claude-runner";
import { addDraftImage, addImage, attachDraft, deleteDraft, deleteImage, imageContent, listDraft, listImages, redrawImage, setImageResult, waitingForDraft, waitingForDrawing } from "@backend/services/asset-image-service";

/** /api/asset-images */
export const assetImages = new Hono();

/** ?plantId=… (an existing plant's photos) or ?draftKey=… (an unsaved form's photos). */
const subjectOf = (request: Request): RunSubject | null => {
  const p = new URL(request.url).searchParams;
  const draftKey = p.get("draftKey");
  const plantId = p.get("plantId");
  return draftKey ? { kind: "draft", id: draftKey } : plantId ? { kind: "plant", id: plantId } : null;
};

/** Starts Claude Code (Haiku) on what waits, when it can run here and is not already running. */
async function kick(subject: RunSubject, origin: string) {
  let run = await latestRunFor(subject);
  if (processorStatus().available && run?.status !== "running") run = await startRunFor(subject, origin).catch(() => run);
  return run;
}
assetImages.get("/", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const p = new URL(request.url).searchParams;
    const draftKey = p.get("draftKey");
    const plantId = p.get("plantId");
    if (draftKey) return ok({ images: await listDraft(draftKey), processor: processorStatus(), run: await latestRunFor({ kind: "draft", id: draftKey }) });
    if (!plantId) return fail(400, "INVALID_INPUT", "plantId or draftKey is required");
    return ok({ images: await listImages(plantId), processor: processorStatus(), run: await latestRunFor({ kind: "plant", id: plantId }) });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGES_FAILED");
  }
});

assetImages.post("/", async (c) => {
  const request = c.req.raw;
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
      return ok({ image, run: await kick({ kind: "draft", id: draftKey }, new URL(request.url).origin) }, { status: 201 });
    }
    const plantId = str("plantId");
    if (!plantId) return fail(400, "INVALID_INPUT", "plantId (or draftKey) is required");
    const image = await addImage({ ...base, plantId, machineId: str("machineId") });
    return ok({ image, run: await kick({ kind: "plant", id: plantId }, new URL(request.url).origin) }, { status: 201 });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGE_UPLOAD_FAILED");
  }
});

assetImages.delete("/", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const draftKey = new URL(request.url).searchParams.get("draftKey");
    if (!draftKey) return fail(400, "INVALID_INPUT", "draftKey is required");
    await stopRunFor({ kind: "draft", id: draftKey }).catch(() => null);
    await deleteDraft(draftKey);
    return ok({ deleted: true });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGES_DRAFT_DELETE_FAILED");
  }
});

assetImages.post("/attach", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { draftKey?: string; plantId?: string; machineId?: string | null } | null;
    if (!body?.draftKey || !body.plantId) return fail(400, "INVALID_INPUT", "Send { draftKey, plantId, machineId? }");
    return ok(await attachDraft(body.draftKey, body.plantId, body.machineId ?? null));
  } catch (error) {
    return failFrom(error, "ASSET_IMAGES_ATTACH_FAILED");
  }
});

assetImages.post("/process", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  const subject = subjectOf(request);
  if (!subject) return fail(400, "INVALID_INPUT", "plantId or draftKey is required");
  try {
    return ok({ processor: processorStatus(), run: await startRunFor(subject, new URL(request.url).origin) });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGES_PROCESS_FAILED");
  }
});

assetImages.delete("/process", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  const subject = subjectOf(request);
  if (!subject) return fail(400, "INVALID_INPUT", "plantId or draftKey is required");
  try {
    return ok({ processor: processorStatus(), run: await stopRunFor(subject) });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGES_STOP_FAILED");
  }
});

assetImages.get("/waiting", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const draftKey = new URL(request.url).searchParams.get("draftKey");
    if (draftKey) return ok(await waitingForDraft(draftKey));
    const plantId = new URL(request.url).searchParams.get("plantId");
    if (!plantId) return fail(400, "INVALID_INPUT", "plantId or draftKey is required");
    return ok(await waitingForDrawing(plantId));
  } catch (error) {
    return failFrom(error, "ASSET_IMAGES_WAITING_FAILED");
  }
});

assetImages.get("/:id", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const f = await imageContent(Number(c.req.param().id));
    return new Response(new Uint8Array(f.bytes), {
      headers: {
        "Content-Type": f.mime,
        "Content-Disposition": `inline; filename="${f.fileName.replace(/["\\\r\n]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGE_FAILED");
  }
});

assetImages.delete("/:id", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    await deleteImage(Number(c.req.param().id));
    return ok({ deleted: true });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGE_DELETE_FAILED");
  }
});

assetImages.post("/:id/redraw", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { note?: string } | null;
    const image = await redrawImage(Number(c.req.param().id), body?.note ?? null);
    const subject = image.draftKey ? { kind: "draft" as const, id: image.draftKey } : image.plantId ? { kind: "plant" as const, id: image.plantId } : null;
    const run = subject && processorStatus().available ? await startRunFor(subject, new URL(request.url).origin).catch(() => null) : null;
    return ok({ image, run });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGE_REDRAW_FAILED");
  }
});

assetImages.post("/:id/result", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { status: "processed" | "failed"; diagramType?: string; note?: string } | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send { status, diagramType?, note? } as JSON");
    return ok(await setImageResult(Number(c.req.param().id), body));
  } catch (error) {
    return failFrom(error, "ASSET_IMAGE_RESULT_FAILED");
  }
});
