"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DetailedSensorInfo } from "./machine-sensor-mapping-view";
import { severityTone, type Tone } from "./assets-shell-ui";
import { LimitBar, gaugeScale } from "./sensor-gauge";
import type { LimitRule } from "@/lib/kiln-sim/signals";

/* ==========================================================================
   Sensor cards around a drawing: the drawing at full stage width, with one
   floating glass card per channel docked above and below it, each joined to
   its pad by a leader line (machine Overview › component sheet).

   On the whole machine, channel cards are organised in clusters, one per
   component: a small technical label over a tight grid of its cards. On a
   component drawing each card stands alone and carries its limit bar.
   Each cluster is anchored horizontally over (or under) the part of the
   drawing its pads sit on, so the eye finds the part without a line: the
   upper half of the drawing docks above it, the lower half below, and each
   row is packed left to right in drawing order without overlap.
   Hovering a cluster lights its component; hovering a card lights its pad.
   ========================================================================== */

const CARD_W = 158;
const CARD_W_DETAILED = 204;
const CARD_GAP = 8;
const CLUSTER_GAP = 14;
/** Most cards side by side in one cluster. */
const MAX_COLS = 2;
/** Below this stage width the clusters fall into a responsive multi-column grid under the drawing. */
const STAGE_MIN_W = 640;

/** Pad position in drawing space, 0–1 on each axis. */
export type RingPosition = { u: number; v: number };

export interface SensorGroup {
  id: string;
  label: string;
  /** Short line beside the label (health …). */
  caption?: string;
  tags: string[];
}

interface Item {
  sensor: DetailedSensorInfo;
  tag: string;
  placed: boolean;
  u: number;
  v: number;
}

interface Cluster {
  key: string;
  /** Component id on the drawing; null for an unlabelled single card. */
  groupId: string | null;
  label?: string;
  caption?: string;
  items: Item[];
  cols: number;
  width: number;
  cardW: number;
  u: number;
  v: number;
}

interface PlacedRow {
  clusters: Array<{ cluster: Cluster; x: number }>;
}

interface PlacedFlank {
  clusters: Cluster[];
  cols: number;
  cardW: number;
  width: number;
}

type StageLayout =
  | {
      mode: "flank";
      drawing: { w: number; h: number };
      left: PlacedFlank;
      right: PlacedFlank;
    }
  | {
      mode: "bands";
      drawing: { w: number; h: number };
      top: PlacedRow[];
      bottom: PlacedRow[];
    };

interface LeaderLine {
  tag: string;
  groupId: string | null;
  tone: Tone;
  ax: number;
  ay: number;
  stubX: number;
  stubY: number;
  px: number;
  py: number;
}

const tagOf = (s: DetailedSensorInfo) => s.parameter || s.id;
const SEVERITY: Partial<Record<Tone, number>> = { good: 0, warn: 1, bad: 2 };
const worstTone = (items: Item[]) =>
  items.reduce<Tone>((w, it) => {
    const t = severityTone(it.sensor.status);
    return (SEVERITY[t] ?? 0) > (SEVERITY[w] ?? 0) ? t : w;
  }, "good");

/**
 * Packs blocks of different widths into [0, total], keeping order: each
 * block starts as near its ideal centre as it can without overlapping.
 * Returns left edges.
 */
function pack(ideals: number[], widths: number[], gap: number, total: number): number[] {
  const n = ideals.length;
  const x = ideals.map((c, i) => c - widths[i] / 2);
  for (let i = 0; i < n; i++) {
    x[i] = Math.max(x[i], i ? x[i - 1] + widths[i - 1] + gap : 0);
  }
  if (n && x[n - 1] + widths[n - 1] > total) {
    x[n - 1] = total - widths[n - 1];
    for (let i = n - 2; i >= 0; i--) x[i] = Math.min(x[i], x[i + 1] - gap - widths[i]);
  }
  // Too wide to fit: centre the run rather than letting it overhang one end.
  if (n && x[0] < 0) {
    const span = widths.reduce((a, w) => a + w, 0) + gap * (n - 1);
    let at = (total - span) / 2;
    for (let i = 0; i < n; i++) {
      x[i] = at;
      at += widths[i] + gap;
    }
  }
  return x;
}

/** Detailed (component) card height before the first card is measured: full, and compact. */
const EST_CARD_H = 92;
const EST_DENSE_H = 66;
const ROW_GAP = 10;
/** Stage gap between a band or flank and the drawing (matches .ast-smw-stage gap). */
const STAGE_GAP = 14;

type Scored<T> = T & {
  /** Stage height the layout needs. */
  need: number;
  /** Width the layout needs beyond the stage (cards plus a minimum drawing). */
  overW: number;
};

/** Smallest drawing width a flank layout may leave between its card columns. */
const MIN_FLANK_DRAW_W = 240;

/** Drawing area, less heavy penalties for anything that does not fit the stage. */
function scoreOf(l: Scored<StageLayout>, width: number, availH: number): number {
  return l.drawing.w * l.drawing.h - Math.max(0, l.need - availH) * width * 4 - l.overW * availH * 4;
}

function layoutBands(
  width: number,
  availH: number,
  clusters: Cluster[],
  aspect: number,
  detailed: boolean,
  compact: boolean,
  cardH: number,
): Scored<StageLayout & { mode: "bands" }> {
  const safeAspect = Math.max(aspect, 0.3);
  const clusterGap = compact ? 10 : CLUSTER_GAP;
  const minW = compact ? 132 : detailed ? 168 : CARD_W;
  const minSpan = (list: Cluster[]) =>
    list.reduce((a, c) => a + c.cols * minW + Math.max(0, c.cols - 1) * CARD_GAP, 0) +
    clusterGap * Math.max(0, list.length - 1);

  const byV = [...clusters].sort((a, b) => a.v - b.v || a.u - b.u);
  let nTop = byV.filter((c) => c.v < 0.5).length;

  if (detailed) {
    if (clusters.length <= 4) {
      const avgV = clusters.reduce((a, c) => a + c.v, 0) / Math.max(1, clusters.length);
      nTop = avgV <= 0.55 ? clusters.length : 0;
    } else {
      nTop = Math.ceil(clusters.length / 2);
    }
  } else if (minSpan(clusters) > width || nTop === 0 || nTop === clusters.length) {
    const half = minSpan(clusters) / 2;
    let acc = 0;
    nTop = 0;
    while (nTop < byV.length && acc + (byV[nTop].cols * minW) / 2 < half) {
      acc += byV[nTop++].cols * minW + clusterGap;
    }
    if (clusters.length >= 2) {
      nTop = Math.min(Math.max(1, nTop), clusters.length - 1);
    }
  }

  const topList = byV.slice(0, nTop);
  const botList = byV.slice(nTop);

  const countRows = (list: Cluster[]) => {
    if (list.length === 0) return 0;
    return Math.max(1, Math.ceil(minSpan(list) / width));
  };

  const nTopRows = countRows(topList);
  const nBotRows = countRows(botList);
  // Grouped clusters carry a label line over their cards.
  const rowH = detailed ? cardH : cardH + 22;
  const bandH = (n: number) => (n > 0 ? n * rowH + (n - 1) * 12 + STAGE_GAP : 0);
  const bandsH = bandH(nTopRows) + bandH(nBotRows);

  // The drawing takes the full width, or the height left over by the bands, whichever binds first.
  const naturalH = Math.round(width / safeAspect);
  const dh = Math.max(120, Math.min(naturalH, availH - bandsH));
  const dw = Math.min(width, Math.round(dh * safeAspect));
  const dx = Math.round((width - dw) / 2);

  const rowsOf = (list: Cluster[]): PlacedRow[] => {
    if (list.length === 0) return [];
    const sorted = [...list].sort((a, b) => a.u - b.u);
    const totalMin = minSpan(sorted);
    const nRows = Math.max(1, Math.ceil(totalMin / width));
    const target = totalMin / nRows;
    const rows: Cluster[][] = [[]];
    let acc = 0;
    for (const c of sorted) {
      const cMinW = c.cols * minW + Math.max(0, c.cols - 1) * CARD_GAP;
      const row = rows[rows.length - 1];
      const next = acc + (row.length ? clusterGap : 0) + cMinW;
      if (row.length && (next > width || (next > target + cMinW / 2 && rows.length < nRows))) {
        rows.push([c]);
        acc = cMinW;
      } else {
        row.push(c);
        acc = next;
      }
    }
    return rows.map((row) => {
      const totalCols = row.reduce((sum, c) => sum + c.cols, 0);
      const totalInternalGaps = row.reduce((sum, c) => sum + Math.max(0, c.cols - 1) * CARD_GAP, 0);
      const totalClusterGaps = Math.max(0, row.length - 1) * clusterGap;
      const availForCards = width - totalInternalGaps - totalClusterGaps;
      const maxW = detailed ? (compact ? 260 : 300) : 240;
      const adaptiveCardW = Math.min(maxW, Math.max(minW, Math.floor(availForCards / Math.max(1, totalCols))));

      const sizedRow = row.map((c) => ({
        ...c,
        cardW: adaptiveCardW,
        width: c.cols * adaptiveCardW + (c.cols - 1) * CARD_GAP,
      }));

      const rowSpan = sizedRow.reduce((a, c) => a + c.width, 0) + totalClusterGaps;
      const distributeEvenly = detailed && sizedRow.length >= 3 && rowSpan >= width * 0.72;
      const ideals = distributeEvenly
        ? sizedRow.map((_, i) => ((i + 0.5) / sizedRow.length) * width)
        : sizedRow.map((c) => dx + c.u * dw);

      const xs = pack(
        ideals,
        sizedRow.map((c) => c.width),
        clusterGap,
        width,
      );
      return { clusters: sizedRow.map((cluster, i) => ({ cluster, x: xs[i] })) };
    });
  };

  return {
    mode: "bands",
    drawing: { w: dw, h: dh },
    top: rowsOf(topList),
    bottom: rowsOf(botList),
    need: bandsH + dh,
    overW: 0,
  };
}

/**
 * Cards in columns left and right of the drawing. Each side takes as many
 * columns as it needs for its cards to fit the stage height; spare width
 * widens the cards, and the drawing keeps the rest at its own proportions.
 */
function layoutFlanks(
  width: number,
  availH: number,
  clusters: Cluster[],
  aspect: number,
  compact: boolean,
  cardH: number,
): Scored<StageLayout & { mode: "flank" }> {
  const safeAspect = Math.max(aspect, 0.3);
  const byU = [...clusters].sort((a, b) => a.u - b.u || a.v - b.v);

  let leftRaw: Cluster[] = [];
  let rightRaw: Cluster[] = [];
  if (byU.length === 1) {
    if (byU[0].u < 0.45) leftRaw = [byU[0]];
    else rightRaw = [byU[0]];
  } else {
    const nLeft = Math.ceil(byU.length / 2);
    leftRaw = byU.slice(0, nLeft);
    rightRaw = byU.slice(nLeft);
  }

  // Sort each flank top-to-bottom by pad v so leader lines never cross.
  const sortByV = (list: Cluster[]) => [...list].sort((a, b) => a.v - b.v || a.u - b.u);
  const leftList = sortByV(leftRaw);
  const rightList = sortByV(rightRaw);

  const perCol = Math.max(1, Math.floor((availH + ROW_GAP) / (cardH + ROW_GAP)));
  const colsFor = (n: number) => (n ? Math.min(n, Math.ceil(n / perCol)) : 0);
  const leftCols = colsFor(leftList.length);
  const rightCols = colsFor(rightList.length);

  const minCardW = compact ? 156 : 186;
  const maxCardW = compact ? 260 : 320;
  const flankGap = 18;
  const sideW = (cols: number, cw: number) => (cols ? cols * cw + (cols - 1) * CARD_GAP : 0);
  const gaps = (leftCols ? flankGap : 0) + (rightCols ? flankGap : 0);

  // Drawing first: as large as the stage height allows within the width the narrowest cards leave.
  const freeW = width - sideW(leftCols, minCardW) - sideW(rightCols, minCardW) - gaps;
  const maxDrawW = Math.max(160, freeW);
  const dh = Math.max(120, Math.min(availH, Math.round(maxDrawW / safeAspect)));
  const dw = Math.min(maxDrawW, Math.round(dh * safeAspect));

  // Spare width widens the cards (up to a readable maximum).
  const totalCols = leftCols + rightCols;
  const internalGaps = (leftCols ? (leftCols - 1) * CARD_GAP : 0) + (rightCols ? (rightCols - 1) * CARD_GAP : 0);
  const cardW = totalCols
    ? Math.min(maxCardW, Math.max(minCardW, Math.floor((width - dw - gaps - internalGaps) / totalCols)))
    : minCardW;

  const rows = Math.max(leftCols ? Math.ceil(leftList.length / leftCols) : 0, rightCols ? Math.ceil(rightList.length / rightCols) : 0);
  const flankH = rows ? rows * cardH + (rows - 1) * ROW_GAP : 0;

  const sizeClusters = (list: Cluster[]) => list.map((c) => ({ ...c, cardW, width: c.cols * cardW + (c.cols - 1) * CARD_GAP }));

  return {
    mode: "flank",
    drawing: { w: dw, h: dh },
    left: { clusters: sizeClusters(leftList), cols: leftCols, cardW, width: sideW(leftCols, cardW) },
    right: { clusters: sizeClusters(rightList), cols: rightCols, cardW, width: sideW(rightCols, cardW) },
    need: Math.max(dh, flankH),
    overW: Math.max(0, MIN_FLANK_DRAW_W - freeW),
  };
}

/**
 * Picks the arrangement that gives the drawing the most area while the whole
 * stage fits `availH`: cards above / below a wide drawing, or beside a tall
 * one. When nothing fits, the one that overflows least.
 */
function layoutStage(
  width: number,
  availH: number,
  clusters: Cluster[],
  aspect: number,
  detailed: boolean,
  compact: boolean,
  cardH: number,
): Scored<StageLayout> {
  const bands = layoutBands(width, availH, clusters, aspect, detailed, compact, cardH);
  if (!detailed || clusters.length === 0 || width < 760) return bands;
  const flank = layoutFlanks(width, availH, clusters, aspect, compact, cardH);
  return scoreOf(flank, width, availH) >= scoreOf(bands, width, availH) ? flank : bands;
}

export function SensorWidgetStage({
  sensors,
  aspect,
  positionOf,
  pointOf,
  groups,
  renderDrawing,
  selectedTag,
  onToggle,
  limitOf,
  compact = false,
  fill = false,
  fillHeight,
  onLayout,
  maxDrawingHeight,
}: {
  sensors: DetailedSensorInfo[];
  /** Size the drawing box to `aspect` at the full stage width (no height cap), so the drawing has no empty margin. */
  fitDrawing?: boolean;
  /** Compact single-screen mode: tighter cards and bounded drawing height so the component fits in one screen. */
  compact?: boolean;
  /** Optional explicit max height (px) for the drawing area. */
  maxDrawingHeight?: number;
  /**
   * Fill the parent's height (the parent must give the stage a definite
   * height): the drawing and its cards are laid out to fit that box.
   */
  fill?: boolean;
  /** Fill mode: plan for this height instead of the measured one (the parent may shorten the box to `onLayout`'s need). */
  fillHeight?: number;
  /** Height (px) the chosen layout needs: lets a fill-mode parent give back unused height. */
  onLayout?: (need: number) => void;
  /** Engine limit per tag for live machines, so band limits draw both sides. */
  limitOf?: (tag: string) => LimitRule | null | undefined;
  /** Drawing width / height. */
  aspect: number;
  /** Where the sensor's pad sits on the drawing, or null when it is not drawn. */
  positionOf: (s: DetailedSensorInfo) => RingPosition | null;
  /** Point label shown on the card (P1 …); falls back to the tag. */
  pointOf?: (s: DetailedSensorInfo) => string;
  /** One cluster per group; without groups, each card stands alone with its limit bar. */
  groups?: SensorGroup[];
  /**
   * The drawing, sized to fill its box. `hot` is the traced tag, `hover` the
   * hovered card's, `hoverGroup` the hovered cluster's group.
   */
  renderDrawing: (hot: string | null, hover: string | null, hoverGroup: string | null) => React.ReactNode;
  selectedTag: string | null;
  onToggle: (tag: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number; vh: number }>({ w: 0, h: 0, vh: 900 });
  // Measured card heights, per density, so each layout is planned with real sizes.
  const [cardHs, setCardHs] = useState({ full: EST_CARD_H, dense: EST_DENSE_H });
  const [hover, setHover] = useState<string | null>(null);
  const [hoverGroup, setHoverGroup] = useState<string | null>(null);
  const [leaders, setLeaders] = useState<LeaderLine[]>([]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const next = {
        w: Math.round(el.clientWidth),
        h: Math.round(el.clientHeight),
        vh: typeof window !== "undefined" ? window.innerHeight : 900,
      };
      setSize((prev) => (prev.w === next.w && prev.h === next.h && prev.vh === next.vh ? prev : next));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const width = size.w;
  const vh = size.vh;
  const detailed = !groups;
  const cardW = detailed ? CARD_W_DETAILED : CARD_W;

  const clusters = useMemo<Cluster[]>(() => {
    const items = sensors.map<Item>((s) => {
      const pos = positionOf(s);
      return { sensor: s, tag: tagOf(s), placed: Boolean(pos), u: pos?.u ?? 0.5, v: pos?.v ?? 1 };
    });
    const make = (key: string, groupId: string | null, list: Item[], label?: string, caption?: string): Cluster => {
      const placed = list.filter((it) => it.placed);
      const mean = (f: (it: Item) => number, d: number) =>
        placed.length ? placed.reduce((a, it) => a + f(it), 0) / placed.length : d;
      const sorted = [...list].sort((a, b) => a.u - b.u || a.v - b.v);
      const cols = Math.min(MAX_COLS, sorted.length);
      return {
        key,
        groupId,
        label,
        caption,
        items: sorted,
        cols,
        cardW,
        width: cols * cardW + (cols - 1) * CARD_GAP,
        u: mean((it) => it.u, 0.5),
        v: mean((it) => it.v, 1),
      };
    };
    if (!groups) return items.map((it) => make(it.tag, null, [it]));
    const byTag = new Map(items.map((it) => [it.tag, it]));
    const seen = new Set<string>();
    const out: Cluster[] = [];
    for (const g of groups) {
      const list = g.tags.map((t) => byTag.get(t)).filter((it): it is Item => Boolean(it) && !seen.has(it!.tag));
      if (list.length === 0) continue;
      list.forEach((it) => seen.add(it.tag));
      out.push(make(g.id, g.id, list, g.label, g.caption));
    }
    const rest = items.filter((it) => !seen.has(it.tag));
    if (rest.length) out.push(make("__other", null, rest, "Other channels"));
    return out;
  }, [sensors, positionOf, groups, cardW]);

  const availH = fill && (fillHeight ?? size.h) > 0 ? (fillHeight ?? size.h) : (maxDrawingHeight ?? Math.max(400, Math.min(vh - 210, 780)));
  // In fill mode, compact cards take over when they give the drawing clearly more room
  // (full-size cards that cannot fit, or crowd the drawing on a short screen).
  const stage = useMemo(() => {
    if (width < STAGE_MIN_W) return null;
    const full = layoutStage(width, availH, clusters, aspect, detailed, compact, compact ? cardHs.dense : cardHs.full);
    if (compact || !fill || !detailed) return { ...full, dense: compact };
    const dense = layoutStage(width, availH, clusters, aspect, detailed, true, cardHs.dense);
    const fullScore = scoreOf(full, width, availH);
    const denseScore = scoreOf(dense, width, availH);
    const preferDense = denseScore > 0 ? denseScore * 0.8 > fullScore : denseScore > fullScore;
    return preferDense ? { ...dense, dense: true } : { ...full, dense: false };
  }, [width, availH, clusters, aspect, detailed, compact, fill, cardHs]);

  // Report the height the content needs: the planned layout, or the stacked content when too narrow for one.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!onLayout || !el || width === 0) return;
    if (stage) {
      onLayout(stage.need);
      return;
    }
    const kids = Array.from(el.children) as HTMLElement[];
    const gap = parseFloat(getComputedStyle(el).rowGap) || 0;
    const h = kids.reduce((a, k) => a + k.offsetHeight, 0) + gap * Math.max(0, kids.length - 1);
    if (h > 0) onLayout(Math.ceil(h));
  }, [onLayout, stage, width, clusters.length]);

  // Lay out with the cards' real height (names wrap, limit bars), not an estimate.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !stage) return;
    let max = 0;
    el.querySelectorAll<HTMLElement>(".ast-smw-card").forEach((c) => {
      max = Math.max(max, c.offsetHeight);
    });
    const slot = stage.dense ? "dense" : "full";
    if (max > 0 && Math.abs(max - cardHs[slot]) > 2) setCardHs((prev) => ({ ...prev, [slot]: max }));
  }, [stage, cardHs]);

  const hot = hover ?? selectedTag;
  const drawing = renderDrawing(hot, hover, hoverGroup);

  const layoutKey = useMemo(
    () => clusters.map((c) => `${c.key}:${c.items.map((it) => `${it.tag}:${it.sensor.status}`).join(",")}`).join("|"),
    [clusters],
  );

  // Measure rendered card and pad positions in local stage coordinates to draw CAD leader lines.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !stage) {
      setLeaders([]);
      return;
    }

    const measure = () => {
      const stageRect = el.getBoundingClientRect();
      if (stageRect.width === 0 || stageRect.height === 0) return;
      const scaleX = stageRect.width / (el.offsetWidth || 1);
      const scaleY = stageRect.height / (el.offsetHeight || 1);

      const groupByTag = new Map<string, string | null>();
      for (const c of clusters) {
        for (const it of c.items) groupByTag.set(it.tag, c.groupId);
      }

      const next: LeaderLine[] = [];
      for (const c of clusters) {
        for (const it of c.items) {
          const t = it.tag;
          const cardEl = el.querySelector<HTMLElement>(`[data-card-tag="${CSS.escape(t)}"]`);
          const padEl =
            el.querySelector<SVGElement>(`[data-pad-center="${CSS.escape(t)}"]`) ??
            el.querySelector<SVGElement>(`[data-pad="${CSS.escape(t)}"]`);
          if (!cardEl || !padEl) continue;

          const cRect = cardEl.getBoundingClientRect();
          const pRect = padEl.getBoundingClientRect();
          if (cRect.width === 0 || pRect.width === 0) continue;

          const cLeft = (cRect.left - stageRect.left) / scaleX;
          const cRight = (cRect.right - stageRect.left) / scaleX;
          const cx = (cLeft + cRight) / 2;
          const cTop = (cRect.top - stageRect.top) / scaleY;
          const cBottom = (cRect.bottom - stageRect.top) / scaleY;
          const cy = (cTop + cBottom) / 2;
          const px = (pRect.left + pRect.width / 2 - stageRect.left) / scaleX;
          const py = (pRect.top + pRect.height / 2 - stageRect.top) / scaleY;

          let ax = cx;
          let ay = cy;
          let stubX = cx;
          let stubY = cy;

          if (stage.mode === "flank") {
            if (cRight <= px + 12) {
              ax = cRight;
              ay = cy;
              stubX = ax + 12;
              stubY = ay;
            } else if (cLeft >= px - 12) {
              ax = cLeft;
              ay = cy;
              stubX = ax - 12;
              stubY = ay;
            } else {
              const fromTop = cBottom <= py;
              ay = fromTop ? cBottom : cTop;
              stubY = ay + (fromTop ? 10 : -10);
            }
          } else {
            const fromTop = cBottom <= py;
            ay = fromTop ? cBottom : cTop;
            stubY = ay + (fromTop ? 10 : -10);
          }

          next.push({
            tag: t,
            groupId: groupByTag.get(t) ?? null,
            tone: severityTone(it.sensor.status),
            ax,
            ay,
            stubX,
            stubY,
            px,
            py,
          });
        }
      }
      setLeaders(next);
    };

    measure();
    const raf = requestAnimationFrame(measure);
    const mo = new MutationObserver(measure);
    mo.observe(el, { attributes: true, attributeFilter: ["viewBox"], subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, layoutKey, width, vh]);

  const card = (it: Item) => {
    const s = it.sensor;
    const point = pointOf?.(s) || s.point || it.tag;
    const scale = detailed ? gaugeScale(s, limitOf?.(it.tag)) : null;
    return (
      <button
        key={it.tag}
        type="button"
        className="ast-smw-card"
        data-card-tag={it.tag}
        data-tone={severityTone(s.status)}
        data-hot={hot === it.tag || undefined}
        data-detailed={detailed || undefined}
        aria-pressed={selectedTag === it.tag}
        aria-label={`${point} ${it.tag} ${s.name}: ${s.value} ${s.unit}, ${s.status}${s.dataQuality ? `, data ${s.dataQuality.label.toLowerCase()}` : ""}`}
        onClick={() => onToggle(it.tag)}
        onMouseEnter={() => setHover(it.tag)}
        onMouseLeave={() => setHover(null)}
        onFocus={() => setHover(it.tag)}
        onBlur={() => setHover(null)}
      >
        <span className="ast-smw-card-head">
          <span className="ast-chip-dot" aria-hidden="true" />
          <span className="ast-smw-name" title={s.name}>
            {s.name}
          </span>
        </span>
        <span className="ast-smw-card-foot">
          <span className="ast-smw-value ast-num">
            {s.value}
            {s.unit && s.unit !== "state" && <span className="ast-unit">{s.unit}</span>}
          </span>
          {s.dataQuality && (s.dataQuality.tone === "warn" || s.dataQuality.tone === "bad") ? (
            <span className="pg-sensors-qmark" data-tone={s.dataQuality.tone} title={`Data ${s.dataQuality.label.toLowerCase()}`}>
              {s.dataQuality.label}
            </span>
          ) : (
            <span className="ast-smw-point ast-num">{point}</span>
          )}
        </span>
        {detailed &&
          (scale ? (
            <LimitBar sensor={s} scale={scale} />
          ) : (
            <span className="ast-smw-note">{it.placed ? "Discrete signal" : "Not on drawing"}</span>
          ))}
      </button>
    );
  };

  const cluster = (c: Cluster, style?: React.CSSProperties) => {
    const lit = c.items.some((it) => it.tag === hot) || (c.groupId !== null && c.groupId === hoverGroup);
    return (
      <div
        key={c.key}
        className="ast-smw-cluster"
        role="group"
        aria-label={c.label ?? c.items[0].sensor.name}
        data-tone={worstTone(c.items)}
        data-lit={lit || undefined}
        style={{ ...style, width: stage ? c.width : undefined }}
        onMouseEnter={() => setHoverGroup(c.groupId)}
        onMouseLeave={() => setHoverGroup(null)}
      >
        {c.label && (
          <span className="ast-smw-label">
            <span className="ast-smw-label-text" title={c.label}>
              {c.label}
            </span>
            {c.caption && <span className="ast-smw-label-meta ast-num">{c.caption}</span>}
          </span>
        )}
        <span
          className="ast-smw-cards"
          style={stage ? { gridTemplateColumns: `repeat(${c.cols}, ${c.cardW}px)` } : undefined}
        >
          {c.items.map((it) => card(it))}
        </span>
      </div>
    );
  };

  const band = (rows: PlacedRow[], edge: "top" | "bottom") =>
    rows.length > 0 && (
      <div className={`ast-smw-band is-${edge}`}>
        {rows.map((row, r) => (
          <div key={r} className="ast-smw-row-stack">
            {row.clusters.map(({ cluster: c, x }) => cluster(c, { marginLeft: x }))}
          </div>
        ))}
      </div>
    );

  const flank = (side: PlacedFlank, edge: "left" | "right") =>
    side.clusters.length > 0 && (
      <div
        className={`ast-smw-flank is-${edge}`}
        style={{
          width: side.width,
          gridTemplateColumns: `repeat(${side.cols}, ${side.cardW}px)`,
        }}
      >
        {side.clusters.map((c) => cluster(c))}
      </div>
    );

  return (
    <div
      ref={ref}
      className="ast-smw-stage"
      data-mode={stage?.mode}
      data-hot={hot ? "" : undefined}
      data-compact={(stage?.dense ?? compact) || undefined}
      data-fill={fill || undefined}
    >
      {stage ? (
        <>
          {leaders.length > 0 && (
            <svg className="ast-smw-leaders" aria-hidden="true">
              {leaders.map((l) => {
                const isHot = l.tag === hot || (l.groupId !== null && l.groupId === hoverGroup);
                if (!detailed && !isHot && hot) return null;
                return (
                  <g
                    key={l.tag}
                    className="ast-smw-leader"
                    data-hot={isHot || undefined}
                    data-tone={l.tone}
                    data-detailed={detailed || undefined}
                  >
                    <path
                      d={`M ${l.ax.toFixed(1)} ${l.ay.toFixed(1)} L ${l.stubX.toFixed(1)} ${l.stubY.toFixed(1)} L ${l.px.toFixed(1)} ${l.py.toFixed(1)}`}
                    />
                    <circle cx={l.ax} cy={l.ay} r={2.2} />
                  </g>
                );
              })}
            </svg>
          )}
          {stage.mode === "flank" ? (
            <div className="ast-smw-flank-row">
              {flank(stage.left, "left")}
              <div className="ast-smw-drawing" style={{ width: stage.drawing.w, height: stage.drawing.h }}>
                {drawing}
              </div>
              {flank(stage.right, "right")}
            </div>
          ) : (
            <>
              {band(stage.top, "top")}
              <div className="ast-smw-drawing" style={{ width: stage.drawing.w, height: stage.drawing.h }}>
                {drawing}
              </div>
              {band(stage.bottom, "bottom")}
            </>
          )}
        </>
      ) : (
        <>
          <div
            className="ast-smw-drawing is-static"
            style={
              fill && width > 0
                ? { width: Math.min(width, Math.round(availH * aspect)), height: Math.round(Math.min(width, availH * aspect) / Math.max(aspect, 0.1)) }
                : undefined
            }
          >
            {drawing}
          </div>
          <div className="ast-smw-flow">{clusters.map((c) => cluster(c))}</div>
        </>
      )}
    </div>
  );
}
