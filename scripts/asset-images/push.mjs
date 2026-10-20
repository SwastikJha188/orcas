#!/usr/bin/env node
/**
 * Store a photo's drawings and link them — one command.
 *
 *   node scripts/asset-images/push.mjs <imageId> --diagram-type <kind> [--2d <file.tsx>] [--3d <file.ts>]
 *   node scripts/asset-images/push.mjs <imageId> --failed "<plain reason>"
 *
 * With --diagram-type it first stores the drawings (scripts/diagram-lab/export.mjs --post):
 * the files given with --2d / --3d (only those), else onboarding-work/photos-* /diagrams/<kind>.tsx
 * and <kind>.ts (the newest of each). Then it links the kind to the photo's machine or plant.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { postJson } from "../onboarding/api.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const args = process.argv.slice(2);
const opt = (n) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : undefined);
const imageId = args[0];
if (!imageId || imageId.startsWith("--")) {
  console.error('usage: push.mjs <imageId> (--diagram-type <kind> [--2d <file.tsx>] [--3d <file.ts>] | --failed "<why>")');
  process.exit(2);
}

if (opt("failed")) {
  const res = await postJson(`/api/asset-images/${imageId}/result`, { status: "failed", note: opt("failed") });
  console.log(JSON.stringify({ imageId: res.id, status: res.status, note: res.note }, null, 1));
  process.exit(0);
}
const kind = opt("diagram-type");
if (!kind) {
  console.error("give --diagram-type <kind> or --failed <why>");
  process.exit(2);
}

// The drawing files: given, else named after the kind, else the only recent ones.
const work = path.join(repo, "onboarding-work");
const dirs = existsSync(work)
  ? readdirSync(work)
      .map((d) => path.join(work, d, "diagrams"))
      .filter((d) => existsSync(d))
  : [];
// Only files named after the kind are picked up by themselves; anything else must be passed.
const named = (ext) => {
  const hits = dirs.map((d) => path.join(d, `${kind}${ext}`)).filter((f) => existsSync(f));
  return hits.length ? hits.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] : null;
};
const given = Boolean(opt("2d") || opt("3d"));
const file2d = opt("2d") ? path.resolve(opt("2d")) : given ? null : named(".tsx");
const file3d = opt("3d") ? path.resolve(opt("3d")) : given ? null : named(".ts");
if (!file2d && !file3d) {
  console.error(`No drawing files found for "${kind}". Pass them: --2d <file.tsx> --3d <file.ts>`);
  process.exit(2);
}
const stored = [];
for (const f of [file2d, file3d].filter(Boolean)) {
  if (!existsSync(f)) {
    console.error(`File not found: ${f}`);
    process.exit(2);
  }
  const r = spawnSync(process.execPath, [path.join(repo, "scripts/diagram-lab/export.mjs"), f, "--type", kind, "--post"], { cwd: repo, encoding: "utf8", env: process.env });
  if (r.status !== 0) {
    console.error(`Storing ${path.relative(repo, f)} failed (fix it, render it, and push again):\n${(r.stdout || "") + (r.stderr || "")}`.slice(0, 3000));
    process.exit(1);
  }
  stored.push(path.relative(repo, f));
}
const res = await postJson(`/api/asset-images/${imageId}/result`, { status: "processed", diagramType: kind });
console.log(JSON.stringify({ imageId: res.id, status: res.status, diagramType: res.diagramType, stored }, null, 1));
