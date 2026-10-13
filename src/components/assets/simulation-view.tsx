"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { PillButton, PillNav, Table, type Column } from "@/components/ui";
import { type KilnScenario } from "@/lib/kiln-sim/scenarios";
import { formatDuration, type RuleState, type SimEvent, type StoryProfile } from "@/lib/kiln-sim/engine";
import type { Severity } from "@/lib/kiln-sim/signals";
import {
  DRIVERS,
  EXPECTATIONS,
  INJECTABLE,
  SHAPES,
  buildScenario,
  defaultMagnitude,
  describeInjection,
  expectationLabel,
  fmtMin,
  isDriver,
  normaliseInjection,
  runCustomTest,
  runSweep,
  suiteCases,
  summariseSuite,
  targetUnit,
  type CustomTest,
  type Injection,
  type SweepPoint,
  type TestResult,
} from "@/lib/kiln-sim/test-lab";
import { SIM_SPEEDS, type KilnSimulation } from "./kiln-seals-simulation";
import "./simulation-view.css";

/**
 * Simulation tab for a live kiln (D5 Figure 9.1), organised as a test lab:
 * playback, the scenario library, a custom fault builder (real change or
 * sensor error on any signal), sensitivity sweeps and the validation suite.
 * Live runs drive the shared plant every other tab reads; tests and the suite
 * run headless on their own engine and never disturb it.
 */

const TONE: Record<Severity, "good" | "warn" | "bad"> = { Normal: "good", Advisory: "warn", Critical: "bad" };
const PHASE_TONE = { healthy: "good", developing: "warn", detected: "bad", mitigated: "warn", recovering: "info" } as const;
const EVENT_LIMIT = 30;
const MAX_INJECTIONS = 4;
const STORE_KEY = "ultron.sim.saved-tests";

/** Autopilot profiles: what the kiln is held at. */
const PROFILES: Array<{ id: StoryProfile; label: string }> = [
  { id: "healthy", label: "Healthy" },
  { id: "advisory", label: "On alert" },
  { id: "critical", label: "In danger" },
  { id: "story", label: "Rotate all faults" },
];

const VIEWS = [
  { id: "scenarios", label: "Scenarios" },
  { id: "builder", label: "Test builder" },
  { id: "suite", label: "Validation suite" },
  { id: "events", label: "Event log" },
];

const LIBRARY_GROUPS: Array<{ id: string; title: string; note: string; match: (s: KilnScenario) => boolean }> = [
  { id: "quiet", title: "No-fault tests", note: "Must stay quiet", match: (s) => s.expected.length === 0 },
  {
    id: "machine",
    title: "Machine faults",
    note: "Found by the expected rule",
    match: (s) => s.expected.length > 0 && s.group !== "Sensor validation",
  },
  {
    id: "sensor",
    title: "Sensor and data faults",
    note: "Must not be mistaken for machine faults",
    match: (s) => s.group === "Sensor validation",
  },
];

function bySeverity(a: RuleState, b: RuleState) {
  if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;
  if (a.severity !== b.severity) return a.severity === "Critical" ? -1 : 1;
  return b.confidence - a.confidence;
}

const newId = () => Math.random().toString(36).slice(2, 10);

function freshTest(): CustomTest {
  return {
    id: newId(),
    name: "My test",
    expect: "SENSOR",
    injections: [{ target: "TMP-KLN-21", mode: "sensor", shape: "step", magnitude: defaultMagnitude("TMP-KLN-21"), onsetMin: 0, durationMin: 60 }],
  };
}

function loadSaved(): CustomTest[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const list = raw ? (JSON.parse(raw) as CustomTest[]) : [];
    return Array.isArray(list) ? list.filter((t) => t && Array.isArray(t.injections) && t.injections.length) : [];
  } catch {
    return [];
  }
}

function storeSaved(list: CustomTest[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    /* Storage unavailable: saved tests last for this session only. */
  }
}

/** Lab results outlive the tab: switching pages and back keeps the last run. */
type SuiteRun = { results: TestResult[]; at: number; total: number };
const memory: {
  view: string;
  draft: CustomTest | null;
  test: TestResult | null;
  sweep: { points: SweepPoint[]; unit: string; smallest: number | null } | null;
  suite: SuiteRun | null;
  /** Expectation of the custom test last run live, per machine. */
  liveExpect: Record<string, string>;
} = { view: "scenarios", draft: null, test: null, sweep: null, suite: null, liveExpect: {} };

/** Defer heavy headless work by one frame so the "Running…" state paints first. */
function later(fn: () => void) {
  window.setTimeout(fn, 30);
}

export function SimulationView({ simulation }: { simulation: KilnSimulation }) {
  const {
    machineId, frame, scenario, scenarios, applyScenario, resetToHealthy, isPaused, setIsPaused,
    speedMultiplier, setSpeedMultiplier, advance, autopilot, setAutopilot, performAction, phase, storyLabel,
    profile, setProfile,
  } = simulation;

  const [view, setViewState] = useState(memory.view);
  const setView = (v: string) => {
    memory.view = v;
    setViewState(v);
  };
  const [draft, setDraftState] = useState<CustomTest>(() => memory.draft ?? freshTest());
  const setDraft = (t: CustomTest) => {
    memory.draft = t;
    setDraftState(t);
  };
  const [saved, setSaved] = useState<CustomTest[]>([]);
  useEffect(() => setSaved(loadSaved()), []);
  const [testResult, setTestResult] = useState(memory.test);
  const [sweep, setSweep] = useState(memory.sweep);
  const [suite, setSuite] = useState(memory.suite);
  const [busy, setBusy] = useState<null | "test" | "sweep">(null);
  const [suiteProgress, setSuiteProgress] = useState<{ done: number; total: number } | null>(null);
  const cancelSuite = useRef(false);
  useEffect(() => () => void (cancelSuite.current = true), []);

  const findings = frame.rules.filter((r) => r.status !== "QUIET").sort(bySeverity);
  const p = frame.pipeline;
  const clock = `${frame.day > 0 ? `D+${frame.day} ` : ""}${frame.clock}`;
  const conditionTone = frame.condition === "Critical" ? "bad" : frame.condition === "Advisory" ? "warn" : "good";
  const isCustom = scenario.group === "Custom";

  const suiteById = useMemo(() => new Map((suite?.results ?? []).map((r) => [r.scenarioId, r])), [suite]);

  /* ---------------- live runs ---------------- */
  const runLive = (test: CustomTest) => {
    const sc = buildScenario(test, `custom-${machineId}`);
    memory.liveExpect[machineId] = test.expect;
    applyScenario(sc.id);
    setView("scenarios");
  };

  /* ---------------- headless runs ---------------- */
  const runTest = () => {
    setBusy("test");
    later(() => {
      const r = runCustomTest(draft);
      memory.test = r;
      setTestResult(r);
      setBusy(null);
    });
  };
  const runSweepNow = () => {
    setBusy("sweep");
    later(() => {
      const r = runSweep(draft);
      memory.sweep = r;
      setSweep(r);
      setBusy(null);
    });
  };
  const runSuite = async () => {
    const cases = suiteCases(saved);
    cancelSuite.current = false;
    const results: TestResult[] = [];
    setSuiteProgress({ done: 0, total: cases.length });
    for (const c of cases) {
      await new Promise((r) => window.setTimeout(r, 0));
      if (cancelSuite.current) return;
      const r = c.run();
      results.push({ ...r, scenarioId: c.id, name: c.name });
      setSuiteProgress({ done: results.length, total: cases.length });
    }
    const run = { results, at: Date.now(), total: cases.length };
    memory.suite = run;
    setSuite(run);
    setSuiteProgress(null);
  };

  /* ---------------- saved tests ---------------- */
  const saveDraft = () => {
    const exists = saved.some((t) => t.id === draft.id);
    const next = exists ? saved.map((t) => (t.id === draft.id ? draft : t)) : [...saved, draft];
    setSaved(next);
    storeSaved(next);
  };
  const deleteSaved = (id: string) => {
    const next = saved.filter((t) => t.id !== id);
    setSaved(next);
    storeSaved(next);
  };

  return (
    <div className="ast-root sim-page">
      {/* Playback */}
      <section className="ast-card sim-playback" aria-label="Playback">
        <div className="sim-playback-row">
          <div className="sim-clock">
            <span className="sim-live" data-paused={isPaused || undefined}>
              <i aria-hidden="true" />
              {isPaused ? "Paused" : "Live"}
            </span>
            <span className="sim-clock-value ast-num" title="Simulated plant clock">{clock}</span>
            <span className="ast-muted ast-num" title="Time since the scenario started">
              +{formatDuration(frame.scenarioMinute)} in scenario
            </span>
          </div>
          <div className="sim-controls">
            <PillNav
              items={[
                { id: "auto", label: "Autopilot" },
                { id: "manual", label: "Manual" },
              ]}
              activeId={autopilot ? "auto" : "manual"}
              onChange={(id) => setAutopilot(id === "auto")}
            />
            <span className="sim-sep" aria-hidden="true" />
            <PillNav
              items={SIM_SPEEDS.map((s) => ({ id: String(s.id), label: s.label }))}
              activeId={String(speedMultiplier)}
              onChange={(id) => setSpeedMultiplier(Number(id))}
            />
            <PillButton variant="secondary" onClick={() => advance(30)} title="Advance the plant 30 simulated minutes">
              +30 min
            </PillButton>
            <PillButton variant="secondary" onClick={() => advance(120)} title="Advance the plant 2 simulated hours">
              +2 h
            </PillButton>
            <PillButton variant="primary" onClick={() => setIsPaused(!isPaused)} aria-pressed={isPaused}>
              {isPaused ? "Resume" : "Pause"}
            </PillButton>
          </div>
        </div>
        <div className="sim-story" role="status" aria-live="polite">
          <span className="ast-chip" data-tone={PHASE_TONE[phase]}>
            <span className="ast-chip-dot" />
            <span className="sim-cap">{phase}</span>
          </span>
          <span>{storyLabel}</span>
          <span className="sim-health ast-num">
            Machine health <b>{Math.round(frame.overall)} %</b>
            <span className="ast-chip" data-tone={conditionTone}>
              <span className="ast-chip-dot" />
              {frame.condition}
            </span>
          </span>
        </div>
        {autopilot && (
          <div className="sim-profile">
            <span className="ast-caption">Keep this kiln</span>
            <PillNav items={PROFILES} activeId={profile} onChange={(id) => setProfile(id as StoryProfile)} />
          </div>
        )}
      </section>

      <PillNav items={VIEWS} activeId={view} onChange={setView} className="sim-views" />

      {view === "scenarios" && (
        <div className="sim-grid">
          <section className="ast-card" aria-label="Scenario library">
            <div className="ast-card-head">
              <h2 className="ast-card-title">
                Scenario library <span className="ast-muted ast-num">{scenarios.length}</span>
              </h2>
            </div>
            <p className="ast-caption sim-lead">
              Pick a scenario to run it live on {machineId}. It develops in simulated time, so use the speed and +2 h controls to
              watch it reach detection. Autopilot switches off while you drive.
            </p>
            {LIBRARY_GROUPS.map((g) => (
              <div key={g.id} className="sim-group">
                <div className="sim-group-head">
                  <span className="sim-group-title">{g.title}</span>
                  <span className="ast-caption">{g.note}</span>
                </div>
                <div className="sim-tiles">
                  {scenarios.filter(g.match).map((s) => {
                    const r = suiteById.get(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className="sim-tile"
                        aria-pressed={s.id === scenario.id}
                        onClick={() => applyScenario(s.id)}
                      >
                        <span className="sim-tile-meta ast-num">
                          {s.id === "healthy" ? "Reset" : s.group} · {s.expected.length ? s.expected.join(" / ") : "no alarm"}
                        </span>
                        <span className="sim-tile-name">{s.name}</span>
                        <span className="sim-tile-desc">{s.description}</span>
                        <span className="sim-tile-foot ast-num">
                          {s.id === scenario.id ? (
                            <span className="ast-chip" data-tone="info">
                              <span className="ast-chip-dot" />
                              Running
                            </span>
                          ) : (
                            <span className="ast-muted">D5 {s.documentedDetection}</span>
                          )}
                          {r && <ResultChip pass={r.pass} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          <div className="sim-side">
            <section className="ast-card" aria-label="Running scenario">
              <div className="ast-card-head">
                <h2 className="ast-card-title">Running scenario</h2>
                {scenario.id !== "healthy" && (
                  <PillButton variant="secondary" onClick={resetToHealthy}>
                    Reset to healthy
                  </PillButton>
                )}
              </div>
              <div className="sim-scn-name">{scenario.name}</div>
              <div className="ast-caption">{isCustom ? "Custom test · Test builder" : scenario.group}</div>
              <p className="sim-scn-desc">{scenario.description}</p>
              <div className="ast-caption ast-num">
                {isCustom
                  ? `Expected ${expectationLabel(memory.liveExpect[machineId] ?? "ANY").toLowerCase()}`
                  : `Expected ${scenario.expected.length ? scenario.expected.join(", ") : "no alarm"} · D5 Table 9.8 detection ${scenario.documentedDetection}`}
              </div>
            </section>

            <section className="ast-card" aria-label="Open findings">
              <div className="ast-card-head">
                <h2 className="ast-card-title">
                  Open findings <span className="ast-muted ast-num">{findings.length}</span>
                </h2>
              </div>
              {findings.length === 0 ? (
                <p className="ast-caption">
                  All signals follow the reference model · {p.evaluated} rules evaluated · ambient est.{" "}
                  <span className="ast-num">{frame.drivers.ambientEst.toFixed(1)} °C</span>
                </p>
              ) : (
                <ul className="sim-findings">
                  {findings.map((r) => (
                    <li key={r.id} className="sim-finding" data-tone={r.status === "ACTIVE" ? TONE[r.severity] : "idle"}>
                      <div className="sim-finding-head">
                        <span className="ast-chip-dot" />
                        <strong>
                          {r.id} {r.name}
                        </strong>
                      </div>
                      <div className="ast-caption ast-num">
                        {r.status === "ACTIVE"
                          ? `${r.severity} · ${r.priority} · ${r.confidence} % confidence${r.timeToLimit !== "—" ? ` · limit in ${r.timeToLimit}` : ""}`
                          : `Pending · persistence ${r.persistence}/${r.threshold}`}
                      </div>
                      <p className="sim-finding-evidence">{r.evidence}</p>
                      {r.status === "ACTIVE" && (
                        <>
                          <p className="ast-caption">{r.action}</p>
                          <div className="sim-finding-actions">
                            <PillButton variant="secondary" onClick={() => performAction(r.id, "acknowledge")}>
                              Acknowledge
                            </PillButton>
                            <PillButton variant="secondary" onClick={() => performAction(r.id, "mitigate")}>
                              Mitigate
                            </PillButton>
                            <PillButton variant="primary" onClick={() => performAction(r.id, "repair")}>
                              Repair
                            </PillButton>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="ast-card" aria-label="Analysis pipeline">
              <div className="ast-card-head">
                <h2 className="ast-card-title">Analysis pipeline</h2>
              </div>
              <dl className="sim-pipeline">
                {[
                  ["Valid", p.valid],
                  ["Suspect", p.suspect],
                  ["Invalid", p.invalid],
                  ["Beyond 3σ", p.beyond3s],
                  ["Rules evaluated", p.evaluated],
                  ["Matching", p.matching],
                  ["Pending", p.pending],
                  ["Confirmed", p.confirmed],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd className="ast-num">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      )}

      {view === "builder" && (
        <>
          <section className="ast-card" aria-label="Custom test builder">
            <div className="ast-card-head">
              <h2 className="ast-card-title">Custom test builder</h2>
              <PillButton variant="secondary" onClick={() => setDraft(freshTest())}>
                New test
              </PillButton>
            </div>
            <p className="ast-caption sim-lead">
              <b>Real change</b> alters the physical value, so every signal it drives follows (torque → winding, oil, bearings).{" "}
              <b>Sensor error</b> alters only the reading: nothing else moves, and sensor validation should catch it.
            </p>
            <Builder test={draft} onChange={setDraft} />
            <div className="sim-actions">
              <PillButton variant="primary" onClick={() => runLive(draft)} title={`Run on the live ${machineId} plant`}>
                Run live
              </PillButton>
              <PillButton variant="primary" onClick={runTest} disabled={busy !== null}>
                {busy === "test" ? "Running…" : "Run as test"}
              </PillButton>
              <PillButton variant="secondary" onClick={runSweepNow} disabled={busy !== null} title="Scale injection 1 from ¼× to 2× to find the detection limit">
                {busy === "sweep" ? "Sweeping…" : "Sensitivity sweep"}
              </PillButton>
              <PillButton variant="secondary" onClick={saveDraft}>
                {saved.some((t) => t.id === draft.id) ? "Update saved test" : "Save test"}
              </PillButton>
            </div>
          </section>

          {testResult && <TestResultCard result={testResult} />}
          {sweep && <SweepCard sweep={sweep} />}

          <section className="ast-card sim-table-card" aria-label="Saved tests">
            <div className="ast-card-head sim-card-head">
              <h2 className="ast-card-title">
                Saved tests <span className="ast-muted ast-num">{saved.length}</span>
              </h2>
            </div>
            {saved.length === 0 ? (
              <p className="ast-caption sim-empty">None yet. Build a test and press Save; saved tests join the validation suite.</p>
            ) : (
              <Table
                className="ast-table"
                columns={savedColumns(
                  (t) => setDraft({ ...t, injections: t.injections.map((i) => ({ ...i })) }),
                  runLive,
                  deleteSaved,
                )}
                data={saved}
                keyExtractor={(t) => t.id}
                selectedId={draft.id}
              />
            )}
          </section>
        </>
      )}

      {view === "suite" && (
        <section className="ast-card" aria-label="Validation suite">
          <div className="ast-card-head">
            <h2 className="ast-card-title">Validation suite</h2>
            <PillButton variant="primary" onClick={runSuite} disabled={suiteProgress !== null}>
              {suiteProgress ? `Running ${suiteProgress.done}/${suiteProgress.total}…` : suite ? "Run again" : "Run validation suite"}
            </PillButton>
          </div>
          <p className="ast-caption sim-lead">
            {scenarios.length - 1} library scenarios of D5 Table 9.8 plus {saved.length} saved test{saved.length === 1 ? "" : "s"}, each run
            headless from a healthy plant. Scores detection by the expected rule, false alarms and lead time before a danger limit.
            The live plant keeps running untouched.
          </p>
          {suiteProgress && (
            <div className="sim-progress" role="progressbar" aria-valuemin={0} aria-valuemax={suiteProgress.total} aria-valuenow={suiteProgress.done}>
              <i style={{ width: `${(suiteProgress.done / suiteProgress.total) * 100}%` }} />
            </div>
          )}
          {suite ? <SuiteResults run={suite} /> : !suiteProgress && <p className="ast-caption">Not run yet.</p>}
        </section>
      )}

      {view === "events" && (
        <section className="ast-card sim-table-card" aria-label="Event log">
          <div className="ast-card-head sim-card-head">
            <h2 className="ast-card-title">
              Event log <span className="ast-muted">latest {Math.min(EVENT_LIMIT, frame.events.length)}</span>
            </h2>
          </div>
          {frame.events.length === 0 ? (
            <p className="ast-caption sim-empty">No events yet.</p>
          ) : (
            <Table
              className="ast-table"
              columns={eventColumns}
              data={frame.events.slice(0, EVENT_LIMIT).map((e, i) => ({ ...e, key: `${e.t}-${frame.events.length - i}` }))}
              keyExtractor={(e) => e.key}
            />
          )}
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Builder                                                             */
/* ------------------------------------------------------------------ */

function Builder({ test, onChange }: { test: CustomTest; onChange: (t: CustomTest) => void }) {
  const setRow = (i: number, patch: Partial<Injection>) => {
    const row = { ...test.injections[i], ...patch };
    if (patch.target && patch.target !== test.injections[i].target) row.magnitude = defaultMagnitude(patch.target);
    onChange({ ...test, injections: test.injections.map((r, j) => (j === i ? normaliseInjection(row) : r)) });
  };
  const addRow = () =>
    onChange({
      ...test,
      injections: [...test.injections, { target: "GAS-KLN-01", mode: "real", shape: "ramp", magnitude: defaultMagnitude("GAS-KLN-01"), onsetMin: 0, durationMin: 60 }],
    });
  const removeRow = (i: number) => onChange({ ...test, injections: test.injections.filter((_, j) => j !== i) });

  return (
    <div className="sim-builder">
      <div className="sim-inj-head" aria-hidden="true">
        <span>Signal</span>
        <span>Type</span>
        <span>Shape</span>
        <span>Magnitude</span>
        <span>Onset (min)</span>
        <span>Duration (min)</span>
        <span />
      </div>
      {test.injections.map((r, i) => {
        const driver = isDriver(r.target);
        return (
          <div key={i} className="sim-inj" role="group" aria-label={`Injection ${i + 1}`}>
            <NativeSelect label="Signal" value={r.target} onChange={(v) => setRow(i, { target: v })}>
              <optgroup label="Operating driver">
                {DRIVERS.map((d) => (
                  <option key={d.id} value={d.id}>
                    AMB · {d.label} (real change only)
                  </option>
                ))}
              </optgroup>
              {INJECTABLE.filter((g) => g.signals.length).map((g) => (
                <optgroup key={g.system.id} label={`${g.system.id} ${g.system.name}`}>
                  {g.signals.map((s) => (
                    <option key={s.tag} value={s.tag}>
                      {s.tag} · {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
            <NativeSelect label="Type" value={r.mode} onChange={(v) => setRow(i, { mode: v as Injection["mode"] })}>
              <option value="real">Real change</option>
              {!driver && <option value="sensor">Sensor error</option>}
            </NativeSelect>
            <NativeSelect label="Shape" value={r.shape} onChange={(v) => setRow(i, { shape: v as Injection["shape"] })}>
              {SHAPES.filter((s) => r.mode === "sensor" || !s.sensorOnly).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
            <label className="sim-num">
              <span className="sim-sr">Magnitude</span>
              <NumberCell value={r.magnitude} disabled={r.shape === "stuck"} onChange={(v) => setRow(i, { magnitude: v })} />
              <span className="ast-muted">{targetUnit(r.target)}</span>
            </label>
            <label className="sim-num">
              <span className="sim-sr">Onset in minutes</span>
              <NumberCell value={r.onsetMin} min={0} onChange={(v) => setRow(i, { onsetMin: v })} />
            </label>
            <label className="sim-num">
              <span className="sim-sr">Duration in minutes</span>
              <NumberCell value={r.durationMin} min={1} disabled={r.shape === "step" || r.shape === "stuck"} onChange={(v) => setRow(i, { durationMin: v })} />
            </label>
            {test.injections.length > 1 ? (
              <button type="button" className="sim-icon-btn" aria-label={`Remove injection ${i + 1}`} onClick={() => removeRow(i)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            ) : (
              <span />
            )}
          </div>
        );
      })}
      <div className="sim-builder-foot">
        {test.injections.length < MAX_INJECTIONS && (
          <PillButton variant="secondary" onClick={addRow}>
            + Add injection
          </PillButton>
        )}
        <label className="sim-inline">
          <span className="ast-caption">Expected</span>
          <NativeSelect label="Expected result" value={test.expect} onChange={(v) => onChange({ ...test, expect: v })}>
            {EXPECTATIONS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="sim-inline">
          <span className="ast-caption">Name</span>
          <input className="ui-input sim-name" value={test.name} onChange={(e) => onChange({ ...test, name: e.target.value })} spellCheck={false} />
        </label>
      </div>
    </div>
  );
}

function NativeSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <span className="ui-select">
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </span>
  );
}

/** Numbers are edited as text so a half-typed "-" or "1." survives; committed when parseable. */
function NumberCell({ value, onChange, min, disabled }: { value: number; onChange: (v: number) => void; min?: number; disabled?: boolean }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText((t) => (Number(t) === value ? t : String(value))), [value]);
  return (
    <input
      className="ui-input ast-num"
      type="number"
      inputMode="decimal"
      step="any"
      min={min}
      value={text}
      disabled={disabled}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isFinite(n)) onChange(n);
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

function ResultChip({ pass }: { pass: boolean }) {
  return (
    <span className="ast-chip" data-tone={pass ? "good" : "bad"}>
      <span className="ast-chip-dot" />
      {pass ? "Pass" : "Fail"}
    </span>
  );
}

function Kpi({ label, value, note, tone }: { label: string; value: React.ReactNode; note: string; tone?: "good" | "bad" }) {
  return (
    <div className="sim-kpi" data-tone={tone}>
      <dt>{label}</dt>
      <dd className="ast-num">{value}</dd>
      <span className="ast-caption">{note}</span>
    </div>
  );
}

function TestResultCard({ result: r }: { result: TestResult }) {
  return (
    <section className="ast-card" aria-label="Test result">
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          Test result <span className="ast-muted">{r.name}</span>
        </h2>
        <span className="ast-caption ast-num">{fmtMin(r.ranMin)} simulated, headless</span>
      </div>
      <dl className="sim-kpis">
        <Kpi label="Result" value={r.pass ? "Pass" : "Fail"} tone={r.pass ? "good" : "bad"} note={`Expected: ${r.expectLabel.toLowerCase()}`} />
        <Kpi
          label="First detection"
          value={r.detectedAfter !== null ? `+${fmtMin(r.detectedAfter)}` : r.kind !== "fault" && r.fired.length === 0 ? "Quiet" : "—"}
          note="After onset, simulated time"
        />
        <Kpi label="Findings raised" value={r.fired.length} note={r.unexpected.length ? `Unexpected: ${r.unexpected.join(", ")}` : "No unexpected findings"} />
        <Kpi label="Signals affected" value={r.affected.length} note="Held beyond 3σ of the model" />
      </dl>
      <div className="sim-split">
        <div>
          <h3 className="sim-sub">What the analysis layer concluded</h3>
          {r.fired.length === 0 ? (
            <p className="ast-caption">No finding raised.</p>
          ) : (
            <Table
              className="ast-table"
              columns={firedColumns}
              data={r.fired}
              keyExtractor={(f) => f.id}
            />
          )}
        </div>
        <div>
          <h3 className="sim-sub">How the change propagated</h3>
          {r.affected.length === 0 ? (
            <p className="ast-caption">No signal left the model band.</p>
          ) : (
            <Table className="ast-table" columns={affectedColumns} data={r.affected} keyExtractor={(a) => a.tag} />
          )}
          <p className="ast-caption sim-foot-note">
            Sensor errors stay in the injected signal (and any value calculated from it). Real changes travel along the D5
            cause-and-effect links and are compensated wherever the model explains them.
          </p>
        </div>
      </div>
    </section>
  );
}

const firedColumns: Column<TestResult["fired"][number]>[] = [
  {
    key: "rule",
    header: "Finding",
    render: (f) => (
      <span className="ast-cell-stack">
        <span className="ast-cell-title">{f.name}</span>
        <span className="ast-cell-sub ast-num">{f.id}</span>
      </span>
    ),
  },
  {
    key: "sev",
    header: "Severity",
    width: "110px",
    render: (f) => (
      <span className="ast-chip" data-tone={TONE[f.severity as Severity] ?? "warn"}>
        <span className="ast-chip-dot" />
        {f.severity}
      </span>
    ),
  },
  { key: "t", header: "Confirmed", width: "96px", render: (f) => <span className="ast-num">+{fmtMin(f.t)}</span> },
  { key: "c", header: "Conf.", width: "64px", render: (f) => <span className="ast-num">{f.confidence} %</span> },
];

const affectedColumns: Column<TestResult["affected"][number]>[] = [
  { key: "tag", header: "Signal", width: "112px", render: (a) => <span className="ast-num ast-cell-title">{a.tag}</span> },
  {
    key: "path",
    header: "Path from the injection",
    render: (a) => <span className="ast-num sim-path">{a.path ? a.path.join(" → ") : <span className="ast-muted">Not linked to the injection</span>}</span>,
  },
  { key: "z", header: "Peak", width: "72px", render: (a) => <span className="ast-num">{a.z.toFixed(1)}σ</span> },
];

function SweepCard({ sweep }: { sweep: { points: SweepPoint[]; unit: string; smallest: number | null } }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = 200;
  const padL = 44;
  const padB = 30;
  const padT = 30;
  // Axis top: a round number just above the slowest detection, so short detections stay readable.
  const slowest = Math.max(1, ...sweep.points.map((p) => p.detectedAfter ?? 0));
  const step = [1, 2, 5, 10, 15, 30, 60, 120, 240].find((s) => s * 2 >= slowest * 1.1) ?? 480;
  const maxT = step * 2;
  const slot = (W - padL - 12) / sweep.points.length;
  const x = (i: number) => padL + slot * i + slot / 2;
  const y = (t: number) => H - padB - (t / maxT) * (H - padB - padT);
  const ticks = [0, step, maxT];

  return (
    <section className="ast-card" aria-label="Sensitivity sweep">
      <div className="ast-card-head">
        <h2 className="ast-card-title">Sensitivity sweep</h2>
        <span className="ast-caption ast-num">
          {sweep.smallest !== null ? `Smallest detected change ${+sweep.smallest.toPrecision(3)} ${sweep.unit}` : "Not detected at any tested magnitude"}
        </span>
      </div>
      <div className="sim-split">
        <div className="sim-chart">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Detection time against magnitude of injection 1, in ${sweep.unit}`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={W - 8} y1={y(t)} y2={y(t)} className="sim-grid-line" />
                <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="sim-axis">
                  {t}
                </text>
              </g>
            ))}
            <text x={0} y={11} className="sim-axis">
              Detection time (simulated min)
            </text>
            {sweep.points.map((p, i) => {
              const bw = Math.min(36, slot * 0.55);
              const detected = p.detectedAfter !== null;
              const top = detected ? y(Math.max(p.detectedAfter!, maxT * 0.01)) : H - padB;
              return (
                <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <rect x={x(i) - slot / 2} y={padT} width={slot} height={H - padB - padT} fill="transparent" />
                  {detected ? (
                    <path
                      d={`M${x(i) - bw / 2},${H - padB} V${top + 4} q0,-4 4,-4 H${x(i) + bw / 2 - 4} q4,0 4,4 V${H - padB} Z`}
                      className="sim-bar"
                      data-active={hover === i || undefined}
                    />
                  ) : (
                    <text x={x(i)} y={H - padB - 8} textAnchor="middle" className="sim-miss">
                      Not detected
                    </text>
                  )}
                  {detected && (hover === i || sweep.points.length <= 6) && (
                    <text x={x(i)} y={top - 6} textAnchor="middle" className="sim-bar-label">
                      {fmtMin(p.detectedAfter)}
                    </text>
                  )}
                  <text x={x(i)} y={H - 10} textAnchor="middle" className="sim-axis">
                    {+p.magnitude.toPrecision(3)}
                  </text>
                </g>
              );
            })}
            <line x1={padL} x2={W - 8} y1={H - padB} y2={H - padB} className="sim-base-line" />
          </svg>
          <div className="ast-caption sim-chart-x">Magnitude of injection 1 ({sweep.unit})</div>
        </div>
        <Table className="ast-table" columns={sweepColumns(sweep.unit)} data={sweep.points} keyExtractor={(p) => String(p.magnitude)} />
      </div>
    </section>
  );
}

const sweepColumns = (unit: string): Column<SweepPoint>[] => [
  { key: "m", header: "Magnitude", width: "110px", render: (p) => <span className="ast-num">{+p.magnitude.toPrecision(3)} {unit}</span> },
  {
    key: "d",
    header: "Detected after",
    width: "120px",
    render: (p) => (p.detectedAfter !== null ? <span className="ast-num">+{fmtMin(p.detectedAfter)}</span> : <span className="ast-muted">Not detected</span>),
  },
  { key: "f", header: "Finding", render: (p) => (p.finding ? <span>{p.finding}</span> : <span className="ast-muted">—</span>) },
];

function SuiteResults({ run }: { run: SuiteRun }) {
  const s = summariseSuite(run.results);
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)} %`);
  return (
    <>
      <dl className="sim-kpis">
        <Kpi label="Fault detection" value={pct(s.detection)} tone={s.detection === 1 ? "good" : s.detection !== null ? "bad" : undefined} note="Found by the expected rule" />
        <Kpi label="No-false-alarm cases" value={pct(s.noFalseAlarm)} tone={s.noFalseAlarm === 1 ? "good" : s.noFalseAlarm !== null ? "bad" : undefined} note="Ambient, load and feed stay quiet" />
        <Kpi label="Mean lead time" value={fmtMin(s.meanLead)} note="Detection before a danger limit" />
        <Kpi
          label="Result"
          value={`${s.passed}/${s.total}`}
          tone={s.passed === s.total ? "good" : "bad"}
          note={`Run at ${new Date(run.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
        />
      </dl>
      <div className="sim-flush">
        <Table className="ast-table" columns={suiteColumns} data={run.results} keyExtractor={(r) => r.scenarioId} />
      </div>
    </>
  );
}

const suiteColumns: Column<TestResult>[] = [
  {
    key: "name",
    header: "Scenario",
    render: (r) => (
      <span className="ast-cell-stack sim-wrap">
        <span className="ast-cell-title">{r.name}</span>
        <span className="ast-cell-sub">{r.kind === "custom" ? "Saved test" : r.kind === "quiet" ? "No-fault test" : "Fault"}</span>
      </span>
    ),
  },
  { key: "exp", header: "Expected", render: (r) => <span className="ast-num">{r.expectLabel}</span> },
  {
    key: "det",
    header: "Detected after",
    render: (r) => (r.detectedAfter !== null ? <span className="ast-num">+{fmtMin(r.detectedAfter)}</span> : <span className="ast-muted">—</span>),
  },
  { key: "conf", header: "Conf.", render: (r) => <span className="ast-num">{r.detectedConfidence !== null ? `${r.detectedConfidence} %` : "—"}</span> },
  {
    key: "danger",
    header: "Danger reached",
    render: (r) => (r.dangerAt !== null ? <span className="ast-num">+{fmtMin(r.dangerAt)}</span> : <span className="ast-muted">Not reached</span>),
  },
  { key: "lead", header: "Lead", render: (r) => <span className="ast-num">{r.leadMin !== null && r.leadMin > 0 ? fmtMin(r.leadMin) : "—"}</span> },
  {
    key: "extra",
    header: "Unexpected",
    render: (r) => (r.unexpected.length ? <span className="ast-num sim-bad">{r.unexpected.join(", ")}</span> : <span className="ast-muted">None</span>),
  },
  { key: "res", header: "Result", width: "88px", render: (r) => <ResultChip pass={r.pass} /> },
];

function savedColumns(onLoad: (t: CustomTest) => void, onLive: (t: CustomTest) => void, onDelete: (id: string) => void): Column<CustomTest>[] {
  return [
    {
      key: "name",
      header: "Test",
      render: (t) => (
        <span className="ast-cell-stack sim-wrap">
          <span className="ast-cell-title">{t.name}</span>
          <span className="ast-cell-sub ast-num">{t.injections.map(describeInjection).join(" + ")}</span>
        </span>
      ),
    },
    { key: "exp", header: "Expected", render: (t) => <span>{expectationLabel(t.expect)}</span> },
    {
      key: "act",
      header: "",
      width: "260px",
      render: (t) => (
        <span className="sim-row-actions">
          <PillButton variant="secondary" onClick={() => onLoad(t)}>
            Edit
          </PillButton>
          <PillButton variant="secondary" onClick={() => onLive(t)}>
            Run live
          </PillButton>
          <PillButton variant="secondary" onClick={() => onDelete(t.id)} aria-label={`Delete ${t.name}`}>
            Delete
          </PillButton>
        </span>
      ),
    },
  ];
}

const eventColumns: Column<SimEvent & { key: string }>[] = [
  { key: "clock", header: "Time", width: "96px", render: (e) => <span className="ast-num">{e.clock}</span> },
  {
    key: "kind",
    header: "Type",
    width: "110px",
    render: (e) => (
      <span className="ast-chip" data-tone={e.kind === "action" ? "info" : TONE[e.severity]}>
        <span className="ast-chip-dot" />
        {e.kind === "rule" ? "Finding" : e.kind[0].toUpperCase() + e.kind.slice(1)}
      </span>
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
