import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionUser } from "@/server/services/auth-service";
import { MaintenanceInputError, getChecklist, recordInspection, undoInspection } from "@/server/services/maintenance-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(error: unknown, code: string, fallback: string) {
  const bad = error instanceof MaintenanceInputError;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: { code: bad ? "INVALID_INPUT" : code, message } }, { status: bad ? 400 : 500 });
}

/** GET /api/maintenance?machineId=&kind=equipment|sensor → checklist + recorded results. */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const machineId = sp.get("machineId");
    if (!machineId) throw new MaintenanceInputError("machineId is required");
    return NextResponse.json({ data: await getChecklist(machineId, sp.get("kind")) });
  } catch (error) {
    return fail(error, "MAINTENANCE_ERROR", "Failed to load the maintenance checklist");
  }
}

/** POST /api/maintenance { machineId, kind, taskId, result, note } → the recorded inspection. */
export async function POST(request: NextRequest) {
  try {
    const userId = await sessionUser(request.cookies.get(SESSION_COOKIE)?.value);
    if (!userId) return NextResponse.json({ error: { code: "NOT_SIGNED_IN", message: "Sign in to record inspections." } }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({ data: await recordInspection(body, userId) }, { status: 201 });
  } catch (error) {
    return fail(error, "MAINTENANCE_RECORD_ERROR", "Failed to record the inspection");
  }
}

/** DELETE /api/maintenance?recordId= → takes back a Pass / NA tick. */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await sessionUser(request.cookies.get(SESSION_COOKIE)?.value);
    if (!userId) return NextResponse.json({ error: { code: "NOT_SIGNED_IN", message: "Sign in to change inspections." } }, { status: 401 });
    await undoInspection(Number(request.nextUrl.searchParams.get("recordId")));
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return fail(error, "MAINTENANCE_UNDO_ERROR", "Failed to take back the result");
  }
}
