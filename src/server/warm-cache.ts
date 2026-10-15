/**
 * Fills the read cache (src/server/db) right after the server boots, so the
 * first visitor after a deploy does not pay the database round trips that
 * every page shares: hierarchy, machines, plants, users, roles, racks, fleet,
 * and each live machine's signals, catalog, diagnosis and trends. One read at
 * a time, in the background; a failure only means that read stays cold.
 */
export async function warmReadCache(): Promise<void> {
  // Boot-time DDL (schema sync, auth tables) retires cached reads; let it finish first.
  const { edgeSchemaSynced } = await import("@/server/services/edge-service");
  const { ensureAuth } = await import("@/server/services/auth-service");
  await edgeSchemaSynced().catch(() => {});
  await ensureAuth().catch(() => {});
  const started = Date.now();
  const industrial = await import("@/server/services/industrial-service");
  const users = await import("@/server/services/user-service");
  const plants = await import("@/server/services/plant-service");
  const { KILN_FLEET_IDS } = await import("@/lib/kiln-sim/fleet");
  const { PYRO_MACHINE_IDS } = await import("@/lib/pyro-sim/signals");

  const reads: Array<() => Promise<unknown>> = [
    () => industrial.getPlantHierarchy(),
    () => industrial.getMachines(),
    () => plants.listPlants(),
    () => users.listUsers(),
    () => users.listRoles(),
    () => industrial.getRackRecords(),
    () => industrial.getFleetStats(),
  ];
  for (const id of [...PYRO_MACHINE_IDS, ...KILN_FLEET_IDS]) {
    reads.push(
      () => industrial.getMappedSignals(id),
      () => industrial.getMachineCatalog(id),
      () => industrial.getDiagnosisRecords(id),
      () => industrial.getTrendRecords(id),
    );
  }
  let failed = 0;
  for (const read of reads) await read().catch(() => (failed += 1));
  console.log(`[cache] warmed ${reads.length - failed}/${reads.length} reads in ${Date.now() - started} ms`);
}
