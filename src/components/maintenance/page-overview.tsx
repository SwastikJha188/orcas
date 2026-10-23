"use client";

import React, { useMemo } from "react";
import { conditionTone, estimateOf, minutesIn, NextActions, RestLine, rowActivate, toCondition, useFold, type NextAction, type Tone, Loading as LoadingState } from "@/components/ui";
import { formatLocalTime } from "@/lib/time";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { isOpenStage, planKey } from "@shared/lib/pms";
import { useKilnFleet } from "@/providers/kiln-simulation-context";
import { Empty, KpiStrip, Section } from "@/components/assets/analysis/an-ui";
import type { PmsModel, QueueItem } from "./pms-model";
import { useWorkOrderPriorities } from "@/lib/reference-data";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { checkState, partLife, useAlertChecks, useRunningHours, useServiceParts } from "./maint-types-model";
import { machineCode, machineName } from "./pms-model";
import { DAY, ItemCell, PM_ICON, StateWord, occurrences, setPmsFocus, startOfDay, usePmsNav } from "./pms-ui";

/* ==========================================================================
   Maintenance › Overview: what needs attention across the line, why it
   matters, what is ready to execute, and every machine's maintenance status.
   ========================================================================== */

const ICON_OF = { finding: PM_ICON.finding, wo: PM_ICON.wo, plan: PM_ICON.plan };
const DAYFMT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit" });

/** Queue items shown before the rest fold away. */
const QUEUE_TOP = 10;

export function PageOverview({ pms }: { pms: PmsModel }) {
  const { data, findings, openWos, dues, now } = pms;
  const nav = usePmsNav();
  const fleet = useKilnFleet();
  const checksApi = useAlertChecks();
  const priorities = useWorkOrderPriorities();
  const partsApi = useServiceParts();
  const counter = useRunningHours();
  const tz = useSiteTimeZone({ machineId: data?.machineIds[0] });
  const when = (t: number) => formatLocalTime(t, { date: true, seconds: false, timeZone: tz.timeZone });

  // Open checks raised by alarms stand in the queue for the alarms themselves (Predictive & planned).
  const checks = useMemo(() => (checksApi.data ?? []).filter((c) => data?.machineIds.includes(c.machineId) && checkState(c, now).open), [checksApi.data, data, now]);
  const queue = useMemo<QueueItem[]>(() => {
    const items: QueueItem[] = checks.map((c) => {
      const st = checkState(c, now);
      return {
        key: `c:${c.id}`,
        kind: "finding",
        machineId: c.machineId,
        priority: c.priority,
        title: c.title,
        sub: c.places.join(", ") || (c.measurement?.tag ?? ""),
        reason: c.summary,
        next: "Go and check",
        status: { label: st.label, tone: st.tone },
        at: Date.parse(c.raisedAt),
        ref: String(c.id),
      };
    });
    // Urgency order as the database lists the priorities.
    const rank = (id: string) => {
      const i = priorities?.findIndex((p) => p.id === id) ?? -1;
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    return [...items, ...pms.queue.filter((q) => q.kind !== "finding")].sort((a, b) => rank(a.priority) - rank(b.priority) || a.at - b.at);
  }, [checks, pms.queue, now, priorities]);
  const partsDue = useMemo(
    () => (partsApi.data ?? []).filter((p) => data?.machineIds.includes(p.machineId)).map((p) => partLife(p, counter(p.machineId), now)).filter((l) => l.state !== "ok"),
    [partsApi.data, data, counter, now],
  );

  const counts = useMemo(() => {
    const c = { week: 0, weekTasks: 0, overdue: 0, overdueTasks: 0, requests: 0, fromFindings: 0, ready: 0, blocked: 0, done7: 0 };
    if (!data) return c;
    for (const p of data.plans) {
      const d = dues.get(planKey(p));
      if (!d || d.state === "none") continue;
      if (d.state === "overdue") {
        c.overdue += 1;
        c.overdueTasks += d.tasksOverdue;
      } else if (d.state === "due" || d.state === "soon") {
        c.week += 1;
        c.weekTasks += d.tasksDue || p.tasks.length;
      }
    }
    for (const w of openWos) {
      if (w.stage === "identified" || w.stage === "awaiting_review") c.requests += 1;
      if (w.stage === "ready" || w.stage === "scheduled" || w.stage === "released") c.ready += 1;
      if (w.stage === "on_hold" || Object.values(w.readiness).some((r) => r.state === "blocked")) c.blocked += 1;
    }
    c.fromFindings = findings.filter((f) => f.status === "ACTIVE" && !f.workOrderId).length;
    c.requests += c.fromFindings;
    const weekAgo = now - 7 * DAY;
    c.done7 = data.workOrders.filter((w) => (w.stage === "completed" || w.stage === "closed") && Date.parse(w.updatedAt) >= weekAgo).length;
    return c;
  }, [data, dues, openWos, findings, now]);

  // Machine-wise status: condition, findings, rounds due / overdue, open work.
  const machines = useMemo(() => {
    if (!data) return [];
    return data.machineIds.map((id) => {
      const plans = data.plans.filter((p) => p.machineId === id);
      let due = 0;
      let overdue = 0;
      for (const p of plans) {
        const d = dues.get(planKey(p));
        if (d?.state === "overdue") overdue += 1;
        else if (d?.state === "due") due += 1;
      }
      const wos = data.workOrders.filter((w) => w.machineId === id && isOpenStage(w.stage));
      const f = findings.filter((x) => x.machineId === id && x.status === "ACTIVE");
      return { id, due, overdue, wos: wos.length, findings: f.length, critical: f.some((x) => x.severity === "Critical") };
    });
  }, [data, dues, findings]);

  const upcoming = useMemo(() => {
    if (!data) return [];
    const from = startOfDay(now);
    return occurrences(data.plans, dues, data.workOrders.filter((w) => isOpenStage(w.stage)), from, from + 35 * DAY, now)
      .filter((o) => !o.routine && o.at > now)
      .slice(0, 10);
  }, [data, dues, now]);

  const open = (item: QueueItem) => {
    if (item.kind === "plan") {
      setPmsFocus(`p:${item.ref}`);
      nav("calendar");
    } else if (item.kind === "finding") {
      setPmsFocus(`c:${item.ref}`);
      nav("predictive");
    } else {
      setPmsFocus(`w:${item.ref}`);
      nav("work");
    }
  };
  // Next actions: the few things to do first, each done or opened in one click.
  const next = useMemo<NextAction[]>(() => {
    const out: NextAction[] = [];
    const toneOf = (p: string): NextAction["tone"] => (p === "P1" ? "bad" : p === "P2" ? "warn" : "info");
    for (const c of checks) {
      const st = checkState(c, now);
      const m = c.measurement;
      out.push({
        key: `c:${c.id}`,
        tone: st.overdue || (c.alarmActive && c.severity === "Critical") ? "bad" : "warn",
        rank: c.dueAt ? (Date.parse(c.dueAt) - now) / 60_000 : undefined,
        what: `${c.title} · ${machineCode(c.machineId)}`,
        why: [c.priority, m && m.observed !== null ? `${m.name} ${m.observed} ${m.unit}${m.limit !== null ? `, limit ${m.limit} ${m.unit}` : ""}` : c.alarmActive ? "alarm still on" : null, st.overdue ? "past its response time" : c.dueAt ? `check by ${when(Date.parse(c.dueAt))}` : null].filter(Boolean).join(" · "),
        label: "Go and check",
        run: () => {
          setPmsFocus(`c:${c.id}`);
          nav("predictive");
        },
      });
    }
    // Problems with no repair asked for yet (and no check standing in for them).
    for (const f of findings) {
      if (f.status !== "ACTIVE" || f.workOrderId || checks.some((c) => c.machineId === f.machineId && c.ruleCode === f.ruleId)) continue;
      const mins = minutesIn(f.timeToLimit);
      out.push({
        key: `f:${f.machineId}:${f.ruleId}`,
        tone: toneOf(f.priority),
        rank: mins ?? undefined,
        what: `${f.plainTitle || f.name} · ${machineCode(f.machineId)}`,
        why: [f.priority, mins !== null ? `limit in ${estimateOf(f.timeToLimit)}` : null, `${Math.round(f.confidence)} % sure`, "no repair asked for yet"].filter(Boolean).join(" · "),
        label: "Ask for a repair",
        run: async () => (await pms.propose({ machineId: f.machineId, ruleId: f.ruleId, title: f.plainTitle || f.name, priority: f.priority, notes: f.plainTodo || f.action || null })).tone === "good",
      });
    }
    for (const l of partsDue) {
      out.push({
        key: `r:${l.part.id}`,
        tone: l.state === "over" ? "bad" : "warn",
        rank: l.runsOut !== null ? (l.runsOut - now) / 60_000 : undefined,
        what: `${l.part.name} · ${machineCode(l.part.machineId)}`,
        why: [`${Math.round(l.share * 100)} % of its life used`, l.state === "over" ? "past its service life" : l.runsOut !== null ? `runs out ${when(l.runsOut)}` : null].filter(Boolean).join(" · "),
        label: "Plan the replacement",
        run: () => {
          setPmsFocus(`r:${l.part.id}`);
          nav("proactive");
        },
      });
    }
    // Work orders and rounds the queue marks late or stuck.
    for (const q of queue) {
      if (q.kind === "finding" || (q.status.tone !== "bad" && q.status.tone !== "warn")) continue;
      out.push({ key: q.key, tone: q.status.tone === "bad" ? "bad" : "warn", rank: (q.at - now) / 60_000, what: `${q.title} · ${machineCode(q.machineId)}`, why: [q.priority, q.status.label, `next: ${q.next.toLowerCase()}`].filter(Boolean).join(" · "), label: q.kind === "plan" ? "Open the round" : "Open work order", run: () => open(q) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/nav/when are stable per render of the same data
  }, [checks, findings, partsDue, queue, now, pms.propose, tz.timeZone]);

  // The top of the queue shows; the rest folds into one line.
  const fold = useFold(queue, (_, i) => i >= QUEUE_TOP);

  if (!data) return <Loading pms={pms} what="planned maintenance" />;
  // The alarm checks and part lives load on their own; until they arrive their numbers wait.
  const checksWait = checksApi.data === undefined && !checksApi.error;
  const partsWait = partsApi.data === undefined && !partsApi.error;

  return (
    <div className="ast-root pg-frame pm-page" style={{ "--pm-side": "340px" } as React.CSSProperties}>
      <KpiStrip
        page
        label="Maintenance summary"
        items={[
          {
            label: "Preventive rounds due",
            value: `${counts.week}`,
            tone: counts.overdue ? "warn" : undefined,
            foot: counts.overdue ? `${counts.overdue} more overdue · ${counts.overdueTasks} tasks` : `${counts.weekTasks} tasks this week · none overdue`,
          },
          {
            label: "Checks from alarms",
            loading: checksWait,
            value: `${checks.length}`,
            tone: checks.some((c) => checkState(c, now).overdue) ? "bad" : checks.length ? "warn" : undefined,
            foot: checks.length ? `${checks.filter((c) => checkState(c, now).overdue).length} past their response time` : "every alarm has been checked",
          },
          {
            label: "Parts due for replacement",
            loading: partsWait,
            value: `${partsDue.length}`,
            tone: partsDue.some((l) => l.state === "over") ? "bad" : partsDue.length ? "warn" : undefined,
            foot: partsDue.length ? partsDue.map((l) => l.part.name).slice(0, 2).join(" · ") : "every part within its service life",
          },
          { label: "Ready to start", value: `${counts.ready}`, foot: `${counts.requests ? `${counts.requests} requests to review · ` : ""}${counts.done7} completed in 7 days` },
        ]}
      />
      <div className="pg-frame-body">
        {next.length > 0 && (
          <Section id="pm-next" title="Next actions">
            <NextActions items={next} />
          </Section>
        )}
        <div className="pm-split">
          <Section id="pm-queue" title="Priority queue" right={<span className="ast-caption">Sorted by safety, importance, due date and readiness</span>}>
            {checksWait ? (
              <LoadingState label="Loading the priority queue…" rows={5} />
            ) : queue.length === 0 ? (
              <Empty title="Nothing waiting: no problems, no open work and no rounds due." />
            ) : (
              <div className="ui-table-container ast-table pm-table">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th title="P1 is the most urgent">Priority</th>
                      <th className="pm-grow">What</th>
                      <th>Why</th>
                      <th>Next step</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fold.shown.map((q) => (
                      <tr key={q.key} className="is-clickable" {...rowActivate(() => open(q))}>
                        <td className="pm-pri ast-num" data-tone={q.priority === "P1" ? "bad" : q.priority === "P2" ? "warn" : undefined}>
                          {q.priority}
                        </td>
                        <td className="pm-grow">
                          <ItemCell icon={ICON_OF[q.kind]} tone={q.status.tone} title={q.title} sub={q.kind === "plan" ? q.sub : `${machineName(q.machineId)} · ${q.sub}`} />
                        </td>
                        <td>
                          <span className="ast-cell-text pm-wrap" title={q.reason}>
                            {q.reason}
                          </span>
                        </td>
                        <td className="pm-muted">{q.next}</td>
                        <td>
                          <StateWord label={q.status.label} tone={q.status.tone} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!checksWait && <RestLine rest={fold.rest} shown={fold.shown.length} noun="item" note="lower in the queue" open={fold.open} onToggle={fold.toggle} />}
          </Section>

          <div className="pm-stack">
            <Section id="pm-machines" title="Machines">
              <ul className="pm-machines">
                {machines.map((m) => {
                  const frame = fleet[m.id]?.frame;
                  const cond = toCondition(frame?.condition ?? null);
                  const tone: Tone = conditionTone(cond);
                  const parts = [
                    m.findings && `${m.findings} ${m.findings === 1 ? "problem" : "problems"}`,
                    m.overdue && `${m.overdue} overdue`,
                    m.due && `${m.due} rounds due`,
                    m.wos && `${m.wos} open ${m.wos === 1 ? "work order" : "work orders"}`,
                  ].filter(Boolean);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        className="pm-machine"
                        onClick={() => {
                          setPmsFocus(`m:${m.id}`);
                          nav("machine");
                        }}
                      >
                        <span className="ast-chip-dot" data-tone={tone} aria-hidden="true" />
                        <span className="pm-machine-name" title={machineCode(m.id)}>
                          <b>{machineName(m.id)}</b>
                        </span>
                        <span className="pm-machine-state" data-tone={m.critical ? "bad" : m.overdue || m.findings ? "warn" : undefined}>
                          {parts.length ? parts.join(" · ") : "Nothing due"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Section>
            <Section id="pm-upcoming" title="Upcoming">
              {upcoming.length === 0 ? (
                <Empty title="No weekly or longer rounds and no scheduled work in the next 5 weeks." />
              ) : (
                <ul className="pm-upcoming">
                  {upcoming.map((o) => (
                    <li key={o.key}>
                      <span className="pm-up-day" data-tone={o.tone}>
                        {DAYFMT.format(o.at)}
                      </span>
                      <span className="pm-up-title" title={o.title}>
                        {o.title}
                      </span>
                      <span className="pm-up-state">{o.kind === "wo" ? "Scheduled" : o.isolate ? "Machine must be stopped" : "Planned"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Loading / unavailable line for a page. */
export function Loading({ pms, what }: { pms: PmsModel; what: string }) {
  const { hasLoaded } = useIndustrialData();
  // Plans, or the plant's machines they are matched to, still on the way.
  if (pms.loading || (!hasLoaded && !pms.error))
    return (
      <section className="ast-card">
        <LoadingState label={`Loading ${what}…`} rows={5} />
      </section>
    );
  return (
    <section className="ast-card">
      {/* Nothing loaded and no error means this plant has no maintenance plans yet — say that, not "could not be loaded". */}
      <Empty
        title={
          pms.loading
            ? `Loading ${what}…`
            : pms.error
              ? `${what[0].toUpperCase()}${what.slice(1)} could not be loaded.`
              : "This plant has no planned maintenance yet."
        }
      >
        {pms.error ?? (pms.loading ? undefined : "Plans come from each machine's maintenance checklist (for example, uploaded in Configure › Onboarding).")}
      </Empty>
    </section>
  );
}
