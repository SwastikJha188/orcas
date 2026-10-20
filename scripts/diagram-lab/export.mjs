#!/usr/bin/env node
/**
 * Export a skill-made diagram file as DB data, and optionally save it.
 *
 *   node scripts/diagram-lab/export.mjs <file.tsx|file.ts> --type <diagram-type> [--name "Plain name"] [--out file.json] [--save | --post]
 *
 * --type   the drawing kind machines use (equipment_models.diagram_type), e.g. "vacuum-casting-cell"
 * --save   upsert into the DB table `diagrams` (DATABASE_URL from .env.local / .env)
 * --post   send it to the running app instead: POST /api/diagrams (ULTRON_API, default http://localhost:3000;
 *          ULTRON_SESSION for a production server) — what onboarding uses
 * Prints a JSON summary (kind, size, bytes, parts / pads).
 */
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && !["--save", "--post"].includes(args[i - 1])));
const type = opt("type");
if (!file || !type || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(type)) {
  console.error('usage: node scripts/diagram-lab/export.mjs <file> --type <kebab-diagram-type> [--name "…"] [--out file.json] [--save]');
  process.exit(2);
}
const esbuild = await import(path.join(here, "node_modules/esbuild/lib/main.js"));
const work = mkdtempSync(path.join(tmpdir(), "diagram-export-"));
const entry = path.join(work, "entry.tsx");
writeFileSync(entry, `export * as mod from ${JSON.stringify(path.resolve(file))};\nexport { exportModule } from ${JSON.stringify(path.join(here, "export-entry.tsx"))};\n`);
const outJs = path.join(work, "bundle.mjs");
try {
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    outfile: outJs,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    target: "node20",
    alias: { "@": path.join(repo, "src") },
    nodePaths: [path.join(repo, "node_modules")],
    define: { "process.env.NODE_ENV": '"production"' },
    banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
    logLevel: "silent",
  });
} catch (e) {
  console.log(JSON.stringify({ file, compiled: false, errors: (e.errors ?? []).map((m) => m.text) }, null, 2));
  rmSync(work, { recursive: true, force: true });
  process.exit(1);
}
const { mod, exportModule } = await import(pathToFileURL(outJs).href);
let res;
try {
  res = exportModule(mod);
} catch (e) {
  console.log(JSON.stringify({ file, errors: [String(e?.stack ?? e)] }, null, 2));
  process.exit(1);
} finally {
  rmSync(work, { recursive: true, force: true });
}
const name = opt("name") ?? res.name;
const json = JSON.stringify(res.data);
const id = `${type}:${res.kind}`;
if (opt("out")) writeFileSync(opt("out"), json);

let saved = false;
const source = path.relative(repo, path.resolve(file)).startsWith("..") ? path.basename(file) : path.relative(repo, path.resolve(file));
if (args.includes("--post")) {
  const { postJson } = await import(pathToFileURL(path.join(repo, "scripts/onboarding/api.mjs")).href);
  await postJson("/api/diagrams", { diagramType: type, kind: res.kind, name, data: res.data, source });
  saved = true;
} else if (args.includes("--save")) {
  for (const f of [".env.local", ".env"]) {
    const p = path.join(repo, f);
    if (!existsSync(p)) continue;
    for (const ln of readFileSync(p, "utf8").split("\n")) {
      const m = ln.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  const require = createRequire(path.join(repo, "package.json"));
  const { Pool } = require("pg");
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set (.env.local / .env)");
    process.exit(2);
  }
  const pool = new Pool({ connectionString: url, ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false } });
  const exists = await pool.query("SELECT to_regclass('public.diagrams') AS t");
  if (!exists.rows[0].t) {
    console.error("Table `diagrams` does not exist yet: start the app once so migration 033 runs.");
    process.exit(2);
  }
  await pool.query(
    `INSERT INTO diagrams (id, diagram_type, kind, name, data, source)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, data = EXCLUDED.data, source = EXCLUDED.source, updated_at = NOW()`,
    [id, type, res.kind, name, json, source],
  );
  await pool.end();
  saved = true;
}
const d = res.data;
console.log(
  JSON.stringify(
    {
      id,
      kind: res.kind,
      name,
      bytes: json.length,
      ...(res.kind === "2d"
        ? { sheet: [d.width, d.height], pads: Object.keys(d.pads).length, svgChars: d.svg.length }
        : { size: d.size, parts: d.parts.map((p) => p.name).filter(Boolean), meshes: d.parts.reduce((n, p) => n + p.meshes.length, 0), geometries: d.geometries.length }),
      saved,
    },
    null,
    1,
  ),
);
