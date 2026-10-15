"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { PillButton, PillNav, Table, type Column } from "@/components/ui";
import { ACTION, conditionTone, type Tone } from "@/components/ui/status";
import { StatusTag } from "@/components/ui/status-tag";
import { WhyDisclosure } from "./analysis/an-ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useLivePlantStarting } from "@/providers/kiln-simulation-context";
import type { KilnScenario } from "@/lib/kiln-sim/scenarios";
import type { RuleState, SimEvent, StoryProfile } from "@/lib/kiln-sim/engine";
import type { Severity } from "@/lib/kiln-sim/signals";
import { fmtMin, suiteCases, summariseSuite, type SuiteCase, type TestResult } from "@/lib/kiln-sim/test-lab";
import { pyroSuiteCases, RUN_MIN as PYRO_RUN_MIN, type PyroScenarioRun } from "@/lib/pyro-sim/suite";
import { SIM_SPEEDS, type KilnSimulation } from "./kiln-seals-simulation";
import { SimulationResponseChart, type ResponseMarker } from "./simulation-response-chart";
import { SimulationControl } from "./simulation-control";
import "./simulation-view.css";

/**
 * Simulation sub-page (every live machine: kiln-seal fleet and pyro line).
 * Answers: what scenario is the live demonstration running and how is the
 * plant responding?
 *
 * Header with playback -> KPI strip -> health response chart -> the machine's
 * validation scenarios (kiln: D5 Table 9.8; pyro: D4-OSW-PE-PYR) with expected
 * vs triggered rules -> open findings -> event log -> links to Diagnosis / Trends.
 *
 * Every control drives the shared live fleet that all other tabs read.
 * The headless validation run uses its own engine and never touches it
 * (kiln: Test Lab `createSim`; pyro: a fresh line per scenario, `pyro-sim/suite`).
 */

/** Severity → tone through the one status scale (Normal good · Advisory warn · Critical bad). */
const TONE = (s: Severity): Tone => conditionTone(s);
const PHASE_TONE: Record<string, Tone> = { healthy: "good", developing: "warn", detected: "bad", mitigated: "warn", recovering: "info" };
/** Phase words on the one status scale ("healthy" reads as Normal). */
const PHASE_LABEL: Record<string, string> = { healthy: "Normal" };
const EVENT_LIMIT = 20;
/** Simulated minutes per headless pyro chunk (~20–40 ms of work between yields). */
const PYRO_CHUNK_MIN = 60;

const PROFILES: Array<{ id: StoryProfile; label: string }> = [
  { id: "healthy", label: "Normal" },
  { id: "advisory", label: "Advisory" },
  { id: "critical", label: "Critical" },
  { id: "story", label: "Rotate all faults" },
];

const FILTERS: Array<{ id: string; label: string; match: (s: KilnScenario) => boolean }> = [
  { id: "all", label: "All", match: () => true },
  { id: "quiet", label: "No-fault", match: (s) => s.expected.length === 0 },
  { id: "machine", label: "Machine faults", match: (s) => s.expected.length > 0 && s.group !== "Sensor validation" },
  { id: "sensor", label: "Sensor faults", match: (s) => s.group === "Sensor validation" },
];

/** D5 Table 9.8 "+2h 40m" -> plant minutes; null for "quiet". */
function documentedMinutes(label: string): number | null {
  const m = /(\d+)h\s*(\d+)m/.exec(label);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function bySeverity(a: RuleState, b: RuleState) {
  if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;
  if (a.severity !== b.severity) return a.severity === "Critical" ? -1 : 1;
  return b.confidence - a.confidence;
}

/**
 * Validation results outlive the tab, so switching pages keeps the last run.
 * Keyed by scenario library: the kiln fleet shares one, each pyro machine has its own.
 */
type SuiteRun = { results: TestResult[]; at: number };
const memory: { suites: Record<string, SuiteRun>; filter: string; eventsScope: string; view: "control" | "scenarios" } = { suites: {}, filter: "all", eventsScope: "scenario", view: "control" };

type Triggered = { id: string; at: number; severity: Severity };
type LiveVerdict = { label: string; tone: Tone };

export function SimulationView({ simulation }: { simulation: KilnSimulation | null }) {
  const starting = useLivePlantStarting();
  if (!simulation) {
    return (
      <div className="ast-root sim-page">
        <section className="ast-card ast-empty" aria-label="Simulation">
          {starting ? "Starting the live plant…" : "No live simulation for this machine."}
        </section>
      </div>
    );
  }
  const suiteKey = suiteKeyOf(simulation);
  return <SimulationModule key={suiteKey} simulation={simulation} suiteKey={suiteKey} />;
}

/** Scenario library a machine runs: "kiln" for the kiln-seal fleet, the machine id on the pyro line. */
function suiteKeyOf(simulation: KilnSimulation): string {
  return simulation.frame.defs.plant === "kiln" ? "kiln" : simulation.machineId;
}

function SimulationModule({ simulation, suiteKey }: { simulation: KilnSimulation; suiteKey: string }) {
  const {
    machineId, frame, scenario, scenarios, applyScenario, resetToHealthy, isPaused, setIsPaused,
    speedMultiplier, setSpeedMultiplier, advance, autopilot, setAutopilot, performAction, phase, storyLabel,
    profile, setProfile,
  } = simulation;
  const { setActiveSubPage } = useIndustrialData();
  const isKilnPlant = frame.defs.plant === "kiln";
  /** What the copy calls this machine ("this kiln" on the kiln-seal fleet). */
  const noun = isKilnPlant ? "kiln" : "machine";

  const [filter, setFilterState] = useState(memory.filter);
  const setFilter = (f: string) => setFilterState((memory.filter = f));
  const [eventsScope, setScopeState] = useState(memory.eventsScope);
  const setEventsScope = (s: string) => setScopeState((memory.eventsScope = s));
  const [suite, setSuite] = useState<SuiteRun | null>(memory.suites[suiteKey] ?? null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  /** Pyro line: plant-wide Control (generator, quick actions, events) or this machine's Scenarios. */
  const [viewState, setViewState] = useState(memory.view);
  const setView = (v: "control" | "scenarios") => setViewState((memory.view = v));
  const line = simulation.line;
  const view = line ? viewState : "scenarios";
  const cancel = useRef(false);
  useEffect(() => () => void (cancel.current = true), []);

  const start = frame.t - frame.scenarioMinute;
  const documented = documentedMinutes(scenario.documentedDetection);
  const isCustom = scenario.group === "Custom";

  /* Rules confirmed since this scenario started: from the event log, plus any still active. */
  const triggered = useMemo<Triggered[]>(() => {
    const seen = new Map<string, Triggered>();
    for (const e of frame.events) {
      if (e.kind !== "rule" || e.t < start || !e.title.endsWith(" confirmed")) continue;
      const id = e.title.split(" ")[0];
      const at = e.t - start;
      const prev = seen.get(id);
      if (!prev || at < prev.at) seen.set(id, { id, at, severity: e.severity });
    }
    for (const r of frame.rules) {
      if (r.status !== "ACTIVE" || r.since === null || r.since < start) continue;
      const at = r.since - start;
      const prev = seen.get(r.id);
      if (!prev || at < prev.at) seen.set(r.id, { id: r.id, at, severity: r.severity });
    }
    return [...seen.values()].sort((a, b) => a.at - b.at);
  }, [frame.events, frame.rules, start]);

  const expected = scenario.expected;
  const hitExpected = expected.filter((id) => triggered.some((t) => t.id === id));
  const unexpected = triggered.filter((t) => !expected.includes(t.id));
  const firstDetection = triggered.find((t) => expected.includes(t.id))?.at ?? null;

  const verdict: LiveVerdict = isCustom
    ? { label: triggered.length ? `${triggered.length} raised` : "Running", tone: "info" }
    : expected.length === 0
      ? triggered.length
        ? { label: "False alarm", tone: "bad" }
        : { label: "Quiet as expected", tone: "good" }
      : hitExpected.length === expected.length
        ? { label: `Detected +${fmtMin(firstDetection)}`, tone: "good" }
        : documented !== null && frame.scenarioMinute > documented
          ? { label: "Not yet detected", tone: "warn" }
          : { label: "Developing", tone: "info" };

  const findings = frame.rules.filter((r) => r.status !== "QUIET").sort(bySeverity);
  const confirmed = findings.filter((r) => r.status === "ACTIVE");
  const p = frame.pipeline;
  const clock = `${frame.day > 0 ? `D+${frame.day} ` : ""}${frame.clock}`;
  const condTone: Tone = conditionTone(frame.condition);

  const markers: ResponseMarker[] = triggered.map((t) => ({
    id: t.id,
    at: t.at,
    tone: TONE(t.severity) === "good" ? "info" : (TONE(t.severity) as ResponseMarker["tone"]),
    expected: expected.includes(t.id),
  }));

  const suiteById = useMemo(() => new Map((suite?.results ?? []).map((r) => [r.scenarioId, r])), [suite]);
  const summary = suite ? summariseSuite(suite.results) : null;

  const runSuite = async () => {
    const cases: Array<SuiteCase & { start?: () => PyroScenarioRun }> = isKilnPlant ? suiteCases([]) : pyroSuiteCases(machineId);
    cancel.current = false;
    const results: TestResult[] = [];
    const tick = () => new Promise((r) => window.setTimeout(r, 0));
    setProgress({ done: 0, total: cases.length });
    for (const c of cases) {
      await tick();
      if (cancel.current) return;
      if (c.start) {
        // A pyro case steps the whole line: run it in chunks so the page stays responsive.
        const run = c.start();
        while (!run.step(PYRO_CHUNK_MIN)) {
          await tick();
          if (cancel.current) return;
        }
        results.push({ ...run.result(), scenarioId: c.id, name: c.name });
      } else results.push({ ...c.run(), scenarioId: c.id, name: c.name });
      setProgress({ done: results.length, total: cases.length });
    }
    const run = { results, at: Date.now() };
    memory.suites[suiteKey] = run;
    setSuite(run);
    setProgress(null);
  };

  const registerRows = scenarios.filter((FILTERS.find((f) => f.id === filter) ?? FILTERS[0]).match);
  const numberOf = new Map(scenarios.map((s, i) => [s.id, i + 1]));
  const events = (eventsScope === "scenario" ? frame.events.filter((e) => e.t >= start) : frame.events).slice(0, EVENT_LIMIT);

  const progressPct = documented ? Math.min(100, (frame.scenarioMinute / documented) * 100) : null;

  return (
    <div className="ast-root sim-page">
      {/* ---------------- header + playback ---------------- */}
      <header className="sim-head">
        <div className="sim-head-main">
          <div className="sim-title-row">
            <h1 className="ast-title">Simulation</h1>
            <span className="sim-live" data-paused={isPaused || undefined}>
              <i aria-hidden="true" />
              {isPaused ? "Paused" : "Live"}
            </span>
            <span className="sim-clock ast-num" title="Simulated plant clock">
              {clock}
            </span>
          </div>
          <p className="sim-context" role="status" aria-live="polite">
            <StatusTag tone={PHASE_TONE[phase]} label={<span className="sim-cap">{PHASE_LABEL[phase] ?? phase}</span>} />
            <span>
              {machineId} · {storyLabel}
            </span>
          </p>
        </div>
        <div className="sim-actions" aria-label="Playback">
          <PillButton variant="primary" onClick={() => setIsPaused(!isPaused)} aria-pressed={isPaused}>
            {isPaused ? "Play" : "Pause"}
          </PillButton>
          <PillNav
            items={SIM_SPEEDS.map((s) => ({ id: String(s.id), label: s.label }))}
            activeId={String(speedMultiplier)}
            onChange={(id) => setSpeedMultiplier(Number(id))}
          />
          <PillButton variant="secondary" onClick={() => advance(30)} title="Advance the plant 30 simulated minutes">
            +30 min
          </PillButton>
          {confirmReset ? (
            <span className="sim-confirm" role="group" aria-label="Confirm reset">
              <span className="ast-caption">Reset to the normal baseline?</span>
              <PillButton
                variant="danger"
                onClick={() => {
                  resetToHealthy();
                  setConfirmReset(false);
                }}
              >
                Reset
              </PillButton>
              <PillButton variant="secondary" onClick={() => setConfirmReset(false)}>
                Cancel
              </PillButton>
            </span>
          ) : (
            <PillButton
              variant="secondary"
              onClick={() => setConfirmReset(true)}
              disabled={scenario.id === "healthy" && !autopilot}
              title={`Stops the running scenario and autopilot and returns this ${noun} to the normal baseline in manual mode`}
            >
              Reset…
            </PillButton>
          )}
        </div>
      </header>

      {line && (
        <PillNav
          ariaLabel="Simulation views"
          items={[
            { id: "control", label: "Plant control" },
            { id: "scenarios", label: `${machineId} scenarios` },
          ]}
          activeId={view}
          onChange={(id) => setView(id as "control" | "scenarios")}
        />
      )}

      {line && view === "control" && <SimulationControl simulation={simulation} line={line} />}

      {view === "scenarios" && (
        <>
          <div className="sim-mode">
            <PillNav
              items={[
                { id: "auto", label: "Autopilot" },
                { id: "manual", label: "Manual" },
              ]}
              activeId={autopilot ? "auto" : "manual"}
              onChange={(id) => setAutopilot(id === "auto")}
            />
            {autopilot ? (
              <>
                <span className="sim-sep" aria-hidden="true" />
                <span className="ast-caption">Hold {noun}</span>
                <PillNav items={PROFILES} activeId={profile} onChange={(id) => setProfile(id as StoryProfile)} />
              </>
            ) : (
              <span className="ast-caption">Manual: the scenario you pick below keeps running until you change it.</span>
            )}
          </div>

          {/* ---------------- KPI strip ---------------- */}
          <dl className="ast-kpis sim-kpis">
            <SimKpi
              label="Scenario elapsed"
              value={`+${fmtMin(frame.scenarioMinute)}`}
              note={documented !== null ? `Documented detection +${fmtMin(documented)} · plant time` : "Must stay quiet · plant time"}
            />
            <SimKpi
              label={expected.length ? "Expected rules triggered" : "Findings raised (expect none)"}
              value={expected.length ? `${hitExpected.length} / ${expected.length}` : String(triggered.length)}
              tone={verdict.tone === "good" ? "good" : verdict.tone === "bad" ? "bad" : undefined}
              note={unexpected.length ? `Unexpected: ${unexpected.map((u) => u.id).join(", ")}` : verdict.label}
            />
            <SimKpi
              label="Open findings"
              value={`${confirmed.length} confirmed`}
              note={`${findings.length - confirmed.length} pending · ${p.evaluated} rules evaluated`}
              tone={confirmed.some((r) => r.severity === "Critical") ? "bad" : undefined}
            />
            <SimKpi
              label="Machine health"
              value={`${Math.round(frame.overall)} %`}
              tone={condTone === "good" ? "good" : condTone === "bad" ? "bad" : undefined}
              note={`${frame.condition} · ${p.beyond3s} signals beyond 3σ`}
            />
          </dl>

          {/* ---------------- primary visual ---------------- */}
          <section className="ast-card" aria-label="Plant response">
            <div className="ast-card-head sim-card-head-row">
              <div className="sim-card-head-text">
                <h2 className="ast-card-title">{scenario.name}</h2>
                <span className="ast-caption">
                  {isCustom ? "Custom scenario" : scenario.group} · expected {expected.length ? expected.join(", ") : "no alarm"}
                </span>
              </div>
              <StatusTag tone={verdict.tone} label={verdict.label} />
            </div>
            <p className="sim-desc">{scenario.description}</p>
            {progressPct !== null && (
              <div className="sim-progress-row">
                <div
                  className="sim-progress"
                  role="progressbar"
                  aria-label="Progress to the documented detection time"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressPct)}
                  data-tone={verdict.tone}
                >
                  <i style={{ width: `${progressPct}%` }} />
                </div>
                <span className="ast-caption ast-num">
                  +{fmtMin(frame.scenarioMinute)} of +{fmtMin(documented)}
                </span>
              </div>
            )}
            <SimulationResponseChart
              times={frame.times}
              health={frame.healthHistory.overall}
              start={start}
              documented={documented}
              markers={markers}
            />
            <div className="sim-chart-foot ast-caption ast-num">
              <span>
                Signals valid {p.valid} · suspect {p.suspect} · invalid {p.invalid}
              </span>
              <span>
                Rules matching {p.matching} · pending {p.pending} · confirmed {p.confirmed}
              </span>
            </div>
          </section>

          {/* ---------------- scenario register ---------------- */}
          <section className="ast-card sim-table-card" aria-label="Validation scenarios">
            <div className="ast-card-head sim-card-head sim-card-head-row">
              <div className="sim-card-head-text">
                <h2 className="ast-card-title">
                  Validation scenarios <span className="ast-muted ast-num">{scenarios.length}</span>
                </h2>
                <span className="ast-caption ast-num">
                  {summary && suite
                    ? `Simulated headless run ${new Date(suite.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${summary.passed}/${summary.total} matched · detection ${pct(summary.detection)} · no false alarm ${pct(summary.noFalseAlarm)} · mean lead ${fmtMin(summary.meanLead)} · not field evidence`
                    : `Run a scenario live on this ${noun}, or run all headless to score expected against triggered rules.`}
                </span>
              </div>
              <div className="sim-actions">
                <PillNav items={FILTERS} activeId={filter} onChange={setFilter} />
                <PillButton variant="secondary" onClick={runSuite} disabled={progress !== null} title="Runs every scenario on its own engine; the live plant is untouched">
                  {progress ? `Running ${progress.done}/${progress.total}` : suite ? "Re-run all headless" : "Run all headless"}
                </PillButton>
              </div>
            </div>
            {progress && (
              <div className="sim-progress sim-progress-flush" role="progressbar" aria-label="Headless validation run" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
                <i style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            )}
            <Table
              className="ast-table sim-register"
              columns={registerColumns({
                runningId: scenario.id,
                numberOf,
                liveTriggered: triggered,
                verdict,
                suiteById,
                onRun: applyScenario,
              })}
              data={registerRows}
              keyExtractor={(s) => s.id}
              selectedId={scenario.id}
            />
            <WhyDisclosure summary="Method">
              {isKilnPlant ? (
                <p className="ast-caption">
                  Scenarios, expected rules and documented detection times follow the kiln system specification D5, Table 9.8. A headless run plays every
                  scenario on its own engine; the live plant is untouched.
                </p>
              ) : (
                <p className="ast-caption">
                  Scenarios and expected rules follow the pyro line specification D4-OSW-PE-PYR Rev. 02. Documented detection times were measured on this
                  simulation and show scripted demo behaviour, not a field detection rate. A headless run plays every scenario on its own line for{" "}
                  {fmtMin(PYRO_RUN_MIN)}: it matches when the expected rule confirms on {machineId} and no other rule confirms anywhere on the line. Detection
                  is counted from the scenario start. The live plant is untouched.
                </p>
              )}
            </WhyDisclosure>
          </section>

          {/* ---------------- findings ---------------- */}
          <section className="ast-card sim-table-card" aria-label="Findings raised">
            <div className="ast-card-head sim-card-head sim-card-head-row">
              <h2 className="ast-card-title">
                Findings raised <span className="ast-muted ast-num">{findings.length}</span>
              </h2>
            </div>
            {findings.length === 0 ? (
              <p className="ast-caption sim-empty">
                No finding open. All signals follow the reference model · {p.evaluated} rules evaluated · ambient est.{" "}
                <span className="ast-num">{frame.drivers.ambientEst.toFixed(1)} °C</span>
              </p>
            ) : (
              <Table
                className="ast-table"
                columns={findingColumns({ start, expected, performAction, go: setActiveSubPage })}
                data={findings}
                keyExtractor={(r) => r.id}
              />
            )}
          </section>

          {/* ---------------- event log ---------------- */}
          <section className="ast-card sim-table-card" aria-label="Event log">
            <div className="ast-card-head sim-card-head sim-card-head-row">
              <h2 className="ast-card-title">
                Event log <span className="ast-muted ast-num">latest {events.length}</span>
              </h2>
              <PillNav
                items={[
                  { id: "scenario", label: "This scenario" },
                  { id: "all", label: "All" },
                ]}
                activeId={eventsScope}
                onChange={setEventsScope}
              />
            </div>
            {events.length === 0 ? (
              <p className="ast-caption sim-empty">No events since the scenario started.</p>
            ) : (
              <Table
                className="ast-table"
                columns={eventColumns}
                data={events.map((e, i) => ({ ...e, key: `${e.t}-${i}-${e.title}` }))}
                keyExtractor={(e) => e.key}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function pct(v: number | null) {
  return v === null ? "—" : `${Math.round(v * 100)} %`;
}

function SimKpi({ label, value, note, tone }: { label: string; value: React.ReactNode; note: string; tone?: "good" | "bad" }) {
  return (
    <div className="ast-card ast-kpi sim-kpi" data-tone={tone}>
      <dt className="ast-kpi-label">{label}</dt>
      <dd className="ast-kpi-value ast-num">{value}</dd>
      <span className="ast-caption ast-kpi-foot">{note}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Register                                                            */
/* ------------------------------------------------------------------ */

function RuleIds({ ids, expected }: { ids: string[]; expected: string[] }) {
  if (ids.length === 0) return <span className="ast-muted">None</span>;
  return (
    <span className="sim-ids ast-num">
      {ids.map((id) => (
        <span key={id} className="sim-id" data-tone={expected.includes(id) ? "good" : "bad"}>
          {id}
        </span>
      ))}
    </span>
  );
}

function registerColumns(o: {
  runningId: string;
  numberOf: Map<string, number>;
  liveTriggered: Triggered[];
  verdict: LiveVerdict;
  suiteById: Map<string, TestResult>;
  onRun: (id: string) => void;
}): Column<KilnScenario>[] {
  return [
    { key: "n", header: "#", width: "44px", render: (s) => <span className="ast-num ast-muted">{o.numberOf.get(s.id)}</span> },
    {
      key: "name",
      header: "Scenario",
      render: (s) => (
        <span className="ast-cell-stack sim-wrap">
          <span className="ast-cell-title">{s.name}</span>
          <span className="ast-cell-sub">{s.group}</span>
        </span>
      ),
    },
    {
      key: "exp",
      header: "Expected",
      render: (s) => (s.expected.length ? <span className="ast-num">{s.expected.join(", ")}</span> : <span className="ast-muted">Quiet</span>),
    },
    { key: "d5", header: "Documented", width: "104px", render: (s) => <span className="ast-num">{s.documentedDetection}</span> },
    {
      key: "trig",
      header: "Triggered",
      render: (s) => {
        if (s.id === o.runningId) return <RuleIds ids={o.liveTriggered.map((t) => t.id)} expected={s.expected} />;
        const r = o.suiteById.get(s.id);
        return r ? <RuleIds ids={r.fired.map((f) => f.id)} expected={s.expected} /> : <span className="ast-muted">—</span>;
      },
    },
    {
      key: "res",
      header: "Result",
      width: "170px",
      render: (s) => {
        if (s.id === o.runningId) return <StatusTag tone={o.verdict.tone} label={`Live · ${o.verdict.label}`} />;
        const r = o.suiteById.get(s.id);
        if (!r) return <span className="ast-muted">Not run</span>;
        return (
          <StatusTag
            tone={r.pass ? "good" : "bad"}
            label={`${r.pass ? "Matched" : "Mismatch"}${r.detectedAfter !== null ? ` · +${fmtMin(r.detectedAfter)}` : ""}`}
          />
        );
      },
    },
    {
      key: "act",
      header: "",
      width: "92px",
      render: (s) =>
        s.id === o.runningId ? (
          <span className="sim-running ast-caption">Running</span>
        ) : (
          <PillButton variant="secondary" className="sim-row-action" onClick={() => o.onRun(s.id)} aria-label={`Run ${s.name} live`}>
            Run
          </PillButton>
        ),
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Findings                                                            */
/* ------------------------------------------------------------------ */

function findingColumns(o: {
  start: number;
  expected: string[];
  performAction: KilnSimulation["performAction"];
  go: (sub: "diagnosis" | "trends") => void;
}): Column<RuleState>[] {
  return [
    {
      key: "rule",
      header: "Finding",
      render: (r) => (
        <span className="ast-cell-stack sim-wrap">
          <span className="ast-cell-title">
            <span className="ast-num">{r.id}</span> {r.name}
          </span>
          <span className="ast-cell-sub">{r.evidence}</span>
        </span>
      ),
    },
    {
      key: "sev",
      header: "Severity",
      width: "104px",
      render: (r) => <StatusTag tone={r.status === "ACTIVE" ? TONE(r.severity) : "idle"} label={r.status === "ACTIVE" ? r.severity : "Pending"} />,
    },
    {
      key: "when",
      header: "Status",
      width: "140px",
      render: (r) => (
        <span className="ast-num">
          {r.status === "ACTIVE"
            ? r.since !== null && r.since >= o.start
              ? `Confirmed +${fmtMin(r.since - o.start)}`
              : "Confirmed (before scenario)"
            : `Persistence ${r.persistence}/${r.threshold}`}
        </span>
      ),
    },
    { key: "conf", header: "Conf.", width: "64px", render: (r) => <span className="ast-num">{r.confidence} %</span> },
    {
      key: "fit",
      header: "Scenario",
      width: "100px",
      render: (r) => (o.expected.includes(r.id) ? <span>Expected</span> : <span className="sim-bad">Unexpected</span>),
    },
    {
      key: "act",
      header: "Operator response",
      width: "250px",
      render: (r) =>
        r.status === "ACTIVE" ? (
          <span className="sim-row-actions">
            <PillButton variant="secondary" onClick={() => o.performAction(r.id, "acknowledge")}>
              {ACTION.acknowledge}
            </PillButton>
            <PillButton variant="secondary" onClick={() => o.performAction(r.id, "mitigate")}>
              Mitigate
            </PillButton>
            <PillButton variant="secondary" onClick={() => o.performAction(r.id, "repair")}>
              Repair
            </PillButton>
          </span>
        ) : (
          <span className="ast-muted">Awaiting confirmation</span>
        ),
    },
    {
      key: "go",
      header: "",
      width: "150px",
      render: (r) => (
        <span className="sim-row-links">
          <button type="button" className="sim-link" onClick={() => o.go("diagnosis")} aria-label={`${r.id} in Diagnosis`}>
            Diagnosis
          </button>
          <button type="button" className="sim-link" onClick={() => o.go("trends")} aria-label={`${r.id} signals in Trends`}>
            Trends
          </button>
        </span>
      ),
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Event log                                                           */
/* ------------------------------------------------------------------ */

const eventColumns: Column<SimEvent & { key: string }>[] = [
  { key: "clock", header: "Time", width: "104px", render: (e) => <span className="ast-num">{e.clock}</span> },
  {
    key: "kind",
    header: "Type",
    width: "112px",
    render: (e) => (
      <StatusTag
        tone={e.kind === "action" || e.kind === "scenario" ? "info" : TONE(e.severity)}
        label={e.kind === "rule" ? "Finding" : e.kind[0].toUpperCase() + e.kind.slice(1)}
      />
    ),
  },
  {
    key: "title",
    header: "Event",
    render: (e) => (
      <span className="ast-cell-stack sim-wrap">
        <span className="ast-cell-title">{e.title}</span>
        <span className="ast-cell-sub">{e.detail}</span>
      </span>
    ),
  },
  {
    key: "by",
    header: "By",
    width: "96px",
    render: (e) => <span className="ast-muted">{e.action ? (e.action.auto ? "Autopilot" : "Operator") : "System"}</span>,
  },
];
