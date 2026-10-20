"use client";

import React from "react";
import { PillButton, StatusTag, Table, type Column } from "@/components/ui";
import { validityTone, VALIDITY_WORDS } from "@/components/ui/status";
import { formatDuration, type SimFrame } from "@/lib/kiln-sim/engine";
import { isConditionRule } from "@/lib/plant-defs";
import { FAILURE_CHANCE_HEADER, FailureChance } from "../prognosis/prog-chance";
import { rangeText, roundHours, type PrognosisData } from "../prognosis/prognosis-derive";
import { SignalForecastTable, type SignalForecastRow } from "../prognosis/prog-signals";
import { FEEDBACK, type FeedbackStore } from "./an-actions";
import { displayName } from "@/lib/display-name";
import { episodes, fmt, offText, sigma, type DetectionRow } from "./an-derive";
import { alternatives, couplingShifts, deviationOrder, evidenceFor, trendingSignals, type EvidenceRow, type ImpactRow, type Issue } from "./an-issues";
import { StartCaseButton } from "@/components/problems/start-case-button";
import { StartChart } from "./an-start-chart";
import { WhyDisclosure } from "./an-ui";
import { distinctTexts, faultsForRule, type FaultEntry, type FaultLibrary } from "../fault-library";

/* ==========================================================================
   Analysis · per-issue sections: why it is happening (fault), why it will
   happen (prediction), what it affects, past episodes. Plain facts from the
   rule library and the live frame; no generated prose.
   ========================================================================== */

const unitOf = (u: string) => (u && u !== "state" ? u : "");

const VALIDITY_WORD: Record<EvidenceRow["validity"], string> = { Valid: VALIDITY_WORDS.Valid, Suspect: VALIDITY_WORDS.Suspect, Invalid: VALIDITY_WORDS.Invalid, "No data": VALIDITY_WORDS["No data"] };

const COUPLING_TIP = "How closely the two readings rise and fall together: 1 = always together, 0 = unrelated, −1 = always opposite (correlation).";

/** How far a reading is from expected, in plain words; the σ figure stays in the tooltip. */
function Off({ z }: { z: number | null }) {
  if (z === null) return <span className="ast-num">—</span>;
  return (
    <span className="ast-num" title={`${sigma(z)}: standard deviations from the expected value`}>
      {offText(z)}
    </span>
  );
}

export function issueState(issue: Issue, frame: SimFrame | null): string {
  const r = issue.rule;
  if (!r) {
    const life = issue.life[0];
    return life?.band ? `May fail: likely ${rangeText(life.band.lo, life.band.hi)} left before repair` : "May fail";
  }
  if (r.status === "PENDING") return `Not yet confirmed (${Math.min(r.persistence, r.threshold)} of ${r.threshold} checks)`;
  const dur = r.since !== null && frame ? formatDuration(frame.t - r.since) : null;
  if (r.clean > 0) return dur ? `Going away after ${dur}` : "Going away";
  return dur ? `Ongoing for ${dur}` : "Ongoing";
}

/** Selected issue: name, where, state, and the operator's verification label. */
export function IssueHead({ issue, frame, feedback, machineId }: { issue: Issue; frame: SimFrame | null; feedback: FeedbackStore; machineId?: string }) {
  const id = issue.rule?.id ?? null;
  const cur = id ? (feedback.labels[id]?.label ?? null) : null;
  // Engineering name and rule code stay reachable as the tooltip.
  const tip = issue.rule ? [issue.rule.name !== issue.title ? issue.rule.name : null, issue.rule.id].filter(Boolean).join(" · ") : undefined;
  return (
    <div className="pg-an-issue-head">
      <span className="ast-cell-stack">
        <span className="pg-an-issue-title" title={tip}>
          {issue.title}
        </span>
        <span className="ast-cell-sub">{[issue.where !== issue.title ? issue.where : null, issueState(issue, frame)].filter(Boolean).join(" · ")}</span>
      </span>
      {machineId && issue.rule && (
        <StartCaseButton
          machineId={machineId}
          partId={issue.subIds[0] ?? null}
          ruleCode={issue.rule.id}
          title={issue.title}
          observation={[issue.rule.plainWhat, issue.rule.evidence ? `What the sensors showed: ${issue.rule.evidence}` : null].filter(Boolean).join("\n")}
        />
      )}
      {id && (
        <span className="pg-an-verify" role="group" aria-label="Is this a real problem?">
          {FEEDBACK.map((b) => (
            <PillButton key={b.id} variant="secondary" className="pg-diag-sm" pressed={cur === b.id} onClick={() => feedback.set(id, cur === b.id ? null : b.id)}>
              {b.label}
            </PillButton>
          ))}
        </span>
      )}
    </div>
  );
}

function Facts({ items }: { items: { label: string; value: React.ReactNode; title?: string }[] }) {
  const shown = items.filter((i) => i.value !== null && i.value !== undefined && i.value !== "");
  if (!shown.length) return null;
  return (
    <dl className="pg-an-facts">
      {shown.map((i) => (
        <React.Fragment key={i.label}>
          <dt>{i.label}</dt>
          <dd title={i.title || undefined}>{i.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

/** Sensor name that opens the sensor in Trends; the tag is in the tooltip. */
function TagButton({ tag, name, onOpenTrend }: { tag: string; name: string; onOpenTrend: (tag: string) => void }) {
  return (
    <button type="button" className="ast-cell-title pg-dx-tag" onClick={() => onOpenTrend(tag)} title={`Open the trend chart for this sensor (${tag})`}>
      {name} ↗
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Why it is happening (fault)                                         */
/* ------------------------------------------------------------------ */

/** List of plain texts, or null when there are none (Facts hides empty rows). */
function TextList({ items }: { items: string[] }) {
  if (!items.length) return null;
  if (items.length === 1) return <>{items[0]}</>;
  return (
    <ul className="pg-an-list">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

/** The fault-library sheets behind a rule, as the engineering record (one "Method" disclosure per section). */
function LibraryMethod({ sheets, document }: { sheets: FaultEntry[]; document: string }) {
  if (!sheets.length) return null;
  return (
    <WhyDisclosure summary="Method">
      <p className="ast-caption">From the fault library {document}. Set-points are the sensor-list proposals, not yet approved by the plant.</p>
      <dl className="pg-an-facts">
        {sheets.map((s) => (
          <React.Fragment key={s.id}>
            <dt title={`${s.origin} · ${s.revStatus}`}>
              {s.id} · {s.title}
            </dt>
            <dd>
              {[s.detection, s.alert && `Alert: ${s.alert}`, s.danger && `Critical: ${s.danger}`, s.prognosis && `Prognosis: ${s.prognosis}`].filter(Boolean).join(" ")}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </WhyDisclosure>
  );
}

export function WhyHappening({ issue, frame, library = null, onOpenTrend }: { issue: Issue; frame: SimFrame; library?: FaultLibrary | null; onOpenTrend: (tag: string) => void }) {
  const r = issue.rule;
  if (!r) return null;
  const rows = evidenceFor(r, frame);
  const chain = deviationOrder(frame).sort((a, b) => b.minutesAgo - a.minutesAgo);
  const alts = alternatives(r, frame);
  const sheets = faultsForRule(library, r.id);
  const ruleOut = distinctTexts(sheets.map((s) => s.alternatives));
  // With a plain description shown, the engineering text stays reachable as its tooltip.
  const engineering = [
    `Alert condition: ${r.logic}`,
    r.evidence && `What the sensors show: ${r.evidence}`,
    r.cause && `Likely cause: ${r.cause}`,
    r.unproven && `Not yet proven: ${r.unproven}`,
    `Code: ${r.id}`,
  ]
    .filter(Boolean)
    .join("\n");
  const cols: Column<EvidenceRow>[] = [
    {
      key: "sensor",
      header: "Sensor",
      width: "240px",
      render: (e) => (
        <span className="ast-cell-stack pg-an-ev" data-fired={e.fired || undefined}>
          <TagButton tag={e.tag} name={e.name} onOpenTrend={onOpenTrend} />
        </span>
      ),
    },
    {
      key: "reading",
      header: "Reading",
      width: "130px",
      render: (e) => (
        <span className="ast-num pg-an-strong">
          {e.value !== null ? fmt(e.value) : e.display}
          {e.value !== null && unitOf(e.unit) && <span className="ast-unit"> {unitOf(e.unit)}</span>}
        </span>
      ),
    },
    { key: "expected", header: "Expected", width: "140px", render: (e) => <span className="ast-num ast-muted">{e.expected !== null ? fmt(e.expected) : "—"}</span> },
    { key: "dev", header: "How far off expected", width: "110px", render: (e) => <Off z={e.z} /> },
    { key: "fired", header: "Triggered this alert", width: "130px", render: (e) => (e.fired ? <span className="pg-an-strong">Yes</span> : <span className="ast-muted">No</span>) },
    {
      key: "validity",
      header: "Reading quality",
      render: (e) => (e.validity === "Valid" ? <span className="ast-muted">{VALIDITY_WORDS.Valid}</span> : <StatusTag tone={validityTone(e.validity)} label={VALIDITY_WORD[e.validity]} />),
    },
  ];
  return (
    <>
      <Facts
        items={[
          ...(r.plainWhat
            ? [{ label: "What is happening", value: r.plainWhat, title: engineering }]
            : [
                { label: "Alert condition", value: r.logic },
                { label: "What the sensors show", value: r.evidence },
                { label: "Likely cause", value: r.cause },
                { label: "Not yet proven", value: r.unproven ?? null },
              ]),
          {
            label: "Could also be",
            value: alts.length ? (
              <ul className="pg-an-list">
                {alts.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : (
              "Nothing else: no other problem uses these sensors, and all of them are working"
            ),
          },
          // Fault library field 06 "why / alternatives": what to rule out before acting on the finding.
          { label: "Rule out first", value: ruleOut.length ? <TextList items={ruleOut} /> : null },
          {
            label: "Where it started",
            value: chain.length ? (
              <ol className="pg-an-chain">
                {chain.map((n) => (
                  <li key={n.id}>
                    <span>{n.name}</span> <span className="ast-num ast-muted">{n.minutesAgo > 0 ? `${formatDuration(n.minutesAgo)} ago` : "now"}</span>
                  </li>
                ))}
              </ol>
            ) : (
              "Every part is reading as expected"
            ),
          },
        ]}
      />
      <StartChart frame={frame} chain={chain} />
      <Table className="pg-an-table" columns={cols} data={rows} keyExtractor={(e) => e.tag} />
      {library && <LibraryMethod sheets={sheets} document={library.document} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Why it will happen (prediction)                                     */
/* ------------------------------------------------------------------ */

export function WhyWillHappen({
  issue,
  data,
  forecastRows,
  onOpenTrend,
}: {
  issue: Issue;
  data: PrognosisData;
  forecastRows: SignalForecastRow[];
  onOpenTrend: (tag: string) => void;
}) {
  const life = issue.life[0] ?? null;
  const trending = trendingSignals(issue, forecastRows, data);
  const shifts = couplingShifts(issue, data);
  const nameOf = (tag: string) => displayName(Object.values(data.forecasts[tag] ?? {})[0]?.name ?? tag);
  const basis = life
    ? life.basis === "finding" && life.driver
      ? `How fast the ${life.name} readings are moving toward their alarm limit`
      : `How the health score of ${life.name} is changing (${life.health === null ? "not yet scored" : `now ${Math.round(life.health)} of 100`})`
    : null;
  const shiftCols: Column<(typeof shifts)[number]>[] = [
    {
      key: "pair",
      header: "Sensor pair",
      render: (p) => (
        <span title={`${p.a} ↔ ${p.b}`}>
          {nameOf(p.a)} ↔ {nameOf(p.b)}
        </span>
      ),
    },
    { key: "base", header: "Moved together before", width: "170px", render: (p) => <span className="ast-num" title={COUPLING_TIP}>{p.baseline.toFixed(2)}</span> },
    { key: "recent", header: "Move together now", width: "170px", render: (p) => <span className="ast-num" title={COUPLING_TIP}>{p.recent.toFixed(2)}</span> },
    { key: "delta", header: "Change", width: "120px", render: (p) => <span className="ast-num pg-an-strong" title={COUPLING_TIP}>{`${p.delta >= 0 ? "+" : "−"}${Math.abs(p.delta).toFixed(2)}`}</span> },
  ];
  return (
    <>
      <Facts
        items={[
          { label: "Based on", value: basis },
          { label: "Time until it reaches its limit", value: issue.rule && issue.rule.timeToLimit !== "—" ? <span className="ast-num">{issue.rule.timeToLimit}</span> : null },
          {
            label: "Readings heading for alarm",
            value: trending.length ? `${trending.length} sensor${trending.length === 1 ? "" : "s"} may reach the alarm limit in the next 30 days` : "No sensor here is expected to reach its alarm limit in the next 30 days",
          },
          {
            label: "Sensors out of step",
            value: shifts.length ? `${shifts.length} pair${shifts.length === 1 ? "" : "s"} of sensors no longer rise and fall together as they used to` : "Every pair of sensors here still rises and falls together as before",
          },
        ]}
      />
      {trending.length > 0 && <SignalForecastTable rows={trending} onOpenTrend={onOpenTrend} />}
      {shifts.length > 0 && <Table className="pg-an-table" columns={shiftCols} data={shifts} keyExtractor={(p) => `${p.a}|${p.b}`} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* What it affects                                                     */
/* ------------------------------------------------------------------ */

export function WhatItAffects({ issue, frame, impact, library = null }: { issue: Issue; frame: SimFrame | null; impact: ImpactRow[]; library?: FaultLibrary | null }) {
  const r = issue.rule;
  // Fault library fields 06 "impact" and 10 "check" of the sheets this rule implements.
  const sheets = r ? faultsForRule(library, r.id) : [];
  const leadsTo = distinctTexts(sheets.map((s) => s.impact));
  const checks = distinctTexts(sheets.map((s) => s.check));
  // A predicted wear-out has no rule of its own: what can fail there is the rule library's failure modes for that sub-assembly.
  const modes =
    !r && frame
      ? frame.defs.rules.filter((d) => isConditionRule(d) && d.subs.some((s) => issue.subIds.includes(s)))
      : [];
  const cols: Column<ImpactRow>[] = [
    { key: "sub", header: "Part", render: (x) => <span className="ast-cell-title">{x.name}</span> },
    { key: "health", header: "Health now", width: "120px", render: (x) => <span className="ast-num">{x.health !== null ? `${x.health} of 100` : "—"}</span> },
    ...(r
      ? [{ key: "points", header: "Health lost to this", width: "160px", render: (x: ImpactRow) => <span className="ast-num pg-an-strong">{x.points !== null ? `${x.points} points` : "—"}</span> }]
      : []),
    {
      key: "life",
      header: "Time left",
      width: "150px",
      render: (x) =>
        x.life ? (
          <span className="ast-cell-stack ast-num">
            <span className="pg-an-strong">{roundHours(x.life.hours)}</span>
            <span className="ast-cell-sub">{x.life.band ? `likely ${rangeText(x.life.band.lo, x.life.band.hi)}` : x.life.dueLabel}</span>
          </span>
        ) : (
          <span className="ast-muted">—</span>
        ),
    },
    {
      key: "chance",
      header: FAILURE_CHANCE_HEADER,
      width: "190px",
      render: (x) => <FailureChance band={x.life?.band ?? null} name={x.name} />,
    },
  ];
  return (
    <>
      <Facts
        items={[
          ...(r?.plainTodo
            ? [{ label: "What to do", value: r.plainTodo, title: `Action: ${r.action}\nIf nobody acts: ${r.consequence}` }]
            : [
                { label: "If nobody acts", value: r?.consequence ?? null },
                { label: "What to do", value: r?.action ?? null },
              ]),
          { label: "Checks on site", value: checks.length ? <TextList items={checks} /> : null },
          { label: "What it can lead to", value: leadsTo.length ? <TextList items={leadsTo} /> : null },
          {
            label: "What could go wrong there",
            value: modes.length ? (
              <ul className="pg-an-list">
                {modes.map((m) =>
                  m.plainTitle ? (
                    <li key={m.id}>
                      <span className="pg-an-strong" title={`${m.name} (${m.id}): ${m.consequence}`}>
                        {m.plainTitle}
                      </span>
                    </li>
                  ) : (
                    <li key={m.id}>
                      <span className="pg-an-strong" title={m.id}>
                        {m.name}
                      </span>
                      : {m.consequence}
                    </li>
                  ),
                )}
              </ul>
            ) : null,
          },
        ]}
      />
      <Table className="pg-an-table" columns={cols} data={impact} keyExtractor={(x) => x.subId} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Past episodes                                                       */
/* ------------------------------------------------------------------ */

export function pastEpisodes(issue: Issue, frame: SimFrame | null) {
  return frame && issue.rule ? episodes(frame).filter((e) => e.ruleId === issue.rule?.id) : [];
}

export function PastEpisodes({ rows }: { rows: ReturnType<typeof pastEpisodes> }) {
  return (
    <Table
      className="pg-an-table"
      columns={[
        { key: "c", header: "Started", width: "180px", render: (e) => <span className="ast-num">{e.confirmedClock}</span> },
        { key: "x", header: "Ended", width: "180px", render: (e) => <span className="ast-num">{e.clearedClock ?? "Still going"}</span> },
        { key: "d", header: "Lasted", width: "140px", render: (e) => <span className="ast-num">{formatDuration(e.minutes)}</span> },
        { key: "a", header: "Actions taken", render: (e) => <span className="ast-cell-text">{e.actions.join(", ") || "—"}</span> },
      ]}
      data={rows}
      keyExtractor={(e) => `${e.ruleId}-${e.confirmedT}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Unexplained deviations                                              */
/* ------------------------------------------------------------------ */

export function UnexplainedTable({ rows, onOpenTrend }: { rows: DetectionRow[]; onOpenTrend: (tag: string) => void }) {
  return (
    <Table
      className="pg-an-table"
      columns={[
        {
          key: "sensor",
          header: "Sensor",
          width: "240px",
          render: (x) => (
            <span className="ast-cell-stack">
              <TagButton tag={x.tag} name={displayName(x.name)} onOpenTrend={onOpenTrend} />
            </span>
          ),
        },
        { key: "where", header: "Where", width: "180px", render: (x) => <span className="ast-cell-text">{x.sub}</span> },
        {
          key: "reading",
          header: "Reading",
          width: "130px",
          render: (x) => (
            <span className="ast-num pg-an-strong">
              {fmt(x.actual)}
              {unitOf(x.unit) && <span className="ast-unit"> {unitOf(x.unit)}</span>}
            </span>
          ),
        },
        { key: "expected", header: "Expected", width: "140px", render: (x) => <span className="ast-num ast-muted">{fmt(x.expected)}</span> },
        { key: "dev", header: "How far off expected", width: "110px", render: (x) => <Off z={x.z} /> },
        { key: "since", header: "Off expected for", render: (x) => <span className="ast-num">{formatDuration(x.persistence)}</span> },
      ]}
      data={rows}
      keyExtractor={(x) => x.tag}
    />
  );
}
