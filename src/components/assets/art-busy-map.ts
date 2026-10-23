"use client";

/**
 * Where a drawing is busy: the sheet's equipment art rendered once, off
 * screen, as lines only (every outline, seam, pipe and label in black on
 * nothing), into a summed-area table. `density(l, t, r, b)` then says in O(1)
 * what share of a box is covered by drawn lines — 0 over empty sheet or a
 * plain housing face, high over motors, fans and pipe runs — so value plates
 * can be placed where they hide the least of the drawing.
 */
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

export interface BusyMap {
  /** Share (0–1) of the box [l, r] × [t, b] (sheet units) covered by drawn lines. */
  density: (l: number, t: number, r: number, b: number) => number;
  /** Share (0–1) of the box covered by equipment at all (filled bodies and lines). */
  cover: (l: number, t: number, r: number, b: number) => number;
  /** Share (0–1) of the box covered by the drawing's own words (section titles, equipment labels). */
  text: (l: number, t: number, r: number, b: number) => number;
}

/** Pixels per sheet unit of the off-screen render. */
const SCALE = 0.5;
/** A pixel counts as drawn above this alpha (0–255). */
const ALPHA_MIN = 40;

const cache = new Map<string, BusyMap>();
const pending = new Map<string, Promise<BusyMap | null>>();

async function build(Art: React.ComponentType, width: number, height: number): Promise<BusyMap | null> {
  // Out of the calling effect first: flushSync may not run inside React's commit.
  await new Promise((r) => setTimeout(r, 0));
  // Render the art into a detached element and take its markup.
  const host = document.createElement("div");
  const root = createRoot(host);
  flushSync(() =>
    root.render(
      React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${width} ${height}` }, React.createElement(Art)),
    ),
  );
  const inner = host.querySelector("svg")?.innerHTML ?? "";
  root.unmount();
  if (!inner) return null;
  const w = Math.ceil(width * SCALE);
  const h = Math.ceil(height * SCALE);
  // Lines only: fills dropped (a plain body face is calm to sit on), every stroke and text in black.
  const lines = await table(inner, width, height, w, h, `*{fill:none!important;stroke:#000!important;opacity:1!important}text,tspan{fill:#000!important;stroke:none!important}`);
  // Everything drawn: filled bodies too (a leader should not cross a machine).
  const solid = await table(inner, width, height, w, h, `*{fill:#000!important;stroke:#000!important;opacity:1!important}[fill="none"]{fill:none!important}`);
  // Words only: a plate over a section title or equipment label breaks the grouping it names (Proximity).
  const words = await table(inner, width, height, w, h, `*{fill:none!important;stroke:none!important}text,tspan{fill:#000!important}`);
  if (!lines || !solid || !words) return null;
  const share = (sat: Uint32Array) => (l: number, t: number, r: number, b: number) => {
    const cx = (v: number) => Math.max(0, Math.min(w, Math.round(v * SCALE)));
    const cy = (v: number) => Math.max(0, Math.min(h, Math.round(v * SCALE)));
    const [x0, x1, y0, y1] = [cx(l), cx(r), cy(t), cy(b)];
    // Outside the sheet counts as empty.
    const area = Math.max(1, (r - l) * (b - t) * SCALE * SCALE);
    if (x1 <= x0 || y1 <= y0) return 0;
    const W1 = w + 1;
    return (sat[y1 * W1 + x1] - sat[y0 * W1 + x1] - sat[y1 * W1 + x0] + sat[y0 * W1 + x0]) / area;
  };
  return { density: share(lines), cover: share(solid), text: share(words) };
}

/** Renders the art markup with `css` and returns the summed-area table of its drawn pixels. */
async function table(inner: string, width: number, height: number, w: number, h: number, css: string): Promise<Uint32Array | null> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${width} ${height}"><style>${css}</style>${inner}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("art render failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    // Summed-area table, one row / column of padding.
    const sat = new Uint32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) {
        row += data[(y * w + x) * 4 + 3] > ALPHA_MIN ? 1 : 0;
        sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1] + row;
      }
    }
    return sat;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The busy map of a sheet's art (null until it is built; built once per sheet and cached). */
export function useArtBusyMap(key: string | null, Art: React.ComponentType | undefined, width: number, height: number): BusyMap | null {
  // The map is held with its key: after a sheet change the previous sheet's map is never returned for the new one.
  const [held, setHeld] = useState<{ key: string; map: BusyMap } | null>(() => {
    const hit = key ? cache.get(key) : undefined;
    return key && hit ? { key, map: hit } : null;
  });
  const setMap = (m: BusyMap | null) => setHeld(key && m ? { key, map: m } : null);
  useEffect(() => {
    if (!key || !Art) {
      setMap(null);
      return;
    }
    const hit = cache.get(key);
    if (hit) {
      setMap(hit);
      return;
    }
    let live = true;
    let job = pending.get(key);
    if (!job) {
      job = build(Art, width, height).then((m) => {
        pending.delete(key);
        if (m) cache.set(key, m);
        return m;
      });
      pending.set(key, job);
    }
    void job.then((m) => {
      if (live) setMap(m);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setMap only closes over `key`
  }, [key, Art, width, height]);
  if (!key) return null;
  return held?.key === key ? held.map : cache.get(key) ?? null;
}
