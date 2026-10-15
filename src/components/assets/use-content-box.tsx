"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { MX, measureTightSvgBox } from "./machine-kit/machine-kit";

/** Content box of a drawing in its own units: [x, y, w, h]. */
export type ContentBox = [number, number, number, number];

const CACHE = new Map<string, ContentBox>();

/**
 * The tight content box of a drawing, so its canvas can take the drawing's own
 * proportions and show it edge to edge at any width (no letterbox, no empty
 * margin, and no cropping of labels/pads/strokes). The footprint (the geometry
 * to measure: art, pads, chips) is drawn once in an invisible SVG — render
 * `measure` until `box` is set — and the box is cached by `key`.
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
    const next = measureTightSvgBox(g);
    if (next) {
      CACHE.set(k, next);
      setState({ key: k, box: next });
    }
  }, [k, box]);
  const measure =
    k && !box ? (
      <svg
        aria-hidden="true"
        width={1200}
        height={900}
        viewBox="0 0 1200 900"
        style={{
          position: "fixed",
          left: -9999,
          top: -9999,
          width: 1200,
          height: 900,
          overflow: "visible",
          visibility: "hidden",
          pointerEvents: "none",
          fontFamily: MX.font,
        }}
      >
        <g ref={ref}>{footprint()}</g>
      </svg>
    ) : null;
  return { box, measure };
}

