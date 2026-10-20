---
name: machine-diagram-3d
description: Turn an image (photo, PDF page, P&ID, process schematic, elevation drawing, sketch) of any machine, process line or factory into an ULTRON 3D machine-kit twin — a three.js model module (`model: KitModel`) built from the kit's equipment parts in real metres, with sub-assemblies, structure, piping and instruments, in the house style. Use when the user uploads or points to an image and asks for a 3D model, 3D twin, 3D diagram or "make this in 3D" for ULTRON.
---

# 3D machine twin from an image

You will turn a picture of equipment into one `.ts` file that exports
`model: KitModel`. The model is built from ready-made equipment in
`@/components/home/twin/machine-kit-3d-parts` (`kitParts`) and the low-level
builder `k` (`kitBuilder`). Materials come in as `mats` — you never create
materials or colours. Your job is to **read sizes, lay out in metres, place
parts and add the detail layer**.

Read these files from this skill folder before starting:

1. `reference.md` — every part and builder call, with arguments. Read all of it.
2. `template.md` — the file skeleton you copy.
3. `checklist.md` — the review you run after every render.

Work through the steps in order. Do not skip the inventory or the render.

---

## Step 1 — Inventory with real sizes (no code yet)

Look at the image. Write a table in your reply, one row per physical item:

| # | What it is | Part | Centre x (m) | Centre z (m) | Size (m) | Stands on | Sub-assembly |
|---|-----------|------|--------------|--------------|----------|-----------|--------------|
| 1 | Feed silo, cone bottom, on legs | `p.tank` | -12 | 0 | r 2.5, h 18, legs 4 | floor | Silo |
| 2 | ID fan with motor | `p.fanSet` | 6 | 3 | r 1.4 | floor | Exhaust fan |

How to get metres from a picture:

- **Find a scale.** Use anything of known size: a person 1.8 m, a door 2.1 m,
  a handrail 1.05 m, a stair step 0.2 m, a ladder rung spacing 0.3 m, a
  standard motor (shaft height 0.2–0.6 m), a pallet 1.2 m, a car 4.5 m, an
  IBC tote 1.2 m. Printed dimensions or capacities win over guesses
  (a 500 m³ tank is about r 4 m × h 10 m; volume = π r² h).
- If nothing gives a scale, use typical sizes from the table in `reference.md`
  ("Typical sizes").
- **x** = left → right across the picture; **y** = up; **z** = depth: 0 for
  the main line, negative = further back, positive = toward the viewer. A 2D
  drawing shows x and y; choose z so items do not collide (typical spacing 1–3 m
  between equipment, 3–6 m between rows).
- Put the whole model roughly centred on x = 0, z = 0. Everything stands on
  y = 0 unless it is mounted on something.

Then list **connections** (pipes, ducts, chutes, conveyors) as 3D point lists
in metres, and **measurement points** (sensors / instruments) as a surface
point plus the outward direction.

Composite parts already contain their drive train and base — do not add
these again: `p.fanSet` = skid + scroll casing + two bearings + shaft +
coupling + motor; `p.pumpSet` = skid + pump + bearing frame + coupling +
motor; `p.tank` = plinth (on the floor) + shell + bottom + roof + manhole +
nozzle (+ legs, rail, ladder); `p.baghouse` = legs + hoppers + valves + body +
plenum + rail + ladder; `p.drum` = shell + tyres + rollers + piers;
`p.bucketElevator` = boot + legs + head + drive + platform + ladder;
`p.stack` = foundation + platform + ladder. Add extra items only for things
the picture shows beyond these.

Foundations are low: plinths 0.2–0.6 m tall; a machine block foundation at
most 1.0 m. Ducts and pipes overhead are carried by `p.pipeSupports` posts or
a `p.frame` with one level, not by free-standing goalposts you invent.

Then group items into **sub-assemblies** (3–10): each becomes `part("Name")`
so it can be clicked in the app (e.g. "Melting chamber", "Vacuum pump",
"Cooling water").

## Step 2 — Write the file

Copy `template.md`. Write one layout constant per item (centre, size), then in
`build`:

1. `part(null)` — floor items with no owner (plinths, shared structure,
   pipe racks, cable trays).
2. For each sub-assembly: `part("Name")`, then its equipment via `p.*`.
3. Connections: `p.pipeRun`, `p.duct`, `p.conveyor`; valves on pipes (`p.valve`);
   supports under every run that is more than 2 m long and above 1 m high
   (`p.pipeSupports`).
4. Structures: `p.frame` for towers / mezzanines / platforms; every deck
   higher than 1.5 m has a handrail (frame decks have one) and a ladder.
5. Instruments: `p.transmitter(at, normal)` at every measurement point.
6. **Detail layer (required).** Go through every item and add what applies —
   this is what separates a twin from a box model. A finished model has
   400–3000 meshes; the renderer warns below 350.
   - every flange and lid: `k.boltCircle` (12–24 bolts);
   - every box housing / cabinet face you can see: `k.panel` (inset bolted
     cover), plus louvres (rows of thin `k.box` slabs in `mats.recess`);
   - every round shell taller than 2 m: stiffener `k.ring` every 1–1.5 m,
     a manhole (`k.disc` machined + `k.boltCircle`), 2–4 nozzles (`k.cyl`
     machined + `k.ring` flange);
   - motors and gearboxes: cooling ribs come with `k.motor`; add a terminal
     box, lifting lugs (`k.box` steel 0.05 m), oil sight glass (`k.disc` recess);
   - every pipe: flanges at joints (`k.disc` machined, r × 1.7), supports,
     a valve where the picture has one;
   - structure: base plates and anchor bolts at column feet, handrails and
     a ladder for every deck above 1.5 m, kick plates;
   - services: one overhead cable tray (`k.beam` steel) with drops to each
     unit; small junction boxes (`k.box` model 0.3 × 0.4 × 0.15) on machines;
   - every measurement point: `p.transmitter`.
Material use (pass these as the `mat` argument):

| Thing | Material |
|---|---|
| Equipment bodies, housings, motors, cabinets | `mats.model` (default) |
| Shells of tanks, ducts, vessels, chambers | `mats.shell` |
| Structural steel: columns, beams, bracing, legs, skids | `mats.steel` |
| Shafts, flanges, nozzles, couplings, valves, machined faces | `mats.machined` |
| Openings, windows, screens, grilles, dark slots | `mats.recess` |
| Foundations, plinths, concrete piers | `mats.concrete` |
| Handrails, ladders, thin bar | `mats.rail` |
| Deck plates, gratings, base plates | `mats.plate` |
| Process material: melt, bed, powder on a belt, glowing charge | `mats.material` |
| Bolt heads | `mats.bolt` (via `k.bolt` / `k.boltCircle`) |

## Step 3 — Render, look, fix (repeat until clean)

From the repository root:

```bash
node scripts/diagram-lab/render.mjs <your-file.ts> --out <your-file.png>
```

(First time only: `cd scripts/diagram-lab && npm install`.)

It prints a JSON report and writes a PNG with four views: front-left and
rear-right three-quarter, a front elevation and a plan from above.

1. If `compiled` is false: fix the TypeScript error and run again.
2. Fix every `errors` entry (a `build() threw` error shows the stack). A
   `Type error … Line N` is a wrong call on that line (wrong argument order
   or option names: compare it with the part's signature in reference.md);
   `NaN` errors come from such calls too. Fix those first.
3. Fix every `warnings` entry (floating parts, size mismatch, too plain…).
4. **Open the PNG and compare the front elevation with the source image** —
   same order, same proportions, same heights. Use the plan view to check
   nothing overlaps and the layout makes sense. Go through `checklist.md`.
5. Fix and render again.

Stop only when there are no errors, no unexplained warnings and every
checklist item passes. Plan for at least three render rounds. Render once
with `--theme light` too.

## Step 4 — Register it in the app

If the file is in `src/components/home/twin/models/`, add it to
`src/components/home/twin/models/index.ts`: import its `model` and add
`{ diagramType: "<kebab-name>", model }` to `KIT_MODELS` (same
`diagramType` as the 2D sheet of the same machine, if there is one). Then it
shows in the app viewer (`kit-model-canvas.tsx`, preview at `/dev/diagrams`),
every `part("…")` hoverable and clickable. Run `npx tsc --noEmit` and
`npx eslint <your file>`; both must be clean.

## Step 5 — Report

Tell the user: the file path, the PNG path, the sub-assemblies, the overall
size in metres, which sizes you had to guess, and any items you could not
identify (and what you built instead).

## Hard style rules (never break)

- Only the `mats` passed to `build`. Never `new THREE.Mesh…Material`, never a
  colour value, texture, light, camera, renderer or scene.
- Add meshes only through `k.*`, `p.*` or `k.add(mesh)` (mesh with a `mats.*`
  material). Never `scene.add` — there is no scene in your file.
- Metres everywhere. y = 0 is the floor; nothing below it, nothing floating.
- Brass (`mats.material`) only for process material inside / on equipment.
- No text, labels, arrows, sprites or HTML in 3D — the app adds those.
