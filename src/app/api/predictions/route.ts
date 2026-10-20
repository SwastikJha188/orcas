import { NextRequest, NextResponse } from "next/server";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";
import {
  PredictionInputError,
  createPrediction,
  listPredictions,
  parseNewPrediction,
  predictionStats,
  voidOtherRuns,
} from "@/server/services/predictions-service";

export const runtime = "nodejs";

const fail = (error: unknown, code: string, fallback: string) => {
  if (error instanceof PredictionInputError) {
    return NextResponse.json({ error: { code: "INVALID_INPUT", message: error.message } }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: { code, message } }, { status: 500 });
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId");
    if (!machineId) return NextResponse.json({ error: { code: "INVALID_INPUT", message: "machineId is required" } }, { status: 400 });
    requireMachine(await requestScope(request), machineId);
    const limit = Number(searchParams.get("limit") ?? 200);
    const [items, stats] = await Promise.all([
      listPredictions(machineId, Number.isFinite(limit) ? limit : 200),
      predictionStats(machineId),
    ]);
    return NextResponse.json({ data: { items, stats } });
  } catch (error) {
    return accessFail(error) ?? fail(error, "PREDICTIONS_FETCH_ERROR", "Failed to load predictions");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const input = parseNewPrediction(body);
    requireMachine(await requestScope(request), input.machineId);
    const data = await createPrediction(input);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return accessFail(error) ?? fail(error, "PREDICTION_CREATE_ERROR", "Failed to record prediction");
  }
}

/** Voids open predictions left by earlier simulation runs: `{ machineId, keepRunId }`. */
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { machineId?: string; keepRunId?: string } | null;
    if (!body?.machineId || !body.keepRunId) throw new PredictionInputError("machineId and keepRunId are required");
    requireMachine(await requestScope(request), body.machineId);
    const voided = await voidOtherRuns(body.machineId, body.keepRunId);
    return NextResponse.json({ data: { voided } });
  } catch (error) {
    return accessFail(error) ?? fail(error, "PREDICTION_VOID_ERROR", "Failed to void stale predictions");
  }
}
