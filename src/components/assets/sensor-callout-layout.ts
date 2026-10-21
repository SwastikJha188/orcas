/** Place live sensor value pills directly at each sensor's mapped dot with zero overlaps. */
export interface SensorCallout {
  tag: string;
  px: number;
  py: number;
  label: string;
  w: number;
  baseW?: number;
  h: number;
  cx: number;
  cy: number;
  /** Embedded plate: the block wraps its pad and runs to the right ("r") or left ("l") of it; no leader. */
  side?: "l" | "r";
  /** Embedded plate: centre of the text part (the pad end holds the pad). */
  textCx?: number;
}

export interface SensorCalloutOptions {
  cardH?: number;
  padR?: number;
  gapX?: number;
  gapY?: number;
}

export function layoutSensorCallouts(
  points: Array<Pick<SensorCallout, "tag" | "px" | "py" | "label" | "w" | "baseW">>,
  artBox: [number, number, number, number],
  options?: SensorCalloutOptions,
): { callouts: SensorCallout[]; viewBox: [number, number, number, number] } {
  const [x, y, width, height] = artBox;
  if (points.length === 0) {
    return { callouts: [], viewBox: [x, y, width, height] };
  }

  const dense = points.length > 40;
  const cardH = options?.cardH ?? (dense ? 14.5 : 16);
  const padR = options?.padR ?? (dense ? 4.5 : 5.5);
  const gapX = options?.gapX ?? 4;
  const gapY = options?.gapY ?? 3;
  const dy1 = padR + cardH / 2 + 2;
  const dy2 = dy1 + cardH + gapY;
  const dy3 = dy2 + cardH + gapY;

  const overlapsDot = (cx: number, cy: number, w: number, h: number): boolean => {
    const halfW = w / 2 + padR + 1.5;
    const halfH = h / 2 + padR + 1.5;
    for (const pt of points) {
      if (Math.abs(cx - pt.px) < halfW && Math.abs(cy - pt.py) < halfH) {
        return true;
      }
    }
    return false;
  };

  const overlapsPlaced = (cx: number, cy: number, w: number, h: number, placed: SensorCallout[]): number => {
    let pen = 0;
    for (const o of placed) {
      const ow = o.baseW ?? o.w;
      const ox = (w + ow) / 2 + gapX - Math.abs(cx - o.cx);
      const oy = (h + o.h) / 2 + gapY - Math.abs(cy - o.cy);
      if (ox > 0 && oy > 0) {
        pen += ox * oy;
      }
    }
    return pen;
  };

  // Order points by local crowding (most crowded placed carefully along their cluster order)
  const order = points
    .map((p, idx) => {
      let neighbors = 0;
      for (const o of points) {
        if (o.tag !== p.tag && Math.hypot(o.px - p.px, o.py - p.py) < 65) neighbors++;
      }
      return { idx, p, neighbors };
    })
    .sort((a, b) => b.neighbors - a.neighbors || a.p.py - b.p.py || a.p.px - b.p.px);

  const placedByIdx = new Map<number, SensorCallout>();
  const placedList: SensorCallout[] = [];

  for (const { idx, p } of order) {
    const w = p.baseW ?? p.w;
    const h = cardH;
    const sideX = w / 2 + padR + 3.5;

    // Candidate slots around the dot, ordered from closest (directly on top of dot) outward
    const candidates: Array<[number, number, number]> = [
      // Ring 1: directly above, below, left, right, and slight horizontal shifts
      [p.px, p.py - dy1, 0],
      [p.px, p.py + dy1, 4],
      [p.px - w * 0.35, p.py - dy1, 8],
      [p.px + w * 0.35, p.py - dy1, 8],
      [p.px - w * 0.35, p.py + dy1, 11],
      [p.px + w * 0.35, p.py + dy1, 11],
      [p.px - sideX, p.py, 12],
      [p.px + sideX, p.py, 12],
      [p.px - sideX, p.py - dy1 * 0.65, 15],
      [p.px + sideX, p.py - dy1 * 0.65, 15],
      [p.px - sideX, p.py + dy1 * 0.65, 16],
      [p.px + sideX, p.py + dy1 * 0.65, 16],
      [p.px - w * 0.75, p.py - dy1, 18],
      [p.px + w * 0.75, p.py - dy1, 18],
      [p.px - w * 0.75, p.py + dy1, 20],
      [p.px + w * 0.75, p.py + dy1, 20],
      // Ring 2: second tier above / below for dense clusters
      [p.px, p.py - dy2, 24],
      [p.px, p.py + dy2, 26],
      [p.px - w * 0.5, p.py - dy2, 29],
      [p.px + w * 0.5, p.py - dy2, 29],
      [p.px - w * 0.5, p.py + dy2, 31],
      [p.px + w * 0.5, p.py + dy2, 31],
      [p.px - w, p.py - dy2, 35],
      [p.px + w, p.py - dy2, 35],
      [p.px - w, p.py + dy2, 37],
      [p.px + w, p.py + dy2, 37],
      // Ring 3: third tier for 6+ sensor arrays
      [p.px, p.py - dy3, 42],
      [p.px, p.py + dy3, 44],
      [p.px - w * 0.6, p.py - dy3, 47],
      [p.px + w * 0.6, p.py - dy3, 47],
      [p.px - w * 0.6, p.py + dy3, 49],
      [p.px + w * 0.6, p.py + dy3, 49],
    ];

    let bestCx = p.px;
    let bestCy = p.py - dy1;
    let bestScore = Infinity;

    for (const [cx, cy, bias] of candidates) {
      const dotHit = overlapsDot(cx, cy, w, h) ? 500_000 : 0;
      const pillPen = overlapsPlaced(cx, cy, w, h, placedList) * 1_000;
      const score = dotHit + pillPen + bias + Math.hypot(cx - p.px, cy - p.py) * 0.25;
      if (score < bestScore) {
        bestScore = score;
        bestCx = cx;
        bestCy = cy;
        if (dotHit === 0 && pillPen === 0 && bias === 0) break;
      }
    }

    const item: SensorCallout = {
      ...p,
      h,
      cx: bestCx,
      cy: bestCy,
    };
    placedByIdx.set(idx, item);
    placedList.push(item);
  }

  const items: SensorCallout[] = points.map((_, idx) => placedByIdx.get(idx)!);

  // Hard-constraint relaxation pass using baseW so hover expansion never shifts pill slots
  if (items.length > 1) {
    for (let iter = 0; iter < 90; iter++) {
      let moved = false;

      // 1. Strictly separate any overlapping pills
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i];
          const b = items[j];
          const aw = a.baseW ?? a.w;
          const bw = b.baseW ?? b.w;
          const ox = (aw + bw) / 2 + gapX - Math.abs(a.cx - b.cx);
          const oy = (a.h + b.h) / 2 + gapY - Math.abs(a.cy - b.cy);
          if (ox > 0 && oy > 0) {
            moved = true;
            if (ox * 0.55 < oy) {
              const dir = a.cx < b.cx || (a.cx === b.cx && (a.px < b.px || i < j)) ? -1 : 1;
              const push = ox * 0.55;
              a.cx += dir * push;
              b.cx -= dir * push;
            } else {
              const dir = a.cy < b.cy || (a.cy === b.cy && (a.py < b.py || i < j)) ? -1 : 1;
              const push = oy * 0.55;
              a.cy += dir * push;
              b.cy -= dir * push;
            }
          }
        }
      }

      // 2. Strictly keep every pill off every sensor dot
      for (const it of items) {
        const itW = it.baseW ?? it.w;
        const halfW = itW / 2 + padR + 1.2;
        const halfH = it.h / 2 + padR + 1.2;
        for (const pt of points) {
          const dx = it.cx - pt.px;
          const dy = it.cy - pt.py;
          const ox = halfW - Math.abs(dx);
          const oy = halfH - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            moved = true;
            if (oy <= ox) {
              it.cy += (dy < 0 ? -1 : 1) * (oy + 0.5);
            } else {
              it.cx += (dx < 0 ? -1 : 1) * (ox + 0.5);
            }
          }
        }
      }

      if (!moved) break;
    }
  }

  let minX = x;
  let maxX = x + width;
  let minY = y;
  let maxY = y + height;
  for (const c of items) {
    const bw = c.baseW ?? c.w;
    minX = Math.min(minX, c.cx - bw / 2 - 6);
    maxX = Math.max(maxX, c.cx + bw / 2 + 6);
    minY = Math.min(minY, c.cy - c.h / 2 - 6);
    maxY = Math.max(maxY, c.cy + c.h / 2 + 6);
  }

  // Keep expanded pills anchored cleanly and clamped inside the fixed viewBox so the machine never shifts
  const availW = maxX - minX - 8;
  for (const c of items) {
    const bw = c.baseW ?? c.w;
    if (c.w > bw) {
      if (Math.abs(c.cy - c.py) < padR + c.h / 2) {
        c.cx += (c.cx < c.px ? -1 : 1) * ((c.w - bw) / 2);
      }
      if (availW > 0) {
        if (c.w >= availW) {
          c.cx = (minX + maxX) / 2;
        } else {
          const lo = minX + 4 + c.w / 2;
          const hi = maxX - 4 - c.w / 2;
          c.cx = Math.max(lo, Math.min(hi, c.cx));
        }
      }
    }
  }

  return {
    callouts: items,
    viewBox: [minX, minY, maxX - minX, maxY - minY],
  };
}

/** Hairline from pad edge to the nearest edge of a displaced callout pill, or null when adjacent. */
export function calloutLeaderPath(c: SensorCallout, padR = 6): string | null {
  const halfW = c.w / 2;
  const halfH = c.h / 2;
  const ex = Math.min(c.cx + halfW, Math.max(c.cx - halfW, c.px));
  const ey = Math.min(c.cy + halfH, Math.max(c.cy - halfH, c.py));
  const distToBox = Math.hypot(ex - c.px, ey - c.py);
  if (distToBox <= padR + 4.5) return null;
  const len = distToBox || 1;
  const sx = c.px + ((ex - c.px) / len) * (padR + 0.5);
  const sy = c.py + ((ey - c.py) / len) * (padR + 0.5);
  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

/** Authored value-block slot: [x, y, anchor] (x = left edge, right edge or centre; y = centre). */
export type AuthoredCallout = [number, number, "start" | "middle" | "end"];

/**
 * Value blocks at authored slots (a sheet's `callouts`): each block keeps its
 * anchor edge where the drawing put it; blocks that collide (values are wider
 * than the printed labels) are nudged apart, rows first, and kept off the
 * pads. Points without a slot sit centred above their pad.
 */
export function layoutAuthoredCallouts(
  points: Array<Pick<SensorCallout, "tag" | "px" | "py" | "label" | "w">>,
  slots: Record<string, AuthoredCallout>,
  artBox: [number, number, number, number],
  options: { cardH: number; padR: number; gapX?: number; gapY?: number; margin?: number },
): { callouts: SensorCallout[]; viewBox: [number, number, number, number] } {
  const { cardH, padR } = options;
  const gapX = options.gapX ?? 4;
  const gapY = options.gapY ?? 3;
  const items: SensorCallout[] = points.map((p) => {
    const s = slots[p.tag];
    const cx = !s ? p.px : s[2] === "start" ? s[0] + p.w / 2 : s[2] === "end" ? s[0] - p.w / 2 : s[0];
    const cy = s ? s[1] : p.py - padR - cardH / 2 - 3;
    return { ...p, baseW: p.w, h: cardH, cx, cy };
  });

  for (let iter = 0; iter < 80; iter++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const ox = (a.w + b.w) / 2 + gapX - Math.abs(a.cx - b.cx);
        const oy = (a.h + b.h) / 2 + gapY - Math.abs(a.cy - b.cy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        // Slight side overlaps slide sideways; stacked blocks move apart vertically.
        if (ox < Math.min(a.w, b.w) * 0.3) {
          const dir = a.cx <= b.cx ? -1 : 1;
          a.cx += (dir * ox) / 2 + dir * 0.25;
          b.cx -= (dir * ox) / 2 + dir * 0.25;
        } else {
          const dir = a.cy < b.cy || (a.cy === b.cy && a.py <= b.py) ? -1 : 1;
          a.cy += (dir * oy) / 2 + dir * 0.25;
          b.cy -= (dir * oy) / 2 + dir * 0.25;
        }
      }
    }
    for (const it of items) {
      for (const pt of points) {
        const ox = it.w / 2 + padR + 1 - Math.abs(it.cx - pt.px);
        const oy = it.h / 2 + padR + 1 - Math.abs(it.cy - pt.py);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (oy <= ox) it.cy += (it.cy < pt.py ? -1 : 1) * (oy + 0.5);
        else it.cx += (it.cx < pt.px ? -1 : 1) * (ox + 0.5);
      }
    }
    if (!moved) break;
  }

  const m = options.margin ?? 6;
  const [x0, y0, w, h] = artBox;
  let minX = x0;
  let minY = y0;
  let maxX = x0 + w;
  let maxY = y0 + h;
  for (const c of items) {
    minX = Math.min(minX, c.cx - c.w / 2 - m);
    maxX = Math.max(maxX, c.cx + c.w / 2 + m);
    minY = Math.min(minY, c.cy - c.h / 2 - m);
    maxY = Math.max(maxY, c.cy + c.h / 2 + m);
  }
  return { callouts: items, viewBox: [minX, minY, maxX - minX, maxY - minY] };
}

/**
 * Orthogonal leader from a pad to its value block, as drawn on the stage
 * overviews: straight when the block sits level with or over the pad, else
 * one elbow (vertical from the pad, then across to the block's near edge).
 * Null when the block touches the pad.
 */
export function calloutElbowPath(c: SensorCallout, padR = 6): string | null {
  const l = c.cx - c.w / 2;
  const r = c.cx + c.w / 2;
  const t = c.cy - c.h / 2;
  const b = c.cy + c.h / 2;
  const ex = Math.min(r, Math.max(l, c.px));
  const ey = Math.min(b, Math.max(t, c.py));
  if (Math.hypot(ex - c.px, ey - c.py) <= padR + 3) return null;
  const f = (n: number) => n.toFixed(1);
  if (c.px >= l && c.px <= r) {
    const dir = ey < c.py ? -1 : 1;
    return `M ${f(c.px)} ${f(c.py + dir * padR)} V ${f(ey)}`;
  }
  if (c.py >= t && c.py <= b) {
    const dir = ex < c.px ? -1 : 1;
    return `M ${f(c.px + dir * padR)} ${f(c.py)} H ${f(ex)}`;
  }
  const dirY = c.cy < c.py ? -1 : 1;
  return `M ${f(c.px)} ${f(c.py + dirY * padR)} V ${f(c.cy)} H ${f(c.px < l ? l : r)}`;
}

/**
 * Value blocks embedded in the drawing: each block is a plate that wraps its
 * pad and runs along the equipment to the side its authored slot points to
 * (else the other side), so pad and reading read as one object with no
 * leader. Only where pads sit too close for a plate (a row of gates) does a
 * block stand off at its authored slot, with a leader. `w` is the text part.
 */
export function layoutEmbeddedCallouts(
  points: Array<Pick<SensorCallout, "tag" | "px" | "py" | "label" | "w">>,
  slots: Record<string, AuthoredCallout>,
  artBox: [number, number, number, number],
  options: {
    cardH: number;
    ring: number;
    padR: number;
    gapX?: number;
    gapY?: number;
    margin?: number;
    frame?: [number, number, number, number];
    /** Share of a box covered by drawn lines (see art-busy-map): with it, plates move off busy equipment into free space. */
    busy?: (l: number, t: number, r: number, b: number) => number;
    /** Share of a box covered by equipment at all (bodies too): leaders keep off it. */
    cover?: (l: number, t: number, r: number, b: number) => number;
    /** Share of a box covered by the drawing's words: plates keep off titles and labels. */
    text?: (l: number, t: number, r: number, b: number) => number;
    /** Where plates may go (sheet units): the drawing box grown to the canvas shape, so the canvas's free space is used. */
    space?: [number, number, number, number];
  },
): { callouts: SensorCallout[]; viewBox: [number, number, number, number] } {
  if (options.busy) return layoutByFreeSpace(points, slots, artBox, { ...options, busy: options.busy });
  const { cardH, ring, padR } = options;
  const frame = options.frame;
  const gapX = options.gapX ?? 4;
  const gapY = options.gapY ?? 3;
  type Box = { l: number; r: number; t: number; b: number };
  const placed: Box[] = [];
  const boxOf = (c: SensorCallout): Box => ({ l: c.cx - c.w / 2, r: c.cx + c.w / 2, t: c.cy - c.h / 2, b: c.cy + c.h / 2 });
  const clash = (b: Box, own: string): number => {
    let pen = 0;
    for (const o of placed) {
      const ox = Math.min(b.r, o.r) - Math.max(b.l, o.l) + gapX;
      const oy = Math.min(b.b, o.b) - Math.max(b.t, o.t) + gapY;
      if (ox > 0 && oy > 0) pen += ox * oy;
    }
    for (const p of points) {
      if (p.tag === own) continue;
      const ox = Math.min(b.r, p.px + padR) - Math.max(b.l, p.px - padR);
      const oy = Math.min(b.b, p.py + padR) - Math.max(b.t, p.py - padR);
      if (ox > 0 && oy > 0) pen += ox * oy * 4;
    }
    // The sheet frame is an obstacle too: a plate running off the drawing is not embedded in it.
    if (frame) {
      const [fx, fy, fw, fh] = frame;
      const out = Math.max(0, fx - b.l) + Math.max(0, b.r - (fx + fw)) + Math.max(0, fy - b.t) + Math.max(0, b.b - (fy + fh));
      pen += out * (b.b - b.t) * 4;
    }
    return pen;
  };
  const plate = (p: (typeof points)[number], side: "l" | "r"): SensorCallout => {
    const lead = ring * 2 + 3;
    const w = lead + p.w;
    const cx = side === "r" ? p.px - ring - 1.5 + w / 2 : p.px + ring + 1.5 - w / 2;
    const textCx = side === "r" ? p.px + ring + 1.5 + p.w / 2 : p.px - ring - 1.5 - p.w / 2;
    return { ...p, baseW: w, w, h: cardH, cx, cy: p.py, side, textCx };
  };

  // Crowded pads first: they have the fewest clean options.
  const order = points
    .map((p) => ({ p, n: points.filter((o) => o !== p && Math.abs(o.px - p.px) < 120 && Math.abs(o.py - p.py) < cardH * 1.5).length }))
    .sort((a, b) => b.n - a.n || a.p.py - b.p.py || a.p.px - b.p.px);
  const out = new Map<string, SensorCallout>();
  const detached: SensorCallout[] = [];
  for (const { p } of order) {
    const s = slots[p.tag];
    const first: "l" | "r" = s && (s[2] === "end" || (s[2] === "middle" && s[0] < p.px)) ? "l" : "r";
    const options2 = [plate(p, first), plate(p, first === "r" ? "l" : "r")];
    const scored = options2.map((c) => ({ c, pen: clash(boxOf(c), p.tag) }));
    const clean = scored.find((o) => o.pen === 0);
    if (clean) {
      out.set(p.tag, clean.c);
      placed.push(boxOf(clean.c));
      continue;
    }
    // Stand off at the authored slot (or above the pad), leader drawn.
    const w = p.w;
    const cx = !s ? p.px : s[2] === "start" ? s[0] + w / 2 : s[2] === "end" ? s[0] - w / 2 : s[0];
    const c: SensorCallout = { ...p, baseW: w, w, h: cardH, cx, cy: s ? s[1] : p.py - padR - cardH / 2 - 3 };
    out.set(p.tag, c);
    detached.push(c);
  }

  // Nudge stand-off blocks apart from everything (plates stay on their pads).
  const plates = [...out.values()].filter((c) => c.side);
  for (let iter = 0; iter < 80 && detached.length; iter++) {
    let moved = false;
    for (const a of detached) {
      for (const b of [...plates, ...detached]) {
        if (a === b) continue;
        const ox = (a.w + b.w) / 2 + gapX - Math.abs(a.cx - b.cx);
        const oy = (a.h + b.h) / 2 + gapY - Math.abs(a.cy - b.cy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        const fixed = Boolean(b.side);
        const k = fixed ? 1 : 0.5;
        if (ox < Math.min(a.w, b.w) * 0.3) {
          const dir = a.cx <= b.cx ? -1 : 1;
          a.cx += dir * (ox * k + 0.25);
          if (!fixed) b.cx -= dir * (ox * k + 0.25);
        } else {
          const dir = a.cy < b.cy || (a.cy === b.cy && a.py <= b.py) ? -1 : 1;
          a.cy += dir * (oy * k + 0.25);
          if (!fixed) b.cy -= dir * (oy * k + 0.25);
        }
      }
      for (const pt of points) {
        const ox = a.w / 2 + padR - Math.abs(a.cx - pt.px);
        const oy = a.h / 2 + padR - Math.abs(a.cy - pt.py);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (oy <= ox) a.cy += (a.cy < pt.py ? -1 : 1) * (oy + 0.5);
        else a.cx += (a.cx < pt.px ? -1 : 1) * (ox + 0.5);
      }
    }
    if (!moved) break;
  }

  const items = points.map((p) => out.get(p.tag)!);
  const m = options.margin ?? 6;
  const [x0, y0, bw, bh] = artBox;
  let minX = x0;
  let minY = y0;
  let maxX = x0 + bw;
  let maxY = y0 + bh;
  for (const c of items) {
    minX = Math.min(minX, c.cx - c.w / 2 - m);
    maxX = Math.max(maxX, c.cx + c.w / 2 + m);
    minY = Math.min(minY, c.cy - c.h / 2 - m);
    maxY = Math.max(maxY, c.cy + c.h / 2 + m);
  }
  return { callouts: items, viewBox: [minX, minY, maxX - minX, maxY - minY] };
}

/**
 * Value plates placed by what they would hide. Each plate either wraps its pad
 * (no leader) or stands off in free space with an elbow leader, whichever
 * costs least: covering drawn lines (pipes, motors, fans, labels) costs most,
 * then overlapping another plate or pad, then a long leader or one that
 * crosses the drawing. Stand-off plates line up on shared columns, so the
 * readings around a busy machine read as a tidy list beside it, not a scatter.
 */
function layoutByFreeSpace(
  points: Array<Pick<SensorCallout, "tag" | "px" | "py" | "label" | "w">>,
  slots: Record<string, AuthoredCallout>,
  artBox: [number, number, number, number],
  options: {
    cardH: number;
    ring: number;
    padR: number;
    gapX?: number;
    gapY?: number;
    margin?: number;
    frame?: [number, number, number, number];
    busy: (l: number, t: number, r: number, b: number) => number;
    cover?: (l: number, t: number, r: number, b: number) => number;
    text?: (l: number, t: number, r: number, b: number) => number;
    space?: [number, number, number, number];
  },
): { callouts: SensorCallout[]; viewBox: [number, number, number, number] } {
  const { cardH, ring, padR, busy } = options;
  const cover = options.cover ?? busy;
  const gapX = options.gapX ?? 4;
  const gapY = options.gapY ?? 3;
  const [sx, sy, sw, sh] = options.space ?? options.frame ?? artBox;
  type Box = { l: number; r: number; t: number; b: number };
  const placed: Box[] = [];
  const step = cardH + gapY;
  const rowY0 = sy + cardH / 2;
  const u = cardH; // cost unit: one plate height
  // Weights (in plate heights of leader): what a plate may hide, against how far it may move.
  const W_BUSY = 36;
  const W_LEADER_BUSY = 6;
  // Covering the drawing's words (a section title, an equipment name) costs far more than covering lines:
  // the label is what tells the reader which group a plate belongs to.
  const W_TEXT = 400;
  const wordShare = options.text ?? (() => 0);
  // Words are thin, so even a small share means a title is cut: any real overlap pays a fixed price first.
  const words = (l: number, t: number, r: number, b: number) => {
    const share = wordShare(l, t, r, b);
    return share > 0.002 ? 0.4 + share : 0;
  };
  /** Leaders already drawn, as thin boxes: a plate may not sit on one, a new leader may not cross a plate. */
  const wires: Box[] = [];
  const hits = (a: Box, b: Box) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  const DETACH = 1.4;
  const ALIGN = 0.9;

  const overlapCost = (b: Box, own: string): number => {
    let pen = 0;
    for (const o of placed) {
      const ox = Math.min(b.r, o.r) - Math.max(b.l, o.l) + gapX;
      const oy = Math.min(b.b, o.b) - Math.max(b.t, o.t) + gapY;
      if (ox > 0 && oy > 0) pen += 60 + (ox * oy) / (u * u);
    }
    for (const p of points) {
      if (p.tag === own) continue;
      const ox = Math.min(b.r, p.px + padR + 2) - Math.max(b.l, p.px - padR - 2);
      const oy = Math.min(b.b, p.py + padR + 2) - Math.max(b.t, p.py - padR - 2);
      if (ox > 0 && oy > 0) pen += 80;
    }
    for (const w of wires) if (hits(b, w)) pen += 25;
    const out = Math.max(0, sx - b.l) + Math.max(0, b.r - (sx + sw)) + Math.max(0, sy - b.t) + Math.max(0, b.b - (sy + sh));
    if (out > 0) pen += 40 + out / u;
    return pen;
  };
  /** The leader of a stand-off plate (as calloutElbowPath draws it) as thin boxes. */
  const leaderOf = (px: number, py: number, box: Box, cy: number): Box[] => {
    const seg = (x1: number, y1: number, x2: number, y2: number): Box => ({ l: Math.min(x1, x2) - 0.8, r: Math.max(x1, x2) + 0.8, t: Math.min(y1, y2) - 0.8, b: Math.max(y1, y2) + 0.8 });
    const ex = Math.min(box.r, Math.max(box.l, px));
    if (px >= box.l && px <= box.r) {
      const ey = cy < py ? box.b : box.t;
      return [seg(px, py + Math.sign(ey - py) * padR, px, ey)];
    }
    if (py >= box.t && py <= box.b) return [seg(px + Math.sign(ex - px) * padR, py, ex, py)];
    return [seg(px, py + Math.sign(cy - py) * padR, px, cy), seg(px, cy, ex, cy)];
  };
  /** Busy share along a leader segment (a thin box around it), weighted by its length. */
  const segBusy = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.abs(x2 - x1) + Math.abs(y2 - y1);
    if (len < 1) return 0;
    // Sampled over a band a third of a plate wide: a thin line crossing many outlines reads as busy too.
    const hb = u * 0.3;
    const d = cover(Math.min(x1, x2) - hb, Math.min(y1, y2) - hb, Math.max(x1, x2) + hb, Math.max(y1, y2) + hb);
    return (d * len) / u;
  };

  const plate = (p: (typeof points)[number], side: "l" | "r"): SensorCallout => {
    const lead = ring * 2 + 3;
    const w = lead + p.w;
    const cx = side === "r" ? p.px - ring - 1.5 + w / 2 : p.px + ring + 1.5 - w / 2;
    const textCx = side === "r" ? p.px + ring + 1.5 + p.w / 2 : p.px - ring - 1.5 - p.w / 2;
    return { ...p, baseW: w, w, h: cardH, cx, cy: p.py, side, textCx };
  };

  // Lines a stand-off plate's near edge may share with others: left edges (plates right of their pad), right edges (left of it).
  const lanesL: number[] = [];
  const lanesR: number[] = [];

  const order = points
    .map((p) => ({ p, n: points.filter((o) => o !== p && Math.abs(o.px - p.px) < 140 && Math.abs(o.py - p.py) < cardH * 2).length }))
    .sort((a, b) => b.n - a.n || a.p.py - b.p.py || a.p.px - b.p.px);
  const out = new Map<string, SensorCallout>();

  for (const { p } of order) {
    const s = slots[p.tag];
    const prefer: "l" | "r" = s && (s[2] === "end" || (s[2] === "middle" && s[0] < p.px)) ? "l" : "r";
    let best: { c: SensorCallout; box: Box; cost: number; laneL?: number; laneR?: number } | null = null;
    const consider = (c: SensorCallout, cost: number, laneL?: number, laneR?: number) => {
      if (!best || cost < best.cost) best = { c, box: { l: c.cx - c.w / 2, r: c.cx + c.w / 2, t: c.cy - c.h / 2, b: c.cy + c.h / 2 }, cost, laneL, laneR };
    };

    // Embedded on its pad, either side; the pad end sits on the pad, the text part is what hides the drawing.
    for (const side of ["r", "l"] as const) {
      const c = plate(p, side);
      const tl = c.textCx! - p.w / 2;
      const tr = c.textCx! + p.w / 2;
      const box = { l: c.cx - c.w / 2, r: c.cx + c.w / 2, t: c.cy - c.h / 2, b: c.cy + c.h / 2 };
      consider(c, overlapCost(box, p.tag) + W_BUSY * busy(tl, box.t, tr, box.b) + W_TEXT * words(box.l, box.t, box.r, box.b) + (side === prefer ? 0 : 0.15));
    }

    // Stand-off: beside the pad (left edge right of it, or right edge left of it), above / below, and on existing lanes.
    const w = p.w;
    const xs: Array<{ l: number; lane: "L" | "R" | null }> = [];
    for (const j of [0, 1, 2, 3, 5, 8, 12, 17]) {
      xs.push({ l: p.px + padR + 4 + j * u, lane: "L" });
      xs.push({ l: p.px - padR - 4 - j * u - w, lane: "R" });
    }
    xs.push({ l: p.px - w / 2, lane: null });
    for (const x of lanesL) if (Math.abs(x - p.px) < 22 * u) xs.push({ l: x, lane: "L" });
    for (const x of lanesR) if (Math.abs(x - p.px) < 22 * u) xs.push({ l: x - w, lane: "R" });
    // Rows on one grid for the whole sheet (so stand-off plates line up across machines), plus the pad's own row.
    const k0 = Math.round((p.py - rowY0) / step);
    const rows = [p.py];
    for (let k = k0 - 16; k <= k0 + 16; k++) rows.push(rowY0 + k * step);
    for (const { l, lane } of xs) {
      for (const cy of rows) {
        const box = { l, r: l + w, t: cy - cardH / 2, b: cy + cardH / 2 };
        // The plate may not sit on its own pad.
        if (p.px > box.l - padR && p.px < box.r + padR && p.py > box.t - padR && p.py < box.b + padR) continue;
        const cx = l + w / 2;
        const c: SensorCallout = { ...p, baseW: w, w, h: cardH, cx, cy };
        // Leader as calloutElbowPath draws it: up / down from the pad, then across to the near edge.
        const ex = Math.min(box.r, Math.max(box.l, p.px));
        let lead = 0;
        let leadBusy = 0;
        if (p.px >= box.l && p.px <= box.r) {
          const ey = cy < p.py ? box.b : box.t;
          lead = Math.abs(ey - p.py);
          leadBusy = segBusy(p.px, p.py + Math.sign(ey - p.py) * padR, p.px, ey);
        } else if (p.py >= box.t && p.py <= box.b) {
          lead = Math.abs(ex - p.px);
          leadBusy = segBusy(p.px + Math.sign(ex - p.px) * padR, p.py, ex, p.py);
        } else {
          lead = Math.abs(cy - p.py) + Math.abs(ex - p.px);
          leadBusy = segBusy(p.px, p.py + Math.sign(cy - p.py) * padR, p.px, cy) + segBusy(p.px, cy, ex, cy);
        }
        // A leader through another plate reads as wiring to the wrong reading.
        let cross = 0;
        for (const w of leaderOf(p.px, p.py, box, cy)) for (const o of placed) if (hits(w, o)) cross += 30;
        const onLane = lane === "L" ? lanesL.some((x) => Math.abs(x - l) < 0.5) : lane === "R" ? lanesR.some((x) => Math.abs(x - (l + w)) < 0.5) : false;
        const cost =
          DETACH +
          overlapCost(box, p.tag) +
          W_BUSY * busy(box.l, box.t, box.r, box.b) +
          W_TEXT * words(box.l, box.t, box.r, box.b) +
          (lead / u) * 0.45 +
          // Beyond a short reach every extra plate-height of leader costs more (a reading far from its pad is hard to pair).
          0.3 * Math.max(0, lead / u - 4) ** 2 +
          W_LEADER_BUSY * leadBusy +
          cross -
          (onLane ? ALIGN : 0);
        consider(c, cost, lane === "L" ? l : undefined, lane === "R" ? l + w : undefined);
      }
    }
    const pick = best!;
    out.set(p.tag, pick.c);
    placed.push(pick.box);
    if (!pick.c.side) {
      wires.push(...leaderOf(p.px, p.py, pick.box, pick.c.cy));
      if (pick.laneL !== undefined && !lanesL.some((x) => Math.abs(x - pick.laneL!) < 0.5)) lanesL.push(pick.laneL);
      if (pick.laneR !== undefined && !lanesR.some((x) => Math.abs(x - pick.laneR!) < 0.5)) lanesR.push(pick.laneR);
    }
  }

  const items = points.map((p) => out.get(p.tag)!);
  const m = options.margin ?? 6;
  const [x0, y0, bw, bh] = artBox;
  let minX = x0;
  let minY = y0;
  let maxX = x0 + bw;
  let maxY = y0 + bh;
  for (const c of items) {
    minX = Math.min(minX, c.cx - c.w / 2 - m);
    maxX = Math.max(maxX, c.cx + c.w / 2 + m);
    minY = Math.min(minY, c.cy - c.h / 2 - m);
    maxY = Math.max(maxY, c.cy + c.h / 2 + m);
  }
  return { callouts: items, viewBox: [minX, minY, maxX - minX, maxY - minY] };
}
