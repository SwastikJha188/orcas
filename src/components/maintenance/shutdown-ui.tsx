"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ConfirmAction, Dialog, Field, FieldGrid, NumberInput, PillButton, Select, TextArea, TextInput } from "@/components/ui";
import { formatLocalTime } from "@/lib/time";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { useWorkOrderPriorities } from "@/lib/reference-data";
import { PLANNING_SHUTDOWN, SHUTDOWN_STEPS, isActiveShutdown, shutdownStepBlocker, type ShutdownStep } from "@shared/lib/shutdown";
import type { ServicePartRecord } from "@shared/types/maintenance-types";
import type { ShutdownDetail, ShutdownList, ShutdownState, ShutdownSummary } from "@shared/types/shutdown";
import type { Outcome, PmsModel } from "./pms-model";
import { machineName, priorityOptions } from "./pms-model";
import { useRunningHours, useServiceParts } from "./maint-types-model";
import { NoteDialog, Notice, StateWord } from "./pms-ui";
import {
  CANDIDATE_GROUPS,
  collectCandidates,
  itemKeys,
  nextShutdownStart,
  resolveWork,
  shutdownCall,
  stateLabel,
  toOutcome,
  useShutdown,
  useShutdownList,
  useShutdownPick,
  useShutdownPlant,
  type Candidate,
  type WorkRow,
} from "./shutdown-model";

/* ==========================================================================
   Shared pieces of Maintenance › Shutdown: which shutdown the views show,
   the bar above every view (pick a shutdown, its state, the next step) and
   the dialogs.
   ========================================================================== */

export interface ShutdownCtx {
  pms: PmsModel;
  plantId: string | null;
  list: ShutdownList | undefined;
  listLoading: boolean;
  shown: ShutdownSummary | null;
  pick: (id: number) => void;
  detail: ShutdownDetail | undefined;
  /** Work rows of the machines in view (the workspace's machine bar). */
  rows: WorkRow[];
  allRows: WorkRow[];
  parts: ServicePartRecord[] | undefined;
  counter: (machineId: string) => number | null;
  /** Machines in view (one when the machine bar picks one). */
  inView: (machineId: string) => boolean;
  when: (t: string | number | null | undefined) => string;
  day: (t: string | number | null | undefined) => string;
  now: number;
}

export function useShutdownCtx(pms: PmsModel): ShutdownCtx {
  const plantId = useShutdownPlant();
  const listApi = useShutdownList(plantId);
  const [shown, pick] = useShutdownPick(listApi.data?.shutdowns);
  const detailApi = useShutdown(shown?.id ?? null, shown ? isActiveShutdown(shown.state) : false);
  const partsApi = useServiceParts();
  const counter = useRunningHours();
  const tz = useSiteTimeZone({ machineId: pms.data?.machineIds[0] });
  const detail = detailApi.data && detailApi.data.id === shown?.id ? detailApi.data : undefined;
  const allRows = useMemo(() => (detail ? resolveWork(detail, pms.data, partsApi.data) : []), [detail, pms.data, partsApi.data]);
  const ids = pms.data?.machineIds;
  const inView = useMemo(() => {
    const set = new Set(ids ?? []);
    return (m: string) => set.has(m);
  }, [ids]);
  const rows = useMemo(() => allRows.filter((r) => inView(r.machineId)), [allRows, inView]);
  const when = (t: string | number | null | undefined) => (t === null || t === undefined ? "—" : formatLocalTime(t, { date: true, seconds: false, timeZone: tz.timeZone }));
  const day = (t: string | number | null | undefined) =>
    t === null || t === undefined ? "—" : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz.timeZone || undefined }).format(new Date(t));
  return {
    pms,
    plantId,
    list: listApi.data,
    listLoading: listApi.isLoading && !listApi.data,
    shown,
    pick,
    detail,
    rows,
    allRows,
    parts: partsApi.data,
    counter,
    inView,
    when,
    day,
    now: pms.now,
  };
}

/* ------------------------------------------------------------ bar */

/** "Plan a shutdown" opens the dialog; picking a shutdown switches every view. */
export function ShutdownBar({ ctx, onPlan, extra }: { ctx: ShutdownCtx; onPlan: () => void; extra?: React.ReactNode }) {
  const { list, shown, detail } = ctx;
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [asking, setAsking] = useState<ShutdownStep | null>(null);
  const [running, setRunning] = useState<ShutdownState | null>(null);
  const busy = running !== null;
  const canApprove = Boolean(list?.canApprove);

  const run = async (step: ShutdownStep, reason?: string): Promise<Outcome> => {
    if (!detail) return { tone: "bad", text: "The shutdown is still loading" };
    setRunning(step.to);
    const out = await shutdownCall(`/${detail.id}/state`, "POST", { to: step.to, reason }, "Could not change the shutdown");
    setRunning(null);
    const o = toOutcome(out, `${detail.name}: ${stateLabel(list, step.to)}`);
    setOutcome(o);
    return o;
  };

  const steps = detail ? SHUTDOWN_STEPS[detail.state] : [];
  const primary = steps.find((s) => s.primary) ?? null;
  const blocker = detail && primary ? shutdownStepBlocker(detail, primary.to, machineName) : null;
  const button = (s: ShutdownStep) => {
    const denied = s.approval && !canApprove;
    const blocked = s.primary ? blocker : null;
    const title = denied ? "Your role cannot approve shutdowns" : (blocked ?? undefined);
    if (s.note === "required") {
      return (
        <PillButton key={s.to} variant={s.primary ? "primary" : "secondary"} disabled={denied || Boolean(blocked) || busy} title={title} onClick={() => setAsking(s)}>
          {s.label}
        </PillButton>
      );
    }
    return (
      <ConfirmAction
        key={s.to}
        label={s.label}
        question={confirmQuestion(s.to)}
        confirmLabel={s.label}
        tone={s.primary ? "primary" : "secondary"}
        disabled={denied || Boolean(blocked) || busy}
        busy={running === s.to}
        onConfirm={() => void run(s)}
      />
    );
  };

  return (
    <>
      <div className="ast-toolbar pm-toolbar pm-sd-bar">
        {list?.shutdowns.length ? (
          <span className="pm-sd-pick">
            <Select
              id="sd-pick"
              ariaLabel="Shutdown"
              value={shown ? String(shown.id) : ""}
              onChange={(v) => ctx.pick(Number(v))}
              options={list.shutdowns.map((s) => ({ value: String(s.id), label: `${s.name} · ${ctx.day(s.plannedStart)}` }))}
            />
          </span>
        ) : (
          <span className="pm-muted">No shutdowns planned</span>
        )}
        {shown && <StateWord label={stateLabel(list, shown.state)} tone={isActiveShutdown(shown.state) ? "info" : undefined} />}
        {shown && (
          <span className="ast-caption">
            {ctx.day(shown.plannedStart)} → {ctx.day(shown.plannedEnd)}
          </span>
        )}
        {extra}
        <span className="pm-sd-steps">
          {blocker && <span className="ast-caption pm-sd-blocker">{blocker}</span>}
          {steps.filter((s) => !s.primary).map(button)}
          {primary && button(primary)}
          <PillButton variant={primary ? "secondary" : "primary"} onClick={onPlan}>
            Plan a shutdown
          </PillButton>
        </span>
      </div>
      <Notice outcome={outcome} />
      <NoteDialog
        open={asking !== null}
        title={asking?.label ?? ""}
        subtitle={detail?.name}
        label={asking?.to === "restarting" ? "Sign-off" : "Why"}
        hint={asking?.to === "restarting" ? "Who checked what before the restart. Stopping, locking off and safe entry follow the plant's own procedures." : undefined}
        confirm={asking?.label ?? "Save"}
        danger={asking?.to === "cancelled"}
        onClose={() => setAsking(null)}
        onConfirm={(t) => (asking ? run(asking, t) : Promise.resolve({ tone: "bad", text: "" }))}
      />
    </>
  );
}

function confirmQuestion(to: ShutdownState): string {
  switch (to) {
    case "approved":
      return "Approve this plan?";
    case "stopping":
      return "Start the shutdown? Its machines show Maintenance from now and raise no new alarms until the restart.";
    case "in_progress":
      return "Start the work?";
    case "draft":
      return "Back to planning?";
    case "closed":
      return "Close the shutdown?";
    default:
      return "Are you sure?";
  }
}

/* ------------------------------------------------------------ plan / edit */

/** "YYYY-MM-DDTHH:mm" in the browser's zone (datetime-local). */
function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const nextHour = (ms: number) => {
  const d = new Date(ms + 3_600_000);
  d.setMinutes(0, 0, 0);
  return d.getTime();
};

/** Plans a shutdown (with the work collected for it) or edits one. */
export function ShutdownDialog({ ctx, open, edit, onClose }: { ctx: ShutdownCtx; open: boolean; edit: ShutdownDetail | null; onClose: () => void }) {
  const machines = ctx.pms.data?.machineIds ?? [];
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [groups, setGroups] = useState<Set<Candidate["group"]>>(new Set(["stop", "due", "wo", "part"]));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [init, setInit] = useState("");

  useEffect(() => {
    if (!open) return;
    const s = edit ? Date.parse(edit.plannedStart) : nextHour(Date.now());
    const e = edit ? Date.parse(edit.plannedEnd) : s + 3 * 86_400_000;
    const m = new Set(edit ? edit.machineIds : machines);
    setName(edit?.name ?? "");
    setStart(toLocalInput(s));
    setEnd(toLocalInput(e));
    setPicked(m);
    setNotes(edit?.notes ?? "");
    setGroups(new Set(["stop", "due", "wo", "part"]));
    setErr(null);
    setTried(false);
    setInit(JSON.stringify([edit?.name ?? "", toLocalInput(s), toLocalInput(e), [...m].sort(), edit?.notes ?? ""]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startMs = start ? new Date(start).getTime() : NaN;
  const endMs = end ? new Date(end).getTime() : NaN;
  const windowBad = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs <= startMs;
  const horizon = Number.isFinite(endMs) ? (nextShutdownStart(ctx.list?.shutdowns ?? [], endMs, edit?.id ?? null) ?? endMs) : ctx.now;
  const candidates = useMemo(
    () => (edit ? [] : collectCandidates(ctx.pms.data, ctx.parts, ctx.counter, [...picked], horizon, ctx.now)),
    [edit, ctx.pms.data, ctx.parts, ctx.counter, picked, horizon, ctx.now],
  );
  const machinesFixed = edit !== null && !PLANNING_SHUTDOWN.includes(edit.state);
  const dirty = JSON.stringify([name, start, end, [...picked].sort(), notes]) !== init;

  const submit = async () => {
    setTried(true);
    if (!name.trim() || !Number.isFinite(startMs) || !Number.isFinite(endMs) || windowBad || !picked.size) return;
    setBusy(true);
    setErr(null);
    const body = {
      name: name.trim(),
      plannedStart: new Date(startMs).toISOString(),
      plannedEnd: new Date(endMs).toISOString(),
      notes: notes.trim() || null,
      ...(machinesFixed ? {} : { machineIds: [...picked] }),
    };
    const out = edit
      ? await shutdownCall(`/${edit.id}`, "PATCH", body, "Could not save the shutdown")
      : await shutdownCall("", "POST", { ...body, plantId: ctx.plantId, items: candidates.filter((c) => groups.has(c.group)).map((c) => c.item) }, "Could not plan the shutdown");
    setBusy(false);
    if ("error" in out) {
      setErr(out.error);
      return;
    }
    ctx.pick(out.data.id);
    onClose();
  };

  const count = (g: Candidate["group"]) => candidates.filter((c) => c.group === g).length;
  const horizonText = horizon === endMs ? "by the end of this shutdown" : `before the next shutdown (${ctx.day(horizon)})`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={edit ? "Change the shutdown" : "Plan a shutdown"}
      subtitle={edit ? edit.name : "The machines that stop, when, and the work done while they are stopped"}
      busy={busy}
      dirty={dirty}
      onSubmit={() => void submit()}
      width={640}
      footer={
        <>
          <PillButton variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={busy}>
            {edit ? "Save" : "Plan shutdown"}
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="Name" wide required error={tried && !name.trim() ? "Name the shutdown" : null}>
          {(fid, d) => <TextInput id={fid} describedBy={d} value={name} onChange={setName} placeholder="Kiln refractory stop, November" />}
        </Field>
        <Field label="Line stops" required error={tried && !start ? "Pick when the line stops" : null}>
          {(fid, d) => <input id={fid} aria-describedby={d} className="ui-input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />}
        </Field>
        <Field label="Line runs again" required error={windowBad ? "The end must be after the start" : tried && !end ? "Pick when the line runs again" : null}>
          {(fid, d) => <input id={fid} aria-describedby={d} className="ui-input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />}
        </Field>
        <Field label="Machines that stop" wide required hint={machinesFixed ? "Fixed once the shutdown has started" : undefined} error={tried && !picked.size ? "Pick at least one machine" : null}>
          {() => (
            <div className="pm-sd-checks" role="group" aria-label="Machines that stop">
              {machines.map((m) => (
                <label key={m} className="pm-sd-check">
                  <input
                    type="checkbox"
                    checked={picked.has(m)}
                    disabled={machinesFixed}
                    onChange={(e) => {
                      const next = new Set(picked);
                      if (e.target.checked) next.add(m);
                      else next.delete(m);
                      setPicked(next);
                    }}
                  />
                  <span>{machineName(m)}</span>
                </label>
              ))}
            </div>
          )}
        </Field>
        {!edit && (
          <Field label="Work to include" wide hint={`Stopped-machine items that fall due ${horizonText}. Every item can be removed afterwards.`}>
            {() => (
              <div className="pm-sd-checks is-list" role="group" aria-label="Work to include">
                {(Object.keys(CANDIDATE_GROUPS) as Candidate["group"][]).map((g) => (
                  <label key={g} className="pm-sd-check">
                    <input
                      type="checkbox"
                      checked={groups.has(g)}
                      disabled={!count(g)}
                      onChange={(e) => {
                        const next = new Set(groups);
                        if (e.target.checked) next.add(g);
                        else next.delete(g);
                        setGroups(next);
                      }}
                    />
                    <span>{CANDIDATE_GROUPS[g]}</span>
                    <span className="ast-num pm-muted">{count(g)}</span>
                  </label>
                ))}
              </div>
            )}
          </Field>
        )}
        <Field label="Notes" wide>
          {(fid, d) => <TextArea id={fid} describedBy={d} value={notes} onChange={setNotes} rows={2} />}
        </Field>
      </FieldGrid>
      {err && (
        <p className="ui-form-note" data-tone="bad" role="alert">
          {err}
        </p>
      )}
    </Dialog>
  );
}

/** Adds the work that came up since the shutdown was planned. */
export function CollectDialog({ ctx, open, onClose }: { ctx: ShutdownCtx; open: boolean; onClose: () => void }) {
  const d = ctx.detail;
  const [off, setOff] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setOff(new Set());
      setErr(null);
    }
  }, [open]);
  const end = d ? Date.parse(d.plannedEnd) : ctx.now;
  const horizon = d ? (nextShutdownStart(ctx.list?.shutdowns ?? [], end, d.id) ?? end) : ctx.now;
  const candidates = useMemo(
    () => (d ? collectCandidates(ctx.pms.data, ctx.parts, ctx.counter, d.machineIds.filter(ctx.inView), horizon, ctx.now, itemKeys(d)) : []),
    [d, ctx.pms.data, ctx.parts, ctx.counter, ctx.inView, horizon, ctx.now],
  );
  const chosen = candidates.filter((c) => !off.has(c.key));
  const submit = async () => {
    if (!d || !chosen.length) return;
    setBusy(true);
    const out = await shutdownCall(`/${d.id}/items`, "POST", { items: chosen.map((c) => c.item) }, "Could not add the work");
    setBusy(false);
    if ("error" in out) setErr(out.error);
    else onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Look for more work"
      subtitle={d ? `${d.name} · work not in it yet` : undefined}
      busy={busy}
      dirty={off.size > 0}
      onSubmit={() => void submit()}
      width={640}
      footer={
        <>
          <PillButton variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={busy} disabled={!chosen.length}>
            {chosen.length ? `Add ${chosen.length}` : "Nothing to add"}
          </PillButton>
        </>
      }
    >
      {!candidates.length ? (
        <p className="pm-muted">Every item that belongs in this shutdown is already in it.</p>
      ) : (
        <div className="pm-sd-collect">
          {(Object.keys(CANDIDATE_GROUPS) as Candidate["group"][]).map((g) => {
            const list = candidates.filter((c) => c.group === g);
            if (!list.length) return null;
            return (
              <fieldset key={g} className="pm-sd-collect-group">
                <legend>
                  {CANDIDATE_GROUPS[g]} <span className="ast-num pm-muted">{list.length}</span>
                </legend>
                {list.map((c) => (
                  <label key={c.key} className="pm-sd-check">
                    <input
                      type="checkbox"
                      checked={!off.has(c.key)}
                      onChange={(e) => {
                        const next = new Set(off);
                        if (e.target.checked) next.delete(c.key);
                        else next.add(c.key);
                        setOff(next);
                      }}
                    />
                    <span className="pm-sd-check-text">
                      {c.title}
                      <span className="ast-caption">
                        {machineName(c.machineId)} · {c.sub}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
            );
          })}
        </div>
      )}
      {err && (
        <p className="ui-form-note" data-tone="bad" role="alert">
          {err}
        </p>
      )}
    </Dialog>
  );
}

/* ------------------------------------------------------------ found work */

/** Work found while the line is stopped: a work order done with the machine stopped, added to the shutdown. */
export function FoundWorkDialog({ ctx, open, onClose }: { ctx: ShutdownCtx; open: boolean; onClose: () => void }) {
  const d = ctx.detail;
  const priorities = useWorkOrderPriorities();
  const fallback = priorities?.find((p) => p.defaultNew)?.id ?? "";
  const machines = d?.machineIds.filter(ctx.inView) ?? [];
  const owners = ctx.list?.vocabulary.owners ?? [];
  const [machine, setMachine] = useState("");
  const [what, setWhat] = useState("");
  const [part, setPart] = useState("");
  const [priority, setPriority] = useState(fallback);
  const [trade, setTrade] = useState("");
  const [hours, setHours] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (!open) return;
    setMachine(machines[0] ?? "");
    setWhat("");
    setPart("");
    setPriority(fallback);
    setTrade("");
    setHours("");
    setErr(null);
    setTried(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const h = hours.trim() ? Number(hours) : null;
  const hoursBad = h !== null && (!Number.isFinite(h) || h <= 0);
  const submit = async () => {
    setTried(true);
    if (!d || !machine || !what.trim() || !priority || hoursBad) return;
    setBusy(true);
    setErr(null);
    const wo = await ctx.pms.propose({
      machineId: machine,
      title: what.trim(),
      component: part.trim() || null,
      priority,
      actionKind: "repair",
      workMode: "Isolate",
      plannedStart: new Date().toISOString(),
      estimateHours: h,
    });
    if (wo.tone === "bad" || !wo.id) {
      setBusy(false);
      setErr(wo.text);
      return;
    }
    const out = await shutdownCall(`/${d.id}/items`, "POST", { items: [{ kind: "work_order", workOrderId: wo.id, owner: trade || null }] }, "The work order was raised but not added to the shutdown");
    setBusy(false);
    if ("error" in out) setErr(out.error);
    else onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add found work"
      subtitle="Raised as a work order done with the machine stopped"
      busy={busy}
      dirty={what !== "" || part !== "" || hours !== ""}
      onSubmit={() => void submit()}
      width={600}
      footer={
        <>
          <PillButton variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={busy}>
            Add to the shutdown
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="Machine" wide>
          {(fid, ds) => <Select id={fid} describedBy={ds} value={machine} onChange={setMachine} options={machines.map((m) => ({ value: m, label: machineName(m) }))} />}
        </Field>
        <Field label="Work found" wide required error={tried && !what.trim() ? "Say what was found and what work it needs" : null}>
          {(fid, ds) => <TextInput id={fid} describedBy={ds} value={what} onChange={setWhat} placeholder="Tyre 2 shell crack, weld repair" />}
        </Field>
        <Field label="Part of the machine">
          {(fid, ds) => <TextInput id={fid} describedBy={ds} value={part} onChange={setPart} />}
        </Field>
        <Field label="Priority" required>
          {(fid, ds) => <Select id={fid} describedBy={ds} value={priority} onChange={setPriority} options={priorityOptions(priorities, priority)} />}
        </Field>
        <Field label="Trade">
          {(fid, ds) => <Select id={fid} describedBy={ds} value={trade} onChange={setTrade} options={[{ value: "", label: "Not set" }, ...owners.map((o) => ({ value: o.code, label: o.label }))]} />}
        </Field>
        <Field label="Hours of work" hint="Estimate" error={tried && hoursBad ? "Enter hours as a number, like 1.5" : null}>
          {(fid, ds) => <NumberInput id={fid} describedBy={ds} value={hours} onChange={setHours} min={0} step="any" />}
        </Field>
      </FieldGrid>
      {err && (
        <p className="ui-form-note" data-tone="bad" role="alert">
          {err}
        </p>
      )}
    </Dialog>
  );
}

/* ------------------------------------------------------------ lock-off point */

export function PointDialog({ ctx, open, onClose }: { ctx: ShutdownCtx; open: boolean; onClose: () => void }) {
  const d = ctx.detail;
  const machines = d?.machineIds.filter(ctx.inView) ?? [];
  const kinds = ctx.list?.vocabulary.isolationKinds ?? [];
  const [machine, setMachine] = useState("");
  const [kind, setKind] = useState("");
  const [point, setPoint] = useState("");
  const [permit, setPermit] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (!open) return;
    setMachine(machines[0] ?? "");
    setKind(kinds[0]?.id ?? "");
    setPoint("");
    setPermit("");
    setErr(null);
    setTried(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const submit = async () => {
    setTried(true);
    if (!d || !point.trim() || !machine || !kind) return;
    setBusy(true);
    const out = await shutdownCall(`/${d.id}/isolations`, "POST", { machineId: machine, kind, point: point.trim(), permitRef: permit.trim() || null }, "Could not add the point");
    setBusy(false);
    if ("error" in out) setErr(out.error);
    else onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a lock-off point"
      subtitle="An isolator, valve or blank on the plant's isolation map"
      busy={busy}
      dirty={point !== "" || permit !== ""}
      onSubmit={() => void submit()}
      width={560}
      footer={
        <>
          <PillButton variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={busy}>
            Add point
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="Machine">
          {(fid, ds) => <Select id={fid} describedBy={ds} value={machine} onChange={setMachine} options={machines.map((m) => ({ value: m, label: machineName(m) }))} />}
        </Field>
        <Field label="Energy">
          {(fid, ds) => <Select id={fid} describedBy={ds} value={kind} onChange={setKind} options={kinds.map((k) => ({ value: k.id, label: k.label }))} />}
        </Field>
        <Field label="Point" wide required error={tried && !point.trim() ? "Name the point as it is labelled on site" : null}>
          {(fid, ds) => <TextInput id={fid} describedBy={ds} value={point} onChange={setPoint} placeholder="Main drive MCC breaker 3Q1" />}
        </Field>
        <Field label="Permit number" wide>
          {(fid, ds) => <TextInput id={fid} describedBy={ds} value={permit} onChange={setPermit} mono />}
        </Field>
      </FieldGrid>
      {err && (
        <p className="ui-form-note" data-tone="bad" role="alert">
          {err}
        </p>
      )}
    </Dialog>
  );
}

/* ------------------------------------------------------------ small pieces */

export const workState = (r: WorkRow): { label: string; tone?: "warn" | "info" } =>
  r.status === "done"
    ? { label: r.item.done?.result === "Defect" ? "Done · problem found" : r.item.done?.result === "cancelled" ? "Cancelled" : "Done" }
    : r.status === "moved"
      ? { label: "Moved to the next shutdown" }
      : r.item.found
        ? { label: "Found · to do", tone: "warn" }
        : { label: "To do" };

/** Machines of the shutdown in view (the machine bar), in the shutdown's order. */
export const machinesInView = (ctx: ShutdownCtx) => (ctx.detail?.machines ?? []).filter((m) => ctx.inView(m.machineId));
