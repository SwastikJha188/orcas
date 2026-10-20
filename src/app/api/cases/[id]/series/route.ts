import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requireCase } from "@/server/services/access-service";
import { getCase, importSeries } from "@/server/services/case-service";

export const runtime = "nodejs";

/** POST /api/cases/:id/series { name, unit, csv } — header timestamp,value,quality; at most 5,000 rows */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number((await params).id);
    await requireCase(await requestScope(request), id);
    await importSeries(id, ((await request.json().catch(() => null)) as Record<string, unknown>) ?? {}, user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "SERIES_FAILED");
  }
}
