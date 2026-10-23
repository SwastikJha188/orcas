"use client";

/**
 * Readout blocks of a machine sheet: one aligned table per part (sub-assembly),
 * the way a control-room mimic groups its readouts beside each piece of
 * equipment. Every reading stays visible whatever the count, but the eye meets
 * one block per part (about ten on a dense sheet) instead of one plate per
 * sensor (about seventy): label column left, value column right, abnormal rows
 * marked by colour. Pads stay on the drawing; a row and its pad light together.
 */
import React from "react";
import { MX } from "@/components/assets/machine-kit/machine-kit";
import { textWidth } from "@/components/assets/pyro/line-sheets/text-width";
import type { BusyMap } from "@/components/assets/art-busy-map";
import type { Tone } from "@/components/assets/assets-shell-ui";
import type { RunState } from "./value-pill";

export interface BlockRow {
  tag: string;
  /** Control-room label ("GB IN BRG"). */
  label: string;
  /** Value with its unit, or the state word. */
  value: string;
  tone: Tone;
  run: RunState | null;
  state: boolean;
  sp: string | null;
}

export interface PartGroup {
  /** Unique per block (a part spread over the sheet is split into one block per cluster of pads). */
  id: string;
  /** Part name for the block header; empty for a lone reading without a part. */
  name: string;
  rows: BlockRow[];
  pads: Array<[number, number]>;
  /** Designed sheets: the block's top-left corner as the design places it on this canvas; it stays near there. */
  prefer?: [number, number];
  /** Designed sheets: where the block's dashed leader meets its equipment. */
  leader?: [number, number];
  /** Header shown even for a single reading (designed blocks always name their equipment). */
  head?: boolean;
}

export interface BlockMetrics {
  fontSz: number;
  rowH: number;
  headH: number;
  padX: number;
  padY: number;
  colGap: number;
  rx: number;
}

export interface PlacedBlock {
  group: PartGroup;
  x: number;
  y: number;
  w: number;
  h: number;
  labelW: number;
  valueW: number;
}

const LABEL_SCALE = 0.8;

/** Colour of a reading's link to its pad (and its row highlight): its status, so the link says how the reading is. */
export function linkColor(tone: Tone): string {
  return tone === "bad" ? MX.bad : tone === "warn" ? MX.warn : tone === "good" ? "var(--status-success)" : MX.label;
}

/** A block names its part only when it holds several readings; a lone reading is just its own row. */
const hasHead = (g: PartGroup) => Boolean(g.name) && (g.head || g.rows.length > 1);

export function blockMetrics(fontSz: number): BlockMetrics {
  return { fontSz, rowH: fontSz * 1.5, headH: fontSz * 1.55, padX: fontSz * 0.7, padY: fontSz * 0.3, colGap: fontSz * 0.9, rx: fontSz * 0.4 };
}

function rowGlyphW(m: BlockMetrics, row: BlockRow): number {
  return row.run || row.tone === "warn" || row.tone === "bad" ? m.fontSz * 0.9 : 0;
}

export function measureBlock(group: PartGroup, m: BlockMetrics): { w: number; h: number; labelW: number; valueW: number } {
  const labelSz = m.fontSz * LABEL_SCALE;
  const labelW = Math.max(...group.rows.map((r) => rowGlyphW(m, r) + textWidth(r.label, labelSz, 600, 0.04)), 0);
  const valueW = Math.max(
    ...group.rows.map((r) => textWidth(r.value, m.fontSz, r.state ? 500 : 700, 0.01) + (r.sp ? m.fontSz * 0.4 + textWidth(`SP ${r.sp}`, labelSz, 600, 0.02) : 0)),
    0,
  );
  const headW = hasHead(group) ? textWidth(group.name.toUpperCase(), labelSz, 700, 0.06) : 0;
  // Column widths rounded to steps so a value gaining a digit does not move the block (calm updates).
  const q = m.fontSz * 2;
  const w = Math.ceil((Math.max(labelW + m.colGap + valueW, headW) + 2 * m.padX) / q) * q;
  const h = (hasHead(group) ? m.headH : 0) + group.rows.length * m.rowH + 2 * m.padY;
  return { w, h, labelW, valueW };
}

/** Clusters a part's pads so readings sit beside where they are measured, not at the centre of a part spread over the sheet. */
export function clusterPads<T extends { px: number; py: number }>(items: T[], reach: number): T[][] {
  const out: T[][] = [];
  const left = [...items];
  while (left.length) {
    const group = [left.shift()!];
    for (let i = 0; i < group.length; i++) {
      for (let j = left.length - 1; j >= 0; j--) {
        if (Math.hypot(left[j].px - group[i].px, left[j].py - group[i].py) <= reach) group.push(left.splice(j, 1)[0]);
      }
    }
    out.push(group);
  }
  // A stray one or two readings join the nearest cluster of their part at least as large within 2.5 × the
  // reach: a block per piece of equipment reads better than a scatter of one-line chips.
  const centre = (g: T[]): [number, number] => [g.reduce((n, p) => n + p.px, 0) / g.length, g.reduce((n, p) => n + p.py, 0) / g.length];
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].length > 2 || out.length === 1) continue;
    const [cx, cy] = centre(out[i]);
    let best = -1;
    let bestD = reach * 2.5;
    out.forEach((g, j) => {
      if (j === i || g.length < out[i].length) return;
      const [gx, gy] = centre(g);
      const d = Math.hypot(gx - cx, gy - cy);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });
    if (best >= 0) {
      out[best].push(...out[i]);
      out.splice(i, 1);
    }
  }
  return out;
}

type Box = { l: number; t: number; r: number; b: number };
const hits = (a: Box, b: Box, gap = 0) => a.l < b.r + gap && b.l < a.r + gap && a.t < b.b + gap && b.t < a.b + gap;

/** Cost of a block per share of plain equipment body under it, and per share of drawn lines it hides. */
const BODY_COST = 110;
const LINE_COST = 220;

/** The straight segment (x0, y0)–(x1, y1) passes through `b` (sampled; leaders are short). */
function segmentHits(x0: number, y0: number, x1: number, y1: number, b: Box): boolean {
  for (let i = 1; i < 8; i++) {
    const x = x0 + ((x1 - x0) * i) / 8;
    const y = y0 + ((y1 - y0) * i) / 8;
    if (x > b.l && x < b.r && y > b.t && y < b.b) return true;
  }
  return false;
}

/**
 * Places each block beside its own part, in free sheet: every spot of a grid over the canvas (and a band
 * just past it) is scored by distance from the block's pads (growing steeply, so a block stays by its
 * part), how much machine body it would sit on (heavy) or drawn line it would cross (light), the drawing's
 * words and pads it would hide, overlap with other blocks, and leaving the canvas (which shrinks the
 * sheet). Largest blocks go first, then every block is re-placed against the rest a couple of times so an
 * early block does not keep the spot another part needed. Blocks the operator placed by hand (`pinned`,
 * top-left corner by block id) stay where they were put and the others make room for them.
 */
export function layoutPartBlocks(
  groups: PartGroup[],
  artBox: [number, number, number, number],
  space: [number, number, number, number],
  m: BlockMetrics,
  busy: BusyMap | null,
  allPads: Array<[number, number]>,
  pinned?: Record<string, [number, number]>,
  /** coarse: a quick trial (a grid step of a row, one re-placing pass, no swaps), to compare sizes. */
  opts: { coarse?: boolean } = {},
): { blocks: PlacedBlock[]; viewBox: [number, number, number, number] } {
  const [sx, sy, sw, sh] = space;
  const gap = m.rowH * 0.35;
  const u = m.rowH;
  const density = busy?.density ?? (() => 0);
  const words = busy?.text ?? (() => 0);
  const cover = busy?.cover ?? (() => 0);
  const order = [...groups].sort((a, b) => b.rows.length - a.rows.length);
  // Candidate grid: the canvas only. A block past its edge would make the whole sheet zoom out and every reading
  // smaller; a crowded sheet puts blocks on quiet parts of the drawing instead.
  const band = 0;

  /** Cost of `g` (its size `size`) with its top-left corner at (x, y), among `others`; stops early past `bound`. */
  const costAt = (
    g: PartGroup,
    size: { w: number; h: number },
    x: number,
    y: number,
    others: PlacedBlock[],
    bound = Infinity,
  ): number => {
    const xs = g.pads.map((p) => p[0]);
    const ys = g.pads.map((p) => p[1]);
    const pb: Box = { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) };
    const box: Box = { l: x, t: y, r: x + size.w, b: y + size.h };
    // Distance from its sensors grows steeply: a block belongs beside the equipment it measures. A designed block
    // keeps to its spot in the design instead (its leader names the equipment).
    const d = g.prefer
      ? Math.hypot(x - g.prefer[0], y - g.prefer[1]) / u
      : Math.hypot(Math.max(0, pb.l - box.r, box.l - pb.r), Math.max(0, pb.t - box.b, box.t - pb.b)) / u;
    let cost = g.prefer ? 2.5 * d + 0.3 * d * d : 1.5 * d + 0.2 * d * d;
    if (cost >= bound) return cost;
    const out = Math.max(0, sx - box.l) + Math.max(0, box.r - (sx + sw)) + Math.max(0, sy - box.t) + Math.max(0, box.b - (sy + sh));
    if (out > 0) cost += 120 + (3 * out) / u;
    // Hiding drawn lines (edges, pipes, flows) costs most; resting on a plain body face is allowed when it keeps
    // the block beside its sensors (a block far away, its leaders across the drawing, reads worse).
    const [cl, ct, cr, cb] = [box.l - gap / 2, box.t - gap / 2, box.r + gap / 2, box.b + gap / 2];
    const lines = density(cl, ct, cr, cb);
    cost += BODY_COST * Math.max(0, cover(cl, ct, cr, cb) - lines) + LINE_COST * lines;
    const ws = words(box.l, box.t, box.r, box.b);
    if (ws > 0.002) cost += 300 + 400 * ws;
    if (cost >= bound) return cost;
    for (const [px, py] of allPads) if (px > box.l - u * 0.4 && px < box.r + u * 0.4 && py > box.t - u * 0.4 && py < box.b + u * 0.4) cost += 200;
    for (const o of others) {
      const ob: Box = { l: o.x, t: o.y, r: o.x + o.w, b: o.y + o.h };
      if (hits(box, ob, gap)) {
        const ox = Math.min(box.r, ob.r) - Math.max(box.l, ob.l) + gap;
        const oy = Math.min(box.b, ob.b) - Math.max(box.t, ob.t) + gap;
        cost += 2000 + (ox * oy) / (u * u);
      }
      // A leader from this block to one of its pads running through another block.
      for (const [px, py] of g.pads) {
        const qx = Math.min(box.r, Math.max(box.l, px));
        const qy = Math.min(box.b, Math.max(box.t, py));
        if (segmentHits(px, py, qx, qy, ob)) cost += 40;
      }
    }
    return cost;
  };

  const place = (g: PartGroup, others: PlacedBlock[]): PlacedBlock => {
    const size = measureBlock(g, m);
    let best: { x: number; y: number; cost: number } | null = null;
    const step = opts.coarse ? u : u / 2;
    for (let y = Math.round((sy - band) / u) * u; y + size.h <= sy + sh + band; y += step) {
      for (let x = Math.round((sx - band) / u) * u; x + size.w <= sx + sw + band; x += step) {
        const cost = costAt(g, size, x, y, others, best?.cost ?? Infinity);
        if (!best || cost < best.cost) best = { x, y, cost };
      }
    }
    const pick = best!;
    return { group: g, x: pick.x, y: pick.y, w: size.w, h: size.h, labelW: size.labelW, valueW: size.valueW };
  };

  const placed: PlacedBlock[] = [];
  const isPinned = (g: PartGroup) => Boolean(pinned?.[g.id]);
  for (const g of order.filter(isPinned)) {
    const size = measureBlock(g, m);
    const [x, y] = pinned![g.id];
    placed.push({ group: g, x, y, w: size.w, h: size.h, labelW: size.labelW, valueW: size.valueW });
  }
  for (const g of order.filter((g) => !isPinned(g))) placed.push(place(g, placed));
  const replace = () => {
    for (let i = 0; i < placed.length; i++) if (!isPinned(placed[i].group)) placed[i] = place(placed[i].group, placed.filter((_, j) => j !== i));
  };
  replace();
  // Blocks are placed one at a time, so an early one can hold the spot a later one needed (fan blocks under
  // the fans before the compartment blocks): two blocks trade places (centre for centre) when that lowers
  // their summed cost, then everything is re-placed once more.
  const snap = (v: number) => Math.round(v / (u / 2)) * (u / 2);
  // A dense sheet (a combined sheet's forty blocks) gets one round: each round re-places every block.
  for (let round = 0; round < (opts.coarse ? 0 : groups.length > 30 ? 1 : 2); round++) {
    let swapped = false;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        if (isPinned(a.group) || isPinned(b.group)) continue;
        const rest = placed.filter((_, k) => k !== i && k !== j);
        const before = costAt(a.group, a, a.x, a.y, [...rest, b]) + costAt(b.group, b, b.x, b.y, [...rest, a]);
        const a2 = { ...a, x: snap(b.x + b.w / 2 - a.w / 2), y: snap(b.y + b.h / 2 - a.h / 2) };
        const b2 = { ...b, x: snap(a.x + a.w / 2 - b.w / 2), y: snap(a.y + a.h / 2 - b.h / 2) };
        const after = costAt(a.group, a2, a2.x, a2.y, [...rest, b2]) + costAt(b.group, b2, b2.x, b2.y, [...rest, a2]);
        if (after < before - 1) {
          placed[i] = a2;
          placed[j] = b2;
          swapped = true;
        }
      }
    }
    if (!swapped) break;
    replace();
  }

  const margin = u * 0.5;
  const [ax, ay, aw, ah] = artBox;
  let minX = ax;
  let minY = ay;
  let maxX = ax + aw;
  let maxY = ay + ah;
  for (const b of placed) {
    minX = Math.min(minX, b.x - margin);
    minY = Math.min(minY, b.y - margin);
    maxX = Math.max(maxX, b.x + b.w + margin);
    maxY = Math.max(maxY, b.y + b.h + margin);
  }
  return { blocks: placed, viewBox: [minX, minY, maxX - minX, maxY - minY] };
}

/**
 * A designed block's leader: a straight dashed line from the point of the block's edge nearest its equipment to
 * the leader point (null when that point lies under the block).
 */
export function blockLeader(block: PlacedBlock): [number, number, number, number] | null {
  const at = block.group.leader;
  if (!at) return null;
  const [px, py] = at;
  const l = block.x;
  const r = block.x + block.w;
  const t = block.y;
  const b = block.y + block.h;
  if (px >= l && px <= r && py >= t && py <= b) return null;
  return [Math.min(r, Math.max(l, px)), Math.min(b, Math.max(t, py)), px, py];
}

/**
 * Link from a block row to its pad, leaving from the block edge nearest the pad so it never runs back
 * across the block: beside the block it leaves the row's own side and turns once toward the pad; above
 * or below it leaves the top or bottom edge straight at the pad. Returns the path and its start point
 * (null when the pad sits under the block itself).
 */
export function rowLeader(block: PlacedBlock, tag: string, pad: [number, number], m: BlockMetrics): { d: string; start: [number, number] } | null {
  const row = rowAnchor(block, tag, m);
  if (!row) return null;
  const [px, py] = pad;
  const l = block.x;
  const r = block.x + block.w;
  const t = block.y;
  const b = block.y + block.h;
  const rowY = row[1];
  if (px < l || px > r) {
    const sx = px < l ? l : r;
    if (Math.abs(py - rowY) < 0.5) return { d: `M ${sx} ${rowY} H ${px}`, start: [sx, rowY] };
    return { d: `M ${sx} ${rowY} H ${px} V ${py}`, start: [sx, rowY] };
  }
  if (py > b) return { d: `M ${px} ${b} V ${py}`, start: [px, b] };
  if (py < t) return { d: `M ${px} ${t} V ${py}`, start: [px, t] };
  return null;
}

/** Centre of a row's left edge, for a leader to the row's pad. */
export function rowAnchor(block: PlacedBlock, tag: string, m: BlockMetrics): [number, number] | null {
  const i = block.group.rows.findIndex((r) => r.tag === tag);
  if (i < 0) return null;
  const y = block.y + m.padY + (hasHead(block.group) ? m.headH : 0) + (i + 0.5) * m.rowH;
  return [block.x, y];
}

export function PartBlock({
  block,
  m,
  hoverTag,
  selectedTag,
  partHot,
  dimmed,
  onHover,
  onHoverPart,
  onSelect,
  titleOf,
  onGrab,
}: {
  block: PlacedBlock;
  m: BlockMetrics;
  hoverTag: string | null;
  selectedTag: string | null;
  /** The header is hovered: the part is outlined on the drawing. */
  partHot: boolean;
  /** Another block's header is hovered: this one fades back so that part's outline shows through. */
  dimmed: boolean;
  onHover: (tag: string | null) => void;
  /** Hovering the header names the block (its group id) so the sheet can outline its part. */
  onHoverPart: (id: string | null) => void;
  onSelect: (tag: string) => void;
  titleOf: (tag: string) => string;
  /** Arranging: the block is a handle the operator drags (its rows are not clickable meanwhile). */
  onGrab?: (e: React.PointerEvent<SVGRectElement>) => void;
}) {
  const g = block.group;
  const labelSz = m.fontSz * LABEL_SCALE;
  const abnormal = g.rows.some((r) => r.tone === "warn" || r.tone === "bad");
  const worst = g.rows.some((r) => r.tone === "bad") ? MX.bad : MX.warn;
  const headY = block.y + m.padY;
  const rows0 = headY + (hasHead(g) ? m.headH : 0);
  const valueX = block.x + block.w - m.padX;
  return (
    <g className="opc-part-block" data-abnormal={abnormal || undefined} style={{ opacity: dimmed ? 0.15 : 1, transition: "opacity 120ms" }}>
      <rect x={block.x} y={block.y} width={block.w} height={block.h} rx={m.rx} fill={MX.padPanel} stroke={abnormal ? worst : MX.fine} strokeWidth={abnormal ? 1.4 : 0.9} />
      {hasHead(g) && (
        <g onPointerEnter={() => onHoverPart(g.id)} onPointerLeave={() => onHoverPart(null)}>
          <rect x={block.x} y={block.y} width={block.w} height={rows0 - block.y} fill="transparent" />
          <text x={block.x + m.padX} y={headY + m.headH * 0.68} fontSize={labelSz} fontWeight={700} letterSpacing={labelSz * 0.06} fill={partHot ? "var(--dx-ink)" : MX.label}>
            {g.name.toUpperCase()}
          </text>
          <line x1={block.x} x2={block.x + block.w} y1={rows0} y2={rows0} stroke={MX.fine} strokeWidth={0.7} />
        </g>
      )}
      {g.rows.map((r, i) => {
        const y = rows0 + i * m.rowH;
        const hot = hoverTag === r.tag || selectedTag === r.tag;
        const bad = r.tone === "warn" || r.tone === "bad";
        const color = r.tone === "bad" ? MX.bad : r.tone === "warn" ? MX.warn : "var(--dx-ink)";
        const glyph = rowGlyphW(m, r);
        const lx = block.x + m.padX;
        return (
          <g
            key={r.tag}
            className="lsh-point"
            role="button"
            tabIndex={0}
            aria-pressed={selectedTag === r.tag}
            aria-label={titleOf(r.tag)}
            onClick={() => onSelect(r.tag)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(r.tag);
              }
            }}
            onPointerEnter={() => onHover(r.tag)}
            onPointerLeave={() => onHover(null)}
          >
            <title>{titleOf(r.tag)}</title>
            <rect
              x={block.x + 1}
              y={y}
              width={block.w - 2}
              height={m.rowH}
              style={{ fill: hot ? `color-mix(in srgb, ${linkColor(r.tone)} 14%, transparent)` : "transparent" }}
            />
            {/* Critical: the row's band blinks (steady under reduced motion) so it is found at once; the text stays put. */}
            {r.tone === "bad" && (
              <rect className="opc-blink" x={block.x + 1} y={y} width={block.w - 2} height={m.rowH} style={{ fill: `color-mix(in srgb, ${MX.bad} 24%, transparent)` }} />
            )}
            {/* The linked row carries its link's status colour, so row, link and pad read as one. */}
            {hot && <rect x={block.x + 1} y={y + m.rowH * 0.15} width={m.fontSz * 0.22} height={m.rowH * 0.7} rx={m.fontSz * 0.1} fill={linkColor(r.tone)} />}
            {bad && <circle className={r.tone === "bad" ? "opc-blink" : undefined} cx={lx + m.fontSz * 0.3} cy={y + m.rowH / 2} r={m.fontSz * 0.26} fill={color} />}
            {!bad && r.run && (
              <circle
                cx={lx + m.fontSz * 0.3}
                cy={y + m.rowH / 2}
                r={m.fontSz * 0.26}
                fill={r.run === "run" ? "var(--dx-ink)" : r.run === "tripped" ? MX.bad : "none"}
                stroke={r.run === "tripped" ? MX.bad : "var(--dx-ink)"}
                strokeWidth={m.fontSz * 0.1}
              />
            )}
            <text y={y + m.rowH * 0.68} fontSize={m.fontSz} style={{ fontVariantNumeric: "tabular-nums" }}>
              <tspan x={lx + glyph} fontSize={labelSz} fontWeight={600} letterSpacing={labelSz * 0.04} fill={bad ? color : MX.label}>
                {r.label}
              </tspan>
              <tspan x={valueX} textAnchor="end" fontWeight={r.state && !bad ? 500 : 700} fill={color}>
                {r.sp ? `${r.value}  ` : r.value}
                {r.sp && (
                  <tspan fontSize={labelSz} fontWeight={600} fill={MX.label}>
                    SP {r.sp}
                  </tspan>
                )}
              </tspan>
            </text>
          </g>
        );
      })}
      {onGrab && (
        <rect
          className="opc-arrange-grip"
          x={block.x}
          y={block.y}
          width={block.w}
          height={block.h}
          rx={m.rx}
          fill="transparent"
          stroke="var(--accent-primary)"
          strokeWidth={m.fontSz * 0.12}
          strokeDasharray={`${m.fontSz * 0.5} ${m.fontSz * 0.35}`}
          onPointerDown={onGrab}
          aria-hidden="true"
        />
      )}
    </g>
  );
}
