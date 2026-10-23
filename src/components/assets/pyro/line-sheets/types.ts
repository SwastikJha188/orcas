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
  /**
   * Overview sheets: where each point's value block sits (tag → [x, y, anchor]),
   * as laid out on the stage-overview PDF. `x` is the block's left edge
   * ("start"), right edge ("end") or centre ("middle"); `y` its centre. The
   * mimic keeps blocks there and only nudges them apart when values collide.
   */
  callouts?: Record<string, [number, number, "start" | "middle" | "end"]>;
  /**
   * Points the mimic shows as one value block holding their mean (block key → member tags and its control-room label).
   * The key has its own pad and callout; the members keep theirs for alert popups but get no block of their own.
   */
  averages?: Record<string, { tags: string[]; label: string }>;
  /** Set once the equipment art is drawn (a stub has pads from the PDF but no art); pages only show ready sheets. */
  ready?: boolean;
  /** PYR-0: clickable machine region per machine id ([x, y, w, h]). */
  links?: Record<string, [number, number, number, number]>;
  /** PYR-0: every piece of a machine drawn in several places (clickable); `links` holds its main piece. */
  areas?: Record<string, Array<[number, number, number, number]>>;
  /** PYR-0: regions washed with a machine's condition, where its drawing reaches past its link region. */
  shades?: Record<string, Array<[number, number, number, number]>>;
  /** PYR-0: centre of each machine's name-and-health chip (machine id → [x, y]). */
  machineChips?: Record<string, [number, number]>;
  /** PYR-0: health badge of each sub-assembly, at its place on the drawing (sub-assembly id → machine and [x, y]). */
  parts?: Record<string, { machine: string; at: [number, number] }>;
  /** PYR-0: area of each sub-assembly's equipment (sub-assembly id → machine and [x, y, w, h]), tinted by its health. */
  partRegions?: Record<string, { machine: string; box: [number, number, number, number] }>;
  /** Sheets composed of several machines' drawings (PYR-0, the combined sheets): the operator may move each machine. */
  arrange?: SheetArrange;
  /**
   * Operator sheets drawn to a design: its readout blocks, each with its title, its readings and the label it prints
   * for each, and where the design puts it. The operator view starts from these spots and only moves a block when
   * the canvas or the reading size leaves it no room there.
   */
  readouts?: SheetReadouts;
}

/** The readout blocks of a designed operator sheet (sheet units). */
export interface SheetReadouts {
  /** The design's canvas round the drawing and its blocks ([x, y, w, h]); blocks keep their place relative to its edges. */
  frame: [number, number, number, number];
  blocks: SheetReadout[];
  /**
   * Reading size of the design as a share of the operator's chosen size (default 1). A dense combined design
   * (two dozen blocks round three machines) reads smaller, as the design draws it.
   */
  scale?: number;
}

/** One readout block of a designed operator sheet. */
export interface SheetReadout {
  /** Block header ("PRIMARY-AIR FAN"). */
  title: string;
  /** Readings in order: tag and the label the block prints for it ("VIBRATION DE"). */
  rows: Array<[tag: string, label: string]>;
  /** The block in the design ([x, y, w, h]). */
  box: [number, number, number, number];
  /** Where the block's dashed leader meets its equipment; none when the block sits beside it. */
  leader?: [number, number];
}

/** A machine drawing the operator may move on a composed sheet. */
export interface ArrangePiece {
  /** Machine id ("PYR-KLN-01"). */
  id: string;
  /** Where the piece is drawn now (sheet units). */
  box: [number, number, number, number];
}

export type PieceOffsets = Record<string, [number, number]>;

export interface SheetArrange {
  pieces: ArrangePiece[];
  /** Offsets this drawing was composed with, from where the sheet places each piece (sheet units). */
  offsets: PieceOffsets;
  /** The same sheet with its pieces moved by `offsets`; flows between moved pieces re-route. */
  with: (offsets: PieceOffsets) => LineSheetArt;
}
