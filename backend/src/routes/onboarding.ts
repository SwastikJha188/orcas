import { Hono } from "hono";
import { canAdminister, currentUserId, fail, failFrom, forbidden, ok } from "@backend/http";
import { latestRun, processorStatus, startRun, stopRun } from "@backend/onboarding/claude-runner";
import { addFile, commitPackage, createPackage, deleteFile, deletePackage, draftProblems, draftWorkbook, fileContent, getPackage, importDraftWorkbook, listPackages, onboardingReference, saveDraft, setFileResult } from "@backend/services/onboarding-service";

/** /api/onboarding */
export const onboarding = new Hono();


onboarding.get("/", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    return ok(await listPackages());
  } catch (error) {
    return failFrom(error, "ONBOARDING_LIST_FAILED");
  }
});

onboarding.post("/", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { name?: string } | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send { name } as JSON");
    return ok(await createPackage(body.name ?? "", await currentUserId(request)), { status: 201 });
  } catch (error) {
    return failFrom(error, "ONBOARDING_CREATE_FAILED");
  }
});

onboarding.get("/reference", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    return ok(await onboardingReference());
  } catch (error) {
    return failFrom(error, "ONBOARDING_REFERENCE_FAILED");
  }
});

onboarding.get("/:id", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const pkg = await getPackage(c.req.param().id);
    return ok({ ...pkg, problems: draftProblems(pkg.draft) });
  } catch (error) {
    return failFrom(error, "ONBOARDING_FAILED");
  }
});

onboarding.put("/:id", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { draft?: unknown } | null;
    if (!body?.draft) return fail(400, "INVALID_INPUT", "Send { draft } as JSON");
    const pkg = await saveDraft(c.req.param().id, body.draft);
    return ok({ ...pkg, problems: draftProblems(pkg.draft) });
  } catch (error) {
    return failFrom(error, "ONBOARDING_SAVE_FAILED");
  }
});

onboarding.delete("/:id", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    await deletePackage(c.req.param().id);
    return ok({ deleted: true });
  } catch (error) {
    return failFrom(error, "ONBOARDING_DELETE_FAILED");
  }
});

onboarding.post("/:id/commit", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { dryRun?: boolean } | null;
    return ok(await commitPackage(c.req.param().id, Boolean(body?.dryRun)));
  } catch (error) {
    return failFrom(error, "ONBOARDING_COMMIT_FAILED");
  }
});

onboarding.get("/:id/excel", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const f = await draftWorkbook(c.req.param().id);
    return new Response(new Uint8Array(f.bytes), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${f.fileName}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failFrom(error, "ONBOARDING_EXCEL_FAILED");
  }
});

/** Reads a filled-in Excel format into the draft sent with it (field: draft, JSON); answers { draft, summary } and saves nothing. */
onboarding.post("/:id/excel", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!form || !(file instanceof File)) return fail(400, "INVALID_INPUT", "Send the workbook as multipart form data (field: file)");
    const draftText = form.get("draft");
    let draft: unknown = null;
    if (typeof draftText === "string" && draftText) {
      try {
        draft = JSON.parse(draftText);
      } catch {
        return fail(400, "INVALID_INPUT", "The draft field is not JSON");
      }
    }
    return ok(await importDraftWorkbook(c.req.param().id, Buffer.from(await file.arrayBuffer()), draft));
  } catch (error) {
    return failFrom(error, "ONBOARDING_EXCEL_IMPORT_FAILED");
  }
});

onboarding.post("/:id/files", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!form || !(file instanceof File)) return fail(400, "INVALID_INPUT", "Send the file as multipart form data (field: file)");
    const machineKey = form.get("machineKey") || form.get("areaKey");
    return ok(
      await addFile(c.req.param().id, {
        fileName: file.name,
        mime: file.type,
        bytes: Buffer.from(await file.arrayBuffer()),
        machineKey: typeof machineKey === "string" && machineKey ? machineKey : null,
      }),
      { status: 201 },
    );
  } catch (error) {
    return failFrom(error, "ONBOARDING_UPLOAD_FAILED");
  }
});

onboarding.get("/:id/process", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    return ok({ processor: processorStatus(), run: await latestRun(c.req.param().id) });
  } catch (error) {
    return failFrom(error, "ONBOARDING_PROCESS_FAILED");
  }
});

onboarding.post("/:id/process", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    return ok({ processor: processorStatus(), run: await startRun(c.req.param().id, new URL(request.url).origin) });
  } catch (error) {
    return failFrom(error, "ONBOARDING_PROCESS_START_FAILED");
  }
});

onboarding.delete("/:id/process", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    return ok({ processor: processorStatus(), run: await stopRun(c.req.param().id) });
  } catch (error) {
    return failFrom(error, "ONBOARDING_PROCESS_STOP_FAILED");
  }
});

onboarding.get("/:id/files/:fileId", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const { id, fileId } = c.req.param();
    const f = await fileContent(id, Number(fileId));
    return new Response(new Uint8Array(f.bytes), {
      headers: {
        "Content-Type": f.mime,
        "Content-Disposition": `attachment; filename="${f.fileName.replace(/["\\\r\n]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failFrom(error, "ONBOARDING_FILE_FAILED");
  }
});

onboarding.delete("/:id/files/:fileId", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const { id, fileId } = c.req.param();
    await deleteFile(id, Number(fileId));
    return ok({ deleted: true });
  } catch (error) {
    return failFrom(error, "ONBOARDING_FILE_DELETE_FAILED");
  }
});

onboarding.post("/:id/files/:fileId/result", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { status: "processed" | "failed"; note?: string; result?: unknown } | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send { status, note?, result? } as JSON");
    const { id, fileId } = c.req.param();
    const pkg = await setFileResult(id, Number(fileId), body);
    return ok({ ...pkg, problems: draftProblems(pkg.draft) });
  } catch (error) {
    return failFrom(error, "ONBOARDING_RESULT_FAILED");
  }
});
