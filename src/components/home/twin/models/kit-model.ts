/**
 * What a machine-diagram-3d file exports as `model`, and the one way it is
 * built: the kit builder draws each `part(name)` into its own group, then every
 * group is merged per material with the kit rim (`finishKitGroup`). The diagram
 * lab (scripts/diagram-lab/page-3d.ts) and the app viewer (kit-model-canvas.tsx)
 * both build through here, so a model looks the same in both.
 */
import * as THREE from "three";
import { finishKitGroup, kitBuilder, type Kit, type KitMats } from "../machine-kit-3d";

export interface KitModel {
  id: string;
  name: string;
  /** Overall size in metres [length x, height y, depth z], as read from the drawing. */
  size: [number, number, number];
  /** Draws the machine; call `part(name)` before each sub-assembly so it becomes its own clickable group. */
  build: (k: Kit, mats: KitMats, part: (name: string | null) => void) => void;
}

export interface BuiltKitModel {
  /** Every group, standing on y = 0 and centred on x / z. */
  root: THREE.Group;
  /** Named parts in build order; a name used twice in `build` is one part. */
  parts: string[];
  /** Rim material of each named part (recoloured for hover / selection). */
  rims: Map<string, THREE.LineBasicMaterial>;
  /** Built size, metres. */
  size: THREE.Vector3;
  /** build() threw: the message (the parts drawn before it still show). */
  error: string | null;
  dispose: () => void;
}

const noRaycast = () => undefined;

/**
 * Builds `model` with `mats`. `edgeMat` rims the unnamed structure; each named
 * part gets its own rim material (a copy of `edgeMat`). Merged meshes carry the
 * part name in `userData.part` (null for structure).
 */
export function buildKitModel(model: KitModel, mats: KitMats, edgeMat: THREE.LineBasicMaterial): BuiltKitModel {
  const inner = new THREE.Group();
  const k = kitBuilder(mats);
  const groups: THREE.Group[] = [];
  const part = (name: string | null) => {
    const g = new THREE.Group();
    g.name = name ?? "";
    inner.add(g);
    groups.push(g);
    k.into(g);
  };
  part(null);
  let error: string | null = null;
  try {
    model.build(k, mats, part);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const rims = new Map<string, THREE.LineBasicMaterial>();
  const parts: string[] = [];
  const noRim = [mats.rail, mats.material, mats.bolt, mats.recess];
  for (const g of groups) {
    const name = g.name || null;
    let rim = edgeMat;
    if (name && g.children.length) {
      rim = rims.get(name) ?? edgeMat.clone();
      if (!rims.has(name)) {
        rims.set(name, rim);
        parts.push(name);
      }
    }
    for (const m of finishKitGroup(g, rim, noRim)) m.userData.part = name;
    // Rim lines never take the pointer: hover and clicks belong to the faces.
    for (const o of g.children) if (o instanceof THREE.LineSegments) o.raycast = noRaycast;
  }

  const box = new THREE.Box3().setFromObject(inner);
  const size = box.isEmpty() ? new THREE.Vector3() : box.getSize(new THREE.Vector3());
  const centre = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
  inner.position.set(-centre.x, box.isEmpty() ? 0 : -box.min.y, -centre.z);
  const root = new THREE.Group();
  root.add(inner);

  const dispose = () => {
    root.traverse((o) => {
      const g = (o as THREE.Mesh | THREE.LineSegments).geometry;
      g?.dispose();
    });
    for (const r of rims.values()) r.dispose();
  };
  return { root, parts, rims, size, error, dispose };
}
