"use client";

import React from "react";
import { Tile, TileGrid } from "@/components/ui";
import { focusSensorOn } from "../sensor-focus";
import { Panel, Section } from "./an-ui";
import { SECTION_IDS, Z_ANOMALY, Z_UNCLASSIFIED, fmt, liveRules, machineFaults, sevToTone, sigma, type SectionProps } from "./an-derive";
import { isConditionRule } from "@/lib/plant-defs";

const withUnit = (v: string, unit: string) => (unit ? `${v} ${unit}` : v);

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
          return { tag, name: def.name, unit: def.unit, now: s.value, target, up: s.z < 0, change: target - s.value, z: s.z };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    : [];
  const open = (tag: string) => {
    focusSensorOn("trends", tag);
    go("trends");
  };

  return (
    <Section id={SECTION_IDS.explanation} title="Explanation" bare>
      <section className="ast-card pg-an-card">
        <Panel title={`Contribution to ${top ? top.id : "the health score"}`}>
          <ol className="pg-an-contrib" aria-label="Input contributions, largest first">
            {steps.map((r) => (
              <li key={r.id}>
                <button type="button" className="pg-an-contrib-row" onClick={() => open(r.tag)} aria-label={`${r.label}, ${Math.round(r.share)} % of the score${r.z !== null ? `, residual ${sigma(r.z)}` : ""}. Open in Trends`}>
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
        <>
          <h4 className="ui-tiles-head">
            <span>
              Rule trace <b>{rules.length}</b>
            </span>
            <span>samples to confirm · clean samples to clear</span>
          </h4>
          <TileGrid label="Rule trace" min={340}>
            {rules.map((r) => {
              const confirmed = r.status === "ACTIVE";
              const tone = confirmed ? sevToTone(r.severity) : undefined;
              return (
                <Tile
                  key={r.id}
                  title={r.id}
                  sub={r.name}
                  status={{ label: confirmed ? "confirmed" : "pending", tone }}
                  tone={tone}
                  value={String(r.persistence)}
                  unit={r.persistence === 1 ? "sample" : "samples"}
                  meter={Math.min(100, (r.persistence / Math.max(1, r.threshold)) * 100)}
                  facts={[
                    { label: "Needed", value: String(r.threshold) },
                    { label: "Clean", value: `${r.clean} / 4` },
                  ]}
                >
                  <dl className="pg-analysis-dl pg-an-trace">
                    <dt>Condition</dt>
                    <dd>{r.logic}</dd>
                    <dt>Value</dt>
                    <dd className="ast-num">{r.evidence || "—"}</dd>
                  </dl>
                </Tile>
              );
            })}
          </TileGrid>
        </>
      )}

      {clears.length > 0 && topRule && (
        <>
          <h4 className="ui-tiles-head">
            <span>
              Clears <b>{topRule.id}</b> when
            </span>
            <span>then {4 - Math.min(4, topRule.clean)} more clean samples</span>
          </h4>
          <TileGrid label={`Clears ${topRule.id} when`} min={280} className="pg-an-pair">
            {clears.map((c) => (
              <Tile
                key={c.tag}
                title={c.tag}
                sub={c.name}
                value={`${fmt(c.now)} → ${c.up ? "≥" : "≤"} ${fmt(c.target)}`}
                unit={c.unit}
                facts={[
                  { label: "Change", value: withUnit(`${c.change >= 0 ? "+" : "−"}${fmt(Math.abs(c.change))}`, c.unit) },
                  { label: "Residual", value: sigma(c.z), tone: Math.abs(c.z) > Z_UNCLASSIFIED ? "bad" : "warn" },
                ]}
                onSelect={() => open(c.tag)}
              />
            ))}
          </TileGrid>
        </>
      )}
    </Section>
  );
}
