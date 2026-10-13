"use client";

import React, { useId, useMemo, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import { StatusChip } from "../insights-ui";
import type { InsightsResponse, Severity, SourceEvidence } from "@/server/services/insights-service";
import "./source-module.css";

export interface SourceModuleProps {
  data: InsightsResponse["analysis"];
  onBack?: () => void;
}

/* ------------------------------------------------------------------ */
/* Derived model                                                      */
/* ------------------------------------------------------------------ */

/** Evidence is exactly what the payload attaches to each source. */
type Evidence = SourceEvidence & { weight: number | null };

interface Candidate {
  id: string;
  rank: number;
  cause: string;
  subsystem: string;
  confidence: number;
  contribution: number;
  severity: Severity;
  symptom: string;
  evidence: Evidence[];
}

const SYMPTOM_RULES: Array<[RegExp, string]> = [
  [/residual|nominal|no active/i, "Residual in limits"],
  [/bpfo|bpfi|bsf|ftf|race|spall|flak|bearing/i, "Envelope impacts"],
  [/misalign|coupling|angular|offset/i, "2X run-speed peak"],
  [/unbalanc|imbalanc|eccentric/i, "1X run-speed peak"],
  [/loose|soft foot/i, "Sub-harmonic train"],
  [/cavitat|vane|pulsat|flow|pressure/i, "Pressure pulsation"],
  [/gear|mesh|tooth/i, "Gear-mesh sidebands"],
  [/stator|electr|motor|rotor bar|current/i, "2X line frequency"],
  [/lubric|grease|oil|friction/i, "HF friction noise"],
  [/temp|thermal|overheat|heat|shell|refractor/i, "Thermal rise"],
];

function symptomFor(cause: string): string {
  for (const [re, label] of SYMPTOM_RULES) if (re.test(cause)) return label;
  return "Signal excursion";
}

function buildCandidates(data: InsightsResponse["analysis"]): Candidate[] {
  const weightByTag = new Map((data.features ?? []).map((f) => [f.tag, f.weight]));
  const sources = data.sources ?? [];
  const withEvidence = sources.map((s) => ({
    s,
    evidence: (s.evidence ?? []).map((e) => ({ ...e, weight: weightByTag.get(e.tag) ?? null })),
  }));
  return withEvidence
    .sort((a, b) => b.s.confidence - a.s.confidence || b.s.contribution - a.s.contribution)
    .map(({ s, evidence }, i) => ({
      id: s.id,
      rank: i + 1,
      cause: s.cause,
      subsystem: s.subsystem,
      confidence: Math.round(s.confidence),
      contribution: Math.round(s.contribution),
      severity: s.severity,
      symptom: symptomFor(s.cause),
      evidence,
    }));
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function sevClass(s: Severity): string {
  return s === "Critical" ? "sev-bad" : s === "Advisory" ? "sev-warn" : "sev-good";
}

function trunc(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}


/* ------------------------------------------------------------------ */
/* Icons (monoline, 1.5px)                                            */
/* ------------------------------------------------------------------ */

function Icon({ name }: { name: "fault" | "ok" | "back" }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "fault":
      return (
        <svg {...common}>
          <path d="M12 4 3 19h18L12 4Z" />
          <path d="M12 10v4M12 16.5v.5" />
        </svg>
      );
    case "ok":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 12 2.5 2.5 4.5-5" />
        </svg>
      );
    case "back":
      return (
        <svg {...common}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      );
  }
}

/* ------------------------------------------------------------------ */
/* Causal-path diagram                                                */
/* ------------------------------------------------------------------ */

const DG_W = 760;
const NODE_W = 150;
const NODE_H = 32;
const ROW_GAP = 12;
const HEAD_H = 26;
const COL_STEP = (DG_W - NODE_W) / 3;
const COL_LABELS = ["Evidence sensor", "Symptom", "Root cause", "Subsystem"];

interface GNode {
  key: string;
  col: number;
  label: string;
  title: string;
  x: number;
  y: number;
  candidateIds: string[];
  candidate?: Candidate;
}

interface GEdge {
  key: string;
  d: string;
  confidence: number;
  candidateIds: string[];
  title: string;
}

function buildGraph(cands: Candidate[]) {
  const cols: Array<Map<string, GNode>> = [new Map(), new Map(), new Map(), new Map()];
  const edges = new Map<string, { from: GNode; to: GNode; confidence: number; candidateIds: string[] }>();

  const node = (col: number, key: string, label: string, title: string, cid: string, candidate?: Candidate) => {
    let n = cols[col].get(key);
    if (!n) {
      n = { key, col, label, title, x: 0, y: 0, candidateIds: [], candidate };
      cols[col].set(key, n);
    }
    if (!n.candidateIds.includes(cid)) n.candidateIds.push(cid);
    return n;
  };
  const link = (from: GNode, to: GNode, c: Candidate) => {
    const key = `${from.key}>${to.key}`;
    const e = edges.get(key) ?? { from, to, confidence: 0, candidateIds: [] };
    e.confidence = Math.max(e.confidence, c.confidence);
    if (!e.candidateIds.includes(c.id)) e.candidateIds.push(c.id);
    edges.set(key, e);
  };

  for (const c of cands) {
    const sym = node(1, `sym:${c.symptom}`, c.symptom, c.symptom, c.id);
    const cause = node(2, `cause:${c.id}`, c.cause, `${c.cause} · ${c.confidence} %`, c.id, c);
    const sub = node(3, `sub:${c.subsystem}`, c.subsystem, c.subsystem, c.id);
    for (const ev of c.evidence) {
      const s = node(0, `sen:${ev.tag}`, ev.tag, `${ev.tag} · ${ev.label} · ${ev.detail}`, c.id);
      link(s, sym, c);
    }
    link(sym, cause, c);
    link(cause, sub, c);
  }

  const rows = Math.max(1, ...cols.map((m) => m.size));
  const rowH = NODE_H + ROW_GAP;
  const height = HEAD_H + rows * rowH - ROW_GAP + 2;
  const nodes: GNode[] = [];
  cols.forEach((m, col) => {
    const offset = HEAD_H + ((rows - m.size) * rowH) / 2;
    Array.from(m.values()).forEach((n, i) => {
      n.x = col * COL_STEP;
      n.y = offset + i * rowH;
      nodes.push(n);
    });
  });

  const edgeList: GEdge[] = Array.from(edges.entries()).map(([key, e]) => {
    const x1 = e.from.x + NODE_W;
    const y1 = e.from.y + NODE_H / 2;
    const x2 = e.to.x - 2;
    const y2 = e.to.y + NODE_H / 2;
    const mx = (x1 + x2) / 2;
    return {
      key,
      d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${mx.toFixed(1)} ${y1.toFixed(1)}, ${mx.toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`,
      confidence: e.confidence,
      candidateIds: e.candidateIds,
      title: `${e.from.label} → ${e.to.label} · ${e.confidence} %`,
    };
  });

  return { nodes, edges: edgeList, height };
}

function CausalDiagram({
  cands,
  selected,
  onSelect,
}: {
  cands: Candidate[];
  selected: Candidate;
  onSelect: (id: string) => void;
}) {
  const uid = useId().replace(/:/g, "");
  const graph = useMemo(() => buildGraph(cands), [cands]);
  const tone = sevClass(selected.severity);
  const inactive = graph.edges.filter((e) => !e.candidateIds.includes(selected.id));
  const active = graph.edges.filter((e) => e.candidateIds.includes(selected.id));

  return (
    <div className="src-diagram-scroll">
      <svg
        className={`src-diagram ${tone}`}
        viewBox={`0 0 ${DG_W} ${graph.height}`}
        role="img"
        aria-label={`Causal path: ${selected.evidence.map((e) => e.tag).join(", ") || "no sensors"} → ${selected.symptom} → ${selected.cause} (${selected.confidence} %) → ${selected.subsystem}`}
      >
        <defs>
          <marker id={`${uid}-mute`} viewBox="0 0 6 6" refX="5.5" refY="3" markerWidth="6" markerHeight="6" markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" className="src-mk-mute" />
          </marker>
          <marker id={`${uid}-on`} viewBox="0 0 6 6" refX="5.5" refY="3" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" className="src-mk-on" />
          </marker>
        </defs>

        {COL_LABELS.map((l, i) => (
          <text key={l} x={i * COL_STEP} y={11} className="src-dg-col">
            {l}
          </text>
        ))}

        {inactive.map((e) => (
          <path
            key={e.key}
            d={e.d}
            className="src-edge"
            strokeOpacity={0.18 + 0.4 * (e.confidence / 100)}
            markerEnd={`url(#${uid}-mute)`}
          >
            <title>{e.title}</title>
          </path>
        ))}
        {active.map((e) => (
          <path key={e.key} d={e.d} className="src-edge is-active" markerEnd={`url(#${uid}-on)`}>
            <title>{e.title}</title>
          </path>
        ))}

        {graph.nodes.map((n) => {
          const on = n.candidateIds.includes(selected.id);
          const c = n.candidate;
          const cls = `src-node ${on ? "is-active" : ""} ${c ? `is-btn ${sevClass(c.severity)}` : ""}`;
          const body = (
            <>
              <title>{n.title}</title>
              <rect x={n.x + 0.5} y={n.y + 0.5} width={NODE_W - 1} height={NODE_H - 1} rx={8} className="src-node-rect" />
              {c ? (
                <>
                  <circle cx={n.x + 12} cy={n.y + NODE_H / 2} r={3} className="src-node-dot" />
                  <text x={n.x + 21} y={n.y + NODE_H / 2} className="src-node-text">
                    {trunc(n.label, 15)}
                  </text>
                  <text x={n.x + NODE_W - 10} y={n.y + NODE_H / 2} className="src-node-val">
                    {c.confidence} %
                  </text>
                </>
              ) : (
                <text x={n.x + 11} y={n.y + NODE_H / 2} className="src-node-text">
                  {trunc(n.label, 21)}
                </text>
              )}
            </>
          );
          if (!c) {
            return (
              <g key={n.key} className={cls}>
                {body}
              </g>
            );
          }
          return (
            <g
              key={n.key}
              className={cls}
              role="button"
              tabIndex={0}
              aria-pressed={c.id === selected.id}
              aria-label={`Select ${c.cause}, ${c.confidence} % confidence`}
              onClick={() => onSelect(c.id)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  onSelect(c.id);
                }
              }}
            >
              {body}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Module                                                             */
/* ------------------------------------------------------------------ */

export function SourceModule({ data, onBack }: SourceModuleProps) {
  const candidates = useMemo(() => buildCandidates(data), [data]);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const subsystems = useMemo(() => Array.from(new Set(candidates.map((c) => c.subsystem))), [candidates]);
  const filterItems = useMemo(
    () => [{ id: "all", label: "All" }, ...subsystems.map((s) => ({ id: s, label: trunc(s, 22) }))],
    [subsystems]
  );
  const activeFilter = filter === "all" || subsystems.includes(filter) ? filter : "all";
  const scoped = useMemo(
    () => (activeFilter === "all" ? candidates : candidates.filter((c) => c.subsystem === activeFilter)),
    [candidates, activeFilter]
  );
  const selected = scoped.find((c) => c.id === selectedId) ?? scoped[0];
  const top = scoped[0];

  const backButton = onBack && (
    <PillButton variant="secondary" onClick={onBack} icon={<Icon name="back" />} aria-label="Back to assets">
      Assets
    </PillButton>
  );

  if (!top || !selected) {
    return (
      <div className="src-root">
        <header className="src-head">
          <div className="src-head-left">
            {backButton}
            <h2 className="src-title">Issue source</h2>
          </div>
        </header>
        <div className="src-card src-empty">No candidate sources reported.</div>
      </div>
    );
  }

  return (
    <div className="src-root">
      {/* Tier 1 — header */}
      <header className="src-head">
        <div className="src-head-left">
          {backButton}
          <h2 className="src-title">Issue source</h2>
          <span className={`src-topchip ${sevClass(top.severity)}`} title={`${top.cause} · ${top.subsystem}`}>
            <span className="src-dot" aria-hidden="true" />
            <span className="src-topchip-name">{top.cause}</span>
            <span className="src-topchip-val">{top.confidence} %</span>
          </span>
        </div>
        <div className="src-filter" role="group" aria-label="Filter by subsystem">
          <PillNav items={filterItems} activeId={activeFilter} onChange={setFilter} />
        </div>
      </header>

      {/* Tier 2 — causal path + ranked candidates */}
      <section className="src-card src-path" aria-labelledby="src-path-title">
        <div className="src-card-head">
          <h3 id="src-path-title" className="src-card-title">Causal path</h3>
          <div className="src-legend" aria-hidden="true">
            <span className={`src-legend-key is-active ${sevClass(selected.severity)}`} />
            Selected
            <span className="src-legend-key" />
            Other candidates
          </div>
        </div>
        <CausalDiagram cands={scoped} selected={selected} onSelect={setSelectedId} />
      </section>

      <section className="src-card src-cands" aria-labelledby="src-cands-title">
        <div className="src-card-head">
          <h3 id="src-cands-title" className="src-card-title">Candidates</h3>
          <span className="src-card-meta">Confidence, %</span>
        </div>

        <div className="src-rank" role="group" aria-label="Candidate causes ranked by confidence">
          {scoped.map((c) => {
            const on = c.id === selected.id;
            return (
              <button
                key={c.id}
                type="button"
                className={`src-rank-row ${sevClass(c.severity)} ${on ? "is-active" : ""}`}
                aria-pressed={on}
                aria-label={`Rank ${c.rank}: ${c.cause}, ${c.confidence} % confidence`}
                onClick={() => setSelectedId(c.id)}
              >
                <span className="src-rank-n">{c.rank}</span>
                <span className="src-rank-name">{c.cause}</span>
                <span className="src-rank-val">{c.confidence} %</span>
                <span className="src-rank-bar" aria-hidden="true">
                  <i style={{ width: `${c.confidence}%` }} />
                </span>
              </button>
            );
          })}
          <div className="src-rank-axis" aria-hidden="true">
            <span>0 %</span>
            <span>50 %</span>
            <span>100 %</span>
          </div>
        </div>

        <div className="src-ev">
          <div className="src-ev-head">
            <span>Evidence</span>
            <span>
              {selected.evidence.length} {selected.evidence.length === 1 ? "sensor" : "sensors"}
            </span>
          </div>
          {selected.evidence.length === 0 ? (
            <p className="src-ev-empty">No sensor evidence recorded for this source.</p>
          ) : (
            <ul className="src-ev-list">
              {selected.evidence.map((ev) => (
                <li key={ev.tag} className={`src-ev-row ${sevClass(ev.severity)}`}>
                  <span className="src-ev-id">
                    <span className="src-ev-tag">{ev.tag}</span>
                    <span className="src-ev-label">{ev.label}</span>
                  </span>
                  <span className="src-dev">{ev.detail}</span>
                  <span className="src-ev-onset" title="Model attribution weight">
                    {ev.weight === null ? "—" : `w ${Math.round(ev.weight)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Tier 3 — register */}
      <section className="src-card src-register" aria-labelledby="src-reg-title">
        <div className="src-card-head">
          <h3 id="src-reg-title" className="src-card-title">Candidate register</h3>
          <span className="src-card-meta">{data.model?.engine}</span>
        </div>
        <div className="src-table-wrap">
          <table className="src-table">
            <thead>
              <tr>
                <th className="src-num">#</th>
                <th>Cause</th>
                <th>Subsystem</th>
                <th className="src-num">Confidence</th>
                <th className="src-num">Share</th>
                <th className="src-num">Evidence</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scoped.map((c) => {
                const on = c.id === selected.id;
                return (
                  <tr
                    key={c.id}
                    className={`${sevClass(c.severity)} ${on ? "is-selected" : ""}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <td className="src-num src-muted">{c.rank}</td>
                    <td>
                      <button
                        type="button"
                        className="src-row-btn"
                        aria-pressed={on}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(c.id);
                        }}
                      >
                        <span className="src-badge" aria-hidden="true">
                          <Icon name={c.severity === "Normal" ? "ok" : "fault"} />
                        </span>
                        <span className="src-cause">
                          <span className="src-cause-name">{c.cause}</span>
                          <span className="src-cause-meta">{c.symptom}</span>
                        </span>
                      </button>
                    </td>
                    <td className="src-muted">{c.subsystem}</td>
                    <td className="src-num">{c.confidence} %</td>
                    <td className="src-num src-muted">{c.contribution} %</td>
                    <td className="src-num src-muted">
                      {c.evidence.length} {c.evidence.length === 1 ? "sensor" : "sensors"}
                    </td>
                    <td>
                      <StatusChip status={c.severity} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default SourceModule;
