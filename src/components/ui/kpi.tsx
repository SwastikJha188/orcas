import React from "react";
import type { Tone } from "./status";

/*
 * ULTRON KPI tiles — the one implementation.
 *
 *   KpiStrip (page)   machine-page strip: four frosted tiles
 *                     (.pg-frame-kpis > .ast-card.pg-frame-kpi, analysis-page.css)
 *   KpiStrip          flush facts inside a section (.pg-analysis-kpis > Fact)
 *   KpiCards/KpiCard  workspace dashboards (devices, configure, AssetIQ, edge):
 *                     .ast-kpis > .ast-card.ast-kpi (assets-shell.css)
 *
 * Styles live in assets-shell.css / analysis-page.css, loaded by the routes
 * that render these.
 */

/** Keep a tone only when it signals a problem; healthy / info / idle render neutral. */
export const alertTone = (t: Tone | undefined): Tone | undefined => (t === "warn" || t === "bad" ? t : undefined);

export interface KpiItem {
  label: string;
  value: string;
  unit?: string;
  foot?: React.ReactNode;
  tone?: Tone;
  /** Short text value (e.g. a window or a name) rather than a number. */
  text?: boolean;
  /** Page strip only: a 0–100 fill for the thin bar under the value, or a custom bar node (e.g. a limit bar). */
  bar?: number | React.ReactNode;
}

/**
 * KPI strip. Inside a section (default) the tiles are flush facts; with `page`
 * it is the page-level strip of the shared frame: exactly four frosted tiles
 * (.pg-frame-kpis > .ast-card.pg-frame-kpi) — muted uppercase label, large
 * tabular value + muted unit, optional thin bar, one muted foot line.
 */
export function KpiStrip({ items, label, page = false }: { items: KpiItem[]; label: string; page?: boolean }) {
  if (page) {
    return (
      <div className="pg-frame-kpis" role="list" aria-label={label}>
        {items.slice(0, 4).map((k) => {
          const t = alertTone(k.tone);
          return (
            <div key={k.label} className="ast-card pg-frame-kpi" role="listitem" data-tone={t}>
              <span className="pg-frame-kpi-label">
                {t && <span className="ast-chip-dot" aria-hidden="true" />}
                {k.label}
              </span>
              <span className={`pg-frame-kpi-value ast-num ${k.text ? "is-text" : ""}`} title={k.text ? k.value : undefined}>
                {k.value}
                {k.unit && <span className="pg-frame-kpi-unit">{k.unit}</span>}
              </span>
              {typeof k.bar === "number" ? (
                <span className="pg-frame-kpi-bar" aria-hidden="true">
                  <i style={{ width: `${Math.max(0, Math.min(100, k.bar))}%` }} />
                </span>
              ) : (
                k.bar ?? null
              )}
              {k.foot !== undefined && k.foot !== "" && (
                <span className="pg-frame-kpi-foot ast-num" title={typeof k.foot === "string" ? k.foot : undefined}>
                  {k.foot}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="pg-analysis-kpis" role="group" aria-label={label}>
      {items.slice(0, 4).map((k) => (
        <Fact key={k.label} label={k.label} value={k.text ? <span className="pg-analysis-fact-text">{k.value}</span> : k.value} unit={k.unit} foot={k.foot} tone={k.tone} />
      ))}
    </div>
  );
}

export interface FactItem {
  label: string;
  value: React.ReactNode;
  unit?: string;
  foot?: React.ReactNode;
  tone?: Tone;
}

/** Label (uppercase, muted) above value (tabular) with muted unit; status dot only in warning / alarm. */
export function Fact({ label, value, unit, foot, tone }: FactItem) {
  const t = alertTone(tone);
  return (
    <div className="pg-analysis-fact" data-tone={t}>
      <span className="pg-analysis-fact-label">
        {t && <span className="ast-chip-dot" aria-hidden="true" />}
        {label}
      </span>
      <span className="pg-analysis-fact-value ast-num">
        {value}
        {unit && <span className="ast-unit">{unit}</span>}
      </span>
      {foot && <span className="pg-analysis-fact-foot">{foot}</span>}
    </div>
  );
}

/** Grid of workspace KPI cards (.ast-kpis); 2–3 cards widen to fill the row. */
export function KpiCards({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`ast-kpis ${className}`.trim()} aria-label={label}>
      {children}
    </section>
  );
}

export interface KpiCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Muted unit / denominator after the value. */
  unit?: React.ReactNode;
  /** Value tone (data-tone on the value). */
  tone?: Tone;
  /** Colour the value only for warning / alarm (healthy reads neutral). */
  alertOnly?: boolean;
  /** Top-right slot (icon tile, chip). When given, label + aside share a top row. */
  aside?: React.ReactNode;
  /** Render the top row even without an aside. */
  top?: boolean;
  /** Short text value (a name, a state) rather than a number. */
  text?: boolean;
  foot?: React.ReactNode;
  /** Foot classes; default is a muted caption line. */
  footClassName?: string;
  className?: string;
}

/** Workspace KPI card: label, large tabular value + muted unit, one foot. */
export function KpiCard({ label, value, unit, tone, alertOnly, aside, top, text, foot, footClassName = "ast-caption", className = "" }: KpiCardProps) {
  const t = alertOnly ? alertTone(tone) : tone;
  const labelNode = <span className="ast-kpi-label">{label}</span>;
  return (
    <div className={`ast-card ast-kpi ${className}`.trim()}>
      {aside !== undefined || top ? (
        <div className="ast-kpi-top">
          {labelNode}
          {aside}
        </div>
      ) : (
        labelNode
      )}
      <span className={`${text ? "pg-kpi-text" : "ast-kpi-value"} ast-num pg-tone-value`} data-tone={t}>
        {value}
        {unit !== undefined && unit !== null && unit !== "" && <span className="ast-unit">{unit}</span>}
      </span>
      {foot !== undefined && foot !== null && foot !== "" && foot !== false && <div className={footClassName}>{foot}</div>}
    </div>
  );
}
