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
const hasHead = (g: PartGroup) => Boolean(g.name) && g.rows.length > 1;

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
  // A stray one or two readings join the nearest larger cluster of their part when it is within twice the
  // reach: one block per part reads better than a scatter of tiny ones.
  const centre = (g: T[]): [number, number] => [g.reduce((n, p) => n + p.px, 0) / g.length, g.reduce((n, p) => n + p.py, 0) / g.length];
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].length > 2 || out.length === 1) continue;
    const [cx, cy] = centre(out[i]);
    let best = -1;
    let bestD = reach * 2;
    out.forEach((g, j) => {
      if (j === i || g.length <= 2) return;
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

/**
 * Places each block beside its own part, in free sheet: every spot of a grid over the canvas (and a band
 * just past it) is scored by distance from the block's pads (growing steeply, so a block stays by its
 * part), how much machine body it would sit on (heavy) or drawn line it would cross (light), the drawing's
 * words and pads it would hide, overlap with other blocks, and leaving the canvas (which shrinks the
 * sheet). Largest blocks go first, then every block is re-placed against the rest a couple of times so an
 * early block does not keep the spot another part needed.
 */
export function layoutPartBlocks(
  groups: PartGroup[],
  artBox: [number, number, number, number],
  space: [number, number, number, number],
  m: BlockMetrics,
  busy: BusyMap | null,
  allPads: Array<[number, number]>,
): { blocks: PlacedBlock[]; viewBox: [number, number, number, number] } {
  const [sx, sy, sw, sh] = space;
  const gap = m.rowH * 0.5;
  const u = m.rowH;
  const density = busy?.density ?? (() => 0);
  const words = busy?.text ?? (() => 0);
  const cover = busy?.cover ?? (() => 0);
  const order = [...groups].sort((a, b) => b.rows.length - a.rows.length);
  // Candidate grid: the canvas plus a band of a few rows past each edge, for when the sheet has no room left.
  const band = u * 4;

  const place = (g: PartGroup, others: PlacedBlock[]): PlacedBlock => {
    const size = measureBlock(g, m);
    const xs = g.pads.map((p) => p[0]);
    const ys = g.pads.map((p) => p[1]);
    const pb: Box = { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) };
    let best: { x: number; y: number; cost: number } | null = null;
    for (let y = Math.round((sy - band) / u) * u; y + size.h <= sy + sh + band; y += u / 2) {
      for (let x = Math.round((sx - band) / u) * u; x + size.w <= sx + sw + band; x += u / 2) {
        const box: Box = { l: x, t: y, r: x + size.w, b: y + size.h };
        const d = Math.hypot(Math.max(0, pb.l - box.r, box.l - pb.r), Math.max(0, pb.t - box.b, box.t - pb.b)) / u;
        let cost = d + 0.15 * d * d;
        if (best && cost >= best.cost) continue;
        const out = Math.max(0, sx - box.l) + Math.max(0, box.r - (sx + sw)) + Math.max(0, sy - box.t) + Math.max(0, box.b - (sy + sh));
        if (out > 0) cost += 120 + (3 * out) / u;
        // Machine body under the block (with a thin clearance) weighs far more than a pipe or flow line crossing it.
        const [cl, ct, cr, cb] = [box.l - gap / 2, box.t - gap / 2, box.r + gap / 2, box.b + gap / 2];
        const lines = density(cl, ct, cr, cb);
        cost += 600 * Math.max(0, cover(cl, ct, cr, cb) - lines) + 60 * lines;
        const ws = words(box.l, box.t, box.r, box.b);
        if (ws > 0.002) cost += 300 + 400 * ws;
        if (best && cost >= best.cost) continue;
        for (const [px, py] of allPads) if (px > box.l - u * 0.4 && px < box.r + u * 0.4 && py > box.t - u * 0.4 && py < box.b + u * 0.4) cost += 200;
        for (const o of others) {
          const ob: Box = { l: o.x, t: o.y, r: o.x + o.w, b: o.y + o.h };
          if (hits(box, ob, gap)) {
            const ox = Math.min(box.r, ob.r) - Math.max(box.l, ob.l) + gap;
            const oy = Math.min(box.b, ob.b) - Math.max(box.t, ob.t) + gap;
            cost += 2000 + (ox * oy) / (u * u);
          }
        }
        if (!best || cost < best.cost) best = { x, y, cost };
      }
    }
    const pick = best!;
    return { group: g, x: pick.x, y: pick.y, w: size.w, h: size.h, labelW: size.labelW, valueW: size.valueW };
  };

  const placed: PlacedBlock[] = [];
  for (const g of order) placed.push(place(g, placed));
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < placed.length; i++) placed[i] = place(placed[i].group, placed.filter((_, j) => j !== i));
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
            {/* The linked row carries its link's status colour, so row, link and pad read as one. */}
            {hot && <rect x={block.x + 1} y={y + m.rowH * 0.15} width={m.fontSz * 0.22} height={m.rowH * 0.7} rx={m.fontSz * 0.1} fill={linkColor(r.tone)} />}
            {bad && <circle cx={lx + m.fontSz * 0.3} cy={y + m.rowH / 2} r={m.fontSz * 0.26} fill={color} />}
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
    </g>
  );
}
