"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav, Table } from "@/components/ui";
import { formatDuration } from "@/lib/kiln-sim/engine";
import type { FaultClass, IssueSource } from "@/server/services/insights-service";
import { Chevron, Panel, Section, alertTone, splitCause } from "./an-ui";
import { openDiagnosisAt } from "./an-actions";
import { SECTION_IDS, deviationChain, episodes, machineFaults, machineSources, ruleById, sevToTone, sigma, type SectionProps } from "./an-derive";

interface Hypothesis {
  id: string;
  fault: FaultClass | null;
  source: IssueSource | null;
}

const nameOf = (h: Hypothesis) => (h.fault ? splitCause(h.fault.label).name.replace(/^R-[A-Z]+-\d+\s*/, "") : h.source ? splitCause(h.source.cause).name : h.id);

/**
 * Mechanism — why the faults Diagnosis lists are happening: observed residual
 * per rule input, deviation along the process flow, cause and consequence, past
 * episodes. The ranked fault list lives on Diagnosis; this section links to it.
 */
export function AnFaults({ insights, frame, go }: SectionProps) {
  const a = insights.analysis;
  const faults = machineFaults(a);
  const hyps: Hypothesis[] = [
    ...faults.map((f) => ({ id: f.id, fault: f, source: a.sources.find((s) => s.id === f.id) ?? null })),
    ...machineSources(a)
      .filter((s) => !faults.some((f) => f.id === s.id))
      .map((s) => ({ id: s.id, fault: null, source: s })),
  ];
  const [sel, setSel] = useState<string | null>(null);
  const chain = useMemo(() => (frame ? deviationChain(frame) : []), [frame]);
  const past = useMemo(() => (frame ? episodes(frame).slice(0, 5) : []), [frame]);
  const selected = hyps.find((h) => h.id === sel) ?? hyps[0] ?? null;
  if (!selected) return null;

  const rule = ruleById(frame, selected.id);
  const zOf = (tag: string) => frame?.signals[tag]?.z ?? null;
  const evidenceTags = (h: Hypothesis) => ruleById(frame, h.id)?.tags ?? h.source?.evidence.map((e) => e.tag) ?? [];
  const matched = (h: Hypothesis) => evidenceTags(h).filter((t) => {
    const z = zOf(t);
    return z !== null ? Math.abs(z) > 3 : (h.source?.evidence.find((e) => e.tag === t)?.severity ?? "Normal") !== "Normal";
  });
  const matrixFaults = hyps.slice(0, 5);
  const matrixTags = Array.from(new Set(matrixFaults.flatMap(evidenceTags))).slice(0, 12);
  const firstChain = chain.reduce<number>((m, n) => Math.max(m, n.minutesAgo), 0);
  const confirmed = hyps.filter((h) => ruleById(frame, h.id)?.status === "ACTIVE").length;
  const top = hyps[0];
  const topP = top.fault ? Math.round(top.fault.probability) : top.source ? Math.round(top.source.confidence) : null;
  const topInputs = evidenceTags(top).length;
  // Live frames: the rule engine's persistence score (grows with matching samples), not a probability (D4 T8.1).
  const topScore = topP === null ? "" : frame ? ` · persistence score ${topP}` : ` ${topP} %`;
  const selectedTop = `${top.id}${topScore}${topInputs ? ` · ${matched(top).length} of ${topInputs} inputs off model` : ""}`;

  return (
    <Section id={SECTION_IDS.diagnosis} title="Mechanism">
      <div className="pg-analysis-pointer" role="group" aria-label="Fault candidates">
        <span className="pg-analysis-pointer-line ast-num">
          {hyps.length} fault candidate{hyps.length === 1 ? "" : "s"} · {confirmed} confirmed · top {selectedTop}
        </span>
        <PillButton variant="secondary" className="pg-analysis-link" trailing={<Chevron />} onClick={() => openDiagnosisAt("dx-diagnosis", go)}>
          Faults in Diagnosis
        </PillButton>
      </div>
      {hyps.length > 1 && (
        <PillNav items={hyps.map((h) => ({ id: h.id, label: h.id }))} activeId={selected.id} onChange={setSel} arrows />
      )}

      {matrixTags.length > 0 && (
        <Panel title={`Observed residual per rule input`}>
          <div className="pg-analysis-chart-scroll">
            <table className="pg-analysis-matrix">
              <thead>
                <tr>
                  <th>Sensor</th>
                  {matrixFaults.map((h) => (
                    <th key={h.id} title={nameOf(h)}>
                      {h.id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixTags.map((tag) => (
                  <tr key={tag}>
                    <td>{tag}</td>
                    {matrixFaults.map((h) => {
                      if (!evidenceTags(h).includes(tag)) return <td key={h.id} className="is-off">·</td>;
                      const z = zOf(tag);
                      if (z === null) {
                        const ev = h.source?.evidence.find((e) => e.tag === tag);
                        return <td key={h.id} data-tone={alertTone(sevToTone(ev?.severity ?? "Normal"))}>{ev && ev.severity !== "Normal" ? "●" : "–"}</td>;
                      }
                      const t = Math.abs(z) > 6 ? "bad" : Math.abs(z) > 3 ? "warn" : undefined;
                      return (
                        <td key={h.id} data-tone={t}>
                          {Math.abs(z) > 3 ? (z > 0 ? "↑ " : "↓ ") : "– "}
                          {sigma(z)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {chain.length > 0 && (
        <Panel title="Deviation along the process flow">
          <ol className="pg-analysis-flow">
            {chain.map((n) => (
              <li key={n.id}>
                <strong>{n.name}</strong>
                <span className="ast-num">
                  {n.minutesAgo === firstChain && chain.length > 1 ? "first · " : ""}−{formatDuration(n.minutesAgo)}
                </span>
                <span className="ast-num">{n.tags.join(", ")}</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {rule && (
        <Panel title={`Fault summary · ${rule.id} (${rule.name})`}>
          <dl className="pg-analysis-dl">
            <dt>What is wrong</dt>
            <dd>{rule.cause}</dd>
            <dt>What it impacts</dt>
            <dd>{rule.consequence}</dd>
            <dt>Rule broken</dt>
            <dd className="ast-num">
              {rule.id}: {rule.logic}
            </dd>
            {rule.evidence && (
              <>
                <dt>Evidence</dt>
                <dd className="ast-num">{rule.evidence}</dd>
              </>
            )}
            {rule.action && (
              <>
                <dt>Action to take</dt>
                <dd>{rule.action}</dd>
              </>
            )}
          </dl>
        </Panel>
      )}

      {past.length > 0 && (
        <Panel title="Past episodes" table>
          <Table
            className="ast-table pg-analysis-num-last2"
            data={past}
            keyExtractor={(e) => `${e.ruleId}-${e.confirmedT}`}
            columns={[
              { key: "r", header: "Rule", render: (e) => <span className="ast-cell-stack"><span className="ast-cell-title">{e.name}</span><span className="ast-cell-sub">{e.ruleId}</span></span> },
              { key: "c", header: "Confirmed", render: (e) => <span className="ast-num">{e.confirmedClock}</span> },
              { key: "a", header: "Actions", render: (e) => <span className="ast-cell-text">{e.actions.join(", ") || "—"}</span> },
              { key: "x", header: "Cleared", render: (e) => <span className="ast-num">{e.clearedClock ?? "open"}</span> },
              { key: "d", header: "Duration", render: (e) => <span className="ast-num">{formatDuration(e.minutes)}</span> },
            ]}
          />
        </Panel>
      )}
    </Section>
  );
}
