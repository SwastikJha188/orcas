"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import type { TwinInset } from "./plant-twin-canvas";

export type Side = keyof TwinInset;

/**
 * How far each floating panel reaches into the stage, px, keyed by the stage
 * edge it hugs. Panels laid out beside the stage (narrow screens) cover nothing.
 */
export function useCoveredInset(stage: React.RefObject<HTMLElement | null>, panels: Array<[Side, React.RefObject<HTMLElement | null>]>, active: boolean) {
  const [inset, setInset] = useState<TwinInset>({ top: 0, right: 0, bottom: 0, left: 0 });
  const panelsRef = useRef(panels);
  panelsRef.current = panels;

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el || !active) return;
    const measure = () => {
      const s = el.getBoundingClientRect();
      const next: TwinInset = { top: 0, right: 0, bottom: 0, left: 0 };
      for (const [side, ref] of panelsRef.current) {
        const p = ref.current?.getBoundingClientRect();
        if (!p || p.width === 0 || p.height === 0) continue;
        if (p.right <= s.left || p.left >= s.right || p.bottom <= s.top || p.top >= s.bottom) continue;
        const reach = side === "top" ? p.bottom - s.top : side === "left" ? p.right - s.left : side === "bottom" ? s.bottom - p.top : s.right - p.left;
        next[side] = Math.max(next[side], Math.round(reach));
      }
      setInset((cur) =>
        cur.top === next.top && cur.right === next.right && cur.bottom === next.bottom && cur.left === next.left ? cur : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const [, ref] of panelsRef.current) if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [stage, active, panels.length]);

  return inset;
}
