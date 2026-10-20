---
name: onboarding-process
description: Process the uploads of a ULTRON plant onboarding (Configure › Onboarding) — read every uploaded PDF with the pdf-extract skill and turn every uploaded machine image into a 2D sheet and a 3D model with the machine-diagram-2d / -3d skills, then send the results back so they fill the onboarding draft. Use when the user asks to process, run or finish an onboarding, or says uploads are "waiting for processing".
---

# Process a plant onboarding

The app collects an onboarding (plant, factories, users, machines, sensors)
and its uploads. Uploads wait until a session like this one processes them:
PDFs become data (machines, parts, sensors, ranges, limits), machine images
become drawings. Results go back through the app's API; the reviewer then
checks the draft in the app and commits it. You never write to the monitoring
tables yourself and never commit the onboarding.

Scripts are in `scripts/onboarding/` (run from the repo root). The app must
be running (default http://localhost:3000; set `ULTRON_API` for another one).

## Step 1 — Pick the onboarding and fetch its uploads

```
node scripts/onboarding/pull.mjs                 # lists onboardings with uploads waiting
node scripts/onboarding/pull.mjs <onboarding-id>
```

It writes `onboarding-work/<id>/` (`package.json` = the draft so far,
`files/…` = the uploads, `todo.json`) and prints the waiting files: each has
`fileId`, `kind` (`document` or `image`), the local `file`, and for an image
the machine it shows.

## Step 2 — Each document (PDF)

Do every document before any image: the documents add the sensors the
drawings need.

Follow the **pdf-extract** skill (`.claude/skills/pdf-extract/SKILL.md`)
completely, with the output folder `onboarding-work/<id>/extract/<fileId>/`.
Then send its result:

```
node scripts/onboarding/push.mjs <id> <fileId> --extract onboarding-work/<id>/extract/<fileId>/extract.json
```

If the PDF cannot be read at all: `--failed "<plain reason>"`.

## Step 3 — Each image (a machine or a factory)

An image in todo.json has `shows`: `"machine"` (follow 1–4 below) or `"area"`
(a factory, section or line — see "Area photos" after step 4).

First run `node scripts/onboarding/pull.mjs <id>` again. It lists only the
images still waiting, and each one now carries `points`: the sensors of its
machine that the documents added (tag, name, location).

1. Choose the drawing kind: a kebab-case name of the machine kind, from the
   machine's type or name in todo.json (`vacuum-casting-cell`,
   `kiln-gear-train`). If `machine.diagramType` is already set, reuse it.
   Check `curl -s $ULTRON_API/api/diagrams` (or http://localhost:3000): when
   that kind already exists and the image shows the same kind of machine,
   reuse it and skip to 4.
2. Make the 2D sheet with the **machine-diagram-2d** skill and the 3D model
   with the **machine-diagram-3d** skill from the image, saving the files as
   `onboarding-work/<id>/diagrams/<kind>.tsx` and `<kind>.ts` (not in `src/`:
   these drawings live in the database). Render and fix them as those skills
   say, until the renderer reports no errors — every renderer error
   (`Type error … Line N`, `NaN`, `build() threw`) is a bug in your file to
   fix, never a reason to skip the 3D model (keep the PNGs in the same
   `diagrams/` folder). Use the tags from that image's `points` in todo.json
   as the sheet's pad tags, exactly as written, where the image shows where
   they sit; make up a tag only for a point the image shows that has none.
   Skip those skills' "Register it in the app" step and their `tsc` /
   `eslint` run: these drawings are stored in the database, not in `src/`.
3. Store both:
   ```
   node scripts/diagram-lab/export.mjs onboarding-work/<id>/diagrams/<kind>.tsx --type <kind> --name "<Plain machine kind>" --post
   node scripts/diagram-lab/export.mjs onboarding-work/<id>/diagrams/<kind>.ts  --type <kind> --name "<Plain machine kind>" --post
   ```
4. Send the result:
   ```
   node scripts/onboarding/push.mjs <id> <fileId> --diagram-type <kind>
   ```

### Area photos (`shows: "area"`)

The photo or layout shows a whole factory, section or line. Its drawing is a
line drawing: the machines in the order the material flows, joined by
flows, with their names.

1. Drawing kind: `area-<kebab-name of the area>` (e.g. `area-kiln-line`);
   reuse `area.diagramType` when it is already set.
2. Make the 2D sheet with **machine-diagram-2d** (it covers process lines and
   factories), as `onboarding-work/<id>/diagrams/<kind>.tsx`. Label each
   machine with its name from `area.machines` (code in brackets) where the
   photo shows it; no pads unless the photo shows instruments. A 3D model
   (**machine-diagram-3d**, `<kind>.ts`) only when the photo shows the
   layout clearly enough to place the machines in metres.
3. Store it (and the 3D model if made) with `export.mjs … --type <kind>
   --name "<Area name> line" --post`, then
   `node scripts/onboarding/push.mjs <id> <fileId> --diagram-type <kind>`:
   the drawing is linked to the area.

## Step 4 — Report

push.mjs prints the draft counts and `stillToDecide` (what blocks the
commit: plant code, time zone, roles, sensors without a part …). Tell the
user: onboarding name, files processed or failed (with why), drawing kinds
made, draft counts, and the decisions left for them in Configure ›
Onboarding. Do not fill those decisions in yourself.

## Rules

- Only what the documents and images show. Unknown = null; the reviewer
  decides the rest in the app.
- One upload, one push. Re-running pull lists only what is still waiting.
- Never edit extract.json or the draft by hand; fix mapping.json / facts.json
  (pdf-extract) and push again.
