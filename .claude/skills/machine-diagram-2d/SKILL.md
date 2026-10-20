---
name: machine-diagram-2d
description: Turn an image (photo, PDF page, P&ID, process schematic, sketch, screenshot) of any machine, process line or factory into an ULTRON 2D machine-kit drawing — a React/SVG sheet (`LineSheetArt`) with graphite equipment, pipes, flows, labels and measurement pads, in the house style. Use when the user uploads or points to an image and asks for a 2D diagram, mimic, schematic, machine drawing, line sheet or "draw this" for ULTRON.
---

# 2D machine diagram from an image

You will turn a picture of equipment into one `.tsx` file that exports
`sheet: LineSheetArt`. The drawing is built from ready-made parts in
`@/components/assets/machine-kit/parts-2d` and the kit primitives in
`@/components/assets/machine-kit/machine-kit`. You do not invent colours or
styles: the parts already carry the style. Your job is to **measure, map,
place and detail**.

Read these files from this skill folder before starting:

1. `reference.md` — every part, its props and what its box means. Read all of it.
2. `template.md` — the file skeleton you copy.
3. `checklist.md` — the review you run after every render.

Work through the steps in order. Do not skip the inventory or the render.

---

## Step 1 — Look and write the inventory (no code yet)

Open the image. Imagine a 10 × 10 grid over it (0 % = left / top edge,
100 % = right / bottom edge). Write a table in your reply with one row per
physical item you can see:

| # | What it is | Part to use | Box x0–x1 % | Box y0–y1 % | Label text | Notes |
|---|-----------|-------------|-------------|-------------|------------|-------|
| 1 | Vertical storage tank with cone bottom on legs | `Tank` bottom="cone" legs | 4–12 | 10–78 | RAW MEAL SILO | level window |
| 2 | Fan + motor on a base | `FanSet` | 60–80 | 55–80 | ID FAN | outlet left |
| … | | | | | | |

Rules for the inventory:

- **Every** item: vessels, machines, motors, gearboxes, pumps, fans, valves,
  dampers, conveyors, cabinets, structures, platforms, pipes and ducts.
- Read the box edges carefully against your grid: where does the item start
  and end horizontally and vertically? Estimate to 1 %.
- Use the "If you see … use …" table in `reference.md` to pick the part. If
  nothing fits, use `Housing` (box with bolts) plus details — see "Unknown
  machines" in `reference.md`.
- Then list **connections** (pipes, ducts, chutes, belts, flow arrows): from
  which item to which item, the route as a few points in %, the medium
  (material, gas, air, water, oil, signal) and the size (thin pipe / large duct).
- Then list **measurement points** (instrument tags, sensor circles, gauges):
  tag text (or invent `T1`, `P1`… if none are printed), the item it sits on, and
  its position in %.
- Then find the **ground line**: the y % where machines stand. Most drawings
  have one floor; tall structures and elevated items stand on frames.
- Ignore page furniture: titles, borders, legends, tables, logos, revision boxes,
  notes paragraphs, page numbers.

## Step 2 — Sheet size and units

- Measure only the drawing area (crop away titles and tables in your head).
  **Wide or square image:** `W = 1600`, `H = round(1600 × height ÷ width)`,
  clamped to 600 … 1250. **Tall image** (height > width): `H = 1200`,
  `W = round(1200 × width ÷ height)`, at least 800. Keep the image's aspect
  ratio so circles stay round and the drawing fills the sheet.
- Convert every % to sheet units: `x = W × x% / 100`, `y = H × y% / 100`.
- Keep a 40-unit margin: nothing may go below x = 40 or above x = W − 40, same
  for y. If your boxes touch the edges, scale them all in a little.
- The drawing must fill the sheet: equipment should span about 85–95 % of the
  width and at least 70 % of the height. If the image is mostly empty space,
  enlarge the equipment (scale every box about the sheet centre) rather than
  leaving empty sheet.

Write the converted boxes as constants at the top of the file (see template),
e.g. `const SILO = { x: 64, y: 90, w: 128, h: 620 };`. Every part reads its
numbers from these constants — never retype numbers in two places.

## Step 3 — Tidy the layout (this is what makes it look engineered)

Before writing parts, adjust the constants:

1. **One ground line.** Set `const GROUND = …`. Every floor-standing item's box
   bottom (`y + h`) equals `GROUND` exactly. Draw `<GroundLine x1={40} x2={W - 40} y={GROUND} />`.
2. **Shared centrelines.** Items on one shaft (motor → coupling → gearbox →
   driven machine) share one shaft height. Items in a column share one centre x.
3. **Orthogonal runs.** Pipes and ducts run horizontal and vertical only, with
   right-angle bends; each point list changes only x or only y per step.
4. **Connect for real.** A pipe ends exactly on the item edge it enters (use
   the box constants: `SILO.x + SILO.w`, not a guessed number).
5. **Proportions.** Motors are smaller than the machine they drive; valves are
   small (size 12–20); labels are small. If the image is a rough sketch, use
   real-world proportions.
6. **No overlaps** between separate items unless one is mounted on the other.
7. **Nothing floats.** Schematics often draw boxes in mid-air (cabinets,
   generators, pumps placed wherever there was room). In our drawings every
   free-standing item stands on `GROUND`, on another item (stacked, e.g. a
   generator under its cabinet), on a `Frame` / `Platform`, or hangs from a
   structure you draw. Move floating items down to the ground and keep their
   left-to-right order — order matters more than the exact y in the source.
   Re-route the pipes to the new positions.
8. **Compact, readable routing.** Place connected items near each other and
   keep the sheet free of long pipes across empty space: shortest
   orthogonal route, at most two bends, parallel pipes 12–20 units apart,
   no pipe through an equipment body. A cabinet and the unit it powers may
   stack (generator on the floor, cabinet beside or on top) to close gaps.
   Signal / power links are short dashed `Flow medium="signal"` lines, not pipes.
   Use simple parts for machines the image shows as boxes: "vacuum pump +
   motor" is a `PumpSet`, "fan" a `FanSet`, "chiller" a `Cabinet` with louvres.
9. **Instruments touch what they measure.** The `Instrument` mount point
   `(x, y)` lies exactly on the outline of the part or pipe it measures (e.g.
   `TANK.x + TANK.w` for the right wall). If the source shows a sensor
   floating near a line, mount it on that line.

## Step 4 — Write the file

Copy `template.md`. Then fill `Art()` in this order (later = drawn on top):

1. `GroundLine`
2. Structures behind equipment: `Frame`, `Column`, `Platform`, `Ladder`
3. Ducts and pipes that pass **behind** equipment: `Duct`, `Pipe`
4. Large equipment: `Tank`, `Cyclone`, `Drum`, `Baghouse`, `Chamber`, `Cabinet`, …
5. Drives and small machines: `FanSet`, `PumpSet`, `ElectricMotor`, `Gearbox`, `Bearing`, `Coupling`
6. Pipes in front, valves (`Valve`), dampers, bellows
7. Process flows (`Flow`) — thin coloured arrows showing what moves where
8. Instruments (`Instrument`) at every measurement point
9. Labels (`MachineLabel`) — one per equipment item, uppercase

**Insides.** When the source shows what is inside (melt, bed, crucible,
coil, flask, charge, rotor), draw it inside the body: contents with
`PAINT.material`, vessels-inside with `PAINT.cylinderV` and an inner
`PAINT.recess`, coils as two columns of small rounded `PAINT.material` or
`PAINT.raised` bars on both sides of what they heat (not loose lines), rotors
as `GearWheel` / `Fan` / circles with hubs.

**Detail layer (required).** The parts give base detail; add what the image
shows on top: inspection doors (`Panel`), louvres (`Louvres`), bolt rows
(`BoltLine`), flanges (`Flange`), nozzles, extra platforms, ladders, a support
(`Column` down to `GROUND`) under a pipe only where it runs low (within ~120
units of the ground) for more than ~250 units — never a column standing alone
in the middle of the sheet — and contents (`level` on tanks, `heat` on chambers). A finished
sheet has 150–600 SVG shapes; the renderer warns below 60.

**Labels.** `MachineLabel` uppercase, `size` 9–11, placed centred **below**
the item (y = item bottom + 18) for floor items or **above** for tall/elevated
items (y = item top − 10). Never over a body. 3–20 labels per sheet. No
sentences, no tag chips, no legends, no title block — the app adds those.

**Tags.** Use the tag codes printed in the image (P1, TT-101 …). If only
descriptions are printed ("Fan bearing temp."), make short codes from them —
`TMP-01`, `VIB-02`, `PRS-01`, `CUR-01`, `SPD-01`, `FLW-01`, `LVL-01` — and
write the description in a comment next to the point.

**Pads and callouts.** For every measurement point, put a pad at the
instrument head: `pads: { "TT-101": instrumentHead(x, y, "up") }`. Overview
sheets also need `callouts` (where the value plate sits): `[x, y, "start"]`
places a plate's left edge just right of the pad, `"end"` its right edge to the
left; use `x = padX + 14` with `"start"` or `x = padX − 14` with `"end"`,
`y = padY`, and pick the side with empty space. If the image has no
measurement points, use `pads: {}`.

## Step 5 — Render, look, fix (repeat until clean)

Run from the repository root:

```bash
node scripts/diagram-lab/render.mjs <your-file.tsx> --out <your-file.png>
```

(First time only: `cd scripts/diagram-lab && npm install`.)

It prints a JSON report and writes a PNG. Then:

1. If `compiled` is false: fix the TypeScript error it names and run again.
2. Fix every entry in `errors`. A `Type error … Line N` is a wrong call
   on that line (compare it with the part's props in reference.md): fix
   those first.
3. Fix every entry in `warnings` (art outside the sheet, too empty, pads off
   the equipment, too few shapes, overlapping labels…).
4. **Open the PNG and look at it next to the source image.** Go through
   `checklist.md` item by item and write down each failure.
5. Fix them in the code and render again.

Stop only when: no errors, no warnings (or each remaining warning is
explained), and every checklist item passes. Plan for at least three render
rounds. Also render once with `--theme light` and check nothing disappears.

## Step 6 — Register it in the app

If the file is in `src/components/assets/diagrams/`, add it to
`src/components/assets/diagrams/index.ts`: import its `sheet` and add
`{ diagramType: "<kebab-name>", label: "<plain machine name>", sheet }` to
`DIAGRAM_SHEETS`. The drawing kind is then offered under "Drawing style"
when a machine is commissioned (Configure), and every machine whose drawing
style (DB `equipment_models.diagram_type`) is that kind shows the sheet on
its Overview, with its sensors at their DB x / y (% of the sheet: seed them
as `pads[tag]` / width or height × 100). Preview at `/dev/diagrams`. Run
`npx tsc --noEmit` and `npx eslint <your file>`; both must be clean (no unused
constants).

## Step 7 — Report

Tell the user: the file path, the PNG path, what equipment you drew, any
items you could not identify (and what you drew instead), and any
measurement points you invented tags for.

## Hard style rules (never break)

- Colours only through `MX.*` / `PAINT.*` / the parts. No `#hex`, `rgb()`,
  named colours, opacity tricks for colour, gradients of your own, or `<style>`.
- No background, no grid, no frame/border, no title, no legend, no tables in
  the art. Art = equipment, pipes, flows, instruments and equipment labels only.
- Status colours (green / amber / red) never appear in the art — pads carry status.
- Brass (`MX.material`, `PAINT.material`) only for process material inside
  equipment (bed, melt, contents) and material flow arrows.
- Flows: material = brass, hot gas = `gas`, air / water = `air`, signals =
  dashed `signal`. Flow arrows are thin (w 1.6–2.2) and point downstream.
- Line weights are fixed by the parts; do not set `strokeWidth` above 2 on
  your own shapes, except pipes / ducts through `Pipe` / `Duct`.
- Your own extra shapes use the presets: `{...PAINT.body}` for solid bodies,
  `{...PAINT.raised}` for plates / flanges / covers, `{...PAINT.recess}` for
  openings, windows, slots, `{...PAINT.cylinderV}` for vertical round shells,
  `{...PAINT.cylinder}` for horizontal round shells, `{...PAINT.shaft}` for
  shafts and rods, `{...PAINT.hair}` for seams, `{...PAINT.detail}` for detail lines.
  Rounded corners: `rx` 2–10.
