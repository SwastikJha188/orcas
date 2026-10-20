/**
 * Sheet C-3 — CLR-01 · Clinker cooler — Cooling fans 4–6 (group-images PDF
 * page 13 "5B", panel COOLING FANS 4–6).
 *
 * The same fan row as C-2 for compartments 4–6. These fans carry motor
 * current at the terminal box, bearing temperature on the bearing housing and
 * winding temperature in the motor (no vibration point).
 */
import type { LineSheetArt } from "../types";
import { CoolingFanRow, FAN, FAN_PITCH, FAN_SHEET } from "./parts-c2";

/** Panel box on the page (page units): x 842.5…1605.5, y 105.5…777.5. */
function Art() {
  return <CoolingFanRow first={4} />;
}

/**
 * One pattern per fan: current plate right along the motor top, bearing plate
 * left over the volute, winding plate right along the motor foot (its slot
 * under the base rail is used only if the reading outgrows its lane).
 */
const pads: LineSheetArt["pads"] = {};
const callouts: NonNullable<LineSheetArt["callouts"]> = {};
for (let k = 0; k < 3; k++) {
  const o = k * FAN_PITCH;
  const n = `0${k + 4}`;
  const at = (p: [number, number]): [number, number] => [p[0] + o, p[1]];
  pads[`ELE-CLR-${n}`] = at(FAN.pads.ele);
  pads[`TMP-CLR-${n}`] = at(FAN.pads.brg);
  pads[`TMP-CLR-${20 + k}`] = at(FAN.pads.wdg);
  callouts[`ELE-CLR-${n}`] = [FAN.pads.ele[0] + o - 6, FAN.pads.ele[1], "start"];
  callouts[`TMP-CLR-${n}`] = [FAN.pads.brg[0] + o + 6, FAN.pads.brg[1], "end"];
  callouts[`TMP-CLR-${20 + k}`] = [FAN.pads.wdg[0] + o, 524, "middle"];
}

export const sheet: LineSheetArt = { id: "C-3", ready: true, width: FAN_SHEET.w, height: FAN_SHEET.h, Art, pads, callouts };
