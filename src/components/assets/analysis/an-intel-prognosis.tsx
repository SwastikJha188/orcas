"use client";

/* ==========================================================================
   Analysis · Prognosis window — investigates one part Prognosis expects may
   fail, in the eight investigation steps: what is predicted, the evidence,
   why it is predicted, the failure modes that could cause it (ranked), what
   it will affect, how it may develop, what changes if we act, and how to
   confirm it. From the Prognosis payload (forecasts, time left, part life),
   the live frame and the rule and fault libraries.
   ========================================================================== */

import React, { useMemo } from "react";
import { Table, type Column } from "@/components/ui";
import { isConditionRule, type PlantDefs } from "@shared/lib/plant-defs";
import type { SimFrame } from "@shared/lib/kiln-sim/engine";
import { displayName } from "@/lib/display-name";
import { FAILURE_CHANCE_HEADER, FailureChance } from "../prognosis/prog-chance";
import { failureChance, lifeLeftAt, rangeText, roundHours, type PrognosisData, type RulRow } from "../prognosis/prognosis-derive";
import { SignalForecastTable, type SignalForecastRow } from "../prognosis/prog-signals";
import { distinctTexts, faultsForTag, type FaultEntry, type FaultLibrary } from "../fault-library";
import { couplingShifts, trendingSignals, type ImpactRow, type Issue } from "./an-issues";
import { fmt, offText } from "./an-derive";
import { signalChange, type Basis, type SignalChange } from "./an-intel";
import { BasisWord, Block, Facts, Num, Step, TagButton, Texts } from "./an-intel-ui";

const COUPLING_TIP = "How closely the two readings rise and fall together: 1 = always together, 0 = unrelated, −1 = always opposite (correlation).";

interface Mode {
  id: string;
  title: string;
  category: string;
  /** Largest gap to expected among its sensors now (σ); null without a live frame. */
  closest: number | null;
  matched: boolean;
  consequence: string;
  todo: string;
}

/** Failure modes the rule library knows for the part, matched now first, then the closest to matching. */
function modesFor(subId: string, defs: PlantDefs, frame: SimFrame | null): Mode[] {
  return defs.rules
    .filter((d) => isConditionRule(d) && d.subs.includes(subId))
    .map((d) => {
      const live = frame?.rules.find((r) => r.id === d.id) ?? null;
      const zs = d.inputs.map((t) => frame?.signals[t]?.z).filter((z): z is number => z !== null && z !== undefined && Number.isFinite(z));
      return {
        id: d.id,
        title: d.plainTitle || d.name,
        category: d.category,
        closest: zs.length ? zs.reduce((m, z) => (Math.abs(z) > Math.abs(m) ? z : m), 0) : null,
        matched: Boolean(live && live.status !== "QUIET"),
        consequence: d.consequence,
        todo: d.plainTodo || d.action,
      };
    })
    .sort((a, b) => Number(b.matched) - Number(a.matched) || Math.abs(b.closest ?? 0) - Math.abs(a.closest ?? 0));
}

/** Fault-library sheets that read the part's sensors as their main evidence. */
function sheetsFor(lib: FaultLibrary | null, tags: string[]): FaultEntry[] {
  const out: FaultEntry[] = [];
  for (const t of tags) for (const f of faultsForTag(lib, t).primary) if (!out.includes(f)) out.push(f);
  return out;
}

interface Option {
  key: string;
  option: string;
  outcome: React.ReactNode;
  basis: Basis;
}

export function PrognosisInvestigation({
  issue,
  data,
  defs,
  frame,
  library,
  forecastRows,
  impact,
  onOpenTrend,
  onSeeTimeLeft,
}: {
  issue: Issue;
  data: PrognosisData;
  defs: PlantDefs | null;
  frame: SimFrame | null;
  library: FaultLibrary | null;
  forecastRows: SignalForecastRow[];
  impact: ImpactRow[];
  onOpenTrend: (tag: string) => void;
  onSeeTimeLeft: () => void;
}) {
  const life = issue.life[0] as RulRow;
  const subId = issue.subIds[0];
  const partTags = useMemo(() => (defs?.signals ?? []).filter((s) => s.sub === subId).map((s) => s.tag), [defs, subId]);
  const trending = useMemo(() => trendingSignals(issue, forecastRows, data).sort((a, b) => (a.alarmEarly ?? a.alarmLate ?? Infinity) - (b.alarmEarly ?? b.alarmLate ?? Infinity)), [issue, forecastRows, data]);
  const shifts = useMemo(() => couplingShifts(issue, data), [issue, data]);
  const modes = useMemo(() => (defs ? modesFor(subId, defs, frame) : []), [defs, subId, frame]);
  const sheets = useMemo(() => sheetsFor(library, partTags), [library, partTags]);
  const changes = useMemo(
    () => (frame ? partTags.map((t) => signalChange(frame, t)).filter((c): c is SignalChange => c !== null && c.z !== null && Math.abs(c.z) > 2) : []),
    [frame, partTags],
  );
  const nameOf = (tag: string) => displayName(Object.values(data.forecasts[tag] ?? {})[0]?.name ?? defs?.signalByTag[tag]?.name ?? tag);
  const band = life.band;
  const lf = life.life ?? null;

  // What produced the time-left band: the part's life curve when it has one, else the reading trend, else health.
  const basisText = band?.curve && lf
    ? `The life of this kind of part (${lf.source === "recorded" ? "the plant's record of this part" : `typical for a ${lf.kind}`}) and how much of it is used`
    : life.basis === "finding" && life.driver
      ? `How fast the readings of ${life.name} are moving toward their alarm limit`
      : `How the health score of ${life.name} is changing`;
  const prognosisTexts = distinctTexts(sheets.map((s) => s.prognosis));
  const developing = distinctTexts(sheets.map((s) => s.developing));
  const checks = distinctTexts(sheets.map((s) => s.check));
  const top = modes[0] ?? null;

  /* -------------------------------- options -------------------------------- */
  const options: Option[] = [];
  if (band) {
    const m1 = failureChance(band, 720);
    const m6 = failureChance(band, 4320);
    options.push({ key: "run", option: "Keep running as now", outcome: `${m1} % chance it fails within 1 month, ${m6} % within 6 months`, basis: "predicted" });
    options.push({ key: "plan", option: "Plan the work", outcome: `Done within ${roundHours(band.lo)}, it comes before the earliest likely failure`, basis: "inferred" });
  }
  if (lf) {
    const fresh = { eta: lf.lifeH, beta: lf.shape, age: 0 };
    const median = lifeLeftAt(fresh, 0.5);
    const m6 = failureChance({ lo: lifeLeftAt(fresh, 0.1), hi: lifeLeftAt(fresh, 0.9), curve: fresh }, 4320);
    options.push({ key: "repair", option: "Repair or replace it", outcome: `Time left goes back to about ${roundHours(median)}, ${m6} % chance of failing within 6 months`, basis: "predicted" });
  } else {
    options.push({ key: "repair", option: "Repair it", outcome: "The readings return toward expected and the forecast restarts from them", basis: "verify" });
  }
  options.push({ key: "load", option: "Run it at reduced load", outcome: "Not modelled: ULTRON has no record of how load changes wear on this part", basis: "verify" });

  /* -------------------------------- tables -------------------------------- */
  const changeCols: Column<SignalChange>[] = [
    { key: "sensor", header: "Sensor", render: (c) => <TagButton tag={c.tag} name={c.name} onOpenTrend={onOpenTrend} /> },
    { key: "exp", header: "Expected", width: "130px", render: (c) => <Num v={c.expected} unit={c.unit} muted /> },
    { key: "now", header: "Now", width: "130px", render: (c) => <Num v={c.value} unit={c.unit} strong /> },
    { key: "off", header: "How far off", width: "140px", render: (c) => <span className="ast-num">{c.z !== null ? offText(c.z) : "—"}</span> },
    { key: "trend", header: "Trend", width: "150px", render: (c) => <span className="ast-cell-text">{c.progress ?? "—"}</span> },
  ];
  const shiftCols: Column<(typeof shifts)[number]>[] = [
    { key: "pair", header: "Sensor pair", render: (p) => <span title={`${p.a} ↔ ${p.b}`}>{nameOf(p.a)} ↔ {nameOf(p.b)}</span> },
    { key: "base", header: "Moved together before", width: "170px", render: (p) => <span className="ast-num" title={COUPLING_TIP}>{p.baseline.toFixed(2)}</span> },
    { key: "recent", header: "Move together now", width: "170px", render: (p) => <span className="ast-num" title={COUPLING_TIP}>{p.recent.toFixed(2)}</span> },
    { key: "delta", header: "Change", width: "120px", render: (p) => <span className="ast-num pg-an-strong" title={COUPLING_TIP}>{`${p.delta >= 0 ? "+" : "−"}${Math.abs(p.delta).toFixed(2)}`}</span> },
  ];
  const modeCols: Column<Mode>[] = [
    {
      key: "mode",
      header: "Failure mode",
      render: (m) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title" title={m.id}>
            {m.title}
          </span>
          <span className="ast-cell-sub">{m.category}</span>
        </span>
      ),
    },
    { key: "closest", header: "Its sensors now", width: "170px", render: (m) => <span className="ast-num">{m.closest === null ? "—" : Math.abs(m.closest) < 2 ? "As expected" : offText(m.closest)}</span> },
    {
      key: "standing",
      header: "Standing",
      width: "130px",
      render: (m) => (
        <span className="pg-in-standing" data-tone={m.matched ? "lead" : undefined}>
          {m.matched ? "Happening now" : m.closest !== null && Math.abs(m.closest) >= 2 ? "Possible" : "No sign yet"}
        </span>
      ),
    },
    { key: "basis", header: "Basis", width: "90px", render: (m) => <BasisWord basis={m.matched ? "measured" : "inferred"} /> },
  ];
  const impactCols: Column<ImpactRow>[] = [
    { key: "sub", header: "Part", render: (x) => <span className="ast-cell-title">{x.name}</span> },
    { key: "health", header: "Health now", width: "120px", render: (x) => <span className="ast-num">{x.health !== null ? `${x.health} of 100` : "—"}</span> },
    { key: "chance", header: FAILURE_CHANCE_HEADER, width: "220px", render: (x) => <FailureChance band={x.life?.band ?? null} name={x.name} /> },
  ];
  const optionCols: Column<Option>[] = [
    { key: "option", header: "If we", width: "220px", render: (o) => <span className="ast-cell-title">{o.option}</span> },
    { key: "outcome", header: "What may happen", render: (o) => <span className="ast-cell-text">{o.outcome}</span> },
    { key: "basis", header: "Basis", width: "90px", render: (o) => <BasisWord basis={o.basis} /> },
  ];

  return (
    <>
      <Step
        n={1}
        title="What is predicted"
        right={
          <button type="button" className="pg-diag-inline-link" onClick={onSeeTimeLeft}>
            See time left <span aria-hidden="true">→</span>
          </button>
        }
      >
        <Facts
          rows={[
            { label: "Part", value: life.name, basis: "measured" },
            { label: "Health now", value: life.health !== null ? `${Math.round(life.health)} of 100` : null, basis: "measured" },
            {
              label: "Time left",
              value: band ? (
                <span>
                  {roundHours(life.hours)} <span className="ast-muted">· likely {rangeText(band.lo, band.hi)}</span>
                </span>
              ) : (
                life.dueLabel
              ),
              basis: "predicted",
            },
            { label: "Chance of failure", value: <FailureChance band={band} name={life.name} />, basis: "predicted", title: FAILURE_CHANCE_HEADER },
            { label: "What may fail", value: top ? top.title : (life.driver?.fault ?? null), basis: top?.matched ? "measured" : "inferred" },
          ]}
        />
      </Step>

      <Step n={2} title="Evidence">
        <Facts
          rows={[
            {
              label: "Part life",
              value: lf
                ? `${Math.round(lf.usedPct)} % of its ${lf.source === "recorded" ? "recorded" : "typical"} life used (${roundHours(lf.ageH)} of about ${roundHours(lf.lifeH)})`
                : null,
              basis: lf?.source === "recorded" ? "measured" : "inferred",
            },
            { label: "Trend fit", value: life.basis === "finding" && life.confidence !== null ? `${Math.round(life.confidence)} % of the movement explained by the trend line` : null, basis: "measured" },
          ]}
        />
        {changes.length > 0 && (
          <Block title="Readings off expected now" basis="measured">
            <Table className="pg-an-table" columns={changeCols} data={changes} keyExtractor={(c) => c.tag} />
          </Block>
        )}
        {shifts.length > 0 && (
          <Block title="Sensors that no longer move together" basis="measured">
            <Table className="pg-an-table" columns={shiftCols} data={shifts} keyExtractor={(p) => `${p.a}|${p.b}`} />
          </Block>
        )}
        {!changes.length && !shifts.length && !lf && <p className="pg-analysis-empty">Its readings are as expected; the estimate rests on the trend alone.</p>}
      </Step>

      <Step n={3} title="Why it is predicted">
        <Facts
          rows={[
            { label: "Based on", value: basisText, basis: "inferred" },
            {
              label: "Readings heading for alarm",
              value: trending.length ? `${trending.length} sensor${trending.length === 1 ? "" : "s"} of this part may reach the alarm limit in the next 30 days` : "None of its sensors is expected to reach the alarm limit in the next 30 days",
              basis: "predicted",
            },
            { label: "How this fault grows", value: prognosisTexts.length ? <Texts items={prognosisTexts} /> : null, basis: "inferred" },
          ]}
        />
      </Step>

      <Step n={4} title="Failure modes">
        {modes.length ? <Table className="pg-an-table" columns={modeCols} data={modes} keyExtractor={(m) => m.id} /> : <p className="pg-analysis-empty">No failure modes are recorded for this part.</p>}
      </Step>

      <Step n={5} title="What it will affect">
        <Block title="Parts" basis="predicted">
          <Table className="pg-an-table" columns={impactCols} data={impact} keyExtractor={(x) => x.subId} />
        </Block>
        <Facts
          rows={[
            { label: "If it fails", value: top?.consequence ? <Texts items={distinctTexts(modes.filter((m) => m.matched || m === top).map((m) => m.consequence))} /> : null, basis: "inferred" },
            { label: "Whole machine", value: frame && Number.isFinite(frame.overall) ? `Health ${Math.round(frame.overall)} of 100 now` : null, basis: "measured" },
            { label: "Production that depends on it", value: "Not recorded: no process map links this machine to the machines it feeds", basis: "verify" },
          ]}
        />
      </Step>

      <Step n={6} title="How it may develop">
        <Facts
          rows={[
            { label: "Window", value: band ? `Earliest ${roundHours(band.lo)}, latest ${roundHours(band.hi)}` : null, basis: "predicted" },
            { label: "As it develops", value: developing.length ? <Texts items={developing} /> : null, basis: "inferred" },
          ]}
        />
        {trending.length > 0 ? (
          <Block title="Readings in the order they may reach their alarm limit" basis="predicted">
            <SignalForecastTable rows={trending} onOpenTrend={onOpenTrend} />
          </Block>
        ) : (
          <p className="pg-analysis-empty">No sensor of this part is expected to reach its alarm limit in the next 30 days.</p>
        )}
      </Step>

      <Step n={7} title="What to do">
        <Table className="pg-an-table" columns={optionCols} data={options} keyExtractor={(o) => o.key} />
        <Facts
          rows={[
            { label: "Do this", value: top ? top.todo : null, basis: "inferred" },
            { label: "Check on site", value: checks.length ? <Texts items={checks} /> : null, basis: "verify" },
          ]}
        />
      </Step>

      <Step n={8} title="How to confirm">
        <Facts
          rows={[
            {
              label: "Watch",
              value: trending.length ? (
                <Texts items={trending.map((t) => `${t.name}: now ${fmt(t.s.current)}${t.unit && t.unit !== "state" ? ` ${t.unit}` : ""}, alarm at ${t.s.alarm !== null ? fmt(t.s.alarm) : "—"}`)} />
              ) : (
                `The health score of ${life.name}`
              ),
              basis: "verify",
            },
            { label: "Inspect", value: checks.length ? <Texts items={checks} /> : top ? `Look for signs of: ${top.title.toLowerCase()}` : null, basis: "verify" },
            { label: "After the work", value: "Time left on Prognosis should move out past 6 months once the new readings arrive", basis: "verify" },
          ]}
        />
      </Step>
    </>
  );
}
