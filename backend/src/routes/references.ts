import { Hono } from "hono";
import { currentUserId, fail, failFrom, ok } from "@backend/http";
import { setReferenceStatus } from "@backend/services/monitoring-service";

/** /api/references */
export const references = new Hono();


references.patch("/:id", async (c) => {
  const request = c.req.raw;
  try {
    const id = Number(c.req.param().id);
    if (!Number.isInteger(id)) return fail(400, "INVALID_INPUT", "Reference set id must be a number");
    const body = (await request.json().catch(() => null)) as { status?: string } | null;
    if (body?.status !== "accepted" && body?.status !== "retired") return fail(400, "INVALID_INPUT", "status must be accepted or retired");
    const userId = await currentUserId(request);
    if (!userId && process.env.NODE_ENV === "production") return fail(401, "NOT_SIGNED_IN", "Sign in to review references.");
    return ok(await setReferenceStatus(id, body.status, userId));
  } catch (error) {
    return failFrom(error, "REFERENCE_REVIEW_FAILED");
  }
});
