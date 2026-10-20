import type { NextRequest } from "next/server";
import { canAdminister, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { onboardingReference } from "@/server/services/onboarding-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/onboarding/reference → what a sensor can measure (quantities), units and user roles, for the onboarding form. */
export async function GET(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    return ok(await onboardingReference());
  } catch (error) {
    return failFrom(error, "ONBOARDING_REFERENCE_FAILED");
  }
}
