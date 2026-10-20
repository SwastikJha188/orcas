"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav, Sparkline, rowActivate, type Tone } from "@/components/ui";
import { STAGE_LABEL } from "@/lib/pms";
import { useKilnFleet } from "@/providers/kiln-simulation-context";
import { Empty, KpiStrip, Section } from "@/components/assets/analysis/an-ui";
import type { Outcome, PmsFinding, PmsModel } from "./pms-model";
import { machineCode, machineName, priorityTone, prognosisText, stageTone, woRef } from "./pms-model";
import { displayName } from "@/lib/display-name";
import { Loading } from "./page-overview";
import { ProposeDialog } from "./propose-dialog";
import { DefList, ItemCell, Notice, PM_ICON, StateWord, setPmsFocus, usePmsFocus, usePmsNav } from "./pms-ui";

/* ==========================================================================
   Maintenance › Condition planning: the developing faults from Diagnosis,
   their trend, time to the approved limit where it is defensible, the
   consequence and the recommended work. A finding recommends work; it never
   authorizes it — the planner proposes a request, which is then reviewed.
   (PMS interface p.06, report §7.)
   ========================================================================== */

type Filter = "all" | "new" | "raised";

/** Direction of the finding's lead signal, from its slope. */
function trendOf(slope: number | null | undefined, sigma: number): { arrow: string; word: string } {
  if (slope === null || slope === undefined || Math.abs(slope) < Math.max(sigma, 1e-6) * 0.05) return { arrow: "→", word: "Steady" };
  return slope > 0 ? { arrow: "↗", word: "Rising" } : { arrow: "↘", word: "Falling" };
}

export function PageCondition({ pms }: { pms: PmsModel }) {
  const { data, findings } = pms;
  const fleet = useKilnFleet();
  const nav = usePmsNav();
  const focus = usePmsFocus(["f:"]);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(focus ? focus.slice(2) : null);
  const [proposing, setProposing] = useState<PmsFinding | null>(null);
  const [notice, setNotice] = useState<Outcome | null>(null);

  const list = useMemo(() => findings.filter((f) => (filter === "new" ? !f.workOrderId : filter === "raised" ? Boolean(f.workOrderId) : true)), [findings, filter]);
  const keyOf = (f: PmsFinding) => `${f.machineId}:${f.ruleId}`;
  const f = list.find((x) => keyOf(x) === selected) ?? list[0] ?? null;

  if (!data) return <Loading pms={pms} what="problems to plan" />;

  const lead = (x: PmsFinding) => {
    const frame = fleet[x.machineId]?.frame;
    const tag = x.tags.find((t) => frame?.signals[t]?.value !== null && frame?.defs.signalByTag[t]?.type === "analog") ?? x.tags[0];
    const def = tag ? frame?.defs.signalByTag[tag] : undefined;
    const sig = tag ? frame?.signals[tag] : undefined;
    return { tag, def, sig, frame };
  };

  const counts = {
    developing: findings.length,
    critical: findings.filter((x) => x.severity === "Critical").length,
    timed: findings.filter((x) => /\d/.test(x.timeToLimit) && x.timeToLimit !== "> 72 h").length,
    unraised: findings.filter((x) => x.status === "ACTIVE" && !x.workOrderId).length,
  };

  const wo = f?.workOrderId ? data.workOrders.find((w) => w.id === f.workOrderId) : null;
  const l = f ? lead(f) : null;
  const hist = l?.tag && l.frame ? (l.frame.history[l.tag] ?? []).slice(-180) : [];

  return (
    <div className="ast-root pg-frame pm-page" style={{ "--pm-side": "460px" } as React.CSSProperties}>
      <KpiStrip
        page
        label="Problems found by sensors"
        items={[
          { label: "Developing problems", value: `${counts.developing}`, tone: counts.developing ? "warn" : undefined, foot: `${findings.filter((x) => x.status === "PENDING").length} still being confirmed` },
          { label: "Critical", value: `${counts.critical}`, tone: counts.critical ? "bad" : undefined, foot: "follow the plant's set response first" },
          { label: "Time to limit known", value: `${counts.timed}`, foot: "time until a reading hits its limit, not when it fails" },
          { label: "No request yet", value: `${counts.unraised}`, tone: counts.unraised ? "warn" : undefined, foot: "nobody has asked for a repair yet" },
        ]}
      />
      <div className="pg-frame-body">
        <div className="pm-split">
          <Section
            id="pm-findings"
            title="Developing problems"
            right={<PillNav ariaLabel="Show" items={[{ id: "all", label: "All" }, { id: "new", label: "No request yet" }, { id: "raised", label: "Request made" }]} activeId={filter} onChange={(id) => setFilter(id as Filter)} />}
          >
            {list.length === 0 ? (
              <Empty title={findings.length ? "No problems match this filter." : "No developing problems on the line: every automatic check is quiet."} />
            ) : (
              <div className="ui-table-container ast-table pm-table">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th title="P1 is the most urgent">Priority</th>
                      <th className="pm-grow">Problem</th>
                      <th>Trend</th>
                      <th>Time to limit</th>
                      <th>Repair request</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((x) => {
                      const { sig, def } = lead(x);
                      const tr = trendOf(sig?.slopePerHour, def?.sigma ?? 0);
                      const t = priorityTone(x.priority);
                      return (
                        <tr key={keyOf(x)} className={`is-clickable ${f && keyOf(f) === keyOf(x) ? "active" : ""}`} {...rowActivate(() => { setSelected(keyOf(x)); setNotice(null); })}>
                          <td className="pm-pri ast-num" data-tone={t === "idle" ? undefined : t}>
                            {x.priority}
                          </td>
                          <td className="pm-grow">
                            <ItemCell icon={PM_ICON.finding} tone={x.severity === "Critical" ? "bad" : "warn"} title={x.plainTitle || x.name} sub={`${machineName(x.machineId)}${x.status === "PENDING" ? " · still being confirmed" : ""}`} />
                          </td>
                          <td className="pm-muted">
                            <span className="pm-trend-arrow" aria-hidden="true">{tr.arrow}</span> {tr.word}
                          </td>
                          <td className="ast-num">{/\d/.test(x.timeToLimit) ? x.timeToLimit : x.timeToLimit === "—" ? "Not known" : x.timeToLimit}</td>
                          <td>{x.workOrderId ? <StateWord label={woRef(x.workOrderId)} /> : <StateWord label="None yet" tone="warn" />}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {f ? (
            <Section id="pm-finding" title={machineName(f.machineId)} right={<StateWord label={f.severity === "Critical" ? "Review now" : "Needs review"} tone={f.severity === "Critical" ? "bad" : "warn"} />}>
              <h4 className="pm-detail-title" title={`${f.name} · ${machineCode(f.machineId)} · ${f.ruleId}`}>
                {f.plainTitle || f.name}
              </h4>
              {l?.tag && hist.length > 2 && (
                <div className="pm-spark">
                  <span className="ast-caption" title={l.tag}>
                    {displayName(l.def?.name ?? l.tag)} · last {Math.round(hist.length / 60)} hours
                  </span>
                  <Sparkline values={hist} unit={l.def?.unit ?? ""} digits={l.def?.decimals ?? 1} height={56} tone={(f.severity === "Critical" ? "bad" : "warn") as Tone} ariaLabel={`${l.tag} trend`} />
                </div>
              )}
              <DefList
                rows={[
                  ...(f.plainWhat ? [{ label: "What is happening", value: f.plainWhat }] : []),
                  { label: "What the sensors show", value: f.evidence },
                  { label: "Time left", value: prognosisText(f.timeToLimit) },
                  { label: "If nobody acts", value: f.consequence },
                  { label: "Likely cause", value: f.cause },
                  ...(f.unproven ? [{ label: "Not yet proven", value: f.unproven }] : []),
                  { label: "How sure", value: `${Math.round(f.confidence * (f.confidence <= 1 ? 100 : 1))}%` },
                  { label: "What to do", value: f.plainTodo || f.action },
                  ...(f.owner ? [{ label: "Who should act", value: f.owner }] : []),
                ]}
              />
              {f.priority === "P1" && <p className="pm-callout" data-tone="bad">Follow the plant’s set response for this problem now. Do not wait for a forecast before acting.</p>}
              <Notice outcome={notice} />
              <div className="pm-actions">
                {wo ? (
                  <>
                    <StateWord label={`${woRef(wo.id)} · ${STAGE_LABEL[wo.stage]}`} tone={stageTone(wo.stage)} />
                    <PillButton variant="secondary" onClick={() => { setPmsFocus(`w:${wo.id}`); nav("work"); }}>
                      Open work order
                    </PillButton>
                  </>
                ) : (
                  <PillButton onClick={() => setProposing(f)}>Ask for a repair</PillButton>
                )}
                <PillButton variant="secondary" onClick={() => { setPmsFocus(`m:${f.machineId}`); nav("machine"); }}>
                  Open machine
                </PillButton>
              </div>
            </Section>
          ) : (
            <Section id="pm-finding" title="Problem">
              <Empty title="Pick a problem from the list to see its details." />
            </Section>
          )}
        </div>
      </div>
      <ProposeDialog
        open={proposing !== null}
        finding={proposing}
        machineIds={data.machineIds}
        onClose={() => setProposing(null)}
        onPropose={async (input) => {
          const out = await pms.propose(input);
          setNotice(out);
          return out;
        }}
      />
    </div>
  );
}
