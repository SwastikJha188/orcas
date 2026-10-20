import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok } from "@/app/api/_lib/respond";
import { addInvestigationEntry } from "@/server/services/monitoring-service";

export const runtime = "nodejs";

/**
 * POST /api/findings/:id/entries { kind, body, workOrderId?, suspected? } → adds to the investigation record:
 * observation · inspection · confirmed_cause · corrective_action · verification · note.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    if (!Number.isInteger(id)) return fail(400, "INVALID_INPUT", "Finding id must be a number");
    const body = (await request.json().catch(() => null)) as Parameters<typeof addInvestigationEntry>[1] | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send a JSON object");
    return ok(await addInvestigationEntry(id, body, await currentUserId(request)));
  } catch (error) {
    return failFrom(error, "INVESTIGATION_FAILED");
  }
}
