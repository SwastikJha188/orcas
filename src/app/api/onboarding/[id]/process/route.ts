import type { NextRequest } from "next/server";
import { canAdminister, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { latestRun, processorStatus, startRun, stopRun } from "@/server/onboarding/claude-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/onboarding/:id/process → whether Claude Code can read uploads here, and the latest run (state, step, log tail, cost). */
export async function GET(request: NextRequest, { params }: Ctx) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    return ok({ processor: processorStatus(), run: await latestRun((await params).id) });
  } catch (error) {
    return failFrom(error, "ONBOARDING_PROCESS_FAILED");
  }
}

/** POST /api/onboarding/:id/process → starts Claude Code (Haiku) on the waiting uploads; returns the running run (or the one already running). */
export async function POST(request: NextRequest, { params }: Ctx) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    return ok({ processor: processorStatus(), run: await startRun((await params).id, request.nextUrl.origin) });
  } catch (error) {
    return failFrom(error, "ONBOARDING_PROCESS_START_FAILED");
  }
}

/** DELETE /api/onboarding/:id/process → stops the running Claude Code run. */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    return ok({ processor: processorStatus(), run: await stopRun((await params).id) });
  } catch (error) {
    return failFrom(error, "ONBOARDING_PROCESS_STOP_FAILED");
  }
}
