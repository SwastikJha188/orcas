"use client";

import { events as pointerEvents } from "@react-three/fiber";
import { useEffect, useState } from "react";

/** The TV-tier `body { zoom }` factor (`--ui-zoom`, foundation.css). 1 below the TV tier. */
export function readUiZoom(): number {
  if (typeof window === "undefined") return 1;
  const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ui-zoom"));
  return Number.isFinite(z) && z > 0 ? z : 1;
}

/**
 * Renderer pixel ratio for a three.js canvas under the TV zoom. The canvas is
 * laid out in CSS px and then magnified by `zoom`, so its drawing buffer must
 * scale by the same factor to stay crisp. Capped at 2, not below: a buffer
 * smaller than a Retina screen is upscaled by the browser, and its 1 px edge
 * lines resample unevenly and shimmer while the camera moves.
 */
export function useTwinDpr(max = 2): number {
  const [dpr, setDpr] = useState(1);
  useEffect(() => {
    const update = () => setDpr(Math.min(window.devicePixelRatio || 1, max) * readUiZoom());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [max]);
  return dpr;
}

/**
 * R3F measures the canvas with getBoundingClientRect, which reports zoomed px
 * under `body { zoom }`; offset sizes are CSS px, the space the canvas is laid
 * out (and picked) in.
 */
export const TWIN_RESIZE = { offsetSize: true } as const;

/**
 * Pointer events for the twin canvases. Under the TV zoom, `offsetX/Y` come in
 * zoomed px while the canvas size is CSS px, which skewed picking off-centre;
 * map the pointer through the canvas's on-screen rect instead (exact at any zoom).
 */
export const twinEvents: typeof pointerEvents = (store) => ({
  ...pointerEvents(store),
  compute(event, state) {
    const r = state.gl.domElement.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    state.pointer.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
    state.raycaster.setFromCamera(state.pointer, state.camera);
  },
});
