/**
 * Photos, drawings or layouts of a plant or a machine (table `asset_images`,
 * migration 038), uploaded in Configure when a plant or machine is added or
 * edited. Claude Code (Haiku) draws each with the diagram skills
 * (.claude/skills/photo-drawings, run by src/server/onboarding/claude-runner)
 * and posts back the drawing kind it stored in `diagrams`; that kind is linked
 * here: a machine photo → its equipment model's diagram_type (so its Overview
 * and 3D twin show the drawing), a plant photo → the plant node's diagram_type.
 */
import pool from "@/server/db";
import { invalidateReadCache } from "@/server/db";
import { InputError, NotFoundError } from "@/server/errors";
import { ensureDatabaseSeeded } from "./industrial-service";

const MAX_BYTES = 20 * 1024 * 1024;
const KIND = /^[a-z0-9][a-z0-9-]{1,62}$/;

export interface AssetImage {
  id: number;
  /** Null while the photo belongs to an Add plant form that is not saved yet. */
  plantId: string | null;
  machineId: string | null;
  /** Set while the photo belongs to an unsaved Add plant / Add machine form. */
  draftKey: string | null;
  subject: "machine" | "plant" | null;
  fileName: string;
  mime: string;
  sizeBytes: number;
  status: "waiting" | "processed" | "failed";
  diagramType: string | null;
  note: string | null;
  createdAt: string;
  processedAt: string | null;
}

interface Row {
  id: number;
  plant_id: string | null;
  machine_id: string | null;
  draft_key: string | null;
  subject: "machine" | "plant" | null;
  subject_name: string | null;
  subject_type: string | null;
  subject_code: string | null;
  file_name: string;
  mime: string;
  size_bytes: number;
  status: AssetImage["status"];
  diagram_type: string | null;
  note: string | null;
  created_at: Date;
  processed_at: Date | null;
}

const COLS =
  "id, plant_id, machine_id, draft_key, subject, subject_name, subject_type, subject_code, file_name, mime, size_bytes, status, diagram_type, note, created_at, processed_at";
const toImage = (r: Row): AssetImage => ({
  id: r.id,
  plantId: r.plant_id,
  machineId: r.machine_id,
  draftKey: r.draft_key,
  subject: r.subject,
  fileName: r.file_name,
  mime: r.mime,
  sizeBytes: r.size_bytes,
  status: r.status,
  diagramType: r.diagram_type,
  note: r.note,
  createdAt: r.created_at.toISOString(),
  processedAt: r.processed_at ? r.processed_at.toISOString() : null,
});

export async function listImages(plantId: string): Promise<AssetImage[]> {
  await ensureDatabaseSeeded();
  const res = await pool.query<Row>(`SELECT ${COLS} FROM asset_images WHERE plant_id = $1 ORDER BY id`, [plantId]);
  return res.rows.map(toImage);
}

export async function addImage(input: { plantId: string; machineId?: string | null; fileName: string; mime: string; bytes: Buffer }): Promise<AssetImage> {
  await ensureDatabaseSeeded();
  if (!input.mime.startsWith("image/") && !/\.(png|jpe?g|webp)$/i.test(input.fileName)) throw new InputError("Upload a photo or drawing (PNG, JPEG or WebP).");
  if (!input.bytes.length) throw new InputError("The file is empty.");
  if (input.bytes.length > MAX_BYTES) throw new InputError(`Photos up to ${MAX_BYTES / 1024 / 1024} MB.`);
  const plant = await pool.query("SELECT 1 FROM plants WHERE id = $1", [input.plantId]);
  if (!plant.rowCount) throw new NotFoundError(`Plant ${input.plantId} not found.`);
  if (input.machineId) {
    const m = await pool.query("SELECT 1 FROM machines WHERE id = $1 AND plant_id = $2", [input.machineId, input.plantId]);
    if (!m.rowCount) throw new InputError(`Machine ${input.machineId} is not in plant ${input.plantId}.`);
  }
  const res = await pool.query<Row>(
    `INSERT INTO asset_images (plant_id, machine_id, file_name, mime, size_bytes, content) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLS}`,
    [input.plantId, input.machineId || null, input.fileName.slice(0, 255), input.mime || "image/png", input.bytes.length, input.bytes],
  );
  return toImage(res.rows[0]);
}

export async function imageContent(id: number): Promise<{ fileName: string; mime: string; bytes: Buffer; plantId: string }> {
  await ensureDatabaseSeeded();
  const res = await pool.query<{ file_name: string; mime: string; content: Buffer; plant_id: string }>("SELECT file_name, mime, content, plant_id FROM asset_images WHERE id = $1", [id]);
  const r = res.rows[0];
  if (!r) throw new NotFoundError(`Photo ${id} not found.`);
  return { fileName: r.file_name, mime: r.mime, bytes: r.content, plantId: r.plant_id };
}

export async function deleteImage(id: number): Promise<void> {
  await ensureDatabaseSeeded();
  await pool.query("DELETE FROM asset_images WHERE id = $1", [id]);
}

/** Result of drawing one photo: the drawing kind stored in `diagrams`, linked to the machine or plant. */
export async function setImageResult(id: number, input: { status: "processed" | "failed"; diagramType?: string | null; note?: string | null }): Promise<AssetImage> {
  await ensureDatabaseSeeded();
  const cur = await pool.query<Row>(`SELECT ${COLS} FROM asset_images WHERE id = $1`, [id]);
  const img = cur.rows[0];
  if (!img) throw new NotFoundError(`Photo ${id} not found.`);
  if (input.status !== "processed" && input.status !== "failed") throw new InputError('status must be "processed" or "failed".');
  const kind = input.status === "processed" ? input.diagramType ?? null : null;
  if (input.status === "processed") {
    if (!kind || !KIND.test(kind)) throw new InputError("A drawn photo needs the diagramType of the drawing stored.");
    const stored = await pool.query("SELECT 1 FROM diagrams WHERE diagram_type = $1", [kind]);
    if (!stored.rowCount) throw new InputError(`No drawing of kind "${kind}" is stored yet: store it with export.mjs --post first.`);
    // A photo of an unsaved form is only previewed; it is linked when the form is saved (attachDraft).
    if (!img.draft_key) await linkDrawing(img.plant_id, img.machine_id, kind);
  }
  const res = await pool.query<Row>(
    `UPDATE asset_images SET status = $2, diagram_type = $3, note = $4, processed_at = NOW() WHERE id = $1 RETURNING ${COLS}`,
    [id, input.status, kind, input.note ?? null],
  );
  invalidateReadCache("all");
  return toImage(res.rows[0]);
}

/** What the drawing processor needs for a plant's waiting photos: each photo with its machine (and that machine's sensor tags) or the plant. */
export async function waitingForDrawing(plantId: string) {
  await ensureDatabaseSeeded();
  const plant = await pool.query<{ id: string; code: string; name: string; diagram_type: string | null }>(
    `SELECT p.id, p.code, p.name, n.diagram_type FROM plants p LEFT JOIN hierarchy_nodes n ON n.plant_id = p.id AND n.type = 'plant' WHERE p.id = $1`,
    [plantId],
  );
  if (!plant.rows[0]) throw new NotFoundError(`Plant ${plantId} not found.`);
  const images = await pool.query<Row>(`SELECT ${COLS} FROM asset_images WHERE plant_id = $1 AND status = 'waiting' ORDER BY id`, [plantId]);
  const machines = await pool.query<{ id: string; code: string; name: string; type_name: string; diagram_type: string }>(
    `SELECT m.id, m.code, m.name, em.type_name, em.diagram_type FROM machines m JOIN equipment_models em ON em.id = m.model_id WHERE m.plant_id = $1 ORDER BY m.code`,
    [plantId],
  );
  const tags = await pool.query<{ machine_id: string; tag: string; name: string; location: string | null }>(
    `SELECT ms.machine_id, me.tag, me.name, mp.location
       FROM measurements me
       JOIN measurement_points mp ON mp.id = me.point_id
       JOIN machine_subassemblies sa ON sa.id = mp.subassembly_id
       JOIN machine_systems ms ON ms.id = sa.machine_system_ref_id
      WHERE ms.machine_id = ANY($1::text[])
      ORDER BY me.tag`,
    [machines.rows.map((m) => m.id)],
  );
  return {
    plant: { id: plant.rows[0].id, code: plant.rows[0].code, name: plant.rows[0].name, diagramType: plant.rows[0].diagram_type },
    machines: machines.rows.map((m) => ({ id: m.id, code: m.code, name: m.name, type: m.type_name, diagramType: m.diagram_type })),
    waiting: images.rows.map((r) => {
      const m = machines.rows.find((x) => x.id === r.machine_id);
      return {
        imageId: r.id,
        fileName: r.file_name,
        shows: r.machine_id ? ("machine" as const) : ("plant" as const),
        kind: r.diagram_type,
        request: r.note,
        machine: m ? { id: m.id, code: m.code, name: m.name, type: m.type_name, diagramType: m.diagram_type } : null,
        points: m ? tags.rows.filter((t) => t.machine_id === m.id).map((t) => ({ tag: t.tag, name: t.name, location: t.location })) : [],
      };
    }),
  };
}

/** Links a drawing kind to the machine (its equipment model; machines of the same model share it) or to the plant node. */
async function linkDrawing(plantId: string | null, machineId: string | null, kind: string) {
  if (machineId) await pool.query("UPDATE equipment_models SET diagram_type = $2 WHERE id = (SELECT model_id FROM machines WHERE id = $1)", [machineId, kind]);
  else if (plantId) await pool.query("UPDATE hierarchy_nodes SET diagram_type = $2 WHERE plant_id = $1 AND type = 'plant'", [plantId, kind]);
}

/* ---------------------------------------------------------------- photos of unsaved forms (preview before adding) */

const DRAFT = /^[A-Za-z0-9-]{8,64}$/;
const kebab = (s: string | null | undefined) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

/** A drawing kind not used yet by any stored drawing or planned photo: "<base>", else "<base>-2", "-3" … */
async function freeKind(base: string): Promise<string> {
  const taken = new Set(
    (
      await pool.query<{ k: string }>(
        "SELECT diagram_type AS k FROM diagrams WHERE diagram_type LIKE $1 UNION SELECT diagram_type FROM asset_images WHERE diagram_type LIKE $1 UNION SELECT diagram_type FROM equipment_models WHERE diagram_type LIKE $1",
        [`${base}%`],
      )
    ).rows.map((r) => r.k),
  );
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

/**
 * A photo picked in an Add plant / Add machine form before saving: stored with
 * what it shows and a planned drawing kind (named after the machine's type or
 * name, or the plant's code), so the form can use that kind straight away.
 */
export async function addDraftImage(input: {
  draftKey: string;
  subject: "machine" | "plant";
  name?: string | null;
  type?: string | null;
  code?: string | null;
  plantId?: string | null;
  fileName: string;
  mime: string;
  bytes: Buffer;
}): Promise<AssetImage> {
  await ensureDatabaseSeeded();
  if (!DRAFT.test(input.draftKey ?? "")) throw new InputError("draftKey is required.");
  if (input.subject !== "machine" && input.subject !== "plant") throw new InputError('subject must be "machine" or "plant".');
  if (!input.mime.startsWith("image/") && !/\.(png|jpe?g|webp)$/i.test(input.fileName)) throw new InputError("Upload a photo or drawing (PNG, JPEG or WebP).");
  if (!input.bytes.length) throw new InputError("The file is empty.");
  if (input.bytes.length > MAX_BYTES) throw new InputError(`Photos up to ${MAX_BYTES / 1024 / 1024} MB.`);
  // Forms left open and never saved: their photos go after two days.
  await pool.query("DELETE FROM asset_images WHERE draft_key IS NOT NULL AND created_at < NOW() - INTERVAL '2 days'");
  const same = await pool.query<{ diagram_type: string }>("SELECT diagram_type FROM asset_images WHERE draft_key = $1 AND diagram_type IS NOT NULL LIMIT 1", [input.draftKey]);
  const base = input.subject === "plant" ? `plant-${kebab(input.code || input.name) || "site"}` : kebab(input.type || input.name) || "machine";
  // Several photos of one form describe one thing: they share its drawing kind.
  const kind = same.rows[0]?.diagram_type ?? (await freeKind(base));
  const res = await pool.query<Row>(
    `INSERT INTO asset_images (plant_id, draft_key, subject, subject_name, subject_type, subject_code, file_name, mime, size_bytes, content, diagram_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING ${COLS}`,
    [
      input.plantId || null,
      input.draftKey,
      input.subject,
      input.name?.trim() || null,
      input.type?.trim() || null,
      input.code?.trim() || null,
      input.fileName.slice(0, 255),
      input.mime || "image/png",
      input.bytes.length,
      input.bytes,
      kind,
    ],
  );
  return toImage(res.rows[0]);
}

export async function listDraft(draftKey: string): Promise<AssetImage[]> {
  await ensureDatabaseSeeded();
  const res = await pool.query<Row>(`SELECT ${COLS} FROM asset_images WHERE draft_key = $1 ORDER BY id`, [draftKey]);
  return res.rows.map(toImage);
}

/** The form was saved: its photos now belong to the new plant / machine, and drawings already made are linked. */
export async function attachDraft(draftKey: string, plantId: string, machineId: string | null): Promise<AssetImage[]> {
  await ensureDatabaseSeeded();
  const res = await pool.query<Row>(`UPDATE asset_images SET plant_id = $2, machine_id = $3, draft_key = NULL WHERE draft_key = $1 RETURNING ${COLS}`, [
    draftKey,
    plantId,
    machineId,
  ]);
  for (const r of res.rows) if (r.status === "processed" && r.diagram_type) await linkDrawing(plantId, machineId, r.diagram_type);
  invalidateReadCache("all");
  return res.rows.map(toImage);
}

/** The form was cancelled: its photos go (drawings already stored stay in `diagrams`). */
export async function deleteDraft(draftKey: string): Promise<void> {
  await ensureDatabaseSeeded();
  await pool.query("DELETE FROM asset_images WHERE draft_key = $1", [draftKey]);
}

/** Draw a photo again (e.g. the preview was not right): back to waiting, same drawing kind. */
export async function redrawImage(id: number, note?: string | null): Promise<AssetImage> {
  await ensureDatabaseSeeded();
  const res = await pool.query<Row>(`UPDATE asset_images SET status = 'waiting', note = $2, processed_at = NULL WHERE id = $1 RETURNING ${COLS}`, [id, note?.trim() || null]);
  if (!res.rows[0]) throw new NotFoundError(`Photo ${id} not found.`);
  return toImage(res.rows[0]);
}

/** The processor's view of a form's waiting photos: what each shows and the planned drawing kind. */
export async function waitingForDraft(draftKey: string) {
  await ensureDatabaseSeeded();
  const rows = (await pool.query<Row>(`SELECT ${COLS} FROM asset_images WHERE draft_key = $1 AND status = 'waiting' ORDER BY id`, [draftKey])).rows;
  const plantId = rows.find((r) => r.plant_id)?.plant_id ?? null;
  const plant = plantId
    ? (await pool.query<{ id: string; code: string; name: string }>("SELECT id, code, name FROM plants WHERE id = $1", [plantId])).rows[0] ?? null
    : null;
  return {
    plant: plant ? { ...plant, diagramType: null } : null,
    machines: [],
    waiting: rows.map((r) => ({
      imageId: r.id,
      fileName: r.file_name,
      shows: r.subject ?? "machine",
      kind: r.diagram_type,
      // The note asks for changes when the photo is drawn again ("the motor sits left of the fan").
      request: r.note,
      machine: r.subject === "machine" ? { id: null, code: r.subject_code, name: r.subject_name, type: r.subject_type, diagramType: r.diagram_type } : null,
      points: [] as Array<{ tag: string; name: string; location: string | null }>,
    })),
  };
}
