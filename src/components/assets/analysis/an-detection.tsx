"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav, Table } from "@/components/ui";
import { formatDuration } from "@/lib/kiln-sim/engine";
import { StatusTag } from "../assets-shell-ui";
import { focusSensorOn } from "../sensor-focus";
import { MissingNote, Panel, Section, WhyDisclosure, alertTone, useElementWidth } from "./an-ui";
import { AnSignals } from "./an-summary";
import {
  SECTION_IDS,
  Z_ANOMALY,
  Z_UNCLASSIFIED,
  detectionRows,
  fmt,
  residualMatrix,
  sumZ2Series,
  isAnomalous,
  sevToTone,
  sigma,
  type MatrixRow,
  type SectionProps,
} from "./an-derive";

type Lens = "all" | "condition" | "process";

/* ------------------------------------------------------------------ */
/* Residual matrix: signal × time, |residual σ|                        */
/* ------------------------------------------------------------------ */

const LABEL = 92;
const ROW_H = 11;
const GROUP_GAP = 14;

function ResidualHeatmap({ rows, minutes, lens }: { rows: MatrixRow[]; minutes: number; lens: Lens }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const shown = lens === "all" ? rows : rows.filter((r) => r.kind === lens);
  const cols = shown[0]?.cells.length ?? 0;
  const plot = Math.max(120, width - LABEL);
  const cw = cols ? plot / cols : 0;
  const groups: { name: string; rows: MatrixRow[] }[] = [];
  for (const r of shown) {
    const g = groups[groups.length - 1];
    if (g && g.name === r.system) g.rows.push(r);
    else groups.push({ name: r.system, rows: [r] });
  }
  let y = 16;
  const placed = groups.map((g) => {
    const top = y + GROUP_GAP;
    y = top + g.rows.length * ROW_H;
    return { ...g, top };
  });
  const h = y + 4;
  const span = cols * minutes;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ x: LABEL + f * plot, label: f === 1 ? "now" : `−${formatDuration((1 - f) * span)}` }));

  return (
    <div ref={ref} className="pg-analysis-chart-wrap">
      <svg className="pg-analysis-chart" width={width} height={h} viewBox={`0 0 ${width} ${h}`} role="img" aria-label={`Residual matrix, ${shown.length} signals over ${formatDuration(span)}`}>
        {ticks.map((t, i) => (
          <text key={i} x={t.x} y={10} textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"} className="pg-analysis-axis">
            {t.label}
          </text>
        ))}
        {placed.map((g) => (
          <g key={g.name}>
            <text x={0} y={g.top - 4} className="pg-analysis-axis">
              {g.name}
            </text>
            {g.rows.map((r, ri) => {
              const ry = g.top + ri * ROW_H;
              return (
                <g key={r.tag}>
                  <text x={0} y={ry + ROW_H - 2} className="pg-analysis-heat-label">
                    {r.tag}
                  </text>
                  {r.cells.map((z, ci) => {
                    if (z === null) return null;
                    const tone = z > Z_UNCLASSIFIED ? "bad" : z > Z_ANOMALY ? "warn" : undefined;
                    return (
                      <rect
                        key={ci}
                        x={LABEL + ci * cw}
                        y={ry}
                        width={Math.max(1, cw - 1)}
                        height={ROW_H - 1}
                        className="pg-analysis-heat"
                        data-tone={tone}
                        style={tone ? undefined : { opacity: Math.min(1, z / Z_ANOMALY) * 0.55 + 0.04 }}
                      >
                        <title>{`${r.tag} · ${r.name} · mean ${z.toFixed(1)}σ · ${formatDuration((cols - ci) * minutes)} to ${formatDuration((cols - ci - 1) * minutes)} ago`}</title>
                      </rect>
                    );
                  })}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Σz² (diagonal T²) vs χ² limits                                      */
/* ------------------------------------------------------------------ */

function T2Chart({ values, l95, l99 }: { values: number[]; l95: number; l99: number }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const H = 72;
  const L = LABEL;
  const plot = Math.max(120, width - L);
  const max = Math.max(l99 * 1.4, ...values) || 1;
  const y = (v: number) => 6 + (1 - Math.min(v, max) / max) * (H - 12);
  const x = (i: number) => L + (i / Math.max(1, values.length - 1)) * plot;
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const over = values.length ? values[values.length - 1] > l99 : false;
  return (
    <div ref={ref} className="pg-analysis-chart-wrap">
      <svg className="pg-analysis-chart" width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={`Sum of squared residuals vs chi-square limits; now ${Math.round(values[values.length - 1] ?? 0)}, 99 % limit ${Math.round(l99)}`}>
        <text x={0} y={y(l99) + 4} className="pg-analysis-axis">
          99 % {Math.round(l99)}
        </text>
        <line x1={L} x2={L + plot} y1={y(l95)} y2={y(l95)} className="pg-analysis-threshold" />
        <line x1={L} x2={L + plot} y1={y(l99)} y2={y(l99)} className="pg-analysis-threshold" />
        <path d={d} className="pg-analysis-line" data-tone={over ? "warn" : undefined} />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                            */
/* ------------------------------------------------------------------ */

const openTrends = (go: SectionProps["go"], tag: string) => {
  focusSensorOn("trends", tag);
  go("trends");
};

/** Detection — expected behaviour (residual vs reference model) and anomalies, split into condition and process monitoring. */
export function AnDetection({ insights, frame, go }: SectionProps) {
  const [lens, setLens] = useState<Lens>("all");
  const rows = useMemo(() => (frame ? detectionRows(frame) : []), [frame]);
  const p = insights.prognosis;

  if (!frame) {
    return (
      <Section id={SECTION_IDS.detection} title="Detection">
        <AnSignals insights={insights} frame={frame} />
        <Table
          className="ast-table pg-analysis-num-last2"
          data={p.anomalies}
          keyExtractor={(x) => x.tag}
          onRowClick={(x) => openTrends(go, x.tag)}
          columns={[
            { key: "s", header: "Signal", render: (x) => <span className="ast-cell-stack"><span className="ast-cell-title">{x.name}</span><span className="ast-cell-sub">{x.tag} · {x.component}</span></span> },
            { key: "st", header: "Status", render: (x) => <StatusTag tone={alertTone(sevToTone(x.severity)) ?? "idle"} label={x.severity} /> },
            { key: "sc", header: "Score", render: (x) => <span className="ast-num">{x.score.toFixed(2)}</span> },
            { key: "d", header: "Deviation", render: (x) => <span className="ast-num">{x.deviation}</span> },
          ]}
        />
        <MissingNote title="No reference model for this machine." />
        <WhyDisclosure summary="Method">
          <p className="pg-analysis-prose">
            Stored snapshot: signals are scored against catalog alarm limits. Without a reference model, expected values, residuals and persistence
            are unavailable.
          </p>
        </WhyDisclosure>
      </Section>
    );
  }

  const anomalous = rows
    .filter(isAnomalous)
    .sort((x, y) => Number(Math.abs(y.z!) > Z_UNCLASSIFIED) - Number(Math.abs(x.z!) > Z_UNCLASSIFIED) || y.rules.length - x.rules.length);
  const matrix = residualMatrix(frame);
  const t2 = sumZ2Series(frame);
  const shown = lens === "all" ? anomalous : anomalous.filter((r) => r.kind === lens);
  const broken = p.correlation.pairs
    .filter((c) => c.baseline !== undefined && c.recent !== undefined && Math.abs(c.baseline) >= 0.6 && Math.abs(c.baseline - c.recent) >= 0.5)
    .slice(0, 4);

  return (
    <Section
      id={SECTION_IDS.detection}
      title="Detection"
      right={
        <PillButton variant="secondary" onClick={() => go("diagnosis")}>
          Live rules
        </PillButton>
      }
    >
      <AnSignals insights={insights} frame={frame} />
      <Panel
        title={`Residual per signal, mean per ${formatDuration(matrix.minutes)}`}
        right={
          <PillNav
            items={[
              { id: "all", label: "All" },
              { id: "condition", label: "Condition" },
              { id: "process", label: "Process" },
            ]}
            activeId={lens}
            onChange={(id) => setLens(id as Lens)}
            arrows
          />
        }
      >
        <ResidualHeatmap rows={matrix.rows} minutes={matrix.minutes} lens={lens} />
      </Panel>

      <Panel title="Combined residual vs 95 / 99 % limits">
        <T2Chart values={t2.values} l95={t2.l95} l99={t2.l99} />
      </Panel>

      <Panel title={`Off model · ${anomalous.length} of ${rows.length}`} table>
        {shown.length === 0 ? (
          <p className="pg-analysis-empty">All signals within ±{Z_ANOMALY}σ of the reference model.</p>
        ) : (
          <Table
            className="ast-table pg-analysis-numcols"
            data={shown}
            keyExtractor={(r) => r.tag}
            onRowClick={(r) => openTrends(go, r.tag)}
            columns={[
              { key: "sig", header: "Signal", render: (r) => <span className="ast-cell-stack"><span className="ast-cell-title">{r.name}</span><span className="ast-cell-sub">{r.tag} · {r.sub}</span></span> },
              { key: "exp", header: "Expected", render: (r) => <span className="ast-num">{fmt(r.expected)}<span className="ast-unit">{r.unit}</span></span> },
              { key: "act", header: "Actual", render: (r) => <span className="ast-num">{fmt(r.actual)}<span className="ast-unit">{r.unit}</span></span> },
              { key: "dev", header: "Residual", render: (r) => <span className="pg-analysis-r" data-tone={alertTone(Math.abs(r.z!) > Z_UNCLASSIFIED ? "bad" : "warn")}>{sigma(r.z!)}</span> },
              { key: "band", header: "±3σ band", render: (r) => <span className="ast-num ast-muted">±{fmt(r.sigma * Z_ANOMALY)}<span className="ast-unit">{r.unit}</span></span> },
              { key: "pers", header: "Samples", render: (r) => <span className="ast-num">{r.persistence}</span> },
              { key: "match", header: "Pattern", render: (r) => (r.rules.length ? <span className="ast-num">{r.rules.join(", ")}</span> : <span className="pg-analysis-r" data-tone="warn">Unclassified</span>) },
            ]}
          />
        )}
      </Panel>

      {broken.length > 0 && (
        <Panel title="Coupling changed · last hour">
          <ul className="pg-analysis-pairs">
            {broken.map((c) => (
              <li key={`${c.a}-${c.b}`}>
                <span>
                  {c.a} ↔ {c.b}
                </span>
                <span className="ast-muted">
                  r {c.baseline!.toFixed(2)} → {c.recent!.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <WhyDisclosure summary="Method">
        <p className="pg-analysis-prose">
          Residual = measured − reference model{frame.defs.plant === "kiln" ? " (D5 Table 9.5)" : ""}, in multiples of the signal&apos;s normal scatter σ. The combined residual is Σz²
          (Hotelling T² with a diagonal covariance, computed on this page) against χ² 95 / 99 % limits with df {t2.df}; no PCA model exists, so SPE / Q is
          not computed. Findings need 2–4 samples in a row (1 for critical) and clear after 4 clean samples. Signals beyond ±{Z_UNCLASSIFIED}σ with no
          known pattern raise R-ANM-01. Signals flagged by sensor validation are excluded.
        </p>
      </WhyDisclosure>
    </Section>
  );
}
