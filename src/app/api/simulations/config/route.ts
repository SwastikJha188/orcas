import { failFrom, ok } from "@/app/api/_lib/respond";
import { readEngineConfig } from "@/server/monitoring/engine-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/simulations/config → the engines' configuration from the database (see src/lib/engine-config.ts). */
export async function GET() {
  try {
    return ok(await readEngineConfig());
  } catch (error) {
    return failFrom(error, "ENGINE_CONFIG_FAILED");
  }
}
