"use client";

import React, { useMemo, useState } from "react";
import { Field, KpiCard, KpiCards, NumberInput, PillButton, Select, Sparkline, Table, Toggle, type Column } from "@/components/ui";
import { conditionTone, toCondition } from "@/components/ui/status";
import { StatusTag } from "@/components/ui/status-tag";
import { useKilnFleet } from "@/providers/kiln-simulation-context";
import { formatClock, type SimFrame, type StoryProfile } from "@/lib/kiln-sim/engine";
import { PYRO_SCENARIOS, pyroScenario } from "@/lib/pyro-sim/scenarios";
import { PYRO_MACHINES, PYRO_SIGNALS } from "@/lib/pyro-sim/signals";
import type { Injection, LineSimSettings, SignalFaultSpec } from "@/lib/pyro-sim/engine";
import type { KilnSimulation } from "./kiln-seals-simulation";

/**
 * Simulation › Control (pyro line): the plant-wide demo layer.
 *
 * KPI strip → quick actions → event generator and sensor knobs → machines →
 * running events → signal fault builder. Every control moves signals only;
 * the alerts the pages show still come from the rules judging them.
 */

type Line = NonNullable<KilnSimulation["line"]>;

const MACHINE = new Map(PYRO_MACHINES.map((m) => [m.id, m]));
const code = (id: string) => MACHINE.get(id)?.code ?? id;

const PROFILE_OPTIONS: Array<{ value: StoryProfile; label: string }> = [
  { value: "healthy", label: "Normal" },
  { value: "advisory", label: "Advisory" },
  { value: "critical", label: "Critical" },
  { value: "story", label: "Rotate faults" },
];

const SHAPES: Array<{ value: SignalFaultSpec["shape"]; label: string }> = [
  { value: "step", label: "Offset (step)" },
  { value: "ramp", label: "Ramp to value" },
  { value: "drift", label: "Drift (keeps growing)" },
  { value: "osc", label: "Oscillation" },
  { value: "spike", label: "Spike" },
  { value: "noise", label: "Erratic noise" },
  { value: "freeze", label: "Frozen reading" },
];

const KIND_LABEL: Record<Injection["kind"], string> = { sensor: "Instrument", fault: "Equipment", trip: "Trip", custom: "Custom" };

/** Alerts confirmed in the last `window` simulated minutes across the line. */
function recentAlerts(frames: SimFrame[], t: number, window: number): number {
  let n = 0;
  for (const f of frames) for (const e of f.events) if (e.kind === "rule" && e.severity !== "Normal" && e.title.endsWith(" confirmed") && e.t > t - window) n++;
  return n;
}

const activeRules = (f: SimFrame) => f.rules.filter((r) => r.status === "ACTIVE" && r.category !== "Service life");

export function SimulationControl({ simulation, line }: { simulation: KilnSimulation; line: Line }) {
  const fleet = useKilnFleet();
  const machines = useMemo(() => PYRO_MACHINES.map((m) => fleet[m.id]).filter(Boolean) as KilnSimulation[], [fleet]);
  const frames = machines.map((m) => m.frame);
  const speed = simulation.speedMultiplier;
  const t = line.t;
  const running = line.events.filter((j) => t < j.end);

  const scores = frames.map((f) => f.overall);
  const plantHealth = scores.length ? Math.round(0.6 * Math.min(...scores) + 0.4 * (scores.reduce((a, b) => a + b, 0) / scores.length)) : 0;
  const active = frames.flatMap(activeRules);
  const critical = active.filter((r) => r.severity === "Critical").length;
  const last10 = recentAlerts(frames, t, 10);

  return (
    <>
      <KpiCards label="Live plant">
        <KpiCard label="Alerts raised" value={String(last10)} unit="/ 10 min" foot={last10 ? `≈ 1 every ${+(10 / last10 / speed).toFixed(1)} s on screen at ${speed}×` : "None in the last 10 min"} />
        <KpiCard label="Active alerts" value={String(active.length)} tone={critical ? "bad" : active.length ? "warn" : undefined} foot={`${critical} critical`} />
        <KpiCard label="Events running" value={String(running.length)} foot={line.settings.events ? `Generator on · max ${line.settings.maxEvents}` : "Generator off"} />
        <KpiCard label="Plant health" value={String(plantHealth)} unit="/ 100" tone={plantHealth < 60 ? "bad" : plantHealth < 85 ? "warn" : undefined} foot="0.6 × worst + 0.4 × mean" />
      </KpiCards>

      <QuickActions line={line} machines={machines} />
      <GeneratorCard line={line} speed={speed} />
      <MachinesCard line={line} machines={machines} running={running} />
      <EventsCard line={line} running={running} fleet={fleet} />
      <SignalFaultCard line={line} machines={machines} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Quick actions                                                       */
/* ------------------------------------------------------------------ */

function QuickActions({ line, machines }: { line: Line; machines: KilnSimulation[] }) {
  const [machine, setMachine] = useState(machines[0]?.machineId ?? "PYR-KLN-01");
  const scenarios = (PYRO_SCENARIOS[machine] ?? []).filter((s) => s.id !== "healthy");
  const [scenarioId, setScenarioId] = useState("");
  const picked = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];
  const groups = [...new Set(scenarios.map((s) => (s.id.startsWith("line-") ? "Line trips & upsets" : s.group)))];

  return (
    <section className="ast-card simc-card" aria-label="Quick actions">
      <div className="ast-card-head sim-card-head-row">
        <h2 className="ast-card-title">Quick actions</h2>
        <span className="ast-caption">Faults move the signals; the rules raise the alerts</span>
      </div>
      <div className="simc-actions">
        <div className="simc-action-group" role="group" aria-label="Raise events">
          <span className="simc-group-label">Raise now</span>
          <PillButton variant="secondary" onClick={() => line.raise("sensor")}>Instrument fault</PillButton>
          <PillButton variant="secondary" onClick={() => line.raise("fault")}>Equipment fault</PillButton>
          <PillButton variant="secondary" onClick={() => line.burst(5)}>Burst × 5</PillButton>
        </div>
        <div className="simc-action-group" role="group" aria-label="Hold every machine">
          <span className="simc-group-label">Whole line</span>
          <PillButton variant="secondary" onClick={() => line.setAllProfiles("healthy")}>All Normal</PillButton>
          <PillButton variant="secondary" onClick={() => line.restoreMix()}>Demo mix</PillButton>
          <PillButton variant="secondary" onClick={() => line.setAllProfiles("critical")}>All Critical</PillButton>
          <PillButton variant="secondary" onClick={() => line.repairAll()}>Repair all</PillButton>
          <PillButton variant="secondary" onClick={() => line.clearAll()} disabled={!line.events.some((j) => j.end > line.t)}>
            Clear events
          </PillButton>
        </div>
      </div>
      <div className="simc-trigger">
        <Field label="Machine">
          {(id) => (
            <Select
              id={id}
              value={machine}
              onChange={(v) => {
                setMachine(v);
                setScenarioId("");
              }}
              options={machines.map((m) => ({ value: m.machineId, label: `${code(m.machineId)} · ${MACHINE.get(m.machineId)?.shortName ?? ""}` }))}
            />
          )}
        </Field>
        <Field label="Scenario" hint={picked ? `Expected ${picked.expected.join(", ") || "no alarm"}${picked.expectedElsewhere?.length ? ` · also ${picked.expectedElsewhere.join(", ")}` : ""}` : undefined}>
          {(id, d) => (
            <Select
              id={id}
              describedBy={d}
              value={picked?.id ?? ""}
              onChange={setScenarioId}
              options={groups.flatMap((g) =>
                scenarios
                  .filter((s) => (s.id.startsWith("line-") ? "Line trips & upsets" : s.group) === g)
                  .map((s) => ({ value: s.id, label: `${g} · ${s.name}` })),
              )}
            />
          )}
        </Field>
        <PillButton variant="primary" onClick={() => picked && line.inject(machine, picked.id)} disabled={!picked}>
          Trigger
        </PillButton>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Generator and sensor knobs                                          */
/* ------------------------------------------------------------------ */

function Knob({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="simc-knob" data-disabled={disabled || undefined}>
      <span className="simc-knob-head">
        <span className="simc-knob-label">{label}</span>
        <span className="simc-knob-value ast-num">{display}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function GeneratorCard({ line, speed }: { line: Line; speed: number }) {
  const s = line.settings;
  const set = (patch: Partial<LineSimSettings>) => line.setSettings(patch);
  /** Plant minutes, and what they take on screen at the current speed. */
  const live = (min: number) => `${min} min · ${+(min / speed).toFixed(1)} s`;
  const off = !s.events;
  return (
    <section className="ast-card simc-card" aria-label="Event generator and sensors">
      <div className="ast-card-head sim-card-head-row">
        <div className="sim-card-head-text">
          <h2 className="ast-card-title">Event generator &amp; sensors</h2>
          <span className="ast-caption ast-num">
            {s.events ? `Next event ${Math.max(0, line.nextEventAt - line.t)} min · plant minutes, seconds on screen at ${speed}×` : "Generator off: only held faults and your triggers run"}
          </span>
        </div>
        <div className="sim-actions">
          <Toggle checked={s.events} onChange={(v) => set({ events: v })} label="Generator" />
          <PillButton variant="secondary" onClick={() => line.resetSettings()}>
            Defaults
          </PillButton>
        </div>
      </div>
      <div className="simc-knobs">
        <Knob label="New event every" value={s.eventEvery} min={1} max={30} step={1} display={live(s.eventEvery)} onChange={(v) => set({ eventEvery: v })} disabled={off} />
        <Knob label="Time to alert" value={s.eventLead} min={1} max={30} step={1} display={live(s.eventLead)} onChange={(v) => set({ eventLead: v })} disabled={off} />
        <Knob label="Event lasts" value={s.eventLife} min={2} max={90} step={1} display={live(s.eventLife)} onChange={(v) => set({ eventLife: v })} disabled={off} />
        <Knob label="Concurrent events" value={s.maxEvents} min={1} max={12} step={1} display={`max ${s.maxEvents}`} onChange={(v) => set({ maxEvents: v })} disabled={off} />
        <Knob label="Instrument faults" value={Math.round(s.sensorShare * 100)} min={0} max={100} step={5} display={`${Math.round(s.sensorShare * 100)} %`} onChange={(v) => set({ sensorShare: v / 100 })} disabled={off} />
        <Knob label="Event severity" value={s.intensity} min={0.5} max={2} step={0.1} display={`× ${s.intensity.toFixed(1)}`} onChange={(v) => set({ intensity: v })} />
        <Knob label="Sensor noise" value={s.noise} min={0.2} max={3} step={0.1} display={`× ${s.noise.toFixed(1)} σ`} onChange={(v) => set({ noise: v })} />
        <Knob label="Health response" value={s.healthDrift} min={0} max={3} step={0.1} display={s.healthDrift ? `× ${s.healthDrift.toFixed(1)}` : "Off"} onChange={(v) => set({ healthDrift: v })} />
        <Knob
          label="Held fault repaired after"
          value={s.holdMinutes}
          min={0}
          max={600}
          step={10}
          display={s.holdMinutes ? live(s.holdMinutes) : "Never"}
          onChange={(v) => set({ holdMinutes: v })}
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Machines                                                            */
/* ------------------------------------------------------------------ */

function MachinesCard({ line, machines, running }: { line: Line; machines: KilnSimulation[]; running: Injection[] }) {
  const columns: Column<KilnSimulation>[] = [
    {
      key: "machine",
      header: "Machine",
      render: (m) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title ast-num">{code(m.machineId)}</span>
          <span className="ast-cell-sub">{MACHINE.get(m.machineId)?.shortName}</span>
        </span>
      ),
    },
    {
      key: "health",
      header: "Health",
      width: "200px",
      render: (m) => (
        <span className="simc-health">
          <span className="ast-num simc-health-value">{Math.round(m.frame.overall)}</span>
          <span className="simc-spark">
            <Sparkline values={m.frame.healthHistory.overall.slice(-60)} unit="" height={24} digits={0} tone={conditionTone(m.frame.condition)} ariaLabel={`${m.machineId} health, last 60 min`} />
          </span>
        </span>
      ),
    },
    { key: "cond", header: "Condition", width: "110px", render: (m) => <StatusTag tone={conditionTone(m.frame.condition)} label={toCondition(m.frame.condition)} /> },
    { key: "alerts", header: "Alerts", width: "64px", render: (m) => <span className="ast-num">{activeRules(m.frame).length}</span> },
    { key: "events", header: "Events", width: "64px", render: (m) => <span className="ast-num">{running.filter((j) => j.machine === m.machineId).length}</span> },
    {
      key: "hold",
      header: "Held at",
      width: "150px",
      render: (m) => (
        <span className="ui-select simc-inline-select">
          <select
            aria-label={`${m.machineId} hold profile`}
            value={m.autopilot ? m.profile : "manual"}
            onChange={(e) => {
              if (!m.autopilot) m.setAutopilot(true);
              m.setProfile(e.target.value as StoryProfile);
            }}
          >
            {!m.autopilot && <option value="manual">Manual</option>}
            {PROFILE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </span>
      ),
    },
    {
      key: "gen",
      header: "Generator",
      width: "96px",
      render: (m) => {
        const on = line.settings.machines[m.machineId] !== false;
        return (
          <PillButton variant="secondary" pressed={on} className="simc-pill-sm" onClick={() => line.setSettings({ machines: { [m.machineId]: !on } })} aria-label={`Generator events on ${m.machineId}`}>
            {on ? "On" : "Off"}
          </PillButton>
        );
      },
    },
    {
      key: "act",
      header: "",
      width: "190px",
      render: (m) => (
        <span className="sim-row-actions">
          <PillButton variant="secondary" className="simc-pill-sm" onClick={() => line.raise("fault", m.machineId)}>
            Fault
          </PillButton>
          <PillButton variant="secondary" className="simc-pill-sm" onClick={() => line.raise("sensor", m.machineId)}>
            Sensor
          </PillButton>
        </span>
      ),
    },
  ];
  return (
    <section className="ast-card sim-table-card" aria-label="Machines">
      <div className="ast-card-head sim-card-head sim-card-head-row">
        <h2 className="ast-card-title">
          Machines <span className="ast-muted ast-num">{machines.length}</span>
        </h2>
        <span className="ast-caption">Held at: the condition autopilot keeps each machine in between generated events</span>
      </div>
      <Table className="ast-table simc-machines" columns={columns} data={machines} keyExtractor={(m) => m.machineId} />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Running events                                                      */
/* ------------------------------------------------------------------ */

function stageOf(j: Injection, t: number): { label: string; tone: "info" | "warn" | "idle" } {
  if (t >= j.end) return { label: "Easing off", tone: "idle" };
  if (Number.isFinite(j.target) && (t - j.start) * j.pace < j.target) return { label: "Developing", tone: "info" };
  return { label: "Holding", tone: "warn" };
}

function EventsCard({ line, running, fleet }: { line: Line; running: Injection[]; fleet: Record<string, KilnSimulation> }) {
  const t = line.t;
  const rows = [...line.events].sort((a, b) => b.start - a.start);
  const columns: Column<Injection>[] = [
    { key: "at", header: "Started", width: "96px", render: (j) => <span className="ast-num">{formatClock(j.start).clock}</span> },
    { key: "m", header: "Machine", width: "84px", render: (j) => <span className="ast-num">{code(j.machine)}</span> },
    {
      key: "ev",
      header: "Event",
      render: (j) => (
        <span className="ast-cell-stack sim-wrap">
          <span className="ast-cell-title">{j.name}</span>
          <span className="ast-cell-sub">
            {KIND_LABEL[j.kind]} · {j.auto ? "Generator" : "Operator"}
          </span>
        </span>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      width: "116px",
      render: (j) => {
        const s = stageOf(j, t);
        return <StatusTag tone={s.tone} label={s.label} />;
      },
    },
    {
      key: "alert",
      header: "Alert",
      width: "170px",
      render: (j) => {
        const expected = pyroScenario(j.machine, j.scenarioId).expected;
        const f = fleet[j.machine]?.frame;
        const raised = f ? activeRules(f).filter((r) => expected.includes(r.id)) : [];
        if (!expected.length) {
          const any = f ? activeRules(f).length : 0;
          return <span className="ast-muted ast-num">{any ? `${any} active on machine` : "None expected"}</span>;
        }
        return raised.length ? (
          <StatusTag tone={raised.some((r) => r.severity === "Critical") ? "bad" : "warn"} label={raised.map((r) => r.id).join(", ")} />
        ) : (
          <span className="ast-muted ast-num">{expected.join(", ")} pending</span>
        );
      },
    },
    {
      key: "x",
      header: "",
      width: "84px",
      render: (j) =>
        t < j.end ? (
          <PillButton variant="secondary" className="simc-pill-sm" onClick={() => line.clear(j.id)} aria-label={`Clear ${j.name}`}>
            Clear
          </PillButton>
        ) : null,
    },
  ];
  return (
    <section className="ast-card sim-table-card" aria-label="Running events">
      <div className="ast-card-head sim-card-head sim-card-head-row">
        <h2 className="ast-card-title">
          Events <span className="ast-muted ast-num">{running.length} running</span>
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className="ast-caption sim-empty">No event running. Raise one above, or switch the generator on.</p>
      ) : (
        <Table className="ast-table" columns={columns} data={rows} keyExtractor={(j) => String(j.id)} />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Signal fault builder                                                */
/* ------------------------------------------------------------------ */

function SignalFaultCard({ line, machines }: { line: Line; machines: KilnSimulation[] }) {
  const [machine, setMachine] = useState(machines[0]?.machineId ?? "PYR-KLN-01");
  const signals = useMemo(() => PYRO_SIGNALS.filter((d) => d.machine === machine && d.type === "analog" && !d.calculated && d.origin === "online"), [machine]);
  const [tag, setTag] = useState("");
  const def = signals.find((d) => d.tag === tag) ?? signals[0];
  const [shape, setShape] = useState<SignalFaultSpec["shape"]>("ramp");
  const [delta, setDelta] = useState("");
  const [ramp, setRamp] = useState("10");
  const [life, setLife] = useState("30");
  const [sensor, setSensor] = useState(false);
  const fleet = useKilnFleet();
  if (!def) return null;
  const sigma = def.sigma || 1;
  const fallback = +(sigma * 6).toFixed(def.decimals);
  const d = delta === "" ? fallback : Number(delta);
  const now = fleet[machine]?.frame.signals[def.tag];
  const valid = Number.isFinite(d) && Number(ramp) >= 0 && Number(life) >= 1;
  const freeze = shape === "freeze";
  return (
    <section className="ast-card simc-card" aria-label="Signal fault builder">
      <div className="ast-card-head sim-card-head-row">
        <div className="sim-card-head-text">
          <h2 className="ast-card-title">Signal fault</h2>
          <span className="ast-caption ast-num">
            {def.tag} now {now?.display ?? "—"} {def.unit} · model {now?.model !== null && now?.model !== undefined ? now.model.toFixed(def.decimals) : "—"} · σ {sigma}
          </span>
        </div>
      </div>
      <div className="simc-builder">
        <Field label="Machine">
          {(id) => (
            <Select
              id={id}
              value={machine}
              onChange={(v) => {
                setMachine(v);
                setTag("");
                setDelta("");
              }}
              options={machines.map((m) => ({ value: m.machineId, label: code(m.machineId) }))}
            />
          )}
        </Field>
        <Field label="Signal">
          {(id) => (
            <Select
              id={id}
              value={def.tag}
              onChange={(v) => {
                setTag(v);
                setDelta("");
              }}
              options={signals.map((s) => ({ value: s.tag, label: `${s.tag} · ${s.name}` }))}
            />
          )}
        </Field>
        <Field label="Fault">{(id) => <Select id={id} value={shape} onChange={(v) => setShape(v as SignalFaultSpec["shape"])} options={SHAPES} />}</Field>
        <Field label={`Change${def.unit ? ` (${def.unit})` : ""}`} hint={freeze ? "Not used" : `${(d / sigma).toFixed(1)} σ`}>
          {(id, hint) => <NumberInput id={id} describedBy={hint} value={delta === "" ? String(fallback) : delta} onChange={setDelta} step="any" disabled={freeze} />}
        </Field>
        <Field label={shape === "osc" ? "Period (min)" : shape === "spike" ? "Spike length (min)" : "Ramp (min)"}>
          {(id) => <NumberInput id={id} value={ramp} onChange={setRamp} min={0} step={1} disabled={freeze || shape === "step" || shape === "noise"} />}
        </Field>
        <Field label="Lasts (min)">{(id) => <NumberInput id={id} value={life} onChange={setLife} min={1} step={1} />}</Field>
      </div>
      <div className="simc-builder-foot">
        <Toggle checked={sensor || freeze} onChange={setSensor} disabled={freeze} label="Instrument only" description="Only the reading is wrong; the plant itself is unaffected" />
        <PillButton
          variant="primary"
          disabled={!valid}
          onClick={() => line.signalFault({ machine, tag: def.tag, shape, delta: d, rampMin: Number(ramp), sensor: sensor || freeze, life: Number(life) })}
        >
          Inject
        </PillButton>
      </div>
    </section>
  );
}
