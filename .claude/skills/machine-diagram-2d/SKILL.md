---
name: machine-diagram-2d
description: Turn an image (photo, render, PDF page, P&ID, schematic, DCS/HMI screenshot, sketch) of any machine, process line or factory into ULTRON's house-style drawings — the 2D machine sheet AND the 3D model — by writing a small JSON spec that a script lays out, routes, details and renders. Use when the user uploads or points to an image and asks for a 2D or 3D diagram, mimic, machine drawing, line sheet, twin or "draw this" for ULTRON.
---

# Machine drawing from an image

You do **not** draw anything and you do **not** write code. You write one
JSON file (the **spec**) that says:

- which machines are in the picture, what kind each is, and where it is;
- which machines are connected and by what (pipe, cable, signal …);
- where the sensors are.

Then one command turns the spec into the finished 2D drawing and 3D model in
the house style (layout, straight pipes, detail, labels, sensor pads are all
done for you). You look at two check pictures, fix the spec, run again.

Follow the steps **in order**. Do every step. Do not skip the checks.

---

## Step 1 — Prepare the image

Pick a work folder (the task tells you; otherwise the folder the image is in).
Run, from the repository root:

```
python3 scripts/diagram-lab/prep.py <image> --out <work folder>/prep
```

Open these files and look at them:

- `<work folder>/prep/grid.png` — the image with a yellow grid. Numbers on
  the edges: **x 0 = left edge … 100 = right edge, y 0 = top … 100 = bottom.**
  Every position you write is read off this grid. Never use pixels.
- `zoom-1.png` (top-left quarter), `zoom-2.png` (top-right), `zoom-3.png`
  (bottom-left), `zoom-4.png` (bottom-right) — the same image enlarged, with
  grid numbers every 5. Use them to read small text and exact edges.

### What if the image is not a plain machine picture?

- **A block flow chart** (boxes with machine names joined by arrows, e.g.
  "Crusher → Raw mill → Kiln"): draw each named machine as an item of its
  type, with the box where the chart's box is, and a `material` link for
  each arrow. Use `"layout": "schematic"`. Boxes that are not machines
  ("Market", "Quarry", "Power handling") are left out.
- **A factory, plant or line** (a photo, render, flow sheet or DCS screen of
  many machines): every machine is an item in the order the material flows
  — nothing is merged into one box. Name each with the name the image
  prints (code in brackets if given: `"KILN (KLN-01)"`). Link every machine
  to the next with the right medium, and name the main flows (`label`).
  Leave out people, buildings, vehicles, crates and background. A line of
  12 machines needs 12 items and at least 11 links.
- **No machine at all** (a person, a chart of numbers, a logo, a text-only
  slide): do not write a spec. Say "no machine in the image" in your report
  (in an onboarding run, push it as failed with that reason).
- **Several small pictures in one image** (a collage, steps 1-2-3): draw the
  largest picture of the machine only.

**Draw everything the image shows.** Never narrow the drawing to one area
or one machine of the picture because of a file name, a title or a guess —
only when the task itself names one machine. A whole-plant screen becomes a
whole-plant drawing.

## Step 2 — List the machines (items)

Write a table in your reply first, one row per machine you can see:

| id | type | box: left, top, right, bottom | label |
|----|------|-------------------------------|-------|
| cabinet | cabinet | 3, 20, 13, 50 | CONTROL PANEL |

Rules:

1. **One row per physical machine** (cabinet, pump, tank, fan, chamber …).
   Pipes, cables, arrows and sensors are NOT items (they come in steps 3–4).
   A valve on a pipe is NOT an item (it goes on the link in step 3).
2. **id**: short, lower case, no spaces: `booster_pump`, `feed_tank`, `fan_2`.
3. **type** — decide in this order:
   a. Is it a standard piece of process equipment from the **equipment**
      table (pump, tank, fan, cyclone, conveyor, cabinet …)? Use that type.
   b. **Anything else — any machine at all** (a robot, a lathe, a sewing
      machine, a packing machine, an unusual furnace): do NOT use one big
      box. Build it from **shapes** (the shapes table): one item per part
      you can see, each in its own place — the main body a `block`, round
      housings `cylinder`, wheels / pulleys / dials `wheel`, funnels and
      tapered parts `cone`, its motor a `motor`, screens and openings a
      `block` with `"tone": "recess"`, covers `"tone": "raised"`, an
      inclined arm a `block` with `"angle"`. Usually 4–25 parts. Make
      touching parts touch in your boxes (see rule 9).
      **The drawing of such a machine is traced from the image itself** —
      its real outline, curves and detail — so your part boxes only have to
      say *where* the machine and its parts are and what they are called.
      Together your boxes must cover the **whole** machine, edge to edge
      (nothing of it left outside a box), and never reach over label text
      or into the next machine. Don't worry about drawing curves: boxes
      are enough, the picture gives the shape.
   c. Only a small, unclear thing you cannot break into parts → `machine`.
4. **box**: the machine's own outline on the grid — left edge x, top edge y,
   right edge x, bottom edge y. Read each edge off grid.png / the zooms.
   - Wrap the machine body only: NOT its name text, NOT the sensor circles,
     NOT the pipes going out of it.
   - Include its feet / base / skid (the part it stands on).
   - left < right and top < bottom, always. Values are 0–100.
5. **label**: the name printed next to it in the image, in CAPITALS. No name
   printed → a short plain name ("PUMP", "MIXER"). No label for small parts.
6. A machine that sits **on top of** another machine (an actuator on a
   chamber, a chamber on a chamber, a motor on a tank lid): add `"on": "<id
   of the one below>"`. Use `"on"` only for "stands on top of". A part that
   **hangs below** another (a spindle under a crossbar, handles under a
   wheel) or is fixed **beside** it gets no `"on"` — just draw its box
   touching the other part, and it stays exactly there.
7. **What kind of picture is it?** Look at the floor in the image:
   - **The floor is a line** at the bottom (or there is no floor and the
     machines are drawn front-on, like an elevation): a **side view**. Leave
     `"layout"` out (it is `"plant"`). Everything is stood on the floor for
     you; a machine the image draws well above the floor keeps its height
     and gets a stand down to the floor. Only if the
     image itself **draws** a second floor — a floor line, slab or platform
     with machines standing on it (a two-level plant) — add
     `"floors": [y1, y2]`. Never add a floor that is not drawn, not even to
     keep a machine at its height or to stack one machine on another (use
     `"on"` for that).
   - **The floor is a big area you look down onto** — you can see the tops
     of the machines, machines further back are higher up in the picture
     (an isometric / 3D render of a cell or factory, an aerial photo, a
     layout plan): add `"layout": "schematic"`. A side view would pile the
     back machines on top of the front ones.
   - **A flow diagram, P&ID or control-room (DCS / SCADA) screen** with
     machines placed all over the page: add `"layout": "schematic"`.
   With `"schematic"` the machines keep the places the image gives them.
8. Repeated machines (6 identical fans) → 6 items: `fan_1` … `fan_6`.
9. **Parts that touch stay joined.** When you build a machine from shapes,
   draw the boxes so parts that touch in the image touch (or slightly
   overlap) in your boxes: they are kept together exactly as drawn — a
   spindle hanging from a crossbar stays hanging, an arm stays on its base.
   Give each part a label only if the image names it.

### Catalog of types

Two tables: **equipment** (standard process equipment, drawn as a finished
part) and **shapes** (to build any other machine from its visible parts).

#### Equipment

| type | use it for | useful options |
|------|-----------|----------------|
| `cabinet` | control cabinet, electrical panel, MCC, PLC, VFD, HMI box | `doors`, `screen`, `lamps` |
| `generator` | induction generator, power supply, transformer, rectifier, UPS | |
| `motor` | an electric motor on its own | `motor`: shaft side `left`/`right` |
| `gearbox` | gearbox / reducer on its own | |
| `drive` | motor + gearbox together (main drive) | `motor`: side of the motor |
| `pump` | pump with its motor (water, oil, slurry) | `motor`: `left`/`right` |
| `vacuum-pump` | vacuum pump with its motor | `motor`: `left`/`right` |
| `fan` | fan / blower with motor | `outlet`: `left`/`right` |
| `compressor` | air compressor | |
| `tank` | vertical tank, vessel, reactor, receiver, column | `top`: dome/cone/flat, `bottom`: flat/cone/dish, `level` 0–1 |
| `silo` | silo, bin, bunker (tall, cone bottom) | `level` |
| `hopper` | hopper, chute, funnel | |
| `horizontal-tank` | horizontal vessel, boiler, air receiver | `level` |
| `cyclone` | cyclone separator | `inlet`: `left`/`right` |
| `stack` | chimney, exhaust stack | |
| `gas-cylinder` | gas bottle (argon, nitrogen, oxygen) | |
| `chamber` | furnace, oven, vacuum / melting / casting chamber, heater box | `contents`: `crucible-coil`, `crucible`, `flask`, `bed`, `parts`, `none`; `heat`: true if glowing |
| `drum` | rotary kiln, dryer, ball mill, rotating drum | `heat`: true |
| `conveyor` | belt / screw conveyor, air slide, drag chain | `kind`: belt/screw/chain/slide; `slope`: flat/up/down (up = rises to the right) |
| `bucket-elevator` | bucket elevator | |
| `filter` | bag filter, dust collector, ESP, scrubber | |
| `heat-exchanger` | heat exchanger, condenser | `kind`: shell/plate |
| `cooling-unit` | chiller, cooling pump / loop skid, radiator, cooling tower | `motor`: `left`/`right` |
| `actuator` | pneumatic / hydraulic cylinder, ram, sealing-rod actuator | `horizontal`: true |
| `hydraulic-unit` | hydraulic power unit, lube / grease unit, oil skid | |
| `crusher` | crusher, breaker, shredder | |
| `mixer` | mixer, blender, agitator | |
| `press` | press (hydraulic, stamping) | |
| `extruder` | extruder, injection unit | `motor` |
| `burner` | burner (horizontal) | `heat` |
| `screen` | vibrating screen, sieve | |
| `frame` | steel structure, tower, rack, platform the others stand on | |
| `rotary-valve` | rotary airlock, rotary feeder, star valve, flap valve | |

#### Shapes (build any other machine from these)

| type | use it for | useful options |
|------|-----------|----------------|
| `block` | any solid part: body, housing, column, base, bed, arm, crossbar, guard, door | `tone`: raised / recess / material; `angle`: degrees |
| `cylinder` | a round part seen from the side: spindle, roll, barrel, round housing, shaft (even when wider than tall) | `horizontal`: true if its axis lies flat; `angle` |
| `wheel` | a round face seen end-on: wheel, pulley, flywheel, roller end, dial, gear, handwheel | |
| `cone` | a tapered part: funnel, nozzle, cone, duct transition | `narrow`: top / bottom / left / right |
| `pile` | loose material lying in a heap: stockpile, pile, spill | |
| `table` | machine table, work bed | |
| `fixture` | clamp, vise, chuck, jig | |
| `workpiece` | the part being made / processed (workpiece, casting, mould, product) | |
| `tool` | cutting tool, drill, cutter, nozzle, electrode (cutting end down) | `horizontal`: true if it points sideways |
| `machine` | only a small, unclear item you cannot break into parts (drawn from its outline in the image) | |

Options go in `"options": { … }` on the item, e.g.
`"options": { "motor": "left" }`. Leave out options you are not sure of.

## Step 3 — List the connections (links)

One row per pipe, duct, cable, belt or dashed signal line between two items:

| from | to | medium | valves |
|------|----|--------|--------|
| feed_tank | pump | water | |
| dosing | feed_tank | gas | regulator at 15, solenoid at 55 |

- **from / to**: item ids from step 2, exactly as written. Flow goes from →
  to (for a vacuum line, from the pump to the chamber is fine).
- **medium** — one of:
  `material` (powder, meal, clinker, melt, product moving) ·
  `hot-gas` (flue / kiln / exhaust gas) · `gas` (argon, nitrogen, fuel gas) ·
  `air` (compressed / combustion air) · `water` (cooling or process water) ·
  `steam` · `oil` (hydraulic, lube) · `vacuum` ·
  `power` (power cable, busbar, induction leads) ·
  `signal` (dashed control / data line).
- Two lines between the same two items (supply and return) → two links; give
  them ids: `"id": "water_out"` and `"id": "water_in"`.
- **valves**: valves drawn on that line, each with `kind` (gate, globe, ball,
  butterfly, check, control, solenoid, regulator) and `at` = how far along
  the line from `from` to `to`, in % (25 = a quarter of the way).
- **label**: when the image names the flow ("Hot meal to kiln", "Tertiary
  air", "Clinker to crusher"), add `"label": "HOT MEAL TO KILN"` — it is
  written along the line. Give every long line of a factory its name.
- **path** — where the line runs in the image. Follow the line in the image
  with your eye and write its corner points on the grid, from the `from`
  item to the `to` item: `"path": [[23, 31], [23, 42], [61, 42], [61, 50]]`.
  - First point: where the line leaves the `from` machine (on its edge).
    Last point: where it enters the `to` machine.
  - One point at every corner (where the line turns). A straight line needs
    only its two ends. Do not add points along a straight run.
  - Use the zoom pictures to read corners exactly; a line hugging a machine
    stays hugging it.
  - A line with no visible route in the image (two machines just side by
    side) may leave `path` out; the script then routes it.
  - Give a path for every line the image draws. This is what makes the
    drawing look like the image instead of a re-arranged copy.
- **Count your lines.** Before moving on, count the pipes, ducts and arrows
  in the image and make sure you have a link for each. A machine with no
  link is usually a mistake (every machine in a plant feeds or is fed).

## Step 4 — List the sensors (points)

One row per sensor / instrument circle / gauge in the image:

| tag | on | pos x, y | what it measures |
|-----|----|----------|------------------|
| LVL-01 | feed_tank | 27, 50 | Feed tank level |

- **tag**: the tag printed in the image (TT-101, P1 …). If you were given a
  list of sensor tags for this machine, use those tags exactly as written and
  match each one to the place the image shows. Otherwise make one up from
  what it measures: `TMP-01` temperature, `PRS-01` pressure, `VIB-01`
  vibration, `FLW-01` flow, `LVL-01` level, `POS-01` position, `SPD-01` speed,
  `CUR-01` current, `PWR-01` power. Number each kind 01, 02, 03 …
- **on**: the id of the item it sits on, or the id of the link it sits on
  (for a sensor on a pipe: give that link an `"id"` in step 3 and use it).
- **pos**: where the sensor circle is on the grid, [x, y].
- Every sensor the image shows gets a row. Do not invent sensors.

## Step 5 — Write the spec

Write the file `<work folder>/<name>.spec.json` (the task may give the exact
path and name). Copy this shape exactly — it is the spec for the example
image (a made-up cooling water treatment skid). Replace everything
with what YOUR image shows:

```json
{
  "id": "water-treatment-skid",
  "name": "Cooling water treatment skid",
  "image": "source.png",
  "items": [
    { "id": "cabinet", "type": "cabinet", "box": [3, 20, 13, 50], "label": "CONTROL PANEL" },
    { "id": "feed_tank", "type": "tank", "box": [20, 25, 34, 78], "label": "FEED TANK" },
    { "id": "mixer_drive", "type": "motor", "box": [24, 15, 30, 25], "label": "MIXER DRIVE", "on": "feed_tank" },
    { "id": "pump", "type": "pump", "box": [40, 64, 55, 80], "label": "BOOSTER PUMP", "options": { "motor": "right" } },
    { "id": "filter", "type": "filter", "box": [62, 22, 76, 78], "label": "SAND FILTER" },
    { "id": "cooler", "type": "heat-exchanger", "box": [82, 40, 97, 56], "label": "PLATE COOLER" },
    { "id": "dosing", "type": "gas-cylinder", "box": [86, 64, 90, 88], "label": "DOSING GAS" }
  ],
  "links": [
    { "from": "feed_tank", "to": "pump", "medium": "water", "path": [[34, 72], [40, 72]] },
    { "id": "pump_out", "from": "pump", "to": "filter", "medium": "water", "path": [[42, 64], [42, 14], [69, 14], [69, 22]] },
    { "id": "filter_out", "from": "filter", "to": "cooler", "medium": "water", "path": [[76, 48], [82, 48]] },
    { "from": "dosing", "to": "feed_tank", "medium": "gas", "path": [[88, 64], [88, 60], [58, 60], [58, 86], [27, 86], [27, 78]], "valves": [{ "kind": "regulator", "at": 15 }, { "kind": "solenoid", "at": 55 }] },
    { "from": "cabinet", "to": "pump", "medium": "signal", "path": [[13, 30], [16, 30], [16, 90], [47, 90], [47, 80]] },
    { "from": "cabinet", "to": "mixer_drive", "medium": "signal", "path": [[13, 24], [15, 24], [15, 10], [27, 10], [27, 15]] }
  ],
  "points": [
    { "tag": "LVL-01", "on": "feed_tank", "pos": [27, 50], "text": "Feed tank level" },
    { "tag": "PRS-01", "on": "pump_out", "pos": [42, 40], "text": "Pump discharge pressure" },
    { "tag": "FLW-01", "on": "filter_out", "pos": [79, 48], "text": "Filtered water flow" },
    { "tag": "TMP-01", "on": "cooler", "pos": [89, 47], "text": "Cooler outlet temperature" }
  ]
}
```

A machine that is not standard equipment is built from shapes. Example —
a robot arm next to a CNC lathe (items only):

```json
"items": [
  { "id": "robot_base", "type": "block", "box": [10, 70, 22, 80], "label": "ROBOT" },
  { "id": "robot_turret", "type": "cylinder", "box": [13, 58, 19, 70] },
  { "id": "robot_arm_1", "type": "block", "box": [12, 30, 18, 60], "options": { "angle": 20 } },
  { "id": "robot_arm_2", "type": "block", "box": [16, 26, 34, 32], "options": { "angle": -10 } },
  { "id": "robot_gripper", "type": "tool", "box": [32, 30, 36, 40] },
  { "id": "lathe_body", "type": "block", "box": [45, 35, 85, 80], "label": "CNC LATHE" },
  { "id": "lathe_window", "type": "block", "box": [50, 42, 68, 62], "options": { "tone": "recess" } },
  { "id": "lathe_chuck", "type": "wheel", "box": [54, 46, 62, 56] },
  { "id": "lathe_panel", "type": "block", "box": [72, 40, 82, 60], "options": { "tone": "raised" } },
  { "id": "lathe_screen", "type": "block", "box": [74, 42, 80, 48], "options": { "tone": "recess" } }
]
```

Small parts drawn inside a bigger one (a window in a door, a chuck in a
window) are fine — they sit on top of it.

- `"scale"` (optional, for the 3D model): when the image or its text gives
  a real size ("kiln 60 m long", "tank height 12 m"), add
  `"scale": { "item": "<that item's id>", "metres": <its height> }` so the
  model is built to true size. Otherwise leave it out.
- `"id"`: kebab-case name of this machine kind (the task may give it).
- `"image"`: path of the source image, relative to the spec file.
- Plain JSON: double quotes, commas between entries, no comments.

## Step 6 — Draw, check, fix (at least 2 rounds)

Run:

```
node scripts/diagram-lab/draw.mjs <work folder>/<name>.spec.json
```

(Add `--name <kind>` if the task says what the files must be called.)

It prints a report and writes, next to the spec: `<name>.tsx` (2D),
`<name>.ts` (3D), `<name>.png`, `<name>-3d.png`, `<name>-overlay.png`,
`<name>-compare.png`.

**Round check — do all of these, in order:**

1. **Problems.** Read every line of `"problems"`. Each one says what to
   change in the spec. Change it.
2. **Overlay.** Open `<name>-overlay.png`. It shows your boxes (with ids)
   and your sensor positions (red circles) on the image. For every box ask:
   - Does it wrap exactly one machine, edge to edge? If it is too big, too
     small or shifted, fix its four numbers using the grid on that picture.
   - Is a machine in the image left without a box? Add an item.
   For every red circle: is it on the sensor in the image? If not, fix `pos`.
   For every yellow path (L1, L2 … in the order of your links): does it lie
   on its line in the image, corner on corner, from the right machine to the
   right machine? If not, fix its points. A line in the image with no yellow
   path on it → add the link or its path.
3. **Compare.** Open `<name>-compare.png` (image on top, your drawing below)
   and check:
   - Every machine of the image is in the drawing, with the right kind of part
     (a pump looks like a pump, a tank like a tank). Wrong look → change `type`.
   - Left-to-right order of the machines matches the image.
   - Every pipe / cable / signal line of the image is a line in the drawing,
     running the same way (same corners, same side of each machine).
     Missing → add a link. Wrong kind of line → change `medium`. Running a
     different way → fix its `path` (the problems list says when a path was
     not usable).
   - A machine that should sit on another one sits on it. If not → add `"on"`.
   - Every sensor of the image has a pad (ring) in the drawing.
   - Labels are the names from the image.
4. Fix the spec and run `draw.mjs` again.

Stop when the report has no problems you can fix and the checks above all
pass. **Never edit the .tsx or .ts files** — they are rewritten on every run;
change the spec instead. If `"problems"` reports a "2D drawing error" or "3D
model error", run once more; if it stays, say so in your report.

## Step 7 — Report

Tell the user: the spec path, the drawing files (`.tsx`, `.ts`, `.png`,
`-3d.png`), the machines you drew, anything in the image you could not match
to a type (and what you used instead), and any sensor tags you made up.

If the drawing belongs in the app source (not an onboarding run): copy the
`.tsx` into `src/components/assets/diagrams/` and add it to
`src/components/assets/diagrams/index.ts` (`{ diagramType, label, sheet }`),
and the `.ts` into `src/components/home/twin/models/` (register it in its
`index.ts` the same way).

## Mistakes to avoid

- Pixels instead of grid units. Every number is 0–100 from the grid.
- A box around the label text or the whole group instead of one machine.
- `[left, top, width, height]` — the box is `[left, top, right, bottom]`.
- Forgetting the signal (dashed) and power lines — they are links too.
- A link or point that names an id that is not in `items` (typos).
- Leaving the example's machines in your spec.
- Editing the generated `.tsx` / `.ts` files instead of the spec.
- Stopping after the first run without opening the overlay and compare images.
