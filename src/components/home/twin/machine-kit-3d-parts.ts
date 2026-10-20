/**
 * Generic machine-kit equipment for 3D twins of any plant or machine (the 3D
 * diagram skill, .claude/skills/machine-diagram-3d). Built on `kitBuilder`:
 * every part is added to the builder's current group and merged per material
 * by `finishKitGroup`. Units are metres; y is up, parts stand on `y` (default
 * 0 = floor); x runs along the machine / line (left → right in the drawing),
 * +z faces the viewer (front). Each part takes its centre on the floor (x, z)
 * and its overall size, so a model is built by reading each item's position
 * and size off the source drawing.
 */
import * as THREE from "three";
import type { Kit, KitMats, KV3 } from "./machine-kit-3d";

type Axis = "x" | "z";

export function kitParts(k: Kit, mats: KitMats) {
  /** Concrete plinth / foundation block centred on (x, z). */
  const plinth = (x: number, z: number, w: number, d: number, h = 0.3, y = 0) => {
    k.box(w, h, d, x, y, z, mats.concrete);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.bolt(x + sx * (w / 2 - 0.12), y + h + 0.02, z + sz * (d / 2 - 0.12), "y", 0.03);
    return y + h;
  };

  /** Steel skid / baseplate with anchor bolts. Returns its top height. */
  const skid = (x: number, z: number, w: number, d: number, h = 0.15, y = 0) => {
    k.box(w, h, d, x, y, z, mats.steel);
    k.box(w - 0.06, 0.02, d - 0.06, x, y + h, z, mats.plate);
    const n = Math.max(2, Math.round(w / 0.8) + 1);
    for (let i = 0; i < n; i++) for (const sz of [-1, 1]) k.bolt(x - w / 2 + 0.08 + ((w - 0.16) * i) / (n - 1), y + h + 0.02, z + sz * (d / 2 - 0.06), "y", 0.025);
    return y + h + 0.02;
  };

  /**
   * Vertical vessel — tank, silo, bin, reactor, column, chamber: radius r, total
   * height h (roof to floor, legs included). bottom "cone" makes a hopper bottom;
   * `legs` (m) raises it on four braced legs; `rail` adds a roof handrail and a
   * caged ladder on the +z side. Returns the roof height.
   */
  const tank = ({ x, z, r, h, y = 0, top = "dome", bottom = "flat", legs = 0, rail = false, agitator = false }: { x: number; z: number; r: number; h: number; y?: number; top?: "dome" | "cone" | "flat"; bottom?: "flat" | "cone" | "dish"; legs?: number; rail?: boolean; agitator?: boolean }) => {
    const roofH = top === "dome" ? r * 0.3 : top === "cone" ? r * 0.4 : 0;
    const botH = bottom === "cone" ? Math.min(r * 1.3, (h - legs) * 0.4) : bottom === "dish" ? r * 0.25 : 0;
    const y0 = y + legs;
    const s1 = y + h - roofH;
    if (legs > 0) {
      const a = r * 0.75;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.box(Math.max(0.12, r * 0.08), legs + botH * 0.5, Math.max(0.12, r * 0.08), x + sx * a, y, z + sz * a, mats.steel);
      for (const sz of [-1, 1]) {
        k.beam([x - a, y + 0.3, z + sz * a], [x + a, y + legs * 0.9, z + sz * a], 0.06, 0.06);
        k.beam([x + a, y + 0.3, z + sz * a], [x - a, y + legs * 0.9, z + sz * a], 0.06, 0.06);
      }
      for (const sx of [-1, 1]) k.beam([x + sx * a, y + legs * 0.5, z - a], [x + sx * a, y + legs * 0.5, z + a], 0.06, 0.06);
      k.ring(r * 1.02, Math.max(0.05, r * 0.04), x, y0 + botH, z, "y", mats.steel);
    } else if (y === 0) plinth(x, z, r * 2.3, r * 2.3, 0.25);
    const base = legs > 0 || y > 0 ? y0 : y0 + 0.25;
    if (bottom === "cone") {
      k.cone(Math.max(0.12, r * 0.18), r, botH, x, base, z, mats.shell);
      k.cyl(Math.max(0.1, r * 0.16), 0.25, x, base - 0.25, z, mats.machined, 18);
    } else if (bottom === "dish") k.cone(r * 0.7, r, botH, x, base, z, mats.shell);
    const sb = bottom === "flat" ? base : base + botH;
    k.cyl(r, s1 - sb, x, sb, z, mats.shell, 40);
    for (let yy = sb + 1.5; yy < s1 - 0.3; yy += 1.5) k.ring(r + 0.01, Math.max(0.015, r * 0.012), x, yy, z, "y", mats.model, 40);
    k.ring(r + 0.03, Math.max(0.03, r * 0.025), x, sb + 0.05, z, "y", mats.machined, 40);
    if (top === "dome") {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.shell);
      m.scale.y = roofH / r;
      m.position.set(x, s1, z);
      k.add(m);
    } else if (top === "cone") k.cone(r, r * 0.15, roofH, x, s1, z, mats.shell, 40);
    else k.cyl(r + 0.04, 0.08, x, s1, z, mats.machined, 40);
    const roof = s1 + roofH;
    // manhole and nozzles
    k.disc(Math.min(0.3, r * 0.25), 0.08, x, sb + Math.min(1.0, (s1 - sb) * 0.3), z + r + 0.03, "z", mats.machined, 20);
    k.cyl(Math.min(0.12, r * 0.08), 0.25, x + r * 0.5, s1 + roofH * 0.4, z, mats.machined, 14);
    if (agitator) {
      k.cyl(r * 0.2, 0.15, x, roof, z, mats.steel, 20);
      k.cyl(r * 0.14, r * 0.35, x, roof + 0.15, z, mats.model, 20);
      k.cyl(r * 0.16, r * 0.3, x, roof + 0.15 + r * 0.35, z, mats.model, 20);
    }
    if (rail) {
      k.railRing(x, z, r * 0.95, top === "flat" ? s1 + 0.08 : s1 + roofH * 0.5);
      k.ladder(x + r * 0.35, z + r + 0.25, base + 0.3, s1 + 0.1, 1);
    }
    return roof;
  };

  /** Horizontal vessel — drum, receiver, boiler, heat-exchanger shell — on two saddles, axis along x or z. */
  const hvessel = ({ x, z, r, len, y = 0, axis = "x", saddles = true, heads = true }: { x: number; z: number; r: number; len: number; y?: number; axis?: Axis; saddles?: boolean; heads?: boolean }) => {
    const cy = y + (saddles ? r * 0.55 : 0) + r;
    const along = (t: number): [number, number] => (axis === "x" ? [x + t, z] : [x, z + t]);
    k.disc(r, len, x, cy, z, axis, mats.shell, 36);
    if (heads)
      for (const s of [-1, 1]) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.shell);
        m.scale.y = 0.35;
        const [px, pz] = along((s * len) / 2);
        m.position.set(px, cy, pz);
        if (axis === "x") m.rotation.z = -s * (Math.PI / 2);
        else m.rotation.x = s * (Math.PI / 2);
        k.add(m);
      }
    for (const t of [-len / 3, len / 3]) {
      const [px, pz] = along(t);
      k.ring(r + 0.01, Math.max(0.02, r * 0.02), px, cy, pz, axis, mats.model, 36);
    }
    if (saddles)
      for (const t of [-len * 0.3, len * 0.3]) {
        const [px, pz] = along(t);
        const [w, d] = axis === "x" ? [r * 0.3, r * 1.7] : [r * 1.7, r * 0.3];
        k.box(w, r * 0.95, d, px, y, pz, mats.steel);
        k.box(w * 1.6, 0.05, d * 1.05, px, y, pz, mats.plate);
      }
    k.cyl(Math.min(0.15, r * 0.15), r * 0.35, x, cy + r * 0.92, z, mats.machined, 14);
    return cy;
  };

  /** Square hopper / chute: top w × d at height yTop, outlet o × o at the bottom (h below). */
  const hopper = (x: number, z: number, w: number, d: number, h: number, yTop: number, o = 0.3) => {
    const geo = new THREE.CylinderGeometry(Math.SQRT1_2, (o / Math.max(w, d)) * Math.SQRT1_2, 1, 4, 1);
    geo.rotateY(Math.PI / 4);
    const m = new THREE.Mesh(geo, mats.shell);
    m.scale.set(w, h, d);
    m.position.set(x, yTop - h / 2, z);
    k.add(m);
    k.box(w + 0.1, 0.08, d + 0.1, x, yTop - 0.04, z, mats.machined);
    k.box(o + 0.06, 0.12, o + 0.06, x, yTop - h - 0.12, z, mats.machined);
  };

  /** Cyclone: cylinder + cone + dip pipe, gas outlet on top, tangential inlet duct toward `inlet`. Stands on its own support ring legs from y. */
  const cyclone = ({ x, z, r, h, y = 0, inlet = "-x" }: { x: number; z: number; r: number; h: number; y?: number; inlet?: "-x" | "x" | "-z" | "z" }) => {
    const dip = h * 0.12;
    const coneH = h * 0.45;
    const cylH = h * 0.33;
    const y1 = y + dip;
    k.cyl(r * 0.18, dip, x, y, z, mats.machined, 16);
    k.cone(r * 0.2, r, coneH, x, y1, z, mats.shell, 32);
    k.cyl(r, cylH, x, y1 + coneH, z, mats.shell, 32);
    k.ring(r + 0.02, Math.max(0.03, r * 0.03), x, y1 + coneH, z, "y", mats.machined, 32);
    const top = y1 + coneH + cylH;
    k.cyl(r * 0.5, h - dip - coneH - cylH, x, top, z, mats.shell, 24);
    k.ring(r * 0.5 + 0.02, Math.max(0.025, r * 0.03), x, top + 0.05, z, "y", mats.machined, 24);
    const iw = r * 0.7;
    const ih = cylH * 0.6;
    const L = r * 1.4;
    const yy = top - ih - cylH * 0.1;
    if (inlet === "-x" || inlet === "x") {
      const s = inlet === "x" ? 1 : -1;
      k.box(L, ih, iw, x + s * (L / 2 + r * 0.3), yy, z + r - iw / 2, mats.shell);
    } else {
      const s = inlet === "z" ? 1 : -1;
      k.box(iw, ih, L, x + r - iw / 2, yy, z + s * (L / 2 + r * 0.3), mats.shell);
    }
    return top + (h - dip - coneH - cylH);
  };

  /** Steel stack on a concrete base with stiffener bands, a platform with rail and a ladder. */
  const stack = (x: number, z: number, r: number, h: number) => {
    k.cyl(r * 1.5, 0.6, x, 0, z, mats.concrete, 32);
    k.cone(r * 1.2, r, h * 0.1, x, 0.6, z, mats.shell, 32);
    k.cyl(r, h * 0.9 - 0.6, x, 0.6 + h * 0.1, z, mats.shell, 32);
    for (let yy = 3; yy < h - 1; yy += 3) k.ring(r + 0.03, 0.05, x, yy, z, "y", mats.steel, 32);
    k.cyl(r + 0.1, 0.4, x, h - 0.4, z, mats.machined, 32);
    k.ring(r + 0.6, 0.15, x, h * 0.8, z, "y", mats.steel, 32);
    k.railRing(x, z, r + 0.8, h * 0.8 + 0.1);
    k.ladder(x, z + r + 0.25, 0.6, h * 0.8, 1);
  };

  /** Gas cylinder (bottle) with neck ring, valve and regulator. */
  const gasCylinder = (x: number, z: number, r = 0.12, h = 1.5) => {
    k.cyl(r, h - r, x, 0, z, mats.shell, 24);
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.shell);
    m.position.set(x, h - r, z);
    k.add(m);
    k.cyl(r * 0.3, 0.08, x, h - 0.02, z, mats.machined, 12);
    k.disc(r * 0.35, 0.06, x, h + 0.12, z + r * 0.3, "z", mats.machined, 16);
  };

  /** Gear reducer box: ribbed housing, split line with bolts, breather, input / output shafts along `axis`. Returns the shaft height. */
  const gearbox = (x: number, z: number, w: number, h: number, d: number, y = 0, axis: Axis = "x") => {
    const [bw, bd] = axis === "x" ? [w, d] : [d, w];
    k.box(bw, h, bd, x, y, z, mats.model);
    k.box(bw + 0.04, 0.05, bd + 0.04, x, y + h * 0.55, z, mats.machined);
    for (let i = 0; i < 4; i++) {
      const t = -0.35 + i * 0.23;
      if (axis === "x") k.box(0.03, h * 0.5, bd + 0.06, x + t * bw, y + 0.04, z, mats.model);
      else k.box(bw + 0.06, h * 0.5, 0.03, x, y + 0.04, z + t * bd, mats.model);
    }
    k.cyl(0.03, 0.12, x, y + h, z, mats.machined, 10);
    const sy = y + h * 0.4;
    const sr = Math.min(h, d) * 0.08;
    k.disc(sr, 0.35, axis === "x" ? x - w / 2 - 0.15 : x, sy, axis === "z" ? z - w / 2 - 0.15 : z, axis, mats.machined, 16);
    k.disc(sr * 1.6, 0.35, axis === "x" ? x + w / 2 + 0.15 : x, sy + h * 0.15, axis === "z" ? z + w / 2 + 0.15 : z, axis, mats.machined, 16);
    k.box(bw * 1.08, 0.06, bd * 1.08, x, y, z, mats.steel);
    return sy;
  };

  /** Plummer-block bearing on a shaft at height cy, shaft along `axis`. */
  const bearing = (x: number, z: number, cy: number, r: number, axis: Axis = "x", y = 0) => {
    const [w, d] = axis === "x" ? [r * 1.6, r * 3.2] : [r * 3.2, r * 1.6];
    k.box(w, cy - y - r * 0.6, d, x, y, z, mats.model);
    k.disc(r * 1.25, axis === "x" ? r * 1.4 : r * 1.4, x, cy, z, axis, mats.model, 24);
    k.box(axis === "x" ? r * 1.4 : r * 3.6, 0.04, axis === "x" ? r * 3.6 : r * 1.4, x, cy - 0.02, z, mats.machined);
  };

  /**
   * Centrifugal fan set along x: volute casing (axis z… impeller faces +z),
   * outlet rising on the `outlet` side, bearing pedestal, coupling, motor and a
   * skid. (x, z) is the volute centre on the floor; r the volute radius.
   * Returns the outlet top centre.
   */
  const fanSet = ({ x, z, r, outlet = "-x", motorSide = "x", y = 0 }: { x: number; z: number; r: number; outlet?: "-x" | "x"; motorSide?: "x" | "-x"; y?: number }) => {
    const width = r * 0.75;
    const len = r * 4.2;
    const ms = motorSide === "x" ? 1 : -1;
    const top = skid(x + ms * len * 0.35, z, len, r * 1.4, 0.18, y);
    const cy = top + r * 1.1;
    // volute: spiral scroll casing extruded across the impeller width, outlet rising tangentially
    const os = outlet === "x" ? -1 : 1; // spiral hand: outlet on -x for os = 1
    const r0 = r * 0.78;
    const H = r * 1.25;
    const shape = new THREE.Shape();
    shape.moveTo(0, H);
    shape.lineTo(0, r0);
    for (let a = -90; a <= 180; a += 7.5) {
      const rr = r0 + ((r - r0) * (a + 90)) / 270;
      const t = (a * Math.PI) / 180;
      shape.lineTo(os * rr * Math.cos(t), -rr * Math.sin(t));
    }
    shape.lineTo(-os * r, H);
    shape.closePath();
    const vgeo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, curveSegments: 4 });
    vgeo.translate(0, 0, -width / 2);
    const vol = new THREE.Mesh(vgeo, mats.model);
    vol.position.set(x, cy, z);
    k.add(vol);
    for (const side of [-1, 1]) {
      k.ring(r * 0.52, 0.035, x, cy, z + side * (width / 2 + 0.02), "z", mats.machined, 32); // inlet ring / bearing-side ring
      k.boltCircle(x, cy, z + side * (width / 2 + 0.01), r * 0.62, 12, "z", 0.022);
    }
    k.disc(r * 0.45, 0.04, x, cy, z + width / 2 + 0.03, "z", mats.recess, 32); // inlet eye (front)
    k.disc(r * 0.42, r * 0.22, x, cy, z + width / 2 + r * 0.11, "z", mats.shell, 28); // inlet bell
    const ox = x - os * r * 0.5;
    k.box(r * 1.08, 0.07, width + 0.14, ox, cy + H, z, mats.machined); // outlet flange
    k.panel("+z", ox - r * 0.3, ox + r * 0.3, cy + r * 0.3, cy + r * 0.9, z - width / 2, z + width / 2, 0.06); // inspection door
    k.box(r * 1.2, r * 0.6, width * 1.1, x, top, z, mats.steel); // volute saddle
    // shaft, bearings, coupling, motor along +x (or -x)
    const shaftZ = z;
    const b1 = x + ms * r * 1.3;
    const b2 = x + ms * r * 1.9;
    k.disc(0.05 + r * 0.04, r * 2.2, x + ms * r * 1.4, cy, shaftZ, "x", mats.machined, 16);
    bearing(b1, shaftZ, cy, 0.06 + r * 0.05, "x", top);
    bearing(b2, shaftZ, cy, 0.06 + r * 0.05, "x", top);
    k.disc(r * 0.18, r * 0.2, x + ms * r * 2.3, cy, shaftZ, "x", mats.steel, 20); // coupling
    const mr = r * 0.42;
    const m0 = x + ms * r * 2.45;
    const m1 = m0 + ms * r * 1.5;
    k.box(Math.abs(m1 - m0) * 0.8, cy - mr - top, mr * 1.6, (m0 + m1) / 2, top, shaftZ, mats.steel); // motor stool
    k.motor(Math.min(m0, m1), Math.max(m0, m1), cy, shaftZ, mr, ms > 0 ? -1 : 1);
    return [ox, cy + H + 0.07, z] as KV3;
  };

  /** End-suction centrifugal pump set along x on a skid: volute, discharge up, bearing frame, coupling, motor. Returns the discharge top. */
  const pumpSet = ({ x, z, len = 1.6, y = 0 }: { x: number; z: number; len?: number; y?: number }) => {
    const top = skid(x, z, len, len * 0.35, 0.12, y);
    const r = len * 0.12;
    const cy = top + r * 1.6;
    const px = x - len / 2 + r * 1.2;
    k.disc(r, r * 0.8, px, cy, z, "x", mats.model, 28);
    k.disc(r * 0.5, r * 0.5, px - r * 0.6, cy, z, "x", mats.machined, 20); // suction
    k.cyl(r * 0.3, r * 1.4, px, cy + r * 0.6, z, mats.machined, 16); // discharge
    k.cyl(r * 0.42, 0.05, px, cy + r * 2, z, mats.machined, 18);
    k.box(r * 1.2, cy - r - top, r * 1.4, px, top, z, mats.steel);
    k.disc(r * 0.45, len * 0.2, px + r * 0.4 + len * 0.1, cy, z, "x", mats.model, 18); // bearing frame
    k.disc(r * 0.35, len * 0.06, px + r * 0.4 + len * 0.23, cy, z, "x", mats.steel, 18); // coupling
    k.motor(px + r * 0.4 + len * 0.28, x + len / 2 - 0.05, cy, z, r * 0.9, -1);
    return [px, cy + r * 2, z] as KV3;
  };

  /** Electrical / control cabinet or generator: plinth, body, door panels with handles, louvres, screen, facing `face`. */
  const cabinet = ({ x, z, w, h, d, doors = 1, screen = false, face = "+z" }: { x: number; z: number; w: number; h: number; d: number; doors?: number; screen?: boolean; face?: "+z" | "-z" | "+x" | "-x" }) => {
    const along = face[1] === "z";
    const [bw, bd] = along ? [w, d] : [d, w];
    k.box(bw - 0.04, 0.1, bd - 0.04, x, 0, z, mats.steel);
    k.box(bw, h - 0.1, bd, x, 0.1, z, mats.model);
    const x0 = x - bw / 2, x1 = x + bw / 2, z0 = z - bd / 2, z1 = z + bd / 2;
    const dw = w / doors;
    for (let i = 0; i < doors; i++) {
      const a = -w / 2 + i * dw;
      if (along) {
        k.panel(face as "+z" | "-z", x + a + 0.02, x + a + dw - 0.02, 0.15, h - 0.05, z0, z1, 0.05);
        const zf = face === "+z" ? z1 + 0.03 : z0 - 0.03;
        k.box(0.03, 0.18, 0.03, x + a + dw - 0.08, h * 0.5, zf, mats.machined);
        for (let yy = 0.3; yy < 0.55; yy += 0.04) k.box(dw * 0.5, 0.012, 0.02, x + a + dw / 2, yy, zf, mats.recess);
      } else {
        k.panel(face as "+x" | "-x", x0, x1, 0.15, h - 0.05, z + a + 0.02, z + a + dw - 0.02, 0.05);
        const xf = face === "+x" ? x1 + 0.03 : x0 - 0.03;
        k.box(0.03, 0.18, 0.03, xf, h * 0.5, z + a + dw - 0.08, mats.machined);
      }
    }
    if (screen) {
      if (along) k.box(Math.min(0.4, w * 0.4), 0.25, 0.02, x - w * 0.15, h * 0.7, face === "+z" ? z1 + 0.04 : z0 - 0.04, mats.recess);
      else k.box(0.02, 0.25, Math.min(0.4, w * 0.4), face === "+x" ? x1 + 0.04 : x0 - 0.04, h * 0.7, z - w * 0.15, mats.recess);
    }
    k.box(bw + 0.04, 0.04, bd + 0.04, x, h, z, mats.steel);
  };

  /** Pulse-jet baghouse: legs, square hoppers with rotary valves, bag housing with panels, clean-air plenum, roof rail. Returns roof height. */
  const baghouse = ({ x, z, w, d, h, hoppers = 3 }: { x: number; z: number; w: number; d: number; h: number; hoppers?: number }) => {
    const legH = h * 0.22;
    const hopH = h * 0.22;
    const bodyH = h * 0.42;
    const plenH = h - legH - hopH - bodyH;
    const hw = w / hoppers;
    for (let i = 0; i <= hoppers; i++)
      for (const s of [-1, 1]) k.box(0.2, legH + hopH, 0.2, x - w / 2 + i * hw, 0, z + s * (d / 2 - 0.1), mats.steel);
    for (let i = 0; i < hoppers; i++) {
      const hx = x - w / 2 + hw * (i + 0.5);
      hopper(hx, z, hw - 0.05, d - 0.05, hopH, legH + hopH, Math.min(0.4, hw * 0.2));
      k.disc(0.18, 0.3, hx, legH - 0.35, z, "z", mats.machined, 18);
    }
    for (let i = 0; i < hoppers; i++) k.beam([x - w / 2 + i * hw, 0.3, z + d / 2], [x - w / 2 + (i + 1) * hw, legH * 0.9, z + d / 2], 0.08, 0.08);
    const b0 = legH + hopH;
    k.box(w, bodyH, d, x, b0, z, mats.model);
    for (let i = 0; i < hoppers; i++) k.panel("+z", x - w / 2 + i * hw + 0.08, x - w / 2 + (i + 1) * hw - 0.08, b0 + 0.15, b0 + bodyH - 0.15, z - d / 2, z + d / 2, 0.12);
    for (let yy = b0 + 0.8; yy < b0 + bodyH; yy += 0.8) k.box(w + 0.05, 0.06, d + 0.05, x, yy, z, mats.steel);
    k.box(w + 0.1, plenH, d + 0.1, x, b0 + bodyH, z, mats.shell);
    const roof = b0 + bodyH + plenH;
    k.box(w + 0.3, 0.08, d + 0.3, x, roof, z, mats.plate);
    k.railRect(x - w / 2 - 0.1, x + w / 2 + 0.1, z - d / 2 - 0.1, z + d / 2 + 0.1, roof + 0.08);
    k.ladder(x + w / 2 - 0.4, z + d / 2 + 0.3, 0, roof, 1);
    return roof;
  };

  /**
   * Rotary drum (kiln, dryer, cooler, mill) along x: shell radius r and length
   * len, centre (x, z), axis height cy; tyres at `tyres` (fractions), each on two
   * support rollers and a concrete pier; optional girth gear at `gear`.
   */
  const drum = ({ x, z, r, len, cy, tyres = [0.2, 0.8], gear }: { x: number; z: number; r: number; len: number; cy: number; tyres?: number[]; gear?: number }) => {
    k.disc(r, len, x, cy, z, "x", mats.shell, 48);
    for (let t = -len / 2 + 2; t < len / 2 - 1; t += 2) k.ring(r + 0.005, 0.02, x + t, cy, z, "x", mats.model, 48);
    for (const f of tyres) {
      const tx = x - len / 2 + len * f;
      k.disc(r * 1.12, r * 0.35, tx, cy, z, "x", mats.machined, 48);
      const rr = r * 0.3;
      const ry = cy - r * 1.12 - rr * 0.6;
      for (const s of [-1, 1]) {
        const rz = z + s * r * 0.75;
        k.disc(rr, r * 0.32, tx, ry, rz, "x", mats.machined, 24);
        k.box(r * 0.5, 0.15, rr * 2.4, tx, ry - rr - 0.2, rz, mats.steel);
      }
      const pierTop = ry - rr - 0.2;
      k.box(r * 0.9, pierTop, r * 2.6, tx, 0, z, mats.concrete);
    }
    if (gear !== undefined) {
      const gx = x - len / 2 + len * gear;
      k.disc(r * 1.25, r * 0.12, gx, cy, z, "x", mats.machined, 64);
      k.ring(r * 1.25, 0.025, gx, cy, z, "x", mats.steel, 64);
    }
  };

  /**
   * Conveyor from a to b (may rise): `belt` (frame, idlers, belt, head / tail
   * pulleys, walkway), `screw` (tube with flanges, drive at a) or `slide` (air
   * slide trough). Trestles drop to the floor every ~4 m.
   */
  const conveyor = (a: KV3, b: KV3, w = 0.8, kind: "belt" | "screw" | "slide" = "belt") => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const L = va.distanceTo(vb);
    const dir = vb.clone().sub(va).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    const at = (t: number, s = 0, up = 0): KV3 => {
      const p = va.clone().addScaledVector(dir, t).addScaledVector(side, s);
      return [p.x, p.y + up, p.z];
    };
    if (kind === "belt") {
      for (const s of [-1, 1]) k.beam(at(0, s * w * 0.55), at(L, s * w * 0.55), 0.06, 0.16);
      k.beam(at(0, 0, 0.12), at(L, 0, 0.12), w, 0.02, mats.recess);
      for (let t = 0.6; t < L - 0.3; t += 1.2) k.tube(at(t, -w * 0.5, 0.06), at(t, w * 0.5, 0.06), 0.05, mats.machined, 10);
      for (const t of [0.15, L - 0.15]) k.tube(at(t, -w * 0.55, 0.05), at(t, w * 0.55, 0.05), 0.15, mats.machined, 18);
      k.beam(at(0.6, 0, 0.17), at(L - 0.6, 0, 0.17), w * 0.6, 0.06, mats.material);
      k.beam(at(0, -(w * 0.55 + 0.4), -0.05), at(L, -(w * 0.55 + 0.4), -0.05), 0.7, 0.04, mats.plate); // walkway
    } else if (kind === "screw") {
      k.tube(a, b, w / 2, mats.shell, 24);
      for (let t = 0; t <= L; t += Math.max(1, L / Math.max(2, Math.round(L / 2)))) {
        const p = at(t);
        const m = new THREE.Mesh(new THREE.TorusGeometry(w / 2 + 0.02, 0.025, 6, 24), mats.machined);
        m.position.set(...p);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        k.add(m);
      }
      // drive at a, on the conveyor axis (screws run along x)
      const s0 = dir.x >= 0 ? -1 : 1;
      k.motor(Math.min(a[0] + s0 * 0.25, a[0] + s0 * 1.25), Math.max(a[0] + s0 * 0.25, a[0] + s0 * 1.25), a[1], a[2], w * 0.35, s0 < 0 ? 1 : -1);
    } else {
      k.beam(at(0, 0, 0), at(L, 0, 0), w, w * 0.5, mats.shell);
      k.beam(at(0, 0, w * 0.5), at(L, 0, w * 0.5), w * 0.9, 0.02, mats.material);
      for (let t = 1; t < L; t += 1.5) k.beam(at(t, 0, -0.01), at(t + 0.05, 0, -0.01), w + 0.06, w * 0.52, mats.machined);
    }
    const n = Math.max(1, Math.round(L / 4));
    for (let i = 0; i <= n; i++) {
      const t = (L * i) / n;
      const p = at(t);
      if (p[1] < 0.5) continue;
      for (const s of [-1, 1]) {
        const q = at(t, s * w * 0.55);
        k.box(0.12, q[1] - 0.05, 0.12, q[0], 0, q[2], mats.steel);
      }
      k.beam(at(t, -w * 0.55, -0.15), at(t, w * 0.55, -0.15), 0.1, 0.1);
    }
  };

  /** Bucket elevator: casing w × d, head with drive at the top (on +x), boot at the floor. */
  const bucketElevator = (x: number, z: number, w: number, d: number, h: number) => {
    k.box(w * 1.3, w * 0.8, d * 1.2, x, 0, z, mats.model); // boot
    k.box(w * 0.42, h - w * 1.8, d, x - w * 0.27, w * 0.8, z, mats.shell);
    k.box(w * 0.42, h - w * 1.8, d, x + w * 0.27, w * 0.8, z, mats.shell);
    for (let yy = w * 0.8 + 2; yy < h - w; yy += 2.4) k.box(w * 1.05, 0.06, d + 0.06, x, yy, z, mats.machined);
    k.box(w * 1.3, w, d * 1.2, x, h - w, z, mats.model); // head
    k.disc(d * 0.6, w * 0.3, x, h - w * 0.5, z, "z", mats.machined, 24);
    gearbox(x + w * 1.2, z, w * 0.7, w * 0.6, d * 0.8, h - w * 0.9, "z");
    k.box(w * 2.4, 0.08, d * 1.8, x + w * 0.6, h - w - 0.1, z, mats.plate);
    k.railRect(x - w * 0.6, x + w * 1.8, z - d * 0.9, z + d * 0.9, h - w - 0.02);
    k.ladder(x - w * 0.7, z + d * 0.6, 0, h - w, 1);
  };

  /**
   * Steel structure (tower / support frame / pipe rack): columns on a grid of
   * `bays` × 1 (or `bays` × `rows`), a grating deck with handrail at each level
   * height, X-bracing on the back and sides, a caged ladder at the front left.
   */
  const frame = ({ x, z, w, d, levels, bays = 2, rows = 1, decks = true }: { x: number; z: number; w: number; d: number; levels: number[]; bays?: number; rows?: number; decks?: boolean }) => {
    const top = Math.max(...levels);
    const cs = Math.min(0.3, Math.max(0.06, Math.min(w / bays, d / rows) * 0.06));
    const bm = cs * 0.8;
    for (let i = 0; i <= bays; i++)
      for (let j = 0; j <= rows; j++) {
        const cx = x - w / 2 + (w * i) / bays;
        const cz = z - d / 2 + (d * j) / rows;
        k.box(cs, top, cs, cx, 0, cz, mats.steel);
        k.box(cs * 2, 0.05, cs * 2, cx, 0, cz, mats.plate);
      }
    const ys = [0, ...levels].sort((p, q) => p - q);
    for (const yy of levels) {
      for (const zz of [z - d / 2, z + d / 2]) k.beam([x - w / 2, yy - bm / 2, zz], [x + w / 2, yy - bm / 2, zz], bm, bm * 1.4);
      for (const xx of [x - w / 2, x + w / 2]) k.beam([xx, yy - bm / 2, z - d / 2], [xx, yy - bm / 2, z + d / 2], bm, bm * 1.4);
      if (decks) {
        k.box(w + 0.1, 0.05, d + 0.1, x, yy, z, mats.plate);
        if (yy > 1.5) k.railRect(x - w / 2, x + w / 2, z - d / 2, z + d / 2, yy + 0.05);
      }
    }
    for (let l = 0; l < ys.length - 1; l++) {
      const [y0, y1] = [ys[l] + bm, ys[l + 1] - bm * 1.5];
      if (y1 - y0 < 0.4) continue;
      for (let i = 0; i < bays; i++) {
        if ((i + l) % 2) continue;
        const xa = x - w / 2 + (w * i) / bays;
        const xb = x - w / 2 + (w * (i + 1)) / bays;
        k.beam([xa, y0, z - d / 2], [xb, y1, z - d / 2], bm * 0.5, bm * 0.5);
        k.beam([xb, y0, z - d / 2], [xa, y1, z - d / 2], bm * 0.5, bm * 0.5);
      }
      for (const xx of [x - w / 2, x + w / 2]) {
        k.beam([xx, y0, z - d / 2], [xx, y1, z + d / 2], bm * 0.5, bm * 0.5);
        k.beam([xx, y0, z + d / 2], [xx, y1, z - d / 2], bm * 0.5, bm * 0.5);
      }
    }
    if (top > 1.5) k.ladder(x - w / 2 + 0.6, z + d / 2 + 0.3, 0, top, 1);
  };

  /** Flanged pipe along a polyline (right-angle runs), radius r, with a flange ring at each end. */
  const pipeRun = (pts: KV3[], r = 0.06, mat = mats.steel) => {
    k.pipe(pts, r, mat);
    for (const [p, q] of [[pts[0], pts[1]], [pts[pts.length - 1], pts[pts.length - 2]]] as Array<[KV3, KV3]>) {
      const dx = Math.abs(q[0] - p[0]);
      const dy = Math.abs(q[1] - p[1]);
      const dz = Math.abs(q[2] - p[2]);
      const axis = dx >= dy && dx >= dz ? "x" : dy >= dz ? "y" : "z";
      k.disc(r * 1.7, Math.max(0.03, r * 0.5), p[0], p[1], p[2], axis, mats.machined, 18);
    }
  };

  /** Pipe supports: a T-post from the floor to height y at each (x, z). */
  const pipeSupports = (points: Array<[number, number]>, y: number) => {
    for (const [px, pz] of points) {
      k.box(0.1, y - 0.06, 0.1, px, 0, pz, mats.steel);
      k.box(0.5, 0.06, 0.1, px, y - 0.06, pz, mats.steel);
    }
  };

  /** Rectangular duct along a polyline (w wide, h tall) with flange frames at each end. */
  const duct = (pts: KV3[], w: number, h: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      const vertical = Math.abs(b[1] - a[1]) > Math.hypot(b[0] - a[0], b[2] - a[2]);
      if (vertical) {
        const yb = Math.min(a[1], b[1]) - h / 2;
        k.box(w, Math.abs(b[1] - a[1]) + h, h, a[0], yb, a[2], mats.shell);
      } else k.beam([a[0], a[1], a[2]], [b[0], b[1], b[2]], w, h, mats.shell);
    }
    for (const p of [pts[0], pts[pts.length - 1]]) k.box(w + 0.12, 0.08, h + 0.12, p[0], p[1] - 0.04, p[2], mats.machined);
  };

  /** In-line valve on a pipe at `at`, pipe along `axis`, pipe radius r: body, flanges, bonnet and handwheel (or actuator). */
  const valve = (at: KV3, axis: "x" | "y" | "z", r: number, actuator = false) => {
    const [x, y, z] = at;
    k.disc(r * 1.5, r * 3, x, y, z, axis === "y" ? "z" : axis, mats.model, 16);
    for (const s of [-1, 1]) {
      const o = s * r * 1.6;
      const [fx, fy, fz] = axis === "x" ? [x + o, y, z] : axis === "z" ? [x, y, z + o] : [x, y + o, z];
      k.disc(r * 1.8, r * 0.35, fx, fy, fz, axis, mats.machined, 16);
    }
    if (axis !== "y") {
      k.cyl(r * 0.4, r * 2.5, x, y + r, z, mats.machined, 10);
      if (actuator) k.cyl(r * 1.4, r * 1.2, x, y + r * 3.5, z, mats.model, 20);
      else k.ring(r * 1.3, r * 0.15, x, y + r * 3.6, z, "y", mats.steel, 20);
    }
  };

  /**
   * Round process chamber (furnace, vacuum / pressure chamber, autoclave,
   * reactor body): shell of radius r from y to y + h with bolted flanges at
   * both ends, a lid, viewports and lifting lugs. `cut` opens the front (+z)
   * so the contents show — draw them inside with `inner` (radius) from `floor`.
   * Returns { floor, inner, top }.
   */
  const chamber = ({ x, z, r, h, y = 0, cut = false, lid = true, viewports = 2 }: { x: number; z: number; r: number; h: number; y?: number; cut?: boolean; lid?: boolean; viewports?: number }) => {
    const t = Math.max(0.02, r * 0.06);
    const open = cut ? Math.PI * 0.62 : 0; // opening angle centred on +z
    const start = cut ? open / 2 : 0;
    const len = Math.PI * 2 - open;
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48, 1, cut, start, len), mats.shell);
    shell.position.set(x, y + h / 2, z);
    k.add(shell);
    if (cut) {
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(r - t, r - t, h, 48, 1, true, start, len), mats.recess);
      inner.position.set(x, y + h / 2, z);
      k.add(inner);
      for (const a of [start, start + len]) k.box(t * 1.2, h, t * 1.2, x + Math.sin(a) * (r - t / 2), y, z + Math.cos(a) * (r - t / 2), mats.machined);
    }
    for (const yy of [y, y + h - 0.06]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.06, 48, 1, cut, start, len), mats.machined);
      ring.position.set(x, yy + 0.03, z);
      k.add(ring);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        if (cut && Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < open / 2) continue;
        k.bolt(x + Math.sin(a) * (r + 0.035), yy + 0.065, z + Math.cos(a) * (r + 0.035), "y", 0.015);
      }
    }
    k.cyl(r - t, t, x, y, z, mats.model, 40); // floor plate
    if (lid) {
      k.cyl(r + 0.05, 0.05, x, y + h, z, mats.machined, 48);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.shell);
      dome.scale.y = 0.22;
      dome.position.set(x, y + h + 0.05, z);
      k.add(dome);
      for (const s of [-1, 1]) k.box(0.05, 0.12, 0.03, x + s * r * 0.6, y + h + 0.05 + r * 0.12, z, mats.steel); // lifting lugs
    }
    for (let i = 0; i < viewports; i++) {
      const a = cut ? Math.PI * 0.5 + i * 0.6 : Math.PI * (0.15 + i * 0.25);
      const vy = y + h * (0.35 + 0.3 * i);
      const vx = x + Math.sin(a) * (r + 0.03);
      const vz = z + Math.cos(a) * (r + 0.03);
      const port = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.12, r * 0.12, 0.06, 20), mats.machined);
      port.position.set(vx, vy, vz);
      port.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)));
      k.add(port);
      const glass = port.clone();
      glass.material = mats.recess;
      glass.scale.set(0.7, 1.2, 0.7);
      k.add(glass);
    }
    return { floor: y + t, inner: r - t, top: y + h + (lid ? 0.05 + r * 0.22 : 0) };
  };

  /** Helical coil (induction coil, heating / cooling coil, spring) around a vertical axis: radius r from y0 to y1, tube radius tr. */
  const coil = (x: number, z: number, r: number, y0: number, y1: number, turns: number, tr = 0.02, mat = mats.machined) => {
    const pts: THREE.Vector3[] = [];
    const n = Math.max(24, Math.round(turns * 32));
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const a = f * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(x + Math.cos(a) * r, y0 + (y1 - y0) * f, z + Math.sin(a) * r));
    }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, tr, 8, false), mat);
    k.add(m);
  };

  /** Field transmitter on a surface point with outward normal (re-export of the kit's). */
  const transmitter = (at: KV3, n: KV3, s = 1) => k.transmitter(at, n, s);

  return { plinth, skid, tank, chamber, coil, hvessel, hopper, cyclone, stack, gasCylinder, gearbox, bearing, fanSet, pumpSet, cabinet, baghouse, drum, conveyor, bucketElevator, frame, pipeRun, pipeSupports, duct, valve, transmitter };
}

export type KitParts = ReturnType<typeof kitParts>;
