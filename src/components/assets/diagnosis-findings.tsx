"use client";

import React, { useState } from "react";
import { PillButton } from "@/components/ui";
import { isConditionRule } from "@/lib/plant-defs";
import type { Tone } from "./assets-shell-ui";
import { WhyDisclosure } from "./analysis/an-ui";
import { BASIS_TEXT, HYSTERESIS_SAMPLES, VALIDITY_LABEL, alternativesFor, toneOf, type DxSensor, type Finding } from "./diagnosis-model";
import { zText } from "./diagnosis-summary";

/* ==========================================================================
   Diagnosis findings. Machine faults first, then the items that are not
   machine condition (data quality, anomaly, service life), each in its own
   group. A row answers: what (fault, where), how bad (severity, priority,
   lifecycle), since when, time to limit; under it what to do (verify) and
   who owns it. Expanding a row shows the inputs as observed vs expected
   with units and % deviation (σ secondary), cause → consequence, and one
   "Rule detail" disclosure with logic, alternatives, what is not yet
   proven, HOLD and the score basis. Confirm / reject feedback is kept in
   this browser and written to the log.
   ========================================================================== */

export type Feedback = "confirmed" | "rejected";

/** Lifecycle words; severity is shown on its own. */
function stateText(f: Finding): string {
  if (f.ruleId === "R-ANM-01") return "Unknown anomaly";
  switch (f.state) {
    case "active":
      return "Confirmed";
    case "clearing":
      return `Clearing ${f.clean}/${HYSTERESIS_SAMPLES}`;
    case "confirming":
      return `Suspected ${Math.min(f.persistence, f.threshold)}/${f.threshold}`;
    case "recorded":
      return f.probability !== null ? `Recorded · ${Math.round(f.probability)} %` : "Recorded";
    case "matching":
      return f.probability !== null ? `Signature match · ${Math.round(f.probability)} %` : "Signature match";
    default:
      return "Not present";
  }
}

function fmt(v: number) {
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 10 ? 1 : 2);
}

const signed = (v: number, text: string) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${text}`;

/**
 * Observed vs expected: % of the expected value; percentage points for % signals;
 * the absolute difference with its unit when the expected value is near zero.
 */
export function deviationText(s: DxSensor | undefined): string | null {
  if (!s || s.value === null || s.model === null || !Number.isFinite(s.value) || !Number.isFinite(s.model)) return null;
  const d = s.value - s.model;
  if (s.unit === "%") return signed(d, `${fmt(Math.abs(d))} pp`);
  const pct = Math.abs(s.model) > 1e-6 ? (d / Math.abs(s.model)) * 100 : Infinity;
  if (!Number.isFinite(pct) || Math.abs(pct) > 1000) return signed(d, `${fmt(Math.abs(d))} ${s.unit}`.trim());
  return signed(pct, `${Math.abs(pct) < 10 ? Math.abs(pct).toFixed(1) : Math.round(Math.abs(pct))} %`);
}

/** Inputs the pattern reads, and which of them currently show the symptom. */
export function symptomsOf(f: Finding, byTag: Map<string, DxSensor>) {
  const inputs = f.inputs.length ? f.inputs : f.tags;
  const fired = new Set(f.tags);
  const rows = inputs.map((tag) => {
    const s = byTag.get(tag);
    const invalid = !!s && (s.validity === "invalid" || s.validity === "stale");
    return { tag, s, state: invalid ? ("n/a" as const) : fired.has(tag) ? ("present" as const) : ("absent" as const) };
  });
  return { rows, present: rows.filter((r) => r.state === "present").length, valid: rows.filter((r) => r.state !== "n/a").length };
}

function limitTone(s: DxSensor | undefined): Tone | undefined {
  if (!s) return undefined;
  return s.severity === "Critical" ? "bad" : s.severity === "Advisory" ? "warn" : undefined;
}

/** Inputs as observed vs expected: units on both, % deviation first, σ secondary. */
function InputCompare({ f, byTag }: { f: Finding; byTag: Map<string, DxSensor> }) {
  const { rows, present, valid } = symptomsOf(f, byTag);
  if (!rows.length) return <p className="pg-diag-f-note">{f.evidence || "No sensor inputs recorded for this pattern."}</p>;
  const sorted = [...rows].sort((a, b) => Number(b.state === "present") - Number(a.state === "present"));
  return (
    <div className="pg-diag-f-inputs">
      <p className="pg-diag-f-caption ast-num">
        {valid > 0 ? `Inputs fired · ${present} of ${valid}` : "Inputs"}
        {valid < rows.length ? ` · ${rows.length - valid} not valid` : ""}
      </p>
      <table className="pg-diag-f-cmp">
        <thead>
          <tr>
            <th scope="col">Signal</th>
            <th scope="col" className="is-right">
              Observed
            </th>
            <th scope="col" className="is-right">
              Expected
            </th>
            <th scope="col" className="is-right">
              Deviation
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ tag, s, state }) => {
            const dev = deviationText(s);
            const z = zText(s?.z ?? null);
            const note = state === "present" ? null : state === "absent" ? "not fired" : `${f.tags.includes(tag) ? "fired · " : ""}${s ? VALIDITY_LABEL[s.validity] : "not valid"}`;
            return (
              <tr key={tag} className={state === "present" ? "" : "is-quiet"}>
                <th scope="row">
                  <span className="pg-diag-f-tag ast-num">{tag}</span>
                  <span className="pg-diag-f-sub">{[s?.name, note].filter(Boolean).join(" · ")}</span>
                </th>
                <td className="is-right ast-num">
                  <span className="pg-diag-val" data-tone={state === "n/a" ? undefined : limitTone(s)}>
                    {s ? (s.value !== null ? fmt(s.value) : s.display) : "—"}
                  </span>
                  {s?.value !== null && s?.unit ? <span className="pg-diag-unit"> {s.unit}</span> : null}
                </td>
                <td className="is-right ast-num pg-diag-muted">
                  {s?.model != null ? (
                    <>
                      {fmt(s.model)}
                      {s.unit ? <span className="pg-diag-unit"> {s.unit}</span> : null}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="is-right ast-num">
                  {dev ?? "—"}
                  {z && <span className="pg-diag-f-sub">{z}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Chevron() {
  return (
    <svg className="pg-diag-f-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function FindingItem({
  f,
  all,
  live,
  byTag,
  onset,
  open,
  selected,
  onToggle,
  feedback,
  onFeedback,
  onAnalysis,
  onPrognosis,
}: {
  f: Finding;
  all: Finding[];
  live: boolean;
  byTag: Map<string, DxSensor>;
  onset: string | null;
  open: boolean;
  selected: boolean;
  onToggle: () => void;
  feedback: Feedback | null;
  onFeedback: (v: Feedback) => void;
  onAnalysis: () => void;
  onPrognosis: () => void;
}) {
  const raised = f.state === "active" || f.state === "clearing" || f.state === "recorded";
  const tone: Tone = raised ? toneOf(f.severity) : "idle";
  const [ttl, ttlRange] = (f.timeToLimit ?? "").split(/\s+(?=\()/);
  const alts = open ? alternativesFor(f, all, byTag) : [];
  const detailId = `pg-diag-f-${f.key}`;
  const score = f.probability;

  return (
    <li className={`pg-diag-f-item ${open ? "is-open" : ""} ${selected ? "is-focus" : ""}`}>
      <div className="pg-diag-f-row">
        <button type="button" className="pg-diag-f-toggle" aria-expanded={open} aria-controls={detailId} onClick={onToggle}>
          <span className="pg-diag-f-what">
            <span className="pg-diag-name">
              <Chevron />
              {f.name} {f.ruleId && <span className="pg-diag-code">{f.ruleId}</span>}
            </span>
            <span className="pg-diag-f-sub">{f.where && f.where !== "DQ" ? f.where : f.tags.join(", ") || f.category}</span>
          </span>
          <span className="pg-diag-f-sev">
            <span className="pg-diag-state" data-tone={tone}>
              <span className="ast-chip-dot" aria-hidden="true" />
              {f.severity}
            </span>
            <span className="pg-diag-f-sub ast-num">{[f.priority, stateText(f)].filter(Boolean).join(" · ")}</span>
          </span>
          <span className="pg-diag-f-cell" data-label="Since">
            <span className="ast-num">{onset ?? "—"}</span>
            {f.activeFor && <span className="pg-diag-f-sub ast-num">for {f.activeFor}</span>}
          </span>
          <span className="pg-diag-f-cell" data-label="To limit">
            <span className="ast-num">{ttl || "—"}</span>
            {ttlRange && <span className="pg-diag-f-sub ast-num">{ttlRange.replace(/^\(|\)$/g, "")}</span>}
          </span>
        </button>
        <span className="pg-diag-f-fb">
          {feedback ? (
            <span className="pg-diag-f-sub">{feedback === "confirmed" ? "Confirmed by you" : "Rejected by you"}</span>
          ) : (
            <>
              <PillButton variant="secondary" className="pg-diag-sm" onClick={() => onFeedback("confirmed")} aria-label={`Confirm ${f.ruleId ?? f.name}`}>
                Confirm
              </PillButton>
              <PillButton variant="secondary" className="pg-diag-sm" onClick={() => onFeedback("rejected")} aria-label={`Reject ${f.ruleId ?? f.name}`}>
                Reject
              </PillButton>
            </>
          )}
        </span>
      </div>

      {(f.action || f.owner) && (
        <dl className="pg-diag-f-do">
          {f.action && (
            <>
              <dt>Verify</dt>
              <dd>{f.action}</dd>
            </>
          )}
          {f.owner && (
            <>
              <dt>Owner</dt>
              <dd>{f.owner}</dd>
            </>
          )}
        </dl>
      )}

      {open && (
        <div className="pg-diag-f-detail" id={detailId}>
          <InputCompare f={f} byTag={byTag} />
          <div className="pg-diag-f-side">
            <dl className="pg-diag-f-dl">
              <dt>Cause</dt>
              <dd>{f.cause ?? "—"}</dd>
              <dt>Consequence</dt>
              <dd>{f.consequence ?? "—"}</dd>
            </dl>
            <WhyDisclosure summary="Rule detail">
              <dl className="pg-diag-f-dl">
                <dt>Rule logic</dt>
                <dd>{f.logic ?? "—"}</dd>
                <dt>Distinguish</dt>
                <dd>
                  {alts.length ? (
                    <ul className="pg-diag-f-alts">
                      {alts.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  ) : (
                    "No competing candidate."
                  )}
                </dd>
                {f.unproven && (
                  <>
                    <dt>Not yet proven</dt>
                    <dd>{f.unproven}</dd>
                  </>
                )}
                {f.hold && (
                  <>
                    <dt>HOLD</dt>
                    <dd>{f.hold}</dd>
                  </>
                )}
                <dt>{live ? "Persistence score" : f.basis === "Signature match" ? "Match" : "Probability"}</dt>
                <dd>
                  <span className="ast-num">{score === null ? "—" : `${score < 10 ? score.toFixed(1) : Math.round(score)}${f.basis === "Rule engine" ? "" : " %"}`}</span>
                  {" · "}
                  {BASIS_TEXT[f.basis]}
                </dd>
              </dl>
            </WhyDisclosure>
            <p className="pg-diag-f-links">
              <button type="button" className="pg-diag-inline-link" onClick={onAnalysis}>
                Root cause
              </button>
              <button type="button" className="pg-diag-inline-link" onClick={onPrognosis}>
                Time to limit
              </button>
            </p>
          </div>
        </div>
      )}
    </li>
  );
}

/** Group order for findings that are not machine condition. */
const OTHER_ORDER = ["Data quality", "Anomaly", "Service life"];

export function FaultCandidates({
  findings,
  live,
  byTag,
  onsetOf,
  selectedRuleId,
  onSelect,
  feedback,
  onFeedback,
  onAnalysis,
  onPrognosis,
  focusRuleId = null,
}: {
  /** Rule opened from another page: its row is expanded. */
  focusRuleId?: string | null;
  findings: Finding[];
  live: boolean;
  byTag: Map<string, DxSensor>;
  onsetOf: (f: Finding) => string | null;
  selectedRuleId: string | null;
  onSelect: (ruleId: string | null) => void;
  feedback: Map<string, Feedback>;
  onFeedback: (f: Finding, v: Feedback) => void;
  onAnalysis: () => void;
  onPrognosis: () => void;
}) {
  const faults = findings.filter((f) => isConditionRule(f));
  const others = findings.filter((f) => !isConditionRule(f));
  const otherGroups = [...OTHER_ORDER, ...others.map((f) => f.category).filter((c) => !OTHER_ORDER.includes(c))]
    .filter((c, i, a) => a.indexOf(c) === i)
    .map((c) => ({ title: c, items: others.filter((f) => f.category === c) }))
    .filter((g) => g.items.length > 0);
  const groups = [{ title: "Machine faults", items: faults }, ...otherGroups];

  const focusKey = focusRuleId ? (findings.find((f) => f.ruleId === focusRuleId)?.key ?? null) : null;
  // Until the operator opens or closes a row, the lead machine fault is open; other items stay closed.
  const [picked, setExpanded] = useState<string | null | undefined>(focusKey ?? undefined);
  const expanded = picked === undefined ? (faults[0]?.key ?? null) : picked;
  const [seenFocus, setSeenFocus] = useState<string | null>(focusKey);
  if (focusKey !== seenFocus) {
    setSeenFocus(focusKey);
    if (focusKey) setExpanded(focusKey);
  }

  return (
    <div className="pg-diag-f">
      <div className="pg-diag-f-head" aria-hidden="true">
        <span>Finding</span>
        <span>Severity</span>
        <span>Since</span>
        <span>Time to limit</span>
        <span className="is-right">Feedback</span>
      </div>
      {groups.map((g) => (
        <section key={g.title} className="pg-diag-f-group" aria-label={g.title}>
          <h4 className="pg-diag-f-group-title">
            {g.title} <span className="ast-num">{g.items.length}</span>
          </h4>
          {g.items.length === 0 ? (
            <p className="pg-diag-f-none">No machine fault present.</p>
          ) : (
            <ul className="pg-diag-f-list">
              {g.items.map((f) => (
                <FindingItem
                  key={f.key}
                  f={f}
                  all={findings}
                  live={live}
                  byTag={byTag}
                  onset={onsetOf(f)}
                  open={expanded === f.key}
                  selected={!!f.ruleId && f.ruleId === selectedRuleId}
                  onToggle={() => {
                    const opening = expanded !== f.key;
                    setExpanded(opening ? f.key : null);
                    if (f.ruleId) onSelect(opening ? f.ruleId : f.ruleId === selectedRuleId ? null : selectedRuleId);
                  }}
                  feedback={feedback.get(f.key) ?? null}
                  onFeedback={(v) => onFeedback(f, v)}
                  onAnalysis={onAnalysis}
                  onPrognosis={onPrognosis}
                />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
