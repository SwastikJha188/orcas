#!/usr/bin/env node
/**
 * Post the result of processing one upload back to the onboarding.
 *
 *   node scripts/onboarding/push.mjs <onboarding-id> <fileId> --extract <extract.json>   (a PDF: pdf-extract result)
 *   node scripts/onboarding/push.mjs <onboarding-id> <fileId> --diagram-type <kind>      (an image: drawing kind saved)
 *   node scripts/onboarding/push.mjs <onboarding-id> <fileId> --failed "<why>"           (could not be processed)
 *   add --note "<text>" to say anything the reviewer should know.
 */
import { readFileSync } from "node:fs";
import { postJson } from "./api.mjs";

const args = process.argv.slice(2);
const opt = (n) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : undefined);
const [id, fileId] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!id || !fileId) {
  console.error("usage: push.mjs <onboarding-id> <fileId> (--extract <file> | --diagram-type <kind> | --failed <why>) [--note <text>]");
  process.exit(2);
}
let body;
if (opt("extract")) body = { status: "processed", note: opt("note") ?? null, result: JSON.parse(readFileSync(opt("extract"), "utf8")) };
else if (opt("diagram-type")) body = { status: "processed", note: opt("note") ?? null, result: { diagramType: opt("diagram-type") } };
else if (opt("failed")) body = { status: "failed", note: opt("failed") };
else {
  console.error("give --extract, --diagram-type or --failed");
  process.exit(2);
}
const pkg = await postJson(`/api/onboarding/${id}/files/${fileId}/result`, body);
console.log(
  JSON.stringify(
    {
      onboarding: id,
      status: pkg.status,
      waiting: pkg.files.filter((f) => f.status === "waiting").map((f) => f.id),
      draft: { machines: pkg.draft.machines.length, points: pkg.draft.points.length, areas: pkg.draft.areas.length, users: pkg.draft.users.length },
      stillToDecide: pkg.problems.slice(0, 8),
    },
    null,
    1,
  ),
);
