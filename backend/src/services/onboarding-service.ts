/**
 * Plant onboarding (migration 033): a package holds the working draft of a new
 * plant — areas (factories, sections), users, machines with their components,
 * measurement points with units, ranges and limits — plus the PDFs and machine
 * images uploaded for it.
 *
 * Uploads are processed outside the server for now (a Claude Code session runs
 * the pdf-extract and diagram skills: .claude/skills/onboarding-process); it
 * fetches each file, then posts back the extract.json or the drawing kind it
 * made, which is merged into the draft here. Later the same results can come
 * from the Claude API on the server; the contract stays the same.
 *
 * Commit writes the draft into the monitoring tables in one transaction.
 */
import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import pool from "@backend/db";
import { invalidateReadCache } from "@backend/db";
import { InputError, NotFoundError } from "@backend/errors";
import { ensureDatabaseSeeded, isTimeZone } from "./industrial-service";
import { buildWorkbook, importWorkbook, type ExcelImportSummary } from "@backend/onboarding/excel";
import {
  emptyDraft,
  guessQuantity,
  type DraftMachine,
  type DraftPoint,
  type OnboardingDraft,
  type OnboardingFile,
  type OnboardingPackage,
  type OnboardingStatus,
} from "@shared/types/onboarding";

const MAX_FILE_BYTES = 30 * 1024 * 1024;

interface PackageRow {
  id: string;
  name: string;
  status: OnboardingStatus;
  draft: OnboardingDraft;
  plant_id: string | null;
  created_at: Date;
  updated_at: Date;
  committed_at: Date | null;
}

interface FileRow {
  id: number;
  kind: "document" | "image";
  machine_key: string | null;
  file_name: string;
  mime: string;
  size_bytes: number;
  status: "waiting" | "processed" | "failed";
  note: string | null;
  result: unknown;
  created_at: Date;
  processed_at: Date | null;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const iso = (d: Date | null) => (d ? d.toISOString() : null);

const KIND_WORDS: Record<string, string> = {
  "sensor-list": "Sensor list",
  "technical-spec": "Technical specification",
  datasheet: "Datasheet",
  manual: "Manual",
  "maintenance-checklist": "Maintenance checklist",
  drawing: "Drawing",
  "plant-overview": "Plant overview",
  "org-chart": "Organisation chart",
  report: "Report",
  contract: "Contract",
  policy: "Policy",
  other: "Document",
};

function fileSummary(f: FileRow): string | null {
  const r = f.result as Record<string, unknown> | null;
  if (!r) return null;
  if (f.kind === "image") return typeof r.diagramType === "string" ? `Drawing made (${r.diagramType})` : null;
  const n = (k: string) => (Array.isArray(r[k]) ? (r[k] as unknown[]).length : 0);
  const count = (k: string, one: string, many: string) => (n(k) ? `${n(k)} ${n(k) === 1 ? one : many}` : null);
  const kind = KIND_WORDS[String(r.kind)] ?? "Document";
  return [kind, count("machines", "machine", "machines"), count("points", "sensor", "sensors"), count("maintenance", "maintenance task", "maintenance tasks")]
    .filter(Boolean)
    .join(" · ");
}

const toFile = (f: FileRow): OnboardingFile => ({
  id: f.id,
  kind: f.kind,
  machineKey: f.machine_key,
  fileName: f.file_name,
  mime: f.mime,
  sizeBytes: f.size_bytes,
  status: f.status,
  note: f.note,
  summary: fileSummary(f),
  createdAt: f.created_at.toISOString(),
  processedAt: iso(f.processed_at),
});

function normaliseDraft(d: unknown, name: string): OnboardingDraft {
  const base = emptyDraft(name);
  const x = (d ?? {}) as Partial<OnboardingDraft>;
  return {
    format: "ultron.onboarding/1",
    plant: { ...base.plant, ...(x.plant ?? {}) },
    areas: Array.isArray(x.areas) ? x.areas : [],
    users: Array.isArray(x.users) ? x.users : [],
    machines: Array.isArray(x.machines) ? x.machines.map((m) => ({ ...m, components: Array.isArray(m.components) ? m.components : [] })) : [],
    points: Array.isArray(x.points) ? x.points : [],
    gaps: Array.isArray(x.gaps) ? x.gaps : [],
  };
}

/* ---------------------------------------------------------------- packages */

export async function listPackages(): Promise<Array<Omit<OnboardingPackage, "draft" | "files"> & { files: number; machines: number; points: number }>> {
  await ensureDatabaseSeeded();
  const res = await pool.query<PackageRow & { files: string }>(
    `SELECT p.*, (SELECT COUNT(*) FROM onboarding_files f WHERE f.package_id = p.id) AS files
       FROM onboarding_packages p ORDER BY p.updated_at DESC`,
  );
  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    plantId: r.plant_id,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    committedAt: iso(r.committed_at),
    files: Number(r.files),
    machines: normaliseDraft(r.draft, r.name).machines.length,
    points: normaliseDraft(r.draft, r.name).points.length,
  }));
}

export async function getPackage(id: string): Promise<OnboardingPackage> {
  await ensureDatabaseSeeded();
  const res = await pool.query<PackageRow>("SELECT * FROM onboarding_packages WHERE id = $1", [id]);
  const r = res.rows[0];
  if (!r) throw new NotFoundError(`Onboarding ${id} not found.`);
  const files = await pool.query<FileRow>(
    `SELECT id, kind, machine_key, file_name, mime, size_bytes, status, note, result, created_at, processed_at
       FROM onboarding_files WHERE package_id = $1 ORDER BY id`,
    [id],
  );
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    draft: normaliseDraft(r.draft, r.name),
    plantId: r.plant_id,
    files: files.rows.map(toFile),
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    committedAt: iso(r.committed_at),
  };
}

export async function createPackage(name: string, userId: string | null): Promise<OnboardingPackage> {
  await ensureDatabaseSeeded();
  const n = (name ?? "").trim();
  if (!n) throw new InputError("Name the plant you are onboarding.");
  const id = `onb-${randomUUID().slice(0, 8)}`;
  await pool.query("INSERT INTO onboarding_packages (id, name, draft, created_by) VALUES ($1, $2, $3::jsonb, $4)", [
    id,
    n,
    JSON.stringify(emptyDraft(n)),
    userId,
  ]);
  return getPackage(id);
}

async function editable(id: string): Promise<PackageRow> {
  const res = await pool.query<PackageRow>("SELECT * FROM onboarding_packages WHERE id = $1", [id]);
  const r = res.rows[0];
  if (!r) throw new NotFoundError(`Onboarding ${id} not found.`);
  if (r.status === "committed") throw new InputError("This onboarding is already committed; start a new one to add more.");
  return r;
}

export async function saveDraft(id: string, draft: unknown): Promise<OnboardingPackage> {
  await ensureDatabaseSeeded();
  const r = await editable(id);
  const d = normaliseDraft(draft, r.name);
  await pool.query("UPDATE onboarding_packages SET draft = $2::jsonb, name = COALESCE(NULLIF($3, ''), name), updated_at = NOW() WHERE id = $1", [
    id,
    JSON.stringify(d),
    d.plant.name?.trim() ?? "",
  ]);
  return getPackage(id);
}

export async function deletePackage(id: string): Promise<void> {
  await ensureDatabaseSeeded();
  const res = await pool.query("DELETE FROM onboarding_packages WHERE id = $1 AND status <> 'committed'", [id]);
  if (!res.rowCount) throw new NotFoundError(`Onboarding ${id} not found (or already committed).`);
}

/* ---------------------------------------------------------------- files */

export async function addFile(
  id: string,
  /** machineKey: the draft key of the machine or area (factory, line) a photo shows. */
  input: { fileName: string; mime: string; bytes: Buffer; machineKey?: string | null },
): Promise<OnboardingFile> {
  await ensureDatabaseSeeded();
  await editable(id);
  const mime = input.mime || "application/octet-stream";
  const kind = mime === "application/pdf" || /\.pdf$/i.test(input.fileName) ? "document" : mime.startsWith("image/") ? "image" : null;
  if (!kind) throw new InputError("Upload PDF documents or machine images (PNG, JPEG, WebP).");
  if (!input.bytes.length) throw new InputError("The file is empty.");
  if (input.bytes.length > MAX_FILE_BYTES) throw new InputError(`Files up to ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
  const res = await pool.query<FileRow>(
    `INSERT INTO onboarding_files (package_id, kind, machine_key, file_name, mime, size_bytes, content)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, kind, machine_key, file_name, mime, size_bytes, status, note, result, created_at, processed_at`,
    [id, kind, kind === "image" ? input.machineKey ?? null : null, input.fileName.slice(0, 255), mime, input.bytes.length, input.bytes],
  );
  await pool.query("UPDATE onboarding_packages SET status = 'waiting', updated_at = NOW() WHERE id = $1", [id]);
  return toFile(res.rows[0]);
}

export async function deleteFile(id: string, fileId: number): Promise<void> {
  await ensureDatabaseSeeded();
  await editable(id);
  await pool.query("DELETE FROM onboarding_files WHERE id = $1 AND package_id = $2", [fileId, id]);
  await refreshStatus(id);
}

export async function fileContent(id: string, fileId: number): Promise<{ fileName: string; mime: string; bytes: Buffer }> {
  await ensureDatabaseSeeded();
  const res = await pool.query<{ file_name: string; mime: string; content: Buffer }>(
    "SELECT file_name, mime, content FROM onboarding_files WHERE id = $1 AND package_id = $2",
    [fileId, id],
  );
  const r = res.rows[0];
  if (!r) throw new NotFoundError(`File ${fileId} not found.`);
  return { fileName: r.file_name, mime: r.mime, bytes: r.content };
}

async function refreshStatus(id: string) {
  const res = await pool.query<{ waiting: string; total: string }>(
    "SELECT COUNT(*) FILTER (WHERE status = 'waiting') AS waiting, COUNT(*) AS total FROM onboarding_files WHERE package_id = $1",
    [id],
  );
  const { waiting, total } = res.rows[0];
  const status: OnboardingStatus = Number(total) === 0 ? "draft" : Number(waiting) > 0 ? "waiting" : "processed";
  await pool.query("UPDATE onboarding_packages SET status = $2, updated_at = NOW() WHERE id = $1 AND status <> 'committed'", [id, status]);
}

/**
 * Result of processing one upload (posted by the offline processor):
 * document → `result` is the pdf-extract skill's extract.json, merged into the draft;
 * image → `result` is `{ diagramType }` of the drawing made (saved in `diagrams`), set on its machine.
 */
export async function setFileResult(
  id: string,
  fileId: number,
  input: { status: "processed" | "failed"; note?: string | null; result?: unknown },
): Promise<OnboardingPackage> {
  await ensureDatabaseSeeded();
  const pkg = await editable(id);
  const f = await pool.query<FileRow>("SELECT * FROM onboarding_files WHERE id = $1 AND package_id = $2", [fileId, id]);
  const file = f.rows[0];
  if (!file) throw new NotFoundError(`File ${fileId} not found.`);
  if (input.status !== "processed" && input.status !== "failed") throw new InputError('status must be "processed" or "failed".');
  let draft = normaliseDraft(pkg.draft, pkg.name);
  if (input.status === "processed") {
    if (file.kind === "document") {
      const x = input.result as { schema?: string } | null;
      if (!x || x.schema !== "ultron.extract/1") throw new InputError('A document result must be an extract.json (schema "ultron.extract/1").');
      draft = mergeExtract(draft, x as Extract, fileId, file.file_name);
    } else {
      const t = (input.result as { diagramType?: string } | null)?.diagramType;
      if (!t || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(t)) throw new InputError("An image result needs the diagramType of the drawing made.");
      // A photo shows a machine or an area (factory, line); its drawing goes on whichever it is.
      const m = draft.machines.find((mm) => mm.key === file.machine_key);
      const a = draft.areas.find((aa) => aa.key === file.machine_key);
      if (m) m.diagramType = t;
      else if (a) a.diagramType = t;
    }
  }
  await pool.query("UPDATE onboarding_files SET status = $3, note = $4, result = $5::jsonb, processed_at = NOW() WHERE id = $1 AND package_id = $2", [
    fileId,
    id,
    input.status,
    input.note ?? null,
    input.result === undefined ? null : JSON.stringify(input.result),
  ]);
  await pool.query("UPDATE onboarding_packages SET draft = $2::jsonb, updated_at = NOW() WHERE id = $1", [id, JSON.stringify(draft)]);
  await refreshStatus(id);
  return getPackage(id);
}

/* ---------------------------------------------------------------- extract → draft */

interface Range {
  lo: number | null;
  hi: number | null;
  text: string | null;
}
interface Extract {
  schema: "ultron.extract/1";
  document?: { title?: string | null; number?: string | null };
  plant?: { name?: string | null; location?: string | null; region?: string | null; time_zone?: string | null; description?: string | null; capacity?: string | null } | null;
  areas?: Array<{ name?: string | null; parent?: string | null }>;
  machines?: Array<{ code?: string | null; name?: string | null; type?: string | null; area?: string | null; manufacturer?: string | null; model?: string | null; power?: string | null; speed?: string | null; source?: { page?: number } }>;
  components?: Array<{ machine?: string | null; name?: string | null }>;
  points?: Array<{
    tag: string;
    name?: string | null;
    machine?: string | null;
    component?: string | null;
    location?: string | null;
    signal_type?: string | null;
    unit?: string | null;
    value_kind?: "analog" | "state";
    origin?: "online" | "manual" | "calculated";
    range?: Range | null;
    nominal?: Range | null;
    limits?: { ll?: number | null; l?: number | null; h?: number | null; hh?: number | null; text?: string | null };
    priority?: string | null;
    remarks?: string | null;
    source?: { page?: number };
  }>;
  people?: Array<{ name?: string | null; role?: string | null; email?: string | null }>;
  gaps?: string[];
}

const same = (a: string | null | undefined, b: string | null | undefined) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Adds what an extract says to the draft; what the draft already holds wins (a reviewer may have edited it). */
export function mergeExtract(draft: OnboardingDraft, x: Extract, fileId: number, fileName: string): OnboardingDraft {
  const d: OnboardingDraft = JSON.parse(JSON.stringify(draft));
  const p = x.plant;
  if (p) {
    d.plant.name ||= p.name ?? "";
    d.plant.location ??= p.location ?? null;
    d.plant.region ??= p.region ?? null;
    d.plant.timeZone ??= p.time_zone ?? null;
    d.plant.description ??= p.description ?? null;
    d.plant.designCapacity ??= p.capacity ?? null;
  }
  for (const a of x.areas ?? []) {
    if (!a.name || d.areas.some((e) => same(e.name, a.name))) continue;
    const parent = d.areas.find((e) => same(e.name, a.parent));
    d.areas.push({ key: `a-${slug(a.name)}-${d.areas.length + 1}`, name: a.name, parentKey: parent?.key ?? null, diagramType: null });
  }
  const machineOf = (ref: string | null | undefined): DraftMachine | undefined =>
    ref ? d.machines.find((m) => same(m.code, ref) || same(m.name, ref)) : undefined;
  for (const m of x.machines ?? []) {
    const name = m.name ?? m.code;
    if (!name) continue;
    let dm = machineOf(m.code) ?? machineOf(m.name);
    if (!dm) {
      dm = {
        key: `m-${slug(m.code || name)}`,
        code: m.code ?? "",
        name,
        areaKey: d.areas.find((a) => same(a.name, m.area))?.key ?? null,
        type: m.type ?? null,
        manufacturer: m.manufacturer ?? null,
        model: m.model ?? null,
        powerRating: m.power ?? null,
        operatingSpeed: m.speed ?? null,
        criticality: "B (Essential)",
        diagramType: null,
        components: [],
        source: { fileId, page: m.source?.page ?? null },
      };
      while (d.machines.some((e) => e.key === dm!.key)) dm.key += "-2";
      d.machines.push(dm);
    } else {
      dm.code ||= m.code ?? "";
      dm.type ??= m.type ?? null;
      dm.manufacturer ??= m.manufacturer ?? null;
      dm.model ??= m.model ?? null;
      dm.powerRating ??= m.power ?? null;
      dm.operatingSpeed ??= m.speed ?? null;
    }
  }
  const componentOf = (m: DraftMachine, name: string) => {
    let c = m.components.find((cc) => same(cc.name, name));
    if (!c) {
      c = { key: `c-${slug(name)}-${m.components.length + 1}`, name };
      m.components.push(c);
    }
    return c;
  };
  for (const c of x.components ?? []) {
    const m = machineOf(c.machine);
    if (m && c.name) componentOf(m, c.name);
  }
  for (const pt of x.points ?? []) {
    if (!pt.tag || d.points.some((e) => e.tag === pt.tag)) continue;
    const m = machineOf(pt.machine) ?? (d.machines.length === 1 ? d.machines[0] : undefined);
    const comp = m && pt.component ? componentOf(m, pt.component) : null;
    const valueKind = pt.value_kind === "state" ? "state" : "analog";
    const point: DraftPoint = {
      key: `p-${slug(pt.tag)}`,
      tag: pt.tag,
      name: pt.name ?? pt.tag,
      machineKey: m?.key ?? null,
      componentKey: comp?.key ?? null,
      location: pt.location ?? null,
      quantity: guessQuantity(pt.tag, pt.unit ?? null, valueKind),
      unit: pt.unit ?? null,
      valueKind,
      origin: pt.origin ?? "online",
      signalType: pt.signal_type ?? null,
      rangeLo: pt.range?.lo ?? null,
      rangeHi: pt.range?.hi ?? null,
      rangeText: pt.range?.text ?? null,
      nominalLo: pt.nominal?.lo ?? null,
      nominalHi: pt.nominal?.hi ?? null,
      nominalText: pt.nominal?.text ?? null,
      ll: pt.limits?.ll ?? null,
      l: pt.limits?.l ?? null,
      h: pt.limits?.h ?? null,
      hh: pt.limits?.hh ?? null,
      limitsText: pt.limits?.text ?? null,
      priority: pt.priority ?? null,
      remarks: pt.remarks ?? null,
      source: { fileId, page: pt.source?.page ?? null },
    };
    d.points.push(point);
  }
  for (const person of x.people ?? []) {
    if (!person.name || !person.email || d.users.some((u) => same(u.email, person.email))) continue;
    d.users.push({ key: `u-${slug(person.email)}`, fullName: person.name, email: person.email, title: person.role ?? null, department: null, roleId: "", access: "write" });
  }
  const title = x.document?.title || fileName;
  for (const g of x.gaps ?? []) if (g && !d.gaps.includes(`${title}: ${g}`)) d.gaps.push(`${title}: ${g}`);
  return d;
}

/* ---------------------------------------------------------------- commit */

/** What stops a commit (plain sentences); empty when the draft can be committed. */
export function draftProblems(d: OnboardingDraft): string[] {
  const out: string[] = [];
  if (!d.plant.name?.trim()) out.push("The plant has no name.");
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{1,30}$/.test(d.plant.code ?? "")) out.push("The plant needs a short code (letters, digits and dashes, e.g. LUM-04).");
  if (!d.plant.timeZone || !isTimeZone(d.plant.timeZone)) out.push("The plant needs its time zone (e.g. Africa/Lusaka).");
  const codes = new Set<string>();
  for (const m of d.machines) {
    if (!m.name?.trim()) out.push("A machine has no name.");
    if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,30}$/.test(m.code ?? "")) out.push(`Machine "${m.name}" needs a code (e.g. KLN-01).`);
    else if (codes.has(m.code.toUpperCase())) out.push(`Two machines use the code ${m.code}.`);
    codes.add((m.code ?? "").toUpperCase());
  }
  const tags = new Set<string>();
  for (const p of d.points) {
    const m = d.machines.find((mm) => mm.key === p.machineKey);
    if (!m) out.push(`Sensor ${p.tag} is not on a machine.`);
    else if (!m.components.some((c) => c.key === p.componentKey)) out.push(`Sensor ${p.tag} is not on a part of ${m.name}.`);
    if (!p.quantity) out.push(`Sensor ${p.tag}: choose what it measures.`);
    if (tags.has(p.tag)) out.push(`Sensor tag ${p.tag} is used twice.`);
    tags.add(p.tag);
  }
  for (const u of d.users) {
    if (!u.email?.includes("@")) out.push(`User ${u.fullName || "(no name)"} needs an email address.`);
    if (!u.roleId) out.push(`User ${u.fullName || u.email} needs a role.`);
  }
  return [...new Set(out)];
}

/**
 * One multi-row `INSERT … VALUES (…), (…) [tail]` per chunk (Postgres allows
 * 65 535 parameters a statement); rows come back in the order given.
 */
async function insertRows<R extends QueryResultRow = QueryResultRow>(client: PoolClient, head: string, rows: unknown[][], tail = ""): Promise<R[]> {
  const out: R[] = [];
  if (!rows.length) return out;
  const per = Math.max(1, Math.floor(60000 / rows[0].length));
  for (let i = 0; i < rows.length; i += per) {
    const params: unknown[] = [];
    const values = rows
      .slice(i, i + per)
      .map((r) => `(${r.map((v) => `$${params.push(v)}`).join(", ")})`)
      .join(", ");
    out.push(...(await client.query<R>(`${head} VALUES ${values} ${tail}`, params)).rows);
  }
  return out;
}

/** Writes the draft into the monitoring tables; `dryRun` does every write and rolls back (a full check against the DB). */
export async function commitPackage(id: string, dryRun = false): Promise<{ plantId: string; machines: number; points: number; users: number; dryRun: boolean }> {
  await ensureDatabaseSeeded();
  const pkg = await editable(id);
  const d = normaliseDraft(pkg.draft, pkg.name);
  const problems = draftProblems(d);
  if (problems.length) throw new InputError(problems.slice(0, 12).join(" "));

  const plantCode = d.plant.code.trim().toUpperCase();
  const plantSlug = slug(plantCode);
  const plantId = `plant-${plantSlug}`;
  const docNames = new Map<number, string>(
    (await pool.query<{ id: number; file_name: string }>("SELECT id, file_name FROM onboarding_files WHERE package_id = $1", [id])).rows.map((r) => [r.id, r.file_name]),
  );
  let points = 0;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if ((await client.query("SELECT 1 FROM plants WHERE UPPER(code) = $1 OR id = $2", [plantCode, plantId])).rowCount)
      throw new InputError(`Plant code ${plantCode} is already in use.`);
    await client.query(
      `INSERT INTO plants (id, code, name, short_name, region, location, coordinates, time_zone, service_state, description, design_capacity, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Operational', $9, $10, COALESCE((SELECT MAX(sort_order) + 1 FROM plants), 0))`,
      [plantId, plantCode, d.plant.name.trim(), d.plant.shortName?.trim() || d.plant.name.trim().slice(0, 64), d.plant.region, d.plant.location, d.plant.coordinates, d.plant.timeZone, d.plant.description, d.plant.designCapacity],
    );
    // Plant and machine nodes keep no name of their own: v_hierarchy_nodes reads the plant's / machine's.
    await client.query("INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, sort_order) VALUES ($1, $1, NULL, NULL, 'plant', 900)", [plantId]);

    // Areas (factories, sections), parents first.
    const areaNode = new Map<string, string>();
    const pending = [...d.areas];
    for (let guard = 0; pending.length && guard < 50; guard++) {
      for (const a of [...pending]) {
        if (a.parentKey && !areaNode.has(a.parentKey) && d.areas.some((x) => x.key === a.parentKey)) continue;
        const nodeId = `area-${plantSlug}-${areaNode.size + 1}`;
        await client.query("INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, sort_order, diagram_type) VALUES ($1, $2, $3, $4, 'area', $5, $6)", [
          nodeId,
          plantId,
          (a.parentKey && areaNode.get(a.parentKey)) || plantId,
          a.name.trim(),
          areaNode.size + 1,
          a.diagramType ?? null,
        ]);
        areaNode.set(a.key, nodeId);
        pending.splice(pending.indexOf(a), 1);
      }
    }

    // Plant admins and the onboarded users.
    await client.query(
      `INSERT INTO user_plant_access (user_id, plant_id, access_level)
       SELECT u.id, $1, 'admin' FROM users u JOIN roles r ON r.id = u.role_id WHERE r.can_manage_plants
       ON CONFLICT (user_id, plant_id) DO NOTHING`,
      [plantId],
    );
    for (const u of d.users) {
      const email = u.email.trim().toLowerCase();
      const existing = await client.query<{ id: string }>("SELECT id FROM users WHERE LOWER(email) = $1", [email]);
      let userId = existing.rows[0]?.id;
      if (!userId) {
        userId = `usr-${randomUUID().slice(0, 8)}`;
        await client.query(
          `INSERT INTO users (id, email, full_name, title, department, role_id, status, default_plant_id, last_active_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7, NOW())`,
          [userId, email, u.fullName.trim(), u.title?.trim() || null, u.department?.trim() || null, u.roleId, plantId],
        );
      }
      await client.query(
        `INSERT INTO user_plant_access (user_id, plant_id, access_level) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, plant_id) DO UPDATE SET access_level = EXCLUDED.access_level`,
        [userId, plantId, u.access],
      );
    }

    // Units by symbol, resolved once up front; a unit the plant uses that the catalogue lacks is added.
    const units = new Map((await client.query<{ id: string; symbol: string }>("SELECT id, symbol FROM units")).rows.map((r) => [r.symbol.toLowerCase(), r.id]));
    const newUnits: unknown[][] = [];
    for (const m of d.machines)
      for (const p of d.points) {
        const s = p.machineKey === m.key && p.valueKind !== "state" ? p.unit?.trim() : null;
        if (!s || units.has(s.toLowerCase())) continue;
        const uid = `u-${slug(s) || randomUUID().slice(0, 6)}`.slice(0, 32);
        newUnits.push([uid, s.slice(0, 32), s.slice(0, 32)]);
        units.set(s.toLowerCase(), uid);
      }
    await insertRows(client, "INSERT INTO units (id, symbol, name)", newUnits, "ON CONFLICT DO NOTHING");
    const unitId = (symbol: string | null) => {
      const s = symbol?.trim();
      return s ? (units.get(s.toLowerCase()) ?? null) : null;
    };
    const healthModel = (await client.query<{ id: string }>("SELECT id FROM health_models ORDER BY id LIMIT 1")).rows[0]?.id ?? null;
    const sheetPads = new Map<string, { w: number; h: number; pads: Record<string, [number, number]> }>();
    for (const r of (await client.query<{ diagram_type: string; data: { width: number; height: number; pads: Record<string, [number, number]> } }>("SELECT diagram_type, data FROM diagrams WHERE kind = '2d'")).rows)
      sheetPads.set(r.diagram_type, { w: r.data.width, h: r.data.height, pads: r.data.pads ?? {} });

    // Rows for every machine are gathered first, then written one table at a time (a few round trips, not one per row).
    const modelRows: unknown[][] = [];
    const machineRows: unknown[][] = [];
    const nodeRows: unknown[][] = [];
    const systemRows: unknown[][] = [];
    const subRows: unknown[][] = [];
    const pointRows: unknown[][] = [];
    const placed: Array<{ p: DraftPoint; machineId: string; sortOrder: number }> = [];
    for (const [mi, m] of d.machines.entries()) {
      const code = m.code.trim().toUpperCase();
      const machineId = `${plantCode}-${slug(code).toUpperCase()}`;
      const modelId = `mdl-${plantSlug}-${slug(code)}`;
      modelRows.push([
        modelId,
        (m.type || m.name).trim(),
        m.manufacturer?.trim() || "TBC — nameplate pending (plant asset register)",
        m.model?.trim() || `TBC (${plantCode} ${code})`,
        m.powerRating?.trim() || null,
        m.operatingSpeed?.trim() || null,
        m.diagramType || slug(m.type || m.name) || "pump",
      ]);
      machineRows.push([machineId, plantId, modelId, m.name.trim(), code, m.criticality, "Operational", healthModel]);
      nodeRows.push([`mach-${machineId.toLowerCase()}`, plantId, (m.areaKey && areaNode.get(m.areaKey)) || plantId, null, "machine", machineId, mi + 1]);
      // Each component: one system with one sub-assembly of the same name.
      const subOf = new Map<string, string>();
      for (const [ci, c] of m.components.entries()) {
        const sys = slug(c.name).slice(0, 40) || `part-${ci + 1}`;
        const sysRef = `${machineId}-${sys}`;
        systemRows.push([sysRef, machineId, sys, `P${ci + 1}`, c.name.trim(), c.name.trim().slice(0, 128), ci]);
        subRows.push([sysRef, sysRef, sys, c.name.trim(), c.name.trim().slice(0, 128), ci]);
        subOf.set(c.key, sysRef);
      }
      const sheet = m.diagramType ? sheetPads.get(m.diagramType) : undefined;
      for (const [pi, p] of d.points.filter((pp) => pp.machineKey === m.key).entries()) {
        const pad = sheet?.pads[p.tag];
        pointRows.push([
          subOf.get(p.componentKey ?? "")!,
          p.tag.slice(0, 32),
          p.location,
          pad ? Math.round((pad[0] / sheet!.w) * 10000) / 100 : null,
          pad ? Math.round((pad[1] / sheet!.h) * 10000) / 100 : null,
        ]);
        placed.push({ p, machineId, sortOrder: pi + 1 });
      }
    }
    await insertRows(client, "INSERT INTO equipment_models (id, type_name, manufacturer, model_number, power_rating, operating_speed, diagram_type)", modelRows);
    await insertRows(client, "INSERT INTO machines (id, plant_id, model_id, name, code, criticality, service_state, health_model_id)", machineRows);
    await insertRows(client, "INSERT INTO hierarchy_nodes (id, plant_id, parent_id, name, type, machine_id, sort_order)", nodeRows);
    await insertRows(client, "INSERT INTO machine_systems (id, machine_id, system_id, part_code, name, short_name, sort_order)", systemRows);
    await insertRows(client, "INSERT INTO machine_subassemblies (id, machine_system_ref_id, subassembly_id, name, short_name, sort_order)", subRows);
    const pointIds = await insertRows<{ id: number; subassembly_id: string; code: string }>(
      client,
      "INSERT INTO measurement_points (subassembly_id, code, location, diagram_x, diagram_y)",
      pointRows,
      "RETURNING id, subassembly_id, code",
    );
    if (pointIds.length !== pointRows.length || pointIds.some((r, i) => r.subassembly_id !== pointRows[i][0] || r.code !== pointRows[i][1]))
      throw new Error("Measurement points came back out of order.");

    const measurementRows: unknown[][] = [];
    const rangeRows: unknown[][] = [];
    const limitRows: unknown[][] = [];
    for (const [i, { p, machineId, sortOrder }] of placed.entries()) {
      const mid = `${machineId}-${p.tag}`;
      const statistic = p.valueKind === "state" ? "state" : p.origin === "calculated" ? "calculated" : p.quantity?.startsWith("vibration") ? "rms" : "instantaneous";
      measurementRows.push([
        mid,
        pointIds[i].id,
        p.tag,
        p.name.trim() || p.tag,
        p.quantity,
        p.valueKind === "state" ? null : unitId(p.unit),
        statistic,
        p.origin,
        p.valueKind,
        p.rangeLo,
        p.rangeHi,
        p.signalType,
        p.priority,
        p.rangeText,
        p.nominalText?.slice(0, 128) ?? null,
        p.source?.fileId ? docNames.get(p.source.fileId) ?? null : null,
        // The sensor pages read calculated and hand-typed sensors from install_status, as in the rest of the catalog.
        p.origin === "calculated" ? "Calculated" : p.origin === "manual" ? "Manual" : null,
        sortOrder,
      ]);
      const doc = p.source?.fileId ? docNames.get(p.source.fileId) : null;
      if (doc || p.rangeText || p.limitsText) {
        rangeRows.push([
          mid,
          (doc ?? "Onboarding").slice(0, 64),
          (p.unit ?? "–").slice(0, 48),
          p.rangeText ?? "–",
          p.nominalText ?? "–",
          p.ll === null ? "–" : String(p.ll),
          p.l === null ? "–" : String(p.l),
          p.h === null ? "–" : String(p.h),
          p.hh === null ? "–" : String(p.hh),
          p.remarks,
          p.rangeLo,
          p.rangeHi,
          p.nominalLo,
          p.nominalHi,
          p.ll,
          p.l,
          p.h,
          p.hh,
          p.rangeHi !== null || p.ll !== null || p.l !== null || p.h !== null || p.hh !== null ? "same" : "none",
          p.limitsText,
        ]);
      }
      // Limits from the set-points: both sides → band, else high or low.
      const hi = p.h !== null || p.hh !== null;
      const lo = p.l !== null || p.ll !== null;
      if (p.valueKind === "analog" && (hi || lo)) {
        const kind = hi && lo ? "band" : hi ? "hi" : "lo";
        limitRows.push([
          mid,
          kind,
          kind === "hi" ? p.h : kind === "lo" ? p.l : null,
          kind === "hi" ? p.hh : kind === "lo" ? p.ll : null,
          kind === "band" ? p.l : null,
          kind === "band" ? p.h : null,
          kind === "band" ? p.ll : null,
          kind === "band" ? p.hh : null,
          doc ? `Onboarding: ${doc}` : "Onboarding",
          p.limitsText,
          "provisional",
        ]);
      }
      points++;
    }
    await insertRows(
      client,
      `INSERT INTO measurements (id, point_id, tag, name, quantity_id, unit_id, statistic_id, origin_id, value_kind, range_lo, range_hi,
                                 sensor_type, priority, range_text, normal_text, spec_reference, install_status, sort_order)`,
      measurementRows,
    );
    await insertRows(
      client,
      `INSERT INTO measurement_ranges (measurement_id, document, doc_unit, design_text, nominal_text, ll_text, l_text, h_text, hh_text,
                                       remarks, design_lo, design_hi, nominal_lo, nominal_hi, ll, l, h, hh, conversion, basis)`,
      rangeRows,
    );
    await insertRows(
      client,
      "INSERT INTO measurement_limits (measurement_id, kind_id, warn_value, alarm_value, warn_lo, warn_hi, alarm_lo, alarm_hi, source, note, approval)",
      limitRows,
    );
    if (dryRun) {
      await client.query("ROLLBACK");
    } else {
      await client.query("UPDATE onboarding_packages SET status = 'committed', plant_id = $2, committed_at = NOW(), updated_at = NOW() WHERE id = $1", [id, plantId]);
      await client.query("COMMIT");
    }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (err instanceof Error && /duplicate key/.test(err.message)) throw new InputError(`Something with the same id already exists: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
  if (!dryRun) invalidateReadCache("all");
  return { plantId, machines: d.machines.length, points, users: d.users.length, dryRun };
}

/* ---------------------------------------------------------------- reference lists for the form */

export async function onboardingReference(): Promise<{
  quantities: Array<{ id: string; name: string }>;
  units: Array<{ id: string; symbol: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
}> {
  await ensureDatabaseSeeded();
  const [q, u, r] = await Promise.all([
    pool.query<{ id: string; name: string }>("SELECT id, name FROM quantities ORDER BY name"),
    pool.query<{ id: string; symbol: string; name: string }>("SELECT id, symbol, name FROM units ORDER BY symbol"),
    pool.query<{ id: string; name: string }>("SELECT id, name FROM roles ORDER BY sort_order, name"),
  ]);
  return { quantities: q.rows, units: u.rows, roles: r.rows };
}

/* ---------------------------------------------------------------- Excel format */

/** The draft as the Excel format (Plant, Areas, Machines, Parts, Sensors sheets); a new onboarding gives the blank format. */
export async function draftWorkbook(id: string): Promise<{ fileName: string; bytes: Buffer }> {
  const pkg = await getPackage(id);
  const bytes = await buildWorkbook(pkg.draft, await onboardingReference());
  const name = slug(pkg.draft.plant.code || pkg.draft.plant.name || pkg.name) || "plant";
  return { fileName: `${name}-asset-hierarchy.xlsx`, bytes };
}

/**
 * A filled-in Excel format read into the draft the page is editing (or the
 * stored one). Nothing is saved here: the page applies the result and its
 * autosave stores it, so edits not saved yet are kept.
 */
export async function importDraftWorkbook(id: string, bytes: Buffer, draft: unknown): Promise<{ draft: OnboardingDraft; summary: ExcelImportSummary }> {
  const r = await editable(id);
  if (bytes.length > MAX_FILE_BYTES) throw new InputError("The workbook is larger than 30 MB.");
  const base = normaliseDraft(draft ?? r.draft, r.name);
  return importWorkbook(bytes, base, await onboardingReference());
}
