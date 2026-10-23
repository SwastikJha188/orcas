"use client";

import React, { useMemo, useState } from "react";
import { ConfirmAction, Loading as LoadingState, PillButton, Select, rowActivate } from "@/components/ui";
import { READINESS_KEYS, READINESS_LABEL, READINESS_STATE_LABEL, readinessBlockers } from "@shared/lib/pms";
import { PLANNING_SHUTDOWN, isActiveShutdown, isOpenShutdown, type ShutdownSchedule } from "@shared/lib/shutdown";
import type { PartsState, ShutdownCrew } from "@shared/types/shutdown";
import { Empty, KpiStrip, Section } from "@/components/assets/analysis/an-ui";
import type { PmsModel } from "./pms-model";
import { machineName } from "./pms-model";
import { Loading } from "./page-overview";
import { ItemCell, NoteDialog, Notice, PM_ICON, StateWord, setPmsFocus, usePmsNav } from "./pms-ui";
import {
  CANDIDATE_GROUPS,
  collectCandidates,
  csvName,
  downloadText,
  hoursText,
  inPlan,
  offTimeline,
  shutdownCall,
  shutdownCsv,
  shutdownSchedule,
  stateLabel,
  toOutcome,
  tradeLabel,
  type Candidate,
  type WorkRow,
} from "./shutdown-model";
import { CollectDialog, ShutdownBar, ShutdownDialog, machinesInView, useShutdownCtx, workState, type ShutdownCtx } from "./shutdown-ui";

/* ==========================================================================
   Maintenance › Shutdown › Plan and Ready: one planned stop of the line —
   which machines, the window, the work done while they are stopped — and
   whether it is ready: parts, crews and a timeline that fits the window.
   Lock-off, Live and Restart are in page-shutdown-live.tsx.
   ========================================================================== */

const H = 3_600_000;

/** The frame every Shutdown view shares: the bar, the dialogs, then the view. */
export function ShutdownFrame({ pms, children }: { pms: PmsModel; children: (ctx: ShutdownCtx) => React.ReactNode }) {
  const ctx = useShutdownCtx(pms);
  const [dialog, setDialog] = useState<"plan" | "edit" | null>(null);
  if (!pms.data) return <Loading pms={pms} what="the shutdowns" />;
  return (
    <div className="ast-root pg-frame pm-page">
      <ShutdownBar
        ctx={ctx}
        onPlan={() => setDialog("plan")}
        extra={
          ctx.detail && isOpenShutdown(ctx.detail.state) ? (
            <PillButton variant="secondary" onClick={() => setDialog("edit")}>
              Change
            </PillButton>
          ) : null
        }
      />
      {ctx.listLoading ? (
        <section className="ast-card">
          <LoadingState label="Loading the shutdowns…" rows={5} />
        </section>
      ) : (
        children(ctx)
      )}
      <ShutdownDialog ctx={ctx} open={dialog !== null} edit={dialog === "edit" ? (ctx.detail ?? null) : null} onClose={() => setDialog(null)} />
    </div>
  );
}

/** Shown while the picked shutdown's detail loads. */
export const DetailLoading = () => (
  <section className="ast-card">
    <LoadingState label="Loading the shutdown…" rows={5} />
  </section>
);

/* ------------------------------------------------------------ plan */

export function PageShutdownPlan({ pms }: { pms: PmsModel }) {
  return <ShutdownFrame pms={pms}>{(ctx) => (ctx.shown ? <PlanBody ctx={ctx} /> : <Waiting ctx={ctx} />)}</ShutdownFrame>;
}

const GROUP_SHORT: Record<Candidate["group"], string> = { stop: "Every stop", due: "Due, machine stopped", wo: "Work orders", part: "Parts to replace" };

/** No shutdown yet: the work that waits for one, per machine. */
function Waiting({ ctx }: { ctx: ShutdownCtx }) {
  const ids = ctx.pms.data?.machineIds;
  const machines = useMemo(() => ids ?? [], [ids]);
  const candidates = useMemo(() => collectCandidates(ctx.pms.data, ctx.parts, ctx.counter, machines, ctx.now, ctx.now), [ctx.pms.data, ctx.parts, ctx.counter, machines, ctx.now]);
  const groups = Object.keys(CANDIDATE_GROUPS) as Candidate["group"][];
  return (
    <div className="pg-frame-body">
      <Section id="sd-waiting" title="Work waiting for a stop" right={<span className="ast-caption">Done at every stop, or due now and only possible with the machine stopped</span>}>
        {!candidates.length ? (
          <Empty title="No work waits for a stopped machine." />
        ) : (
          <div className="ui-table-container ast-table pm-table">
            <table className="ui-table">
              <thead>
                <tr>
                  <th className="pm-grow">Machine</th>
                  {groups.map((g) => (
                    <th key={g} className="ast-num-col" title={CANDIDATE_GROUPS[g]}>
                      {GROUP_SHORT[g]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => {
                  const list = candidates.filter((c) => c.machineId === m);
                  if (!list.length) return null;
                  return (
                    <tr key={m}>
                      <td className="pm-grow">{machineName(m)}</td>
                      {groups.map((g) => {
                        const n = list.filter((c) => c.group === g).length;
                        return (
                          <td key={g} className="ast-num">
                            {n || <span className="pm-muted">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="ast-caption pm-foot">Plan a shutdown to collect this work, give it a crew and a timeline, and run the stop from here.</p>
      </Section>
    </div>
  );
}

function PlanBody({ ctx }: { ctx: ShutdownCtx }) {
  const d = ctx.detail;
  const [collect, setCollect] = useState(false);
  if (!d) return <DetailLoading />;
  const rows = ctx.rows;
  const plan = inPlan(rows);
  const hours = plan.reduce((s, r) => s + (r.hours ?? 0), 0);
  const { noHours } = offTimeline(rows);
  const windowH = (Date.parse(d.plannedEnd) - Date.parse(d.plannedStart)) / H;
  const n = (k: WorkRow["kind"]) => plan.filter((r) => r.kind === k).length;
  const moved = rows.length - plan.length;
  const machines = machinesInView(ctx);
  const canAdd = isOpenShutdown(d.state) && d.state !== "restarting";
  return (
    <>
      <KpiStrip
        page
        label="Shutdown plan"
        items={[
          { label: "Planned stop", value: hoursText(windowH), foot: `${ctx.day(d.plannedStart)} → ${ctx.day(d.plannedEnd)}` },
          { label: "Machines", value: `${machines.length}`, foot: machines.map((m) => machineName(m.machineId)).join(" · ") || "—" },
          { label: "Work", value: `${plan.length}`, foot: `${n("task")} checklist · ${n("work_order")} work orders · ${n("part")} parts${moved ? ` · ${moved} moved` : ""}` },
          { label: "Work hours", value: hours ? `${Math.round(hours * 10) / 10}` : "—", unit: hours ? "h" : undefined, tone: noHours ? "warn" : undefined, foot: noHours ? `${noHours} items without an estimate` : "estimated" },
        ]}
      />
      <div className="pg-frame-body">
        <Section
          id="sd-work"
          title="Work in this shutdown"
          right={
            <span className="pm-sd-right">
              {rows.length > 0 && (
                <PillButton variant="secondary" onClick={() => downloadText(csvName(d), shutdownCsv(d, rows, ctx.list))}>
                  Download CSV
                </PillButton>
              )}
              {canAdd && (
                <PillButton variant="secondary" onClick={() => setCollect(true)}>
                  Look for more work
                </PillButton>
              )}
            </span>
          }
        >
          <WorkTable ctx={ctx} rows={rows} />
        </Section>
        {ctx.list?.sapConnected && <SapOrders ctx={ctx} />}
        <Section id="sd-changes" title="Changes">
          <ChangeList ctx={ctx} />
        </Section>
      </div>
      <CollectDialog ctx={ctx} open={collect} onClose={() => setCollect(false)} />
    </>
  );
}

const KIND_ICON = (r: WorkRow) => (r.kind === "work_order" ? PM_ICON.wo : r.kind === "part" ? PM_ICON.part : r.item.checklistKind === "sensor" ? PM_ICON.sensor : PM_ICON.plan);

/** Hours typed in a table cell, saved when the field is left. */
function HoursCell({ value, label, onSave }: { value: number | null; label: string; onSave: (v: number | null) => void }) {
  const [text, setText] = useState(value === null ? "" : String(value));
  const commit = () => {
    const t = text.trim().replace(",", ".");
    const v = t ? Number(t) : null;
    if (v !== null && (!Number.isFinite(v) || v <= 0)) {
      setText(value === null ? "" : String(value));
      return;
    }
    if (v !== value) onSave(v);
  };
  return (
    <input
      className="ui-input pm-sd-num"
      inputMode="decimal"
      aria-label={label}
      placeholder="h"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

/** The work list, grouped by machine. */
export function WorkTable({ ctx, rows, compact = false }: { ctx: ShutdownCtx; rows: WorkRow[]; compact?: boolean }) {
  const d = ctx.detail!;
  const nav = usePmsNav();
  const [outcome, setOutcome] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [moving, setMoving] = useState<WorkRow | null>(null);
  const planning = PLANNING_SHUTDOWN.includes(d.state);
  const editable = isOpenShutdown(d.state) && d.state !== "restarting";
  const owners = ctx.list?.vocabulary.owners ?? [];
  const patch = async (r: WorkRow, body: Record<string, unknown>, good: string) => setOutcome(toOutcome(await shutdownCall(`/${d.id}/items/${r.item.id}`, "PATCH", body, "Could not save"), good));
  const remove = async (r: WorkRow) => setOutcome(toOutcome(await shutdownCall(`/${d.id}/items/${r.item.id}`, "DELETE", null, "Could not remove"), `${r.title} removed`));
  const machines = machinesInView(ctx);
  if (!rows.length) return <Empty title="No work in this shutdown yet. Look for more work to collect it." />;
  return (
    <>
      <Notice outcome={outcome} />
      <div className="ui-table-container ast-table pm-table">
        <table className="ui-table pm-sd-work">
          <thead>
            <tr>
              <th className="pm-grow">Work</th>
              <th>Trade</th>
              <th className="ast-num-col">Hours</th>
              <th>State</th>
              {!compact && editable && <th aria-label="Actions" />}
            </tr>
          </thead>
          {machines.map((m) => {
            const list = rows.filter((r) => r.machineId === m.machineId);
            if (!list.length) return null;
            const h = inPlan(list).reduce((s, r) => s + (r.hours ?? 0), 0);
            const done = list.filter((r) => r.status === "done").length;
            return (
              <tbody key={m.machineId}>
                <tr className="pm-sd-group">
                  <th colSpan={!compact && editable ? 5 : 4} scope="rowgroup">
                    <span className="pm-sd-group-name">{machineName(m.machineId)}</span>
                    <span className="ast-caption">
                      {list.length} {list.length === 1 ? "item" : "items"} · {h ? `${Math.round(h * 10) / 10} h` : "no estimate"}
                      {isActiveShutdown(d.state) || d.state === "closed" ? ` · ${done} done` : ""}
                    </span>
                  </th>
                </tr>
                {list.map((r) => {
                  const st = workState(r);
                  return (
                    <tr key={r.item.id} data-moved={r.status === "moved" || undefined}>
                      <td className="pm-grow">
                        {r.wo ? (
                          <button
                            type="button"
                            className="pm-sd-cellbtn"
                            onClick={() => {
                              setPmsFocus(`w:${r.wo!.id}`);
                              nav("work");
                            }}
                          >
                            <ItemCell icon={KIND_ICON(r)} tone={r.item.found ? "warn" : undefined} title={r.title} sub={r.sub} />
                          </button>
                        ) : (
                          <ItemCell icon={KIND_ICON(r)} tone={r.item.found ? "warn" : undefined} title={r.title} sub={r.sub} />
                        )}
                      </td>
                      <td>
                        {r.kind === "task" || !editable ? (
                          <span title={tradeLabel(ctx.list, r.trade)}>{r.trade ?? <span className="pm-muted">—</span>}</span>
                        ) : (
                          <Select
                            id={`sd-trade-${r.item.id}`}
                            ariaLabel={`Trade for ${r.title}`}
                            value={r.trade ?? ""}
                            onChange={(v) => void patch(r, { owner: v || null }, `${r.title}: ${tradeLabel(ctx.list, v || null)}`)}
                            options={[{ value: "", label: "Not set" }, ...owners.map((o) => ({ value: o.code, label: o.code }))]}
                          />
                        )}
                      </td>
                      <td className="ast-num">
                        {r.kind === "work_order" || !editable ? (
                          <span title={r.kind === "work_order" ? "Set on the work order" : undefined}>{r.hours ? `${r.hours} h` : <span className="pm-muted">—</span>}</span>
                        ) : (
                          <HoursCell key={`${r.item.id}-${r.hours}`} value={r.hours} label={`Hours for ${r.title}`} onSave={(v) => void patch(r, { estimateHours: v }, `${r.title}: ${v ?? "no"} h`)} />
                        )}
                      </td>
                      <td>
                        <StateWord label={st.label} tone={st.tone} />
                      </td>
                      {!compact && editable && (
                        <td className="pm-sd-act">
                          {planning ? (
                            <ConfirmAction label="Remove" question="Remove from this shutdown?" confirmLabel="Remove" tone="secondary" onConfirm={() => void remove(r)} />
                          ) : r.status === "moved" ? (
                            <PillButton variant="secondary" onClick={() => void patch(r, { move: false }, `${r.title} is back in this shutdown`)}>
                              Bring back
                            </PillButton>
                          ) : r.status === "open" ? (
                            <PillButton variant="secondary" onClick={() => setMoving(r)}>
                              Move
                            </PillButton>
                          ) : null}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>
      <NoteDialog
        open={moving !== null}
        title="Move to the next shutdown"
        subtitle={moving?.title}
        label="Why it waits"
        confirm="Move"
        onClose={() => setMoving(null)}
        onConfirm={async (reason) => {
          const out = await shutdownCall(`/${d.id}/items/${moving!.item.id}`, "PATCH", { move: true, reason }, "Could not move");
          const o = toOutcome(out, `${moving!.title} moved to the next shutdown`);
          setOutcome(o);
          return o;
        }}
      />
    </>
  );
}

const SAP_STATE: Record<string, { label: string; tone?: "warn" | "bad" }> = {
  completed: { label: "In SAP" },
  pending: { label: "Waiting to send" },
  processing: { label: "Sending" },
  retry: { label: "Will try again", tone: "warn" },
  failed: { label: "Not created", tone: "bad" },
  not_mapped: { label: "No SAP equipment", tone: "warn" },
};

/** The work list in SAP: one maintenance order per machine, one operation per open item. */
function SapOrders({ ctx }: { ctx: ShutdownCtx }) {
  const d = ctx.detail!;
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const canSend = d.state === "approved" || d.state === "stopping" || d.state === "in_progress";
  const open = ctx.rows.filter((r) => r.status === "open");
  const machines = machinesInView(ctx);
  const send = async () => {
    setBusy(true);
    const out = await shutdownCall(`/${d.id}/sap`, "POST", null, "Could not send the work list to SAP");
    setBusy(false);
    if ("error" in out) return setOutcome({ tone: "bad", text: out.error });
    const made = out.data.sapOrders.filter((o) => o.state === "completed").length;
    setOutcome({ tone: "good", text: `${made} ${made === 1 ? "machine has" : "machines have"} an order in SAP` });
  };
  return (
    <Section
      id="sd-sap"
      title="In SAP"
      right={
        canSend ? (
          <PillButton
            variant="secondary"
            loading={busy}
            disabled={!ctx.list?.canApprove || !open.length}
            title={!ctx.list?.canApprove ? "Your role cannot send work to SAP" : !open.length ? "No open work to send" : undefined}
            onClick={() => void send()}
          >
            Send the work list to SAP
          </PillButton>
        ) : (
          <span className="ast-caption">{PLANNING_SHUTDOWN.includes(d.state) ? "Sent once the plan is approved" : "Sent before the restart"}</span>
        )
      }
    >
      <Notice outcome={outcome} />
      <ul className="pm-rows">
        {machines.map((m) => {
          const o = d.sapOrders.find((x) => x.machineId === m.machineId);
          const st = o ? (SAP_STATE[o.state] ?? { label: o.state }) : { label: "Not sent" };
          const items = open.filter((r) => r.machineId === m.machineId).length;
          return (
            <li key={m.machineId}>
              <span className="pm-row-title">
                {machineName(m.machineId)}
                {o?.order ? <span className="ast-num pm-muted"> · order {o.order}</span> : null}
              </span>
              <span className="ast-caption">{o?.error ?? (o?.order ? `Sent ${ctx.when(o.at)}` : `${items} open ${items === 1 ? "item" : "items"} become one order with an operation each`)}</span>
              <StateWord label={st.label} tone={st.tone} />
            </li>
          );
        })}
      </ul>
      <p className="ast-caption pm-foot">One planned order (PM02) per machine on its SAP equipment, dated on the shutdown&apos;s window. An order already in SAP is not sent twice.</p>
    </Section>
  );
}

function ChangeList({ ctx }: { ctx: ShutdownCtx }) {
  const d = ctx.detail!;
  const [all, setAll] = useState(false);
  const list = all ? d.events : d.events.slice(0, 8);
  if (!d.events.length) return <Empty title="No changes yet." />;
  return (
    <>
      <ul className="pm-rows">
        {list.map((e) => (
          <li key={e.id}>
            <span className="pm-row-title">
              {e.action === "transition" && e.to ? `${e.from ? `${stateLabel(ctx.list, e.from)} → ` : ""}${stateLabel(ctx.list, e.to)}` : e.action === "create" ? "Planned" : e.action === "denied" ? "Refused: no approval rights" : (e.reason ?? e.action)}
              {e.action === "transition" && e.reason ? ` · ${e.reason}` : ""}
            </span>
            <span className="ast-caption">
              {e.actor ?? "—"} · {ctx.when(e.at)}
            </span>
          </li>
        ))}
      </ul>
      {d.events.length > 8 && (
        <button type="button" className="pm-link pm-more-link" onClick={() => setAll(!all)}>
          {all ? "Show fewer" : `Show all ${d.events.length}`}
        </button>
      )}
    </>
  );
}

/* ------------------------------------------------------------ ready */

export function PageShutdownReady({ pms }: { pms: PmsModel }) {
  return <ShutdownFrame pms={pms}>{(ctx) => (ctx.shown ? <ReadyBody ctx={ctx} /> : <Waiting ctx={ctx} />)}</ShutdownFrame>;
}

const PARTS_OPTIONS: { value: PartsState; label: string }[] = [
  { value: "pending", label: "Not checked" },
  { value: "confirmed", label: "In the store" },
  { value: "blocked", label: "Not available" },
  { value: "na", label: "Not needed" },
];

function ReadyBody({ ctx }: { ctx: ShutdownCtx }) {
  const d = ctx.detail;
  const nav = usePmsNav();
  const [outcome, setOutcome] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const start = d ? Date.parse(d.plannedStart) : 0;
  const schedule = useMemo(() => (d ? shutdownSchedule(d, ctx.rows, start) : null), [d, ctx.rows, start]);
  if (!d || !schedule) return <DetailLoading />;
  const plan = inPlan(ctx.rows);
  const wos = plan.filter((r) => r.kind === "work_order" && r.wo);
  const parts = plan.filter((r) => r.kind === "part");
  const tasks = plan.filter((r) => r.kind === "task").length;
  const missing = wos.reduce((s, r) => s + readinessBlockers(r.readiness!).length, 0) + parts.filter((r) => r.item.partsState === "pending" || r.item.partsState === "blocked").length;
  const blocked = wos.filter((r) => READINESS_KEYS.some((k) => r.readiness![k].state === "blocked")).length + parts.filter((r) => r.item.partsState === "blocked").length;
  const end = Date.parse(d.plannedEnd);
  const windowDays = (end - start) / (24 * H);
  const load = plan.reduce((s, r) => s + (r.trade && r.hours ? r.hours : 0), 0);
  const capacity = d.crews.reduce((s, c) => s + c.people * c.hoursPerDay * windowDays, 0);
  const { noHours, noTrade } = offTimeline(ctx.rows);
  const over = (schedule.end - end) / H;
  const scheduled = schedule.blocks.length > 0;
  const editable = isOpenShutdown(d.state) && d.state !== "restarting";
  const patchPart = async (r: WorkRow, v: string) => setOutcome(toOutcome(await shutdownCall(`/${d.id}/items/${r.item.id}`, "PATCH", { partsState: v }, "Could not save"), `${r.title}: ${PARTS_OPTIONS.find((o) => o.value === v)?.label}`));

  return (
    <>
      <KpiStrip
        page
        label="Shutdown readiness"
        items={[
          start > ctx.now
            ? { label: "Line stops in", value: hoursText((start - ctx.now) / H), foot: ctx.day(start) }
            : { label: "Line stops in", value: isActiveShutdown(d.state) ? "Stopped" : d.state === "closed" ? "Ended" : "Now", text: true, tone: PLANNING_SHUTDOWN.includes(d.state) ? "warn" : undefined, foot: PLANNING_SHUTDOWN.includes(d.state) ? "the planned start has passed" : ctx.day(d.phases.stopping ?? start) },
          { label: "Still missing", value: `${missing}`, tone: blocked ? "bad" : missing ? "warn" : undefined, foot: blocked ? `${blocked} jobs blocked` : "parts, people, tools, permits, access" },
          {
            label: "Crew hours",
            value: `${Math.round(load)}`,
            unit: capacity ? `/ ${Math.round(capacity)} h` : "h",
            bar: capacity ? Math.min(100, (load / capacity) * 100) : undefined,
            tone: capacity && load > capacity ? "warn" : undefined,
            foot: capacity ? (load > capacity ? "more work than the crew can do in the window" : "work against what the crew can do in the window") : "add the crew to compare",
          },
          scheduled
            ? { label: "Timeline", value: over > 0 ? `+${hoursText(over)}` : "Fits", text: over <= 0, tone: over > 0 ? "warn" : undefined, foot: over > 0 ? `runs past the window · ends ${ctx.day(schedule.end)}` : `ends ${ctx.day(schedule.end)} · ${hoursText(-over)} to spare` }
            : { label: "Timeline", value: "—", foot: d.crews.length ? "no estimated work with a trade yet" : "add the crew to see it" },
        ]}
      />
      <Notice outcome={outcome} />
      <div className="pg-frame-body">
        <Section id="sd-ready" title="Ready to start?" right={<span className="ast-caption">{tasks} checklist items need no planning</span>}>
          {!wos.length && !parts.length ? (
            <Empty title="No work orders or part replacements in this shutdown." />
          ) : (
            <div className="ui-table-container ast-table pm-table">
              <table className="ui-table pm-matrix">
                <thead>
                  <tr>
                    <th className="pm-grow">Job</th>
                    {READINESS_KEYS.map((k) => (
                      <th key={k} title={READINESS_LABEL[k]}>
                        {READINESS_SHORT[k]}
                      </th>
                    ))}
                    <th className="ast-num-col">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {wos.map((r) => (
                    <tr
                      key={r.item.id}
                      className="is-clickable"
                      {...rowActivate(() => {
                        setPmsFocus(`w:${r.wo!.id}`);
                        nav("work");
                      })}
                    >
                      <td className="pm-grow">
                        <ItemCell icon={PM_ICON.wo} tone={r.item.found ? "warn" : undefined} title={r.title} sub={`${machineName(r.machineId)} · ${r.sub}`} />
                      </td>
                      {READINESS_KEYS.map((k) => (
                        <td key={k} className="pm-cell-dot" title={`${READINESS_LABEL[k]}: ${READINESS_STATE_LABEL[r.readiness![k].state]}`}>
                          <span className="pm-rd-dot" data-state={r.readiness![k].state} aria-label={READINESS_STATE_LABEL[r.readiness![k].state]} />
                        </td>
                      ))}
                      <td className="ast-num">{r.hours ? `${r.hours} h` : <span className="pm-muted">—</span>}</td>
                    </tr>
                  ))}
                  {parts.map((r) => (
                    <tr key={r.item.id}>
                      <td className="pm-grow">
                        <ItemCell icon={PM_ICON.part} title={r.title} sub={`${machineName(r.machineId)} · ${r.sub}`} />
                      </td>
                      <td colSpan={READINESS_KEYS.length} className="pm-sd-partcell">
                        {editable ? (
                          <Select id={`sd-part-${r.item.id}`} ariaLabel={`Part for ${r.title}`} value={r.item.partsState ?? "pending"} onChange={(v) => void patchPart(r, v)} options={PARTS_OPTIONS} />
                        ) : (
                          <StateWord label={PARTS_OPTIONS.find((o) => o.value === r.item.partsState)?.label ?? "—"} />
                        )}
                      </td>
                      <td className="ast-num">{r.hours ? `${r.hours} h` : <span className="pm-muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="ast-caption pm-legend">
                <span className="pm-rd-dot" data-state="confirmed" /> Confirmed <span className="pm-rd-dot" data-state="pending" /> Pending <span className="pm-rd-dot" data-state="blocked" /> Blocked{" "}
                <span className="pm-rd-dot" data-state="na" /> Not needed · readiness is set on each work order
              </p>
            </div>
          )}
        </Section>

        <div className="pm-split is-even">
          <Section id="sd-crew" title="Crew">
            <CrewTable ctx={ctx} editable={editable} windowDays={windowDays} />
          </Section>
          <Section id="sd-off" title="Not on the timeline">
            {!noHours && !noTrade && !schedule.unstaffed.length ? (
              <Empty title="All the work is on the timeline." />
            ) : (
              <ul className="pm-rows">
                {noHours > 0 && (
                  <li>
                    <span className="pm-row-title">{noHours} items without an estimate</span>
                    <span className="ast-caption">Type the hours in the work list (Plan) or on the work order</span>
                  </li>
                )}
                {noTrade > 0 && (
                  <li>
                    <span className="pm-row-title">{noTrade} work orders or parts without a trade</span>
                    <span className="ast-caption">Pick the trade in the work list (Plan)</span>
                  </li>
                )}
                {schedule.unstaffed.map((t) => (
                  <li key={t}>
                    <span className="pm-row-title">{tradeLabel(ctx.list, t)}: no crew</span>
                    <span className="ast-caption">Add its people under Crew</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <Section id="sd-timeline" title="Timeline" right={<span className="ast-caption">Cool-down, then each trade machine by machine</span>}>
          <ShutdownGantt ctx={ctx} schedule={schedule} start={start} editable={editable} />
          <p className="ast-caption pm-foot">
            Each trade works as one team, one machine at a time, in the order the machines are ready after their cool-down. A job of N hours takes N ÷ people working hours, spread over the crew&apos;s hours a day. Trades may work on the same machine at once.
          </p>
        </Section>
      </div>
    </>
  );
}

const READINESS_SHORT: Record<string, string> = {
  spares: "Parts",
  personnel: "People",
  tools: "Tools",
  procedure: "Instructions",
  isolation: "Permits",
  access: "Access",
  window: "Time slot",
};

/** People per trade: every trade with work in the shutdown, and any with a crew. */
function CrewTable({ ctx, editable, windowDays }: { ctx: ShutdownCtx; editable: boolean; windowDays: number }) {
  const d = ctx.detail!;
  const [outcome, setOutcome] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const plan = inPlan(ctx.allRows);
  const trades = [...new Set([...plan.map((r) => r.trade).filter((t): t is string => Boolean(t)), ...d.crews.map((c) => c.owner)])].sort();
  const save = async (owner: string, people: string, perDay: string) => {
    const p = people.trim() ? Number(people) : 0;
    setOutcome(toOutcome(await shutdownCall(`/${d.id}/crews`, "PUT", { owner, people: p || null, hoursPerDay: Number(perDay.replace(",", ".")) }, "Could not save the crew"), `${tradeLabel(ctx.list, owner)}: ${p ? `${p} people` : "no crew"}`));
  };
  if (!trades.length) return <Empty title="No work with a trade yet." />;
  return (
    <>
      <Notice outcome={outcome} />
      <div className="ui-table-container ast-table pm-table">
        <table className="ui-table">
          <thead>
            <tr>
              <th className="pm-grow">Trade</th>
              <th className="ast-num-col">Work</th>
              <th className="ast-num-col">People</th>
              <th className="ast-num-col">Hours a day</th>
              <th className="ast-num-col">Takes</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => {
              const crew = d.crews.find((c) => c.owner === t) ?? null;
              const hours = plan.reduce((s, r) => s + (r.trade === t && r.hours ? r.hours : 0), 0);
              return <CrewRow key={`${t}-${crew?.people}-${crew?.hoursPerDay}`} ctx={ctx} trade={t} crew={crew} hours={hours} windowDays={windowDays} editable={editable} onSave={save} />;
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CrewRow({
  ctx,
  trade,
  crew,
  hours,
  windowDays,
  editable,
  onSave,
}: {
  ctx: ShutdownCtx;
  trade: string;
  crew: ShutdownCrew | null;
  hours: number;
  windowDays: number;
  editable: boolean;
  onSave: (owner: string, people: string, perDay: string) => Promise<void>;
}) {
  const [people, setPeople] = useState(crew ? String(crew.people) : "");
  const [perDay, setPerDay] = useState(crew ? String(crew.hoursPerDay) : "");
  const commit = () => {
    const p = people.trim();
    const h = perDay.trim();
    if (p === (crew ? String(crew.people) : "") && h === (crew ? String(crew.hoursPerDay) : "")) return;
    if (p && !h) return;
    void onSave(trade, p, h || "0");
  };
  // Elapsed days: hours shared by the team, worked during its hours a day.
  const takes = crew && hours ? hours / crew.people / crew.hoursPerDay : null;
  const over = takes !== null && takes > windowDays;
  return (
    <tr>
      <td className="pm-grow" title={tradeLabel(ctx.list, trade)}>
        <span className="pm-row-title">{tradeLabel(ctx.list, trade)}</span>
      </td>
      <td className="ast-num">{hours ? `${Math.round(hours * 10) / 10} h` : <span className="pm-muted">—</span>}</td>
      <td className="ast-num">
        {editable ? <input className="ui-input pm-sd-num" inputMode="numeric" aria-label={`People, ${trade}`} value={people} onChange={(e) => setPeople(e.target.value)} onBlur={commit} /> : (crew?.people ?? "—")}
      </td>
      <td className="ast-num">
        {editable ? <input className="ui-input pm-sd-num" inputMode="decimal" aria-label={`Hours a day, ${trade}`} placeholder="h" value={perDay} onChange={(e) => setPerDay(e.target.value)} onBlur={commit} /> : (crew?.hoursPerDay ?? "—")}
      </td>
      <td className="ast-num" data-tone={over ? "warn" : undefined}>
        {takes === null ? <span className="pm-muted">—</span> : takes < 1 ? `${Math.round(takes * 24 * 10) / 10} h` : `${Math.round(takes * 10) / 10} d`}
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------ timeline */

export function ShutdownGantt({ ctx, schedule, start, editable, live }: { ctx: ShutdownCtx; schedule: ShutdownSchedule; start: number; editable: boolean; live?: boolean }) {
  const d = ctx.detail!;
  const [outcome, setOutcome] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const machines = machinesInView(ctx);
  const plannedEnd = Date.parse(d.plannedEnd);
  const from = Math.min(start, Date.parse(d.plannedStart));
  const to = Math.max(plannedEnd, schedule.end, live ? ctx.now : 0);
  const span = Math.max(to - from, H);
  const x = (t: number) => `${((Math.max(from, Math.min(to, t)) - from) / span) * 100}%`;
  const w = (a: number, b: number) => `${(Math.max(0, Math.min(to, b) - Math.max(from, a)) / span) * 100}%`;
  const step = span <= 2 * 86_400_000 ? 6 * H : span <= 10 * 86_400_000 ? 24 * H : 7 * 24 * H;
  const ticks: number[] = [];
  for (let t = from; t <= to && ticks.length < 40; t += step) ticks.push(t);
  const saveCool = async (machineId: string, v: number | null) =>
    setOutcome(toOutcome(await shutdownCall(`/${d.id}`, "PATCH", { cooldown: { [machineId]: v } }, "Could not save the cool-down"), `${machineName(machineId)}: cool-down ${v === null ? "not known" : `${v} h`}`));
  return (
    <>
      <Notice outcome={outcome} />
      <div className="pm-sd-gantt" role="img" aria-label="Shutdown timeline per machine">
        <div className="pm-sd-gantt-row is-axis">
          <span className="pm-sd-gantt-label" />
          <span className="pm-sd-gantt-cool ast-caption">Cool-down</span>
          <span className="pm-sd-gantt-track">
            {ticks.map((t) => (
              <span key={t} className="pm-sd-tick" data-edge={(t - from) / span > 0.9 ? "end" : undefined} style={{ left: x(t) }}>
                {ctx.day(t)}
              </span>
            ))}
          </span>
        </div>
        {machines.map((m) => {
          const ready = schedule.ready.get(m.machineId) ?? start;
          const blocks = schedule.blocks.filter((b) => b.machineId === m.machineId);
          // One lane per trade, so trades working on the machine at once stay visible.
          const lanes = [...new Set(blocks.map((b) => b.trade))].sort();
          return (
            <div key={m.machineId} className="pm-sd-gantt-row">
              <span className="pm-sd-gantt-label">{machineName(m.machineId)}</span>
              <span className="pm-sd-gantt-cool">
                {editable ? <CoolCell key={`${m.machineId}-${m.cooldownHours}`} value={m.cooldownHours} label={`Cool-down hours, ${machineName(m.machineId)}`} onSave={(v) => void saveCool(m.machineId, v)} /> : <span className="ast-num">{m.cooldownHours === null ? "—" : `${m.cooldownHours} h`}</span>}
              </span>
              <span className="pm-sd-gantt-track" style={{ "--lanes": Math.max(1, lanes.length) } as React.CSSProperties}>
                {ticks.map((t) => (
                  <i key={t} className="pm-sd-grid" style={{ left: x(t) }} />
                ))}
                {ready > start && <span className="pm-sd-block is-cool" style={{ left: x(start), width: w(start, ready) }} title={`Cool-down · ${hoursText((ready - start) / H)}`} />}
                {blocks.map((b) => (
                  <span key={`${b.trade}-${b.start}`} className="pm-sd-block" data-tone={b.end > plannedEnd ? "warn" : undefined} style={{ left: x(b.start), width: w(b.start, b.end), "--lane": lanes.indexOf(b.trade) } as React.CSSProperties} title={`${tradeLabel(ctx.list, b.trade)} · ${Math.round(b.hours * 10) / 10} h of work · ${ctx.day(b.start)} → ${ctx.day(b.end)}`}>
                    {b.trade}
                  </span>
                ))}
                <i className="pm-sd-mark is-end" style={{ left: x(plannedEnd) }} />
                {live && ctx.now > from && ctx.now < to && <i className="pm-sd-mark is-now" style={{ left: x(ctx.now) }} />}
              </span>
            </div>
          );
        })}
      </div>
      <p className="ast-caption pm-legend pm-sd-legend">
        <span className="pm-sd-key is-cool" /> Cool-down <span className="pm-sd-key" /> Work, by trade <span className="pm-sd-key is-end" /> Planned restart
        {live && (
          <>
            {" "}
            <span className="pm-sd-key is-now" /> Now
          </>
        )}
      </p>
    </>
  );
}

function CoolCell({ value, label, onSave }: { value: number | null; label: string; onSave: (v: number | null) => void }) {
  const [text, setText] = useState(value === null ? "" : String(value));
  return (
    <input
      className="ui-input pm-sd-num"
      inputMode="decimal"
      aria-label={label}
      placeholder="h"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const t = text.trim().replace(",", ".");
        const v = t ? Number(t) : null;
        if (v !== null && (!Number.isFinite(v) || v < 0)) return setText(value === null ? "" : String(value));
        if (v !== value) onSave(v === 0 ? null : v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
