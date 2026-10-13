import type { HierarchyNode } from "@/components/assets/assets-data";
import { isFolder, subtreeMachines } from "@/components/assets/hierarchy/hierarchy-model";
import type { Tone } from "@/components/assets/assets-shell-ui";

/* ==========================================================================
   3D plant twin — scene model (ported from ULTRON lib/plantScene3d).
   Metres in the glTF frame: X right, Y up, Z toward the camera. A component
   origin is the centre of its footprint at ground level.
   Pure data: no three.js here, so it is safe to import anywhere.
   ========================================================================== */

export type PlantModelKey = "utility-building" | "power-house" | "preheater-calciner";

export interface PlantModelDef {
  name: string;
  url: string;
  /** Overall extents in metres after `correction`, before `displayScale`. */
  footprint: [number, number];
  height: number;
  /** Applied between placement and geometry: rotation first, then offset. */
  correction?: { rotation: [number, number, number]; offset: [number, number, number] };
  /** Map-only scale for models that would dwarf the yard at 1:1. */
  displayScale?: number;
}

export const PLANT_MODELS: Record<PlantModelKey, PlantModelDef> = {
  "utility-building": {
    name: "Industrial utility building",
    url: "/models/plant/utility-building.glb",
    footprint: [8.8, 7.6],
    height: 5.03,
  },
  "power-house": {
    name: "Electrical / power house",
    url: "/models/plant/power-house.glb",
    footprint: [15.3, 9.3],
    height: 5.91,
  },
  "preheater-calciner": {
    name: "Preheater & calciner",
    url: "/models/plant/preheater-calciner.glb",
    // Real structure: 26.38 × 39.20 m footprint, 139.68 m tall (Onshape CAD, Z-up).
    footprint: [26.38, 39.2],
    height: 139.68,
    correction: { rotation: [-Math.PI / 2, 0, 0], offset: [-28.309, -3.715, 16.4] },
    // Drawn at a tenth of life size so the tower reads as the site landmark,
    // not a skyscraper over a village. The map is not to scale for this model.
    displayScale: 0.1,
  },
};

/** Uniform scale a placed building is drawn at. */
export function buildingScale(model: PlantModelKey, scalePct: number): number {
  return (scalePct / 100) * (PLANT_MODELS[model].displayScale ?? 1);
}

export interface TwinBuilding {
  id: string;
  name: string;
  model: PlantModelKey;
  x: number;
  z: number;
  /** Yaw in degrees. */
  rotation: number;
  /** Percent. */
  scale: number;
  /** The hierarchy area this building houses; null for site infrastructure. */
  areaId: string | null;
}

export type TwinConnectionKind = "electrical" | "network";

export interface TwinConnection {
  id: string;
  from: string;
  to: string;
  kind: TwinConnectionKind;
}

export interface TwinScene {
  buildings: TwinBuilding[];
  connections: TwinConnection[];
}

/** What a building's floating label and the inspector state about it. */
export interface TwinCallout {
  tone: Tone;
  status: string;
  health: number | null;
  machines: number;
  running: number;
  alerts: number;
  telemetry: "LIVE" | "RECORD" | "—";
}

const PROCESS_TOWER = /pyro|kiln|clinker|preheat|calcin/i;
const SPACING = 22;

/**
 * Lays out one building per area of the plant, plus the site's electrical
 * house and gateway (acquisition) house that every area is wired back to.
 * Areas sit on a grid along the centre line; the power house stands behind
 * the yard and the gateway house in front, so the service runs fan out.
 */
export function buildPlantScene(plant: HierarchyNode): TwinScene {
  const areas = (plant.children ?? []).filter(isFolder);
  const cols = Math.min(3, Math.max(1, areas.length));
  const rows = Math.ceil(areas.length / cols);

  const buildings: TwinBuilding[] = areas.map((area, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const machines = subtreeMachines(area).length;
    const tower = PROCESS_TOWER.test(area.name);
    return {
      id: area.id,
      name: area.name,
      model: tower ? "preheater-calciner" : "utility-building",
      x: (col - (cols - 1) / 2) * SPACING,
      z: (row - (rows - 1) / 2) * SPACING,
      rotation: 0,
      scale: tower ? 100 : Math.min(150, 90 + machines * 12),
      areaId: area.id,
    };
  });

  const halfDepth = ((rows - 1) / 2) * SPACING;
  const power: TwinBuilding = {
    id: `${plant.id}:power`,
    name: "Electrical / Power House",
    model: "power-house",
    x: 0,
    z: -halfDepth - 24,
    rotation: 0,
    scale: 90,
    areaId: null,
  };
  const gateway: TwinBuilding = {
    id: `${plant.id}:gateway`,
    name: "Gateway House",
    model: "utility-building",
    x: (cols > 1 ? SPACING / 2 : 0) + 6,
    z: halfDepth + 22,
    rotation: 0,
    scale: 62,
    areaId: null,
  };

  const connections: TwinConnection[] = buildings.flatMap((b) => [
    { id: `e:${b.id}`, from: power.id, to: b.id, kind: "electrical" as const },
    { id: `n:${b.id}`, from: gateway.id, to: b.id, kind: "network" as const },
  ]);

  return { buildings: [...buildings, power, gateway], connections };
}
