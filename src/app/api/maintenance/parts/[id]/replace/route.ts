import { NextRequest, NextResponse } from "next/server";
import { replaceServicePart, servicePartMachine } from "@/server/services/maintenance-types-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";
import { currentUser, fail, signedOut } from "../../../pms/_respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/maintenance/parts/:id/replace { counterH, date?, note?, workOrderId? } → the life starts again. */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const userId = await currentUser(request);
    if (!userId) return signedOut();
    const { id } = await params;
    requireMachine(await requestScope(request), await servicePartMachine(id));
    const body = (await request.json()) as Record<string, unknown>;
    await replaceServicePart(id, body, userId);
    return NextResponse.json({ data: { id } });
  } catch (error) {
    return accessFail(error) ?? fail(error, "PART_REPLACE_ERROR", "Failed to record the replacement");
  }
}
