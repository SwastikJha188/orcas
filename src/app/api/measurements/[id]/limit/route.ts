import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok } from "@/app/api/_lib/respond";
import { updateMeasurementLimit } from "@/server/services/monitoring-service";

export const runtime = "nodejs";

/** PATCH /api/measurements/:id/limit → change (or create) the measurement's engineering limit. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await currentUserId(request);
    if (!userId && process.env.NODE_ENV === "production") return fail(401, "NOT_SIGNED_IN", "Sign in to change limits.");
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return fail(400, "INVALID_INPUT", "Send a JSON object");
    return ok(await updateMeasurementLimit(decodeURIComponent((await params).id), body, userId));
  } catch (error) {
    return failFrom(error, "LIMIT_UPDATE_FAILED");
  }
}
