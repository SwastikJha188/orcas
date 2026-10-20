import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok } from "@/app/api/_lib/respond";
import { setReferenceStatus } from "@/server/services/monitoring-service";

export const runtime = "nodejs";

/** PATCH /api/references/:id { status: "accepted" | "retired" } → review a reference set. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    if (!Number.isInteger(id)) return fail(400, "INVALID_INPUT", "Reference set id must be a number");
    const body = (await request.json().catch(() => null)) as { status?: string } | null;
    if (body?.status !== "accepted" && body?.status !== "retired") return fail(400, "INVALID_INPUT", "status must be accepted or retired");
    const userId = await currentUserId(request);
    if (!userId && process.env.NODE_ENV === "production") return fail(401, "NOT_SIGNED_IN", "Sign in to review references.");
    return ok(await setReferenceStatus(id, body.status, userId));
  } catch (error) {
    return failFrom(error, "REFERENCE_REVIEW_FAILED");
  }
}
