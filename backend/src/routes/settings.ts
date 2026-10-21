import { Hono } from "hono";
import { canAdminister, fail, failFrom, forbidden, ok } from "@backend/http";
import { listSettings, updateSetting } from "@backend/monitoring/settings";

/** /api/settings */
export const settings = new Hono();


settings.get("/", async () => {
  try {
    return ok(await listSettings());
  } catch (error) {
    return failFrom(error, "SETTINGS_FAILED");
  }
});

settings.patch("/", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { key?: string; value?: number } | null;
    if (!body?.key || typeof body.value !== "number" || !Number.isFinite(body.value)) return fail(400, "INVALID_INPUT", "Send { key, value }");
    await updateSetting(body.key, body.value);
    return ok(await listSettings());
  } catch (error) {
    return failFrom(error, "SETTINGS_UPDATE_FAILED");
  }
});
