import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionUser } from "@/server/services/auth-service";
import { MaintenanceInputError, addChecklistItem, removeChecklistItem } from "@/server/services/maintenance-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(error: unknown, code: string, fallback: string) {
  const bad = error instanceof MaintenanceInputError;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: { code: bad ? "INVALID_INPUT" : code, message } }, { status: bad ? 400 : 500 });
}

const signedOut = () => NextResponse.json({ error: { code: "NOT_SIGNED_IN", message: "Sign in to edit the checklist." } }, { status: 401 });

/** POST /api/maintenance/items { machineId, kind, unitCode, groupNum, route, component, check, pass } → the added item. */
export async function POST(request: NextRequest) {
  try {
    const userId = await sessionUser(request.cookies.get(SESSION_COOKIE)?.value);
    if (!userId) return signedOut();
    const body = (await request.json()) as Record<string, unknown>;
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    return NextResponse.json({ data: await addChecklistItem(body, userId) }, { status: 201 });
  } catch (error) {
    return accessFail(error) ?? fail(error, "MAINTENANCE_ITEM_ERROR", "Failed to add the item");
  }
}

/** DELETE /api/maintenance/items?machineId=&kind=&taskId= → takes the item off this machine's checklist. */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await sessionUser(request.cookies.get(SESSION_COOKIE)?.value);
    if (!userId) return signedOut();
    const sp = request.nextUrl.searchParams;
    requireMachine(await requestScope(request), sp.get("machineId"));
    await removeChecklistItem({ machineId: sp.get("machineId"), kind: sp.get("kind"), taskId: sp.get("taskId") }, userId);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return accessFail(error) ?? fail(error, "MAINTENANCE_ITEM_ERROR", "Failed to remove the item");
  }
}
