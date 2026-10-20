/**
 * The pure half of `art-outline.ts`: morphology and boundary tracing of a
 * binary raster. No DOM, so it also runs in `art-outline.worker.ts`.
 */

export type Polyline = { pts: number[]; box: [number, number, number, number] };

export interface OutlineOptions {
  /** Pixels per sheet unit of the raster. */
  scale: number;
  /** Gaps narrower than 2 × close (sheet units) are filled. */
  close: number;
  /** Features thinner than 2 × open (sheet units) are dropped. */
  open: number;
  /** Distance of the outline from the equipment (sheet units). */
  offset: number;
}

export type TraceRequest = { mask: Uint8Array; w: number; h: number; opts: OutlineOptions };

/* ── Morphology (exact Euclidean distance transform, Felzenszwalb–Huttenlocher) ── */

const INF = 1e20;

function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Squared distance of every pixel to the nearest pixel where `on(i)` is true. */
function sqDist(w: number, h: number, on: (i: number) => boolean): Float64Array {
  const out = new Float64Array(w * h);
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = on(y * w + x) ? 0 : INF;
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) out[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) f[x] = out[row + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) out[row + x] = d[x];
  }
  return out;
}

const dilate = (m: Uint8Array, w: number, h: number, r: number) => {
  const d = sqDist(w, h, (i) => m[i] === 1);
  const out = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) out[i] = d[i] <= r * r ? 1 : 0;
  return out;
};
const erode = (m: Uint8Array, w: number, h: number, r: number) => {
  const d = sqDist(w, h, (i) => m[i] === 0);
  const out = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) out[i] = d[i] > r * r ? 1 : 0;
  return out;
};

/* ── Trace ──────────────────────────────────────────────────────────────── */

export function trace(raw: Uint8Array, w: number, h: number, { scale, close, open, offset }: OutlineOptions): Polyline[] {
  let m = raw;
  if (close > 0) m = erode(dilate(m, w, h, close * scale), w, h, close * scale);
  // Opening's dilation and the offset combine into one (disc ⊕ disc = larger disc).
  if (open > 0) m = erode(m, w, h, open * scale);
  if (open + offset > 0) m = dilate(m, w, h, (open + offset) * scale);
  return marchingSquares(m, w, h).map((pts) => {
    const s = simplify(pts, 1).map((p) => p / scale);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < s.length; i += 2) {
      x0 = Math.min(x0, s[i]);
      x1 = Math.max(x1, s[i]);
      y0 = Math.min(y0, s[i + 1]);
      y1 = Math.max(y1, s[i + 1]);
    }
    return { pts: s, box: [x0, y0, x1 - x0, y1 - y0] as [number, number, number, number] };
  });
}

/** Boundary of the 1-pixels as closed polylines (flat x, y arrays, pixel units). */
function marchingSquares(m: Uint8Array, w: number, h: number): number[][] {
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? m[y * w + x] : 0);
  // Edge midpoints are keyed by an integer: horizontal edges 2·(y·(w+2)+x), vertical +1.
  const W = w + 2;
  const hKey = (x: number, y: number) => 2 * ((y + 1) * W + (x + 1));
  const vKey = (x: number, y: number) => 2 * ((y + 1) * W + (x + 1)) + 1;
  const next = new Map<number, number>();
  const link = (a: number, b: number) => next.set(a, b);
  // Cell (x, y) spans pixel centres (x, y)…(x+1, y+1); edges: top hKey(x,y), bottom hKey(x,y+1), left vKey(x,y), right vKey(x+1,y).
  for (let y = -1; y < h; y++) {
    for (let x = -1; x < w; x++) {
      const tl = at(x, y), tr = at(x + 1, y), br = at(x + 1, y + 1), bl = at(x, y + 1);
      const c = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (c === 0 || c === 15) continue;
      const T = hKey(x, y), B = hKey(x, y + 1), L = vKey(x, y), R = vKey(x + 1, y);
      // Directed so that the filled side is on the right.
      switch (c) {
        case 1: link(L, B); break;
        case 2: link(B, R); break;
        case 3: link(L, R); break;
        case 4: link(R, T); break;
        case 5: link(L, T); link(R, B); break;
        case 6: link(B, T); break;
        case 7: link(L, T); break;
        case 8: link(T, L); break;
        case 9: link(T, B); break;
        case 10: link(T, R); link(B, L); break;
        case 11: link(T, R); break;
        case 12: link(R, L); break;
        case 13: link(R, B); break;
        case 14: link(B, L); break;
      }
    }
  }
  const point = (key: number): [number, number] => {
    const vert = key & 1;
    const cell = key >> 1;
    const x = (cell % W) - 1;
    const y = Math.floor(cell / W) - 1;
    // Pixel centres sit at +0.5; an edge midpoint is half a pixel along the edge.
    return vert ? [x + 0.5, y + 1] : [x + 1, y + 0.5];
  };
  const out: number[][] = [];
  const seen = new Set<number>();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const pts: number[] = [];
    let k: number | undefined = start;
    while (k !== undefined && !seen.has(k)) {
      seen.add(k);
      const [px, py] = point(k);
      pts.push(px, py);
      k = next.get(k);
    }
    if (pts.length >= 8) {
      pts.push(pts[0], pts[1]);
      out.push(pts);
    }
  }
  return out;
}

/** Ramer–Douglas–Peucker on a flat x, y array; a closed loop is split at its farthest point first. */
function simplify(pts: number[], tol: number): number[] {
  const n = pts.length / 2;
  if (n <= 2) return pts;
  if (pts[0] === pts[pts.length - 2] && pts[1] === pts[pts.length - 1]) {
    let far = 0, farD = -1;
    for (let i = 1; i < n - 1; i++) {
      const d = (pts[2 * i] - pts[0]) ** 2 + (pts[2 * i + 1] - pts[1]) ** 2;
      if (d > farD) {
        farD = d;
        far = i;
      }
    }
    if (far === 0) return pts;
    const a = simplifyOpen(pts.slice(0, 2 * far + 2), tol);
    const b = simplifyOpen(pts.slice(2 * far), tol);
    return a.concat(b.slice(2));
  }
  return simplifyOpen(pts, tol);
}

function simplifyOpen(pts: number[], tol: number): number[] {
  const n = pts.length / 2;
  if (n <= 2) return pts;
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack: Array<[number, number]> = [[0, n - 1]];
  const t2 = tol * tol;
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const ax = pts[2 * a], ay = pts[2 * a + 1], bx = pts[2 * b], by = pts[2 * b + 1];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    let best = -1, bestD = t2;
    for (let i = a + 1; i < b; i++) {
      const px = pts[2 * i] - ax, py = pts[2 * i + 1] - ay;
      const cross = px * dy - py * dx;
      const d = (cross * cross) / len2;
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[2 * i], pts[2 * i + 1]);
  return out;
}
