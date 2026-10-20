import type { NextRequest } from "next/server";
import { canAdminister, fail, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { draftProblems, setFileResult } from "@/server/services/onboarding-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/onboarding/:id/files/:fileId/result { status: "processed" | "failed", note?, result? }
 * Document: result = extract.json (pdf-extract skill), merged into the draft.
 * Image: result = { diagramType } of the drawing made and saved in `diagrams`.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { status: "processed" | "failed"; note?: string; result?: unknown } | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send { status, note?, result? } as JSON");
    const { id, fileId } = await params;
    const pkg = await setFileResult(id, Number(fileId), body);
    return ok({ ...pkg, problems: draftProblems(pkg.draft) });
  } catch (error) {
    return failFrom(error, "ONBOARDING_RESULT_FAILED");
  }
}
