/**
 * Rim lines for the plant twin's CAD models.
 *
 * `EdgesGeometry` over the three building GLBs (1.3 M indices) takes about half
 * a second, so it runs in a worker (`twin-rims.worker.ts`): each model's mesh
 * positions go over once, and the line positions come back as transferred
 * buffers. The result is the same geometry `new EdgesGeometry(g, RIM_ANGLE)`
 * builds, keyed by the source geometry (clones share it), and cached per GLTF
 * scene so later visits reuse it. Without workers it is built in place.
 */
import * as THREE from "three";

/** Crease angle, degrees, above which an edge is drawn. */
export const RIM_ANGLE = 32;

export type RimRequest = { angle: number; meshes: { position: Float32Array; index: Uint16Array | Uint32Array | null }[] };
/** Line positions per mesh, and each one's bounding sphere as [x, y, z, radius]. */
export type RimResponse = { lines: Float32Array[]; spheres: number[][] };

export type Rims = Map<THREE.BufferGeometry, THREE.BufferGeometry>;

const RIMS = new WeakMap<THREE.Object3D, Promise<Rims>>();

function geometriesOf(scene: THREE.Object3D): THREE.BufferGeometry[] {
  const out = new Set<THREE.BufferGeometry>();
  scene.traverse((n) => {
    if ((n as THREE.Mesh).isMesh) out.add((n as THREE.Mesh).geometry);
  });
  return [...out];
}

/** A copy of the xyz positions (only the attribute's own range, so the GLB buffer is not cloned). */
function positionsOf(g: THREE.BufferGeometry): Float32Array {
  const a = g.getAttribute("position");
  if (a instanceof THREE.BufferAttribute && a.array instanceof Float32Array && a.itemSize === 3 && !a.normalized) return a.array.slice();
  const out = new Float32Array(a.count * 3);
  for (let i = 0; i < a.count; i++) {
    out[i * 3] = a.getX(i);
    out[i * 3 + 1] = a.getY(i);
    out[i * 3 + 2] = a.getZ(i);
  }
  return out;
}

function inPlace(geoms: THREE.BufferGeometry[]): Rims {
  return new Map(geoms.map((g) => [g, new THREE.EdgesGeometry(g, RIM_ANGLE)]));
}

/** Rim lines for every mesh geometry of a loaded GLTF scene (stable promise per scene, for `use`). */
export function rimsOf(scene: THREE.Object3D): Promise<Rims> {
  let p = RIMS.get(scene);
  if (p) return p;
  p = new Promise<Rims>((resolve) => {
    const geoms = geometriesOf(scene);
    let worker: Worker;
    try {
      worker = new Worker(new URL("./twin-rims.worker.ts", import.meta.url));
    } catch {
      resolve(inPlace(geoms));
      return;
    }
    worker.onmessage = (e: MessageEvent<RimResponse>) => {
      worker.terminate();
      const { lines, spheres } = e.data;
      resolve(
        new Map(
          geoms.map((g, i) => {
            const line = new THREE.BufferGeometry();
            line.setAttribute("position", new THREE.Float32BufferAttribute(lines[i], 3));
            const [x, y, z, r] = spheres[i];
            line.boundingSphere = new THREE.Sphere(new THREE.Vector3(x, y, z), r);
            return [g, line];
          }),
        ),
      );
    };
    worker.onerror = () => {
      worker.terminate();
      resolve(inPlace(geoms));
    };
    const req: RimRequest = {
      angle: RIM_ANGLE,
      meshes: geoms.map((g) => {
        const idx = g.getIndex()?.array;
        return { position: positionsOf(g), index: idx instanceof Uint16Array || idx instanceof Uint32Array ? idx.slice() : null };
      }),
    };
    worker.postMessage(req, { transfer: req.meshes.flatMap((m) => (m.index ? [m.position.buffer, m.index.buffer] : [m.position.buffer])) });
  });
  RIMS.set(scene, p);
  return p;
}
