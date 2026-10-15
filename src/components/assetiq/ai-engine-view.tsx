"use client";

import React, { useMemo } from "react";
import { Table, type Column } from "@/components/ui";
import {
  IconChevron,
  StatusTag,
  type Tone,
} from "@/components/assets/assets-shell-ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import {
  useKilnFleet,
  useKilnSimulation,
  usePrimaryMachineId,
} from "@/providers/kiln-simulation-context";
import { useAiEngine } from "@/providers/ai-engine-context";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import type { TickerEntry } from "./ai-shared";
import type { ModelCard } from "./use-inference-engine";
import { CrossLinks, EmptyCard } from "./assetiq-parts";
import { KpiCard, KpiCards } from "@/components/ui/kpi";
import "./assetiq-ai.css";

/* ==========================================================================
   AssetIQ · Engine — is the AI running, how often, on what inputs, and what
   each stage of the pipeline concludes right now.
   ========================================================================== */

/* ---------------------------------------------------------------- sparkline */

function StageSpark({
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

/* ---------------------------------------------------------------- pipeline */

/** Order the stages run in: gate the data, score it, then reason over it. */
const PIPELINE = [
  "validation",
  "reference",
  "rules",
  "anomaly",
  "forecaster",
  "rul",
];

function StageTile({ m, step }: { m: ModelCard; step: number }) {
  return (
    <article className="ast-card aiq-model" aria-label={m.name}>
      <header className="aiq-model-head">
        <h3 className="aiq-model-name">
          <span className="aiq-step ast-num" aria-hidden="true">
            {step}
          </span>
          {m.name}
        </h3>
        <StatusTag tone={m.tone} label={m.status} />
      </header>
      <div className="aiq-model-out">
        <div className="aiq-model-value">
          <span className="aiq-model-num ast-num">{m.headline}</span>
          <span className="aiq-model-unit">{m.headlineLabel}</span>
        </div>
        <StageSpark values={m.series} tone={m.tone} label={m.seriesLabel} />
      </div>
      <dl className="aiq-model-meta">
        <div>
          <dt>Last run</dt>
          <dd className="ast-num">{m.lastRun}</dd>
        </div>
        <div>
          <dt>Inputs</dt>
          <dd className="ast-num">{m.throughput} signals</dd>
        </div>
        <div>
          <dt>Latency (est.)</dt>
          <dd className="ast-num">{m.latencyMs.toFixed(1)} ms</dd>
        </div>
      </dl>
    </article>
  );
}

function Pipeline({ models }: { models: ModelCard[] }) {
  const primaryId = usePrimaryMachineId();
  const ordered = PIPELINE.map((id) => models.find((m) => m.id === id)).filter(
    (m): m is ModelCard => Boolean(m),
  );
  return (
    <section className="aiq-stack" aria-label="Inference pipeline">
      <div className="aiq-section-head">
        <h2 className="ast-card-title">Inference pipeline · {primaryId}</h2>
        <span className="ast-caption">
          Six stages, run in order every simulated minute · sparkline = last 60 cycles
        </span>
      </div>
      {ordered.length === 0 ? (
        <EmptyCard title="Waiting for the first inference cycle." />
      ) : (
        <div className="aiq-strip">
          {ordered.map((m, i) => (
            <StageTile key={m.id} m={m} step={i + 1} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- inputs */

interface InputRow {
  id: string;
  name: string;
  frame: SimFrame;
  scored: number;
  flagged: number;
}

const inputColumns: Column<InputRow>[] = [
  {
    key: "machine",
    header: "Machine",
    render: (r) => (
      <span className="ast-cell-stack">
        <span className="ast-cell-title">{r.name}</span>
        <span className="ast-cell-sub">
          {r.id} · cycle {r.frame.clock}
        </span>
      </span>
    ),
  },
  {
    key: "condition",
    header: "Condition",
    render: (r) => (
      <StatusTag
        tone={
          r.frame.condition === "Critical"
            ? "bad"
            : r.frame.condition === "Advisory"
              ? "warn"
              : "good"
        }
        label={`${r.frame.condition} · ${Math.round(r.frame.overall)} %`}
      />
    ),
  },
  {
    key: "inputs",
    header: "Signals scored",
    render: (r) => (
      <span className="ast-num">
        {r.frame.pipeline.valid}
        <span className="ast-muted"> of {r.scored} valid</span>
      </span>
    ),
  },
  {
    key: "flagged",
    header: "Quality flags",
    render: (r) => (
      <span
        className="ast-num pg-tone-value"
        data-tone={r.flagged > 0 ? (r.frame.pipeline.invalid > 0 ? "bad" : "warn") : undefined}
      >
        {r.flagged === 0
          ? "None"
          : `${r.frame.pipeline.suspect} suspect · ${r.frame.pipeline.invalid} invalid · ${r.frame.pipeline.held} held`}
      </span>
    ),
  },
  {
    key: "beyond",
    header: "Beyond 3σ",
    render: (r) => (
      <span
        className="ast-num pg-tone-value"
        data-tone={r.frame.pipeline.beyond3s > 0 ? "warn" : undefined}
      >
        {r.frame.pipeline.beyond3s} signals
      </span>
    ),
  },
  {
    key: "rules",
    header: "Rules",
    render: (r) => (
      <span className="ast-num">
        {r.frame.pipeline.confirmed} confirmed
        <span className="ast-muted">
          {" "}
          · {r.frame.pipeline.pending} pending of {r.frame.pipeline.evaluated}
        </span>
      </span>
    ),
  },
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

/* ---------------------------------------------------------------- ticker */

export function InferenceTicker({ entries }: { entries: TickerEntry[] }) {
  const primaryId = usePrimaryMachineId();
  return (
    <section className="ast-card aiq-ticker" aria-label="Inference events">
      <div className="ast-card-head">
        <h2 className="ast-card-title">Inference log · {primaryId}</h2>
        <span className="ast-caption">Latest 12 cycles</span>
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
            Waiting for the first inference cycle.
          </li>
        )}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------------- tab */

export function EngineTab() {
  const { machines: allMachines, navigateToMachine, selectedPlantId } = useIndustrialData();
  const primaryId = usePrimaryMachineId();
  // The active plant only: each plant is a separate workspace.
  const machines = useMemo(() => allMachines.filter((m) => !m.plantId || m.plantId === selectedPlantId), [allMachines, selectedPlantId]);
  const fleet = useKilnFleet();
  const sim = useKilnSimulation();
  const ai = useAiEngine();
  const frame = sim?.machineId === primaryId ? sim.frame : null;
  const models = ai?.engine.models ?? [];

  const inputs = useMemo<InputRow[]>(
    () =>
      Object.entries(fleet)
        .map(([id, s]) => {
          const p = s.frame.pipeline;
          const scored = p.valid + p.suspect + p.invalid + p.held;
          return {
            id,
            name: machines.find((m) => m.id === id)?.name ?? id,
            frame: s.frame,
            scored,
            flagged: scored - p.valid,
          };
        })
        .sort((a, b) => a.id.localeCompare(b.id)),
    [fleet, machines],
  );

  if (!frame || !ai) {
    return (
      <EmptyCard title={`No live inference: the ${primaryId} simulation is not running.`} />
    );
  }

  const flagging = models.filter((m) => m.tone !== "good");
  const p = frame.pipeline;
  const total = p.valid + p.suspect + p.invalid + p.held;
  const speed = sim?.speedMultiplier ?? 1;
  const paused = sim?.isPaused ?? false;

  return (
    <div className="aiq-stack">
      <KpiCards className="aiq-kpis" label="Engine status">
        <KpiCard
          alertOnly
          label="Live coverage"
          value={String(inputs.length)}
          unit={`of ${machines.length || inputs.length} machines`}
          foot="Machines streaming into the engine"
        />
        <KpiCard
          alertOnly
          label="Inference cadence"
          value={paused ? "Paused" : "1"}
          unit={paused ? undefined : "cycle / sim min"}
          tone={paused ? "warn" : undefined}
          foot={
            paused
              ? `Last cycle ${frame.clock}`
              : `${speed}× · every ${(1 / speed).toFixed(speed > 1 ? 2 : 0)} s real · last ${frame.clock}`
          }
        />
        <KpiCard
          alertOnly
          label={`Inputs · ${primaryId}`}
          value={String(p.valid)}
          unit={`of ${total} valid`}
          tone={p.invalid > 0 ? "bad" : total - p.valid > 0 ? "warn" : undefined}
          foot={`${total - p.valid} held, suspect or invalid`}
        />
        <KpiCard
          alertOnly
          label="Stages flagging"
          value={String(flagging.length)}
          unit={`of ${models.length || 6}`}
          tone={flagging.some((m) => m.tone === "bad") ? "bad" : flagging.length ? "warn" : undefined}
          foot={
            flagging.length
              ? flagging.map((m) => m.name).join(" · ")
              : "Every stage normal"
          }
        />
      </KpiCards>

      <Pipeline models={models} />

      <section className="ast-card pg-table-card" aria-label="Engine inputs by machine">
        <div className="ast-card-head">
          <h2 className="ast-card-title">Inputs by machine</h2>
          <span className="ast-caption">Opens the machine&apos;s Sensors page</span>
        </div>
        {inputs.length === 0 ? (
          <div className="ast-empty">
            <strong>No machine is streaming live data.</strong>
          </div>
        ) : (
          <Table
            className="ast-table"
            columns={inputColumns}
            data={inputs}
            keyExtractor={(r) => r.id}
            onRowClick={(r) => navigateToMachine(r.id, "sensors")}
          />
        )}
      </section>

      <InferenceTicker entries={ai.engine.ticker} />

      <CrossLinks
        links={[
          {
            label: `${primaryId} Diagnosis`,
            onClick: () => navigateToMachine(primaryId, "diagnosis"),
          },
          {
            label: `${primaryId} Sensors`,
            onClick: () => navigateToMachine(primaryId, "sensors"),
          },
          {
            label: `${primaryId} Prognosis`,
            onClick: () => navigateToMachine(primaryId, "prognosis"),
          },
        ]}
      />
    </div>
  );
}
