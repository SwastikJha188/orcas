"use client";

import React, { useMemo } from "react";
import { rowActivate } from "@/components/ui";
import { READINESS_KEYS, READINESS_LABEL, READINESS_STATE_LABEL, STAGE_LABEL, readinessBlockers, stepOf } from "@shared/lib/pms";
import type { PmsWorkOrder } from "@shared/types/pms";
import { Empty, KpiStrip, Section } from "@/components/assets/analysis/an-ui";
import type { PmsModel } from "./pms-model";
import { machineCode, machineName, priorityTone, stageTone, woRef } from "./pms-model";
import { Loading } from "./page-overview";
import { ItemCell, PM_ICON, StateWord, setPmsFocus, usePmsNav } from "./pms-ui";

/* ==========================================================================
   Maintenance › People & parts: is each job genuinely ready — spares,
   qualified people, tools, instructions, permits, access, a plant window —
   who is waiting to approve it, and the work per person. ULTRON records
   permits, it never asserts that equipment is safe to enter (PMS interface
   p.10, report §9). Work for a stopped line is grouped in Shutdown. Second
   view of the Calendar tab; the machine comes from the workspace's machine tabs.
   ========================================================================== */

const SHORT_LABEL: Record<string, string> = {
  spares: "Parts",
  personnel: "People",
  tools: "Tools",
  procedure: "Instructions",
  isolation: "Permits",
  access: "Access",
  window: "Time slot",
};

/** Jobs before execution: readiness still matters. */
const planningStage = (w: PmsWorkOrder) => stepOf(w) <= 3 && !["closed", "rejected", "merged", "cancelled"].includes(w.stage);

export function PageResources({ pms }: { pms: PmsModel }) {
  const { data, openWos } = pms;
  const nav = usePmsNav();

  const jobs = useMemo(() => openWos.filter(planningStage), [openWos]);

  const approvals = useMemo(
    () =>
      openWos
        .filter((w) => ["awaiting_review", "scheduled", "completed", "awaiting_verification"].includes(w.stage))
        .map((w) => ({
          w,
          what: w.stage === "awaiting_review" ? "Engineer review" : w.stage === "scheduled" ? "Hand over to crew" : w.stage === "awaiting_verification" ? "Final check" : "Close-out",
        })),
    [openWos],
  );

  const crew = useMemo(() => {
    const m = new Map<string, { jobs: number; hours: number; unestimated: number }>();
    for (const w of openWos) {
      if (stepOf(w) > 4) continue;
      const k = w.assignee ?? "Unassigned";
      const c = m.get(k) ?? { jobs: 0, hours: 0, unestimated: 0 };
      c.jobs += 1;
      c.hours += w.estimateHours ?? 0;
      if (!w.estimateHours) c.unestimated += 1;
      m.set(k, c);
    }
    return [...m].sort((a, b) => b[1].hours - a[1].hours || b[1].jobs - a[1].jobs);
  }, [openWos]);

  if (!data) return <Loading pms={pms} what="resources" />;

  const openItems = jobs.reduce((s, w) => s + readinessBlockers(w.readiness).length, 0);
  const blockedJobs = jobs.filter((w) => READINESS_KEYS.some((k) => w.readiness[k].state === "blocked")).length;
  const hours = jobs.reduce((s, w) => s + (w.estimateHours ?? 0), 0);
  const unestimated = jobs.filter((w) => !w.estimateHours).length;
  const spares = jobs.filter((w) => w.readiness.spares.state === "pending" || w.readiness.spares.state === "blocked").length;
  const provisional = data.plans.filter((p) => p.state === "Provisional").length;
  const openWo = (w: PmsWorkOrder) => {
    setPmsFocus(`w:${w.id}`);
    nav("work");
  };

  return (
    <div className="ast-root pg-frame pm-page" style={{ "--pm-side": "360px" } as React.CSSProperties}>
      <KpiStrip
        page
        label="People and parts"
        items={[
          { label: "Still missing", value: `${openItems}`, tone: openItems ? "warn" : undefined, foot: `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} in planning · ${spares} waiting for parts` },
          { label: "Blocked jobs", value: `${blockedJobs}`, tone: blockedJobs ? "bad" : undefined, foot: "one blocked item stops a job being ready" },
          { label: "Planned work", value: hours ? `${hours}` : "0", unit: "h", foot: unestimated ? `${unestimated} without a time estimate` : "estimated time" },
          { label: "Waiting for approval", value: `${approvals.length}`, foot: `${provisional} plans not yet approved` },
        ]}
      />
      <div className="pg-frame-body">
        <Section id="pm-readiness" title="Ready to start?" right={<span className="ast-caption">Setting a date does not by itself make a job ready</span>}>
          {jobs.length === 0 ? (
            <Empty title="No jobs in planning. Requests appear here once they are approved for planning." />
          ) : (
            <div className="ui-table-container ast-table pm-table">
              <table className="ui-table pm-matrix">
                <thead>
                  <tr>
                    <th className="pm-grow">Job</th>
                    {READINESS_KEYS.map((k) => (
                      <th key={k} title={READINESS_LABEL[k]}>
                        {SHORT_LABEL[k]}
                      </th>
                    ))}
                    <th title="Estimated time">Time</th>
                    <th>Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((w) => (
                    <tr key={w.id} className="is-clickable" {...rowActivate(() => openWo(w))}>
                      <td className="pm-grow">
                        <ItemCell icon={PM_ICON.wo} tone={priorityTone(w.priority)} title={w.title} sub={`${woRef(w.id)} · ${machineName(w.machineId)} · ${w.workMode === "Isolate" ? "machine stopped" : w.workMode === "Run" ? "machine running" : "machine state not set"}`} />
                      </td>
                      {READINESS_KEYS.map((k) => (
                        <td key={k} className="pm-cell-dot" title={`${READINESS_LABEL[k]}: ${READINESS_STATE_LABEL[w.readiness[k].state]}`}>
                          <span className="pm-rd-dot" data-state={w.readiness[k].state} aria-label={READINESS_STATE_LABEL[w.readiness[k].state]} />
                        </td>
                      ))}
                      <td className="ast-num">{w.estimateHours ? `${w.estimateHours} h` : <span className="pm-muted">—</span>}</td>
                      <td>
                        <StateWord label={STAGE_LABEL[w.stage]} tone={stageTone(w.stage)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="ast-caption pm-legend">
                <span className="pm-rd-dot" data-state="confirmed" /> Confirmed <span className="pm-rd-dot" data-state="pending" /> Pending{" "}
                <span className="pm-rd-dot" data-state="blocked" /> Blocked <span className="pm-rd-dot" data-state="na" /> Not needed
              </p>
            </div>
          )}
        </Section>

        <div className="pm-split is-even">
          <Section id="pm-approvals" title="Waiting for approval">
            {approvals.length === 0 ? (
              <Empty title="Nothing waiting for approval." />
            ) : (
              <ul className="pm-rows">
                {approvals.map(({ w, what }) => (
                  <li key={w.id}>
                    <button type="button" className="pm-link" onClick={() => openWo(w)}>
                      {woRef(w.id)} · {w.title}
                    </button>
                    <span className="ast-caption" title={machineCode(w.machineId)}>
                      {machineName(w.machineId)}
                    </span>
                    <StateWord label={what} tone="warn" />
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section id="pm-crew" title="Work per person">
            {crew.length === 0 ? (
              <Empty title="No open work assigned." />
            ) : (
              <ul className="pm-rows">
                {crew.map(([who, c]) => (
                  <li key={who}>
                    <span className="pm-row-title">{who}</span>
                    <span className="ast-caption">{c.jobs} {c.jobs === 1 ? "job" : "jobs"}</span>
                    <span>{c.hours ? `${c.hours} h` : "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
