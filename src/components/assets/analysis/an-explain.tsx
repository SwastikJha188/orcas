"use client";

import React from "react";
import { Table, type Column } from "@/components/ui";
import { StatusTag } from "../assets-shell-ui";
import { focusSensorOn } from "../sensor-focus";
import { Panel, Section } from "./an-ui";
import { SECTION_IDS, Z_ANOMALY, Z_UNCLASSIFIED, fmt, liveRules, machineFaults, sevToTone, sigma, type SectionProps } from "./an-derive";
import { isConditionRule } from "@/lib/plant-defs";

const withUnit = (v: string, unit: string) => (unit ? `${v} ${unit}` : v);

/** Explanation — contribution waterfall graph, broken rules table, and recovery target table. */
export function AnExplain({ insights, frame, go }: SectionProps) {
  const a = insights.analysis;
  const top = machineFaults(a)[0];
  const total = a.features.reduce((s, f) => s + f.weight, 0) || 1;
  let run = 0;
  const steps = a.features.map((f) => {
    const share = (f.weight / total) * 100;
    const start = run;
    run += share;
    return { ...f, share, start, z: frame?.signals[f.tag]?.z ?? null };
  });
  const rules = liveRules(frame);
  const topRule = top ? rules.find((r) => r.id === top.id) : rules.find((r) => isConditionRule(r));
  const clears = frame && topRule
    ? topRule.tags
        .map((tag) => {
          const s = frame.signals[tag];
          const def = frame.defs.signalByTag[tag];
          if (!s || !def || def.type !== "analog" || s.z === null || s.model === null || s.value === null || Math.abs(s.z) <= Z_ANOMALY) return null;
          const target = s.z > 0 ? s.model + Z_ANOMALY * def.sigma : s.model - Z_ANOMALY * def.sigma;
          return { tag, name: def.name, unit: def.unit, now: s.value, target, up: s.z < 0, change: target - s.value, z: s.z };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    : [];
  const open = (tag: string) => {
    focusSensorOn("trends", tag);
    go("trends");
  };

  const ruleCols: Column<(typeof rules)[number]>[] = [
    { key: "id", header: "Rule", width: "120px", render: (r) => <span className="ast-mono">{r.id}</span> },
    { key: "name", header: "What is wrong", width: "220px", render: (r) => <strong>{r.name}</strong> },
    { key: "logic", header: "Rule condition", render: (r) => <span className="ast-num">{r.logic}</span> },
    { key: "evidence", header: "Observed evidence", render: (r) => <span className="ast-num">{r.evidence || "—"}</span> },
    {
      key: "persistence",
      header: "Samples",
      width: "110px",
      render: (r) => <span className="ast-num">{r.persistence} / {r.threshold}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "130px",
      render: (r) => {
        const confirmed = r.status === "ACTIVE";
        return <StatusTag tone={confirmed ? sevToTone(r.severity) : "idle"} label={confirmed ? "Confirmed" : "Confirming"} />;
      },
    },
  ];

  const clearCols: Column<(typeof clears)[number]>[] = [
    {
      key: "tag",
      header: "Sensor",
      width: "210px",
      render: (c) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title ast-num">{c.tag} · {c.name}</span>
        </span>
      ),
    },
    {
      key: "now",
      header: "Current reading",
      width: "140px",
      render: (c) => <strong className="ast-num">{withUnit(fmt(c.now), c.unit)}</strong>,
    },
    {
      key: "target",
      header: "Target to clear",
      width: "150px",
      render: (c) => <span className="ast-num">{`${c.up ? "≥" : "≤"} ${withUnit(fmt(c.target), c.unit)}`}</span>,
    },
    {
      key: "change",
      header: "Required change",
      width: "150px",
      render: (c) => <span className="ast-num">{withUnit(`${c.change >= 0 ? "+" : "−"}${fmt(Math.abs(c.change))}`, c.unit)}</span>,
    },
    {
      key: "z",
      header: "Current deviation",
      width: "130px",
      render: (c) => <StatusTag tone={Math.abs(c.z) > Z_UNCLASSIFIED ? "bad" : "warn"} label={sigma(c.z)} />,
    },
  ];

  return (
    <Section id={SECTION_IDS.explanation} title="Explanation" bare>
      <section className="ast-card pg-an-card">
        <Panel title={`Sensor contribution to ${top ? top.id : "health score"}`}>
          <ol className="pg-an-contrib" aria-label="Input contributions, largest first">
            {steps.map((r) => (
              <li key={r.id}>
                <button type="button" className="pg-an-contrib-row" onClick={() => open(r.tag)} aria-label={`${r.label}, ${Math.round(r.share)} % of the score`}>
                  <span className="ast-cell-stack">
                    <span className="ast-cell-title">{r.label}</span>
                    <span className="ast-cell-sub">{r.tag}</span>
                  </span>
                  <span className="pg-analysis-bar pg-analysis-waterfall" aria-hidden="true">
                    <i style={{ left: `${r.start}%`, width: `${Math.max(0.5, r.share)}%` }} />
                  </span>
                  <span className="pg-an-contrib-num ast-num">{Math.round(r.share)} %</span>
                  <span className="pg-an-contrib-num is-muted ast-num">{r.z !== null ? `${r.z >= 0 ? "↑" : "↓"} ${sigma(r.z)}` : "—"}</span>
                </button>
              </li>
            ))}
          </ol>
        </Panel>
      </section>

      {frame && rules.length > 0 && (
        <section className="ast-card pg-table-card" aria-label="Broken rules trace">
          <div className="ast-card-head">
            <h4 className="ast-card-title">Rules evaluated &amp; broken ({rules.length})</h4>
          </div>
          <Table columns={ruleCols} data={rules} keyExtractor={(r) => r.id} />
        </section>
      )}

      {clears.length > 0 && topRule && (
        <section className="ast-card pg-table-card" aria-label={`Sensor targets to clear ${topRule.id}`}>
          <div className="ast-card-head">
            <h4 className="ast-card-title">Sensor targets required to clear {topRule.id}</h4>
          </div>
          <Table columns={clearCols} data={clears} keyExtractor={(c) => c.tag} onRowClick={(c) => open(c.tag)} />
        </section>
      )}
    </Section>
  );
}
