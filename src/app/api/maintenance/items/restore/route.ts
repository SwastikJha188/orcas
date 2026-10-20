import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionUser } from "@/server/services/auth-service";
import { MaintenanceInputError, restoreChecklistItem } from "@/server/services/maintenance-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/maintenance/items/restore { machineId, kind, taskId } → puts a removed item back. */
export async function POST(request: NextRequest) {
  try {
    const userId = await sessionUser(request.cookies.get(SESSION_COOKIE)?.value);
    if (!userId) return NextResponse.json({ error: { code: "NOT_SIGNED_IN", message: "Sign in to edit the checklist." } }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    await restoreChecklistItem(body);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const bad = error instanceof MaintenanceInputError;
    const message = error instanceof Error ? error.message : "Failed to restore the item";
    return NextResponse.json({ error: { code: bad ? "INVALID_INPUT" : "MAINTENANCE_ITEM_ERROR", message } }, { status: bad ? 400 : 500 });
  }
}
