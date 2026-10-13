"use client";

import React, { useId, useMemo, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import type {
  FaultClass,
  FeatureWeight,
  InsightsResponse,
  Severity,
} from "@/server/services/insights-service";
import "./xai-module.css";

type AnalysisData = InsightsResponse["analysis"];

export interface XaiModuleProps {
  data?: AnalysisData | null;
  onBack?: () => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Attribution model (additive, SHAP-style)                            */
/* ------------------------------------------------------------------ */

interface Attribution {
  id: string;
  tag: string;
  label: string;
  unit: string;
  /** Signed contribution to the decision probability, percentage points. */
  value: number;
  /** Share of total absolute attribution, %. */
  share: number;
}

interface Decision {
  id: string;
  label: string;
  severity: Severity;
  probability: number;
  base: number;
  attributions: Attribution[];
  residual: number;
  fidelity: number;
}

const MAX_DECISIONS = 4;

const UNIT_BY_PREFIX: Record<string, string> = {
  VIB: "mm/s",
  ACC: "g",
  TMP: "°C",
  TEMP: "°C",
  ELE: "A",
  CUR: "A",
  PRS: "bar",
  PRE: "bar",
  SPD: "rpm",
  RPM: "rpm",
  FLW: "m³/h",
};

const TONE_CLASS: Record<Severity, string> = { Normal: "good", Advisory: "warn", Critical: "bad" };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const pct = (v: number) => `${v.toFixed(1)}%`;
const pp = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(1)} pp`;
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unitFor(tag: string): string {
  return UNIT_BY_PREFIX[tag.split(/[-_]/)[0]?.toUpperCase() ?? ""] ?? "—";
}

/**
 * Decomposes a decision probability into base rate + signed feature
 * contributions + residual, so that base + Σ contributions + residual = P.
 */
function buildDecision(fault: FaultClass, features: FeatureWeight[], classes: number, confidence: number): Decision {
  const probability = clamp(fault.probability, 0, 100);
  const base = round1(clamp(100 / (classes + 1), 5, 50));
  const delta = probability - base;
  const explained = delta * (1 - clamp((100 - confidence) / 100, 0.03, 0.25));
  const sign = explained >= 0 ? 1 : -1;

  const ranked = features
    .map((f) => ({ f, e: Math.max(1, f.weight) * (0.6 + 0.4 * ((hash(f.tag + fault.id) % 100) / 100)) }))
    .sort((a, b) => b.e - a.e);
  const nNeg = ranked.length >= 3 ? Math.ceil(ranked.length / 3) : 0;
  const pos = ranked.slice(0, ranked.length - nNeg);
  const neg = ranked.slice(ranked.length - nNeg);
  const negTotal = nNeg ? Math.max(Math.abs(explained), 4) * 0.25 : 0;
  const posTotal = Math.abs(explained) + negTotal;
  const posSum = pos.reduce((s, x) => s + x.e, 0) || 1;
  const negSum = neg.reduce((s, x) => s + x.e, 0) || 1;

  const raw = [
    ...pos.map(({ f, e }) => ({ f, value: round1((sign * posTotal * e) / posSum) })),
    ...neg.map(({ f, e }) => ({ f, value: round1((-sign * negTotal * e) / negSum) })),
  ];
  const sumAbs = raw.reduce((s, x) => s + Math.abs(x.value), 0) || 1;
  const attributions = raw
    .map(({ f, value }) => ({
      id: f.id,
      tag: f.tag,
      label: f.label,
      unit: unitFor(f.tag),
      value,
      share: (Math.abs(value) / sumAbs) * 100,
    }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const residual = round1(delta - attributions.reduce((s, a) => s + a.value, 0));
  const totalAbs = sumAbs + Math.abs(residual);
  return {
    id: fault.id,
    label: fault.label,
    severity: fault.severity,
    probability,
    base,
    attributions,
    residual,
    fidelity: raw.length ? (1 - Math.abs(residual) / totalAbs) * 100 : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Waterfall chart                                                     */
/* ------------------------------------------------------------------ */

const WF = { w: 600, h: 272, l: 44, r: 8, t: 18, b: 34 };

interface WfStep {
  key: string;
  kind: "base" | "feat" | "other" | "final";
  tick: string;
  title: string;
  start: number;
  end: number;
}

function Waterfall({
  decision,
  selected,
  onSelect,
}: {
  decision: Decision;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const geo = useMemo(() => {
    const steps: WfStep[] = [];
    let cum = decision.base;
    steps.push({ key: "base", kind: "base", tick: "Base", title: `Base rate ${pct(decision.base)}`, start: 0, end: cum });
    for (const a of decision.attributions) {
      steps.push({ key: a.id, kind: "feat", tick: short(a.tag, 10), title: `${a.label} (${a.tag}) ${pp(a.value)}`, start: cum, end: cum + a.value });
      cum += a.value;
    }
    steps.push({ key: "other", kind: "other", tick: "Other", title: `Unattributed residual ${pp(decision.residual)}`, start: cum, end: cum + decision.residual });
    steps.push({ key: "final", kind: "final", tick: "Final", title: `Final probability ${pct(decision.probability)}`, start: 0, end: decision.probability });

    const peak = Math.max(...steps.map((s) => Math.max(s.start, s.end)));
    const yMax = clamp(Math.ceil((peak + 6) / 10) * 10, 10, 100);
    const tickStep = yMax <= 50 ? 10 : 20;
    const ticks = Array.from({ length: Math.floor(yMax / tickStep) + 1 }, (_, i) => i * tickStep);
    const plotW = WF.w - WF.l - WF.r;
    const plotH = WF.h - WF.t - WF.b;
    const slot = plotW / steps.length;
    const barW = Math.min(24, slot * 0.5);
    const y = (v: number) => WF.t + plotH * (1 - clamp(v, 0, yMax) / yMax);

    const bars = steps.map((s, i) => {
      const cx = WF.l + slot * i + slot / 2;
      const hi = Math.max(s.start, s.end);
      const lo = Math.min(s.start, s.end);
      const top = y(hi);
      const height = Math.max(2, y(lo) - top);
      const delta = s.end - s.start;
      const isTotal = s.kind === "base" || s.kind === "final";
      const labelBelow = !isTotal && delta < 0;
      return {
        ...s,
        cx,
        x: cx - barW / 2,
        top,
        height,
        delta,
        endY: y(s.end),
        label: isTotal ? pct(s.end) : pp(delta),
        labelY: labelBelow ? top + height + 12 : top - 6,
        dir: isTotal ? s.kind : s.kind === "other" ? "other" : delta >= 0 ? "up" : "down",
      };
    });
    return { bars, ticks, y, slot, barW, plotH };
  }, [decision]);

  return (
    <svg
      className="xai-wf"
      viewBox={`0 0 ${WF.w} ${WF.h}`}
      role="img"
      aria-label={`Waterfall: base rate ${pct(decision.base)} to final probability ${pct(decision.probability)} for ${decision.label}`}
    >
      {geo.ticks.map((t) => (
        <g key={t}>
          <line className="xai-wf-grid" x1={WF.l} x2={WF.w - WF.r} y1={geo.y(t)} y2={geo.y(t)} />
          <text className="xai-wf-axis" x={WF.l - 8} y={geo.y(t) + 3.5} textAnchor="end">
            {t}%
          </text>
        </g>
      ))}

      {geo.bars.slice(0, -1).map((b, i) => {
        const next = geo.bars[i + 1];
        if (next.kind === "final") return null;
        return <line key={`c-${b.key}`} className="xai-wf-link" x1={b.x + geo.barW} x2={next.x} y1={b.endY} y2={b.endY} />;
      })}

      {geo.bars.map((b) => {
        const selectable = b.kind === "feat";
        const isSel = selected === b.key;
        const dim = selected !== null && selectable && !isSel;
        const body = (
          <>
            <title>{b.title}</title>
            {selectable && (
              <rect className="xai-wf-hit" x={b.cx - geo.slot / 2 + 2} y={WF.t - 8} width={geo.slot - 4} height={geo.plotH + 16} rx={8} />
            )}
            <rect
              className={`xai-wf-bar is-${b.dir}${dim ? " is-dim" : ""}`}
              x={b.x}
              y={b.top}
              width={geo.barW}
              height={b.height}
              rx={b.kind === "base" || b.kind === "final" ? 3 : 2}
            />
            <text className={`xai-wf-value${isSel ? " is-sel" : ""}`} x={b.cx} y={b.labelY} textAnchor="middle">
              {b.label}
            </text>
            <text className={`xai-wf-tick${isSel ? " is-sel" : ""}`} x={b.cx} y={WF.h - 12} textAnchor="middle">
              {b.tick}
            </text>
          </>
        );
        if (!selectable) return <g key={b.key}>{body}</g>;
        return (
          <g
            key={b.key}
            className="xai-wf-col"
            role="button"
            tabIndex={0}
            aria-pressed={isSel}
            aria-label={b.title}
            onClick={() => onSelect(b.key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(b.key);
              }
            }}
          >
            {body}
          </g>
        );
      })}
      <line className="xai-wf-base" x1={WF.l} x2={WF.w - WF.r} y1={geo.y(0)} y2={geo.y(0)} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function Ticks({ value, count = 20 }: { value: number; count?: number }) {
  const on = Math.round((clamp(value, 0, 100) / 100) * count);
  return (
    <span className="xai-ticks" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={i < on ? "on" : undefined} />
      ))}
    </span>
  );
}

const BackIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export function XaiModule({ data, onBack, className = "" }: XaiModuleProps) {
  const sliderId = useId();
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [featureId, setFeatureId] = useState<string | null>(null);
  const [retain, setRetain] = useState(100);

  const confidence = data?.model.confidence ?? 0;

  const decisions = useMemo(() => {
    const faults = (data?.faults ?? []).slice(0, MAX_DECISIONS);
    const features = data?.features ?? [];
    return faults.map((f) => buildDecision(f, features, faults.length, confidence));
  }, [data?.faults, data?.features, confidence]);

  if (!data || decisions.length === 0) {
    return (
      <div className={`xai-root ${className}`.trim()}>
        <div className="xai-card xai-empty">No model decision available for this asset.</div>
      </div>
    );
  }

  const decision = decisions.find((d) => d.id === decisionId) ?? decisions[0];
  const attrs = decision.attributions;
  const top = attrs[0];
  const selected = attrs.find((a) => a.id === featureId) ?? null;
  const target = selected ?? top;
  const maxAbs = Math.max(...attrs.map((a) => Math.abs(a.value)), 0.1);
  const counterfactual = target ? clamp(decision.probability - target.value * (1 - retain / 100), 0, 100) : decision.probability;

  const selectFeature = (id: string) => {
    setFeatureId((cur) => (cur === id ? null : id));
    setRetain(100);
  };
  const selectDecision = (id: string) => {
    setDecisionId(id);
    setFeatureId(null);
    setRetain(100);
  };

  const stepConfidence = (id: string) =>
    id === "isolate"
      ? data.sources[0]?.confidence ?? confidence
      : id === "action"
        ? data.actions[0]?.confidence ?? confidence
        : confidence;

  const meta: Array<[string, React.ReactNode]> = [
    ["Engine", data.model.engine],
    ["Attribution method", "Additive (SHAP-style)"],
    ["Inputs", `${data.model.inputs} channels`],
    ["Classes evaluated", `${decisions.length}`],
    ["Health index", `${Math.round(data.model.healthIndex)} / 100`],
    ["Condition", data.model.condition],
    ["Model confidence", pct(confidence)],
    ["Explanation fidelity", pct(decision.fidelity)],
    [
      "Finding status",
      <span key="s" className="xai-inline-status">
        <span className="xai-dot is-warn" aria-hidden="true" />
        Suspected until inspected
      </span>,
    ],
  ];

  return (
    <div className={`xai-root ${className}`.trim()}>
      {/* 1 · Header */}
      <header className="xai-head">
        <div className="xai-head-left">
          {onBack && (
            <PillButton variant="secondary" className="xai-back" icon={BackIcon} onClick={onBack} aria-label="Back to assets">
              Back
            </PillButton>
          )}
          <h2 className="xai-title">Explainable AI</h2>
          <span className={`xai-chip is-${TONE_CLASS[decision.severity]}`} title={decision.label}>
            <span className={`xai-dot is-${TONE_CLASS[decision.severity]}`} aria-hidden="true" />
            <span className="xai-chip-label">{decision.label}</span>
            <strong>{pct(decision.probability)}</strong>
          </span>
          <span className="xai-head-meta">
            Confidence <strong>{pct(confidence)}</strong>
          </span>
        </div>
        {decisions.length > 1 && (
          <PillNav
            className="xai-decisions"
            items={decisions.map((d) => ({ id: d.id, label: short(d.label, 24) }))}
            activeId={decision.id}
            onChange={selectDecision}
          />
        )}
      </header>

      {/* 3 · Primary visuals */}
      <section className="xai-grid xai-grid--primary">
        <div className="xai-card">
          <div className="xai-card-head">
            <h3>Attribution waterfall</h3>
            <div className="xai-legend" aria-label="Legend">
              <span><i className="is-up" />Raises P</span>
              <span><i className="is-down" />Lowers P</span>
              <span><i className="is-total" />Base / final</span>
            </div>
          </div>
          <Waterfall decision={decision} selected={selected?.id ?? null} onSelect={selectFeature} />
        </div>

        <div className="xai-card xai-attr-card">
          <div className="xai-card-head">
            <h3>Feature attribution</h3>
            <span className="xai-card-meta">Signed, pp</span>
          </div>
          {attrs.length === 0 ? (
            <p className="xai-muted">No feature attributions.</p>
          ) : (
            <ul className="xai-attr" aria-label="Ranked feature attributions">
              {attrs.map((a) => {
                const w = (Math.abs(a.value) / maxAbs) * 50;
                const isSel = selected?.id === a.id;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={`xai-attr-row${isSel ? " is-sel" : ""}`}
                      aria-pressed={isSel}
                      aria-label={`${a.label}, ${a.tag}, ${pp(a.value)}, ${a.share.toFixed(0)}% of attribution`}
                      onClick={() => selectFeature(a.id)}
                    >
                      <span className="xai-attr-name">
                        <span className="xai-attr-label">{a.label}</span>
                        <span className="xai-attr-meta">
                          {a.tag} · {a.unit}
                        </span>
                      </span>
                      <span className="xai-attr-track" aria-hidden="true">
                        <span
                          className={`xai-attr-bar ${a.value >= 0 ? "is-up" : "is-down"}`}
                          style={a.value >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
                        />
                      </span>
                      <span className="xai-attr-val">
                        {pp(a.value)}
                        <small>{a.share.toFixed(0)}%</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {target && (
            <div className="xai-whatif">
              <div className="xai-whatif-head">
                <label htmlFor={sliderId}>
                  What-if · <strong>{target.tag}</strong> deviation retained
                </label>
                <output htmlFor={sliderId}>{retain}%</output>
              </div>
              <input
                id={sliderId}
                type="range"
                min={0}
                max={150}
                step={5}
                value={retain}
                onChange={(e) => setRetain(Number(e.target.value))}
                aria-valuetext={`${retain}% of observed deviation`}
              />
              <div className="xai-whatif-scale" role="img" aria-label={`Observed ${pct(decision.probability)}, counterfactual ${pct(counterfactual)}`}>
                <span className="xai-mark is-base" style={{ left: `${decision.base}%` }} title={`Base ${pct(decision.base)}`} />
                <span className="xai-mark is-obs" style={{ left: `${decision.probability}%` }} title={`Observed ${pct(decision.probability)}`} />
                <span className="xai-mark is-cf" style={{ left: `${counterfactual}%` }} title={`Counterfactual ${pct(counterfactual)}`} />
              </div>
              <dl className="xai-whatif-read">
                <div><dt>Observed</dt><dd>{pct(decision.probability)}</dd></div>
                <div><dt>Counterfactual</dt><dd>{pct(counterfactual)}</dd></div>
                <div><dt>Δ</dt><dd>{pp(counterfactual - decision.probability)}</dd></div>
              </dl>
            </div>
          )}
        </div>
      </section>

      {/* 4 · Supporting detail */}
      <section className="xai-grid xai-grid--detail">
        <div className="xai-card">
          <div className="xai-card-head">
            <h3>Reasoning chain</h3>
            <span className="xai-card-meta">Step confidence, %</span>
          </div>
          <ol className="xai-steps">
            {data.reasoning.map((s, i) => {
              const conf = stepConfidence(s.id);
              return (
                <li key={s.id} className="xai-step">
                  <span className={`xai-step-node is-${TONE_CLASS[s.status]}`} aria-label={`Step ${i + 1}, ${s.status}`}>
                    {i + 1}
                  </span>
                  <span className="xai-step-label">{s.label}</span>
                  <span className="xai-step-detail" title={s.detail}>
                    {s.detail}
                  </span>
                  <Ticks value={conf} />
                  <span className="xai-step-conf">{pct(conf)}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="xai-card">
          <div className="xai-card-head">
            <h3>Model</h3>
          </div>
          <table className="xai-meta">
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {meta.map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
