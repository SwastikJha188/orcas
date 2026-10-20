#!/usr/bin/env node
/**
 * Fetch an onboarding's uploads that still wait for processing.
 *
 *   node scripts/onboarding/pull.mjs [<onboarding-id>] [--out <dir>]
 *
 * Without an id it lists the onboardings that have uploads waiting.
 * Writes <dir> (default onboarding-work/<id>/): package.json (the draft) and
 * files/<fileId>-<name>, and prints the to-do list as JSON (an image's entry lists
 * its machine's sensors; run pull again after the documents are pushed to get them).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { api } from "./api.mjs";

const args = process.argv.slice(2);
const id = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
if (!id) {
  const list = await api("/api/onboarding");
  console.log(JSON.stringify(list.filter((p) => p.status === "waiting").map((p) => ({ id: p.id, name: p.name, files: p.files, updatedAt: p.updatedAt })), null, 1));
  process.exit(0);
}
const out = path.resolve(args.includes("--out") ? args[args.indexOf("--out") + 1] : path.join("onboarding-work", id));
mkdirSync(path.join(out, "files"), { recursive: true });
const pkg = await api(`/api/onboarding/${id}`);
writeFileSync(path.join(out, "package.json"), JSON.stringify(pkg, null, 1));
const todo = [];
for (const f of pkg.files.filter((x) => x.status === "waiting")) {
  const safe = f.fileName.replace(/[^A-Za-z0-9._-]+/g, "_");
  const file = path.join(out, "files", `${f.id}-${safe}`);
  writeFileSync(file, await api(`/api/onboarding/${id}/files/${f.id}`));
  const m = pkg.draft.machines.find((mm) => mm.key === f.machineKey);
  // A photo shows a machine, or an area (factory, line) with the machines placed in it.
  const a = m ? undefined : pkg.draft.areas.find((aa) => aa.key === f.machineKey);
  todo.push({
    fileId: f.id,
    kind: f.kind,
    file,
    ...(f.kind === "image" && a
      ? {
          shows: "area",
          areaKey: a.key,
          area: {
            name: a.name,
            diagramType: a.diagramType ?? null,
            machines: pkg.draft.machines.filter((mm) => mm.areaKey === a.key).map((mm) => ({ code: mm.code, name: mm.name, type: mm.type })),
          },
        }
      : f.kind === "image"
      ? {
          shows: "machine",
          machineKey: f.machineKey,
          machine: m ? { name: m.name, code: m.code, type: m.type, diagramType: m.diagramType } : null,
          // the machine's sensors so far (filled once its documents are processed): the drawing's pad tags
          points: pkg.draft.points.filter((p) => p.machineKey === f.machineKey).map((p) => ({ tag: p.tag, name: p.name, location: p.location })),
        }
      : {}),
  });
}
writeFileSync(path.join(out, "todo.json"), JSON.stringify(todo, null, 1));
console.log(JSON.stringify({ onboarding: id, name: pkg.name, folder: out, waiting: todo }, null, 1));
