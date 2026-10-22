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
import type { Box, DiagramSpec, ItemOptions, ItemType, LaidItem, LaidLabel, LaidLink, LaidPoint, Layout, Medium, Pt, Side, SpecLink, Trace, ValveKind } from "./types";

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
  trace?: Trace;
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

export function layoutSpec(spec: DiagramSpec, image?: { width: number; height: number }, traces: Record<string, Trace> = {}): Layout {
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
      trace: traces[String(raw.id)] && (t === "machine" || !t || raw.options?.trace) ? traces[String(raw.id)] : undefined,
      neckH: 0,
    });
  }
  const byId = new Map(items.map((w) => [w.id, w]));
  const ref = (s: string | undefined) => (s === undefined ? undefined : (ids.get(s) ?? ids.get(slug(s)) ?? (byId.has(slug(s)) ? slug(s) : undefined)));
  if (!items.length) issues.push("The spec has no items: list every machine in the image under \"items\".");

  /* links (parsed early: valve items fold into them) */
  const links: Array<{ id: string; from: string; to: string; medium: Medium; duct: boolean; valves: Array<{ kind: ValveKind; at: number; id?: string }> }> = [];
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
    links.push({ id, from, to, medium: m ?? "water", duct: !!raw.duct, valves });
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
  if (spec.layout === undefined && !(Array.isArray(spec.floors) && spec.floors.length) && items.length >= 12) {
    const bots = items.map((w) => bottom(w.orig) / IH).sort((a, b) => a - b);
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
    if (w.type === "conveyor" || w.type === "frame" || w.trace || !single(w)) continue;
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
  const riders = (w: Work): Work[] => items.filter((o) => o.on === w.id).flatMap((o) => [o, ...riders(o)]);
  for (const w of [...items].sort((a, b) => depth(a) - depth(b))) {
    if (!w.on || schematic) continue;
    const s = byId.get(w.on)!;
    if (s.type === "frame") continue;
    const gap = s.box.y - bottom(w.box);
    const cap = 0.5 * Math.min(w.box.h, s.box.h);
    const dy = gap < 0.015 * IH ? gap : gap > cap ? gap - cap : 0;
    const dxc = Math.abs(cx(w.box) - cx(s.box)) < 0.08 * s.box.w ? cx(s.box) - cx(w.box) : 0;
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
  const standsOnFloor = (ws: Work[]) => ws.some((w) => CATALOG[w.type].floor && w.type !== "conveyor") && !(ws.length === 1 && ws[0].options.elevated);
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
    // Push overlapping assemblies apart along the shorter way out.
    const pad = 0.012 * Math.min(IW, IH);
    for (let it = 0; it < 60; it++) {
      let moved = false;
      for (let i = 0; i < clusters.length; i++)
        for (let j = i + 1; j < clusters.length; j++) {
          const A = bbox(clusters[i]);
          const B = bbox(clusters[j]);
          const ox2 = Math.min(right(A), right(B)) - Math.max(A.x, B.x) + pad;
          const oy2 = Math.min(bottom(A), bottom(B)) - Math.max(A.y, B.y) + pad;
          if (ox2 <= 0 || oy2 <= 0) continue;
          moved = true;
          const alongX = ox2 < oy2;
          const d = (alongX ? ox2 : oy2) / 2 + 0.5;
          const sgn = alongX ? (cx(A) <= cx(B) ? 1 : -1) : cy(A) <= cy(B) ? 1 : -1;
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
    w.neckH = s && s.type !== "frame" && !schematic ? Math.max(0, s.box.y - bottom(w.box)) : 0;
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
  const W = Math.round(Math.max(960, contentW + 2 * M));
  const ox = (W - contentW) / 2;
  const H0 = Math.round(all.h * s + M + LB);
  const X = (x: number) => ox + (x - all.x) * s;
  const Y = (y: number) => M + (y - all.y) * s;
  const tf = (b: Box): Box => ({ x: X(b.x), y: Y(b.y), w: b.w * s, h: b.h * s });
  for (const w of items) {
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
  function astar(start: [number, number], sd: number, goal: [number, number], gd: number, own: Set<number>, soft = false): { cells: Array<[number, number]>; cost: number } | null {
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

  const ORDER: Medium[] = ["material", "hot-gas", "power", "water", "vacuum", "gas", "air", "steam", "oil", "signal"];
  const laidLinks: LaidLink[] = [];
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
    for (const soft of [false, true]) {
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
    if (best) {
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
    laidLinks.push({ id: l.id, from: l.from, to: l.to, medium: l.medium, duct: l.duct, pts: pts.map(([x, y]) => [r1(x), r1(y)] as Pt), valves: valves.map((v) => ({ ...v, at: [r1(v.at[0]), r1(v.at[1])] as Pt })) });
  }

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
  // Short names go on the equipment itself where it has a plain face (as C1–C6 on the pyro cyclones).
  const FACE: Partial<Record<ItemType, number>> = { cyclone: 0.24, tank: 0.42, silo: 0.38, "horizontal-tank": 0.42, hopper: 0.3, filter: 0.36, mixer: 0.45, drum: 0.27, chamber: 0.16 };
  const inside = new Set<Work>();
  for (const w of items) {
    const f = FACE[w.type];
    if (!w.label || f === undefined || w.label.length > 10) continue;
    const need = labelWidth(w.label, 10) + 12;
    const faceW = w.type === "cyclone" ? w.box.w * 0.9 : w.type === "hopper" ? w.box.w * 0.7 : w.box.w;
    if (faceW < need || w.box.h < 44) continue;
    if (w.type === "chamber" && w.options.contents && w.options.contents !== "none") continue;
    inside.add(w);
    laidLabels.push({ text: w.label, x: r1(cx(w.box)), y: r1(w.box.y + w.box.h * f + 4), anchor: "middle", inside: true });
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
  const textBox = (lb: LaidLabel): Box => {
    const w = labelWidth(lb.text);
    const x0 = lb.anchor === "middle" ? lb.x - w / 2 : lb.anchor === "end" ? lb.x - w : lb.x;
    return { x: x0, y: lb.y - LABEL_SIZE, w, h: LABEL_SIZE + 4 };
  };
  const routeHits = (b: Box) =>
    laidLinks.reduce((n, l) => {
      for (let i = 0; i < l.pts.length - 1; i++) {
        const [p, q] = [l.pts[i], l.pts[i + 1]];
        const sb: Box = { x: Math.min(p[0], q[0]) - 5, y: Math.min(p[1], q[1]) - 5, w: Math.abs(q[0] - p[0]) + 10, h: Math.abs(q[1] - p[1]) + 10 };
        if (xOverlap(sb, b) > 0 && yOverlap(sb, b) > 0) n++;
      }
      return n;
    }, 0);
  for (const w of items.filter((it) => it.label && it.type !== "frame" && !floorLabelled.includes(it) && !inside.has(it))) {
    const b = w.box;
    const cands: LaidLabel[] = [
      ...(schematic ? [{ text: w.label!, x: cx(b), y: bottom(b) + 18, anchor: "middle" as const }] : []),
      { text: w.label!, x: b.x - 16, y: cy(b) + 4, anchor: "end" },
      { text: w.label!, x: right(b) + 16, y: cy(b) + 4, anchor: "start" },
      { text: w.label!, x: b.x - 16, y: b.y + 16, anchor: "end" },
      { text: w.label!, x: right(b) + 16, y: b.y + 16, anchor: "start" },
      { text: w.label!, x: cx(b), y: b.y - 12, anchor: "middle" },
    ];
    let best: { lb: LaidLabel; cost: number } | null = null;
    cands.forEach((lb, i) => {
      const tb = textBox(lb);
      let cost = i * 0.5;
      for (const o of boxesForText) if (xOverlap(o, tb) > 0 && yOverlap(o, tb) > 0) cost += 20;
      for (const o of laidLabels) if (xOverlap(textBox(o), tb) > 0 && yOverlap(textBox(o), tb) > 0) cost += 30;
      for (const p of laidPoints) if (p.pad[0] > tb.x - 10 && p.pad[0] < right(tb) + 10 && Math.abs(p.pad[1] - cy(tb)) < 14) cost += 8;
      cost += routeHits(tb) * 4;
      if (tb.x < 10 || right(tb) > W - 10) cost += 50;
      if (!best || cost < best.cost) best = { lb, cost };
    });
    laidLabels.push({ ...best!.lb, x: r1(best!.lb.x), y: r1(best!.lb.y) });
  }

  for (const lb of laidLabels) H = Math.max(H, Math.round(lb.y + 24));

  /* 10. result ------------------------------------------------------ */
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
      options: w.options,
      trace: w.trace,
    };
  });
  const floors = floorYs.map((y) => {
    const on = laidItems.filter((w) => (w.floor !== undefined && Math.abs(w.floor - y) < 1) || (w.legs !== undefined && Math.abs(w.legs - y) < 1));
    const lowestFloor = y === GROUND;
    const x1 = lowestFloor ? 40 : Math.max(20, Math.min(...on.map((w) => w.box.x)) - 30);
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
