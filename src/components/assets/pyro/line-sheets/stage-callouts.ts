"use client";

/**
 * Value blocks of a stage-overview sheet (an overview whose art carries
 * authored `callouts`): blocks sit where the stage-overview PDF prints the
 * point's label, and their text keeps a readable on-screen size whatever the
 * canvas size, so the drawing can always fill the canvas.
 */
import { useEffect, useMemo, useState } from "react";
import { layoutEmbeddedCallouts, type SensorCallout } from "@/components/assets/sensor-callout-layout";
import { useArtBusyMap } from "@/components/assets/art-busy-map";
import type { LineSheetArt } from "./types";

/** On-screen size of a block's value text (px). */
const VALUE_PX = 9.5;

export interface StageMetrics {
  fontSz: number;
  cardH: number;
  rx: number;
  textDy: number;
  padScale: number;
  /** Pad radius the blocks keep clear of. */
  padR: number;
  /** Side padding added to a block's text width. */
  padW: number;
  /** Half-width of the pad end of an embedded plate. */
  ring: number;
}

/**
 * Block metrics in sheet units for a canvas drawn at `pxPerUnit`. The text
 * keeps its on-screen size, within bounds relative to the sheet (a stage
 * overview is ~1,650 units wide, a part sheet ~500–760) so it never dwarfs or
 * vanishes into the drawing on a very small or very large canvas.
 */
export function stageMetrics(pxPerUnit: number | null, sheetW = 1654, points = 40): StageMetrics {
  // A dense stage overview caps the text tighter than a part sheet with a handful of points.
  const cap = sheetW / (points > 30 ? 115 : 70);
  const fontSz = Math.min(cap, Math.max(sheetW / 175, pxPerUnit ? VALUE_PX / pxPerUnit : sheetW / 140));
  const cardH = fontSz * 1.62;
  // The pad sits inside its plate: its halo fits the plate height.
  const padScale = Math.min(1.15, (cardH / 2 - 0.8) / 8.5);
  return {
    fontSz,
    cardH,
    rx: fontSz * 0.36,
    textDy: fontSz * 0.35,
    padScale,
    padR: 8.5 * padScale,
    padW: fontSz * 0.9,
    ring: 7 * padScale,
  };
}

/**
 * Rendered px per sheet unit of the element showing `box` with xMidYMid meet.
 * Returns the value and a callback ref for that element (it may mount later).
 */
export function usePxPerUnit(box: [number, number, number, number]): [number | null, (el: HTMLElement | null) => void, number | null] {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState<[number, number] | null>(null);
  useEffect(() => {
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      setSize((prev) => (prev && Math.abs(prev[0] - r.width) < 8 && Math.abs(prev[1] - r.height) < 8 ? prev : [r.width, r.height]));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  if (!size || size[0] <= 0 || size[1] <= 0) return [null, setEl, null];
  // The measured box is in screen pixels, which include the large-screen UI zoom (foundation.css --ui-zoom):
  // divide it out, so on-screen text and plates grow with the rest of the interface on big monitors.
  const zoom = uiZoom();
  // Rounded so a few pixels of resize do not re-run the layout.
  // Third: the canvas shape (width ÷ height), rounded so small resizes keep the layout.
  return [Math.round((Math.min(size[0] / box[2], size[1] / box[3]) / zoom) * 50) / 50, setEl, Math.round((size[0] / size[1]) * 20) / 20];
}

/** The large-screen UI zoom factor (`--ui-zoom` on :root, 1 below the TV tier). */
function uiZoom(): number {
  if (typeof window === "undefined") return 1;
  const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ui-zoom"));
  return Number.isFinite(z) && z > 0 ? z : 1;
}

/**
 * Lay out a stage sheet's value blocks: `width(tag, fontSz)` is the block's text
 * width. Returns the blocks and the viewBox (drawing plus blocks, tight).
 */
export function useStageLayout(
  art: LineSheetArt | undefined,
  tags: string[],
  artBox: [number, number, number, number],
  pxPerUnit: number | null,
  width: (tag: string, fontSz: number) => number,
  /** Canvas width ÷ height: plates may use the free canvas around the drawing. */
  aspect: number | null = null,
): { callouts: SensorCallout[]; viewBox: [number, number, number, number]; metrics: StageMetrics } {
  const sheetW = art?.width ?? 1654;
  const sheetH = art?.height ?? 774;
  const metrics = useMemo(() => stageMetrics(pxPerUnit, sheetW, tags.length), [pxPerUnit, sheetW, tags.length]);
  // Where the drawing is busy: plates on crowded equipment move into free space instead.
  const busy = useArtBusyMap(art && tags.length ? `art:v2:${art.id}` : null, art?.Art, sheetW, sheetH);
  // The drawing box grown to the canvas shape (centred), less a margin: the space the canvas shows anyway.
  const space = useMemo<[number, number, number, number]>(() => {
    const [x, y, w, h] = artBox;
    if (!aspect) return [x, y, w, h];
    const W = Math.max(w, h * aspect);
    const H = Math.max(h, w / aspect);
    const mx = (W - w) / 2;
    const my = (H - h) / 2;
    const pad = metrics.cardH * 0.6;
    return [x - mx + pad, y - my + pad, W - 2 * pad, H - 2 * pad];
  }, [artBox, aspect, metrics.cardH]);
  const layout = useMemo(() => {
    const pads = art?.pads ?? {};
    const pts = tags
      .filter((t) => pads[t])
      // Widths rounded up to steps: a value gaining a digit does not move plates around (calm updates).
      .map((tag) => {
        const q = metrics.fontSz * 2;
        return { tag, px: pads[tag][0], py: pads[tag][1], label: tag, w: Math.ceil((width(tag, metrics.fontSz) + metrics.padW) / q) * q };
      });
    return layoutEmbeddedCallouts(pts, art?.callouts ?? {}, artBox, {
      cardH: metrics.cardH,
      ring: metrics.ring,
      padR: metrics.padR,
      gapX: metrics.fontSz * 0.4,
      gapY: metrics.fontSz * 0.25,
      margin: 4,
      frame: [0, 0, sheetW, sheetH],
      busy: busy?.density,
      cover: busy?.cover,
      space,
    });
  }, [art, tags, artBox, metrics, width, sheetW, sheetH, busy, space]);
  return { ...layout, metrics };
}
