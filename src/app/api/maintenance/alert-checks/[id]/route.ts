import { NextRequest, NextResponse } from "next/server";
import { alertCheckMachine, recordAlertCheck } from "@/server/services/maintenance-types-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";
import { currentUser, fail, signedOut } from "../../pms/_respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/maintenance/alert-checks/:id { result: "fine" | "problem" | null, note?, title? } → the check (a problem raises a repair request). */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const userId = await currentUser(request);
    if (!userId) return signedOut();
    const id = Number((await params).id);
    requireMachine(await requestScope(request), await alertCheckMachine(id));
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({ data: await recordAlertCheck(id, body, userId) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "ALERT_CHECK_ERROR", "Failed to record the check");
  }
}
