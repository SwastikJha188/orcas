import type { NextRequest } from "next/server";
import { canAdminister, fail, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { addFile } from "@/server/services/onboarding-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/onboarding/:id/files (multipart: file, machineKey? | areaKey?) → the stored upload, waiting to be processed. A photo names the machine or area it shows. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!form || !(file instanceof File)) return fail(400, "INVALID_INPUT", "Send the file as multipart form data (field: file)");
    const machineKey = form.get("machineKey") || form.get("areaKey");
    return ok(
      await addFile((await params).id, {
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
}
