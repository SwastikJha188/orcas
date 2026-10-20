import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requireCase } from "@/server/services/access-service";
import { addCause, getCase, removeCause } from "@/server/services/case-service";

export const runtime = "nodejs";

/** POST /api/cases/:id/causes { text } */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number((await params).id);
    await requireCase(await requestScope(request), id);
    await addCause(id, ((await request.json().catch(() => null)) as Record<string, unknown>) ?? {}, user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "CAUSE_FAILED");
  }
}

/** DELETE /api/cases/:id/causes?causeId= */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number((await params).id);
    await requireCase(await requestScope(request), id);
    await removeCause(id, Number(request.nextUrl.searchParams.get("causeId")), user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "CAUSE_FAILED");
  }
}
