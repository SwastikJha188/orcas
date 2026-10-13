"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import type { DegradationItem, InsightsResponse } from "@/server/services/insights-service";
import "./degradation-module.css";

type AnalysisData = InsightsResponse["analysis"];

export interface DegradationModuleProps {
  data?: AnalysisData;
  onBack?: () => void;
}

/* ------------------------------------------------------------------ */
/* Stage model                                                        */
/* ------------------------------------------------------------------ */

type Tone = "good" | "warn" | "bad";
type Trend = DegradationItem["trend"];

interface StageBand {
  index: number;
  label: string;
  /** Inclusive lower / upper health bound (%). */
  min: number;
  max: number;
  tone: Tone;
}

/**
 * Health-% thresholds per stage. These mirror the server rule in
 * `buildDegradation`: stageIndex = clamp(round((100 − health) / 14), 0, last).
 * Stage i therefore spans health 100 − 14·(i + 0.5) … 100 − 14·(i − 0.5), i.e. for the
 * six default stages: As-new > 93 %, Healthy 79–93 %, Early wear 65–79 %,
 * Progressive 51–65 %, Severe 37–51 %, Failure < 37 %. The last stage absorbs 0 %.
 */
const STAGE_STEP = 14;

/** Zone colour by position in the stage sequence: first third good, middle third warn, last third bad. */
function toneForIndex(index: number, count: number): Tone {
  const f = count > 1 ? index / (count - 1) : 0;
  return f < 0.34 ? "good" : f < 0.67 ? "warn" : "bad";
}

function buildBands(stages: string[]): StageBand[] {
  const n = stages.length;
  return stages.map((label, i) => ({
    index: i,
    label,
    min: i === n - 1 ? 0 : Math.max(0, 100 - STAGE_STEP * (i + 0.5)),
    max: i === 0 ? 100 : Math.max(0, 100 - STAGE_STEP * (i - 0.5)),
    tone: toneForIndex(i, n),
  }));
}

interface ItemModel extends DegradationItem {
  short: string;
  stageIndexSafe: number;
  tone: Tone;
  status: { tone: Tone; label: string };
  /** Health headroom above the next stage boundary (%), null on the last stage. */
  margin: number | null;
}

function shortName(name: string): string {
  let s = name.replace(/\s*\(.*\)\s*$/, "").trim();
  if (s.length > 24 && s.includes(" & ")) s = s.split(" & ")[0];
  return s.length > 26 ? `${s.slice(0, 25)}…` : s;
}

const TREND_META: Record<Trend, { label: string; tone: Tone | "neutral" }> = {
  falling: { label: "Degrading", tone: "warn" },
  stable: { label: "Stable", tone: "neutral" },
  rising: { label: "Improving", tone: "good" },
};

/* ------------------------------------------------------------------ */
/* Small parts                                                        */
/* ------------------------------------------------------------------ */

function Chip({ tone, children }: { tone: Tone | "neutral"; children: React.ReactNode }) {
  return <span className={`deg-chip deg-chip--${tone}`}>{children}</span>;
}

function StageStrip({ index, count, tone, label, compact = false }: { index: number; count: number; tone: Tone; label: string; compact?: boolean }) {
  return (
    <span
      className={`deg-strip${compact ? " deg-strip--compact" : ""}`}
      style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}
      role="img"
      aria-label={`Stage ${index + 1} of ${count}, ${label}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={i <= index ? `is-on deg-tone-${tone}` : undefined} />
      ))}
    </span>
  );
}

function TrendMark({ trend }: { trend: Trend }) {
  const meta = TREND_META[trend];
  return (
    <span className="deg-rate">
      <svg className={`deg-rate-arrow deg-tone-${meta.tone}`} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        {trend === "stable" ? (
          <path d="M1 5h8M5.8 1.8 9 5 5.8 8.2" />
        ) : trend === "falling" ? (
          <path d="M5 1v8M1.8 5.8 5 9l3.2-3.2" />
        ) : (
          <path d="M5 9V1M1.8 4.2 5 1l3.2 3.2" />
        )}
      </svg>
      {meta.label}
    </span>
  );
}

function ItemIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Health scale (0–100 %, stage bands, selected marker, all-item dots) */
/* ------------------------------------------------------------------ */

const SW = 640;
const SH = 150;
const SPL = 12;
const SPR = 12;
const BAR_Y = 34;
const BAR_H = 16;
const DOT_Y = 92;
const DOT_R = 4.5;
const sxh = (h: number) => SPL + (h / 100) * (SW - SPL - SPR);
const TICKS = [0, 25, 50, 75, 100];

function HealthScale({ bands, items, selected }: { bands: StageBand[]; items: ItemModel[]; selected: ItemModel }) {
  const dots = useMemo(() => {
    // Stack items that share (nearly) the same health so every dot stays visible.
    const placed: Array<{ item: ItemModel; x: number; y: number }> = [];
    [...items]
      .sort((a, b) => a.health - b.health)
      .forEach((item) => {
        const x = sxh(item.health);
        const level = placed.filter((p) => Math.abs(p.x - x) < DOT_R * 2 + 2).length;
        placed.push({ item, x, y: DOT_Y - level * (DOT_R * 2 + 3) });
      });
    return placed;
  }, [items]);

  const mx = sxh(selected.health);
  const label = `Health scale 0 to 100 %. ${selected.name} at ${selected.health} %, stage ${selected.stageLabel}. Other items: ${items
    .filter((i) => i.id !== selected.id)
    .map((i) => `${i.short} ${i.health} %`)
    .join(", ")}.`;

  return (
    <svg viewBox={`0 0 ${SW} ${SH}`} className="deg-scale" role="img" aria-label={label}>
      {bands.map((b) => {
        const x0 = sxh(b.min);
        const x1 = sxh(b.max);
        const w = x1 - x0;
        return (
          <g key={b.index}>
            <rect x={x0 + 1} y={BAR_Y} width={Math.max(0, w - 2)} height={BAR_H} rx="3" className={`deg-scale-band deg-scale-band--${b.tone}${b.index === selected.stageIndexSafe ? " is-current" : ""}`} />
            {w >= 34 && (
              <text x={x0 + w / 2} y={BAR_Y - 8} textAnchor="middle" className={`deg-axis-text${b.index === selected.stageIndexSafe ? " deg-axis-text--strong" : ""}`}>
                {b.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Selected marker */}
      <line x1={mx} x2={mx} y1={BAR_Y - 4} y2={BAR_Y + BAR_H + 4} className="deg-scale-marker" />
      <circle cx={mx} cy={BAR_Y + BAR_H / 2} r="5" className={`deg-scale-pin deg-fill-${selected.tone}`} />

      {/* Ticks */}
      <line x1={SPL} x2={SW - SPR} y1={DOT_Y + 14} y2={DOT_Y + 14} className="deg-axis" />
      {TICKS.map((t) => (
        <g key={t}>
          <line x1={sxh(t)} x2={sxh(t)} y1={DOT_Y + 14} y2={DOT_Y + 18} className="deg-axis" />
          <text x={sxh(t)} y={DOT_Y + 30} textAnchor={t === 0 ? "start" : t === 100 ? "end" : "middle"} className="deg-axis-text">
            {t} %
          </text>
        </g>
      ))}

      {/* All items in context */}
      {dots.map(({ item, x, y }) => (
        <circle key={item.id} cx={x} cy={y} r={item.id === selected.id ? DOT_R + 1 : DOT_R} className={item.id === selected.id ? `deg-scale-dot is-selected deg-fill-${item.tone}` : "deg-scale-dot"}>
          <title>{`${item.name} · ${item.health} %`}</title>
        </circle>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export function DegradationModule({ data, onBack }: DegradationModuleProps) {
  const stageNames = data?.degradation?.stages;
  const rawItems = data?.degradation?.items;

  const bands = useMemo(() => buildBands(stageNames && stageNames.length ? stageNames : ["Stage"]), [stageNames]);

  const items = useMemo<ItemModel[]>(() => {
    const n = bands.length;
    return (rawItems ?? [])
      .map((it) => {
        const idx = Math.max(0, Math.min(n - 1, it.stageIndex));
        const tone = toneForIndex(idx, n);
        const statusTone: Tone = tone === "good" && it.trend === "falling" ? "warn" : tone;
        const statusLabel = statusTone === "bad" ? "Intervene" : statusTone === "warn" ? "Watch" : "Nominal";
        const margin = idx < n - 1 ? Math.max(0, Math.round((it.health - bands[idx].min) * 10) / 10) : null;
        return { ...it, short: shortName(it.name), stageIndexSafe: idx, tone, status: { tone: statusTone, label: statusLabel }, margin };
      })
      .sort((a, b) => b.stageIndexSafe - a.stageIndexSafe || a.health - b.health);
  }, [rawItems, bands]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((m) => m.id === selectedId) ?? items[0];

  const kpi = useMemo(() => (items.length ? { worst: items[0] } : null), [items]);

  const onRowKey = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedId(id);
    }
  };

  const count = bands.length;

  return (
    <div className="deg-root">
      {/* Header */}
      <header className="deg-head">
        <div className="deg-head-left">
          {onBack && (
            <PillButton
              variant="secondary"
              className="deg-back"
              onClick={onBack}
              aria-label="Back to assets"
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              }
            >
              Assets
            </PillButton>
          )}
          <h2 className="deg-title">Degradation</h2>
          {kpi && (
            <Chip tone={kpi.worst.tone}>
              <span className={`deg-dot deg-fill-${kpi.worst.tone}`} />
              {kpi.worst.short} · Stage {kpi.worst.stageIndexSafe + 1}/{count}
            </Chip>
          )}
        </div>
        {/* Long DB lists select from the stage matrix instead of a tab row. */}
        {items.length > 0 && items.length <= 6 && selected && (
          <PillNav
            wrap
            className="deg-nav"
            items={items.map((m) => ({ id: m.id, label: m.short }))}
            activeId={selected.id}
            onChange={setSelectedId}
          />
        )}
      </header>

      {!kpi || !selected ? (
        <section className="deg-card deg-empty">No degradation items reported for this machine.</section>
      ) : (
        <>
          {/* Primary visual */}
          <section className="deg-main">
            <div className="deg-card deg-matrix">
              <div className="deg-card-head">
                <h3 className="deg-card-title">Stage matrix</h3>
              </div>
              <div className="deg-matrix-cols" aria-hidden="true">
                <span>Item</span>
                <span className="deg-matrix-stages" style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
                  {bands.map((b) => (
                    <b key={b.index}>{b.index + 1}</b>
                  ))}
                </span>
                <span className="deg-num">Health</span>
                <span>Trend</span>
              </div>
              <div className="deg-matrix-rows" role="group" aria-label="Items by degradation stage">
                {items.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`deg-matrix-row${m.id === selected.id ? " is-active" : ""}`}
                    aria-pressed={m.id === selected.id}
                    onClick={() => setSelectedId(m.id)}
                  >
                    <span className="deg-matrix-name">
                      <span className="deg-ellipsis">{m.short}</span>
                      <span className="deg-sub">{m.stageLabel}</span>
                    </span>
                    <StageStrip index={m.stageIndexSafe} count={count} tone={m.tone} label={m.stageLabel} />
                    <span className="deg-num deg-strong">{m.health} %</span>
                    <TrendMark trend={m.trend} />
                  </button>
                ))}
              </div>
              <ul className="deg-stage-key">
                {bands.map((b) => (
                  <li key={b.index}>
                    <b>{b.index + 1}</b> {b.label}{" "}
                    <span>{b.index === 0 ? `> ${b.min} %` : b.index === count - 1 ? `< ${b.max} %` : `${b.min}–${b.max} %`}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="deg-card deg-detail">
              <div className="deg-card-head">
                <div className="deg-detail-title">
                  <h3 className="deg-card-title" title={selected.name}>{selected.name}</h3>
                  <Chip tone={selected.tone}>
                    {selected.stageIndexSafe + 1}/{count} · {selected.stageLabel}
                  </Chip>
                </div>
              </div>
              <dl className="deg-metrics">
                <div><dt>Health</dt><dd>{selected.health} %</dd></div>
                <div><dt>Trend</dt><dd><TrendMark trend={selected.trend} /></dd></div>
                <div>
                  <dt>{selected.margin !== null ? `Margin to stage ${selected.stageIndexSafe + 2}` : "Margin"}</dt>
                  <dd>{selected.margin !== null ? `${selected.margin} %` : "—"}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <Chip tone={selected.status.tone}>
                      <span className={`deg-dot deg-fill-${selected.status.tone}`} />
                      {selected.status.label}
                    </Chip>
                  </dd>
                </div>
              </dl>
              <HealthScale bands={bands} items={items} selected={selected} />
              <div className="deg-legend" aria-hidden="true">
                <span><i className={`deg-key deg-key--pin deg-fill-${selected.tone}`} />Selected</span>
                <span><i className="deg-key deg-key--dot" />Other items</span>
              </div>
            </div>
          </section>

          {/* Supporting table */}
          <section className="deg-card deg-table-card">
            <div className="deg-card-head">
              <h3 className="deg-card-title">Items</h3>
              {data?.model?.engine && <span className="deg-sub">{data.model.engine}</span>}
            </div>
            <div className="deg-table-wrap">
              <table className="deg-table">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Stage</th>
                    <th scope="col" className="deg-num">Health</th>
                    <th scope="col">Trend</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr
                      key={m.id}
                      tabIndex={0}
                      aria-selected={m.id === selected.id}
                      className={m.id === selected.id ? "is-active" : undefined}
                      onClick={() => setSelectedId(m.id)}
                      onKeyDown={(e) => onRowKey(e, m.id)}
                    >
                      <td>
                        <span className="deg-item">
                          <span className={`deg-badge deg-tone-${m.tone}`}>
                            <ItemIcon />
                          </span>
                          <span className="deg-matrix-name">
                            <span className="deg-ellipsis deg-strong">{m.name}</span>
                            <span className="deg-sub">{m.id}</span>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="deg-stage-cell">
                          <StageStrip index={m.stageIndexSafe} count={count} tone={m.tone} label={m.stageLabel} compact />
                          {m.stageLabel}
                        </span>
                      </td>
                      <td className="deg-num deg-strong">{m.health} %</td>
                      <td><TrendMark trend={m.trend} /></td>
                      <td>
                        <Chip tone={m.status.tone}>
                          <span className={`deg-dot deg-fill-${m.status.tone}`} />
                          {m.status.label}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
