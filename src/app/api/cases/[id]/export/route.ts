import { NextResponse, type NextRequest } from "next/server";
import { failFrom, requestScope } from "@/app/api/_lib/respond";
import { requireCase } from "@/server/services/access-service";
import { getCase } from "@/server/services/case-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/cases/:id/export → the whole case as a JSON file to download. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireCase(await requestScope(request), Number((await params).id));
    const c = await getCase(Number((await params).id));
    const { readings, ...rest } = c;
    const body = JSON.stringify({ ...rest, readings: readings.map(({ history, ...r }) => ({ ...r, readingsInLast24h: history.length })) }, null, 2);
    return new NextResponse(body, { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="case-${c.id}.json"` } });
  } catch (error) {
    return failFrom(error, "CASE_EXPORT_FAILED");
  }
}
