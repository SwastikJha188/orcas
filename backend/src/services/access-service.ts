import { query } from "@backend/db";
import { sessionUser } from "@backend/services/auth-service";

/**
 * Who may change plants and users. Every rule reads the signed-in account's
 * role and plant access rows:
 *
 * - A role with `all_plants` (the Oswar super administrator) opens every plant
 *   and may manage every plant and user, including other all-plants accounts.
 * - Any other role manages only inside its own plants: users whose plants are
 *   all among the manager's plants, and plant access to those plants only.
 * - Without `can_manage_users` an account may only edit its own profile and
 *   password.
 */

export class AccessError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 403, code = "FORBIDDEN") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface Actor {
  id: string;
  allPlants: boolean;
  canManageUsers: boolean;
  canManagePlants: boolean;
  /** plant id → access level. */
  plants: Map<string, "admin" | "write" | "read">;
}

interface TargetUser {
  id: string;
  allPlants: boolean;
  status: string;
  plantIds: string[];
}

export async function loadActor(userId: string): Promise<Actor | null> {
  const row = (
    await query<{ id: string; status: string; all_plants: boolean; can_manage_users: boolean; can_manage_plants: boolean }>(
      `SELECT u.id, u.status, r.all_plants, r.can_manage_users, r.can_manage_plants
         FROM users u JOIN roles r ON r.id = u.role_id
        WHERE u.id = $1`,
      [userId],
    )
  ).rows[0];
  if (!row || row.status === "Inactive") return null;
  const access = await query<{ plant_id: string; access_level: "admin" | "write" | "read" }>(
    "SELECT plant_id, access_level FROM user_plant_access WHERE user_id = $1",
    [userId],
  );
  return {
    id: row.id,
    allPlants: row.all_plants,
    canManageUsers: row.can_manage_users,
    canManagePlants: row.can_manage_plants,
    plants: new Map(access.rows.map((a) => [a.plant_id, a.access_level])),
  };
}

/** The signed-in account of a session token; 401 when there is none. */
export async function requireActor(token: string | undefined): Promise<Actor> {
  const userId = await sessionUser(token);
  const actor = userId ? await loadActor(userId) : null;
  if (!actor) throw new AccessError("Sign in to make changes.", 401, "NOT_SIGNED_IN");
  return actor;
}

async function loadTarget(userId: string): Promise<TargetUser | null> {
  const row = (
    await query<{ id: string; status: string; all_plants: boolean }>(
      "SELECT u.id, u.status, r.all_plants FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1",
      [userId],
    )
  ).rows[0];
  if (!row) return null;
  const access = await query<{ plant_id: string }>("SELECT plant_id FROM user_plant_access WHERE user_id = $1", [userId]);
  return { id: row.id, status: row.status, allPlants: row.all_plants, plantIds: access.rows.map((a) => a.plant_id) };
}

async function roleIsAllPlants(roleId: string): Promise<boolean> {
  const row = (await query<{ all_plants: boolean }>("SELECT all_plants FROM roles WHERE id = $1", [roleId])).rows[0];
  return Boolean(row?.all_plants);
}

/** Active all-plants accounts other than `exceptUserId`. */
async function otherSuperAdmins(exceptUserId: string): Promise<number> {
  const row = (
    await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM users u JOIN roles r ON r.id = u.role_id
        WHERE r.all_plants AND u.status <> 'Inactive' AND u.id <> $1`,
      [exceptUserId],
    )
  ).rows[0];
  return row?.n ?? 0;
}

/** True when a manager without all-plants access may manage this user. */
function withinActorPlants(actor: Actor, target: TargetUser): boolean {
  if (actor.allPlants) return true;
  if (target.allPlants || target.plantIds.length === 0) return false;
  return target.plantIds.every((p) => actor.plants.has(p));
}

export interface UserChange {
  roleId?: string;
  status?: string;
  plantAssignments?: { plantId: string }[];
  defaultPlantId?: string | null;
  password?: string;
}

/** Throws unless `actor` may create (targetId null) or change the user. */
export async function assertCanChangeUser(actor: Actor, targetId: string | null, change: UserChange): Promise<void> {
  const target = targetId ? await loadTarget(targetId) : null;
  if (targetId && !target) return; // the service reports the missing user

  const self = target?.id === actor.id;
  if (!actor.canManageUsers) {
    const touchesAccess =
      change.roleId !== undefined || change.status !== undefined || change.plantAssignments !== undefined || change.defaultPlantId !== undefined;
    if (!self || touchesAccess) throw new AccessError("Your role may not manage users.");
    return;
  }

  if (target && !self && !withinActorPlants(actor, target)) {
    throw new AccessError("This person works at plants you do not manage.");
  }
  if (change.roleId !== undefined && (await roleIsAllPlants(change.roleId)) && !actor.allPlants) {
    throw new AccessError("Only a super administrator can give the super administrator role.");
  }
  if (!actor.allPlants && change.plantAssignments) {
    const outside = change.plantAssignments.find((a) => !actor.plants.has(a.plantId));
    if (outside) throw new AccessError(`You do not manage plant '${outside.plantId}'.`);
  }

  // Never leave the platform without an active super administrator.
  if (target?.allPlants) {
    const losesRole = change.roleId !== undefined && !(await roleIsAllPlants(change.roleId));
    const deactivated = change.status === "Inactive";
    if ((losesRole || deactivated) && (await otherSuperAdmins(target.id)) === 0) {
      throw new AccessError("This is the last super administrator; add another before changing this account.", 409, "LAST_SUPER_ADMIN");
    }
  }
}

export async function assertCanDeleteUser(actor: Actor, targetId: string): Promise<void> {
  if (!actor.canManageUsers) throw new AccessError("Your role may not manage users.");
  if (targetId === actor.id) throw new AccessError("You cannot delete your own account.", 409, "SELF_DELETE");
  const target = await loadTarget(targetId);
  if (!target) return;
  if (!withinActorPlants(actor, target)) throw new AccessError("This person works at plants you do not manage.");
  if (target.allPlants && (await otherSuperAdmins(target.id)) === 0) {
    throw new AccessError("This is the last super administrator.", 409, "LAST_SUPER_ADMIN");
  }
}

export function assertCanCreatePlant(actor: Actor): void {
  if (!actor.canManagePlants) throw new AccessError("Your role may not add plants.");
}

/** Editing plant details: managers of that plant and its plant administrators. */
export function assertCanEditPlant(actor: Actor, plantId: string): void {
  if (actor.allPlants) return;
  const level = actor.plants.get(plantId);
  if (level === "admin" || (actor.canManagePlants && level)) return;
  throw new AccessError("You do not manage this plant.");
}

export function assertCanDeletePlant(actor: Actor, plantId: string): void {
  if (actor.allPlants) return;
  if (actor.canManagePlants && actor.plants.get(plantId) === "admin") return;
  throw new AccessError("Only a super administrator or this plant's administrator can delete it.");
}

/* --------------------------------------------------------------------------
 * Read scope: which plants' data a request may see.
 * ------------------------------------------------------------------------ */

/** Every plant (all-plants role, or a signed-out script on a dev server), or a fixed set. */
export type Scope =
  | { all: true }
  | { all: false; userId: string; plants: Set<string>; machines: Set<string>; /** Limited to granted machines (user_machine_access), not whole plants. */ onlyMachines: boolean };

/**
 * The read scope of a session token. An all-plants role sees every plant; any
 * other account sees the plants in its access rows and their machines (only
 * the machines in its user_machine_access rows, when it has any). Without
 * a session, a development server answers unscoped (scripts and tools call the
 * API directly) and production refuses.
 */
export async function scopeForToken(token: string | undefined): Promise<Scope> {
  const userId = await sessionUser(token);
  if (!userId) {
    if (process.env.NODE_ENV !== "production") return { all: true };
    throw new AccessError("Sign in to see plant data.", 401, "NOT_SIGNED_IN");
  }
  const actor = await loadActor(userId);
  if (!actor) throw new AccessError("Sign in to see plant data.", 401, "NOT_SIGNED_IN");
  if (actor.allPlants) return { all: true };
  const plants = new Set(actor.plants.keys());
  // Machine rows (user_machine_access) narrow the plants to those machines; none = every machine of the plants.
  const limited = (await query<{ n: number }>("SELECT COUNT(*)::int AS n FROM user_machine_access WHERE user_id = $1", [userId])).rows[0]?.n > 0;
  const machines = await query<{ id: string }>(
    `SELECT m.id FROM machines m
      WHERE m.plant_id = ANY($1::varchar[])
        AND (NOT EXISTS (SELECT 1 FROM user_machine_access a WHERE a.user_id = $2)
             OR EXISTS (SELECT 1 FROM user_machine_access a WHERE a.user_id = $2 AND a.machine_id = m.id))`,
    [[...plants], userId],
  );
  return { all: false, userId, plants, machines: new Set(machines.rows.map((m) => m.id)), onlyMachines: limited };
}

export const seesPlant = (scope: Scope, plantId: string | null | undefined): boolean =>
  scope.all || Boolean(plantId && scope.plants.has(plantId));

export const seesMachine = (scope: Scope, machineId: string | null | undefined): boolean =>
  scope.all || Boolean(machineId && scope.machines.has(machineId));

/** A machine outside the scope answers as missing (its existence is not revealed). */
export function requireMachine(scope: Scope, machineId: string | null | undefined): void {
  if (machineId && !seesMachine(scope, machineId)) throw new AccessError(`Machine '${machineId}' not found.`, 404, "NOT_FOUND");
}

export function requirePlant(scope: Scope, plantId: string | null | undefined): void {
  if (plantId && !seesPlant(scope, plantId)) throw new AccessError(`Plant '${plantId}' not found.`, 404, "NOT_FOUND");
}

/** The plant ids a list query should be limited to, or null for every plant. */
export const scopedPlantIds = (scope: Scope): string[] | null => (scope.all ? null : [...scope.plants]);

/** The machine ids a list query should be limited to, or null for every machine. */
export const scopedMachineIds = (scope: Scope): string[] | null => (scope.all ? null : [...scope.machines]);

/**
 * A user as another account may see them: people sharing one of the scope's
 * plants (plus the viewer), with access to other plants left out. Null = hidden.
 */
export function scopedUser<U extends { id: string; role: { allPlants: boolean }; plantAccess: { plantId: string }[] }>(
  scope: Scope,
  user: U,
): U | null {
  if (scope.all) return user;
  if (user.id === scope.userId) return user;
  if (user.role.allPlants) return null;
  const shared = user.plantAccess.filter((a) => scope.plants.has(a.plantId));
  return shared.length ? { ...user, plantAccess: shared } : null;
}

/**
 * The plants a list endpoint reads: the requested plant (404 when outside the
 * scope), else every plant of the scope; undefined = every plant.
 */
export function plantFilter(scope: Scope, requested?: string | null): string[] | undefined {
  if (requested) {
    requirePlant(scope, requested);
    return [requested];
  }
  return scope.all ? undefined : [...scope.plants];
}

/** Machine records (by their own id) the scope sees. */
export const scopedById = <T extends { id: string }>(scope: Scope, rows: T[]): T[] => (scope.all ? rows : rows.filter((r) => seesMachine(scope, r.id)));

/** A plant tree holding only the scope's machines: areas and groups left with none are dropped. */
export function scopedTree<N extends { type: string; machineId?: string; children?: N[] }>(scope: Scope, nodes: N[]): N[] {
  if (scope.all || !scope.onlyMachines) return nodes;
  const walk = (n: N): N | null => {
    if (n.type === "machine") return seesMachine(scope, n.machineId) ? n : null;
    const children = (n.children ?? []).map(walk).filter((c): c is N => c !== null);
    return n.type === "plant" || children.length ? { ...n, children } : null;
  };
  return nodes.map(walk).filter((n): n is N => n !== null);
}

/**
 * The machine a plant-wide read means for an account limited to one machine:
 * that machine (so plant lists, alarm counts and strips cover only it); else
 * the machine the request named, or none.
 */
export function narrowMachine(scope: Scope, machineId: string | null | undefined): string | null {
  if (machineId || scope.all || !scope.onlyMachines || scope.machines.size !== 1) return machineId ?? null;
  return [...scope.machines][0];
}

/** Rows of the scope's machines only. */
export const scopedRows = <T extends { machineId?: string | null }>(scope: Scope, rows: T[]): T[] =>
  scope.all ? rows : rows.filter((r) => seesMachine(scope, r.machineId));

/** List endpoints whose rows do not name their machine answer one machine at a time for scoped accounts. */
export function requireMachineParam(scope: Scope, machineId: string | null | undefined): void {
  if (!machineId && !scope.all) throw new AccessError("machineId is required", 400, "INVALID_INPUT");
  requireMachine(scope, machineId);
}

/** A measurement of a machine outside the scope answers as missing. */
export async function requireMeasurement(scope: Scope, measurementId: string): Promise<void> {
  if (scope.all) return;
  const row = (await query<{ machine_id: string }>("SELECT machine_id FROM v_measurement_context WHERE measurement_id = $1", [measurementId])).rows[0];
  if (row && !scope.machines.has(row.machine_id)) throw new AccessError(`Measurement ${measurementId} does not exist`, 404, "NOT_FOUND");
}

/**
 * The one plant a single-plant list query reads: the requested plant (checked),
 * the machine's own check, else the scope's only plant; null = every plant.
 * An account with several plants must name one.
 */
export function singlePlant(scope: Scope, plantId: string | null | undefined, machineId?: string | null): string | null {
  requireMachine(scope, machineId);
  if (plantId) {
    requirePlant(scope, plantId);
    return plantId;
  }
  if (scope.all || machineId) return null;
  if (scope.plants.size === 1) return [...scope.plants][0];
  throw new AccessError("plantId is required", 400, "INVALID_INPUT");
}

/** A problem case of a machine outside the scope answers as missing. */
export async function requireCase(scope: Scope, caseId: number): Promise<void> {
  if (scope.all || !Number.isInteger(caseId)) return;
  const row = (await query<{ machine_id: string }>("SELECT machine_id FROM cases WHERE id = $1", [caseId])).rows[0];
  if (row && !scope.machines.has(row.machine_id)) throw new AccessError(`Case ${caseId} not found`, 404, "NOT_FOUND");
}

/** Tables whose rows belong to one machine (`machine_id`), for writes that name a row by id. */
type MachineTable = "work_orders" | "maintenance_records" | "findings" | "manual_alarms";

/** A row of a machine outside the scope answers as missing; a row that does not exist is left to the service. */
export async function requireMachineRow(scope: Scope, table: MachineTable, id: string | number, label: string): Promise<void> {
  if (scope.all || (typeof id === "number" && !Number.isInteger(id))) return;
  const row = (await query<{ machine_id: string }>(`SELECT machine_id FROM ${table} WHERE id = $1`, [id])).rows[0];
  if (row && !scope.machines.has(row.machine_id)) throw new AccessError(`${label} ${id} not found`, 404, "NOT_FOUND");
}
