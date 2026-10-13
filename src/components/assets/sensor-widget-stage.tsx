"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DetailedSensorInfo } from "./machine-sensor-mapping-view";
import { severityTone, type Tone } from "./assets-shell-ui";
import { LimitBar, gaugeScale } from "./sensor-gauge";

/* ==========================================================================
   Sensor mapping: the drawing at full stage width, with one floating glass
   card per channel docked above and below it. No leaders.

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
const CLUSTER_GAP = 22;
/** Most cards side by side in one cluster. */
const MAX_COLS = 2;
/** The drawing never grows past this height on wide screens. */
const MAX_DRAWING_H = 620;
/** Below this stage width the clusters fall into a plain flow under the drawing. */
const STAGE_MIN_W = 900;

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
  u: number;
  v: number;
}

interface PlacedRow {
  clusters: Array<{ cluster: Cluster; x: number }>;
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

function layoutStage(width: number, clusters: Cluster[], aspect: number) {
  const dh = Math.min(width / aspect, MAX_DRAWING_H);
  const dw = dh * aspect;
  const dx = (width - dw) / 2;
  const span = (list: Cluster[]) => list.reduce((a, c) => a + c.width, 0) + CLUSTER_GAP * Math.max(0, list.length - 1);

  // Upper half of the drawing docks above, lower half below. When one row
  // will not hold everything, split by v at half the total width so the
  // two bands carry a similar load.
  const byV = [...clusters].sort((a, b) => a.v - b.v || a.u - b.u);
  let nTop = byV.filter((c) => c.v < 0.5).length;
  if (span(clusters) > width) {
    const half = span(clusters) / 2;
    let acc = 0;
    nTop = 0;
    while (nTop < byV.length && acc + byV[nTop].width / 2 < half) acc += byV[nTop++].width + CLUSTER_GAP;
  }

  const rowsOf = (list: Cluster[]): PlacedRow[] => {
    if (list.length === 0) return [];
    const sorted = [...list].sort((a, b) => a.u - b.u);
    const nRows = Math.max(1, Math.ceil(span(sorted) / width));
    // Even rows by width, in drawing order.
    const target = span(sorted) / nRows;
    const rows: Cluster[][] = [[]];
    let acc = 0;
    for (const c of sorted) {
      const row = rows[rows.length - 1];
      const next = acc + (row.length ? CLUSTER_GAP : 0) + c.width;
      if (row.length && (next > width || (next > target + c.width / 2 && rows.length < nRows))) {
        rows.push([c]);
        acc = c.width;
      } else {
        row.push(c);
        acc = next;
      }
    }
    return rows.map((row) => {
      const xs = pack(
        row.map((c) => dx + c.u * dw),
        row.map((c) => c.width),
        CLUSTER_GAP,
        width
      );
      return { clusters: row.map((cluster, i) => ({ cluster, x: xs[i] })) };
    });
  };

  const top = rowsOf(byV.slice(0, nTop));
  return { drawing: { w: dw, h: dh }, top, bottom: rowsOf(byV.slice(nTop)) };
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
}: {
  sensors: DetailedSensorInfo[];
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
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [hoverGroup, setHoverGroup] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.round(el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      // Cards in a cluster read top-to-bottom, left-to-right like the drawing.
      const sorted = [...list].sort((a, b) => a.u - b.u || a.v - b.v);
      const cols = Math.min(MAX_COLS, sorted.length);
      return {
        key,
        groupId,
        label,
        caption,
        items: sorted,
        cols,
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

  const stage = useMemo(
    () => (width >= STAGE_MIN_W ? layoutStage(width, clusters, aspect) : null),
    [width, clusters, aspect]
  );

  const hot = hover ?? selectedTag;
  const drawing = renderDrawing(hot, hover, hoverGroup);

  const card = (it: Item, index: number) => {
    const s = it.sensor;
    const point = pointOf?.(s) || s.point || it.tag;
    const scale = detailed ? gaugeScale(s) : null;
    return (
      <button
        key={it.tag}
        type="button"
        className="ast-smw-card"
        data-tone={severityTone(s.status)}
        data-hot={hot === it.tag || undefined}
        data-detailed={detailed || undefined}
        aria-pressed={selectedTag === it.tag}
        aria-label={`${point} ${it.tag} ${s.name}: ${s.value} ${s.unit}, ${s.status}`}
        style={{ animationDelay: `${Math.min(index, 24) * 18}ms` }}
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
          <span className="ast-smw-point ast-num">{point}</span>
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

  let n = 0;
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
        style={{ ...style, width: c.width }}
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
        <span className="ast-smw-cards" style={{ gridTemplateColumns: `repeat(${c.cols}, ${cardW}px)` }}>
          {c.items.map((it) => card(it, n++))}
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

  return (
    <div ref={ref} className="ast-smw-stage" data-hot={hot ? "" : undefined}>
      {stage ? (
        <>
          {band(stage.top, "top")}
          <div className="ast-smw-drawing" style={{ width: stage.drawing.w, height: stage.drawing.h }}>
            {drawing}
          </div>
          {band(stage.bottom, "bottom")}
        </>
      ) : (
        <>
          <div className="ast-smw-drawing is-static">{drawing}</div>
          <div className="ast-smw-flow">{clusters.map((c) => cluster(c))}</div>
        </>
      )}
    </div>
  );
}
