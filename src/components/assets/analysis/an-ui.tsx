"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { alertTone } from "@/components/ui/kpi";
import type { InsightsResponse, Severity } from "@backend/services/insights-service";
import type { AssetMachine } from "../assets-data";
import type { AssetsSubPage } from "../assets-view";
import type { Tone } from "../assets-shell-ui";
import type { WorkOrderPriorityDto } from "@shared/types/monitoring";
import "./analysis-page.css";

/*
 * Shared building blocks for the Analysis page (prefix pg-analysis-).
 *
 * Shared page primitives (imported by every machine page — keep names stable).
 * Industrial, monochrome by default: colour only for warning / alarm, no prose,
 * no badges, one card per section.
 *   SectionIndex + useScrollSpy + scrollToSection   compact scroll-spy pill row
 *   Section                                         one card per section, 1–3 word heading
 *   Panel                                           flush titled block inside a section
 *   PageHeader                                      the one page header row (title · status · meta · actions)
 *   KpiStrip (page) / Fact                          page KPI strip (4 frosted tiles) / flush facts in a section
 *   ConfidenceMeter                                 value + thin neutral bar
 *   WhyDisclosure                                   quiet disclosure (one per section at most)
 *   CausalChain                                     compact finding chain
 *   Empty                                           one muted line
 */

export type AnalysisData = InsightsResponse["analysis"];

export type AnalysisModuleId = "overview" | "fault" | "source" | "degradation" | "xai" | "maintenance";

export interface AnalysisModuleProps {
  data: AnalysisData;
  machine: AssetMachine;
  /** Open another Analysis module. */
  open: (id: AnalysisModuleId) => void;
  /** Open another sub-page of the current machine. */
  go: (sub: AssetsSubPage) => void;
}

/* ------------------------------------------------------------------ */
/* Placeholder rows the payload builders add when nothing is wrong.   */
/* ------------------------------------------------------------------ */

export const realFaults = (d: AnalysisData) => d.faults.filter((f) => f.id !== "nominal" && f.severity !== "Normal");
export const realSources = (d: AnalysisData) => d.sources.filter((s) => s.id !== "src-baseline" && s.severity !== "Normal");
export const openActions = (d: AnalysisData) => d.actions.filter((a) => a.id !== "routine");

/** Work-order priority name (DB `useWorkOrderPriorities`, most urgent first). */
export type Priority = string;

/** Position of a priority name in the DB order (0 = most urgent); unknown names, or priorities still loading, sort last. */
export function priorityRank(name: string, priorities: readonly WorkOrderPriorityDto[] | null): number {
  const i = priorities ? priorities.findIndex((p) => p.name === name) : -1;
  return i < 0 ? Number.MAX_SAFE_INTEGER : i;
}

const RANK_TONE: Tone[] = ["bad", "warn", "info"];

/** Tone of a priority by its urgency rank: the three most urgent bad / warn / info, the rest idle. */
export const priorityTone = (name: string, priorities: readonly WorkOrderPriorityDto[] | null): Tone => RANK_TONE[priorityRank(name, priorities)] ?? "idle";

export const sevTone = (s: Severity): Tone => (s === "Critical" ? "bad" : s === "Alert" ? "warn" : "good");
export const stageTone = (stage: number): Tone => (stage >= 4 ? "bad" : stage >= 3 ? "warn" : "good");
export const STAGE_MAX = 5;

export const pct = (v: number) => `${Math.round(v)}`;

/** "R07 Name — mechanism" → { name, detail }. */
export function splitCause(text: string): { name: string; detail: string } {
  const i = text.indexOf(" — ");
  return i < 0 ? { name: text, detail: "" } : { name: text.slice(0, i), detail: text.slice(i + 3) };
}

/** Sub-assembly names cited by a fault/source subsystem string ("A, B"). */
export function subsystemsOf(text: string): string[] {
  return text
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Faults whose source cites the given sub-assembly name. */
export function faultsForSubassembly(d: AnalysisData, name: string) {
  const n = name.toLowerCase();
  return realFaults(d).filter((f) => {
    const src = d.sources.find((s) => s.id === f.id);
    return src ? subsystemsOf(src.subsystem).some((x) => x.toLowerCase() === n) : false;
  });
}

/* ------------------------------------------------------------------ */
/* Tone discipline: colour only for warning / alarm                   */
/* ------------------------------------------------------------------ */

export { alertTone, KpiStrip, Fact, type KpiItem, type FactItem } from "@/components/ui/kpi";

/* ------------------------------------------------------------------ */
/* Page header — the one header row of every machine sub-page          */
/* ------------------------------------------------------------------ */

export interface PageMetaItem {
  label: string;
  value: React.ReactNode;
  /** Tooltip (e.g. the full time zone). */
  title?: string;
}

/**
 * Where page headers render. The Assets workspace provides the first row below its machine
 * bar here, so a machine page's header always leads the page, under the page toggle that
 * picked it. Null (popups, elsewhere): in place.
 */
export const PageHeaderSlot = createContext<HTMLElement | null>(null);
const CONDITION_WORDS = ["Normal", "Alert", "Critical"] as const;

/**
 * One row: h1 title + inline status (dot + label, tinted only when not
 * Normal) + muted `Label value` meta pairs (max 4) + right-aligned actions
 * (pill buttons, max 3). Meta wraps under the title only on narrow widths.
 * Classes: .pg-frame-head > .pg-frame-head-main (.pg-frame-title,
 * .pg-frame-status, .pg-frame-meta) + .pg-frame-actions.
 */
export function PageHeader({
  title,
  status,
  meta = [],
  actions,
}: {
  title: string;
  status?: { label: string; tone?: Tone } | null;
  meta?: (PageMetaItem | null | false | undefined | "")[];
  actions?: React.ReactNode;
}) {
  const slot = useContext(PageHeaderSlot);
  // In the Assets workspace the machine's condition sits in the machine bar right above: a bare
  // Normal / Alert / Critical here would only repeat it. Page-own statuses still show.
  const shown = slot && status && (CONDITION_WORDS as readonly string[]).includes(status.label) ? null : status;
  const t = shown ? alertTone(shown.tone) : undefined;
  const pairs = meta.filter(Boolean).slice(0, 4) as PageMetaItem[];
  const head = (
    <header className="pg-frame-head">
      <div className="pg-frame-head-main">
        <h1 className="pg-frame-title">{title}</h1>
        {shown && (
          <span className="pg-frame-status" data-tone={t}>
            <span className="ast-chip-dot" aria-hidden="true" />
            {shown.label}
          </span>
        )}
        {pairs.length > 0 && (
          <dl className="pg-frame-meta">
            {pairs.map((m) => (
              <div key={m.label} title={m.title ?? (typeof m.value === "string" ? m.value : undefined)}>
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {actions && <div className="pg-frame-actions">{actions}</div>}
    </header>
  );
  return slot ? createPortal(head, slot) : head;
}

/* ------------------------------------------------------------------ */
/* Sub-blocks, empty lines, links                                     */
/* ------------------------------------------------------------------ */

/**
 * A titled block inside a section. Never a nested card: inside a Section it
 * renders flush, separated by a hairline. `caption` is kept as a tooltip only.
 */
export function Panel({
  title,
  caption,
  right,
  children,
  table = false,
  label,
}: {
  title: string;
  caption?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  table?: boolean;
  label?: string;
}) {
  return (
    <div className={`pg-analysis-block ${table ? "is-table" : ""}`} role="group" aria-label={label ?? title}>
      <div className="pg-analysis-block-head">
        <h4 className="pg-analysis-block-title" title={typeof caption === "string" ? caption : undefined}>
          {title}
        </h4>
        {right}
      </div>
      {children}
    </div>
  );
}

/** One muted line for "nothing here" (no boxed empty states). */
export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <p className="pg-analysis-empty">
      {title}
      {children ? <span className="pg-analysis-empty-more"> · {children}</span> : null}
    </p>
  );
}

export function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Monoline icons (16px, currentColor) — table leading badges only     */
/* ------------------------------------------------------------------ */

const ICON_PATHS: Record<Exclude<AnalysisModuleId, "overview"> | "sensor" | "detect" | "quality" | "process", React.ReactNode> = {
  detect: (
    <>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.4 10.4 14.5 14.5M4.8 7h1.2l.8-1.8 1.2 3.6.8-1.8h.9" />
    </>
  ),
  quality: (
    <>
      <path d="M8 1.5 13.5 4v4c0 3.2-2.4 5.6-5.5 6.5C4.9 13.6 2.5 11.2 2.5 8V4z" />
      <path d="m5.6 8 1.7 1.7 3.2-3.4" />
    </>
  ),
  process: (
    <>
      <path d="M1.5 11.5h3l2-7 3 9 2-5h3" />
    </>
  ),
  source: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15" />
    </>
  ),
  fault: <path d="M1 8h3l1.5-4 3 8 2-6 1.5 2H15" />,
  degradation: <path d="M1.5 3.5h3v3h3v3h3v3h4" />,
  maintenance: <path d="M10.2 2.2a3.2 3.2 0 0 0-3.9 4.3L2 10.8a1.3 1.3 0 0 0 1.8 1.8l4.3-4.3a3.2 3.2 0 0 0 4.3-3.9l-2 2-1.8-.4-.4-1.8z" />,
  xai: (
    <>
      <circle cx="8" cy="3" r="1.6" />
      <circle cx="3.5" cy="12.5" r="1.6" />
      <circle cx="12.5" cy="12.5" r="1.6" />
      <path d="M7.1 4.3 4.4 11.1M8.9 4.3l2.7 6.8M5.1 12.5h5.8" />
    </>
  ),
  sensor: (
    <>
      <circle cx="8" cy="8" r="2" />
      <path d="M4.5 4.5a5 5 0 0 0 0 7M11.5 4.5a5 5 0 0 1 0 7" />
    </>
  ),
};

export function Icon({ id }: { id: keyof typeof ICON_PATHS }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[id]}
    </svg>
  );
}

/** Table-row leading badge (CLAUDE.md table style); coloured only in warning / alarm. */
export function Badge({ id, tone }: { id: keyof typeof ICON_PATHS; tone?: Tone }) {
  return (
    <span className="ast-badge" data-tone={alertTone(tone)}>
      <Icon id={id} />
    </span>
  );
}

/** Leading badge + title + muted sub line, for table cells. */
export function ItemCell({
  icon,
  tone,
  title,
  sub,
  titleTip,
  subTip,
}: {
  icon: keyof typeof ICON_PATHS;
  tone?: Tone;
  title: string;
  sub?: string;
  /** Tooltips when they differ from the text (e.g. the raw text with IDs). */ titleTip?: string;
  subTip?: string;
}) {
  return (
    <span className="pg-analysis-item">
      <Badge id={icon} tone={tone} />
      <span className="ast-cell-stack">
        <span className="ast-cell-title" title={titleTip ?? title}>
          {title}
        </span>
        {sub && (
          <span className="ast-cell-sub" title={subTip ?? sub}>
            {sub}
          </span>
        )}
      </span>
    </span>
  );
}

/** Thin horizontal meter (0–100): neutral ink, status colour only in warning / alarm. */
export function Meter({ value, tone, label }: { value: number; tone?: Tone; label?: string }) {
  const w = Math.max(0, Math.min(100, value));
  return (
    <span className="pg-analysis-meter" data-tone={alertTone(tone)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <i style={{ width: `${w}%` }} />
    </span>
  );
}

/* ================================================================== */
/* Shared page primitives (used by every machine page — names stable)  */
/* ================================================================== */

export interface SectionIndexItem {
  id: string;
  label: string;
  /** Status dot before the label — shown only for warning / alarm. */
  tone?: Tone;
}

/**
 * Nearest scrolling ancestor (the machine workspace), else the document. An
 * ancestor that already overflows wins; otherwise the first scrollable one
 * (content may still be loading when the index mounts).
 */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  let n = el?.parentElement ?? null;
  let first: HTMLElement | null = null;
  while (n) {
    const o = getComputedStyle(n).overflowY;
    if (o === "auto" || o === "scroll") {
      if (n.scrollHeight > n.clientHeight) return n;
      first ??= n;
    }
    n = n.parentElement;
  }
  return first;
}

/** The section most recently requested through the index (honoured when the page cannot scroll it to the top). */
let requestedSection: string | null = null;

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Scroll a section into view (sections carry scroll-margin for the sticky index). */
export function scrollToSection(id: string): void {
  requestedSection = id;
  const el = typeof document !== "undefined" ? document.getElementById(id) : null;
  el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

/**
 * Active section id while scrolling: the section occupying the reading line
 * just below the sticky index (the anchor's bottom edge, or the sections'
 * scroll-margin when the anchor is not pinned), i.e. the last section whose
 * top has reached that line. At the bottom of the page, where the last
 * sections can never reach the line, the section last chosen in the index
 * stays active when it is in view; otherwise the last section activates.
 * `anchorRef` is any element inside the scroll container (the index itself);
 * `offset` is the fallback line when neither can be measured.
 */
export function useScrollSpy(ids: string[], anchorRef: React.RefObject<HTMLElement | null>, offset = 96): string {
  const [active, setActive] = useState(ids[0] ?? "");
  const key = ids.join("|");
  useEffect(() => {
    const list = key ? key.split("|") : [];
    const parent = scrollParent(anchorRef.current);
    const target: HTMLElement | Window = parent ?? window;
    let pending = false;
    let cachedMargin: number | null = null;
    const measure = () => {
      pending = false;
      const els = list.map((id) => document.getElementById(id));
      const parentRect = parent ? parent.getBoundingClientRect() : null;
      const viewTop = parentRect ? parentRect.top : 0;
      const viewBottom = parentRect ? parentRect.bottom : window.innerHeight;
      const anchor = anchorRef.current?.getBoundingClientRect();
      if (cachedMargin === null && els[0]) {
        cachedMargin = parseFloat(getComputedStyle(els[0]).scrollMarginTop) || 0;
      }
      const margin = cachedMargin ?? 0;
      // Reading line: below the pinned index, and never above where a clicked section lands (its scroll-margin).
      const pinned = anchor && anchor.bottom > viewTop && anchor.top < viewTop + 120 ? anchor.bottom : null;
      const line = Math.max(pinned ?? viewTop, viewTop + (margin || (pinned === null ? offset : 0))) + 8;
      let current = list[0] ?? "";
      els.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= line) current = list[i];
      });
      const scrolled = parent ? parent.scrollTop : window.scrollY;
      const atEnd = parent
        ? scrolled + parent.clientHeight >= parent.scrollHeight - 4
        : window.innerHeight + scrolled >= document.documentElement.scrollHeight - 4;
      // Bottom of the page: only once scrolled (a page that fits stays on its first section).
      if (atEnd && scrolled > 0 && list.length) {
        const req = requestedSection ? list.indexOf(requestedSection) : -1;
        const reqEl = req >= 0 ? els[req] : null;
        const reqTop = reqEl?.getBoundingClientRect().top ?? null;
        current = reqTop !== null && reqTop >= viewTop - 1 && reqTop < viewBottom ? list[req] : list[list.length - 1];
      } else if (!atEnd) {
        requestedSection = null;
      }
      setActive((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (pending) return;
      pending = true;
      // A timeout, not rAF: rAF is paused in hidden panes and background tabs.
      window.setTimeout(measure, 50);
    };
    measure();
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Sections grow as their data arrives; re-measure when the content resizes.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onScroll) : null;
    const content = parent?.firstElementChild ?? document.body;
    if (ro && content) ro.observe(content);
    return () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro?.disconnect();
    };
  }, [key, anchorRef, offset]);
  return active;
}

/**
 * Compact horizontal scroll-spy pill row under the page header (CLAUDE.md pill
 * tabs). Scrolls to a section on click. On mount it honours a `#section-id`
 * hash or a pending anchor stored in sessionStorage under `pendingKey`.
 */
export function SectionIndex({ items, label, pendingKey, right }: { items: SectionIndexItem[]; label: string; pendingKey?: string; right?: React.ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);
  const ids = items.map((i) => i.id);
  const active = useScrollSpy(ids, ref);
  const idsKey = ids.join("|");

  // Keep the active pill visible when the row scrolls horizontally (narrow widths); scrolls the row only, never the page.
  useEffect(() => {
    const nav = ref.current;
    if (!nav || nav.scrollWidth <= nav.clientWidth) return;
    const pill = nav.querySelector<HTMLElement>(".nav-pill.active");
    if (!pill) return;
    const left = pill.offsetLeft - nav.offsetLeft;
    if (left < nav.scrollLeft || left + pill.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollTo({ left: Math.max(0, left - 16), behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }, [active]);

  useEffect(() => {
    let wanted: string | null = null;
    try {
      if (pendingKey) {
        wanted = sessionStorage.getItem(pendingKey);
        if (wanted) sessionStorage.removeItem(pendingKey);
      }
    } catch {
      /* storage unavailable */
    }
    if (!wanted && typeof window !== "undefined" && window.location.hash) wanted = decodeURIComponent(window.location.hash.slice(1));
    if (wanted && idsKey.split("|").includes(wanted)) {
      const id = wanted;
      window.setTimeout(() => scrollToSection(id), 60);
    }
  }, [pendingKey, idsKey]);

  return (
    <nav ref={ref} className="pg-analysis-index" aria-label={label}>
      <ol className="nav-pill-group pg-analysis-index-list">
        {items.map((it) => {
          const tone = alertTone(it.tone);
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                className={`nav-pill ${active === it.id ? "active" : ""}`}
                aria-current={active === it.id ? "location" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(it.id);
                }}
              >
                {tone && <span className="ast-chip-dot" data-tone={tone} aria-hidden="true" />}
                {it.label}
              </a>
            </li>
          );
        })}
      </ol>
      {right && <div className="pg-analysis-index-right">{right}</div>}
    </nav>
  );
}

/**
 * One section = one card. Heading of 1–3 words; `question`, `index` and `ai`
 * are accepted for compatibility but not rendered (no subtitles, no badges).
 * Cards placed inside a Section render flush (never nested cards).
 */
export function Section({
  id,
  title,
  right,
  bare = false,
  children,
}: {
  id: string;
  index?: number;
  title: string;
  question?: React.ReactNode;
  ai?: string;
  right?: React.ReactNode;
  /** Heading on the workspace and no card surface: the body holds its own cards (TileGrid). */
  bare?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={bare ? "pg-analysis-section is-bare" : "ast-card pg-analysis-section"} aria-labelledby={`${id}-title`}>
      <header className="pg-analysis-section-head">
        <h3 id={`${id}-title`} className="pg-analysis-section-title">
          {title}
        </h3>
        {right && <div className="pg-analysis-section-right">{right}</div>}
      </header>
      <div className="pg-analysis-section-body">{children}</div>
    </section>
  );
}

/**
 * Confidence as a number with a thin neutral bar. `value` 0–100; `null`
 * means not validated (shown as "—").
 */
export function ConfidenceMeter({
  value,
  label = "Confidence",
  basis,
  compact = false,
}: {
  value: number | null;
  label?: string;
  basis?: string;
  compact?: boolean;
}) {
  const v = value === null || !Number.isFinite(value) ? null : Math.max(0, Math.min(100, value));
  return (
    <span
      className={`pg-analysis-conf ${compact ? "is-compact" : ""}`}
      title={basis ? `${label}: ${basis}` : label}
      aria-label={`${label} ${v === null ? "not yet checked" : `${Math.round(v)} %`}${basis ? ` (${basis})` : ""}`}
      role="img"
    >
      {!compact && <span className="pg-analysis-conf-label">{label}</span>}
      <span className="pg-analysis-conf-bar" aria-hidden="true">
        <i style={{ width: `${v ?? 0}%` }} />
      </span>
      <span className="pg-analysis-conf-val ast-num">{v === null ? "—" : `${Math.round(v)} %`}</span>
    </span>
  );
}

/** Quiet disclosure for the one explanation a section has. */
export function WhyDisclosure({ summary = "Details", children, open = false }: { summary?: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="pg-analysis-why" open={open}>
      <summary>
        <Chevron className="pg-analysis-why-chev" />
        {summary === "Why?" ? "Details" : summary}
      </summary>
      <div className="pg-analysis-why-body">{children}</div>
    </details>
  );
}

export interface ChainStep {
  id: string;
  step: string;
  name: string;
  meta?: string;
  tone: Tone;
  onClick?: () => void;
  /** Marks a step whose content lives on another page. */
  external?: boolean;
}

/** Compact chain of findings (anomaly → fault → cause → … → action); monochrome unless a step is in warning / alarm. */
export function CausalChain({ steps, label = "Finding chain" }: { steps: ChainStep[]; label?: string }) {
  return (
    <ol className="pg-analysis-chain" aria-label={label} style={{ "--chain-n": steps.length } as React.CSSProperties}>
      {steps.map((c) => {
        const t = alertTone(c.tone);
        return (
          <li key={c.id} className="pg-analysis-chain-step">
            <button type="button" className="pg-analysis-chain-node" data-tone={t} onClick={c.onClick} disabled={!c.onClick}>
              <span className="pg-analysis-chain-label">
                {t && <span className="ast-chip-dot" aria-hidden="true" />}
                {c.step}
                {c.external && <Chevron className="pg-analysis-chain-ext" />}
              </span>
              <span className="pg-analysis-chain-name" title={c.name}>
                {c.name}
              </span>
              {c.meta && (
                <span className="pg-analysis-chain-meta" title={c.meta}>
                  {c.meta}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Rendered pixel width of an element (ResizeObserver), for charts whose text must not scale. */
export function useElementWidth<T extends HTMLElement>(initial = 720): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(240, el.offsetWidth)); /* layout px; rects are zoomed on TV */
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
