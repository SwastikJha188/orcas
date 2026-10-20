import { ok } from "@/app/api/_lib/respond";
import { caseVocabulary } from "@/server/services/case-service";

export const runtime = "nodejs";

/** GET /api/cases/vocabulary → the choices the case forms offer, in plain words. */
export async function GET() {
  return ok(caseVocabulary());
}
