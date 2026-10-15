"use client";

import React, { useMemo, useState } from "react";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import { PillNav, Table, type Column } from "@/components/ui";
import {
  IconChevron,
  StatusTag,
  Ticks,
  type Tone,
} from "@/components/assets/assets-shell-ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import {
  useKilnSimulation,
  usePrimaryMachineId,
} from "@/providers/kiln-simulation-context";
import { useAiEngine } from "@/providers/ai-engine-context";
import { leadLabel, simStamp, type Prediction } from "./ai-shared";
import { CrossLinks, EmptyCard } from "./assetiq-parts";
import { KpiCard, KpiCards } from "@/components/ui/kpi";
import {
  LEAD_ALPHA,
  ledgerBrier,
  ledgerByEvent,
  ledgerLeadPoints,
  summarizeLedger,
  type LedgerEventStat,
} from "./use-prediction-ledger";
import "./assetiq-ai.css";

/* ---------------------------------------------------------------- navigation */

/** sessionStorage key the AssetIQ hub reads once on mount to open a tab. */
export const ASSETIQ_TAB_KEY = "ultron.assetiq.tab";

/** Open AssetIQ on its Accuracy tab (the home of prediction accuracy). */
export function openAssetIqAccuracy(setActiveTab: (tab: "assetiq") => void): void {
  try {
    sessionStorage.setItem(ASSETIQ_TAB_KEY, "accuracy");
  } catch {
    /* storage unavailable: AssetIQ opens on its default tab */
  }
  setActiveTab("assetiq");
}

/** The pending AssetIQ tab set by `openAssetIqAccuracy`, consumed once (for the hub's initial tab). */
export function consumeAssetIqTab(): "engine" | "accuracy" | "findings" | null {
  try {
    const v = sessionStorage.getItem(ASSETIQ_TAB_KEY);
    if (v) sessionStorage.removeItem(ASSETIQ_TAB_KEY);
    return v === "engine" || v === "accuracy" || v === "findings" ? v : null;
  } catch {
    return null;
  }
}

/* ==========================================================================
   AssetIQ · Accuracy — can the engine be trusted? Every prediction is logged
   and later checked against what the plant did (ledger); confidence is
   compared with the observed hit rate (calibration); and the reference model
   is checked against the live signals (fit).
   ========================================================================== */

/* Actual vs reference model per system of the active plant's primary machine
   (`frame.defs`): residual distribution over the last hour, drift against the
   hour before, and baseline learning (D4: 14 days, kiln-seal plant only). */

const WINDOW = 60;
const BIN = 0.5;
const EDGE = 3.5; // bins span −3.5σ…+3.5σ; tails fold into the end bins
const NBINS = (EDGE * 2) / BIN;
const BASELINE_DAYS = 14;
/** Days of baseline each kiln-seal system had learned when the demo starts. The
    pyro line has no baseline-age record, so its cards show no learning bar. */
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
  /** Baseline days learned; null when the machine has no baseline-age record. */
  learnedDays: number | null;
}

function mean(a: number[]) {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}

export function computeReferenceFit(frame: SimFrame): SystemStats[] {
  const kiln = frame.defs.plant === "kiln";
  return frame.defs.systems.filter((s) => s.scored).map((sys) => {
    const defs = frame.defs.signals.filter(
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
    const learnedDays = kiln
      ? Math.min(BASELINE_DAYS, (LEARNED_AT_START[sys.id] ?? 6) + frame.t / 1440)
      : null;
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
  }).filter((s) => kiln || s.signals > 0);
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


/* ---------------------------------------------------------------- reference fit */

function ReferenceFit({ systems }: { systems: SystemStats[] }) {
  const primaryId = usePrimaryMachineId();
  return (
    <section className="aiq-stack" aria-label="Reference model fit">
      <div className="aiq-section-head">
        <h2 className="ast-card-title">Reference model fit · {primaryId}</h2>
        <span className="ast-caption">
          Actual minus model per system · last hour · σ units
        </span>
      </div>
      <div className="aiq-acc">
        {systems.map((s) => {
          const learned = s.learnedDays;
          const pct = learned === null ? 0 : (learned / BASELINE_DAYS) * 100;
          const locked = learned !== null && learned >= BASELINE_DAYS;
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
              <p className="aiq-model-spec">{s.signals} signals</p>
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
              {learned !== null && (
                <div className="aiq-learn">
                  <div className="aiq-learn-top">
                    <span className="ast-kpi-label">
                      Baseline learned (sim.) · 14-day window
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
                      : `Day ${learned.toFixed(1)} of ${BASELINE_DAYS}`}
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- calibration */

const BANDS: Array<{ lo: number; hi: number }> = [
  { lo: 55, hi: 65 },
  { lo: 65, hi: 75 },
  { lo: 75, hi: 85 },
  { lo: 85, hi: 101 },
];

interface BandStat {
  label: string;
  n: number;
  hits: number;
  hitRate: number | null;
  stated: number | null;
}

function calibrate(resolved: Prediction[]): BandStat[] {
  return BANDS.map(({ lo, hi }) => {
    const inBand = resolved.filter(
      (p) => p.confidence >= lo && p.confidence < hi,
    );
    const hits = inBand.filter((p) => p.status === "confirmed").length;
    return {
      label: `${lo}–${Math.min(hi, 100) - (hi > 100 ? 0 : 1)} %`,
      n: inBand.length,
      hits,
      hitRate: inBand.length ? (hits / inBand.length) * 100 : null,
      stated: inBand.length
        ? inBand.reduce((a, p) => a + p.confidence, 0) / inBand.length
        : null,
    };
  });
}

function CalibrationChart({ bands }: { bands: BandStat[] }) {
  const W = 640;
  const H = 180;
  const top = 12;
  const left = 40;
  const right = 12;
  const plotW = W - left - right;
  const slot = plotW / bands.length;
  const bw = Math.min(72, slot * 0.46);
  const y = (v: number) => top + H - (v / 100) * H;
  return (
    <svg
      className="aiq-cal"
      viewBox={`0 0 ${W} ${top + H + 40}`}
      role="img"
      aria-label={bands
        .map((b) =>
          b.n
            ? `${b.label} stated: ${Math.round(b.hitRate ?? 0)} percent came true of ${b.n}`
            : `${b.label} stated: no resolved predictions`,
        )
        .join("; ")}
    >
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line
            x1={left}
            x2={W - right}
            y1={y(v)}
            y2={y(v)}
            className="aiq-cal-grid"
          />
          <text x={left - 8} y={y(v) + 3} textAnchor="end" className="aiq-cal-tick">
            {v}%
          </text>
        </g>
      ))}
      {bands.map((b, i) => {
        const cx = left + slot * i + slot / 2;
        const x = cx - bw / 2;
        return (
          <g key={b.label}>
            {b.hitRate !== null && (
              <rect
                x={x}
                y={y(b.hitRate)}
                width={bw}
                height={Math.max(1, y(0) - y(b.hitRate))}
                rx="4"
                className="aiq-cal-bar"
              >
                <title>{`${b.hits} of ${b.n} came true (${Math.round(b.hitRate)} %)`}</title>
              </rect>
            )}
            {b.stated !== null && (
              <line
                x1={x - 6}
                x2={x + bw + 6}
                y1={y(b.stated)}
                y2={y(b.stated)}
                className="aiq-cal-stated"
              >
                <title>{`Mean stated confidence ${Math.round(b.stated)} %`}</title>
              </line>
            )}
            {b.hitRate === null && (
              <text x={cx} y={y(0) - 8} textAnchor="middle" className="aiq-cal-tick">
                no data
              </text>
            )}
            <text x={cx} y={top + H + 16} textAnchor="middle" className="aiq-cal-label">
              {b.label}
            </text>
            <text x={cx} y={top + H + 31} textAnchor="middle" className="aiq-cal-tick">
              n = {b.n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------------------------------------------------------- per event */

const EVENT_ROWS = 10;
const MIN_N = 5;

const eventColumns: Column<LedgerEventStat>[] = [
  {
    key: "event",
    header: "Predicted event",
    render: (m) => (
      <span className="ast-cell-stack">
        <span className={`pg-wrap ${m.n < MIN_N ? "ast-muted" : "ast-cell-title"}`}>{m.label}</span>
        <span className="ast-cell-sub">{m.kind === "rule" ? "Rule" : "Signal limit"}</span>
      </span>
    ),
  },
  { key: "n", header: "Resolved", render: (m) => <span className="ast-num">{m.n}</span> },
  { key: "ok", header: "Came true", render: (m) => <span className="ast-num">{m.confirmed}</span> },
  { key: "x", header: "Did not occur", render: (m) => <span className="ast-num ast-muted">{m.missed}</span> },
  {
    key: "p",
    header: "Precision (sim.)",
    render: (m) => (
      <span className="ast-num">{m.precision === null ? "—" : `${Math.round(m.precision)} %`}</span>
    ),
  },
  { key: "l", header: "Median lead", render: (m) => <span className="ast-num">{leadLabel(m.medianLead)}</span> },
  {
    key: "c",
    header: `Timing ±${LEAD_ALPHA * 100} %`,
    render: (m) => (
      <span className="ast-num">{m.coverage === null || m.n < MIN_N ? "—" : `${Math.round(m.coverage)} %`}</span>
    ),
  },
  {
    key: "b",
    header: "Timing bias",
    render: (m) => (
      <span className="ast-num ast-muted">
        {m.bias === null || m.n < MIN_N ? "—" : `${m.bias >= 0 ? "late +" : "early −"}${leadLabel(Math.abs(m.bias))}`}
      </span>
    ),
  },
];

/** Predicted vs actual time to event per confirmed prediction, with the ±α cone. */
function LeadChart({ points }: { points: { id: string; pred: number; actual: number }[] }) {
  const W = 420;
  const H = 260;
  const P = { l: 52, r: 12, t: 14, b: 32 };
  const max = Math.max(1, ...points.flatMap((p) => [p.pred, p.actual])) * 1.05;
  const x = (v: number) => P.l + (v / max) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / max) * (H - P.t - P.b);
  const ticks = [0, max / 2, max];
  return (
    <svg
      className="aiq-cal"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${points.length} confirmed predictions: predicted against actual time to event`}
    >
      {ticks.map((v) => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="aiq-cal-grid" />
          <text x={P.l - 6} y={y(v) + 3} textAnchor="end" className="aiq-cal-tick">
            {leadLabel(v)}
          </text>
          <text x={x(v)} y={H - P.b + 14} textAnchor="middle" className="aiq-cal-tick">
            {leadLabel(v)}
          </text>
        </g>
      ))}
      <path
        d={`M${x(0)},${y(0)} L${x(max)},${y(max * (1 + LEAD_ALPHA))} L${x(max)},${y(max * (1 - LEAD_ALPHA))} Z`}
        style={{ fill: "var(--text-muted)", opacity: 0.08 }}
      />
      <line
        x1={x(0)}
        y1={y(0)}
        x2={x(max)}
        y2={y(max)}
        style={{ stroke: "var(--text-muted)", strokeDasharray: "2 3" }}
      />
      {points.map((p) => {
        const inside = Math.abs(p.pred - p.actual) <= LEAD_ALPHA * Math.max(1, p.actual);
        return (
          <circle
            key={p.id}
            cx={x(p.actual)}
            cy={y(p.pred)}
            r={2.5}
            style={inside ? { fill: "var(--dx-ink)" } : { fill: "none", stroke: "var(--text-muted)" }}
          />
        );
      })}
      <text x={W - P.r} y={H - 4} textAnchor="end" className="aiq-cal-tick">
        Actual time to event
      </text>
      <text x={P.l} y={P.t - 4} className="aiq-cal-tick">
        Predicted
      </text>
    </svg>
  );
}

/* ---------------------------------------------------------------- ledger */

type LedgerFilter = "all" | "pending" | "confirmed" | "missed";
const LEDGER_ROWS = 50;

const outcome = (p: Prediction) => {
  if (p.status === "confirmed")
    return (
      <StatusTag
        tone="good"
        label={`Came true · lead ${leadLabel(p.leadMinutes)}`}
      />
    );
  if (p.status === "missed")
    return <StatusTag tone="idle" label="Did not occur" />;
  return <StatusTag tone="info" label="Pending" />;
};

const ledgerColumns: Column<Prediction>[] = [
  {
    key: "prediction",
    header: "Prediction",
    render: (p) => (
      <span className="ast-cell-stack">
        <span className="ast-cell-title pg-wrap">{p.label}</span>
        <span className="ast-cell-sub">
          {p.machineId} · {p.predictedEvent}
        </span>
      </span>
    ),
  },
  {
    key: "confidence",
    header: "Stated confidence",
    render: (p) => (
      <span className="pg-prob">
        <Ticks value={p.confidence} ticks={10} tone="info" />
        <span className="ast-num">{p.confidence} %</span>
      </span>
    ),
  },
  {
    key: "made",
    header: "Made",
    render: (p) => (
      <span className="ast-muted ast-num">{simStamp(p.createdT)}</span>
    ),
  },
  {
    key: "predicted",
    header: "Expected by",
    render: (p) => (
      <span className="ast-muted ast-num">{simStamp(p.predictedT)}</span>
    ),
  },
  { key: "outcome", header: "Outcome", render: outcome },
  {
    key: "go",
    header: "",
    width: "32px",
    render: () => (
      <span className="pg-chev" aria-hidden="true">
        <IconChevron />
      </span>
    ),
  },
];

/* ---------------------------------------------------------------- tab */

export function AccuracyTab() {
  const { navigateToMachine } = useIndustrialData();
  const primaryId = usePrimaryMachineId();
  const sim = useKilnSimulation();
  const ai = useAiEngine();
  const frame = sim?.machineId === primaryId ? sim.frame : null;
  const [filter, setFilter] = useState<LedgerFilter>("all");

  const ledger = ai?.ledger ?? null;
  const items = useMemo(() => ledger?.items ?? [], [ledger?.items]);
  const resolved = useMemo(
    () =>
      items.filter((p) => p.status === "confirmed" || p.status === "missed"),
    [items],
  );
  const bands = useMemo(() => calibrate(resolved), [resolved]);
  const events = useMemo(() => ledgerByEvent(items), [items]);
  const leadPoints = useMemo(() => ledgerLeadPoints(items), [items]);
  const brier = useMemo(() => ledgerBrier(items), [items]);
  // Recomputed once per simulated minute, and when the plant switches.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const systems = useMemo(() => (frame ? computeReferenceFit(frame) : []), [frame?.t, frame?.defs]);

  if (!frame || !ledger) {
    return (
      <EmptyCard title="Accuracy unavailable">
        The {primaryId} simulation is not running.
      </EmptyCard>
    );
  }

  const { isLoading, error } = ledger;
  const sum = summarizeLedger(ledger.stats);
  const statedMean = resolved.length
    ? resolved.reduce((a, p) => a + p.confidence, 0) / resolved.length
    : null;
  const gap =
    statedMean !== null && sum.precision !== null
      ? statedMean - sum.precision
      : null;
  const fitRms = systems.length
    ? systems.reduce((a, s) => a + s.rms, 0) / systems.length
    : null;
  const rows = (
    filter === "all" ? items : items.filter((p) => p.status === filter)
  ).slice(0, LEDGER_ROWS);
  const filteredTotal =
    filter === "all"
      ? items.length
      : items.filter((p) => p.status === filter).length;

  return (
    <div className="aiq-stack">
      <KpiCards className="aiq-kpis" label="Prediction accuracy">
        <KpiCard
          alertOnly
          label="Precision · simulated"
          value={sum.precision === null ? "—" : String(sum.precision)}
          unit={sum.precision === null ? undefined : "%"}
          tone={
            sum.precision === null
              ? undefined
              : sum.precision >= 70
                ? "good"
                : sum.precision >= 50
                  ? "warn"
                  : "bad"
          }
          foot={`${sum.confirmed} came true of ${sum.resolved} resolved · simulated plant, not field`}
        />
        <KpiCard
          alertOnly
          label="Calibration gap"
          value={gap === null ? "—" : `${gap >= 0 ? "+" : "−"}${Math.abs(gap).toFixed(0)}`}
          unit={gap === null ? undefined : "pp"}
          tone={gap === null ? undefined : Math.abs(gap) <= 10 ? "good" : Math.abs(gap) <= 20 ? "warn" : "bad"}
          foot={
            gap === null
              ? "No resolved predictions"
              : `${gap > 0 ? "Over-confident" : "Not over-confident"}${brier === null ? "" : ` · Brier ${brier.toFixed(3)}`}`
          }
        />
        <KpiCard
          alertOnly
          label="Mean lead time"
          value={sum.meanLead}
          foot="Before the event"
        />
        <KpiCard
          alertOnly
          label="Awaiting outcome"
          value={String(sum.pending)}
          unit={`of ${sum.made} made`}
        />
        <KpiCard
          alertOnly
          label="Model fit"
          value={fitRms === null ? "—" : fitRms.toFixed(2)}
          unit="σ RMS"
          tone={
            systems.some((s) => s.tone === "bad")
              ? "bad"
              : systems.some((s) => s.tone === "warn")
                ? "warn"
                : undefined
          }
          foot={`Reference model residual · ${systems.length} systems`}
        />
      </KpiCards>

      <section className="ast-card" aria-label="Calibration">
        <div className="ast-card-head">
          <h2 className="ast-card-title">Stated confidence vs outcome</h2>
          <span className="aiq-legend ast-caption">
            <span className="aiq-legend-bar" aria-hidden="true" />
            Came true
            <span className="aiq-legend-tick" aria-hidden="true" />
            Mean stated confidence
          </span>
        </div>
        {resolved.length === 0 ? (
          <div className="ast-empty">
            <strong>No resolved predictions yet.</strong>
          </div>
        ) : (
          <CalibrationChart bands={bands} />
        )}
      </section>

      {events.length > 0 && (
        <section className="ast-card pg-table-card" aria-label="Accuracy per predicted event">
          <div className="ast-card-head">
            <div className="aiq-head-title">
              <h2 className="ast-card-title">Accuracy per predicted event</h2>
              <span className="ast-caption ast-num">
                {events.length > EVENT_ROWS ? `Top ${EVENT_ROWS} of ${events.length}` : `${events.length} events`}
              </span>
            </div>
          </div>
          <Table
            className="ast-table"
            columns={eventColumns}
            data={events.slice(0, EVENT_ROWS)}
            keyExtractor={(m) => m.id}
          />
          {leadPoints.length > 0 && (
            <div className="aiq-stack">
              <div className="ast-card-head">
                <h3 className="ast-card-title">Predicted vs actual time to event</h3>
                <span className="ast-caption ast-num">{leadPoints.length} came true</span>
              </div>
              <LeadChart points={leadPoints} />
            </div>
          )}
        </section>
      )}

      <section className="ast-card pg-table-card" aria-label="Prediction ledger">
        <div className="ast-card-head">
          <div className="aiq-head-title">
            <h2 className="ast-card-title">Prediction ledger</h2>
            <span className="ast-caption ast-num">
              {filteredTotal > LEDGER_ROWS
                ? `Latest ${LEDGER_ROWS} of ${filteredTotal}`
                : `${filteredTotal} predictions`}
            </span>
          </div>
          <PillNav
            items={[
              { id: "all", label: "All" },
              { id: "pending", label: "Pending" },
              { id: "confirmed", label: "Came true" },
              { id: "missed", label: "Did not occur" },
            ]}
            activeId={filter}
            onChange={(id) => setFilter(id as LedgerFilter)}
          />
        </div>
        {isLoading && rows.length === 0 ? (
          <div className="ast-empty" role="status">
            <strong>Loading ledger…</strong>
          </div>
        ) : error && rows.length === 0 ? (
          <div className="ast-empty" role="alert">
            <strong>Ledger unavailable. Retry.</strong>
          </div>
        ) : rows.length === 0 ? (
          <div className="ast-empty">
            <strong>
              {filter === "all" ? "No predictions yet." : "Nothing in this view."}
            </strong>
          </div>
        ) : (
          <Table
            className="ast-table"
            columns={ledgerColumns}
            data={rows}
            keyExtractor={(p) => p.id}
            onRowClick={(p) =>
              navigateToMachine(
                p.machineId,
                p.kind === "signal" ? "trends" : "diagnosis",
              )
            }
          />
        )}
      </section>

      <ReferenceFit systems={systems} />

      <CrossLinks
        links={[
          {
            label: `${primaryId} Trends`,
            onClick: () => navigateToMachine(primaryId, "trends"),
          },
          {
            label: `${primaryId} Prognosis`,
            onClick: () => navigateToMachine(primaryId, "prognosis"),
          },
          {
            label: `${primaryId} Analysis`,
            onClick: () => navigateToMachine(primaryId, "analysis"),
          },
        ]}
      />
    </div>
  );
}
