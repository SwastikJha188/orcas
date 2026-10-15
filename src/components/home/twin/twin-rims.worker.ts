/**
 * Builds the plant twin's rim lines (`EdgesGeometry`) off the main thread and
 * posts back each mesh's line positions (see `twin-rims.ts`).
 */
import { BufferAttribute, BufferGeometry, EdgesGeometry } from "three";
// Types only: a value import would pull in twin-rims.ts, which spawns this worker.
import type { RimRequest, RimResponse } from "./twin-rims";

self.onmessage = (e: MessageEvent<RimRequest>) => {
  const { angle, meshes } = e.data;
  const lines: Float32Array[] = [];
  const spheres: number[][] = [];
  for (const { position, index } of meshes) {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(position, 3));
    if (index) g.setIndex(new BufferAttribute(index, 1));
    const edges = new EdgesGeometry(g, angle);
    // Culling needs each line's bounding sphere; measured here, it costs the first frame nothing.
    edges.computeBoundingSphere();
    const { center, radius } = edges.boundingSphere!;
    lines.push((edges.getAttribute("position") as BufferAttribute).array as Float32Array);
    spheres.push([center.x, center.y, center.z, radius]);
  }
  const res: RimResponse = { lines, spheres };
  self.postMessage(res, { transfer: lines.map((l) => l.buffer) });
};
