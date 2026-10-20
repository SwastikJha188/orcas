import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";
import { deriveReferenceSet, listReferenceSets } from "@/server/services/monitoring-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/machines/:id/references → reference sets (draft, accepted, retired) with their values. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMachine(await requestScope(request), decodeURIComponent((await params).id));
    return ok(await listReferenceSets(decodeURIComponent((await params).id)));
  } catch (error) {
    return failFrom(error, "REFERENCES_FAILED");
  }
}

/** POST /api/machines/:id/references { stateId, from, to, name?, basis? } → derive a draft reference set from stored readings. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = (await request.json().catch(() => null)) as Parameters<typeof deriveReferenceSet>[1] | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send a JSON object");
    requireMachine(await requestScope(request), decodeURIComponent((await params).id));
    return ok(await deriveReferenceSet(decodeURIComponent((await params).id), body, await currentUserId(request)), { status: 201 });
  } catch (error) {
    return failFrom(error, "REFERENCE_DERIVE_FAILED");
  }
}
