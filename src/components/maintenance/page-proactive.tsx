"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PillButton, PillNav, rowActivate, type Tone } from "@/components/ui";
import { isOpenStage } from "@/lib/pms";
import { formatLocalTime } from "@/lib/time";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { Empty, KpiStrip, Section } from "@/components/assets/analysis/an-ui";
import { formatRulHours } from "@/components/assets/prognosis/prognosis-derive";
import type { PmsWorkOrder } from "@/types/pms";
import type { TrendLife } from "@/types/maintenance-types";
import type { Outcome, PmsModel } from "./pms-model";
import { machineName, pmsCall, prognosisText, woRef } from "./pms-model";
import { lifeUnits, partLife, useRunningHours, useServiceParts, useTrendLives, type PartLife } from "./maint-types-model";
import { Loading } from "./page-overview";
import { PlanJobDialog, type PlanJobDraft } from "./plan-job-dialog";
import { DefList, ItemCell, NoteDialog, Notice, PM_ICON, StateWord, setPmsFocus, usePmsFocus, usePmsNav } from "./pms-ui";

/* ==========================================================================
   Maintenance › Proactive: act before a part's life runs out.
     Service life   each part's life criterion (running hours or days) against
                    the machine's running-hours counter; plan the replacement
                    before it reaches its due share, record it when done.
     Sensor trend   a reading moving toward its alarm limit: the time left at
                    today's trend (Prognosis' remaining life), never a failure
                    time.
   ========================================================================== */

type Filter = "all" | "parts" | "trends";

interface Row {
  key: string;
  kind: "part" | "trend";
  machineId: string;
  name: string;
  place: string | null;
  share: number | null;
  left: string;
  /** Plan by (part: its due share; trend: when the reading reaches its limit), ms. */
  actBy: number | null;
  state: { label: string; tone: Tone };
  job: PmsWorkOrder | null;
  life?: PartLife;
  trend?: TrendLife;
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

export function PageProactive({ pms }: { pms: PmsModel }) {
  const { data, now } = pms;
  const partsApi = useServiceParts();
  const trendsApi = useTrendLives();
  const counter = useRunningHours();
  const nav = usePmsNav();
  const focus = usePmsFocus(["r:"]);
  const { navigateToMachine } = useIndustrialData();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(focus ? `part:${focus.slice(2)}` : null);
  const [draft, setDraft] = useState<PlanJobDraft | null>(null);
  const [replacing, setReplacing] = useState<PartLife | null>(null);
  const [notice, setNotice] = useState<Outcome | null>(null);
  const tz = useSiteTimeZone({ machineId: data?.machineIds[0] });
  useEffect(() => setNotice(null), [selected]);

  const inPlant = useMemo(() => new Set(data?.machineIds ?? []), [data]);
  const proactiveJobs = useMemo(() => (data?.workOrders ?? []).filter((w) => w.maintenanceType === "proactive" && isOpenStage(w.stage)), [data]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const p of partsApi.data ?? []) {
      if (!inPlant.has(p.machineId)) continue;
      const life = partLife(p, counter(p.machineId), now);
      out.push({
        key: `part:${p.id}`,
        kind: "part",
        machineId: p.machineId,
        name: p.name,
        place: p.subName,
        share: life.share,
        left: lifeUnits(life.leftUnits, p.basis),
        actBy: life.planBy,
        state: life.state === "over" ? { label: "Life used up", tone: "bad" } : life.state === "due" ? { label: "Due for replacement", tone: "warn" } : { label: "In service", tone: "idle" },
        job: proactiveJobs.find((w) => w.partId === p.id) ?? null,
        life,
      });
    }
    for (const t of trendsApi.data ?? []) {
      if (!inPlant.has(t.machineId)) continue;
      out.push({
        key: `trend:${t.machineId}:${t.id}`,
        kind: "trend",
        machineId: t.machineId,
        name: t.name,
        place: t.driver,
        share: null,
        left: formatRulHours(t.hours),
        actBy: now + t.hours * 3_600_000,
        state: { label: "Heading to its limit", tone: t.status === "Critical" ? "bad" : t.status === "Alert" ? "warn" : "idle" },
        job: proactiveJobs.find((w) => w.partId === null && w.machineId === t.machineId && w.component === t.name) ?? null,
        trend: t,
      });
    }
    const rank = (r: Row) => (r.life?.state === "over" ? 0 : 1);
    return out.sort((a, b) => rank(a) - rank(b) || (a.actBy ?? Infinity) - (b.actBy ?? Infinity) || a.name.localeCompare(b.name));
  }, [partsApi.data, trendsApi.data, inPlant, counter, now, proactiveJobs]);

  if (!data) return <Loading pms={pms} what="the parts" />;

  const list = rows.filter((r) => (filter === "parts" ? r.kind === "part" : filter === "trends" ? r.kind === "trend" : true));
  const row = list.find((r) => r.key === selected) ?? list[0] ?? null;
  const when = (ms: number | null) => (ms === null ? "—" : formatLocalTime(ms, { date: true, seconds: false, timeZone: tz.timeZone }));
  const short = (ms: number | null) => (ms === null ? "—" : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz.timeZone || undefined }).format(ms));
  const parts = rows.filter((r) => r.kind === "part");
  const due = parts.filter((r) => r.life?.state !== "ok");
  const over = parts.filter((r) => r.life?.state === "over").length;
  const next = rows.find((r) => r.actBy !== null);
  const nextNow = next !== undefined && ((next.life !== undefined && next.life.state !== "ok") || (next.actBy ?? Infinity) <= now);
  const loading = (partsApi.isLoading && !partsApi.data) || (trendsApi.isLoading && !trendsApi.data);

  const replace = async (life: PartLife, note: string): Promise<Outcome> => {
    const counterH = counter(life.part.machineId);
    if (counterH === null) return { tone: "bad", text: "The machine's running hours are not known yet; try again in a moment" };
    const job = proactiveJobs.find((w) => w.partId === life.part.id);
    const out = await pmsCall(`/api/maintenance/parts/${encodeURIComponent(life.part.id)}/replace`, "POST", { counterH, note, workOrderId: job?.id ?? null }, "Could not record the replacement");
    const res: Outcome = "error" in out ? { tone: "bad", text: out.error } : { tone: "good", text: `${life.part.name}: replacement recorded, its life starts again` };
    if (res.tone === "good") setNotice(res);
    return res;
  };

  return (
    <div className="ast-root pg-frame pm-page" style={{ "--pm-side": "460px" } as React.CSSProperties}>
      <KpiStrip
        page
        label="Remaining life"
        items={[
          { label: "Parts with a service life", value: `${parts.length}`, foot: `${rows.length - parts.length} more heading to a limit by trend` },
          { label: "Due for replacement", value: `${due.length}`, tone: over ? "bad" : due.length ? "warn" : undefined, foot: over ? `${over} past their life` : "past the share of life where replacement is planned" },
          { label: "Next to act on", value: next ? (nextNow ? "Now" : short(next.actBy)) : "—", text: true, foot: next ? `${next.name} · ${machineName(next.machineId)}` : "nothing ahead" },
          { label: "Replacements planned", value: `${proactiveJobs.length}`, foot: "open jobs in Work orders and the Calendar" },
        ]}
      />
      <div className="pg-frame-body">
        <div className="pm-split">
          <Section
            id="pm-life"
            title="Remaining life"
            right={<PillNav ariaLabel="Show" items={[{ id: "all", label: "All" }, { id: "parts", label: "Service life" }, { id: "trends", label: "Sensor trends" }]} activeId={filter} onChange={(id) => setFilter(id as Filter)} />}
          >
            {loading ? (
              <Empty title="Loading remaining life…" />
            ) : list.length === 0 ? (
              <Empty title={filter === "trends" ? "No reading is moving toward its alarm limit." : "No part service lives recorded for this plant."}>{partsApi.error ?? trendsApi.error ?? undefined}</Empty>
            ) : (
              <div className="ui-table-container ast-table pm-table">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th className="pm-grow">Part</th>
                      <th>Life used</th>
                      <th className="ast-num">Left</th>
                      <th>Plan by</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.key} className={`is-clickable ${row?.key === r.key ? "active" : ""}`} {...rowActivate(() => setSelected(r.key))}>
                        <td className="pm-grow">
                          <ItemCell icon={r.kind === "part" ? PM_ICON.part : PM_ICON.sensor} tone={r.state.tone} title={r.name} sub={[machineName(r.machineId), r.kind === "part" ? r.place : `trend of ${r.place ?? "a reading"}`].filter(Boolean).join(" · ")} />
                        </td>
                        <td>
                          {r.share === null ? (
                            <span className="pm-muted">—</span>
                          ) : (
                            <span className="pm-life">
                              <span className="pm-life-bar" data-tone={r.state.tone === "idle" ? undefined : r.state.tone} aria-hidden="true">
                                <span style={{ width: `${Math.min(100, r.share * 100)}%` }} />
                              </span>
                              <span className="ast-num">{pct(r.share)}</span>
                            </span>
                          )}
                        </td>
                        <td className="ast-num">{r.left}</td>
                        <td className="pm-muted">{r.life && r.life.state !== "ok" ? "Now" : short(r.actBy)}</td>
                        <td>{r.job ? <StateWord label={`Planned · ${woRef(r.job.id)}`} /> : <StateWord label={r.state.label} tone={r.state.tone} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {row?.life ? (
            <PartDetail
              life={row.life}
              job={row.job}
              when={when}
              notice={notice}
              onPlan={() => {
                // Keep this part picked when the list re-sorts after the change.
                setSelected(row.key);
                setDraft({
                  type: "proactive",
                  machineId: row.machineId,
                  componentId: row.life!.part.id,
                  title: `Replace ${row.life!.part.name.toLowerCase()}`,
                  component: row.life!.part.subName,
                  at: row.life!.planBy,
                  notes: `${pct(row.life!.share)} of its ${lifeUnits(row.life!.part.life, row.life!.part.basis)} life used.`,
                });
              }}
              onReplace={() => {
                setSelected(row.key);
                setReplacing(row.life!);
              }}
              onOpenWo={(id) => {
                setPmsFocus(`w:${id}`);
                nav("work");
              }}
            />
          ) : row?.trend ? (
            <Section id="pm-life-detail" title={machineName(row.machineId)} right={<StateWord label={row.state.label} tone={row.state.tone} />}>
              <h4 className="pm-detail-title">{row.name}</h4>
              <DefList
                rows={[
                  { label: "Time left", value: prognosisText(formatRulHours(row.trend.hours)) },
                  { label: "Reaches its limit", value: when(row.actBy) },
                  ...(row.trend.driver ? [{ label: "Reading", value: row.trend.driver }] : []),
                  ...(row.trend.confidence !== null ? [{ label: "How steady the trend is", value: `${row.trend.confidence} %`, hint: "R² of the trend line" }] : []),
                  ...(row.job ? [{ label: "Planned", value: `${woRef(row.job.id)} · ${row.job.plannedStart ? when(Date.parse(row.job.plannedStart)) : "no date yet"}` }] : []),
                ]}
              />
              <Notice outcome={notice} />
              <div className="pm-actions">
                {row.job ? (
                  <PillButton variant="secondary" onClick={() => { setPmsFocus(`w:${row.job!.id}`); nav("work"); }}>
                    Open work order
                  </PillButton>
                ) : (
                  <PillButton onClick={() => { setSelected(row.key); setDraft({ type: "proactive", machineId: row.machineId, title: `Inspect ${row.name.toLowerCase()}`, component: row.name, at: row.actBy, notes: `${row.trend!.driver ?? "A reading"} reaches its alarm limit in about ${formatRulHours(row.trend!.hours)} at today's trend.` }); }}>
                    Plan work
                  </PillButton>
                )}
                <PillButton variant="secondary" onClick={() => navigateToMachine(row.machineId, "prognosis")}>
                  Open Prognosis
                </PillButton>
              </div>
            </Section>
          ) : (
            <Section id="pm-life-detail" title="Part">
              <Empty title="Pick a part to see its life and plan its replacement." />
            </Section>
          )}
        </div>
      </div>

      <PlanJobDialog
        open={draft !== null}
        draft={draft}
        machineIds={data.machineIds}
        title={draft?.componentId ? "Plan the replacement" : "Plan work"}
        onClose={() => setDraft(null)}
        onPropose={async (input) => {
          const out = await pms.propose(input);
          setNotice(out);
          return out;
        }}
      />
      <NoteDialog
        open={replacing !== null}
        title="Record the replacement"
        subtitle={replacing ? `${machineName(replacing.part.machineId)} · ${replacing.part.name}` : undefined}
        label="What was fitted"
        hint="Part, who fitted it, anything found. The part's life starts again from now."
        confirm="Record replacement"
        onClose={() => setReplacing(null)}
        onConfirm={(note) => (replacing ? replace(replacing, note) : Promise.resolve({ tone: "bad", text: "No part picked" }))}
      />
    </div>
  );
}

function PartDetail({
  life,
  job,
  when,
  notice,
  onPlan,
  onReplace,
  onOpenWo,
}: {
  life: PartLife;
  job: PmsWorkOrder | null;
  when: (ms: number | null) => string;
  notice: Outcome | null;
  onPlan: () => void;
  onReplace: () => void;
  onOpenWo: (id: number) => void;
}) {
  const p = life.part;
  const last = p.events.find((e) => e.action === "replaced");
  const tone: Tone = life.state === "over" ? "bad" : life.state === "due" ? "warn" : "idle";
  return (
    <Section id="pm-life-detail" title={machineName(p.machineId)} right={<StateWord label={life.state === "over" ? "Life used up" : life.state === "due" ? "Due for replacement" : "In service"} tone={tone} />}>
      <h4 className="pm-detail-title">{p.name}</h4>
      <DefList
        rows={[
          ...(p.subName ? [{ label: "Part of the machine", value: p.subName }] : []),
          { label: "Service life", value: `${lifeUnits(p.life, p.basis)}${p.basis === "h" ? " of running" : " in service"}` },
          { label: "Used", value: `${lifeUnits(life.usedUnits, p.basis)} · ${pct(life.share)}`, tone: tone },
          { label: "Left", value: lifeUnits(life.leftUnits, p.basis) },
          { label: "Plan the replacement by", value: `${life.state === "ok" ? when(life.planBy) : "Now"} · at ${pct(p.dueShare)} of its life` },
          { label: "Life runs out", value: life.state === "over" ? "Already past" : when(life.runsOut) },
          ...(p.installed ? [{ label: "Fitted", value: p.installed }] : []),
          ...(p.duty ? [{ label: "Duty", value: p.duty }] : []),
          ...(last ? [{ label: "Last replaced", value: `${when(Date.parse(last.at))}${last.actor ? ` · ${last.actor}` : ""}${last.note ? ` · ${last.note}` : ""}` }] : []),
          ...(job ? [{ label: "Planned", value: `${woRef(job.id)} · ${job.plannedStart ? when(Date.parse(job.plannedStart)) : "no date yet"}` }] : []),
          ...(p.recordSource ? [{ label: "Record", value: p.recordSource }] : []),
        ]}
      />
      <Notice outcome={notice} />
      <div className="pm-actions">
        {job ? (
          <PillButton variant="secondary" onClick={() => onOpenWo(job.id)}>
            Open work order
          </PillButton>
        ) : (
          <PillButton onClick={onPlan}>Plan replacement</PillButton>
        )}
        <PillButton variant="secondary" onClick={onReplace}>
          Record replacement
        </PillButton>
      </div>
    </Section>
  );
}
