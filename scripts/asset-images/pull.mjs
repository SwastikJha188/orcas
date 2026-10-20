#!/usr/bin/env node
/**
 * Fetch a plant's photos that wait to be drawn (Configure › Plants: Add plant / Add machine).
 *
 *   node scripts/asset-images/pull.mjs <plant-id>
 *   node scripts/asset-images/pull.mjs --draft <draft-key>   (photos of an unsaved Add plant / Add machine form, drawn for a preview)
 *
 * Writes onboarding-work/photos-<plant-id>/ : files/<imageId>-<name> and todo.json,
 * and prints the to-do list: each photo with what it shows (a machine, with its
 * sensor tags, or the plant) and the drawing kind to use.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { api } from "../onboarding/api.mjs";

const BUILT_IN = new Set(["pump", "mill", "crusher", "blower", "kiln", "feed-system", "preheater", "pyro-kiln", "kiln-burner", "grate-cooler", "clinker-transport", "vpc-casting"]);
const kebab = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const draft = process.argv[2] === "--draft" ? process.argv[3] : null;
const plantId = draft ? `draft-${draft}` : process.argv[2];
if (!plantId) {
  console.error("usage: node scripts/asset-images/pull.mjs <plant-id> | --draft <draft-key>");
  process.exit(2);
}
const out = path.resolve("onboarding-work", `photos-${plantId}`);
mkdirSync(path.join(out, "files"), { recursive: true });
const w = await api(draft ? `/api/asset-images/waiting?draftKey=${encodeURIComponent(draft)}` : `/api/asset-images/waiting?plantId=${encodeURIComponent(plantId)}`);
const stored = new Set((await api("/api/diagrams")).map((d) => d.diagramType));
const todo = [];
for (const item of w.waiting) {
  const safe = item.fileName.replace(/[^A-Za-z0-9._-]+/g, "_");
  const file = path.join(out, "files", `${item.imageId}-${safe}`);
  writeFileSync(file, await api(`/api/asset-images/${item.imageId}`));
  // Drawing kind: the machine's own kind when it is not a built-in one, else plant code + machine code; the plant: plant-<code>.
  const kind = item.kind
    ? item.kind // planned when the photo was uploaded: use it exactly
    : item.shows === "machine"
      ? item.machine && !BUILT_IN.has(item.machine.diagramType)
        ? item.machine.diagramType
        : `${kebab(w.plant?.code)}-${kebab(item.machine?.code)}`
      : w.plant?.diagramType && !BUILT_IN.has(w.plant.diagramType)
        ? w.plant.diagramType
        : `plant-${kebab(w.plant?.code)}`;
  todo.push({ ...item, file, kind, kindAlreadyStored: stored.has(kind) });
}
writeFileSync(path.join(out, "todo.json"), JSON.stringify({ plant: w.plant, machines: w.machines, waiting: todo }, null, 1));
console.log(JSON.stringify({ plant: w.plant, folder: out, waiting: todo }, null, 1));
