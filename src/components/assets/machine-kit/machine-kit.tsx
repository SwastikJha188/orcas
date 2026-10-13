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

import React, { useId } from "react";

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

export type PadStatus = "Normal" | "Advisory" | "Critical";

export function statusColor(status: string | undefined): string {
  if (status === "Critical" || status === "Active" || status === "Alarm" || status === "Trip") return MX.bad;
  if (status === "Advisory" || status === "Alert" || status === "Warning") return MX.warn;
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
 * A machine drawing: an `<svg>` with the kit's gradients wired in.
 * The drawing has no background or grid — the container owns those.
 */
export function MachineSvg({
  viewBox,
  label,
  interactive = false,
  className,
  style,
  children,
  preserveAspectRatio = "xMidYMid meet",
}: {
  viewBox: string;
  label: string;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  preserveAspectRatio?: string;
}) {
  const id = useKitId();
  return (
    <svg
      viewBox={viewBox}
      role={interactive ? "group" : "img"}
      aria-label={label}
      className={className}
      preserveAspectRatio={preserveAspectRatio}
      style={{ display: "block", width: "100%", height: "auto", fontFamily: MX.font, userSelect: "none", ...kitStyle(id), ...style }}
    >
      <MachineDefs id={id} />
      {children}
    </svg>
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
    <g aria-hidden="true">
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
 */
export function MachinePad({
  x,
  y,
  status = "Normal",
  selected = false,
  scale = 1,
  className,
}: {
  x: number;
  y: number;
  status?: string;
  selected?: boolean;
  scale?: number;
  className?: string;
}) {
  const color = statusColor(status);
  const attention = status !== "Normal" && status !== "Clear" && status !== "OK";
  return (
    <g className={className} aria-hidden="true">
      {(selected || attention) && <circle cx={x} cy={y} r={12 * scale} fill={color} opacity={0.16} className={attention ? "mx-pad-halo" : undefined} />}
      <circle cx={x} cy={y} r={8.5 * scale} fill={color} opacity={attention ? 0.22 : 0.1} />
      <circle cx={x} cy={y} r={5 * scale} fill={attention ? color : MX.padPanel} stroke={attention ? MX.padPanel : color} strokeWidth={(attention ? 1.4 : 1.7) * scale} />
      {attention && <circle cx={x} cy={y} r={2 * scale} fill="var(--mx-pad-dot)" opacity={0.9} />}
      {selected && <circle cx={x} cy={y} r={11 * scale} fill="none" stroke="var(--dx-ink)" strokeWidth={1.2 * scale} />}
    </g>
  );
}
