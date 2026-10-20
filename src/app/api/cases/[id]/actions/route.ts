import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requireCase } from "@/server/services/access-service";
import { closeCase, getCase, reopenCase, verifyRecovery } from "@/server/services/case-service";

export const runtime = "nodejs";

/** POST /api/cases/:id/actions { action: "verify" | "close" | "reopen", note? } */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number((await params).id);
    await requireCase(await requestScope(request), id);
    const body = ((await request.json().catch(() => null)) as Record<string, unknown>) ?? {};
    if (body.action === "verify") await verifyRecovery(id, body, user);
    else if (body.action === "close") await closeCase(id, body, user);
    else if (body.action === "reopen") await reopenCase(id, user);
    else return fail(400, "INVALID_INPUT", 'action must be "verify", "close" or "reopen"');
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "CASE_ACTION_FAILED");
  }
}
