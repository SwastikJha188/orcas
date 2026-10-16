"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PillButton, PillNav, rowActivate } from "@/components/ui";
import { PAUSED, READINESS_KEYS, STAGE_LABEL, TERMINAL, isOpenStage, readinessBlockers, stepOf } from "@/lib/pms";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import type { WoStage } from "@/types/pms";
import type { ChecklistKind } from "@/types/maintenance";
import { Empty, KpiStrip, Section } from "@/components/assets/analysis/an-ui";
import { MaintenanceView } from "@/components/assets/maintenance/maintenance-view";
import type { Outcome, PmsModel } from "./pms-model";
import { machineCode, priorityTone, stageTone, woRef } from "./pms-model";
import { Loading } from "./page-overview";
import { ProposeDialog } from "./propose-dialog";
import { WorkOrderDetail } from "./work-order-detail";
import { ItemCell, PM_ICON, StateWord, usePmsFocus } from "./pms-ui";

/* ==========================================================================
   Maintenance › Work orders & checklists: requests and work orders across
   the line (task, priority, owner, target date, readiness, stage) and the
   two checklist libraries — equipment and instrument — kept separate. Each
   inspection records the result, defects and the verification before closure.
   (PMS interface p.07–09, report §5 and §8.)
   ========================================================================== */

type View = "orders" | "equipment" | "sensor";
type StageFilter = "open" | "requests" | "planning" | "ready" | "execution" | "closed";

const FILTER_STAGES: Record<StageFilter, (s: WoStage) => boolean> = {
  open: (s) => isOpenStage(s),
  requests: (s) => s === "identified" || s === "awaiting_review",
  planning: (s) => s === "approved" || s === "planning" || PAUSED.includes(s),
  ready: (s) => s === "ready" || s === "scheduled" || s === "released",
  execution: (s) => s === "in_progress" || s === "awaiting_verification" || s === "completed",
  closed: (s) => TERMINAL.includes(s),
};

const TARGET = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });

export function PageWork({ pms }: { pms: PmsModel }) {
  const { data, openWos, findings } = pms;
  const focus = usePmsFocus(["w:"]);
  const [view, setView] = useState<View>("orders");
  const [machine, setMachine] = useState("all");
  const [filter, setFilter] = useState<StageFilter>("open");
  const [selId, setSelId] = useState<number | null>(focus ? Number(focus.slice(2)) : null);
  const [proposing, setProposing] = useState(false);
  const [notice, setNotice] = useState<Outcome | null>(null);
  const tz = useSiteTimeZone({ machineId: machine === "all" ? data?.machineIds[0] : machine });

  // A focused work order may sit outside the default filter.
  useEffect(() => {
    if (!focus || !data) return;
    const w = data.workOrders.find((x) => x.id === Number(focus.slice(2)));
    if (w && !isOpenStage(w.stage)) setFilter("closed");
  }, [focus, data]);
  useEffect(() => setNotice(null), [selId]);

  const wos = useMemo(
    () => (data?.workOrders ?? []).filter((w) => FILTER_STAGES[filter](w.stage) && (machine === "all" || w.machineId === machine)),
    [data, filter, machine],
  );

  const counts = useMemo(() => {
    const c = { requests: 0, planning: 0, blocked: 0, ready: 0, execution: 0, verify: 0 };
    for (const w of openWos) {
      if (FILTER_STAGES.requests(w.stage)) c.requests += 1;
      if (FILTER_STAGES.planning(w.stage)) {
        c.planning += 1;
        if (readinessBlockers(w.readiness).length) c.blocked += 1;
      }
      if (FILTER_STAGES.ready(w.stage)) c.ready += 1;
      if (FILTER_STAGES.execution(w.stage)) c.execution += 1;
      if (w.stage === "awaiting_verification") c.verify += 1;
    }
    return c;
  }, [openWos]);

  if (!data) return <Loading pms={pms} what="work orders" />;

  const wo = wos.find((w) => w.id === selId) ?? wos[0] ?? null;
  const unraised = findings.filter((f) => f.status === "ACTIVE" && !f.workOrderId).length;
  const checklistMachine = machine === "all" ? data.machineIds.find((m) => m.endsWith("KLN-01")) ?? data.machineIds[0] : machine;

  return (
    <div className="ast-root pg-frame pm-page" style={{ "--pm-side": "460px" } as React.CSSProperties}>
      <div className="ast-toolbar pm-toolbar">
        <PillNav
          ariaLabel="Records"
          items={[{ id: "orders", label: "Requests & work orders" }, { id: "equipment", label: "Equipment checklists" }, { id: "sensor", label: "Instrument checklists" }]}
          activeId={view}
          onChange={(id) => setView(id as View)}
        />
        <PillNav
          ariaLabel="Machine"
          items={[...(view === "orders" ? [{ id: "all", label: "All machines" }] : []), ...data.machineIds.map((id) => ({ id, label: machineCode(id) }))]}
          activeId={view === "orders" ? machine : checklistMachine}
          onChange={setMachine}
        />
        {view === "orders" && (
          <PillButton variant="secondary" icon={PM_ICON.wo} onClick={() => setProposing(true)}>
            New request
          </PillButton>
        )}
      </div>

      {view === "orders" ? (
        <>
          <KpiStrip
            page
            label="Work summary"
            items={[
              { label: "Requests", value: `${counts.requests}`, tone: unraised ? "warn" : undefined, foot: unraised ? `+${unraised} findings in Condition planning` : "awaiting technical review" },
              { label: "Planning", value: `${counts.planning}`, tone: counts.blocked ? "warn" : undefined, foot: counts.blocked ? `${counts.blocked} with open readiness` : "spares, people, permits" },
              { label: "Ready", value: `${counts.ready}`, foot: "scheduled or released" },
              { label: "Execution", value: `${counts.execution}`, foot: counts.verify ? `${counts.verify} awaiting verification` : "in progress or verifying" },
            ]}
          />
          <div className="pg-frame-body">
            <div className="pm-split">
              <Section
                id="pm-work-list"
                title="Work"
                right={
                  <PillNav
                    ariaLabel="Stage"
                    items={[
                      { id: "open", label: "Open" },
                      { id: "requests", label: "Requests" },
                      { id: "planning", label: "Planning" },
                      { id: "ready", label: "Ready" },
                      { id: "execution", label: "Execution" },
                      { id: "closed", label: "Closed" },
                    ]}
                    activeId={filter}
                    onChange={(id) => setFilter(id as StageFilter)}
                  />
                }
              >
                {wos.length === 0 ? (
                  <Empty title={filter === "closed" ? "No closed work orders yet." : "No work in this stage."}>{unraised && filter !== "closed" ? `${unraised} live findings wait in Condition planning` : undefined}</Empty>
                ) : (
                  <div className="ui-table-container ast-table pm-table">
                    <table className="ui-table">
                      <thead>
                        <tr>
                          <th>Pri</th>
                          <th className="pm-grow">Work</th>
                          <th>Owner</th>
                          <th>Target</th>
                          <th>Stage</th>
                          <th>Readiness</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wos.map((w) => {
                          const open = readinessBlockers(w.readiness);
                          const blocked = READINESS_KEYS.some((k) => w.readiness[k].state === "blocked");
                          const t = priorityTone(w.priority);
                          return (
                            <tr key={w.id} className={`is-clickable ${wo?.id === w.id ? "active" : ""}`} {...rowActivate(() => setSelId(w.id))}>
                              <td className="pm-pri ast-num" data-tone={t === "idle" ? undefined : t}>
                                {w.priority}
                              </td>
                              <td className="pm-grow">
                                <ItemCell icon={PM_ICON.wo} title={w.title} sub={`${woRef(w.id)} · ${machineCode(w.machineId)}${w.component ? ` · ${w.component}` : ""}`} />
                              </td>
                              <td className="pm-muted">{w.assignee ?? "—"}</td>
                              <td className="ast-num pm-muted">{w.plannedStart ? TARGET.format(Date.parse(w.plannedStart)) : "—"}</td>
                              <td>
                                <StateWord label={STAGE_LABEL[w.stage]} tone={stageTone(w.stage)} />
                              </td>
                              <td className="ast-num">
                                {TERMINAL.includes(w.stage) || stepOf(w) >= 4 ? (
                                  <span className="pm-muted">—</span>
                                ) : (
                                  <StateWord label={blocked ? "Blocked" : open.length ? `${READINESS_KEYS.length - open.length}/${READINESS_KEYS.length}` : "Ready"} tone={blocked ? "bad" : undefined} />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              {wo ? (
                <WorkOrderDetail key={wo.id} wo={wo} pms={pms} timeZone={tz.timeZone ?? null} notice={notice} setNotice={setNotice} />
              ) : (
                <Section id="pm-wo" title="Work order">
                  <Empty title="Select a work order." />
                </Section>
              )}
            </div>
          </div>
        </>
      ) : (
        <ChecklistHost machineId={checklistMachine} kind={view} />
      )}

      <ProposeDialog
        open={proposing}
        finding={null}
        machineIds={data.machineIds}
        defaultMachine={machine === "all" ? null : machine}
        onClose={() => setProposing(false)}
        onPropose={async (input) => {
          const out = await pms.propose(input);
          if (out.tone === "good" && out.id) {
            setFilter("open");
            setSelId(out.id);
          }
          setNotice(out);
          return out;
        }}
      />
    </div>
  );
}

/** The machine's equipment or instrument checklist (rounds, one-tap results, defects → work orders). */
function ChecklistHost({ machineId, kind }: { machineId: string; kind: ChecklistKind }) {
  const { machines } = useIndustrialData();
  const machine = machines.find((m) => m.id === machineId);
  if (!machine) return <Empty title="Machine not found in the plant register." />;
  return <MaintenanceView key={`${machineId}-${kind}`} machine={machine} kind={kind} />;
}
