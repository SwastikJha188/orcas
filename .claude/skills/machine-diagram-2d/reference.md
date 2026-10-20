# 2D parts reference

Imports (copy exactly):

```tsx
import React from "react";
import type { LineSheetArt } from "@/components/assets/pyro/line-sheets/types";
import { Bolt, CornerBolts, Coupling, Fan, GearWheel, GroundLine, Housing, MachineLabel, Motor, MX, PAINT, Shaft } from "@/components/assets/machine-kit/machine-kit";
import {
  Baghouse, Baseplate, Beam, Bearing, Bellows, BoltLine, BucketElevator, Cabinet, Chamber, Column, Conveyor, Cyclone,
  Damper, Drum, Duct, ElectricMotor, FanSet, Flange, Flow, Frame, GasCylinder, Gearbox, HeatExchanger, Hopper,
  HorizontalVessel, Instrument, instrumentHead, Ladder, Louvres, Panel, Pipe, Platform, Plinth, PumpSet, Stack, Tank, Valve,
  type Pt,
} from "@/components/assets/machine-kit/parts-2d";
```

Remove names you do not use only if your linter complains; unused imports do not break the render.

**Units:** sheet units, y grows downward. **Box parts** take `x, y` (top-left
corner) and `w, h` (size) — the box you measured in the inventory. The part
fills its box; floor parts stand on the box bottom.

---

## If you see … use …

| You see in the image | Use | Key props |
|---|---|---|
| Vertical tank, silo, bin, reactor, vessel, column, receiver, water tank | `Tank` | `top` dome/cone/flat, `bottom` flat/cone/dish, `legs` (height of legs), `level` 0–1 if contents shown, `agitator`, `rail` |
| Tank with a mixer / stirrer motor on top | `Tank` | `agitator` |
| Silo / bin with a cone hopper bottom on legs or a skirt | `Tank` | `bottom="cone"`, `legs={…}` |
| Horizontal tank, drum, boiler, receiver, autoclave on saddles | `HorizontalVessel` | `level` |
| Funnel, chute, feed hopper | `Hopper` | `outlet` width |
| Cyclone separator | `Cyclone` | `inlet` left/right |
| Chimney, stack, exhaust pipe stack | `Stack` | |
| Gas bottle / cylinder | `GasCylinder` | |
| Electric motor alone | `ElectricMotor` | `shaft` left/right |
| Gearbox / reducer | `Gearbox` | `input` left/right |
| Bearing block / pillow block | `Bearing` | |
| Shaft coupling | `Coupling` (kit) | `x, y, w, h` |
| Shaft | `Shaft` (kit) | `x, y, w, h` |
| Centrifugal fan / blower with motor | `FanSet` | `outlet` left/right (side the outlet duct leaves) |
| Pump with motor | `PumpSet` | `motor` left/right |
| Small axial / cooling fan face | `Fan` (kit) | `cx, cy, r` |
| Gear, sprocket, pulley face | `GearWheel` (kit) | `cx, cy, r, teeth` |
| Control cabinet, MCC, panel, VFD, generator, PLC box, transformer | `Cabinet` | `doors`, `screen`, `lamps` |
| Furnace, oven, vacuum chamber, kiln box, press chamber, autoclave (upright), melting chamber | `Chamber` | `heat` (glow inside), `viewport` |
| Bag filter, dust collector, electrostatic precipitator | `Baghouse` | `hoppers` |
| Heat exchanger, cooler, condenser, plate pack | `HeatExchanger` | `kind` shell / plate |
| Rotary kiln, dryer, drum cooler, ball mill, trommel, rotary drum | `Drum` | `tyres` [fractions], `gear` (fraction), `heat` [from, to] |
| Belt conveyor | `Conveyor` | `kind="belt"`, `x1 y1 x2 y2` (start / end of its centreline), `h`, `ground` for legs |
| Screw conveyor / auger | `Conveyor` | `kind="screw"` |
| Drag chain / apron / pan conveyor | `Conveyor` | `kind="chain"` |
| Air slide / pneumatic trough | `Conveyor` | `kind="slide"` |
| Bucket elevator | `BucketElevator` | `drive` left/right |
| Steel structure, tower, rack, mezzanine, support frame | `Frame` | `levels` (fractions of h from top, 0 = top deck), `bays`, `brace`, `rail` |
| Single column / leg | `Column` | `x` centre, `y1` top, `y2` ground |
| Beam | `Beam` | |
| Walkway / platform with handrail | `Platform` | `x1, x2, y` (deck top), `rail` height |
| Ladder | `Ladder` | `x, y1, y2` |
| Concrete foundation | `Plinth` | |
| Base frame / skid | `Baseplate` | |
| Pipe (any liquid / gas line drawn as a tube) | `Pipe` | `pts`, `d` (6–14), `joints` |
| Big duct (air / flue gas) | `Duct` | `pts`, `d` (20–60) |
| Arrow showing direction of flow | `Flow` | `pts`, `medium` material/gas/air/water/steam/oil/signal |
| Valve | `Valve` | `kind` gate/globe/ball/butterfly/check/control/solenoid, `vertical`, `size` |
| Damper in a duct | `Damper` | box = duct section |
| Expansion joint / flexible hose section | `Bellows` | box |
| Transmitter, gauge, switch, probe, sensor | `Instrument` | `x, y` (point on the surface), `dir` (which way the head sticks out), `kind`; pad at `instrumentHead(x, y, dir)` |
| Bolted access cover / door | `Panel` | box |
| Ventilation grille | `Louvres` | box |
| A machine nothing above matches (crusher, press, mixer, extruder, compressor, CNC, robot, packaging machine …) | compose — see "Unknown machines" | |

---

## Box parts — exact props

All box parts: `x, y, w, h` (numbers, sheet units).

- `Tank({ x, y, w, h, top?: "dome"|"cone"|"flat" = "dome", bottom?: "flat"|"cone"|"dish" = "flat", level?: 0..1, legs?: number = 0, agitator?: boolean, rail?: boolean })`
  The box includes roof, shell, bottom and legs. `legs` is the leg height in
  units (e.g. 0.25 × h). Give `level` only when contents are visible or known.
- `HorizontalVessel({ x, y, w, h, level?, saddles? = true })` — box includes the saddles.
- `Hopper({ x, y, w, h, outlet? })` — wide top at `y`, outlet at `y + h`.
- `Cyclone({ x, y, w, h, inlet?: "left"|"right" })` — `w` is the barrel width; the inlet duct sticks out about 0.3 w beyond the box on the inlet side; gas outlet at the top, dip pipe to the box bottom.
- `Stack({ x, y, w, h })` — `w` is the stack diameter.
- `GasCylinder({ x, y, w, h })`
- `ElectricMotor({ x, y, w, h, shaft?: "left"|"right" })` — box includes feet; shaft height ≈ `y + 0.18h + 0.33h`.
- `Gearbox({ x, y, w, h, input?: "left"|"right" })` — shafts stick out 0.12 w on both sides; input shaft at `y + 0.66 × 0.88h`, output shaft at `y + 0.5 × 0.88h` (the 0.12h at the bottom is its feet).
- `Bearing({ x, y, w, h })` — shaft line at `y + 0.42h`.
- `FanSet({ x, y, w, h, outlet?: "left"|"right" })` — complete fan + bearing + coupling + motor + base. Outlet duct starts at the box top on the outlet side (it is about `0.48 × min(w*0.24, (h-10)*0.42) × 2` wide). Connect your outlet `Duct` to the top edge `y`.
- `PumpSet({ x, y, w, h, motor?: "right"|"left" })` — discharge nozzle rises to `y` near the pump end.
- `Cabinet({ x, y, w, h, doors? = 1, screen?, lamps? = 0, louvres? = true })`
- `Chamber({ x, y, w, h, heat?, viewport? = true })` — draw contents (crucible, part, flask) inside the inner area `x + t … x + w − t` where `t ≈ 0.08 × min(w, h)` (6–18).
- `Baghouse({ x, y, w, h, hoppers? = 3 })`
- `HeatExchanger({ x, y, w, h, kind?: "shell"|"plate" })`
- `Drum({ x, y, w, h, tyres? = [0.18, 0.82], gear?: 0..1, heat?: [from, to] })` — shell is the top half of the box; piers reach the box bottom.
- `BucketElevator({ x, y, w, h, drive?: "left"|"right" })`
- `Frame({ x, y, w, h, levels? = [0, 0.5], bays? = 2, brace? = true, rail? = true })`
- `Plinth({ x, y, w, h })`, `Baseplate({ x, y, w, h })`, `Panel({ x, y, w, h, bolts? })`, `Louvres({ x, y, w, h, step? })`, `Damper({ x, y, w, h })`, `Bellows({ x, y, w, h })`

Kit primitives (from `machine-kit`):

- `Housing({ x, y, w, h, rx? = 10, bolts? = true, panel?: [dx, dy, w, h] })` — generic machine body with inner line, corner bolts, optional recessed window.
- `Motor({ x, y, w, h, terminalBox? })` — bare motor frame, shaft to the right (no feet). Prefer `ElectricMotor`.
- `Coupling({ x, y, w? = 22, h? = 34 })`, `Shaft({ x, y, w, h })`
- `GearWheel({ cx, cy, r, teeth, hub? })`, `Fan({ cx, cy, r })`
- `Bolt({ x, y, r? })`, `CornerBolts({ x, y, w, h, inset?, r? })`
- `GroundLine({ x1, x2, y })`
- `MachineLabel({ x, y, children, anchor? = "middle", size? = 8.5, rotate? })`

## Line parts

- `Pipe({ pts: Pt[], d? = 8, flanges? = true, joints?: number[] })` — `pts` like `[[x1, y1], [x2, y1], [x2, y2]]`. `d` 6–10 for small pipes, 10–16 for main lines.
- `Duct({ pts: Pt[], d? = 30 })` — air / gas ducts, 20–60 wide.
- `Flow({ pts: Pt[], medium?, w? = 1.8, arrow? = true })` — arrowhead at the **last** point.
- `Conveyor({ x1, y1, x2, y2, h? = 14, kind?, ground?, material? = true })` — `x1,y1 → x2,y2` is the centreline; may slope.
- `Column({ x, y1, y2, w? = 8 })`, `Beam({ x1, x2, y, h? = 7 })`, `Platform({ x1, x2, y, rail? = 16 })`, `Ladder({ x, y1, y2, w? = 10, cage? })`
- `BoltLine({ x1, y1, x2, y2, count, r? })`, `Flange({ x, y, d, vertical? })`
- `Valve({ x, y, size? = 16, kind?, vertical? })` — centred on the line.
- `Instrument({ x, y, dir?, kind?: "transmitter"|"gauge"|"switch"|"probe", s? })` and `instrumentHead(x, y, dir, s)` → `[x, y]` for its pad.

## Your own shapes

When no part fits a detail, draw it with SVG and presets only:

```tsx
<rect x={…} y={…} width={…} height={…} rx={4} {...PAINT.body} />      // solid body
<rect … {...PAINT.raised} />                                           // cover, plate, flange, lid
<rect … {...PAINT.recess} />                                           // opening, window, slot, screen
<rect … {...PAINT.cylinderV} />                                        // vertical round shell
<rect … {...PAINT.cylinder} />                                         // horizontal round shell
<rect … {...PAINT.shaft} />                                            // shaft, rod, pin
<path d="…" {...PAINT.material} />                                     // contents (bed, melt, powder)
<line … {...PAINT.hair} />                                             // seam, plate joint
<circle … {...PAINT.raised} />                                         // round cover, hub
```

Repeated detail with `Array.from({ length: n }).map((_, i) => …)` and a `key`.

## Unknown machines (compose)

For a machine the table does not cover, build it from what you can see:

1. Main body: `Housing` (or `<rect … {...PAINT.body} />` with `rx` 6–12) in its box.
2. Its feet / base: `Baseplate` or `Plinth` under it, on `GROUND`.
3. Openings, doors, windows: `Panel`, `PAINT.recess` rects.
4. Moving parts visible: `GearWheel`, `Fan`, `Shaft`, `Coupling`, `Bearing`, rollers as `circle {...PAINT.raised}` + hub `circle {...PAINT.shaft}`.
5. Its drive: `ElectricMotor` (+ `Gearbox`) on the same shaft line.
6. Inlets / outlets: `Hopper` on top, chute (`Hopper` upside down is not available — use a `path` trapezoid with `PAINT.cylinderV`), `Pipe` / `Duct` connections.
7. Bolts on every cover and flange (`CornerBolts`, `BoltLine`).

Examples: **crusher** = Hopper on top + Housing body with a big `GearWheel`-less rotor (`circle` raised + recess + shaft) + belt guard (`rect` body) + `ElectricMotor` beside on a `Plinth`. **Compressor** = `HorizontalVessel` receiver below + `Housing` block with fins (`hair` lines) on top + `ElectricMotor` + belt guard. **Press** = `Frame`-like two thick columns (`rect` body) + top crown (`Housing`) + ram (`PAINT.shaft`) + bed (`Plinth`). **Extruder** = `Gearbox` + long horizontal barrel (`rect` cylinder with heater bands `rect` raised every 40 units) + `Hopper` on the barrel + die (`rect` raised) + `ElectricMotor`.

## Worked snippet

```tsx
const W = 1600;
const H = 820;
const GROUND = 740;
const TANK = { x: 120, y: 160, w: 150, h: GROUND - 160 };
const PUMP = { x: 360, y: GROUND - 90, w: 190, h: 90 };
const HX = { x: 660, y: GROUND - 150, w: 260, h: 150 };

function Art() {
  const pumpIn: Pt = [TANK.x + TANK.w, GROUND - 60];
  return (
    <g>
      <GroundLine x1={40} x2={W - 40} y={GROUND} />
      <Pipe pts={[pumpIn, [PUMP.x + 20, GROUND - 60]]} d={10} />
      <Tank {...TANK} top="dome" bottom="flat" level={0.6} rail />
      <PumpSet {...PUMP} motor="right" />
      <Pipe pts={[[PUMP.x + 28, PUMP.y], [PUMP.x + 28, 520], [HX.x + 60, 520], [HX.x + 60, HX.y]]} d={10} joints={[0.5]} />
      <Valve x={PUMP.x + 28} y={600} vertical kind="check" />
      <HeatExchanger {...HX} kind="shell" />
      <Flow pts={[[PUMP.x + 60, 500], [HX.x + 40, 500]]} medium="water" />
      <Instrument x={TANK.x + TANK.w} y={300} dir="right" />
      <MachineLabel x={TANK.x + TANK.w / 2} y={GROUND + 20} size={10}>FEED TANK</MachineLabel>
      <MachineLabel x={PUMP.x + PUMP.w / 2} y={GROUND + 20} size={10}>FEED PUMP</MachineLabel>
      <MachineLabel x={HX.x + HX.w / 2} y={GROUND + 20} size={10}>PREHEATER</MachineLabel>
    </g>
  );
}
```
