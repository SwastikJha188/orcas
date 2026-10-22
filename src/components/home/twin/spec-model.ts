/**
 * Layout (from a diagram spec, see assets/machine-kit/spec) → 3D machine-kit
 * model. The 2D layout is the elevation: x along the machine, y up from the
 * lowest floor, every item centred on z = 0 with a depth from its type; lines
 * run in that plane exactly as routed in 2D, so they clear the equipment in 3D
 * too. Each labelled item is its own clickable part.
 */
import * as THREE from "three";
import type { Kit, KitMats, KV3 } from "./machine-kit-3d";
import { kitParts } from "./machine-kit-3d-parts";
import type { KitModel } from "./models/kit-model";
import { CATALOG } from "@/components/assets/machine-kit/spec/catalog";
import type { LaidItem, Layout, Medium } from "@/components/assets/machine-kit/spec/types";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Pipe radius per medium, metres. */
const PIPE_R: Record<Medium, number> = { material: 0.05, "hot-gas": 0.22, gas: 0.025, air: 0.05, water: 0.04, steam: 0.04, oil: 0.025, vacuum: 0.05, power: 0.03, signal: 0.012 };

export function layoutModel(L: Layout): KitModel {
  const s = L.metresPerUnit || 0.005;
  const X = (x: number) => (x - L.width / 2) * s;
  const Y = (y: number) => (L.ground - y) * s;
  // A part drawn inside a bigger part (a window in a door, a chuck in a window) is a detail on that part's front face.
  const host = new Map<string, LaidItem>();
  for (const it of L.items) {
    const area = it.box.w * it.box.h;
    const ov = (o: LaidItem) => Math.max(0, Math.min(it.box.x + it.box.w, o.box.x + o.box.w) - Math.max(it.box.x, o.box.x)) * Math.max(0, Math.min(it.box.y + it.box.h, o.box.y + o.box.h) - Math.max(it.box.y, o.box.y));
    const h = L.items.filter((o) => o !== it && o.box.w * o.box.h > area * 1.5 && ov(o) >= 0.8 * area).sort((a, b) => a.box.w * a.box.h - b.box.w * b.box.h)[0];
    if (h) host.set(it.id, h);
  }
  const baseDepth = (it: LaidItem) => Math.max(0.15, it.box.w * s * CATALOG[it.type].depth);
  const faceZ = (it: LaidItem): number => {
    const h = host.get(it.id);
    return h ? faceZ(h) + depthOf(h) / 2 + depthOf(it) / 2 : 0;
  };
  const depthOf = (it: LaidItem): number => (host.has(it.id) ? Math.min(baseDepth(it), Math.max(0.03, depthOf(host.get(it.id)!) * 0.12)) : baseDepth(it));
  const dims = (it: LaidItem) => {
    const w = it.box.w * s;
    const h = it.box.h * s;
    return { x0: X(it.box.x), x1: X(it.box.x + it.box.w), cx: X(it.box.x + it.box.w / 2), w, h, yb: Y(it.box.y + it.box.h), yt: Y(it.box.y), d: depthOf(it) };
  };
  const all = L.items.filter((it) => it.type !== "valve");
  const maxD = Math.max(0.5, ...all.map((it) => dims(it).d));
  const minX = Math.min(...all.map((it) => X(it.box.x)));
  const maxX = Math.max(...all.map((it) => X(it.box.x + it.box.w)));
  const maxY = Math.max(...all.map((it) => Y(it.box.y)));

  return {
    id: L.id,
    name: L.name,
    size: [Math.round((maxX - minX) * 100) / 100, Math.round(maxY * 100) / 100, Math.round(maxD * 100) / 100],
    build(k: Kit, mats: KitMats, part: (name: string | null) => void) {
      const p = kitParts(k, mats);

      /** Builds at floor level, then lifts everything it added by dy. */
      const lifted = (dy: number, draw: () => void) => {
        if (Math.abs(dy) < 1e-3) return draw();
        const mark = k.box(0.001, 0.001, 0.001, 0, 0, 0, mats.steel);
        const grp = mark.parent;
        if (!grp) return draw();
        const from = grp.children.indexOf(mark);
        grp.remove(mark);
        draw();
        for (let i = from; i < grp.children.length; i++) grp.children[i].position.y += dy;
      };

      /* upper floors: a slab on columns */
      part(null);
      for (const f of L.floors) {
        if (Math.abs(f.y - L.ground) < 1) continue;
        const fy = Y(f.y);
        const x0 = X(f.x1);
        const x1 = X(f.x2);
        k.box(x1 - x0, 0.2, maxD + 1, (x0 + x1) / 2, fy - 0.2, 0, mats.plate);
        for (let x = x0 + 0.3; x <= x1 - 0.2; x += Math.max(3, (x1 - x0) / 6)) for (const z of [-(maxD + 1) / 2 + 0.15, (maxD + 1) / 2 - 0.15]) k.box(0.25, fy - 0.2, 0.25, x, 0, z, mats.steel);
        k.railRect(x0, x1, -(maxD + 1) / 2, (maxD + 1) / 2, fy);
      }

      /** Builds, then turns everything it added about (cx, cy) in the elevation plane: clockwise as seen from the front. */
      const turned = (deg: number, cx: number, cy: number, draw: () => void) => {
        if (!deg) return draw();
        const mark = k.box(0.001, 0.001, 0.001, 0, 0, 0, mats.steel);
        const grp = mark.parent;
        if (!grp) return draw();
        const from = grp.children.indexOf(mark);
        grp.remove(mark);
        draw();
        const a = (-deg * Math.PI) / 180;
        for (let i = from; i < grp.children.length; i++) {
          const o = grp.children[i];
          const dx = o.position.x - cx;
          const dy = o.position.y - cy;
          o.position.x = cx + dx * Math.cos(a) - dy * Math.sin(a);
          o.position.y = cy + dx * Math.sin(a) + dy * Math.cos(a);
          o.rotation.z += a;
        }
      };

      /** Builds, then moves everything it added forward by dz (details on a host's front face). */
      const shifted = (dz: number, draw: () => void) => {
        if (Math.abs(dz) < 1e-4) return draw();
        const mark = k.box(0.001, 0.001, 0.001, 0, 0, 0, mats.steel);
        const grp = mark.parent;
        if (!grp) return draw();
        const from = grp.children.indexOf(mark);
        grp.remove(mark);
        draw();
        for (let i = from; i < grp.children.length; i++) grp.children[i].position.z += dz;
      };

      const depth = (it: LaidItem): number => (it.on ? 1 + depth(L.items.find((o) => o.id === it.on) ?? { ...it, on: undefined }) : 0);
      for (const it of [...L.items].sort((a, b) => depth(a) - depth(b))) {
        part(it.type === "frame" ? null : (it.label ? titleCase(it.label) : it.id));
        const m = dims(it);
        const floorY = it.floor !== undefined ? Y(it.floor) : it.legs !== undefined ? Y(it.legs) : m.yb;
        // legs / neck
        if (it.legs !== undefined) {
          const lh = m.yb - Y(it.legs);
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.1, lh, 0.1, m.cx + sx * m.w * 0.38, Y(it.legs), sz * m.d * 0.35, mats.steel);
        }
        if (it.neck) {
          const nr = (it.neck.w * s) / 2;
          k.cyl(nr, it.neck.h * s, m.cx, Y(it.neck.y + it.neck.h), 0, mats.shell, 24);
          for (const yy of [Y(it.neck.y + it.neck.h), Y(it.neck.y) - 0.04]) k.cyl(nr * 1.5, 0.04, m.cx, yy, 0, mats.machined, 24);
        }
        const dz = faceZ(it);
        shifted(dz, () => turned(Number(it.options.angle ?? 0), m.cx, m.yb + m.h / 2, () => drawItem(it, m, floorY)));
      }

      /* lines, in the elevation plane */
      part(null);
      for (const l of L.links) {
        const pts: KV3[] = l.pts.map(([x, y]) => [X(x), Y(y), 0]);
        if (pts.length < 2) continue;
        const r = l.duct ? 0.2 : PIPE_R[l.medium];
        if (l.medium === "hot-gas" || l.duct) p.duct(pts, r * 2, r * 2);
        else if (l.medium === "signal" || l.medium === "power" || l.medium === "material") k.pipe(pts, r, l.medium === "material" ? mats.material : mats.steel);
        else p.pipeRun(pts, r, mats.steel);
        for (const v of l.valves) p.valve([X(v.at[0]), Y(v.at[1]), 0], v.vertical ? "y" : "x", Math.max(0.03, r), v.kind === "control" || v.kind === "solenoid");
      }

      /* instruments */
      for (const pt of L.points) {
        const host = L.items.find((it) => it.id === pt.on);
        const front = host ? dims(host).d / 2 : 0;
        const n: KV3 = pt.dir === "up" || pt.dir === "top" ? [0, 1, 0] : pt.dir === "down" || pt.dir === "bottom" ? [0, -1, 0] : pt.dir === "left" ? [-1, 0, 0] : [1, 0, 0];
        const inside = host && pt.mount[0] > host.box.x + 1 && pt.mount[0] < host.box.x + host.box.w - 1 && pt.mount[1] > host.box.y + 1 && pt.mount[1] < host.box.y + host.box.h - 1;
        if (inside) p.transmitter([X(pt.mount[0]), Y(pt.mount[1]), front], [0, 0, 1], 1);
        else p.transmitter([X(pt.mount[0]), Y(pt.mount[1]), 0], n, 1);
      }

      function drawItem(it: LaidItem, m: ReturnType<typeof dims>, floorY: number) {
        const o = it.options;
        const { x0, x1, cx, w, h, yb, d } = m;
        if (it.trace && it.trace.outline.length >= 4) {
          // Its own silhouette, extruded to the item's depth.
          const shape = new THREE.Shape(it.trace.outline.map(([u, v]) => new THREE.Vector2(x0 + u * w, yb + (1 - v) * h)));
          const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
          geo.translate(0, 0, -d / 2);
          k.add(new THREE.Mesh(geo, mats.model));
          return;
        }
        const lift = yb; // height of the item's bottom above the lowest floor
        switch (it.type) {
          case "cabinet":
          case "generator":
            lifted(lift, () => p.cabinet({ x: cx, z: 0, w, h, d, doors: o.doors ?? (w > h * 0.9 ? 2 : 1), screen: it.type === "cabinet" ? o.screen ?? true : false }));
            break;
          case "motor": {
            const r = Math.min(h * 0.4, d * 0.5);
            lifted(lift, () => k.motor(x0, x1, r + h * 0.15, 0, r, o.motor === "left" ? -1 : 1));
            break;
          }
          case "gearbox":
            p.gearbox(cx, 0, w, h * 0.9, d, yb);
            break;
          case "drive":
            lifted(lift, () => {
              p.skid(cx, 0, w, d, 0.12);
              const r = Math.min(h * 0.3, d * 0.4);
              k.motor(x0, x0 + w * 0.45, 0.12 + r * 1.4, 0, r, 1);
              p.gearbox(x0 + w * 0.74, 0, w * 0.44, h * 0.85, d, 0.12);
            });
            break;
          case "pump":
            lifted(lift, () => p.pumpSet({ x: cx, z: 0, len: w }));
            break;
          case "vacuum-pump":
            lifted(lift, () => {
              p.skid(cx, 0, w, d, 0.12);
              const pumpLeft = o.motor !== "left";
              const bx = pumpLeft ? x0 + w * 0.25 : x1 - w * 0.25;
              k.box(w * 0.4, h * 0.8, d * 0.8, bx, 0.12, 0, mats.model);
              for (let i = 0; i < 5; i++) k.box(w * 0.42, 0.02, d * 0.82, bx, 0.12 + h * (0.2 + i * 0.12), 0, mats.steel);
              k.disc(h * 0.14, 0.06, pumpLeft ? x0 + 0.03 : x1 - 0.03, 0.12 + h * 0.45, 0, "x", mats.machined, 18);
              const r = Math.min(h * 0.32, d * 0.4);
              k.motor(pumpLeft ? x0 + w * 0.52 : x0, pumpLeft ? x1 : x0 + w * 0.48, 0.12 + r * 1.3, 0, r, pumpLeft ? -1 : 1);
            });
            break;
          case "fan": {
            const r = w / 4.95;
            const right = o.outlet !== "right";
            lifted(lift, () => p.fanSet({ x: right ? x0 + r : x1 - r, z: 0, r, outlet: o.outlet === "right" ? "x" : "-x", motorSide: right ? "x" : "-x" }));
            break;
          }
          case "compressor":
            lifted(lift, () => {
              p.hvessel({ x: cx, z: 0, r: h * 0.22, len: w });
              k.box(w * 0.36, h * 0.34, d * 0.7, x0 + w * 0.28, h * 0.5, 0, mats.model);
              const r = h * 0.12;
              k.motor(x0 + w * 0.58, x0 + w * 0.92, h * 0.5 + r, 0, r, -1);
            });
            break;
          case "tank":
          case "silo":
          case "mixer":
            p.tank({ x: cx, z: 0, r: w / 2, h, y: floorY < yb - 0.05 && it.legs === undefined ? yb : floorY, top: o.top ?? (it.type === "silo" ? "cone" : "dome"), bottom: o.bottom ?? (it.type === "silo" ? "cone" : it.type === "mixer" ? "dish" : "flat"), legs: it.legs !== undefined ? yb - floorY : it.type === "silo" ? h * 0.2 : 0, rail: h > 4, agitator: it.type === "mixer" });
            break;
          case "hopper":
            p.hopper(cx, 0, w, d, h, yb + h, Math.max(0.15, w * 0.24));
            break;
          case "horizontal-tank":
          case "heat-exchanger":
            p.hvessel({ x: cx, z: 0, r: h * 0.4, len: w, y: yb });
            break;
          case "cyclone":
            p.cyclone({ x: cx, z: 0, r: w / 2, h, y: yb, inlet: o.inlet === "right" ? "x" : "-x" });
            break;
          case "stack":
            lifted(lift, () => p.stack(cx, 0, w / 2, h));
            break;
          case "gas-cylinder":
            lifted(lift, () => p.gasCylinder(cx, 0, w / 2, h));
            break;
          case "chamber": {
            const r = Math.min(w, d * 1.2) / 2;
            const showInside = !!o.contents && o.contents !== "none";
            const c = p.chamber({ x: cx, z: 0, r, h: h * 0.88, y: yb, cut: showInside, lid: !L.items.some((t) => t.on === it.id) });
            if (o.contents === "crucible-coil" || o.contents === "crucible") {
              const cr = c.inner * 0.42;
              const cy0 = c.floor + h * 0.3;
              k.cyl(cr, h * 0.3, cx, cy0, 0, mats.machined, 28);
              k.cyl(cr * 0.85, h * 0.2, cx, cy0 + h * 0.08, 0, mats.material, 24);
              if (o.contents === "crucible-coil") p.coil(cx, 0, cr * 1.3, cy0, cy0 + h * 0.3, 7, Math.max(0.012, r * 0.03), mats.material);
            } else if (o.contents === "flask") {
              k.cyl(c.inner * 0.45, h * 0.42, cx, c.floor + h * 0.12, 0, mats.plate, 28);
              k.cyl(c.inner * 0.6, h * 0.05, cx, c.floor + h * 0.06, 0, mats.machined, 28);
            } else if (o.contents === "bed") k.cyl(c.inner * 0.95, h * 0.15, cx, c.floor, 0, mats.material, 32);
            break;
          }
          case "drum":
            p.drum({ x: cx, z: 0, r: h * 0.25, len: w, cy: yb + h * 0.7, gear: 0.32 });
            break;
          case "conveyor": {
            const up = o.slope === "up";
            const down = o.slope === "down";
            const a: KV3 = [x0, up ? yb + 0.2 : down ? yb + h - 0.2 : yb + h / 2, 0];
            const b: KV3 = [x1, up ? yb + h - 0.2 : down ? yb + 0.2 : yb + h / 2, 0];
            p.conveyor(a, b, clamp(d * 4, 0.5, 1.4), o.kind === "screw" ? "screw" : o.kind === "slide" ? "slide" : "belt");
            break;
          }
          case "bucket-elevator":
            lifted(lift, () => p.bucketElevator(cx, 0, w, w, h));
            break;
          case "filter":
            lifted(lift, () => p.baghouse({ x: cx, z: 0, w, d: w * 0.8, h, hoppers: clamp(Math.round((w / h) * 3), 1, 4) }));
            break;
          case "cooling-unit":
            lifted(lift, () => {
              p.skid(cx, 0, w, d, 0.12);
              k.box(w * 0.4, h * 0.85, d * 0.9, x0 + w * 0.22, 0.12, 0, mats.model);
              k.panel("+z", x0 + w * 0.06, x0 + w * 0.38, h * 0.2, h * 0.75, -d * 0.45, d * 0.45, 0.04);
              p.pumpSet({ x: x0 + w * 0.72, z: 0, len: w * 0.5, y: 0.12 });
            });
            break;
          case "actuator": {
            const r = w * 0.4;
            k.cyl(r, h * 0.56, cx, yb + h * 0.4, 0, mats.shell, 24);
            for (const yy of [yb + h * 0.4, yb + h * 0.94]) k.cyl(r * 1.15, h * 0.06, cx, yy, 0, mats.machined, 24);
            k.cyl(r * 0.25, h * 0.42, cx, yb, 0, mats.machined, 14);
            break;
          }
          case "hydraulic-unit":
            lifted(lift, () => {
              k.box(w, h * 0.5, d, cx, 0.05, 0, mats.model);
              const r = h * 0.14;
              k.motor(x0 + w * 0.06, x0 + w * 0.55, h * 0.55 + r, 0, r, 1);
              k.cyl(w * 0.06, h * 0.3, x0 + w * 0.84, h * 0.55, 0, mats.shell, 16);
            });
            break;
          case "frame": {
            const carried = L.items.filter((t) => t.on === it.id);
            const levels = [...new Set(carried.map((t) => Math.round(Y(t.box.y + t.box.h) * 100) / 100))].filter((v) => v > 0.3);
            p.frame({ x: cx, z: 0, w, d: Math.max(1.5, maxD), levels: levels.length ? levels : [h], bays: clamp(Math.round(w / 3), 1, 6) });
            break;
          }
          case "burner":
            k.disc(h * 0.25, w * 0.86, x0 + w * 0.43, yb + h / 2, 0, "x", mats.shell, 20);
            k.disc(h * 0.32, 0.06, x0 + w * 0.1, yb + h / 2, 0, "x", mats.machined, 20);
            break;
          case "valve":
            p.valve([cx, yb + h / 2, 0], "x", Math.max(0.04, h * 0.2), true);
            break;
          case "rotary-valve":
            k.box(w * 0.75, h, d * 0.8, x0 + w * 0.42, yb, 0, mats.model);
            k.disc(Math.min(w, h) * 0.32, d * 0.85, x0 + w * 0.42, yb + h / 2, 0, "z", mats.machined, 24);
            k.box(w * 0.22, h * 0.3, d * 0.5, x1 - w * 0.11, yb + h * 0.35, 0, mats.model);
            break;
          case "block":
          case "table":
          case "fixture":
            k.box(w, h, d, cx, yb, 0, mats.model);
            if (it.type === "table") k.box(w + 0.04, Math.min(0.06, h * 0.2), d + 0.04, cx, yb + h - Math.min(0.06, h * 0.2), 0, mats.machined);
            break;
          case "cylinder":
            if (!o.horizontal && w < h * 3) k.cyl(w / 2, h, cx, yb, 0, mats.shell, 28);
            else k.disc(h / 2, w, cx, yb + h / 2, 0, "x", mats.shell, 28);
            break;
          case "pile":
            k.cone(w / 2, w * 0.04, h, cx, yb, 0, mats.material, 28);
            break;
          case "wheel":
            k.disc(Math.min(w, h) / 2, Math.max(0.05, d * 0.3), cx, yb + h / 2, 0, "z", mats.machined, 32);
            break;
          case "cone": {
            const n = o.narrow ?? "bottom";
            if (n === "bottom") k.cone(w * 0.16, w / 2, h, cx, yb, 0, mats.shell, 28);
            else if (n === "top") k.cone(w / 2, w * 0.16, h, cx, yb, 0, mats.shell, 28);
            else k.disc(h * 0.35, w, cx, yb + h / 2, 0, "x", mats.shell, 28);
            break;
          }
          case "workpiece":
            k.box(w, h, Math.min(d, w), cx, yb, 0, mats.material);
            break;
          case "tool":
            k.cyl(Math.min(w, h) * 0.2, h * 0.65, cx, yb + h * 0.35, 0, mats.machined, 16);
            k.cyl(w / 2, h * 0.35, cx, yb, 0, mats.steel, 20);
            break;
          default:
            // crusher, press, extruder, screen, machine: body with panel, base and (when given) its motor.
            lifted(lift, () => {
              p.plinth(cx, 0, w + 0.1, d + 0.1, 0.12);
              k.box(w, h - 0.12, d, cx, 0.12, 0, mats.model);
              k.panel("+z", x0 + w * 0.12, x0 + w * 0.55, h * 0.35, h * 0.75, -d / 2, d / 2, 0.05);
              if (it.type === "crusher") p.hopper(cx, 0, w * 0.7, d * 0.8, h * 0.25, h + h * 0.2, w * 0.2);
              if (it.type === "press") k.cyl(w * 0.08, h * 0.3, cx, h * 0.4, 0, mats.machined, 16);
              if (o.motor) {
                const r = Math.min(h * 0.2, d * 0.35);
                k.motor(o.motor === "left" ? x0 - r * 3 : x1, o.motor === "left" ? x0 : x1 + r * 3, r * 1.2, 0, r, o.motor === "left" ? 1 : -1);
              }
            });
        }
      }
    },
  };
}

const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
