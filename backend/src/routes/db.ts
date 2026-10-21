import { Hono } from "hono";
import { isDatabaseHealthy } from "@backend/db";
import { seedDatabase } from "@backend/db/fixture-seed";
import { listMigrationFiles, runMigrations } from "@backend/db/migrate";
import { canAdminister, failFrom, forbidden, ok } from "@backend/http";
import { getMqttRuntime } from "@backend/mqtt/runtime";
import { resetSeedCheckCache } from "@backend/services/industrial-service";

/** /api/db */
export const db = new Hono();


db.post("/init", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const result = await seedDatabase();
    resetSeedCheckCache();
    await getMqttRuntime().reload();
    return ok({ ...result, databaseStatus: await isDatabaseHealthy() });
  } catch (error) {
    return failFrom(error, "DB_INIT_FAILED");
  }
});

db.get("/init", async () => {
  try {
    return ok(await isDatabaseHealthy());
  } catch (error) {
    return failFrom(error, "DB_HEALTH_ERROR");
  }
});

db.post("/migrate", async (c) => {
  const request = c.req.raw;
  if (!(await canAdminister(request))) return forbidden();
  try {
    const applied = await runMigrations();
    return ok({ applied, migrations: listMigrationFiles().map((m) => m.name) });
  } catch (error) {
    return failFrom(error, "MIGRATION_FAILED");
  }
});
