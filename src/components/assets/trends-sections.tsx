"use client";

/**
 * Trends page sections (prefix pg-trends-). Historian layout: charts in a
 * section card (Signal, Compare), signals and excursions as tile grids in a
 * bare section (one card per item), logs and timelines as tables (Events,
 * States). Monochrome unless a value is in warning / alarm. Sections with no
 * data for the machine are not rendered.
 */

import React, { memo, useMemo, useState } from "react";
import { StatusTag } from "@/components/ui/status-tag";
import { rowActivate } from "@/components/ui/row-activate";
import { PillButton, PillNav, Tile, TileGrid, type TileFact } from "@/components/ui";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import type { PlantDefs } from "@/lib/plant-defs";
import { formatLocalTime } from "@/lib/time";
import type { AssetMachine } from "./assets-data";
import type { AssetsSubPage } from "./assets-view";
import type { TrendSample } from "./sensor-trend-graph";
import { PYRO_DEMO_LIMIT } from "./sensors-model";
import { Chevron, ItemCell, KpiStrip, Section, WhyDisclosure, type KpiItem } from "./analysis/an-ui";
import {
  OVERLAY_STYLES,
  OverlayChart,
  ResidualChart,
  SignalChart,
  StateStrip,
  useOverlayReadout,
  type ChartCapsule,
  type ChartMarker,
  type Crosshair,
  type OverlaySeries,
} from "./trends-chart";

import {
  CLASS_LABEL,
  EVENT_CAT_LABEL,
  MODEL_K,
  SEVERITY_TONE,
  TREND_GROUP,
  ZONE_LABEL,
  ZONE_TONE,
  channelZone,
  comparePresets,
  dayLabel,
  downsample,
  fmt,
  fmtSigned,
  fmtSpan,
  hasHistory,
  qualitySpans,
  referenceEquation,
  stateSeries,
  worst,
  zoneOf,
  type Channel,
  type EventCat,
  type Excursion,
  type ExcursionKind,
  type LogEvent,
  type SignalClass,
  type StateChannel,
  type Tone,
  type WindowStats,
  type Zone,
} from "./trends-model";

export const SECTION = {
  explorer: "trends-signal",
  overlay: "trends-compare",
  signals: "trends-signals",
  excursions: "trends-excursions",
  events: "trends-events",
  states: "trends-states",
} as const;

/** Everything a section needs, computed once per tick by the page. */
export interface TrendsCtx {
  machine: AssetMachine;
  frame: SimFrame | null;
  /** Plant definitions of the machine (`frame.defs`, or `defsFor(machine.id)` without a frame); null without a live engine. */
  defs: PlantDefs | null;
  /** True on a live machine (kiln-seal fleet or pyro line): values are simulated against the engine's reference model. */
  live: boolean;
  now: number;
  span: number;
  domain: [number, number];
  winLabel: string;
  timeZone: string | undefined;
  channels: Channel[];
  byId: Map<string, Channel>;
  states: StateChannel[];
  groupName: (g: string) => string;
  series: Map<string, TrendSample[]>;
  stats: Map<string, WindowStats | null>;
  excursions: Excursion[];
  events: LogEvent[];
  cross: Crosshair;
  focus: (tag: string) => void;
  go: (sub: AssetsSubPage) => void;
}

/* ==========================================================================
   Small shared pieces
   ========================================================================== */

/** Caption for every pyro-line limit line and limit status (D4 §7.2). */
const DEMO_LIMIT_NOTE = PYRO_DEMO_LIMIT;

/** Sensor-validation verdict: muted when good, status colour only when the data cannot be trusted. */
export function QualityMark({ quality, note }: { quality: string | null; note?: string | null }) {
  if (quality === null) return <span className="pg-trends-muted">—</span>;
  if (quality === "Good") return <span className="pg-trends-muted" title={note ?? "Passes data-quality and sensor-validation checks"}>Good</span>;
  return (
    <span title={note ?? undefined}>
      <StatusTag tone={quality === "Suspect" ? "warn" : "bad"} label={quality} />
    </span>
  );
}

/** Status: muted text when normal, a status chip only when something is off. */
export function ZoneMark({ zone, label }: { zone: Zone; label?: string }) {
  if (zone === "normal") return <span className="pg-trends-muted">{label ?? "Normal"}</span>;
  return (
    <StatusTag tone={ZONE_TONE[zone]} label={label ?? ZONE_LABEL[zone]} />
  );
}

function Pills<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: Array<{ id: T; label: string; count?: number; tone?: Tone }>;
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <PillNav
      className="pg-trends-pills"
      ariaLabel={label}
      activeId={value}
      onChange={onChange}
      items={items.map((it) => ({
        id: it.id,
        label: it.label,
        prefix: it.tone && it.tone !== "idle" && it.tone !== "good" ? <span className="ast-chip-dot" data-tone={it.tone} aria-hidden="true" /> : undefined,
        suffix: typeof it.count === "number" ? <span className="pg-trends-count ast-num">{it.count}</span> : undefined,
      }))}
    />
  );
}

const capsuleTone = (k: ExcursionKind): ChartCapsule["tone"] => (k === "alarm" ? "bad" : k === "warning" ? "warn" : "idle");
const KIND_LABEL: Record<ExcursionKind, string> = { alarm: "Alarm limit", warning: "Warning limit", model: `Model ±${MODEL_K}σ` };

const clock = (t: number, timeZone: string | undefined, seconds = false) => formatLocalTime(t, { seconds, timeZone });

/* ==========================================================================
   KPI strip (4 tiles)
   ========================================================================== */

export function KpiRow({ ctx }: { ctx: TrendsCtx }) {
  const zones = ctx.channels.map(channelZone);
  const alarm = zones.filter((z) => z === "alarm").length;
  const warn = zones.filter((z) => z === "warning").length;
  const exAlarm = ctx.excursions.filter((e) => e.kind === "alarm").length;
  const exLimit = ctx.excursions.filter((e) => e.kind !== "model").length;
  let dev: { ch: Channel; s: number } | null = null;
  for (const ch of ctx.channels) {
    const s = ctx.stats.get(ch.id)?.peakSigma;
    if (s !== null && s !== undefined && (!dev || s > dev.s)) dev = { ch, s };
  }
  const inWin = ctx.events.filter((e) => e.at >= ctx.domain[0] && e.at <= ctx.domain[1]);
  const inWinAlarm = inWin.filter((e) => e.cat === "alarm").length;
  const tiles: KpiItem[] = [
    { label: "Outside limits", value: String(alarm + warn), unit: "now", foot: `${alarm} alarm · ${warn} warning`, tone: alarm ? "bad" : warn ? "warn" : undefined },
    {
      label: "Excursions",
      value: String(ctx.excursions.length),
      unit: ctx.winLabel,
      foot: ctx.live ? `${exLimit} limit · ${ctx.excursions.length - exLimit} model band` : `${exLimit} limit`,
      tone: exAlarm ? "bad" : exLimit ? "warn" : undefined,
    },
    {
      label: "Max deviation",
      value: dev ? fmt(dev.s, 1) : "—",
      unit: dev ? (dev.ch.sigma ? "σ" : "σ est.") : undefined,
      foot: dev ? `${dev.ch.id} · ${dev.ch.name}` : "No reference stored",
      tone: dev && dev.ch.sigma && dev.s > MODEL_K ? "warn" : undefined,
    },
    { label: "Events", value: String(inWin.length), unit: ctx.winLabel, foot: `${inWinAlarm} alarm / rule · ${ctx.events.length} logged`, tone: inWinAlarm ? "warn" : undefined },
  ];
  return <KpiStrip page items={tiles} label="Key figures" />;
}

/** Signals ranked by how much they moved in the window, off-limit first. */
export function rankChanged(ctx: Pick<TrendsCtx, "channels" | "stats">): Array<{ ch: Channel; score: number }> {
  return ctx.channels
    .filter(hasHistory)
    .map((ch) => {
      const s = ctx.stats.get(ch.id) ?? null;
      const zone = channelZone(ch);
      const base = s ? (s.peakSigma ?? (s.sd > 0 ? Math.abs(s.change) / s.sd : 0)) : 0;
      const boost = zone === "alarm" ? 1000 : zone === "warning" ? 500 : 0;
      return { ch, s, score: boost + (s ? s.outside * 100 : 0) + base };
    })
    .filter((r) => r.s)
    .sort((a, b) => b.score - a.score);
}

/* ==========================================================================
   Signal (explorer)
   ========================================================================== */

export function SignalPicker({ channels, value, onChange, groupName }: { channels: Channel[]; value: string; onChange: (id: string) => void; groupName: (g: string) => string }) {
  const groups = useMemo(() => {
    const m = new Map<string, Channel[]>();
    for (const c of channels) m.set(c.group, [...(m.get(c.group) ?? []), c]);
    return [...m.entries()];
  }, [channels]);
  const idx = channels.findIndex((c) => c.id === value);
  const step = (d: number) => channels.length && onChange(channels[(idx + d + channels.length) % channels.length].id);
  const option = (c: Channel) => {
    const z = channelZone(c);
    return <option key={c.id} value={c.id}>{`${c.id} · ${c.name}${z === "normal" ? "" : ` (${ZONE_LABEL[z]})`}${hasHistory(c) ? "" : " · no history"}`}</option>;
  };
  return (
    <div className="pg-trends-picker">
      <button type="button" className="pg-trends-icon-btn" onClick={() => step(-1)} aria-label="Previous signal" disabled={channels.length < 2}>
        <Chevron className="pg-trends-flip" />
      </button>
      <label className="pg-trends-select-wrap">
        <span className="pg-trends-sr">Signal</span>
        <select className="pg-trends-select" value={value} onChange={(e) => onChange(e.target.value)}>
          {groups.length > 1
            ? groups.map(([g, list]) => (
                <optgroup key={g} label={groupName(g)}>
                  {list.map(option)}
                </optgroup>
              ))
            : channels.map(option)}
        </select>
      </label>
      <button type="button" className="pg-trends-icon-btn" onClick={() => step(1)} aria-label="Next signal" disabled={channels.length < 2}>
        <Chevron />
      </button>
      {idx >= 0 && (
        <span className="pg-trends-muted ast-num">
          {idx + 1}/{channels.length}
        </span>
      )}
    </div>
  );
}

export function ExplorerSection({
  ctx,
  active,
  onSelect,
  onExport,
}: {
  ctx: TrendsCtx;
  active: Channel;
  onSelect: (id: string) => void;
  onExport: (ch: Channel, samples: TrendSample[]) => void;
}) {
  const [scale, setScale] = useState<"data" | "limits">("data");
  const raw = useMemo(() => ctx.series.get(active.id) ?? [], [active, ctx.series]);
  const samples = useMemo(() => downsample(raw, 900), [raw]);
  const stats = ctx.stats.get(active.id) ?? null;
  const ex = useMemo(() => ctx.excursions.filter((e) => e.tag === active.id), [ctx.excursions, active]);
  const capsules = useMemo<ChartCapsule[]>(
    () => ex.map((e) => ({ start: e.start, end: e.end, tone: capsuleTone(e.kind), label: `${KIND_LABEL[e.kind]} · ${fmtSpan(e.end - e.start)} · peak ${fmt(e.peak, e.decimals)} ${e.unit}` })),
    [ex]
  );
  // Spans the engine held out of diagnosis (Suspect / Invalid), greyed out on the chart.
  const dq = useMemo(() => qualitySpans(active.id, ctx.span, ctx.now, ctx.frame), [active.id, ctx.span, ctx.now, ctx.frame]);
  const dqShare = useMemo(() => {
    const n = dq.reduce((a, d) => a + (d.end - d.start), 0);
    return ctx.span > 0 ? n / ctx.span : 0;
  }, [dq, ctx.span]);
  const markers = useMemo<ChartMarker[]>(
    () =>
      ctx.events
        .filter((e) => e.exact && e.at >= ctx.domain[0] && e.at <= ctx.domain[1] && (e.cat !== "telemetry" || e.sensor === active.id))
        .map((e) => ({ t: e.at, tone: SEVERITY_TONE[e.severity], label: `${clock(e.at, ctx.timeZone)} · ${e.title}` })),
    [ctx.events, ctx.domain, ctx.timeZone, active.id]
  );

  const d = active.decimals;
  const cur = stats?.last ?? active.value;
  const zone = worst(zoneOf(cur, active.limits), active.reported);
  const eq = ctx.live ? referenceEquation(ctx.defs, active.id) : undefined;
  const lim = active.limits;
  const pair = (a?: number, b?: number) => (a === undefined && b === undefined ? null : [a, b].map((x) => (x === undefined ? "—" : fmt(x, d))).join(" / "));
  const hiTxt = pair(lim?.warnHi, lim?.alarmHi);
  const loTxt = pair(lim?.warnLo, lim?.alarmLo);
  const resid = active.baseline !== null ? cur - active.baseline : null;
  const est = active.calculated ? " calc." : ctx.defs?.signalByTag[active.id]?.origin === "manual" ? " manual" : active.live ? " sim." : "";
  const demo = ctx.defs?.plant === "pyro" && Boolean(lim);

  const cells: Array<[string, React.ReactNode]> = [];
  if (active.baseline !== null) cells.push([active.live ? "Reference" : "Baseline", fmt(active.baseline, d)]);
  if (resid !== null) cells.push(["Residual", active.sigma ? `${fmtSigned(resid, d)} · ${fmtSigned(resid / active.sigma, 1)}σ` : fmtSigned(resid, d)]);
  if (stats) {
    cells.push(["Min", fmt(stats.min, d)], ["Mean", fmt(stats.mean, d)], ["Max", fmt(stats.max, d)], ["Std dev", fmt(stats.sd, Math.min(3, d + 1))]);
    if (lim) cells.push(["Outside", `${fmt(stats.outside * 100, 0)} %`]);
  }
  const demoTag = demo ? " (demo)" : "";
  if (hiTxt) cells.push([`${lim?.abs ? "Warning / alarm |x|" : "Warning / alarm hi"}${demoTag}`, hiTxt]);
  if (loTxt) cells.push([`Warning / alarm lo${demoTag}`, loTxt]);
  if (active.timeToLimit) cells.push(["To limit", active.timeToLimit]);
  if (dq.length) cells.push(["Not valid", `${fmt(dqShare * 100, 0)} % of window`]);

  return (
    <Section id={SECTION.explorer} title="Signal" right={<SignalPicker channels={ctx.channels} value={active.id} onChange={onSelect} groupName={ctx.groupName} />}>
      <section className="pg-trends-card" aria-label={`${active.name} trend`}>
        <header className="pg-trends-ex-head">
          <div className="pg-trends-ex-title">
            <h4 className="pg-trends-h">{active.name}</h4>
            <span className="pg-trends-muted ast-num">
              {active.id} · {active.subassembly || active.component || "—"} · {CLASS_LABEL[active.cls]}
              {active.rate ? ` · ${active.rate}` : ""}
              {active.quality !== null ? ` · data ${active.quality.toLowerCase()}${active.qualityNote ? `: ${active.qualityNote}` : ""}` : ""}
              {demo ? ` · ${DEMO_LIMIT_NOTE}` : ""}
            </span>
          </div>
          <div className="pg-trends-ex-actions">
            {active.quality !== null && active.quality !== "Good" && <QualityMark quality={active.quality} note={active.qualityNote} />}
            {zone !== "normal" && <ZoneMark zone={zone} />}
            <Pills<"data" | "limits">
              items={[
                { id: "data", label: "Fit" },
                { id: "limits", label: "Limits" },
              ]}
              value={scale}
              onChange={setScale}
              label="Value scale"
            />
            <PillButton variant="secondary" className="pg-trends-btn-sm" disabled={raw.length === 0} onClick={() => onExport(active, raw)} title="Download this signal's samples as CSV">
              Export CSV
            </PillButton>
          </div>
        </header>

        <div className="pg-trends-readouts">
          <div className="pg-trends-hero">
            <span className="pg-trends-hero-value ast-num">{fmt(cur, d)}</span>
            <span className="pg-trends-hero-unit">
              {active.unit}
              {est}
            </span>
          </div>
          <dl className="pg-trends-stats">
            {cells.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd className="ast-num">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {samples.length > 1 ? (
          <>
            <SignalChart
              samples={samples}
              domain={ctx.domain}
              unit={active.unit}
              decimals={d}
              limits={lim}
              sigma={active.sigma}
              capsules={capsules}
              markers={markers}
              scale={scale}
              crosshair={ctx.cross}
              limitNote={demo ? DEMO_LIMIT_NOTE : undefined}
              quality={dq}
              ariaLabel={`${active.name} in ${active.unit} over the last ${ctx.winLabel}${demo ? `; ${DEMO_LIMIT_NOTE}` : ""}${dq.length ? `; ${dq.length} span${dq.length > 1 ? "s" : ""} of suspect or invalid data greyed out` : ""}`}
            />
            {active.sigma && <ResidualChart samples={samples} domain={ctx.domain} sigma={active.sigma} crosshair={ctx.cross} />}
          </>
        ) : (
          <div className="pg-trends-nohist" role="note">
            {active.manualRecords
              ? `Manual record: ${samples.length === 1 ? "one dated record" : "no dated record"} in this window. Manual records are plotted only at their record times, never as a live series.`
              : active.record
                ? "No stored samples in this window."
                : "No history recorded; current value only."}
          </div>
        )}

        {eq && (
          <WhyDisclosure summary="Reference model">
            <p className="pg-trends-prose ast-num">
              {eq.expr} · σ {fmt(active.sigma, Math.min(3, d + 1))} {active.unit} · kiln specification D5, Table 9.5
            </p>
          </WhyDisclosure>
        )}
      </section>
    </Section>
  );
}

/* ==========================================================================
   Compare
   ========================================================================== */

type Norm = "z" | "pct";
type OvMode = "overlay" | "stacked";

function pearson(a: TrendSample[], b: TrendSample[]): number | null {
  if (a.length < 5 || b.length < 5) return null;
  const xs: number[] = [];
  const ys: number[] = [];
  const tol = (a[a.length - 1].t - a[0].t) / Math.max(1, a.length - 1);
  let j = 0;
  for (const p of a) {
    while (j < b.length - 1 && Math.abs(b[j + 1].t - p.t) <= Math.abs(b[j].t - p.t)) j++;
    if (Math.abs(b[j].t - p.t) > tol * 1.5) continue;
    xs.push(p.v);
    ys.push(b[j].v);
  }
  const n = xs.length;
  if (n < 5) return null;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}

export function OverlaySection({ ctx, active, trendable }: { ctx: TrendsCtx; active: Channel | undefined; trendable: Channel[] }) {
  const [picked, setPicked] = useState<string[] | null>(null);
  const [norm, setNorm] = useState<Norm>("z");
  const [mode, setMode] = useState<OvMode>("overlay");
  const trendIds = useMemo(() => new Set(trendable.map((c) => c.id)), [trendable]);

  // Kiln-seal fleet: D5 Table 9.5 model inputs + fixed relationships; pyro line: rule inputs (defs.rules).
  const presets = useMemo(() => comparePresets(ctx.defs, active?.id, trendIds, ctx.live), [ctx.defs, active?.id, trendIds, ctx.live]);

  const defaults = useMemo(() => {
    if (presets[0]) return presets[0].tags;
    const first = active && trendIds.has(active.id) ? [active.id] : [];
    return [...first, ...trendable.map((c) => c.id).filter((id) => !first.includes(id))].slice(0, 2);
  }, [presets, active, trendIds, trendable]);

  const ids = (picked ?? defaults).filter((id) => trendIds.has(id)).slice(0, 4);
  const idsKey = ids.join("|");
  const chans = useMemo(() => idsKey.split("|").map((id) => ctx.byId.get(id)).filter((c): c is Channel => Boolean(c)), [idsKey, ctx.byId]);

  const series = useMemo<OverlaySeries[]>(
    () =>
      chans.map((ch) => {
        const st = ctx.stats.get(ch.id);
        const mean = st?.mean ?? 0;
        const sd = st?.sd || 1;
        const min = st?.min ?? 0;
        const range = st && st.max > st.min ? st.max - st.min : 1;
        return {
          id: ch.id,
          label: ch.id,
          unit: ch.unit,
          decimals: ch.decimals,
          samples: downsample(ctx.series.get(ch.id) ?? [], 700),
          norm: norm === "z" ? (v: number) => (v - mean) / sd : (v: number) => ((v - min) / range) * 100,
        };
      }),
    [chans, ctx.series, ctx.stats, norm]
  );
  const corr = useMemo(() => series.map((s, i) => (i === 0 ? null : pearson(series[0].samples, s.samples))), [series]);
  const setIds = (next: string[]) => setPicked(next.slice(0, 4));
  const addable = trendable.filter((c) => !ids.includes(c.id));

  return (
    <Section
      id={SECTION.overlay}
      title="Compare"
      right={
        <>
          <Pills<Norm> items={[{ id: "z", label: "z-score" }, { id: "pct", label: "% range" }]} value={norm} onChange={setNorm} label="Normalisation" />
          <Pills<OvMode> items={[{ id: "overlay", label: "Overlay" }, { id: "stacked", label: "Stacked" }]} value={mode} onChange={setMode} label="Layout" />
        </>
      }
    >
      <section className="pg-trends-card" aria-label="Signal comparison">
        {((ids.length < 4 && addable.length > 0) || presets.length > 0) && (
        <div className="pg-trends-ov-controls">
          {ids.length < 4 && addable.length > 0 && (
            <label className="pg-trends-select-wrap pg-trends-add">
              <span className="pg-trends-sr">Add signal</span>
              <select className="pg-trends-select" value="" onChange={(e) => e.target.value && setIds([...ids, e.target.value])}>
                <option value="">Add signal</option>
                {addable.map((c) => (
                  <option key={c.id} value={c.id}>{`${c.id} · ${c.name}`}</option>
                ))}
              </select>
            </label>
          )}
          {presets.length > 0 && (
            <label className="pg-trends-select-wrap pg-trends-add">
              <span className="pg-trends-sr">Process relationship</span>
              <select
                className="pg-trends-select"
                value=""
                onChange={(e) => {
                  const p = presets.find((x) => x.id === e.target.value);
                  if (p) setIds(p.tags);
                }}
              >
                <option value="">Relationship</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        )}

        {mode === "overlay" ? (
          <OverlayChart series={series} domain={ctx.domain} axisUnit={norm === "z" ? "σ" : "%"} crosshair={ctx.cross} ariaLabel={`Normalised overlay of ${chans.map((c) => c.name).join(", ")}`} />
        ) : (
          <div className="pg-trends-stack">
            {chans.map((c, i) => (
              <SignalChart
                key={c.id}
                samples={series[i]?.samples ?? []}
                domain={ctx.domain}
                unit={c.unit}
                decimals={c.decimals}
                limits={c.limits}
                sigma={c.sigma}
                variant="strip"
                height={112}
                crosshair={ctx.cross}
                label={c.id}
                ariaLabel={`${c.name} in ${c.unit}`}
              />
            ))}
          </div>
        )}

        <OverlayLegend ctx={ctx} series={series} chans={chans} corr={corr} onRemove={chans.length > 1 ? (id) => setIds(ids.filter((x) => x !== id)) : undefined} />
      </section>
    </Section>
  );
}

/** Legend under the compare chart: one flush cell per signal (key · tag · value at the crosshair · min / max · r). */
function OverlayLegend({
  ctx,
  series,
  chans,
  corr,
  onRemove,
}: {
  ctx: TrendsCtx;
  series: OverlaySeries[];
  chans: Channel[];
  corr: Array<number | null>;
  onRemove?: (id: string) => void;
}) {
  const { t, values } = useOverlayReadout(ctx.cross, series);
  return (
    <div className="pg-trends-legend" role="list" aria-label={t === null ? "Compared signals, latest values" : `Compared signals at ${clock(t, ctx.timeZone, true)}`}>
      {chans.map((c, i) => {
        const st = ctx.stats.get(c.id);
        const r = i === 0 ? null : corr[i];
        return (
          <div key={c.id} role="listitem" className="pg-trends-legend-item is-clickable" title={`Show ${c.id} in Signal`} {...rowActivate(() => ctx.focus(c.id))}>
            <div className="pg-trends-legend-head">
              <svg width="16" height="6" aria-hidden="true">
                <line className={`pg-trends-ov pg-trends-ov--${i % OVERLAY_STYLES}`} x1="1" x2="15" y1="3" y2="3" />
              </svg>
              <span className="pg-trends-legend-tag ast-num">{c.id}</span>
              {onRemove && (
                <button
                  type="button"
                  className="pg-trends-ov-x"
                  aria-label={`Remove ${c.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(c.id);
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  ×
                </button>
              )}
            </div>
            <span className="pg-trends-legend-name">{c.name}</span>
            <span className="pg-trends-legend-value ast-num">
              {fmt(values[i], c.decimals)}
              {c.unit && <span className="pg-trends-legend-unit">{c.unit}</span>}
              <span className="pg-trends-legend-at">{t === null ? "latest" : clock(t, ctx.timeZone, true)}</span>
            </span>
            <dl className="pg-trends-legend-facts">
              <div>
                <dt>Min</dt>
                <dd className="ast-num">{fmt(st?.min, c.decimals)}</dd>
              </div>
              <div>
                <dt>Max</dt>
                <dd className="ast-num">{fmt(st?.max, c.decimals)}</dd>
              </div>
              <div title={`Pearson correlation with ${chans[0]?.id ?? "the first signal"} over the window (calculated)`}>
                <dt>r</dt>
                <dd className="ast-num">{r === null || r === undefined ? "—" : fmtSigned(r, 2)}</dd>
              </div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   Signals — every trended signal, grouped by system (D4 §4), one card each
   ========================================================================== */

export function SignalsSection({
  ctx,
  slow,
  ranked,
  activeId,
}: {
  ctx: TrendsCtx;
  /** Throttled series + domain (sparklines refresh every few seconds, not every tick). */
  slow: { series: Map<string, TrendSample[]>; domain: [number, number]; stats: Map<string, WindowStats | null> };
  ranked: Array<{ ch: Channel }>;
  activeId: string | undefined;
}) {
  const [cls, setCls] = useState<"all" | SignalClass>("all");
  const [sort, setSort] = useState<"system" | "changed">("system");
  const classes = new Set(ctx.channels.map((c) => c.cls));
  const demo = ctx.defs?.plant === "pyro";

  const groups = useMemo(() => {
    const shown = ctx.channels.filter((c) => cls === "all" || c.cls === cls);
    if (sort === "changed") {
      const order = new Map(ranked.map((r, i) => [r.ch.id, i]));
      const list = [...shown].sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));
      return [["", list]] as Array<[string, Channel[]]>;
    }
    const m = new Map<string, Channel[]>();
    for (const c of shown) m.set(c.group, [...(m.get(c.group) ?? []), c]);
    return [...m.entries()];
  }, [ctx.channels, cls, sort, ranked]);

  const right = (
    <>
      {classes.size > 1 && (
        <Pills
          items={[
            { id: "all", label: "All" },
            { id: "condition", label: CLASS_LABEL.condition },
            { id: "process", label: CLASS_LABEL.process },
          ]}
          value={cls}
          onChange={(v) => setCls(v as "all" | SignalClass)}
          label="Signal class"
        />
      )}
      <Pills<"system" | "changed">
        items={[
          { id: "system", label: "By system" },
          { id: "changed", label: "Most changed" },
        ]}
        value={sort}
        onChange={setSort}
        label="Order"
      />
    </>
  );

  return (
    <Section id={SECTION.signals} title="Signals" right={right} bare>
      {groups.map(([g, list]) => {
        const out = list.filter((c) => channelZone(c) !== "normal").length;
        return (
          <React.Fragment key={g || "all"}>
            {g && (
              <div className="ui-tiles-head">
                <span>
                  <b>{ctx.groupName(g)}</b> · {g === TREND_GROUP ? "stored" : CLASS_LABEL[list[0].cls].toLowerCase()}
                </span>
                <span className="ast-num" title={demo ? DEMO_LIMIT_NOTE : undefined}>
                  {list.length} signal{list.length === 1 ? "" : "s"}
                  {out > 0 ? ` · ${out} outside limits` : ""}
                  {demo ? " · demo limits" : ""}
                </span>
              </div>
            )}
            <TileGrid fill={false} className="is-compact pg-trends-signal-grid" label={g ? `${ctx.groupName(g)} signals` : "Signals by change in window"} min={220}>
              {list.map((c) => (
                <SignalTile
                  key={c.id}
                  ch={c}
                  stats={slow.stats.get(c.id) ?? null}
                  samples={slow.series.get(c.id)}
                  domain={slow.domain}
                  active={c.id === activeId}
                  onOpen={ctx.focus}
                  live={ctx.live}
                />
              ))}
            </TileGrid>
          </React.Fragment>
        );
      })}
    </Section>
  );
}

const SignalTile = memo(function SignalTile({
  ch,
  stats,
  samples,
  domain,
  active,
  onOpen,
  live,
}: {
  ch: Channel;
  stats: WindowStats | null;
  samples: TrendSample[] | undefined;
  domain: [number, number];
  active: boolean;
  onOpen: (tag: string) => void;
  /** Live machine: reference model (vs. stored baseline) and sensor-validation verdict. */
  live: boolean;
}) {
  const spark = useMemo(() => downsample(samples ?? [], 120), [samples]);
  const cur = ch.value;
  const zone = channelZone(ch);
  const dev = ch.baseline !== null ? (ch.sigma ? (cur - ch.baseline) / ch.sigma : stats?.sd ? (cur - ch.baseline) / stats.sd : null) : null;
  const devOff = dev !== null && Boolean(ch.sigma) && Math.abs(dev) > MODEL_K;
  const d = ch.decimals;
  const facts: TileFact[] = [
    { label: live ? "Ref." : "Baseline", value: fmt(ch.baseline, d) },
    { label: ch.sigma || dev === null ? "Dev. σ" : "Dev. σ est.", value: dev === null ? "—" : fmtSigned(dev, 1), tone: devOff ? "warn" : undefined },
    { label: "Min", value: fmt(stats?.min, d) },
    { label: "Max", value: fmt(stats?.max, d) },
  ];
  const badData = live && ch.quality !== null && ch.quality !== "Good";
  const tone = zone === "normal" ? undefined : ZONE_TONE[zone];
  return (
    <Tile
      className="pg-trends-sigtile"
      title={ch.id}
      sub={ch.name}
      status={{ label: ZONE_LABEL[zone], tone }}
      value={fmt(cur, d)}
      unit={ch.unit}
      tone={tone}
      facts={facts}
      foot={
        badData ? (
          <span className="pg-trends-tile-dq" title={ch.qualityNote ?? undefined}>
            <QualityMark quality={ch.quality} note={ch.qualityNote} />
            {ch.qualityNote && <span className="pg-trends-muted">{ch.qualityNote}</span>}
          </span>
        ) : undefined
      }
      selected={active}
      onSelect={() => onOpen(ch.id)}
      attrs={{ "data-sensor": ch.id }}
    >
      <div className="pg-trends-tile-spark">
        {spark.length > 1 ? (
          <SignalChart samples={spark} domain={domain} unit={ch.unit} decimals={d} limits={ch.limits} sigma={null} variant="spark" height={32} showModel={false} ariaLabel={`${ch.name} sparkline`} />
        ) : (
          <span className="pg-trends-muted">{ch.record ? "No samples in window" : "No history"}</span>
        )}
      </div>
    </Tile>
  );
});

/* ==========================================================================
   Excursions
   ========================================================================== */

const KIND_RANK: Record<ExcursionKind, number> = { alarm: 2, warning: 1, model: 0 };
/** Cards shown before "Show all": the most severe excursions. */
const EXCURSION_CARDS = 12;

export function ExcursionsSection({ ctx }: { ctx: TrendsCtx }) {
  const [kind, setKind] = useState<"all" | ExcursionKind>("all");
  const [all, setAll] = useState(false);
  const count = (k: ExcursionKind) => ctx.excursions.filter((e) => e.kind === k).length;
  // Most severe first: alarm > warning > model band, then ongoing, then peak deviation, then length.
  const rows = useMemo(
    () =>
      ctx.excursions
        .filter((e) => kind === "all" || e.kind === kind)
        .sort(
          (a, b) =>
            KIND_RANK[b.kind] - KIND_RANK[a.kind] ||
            Number(b.ongoing) - Number(a.ongoing) ||
            (b.peakSigma ?? -1) - (a.peakSigma ?? -1) ||
            b.end - b.start - (a.end - a.start)
        ),
    [ctx.excursions, kind]
  );
  const items: Array<{ id: "all" | ExcursionKind; label: string; count: number; tone?: Tone }> = [
    { id: "all", label: "All", count: ctx.excursions.length },
    { id: "alarm", label: "Alarm", count: count("alarm"), tone: count("alarm") ? "bad" : undefined },
    { id: "warning", label: "Warning", count: count("warning"), tone: count("warning") ? "warn" : undefined },
  ];
  if (ctx.live) items.push({ id: "model", label: `±${MODEL_K}σ`, count: count("model") });
  const shown = all ? rows : rows.slice(0, EXCURSION_CARDS);
  const secs = ctx.span < 3_600_000;

  return (
    <Section id={SECTION.excursions} title="Excursions" right={<Pills items={items} value={kind} onChange={setKind} label="Excursion type" />} bare>
      {rows.length === 0 ? (
        <section className="ast-card pg-trends-none" role="status">
          None of this type in the last {ctx.winLabel}
        </section>
      ) : (
        <TileGrid label="Excursions, most severe first" min={220}>
          {shown.map((e) => {
            const tone = capsuleTone(e.kind);
            const alert = tone === "idle" ? undefined : tone;
            return (
              <Tile
                key={e.id}
                className="pg-trends-extile"
                title={e.tag}
                sub={e.name}
                status={{ label: KIND_LABEL[e.kind], tone: alert }}
                value={fmt(e.peak, e.decimals)}
                unit={`${e.unit ? `${e.unit} ` : ""}peak${e.peakSigma === null ? "" : ` · ${fmt(e.peakSigma, 1)}σ`}`}
                tone={alert}
                facts={[
                  { label: "Start", value: clock(e.start, ctx.timeZone, secs) },
                  { label: "Duration", value: fmtSpan(e.end - e.start) },
                  { label: "End", value: e.ongoing ? "Ongoing" : clock(e.end, ctx.timeZone, secs), tone: e.ongoing ? alert : undefined },
                ]}
                actions={
                  e.rule ? (
                    <button type="button" className="pg-trends-link pg-trends-tile-rule" onClick={() => ctx.go("diagnosis")} title={`${e.rule.id} ${e.rule.name} (${e.rule.status.toLowerCase()}) · open Diagnosis`}>
                      <span className="ast-num">{e.rule.id}</span> {e.rule.name}
                      <span className="pg-trends-muted"> · {e.rule.status === "ACTIVE" ? "active" : "pending"}</span>
                    </button>
                  ) : undefined
                }
                onSelect={() => ctx.focus(e.tag)}
                attrs={{ "data-sensor": e.tag }}
              />
            );
          })}
        </TileGrid>
      )}
      {rows.length > EXCURSION_CARDS && (
        <div className="pg-trends-more">
          <PillButton variant="secondary" className="pg-trends-btn-sm" onClick={() => setAll((v) => !v)} aria-expanded={all}>
            {all ? `Show ${EXCURSION_CARDS} most severe` : `Show all ${rows.length}`}
          </PillButton>
        </div>
      )}
    </Section>
  );
}

/* ==========================================================================
   Events & alarm log
   ========================================================================== */

const EVENT_ICON: Record<EventCat, "fault" | "maintenance" | "process" | "detect"> = {
  alarm: "fault",
  maintenance: "maintenance",
  operator: "process",
  telemetry: "detect",
};

export function EventsSection({ ctx }: { ctx: TrendsCtx }) {
  const [cat, setCat] = useState<"all" | EventCat>("all");
  const [limit, setLimit] = useState(30);
  const inWin = (e: LogEvent) => e.at >= ctx.domain[0] && e.at <= ctx.domain[1];
  const rows = ctx.events.filter((e) => cat === "all" || e.cat === cat);
  const cats: EventCat[] = ["alarm", "maintenance", "operator", "telemetry"];
  const items = [
    { id: "all" as const, label: "All", count: ctx.events.length },
    ...cats.filter((c) => ctx.events.some((e) => e.cat === c)).map((c) => ({ id: c, label: EVENT_CAT_LABEL[c], count: ctx.events.filter((e) => e.cat === c).length })),
  ];

  return (
    <Section id={SECTION.events} title="Events" right={<Pills items={items} value={cat} onChange={setCat} label="Event type" />}>
      <section className="pg-trends-card pg-trends-card--table" aria-label="Event log">
        <div className="ui-table-container ast-table pg-trends-table">
          <table className="ui-table">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Event</th>
                <th scope="col">Type</th>
                <th scope="col">Signal</th>
                <th scope="col" className="pg-trends-num">Value</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((e) => {
                const tone = SEVERITY_TONE[e.severity];
                const canFocus = e.sensor !== null && ctx.byId.has(e.sensor);
                return (
                  <tr key={e.id}>
                    <td className="ast-num">
                      {e.exact ? clock(e.at, ctx.timeZone, e.live) : "—"}
                      <span className="pg-trends-muted">
                        {" "}
                        {dayLabel(e.daysAgo)}
                        {e.exact && inWin(e) ? " · on chart" : ""}
                      </span>
                    </td>
                    <td className="pg-trends-msg">
                      <ItemCell icon={EVENT_ICON[e.cat]} tone={tone === "idle" ? undefined : tone} title={e.title} sub={e.detail || undefined} />
                    </td>
                    <td className="pg-trends-muted">
                      {e.kind}
                    </td>
                    <td>
                      {e.sensor ? (
                        canFocus ? (
                          <button type="button" className="pg-trends-link ast-num" onClick={() => ctx.focus(e.sensor!)} title={`Show ${e.sensor} in Signal`}>
                            {e.sensor}
                          </button>
                        ) : (
                          <span className="ast-num">{e.sensor}</span>
                        )
                      ) : e.rule ? (
                        <button type="button" className="pg-trends-link ast-num" onClick={() => ctx.go("diagnosis")} title={`${e.rule} · open Diagnosis`}>
                          {e.rule}
                        </button>
                      ) : (
                        <span className="pg-trends-muted">—</span>
                      )}
                    </td>
                    <td className="pg-trends-num ast-num">{e.value ?? <span className="pg-trends-muted">—</span>}</td>
                    <td className="pg-trends-muted">{e.source}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length > limit && (
          <div className="pg-trends-more">
            <PillButton variant="secondary" className="pg-trends-btn-sm" onClick={() => setLimit((l) => l + 50)}>
              {rows.length - limit} more
            </PillButton>
          </div>
        )}
      </section>
    </Section>
  );
}

/* ==========================================================================
   State signals
   ========================================================================== */

export function StatesSection({ ctx, highlight }: { ctx: TrendsCtx; highlight: string | null }) {
  const rows = useMemo(
    () =>
      ctx.states.map((s) => {
        const pts = s.live ? stateSeries(s.id, ctx.span, ctx.now, ctx.frame) : [];
        const off = pts.filter((p) => !p.ok).length;
        let changes = 0;
        for (let i = 1; i < pts.length; i++) if (pts[i].ok !== pts[i - 1].ok) changes++;
        return { s, pts, offPct: pts.length ? (off / pts.length) * 100 : null, changes };
      }),
    [ctx.states, ctx.span, ctx.now, ctx.frame]
  );
  const anyHistory = rows.some((r) => r.pts.length > 0);

  return (
    <Section id={SECTION.states} title="States">
      <section className="pg-trends-card pg-trends-card--table" aria-label="State signals">
        <div className="ui-table-container ast-table pg-trends-table">
          <table className="ui-table">
            <thead>
              <tr>
                <th scope="col">Signal</th>
                <th scope="col">State</th>
                {anyHistory && <th scope="col" className="pg-trends-strip-col">Last {ctx.winLabel}</th>}
                {anyHistory && <th scope="col" className="pg-trends-num">Off-normal</th>}
                {anyHistory && <th scope="col" className="pg-trends-num">Changes</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, pts, offPct, changes }) => {
                const z: Zone = s.status === "Critical" ? "alarm" : s.status === "Advisory" ? "warning" : "normal";
                return (
                  <tr key={s.id} className={highlight === s.id ? "active" : undefined}>
                    <td>
                      <span className="pg-trends-sig">
                        <span className="ast-num pg-trends-tagcol">{s.id}</span>
                        <span className="pg-trends-name">{s.name}</span>
                      </span>
                    </td>
                    <td>{z === "normal" ? <span className="pg-trends-strong">{s.display || "—"}</span> : <ZoneMark zone={z} label={s.display || ZONE_LABEL[z]} />}</td>
                    {anyHistory && (
                      <td className="pg-trends-strip-col">
                        {pts.length ? (
                          <StateStrip points={pts} domain={ctx.domain} offTone={s.offTone} crosshair={ctx.cross} label={`${s.name}: ${changes} changes`} />
                        ) : (
                          <span className="pg-trends-muted">—</span>
                        )}
                      </td>
                    )}
                    {anyHistory && <td className="pg-trends-num ast-num">{offPct === null ? "—" : `${fmt(offPct, 0)} %`}</td>}
                    {anyHistory && <td className="pg-trends-num ast-num">{pts.length ? changes : "—"}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </Section>
  );
}
