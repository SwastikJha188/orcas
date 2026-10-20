import { NextRequest, NextResponse } from "next/server";
import { PredictionInputError, parseOutcome, resolvePrediction } from "@/server/services/predictions-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachineRow } from "@/server/services/access-service";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireMachineRow(await requestScope(request), "ai_predictions", id, "Prediction");
    const body = await request.json().catch(() => null);
    const data = await resolvePrediction(id, parseOutcome(body));
    if (!data) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Prediction not found" } }, { status: 404 });
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    if (error instanceof PredictionInputError) {
      return NextResponse.json({ error: { code: "INVALID_INPUT", message: error.message } }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to resolve prediction";
    return NextResponse.json({ error: { code: "PREDICTION_UPDATE_ERROR", message } }, { status: 500 });
  }
}
