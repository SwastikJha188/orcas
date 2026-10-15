"use client";

import React, { useLayoutEffect, useRef, useState } from "react";

/** Content box of a drawing in its own units: [x, y, w, h]. */
export type ContentBox = [number, number, number, number];

const CACHE = new Map<string, ContentBox>();

/**
 * The tight content box of a drawing, so its canvas can take the drawing's own
 * proportions and show it edge to edge at any width (no letterbox, no empty
 * margin). The footprint (the geometry to measure: art, pads, chips) is drawn
 * once in an invisible SVG — render `measure` until `box` is set — and the box
 * is cached by `key`.
 */
export function useContentBox(key: string | null, footprint: () => React.ReactNode): { box: ContentBox | null; measure: React.ReactNode } {
  const k = key ?? "";
  const [state, setState] = useState<{ key: string; box: ContentBox | null }>({ key: k, box: CACHE.get(k) ?? null });
  const box = state.key === k ? state.box : (CACHE.get(k) ?? null);
  const ref = useRef<SVGGElement>(null);
  useLayoutEffect(() => {
    if (!k || box) return;
    const g = ref.current;
    if (!g) return;
    try {
      const b = g.getBBox();
      if (b.width > 0 && b.height > 0) {
        const m = Math.max(8, Math.min(b.width, b.height) * 0.02);
        const next: ContentBox = [b.x - m, b.y - m, b.width + 2 * m, b.height + 2 * m];
        CACHE.set(k, next);
        setState({ key: k, box: next });
      }
    } catch {
      /* not laid out yet */
    }
  }, [k, box]);
  const measure =
    k && !box ? (
      <svg aria-hidden="true" width={0} height={0} style={{ position: "absolute", overflow: "hidden", visibility: "hidden", pointerEvents: "none" }}>
        <g ref={ref}>{footprint()}</g>
      </svg>
    ) : null;
  return { box, measure };
}
