"use client";

/* ==========================================================================
   Analysis · Diagnosis window — investigates one problem the engine is
   matching now, in the eight investigation steps: what changed, the
   evidence, why it may be happening, likely causes (ranked), what it
   affects (part → machine → plant), how it is developing, what to do and
   how to confirm it. Plain facts from the live frame, the rule library,
   the fault library and the problem's case; nothing generated.
   ========================================================================== */

import React, { useMemo } from "react";
import { PillButton, StatusTag, Table, type Column } from "@/components/ui";
import { validityTone, VALIDITY_WORDS } from "@/components/ui/status";
import { useApi } from "@/lib/api-cache";
import { formatLocalTime } from "@/lib/time";
import { displayName } from "@/lib/display-name";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatDuration, type SimFrame } from "@shared/lib/kiln-sim/engine";
import { caseUrl, casesUrl, type CaseDetail, type CaseList } from "@/components/problems/cases-api";
import { FAILURE_CHANCE_HEADER, FailureChance } from "../prognosis/prog-chance";
import { rangeText, roundHours } from "../prognosis/prognosis-derive";
import { distinctTexts, faultsForRule, type FaultLibrary } from "../fault-library";
import type { FeedbackStore } from "./an-actions";
import { deviationOrder, evidenceFor, type EvidenceRow, type ImpactRow, type Issue } from "./an-issues";
import { issueState } from "./an-issue-view";
import { StartChart } from "./an-start-chart";
import { WhyDisclosure } from "./an-ui";
import { fmt, offText, sigma } from "./an-derive";
import {
  changingTogether,
  diagnosisCauses,
  episodesOf,
  operatingContext,
  plantProblems,
  ruleTags,
  signalChange,
  sortCauses,
  worstProgress,
  RATE_WINDOW,
  type ContextRow,
  type Hypothesis,
  type SignalChange,
} from "./an-intel";
import { Block, CauseTable, Facts, Num, Step, TagButton, Texts } from "./an-intel-ui";

const pctText = (p: number | null) => (p === null ? null : `${p >= 0 ? "+" : "−"}${Math.abs(p) >= 100 ? Math.round(Math.abs(p)) : Math.abs(p).toFixed(1)} %`);

/** Reading changes of a problem: its sensors, those off expected (beyond 2σ) first, else all of them. */
export function issueChanges(issue: Issue, frame: SimFrame): SignalChange[] {
  if (!issue.rule) return [];
  const all = ruleTags(issue.rule, frame)
    .map((t) => signalChange(frame, t))
    .filter((c): c is SignalChange => c !== null);
  const off = all.filter((c) => c.z !== null && Math.abs(c.z) > 2);
  return off.length ? off : all;
}

/** When the problem's readings first left their band (the earliest of them), and how. */
export function issueOnset(changes: SignalChange[]): { ago: number | null; how: string | null } {
  const began = changes.filter((c) => c.beganAgo !== null).sort((a, b) => (b.beganAgo ?? 0) - (a.beganAgo ?? 0))[0];
  return began ? { ago: began.beganAgo, how: began.pattern } : { ago: null, how: null };
}

export function DiagnosisInvestigation({
  issue,
  frame,
  library,
  feedback,
  machineId,
  impact,
  fleet,
  machineName,
  onOpenTrend,
  onInvestigateSensor,
  onSeeSensors,
  onSeeTimeLeft,
}: {
  issue: Issue;
  frame: SimFrame;
  library: FaultLibrary | null;
  feedback: FeedbackStore;
  machineId: string;
  impact: ImpactRow[];
  /** Live frames of the plant's machines (this one included). */
  fleet: Record<string, SimFrame | null>;
  machineName: (id: string) => string;
  onOpenTrend: (tag: string) => void;
  onInvestigateSensor: (tag: string) => void;
  onSeeSensors: () => void;
  onSeeTimeLeft: (() => void) | null;
}) {
  const r = issue.rule!;
  const { timeZone } = useSiteTimeZone({ machineId });
  const sheets = useMemo(() => faultsForRule(library, r.id), [library, r.id]);
  const changes = useMemo(() => issueChanges(issue, frame), [issue, frame]);
  const onset = issueOnset(changes);
  const ctx = useMemo(() => operatingContext(frame, onset.ago), [frame, onset.ago]);
  const evidence = useMemo(() => evidenceFor(r, frame), [r, frame]);
  const chain = useMemo(() => deviationOrder(frame).sort((a, b) => b.minutesAgo - a.minutesAgo), [frame]);
  const together = useMemo(() => changingTogether(frame, changes.map((c) => c.tag)), [frame, changes]);
  // Earlier episodes only: the one going on now is this investigation.
  const past = useMemo(() => episodesOf(r, frame).filter((e) => e.clearedClock !== null), [r, frame]);
  const others = useMemo(() => plantProblems(fleet, machineId), [fleet, machineId]);

  // The problem's case: operator causes and the checks done on site.
  const { data: caseList } = useApi<CaseList>(casesUrl({ machineId, ruleCode: r.id }));
  const openCase = caseList?.cases.find((c) => c.stage !== "closed") ?? null;
  const { data: caseDetail } = useApi<CaseDetail>(openCase ? caseUrl(openCase.id) : null);

  const causes = useMemo(() => {
    const list = diagnosisCauses(r, frame, sheets, onset.ago, ctx);
    for (const c of caseDetail?.causes ?? []) {
      list.push({
        key: `case-${c.id}`,
        cause: c.text,
        kind: `On case ${caseDetail!.id}`,
        support: c.status === "supported" ? ["A check on site supports it"] : [],
        against: c.status === "ruled_out" ? ["A check on site ruled it out"] : [],
        status: c.status === "ruled_out" ? "Ruled out" : c.status === "supported" ? "Possible" : "To check",
        confidence: null,
        basis: c.status === "supported" || c.status === "ruled_out" ? "measured" : "verify",
      } satisfies Hypothesis);
    }
    return sortCauses(list);
  }, [r, frame, sheets, onset.ago, ctx, caseDetail]);

  const nameOf = (tag: string) => displayName(frame.defs.signalByTag[tag]?.name ?? tag);
  const progress = worstProgress(changes.map((c) => c.progress));
  const moves = ctx.filter((c) => c.changed);
  const leadsTo = distinctTexts(sheets.map((s) => s.impact));
  const checks = distinctTexts(sheets.map((s) => s.check));
  const discriminate = distinctTexts(sheets.map((s) => s.discriminate));
  const developing = distinctTexts(sheets.map((s) => s.developing));
  const danger = distinctTexts(sheets.map((s) => s.danger));
  const where = distinctTexts(sheets.map((s) => s.where));
  const origin = chain[0] ?? null;
  const machineHealth = Number.isFinite(frame.overall) ? Math.round(frame.overall) : null;
  const lost = impact.reduce((a, x) => a + (x.points ?? 0), 0);
  const win = formatDuration(RATE_WINDOW);

  /* ------------------------------ tables ------------------------------ */
  const changeCols: Column<SignalChange>[] = [
    {
      key: "sensor",
      header: "Sensor",
      render: (c) => (
        <span className="ast-cell-stack">
          <TagButton tag={c.tag} name={c.name} onOpenTrend={onOpenTrend} />
          <span className="ast-cell-sub">{c.sub}</span>
        </span>
      ),
    },
    { key: "exp", header: "Expected", width: "120px", render: (c) => <Num v={c.expected} unit={c.unit} muted /> },
    { key: "now", header: "Now", width: "120px", render: (c) => <Num v={c.value} unit={c.unit} strong /> },
    {
      key: "change",
      header: "Change",
      width: "150px",
      render: (c) => (
        <span className="ast-cell-stack">
          <Num v={c.change} unit={c.unit} signed />
          {c.changePct !== null && <span className="ast-cell-sub ast-num">{pctText(c.changePct)}</span>}
        </span>
      ),
    },
    {
      key: "off",
      header: "How far off",
      width: "130px",
      render: (c) =>
        c.z === null ? (
          <span className="ast-num ast-muted">—</span>
        ) : (
          <span className="ast-num" title={`${sigma(c.z)}: standard deviations from the expected value`}>
            {offText(c.z)}
          </span>
        ),
    },
    { key: "began", header: "Began", width: "120px", render: (c) => <span className="ast-num">{c.beganAgo !== null ? `${formatDuration(c.beganAgo)} ago` : "—"}</span> },
    { key: "how", header: "How", width: "110px", render: (c) => <span className="ast-cell-text">{c.pattern}</span> },
  ];

  const evidenceCols: Column<EvidenceRow>[] = [
    {
      key: "sensor",
      header: "Sensor",
      render: (e) => (
        <span className="ast-cell-stack pg-an-ev" data-fired={e.fired || undefined}>
          <TagButton tag={e.tag} name={e.name} onOpenTrend={onOpenTrend} />
        </span>
      ),
    },
    { key: "reading", header: "Reading", width: "130px", render: (e) => <Num v={e.value} unit={e.unit && e.unit !== "state" ? e.unit : undefined} strong /> },
    { key: "expected", header: "Expected", width: "120px", render: (e) => <Num v={e.expected} muted /> },
    { key: "fired", header: "Triggered it", width: "110px", render: (e) => (e.fired ? <span className="pg-an-strong">Yes</span> : <span className="ast-muted">No</span>) },
    {
      key: "validity",
      header: "Reading quality",
      width: "170px",
      render: (e) =>
        e.validity === "Valid" ? (
          <span className="ast-muted">{VALIDITY_WORDS.Valid}</span>
        ) : (
          <button type="button" className="pg-diag-inline-link" onClick={() => onInvestigateSensor(e.tag)} title="Investigate this sensor">
            <StatusTag tone={validityTone(e.validity)} label={VALIDITY_WORDS[e.validity]} /> <span aria-hidden="true">→</span>
          </button>
        ),
    },
  ];

  const ctxCols: Column<ContextRow>[] = [
    { key: "name", header: "Operating driver", render: (c) => <TagButton tag={c.tag} name={c.name} onOpenTrend={onOpenTrend} /> },
    { key: "then", header: "Before it began", width: "150px", render: (c) => <Num v={c.then} unit={c.unit} muted /> },
    { key: "now", header: "Now", width: "150px", render: (c) => <Num v={c.now} unit={c.unit} strong /> },
    { key: "changed", header: "Same conditions?", width: "150px", render: (c) => (c.changed ? <span className="pg-an-strong">No, it moved</span> : <span className="ast-muted">Yes</span>) },
  ];

  const progressCols: Column<SignalChange>[] = [
    { key: "sensor", header: "Sensor", render: (c) => <TagButton tag={c.tag} name={c.name} onOpenTrend={onOpenTrend} /> },
    { key: "now", header: `Gap moved, last ${win}`, width: "190px", render: (c) => <Num v={c.moveNow} unit={c.unit} signed /> },
    { key: "before", header: `The ${win} before`, width: "190px", render: (c) => <Num v={c.moveBefore} unit={c.unit} signed muted /> },
    { key: "trend", header: "Trend", width: "150px", render: (c) => <span className={c.progress?.startsWith("Worsening") ? "pg-an-strong" : "ast-cell-text"}>{c.progress ?? "—"}</span> },
  ];

  const impactCols: Column<ImpactRow>[] = [
    { key: "sub", header: "Part", render: (x) => <span className="ast-cell-title">{x.name}</span> },
    { key: "health", header: "Health now", width: "120px", render: (x) => <span className="ast-num">{x.health !== null ? `${x.health} of 100` : "—"}</span> },
    { key: "points", header: "Lost to this", width: "130px", render: (x) => <span className="ast-num pg-an-strong">{x.points !== null ? `${x.points} points` : "—"}</span> },
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
    { key: "chance", header: FAILURE_CHANCE_HEADER, width: "190px", render: (x) => <FailureChance band={x.life?.band ?? null} name={x.name} /> },
  ];

  /* ------------------------------ verdict ------------------------------ */
  const answer = feedback.labels[r.id] ?? null;
  const cur = answer?.label ?? null;
  const verdict = (
    <span className="pg-an-verify" role="group" aria-label="Is this a real problem?">
      {feedback.kinds.map((b) => (
        <PillButton key={b.id} variant="secondary" className="pg-diag-sm" pressed={cur === b.id} loading={feedback.busy === r.id && cur === b.id} onClick={() => feedback.set(r.id, cur === b.id ? null : b.id)}>
          {b.name}
        </PillButton>
      ))}
      {answer && feedback.busy !== r.id && (
        <span className="ast-caption pg-an-verify-by">
          {answer.by ? `${answer.by} · ` : ""}
          {formatLocalTime(answer.at, { timeZone })}
        </span>
      )}
      {feedback.error && feedback.busy === null && (
        <span className="ast-caption" role="alert" data-tone="bad">
          {feedback.error}
        </span>
      )}
    </span>
  );

  const caseChecks = caseDetail?.checks ?? [];

  return (
    <>
      <Step n={1} title="What changed">
        <Facts
          rows={[
            {
              label: "Began",
              value: onset.ago !== null ? `${formatDuration(onset.ago)} ago, ${onset.how?.toLowerCase()}` : "Its readings are inside their normal range right now",
              basis: "measured",
            },
            {
              label: "Under the same conditions?",
              value: ctx.length ? (moves.length ? `No: ${moves.map((c) => c.name).join(", ")} moved as well` : `Yes: ${ctx.map((c) => c.name).join(", ")} steady`) : null,
              basis: "measured",
            },
            {
              label: "Happened before",
              value: past.length ? `${past.length} time${past.length === 1 ? "" : "s"} in the last ${formatDuration(frame.t - (frame.times[0] ?? frame.t))}` : `Not in the last ${formatDuration(frame.t - (frame.times[0] ?? frame.t))}`,
              basis: "measured",
            },
          ]}
        />
        <Table className="pg-an-table" columns={changeCols} data={changes} keyExtractor={(c) => c.tag} />
      </Step>

      <Step
        n={2}
        title="Evidence"
        right={
          <button type="button" className="pg-diag-inline-link" onClick={onSeeSensors}>
            See its sensors <span aria-hidden="true">→</span>
          </button>
        }
      >
        {chain.length > 0 && (
          <Block title="When each part left what is expected" basis="measured">
            <StartChart frame={frame} chain={chain} />
          </Block>
        )}
        <Block title="Every sensor this check reads" basis="measured">
          <Table className="pg-an-table" columns={evidenceCols} data={evidence} keyExtractor={(e) => e.tag} />
        </Block>
        {ctx.length > 0 && (
          <Block title="Operating conditions" basis="measured">
            <Table className="pg-an-table" columns={ctxCols} data={ctx} keyExtractor={(c) => c.tag} />
          </Block>
        )}
      </Step>

      <Step n={3} title="Why it may be happening">
        <Facts
          rows={[
            {
              label: "What is happening",
              value: r.plainWhat || r.cause,
              basis: "inferred",
              title: [`Alert condition: ${r.logic}`, r.evidence && `What the sensors show: ${r.evidence}`, `Code: ${r.id}`].filter(Boolean).join("\n"),
            },
            { label: "Where in the machine", value: where.length ? <Texts items={where} /> : issue.where, basis: "inferred" },
            {
              label: "Order things changed",
              value: chain.length ? (
                <ol className="pg-an-chain">
                  {chain.map((n) => (
                    <li key={n.id}>
                      <span>{n.name}</span> <span className="ast-muted">{n.minutesAgo > 0 ? `${formatDuration(n.minutesAgo)} ago` : "now"}</span>
                    </li>
                  ))}
                </ol>
              ) : null,
              basis: "measured",
            },
            {
              label: "Moving together",
              value: together.length ? <Texts items={together.map((p) => `${nameOf(p.a)} and ${nameOf(p.b)} ${p.r > 0 ? "rise and fall together" : "move in opposite directions"}`)} /> : changes.length > 1 ? "Each reading is moving on its own" : null,
              basis: "measured",
            },
          ]}
        />
        {sheets.length > 0 && library && (
          <WhyDisclosure summary="Method">
            <p className="ast-caption">From the fault library {library.document}. Set-points are the sensor-list proposals, not yet approved by the plant.</p>
            <dl className="pg-an-facts">
              {sheets.map((s) => (
                <React.Fragment key={s.id}>
                  <dt title={`${s.origin} · ${s.revStatus}`}>
                    {s.id} · {s.title}
                  </dt>
                  <dd>{[s.detection, s.alert && `Alert: ${s.alert}`, s.danger && `Critical: ${s.danger}`].filter(Boolean).join(" ")}</dd>
                </React.Fragment>
              ))}
            </dl>
          </WhyDisclosure>
        )}
      </Step>

      <Step n={4} title="Likely causes">
        <CauseTable causes={causes} />
      </Step>

      <Step n={5} title="What it affects">
        <Block title="Parts" basis="measured">
          <Table className="pg-an-table" columns={impactCols} data={impact} keyExtractor={(x) => x.subId} />
        </Block>
        <Facts
          rows={[
            { label: "Started at", value: origin ? `${origin.name}, ${origin.minutesAgo > 0 ? `${formatDuration(origin.minutesAgo)} ago` : "just now"}` : null, basis: "measured" },
            {
              label: "Already off expected",
              value: chain.length > 1 ? <Texts items={chain.slice(1).map((n) => `${n.name} (${n.tags.length} sensor${n.tags.length === 1 ? "" : "s"})`)} /> : origin ? "No other part" : null,
              basis: "measured",
            },
            { label: "Could spread to", value: leadsTo.length ? <Texts items={leadsTo} /> : r.consequence || null, basis: "inferred", title: r.consequence ? `If nobody acts: ${r.consequence}` : undefined },
            { label: "Whole machine", value: machineHealth !== null ? `Health ${machineHealth} of 100${lost > 0 ? `, ${Math.round(lost * 10) / 10} points of it lost to this` : ""}` : null, basis: "measured" },
            {
              label: "Rest of the plant",
              value: Object.keys(fleet).length > 1 ? (others.length ? <Texts items={others.map((o) => `${machineName(o.machineId)}: ${o.title}${o.ago !== null ? `, for ${formatDuration(o.ago)}` : ""}`)} /> : "No problem on any other machine of this plant right now") : null,
              basis: "measured",
            },
            { label: "Production that depends on it", value: "Not recorded: no process map links this machine to the machines it feeds", basis: "verify" },
          ]}
        />
      </Step>

      <Step
        n={6}
        title="How it is developing"
        right={
          onSeeTimeLeft && (
            <button type="button" className="pg-diag-inline-link" onClick={onSeeTimeLeft}>
              See time left <span aria-hidden="true">→</span>
            </button>
          )
        }
      >
        <Facts
          rows={[
            { label: "Now", value: issueState(issue, frame), basis: "measured" },
            { label: "Direction", value: progress, basis: "inferred" },
            { label: "Reaches its limit", value: r.timeToLimit && r.timeToLimit !== "—" ? `In ${r.timeToLimit}` : null, basis: "predicted" },
            { label: "As it develops", value: developing.length ? <Texts items={developing} /> : null, basis: "inferred" },
          ]}
        />
        <Table className="pg-an-table" columns={progressCols} data={changes.filter((c) => c.moveNow !== null)} keyExtractor={(c) => c.tag} />
        {past.length > 0 && (
          <Block title="Past times this happened" basis="measured">
            <Table
              className="pg-an-table"
              columns={[
                { key: "c", header: "Started", width: "180px", render: (e) => <span className="ast-num">{e.confirmedClock}</span> },
                { key: "x", header: "Ended", width: "180px", render: (e) => <span className="ast-num">{e.clearedClock ?? "Still going"}</span> },
                { key: "d", header: "Lasted", width: "140px", render: (e) => <span className="ast-num">{formatDuration(e.minutes)}</span> },
                { key: "a", header: "Actions taken", render: (e) => <span className="ast-cell-text">{e.actions.join(", ") || "—"}</span> },
              ]}
              data={past}
              keyExtractor={(e) => `${e.ruleId}-${e.confirmedT}`}
            />
          </Block>
        )}
      </Step>

      <Step n={7} title="What to do">
        <Facts
          rows={[
            { label: "Do this", value: r.plainTodo || r.action, basis: "inferred", title: r.plainTodo ? `Action: ${r.action}` : undefined },
            {
              label: "How urgent",
              value: [r.severity, r.status === "PENDING" ? "not yet confirmed" : null, r.timeToLimit && r.timeToLimit !== "—" ? `limit in ${r.timeToLimit}` : null].filter(Boolean).join(" · "),
              basis: "inferred",
            },
            { label: "Who", value: r.owner ?? null, basis: "measured" },
            { label: "Check on site", value: checks.length ? <Texts items={checks} /> : null, basis: "verify" },
            { label: "Escalate when", value: danger.length ? <Texts items={danger} /> : null, basis: "inferred" },
          ]}
        />
      </Step>

      <Step n={8} title="How to confirm">
        <Facts
          rows={[
            { label: "Is it real?", value: verdict },
            { label: "Not yet proven", value: r.unproven || null, basis: "verify" },
            { label: "Telling causes apart", value: discriminate.length ? <Texts items={discriminate} /> : null, basis: "verify" },
            {
              label: "Checks on the case",
              value: caseChecks.length ? (
                <Texts items={caseChecks.map((k) => `${k.detail}: ${k.status === "done" ? (k.resultWord ?? "done") : k.status === "cancelled" ? "cancelled" : "open"}`)} />
              ) : openCase ? (
                "No checks on the case yet"
              ) : null,
              basis: caseChecks.some((k) => k.status === "done") ? "measured" : "verify",
            },
            {
              label: "After the fix, watch",
              value: changes.length ? (
                <Texts items={changes.filter((c) => c.expected !== null).map((c) => `${c.name} back to about ${fmt(c.expected)}${c.unit ? ` ${c.unit}` : ""}`)} />
              ) : null,
              basis: "verify",
            },
          ]}
        />
      </Step>
    </>
  );
}
