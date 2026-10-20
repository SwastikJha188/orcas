/**
 * Sheet C-2 — CLR-01 · Clinker cooler — Cooling fans 1–3 (hot zone)
 * (group-images PDF page 13 "5B", panel COOLING FANS 1–3 (HOT ZONE)).
 *
 * Three cooling fans blow up their riser ducts into compartments 1–3. Each
 * fan carries the same four points: motor current at the terminal box,
 * vibration and temperature on the bearing housing, winding temperature in
 * the motor.
 */
import type { LineSheetArt } from "../types";
import { CoolingFanRow, FAN, FAN_PITCH, FAN_SHEET } from "./parts-c2";

/** Panel box on the page (page units): x 48.5…811.5, y 105.5…777.5. */
function Art() {
  return <CoolingFanRow first={1} />;
}

/**
 * One pattern per fan: current and vibration plates run right along the
 * motor, bearing plate left over the volute, winding plate right along the
 * motor foot (its slot under the base rail is used only if the reading outgrows its lane).
 */
const pads: LineSheetArt["pads"] = {};
const callouts: NonNullable<LineSheetArt["callouts"]> = {};
for (let k = 0; k < 3; k++) {
  const o = k * FAN_PITCH;
  const n = `0${k + 1}`;
  const at = (p: [number, number]): [number, number] => [p[0] + o, p[1]];
  pads[`ELE-CLR-${n}`] = at(FAN.pads.ele);
  pads[`VIB-CLR-${n}`] = at(FAN.pads.vib);
  pads[`TMP-CLR-${n}`] = at(FAN.pads.brg);
  pads[`TMP-CLR-${17 + k}`] = at(FAN.pads.wdg);
  callouts[`ELE-CLR-${n}`] = [FAN.pads.ele[0] + o - 6, FAN.pads.ele[1], "start"];
  callouts[`VIB-CLR-${n}`] = [FAN.pads.vib[0] + o - 6, FAN.pads.vib[1], "start"];
  callouts[`TMP-CLR-${n}`] = [FAN.pads.brg[0] + o + 6, FAN.pads.brg[1], "end"];
  callouts[`TMP-CLR-${17 + k}`] = [FAN.pads.wdg[0] + o, 524, "middle"];
}

export const sheet: LineSheetArt = { id: "C-2", ready: true, width: FAN_SHEET.w, height: FAN_SHEET.h, Art, pads, callouts };
