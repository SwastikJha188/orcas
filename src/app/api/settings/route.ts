import type { NextRequest } from "next/server";
import { canAdminister, fail, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { listSettings, updateSetting } from "@/server/monitoring/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/settings → monitoring pipeline settings. */
export async function GET() {
  try {
    return ok(await listSettings());
  } catch (error) {
    return failFrom(error, "SETTINGS_FAILED");
  }
}

/** PATCH /api/settings { key, value } */
export async function PATCH(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { key?: string; value?: number } | null;
    if (!body?.key || typeof body.value !== "number" || !Number.isFinite(body.value)) return fail(400, "INVALID_INPUT", "Send { key, value }");
    await updateSetting(body.key, body.value);
    return ok(await listSettings());
  } catch (error) {
    return failFrom(error, "SETTINGS_UPDATE_FAILED");
  }
}
