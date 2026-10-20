/**
 * Sheet P-3 — PHC-01 · Exit gas analysis and fan damper. Group images page
 * 2A, right panel (page box 1106, 91 → 1612, 540.5): C1 (top stage), the
 * preheater exit gas duct with its blow-back air line and sample probe, the
 * exit-gas analyser (O₂ / CO cells; false-air rise calculated with the
 * kiln-inlet O₂) and the ID fan inlet damper with its actuator.
 */
import React from "react";
import { GroundLine, MX, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Analyser, Caps, Damper, FlowArrow, InstrumentBox, Tap } from "./parts-p2";

const W = 506;
const H = 449.5;
const GROUND = 422.5;
const C1 = { cx: 98, roof: 154, cylTop: 158, cylBot: 198, coneBot: 259, w: 74, ow: 22.5 };

function Cyclone() {
  const { cx, roof, cylTop, cylBot, coneBot, w, ow } = C1;
  return (
    <g>
      <path d={`M ${cx - w / 2} ${cylBot} L ${cx + w / 2} ${cylBot} L ${cx + ow / 2} ${coneBot} L ${cx - ow / 2} ${coneBot} Z`} {...PAINT.cylinderV} />
      <path d={`M ${cx - w / 2 + 4} ${cylBot + 3} L ${cx - ow / 2 + 2} ${coneBot - 3} M ${cx + w / 2 - 4} ${cylBot + 3} L ${cx + ow / 2 - 2} ${coneBot - 3}`} {...PAINT.hair} />
      <rect x={cx - w / 2} y={cylTop} width={w} height={cylBot - cylTop} rx={2} {...PAINT.cylinderV} />
      <line x1={cx - w / 2 + 3} x2={cx - w / 2 + 3} y1={cylTop + 3} y2={cylBot - 3} {...PAINT.hair} />
      <line x1={cx + w / 2 - 3} x2={cx + w / 2 - 3} y1={cylTop + 3} y2={cylBot - 3} {...PAINT.hair} />
      <rect x={cx - w / 2 - 3} y={cylBot - 2} width={w + 6} height={4} rx={1.2} {...PAINT.raised} />
      <rect x={cx - w / 2 - 2.5} y={roof} width={w + 5} height={cylTop - roof} rx={1.2} {...PAINT.raised} />
      <rect x={cx - ow / 2 - 2} y={coneBot - 1} width={ow + 4} height={3} rx={1} {...PAINT.raised} />
      <rect x={62.5} y={260} width={71.5} height={5} rx={1.5} {...PAINT.raised} />
      <text x={cx} y={182} fill="var(--dx-ink-2)" fontSize={7} fontWeight={600} letterSpacing="0.08em" textAnchor="middle">
        C1
      </text>
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22.5} x2={484} y={GROUND} />
      {/* blow-back air into the sample probe */}
      <Pipe pts={[[36, 112], [218, 112], [218, 92]]} d={4} elbows={false} />
      {/* exit gas duct C1 → ID fan inlet */}
      <Pipe pts={[[C1.cx, C1.roof + 1], [C1.cx, 85], [347, 85], [347, 405]]} d={20} flanges={[[347, 191.5]]} />
      <rect x={216} y={72.5} width={4} height={25} rx={1} {...PAINT.shaft} />
      <rect x={230.5} y={74} width={2} height={24} {...PAINT.shaft} />
      <Tap pts={[[231.5, 98], [231.5, 139]]} dashed />
      {/* exit-gas analyser: O₂ and CO cells, false-air calculation display */}
      <Analyser x={186.5} y={139} w={116} h={84.5} cells={[214.5, 259]} cy={162} cw={36} ch={22} />
      <rect x={196.5} y={194} width={96} height={18} rx={2.5} {...PAINT.recess} />
      <Caps x={214.5} y={180} anchor="middle" size={4.5} spacing="0.05em">
        O₂
      </Caps>
      <Caps x={259} y={180} anchor="middle" size={4.5} spacing="0.05em">
        CO
      </Caps>
      <Caps x={244.5} y={235} anchor="middle">
        EXIT-GAS ANALYSER
      </Caps>
      {/* ID fan inlet damper and actuator */}
      <Damper x={330} y={271.5} w={18.5} h={25} />
      <rect x={348.5} y={281.5} width={15.5} height={5} {...PAINT.shaft} />
      <InstrumentBox x={364} y={274} w={40} h={20} rx={4} />
      <Cyclone />
      <FlowArrow x1={346.5} y1={414} x2={346.5} y2={428} color={MX.label} w={1.2} s={4} />
      <Caps x={41} y={106.5}>BLOWBACK AIR</Caps>
      <Caps x={217.5} y={72} anchor="middle">
        PREHEATER EXIT GAS DUCT
      </Caps>
      <Caps x={384} y={312} anchor="middle">
        DAMPER ACTUATOR
      </Caps>
      <Caps x={98} y={334} anchor="middle">
        C1 CYCLONE (TOP STAGE)
      </Caps>
      <Caps x={356} y={422}>TO ID FAN INLET</Caps>
    </g>
  );
}

/** Pad centre per point, at the group-image pads; the calculated false-air rise sits on the analyser's display. */
const pads: LineSheetArt["pads"] = {
  "GAS-PHC-01": [214.5, 161.2],
  "GAS-PHC-02": [258.5, 161.2],
  "CAL-PHC-01": [206, 203],
  "POS-PHC-01": [384.2, 284],
};

/** O₂ runs left, CO right, the false-air rise along the display, the damper back over its actuator and duct. */
const callouts: LineSheetArt["callouts"] = {
  "GAS-PHC-01": [241.5, 132.2, "end"],
  "GAS-PHC-02": [248, 132.2, "start"],
  "CAL-PHC-01": [213, 203, "start"],
  "POS-PHC-01": [377, 284, "end"],
};

export const sheet: LineSheetArt = { id: "P-3", ready: true, width: W, height: H, Art, pads, callouts };
