import { NextRequest, NextResponse } from "next/server";
import { transitionWorkOrder, updateWorkOrderDetails } from "@/server/services/pms-service";
import { currentUser, fail, signedOut } from "../../_respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/maintenance/pms/work-orders/:id { to, reason } → validated, audited stage transition. */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const userId = await currentUser(request);
    if (!userId) return signedOut();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({ data: await transitionWorkOrder(Number(id), body, userId) });
  } catch (error) {
    return fail(error, "PMS_TRANSITION_ERROR", "Failed to change the work order");
  }
}

/** PATCH /api/maintenance/pms/work-orders/:id { readiness?, workMode?, plannedStart?, estimateHours?, asFound?, asLeft?, priority?, assignee? } */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const userId = await currentUser(request);
    if (!userId) return signedOut();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({ data: await updateWorkOrderDetails(Number(id), body, userId) });
  } catch (error) {
    return fail(error, "PMS_UPDATE_ERROR", "Failed to update the work order");
  }
}
