/**
 * Diagram export (node): turns a skill-made file into the data the app keeps
 * in the DB (`diagrams.data`). 2D: the sheet's art as static SVG markup (kit
 * tokens stay `var(--mx-…)`, so it follows the theme) plus pads / callouts /
 * chips. 3D: every mesh of the built model (captureKitModel).
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { LineSheetArt } from "@/components/assets/pyro/line-sheets/types";
import type { KitModel } from "@/components/home/twin/models/kit-model";
import { captureKitModel } from "@/components/home/twin/models/kit-model-data";

export interface SheetData {
  format: "ultron.sheet2d/1";
  id: string;
  width: number;
  height: number;
  svg: string;
  pads: Record<string, [number, number]>;
  callouts?: LineSheetArt["callouts"];
  chips?: LineSheetArt["chips"];
}

export function exportModule(mod: Record<string, unknown>): { kind: "2d"; name: string; data: SheetData } | { kind: "3d"; name: string; data: ReturnType<typeof captureKitModel> } {
  const model = mod.model as KitModel | undefined;
  if (model && typeof model.build === "function") return { kind: "3d", name: model.name, data: captureKitModel(model) };
  const sheet = mod.sheet as LineSheetArt | undefined;
  if (sheet && typeof sheet.Art === "function") {
    const svg = renderToStaticMarkup(React.createElement(sheet.Art));
    return {
      kind: "2d",
      name: sheet.id,
      data: { format: "ultron.sheet2d/1", id: sheet.id, width: sheet.width, height: sheet.height, svg, pads: sheet.pads ?? {}, callouts: sheet.callouts, chips: sheet.chips },
    };
  }
  throw new Error("The file must export `sheet: LineSheetArt` (2D) or `model: KitModel` (3D).");
}
