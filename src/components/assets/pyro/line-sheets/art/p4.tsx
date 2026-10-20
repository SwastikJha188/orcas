/**
 * Sheet P-4 — PHC-01 · ID fan and motor. Group images page 2B, right panel
 * (page box 842.5, 105.5 → 1605.5, 777.5): inlet from the preheater exit,
 * volute and impeller, outlet duct to the main baghouse, NDE / DE pedestal
 * bearings, coupling, motor (VFD) with terminal box and encoder cowl.
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
        TO MAIN BAGHOUSE (VIA GCT / RAW MILL AS PER PLANT)
      </Caps>
      <Caps x={37.5} y={283.5} size={8} spacing="0.17em">
        FROM PREHEATER EXIT
      </Caps>
      <Caps x={408} y={459} size={7} anchor="middle" spacing="0.24em">
        NDE BEARING
      </Caps>
      <Caps x={489} y={459} size={7} anchor="middle" spacing="0.24em">
        DE BEARING
      </Caps>
      <Caps x={651} y={459} size={7} anchor="middle" spacing="0.24em">
        ID FAN MOTOR (VFD)
      </Caps>
      <Caps x={232.5} y={634.5} size={8.5} anchor="middle" spacing="0.24em">
        ID FAN
      </Caps>
    </g>
  );
}

/** Pad centre per point, at the group-image pads. */
const pads: LineSheetArt["pads"] = {
  "VIB-PHC-02": [408.5, 349.5],
  "TMP-PHC-10": [408.5, 391.5],
  "VIB-PHC-01": [489.5, 349.5],
  "TMP-PHC-09": [489.5, 391.5],
  "ELE-PHC-01": [641.3, 311],
  "SPD-PHC-01": [731, 377.7],
  "TMP-PHC-11": [669.7, 401.5],
};

/** Plate side per point: NDE plates along the shaft towards the fan, DE plates over the coupling, motor plates over the motor. */
const callouts: LineSheetArt["callouts"] = {
  "VIB-PHC-02": [358.5, 323.5, "end"],
  "TMP-PHC-10": [350, 429, "end"],
  "VIB-PHC-01": [441, 300, "start"],
  "TMP-PHC-09": [432, 476, "start"],
  "ELE-PHC-01": [596.5, 285.3, "end"],
  "SPD-PHC-01": [720, 429, "end"],
  "TMP-PHC-11": [719.5, 467.5, "end"],
};

export const sheet: LineSheetArt = { id: "P-4", ready: true, width: 763, height: 672, Art, pads, callouts };
