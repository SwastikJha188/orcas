import type { NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requireMachine, singlePlant } from "@/server/services/access-service";
import { createCase, listCases } from "@/server/services/case-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/cases[?plantId][&machineId][&ruleCode] → problem cases with counts per stage. */
export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const plantId = singlePlant(await requestScope(request), p.get("plantId"), p.get("machineId"));
    return ok(await listCases({ plantId, machineId: p.get("machineId"), ruleCode: p.get("ruleCode") }));
  } catch (error) {
    return failFrom(error, "CASES_FAILED");
  }
}

/** POST /api/cases { machineId, partId?, title, observation, ownerUserId?, priority?, runningMode?, runningNote?, ruleCode?, guideId?, measurementIds? } → { id } */
export async function POST(request: NextRequest) {
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to start a case.");
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send the case as JSON");
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    return ok({ id: await createCase(body, user) });
  } catch (error) {
    return failFrom(error, "CASE_CREATE_FAILED");
  }
}
