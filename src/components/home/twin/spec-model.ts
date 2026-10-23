/**
 * Layout (from a diagram spec, see assets/machine-kit/spec) → 3D machine-kit
 * model. The 2D layout is the elevation: x along the machine, y up from the
 * lowest floor, every item centred on z = 0 with a depth from its type; lines
 * run in that plane exactly as routed in 2D, so they clear the equipment in 3D
 * too. Each labelled item is its own clickable part.
 *
 * A flow diagram (layout.schematic) has no floors: its rows are not heights.
 * There every assembly stands on the ground, the diagram read as a plan (its
 * top row at the back, its bottom row in front), and lines leave their
 * machines upward to a pipe rack that runs the diagram's route in plan.
 */
import * as THREE from "three";
import type { Kit, KitMats, KV3 } from "./machine-kit-3d";
import { kitParts } from "./machine-kit-3d-parts";
import type { KitModel } from "./models/kit-model";
import { CATALOG } from "@/components/assets/machine-kit/spec/catalog";
import type { LaidItem, Layout, Medium } from "@/components/assets/machine-kit/spec/types";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** Items that, in a flow diagram, stand on whatever the image draws right under them. */
const STACKS = ["cyclone", "hopper", "silo", "tank", "chamber", "filter", "mixer", "heat-exchanger", "horizontal-tank", "stack"];

/** Pipe radius per medium, metres. */
const PIPE_R: Record<Medium, number> = { material: 0.05, "hot-gas": 0.22, gas: 0.025, air: 0.05, water: 0.04, steam: 0.04, oil: 0.025, vacuum: 0.05, power: 0.03, signal: 0.012 };

export function layoutModel(L: Layout): KitModel {
  const s = L.metresPerUnit || 0.005;
  const X = (x: number) => (x - L.width / 2) * s;
  // Heights are measured from yRef: the lowest floor, or (flow diagram) the base of the assembly being built.
  let yRef = L.ground;
  const Y = (y: number) => (yRef - y) * s;
  // A part drawn inside a bigger part (a window in a door, a chuck in a window) is a detail on that part's front face.
  const host = new Map<string, LaidItem>();
  for (const it of L.items) {
    const area = it.box.w * it.box.h;
    const ov = (o: LaidItem) => Math.max(0, Math.min(it.box.x + it.box.w, o.box.x + o.box.w) - Math.max(it.box.x, o.box.x)) * Math.max(0, Math.min(it.box.y + it.box.h, o.box.y + o.box.h) - Math.max(it.box.y, o.box.y));
    const h = L.items.filter((o) => o !== it && o.box.w * o.box.h > area * 1.5 && ov(o) >= 0.8 * area).sort((a, b) => a.box.w * a.box.h - b.box.w * b.box.h)[0];
    if (h) host.set(it.id, h);
  }
  // Depth from the width (round vessels are as deep as wide), but never far deeper than the item is tall:
  // a long low machine (a cooler, a conveyor housing) is not a deep slab.
  const baseDepth = (it: LaidItem) => Math.max(0.15, Math.min(it.box.w * s * CATALOG[it.type].depth, Math.max(0.4, it.box.h * s * 1.6)));
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
  // Flow diagram: each assembly drops to the ground (dy) and moves back or forward by its row (dz).
  const plan = !!L.schematic;
  // Assemblies: items touching in the image (layout's group), and — in a flow diagram — items the image
  // draws one above the other with a small gap (cyclones of a preheater tower, fans under a cooler).
  const gParent = new Map<string, string>(L.items.map((it) => [it.id, it.id]));
  const gFind = (id: string): string => (gParent.get(id) === id ? id : gFind(gParent.get(id)!));
  const gUnite = (a: string, b: string) => gParent.set(gFind(a), gFind(b));
  for (const it of L.items) if (it.group && gParent.has(it.group)) gUnite(it.id, it.group);
  if (plan)
    for (const a of L.items)
      for (const b of L.items) {
        if (a === b || a.type === "valve" || b.type === "valve") continue;
        // Only process vessels stack this way (cyclones of a tower, a chamber over its fans); a block or skid drawn
        // above another row of the diagram is just the next row.
        if (!STACKS.includes(a.type)) continue;
        // a above b
        const gap = b.box.y - (a.box.y + a.box.h);
        if (gap < -2 || gap > 0.9 * Math.min(a.box.h, b.box.h)) continue;
        const ox = Math.max(0, Math.min(a.box.x + a.box.w, b.box.x + b.box.w) - Math.max(a.box.x, b.box.x));
        if (ox >= 0.5 * Math.min(a.box.w, b.box.w)) gUnite(a.id, b.id);
      }
  const groupKey = (it: LaidItem) => gFind(it.id);
  const groupBottom = new Map<string, number>();
  for (const it of L.items) {
    const g = groupKey(it);
    groupBottom.set(g, Math.max(groupBottom.get(g) ?? -Infinity, it.box.y + it.box.h));
  }
  const Zrow = (y: number) => (y - L.height / 2) * s;
  const placeOf = (bottomY: number) => (plan ? { ref: bottomY, dz: Zrow(bottomY) } : { ref: L.ground, dz: 0 });
  /** Height above the ground of sheet y on an item standing at base `ref`. */
  const H = (y: number, ref: number) => (ref - y) * s;
  const placeItem = (it: LaidItem) => placeOf(groupBottom.get(groupKey(it)) ?? it.box.y + it.box.h);
  const maxY = Math.max(...all.map((it) => H(it.box.y, placeItem(it).ref)));

  return {
    id: L.id,
    name: L.name,
    size: [Math.round((maxX - minX) * 100) / 100, Math.round(maxY * 100) / 100, Math.round((plan ? L.height * s + maxD : maxD) * 100) / 100],
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

      /* machines drawn from their own picture: the traced areas extruded into a relief (raised parts proud, openings inset) */
      const tracedGroups = (L.traced ?? []).filter((g) => g.art && g.art.regions.length);
      const tracedIds = new Set(tracedGroups.flatMap((g) => g.ids));
      for (const g of tracedGroups) {
        const lab = g.ids.map((id) => L.items.find((it) => it.id === id)?.label).find(Boolean);
        part(lab ? titleCase(lab) : g.key);
        const gp = placeOf(g.box.y + g.box.h);
        yRef = gp.ref;
        shifted(gp.dz, () => tracedBody(g));
        yRef = L.ground;
      }
      function tracedBody(g: (typeof tracedGroups)[number]) {
        // One solid body from the machine's silhouette; its parts sit on the front and back faces as plates
        // (raised, proud of the face) and panels (openings, a little inset in a dark finish), as the
        // hand-made models carry their doors and covers. Depth from the machine's own size.
        const D = Math.max(0.25, Math.min(g.box.w, g.box.h) * s * 0.42);
        const toXY = (u: number, v: number) => new THREE.Vector2(X(g.box.x + (u / 1000) * g.box.w), Y(g.box.y + (v / 1000) * g.box.h));
        const plate: Record<string, { t: number; mat: THREE.Material }> = {
          raised: { t: D * 0.06, mat: mats.machined },
          shaft: { t: D * 0.05, mat: mats.steel },
          material: { t: D * 0.04, mat: mats.material },
          recess: { t: D * 0.012, mat: mats.recess },
          body: { t: D * 0.025, mat: mats.model },
        };
        const extrude = (d: string, z0: number, depth: number, mat: THREE.Material) => {
          // one silhouette slab per outline
          for (const shape of svgShapes(d, toXY)) {
            const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
            geo.translate(0, 0, z0);
            k.add(new THREE.Mesh(geo, mat));
          }
        };
        // A thin core joins the parts; each part is as deep as it is wide (a handle is a rod, a base a deep slab),
        // capped at the machine's depth, with its finish from its tone.
        for (const d of g.art!.silhouette) extrude(d, -D * 0.25, D * 0.5, mats.model);
        for (const r of g.art!.regions) {
          const pl = plate[r.tone] ?? plate.body;
          const shapes = svgShapes(r.d, toXY);
          for (const shape of shapes) {
            const pts = shape.getPoints();
            const xs = pts.map((p) => p.x);
            const wid = Math.max(...xs) - Math.min(...xs);
            const dd = Math.min(D, Math.max(D * 0.5, wid)) + (r.tone === "recess" ? -D * 0.04 : pl.t);
            const geo = new THREE.ExtrudeGeometry(shape, { depth: dd, bevelEnabled: false, curveSegments: 1 });
            geo.translate(0, 0, -dd / 2);
            k.add(new THREE.Mesh(geo, pl.mat));
          }
        }
      }

      /* flow diagram: a steel structure carries the items of an assembly that stand above the ground with nothing under them */
      if (plan) {
        part(null);
        const groups = new Map<string, LaidItem[]>();
        for (const it of L.items) if (it.type !== "valve") groups.set(groupKey(it), [...(groups.get(groupKey(it)) ?? []), it]);
        for (const [g, ws] of groups) {
          const base = groupBottom.get(g)!;
          const below = (it: LaidItem) => {
            const b = it.box.y + it.box.h;
            return ws.filter((o) => o !== it && o.box.y >= b - 2 && Math.min(o.box.x + o.box.w, it.box.x + it.box.w) - Math.max(o.box.x, it.box.x) > 0.3 * it.box.w).sort((a, c) => a.box.y - c.box.y)[0];
          };
          const floating = ws.filter((it) => {
            const b = it.box.y + it.box.h;
            // Long horizontal machines (kiln, cooler) carry themselves on piers; only upright ones get a structure.
            if ((base - b) * s < 0.4 || it.box.w > 2.2 * it.box.h || ["actuator", "burner", "tool", "conveyor", "drum", "valve"].includes(it.type)) return false;
            const u = below(it);
            if (!u) return true;
            // Mounted on a kiln, conveyor or stack: carried by it.
            if (["drum", "conveyor", "stack", "bucket-elevator", "frame"].includes(u.type)) return false;
            return u.box.y - b >= 4;
          });
          // One structure per column of raised items (a cyclone string), as tight as the column.
          const cols: LaidItem[][] = [];
          for (const it of [...floating].sort((a, c) => a.box.x - c.box.x)) {
            const c = cols.find((cl) => cl.some((o) => Math.min(o.box.x + o.box.w, it.box.x + it.box.w) - Math.max(o.box.x, it.box.x) > 0.3 * Math.min(o.box.w, it.box.w)));
            if (c) c.push(it);
            else cols.push([it]);
          }
          for (const col of cols) {
            const x0 = Math.min(...col.map((it) => it.box.x));
            const x1 = Math.max(...col.map((it) => it.box.x + it.box.w));
            const levels = [...new Set(col.map((it) => Math.round(H(it.box.y + it.box.h, base) * 100) / 100))];
            const d = Math.max(1, ...col.map((it) => dims(it).d)) * 1.15;
            const w = (x1 - x0) * s * 1.1;
            shifted(Zrow(base), () => p.frame({ x: X((x0 + x1) / 2), z: 0, w, d, levels, bays: clamp(Math.round(w / 3), 1, 4) }));
          }
        }
      }

      const depth = (it: LaidItem): number => (it.on ? 1 + depth(L.items.find((o) => o.id === it.on) ?? { ...it, on: undefined }) : 0);
      for (const it of [...L.items].sort((a, b) => depth(a) - depth(b)).filter((it) => !tracedIds.has(it.id))) {
        part(it.type === "frame" ? null : (it.label ? titleCase(it.label) : it.id));
        const ip = placeItem(it);
        yRef = ip.ref;
        shifted(ip.dz, () => buildItem(it));
        yRef = L.ground;
      }
      function buildItem(it: LaidItem) {
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

      /* lines, in the elevation plane (a flow diagram: on a pipe rack, in plan) */
      part(null);
      const byIdIt = new Map(L.items.map((it) => [it.id, it]));
      /** Plan route: up from the source to the rack, along the diagram's route, down into the target. */
      const rackRoute = (l: (typeof L.links)[number], r: number): { pts: KV3[]; rack: number } => {
        const A = byIdIt.get(l.from);
        const B = byIdIt.get(l.to);
        const pa = A ? placeItem(A) : placeOf(L.ground);
        const pb = B ? placeItem(B) : placeOf(L.ground);
        const p0 = l.pts[0];
        const pn = l.pts[l.pts.length - 1];
        const ea: KV3 = [X(p0[0]), Math.max(0.05, H(p0[1], pa.ref)), pa.dz];
        const eb: KV3 = [X(pn[0]), Math.max(0.05, H(pn[1], pb.ref)), pb.dz];
        // A pipe rack at a working height: a line leaving the top of a tall silo drops to it instead of running across the sky.
        const lift = Math.max(0.3, r * 3);
        const rack = Math.min(Math.max(ea[1], eb[1]) + lift, Math.max(Math.min(ea[1], eb[1]) + lift, 3.5));
        const out: KV3[] = [ea, [ea[0], rack, ea[2]], [ea[0], rack, Zrow(p0[1])]];
        for (const [x, y] of l.pts.slice(1, -1)) out.push([X(x), rack, Zrow(y)]);
        out.push([eb[0], rack, Zrow(pn[1])], [eb[0], rack, eb[2]], eb);
        const pts: KV3[] = [];
        for (const q of out) {
          const last = pts[pts.length - 1];
          if (last && Math.hypot(q[0] - last[0], q[1] - last[1], q[2] - last[2]) < 0.01) continue;
          // drop the middle of three collinear points
          if (pts.length >= 2) {
            const a = pts[pts.length - 2];
            const u = [last[0] - a[0], last[1] - a[1], last[2] - a[2]];
            const v = [q[0] - last[0], q[1] - last[1], q[2] - last[2]];
            const cr = Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
            if (cr < 1e-6 && u[0] * v[0] + u[1] * v[1] + u[2] * v[2] > 0) pts.pop();
          }
          pts.push(q);
        }
        return { pts, rack };
      };
      for (const l of L.links) {
        const r = l.duct ? 0.2 : PIPE_R[l.medium];
        if (plan && l.pts.length >= 2) {
          const { pts, rack } = rackRoute(l, r);
          if (pts.length < 2) continue;
          if (l.medium === "hot-gas" || l.duct) p.duct(pts, r * 2, r * 2);
          else if (l.medium === "material") k.pipe(pts, r, mats.material);
          else if (l.medium === "signal" || l.medium === "power") k.pipe(pts, Math.max(0.02, r), mats.steel);
          else p.pipeRun(pts, r, mats.steel);
          // Rack posts under long pipe runs (cables and signal lines ride along without posts of their own).
          const sup: Array<[number, number]> = [];
          for (let i = 0; i < pts.length - 1 && l.medium !== "signal" && l.medium !== "power"; i++) {
            const [a, b] = [pts[i], pts[i + 1]];
            if (Math.abs(a[1] - rack) > 0.01 || Math.abs(b[1] - rack) > 0.01) continue;
            const L2 = Math.hypot(b[0] - a[0], b[2] - a[2]);
            for (let t = 2; t < L2 - 1; t += 6) sup.push([a[0] + ((b[0] - a[0]) * t) / L2, a[2] + ((b[2] - a[2]) * t) / L2]);
          }
          if (sup.length && rack > 0.5) p.pipeSupports(sup, rack - r);
          for (const v of l.valves) p.valve([X(v.at[0]), rack, Zrow(v.at[1])], v.vertical ? "z" : "x", Math.max(0.03, r), v.kind === "control" || v.kind === "solenoid");
          continue;
        }
        const pts: KV3[] = l.pts.map(([x, y]) => [X(x), Y(y), 0]);
        if (pts.length < 2) continue;
        if (l.medium === "hot-gas" || l.duct) p.duct(pts, r * 2, r * 2);
        else if (l.medium === "signal" || l.medium === "power") {
          // Cables run in thin conduit along their route (trays with posts on every run cluttered the model).
          k.pipe(pts, Math.max(0.015, r), mats.steel);
        } else if (l.medium === "material") k.pipe(pts, r, mats.material);
        else {
          p.pipeRun(pts, r, mats.steel);
          // A long low horizontal run gets T-post supports, as the kit's pipeSupports draw them.
          const sup: Array<[number, number]> = [];
          for (let i = 0; i < pts.length - 1; i++) {
            const [a, b] = [pts[i], pts[i + 1]];
            if (Math.abs(b[1] - a[1]) > 0.05 || Math.abs(b[0] - a[0]) < 2.4 || a[1] > 2.5 || a[1] < 0.3) continue;
            for (let x = Math.min(a[0], b[0]) + 1.2; x < Math.max(a[0], b[0]) - 0.6; x += 2.4) sup.push([x, 0]);
            if (sup.length) p.pipeSupports(sup, a[1] - r);
            sup.length = 0;
          }
        }
        for (const v of l.valves) p.valve([X(v.at[0]), Y(v.at[1]), 0], v.vertical ? "y" : "x", Math.max(0.03, r), v.kind === "control" || v.kind === "solenoid");
      }

      /* instruments */
      for (const pt of L.points) {
        const host = L.items.find((it) => it.id === pt.on);
        if (plan) {
          if (host) {
            const hp = placeItem(host);
            p.transmitter([X(pt.mount[0]), H(pt.mount[1], hp.ref), hp.dz + faceZ(host) + dims(host).d / 2], [0, 0, 1], 1);
          } else {
            const l = L.links.find((x) => x.id === pt.on);
            if (l && l.pts.length >= 2) p.transmitter([X(pt.mount[0]), rackRoute(l, l.duct ? 0.2 : PIPE_R[l.medium]).rack + 0.05, Zrow(pt.mount[1])], [0, 1, 0], 1);
          }
          continue;
        }
        const front = host ? dims(host).d / 2 : 0;
        const n: KV3 = pt.dir === "up" || pt.dir === "top" ? [0, 1, 0] : pt.dir === "down" || pt.dir === "bottom" ? [0, -1, 0] : pt.dir === "left" ? [-1, 0, 0] : [1, 0, 0];
        const inside = host && pt.mount[0] > host.box.x + 1 && pt.mount[0] < host.box.x + host.box.w - 1 && pt.mount[1] > host.box.y + 1 && pt.mount[1] < host.box.y + host.box.h - 1;
        if (inside) p.transmitter([X(pt.mount[0]), Y(pt.mount[1]), front], [0, 0, 1], 1);
        else p.transmitter([X(pt.mount[0]), Y(pt.mount[1]), 0], n, 1);
      }

      function drawItem(it: LaidItem, m: ReturnType<typeof dims>, floorY: number) {
        const o = it.options;
        const { x0, x1, cx, w, h, yb, d } = m;
        const lift = yb; // height of the item's bottom above the lowest floor
        switch (it.type) {
          case "cabinet":
          case "generator":
            lifted(lift, () => {
              p.cabinet({ x: cx, z: 0, w, h, d, doors: o.doors ?? (w > h * 0.9 ? 2 : 1), screen: it.type === "cabinet" ? o.screen ?? true : false });
              if (it.type === "generator") {
                // Louvres and a top vent on a power unit, as on the hand-made induction generator.
                for (let i = 0; i < 5; i++) k.box(w * 0.7, 0.012, 0.02, cx, h * 0.45 + i * 0.08, d / 2 + 0.01, mats.recess);
                k.cyl(0.05, 0.12, cx, h, 0, mats.machined, 12);
              }
            });
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
            // Tall vessels carry a roof handrail and a caged ladder, as every hand-made silo does.
            p.tank({ x: cx, z: 0, r: w / 2, h, y: floorY < yb - 0.05 && it.legs === undefined ? yb : floorY, top: o.top ?? (it.type === "silo" ? "cone" : "dome"), bottom: o.bottom ?? (it.type === "silo" ? "cone" : it.type === "mixer" ? "dish" : "flat"), legs: it.legs !== undefined ? yb - floorY : it.type === "silo" ? h * 0.2 : 0, rail: h > 3, agitator: it.type === "mixer" });
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
            if (w > 1.6 * h) {
              // A long, low chamber (grate cooler, tunnel kiln, oven line): a rectangular housing with inspection doors.
              k.box(w, h * 0.88, d, cx, yb + h * 0.12, 0, mats.model);
              k.box(w + 0.1, h * 0.12, d + 0.1, cx, yb, 0, mats.steel);
              const n = clamp(Math.round(w / Math.max(1.2, h)), 2, 10);
              for (let i = 0; i < n; i++) k.panel("+z", x0 + (w * (i + 0.15)) / n, x0 + (w * (i + 0.85)) / n, yb + h * 0.3, yb + h * 0.75, -d / 2, d / 2, 0.04);
              break;
            }
            const r = Math.min(w, d * 1.2) / 2;
            const showInside = !!o.contents && o.contents !== "none";
            const hasLid = !L.items.some((t) => t.on === it.id);
            if (it.floor !== undefined) p.plinth(cx, 0, r * 2.3, r * 2.3, 0.2, yb - 0.2 < 0 ? 0 : 0);
            const c = p.chamber({ x: cx, z: 0, r, h: h * 0.88, y: yb, cut: showInside, lid: hasLid });
            // Stiffener rings every ~1.2 m and a bolt circle on the lid flange, as on the hand-made chambers.
            for (let yy = yb + 0.6; yy < yb + h * 0.88 - 0.3; yy += 1.2) k.ring(r + 0.02, 0.025, cx, yy, 0, "y", mats.steel, 48);
            if (hasLid) k.boltCircle(cx, yb + h * 0.88 + 0.06, 0, r + 0.03, Math.max(8, Math.round(r * 16)), "y", 0.02);
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
            if (w < h * 1.6) {
              // Seen end-on in the image: the shell's axis runs toward the viewer.
              const r = Math.min(w, h) / 2;
              const len = Math.max(d, r * 3);
              k.disc(r, len, cx, yb + h / 2, -len / 2 + r * 0.6, "z", mats.shell, 48);
              for (const f of [0.2, 0.8]) k.ring(r + 0.02, Math.max(0.04, r * 0.06), cx, yb + h / 2, -len / 2 + r * 0.6 - len / 2 + len * f, "z", mats.machined, 48);
              k.disc(r * 0.8, 0.02, cx, yb + h / 2, r * 0.6 + 0.01, "z", mats.recess, 40);
            } else if (w > 5 * h && L.items.some((o) => o !== it && o.box.y >= it.box.y + it.box.h - 3 && o.box.y - (it.box.y + it.box.h) < Math.max(12, it.box.h) && Math.min(o.box.x + o.box.w, it.box.x + it.box.w) - Math.max(o.box.x, it.box.x) > 4)) {
              // The box is the shell itself (its piers and drive are items of their own under it).
              p.drum({ x: cx, z: 0, r: h / 2, len: w, cy: yb + h / 2, gear: 0.32 });
            } else p.drum({ x: cx, z: 0, r: h * 0.25, len: w, cy: yb + h * 0.7, gear: 0.32 });
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
            lifted(lift, () => {
              p.baghouse({ x: cx, z: 0, w, d: w * 0.8, h, hoppers: clamp(Math.round((w / h) * 3), 1, 4) });
              k.ladder(x0 - 0.15, 0, h * 0.4, h, 1);
            });
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
            // As deep as what it carries (a pier under a kiln, a stand under a fan), not as the deepest machine of the plant.
            const above = L.items.filter((t) => t !== it && (t.on === it.id || (Math.abs(t.box.y + t.box.h - it.box.y) < 4 && Math.min(t.box.x + t.box.w, it.box.x + it.box.w) - Math.max(t.box.x, it.box.x) > 2)));
            const fd = above.length ? Math.max(1, ...above.map((t) => dims(t).d)) * 1.1 : Math.min(Math.max(1.5, maxD), Math.max(1.5, w));
            p.frame({ x: cx, z: 0, w, d: fd, levels: levels.length ? levels : [h], bays: clamp(Math.round(w / 3), 1, 6) });
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
            if (w > h * 1.8) {
              // Drawn as a wide, low ellipse: a flat disc seen from an angle (a press flywheel, a turntable) lying horizontal.
              const r = w / 2;
              const t = Math.max(0.04, Math.min(h, r * 0.25));
              k.disc(r, t, cx, yb + h / 2, 0, "y", mats.machined, 48);
              k.ring(r * 0.82, Math.max(0.015, r * 0.03), cx, yb + h / 2 + t / 2, 0, "y", mats.steel, 48);
              for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                k.beam([cx, yb + h / 2 + t / 2, 0], [cx + Math.cos(a) * r * 0.8, yb + h / 2 + t / 2, Math.sin(a) * r * 0.8], r * 0.06, r * 0.04, mats.steel);
              }
              k.cyl(r * 0.18, t * 1.4, cx, yb + h / 2 - t * 0.2, 0, mats.machined, 24);
            } else k.disc(Math.min(w, h) / 2, Math.max(0.05, d * 0.3), cx, yb + h / 2, 0, "z", mats.machined, 32);
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
              if (it.floor !== undefined) p.plinth(cx, 0, w + 0.1, d + 0.1, 0.12);
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

/** SVG path data (M … L … Z subpaths; the first is the outline, the rest its holes) → three.js shapes. */
function svgShapes(d: string, toXY: (u: number, v: number) => THREE.Vector2): THREE.Shape[] {
  const rings = d
    .split("M")
    .map((p) => p.replace(/Z/g, "").trim())
    .filter(Boolean)
    .map((p) =>
      p
        .split("L")
        .map((q) => q.trim().split(/\s+/).map(Number))
        .filter((q) => q.length === 2 && q.every(Number.isFinite))
        .map(([u, v]) => toXY(u, v)),
    )
    .filter((r) => r.length >= 3);
  if (!rings.length) return [];
  const shape = new THREE.Shape(rings[0]);
  for (const h of rings.slice(1)) shape.holes.push(new THREE.Path(h));
  return [shape];
}

const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
