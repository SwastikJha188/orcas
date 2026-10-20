# File template (3D)

Save as the path the user asked for; otherwise
`src/components/home/twin/models/<kebab-name>.ts`. Replace every `<…>`.

```ts
/**
 * <Machine or line name>: machine-kit 3D twin from <source image / PDF page>,
 * in metres. x runs <left → right meaning>, y is up, +z faces <front side>.
 * <One sentence: what is in the model, left to right.>
 */
import * as THREE from "three";
import type { Kit, KitMats, KV3 } from "@/components/home/twin/machine-kit-3d";
import { kitParts } from "@/components/home/twin/machine-kit-3d-parts";

/* ---------------------------------------------------------------- layout (metres, from the inventory) */

const <ITEM_A> = { x: <…>, z: <…>, r: <…>, h: <…> };
const <ITEM_B> = { x: <…>, z: <…>, len: <…> };

/** Measurement points: surface point and outward normal. */
const POINTS: Array<{ tag: string; at: KV3; n: KV3 }> = [
  { tag: "<TAG-1>", at: [<x>, <y>, <z>], n: [0, 0, 1] },
];

/* ---------------------------------------------------------------- model */

export const model = {
  id: "<MODEL-ID>",
  name: "<Machine name>",
  /** Overall size [x length, y height, z depth] in metres, as read from the image. */
  size: [<…>, <…>, <…>] as [number, number, number],
  build(k: Kit, mats: KitMats, part: (name: string | null) => void) {
    const p = kitParts(k, mats);

    /* shared structure, foundations, racks */
    part(null);

    /* sub-assembly 1 */
    part("<Sub-assembly 1>");
    p.tank({ ...<ITEM_A>, top: "dome", bottom: "cone" });

    /* sub-assembly 2 */
    part("<Sub-assembly 2>");

    /* connections */
    part(null);

    /* instruments */
    for (const pt of POINTS) p.transmitter(pt.at, pt.n);

    /* detail layer: bolts, panels, nozzles, rings, ladders, rails, supports */
  },
};
```

Notes

- `build` must only call `k.*`, `p.*`, `part(…)` and `k.add(new THREE.Mesh(geometry, mats.<name>))`.
- Read numbers from the layout constants; write `ITEM_A.x + ITEM_A.r` instead of copying computed numbers.
- Use `THREE` only for geometry (e.g. `TorusGeometry`, partial `CylinderGeometry`) and vectors.
