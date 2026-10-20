"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PillButton, PillNav, rowActivate, type Tone } from "@/components/ui";
import { useApi } from "@/lib/api-cache";
import { MAINTENANCE_VOCABULARY_URL } from "@/lib/maintenance";
import { PLAN_STATE_ORDER, planGenerates, planMode, planStrategy, planTrigger, readinessBlockers } from "@/lib/pms";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import type { PlanState, PmsPlan } from "@/types/pms";
import type { MaintenanceVocabulary } from "@/types/maintenance";
import { Empty, KpiStrip, Section } from "@/components/assets/analysis/an-ui";
import type { Outcome, PmsModel } from "./pms-model";
import { dueStatus, intervalText, machineName, planName, unitLabel, woRef } from "./pms-model";
import { Loading } from "./page-overview";
import { DAY, DefList, ItemCell, NoteDialog, Notice, PM_ICON, StateWord, occurrences, routineSummary, setPmsFocus, startOfDay, usePmsFocus, usePmsNav, type Occurrence } from "./pms-ui";

/* ==========================================================================
   Maintenance › Calendar: due rounds and scheduled work by day, week or
   month across the line, conflicts to resolve before approval, and the
   controlled plans (calendar intervals, running hours, condition) that
   generate the work. No interval is invented: document starting routes stay
   provisional until the plant approves them.
   ========================================================================== */

type Mode = "day" | "week" | "month";
type Filter = "all" | "equipment" | "sensor" | "wo";

const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
const DAYNUM = new Intl.DateTimeFormat("en-GB", { day: "2-digit" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const SHORT = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });
const LONG = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "2-digit", month: "long" });
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function weekStart(t: number): number {
  const d = new Date(startOfDay(t));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

function isoWeek(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - w1.getTime()) / DAY - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

const addDays = (t: number, n: number) => {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
};

const STATE_TONE: Record<PlanState, Tone> = { Approved: "idle", Provisional: "idle", "Site verify": "warn", Retired: "idle" };

export function PageCalendar({ pms }: { pms: PmsModel }) {
  const { data, dues, now, openWos } = pms;
  const nav = usePmsNav();
  const focus = usePmsFocus(["p:"]);
  const [mode, setMode] = useState<Mode>("week");
  const [filter, setFilter] = useState<Filter>("all");
  const [machine, setMachine] = useState<string>("all");
  const [anchor, setAnchor] = useState(() => now);
  const [planId, setPlanId] = useState<string | null>(focus ? focus.slice(2) : null);

  // Opened on a plan: show it in the library below.
  useEffect(() => {
    if (focus) document.getElementById("pm-plan-library")?.scrollIntoView({ block: "start" });
  }, [focus]);

  const range = useMemo(() => {
    if (mode === "day") {
      const from = startOfDay(anchor);
      return { from, to: addDays(from, 1), days: [from] };
    }
    if (mode === "week") {
      const from = weekStart(anchor);
      return { from, to: addDays(from, 7), days: Array.from({ length: 7 }, (_, i) => addDays(from, i)) };
    }
    const first = new Date(anchor);
    first.setDate(1);
    const from = weekStart(first.getTime());
    const next = new Date(first);
    next.setMonth(first.getMonth() + 1);
    const weeks = Math.ceil((next.getTime() - from) / (7 * DAY));
    return { from, to: addDays(from, weeks * 7), days: Array.from({ length: weeks * 7 }, (_, i) => addDays(from, i)) };
  }, [mode, anchor]);

  const inMachine = (id: string) => machine === "all" || id === machine;
  const all = useMemo(
    () => (data ? occurrences(data.plans.filter((p) => inMachine(p.machineId)), dues, openWos.filter((w) => inMachine(w.machineId)), range.from, range.to, now) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, dues, openWos, range, now, machine],
  );
  const shown = useMemo(
    () => all.filter((o) => (filter === "all" ? true : filter === "wo" ? o.kind === "wo" : filter === "sensor" ? o.kind === "plan" && o.sensor : o.kind === "plan" && !o.sensor)),
    [all, filter],
  );
  const byDay = useMemo(() => {
    const m = new Map<number, Occurrence[]>();
    for (const o of shown) {
      const k = startOfDay(o.at);
      m.set(k, [...(m.get(k) ?? []), o]);
    }
    return m;
  }, [shown]);

  const conflicts = useMemo(() => {
    if (!data) return [];
    const out: { key: string; title: string; detail: string; tone: Tone }[] = [];
    const days = new Map<string, Occurrence[]>();
    for (const o of all) {
      if (o.routine || !o.isolate) continue;
      const p = data.plans.find((x) => x.id === o.ref);
      const m = p?.machineId ?? openWos.find((w) => String(w.id) === o.ref)?.machineId ?? "";
      const k = `${m}|${startOfDay(o.at)}`;
      days.set(k, [...(days.get(k) ?? []), o]);
    }
    for (const [k, list] of days)
      if (list.length > 1) {
        const [m, day] = k.split("|");
        out.push({ key: `iso${k}`, title: `${machineName(m)}: ${list.length} isolation jobs on ${SHORT.format(Number(day))}`, detail: "Plan them as one isolation zone and one stop", tone: "warn" });
      }
    const crew = new Map<string, number[]>();
    for (const w of openWos) {
      if (!w.plannedStart || !w.assignee) continue;
      const k = `${w.assignee}|${startOfDay(Date.parse(w.plannedStart))}`;
      crew.set(k, [...(crew.get(k) ?? []), w.id]);
    }
    for (const [k, ids] of crew)
      if (ids.length > 1) {
        const [who, day] = k.split("|");
        out.push({ key: `crew${k}`, title: `${who} assigned twice on ${SHORT.format(Number(day))}`, detail: ids.map(woRef).join(", "), tone: "warn" });
      }
    for (const w of openWos)
      if ((w.stage === "scheduled" || w.stage === "released") && readinessBlockers(w.readiness).length)
        out.push({ key: `rdy${w.id}`, title: `${woRef(w.id)} scheduled with open readiness`, detail: w.title, tone: "bad" });
    const verify = data.plans.filter((p) => p.state === "Site verify" && inMachine(p.machineId));
    if (verify.length)
      out.push({ key: "verify", title: `${verify.length} plans wait for site verification`, detail: "Inactive until the installed equipment is confirmed", tone: "idle" });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, all, openWos, machine]);

  const go = (o: Occurrence) => {
    if (o.kind === "wo") {
      setPmsFocus(`w:${o.ref}`);
      nav("work");
    } else {
      setPlanId(o.ref);
      document.getElementById("pm-plan-library")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const step = (dir: -1 | 1) => {
    if (mode === "day") setAnchor(addDays(anchor, dir));
    else if (mode === "week") setAnchor(addDays(anchor, dir * 7));
    else {
      const d = new Date(anchor);
      d.setDate(1);
      d.setMonth(d.getMonth() + dir);
      setAnchor(d.getTime());
    }
  };

  if (!data) return <Loading pms={pms} what="the calendar" />;

  const title =
    mode === "day" ? LONG.format(range.from) : mode === "week" ? `Week ${isoWeek(range.from)} · ${SHORT.format(range.from)} – ${SHORT.format(addDays(range.to, -1))}` : MONTH.format(addDays(range.from, 10));
  const today = startOfDay(now);
  const monthOf = new Date(addDays(range.from, 10)).getMonth();
  const weekOcc = occurrences(data.plans, dues, openWos, weekStart(now), addDays(weekStart(now), 7), now);
  const counts = {
    week: weekOcc.length,
    weekIso: weekOcc.filter((o) => o.isolate && !o.routine).length,
    overdue: data.plans.filter((p) => dues.get(p.id)?.state === "overdue").length,
    approved: data.plans.filter((p) => p.state === "Approved").length,
    generating: data.plans.filter(planGenerates).length,
    verify: data.plans.filter((p) => p.state === "Site verify").length,
  };
  const realConflicts = conflicts.filter((c) => c.tone !== "idle").length;

  return (
    <div className="ast-root pg-frame pm-page" style={{ "--pm-side": "440px" } as React.CSSProperties}>
      <KpiStrip
        page
        label="Schedule summary"
        items={[
          { label: "This week", value: `${counts.week}`, foot: `jobs · ${counts.weekIso} need the machine stopped` },
          { label: "Overdue rounds", value: `${counts.overdue}`, tone: counts.overdue ? "warn" : undefined, foot: "past their due date" },
          { label: "Approved plans", value: `${counts.approved}`, unit: `/ ${counts.generating}`, bar: counts.generating ? (counts.approved / counts.generating) * 100 : 0, foot: "the rest use the manuals' suggested timing" },
          { label: "Clashes", value: `${realConflicts}`, tone: realConflicts ? "warn" : undefined, foot: `${counts.verify} plans wait to be checked on site` },
        ]}
      />
      <div className="pg-frame-body">
        <div className="ast-toolbar pm-toolbar">
          <PillNav ariaLabel="Machine" items={[{ id: "all", label: "All machines" }, ...data.machineIds.map((id) => ({ id, label: machineName(id) }))]} activeId={machine} onChange={setMachine} />
          <PillNav ariaLabel="Show" items={[{ id: "all", label: "All work" }, { id: "equipment", label: "Equipment" }, { id: "sensor", label: "Sensors" }, { id: "wo", label: "Work orders" }]} activeId={filter} onChange={(id) => setFilter(id as Filter)} />
        </div>
        <div className="pm-split">
          <Section
            id="pm-calendar"
            title={title}
            right={
              <div className="pm-cal-tools">
                <PillNav ariaLabel="Range" items={[{ id: "day", label: "Day" }, { id: "week", label: "Week" }, { id: "month", label: "Month" }]} activeId={mode} onChange={(id) => setMode(id as Mode)} />
                <span className="pm-cal-step">
                  <button type="button" className="ast-icon-btn" aria-label="Previous" onClick={() => step(-1)}>
                    {PM_ICON.prev}
                  </button>
                  <PillButton variant="secondary" onClick={() => setAnchor(now)}>
                    Today
                  </PillButton>
                  <button type="button" className="ast-icon-btn" aria-label="Next" onClick={() => step(1)}>
                    {PM_ICON.next}
                  </button>
                </span>
              </div>
            }
          >
            {mode === "day" ? (
              <DayList list={byDay.get(range.from) ?? []} onOpen={go} />
            ) : (
              <div className={`pm-cal is-${mode}`} role="grid" aria-label={title}>
                {range.days.slice(0, 7).map((d) => (
                  <div key={`h${d}`} className="pm-cal-head" role="columnheader">
                    {WEEKDAY.format(d)}
                    {mode === "week" && <span className="pm-cal-num"> {DAYNUM.format(d)}</span>}
                  </div>
                ))}
                {range.days.map((d) => {
                  const list = byDay.get(d) ?? [];
                  const routine = routineSummary(list, data.plans);
                  // Rounds already due sit on today as one chip; the day list shows them all.
                  const backlog = list.filter((o) => o.due && !o.routine);
                  const items = list.filter((o) => !o.routine && !o.due);
                  const max = mode === "month" ? 3 : 8;
                  return (
                    <div
                      key={d}
                      className="pm-cal-day"
                      role="gridcell"
                      data-today={d === today || undefined}
                      data-out={mode === "month" && new Date(d).getMonth() !== monthOf ? true : undefined}
                      data-past={d < today || undefined}
                    >
                      {mode === "month" && (
                        <button type="button" className="pm-cal-date" onClick={() => { setAnchor(d); setMode("day"); }}>
                          {DAYNUM.format(d)}
                        </button>
                      )}
                      {routine && <span className="pm-cal-routine" title="Shift and daily rounds">{routine}</span>}
                      {backlog.length > 0 && (
                        <button
                          type="button"
                          className="pm-cal-backlog"
                          data-tone={backlog.some((o) => o.tone === "warn") ? "warn" : undefined}
                          onClick={() => {
                            setAnchor(d);
                            setMode("day");
                          }}
                          title={backlog.map((o) => o.title).join("\n")}
                        >
                          <span>Due now</span>
                          <span>{backlog.length}</span>
                        </button>
                      )}
                      {items.slice(0, max).map((o) => (
                        <button key={o.key} type="button" className="pm-cal-item" data-tone={o.tone} data-kind={o.kind} onClick={() => go(o)} title={`${o.title}${o.tasks ? ` · ${o.tasks} tasks` : ""}`}>
                          <span className="pm-cal-item-title">{o.short}</span>
                          {mode === "week" && (
                            <span className="pm-cal-item-sub">
                              {o.isolate && <span className="pm-cal-lock" aria-label="Machine must be stopped">{PM_ICON.lock}</span>}
                              {o.sub}
                            </span>
                          )}
                        </button>
                      ))}
                      {items.length > max && (
                        <button type="button" className="pm-cal-more" onClick={() => { setAnchor(d); setMode("day"); }}>
                          +{items.length - max} more
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Section id="pm-conflicts" title="Clashes">
            {conflicts.length === 0 ? (
              <Empty title="No jobs clash in this period." />
            ) : (
              <ul className="pm-list">
                {conflicts.map((c) => (
                  <li key={c.key}>
                    <StateWord label={c.title} tone={c.tone} />
                    <span className="ast-caption">{c.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <PlanLibrary pms={pms} machine={machine} filter={filter} selectedId={planId} onSelect={setPlanId} />
      </div>
    </div>
  );
}

/** One day as a list: every occurrence including the shift and daily rounds. */
function DayList({ list, onOpen }: { list: Occurrence[]; onOpen: (o: Occurrence) => void }) {
  if (!list.length) return <Empty title="Nothing due on this day." />;
  return (
    <div className="ui-table-container ast-table pm-table">
      <table className="ui-table">
        <thead>
          <tr>
            <th>Time</th>
            <th className="pm-grow">Work</th>
            <th>Machine</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {list.map((o) => (
            <tr key={o.key} className="is-clickable" {...rowActivate(() => onOpen(o))}>
              <td className="ast-num pm-muted">{TIME.format(o.at)}</td>
              <td className="pm-grow">
                <ItemCell icon={o.kind === "wo" ? PM_ICON.wo : o.sensor ? PM_ICON.sensor : PM_ICON.plan} tone={o.tone} title={o.title} sub={o.tasks ? `${o.sub} · ${o.tasks} tasks` : o.sub} />
              </td>
              <td className="pm-muted">{o.isolate ? "Stopped" : "Running"}</td>
              <td>
                <StateWord label={o.tone === "warn" ? "Overdue" : o.kind === "wo" ? "Scheduled" : "Due"} tone={o.tone} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------- plan library */

/** A plan's state in everyday words ("Site verify" is a database value). */
const planStateLabel = (state: string) => (state === "Site verify" ? "To check on site" : state === "Retired" ? "No longer used" : state);

function PlanLibrary({ pms, machine, filter, selectedId, onSelect }: { pms: PmsModel; machine: string; filter: Filter; selectedId: string | null; onSelect: (id: string) => void }) {
  const { data, dues, now } = pms;
  const tz = useSiteTimeZone({ machineId: machine === "all" ? data?.machineIds[0] : machine });
  const owners = useApi<MaintenanceVocabulary>(MAINTENANCE_VOCABULARY_URL).data?.owners ?? null;
  const [ask, setAsk] = useState<{ state: PlanState; title: string } | null>(null);
  const [notice, setNotice] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);

  const plans = useMemo(() => {
    if (!data) return [];
    return data.plans
      .filter((p) => (machine === "all" || p.machineId === machine) && (filter === "all" || filter === "wo" || p.kind === filter))
      .slice()
      .sort((a, b) => {
        const da = dues.get(a.id)?.dueAt ?? Infinity;
        const db = dues.get(b.id)?.dueAt ?? Infinity;
        return PLAN_STATE_ORDER[a.state] - PLAN_STATE_ORDER[b.state] || (planGenerates(a) ? da - db : 0) || a.id.localeCompare(b.id);
      });
  }, [data, machine, filter, dues]);

  if (!data) return null;
  const selected = plans.find((p) => p.id === selectedId) ?? plans[0] ?? null;
  const due = selected ? dues.get(selected.id) : undefined;
  const when = (t: number | string) => formatLocalTime(t, { date: true, seconds: false, timeZone: tz.timeZone });
  const doc = (p: PmsPlan) => (p.kind === "sensor" ? data.documents.sensor : data.documents.equipment);

  const change = async (plan: PmsPlan, state: PlanState, reason = "") => {
    setBusy(true);
    const out = await pms.setPlanState(plan, state, reason);
    setBusy(false);
    setNotice(out);
    return out;
  };

  return (
    <div className="pm-split" id="pm-plan-library">
      <Section id="pm-plans" title="Maintenance plans" right={<span className="ast-caption">{plans.length} plans · run by date, by event or by sensor condition</span>}>
        <div className="ui-table-container ast-table pm-table pm-scroll">
          <table className="ui-table">
            <thead>
              <tr>
                <th className="pm-grow">Plan</th>
                <th>How often</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                const st = dueStatus(p, dues.get(p.id));
                return (
                  <tr key={p.id} className={`is-clickable ${p.id === selected?.id ? "active" : ""}`} {...rowActivate(() => { onSelect(p.id); setNotice(null); })}>
                    <td className="pm-grow">
                      <ItemCell icon={p.kind === "sensor" ? PM_ICON.sensor : PM_ICON.plan} tone={st.tone} title={planName(p)} sub={`${p.tasks.length} tasks`} />
                    </td>
                    <td className="pm-muted">{intervalText(p)}</td>
                    <td>
                      <StateWord label={planStateLabel(p.state)} tone={STATE_TONE[p.state]} />
                    </td>
                    <td>
                      <StateWord label={st.label} tone={st.tone} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {selected && (
        <Section id="pm-plan" title={planName(selected)} right={<StateWord label={planStateLabel(selected.state)} tone={STATE_TONE[selected.state]} />}>
          <DefList
            rows={[
              { label: "Machine part", value: `${machineName(selected.machineId)} · ${selected.unitCode === "GEN" ? unitLabel(selected.unitCode) : selected.unitTitle}` },
              { label: "How it is timed", value: `${planStrategy(selected.route)} · ${planTrigger(selected)}` },
              { label: "Taken from", value: `${doc(selected).number} ${doc(selected).revision} · §${selected.sections.join(", §")}` },
              {
                label: "How often",
                value: selected.state === "Approved" ? intervalText(selected) : `${intervalText(selected)} · the plant must confirm it`,
                tone: selected.state === "Approved" ? undefined : "warn",
                hint: "Suggested by the documents; the plant approves the real interval.",
              },
              { label: "Running hours", value: "Not set up · no trusted running-hours meter", hint: "Without a trusted meter, no time estimates are made from running hours." },
              { label: "Counted from", value: "When each task was last done" },
              { label: "Machine state", value: planMode(selected) === "Isolate" ? "Must be stopped and locked off" : planMode(selected) === "Run + stop" ? "Some checks while running, the rest at a shutdown" : "While running" },
              { label: "Who does it", value: (owners && [...new Set(selected.tasks.map((t) => owners[t.owner] ?? t.owner).filter(Boolean))].join(" · ")) || "—" },
              { label: "Last done", value: due?.lastRunAt ? when(due.lastRunAt) : "Not done since the plan started" },
              {
                label: "Next due",
                value: !planGenerates(selected) ? `No due work while ${selected.state.toLowerCase()}` : due?.dueAt ? (due.dueAt <= now ? "Now" : when(due.dueAt)) : intervalText(selected),
              },
              {
                label: "Approved by",
                value: selected.approvedBy && selected.approvedAt ? `${selected.approvedBy} · ${when(selected.approvedAt)}` : "Not approved by the plant yet",
                tone: selected.approvedBy ? undefined : "warn",
              },
            ]}
          />
          <Notice outcome={notice} />
          <div className="pm-actions">
            {selected.state === "Provisional" && (
              <PillButton disabled={busy || !data.canApprove} title={data.canApprove ? undefined : "Your role cannot approve plans"} onClick={() => void change(selected, "Approved")}>
                Approve plan
              </PillButton>
            )}
            {(selected.state === "Site verify" || selected.state === "Retired") && (
              <PillButton disabled={busy} onClick={() => void change(selected, "Provisional")}>
                {selected.state === "Site verify" ? "Checked on site" : "Use again"}
              </PillButton>
            )}
            {selected.state === "Approved" && (
              <PillButton variant="secondary" disabled={busy} onClick={() => void change(selected, "Provisional")}>
                Revoke approval
              </PillButton>
            )}
            {(selected.state === "Provisional" || selected.state === "Approved") && (
              <PillButton variant="secondary" disabled={busy} onClick={() => setAsk({ state: "Site verify", title: "Send for a check on site" })}>
                Send for site check
              </PillButton>
            )}
            {selected.state !== "Retired" && (
              <PillButton variant="secondary" disabled={busy} onClick={() => setAsk({ state: "Retired", title: "Stop using this plan" })}>
                Stop using
              </PillButton>
            )}
          </div>
          <div className="pm-tasks" role="group" aria-label="Tasks in this plan">
            <h4 className="pg-analysis-block-title">Tasks in this plan · {selected.tasks.length}</h4>
            <ul>
              {selected.tasks.map((t) => (
                <li key={t.id}>
                  <span className="pm-muted">{t.id}</span>
                  <span className="pm-task-name" title={t.tag ? `${t.tag} · ${t.component}` : t.component}>
                    {t.component}
                  </span>
                  <span className="ast-caption">{t.mode}</span>
                </li>
              ))}
            </ul>
          </div>
          {ask && (
            <NoteDialog
              open
              title={ask.title}
              subtitle={`${selected.id} · ${planName(selected)}`}
              label="Reason"
              hint="Saved in the plan's history of changes"
              confirm={ask.state === "Retired" ? "Stop using" : "Send for site check"}
              danger={ask.state === "Retired"}
              onClose={() => setAsk(null)}
              onConfirm={(reason) => change(selected, ask.state, reason)}
            />
          )}
        </Section>
      )}
    </div>
  );
}
