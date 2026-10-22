"use client";

/* ==========================================================================
   Analysis · investigation primitives shared by the three windows
   (Diagnosis, Prognosis, Sensors): the numbered step card, fact rows that
   carry their basis (measured / inferred / predicted / to verify), the
   ranked-cause table, the "to investigate" list and a reading-against-
   expected chart. Monochrome; status colour only where something is off.
   ========================================================================== */

import React from "react";
import { Table, type Column } from "@/components/ui";
import { ConfidenceMeter } from "./an-ui";
import { formatDuration, type SimFrame } from "@shared/lib/kiln-sim/engine";
import { BASIS_TIP, BASIS_WORD, type Basis, type Hypothesis } from "./an-intel";
import { Z_ANOMALY, fmt } from "./an-derive";

/** The eight steps every investigation walks, in order. */
export const STEP_IDS = ["an-step-1", "an-step-2", "an-step-3", "an-step-4", "an-step-5", "an-step-6", "an-step-7", "an-step-8"] as const;

/** One numbered investigation step: a card with "1  What changed" and optional actions on the right. */
export function Step({ n, title, right, children }: { n: number; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  const id = STEP_IDS[n - 1];
  return (
    <section id={id} className="ast-card pg-analysis-section pg-in-step" aria-labelledby={`${id}-title`}>
      <header className="pg-analysis-section-head">
        <h3 id={`${id}-title`} className="pg-analysis-section-title pg-in-step-title">
          <span className="pg-in-step-n" aria-hidden="true">
            {n}
          </span>
          {title}
        </h3>
        {right && <div className="pg-analysis-section-right">{right}</div>}
      </header>
      <div className="pg-analysis-section-body">{children}</div>
    </section>
  );
}

/** Where a fact comes from, as one quiet word (the meaning in its tooltip). */
export function BasisWord({ basis }: { basis: Basis }) {
  return (
    <span className="pg-in-basis" data-basis={basis} title={BASIS_TIP[basis]}>
      {BASIS_WORD[basis]}
    </span>
  );
}

export interface FactRow {
  label: string;
  value: React.ReactNode;
  basis?: Basis;
  /** Tooltip on the value (engineering text behind a plain one). */
  title?: string;
}

/** Label · value · basis rows. Rows without a value are left out. */
export function Facts({ rows }: { rows: FactRow[] }) {
  const shown = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== "" && !(Array.isArray(r.value) && r.value.length === 0));
  if (!shown.length) return null;
  return (
    <dl className="pg-in-facts">
      {shown.map((r) => (
        <div key={r.label} className="pg-in-fact">
          <dt>{r.label}</dt>
          <dd title={r.title || undefined}>{r.value}</dd>
          <span className="pg-in-fact-basis">{r.basis && <BasisWord basis={r.basis} />}</span>
        </div>
      ))}
    </dl>
  );
}

/** Plain texts: one inline, several as a list; null when empty (so Facts hides the row). */
export function Texts({ items }: { items: React.ReactNode[] }) {
  if (!items.length) return null;
  if (items.length === 1) return <>{items[0]}</>;
  return (
    <ul className="pg-an-list">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

/** A titled block inside a step (flush, split by a hairline), with the basis of what it shows. */
export function Block({ title, basis, right, children }: { title: string; basis?: Basis; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="pg-analysis-block" role="group" aria-label={title}>
      <div className="pg-analysis-block-head">
        <h4 className="pg-analysis-block-title">{title}</h4>
        <span className="pg-in-block-right">
          {right}
          {basis && <BasisWord basis={basis} />}
        </span>
      </div>
      {children}
    </div>
  );
}

/** Sensor name that opens its trend chart; the tag is in the tooltip. */
export function TagButton({ tag, name, onOpenTrend }: { tag: string; name: string; onOpenTrend: (tag: string) => void }) {
  return (
    <button type="button" className="ast-cell-title pg-dx-tag" onClick={() => onOpenTrend(tag)} title={`Open the trend chart for this sensor (${tag})`}>
      {name} <span aria-hidden="true">↗</span>
    </button>
  );
}

/** Number + unit for table cells. */
export function Num({ v, unit, strong = false, muted = false, signed = false }: { v: number | null | undefined; unit?: string; strong?: boolean; muted?: boolean; signed?: boolean }) {
  if (v === null || v === undefined || !Number.isFinite(v)) return <span className="ast-num ast-muted">—</span>;
  const text = signed ? `${v >= 0 ? "+" : "−"}${fmt(Math.abs(v))}` : fmt(v);
  return (
    <span className={`ast-num ${strong ? "pg-an-strong" : ""} ${muted ? "ast-muted" : ""}`.trim()}>
      {text}
      {unit && <span className="ast-unit"> {unit}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Ranked causes                                                       */
/* ------------------------------------------------------------------ */

const STATUS_TONE: Record<Hypothesis["status"], string | undefined> = { Leading: "lead", Possible: undefined, "To check": "check", "Ruled out": "out" };

export function CauseTable({ causes }: { causes: Hypothesis[] }) {
  const scored = causes.some((c) => c.confidence !== null);
  const cols: Column<Hypothesis>[] = [
    {
      key: "cause",
      header: "Possible cause",
      render: (c) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">{c.cause}</span>
          <span className="ast-cell-sub">{c.kind}</span>
        </span>
      ),
    },
    {
      key: "for",
      header: "Evidence for",
      render: (c) => (c.support.length ? <Texts items={c.support} /> : <span className="ast-muted">—</span>),
    },
    {
      key: "against",
      header: "Evidence against",
      render: (c) => (c.against.length ? <Texts items={c.against} /> : <span className="ast-muted">—</span>),
    },
    {
      key: "status",
      header: "Standing",
      width: "110px",
      render: (c) => (
        <span className="pg-in-standing" data-tone={STATUS_TONE[c.status]}>
          {c.status}
        </span>
      ),
    },
    ...(scored
      ? [
          {
            key: "conf",
            header: "Match",
            width: "130px",
            render: (c: Hypothesis) =>
              c.confidence !== null ? (
                <ConfidenceMeter value={c.confidence} label="Match" basis="how well the readings fit this known problem, from the engine; not a proof" compact />
              ) : (
                <span className="ast-muted">Not scored</span>
              ),
          },
        ]
      : []),
    { key: "basis", header: "Basis", width: "90px", render: (c) => <BasisWord basis={c.basis} /> },
  ];
  return <Table className="pg-an-table pg-in-causes" columns={cols} data={causes} keyExtractor={(c) => c.key} />;
}

/* ------------------------------------------------------------------ */
/* What to investigate                                                 */
/* ------------------------------------------------------------------ */

export interface Subject {
  key: string;
  title: string;
  where: string;
  /** State in words ("Ongoing for 2h 10m", "Likely 3–9 d left"). */
  state: string;
  /** Third column ("Sudden", "Drift", "Worsening"). */
  how: string | null;
  tone?: "warn" | "bad";
}

export function SubjectTable({
  rows,
  activeKey,
  onPick,
  headers = {},
}: {
  rows: Subject[];
  activeKey: string | null;
  onPick: (key: string) => void;
  /** Column headings for where / state / how. */
  headers?: { where?: string; state?: string; how?: string };
}) {
  const cols: Column<Subject>[] = [
    {
      key: "title",
      header: "Investigation",
      render: (s) => (
        <span className="pg-in-subject-cell" data-tone={s.tone}>
          <span className="ast-chip-dot" aria-hidden="true" />
          <span className="ast-cell-title">{s.title}</span>
        </span>
      ),
    },
    { key: "where", header: headers.where ?? "Where", width: "220px", render: (s) => <span className="ast-cell-text">{s.where}</span> },
    { key: "state", header: headers.state ?? "State", width: "240px", render: (s) => <span className="ast-cell-text">{s.state}</span> },
    { key: "how", header: headers.how ?? "How", width: "150px", render: (s) => <span className="ast-cell-text">{s.how ?? "—"}</span> },
  ];
  return <Table className="pg-an-table pg-in-subjects" columns={cols} data={rows} keyExtractor={(s) => s.key} onRowClick={(s) => onPick(s.key)} selectedKey={activeKey ?? undefined} />;
}

/* ------------------------------------------------------------------ */
/* Reading against expected                                            */
/* ------------------------------------------------------------------ */

const W = 1120;
const H = 180;
const PAD = { l: 52, r: 16, t: 10, b: 22 };

/**
 * One sensor over the history window: the reading (ink), what the reference
 * model expects (muted, dashed) and the ±3σ band around it. Time axis in
 * the page's duration words.
 */
export function SignalChart({ frame, tag, label }: { frame: SimFrame; tag: string; label: string }) {
  const def = frame.defs.signalByTag[tag];
  const h = frame.history[tag] ?? [];
  const m = frame.modelHistory[tag] ?? [];
  const n = Math.min(h.length, frame.times.length);
  if (!def || n < 2) return null;
  const times = frame.times.slice(-n);
  const hv = h.slice(-n);
  const mv = m.length >= n ? m.slice(-n) : null;
  const band = Z_ANOMALY * (def.sigma || 1);
  const vals = [...hv, ...(mv ? mv.flatMap((v) => [v - band, v + band]) : [])].filter(Number.isFinite);
  if (!vals.length) return null;
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const padV = (hi - lo) * 0.08;
  lo -= padV;
  hi += padV;
  const span = Math.max(1, frame.t - times[0]);
  const x = (t: number) => PAD.l + (1 - (frame.t - t) / span) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const path = (vs: number[]) => {
    let d = "";
    let pen = false;
    vs.forEach((v, k) => {
      if (!Number.isFinite(v)) return void (pen = false);
      d += `${pen ? "L" : "M"}${x(times[k]).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const bandPath = mv
    ? (() => {
        const up = mv.map((v, k) => (Number.isFinite(v) ? `${x(times[k]).toFixed(1)},${y(v + band).toFixed(1)}` : null)).filter(Boolean);
        const dn = mv
          .map((v, k) => (Number.isFinite(v) ? `${x(times[k]).toFixed(1)},${y(v - band).toFixed(1)}` : null))
          .filter(Boolean)
          .reverse();
        return up.length > 1 ? `M${up.join("L")}L${dn.join("L")}Z` : "";
      })()
    : "";
  const ticksY = [lo + padV, (lo + hi) / 2, hi - padV];
  const ticksX = [0, 0.5, 1].map((f) => frame.t - span * (1 - f));
  const unit = def.unit && def.unit !== "state" ? def.unit : "";
  return (
    <figure className="pg-prog-chart-scroll pg-in-chart">
      <svg className="pg-prog-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: reading against expected over the last ${formatDuration(span)}`}>
        {bandPath && <path d={bandPath} className="pg-prog-limband" />}
        {ticksY.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="pg-prog-grid" />
            <text x={PAD.l - 8} y={y(v) + 4} className="pg-prog-axis" textAnchor="end">
              {fmt(v)}
            </text>
          </g>
        ))}
        {mv && <path d={path(mv)} className="pg-prog-sysline pg-in-chart-model" />}
        <path d={path(hv)} className="pg-prog-overall" />
        {ticksX.map((t, i) => (
          <text key={t} x={x(t)} y={H - 4} className="pg-prog-axis" textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}>
            {i === 2 ? "now" : `${formatDuration(frame.t - t)} ago`}
          </text>
        ))}
      </svg>
      <figcaption className="pg-in-chart-key">
        <span className="pg-in-key is-line" aria-hidden="true" />
        Reading{unit ? ` (${unit})` : ""}
        {mv && (
          <>
            <span className="pg-in-key is-model" aria-hidden="true" />
            Expected
            <span className="pg-in-key is-band" aria-hidden="true" />
            Normal range
          </>
        )}
      </figcaption>
    </figure>
  );
}
