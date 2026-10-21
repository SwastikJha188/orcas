"use client";

import React, { useMemo, useState } from "react";
import { PillNav, rowActivate } from "@/components/ui";
import { planGenerates, planKey } from "@shared/lib/pms";
import { formatLocalTime } from "@/lib/time";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { Empty, KpiStrip, Section } from "@/components/assets/analysis/an-ui";
import { MaintenanceView } from "@/components/assets/maintenance/maintenance-view";
import type { ChecklistKind } from "@shared/types/maintenance";
import type { PmsModel } from "./pms-model";
import { machineName, useDefaultMachine } from "./pms-model";
import { useMaintenanceVocabulary } from "./maint-types-model";
import { Loading } from "./page-overview";
import { ItemCell, PM_ICON, StateWord, usePmsFocus } from "./pms-ui";

/* ==========================================================================
   Maintenance › Preventive: the checklist rounds by how often they are done —
   daily (each shift and daily), weekly, every 15 days, monthly, longer
   intervals and shutdowns, and the instrument checklist. Groups and their
   rounds come from the database (maintenance_preventive_groups); the tasks
   from the plant's checklist documents and the items added on site.
   ========================================================================== */

const GROUP_KEY = "ultron.maint.preventive";

function storedGroup(): string | null {
  try {
    return localStorage.getItem(GROUP_KEY);
  } catch {
    return null;
  }
}

interface MachineRow {
  id: string;
  tasks: number;
  done: number;
  due: number;
  overdue: number;
  timed: number;
  lastRunAt: number | null;
}

export function PagePreventive({ pms }: { pms: PmsModel }) {
  const { data, dues } = pms;
  const vocabApi = useMaintenanceVocabulary();
  const vocab = vocabApi.data ?? null;
  const focus = usePmsFocus(["g:", "m:"]);
  const { machines } = useIndustrialData();
  const defaultMachine = useDefaultMachine(data?.machineIds);
  const [groupId, setGroupId] = useState<string | null>(() => (focus?.startsWith("g:") ? focus.slice(2) : storedGroup()));
  const [machineId, setMachineId] = useState<string | null>(focus?.startsWith("m:") ? focus.slice(2) : null);
  const tz = useSiteTimeZone({ machineId: data?.machineIds[0] });

  const groups = vocab?.preventiveGroups ?? [];
  const group = groups.find((g) => g.id === groupId) ?? groups[0] ?? null;
  // The instrument rounds belong to the sensor checklist; every other group to the equipment checklist.
  const kind: ChecklistKind = group && (vocab?.kindRoutes.sensor ?? []).some((k) => group.routes.includes(k.routeId)) ? "sensor" : "equipment";

  const rows = useMemo<MachineRow[]>(() => {
    if (!data || !group) return [];
    return data.machineIds.map((id) => {
      const r: MachineRow = { id, tasks: 0, done: 0, due: 0, overdue: 0, timed: 0, lastRunAt: null };
      for (const p of data.plans) {
        if (p.machineId !== id || p.kind !== kind || !group.routes.includes(p.route)) continue;
        const d = dues.get(planKey(p));
        r.tasks += p.tasks.length;
        if (p.intervalHours !== null && planGenerates(p)) r.timed += p.tasks.length;
        if (!d) continue;
        r.done += d.tasksDone;
        r.due += d.tasksDue;
        r.overdue += d.tasksOverdue;
        if (d.lastRunAt !== null) r.lastRunAt = Math.max(r.lastRunAt ?? 0, d.lastRunAt);
      }
      return r;
    });
  }, [data, dues, group, kind]);

  if (!data) return <Loading pms={pms} what="the maintenance rounds" />;
  if (!vocab || !group)
    return (
      <div className="ast-root pg-frame pm-page">
        <section className="ast-card">
          <Empty title={vocabApi.isLoading ? "Loading the rounds…" : "No preventive rounds defined."}>{vocabApi.error ?? undefined}</Empty>
        </section>
      </div>
    );

  const total = rows.reduce(
    (a, r) => ({ tasks: a.tasks + r.tasks, done: a.done + r.done, due: a.due + r.due, overdue: a.overdue + r.overdue, timed: a.timed + r.timed }),
    { tasks: 0, done: 0, due: 0, overdue: 0, timed: 0 },
  );
  const withTasks = rows.filter((r) => r.tasks > 0).length;
  const onTime = total.timed ? Math.round(((total.timed - total.due) / total.timed) * 100) : null;
  const shownId = machineId && data.machineIds.includes(machineId) ? machineId : (rows.find((r) => r.due > 0)?.id ?? defaultMachine ?? data.machineIds[0]);
  const machine = machines.find((m) => m.id === shownId);
  const pick = (id: string) => {
    setGroupId(id);
    try {
      localStorage.setItem(GROUP_KEY, id);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <div className="ast-root pg-frame pm-page">
      <div className="ast-toolbar pm-toolbar">
        <PillNav ariaLabel="How often" items={groups.map((g) => ({ id: g.id, label: g.label }))} activeId={group.id} onChange={pick} />
      </div>
      <KpiStrip
        page
        label={`${group.label} rounds`}
        items={[
          { label: "Tasks", value: `${total.tasks}`, foot: total.tasks ? `on ${withTasks} of ${rows.length} machines` : "none yet · add items to a machine below" },
          { label: "Due now", value: `${total.due}`, tone: total.due ? "warn" : undefined, foot: total.due ? `${total.due - total.overdue} never done · ${total.overdue} past their interval` : "every timed task is current" },
          { label: "Overdue", value: `${total.overdue}`, tone: total.overdue ? "warn" : undefined, foot: "done before, now past their interval" },
          {
            label: "Done on time",
            value: onTime === null ? "—" : `${onTime}`,
            unit: onTime === null ? undefined : "%",
            bar: onTime ?? undefined,
            foot: total.timed ? `${total.timed - total.due} of ${total.timed} timed tasks current` : "no timed tasks in this group",
          },
        ]}
      />
      <div className="pg-frame-body">
        <Section id="pm-prev-machines" title="Machines">
          <div className="ui-table-container ast-table pm-table">
            <table className="ui-table">
              <thead>
                <tr>
                  <th className="pm-grow">Machine</th>
                  <th className="ast-num">Tasks</th>
                  <th className="ast-num">Done</th>
                  <th className="ast-num">Due</th>
                  <th>Status</th>
                  <th>Last done</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={`is-clickable ${r.id === shownId ? "active" : ""}`} {...rowActivate(() => setMachineId(r.id))}>
                    <td className="pm-grow">
                      <ItemCell icon={PM_ICON.plan} tone={r.overdue ? "warn" : undefined} title={machineName(r.id)} />
                    </td>
                    <td className="ast-num">{r.tasks || "—"}</td>
                    <td className="ast-num">{r.tasks ? r.done : "—"}</td>
                    <td className="ast-num">{r.tasks ? r.due : "—"}</td>
                    <td>
                      {!r.tasks ? (
                        <StateWord label="None yet" />
                      ) : r.overdue ? (
                        <StateWord label={`${r.overdue} overdue`} tone="warn" />
                      ) : r.due ? (
                        <StateWord label={`${r.due} due`} />
                      ) : r.timed ? (
                        <StateWord label="Up to date" />
                      ) : (
                        <StateWord label="Not on a timer" />
                      )}
                    </td>
                    <td className="pm-muted">{r.lastRunAt ? formatLocalTime(r.lastRunAt, { date: true, seconds: false, timeZone: tz.timeZone }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="pm-prev-sheet" title={`${machineName(shownId)} · ${group.label}`} bare>
          {machine ? (
            <MaintenanceView key={`${shownId}-${kind}-${group.id}`} machine={machine} kind={kind} routes={group.routes} bare />
          ) : (
            <section className="ast-card">
              <Empty title="Machine not found in the plant register." />
            </section>
          )}
        </Section>
      </div>
    </div>
  );
}
