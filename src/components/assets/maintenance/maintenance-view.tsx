"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { AssetMachine } from "../assets-data";
import { Dialog, Field, FieldGrid, FormNote, PillButton, PillNav, Select, StatusTag, TextArea, TextInput, type Tone } from "@/components/ui";
import { invalidateApi, useApi } from "@/lib/api-cache";
import { formatLocalTime } from "@/lib/time";
import {
  ADDABLE_ROUTES,
  MODE,
  OWNER,
  ROUTES,
  ROUTE_ORDER,
  SCOPE,
  intervalLabel,
  latestByTask,
  primaryStep,
  routeOf,
  taskState,
  type LiveValidity,
  type RouteId,
  type TaskState,
  type TaskStateKey,
} from "@/lib/maintenance";
import { useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import type {
  ChecklistKind,
  ChecklistTask,
  ChecklistUnit,
  InspectionResult,
  MaintenanceChecklist,
  MaintenanceRecord,
  RemovedChecklistItem,
} from "@/types/maintenance";
import { Chevron, Empty, KpiStrip, PageHeader, Section, WhyDisclosure } from "../analysis/an-ui";
import { SearchPill } from "../assets-shell-ui";
import { SENSORS_FOCUS_KEY } from "../machine-sensor-mapping-view";
import "../assets-shell.css";
import "../analysis/analysis-page.css";
import "./maintenance-page.css";

/* ==========================================================================
   Machine › Maintenance: the inspection rounds for this machine, laid out the
   way operator-rounds / CMMS tools work them in the field:
     left   rounds (routes) with progress and what is due or overdue;
     right  the round sheet: checkpoints by assembly, one-tap Pass / NA,
            Hold / Defect with an as-found note (a defect opens a work order).
     Equipment    OSW-PE-MNT-PYR-01  (GEN hardware + the machine's units)
     Instruments  OSW-PE-SMT-PYR-01  (live checks run by ULTRON + planned tests)
   ========================================================================== */

interface Row {
  task: ChecklistTask;
  unit: ChecklistUnit;
  group: string;
  groupNum: string;
  route: RouteId;
  state: TaskState;
}

type RoundId = RouteId | "attention";

interface Round {
  id: RoundId;
  label: string;
  /** What drives the round: its interval, or the condition that triggers it. */
  basis: string;
  rows: Row[];
  done: number;
  status: { label: string; tone: Tone };
}

const STATE_TONE: Record<TaskStateKey, Tone> = {
  Pass: "idle",
  NA: "idle",
  Valid: "idle",
  "Not recorded": "idle",
  "No live feed": "idle",
  Overdue: "warn",
  Hold: "warn",
  Suspect: "warn",
  Defect: "bad",
  Invalid: "bad",
};

const ROUND_LABEL: Partial<Record<RouteId, string>> = {
  shift: "Shift round",
  daily: "Daily round",
  weekly: "Weekly round",
  monthly: "Monthly round",
  quarterly: "Quarterly round",
  annual: "Annual round",
  stop: "Planned stop",
  event: "After an event",
  live: "Live checks",
  oem: "Calibration and tests",
  site: "Site survey",
};

const ROUND_BASIS: Record<RouteId, string> = {
  shift: "Every 8 h",
  daily: "Every 24 h",
  weekly: "Every 7 days",
  monthly: "Every 30 days",
  quarterly: "Every 91 days",
  annual: "Every 12 months",
  stop: "At the next planned stop",
  event: "After a trip, overload or upset",
  live: "Run continuously by ULTRON",
  oem: "OEM / plant calibration interval",
  site: "After the site survey",
};

/** A result that is current or still open: shown as the pressed button on the row. */
const isDone = (s: TaskState) => s.current || s.key === "Pass" || s.key === "NA";
const needsAction = (r: Row) => r.state.open !== null || r.state.key === "Overdue" || ((r.state.key === "Suspect" || r.state.key === "Invalid") && r.route === "live");
const unitName = (u: ChecklistUnit) => (u.code === "GEN" ? "General" : u.code);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function roundStatus(id: RoundId, rows: Row[], done: number): { label: string; tone: Tone } {
  const defects = rows.filter((r) => r.state.open === "Defect").length;
  const holds = rows.filter((r) => r.state.open === "Hold").length;
  const overdue = rows.filter((r) => r.state.key === "Overdue").length;
  if (id === "attention") return rows.length ? { label: `${rows.length}`, tone: defects ? "bad" : "warn" } : { label: "None", tone: "idle" };
  if (defects) return { label: plural(defects, "defect"), tone: "bad" };
  if (id === "live") {
    const exceptions = rows.filter((r) => r.state.due).length;
    return exceptions ? { label: plural(exceptions, "exception"), tone: "warn" } : { label: `${done} valid`, tone: "idle" };
  }
  if (overdue) return { label: `${overdue} overdue`, tone: "warn" };
  if (holds) return { label: `${holds} on hold`, tone: "warn" };
  if (ROUTES[id].hours === null) return { label: done === rows.length ? "Recorded" : "Not timed", tone: "idle" };
  const due = rows.length - done;
  return due ? { label: `${due} due`, tone: "idle" } : { label: "Complete", tone: "good" };
}

/* ---------------------------------------------------------------- icons */

const svg = (d: React.ReactNode, size = 14) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
const ICON = {
  check: svg(<path d="M3.5 8.5 6.5 11.5 12.5 4.5" />),
  clock: svg(<><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.2l2 1.3" /></>),
  hold: svg(<path d="M6 4.5v7M10 4.5v7" />),
  defect: svg(<path d="M8 4.5v4.2M8 11.2v.3" />),
  na: svg(<path d="M4.5 8h7" />),
  plus: svg(<path d="M8 3.5v9M3.5 8h9" />),
  lock: svg(<><rect x="3.5" y="7" width="9" height="6" rx="1.5" /><path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" /></>, 12),
};

/** The status mark that leads a checkpoint: what the inspector would tick on paper. */
function StateMark({ state }: { state: TaskState }) {
  const k = state.key;
  const tone = STATE_TONE[k];
  const icon =
    k === "Pass" || k === "Valid" ? ICON.check
      : k === "NA" ? ICON.na
        : k === "Overdue" ? ICON.clock
          : k === "Hold" || k === "Suspect" ? ICON.hold
            : k === "Defect" || k === "Invalid" ? ICON.defect
              : null;
  return (
    <span className={`mt-mark ${icon ? "is-set" : ""} ${k === "No live feed" ? "is-dashed" : ""}`} data-tone={tone === "idle" ? undefined : tone} title={k}>
      {icon}
    </span>
  );
}

/* ---------------------------------------------------------------- view */

type Outcome = { tone: "good" | "bad"; text: string };

/** One maintenance API call; refreshes every cached API read on success. */
async function call<T = unknown>(url: string, method: "POST" | "DELETE", body: unknown, fallback: string): Promise<{ data: T } | { error: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as { data?: T; error?: { message: string } };
    if (!res.ok || json.data === undefined) throw new Error(json.error?.message ?? fallback);
    invalidateApi("/api/");
    return { data: json.data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : fallback };
  }
}

export function MaintenanceView({ machine, kind }: { machine: AssetMachine; kind: ChecklistKind }) {
  const url = `/api/maintenance?machineId=${encodeURIComponent(machine.id)}&kind=${kind}`;
  const api = useApi<MaintenanceChecklist>(url);
  const sim = useKilnSimulationFor(machine.id);
  const tz = useSiteTimeZone({ machineId: machine.id });
  const { setActiveSubPage } = useIndustrialData();

  const [roundId, setRoundId] = useState<RoundId | null>(null);
  const [unitCode, setUnitCode] = useState<string>("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showRemoved, setShowRemoved] = useState(false);
  const [notice, setNotice] = useState<Outcome | null>(null);

  useEffect(() => {
    setRoundId(null);
    setAdding(false);
    setShowRemoved(false);
    setNotice(null);
    setUnitCode("all");
    setOpenOnly(false);
    setQuery("");
    setExpandedId(null);
  }, [machine.id, kind]);

  const data = api.data;

  // Live checks read the tag's data validity. The frame ticks every second;
  // only a change of validity re-derives the rows.
  const liveTags = useMemo(() => {
    if (kind !== "sensor" || !data) return [] as string[];
    const out: string[] = [];
    for (const u of data.units) for (const g of u.groups) for (const t of g.tasks) if (t.tag && routeOf(t) === "live") out.push(t.tag);
    return out;
  }, [kind, data]);
  const signals = sim?.frame.signals;
  const liveKey = liveTags.map((t) => `${t}:${signals?.[t]?.quality ?? "-"}:${signals?.[t]?.qualityNote ?? ""}`).join("|");
  const live = useMemo(() => {
    const m = new Map<string, { quality: LiveValidity; note: string | null }>();
    for (const t of liveTags) {
      const s = signals?.[t];
      if (s) m.set(t, { quality: s.quality === "Good" ? "Valid" : s.quality, note: s.qualityNote });
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const latest = latestByTask(data.records);
    const out: Row[] = [];
    for (const unit of data.units)
      for (const g of unit.groups)
        for (const task of g.tasks)
          out.push({
            task,
            unit,
            group: g.title,
            groupNum: g.num,
            route: routeOf(task),
            state: taskState(task, latest.get(task.id) ?? null, now, task.tag ? live.get(task.tag) : null),
          });
    return out;
  }, [data, live, now]);

  const counts = useMemo(() => {
    const c = { total: rows.length, due: 0, overdue: 0, never: 0, calendar: 0, current: 0, defects: 0, holds: 0, liveChecks: 0, exceptions: 0, noLive: 0 };
    for (const r of rows) {
      if (r.state.due) c.due += 1;
      if (r.state.key === "Overdue") c.overdue += 1;
      if (ROUTES[r.route].hours !== null) {
        c.calendar += 1;
        if (r.state.key === "Not recorded") c.never += 1;
      }
      if (r.state.current) c.current += 1;
      if (r.state.open === "Defect") c.defects += 1;
      if (r.state.open === "Hold") c.holds += 1;
      if (r.route === "live") {
        c.liveChecks += 1;
        if (r.state.due) c.exceptions += 1;
        if (r.state.key === "No live feed") c.noLive += 1;
      }
    }
    return c;
  }, [rows]);

  const rounds = useMemo<Round[]>(() => {
    const inUnit = rows.filter((r) => unitCode === "all" || r.unit.code === unitCode);
    const make = (id: RoundId, list: Row[]): Round => {
      const done = list.filter((r) => isDone(r.state)).length;
      return {
        id,
        label: id === "attention" ? "Needs action" : (ROUND_LABEL[id] ?? ROUTES[id].label),
        basis: id === "attention" ? "Defects, holds, overdue tasks and live exceptions" : ROUND_BASIS[id],
        rows: list,
        done,
        status: roundStatus(id, list, done),
      };
    };
    const out = [make("attention", inUnit.filter(needsAction))];
    for (const id of ROUTE_ORDER[kind]) {
      const list = inUnit.filter((r) => r.route === id);
      if (list.length) out.push(make(id, list));
    }
    return out;
  }, [rows, kind, unitCode]);

  // Open on what needs action; otherwise the first round with work due.
  const activeRound =
    rounds.find((r) => r.id === roundId) ??
    (rounds[0].rows.length ? rounds[0] : rounds.find((r) => r.id !== "attention" && r.status.label.endsWith("due")) ?? rounds[1] ?? rounds[0]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeRound.rows.filter((r) => {
      if (openOnly && isDone(r.state)) return false;
      if (!q) return true;
      return [r.task.id, r.task.tag ?? "", r.task.component, r.group, r.unit.code, ...r.task.check.map((s) => s.text)].some((v) => v.toLowerCase().includes(q));
    });
  }, [activeRound, openOnly, query]);

  const groups = useMemo(() => {
    const out: { key: string; unit: ChecklistUnit; title: string; num: string; rows: Row[] }[] = [];
    const byKey = new Map<string, (typeof out)[number]>();
    for (const r of visible) {
      const key = `${r.unit.code}|${r.groupNum}`;
      let g = byKey.get(key);
      if (!g) {
        g = { key, unit: r.unit, title: r.group, num: r.groupNum, rows: [] };
        byKey.set(key, g);
        out.push(g);
      }
      g.rows.push(r);
    }
    return out;
  }, [visible]);

  const record = useCallback(
    async (task: ChecklistTask, result: InspectionResult, note: string): Promise<Outcome> => {
      const out = await call<MaintenanceRecord>("/api/maintenance", "POST", { machineId: machine.id, kind, taskId: task.id, result, note }, "Could not record the result");
      if ("error" in out) return { tone: "bad", text: out.error };
      const label = result === "NA" ? "Not applicable" : result === "Hold" ? "Follow-up" : result;
      return { tone: "good", text: out.data.workOrderId ? `Defect recorded · work order #${out.data.workOrderId} opened` : `${label} recorded` };
    },
    [machine.id, kind],
  );

  const undo = useCallback(async (rec: MaintenanceRecord): Promise<Outcome> => {
    const out = await call(`/api/maintenance?recordId=${rec.id}`, "DELETE", null, "Could not take the result back");
    return "error" in out ? { tone: "bad", text: out.error } : { tone: "good", text: "Result taken back" };
  }, []);

  const remove = useCallback(
    async (task: ChecklistTask): Promise<Outcome> => {
      const q = `machineId=${encodeURIComponent(machine.id)}&kind=${kind}&taskId=${encodeURIComponent(task.id)}`;
      const out = await call(`/api/maintenance/items?${q}`, "DELETE", null, "Could not remove the item");
      if ("error" in out) return { tone: "bad", text: out.error };
      setExpandedId(null);
      setNotice({ tone: "good", text: `${task.component} removed from the checklist` });
      return { tone: "good", text: "Removed" };
    },
    [machine.id, kind],
  );

  const restore = useCallback(
    async (item: RemovedChecklistItem) => {
      const out = await call("/api/maintenance/items/restore", "POST", { machineId: machine.id, kind, taskId: item.taskId }, "Could not restore the item");
      setNotice("error" in out ? { tone: "bad", text: out.error } : { tone: "good", text: `${item.component} is back on the checklist` });
    },
    [machine.id, kind],
  );

  const add = useCallback(
    async (input: { route: RouteId; unitCode: string; groupNum: string; component: string; check: string; pass: string }): Promise<Outcome> => {
      const out = await call<ChecklistTask>("/api/maintenance/items", "POST", { machineId: machine.id, kind, ...input }, "Could not add the item");
      if ("error" in out) return { tone: "bad", text: out.error };
      setRoundId(input.route);
      setQuery("");
      setOpenOnly(false);
      setExpandedId(null);
      setNotice({ tone: "good", text: `Added to the ${(ROUND_LABEL[input.route] ?? ROUTES[input.route].label).toLowerCase()}: ${out.data.component}` });
      return { tone: "good", text: "Added" };
    },
    [machine.id, kind],
  );

  const openSensor = useCallback(
    (tag: string) => {
      try {
        sessionStorage.setItem(SENSORS_FOCUS_KEY, tag);
      } catch {
        /* storage unavailable */
      }
      setActiveSubPage("sensors");
    },
    [setActiveSubPage],
  );

  const lastRecord = data?.records[0] ?? null;

  /* ---- header + KPIs ---- */
  const status: { label: string; tone: Tone } = counts.defects
    ? { label: plural(counts.defects, "open defect"), tone: "bad" }
    : counts.holds
      ? { label: `${counts.holds} on hold`, tone: "warn" }
      : counts.overdue || counts.exceptions
        ? { label: kind === "sensor" ? plural(counts.exceptions, "exception") : `${counts.overdue} overdue`, tone: "warn" }
        : counts.due
          ? { label: `${counts.due} due`, tone: "idle" }
          : { label: "Normal", tone: "good" };

  const kpis =
    kind === "sensor"
      ? [
          {
            label: "Live checks",
            value: `${counts.liveChecks - counts.exceptions - counts.noLive}`,
            unit: `/ ${counts.liveChecks}`,
            bar: counts.liveChecks ? ((counts.liveChecks - counts.exceptions - counts.noLive) / counts.liveChecks) * 100 : 0,
            foot: counts.noLive ? `valid now · ${counts.noLive} without live feed` : "valid now · run by ULTRON",
          },
          { label: "Exceptions", value: `${counts.exceptions}`, tone: counts.exceptions ? ("warn" as Tone) : undefined, foot: "for the shift to review" },
          { label: "Open defects", value: `${counts.defects}`, tone: counts.defects ? ("bad" as Tone) : undefined, foot: "work orders opened" },
          { label: "On hold", value: `${counts.holds}`, tone: counts.holds ? ("warn" as Tone) : undefined, foot: "awaiting follow-up" },
        ]
      : [
          {
            label: "Compliance",
            value: `${counts.calendar ? Math.round(((counts.calendar - counts.due) / counts.calendar) * 100) : 0}`,
            unit: "%",
            bar: counts.calendar ? ((counts.calendar - counts.due) / counts.calendar) * 100 : 0,
            foot: `${counts.calendar - counts.due} of ${counts.calendar} timed tasks within interval`,
          },
          {
            label: "Due",
            value: `${counts.due}`,
            tone: counts.overdue ? ("warn" as Tone) : undefined,
            foot: [counts.overdue && `${counts.overdue} overdue`, counts.never && `${counts.never} never recorded`].filter(Boolean).join(" · ") || "all rounds current",
          },
          { label: "Open defects", value: `${counts.defects}`, tone: counts.defects ? ("bad" as Tone) : undefined, foot: "work orders opened" },
          { label: "On hold", value: `${counts.holds}`, tone: counts.holds ? ("warn" as Tone) : undefined, foot: "awaiting follow-up" },
        ];

  const title = kind === "sensor" ? "Instrument maintenance" : "Equipment maintenance";
  const unitItems = data && data.units.length > 1 ? [{ id: "all", label: "All units" }, ...data.units.map((u) => ({ id: u.code, label: unitName(u) }))] : [];
  const pct = activeRound.rows.length ? (activeRound.done / activeRound.rows.length) * 100 : 0;

  return (
    <div className="ast-root pg-frame mt-page" aria-label={title}>
      <PageHeader
        title={title}
        status={data ? status : null}
        meta={[
          data && { label: "Checklist", value: `${data.document.number} ${data.document.revision}`, title: data.document.title },
          data && { label: "Issue", value: "Design review · not issued", title: data.document.status },
          data && {
            label: "Last result",
            value: lastRecord ? `${lastRecord.taskId} · ${formatLocalTime(lastRecord.recordedAt, { date: true, seconds: false, timeZone: tz.timeZone })}` : "none recorded",
          },
        ]}
      />

      {api.isLoading && !data ? (
        <section className="ast-card" role="status" aria-live="polite">
          <Empty title="Loading checklist…" />
        </section>
      ) : !data ? (
        <section className="ast-card">
          <Empty title="Checklist unavailable.">{api.error ?? "No maintenance checklist for this machine."}</Empty>
        </section>
      ) : (
        <>
          <KpiStrip page label={`${title} summary`} items={kpis} />
          <div className="pg-frame-body">
            <Section id="maintenance-rounds" title="Rounds">
              {unitItems.length > 0 && (
                <div className="ast-toolbar">
                  <PillNav ariaLabel="Unit" items={unitItems} activeId={unitCode} onChange={setUnitCode} />
                </div>
              )}

              <div className="mt-rounds">
                <nav className="ast-card mt-round-list" aria-label="Rounds">
                  <ul>
                    {rounds.map((rd) => {
                      const active = rd.id === activeRound.id;
                      const share = rd.rows.length ? (rd.done / rd.rows.length) * 100 : 0;
                      return (
                        <li key={rd.id}>
                          <button
                            type="button"
                            className={`mt-round ${active ? "active" : ""} ${rd.id === "attention" ? "is-attention" : ""}`}
                            aria-current={active ? "true" : undefined}
                            onClick={() => {
                              setRoundId(rd.id);
                              setExpandedId(null);
                            }}
                          >
                            <span className="mt-round-head">
                              <span className="mt-round-name">{rd.label}</span>
                              <span className="mt-round-status ast-num" data-tone={rd.status.tone === "idle" ? undefined : rd.status.tone}>
                                {rd.status.label}
                              </span>
                            </span>
                            <span className="mt-round-basis">{rd.basis}</span>
                            {rd.id !== "attention" && (
                              <span className="mt-round-progress">
                                <span className="mt-bar" aria-hidden="true">
                                  <span style={{ width: `${share}%` }} />
                                </span>
                                <span className="ast-num">
                                  {rd.done}/{rd.rows.length}
                                </span>
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                <section className="ast-card mt-sheet" aria-label={activeRound.label}>
                  <header className="mt-sheet-head">
                    <div className="mt-sheet-title">
                      <h3>{activeRound.label}</h3>
                      <span className="ast-caption">{activeRound.basis}</span>
                    </div>
                    {activeRound.id !== "attention" && (
                      <div className="mt-sheet-progress">
                        <span className="mt-sheet-count ast-num">
                          {activeRound.done}
                          <span> / {activeRound.rows.length} {activeRound.id === "live" ? "valid" : "done"}</span>
                        </span>
                        <span className="mt-bar is-wide" aria-hidden="true">
                          <span style={{ width: `${pct}%` }} />
                        </span>
                      </div>
                    )}
                  </header>

                  <div className="mt-sheet-tools">
                    {activeRound.id !== "attention" && (
                      <button type="button" className="ast-filter" aria-pressed={openOnly} onClick={() => setOpenOnly(!openOnly)}>
                        Hide done
                      </button>
                    )}
                    <SearchPill value={query} onChange={setQuery} placeholder={kind === "sensor" ? "Search item, tag, instrument" : "Search item, component"} label="Search round" />
                    <PillButton icon={ICON.plus} onClick={() => setAdding(true)}>
                      Add item
                    </PillButton>
                  </div>
                  {notice && (
                    <div className="mt-notice">
                      <FormNote tone={notice.tone}>{notice.text}</FormNote>
                    </div>
                  )}

                  {groups.length === 0 ? (
                    <div className="ast-empty">
                      {activeRound.id === "attention" && !query ? "Nothing needs action: no defects, holds, overdue tasks or live exceptions." : "No checkpoints match."}
                    </div>
                  ) : (
                    groups.map((g) => {
                      const gDone = g.rows.filter((r) => isDone(r.state)).length;
                      return (
                        <section key={g.key} className="mt-assembly" aria-label={g.title}>
                          <header className="mt-assembly-head">
                            <span className="mt-assembly-name">{g.title}</span>
                            <span className="ast-caption">
                              {unitName(g.unit)}
                              {g.unit.conditional ? " · conditional, not D5-approved" : ""}
                            </span>
                            <span className="mt-assembly-count ast-num">
                              {gDone}/{g.rows.length}
                            </span>
                          </header>
                          <ul className="mt-checkpoints">
                            {g.rows.map((r) => (
                              <Checkpoint
                                key={r.task.id}
                                r={r}
                                kind={kind}
                                machineCode={machine.id}
                                timeZone={tz.timeZone}
                                records={expandedId === r.task.id ? data.records.filter((x) => x.taskId === r.task.id) : null}
                                expanded={expandedId === r.task.id}
                                onToggle={() => setExpandedId(expandedId === r.task.id ? null : r.task.id)}
                                onRecord={record}
                                onUndo={undo}
                                onRemove={remove}
                                onOpenSensor={openSensor}
                              />
                            ))}
                          </ul>
                        </section>
                      );
                    })
                  )}

                  {data.removed.length > 0 && (
                    <div className="mt-removed">
                      <button type="button" className="mt-removed-toggle" aria-expanded={showRemoved} onClick={() => setShowRemoved(!showRemoved)}>
                        <Chevron className={`mt-cp-chevron ${showRemoved ? "is-open" : ""}`} />
                        {plural(data.removed.length, "removed item")}
                      </button>
                      {showRemoved && (
                        <ul>
                          {data.removed.map((it) => (
                            <li key={it.taskId}>
                              <span className="mt-removed-text">
                                <span className="mt-cp-title">{it.component}</span>
                                <span className="ast-caption">
                                  {it.where} · removed {formatLocalTime(it.removedAt, { date: true, seconds: false, timeZone: tz.timeZone })}
                                  {it.removedBy ? ` · ${it.removedBy}` : ""}
                                </span>
                              </span>
                              <PillButton variant="secondary" onClick={() => void restore(it)}>
                                Restore
                              </PillButton>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </section>
              </div>

              <AddItemDialog
                open={adding}
                onClose={() => setAdding(false)}
                kind={kind}
                units={data.units}
                defaultRoute={ADDABLE_ROUTES[kind].includes(activeRound.id as RouteId) ? (activeRound.id as RouteId) : ADDABLE_ROUTES[kind][0]}
                defaultSection={groups[0] ? groups[0].key : `${data.units[0]?.code}|${data.units[0]?.groups[0]?.num}`}
                onAdd={add}
              />

              <WhyDisclosure summary="Method">
                <p>
                  Tasks are verbatim from {data.document.number} {data.document.revision} ({data.document.status.toLowerCase()}). Rounds are the
                  document&apos;s starting inspection routes, not plant-approved intervals; a task is due when it has never been recorded or its last
                  result is older than its round. Planned-stop, event, OEM and site-survey tasks have no calendar due date.
                </p>
                {kind === "equipment" ? (
                  <p>
                    General hardware checks (GEN) apply to every machine and are recorded per machine. VERIFY tasks assume nothing: confirm the item on
                    the approved P&amp;ID, OEM BOM and field survey before using the task. Tasks marked with a lock are done only under verified isolation (LOTO).
                    {data.units.some((u) => u.code === "EXH-IF") && " The main exhaust gas treatment (EXH-IF) is listed with the preheater ID fan it serves; its arrangement is subject to P&ID verification."}
                  </p>
                ) : (
                  <p>
                    Live checks (AUTO) run continuously as ULTRON data-quality and sensor-validation checks; the row shows the tag&apos;s validity now and
                    the shift reviews exceptions only. Planned tests follow the OEM / plant calibration interval.
                    {data.units.some((u) => u.conditional) && " EXH-IF entries are site-survey candidates, not part of the 161 approved D5 signals."}
                  </p>
                )}
                <p>
                  Tick an item when it meets its pass condition; untick to take the result back. Problems are reported from the item&apos;s details:
                  a follow-up (hold) and a defect need the as-found observation, and a defect opens a repair work order. Not applicable needs
                  documented proof of absence. Items added on site belong to this machine only; removed items keep their results and can be restored.
                </p>
              </WhyDisclosure>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- checkpoint */

const PROBLEMS: { result: InspectionResult; label: string; title: string }[] = [
  { result: "Hold", label: "Needs follow-up", title: "Hold: an as-found observation to follow up" },
  { result: "Defect", label: "Defect", title: "Records the defect and opens a repair work order" },
  { result: "NA", label: "Not applicable", title: "Only with documented proof of absence" },
];

/** The one plain-words line under a checkpoint: when it was last done, or what is wrong. */
function statusLine(r: Row, when: string | null): string | null {
  const { state } = r;
  if (r.route === "live") return state.liveNote ?? (state.key === "Valid" ? "Checked live by ULTRON" : null);
  if (state.open && state.last) return `${state.open === "Hold" ? "Needs follow-up" : "Defect"} · ${when}${state.last.inspector ? ` · ${state.last.inspector}` : ""}`;
  if (state.key === "Overdue" && state.last) return `Overdue · last done ${when}`;
  if (state.last) return `${state.last.result === "NA" ? "Not applicable" : "Done"} ${when}${state.last.inspector ? ` · ${state.last.inspector}` : ""}`;
  return ROUTES[r.route].hours === null ? "Not recorded" : "Not done yet";
}

const Checkpoint = React.memo(function Checkpoint({
  r,
  kind,
  machineCode,
  timeZone,
  records,
  expanded,
  onToggle,
  onRecord,
  onUndo,
  onRemove,
  onOpenSensor,
}: {
  r: Row;
  kind: ChecklistKind;
  machineCode: string;
  timeZone?: string;
  records: MaintenanceRecord[] | null;
  expanded: boolean;
  onToggle: () => void;
  onRecord: (task: ChecklistTask, result: InspectionResult, note: string) => Promise<Outcome>;
  onUndo: (record: MaintenanceRecord) => Promise<Outcome>;
  onRemove: (task: ChecklistTask) => Promise<Outcome>;
  onOpenSensor: (tag: string) => void;
}) {
  const { task, state } = r;
  const step = primaryStep(task);
  const isLive = r.route === "live";
  const [pending, setPending] = useState<"Defect" | "Hold" | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad" | "warn"; text: string } | null>(null);

  // Ticked: a Pass / NA that still counts. Shown at once while the save is in flight.
  const ticked = state.current && !isLive && (state.last?.result === "Pass" || state.last?.result === "NA");
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  useEffect(() => setOptimistic(null), [state.last?.id, state.key]);
  const checked = optimistic ?? ticked;

  const run = async (work: () => Promise<Outcome>, quietOnSuccess = false) => {
    setBusy(true);
    setMessage(null);
    const out = await work();
    setBusy(false);
    if (out.tone === "bad") setOptimistic(null);
    if (out.tone === "bad" || !quietOnSuccess) setMessage(out);
    return out;
  };

  const toggleDone = (next: boolean) => {
    setOptimistic(next);
    if (next) void run(() => onRecord(task, "Pass", ""), true);
    else if (state.last && (state.last.result === "Pass" || state.last.result === "NA")) void run(() => onUndo(state.last!), true);
  };

  const submit = async (result: InspectionResult) => {
    if ((result === "Defect" || result === "Hold") && !note.trim()) {
      setMessage({ tone: "warn", text: "Describe what you found first." });
      return;
    }
    const out = await run(() => onRecord(task, result, note));
    if (out.tone === "good") {
      setNote("");
      setPending(null);
    }
  };

  const choose = (result: InspectionResult) => {
    if (result === "Defect" || result === "Hold") {
      setPending(pending === result ? null : result);
      setMessage(null);
      return;
    }
    void submit(result);
  };

  const when = state.last ? formatLocalTime(state.last.recordedAt, { date: true, seconds: false, timeZone }) : null;
  const line = statusLine(r, when);
  const tone = STATE_TONE[state.key];
  const flag = isLive ? (tone === "idle" ? null : state.key) : state.open === "Hold" ? "Follow-up" : state.open ?? (state.key === "Overdue" ? "Overdue" : null);
  const isolate = task.mode.startsWith("OFF");

  return (
    <li className={`mt-cp ${expanded ? "is-expanded" : ""} ${checked ? "is-done" : ""}`} data-tone={tone === "idle" ? undefined : tone}>
      <div className="mt-cp-row">
        {isLive ? (
          <StateMark state={state} />
        ) : (
          <label className="mt-check" title={checked ? "Done: untick to take it back" : "Tick when it meets the pass condition"}>
            <input
              type="checkbox"
              checked={checked}
              disabled={busy || state.open !== null}
              aria-label={`${task.component}: done`}
              onChange={(e) => toggleDone(e.target.checked)}
            />
            <span aria-hidden="true">{ICON.check}</span>
          </label>
        )}
        <button type="button" className="mt-cp-main" aria-expanded={expanded} onClick={onToggle}>
          <span className="mt-cp-title">
            {kind === "sensor" && task.tag && <span className="mt-cp-tag ast-num">{task.tag}</span>}
            {task.component}
          </span>
          <span className="mt-cp-check">{step.text}</span>
          <span className="mt-cp-meta">
            {line && (
              <span className="mt-cp-last" data-tone={tone === "idle" ? undefined : tone}>
                {line}
              </span>
            )}
            {isolate && (
              <span className="mt-cp-mode" title={MODE[task.mode]}>
                {ICON.lock}
                Isolate first
              </span>
            )}
            {task.added && <span>Added on site</span>}
          </span>
        </button>
        <div className="mt-cp-side">
          {flag && <StatusTag tone={tone === "idle" ? "warn" : tone} label={flag} title={state.liveNote ?? undefined} />}
          <button type="button" className="mt-cp-more" aria-label={expanded ? "Hide details" : "Details"} aria-expanded={expanded} onClick={onToggle}>
            <Chevron className={`mt-cp-chevron ${expanded ? "is-open" : ""}`} />
          </button>
        </div>
      </div>

      {message && !expanded && (
        <div className="mt-cp-form">
          <FormNote tone={message.tone}>{message.text}</FormNote>
        </div>
      )}

      {expanded && (
        <div className="mt-cp-detail">
          <div className="mt-steps">
            {/* The row already shows the primary step; the detail adds the rest (location, planned test). */}
            {task.check.filter((st) => st !== step).map((st, i) => (
              <div key={i} className="mt-step">
                <span className="mt-step-label">{st.label ?? "Check"}</span>
                <p>{st.text}</p>
              </div>
            ))}
            {task.pass && (
              <div className="mt-step">
                <span className="mt-step-label">Good looks like</span>
                <p>{task.pass}</p>
              </div>
            )}
          </div>

          <div className="mt-report">
            <span className="mt-step-label">{isLive ? "Shift review" : "Something wrong?"}</span>
            <div className="mt-report-actions">
              {isLive && (
                <PillButton variant="secondary" disabled={busy} onClick={() => void submit("Pass")}>
                  Reviewed, OK
                </PillButton>
              )}
              {PROBLEMS.map((o) => (
                <PillButton
                  key={o.result}
                  variant="secondary"
                  className="mt-report-btn"
                  data-result={o.result}
                  pressed={pending === o.result || state.open === o.result}
                  disabled={busy}
                  title={o.title}
                  onClick={() => choose(o.result)}
                >
                  {o.label}
                </PillButton>
              ))}
            </div>
            {pending && <NoteForm result={pending} note={note} setNote={setNote} busy={busy} taskId={task.id} onSubmit={() => void submit(pending)} onCancel={() => setPending(null)} />}
            {state.open && !pending && (
              <div>
                <PillButton variant="secondary" disabled={busy} onClick={() => void submit("Pass")}>
                  Fixed, passes now
                </PillButton>
              </div>
            )}
          </div>
          {message && <FormNote tone={message.tone}>{message.text}</FormNote>}

          {records && records.length > 0 && (
            <div className="mt-history">
              <span className="mt-step-label">History</span>
              <ul>
                {records.slice(0, 6).map((h) => (
                  <li key={h.id}>
                    <StatusTag tone={STATE_TONE[h.result]} label={h.result === "NA" ? "Not applicable" : h.result === "Hold" ? "Follow-up" : h.result} />
                    <span className="ast-caption ast-num">
                      {formatLocalTime(h.recordedAt, { date: true, seconds: false, timeZone })}
                      {h.inspector ? ` · ${h.inspector}` : ""}
                      {h.workOrderId ? ` · WO #${h.workOrderId}` : ""}
                    </span>
                    {h.note && <p>{h.note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <dl className="mt-facts">
            <dt>Item</dt>
            <dd className="ast-num">{task.id}</dd>
            <dt>Interval</dt>
            <dd>{intervalLabel(task)}</dd>
            {task.owner && (
              <>
                <dt>Owner</dt>
                <dd>{OWNER[task.owner] ?? task.owner}</dd>
              </>
            )}
            {task.mode && (
              <>
                <dt>Mode</dt>
                <dd>{MODE[task.mode] ?? task.mode}</dd>
              </>
            )}
            {task.scope && (
              <>
                <dt>Scope</dt>
                <dd>{SCOPE[task.scope] ?? task.scope}</dd>
              </>
            )}
            {task.priority && (
              <>
                <dt>D5 priority</dt>
                <dd>{task.priority}</dd>
              </>
            )}
            {task.added && (
              <>
                <dt>Added</dt>
                <dd>
                  {formatLocalTime(task.added.at, { date: true, seconds: false, timeZone })}
                  {task.added.by ? ` · ${task.added.by}` : ""}
                </dd>
              </>
            )}
          </dl>

          <div className="mt-detail-foot">
            {kind === "sensor" && task.tag && (
              <PillButton variant="secondary" onClick={() => onOpenSensor(task.tag!)}>
                Open sensor
              </PillButton>
            )}
            {confirmRemove ? (
              <div className="mt-confirm" role="group" aria-label="Confirm removal">
                <span>Remove from the {machineCode} checklist? Its results stay on record and you can restore it.</span>
                <PillButton variant="danger" disabled={busy} onClick={() => void run(() => onRemove(task), true)}>
                  Remove item
                </PillButton>
                <PillButton variant="secondary" disabled={busy} onClick={() => setConfirmRemove(false)}>
                  Cancel
                </PillButton>
              </div>
            ) : (
              <button type="button" className="mt-remove" onClick={() => setConfirmRemove(true)}>
                Remove from checklist
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
});

function NoteForm({
  result,
  note,
  setNote,
  busy,
  taskId,
  onSubmit,
  onCancel,
}: {
  result: "Defect" | "Hold";
  note: string;
  setNote: (v: string) => void;
  busy: boolean;
  taskId: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-note">
      <TextArea id={`mt-note-${taskId}`} value={note} onChange={setNote} rows={2} placeholder="What did you find? Where, and how much." />
      <div className="mt-note-actions">
        <PillButton variant={result === "Defect" ? "danger" : "primary"} disabled={busy} onClick={onSubmit}>
          {result === "Defect" ? "Record defect · open work order" : "Record follow-up"}
        </PillButton>
        <PillButton variant="secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </PillButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- add item */

function AddItemDialog({
  open,
  onClose,
  kind,
  units,
  defaultRoute,
  defaultSection,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  kind: ChecklistKind;
  units: ChecklistUnit[];
  defaultRoute: RouteId;
  defaultSection: string;
  onAdd: (input: { route: RouteId; unitCode: string; groupNum: string; component: string; check: string; pass: string }) => Promise<Outcome>;
}) {
  const [check, setCheck] = useState("");
  const [component, setComponent] = useState("");
  const [route, setRoute] = useState<RouteId>(defaultRoute);
  const [section, setSection] = useState(defaultSection);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCheck("");
    setComponent("");
    setPass("");
    setError(null);
    setRoute(defaultRoute);
    setSection(defaultSection);
  }, [open, defaultRoute, defaultSection]);

  const sections = units.flatMap((u) => u.groups.map((g) => ({ value: `${u.code}|${g.num}`, label: `${unitName(u)} · ${g.title}` })));
  const save = async () => {
    if (!check.trim() || !component.trim()) {
      setError(!check.trim() ? "Describe what to check." : "Name the equipment or component.");
      return;
    }
    const [unitCode, groupNum] = section.split("|");
    setBusy(true);
    setError(null);
    const out = await onAdd({ route, unitCode, groupNum, component, check, pass });
    setBusy(false);
    if (out.tone === "bad") setError(out.text);
    else onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      title="Add checklist item"
      subtitle="Added to this machine only, in the round and section you pick."
      onSubmit={() => void save()}
      footer={
        <>
          <PillButton variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton type="submit" disabled={busy}>
            Add item
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="What to check" required wide>
          {(id, d) => <TextArea id={id} describedBy={d} value={check} onChange={setCheck} rows={2} placeholder="e.g. Inspect the rotary valve seals for leaks" />}
        </Field>
        <Field label="Equipment or component" required wide>
          {(id, d) => <TextInput id={id} describedBy={d} value={component} onChange={setComponent} placeholder="e.g. Rotary valve RV-02" />}
        </Field>
        <Field label="Round">
          {(id, d) => (
            <Select id={id} describedBy={d} value={route} onChange={(v) => setRoute(v as RouteId)} options={ADDABLE_ROUTES[kind].map((rt) => ({ value: rt, label: ROUND_LABEL[rt] ?? ROUTES[rt].label }))} />
          )}
        </Field>
        <Field label="Section">
          {(id, d) => <Select id={id} describedBy={d} value={section} onChange={setSection} options={sections} />}
        </Field>
        <Field label="Good looks like" hint="Optional. The condition that counts as done." wide>
          {(id, d) => <TextInput id={id} describedBy={d} value={pass} onChange={setPass} placeholder="e.g. No dust escape, seals intact" />}
        </Field>
      </FieldGrid>
      {error && <FormNote tone="bad">{error}</FormNote>}
    </Dialog>
  );
}
