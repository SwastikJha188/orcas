/**
 * Machine-kit (TSE) part builder for imperative three.js detail: boxes, turned
 * parts, members, bolts, bolted inset panels, handrails, ladders. Parts are added
 * to the current group and merged per material at the end (`finishKitGroup`), with
 * the kit's mid-grey rim on hard edges, so heavy detail costs a few draw calls.
 * Used for the KLN-01 kiln twin's detail layer; the pyro plant model
 * (pyro-plant-model.ts) follows the same conventions.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type KV3 = [number, number, number];

/** Materials the kit paints with (any MeshStandardMaterial set). */
export interface KitMats {
  model: THREE.Material;
  steel: THREE.Material;
  shell: THREE.Material;
  machined: THREE.Material;
  recess: THREE.Material;
  concrete: THREE.Material;
  rail: THREE.Material;
  material: THREE.Material;
  bolt: THREE.Material;
  plate: THREE.Material;
}

const UP = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);

export function kitBuilder(mats: KitMats) {
  let g = new THREE.Group();
  const into = (grp: THREE.Group) => {
    g = grp;
  };
  const add = <T extends THREE.Mesh>(m: T) => {
    m.userData.merge = true;
    g.add(m);
    return m;
  };
  /** Box standing on y. */
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat = mats.model) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    return add(m);
  };
  /** Cylinder on its side (axis x or z) or upright (y), centred on (x, y, z). */
  const disc = (r: number, len: number, x: number, y: number, z: number, axis: "x" | "y" | "z", mat = mats.model, seg = 24) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
    if (axis === "x") m.rotation.z = Math.PI / 2;
    else if (axis === "z") m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    return add(m);
  };
  /** Round member from a to b. */
  const tube = (a: KV3, b: KV3, r: number, mat = mats.steel, seg = 12) => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), seg), mat);
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(UP, vb.clone().sub(va).normalize());
    return add(m);
  };
  /** Rectangular member from a to b (w across, h tall). */
  const beam = (a: KV3, b: KV3, w: number, h: number, mat = mats.steel) => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const m = new THREE.Mesh(new THREE.BoxGeometry(va.distanceTo(vb), h, w), mat);
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(X, vb.clone().sub(va).normalize());
    return add(m);
  };
  /** Hex bolt head on a face whose normal is `axis`. */
  const bolt = (x: number, y: number, z: number, axis: "x" | "y" | "z", r = 0.05) => disc(r, 0.05, x, y, z, axis, mats.bolt, 6);
  /**
   * Hairline inset panel with a bolt in each corner on a ±z or ±x face of a box
   * spanning [x0, x1] × [y0, y1] × [z0, z1].
   */
  const panel = (face: "+z" | "-z" | "+x" | "-x", x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m = 0.18) => {
    const s = face[0] === "+" ? 1 : -1;
    const br = Math.min(0.06, m * 0.3);
    if (face[1] === "z") {
      const zf = s > 0 ? z1 : z0;
      box(x1 - x0 - 2 * m, y1 - y0 - 2 * m, 0.03, (x0 + x1) / 2, y0 + m, zf + s * 0.015, mats.model);
      for (const x of [x0 + m * 0.5, x1 - m * 0.5]) for (const y of [y0 + m * 0.5, y1 - m * 0.5]) bolt(x, y, zf + s * 0.03, "z", br);
    } else {
      const xf = s > 0 ? x1 : x0;
      box(0.03, y1 - y0 - 2 * m, z1 - z0 - 2 * m, xf + s * 0.015, y0 + m, (z0 + z1) / 2, mats.model);
      for (const z of [z0 + m * 0.5, z1 - m * 0.5]) for (const y of [y0 + m * 0.5, y1 - m * 0.5]) bolt(xf + s * 0.03, y, z, "x", br);
    }
  };
  /** Straight handrail at deck height y: posts, mid and top rails. */
  const rail = (x0: number, z0: number, x1: number, z1: number, y: number) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.2));
    for (let i = 0; i <= n; i++) box(0.05, 1.05, 0.05, x0 + ((x1 - x0) * i) / n, y, z0 + ((z1 - z0) * i) / n, mats.rail);
    beam([x0, y + 1.05, z0], [x1, y + 1.05, z1], 0.045, 0.045, mats.rail);
    beam([x0, y + 0.55, z0], [x1, y + 0.55, z1], 0.035, 0.035, mats.rail);
  };
  const railRect = (x0: number, x1: number, z0: number, z1: number, y: number) => {
    rail(x0, z0, x1, z0, y);
    rail(x1, z0, x1, z1, y);
    rail(x1, z1, x0, z1, y);
    rail(x0, z1, x0, z0, y);
  };
  /** Caged ladder against a ±z face, from y0 to y1. */
  const ladder = (x: number, z: number, y0: number, y1: number, out: 1 | -1) => {
    box(0.05, y1 - y0, 0.05, x - 0.22, y0, z, mats.rail);
    box(0.05, y1 - y0, 0.05, x + 0.22, y0, z, mats.rail);
    for (let y = y0 + 0.3; y < y1; y += 0.3) beam([x - 0.22, y, z], [x + 0.22, y, z], 0.03, 0.03, mats.rail);
    for (let y = y0 + 2.2; y < y1; y += 0.9) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.018, 4, 14, Math.PI), mats.rail);
      t.rotation.x = Math.PI / 2;
      t.rotation.z = out > 0 ? 0 : Math.PI;
      t.position.set(x, y, z + out * 0.02);
      add(t);
    }
  };
  /** Upright cylinder standing on y. */
  const cyl = (r: number, h: number, x: number, y: number, z: number, mat = mats.model, seg = 32) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
    m.position.set(x, y + h / 2, z);
    return add(m);
  };
  /** Upright frustum standing on y (bottom radius, top radius): hoppers, cones, nozzles. */
  const cone = (rBottom: number, rTop: number, h: number, x: number, y: number, z: number, mat = mats.model, seg = 32) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat);
    m.position.set(x, y + h / 2, z);
    return add(m);
  };
  /** Ring of radius r and tube t around an axis through (x, y, z): stiffener bands, flanges, handrail rings. */
  const ring = (r: number, t: number, x: number, y: number, z: number, axis: "x" | "y" | "z" = "y", mat = mats.steel, seg = 48) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, seg), mat);
    if (axis === "y") m.rotation.x = Math.PI / 2;
    else if (axis === "x") m.rotation.y = Math.PI / 2;
    m.position.set(x, y, z);
    return add(m);
  };
  /** Pipe along a polyline with a sphere at each bend (elbow). */
  const pipe = (pts: KV3[], r: number, mat = mats.steel, seg = 14) => {
    for (let i = 0; i < pts.length - 1; i++) tube(pts[i], pts[i + 1], r, mat, seg);
    for (let i = 1; i < pts.length - 1; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, seg, 8), mat);
      s.position.set(...pts[i]);
      add(s);
    }
  };
  /** Turned part: profile [radius, height] pairs revolved about the vertical axis through (x, y, z). */
  const lathe = (profile: Array<[number, number]>, x: number, y: number, z: number, mat = mats.model, seg = 40) => {
    const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), seg), mat);
    m.position.set(x, y, z);
    return add(m);
  };
  /** Circular handrail of radius r around a roof or platform at height y. */
  const railRing = (x: number, z: number, r: number, y: number) => {
    ring(r, 0.022, x, y + 1.05, z, "y", mats.rail);
    ring(r, 0.018, x, y + 0.55, z, "y", mats.rail);
    const n = Math.max(6, Math.round((2 * Math.PI * r) / 1.2));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      box(0.05, 1.05, 0.05, x + Math.cos(a) * r, y, z + Math.sin(a) * r, mats.rail);
    }
  };
  /** Bolt circle of n bolts, radius r, on a face whose normal is `axis`, centred on (x, y, z). */
  const boltCircle = (x: number, y: number, z: number, r: number, n: number, axis: "x" | "y" | "z", br = 0.03) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const u = Math.cos(a) * r;
      const v = Math.sin(a) * r;
      if (axis === "x") bolt(x, y + u, z + v, "x", br);
      else if (axis === "y") bolt(x + u, y, z + v, "y", br);
      else bolt(x + u, y + v, z, "z", br);
    }
  };
  /**
   * Foot-mounted electric motor (TEFC) with its shaft along x, lying from x0 to x1 at
   * shaft height y: frame with cooling ribs, fan cowl with grille at x0, terminal box,
   * feet, shaft stub past x1. `dir` -1 puts the shaft end at x0 instead.
   */
  const motor = (x0: number, x1: number, y: number, z: number, r: number, dir: 1 | -1 = 1) => {
    const len = x1 - x0;
    const cowlX = dir > 0 ? x0 : x1;
    const shaftX = dir > 0 ? x1 : x0;
    disc(r, len * 0.78, x0 + len * (dir > 0 ? 0.47 : 0.53), y, z, "x", mats.model, 28);
    disc(r * 0.92, len * 0.2, cowlX + dir * len * 0.1, y, z, "x", mats.steel, 28); // fan cowl
    disc(r * 0.8, 0.02, cowlX - dir * 0.005, y, z, "x", mats.recess, 24); // grille
    for (const f of [0.35, 0.6]) ring(r * 0.8 * f, Math.max(0.004, r * 0.02), cowlX - dir * 0.012, y, z, "x", mats.steel, 24);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      if (Math.sin(a) < -0.5) continue; // feet side
      const rib = new THREE.Mesh(new THREE.BoxGeometry(len * 0.66, r * 0.12, r * 0.04), mats.model);
      rib.position.set(x0 + len * 0.5, y + Math.sin(a) * (r + r * 0.05), z + Math.cos(a) * (r + r * 0.05));
      rib.rotation.x = -a + Math.PI / 2;
      add(rib);
    }
    box(len * 0.28, r * 0.5, r * 0.7, x0 + len * 0.5, y + r * 0.9, z, mats.model); // terminal box
    for (const fx of [x0 + len * 0.2, x1 - len * 0.2]) box(len * 0.14, y - r * 0.6, r * 1.7, fx, 0, z, mats.steel); // feet
    disc(r * 0.22, len * 0.2, shaftX + dir * len * 0.08, y, z, "x", mats.machined, 16); // shaft
  };
  /** Field transmitter mounted on a surface at `at` with outward normal `n`: fitting, neck, body, display. */
  const transmitter = (at: KV3, n: KV3, s = 1) => {
    const Y = new THREE.Vector3(0, 1, 0);
    const p = new THREE.Vector3(...at);
    const nn = new THREE.Vector3(...n).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(Y, nn);
    const part = (geo: THREE.BufferGeometry, mat: THREE.Material, d: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(p).addScaledVector(nn, d * s);
      m.quaternion.copy(q);
      add(m);
    };
    part(new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.05 * s, 6), mats.machined, 0.025);
    part(new THREE.CylinderGeometry(0.015 * s, 0.015 * s, 0.05 * s, 8), mats.machined, 0.075);
    part(new THREE.CylinderGeometry(0.06 * s, 0.06 * s, 0.15 * s, 18), mats.model, 0.175);
    part(new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.015 * s, 18), mats.recess, 0.255);
  };
  return { into, add, box, disc, tube, beam, bolt, panel, rail, railRect, ladder, cyl, cone, ring, pipe, lathe, railRing, boltCircle, motor, transmitter };
}

export type Kit = ReturnType<typeof kitBuilder>;

/**
 * Merge a group's kit parts per material and add the rim lines; returns the
 * merged meshes (so callers can tag them, e.g. with an owning subsystem).
 */
export function finishKitGroup(grp: THREE.Group, edgeMat: THREE.LineBasicMaterial, noRim: THREE.Material[] = []): THREE.Mesh[] {
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const old: THREE.Mesh[] = [];
  for (const o of grp.children) {
    if (!(o instanceof THREE.Mesh) || !o.userData.merge) continue;
    o.updateMatrix();
    const geo = o.geometry.clone().applyMatrix4(o.matrix);
    o.geometry.dispose();
    const mat = o.material as THREE.Material;
    const list = buckets.get(mat) ?? [];
    list.push(geo);
    buckets.set(mat, list);
    old.push(o);
  }
  for (const o of old) grp.remove(o);
  const out: THREE.Mesh[] = [];
  for (const [mat, list] of buckets) {
    // Extruded / lathed shapes come non-indexed; merge needs one kind, so drop indices when mixed.
    const mixed = list.some((gg) => !gg.index) && list.some((gg) => gg.index);
    const geos = mixed ? list.map((gg) => (gg.index ? gg.toNonIndexed() : gg)) : list;
    if (mixed) for (const gg of list) if (gg.index) gg.dispose();
    const merged = mergeGeometries(geos, false);
    for (const gg of geos) gg.dispose();
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    grp.add(m);
    out.push(m);
    if (!noRim.includes(mat)) grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(merged, 35), edgeMat));
  }
  return out;
}
