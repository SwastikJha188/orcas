/**
 * Outline of a line sheet's equipment, traced from the drawing itself: the
 * rendered art is rasterised (alpha only), thin strokes (pipes, flow lines,
 * labels) are dropped, small gaps closed, the shapes grown by a small offset,
 * and the boundary traced into polylines in sheet units. The health layer
 * strokes these as thin lines, so a part's border follows its shape
 * instead of a box around it.
 *
 * Runs once per sheet in the browser (cached by sheet id); the raster needs the
 * DOM, the trace runs in `art-outline.worker.ts`.
 */

import { trace, type OutlineOptions, type Polyline, type TraceRequest } from "./art-outline-trace";

export type { OutlineOptions, Polyline };

const cache = new Map<string, Promise<Polyline[]>>();

/** Outline polylines of the art under `root` (an element holding the rendered art, hidden or not). */
export function artOutline(key: string, root: SVGGraphicsElement, width: number, height: number, opts: OutlineOptions): Promise<Polyline[]> {
  const hit = cache.get(key);
  if (hit) return hit;
  const job = rasterAlpha(root, width, height, opts.scale).then(({ mask, w, h }) => traceOffThread(mask, w, h, opts));
  job.catch(() => cache.delete(key));
  cache.set(key, job);
  return job;
}

/** Runs the trace in a worker so the page never stalls; in-thread if workers are unavailable. */
function traceOffThread(mask: Uint8Array, w: number, h: number, opts: OutlineOptions): Promise<Polyline[]> {
  let worker: Worker;
  try {
    worker = new Worker(new URL("./art-outline.worker.ts", import.meta.url));
  } catch {
    return Promise.resolve(trace(mask, w, h, opts));
  }
  return new Promise<Polyline[]>((res, rej) => {
    worker.onmessage = (e: MessageEvent<Polyline[]>) => {
      worker.terminate();
      res(e.data);
    };
    worker.onerror = (e) => {
      worker.terminate();
      rej(new Error(e.message));
    };
    const msg: TraceRequest = { mask, w, h, opts };
    worker.postMessage(msg, [mask.buffer]);
  });
}

/* ── Raster ─────────────────────────────────────────────────────────────── */

const STYLE_PROPS = ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity", "fill-opacity", "stroke-opacity", "visibility", "font-size", "font-family", "font-weight"] as const;

/** Copies the art with every resolved paint inlined (CSS variables and gradients don't survive serialising) and draws it; returns a binary mask. */
async function rasterAlpha(root: SVGGraphicsElement, width: number, height: number, scale: number) {
  const clone = root.cloneNode(true) as SVGGraphicsElement;
  const src = [root, ...root.querySelectorAll("*")];
  const dst = [clone, ...clone.querySelectorAll("*")];
  src.forEach((el, i) => {
    const out = dst[i] as SVGElement;
    if (!(el instanceof SVGElement) || !out) return;
    const cs = getComputedStyle(el);
    const parts = STYLE_PROPS.map((p) => {
      let v = cs.getPropertyValue(p);
      // Only coverage matters: any paint server becomes solid.
      if ((p === "fill" || p === "stroke") && v.startsWith("url(")) v = "#000";
      return v ? `${p}:${v}` : "";
    });
    // Labels are not equipment: leave them out of the outline.
    const isText = el instanceof SVGTextContentElement;
    parts.push(isText ? "display:none" : "display:inline", "filter:none", "mask:none");
    out.setAttribute("style", parts.filter(Boolean).join(";"));
    out.removeAttribute("filter");
    out.removeAttribute("mask");
  });
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${width} ${height}">${new XMLSerializer().serializeToString(clone)}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("art raster failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 64 ? 1 : 0;
    return { mask, w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

