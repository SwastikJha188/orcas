"use client";

import React, { useState } from "react";
import { PillNav, Table, type Column } from "@/components/ui";
import {
  StatusTag,
  Ticks,
  type Tone,
} from "@/components/assets/assets-shell-ui";
import {
  leadLabel,
  simStamp,
  type Prediction,
  type TickerEntry,
} from "./ai-shared";
import type { ModelCard } from "./use-inference-engine";
import type { PredictionLedger } from "./use-prediction-ledger";
import "./assetiq-ai.css";

/* ---------------------------------------------------------------- sparkline */

export function Sparkline({
  values,
  tone,
  label,
}: {
  values: number[];
  tone: Tone;
  label: string;
}) {
  const W = 120;
  const H = 32;
  if (values.length < 2)
    return <div className="aiq-spark aiq-spark-empty" aria-hidden="true" />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const flat = hi - lo < 1e-9;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * (W - 6) + 3,
    flat ? H / 2 : H - 4 - ((v - lo) / span) * (H - 8),
  ]);
  const d = pts
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const [lx, ly] = pts[pts.length - 1];
  const last = values[values.length - 1];
  return (
    <svg
      className="aiq-spark"
      data-tone={tone}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${label}: now ${last.toFixed(1)}, range ${lo.toFixed(1)} to ${hi.toFixed(1)}`}
    >
      <path d={d} className="aiq-spark-line" />
      <circle cx={lx} cy={ly} r="3.5" className="aiq-spark-ring" />
      <circle cx={lx} cy={ly} r="2" className="aiq-spark-dot" />
    </svg>
  );
}

/* ---------------------------------------------------------------- model strip */

function ModelTile({ m }: { m: ModelCard }) {
  return (
    <article className="ast-card aiq-model" aria-label={m.name}>
      <header className="aiq-model-head">
        <h3 className="aiq-model-name">{m.name}</h3>
        <StatusTag tone={m.tone} label={m.status} />
      </header>
      <p className="aiq-model-spec">{m.spec}</p>
      <div className="aiq-model-out">
        <div className="aiq-model-value">
          <span className="aiq-model-num ast-num">{m.headline}</span>
          <span className="aiq-model-unit">{m.headlineLabel}</span>
        </div>
        <Sparkline values={m.series} tone={m.tone} label={m.seriesLabel} />
      </div>
      <dl className="aiq-model-meta">
        <div>
          <dt>Last run</dt>
          <dd className="ast-num">{m.lastRun}</dd>
        </div>
        <div>
          <dt>Throughput</dt>
          <dd className="ast-num">{m.throughput} sig/min</dd>
        </div>
        <div>
          <dt>Latency</dt>
          <dd className="ast-num">{m.latencyMs.toFixed(1)} ms</dd>
        </div>
      </dl>
    </article>
  );
}

export function ModelStrip({ models }: { models: ModelCard[] }) {
  return (
    <section className="aiq-strip" aria-label="Live inference">
      {models.map((m) => (
        <ModelTile key={m.id} m={m} />
      ))}
    </section>
  );
}

/* ---------------------------------------------------------------- ticker */

export function InferenceTicker({ entries }: { entries: TickerEntry[] }) {
  return (
    <section className="ast-card aiq-ticker" aria-label="Inference events">
      <div className="ast-card-head">
        <h2 className="ast-card-title">Inference events</h2>
        <span className="ast-caption">Simulated clock</span>
      </div>
      <ol className="aiq-ticker-list" aria-live="off">
        {entries.slice(0, 12).map((e) => (
          <li key={e.id} className="aiq-ticker-row" data-tone={e.tone}>
            <span className="aiq-ticker-dot" aria-hidden="true" />
            <span className="aiq-ticker-time ast-num">{e.clock}</span>
            <span className="aiq-ticker-model">{e.model}</span>
            <span className="aiq-ticker-text">{e.text}</span>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="aiq-ticker-empty">
            Waiting for the first inference cycle
          </li>
        )}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------------- ledger */

type LedgerFilter = "all" | "pending" | "confirmed" | "missed";

const outcome = (p: Prediction) => {
  if (p.status === "confirmed")
    return (
      <StatusTag
        tone="good"
        label={`Confirmed · lead ${leadLabel(p.leadMinutes)}`}
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
        <span className="ast-cell-sub">{p.predictedEvent}</span>
      </span>
    ),
  },
  {
    key: "confidence",
    header: "Confidence",
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
    header: "Expected",
    render: (p) => (
      <span className="ast-muted ast-num">{simStamp(p.predictedT)}</span>
    ),
  },
  { key: "outcome", header: "Outcome", render: outcome },
];

function Kpi({
  label,
  value,
  unit,
  foot,
}: {
  label: string;
  value: string;
  unit?: string;
  foot?: string;
}) {
  return (
    <div className="ast-card ast-kpi">
      <span className="ast-kpi-label">{label}</span>
      <span className="ast-kpi-value ast-num">
        {value}
        {unit && <span className="ast-unit">{unit}</span>}
      </span>
      {foot && <span className="ast-caption">{foot}</span>}
    </div>
  );
}

export function PredictionLedgerSection({
  ledger,
}: {
  ledger: PredictionLedger;
}) {
  const [filter, setFilter] = useState<LedgerFilter>("all");
  const { items, stats, isLoading, error } = ledger;
  const rows =
    filter === "all" ? items : items.filter((p) => p.status === filter);
  return (
    <>
      <section className="ast-kpis" aria-label="Prediction accuracy">
        <Kpi
          label="Precision"
          value={stats.precision === null ? "—" : stats.precision.toFixed(0)}
          unit={stats.precision === null ? undefined : "%"}
          foot={`${stats.confirmed} confirmed of ${stats.confirmed + stats.missed} resolved`}
        />
        <Kpi
          label="Mean lead time"
          value={leadLabel(stats.meanLeadMinutes)}
          foot={`Warning before the event · ${stats.pending} of ${stats.made} awaiting outcome`}
        />
      </section>
      <section
        className="ast-card pg-table-card"
        aria-label="Prediction ledger"
      >
        <div className="ast-card-head">
          <h2 className="ast-card-title">Prediction ledger</h2>
          <PillNav
            items={[
              { id: "all", label: "All" },
              { id: "pending", label: "Pending" },
              { id: "confirmed", label: "Confirmed" },
              { id: "missed", label: "Did not occur" },
            ]}
            activeId={filter}
            onChange={(id) => setFilter(id as LedgerFilter)}
          />
        </div>
        {isLoading && rows.length === 0 ? (
          <div className="ast-empty" role="status">
            <strong>Loading ledger</strong>
          </div>
        ) : error && rows.length === 0 ? (
          <div className="ast-empty" role="alert">
            <strong>Ledger unavailable</strong>
            /api/predictions · {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="ast-empty">
            <strong>
              {filter === "all" ? "No predictions yet" : "Nothing in this view"}
            </strong>
            A prediction is recorded when a trend is heading for a limit or a
            rule starts to build.
          </div>
        ) : (
          <Table
            className="ast-table"
            columns={ledgerColumns}
            data={rows}
            keyExtractor={(p) => p.id}
          />
        )}
      </section>
    </>
  );
}
