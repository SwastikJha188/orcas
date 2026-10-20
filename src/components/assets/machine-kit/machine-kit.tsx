"use client";

/**
 * ULTRON machine-drawing kit — the mandatory style for every machine diagram.
 *
 * Reference: the ULTRON Twin Screw Extruder (TSE) drawing
 * (ULTRON/ultron-software/assets/machines/twin-screw-extruder.png and
 * components/console/machine/artwork/expanderScene.ts):
 *
 *  - Solid graphite equipment bodies with a soft top-lit vertical gradient,
 *    generous rounded corners and one quiet mid-grey rim (1.5 px).
 *  - Recessed panels (windows, cut-aways, terminal boxes) in near-black.
 *  - Corner bolts, feet and base plates so the equipment reads as built.
 *  - Shafts, rollers and screws in brushed metal.
 *  - Process material (meal, clinker, oil, flame core) in muted brass — the
 *    only non-status colour, and only inside the equipment.
 *  - No drawing background or grid of its own: the canvas owns that.
 *  - Instrument points are TSE measurement pads: hollow ring when healthy,
 *    filled with a halo when a reading needs attention. Status colour only.
 *
 * Every colour is a semantic `--mx-*` token (globals.css) with light and dark
 * values. Gradients are per-SVG (`useId`) and exposed to child shapes through
 * CSS custom properties, so shapes written as `fill={MX.body}` pick up the
 * gradient of whichever drawing they sit in.
 */

import React, { useCallback, useId, useLayoutEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

export const MX = {
  /** Gradient paints (fall back to flat tokens outside a MachineSvg). */
  body: "var(--mx-paint-body, var(--mx-body))",
  raised: "var(--mx-paint-raised, var(--mx-raised))",
  cylinder: "var(--mx-paint-cyl, var(--mx-body))",
  cylinderV: "var(--mx-paint-cylv, var(--mx-body))",
  shaft: "var(--mx-paint-shaft, var(--mx-metal))",
  material: "var(--mx-paint-material, var(--mx-material))",
  heat: "var(--mx-paint-heat, var(--mx-material))",
  /** Flat tokens. */
  flatBody: "var(--mx-body)",
  flatRaised: "var(--mx-raised)",
  deep: "var(--mx-deep)",
  edge: "var(--mx-edge)",
  fine: "var(--mx-fine)",
  label: "var(--mx-label)",
  metal: "var(--mx-metal)",
  metalHi: "var(--mx-metal-hi)",
  padPanel: "var(--mx-pad-panel)",
  /** Process flow lines: hot gas, air. */
  gas: "var(--mx-flow-gas)",
  air: "var(--mx-flow-air)",
  good: "var(--status-success)",
  warn: "var(--status-warning)",
  bad: "var(--status-danger)",
  font: "var(--font-ui)",
  w: 1.5,
  wFine: 1,
} as const;

/** Spreadable shape presets. */
export const PAINT = {
  body: { fill: MX.body, stroke: MX.edge, strokeWidth: MX.w, strokeLinejoin: "round" as const },
  raised: { fill: MX.raised, stroke: MX.edge, strokeWidth: MX.w, strokeLinejoin: "round" as const },
  recess: { fill: MX.deep, stroke: MX.fine, strokeWidth: MX.wFine },
  cylinder: { fill: MX.cylinder, stroke: MX.edge, strokeWidth: MX.w, strokeLinejoin: "round" as const },
  cylinderV: { fill: MX.cylinderV, stroke: MX.edge, strokeWidth: MX.w, strokeLinejoin: "round" as const },
  shaft: { fill: MX.shaft, stroke: MX.edge, strokeWidth: MX.wFine },
  material: { fill: MX.material, stroke: "none" },
  detail: { fill: "none", stroke: MX.fine, strokeWidth: MX.wFine, strokeLinecap: "round" as const },
  hair: { fill: "none", stroke: MX.fine, strokeWidth: 0.8, strokeLinecap: "round" as const },
  outline: { fill: "none", stroke: MX.edge, strokeWidth: MX.w, strokeLinejoin: "round" as const },
} as const;

export type PadStatus = "Normal" | "Alert" | "Critical";

export function statusColor(status: string | undefined): string {
  if (status === "Critical" || status === "Active" || status === "Alarm" || status === "Trip") return MX.bad;
  if (status === "Alert" || status === "Warning") return MX.warn;
  return MX.good;
}

/* ------------------------------------------------------------------ */
/* Per-SVG gradients                                                   */
/* ------------------------------------------------------------------ */

/** Stable, CSS-safe id prefix for one drawing. */
export function useKitId(): string {
  return `mx${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** CSS custom properties that route `MX.*` paints to this drawing's gradients. */
export function kitStyle(id: string): React.CSSProperties {
  return {
    ["--mx-paint-body" as string]: `url(#${id}-body)`,
    ["--mx-paint-raised" as string]: `url(#${id}-raised)`,
    ["--mx-paint-cyl" as string]: `url(#${id}-cyl)`,
    ["--mx-paint-cylv" as string]: `url(#${id}-cylv)`,
    ["--mx-paint-shaft" as string]: `url(#${id}-shaft)`,
    ["--mx-paint-material" as string]: `url(#${id}-material)`,
    ["--mx-paint-heat" as string]: `url(#${id}-heat)`,
  } as React.CSSProperties;
}

const stop = (offset: number, token: string, opacity?: number) => (
  <stop offset={offset} style={{ stopColor: `var(${token})`, stopOpacity: opacity }} />
);

/** Gradient definitions for one drawing. Render once inside each `<svg>`. */
export function MachineDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
        {stop(0, "--mx-raised")}
        {stop(0.45, "--mx-body")}
        {stop(1, "--mx-body-deep")}
      </linearGradient>
      <linearGradient id={`${id}-raised`} x1="0" y1="0" x2="0" y2="1">
        {stop(0, "--mx-raised-hi")}
        {stop(1, "--mx-raised")}
      </linearGradient>
      <linearGradient id={`${id}-cyl`} x1="0" y1="0" x2="0" y2="1">
        {stop(0, "--mx-body-deep")}
        {stop(0.2, "--mx-body")}
        {stop(0.42, "--mx-raised-hi")}
        {stop(0.68, "--mx-body")}
        {stop(1, "--mx-deep")}
      </linearGradient>
      <linearGradient id={`${id}-cylv`} x1="0" y1="0" x2="1" y2="0">
        {stop(0, "--mx-body-deep")}
        {stop(0.22, "--mx-body")}
        {stop(0.45, "--mx-raised-hi")}
        {stop(0.7, "--mx-body")}
        {stop(1, "--mx-deep")}
      </linearGradient>
      <linearGradient id={`${id}-shaft`} x1="0" y1="0" x2="0" y2="1">
        {stop(0, "--mx-metal-dark")}
        {stop(0.3, "--mx-metal")}
        {stop(0.45, "--mx-metal-hi")}
        {stop(0.62, "--mx-metal")}
        {stop(1, "--mx-metal-dark")}
      </linearGradient>
      <linearGradient id={`${id}-material`} x1="0" y1="0" x2="0" y2="1">
        {stop(0, "--mx-material-hi")}
        {stop(1, "--mx-material-deep")}
      </linearGradient>
      <radialGradient id={`${id}-heat`} cx="0.75" cy="0.5" r="0.7">
        {stop(0, "--mx-material-hi", 0.95)}
        {stop(0.45, "--mx-material", 0.55)}
        {stop(1, "--mx-material-deep", 0)}
      </radialGradient>
    </defs>
  );
}

/**
 * CAD Orthographic Engineering Frame: renders subtle X/Y world origin datum axes,
 * corner registration brackets, and coordinate scale ticks around the drawing bounds
 * so every schematic reads as a technical CAD diagram rather than a flat picture.
 */
export function CadEngineeringFrame({
  x,
  y,
  w,
  h,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const x0 = x + 3;
  const y0 = y + 3;
  const x1 = x + w - 3;
  const y1 = y + h - 3;
  const arm = Math.min(11, w * 0.025, h * 0.045);
  const ticksX: number[] = [];
  const stepX = Math.max(40, Math.round(w / 12 / 10) * 10);
  for (let tx = x + stepX; tx < x + w - stepX / 2; tx += stepX) ticksX.push(tx);

  return (
    <g aria-hidden="true" pointerEvents="none">
      {/* Subtle Blender/CAD X & Y world origin axes */}
      <line x1={x} y1={cy} x2={x + w} y2={cy} stroke="var(--mx-axis-x)" strokeWidth={0.75} strokeDasharray="10 4 2 4" />
      <line x1={cx} y1={y} x2={cx} y2={y + h} stroke="var(--mx-axis-y)" strokeWidth={0.75} strokeDasharray="10 4 2 4" />
      <circle cx={cx} cy={cy} r={3} fill="none" stroke={MX.fine} strokeWidth={0.75} opacity={0.6} />

      {/* Four CAD corner registration marks */}
      <path
        d={`
          M ${x0} ${y0 + arm} V ${y0} H ${x0 + arm}
          M ${x1 - arm} ${y0} H ${x1} V ${y0 + arm}
          M ${x0} ${y1 - arm} V ${y1} H ${x0 + arm}
          M ${x1 - arm} ${y1} H ${x1} V ${y1 - arm}
        `}
        fill="none"
        stroke={MX.edge}
        strokeWidth={1}
        opacity={0.55}
      />

      {/* Scale ruler ticks along top & bottom edges */}
      {ticksX.map((tx) => (
        <g key={tx} opacity={0.4}>
          <line x1={tx} y1={y0} x2={tx} y2={y0 + 3.5} stroke={MX.fine} strokeWidth={0.8} />
          <line x1={tx} y1={y1 - 3.5} x2={tx} y2={y1} stroke={MX.fine} strokeWidth={0.8} />
        </g>
      ))}
    </g>
  );
}

function parseViewBox(vb: string): [number, number, number, number] {
  const parts = vb.trim().split(/[\s,]+/).map(Number);
  return parts.length === 4 && parts.every(Number.isFinite) ? [parts[0], parts[1], parts[2], parts[3]] : [0, 0, 720, 310];
}

/**
 * A machine drawing: an `<svg>` with the kit's gradients wired in.
 * Automatically fits its viewBox tightly around the rendered geometry (`autoFit`)
 * so there is never wasted empty margin on any screen size.
 */
/**
 * Measures the tight bounding box of an SVG group `<g>`, ignoring excessive
 * horizontal overhang from `<GroundLine>` (`[data-ground-line]`) while preserving
 * full vertical extent and safe stroke/pad/label breathing room so nothing is ever cropped.
 */
export function measureTightSvgBox(g: SVGGElement): [number, number, number, number] | null {
  try {
    const fullBox = g.getBBox();
    if (!(fullBox.width > 10 && fullBox.height > 10)) return null;

    const grounds = Array.from(g.querySelectorAll<SVGElement>("[data-ground-line]"));
    const prevDisplay = grounds.map((el) => el.getAttribute("display"));
    let equipBox = fullBox;
    if (grounds.length > 0) {
      try {
        grounds.forEach((el) => el.setAttribute("display", "none"));
        const eb = g.getBBox();
        if (eb.width > 16 && eb.height > 16) equipBox = eb;
      } finally {
        grounds.forEach((el, i) => {
          const prev = prevDisplay[i];
          if (prev === null) el.removeAttribute("display");
          else el.setAttribute("display", prev);
        });
      }
    }

    // Clamp horizontal ground-line overhang to at most 2 units past actual equipment/labels.
    const x0 = Math.max(fullBox.x, equipBox.x - 2);
    const x1 = Math.min(fullBox.x + fullBox.width, equipBox.x + equipBox.width + 2);
    const y0 = Math.min(fullBox.y, equipBox.y);
    const y1 = Math.max(fullBox.y + fullBox.height, equipBox.y + equipBox.height);

    const rawW = Math.max(20, x1 - x0);
    const rawH = Math.max(20, y1 - y0);
    const padX = Math.max(4, rawW * 0.004);
    const padY = Math.max(4, rawH * 0.008);

    return [
      +(x0 - padX).toFixed(1),
      +(y0 - padY).toFixed(1),
      +(rawW + padX * 2).toFixed(1),
      +(rawH + padY * 2).toFixed(1),
    ];
  } catch {
    return null;
  }
}

export function MachineSvg({
  viewBox,
  label,
  interactive = false,
  autoFit = true,
  cadFrame = true,
  className,
  style,
  children,
  preserveAspectRatio = "xMidYMid meet",
}: {
  viewBox: string;
  label: string;
  interactive?: boolean;
  autoFit?: boolean;
  cadFrame?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  preserveAspectRatio?: string;
}) {
  const id = useKitId();
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const [tightBox, setTightBox] = useState<[number, number, number, number] | null>(null);

  useLayoutEffect(() => {
    if (!autoFit) {
      setTightBox(null);
      return;
    }
    const svgEl = svgRef.current;
    const g = groupRef.current;
    if (!svgEl || !g) return;

    const updateBox = () => {
      const next = measureTightSvgBox(g);
      if (!next) return;
      setTightBox((prev) =>
        prev &&
        Math.abs(prev[0] - next[0]) < 0.5 &&
        Math.abs(prev[1] - next[1]) < 0.5 &&
        Math.abs(prev[2] - next[2]) < 0.5 &&
        Math.abs(prev[3] - next[3]) < 0.5
          ? prev
          : next
      );
    };

    updateBox();
    const ro = new ResizeObserver(updateBox);
    ro.observe(svgEl);
    return () => ro.disconnect();
  }, [autoFit, viewBox, label]);

  const activeBox = tightBox ?? parseViewBox(viewBox);
  const vbString = `${activeBox[0]} ${activeBox[1]} ${activeBox[2]} ${activeBox[3]}`;

  return (
    <svg
      ref={svgRef}
      viewBox={vbString}
      role={interactive ? "group" : "img"}
      aria-label={label}
      className={`mx-svg ${className ?? ""}`.trim()}
      preserveAspectRatio={preserveAspectRatio}
      style={{ fontFamily: MX.font, userSelect: "none", ...kitStyle(id), ...style }}
    >
      <MachineDefs id={id} />
      {cadFrame && <CadEngineeringFrame x={activeBox[0]} y={activeBox[1]} w={activeBox[2]} h={activeBox[3]} />}
      <g ref={groupRef}>{children}</g>
    </svg>
  );
}

/**
 * Blender-style 2D Orthographic Viewport wrapper:
 * Provides interactive zoom (+ / − / Fit), drag-to-pan,
 * and orthographic projection badge on top of `.mx-canvas`.
 */
export function BlenderViewport({
  scopeLabel,
  children,
  className,
  isFullscreen = false,
  onToggleFullscreen,
  hudStart,
}: {
  scopeLabel?: string;
  /** Replaces the scope badge at the start of the top bar (e.g. sheet tabs), beside the zoom controls. */
  hudStart?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const clampZoom = (z: number) => Math.max(0.75, Math.min(2.5, +z.toFixed(2)));
  const zoomIn = useCallback(() => setZoom((z) => clampZoom(z + 0.2)), []);
  const zoomOut = useCallback(() => setZoom((z) => clampZoom(z - 0.2)), []);
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1 && e.button !== 1) return;
    if ((e.target as HTMLElement).closest("button, [role='button']")) return;
    setPanning(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panning || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
  };

  const onPointerUp = () => {
    setPanning(false);
    dragStart.current = null;
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((z) => {
      const next = clampZoom(z + delta);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  return (
    <div
      className={`mx-vp ${className ?? ""}`.trim()}
      data-zoomed={zoom > 1 || undefined}
      data-panning={panning || undefined}
      data-fullscreen={isFullscreen || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={resetView}
    >
      <div className="mx-vp-hud-top">
        {hudStart ? (
          <div className="mx-vp-hud-start">{hudStart}</div>
        ) : (
          <span className="mx-vp-badge">
            <i aria-hidden="true" />
            <span>{scopeLabel ? `2D ORTHO · ${scopeLabel}` : "2D ORTHO · CAD SCHEMATIC"}</span>
          </span>
        )}
        <div className="mx-vp-controls" role="toolbar" aria-label="Viewport zoom controls">
          <button type="button" className="mx-vp-btn" onClick={zoomOut} aria-label="Zoom out" title="Zoom out">
            −
          </button>
          <button type="button" className="mx-vp-btn" onClick={resetView} aria-label="Reset zoom" title="Reset zoom (100%)">
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className="mx-vp-btn" onClick={zoomIn} aria-label="Zoom in" title="Zoom in">
            +
          </button>
          {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
            <button type="button" className="mx-vp-btn" onClick={resetView} aria-label="Fit view" title="Frame all">
              Fit
            </button>
          )}
          {onToggleFullscreen && (
            <button
              type="button"
              className="mx-vp-btn mx-vp-btn-fs"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
              title={isFullscreen ? "Exit full screen (Esc)" : "Full screen"}
            >
              {isFullscreen ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" />
                  </svg>
                  <span>Exit full screen</span>
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
                  </svg>
                  <span>Full screen</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div
        className="mx-vp-stage"
        style={{
          transform: zoom !== 1 || pan.x !== 0 || pan.y !== 0 ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` : undefined,
          transformOrigin: "center center",
          transition: panning ? "none" : "transform 0.14s cubic-bezier(0.23, 1, 0.32, 1)",
          width: "100%",
        }}
      >
        {children}
      </div>

    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export function Bolt({ x, y, r = 2.4 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill={MX.deep} stroke={MX.fine} strokeWidth={MX.wFine} />;
}

/** Four corner bolts inset `inset` from a rectangle's corners. */
export function CornerBolts({ x, y, w, h, inset = 8, r = 2.4 }: { x: number; y: number; w: number; h: number; inset?: number; r?: number }) {
  return (
    <g aria-hidden="true">
      <Bolt x={x + inset} y={y + inset} r={r} />
      <Bolt x={x + w - inset} y={y + inset} r={r} />
      <Bolt x={x + inset} y={y + h - inset} r={r} />
      <Bolt x={x + w - inset} y={y + h - inset} r={r} />
    </g>
  );
}

/** Equipment housing: gradient body, rounded, optional bolts and inset panel. */
export function Housing({
  x,
  y,
  w,
  h,
  rx = 10,
  bolts = true,
  panel,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number;
  bolts?: boolean;
  /** Recessed window as [x, y, w, h] relative to the housing. */
  panel?: [number, number, number, number];
}) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={rx} {...PAINT.body} />
      <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={Math.max(2, rx - 5)} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {panel && <rect x={x + panel[0]} y={y + panel[1]} width={panel[2]} height={panel[3]} rx={3} {...PAINT.recess} />}
      {bolts && <CornerBolts x={x} y={y} w={w} h={h} inset={Math.min(12, rx + 2)} />}
    </g>
  );
}

/** Mounting feet under a machine and the plinth they stand on. */
export function Feet({ x, y, w, plinth = true }: { x: number; y: number; w: number; plinth?: boolean }) {
  const fw = Math.min(46, w * 0.22);
  return (
    <g aria-hidden="true">
      {plinth && <rect x={x - 8} y={y} width={w + 16} height={10} rx={2} {...PAINT.body} />}
      <rect x={x + w * 0.1} y={y + (plinth ? 10 : 0)} width={fw} height={18} rx={2} {...PAINT.body} />
      <rect x={x + w * 0.9 - fw} y={y + (plinth ? 10 : 0)} width={fw} height={18} rx={2} {...PAINT.body} />
      <Bolt x={x + w * 0.1 + fw / 2} y={y + (plinth ? 19 : 9)} r={1.8} />
      <Bolt x={x + w * 0.9 - fw / 2} y={y + (plinth ? 19 : 9)} r={1.8} />
    </g>
  );
}

/** TSE-style induction motor seen from the side, shaft to the right. */
export function Motor({ x, y, w, h, terminalBox = true, label }: { x: number; y: number; w: number; h: number; terminalBox?: boolean; label?: string }) {
  const finCount = Math.max(4, Math.round(h / 12));
  return (
    <g aria-hidden="true">
      {/* fan cowl */}
      <rect x={x - w * 0.12} y={y + h * 0.1} width={w * 0.14} height={h * 0.8} rx={5} {...PAINT.body} />
      {/* frame */}
      <rect x={x} y={y} width={w} height={h} rx={Math.min(16, h * 0.16)} {...PAINT.body} />
      {Array.from({ length: finCount }).map((_, i) => {
        const fy = y + ((i + 1) * h) / (finCount + 1);
        return <line key={i} x1={x + w * 0.1} x2={x + w * 0.9} y1={fy} y2={fy} stroke={MX.fine} strokeWidth={MX.wFine} />;
      })}
      <rect x={x + w * 0.34} y={y + h * 0.38} width={w * 0.32} height={h * 0.24} rx={2} {...PAINT.recess} />
      {terminalBox && <rect x={x + w * 0.32} y={y - h * 0.24} width={w * 0.36} height={h * 0.24} rx={4} {...PAINT.body} />}
      {/* shaft stub */}
      <rect x={x + w} y={y + h * 0.44} width={w * 0.14} height={h * 0.12} {...PAINT.shaft} />
      {label && (
        <text x={x + w / 2} y={y + h + 14} fill={MX.label} fontSize={8} fontWeight={600} letterSpacing="0.12em" textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  );
}

/** Flexible coupling between two shafts. */
export function Coupling({ x, y, w = 22, h = 34 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={4} {...PAINT.body} />
      <rect x={x + w * 0.2} y={y + 4} width={w * 0.22} height={h - 8} rx={1.5} {...PAINT.recess} />
      <rect x={x + w * 0.58} y={y + 4} width={w * 0.22} height={h - 8} rx={1.5} {...PAINT.recess} />
    </g>
  );
}

/** Brushed-metal shaft. */
export function Shaft({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={Math.min(3, h / 2)} {...PAINT.shaft} aria-hidden="true" />;
}

/** Gear wheel with teeth, web and hub. */
export function GearWheel({ cx, cy, r, teeth, hub }: { cx: number; cy: number; r: number; teeth: number; hub?: number }) {
  const tooth = Math.max(2.5, r * 0.11);
  return (
    <g aria-hidden="true">
      {Array.from({ length: teeth }).map((_, i) => {
        const a = (i / teeth) * Math.PI * 2;
        const w = ((Math.PI * 2 * r) / teeth) * 0.5;
        return (
          <rect
            key={i}
            x={cx - w / 2}
            y={cy - r - tooth}
            width={w}
            height={tooth + 1}
            rx={0.8}
            fill={MX.raised}
            stroke={MX.edge}
            strokeWidth={0.8}
            transform={`rotate(${(a * 180) / Math.PI} ${cx} ${cy})`}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r} {...PAINT.raised} />
      <circle cx={cx} cy={cy} r={r * 0.72} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <circle cx={cx} cy={cy} r={hub ?? Math.max(4, r * 0.28)} {...PAINT.shaft} />
      <circle cx={cx} cy={cy} r={Math.max(1.6, (hub ?? r * 0.28) * 0.35)} fill={MX.deep} />
    </g>
  );
}

/** Small axial fan (seal cooling, motor cowl). */
export function Fan({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} {...PAINT.body} />
      <circle cx={cx} cy={cy} r={r * 0.78} {...PAINT.recess} />
      {[0, 90, 180, 270].map((a) => (
        <path
          key={a}
          d={`M ${cx} ${cy} q ${r * 0.18} ${-r * 0.55} ${r * 0.62} ${-r * 0.22}`}
          fill={MX.raised}
          stroke={MX.edge}
          strokeWidth={0.8}
          transform={`rotate(${a} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.16} {...PAINT.shaft} />
    </g>
  );
}

/** Engineering ground: datum line with light hatching. */
export function GroundLine({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const hatches: React.ReactNode[] = [];
  for (let x = x1 + 6; x <= x2; x += 14) hatches.push(<line key={x} x1={x} y1={y} x2={x - 7} y2={y + 7} {...PAINT.hair} />);
  return (
    <g aria-hidden="true" data-ground-line="true">
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={MX.fine} strokeWidth={MX.w} />
      {hatches}
    </g>
  );
}

/** Upper-case technical label, TSE style. */
export function MachineLabel({
  x,
  y,
  children,
  anchor = "middle",
  size = 8.5,
  tone = "muted",
  rotate,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  anchor?: "start" | "middle" | "end";
  size?: number;
  tone?: "muted" | "ink";
  rotate?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={tone === "ink" ? "var(--dx-ink-2)" : MX.label}
      fontSize={size}
      fontWeight={600}
      letterSpacing="0.1em"
      textAnchor={anchor}
      transform={rotate !== undefined ? `rotate(${rotate}, ${x}, ${y})` : undefined}
    >
      {children}
    </text>
  );
}

/**
 * TSE measurement pad. Three marks, not three shades:
 * hollow ring = healthy reading, filled = attention, halo = selected / live focus.
 * Stroke widths are in drawing units so the pad scales with the machine.
 * `priority="optional"` marks a retained-optional point (D4 Table 4.4): a
 * thinner, lighter ring in the same status colour; attention still fills it.
 */
export function MachinePad({
  x,
  y,
  status = "Normal",
  selected = false,
  scale = 1,
  priority = "required",
  className,
}: {
  x: number;
  y: number;
  status?: string;
  selected?: boolean;
  scale?: number;
  /** "optional": thinner, lighter healthy ring (D4 retained-optional point). */
  priority?: "required" | "optional";
  className?: string;
}) {
  const color = statusColor(status);
  const attention = status !== "Normal" && status !== "Clear" && status !== "OK";
  const optional = priority === "optional" && !attention;
  return (
    <g className={className} aria-hidden="true">
      {(selected || attention) && <circle cx={x} cy={y} r={12 * scale} fill={color} opacity={0.16} className={attention ? "mx-pad-halo" : undefined} />}
      <circle cx={x} cy={y} r={8.5 * scale} fill={color} opacity={attention ? 0.22 : optional ? 0.04 : 0.1} />
      <circle
        cx={x}
        cy={y}
        r={5 * scale}
        fill={attention ? color : MX.padPanel}
        stroke={attention ? MX.padPanel : color}
        strokeWidth={(attention ? 1.4 : optional ? 0.9 : 1.7) * scale}
        strokeOpacity={optional ? 0.7 : undefined}
      />
      {attention && <circle cx={x} cy={y} r={2 * scale} fill="var(--mx-pad-dot)" opacity={0.9} />}
      {selected && <circle cx={x} cy={y} r={11 * scale} fill="none" stroke="var(--dx-ink)" strokeWidth={1.2 * scale} />}
    </g>
  );
}
