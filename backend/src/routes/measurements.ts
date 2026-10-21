import { Hono } from "hono";
import { currentUserId, fail, failFrom, numParam, ok, requestScope, timeParam } from "@backend/http";
import { setting } from "@backend/monitoring/settings";
import { narrowMachine, requireMachine, requireMeasurement, requirePlant } from "@backend/services/access-service";
import { getMeasurement, listMeasurements, measurementFeatures, measurementReadings, updateMeasurementLimit } from "@backend/services/monitoring-service";

/** /api/measurements */
export const measurements = new Hono();


measurements.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const p = new URL(request.url).searchParams;
    const scope = await requestScope(request);
    const machineId = narrowMachine(scope, p.get("machineId")) ?? undefined;
    const plantId = machineId ? undefined : (p.get("plantId") ?? undefined);
    if (!machineId && !plantId) return ok([]);
    requireMachine(scope, machineId);
    requirePlant(scope, plantId);
    return ok(await listMeasurements({ machineId, plantId }));
  } catch (error) {
    return failFrom(error, "MEASUREMENTS_FAILED");
  }
});

measurements.get("/:id", async (c) => {
  const request = c.req.raw;
  try {
    await requireMeasurement(await requestScope(request), decodeURIComponent(c.req.param().id));
    return ok(await getMeasurement(decodeURIComponent(c.req.param().id)));
  } catch (error) {
    return failFrom(error, "MEASUREMENT_FAILED");
  }
});

measurements.get("/:id/features", async (c) => {
  const request = c.req.raw;
  try {
    await requireMeasurement(await requestScope(request), decodeURIComponent(c.req.param().id));
    const to = timeParam(request, "to") ?? new Date();
    const from = timeParam(request, "from") ?? new Date(to.getTime() - (await setting("evaluation.trend_window_h")) * 3_600_000);
    return ok(await measurementFeatures(decodeURIComponent(c.req.param().id), from, to));
  } catch (error) {
    return failFrom(error, "FEATURES_FAILED");
  }
});

measurements.patch("/:id/limit", async (c) => {
  const request = c.req.raw;
  try {
    const userId = await currentUserId(request);
    if (!userId && process.env.NODE_ENV === "production") return fail(401, "NOT_SIGNED_IN", "Sign in to change limits.");
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return fail(400, "INVALID_INPUT", "Send a JSON object");
    return ok(await updateMeasurementLimit(decodeURIComponent(c.req.param().id), body, userId));
  } catch (error) {
    return failFrom(error, "LIMIT_UPDATE_FAILED");
  }
});

measurements.get("/:id/readings", async (c) => {
  const request = c.req.raw;
  try {
    await requireMeasurement(await requestScope(request), decodeURIComponent(c.req.param().id));
    const to = timeParam(request, "to") ?? new Date();
    const from = timeParam(request, "from") ?? new Date(to.getTime() - 3_600_000);
    const bucket = numParam(request, "bucket", 0);
    return ok(await measurementReadings(decodeURIComponent(c.req.param().id), from, to, bucket || null));
  } catch (error) {
    return failFrom(error, "READINGS_FAILED");
  }
});
