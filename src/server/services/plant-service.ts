import { randomUUID } from "node:crypto";
import pool, { query } from "@/server/db";
import { ensureDatabaseSeeded } from "@/server/services/industrial-service";

export interface PlantRecord {
  id: string;
  code: string;
  name: string;
  shortName: string;
  region: string | null;
  location: string | null;
  coordinates: string | null;
  timeZone: string;
  status: "Operational" | "Alert" | "Standby" | "Maintenance";
  /** Machine plant-wide features follow (Copilot, ops loop, AI engine); null when the plant has none. */
  primaryMachineId: string | null;
  managerUserId: string | null;
  managerName: string | null;
  managerEmail: string | null;
  description: string | null;
  commissionedYear: number | null;
  designCapacity: string | null;
  machineCount: number;
  operationalCount: number;
  advisoryCount: number;
  standbyCount: number;
  /** Machines with no evaluation yet (no readings). */
  unevaluatedCount: number;
  /** Mean Machine Health Index of the evaluated machines; null when none is evaluated. */
  averageHealth: number | null;
  areaCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export class PlantServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function listPlants(userId?: string | null): Promise<PlantRecord[]> {
  await ensureDatabaseSeeded();
  let filterByUser = false;
  if (userId) {
    const userRole = await query(
      `SELECT r.can_manage_plants
         FROM users u
         JOIN roles r ON r.id = u.role_id
        WHERE u.id = $1`,
      [userId],
    );
    if (userRole.rows[0] && !userRole.rows[0].can_manage_plants) {
      filterByUser = true;
    }
  }

  // Machine condition is the latest evaluated health score under each machine's health-model bands.
  const res = await query(
    `WITH latest AS (
       SELECT DISTINCT ON (machine_id) machine_id, score FROM machine_health_scores
        WHERE scored_at > NOW() - interval '1 day' ORDER BY machine_id, scored_at DESC
     ), mstate AS (
       SELECT m.id, m.plant_id, m.service_state, l.score,
              CASE WHEN l.score IS NULL THEN NULL
                   WHEN l.score < b.critical THEN 'Critical'
                   WHEN l.score < b.advisory THEN 'Alert'
                   ELSE 'Normal' END AS condition
         FROM machines m
         LEFT JOIN latest l ON l.machine_id = m.id
         LEFT JOIN LATERAL (
           SELECT MAX(value) FILTER (WHERE key = 'band_critical') AS critical, MAX(value) FILTER (WHERE key = 'band_advisory') AS advisory
             FROM health_model_parameters WHERE model_id = m.health_model_id
         ) b ON TRUE
     )
     SELECT p.*,
            mgr.full_name AS manager_name,
            mgr.email AS manager_email,
            COUNT(DISTINCT ms.id) AS machine_count,
            COUNT(DISTINCT ms.id) FILTER (WHERE ms.service_state = 'Operational' AND ms.condition = 'Normal') AS operational_count,
            COUNT(DISTINCT ms.id) FILTER (WHERE ms.service_state = 'Operational' AND ms.condition IN ('Alert', 'Critical')) AS advisory_count,
            COUNT(DISTINCT ms.id) FILTER (WHERE ms.service_state IN ('Standby', 'Maintenance')) AS standby_count,
            COUNT(DISTINCT ms.id) FILTER (WHERE ms.service_state = 'Operational' AND ms.condition IS NULL) AS unevaluated_count,
            ROUND(AVG(ms.score)::numeric, 1) AS average_health,
            COUNT(DISTINCT hn_area.id) AS area_count,
            COUNT(DISTINCT upa_all.user_id) AS user_count
       FROM plants p
       LEFT JOIN users mgr ON mgr.id = p.manager_user_id
       LEFT JOIN mstate ms ON ms.plant_id = p.id
       LEFT JOIN hierarchy_nodes hn_area ON hn_area.plant_id = p.id AND hn_area.type = 'area'
       LEFT JOIN user_plant_access upa_all ON upa_all.plant_id = p.id
      WHERE NOT $1::boolean OR EXISTS (SELECT 1 FROM user_plant_access f WHERE f.plant_id = p.id AND f.user_id = $2)
      GROUP BY p.id, mgr.full_name, mgr.email
      ORDER BY p.sort_order ASC, p.created_at ASC, p.name ASC`,
    [filterByUser, userId ?? null],
  );

  return res.rows.map((r) => ({
    id: String(r.id),
    code: String(r.code),
    name: String(r.name),
    shortName: String(r.short_name ?? r.name),
    region: r.region ? String(r.region) : null,
    location: r.location ? String(r.location) : null,
    coordinates: r.coordinates ? String(r.coordinates) : null,
    timeZone: String(r.time_zone),
    status: r.status as PlantRecord["status"],
    primaryMachineId: r.primary_machine_id ? String(r.primary_machine_id) : null,
    managerUserId: r.manager_user_id ? String(r.manager_user_id) : null,
    managerName: r.manager_name ? String(r.manager_name) : null,
    managerEmail: r.manager_email ? String(r.manager_email) : null,
    description: r.description ? String(r.description) : null,
    commissionedYear: r.commissioned_year !== null && r.commissioned_year !== undefined ? Number(r.commissioned_year) : null,
    designCapacity: r.design_capacity ? String(r.design_capacity) : null,
    machineCount: Number(r.machine_count ?? 0),
    operationalCount: Number(r.operational_count ?? 0),
    advisoryCount: Number(r.advisory_count ?? 0),
    standbyCount: Number(r.standby_count ?? 0),
    unevaluatedCount: Number(r.unevaluated_count ?? 0),
    averageHealth: r.average_health === null || r.average_health === undefined ? null : Number(r.average_health),
    areaCount: Number(r.area_count ?? 0),
    userCount: Number(r.user_count ?? 0),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  }));
}

export async function getPlantById(id: string): Promise<PlantRecord | null> {
  const plants = await listPlants();
  return plants.find((p) => p.id === id) ?? null;
}

export interface CreatePlantInput {
  id?: string;
  code: string;
  name: string;
  shortName?: string;
  region?: string;
  location?: string;
  coordinates?: string;
  timeZone?: string;
  status?: "Operational" | "Alert" | "Standby" | "Maintenance";
  managerUserId?: string | null;
  description?: string | null;
  commissionedYear?: number | null;
  designCapacity?: string | null;
  initialAreas?: string[];
}

/** `creatorId`: the account adding the plant; it becomes the plant's administrator. */
export async function createPlant(input: CreatePlantInput, creatorId?: string): Promise<PlantRecord> {
  await ensureDatabaseSeeded();
  const code = (input.code ?? "").trim().toUpperCase();
  const name = (input.name ?? "").trim();
  if (!code) throw new PlantServiceError("Plant code is required (e.g. 'LUM-04').");
  if (!name) throw new PlantServiceError("Plant name is required.");
  const timeZone = input.timeZone?.trim();
  if (!timeZone) throw new PlantServiceError("Plant time zone is required (e.g. 'Africa/Lusaka').");

  const dupCode = await query("SELECT id FROM plants WHERE UPPER(code) = $1", [code]);
  if (dupCode.rows[0]) throw new PlantServiceError(`Plant code '${code}' is already in use.`, 409);

  const slug = code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const id = input.id?.trim() || `plant-${slug || randomUUID().slice(0, 6)}`;
  const status = ["Operational", "Alert", "Standby", "Maintenance"].includes(input.status ?? "")
    ? input.status!
    : "Operational";
  const shortName = input.shortName?.trim() || name.split("—")[0].trim().slice(0, 64);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO plants (
         id, code, name, short_name, region, location, coordinates, time_zone,
         status, manager_user_id, description, commissioned_year, design_capacity, sort_order
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
               COALESCE((SELECT MAX(sort_order) + 1 FROM plants), 0))`,
      [
        id,
        code,
        name,
        shortName,
        input.region?.trim() || null,
        input.location?.trim() || null,
        input.coordinates?.trim() || null,
        timeZone,
        status,
        input.managerUserId?.trim() || null,
        input.description?.trim() || null,
        typeof input.commissionedYear === "number" && Number.isFinite(input.commissionedYear) ? input.commissionedYear : null,
        input.designCapacity?.trim() || null,
      ],
    );

    // Create root plant hierarchy node
    await client.query(
      `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order)
       VALUES ($1, $1, NULL, $2, 'plant', NULL, 900)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [id, name],
    );

    // The areas the plant was registered with (none are invented).
    const areas = Array.isArray(input.initialAreas) ? input.initialAreas.map((a) => a.trim()).filter(Boolean) : [];
    for (const [idx, areaName] of areas.entries()) {
      await client.query(
        `INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order)
         VALUES ($1, $2, $2, $3, 'area', NULL, $4)
         ON CONFLICT (id) DO NOTHING`,
        [`area-${slug}-${idx + 1}`, id, areaName, idx + 1],
      );
    }

    // Plants are separate workspaces: only the creator and the assigned manager get
    // access (all-plants roles open every plant without a row).
    const adminIds = new Set<string>();
    if (creatorId) adminIds.add(creatorId);
    if (input.managerUserId?.trim()) adminIds.add(input.managerUserId.trim());
    const allPlantsUsers = await client.query<{ id: string }>(
      "SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.all_plants AND u.id = ANY($1::varchar[])",
      [[...adminIds]],
    );
    for (const r of allPlantsUsers.rows) adminIds.delete(r.id);

    for (const uid of adminIds) {
      await client.query(
        `INSERT INTO user_plant_access (user_id, plant_id, access_level, is_primary)
         VALUES ($1, $2, 'admin', FALSE)
         ON CONFLICT (user_id, plant_id) DO NOTHING`,
        [uid, id],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }

  const created = await getPlantById(id);
  if (!created) throw new PlantServiceError("Failed to load created plant", 500);
  return created;
}

export interface UpdatePlantInput {
  code?: string;
  name?: string;
  shortName?: string;
  region?: string;
  location?: string;
  coordinates?: string;
  timeZone?: string;
  status?: "Operational" | "Alert" | "Standby" | "Maintenance";
  managerUserId?: string | null;
  description?: string | null;
  commissionedYear?: number | null;
  designCapacity?: string | null;
}

export async function updatePlant(id: string, patch: UpdatePlantInput): Promise<PlantRecord> {
  await ensureDatabaseSeeded();
  const existing = await query("SELECT * FROM plants WHERE id = $1", [id]);
  if (!existing.rows[0]) throw new PlantServiceError(`Plant '${id}' not found.`, 404);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sets: string[] = [];
    const params: unknown[] = [];

    if (patch.code !== undefined) {
      const code = patch.code.trim().toUpperCase();
      if (!code) throw new PlantServiceError("Plant code cannot be empty.");
      params.push(code);
      sets.push(`code = $${params.length}`);
    }
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new PlantServiceError("Plant name cannot be empty.");
      params.push(name);
      sets.push(`name = $${params.length}`);
      await client.query(
        `UPDATE hierarchy_nodes SET name = $1 WHERE id = $2 AND type = 'plant'`,
        [name, id],
      );
    }
    if (patch.shortName !== undefined) {
      params.push(patch.shortName.trim() || String(existing.rows[0].name));
      sets.push(`short_name = $${params.length}`);
    }
    if (patch.region !== undefined) {
      params.push(patch.region.trim() || null);
      sets.push(`region = $${params.length}`);
    }
    if (patch.location !== undefined) {
      params.push(patch.location.trim() || null);
      sets.push(`location = $${params.length}`);
    }
    if (patch.coordinates !== undefined) {
      params.push(patch.coordinates.trim() || null);
      sets.push(`coordinates = $${params.length}`);
    }
    if (patch.timeZone !== undefined) {
      if (!patch.timeZone.trim()) throw new PlantServiceError("A plant needs a time zone.");
      params.push(patch.timeZone.trim());
      sets.push(`time_zone = $${params.length}`);
    }
    if (patch.status !== undefined) {
      if (!["Operational", "Alert", "Standby", "Maintenance"].includes(patch.status)) {
        throw new PlantServiceError("Invalid plant status.");
      }
      params.push(patch.status);
      sets.push(`status = $${params.length}`);
    }
    if (patch.managerUserId !== undefined) {
      params.push(patch.managerUserId?.trim() || null);
      sets.push(`manager_user_id = $${params.length}`);
    }
    if (patch.description !== undefined) {
      params.push(patch.description?.trim() || null);
      sets.push(`description = $${params.length}`);
    }
    if (patch.commissionedYear !== undefined) {
      params.push(
        typeof patch.commissionedYear === "number" && Number.isFinite(patch.commissionedYear)
          ? patch.commissionedYear
          : null,
      );
      sets.push(`commissioned_year = $${params.length}`);
    }
    if (patch.designCapacity !== undefined) {
      params.push(patch.designCapacity?.trim() || null);
      sets.push(`design_capacity = $${params.length}`);
    }

    if (sets.length > 0) {
      params.push(id);
      await client.query(
        `UPDATE plants SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
        params,
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }

  const updated = await getPlantById(id);
  if (!updated) throw new PlantServiceError("Failed to load updated plant", 500);
  return updated;
}

export async function deletePlant(id: string): Promise<void> {
  await ensureDatabaseSeeded();
  const machines = await query<{ n: number }>("SELECT COUNT(*)::int AS n FROM machines WHERE plant_id = $1", [id]);
  if ((machines.rows[0]?.n ?? 0) > 0) {
    throw new PlantServiceError(`Plant '${id}' still has ${machines.rows[0].n} machine(s); remove them first.`, 409);
  }
  const res = await query("DELETE FROM plants WHERE id = $1", [id]);
  if ((res.rowCount ?? 0) === 0) {
    throw new PlantServiceError(`Plant '${id}' not found.`, 404);
  }
}
