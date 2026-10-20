/**
 * Sheet G-2 — BGH-01 · Baghouse fan and motor. Group images page 2C, right
 * panel (page box 842.5, 105.5 → 1605.5, 777.5): inlet from the baghouse,
 * volute and impeller, outlet duct to the stack, two pedestal bearings,
 * coupling, motor (VFD) with terminal box and encoder cowl.
 */
import React from "react";
import { MX } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "../types";
import { Caps, FanTrain, FlowArrow } from "./parts-p2";

function Art() {
  return (
    <g>
      <FanTrain />
      <FlowArrow x1={728} y1={81} x2={750} y2={81} color={MX.label} w={1.3} s={4.5} />
      <Caps x={745} y={53.5} size={8} anchor="end" spacing="0.17em">
        TO STACK
      </Caps>
      <Caps x={37.5} y={283.5} size={8} spacing="0.17em">
        FROM BAGHOUSE
      </Caps>
      <Caps x={408} y={459} size={7} anchor="middle" spacing="0.24em">
        BEARING
      </Caps>
      <Caps x={489} y={459} size={7} anchor="middle" spacing="0.24em">
        BEARING
      </Caps>
      <Caps x={651} y={459} size={7} anchor="middle" spacing="0.24em">
        FAN MOTOR (VFD)
      </Caps>
      <Caps x={232.5} y={634.5} size={8.5} anchor="middle" spacing="0.24em">
        BAGHOUSE FAN
      </Caps>
    </g>
  );
}

/** Pad centre per point, at the group-image pads. */
const pads: LineSheetArt["pads"] = {
  "VIB-BGH-01": [489.5, 349.5],
  "TMP-BGH-01": [408.5, 391.5],
  "ELE-BGH-01": [641.3, 311],
  "SPD-BGH-01": [731, 377.7],
  "TMP-BGH-03": [669.7, 401.5],
};

const callouts: LineSheetArt["callouts"] = {
  "VIB-BGH-01": [455.5, 323.5, "start"],
  "TMP-BGH-01": [364.5, 429, "end"],
  "ELE-BGH-01": [596.5, 285.3, "end"],
  "SPD-BGH-01": [720, 429, "end"],
  "TMP-BGH-03": [625.5, 467.5, "end"],
};

export const sheet: LineSheetArt = { id: "G-2", ready: true, width: 763, height: 672, Art, pads, callouts };
