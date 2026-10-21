/**
 * Generated diagrams kept as data (table `diagrams`, migration 033): 2D sheets
 * (format ultron.sheet2d/1: static SVG markup + pads) and 3D models (format
 * ultron.kit3d/1: captured kit meshes), one per drawing kind and dimension.
 * Written by scripts/diagram-lab/export.mjs --save or POST /api/diagrams.
 *
 * Read straight from the pool (not the read cache): the export script writes
 * from outside the server.
 */
import pool from "@backend/db";
import { ensureDatabaseSeeded } from "./industrial-service";
import { InputError, NotFoundError } from "@backend/errors";

export type DiagramKind = "2d" | "3d";

export interface DiagramMeta {
  id: string;
  diagramType: string;
  kind: DiagramKind;
  name: string;
  source: string | null;
  updatedAt: string;
}

export interface DiagramRecord extends DiagramMeta {
  data: unknown;
}

const TYPE = /^[a-z0-9][a-z0-9-]{1,62}$/;
/** Markup the 2D renderer injects must be plain drawing: no scripts, handlers, embeds or links out. */
const UNSAFE_SVG = /<\s*(script|foreignObject|iframe|object|embed|image|a)\b|\son[a-z]+\s*=|javascript:|(?:xlink:)?href\s*=\s*["'](?!#)/i;

interface Row {
  id: string;
  diagram_type: string;
  kind: DiagramKind;
  name: string;
  source: string | null;
  updated_at: Date;
  data?: unknown;
}

const meta = (r: Row): DiagramMeta => ({ id: r.id, diagramType: r.diagram_type, kind: r.kind, name: r.name, source: r.source, updatedAt: r.updated_at.toISOString() });

export async function listDiagrams(): Promise<DiagramMeta[]> {
  await ensureDatabaseSeeded();
  const res = await pool.query<Row>("SELECT id, diagram_type, kind, name, source, updated_at FROM diagrams ORDER BY diagram_type, kind");
  return res.rows.map(meta);
}

export async function getDiagram(diagramType: string, kind: DiagramKind): Promise<DiagramRecord> {
  await ensureDatabaseSeeded();
  const res = await pool.query<Row>("SELECT * FROM diagrams WHERE diagram_type = $1 AND kind = $2", [diagramType, kind]);
  const r = res.rows[0];
  if (!r) throw new NotFoundError(`No ${kind.toUpperCase()} drawing of kind "${diagramType}".`);
  return { ...meta(r), data: r.data };
}

export function checkDiagramData(kind: DiagramKind, data: unknown): void {
  const d = data as Record<string, unknown> | null;
  if (!d || typeof d !== "object") throw new InputError("data must be an object.");
  if (kind === "2d") {
    if (d.format !== "ultron.sheet2d/1") throw new InputError('2D data must have format "ultron.sheet2d/1".');
    if (typeof d.svg !== "string" || !(Number(d.width) > 0) || !(Number(d.height) > 0)) throw new InputError("2D data needs svg, width and height.");
    if (UNSAFE_SVG.test(d.svg)) throw new InputError("The 2D markup contains scripts, event handlers, embeds or outside links.");
  } else {
    if (d.format !== "ultron.kit3d/1") throw new InputError('3D data must have format "ultron.kit3d/1".');
    if (!Array.isArray(d.parts) || !Array.isArray(d.geometries) || !Array.isArray(d.materials)) throw new InputError("3D data needs parts, geometries and materials.");
  }
}

export async function saveDiagram(input: { diagramType: string; kind: DiagramKind; name: string; data: unknown; source?: string | null }): Promise<DiagramMeta> {
  await ensureDatabaseSeeded();
  if (!TYPE.test(input.diagramType ?? "")) throw new InputError("diagramType must be kebab-case, e.g. vacuum-casting-cell.");
  if (input.kind !== "2d" && input.kind !== "3d") throw new InputError('kind must be "2d" or "3d".');
  if (!input.name?.trim()) throw new InputError("name is required.");
  checkDiagramData(input.kind, input.data);
  const res = await pool.query<Row>(
    `INSERT INTO diagrams (id, diagram_type, kind, name, data, source)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, data = EXCLUDED.data, source = EXCLUDED.source, updated_at = NOW()
     RETURNING id, diagram_type, kind, name, source, updated_at`,
    [`${input.diagramType}:${input.kind}`, input.diagramType, input.kind, input.name.trim(), JSON.stringify(input.data), input.source ?? null],
  );
  return meta(res.rows[0]);
}
