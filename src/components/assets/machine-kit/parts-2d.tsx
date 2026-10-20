/**
 * Generic machine-kit parts for any plant or machine drawing (the 2D diagram
 * skill, .claude/skills/machine-diagram-2d). Every part is placed by its box —
 * `x, y` top-left, `w, h` size, in sheet units — so a drawing is built by
 * reading each item's box off the source image and dropping the matching part
 * there. Lines, pipes and flows take point lists. Kit paints only (MX / PAINT),
 * so every part follows the light and dark themes; detail (bolts, seams, ribs,
 * flanges) scales from each part's own size.
 */
import React from "react";
import { Bolt, CornerBolts, Coupling, GearWheel, MX, Motor, PAINT } from "./machine-kit";
import { CentrifugalFan } from "@/components/assets/pyro/line-sheets/art/parts-c";

export type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const n = (v: number) => Math.round(v * 100) / 100;

/* ------------------------------------------------------------------ */
/* Small detail                                                        */
/* ------------------------------------------------------------------ */

/** Evenly spaced bolts between two points. */
export function BoltLine({ x1, y1, x2, y2, count, r = 1.3 }: { x1: number; y1: number; x2: number; y2: number; count: number; r?: number }) {
  return (
    <g aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => {
        const t = count === 1 ? 0.5 : i / (count - 1);
        return <Bolt key={i} x={x1 + (x2 - x1) * t} y={y1 + (y2 - y1) * t} r={r} />;
      })}
    </g>
  );
}

/** Flange plate across a pipe or shell end: `vertical` = flange stands upright (pipe runs horizontally). */
export function Flange({ x, y, d, vertical = true }: { x: number; y: number; d: number; vertical?: boolean }) {
  const t = clamp(d * 0.22, 3, 7);
  const L = d + clamp(d * 0.35, 4, 14);
  return vertical ? (
    <g aria-hidden="true">
      <rect x={x - t / 2} y={y - L / 2} width={t} height={L} rx={1.2} {...PAINT.raised} />
      {d > 14 && <BoltLine x1={x} y1={y - L / 2 + 2.5} x2={x} y2={y + L / 2 - 2.5} count={2} r={1} />}
    </g>
  ) : (
    <g aria-hidden="true">
      <rect x={x - L / 2} y={y - t / 2} width={L} height={t} rx={1.2} {...PAINT.raised} />
      {d > 14 && <BoltLine x1={x - L / 2 + 2.5} y1={y} x2={x + L / 2 - 2.5} y2={y} count={2} r={1} />}
    </g>
  );
}

/** Inset hairline panel with corner bolts (access door, cover plate). */
export function Panel({ x, y, w, h, bolts = true }: Box & { bolts?: boolean }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={Math.min(4, w * 0.08)} {...PAINT.raised} />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={Math.min(3, w * 0.06)} {...PAINT.hair} />
      {bolts && w > 18 && h > 18 && <CornerBolts x={x} y={y} w={w} h={h} inset={4.5} r={1.2} />}
    </g>
  );
}

/** Louvre slats (ventilation grille) inside a box. */
export function Louvres({ x, y, w, h, step = 5 }: Box & { step?: number }) {
  const rows = Math.max(2, Math.floor(h / step));
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={2} {...PAINT.recess} />
      {Array.from({ length: rows - 1 }).map((_, i) => (
        <line key={i} x1={x + 3} x2={x + w - 3} y1={y + ((i + 1) * h) / rows} y2={y + ((i + 1) * h) / rows} stroke={MX.edge} strokeWidth={0.9} />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Foundations and structure                                           */
/* ------------------------------------------------------------------ */

/** Concrete plinth / foundation block (`h` ≈ 10–40). */
export function Plinth({ x, y, w, h }: Box) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={2} {...PAINT.body} />
      {h > 16 && <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={1.5} {...PAINT.hair} />}
      <BoltLine x1={x + 8} y1={y + Math.min(5, h / 2)} x2={x + w - 8} y2={y + Math.min(5, h / 2)} count={Math.max(2, Math.round(w / 60) + 1)} r={1.3} />
    </g>
  );
}

/** Steel base frame (skid) under a machine train, with anchor bolts and a grout line. */
export function Baseplate({ x, y, w, h = 10 }: Box) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={2} {...PAINT.raised} />
      <line x1={x + 3} x2={x + w - 3} y1={y + h * 0.55} y2={y + h * 0.55} {...PAINT.hair} />
      <BoltLine x1={x + 6} y1={y + h / 2} x2={x + w - 6} y2={y + h / 2} count={Math.max(2, Math.round(w / 45) + 1)} r={Math.min(1.6, h * 0.16)} />
    </g>
  );
}

/** Steel column from y1 down to the ground at y2, with base plate and bolts. */
export function Column({ x, y1, y2, w = 8 }: { x: number; y1: number; y2: number; w?: number }) {
  const bp = w * 1.5;
  return (
    <g aria-hidden="true">
      <rect x={x - w / 2} y={y1} width={w} height={y2 - y1} rx={1.2} {...PAINT.body} />
      <line x1={x} x2={x} y1={y1 + 3} y2={y2 - 6} {...PAINT.hair} />
      <rect x={x - bp} y={y2 - 4} width={bp * 2} height={4} rx={1} {...PAINT.raised} />
      <Bolt x={x - bp + 2.5} y={y2 - 2} r={0.9} />
      <Bolt x={x + bp - 2.5} y={y2 - 2} r={0.9} />
    </g>
  );
}

/** Horizontal steel beam (floor / support) from x1 to x2 at top y. */
export function Beam({ x1, x2, y, h = 7 }: { x1: number; x2: number; y: number; h?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x1} y={y} width={x2 - x1} height={h} rx={1} {...PAINT.raised} />
      <line x1={x1 + 2} x2={x2 - 2} y1={y + h / 2} y2={y + h / 2} {...PAINT.hair} />
    </g>
  );
}

/** Walkway with handrail (posts, mid and top rail) from x1 to x2, deck top at y. */
export function Platform({ x1, x2, y, rail = 16 }: { x1: number; x2: number; y: number; rail?: number }) {
  const posts = Math.max(2, Math.round((x2 - x1) / 26) + 1);
  return (
    <g aria-hidden="true">
      {rail > 0 && (
        <g>
          {Array.from({ length: posts }).map((_, i) => {
            const px = x1 + 2 + ((x2 - x1 - 4) * i) / (posts - 1);
            return <line key={i} x1={px} x2={px} y1={y} y2={y - rail} stroke={MX.edge} strokeWidth={1.1} />;
          })}
          <line x1={x1 + 2} x2={x2 - 2} y1={y - rail} y2={y - rail} stroke={MX.edge} strokeWidth={1.3} />
          <line x1={x1 + 2} x2={x2 - 2} y1={y - rail / 2} y2={y - rail / 2} stroke={MX.fine} strokeWidth={1} />
        </g>
      )}
      <rect x={x1} y={y} width={x2 - x1} height={4.5} rx={1} {...PAINT.raised} />
    </g>
  );
}

/** Vertical ladder from y1 (top) to y2. */
export function Ladder({ x, y1, y2, w = 10, cage = true }: { x: number; y1: number; y2: number; w?: number; cage?: boolean }) {
  const rungs = Math.max(2, Math.floor((y2 - y1) / 7));
  return (
    <g aria-hidden="true">
      <line x1={x - w / 2} x2={x - w / 2} y1={y1} y2={y2} stroke={MX.edge} strokeWidth={1.1} />
      <line x1={x + w / 2} x2={x + w / 2} y1={y1} y2={y2} stroke={MX.edge} strokeWidth={1.1} />
      {Array.from({ length: rungs }).map((_, i) => (
        <line key={i} x1={x - w / 2} x2={x + w / 2} y1={y1 + ((i + 0.5) * (y2 - y1)) / rungs} y2={y1 + ((i + 0.5) * (y2 - y1)) / rungs} {...PAINT.hair} />
      ))}
      {cage && y2 - y1 > 60 && <path d={`M ${x - w / 2 - 4} ${y1} V ${y2 - 40} M ${x + w / 2 + 4} ${y1} V ${y2 - 40}`} {...PAINT.hair} />}
    </g>
  );
}

/**
 * Steel structure (tower, support frame, rack): columns at each bay line, a
 * floor beam at each level (fractions of h from the top, 0 = top), X-bracing in
 * every other bay, handrail on the top floor. The box bottom is the ground.
 */
export function Frame({ x, y, w, h, levels = [0, 0.5], bays = 2, brace = true, rail = true }: Box & { levels?: number[]; bays?: number; brace?: boolean; rail?: boolean }) {
  const cols = Array.from({ length: bays + 1 }).map((_, i) => x + (w * i) / bays);
  const ys = [...levels].sort((a, b) => a - b).map((f) => y + f * h);
  const bot = y + h;
  const cw = clamp(w * 0.02, 5, 10);
  const lines: React.ReactNode[] = [];
  const floors = [...ys, bot];
  for (let b = 0; b < bays; b++) {
    for (let l = 0; l < floors.length - 1; l++) {
      if (!brace || (b + l) % 2) continue;
      const [x0, x1] = [cols[b] + cw / 2, cols[b + 1] - cw / 2];
      const [y0, y1] = [floors[l] + 7, floors[l + 1]];
      lines.push(<path key={`${b}-${l}`} d={`M ${x0} ${y0} L ${x1} ${y1} M ${x1} ${y0} L ${x0} ${y1}`} stroke={MX.fine} strokeWidth={1.6} strokeLinecap="round" fill="none" />);
    }
  }
  return (
    <g aria-hidden="true">
      {lines}
      {cols.map((cx, i) => (
        <Column key={i} x={cx} y1={ys[0] ?? y} y2={bot} w={cw} />
      ))}
      {ys.map((fy, i) => (i === 0 && rail ? <Platform key={i} x1={x - cw} x2={x + w + cw} y={fy} /> : <Beam key={i} x1={x - cw / 2} x2={x + w + cw / 2} y={fy} />))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Vessels                                                             */
/* ------------------------------------------------------------------ */

/**
 * Vertical vessel — tank, silo, bin, reactor, column, receiver. The box holds
 * the whole vessel: roof, shell, bottom and (with `legs`, a height) the legs
 * down to the box bottom. `level` (0–1) cuts a window into the shell showing the
 * contents at that fill; `agitator` puts a drive on the roof and a stirrer inside.
 */
export function Tank({
  x,
  y,
  w,
  h,
  top = "dome",
  bottom = "flat",
  level,
  legs = 0,
  agitator = false,
  rail = false,
}: Box & {
  top?: "dome" | "cone" | "flat";
  bottom?: "flat" | "cone" | "dish";
  level?: number;
  legs?: number;
  agitator?: boolean;
  rail?: boolean;
}) {
  const cx = x + w / 2;
  const roofH = top === "dome" ? w * 0.14 : top === "cone" ? w * 0.2 : 0;
  const yBody = y + h - legs;
  const botH = bottom === "cone" ? Math.min(w * 0.55, (yBody - y) * 0.4) : bottom === "dish" ? w * 0.12 : 0;
  const s0 = y + roofH + (agitator ? Math.min(40, h * 0.12) : 0) + (rail ? 14 : 0);
  const s1 = yBody - botH;
  const outW = Math.max(14, w * 0.18);
  const courses = Math.max(2, Math.round((s1 - s0) / Math.max(30, w * 0.35)));
  const seams = Array.from({ length: courses - 1 }).map((_, i) => s0 + ((s1 - s0) * (i + 1)) / courses);
  const win = level !== undefined ? { x: x + w * 0.2, y: s0 + (s1 - s0) * 0.12, w: w * 0.6, h: (s1 - s0) * 0.76 } : null;
  const lv = win && level !== undefined ? win.y + win.h * (1 - clamp(level, 0, 1)) : 0;
  return (
    <g aria-hidden="true">
      {/* legs with bracing */}
      {legs > 0 && (
        <g>
          <path d={`M ${x + w * 0.12} ${s1 + 4} L ${x + w * 0.88} ${y + h - 6} M ${x + w * 0.88} ${s1 + 4} L ${x + w * 0.12} ${y + h - 6}`} stroke={MX.fine} strokeWidth={1.4} fill="none" />
          <Column x={x + w * 0.08} y1={s1 - 4} y2={y + h} w={clamp(w * 0.05, 5, 10)} />
          <Column x={x + w * 0.92} y1={s1 - 4} y2={y + h} w={clamp(w * 0.05, 5, 10)} />
        </g>
      )}
      {/* bottom */}
      {bottom === "cone" && (
        <g>
          <path d={`M ${x + 2} ${s1} L ${x + w - 2} ${s1} L ${cx + outW / 2} ${yBody - 6} L ${cx - outW / 2} ${yBody - 6} Z`} {...PAINT.cylinderV} />
          <line x1={x + w * 0.3} y1={s1 + 3} x2={cx - outW * 0.2} y2={yBody - 9} {...PAINT.hair} />
          <line x1={x + w * 0.7} y1={s1 + 3} x2={cx + outW * 0.2} y2={yBody - 9} {...PAINT.hair} />
          <rect x={cx - outW / 2 - 3} y={yBody - 7} width={outW + 6} height={7} rx={1.5} {...PAINT.raised} />
        </g>
      )}
      {bottom === "dish" && <path d={`M ${x} ${s1 - 1} Q ${cx} ${s1 + botH * 2} ${x + w} ${s1 - 1} Z`} {...PAINT.cylinderV} />}
      {/* shell */}
      <rect x={x} y={s0} width={w} height={s1 - s0} rx={2} {...PAINT.cylinderV} />
      {seams.map((sy, i) => (
        <g key={sy}>
          <line x1={x + 1.5} x2={x + w - 1.5} y1={sy} y2={sy} stroke={MX.fine} strokeWidth={1} />
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={x + w * (f + (i % 2 ? 0.125 : 0))} x2={x + w * (f + (i % 2 ? 0.125 : 0))} y1={sy - (s1 - s0) / courses + 2} y2={sy - 2} {...PAINT.hair} />
          ))}
        </g>
      ))}
      {bottom !== "flat" && <rect x={x - 5} y={s1 - 4} width={w + 10} height={8} rx={2} {...PAINT.raised} />}
      {bottom !== "flat" && <BoltLine x1={x} y1={s1} x2={x + w} y2={s1} count={Math.max(4, Math.round(w / 14))} r={1} />}
      {bottom === "flat" && <rect x={x - 4} y={s1 - 3} width={w + 8} height={6} rx={1.5} {...PAINT.raised} />}
      {/* contents window */}
      {win && (
        <g>
          <rect x={win.x} y={win.y} width={win.w} height={win.h} rx={5} {...PAINT.recess} />
          <path d={`M ${win.x + 3} ${lv + 2} Q ${win.x + win.w / 2} ${lv - win.h * 0.04} ${win.x + win.w - 3} ${lv + 3} V ${win.y + win.h - 3} H ${win.x + 3} Z`} {...PAINT.material} />
          <rect x={win.x - 2.5} y={win.y - 2.5} width={win.w + 5} height={win.h + 5} rx={6} fill="none" stroke={MX.edge} strokeWidth={1} />
        </g>
      )}
      {/* stirrer */}
      {agitator && (
        <g>
          <line x1={cx} x2={cx} y1={s0 - 6} y2={s1 - (s1 - s0) * 0.12} stroke={MX.metal} strokeWidth={clamp(w * 0.025, 2, 5)} />
          {[0.55, 0.85].map((f) => (
            <rect key={f} x={cx - w * 0.2} y={s0 + (s1 - s0) * f - 3} width={w * 0.4} height={6} rx={2} {...PAINT.shaft} />
          ))}
        </g>
      )}
      {/* roof */}
      {top === "dome" && <path d={`M ${x} ${s0 + 1} Q ${cx} ${s0 - roofH * 2} ${x + w} ${s0 + 1} Z`} {...PAINT.cylinderV} />}
      {top === "cone" && <path d={`M ${x - 3} ${s0 + 1} L ${cx - w * 0.12} ${s0 - roofH} H ${cx + w * 0.12} L ${x + w + 3} ${s0 + 1} Z`} {...PAINT.body} />}
      {top === "flat" && <rect x={x - 4} y={s0 - 5} width={w + 8} height={6} rx={1.5} {...PAINT.raised} />}
      {rail && <Platform x1={x - 6} x2={x + w + 6} y={s0 - roofH * (top === "dome" ? 0.6 : 0.9)} rail={13} />}
      {/* roof nozzle / manhole */}
      {!agitator && <rect x={cx + w * 0.18} y={s0 - roofH * 0.7 - 8} width={clamp(w * 0.12, 8, 26)} height={8} rx={1.5} {...PAINT.raised} />}
      {agitator && (
        <g>
          <rect x={cx - w * 0.14} y={s0 - roofH * 0.6 - 8} width={w * 0.28} height={10} rx={2} {...PAINT.raised} />
          <Motor x={cx - w * 0.09} y={y} w={w * 0.18} h={s0 - roofH * 0.6 - 10 - y} terminalBox={false} />
        </g>
      )}
    </g>
  );
}

/** Horizontal vessel — drum, receiver, boiler, horizontal tank — on two saddles; the box bottom is the saddle base. */
export function HorizontalVessel({ x, y, w, h, level, saddles = true }: Box & { level?: number; saddles?: boolean }) {
  const sh = saddles ? h * 0.2 : 0;
  const bh = h - sh;
  const r = bh / 2;
  const cy = y + r;
  return (
    <g aria-hidden="true">
      {saddles &&
        [0.22, 0.78].map((f) => (
          <g key={f}>
            <path d={`M ${x + w * f - r * 0.6} ${y + h} L ${x + w * f - r * 0.45} ${cy + r * 0.55} H ${x + w * f + r * 0.45} L ${x + w * f + r * 0.6} ${y + h} Z`} {...PAINT.body} />
            <Bolt x={x + w * f - r * 0.45} y={y + h - 3} r={1.1} />
            <Bolt x={x + w * f + r * 0.45} y={y + h - 3} r={1.1} />
          </g>
        ))}
      <rect x={x} y={y} width={w} height={bh} rx={r} {...PAINT.cylinder} />
      {[0.33, 0.66].map((f) => (
        <line key={f} x1={x + w * f} x2={x + w * f} y1={y + 2} y2={y + bh - 2} {...PAINT.hair} />
      ))}
      <line x1={x + r * 0.7} x2={x + r * 0.7} y1={y + 3} y2={y + bh - 3} stroke={MX.fine} strokeWidth={1} />
      <line x1={x + w - r * 0.7} x2={x + w - r * 0.7} y1={y + 3} y2={y + bh - 3} stroke={MX.fine} strokeWidth={1} />
      {level !== undefined && (
        <g>
          <rect x={x + w * 0.38} y={y + bh * 0.2} width={w * 0.24} height={bh * 0.6} rx={4} {...PAINT.recess} />
          <rect x={x + w * 0.38 + 2} y={y + bh * 0.2 + bh * 0.6 * (1 - clamp(level, 0, 1))} width={w * 0.24 - 4} height={bh * 0.6 * clamp(level, 0, 1) - 2} rx={3} {...PAINT.material} />
        </g>
      )}
      <rect x={x + w * 0.45} y={y - 8} width={w * 0.1} height={9} rx={1.5} {...PAINT.raised} />
    </g>
  );
}

/** Hopper / chute: wide inlet at the top, outlet at the bottom, bolted top flange. */
export function Hopper({ x, y, w, h, outlet }: Box & { outlet?: number }) {
  const cx = x + w / 2;
  const o = outlet ?? Math.max(12, w * 0.24);
  return (
    <g aria-hidden="true">
      <path d={`M ${x} ${y + 6} H ${x + w} L ${cx + o / 2} ${y + h - 8} H ${cx - o / 2} Z`} {...PAINT.cylinderV} />
      <line x1={x + w * 0.25} y1={y + 9} x2={cx - o * 0.25} y2={y + h - 10} {...PAINT.hair} />
      <line x1={x + w * 0.75} y1={y + 9} x2={cx + o * 0.25} y2={y + h - 10} {...PAINT.hair} />
      <rect x={x - 4} y={y} width={w + 8} height={7} rx={1.5} {...PAINT.raised} />
      <BoltLine x1={x + 2} y1={y + 3.5} x2={x + w - 2} y2={y + 3.5} count={Math.max(3, Math.round(w / 16))} r={1} />
      <rect x={cx - o / 2 - 3} y={y + h - 9} width={o + 6} height={9} rx={1.5} {...PAINT.raised} />
    </g>
  );
}

/**
 * Cyclone separator: outlet (vortex finder) at the top, cylinder, cone, dip
 * pipe to the bottom of the box; tangential inlet duct on `inlet` side.
 */
export function Cyclone({ x, y, w, h, inlet = "left" }: Box & { inlet?: "left" | "right" }) {
  const cx = x + w / 2;
  const outW = w * 0.42;
  const cyl0 = y + h * 0.08;
  const cyl1 = y + h * 0.42;
  const cone1 = y + h * 0.88;
  const dip = w * 0.16;
  const s = inlet === "left" ? -1 : 1;
  const inH = (cyl1 - cyl0) * 0.55;
  return (
    <g aria-hidden="true">
      {/* dip pipe */}
      <rect x={cx - dip / 2} y={cone1 - 2} width={dip} height={y + h - cone1 + 2} {...PAINT.cylinderV} />
      <Flange x={cx} y={cone1 + 3} d={dip} vertical={false} />
      {/* cone */}
      <path d={`M ${x + 1} ${cyl1} H ${x + w - 1} L ${cx + dip / 2 + 2} ${cone1} H ${cx - dip / 2 - 2} Z`} {...PAINT.cylinderV} />
      <line x1={x + w * 0.3} y1={cyl1 + 3} x2={cx - dip * 0.3} y2={cone1 - 3} {...PAINT.hair} />
      <line x1={x + w * 0.7} y1={cyl1 + 3} x2={cx + dip * 0.3} y2={cone1 - 3} {...PAINT.hair} />
      {/* inlet duct */}
      <rect x={s < 0 ? x - w * 0.32 : x + w - 2} y={cyl0 + 4} width={w * 0.34} height={inH} rx={2} {...PAINT.body} />
      <rect x={s < 0 ? x - w * 0.32 : x + w * 1.32 - 6} y={cyl0 + 2} width={6} height={inH + 4} rx={1} {...PAINT.raised} />
      {/* cylinder with seam and flange to the cone */}
      <rect x={x} y={cyl0} width={w} height={cyl1 - cyl0} rx={2} {...PAINT.cylinderV} />
      <line x1={x + 1.5} x2={x + w - 1.5} y1={(cyl0 + cyl1) / 2} y2={(cyl0 + cyl1) / 2} {...PAINT.hair} />
      <rect x={x - 4} y={cyl1 - 3} width={w + 8} height={6} rx={1.5} {...PAINT.raised} />
      {/* vortex finder / gas outlet */}
      <rect x={cx - outW / 2} y={y} width={outW} height={cyl0 - y + 2} {...PAINT.cylinderV} />
      <rect x={cx - outW / 2 - 4} y={cyl0 - 3} width={outW + 8} height={6} rx={1.5} {...PAINT.raised} />
    </g>
  );
}

/** Chimney / stack: concrete or steel shell with stiffener bands, a platform near the top, cap. */
export function Stack({ x, y, w, h }: Box) {
  const bands = Math.max(2, Math.floor(h / 40));
  return (
    <g aria-hidden="true">
      <path d={`M ${x - w * 0.15} ${y + h} L ${x} ${y + h * 0.85} V ${y + 6} H ${x + w} V ${y + h * 0.85} L ${x + w + w * 0.15} ${y + h} Z`} {...PAINT.cylinderV} />
      {Array.from({ length: bands }).map((_, i) => (
        <rect key={i} x={x - 1.5} y={y + 14 + (i * (h * 0.8)) / bands} width={w + 3} height={3} rx={1} {...PAINT.raised} />
      ))}
      <rect x={x - 3} y={y} width={w + 6} height={8} rx={1.5} {...PAINT.raised} />
      <Platform x1={x - w * 0.45} x2={x + w * 1.45} y={y + h * 0.18} rail={12} />
    </g>
  );
}

/** Pressurised gas cylinder with neck ring, valve and regulator. */
export function GasCylinder({ x, y, w, h }: Box) {
  const top = y + h * 0.14;
  return (
    <g aria-hidden="true">
      <rect x={x} y={top} width={w} height={y + h - top} rx={w / 2} {...PAINT.cylinderV} />
      <rect x={x} y={y + h - w * 0.3} width={w} height={w * 0.3} rx={3} {...PAINT.cylinderV} />
      <line x1={x + 3} x2={x + w - 3} y1={top + w * 0.6} y2={top + w * 0.6} {...PAINT.hair} />
      <rect x={x + w * 0.32} y={top - h * 0.05} width={w * 0.36} height={h * 0.06} rx={2} {...PAINT.raised} />
      <rect x={x + w * 0.42} y={y} width={w * 0.16} height={h * 0.1} rx={1.5} {...PAINT.shaft} />
      <circle cx={x + w * 0.5 + w * 0.32} cy={y + h * 0.04} r={w * 0.14} {...PAINT.raised} />
      <circle cx={x + w * 0.5 + w * 0.32} cy={y + h * 0.04} r={w * 0.09} {...PAINT.recess} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Drives                                                              */
/* ------------------------------------------------------------------ */

/**
 * Electric motor (TEFC) side view on its feet: fan cowl, ribbed frame,
 * terminal box, shaft stub. `shaft` = side the shaft comes out. The box holds
 * cowl, frame, shaft and feet.
 */
export function ElectricMotor({ x, y, w, h, shaft = "right" }: Box & { shaft?: "left" | "right" }) {
  const fw = w / 1.26;
  const fx = x + fw * 0.12;
  const tb = h * 0.18;
  const feet = h * 0.16;
  const mh = h - tb - feet;
  const my = y + tb;
  const body = (
    <g>
      <Motor x={fx} y={my} w={fw} h={mh} />
      {[0.14, 0.7].map((f) => (
        <g key={f}>
          <rect x={fx + fw * f} y={my + mh - 2} width={fw * 0.18} height={feet + 2} rx={1.5} {...PAINT.body} />
          <Bolt x={fx + fw * (f + 0.09)} y={y + h - feet * 0.45} r={Math.min(1.6, feet * 0.18)} />
        </g>
      ))}
    </g>
  );
  return <g aria-hidden="true">{shaft === "right" ? body : <g transform={`translate(${n(2 * (x + w / 2))} 0) scale(-1 1)`}>{body}</g>}</g>;
}

/** Gear reducer side view: ribbed housing, input / output shafts, gears seen through an inspection cover, breather, sight glass, feet. */
export function Gearbox({ x, y, w, h, input = "left" }: Box & { input?: "left" | "right" }) {
  const feet = h * 0.12;
  const hy = y;
  const hh = h - feet;
  const s = input === "left" ? 1 : -1;
  const inX = input === "left" ? x : x + w;
  const outX = input === "left" ? x + w : x;
  const r1 = hh * 0.17;
  const r2 = hh * 0.3;
  return (
    <g aria-hidden="true">
      <rect x={s > 0 ? inX - w * 0.12 : inX} y={hy + hh * 0.66 - hh * 0.05} width={w * 0.12} height={hh * 0.1} rx={1.5} {...PAINT.shaft} />
      <rect x={s > 0 ? outX : outX - w * 0.12} y={hy + hh * 0.5 - hh * 0.07} width={w * 0.12} height={hh * 0.14} rx={1.5} {...PAINT.shaft} />
      <rect x={x} y={hy} width={w} height={hh} rx={Math.min(10, w * 0.06)} {...PAINT.body} />
      <line x1={x + 4} x2={x + w - 4} y1={hy + hh * 0.5} y2={hy + hh * 0.5} stroke={MX.edge} strokeWidth={1.1} />
      <BoltLine x1={x + 8} y1={hy + hh * 0.5 - 4} x2={x + w - 8} y2={hy + hh * 0.5 - 4} count={Math.max(3, Math.round(w / 22))} r={1.2} />
      <rect x={x + w * 0.1} y={hy + 5} width={w * 0.8} height={Math.max(5, hh * 0.06)} rx={2} {...PAINT.raised} />
      <GearWheel cx={input === "left" ? x + w * 0.3 : x + w * 0.7} cy={hy + hh * 0.66} r={r1} teeth={12} />
      <GearWheel cx={input === "left" ? x + w * 0.64 : x + w * 0.36} cy={hy + hh * 0.5} r={Math.min(r2, hh * 0.32, w * 0.3)} teeth={22} />
      <rect x={x + w * 0.46} y={hy - 7} width={6} height={8} rx={1} {...PAINT.shaft} />
      <circle cx={x + w * 0.86} cy={hy + hh * 0.82} r={Math.max(2.5, hh * 0.04)} {...PAINT.recess} />
      <rect x={x - 4} y={y + h - feet} width={w + 8} height={feet} rx={1.5} {...PAINT.raised} />
      <BoltLine x1={x + 4} y1={y + h - feet / 2} x2={x + w - 4} y2={y + h - feet / 2} count={3} r={1.3} />
    </g>
  );
}

/** Plummer-block bearing on a sole plate; shaft line at the box's middle height. */
export function Bearing({ x, y, w, h }: Box) {
  const cy = y + h * 0.42;
  return (
    <g aria-hidden="true">
      <rect x={x - 4} y={y + h - 7} width={w + 8} height={7} rx={1.5} {...PAINT.raised} />
      <Bolt x={x} y={y + h - 3.5} r={1.2} />
      <Bolt x={x + w} y={y + h - 3.5} r={1.2} />
      <rect x={x} y={y} width={w} height={h - 7} rx={w * 0.2} {...PAINT.body} />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 13} rx={w * 0.15} {...PAINT.hair} />
      <line x1={x + 1} x2={x + w - 1} y1={cy} y2={cy} stroke={MX.edge} strokeWidth={1.2} />
      <Bolt x={x + 5} y={cy - 4} r={1.2} />
      <Bolt x={x + w - 5} y={cy - 4} r={1.2} />
      <rect x={x + w / 2 - 2.5} y={y - 4} width={5} height={4.5} rx={1} {...PAINT.shaft} />
    </g>
  );
}

/**
 * Centrifugal fan set on its base frame: spiral volute with impeller, bearing,
 * coupling guard and motor. The box holds everything; the outlet rises from the
 * top of the box on `outlet` side, the motor sits on the other side.
 */
export function FanSet({ x, y, w, h, outlet = "left" }: Box & { outlet?: "left" | "right" }) {
  const base = y + h - Math.max(6, h * 0.05);
  const r = Math.min(w * 0.24, (h - 10) * 0.42);
  const mirror = outlet === "right";
  // Drawn with the fan on the left; mirrored for a right-hand fan.
  const cx = x + r + 6;
  const cy = base - r * 1.12;
  const bw = r * 0.4;
  const bx = cx + r * 1.32;
  const mw = Math.max(r * 0.9, x + w - (bx + bw * 0.9) - r * 0.2 - w * 0.12);
  const mx = x + w - mw * 1.14 - 6;
  const art = <CentrifugalFan cx={cx} cy={cy} r={r} top={y} outlet="left" base={base} bx={bx} bw={bw} bh={r * 0.55} mx={mx} mw={mw} mh={r * 0.8} />;
  return <g aria-hidden="true">{mirror ? <g transform={`translate(${n(2 * (x + w / 2))} 0) scale(-1 1)`}>{art}</g> : art}</g>;
}

/** Centrifugal pump set on a baseplate: pump casing with suction eye and discharge nozzle, bearing frame, coupling, motor. */
export function PumpSet({ x, y, w, h, motor = "right" }: Box & { motor?: "left" | "right" }) {
  const base = y + h - Math.max(8, h * 0.1);
  const pr = Math.min(h * 0.3, w * 0.13);
  const pcx = x + pr + 4;
  const pcy = base - pr - Math.max(6, h * 0.08);
  const frameX = pcx + pr * 0.6;
  const frameW = w * 0.2;
  const cw = Math.max(10, w * 0.05);
  const mx = frameX + frameW + cw + 6;
  const mw = x + w - mx;
  const mh = pr * 1.7;
  const art = (
    <g>
      <Baseplate x={x} y={base} w={w} h={y + h - base} />
      {/* pedestal and discharge */}
      <rect x={pcx - pr * 0.6} y={pcy + pr * 0.6} width={pr * 1.2} height={base - pcy - pr * 0.6} rx={2} {...PAINT.body} />
      <rect x={pcx - pr * 0.28} y={y} width={pr * 0.56} height={pcy - y} {...PAINT.cylinderV} />
      <Flange x={pcx} y={y + 3} d={pr * 0.56} vertical={false} />
      {/* bearing frame */}
      <rect x={frameX} y={pcy - pr * 0.42} width={frameW} height={pr * 0.84} rx={4} {...PAINT.body} />
      <rect x={frameX + frameW * 0.3} y={pcy + pr * 0.42} width={frameW * 0.4} height={base - pcy - pr * 0.42} rx={1.5} {...PAINT.body} />
      <line x1={frameX + 4} x2={frameX + frameW - 4} y1={pcy} y2={pcy} {...PAINT.hair} />
      <Coupling x={frameX + frameW + 3} y={pcy - pr * 0.36} w={cw} h={pr * 0.72} />
      {/* casing */}
      <circle cx={pcx} cy={pcy} r={pr} {...PAINT.body} />
      <circle cx={pcx} cy={pcy} r={pr * 0.62} {...PAINT.raised} />
      <circle cx={pcx} cy={pcy} r={pr * 0.4} {...PAINT.recess} />
      {Array.from({ length: 8 }).map((_, i) => {
        const t = (i / 8) * Math.PI * 2;
        return <Bolt key={i} x={pcx + Math.cos(t) * pr * 0.82} y={pcy + Math.sin(t) * pr * 0.82} r={Math.max(0.9, pr * 0.04)} />;
      })}
      <ElectricMotor x={mx} y={pcy - mh * 0.5 - mh * 0.24} w={mw} h={base - (pcy - mh * 0.5 - mh * 0.24)} shaft="left" />
    </g>
  );
  return <g aria-hidden="true">{motor === "right" ? art : <g transform={`translate(${n(2 * (x + w / 2))} 0) scale(-1 1)`}>{art}</g>}</g>;
}

/* ------------------------------------------------------------------ */
/* Enclosures                                                          */
/* ------------------------------------------------------------------ */

/**
 * Electrical / control cabinet, generator, drive panel: plinth, doors with
 * handles, optional screen (HMI), pilot lamps and louvres.
 */
export function Cabinet({ x, y, w, h, doors = 1, screen = false, lamps = 0, louvres = true }: Box & { doors?: number; screen?: boolean; lamps?: number; louvres?: boolean }) {
  const plinth = Math.min(12, h * 0.06);
  const bodyH = h - plinth;
  const dw = (w - 8) / doors;
  return (
    <g aria-hidden="true">
      <rect x={x + 3} y={y + bodyH} width={w - 6} height={plinth} rx={1.5} {...PAINT.raised} />
      <rect x={x} y={y} width={w} height={bodyH} rx={5} {...PAINT.body} />
      {Array.from({ length: doors }).map((_, i) => {
        const dx = x + 4 + i * dw;
        return (
          <g key={i}>
            <rect x={dx + 1} y={y + 4} width={dw - 2} height={bodyH - 8} rx={3} fill="none" stroke={MX.fine} strokeWidth={1} />
            <rect x={dx + dw - 8} y={y + bodyH * 0.45} width={3} height={bodyH * 0.1} rx={1.5} {...PAINT.shaft} />
            {louvres && <Louvres x={dx + dw * 0.18} y={y + bodyH * 0.7} w={dw * 0.6} h={bodyH * 0.2} />}
          </g>
        );
      })}
      {screen && <rect x={x + w * 0.14} y={y + bodyH * 0.12} width={w * (doors > 1 ? 0.3 : 0.56)} height={bodyH * 0.2} rx={3} {...PAINT.recess} />}
      {Array.from({ length: lamps }).map((_, i) => (
        <circle key={i} cx={x + w * 0.2 + i * Math.min(14, (w * 0.6) / Math.max(1, lamps))} cy={y + bodyH * 0.42} r={Math.min(4, w * 0.04)} {...PAINT.raised} />
      ))}
    </g>
  );
}

/**
 * Sealed process chamber (furnace, vacuum chamber, autoclave, oven): thick
 * walls, bolted lid flange, inner cavity (recess) where the contents are drawn,
 * optional `heat` glow inside and a viewport.
 */
export function Chamber({ x, y, w, h, heat = false, viewport = true }: Box & { heat?: boolean; viewport?: boolean }) {
  const t = clamp(Math.min(w, h) * 0.08, 6, 18);
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={8} {...PAINT.body} />
      <rect x={x + t} y={y + t} width={w - 2 * t} height={h - 2 * t} rx={5} {...PAINT.recess} />
      {heat && <ellipse cx={x + w / 2} cy={y + h * 0.62} rx={(w - 2 * t) * 0.4} ry={(h - 2 * t) * 0.3} fill={MX.heat} opacity={0.85} />}
      <rect x={x - 5} y={y - 4} width={w + 10} height={8} rx={2} {...PAINT.raised} />
      <BoltLine x1={x} y1={y} x2={x + w} y2={y} count={Math.max(4, Math.round(w / 18))} r={1.2} />
      {viewport && (
        <g>
          <circle cx={x + w - t / 2} cy={y + h * 0.3} r={t * 0.45} {...PAINT.raised} />
          <circle cx={x + w - t / 2} cy={y + h * 0.3} r={t * 0.28} {...PAINT.recess} />
        </g>
      )}
    </g>
  );
}

/** Pulse-jet baghouse / dust collector: clean-air plenum, bag housing with compartments, hoppers with rotary valves, legs to the box bottom. */
export function Baghouse({ x, y, w, h, hoppers = 3 }: Box & { hoppers?: number }) {
  const plen = y + h * 0.12;
  const body1 = y + h * 0.58;
  const hop1 = y + h * 0.8;
  const hw = w / hoppers;
  return (
    <g aria-hidden="true">
      {Array.from({ length: hoppers + 1 }).map((_, i) => (
        <Column key={i} x={x + 4 + (i * (w - 8)) / hoppers} y1={body1} y2={y + h} w={clamp(w * 0.025, 5, 9)} />
      ))}
      {Array.from({ length: hoppers }).map((_, i) => (
        <g key={i}>
          <path d={`M ${x + i * hw + 2} ${body1} H ${x + (i + 1) * hw - 2} L ${x + i * hw + hw * 0.62} ${hop1} H ${x + i * hw + hw * 0.38} Z`} {...PAINT.cylinderV} />
          <rect x={x + i * hw + hw * 0.36} y={hop1} width={hw * 0.28} height={hw * 0.18} rx={2} {...PAINT.raised} />
          <circle cx={x + i * hw + hw / 2} cy={hop1 + hw * 0.09} r={hw * 0.06} {...PAINT.recess} />
        </g>
      ))}
      <rect x={x} y={plen} width={w} height={body1 - plen} rx={3} {...PAINT.body} />
      {Array.from({ length: Math.max(4, Math.round(w / 14)) }).map((_, i, a) => (
        <line key={i} x1={x + ((i + 0.5) * w) / a.length} x2={x + ((i + 0.5) * w) / a.length} y1={plen + 8} y2={body1 - 8} {...PAINT.hair} />
      ))}
      {Array.from({ length: hoppers - 1 }).map((_, i) => (
        <line key={i} x1={x + (i + 1) * hw} x2={x + (i + 1) * hw} y1={plen + 2} y2={body1 - 2} stroke={MX.edge} strokeWidth={1.2} />
      ))}
      <rect x={x - 3} y={y} width={w + 6} height={plen - y} rx={3} {...PAINT.raised} />
      <BoltLine x1={x + 6} y1={y + (plen - y) / 2} x2={x + w - 6} y2={y + (plen - y) / 2} count={Math.max(4, Math.round(w / 20))} r={1.2} />
      <Platform x1={x - 4} x2={x + w + 4} y={y} rail={12} />
    </g>
  );
}

/** Heat exchanger: shell-and-tube (horizontal shell with channel heads and nozzles) or plate pack (frame with plates). */
export function HeatExchanger({ x, y, w, h, kind = "shell" }: Box & { kind?: "shell" | "plate" }) {
  if (kind === "plate") {
    const plates = Math.max(8, Math.round(w / 6));
    return (
      <g aria-hidden="true">
        <rect x={x} y={y} width={w * 0.1} height={h} rx={3} {...PAINT.body} />
        <rect x={x + w * 0.9} y={y} width={w * 0.1} height={h} rx={3} {...PAINT.body} />
        <rect x={x + w * 0.1} y={y + h * 0.08} width={w * 0.8} height={h * 0.84} rx={2} {...PAINT.raised} />
        {Array.from({ length: plates }).map((_, i) => (
          <line key={i} x1={x + w * 0.1 + ((i + 0.5) * w * 0.8) / plates} x2={x + w * 0.1 + ((i + 0.5) * w * 0.8) / plates} y1={y + h * 0.1} y2={y + h * 0.9} {...PAINT.hair} />
        ))}
        <rect x={x - 4} y={y + h * 0.02} width={w + 8} height={5} rx={1.5} {...PAINT.shaft} />
      </g>
    );
  }
  const r = h * 0.38;
  const cy = y + h * 0.45;
  return (
    <g aria-hidden="true">
      {[0.25, 0.75].map((f) => (
        <rect key={f} x={x + w * f - r * 0.5} y={cy + r * 0.6} width={r} height={y + h - cy - r * 0.6} rx={1.5} {...PAINT.body} />
      ))}
      <rect x={x + w * 0.12} y={cy - r} width={w * 0.76} height={r * 2} rx={r * 0.3} {...PAINT.cylinder} />
      <rect x={x} y={cy - r * 0.85} width={w * 0.14} height={r * 1.7} rx={r * 0.4} {...PAINT.cylinder} />
      <rect x={x + w * 0.86} y={cy - r * 0.85} width={w * 0.14} height={r * 1.7} rx={r * 0.4} {...PAINT.cylinder} />
      <Flange x={x + w * 0.13} y={cy} d={r * 1.7} />
      <Flange x={x + w * 0.87} y={cy} d={r * 1.7} />
      {[0.3, 0.7].map((f) => (
        <rect key={f} x={x + w * f - r * 0.18} y={y} width={r * 0.36} height={cy - r - y + 2} {...PAINT.cylinderV} />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Rotating drums and conveyors                                        */
/* ------------------------------------------------------------------ */

/**
 * Rotary drum (kiln, dryer, cooler, ball mill, trommel) on tyres and support
 * rollers with concrete piers to the box bottom; optional girth gear and a hot
 * zone glow. `tyres` are fractions of the length.
 */
export function Drum({ x, y, w, h, tyres = [0.18, 0.82], gear, heat }: Box & { tyres?: number[]; gear?: number; heat?: [number, number] }) {
  const d = h * 0.5;
  const cy = y + d / 2 + h * 0.04;
  const sy = cy - d / 2;
  const rr = d * 0.18;
  return (
    <g aria-hidden="true">
      {tyres.map((f) => {
        const tx = x + w * f;
        return (
          <g key={f}>
            <path d={`M ${tx - d * 0.45} ${y + h} L ${tx - d * 0.35} ${cy + d / 2 + rr * 1.6} H ${tx + d * 0.35} L ${tx + d * 0.45} ${y + h} Z`} {...PAINT.body} />
            <rect x={tx - d * 0.42} y={cy + d / 2 + rr * 1.4} width={d * 0.84} height={rr * 0.5} rx={1.5} {...PAINT.raised} />
            {[-1, 1].map((s) => (
              <g key={s}>
                <circle cx={tx + s * rr * 1.3} cy={cy + d / 2 + rr * 0.5} r={rr} {...PAINT.raised} />
                <circle cx={tx + s * rr * 1.3} cy={cy + d / 2 + rr * 0.5} r={rr * 0.35} {...PAINT.shaft} />
              </g>
            ))}
          </g>
        );
      })}
      <rect x={x} y={sy} width={w} height={d} rx={3} {...PAINT.cylinder} />
      {heat && <rect x={x + w * heat[0]} y={sy + 2} width={w * (heat[1] - heat[0])} height={d - 4} fill={MX.heat} opacity={0.35} rx={2} />}
      {Array.from({ length: Math.max(3, Math.round(w / 70)) }).map((_, i, a) => (
        <line key={i} x1={x + ((i + 1) * w) / (a.length + 1)} x2={x + ((i + 1) * w) / (a.length + 1)} y1={sy + 2} y2={sy + d - 2} {...PAINT.hair} />
      ))}
      {tyres.map((f) => (
        <rect key={f} x={x + w * f - d * 0.12} y={sy - d * 0.06} width={d * 0.24} height={d * 1.12} rx={3} {...PAINT.raised} />
      ))}
      {gear !== undefined && (
        <g>
          <rect x={x + w * gear - d * 0.08} y={sy - d * 0.14} width={d * 0.16} height={d * 1.28} rx={2} {...PAINT.shaft} />
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={i} x1={x + w * gear - d * 0.08} x2={x + w * gear + d * 0.08} y1={sy - d * 0.12 + (i * d * 1.24) / 13} y2={sy - d * 0.12 + (i * d * 1.24) / 13} stroke={MX.edge} strokeWidth={0.8} />
          ))}
        </g>
      )}
    </g>
  );
}

/**
 * Conveyor between two points (may be inclined): `belt` (head and tail
 * pulleys, idlers, material on the belt), `screw` (trough with flights, drive
 * at the start), `chain` (drag / apron casing with sprockets) or `slide`
 * (air slide: canvas trough with an air box under it). `h` is the conveyor
 * depth; with `ground`, support legs go down to that y.
 */
export function Conveyor({ x1, y1, x2, y2, h = 14, kind = "belt", ground, material = true }: { x1: number; y1: number; x2: number; y2: number; h?: number; kind?: "belt" | "screw" | "chain" | "slide"; ground?: number; material?: boolean }) {
  const L = Math.hypot(x2 - x1, y2 - y1);
  const deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const legs = ground !== undefined ? Math.max(2, Math.round(L / 120) + 1) : 0;
  const legPts = Array.from({ length: legs }).map((_, i) => {
    const t = 0.08 + (0.84 * i) / Math.max(1, legs - 1);
    return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t] as Pt;
  });
  let local: React.ReactNode;
  if (kind === "belt") {
    const r = h / 2;
    const idlers = Math.max(2, Math.round(L / 34));
    local = (
      <g>
        <rect x={0} y={-r} width={L} height={h} rx={r} {...PAINT.body} />
        <line x1={r} x2={L - r} y1={-r + 2} y2={-r + 2} stroke={MX.metal} strokeWidth={2} />
        {Array.from({ length: idlers }).map((_, i) => (
          <circle key={i} cx={r + ((i + 0.5) * (L - 2 * r)) / idlers} cy={0} r={r * 0.32} {...PAINT.recess} />
        ))}
        {material && <path d={`M ${r * 2} ${-r} Q ${L / 2} ${-r - h * 0.45} ${L - r * 2} ${-r} Z`} {...PAINT.material} />}
        {[r, L - r].map((px) => (
          <g key={px}>
            <circle cx={px} cy={0} r={r * 0.9} {...PAINT.raised} />
            <circle cx={px} cy={0} r={r * 0.3} {...PAINT.shaft} />
          </g>
        ))}
      </g>
    );
  } else if (kind === "screw") {
    const flights = Math.max(4, Math.round(L / (h * 0.9)));
    local = (
      <g>
        <rect x={0} y={-h / 2} width={L} height={h} rx={h * 0.3} {...PAINT.cylinder} />
        <rect x={h * 0.4} y={-h * 0.3} width={L - h * 0.8} height={h * 0.6} rx={2} {...PAINT.recess} />
        <line x1={h * 0.4} x2={L - h * 0.4} y1={0} y2={0} stroke={MX.metal} strokeWidth={Math.max(1.5, h * 0.08)} />
        {Array.from({ length: flights }).map((_, i) => {
          const fx = h * 0.4 + ((i + 0.5) * (L - h * 0.8)) / flights;
          return <line key={i} x1={fx - h * 0.18} x2={fx + h * 0.18} y1={-h * 0.27} y2={h * 0.27} stroke={MX.metalHi} strokeWidth={1.1} />;
        })}
        <Flange x={2} y={0} d={h} />
        <Flange x={L - 2} y={0} d={h} />
      </g>
    );
  } else if (kind === "chain") {
    local = (
      <g>
        <rect x={0} y={-h / 2} width={L} height={h} rx={3} {...PAINT.body} />
        <line x1={h * 0.6} x2={L - h * 0.6} y1={-h * 0.22} y2={-h * 0.22} stroke={MX.metal} strokeWidth={1.4} strokeDasharray="4 2" />
        <line x1={h * 0.6} x2={L - h * 0.6} y1={h * 0.22} y2={h * 0.22} stroke={MX.metal} strokeWidth={1.4} strokeDasharray="4 2" />
        {[h * 0.6, L - h * 0.6].map((px) => (
          <g key={px}>
            <circle cx={px} cy={0} r={h * 0.4} {...PAINT.raised} />
            <circle cx={px} cy={0} r={h * 0.14} {...PAINT.shaft} />
          </g>
        ))}
        {Array.from({ length: Math.max(2, Math.round(L / 90)) }).map((_, i, a) => (
          <Panel key={i} x={(L * (i + 0.5)) / a.length - h * 0.4} y={-h / 2 + 2} w={h * 0.8} h={h - 4} bolts={false} />
        ))}
      </g>
    );
  } else {
    local = (
      <g>
        <rect x={0} y={h * 0.1} width={L} height={h * 0.4} rx={2} {...PAINT.body} />
        <rect x={0} y={-h / 2} width={L} height={h * 0.6} rx={2} {...PAINT.raised} />
        <line x1={4} x2={L - 4} y1={h * 0.1} y2={h * 0.1} stroke={MX.air} strokeWidth={1.2} strokeDasharray="5 4" />
        {material && <rect x={6} y={-h / 2 + 2} width={L - 12} height={h * 0.28} rx={1.5} {...PAINT.material} />}
        {Array.from({ length: Math.max(2, Math.round(L / 60)) }).map((_, i, a) => (
          <line key={i} x1={(L * (i + 1)) / (a.length + 1)} x2={(L * (i + 1)) / (a.length + 1)} y1={-h / 2} y2={h / 2} stroke={MX.edge} strokeWidth={1} />
        ))}
      </g>
    );
  }
  return (
    <g aria-hidden="true">
      {ground !== undefined &&
        legPts.map(([lx, ly], i) => <Column key={i} x={lx} y1={ly + h / 2} y2={ground} w={6} />)}
      <g transform={`translate(${n(x1)} ${n(y1)}) rotate(${n(deg)})`}>{local}</g>
    </g>
  );
}

/** Bucket elevator: head with drive on top, two casing legs (buckets visible on the up leg), boot at the box bottom. */
export function BucketElevator({ x, y, w, h, drive = "right" }: Box & { drive?: "left" | "right" }) {
  const headH = w * 0.9;
  const bootH = w * 0.7;
  const leg = w * 0.36;
  const lx = x + w * 0.06;
  const rx = x + w * 0.58;
  const buckets = Math.max(4, Math.floor((h - headH - bootH) / 16));
  const s = drive === "right" ? 1 : -1;
  return (
    <g aria-hidden="true">
      <rect x={lx} y={y + headH - 4} width={leg} height={h - headH - bootH + 8} {...PAINT.cylinderV} />
      <rect x={rx} y={y + headH - 4} width={leg} height={h - headH - bootH + 8} {...PAINT.cylinderV} />
      <rect x={lx + leg * 0.18} y={y + headH + 10} width={leg * 0.64} height={h - headH - bootH - 20} rx={2} {...PAINT.recess} />
      {Array.from({ length: buckets }).map((_, i) => (
        <path key={i} d={`M ${lx + leg * 0.24} ${y + headH + 16 + i * ((h - headH - bootH - 32) / buckets)} h ${leg * 0.52} l ${-leg * 0.08} 8 h ${-leg * 0.36} Z`} {...PAINT.material} />
      ))}
      {Array.from({ length: Math.max(2, Math.floor((h - headH - bootH) / 60)) }).map((_, i, a) => (
        <g key={i}>
          <Flange x={lx + leg / 2} y={y + headH + ((i + 1) * (h - headH - bootH)) / (a.length + 1)} d={leg} vertical={false} />
          <Flange x={rx + leg / 2} y={y + headH + ((i + 1) * (h - headH - bootH)) / (a.length + 1)} d={leg} vertical={false} />
        </g>
      ))}
      {/* head */}
      <path d={`M ${x} ${y + headH} V ${y + headH * 0.45} Q ${x + w / 2} ${y - headH * 0.12} ${x + w} ${y + headH * 0.45} V ${y + headH} Z`} {...PAINT.body} />
      <circle cx={x + w / 2} cy={y + headH * 0.5} r={w * 0.2} {...PAINT.raised} />
      <circle cx={x + w / 2} cy={y + headH * 0.5} r={w * 0.07} {...PAINT.shaft} />
      <rect x={drive === "right" ? x + w : x - w * 0.55} y={y + headH * 0.3} width={w * 0.55} height={headH * 0.4} rx={4} {...PAINT.body} />
      <line x1={x + w / 2} x2={x + w / 2 + s * w * 0.8} y1={y + headH * 0.5} y2={y + headH * 0.5} stroke={MX.metal} strokeWidth={3} />
      {/* boot */}
      <rect x={x} y={y + h - bootH} width={w} height={bootH} rx={4} {...PAINT.body} />
      <circle cx={x + w / 2} cy={y + h - bootH * 0.5} r={w * 0.18} {...PAINT.raised} />
      <circle cx={x + w / 2} cy={y + h - bootH * 0.5} r={w * 0.06} {...PAINT.shaft} />
      <CornerBolts x={x} y={y + h - bootH} w={w} h={bootH} inset={5} r={1.2} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Pipes, ducts, valves, flows                                         */
/* ------------------------------------------------------------------ */

const ptsPath = (pts: Pt[]) => pts.map(([px, py], i) => `${i ? "L" : "M"} ${n(px)} ${n(py)}`).join(" ");

/**
 * Pipe along a polyline (right-angle runs read best), outside diameter `d`:
 * outlined metal tube with rounded bends and flanges at both ends (and at
 * `joints`, fractions along each straight run).
 */
export function Pipe({ pts, d = 8, flanges = true, joints = [] }: { pts: Pt[]; d?: number; flanges?: boolean; joints?: number[] }) {
  const ends: Array<{ x: number; y: number; vertical: boolean }> = [];
  if (flanges && pts.length > 1) {
    const [a, b] = [pts[0], pts[1]];
    const [c, e] = [pts[pts.length - 1], pts[pts.length - 2]];
    ends.push({ x: a[0], y: a[1], vertical: Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]) });
    ends.push({ x: c[0], y: c[1], vertical: Math.abs(c[0] - e[0]) > Math.abs(c[1] - e[1]) });
    for (let i = 0; i < pts.length - 1; i++)
      for (const f of joints) {
        const [p, q] = [pts[i], pts[i + 1]];
        ends.push({ x: p[0] + (q[0] - p[0]) * f, y: p[1] + (q[1] - p[1]) * f, vertical: Math.abs(q[0] - p[0]) > Math.abs(q[1] - p[1]) });
      }
  }
  return (
    <g aria-hidden="true">
      <path d={ptsPath(pts)} fill="none" stroke={MX.edge} strokeWidth={d} strokeLinejoin="round" />
      <path d={ptsPath(pts)} fill="none" stroke={MX.flatRaised} strokeWidth={Math.max(1, d - 3)} strokeLinejoin="round" />
      {d >= 8 && <path d={ptsPath(pts)} fill="none" stroke={MX.metal} strokeOpacity={0.35} strokeWidth={Math.max(1, d * 0.2)} strokeLinejoin="round" transform={`translate(0 ${-d * 0.18})`} />}
      {ends.map((e, i) => (
        <Flange key={i} x={e.x} y={e.y} d={d} vertical={e.vertical} />
      ))}
    </g>
  );
}

/** Large duct (gas / air) along a polyline, width `d`, with flanged joints every ~4 widths. */
export function Duct({ pts, d = 30 }: { pts: Pt[]; d?: number }) {
  const joints: React.ReactNode[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [p, q] = [pts[i], pts[i + 1]];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const k = Math.floor(L / (d * 4));
    for (let j = 1; j <= k; j++) {
      const t = j / (k + 1);
      const horiz = Math.abs(q[0] - p[0]) > Math.abs(q[1] - p[1]);
      const jx = p[0] + (q[0] - p[0]) * t;
      const jy = p[1] + (q[1] - p[1]) * t;
      joints.push(horiz ? <rect key={`${i}-${j}`} x={jx - 2} y={jy - d / 2 - 3} width={4} height={d + 6} rx={1} {...PAINT.raised} /> : <rect key={`${i}-${j}`} x={jx - d / 2 - 3} y={jy - 2} width={d + 6} height={4} rx={1} {...PAINT.raised} />);
    }
  }
  return (
    <g aria-hidden="true">
      <path d={ptsPath(pts)} fill="none" stroke={MX.edge} strokeWidth={d} strokeLinejoin="round" />
      <path d={ptsPath(pts)} fill="none" stroke={MX.flatBody} strokeWidth={d - 3} strokeLinejoin="round" />
      <path d={ptsPath(pts)} fill="none" stroke={MX.fine} strokeWidth={1} strokeLinejoin="round" />
      {joints}
    </g>
  );
}

/** Kit colour of a process medium. */
export const MEDIUM = {
  // Flat token: a gradient paint (MX.material) draws nothing on a perfectly straight stroke (zero-area box).
  material: "var(--mx-material)",
  gas: MX.gas,
  air: MX.air,
  water: MX.air,
  steam: MX.label,
  oil: MX.material,
  signal: MX.label,
} as const;

/**
 * Process flow line with an arrowhead at the end (direction of flow): the
 * medium sets the colour (material = brass, hot gas = red-brown, air / water =
 * blue, signal = dashed grey). Draw these over or beside pipes and ducts.
 */
export function Flow({ pts, medium = "material", w = 1.8, arrow = true }: { pts: Pt[]; medium?: keyof typeof MEDIUM; w?: number; arrow?: boolean }) {
  const c = MEDIUM[medium];
  const [p, q] = [pts[pts.length - 2], pts[pts.length - 1]];
  const deg = (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI;
  const s = Math.max(5, w * 3.4);
  return (
    <g aria-hidden="true">
      <path d={ptsPath(pts)} fill="none" stroke={c} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={medium === "signal" ? "4 3" : undefined} />
      {arrow && <path d={`M ${n(q[0])} ${n(q[1])} l ${-s * 1.5} ${-s * 0.62} v ${s * 1.24} Z`} fill={c} transform={`rotate(${n(deg)} ${n(q[0])} ${n(q[1])})`} />}
    </g>
  );
}

/**
 * Valve in a line, centred on (x, y), body `size` long: gate, globe, ball,
 * butterfly, check, or control (with a diaphragm actuator) / solenoid (with a
 * coil). `vertical` when the line runs up–down.
 */
export function Valve({ x, y, size = 16, kind = "gate", vertical = false }: { x: number; y: number; size?: number; kind?: "gate" | "globe" | "ball" | "butterfly" | "check" | "control" | "solenoid"; vertical?: boolean }) {
  const s = size / 2;
  const body =
    kind === "butterfly" ? (
      <g>
        <rect x={-s * 0.5} y={-s * 1.1} width={s} height={s * 2.2} rx={2} {...PAINT.body} />
        <line x1={-s * 0.35} y1={s * 0.8} x2={s * 0.35} y2={-s * 0.8} stroke={MX.metalHi} strokeWidth={1.6} />
        <line x1={0} x2={0} y1={-s * 1.1} y2={-s * 1.7} stroke={MX.edge} strokeWidth={1.4} />
        <rect x={-s * 0.8} y={-s * 2.1} width={s * 1.6} height={s * 0.45} rx={1} {...PAINT.raised} />
      </g>
    ) : (
      <g>
        <path d={`M ${-s} ${-s * 0.7} L ${s} ${s * 0.7} V ${-s * 0.7} L ${-s} ${s * 0.7} Z`} {...PAINT.body} />
        {kind === "check" && <path d={`M ${-s} ${-s * 0.7} L 0 0 L ${-s} ${s * 0.7} Z`} fill={MX.edge} />}
        {kind === "ball" && <circle cx={0} cy={0} r={s * 0.42} {...PAINT.shaft} />}
        {kind === "globe" && <circle cx={0} cy={0} r={s * 0.36} {...PAINT.raised} />}
        {kind !== "check" && <line x1={0} x2={0} y1={0} y2={-s * 1.5} stroke={MX.edge} strokeWidth={1.4} />}
        {(kind === "gate" || kind === "globe") && <rect x={-s * 0.8} y={-s * 1.75} width={s * 1.6} height={s * 0.4} rx={1} {...PAINT.raised} />}
        {kind === "ball" && <rect x={0} y={-s * 1.65} width={s * 1.4} height={s * 0.3} rx={1} {...PAINT.shaft} />}
        {kind === "control" && <path d={`M ${-s * 0.9} ${-s * 1.5} Q 0 ${-s * 2.7} ${s * 0.9} ${-s * 1.5} Z`} {...PAINT.raised} />}
        {kind === "solenoid" && <rect x={-s * 0.6} y={-s * 2.4} width={s * 1.2} height={s * 0.95} rx={2} {...PAINT.raised} />}
      </g>
    );
  return <g transform={`translate(${n(x)} ${n(y)})${vertical ? " rotate(90)" : ""}`}>{body}</g>;
}

/** Louvre damper in a duct section, box = the duct section it sits in. */
export function Damper({ x, y, w, h }: Box) {
  const vertical = h > w;
  const blades = 3;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={2} {...PAINT.raised} />
      {Array.from({ length: blades }).map((_, i) => {
        const t = (i + 0.5) / blades;
        return vertical ? (
          <line key={i} x1={x + 3} y1={y + h * t + 4} x2={x + w - 3} y2={y + h * t - 4} stroke={MX.metalHi} strokeWidth={1.4} />
        ) : (
          <line key={i} x1={x + w * t - 4} y1={y + h - 3} x2={x + w * t + 4} y2={y + 3} stroke={MX.metalHi} strokeWidth={1.4} />
        );
      })}
      <rect x={vertical ? x + w : x + w / 2 - 6} y={vertical ? y + h / 2 - 6 : y - 10} width={12} height={10} rx={2} {...PAINT.body} />
    </g>
  );
}

/** Expansion joint (bellows) in a pipe or duct, box = the joint. */
export function Bellows({ x, y, w, h }: Box) {
  const vertical = h > w;
  const k = Math.max(3, Math.round((vertical ? h : w) / 5));
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx={2} {...PAINT.raised} />
      {Array.from({ length: k }).map((_, i) =>
        vertical ? (
          <line key={i} x1={x - 2} x2={x + w + 2} y1={y + ((i + 0.5) * h) / k} y2={y + ((i + 0.5) * h) / k} stroke={MX.edge} strokeWidth={1} />
        ) : (
          <line key={i} x1={x + ((i + 0.5) * w) / k} x2={x + ((i + 0.5) * w) / k} y1={y - 2} y2={y + h + 2} stroke={MX.edge} strokeWidth={1} />
        ),
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Instruments                                                         */
/* ------------------------------------------------------------------ */

/**
 * Field instrument on the equipment surface at (x, y): a stem leaving the
 * surface toward `dir` and a head (transmitter box, round gauge, switch or
 * thermowell probe). Put the measurement pad on the returned head centre —
 * use `instrumentHead(x, y, dir, s)`.
 */
export function Instrument({ x, y, dir = "up", kind = "transmitter", s = 1 }: { x: number; y: number; dir?: "up" | "down" | "left" | "right"; kind?: "transmitter" | "gauge" | "switch" | "probe"; s?: number }) {
  const [hx, hy] = instrumentHead(x, y, dir, s);
  const r = 7 * s;
  return (
    <g aria-hidden="true">
      <line x1={x} y1={y} x2={hx} y2={hy} stroke={MX.metal} strokeWidth={2 * s} />
      {kind === "gauge" ? (
        <g>
          <circle cx={hx} cy={hy} r={r} {...PAINT.raised} />
          <circle cx={hx} cy={hy} r={r * 0.7} {...PAINT.recess} />
          <line x1={hx} y1={hy} x2={hx + r * 0.45} y2={hy - r * 0.35} stroke={MX.metalHi} strokeWidth={1} />
        </g>
      ) : kind === "probe" ? (
        <g>
          <rect x={hx - r * 0.75} y={hy - r * 0.75} width={r * 1.5} height={r * 1.5} rx={r * 0.75} {...PAINT.raised} />
          <circle cx={hx} cy={hy} r={r * 0.3} {...PAINT.shaft} />
        </g>
      ) : (
        <g>
          <rect x={hx - r} y={hy - r * 0.85} width={r * 2} height={r * 1.7} rx={kind === "switch" ? 2 : 3} {...PAINT.raised} />
          <rect x={hx - r * 0.6} y={hy - r * 0.45} width={r * 1.2} height={r * 0.9} rx={1.5} {...PAINT.recess} />
        </g>
      )}
    </g>
  );
}

/** Head centre of an `Instrument` mounted at (x, y): where its pad goes. */
export function instrumentHead(x: number, y: number, dir: "up" | "down" | "left" | "right" = "up", s = 1): Pt {
  const L = 16 * s;
  return dir === "up" ? [x, y - L] : dir === "down" ? [x, y + L] : dir === "left" ? [x - L, y] : [x + L, y];
}
