"use client";

import React, { useMemo } from "react";
import { SIGNALS, SYSTEMS } from "@/lib/kiln-sim/signals";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import {
  StatusTag,
  Ticks,
  type Tone,
} from "@/components/assets/assets-shell-ui";
import "./assetiq-ai.css";

/* Actual vs reference model per system: residual distribution over the last
   hour, drift against the hour before, and baseline learning (D4: 14 days). */

const WINDOW = 60;
const BIN = 0.5;
const EDGE = 3.5; // bins span −3.5σ…+3.5σ; tails fold into the end bins
const NBINS = (EDGE * 2) / BIN;
const BASELINE_DAYS = 14;
/** Days of baseline each system had learned when the demo starts. */
const LEARNED_AT_START: Record<string, number> = {
  "DRV-KLN-01": 9.4,
  "SUP-KLN-01": 7.8,
  "SHL-KLN-01": 6.1,
};

interface SystemStats {
  id: string;
  name: string;
  signals: number;
  bins: number[];
  rms: number;
  bias: number;
  drift: number;
  tailPct: number;
  tone: Tone;
  label: string;
  learnedDays: number;
}

function mean(a: number[]) {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}

function compute(frame: SimFrame): SystemStats[] {
  return SYSTEMS.filter((s) => s.scored).map((sys) => {
    const defs = SIGNALS.filter(
      (d) =>
        d.system === sys.id &&
        d.type === "analog" &&
        frame.modelHistory[d.tag]?.length,
    );
    const bins = new Array<number>(NBINS).fill(0);
    let sq = 0;
    let count = 0;
    let tail = 0;
    const recent: number[] = [];
    const prior: number[] = [];
    for (const d of defs) {
      const h = frame.history[d.tag];
      const m = frame.modelHistory[d.tag];
      const n = Math.min(h.length, m.length);
      const z = (i: number) => (h[i] - m[i]) / (d.sigma || 1);
      for (let i = Math.max(0, n - WINDOW); i < n; i++) {
        const v = z(i);
        if (!Number.isFinite(v)) continue;
        bins[Math.min(NBINS - 1, Math.max(0, Math.floor((v + EDGE) / BIN)))]++;
        sq += v * v;
        count++;
        if (Math.abs(v) > 3) tail++;
        recent.push(v);
      }
      for (let i = Math.max(0, n - 2 * WINDOW); i < n - WINDOW; i++) {
        const v = z(i);
        if (Number.isFinite(v)) prior.push(v);
      }
    }
    const bias = mean(recent);
    const drift = prior.length ? bias - mean(prior) : 0;
    const rms = count ? Math.sqrt(sq / count) : 0;
    const worst = Math.max(Math.abs(bias), Math.abs(drift));
    const tone: Tone = worst < 0.5 ? "good" : worst < 1 ? "warn" : "bad";
    const learnedDays = Math.min(
      BASELINE_DAYS,
      (LEARNED_AT_START[sys.id] ?? 6) + frame.t / 1440,
    );
    return {
      id: sys.id,
      name: sys.name,
      signals: defs.length,
      bins,
      rms,
      bias,
      drift,
      tailPct: count ? (tail / count) * 100 : 0,
      tone,
      label:
        tone === "good" ? "Stable" : tone === "warn" ? "Drifting" : "Drift",
      learnedDays,
    };
  });
}

function Histogram({ bins, name }: { bins: number[]; name: string }) {
  const W = 280;
  const H = 72;
  const gap = 2;
  const bw = (W - gap * (NBINS - 1)) / NBINS;
  const max = Math.max(1, ...bins);
  const x0 = (i: number) => i * (bw + gap);
  const mid = x0(NBINS / 2) - gap / 2;
  return (
    <svg
      className="aiq-hist"
      viewBox={`0 0 ${W} ${H + 14}`}
      role="img"
      aria-label={`${name} residual distribution, ${bins.reduce((a, b) => a + b, 0)} samples`}
    >
      {bins.map((c, i) => {
        const h = Math.max(c ? 2 : 0, (c / max) * H);
        const lo = -EDGE + i * BIN;
        const tail = lo >= 3 || lo + BIN <= -3;
        return (
          <rect
            key={i}
            x={x0(i)}
            y={H - h}
            width={bw}
            height={h}
            rx="2"
            className={tail ? "aiq-hist-tail" : "aiq-hist-bar"}
          >
            <title>{`${lo.toFixed(1)}σ to ${(lo + BIN).toFixed(1)}σ: ${c} samples`}</title>
          </rect>
        );
      })}
      <line x1={mid} x2={mid} y1="0" y2={H} className="aiq-hist-zero" />
      {[-3, 0, 3].map((v) => (
        <text
          key={v}
          x={((v + EDGE) / (EDGE * 2)) * W}
          y={H + 11}
          className="aiq-hist-tick"
          textAnchor="middle"
        >
          {v > 0 ? `+${v}σ` : `${v}σ`}
        </text>
      ))}
    </svg>
  );
}

const sgn = (v: number, d = 2) =>
  `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)}`;

export function ModelAccuracyView({ frame }: { frame: SimFrame }) {
  // Recomputed once per simulated minute.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const systems = useMemo(() => compute(frame), [frame.t]);
  return (
    <section className="aiq-acc" aria-label="Model accuracy and learning">
      {systems.map((s) => {
        const pct = (s.learnedDays / BASELINE_DAYS) * 100;
        const locked = s.learnedDays >= BASELINE_DAYS;
        return (
          <article
            key={s.id}
            className="ast-card aiq-acc-card"
            aria-label={s.name}
          >
            <header className="aiq-model-head">
              <h3 className="aiq-model-name">{s.name}</h3>
              <StatusTag tone={s.tone} label={s.label} />
            </header>
            <p className="aiq-model-spec">
              Actual minus model · last hour · {s.signals} signals
            </p>
            <Histogram bins={s.bins} name={s.name} />
            <dl className="aiq-model-meta">
              <div>
                <dt>RMS residual</dt>
                <dd className="ast-num">{s.rms.toFixed(2)} σ</dd>
              </div>
              <div>
                <dt>Bias</dt>
                <dd className="ast-num">{sgn(s.bias)} σ</dd>
              </div>
              <div>
                <dt>Drift vs prior hour</dt>
                <dd className="ast-num">{sgn(s.drift)} σ</dd>
              </div>
              <div>
                <dt>Beyond 3σ</dt>
                <dd className="ast-num">{s.tailPct.toFixed(1)} %</dd>
              </div>
            </dl>
            <div className="aiq-learn">
              <div className="aiq-learn-top">
                <span className="ast-kpi-label">
                  Baseline learning · D4 two-week window
                </span>
                <span className="ast-num aiq-learn-pct">
                  {Math.floor(pct)} %
                </span>
              </div>
              <Ticks
                value={pct}
                ticks={28}
                tone={locked ? "good" : "info"}
                label={`Baseline ${Math.floor(pct)} percent learned`}
              />
              <span className="ast-caption">
                {locked
                  ? "Baseline locked"
                  : `Day ${s.learnedDays.toFixed(1)} of ${BASELINE_DAYS} · advances with simulated time`}
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
