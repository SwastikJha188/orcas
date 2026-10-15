"use client";

import React, { useState } from "react";
import { formatDuration, type SimFrame } from "@/lib/kiln-sim/engine";
import { KindIcon, sensorKind } from "./diagnostics-overview-tab";
import { VALIDITY_LABEL, VALIDITY_TONE, type DxSensor, type Validity } from "./diagnosis-model";
import { PYRO_DEMO_LIMIT } from "./sensors-model";
import { twoSided, twoSidedText, twoSidedValues, type TwoSided } from "./sensor-gauge";

/* ==========================================================================
   Evidence & signal validity: the sensors behind the findings — value
   against alert / alarm limits, expected value and residual (σ) against the
   reference model (D5 Table 9.5), validation state (D5 Table 9.6) and the
   rules that cite them. The full register lives on Sensors.
   ========================================================================== */

export function evidenceRowId(tag: string): string {
  return `pg-diag-ev-${tag.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

function fmt(v: number): string {
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 100 ? 1 : 2);
}

/** Two-sided (band / |x|) limit: both sides on one scale, warning ticks inside the alarm ticks. */
function BandLimitBar({ s, v, band }: { s: DxSensor; v: number; band: TwoSided }) {
  const pts = [v, ...twoSidedValues(band), ...(s.model !== null ? [s.model] : [])];
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const pad = (hi - lo) * 0.12 || 1;
  const d0 = lo - pad;
  const d1 = hi + pad;
  const W = 120;
  const x = (n: number) => 4 + ((n - d0) / (d1 - d0)) * (W - 8);
  const dot = s.severity === "Critical" ? "var(--status-danger)" : s.severity === "Advisory" ? "var(--status-warning)" : "var(--dx-ink-2)";
  const warn = twoSidedText(band.warnLo, band.warnHi);
  const alarm = twoSidedText(band.alarmLo, band.alarmHi);
  const ticks: Array<[number | undefined, string]> = [
    [band.alarmLo, "var(--status-danger)"],
    [band.warnLo, "var(--status-warning)"],
    [band.warnHi, "var(--status-warning)"],
    [band.alarmHi, "var(--status-danger)"],
  ];
  return (
    <svg className="dxo-limit-bar" viewBox={`0 0 ${W} 14`} role="img" aria-label={`${fmt(v)} ${s.unit}; warning ${warn}; alarm ${alarm} ${s.unit}${s.model !== null ? `; model ${fmt(s.model)}` : ""}`}>
      <title>{`Value ${fmt(v)} ${s.unit} · Warning ${warn} · Alarm ${alarm}${s.model !== null ? ` · Model ${fmt(s.model)}` : ""} ${s.unit}`}</title>
      <rect x="4" y="6" width={W - 8} height="2" rx="1" fill="var(--dx-track)" />
      {ticks.map(([t, fill], i) => (t === undefined ? null : <rect key={i} x={x(t) - 1} y="2" width="2" height="10" rx="1" fill={fill} />))}
      {s.model !== null && <circle cx={x(s.model)} cy="7" r="3.5" fill="none" stroke="var(--dx-ink-2)" strokeWidth="1.2" />}
      <circle cx={x(v)} cy="7" r="4" fill={dot} stroke="var(--card-bg)" strokeWidth="2" />
    </svg>
  );
}

/** Value against alert / alarm limits on a common scale, with the model value as a hollow mark. */
function ModelLimitBar({ s, band }: { s: DxSensor; band: TwoSided | null }) {
  const v = s.value;
  if (v !== null && band) return <BandLimitBar s={s} v={v} band={band} />;
  const w = s.warn;
  const a = s.alarm;
  if (v === null || w === null || a === null) return <span className="dxo-none">no limits</span>;
  const pts = [v, w, a, ...(s.model !== null ? [s.model] : [])];
  const lo = Math.min(0, ...pts);
  const hi = Math.max(...pts);
  const pad = (hi - lo) * 0.12 || 1;
  const d0 = lo < 0 ? lo - pad : 0;
  const d1 = hi + pad;
  const W = 120;
  const x = (n: number) => 4 + ((n - d0) / (d1 - d0)) * (W - 8);
  const dot = s.severity === "Critical" ? "var(--status-danger)" : s.severity === "Advisory" ? "var(--status-warning)" : "var(--dx-ink-2)";
  return (
    <svg className="dxo-limit-bar" viewBox={`0 0 ${W} 14`} role="img" aria-label={`${fmt(v)} ${s.unit}; warning ${w}; alarm ${a} ${s.unit}${s.model !== null ? `; model ${fmt(s.model)}` : ""}`}>
      <title>{`Value ${fmt(v)} ${s.unit} · Warning ${w} · Alarm ${a}${s.model !== null ? ` · Model ${fmt(s.model)}` : ""} ${s.unit}`}</title>
      <rect x="4" y="6" width={W - 8} height="2" rx="1" fill="var(--dx-track)" />
      <rect x={x(w) - 1} y="2" width="2" height="10" rx="1" fill="var(--status-warning)" />
      <rect x={x(a) - 1} y="2" width="2" height="10" rx="1" fill="var(--status-danger)" />
      {s.model !== null && <circle cx={x(s.model)} cy="7" r="3.5" fill="none" stroke="var(--dx-ink-2)" strokeWidth="1.2" />}
      <circle cx={x(v)} cy="7" r="4" fill={dot} stroke="var(--card-bg)" strokeWidth="2" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 6-6" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  );
}

/** Residual (measured − model, σ) over the last hour, with ±2σ band and ±3σ lines. */
function ResidualBandSpark({ frame, tag }: { frame: SimFrame | null; tag: string }) {
  const h = frame?.history[tag];
  const m = frame?.modelHistory[tag];
  const sigma = frame?.defs.signalByTag[tag]?.sigma;
  if (!h || !m || !sigma || h.length < 2) return <span className="dxo-none">—</span>;
  const n = Math.min(60, h.length, m.length);
  const r = Array.from({ length: n }, (_, i) => (h[h.length - n + i] - m[m.length - n + i]) / sigma);
  const W = 96;
  const H = 22;
  const lim = Math.max(4, ...r.map((v) => Math.abs(v)));
  const y = (v: number) => H / 2 - (v / lim) * (H / 2 - 1);
  const x = (i: number) => (i / (n - 1)) * W;
  const d = r.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return (
    <svg className="pg-diag-spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${tag} residual, last ${formatDuration(n)}, now ${r[n - 1].toFixed(1)} sigma`}>
      <rect x="0" y={y(2)} width={W} height={y(-2) - y(2)} className="pg-diag-spark-band" />
      <line x1="0" x2={W} y1={y(3)} y2={y(3)} className="pg-diag-spark-lim" />
      <line x1="0" x2={W} y1={y(-3)} y2={y(-3)} className="pg-diag-spark-lim" />
      <path d={d} className="pg-diag-spark-line" />
    </svg>
  );
}

const VALIDITY_ORDER: Validity[] = ["valid", "suspect", "invalid", "stale", "unvalidated"];

export function EvidenceTable({
  sensors,
  allSensors,
  frame,
  scopeLabel,
  citedBy,
  onClearScope,
  onOpenTrend,
  onOpenSensor,
  loading,
}: {
  sensors: DxSensor[];
  allSensors: DxSensor[];
  frame: SimFrame | null;
  /** Selected rule the table is scoped to, if any. */
  scopeLabel: string | null;
  citedBy: Map<string, string[]>;
  onClearScope: () => void;
  onOpenTrend: (tag: string) => void;
  onOpenSensor: (tag?: string) => void;
  loading: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll && !scopeLabel ? allSensors : sensors;
  const counts = VALIDITY_ORDER.map((v) => ({ v, n: allSensors.filter((s) => s.validity === v).length })).filter((c) => c.n > 0);

  return (
    <div className="dxo-card dxo-table-card">
      <div className="dxo-card-head pg-diag-card-head">
        <span className="ast-caption ast-num pg-diag-pipe" aria-label="Sensor validity across the machine">
          {counts.map((c) => (
            <span key={c.v}>
              {c.n} {VALIDITY_LABEL[c.v].toLowerCase()}
            </span>
          ))}
          {frame && frame.pipeline.held > 0 && <span>{frame.pipeline.held} held</span>}
          {frame?.defs.plant === "pyro" && <span title="D4 §7.2: no pyro-line limit is plant-approved">demo limits · not plant-approved (D4 §7.2)</span>}
        </span>
        <div className="dxo-toolbar-group">
          {scopeLabel ? (
            <button type="button" className="dxo-filter-chip" onClick={onClearScope} aria-label={`Clear rule filter ${scopeLabel}`}>
              Read by {scopeLabel}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button type="button" className="dxo-link" aria-pressed={showAll} onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Only evidence" : `All ${allSensors.length} sensors`}
            </button>
          )}
          <button type="button" className="dxo-link" onClick={() => onOpenSensor()}>
            Sensor mapping
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="dxo-empty">
          {loading
            ? "Loading sensor catalog…"
            : allSensors.length === 0
              ? "No sensors mapped to this machine."
              : scopeLabel
                ? "This rule reads no mapped sensor."
                : "No sensor in excursion, flagged or cited."}
        </div>
      ) : (
        <div className="dxo-table-wrap">
          <table className="dxo-table pg-diag-table">
            <thead>
              <tr>
                <th scope="col">Sensor</th>
                <th scope="col" className="is-right">Value</th>
                <th scope="col" className="is-right">Model</th>
                <th scope="col" title={frame?.defs.plant === "pyro" ? PYRO_DEMO_LIMIT : undefined}>
                  Value vs warning / alarm{frame?.defs.plant === "pyro" ? " (demo)" : ""}
                </th>
                <th scope="col" className="is-right">Residual</th>
                <th scope="col">Residual trend</th>
                <th scope="col">Validity</th>
                <th scope="col">Cited by</th>
                <th scope="col" className="is-right">
                  <span className="dxo-sr">Links</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const sc = s.severity === "Critical" ? "is-bad" : s.severity === "Advisory" ? "is-warn" : "";
                const tone = s.severity === "Critical" ? "bad" : s.severity === "Advisory" ? "warn" : undefined;
                const rules = citedBy.get(s.tag) ?? [];
                return (
                  <tr key={s.tag} id={evidenceRowId(s.tag)} className="dxo-row pg-diag-evrow">
                    <td>
                      <div className="dxo-ident">
                        <span className="ast-badge" data-tone={tone}>
                          <KindIcon kind={sensorKind(s.sensorType, s.unit, s.tag)} />
                        </span>
                        <div className="ast-cell-stack">
                          <span className="dxo-primary-text">{s.tag}</span>
                          <span className="dxo-secondary-text pg-diag-wrap">{[s.name, s.subAssembly].filter(Boolean).join(" · ")}{s.timeToLimit ? ` · limit in ${s.timeToLimit} (est.)` : ""}</span>
                        </div>
                      </div>
                    </td>
                    <td className="is-right">
                      <span className={`dxo-readout ${sc}`}>
                        <strong>{s.value !== null ? fmt(s.value) : s.display}</strong>
                        {s.value !== null && <span>{s.unit}</span>}
                      </span>
                    </td>
                    <td className="is-right ast-num pg-diag-muted">{s.model !== null ? fmt(s.model) : <span className="dxo-none">—</span>}</td>
                    <td>
                      <ModelLimitBar s={s} band={s.band ?? twoSided(frame?.defs.signalByTag[s.tag]?.limit, s.model)} />
                    </td>
                    <td className="is-right ast-num">
                      {s.z !== null ? (
                        <span className={Math.abs(s.z) >= 3 ? "dxo-tone-text-bad" : Math.abs(s.z) >= 2 ? "dxo-tone-text-warn" : ""}>
                          {s.z >= 0 ? "+" : "−"}
                          {Math.abs(s.z).toFixed(1)} σ
                        </span>
                      ) : (
                        <span className="dxo-none">—</span>
                      )}
                    </td>
                    <td>
                      <ResidualBandSpark frame={frame} tag={s.tag} />
                    </td>
                    <td>
                      <span className="ast-cell-stack">
                        <span className="pg-diag-state" data-tone={VALIDITY_TONE[s.validity] === "good" ? "idle" : VALIDITY_TONE[s.validity]}>
                          <span className="ast-chip-dot" aria-hidden="true" />
                          {VALIDITY_LABEL[s.validity]}
                        </span>
                        {s.qualityNote && <span className="dxo-secondary-text pg-diag-wrap">{s.qualityNote}</span>}
                      </span>
                    </td>
                    <td>{rules.length ? <span className="pg-diag-cited">{rules.join(", ")}</span> : <span className="dxo-none">—</span>}</td>
                    <td className="is-right">
                      <span className="pg-diag-row-actions">
                        <button type="button" className="dxo-icon-btn" aria-label={`Open trend for ${s.tag}`} title="Trend" onClick={() => onOpenTrend(s.tag)}>
                          <TrendIcon />
                        </button>
                        <button type="button" className="dxo-icon-btn" aria-label={`Open ${s.tag} on Sensor mapping`} title="Sensor mapping" onClick={() => onOpenSensor(s.tag)}>
                          <MapIcon />
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
