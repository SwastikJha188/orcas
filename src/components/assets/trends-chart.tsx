"use client";

/**
 * Trends page charts (prefix pg-trends-). Historian-style SVG time series:
 * reference model with ±3σ band (D5 §9.4), warning / alarm zones (D5 Table
 * 9.3), excursion capsules, event markers and a crosshair synced through a
 * tiny external store, so moving the pointer re-renders only the hover layers,
 * never the memoised paths.
 */

import React, { memo, useCallback, useContext, useId, useMemo, useSyncExternalStore } from "react";
import {
  TrendTimeZoneContext,
  fmtStamp,
  fmtTick,
  nearestIndex,
  niceStep,
  stepDecimals,
  timeTicks,
  useElementWidth,
  type TrendSample,
} from "./sensor-trend-graph";
import { MODEL_K, fmt, fmtSigned, limitBands, limitLines, type Limits, type QualitySpan, type Tone } from "./trends-model";

/** Neutral greying for spans the engine marked Suspect / Invalid (semantic tokens only). */
const DQ_SHADE: Record<QualitySpan["quality"], React.CSSProperties> = {
  Suspect: { fill: "color-mix(in srgb, var(--text-muted) 10%, transparent)" },
  Invalid: { fill: "color-mix(in srgb, var(--text-muted) 18%, transparent)" },
};
const DQ_LINE: React.CSSProperties = { stroke: "var(--text-muted)", strokeDasharray: "3 3" };

/* ==========================================================================
   Synced crosshair
   ========================================================================== */

export interface Crosshair {
  get: () => number | null;
  set: (t: number | null) => void;
  subscribe: (cb: () => void) => () => void;
}

export function createCrosshair(): Crosshair {
  let t: number | null = null;
  const ls = new Set<() => void>();
  return {
    get: () => t,
    set: (v) => {
      if (v === t) return;
      t = v;
      ls.forEach((l) => l());
    },
    subscribe: (cb) => {
      ls.add(cb);
      return () => {
        ls.delete(cb);
      };
    },
  };
}

const NULL_STORE: Crosshair = { get: () => null, set: () => {}, subscribe: () => () => {} };
const serverNull = () => null;

export function useCrosshair(store: Crosshair | undefined): number | null {
  const s = store ?? NULL_STORE;
  return useSyncExternalStore(s.subscribe, s.get, serverNull);
}

/* ==========================================================================
   Shared geometry helpers
   ========================================================================== */

type Variant = "focus" | "strip" | "spark";

const PAD: Record<Variant, { l: number; r: number; t: number; b: number; yTicks: number; xTicks: number }> = {
  focus: { l: 56, r: 96, t: 22, b: 26, yTicks: 5, xTicks: 7 },
  strip: { l: 56, r: 96, t: 20, b: 20, yTicks: 2, xTicks: 7 },
  spark: { l: 2, r: 2, t: 3, b: 3, yTicks: 0, xTicks: 0 },
};

/** Time labels (HH:MM:SS at 11 px ≈ 52 px) need ~70 px each: fewer ticks on narrow plots. */
const X_TICK_PX = 70;
function xTickTarget(plotW: number, max: number): number {
  return Math.max(2, Math.min(max, Math.floor(plotW / X_TICK_PX)));
}

function valueDomain(lo: number, hi: number, ticks: number): { lo: number; hi: number; step: number } {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { lo: 0, hi: 1, step: 0.25 };
  const span = Math.max(hi - lo, Math.abs(hi) * 0.02, 1e-3);
  lo -= span * 0.1;
  hi += span * 0.1;
  const step = niceStep(hi - lo, Math.max(2, ticks));
  return { lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step, step };
}

function pathOf(samples: TrendSample[], x: (t: number) => number, y: (v: number) => number, pick: (s: TrendSample) => number | undefined): string {
  let d = "";
  let pen = false;
  for (const s of samples) {
    const v = pick(s);
    if (v === undefined || !Number.isFinite(v)) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${x(s.t).toFixed(1)} ${y(v).toFixed(1)}`;
    pen = true;
  }
  return d;
}

/* ==========================================================================
   SignalChart — one signal: measured, reference ±3σ, limits, capsules, events
   ========================================================================== */

export interface ChartCapsule {
  start: number;
  end: number;
  tone: "warn" | "bad" | "idle";
  label: string;
}

export interface ChartMarker {
  t: number;
  tone: Tone;
  label: string;
}

export interface SignalChartProps {
  samples: TrendSample[];
  domain: [number, number];
  unit: string;
  decimals: number;
  limits?: Limits;
  /** Model σ: draws the reference ±3σ band around `b`. */
  sigma?: number | null;
  capsules?: ChartCapsule[];
  markers?: ChartMarker[];
  variant?: Variant;
  height?: number;
  /** "data": fit the data (off-scale limits are labelled); "limits": include every limit. */
  scale?: "data" | "limits";
  crosshair?: Crosshair;
  ariaLabel: string;
  /** Spark only: hide the reference line. */
  showModel?: boolean;
  /** Direct label drawn inside the plot (stacked strips). */
  label?: string;
  /** Draw the limit zones neutral (residual ±3σ band is a model band, not an alarm). */
  quiet?: boolean;
  /** Provenance of the limit lines (pyro line: demo limit, not plant-approved), shown on hover. */
  limitNote?: string;
  /** Spans the engine marked Suspect / Invalid: greyed out, the measured line dashed in muted ink. */
  quality?: QualitySpan[];
}

export const SignalChart = memo(function SignalChart({
  samples,
  domain,
  unit,
  decimals,
  limits,
  sigma,
  capsules,
  markers,
  variant = "focus",
  height = variant === "focus" ? 300 : variant === "strip" ? 96 : 56,
  scale = "data",
  crosshair,
  ariaLabel,
  showModel = true,
  label,
  quiet = false,
  limitNote,
  quality,
}: SignalChartProps) {
  const timeZone = useContext(TrendTimeZoneContext);
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const clip = `pgt-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const P = PAD[variant];
  const axes = variant !== "spark";

  const geo = useMemo(() => {
    if (width <= 0 || samples.length < 2) return null;
    const plotW = Math.max(10, width - P.l - P.r);
    const plotH = Math.max(10, height - P.t - P.b);
    const t0 = domain[0];
    const t1 = Math.max(domain[1], samples[samples.length - 1].t);
    const k = sigma ? MODEL_K * sigma : 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of samples) {
      if (s.t < t0) continue;
      lo = Math.min(lo, s.v);
      hi = Math.max(hi, s.v);
      if (showModel && s.b !== undefined) {
        lo = Math.min(lo, s.b - k);
        hi = Math.max(hi, s.b + k);
      }
    }
    const lines = limitLines(limits);
    const span0 = Math.max(hi - lo, 1e-6);
    for (const l of lines) {
      // Fit mode keeps limits that sit close to the data; far ones are labelled off-scale.
      if (scale === "limits" || (l.v >= lo - span0 * 0.35 && l.v <= hi + span0 * 0.35)) {
        lo = Math.min(lo, l.v);
        hi = Math.max(hi, l.v);
      }
    }
    const dom = valueDomain(lo, hi, P.yTicks || 3);
    const x = (t: number) => P.l + ((t - t0) / Math.max(1, t1 - t0)) * plotW;
    const y = (v: number) => P.t + plotH - ((Math.max(dom.lo, Math.min(dom.hi, v)) - dom.lo) / (dom.hi - dom.lo)) * plotH;

    const line = pathOf(samples, x, y, (s) => s.v);
    const model = showModel ? pathOf(samples, x, y, (s) => s.b) : "";
    let band = "";
    if (showModel && k > 0) {
      const withB = samples.filter((s) => s.b !== undefined);
      if (withB.length > 1) {
        band =
          withB.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)} ${y(s.b! + k).toFixed(1)}`).join("") +
          withB
            .slice()
            .reverse()
            .map((s) => `L${x(s.t).toFixed(1)} ${y(s.b! - k).toFixed(1)}`)
            .join("") +
          "Z";
      }
    }
    const bands = limitBands(limits, dom.lo, dom.hi)
      .map(([a, b, tone]) => ({ y1: y(Math.max(a, b)), y2: y(Math.min(a, b)), tone }))
      .filter((b) => b.y2 - b.y1 > 0.5);
    const shown = lines.filter((l) => l.v >= dom.lo && l.v <= dom.hi);
    const offscale = lines.filter((l) => l.v > dom.hi || l.v < dom.lo);
    const yTicks: number[] = [];
    if (P.yTicks) for (let v = dom.lo; v <= dom.hi + dom.step * 0.5; v += dom.step) yTicks.push(+v.toFixed(6));
    const xt = axes ? timeTicks(t0, t1, xTickTarget(plotW, variant === "focus" ? P.xTicks : 6), timeZone) : { ticks: [], step: 0 };
    return { plotW, plotH, x, y, line, model, band, bands, shown, offscale, yTicks, yDec: stepDecimals(dom.step), xt, dom, t0, t1 };
  }, [width, height, samples, domain, limits, sigma, scale, showModel, P, axes, variant, timeZone]);

  const last = samples[samples.length - 1];

  // Validity spans in plot coordinates (clipped to the plot).
  const dq = useMemo(() => {
    if (!geo || !quality?.length) return [];
    return quality
      .map((q) => ({
        quality: q.quality,
        x1: Math.max(P.l, geo.x(q.start)),
        x2: Math.min(P.l + geo.plotW, geo.x(q.end)),
        label: `${fmtStamp(q.start, timeZone)} – ${fmtStamp(q.end, timeZone)}`,
      }))
      .filter((d) => d.x2 - d.x1 >= 0.5);
  }, [geo, quality, P, timeZone]);

  // Right-gutter labels: current value first, then limits that do not collide.
  const gutter = useMemo(() => {
    if (!geo || !axes || !last) return [];
    const ry = geo.y(last.v);
    const out: Array<{ y: number; text: string; tone: "warn" | "bad" | "idle" }> = [];
    const add = (v: number, text: string, tone: "warn" | "bad" | "idle") => {
      const y = geo.y(v);
      if (Math.abs(y - ry) < 14 || out.some((o) => Math.abs(o.y - y) < 12)) return;
      out.push({ y, text, tone });
    };
    for (const l of geo.shown) add(l.v, quiet ? `${fmtSigned(l.v, 0)}${unit}` : `${l.tone === "bad" ? "A" : "W"} ${fmt(l.v, decimals)}`, l.tone);
    if (showModel && last.b !== undefined && geo.model) add(last.b, `Ref ${fmt(last.b, decimals)}`, "idle");
    return out;
  }, [geo, axes, last, decimals, showModel, quiet, unit]);

  const onMove = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (!geo || !crosshair) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const frac = (e.clientX - rect.left) / Math.max(1, rect.width);
      crosshair.set(geo.t0 + frac * (geo.t1 - geo.t0));
    },
    [geo, crosshair]
  );
  const onLeave = useCallback(() => crosshair?.set(null), [crosshair]);

  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!crosshair || samples.length === 0) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const cur = crosshair.get();
        const i = cur === null ? samples.length - 1 : nearestIndex(samples, cur);
        const j = Math.max(0, Math.min(samples.length - 1, i + (e.key === "ArrowLeft" ? -1 : 1)));
        crosshair.set(samples[j].t);
      } else if (e.key === "Escape") crosshair.set(null);
    },
    [crosshair, samples]
  );

  const focus = variant === "focus";
  return (
    <div
      ref={wrapRef}
      className={`pg-trends-chart pg-trends-chart--${variant}${quiet ? " pg-trends-quiet" : ""}`}
      style={{ height }}
      tabIndex={focus ? 0 : undefined}
      onKeyDown={focus ? onKey : undefined}
      onBlur={focus ? onLeave : undefined}
      aria-label={focus ? `${ariaLabel}. Use the arrow keys to step through the readings.` : undefined}
    >
      {geo && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="pg-trends-svg">
          <defs>
            <clipPath id={clip}>
              <rect x={P.l} y={P.t - 2} width={geo.plotW} height={geo.plotH + 4} />
            </clipPath>
            {geo.bands.map((b, i) => (
              <clipPath key={i} id={`${clip}-z${i}`}>
                <rect x={P.l} y={b.y1} width={geo.plotW} height={b.y2 - b.y1} />
              </clipPath>
            ))}
            {dq.length > 0 && (
              <>
                <clipPath id={`${clip}-dq`}>
                  {dq.map((d, i) => (
                    <rect key={i} x={d.x1} y={P.t - 2} width={d.x2 - d.x1} height={geo.plotH + 4} />
                  ))}
                </clipPath>
                {/* luminance mask: hides the normal line where the data is not valid */}
                <mask id={`${clip}-dqm`} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
                  <rect x={0} y={0} width={width} height={height} fill="white" />
                  {dq.map((d, i) => (
                    <rect key={i} x={d.x1} y={P.t - 2} width={d.x2 - d.x1} height={geo.plotH + 4} fill="black" />
                  ))}
                </mask>
              </>
            )}
          </defs>

          {geo.bands.map((b, i) => (
            <rect key={i} className={`pg-trends-zone pg-trends-zone--${b.tone}`} x={P.l} y={b.y1} width={geo.plotW} height={b.y2 - b.y1} />
          ))}

          {/* data validity: suspect / invalid spans greyed out (the reading was held out of diagnosis) */}
          {dq.map((d, i) => (
            <rect key={`dq${i}`} style={DQ_SHADE[d.quality]} x={d.x1} y={P.t} width={d.x2 - d.x1} height={geo.plotH}>
              <title>{`Reading ${d.quality === "Invalid" ? "not usable" : "may be wrong"} · ${d.label}`}</title>
            </rect>
          ))}

          {/* excursion capsules: faint shading + a capsule bar above the plot */}
          {capsules?.map((c, i) => {
            const x1 = Math.max(P.l, geo.x(c.start));
            const x2 = Math.min(P.l + geo.plotW, geo.x(c.end));
            if (x2 - x1 < 0.5) return null;
            return (
              <g key={i} className={`pg-trends-cap pg-trends-cap--${c.tone}`}>
                <rect className="pg-trends-cap-shade" x={x1} y={P.t} width={x2 - x1} height={geo.plotH} />
                {axes && <rect className="pg-trends-cap-bar" x={x1} y={P.t - 8} width={Math.max(3, x2 - x1)} height={3} />}
                <title>{c.label}</title>
              </g>
            );
          })}

          {axes &&
            geo.yTicks.map((v) => {
              const y = geo.y(v);
              return (
                <g key={v}>
                  <line className="pg-trends-grid" x1={P.l} x2={P.l + geo.plotW} y1={y} y2={y} />
                  <text className="pg-trends-tick" x={P.l - 8} y={y} textAnchor="end" dominantBaseline="middle">
                    {fmt(v, geo.yDec)}
                  </text>
                </g>
              );
            })}
          {axes && (
            <>
              {variant === "focus" && (
                <text className="pg-trends-unit" x={P.l - 8} y={Math.max(9, P.t - 10)} textAnchor="end">
                  {unit}
                </text>
              )}
              <line className="pg-trends-axis" x1={P.l} x2={P.l + geo.plotW} y1={P.t + geo.plotH} y2={P.t + geo.plotH} />
              {geo.xt.ticks.map((t) => {
                const x = geo.x(t);
                if (x < P.l - 0.5 || x > P.l + geo.plotW + 0.5) return null;
                return (
                  <text key={t} className="pg-trends-tick" x={x} y={P.t + geo.plotH + 15} textAnchor="middle">
                    {fmtTick(t, geo.xt.step, timeZone)}
                  </text>
                );
              })}
            </>
          )}

          {geo.shown.map((l, i) => (
            <line key={i} className={`pg-trends-limit pg-trends-limit--${l.tone}`} x1={P.l} x2={P.l + geo.plotW} y1={geo.y(l.v)} y2={geo.y(l.v)} />
          ))}

          <g clipPath={`url(#${clip})`}>
            {geo.band && <path className="pg-trends-band" d={geo.band} />}
            {geo.model && <path className="pg-trends-model" d={geo.model} />}
            <g mask={dq.length ? `url(#${clip}-dqm)` : undefined}>
              <path className={`pg-trends-line pg-trends-line--${variant}`} d={geo.line} />
              {!quiet &&
                geo.bands.map((b, i) => (
                  <path key={i} className={`pg-trends-line pg-trends-line--${variant} pg-trends-line--${b.tone}`} d={geo.line} clipPath={`url(#${clip}-z${i})`} />
                ))}
            </g>
            {dq.length > 0 && <path className={`pg-trends-line pg-trends-line--${variant}`} style={DQ_LINE} d={geo.line} clipPath={`url(#${clip}-dq)`} />}
          </g>
          {last && <circle className="pg-trends-end" cx={geo.x(last.t)} cy={geo.y(last.v)} r={variant === "spark" ? 2.5 : 3.5} />}

          {focus &&
            markers?.map((m, i) => {
              const x = geo.x(m.t);
              if (x < P.l || x > P.l + geo.plotW) return null;
              return (
                <g key={i} className="pg-trends-marker" data-tone={m.tone}>
                  <line className="pg-trends-marker-rule" x1={x} x2={x} y1={P.t} y2={P.t + geo.plotH} />
                  <path className="pg-trends-marker-tick" d={`M${x - 4} ${P.t + geo.plotH + 1}h8l-4 -6z`} />
                  <title>{m.label}</title>
                </g>
              );
            })}

          {/* right gutter: limit values + live readout; off-scale limits named */}
          {axes &&
            gutter.map((g, i) => (
              <g key={i} className="pg-trends-gutter" data-tone={g.tone}>
                <line className="pg-trends-gutter-key" x1={P.l + geo.plotW + 6} x2={P.l + geo.plotW + 12} y1={g.y} y2={g.y} />
                <text className="pg-trends-tick" x={P.l + geo.plotW + 15} y={g.y} dominantBaseline="middle">
                  {g.text}
                </text>
                {limitNote && g.tone !== "idle" && <title>{limitNote}</title>}
              </g>
            ))}
          {axes && geo.offscale.length > 0 && (
            <text className="pg-trends-offscale" x={P.l + geo.plotW + 6} y={geo.offscale.some((l) => l.v > geo.dom.hi) ? P.t + 16 : P.t + geo.plotH - 2}>
              {geo.offscale.some((l) => l.v > geo.dom.hi) ? "▲ " : "▼ "}
              {geo.offscale[0].tone === "bad" ? "A" : "W"} {fmt(geo.offscale[0].v, decimals)}
              {limitNote && <title>{limitNote}</title>}
            </text>
          )}
          {axes && last && (
            <g>
              <line className="pg-trends-readout-key" x1={P.l + geo.plotW + 6} x2={P.l + geo.plotW + 12} y1={geo.y(last.v)} y2={geo.y(last.v)} />
              <text className="pg-trends-readout" x={P.l + geo.plotW + 15} y={geo.y(last.v)} dominantBaseline="central">
                {fmt(last.v, decimals)}
              </text>
            </g>
          )}

          {label && (
            <text className="pg-trends-direct" x={P.l} y={P.t - 8}>
              {label} · {unit === "σ" ? "× usual spread" : unit}
            </text>
          )}
          <HoverLayer store={crosshair} samples={samples} geo={geo} top={P.t} variant={variant} />
          {crosshair && (
            <rect x={P.l} y={0} width={geo.plotW} height={height} fill="transparent" onPointerMove={onMove} onPointerLeave={onLeave} />
          )}
        </svg>
      )}
      {focus && geo && <FocusTip store={crosshair} samples={samples} geo={geo} width={width} top={P.t} unit={unit} decimals={decimals} sigma={sigma} timeZone={timeZone} />}
    </div>
  );
});

interface HoverGeo {
  x: (t: number) => number;
  y: (v: number) => number;
  plotH: number;
  t0: number;
  t1: number;
}

function HoverLayer({
  store,
  samples,
  geo,
  top,
  variant,
}: {
  store?: Crosshair;
  samples: TrendSample[];
  geo: HoverGeo;
  top: number;
  variant: Variant;
}) {
  const t = useCrosshair(store);
  if (t === null || t < geo.t0 || t > geo.t1 || samples.length === 0) return null;
  const s = samples[nearestIndex(samples, t)];
  const x = geo.x(s.t);
  return (
    <g pointerEvents="none">
      <line className="pg-trends-cross" x1={x} x2={x} y1={top} y2={top + geo.plotH} />
      {variant !== "spark" && s.b !== undefined && <circle className="pg-trends-cross-model" cx={x} cy={geo.y(s.b)} r={3} />}
      <circle className="pg-trends-end" cx={x} cy={geo.y(s.v)} r={variant === "spark" ? 2.5 : 4} />
    </g>
  );
}

function FocusTip({
  store,
  samples,
  geo,
  width,
  top,
  unit,
  decimals,
  sigma,
  timeZone,
}: {
  store?: Crosshair;
  samples: TrendSample[];
  geo: HoverGeo;
  width: number;
  top: number;
  unit: string;
  decimals: number;
  sigma?: number | null;
  timeZone?: string;
}) {
  const t = useCrosshair(store);
  if (t === null || t < geo.t0 || t > geo.t1 || samples.length === 0) return <span className="pg-trends-sr" aria-live="polite" />;
  const s = samples[nearestIndex(samples, t)];
  const px = geo.x(s.t);
  const flip = px > width - 200;
  const d = s.b !== undefined ? s.v - s.b : null;
  return (
    <>
      <div className="pg-trends-tip" style={{ left: flip ? undefined : px + 12, right: flip ? width - px + 12 : undefined, top: top + 4 }} aria-hidden="true">
        <span className="pg-trends-tip-time">{fmtStamp(s.t, timeZone)}</span>
        <span className="pg-trends-tip-row">
          <i className="pg-trends-key pg-trends-key--line" />
          Measured
          <strong>
            {fmt(s.v, decimals)} <span className="ast-unit">{unit}</span>
          </strong>
        </span>
        {s.b !== undefined && (
          <span className="pg-trends-tip-row">
            <i className="pg-trends-key pg-trends-key--model" />
            Expected
            <span className="pg-trends-tip-v">{fmt(s.b, decimals)}</span>
          </span>
        )}
        {d !== null && (
          <span className="pg-trends-tip-row pg-trends-tip-sub">
            Difference
            <span className="pg-trends-tip-v">
              {fmtSigned(d, decimals)}
              {sigma ? ` · ${fmt(Math.abs(d / sigma), 1)} × usual spread` : ""}
            </span>
          </span>
        )}
      </div>
      <span className="pg-trends-sr" aria-live="polite">
        {`${fmtStamp(s.t, timeZone)}: ${fmt(s.v, decimals)} ${unit}`}
      </span>
    </>
  );
}

/* ==========================================================================
   ResidualChart — measured − reference in σ, with the ±3σ model band
   ========================================================================== */

export const ResidualChart = memo(function ResidualChart({
  samples,
  domain,
  sigma,
  crosshair,
  height = 104,
}: {
  samples: TrendSample[];
  domain: [number, number];
  sigma: number;
  crosshair?: Crosshair;
  height?: number;
}) {
  const z = useMemo(
    () => samples.filter((s) => s.b !== undefined).map((s) => ({ t: s.t, v: (s.v - s.b!) / sigma })),
    [samples, sigma]
  );
  const zLimits = useMemo<Limits>(() => ({ warnHi: MODEL_K, warnLo: -MODEL_K }), []);
  if (z.length < 2) return null;
  return (
    <SignalChart
      samples={z}
      domain={domain}
      unit="σ"
      decimals={1}
      limits={zLimits}
      variant="strip"
      height={height}
      scale="limits"
      crosshair={crosshair}
      label="Difference from expected"
      quiet
      ariaLabel={`Difference between the reading and the expected value, in multiples of its usual spread, with a band of ${MODEL_K} times the usual spread either way`}
    />
  );
});

/* ==========================================================================
   OverlayChart — 2–4 signals normalised on one axis
   ========================================================================== */

export interface OverlaySeries {
  id: string;
  label: string;
  unit: string;
  decimals: number;
  samples: TrendSample[];
  /** Raw value → plotted value (z-score or % of range). */
  norm: (v: number) => number;
}

export const OVERLAY_STYLES = 4;

export const OverlayChart = memo(function OverlayChart({
  series,
  domain,
  axisUnit,
  crosshair,
  height = 280,
  ariaLabel,
}: {
  series: OverlaySeries[];
  domain: [number, number];
  axisUnit: string;
  crosshair: Crosshair;
  height?: number;
  ariaLabel: string;
}) {
  const timeZone = useContext(TrendTimeZoneContext);
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const P = { l: 56, r: 96, t: 22, b: 26 };

  const geo = useMemo(() => {
    if (width <= 0) return null;
    const plotW = Math.max(10, width - P.l - P.r);
    const plotH = Math.max(10, height - P.t - P.b);
    const t0 = domain[0];
    const t1 = domain[1];
    let lo = Infinity;
    let hi = -Infinity;
    const normed = series.map((s) => s.samples.filter((p) => p.t >= t0).map((p) => ({ t: p.t, v: s.norm(p.v) })));
    for (const n of normed) {
      for (const p of n) {
        if (!Number.isFinite(p.v)) continue;
        lo = Math.min(lo, p.v);
        hi = Math.max(hi, p.v);
      }
    }
    const dom = valueDomain(lo, hi, 4);
    const x = (t: number) => P.l + ((t - t0) / Math.max(1, t1 - t0)) * plotW;
    const y = (v: number) => P.t + plotH - ((Math.max(dom.lo, Math.min(dom.hi, v)) - dom.lo) / (dom.hi - dom.lo)) * plotH;
    const paths = normed.map((n) => pathOf(n, x, y, (p) => p.v));
    // Direct labels at each line's end, nudged apart so they never overlap.
    const ends = normed
      .map((n, i) => ({ i, y: n.length ? y(n[n.length - 1].v) : NaN }))
      .filter((e) => Number.isFinite(e.y))
      .sort((a, b) => a.y - b.y);
    for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 12) ends[k].y = ends[k - 1].y + 12;
    const yTicks: number[] = [];
    for (let v = dom.lo; v <= dom.hi + dom.step * 0.5; v += dom.step) yTicks.push(+v.toFixed(6));
    return { plotW, plotH, x, y, paths, ends, yTicks, yDec: stepDecimals(dom.step), xt: timeTicks(t0, t1, xTickTarget(plotW, 7), timeZone), t0, t1, dom };
  }, [width, height, series, domain, timeZone, P.l, P.r, P.t, P.b]);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    crosshair.set(geo.t0 + ((e.clientX - rect.left) / Math.max(1, rect.width)) * (geo.t1 - geo.t0));
  };

  return (
    <div ref={wrapRef} className="pg-trends-chart pg-trends-chart--overlay" style={{ height }}>
      {geo && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="pg-trends-svg">
          {geo.yTicks.map((v) => (
            <g key={v}>
              <line className={`pg-trends-grid ${v === 0 && axisUnit === "σ" ? "is-zero" : ""}`} x1={P.l} x2={P.l + geo.plotW} y1={geo.y(v)} y2={geo.y(v)} />
              <text className="pg-trends-tick" x={P.l - 8} y={geo.y(v)} textAnchor="end" dominantBaseline="middle">
                {fmt(v, geo.yDec)}
              </text>
            </g>
          ))}
          <text className="pg-trends-unit" x={P.l - 8} y={8} textAnchor="end">
            {axisUnit === "σ" ? "× spread" : axisUnit}
          </text>
          <line className="pg-trends-axis" x1={P.l} x2={P.l + geo.plotW} y1={P.t + geo.plotH} y2={P.t + geo.plotH} />
          {geo.xt.ticks.map((t) => {
            const x = geo.x(t);
            if (x < P.l - 0.5 || x > P.l + geo.plotW + 0.5) return null;
            return (
              <text key={t} className="pg-trends-tick" x={x} y={P.t + geo.plotH + 15} textAnchor="middle">
                {fmtTick(t, geo.xt.step, timeZone)}
              </text>
            );
          })}
          {geo.paths.map((d, i) => (
            <path key={series[i].id} className={`pg-trends-ov pg-trends-ov--${i % OVERLAY_STYLES}`} d={d} />
          ))}
          {geo.ends.map((e) => (
            <text key={series[e.i].id} className="pg-trends-direct" x={P.l + geo.plotW + 8} y={e.y} dominantBaseline="middle">
              {series[e.i].label}
            </text>
          ))}
          <OverlayHover store={crosshair} series={series} geo={geo} top={P.t} />
          <rect x={P.l} y={0} width={geo.plotW} height={height} fill="transparent" onPointerMove={onMove} onPointerLeave={() => crosshair.set(null)} />
        </svg>
      )}
    </div>
  );
});

function OverlayHover({ store, series, geo, top }: { store: Crosshair; series: OverlaySeries[]; geo: HoverGeo; top: number }) {
  const t = useCrosshair(store);
  if (t === null || t < geo.t0 || t > geo.t1) return null;
  const x = geo.x(t);
  return (
    <g pointerEvents="none">
      <line className="pg-trends-cross" x1={x} x2={x} y1={top} y2={top + geo.plotH} />
      {series.map((s, i) => {
        if (!s.samples.length) return null;
        const p = s.samples[nearestIndex(s.samples, t)];
        return <circle key={s.id} className={`pg-trends-ov-dot pg-trends-ov--${i % OVERLAY_STYLES}`} cx={geo.x(p.t)} cy={geo.y(s.norm(p.v))} r={3.5} />;
      })}
    </g>
  );
}

/** Raw value of each overlay series at the crosshair (or the latest sample). */
export function useOverlayReadout(store: Crosshair, series: OverlaySeries[]): { t: number | null; values: Array<number | null> } {
  const t = useCrosshair(store);
  return {
    t,
    values: series.map((s) => {
      if (!s.samples.length) return null;
      return t === null ? s.samples[s.samples.length - 1].v : s.samples[nearestIndex(s.samples, t)].v;
    }),
  };
}

/* ==========================================================================
   StateStrip — on/off timeline of one state signal
   ========================================================================== */

export const StateStrip = memo(function StateStrip({
  points,
  domain,
  offTone,
  crosshair,
  label,
}: {
  points: Array<{ t: number; ok: boolean }>;
  domain: [number, number];
  offTone: "warn" | "bad";
  crosshair?: Crosshair;
  label: string;
}) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const segs = useMemo(() => {
    if (width <= 0 || points.length === 0) return [];
    const [t0, t1] = domain;
    const x = (t: number) => ((t - t0) / Math.max(1, t1 - t0)) * width;
    const step = points.length > 1 ? (points[points.length - 1].t - points[0].t) / (points.length - 1) : 0;
    const out: Array<{ x: number; w: number; ok: boolean; from: number; to: number }> = [];
    let a = 0;
    for (let i = 1; i <= points.length; i++) {
      if (i === points.length || points[i].ok !== points[a].ok) {
        const from = points[a].t;
        const to = i < points.length ? points[i].t : points[i - 1].t + step;
        const x1 = Math.max(0, x(from));
        const x2 = Math.min(width, x(to));
        if (x2 > x1) out.push({ x: x1, w: x2 - x1, ok: points[a].ok, from, to });
        a = i;
      }
    }
    return out;
  }, [points, domain, width]);
  const t = useCrosshair(crosshair);
  const cx = t !== null && width > 0 ? ((t - domain[0]) / Math.max(1, domain[1] - domain[0])) * width : null;
  return (
    <div ref={wrapRef} className="pg-trends-strip">
      {width > 0 && (
        <svg width={width} height={14} role="img" aria-label={label}>
          <rect className="pg-trends-strip-track" x={0} y={3} width={width} height={8} rx={4} />
          {segs.map((s, i) => (
            <rect key={i} className={`pg-trends-strip-seg ${s.ok ? "is-ok" : `is-off pg-trends-tone--${offTone}`}`} x={s.x} y={3} width={Math.max(1.5, s.w)} height={8} rx={s.ok ? 0 : 2} />
          ))}
          {cx !== null && cx >= 0 && cx <= width && <line className="pg-trends-cross" x1={cx} x2={cx} y1={0} y2={14} />}
        </svg>
      )}
    </div>
  );
});
