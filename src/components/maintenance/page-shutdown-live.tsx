"use client";

import React, { useMemo, useState } from "react";
import { ConfirmAction, PillButton } from "@/components/ui";
import { isActiveShutdown, plannedHoursBy } from "@shared/lib/shutdown";
import type { ShutdownIsolation } from "@shared/types/shutdown";
import { Empty, KpiStrip, Section } from "@/components/assets/analysis/an-ui";
import type { PmsModel } from "./pms-model";
import { machineName, pmsCall } from "./pms-model";
import { ItemCell, NoteDialog, Notice, PM_ICON, StateWord } from "./pms-ui";
import { hoursText, inPlan, shutdownCall, shutdownSchedule, stateLabel, toOutcome, type WorkRow } from "./shutdown-model";
import { FoundWorkDialog, PointDialog, machinesInView, workState, type ShutdownCtx } from "./shutdown-ui";
import { DetailLoading, ShutdownFrame, ShutdownGantt, WorkTable } from "./page-shutdown";

/* ==========================================================================
   Maintenance › Shutdown › Lock-off, Live and Restart: the lock-off register
   (recorded only, the plant's procedures decide what is safe), the board
   while the line is stopped — stop seen in the readings, work done against
   the timeline, found work — and the restart: what still stands in the way,
   the sign-off, then the readings after the restart against before the stop.
   ========================================================================== */

const H = 3_600_000;

/* ------------------------------------------------------------ lock-off */

export function PageShutdownLockoff({ pms }: { pms: PmsModel }) {
  return <ShutdownFrame pms={pms}>{(ctx) => (ctx.shown ? <LockoffBody ctx={ctx} /> : <NoShutdown />)}</ShutdownFrame>;
}

const NoShutdown = () => (
  <div className="pg-frame-body">
    <section className="ast-card">
      <Empty title="No shutdown planned. Plan a shutdown to use this view." />
    </section>
  </div>
);

function LockoffBody({ ctx }: { ctx: ShutdownCtx }) {
  const d = ctx.detail;
  const [adding, setAdding] = useState(false);
  const [outcome, setOutcome] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  if (!d) return <DetailLoading />;
  const kinds = ctx.list?.vocabulary.isolationKinds ?? [];
  const kindOf = (id: string) => kinds.find((k) => k.id === id);
  const points = d.isolations.filter((x) => ctx.inView(x.machineId));
  const locked = points.filter((x) => x.isolatedAt && !x.releasedAt);
  const blanks = locked.filter((x) => kindOf(x.kind)?.isBlank);
  const released = points.filter((x) => x.releasedAt).length;
  const canLock = d.state === "stopping" || d.state === "in_progress";
  const open = d.state !== "closed" && d.state !== "cancelled" && d.state !== "restarting";
  const act = async (x: ShutdownIsolation, action: "isolate" | "release" | "undo", good: string) => {
    setBusy(x.id);
    setOutcome(toOutcome(await shutdownCall(`/${d.id}/isolations/${x.id}`, "PATCH", { action }, "Could not save"), good));
    setBusy(null);
  };
  const remove = async (x: ShutdownIsolation) => setOutcome(toOutcome(await shutdownCall(`/${d.id}/isolations/${x.id}`, "DELETE", null, "Could not remove"), `${x.point} deleted`));
  const machines = machinesInView(ctx);

  return (
    <>
      <KpiStrip
        page
        label="Lock-off register"
        items={[
          { label: "Lock-off points", value: `${points.length}`, foot: `${machines.length} machines` },
          { label: "Locked off now", value: `${locked.length}`, foot: canLock ? "recorded by the person who locked off" : "points are locked off once the shutdown starts" },
          { label: "Released", value: `${released}`, foot: "every point is released before the restart" },
          { label: "Blanks still fitted", value: `${blanks.length}`, tone: blanks.length && d.state === "in_progress" ? "warn" : undefined, foot: "every blank is removed before the restart" },
        ]}
      />
      <Notice outcome={outcome} />
      <div className="pg-frame-body">
        <Section
          id="sd-lockoff"
          title="Lock-off register"
          right={
            open ? (
              <PillButton variant="secondary" icon={PM_ICON.lock} onClick={() => setAdding(true)}>
                Add point
              </PillButton>
            ) : undefined
          }
        >
          {!points.length ? (
            <Empty title="No lock-off points recorded. Add each isolator, valve and blank from the plant's isolation map." />
          ) : (
            <div className="ui-table-container ast-table pm-table">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th className="pm-grow">Point</th>
                    <th>Permit</th>
                    <th>Locked off</th>
                    <th>Released</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                {machines.map((m) => {
                  const list = points.filter((x) => x.machineId === m.machineId);
                  return (
                    <tbody key={m.machineId}>
                      <tr className="pm-sd-group">
                        <th colSpan={5} scope="rowgroup">
                          <span className="pm-sd-group-name">{machineName(m.machineId)}</span>
                          <span className="ast-caption">{list.length ? `${list.filter((x) => x.isolatedAt && !x.releasedAt).length} of ${list.length} locked off` : "no points recorded"}</span>
                        </th>
                      </tr>
                      {list.map((x) => {
                        const k = kindOf(x.kind);
                        return (
                          <tr key={x.id}>
                            <td className="pm-grow">
                              <ItemCell icon={PM_ICON.lock} tone={x.isolatedAt && !x.releasedAt && k?.isBlank && d.state === "in_progress" ? "warn" : undefined} title={x.point} sub={k?.label ?? x.kind} />
                            </td>
                            <td className="ast-num">{x.permitRef ?? <span className="pm-muted">—</span>}</td>
                            <td>{x.isolatedAt ? <span className="ast-cell-stack"><span>{ctx.when(x.isolatedAt)}</span><span className="ast-cell-sub">{x.isolatedBy ?? "—"}</span></span> : <span className="pm-muted">Not yet</span>}</td>
                            <td>{x.releasedAt ? <span className="ast-cell-stack"><span>{ctx.when(x.releasedAt)}</span><span className="ast-cell-sub">{x.releasedBy ?? "—"}</span></span> : <span className="pm-muted">{x.isolatedAt ? "Not yet" : "—"}</span>}</td>
                            <td className="pm-sd-act">
                              {!x.isolatedAt && canLock && (
                                <PillButton variant="secondary" loading={busy === x.id} onClick={() => void act(x, "isolate", `${x.point} ${k?.isBlank ? "fitted" : "locked off"}`)}>
                                  {k?.isBlank ? "Fit blank" : "Lock off"}
                                </PillButton>
                              )}
                              {x.isolatedAt && !x.releasedAt && open && (
                                <PillButton variant="secondary" loading={busy === x.id} onClick={() => void act(x, "release", `${x.point} ${k?.isBlank ? "removed" : "released"}`)}>
                                  {k?.isBlank ? "Remove blank" : "Release"}
                                </PillButton>
                              )}
                              {x.isolatedAt && open && (
                                <ConfirmAction label="Undo" question={x.releasedAt ? "Take back the release?" : "Take back the lock-off?"} confirmLabel="Take back" tone="secondary" onConfirm={() => void act(x, "undo", `${x.point}: taken back`)} />
                              )}
                              {!x.isolatedAt && open && <ConfirmAction label="Delete" question="Delete this point?" confirmLabel="Delete" tone="secondary" onConfirm={() => void remove(x)} />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  );
                })}
              </table>
            </div>
          )}
          <p className="ast-caption pm-foot">Recorded only. Stopping, locking off, testing for zero energy and safe entry follow the plant&apos;s own procedures and permits.</p>
        </Section>
      </div>
      <PointDialog ctx={ctx} open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

/* ------------------------------------------------------------ live */

export function PageShutdownLive({ pms }: { pms: PmsModel }) {
  return <ShutdownFrame pms={pms}>{(ctx) => (ctx.shown ? <LiveBody ctx={ctx} /> : <NoShutdown />)}</ShutdownFrame>;
}

function LiveBody({ ctx }: { ctx: ShutdownCtx }) {
  const d = ctx.detail;
  const [found, setFound] = useState(false);
  const [outcome, setOutcome] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [problem, setProblem] = useState<WorkRow | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [moving, setMoving] = useState<WorkRow | null>(null);
  const stopAt = d?.phases.stopping ? Date.parse(d.phases.stopping) : null;
  const started = d ? isActiveShutdown(d.state) || d.state === "closed" : false;
  const plannedSchedule = useMemo(() => (d && stopAt ? shutdownSchedule(d, ctx.rows, stopAt) : null), [d, ctx.rows, stopAt]);
  // What is left, from now: the expected end.
  const restSchedule = useMemo(() => (d && stopAt ? shutdownSchedule(d, ctx.rows, Math.max(ctx.now, stopAt), true, stopAt) : null), [d, ctx.rows, stopAt, ctx.now]);
  if (!d) return <DetailLoading />;
  if (!started || !stopAt || !plannedSchedule || !restSchedule)
    return (
      <div className="pg-frame-body">
        <section className="ast-card">
          <Empty title={`The live board starts when the shutdown starts. This one is: ${stateLabel(ctx.list, d.state)}.`} />
        </section>
      </div>
    );

  const plan = inPlan(ctx.rows);
  const done = plan.filter((r) => r.status === "done");
  const openRows = plan.filter((r) => r.status === "open");
  const doneH = done.reduce((s, r) => s + (r.trade && r.hours ? r.hours : 0), 0);
  const expectedH = plannedHoursBy(plannedSchedule, ctx.now);
  const behind = expectedH - doneH;
  const plannedEnd = Date.parse(d.plannedEnd);
  const expectedEnd = restSchedule.blocks.length ? restSchedule.end : null;
  const late = expectedEnd !== null ? (expectedEnd - plannedEnd) / H : null;
  const foundRows = plan.filter((r) => r.item.found);
  const machines = machinesInView(ctx);

  const recordTask = async (r: WorkRow, result: "Pass" | "Defect", note?: string) => {
    const out = await pmsCall<{ workOrderId: number | null }>("/api/maintenance", "POST", { machineId: r.machineId, kind: r.item.checklistKind, taskId: r.item.taskId, result, note }, "Could not record the result");
    if ("error" in out) return { tone: "bad" as const, text: out.error };
    // A problem found opens a repair work order: it is work found during this shutdown.
    if (result === "Defect" && out.data.workOrderId) await shutdownCall(`/${d.id}/items`, "POST", { items: [{ kind: "work_order", workOrderId: out.data.workOrderId }] }, "");
    return { tone: "good" as const, text: result === "Pass" ? `${r.title}: done` : `${r.title}: problem recorded, repair work order added` };
  };
  const replacePart = async (r: WorkRow) => {
    const counterH = ctx.counter(r.machineId);
    const out = await pmsCall(`/api/maintenance/parts/${r.item.partId}/replace`, "POST", { counterH }, "Could not record the replacement");
    setOutcome("error" in out ? { tone: "bad", text: out.error } : { tone: "good", text: `${r.title}: replaced` });
  };

  return (
    <>
      <KpiStrip
        page
        label="Shutdown live"
        items={[
          d.state === "closed" && d.phases.closed
            ? { label: "Line stopped for", value: hoursText((Date.parse(d.phases.closed) - stopAt) / H), foot: `of ${hoursText((plannedEnd - Date.parse(d.plannedStart)) / H)} planned · closed ${ctx.day(d.phases.closed)}` }
            : { label: "Since the stop began", value: hoursText((ctx.now - stopAt) / H), foot: `of ${hoursText((plannedEnd - Date.parse(d.plannedStart)) / H)} planned · ${stateLabel(ctx.list, d.state)}` },
          { label: "Work done", value: `${done.length}`, unit: `/ ${plan.length}`, bar: plan.length ? (done.length / plan.length) * 100 : 0, foot: `${foundRows.length} found during the shutdown` },
          Math.abs(behind) < 0.5
            ? { label: "Against the plan", value: "On plan", text: true, foot: `${Math.round(doneH)} h of work done · ${Math.round(expectedH)} h expected by now` }
            : {
                label: "Against the plan",
                value: `${Math.round(Math.abs(behind) * 10) / 10}`,
                unit: behind > 0 ? "h behind" : "h ahead",
                tone: behind > 0 ? "warn" : undefined,
                foot: `${Math.round(doneH)} h of work done · ${Math.round(expectedH)} h expected by now`,
              },
          expectedEnd === null
            ? { label: "Work ends", value: openRows.length ? "—" : "Done", text: true, foot: openRows.length ? "open work has no estimate, trade or crew" : "all work done or moved" }
            : late !== null && late > 0
              ? { label: "Work ends", value: `+${hoursText(late)}`, text: true, tone: "warn", foot: `after the planned restart · ${ctx.day(expectedEnd)}` }
              : { label: "Work ends", value: "On time", text: true, foot: `${ctx.day(expectedEnd)} · ${hoursText(-(late ?? 0))} before the planned restart` },
        ]}
      />
      <Notice outcome={outcome} />
      <div className="pg-frame-body">
        <Section id="sd-machines" title="Machines" right={<span className="ast-caption">Stop and start read from the run signal</span>}>
          <div className="ui-table-container ast-table pm-table">
            <table className="ui-table">
              <thead>
                <tr>
                  <th className="pm-grow">Machine</th>
                  <th>Stopped</th>
                  <th className="ast-num-col">Done</th>
                  <th className="ast-num-col">Found</th>
                  <th className="ast-num-col">Hours left</th>
                  <th>Work ends</th>
                  <th className="pm-sd-progress-col">Progress</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => {
                  const list = plan.filter((r) => r.machineId === m.machineId);
                  const n = list.filter((r) => r.status === "done").length;
                  const left = list.reduce((s, r) => s + (r.status === "open" && r.hours ? r.hours : 0), 0);
                  const ends = restSchedule.blocks.some((b) => b.machineId === m.machineId) ? restSchedule.machineEnd.get(m.machineId)! : null;
                  return (
                    <tr key={m.machineId}>
                      <td className="pm-grow">{machineName(m.machineId)}</td>
                      <td>
                        {!m.runSignal ? (
                          <span className="pm-muted">No run signal</span>
                        ) : m.stoppedAt ? (
                          ctx.when(m.stoppedAt)
                        ) : d.state === "stopping" || d.state === "in_progress" ? (
                          <StateWord label="Still running" tone="warn" />
                        ) : (
                          <span className="pm-muted">Did not stop</span>
                        )}
                      </td>
                      <td className="ast-num">
                        {n} / {list.length}
                      </td>
                      <td className="ast-num">{list.filter((r) => r.item.found).length || <span className="pm-muted">—</span>}</td>
                      <td className="ast-num">{left ? hoursText(left) : <span className="pm-muted">—</span>}</td>
                      <td>{ends ? <span data-tone={ends > plannedEnd ? "warn" : undefined}>{ctx.day(ends)}</span> : <span className="pm-muted">—</span>}</td>
                      <td className="pm-sd-progress-col">
                        <span className="pm-life-bar" aria-label={`${n} of ${list.length} done`}>
                          <span style={{ width: `${list.length ? (n / list.length) * 100 : 0}%` }} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="sd-timeline-live" title="Timeline">
          <ShutdownGantt ctx={ctx} schedule={restSchedule} start={stopAt} editable={false} live />
          <p className="ast-caption pm-foot">The work still open, from now, with the crew as planned.</p>
        </Section>

        <Section id="sd-open" title="Open work" right={<span className="ast-caption">{openRows.length} {openRows.length === 1 ? "item" : "items"}</span>}>
          {!openRows.length ? (
            <Empty title="All the work is done or moved to the next shutdown." />
          ) : (
            <div className="ui-table-container ast-table pm-table">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th className="pm-grow">Work</th>
                    <th>Machine</th>
                    <th className="ast-num-col">Hours</th>
                    <th>State</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {openRows.map((r) => (
                    <tr key={r.item.id}>
                      <td className="pm-grow">
                        <ItemCell icon={r.kind === "work_order" ? PM_ICON.wo : r.kind === "part" ? PM_ICON.part : PM_ICON.plan} tone={r.item.found ? "warn" : undefined} title={r.title} sub={r.sub} />
                      </td>
                      <td>{machineName(r.machineId)}</td>
                      <td className="ast-num">{r.hours ? `${r.hours} h` : <span className="pm-muted">—</span>}</td>
                      <td>
                        <StateWord label={workState(r).label} tone={workState(r).tone} />
                      </td>
                      <td className="pm-sd-act">
                        {r.kind === "task" && d.state === "in_progress" && (
                          <>
                            <PillButton
                              variant="secondary"
                              icon={PM_ICON.check}
                              loading={saving === r.item.id}
                              disabled={saving !== null}
                              onClick={async () => {
                                setSaving(r.item.id);
                                setOutcome(await recordTask(r, "Pass"));
                                setSaving(null);
                              }}
                            >
                              Done
                            </PillButton>
                            <PillButton variant="secondary" onClick={() => setProblem(r)}>
                              Problem found
                            </PillButton>
                          </>
                        )}
                        {r.kind === "part" && d.state === "in_progress" && (
                          <ConfirmAction label="Replaced" question="Record the part as replaced now?" confirmLabel="Replaced" tone="secondary" disabled={ctx.counter(r.machineId) === null} onConfirm={() => void replacePart(r)} />
                        )}
                        {r.kind === "work_order" && <span className="ast-caption">Finish it on the work order</span>}
                        {d.state !== "restarting" && (
                          <PillButton variant="secondary" onClick={() => setMoving(r)}>
                            Move
                          </PillButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section
          id="sd-found"
          title="Found during the shutdown"
          right={
            d.state === "in_progress" || d.state === "stopping" ? (
              <PillButton variant="secondary" onClick={() => setFound(true)}>
                Add found work
              </PillButton>
            ) : undefined
          }
        >
          {!foundRows.length ? <Empty title="Nothing found yet. Work found while the line is stopped goes here and moves the expected end." /> : <WorkTable ctx={ctx} rows={foundRows} compact />}
        </Section>
      </div>
      <FoundWorkDialog ctx={ctx} open={found} onClose={() => setFound(false)} />
      <NoteDialog
        open={moving !== null}
        title="Move to the next shutdown"
        subtitle={moving?.title}
        label="Why it waits"
        confirm="Move"
        onClose={() => setMoving(null)}
        onConfirm={async (reason) => {
          const o = toOutcome(await shutdownCall(`/${d.id}/items/${moving!.item.id}`, "PATCH", { move: true, reason }, "Could not move"), `${moving!.title} moved to the next shutdown`);
          setOutcome(o);
          return o;
        }}
      />
      <NoteDialog
        open={problem !== null}
        title="Problem found"
        subtitle={problem?.title}
        label="What was found"
        hint="Raises a repair work order and adds it to this shutdown"
        confirm="Record problem"
        onClose={() => setProblem(null)}
        onConfirm={async (note) => {
          const o = await recordTask(problem!, "Defect", note);
          setOutcome(o);
          return o;
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------ restart */

export function PageShutdownRestart({ pms }: { pms: PmsModel }) {
  return <ShutdownFrame pms={pms}>{(ctx) => (ctx.shown ? <RestartBody ctx={ctx} /> : <NoShutdown />)}</ShutdownFrame>;
}

function RestartBody({ ctx }: { ctx: ShutdownCtx }) {
  const d = ctx.detail;
  const [sort, setSort] = useState<"change" | "machine">("change");
  if (!d) return <DetailLoading />;
  const kinds = ctx.list?.vocabulary.isolationKinds ?? [];
  const isBlank = (k: string) => Boolean(kinds.find((x) => x.id === k)?.isBlank);
  const locked = d.isolations.filter((x) => x.isolatedAt && !x.releasedAt);
  const lockedPoints = locked.filter((x) => !isBlank(x.kind)).length;
  const blanks = locked.filter((x) => isBlank(x.kind)).length;
  const openWork = d.work.filter((i) => !i.moved && !i.done).length;
  const noAsLeft = inPlan(ctx.allRows).filter((r) => r.kind === "work_order" && r.status === "done" && r.wo && r.item.done?.result !== "cancelled" && !r.wo.asLeft).length;
  const signOff = d.events.find((e) => e.action === "transition" && e.to === "restarting");
  const restarted = d.state === "restarting" || d.state === "closed";
  const machines = machinesInView(ctx);

  const gates: { label: string; left: number; hint: string; blocking: boolean }[] = [
    { label: "Every lock-off released", left: lockedPoints, hint: "Lock-off view", blocking: true },
    { label: "Every blank or spectacle plate removed", left: blanks, hint: "Lock-off view", blocking: true },
    { label: "Every work item done or moved to the next shutdown", left: openWork, hint: "Live view", blocking: true },
    { label: "As-left readings written on the finished work orders", left: noAsLeft, hint: "Work orders", blocking: false },
  ];

  const span = (c: { rangeLo: number | null; rangeHi: number | null }) => (c.rangeLo !== null && c.rangeHi !== null && c.rangeHi > c.rangeLo ? c.rangeHi - c.rangeLo : null);
  const share = (c: (typeof d.comparison)[number]) => {
    const s = span(c);
    return c.before !== null && c.after !== null && s ? (c.after - c.before) / s : null;
  };
  const comparison = d.comparison
    .filter((c) => ctx.inView(c.machineId))
    .slice()
    .sort((a, b) => (sort === "change" ? Math.abs(share(b) ?? -1) - Math.abs(share(a) ?? -1) : 0));
  const fmt = (v: number | null, dec: number | null) => (v === null ? "—" : v.toFixed(Math.max(0, Math.min(3, dec ?? 1))));
  const withUnit = (v: number | null, dec: number | null, unit: string) => (v === null ? "—" : `${fmt(v, dec)} ${unit}`.trim());

  return (
    <>
      <KpiStrip
        page
        label="Restart"
        items={[
          { label: "Still locked off", value: `${lockedPoints}`, tone: lockedPoints && !restarted ? "warn" : undefined, foot: "released before the restart" },
          { label: "Blanks fitted", value: `${blanks}`, tone: blanks && !restarted ? "warn" : undefined, foot: "removed before the restart" },
          { label: "Work open", value: `${openWork}`, tone: openWork && !restarted ? "warn" : undefined, foot: "done, or moved to the next shutdown" },
          signOff ? { label: "Restart approved", value: signOff.actor ?? "—", text: true, foot: ctx.when(signOff.at) } : { label: "Restart approved", value: "Not yet", text: true, foot: "an engineer signs the restart off" },
        ]}
      />
      <div className="pg-frame-body">
        <div className="pm-split is-even">
          <Section id="sd-gates" title="Before the restart">
            <ul className="pm-rows">
              {gates.map((g) => (
                <li key={g.label}>
                  <span className="pm-row-title">{g.label}</span>
                  <span className="ast-caption">{g.blocking ? g.hint : `${g.hint} · does not hold the restart`}</span>
                  <StateWord label={g.left ? `${g.left} left` : "Done"} tone={g.left && g.blocking && !restarted ? "warn" : undefined} />
                </li>
              ))}
              {signOff?.reason && (
                <li>
                  <span className="pm-row-title">Sign-off: {signOff.reason}</span>
                  <span className="ast-caption">
                    {signOff.actor ?? "—"} · {ctx.when(signOff.at)}
                  </span>
                </li>
              )}
            </ul>
            <p className="ast-caption pm-foot">The restart is approved with the button at the top once nothing is left. ULTRON records the checks; the plant&apos;s procedures decide when it is safe.</p>
          </Section>
          <Section id="sd-back" title="Back running">
            {!restarted ? (
              <Empty title="Shown once the restart is approved." />
            ) : (
              <ul className="pm-rows">
                {machines.map((m) => (
                  <li key={m.machineId}>
                    <span className="pm-row-title">{machineName(m.machineId)}</span>
                    <span className="ast-caption">
                      {!m.runSignal
                        ? "No run signal"
                        : m.startedAt
                          ? `Running since ${ctx.when(m.startedAt)}`
                          : m.runningNow
                            ? m.stoppedAt
                              ? "Running"
                              : "Did not stop during the shutdown"
                            : "Not running yet"}
                    </span>
                    <StateWord label={!m.runSignal ? "—" : m.startedAt || m.runningNow ? "Running" : "Stopped"} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <Section
          id="sd-compare"
          title="Readings after the restart"
          right={
            restarted && comparison.length ? (
              <span className="pm-sd-sort">
                <button type="button" className="pm-link" aria-pressed={sort === "change"} onClick={() => setSort("change")}>
                  Biggest change first
                </button>
                <span className="pm-muted">·</span>
                <button type="button" className="pm-link" aria-pressed={sort === "machine"} onClick={() => setSort("machine")}>
                  By machine
                </button>
              </span>
            ) : undefined
          }
        >
          {!restarted ? (
            <Empty title={`Once the restart is approved: the first ${d.compareWindowH} h of readings against the ${d.compareWindowH} h before the stop.`} />
          ) : !comparison.length ? (
            <Empty title="No readings to compare yet." />
          ) : (
            <div className="ui-table-container ast-table pm-table">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th className="pm-grow">Reading</th>
                    <th>Machine</th>
                    <th className="ast-num-col">Before the stop</th>
                    <th className="ast-num-col">After the restart</th>
                    <th className="ast-num-col">Change</th>
                    <th className="pm-sd-progress-col">Of its range</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((c) => {
                    const s = share(c);
                    const diff = c.before !== null && c.after !== null ? c.after - c.before : null;
                    return (
                      <tr key={c.measurementId}>
                        <td className="pm-grow">
                          <span className="ast-cell-stack">
                            <span className="ast-cell-title">{c.name}</span>
                            <span className="ast-cell-sub">{c.tag}</span>
                          </span>
                        </td>
                        <td>{machineName(c.machineId)}</td>
                        <td className="ast-num">{withUnit(c.before, c.decimals, c.unit)}</td>
                        <td className="ast-num">{withUnit(c.after, c.decimals, c.unit)}</td>
                        <td className="ast-num">{diff === null ? "—" : `${diff > 0 ? "+" : ""}${fmt(diff, c.decimals)}`}</td>
                        <td className="pm-sd-progress-col">
                          {s === null ? (
                            <span className="pm-muted">—</span>
                          ) : (
                            <span className="pm-sd-shift" title={`${Math.round(s * 1000) / 10} % of the range`}>
                              <span className="pm-sd-shift-track">
                                <i style={s >= 0 ? { left: "50%", width: `${Math.min(50, Math.abs(s) * 50)}%` } : { right: "50%", width: `${Math.min(50, Math.abs(s) * 50)}%` }} />
                              </span>
                              <span className="ast-num">{`${s > 0 ? "+" : ""}${Math.round(s * 1000) / 10} %`}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {restarted && <p className="ast-caption pm-foot">Averages of good readings: {d.compareWindowH} h before the stop began, and the first {d.compareWindowH} h after the restart was approved. A machine still warming up reads differently from normal running.</p>}
        </Section>
      </div>
    </>
  );
}
