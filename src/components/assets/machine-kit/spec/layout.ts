/**
 * Diagram spec → layout. Everything that makes a drawing look engineered is
 * decided here, deterministically, so the model writing the spec only has to
 * name things and say roughly where they are:
 *
 *  1. parse forgivingly (fuzzy types / media, box in either form) and report
 *     what was guessed;
 *  2. sensible proportions per type; same-type items made the same size;
 *  3. every item stands on a floor, on its support (with a neck spool where the
 *     image shows a gap) or on legs — nothing floats;
 *  4. side-by-side items repacked so none overlap (left-to-right order kept);
 *  5. fitted to the sheet;
 *  6. lines routed orthogonally on a grid (A*: short, few bends, clear of
 *     equipment, parallel runs kept apart), valves set on straight runs;
 *  7. sensors mounted on the outline nearest where the image shows them;
 *  8. labels in a row under each floor, or beside stacked items.
 *
 * Pure: no React, no DOM. scripts/diagram-lab/draw.mjs runs it once and stores
 * the result in the drawing file, so pages only render.
 */
import { CATALOG, matchMedium, matchType } from "./catalog";
import type { Box, DiagramSpec, ItemOptions, ItemType, LaidItem, LaidLabel, LaidLink, LaidPoint, Layout, Medium, Pt, Side, SpecLink, TracedGroup, ValveKind } from "./types";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const r1 = (v: number) => Math.round(v * 10) / 10;
const cx = (b: Box) => b.x + b.w / 2;
const cy = (b: Box) => b.y + b.h / 2;
const bottom = (b: Box) => b.y + b.h;
const right = (b: Box) => b.x + b.w;
const xOverlap = (a: Box, b: Box) => Math.max(0, Math.min(right(a), right(b)) - Math.max(a.x, b.x));
const yOverlap = (a: Box, b: Box) => Math.max(0, Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y));
const grow = (b: Box, d: number): Box => ({ x: b.x - d, y: b.y - d, w: b.w + 2 * d, h: b.h + 2 * d });
const VALVES: ValveKind[] = ["gate", "globe", "ball", "butterfly", "check", "control", "solenoid", "regulator"];

/** Label text size and the estimated width of an upper-case label (letter-spaced). */
export const LABEL_SIZE = 11;
export const labelWidth = (text: string, size = LABEL_SIZE) => text.length * size * 0.78 + size;

interface Work {
  id: string;
  type: ItemType;
  label?: string;
  options: ItemOptions;
  /** Box as given (image px). */
  orig: Box;
  /** Box being laid out (image px, then sheet units). */
  box: Box;
  on?: string;
  /** Gap kept between this item and its support (px, then units). */
  neckH: number;
  floorY?: number;
  legsTo?: number;
  /** Laid-out box in image px, just before it is fitted to the sheet (moves applied). */
  pre?: Box;
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

function parseBox(raw: unknown, issues: string[], id: string): [number, number, number, number] | null {
  let a: number[] | null = null;
  if (Array.isArray(raw) && raw.length >= 4 && raw.slice(0, 4).every((v) => typeof v === "number" && Number.isFinite(v))) a = raw.slice(0, 4) as number[];
  else if (raw && typeof raw === "object") {
    const o = raw as Record<string, number>;
    const g = (...k: string[]) => k.map((n) => o[n]).find((v) => typeof v === "number");
    const l = g("left", "x0", "l", "x1");
    const t = g("top", "y0", "t", "y1");
    const rr = g("right", "x2", "r");
    const b = g("bottom", "y2", "b");
    const x = g("x");
    const y = g("y");
    const w = g("w", "width");
    const h = g("h", "height");
    if (l !== undefined && t !== undefined && rr !== undefined && b !== undefined) a = [l, t, rr, b];
    else if (x !== undefined && y !== undefined && w !== undefined && h !== undefined) a = [x, y, x + w, y + h];
  }
  if (!a) {
    issues.push(`Item "${id}": "box" must be [left, top, right, bottom] in grid units, e.g. [12, 30, 25, 88]. It was skipped.`);
    return null;
  }
  let [l, t, r, b] = a;
  if (r <= l || b <= t) {
    if (l + r <= 101 && t + b <= 101 && r > 0 && b > 0) {
      issues.push(`Item "${id}": box read as [left, top, width, height] because right/bottom were smaller than left/top. Write [left, top, right, bottom].`);
      [r, b] = [l + r, t + b];
    } else {
      [l, r] = [Math.min(l, r), Math.max(l, r)];
      [t, b] = [Math.min(t, b), Math.max(t, b)];
    }
  }
  // Grid units 0–100; a box given in 0–1 fractions is scaled up.
  if (Math.max(l, t, r, b) <= 1.001) {
    [l, t, r, b] = [l * 100, t * 100, r * 100, b * 100];
    issues.push(`Item "${id}": box looked like 0–1 fractions; read as grid units ×100. Write grid units 0–100.`);
  }
  [l, t, r, b] = [clamp(l, -5, 105), clamp(t, -5, 105), clamp(r, -5, 105), clamp(b, -5, 105)];
  if (r - l < 0.5) r = l + 0.5;
  if (b - t < 0.5) b = t + 0.5;
  return [l, t, r, b];
}

const slug = (s: string) => String(s ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const SHAPE_PARTS: ItemType[] = ["block", "cylinder", "wheel", "cone", "pile", "table", "fixture", "workpiece", "tool", "machine"];

export function layoutSpec(spec: DiagramSpec, image?: { width: number; height: number }): Layout {
  const issues: string[] = [];
  const img = image ?? (spec.image && typeof spec.image === "object" ? spec.image : null);
  if (!img) issues.push('No image size: run draw.mjs with "image" set to the source file so proportions match the picture.');
  const IW = img?.width ?? 1600;
  const IH = img?.height ?? 1000;
  const kx = IW / 100;
  const ky = IH / 100;

  /* 1. items -------------------------------------------------------- */
  const items: Work[] = [];
  const ids = new Map<string, string>(); // given id → final id
  for (const raw of Array.isArray(spec.items) ? spec.items : []) {
    if (!raw || typeof raw !== "object") continue;
    let id = slug(raw.id ?? raw.label ?? raw.type);
    while (items.some((w) => w.id === id)) id += "_2";
    if (raw.id && raw.id !== id) ids.set(String(raw.id), id);
    ids.set(id, id);
    const t = matchType(String(raw.type ?? "")) ?? matchType(String(raw.label ?? "")) ?? matchType(String(raw.id ?? ""));
    if (!t) issues.push(`Item "${id}": type "${raw.type}" is not in the catalog; drawn as "machine". Use one of the catalog types.`);
    else if (t !== raw.type) issues.push(`Item "${id}": type "${raw.type}" read as "${t}".`);
    const g = parseBox(raw.box, issues, id);
    if (!g) continue;
    const box = { x: g[0] * kx, y: g[1] * ky, w: (g[2] - g[0]) * kx, h: (g[3] - g[1]) * ky };
    items.push({
      id,
      type: t ?? "machine",
      label: raw.label ? String(raw.label).toUpperCase().slice(0, 40) : undefined,
      options: { ...(raw.options ?? {}) },
      orig: { ...box },
      box: { ...box },
      on: raw.on ? String(raw.on) : undefined,
      neckH: 0,
    });
  }
  const byId = new Map(items.map((w) => [w.id, w]));
  const ref = (s: string | undefined) => (s === undefined ? undefined : (ids.get(s) ?? ids.get(slug(s)) ?? (byId.has(slug(s)) ? slug(s) : undefined)));
  if (!items.length) issues.push("The spec has no items: list every machine in the image under \"items\".");

  /* links (parsed early: valve items fold into them) */
  const links: Array<{ id: string; from: string; to: string; medium: Medium; duct: boolean; label?: string; path?: Pt[]; valves: Array<{ kind: ValveKind; at: number; id?: string }> }> = [];
  for (const raw of (Array.isArray(spec.links) ? spec.links : []) as SpecLink[]) {
    if (!raw || typeof raw !== "object") continue;
    const from = ref(raw.from);
    const to = ref(raw.to);
    if (!from || !to) {
      issues.push(`Link ${raw.from} → ${raw.to}: ${!from ? `"${raw.from}"` : `"${raw.to}"`} is not an item id. Use the exact "id" of an item.`);
      continue;
    }
    if (from === to) continue;
    const m = matchMedium(String(raw.medium ?? ""));
    if (!m) issues.push(`Link ${from} → ${to}: medium "${raw.medium}" unknown; drawn as "water". Use one of: material, hot-gas, gas, air, water, steam, oil, vacuum, power, signal.`);
    const valves = (Array.isArray(raw.valves) ? raw.valves : []).map((v) => {
      const k = String(v?.kind ?? "gate").toLowerCase();
      return { kind: (VALVES.find((x) => k.includes(x)) ?? "gate") as ValveKind, at: clamp(Number(v?.at ?? 50), 5, 95), id: v?.id ? slug(v.id) : undefined };
    });
    let id = raw.id ? slug(raw.id) : `${from}-${to}`;
    while (links.some((l) => l.id === id)) id += "_2";
    // The line as the image draws it: corner points in grid units, from → to.
    const path = Array.isArray(raw.path) ? (raw.path as unknown[]).filter((q): q is number[] => Array.isArray(q) && q.length >= 2 && typeof q[0] === "number" && typeof q[1] === "number" && Number.isFinite(q[0]) && Number.isFinite(q[1])).map((q) => [clamp(q[0], -2, 102), clamp(q[1], -2, 102)] as Pt) : [];
    if (Array.isArray(raw.path) && path.length < 2) issues.push(`Link ${from} → ${to}: "path" needs at least two [x, y] points (grid units); routed automatically instead.`);
    links.push({ id, from, to, medium: m ?? "water", duct: !!raw.duct, label: raw.label ? String(raw.label).toUpperCase().slice(0, 40) : undefined, path: path.length >= 2 ? path : undefined, valves });
  }

  /* valve items → valves on a line */
  const valveAt = new Map<string, { link: string }>();
  for (const v of items.filter((w) => w.type === "valve")) {
    const kind = (VALVES.find((x) => String(v.options.valve ?? v.label ?? "").toLowerCase().includes(x)) ?? "solenoid") as ValveKind;
    const into = links.filter((l) => l.to === v.id);
    const out = links.filter((l) => l.from === v.id);
    if (into.length && out.length) {
      const a = into[0];
      const b = out[0];
      const A = byId.get(a.from)!;
      const B = byId.get(b.to)!;
      const t = clamp(Math.abs(cx(v.orig) - cx(A.orig)) / Math.max(1, Math.abs(cx(B.orig) - cx(A.orig))), 0.1, 0.9);
      links.splice(links.indexOf(a), 1);
      links.splice(links.indexOf(b), 1);
      const id = `${A.id}-${B.id}`;
      links.push({ id, from: A.id, to: B.id, medium: a.medium, duct: a.duct || b.duct, valves: [...a.valves, ...b.valves, { kind, at: t * 100, id: v.id }] });
      valveAt.set(v.id, { link: id });
    } else {
      // Nearest line passing the valve.
      let best: { l: (typeof links)[number]; d: number; t: number } | null = null;
      for (const l of links) {
        const A = byId.get(l.from)!.orig;
        const B = byId.get(l.to)!.orig;
        const [ax, ay, bx, by] = [cx(A), cy(A), cx(B), cy(B)];
        const L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
        const t = clamp(((cx(v.orig) - ax) * (bx - ax) + (cy(v.orig) - ay) * (by - ay)) / L2, 0, 1);
        const d = Math.hypot(ax + (bx - ax) * t - cx(v.orig), ay + (by - ay) * t - cy(v.orig));
        if (!best || d < best.d) best = { l, d, t };
      }
      if (best) {
        best.l.valves.push({ kind, at: clamp(best.t * 100, 10, 90), id: v.id });
        valveAt.set(v.id, { link: best.l.id });
      } else issues.push(`Valve "${v.id}" is on no line: add a link through it (from the item before it to the item after it).`);
    }
    if (into.length + out.length) issues.push(`Valve "${v.id}" drawn on the line ${valveAt.get(v.id)?.link ?? "?"} (valves are line fittings, not items).`);
  }
  for (const id of valveAt.keys()) items.splice(items.findIndex((w) => w.id === id), 1);
  byId.clear();
  for (const w of items) byId.set(w.id, w);

  /* layout mode: side view on floors, or a flow diagram kept as arranged */
  let schematic = spec.layout === "schematic";
  // Only whole machines count: the parts of one machine built from shapes sit on many rows by nature.
  const wholes = items.filter((w) => !SHAPE_PARTS.includes(w.type));
  if (spec.layout === undefined && !(Array.isArray(spec.floors) && spec.floors.length) && wholes.length >= 12) {
    const bots = wholes.map((w) => bottom(w.orig) / IH).sort((a, b) => a - b);
    let rowsN = 0;
    let run = 1;
    for (let i = 1; i <= bots.length; i++) {
      if (i < bots.length && bots[i] - bots[i - 1] <= 0.04) run++;
      else {
        if (run >= 2) rowsN++;
        run = 1;
      }
    }
    if (rowsN >= 3) {
      schematic = true;
      issues.push('Read as a flow diagram (machines on several rows, no floor): positions kept as in the image. If the machines stand on one floor in a side view, add "layout": "plant".');
    }
  }

  /* 2. supports and assemblies -------------------------------------- */
  // A flow diagram has no stacking: items keep their own places.
  if (schematic) for (const w of items) w.on = undefined;
  for (const w of items) {
    if (w.on === undefined) continue;
    const s = ref(w.on);
    if (!s || s === w.id) {
      issues.push(`Item "${w.id}": "on": "${w.on}" is not another item's id; it stands on the floor instead.`);
      w.on = undefined;
    } else w.on = s;
  }
  // Resting / mounted on a support the image shows right under it.
  for (const w of schematic ? [] : items) {
    if (w.on || w.type === "frame") continue;
    const cands = items.filter((s) => s !== w && s.type !== "conveyor" && s.type !== "valve" && xOverlap(s.orig, w.orig) >= 0.4 * Math.min(w.orig.w, s.orig.w));
    if (!CATALOG[w.type].floor) {
      const below = cands.filter((s) => cy(s.orig) > cy(w.orig) && s.orig.y >= bottom(w.orig) - 0.35 * w.orig.h).sort((a, b) => a.orig.y - b.orig.y);
      if (below[0] && below[0].orig.y - bottom(w.orig) < 0.12 * IH && CATALOG[below[0].type].support) w.on = below[0].id;
      else if (below[0] && w.type === "actuator") w.on = below[0].id;
    } else if (!w.options.elevated) {
      const s = cands
        .filter((s) => CATALOG[s.type].support && Math.abs(bottom(w.orig) - s.orig.y) < 0.06 * IH && cy(w.orig) < cy(s.orig) && xOverlap(s.orig, w.orig) >= 0.5 * w.orig.w)
        .sort((a, b) => Math.abs(bottom(w.orig) - a.orig.y) - Math.abs(bottom(w.orig) - b.orig.y))[0];
      if (s) w.on = s.id;
    }
  }
  for (const w of items) {
    const seen = new Set<string>([w.id]);
    let s = w.on ? byId.get(w.on) : undefined;
    while (s) {
      if (seen.has(s.id)) {
        w.on = undefined;
        break;
      }
      seen.add(s.id);
      s = s.on ? byId.get(s.on) : undefined;
    }
  }
  const depth = (w: Work): number => (w.on ? 1 + depth(byId.get(w.on)!) : 0);

  // Assemblies: items that touch in the image (or sit "on" one another) move as one rigid piece,
  // so a machine drawn as parts — frame, hanging spindle, table, clamp — keeps its shape.
  const parent = new Map<string, string>(items.map((w) => [w.id, w.id]));
  const find = (id: string): string => (parent.get(id) === id ? id : find(parent.get(id)!));
  const unite = (a: string, b: string) => parent.set(find(a), find(b));
  const tx = 0.012 * IW;
  const ty = 0.012 * IH;
  const touching = (a: Box, b: Box) => {
    const gx = Math.max(a.x - right(b), b.x - right(a));
    const gy = Math.max(a.y - bottom(b), b.y - bottom(a));
    return (gx <= tx && gy <= 0) || (gy <= ty && gx <= 0);
  };
  // Parts join what they touch; two complete machines that only overlap (perspective in a photo or render) stay separate and are spaced apart.
  const PART: ItemType[] = ["block", "cylinder", "wheel", "cone", "table", "fixture", "workpiece", "tool", "actuator", "frame", "motor", "gearbox", "drive", "hopper", "valve", "rotary-valve", "burner", "conveyor"];
  const within = (a: Box, b: Box) => xOverlap(a, b) * yOverlap(a, b) >= 0.8 * a.w * a.h;
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const [a, b] = [items[i], items[j]];
      if (!touching(a.orig, b.orig)) continue;
      if (PART.includes(a.type) || PART.includes(b.type) || within(a.orig, b.orig) || within(b.orig, a.orig)) unite(a.id, b.id);
    }
  for (const w of items) if (w.on) unite(w.id, w.on);
  const clusterOf = (w: Work) => items.filter((o) => find(o.id) === find(w.id));

  /* 3. proportions (free-standing items only; assemblies keep the image's shapes) */
  const single = (w: Work) => clusterOf(w).length === 1;
  for (const w of items) {
    // Shape parts keep the image's proportions (a lone machine is drawn from its picture).
    if (w.type === "conveyor" || w.type === "frame" || SHAPE_PARTS.includes(w.type) || !single(w)) continue;
    const [lo, hi] = CATALOG[w.type].aspect;
    const a = w.box.w / w.box.h;
    if (a >= lo * 0.95 && a <= hi * 1.05) continue;
    const na = clamp(a, lo, hi);
    const area = w.box.w * w.box.h;
    const nw = Math.sqrt(area * na);
    const nh = Math.sqrt(area / na);
    w.box = { x: cx(w.box) - nw / 2, y: bottom(w.box) - nh, w: nw, h: nh };
  }
  // Same type, about the same size → exactly the same size.
  for (const t of new Set(items.map((w) => w.type))) {
    const group = items.filter((w) => w.type === t && w.type !== "conveyor" && w.type !== "frame" && single(w));
    const done = new Set<Work>();
    for (const a of group) {
      if (done.has(a)) continue;
      const same = group.filter((b) => !done.has(b) && Math.abs(b.box.w - a.box.w) / a.box.w < 0.28 && Math.abs(b.box.h - a.box.h) / a.box.h < 0.28);
      if (same.length < 2) continue;
      const mw = same.reduce((s, b) => s + b.box.w, 0) / same.length;
      const mh = same.reduce((s, b) => s + b.box.h, 0) / same.length;
      for (const b of same) {
        b.box = { x: cx(b.box) - mw / 2, y: bottom(b.box) - mh, w: mw, h: mh };
        done.add(b);
      }
    }
  }
  // An item "on" another: bottom on the support's top (a gap the image shows becomes a neck spool, at most half a body high), shared centreline when nearly centred.
  // Only when the image really shows it standing on top: a part that hangs below or sits beside its partner ("on" read as "attached to") keeps the image's place.
  const riders = (w: Work): Work[] => items.filter((o) => o.on === w.id).flatMap((o) => [o, ...riders(o)]);
  const standsOnTop = (w: Work, s: Work) => bottom(w.orig) <= s.orig.y + 0.35 * s.orig.h && cy(w.orig) < cy(s.orig);
  for (const w of [...items].sort((a, b) => depth(a) - depth(b))) {
    if (!w.on || schematic) continue;
    const s = byId.get(w.on)!;
    if (s.type === "frame" || !standsOnTop(w, s)) continue;
    const gap = s.box.y - bottom(w.box);
    const shape = SHAPE_PARTS.includes(w.type) || SHAPE_PARTS.includes(s.type);
    const cap = 0.5 * Math.min(w.box.h, s.box.h);
    // Shape parts keep the image's geometry: only a hairline gap or overlap is closed.
    const dy = Math.abs(gap) < 0.015 * IH ? gap : !shape && gap > cap ? gap - cap : 0;
    const dxc = !shape && Math.abs(cx(w.box) - cx(s.box)) < 0.08 * s.box.w ? cx(s.box) - cx(w.box) : 0;
    for (const o of [w, ...riders(w)]) {
      o.box.y += dy;
      o.box.x += dxc;
    }
  }

  /* 4. floors: each assembly stands on the floor under it ------------ */
  const clusters = [...new Set(items.map((w) => find(w.id)))].map((root) => items.filter((w) => find(w.id) === root));
  const bbox = (ws: Work[]): Box => {
    const x0 = Math.min(...ws.map((w) => w.box.x));
    const y0 = Math.min(...ws.map((w) => w.box.y));
    const x1 = Math.max(...ws.map((w) => right(w.box)));
    const y1 = Math.max(...ws.map((w) => bottom(w.box)));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  // "elevated" lifts a free-standing item onto legs; inside an assembly the assembly decides.
  // A machine the image draws well above the floor (a cabinet or generator drawn at mid height) keeps its
  // height on a stand down to the floor: dropping it would move it away from its lines and push its
  // neighbours aside, and the drawing would no longer look like the image.
  const lowestAny = Math.max(...clusters.map((ws) => bottom(bbox(ws))), 0);
  // Only for a flat drawing: its lines are traced from the image to this machine ("path"), and no frame / skid is
  // drawn under it (in a render, a machine that looks higher is further back or sits on that skid).
  const drawnHigh = (ws: Work[]) => {
    if ((Array.isArray(spec.floors) && spec.floors.length) || lowestAny - bottom(bbox(ws)) <= 0.15 * IH) return false;
    if (!links.some((l) => l.path && ws.some((w) => w.id === l.from || w.id === l.to))) return false;
    const bb = bbox(ws);
    return !items.some((f) => f.type === "frame" && !ws.includes(f) && f.orig.y >= bottom(bb) - 0.02 * IH && xOverlap(f.orig, bb) > 0.3 * bb.w);
  };
  const standsOnFloor = (ws: Work[]) => ws.some((w) => CATALOG[w.type].floor && w.type !== "conveyor") && !(ws.length === 1 && ws[0].options.elevated) && !drawnHigh(ws);
  const floorClusters = clusters.filter(standsOnFloor);
  const lowest = Math.max(...(floorClusters.length ? floorClusters : clusters).map((ws) => bottom(bbox(ws))), 0);
  let floorsPx = (Array.isArray(spec.floors) ? spec.floors : []).filter((v) => typeof v === "number" && v > 0 && v <= 105).map((v) => v * ky);
  floorsPx = [...new Set([...floorsPx, ...(floorsPx.length ? [] : [lowest])])].sort((a, b) => a - b);
  if (floorsPx.length && floorsPx[floorsPx.length - 1] < lowest - 0.02 * IH) floorsPx.push(lowest);
  if (schematic) floorsPx = [];
  const floorUnder = (b: Box) => floorsPx.find((f) => f >= bottom(b) - 0.04 * IH) ?? floorsPx[floorsPx.length - 1];
  for (const ws of schematic ? [] : clusters) {
    const bb = bbox(ws);
    const f = floorUnder(bb);
    if (standsOnFloor(ws)) {
      const dy = f - bottom(bb);
      for (const w of ws) w.box.y += dy;
      for (const w of ws) {
        // Floor-standing members that end just short of the floor (piers, columns, cabinets) reach down to it.
        const short = f - bottom(w.box);
        if (w.type === "frame" || (CATALOG[w.type].floor && short > 0 && short < 0.05 * IH && !items.some((o) => o !== w && ws.includes(o) && o.box.y >= bottom(w.box) - 1 && xOverlap(o.box, w.box) > 0.3 * w.box.w))) w.box.h = f - w.box.y;
        if (Math.abs(bottom(w.box) - f) < 1) w.floorY = f;
      }
    } else {
      // Elevated or free-standing (hopper, cyclone, conveyor …): stays where the image has it, on legs.
      if (bottom(bb) > f) for (const w of ws) w.box.y -= bottom(bb) - f;
      const low = bottom(bbox(ws));
      for (const w of ws) {
        if (Math.abs(bottom(w.box) - low) > 1 || f - low <= 2) continue;
        if (w.type === "conveyor") {
          if (f - low < 0.4 * IH) w.legsTo = f;
        } else if (w.type !== "burner" && w.type !== "actuator" && w.type !== "valve" && w.type !== "tool") w.legsTo = f;
      }
    }
  }

  /* 5. repack assemblies side by side -------------------------------- */
  const extent = (ws: Work[]): Box => {
    const b = bbox(ws);
    const y1 = Math.max(...ws.map((w) => w.legsTo ?? w.floorY ?? bottom(w.box)));
    return { ...b, h: y1 - b.y };
  };
  const groups = clusters.map((ws) => ({ ws, c: cx(bbox(ws.map((w) => ({ ...w, box: w.orig })))) })).sort((a, b) => a.c - b.c);
  const gap = 0.03 * IW;
  const placed: Array<{ ws: Work[] }> = [];
  // Only solid parts collide: a drive may stand under a kiln between its piers, a conveyor under a silo on legs.
  const groupSolids = (ws: Work[]) => ws.flatMap((w) => solids(w));
  for (const g of schematic ? [] : groups) {
    for (let pass = 0; pass < 6; pass++) {
      const mine = groupSolids(g.ws);
      let shift = 0;
      for (const p of placed)
        for (const a of groupSolids(p.ws))
          for (const b of mine) {
            if (yOverlap(a, b) < 0.12 * Math.min(a.h, b.h)) continue;
            if (b.x < right(a) + gap && right(b) > a.x - gap) shift = Math.max(shift, right(a) + gap - b.x);
          }
      if (shift <= 0.5) break;
      for (const w of g.ws) w.box.x += shift;
    }
    placed.push(g);
  }
  if (schematic) {
    // Tidy into rows and columns: free-standing items whose centres (x) or bottoms (y) nearly line up are lined up.
    const free = items.filter((w) => single(w));
    for (const key of ["x", "y"] as const) {
      const val = (w: Work) => (key === "x" ? cx(w.box) : bottom(w.box));
      const tol = key === "x" ? 0.012 * IW : 0.012 * IH;
      const sorted = [...free].sort((a, b) => val(a) - val(b));
      for (let i = 0; i < sorted.length; ) {
        let j = i + 1;
        while (j < sorted.length && val(sorted[j]) - val(sorted[j - 1]) <= tol) j++;
        if (j - i > 1) {
          const m = sorted.slice(i, j).reduce((t, w) => t + val(w), 0) / (j - i);
          for (const w of sorted.slice(i, j)) {
            if (key === "x") w.box.x += m - cx(w.box);
            else w.box.y += m - bottom(w.box);
          }
        }
        i = j;
      }
    }
    // Push assemblies apart only where their machines really overlap (not their outer boxes: a long air slide under a
    // row of machines makes one wide assembly whose box would cover a silo it never touches). The push is as small as
    // the overlap, along the shorter way out.
    const pad = 0.012 * Math.min(IW, IH);
    for (let it = 0; it < 60; it++) {
      let moved = false;
      for (let i = 0; i < clusters.length; i++)
        for (let j = i + 1; j < clusters.length; j++) {
          let worst: { a: Box; b: Box; ox: number; oy: number } | null = null;
          for (const a of clusters[i].flatMap((w) => (w.type === "frame" ? [] : solids(w))))
            for (const b of clusters[j].flatMap((w) => (w.type === "frame" ? [] : solids(w)))) {
              const ox = Math.min(right(a), right(b)) - Math.max(a.x, b.x);
              const oy = Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y);
              if (ox <= 1 || oy <= 1) continue;
              if (!worst || Math.min(ox, oy) > Math.min(worst.ox, worst.oy)) worst = { a, b, ox, oy };
            }
          if (!worst) continue;
          moved = true;
          const alongX = worst.ox < worst.oy;
          const d = ((alongX ? worst.ox : worst.oy) + pad) / 2 + 0.5;
          const sgn = alongX ? (cx(worst.a) <= cx(worst.b) ? 1 : -1) : cy(worst.a) <= cy(worst.b) ? 1 : -1;
          for (const w of clusters[i]) {
            if (alongX) w.box.x -= d * sgn;
            else w.box.y -= d * sgn;
          }
          for (const w of clusters[j]) {
            if (alongX) w.box.x += d * sgn;
            else w.box.y += d * sgn;
          }
        }
      if (!moved) break;
    }
  }
  // Necks: the gap kept between an item and the support under it.
  for (const w of items) {
    const s = w.on ? byId.get(w.on) : undefined;
    // A neck spool only joins process equipment stacked on equipment (a chamber on a chamber); shape parts show their own gaps.
    w.neckH = s && s.type !== "frame" && !schematic && !SHAPE_PARTS.includes(w.type) && !SHAPE_PARTS.includes(s.type) && cy(w.orig) < cy(s.orig) ? Math.max(0, s.box.y - bottom(w.box)) : 0;
    if (w.neckH < 1) w.neckH = 0;
  }

  /* 6. fit to the sheet --------------------------------------------- */
  const all = extent(items.length ? items : [{ box: { x: 0, y: 0, w: IW, h: IH } } as Work]);
  const M = 70;
  const LB = 64;
  const maxW = 1600;
  const maxH = 1200;
  const s = Math.min((maxW - 2 * M) / Math.max(1, all.w), (maxH - M - LB) / Math.max(1, all.h));
  const contentW = all.w * s;
  let W = Math.round(Math.max(960, contentW + 2 * M));
  let shiftFloors = 0;
  const ox = (W - contentW) / 2;
  const H0 = Math.round(all.h * s + M + LB);
  const X = (x: number) => ox + (x - all.x) * s;
  const Y = (y: number) => M + (y - all.y) * s;
  const tf = (b: Box): Box => ({ x: X(b.x), y: Y(b.y), w: b.w * s, h: b.h * s });
  for (const w of items) {
    w.pre = { ...w.box };
    w.box = tf(w.box);
    w.neckH *= s;
    if (w.floorY !== undefined) w.floorY = Y(w.floorY);
    if (w.legsTo !== undefined) w.legsTo = Y(w.legsTo);
  }
  const floorYs = floorsPx.map(Y).filter((f) => items.some((w) => w.floorY !== undefined && Math.abs(w.floorY - f) < 1 || (w.legsTo !== undefined && Math.abs(w.legsTo - f) < 1)) || f === Y(floorsPx[floorsPx.length - 1]));
  const GROUND = floorYs.length ? Math.max(...floorYs) : Math.max(...items.map((w) => bottom(w.box)), H0 - LB);
  let H = Math.max(H0, Math.round(GROUND + LB));

  /* 7. routing ------------------------------------------------------ */
  const C = 6;
  const cols = Math.ceil(W / C);
  const rows = Math.ceil((H + 40) / C);
  const blocked = new Uint8Array(cols * rows);
  const near = new Float32Array(cols * rows);
  const occH = new Uint8Array(cols * rows);
  const occV = new Uint8Array(cols * rows);
  const idx = (c: number, r: number) => r * cols + c;
  const cellOf = (x: number, y: number): [number, number] => [clamp(Math.floor(x / C), 0, cols - 1), clamp(Math.floor(y / C), 0, rows - 1)];
  const centre = (c: number, r: number): Pt => [c * C + C / 2, r * C + C / 2];
  const visual = (w: Work): Box => {
    const b = w.box;
    if (w.type === "cyclone") return w.options.inlet === "right" ? { ...b, w: b.w * 1.36 } : { x: b.x - b.w * 0.36, y: b.y, w: b.w * 1.36, h: b.h };
    if (w.type === "stack") return { x: b.x - b.w * 0.5, y: b.y, w: b.w * 2, h: b.h };
    if (w.type === "bucket-elevator") return { x: b.x - b.w * 0.6, y: b.y, w: b.w * 2.2, h: b.h };
    return b;
  };
  const obstacles: Array<{ id: string; b: Box }> = [];
  for (const w of items) {
    if (w.type === "frame") continue;
    const sol = solids(w);
    if (sol.length > 1) for (const b of sol) obstacles.push({ id: w.id, b });
    else obstacles.push({ id: w.id, b: visual(w) });
    if (w.on && w.neckH > 1) {
      const s2 = byId.get(w.on)!;
      const nw = clamp(0.3 * Math.min(w.box.w, s2.box.w), 10, 80);
      obstacles.push({ id: w.id, b: { x: cx(w.box) - nw / 2, y: bottom(w.box), w: nw, h: w.neckH } });
    }
  }
  const PAD = 7;
  for (const o of obstacles) {
    const g2 = grow(o.b, PAD);
    const [c0, r0] = cellOf(g2.x, g2.y);
    const [c1, r1b] = cellOf(right(g2), bottom(g2));
    for (let r = r0; r <= r1b; r++) for (let c = c0; c <= c1; c++) blocked[idx(c, r)] = 1;
    const g3 = grow(o.b, PAD + 3 * C);
    const [d0, e0] = cellOf(g3.x, g3.y);
    const [d1, e1] = cellOf(right(g3), bottom(g3));
    for (let r = e0; r <= e1; r++) for (let c = d0; c <= d1; c++) near[idx(c, r)] += 0.5;
  }
  // Below each floor (under the items standing on it) and the sheet edges are out of bounds.
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const [x, y] = centre(c, r);
      if (y > (schematic ? H - 10 : GROUND - 5) || y < 16 || x < 16 || x > W - 16) blocked[idx(c, r)] = 2;
    }
  for (const w of items) {
    if (w.legsTo === undefined) continue;
    for (const lx of [w.box.x + w.box.w * 0.12, right(w.box) - w.box.w * 0.12]) {
      const [c0, r0] = cellOf(lx - 5, bottom(w.box));
      const [c1, r1b] = cellOf(lx + 5, w.legsTo);
      for (let r = r0; r <= r1b; r++) for (let c = c0; c <= c1; c++) blocked[idx(c, r)] = 1;
    }
  }

  const DIRS: Array<[number, number]> = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const sideDir: Record<Side, number> = { right: 0, bottom: 1, left: 2, top: 3 };
  const BEND = 14;

  // blocked: 1 = equipment (or its clearance), 2 = off the sheet / under a floor. A soft search may cross equipment at a high price.
  // Row above which no equipment stands between the two ends (anything higher is sky).
  let skyRow = 0;
  function astar(start: [number, number], sd: number, goal: [number, number], gd: number, own: Set<number>, soft = false): { cells: Array<[number, number]>; cost: number } | null {
    const lo = Math.min(start[0], goal[0]);
    const hi = Math.max(start[0], goal[0]);
    let top = rows;
    for (const o of obstacles) {
      const [c0] = cellOf(o.b.x, 0);
      const [c1] = cellOf(right(o.b), 0);
      if (c1 < lo || c0 > hi) continue;
      top = Math.min(top, cellOf(0, o.b.y)[1]);
    }
    skyRow = Math.min(top, start[1], goal[1]) - 2;
    const N = cols * rows * 4;
    const g = new Float32Array(N).fill(Infinity);
    const from = new Int32Array(N).fill(-1);
    const heap: number[] = [];
    const f = new Float32Array(N);
    const push = (s: number) => {
      heap.push(s);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (f[heap[p]] <= f[heap[i]]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1;
          const rr = l + 1;
          let m = i;
          if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l;
          if (rr < heap.length && f[heap[rr]] < f[heap[m]]) m = rr;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    const h = (c: number, r: number) => Math.abs(c - goal[0]) + Math.abs(r - goal[1]);
    const s0 = idx(start[0], start[1]) * 4 + sd;
    g[s0] = 0;
    f[s0] = h(start[0], start[1]);
    push(s0);
    let expanded = 0;
    while (heap.length && expanded < 400000) {
      const st = pop();
      expanded++;
      const d = st & 3;
      const cell = st >> 2;
      const c = cell % cols;
      const r = (cell / cols) | 0;
      if (c === goal[0] && r === goal[1] && d === gd) {
        const cells: Array<[number, number]> = [];
        let k = st;
        while (k >= 0) {
          const ce = k >> 2;
          cells.push([ce % cols, (ce / cols) | 0]);
          k = from[k];
        }
        return { cells: cells.reverse(), cost: g[st] };
      }
      for (const nd of [d, (d + 1) & 3, (d + 3) & 3]) {
        const nc = c + DIRS[nd][0];
        const nr = r + DIRS[nd][1];
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const ni = idx(nc, nr);
        if (blocked[ni] && !own.has(ni) && (!soft || blocked[ni] === 2)) continue;
        const horiz = nd === 0 || nd === 2;
        let step = 1 + near[ni] + (soft && blocked[ni] === 1 && !own.has(ni) ? 45 : 0) + (horiz ? occH[ni] * 30 + occV[ni] * 3 : occV[ni] * 30 + occH[ni] * 3);
        // Keep parallel runs a couple of cells apart.
        for (const k of [1, 2]) {
          const [pc, pr] = horiz ? [nc, nr + k] : [nc + k, nr];
          const [qc, qr] = horiz ? [nc, nr - k] : [nc - k, nr];
          for (const [ac, ar] of [[pc, pr], [qc, qr]]) {
            if (ac < 0 || ar < 0 || ac >= cols || ar >= rows) continue;
            const ai = idx(ac, ar);
            step += (horiz ? occH[ai] : occV[ai]) * (k === 1 ? 6 : 2);
          }
        }
        if (nd !== d) step += BEND;
        // Climbing above the equipment it passes is a detour: price the height so a short route under or beside wins.
        if (nr < skyRow) step += 2.5;
        const ns = ni * 4 + nd;
        const ng = g[st] + step;
        if (ng < g[ns]) {
          g[ns] = ng;
          from[ns] = st;
          f[ns] = ng + h(nc, nr);
          push(ns);
        }
      }
    }
    return null;
  }

  const portUsage = new Map<string, number>();
  /** Point on side `side` of item w, `frac` along it, snapped to a cell centre. */
  const portAt = (w: Work, side: Side, frac: number): Pt => {
    const b = w.box;
    const inset = Math.min(14, (side === "top" || side === "bottom" ? b.w : b.h) * 0.2);
    if (side === "top" || side === "bottom") {
      const x = clamp(b.x + b.w * frac, b.x + inset, right(b) - inset);
      return [Math.floor(x / C) * C + C / 2, side === "top" ? b.y : bottom(b)];
    }
    const y = clamp(b.y + b.h * frac, b.y + inset, bottom(b) - inset);
    return [side === "left" ? b.x : right(b), Math.floor(y / C) * C + C / 2];
  };
  const named = (w: Work, end: "from" | "to", m: Medium): { side: Side; frac: number } | null => {
    const mr = w.options.motor === "left";
    switch (w.type) {
      case "gas-cylinder":
        return { side: "top", frac: 0.5 };
      case "pump":
        return end === "from" ? { side: "top", frac: mr ? 0.88 : 0.12 } : { side: mr ? "right" : "left", frac: 0.55 };
      case "vacuum-pump":
        return { side: mr ? "right" : "left", frac: 0.45 };
      case "fan":
        return end === "from" ? { side: "top", frac: w.options.outlet === "right" ? 0.88 : 0.12 } : null;
      case "motor":
      case "drive":
      case "gearbox":
        return m === "power" || m === "signal" ? { side: "top", frac: 0.4 } : null;
      case "hopper":
        return end === "to" ? { side: "top", frac: 0.5 } : { side: "bottom", frac: 0.5 };
      case "cyclone":
        return end === "to" ? { side: w.options.inlet === "right" ? "right" : "left", frac: 0.18 } : m === "material" ? { side: "bottom", frac: 0.5 } : { side: "top", frac: 0.5 };
      case "stack":
        return { side: "left", frac: 0.85 };
      default:
        return null;
    }
  };
  const sidesFor = (w: Work, other: Work, end: "from" | "to", m: Medium): Side[] => {
    const n = named(w, end, m);
    if (n) return [n.side];
    // A flow diagram has no floor: lines may reach any side.
    let allowed = schematic ? (["top", "bottom", "left", "right"] as Side[]) : CATALOG[w.type].ports.slice();
    if (w.floorY !== undefined || w.on) allowed = allowed.filter((sd) => sd !== "bottom");
    if (items.some((o) => o.on === w.id && o.type !== "frame")) {
      // Something stands on it: keep the top for the stack unless the top is wider than what stands there.
      const onTop = items.filter((o) => o.on === w.id);
      if (onTop.some((o) => o.box.w > 0.6 * w.box.w)) allowed = allowed.filter((sd) => sd !== "top");
    }
    if (!allowed.length) allowed = ["left", "right", "top"];
    const vx = cx(other.box) - cx(w.box);
    const vy = cy(other.box) - cy(w.box);
    const score = (sd: Side) => (sd === "right" ? vx : sd === "left" ? -vx : sd === "bottom" ? vy : -vy) / Math.hypot(vx, vy || 1);
    return allowed.sort((a, b) => score(b) - score(a)).slice(0, 2).concat(allowed.includes("top") && !allowed.slice(0, 2).includes("top") ? ["top"] : []);
  };

  /**
   * A line the image draws (the spec's "path", grid units): followed as drawn instead of routed anew. Each
   * corner moves with the two ends (weighted by how far along it is), the ends are put on the items'
   * outlines, and slanted runs become right angles. Null when the path does not fit (far from its items
   * or through other equipment): then it is routed automatically.
   */
  const followImage = (path: Pt[], A: Work, B: Work): Pt[] | null => {
    if (!A.pre || !B.pre) return null;
    const raw = path.map(([gx, gy]) => [gx * kx, gy * ky] as Pt);
    const seg = raw.slice(1).map((q, i) => Math.hypot(q[0] - raw[i][0], q[1] - raw[i][1]));
    const total = seg.reduce((t, v) => t + v, 0) || 1;
    const dA: Pt = [cx(A.pre) - cx(A.orig), bottom(A.pre) - bottom(A.orig)];
    const dB: Pt = [cx(B.pre) - cx(B.orig), bottom(B.pre) - bottom(B.orig)];
    let run = 0;
    const moved = raw.map((p, i) => {
      if (i) run += seg[i - 1];
      const t = run / total;
      return [X(p[0] + dA[0] * (1 - t) + dB[0] * t), Y(p[1] + dA[1] * (1 - t) + dB[1] * t)] as Pt;
    });
    const far = 0.08 * Math.max(W, H0);
    // End on the item's outline: an end drawn inside the item leaves through the side the line heads to.
    const attach = (p: Pt, q: Pt, b: Box): Pt[] | null => {
      const inside = p[0] >= b.x - 2 && p[0] <= right(b) + 2 && p[1] >= b.y - 2 && p[1] <= bottom(b) + 2;
      if (inside) {
        const horiz = Math.abs(q[0] - p[0]) >= Math.abs(q[1] - p[1]);
        return [horiz ? [q[0] >= p[0] ? right(b) : b.x, clamp(p[1], b.y + 3, bottom(b) - 3)] : [clamp(p[0], b.x + 3, right(b) - 3), q[1] >= p[1] ? bottom(b) : b.y]];
      }
      if (distToBox(p, b) > far) return null;
      if (p[1] >= b.y && p[1] <= bottom(b)) return [[p[0] < b.x ? b.x : right(b), p[1]], p];
      if (p[0] >= b.x && p[0] <= right(b)) return [[p[0], p[1] < b.y ? b.y : bottom(b)], p];
      const port: Pt = [clamp(p[0], b.x + 4, right(b) - 4), p[1] < b.y ? b.y : bottom(b)];
      return [port, [port[0], p[1]], p];
    };
    const head = attach(moved[0], moved[1], A.box);
    const tail = attach(moved[moved.length - 1], moved[moved.length - 2], B.box);
    if (!head || !tail) return null;
    const mid = moved.slice(1, -1);
    const chain: Pt[] = [...head, ...mid, ...tail.reverse()];
    // Drop repeated points, then square every slanted run (nearly straight → straight, else one elbow that keeps the run's direction).
    const o: Pt[] = [];
    for (const p of chain) if (!o.length || Math.hypot(p[0] - o[o.length - 1][0], p[1] - o[o.length - 1][1]) > 0.5) o.push([p[0], p[1]]);
    if (o.length < 2) return null;
    const sq: Pt[] = [o[0]];
    for (let i = 1; i < o.length; i++) {
      const a = sq[sq.length - 1];
      const b = o[i];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const last = i === o.length - 1;
      if (Math.abs(dx) < 1 || Math.abs(dy) < 1) {
        sq.push(b);
        continue;
      }
      if (!last && Math.abs(dx) < 0.15 * Math.abs(dy)) {
        sq.push([a[0], b[1]]);
        o[i] = [a[0], b[1]];
        continue;
      }
      if (!last && Math.abs(dy) < 0.15 * Math.abs(dx)) {
        sq.push([b[0], a[1]]);
        o[i] = [b[0], a[1]];
        continue;
      }
      const prev = sq.length >= 2 ? sq[sq.length - 2] : null;
      const prevHoriz = prev ? Math.abs(a[0] - prev[0]) > Math.abs(a[1] - prev[1]) : Math.abs(dx) >= Math.abs(dy);
      // Into the last point (on the target's outline) the line arrives square to that side.
      const intoSide = last ? (Math.abs(b[0] - B.box.x) < 1 || Math.abs(b[0] - right(B.box)) < 1 ? "h" : "v") : null;
      const goHorizFirst = intoSide ? intoSide === "v" : prevHoriz;
      sq.push(goHorizFirst ? [b[0], a[1]] : [a[0], b[1]]);
      sq.push(b);
    }
    const pts = simplify(sq);
    // Through other equipment for more than a short stretch: the path is wrong, route instead.
    let len = 0;
    let through = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [p, q] = [pts[i], pts[i + 1]];
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      len += L;
      for (let t = 0; t < L; t += 3) {
        const x = p[0] + ((q[0] - p[0]) * t) / L;
        const y = p[1] + ((q[1] - p[1]) * t) / L;
        if (obstacles.some((ob) => ob.id !== A.id && ob.id !== B.id && find(ob.id) !== find(A.id) && find(ob.id) !== find(B.id) && x > ob.b.x + 2 && x < right(ob.b) - 2 && y > ob.b.y + 2 && y < bottom(ob.b) - 2)) through += 3;
      }
    }
    if (through > Math.max(24, 0.15 * len)) return null;
    return pts;
  };

  const ORDER: Medium[] = ["material", "hot-gas", "power", "water", "vacuum", "gas", "air", "steam", "oil", "signal"];
  const laidLinks: LaidLink[] = [];
  const noPath: string[] = [];
  let withPath = 0;
  const sortedLinks = [...links].sort((a, b) => ORDER.indexOf(a.medium) - ORDER.indexOf(b.medium));
  for (const l of sortedLinks) {
    const A = byId.get(l.from)!;
    const B = byId.get(l.to)!;
    if (A.type === "frame" || B.type === "frame") {
      issues.push(`Link ${l.id}: a frame has no connections; link the machine on the frame instead.`);
      continue;
    }
    // Items that touch hand over directly (a conveyor discharging onto a pile, a chute into a bin): no line of its own.
    const gapX = Math.max(A.box.x - right(B.box), B.box.x - right(A.box));
    const gapY = Math.max(A.box.y - bottom(B.box), B.box.y - bottom(A.box));
    if (Math.max(gapX, gapY) < 10 && l.medium !== "signal" && l.medium !== "power") {
      laidLinks.push({ id: l.id, from: l.from, to: l.to, medium: l.medium, duct: false, pts: [], valves: [] });
      continue;
    }
    // Material poured / fed from an item into the one it is stacked on goes straight down through the neck.
    const upper = A.on === B.id ? A : B.on === A.id ? B : null;
    if (upper && l.medium === "material") {
      const lower = upper === A ? B : A;
      const x = cx(upper.box);
      const y0 = bottom(upper.box) - Math.min(18, upper.box.h * 0.2);
      const y1 = lower.box.y + Math.min(18, lower.box.h * 0.2);
      const down = upper === A;
      laidLinks.push({ id: l.id, from: l.from, to: l.to, medium: l.medium, duct: false, pts: down ? [[r1(x), r1(y0)], [r1(x), r1(y1)]] : [[r1(x), r1(y1)], [r1(x), r1(y0)]], valves: [] });
      continue;
    }
    let best: { pts: Pt[]; cost: number; sa: Side; sb: Side } | null = null;
    if (!l.path) noPath.push(l.id);
    else withPath++;
    const drawn = l.path ? followImage(l.path, A, B) : null;
    if (l.path && !drawn) issues.push(`Link ${l.id}: its "path" does not run from ${l.from} to ${l.to} clear of other machines; routed automatically. Check the path's first point is at ${l.from}, its last at ${l.to}, and the corners follow the line in the image.`);
    for (const soft of drawn ? [] : [false, true]) {
    if (best) break;
    for (const sa of sidesFor(A, B, "from", l.medium))
      for (const sb of sidesFor(B, A, "to", l.medium)) {
        const na = named(A, "from", l.medium);
        const nb = named(B, "to", l.medium);
        const ka = portUsage.get(`${A.id}:${sa}`) ?? 0;
        const kb = portUsage.get(`${B.id}:${sb}`) ?? 0;
        const spread = (k: number) => 0.5 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.2;
        const pa = portAt(A, sa, na && na.side === sa ? na.frac + ka * 0.08 : spread(ka));
        const pb = portAt(B, sb, nb && nb.side === sb ? nb.frac + kb * 0.08 : spread(kb));
        const out = (p: Pt, sd: Side): [number, number] => {
          const [dx, dy] = DIRS[sideDir[sd]];
          return cellOf(p[0] + dx * (PAD + C * 1.5), p[1] + dy * (PAD + C * 1.5));
        };
        // Walk out of each port until the grid is free (tightly packed items block the first cells).
        const own = new Set<number>();
        const exit = (p: Pt, sd: Side): [number, number] => {
          let cell = out(p, sd);
          const [dx, dy] = DIRS[sideDir[sd]];
          for (let k = 0; k < 10 && blocked[idx(...cell)]; k++) {
            own.add(idx(...cell));
            cell = [clamp(cell[0] + dx, 0, cols - 1), clamp(cell[1] + dy, 0, rows - 1)];
          }
          own.add(idx(...cell));
          return cell;
        };
        const ca = exit(pa, sa);
        const cb = exit(pb, sb);
        const res = astar(ca, sideDir[sa], cb, (sideDir[sb] + 2) & 3, own, soft);
        if (!res) continue;
        const cost = res.cost + (sa === sidesFor(A, B, "from", l.medium)[0] ? 0 : 6) + (sb === sidesFor(B, A, "to", l.medium)[0] ? 0 : 6);
        if (best && cost >= best.cost) continue;
        // Corner points: port → cells → port, straight stubs out of each port.
        const pts: Pt[] = [pa];
        const cells = res.cells.map(([c, r]) => centre(c, r));
        const first = cells[0];
        pts.push(sa === "top" || sa === "bottom" ? [pa[0], first[1]] : [first[0], pa[1]]);
        for (let i = 1; i < cells.length - 1; i++) {
          const [p, q, n] = [cells[i - 1], cells[i], cells[i + 1]];
          if ((q[0] - p[0]) * (n[1] - q[1]) - (q[1] - p[1]) * (n[0] - q[0]) !== 0) pts.push(q);
        }
        const last = cells[cells.length - 1];
        pts.push(sb === "top" || sb === "bottom" ? [pb[0], last[1]] : [last[0], pb[1]]);
        pts.push(pb);
        best = { pts: simplify(pts), cost, sa, sb };
      }
    }
    let pts: Pt[];
    if (drawn) pts = drawn;
    else if (best) {
      pts = best.pts;
      portUsage.set(`${A.id}:${best.sa}`, (portUsage.get(`${A.id}:${best.sa}`) ?? 0) + 1);
      portUsage.set(`${B.id}:${best.sb}`, (portUsage.get(`${B.id}:${best.sb}`) ?? 0) + 1);
    } else {
      issues.push(`Link ${l.id}: no clear path between ${l.from} and ${l.to}; drawn as a direct elbow. Check both items are separate and not boxed in.`);
      // Fallback: straight down a stack (bottom → top with one jog), else side to side.
      const stacked = xOverlap(A.box, B.box) > 0 || Math.abs(cx(A.box) - cx(B.box)) < Math.max(A.box.w, B.box.w);
      if (stacked && Math.abs(cy(A.box) - cy(B.box)) > (A.box.h + B.box.h) / 4) {
        const [top, low] = cy(A.box) < cy(B.box) ? [A, B] : [B, A];
        const p0: Pt = [cx(top.box), bottom(top.box)];
        const p1: Pt = [cx(low.box), low.box.y];
        const my = (p0[1] + p1[1]) / 2;
        pts = simplify(top === A ? [p0, [p0[0], my], [p1[0], my], p1] : [p1, [p1[0], my], [p0[0], my], p0]);
      } else {
        const [l, r] = cx(A.box) <= cx(B.box) ? [A, B] : [B, A];
        const pa: Pt = [right(l.box), cy(l.box)];
        const pb: Pt = [r.box.x, cy(r.box)];
        const mid = simplify([pa, [(pa[0] + pb[0]) / 2, pa[1]], [(pa[0] + pb[0]) / 2, pb[1]], pb]);
        pts = l === A ? mid : mid.reverse();
      }
    }
    // Occupy the run so later lines keep their distance.
    for (let i = 0; i < pts.length - 1; i++) {
      const [p, q] = [pts[i], pts[i + 1]];
      const horiz = Math.abs(q[0] - p[0]) > Math.abs(q[1] - p[1]);
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      for (let t = 0; t <= L; t += C / 2) {
        const [c, r] = cellOf(p[0] + ((q[0] - p[0]) * t) / (L || 1), p[1] + ((q[1] - p[1]) * t) / (L || 1));
        if (horiz) occH[idx(c, r)] = 1;
        else occV[idx(c, r)] = 1;
      }
    }
    // Valves on straight runs, clear of bends.
    const valves = l.valves.map((v) => {
      const at = pointAlong(pts, v.at / 100, 18);
      return { id: v.id, kind: v.kind, at: at.p, vertical: at.vertical };
    });
    laidLinks.push({ id: l.id, from: l.from, to: l.to, medium: l.medium, duct: l.duct, label: l.label, pts: pts.map(([x, y]) => [r1(x), r1(y)] as Pt), valves: valves.map((v) => ({ ...v, at: [r1(v.at[0]), r1(v.at[1])] as Pt })) });
  }

  // Most lines traced from the image but some not: those few are routed anew and will not look like the image.
  if (noPath.length && withPath && noPath.length >= 2)
    issues.push(`${noPath.length} lines have no "path", so they are routed automatically and will not run as the image draws them: ${noPath.slice(0, 20).join(", ")}${noPath.length > 20 ? " …" : ""}. Give each of them its "path" (corner points from the image), unless the image shows no line between those two machines.`);
  else if (noPath.length >= 3 && !withPath)
    issues.push(`No line has a "path": every line is routed automatically. Where the image draws the line, give it its "path" (corner points from the image) so the drawing runs the same way.`);

  /* 8. sensors ------------------------------------------------------ */
  const laidPoints: LaidPoint[] = [];
  const tags = new Set<string>();
  const toSheet = (gx: number, gy: number, w: Work): Pt => {
    const u = (gx * kx - w.orig.x) / w.orig.w;
    const v = (gy * ky - w.orig.y) / w.orig.h;
    return [w.box.x + clamp(u, -0.3, 1.3) * w.box.w, w.box.y + clamp(v, -0.3, 1.3) * w.box.h];
  };
  const nearestItem = (gx: number, gy: number): Work | undefined => {
    let best: { w: Work; d: number } | undefined;
    for (const w of items) {
      if (w.type === "frame") continue;
      const px = gx * kx;
      const py = gy * ky;
      const dx = Math.max(w.orig.x - px, 0, px - right(w.orig));
      const dy = Math.max(w.orig.y - py, 0, py - bottom(w.orig));
      const d = Math.hypot(dx, dy);
      if (!best || d < best.d) best = { w, d };
    }
    return best?.w;
  };
  for (const p of Array.isArray(spec.points) ? spec.points : []) {
    if (!p || typeof p !== "object" || !p.tag) continue;
    const tag = String(p.tag).trim().toUpperCase().replace(/\s+/g, "-");
    if (tags.has(tag)) {
      issues.push(`Point ${tag} is listed twice; the second was skipped.`);
      continue;
    }
    const pos = Array.isArray(p.pos) && p.pos.length >= 2 && p.pos.every((v) => typeof v === "number") ? (p.pos as number[]) : null;
    let onId = p.on ? String(p.on) : undefined;
    if (onId && valveAt.has(slug(onId))) onId = valveAt.get(slug(onId))!.link;
    const item = onId ? byId.get(ref(onId) ?? "") : undefined;
    const link = onId && !item ? laidLinks.find((l) => l.id === slug(onId!) || l.id === onId || `${l.from}-${l.to}` === slug(onId!)) : undefined;
    const kind = p.kind ?? inferKind(tag, p.text);
    if (link || (!item && pos && !onId)) {
      // On a line: nearest point of its route.
      let target = link;
      let at: Pt | null = null;
      if (pos) {
        const near = nearestItem(pos[0], pos[1]);
        at = near ? toSheet(pos[0], pos[1], near) : null;
      }
      if (!target && at) {
        // No "on": nearest item outline or line, whichever is closer.
        const w = nearestItem(pos![0], pos![1])!;
        const dItem = distToBox(at, w.box);
        const nl = laidLinks.filter((l) => l.pts.length >= 2).map((l) => ({ l, d: nearestOnPolyline(l.pts, at!).d })).sort((a, b) => a.d - b.d)[0];
        if (!nl || dItem <= nl.d) {
          laidPoints.push(mountOnItem(tag, w, at, undefined, undefined, kind, p.text));
          tags.add(tag);
          continue;
        }
        target = nl.l;
      }
      if (target && target.pts.length < 2) {
        // A hand-over without a line: the sensor goes on the item it is delivered to.
        const w = byId.get(target.to);
        if (w) {
          laidPoints.push(mountOnItem(tag, w, at, undefined, undefined, kind, p.text));
          tags.add(tag);
        }
        continue;
      }
      if (!target) continue;
      const q = at ? nearestOnPolyline(target.pts, at) : pointAlong(target.pts, clamp(Number(p.at ?? 50), 0, 100) / 100, 14);
      const vertical = "vertical" in q ? q.vertical : false;
      const dir = vertical ? "right" : "up";
      const mount = q.p;
      const pad = mount; // house style: the ring sits on the line itself
      laidPoints.push({ tag, on: target.id, mount: rp(mount), dir, kind, pad: rp(pad), callout: [0, 0, "start"], text: p.text });
      tags.add(tag);
      continue;
    }
    let w = item;
    if (!w && onId) issues.push(`Point ${tag}: "on": "${onId}" is not an item or line id${pos ? "; placed on the nearest item to pos" : ""}.`);
    if (!w && pos) w = nearestItem(pos[0], pos[1]);
    if (!w) {
      issues.push(`Point ${tag}: give "on" (an item id) and "pos" ([x, y] where the sensor is in the image).`);
      continue;
    }
    const at = pos ? toSheet(pos[0], pos[1], w) : null;
    const side = p.side && ["top", "bottom", "left", "right", "inside"].includes(p.side) ? p.side : undefined;
    laidPoints.push(mountOnItem(tag, w, at, side, p.at, kind, p.text));
    tags.add(tag);
  }
  // Spread sensors that landed on top of each other along their side.
  for (let pass = 0; pass < 4; pass++)
    for (const a of laidPoints)
      for (const b of laidPoints) {
        if (a === b || a.dir !== b.dir) continue;
        const d = Math.hypot(a.pad[0] - b.pad[0], a.pad[1] - b.pad[1]);
        if (d >= 22) continue;
        const horiz = a.dir === "up" || a.dir === "down";
        const push = (22 - d) / 2 + 0.5;
        const sgn = (horiz ? a.pad[0] - b.pad[0] : a.pad[1] - b.pad[1]) >= 0 ? 1 : -1;
        for (const [pt, sg] of [[a, sgn], [b, -sgn]] as Array<[LaidPoint, number]>) {
          if (horiz) {
            pt.mount = [r1(pt.mount[0] + push * sg), pt.mount[1]];
            pt.pad = [r1(pt.pad[0] + push * sg), pt.pad[1]];
          } else {
            pt.mount = [pt.mount[0], r1(pt.mount[1] + push * sg)];
            pt.pad = [pt.pad[0], r1(pt.pad[1] + push * sg)];
          }
        }
      }
  // Value plate on the side with more free room.
  for (const p of laidPoints) {
    const free = (dirX: number) => {
      let d = dirX > 0 ? W - p.pad[0] : p.pad[0];
      for (const o of obstacles) {
        if (p.pad[1] < o.b.y - 8 || p.pad[1] > bottom(o.b) + 8) continue;
        const gap2 = dirX > 0 ? o.b.x - p.pad[0] : p.pad[0] - right(o.b);
        if (gap2 > 4 && gap2 < d) d = gap2;
      }
      return d;
    };
    const sideStart = free(1) >= free(-1);
    p.callout = [r1(p.pad[0] + (sideStart ? 12 : -12)), r1(p.pad[1]), sideStart ? "start" : "end"];
  }
  // Two pads side by side on one row: the left plate goes left, the right one right, so they do not cover each other.
  const PLATE = 96;
  for (const a of laidPoints)
    for (const b of laidPoints) {
      if (a === b || Math.abs(a.pad[1] - b.pad[1]) > 14 || a.pad[0] >= b.pad[0] || b.pad[0] - a.pad[0] > PLATE + 24) continue;
      if (a.callout[2] === "start") a.callout = [r1(a.pad[0] - 12), a.callout[1], "end"];
      if (b.callout[2] === "end") b.callout = [r1(b.pad[0] + 12), b.callout[1], "start"];
    }

  function mountOnItem(tag: string, w: Work, at: Pt | null, side: Side | "inside" | undefined, along: number | undefined, kind: LaidPoint["kind"], text?: string): LaidPoint {
    const b = w.box;
    const standing = w.floorY !== undefined || !!w.on;
    const sidesOk: Side[] = (["top", "left", "right", "bottom"] as Side[]).filter((sd) => !(sd === "bottom" && standing));
    let sd: Side | "inside";
    let m: Pt;
    if (side && side !== "inside") {
      sd = standing && side === "bottom" ? "top" : side;
      const f = clamp(Number(along ?? 50), 5, 95) / 100;
      m = sd === "top" || sd === "bottom" ? [b.x + b.w * f, sd === "top" ? b.y : bottom(b)] : [sd === "left" ? b.x : right(b), b.y + b.h * f];
    } else if (at) {
      const inside = at[0] > b.x && at[0] < right(b) && at[1] > b.y && at[1] < bottom(b);
      const dist: Record<Side, number> = { top: Math.abs(at[1] - b.y), bottom: Math.abs(bottom(b) - at[1]), left: Math.abs(at[0] - b.x), right: Math.abs(right(b) - at[0]) };
      const nearest = sidesOk.sort((p2, q) => dist[p2] - dist[q])[0];
      const deepInside = inside && !!CATALOG[w.type].hollow && dist[nearest] > 0.22 * Math.min(b.w, b.h);
      if (side === "inside" || deepInside) {
        sd = "inside";
        m = [clamp(at[0], b.x + b.w * 0.2, right(b) - b.w * 0.2), clamp(at[1], b.y + b.h * 0.25, bottom(b) - b.h * 0.15)];
      } else {
        sd = nearest;
        m = sd === "top" || sd === "bottom" ? [clamp(at[0], b.x + 8, right(b) - 8), sd === "top" ? b.y : bottom(b)] : [sd === "left" ? b.x : right(b), clamp(at[1], b.y + 8, bottom(b) - 8)];
      }
    } else {
      sd = side === "inside" ? "inside" : "top";
      m = sd === "inside" ? [cx(b), cy(b)] : [cx(b), b.y];
      if (!side) issues.push(`Point ${tag}: no "pos"; put on top of ${w.id}. Add "pos": [x, y] from the image.`);
    }
    const dir: LaidPoint["dir"] = sd === "inside" ? "up" : sd === "top" ? "up" : sd === "bottom" ? "down" : sd;
    if (sd === "inside") return { tag, on: w.id, mount: rp(m), dir: "up", kind: "probe", pad: rp(m), callout: [0, 0, "start"], text };
    // House style: the ring sits on the equipment, just inside its outline (no instrument on a stem).
    const inset = Math.min(11, (sd === "top" || sd === "bottom" ? b.h : b.w) * 0.25);
    const pad: Pt = sd === "top" ? [m[0], m[1] + inset] : sd === "bottom" ? [m[0], m[1] - inset] : sd === "left" ? [m[0] + inset, m[1]] : [m[0] - inset, m[1]];
    return { tag, on: w.id, mount: rp(m), dir, kind, pad: rp(pad), callout: [0, 0, "start"], text };
  }

  /* 9. labels ------------------------------------------------------- */
  const laidLabels: LaidLabel[] = [];
  const boxesForText: Box[] = [...obstacles.map((o) => o.b)];
  const textBox = (lb: LaidLabel): Box => {
    const w = labelWidth(lb.text);
    const x0 = lb.anchor === "middle" ? lb.x - w / 2 : lb.anchor === "end" ? lb.x - w : lb.x;
    return { x: x0, y: lb.y - LABEL_SIZE, w, h: LABEL_SIZE + 4 };
  };

  // Sensor value plates: the ring and its plate beside it (as the sheet draws them), to keep names off them.
  const plateBoxes: Box[] = laidPoints.map((p) => {
    const PW = PLATE;
    if (p.callout[0] === 0 && p.callout[1] === 0) return { x: p.pad[0] - 9, y: p.pad[1] - 9, w: 18, h: 18 };
    return p.callout[2] === "start" ? { x: p.pad[0] - 9, y: p.pad[1] - 10, w: PW + 21, h: 20 } : { x: p.pad[0] - PW - 12, y: p.pad[1] - 10, w: PW + 21, h: 20 };
  });
  // Flow names along their lines: on a run long enough, the spot and side clear of equipment, sensors, other lines and names.
  const flowBoxes: Box[] = [];
  {
    const segHits = (bx: Box, own: LaidLink) =>
      laidLinks.reduce((n, l) => {
        for (let i = 0; i < l.pts.length - 1; i++) {
          const [p, q] = [l.pts[i], l.pts[i + 1]];
          const sb: Box = { x: Math.min(p[0], q[0]) - 3, y: Math.min(p[1], q[1]) - 3, w: Math.abs(q[0] - p[0]) + 6, h: Math.abs(q[1] - p[1]) + 6 };
          if (xOverlap(sb, bx) > 0 && yOverlap(sb, bx) > 0) n += l === own ? 3 : 1;
        }
        return n;
      }, 0);
    for (const l of [...laidLinks].filter((x) => x.label && x.pts.length >= 2).sort((a, b) => b.label!.length - a.label!.length)) {
      const need = l.label!.length * 7.2 + 10;
      const tube = (l.duct ? 16 : ({ material: 0, "hot-gas": 15, gas: 7, air: 9, water: 7, steam: 7, oil: 5, vacuum: 7, power: 6, signal: 0 } as Record<Medium, number>)[l.medium]) / 2 + 9;
      let best: { at: { x: number; y: number; vertical: boolean }; b: Box; cost: number } | null = null;
      for (let i = 0; i < l.pts.length - 1; i++) {
        const [a, q] = [l.pts[i], l.pts[i + 1]];
        const L = Math.hypot(q[0] - a[0], q[1] - a[1]);
        if (L < need) continue;
        const vertical = Math.abs(q[1] - a[1]) > Math.abs(q[0] - a[0]);
        for (const t of [0.5, 0.35, 0.65, 0.2, 0.8]) {
          const mx = a[0] + (q[0] - a[0]) * t;
          const my = a[1] + (q[1] - a[1]) * t;
          // keep the text inside the run
          if (Math.min(t, 1 - t) * L < need / 2) continue;
          for (const side of [-1, 1]) {
            const at = vertical ? { x: mx + side * tube, y: my, vertical } : { x: mx, y: my + side * tube - (side > 0 ? -4 : 0), vertical };
            const bx: Box = vertical ? { x: at.x - 7, y: at.y - need / 2, w: 14, h: need } : { x: at.x - need / 2, y: at.y - 10, w: need, h: 13 };
            let cost = Math.abs(t - 0.5) * 4 + (side > 0 ? 1 : 0) + (L < need * 1.3 ? 3 : 0);
            for (const o of boxesForText) if (xOverlap(o, bx) > 0 && yOverlap(o, bx) > 0) cost += 20;
            for (const o of plateBoxes) if (xOverlap(o, bx) > 0 && yOverlap(o, bx) > 0) cost += 70;
            for (const o of flowBoxes) if (xOverlap(grow(o, 4), bx) > 0 && yOverlap(grow(o, 4), bx) > 0) cost += 40;
            cost += segHits(bx, l) * 10;
            if (bx.x < 12 || bx.y < 12 || right(bx) > W - 12) cost += 60;
            if (!best || cost < best.cost) best = { at, b: bx, cost };
          }
        }
      }
      if (best) {
        l.labelAt = { x: r1(best.at.x), y: r1(best.at.y), vertical: best.at.vertical };
        flowBoxes.push(best.b);
      }
    }
  }
  // Short names go on the equipment itself where it has a plain face (as C1–C6 on the pyro cyclones).
  const FACE: Partial<Record<ItemType, number>> = { cyclone: 0.24, tank: 0.42, silo: 0.38, "horizontal-tank": 0.42, hopper: 0.3, filter: 0.36, mixer: 0.45, drum: 0.27, chamber: 0.16, block: 0.5 };
  const inside = new Set<Work>();
  for (const w of items) {
    const f = FACE[w.type];
    if (!w.label || f === undefined || w.label.length > 10) continue;
    const need = labelWidth(w.label, 10) + 12;
    const faceW = w.type === "cyclone" ? w.box.w * 0.9 : w.type === "hopper" ? w.box.w * 0.7 : w.box.w;
    // A plain block (a cooler compartment, a housing) carries its name on its face, as the image writes it.
    if (faceW < need || w.box.h < (w.type === "block" ? 18 : 44)) continue;
    if (w.type === "block" && w.options.tone === "recess") continue;
    if (w.type === "chamber" && w.options.contents && w.options.contents !== "none") continue;
    // On the face where no sensor plate covers it (its usual height first, then a little lower or higher); otherwise beside the machine.
    const lb = [f, f + 0.14, f + 0.28, f - 0.1]
      .filter((g) => g > 0.08 && g < 0.92)
      .map((g): LaidLabel => ({ text: w.label!, x: r1(cx(w.box)), y: r1(w.box.y + w.box.h * g + 4), anchor: "middle", inside: true }))
      .find((c) => {
        const tb = textBox({ ...c, text: c.text.slice(0, Math.max(2, Math.round(c.text.length * 0.9))) });
        return !plateBoxes.some((o) => xOverlap(o, tb) > 0 && yOverlap(o, tb) > 0);
      });
    if (!lb) continue;
    inside.add(w);
    laidLabels.push(lb);
  }
  // Items standing on a floor are labelled in a row under it; mounted, stacked and hanging parts beside themselves.
  const floorLabelled = schematic ? [] : items.filter((w) => w.label && !inside.has(w) && !w.on && w.type !== "frame" && (w.floorY !== undefined || w.legsTo !== undefined));
  const byFloor = new Map<number, Work[]>();
  for (const w of floorLabelled) {
    const f = w.floorY ?? w.legsTo ?? bottom(w.box);
    const key = floorYs.find((y) => Math.abs(y - f) < 2) ?? f;
    byFloor.set(key, [...(byFloor.get(key) ?? []), w]);
  }
  for (const [f, ws] of byFloor) {
    const row = ws
      .map((w) => ({ w, x: cx(w.box), half: labelWidth(w.label!) / 2, row: 0 }))
      .sort((a, b) => a.x - b.x);
    for (let it = 0; it < 80; it++) {
      let moved = false;
      for (let i = 0; i < row.length - 1; i++) {
        const [a, b] = [row[i], row[i + 1]];
        if (a.row !== b.row) continue;
        const need = a.half + b.half + 14 - (b.x - a.x);
        if (need > 0) {
          a.x -= need / 2;
          b.x += need / 2;
          moved = true;
        }
      }
      for (const lb of row) lb.x = clamp(lb.x, 20 + lb.half, W - 20 - lb.half);
      if (!moved) break;
    }
    for (const lb of row) if (Math.abs(lb.x - cx(lb.w.box)) > Math.max(lb.w.box.w * 0.6, 30)) {
      lb.row = 1;
      lb.x = cx(lb.w.box);
    }
    for (const lb of row) {
      const y = f + 24 + lb.row * 17;
      laidLabels.push({ text: lb.w.label!, x: r1(lb.x), y: r1(y), anchor: "middle" });
      H = Math.max(H, Math.round(y + 26));
    }
  }
  const routeHits = (b: Box) =>
    laidLinks.reduce((n, l) => {
      for (let i = 0; i < l.pts.length - 1; i++) {
        const [p, q] = [l.pts[i], l.pts[i + 1]];
        const sb: Box = { x: Math.min(p[0], q[0]) - 5, y: Math.min(p[1], q[1]) - 5, w: Math.abs(q[0] - p[0]) + 10, h: Math.abs(q[1] - p[1]) + 10 };
        if (xOverlap(sb, b) > 0 && yOverlap(sb, b) > 0) n++;
      }
      return n;
    }, 0);
  // Parts of one machine (an assembly of 3+ parts) are named in a column beside it, each with a leader to its part, as on an
  // engineering drawing — so names never sit on top of other parts.
  const calledOut = new Set<Work>();
  if (!schematic)
    for (const ws of clusters) {
      if (ws.length < 3) continue;
      const named = ws.filter((w) => w.label && w.type !== "frame" && !floorLabelled.includes(w) && !inside.has(w));
      if (!named.length) continue;
      const bb = bbox(ws);
      const mid = cx(bb);
      for (const sideL of [true, false]) {
        const mine = named.filter((w) => (cx(w.box) < mid) === sideL).sort((a, b) => cy(a.box) - cy(b.box));
        // Each label at its part's height, pushed apart to one line each (from the top down, then back up if it ran out).
        const ys = mine.map((w) => cy(w.box) + 4);
        const GAP = LABEL_SIZE + 7;
        for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + GAP);
        const maxY = bottom(bb) - 4;
        if (ys.length && ys[ys.length - 1] > maxY) {
          ys[ys.length - 1] = maxY;
          for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - GAP);
        }
        const lx = sideL ? bb.x - 26 : right(bb) + 26;
        // The column must be clear: a line run or a sensor plate crossing the label's row leaves that name to the per-item placement.
        const rowBusy = (y: number, text: string) => {
          const wid = labelWidth(text);
          const tb: Box = sideL ? { x: lx - wid, y: y - LABEL_SIZE, w: wid + 8, h: LABEL_SIZE + 4 } : { x: lx - 8, y: y - LABEL_SIZE, w: wid + 8, h: LABEL_SIZE + 4 };
          if (routeHits(tb)) return true;
          return laidPoints.some((p) => Math.abs(p.pad[1] - cy(tb)) < 14 && p.pad[0] > tb.x - 110 && p.pad[0] < right(tb) + 110);
        };
        mine.forEach((w, i) => {
          const y = ys[i];
          if (rowBusy(y, w.label!)) return;
          const py = clamp(y - 4, w.box.y + Math.min(6, w.box.h / 2), bottom(w.box) - Math.min(6, w.box.h / 2));
          const px = sideL ? w.box.x + Math.min(10, w.box.w * 0.3) : right(w.box) - Math.min(10, w.box.w * 0.3);
          const elbow = sideL ? lx + 6 : lx - 6;
          laidLabels.push({ text: w.label!, x: r1(lx), y: r1(y), anchor: sideL ? "end" : "start", leader: [[r1(elbow + (sideL ? 4 : -4)), r1(y - 4)], [r1(px), r1(py)]] });
          calledOut.add(w);
        });
      }
    }
  const hit = (a: Box, b: Box) => xOverlap(a, b) > 0 && yOverlap(a, b) > 0;
  for (const w of items.filter((it) => it.label && it.type !== "frame" && !floorLabelled.includes(it) && !inside.has(it) && !calledOut.has(it))) {
    const b = w.box;
    const text = w.label!;
    // Around the machine, nearest first; further rings get a leader back to it.
    const cands: Array<{ lb: LaidLabel; pen: number }> = [];
    const rings = [14, 34, 62];
    rings.forEach((d, k) => {
      const pen = k * 6;
      if (schematic) cands.push({ lb: { text, x: cx(b), y: bottom(b) + d + 4, anchor: "middle" }, pen });
      cands.push(
        { lb: { text, x: b.x - d, y: cy(b) + 4, anchor: "end" }, pen: pen + 0.5 },
        { lb: { text, x: right(b) + d, y: cy(b) + 4, anchor: "start" }, pen: pen + 1 },
        { lb: { text, x: b.x - d, y: b.y + 16, anchor: "end" }, pen: pen + 1.5 },
        { lb: { text, x: right(b) + d, y: b.y + 16, anchor: "start" }, pen: pen + 2 },
        { lb: { text, x: cx(b), y: b.y - d + 2, anchor: "middle" }, pen: pen + 2.5 },
        { lb: { text, x: b.x - d, y: bottom(b) - 6, anchor: "end" }, pen: pen + 3 },
        { lb: { text, x: right(b) + d, y: bottom(b) - 6, anchor: "start" }, pen: pen + 3 },
      );
      if (!schematic) cands.push({ lb: { text, x: cx(b), y: bottom(b) + d + 4, anchor: "middle" }, pen: pen + 3.5 });
    });
    let best: { lb: LaidLabel; cost: number } | null = null;
    for (const { lb, pen } of cands) {
      const tb = grow(textBox(lb), 2);
      let cost = pen;
      for (const o of boxesForText) if (hit(o, tb)) cost += 20;
      for (const o of laidLabels) if (hit(grow(textBox(o), 3), tb)) cost += 40;
      for (const o of plateBoxes) if (hit(o, tb)) cost += 70;
      for (const o of flowBoxes) if (hit(grow(o, 3), tb)) cost += 40;
      cost += routeHits(tb) * 14;
      if (tb.x < 10 || right(tb) > W - 10 || tb.y < 8) cost += 60;
      // A name nearer to another machine than to its own reads as that machine's name.
      const gapTo = (o: Box) => Math.hypot(Math.max(0, o.x - right(tb), tb.x - right(o)), Math.max(0, o.y - bottom(tb), tb.y - bottom(o)));
      const own = gapTo(b);
      if (items.some((o) => o !== w && o.type !== "frame" && o.type !== "conveyor" && gapTo(o.box) + 2 < own)) cost += 35;
      if (!best || cost < best.cost) best = { lb, cost };
    }
    const lb = best!.lb;
    const tb = textBox(lb);
    // Away from its machine: a thin leader from the name to the machine's outline.
    const gap = Math.max(b.x - right(tb), tb.x - right(b), b.y - bottom(tb), tb.y - bottom(b));
    let leader: Pt[] | undefined;
    if (gap > 26) {
      const from: Pt = lb.anchor === "end" ? [right(tb) + 3, tb.y + tb.h / 2] : lb.anchor === "start" ? [tb.x - 3, tb.y + tb.h / 2] : [cx(tb), tb.y > bottom(b) ? tb.y - 2 : bottom(tb) + 2];
      const to: Pt = [clamp(from[0], b.x + 4, right(b) - 4), clamp(from[1], b.y + 4, bottom(b) - 4)];
      leader = [[r1(from[0]), r1(from[1])], [r1(to[0]), r1(to[1])]];
    }
    laidLabels.push({ ...lb, x: r1(lb.x), y: r1(lb.y), ...(leader ? { leader } : {}) });
  }

  for (const lb of laidLabels) H = Math.max(H, Math.round(lb.y + 24));
  // Widen the sheet (shifting the drawing right) when labels run past its edges.
  {
    const ext = laidLabels.map(textBox);
    const minX = Math.min(16, ...ext.map((b) => b.x));
    const dx = minX < 16 ? 16 - minX : 0;
    if (dx > 0) {
      for (const w of items) {
        w.box.x += dx;
      }
      for (const l of laidLinks) {
        l.pts = l.pts.map(([x, y]) => [r1(x + dx), y] as Pt);
        l.valves = l.valves.map((v) => ({ ...v, at: [r1(v.at[0] + dx), v.at[1]] as Pt }));
        if (l.labelAt) l.labelAt = { ...l.labelAt, x: r1(l.labelAt.x + dx) };
      }
      for (const p of laidPoints) {
        p.mount = [r1(p.mount[0] + dx), p.mount[1]];
        p.pad = [r1(p.pad[0] + dx), p.pad[1]];
        p.callout = [r1(p.callout[0] + dx), p.callout[1], p.callout[2]];
      }
      for (const lb of laidLabels) {
        lb.x = r1(lb.x + dx);
        if (lb.leader) lb.leader = lb.leader.map(([x, y]) => [r1(x + dx), y] as Pt);
      }
      W = Math.round(W + dx);
      shiftFloors = dx;
    }
    const maxX = Math.max(...ext.map((b) => right(b) + dx), 0);
    if (maxX > W - 16) W = Math.round(maxX + 16);
    // Lines (with the flow names written beside them), equipment and sensor plates near the edge widen / deepen it too.
    const reachX = Math.max(...items.map((w) => right(visual(w)) + 10), ...laidLinks.flatMap((l) => l.pts.map((q) => q[0] + 26)), ...laidPoints.map((q) => Math.max(q.pad[0], q.callout[0]) + 70), 0);
    if (reachX > W - 16) W = Math.round(reachX + 16);
    const reachY = Math.max(...items.map((w) => bottom(w.box) + 10), ...laidLinks.flatMap((l) => l.pts.map((q) => q[1] + 26)), ...laidPoints.map((q) => q.pad[1] + 24), 0);
    if (reachY > H - 16) H = Math.round(reachY + 16);
  }

  /* 10. machines drawn from their own picture ------------------------ */
  // Any assembly made only of shape parts (no finished catalog part fits it) is drawn from the image itself;
  // draw.mjs vectorizes its area and fills in `art`. Its parts' boxes still place its labels and sensors.
  const traced: TracedGroup[] = [];
  for (const ws of clusters) {
    // A machine built from parts: shape parts make up most of it (a motor or cabinet among them is part of the machine).
    const shapeArea = ws.filter((w) => SHAPE_PARTS.includes(w.type)).reduce((t, w) => t + w.orig.w * w.orig.h, 0);
    const allArea = ws.reduce((t, w) => t + w.orig.w * w.orig.h, 0);
    const builtFromParts = ws.every((w) => SHAPE_PARTS.includes(w.type)) || (ws.filter((w) => SHAPE_PARTS.includes(w.type)).length >= 2 && shapeArea >= 0.5 * allArea);
    if (!builtFromParts || ws.every((w) => w.type === "pile" || w.type === "workpiece")) continue;
    // A finished catalog part that is a big piece of the group (a kiln on block piers) keeps its own drawing.
    if (ws.some((w) => !SHAPE_PARTS.includes(w.type) && !PART.includes(w.type) && w.orig.w * w.orig.h >= 0.2 * allArea)) continue;
    const ob = bbox(ws.map((w) => ({ ...w, box: w.orig })));
    const sb = bbox(ws);
    traced.push({
      key: ws[0].id,
      ids: ws.map((w) => w.id),
      src: [r1(ob.x / kx), r1(ob.y / ky), r1(right(ob) / kx), r1(bottom(ob) / ky)],
      box: { x: r1(sb.x), y: r1(sb.y), w: r1(sb.w), h: r1(sb.h) },
      parts: ws.map((w) => ({ box: [r1(w.orig.x / kx), r1(w.orig.y / ky), r1(right(w.orig) / kx), r1(bottom(w.orig) / ky)] as [number, number, number, number], tone: String(w.options.tone ?? (w.type === "workpiece" ? "material" : "body")) })),
    });
  }

  /* 11. result ------------------------------------------------------ */
  const laidItems: LaidItem[] = items.map((w) => {
    let neck: Box | undefined;
    if (w.on && w.neckH > 1) {
      const s2 = byId.get(w.on)!;
      const nw = clamp(0.3 * Math.min(w.box.w, s2.box.w), 10, 80);
      neck = { x: r1(cx(w.box) - nw / 2), y: r1(bottom(w.box)), w: r1(nw), h: r1(w.neckH) };
    }
    return {
      id: w.id,
      type: w.type,
      box: { x: r1(w.box.x), y: r1(w.box.y), w: r1(w.box.w), h: r1(w.box.h) },
      label: w.label,
      on: w.on,
      neck,
      legs: w.legsTo !== undefined && w.legsTo - bottom(w.box) > 2 ? r1(w.legsTo) : undefined,
      floor: w.floorY !== undefined ? r1(w.floorY) : undefined,
      group: clusterOf(w).length > 1 ? find(w.id) : undefined,
      options: w.options,
    };
  });
  const floors = floorYs.map((y) => {
    const on = laidItems.filter((w) => (w.floor !== undefined && Math.abs(w.floor - y) < 1) || (w.legs !== undefined && Math.abs(w.legs - y) < 1));
    const lowestFloor = y === GROUND;
    const x1 = lowestFloor ? 40 + shiftFloors : Math.max(20, Math.min(...on.map((w) => w.box.x)) - 30);
    const x2 = lowestFloor ? W - 40 : Math.min(W - 20, Math.max(...on.map((w) => w.box.x + w.box.w)) + 30);
    return { y: r1(y), x1: r1(x1), x2: r1(x2) };
  });

  // 3D scale: a known height, else the median of typical heights.
  let mpu = 0;
  const sc = spec.scale && byId.get(ref(spec.scale.item) ?? "");
  if (sc && spec.scale!.metres > 0) mpu = spec.scale!.metres / sc.box.h;
  else {
    const ratios = items.filter((w) => !["conveyor", "frame", "valve"].includes(w.type)).map((w) => CATALOG[w.type].metres / w.box.h).sort((a, b) => a - b);
    mpu = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 0.005;
  }

  // Overlap check (should be none after repacking).
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const [a, b] = [items[i], items[j]];
      if (a.type === "frame" || b.type === "frame" || a.on === b.id || b.on === a.id || find(a.id) === find(b.id)) continue;
      const ov = solids(a).reduce((t, p) => t + solids(b).reduce((u, q) => u + xOverlap(p, q) * yOverlap(p, q), 0), 0);
      if (ov > 0.25 * Math.min(a.box.w * a.box.h, b.box.w * b.box.h)) issues.push(`Items "${a.id}" and "${b.id}" overlap. If one is mounted on the other, set "on"; otherwise check their boxes.`);
    }

  return {
    id: slug(spec.id ?? spec.name ?? "machine").replace(/_/g, "-"),
    name: String(spec.name ?? spec.id ?? "Machine"),
    width: W,
    height: H,
    ground: r1(GROUND),
    floors,
    items: laidItems,
    links: laidLinks,
    points: laidPoints,
    labels: laidLabels,
    traced,
    schematic: schematic || undefined,
    metresPerUnit: Math.round(mpu * 1e5) / 1e5,
    issues,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * The solid parts of an item (what other equipment and lines must keep clear
 * of): a drum is its shell and piers, an item on legs its body and legs — the
 * space under them stays usable.
 */
function solids(w: { type: ItemType; box: Box; legsTo?: number; options: ItemOptions }): Box[] {
  const b = w.box;
  const leg = (x: number, y0: number, y1: number): Box => ({ x: x - 5, y: y0, w: 10, h: Math.max(0, y1 - y0) });
  if (w.type === "drum") {
    const d = b.h * 0.5;
    const out: Box[] = [{ x: b.x, y: b.y, w: b.w, h: b.h * 0.56 }];
    for (const f of [0.18, 0.82]) out.push({ x: b.x + b.w * f - d * 0.45, y: b.y + b.h * 0.5, w: d * 0.9, h: b.h * 0.5 });
    return out;
  }
  if (w.type === "silo" || (w.type === "tank" && w.options.bottom === "cone")) {
    const lh = b.h * (w.type === "silo" ? 0.2 : 0.22);
    return [{ x: b.x, y: b.y, w: b.w, h: b.h - lh }, leg(b.x + b.w * 0.08, b.y + b.h - lh, b.y + b.h), leg(b.x + b.w * 0.92, b.y + b.h - lh, b.y + b.h)];
  }
  if (w.legsTo !== undefined && w.legsTo > b.y + b.h + 2) return [b, leg(b.x + b.w * 0.12, b.y + b.h, w.legsTo), leg(b.x + b.w * 0.88, b.y + b.h, w.legsTo)];
  return [b];
}

const rp = (p: Pt): Pt => [r1(p[0]), r1(p[1])];

/** Instrument head centre for a mount and direction (matches parts-2d `instrumentHead`). */
export function head(m: Pt, dir: LaidPoint["dir"]): Pt {
  const L = 16;
  return dir === "up" || dir === "top" ? [m[0], m[1] - L] : dir === "down" || dir === "bottom" ? [m[0], m[1] + L] : dir === "left" ? [m[0] - L, m[1]] : [m[0] + L, m[1]];
}

function inferKind(tag: string, text?: string): LaidPoint["kind"] {
  const s = `${tag} ${text ?? ""}`.toLowerCase();
  if (/temp|tmp|\btt|\bte\b|\btc\b|thermo/.test(s)) return "probe";
  if (/press|prs|\bpt|\bpi\b|vac|gauge/.test(s)) return "gauge";
  if (/pos|limit|switch|\blim|\bzs|\bsts|state|door|open|closed|level switch/.test(s)) return "switch";
  return "transmitter";
}

function simplify(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last[0] - p[0]) < 0.01 && Math.abs(last[1] - p[1]) < 0.01) continue;
    out.push(p);
  }
  for (let i = out.length - 2; i > 0; i--) {
    const [a, b, c] = [out[i - 1], out[i], out[i + 1]];
    if ((Math.abs(a[0] - b[0]) < 0.01 && Math.abs(b[0] - c[0]) < 0.01) || (Math.abs(a[1] - b[1]) < 0.01 && Math.abs(b[1] - c[1]) < 0.01)) out.splice(i, 1);
  }
  return out;
}

function distToBox(p: Pt, b: Box) {
  const dx = Math.max(b.x - p[0], 0, p[0] - (b.x + b.w));
  const dy = Math.max(b.y - p[1], 0, p[1] - (b.y + b.h));
  return Math.hypot(dx, dy);
}

function nearestOnPolyline(pts: Pt[], p: Pt): { p: Pt; d: number; vertical: boolean } {
  let best = { p: pts[0], d: Infinity, vertical: false };
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    const L2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 || 1;
    const t = clamp(((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / L2, 0.1, 0.9);
    const q: Pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < best.d) best = { p: q, d, vertical: Math.abs(b[0] - a[0]) < Math.abs(b[1] - a[1]) };
  }
  return best;
}

/** Point a share `t` of the way along a polyline, moved onto a straight run at least `keep` from its ends. */
function pointAlong(pts: Pt[], t: number, keep: number): { p: Pt; vertical: boolean } {
  const segs = pts.slice(0, -1).map((a, i) => ({ a, b: pts[i + 1], L: Math.hypot(pts[i + 1][0] - a[0], pts[i + 1][1] - a[1]) }));
  const total = segs.reduce((s, g) => s + g.L, 0);
  let want = t * total;
  let chosen = segs[0];
  let off = 0;
  for (const g of segs) {
    if (want <= g.L) {
      chosen = g;
      off = want;
      break;
    }
    want -= g.L;
    chosen = g;
    off = g.L;
  }
  if (!chosen) return { p: pts[0], vertical: false };
  // Too close to a bend: use the longest run instead when this one is short.
  if (chosen.L < 2 * keep + 4) {
    chosen = segs.reduce((a, b) => (b.L > a.L ? b : a));
    off = chosen.L / 2;
  }
  off = clamp(off, keep, Math.max(keep, chosen.L - keep));
  const f = chosen.L ? off / chosen.L : 0.5;
  return { p: [chosen.a[0] + (chosen.b[0] - chosen.a[0]) * f, chosen.a[1] + (chosen.b[1] - chosen.a[1]) * f], vertical: Math.abs(chosen.b[0] - chosen.a[0]) < Math.abs(chosen.b[1] - chosen.a[1]) };
}
