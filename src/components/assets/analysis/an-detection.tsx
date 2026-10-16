"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav, Tile, TileGrid } from "@/components/ui";
import { formatDuration } from "@/lib/kiln-sim/engine";
import { focusSensorOn } from "../sensor-focus";
import { MissingNote, Panel, Section, useElementWidth } from "./an-ui";
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

const withUnit = (v: string, unit: string) => (unit ? `${v} ${unit}` : v);

/** Detection — expected behaviour (residual vs reference model) and anomalies, split into condition and process monitoring. */
export function AnDetection({ insights, frame, go }: SectionProps) {
  const [lens, setLens] = useState<Lens>("all");
  const rows = useMemo(() => (frame ? detectionRows(frame) : []), [frame]);
  const p = insights.prognosis;

  if (!frame) {
    return (
      <Section id={SECTION_IDS.detection} title="Detection" bare>
        <section className="ast-card pg-an-card">
          <AnSignals insights={insights} frame={frame} />
          <MissingNote title="No reference model for this machine." />
        </section>
        {p.anomalies.length > 0 && (
          <>
            <h4 className="ui-tiles-head">
              <span>
                Anomalies <b>{p.anomalies.length}</b>
              </span>
            </h4>
            <TileGrid label="Anomalies" min={260}>
              {p.anomalies.map((x) => (
                <Tile
                  key={x.tag}
                  title={x.tag}
                  sub={`${x.name} · ${x.component}`}
                  status={{ label: x.severity, tone: sevToTone(x.severity) }}
                  tone={sevToTone(x.severity)}
                  value={x.deviation}
                  facts={[{ label: "Score", value: x.score.toFixed(2) }]}
                  onSelect={() => openTrends(go, x.tag)}
                />
              ))}
            </TileGrid>
          </>
        )}
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
      bare
      right={
        <>
          <PillNav
            items={[
              { id: "all", label: "All" },
              { id: "condition", label: "Condition" },
              { id: "process", label: "Process" },
            ]}
            activeId={lens}
            onChange={(id) => setLens(id as Lens)}
          />
          <PillButton variant="secondary" onClick={() => go("diagnosis")}>
            Live rules
          </PillButton>
        </>
      }
    >
      <section className="ast-card pg-an-card">
        <AnSignals insights={insights} frame={frame} />
        <Panel title={`Residual per signal, mean per ${formatDuration(matrix.minutes)}`}>
          <ResidualHeatmap rows={matrix.rows} minutes={matrix.minutes} lens={lens} />
        </Panel>
        <Panel title="Combined residual vs 95 / 99 % limits">
          <T2Chart values={t2.values} l95={t2.l95} l99={t2.l99} />
        </Panel>
      </section>

      <h4 className="ui-tiles-head">
        <span>
          Off model <b>{anomalous.length}</b> of {rows.length}
        </span>
        <span>beyond ±{Z_ANOMALY}σ of the reference model</span>
      </h4>
      {shown.length === 0 ? (
        <section className="ast-card pg-an-card" role="status">
          <p className="pg-analysis-empty">All signals within ±{Z_ANOMALY}σ of the reference model.</p>
        </section>
      ) : (
        <TileGrid label="Signals off the reference model" min={280}>
          {shown.map((r) => {
            const tone = Math.abs(r.z!) > Z_UNCLASSIFIED ? "bad" : "warn";
            return (
              <Tile
                key={r.tag}
                title={r.tag}
                sub={`${r.name} · ${r.sub}`}
                status={r.rules.length ? { label: r.rules.join(", ") } : { label: "Unclassified", tone: "warn" }}
                tone={tone}
                value={sigma(r.z!)}
                unit="residual"
                facts={[
                  { label: "Expected", value: withUnit(fmt(r.expected), r.unit) },
                  { label: "Actual", value: withUnit(fmt(r.actual), r.unit) },
                  { label: `±${Z_ANOMALY}σ band`, value: withUnit(`±${fmt(r.sigma * Z_ANOMALY)}`, r.unit) },
                  { label: "Samples", value: String(r.persistence) },
                ]}
                onSelect={() => openTrends(go, r.tag)}
              />
            );
          })}
        </TileGrid>
      )}

      {broken.length > 0 && (
        <>
          <h4 className="ui-tiles-head">
            <span>
              Coupling changed <b>{broken.length}</b>
            </span>
            <span>last hour, correlation r</span>
          </h4>
          <TileGrid label="Coupling changed in the last hour" min={220} compact >
            {broken.map((c) => (
              <Tile
                key={`${c.a}-${c.b}`}
                title={`${c.a} ↔ ${c.b}`}
                value={`${c.baseline!.toFixed(2)} → ${c.recent!.toFixed(2)}`}
                facts={[{ label: "Change", value: `${c.recent! - c.baseline! >= 0 ? "+" : "−"}${Math.abs(c.recent! - c.baseline!).toFixed(2)}` }]}
              />
            ))}
          </TileGrid>
        </>
      )}
    </Section>
  );
}
