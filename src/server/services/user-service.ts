import { randomUUID } from "node:crypto";
import pool, { query } from "@/server/db";
import { ensureDatabaseSeeded } from "@/server/services/industrial-service";

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
  sortOrder: number;
}

export interface UserPlantAccessItem {
  plantId: string;
  plantCode: string;
  plantName: string;
  plantShortName: string;
  accessLevel: "admin" | "write" | "read";
  isPrimary: boolean;
}

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  title: string;
  department: string;
  phone: string | null;
  shift: string;
  avatarInitials: string;
  roleId: string;
  role: RoleRecord;
  status: "Active" | "On Call" | "Away" | "Inactive";
  defaultPlantId: string | null;
  plantAccess: UserPlantAccessItem[];
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
                r.can_manage_edge, r.can_ack_alerts, r.can_manage_work_orders,
                r.sort_order AS role_sort_order
           FROM users u
           JOIN roles r ON r.id = u.role_id
           LEFT JOIN user_plant_access upa ON upa.user_id = u.id
          WHERE upa.plant_id = $1 OR r.can_manage_plants = TRUE
          ORDER BY r.sort_order ASC, u.full_name ASC`,
        [plantId],
      )
    : await query(
        `SELECT u.*,
                r.id AS role_id, r.name AS role_name, r.description AS role_description,
                r.can_manage_users, r.can_manage_plants, r.can_manage_machines,
                r.can_manage_edge, r.can_ack_alerts, r.can_manage_work_orders,
                r.sort_order AS role_sort_order
           FROM users u
           JOIN roles r ON r.id = u.role_id
          ORDER BY r.sort_order ASC, u.full_name ASC`,
      );

  const accessRows = await query(
    `SELECT upa.user_id, upa.plant_id, upa.access_level, upa.is_primary,
            p.code AS plant_code, p.name AS plant_name, p.short_name AS plant_short_name
       FROM user_plant_access upa
       JOIN plants p ON p.id = upa.plant_id
      ORDER BY upa.is_primary DESC, p.sort_order ASC, p.name ASC`,
  );

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
    title: String(u.title ?? "Reliability Specialist"),
    department: String(u.department ?? "Asset Operations"),
    phone: u.phone ? String(u.phone) : null,
    shift: String(u.shift ?? "Day Shift (06:00–18:00)"),
    avatarInitials: String(u.avatar_initials ?? "UL"),
    roleId: String(u.role_id),
    role: mapRole(u),
    status: (u.status as UserRecord["status"]) ?? "Active",
    defaultPlantId: u.default_plant_id ? String(u.default_plant_id) : null,
    plantAccess: accessByUser.get(String(u.id)) ?? [],
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
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  await ensureDatabaseSeeded();
  const email = (input.email ?? "").trim().toLowerCase();
  const fullName = (input.fullName ?? "").trim();
  const roleId = (input.roleId ?? "").trim();
  if (!email || !email.includes("@")) throw new UserServiceError("A valid email address is required.");
  if (!fullName) throw new UserServiceError("Full name is required.");
  if (!roleId) throw new UserServiceError("Role is required.");

  const roleCheck = await query("SELECT id FROM roles WHERE id = $1", [roleId]);
  if (!roleCheck.rows[0]) throw new UserServiceError(`Role '${roleId}' does not exist.`, 404);

  const dupCheck = await query("SELECT id FROM users WHERE LOWER(email) = $1", [email]);
  if (dupCheck.rows[0]) throw new UserServiceError(`A user with email '${email}' already exists.`, 409);

  const id = input.id?.trim() || `usr-${randomUUID().slice(0, 8)}`;
  const status = ["Active", "On Call", "Away", "Inactive"].includes(input.status ?? "")
    ? input.status!
    : "Active";
  const assignments = Array.isArray(input.plantAssignments) ? input.plantAssignments : [];
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
         id, email, full_name, title, department, phone, shift, avatar_initials,
         role_id, status, default_plant_id, last_active_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        id,
        email,
        fullName,
        input.title?.trim() || "Reliability Specialist",
        input.department?.trim() || "Asset Operations",
        input.phone?.trim() || null,
        input.shift?.trim() || "Day Shift (06:00–18:00)",
        initialsFrom(fullName),
        roleId,
        status,
        defaultPlantId,
      ],
    );

    for (const [idx, a] of assignments.entries()) {
      if (!a.plantId) continue;
      const level = ["admin", "write", "read"].includes(a.accessLevel ?? "") ? a.accessLevel! : "write";
      const isPrimary = a.isPrimary !== undefined ? Boolean(a.isPrimary) : a.plantId === defaultPlantId || idx === 0;
      await client.query(
        `INSERT INTO user_plant_access (user_id, plant_id, access_level, is_primary)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, plant_id) DO UPDATE SET
           access_level = EXCLUDED.access_level,
           is_primary = EXCLUDED.is_primary`,
        [id, a.plantId, level, isPrimary],
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
}

export async function updateUser(id: string, patch: UpdateUserInput): Promise<UserRecord> {
  await ensureDatabaseSeeded();
  const existing = await query("SELECT * FROM users WHERE id = $1", [id]);
  if (!existing.rows[0]) throw new UserServiceError(`User '${id}' not found.`, 404);

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
      params.push(initialsFrom(fullName));
      sets.push(`avatar_initials = $${params.length}`);
    }
    if (patch.title !== undefined) {
      params.push(patch.title?.trim() || "Reliability Specialist");
      sets.push(`title = $${params.length}`);
    }
    if (patch.department !== undefined) {
      params.push(patch.department?.trim() || "Asset Operations");
      sets.push(`department = $${params.length}`);
    }
    if (patch.phone !== undefined) {
      params.push(patch.phone?.trim() || null);
      sets.push(`phone = $${params.length}`);
    }
    if (patch.shift !== undefined) {
      params.push(patch.shift?.trim() || "Day Shift (06:00–18:00)");
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
    if (patch.defaultPlantId !== undefined) {
      params.push(patch.defaultPlantId?.trim() || null);
      sets.push(`default_plant_id = $${params.length}`);
    }

    if (sets.length > 0) {
      params.push(id);
      await client.query(
        `UPDATE users SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
        params,
      );
    }

    if (Array.isArray(patch.plantAssignments)) {
      await client.query("DELETE FROM user_plant_access WHERE user_id = $1", [id]);
      for (const [idx, a] of patch.plantAssignments.entries()) {
        if (!a.plantId) continue;
        const level = ["admin", "write", "read"].includes(a.accessLevel ?? "") ? a.accessLevel! : "write";
        const isPrimary = a.isPrimary !== undefined ? Boolean(a.isPrimary) : idx === 0;
        await client.query(
          `INSERT INTO user_plant_access (user_id, plant_id, access_level, is_primary)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, plant_id) DO UPDATE SET
             access_level = EXCLUDED.access_level,
             is_primary = EXCLUDED.is_primary`,
          [id, a.plantId, level, isPrimary],
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
