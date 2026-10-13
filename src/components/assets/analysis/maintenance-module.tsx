"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import { TickMeter } from "../insights-ui";
import type {
  DegradationItem,
  FeatureWeight,
  InsightsResponse,
  IssueSource,
  MaintenanceAction,
} from "@/server/services/insights-service";
import "./maintenance.css";

export interface MaintenanceModuleProps {
  data?: InsightsResponse["analysis"] | null;
  onBack?: () => void;
}

/* ------------------------------------------------------------------ */
/* Model                                                              */
/* ------------------------------------------------------------------ */

type Tier = "Critical" | "High" | "Routine";
type Status = "Open" | "Scheduled" | "Deferred";
type Filter = "all" | Tier;

const TIERS: Tier[] = ["Critical", "High", "Routine"];

const TIER_COLOR: Record<Tier, string> = {
  Critical: "var(--status-danger)",
  High: "var(--status-warning)",
  Routine: "var(--signal-blue)",
};

const STATUS_COLOR: Record<Status, string> = {
  Open: "var(--text-muted)",
  Scheduled: "var(--status-success)",
  Deferred: "var(--status-warning)",
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "Critical", label: "Critical" },
  { id: "High", label: "High" },
  { id: "Routine", label: "Routine" },
];

/** Next planned production outage (Cell B changeover), days from now. */
const NEXT_OUTAGE_D = 0.75;
/** Schedule horizon shown on the timeline, days. */
const AXIS_MIN_D = -1;
const AXIS_MAX_D = 28;
const AXIS_TICKS = [0, 7, 14, 21, 28];

interface Row {
  action: MaintenanceAction;
  tier: Tier;
  /** Recommended window, days from now. */
  start: number;
  end: number;
  /** Deadline, days from now. */
  dueIn: number;
  /** Planned intervention downtime, hours (null when not estimated). */
  downtime: number | null;
}

function tierOf(priority: MaintenanceAction["priority"]): Tier {
  if (priority === "Immediate") return "Critical";
  if (priority === "High") return "High";
  return "Routine";
}

function parseWindow(raw: string): [number, number] {
  const s = raw.toLowerCase();
  const n = Number((s.match(/(\d+(?:\.\d+)?)/) || [])[1]);
  if (s.includes("immediate")) return [0, 1];
  if (s.includes("planned stop") || s.includes("outage")) return [NEXT_OUTAGE_D, NEXT_OUTAGE_D + 0.5];
  if (s.includes("annual")) return [21, 365];
  if (s.includes("routine")) return [14, 90];
  if (Number.isFinite(n)) {
    if (/\d\s*h\b|hour/.test(s)) return [0, n / 24];
    if (s.includes("week")) return [0, n * 7];
    if (/month|\d\s*mo\b/.test(s)) return [0, n * 30];
    if (/\d\s*d\b|day/.test(s)) return [0, n];
  }
  return [0, 7];
}

function parseDowntime(eta: string): number | null {
  const m = eta.match(/^\s*(\d+(?:\.\d+)?)\s*h/);
  return m ? Number(m[1]) : null;
}

function toRow(action: MaintenanceAction): Row {
  const [start, end] = parseWindow(action.window);
  return { action, tier: tierOf(action.priority), start, end, dueIn: end, downtime: parseDowntime(action.eta) };
}

const fmtNum = (v: number) => (v < 10 && !Number.isInteger(v) ? v.toFixed(1) : String(Math.round(v)));
const fmtD = (v: number) => `${fmtNum(v)} d`;
const fmtH = (v: number | null) => (v === null ? "—" : `${fmtNum(v)} h`);
const fmtWindow = (r: Row) => (r.start === 0 ? `0–${fmtD(r.end)}` : `${fmtNum(r.start)}–${fmtD(r.end)}`);

const norm = (s: string) => s.toLowerCase().trim();
const related = (a: string, b: string) => {
  const x = norm(a);
  const y = norm(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
};

interface Evidence {
  features: FeatureWeight[];
  degradation?: DegradationItem;
  source?: IssueSource;
}

function evidenceFor(action: MaintenanceAction, data: MaintenanceModuleProps["data"]): Evidence {
  const features = [...(data?.features ?? [])].sort((a, b) => {
    const am = a.tag === action.id || related(a.label, action.component) ? 1 : 0;
    const bm = b.tag === action.id || related(b.label, action.component) ? 1 : 0;
    return bm - am || b.weight - a.weight;
  });
  return {
    features: features.slice(0, 3),
    degradation: data?.degradation?.items.find((d) => related(d.name, action.component)),
    source: data?.sources?.find((s) => related(s.subsystem, action.component)),
  };
}

function healthColor(h: number) {
  return h < 50 ? "var(--status-danger)" : h < 75 ? "var(--status-warning)" : "var(--status-success)";
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                        */
/* ------------------------------------------------------------------ */

function Chip({ color, children, title }: { color: string; children: React.ReactNode; title?: string }) {
  return (
    <span className="mnt-chip" title={title}>
      <i style={{ background: color }} aria-hidden="true" />
      {children}
    </span>
  );
}

function TierIcon({ tier }: { tier: Tier }) {
  return (
    <span className="mnt-badge" style={{ color: TIER_COLOR[tier] }} aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {tier === "Critical" && (
          <>
            <path d="M12 3 2.5 20h19L12 3Z" />
            <path d="M12 10v4.5M12 17.2v.3" />
          </>
        )}
        {tier === "High" && <path d="M12 19V5M6 11l6-6 6 6" />}
        {tier === "Routine" && (
          <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </>
        )}
      </svg>
    </span>
  );
}

const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </svg>
);

const IconDefer = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Schedule timeline (Gantt)                                          */
/* ------------------------------------------------------------------ */

const ROW_H = 44;
const BAR_H = 14;
const TOP = 26;
const AXIS_H = 26;
const PAD_R = 18;

function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? fallback);
      if (w > 0) setWidth(Math.max(360, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}

function ScheduleTimeline({
  rows,
  statuses,
  selectedId,
  onSelect,
}: {
  rows: Row[];
  statuses: Record<string, Status>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [wrapRef, width] = useWidth<HTMLDivElement>(640);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const geo = useMemo(() => {
    const labelW = Math.round(Math.min(210, Math.max(140, width * 0.3)));
    const plotW = width - labelW - PAD_R;
    const x = (d: number) =>
      labelW + ((Math.max(AXIS_MIN_D, Math.min(AXIS_MAX_D, d)) - AXIS_MIN_D) / (AXIS_MAX_D - AXIS_MIN_D)) * plotW;
    const height = TOP + Math.max(rows.length, 1) * ROW_H + AXIS_H;
    const plotBottom = TOP + Math.max(rows.length, 1) * ROW_H;
    const maxChars = Math.max(10, Math.floor((labelW - 18) / 6.6));
    const bars = rows.map((r, i) => {
      const x0 = x(r.start);
      const x1 = Math.max(x0 + 6, x(r.end));
      const cy = TOP + i * ROW_H + ROW_H / 2;
      const status = statuses[r.action.id] ?? "Open";
      const inWindow = NEXT_OUTAGE_D >= r.start && NEXT_OUTAGE_D <= r.end;
      return {
        row: r,
        i,
        x0,
        x1,
        cy,
        clipped: r.end > AXIS_MAX_D,
        status,
        markX: status === "Scheduled" ? x(inWindow ? NEXT_OUTAGE_D : r.start) : null,
        title: r.action.title.length > maxChars ? `${r.action.title.slice(0, maxChars - 1)}…` : r.action.title,
        comp: r.action.component.length > maxChars + 4 ? `${r.action.component.slice(0, maxChars + 3)}…` : r.action.component,
      };
    });
    return { labelW, x, height, plotBottom, bars };
  }, [rows, statuses, width]);

  const hovered = geo.bars.find((b) => b.row.action.id === hoverId);
  const nowX = geo.x(0);
  const outX = geo.x(NEXT_OUTAGE_D);

  return (
    <div className="mnt-gantt" ref={wrapRef}>
      <svg
        className="mnt-gantt-svg"
        width="100%"
        height={geo.height}
        viewBox={`0 0 ${width} ${geo.height}`}
        role="group"
        aria-roledescription="schedule chart"
        aria-label={`Maintenance schedule, ${rows.length} actions over ${AXIS_MAX_D} days. Next planned outage in ${fmtD(NEXT_OUTAGE_D)}.`}
      >
        {/* Gridlines + axis */}
        {AXIS_TICKS.map((t) => (
          <g key={t}>
            <line x1={geo.x(t)} x2={geo.x(t)} y1={TOP} y2={geo.plotBottom} className="mnt-grid" />
            <text x={geo.x(t)} y={geo.plotBottom + 17} className="mnt-axis" textAnchor="middle">
              {t} d
            </text>
          </g>
        ))}
        <line x1={geo.labelW} x2={width - PAD_R} y1={geo.plotBottom} y2={geo.plotBottom} className="mnt-axis-line" />

        {/* Rows */}
        {geo.bars.map((b) => {
          const id = b.row.action.id;
          const selected = id === selectedId;
          const color = TIER_COLOR[b.row.tier];
          return (
            <g
              key={id}
              className={`mnt-gantt-row${selected ? " is-selected" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`${b.row.tier}: ${b.row.action.title}, ${b.row.action.component}, window ${fmtWindow(b.row)}, ${b.status}`}
              onClick={() => onSelect(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(id);
                }
              }}
              onMouseEnter={() => setHoverId(id)}
              onMouseLeave={() => setHoverId(null)}
              onFocus={() => setHoverId(id)}
              onBlur={() => setHoverId(null)}
            >
              <rect className="mnt-row-bg" x={2} y={b.cy - ROW_H / 2 + 3} width={width - 4} height={ROW_H - 6} rx={10} />
              <text x={12} y={b.cy - 3} className="mnt-row-title">
                {b.title}
              </text>
              <text x={12} y={b.cy + 12} className="mnt-row-sub">
                {b.comp}
              </text>
              <rect
                x={b.x0}
                y={b.cy - BAR_H / 2}
                width={b.x1 - b.x0}
                height={BAR_H}
                rx={4}
                fill={color}
                opacity={b.status === "Deferred" ? 0.35 : b.status === "Scheduled" ? 0.55 : 0.9}
              />
              {b.clipped && (
                <path
                  d={`M ${b.x1 + 5} ${b.cy - 5} l 5 5 l -5 5`}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {b.markX !== null && <circle cx={b.markX} cy={b.cy} r={5} className="mnt-mark" />}
            </g>
          );
        })}

        {/* Now + next planned outage markers */}
        <line x1={nowX} x2={nowX} y1={TOP - 6} y2={geo.plotBottom} className="mnt-now" />
        <text x={nowX - 5} y={TOP - 10} className="mnt-marker-label" textAnchor="end">
          Now
        </text>
        <line x1={outX} x2={outX} y1={TOP - 6} y2={geo.plotBottom} className="mnt-outage" />
        <text x={outX + 5} y={TOP - 10} className="mnt-marker-label">
          Planned outage · {fmtD(NEXT_OUTAGE_D)}
        </text>
      </svg>

      {hovered && (
        <div
          className="mnt-tip"
          role="presentation"
          style={{
            left: Math.min(hovered.x1 + 12, width - 200),
            top: hovered.cy - ROW_H / 2 - 4,
          }}
        >
          <span className="mnt-tip-title">{hovered.row.action.title}</span>
          <span className="mnt-tip-grid">
            <span>Window</span>
            <b>{fmtWindow(hovered.row)}</b>
            <span>Downtime</span>
            <b>{fmtH(hovered.row.downtime)}</b>
            <span>Confidence</span>
            <b>{hovered.row.action.confidence} %</b>
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Module                                                             */
/* ------------------------------------------------------------------ */

export function MaintenanceModule({ data, onBack }: MaintenanceModuleProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allRows = useMemo(() => {
    const order = (t: Tier) => TIERS.indexOf(t);
    return (data?.actions ?? []).map(toRow).sort((a, b) => order(a.tier) - order(b.tier) || a.dueIn - b.dueIn);
  }, [data?.actions]);

  const rows = useMemo(() => (filter === "all" ? allRows : allRows.filter((r) => r.tier === filter)), [allRows, filter]);

  const selected = rows.find((r) => r.action.id === selectedId) ?? rows[0] ?? null;
  const statusOf = (id: string): Status => statuses[id] ?? "Open";
  const setStatus = (id: string, s: Status) => setStatuses((prev) => ({ ...prev, [id]: s }));

  const header = useMemo(() => {
    const open = allRows.filter((r) => (statuses[r.action.id] ?? "Open") !== "Scheduled");
    return { open: open.length, top: open[0]?.tier ?? null };
  }, [allRows, statuses]);

  const kpi = useMemo(() => {
    const open = rows.filter((r) => (statuses[r.action.id] ?? "Open") !== "Scheduled");
    const due7 = open.filter((r) => r.dueIn <= 7).length;
    const downtime = rows.reduce((s, r) => s + (r.downtime ?? 0), 0);
    const downByTier = TIERS.map((t) => ({
      tier: t,
      h: rows.filter((r) => r.tier === t).reduce((s, r) => s + (r.downtime ?? 0), 0),
    }));
    return { open: open.length, due7, downtime, downByTier };
  }, [rows, statuses]);

  const evidence = useMemo(() => (selected ? evidenceFor(selected.action, data) : null), [selected, data]);

  return (
    <div className="mnt-root">
      {/* Tier 1 · Header */}
      <header className="mnt-head">
        <div className="mnt-head-left">
          {onBack && (
            <button type="button" className="mnt-back" onClick={onBack} aria-label="Back to assets">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <h2 className="mnt-title">Maintenance</h2>
          {header.top ? (
            <Chip color={TIER_COLOR[header.top]}>
              {header.open} open · {header.top}
            </Chip>
          ) : (
            <Chip color="var(--status-success)">0 open</Chip>
          )}
        </div>
        <PillNav items={FILTERS} activeId={filter} onChange={(id) => setFilter(id as Filter)} className="mnt-filter" />
      </header>

      {/* Tier 1 · KPI strip */}
      <section className="mnt-kpis" aria-label="Maintenance summary">
        <div className="mnt-kpi">
          <span className="mnt-kpi-label">Due within 7 d</span>
          <span className="mnt-kpi-value">
            {kpi.due7}
            <small> / {kpi.open}</small>
          </span>
          <TickMeter value={kpi.due7} max={kpi.open || 1} ticks={kpi.open || 1} color="var(--status-warning)" className="mnt-kpi-meter" />
        </div>
        <div className="mnt-kpi">
          <span className="mnt-kpi-label">Estimated downtime</span>
          <span className="mnt-kpi-value">
            {fmtNum(kpi.downtime)}
            <small> h</small>
          </span>
          <span
            className="mnt-stack"
            role="img"
            aria-label={kpi.downByTier.map((b) => `${b.tier} ${fmtNum(b.h)} h`).join(", ")}
          >
            {kpi.downByTier
              .filter((b) => b.h > 0)
              .map((b) => (
                <i key={b.tier} style={{ flexGrow: b.h, background: TIER_COLOR[b.tier] }} title={`${b.tier} ${fmtNum(b.h)} h`} />
              ))}
            {kpi.downtime === 0 && <i style={{ flexGrow: 1 }} />}
          </span>
        </div>
      </section>

      {/* Tier 2 · Timeline + detail */}
      <div className="mnt-main">
        <section className="mnt-card mnt-card--timeline" aria-labelledby="mnt-tl-title">
          <header className="mnt-card-head">
            <h3 id="mnt-tl-title" className="mnt-card-title">Schedule</h3>
            <ul className="mnt-legend" aria-label="Legend">
              {TIERS.map((t) => (
                <li key={t}>
                  <i className="mnt-key-bar" style={{ background: TIER_COLOR[t] }} />
                  {t}
                </li>
              ))}
              <li>
                <i className="mnt-key-line" />
                Now
              </li>
              <li>
                <i className="mnt-key-line mnt-key-line--dash" />
                Outage
              </li>
            </ul>
          </header>
          {rows.length ? (
            <ScheduleTimeline rows={rows} statuses={statuses} selectedId={selected?.action.id ?? null} onSelect={setSelectedId} />
          ) : (
            <p className="mnt-empty">No actions at this priority.</p>
          )}
        </section>

        <aside className="mnt-card mnt-detail" aria-label="Selected action">
          {selected && evidence ? (
            <>
              <div className="mnt-detail-chips">
                <Chip color={TIER_COLOR[selected.tier]}>{selected.tier}</Chip>
                <Chip color={STATUS_COLOR[statusOf(selected.action.id)]}>{statusOf(selected.action.id)}</Chip>
              </div>
              <div className="mnt-detail-id">
                <h3 className="mnt-detail-title">{selected.action.title}</h3>
                <span className="mnt-detail-comp">{selected.action.component}</span>
              </div>

              <dl className="mnt-figs">
                <div>
                  <dt>Window</dt>
                  <dd>{fmtWindow(selected)}</dd>
                </div>
                <div>
                  <dt>Due in</dt>
                  <dd>{fmtD(selected.dueIn)}</dd>
                </div>
                <div>
                  <dt>Downtime</dt>
                  <dd>{fmtH(selected.downtime)}</dd>
                </div>
              </dl>

              <div className="mnt-conf">
                <div className="mnt-conf-head">
                  <span>Confidence</span>
                  <b>{selected.action.confidence} %</b>
                </div>
                <TickMeter value={selected.action.confidence} color="var(--signal-blue)" />
              </div>

              <p className="mnt-rationale" title={selected.action.rationale}>
                {selected.action.rationale}
              </p>

              {(evidence.features.length > 0 || evidence.degradation || evidence.source) && (
                <div className="mnt-evidence">
                  <span className="mnt-section-label">Evidence</span>
                  {evidence.features.map((f) => (
                    <div key={f.id} className="mnt-ev-row" title={f.label}>
                      <span className="mnt-ev-tag">{f.tag}</span>
                      <TickMeter value={f.weight} ticks={16} color="var(--diagram-stroke)" className="mnt-ev-meter" />
                      <span className="mnt-ev-val">{f.weight} %</span>
                    </div>
                  ))}
                  {(evidence.degradation || evidence.source) && (
                    <div className="mnt-ev-chips">
                      {evidence.degradation && (
                        <Chip color={healthColor(evidence.degradation.health)} title={evidence.degradation.name}>
                          Health {evidence.degradation.health} % · {evidence.degradation.stageLabel}
                        </Chip>
                      )}
                      {evidence.source && (
                        <Chip color={TIER_COLOR[evidence.source.severity === "Critical" ? "Critical" : evidence.source.severity === "Advisory" ? "High" : "Routine"]} title={evidence.source.cause}>
                          Source share {evidence.source.contribution} %
                        </Chip>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mnt-detail-actions">
                <PillButton
                  variant="primary"
                  icon={<IconCalendar />}
                  disabled={statusOf(selected.action.id) === "Scheduled"}
                  onClick={() => setStatus(selected.action.id, "Scheduled")}
                >
                  {statusOf(selected.action.id) === "Scheduled" ? "Scheduled" : "Schedule"}
                </PillButton>
                <PillButton
                  variant="secondary"
                  onClick={() =>
                    setStatus(selected.action.id, statusOf(selected.action.id) === "Open" ? "Deferred" : "Open")
                  }
                >
                  {statusOf(selected.action.id) === "Open" ? "Defer" : "Reopen"}
                </PillButton>
              </div>
            </>
          ) : (
            <p className="mnt-empty">No action selected.</p>
          )}
        </aside>
      </div>

      {/* Tier 3 · Register */}
      <section className="mnt-card mnt-card--table" aria-labelledby="mnt-reg-title">
        <header className="mnt-card-head">
          <h3 id="mnt-reg-title" className="mnt-card-title">Action register</h3>
          <span className="mnt-card-meta">{rows.length} actions</span>
        </header>
        <div className="mnt-table-wrap">
          <table className="mnt-table">
            <thead>
              <tr>
                <th scope="col">Action</th>
                <th scope="col">Component</th>
                <th scope="col" className="num">Due in</th>
                <th scope="col" className="num">Downtime</th>
                <th scope="col" className="num">Confidence</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="mnt-sr">Row actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const id = r.action.id;
                const status = statusOf(id);
                const isSel = selected?.action.id === id;
                return (
                  <tr
                    key={id}
                    className={isSel ? "is-selected" : undefined}
                    tabIndex={0}
                    aria-current={isSel ? "true" : undefined}
                    onClick={() => setSelectedId(id)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(id);
                      }
                    }}
                  >
                    <td>
                      <span className="mnt-lead">
                        <TierIcon tier={r.tier} />
                        <span className="mnt-lead-text">
                          <span className="mnt-cell-title">{r.action.title}</span>
                          <span className="mnt-cell-sub">{r.tier}</span>
                        </span>
                      </span>
                    </td>
                    <td className="mnt-muted">{r.action.component}</td>
                    <td className="num">{fmtD(r.dueIn)}</td>
                    <td className="num">{fmtH(r.downtime)}</td>
                    <td className="num">{r.action.confidence} %</td>
                    <td>
                      <Chip color={STATUS_COLOR[status]}>{status}</Chip>
                    </td>
                    <td className="mnt-trail">
                      <span className="mnt-trail-btns">
                        <button
                          type="button"
                          className="mnt-icon-btn"
                          aria-label={`Schedule ${r.action.title}`}
                          disabled={status === "Scheduled"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatus(id, "Scheduled");
                          }}
                        >
                          <IconCalendar />
                        </button>
                        <button
                          type="button"
                          className="mnt-icon-btn"
                          aria-label={`Defer ${r.action.title}`}
                          disabled={status === "Deferred"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatus(id, "Deferred");
                          }}
                        >
                          <IconDefer />
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="mnt-empty">
                    No actions at this priority.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default MaintenanceModule;
