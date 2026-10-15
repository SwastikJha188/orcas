/**
 * Sheet C-3 — CLR-01 · Clinker cooler — Cooling fans 4–6.
 * Same fan bays as C-2 (supply duct with louvre damper and bellows, spiral
 * volute, split bearing, coupling guard, motor on its stool, steel deck)
 * for compartments 4–6; these fans carry bearing temperature and motor
 * current only.
 */
import type { LineSheetArt } from "../types";
import { FanBays } from "./c2";

const W = 824;
const H = 704;

function Art() {
  return <FanBays first={4} labelX={157} />;
}

/** Pad centre per point (sheet units), as on PDF page 31. */
const pads: LineSheetArt["pads"] = {
  "TMP-CLR-04": [191.5, 461.5],
  "ELE-CLR-04": [236.5, 405.5],
  "TMP-CLR-05": [439, 461.5],
  "ELE-CLR-05": [484, 405.5],
  "TMP-CLR-06": [686.5, 461.5],
  "ELE-CLR-06": [731.5, 405.5],
};

/** Tag chip centre per point, as on PDF page 31 (motor-current chips moved 35 down, off the pedestals, under the deck). */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "TMP-CLR-04": [143, 349.5],
  "ELE-CLR-04": [195.5, 553],
  "TMP-CLR-05": [390.5, 349.5],
  "ELE-CLR-05": [443, 553],
  "TMP-CLR-06": [638, 349.5],
  "ELE-CLR-06": [690.5, 553],
};

export const sheet: LineSheetArt = { id: "C-3", ready: true, width: W, height: H, Art, pads, chips };
