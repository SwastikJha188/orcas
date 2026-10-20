import type { NextRequest } from "next/server";
import { canAdminister, fail, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { deletePackage, draftProblems, getPackage, saveDraft } from "@/server/services/onboarding-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/onboarding/:id → the onboarding with its draft, files and what still blocks committing it. */
export async function GET(request: NextRequest, { params }: Ctx) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const pkg = await getPackage((await params).id);
    return ok({ ...pkg, problems: draftProblems(pkg.draft) });
  } catch (error) {
    return failFrom(error, "ONBOARDING_FAILED");
  }
}

/** PUT /api/onboarding/:id { draft } → saves the working draft. */
export async function PUT(request: NextRequest, { params }: Ctx) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { draft?: unknown } | null;
    if (!body?.draft) return fail(400, "INVALID_INPUT", "Send { draft } as JSON");
    const pkg = await saveDraft((await params).id, body.draft);
    return ok({ ...pkg, problems: draftProblems(pkg.draft) });
  } catch (error) {
    return failFrom(error, "ONBOARDING_SAVE_FAILED");
  }
}

/** DELETE /api/onboarding/:id → discards an onboarding that is not committed. */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    await deletePackage((await params).id);
    return ok({ deleted: true });
  } catch (error) {
    return failFrom(error, "ONBOARDING_DELETE_FAILED");
  }
}
