"use client";

/**
 * Simulation page. Try a fault (simulation-try.tsx): start a fault on a
 * machine and watch it in the machine's real Sensors, Diagnosis, Alarms,
 * Prognosis and Analysis pages. Settings: how the live demonstration behaves — how often faults start
 * on their own, how long they last, how calm the plant stays, how noisy the
 * readings are — and what each simulated machine does on its own. Settings
 * are stored in the database (/api/simulation) and picked up by the always-on
 * plant and every open page within seconds. One simulated minute passes every
 * real second, so the page shows and takes real minutes.
 */
import React, { useEffect, useMemo, useState } from "react";
import { revalidateApi, useApi } from "@/lib/api-cache";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { Field, FieldGrid, NumberInput, PillButton, PillNav, Select, Table, Toggle, type Column, Loading } from "@/components/ui";
import { formatLocalTime } from "@/lib/time";
import { syncSimulation } from "@/components/assets/kiln-seals-simulation";
import { SimulationTry } from "./simulation-try";
import { SimulationSap } from "./simulation-sap";
import type { LineSimSettings } from "@shared/lib/pyro-sim/engine";
import type { SimCommandDto, SimMachine, SimProfile, SimulationDto } from "@backend/services/simulation-service";
import "@/components/assets/assets-shell.css";
import "@/components/ui/page.css";
import "./simulation.css";

const URL_BASE = "/api/simulation";

/** Engine minutes → real minutes (one simulated minute passes every real second). */
const toReal = (simMin: number) => Math.round((simMin / 60) * 10) / 10;
const toSim = (realMin: number) => Math.round(realMin * 60);

const PROFILE_LABEL: Record<SimProfile, string> = {
  healthy: "Stays healthy",
  advisory: "Holds an Alert fault",
  critical: "Holds a Critical fault",
  story: "Faults come and go; the crew fixes them",
};

const ENGINE_LABEL: Record<SimMachine["engine"], string> = { pyro: "Cement line", kiln: "Kiln seals", vpc: "Casting machine", limits: "Readings from its limits" };

const CREEP: Array<{ value: number; label: string }> = [
  { value: 0, label: "Stays the same" },
  { value: 0.05, label: "Gets slowly worse" },
  { value: 0.15, label: "Gets quickly worse" },
];

/** Form state: real minutes and percentages as the person types them. */
interface Draft {
  events: boolean;
  eventEvery: string;
  eventLife: string;
  eventLead: string;
  maxEvents: string;
  sensorShare: string;
  intensity: string;
  holdMinutes: string;
  holdCreep: string;
  changeGap: string;
  limitClear: string;
  noise: string;
  healthDrift: string;
  machines: Record<string, boolean>;
  profiles: Record<string, SimProfile>;
}

function draftOf(d: SimulationDto): Draft {
  const s = d.settings;
  return {
    events: s.events,
    eventEvery: String(toReal(s.eventEvery)),
    eventLife: String(toReal(s.eventLife)),
    eventLead: String(toReal(s.eventLead)),
    maxEvents: String(s.maxEvents),
    sensorShare: String(Math.round(s.sensorShare * 100)),
    intensity: String(s.intensity),
    holdMinutes: String(toReal(s.holdMinutes)),
    holdCreep: String(s.holdCreep ?? 0),
    changeGap: String(toReal(s.changeGap ?? 0)),
    limitClear: String(toReal(s.limitClear ?? 300)),
    noise: String(s.noise),
    healthDrift: String(s.healthDrift),
    machines: { ...s.machines },
    profiles: Object.fromEntries(d.machines.filter((m) => m.profile).map((m) => [m.machineId, m.profile!])),
  };
}

type NumberKey = "eventEvery" | "eventLife" | "eventLead" | "maxEvents" | "sensorShare" | "intensity" | "holdMinutes" | "holdCreep" | "changeGap" | "limitClear" | "noise" | "healthDrift";
type FieldErrors = Partial<Record<NumberKey, string>>;

/** The settings a draft stands for, or the problem with each field that is wrong. */
function settingsOf(d: Draft): { settings: Partial<LineSimSettings> } | { errors: FieldErrors } {
  const num = (v: string, lo: number, hi: number): number | string => {
    const n = Number(v.replace(",", "."));
    if (v.trim() === "" || !Number.isFinite(n)) return "Enter a number.";
    if (n < lo || n > hi) return `Use a value from ${lo} to ${hi}.`;
    return n;
  };
  const fields: Array<[NumberKey, number, number, (n: number) => number]> = [
    ["eventEvery", 0.5, 120, toSim],
    ["eventLife", 0.2, 120, toSim],
    ["eventLead", 0.1, 10, toSim],
    ["maxEvents", 0, 6, (n) => Math.round(n)],
    ["sensorShare", 0, 100, (n) => n / 100],
    ["intensity", 0.5, 2.5, (n) => n],
    ["holdMinutes", 0, 240, toSim],
    ["holdCreep", 0, 0.5, (n) => n],
    ["changeGap", 0, 120, toSim],
    ["limitClear", 0.05, 60, toSim],
    ["noise", 0, 4, (n) => n],
    ["healthDrift", 0, 3, (n) => n],
  ];
  const out: Partial<LineSimSettings> = { events: d.events, machines: d.machines };
  const errors: FieldErrors = {};
  for (const [key, lo, hi, conv] of fields) {
    const n = num(d[key], lo, hi);
    if (typeof n === "string") errors[key] = n;
    else (out as Record<string, number>)[key] = conv(n);
  }
  return Object.keys(errors).length ? { errors } : { settings: out };
}

function commandText(c: SimCommandDto, nameOf: (id: string | null) => string, scenarioName: (machineId: string | null, id: string | null) => string): string {
  if (c.kind === "clear") return c.machineId ? `Cleared the faults on ${nameOf(c.machineId)}` : "Cleared the faults that come and go";
  if (c.kind === "inject") return `Started "${scenarioName(c.machineId, c.scenarioId)}" on ${nameOf(c.machineId)}`;
  if (c.kind === "signal") {
    const what = c.spec?.level ? `past the ${c.spec.level} limit` : c.spec?.shape === "freeze" ? "stuck" : `${c.spec?.shape ?? "changed"} ${c.spec?.delta ?? ""}`;
    return `Started a fault on ${c.spec?.tag ?? "a reading"} (${what.trim()}) on ${nameOf(c.machineId)}`;
  }
  const what = c.faultKind === "sensor" ? "a sensor fault" : "a machine fault";
  return c.machineId ? `Started ${what} on ${nameOf(c.machineId)}` : `Started ${what} on a random machine`;
}

export function SimulationView() {
  const { selectedPlantId } = useIndustrialData();
  const url = `${URL_BASE}${selectedPlantId ? `?plantId=${encodeURIComponent(selectedPlantId)}` : ""}`;
  const { data, error, isLoading } = useApi<SimulationDto>(url, { refreshMs: 10_000 });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseVersion, setBaseVersion] = useState<number | null>(null);
  const [note, setNote] = useState<{ tone: "good" | "bad" | "info"; text: string } | null>(null);
  /** The action being saved (its button shows the spinner), or null. */
  const [busy, setBusy] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [confirmReset, setConfirmReset] = useState(false);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"try" | "settings" | "sap">("try");

  // Take the stored settings when they first arrive or change elsewhere, unless the person is mid-edit.
  const dirty = Boolean(draft && data && JSON.stringify(draft) !== JSON.stringify(draftOf(data)));
  useEffect(() => {
    if (!data) return;
    if (draft === null || (!dirty && baseVersion !== data.version)) {
      setDraft(draftOf(data));
      setBaseVersion(data.version);
    }
  }, [data, draft, dirty, baseVersion]);

  const machines = useMemo(() => data?.machines ?? [], [data]);
  const lineMachines = machines.filter((m) => m.engine === "pyro");
  const nameOf = (id: string | null) => machines.find((m) => m.machineId === id)?.name ?? id ?? "a machine";
  const scenarioName = (machineId: string | null, id: string | null) => machines.find((m) => m.machineId === machineId)?.scenarios.find((s) => s.id === id)?.name ?? id ?? "a fault";
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
    setFieldErrors((e) => (k in e ? { ...e, [k]: undefined } : e));
  };
  /** Props for a button that runs `key`: a spinner on it, the others wait. */
  const act = (key: string) => ({ loading: busy === key, disabled: busy !== null && busy !== key });

  const call = async (key: string, method: string, path: string, body?: unknown): Promise<boolean> => {
    setBusy(key);
    setNote(null);
    try {
      const res = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setNote({ tone: "bad", text: res.status === 403 ? "Only an administrator can change the simulation." : (json?.error?.message ?? `Could not save (${res.status})`) });
        return false;
      }
      await revalidateApi(url);
      return true;
    } catch {
      setNote({ tone: "bad", text: "Could not reach the server. Try again." });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!draft || !data) return;
    const s = settingsOf(draft);
    if ("errors" in s) {
      setFieldErrors(s.errors);
      setNote({ tone: "bad", text: "Fix the marked values, then save." });
      return;
    }
    setFieldErrors({});
    const changedProfiles = Object.fromEntries(Object.entries(draft.profiles).filter(([id, p]) => data.machines.find((m) => m.machineId === id)?.profile !== p));
    if (await call("save", "PUT", URL_BASE, { settings: s.settings, profiles: changedProfiles })) {
      setDraft(null);
      setNote({ tone: "good", text: "Saved. The plant and every open page follow within about 10 seconds." });
    }
  };

  const reset = async () => {
    setConfirmReset(false);
    if (await call("reset", "DELETE", URL_BASE)) {
      setDraft(null);
      setFieldErrors({});
      setNote({ tone: "good", text: "Back to the standard settings." });
    }
  };

  const command = async (body: Record<string, unknown>, done: string, key = "command"): Promise<boolean> => {
    if (!(await call(key, "POST", `${URL_BASE}/commands`, body))) return false;
    // This page's own engines take it now; the plant and other open pages within about 10 seconds.
    await syncSimulation();
    setNote({ tone: "good", text: done });
    return true;
  };

  const machineColumns: Column<SimMachine>[] = [
    {
      key: "name",
      header: "Machine",
      render: (m) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">{m.name}</span>
          <span className="ast-cell-sub">{ENGINE_LABEL[m.engine]}</span>
        </span>
      ),
    },
    {
      key: "profile",
      header: "What it does on its own",
      width: "260px",
      render: (m) =>
        draft && m.profiles.length ? (
          <Select
            id={`sim-profile-${m.machineId}`}
            ariaLabel={`What ${m.name} does on its own`}
            value={draft.profiles[m.machineId] ?? m.profile ?? ""}
            onChange={(v) => set("profiles", { ...draft.profiles, [m.machineId]: v as SimProfile })}
            options={m.profiles.map((p) => ({ value: p, label: PROFILE_LABEL[p] }))}
          />
        ) : (
          "—"
        ),
    },
    {
      key: "random",
      header: "Gets faults that come and go",
      width: "200px",
      render: (m) =>
        m.engine === "pyro" && draft ? (
          <label className="sim-check">
            <input
              type="checkbox"
              aria-label={`${m.name} gets faults that come and go`}
              checked={draft.machines[m.machineId] !== false}
              onChange={(e) => set("machines", { ...draft.machines, [m.machineId]: e.target.checked })} />
            <span>{draft.machines[m.machineId] !== false ? "Yes" : "No"}</span>
          </label>
        ) : (
          <span className="ast-muted">Not on this machine</span>
        ),
    },
    {
      key: "start",
      header: "Start a fault now",
      width: "340px",
      render: (m) =>
        m.faults.length ? (
          <span className="sim-start">
            <Select
              id={`sim-fault-${m.machineId}`}
              ariaLabel={`Fault to start on ${m.name}`}
              value={pick[m.machineId] ?? ""}
              onChange={(v) => setPick((p) => ({ ...p, [m.machineId]: v }))}
              options={[{ value: "", label: "Any machine fault" }, { value: "sensor", label: "Any sensor fault" }, ...m.faults.map((f) => ({ value: f.id, label: `${f.name}${f.kind === "sensor" ? " (sensor)" : ""}` }))]}
            />
            <PillButton
              variant="secondary"
              aria-label={`Start the fault on ${m.name}`}
              {...act(`start:${m.machineId}`)}
              onClick={() => {
                const v = pick[m.machineId] ?? "";
                void command(
                  v === "" || v === "sensor" ? { kind: "raise", machineId: m.machineId, faultKind: v === "sensor" ? "sensor" : "fault" } : { kind: "inject", machineId: m.machineId, scenarioId: v },
                  `Fault started on ${m.name}. It shows within about 10 seconds.`,
                  `start:${m.machineId}`,
                );
              }}
            >
              Start
            </PillButton>
          </span>
        ) : (
          <span className="ast-muted">Set by what it does on its own</span>
        ),
    },
  ];

  const running = data?.settings.events ?? false;
  return (
    <div className="pg-root ast-root sim-root">
      <header className="ast-head pg-head">
        <div className="ast-head-main">
          <ol className="ast-crumbs" aria-label="Location">
            <li>Simulation</li>
          </ol>
          <div className="ast-title-row">
            <h1 className="ast-title">Simulation</h1>
            {data && <span className="ast-caption">{running ? "Faults start on their own" : "Faults only when started here"}</span>}
            <PillNav
              ariaLabel="Simulation view"
              items={[
                { id: "try", label: "Try a fault" },
                { id: "settings", label: "Settings" },
                { id: "sap", label: "SAP" },
              ]}
              activeId={tab}
              onChange={(v) => setTab(v as "try" | "settings" | "sap")}
            />
          </div>
          <p className="sim-context">
            The plant is simulated: one simulated minute passes every real second, so every time on this page is in real minutes.
            {data?.updatedAt ? ` Last changed ${formatLocalTime(data.updatedAt)}${data.updatedBy ? ` by ${data.updatedBy}` : ""}.` : ""}
          </p>
        </div>
        <div className="pg-actions">
          {note && tab === "settings" && (
            <span className="pg-note" data-tone={note.tone} role="status">
              {note.text}
            </span>
          )}
          {tab === "settings" && (
            <>
              {confirmReset ? (
                <span className="sim-confirm" role="group" aria-label="Back to standard settings">
                  <span className="ast-caption">Undo every change on this page?</span>
                  <PillButton variant="danger" {...act("reset")} onClick={() => void reset()} autoFocus>
                    Yes, go back
                  </PillButton>
                  <PillButton variant="secondary" disabled={busy !== null} onClick={() => setConfirmReset(false)}>
                    Cancel
                  </PillButton>
                </span>
              ) : (
                <PillButton variant="secondary" disabled={busy !== null || !data} onClick={() => setConfirmReset(true)}>
                  Back to standard settings
                </PillButton>
              )}
              <PillButton {...act("save")} disabled={(busy !== null && busy !== "save") || !dirty} onClick={() => void save()}>
                Save changes
              </PillButton>
            </>
          )}
        </div>
      </header>

      {isLoading && !data && <Loading label="Loading the simulation settings…" rows={4} />}
      {error && !data && (
        <p className="pg-note" data-tone="bad" role="alert">
          Could not load the simulation settings. Reload the page to try again.
        </p>
      )}

      {tab === "sap" && <SimulationSap />}

      {data && tab === "try" && <SimulationTry machines={lineMachines} busy={busy} note={note} onCommand={command} onClearNote={() => setNote(null)} />}

      {draft && data && tab === "settings" && (
        <div className="sim-grid">
          {lineMachines.length > 0 && (
            <>
              <section className="ast-card sim-card" aria-labelledby="sim-events">
                <div className="ast-card-head">
                  <h2 className="ast-card-title" id="sim-events">
                    Faults that come and go
                  </h2>
                </div>
                <Toggle
                  checked={draft.events}
                  onChange={(v) => set("events", v)}
                  label="Start faults on their own"
                  description="Off: nothing new goes wrong unless you start it below."
                />
                <FieldGrid>
                  <Field label="A new fault about every (minutes)" hint="Give or take a fifth." error={fieldErrors.eventEvery}>
                    {(id, d) => <NumberInput id={id} describedBy={d} value={draft.eventEvery} onChange={(v) => set("eventEvery", v)} min={0.5} max={120} step="any" />}
                  </Field>
                  <Field label="Each fault lasts about (minutes)" hint="Then it fades and its alarms clear." error={fieldErrors.eventLife}>
                    {(id, d) => <NumberInput id={id} describedBy={d} value={draft.eventLife} onChange={(v) => set("eventLife", v)} min={0.2} max={120} step="any" />}
                  </Field>
                  <Field label="Builds up over (minutes)" hint="How long it takes to reach the alarm level." error={fieldErrors.eventLead}>
                    {(id, d) => <NumberInput id={id} describedBy={d} value={draft.eventLead} onChange={(v) => set("eventLead", v)} min={0.1} max={10} step="any" />}
                  </Field>
                  <Field label="Most at the same time" error={fieldErrors.maxEvents}>{(id, d) => <NumberInput id={id} describedBy={d} value={draft.maxEvents} onChange={(v) => set("maxEvents", v)} min={0} max={6} step={1} />}</Field>
                  <Field label="Sensor faults (%)" hint="Wrong readings; the rest are real machine faults." error={fieldErrors.sensorShare}>
                    {(id, d) => <NumberInput id={id} describedBy={d} value={draft.sensorShare} onChange={(v) => set("sensorShare", v)} min={0} max={100} step={5} />}
                  </Field>
                  <Field label="How strong (×)" hint="1 just reaches the Alert level; higher goes past it." error={fieldErrors.intensity}>
                    {(id, d) => <NumberInput id={id} describedBy={d} value={draft.intensity} onChange={(v) => set("intensity", v)} min={0.5} max={2.5} step={0.05} />}
                  </Field>
                </FieldGrid>
              </section>

              <section className="ast-card sim-card" aria-labelledby="sim-held">
                <div className="ast-card-head">
                  <h2 className="ast-card-title" id="sim-held">
                    Long-running faults
                  </h2>
                </div>
                <p className="sim-help">Machines set to hold an Alert or Critical fault (below) keep one going, then the crew repairs it and the next one starts.</p>
                <FieldGrid>
                  <Field label="Each stays about (minutes)" hint="0 keeps it until you change the machine." error={fieldErrors.holdMinutes}>
                    {(id, d) => <NumberInput id={id} describedBy={d} value={draft.holdMinutes} onChange={(v) => set("holdMinutes", v)} min={0} max={240} step="any" />}
                  </Field>
                  <Field label="While it lasts, it" hint="Getting worse is what lets the forecasts show time left." error={fieldErrors.holdCreep}>
                    {(id, d) => (
                      <Select
                        id={id}
                        describedBy={d}
                        value={draft.holdCreep}
                        onChange={(v) => set("holdCreep", v)}
                        options={[
                          ...CREEP.map((c) => ({ value: String(c.value), label: c.label })),
                          ...(CREEP.some((c) => String(c.value) === draft.holdCreep) ? [] : [{ value: draft.holdCreep, label: `Custom (${draft.holdCreep})` }]),
                        ]}
                      />
                    )}
                  </Field>
                </FieldGrid>
              </section>

              <section className="ast-card sim-card" aria-labelledby="sim-calm">
                <div className="ast-card-head">
                  <h2 className="ast-card-title" id="sim-calm">
                    Keeping it calm
                  </h2>
                </div>
                <FieldGrid>
                  <Field label="At least this long between new faults (minutes)" hint="Across the whole line; 0 lets them overlap." error={fieldErrors.changeGap}>
                    {(id, d) => <NumberInput id={id} describedBy={d} value={draft.changeGap} onChange={(v) => set("changeGap", v)} min={0} max={120} step="any" />}
                  </Field>
                  <Field label="Alarm stays after the reading recovers (minutes)" hint="Stops an alarm blinking on and off." error={fieldErrors.limitClear}>
                    {(id, d) => <NumberInput id={id} describedBy={d} value={draft.limitClear} onChange={(v) => set("limitClear", v)} min={0.05} max={60} step="any" />}
                  </Field>
                </FieldGrid>
              </section>

              <section className="ast-card sim-card" aria-labelledby="sim-readings">
                <div className="ast-card-head">
                  <h2 className="ast-card-title" id="sim-readings">
                    Readings
                  </h2>
                </div>
                <FieldGrid>
                  <Field label="Sensor noise (×)" hint="1 is normal scatter; 0 is perfectly smooth." error={fieldErrors.noise}>
                    {(id, d) => <NumberInput id={id} describedBy={d} value={draft.noise} onChange={(v) => set("noise", v)} min={0} max={4} step={0.1} />}
                  </Field>
                  <Field label="Health follows normal scatter (×)" hint="0 keeps health flat while readings are normal." error={fieldErrors.healthDrift}>
                    {(id, d) => <NumberInput id={id} describedBy={d} value={draft.healthDrift} onChange={(v) => set("healthDrift", v)} min={0} max={3} step={0.1} />}
                  </Field>
                </FieldGrid>
              </section>
            </>
          )}

          <section className="ast-card pg-table-card sim-wide" aria-labelledby="sim-machines">
            <div className="ast-card-head">
              <h2 className="ast-card-title" id="sim-machines">
                Machines
              </h2>
              {lineMachines.length > 0 && (
                <span className="sim-head-actions">
                  <PillButton variant="secondary" {...act("random")} onClick={() => void command({ kind: "raise", faultKind: "fault" }, "A machine fault was started on a random machine.", "random")}>
                    Start a random fault
                  </PillButton>
                  <PillButton variant="secondary" {...act("clear")} onClick={() => void command({ kind: "clear" }, "The faults that come and go were cleared.", "clear")}>
                    Clear the faults that come and go
                  </PillButton>
                </span>
              )}
            </div>
            {machines.length ? (
              <Table columns={machineColumns} data={machines} keyExtractor={(m) => m.machineId} />
            ) : (
              <p className="ast-muted">This plant has no simulated machines.</p>
            )}
          </section>

          {data.commands.length > 0 && (
            <section className="ast-card sim-wide" aria-labelledby="sim-history">
              <div className="ast-card-head">
                <h2 className="ast-card-title" id="sim-history">
                  Started from this page
                </h2>
              </div>
              <ul className="sim-history">
                {[...data.commands].reverse().map((c) => (
                  <li key={c.id}>
                    <span className="ast-num">{formatLocalTime(c.createdAt)}</span>
                    <span>{commandText(c, nameOf, scenarioName)}</span>
                    <span className="ast-muted">{c.createdBy ? `by ${c.createdBy}` : ""}</span>
                    <span className="ast-muted">{c.appliedAt ? "Done" : "Waiting for the plant"}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
