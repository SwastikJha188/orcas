"use client";

import React from "react";
import { rowActivate } from "@/components/ui/row-activate";
import type { RuleState, SimFrame } from "@/lib/kiln-sim/engine";
import type { RuleCategory } from "@/lib/kiln-sim/rules";
import { ruleCategories } from "@/lib/plant-defs";
import { HYSTERESIS_SAMPLES, type FaultMode } from "./diagnosis-model";
import { WhyDisclosure } from "./analysis/an-ui";

/* ==========================================================================
   Rule board. Live machines: the machine's rule library (`frame.defs`) as a
   live board, one tile per rule grouped by category, showing where each rule is in its
   persistence (confirming) and hysteresis (clearing) cycle. Other machines:
   the DB failure-mode library ranked by signature match.
   ========================================================================== */

type TileState = "quiet" | "confirming" | "active" | "clearing";

function tileState(r: RuleState): TileState {
  if (r.status === "QUIET") return "quiet";
  if (r.status === "PENDING") return "confirming";
  return r.clean > 0 ? "clearing" : "active";
}

function tileTone(r: RuleState, st: TileState): string {
  if (st === "quiet") return "idle";
  if (st === "confirming") return "idle";
  return r.severity === "Critical" ? "bad" : "warn";
}

/** Segmented sample counter: filled = samples counted toward the transition. */
export function Samples({ n, of, label }: { n: number; of: number; label: string }) {
  const filled = Math.max(0, Math.min(of, n));
  return (
    <span className="pg-diag-samples" role="img" aria-label={label}>
      {Array.from({ length: of }, (_, i) => (
        <i key={i} className={i < filled ? "is-on" : ""} />
      ))}
    </span>
  );
}

function stateLine(r: RuleState, st: TileState, acked: boolean): { text: string; meter: React.ReactNode } {
  switch (st) {
    case "confirming": {
      const of = Math.max(1, r.threshold);
      return {
        text: `Confirming ${Math.min(r.persistence, of)}/${of}`,
        meter: <Samples n={r.persistence} of={of} label={`${r.persistence} of ${of} samples to confirm`} />,
      };
    }
    case "clearing":
      return {
        text: `Clearing ${r.clean}/${HYSTERESIS_SAMPLES}`,
        meter: <Samples n={r.clean} of={HYSTERESIS_SAMPLES} label={`${r.clean} of ${HYSTERESIS_SAMPLES} clean samples to clear`} />,
      };
    case "active":
      return { text: `${r.severity} · ${r.priority}${acked ? " · ack" : " · unack"}`, meter: null };
    default:
      return { text: "Quiet", meter: null };
  }
}

const LANE_RANK: Record<TileState, number> = { active: 0, clearing: 1, confirming: 2, quiet: 3 };
const LANE_LABEL: Record<TileState, string> = { active: "Active", clearing: "Clearing", confirming: "Confirming", quiet: "Quiet" };

/**
 * The machine's rule library as a matrix: lane, persistence / hysteresis
 * ticks, inputs valid (a rule with an invalid input is inhibited), fires in
 * the retained log and the last one. Firing rules sort to the top of their
 * category.
 */
export function RuleBoard({
  frame,
  acked,
  validity,
  fires,
  fmtT,
  selectedRuleId,
  onSelect,
}: {
  frame: SimFrame;
  acked: Set<string>;
  /** Tag → trusted (valid) by sensor validation. */
  validity: Map<string, boolean>;
  fires: Map<string, { fires: number; last: number | null }>;
  fmtT: (t: number) => string;
  selectedRuleId: string | null;
  onSelect: (ruleId: string | null) => void;
}) {
  // Library order (data quality and anomaly last), then any category the frame carries beyond it.
  const order: RuleCategory[] = ruleCategories(frame.defs);
  for (const r of frame.rules) if (!order.includes(r.category)) order.push(r.category);
  const groups = order.map((c) => ({
    category: c,
    rules: frame.rules.filter((r) => r.category === c).sort((a, b) => LANE_RANK[tileState(a)] - LANE_RANK[tileState(b)]),
  })).filter((g) => g.rules.length > 0);
  const counts = { active: 0, clearing: 0, confirming: 0, quiet: 0 } as Record<TileState, number>;
  for (const r of frame.rules) counts[tileState(r)] += 1;
  // Quiet rules fold into one row per category; the selected rule always stays visible.
  const [openQuiet, setOpenQuiet] = React.useState<Set<string>>(new Set());
  const toggleQuiet = (c: string) =>
    setOpenQuiet((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });

  return (
    <div className="dxo-card dxo-table-card">
      <div className="dxo-card-head pg-diag-card-head">
        <span className="ast-caption ast-num pg-diag-pipe">
          <span>{frame.rules.length} rules</span>
          <span>{counts.active} active</span>
          <span>{counts.clearing} clearing</span>
          <span>{counts.confirming} confirming</span>
          <span>{counts.quiet} quiet</span>
          <span>{frame.pipeline.beyond3s} signals beyond 3σ</span>
        </span>
      </div>
      <div className="dxo-table-wrap">
        <table className="dxo-table pg-diag-table pg-diag-rules">
          <thead>
            <tr>
              <th scope="col">Rule</th>
              <th scope="col">Lane</th>
              <th scope="col">Persist. / clear</th>
              <th scope="col" className="is-right">
                Inputs valid
              </th>
              <th scope="col" className="is-right">
                Fired (log)
              </th>
              <th scope="col">Last fired</th>
              <th scope="col">Logic</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const quiet = g.rules.filter((r) => tileState(r) === "quiet" && r.id !== selectedRuleId);
              const expanded = openQuiet.has(g.category);
              const shown = expanded ? g.rules : g.rules.filter((r) => !quiet.includes(r));
              return (
              <React.Fragment key={g.category}>
                <tr className="pg-diag-group">
                  <th scope="rowgroup" colSpan={7}>
                    {g.category} <span className="ast-num">{g.rules.length}</span>
                  </th>
                </tr>
                {shown.map((r) => {
                  const st = tileState(r);
                  const tone = tileTone(r, st);
                  const inputs = frame.defs.ruleById[r.id]?.inputs ?? [];
                  const ok = inputs.filter((t) => validity.get(t) !== false).length;
                  const inhibited = inputs.length > 0 && ok < inputs.length;
                  const f = fires.get(r.id);
                  const selected = selectedRuleId === r.id;
                  const { meter, text } = stateLine(r, st, acked.has(r.id));
                  return (
                    <tr
                      key={r.id}
                      className={`dxo-row is-clickable ${selected ? "is-focus" : ""} ${st === "quiet" ? "is-quiet" : ""}`}
                      {...rowActivate(() => onSelect(selected ? null : r.id), selected)}
                    >
                      <td>
                        <span className="pg-diag-name">
                          {r.name} <span className="pg-diag-code">{r.id}</span>
                        </span>
                      </td>
                      <td>
                        <span className="pg-diag-state" data-tone={tone}>
                          <span className="ast-chip-dot" aria-hidden="true" />
                          {LANE_LABEL[st]}
                          {st === "active" ? ` · ${acked.has(r.id) ? "ack" : "unack"}` : ""}
                        </span>
                      </td>
                      <td>{meter ? <span className="pg-diag-progress">{meter}<span className="ast-num">{text.replace(/^\D+/, "")}</span></span> : <span className="dxo-none">—</span>}</td>
                      <td className={`is-right ast-num ${inhibited ? "pg-diag-warn" : "pg-diag-muted"}`}>
                        {inputs.length ? `${ok}/${inputs.length}` : "—"}
                        {inhibited ? " · inhibited" : ""}
                      </td>
                      <td className="is-right ast-num">{f?.fires ?? 0}</td>
                      <td className="ast-num pg-diag-muted">{f?.last != null ? fmtT(f.last) : "—"}</td>
                      <td className="pg-diag-logic" title={r.logic}>{r.logic}</td>
                    </tr>
                  );
                })}
                {quiet.length > 0 && (
                  <tr className="pg-diag-quiet-row">
                    <td colSpan={7}>
                      <button type="button" className="pg-diag-inline-link ast-num" aria-expanded={expanded} onClick={() => toggleQuiet(g.category)}>
                        {expanded ? `Hide ${quiet.length} quiet ${quiet.length === 1 ? "rule" : "rules"}` : `${quiet.length} quiet ${quiet.length === 1 ? "rule" : "rules"}`}
                      </button>
                    </td>
                  </tr>
                )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <WhyDisclosure summary="Method">
        <p>
          A rule is raised after 3 matching samples (2 for state rules, 1 if critical) and cleared after {HYSTERESIS_SAMPLES} clean samples. A rule with an
          input that validation does not trust is inhibited. Symptoms count the inputs that fired out of the valid inputs read. Select a rule to scope
          Evidence.
        </p>
        {frame.defs.plant === "pyro" && (
          <p>
            Pyro line: persistence (3 samples, 2 for state rules, 1 for critical), hysteresis ({HYSTERESIS_SAMPLES} clean samples) and every limit are demo
            settings, not plant-approved (D4 §7.2). Simulation is scripted demo behaviour only, not field evidence.
          </p>
        )}
      </WhyDisclosure>
    </div>
  );
}

const MODE_LIMIT = 10;

export function FaultModeChart({
  modes,
  loading,
  selectedRuleId,
  onSelect,
}: {
  modes: FaultMode[];
  loading: boolean;
  selectedRuleId: string | null;
  onSelect: (ruleId: string | null) => void;
}) {
  const [showAll, setShowAll] = React.useState(false);
  const visible = showAll ? modes : modes.slice(0, MODE_LIMIT);
  const engaged = modes.filter((m) => m.score > 0).length;
  return (
    <section className="dxo-card" aria-label="Failure-mode signature match">
      <div className="dxo-card-head">
        <span className="ast-caption ast-num">
          {engaged} / {modes.length} engaged
        </span>
        {modes.length > MODE_LIMIT && (
          <button type="button" className="dxo-link" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
            {showAll ? `Top ${MODE_LIMIT}` : `All ${modes.length}`}
          </button>
        )}
      </div>
      {modes.length === 0 ? (
        <div className="dxo-empty">{loading ? "Loading sensor catalog…" : "No failure modes linked to this machine's sensors."}</div>
      ) : (
        <div>
          <ul className="dxo-modes" aria-label="Failure modes ranked by signature match">
            {visible.map((m) => {
              const tone = m.score >= 50 ? (m.expected === "Critical" ? "bad" : "warn") : "neutral";
              const active = selectedRuleId === m.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    className={`dxo-mode-row ${active ? "is-active" : ""}`}
                    aria-pressed={active}
                    aria-label={`${m.id} ${m.name}: ${m.score} % signature match`}
                    onClick={() => onSelect(active ? null : m.id)}
                  >
                    <span className="dxo-mode-code">{m.id}</span>
                    <span className="dxo-mode-name" title={m.name}>
                      {m.name}
                    </span>
                    <span className="dxo-bar-track" aria-hidden="true">
                      {m.score > 0 && <span className={`dxo-bar-fill dxo-tone-${tone}`} style={{ width: `${m.score}%` }} />}
                    </span>
                    <span className={`dxo-mode-val ${m.score === 0 ? "is-zero" : ""}`}>{m.score} %</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="dxo-mode-axis" aria-hidden="true">
            <span />
            <span />
            <span className="dxo-axis-scale">
              <span style={{ left: "0%" }}>0</span>
              <span style={{ left: "50%" }}>50</span>
              <span style={{ left: "100%" }}>100</span>
            </span>
            <span className="dxo-axis-unit">match, %</span>
          </div>
        </div>
      )}
      <WhyDisclosure summary="Method">
        <p>Match is the share of a failure mode&apos;s sensors in excursion, not a probability.</p>
      </WhyDisclosure>
    </section>
  );
}
