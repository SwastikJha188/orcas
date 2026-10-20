"use client";

/**
 * Health of a line sheet drawn as a thin line in the health colour along the
 * equipment's own outline (traced from the drawing by `art-outline`); the
 * drawing itself is never coloured. Each stretch of outline belongs to the
 * first owner area (in the given order) it lies in; stretches in no area, or in
 * one without a tone, stay undrawn. Runs share their ends, so a line never
 * breaks where one area meets the next: it only changes colour.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MX } from "@/components/assets/machine-kit/machine-kit";
import { artOutline, type Polyline } from "./art-outline";
import type { LineSheetArt } from "./types";

export type OutlineTone = "good" | "warn" | "bad";
export interface OutlineOwner {
  box: [number, number, number, number];
  /** null: this area is claimed but left undrawn (e.g. no live health). */
  tone: OutlineTone | null;
}

/** How the equipment outline is traced from the drawing (sheet units; see art-outline). */
const OUTLINE = { scale: 1, close: 2, open: 2.5, offset: 3 };
const TONES: OutlineTone[] = ["good", "warn", "bad"];
const colour = (tone: OutlineTone) => (tone === "bad" ? MX.bad : tone === "warn" ? MX.warn : MX.good);

export function HealthOutline({ art, owners }: { art: Pick<LineSheetArt, "id" | "Art" | "width" | "height">; owners: OutlineOwner[] }) {
  const k = art.width / 1144.5;
  // A hidden copy of the drawing, traced once per sheet into the equipment outline.
  const source = useRef<SVGGElement>(null);
  const [outline, setOutline] = useState<{ id: string; lines: Polyline[] } | null>(null);
  useEffect(() => {
    if (!source.current) return;
    let live = true;
    artOutline(art.id, source.current, art.width, art.height, OUTLINE)
      .then((lines) => live && setOutline({ id: art.id, lines }))
      .catch(() => live && setOutline(null));
    return () => {
      live = false;
    };
  }, [art.id, art.width, art.height]);
  const lines = outline?.id === art.id ? outline.lines : null;

  const ownerKey = owners.map((o) => `${o.box.join(",")}:${o.tone}`).join("|");
  // One path per colour: each outline cut into runs by owner.
  const paths = useMemo(() => {
    const out: Record<OutlineTone, string> = { good: "", warn: "", bad: "" };
    if (!lines) return out;
    const toneAt = (x: number, y: number) => owners.find(({ box: [bx, by, bw, bh] }) => x >= bx && x <= bx + bw && y >= by && y <= by + bh)?.tone ?? null;
    const STEP = 4;
    for (const { pts } of lines) {
      // Subdivide long simplified segments so ownership changes land where the area edge is.
      const dense: number[] = [pts[0], pts[1]];
      for (let i = 2; i < pts.length; i += 2) {
        const [x0, y0, x1, y1] = [pts[i - 2], pts[i - 1], pts[i], pts[i + 1]];
        const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / STEP));
        for (let j = 1; j <= n; j++) dense.push(x0 + ((x1 - x0) * j) / n, y0 + ((y1 - y0) * j) / n);
      }
      let run: number[] = [];
      let runTone: OutlineTone | null = null;
      const flush = () => {
        if (!runTone || run.length < 4) return;
        let d = `M${run[0].toFixed(1)} ${run[1].toFixed(1)}`;
        for (let i = 2; i < run.length; i += 2) d += `L${run[i].toFixed(1)} ${run[i + 1].toFixed(1)}`;
        out[runTone] += d;
      };
      for (let i = 0; i < dense.length; i += 2) {
        const t = toneAt(dense[i], dense[i + 1]);
        if (i > 0 && t !== runTone) {
          run.push(dense[i], dense[i + 1]);
          flush();
          run = [dense[i - 2], dense[i - 1]];
        }
        runTone = t;
        run.push(dense[i], dense[i + 1]);
      }
      flush();
    }
    return out;
    // owners is rebuilt by callers each render; ownerKey captures its content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, ownerKey]);

  const Art = art.Art;
  return (
    <g aria-hidden="true" pointerEvents="none">
      <g ref={source} style={{ display: "none" }}>
        <Art />
      </g>
      {/* Worst drawn last. */}
      {TONES.map((tone) =>
        paths[tone] ? <path key={tone} d={paths[tone]} fill="none" stroke={colour(tone)} strokeWidth={1.3 * k} strokeLinejoin="round" strokeLinecap="round" /> : null,
      )}
    </g>
  );
}
