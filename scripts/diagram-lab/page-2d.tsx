/**
 * Diagram lab, 2D: draws one machine-kit sheet (a module exporting `sheet:
 * LineSheetArt`) the way the app shows it — inside MachineSvg with the CAD
 * frame, pads as instrument rings, a plate at each callout — at the sheet's own
 * bounds (no auto-fit, so overflow shows), then writes a JSON report of what it
 * measured for render.mjs.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { MachinePad, MachineSvg, MX } from "@/components/assets/machine-kit/machine-kit";
import type { LineSheetArt } from "@/components/assets/pyro/line-sheets/types";

declare global {
  interface Window {
    __labDone?: boolean;
    __labReport?: unknown;
  }
}

export function mount2d(mod: Record<string, unknown>) {
  const sheet = (mod.sheet ?? Object.values(mod).find((v) => v && typeof v === "object" && "Art" in (v as object))) as LineSheetArt | undefined;
  const host = document.getElementById("root")!;
  if (!sheet || typeof sheet.Art !== "function") {
    window.__labReport = { errors: ["The file must `export const sheet: LineSheetArt = { id, width, height, Art, pads, ... }`."] };
    window.__labDone = true;
    return;
  }
  const { Art, width: W, height: H } = sheet;
  const pads = Object.entries(sheet.pads ?? {});
  const callouts = Object.entries(sheet.callouts ?? {});
  const chips = Object.entries(sheet.chips ?? {});
  const root = createRoot(host);
  flushSync(() =>
    root.render(
      <div style={{ width: "100vw", height: "100vh", background: "var(--mx-canvas)", padding: 16, boxSizing: "border-box" }}>
        <MachineSvg viewBox={`${-12} ${-12} ${W + 24} ${H + 24}`} label={sheet.id} autoFit={false} cadFrame={false} style={{ width: "100%", height: "100%" }}>
          <rect x={0} y={0} width={W} height={H} fill="none" stroke={MX.fine} strokeWidth={1} strokeDasharray="6 6" data-lab="frame" />
          <g id="lab-art">
            <Art />
          </g>
          <g id="lab-overlay">
            {callouts.map(([tag, [x, y, anchor]]) => {
              const w = Math.max(58, tag.length * 6.4 + 34);
              const x0 = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
              return (
                <g key={`c-${tag}`}>
                  <rect x={x0} y={y - 9} width={w} height={18} rx={3} fill="var(--mx-pad-panel)" stroke={MX.edge} strokeWidth={1} />
                  <text x={x0 + 6} y={y + 3.5} fontSize={9.5} fill={MX.label} fontFamily={MX.font}>
                    {tag} <tspan fill="var(--text-primary, #e6edf3)">42.0</tspan>
                  </text>
                </g>
              );
            })}
            {chips.map(([tag, [x, y]]) => {
              const w = tag.length * 6.4 + 14;
              const pad = sheet.pads?.[tag];
              return (
                <g key={`t-${tag}`}>
                  {pad && <line x1={pad[0]} y1={pad[1]} x2={x} y2={y} stroke={MX.edge} strokeWidth={1} />}
                  <rect x={x - w / 2} y={y - 9} width={w} height={18} rx={9} fill="var(--mx-pad-panel)" stroke={MX.edge} strokeWidth={1} />
                  <text x={x} y={y + 3.5} fontSize={9.5} textAnchor="middle" fill={MX.label} fontFamily={MX.font}>
                    {tag}
                  </text>
                </g>
              );
            })}
            {pads.map(([tag, [x, y]], i) => (
              <MachinePad key={`p-${tag}`} x={x} y={y} status={i === 0 ? "Alert" : "Normal"} />
            ))}
          </g>
        </MachineSvg>
      </div>,
    ),
  );
  setTimeout(() => {
    window.__labReport = measure(sheet);
    window.__labDone = true;
  }, 400);
}

function measure(sheet: LineSheetArt) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const art = document.getElementById("lab-art") as unknown as SVGGElement | null;
  const W = sheet.width;
  const H = sheet.height;
  if (!art) return { errors: ["Art did not render"] };
  const bb = art.getBBox();
  const shapes = Array.from(art.querySelectorAll("rect,circle,ellipse,path,polygon,polyline,line,text"));
  const tagCount: Record<string, number> = {};
  for (const el of shapes) tagCount[el.tagName] = (tagCount[el.tagName] ?? 0) + 1;
  // Raw colours: every fill / stroke must be a kit token (var(--mx-…)), a kit gradient (url(#…)), none or currentColor.
  const raw = new Map<string, number>();
  for (const el of Array.from(art.querySelectorAll("*"))) {
    for (const a of ["fill", "stroke", "stop-color"]) {
      const v = el.getAttribute(a);
      if (!v) continue;
      if (/^(none|transparent|currentColor|inherit)$/i.test(v) || v.startsWith("var(") || v.startsWith("url(")) continue;
      raw.set(v, (raw.get(v) ?? 0) + 1);
    }
  }
  if (raw.size) errors.push(`Raw colours used (use MX / PAINT tokens only): ${[...raw.entries()].map(([c, n]) => `${c} ×${n}`).join(", ")}`);
  const out = (b: { x: number; y: number; width: number; height: number }) => Math.max(0, -b.x, -b.y, b.x + b.width - W, b.y + b.height - H);
  const over = out(bb);
  if (over > 2) errors.push(`Art reaches ${over.toFixed(0)} units outside the sheet (0..${W} × 0..${H}); art box ${fmt(bb)}.`);
  const coverW = bb.width / W;
  const coverH = bb.height / H;
  if (coverW < 0.8) warnings.push(`Art fills only ${(coverW * 100).toFixed(0)}% of the sheet width; scale up or spread the equipment (target 85–95%).`);
  if (coverH < 0.6) warnings.push(`Art fills only ${(coverH * 100).toFixed(0)}% of the sheet height (target ≥ 70%).`);
  const texts = Array.from(art.querySelectorAll("text"));
  if (texts.length > 40) warnings.push(`${texts.length} text labels in the art; keep labels to equipment names (usually 3–20).`);
  const pads = Object.entries(sheet.pads ?? {});
  const padsOut = pads.filter(([, [x, y]]) => x < bb.x - 10 || y < bb.y - 10 || x > bb.x + bb.width + 10 || y > bb.y + bb.height + 10);
  if (padsOut.length) warnings.push(`Pads off the equipment: ${padsOut.map(([t]) => t).join(", ")}.`);
  // Pads must sit on drawn equipment: test the art under each pad centre.
  const svg = art.ownerSVGElement!;
  const pt = svg.createSVGPoint();
  const ctm = art.getScreenCTM();
  const floating: string[] = [];
  if (ctm) {
    const overlay = document.getElementById("lab-overlay") as unknown as SVGGElement;
    overlay.style.display = "none";
    for (const [tag, [x, y]] of pads) {
      pt.x = x;
      pt.y = y;
      const s = pt.matrixTransform(ctm);
      const hit = document.elementFromPoint(s.x, s.y);
      if (!hit || !art.contains(hit)) floating.push(tag);
    }
    overlay.style.display = "";
  }
  if (floating.length) warnings.push(`Pads not on any drawn part (move them onto the housing/pipe they measure): ${floating.join(", ")}.`);
  const cTags = new Set(Object.keys(sheet.callouts ?? {}));
  const missing = pads.filter(([t]) => !cTags.has(t)).map(([t]) => t);
  if (sheet.callouts && missing.length) warnings.push(`Pads without a callout: ${missing.join(", ")}.`);
  // Overlapping text labels.
  const boxes = texts.map((t) => (t as SVGTextElement).getBBox());
  let overlaps = 0;
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) overlaps++;
    }
  if (overlaps) warnings.push(`${overlaps} pairs of labels overlap.`);
  if (shapes.length < 60) warnings.push(`Only ${shapes.length} shapes: the drawing is probably too plain. Add the detail layer (bolts, panels, flanges, feet, ribs, shafts, supports) — current sheets use 150–600.`);
  if (!sheet.ready) warnings.push("`ready: true` is missing.");
  return {
    id: sheet.id,
    sheet: [W, H],
    artBox: [round(bb.x), round(bb.y), round(bb.width), round(bb.height)],
    fill: { width: `${(coverW * 100).toFixed(0)}%`, height: `${(coverH * 100).toFixed(0)}%` },
    shapes: shapes.length,
    byTag: tagCount,
    labels: texts.map((t) => t.textContent).slice(0, 40),
    pads: pads.length,
    callouts: Object.keys(sheet.callouts ?? {}).length,
    errors,
    warnings,
  };
}

const round = (n: number) => Math.round(n * 10) / 10;
const fmt = (b: { x: number; y: number; width: number; height: number }) => `[${round(b.x)}, ${round(b.y)}, ${round(b.width)} × ${round(b.height)}]`;
