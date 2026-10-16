"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav, type Tone } from "@/components/ui";
import { latestByTask } from "@/lib/maintenance";
import { STAGE_LABEL, planGenerates, planHours } from "@/lib/pms";
import { useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import type { WoStage } from "@/types/pms";
import { Empty, KpiStrip, Section } from "@/components/assets/analysis/an-ui";
import type { PmsModel } from "./pms-model";
import { machineCode, woRef } from "./pms-model";
import { Loading } from "./page-overview";
import { StateWord } from "./pms-ui";

/* ==========================================================================
   Maintenance › History & performance: one timeline of inspections,
   work-order changes and plan decisions across the line, the effectiveness
   figures that have honest denominators, and machine condition around the
   work (PMS interface p.11, report §10, §13). Repair cost and running hours
   are not recorded yet, so they are not shown.
   ========================================================================== */

type Filter = "all" | "wo" | "inspection" | "plan";

interface Entry {
  key: string;
  machineId: string;
  at: number;
  kind: Exclude<Filter, "all">;
  title: string;
  detail: string | null;
  actor: string | null;
  tone?: Tone;
}

const RESULT_WORD: Record<string, string> = { Pass: "Pass", NA: "Not applicable", Hold: "Needs follow-up", Defect: "Defect" };

export function PageHistory({ pms }: { pms: PmsModel }) {
  const { data: line, dues } = pms;
  const [machine, setMachine] = useState("all");
  const machineId = machine === "all" ? (line?.machineIds.find((m) => m.endsWith("KLN-01")) ?? line?.machineIds[0] ?? "") : machine;
  const tz = useSiteTimeZone({ machineId });
  const [filter, setFilter] = useState<Filter>("all");
  // The page's machine filter narrows every figure below.
  const data = useMemo(() => {
    if (!line || machine === "all") return line;
    return {
      ...line,
      plans: line.plans.filter((p) => p.machineId === machine),
      workOrders: line.workOrders.filter((w) => w.machineId === machine),
      records: line.records.filter((r) => r.machineId === machine),
      events: line.events.filter((e) => e.machineId === machine),
    };
  }, [line, machine]);
  const [limit, setLimit] = useState(40);
  const when = (t: number | string) => formatLocalTime(t, { date: true, seconds: false, timeZone: tz.timeZone });

  const entries = useMemo<Entry[]>(() => {
    if (!data) return [];
    const out: Entry[] = [];
    for (const r of data.records)
      out.push({
        key: `r${r.id}`,
        machineId: r.machineId,
        at: Date.parse(r.recordedAt),
        kind: "inspection",
        title: `${r.taskId} · ${RESULT_WORD[r.result] ?? r.result}`,
        detail: [r.note, r.workOrderId ? `opened ${woRef(r.workOrderId)}` : null].filter(Boolean).join(" · ") || null,
        actor: r.inspector,
        tone: r.result === "Defect" ? "bad" : r.result === "Hold" ? "warn" : undefined,
      });
    for (const w of data.workOrders)
      out.push({
        key: `w${w.id}`,
        machineId: w.machineId,
        at: Date.parse(w.createdAt),
        kind: "wo",
        title: `${woRef(w.id)} raised · ${w.title}`,
        detail: w.source.kind === "finding" ? `Finding ${w.source.ref} · ${w.priority}` : w.source.kind === "inspection" ? `Checklist defect ${w.source.ref} · ${w.priority}` : w.priority,
        actor: null,
        tone: w.priority === "P1" ? "bad" : undefined,
      });
    for (const e of data.events) {
      if (e.action === "create") continue;
      const stage = (s: string | null) => (s ? (STAGE_LABEL[s as WoStage] ?? s) : "");
      const title =
        e.planId
          ? `${e.planId} · ${e.from ?? ""} → ${e.to ?? ""}`
          : e.action === "transition"
            ? `${e.workOrderId ? woRef(e.workOrderId) : ""} · ${stage(e.from)} → ${stage(e.to)}`
            : e.action === "denied"
              ? `${e.workOrderId ? woRef(e.workOrderId) : ""} · denied ${stage(e.to)}`
              : `${e.workOrderId ? woRef(e.workOrderId) : ""} · ${e.action === "readiness" ? "readiness" : e.action === "finding" ? "finding repeated" : "planning details"}`;
      out.push({
        key: `e${e.id}`,
        machineId: e.machineId,
        at: Date.parse(e.at),
        kind: e.planId ? "plan" : "wo",
        title,
        detail: e.reason,
        actor: e.actor,
        tone: e.action === "denied" ? "bad" : e.to === "closed" || e.to === "completed" ? "good" : undefined,
      });
    }
    return out.sort((a, b) => b.at - a.at);
  }, [data]);

  const shown = entries.filter((e) => filter === "all" || e.kind === filter);

  const kpis = useMemo(() => {
    const k = { timed: 0, current: 0, closed: 0, cycle: null as number | null, defects: 0, repeats: 0, repeatIds: [] as string[] };
    if (!data) return k;
    for (const p of data.plans) {
      if (!planGenerates(p) || planHours(p) === null) continue;
      const d = dues.get(p.id);
      if (!d) continue;
      k.timed += d.tasksDone + d.tasksDue;
      k.current += d.tasksDone;
    }
    const cycles: number[] = [];
    for (const w of data.workOrders) {
      if (w.stage !== "closed" && w.stage !== "completed") continue;
      k.closed += 1;
      const done = data.events.find((e) => e.workOrderId === w.id && (e.to === "completed" || e.to === "closed"));
      if (done) cycles.push(Date.parse(done.at) - Date.parse(w.createdAt));
    }
    if (cycles.length) {
      cycles.sort((a, b) => a - b);
      k.cycle = cycles[Math.floor(cycles.length / 2)];
    }
    for (const m of data.machineIds) for (const [, r] of latestByTask(data.records.filter((x) => x.machineId === m))) if (r.result === "Defect") k.defects += 1;
    const byRule = new Map<string, number>();
    for (const w of data.workOrders) if (w.ruleId) byRule.set(`${machineCode(w.machineId)} ${w.ruleId}`, (byRule.get(`${machineCode(w.machineId)} ${w.ruleId}`) ?? 0) + 1);
    k.repeatIds = [...byRule].filter(([, n]) => n > 1).map(([id]) => id);
    k.repeats = k.repeatIds.length;
    return k;
  }, [data, dues]);

  const hours = (ms: number) => (ms < 3_600_000 ? `${Math.max(1, Math.round(ms / 60_000))} min` : ms < 172_800_000 ? `${(ms / 3_600_000).toFixed(1)} h` : `${Math.round(ms / 86_400_000)} d`);

  return (
    <div className="ast-root pg-frame pm-page" style={{ "--pm-side": "360px" } as React.CSSProperties}>
      <div className="ast-toolbar pm-toolbar">
        <PillNav ariaLabel="Machine" items={[{ id: "all", label: "All machines" }, ...(line?.machineIds ?? []).map((id) => ({ id, label: machineCode(id) }))]} activeId={machine} onChange={setMachine} />
        {entries[0] && <span className="ast-caption">{entries.length} records · latest {when(entries[0].at)}</span>}
      </div>
      {!data ? (
        <Loading pms={pms} what="history" />
      ) : (
        <>
          <KpiStrip
            page
            label="Maintenance effectiveness"
            items={[
              {
                label: "PM compliance",
                value: kpis.timed ? `${Math.round((kpis.current / kpis.timed) * 100)}` : "—",
                unit: kpis.timed ? "%" : undefined,
                bar: kpis.timed ? (kpis.current / kpis.timed) * 100 : 0,
                foot: `${kpis.current} of ${kpis.timed} timed tasks within interval`,
              },
              { label: "Work completed", value: `${kpis.closed}`, foot: kpis.cycle !== null ? `median ${hours(kpis.cycle)} raise → verified` : "verified completions only" },
              { label: "Open defects", value: `${kpis.defects}`, tone: kpis.defects ? "bad" : undefined, foot: "latest checklist result is Defect" },
              { label: "Repeat findings", value: `${kpis.repeats}`, tone: kpis.repeats ? "warn" : undefined, foot: kpis.repeats ? kpis.repeatIds.slice(0, 3).join(", ") : "trend only · not a failure count" },
            ]}
          />
          <div className="pg-frame-body">
            <div className="pm-split">
              <Section
                id="pm-history"
                title="Asset history"
                right={<PillNav ariaLabel="Show" items={[{ id: "all", label: "All" }, { id: "wo", label: "Work orders" }, { id: "inspection", label: "Inspections" }, { id: "plan", label: "Plans" }]} activeId={filter} onChange={(id) => setFilter(id as Filter)} />}
              >
                {shown.length === 0 ? (
                  <Empty title="Nothing recorded yet." />
                ) : (
                  <>
                    <ol className="pm-timeline">
                      {shown.slice(0, limit).map((e) => (
                        <li key={e.key} data-tone={e.tone === "bad" || e.tone === "warn" ? e.tone : undefined} data-kind={e.kind}>
                          <span className="pm-tl-dot" aria-hidden="true" />
                          <span className="pm-tl-time">{when(e.at)}</span>
                          <span className="pm-tl-body">
                            <span className="pm-tl-title">
                              {machine === "all" && <span className="pm-muted">{machineCode(e.machineId)} · </span>}
                              {e.title}
                            </span>
                            {e.detail && <span className="ast-caption pm-tl-detail">{e.detail}</span>}
                          </span>
                          <span className="ast-caption pm-tl-actor">{e.actor ?? ""}</span>
                        </li>
                      ))}
                    </ol>
                    {shown.length > limit && (
                      <div className="pm-actions">
                        <PillButton variant="secondary" onClick={() => setLimit(limit + 60)}>
                          Show {Math.min(60, shown.length - limit)} more
                        </PillButton>
                      </div>
                    )}
                  </>
                )}
              </Section>
              <ConditionTrend machineId={machineId} pms={pms} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- condition around work */

function ConditionTrend({ machineId, pms }: { machineId: string; pms: PmsModel }) {
  // Work orders of this machine only: sim minutes are per machine engine.
  const sim = useKilnSimulationFor(machineId);
  const frame = sim?.frame ?? null;
  const times = frame?.times ?? [];
  const series = frame?.healthHistory.overall ?? [];
  const n = Math.min(times.length, series.length);
  // Drawn at the side column's size so 10 px labels stay 10 px.
  const W = 320;
  const H = 168;
  const pad = { l: 26, r: 8, t: 16, b: 20 };

  const model = useMemo(() => {
    if (n < 2) return null;
    const t0 = times[times.length - n];
    const t1 = times[times.length - 1];
    const vals = series.slice(series.length - n);
    const ts = times.slice(times.length - n);
    const x = (t: number) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
    const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
    const step = Math.max(1, Math.floor(n / 240));
    const pts: string[] = [];
    for (let i = 0; i < n; i += step) pts.push(`${x(ts[i]).toFixed(1)},${y(vals[i]).toFixed(1)}`);
    pts.push(`${x(ts[n - 1]).toFixed(1)},${y(vals[n - 1]).toFixed(1)}`);
    const markers = (pms.data?.workOrders ?? [])
      .filter((w) => w.machineId === machineId && w.simTime !== null && w.simTime >= t0 && w.simTime <= t1)
      .slice(0, 6)
      .map((w) => ({ id: w.id, x: x(w.simTime!) }));
    return { pts: pts.join(" "), markers, y, spanH: (t1 - t0) / 60, last: vals[n - 1] };
    // Re-derive once per simulated minute, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, times[times.length - 1], pms.data]);

  return (
    <Section id="pm-condition" title={`${machineCode(machineId)} · condition around work`} right={model ? <StateWord label={`${Math.round(model.last)}% now`} /> : undefined}>
      {!model ? (
        <Empty title="No live condition history for this machine." />
      ) : (
        <>
          <svg className="pm-trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Machine health with work orders marked">
            {[0, 50, 100].map((v) => (
              <g key={v}>
                <line x1={pad.l} x2={W - pad.r} y1={model.y(v)} y2={model.y(v)} className="pm-trend-grid" />
                <text x={pad.l - 6} y={model.y(v) + 3} className="pm-trend-axis" textAnchor="end">
                  {v}
                </text>
              </g>
            ))}
            {model.markers.map((m) => (
              <g key={m.id}>
                <line x1={m.x} x2={m.x} y1={pad.t} y2={H - pad.b} className="pm-trend-marker" />
                <text x={m.x + 3} y={pad.t + 8} className="pm-trend-label">
                  {woRef(m.id)}
                </text>
              </g>
            ))}
            <polyline points={model.pts} className="pm-trend-line" />
            <text x={pad.l} y={H - 6} className="pm-trend-axis">
              −{model.spanH.toFixed(0)} h
            </text>
            <text x={W - pad.r} y={H - 6} className="pm-trend-axis" textAnchor="end">
              now
            </text>
          </svg>
        </>
      )}
    </Section>
  );
}
