/**
 * Generated 3D models as data (DB `diagrams.data`, kind "3d"): a skill-made
 * model file is built once offline (scripts/diagram-lab/export.mjs) and its
 * meshes captured — geometry parameters, transform, kit material, part — so the
 * app can show a new plant's model without a rebuild. `kitModelFromData`
 * replays it as an ordinary KitModel (same viewer, same twin, same rims).
 */
import * as THREE from "three";
import { kitBuilder, type KitMats } from "../machine-kit-3d";
import type { KitModel } from "./kit-model";

export interface KitModelData {
  format: "ultron.kit3d/1";
  id: string;
  name: string;
  size: [number, number, number];
  /** Kit material names, indexed by the meshes. */
  materials: string[];
  /** three.js geometry JSON (parametric when possible, else raw attributes). */
  geometries: unknown[];
  /** Parts in build order; each mesh is [geometry, material, px, py, pz, qx, qy, qz, qw, sx, sy, sz]. */
  parts: Array<{ name: string | null; meshes: number[][] }>;
}

const MAT_NAMES: Array<keyof KitMats> = ["model", "steel", "shell", "machined", "recess", "concrete", "rail", "material", "bolt", "plate"];
/** Geometries rebuilt from their parameters; anything else is stored as raw attributes. */
const PARAMETRIC = new Set(["BoxGeometry", "CylinderGeometry", "SphereGeometry", "TorusGeometry", "ConeGeometry", "LatheGeometry", "PlaneGeometry", "CircleGeometry", "RingGeometry"]);
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

function geometryJson(g: THREE.BufferGeometry): unknown {
  if (PARAMETRIC.has(g.type)) {
    const j = g.toJSON() as unknown as Record<string, unknown>;
    delete j.uuid;
    delete j.metadata;
    return j;
  }
  // Extruded / merged shapes: plain attributes, rounded.
  const plain = new THREE.BufferGeometry().copy(g);
  const j = plain.toJSON() as unknown as { data: { attributes: Record<string, { array: number[] }> } } & Record<string, unknown>;
  delete j.uuid;
  delete j.metadata;
  for (const a of Object.values(j.data.attributes)) a.array = a.array.map(r4);
  plain.dispose();
  return j;
}

/** Runs `model.build` with stand-in materials and records every mesh it adds. */
export function captureKitModel(model: KitModel): KitModelData {
  const mats = Object.fromEntries(MAT_NAMES.map((n) => [n, Object.assign(new THREE.MeshBasicMaterial(), { name: n })])) as unknown as KitMats;
  const k = kitBuilder(mats);
  const groups: THREE.Group[] = [];
  const part = (name: string | null) => {
    const g = new THREE.Group();
    g.name = name ?? "";
    groups.push(g);
    k.into(g);
  };
  part(null);
  model.build(k, mats, part);

  const geoIndex = new Map<string, number>();
  const geometries: unknown[] = [];
  const materials: string[] = [];
  const matIndex = (m: THREE.Material) => {
    const name = m.name || "model";
    let i = materials.indexOf(name);
    if (i < 0) i = materials.push(name) - 1;
    return i;
  };
  const parts: KitModelData["parts"] = [];
  for (const g of groups) {
    g.updateMatrixWorld(true);
    const meshes: number[][] = [];
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const json = geometryJson(m.geometry);
      const key = JSON.stringify(json);
      let gi = geoIndex.get(key);
      if (gi === undefined) {
        gi = geometries.push(json) - 1;
        geoIndex.set(key, gi);
      }
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3();
      m.matrixWorld.decompose(p, q, s);
      meshes.push([gi, matIndex(m.material as THREE.Material), ...[p.x, p.y, p.z, q.x, q.y, q.z, q.w, s.x, s.y, s.z].map(r4)]);
    });
    if (meshes.length) parts.push({ name: g.name || null, meshes });
  }
  for (const m of Object.values(mats)) (m as THREE.Material).dispose();
  return { format: "ultron.kit3d/1", id: model.id, name: model.name, size: model.size, materials, geometries, parts };
}

function geometryFrom(json: unknown, loader: THREE.BufferGeometryLoader): THREE.BufferGeometry {
  const j = json as { type: string } & Record<string, unknown>;
  const Ctor = (THREE as unknown as Record<string, { fromJSON?: (d: unknown) => THREE.BufferGeometry }>)[j.type];
  if (PARAMETRIC.has(j.type) && Ctor?.fromJSON) return Ctor.fromJSON(j);
  return loader.parse(j as Parameters<THREE.BufferGeometryLoader["parse"]>[0]);
}

/** A stored model as a KitModel: build() re-adds each captured mesh to its part. */
export function kitModelFromData(data: KitModelData): KitModel {
  return {
    id: data.id,
    name: data.name,
    size: data.size,
    build(k, mats, part) {
      const loader = new THREE.BufferGeometryLoader();
      const geos = data.geometries.map((g) => geometryFrom(g, loader));
      const byName = mats as unknown as Record<string, THREE.Material>;
      for (const p of data.parts) {
        part(p.name);
        for (const [gi, mi, px, py, pz, qx, qy, qz, qw, sx, sy, sz] of p.meshes) {
          const mesh = new THREE.Mesh(geos[gi], byName[data.materials[mi]] ?? mats.model);
          mesh.position.set(px, py, pz);
          mesh.quaternion.set(qx, qy, qz, qw);
          mesh.scale.set(sx, sy, sz);
          k.add(mesh);
        }
      }
    },
  };
}

export function isKitModelData(v: unknown): v is KitModelData {
  return !!v && typeof v === "object" && (v as { format?: string }).format === "ultron.kit3d/1";
}
