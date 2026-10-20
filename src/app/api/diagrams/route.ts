import type { NextRequest } from "next/server";
import { canAdminister, fail, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { getDiagram, listDiagrams, saveDiagram, type DiagramKind } from "@/server/services/diagram-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/diagrams                       → every stored drawing (no data)
 * GET /api/diagrams?type=<kind>&kind=2d|3d → one drawing with its data (404 when none)
 */
export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const type = p.get("type");
    if (!type) return ok(await listDiagrams());
    const kind = p.get("kind");
    if (kind !== "2d" && kind !== "3d") return fail(400, "INVALID_INPUT", 'kind must be "2d" or "3d"');
    return ok(await getDiagram(type, kind));
  } catch (error) {
    return failFrom(error, "DIAGRAMS_FAILED");
  }
}

/** POST /api/diagrams { diagramType, kind, name, data, source? } → saved drawing (no data). */
export async function POST(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const body = (await request.json().catch(() => null)) as { diagramType: string; kind: DiagramKind; name: string; data: unknown; source?: string } | null;
    if (!body) return fail(400, "INVALID_INPUT", "Send the drawing as JSON");
    return ok(await saveDiagram(body), { status: 201 });
  } catch (error) {
    return failFrom(error, "DIAGRAM_SAVE_FAILED");
  }
}
