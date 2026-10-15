"use client";

import React from "react";
import { Table } from "@/components/ui";
import { focusSensorOn } from "../sensor-focus";
import { MissingNote, Panel, Section, WhyDisclosure } from "./an-ui";
import { SECTION_IDS, Z_ANOMALY, fmt, liveRules, machineFaults, sigma, type SectionProps } from "./an-derive";
import { isConditionRule } from "@/lib/plant-defs";

/** Explanation — contribution waterfall, deterministic rule trace, and what clears the finding. */
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
          return { tag, unit: def.unit, now: s.value, target, up: s.z < 0, change: target - s.value, z: s.z };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    : [];
  const open = (tag: string) => {
    focusSensorOn("trends", tag);
    go("trends");
  };

  return (
    <Section id={SECTION_IDS.explanation} title="Explanation">
      <Panel title={`Contribution to ${top ? top.id : "the health score"}`} table>
        <Table
          className="ast-table pg-analysis-num-last2"
          data={steps}
          keyExtractor={(r) => r.id}
          onRowClick={(r) => open(r.tag)}
          columns={[
            { key: "in", header: "Input", render: (r) => <span className="ast-cell-stack"><span className="ast-cell-title">{r.label}</span><span className="ast-cell-sub">{r.tag}</span></span> },
            {
              key: "w",
              header: "Waterfall",
              width: "34%",
              render: (r) => (
                <span className="pg-analysis-bar pg-analysis-bar-cell pg-analysis-waterfall" aria-label={`${Math.round(r.start)} to ${Math.round(r.start + r.share)} %`}>
                  <i style={{ left: `${r.start}%`, width: `${Math.max(0.5, r.share)}%` }} />
                </span>
              ),
            },
            { key: "s", header: "Share", render: (r) => <span className="ast-num">{Math.round(r.share)} %</span> },
            { key: "z", header: "Residual", render: (r) => <span className="ast-num">{r.z !== null ? `${r.z >= 0 ? "↑" : "↓"} ${sigma(r.z)}` : "—"}</span> },
          ]}
        />
      </Panel>

      {frame && rules.length > 0 && (
        <Panel title="Rule trace" table>
          <Table
            className="ast-table pg-analysis-num-last4"
            data={rules}
            keyExtractor={(r) => r.id}
            columns={[
              { key: "r", header: "Rule", render: (r) => <span className="ast-cell-stack"><span className="ast-cell-title">{r.id}</span><span className="ast-cell-sub">{r.name}</span></span> },
              { key: "c", header: "Condition", render: (r) => <span className="pg-wrap">{r.logic}</span> },
              { key: "v", header: "Value", render: (r) => <span className="pg-wrap ast-num">{r.evidence || "—"}</span> },
              { key: "k", header: "Samples", render: (r) => <span className="ast-num">{r.persistence}</span> },
              { key: "n", header: "Needed", render: (r) => <span className="ast-num">{r.threshold}</span> },
              { key: "h", header: "Clean", render: (r) => <span className="ast-num">{r.clean} / 4</span> },
              { key: "s", header: "State", render: (r) => <span className="ast-num">{r.status === "ACTIVE" ? "confirmed" : "pending"}</span> },
            ]}
          />
        </Panel>
      )}

      {clears.length > 0 && topRule && (
        <Panel title={`Clears ${topRule.id} when`} table>
          <Table
            className="ast-table pg-analysis-numcols"
            data={clears}
            keyExtractor={(c) => c.tag}
            onRowClick={(c) => open(c.tag)}
            columns={[
              { key: "t", header: "Signal", render: (c) => <span className="ast-num">{c.tag}</span> },
              { key: "n", header: "Now", render: (c) => <span className="ast-num">{fmt(c.now)}<span className="ast-unit">{c.unit}</span></span> },
              { key: "g", header: "Target", render: (c) => <span className="ast-num">{c.up ? "≥ " : "≤ "}{fmt(c.target)}<span className="ast-unit">{c.unit}</span></span> },
              { key: "d", header: "Change", render: (c) => <span className="ast-num">{c.change >= 0 ? "+" : "−"}{fmt(Math.abs(c.change))}<span className="ast-unit">{c.unit}</span></span> },
              { key: "z", header: "Residual", render: (c) => <span className="ast-num">{sigma(c.z)}</span> },
            ]}
          />
          <MissingNote title={`Then ${4 - Math.min(4, topRule.clean)} more clean samples.`} />
        </Panel>
      )}

      <WhyDisclosure summary="Method">
        <p className="pg-analysis-prose">
          {frame
            ? `Each valid signal weighs max(0, |residual σ| − 1), plus 3 in alert, normalised to 100 %. Targets are the reference-model value ±3σ; a confirmed rule clears after 4 clean samples${frame.defs.plant === "kiln" ? " (D5 §9.2)" : ""}. `
            : "Status-weighted attribution as reported by the snapshot, normalised to 100 %. "}
          Shares are residual attribution computed on this page, not a probability decomposition; contribution is not cause. SHAP values are not
          available for this model.
        </p>
      </WhyDisclosure>
    </Section>
  );
}
