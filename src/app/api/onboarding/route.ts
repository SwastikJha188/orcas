import type { NextRequest } from "next/server";
import { canAdminister, currentUserId, fail, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { createPackage, listPackages } from "@/server/services/onboarding-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/onboarding → every onboarding (newest first, no draft). */
export async function GET(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    return ok(await listPackages());
  } catch (error) {
    return failFrom(error, "ONBOARDING_LIST_FAILED");
  }
}

/** POST /api/onboarding { name } → a new onboarding with an empty draft. */
export async function POST(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { name?: string } | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send { name } as JSON");
    return ok(await createPackage(body.name ?? "", await currentUserId(request)), { status: 201 });
  } catch (error) {
    return failFrom(error, "ONBOARDING_CREATE_FAILED");
  }
}
