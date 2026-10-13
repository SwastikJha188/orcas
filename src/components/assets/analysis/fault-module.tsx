"use client";

import React, { useMemo, useRef, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import type {
  FaultClass,
  FeatureWeight,
  InsightsResponse,
  MaintenanceAction,
} from "@/server/services/insights-service";
import "./fault-module.css";

type AnalysisData = InsightsResponse["analysis"];

export interface FaultModuleProps {
  data?: AnalysisData;
  machineId?: string;
  machineName?: string;
  onBack?: () => void;
  onNavigateToTrends?: (metricKey?: string) => void;
  onNavigateToSensors?: () => void;
}

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

type Tone = "good" | "warn" | "bad" | "neutral";

const THRESHOLD_ADVISORY = 50;
const THRESHOLD_DANGER = 80;

/** Nominal shaft speed used when no fault band declares a 1× reference. */
const DEFAULT_RUN_HZ = 24.2;
/** Rolling-element kinematic ratios (×shaft speed), 11-element DE bearing. */
const BPFO_RATIO = 4.44;
const BPFI_RATIO = 6.56;

/** ISO 10816-3, group 2, rigid foundation — velocity RMS boundaries (mm/s). */
const ISO_ZONES = [
  { id: "A", lo: 0, hi: 1.4, tone: "good" as Tone, weight: 1 },
  { id: "B", lo: 1.4, hi: 2.8, tone: "good" as Tone, weight: 0.5 },
  { id: "C", lo: 2.8, hi: 4.5, tone: "warn" as Tone, weight: 1 },
  { id: "D", lo: 4.5, hi: 7.1, tone: "bad" as Tone, weight: 1 },
];
const ISO_MAX = 7.1;

const SEVERITY_GAIN: Record<FaultClass["severity"], number> = {
  Critical: 3.6,
  Advisory: 2.2,
  Normal: 0.7,
};

const BINS = 480;

/* ------------------------------------------------------------------ */
/* Derivation                                                         */
/* ------------------------------------------------------------------ */

type SignatureKind = "band" | "bpfo" | "bpfi" | "misalign" | "unbalance" | "looseness" | "gear" | "cavitation" | "none";

interface Signature {
  kind: SignatureKind;
  tag: string;
  freqs: number[];
}

interface FaultRow {
  id: string;
  name: string;
  code: string | null;
  probability: number;
  severity: FaultClass["severity"];
  tone: Tone;
  healthy: boolean;
  signature: Signature;
  features: FeatureWeight[];
  action: { title: string; window: string };
}

interface Peak {
  f: number;
  amp: number;
  label: string;
  faultId?: string;
}

const isHealthyClass = (f: FaultClass) =>
  f.id === "nominal" || /healthy|no fault class/i.test(f.label);

function toneFor(f: FaultClass): Tone {
  if (isHealthyClass(f)) return "good";
  if (f.probability >= THRESHOLD_DANGER || f.severity === "Critical") return "bad";
  if (f.probability >= THRESHOLD_ADVISORY || f.severity === "Advisory") return "warn";
  return "neutral";
}

function splitLabel(label: string): { name: string; code: string | null } {
  const coded = label.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (coded) return { name: coded[1], code: coded[2] };
  const dashed = label.split(/\s+[—–-]\s+/);
  return { name: dashed[0], code: null };
}

function parseHz(band: string): number | null {
  const m = band.match(/(\d+(?:\.\d+)?)\s*Hz/i);
  return m ? parseFloat(m[1]) : null;
}

function bandTag(band: string): string | null {
  const m = band.match(/\(([^)]+)\)/);
  return m ? m[1] : null;
}

function deriveRunSpeed(faults: FaultClass[]): number {
  for (const f of faults) {
    const hz = parseHz(f.band);
    if (hz && /\b1(?:\.0+)?\s*x\b|running speed|run speed|motor speed/i.test(f.band)) return hz;
  }
  return DEFAULT_RUN_HZ;
}

function signatureFor(f: FaultClass, run: number): Signature {
  if (isHealthyClass(f)) return { kind: "none", tag: "—", freqs: [] };
  const text = `${f.label} ${f.band}`.toLowerCase();
  const hz = parseHz(f.band);
  const kind: SignatureKind = /bpfo|outer/.test(text)
    ? "bpfo"
    : /bpfi|inner/.test(text)
    ? "bpfi"
    : /misalign|coupling/.test(text)
    ? "misalign"
    : /unbalanc|imbalanc/.test(text)
    ? "unbalance"
    : /loose|soft foot/.test(text)
    ? "looseness"
    : /gear|gmf|mesh/.test(text)
    ? "gear"
    : /cavitat|broadband/.test(text)
    ? "cavitation"
    : "band";

  if (hz !== null && hz > 0) {
    return { kind, tag: bandTag(f.band) ?? "Peak", freqs: [hz, hz * 2] };
  }
  switch (kind) {
    case "bpfo":
      return { kind, tag: "BPFO", freqs: [run * BPFO_RATIO, run * BPFO_RATIO * 2] };
    case "bpfi":
      return { kind, tag: "BPFI", freqs: [run * BPFI_RATIO, run * BPFI_RATIO * 2] };
    case "misalign":
      return { kind, tag: "2×", freqs: [run * 2] };
    case "unbalance":
      return { kind, tag: "1×", freqs: [run] };
    case "looseness":
      return { kind, tag: "0.5× sub", freqs: [run * 0.5, run * 1.5, run * 2.5] };
    case "cavitation":
      return { kind, tag: "Broadband HF", freqs: [] };
    default:
      return { kind, tag: f.band && f.band !== "—" ? f.band : "—", freqs: [] };
  }
}

const ACTION_VERB: Record<SignatureKind, string> = {
  bpfo: "Replace bearing",
  bpfi: "Replace bearing",
  misalign: "Laser-align coupling",
  unbalance: "Balance rotor",
  looseness: "Re-torque base",
  gear: "Inspect gear mesh",
  cavitation: "Check NPSH margin",
  band: "Inspect component",
  none: "Continue monitoring",
};

function actionFor(row: Pick<FaultRow, "id" | "tone" | "healthy" | "signature">, actions: MaintenanceAction[]) {
  const matched = actions.find((a) => a.id === row.id);
  if (matched) return { title: matched.title, window: matched.window };
  if (row.healthy) return { title: ACTION_VERB.none, window: "Routine" };
  if (row.tone === "bad") return { title: ACTION_VERB[row.signature.kind], window: "≤ 72 h" };
  if (row.tone === "warn") return { title: `Verify · ${ACTION_VERB[row.signature.kind].toLowerCase()}`, window: "≤ 2 wk" };
  return { title: "Monitor", window: "Routine" };
}

function featuresFor(id: string, features: FeatureWeight[]): FeatureWeight[] {
  const own = features.filter((x) => x.id === id || x.tag === id);
  const rest = features.filter((x) => x.id !== id && x.tag !== id);
  return [...own, ...rest].slice(0, 2);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h % 997);
}

function pseudo(i: number, seed: number): number {
  const x = Math.sin((i + seed) * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function niceStep(span: number, target: number): number {
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

function ticks(max: number, step: number): number[] {
  const out: number[] = [];
  for (let v = 0; v <= max + step * 1e-6; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                         */
/* ------------------------------------------------------------------ */

const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtMms = (v: number) => `${v.toFixed(2)} mm/s`;
const fmtHz = (f: number) => (f < 0.01 ? f.toFixed(3) : f < 1 ? f.toFixed(2) : f.toFixed(1));

function fmtOrder(f: number, run: number): string {
  const o = f / run;
  if (o < 0.1) return "< 0.1×";
  if (Math.abs(o - Math.round(o)) < 0.04) return `${Math.round(o)}×`;
  return `${o.toFixed(2)}×`;
}

/** Order plus a distinct label, e.g. "4.44× · BPFO"; omits a label that repeats the order. */
function withOrder(f: number, run: number, label?: string): string {
  const order = fmtOrder(f, run);
  return label && label !== order ? `${order} · ${label}` : order;
}

function fmtAxis(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(v < 1 ? 2 : 1);
}

/* ------------------------------------------------------------------ */
/* Icons                                                              */
/* ------------------------------------------------------------------ */

function ToneIcon({ tone }: { tone: Tone }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (tone === "bad")
    return (
      <svg {...common}>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 10v4M12 17h.01" />
      </svg>
    );
  if (tone === "warn")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    );
  if (tone === "good")
    return (
      <svg {...common}>
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </svg>
  );
}

const TONE_LABEL: Record<Tone, string> = {
  bad: "Danger",
  warn: "Advisory",
  good: "Healthy",
  neutral: "Below threshold",
};

/* ------------------------------------------------------------------ */
/* Spectrum geometry                                                  */
/* ------------------------------------------------------------------ */

const SP_W = 640;
const SP_H = 236;
const SP_L = 44;
const SP_R = 14;
const SP_T = 30;
const SP_B = 28;
const SP_PW = SP_W - SP_L - SP_R;
const SP_PH = SP_H - SP_T - SP_B;

const ISO_W = 640;
const ISO_H = 54;
const ISO_L = 44;
const ISO_R = 14;
const ISO_PW = ISO_W - ISO_L - ISO_R;

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function FaultModule({ data, onBack }: FaultModuleProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [hoverBin, setHoverBin] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  /* ---- classification model ---- */
  const model = useMemo(() => {
    const faults = [...(data?.faults ?? [])].sort((a, b) => b.probability - a.probability);
    const features = [...(data?.features ?? [])].sort((a, b) => b.weight - a.weight);
    const actions = data?.actions ?? [];
    const run = deriveRunSpeed(faults);
    const rows: FaultRow[] = faults.map((f) => {
      const { name, code } = splitLabel(f.label);
      const healthy = isHealthyClass(f);
      const tone = toneFor(f);
      const signature = signatureFor(f, run);
      const base = { id: f.id, tone, healthy, signature };
      return {
        ...base,
        name,
        code,
        probability: f.probability,
        severity: f.severity,
        features: featuresFor(f.id, features),
        action: actionFor(base, actions),
      };
    });
    const channels = features.slice(0, 4).map((f) => ({ id: f.tag, label: f.tag, weight: f.weight }));
    return { rows, run, channels, features };
  }, [data]);

  const top = model.rows[0];
  const selected = model.rows.find((r) => r.id === selectedId) ?? top;
  const channel = model.channels.find((c) => c.id === channelId) ?? model.channels[0];

  /* ---- spectrum (reconstructed from classifier frequency bands) ---- */
  const spectrum = useMemo(() => {
    const { run, rows, channels } = model;
    const maxW = channels[0]?.weight || 1;
    const gain = channel ? 0.55 + 0.45 * (channel.weight / maxW) : 1;
    const seed = channel ? hash(channel.id) : 17;

    const sigMax = Math.max(0, ...rows.flatMap((r) => r.signature.freqs));
    const rawMax = Math.max(run * 7.5, Math.min(sigMax * 1.15, run * 25));
    const xStep = niceStep(rawMax, 6);
    const fMax = Math.ceil(rawMax / xStep) * xStep;
    const df = fMax / BINS;
    const minF = df * 2;

    const peaks: Peak[] = [
      { f: run, amp: 0.42 * gain, label: "1×" },
      { f: run * 2, amp: 0.24 * gain, label: "2×" },
      { f: run * 3, amp: 0.1 * gain, label: "3×" },
    ];
    for (const r of rows) {
      if (r.healthy) continue;
      const amp = (r.probability / 100) * SEVERITY_GAIN[r.severity] * gain;
      r.signature.freqs.forEach((f, k) => {
        if (f < minF || f > fMax) return;
        peaks.push({ f, amp: amp / 1.6 ** k, label: k === 0 ? r.signature.tag : `${k + 1}× ${r.signature.tag}`, faultId: r.id });
      });
    }

    const width = df * 1.4;
    const amps: number[] = new Array(BINS + 1);
    for (let i = 0; i <= BINS; i++) {
      const f = i * df;
      let a = 0.018 + 0.022 * pseudo(i, seed) + 0.05 * Math.exp(-f / (run * 0.5));
      for (const p of peaks) {
        const d = (f - p.f) / width;
        a += p.amp / (1 + d * d);
      }
      amps[i] = a;
    }

    const overall = Math.sqrt(peaks.reduce((s, p) => s + p.amp * p.amp, 0) + 0.05 * 0.05);
    const dominant = peaks.reduce((m, p) => (p.amp > m.amp ? p : m), peaks[0]);
    const yMaxRaw = Math.max(...amps) * 1.15;
    const yStep = niceStep(yMaxRaw, 4);
    const yMax = Math.ceil(yMaxRaw / yStep) * yStep;

    return { amps, df, fMax, xStep, yMax, yStep, peaks, overall, dominant };
  }, [model, channel]);

  /* ---- spectrum SVG paths ---- */
  const geom = useMemo(() => {
    const { amps, df, fMax, xStep, yMax, yStep, peaks } = spectrum;
    const x = (f: number) => SP_L + (f / fMax) * SP_PW;
    const y = (a: number) => SP_T + SP_PH - (Math.min(a, yMax) / yMax) * SP_PH;
    let line = "";
    amps.forEach((a, i) => {
      line += `${i === 0 ? "M" : "L"}${x(i * df).toFixed(1)},${y(a).toFixed(1)}`;
    });
    const area = `${line}L${x(fMax).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z`;

    const run = model.run;
    const orderMarkers = [
      { f: run, label: "1×" },
      { f: run * 2, label: "2×" },
      { f: run * 3, label: "3×" },
      { f: run * BPFO_RATIO, label: "BPFO" },
      { f: run * BPFI_RATIO, label: "BPFI" },
    ];
    for (const r of model.rows) {
      const fund = r.signature.freqs[0];
      if (r.signature.kind === "band" || r.signature.kind === "gear") {
        if (fund && /^[A-Z]{2,5}$/.test(r.signature.tag)) orderMarkers.push({ f: fund, label: r.signature.tag });
      }
    }
    const markers = orderMarkers
      .filter((m) => m.f > 0 && m.f <= fMax)
      .sort((a, b) => a.f - b.f)
      .reduce<Array<{ f: number; label: string; px: number; row: number }>>((acc, m) => {
        const px = x(m.f);
        const prev = acc[acc.length - 1];
        if (prev && Math.abs(prev.f - m.f) / m.f < 0.01) return acc;
        const row = prev && px - prev.px < 30 && prev.row === 0 ? 1 : 0;
        acc.push({ ...m, px, row });
        return acc;
      }, []);

    const sortedPeaks = [...peaks].sort((a, b) => a.f - b.f);
    return {
      x,
      y,
      line,
      area,
      markers,
      sortedPeaks,
      xTicks: ticks(fMax, xStep),
      yTicks: ticks(yMax, yStep),
      binOf: (f: number) => Math.max(0, Math.min(BINS, Math.round(f / df))),
    };
  }, [spectrum, model]);

  /* ---- derived figures ---- */
  const overall = spectrum.overall;
  const zone = ISO_ZONES.find((z) => overall < z.hi) ?? ISO_ZONES[ISO_ZONES.length - 1];
  const dominant = spectrum.dominant;
  const confidence = data?.model.confidence ?? 0;

  const selectedPeaks = selected ? spectrum.peaks.filter((p) => p.faultId === selected.id) : [];
  const highlightTone: Tone = selected && selected.tone !== "neutral" ? selected.tone : "neutral";

  /* ---- spectrum interaction ---- */
  const onSpectrumMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const vx = ((e.clientX - rect.left) / rect.width) * SP_W;
    if (vx < SP_L || vx > SP_W - SP_R) {
      setHoverBin(null);
      return;
    }
    const f = ((vx - SP_L) / SP_PW) * spectrum.fMax;
    // snap to a nearby peak when within 6px, else nearest bin
    const snap = geom.sortedPeaks.find((p) => Math.abs(geom.x(p.f) - vx) < 6);
    setHoverBin(geom.binOf(snap ? snap.f : f));
  };

  const onSpectrumKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const list = geom.sortedPeaks;
    if (list.length === 0) return;
    if (e.key === "Escape") {
      setHoverBin(null);
      return;
    }
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const currentF = hoverBin === null ? -1 : hoverBin * spectrum.df;
    const next =
      e.key === "ArrowRight"
        ? list.find((p) => p.f > currentF + spectrum.df) ?? list[0]
        : [...list].reverse().find((p) => p.f < currentF - spectrum.df) ?? list[list.length - 1];
    setHoverBin(geom.binOf(next.f));
  };

  const hover =
    hoverBin === null
      ? null
      : (() => {
          const f = hoverBin * spectrum.df;
          const amp = spectrum.amps[hoverBin];
          const peak = geom.sortedPeaks.find((p) => Math.abs(p.f - f) <= spectrum.df * 1.5);
          return { f, amp, peak, px: geom.x(f), py: geom.y(amp) };
        })();

  /* ---- empty state ---- */
  if (!top) {
    return (
      <div className="flt-page" role="region" aria-label="Fault diagnosis">
        <header className="flt-head">
          <div className="flt-head-left">
            {onBack && <BackButton onBack={onBack} />}
            <h2 className="flt-title">Fault diagnosis</h2>
          </div>
        </header>
        <div className="flt-card flt-empty">No fault classification available</div>
      </div>
    );
  }

  const isoX = (v: number) => ISO_L + (Math.min(v, ISO_MAX) / ISO_MAX) * ISO_PW;

  return (
    <div className="flt-page" role="region" aria-label="Fault diagnosis">
      {/* 1 · Header ------------------------------------------------------ */}
      <header className="flt-head">
        <div className="flt-head-left">
          {onBack && <BackButton onBack={onBack} />}
          <h2 className="flt-title">Fault diagnosis</h2>
          <span className={`flt-chip flt-tone-${top.tone}`} title={top.name}>
            <span className="flt-dot" aria-hidden="true" />
            <span className="flt-chip-name">{top.name}</span>
            <strong>{fmtPct(top.probability)}</strong>
          </span>
          <span className="flt-meta">
            Confidence <strong>{fmtPct(confidence)}</strong>
          </span>
        </div>
        {model.channels.length > 0 && (
          <PillNav
            className="flt-channels"
            items={model.channels.map((c) => ({ id: c.id, label: c.label }))}
            activeId={channel?.id ?? ""}
            onChange={(id) => {
              setChannelId(id);
              setHoverBin(null);
            }}
          />
        )}
      </header>

      {/* 3 · Primary visual --------------------------------------------- */}
      <section className="flt-primary">
        {/* Probability ranking */}
        <div className="flt-card flt-panel">
          <div className="flt-panel-head">
            <h3 className="flt-panel-title">Class probability</h3>
            <span className="flt-legend">
              <span className="flt-legend-key flt-tone-warn" aria-hidden="true" />
              {THRESHOLD_ADVISORY}%
              <span className="flt-legend-key flt-tone-bad" aria-hidden="true" />
              {THRESHOLD_DANGER}%
            </span>
          </div>

          <div className="flt-bars" role="group" aria-label="Fault class probability, select a class to highlight its spectral signature">
            {model.rows.map((r, i) => {
              const isSel = r.id === selected?.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`flt-bar-row ${isSel ? "is-selected" : ""}`}
                  aria-pressed={isSel}
                  aria-label={`${r.name}, ${fmtPct(r.probability)}, ${TONE_LABEL[r.tone]}`}
                  onClick={() => setSelectedId(r.id)}
                >
                  <span className="flt-bar-text">
                    <span className="flt-bar-rank">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flt-bar-name">{r.name}</span>
                    <span className="flt-bar-val">{fmtPct(r.probability)}</span>
                  </span>
                  <span className="flt-bar-track">
                    <span
                      className={`flt-bar-fill flt-tone-${r.tone === "neutral" && isSel ? "sel" : r.tone}`}
                      style={{ width: `${Math.max(0.6, Math.min(100, r.probability))}%` }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flt-bar-axis" aria-hidden="true">
            {[0, 25, 50, 75, 100].map((t) => (
              <span key={t} style={{ "--flt-at": t / 100 } as React.CSSProperties}>
                {t}%
              </span>
            ))}
          </div>
        </div>

        {/* Spectrum + ISO */}
        <div className="flt-card flt-panel">
          <div className="flt-panel-head">
            <h3 className="flt-panel-title">Velocity spectrum <span className="flt-panel-note">· reconstructed from classifier bands</span></h3>
            <span className="flt-panel-meta">
              {channel ? `${channel.label} · ` : ""}0–{fmtAxis(spectrum.fMax)} Hz · 1× {fmtHz(model.run)} Hz
            </span>
          </div>

          <div
            className="flt-spectrum"
            tabIndex={0}
            role="group"
            aria-label="Velocity spectrum explorer. Use left and right arrow keys to step through peaks."
            onKeyDown={onSpectrumKey}
            onBlur={() => setHoverBin(null)}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SP_W} ${SP_H}`}
              className="flt-svg"
              role="img"
              aria-label={`Velocity spectrum 0 to ${fmtAxis(spectrum.fMax)} Hz. Dominant peak ${fmtHz(dominant.f)} Hz at ${fmtMms(dominant.amp)}. Overall ${fmtMms(overall)} RMS.`}
              onPointerMove={onSpectrumMove}
              onPointerLeave={() => setHoverBin(null)}
            >
              {/* grid + y axis */}
              {geom.yTicks.map((t) => (
                <g key={`y${t}`}>
                  <line className="flt-grid" x1={SP_L} x2={SP_W - SP_R} y1={geom.y(t)} y2={geom.y(t)} />
                  <text className="flt-axis-text" x={SP_L - 8} y={geom.y(t) + 3.5} textAnchor="end">
                    {fmtAxis(t)}
                  </text>
                </g>
              ))}
              <text className="flt-axis-unit" x={SP_L - 8} y={SP_T - 18} textAnchor="end">
                mm/s
              </text>

              {/* x axis */}
              {geom.xTicks.map((t, i) => {
                const last = i === geom.xTicks.length - 1;
                return (
                  <text key={`x${t}`} className="flt-axis-text" x={geom.x(t)} y={SP_H - 10} textAnchor={last ? "end" : "middle"}>
                    {fmtAxis(t)}
                    {last && <tspan className="flt-axis-unit"> Hz</tspan>}
                  </text>
                );
              })}

              {/* order markers */}
              {geom.markers.map((m) => (
                <g key={`m${m.label}`}>
                  <line className="flt-marker" x1={m.px} x2={m.px} y1={SP_T - 4 - m.row * 11} y2={SP_T + SP_PH} />
                  <text className="flt-marker-text" x={m.px} y={SP_T - 8 - m.row * 11} textAnchor="middle">
                    {m.label}
                  </text>
                </g>
              ))}

              {/* data */}
              <path className="flt-area" d={geom.area} />
              <path className="flt-line" d={geom.line} />

              {/* selected signature */}
              {selectedPeaks.map((p, k) => {
                const px = geom.x(p.f);
                const py = geom.y(spectrum.amps[geom.binOf(p.f)]);
                return (
                  <g key={`s${k}`} className={`flt-sig flt-tone-${highlightTone === "neutral" ? "sel" : highlightTone}`}>
                    <circle cx={px} cy={py} r={4.5} />
                    {k === 0 && (
                      <text className="flt-peak-text" x={px} y={Math.max(SP_T + 10, py - 10)} textAnchor={px > SP_W - 80 ? "end" : "middle"}>
                        {fmtHz(p.f)} Hz
                      </text>
                    )}
                  </g>
                );
              })}

              {/* dominant peak annotation */}
              {!selectedPeaks.some((p) => p === dominant) && (
                <text
                  className="flt-peak-text is-muted"
                  x={geom.x(dominant.f)}
                  y={Math.max(SP_T + 10, geom.y(spectrum.amps[geom.binOf(dominant.f)]) - 8)}
                  textAnchor={geom.x(dominant.f) > SP_W - 80 ? "end" : geom.x(dominant.f) < SP_L + 40 ? "start" : "middle"}
                >
                  {fmtHz(dominant.f)} Hz
                </text>
              )}

              {/* baseline */}
              <line className="flt-baseline" x1={SP_L} x2={SP_W - SP_R} y1={SP_T + SP_PH} y2={SP_T + SP_PH} />

              {/* crosshair */}
              {hover && (
                <g className="flt-cross" aria-hidden="true">
                  <line x1={hover.px} x2={hover.px} y1={SP_T} y2={SP_T + SP_PH} />
                  <circle cx={hover.px} cy={hover.py} r={4} />
                </g>
              )}
            </svg>

            {hover && (
              <div
                className={`flt-tip ${hover.px > SP_W * 0.72 ? "is-left" : ""}`}
                style={{ left: `${(hover.px / SP_W) * 100}%`, top: `${(Math.max(hover.py, SP_T + 20) / SP_H) * 100}%` }}
                role="status"
              >
                <strong>{fmtMms(hover.amp)}</strong>
                <span>
                  {fmtHz(hover.f)} Hz · {withOrder(hover.f, model.run, hover.peak?.label)}
                </span>
              </div>
            )}
          </div>

          {/* ISO 10816-3 severity scale */}
          <div className="flt-iso">
            <span className="flt-iso-label">ISO 10816-3</span>
            <svg
              viewBox={`0 0 ${ISO_W} ${ISO_H}`}
              className="flt-svg"
              role="img"
              aria-label={`ISO 10816-3 severity: zone ${zone.id}, overall velocity ${fmtMms(overall)} RMS.`}
            >
              {ISO_ZONES.map((z, i) => {
                const x0 = isoX(z.lo) + (i === 0 ? 0 : 1);
                const x1 = isoX(z.hi) - (i === ISO_ZONES.length - 1 ? 0 : 1);
                const current = z.id === zone.id;
                return (
                  <g key={z.id}>
                    <rect
                      className={`flt-iso-seg flt-tone-${z.tone}`}
                      x={x0}
                      y={18}
                      width={Math.max(0, x1 - x0)}
                      height={8}
                      rx={2}
                      style={{ opacity: z.weight * (current ? 1 : 0.38) }}
                    />
                    <text className={`flt-iso-zone ${current ? "is-current" : ""}`} x={(x0 + x1) / 2} y={42} textAnchor="middle">
                      {z.id}
                    </text>
                    {i > 0 && (
                      <text className="flt-axis-text" x={isoX(z.lo)} y={52} textAnchor="middle">
                        {z.lo}
                      </text>
                    )}
                  </g>
                );
              })}
              <text className="flt-axis-unit" x={ISO_W - ISO_R} y={52} textAnchor="end">
                mm/s
              </text>
              <g className="flt-iso-marker">
                <path d={`M${isoX(overall) - 5},6 L${isoX(overall) + 5},6 L${isoX(overall)},13 Z`} />
                <line x1={isoX(overall)} x2={isoX(overall)} y1={13} y2={29} />
              </g>
              <text
                className="flt-peak-text"
                x={isoX(overall) > ISO_W - 120 ? isoX(overall) - 9 : isoX(overall) + 9}
                y={12}
                textAnchor={isoX(overall) > ISO_W - 120 ? "end" : "start"}
              >
                {fmtMms(overall)}
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* 4 · Detail table ----------------------------------------------- */}
      <section className="flt-card flt-panel" aria-label="Fault class detail">
        <div className="flt-panel-head">
          <h3 className="flt-panel-title">Fault classes</h3>
          <span className="flt-panel-meta">{model.rows.length} classes</span>
        </div>
        <div className="flt-table-wrap">
          <table className="flt-table">
            <thead>
              <tr>
                <th scope="col">Fault class</th>
                <th scope="col" className="is-num">
                  Probability
                </th>
                <th scope="col">Key features</th>
                <th scope="col">Signature</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {model.rows.map((r) => {
                const isSel = r.id === selected?.id;
                const fund = r.signature.freqs[0];
                return (
                  <tr
                    key={r.id}
                    className={isSel ? "is-selected" : ""}
                    tabIndex={0}
                    aria-selected={isSel}
                    onClick={() => setSelectedId(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(r.id);
                      }
                    }}
                  >
                    <td>
                      <div className="flt-lead">
                        <span className={`flt-badge flt-tone-${r.tone}`} title={TONE_LABEL[r.tone]}>
                          <ToneIcon tone={r.tone} />
                        </span>
                        <span className="flt-lead-text">
                          <span className="flt-lead-name">{r.name}</span>
                          <span className="flt-lead-meta">
                            {TONE_LABEL[r.tone]}
                            {r.code ? ` · ${r.code}` : ""}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="is-num">
                      <span className="flt-num">{fmtPct(r.probability)}</span>
                    </td>
                    <td>
                      <span className="flt-feats">
                        {r.features.length === 0
                          ? "—"
                          : r.features.map((f) => (
                              <span key={f.id} className="flt-feat" title={f.label}>
                                <span className="flt-feat-tag">{f.tag}</span>
                                <span className="flt-num">{f.weight.toFixed(1)}%</span>
                              </span>
                            ))}
                      </span>
                    </td>
                    <td>
                      {fund ? (
                        <span className="flt-sigcell">
                          <span className="flt-num">{fmtHz(fund)} Hz</span>
                          <span className="flt-lead-meta">
                            {withOrder(fund, model.run, r.signature.tag)}
                          </span>
                        </span>
                      ) : (
                        <span className="flt-lead-meta">{r.signature.tag}</span>
                      )}
                    </td>
                    <td>
                      <span className="flt-sigcell">
                        <span className="flt-action">{r.action.title}</span>
                        <span className="flt-lead-meta">{r.action.window}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <PillButton variant="secondary" className="flt-back" onClick={onBack} aria-label="Back to analysis overview">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </PillButton>
  );
}

export default FaultModule;
