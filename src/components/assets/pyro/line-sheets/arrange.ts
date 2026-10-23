/**
 * Composed sheets the operator can re-arrange (PYR-0, the combined sheets):
 * each machine drawing is a piece with an offset from where the sheet places
 * it. A sheet is composed once per set of offsets (cached, so the same offsets
 * give the same drawing and its traced outline / busy map are reused), and a
 * process flow between two pieces keeps its drawn route while neither moves;
 * once one moves, the flow bends at its longest straight run to join the two.
 */
import type { ArrangePiece, LineSheetArt, PieceOffsets } from "./types";

type Pt = [number, number];

/** Offsets without zero moves, rounded to whole units, in a stable order. */
function clean(offsets: PieceOffsets): PieceOffsets {
  const out: PieceOffsets = {};
  for (const id of Object.keys(offsets).sort()) {
    const [dx, dy] = offsets[id];
    const r: [number, number] = [Math.round(dx), Math.round(dy)];
    if (r[0] || r[1]) out[id] = r;
  }
  return out;
}

/**
 * A composed sheet that can be re-arranged: `compose(offsets)` draws it with each
 * piece moved by its offset and lists the pieces where they now are.
 */
export function arrangeable(
  id: string,
  compose: (offsets: PieceOffsets) => { art: Omit<LineSheetArt, "id" | "arrange">; pieces: ArrangePiece[] },
): LineSheetArt {
  const cache = new Map<string, LineSheetArt>();
  const make = (offsets: PieceOffsets): LineSheetArt => {
    const off = clean(offsets);
    const key = Object.entries(off)
      .map(([k, [x, y]]) => `${k}:${x},${y}`)
      .join(";");
    const hit = cache.get(key);
    if (hit) return hit;
    const { art, pieces } = compose(off);
    // A moved sheet has its own id: the busy map and traced outline are cached per drawing.
    const out: LineSheetArt = { ...art, id: key ? `${id}~${key}` : id, arrange: { pieces, offsets: off, with: make } };
    if (cache.size > 24) cache.delete(cache.keys().next().value!);
    cache.set(key, out);
    return out;
  };
  return make({});
}

/** Offset of a piece, kept so the piece's `box` (at its unmoved place) stays at or right / below the sheet origin. */
export function clampOffset(offsets: PieceOffsets, id: string, box: [number, number, number, number]): [number, number] {
  const [dx, dy] = offsets[id] ?? [0, 0];
  return [Math.max(dx, -box[0]), Math.max(dy, -box[1])];
}

/**
 * A flow from piece A to piece B with A moved by `from` and B by `to`: the points
 * before its longest run move with A, the rest with B, and that run gets an
 * elbow (two corners half-way) where the two no longer line up. Arrows keep
 * their segments (the run's arrow goes on the elbow's middle segment).
 */
export function movedFlow(pts: Pt[], arrows: number[], from: [number, number], to: [number, number]): { pts: Pt[]; arrows: number[] } {
  const add = ([x, y]: Pt, [dx, dy]: [number, number]): Pt => [x + dx, y + dy];
  if (from[0] === to[0] && from[1] === to[1]) return { pts: pts.map((p) => add(p, from)), arrows };
  let split = 0;
  let longest = -1;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (l > longest) {
      longest = l;
      split = i;
    }
  }
  const a = pts.slice(0, split + 1).map((p) => add(p, from));
  const b = pts.slice(split + 1).map((p) => add(p, to));
  const p = a[a.length - 1];
  const q = b[0];
  const horizontal = Math.abs(pts[split][1] - pts[split + 1][1]) <= Math.abs(pts[split][0] - pts[split + 1][0]);
  let mid: Pt[] = [];
  if (horizontal && p[1] !== q[1]) {
    const mx = (p[0] + q[0]) / 2;
    mid = [[mx, p[1]], [mx, q[1]]];
  } else if (!horizontal && p[0] !== q[0]) {
    const my = (p[1] + q[1]) / 2;
    mid = [[p[0], my], [q[0], my]];
  }
  const n = mid.length;
  return {
    pts: [...a, ...mid, ...b],
    arrows: arrows.map((k) => (k < split ? k : k === split ? split + n / 2 : k + n)),
  };
}

/** A flow label between two pieces moves by the mean of their offsets. */
export function movedLabel(x: number, y: number, from: [number, number], to: [number, number]): Pt {
  return [x + (from[0] + to[0]) / 2, y + (from[1] + to[1]) / 2];
}
