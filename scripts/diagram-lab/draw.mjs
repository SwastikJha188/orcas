#!/usr/bin/env node
/**
 * Diagram lab: diagram spec (JSON) → finished ULTRON drawings, in one command.
 *
 *   node scripts/diagram-lab/draw.mjs <spec.json> [--image <source image>] [--name <file base>] [--no-render]
 *
 * Lays the spec out (src/components/assets/machine-kit/spec/layout.ts), writes
 * next to the spec:
 *   <name>.tsx            2D sheet (export const sheet) — what export.mjs / push.mjs store
 *   <name>.ts             3D model (export const model)
 *   <name>.png            the 2D drawing, rendered
 *   <name>-3d.png         the 3D model, rendered
 *   <name>-overlay.png    the source image with the spec's boxes and sensor positions
 *   <name>-compare.png    source image above the 2D drawing
 * and prints a JSON report: problems to fix in the spec (numbered, plain words).
 * <name> defaults to the spec's "id". The image comes from the spec's "image"
 * (path relative to the spec file or the repository) or --image.
 * Exit code 1 when the spec cannot be drawn.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const specArg = args.find((a, i) => !a.startsWith("--") && !(i > 0 && ["--image", "--name"].includes(args[i - 1])));
if (!specArg) {
  console.error("usage: node scripts/diagram-lab/draw.mjs <spec.json> [--image <file>] [--name <file base>]");
  process.exit(2);
}
const out = (o, code = 0) => {
  console.log(JSON.stringify(o, null, 2));
  process.exit(code);
};
const specPath = path.resolve(specArg);
const dir = path.dirname(specPath);

/* ---- read the spec (forgiving: code fences, comments, trailing commas) ---- */
let text;
try {
  text = readFileSync(specPath, "utf8");
} catch {
  out({ ok: false, problems: [`1. Cannot read ${specArg}. Write the spec there first.`] }, 1);
}
let spec;
{
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/,\s*([}\]])/g, "$1");
  try {
    spec = JSON.parse(cleaned);
  } catch (e) {
    const m = String(e.message).match(/position (\d+)/);
    let where = "";
    if (m) {
      const pos = Number(m[1]);
      const line = cleaned.slice(0, pos).split("\n").length;
      where = ` near line ${line}: «${cleaned.split("\n")[line - 1]?.trim().slice(0, 80)}»`;
    }
    out({ ok: false, problems: [`1. The spec is not valid JSON${where}. Fix that line (quotes around every name and text, commas between entries, no comments) and run again.`] }, 1);
  }
}
if (!spec || typeof spec !== "object" || !Array.isArray(spec.items)) out({ ok: false, problems: ['1. The spec must be a JSON object with "id", "name", "image", "items": [...], "links": [...], "points": [...].'] }, 1);

/* ---- image size ---- */
const imgRel = opt("image") ?? (typeof spec.image === "string" ? spec.image : spec.image?.file);
let imgFile = null;
for (const c of imgRel ? [path.resolve(dir, imgRel), path.resolve(repo, imgRel), path.resolve(imgRel)] : []) if (existsSync(c)) { imgFile = c; break; }
let size = spec.image && typeof spec.image === "object" && spec.image.width ? { width: spec.image.width, height: spec.image.height } : null;
if (imgFile) {
  try {
    const sharp = (await import(pathToFileURL(path.join(repo, "node_modules/sharp/lib/index.js")).href)).default;
    const meta = await sharp(imgFile).metadata();
    size = { width: meta.width, height: meta.height };
  } catch {
    const r = spawnSync("python3", ["-I", "-c", "import sys;from PIL import Image;print(*Image.open(sys.argv[1]).size)", imgFile], { encoding: "utf8" });
    const [w, h] = (r.stdout ?? "").trim().split(/\s+/).map(Number);
    if (w && h) size = { width: w, height: h };
  }
}
const problems = [];
if (imgRel && !imgFile) problems.push(`"image": "${imgRel}" was not found (paths are relative to the spec file). Proportions are guessed.`);
if (!imgRel) problems.push('Add "image": "<path to the source image>" to the spec so proportions match the picture.');

/* ---- lay out ---- */
const esbuild = await import(path.join(here, "node_modules/esbuild/lib/main.js"));
const work = mkdtempSync(path.join(tmpdir(), "diagram-draw-"));
const bundle = path.join(work, "layout.mjs");
await esbuild.build({
  entryPoints: [path.join(repo, "src/components/assets/machine-kit/spec/layout.ts")],
  bundle: true,
  outfile: bundle,
  format: "esm",
  platform: "node",
  target: "node20",
  alias: { "@": path.join(repo, "src") },
  logLevel: "silent",
});
const { layoutSpec } = await import(pathToFileURL(bundle).href);
rmSync(work, { recursive: true, force: true });
// Items without a catalog part keep their own silhouette, traced from the image.
let traces = {};
if (imgFile) {
  const tf = path.join(tmpdir(), `diagram-trace-${process.pid}.json`);
  const tr = spawnSync("python3", ["-I", path.join(here, "trace.py"), imgFile, specPath, tf], { encoding: "utf8", timeout: 120000 });
  if (tr.status === 0 && existsSync(tf)) {
    try {
      traces = JSON.parse(readFileSync(tf, "utf8"));
    } catch {
      traces = {};
    }
    rmSync(tf, { force: true });
  }
}
let layout;
try {
  layout = layoutSpec(spec, size ?? undefined, traces);
} catch (e) {
  out({ ok: false, problems: [`1. The layout failed: ${e?.message ?? e}. Check every item has "id", "type" and "box", and every link "from", "to", "medium".`] }, 1);
}
problems.push(...layout.issues);
if (!layout.items.length) out({ ok: false, problems: problems.map((p, i) => `${i + 1}. ${p}`) }, 1);

/* ---- write the drawing files ---- */
const base = (opt("name") ?? layout.id).replace(/[^a-zA-Z0-9_-]+/g, "-");
const tsx = path.join(dir, `${base}.tsx`);
const ts3 = path.join(dir, `${base}.ts`);
const header = (what) =>
  `/**\n * ${layout.name}: ${what}, laid out by scripts/diagram-lab/draw.mjs from ${path.basename(specPath)}${imgFile ? ` (image ${path.basename(imgFile)})` : ""}.\n * Generated — change the spec and run draw.mjs again instead of editing this file.\n */\n`;
const { issues: _drop, ...data } = layout;
const json = JSON.stringify(data);
writeFileSync(tsx, `${header("2D machine-kit sheet")}import { layoutSheet } from "@/components/assets/machine-kit/spec/sheet";\nimport type { Layout } from "@/components/assets/machine-kit/spec/types";\n\nconst LAYOUT: Layout = { ...${json}, issues: [] };\n\nexport const sheet = layoutSheet(LAYOUT);\n`);
writeFileSync(ts3, `${header("3D machine-kit model")}import { layoutModel } from "@/components/home/twin/spec-model";\nimport type { Layout } from "@/components/assets/machine-kit/spec/types";\n\nconst LAYOUT: Layout = { ...${json}, issues: [] };\n\nexport const model = layoutModel(LAYOUT);\n`);

const files = { sheet: path.relative(repo, tsx), model: path.relative(repo, ts3) };
if (args.includes("--no-render")) out({ ok: true, files, problems: problems.map((p, i) => `${i + 1}. ${p}`) });

/* ---- render + check images ---- */
const render = (file, png) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(here, "render.mjs"), file, "--out", png, "--no-typecheck"], { cwd: repo });
    let so = "";
    let se = "";
    const t = setTimeout(() => child.kill(), 240000);
    child.stdout.on("data", (d) => (so += d));
    child.stderr.on("data", (d) => (se += d));
    child.on("close", () => {
      clearTimeout(t);
      try {
        resolve(JSON.parse(so));
      } catch {
        resolve({ errors: [(se || so || "render failed").slice(0, 400)] });
      }
    });
  });
const png = path.join(dir, `${base}.png`);
const png3 = path.join(dir, `${base}-3d.png`);
const [r2, r3] = await Promise.all([render(tsx, png), render(ts3, png3)]);
for (const e of r2.errors ?? []) problems.push(`2D drawing error (report it; not your spec): ${e}`);
for (const e of r3.errors ?? []) problems.push(`3D model error (report it; not your spec): ${e}`);
// Renderer warnings that the spec can fix.
for (const wn of r2.warnings ?? []) if (/overlap|outside|empty/i.test(wn)) problems.push(`2D: ${wn}`);
files.png = path.relative(repo, png);
files.png3d = path.relative(repo, png3);
if (imgFile) {
  const ov = path.join(dir, `${base}-overlay.png`);
  const cmp = path.join(dir, `${base}-compare.png`);
  spawnSync("python3", ["-I", path.join(here, "check.py"), "overlay", specPath, imgFile, ov], { encoding: "utf8" });
  spawnSync("python3", ["-I", path.join(here, "check.py"), "compare", imgFile, png, cmp], { encoding: "utf8" });
  if (existsSync(ov)) files.overlay = path.relative(repo, ov);
  if (existsSync(cmp)) files.compare = path.relative(repo, cmp);
}

out({
  ok: !(r2.errors ?? []).length,
  files,
  drawn: { items: layout.items.length, links: layout.links.length, sensors: layout.points.length, labels: layout.labels.length, sheet: `${layout.width} x ${layout.height}` },
  problems: problems.map((p, i) => `${i + 1}. ${p}`),
});
