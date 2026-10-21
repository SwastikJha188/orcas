import { Hono } from "hono";
import { accessFail, requestScope } from "@backend/http";
import { plantFilter, scopedTree } from "@backend/services/access-service";
import { HierarchyError, getPlantHierarchy, setPlantTimeZone } from "@backend/services/industrial-service";
import { type ApiFailure, type ApiSuccess } from "@shared/types/api";

/** /api/hierarchy */
export const hierarchy = new Hono();

function fail(status: number, code: string, message: string) {
  const body: ApiFailure = { error: { code, message } };
  return Response.json(body, { status });
}
hierarchy.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const plantId = new URL(request.url).searchParams.get("plantId") || undefined;
    const scope = await requestScope(request);
    const plants = plantFilter(scope, plantId);
    const data = scopedTree(scope, (await getPlantHierarchy(plantId)).filter((p) => !plants || plants.includes(p.id)));
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load plant hierarchy";
    return Response.json(
      { error: { code: "HIERARCHY_FETCH_ERROR", message } },
      { status: 500 }
    );
  }
});

hierarchy.patch("/:id", async (c) => {
  const request = c.req.raw;
  const { id } = c.req.param();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_JSON", "Request body must be JSON.");
  }
  const tz = (body as { timeZone?: unknown } | null)?.timeZone;
  if (tz !== null && (typeof tz !== "string" || !tz.trim())) return fail(400, "INVALID_TIME_ZONE", "timeZone must be an IANA zone name or null.");
  try {
    const data = await setPlantTimeZone(id, tz === null ? null : tz.trim());
    const res: ApiSuccess<typeof data> = { data };
    return Response.json(res);
  } catch (err) {
    if (err instanceof HierarchyError) return fail(err.status, err.code, err.message);
    return fail(500, "HIERARCHY_UPDATE_ERROR", err instanceof Error ? err.message : "Could not save the time zone.");
  }
});
