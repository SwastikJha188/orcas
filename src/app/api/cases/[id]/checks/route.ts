import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requireCase } from "@/server/services/access-service";
import { addCheck, finishCheck, getCase } from "@/server/services/case-service";

export const runtime = "nodejs";

/** POST /api/cases/:id/checks { kind, detail, causeId?, assigneeUserId? | assigneeText } */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number((await params).id);
    await requireCase(await requestScope(request), id);
    await addCheck(id, ((await request.json().catch(() => null)) as Record<string, unknown>) ?? {}, user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "CHECK_FAILED");
  }
}

/** PATCH /api/cases/:id/checks { checkId, result, note } or { checkId, cancel: true } */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number((await params).id);
    await requireCase(await requestScope(request), id);
    const body = ((await request.json().catch(() => null)) as Record<string, unknown>) ?? {};
    await finishCheck(id, Number(body.checkId), body, user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "CHECK_FAILED");
  }
}
