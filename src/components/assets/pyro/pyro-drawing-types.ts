import type React from "react";

/**
 * One pyro-line machine drawing (D4-OSW-PE-PYR machine diagrams D01–D11),
 * drawn once with the ULTRON machine kit and reused everywhere:
 *
 *  - Overview: the whole drawing with a pad on every located signal.
 *  - Sensors › sub-assembly windows: the same drawing cropped to `windows[sub]`.
 *  - DB catalog: sensor x / y are `pads[tag]` as % of width / height.
 */
export interface PyroDrawing {
  machineId: string;
  /** Drawing space; pads and windows are in these units. */
  width: number;
  height: number;
  /** Equipment art only: no pads, labels for equipment only, no background. Rendered inside an <svg> that already carries MachineDefs + kitStyle. */
  Art: React.ComponentType;
  /** Pad centre for every located signal of the machine (online + manual records; calculated values have no pad). */
  pads: Record<string, [number, number]>;
  /** Crop rectangle [x, y, w, h] for each sub-assembly window of the machine. */
  windows: Record<string, [number, number, number, number]>;
}
