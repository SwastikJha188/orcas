/**
 * 3D machine-kit models made with the machine-diagram-3d skill, by drawing
 * kind. A machine shows the model registered under its equipment model's
 * `diagram_type` (DB `equipment_models.diagram_type`, `AssetMachine.diagramType`),
 * so which machine gets which model is data; this list only says which
 * drawing kinds have a model.
 *
 * To add one: save the skill's file here as `<kebab-name>.ts`, import its
 * `model` and add `{ diagramType: "<kebab-name>", model }` below (use the same
 * diagramType as the 2D sheet of the same machine in
 * src/components/assets/diagrams). Preview: /dev/diagrams.
 *
 * Models can also live in the DB (table `diagrams`, kind "3d"): export the file
 * with `node scripts/diagram-lab/export.mjs <file> --type <kind> --save`; the
 * app then loads it on demand (useDbDiagram) with no rebuild.
 */
import type { KitModel } from "./kit-model";
import { model as vacuumCastingCell } from "./vacuum-casting-cell";
import { dbModel } from "@/components/assets/diagrams/db-diagrams";

export type { KitModel };
export { buildKitModel, type BuiltKitModel } from "./kit-model";

export interface KitModelEntry {
  /** Drawing kind this model draws: matched against `AssetMachine.diagramType`. */
  diagramType: string;
  model: KitModel;
}

export const KIT_MODELS: KitModelEntry[] = [{ diagramType: "vacuum-casting-cell", model: vacuumCastingCell }];

/** The generated 3D model for a machine's drawing kind (code first, then the DB once loaded), else null. */
export function kitModelForType(diagramType: string | null | undefined): KitModel | null {
  return (diagramType && KIT_MODELS.find((e) => e.diagramType === diagramType)?.model) || dbModel(diagramType);
}

export const hasCodeModel = (diagramType: string | null | undefined): boolean => Boolean(diagramType && KIT_MODELS.some((e) => e.diagramType === diagramType));
