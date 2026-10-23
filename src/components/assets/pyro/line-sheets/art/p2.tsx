/**
 * Sheet P-2 — PHC-01 · Cyclone cones and meal to kiln (Rev 02: a pressure and a
 * temperature on the cone of every stage C1 … C6, tags on hold, and the hot meal
 * from C6 to the kiln inlet). Drawn on the six-stage tower of sheet P-1: stage
 * cyclones in two columns on the tower steel, meal falling stage to stage and
 * the C6 meal chute down to the kiln inlet.
 */
import type { LineSheetArt } from "../types";
import { conePoint } from "./parts-p";
import { STAGES, TowerArt } from "./p1";

const W = 506;
const H = 449.5;

/**
 * Pad centre per point: cone pressure high and cone temperature low on the outer cone wall of each stage
 * (right column C1 / C3 / C5, left column C2 / C4 / C6); hot meal on the C6 chute to the kiln inlet.
 */
const pads: LineSheetArt["pads"] = {};
/** Cone plates run away from the tower past its steel, pressure above temperature; hot meal along its chute. */
const callouts: NonNullable<LineSheetArt["callouts"]> = {};
STAGES.forEach((g, i) => {
  const s = (i % 2 ? -1 : 1) as 1 | -1;
  const p = conePoint(g, 0.22, s);
  const t = conePoint(g, 0.72, s);
  pads[`PRS-PHC-${11 + i}`] = p;
  pads[`TMP-PHC-${21 + i}`] = t;
  callouts[`PRS-PHC-${11 + i}`] = s > 0 ? [347, p[1] - 4, "start"] : [148.5, p[1] - 4, "end"];
  callouts[`TMP-PHC-${21 + i}`] = s > 0 ? [347, t[1] + 6, "start"] : [148.5, t[1] + 6, "end"];
});
pads["TMP-PHC-07"] = [195.5, 417.5];
callouts["TMP-PHC-07"] = [232, 408, "start"];

export const sheet: LineSheetArt = { id: "P-2", ready: true, width: W, height: H, Art: TowerArt, pads, callouts };
