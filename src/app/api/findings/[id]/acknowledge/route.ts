import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok } from "@/app/api/_lib/respond";
import { acknowledgeFinding } from "@/server/services/monitoring-service";

export const runtime = "nodejs";

/** POST /api/findings/:id/acknowledge { note? } → records that the finding was seen. It resolves nothing. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    if (!Number.isInteger(id)) return fail(400, "INVALID_INPUT", "Finding id must be a number");
    const body = (await request.json().catch(() => ({}))) as { note?: string };
    return ok(await acknowledgeFinding(id, await currentUserId(request), body.note?.trim() || null));
  } catch (error) {
    return failFrom(error, "ACK_FAILED");
  }
}
