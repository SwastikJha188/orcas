/**
 * Registry of the pyro-line machine drawings, by machine id and by catalog
 * `diagramType`. Each machine's drawing is its group's overview sheet of the
 * diagram pack (line-sheets: F-0 feed system … H-0 crusher and clinker
 * transport), the same drawing the machine Overview shows.
 */
import type { PyroDrawing } from "./pyro-drawing-types";
import { PYRO_MACHINES } from "@/lib/pyro-sim/signals";
import { VPC_MACHINES } from "@/lib/vpc-sim/signals";
import { LINE_SHEETS, LINE_SHEET_ART } from "./line-sheets";
import { PYRO_LAYOUT } from "./pyro-layout";

export type { PyroDrawing };

const ALL_DRAWING_MACHINES = [...PYRO_MACHINES, ...VPC_MACHINES];

function fromSheet(machineId: string): PyroDrawing | null {
  const sheet = LINE_SHEETS.find((s) => s.kind === "overview" && s.machines.includes(machineId));
  const art = sheet ? LINE_SHEET_ART[sheet.id] : null;
  if (!art) return null;
  // Pads from the generated layout, so the drawing and the seeded sensor positions are the same data.
  return { machineId, width: art.width, height: art.height, Art: art.Art, pads: PYRO_LAYOUT[machineId]?.pads ?? art.pads ?? {}, windows: {} };
}

export const PYRO_DRAWINGS: Record<string, PyroDrawing> = Object.fromEntries(
  ALL_DRAWING_MACHINES.flatMap((m) => {
    const d = fromSheet(m.id);
    return d ? [[m.id, d]] : [];
  }),
);

const BY_TYPE: Record<string, PyroDrawing> = Object.fromEntries(ALL_DRAWING_MACHINES.filter((m) => PYRO_DRAWINGS[m.id]).map((m) => [m.diagramType, PYRO_DRAWINGS[m.id]]));

/** The pyro drawing for a catalog diagram type ("preheater", "grate-cooler", "vpc-casting" …), else null. */
export function pyroDrawingForType(diagramType: string | null | undefined): PyroDrawing | null {
  return (diagramType && BY_TYPE[diagramType]) || null;
}

export function pyroDrawingForMachine(machineId: string | null | undefined): PyroDrawing | null {
  return (machineId && PYRO_DRAWINGS[machineId]) || null;
}
