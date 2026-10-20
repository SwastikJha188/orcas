import { failFrom, ok } from "@/app/api/_lib/respond";
import { getVocabulary } from "@/server/services/maintenance-service";

export const runtime = "nodejs";

/** GET /api/maintenance/vocabulary → rounds (with intervals, plan codes, triggers), interval wording, owners, modes and scopes. */
export async function GET() {
  try {
    return ok(await getVocabulary());
  } catch (error) {
    return failFrom(error, "MAINTENANCE_VOCABULARY_FAILED");
  }
}
