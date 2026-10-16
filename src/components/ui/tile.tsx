"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import type { Tone } from "./status";
import { alertTone } from "./kpi";
import { rowActivate } from "./row-activate";

/*
 * ULTRON tiles — one card per item (an alarm, a sensor, a check, a source)
 * laid out in a responsive grid. Used where a short list reads better as
 * cards than as table rows; long registers and logs stay tables.
 *
 *   TileGrid   .ui-tiles   responsive grid (min tile width via `min`); a short
 *                          row stretches to fill the width (no empty columns)
 *   Tile       .ast-card.ui-tile   head (title · status) → value → body → facts → foot.
 *                          A tile wider than ~560px puts its summary (head → facts)
 *                          on the left and its body (children) on the right.
 *
 * Place a TileGrid in a `Section bare` (or on the workspace) so tiles are
 * never cards inside a card. Status colour only for warning / alarm.
 * Styles: analysis-page.css (loaded by an-ui).
 */

/**
 * Column count that fills every row: the most columns of at least `min` px
 * that fit (capped at `max`), then evened out so the rows hold about the same
 * number of items (5 → 3 + 2, not 4 + 1). Null until measured (CSS grid then).
 */
export function useBalancedColumns(
  ref: React.RefObject<HTMLElement | null>,
  count: number,
  { min, max = Infinity, phoneCols }: { min: number; max?: number; phoneCols?: number },
): number | null {
  const [cols, setCols] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || count === 0) return;
    const update = () => {
      const w = el.clientWidth;
      if (!w) return;
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
      const phone = phoneCols !== undefined && window.matchMedia("(max-width: 640px)").matches;
      const fit = phone ? phoneCols : Math.max(1, Math.floor((w + gap) / (min + gap)));
      const most = Math.max(1, Math.min(fit, max, count));
      const rows = Math.ceil(count / most);
      setCols(Math.ceil(count / rows));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, count, min, max, phoneCols]);
  return cols;
}

/** Inline style + class for a balanced flex row layout (see `.is-balanced`). */
export function balancedProps(cols: number | null): { className: string; style: React.CSSProperties } {
  return cols ? { className: "is-balanced", style: { "--tile-cols": cols } as React.CSSProperties } : { className: "", style: {} };
}

export function TileGrid({
  label,
  min = 240,
  compact = false,
  fill = true,
  className = "",
  children,
}: {
  label: string;
  /** Minimum tile width in px before the grid wraps to fewer columns. */
  min?: number;
  /** Two columns on phones (short tiles: a count and a few facts). */
  compact?: boolean;
  /**
   * Fill every row: columns are evened out across rows and a short last row
   * stretches to the full width. Turn off for stacked groups whose columns
   * should line up with each other.
   */
  fill?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const count = React.Children.toArray(children).length;
  const cols = useBalancedColumns(ref, fill ? count : 0, { min, phoneCols: compact ? 2 : 1 });
  const bal = balancedProps(fill ? cols : null);
  return (
    <div
      ref={ref}
      className={`ui-tiles ${compact ? "is-compact" : ""} ${fill ? "is-fill" : ""} ${bal.className} ${className}`.replace(/\s+/g, " ").trim()}
      role="list"
      aria-label={label}
      style={{ "--tile-min": `${min}px`, ...bal.style } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export interface TileFact {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
}

export interface TileProps {
  /** Tag or name (first line). */
  title: React.ReactNode;
  /** Muted second line (name, location). */
  sub?: React.ReactNode;
  /** Top-right status word; the dot shows only for warning / alarm. */
  status?: { label: React.ReactNode; tone?: Tone } | null;
  /** Headline number or short text. */
  value?: React.ReactNode;
  unit?: React.ReactNode;
  /** Tone for the card (accent rim + value colour); alert tones only. */
  tone?: Tone;
  /** 0–100 thin meter under the value, or a custom bar node. */
  meter?: number | React.ReactNode;
  /** Free body (sparkline, gauge, chain). */
  children?: React.ReactNode;
  /** Compact label / value facts in a row. */
  facts?: TileFact[];
  foot?: React.ReactNode;
  /** Bottom-right controls (pill buttons, links). Clicks there do not select the tile. */
  actions?: React.ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  /** Extra attributes (data-*) for deep links. */
  attrs?: Record<string, string>;
}

export function Tile({
  title,
  sub,
  status,
  value,
  unit,
  tone,
  meter,
  children,
  facts,
  foot,
  actions,
  selected,
  onSelect,
  className = "",
  attrs,
}: TileProps) {
  const t = alertTone(tone);
  const st = status ? alertTone(status.tone) : undefined;
  const interactive = onSelect ? rowActivate(onSelect, selected) : { "aria-selected": selected };
  return (
    <div
      role="listitem"
      className={`ast-card ui-tile ${onSelect ? "is-clickable" : ""} ${selected ? "is-selected" : ""} ${className}`.trim()}
      data-tone={t}
      {...interactive}
      {...attrs}
    >
      <div className="ui-tile-body">
        <div className="ui-tile-lead">
          <div className="ui-tile-head">
            <span className="ui-tile-title">{title}</span>
            {status && (
              <span className="ui-tile-status" data-tone={st}>
                {st && <span className="ast-chip-dot" aria-hidden="true" />}
                {status.label}
              </span>
            )}
          </div>
          {sub && <span className="ui-tile-sub">{sub}</span>}
          {value !== undefined && value !== null && value !== "" && (
            <span className="ui-tile-value ast-num">
              {value}
              {unit !== undefined && unit !== null && unit !== "" && <span className="ui-tile-unit">{unit}</span>}
            </span>
          )}
          {typeof meter === "number" ? (
            <span className="ui-tile-meter" aria-hidden="true">
              <i style={{ width: `${Math.max(0, Math.min(100, meter))}%` }} />
            </span>
          ) : meter !== undefined && meter !== null && meter !== false ? (
            <div className="ui-tile-bar">{meter}</div>
          ) : null}
          {facts && facts.length > 0 && (
            <dl className="ui-tile-facts">
              {facts.map((f) => {
                const ft = alertTone(f.tone);
                return (
                  <div key={f.label} className="ui-tile-fact" data-tone={ft}>
                    <dt>{f.label}</dt>
                    <dd className="ast-num">{f.value}</dd>
                  </div>
                );
              })}
            </dl>
          )}
        </div>
        {React.Children.toArray(children).length > 0 && <div className="ui-tile-content">{children}</div>}
        {(foot || actions) && (
          <div className="ui-tile-foot">
            {foot && <span className="ui-tile-foot-text">{foot}</span>}
            {actions && (
              <span className="ui-tile-actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                {actions}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
