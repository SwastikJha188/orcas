import { Hono } from "hono";
import { currentUserId, fail, failFrom, ok } from "@backend/http";
import { ingestReadings } from "@backend/services/monitoring-service";

/** /api/readings */
export const readings = new Hono();


readings.post("/", async (c) => {
  const request = c.req.raw;
  try {
    const key = process.env.ULTRON_INGEST_KEY;
    const keyOk = Boolean(key) && request.headers.get("x-ultron-ingest-key") === key;
    if (!keyOk && !(await currentUserId(request)) && process.env.NODE_ENV === "production") {
      return fail(401, "NOT_AUTHORISED", "Send a session or the ingest key.");
    }
    const body = (await request.json().catch(() => null)) as { readings?: unknown } | null;
    if (!body || !Array.isArray(body.readings)) return fail(400, "INVALID_INPUT", "Send { readings: [...] }");
    return ok(await ingestReadings(body.readings as Parameters<typeof ingestReadings>[0]));
  } catch (error) {
    return failFrom(error, "INGEST_FAILED");
  }
});
