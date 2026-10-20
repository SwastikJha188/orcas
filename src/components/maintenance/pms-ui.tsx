"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Dialog, Field, FormNote, PillButton, TextArea, type Tone } from "@/components/ui";
import { STEPS, planGenerates, planHours, type PlanDue } from "@/lib/pms";
import type { PmsPlan, PmsWorkOrder } from "@/types/pms";
import { machineName, planName, planRound, unitLabel, woRef, type Outcome } from "./pms-model";

/* ==========================================================================
   Shared pieces of the planned-maintenance views (prefix pm-).
   ========================================================================== */

/* ------------------------------------------------------------ pages and focus */

export type PmsPage = "overview" | "preventive" | "predictive" | "proactive" | "work" | "calendar" | "machine" | "resources" | "history";

export const PMS_PAGES: { id: PmsPage; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "preventive", label: "Preventive" },
  { id: "predictive", label: "Predictive & planned" },
  { id: "proactive", label: "Proactive" },
  { id: "work", label: "Work orders" },
  { id: "calendar", label: "Calendar" },
  { id: "machine", label: "Machine maintenance" },
  { id: "resources", label: "People, parts & shutdowns" },
  { id: "history", label: "History & performance" },
];

const NavContext = createContext<(page: PmsPage, focus?: string) => void>(() => {});
export const PmsNavProvider = NavContext.Provider;
/** Switch the Maintenance page, optionally focused on one item (see setPmsFocus). */
export const usePmsNav = () => useContext(NavContext);

const FOCUS_KEY = "ultron.pms.focus";

/** Open a page on one item: "w:<id>" work order, "c:<id>" alarm check, "p:<plan>" plan, "m:<machine>" machine, "g:<group>" preventive group, "r:<part>" part. */
export function setPmsFocus(key: string) {
  try {
    sessionStorage.setItem(FOCUS_KEY, key);
  } catch {
    /* storage unavailable */
  }
}

/** Reads (and clears) the focus left by another view, once on mount. */
export function usePmsFocus(prefixes: string[]): string | null {
  const [focus] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const v = sessionStorage.getItem(FOCUS_KEY);
      if (v && prefixes.some((p) => v.startsWith(p))) {
        sessionStorage.removeItem(FOCUS_KEY);
        return v;
      }
    } catch {
      /* storage unavailable */
    }
    return null;
  });
  return focus;
}

/* ------------------------------------------------------------ occurrences */

export interface Occurrence {
  key: string;
  at: number;
  kind: "plan" | "wo";
  title: string;
  /** Calendar chip text. */
  short: string;
  sub: string;
  tone?: Tone;
  /** Plan occurrences: number of tasks in the round. */
  tasks?: number;
  /** Past its due date when the range was built (the backlog on today). */
  due?: boolean;
  /** Shift / daily rounds: summarised per day, not listed one by one. */
  routine: boolean;
  isolate: boolean;
  ref: string;
  sensor: boolean;
}

const DAY = 86_400_000;

export const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * Due occurrences of the generating calendar plans between `from` and `to`,
 * projected from each plan's next due date by its interval, plus work orders
 * with a planned start. Due-now plans sit on today.
 */
export function occurrences(plans: PmsPlan[], dues: Map<string, PlanDue>, wos: PmsWorkOrder[], from: number, to: number, now: number): Occurrence[] {
  const out: Occurrence[] = [];
  const today = startOfDay(now);
  for (const p of plans) {
    const h = planHours(p);
    const d = dues.get(p.id);
    if (!planGenerates(p) || h === null || !d || d.dueAt === null) continue;
    const step = h * 3_600_000;
    const routine = h <= 24;
    // A round is isolation work only when every task needs a stop (mixed rounds run their RUN checks live).
    const isolate = p.tasks.length > 0 && p.tasks.every((t) => t.mode === "OFF");
    let at = Math.max(d.dueAt, today);
    if (at < from) at += Math.ceil((from - at) / step) * step;
    let first = d.dueAt <= now;
    for (let n = 0; at < to && n < 400; n++, at += step) {
      out.push({
        key: `${p.id}@${at}`,
        at,
        kind: "plan",
        title: planName(p),
        short: planRound(p),
        sub: `${p.unitCode === "GEN" ? machineName(p.machineId) : p.unitCode}${p.kind === "sensor" ? " · instruments" : ""}`,
        tasks: p.tasks.length,
        tone: first && d.state === "overdue" ? "warn" : undefined,
        due: first && d.dueAt <= now,
        routine,
        isolate,
        ref: p.id,
        sensor: p.kind === "sensor",
      });
      first = false;
    }
  }
  for (const w of wos) {
    if (!w.plannedStart) continue;
    const at = Date.parse(w.plannedStart);
    if (at < from || at >= to) continue;
    out.push({
      key: `wo${w.id}`,
      at,
      kind: "wo",
      title: w.title,
      short: w.title,
      sub: `${woRef(w.id)} · ${w.priority}`,
      tone: w.priority === "P1" ? "bad" : w.priority === "P2" ? "warn" : undefined,
      routine: false,
      isolate: w.workMode === "Isolate",
      ref: String(w.id),
      sensor: false,
    });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Shift / daily rounds of one day as one line: "Shift ×3 · Daily ×2". */
export function routineSummary(list: Occurrence[], plans: PmsPlan[]): string | null {
  const byRoute = new Map<string, number>();
  for (const o of list) {
    if (!o.routine) continue;
    const p = plans.find((x) => x.id === o.ref);
    const name = p ? p.routeLabel : "Round";
    byRoute.set(name, (byRoute.get(name) ?? 0) + 1);
  }
  if (!byRoute.size) return null;
  return [...byRoute].map(([k, n]) => (n > 1 ? `${k} ×${n}` : k)).join(" · ");
}

export { DAY, unitLabel };

/* ------------------------------------------------------------ small pieces */

/** Label → value rows (definition list), muted label left. */
export function DefList({ rows, className = "" }: { rows: { label: string; value: React.ReactNode; tone?: Tone; hint?: string }[]; className?: string }) {
  return (
    <dl className={`pm-defs ${className}`.trim()}>
      {rows.map((r) => (
        <div key={r.label} className="pm-def" title={r.hint}>
          <dt>{r.label}</dt>
          <dd data-tone={r.tone && r.tone !== "idle" ? r.tone : undefined}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The seven-step lifecycle as a segmented track; the current step is marked. */
export function Stepper({ step, paused, ended }: { step: number; paused?: string | null; ended?: string | null }) {
  return (
    <ol className="pm-steps" aria-label="Steps of a work order">
      {STEPS.map((s, i) => {
        const state = i < step ? "done" : i === step ? "current" : "todo";
        return (
          <li key={s} className="pm-step" data-state={state} aria-current={i === step ? "step" : undefined}>
            <span className="pm-step-num ast-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="pm-step-label">{s}</span>
            {i === step && (paused || ended) && <span className="pm-step-flag">{paused ?? ended}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Inline result line after an action. */
export function Notice({ outcome }: { outcome: Outcome | null }) {
  if (!outcome) return null;
  return (
    <div className="pm-notice">
      <FormNote tone={outcome.tone}>{outcome.text}</FormNote>
    </div>
  );
}

/** Asks for the text an action needs (a reason, the as-found / as-left record) and runs it. */
export function NoteDialog({
  open,
  title,
  subtitle,
  label,
  hint,
  initial = "",
  confirm,
  danger,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  label: string;
  hint?: string;
  initial?: string;
  confirm: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: (text: string) => Promise<Outcome>;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setValue(initial);
      setErr(null);
    }
  }, [open, initial]);
  const submit = async () => {
    if (!value.trim()) {
      setErr("Please fill this in.");
      return;
    }
    setBusy(true);
    const out = await onConfirm(value.trim());
    setBusy(false);
    if (out.tone === "bad") setErr(out.text);
    else onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      busy={busy}
      onSubmit={() => void submit()}
      width={520}
      footer={
        <>
          <PillButton variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton variant={danger ? "danger" : "primary"} type="submit" loading={busy}>
            {confirm}
          </PillButton>
        </>
      }
    >
      <Field label={label} hint={hint} error={err} required>
        {(fid, d) => <TextArea id={fid} describedBy={d} value={value} onChange={setValue} rows={4} />}
      </Field>
    </Dialog>
  );
}

/** Small status word with a dot only for warning / alarm (StatusTag look, table-friendly). */
export function StateWord({ label, tone }: { label: React.ReactNode; tone?: Tone }) {
  const t = tone === "warn" || tone === "bad" || tone === "info" ? tone : undefined;
  return (
    <span className="pm-state" data-tone={t}>
      {t && <span className="ast-chip-dot" aria-hidden="true" />}
      {label}
    </span>
  );
}

const svg = (d: React.ReactNode) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

export const PM_ICON = {
  finding: svg(<path d="M1 8h3l1.5-4 3 8 2-6 1.5 2H15" />),
  wo: svg(<path d="M10.2 2.2a3.2 3.2 0 0 0-3.9 4.3L2 10.8a1.3 1.3 0 0 0 1.8 1.8l4.3-4.3a3.2 3.2 0 0 0 4.3-3.9l-2 2-1.8-.4-.4-1.8z" />),
  plan: svg(<><rect x="2.5" y="3" width="11" height="10.5" rx="1.5" /><path d="M2.5 6.5h11M5.5 1.5v3M10.5 1.5v3" /></>),
  sensor: svg(<><circle cx="8" cy="8" r="2" /><path d="M4.5 4.5a5 5 0 0 0 0 7M11.5 4.5a5 5 0 0 1 0 7" /></>),
  check: svg(<path d="M3.5 8.5 6.5 11.5 12.5 4.5" />),
  prev: svg(<path d="M10 3.5 5.5 8l4.5 4.5" />),
  next: svg(<path d="M6 3.5 10.5 8 6 12.5" />),
  lock: svg(<><rect x="3.5" y="7" width="9" height="6" rx="1.5" /><path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" /></>),
  part: svg(<><circle cx="8" cy="8" r="2.2" /><path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6 5 5M11 11l1.4 1.4M3.6 12.4 5 11M11 5l1.4-1.4" /></>),
};

/** Leading badge + title + muted sub line for a table cell. */
export function ItemCell({ icon, tone, title, sub }: { icon: React.ReactNode; tone?: Tone; title: string; sub?: string }) {
  return (
    <span className="pm-item">
      <span className="ast-badge" data-tone={tone === "warn" || tone === "bad" ? tone : undefined}>
        {icon}
      </span>
      <span className="ast-cell-stack">
        <span className="ast-cell-title" title={title}>
          {title}
        </span>
        {sub && (
          <span className="ast-cell-sub" title={sub}>
            {sub}
          </span>
        )}
      </span>
    </span>
  );
}
