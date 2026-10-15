/**
 * Pyro line plant model in the ULTRON machine-kit (TSE) style, imperative three.js.
 *
 * `buildSite` lays out the whole cement-works plot (Home site overview);
 * `buildPyroMachine` returns one machine of it on its own, in metres, for the
 * per-machine 3D twin. Pure scene construction — no React.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type MachineKey = "FSL" | "KFS" | "PHC" | "KLN" | "BRN" | "CLR" | "HMR" | "CSL";
export type InfraKey = "GW" | "PW";
export type NodeKey = MachineKey | InfraKey;
export type V3 = [number, number, number];

export const LINE: MachineKey[] = ["FSL", "KFS", "PHC", "KLN", "BRN", "CLR", "HMR", "CSL"];
export const INFRA: InfraKey[] = ["GW", "PW"];

/* ---------------------------------------------------------------- palette */

export interface Palette {
  dark: boolean;
  model: string;
  steel: string;
  shell: string;
  machined: string;
  recess: string;
  concrete: string;
  rail: string;
  edge: string;
  fine: string;
  flame: string;
  flameGlow: string;
  plate: string;
  grid: string;
  data: string;
  power: string;
  good: string;
  warn: string;
  bad: string;
  idle: string;
  sun: string;
}

/**
 * Theme tokens resolved for WebGL: the ULTRON machine-drawing kit (--mx-*, the TSE
 * style) in 3D — graphite bodies, mid-grey rims, near-black recesses, brushed metal,
 * muted brass only for process material.
 */
export function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  const dark = document.documentElement.dataset.theme !== "light";
  return {
    dark,
    model: v("--mx-body", dark ? "#1c1e23" : "#e3e5e9"),
    steel: v("--mx-metal-dark", dark ? "#25282e" : "#5c6572"),
    shell: v("--mx-raised", dark ? "#2a2d34" : "#f3f4f6"),
    machined: v("--mx-metal", dark ? "#565b65" : "#8a93a0"),
    recess: v("--mx-deep", dark ? "#0c0d10" : "#c2c6cd"),
    concrete: v("--mx-raised-hi", dark ? "#363a42" : "#ffffff"),
    rail: v("--mx-metal-hi", dark ? "#8d929c" : "#5a616c"),
    edge: v("--mx-edge", dark ? "#60646d" : "#5a616c"),
    fine: v("--mx-fine", dark ? "#3b3e46" : "#a4aab3"),
    flame: v("--mx-material", "#9a7a3c"),
    flameGlow: v("--mx-material-hi", "#b39352"),
    plate: v("--mx-body-deep", dark ? "#14161a" : "#d3d6dc"),
    grid: v("--mx-fine", dark ? "#3b3e46" : "#a4aab3"),
    data: v("--signal-blue", "#60a5fa"),
    power: v("--text-muted", "#8e8e93"),
    good: v("--status-success", "#34d399"),
    warn: v("--status-warning", "#fbbf24"),
    bad: v("--status-danger", "#f87171"),
    idle: v("--text-muted", "#8e8e93"),
    sun: v("--twin-sun", "#fff6ea"),
  };
}


/* ---------------------------------------------------------------- scene */

export interface Mats {
  model: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  shell: THREE.MeshStandardMaterial;
  machined: THREE.MeshStandardMaterial;
  recess: THREE.MeshStandardMaterial;
  flame: THREE.MeshStandardMaterial;
  plate: THREE.MeshStandardMaterial;
  /** Concrete structures: tower frame, piers, silos. */
  concrete: THREE.MeshStandardMaterial;
  road: THREE.MeshStandardMaterial;
  /** Handrails, ladders, fences, small bar stock. */
  rail: THREE.MeshStandardMaterial;
  /** Process material (clinker on the pans) — the only non-status colour (machine-drawing rule). */
  material: THREE.MeshStandardMaterial;
  /** Bolt heads (dark, no rim lines). */
  bolt: THREE.MeshStandardMaterial;
}

export interface Site {
  groups: Record<NodeKey, THREE.Group>;
  edges: Partial<Record<MachineKey, THREE.MeshBasicMaterial>>;
  infraEdges: THREE.MeshBasicMaterial[];
  pickables: THREE.Object3D[];
  dataMats: THREE.LineDashedMaterial[];
  powerMats: THREE.LineDashedMaterial[];
  /** Mid-grey rim on every body (the machine-kit outline). */
  edgeMat: THREE.LineBasicMaterial;
}

/**
 * Builds the plant as a cement-works plot plan (1 unit ≈ 2 m), kiln axis along x:
 * raw-meal silo and kiln feed at −x, the preheater tower over the kiln inlet,
 * the kiln falling toward the hood, firing floor and grate cooler, crusher and
 * the pan-conveyor gallery up to the clinker silo at +x. The site road runs
 * along z = 40 with the control room (gateway) and substation south of it.
 * Static parts are merged per material and group at the end, so detail does
 * not cost draw calls.
 */
export function buildSite(scene: THREE.Scene, mats: Mats, only?: NodeKey | NodeKey[]): Site {
  const keep = only === undefined ? null : new Set<NodeKey>(Array.isArray(only) ? only : [only]);
  const groups = {} as Record<NodeKey, THREE.Group>;
  const edges: Site["edges"] = {};
  const infraEdges: THREE.MeshBasicMaterial[] = [];
  const pickables: THREE.Object3D[] = [];
  const dataMats: THREE.LineDashedMaterial[] = [];
  const powerMats: THREE.LineDashedMaterial[] = [];
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x60646d, transparent: true, opacity: 0.9 });
  const all: THREE.Group[] = [];
  let g = new THREE.Group();

  const newGroup = (key: NodeKey | null) => {
    g = new THREE.Group();
    if (key) {
      g.userData.key = key;
      groups[key] = g;
    }
    scene.add(g);
    all.push(g);
  };
  newGroup(null);
  const group = (key: NodeKey) => newGroup(key);
  const add = (m: THREE.Mesh) => {
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
  /** Upright cylinder standing on y. */
  const cyl = (r: number, h: number, x: number, y: number, z: number, mat = mats.model, seg = 32) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
    m.position.set(x, y + h / 2, z);
    return add(m);
  };
  /** Upright frustum standing on y: bottom radius, top radius. */
  const cone = (rBottom: number, rTop: number, h: number, x: number, y: number, z: number, mat = mats.model, seg = 32) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat);
    m.position.set(x, y + h / 2, z);
    return add(m);
  };
  /** Cylinder lying on its side, axis along x or z, centred on (x, y, z). */
  const disc = (r: number, len: number, x: number, y: number, z: number, axis: "x" | "z", mat = mats.model, seg = 28) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
    if (axis === "x") m.rotation.z = Math.PI / 2;
    else m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    return add(m);
  };
  /** Horizontal ring (handrail / ring beam) of radius r at height y. */
  const ring = (r: number, t: number, x: number, y: number, z: number, mat = mats.steel, seg = 48) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, seg), mat);
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    return add(m);
  };
  const up = new THREE.Vector3(0, 1, 0);
  const tube = (a: V3, b: V3, r: number, mat = mats.steel, seg = 14) => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), seg), mat);
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(up, vb.clone().sub(va).normalize());
    return add(m);
  };
  const path = (pts: V3[], r: number, mat = mats.steel, seg = 14) => {
    for (let i = 0; i < pts.length - 1; i++) tube(pts[i], pts[i + 1], r, mat, seg);
    // Elbows: a sphere at each bend hides the joint.
    for (let i = 1; i < pts.length - 1; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, seg, 8), mat);
      s.position.set(...pts[i]);
      add(s);
    }
  };
  /** Rectangular member from a to b (w across, h tall). */
  const xAxis = new THREE.Vector3(1, 0, 0);
  const beam = (a: V3, b: V3, w: number, h: number, mat = mats.steel) => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const m = new THREE.Mesh(new THREE.BoxGeometry(va.distanceTo(vb), h, w), mat);
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(xAxis, vb.clone().sub(va).normalize());
    return add(m);
  };
  /** Straight handrail from a to b at deck height y: posts, mid and top rails. */
  const rail = (x0: number, z0: number, x1: number, z1: number, y: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 1.6));
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      box(0.07, 0.55, 0.07, x0 + (x1 - x0) * f, y, z0 + (z1 - z0) * f, mats.rail);
    }
    beam([x0, y + 0.55, z0], [x1, y + 0.55, z1], 0.06, 0.06, mats.rail);
    beam([x0, y + 0.28, z0], [x1, y + 0.28, z1], 0.05, 0.05, mats.rail);
  };
  /** Rectangle of handrail around a deck. */
  const railRect = (x: number, z: number, w: number, d: number, y: number) => {
    const [a, b, c, e] = [x - w / 2, x + w / 2, z - d / 2, z + d / 2];
    rail(a, c, b, c, y);
    rail(b, c, b, e, y);
    rail(b, e, a, e, y);
    rail(a, e, a, c, y);
  };
  /** Circular handrail around a roof of radius r at height y. */
  const railRing = (x: number, z: number, r: number, y: number) => {
    ring(r, 0.04, x, y + 0.55, z, mats.rail);
    ring(r, 0.035, x, y + 0.28, z, mats.rail);
    const n = Math.round((2 * Math.PI * r) / 1.8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      box(0.07, 0.55, 0.07, x + Math.cos(a) * r, y, z + Math.sin(a) * r, mats.rail);
    }
  };
  /** Ladder with safety cage from y0 to y1 against a face. */
  const ladder = (x: number, z: number, y0: number, y1: number) => {
    box(0.06, y1 - y0, 0.06, x - 0.25, y0, z, mats.rail);
    box(0.06, y1 - y0, 0.06, x + 0.25, y0, z, mats.rail);
    for (let y = y0 + 2.4; y < y1; y += 1.6) ring(0.38, 0.025, x, y, z + 0.32, mats.rail, 12);
  };
  const legs = (x: number, z: number, half: number, h: number, mat = mats.steel, t = 0.4) => {
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(t, h, t, x + a * half, 0.35, z + b * half, mat);
    // Cross bracing on two faces.
    beam([x - half, 0.6, z - half], [x + half, h * 0.8, z - half], 0.12, 0.12);
    beam([x + half, 0.6, z - half], [x - half, h * 0.8, z - half], 0.12, 0.12);
    beam([x - half, 0.6, z + half], [x - half, h * 0.8, z - half], 0.12, 0.12);
  };
  /** X-bracing in one vertical bay between two columns (along x at z, or along z at x). */
  const xbrace = (a: V3, b: V3, h: number) => {
    beam(a, [b[0], b[1] + h, b[2]], 0.18, 0.18);
    beam([a[0], a[1] + h, a[2]], b, 0.18, 0.18);
  };
  /** Steel stack: foundation, shell with stiffener bands, a caged ladder and a platform with rail. */
  const stack = (x: number, z: number, r: number, h: number) => {
    cyl(r * 1.45, 1.4, x, 0.35, z, mats.concrete);
    cone(r * 1.15, r, h * 0.12, x, 1.75, z, mats.shell, 32);
    cyl(r, h * 0.88, x, 1.75 + h * 0.12, z, mats.shell, 32);
    for (let y = 6; y < h; y += 6) ring(r + 0.06, 0.08, x, 1.75 + y, z, mats.steel, 32);
    cyl(r + 0.18, 0.7, x, 1.75 + h - 0.7, z, mats.machined, 32);
    ring(r + 0.9, 0.3, x, 1.75 + h * 0.82, z, mats.steel, 32);
    railRing(x, z, r + 1.1, 1.75 + h * 0.82 + 0.1);
    ladder(x + r + 0.35, z, 1.75, 1.75 + h * 0.82);
    for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) box(0.2, 0.25, 0.2, x + Math.cos(a) * (r + 0.1), 1.75 + h * 0.5, z + Math.sin(a) * (r + 0.1), mats.machined); // sampling ports
  };
  /** Concrete silo: plinth, slip-formed shell with formwork lines, roof slab, top house, roof rail, ladder. Returns roof height. */
  const silo = (x: number, z: number, r: number, h: number) => {
    const y0 = 1.35;
    cyl(r + 0.8, 1, x, 0.35, z, mats.concrete, 56); // ring foundation
    cyl(r, h, x, y0, z, mats.concrete, 56);
    for (let y = 2.4; y < h; y += 2.4) ring(r + 0.02, 0.05, x, y0 + y, z, mats.model, 56); // slip-form lines
    // Buttress pilasters around the foot.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, h * 0.22, 0.7), mats.concrete);
      p.position.set(x + Math.cos(a) * (r + 0.3), y0 + h * 0.11, z + Math.sin(a) * (r + 0.3));
      p.rotation.y = -a;
      add(p);
    }
    // Aeration ring main with drops into the silo floor.
    ring(r + 0.55, 0.13, x, y0 + 0.9, z, mats.steel, 56);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      tube([x + Math.cos(a) * (r + 0.55), y0 + 0.9, z + Math.sin(a) * (r + 0.55)], [x + Math.cos(a) * r, y0 + 0.4, z + Math.sin(a) * r], 0.07, mats.steel, 6);
    }
    // Discharge tunnel portal (west) and two outlet openings.
    box(3.4, 3.2, 1.4, x - r - 0.4, 0.35, z - 2.5, mats.concrete).rotation.y = Math.PI / 2;
    box(2.4, 2.4, 0.2, x - r - 1.15, 0.35, z - 2.5, mats.recess).rotation.y = Math.PI / 2;
    for (const a of [2.4, 4.5]) {
      const o = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.3), mats.recess);
      o.position.set(x + Math.cos(a) * r, 0.35 + 1.1, z + Math.sin(a) * r);
      o.rotation.y = -a + Math.PI / 2;
      add(o);
    }
    // Bolted manholes up the shell (west side).
    for (const [a, yy] of [[Math.PI * 0.9, 0.3], [Math.PI * 1.1, 0.6]] as Array<[number, number]>) {
      for (const [w, t, mat] of [[1.2, 0.12, mats.steel], [0.9, 0.16, mats.recess]] as Array<[number, number, THREE.Material]>) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, w * 1.15, t), mat as THREE.MeshStandardMaterial);
        m.position.set(x + Math.cos(a) * (r + 0.04), y0 + h * yy, z + Math.sin(a) * (r + 0.04));
        m.rotation.y = -a + Math.PI / 2;
        add(m);
      }
    }
    // External spiral stair: treads, support brackets, outer posts and handrail.
    const R = r + 0.95;
    const turns = Math.max(1.2, h / 15);
    const n = Math.round(h / 0.42);
    const a0 = Math.PI * 0.75;
    let prevTop: V3 | null = null;
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      const a = a0 + f * turns * Math.PI * 2;
      const yy = y0 + f * (h - 0.4);
      const t = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.5), mats.plate);
      t.position.set(x + Math.cos(a) * R, yy, z + Math.sin(a) * R);
      t.rotation.y = -a;
      add(t);
      if (k % 6 === 0) beam([x + Math.cos(a) * r, yy - 0.6, z + Math.sin(a) * r], [x + Math.cos(a) * (R + 0.7), yy - 0.06, z + Math.sin(a) * (R + 0.7)], 0.1, 0.12, mats.steel);
      if (k % 3 === 0) {
        const px = x + Math.cos(a) * (R + 0.72);
        const pz = z + Math.sin(a) * (R + 0.72);
        box(0.06, 1.0, 0.06, px, yy, pz, mats.rail);
        const top: V3 = [px, yy + 1.0, pz];
        if (prevTop) beam(prevTop, top, 0.05, 0.05, mats.rail);
        prevTop = top;
      }
    }
    // Roof: parapet, roof slab, rail, hatches, relief valve, level radars, vents, lightning mast.
    ring(r + 0.15, 0.3, x, y0 + h, z, mats.concrete, 56);
    cone(r + 0.1, r * 0.92, 0.9, x, y0 + h, z, mats.concrete, 56);
    const roof = y0 + h + 0.9;
    railRing(x, z, r * 0.9, roof);
    for (const [dx, dz] of [[r * 0.45, r * 0.45], [-r * 0.5, r * 0.3]]) housing(1.4, 0.4, 1.2, x + dx, roof, z + dz, mats.steel, []); // hatches
    cyl(0.45, 0.8, x - r * 0.55, roof, z - r * 0.35, mats.steel, 16); // pressure relief valve
    cyl(0.6, 0.12, x - r * 0.55, roof + 0.8, z - r * 0.35, mats.machined, 16);
    for (const [dx, dz] of [[r * 0.6, -r * 0.2], [r * 0.2, -r * 0.62]]) {
      cyl(0.18, 0.7, x + dx, roof, z + dz, mats.machined, 10); // level radar
      cone(0.28, 0.12, 0.3, x + dx, roof + 0.7, z + dz, mats.steel, 10);
    }
    for (const [dx, dz] of [[-r * 0.2, r * 0.62], [r * 0.62, r * 0.05]]) {
      cyl(0.16, 1, x + dx, roof, z + dz, mats.steel, 10); // vent pipe with mushroom cap
      cyl(0.4, 0.1, x + dx, roof + 1, z + dz, mats.steel, 12);
    }
    // Top house: windows, door, louvre, pitched roof.
    const hw = r * 0.8;
    const hd = r * 0.55;
    housing(hw, 3, hd, x, roof, z, mats.model, ["-z"]);
    for (let k = 0; k < 4; k++) windowZ(x - hw / 2 + (k + 0.5) * (hw / 4), roof + 1.3, z + hd / 2, 1, 0.9, 0.8);
    box(0.9, 2, 0.1, x + hw / 2 - 0.8, roof, z - hd / 2 - 0.05, mats.recess); // door
    louvreX(x + hw / 2, 1, roof + 0.8, z, 1.2, 1.1);
    pitched(x, z, hw + 0.3, hd + 0.3, roof + 3, 0.9);
    const mx = x - r * 0.75;
    const mz = z + r * 0.1;
    cyl(0.07, 7, mx, roof, mz, mats.rail, 6); // lightning mast
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mats.machined); // aviation light
    lamp.position.set(mx, roof + 7.2, mz);
    add(lamp);
    return roof + 3.9;
  };
  /** Cyclone: tangential inlet scroll, cylinder, cone, flap-valve meal pipe, vortex-finder outlet. Returns its gas outlet. */
  const cyclone = (x: number, y: number, z: number, r: number, inletSide: 1 | -1): V3 => {
    cyl(r, r * 1.7, x, y, z, mats.shell, 32);
    ring(r + 0.03, 0.08, x, y + r * 0.85, z, mats.steel, 32);
    cone(r * 0.22, r, r * 1.9, x, y - r * 1.9, z, mats.shell, 32);
    box(r * 1.2, r * 1.1, r * 0.9, x + inletSide * r * 0.9, y + r * 0.45, z + r * 0.55, mats.shell); // inlet scroll
    cyl(r * 0.45, r * 0.7, x, y + r * 1.7, z, mats.steel, 20);
    ring(r * 0.5, 0.08, x, y + r * 2.35, z, mats.steel, 20); // outlet flange
    ring(r + 0.04, 0.09, x, y, z, mats.steel, 32); // cone flange
    // Service platform around the roof of the barrel, with handrail.
    const deck = new THREE.Mesh(new THREE.RingGeometry(r + 0.04, r + 1.15, 36), mats.plate);
    deck.rotation.x = -Math.PI / 2;
    deck.position.set(x, y + r * 1.7 + 0.02, z);
    add(deck);
    railRing(x, z, r + 1.1, y + r * 1.7);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      beam([x + Math.cos(a) * r, y + r * 1.3, z + Math.sin(a) * r], [x + Math.cos(a) * (r + 1.1), y + r * 1.7 - 0.04, z + Math.sin(a) * (r + 1.1)], 0.08, 0.1, mats.steel); // knee braces
    }
    // Bolted manhole on the front of the barrel.
    box(r * 0.5, r * 0.55, 0.12, x, y + r * 0.35, z + r + 0.04, mats.steel);
    for (const u of [-1, 1]) for (const v of [0.08, r * 0.47]) bolt(x + u * r * 0.19, y + r * 0.35 + v, z + r + 0.12, "z", 0.06);
    // Air-blast cannons on the cone: receiver tank and nozzle.
    for (const sd of [-1, 1]) {
      const yc = y - r * 1.0;
      const rc = r * 0.62;
      disc(0.32, 1.1, x + sd * (rc + 0.75), yc, z + 0.4, "x", mats.steel, 14);
      tube([x + sd * (rc + 0.2), yc, z + 0.4], [x + sd * rc * 0.85, yc - 0.15, z + 0.2], 0.08, mats.machined, 8);
    }
    // Meal pipe with a flap valve down to the riser of the stage below.
    tube([x, y - r * 1.9, z], [x, y - r * 1.9 - 3, z], r * 0.16, mats.steel, 10);
    box(r * 0.5, r * 0.4, r * 0.5, x, y - r * 1.9 - 1.6, z, mats.machined);
    return [x, y + r * 2.4, z];
  };
  /** Pitched roof (two sloped sheets and a ridge) over a w × d footprint, ridge along x. */
  const pitched = (x: number, z: number, w: number, d: number, y: number, rise: number) => {
    // Attic: a triangular prism closes both gable ends under the sheets.
    const tri = new THREE.CylinderGeometry(1, 1, 1, 3);
    tri.rotateZ(-Math.PI / 2);
    tri.rotateX(-Math.PI / 2);
    const attic = new THREE.Mesh(tri, mats.model);
    attic.scale.set(w - 0.12, rise / 1.5, (d - 0.12) / Math.sqrt(3));
    attic.position.set(x, y + rise / 3, z);
    add(attic);
    for (let sx = -w / 2 + 0.5; sx < w / 2; sx += 0.9) for (const sd of [-1, 1]) beam([x + sx, y + 0.12, z - sd * (d / 2)], [x + sx, y + rise + 0.06, z], 0.05, 0.05, mats.steel); // standing seams
    const half = d / 2;
    const slope = Math.hypot(half, rise);
    const ang = Math.atan2(rise, half);
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, slope), mats.steel);
      m.rotation.x = s * ang;
      m.position.set(x, y + rise / 2, z - s * half / 2);
      add(m);
    }
    box(w, 0.2, 0.4, x, y + rise - 0.05, z, mats.machined);
  };
  /** Framed window on a ±z wall: frame, dark pane, mullion and transom, sill. */
  const windowZ = (x: number, y: number, zf: number, sg: 1 | -1, w = 1.3, h = 1.1) => {
    box(w, h, 0.1, x, y, zf + sg * 0.05, mats.steel);
    box(w - 0.2, h - 0.2, 0.12, x, y + 0.1, zf + sg * 0.06, mats.recess);
    box(0.06, h - 0.2, 0.16, x, y + 0.1, zf + sg * 0.08, mats.steel);
    box(w - 0.2, 0.06, 0.16, x, y + h * 0.62, zf + sg * 0.08, mats.steel);
    box(w + 0.14, 0.08, 0.3, x, y - 0.08, zf + sg * 0.15, mats.steel);
  };
  /** Louvre panel on a ±x wall: frame and slats. */
  const louvreX = (xf: number, sg: 1 | -1, y: number, z: number, w = 1.6, h = 1.4) => {
    box(0.1, h, w, xf + sg * 0.05, y, z, mats.steel);
    for (let k = 0; k < 6; k++) box(0.16, 0.06, w - 0.16, xf + sg * 0.1, y + 0.14 + (k * (h - 0.28)) / 5, z, mats.recess);
  };
  /** Rooftop / wall condenser: casing and a dark fan grille facing `face`. */
  const condenser = (x: number, y: number, z: number, face: "y" | "x") => {
    housing(1.5, 0.9, 1.1, x, y, z, mats.model, []);
    if (face === "y") disc(0.38, 0.04, x, y + 0.92, z, "x", mats.recess, 20).rotation.set(0, 0, 0);
    else disc(0.34, 0.04, x - 0.77, y + 0.45, z, "x", mats.recess, 20);
  };
  /**
   * Clad industrial building: stepped plinth, walls with cladding ribs, base course and eaves
   * bands, framed windows front and back, roller shutter with header box and guides, personnel
   * door with frame, canopy, steps, wall light and sign plate, louvres, pitched roof with closed
   * gables, standing seams, gutters and downpipes, ridge vents and rooftop condensers.
   */
  const building = (x: number, z: number, w: number, d: number, h: number, opts: { louvres?: boolean; mast?: boolean } = {}) => {
    const y0 = 0.75;
    const zf = z + d / 2;
    const zb = z - d / 2;
    box(w + 1.4, 0.2, d + 1.4, x, 0.35, z, mats.concrete); // apron
    box(w + 0.6, 0.25, d + 0.6, x, 0.55, z, mats.concrete); // plinth
    box(w, h, d, x, y0, z, mats.model);
    box(w + 0.1, 0.4, d + 0.1, x, y0, z, mats.steel); // base course
    box(w + 0.1, 0.3, d + 0.1, x, y0 + h - 0.3, z, mats.steel); // eaves band
    for (let px = -w / 2 + 0.5; px < w / 2; px += 0.75) {
      box(0.12, h - 0.7, 0.06, x + px, y0 + 0.4, zf + 0.03, mats.steel);
      box(0.12, h - 0.7, 0.06, x + px, y0 + 0.4, zb - 0.03, mats.steel);
    }
    for (let pz = -d / 2 + 0.5; pz < d / 2; pz += 0.75) {
      box(0.06, h - 0.7, 0.12, x - w / 2 - 0.03, y0 + 0.4, z + pz, mats.steel);
      box(0.06, h - 0.7, 0.12, x + w / 2 + 0.03, y0 + 0.4, z + pz, mats.steel);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.32, h, 0.32, x + (sx * w) / 2, y0, z + (sz * d) / 2, mats.machined); // corner columns
    // Roller shutter (left of the front): header box, guide rails, slats.
    const rx = x - w / 2 + 2.2;
    const rh = Math.min(3, h * 0.62);
    box(2.4, rh, 0.1, rx, y0, zf + 0.06, mats.machined);
    for (let k = 0; k < Math.floor(rh / 0.3); k++) box(2.4, 0.05, 0.14, rx, y0 + 0.2 + k * 0.3, zf + 0.09, mats.steel);
    for (const sd of [-1, 1]) box(0.14, rh, 0.2, rx + sd * 1.27, y0, zf + 0.1, mats.steel);
    box(2.8, 0.5, 0.45, rx, y0 + rh, zf + 0.22, mats.steel);
    // Personnel door (right of the front): frame, leaf, handle, canopy, steps, wall light, sign plate.
    const dx = x + w / 2 - 1.5;
    box(1.3, 2.25, 0.1, dx, y0, zf + 0.05, mats.steel);
    box(1.0, 2.05, 0.12, dx, y0, zf + 0.07, mats.recess);
    bolt(dx + 0.32, y0 + 1.0, zf + 0.15, "z", 0.06);
    box(1.8, 0.16, 1.1, dx, y0 + 2.5, zf + 0.55, mats.steel);
    for (let k = 0; k < 2; k++) box(1.6, 0.18, 0.45, dx, 0.35 + k * 0.2, zf + 1.0 - k * 0.4, mats.concrete);
    box(0.25, 0.18, 0.2, dx + 0.9, y0 + 2.3, zf + 0.12, mats.machined);
    if (h >= 4.4) box(2.2, 0.55, 0.05, x + 0.6, y0 + h - 1.1, zf + 0.04, mats.model); // sign plate (tall buildings only)
    // Framed windows on the front (between the doors) and along the back.
    const front = Math.max(1, Math.floor((w - 6.4) / 2.1) + 1);
    for (let k = 0; k < front; k++) windowZ(x - w / 2 + 4.3 + (k * (w - 7.2)) / Math.max(1, front - 1), y0 + h * 0.45, zf, 1);
    const back = Math.max(2, Math.floor((w - 1.6) / 2.2));
    for (let k = 0; k < back; k++) windowZ(x - w / 2 + 1.4 + (k * (w - 2.8)) / Math.max(1, back - 1), y0 + h * 0.45, zb, -1);
    // Louvres on the +x end, a wall condenser on the −x end.
    const nl = opts.louvres ? Math.max(1, Math.floor((d - 1) / 2)) : 1;
    for (let k = 0; k < nl; k++) louvreX(x + w / 2, 1, y0 + 0.9, z - d / 2 + 1.2 + (k * (d - 2.4)) / Math.max(1, nl - 1));
    box(0.4, 0.12, 1.2, x - w / 2 - 0.3, y0 + 0.9, z - d / 4, mats.steel); // condenser bracket
    condenser(x - w / 2 - 0.85, y0 + 1.02, z - d / 4, "x");
    // Roof: closed gables, seams, gutters, downpipes, ridge vents, rooftop units.
    const rise = Math.min(1.4, d * 0.12);
    pitched(x, z, w + 0.5, d + 0.5, y0 + h, rise);
    for (const sd of [-1, 1]) box(w + 0.6, 0.18, 0.24, x, y0 + h - 0.1, z + sd * (d / 2 + 0.36), mats.steel); // gutters
    for (const sx of [-1, 1]) for (const sd of [-1, 1]) cyl(0.08, h - 0.2, x + sx * (w / 2 - 0.15), y0 + 0.1, z + sd * (d / 2 + 0.36), mats.steel, 8); // downpipes
    for (const fx of [-w / 4, w / 4]) cyl(0.35, 0.6, x + fx, y0 + h + rise - 0.1, z, mats.machined, 12);
    condenser(x + w / 4, y0 + h + 0.12, z - d / 4 + 0.2, "y");
    if (w > 10) condenser(x - w / 4, y0 + h + 0.12, z - d / 4 + 0.2, "y");
    // Cable tray entering at the back.
    beam([x - w / 4, y0 + h * 0.75, zb - 2.2], [x - w / 4, y0 + h * 0.75, zb - 0.05], 0.7, 0.12, mats.steel);
    if (opts.mast) {
      // Lattice antenna mast with a dish on the roof.
      const mx = x + w / 2 - 1.2;
      const mz = z - d / 4;
      const base = y0 + h;
      const top = base + 7;
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tube([mx + a * 0.45, base, mz + b * 0.45], [mx + a * 0.12, top, mz + b * 0.12], 0.05, mats.rail, 6);
      for (let yy = base + 1; yy < top; yy += 1.2) {
        const f = 0.45 - ((yy - base) / 7) * 0.33;
        for (const [a, b, c, e] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) beam([mx + a * f, yy, mz + b * f], [mx + c * f, yy, mz + e * f], 0.04, 0.04, mats.rail);
      }
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.2, 0.35, 24), mats.steel);
      dish.rotation.x = Math.PI / 2;
      dish.position.set(mx, top - 2.2, mz + 0.55);
      add(dish);
      cyl(0.04, 1.2, mx, top, mz, mats.rail, 6);
    }
  };
  /** Plinth with a thin status rim under it. */
  const plate = (x: number, z: number, w: number, d: number) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), mats.plate);
    p.position.set(x, 0.175, z);
    p.receiveShadow = true;
    p.userData.plate = true;
    g.add(p);
    const edge = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const e = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.12, d + 0.5), edge);
    e.position.set(x, 0.06, z);
    e.userData.plate = true;
    g.add(e);
    return edge;
  };
  const machine = (key: MachineKey, x: number, z: number, w: number, d: number) => {
    group(key);
    edges[key] = plate(x, z, w, d);
  };
  /** Electric motor with fan cowl and terminal box, axis along x or z. */
  /** Bolt head (hex) on a face whose normal is `axis`. */
  const bolt = (x: number, y: number, z: number, axis: "x" | "y" | "z", r = 0.1) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 6), mats.bolt);
    if (axis === "x") m.rotation.z = Math.PI / 2;
    else if (axis === "z") m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    return add(m);
  };
  type Face = "+z" | "-z" | "+x" | "-x";
  /**
   * Machine-kit housing: a box with an inner hairline inset panel and a bolt in each
   * panel corner on the given faces (the TSE gearbox / barrel-block look).
   */
  const housing = (w: number, h: number, d: number, x: number, y: number, z: number, mat = mats.model, faces: Face[] = ["+z", "-z"]) => {
    box(w, h, d, x, y, z, mat);
    const m = Math.min(0.4, Math.min(w, h, d) * 0.14);
    for (const f of faces) {
      const ax = f[1] as "x" | "z";
      const sg = f[0] === "+" ? 1 : -1;
      const fw = ax === "z" ? w : d;
      if (fw < 1 || h < 1) continue;
      if (ax === "z") box(fw - 2 * m, h - 2 * m, 0.05, x, y + m, z + sg * (d / 2 + 0.025), mat);
      else box(0.05, h - 2 * m, fw - 2 * m, x + sg * (w / 2 + 0.025), y + m, z, mat);
      const br = Math.min(0.11, m * 0.32);
      for (const u of [-1, 1])
        for (const v of [m * 0.5, h - m * 0.5]) {
          const o = u * (fw / 2 - m * 0.5);
          if (ax === "z") bolt(x + o, y + v, z + sg * (d / 2 + 0.04), "z", br);
          else bolt(x + sg * (w / 2 + 0.04), y + v, z + o, "x", br);
        }
    }
  };
  /**
   * Electric motor, TSE style: bolted feet, finned graphite body, end shields, fan cowl
   * with a dark grille, shaft stub and a terminal box with a recess window. `y` is the floor.
   */
  const motor = (x: number, y: number, z: number, r: number, len: number, axis: "x" | "z") => {
    const at = (o: number): [number, number] => (axis === "x" ? [x + o, z] : [x, z + o]);
    const fh = r * 0.35;
    for (const o of [-len * 0.3, len * 0.3]) {
      const [fx, fz] = at(o);
      box(axis === "x" ? len * 0.2 : r * 2.3, fh, axis === "x" ? r * 2.3 : len * 0.2, fx, y, fz, mats.steel);
      for (const sd of [-1, 1]) bolt(axis === "x" ? fx : fx + sd * r * 0.95, y + fh + 0.04, axis === "x" ? fz + sd * r * 0.95 : fz, "y", Math.min(0.1, r * 0.12));
    }
    const cy = y + fh + r;
    disc(r, len, x, cy, z, axis, mats.model, 28);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      if (Math.sin(a) < -0.5) continue; // no fins under the body
      const ry = Math.sin(a) * (r + 0.03);
      const rs = Math.cos(a) * (r + 0.03);
      box(axis === "x" ? len * 0.78 : 0.06, 0.06, axis === "x" ? 0.06 : len * 0.78, axis === "x" ? x : x + rs, cy + ry - 0.03, axis === "x" ? z + rs : z, mats.model);
    }
    for (const o of [-len / 2, len / 2]) {
      const [ex, ez] = at(o);
      disc(r * 1.04, 0.12, ex, cy, ez, axis, mats.steel, 28);
    }
    const [cx, cz] = at(-len / 2 - len * 0.12);
    disc(r * 0.92, len * 0.22, cx, cy, cz, axis, mats.steel, 24); // fan cowl
    const [gx, gz] = at(-len / 2 - len * 0.235);
    disc(r * 0.68, 0.04, gx, cy, gz, axis, mats.recess, 24); // grille
    const [sx, sz] = at(len / 2 + len * 0.09);
    disc(r * 0.17, len * 0.18, sx, cy, sz, axis, mats.machined, 12); // shaft
    housing(r * 0.95, r * 0.62, r * 0.85, x, cy + r * 0.92, z, mats.model, []);
    box(axis === "x" ? r * 0.5 : 0.04, r * 0.28, axis === "x" ? 0.04 : r * 0.5, axis === "x" ? x : x + r * 0.45, cy + r * 1.08, axis === "x" ? z + r * 0.45 : z, mats.recess);
  };
  /** Gearbox: bolted inset panels, split-line flange, bearing caps with bosses, sight window, bolted base. */
  const gearbox = (x: number, y: number, z: number, w: number, h: number, d: number) => {
    box(w + 0.5, 0.3, d + 0.5, x, y, z, mats.steel);
    for (const u of [-1, 1]) for (const v of [-1, 1]) bolt(x + u * (w / 2 + 0.1), y + 0.34, z + v * (d / 2 + 0.1), "y", 0.1);
    housing(w, h, d, x, y + 0.3, z, mats.model, ["+z", "-z", "+x", "-x"]);
    box(w + 0.24, 0.18, d + 0.24, x, y + 0.3 + h * 0.52, z, mats.steel); // split line
    for (const sd of [-1, 1]) {
      disc(h * 0.17, 0.16, x + sd * w * 0.26, y + 0.3 + h * 0.52, z + d / 2 + 0.08, "z", mats.steel, 24);
      disc(h * 0.07, 0.24, x + sd * w * 0.26, y + 0.3 + h * 0.52, z + d / 2 + 0.12, "z", mats.machined, 16);
    }
    box(w * 0.42, h * 0.14, 0.05, x, y + 0.3 + h * 0.74, z + d / 2 + 0.07, mats.recess); // sight window
  };
  /** Flexible coupling: two flanges and a hub. */
  const coupling = (x: number, y: number, z: number, r: number, axis: "x" | "z") => {
    for (const o of [-0.16, 0.16]) disc(r, 0.2, axis === "x" ? x + o : x, y, axis === "z" ? z + o : z, axis, mats.steel, 24);
    disc(r * 0.55, 0.16, x, y, z, axis, mats.machined, 16);
  };
  /**
   * Cut-away window on a vertical vessel's +z face (TSE hopper view): framed dark
   * recess with the process material level in brass. `zf` is the vessel's front surface.
   */
  const cutaway = (x: number, zf: number, y0: number, w: number, h: number, fill: number) => {
    box(w + 0.36, h + 0.36, 0.08, x, y0 - 0.18, zf, mats.model);
    box(w, h, 0.1, x, y0, zf + 0.02, mats.recess);
    box(w - 0.14, h * fill, 0.12, x, y0 + 0.07, zf + 0.03, mats.material);
  };
  /** Centrifugal fan: volute, inlet cone, motor on a skid. */
  const fan = (x: number, z: number, r: number, axis: "x" | "z", dir: 1 | -1) => {
    box(axis === "z" ? r * 2.6 : r * 2.2, 0.5, axis === "z" ? r * 2.2 : r * 2.6, x, 0.35, z, mats.concrete);
    disc(r, r * 0.7, x, 0.85 + r, z, axis, mats.steel, 32);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const u = Math.cos(a) * r * 0.82;
      const v = 0.85 + r + Math.sin(a) * r * 0.82;
      for (const sd of [-1, 1]) {
        const off = sd * (r * 0.35 + 0.04);
        if (axis === "x") bolt(x + off, v, z + u, "x", Math.min(0.09, r * 0.07));
        else bolt(x + u, v, z + off, "z", Math.min(0.09, r * 0.07));
      }
    }
    box(axis === "z" ? r * 0.9 : r * 0.7, r * 1.1, axis === "z" ? r * 0.7 : r * 0.9, x + (axis === "z" ? r * 0.6 : 0), 0.85 + r * 1.4, z + (axis === "x" ? r * 0.6 : 0), mats.steel); // outlet
    const ox = axis === "x" ? -dir * r * 0.55 : 0;
    const oz = axis === "z" ? -dir * r * 0.55 : 0;
    const inlet = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.6, r * 0.6, 24), mats.machined);
    if (axis === "x") inlet.rotation.z = (dir * Math.PI) / 2;
    else inlet.rotation.x = (-dir * Math.PI) / 2;
    inlet.position.set(x + ox, 0.85 + r, z + oz);
    add(inlet);
    motor(axis === "x" ? x + dir * r * 1.25 : x, 0.85, axis === "z" ? z + dir * r * 1.25 : z, r * 0.4, r * 0.9, axis);
  };
  /** Oil-filled transformer: tank, radiator fins both sides, HV bushings, conservator. */
  const transformer = (x: number, z: number) => {
    box(3, 0.4, 2.6, x, 0.35, z, mats.concrete);
    housing(2.2, 2.4, 1.6, x, 0.75, z, mats.steel, ["+x", "-x"]);
    for (let i = 0; i < 7; i++)
      for (const s of [-1, 1]) box(0.08, 1.9, 0.5, x - 0.9 + i * 0.3, 1, z + s * 1.05, mats.machined);
    for (let i = 0; i < 3; i++) {
      cyl(0.09, 0.9, x - 0.6 + i * 0.6, 3.15, z - 0.3, mats.rail, 10);
      cyl(0.16, 0.12, x - 0.6 + i * 0.6, 3.5, z - 0.3, mats.machined, 10);
    }
    disc(0.3, 1.6, x, 3.6, z + 0.5, "x", mats.steel, 16);
  };

  /* Kiln axis: inlet (x = −33, y = 12.5) falling 3 % to the outlet (x = 30, y = 10.5). */
  const KX0 = -33;
  const KX1 = 30;
  const KY0 = 12.5;
  const KY1 = 10.5;
  const ky = (x: number) => KY0 + ((x - KX0) / (KX1 - KX0)) * (KY1 - KY0);
  const KR = 2.3;

  // FSL-01 — raw-meal (homogenising) silo, extraction gate, aeration blower house.
  machine("FSL", -100, 20, 24, 32);
  {
    silo(-100, 18, 9, 32);
    cutaway(-100, 18 + 9 + 0.04, 6, 3, 20, 0.7); // raw meal level
    box(3.2, 2.4, 3, -91.6, 0.35, 13, mats.machined); // extraction gate / outlet box
    disc(0.5, 1.6, -91.6, 3.3, 13, "z", mats.steel, 16); // gate actuator
    disc(0.22, 1.2, -91.6, 2.2, 14.8, "z", mats.machined, 10); // gate slide rod
    // Second flow-control outlet gate with its actuator.
    housing(2.4, 2, 2.4, -91, 0.35, 21.3, mats.model, ["+x"]);
    disc(0.4, 1.4, -91, 2.9, 22.9, "z", mats.steel, 14);
    disc(0.16, 0.9, -91, 2.9, 23.9, "z", mats.machined, 10);
    beam([-89.8, 1.4, 21.3], [-88.6, 1.0, 19], 0.7, 0.5, mats.steel); // spout to the extraction air slide
    building(-100, 31.5, 9, 4.5, 3.6, { louvres: true }); // aeration blower house
    // Blower intake silencers on the east end and two aeration mains to the silo ring.
    for (const zz of [30.4, 32.6]) {
      cyl(0.42, 2.4, -94.9, 0.35, zz, mats.steel, 16);
      cone(0.42, 0.2, 0.4, -94.9, 2.75, zz, mats.steel, 16);
    }
    path([[-96.5, 2.2, 29.2], [-96.5, 2.2, 26.6], [-96.5, 2.25, 26]], 0.25);
    path([[-103.5, 2.2, 29.2], [-103.5, 2.2, 26.2], [-103.5, 2.25, 25.4]], 0.25);
    // Silo-feed bucket elevator from the raw mill, with an air slide into the top house.
    const ex = -111.5;
    const ez = 10;
    box(1, 39, 1.5, ex - 0.55, 0.35, ez, mats.steel);
    box(1, 39, 1.5, ex + 0.55, 0.35, ez, mats.steel);
    for (let y = 4; y < 39; y += 4) box(2.4, 0.25, 1.8, ex, y, ez, mats.machined);
    for (let y = 8; y < 38; y += 10) beam([ex + 1.1, y, ez + 0.5], [-100 - 8.4, y, 18 - 4.6], 0.18, 0.18); // ties to the silo
    housing(2.8, 2.2, 2.6, ex, 0.35, ez, mats.model, ["+z"]); // boot
    housing(3.4, 2.6, 3.4, ex, 39.35, ez, mats.model, ["+z", "-x"]); // head house
    pitched(ex, ez, 3.6, 3.6, 41.95, 0.5);
    box(2, 0.3, 1.6, ex, 39.6, ez + 2.5, mats.steel);
    motor(ex, 39.9, ez + 2.5, 0.45, 1.3, "x");
    beam([ex + 1.7, 40.2, ez + 1], [-103.6, 36.4, 17], 0.8, 0.6, mats.steel); // air slide into the top house
    beam([ex + 1.7, 40.53, ez + 1], [-103.6, 36.73, 17], 0.5, 0.06, mats.material);
    beam([ex, 1.6, -6], [ex, 1.6, ez - 1.4], 0.8, 0.6, mats.steel); // incoming raw meal from the raw mill (north)
    beam([ex, 1.93, -6], [ex, 1.93, ez - 1.4], 0.5, 0.06, mats.material);
    for (const sz of [-3, 2]) box(0.25, 1.3, 0.25, ex, 0.35, sz, mats.steel);
    // Silo-roof bag filter with pulse valves and its exhaust fan.
    const roofY = 1.35 + 32 + 0.9;
    housing(3, 2.2, 2.4, -104.6, roofY, 11.6, mats.model, ["+z", "-x"]);
    for (let k = 0; k < 4; k++) cyl(0.18, 0.4, -105.7 + k * 0.7, roofY + 2.2, 11.6, mats.machined, 10);
    disc(0.6, 0.5, -102.4, roofY + 0.9, 11.6, "x", mats.steel, 20);
    motor(-101.4, roofY, 11.6, 0.28, 0.8, "x");
  }

  // KFS-01 — kiln-feed bin on a braced frame, dosing gate, solid-flow meter, air slide, bucket elevator.
  machine("KFS", -65.5, 9, 21, 16);
  {
    beam([-90, 2.6, 13], [-72, 9.4, 10], 0.8, 0.6, mats.steel); // air slide from the silo outlet (rectangular)
    beam([-90, 2.93, 13], [-72, 9.73, 10], 0.5, 0.06, mats.material); // raw meal on the air slide
    for (const [x, y] of [[-85, 4.5], [-79, 6.8]] as Array<[number, number]>) {
      box(0.3, y - 0.6, 0.3, x, 0.35, 12.3, mats.steel);
      box(1.4, 0.4, 1, x, 0.35, 12.3, mats.concrete);
    }
    legs(-72, 10, 2.2, 6.4);
    box(5.4, 0.3, 5.4, -72, 6.6, 10, mats.plate); // bin floor
    railRect(-72, 10, 5.4, 5.4, 6.9);
    cone(0.5, 3, 2.8, -72, 4, 10, mats.shell);
    cyl(3, 4.6, -72, 6.8, 10, mats.shell);
    cutaway(-72, 10 + 3 - 0.04, 7.3, 1.5, 3.4, 0.6); // kiln feed level
    for (const y of [8.2, 9.8]) ring(3.03, 0.06, -72, y, 10, mats.steel, 32);
    cone(3.05, 0.6, 0.9, -72, 11.4, 10, mats.steel);
    cyl(0.25, 0.8, -71, 12.2, 10.6, mats.machined, 10); // level radar
    box(1.4, 1.2, 1.4, -72, 2.6, 10, mats.machined); // dosing gate
    housing(1.8, 1.6, 1.6, -67.6, 0.35, 10, mats.model, ["+z"]); // solid-flow meter
    beam([-71.4, 2.4, 10], [-67.6, 1.8, 10], 0.6, 0.5, mats.steel);
    beam([-66.7, 1.2, 10], [-56.1, 1.2, 7], 0.6, 0.5, mats.steel); // air slide to the elevator boot
    for (const x of [-63, -59]) box(0.25, 0.6, 0.25, x, 0.35, 8.8, mats.steel);
    // Bucket elevator: twin-leg casing with stiffeners, boot, head house and drive.
    box(1.1, 58, 1.6, -55.6, 0.35, 6, mats.steel);
    box(1.1, 58, 1.6, -54.4, 0.35, 6, mats.steel);
    for (let y = 4; y < 58; y += 4) box(2.5, 0.25, 1.9, -55, y, 6, mats.machined);
    box(2.8, 2.2, 2.6, -55, 0.35, 6, mats.machined); // boot
    housing(3.8, 2.8, 3.8, -55, 58.35, 6, mats.model, ["+z", "+x"]); // head house
    pitched(-55, 6, 4, 4, 61.15, 0.6);
    box(2, 0.3, 1.6, -55, 58.7, 8.7, mats.steel); // drive bracket on the head house
    motor(-55, 59, 8.7, 0.5, 1.4, "x");
    beam([-55, 59, 4.1], [-47, 47.4, 2.4], 0.8, 0.6, mats.steel); // air slide to the C2 riser
    beam([-55, 59.33, 4.1], [-47, 47.73, 2.4], 0.5, 0.06, mats.material);
  }

  // PHC-01 — six-stage preheater tower (concrete frame), downcomer, ID fan and main stack.
  machine("PHC", -43.5, -15.5, 20, 45);
  {
    const X1 = -51;
    const X2 = -37;
    const Z1 = -6;
    const Z2 = 6;
    const XM = (X1 + X2) / 2;
    for (const x of [X1, XM, X2]) for (const z of [Z1, Z2]) box(1, 54, 1, x, 0.35, z, mats.concrete);
    const floors: number[] = [];
    for (let y = 8; y <= 52; y += 7.3) floors.push(y);
    for (const y of floors) {
      box(X2 - X1 + 1, 0.8, 0.8, XM, y, Z1, mats.concrete);
      box(X2 - X1 + 1, 0.8, 0.8, XM, y, Z2, mats.concrete);
      box(0.8, 0.8, Z2 - Z1, X1, y, 0, mats.concrete);
      box(0.8, 0.8, Z2 - Z1, X2, y, 0, mats.concrete);
      box(X2 - X1, 0.25, 3.2, XM, y + 0.8, Z1 + 1.6, mats.plate); // grating floor
      box(X2 - X1, 0.25, 2.2, XM, y + 0.8, Z2 - 1.1, mats.plate);
      rail(X1, Z2 + 0.4, X2, Z2 + 0.4, y + 1.05);
      rail(X1, Z1 - 0.4, X2, Z1 - 0.4, y + 1.05);
    }
    // Steel X-bracing in the outer bays of the long faces.
    for (let i = 0; i < floors.length - 1; i++) {
      for (const z of [Z1, Z2]) {
        xbrace([X1 + 0.5, floors[i] + 0.8, z], [XM - 0.5, floors[i] + 0.8, z], floors[i + 1] - floors[i] - 0.8);
      }
    }
    // Clad top floors on the back and the west end (wind and weather shield), with ribs.
    box(X2 - X1, 9.4, 0.12, XM, 44.9, Z1 - 0.5, mats.model);
    for (let xx = X1 + 0.4; xx < X2; xx += 0.9) box(0.1, 9.4, 0.08, xx, 44.9, Z1 - 0.6, mats.steel);
    box(0.12, 9.4, Z2 - Z1, X1 - 0.5, 44.9, 0, mats.model);
    for (let zz = Z1 + 0.4; zz < Z2; zz += 0.9) box(0.08, 9.4, 0.1, X1 - 0.6, 44.9, zz, mats.steel);
    // Compressed-air riser with a branch at every floor, and a vertical cable tray.
    tube([X2 + 0.9, 0.35, Z2 - 0.9], [X2 + 0.9, 52.5, Z2 - 0.9], 0.14, mats.steel, 8);
    for (const y of floors) tube([X2 + 0.9, y + 1.6, Z2 - 0.9], [X2 - 0.6, y + 1.6, Z2 - 0.9], 0.08, mats.steel, 6);
    box(0.7, 52, 0.12, X2 + 0.9, 0.35, Z2 - 2.4, mats.machined);
    box(X2 - X1 + 1.4, 0.6, Z2 - Z1 + 1.4, XM, 54.35, 0, mats.concrete); // roof
    railRect(XM, 0, X2 - X1 + 1.2, Z2 - Z1 + 1.2, 54.95);
    beam([X1, 57.5, 0], [X2, 57.5, 0], 0.5, 0.7, mats.machined); // lifting beam
    housing(1.4, 0.8, 1.1, XM + 2, 56.4, 0, mats.steel, ["+z", "-z"]); // hoist trolley
    tube([XM + 2, 56.4, 0], [XM + 2, 55.4, 0], 0.05, mats.rail, 6);
    for (const [ax, az] of [[X1, Z1], [X2, Z2]]) {
      cyl(0.06, 1.6, ax, 54.95, az, mats.rail, 6);
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mats.machined); // aviation light
      l.position.set(ax, 56.7, az);
      add(l);
    }
    for (const x of [X1, X2]) box(0.4, 2.6, 0.4, x, 54.95, 0, mats.steel);
    // Stair and lift core with windows.
    box(3.2, 57, 3.2, X1 - 2.3, 0.35, -3.5, mats.model);
    for (let y = 4; y < 54; y += 7.3) box(0.06, 1.2, 1.6, X1 - 3.95, y, -3.5, mats.recess);
    pitched(X1 - 2.3, -3.5, 3.6, 3.6, 57.35, 0.6);
    box(1.1, 2.1, 0.1, X1 - 2.3, 0.35, -1.85, mats.recess); // core door
    louvreX(X1 - 3.9, -1, 55, -3.5, 1.4, 1.2); // lift motor room louvre
    // Cyclones, bottom (C6) to top (C1, twin), alternating either side of the tower axis.
    const C6 = cyclone(-48, 12, 0, 2.5, 1);
    const C5 = cyclone(-40.6, 19.3, 0, 2.4, -1);
    const C4 = cyclone(-48, 26.6, 0, 2.4, 1);
    const C3 = cyclone(-40.6, 33.9, 0, 2.3, -1);
    const C2 = cyclone(-48, 41.2, 0, 2.3, 1);
    const C1a = cyclone(-40.6, 47.4, -2.4, 1.9, -1);
    const C1b = cyclone(-40.6, 47.4, 2.4, 1.9, -1);
    const gas: Array<[V3, V3]> = [
      [C6, [-42.9, 21.6, 1.3]],
      [C5, [-45.6, 29, 1.3]],
      [C4, [-42.8, 36.2, 1.2]],
      [C3, [-45.7, 43.5, 1.2]],
      [C2, [-42.4, 50, 0]],
    ];
    for (const [a, b] of gas) {
      path([a, [a[0], a[1] + 1.4, a[2]], b], 0.75, mats.shell, 18);
      ring(0.86, 0.11, a[0], a[1] + 0.6, a[2], mats.steel, 18); // expansion joint
      const mid: V3 = [(a[0] + b[0]) / 2, (a[1] + 1.4 + b[1]) / 2, (a[2] + b[2]) / 2];
      const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1] - 1.4, b[2] - a[2]).normalize();
      const ej = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.4, 18), mats.steel);
      ej.position.set(...mid);
      ej.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      add(ej);
    }
    // Kiln inlet chamber and riser into C6.
    housing(5, 13, 6, -35.5, 2, 0, mats.model, ["+z", "-z", "+x"]);
    for (let y = 4; y < 15; y += 2.5) box(5.1, 0.2, 6.1, -35.5, y, 0, mats.steel);
    box(5.6, 0.3, 6.6, -35.5, 7.8, 0, mats.plate);
    path([[-35.5, 15, 0], [-35.5, 17, 3], [-45.2, 17, 3], [-46.6, 15.4, 1.2]], 1.1, mats.shell, 20);
    // Downcomer from the C1 outlets to the ID fan.
    path([[C1a[0], C1a[1], C1a[2]], [-40.6, 56.5, -2.4], [-40.6, 56.5, -10], [-40.6, 8.5, -10], [-40.6, 7.4, -19.6]], 1.25, mats.shell, 20);
    tube([C1b[0], C1b[1], C1b[2]], [-40.6, 56.5, -2.4], 1, mats.shell, 18);
    for (let y = 12; y < 56; y += 6) ring(1.32, 0.09, -40.6, y, -10, mats.steel, 20);
    for (let y = 12; y < 56; y += 11) beam([-40.6, y, -8.8], [-40.6, y, -6.4], 0.3, 0.3, mats.steel); // downcomer ties to the tower
    // ID fan: volute on a concrete block, inlet box, damper, motor.
    for (let z = -12; z > -19; z -= 3.4) box(0.5, 7.6, 0.5, -40.6, 0.35, z, mats.steel); // downcomer support legs
    box(9, 1.4, 6, -40.6, 0.35, -23.4, mats.concrete);
    disc(3.4, 1.8, -40.6, 5.2, -22.6, "z", mats.steel, 40);
    disc(3.5, 0.15, -40.6, 5.2, -21.6, "z", mats.machined, 40);
    housing(3, 2.4, 2.4, -40.6, 1.75, -20.2, mats.steel, ["+x", "-x"]); // inlet box / damper
    motor(-40.6, 1.75, -26.6, 1, 2.6, "z");
    path([[-43.8, 7.6, -22.6], [-48, 7.6, -28], [-51.6, 6, -33.4]], 1.2, mats.shell, 20);
    stack(-52, -35, 1.8, 62);
  }

  // KLN-01 — rotary kiln on three concrete piers, tyres and support rollers, girth gear and drive.
  machine("KLN", -1.5, 1, 62, 18);
  {
    tube([KX0, KY0, 0], [KX1, KY1, 0], KR, mats.shell, 56);
    for (let x = KX0 + 4; x < KX1; x += 4) disc(KR + 0.02, 0.12, x, ky(x), 0, "x", mats.steel, 56); // shell section seams
    disc(KR + 0.5, 1.6, KX0 + 0.4, KY0, 0, "x", mats.machined, 40); // inlet seal
    disc(KR + 0.5, 1.2, KX1 - 0.2, KY1, 0, "x", mats.machined, 40); // outlet seal
    // Lamella seal plates at both ends, overlapping like scales.
    for (const [sx, sy] of [[KX0 + 1.5, KY0], [KX1 - 1.3, KY1]] as Array<[number, number]>) {
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const pl = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.42), mats.steel);
        pl.position.set(sx, ky(sx) + Math.cos(a) * (KR + 0.12), Math.sin(a) * (KR + 0.12));
        pl.rotation.x = a;
        add(pl);
      }
      ring(KR + 0.2, 0.08, sx - 0.6, sy, 0, mats.machined, 40).rotation.set(0, Math.PI / 2, 0); // clamping band
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      box(0.3, 0.3, 0.6, KX1 - 1.2, KY1 + Math.cos(a) * (KR + 0.45) - 0.15, Math.sin(a) * (KR + 0.45), mats.steel); // cooling-air nozzles at the outlet
    }
    for (const x of [-21, 0, 20]) {
      const y = ky(x);
      disc(KR + 0.5, 1.4, x, y, 0, "x", mats.steel, 56); // tyre
      for (const s of [-1, 1]) disc(KR + 0.12, 0.2, x + s * 0.85, y, 0, "x", mats.machined, 56); // retaining rings
      // Tyre chairs (pads under the tyre bore, ends showing) and stop blocks.
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const ch = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 0.36), mats.machined);
        ch.position.set(x, y + Math.cos(a) * (KR + 0.06), Math.sin(a) * (KR + 0.06));
        ch.rotation.x = a;
        add(ch);
        if (i % 2 === 0)
          for (const sd of [-1, 1]) {
            const sb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.3), mats.steel);
            sb.position.set(x + sd * 1.25, y + Math.cos(a) * (KR + 0.14), Math.sin(a) * (KR + 0.14));
            sb.rotation.x = a;
            add(sb);
          }
      }
      // Tapered concrete pier with a bearing plinth.
      const ph = y - KR - 2.1;
      cone(3.6, 2.9, ph, x, 0.35, 0, mats.concrete, 4).rotation.y = Math.PI / 4;
      box(4.8, 0.6, 6.6, x, 0.35 + ph, 0, mats.concrete);
      for (const z of [-1.75, 1.75]) {
        disc(0.8, 1.5, x, y - KR - 0.75, z, "x", mats.machined, 24); // support roller
        housing(2.4, 0.7, 1.2, x, 0.95 + ph, z, mats.steel, ["+x", "-x"]); // roller bearings
      }
      if (x === 0) {
        // Hydraulic thrust roller against the tyre's downhill face, with cylinder and power pack.
        disc(0.75, 0.7, x + 1.25, y - KR - 0.35, 0.9, "x", mats.machined, 24);
        housing(1.2, 0.8, 1.2, x + 1.25, 0.95 + ph, 0.9, mats.steel, ["+x"]);
        disc(0.22, 1.6, x + 2.4, 1.6 + ph, 0.9, "x", mats.steel, 14); // cylinder
        disc(0.1, 0.8, x + 1.5, 1.6 + ph, 0.9, "x", mats.machined, 10); // rod
        housing(1.3, 1, 1, x + 1.6, 0.95 + ph, 2.6, mats.model, ["+z"]); // power pack
      } else box(0.4, 1.2, 0.4, x, 0.95 + ph, 2.9, mats.machined); // instrument stand
      railRect(x, 0, 5.2, 7.4, 0.95 + ph);
    }
    const gx = -9;
    disc(KR + 1, 0.7, gx, ky(gx), 0, "x", mats.machined, 64); // girth gear
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.2), mats.machined);
      t.position.set(gx, ky(gx) + Math.cos(a) * (KR + 1.06), Math.sin(a) * (KR + 1.06));
      t.rotation.x = a;
      add(t);
    }
    // Spring plates tying the girth gear to the shell.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const sp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.5), mats.steel);
      sp.position.set(gx + 1.1, ky(gx + 1.1) + Math.cos(a) * (KR + 0.55), Math.sin(a) * (KR + 0.55));
      sp.rotation.x = a;
      sp.rotation.z = 0.35;
      add(sp);
    }
    // Gear guard (half shroud) and spray lubrication box.
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(KR + 1.4, KR + 1.4, 1.4, 40, 1, true, 0, Math.PI), mats.steel);
    guard.rotation.z = Math.PI / 2;
    guard.rotation.y = Math.PI;
    guard.position.set(gx, ky(gx), 0);
    add(guard);
    box(1, 1, 1, gx - 1.2, ky(gx) - KR - 1.6, 2.6, mats.machined);
    // Drive train: pinion, coupling, main gearbox, motor, auxiliary drive, on a concrete foundation.
    box(10, 1, 4, gx - 2, 0.35, 5, mats.concrete);
    disc(0.7, 1.2, gx, ky(gx) - KR - 1.1, 3.2, "x", mats.machined, 20); // pinion
    box(1.4, ky(gx) - KR - 2.6, 1.6, gx, 1.35, 3.6, mats.steel); // pinion bearing pedestal
    gearbox(gx - 2.8, 1.35, 5, 3, 2.6, 2.6); // main gearbox
    coupling(gx - 4.75, 2.7, 5, 0.6, "x");
    motor(gx - 7, 1.35, 5, 1, 2.6, "x");
    coupling(gx + 1.35, 1.95, 6.3, 0.32, "x");
    motor(gx + 2.6, 1.35, 6.3, 0.45, 1.2, "x"); // auxiliary drive
    // Axial shell-cooling fans on stands along the burning zone (back side).
    for (const fx of [9, 13, 25, 28]) {
      const fy = ky(fx);
      box(1.8, 0.4, 1.4, fx, 0.35, -5.6, mats.concrete);
      for (const sd of [-0.6, 0.6]) box(0.18, fy - 1.4, 0.18, fx + sd, 0.75, -5.6, mats.steel);
      disc(1.05, 0.7, fx, fy, -5.4, "z", mats.model, 28); // fan ring
      disc(0.78, 0.06, fx, fy, -5.02, "z", mats.recess, 24); // grille toward the shell
      disc(0.3, 0.9, fx, fy, -5.6, "z", mats.machined, 14); // hub / motor
    }
    // Shell scanner on its mast.
    box(1.6, 0.6, 1.6, -15.5, 0.35, -6.8, mats.concrete);
    cyl(0.18, 8.4, -15.5, 0.95, -6.8, mats.steel, 10);
    box(0.9, 0.6, 0.7, -15.5, 9.3, -6.5, mats.machined);
  }

  // BRN-01 — kiln hood, firing floor over the cooler inlet, burner and carriage, fine-coal bin, PA fan, conveying blower.
  machine("BRN", 42, -21, 18, 18);
  {
    housing(5, 8, 8.4, 32.5, 7.6, 0, mats.model, ["+z", "-z", "+x"]); // kiln hood on the cooler inlet
    for (let y = 9; y < 15.6; y += 1.6) box(5.1, 0.15, 8.5, 32.5, y, 0, mats.steel);
    box(5.4, 0.4, 8.8, 32.5, 15.6, 0, mats.steel);
    box(1.2, 1.2, 0.2, 35.05, 12.6, 2.4, mats.recess); // flame-camera port
    // Flame camera on a bracket, bolted inspection doors and air cannons on the hood.
    box(0.4, 0.2, 0.6, 35.3, 12.2, 2.4, mats.steel);
    housing(0.9, 0.6, 0.6, 35.75, 12.4, 2.4, mats.model, []);
    disc(0.18, 0.2, 35.2, 12.7, 2.4, "x", mats.recess, 12);
    for (const dx of [31.2, 33.7]) {
      box(1.2, 1.5, 0.1, dx, 9.6, 4.25, mats.steel);
      for (const u of [-1, 1]) for (const v of [0.15, 1.35]) bolt(dx + u * 0.48, 9.6 + v, 4.32, "z", 0.06);
      box(0.6, 0.6, 0.12, dx, 13.2, 4.24, mats.recess); // sight glass
    }
    for (const dz of [-2, 2]) {
      disc(0.38, 1.2, 32.5, 16.4, dz, "x", mats.steel, 14);
      tube([31.8, 16.2, dz], [31.8, 15.6, dz * 0.8], 0.07, mats.machined, 6);
    }
    ring(0.7, 0.18, 35.1, KY1, 0, mats.concrete, 20).rotation.set(0, Math.PI / 2, 0); // refractory ring around the burner tip
    for (const x of [35.6, 43.4]) for (const z of [-4.6, 4.6]) box(0.5, 9.2, 0.5, x, 0.35, z, mats.steel);
    box(8.4, 0.4, 9.6, 39.5, 9.55, 0, mats.plate); // firing floor
    railRect(39.5, 0, 8.4, 9.6, 9.95);
    for (let i = 0; i < 6; i++) box(0.9, 0.15, 1.2, 44.2 + i * 0.6, 1.2 + i * 1.45, -3.4, mats.steel); // stair to the firing floor
    beam([44, 0.6, -3.4], [47.4, 9.4, -3.4], 0.1, 0.3, mats.steel);
    tube([35, KY1, 0], [43.6, KY1, 0], 0.42, mats.machined, 18); // burner pipe
    for (const x of [36, 38.5, 41]) disc(0.55, 0.25, x, KY1, 0, "x", mats.steel, 18); // channel flanges
    for (let x = 36.6; x < 43; x += 0.8) disc(0.46, 0.06, x, KY1, 0, "x", mats.steel, 18); // jacket bands
    housing(1.8, 1.2, 1.6, 42.6, 9.95, 0, mats.steel, ["+z", "-z"]); // burner carriage
    for (const wx of [41.9, 43.3]) for (const wz of [-0.9, 0.9]) disc(0.22, 0.14, wx, 10.2, wz * 1.05, "z", mats.machined, 12); // trolley wheels
    box(4, 0.2, 0.3, 40.6, 9.95, -0.9, mats.machined); // carriage rails
    box(4, 0.2, 0.3, 40.6, 9.95, 0.9, mats.machined);
    const hw = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 6, 18), mats.machined); // positioning handwheel
    hw.rotation.y = Math.PI / 2;
    hw.position.set(43.75, 11.1, 0.5);
    add(hw);
    // Rear manifold: channel inlets with flexible hoses to the air and coal headers.
    housing(1.1, 1.5, 1.5, 44.3, KY1 - 0.75, 0, mats.model, ["+x"]);
    for (const [hz, hy] of [[-0.45, 0.4], [0.45, 0.4], [0, -0.35]] as Array<[number, number]>) {
      disc(0.22, 0.4, 45, KY1 + hy, hz, "x", mats.steel, 12);
      path([[45.2, KY1 + hy, hz], [46.2, KY1 + hy - 0.6, hz * 2.6], [46.4, 9.95 + 0.6, hz * 4.4 + (hz === 0 ? 2.6 : 0)]], 0.12, mats.machined, 10);
    }
    // Maintenance monorail over the burner: portal, beam, hoist.
    for (const pz of [-4.4, 4.4]) box(0.35, 5.6, 0.35, 44.2, 9.95, pz, mats.steel);
    beam([44.2, 15.6, -4.4], [44.2, 15.6, 4.4], 0.4, 0.4);
    beam([35, 15.4, 0], [44.2, 15.4, 0], 0.35, 0.55, mats.machined);
    housing(0.9, 0.6, 0.6, 40, 14.5, 0, mats.steel, []);
    tube([40, 14.5, 0], [40, 12.6, 0], 0.04, mats.rail, 6);
    // Local control panel on the firing floor.
    housing(1, 1.7, 0.55, 43.2, 9.95, -3.9, mats.model, ["+z"]);
    box(0.5, 0.4, 0.05, 43.2, 11.0, -3.6, mats.recess);
    // Fine-coal bin on its frame with rotor weighfeeder; explosion vent on the roof.
    legs(41, -22, 1.9, 8);
    box(4.6, 0.3, 4.6, 41, 8, -22, mats.plate);
    railRect(41, -22, 4.6, 4.6, 8.3);
    cone(0.5, 2.6, 2.6, 41, 5.6, -22, mats.shell);
    cyl(2.6, 6.4, 41, 8.2, -22, mats.shell);
    cutaway(41, -22 + 2.6 - 0.04, 8.8, 1.3, 5, 0.5); // fine-coal level
    for (const y of [10, 12.4]) ring(2.63, 0.06, 41, y, -22, mats.steel, 32);
    cone(2.65, 0.5, 0.9, 41, 14.6, -22, mats.steel);
    box(1, 0.5, 1, 41.8, 15.2, -22, mats.machined); // explosion vent
    housing(1.6, 1.2, 1.4, 40.2, 15.05, -22, mats.model, ["+z"]); // bin-top filter
    for (let k = 0; k < 3; k++) cyl(0.12, 0.3, 39.7 + k * 0.5, 16.25, -22, mats.machined, 8);
    // Explosion-relief panels on the bin wall with vent ducts out and up.
    for (const a of [0, Math.PI]) {
      const vx = 41 + Math.cos(a) * 2.62;
      const vp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.12), mats.steel);
      vp.position.set(vx, 12, -22);
      vp.rotation.y = Math.PI / 2;
      add(vp);
      beam([vx, 12, -22], [vx + Math.cos(a) * 1.6, 13.4, -22], 1, 1, mats.steel);
    }
    ladder(41 - 2.95, -22.6, 8.3, 15.2); // ladder to the bin top
    housing(2.2, 1.4, 1.8, 41, 2.6, -22, mats.model, ["+z"]); // rotor weighfeeder
    motor(43, 2.6, -22, 0.3, 0.8, "x"); // feeder drive
    // CO analyser cabinet with its sample line to the bin.
    box(1.6, 0.3, 1.2, 46, 0.35, -25, mats.concrete);
    housing(1.1, 1.9, 0.8, 46, 0.65, -25, mats.model, ["+z"]);
    box(0.6, 0.5, 0.05, 46, 1.7, -24.58, mats.recess);
    path([[46, 2.55, -25], [46, 11, -25], [43.4, 11, -22.6]], 0.05, mats.rail, 6);
    // Inerting gas bottle rack piped to the bin.
    box(3, 0.3, 1.2, 37, 0.35, -19, mats.concrete);
    for (let k = 0; k < 6; k++) {
      cyl(0.2, 1.7, 35.9 + k * 0.44, 0.65, -19, mats.steel, 10);
      cyl(0.08, 0.2, 35.9 + k * 0.44, 2.35, -19, mats.machined, 6);
    }
    box(2.9, 0.12, 0.12, 37, 2.6, -19, mats.steel);
    path([[38.5, 2.6, -19], [38.5, 9, -19.6], [39.2, 9, -21]], 0.06, mats.rail, 6);
    path([[41, 3.3, -20.8], [41, 3.3, -6.8], [41, 9.95, -6.8], [42.2, KY1, -0.4]], 0.28);
    for (const z of [-17, -12]) box(0.3, 3, 0.3, 41, 0.35, z, mats.steel); // coal-line supports
    // Coal conveying blower (roots) with silencer, and the primary-air fan.
    box(3.2, 0.4, 2.2, 35.4, 0.35, -26.6, mats.concrete);
    housing(2, 1.4, 1.4, 35, 0.75, -26.6, mats.model, ["+z", "-z"]);
    cyl(0.35, 1.6, 36.6, 0.75, -26.6, mats.steel, 14);
    motor(34, 0.75, -26.6, 0.4, 1, "x");
    path([[35, 2.4, -25.9], [35, 3.3, -21], [39.9, 3.3, -20.8]], 0.25);
    fan(48, -16, 1.4, "z", -1);
    path([[48, 4, -15.4], [48, 11.4, -15.4], [44.2, 11.4, -0.6], [43.6, KY1 + 0.4, -0.2]], 0.36);
    for (const vy of [6.2, 7.4]) ring(0.48, 0.08, 48, vy, -15.4, mats.steel, 16); // flow venturi flanges
    housing(0.9, 0.9, 0.9, 48, 4.6, -15.4, mats.model, ["+x"]); // PA damper
    box(0.35, 0.35, 0.35, 48.6, 5.1, -15.4, mats.machined);
  }

  // CLR-01 — reciprocating grate cooler: housing, six cooling fans, grate drive HPU, vent filter, vent fan and stack.
  machine("CLR", 42.5, 2.2, 27, 17);
  {
    housing(25, 7.2, 8.6, 42.5, 0.35, 0, mats.model, ["+x", "-x"]);
    for (let x = 30.6; x < 55; x += 2) box(0.18, 7.2, 8.8, x, 0.35, 0, mats.steel); // housing stiffeners
    box(25.4, 0.35, 9, 42.5, 7.55, 0, mats.steel);
    for (let i = 0; i < 6; i++) {
      const x = 32.6 + i * 4;
      box(1.4, 1.6, 0.06, x, 1.2, 4.33, mats.recess); // inspection door
      box(1.1, 0.6, 0.06, x + 1.3, 4.4, 4.33, mats.recess); // sight glass
    }
    for (let i = 0; i < 6; i++) {
      const x = 32.8 + i * 4;
      fan(x, 9.4, 1.15, "z", 1);
      beam([x, 2.4, 8.2], [x, 2.4, 4.4], 1, 1.1, mats.steel); // duct to the undergrate compartment
      cyl(0.7, 1.4, x, 0.85, 12.3, mats.machined, 18); // inlet silencer
    }
    rail(29.8, 4.8, 55.2, 4.8, 7.9);
    // Fan ducts: flanges, a measuring section and a louvre damper with actuator on each.
    for (let i = 0; i < 6; i++) {
      const x = 32.8 + i * 4;
      for (const zz of [5, 7.7]) box(1.25, 1.35, 0.12, x, 1.78, zz, mats.steel);
      housing(1.3, 1.3, 0.8, x, 1.75, 6.35, mats.model, ["+x"]); // damper box
      box(0.45, 0.4, 0.4, x, 3.05, 6.35, mats.machined); // actuator
    }
    // Roof: inspection hatches and air blasters over the hot inlet.
    for (const hx of [42, 46.5, 51]) housing(1.4, 0.35, 1.4, hx, 7.9, -1.8, mats.steel, []);
    for (let k = 0; k < 3; k++) {
      disc(0.4, 1.3, 36.4 + k * 1.3, 8.4, -2.6, "z", mats.steel, 14);
      tube([36.4 + k * 1.3, 8.4, -1.9], [36.4 + k * 1.3, 7.9, -1.2], 0.08, mats.machined, 6);
    }
    // Spillage drag-chain conveyor along the back, with its head drive.
    housing(25, 0.8, 0.9, 42.5, 0.35, -5.2, mats.model, ["+x", "-x"]);
    for (let x = 31; x < 55; x += 3) box(0.1, 0.9, 1, x, 0.35, -5.2, mats.steel);
    gearbox(55.8, 0.35, -5.2, 1.2, 0.9, 1);
    motor(55.8, 0.35, -6.6, 0.32, 0.9, "x");
    // Grate drive: three hydraulic cylinders along the back wall, piped to the power unit.
    for (let k = 0; k < 3; k++) {
      const cx = 37 + k * 6;
      disc(0.26, 2.4, cx, 1.6, -4.55, "x", mats.steel, 14);
      disc(0.1, 1.5, cx + 1.9, 1.6, -4.55, "x", mats.machined, 10);
      for (const ex of [cx - 1.3, cx + 2.7]) box(0.3, 0.6, 0.3, ex, 1.3, -4.5, mats.steel); // clevis brackets
      tube([cx - 1, 1.2, -4.75], [52.6, 1.2, -5.6], 0.05, mats.rail, 6);
    }
    // Stair up the back to the cooler roof.
    for (let k = 0; k < 30; k++) box(1, 0.06, 0.32, 31 + k * 0.25, 0.35 + k * 0.25, -6.6, mats.plate);
    for (const sz of [-7.12, -6.08]) beam([31, 0.4, sz], [38.5, 7.9, sz], 0.08, 0.22, mats.steel);
    beam([31, 1.3, -7.12], [38.5, 8.8, -7.12], 0.05, 0.05, mats.rail);
    // Discharge-end hood over the chute to the crusher.
    housing(2.2, 7.2, 5, 56.1, 0.35, 0, mats.model, ["+z", "-z", "+x"]);
    // Covered transfer conveyor from the discharge hood up to the crusher inlet, on two bents.
    beam([57.2, 2.6, 0], [66.4, 6.2, 0], 1.8, 0.8, mats.steel);
    beam([57.2, 3.05, 0], [66.4, 6.65, 0], 1.4, 0.06, mats.material); // clinker on the pans
    beam([57.2, 3.6, 0], [66.4, 7.2, 0], 2.2, 0.12, mats.steel); // cover
    for (const f of [0.35, 0.75]) {
      const bx = 57.2 + 9.2 * f;
      const by = 2.6 + 3.6 * f;
      for (const sd of [-0.85, 0.85]) box(0.25, by - 0.75, 0.25, bx, 0.35, sd, mats.steel);
      box(1.2, 0.35, 2.4, bx, 0.35, 0, mats.concrete);
    }
    housing(1.4, 1.2, 1.6, 66.6, 5.6, 0, mats.steel, ["+z"]); // head chute into the crusher hopper
    // Grate drive hydraulic unit on its skid.
    box(3.6, 0.4, 2.8, 52.6, 0.35, -6.6, mats.concrete);
    housing(3, 1.6, 2.2, 52.6, 0.75, -6.6, mats.model, ["+z", "-z"]);
    for (let i = 0; i < 3; i++) motor(51.6 + i * 1, 2.35, -6.6, 0.25, 0.7, "z");
    // Vent air: duct to the bag filter, vent fan and stack.
    path([[53, 7.9, -2], [53, 13, -2], [64, 13, -21.2], [64, 10.4, -21.2]], 0.9, mats.shell, 18);
    for (const [x, z] of [[55.5, -6], [58.5, -11], [61.5, -16]] as Array<[number, number]>) box(0.4, 12.6, 0.4, x, 0.35, z, mats.steel); // duct bents
    legs(64, -22, 2.6, 4.4, mats.steel, 0.5);
    housing(6.4, 5.6, 5, 64, 4.75, -22, mats.model, ["+x", "-x"]); // vent bag filter
    for (let x = 61.4; x < 66.8; x += 1.3) box(0.15, 5.6, 5.1, x, 4.75, -22, mats.steel);
    for (let i = 0; i < 4; i++) cyl(0.3, 0.5, 62 + i * 1.3, 10.35, -21, mats.machined, 10); // pulse-jet valves
    railRect(64, -22, 6.4, 5, 10.35);
    cone(0.4, 2.5, 3.4, 64, 1.35, -22, mats.model);
    box(1, 1, 1, 64, 0.35, -22, mats.machined); // rotary valve
    fan(69, -26, 1.4, "x", 1);
    path([[64, 2.6, -24.5], [67.6, 2.6, -26]], 0.6);
    stack(72.4, -26.4, 0.9, 28);
  }

  // HMR-01 — clinker hammer crusher at the cooler discharge with its motor and V-belt guard.
  machine("HMR", 69, 0, 10, 10);
  {
    const C = 68; // crusher centre, on its own pad clear of the cooler
    box(4.8, 0.7, 5.6, C, 0.35, 0, mats.concrete);
    housing(3.4, 3.4, 4.2, C, 1.05, 0, mats.model, ["+z", "-z", "+x", "-x"]);
    // Rotor in pillow-block bearings on pedestals, shaft ends showing.
    for (const sd of [-1, 1]) {
      housing(1.4, 1.1, 0.9, C, 1.05, sd * 2.55, mats.steel, ["+x", "-x"]);
      disc(0.55, 0.9, C, 2.6, sd * 2.55, "z", mats.machined, 24);
      for (const u of [-1, 1]) bolt(C + u * 0.5, 2.2, sd * 2.55 + sd * 0.48, "z", 0.08);
      disc(0.2, 0.5, C, 2.6, sd * 3.2, "z", mats.machined, 12);
    }
    // Lined inlet hopper with liner bolts.
    cone(1.5, 0.6, 1.4, C, 4.45, 0, mats.steel);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      bolt(C + Math.cos(a) * 1.05, 5.2, Math.sin(a) * 1.05, "y", 0.07);
    }
    // Hydraulic cylinder that opens the crusher hood, and an access door with a handwheel.
    disc(0.2, 2.2, C - 2, 2.9, 1.7, "x", mats.steel, 12).rotation.set(0, 0, 1.0);
    disc(0.08, 1.2, C - 1.6, 3.8, 1.7, "x", mats.machined, 8).rotation.set(0, 0, 1.0);
    box(0.1, 1.4, 1.2, C + 1.75, 1.6, 0.8, mats.steel);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 18), mats.machined);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(C + 1.9, 2.3, 0.8);
    add(wheel);
    // Discharge chute onto the pan conveyor with breaker bars across it.
    beam([C + 0.8, 1.3, 0.6], [C + 2.6, 1.1, 1], 1.6, 0.5, mats.steel);
    for (let k = 0; k < 5; k++) box(0.08, 0.1, 1.5, C + 1 + k * 0.32, 1.55 - k * 0.03, 0.75, mats.machined);
    // V-belt drive behind a bolted guard on the back; motor on a slide base with a tensioning screw.
    housing(5.9, 3.3, 0.6, C + 2, 0.95, -3.55, mats.model, ["-z"]);
    box(2, 0.25, 2.8, C + 4, 0.35, -4.6, mats.steel);
    for (const sx of [-0.7, 0.7]) box(0.12, 0.12, 2.8, C + 4 + sx, 0.6, -4.6, mats.machined); // slide rails
    tube([C + 5.1, 0.75, -5.9], [C + 5.1, 0.75, -3.9], 0.06, mats.machined, 6); // tensioning screw
    motor(C + 4, 0.6, -4.5, 0.6, 1.6, "z");
    railRect(C, 0, 4.6, 5.4, 4.45);
  }

  // CSL-01 — deep-pan conveyor in a covered truss gallery on trestles up to the clinker silo; baghouse and dust fan on the roof.
  machine("CSL", 122, 35, 30, 28);
  {
    const a: V3 = [70.6, 1.6, 1];
    const b: V3 = [117.5, 35, 33];
    const at = (f: number): V3 => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    const dir = new THREE.Vector3(b[0] - a[0], 0, b[2] - a[2]).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x); // horizontal normal to the gallery
    const off = (p: V3, s: number, dy = 0): V3 => [p[0] + side.x * s, p[1] + dy, p[2] + side.z * s];
    beam(a, b, 1.4, 0.7, mats.machined); // pan chain
    beam([a[0], a[1] + 0.4, a[2]], [b[0], b[1] + 0.4, b[2]], 1.2, 0.1, mats.material); // clinker on the pans
    // Truss sides: chords and diagonals.
    for (const s of [-1.3, 1.3]) {
      beam(off(a, s, -0.4), off(b, s, -0.4), 0.14, 0.14);
      beam(off(a, s, 2.2), off(b, s, 2.2), 0.14, 0.14);
      const n = 22;
      for (let i = 0; i < n; i++) {
        const p = at(i / n);
        const q = at((i + 1) / n);
        beam(off(p, s, -0.4), off(q, s, 2.2), 0.08, 0.08);
        beam(off(p, s, -0.4), off(p, s, 2.2), 0.08, 0.08);
      }
    }
    beam(off(a, 0, 2.4), off(b, 0, 2.4), 3, 0.12, mats.steel); // gallery roof sheet
    // Trestles: braced A-frames on footings.
    for (const f of [0.14, 0.28, 0.42, 0.56, 0.7, 0.84]) {
      const p = at(f);
      for (const s of [-1.3, 1.3]) {
        const top = off(p, s, -0.5);
        const foot = off(p, s * 1.8, 0);
        box(1, 0.5, 1, foot[0], 0.35, foot[2], mats.concrete);
        beam([foot[0], 0.85, foot[2]], top, 0.3, 0.3);
      }
      for (let y = 4; y < p[1] - 1; y += 5) beam(off(p, -1.5, y - p[1]), off(p, 1.5, y - p[1]), 0.15, 0.15);
    }
    const top = silo(124, 36, 10, 31);
    cutaway(124, 36 + 10 + 0.04, 5, 3.2, 20, 0.55); // clinker level
    housing(5, 3.4, 3.6, 120.6, top - 3.9, 39.4, mats.model, ["+z"]); // silo-top baghouse
    for (let x = 118.6; x < 123; x += 1) box(0.12, 3.4, 3.7, x, top - 3.9, 39.4, mats.steel);
    fan(125.6, 39.4, 0.8, "x", 1);
    gearbox(117.5, 35, 33, 2.4, 1.2, 1.6); // conveyor head drive
    box(2.6, 0.3, 1.6, 117.5, 35, 35, mats.steel); // motor bracket
    motor(117.5, 35.3, 35, 0.45, 1.2, "x");
  }

  // Site infrastructure, south of the road: control room with the edge gateway, and the substation.
  const fence = (x: number, z: number, w: number, d: number) => {
    const pts: Array<[number, number, number, number]> = [
      [x - w / 2, z - d / 2, x + w / 2, z - d / 2],
      [x + w / 2, z - d / 2, x + w / 2, z + d / 2],
      [x + w / 2, z + d / 2, x - w / 2, z + d / 2],
      [x - w / 2, z + d / 2, x - w / 2, z - d / 2],
    ];
    for (const [x0, z0, x1, z1] of pts) {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.4));
      for (let i = 0; i <= n; i++) box(0.08, 1.6, 0.08, x0 + ((x1 - x0) * i) / n, 0.35, z0 + ((z1 - z0) * i) / n, mats.rail);
      for (const y of [0.9, 1.9]) beam([x0, y, z0], [x1, y, z1], 0.04, 0.04, mats.rail);
    }
  };
  group("GW");
  infraEdges.push(plate(-14, 72, 16, 11));
  building(-14, 72, 12, 7, 4.6, { mast: true });
  box(1.2, 1, 0.8, -19.4, 0.35, 68.1, mats.machined); // outdoor AC unit
  group("PW");
  infraEdges.push(plate(22, 73, 20, 16));
  building(22, 75.4, 14, 7, 5.6, { louvres: true });
  for (const dx of [-2.3, 2.3]) box(0.35, 3.6, 3.2, 22 + dx, 0.35, 68, mats.concrete); // transformer fire walls
  box(1.2, 0.12, 4, 22, 0.35, 69.9, mats.steel); // cable trench cover to the switchroom
  for (const dx of [-4.6, 0, 4.6]) transformer(22 + dx, 68);
  fence(22, 68, 15.4, 4.4);
  for (const dx of [-4.6, 0, 4.6]) tube([22 + dx, 3.6, 68], [22 + dx, 3.6, 71.9], 0.12, mats.rail, 8); // bus ducts to the switchroom

  // Site road with lane marks, a cable / pipe rack along it and street lights (not pickable).
  newGroup(null);
  const flat = (x: number, z: number, w: number, d: number, y: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.userData.merge = true;
    g.add(m);
  };
  flat(14, 60, 282, 6, 0.04, mats.road);
  flat(-124, 10, 6, 106, 0.04, mats.road);
  flat(152, 22, 6, 82, 0.04, mats.road);
  for (let x = -122; x < 150; x += 4) flat(x, 60, 1.8, 0.14, 0.09, mats.rail);
  for (let x = -90; x <= 110; x += 8) {
    box(0.3, 4.2, 0.3, x, 0.35, 50.6, mats.steel);
    box(0.3, 4.2, 0.3, x, 0.35, 53.2, mats.steel);
    beam([x, 4.55, 50.2], [x, 4.55, 53.6], 0.3, 0.3);
  }
  for (const [dz, r] of [[51, 0.22], [51.7, 0.3], [52.5, 0.18]] as Array<[number, number]>) tube([-90, 4.95 + r, dz], [110, 4.95 + r, dz], r, mats.steel, 10);
  beam([-90, 4.85, 53.1], [110, 4.85, 53.1], 0.8, 0.12, mats.machined); // cable tray
  for (let x = -110; x <= 140; x += 25) {
    cyl(0.12, 7, x, 0.35, 63.6, mats.steel, 8);
    beam([x, 7.3, 63.6], [x, 7.3, 61.6], 0.12, 0.12);
    box(0.7, 0.2, 0.4, x, 7.15, 61.5, mats.machined);
  }

  // Merge every static part per group and material; the merged meshes are what picking hits.
  for (const grp of all) {
    // Building one machine on its own: skip merging (and rims) for everything else.
    if (keep && !keep.has(grp.userData.key)) {
      grp.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      grp.clear();
      continue;
    }
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
    for (const [mat, geos] of buckets) {
      const merged = mergeGeometries(geos, false);
      for (const gg of geos) gg.dispose();
      if (!merged) continue;
      const m = new THREE.Mesh(merged, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      grp.add(m);
      if (grp.userData.key) pickables.push(m);
      // Machine-kit rim: hard edges only (smooth cylinder walls stay clean); none on rails, process material or road.
      if (mat !== mats.rail && mat !== mats.material && mat !== mats.road && mat !== mats.bolt) grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(merged, 35), edgeMat));
    }
  }

  // Dashed runs on the ground: data from the gateway, power from the substation.
  const dashed = (pts: Array<[number, number]>, gap: number, list: THREE.LineDashedMaterial[]) => {
    const geo = new THREE.BufferGeometry().setFromPoints(pts.map(([x, z]) => new THREE.Vector3(x, 0.25, z)));
    const mat = new THREE.LineDashedMaterial({ color: 0x888888, dashSize: 1.2, gapSize: gap });
    const l = new THREE.Line(geo, mat);
    l.computeLineDistances();
    scene.add(l);
    list.push(mat);
  };
  /** Where each run meets the machine area (x, z on its road-side edge). */
  const spurs: Record<MachineKey, [number, number]> = {
    FSL: [-100, 36],
    KFS: [-65.5, 17],
    PHC: [-46, 7],
    KLN: [-1.5, 10],
    BRN: [33, -12],
    CLR: [47, 10.7],
    HMR: [69, 5],
    CSL: [112, 51],
  };
  dashed([[-14, 66.5], [-14, 49.4], [-100, 49.4], [112, 49.4]], 0.7, dataMats);
  for (const k of LINE) dashed([[spurs[k][0], 49.4], [spurs[k][0], spurs[k][1]]], 0.7, dataMats);
  dashed([[22, 65], [22, 48.6], [-66, 48.6], [60, 48.6]], 1.1, powerMats);
  for (const k of ["KFS", "PHC", "KLN", "BRN", "CLR", "HMR"] as MachineKey[]) dashed([[spurs[k][0] + 1, 48.6], [spurs[k][0] + 1, 46.6]], 1.1, powerMats);

  return { groups, edges, infraEdges, pickables, dataMats, powerMats, edgeMat };
}


/** The shared machine-kit materials (colours applied by `applyKitPalette`). */
export function createKitMats(): Mats {
  const mats: Mats = {
    model: new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.12 }),
    steel: new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.3 }),
    shell: new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.18 }),
    machined: new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.6 }),
    recess: new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 }),
    flame: new THREE.MeshStandardMaterial({ roughness: 0.6, emissiveIntensity: 0.9 }),
    plate: new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.1 }),
    concrete: new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 }),
    road: new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 }),
    rail: new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.55 }),
    material: new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 }),
    bolt: new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.5 }),
  };
  for (const m of Object.values(mats)) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = 1;
    m.polygonOffsetUnits = 1;
  }
  return mats;
}

/** Colour the machine-kit materials and the rim lines from the palette. */
export function applyKitPalette(mats: Mats, edgeMat: THREE.LineBasicMaterial, palette: Palette) {
  mats.model.color.set(palette.model);
  mats.steel.color.set(palette.steel);
  mats.shell.color.set(palette.shell);
  mats.machined.color.set(palette.machined);
  mats.recess.color.set(palette.recess);
  mats.flame.color.set(palette.flame);
  mats.flame.emissive.set(palette.flameGlow);
  mats.plate.color.set(palette.plate);
  mats.concrete.color.set(palette.concrete);
  mats.road.color.set(palette.recess);
  mats.rail.color.set(palette.rail);
  mats.material.color.set(palette.flame);
  mats.bolt.color.set(palette.edge);
  edgeMat.color.set(palette.edge);
}

/**
 * One machine of the site on its own: built with the whole plot (machines share
 * coordinates), detached, its area plinth removed, centred on x / z with its
 * foot at y = 0 and scaled to metres (1 unit ≈ 2 m).
 */
export function buildPyroMachine(keys: MachineKey | MachineKey[], mats: Mats): { group: THREE.Group; edgeMat: THREE.LineBasicMaterial; dispose: () => void } {
  const scene = new THREE.Scene();
  const list = Array.isArray(keys) ? keys : [keys];
  const site = buildSite(scene, mats, list);
  // One machine may be several site nodes (feed system: silo + kiln feed), kept in their site positions.
  const g = new THREE.Group();
  for (const key of list) {
    const part = site.groups[key];
    scene.remove(part);
    for (const c of [...part.children]) if (c.userData.plate) part.remove(c);
    g.add(part);
  }
  const box = new THREE.Box3().setFromObject(g);
  const c = box.getCenter(new THREE.Vector3());
  const root = new THREE.Group();
  g.position.set(-c.x, -0.35, -c.z);
  root.add(g);
  root.scale.setScalar(2);
  const dispose = () => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
    });
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
    });
  };
  return { group: root, edgeMat: site.edgeMat, dispose };
}
