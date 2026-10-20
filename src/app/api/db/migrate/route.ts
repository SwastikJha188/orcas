import type { NextRequest } from "next/server";
import { canAdminister, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { listMigrationFiles, runMigrations } from "@/server/db/migrate";

export const runtime = "nodejs";

/** POST /api/db/migrate → applies pending schema migrations; returns the ones applied and the full list. */
export async function POST(request: NextRequest) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const applied = await runMigrations();
    return ok({ applied, migrations: listMigrationFiles().map((m) => m.name) });
  } catch (error) {
    return failFrom(error, "MIGRATION_FAILED");
  }
}
