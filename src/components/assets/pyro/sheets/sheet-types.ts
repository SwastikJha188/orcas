import type React from "react";

/**
 * Callout box of one point, in drawing units: top-left corner [x, y] and an
 * optional width (the sheet view widens a box whose tag and value need more).
 * Boxes may sit outside the art (negative or beyond width / height); the
 * sheet view grows the canvas to fit them.
 */
export type SheetCalloutAnchor = [x: number, y: number] | [x: number, y: number, w: number];

/**
 * One ULTRON machine diagram sheet (D4-OSW-PE-PYR Rev. 02, D01–D11), drawn
 * to the composition of its PDF page. Equipment art only: the sheet view
 * (`../pyro-sheet.tsx`) adds the pads and the callouts (tag + description)
 * around it.
 */
export interface PyroSheetDrawing {
  /** "D01" … "D11". */
  sheet: string;
  width: number;
  height: number;
  Art: React.ComponentType;
  /** Pad centre for every measurement point on this sheet (tag → [x, y]). */
  pads: Record<string, [number, number]>;
  /**
   * Callout box per point, placed as on the PDF page (next to its feature,
   * grouped like the page: D06 per station panel, D09 per compartment). A
   * sheet without a box for every pad falls back to the two callout columns.
   */
  callouts?: Record<string, SheetCalloutAnchor>;
}
