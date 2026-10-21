"use client";

/**
 * Simulation page › Try a fault: pick a machine of the live line, start a
 * library fault (worn part, sensor fault, trip, process change) or a fault on
 * one reading (drift, past the Alert / Critical limit, stuck reading), and see
 * the result in the machine's real pages — Sensors, Diagnosis, Alarms,
 * Prognosis and Analysis are the same components the Assets workspace and
 * Home use, not look-alikes.
 *
 * Every fault goes through the database (`simulation_commands`, POST
 * /api/simulation/commands), so the always-on plant stores its readings and
 * every open page runs it too (the Simulation page applies it on its own
 * engines at once instead of waiting for its next read).
 */
import React, { useMemo, useState } from "react";
import { Field, FieldGrid, NumberInput, PillButton, PillNav, Select, Toggle, Loading } from "@/components/ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useKilnFleet } from "@/providers/kiln-simulation-context";
import { DiagnosisView } from "@/components/assets/diagnosis-view";
import { MachinePrognosisPage } from "@/components/assets/prognosis/prognosis-page";
import { MachineAnalysisPage } from "@/components/assets/analysis/analysis-page";
import { MachineSensorMappingView } from "@/components/assets/machine-sensor-mapping-view";
import { OperatorAlarmLog, useLatchedAlarms } from "@/components/home/operator/operator-telemetry";
import { liveFrameAlerts } from "@/components/home/live-alerts";
import { formatClock, simTimeMs } from "@shared/lib/kiln-sim/engine";
import { formatLocalTime } from "@/lib/time";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { levelDelta, type SignalFaultSpec } from "@shared/lib/pyro-sim/scenarios";
import { PYRO_SIGNAL_BY_TAG } from "@shared/lib/pyro-sim/signals";
import type { SimMachine, SimScenarioKind } from "@backend/services/simulation-service";
import "@/components/home/operator/operator-console.css";

type ViewId = "sensors" | "diagnosis" | "alarms" | "prognosis" | "analysis";
type FaultKind = SimScenarioKind | "reading";

const KINDS: Array<{ id: FaultKind; label: string }> = [
  { id: "fault", label: "Machine fault" },
  { id: "sensor", label: "Sensor fault" },
  { id: "trip", label: "Trip or stopped part" },
  { id: "process", label: "Process change" },
  { id: "reading", label: "One reading" },
];

/** One-reading changes: past a limit, or a shape with an amount. */
type Change = "Alert" | "Critical" | SignalFaultSpec["shape"];
const CHANGES: Array<{ value: Change; label: string; amount: boolean; over: boolean }> = [
  { value: "Alert", label: "Go past the Alert limit", amount: false, over: true },
  { value: "Critical", label: "Go past the Critical limit", amount: false, over: true },
  { value: "drift", label: "Drift away, more and more", amount: true, over: true },
  { value: "ramp", label: "Move by an amount, gradually", amount: true, over: true },
  { value: "step", label: "Jump by an amount", amount: true, over: false },
  { value: "osc", label: "Swing up and down", amount: true, over: true },
  { value: "noise", label: "Become noisy", amount: true, over: false },
  { value: "freeze", label: "Get stuck (stops changing)", amount: false, over: false },
];

const STRENGTH = [
  { value: "1", label: "Just reaches the Alert level" },
  { value: "1.25", label: "A little past the Alert level" },
  { value: "1.6", label: "Well past the Alert level" },
  { value: "2.2", label: "Far past it" },
];

/** Share of its size added every real minute once in place. */
const WORSE = [
  { value: "0", label: "Stays the same" },
  { value: "0.02", label: "Gets slowly worse" },
  { value: "0.08", label: "Gets quickly worse" },
];

/** Remembered per viewer: the machine and page last looked at. */
const MACHINE_KEY = "ultron.simulation.machine";
const VIEW_KEY = "ultron.simulation.view";
function remembered(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function remember(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* not remembered */
  }
}
const VIEWS: readonly ViewId[] = ["sensors", "diagnosis", "alarms", "prognosis", "analysis"];

/** Real minutes → engine minutes (one engine minute passes every real second). */
const toSim = (realMin: number) => Math.round(realMin * 60);

export function SimulationTry({
  machines,
  busy,
  note,
  onCommand,
  onClearNote,
}: {
  /** The plant's live-line machines (pyro engine). */
  machines: SimMachine[];
  /** The action being saved (its button shows the spinner), or null. */
  busy: string | null;
  /** Outcome of the last action (shown beside Start). */
  note: { tone: "good" | "bad" | "info"; text: string } | null;
  /** Queue a command; resolves true when the server took it. `key` names the button that shows the spinner. */
  onCommand: (body: Record<string, unknown>, done: string, key?: string) => Promise<boolean>;
  /** Drop the last outcome (it belongs to the machine it was started on). */
  onClearNote?: () => void;
}) {
  const { allMachines } = useIndustrialData();
  const fleet = useKilnFleet();
  const [machineId, setMachineIdState] = useState<string>(() => remembered(MACHINE_KEY) ?? machines[0]?.machineId ?? "");
  const setMachineId = (id: string) => {
    if (id !== machineId) onClearNote?.();
    setMachineIdState(id);
    remember(MACHINE_KEY, id);
  };
  const current = machines.find((m) => m.machineId === machineId) ?? machines[0] ?? null;
  const tz = useSiteTimeZone({ machineId: current?.machineId });
  const asset = useMemo(() => (current ? (allMachines.find((m) => m.id === current.machineId) ?? null) : null), [allMachines, current]);
  const sim = current ? fleet[current.machineId] : undefined;
  const [view, setViewState] = useState<ViewId>(() => {
    const v = remembered(VIEW_KEY) as ViewId | null;
    return v && VIEWS.includes(v) ? v : "diagnosis";
  });
  const setView = (v: ViewId) => (setViewState(v), remember(VIEW_KEY, v));

  // Alarm rows exactly as Home builds them, for every machine of the line (latched since this page opened).
  const plantAlerts = useMemo(
    () =>
      machines
        .flatMap((m) => {
          const s = fleet[m.machineId];
          return s ? liveFrameAlerts({ machineId: m.machineId, name: m.name }, s.frame) : [];
        })
        .sort((a, b) => (b.t ?? -Infinity) - (a.t ?? -Infinity)),
    [machines, fleet],
  );
  const anyFrame = machines.map((m) => fleet[m.machineId]?.frame).find(Boolean) ?? null;
  const latched = useLatchedAlarms(`simulation:${machines[0]?.plantId ?? "plant"}`, plantAlerts, anyFrame ? formatClock(anyFrame.t).clock : null, Boolean(anyFrame));
  const machineAlarms = useMemo(() => latched.filter((a) => a.machineId === current?.machineId), [latched, current]);
  const openByMachine = useMemo(() => {
    const m = new Map<string, "bad" | "warn">();
    for (const a of plantAlerts) if (m.get(a.machineId) !== "bad") m.set(a.machineId, a.level === "danger" ? "bad" : "warn");
    return m;
  }, [plantAlerts]);

  if (!current) return <p className="ast-muted">Faults can be started on the cement line machines. This plant has none.</p>;

  const running = (sim?.line?.events ?? []).filter((j) => j.machine === current.machineId && sim!.frame.t < j.end);
  const activeAlarms = machineAlarms.filter((a) => a.active).length;
  const go = (v: ViewId) => () => setView(v);

  return (
    <div className="sim-try">
      <PillNav
        ariaLabel="Machine"
        wrap
        items={machines.map((m) => ({
          id: m.machineId,
          label: m.name.replace(/\s*\([A-Z0-9-]+\)\s*$/, ""),
          // A dot only when the machine has an open alarm; a quiet machine shows its name alone.
          prefix: openByMachine.has(m.machineId) ? <span className="ph-unit-dot" data-tone={openByMachine.get(m.machineId)} aria-hidden="true" /> : undefined,
        }))}
        activeId={current.machineId}
        onChange={setMachineId}
      />

      <div className="sim-grid">
        <FaultForm key={current.machineId} machine={current} signals={sim?.frame.defs.signals ?? []} busy={busy} note={note} onCommand={onCommand} />

        <section className="ast-card sim-card" aria-labelledby="sim-running">
          <div className="ast-card-head">
            <h2 className="ast-card-title" id="sim-running">
              Running on this machine
            </h2>
            <span className="sim-head-actions">
              <PillButton
                variant="secondary"
                loading={busy === `stop:${current.machineId}`}
                disabled={(busy !== null && busy !== `stop:${current.machineId}`) || running.length === 0}
                onClick={() => void onCommand({ kind: "clear", machineId: current.machineId }, `The faults on ${current.name} are easing off.`, `stop:${current.machineId}`)}
              >
                Stop all
              </PillButton>
            </span>
          </div>
          {running.length ? (
            <ul className="sim-running">
              {running.map((j) => (
                <li key={j.id}>
                  <span className="sim-running-name">{j.name}</span>
                  <span className="ast-muted">{j.auto ? "Came on its own" : "Started here"}</span>
                  <span className="ast-num" title={tz.label}>
                    {formatLocalTime(simTimeMs(j.start), { seconds: false, timeZone: tz.timeZone })} – {formatLocalTime(simTimeMs(j.end), { seconds: false, timeZone: tz.timeZone })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sim-help">Nothing is running on this machine. A fault you start shows here and in the pages below.</p>
          )}
          {sim && sim.frame.scenarioId !== "healthy" && (
            <p className="sim-help">
              Long-running fault: <strong>{sim.scenario.name}</strong> (set by what this machine does on its own, under Settings).
            </p>
          )}
        </section>
      </div>

      <PillNav<ViewId>
        ariaLabel="Page"
        items={[
          { id: "sensors", label: "Sensors" },
          { id: "diagnosis", label: "Diagnosis" },
          { id: "alarms", label: "Alarms", suffix: activeAlarms ? <span className="sim-count ast-num">{activeAlarms}</span> : undefined },
          { id: "prognosis", label: "Prognosis" },
          { id: "analysis", label: "Analysis" },
        ]}
        activeId={view}
        onChange={setView}
      />

      <div className="assets-machine-workspace sim-workspace" data-subpage={view}>
        {!asset ? (
          <Loading label={`Loading ${current.name}…`} rows={4} />
        ) : view === "diagnosis" ? (
          <section className="subpage-content" aria-label="Diagnosis">
            <DiagnosisView key={asset.id} machine={asset} onNavigateToTrends={go("sensors")} onNavigateToAnalysis={go("analysis")} onNavigateToPrognosis={go("prognosis")} />
          </section>
        ) : view === "prognosis" ? (
          <section className="subpage-content" aria-label="Prognosis">
            <MachinePrognosisPage key={`prog-${asset.id}`} machine={asset} onNavigateToDiagnosis={go("diagnosis")} onNavigateToAnalysis={go("analysis")} onNavigateToSensors={go("sensors")} onNavigateToTrends={go("sensors")} />
          </section>
        ) : view === "analysis" ? (
          <section className="subpage-content" aria-label="Analysis">
            <MachineAnalysisPage key={asset.id} machine={asset} onNavigateToDiagnosis={go("diagnosis")} onNavigateToPrognosis={go("prognosis")} onNavigateToSensors={go("sensors")} onNavigateToTrends={go("sensors")} />
          </section>
        ) : view === "sensors" ? (
          <section className="subpage-content" aria-label="Sensors">
            <MachineSensorMappingView machine={asset} simulation={sim} onNavigateToHealth={go("diagnosis")} onNavigateToDiagnosis={go("diagnosis")} onNavigateToTrends={go("sensors")} />
          </section>
        ) : (
          <section className="sim-alarms" aria-label="Alarms">
            <OperatorAlarmLog alarms={machineAlarms} onDiagnose={(id) => (setMachineId(id), setView("diagnosis"))} />
          </section>
        )}
      </div>
    </div>
  );
}

/** Start-a-fault form for one machine: a library fault, or a fault on one reading. */
function FaultForm({
  machine,
  signals,
  busy,
  note,
  onCommand,
}: {
  machine: SimMachine;
  signals: Array<{ tag: string; name: string; unit: string; type: "analog" | "state"; calculated?: boolean; origin?: string; normalBand: string }>;
  busy: string | null;
  note: { tone: "good" | "bad" | "info"; text: string } | null;
  onCommand: (body: Record<string, unknown>, done: string, key?: string) => Promise<boolean>;
}) {
  const kinds = KINDS.filter((k) => k.id === "reading" || machine.scenarios.some((s) => s.kind === k.id));
  const [kind, setKind] = useState<FaultKind>(kinds[0]?.id ?? "reading");
  const list = machine.scenarios.filter((s) => s.kind === kind);
  const [scenarioId, setScenarioId] = useState("");
  const scenario = list.find((s) => s.id === scenarioId) ?? list[0] ?? null;
  const [strength, setStrength] = useState("1.25");
  const [lasts, setLasts] = useState("30");
  const [worse, setWorse] = useState("0");

  // One reading: the machine's wired analog readings (not calculated, not typed in by hand).
  const readings = useMemo(() => signals.filter((s) => s.type === "analog" && !s.calculated && s.origin !== "manual" && PYRO_SIGNAL_BY_TAG[s.tag]?.machine === machine.machineId), [signals, machine.machineId]);
  const [tag, setTag] = useState("");
  const reading = readings.find((s) => s.tag === tag) ?? readings[0] ?? null;
  const def = reading ? PYRO_SIGNAL_BY_TAG[reading.tag] : undefined;
  const changes = CHANGES.filter((c) => (c.value === "Alert" || c.value === "Critical" ? Boolean(def && levelDelta(def, c.value) !== null) : true));
  const [changeId, setChangeId] = useState<Change>("Alert");
  const change = changes.find((c) => c.value === changeId) ?? changes[0];
  const [amount, setAmount] = useState("");
  const [over, setOver] = useState("5");
  const [sensorOnly, setSensorOnly] = useState(false);
  /** Problems with the typed numbers, shown under each field. */
  const [errors, setErrors] = useState<{ lasts?: string; amount?: string; over?: string }>({});
  const clearError = (k: "lasts" | "amount" | "over") => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));

  const num = (v: string, field: "lasts" | "amount" | "over", lo: number, hi: number): number | null => {
    const n = Number(v.replace(",", "."));
    if (v.trim() === "" || !Number.isFinite(n) || n < lo || n > hi) {
      setErrors((e) => ({ ...e, [field]: v.trim() === "" ? "Enter a number." : `Use a number from ${lo} to ${hi}.` }));
      return null;
    }
    return n;
  };

  const start = async () => {
    setErrors({});
    const life = num(lasts, "lasts", 1, 240);
    if (life === null) return;
    const grow = Number(worse);
    if (kind !== "reading") {
      if (!scenario) return;
      await onCommand(
        { kind: "inject", machineId: machine.machineId, scenarioId: scenario.id, spec: { scale: Number(strength), life: toSim(life), grow } },
        `Started "${scenario.name}" on ${machine.name}. It builds up over about a minute.`,
        "try-start",
      );
      return;
    }
    if (!reading || !change) return;
    const level = change.value === "Alert" || change.value === "Critical" ? change.value : undefined;
    let delta = 0;
    if (change.amount) {
      const d = num(amount, "amount", -1e6, 1e6);
      if (d === null) return;
      if (d === 0) return setErrors((e) => ({ ...e, amount: "Enter a change other than 0." }));
      delta = d;
    }
    const overMin = change.over ? num(over, "over", 0, 240) : 0;
    if (overMin === null) return;
    const shape: SignalFaultSpec["shape"] = level ? (overMin > 0 ? "ramp" : "step") : (change.value as SignalFaultSpec["shape"]);
    await onCommand(
      {
        kind: "signal",
        machineId: machine.machineId,
        spec: { tag: reading.tag, shape, delta, level, rampMin: toSim(overMin), sensor: shape === "freeze" || sensorOnly, life: toSim(life), grow },
      },
      `Started on ${reading.name} (${machine.name}).`,
      "try-start",
    );
  };

  return (
    <section className="ast-card sim-card" aria-labelledby="sim-start">
      <div className="ast-card-head">
        <h2 className="ast-card-title" id="sim-start">
          Start a fault on {machine.name.replace(/\s*\([A-Z0-9-]+\)\s*$/, "")}
        </h2>
      </div>
      <PillNav<FaultKind> ariaLabel="Kind of fault" wrap items={kinds} activeId={kind} onChange={(k) => (setKind(k), setErrors({}))} />
      {kind !== "reading" ? (
        <>
          <FieldGrid>
            <Field label="Fault" wide>
              {(id) => <Select id={id} value={scenario?.id ?? ""} onChange={setScenarioId} options={list.map((s) => ({ value: s.id, label: s.name }))} />}
            </Field>
          </FieldGrid>
          {scenario && (
            <p className="sim-help">
              {scenario.description}{" "}
              <span className="ast-muted">{scenario.rules.length ? `Should raise ${scenario.rules.length === 1 ? "1 alarm" : `${scenario.rules.length} alarms`}.` : "Nothing should alarm."}</span>
            </p>
          )}
          <FieldGrid>
            <Field label="How strong">{(id) => <Select id={id} value={strength} onChange={setStrength} options={STRENGTH} />}</Field>
            <Field label="Lasts (minutes)" error={errors.lasts}>
              {(id, d) => <NumberInput id={id} describedBy={d} value={lasts} onChange={(v) => (setLasts(v), clearError("lasts"))} min={1} max={240} step="any" />}
            </Field>
            <Field label="While it lasts, it" hint="Getting worse is what lets Prognosis show time left.">
              {(id) => <Select id={id} value={worse} onChange={setWorse} options={WORSE} />}
            </Field>
          </FieldGrid>
        </>
      ) : (
        <>
          <FieldGrid>
            <Field label="Reading" wide>
              {(id) => (
                <Select
                  id={id}
                  value={reading?.tag ?? ""}
                  onChange={setTag}
                  options={readings.map((s) => ({ value: s.tag, label: `${s.name}${s.unit && s.unit !== "state" ? ` (${s.unit})` : ""}` }))}
                />
              )}
            </Field>
            <Field label="What happens">{(id) => <Select id={id} value={change?.value ?? ""} onChange={(v) => setChangeId(v as Change)} options={changes.map((c) => ({ value: c.value, label: c.label }))} />}</Field>
            {change?.amount && (
              <Field label={`Amount (${reading?.unit || "units"})`} hint={reading ? `Normal range ${reading.normalBand}.` : undefined} error={errors.amount}>
                {(id, d) => <NumberInput id={id} describedBy={d} value={amount} onChange={(v) => (setAmount(v), clearError("amount"))} step="any" />}
              </Field>
            )}
            {change?.over && (
              <Field label="Over (minutes)" hint={change.value === "osc" ? "One full swing." : "0 jumps at once."} error={errors.over}>
                {(id, d) => <NumberInput id={id} describedBy={d} value={over} onChange={(v) => (setOver(v), clearError("over"))} min={0} max={240} step="any" />}
              </Field>
            )}
            <Field label="Lasts (minutes)" error={errors.lasts}>
              {(id, d) => <NumberInput id={id} describedBy={d} value={lasts} onChange={(v) => (setLasts(v), clearError("lasts"))} min={1} max={240} step="any" />}
            </Field>
            <Field label="While it lasts, it">{(id) => <Select id={id} value={worse} onChange={setWorse} options={WORSE} />}</Field>
          </FieldGrid>
          {change?.value !== "freeze" && (
            <Toggle
              checked={sensorOnly}
              onChange={setSensorOnly}
              label="Only the sensor is wrong"
              description={sensorOnly ? "The machine is fine; the reading is not." : "The machine itself changes; the reading shows it."}
            />
          )}
        </>
      )}
      <div className="sim-form-foot">
        {note && (
          <span className="pg-note" data-tone={note.tone} role="status">
            {note.text}
          </span>
        )}
        <PillButton
          loading={busy === "try-start"}
          disabled={(busy !== null && busy !== "try-start") || (kind === "reading" ? !reading : !scenario)}
          onClick={() => void start()}
        >
          Start
        </PillButton>
      </div>
    </section>
  );
}
