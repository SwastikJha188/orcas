#!/usr/bin/env node
/**
 * Diagram lab — evaluation harness for the machine-diagram skill.
 *
 *   node scripts/diagram-lab/eval.mjs run    <dir> [--only 003,017] [--jobs 6] [--model haiku] [--force]
 *   node scripts/diagram-lab/eval.mjs redraw <dir>
 *   node scripts/diagram-lab/eval.mjs sheet  <dir> [--per 12]
 *
 * <dir> holds one folder per image, each with source.png (onboarding-work/eval100).
 * run     draws every folder without a drawing.spec.json (or all with --force) the way production
 *         does: headless `claude -p` on Haiku with the onboarding runner's tool allowlist, one
 *         process per image, --jobs at a time; the transcript tail goes to <folder>/run.log.
 * redraw  re-runs draw.mjs on every existing spec (after an engine change; no model calls).
 * sheet   writes <dir>/review-N.png: source above drawing for each folder, for a quick look.
 * Prints a JSON summary.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const [cmd, dirArg] = process.argv.slice(2);
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
if (!cmd || !dirArg) {
  console.error("usage: node scripts/diagram-lab/eval.mjs run|redraw|sheet <dir> [...]");
  process.exit(2);
}
const dir = path.resolve(dirArg);
const only = opt("only", "")
  .split(",")
  .filter(Boolean);
const folders = readdirSync(dir)
  .filter((f) => existsSync(path.join(dir, f, "source.png")))
  .filter((f) => !only.length || only.some((o) => f.startsWith(o)))
  .sort();
const CLAUDE = process.env.CLAUDE_BIN ?? (existsSync("/opt/homebrew/bin/claude") ? "/opt/homebrew/bin/claude" : "claude");
const ALLOWED = [
  "Read",
  "Glob",
  "Grep",
  "Edit(onboarding-work/**)",
  `Edit(/${path.join(repo, "onboarding-work")}/**)`,
  "Bash(node scripts/diagram-lab/draw.mjs:*)",
  "Bash(node scripts/diagram-lab/render.mjs:*)",
  "Bash(python3 scripts/diagram-lab/prep.py:*)",
  "Bash(python3 -I scripts/diagram-lab/prep.py:*)",
  "Bash(ls:*)",
];

function runOne(f) {
  return new Promise((resolve) => {
    const rel = path.relative(repo, path.join(dir, f));
    const id = `eval-${f.slice(0, 3)}`;
    const prompt = `Draw the machine(s) shown in the image ${rel}/source.png for ULTRON (2D drawing and 3D model). Read .claude/skills/machine-diagram-2d/SKILL.md and follow it exactly. Work folder: ${rel}. Name the spec ${rel}/drawing.spec.json and use the id "${id}". Run every command from the repository root exactly as the skill writes it (no cd, no pipes). Finish with the skill's report, at most 120 words.`;
    const t0 = Date.now();
    const child = spawn(CLAUDE, ["-p", "--model", opt("model", "haiku"), "--permission-mode", "dontAsk", "--allowedTools", ALLOWED.join(","), "--output-format", "text"], { cwd: repo, stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    const timer = setTimeout(() => child.kill("SIGTERM"), 15 * 60 * 1000);
    child.stdin.end(prompt);
    child.on("close", (code) => {
      clearTimeout(timer);
      writeFileSync(path.join(dir, f, "run.log"), out.slice(-6000));
      resolve({ folder: f, code, seconds: Math.round((Date.now() - t0) / 1000), spec: existsSync(path.join(dir, f, "drawing.spec.json")) });
    });
  });
}

async function pool(items, jobs, fn) {
  const res = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(jobs, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        res[k] = await fn(items[k]);
        process.stderr.write(`${res[k].folder}: ${JSON.stringify(res[k])}\n`);
      }
    }),
  );
  return res;
}

function draw(f) {
  const spec = path.join(dir, f, "drawing.spec.json");
  if (!existsSync(spec)) return { folder: f, spec: false };
  const r = spawnSync(process.execPath, [path.join(here, "draw.mjs"), spec], { cwd: repo, encoding: "utf8", timeout: 300000 });
  try {
    const j = JSON.parse(r.stdout);
    return { folder: f, ok: j.ok, drawn: j.drawn, problems: j.problems?.length ?? 0, first: j.problems?.[0] };
  } catch {
    return { folder: f, ok: false, error: (r.stderr || r.stdout || "").slice(0, 300) };
  }
}

if (cmd === "run") {
  const todo = folders.filter((f) => args.includes("--force") || !existsSync(path.join(dir, f, "drawing.spec.json")));
  const res = await pool(todo, Number(opt("jobs", "6")), runOne);
  console.log(JSON.stringify({ ran: res.length, withSpec: res.filter((r) => r.spec).length, results: res }, null, 1));
} else if (cmd === "redraw") {
  const res = await pool(folders, Number(opt("jobs", "4")), async (f) => draw(f));
  const drawn = res.filter((r) => r.ok);
  console.log(JSON.stringify({ folders: res.length, drawn: drawn.length, noSpec: res.filter((r) => r.spec === false).map((r) => r.folder), failed: res.filter((r) => r.spec !== false && !r.ok).map((r) => r.folder), withProblems: res.filter((r) => r.problems).map((r) => `${r.folder}: ${r.problems} — ${r.first}`) }, null, 1));
} else if (cmd === "sheet") {
  const per = Number(opt("per", "12"));
  const py = `
import json, os, sys, glob
from PIL import Image, ImageDraw, ImageFont
d, per = sys.argv[1], int(sys.argv[2]); fs = json.loads(sys.argv[3])
f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 20)
for p in range(0, len(fs), per):
    W, H = 4, (min(per, len(fs) - p) + 3) // 4
    c = Image.new("RGB", (W * 520, H * 700), (24, 24, 28)); dr = ImageDraw.Draw(c)
    for k, fo in enumerate(fs[p:p + per]):
        x, y = (k % W) * 520, (k // W) * 700
        dr.text((x + 6, y + 4), fo, font=f, fill=(255, 230, 0))
        src = Image.open(os.path.join(d, fo, "source.png")).convert("RGB"); src.thumbnail((508, 300)); c.paste(src, (x + 6, y + 30))
        pngs = [g for g in glob.glob(os.path.join(d, fo, "eval-*.png")) if not g.endswith(("-3d.png", "-overlay.png", "-compare.png"))]
        if pngs:
            im = Image.open(pngs[0]).convert("RGB"); im.thumbnail((508, 360)); c.paste(im, (x + 6, y + 335))
        else:
            dr.text((x + 6, y + 420), "no drawing", font=f, fill=(255, 90, 90))
    c.save(os.path.join(d, f"review-{p // per + 1}.png"))
print(json.dumps({"sheets": (len(fs) + per - 1) // per}))
`;
  const r = spawnSync("python3", ["-I", "-c", py, dir, String(per), JSON.stringify(folders)], { encoding: "utf8" });
  process.stdout.write(r.stdout || r.stderr);
} else {
  console.error(`unknown command ${cmd}`);
  process.exit(2);
}
void readFileSync;
