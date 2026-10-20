# 3D parts reference

Imports (copy exactly):

```ts
import * as THREE from "three";
import type { Kit, KitMats, KV3 } from "@/components/home/twin/machine-kit-3d";
import { kitParts } from "@/components/home/twin/machine-kit-3d-parts";
```

Inside `build(k, mats, part)`: `const p = kitParts(k, mats);`

**Units:** metres. **Axes:** x = along the line (left → right in the
picture), y = up, z = depth (+z toward the viewer). `KV3` = `[x, y, z]`.
Most parts take the centre of their footprint on the floor `(x, z)` and stand
on `y` (default 0).

---

## If you see … use …

| You see | Use |
|---|---|
| Vertical tank, silo, bin, column, receiver | `p.tank` |
| Furnace, vacuum / pressure chamber, autoclave, reactor body, melting chamber — especially when its inside matters | `p.chamber` (`cut: true` to show the inside) |
| Induction coil, heating / cooling coil, spring | `p.coil` |
| Crucible, ladle, mould, bottle, nozzle, any turned shape | `k.lathe` |
| Tank with stirrer drive on top | `p.tank({ …, agitator: true })` |
| Silo with cone bottom on legs | `p.tank({ …, bottom: "cone", legs })` |
| Horizontal tank, drum, boiler, receiver, heat-exchanger shell | `p.hvessel` |
| Hopper, chute, funnel | `p.hopper` |
| Cyclone | `p.cyclone` |
| Stack / chimney | `p.stack` |
| Gas bottle | `p.gasCylinder` |
| Electric motor | `k.motor` |
| Gearbox | `p.gearbox` |
| Bearing block | `p.bearing` |
| Centrifugal fan / blower + motor | `p.fanSet` |
| Pump + motor | `p.pumpSet` |
| Cabinet, panel, generator, VFD, PLC, transformer box | `p.cabinet` |
| Bag filter / dust collector | `p.baghouse` |
| Rotary kiln, dryer, drum, ball mill | `p.drum` |
| Belt / screw conveyor, air slide | `p.conveyor` |
| Bucket elevator | `p.bucketElevator` |
| Steel structure, tower, platform, mezzanine, pipe rack | `p.frame` |
| Concrete foundation | `p.plinth` |
| Skid / base frame | `p.skid` |
| Pipe | `p.pipeRun` (+ `p.pipeSupports`) |
| Rectangular duct | `p.duct` |
| Valve | `p.valve` |
| Sensor / transmitter | `p.transmitter` |
| Anything else | compose with `k.box`, `k.cyl`, `k.disc`, `k.cone`, `k.lathe` — see "Unknown machines" |

## Typical sizes (when the picture gives no scale)

| Item | Size |
|---|---|
| Person / door / handrail | 1.8 / 2.1 / 1.05 m |
| Small motor (≤ 15 kW) | 0.6–0.9 m long, r 0.15–0.2, shaft height 0.25 |
| Large motor (200 kW+) | 1.5–2.5 m long, r 0.4–0.6, shaft height 0.6–0.9 |
| Process pump set | 1.5–2.5 m long skid |
| Centrifugal fan (process) | volute r 0.8–2.5 m |
| Control cabinet | 0.8–1.2 w × 2.0–2.2 h × 0.5–0.8 d per section |
| Storage tank / silo | r 2–10 m, h 6–40 m |
| Cyclone | r 0.5–3 m, h 3–4 × diameter |
| Belt conveyor | 0.6–1.6 m wide |
| Bucket elevator | casing 0.8–1.6 × 0.6–1.2 m, height 10–60 m |
| Rotary kiln / dryer | r 1.5–3 m, length 15–80 m (dryer 8–20 m) |
| Baghouse | 4–15 m long, 3–6 m deep, 8–15 m tall |
| Gas cylinder | r 0.11–0.12 m, h 1.4–1.6 m |
| Pipe | small 0.02–0.06 m radius, main 0.08–0.3 m |
| Platform deck spacing | 3–6 m per level |

## Equipment parts (`p = kitParts(k, mats)`)

Return values are noted where useful for connecting pipes.

- `p.plinth(x, z, w, d, h = 0.3, y = 0)` → top height. Concrete block.
- `p.skid(x, z, w, d, h = 0.15, y = 0)` → top height. Steel base frame with bolts.
- `p.tank({ x, z, r, h, y = 0, top: "dome"|"cone"|"flat" = "dome", bottom: "flat"|"cone"|"dish" = "flat", legs = 0, rail = false, agitator = false })` → roof height.
  `h` is the total height from `y` to the roof. Adds its own plinth when on
  the floor without legs; a manhole and roof nozzle. `rail` adds a roof
  handrail and a caged ladder on the +z side.
- `p.chamber({ x, z, r, h, y = 0, cut = false, lid = true, viewports = 2 })` → `{ floor, inner, top }`. Round shell with bolted flanges, domed lid, lugs, viewports. `cut` opens the +z side; draw the contents inside from `floor` within radius `inner` (e.g. `k.lathe` crucible, `k.cyl(…, mats.material)` melt, `p.coil`). Stack two chambers by giving the upper one `y` = lower `top`.
- `p.coil(x, z, r, y0, y1, turns, tr = 0.02, mat = mats.machined)` — helix around a vertical axis.
- `p.hvessel({ x, z, r, len, y = 0, axis: "x"|"z" = "x", saddles = true, heads = true })` → axis height.
- `p.hopper(x, z, w, d, h, yTop, outlet = 0.3)` — square hopper whose top is at `yTop`.
- `p.cyclone({ x, z, r, h, y = 0, inlet: "-x"|"x"|"-z"|"z" = "-x" })` → top height. Usually `y` = the deck it hangs from minus part of its height; put it in a `p.frame`.
- `p.stack(x, z, r, h)` — on its own foundation, with platform + ladder.
- `p.gasCylinder(x, z, r = 0.12, h = 1.5)`
- `k.motor(x0, x1, y, z, r, dir = 1)` — TEFC motor lying along x from `x0` to `x1`, shaft height `y`, frame radius `r`; `dir = 1` shaft at `x1`, `-1` shaft at `x0`. Feet reach the floor (y = 0), so stand it on a skid by raising `y` and the skid.
- `p.gearbox(x, z, w, h, d, y = 0, axis: "x"|"z" = "x")` → shaft height.
- `p.bearing(x, z, cy, r, axis = "x", y = 0)` — pillow block for a shaft of radius `r` at height `cy`.
- `p.fanSet({ x, z, r, outlet: "-x"|"x" = "-x", motorSide: "x"|"-x" = "x", y = 0 })` → outlet top `[x, y, z]`. Volute centre at `(x, z)`, impeller axis along z, motor train along x.
- `p.pumpSet({ x, z, len = 1.6, y = 0 })` → discharge top `[x, y, z]`.
- `p.cabinet({ x, z, w, h, d, doors = 1, screen = false, face: "+z"|"-z"|"+x"|"-x" = "+z" })`
- `p.baghouse({ x, z, w, d, h, hoppers = 3 })` → roof height.
- `p.drum({ x, z, r, len, cy, tyres = [0.2, 0.8], gear? })` — along x, axis at height `cy`, piers to the floor.
- `p.conveyor(a: KV3, b: KV3, w = 0.8, kind: "belt"|"screw"|"slide" = "belt")` — a → b is the carrying centreline (may rise); trestles drop to the floor.
- `p.bucketElevator(x, z, w, d, h)`
- `p.frame({ x, z, w, d, levels: number[], bays = 2, rows = 1, decks = true })` — `levels` are deck heights in metres (e.g. `[4, 8, 12]`); columns go to the highest level.
- `p.pipeRun(pts: KV3[], r = 0.06, mat = mats.steel)` — elbows at bends, flanges at both ends. Keep runs orthogonal (change one coordinate per step).
- `p.pipeSupports(points: [x, z][], y)` — T-posts carrying a pipe at height `y`.
- `p.duct(pts: KV3[], w, h)` — rectangular duct, w wide, h deep.
- `p.valve(at: KV3, axis: "x"|"y"|"z", r, actuator = false)` — on a pipe of radius `r` running along `axis`.
- `p.transmitter(at: KV3, normal: KV3, s = 1)` — `at` on the equipment surface, `normal` pointing out of it (e.g. `[0, 0, 1]` on a front face; for a vertical cylinder at angle a: `[Math.sin(a), 0, Math.cos(a)]`).

## Builder calls (`k`)

All add to the current part group. `mat` defaults to `mats.model` unless noted.

- `k.box(w, h, d, x, y, z, mat?)` — box **standing on** `y`, centred on x / z.
- `k.cyl(r, h, x, y, z, mat?, seg = 32)` — upright cylinder standing on `y`.
- `k.cone(rBottom, rTop, h, x, y, z, mat?, seg = 32)` — upright frustum standing on `y`.
- `k.disc(r, len, x, y, z, axis: "x"|"y"|"z", mat?, seg = 24)` — cylinder **centred** on (x, y, z) with its axis along `axis`.
- `k.ring(r, t, x, y, z, axis = "y", mat = mats.steel)` — torus (stiffener band, flange rim, handrail ring).
- `k.lathe(profile: [radius, height][], x, y, z, mat?)` — turned shape around a vertical axis (crucibles, nozzles, domes, bottles).
- `k.tube(a: KV3, b: KV3, r, mat = mats.steel)` — round bar / pipe a → b.
- `k.pipe(pts: KV3[], r, mat = mats.steel)` — polyline pipe with elbows.
- `k.beam(a: KV3, b: KV3, w, h, mat = mats.steel)` — rectangular member a → b.
- `k.bolt(x, y, z, axis, r = 0.05)` and `k.boltCircle(x, y, z, r, n, axis, br = 0.03)` — bolt heads on a face with normal `axis`.
- `k.panel(face: "+z"|"-z"|"+x"|"-x", x0, x1, y0, y1, z0, z1, margin = 0.18)` — inset bolted panel on that face of the box spanning x0..x1, y0..y1, z0..z1.
- `k.rail(x0, z0, x1, z1, y)`, `k.railRect(x0, x1, z0, z1, y)`, `k.railRing(x, z, r, y)` — handrails on a deck at height `y`.
- `k.ladder(x, z, y0, y1, out: 1 | -1)` — caged ladder against a ±z face.
- `k.motor(...)`, `k.transmitter(...)` — see above.
- `k.add(mesh)` — any other `THREE.Mesh` you build with a `mats.*` material (e.g. `new THREE.Mesh(new THREE.TorusGeometry(…), mats.steel)`); set its position / rotation first.

## Schematic symbols are not shapes

A schematic, P&ID or block diagram draws most things as rectangles and
circles. Build the **real object**, not the symbol:

- Chambers, vessels, tanks, reactors, autoclaves, filters, cyclones, pumps,
  motors, cylinders → round (`p.chamber`, `p.tank`, `p.hvessel`, `k.cyl`).
- Cabinets, panels, generators, chillers, skids, hoppers, ducts → boxes.
- A rectangle labelled "pump + motor" is a `p.pumpSet`; "fan" is a `p.fanSet`.
- Machines usually sit on a common base frame or skid; tall machines have a
  frame of columns and tie rods around them.

## Layout and routing

- Keep the cell compact: 0.8–1.5 m between neighbouring machines, the whole
  cell about as big as it would be in a real room. Do not spread items out to
  copy the gaps of a schematic.
- Pipes: leave a nozzle on the equipment (`k.disc` + flange), run up or down
  to one routing height (1.0 m low runs or 2.5–3 m overhead), along x or z,
  and into the other nozzle. Every pipe ends at a nozzle, a valve, or a
  flanged stub at the cell edge for outside connections — never in mid-air.
  Several parallel pipes share one set of `p.pipeSupports`. Floor posts
  only up to ~4 m; anything higher is carried by the structure it runs
  along — a bracket (`k.beam` steel) from the nearest column or deck edge to
  the pipe — never by a pole rising from the floor.
- Chutes, ducts and pipes are steel (`mats.shell` / `mats.steel`) even when
  they carry material. Brass (`mats.material`) only where the material itself
  is visible: a bed in a cut-away, a pile, powder on an open belt, a melt.
- Towers and multi-level structures: give every level a deck (`decks: true`)
  so the floors read; equipment sits on or hangs through those decks.
- Signal / power wiring: one cable tray (`k.beam` with `mats.steel`, 0.2–0.3 m
  wide) overhead at 2.4–2.8 m with drops to each unit, instead of separate wires.

## Unknown machines (compose)

Build what you see from simple solids, then detail:

1. Main body: `k.box` (`mats.model`) or `k.cyl` / `k.disc` for round bodies (`mats.shell`).
2. Base: `p.skid` or `p.plinth` under it.
3. Doors / covers: `k.panel` on its faces; windows `k.box(… mats.recess)` thin slabs.
4. Moving parts: shafts `k.disc(… "x", mats.machined)`, rollers, wheels, `k.ring` rims.
5. Drive: `k.motor` + `p.gearbox` on one shaft line; coupling `k.disc` with `mats.steel`.
6. Inlets / outlets: `p.hopper`, `k.cyl` nozzles with `k.ring` flanges, `p.pipeRun`.
7. Bolts on flanges (`k.boltCircle`) and covers.

Examples: **crusher** = `p.hopper` on top of a `k.box` housing with `k.panel`s, a flywheel `k.disc(… "z")` on the side, `k.motor` on a `p.plinth` beside it, belt guard `k.box`. **Compressor** = `p.hvessel` receiver + `k.box` block with fins (`k.box` slabs) + `k.motor`. **Press** = two `k.box` columns (`mats.steel`) + crown `k.box` + ram `k.cyl` (`mats.machined`) + bed `p.plinth`. **Furnace / vacuum chamber** = `p.tank` (flat top) with a bolted lid (`k.cyl` machined + `k.boltCircle`), viewports (`k.disc` recess + `k.ring`), a support frame (`p.frame` with one low level).

## Cut-away

To show contents (melt in a crucible, bed in a kiln), build the shell from a
partial cylinder so the front is open:

```ts
const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40, 1, true, Math.PI * 0.35, Math.PI * 1.3), mats.shell);
shell.position.set(x, y + h / 2, z);
k.add(shell);
k.cyl(r * 0.6, h * 0.4, x, y + 0.05, z, mats.material); // contents
```
