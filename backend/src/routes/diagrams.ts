import { Hono } from "hono";
import { canAdminister, fail, failFrom, forbidden, ok } from "@backend/http";
import { getDiagram, listDiagrams, saveDiagram, type DiagramKind } from "@backend/services/diagram-service";

/** /api/diagrams */
export const diagrams = new Hono();


diagrams.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const p = new URL(request.url).searchParams;
    const type = p.get("type");
    if (!type) return ok(await listDiagrams());
    const kind = p.get("kind");
    if (kind !== "2d" && kind !== "3d") return fail(400, "INVALID_INPUT", 'kind must be "2d" or "3d"');
    return ok(await getDiagram(type, kind));
  } catch (error) {
    return failFrom(error, "DIAGRAMS_FAILED");
  }
});

diagrams.post("/", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { diagramType: string; kind: DiagramKind; name: string; data: unknown; source?: string } | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send the drawing as JSON");
    return ok(await saveDiagram(body), { status: 201 });
  } catch (error) {
    return failFrom(error, "DIAGRAM_SAVE_FAILED");
  }
});
