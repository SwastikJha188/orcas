import type { NextRequest } from "next/server";
import { canAdminister, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { isDatabaseHealthy } from "@/server/db";
import { seedDatabase } from "@/server/db/fixture-seed";
import { resetSeedCheckCache } from "@/server/services/industrial-service";
import { getMqttRuntime } from "@/server/mqtt/runtime";

export const runtime = "nodejs";

/**
 * POST /api/db/init → resets the database to the reference fixture
 * (src/server/db/fixtures): configuration and master data are reloaded and the
 * runtime history (readings, findings, events, work orders) is cleared.
 */
export async function POST(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const result = await seedDatabase();
    resetSeedCheckCache();
    await getMqttRuntime().reload();
    return ok({ ...result, databaseStatus: await isDatabaseHealthy() });
  } catch (error) {
    return failFrom(error, "DB_INIT_FAILED");
  }
}

/** GET /api/db/init → connection and row counts. */
export async function GET() {
  try {
    return ok(await isDatabaseHealthy());
  } catch (error) {
    return failFrom(error, "DB_HEALTH_ERROR");
  }
}
