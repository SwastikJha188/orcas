import type React from "react";

/**
 * Sheet group of the pyro-line diagram pack: L line (PYR-0), F feed system,
 * P preheater, K rotary kiln, B main burner, C clinker cooler, H crusher and
 * clinker transport.
 */
export type LineSheetGroup = "L" | "F" | "P" | "K" | "B" | "C" | "H" | "V";

/** One monitoring point as listed on a detail sheet. */
export interface LineSheetPoint {
  tag: string;
  /** Description as printed on the sheet ("Main motor DE vibration"). */
  text: string;
  /** Mounting location, where the sheet prints one. */
  location?: string;
}

/** Register entry of one sheet (text only; the drawing is a {@link LineSheetArt}). */
export interface LineSheetMeta {
  /** "PYR-0", "F-0" … "H-3". */
  id: string;
  group: LineSheetGroup;
  /** line: PYR-0 · overview: X-0 (every point of the group, unlabelled pads) · detail: one part with its points. */
  kind: "line" | "overview" | "detail";
  /** Machines whose points are on the sheet ("PYR-FED-01" …). */
  machines: string[];
  /** D4 asset codes as printed in the sheet heading ("FSL-01", "KFS-01"). */
  codes?: string[];
  /** "Rotary kiln". */
  equipment: string;
  /** "Gear train: motor, gearbox, pinion and girth gear". */
  title: string;
  /** Detail sheet: its points in sheet order. */
  points?: LineSheetPoint[];
  /** Overview: the group's detail sheets, in order. */
  parts?: string[];
  /** Detail sheet note, as printed. */
  note?: string;
}

/**
 * Machine-kit drawing of one sheet, composed as its PDF page. Sheet units are
 * PDF points measured from the drawing frame's top-left corner (detail 824 ×
 * 704, overview / line 1144.5 × 479). Rendered inside a MachineSvg, so the
 * Art uses MX / PAINT and the kit parts only.
 */
export interface LineSheetArt {
  id: string;
  width: number;
  height: number;
  /** Equipment art only: no pads, no tag chips, no background or grid. */
  Art: React.ComponentType;
  /** Pad centre per point (tag → [x, y]); every point of the sheet has one. */
  pads: Record<string, [number, number]>;
  /** Detail sheets: tag-chip centre per point (tag → [x, y]); the viewer draws the chip and its leader. */
  chips?: Record<string, [number, number]>;
  /** Set once the equipment art is drawn (a stub has pads from the PDF but no art); pages only show ready sheets. */
  ready?: boolean;
  /** PYR-0: clickable machine region per machine id ([x, y, w, h]). */
  links?: Record<string, [number, number, number, number]>;
}
