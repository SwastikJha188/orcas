import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionUser } from "@/server/services/auth-service";
import { MaintenanceInputError, restoreChecklistItem } from "@/server/services/maintenance-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/maintenance/items/restore { machineId, kind, taskId } → puts a removed item back. */
export async function POST(request: NextRequest) {
  try {
    const userId = await sessionUser(request.cookies.get(SESSION_COOKIE)?.value);
    if (!userId) return NextResponse.json({ error: { code: "NOT_SIGNED_IN", message: "Sign in to edit the checklist." } }, { status: 401 });
    await restoreChecklistItem((await request.json()) as Record<string, unknown>);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    const bad = error instanceof MaintenanceInputError;
    const message = error instanceof Error ? error.message : "Failed to restore the item";
    return NextResponse.json({ error: { code: bad ? "INVALID_INPUT" : "MAINTENANCE_ITEM_ERROR", message } }, { status: bad ? 400 : 500 });
  }
}
