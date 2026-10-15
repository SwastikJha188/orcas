"use client";

/**
 * Thermal page visuals on one shared metre axis (0–74 m): the machine-kit
 * kiln elevation, the unrolled scanner map (one bitmap, repainted per tick),
 * the axial profile and the circumferential (polar) plot of one section.
 *
 * Heat scale: sober and perceptually ordered — a neutral graphite ramp up to
 * the top of the normal band, then the status colours (warning at the 380 °C
 * alert, danger at the 420 °C alarm). Colour therefore appears only where the
 * shell is in alert. All stops are `--thm-heat-*` tokens (thermal-view.css),
 * built from the semantic globals and resolved for the active theme.
 */

import React, { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Severity } from "@/lib/kiln-sim/signals";
import {
  SHELL_ALERT,
  SHELL_DA,
  SHELL_DANGER,
  SHELL_DIA,
  SHELL_DZ,
  SHELL_GIRTH,
  SHELL_LEN,
  SHELL_NA,
  SHELL_TYRES,
  SHELL_ZONES,
  shellZoneAt,
  type HandheldPoint,
  type ShellMap,
} from "@/lib/kiln-sim/shell-map";
import { MX, MachineLabel, MachinePad, MachineSvg, PAINT, Bolt } from "./machine-kit/machine-kit";
import { COLD_BAND, signed, tempTone, type HotSpot } from "./thermal-derive";

/* Shared metre axis: map, kiln drawing and profile line up column for column. */
export const VB_W = 1000;
export const PX0 = 52;
export const PWD = 912;
export const XT = (z: number) => PX0 + (z / SHELL_LEN) * PWD;
const PX_PER_M = PWD / SHELL_LEN;
const HY0 = 186;
const HH = 288;
const YT = (a: number) => HY0 + (a / 360) * HH;
const SHELL_Y = 92;
const SHELL_H = SHELL_DIA * PX_PER_M;
const GROUND = 160;

/** Heat scale stops (°C → `--thm-heat-<v>` token). */
export const HEAT_STOPS = [150, 250, 330, 360, 380, 420, 480] as const;
export const HEAT_LO = HEAT_STOPS[0];
export const HEAT_HI = HEAT_STOPS[HEAT_STOPS.length - 1];

type Rgb = [number, number, number];

/** Resolves any CSS colour string (rgb(), color(srgb …), color-mix results) to RGB through a 1 px canvas. */
function toRgb(ctx: CanvasRenderingContext2D, css: string): Rgb {
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

function heatAt(stops: Array<[number, Rgb]>, v: number): Rgb {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [a, ca] = stops[i - 1];
      const [b, cb] = stops[i];
      const k = (v - a) / (b - a);
      return [ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k, ca[2] + (cb[2] - ca[2]) * k];
    }
  }
  return stops[stops.length - 1][1];
}

/** Changes whenever the theme does, so the bitmap repaints with the other theme's tokens. */
function useThemeKey(): string {
  const [key, setKey] = useState("");
  useEffect(() => {
    const el = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => setKey(`${el.getAttribute("data-theme") ?? ""}|${el.className}|${mq.matches}`);
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme", "class"] });
    mq.addEventListener("change", read);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", read);
    };
  }, []);
  return key;
}

/**
 * Paints the map into an nz × 72 bitmap (one pixel per 0.5 m × 5° cell) and
 * returns a data URL. One `<image>` per tick instead of ~10 k SVG nodes.
 * Colours are read from the probe element's `--thm-heat-*` tokens.
 */
/** Last good value of every cell and its age limit (D5 Table 9.5: hidden cells keep the last-good value with age). */
export interface LastGood {
  v: Float32Array;
  at: Int32Array;
  /** Minute of the map shown. */
  t: number;
  /** Older last-good values are not shown (min). */
  maxAge: number;
}

const lastGoodOf = (lg: LastGood | null | undefined, j: number): { v: number; age: number } | null => {
  if (!lg || lg.at[j] < 0) return null;
  const age = lg.t - lg.at[j];
  return age > 0 && age <= lg.maxAge ? { v: lg.v[j], age } : null;
};

function useHeatImage(map: ShellMap, probe: React.RefObject<HTMLSpanElement | null>, lastGood?: LastGood | null): string {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const swatch = useRef<CanvasRenderingContext2D | null>(null);
  const ramp = useRef<{ key: string; stops: Array<[number, Rgb]> } | null>(null);
  const [url, setUrl] = useState("");
  const theme = useThemeKey();
  useEffect(() => {
    const el = probe.current;
    if (!el) return;
    if (!swatch.current) {
      const c = document.createElement("canvas");
      c.width = 1;
      c.height = 1;
      swatch.current = c.getContext("2d", { willReadFrequently: true });
    }
    const sw = swatch.current;
    if (!sw) return;
    if (!ramp.current || ramp.current.key !== theme) {
      const css = getComputedStyle(el);
      ramp.current = {
        key: theme,
        stops: HEAT_STOPS.map((v) => [v, toRgb(sw, css.getPropertyValue(`--thm-heat-${v}`).trim() || "#808080")]),
      };
    }
    const { stops } = ramp.current;
    const nz = map.colMax.length;
    if (!canvas.current) canvas.current = document.createElement("canvas");
    const cv = canvas.current;
    cv.width = nz;
    cv.height = SHELL_NA;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(nz, SHELL_NA);
    for (let i = 0; i < nz; i++) {
      for (let k = 0; k < SHELL_NA; k++) {
        const j = i * SHELL_NA + k;
        const o = (k * nz + i) * 4;
        if (map.mask[j]) {
          // Hidden: transparent so the hatch shows through, or the last-good value faded over the hatch.
          const lg = lastGoodOf(lastGood, j);
          if (!lg) {
            img.data[o + 3] = 0;
            continue;
          }
          const c = heatAt(stops, lg.v);
          img.data[o] = c[0];
          img.data[o + 1] = c[1];
          img.data[o + 2] = c[2];
          img.data[o + 3] = 120;
          continue;
        }
        const c = heatAt(stops, map.temp[j]);
        img.data[o] = c[0];
        img.data[o + 1] = c[1];
        img.data[o + 2] = c[2];
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    setUrl(cv.toDataURL());
  }, [map, theme, probe, lastGood]);
  return url;
}

/** One SVG path covering every hidden cell (column runs). */
function maskPath(map: ShellMap): string {
  const nz = map.colMax.length;
  const cw = PX_PER_M * SHELL_DZ;
  const ch = HH / SHELL_NA;
  let d = "";
  for (let i = 0; i < nz; i++) {
    let k = 0;
    while (k < SHELL_NA) {
      if (!map.mask[i * SHELL_NA + k]) {
        k++;
        continue;
      }
      const k0 = k;
      while (k < SHELL_NA && map.mask[i * SHELL_NA + k]) k++;
      const x = XT(i * SHELL_DZ) - cw / 2;
      d += `M${x.toFixed(1)},${(HY0 + k0 * ch).toFixed(1)}h${cw.toFixed(2)}v${((k - k0) * ch).toFixed(1)}h${(-cw).toFixed(2)}z`;
    }
  }
  return d;
}

/** Rectangles of a hot spot on the map (two when its arc wraps past 360°). */
function spotRects(s: HotSpot): Array<{ x: number; y: number; w: number; h: number }> {
  const x = XT(s.z0);
  const w = Math.max(4, XT(s.z1) - XT(s.z0));
  if (s.a1 <= 360) return [{ x, y: YT(s.a0), w, h: YT(s.a1) - YT(s.a0) }];
  return [
    { x, y: YT(s.a0), w, h: YT(360) - YT(s.a0) },
    { x, y: YT(0), w, h: YT(s.a1 - 360) - YT(0) },
  ];
}

/* ------------------------------------------------------------------ */
/* Shell map                                                           */
/* ------------------------------------------------------------------ */

interface Tip {
  x: number;
  y: number;
  where: string;
  zone: string;
  value: string;
  delta: string | null;
}

export function ShellMapFigure({
  map,
  status,
  spots,
  selI,
  selSpot,
  onSelect,
  coldBand = COLD_BAND,
  lastGood = null,
  handheld = null,
}: {
  map: ShellMap;
  status: Severity;
  spots: HotSpot[];
  /** Selected section index (polar plot / trend). */
  selI: number;
  selSpot: string | null;
  onSelect: (i: number) => void;
  /** Where a ring / coating build-up shows (outline on the map). */
  coldBand?: { from: number; to: number };
  /** Hidden cells drawn with their last-good value (pyro line). */
  lastGood?: LastGood | null;
  /** Handheld comparison points of the latest round (pyro line). */
  handheld?: HandheldPoint[] | null;
}) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const probe = useRef<HTMLSpanElement | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const clipId = `thm-clip${uid}`;
  const hatchId = `thm-hatch${uid}`;
  const heatUrl = useHeatImage(map, probe, lastGood);
  const hidden = useMemo(() => maskPath(map), [map]);
  const [tip, setTip] = useState<Tip | null>(null);
  const nz = map.colMax.length;

  const cellAt = (e: React.MouseEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const z = Math.max(0, Math.min(SHELL_LEN, ((e.clientX - r.left) / r.width) * SHELL_LEN));
    const a = Math.max(0, Math.min(359.9, ((e.clientY - r.top) / r.height) * 360));
    const i = Math.max(0, Math.min(nz - 1, Math.round(z / SHELL_DZ)));
    const k = Math.min(SHELL_NA - 1, Math.floor(a / SHELL_DA));
    return { i, k, z };
  };

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const wr = wrap.current?.getBoundingClientRect();
    if (!wr || !wrap.current) return;
    /* Under the TV `body { zoom }` rects and clientX/Y are zoomed px; the tip is placed in CSS px. */
    const uz = wr.width / (wrap.current.offsetWidth || wr.width) || 1;
    const { i, k, z } = cellAt(e);
    const j = i * SHELL_NA + k;
    const off = Boolean(map.mask[j]);
    const lg = off ? lastGoodOf(lastGood, j) : null;
    setTip({
      x: Math.max(0, Math.min((e.clientX - wr.left) / uz + 14, wr.width / uz - 200)),
      y: (e.clientY - wr.top) / uz + 14,
      where: `${(i * SHELL_DZ).toFixed(1)} m · ${k * SHELL_DA}°`,
      zone: shellZoneAt(z),
      value: off ? (lg ? `No view · last good ${lg.v.toFixed(0)} °C` : "No view") : `${map.temp[j].toFixed(0)} °C`,
      delta: off ? (lg ? `${lg.age} min ago` : null) : `${signed(map.temp[j] - map.model[i])} K vs model`,
    });
  };

  const mx = XT(map.maxZ);
  const my = YT(map.maxAngle + SHELL_DA / 2);
  const flip = mx > PX0 + PWD - 140;
  /* Readout above the crosshair, or below it near the top edge (keeps clear of the tyre labels). */
  const ry = my - 30 < HY0 + 4 ? my + 10 : my - 30;
  const sx = XT(selI * SHELL_DZ);

  return (
    <div className="thm-map" ref={wrap}>
      <span ref={probe} className="thm-heat-probe" aria-hidden="true" />
      <MachineSvg
        viewBox={`0 0 ${VB_W} 512`}
        interactive
        label={`Kiln shell scanner map to scale, ${SHELL_LEN} m by 360 degrees. Hottest ${map.max.toFixed(0)} °C at ${map.maxZ.toFixed(1)} m, ${map.maxAngle}°`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PX0} y={HY0} width={PWD} height={HH} rx={6} />
          </clipPath>
          <pattern id={hatchId} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={6} className="thm-hatch-line" />
          </pattern>
        </defs>

        {SHELL_ZONES.map((zn) => (
          <MachineLabel key={zn.name} x={(XT(zn.from) + XT(zn.to)) / 2} y={14} size={zn.to - zn.from < 10 ? 8 : 8.5}>
            {zn.to - zn.from < 10 ? zn.name.toUpperCase() : `${zn.name.toUpperCase()} · ${zn.from}–${zn.to} M`}
          </MachineLabel>
        ))}
        {SHELL_ZONES.slice(1).map((zn) => (
          <line key={zn.name} x1={XT(zn.from)} x2={XT(zn.from)} y1={4} y2={HY0 + HH} className="thm-zone-line" />
        ))}

        <KilnElevation status={status} maxZ={map.maxZ} />

        {SHELL_TYRES.map((t) => (
          <g key={t.label}>
            <line x1={XT(t.z + 0.25)} x2={XT(t.z + 0.25)} y1={GROUND + 4} y2={HY0} className="thm-ref" />
            <MachineLabel x={XT(t.z + 0.25)} y={HY0 - 8}>{`${t.label} · ${t.z} M`}</MachineLabel>
          </g>
        ))}
        <MachineLabel x={XT(SHELL_GIRTH)} y={HY0 - 8}>{`GG · ${SHELL_GIRTH} M`}</MachineLabel>

        <rect x={PX0} y={HY0} width={PWD} height={HH} rx={6} className="thm-map-bg" />
        <g clipPath={`url(#${clipId})`}>
          <path d={hidden} fill={`url(#${hatchId})`} className="thm-map-hidden" />
          {heatUrl && (
            <image
              href={heatUrl}
              x={XT(-SHELL_DZ / 2)}
              y={HY0}
              width={XT(SHELL_LEN + SHELL_DZ / 2) - XT(-SHELL_DZ / 2)}
              height={HH}
              preserveAspectRatio="none"
              style={{ imageRendering: "pixelated" }}
            />
          )}
          {[90, 180, 270].map((a) => (
            <line key={a} x1={PX0} x2={PX0 + PWD} y1={YT(a)} y2={YT(a)} className="thm-map-grid" />
          ))}
          {/* D5 cold band where a ring / coating build-up shows */}
          <rect x={XT(coldBand.from)} y={HY0} width={XT(coldBand.to) - XT(coldBand.from)} height={HH} className="thm-coldband" />
          {map.hotBox && (
            <rect
              x={XT(map.hotBox.z0)}
              y={YT(map.hotBox.a0)}
              width={XT(map.hotBox.z1) - XT(map.hotBox.z0)}
              height={YT(map.hotBox.a1) - YT(map.hotBox.a0)}
              className="thm-hotbox"
            />
          )}
          {spots.map((s) =>
            spotRects(s).map((r, n) => (
              <rect key={`${s.id}-${n}`} {...r} rx={3} className={`thm-spot ${selSpot === s.id ? "is-selected" : ""}`} data-tone={s.tone} />
            )),
          )}
          <line x1={sx} x2={sx} y1={HY0} y2={HY0 + HH} className="thm-sel-line" />
        </g>
        {spots.map((s) => {
          const r = spotRects(s)[0];
          return (
            <g key={`${s.id}-n`} className="thm-spot-no" data-tone={s.tone}>
              <circle cx={r.x} cy={r.y} r={7} />
              <text x={r.x} y={r.y + 3.5} textAnchor="middle">
                {s.rank}
              </text>
            </g>
          );
        })}

        {handheld?.map((p) => {
          const hx = XT(p.m);
          const hy = YT((((p.angle % 360) + 360) % 360) + SHELL_DA / 2);
          return (
            <g key={`hh-${p.m}-${p.angle}`} className="thm-hand" data-tone={p.gap !== null && Math.abs(p.gap) > 25 ? "warn" : undefined}>
              <title>{`Handheld ${p.m} m · ${p.angle}°: ${p.hand.toFixed(0)} °C · scanner ${p.scan === null ? "no view" : `${p.scan.toFixed(0)} °C`}${p.gap === null ? "" : ` · ${signed(p.gap)} K`}`}</title>
              <path d={`M${hx},${hy - 6}l6,6l-6,6l-6,-6z`} />
            </g>
          );
        })}

        <g className="thm-cross">
          <circle cx={mx} cy={my} r={9} />
          <line x1={mx - 15} x2={mx - 5} y1={my} y2={my} />
          <line x1={mx + 5} x2={mx + 15} y1={my} y2={my} />
          <line x1={mx} x2={mx} y1={my - 15} y2={my - 5} />
          <line x1={mx} x2={mx} y1={my + 5} y2={my + 15} />
        </g>
        <g>
          <rect x={flip ? mx - 104 : mx + 16} y={ry} width={88} height={20} rx={10} className="thm-readout-bg" />
          <text x={flip ? mx - 60 : mx + 60} y={ry + 14} textAnchor="middle" className="thm-readout">
            MAX {map.max.toFixed(0)} °C
          </text>
        </g>

        {Array.from({ length: SHELL_LEN / 2 + 1 }, (_, n) => n * 2).map((z) => (
          <g key={z}>
            <line x1={XT(z)} x2={XT(z)} y1={HY0 + HH + 2} y2={HY0 + HH + (z % 10 === 0 ? 8 : 4)} className="thm-axis" />
            {z % 10 === 0 && (
              <text x={XT(z)} y={HY0 + HH + 22} textAnchor="middle" className="thm-tick">
                {z} m
              </text>
            )}
          </g>
        ))}
        <text x={PX0} y={HY0 + HH + 36} className="thm-tick">
          ‹ feed end
        </text>
        <text x={PX0 + PWD} y={HY0 + HH + 36} textAnchor="end" className="thm-tick">
          burner ›
        </text>
        {[0, 90, 180, 270, 360].map((a) => (
          <text key={a} x={PX0 - 8} y={YT(a) + 4} textAnchor="end" className="thm-tick">
            {a}°
          </text>
        ))}

        <rect
          x={PX0}
          y={HY0}
          width={PWD}
          height={HH}
          fill="transparent"
          className="thm-hit"
          tabIndex={0}
          role="slider"
          aria-label="Shell section: arrow keys move along the kiln, Enter or Space selects the hottest section"
          aria-valuemin={0}
          aria-valuemax={SHELL_LEN}
          aria-valuenow={Number((selI * SHELL_DZ).toFixed(1))}
          aria-valuetext={`${(selI * SHELL_DZ).toFixed(1)} m`}
          onPointerMove={onMove}
          onPointerLeave={() => setTip(null)}
          onClick={(e) => onSelect(cellAt(e).i)}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 10 : 1;
            if (e.key === "ArrowRight" || e.key === "ArrowUp") onSelect(Math.min(nz - 1, selI + step));
            else if (e.key === "ArrowLeft" || e.key === "ArrowDown") onSelect(Math.max(0, selI - step));
            else if (e.key === "Home") onSelect(0);
            else if (e.key === "End") onSelect(nz - 1);
            else if (e.key === "Enter" || e.key === " ") onSelect(map.maxI);
            else return;
            e.preventDefault();
          }}
        />
      </MachineSvg>
      {tip && (
        <div className="thm-tip" style={{ left: tip.x, top: tip.y }} role="status">
          <span className="thm-tip-where">
            {tip.where} · {tip.zone}
          </span>
          <span className="thm-tip-row">
            <strong>{tip.value}</strong>
            {tip.delta && <span>{tip.delta}</span>}
          </span>
          <span className="thm-tip-hint">Click to inspect this section</span>
        </div>
      )}
    </div>
  );
}

/** Side elevation of the kiln on the map's metre scale (machine-drawing kit). */
const KilnElevation = memo(function KilnElevation({ status, maxZ }: { status: Severity; maxZ: number }) {
  const top = SHELL_Y - SHELL_H / 2;
  const tyreH = SHELL_H + 14;
  return (
    <g aria-hidden="true">
      <line x1={10} x2={996} y1={GROUND} y2={GROUND} stroke={MX.fine} strokeWidth={MX.w} />

      {/* Feed-end housing */}
      <rect x={XT(0) - 38} y={SHELL_Y - 42} width={42} height={84} rx={6} {...PAINT.body} />
      <rect x={XT(0) - 30} y={SHELL_Y - 28} width={18} height={24} rx={3} {...PAINT.recess} />
      <rect x={XT(0) - 32} y={SHELL_Y + 42} width={30} height={GROUND - SHELL_Y - 42} {...PAINT.body} />

      {/* Shell */}
      <rect x={XT(0)} y={top} width={PWD} height={SHELL_H} rx={3} {...PAINT.cylinder} />
      <line x1={XT(0) + 4} x2={XT(SHELL_LEN) - 4} y1={top + 5} y2={top + 5} {...PAINT.hair} />

      {/* Girth gear and pinion */}
      <rect x={XT(SHELL_GIRTH) - 5} y={top - 12} width={10} height={SHELL_H + 24} rx={2} {...PAINT.body} />
      {Array.from({ length: 9 }, (_, n) => top - 8 + n * ((SHELL_H + 16) / 8)).map((y) => (
        <line key={y} x1={XT(SHELL_GIRTH) - 5} x2={XT(SHELL_GIRTH) + 5} y1={y} y2={y} {...PAINT.hair} />
      ))}
      <circle cx={XT(SHELL_GIRTH)} cy={SHELL_Y + SHELL_H / 2 + 19} r={7} {...PAINT.shaft} />
      <rect x={XT(SHELL_GIRTH) - 15} y={SHELL_Y + SHELL_H / 2 + 26} width={30} height={GROUND - SHELL_Y - SHELL_H / 2 - 26} rx={2} {...PAINT.body} />

      {/* Tyres on support rollers */}
      {SHELL_TYRES.map((t) => {
        const cx = XT(t.z + 0.25);
        const ry = SHELL_Y + tyreH / 2 + 6;
        return (
          <g key={t.label}>
            <rect x={XT(t.z - 0.25)} y={SHELL_Y - tyreH / 2} width={PX_PER_M} height={tyreH} rx={2} {...PAINT.shaft} />
            <circle cx={cx - 11} cy={ry} r={6.5} {...PAINT.shaft} />
            <circle cx={cx + 11} cy={ry} r={6.5} {...PAINT.shaft} />
            <rect x={cx - 25} y={ry + 5} width={50} height={GROUND - ry - 5} rx={3} {...PAINT.body} />
            <Bolt x={cx - 19} y={GROUND - 4} r={1.6} />
            <Bolt x={cx + 19} y={GROUND - 4} r={1.6} />
          </g>
        );
      })}

      {/* Burner hood */}
      <rect x={XT(SHELL_LEN) - 4} y={SHELL_Y - 50} width={34} height={100} rx={6} {...PAINT.body} />
      <rect x={XT(SHELL_LEN) + 4} y={SHELL_Y - 21} width={17} height={42} rx={3} {...PAINT.recess} />
      <rect x={XT(SHELL_LEN) + 6} y={SHELL_Y - 17} width={13} height={34} rx={2} fill={MX.heat} />
      <rect x={XT(SHELL_LEN) + 2} y={SHELL_Y + 50} width={24} height={GROUND - SHELL_Y - 50} {...PAINT.body} />

      {/* CAL-KLN-03 pad at the hottest section */}
      <MachinePad x={XT(maxZ)} y={SHELL_Y} status={status} scale={0.9} />
    </g>
  );
});

/* ------------------------------------------------------------------ */
/* Heat scale legend                                                   */
/* ------------------------------------------------------------------ */

export function HeatScale() {
  const W = 420;
  const X = (v: number) => ((v - HEAT_LO) / (HEAT_HI - HEAT_LO)) * W;
  const gradId = `thm-scale${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox={`-6 0 ${W + 34} 30`} className="thm-scale" role="img" aria-label={`Heat scale ${HEAT_LO} to ${HEAT_HI} °C; neutral up to the normal band, warning from ${SHELL_ALERT} °C, danger from ${SHELL_DANGER} °C`}>
      <defs>
        <linearGradient id={gradId}>
          {HEAT_STOPS.map((v) => (
            <stop key={v} offset={`${((v - HEAT_LO) / (HEAT_HI - HEAT_LO)) * 100}%`} style={{ stopColor: `var(--thm-heat-${v})` }} />
          ))}
        </linearGradient>
      </defs>
      <rect x={0} y={4} width={W} height={6} rx={3} fill={`url(#${gradId})`} />
      <rect x={X(SHELL_ALERT) - 1} y={0} width={2} height={14} rx={1} className="thm-limit" data-tone="warn" />
      <rect x={X(SHELL_DANGER) - 1} y={0} width={2} height={14} rx={1} className="thm-limit" data-tone="bad" />
      {[150, 250, 330].map((v) => (
        <text key={v} x={X(v)} y={26} textAnchor="middle" className="thm-tick">
          {v}
        </text>
      ))}
      <text x={X(SHELL_ALERT)} y={26} textAnchor="middle" className="thm-tick thm-tick-tone" data-tone="warn">
        {SHELL_ALERT}
      </text>
      <text x={X(SHELL_DANGER)} y={26} textAnchor="middle" className="thm-tick thm-tick-tone" data-tone="bad">
        {SHELL_DANGER}
      </text>
      <text x={W + 8} y={11} className="thm-tick">
        °C
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Axial profile                                                       */
/* ------------------------------------------------------------------ */

export function ProfileChart({ map, selI, spots, coldBand = COLD_BAND }: { map: ShellMap; selI: number; spots: HotSpot[]; coldBand?: { from: number; to: number } }) {
  const h = 268;
  const pt = 22;
  const pb = 30;
  const lo = 150;
  const hi = Math.max(500, Math.ceil((map.max + 20) / 50) * 50);
  const Y = (v: number) => pt + (h - pt - pb) * (1 - (v - lo) / (hi - lo));
  const path = (arr: Array<number | null>) => {
    let d = "";
    let pen = false;
    arr.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${XT(i * SHELL_DZ).toFixed(1)},${Y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const grid: number[] = [];
  for (let v = lo; v <= hi; v += 50) grid.push(v);
  const bottom = h - pb;
  const sx = XT(selI * SHELL_DZ);
  const selV = map.colMax[selI];

  return (
    <svg viewBox={`0 0 ${VB_W} ${h}`} className="thm-svg" role="img" aria-label="Shell temperature along the kiln: section maximum and mean against the reference model, with the alert and alarm limits">
      <rect x={PX0} y={Y(SHELL_DANGER)} width={PWD} height={Y(SHELL_ALERT) - Y(SHELL_DANGER)} className="thm-band" data-tone="warn" />
      <rect x={PX0} y={pt} width={PWD} height={Y(SHELL_DANGER) - pt} className="thm-band" data-tone="bad" />
      <rect x={XT(coldBand.from)} y={pt} width={XT(coldBand.to) - XT(coldBand.from)} height={bottom - pt} className="thm-coldband" />
      {grid.map((v) => (
        <g key={v}>
          <line x1={PX0} x2={PX0 + PWD} y1={Y(v)} y2={Y(v)} className="thm-grid" />
          <text x={PX0 - 8} y={Y(v) + 4} textAnchor="end" className="thm-tick">
            {v}
          </text>
        </g>
      ))}
      <line x1={PX0} x2={PX0 + PWD} y1={Y(SHELL_ALERT)} y2={Y(SHELL_ALERT)} className="thm-limit-line" data-tone="warn" />
      <line x1={PX0} x2={PX0 + PWD} y1={Y(SHELL_DANGER)} y2={Y(SHELL_DANGER)} className="thm-limit-line" data-tone="bad" />
      {SHELL_ZONES.slice(1).map((zn) => (
        <line key={zn.name} x1={XT(zn.from)} x2={XT(zn.from)} y1={pt} y2={bottom} className="thm-zone-line" />
      ))}
      {SHELL_TYRES.map((t) => (
        <line key={t.label} x1={XT(t.z + 0.25)} x2={XT(t.z + 0.25)} y1={pt} y2={bottom} className="thm-ref" />
      ))}
      <line x1={PX0} x2={PX0 + PWD} y1={bottom} y2={bottom} className="thm-axis" />
      {Array.from({ length: 8 }, (_, n) => n * 10)
        .filter((z) => z <= SHELL_LEN)
        .map((z) => (
          <text key={z} x={XT(z)} y={h - 10} textAnchor="middle" className="thm-tick">
            {z} m
          </text>
        ))}
      <text x={PX0 - 8} y={10} textAnchor="end" className="thm-tick">
        °C
      </text>
      <path d={path(map.model)} className="thm-line-model" />
      <path d={path(map.colMean)} className="thm-line-mean" />
      <path d={path(map.colMax)} className="thm-line-max" />
      {spots.map((s) => (
        <circle key={s.id} cx={XT(s.peakZ)} cy={Y(s.peak)} r={3.5} className="thm-end" data-tone={s.tone} />
      ))}
      <line x1={sx} x2={sx} y1={pt} y2={bottom} className="thm-sel-line" />
      {selV != null && <circle cx={sx} cy={Y(selV)} r={4.5} className="thm-sel-dot" />}
      <circle cx={XT(map.maxZ)} cy={Y(map.max)} r={4.5} className="thm-end" data-tone={tempTone(map.max)} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Circumferential plot of one section                                 */
/* ------------------------------------------------------------------ */

export function PolarChart({ map, i }: { map: ShellMap; i: number }) {
  const c = 150;
  const R = (v: number) => 18 + Math.max(0, Math.min(1, (v - HEAT_LO) / (HEAT_HI - HEAT_LO))) * 110;
  const pts: string[] = [];
  const model: string[] = [];
  const rm = R(map.model[i]);
  for (let k = 0; k < SHELL_NA; k++) {
    const th = ((k * SHELL_DA + SHELL_DA / 2) / 180) * Math.PI;
    model.push(`${(c + rm * Math.sin(th)).toFixed(1)},${(c - rm * Math.cos(th)).toFixed(1)}`);
    const j = i * SHELL_NA + k;
    if (map.mask[j]) continue;
    const r = R(map.temp[j]);
    pts.push(`${(c + r * Math.sin(th)).toFixed(1)},${(c - r * Math.cos(th)).toFixed(1)}`);
  }
  const top = map.colMax[i];
  return (
    <svg viewBox="-12 -12 324 324" className="thm-polar" role="img" aria-label={`Temperature around the shell at ${(i * SHELL_DZ).toFixed(1)} m against the model, alert and alarm`}>
      {[200, 300].map((v) => (
        <g key={v}>
          <circle cx={c} cy={c} r={R(v)} className="thm-grid thm-ring" />
          <text x={c + 4} y={c - R(v) - 3} className="thm-tick">
            {v}
          </text>
        </g>
      ))}
      <circle cx={c} cy={c} r={R(SHELL_ALERT)} className="thm-ring-limit" data-tone="warn" />
      <circle cx={c} cy={c} r={R(SHELL_DANGER)} className="thm-ring-limit" data-tone="bad" />
      <line x1={c} x2={c} y1={c - 132} y2={c + 132} className="thm-grid" />
      <line x1={c - 132} x2={c + 132} y1={c} y2={c} className="thm-grid" />
      {[0, 90, 180, 270].map((a) => {
        const th = (a / 180) * Math.PI;
        return (
          <text key={a} x={c + 146 * Math.sin(th)} y={c - 146 * Math.cos(th) + 4} textAnchor="middle" className="thm-tick">
            {a}°
          </text>
        );
      })}
      <polygon points={model.join(" ")} className="thm-polar-model" />
      {pts.length > 2 ? (
        <polygon points={pts.join(" ")} className="thm-polar-shape" data-tone={top == null ? undefined : tempTone(top)} />
      ) : (
        <text x={c} y={c + 4} textAnchor="middle" className="thm-tick">
          No scanner view
        </text>
      )}
    </svg>
  );
}
