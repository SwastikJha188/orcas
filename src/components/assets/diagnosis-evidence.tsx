"use client";

import React, { useState } from "react";
import { Table, type Column } from "@/components/ui";
import { formatDuration, type SimFrame } from "@/lib/kiln-sim/engine";
import { StatusTag } from "./assets-shell-ui";
import { VALIDITY_LABEL, VALIDITY_TONE, type DxSensor, type Validity } from "./diagnosis-model";
import { twoSided, twoSidedText, twoSidedValues, type TwoSided } from "./sensor-gauge";

export function evidenceRowId(tag: string): string {
  return `pg-diag-ev-${tag.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

function fmt(v: number): string {
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 100 ? 1 : 2);
}

const pctX = (n: number, d0: number, d1: number) => `${(3 + ((n - d0) / (d1 - d0)) * 94).toFixed(2)}%`;

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
    <svg className="dxo-limit-bar" width="100%" height="14" role="img" aria-label={`${fmt(v)} ${s.unit}; warning ${warn}; alarm ${alarm} ${s.unit}`}>
      <rect x="0" y="6" width="100%" height="2" rx="1" fill="var(--dx-track)" />
      {ticks.map(([t, fill], i) => (t === undefined ? null : <rect key={i} x={x(t)} y="2" width="2" height="10" rx="1" fill={fill} transform="translate(-1 0)" />))}
      {s.model !== null && <circle cx={x(s.model)} cy="7" r="3.5" fill="none" stroke="var(--dx-ink-2)" strokeWidth="1.2" />}
      <circle cx={x(v)} cy="7" r="4" fill={dot} stroke="var(--card-bg)" strokeWidth="2" />
    </svg>
  );
}

function ModelLimitBar({ s, band }: { s: DxSensor; band: TwoSided | null }) {
  const v = s.value;
  if (v !== null && band) return <BandLimitBar s={s} v={v} band={band} />;
  const w = s.warn;
  const a = s.alarm;
  if (v === null || w === null || a === null) return <span className="dxo-none">—</span>;
  const pts = [v, w, a, ...(s.model !== null ? [s.model] : [])];
  const lo = Math.min(0, ...pts);
  const hi = Math.max(...pts);
  const pad = (hi - lo) * 0.12 || 1;
  const d0 = lo < 0 ? lo - pad : 0;
  const d1 = hi + pad;
  const x = (n: number) => pctX(n, d0, d1);
  const dot = s.severity === "Critical" ? "var(--status-danger)" : s.severity === "Advisory" ? "var(--status-warning)" : "var(--dx-ink-2)";
  return (
    <svg className="dxo-limit-bar" width="100%" height="14" role="img" aria-label={`${fmt(v)} ${s.unit}; warning ${w}; alarm ${a} ${s.unit}`}>
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

function ResidualBandSpark({ frame, tag }: { frame: SimFrame | null; tag: string }) {
  const h = frame?.history[tag];
  const m = frame?.modelHistory[tag];
  const sigma = frame?.defs.signalByTag[tag]?.sigma;
  if (!h || !m || !sigma || h.length < 2) return <span className="ast-muted">—</span>;
  const n = Math.min(60, h.length, m.length);
  const r = Array.from({ length: n }, (_, i) => (h[h.length - n + i] - m[m.length - n + i]) / sigma);
  const W = 160;
  const H = 24;
  const lim = Math.max(4, ...r.map((v) => Math.abs(v)));
  const y = (v: number) => H / 2 - (v / lim) * (H / 2 - 1);
  const x = (i: number) => (i / (n - 1)) * W;
  const d = r.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return (
    <svg className="pg-diag-spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${tag} residual trend over ${formatDuration(n)}`}>
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

  const cols: Column<DxSensor>[] = [
    {
      key: "sensor",
      header: "Sensor",
      width: "210px",
      render: (s) => (
        <span className="ast-cell-stack" id={evidenceRowId(s.tag)} data-tag={s.tag}>
          <span className="ast-cell-title ast-num">{s.tag} · {s.name}</span>
          {s.subAssembly && <span className="ast-cell-sub">{s.subAssembly}</span>}
        </span>
      ),
    },
    {
      key: "reading",
      header: "Current reading",
      width: "130px",
      render: (s) => {
        const tone = s.severity === "Critical" ? "bad" : s.severity === "Advisory" ? "warn" : undefined;
        return (
          <span className="ast-num" style={{ fontWeight: 600, color: tone === "bad" ? "var(--status-danger)" : tone === "warn" ? "var(--status-warning)" : undefined }}>
            {s.value !== null ? fmt(s.value) : s.display}
            {s.value !== null && s.unit && s.unit !== "state" && <span className="ast-unit"> {s.unit}</span>}
          </span>
        );
      },
    },
    {
      key: "expected",
      header: "Expected / Normal",
      width: "135px",
      render: (s) => (
        <span className="ast-num ast-muted">
          {s.model !== null ? `${fmt(s.model)} ${s.unit !== "state" ? s.unit : ""}` : "—"}
        </span>
      ),
    },
    {
      key: "residual",
      header: "Deviation",
      width: "100px",
      render: (s) => {
        const zTone = s.z !== null && Math.abs(s.z) >= 3 ? "bad" : s.z !== null && Math.abs(s.z) >= 2 ? "warn" : undefined;
        return (
          <span className="ast-num" style={{ color: zTone === "bad" ? "var(--status-danger)" : zTone === "warn" ? "var(--status-warning)" : undefined }}>
            {s.z !== null ? `${s.z >= 0 ? "+" : "−"}${Math.abs(s.z).toFixed(1)} σ` : "—"}
          </span>
        );
      },
    },
    {
      key: "limitBar",
      header: "Position vs limits",
      width: "160px",
      render: (s) => (
        <div style={{ width: 140 }}>
          <ModelLimitBar s={s} band={s.band ?? twoSided(frame?.defs.signalByTag[s.tag]?.limit, s.model)} />
        </div>
      ),
    },
    {
      key: "spark",
      header: "1h residual graph",
      width: "175px",
      render: (s) => <ResidualBandSpark frame={frame} tag={s.tag} />,
    },
    {
      key: "rules",
      header: "Rules triggered",
      width: "140px",
      render: (s) => {
        const rules = citedBy.get(s.tag) ?? [];
        return <span className="ast-mono">{rules.length ? rules.join(", ") : "—"}</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (s) => {
        const vTone = VALIDITY_TONE[s.validity];
        const sTone = s.severity === "Critical" ? "bad" : s.severity === "Advisory" ? "warn" : "good";
        if (s.validity !== "valid") {
          return <StatusTag tone={vTone} label={VALIDITY_LABEL[s.validity]} />;
        }
        return <StatusTag tone={sTone} label={s.severity} />;
      },
    },
    {
      key: "actions",
      header: "",
      width: "80px",
      render: (s) => (
        <span style={{ display: "inline-flex", gap: 4 }}>
          <button type="button" className="dxo-icon-btn" aria-label={`Open trend for ${s.tag}`} title="Open in Trends" onClick={() => onOpenTrend(s.tag)}>
            <TrendIcon />
          </button>
          <button type="button" className="dxo-icon-btn" aria-label={`Open ${s.tag} in Sensors`} title="Open in Sensors" onClick={() => onOpenSensor(s.tag)}>
            <MapIcon />
          </button>
        </span>
      ),
    },
  ];

  return (
    <section className="ast-card pg-table-card" aria-label="Sensor evidence">
      <div className="ast-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span className="ast-num pg-diag-pipe" aria-label="Sensor validity across the machine">
          {counts.map((c) => (
            <span key={c.v}>
              {c.n} {VALIDITY_LABEL[c.v].toLowerCase()}
            </span>
          ))}
          {frame && frame.pipeline.held > 0 && <span>{frame.pipeline.held} held</span>}
        </span>
        <span className="dxo-toolbar-group">
          {scopeLabel ? (
            <button type="button" className="dxo-filter-chip" onClick={onClearScope} aria-label={`Clear rule filter ${scopeLabel}`}>
              Filtered to {scopeLabel}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button type="button" className="dxo-link" aria-pressed={showAll} onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Only off-normal & cited" : `Show all ${allSensors.length} sensors`}
            </button>
          )}
          <button type="button" className="dxo-link" onClick={() => onOpenSensor()}>
            Open Sensors →
          </button>
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="pg-diag-missing" style={{ padding: "12px 16px", margin: 0 }}>
          {loading
            ? "Loading sensor catalog…"
            : allSensors.length === 0
              ? "No sensors mapped to this machine."
              : scopeLabel
                ? "This rule reads no mapped sensor."
                : "All sensors are within normal limits."}
        </p>
      ) : (
        <Table columns={cols} data={rows} keyExtractor={(s) => s.tag} />
      )}
    </section>
  );
}
