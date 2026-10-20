import type { NextRequest } from "next/server";
import { canAdminister, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { commitPackage } from "@/server/services/onboarding-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/onboarding/:id/commit [{ dryRun: true }] → writes the draft into plants, areas, users, machines, parts, sensors, ranges and limits (dry run: checks it all, writes nothing). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { dryRun?: boolean } | null;
    return ok(await commitPackage((await params).id, Boolean(body?.dryRun)));
  } catch (error) {
    return failFrom(error, "ONBOARDING_COMMIT_FAILED");
  }
}
