import { Hono } from "hono";
import { accessFail, requestScope } from "@backend/http";
import { requireMachine, scopedRows } from "@backend/services/access-service";
import { getDiagnosisRecords } from "@backend/services/industrial-service";

/** /api/diagnosis */
export const diagnosis = new Hono();


diagnosis.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || undefined;
    const scope = await requestScope(request);
    requireMachine(scope, machineId);
    const data = scopedRows(scope, await getDiagnosisRecords(machineId));
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load diagnosis records";
    return Response.json(
      { error: { code: "DIAGNOSIS_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
});
