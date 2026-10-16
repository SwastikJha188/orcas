"use client";

import React, { useEffect, useRef } from "react";
import { PillButton, Tile, TileGrid } from "@/components/ui";
import { isConditionRule } from "@/lib/plant-defs";
import type { Tone } from "./assets-shell-ui";
import { WhyDisclosure } from "./analysis/an-ui";
import { BASIS_TEXT, HYSTERESIS_SAMPLES, VALIDITY_LABEL, alternativesFor, toneOf, type DxSensor, type Finding } from "./diagnosis-model";
import { zText } from "./diagnosis-summary";

/* ==========================================================================
   Diagnosis findings. Machine faults first, then the items that are not
   machine condition (data quality, anomaly, service life), each group a
   grid of cards. A card answers: what (rule, fault, where), how bad
   (severity), time to limit (headline), lifecycle and since when; what to
   do (verify), cause → effect; the inputs as observed vs expected with
   % deviation and σ; one "Rule detail" disclosure with logic,
   alternatives, what is not yet proven, HOLD and the score basis. Confirm /
   reject feedback is kept in this browser.
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

/** Inputs as observed vs expected, one compact line per signal: fired first, units on both, % deviation then σ. */
function InputList({ f, byTag }: { f: Finding; byTag: Map<string, DxSensor> }) {
  const { rows, present, valid } = symptomsOf(f, byTag);
  if (!rows.length) return <p className="pg-diag-f-note">{f.evidence || "No sensor inputs recorded for this pattern."}</p>;
  const sorted = [...rows].sort((a, b) => Number(b.state === "present") - Number(a.state === "present"));
  return (
    <div className="pg-diag-in">
      <span className="pg-diag-in-head">
        <span>
          {valid > 0 ? `Inputs fired ${present}/${valid}` : "Inputs"}
          {valid < rows.length ? ` · ${rows.length - valid} not valid` : ""}
        </span>
        <span aria-hidden="true">Obs.</span>
        <span aria-hidden="true">Exp.</span>
        <span aria-hidden="true">Dev.</span>
      </span>
      <ul className="pg-diag-in-list">
        {sorted.map(({ tag, s, state }) => {
          const dev = deviationText(s);
          const z = zText(s?.z ?? null);
          const note = state === "present" ? null : state === "absent" ? "not fired" : `${f.tags.includes(tag) ? "fired · " : ""}${s ? VALIDITY_LABEL[s.validity] : "not valid"}`;
          const unit = s?.unit ? ` ${s.unit}` : "";
          return (
            <li key={tag} className={state === "present" ? "" : "is-quiet"}>
              <span className="pg-diag-in-sig">
                <span className="pg-diag-in-tag ast-num">{tag}</span>
                <span className="pg-diag-in-sub">{[s?.name, note].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="pg-diag-in-num ast-num">
                <span className="pg-diag-val" data-tone={state === "n/a" ? undefined : limitTone(s)}>
                  {s ? (s.value !== null ? fmt(s.value) : s.display) : "—"}
                </span>
                {s?.value !== null && <span className="pg-diag-unit">{unit}</span>}
              </span>
              <span className="pg-diag-in-num ast-num pg-diag-muted">{s?.model != null ? fmt(s.model) : "—"}</span>
              <span className="pg-diag-in-num ast-num">
                {dev ?? "—"}
                {z && <span className="pg-diag-in-sub">{z}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Stops clicks / keys inside a card body from selecting the card. */
const keepInside = {
  onClick: (e: React.SyntheticEvent) => e.stopPropagation(),
  onKeyDown: (e: React.SyntheticEvent) => e.stopPropagation(),
};

function FindingCard({
  f,
  all,
  live,
  byTag,
  onset,
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
  const numericTtl = /\d/.test(ttl ?? "");
  const alts = alternativesFor(f, all, byTag);
  const score = f.probability;
  const where = f.where && f.where !== "DQ" ? f.where : f.tags.join(", ") || f.category;

  return (
    <Tile
      className="pg-diag-tile pg-diag-ftile"
      title={f.ruleId ?? f.category}
      sub={
        <>
          <span className="pg-diag-tile-name">{f.name}</span>
          {where ? ` · ${where}` : ""}
        </>
      }
      status={{ label: f.severity, tone }}
      tone={raised ? tone : undefined}
      value={ttl ? (numericTtl ? ttl : ttl.charAt(0).toUpperCase() + ttl.slice(1)) : undefined}
      unit={!ttl ? undefined : !numericTtl ? (ttl === "stable" ? "trend" : undefined) : ttlRange ? `to limit · ${ttlRange.replace(/^\(|\)$/g, "")}` : "to limit"}
      selected={selected}
      onSelect={f.ruleId ? onToggle : undefined}
      attrs={f.ruleId ? { "data-rule": f.ruleId } : undefined}
      facts={[
        { label: "State", value: [f.priority, stateText(f)].filter(Boolean).join(" · ") },
        { label: "Since", value: onset ?? "—" },
        { label: "For", value: f.activeFor ?? "—" },
      ]}
      foot={
        <span className="pg-diag-f-links">
          <button type="button" className="pg-diag-inline-link" onClick={(e) => {
              e.stopPropagation();
              onAnalysis();
            }}>
            Root cause
          </button>
          <button type="button" className="pg-diag-inline-link" onClick={(e) => {
              e.stopPropagation();
              onPrognosis();
            }}>
            Prognosis
          </button>
        </span>
      }
      actions={
        feedback ? (
          <span className="pg-diag-tile-meta">{feedback === "confirmed" ? "Confirmed by you" : "Rejected by you"}</span>
        ) : (
          <>
            <PillButton variant="secondary" className="pg-diag-sm" onClick={() => onFeedback("confirmed")} aria-label={`Confirm ${f.ruleId ?? f.name}`}>
              Confirm
            </PillButton>
            <PillButton variant="secondary" className="pg-diag-sm" onClick={() => onFeedback("rejected")} aria-label={`Reject ${f.ruleId ?? f.name}`}>
              Reject
            </PillButton>
          </>
        )
      }
    >
      {(f.action || f.owner || f.cause || f.consequence) && (
        <dl className="pg-diag-f-do">
          {f.action && (
            <>
              <dt>Verify</dt>
              <dd>{f.action}</dd>
            </>
          )}
          {f.cause && (
            <>
              <dt>Cause</dt>
              <dd>{f.cause}</dd>
            </>
          )}
          {f.consequence && (
            <>
              <dt>Effect</dt>
              <dd>{f.consequence}</dd>
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
      <InputList f={f} byTag={byTag} />
      <div className="pg-diag-f-rule" {...keepInside}>
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
      </div>
    </Tile>
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
  /** Rule opened from another page: its card is selected and scrolled into view. */
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

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusRuleId) return;
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-rule="${CSS.escape(focusRuleId)}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  }, [focusRuleId]);

  return (
    <div className="pg-diag-fgroups" ref={rootRef}>
      {groups.map((g) => (
        <section key={g.title} className="pg-diag-fgroup" aria-label={g.title}>
          <h4 className="ui-tiles-head">
            <span>
              <b>{g.title}</b> <span className="ast-num">{g.items.length}</span>
            </span>
          </h4>
          {g.items.length === 0 ? (
            <p className="pg-diag-missing">No machine fault present.</p>
          ) : (
            <TileGrid label={g.title} min={340} className="pg-diag-tiles">
              {g.items.map((f) => (
                <FindingCard
                  key={f.key}
                  f={f}
                  all={findings}
                  live={live}
                  byTag={byTag}
                  onset={onsetOf(f)}
                  selected={!!f.ruleId && f.ruleId === selectedRuleId}
                  onToggle={() => {
                    if (f.ruleId) onSelect(f.ruleId === selectedRuleId ? null : f.ruleId);
                  }}
                  feedback={feedback.get(f.key) ?? null}
                  onFeedback={(v) => onFeedback(f, v)}
                  onAnalysis={onAnalysis}
                  onPrognosis={onPrognosis}
                />
              ))}
            </TileGrid>
          )}
        </section>
      ))}
    </div>
  );
}
