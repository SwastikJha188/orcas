import { NextRequest, NextResponse } from "next/server";
import { HierarchyError, setPlantTimeZone } from "@/server/services/industrial-service";
import type { ApiFailure, ApiSuccess } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function fail(status: number, code: string, message: string) {
  const body: ApiFailure = { error: { code, message } };
  return NextResponse.json(body, { status });
}

// PATCH { timeZone: "Africa/Lusaka" | null } — a plant's (site's) time zone.
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_JSON", "Request body must be JSON.");
  }
  const tz = (body as { timeZone?: unknown } | null)?.timeZone;
  if (tz !== null && (typeof tz !== "string" || !tz.trim())) return fail(400, "INVALID_TIME_ZONE", "timeZone must be an IANA zone name or null.");
  try {
    const data = await setPlantTimeZone(id, tz === null ? null : tz.trim());
    const res: ApiSuccess<typeof data> = { data };
    return NextResponse.json(res);
  } catch (err) {
    if (err instanceof HierarchyError) return fail(err.status, err.code, err.message);
    return fail(500, "HIERARCHY_UPDATE_ERROR", err instanceof Error ? err.message : "Could not save the time zone.");
  }
}
