"use client";

import React, { useState } from "react";
import { Tile, TileGrid } from "@/components/ui";
import { formatDuration, type SimFrame } from "@/lib/kiln-sim/engine";
import { KindIcon, sensorKind } from "./diagnostics-overview-tab";
import { VALIDITY_LABEL, VALIDITY_TONE, type DxSensor, type Validity } from "./diagnosis-model";
import { PYRO_DEMO_LIMIT } from "./sensors-model";
import { twoSided, twoSidedText, twoSidedValues, type TwoSided } from "./sensor-gauge";

/* ==========================================================================
   Evidence & signal validity: the sensors behind the findings — value
   against alert / alarm limits, expected value and residual (σ) against the
   reference model (D5 Table 9.5), validation state (D5 Table 9.6) and the
   rules that cite them, one card per sensor (residual of the last hour as
   a band sparkline). The full register lives on Sensors.
   ========================================================================== */

export function evidenceRowId(tag: string): string {
  return `pg-diag-ev-${tag.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

function fmt(v: number): string {
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 100 ? 1 : 2);
}

/** Horizontal position on a limit bar as a percentage (3 %–97 %), so the bar scales with its card. */
const pctX = (n: number, d0: number, d1: number) => `${(3 + ((n - d0) / (d1 - d0)) * 94).toFixed(2)}%`;

/** Two-sided (band / |x|) limit: both sides on one scale, warning ticks inside the alarm ticks. */
function BandLimitBar({ s, v, band }: { s: DxSensor; v: number; band: TwoSided }) {
  const pts = [v, ...twoSidedValues(band), ...(s.model !== null ? [s.model] : [])];
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const pad = (hi - lo) * 0.12 || 1;
  const d0 = lo - pad;
  const d1 = hi + pad;
  const x = (n: number) => pctX(n, d0, d1);
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
    <svg className="dxo-limit-bar" width="100%" height="14" role="img" aria-label={`${fmt(v)} ${s.unit}; warning ${warn}; alarm ${alarm} ${s.unit}${s.model !== null ? `; model ${fmt(s.model)}` : ""}`}>
      <title>{`Value ${fmt(v)} ${s.unit} · Warning ${warn} · Alarm ${alarm}${s.model !== null ? ` · Model ${fmt(s.model)}` : ""} ${s.unit}`}</title>
      <rect x="0" y="6" width="100%" height="2" rx="1" fill="var(--dx-track)" />
      {ticks.map(([t, fill], i) => (t === undefined ? null : <rect key={i} x={x(t)} y="2" width="2" height="10" rx="1" fill={fill} transform="translate(-1 0)" />))}
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
  const x = (n: number) => pctX(n, d0, d1);
  const dot = s.severity === "Critical" ? "var(--status-danger)" : s.severity === "Advisory" ? "var(--status-warning)" : "var(--dx-ink-2)";
  return (
    <svg className="dxo-limit-bar" width="100%" height="14" role="img" aria-label={`${fmt(v)} ${s.unit}; warning ${w}; alarm ${a} ${s.unit}${s.model !== null ? `; model ${fmt(s.model)}` : ""}`}>
      <title>{`Value ${fmt(v)} ${s.unit} · Warning ${w} · Alarm ${a}${s.model !== null ? ` · Model ${fmt(s.model)}` : ""} ${s.unit}`}</title>
      <rect x="0" y="6" width="100%" height="2" rx="1" fill="var(--dx-track)" />
      <rect x={x(w)} y="2" width="2" height="10" rx="1" fill="var(--status-warning)" transform="translate(-1 0)" />
      <rect x={x(a)} y="2" width="2" height="10" rx="1" fill="var(--status-danger)" transform="translate(-1 0)" />
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
  if (!h || !m || !sigma || h.length < 2) return null;
  const n = Math.min(60, h.length, m.length);
  const r = Array.from({ length: n }, (_, i) => (h[h.length - n + i] - m[m.length - n + i]) / sigma);
  const W = 240;
  const H = 24;
  const lim = Math.max(4, ...r.map((v) => Math.abs(v)));
  const y = (v: number) => H / 2 - (v / lim) * (H / 2 - 1);
  const x = (i: number) => (i / (n - 1)) * W;
  const d = r.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return (
    <svg className="pg-diag-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${tag} residual, last ${formatDuration(n)}, now ${r[n - 1].toFixed(1)} sigma`}>
      <rect x="0" y={y(2)} width={W} height={y(-2) - y(2)} className="pg-diag-spark-band" />
      <line x1="0" x2={W} y1={y(3)} y2={y(3)} className="pg-diag-spark-lim" />
      <line x1="0" x2={W} y1={y(-3)} y2={y(-3)} className="pg-diag-spark-lim" />
      <path d={d} className="pg-diag-spark-line" />
    </svg>
  );
}

const VALIDITY_ORDER: Validity[] = ["valid", "suspect", "invalid", "stale", "unvalidated"];

export function EvidenceCards({
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
  /** Selected rule the cards are scoped to, if any. */
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
  const pyro = frame?.defs.plant === "pyro";

  return (
    <>
      <div className="ui-tiles-head pg-diag-card-head">
        <span className="ast-num pg-diag-pipe" aria-label="Sensor validity across the machine">
          {counts.map((c) => (
            <span key={c.v}>
              {c.n} {VALIDITY_LABEL[c.v].toLowerCase()}
            </span>
          ))}
          {frame && frame.pipeline.held > 0 && <span>{frame.pipeline.held} held</span>}
          {pyro && <span title={PYRO_DEMO_LIMIT}>demo limits · not plant-approved (D4 §7.2)</span>}
        </span>
        <span className="dxo-toolbar-group">
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
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="pg-diag-missing">
          {loading
            ? "Loading sensor catalog…"
            : allSensors.length === 0
              ? "No sensors mapped to this machine."
              : scopeLabel
                ? "This rule reads no mapped sensor."
                : "No sensor in excursion, flagged or cited."}
        </p>
      ) : (
        <TileGrid label="Sensor evidence" min={240} className="pg-diag-tiles">
          {rows.map((s) => {
            const tone = s.severity === "Critical" ? "bad" : s.severity === "Advisory" ? "warn" : undefined;
            const vTone = VALIDITY_TONE[s.validity];
            const rules = citedBy.get(s.tag) ?? [];
            const zTone = s.z !== null && Math.abs(s.z) >= 3 ? "bad" : s.z !== null && Math.abs(s.z) >= 2 ? "warn" : undefined;
            const foot = [s.timeToLimit ? `limit in ${s.timeToLimit} (est.)` : null, s.qualityNote].filter(Boolean).join(" · ");
            return (
              <Tile
                key={s.tag}
                className="pg-diag-tile pg-diag-evtile"
                attrs={{ id: evidenceRowId(s.tag), "data-tag": s.tag }}
                title={
                  <span className="pg-diag-ev-title">
                    <span className="ast-badge" data-tone={tone}>
                      <KindIcon kind={sensorKind(s.sensorType, s.unit, s.tag)} />
                    </span>
                    {s.tag}
                  </span>
                }
                sub={[s.name, s.subAssembly].filter(Boolean).join(" · ")}
                status={{ label: VALIDITY_LABEL[s.validity], tone: vTone === "good" ? undefined : vTone }}
                tone={tone}
                value={s.value !== null ? fmt(s.value) : s.display}
                unit={s.value !== null ? s.unit : undefined}
                meter={
                  <span className="pg-diag-ev-bar" title={pyro ? PYRO_DEMO_LIMIT : undefined}>
                    <ModelLimitBar s={s} band={s.band ?? twoSided(frame?.defs.signalByTag[s.tag]?.limit, s.model)} />
                  </span>
                }
                facts={[
                  { label: "Model", value: s.model !== null ? fmt(s.model) : "—" },
                  { label: "Residual", value: s.z !== null ? `${s.z >= 0 ? "+" : "−"}${Math.abs(s.z).toFixed(1)} σ` : "—", tone: zTone },
                  { label: "Cited by", value: rules.length ? rules.join(", ") : "—" },
                ]}
                foot={foot || undefined}
                actions={
                  <>
                    <button type="button" className="dxo-icon-btn" aria-label={`Open trend for ${s.tag}`} title="Trend" onClick={() => onOpenTrend(s.tag)}>
                      <TrendIcon />
                    </button>
                    <button type="button" className="dxo-icon-btn" aria-label={`Open ${s.tag} on Sensor mapping`} title="Sensor mapping" onClick={() => onOpenSensor(s.tag)}>
                      <MapIcon />
                    </button>
                  </>
                }
              >
                <ResidualBandSpark frame={frame} tag={s.tag} />
              </Tile>
            );
          })}
        </TileGrid>
      )}
    </>
  );
}
