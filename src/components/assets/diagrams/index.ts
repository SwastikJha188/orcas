/**
 * 2D machine-kit drawings made with the machine-diagram-2d skill, by drawing
 * kind. A machine shows the drawing registered under its equipment model's
 * `diagram_type` (DB `equipment_models.diagram_type`, `AssetMachine.diagramType`)
 * on its Overview, through MachineSchematic (`pyroDrawingForType`), with its
 * sensors at their DB x / y (% of the sheet). Which machine gets which drawing
 * is data; this list only says which drawing kinds exist.
 *
 * To add one: save the skill's file here as `<kebab-name>.tsx`, import its
 * `sheet` and add `{ diagramType: "<kebab-name>", label, sheet }` below. The
 * drawing then appears under "Drawing style" when a machine is commissioned
 * (Configure), and on the Overview of every machine of that kind. Seed each
 * sensor's x / y as `pads[tag]` / sheet width / height × 100. Preview: /dev/diagrams.
 *
 * Drawings can also live in the DB (table `diagrams`, kind "2d"), which is how a
 * new plant gets drawings without a rebuild: `node scripts/diagram-lab/export.mjs
 * <file> --type <kind> --save` (or onboarding). See ./db-diagrams.tsx.
 */
import type { LineSheetArt } from "@/components/assets/pyro/line-sheets/types";
import { sheet as vacuumCastingCell } from "./vacuum-casting-cell";

export interface DiagramSheetEntry {
  /** Drawing kind this sheet draws: matched against `AssetMachine.diagramType`. */
  diagramType: string;
  /** Plain name of the machine kind, as offered under "Drawing style". */
  label: string;
  sheet: LineSheetArt;
}

export const DIAGRAM_SHEETS: DiagramSheetEntry[] = [
  { diagramType: "vacuum-casting-cell", label: "Vacuum casting cell", sheet: vacuumCastingCell },
];

/** The generated drawing for a machine's drawing kind, else null (only sheets marked `ready`). */
export function diagramSheetForType(diagramType: string | null | undefined): LineSheetArt | null {
  const s = diagramType ? DIAGRAM_SHEETS.find((e) => e.diagramType === diagramType)?.sheet : undefined;
  return s && s.ready !== false ? s : null;
}
