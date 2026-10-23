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
let layout;
try {
  layout = layoutSpec(spec, size ?? undefined);
} catch (e) {
  out({ ok: false, problems: [`1. The layout failed: ${e?.message ?? e}. Check every item has "id", "type" and "box", and every link "from", "to", "medium".`] }, 1);
}
problems.push(...layout.issues);
if (!layout.items.length) out({ ok: false, problems: problems.map((p, i) => `${i + 1}. ${p}`) }, 1);

/* ---- machines without a catalog part: drawn from their own picture ---- */
// The model's boxes say where such a machine is; its real shape comes from the image, so the drawing
// does not depend on which model wrote the spec.
if (imgFile && layout.traced?.length) {
  const jf = path.join(tmpdir(), `diagram-vec-jobs-${process.pid}.json`);
  const of = path.join(tmpdir(), `diagram-vec-out-${process.pid}.json`);
  writeFileSync(jf, JSON.stringify(layout.traced.map((g) => ({ key: g.key, src: g.src, parts: g.parts }))));
  const vr = spawnSync("python3", ["-I", path.join(here, "vectorize.py"), imgFile, jf, of], { encoding: "utf8", timeout: 240000 });
  if (vr.status === 0 && existsSync(of)) {
    try {
      const art = JSON.parse(readFileSync(of, "utf8"));
      for (const g of layout.traced) if (art[g.key]) g.art = art[g.key];
    } catch {
      /* fall back to the shape parts */
    }
  } else problems.push(`Could not trace the machine from the image (${(vr.stderr || "").trim().slice(0, 160)}); its parts are drawn as shapes.`);
  rmSync(jf, { force: true });
  rmSync(of, { force: true });
  for (const g of layout.traced) delete g.parts;
}

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
  // Most of the picture left without items means machines were left out (or the scope was narrowed): send the model back.
  const cv = spawnSync("python3", ["-I", path.join(here, "check.py"), "coverage", specPath, imgFile], { encoding: "utf8" });
  try {
    const c = JSON.parse(cv.stdout);
    // Calibrated on 115 specs: honest ones (text-heavy screens and infographics included) score 9% and up; a spec
    // narrowed to one area of a whole-plant screen scored 2%.
    if (c.coverage < 0.06) {
      const areas = c.missing.slice(0, 8).map(([x0, y0, x1, y1]) => `x ${x0}-${x1}, y ${y0}-${y1}`).join("; ");
      problems.push(`Your items cover only ${Math.round(c.coverage * 100)}% of what the image shows. Draw EVERY machine in the image, not one area of it. Look again at these grid areas and add the machines you left out: ${areas}. (If those areas hold only text, people or background, leave them out.)`);
    }
  } catch {
    /* coverage is a hint only */
  }
  if (existsSync(ov)) files.overlay = path.relative(repo, ov);
  if (existsSync(cmp)) files.compare = path.relative(repo, cmp);
}

out({
  ok: !(r2.errors ?? []).length,
  files,
  drawn: { items: layout.items.length, links: layout.links.length, sensors: layout.points.length, labels: layout.labels.length, sheet: `${layout.width} x ${layout.height}` },
  problems: problems.map((p, i) => `${i + 1}. ${p}`),
});
