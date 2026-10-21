"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loading as LoadingState, PillNav, Skel, conditionTone, rowActivate, toCondition, type Tone } from "@/components/ui";
import { isConditionRule } from "@shared/lib/plant-defs";
import { STAGE_LABEL, isOpenStage, planGenerates, planKey } from "@shared/lib/pms";
import { LINE_SHEET_ART, LINE_SHEET_BY_ID, LINE_SHEET_OF_TAG, lineSheetTags, lineSheetsForMachine } from "@/components/assets/pyro/line-sheets";
import { LineSheet } from "@/components/assets/pyro/line-sheets/line-sheet";
import { useKilnFleet, useLivePlantStarting } from "@/providers/kiln-simulation-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import type { PmsPlan, PlanTask } from "@shared/types/pms";
import { Empty, KpiStrip, Section } from "@/components/assets/analysis/an-ui";
import type { PmsModel } from "./pms-model";
import { dueStatus, machineName, planName, prognosisText, stageTone, useDefaultMachine, woRef } from "./pms-model";
import { nameIds } from "@/lib/display-name";
import { Loading } from "./page-overview";
import { PlanJobDialog, type PlanJobDraft } from "./plan-job-dialog";
import { StateWord, setPmsFocus, usePmsFocus, usePmsNav } from "./pms-ui";

/* ==========================================================================
   Maintenance › Machine maintenance: pick a machine, open its ULTRON drawing,
   pick a component (the drawing's detail sheets) and see its condition,
   active faults, live readings, previous maintenance, upcoming inspections
   and work orders (PMS interface p.04, report §6 "selected equipment view").
   ========================================================================== */

const STOP = new Set(["and", "with", "system", "main", "kiln", "rotary", "additional", "minor", "fixed", "hardware", "assemblies", "assembly", "mechanical", "interface", "valves", "overview", "the", "from", "including"]);

/** Significant words of a title: "Roller stations and tyres" → roller, station, tyre. */
function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4 && !STOP.has(w))
      .map((w) => (w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w)),
  );
}

/** Checklist sections that describe a drawing component: the best-matching section titles. */
function matchSections(sheetTitle: string, tasks: PlanTask[]): Set<string> {
  const want = words(sheetTitle);
  const score = new Map<string, number>();
  for (const t of tasks) {
    if (score.has(t.sectionTitle)) continue;
    let n = 0;
    for (const w of words(t.sectionTitle)) if (want.has(w)) n += 1;
    score.set(t.sectionTitle, n);
  }
  const best = Math.max(0, ...score.values());
  return new Set(best ? [...score].filter(([, n]) => n === best).map(([s]) => s) : []);
}

const SIG_TONE = (s: string | undefined): Tone | undefined => (s === "Critical" ? "bad" : s === "Alert" ? "warn" : undefined);

/**
 * `machineId` / `onMachineChange` let the workspace's machine tabs drive the page
 * (its own machine picker is then hidden); uncontrolled, the page picks its own.
 */
export function PageMachine({ pms, machineId: picked, onMachineChange }: { pms: PmsModel; machineId?: string | null; onMachineChange?: (id: string) => void }) {
  const { data, dues, now } = pms;
  const nav = usePmsNav();
  const fleet = useKilnFleet();
  const focus = usePmsFocus(["m:"]);
  const [own, setOwn] = useState<string | null>(focus ? focus.slice(2) : null);
  const [part, setPart] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  // "Plan maintenance" on a fault: the plan-job form, prefilled from the fault.
  const [planning, setPlanning] = useState<PlanJobDraft | null>(null);
  const controlled = Boolean(onMachineChange);
  const machineId = controlled ? (picked ?? own) : own;
  const setMachineId = (m: string) => (onMachineChange ? onMachineChange(m) : setOwn(m));
  // Opened on a machine from another page: the workspace's tabs follow it.
  useEffect(() => {
    if (focus && onMachineChange) onMachineChange(focus.slice(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultMachine = useDefaultMachine(data?.machineIds);
  const id = (machineId && data?.machineIds.includes(machineId) ? machineId : null) ?? defaultMachine;
  useEffect(() => {
    setPart(null);
    setTag(null);
  }, [id]);
  const tz = useSiteTimeZone({ machineId: id });
  const frame = id ? (fleet[id]?.frame ?? null) : null;
  // No frame yet while the live plant starts: its values wait instead of reading "No data".
  const starting = useLivePlantStarting() && !frame;
  const sheets = useMemo(() => (id ? lineSheetsForMachine(id) : []), [id]);
  const overview = sheets.find((s) => s.kind === "overview") ?? null;
  const parts = useMemo(() => (overview?.parts ?? []).map((p) => LINE_SHEET_BY_ID[p]).filter(Boolean), [overview]);
  const active = part && parts.some((p) => p.id === part) ? LINE_SHEET_BY_ID[part] : null;
  const sheetId = active && LINE_SHEET_ART[active.id]?.ready !== false ? active.id : overview?.id ?? null;

  const plans = useMemo(() => (data && id ? data.plans.filter((p) => p.machineId === id) : []), [data, id]);
  // General hardware (GEN) is not a drawing component; match the machine's own sections.
  const machineTasks = useMemo(() => plans.filter((p) => p.kind === "equipment" && p.unitCode !== "GEN").flatMap((p) => p.tasks), [plans]);

  // Per component: its points, condition, faults and linked checklist tasks.
  const compOf = useMemo(() => {
    const out = new Map<string, { tags: string[]; worst: string; faults: number; taskIds: Set<string> }>();
    for (const p of parts) {
      const tags = lineSheetTags(p.id);
      const sections = matchSections(p.title, machineTasks);
      const taskIds = new Set<string>();
      for (const pl of plans)
        for (const t of pl.tasks) if ((pl.kind === "equipment" && sections.has(t.sectionTitle)) || (pl.kind === "sensor" && t.tag && tags.includes(t.tag))) taskIds.add(t.id);
      let worst = "Normal";
      for (const t of tags) {
        const s = frame?.signals[t]?.status;
        if (s === "Critical" || (s === "Alert" && worst === "Normal")) worst = s;
      }
      const faults = (frame?.rules ?? []).filter((r) => r.status !== "QUIET" && isConditionRule(r) && r.tags.some((x) => tags.includes(x))).length;
      out.set(p.id, { tags, worst, faults, taskIds });
    }
    return out;
    // Re-derive when a point's status changes, not every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts, plans, machineTasks, frame?.t && Math.floor(frame.t / 5)]);

  if (!data || !id) return <Loading pms={pms} what="machine maintenance" />;

  const comp = active ? compOf.get(active.id) : null;
  const compTags = comp?.tags ?? [];
  const faults = (frame?.rules ?? []).filter((r) => r.status !== "QUIET" && isConditionRule(r) && (active ? r.tags.some((x) => compTags.includes(x)) : true));
  const taskIds = comp?.taskIds ?? new Set(plans.flatMap((p) => p.tasks.map((t) => t.id)));
  const relatedPlans = plans.filter((p) => p.tasks.some((t) => taskIds.has(t.id)));
  const records = data.records.filter((r) => r.machineId === id && taskIds.has(r.taskId)).slice(0, 8);
  // Task names from the plans; the code stays in the tooltip.
  const taskName = new Map(plans.flatMap((p) => p.tasks.map((t) => [t.id, t.component] as const)));
  const ruleIds = new Set(faults.map((r) => r.id));
  const allRuleTags = new Map((frame?.rules ?? []).map((r) => [r.id, r.tags]));
  const wos = data.workOrders.filter(
    (w) =>
      w.machineId === id &&
      (!active ||
        (w.ruleId && (ruleIds.has(w.ruleId) || (allRuleTags.get(w.ruleId) ?? []).some((x) => compTags.includes(x)))) ||
        (w.source.kind === "inspection" && w.source.ref && taskIds.has(w.source.ref))),
  );
  const openWos = wos.filter((w) => isOpenStage(w.stage));
  // Whole machine: every measuring point of the drawing, the ones needing attention first.
  const RANK: Record<string, number> = { Critical: 0, Alert: 1 };
  const points = active
    ? (active.points ?? [])
    : (overview ? lineSheetTags(overview.id) : [])
        .map((t) => ({ tag: t, text: LINE_SHEET_OF_TAG[t]?.point.text ?? t }))
        .sort((a, b) => (RANK[frame?.signals[a.tag]?.status ?? ""] ?? 2) - (RANK[frame?.signals[b.tag]?.status ?? ""] ?? 2) || a.tag.localeCompare(b.tag))
        .slice(0, 12);
  const pointCount = active ? points.length : overview ? lineSheetTags(overview.id).length : 0;
  const cond = active ? toCondition(comp?.worst ?? null) : toCondition(frame?.condition ?? null);
  const nextDue = relatedPlans
    .filter(planGenerates)
    .map((p) => ({ p, d: dues.get(planKey(p)) }))
    .filter((x) => x.d?.dueAt)
    .sort((a, b) => a.d!.dueAt! - b.d!.dueAt!)[0];
  const when = (t: number | string) => formatLocalTime(t, { date: true, seconds: false, timeZone: tz.timeZone });

  const pickTag = (t: string | null) => {
    setTag(t);
    if (!t || active) return;
    const s = LINE_SHEET_OF_TAG[t]?.sheet;
    if (s && parts.some((p) => p.id === s)) setPart(s);
  };

  return (
    <div className="ast-root pg-frame pm-page" style={{ "--pm-side": "400px" } as React.CSSProperties}>
      {!controlled && (
        <div className="ast-toolbar pm-toolbar">
          <PillNav ariaLabel="Machine" items={data.machineIds.map((m) => ({ id: m, label: machineName(m) }))} activeId={id} onChange={setMachineId} />
          <span className="ast-caption">{machineName(id)}</span>
        </div>
      )}
      <KpiStrip
        page
        label={`${machineName(id)} maintenance`}
        items={[
          { label: active ? "Component condition" : "Machine condition", loading: starting, value: cond, text: true, tone: conditionTone(cond), foot: active ? `${compTags.length} measuring points` : `health score ${frame ? Math.round(frame.overall) : "—"}%` },
          { label: "Active problems", loading: starting, value: `${faults.length}`, tone: faults.some((f) => f.severity === "Critical") ? "bad" : faults.length ? "warn" : undefined, foot: faults[0] ? faults[0].plainTitle || faults[0].name : "no active problem" },
          {
            label: "Next inspection",
            value: nextDue ? (nextDue.d!.dueAt! <= now ? "Due now" : formatLocalTime(nextDue.d!.dueAt!, { date: true, seconds: false, timeZone: tz.timeZone })) : "—",
            text: true,
            foot: nextDue ? planName(nextDue.p) : "no scheduled round covers it",
          },
          { label: "Open work orders", value: `${openWos.length}`, foot: `${wos.length - openWos.length} closed or cancelled` },
        ]}
      />
      <div className="pg-frame-body">
        <div className="pm-split">
          <Section
            id="pm-drawing"
            title={active ? active.title : machineName(id)}
            right={
              active ? (
                <button type="button" className="pm-link" onClick={() => { setPart(null); setTag(null); }}>
                  Whole machine
                </button>
              ) : (
                <span className="ast-caption">Click a measuring point or a part of the machine</span>
              )
            }
          >
            {sheetId ? (
              <div className="pm-drawing">
                <LineSheet key={sheetId} sheetId={sheetId} machineId={id} frame={frame} selectedTag={tag} onSelectTag={pickTag} drawingOnly chips={Boolean(active)} />
              </div>
            ) : (
              <Empty title="No drawing for this machine." />
            )}
          </Section>

          <Section id="pm-components" title="Components">
            <ul className="pm-machines">
              {parts.map((p) => {
                const c = compOf.get(p.id);
                const t = SIG_TONE(c?.worst);
                const n = c ? data.workOrders.filter((w) => w.machineId === id && isOpenStage(w.stage) && w.source.kind === "inspection" && w.source.ref && c.taskIds.has(w.source.ref)).length : 0;
                return (
                  <li key={p.id}>
                    <button type="button" className="pm-machine" aria-pressed={active?.id === p.id} onClick={() => { setPart(active?.id === p.id ? null : p.id); setTag(null); }}>
                      <span className="ast-chip-dot" data-tone={t ?? "idle"} aria-hidden="true" />
                      <span className="pm-machine-name">{p.title}</span>
                      <span className="pm-machine-state" data-tone={t}>
                        {[c?.faults ? `${c.faults} ${c.faults === 1 ? "fault" : "faults"}` : null, n ? `${n} open` : null, `${c?.taskIds.size ?? 0} tasks`].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>

        <div className="pm-split">
          <Section id="pm-readings" title="Readings and problems" right={!active && pointCount > points.length ? <span className="ast-caption">{points.length} of {pointCount} points · pick a part to see all</span> : undefined}>
            {starting && <LoadingState label="Starting the live plant…" inline />}
            {!starting && faults.length === 0 && points.length > 0 && <p className="ast-caption pm-nofault">No active problem{active ? " on this part" : " on this machine"}.</p>}
            {faults.length > 0 && (
              <ul className="pm-list pm-faults">
                {faults.map((r) => {
                  // A fault that already has open work links to it instead of planning a second job.
                  const linked = pms.openWos.find((w) => w.machineId === id && w.ruleId === r.id) ?? null;
                  return (
                    <li key={r.id}>
                      <StateWord label={r.plainTitle || r.name} tone={r.severity === "Critical" ? "bad" : "warn"} />
                      <span className="ast-caption" title={`${r.name} (${r.id}) · ${r.evidence}`}>
                        {nameIds(r.evidence, frame?.defs)} · {prognosisText(r.timeToLimit)}
                      </span>
                      {linked ? (
                        <button type="button" className="pm-link pm-small" onClick={() => { setPmsFocus(`w:${linked.id}`); nav("work"); }}>
                          {woRef(linked.id)} ›
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="pm-link pm-small"
                          onClick={() =>
                            setPlanning({
                              type: "predictive",
                              machineId: id,
                              ruleId: r.id,
                              title: r.plainTodo || r.action,
                              component: r.subs.join(", ") || active?.title || null,
                              notes: [`${r.plainTitle || r.name}.`, `Evidence: ${nameIds(r.evidence, frame?.defs)}.`, r.cause ? `Likely cause: ${r.cause}.` : null].filter(Boolean).join(" "),
                            })
                          }
                        >
                          Plan maintenance ›
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {points.length > 0 ? (
              <div className="ui-table-container ast-table pm-table">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th className="pm-grow">Measurement</th>
                      <th>Value</th>
                      <th>Data quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((pt) => {
                      const s = frame?.signals[pt.tag];
                      return (
                        <tr key={pt.tag} className={`is-clickable ${tag === pt.tag ? "active" : ""}`} {...rowActivate(() => setTag(tag === pt.tag ? null : pt.tag))}>
                          <td className="pm-grow">
                            <span className="ast-cell-text pm-wrap" title={`${pt.tag} · ${pt.text}`}>
                              {pt.text}
                            </span>
                          </td>
                          <td className="ast-num" data-tone={SIG_TONE(s?.status)}>
                            <span className="pm-value">{s?.display ?? (starting ? <Skel width="4ch" /> : "—")}</span>
                          </td>
                          <td>
                            {!s && starting ? <Skel width="4ch" /> : <StateWord label={!s ? "No data" : s.quality === "Good" ? "Good" : s.quality} tone={s && s.quality !== "Good" ? "warn" : undefined} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              faults.length === 0 && <Empty title="No measuring points on this drawing." />
            )}
          </Section>

          <Section id="pm-comp-maint" title="Maintenance">
            <div className="pm-block">
              <h4 className="pg-analysis-block-title">Upcoming inspections</h4>
              {relatedPlans.length === 0 ? (
                <p className="ast-caption">No checklist round covers this part.</p>
              ) : (
                <ul className="pm-rows">
                  {relatedPlans.slice(0, 6).map((p: PmsPlan) => {
                    const st = dueStatus(p, dues.get(planKey(p)));
                    const d = dues.get(planKey(p));
                    const n = p.tasks.filter((t) => taskIds.has(t.id)).length;
                    return (
                      <li key={p.id}>
                        <button type="button" className="pm-link" onClick={() => { setPmsFocus(`p:${planKey(p)}`); nav("calendar"); }}>
                          {planName(p)}
                        </button>
                        <span className="ast-caption">{n} tasks</span>
                        <StateWord label={d?.dueAt && d.dueAt > now ? when(d.dueAt) : st.label} tone={st.tone} />
                      </li>
                    );
                  })}
                </ul>
              )}
              {relatedPlans.length > 6 && (
                <button type="button" className="pm-link pm-small pm-more-link" onClick={() => { setPmsFocus(`p:${planKey(relatedPlans[6])}`); nav("calendar"); }}>
                  {relatedPlans.length - 6} more rounds in Calendar ›
                </button>
              )}
            </div>
            <div className="pm-block">
              <h4 className="pg-analysis-block-title">Work orders</h4>
              {wos.length === 0 ? (
                <p className="ast-caption">No work orders yet.</p>
              ) : (
                <ul className="pm-rows">
                  {wos.slice(0, 6).map((w) => (
                    <li key={w.id}>
                      <button type="button" className="pm-link" onClick={() => { setPmsFocus(`w:${w.id}`); nav("work"); }}>
                        {woRef(w.id)} · {w.title}
                      </button>
                      <span className="ast-caption">{w.priority}</span>
                      <StateWord label={STAGE_LABEL[w.stage]} tone={stageTone(w.stage)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="pm-block">
              <h4 className="pg-analysis-block-title">Previous maintenance</h4>
              {records.length === 0 ? (
                <p className="ast-caption">No inspection recorded yet.</p>
              ) : (
                <ul className="pm-rows">
                  {records.map((r) => (
                    <li key={r.id}>
                      <span className="pm-row-title" title={r.taskId}>
                        {taskName.get(r.taskId) ?? r.taskId} · {r.result === "NA" ? "Not applicable" : r.result === "Hold" ? "Needs follow-up" : r.result}
                        {r.note ? <span className="ast-caption"> · {r.note}</span> : null}
                      </span>
                      <span className="ast-caption">{r.inspector ?? ""}</span>
                      <span className="ast-caption">{when(r.recordedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>
        </div>
      </div>

      <PlanJobDialog
        open={planning !== null}
        draft={planning}
        machineIds={data.machineIds}
        title="Plan maintenance"
        onClose={() => setPlanning(null)}
        onPropose={pms.propose}
      />
    </div>
  );
}
