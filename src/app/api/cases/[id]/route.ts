import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requireCase } from "@/server/services/access-service";
import { getCase, updateCase } from "@/server/services/case-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/cases/:id → the whole case. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireCase(await requestScope(request), Number((await params).id));
    return ok(await getCase(Number((await params).id)));
  } catch (error) {
    return failFrom(error, "CASE_FAILED");
  }
}

/** PATCH /api/cases/:id { title?, observation?, priority?, ownerUserId?, partId?, runningMode?, runningNote?, assessment?, assessmentNote?, nextAction?, stage? } */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number((await params).id);
    await requireCase(await requestScope(request), id);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send the changes as JSON");
    await updateCase(id, body, user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "CASE_UPDATE_FAILED");
  }
}
