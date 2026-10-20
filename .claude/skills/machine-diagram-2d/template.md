# File template (2D)

Save as the path the user asked for; otherwise
`src/components/assets/diagrams/<kebab-name>.tsx`. Replace every `<…>`.

```tsx
/**
 * <Machine or line name>: machine-kit drawing from <source image / PDF page>.
 * <One sentence: what is on the sheet, left to right.>
 */
import React from "react";
import type { LineSheetArt } from "@/components/assets/pyro/line-sheets/types";
import { Bolt, CornerBolts, Coupling, GearWheel, GroundLine, Housing, MachineLabel, MX, PAINT, Shaft } from "@/components/assets/machine-kit/machine-kit";
import {
  Baseplate, Bearing, BoltLine, Cabinet, Chamber, Column, Conveyor, Cyclone, Damper, Duct, ElectricMotor, FanSet,
  Flange, Flow, Frame, Gearbox, Hopper, Instrument, instrumentHead, Ladder, Louvres, Panel, Pipe, Platform,
  Plinth, PumpSet, Tank, Valve, type Pt,
} from "@/components/assets/machine-kit/parts-2d";

/* ---------------------------------------------------------------- layout (sheet units, from the inventory) */

const W = <1600, or from Step 2 for a tall image>;
const H = <height>;
const GROUND = <y of the floor line>;

// One constant per inventory item: its box. Floor items end on GROUND (y + h === GROUND).
const <ITEM_A> = { x: <…>, y: <…>, w: <…>, h: GROUND - <…> };
const <ITEM_B> = { x: <…>, y: <…>, w: <…>, h: <…> };

// Measurement points: where each instrument is mounted and which way its head points.
const POINTS: Array<{ tag: string; at: Pt; dir: "up" | "down" | "left" | "right"; side: "start" | "end" }> = [
  { tag: "<TAG-1>", at: [<x>, <y>], dir: "up", side: "start" },
];

/* ---------------------------------------------------------------- art */

function Art() {
  return (
    <g>
      <GroundLine x1={40} x2={W - 40} y={GROUND} />

      {/* 1. structures behind */}

      {/* 2. ducts / pipes behind */}

      {/* 3. large equipment */}
      <Tank {...<ITEM_A>} top="dome" bottom="cone" />

      {/* 4. drives and small machines */}

      {/* 5. pipes in front, valves */}

      {/* 6. flows */}

      {/* 7. instruments */}
      {POINTS.map((p) => (
        <Instrument key={p.tag} x={p.at[0]} y={p.at[1]} dir={p.dir} />
      ))}

      {/* 8. labels: one per item, uppercase, below floor items / above tall items */}
      <MachineLabel x={<ITEM_A>.x + <ITEM_A>.w / 2} y={GROUND + 20} size={10}>
        <ITEM A NAME>
      </MachineLabel>
    </g>
  );
}

/* ---------------------------------------------------------------- pads and value plates */

const pads: Record<string, [number, number]> = {};
const callouts: NonNullable<LineSheetArt["callouts"]> = {};
for (const p of POINTS) {
  const head = instrumentHead(p.at[0], p.at[1], p.dir);
  pads[p.tag] = head;
  callouts[p.tag] = [head[0] + (p.side === "start" ? 14 : -14), head[1], p.side];
}

export const sheet: LineSheetArt = {
  id: "<SHEET-ID>",
  width: W,
  height: H,
  ready: true,
  Art,
  pads,
  callouts,
};
```

Notes

- Keep `Art` a plain function component with no props, hooks or state.
- Use only numbers derived from the constants; write expressions like
  `TANK.x + TANK.w` instead of copying the computed number.
- If there are no measurement points, keep `POINTS` as an empty array.
