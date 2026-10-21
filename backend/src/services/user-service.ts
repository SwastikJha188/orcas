import { randomUUID } from "node:crypto";
import pool, { query } from "@backend/db";
import { ensureDatabaseSeeded } from "@backend/services/industrial-service";
import { MIN_PASSWORD_LENGTH, hashPassword } from "@backend/services/auth-service";

export interface RoleRecord {
  id: string;
  name: string;
  description: string;
  canManageUsers: boolean;
  canManagePlants: boolean;
  canManageMachines: boolean;
  canManageEdge: boolean;
  canAckAlerts: boolean;
  canManageWorkOrders: boolean;
  /** Opens every plant without plant access rows (super administrator). */
  allPlants: boolean;
  /** May raise support tickets to Oswar Teck. */
  canRaiseTickets: boolean;
  sortOrder: number;
}

export interface UserPlantAccessItem {
  plantId: string;
  plantCode: string;
  plantName: string;
  plantShortName: string;
  accessLevel: "admin" | "write" | "read";
  /** The user's default plant (users.default_plant_id). */
  isPrimary: boolean;
}

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  title: string | null;
  department: string | null;
  phone: string | null;
  shift: string | null;
  /** Derived from the full name. */
  avatarInitials: string;
  roleId: string;
  role: RoleRecord;
  status: "Active" | "On Call" | "Away" | "Inactive";
  defaultPlantId: string | null;
  plantAccess: UserPlantAccessItem[];
  /**
   * Machines the account is limited to (user_machine_access); empty: whole
   * plants. A one-machine account sees only that machine: no plant or full-line views.
   */
  machineAccess: string[];
  /** The account has a password and can sign in. */
  hasPassword: boolean;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class UserServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type Row = Record<string, unknown>;

function mapRole(r: Row): RoleRecord {
  return {
    id: String(r.role_id ?? r.id),
    name: String(r.role_name ?? r.name),
    description: String(r.role_description ?? r.description ?? ""),
    canManageUsers: Boolean(r.can_manage_users),
    canManagePlants: Boolean(r.can_manage_plants),
    canManageMachines: Boolean(r.can_manage_machines),
    canManageEdge: Boolean(r.can_manage_edge),
    canAckAlerts: Boolean(r.can_ack_alerts),
    canManageWorkOrders: Boolean(r.can_manage_work_orders),
    allPlants: Boolean(r.all_plants),
    canRaiseTickets: Boolean(r.can_raise_tickets),
    sortOrder: Number(r.role_sort_order ?? r.sort_order ?? 0),
  };
}

export async function listRoles(): Promise<RoleRecord[]> {
  await ensureDatabaseSeeded();
  const res = await query("SELECT * FROM roles ORDER BY sort_order ASC, name ASC");
  return res.rows.map(mapRole);
}

export async function listUsers(plantId?: string | null): Promise<UserRecord[]> {
  await ensureDatabaseSeeded();
  const userRows = plantId
    ? await query(
        `SELECT DISTINCT u.*,
                r.id AS role_id, r.name AS role_name, r.description AS role_description,
                r.can_manage_users, r.can_manage_plants, r.can_manage_machines,
                r.can_manage_edge, r.can_ack_alerts, r.can_manage_work_orders, r.all_plants, r.can_raise_tickets,
                r.sort_order AS role_sort_order
           FROM users u
           JOIN roles r ON r.id = u.role_id
           LEFT JOIN user_plant_access upa ON upa.user_id = u.id
          WHERE upa.plant_id = $1 OR r.can_manage_plants = TRUE OR r.all_plants = TRUE
          ORDER BY r.sort_order ASC, u.full_name ASC`,
        [plantId],
      )
    : await query(
        `SELECT u.*,
                r.id AS role_id, r.name AS role_name, r.description AS role_description,
                r.can_manage_users, r.can_manage_plants, r.can_manage_machines,
                r.can_manage_edge, r.can_ack_alerts, r.can_manage_work_orders, r.all_plants, r.can_raise_tickets,
                r.sort_order AS role_sort_order
           FROM users u
           JOIN roles r ON r.id = u.role_id
          ORDER BY r.sort_order ASC, u.full_name ASC`,
      );

  const accessRows = await query(
    `SELECT upa.user_id, upa.plant_id, upa.access_level, (upa.plant_id = u.default_plant_id) IS TRUE AS is_primary,
            p.code AS plant_code, p.name AS plant_name, p.short_name AS plant_short_name
       FROM user_plant_access upa
       JOIN users u ON u.id = upa.user_id
       JOIN plants p ON p.id = upa.plant_id
      ORDER BY is_primary DESC, p.sort_order ASC, p.name ASC`,
  );

  const machineRows = await query<{ user_id: string; machine_id: string }>("SELECT user_id, machine_id FROM user_machine_access ORDER BY machine_id");
  const machinesByUser = new Map<string, string[]>();
  for (const r of machineRows.rows) machinesByUser.set(r.user_id, [...(machinesByUser.get(r.user_id) ?? []), r.machine_id]);

  const accessByUser = new Map<string, UserPlantAccessItem[]>();
  for (const row of accessRows.rows) {
    const uid = String(row.user_id);
    const list = accessByUser.get(uid) ?? [];
    list.push({
      plantId: String(row.plant_id),
      plantCode: String(row.plant_code),
      plantName: String(row.plant_name),
      plantShortName: String(row.plant_short_name ?? row.plant_name),
      accessLevel: (row.access_level as "admin" | "write" | "read") ?? "read",
      isPrimary: Boolean(row.is_primary),
    });
    accessByUser.set(uid, list);
  }

  return userRows.rows.map((u) => ({
    id: String(u.id),
    email: String(u.email),
    fullName: String(u.full_name),
    title: u.title ? String(u.title) : null,
    department: u.department ? String(u.department) : null,
    phone: u.phone ? String(u.phone) : null,
    shift: u.shift ? String(u.shift) : null,
    avatarInitials: initialsFrom(String(u.full_name)),
    roleId: String(u.role_id),
    role: mapRole(u),
    status: (u.status as UserRecord["status"]) ?? "Active",
    defaultPlantId: u.default_plant_id ? String(u.default_plant_id) : null,
    plantAccess: accessByUser.get(String(u.id)) ?? [],
    machineAccess: machinesByUser.get(String(u.id)) ?? [],
    hasPassword: Boolean(u.password_hash),
    lastActiveAt: u.last_active_at ? new Date(u.last_active_at as string).toISOString() : null,
    createdAt: new Date(u.created_at as string).toISOString(),
    updatedAt: new Date(u.updated_at as string).toISOString(),
  }));
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const all = await listUsers();
  return all.find((u) => u.id === id) ?? null;
}

function initialsFrom(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "UL";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export interface CreateUserInput {
  id?: string;
  email: string;
  fullName: string;
  title?: string | null;
  department?: string | null;
  phone?: string | null;
  shift?: string | null;
  roleId: string;
  status?: "Active" | "On Call" | "Away" | "Inactive";
  defaultPlantId?: string | null;
  plantAssignments?: { plantId: string; accessLevel?: "admin" | "write" | "read"; isPrimary?: boolean }[];
  /** New sign-in password (hashed, never stored as text). */
  password?: string;
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  await ensureDatabaseSeeded();
  const email = (input.email ?? "").trim().toLowerCase();
  const fullName = (input.fullName ?? "").trim();
  const roleId = (input.roleId ?? "").trim();
  if (!email || !email.includes("@")) throw new UserServiceError("A valid email address is required.");
  if (!fullName) throw new UserServiceError("Full name is required.");
  if (!roleId) throw new UserServiceError("Role is required.");

  const roleCheck = await query<{ all_plants: boolean }>("SELECT all_plants FROM roles WHERE id = $1", [roleId]);
  if (!roleCheck.rows[0]) throw new UserServiceError(`Role '${roleId}' does not exist.`, 404);
  const password = checkPassword(input.password);

  const dupCheck = await query("SELECT id FROM users WHERE LOWER(email) = $1", [email]);
  if (dupCheck.rows[0]) throw new UserServiceError(`A user with email '${email}' already exists.`, 409);

  const id = input.id?.trim() || `usr-${randomUUID().slice(0, 8)}`;
  const status = ["Active", "On Call", "Away", "Inactive"].includes(input.status ?? "")
    ? input.status!
    : "Active";
  const assignments = Array.isArray(input.plantAssignments) ? input.plantAssignments.filter((a) => a.plantId) : [];
  // An account without plant rows would open every plant: only all-plants roles may.
  if (!roleCheck.rows[0].all_plants && assignments.length === 0) {
    throw new UserServiceError("Choose at least one plant this person can open.");
  }
  const defaultPlantId =
    input.defaultPlantId?.trim() ||
    assignments.find((a) => a.isPrimary)?.plantId ||
    assignments[0]?.plantId ||
    null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO users (
         id, email, full_name, title, department, phone, shift,
         role_id, status, default_plant_id, password_hash, last_active_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        id,
        email,
        fullName,
        input.title?.trim() || null,
        input.department?.trim() || null,
        input.phone?.trim() || null,
        input.shift?.trim() || null,
        roleId,
        status,
        defaultPlantId,
        password ? hashPassword(password) : null,
      ],
    );

    for (const a of assignments) {
      if (!a.plantId) continue;
      const level = ["admin", "write", "read"].includes(a.accessLevel ?? "") ? a.accessLevel! : "write";
      await client.query(
        `INSERT INTO user_plant_access (user_id, plant_id, access_level)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, plant_id) DO UPDATE SET access_level = EXCLUDED.access_level`,
        [id, a.plantId, level],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }

  const created = await getUserById(id);
  if (!created) throw new UserServiceError("Failed to load created user", 500);
  return created;
}

export interface UpdateUserInput {
  email?: string;
  fullName?: string;
  title?: string | null;
  department?: string | null;
  phone?: string | null;
  shift?: string | null;
  roleId?: string;
  status?: "Active" | "On Call" | "Away" | "Inactive";
  defaultPlantId?: string | null;
  plantAssignments?: { plantId: string; accessLevel?: "admin" | "write" | "read"; isPrimary?: boolean }[];
  /** New sign-in password (hashed, never stored as text). */
  password?: string;
}

/**
 * `keepPlantIds`: plants the editor cannot see; their access rows survive a
 * replaced `plantAssignments`. `keepSessionToken`: the editor's own session,
 * kept when they change their own password (every other session ends).
 */
export async function updateUser(
  id: string,
  patch: UpdateUserInput,
  opts: { keepPlantIds?: (plantId: string) => boolean; keepSessionToken?: string } = {},
): Promise<UserRecord> {
  await ensureDatabaseSeeded();
  const existing = await query("SELECT * FROM users WHERE id = $1", [id]);
  if (!existing.rows[0]) throw new UserServiceError(`User '${id}' not found.`, 404);
  const password = checkPassword(patch.password);
  const roleId = patch.roleId ?? String(existing.rows[0].role_id);
  const allPlants = Boolean((await query<{ all_plants: boolean }>("SELECT all_plants FROM roles WHERE id = $1", [roleId])).rows[0]?.all_plants);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sets: string[] = [];
    const params: unknown[] = [];

    if (patch.email !== undefined) {
      const email = patch.email.trim().toLowerCase();
      if (!email || !email.includes("@")) throw new UserServiceError("Invalid email address.");
      params.push(email);
      sets.push(`email = $${params.length}`);
    }
    if (patch.fullName !== undefined) {
      const fullName = patch.fullName.trim();
      if (!fullName) throw new UserServiceError("Full name cannot be empty.");
      params.push(fullName);
      sets.push(`full_name = $${params.length}`);
    }
    if (patch.title !== undefined) {
      params.push(patch.title?.trim() || null);
      sets.push(`title = $${params.length}`);
    }
    if (patch.department !== undefined) {
      params.push(patch.department?.trim() || null);
      sets.push(`department = $${params.length}`);
    }
    if (patch.phone !== undefined) {
      params.push(patch.phone?.trim() || null);
      sets.push(`phone = $${params.length}`);
    }
    if (patch.shift !== undefined) {
      params.push(patch.shift?.trim() || null);
      sets.push(`shift = $${params.length}`);
    }
    if (patch.roleId !== undefined) {
      const roleCheck = await client.query("SELECT id FROM roles WHERE id = $1", [patch.roleId]);
      if (!roleCheck.rows[0]) throw new UserServiceError(`Role '${patch.roleId}' not found.`, 404);
      params.push(patch.roleId);
      sets.push(`role_id = $${params.length}`);
    }
    if (patch.status !== undefined) {
      if (!["Active", "On Call", "Away", "Inactive"].includes(patch.status)) {
        throw new UserServiceError("Invalid user status.");
      }
      params.push(patch.status);
      sets.push(`status = $${params.length}`);
    }
    // The primary plant is users.default_plant_id; an assignment marked primary sets it when no default is sent.
    const primaryAssignment = Array.isArray(patch.plantAssignments) ? patch.plantAssignments.find((a) => a.plantId && a.isPrimary)?.plantId : undefined;
    if (patch.defaultPlantId !== undefined || primaryAssignment) {
      params.push((patch.defaultPlantId !== undefined ? patch.defaultPlantId?.trim() : primaryAssignment) || null);
      sets.push(`default_plant_id = $${params.length}`);
    }

    if (password) {
      params.push(hashPassword(password));
      sets.push(`password_hash = $${params.length}`);
    }

    if (sets.length > 0) {
      params.push(id);
      await client.query(
        `UPDATE users SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
        params,
      );
    }
    if (password) {
      await client.query("DELETE FROM user_sessions WHERE user_id = $1 AND id <> $2", [id, opts.keepSessionToken ?? ""]);
    }

    if (Array.isArray(patch.plantAssignments)) {
      const current = await client.query<{ plant_id: string }>("SELECT plant_id FROM user_plant_access WHERE user_id = $1", [id]);
      const kept = current.rows.filter((r) => opts.keepPlantIds?.(r.plant_id)).length;
      if (!allPlants && kept + patch.plantAssignments.filter((a) => a.plantId).length === 0) {
        throw new UserServiceError("Choose at least one plant this person can open.");
      }
      const keep = current.rows.map((r) => r.plant_id).filter((p) => opts.keepPlantIds?.(p));
      await client.query("DELETE FROM user_plant_access WHERE user_id = $1 AND NOT (plant_id = ANY($2::varchar[]))", [id, keep]);
      for (const a of patch.plantAssignments) {
        if (!a.plantId) continue;
        const level = ["admin", "write", "read"].includes(a.accessLevel ?? "") ? a.accessLevel! : "write";
        await client.query(
          `INSERT INTO user_plant_access (user_id, plant_id, access_level)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, plant_id) DO UPDATE SET access_level = EXCLUDED.access_level`,
          [id, a.plantId, level],
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }

  const updated = await getUserById(id);
  if (!updated) throw new UserServiceError("Failed to load updated user", 500);
  return updated;
}

/** The trimmed new password, or undefined when none was given; too short → error. */
function checkPassword(raw: string | undefined): string | undefined {
  if (raw === undefined || raw === "") return undefined;
  if (raw.length < MIN_PASSWORD_LENGTH) {
    throw new UserServiceError(`The password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  return raw;
}

export async function deleteUser(id: string): Promise<void> {
  await ensureDatabaseSeeded();
  if (id === "usr-swastik") {
    throw new UserServiceError("Primary system administrator 'usr-swastik' cannot be deleted.", 400);
  }
  const res = await query("DELETE FROM users WHERE id = $1", [id]);
  if ((res.rowCount ?? 0) === 0) {
    throw new UserServiceError(`User '${id}' not found.`, 404);
  }
}
