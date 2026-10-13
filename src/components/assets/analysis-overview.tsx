"use client";

import React from "react";
import { TONE } from "./insights-ui";
import type {
  DegradationItem,
  InsightsResponse,
  MaintenanceAction,
  Severity,
} from "@/server/services/insights-service";
import "./analysis/overview.css";

type AnalysisData = InsightsResponse["analysis"];

export type AnalysisPage = "overview" | "source" | "fault" | "degradation" | "maintenance" | "xai";

type Priority = MaintenanceAction["priority"];

const PRIORITIES: Priority[] = ["Immediate", "High", "Medium", "Low"];

const PRIORITY_TONE: Record<Priority, string> = {
  Immediate: "var(--status-danger)",
  High: "var(--status-warning)",
  Medium: "var(--signal-blue)",
  Low: "var(--status-success)",
};

/** Highest stage index on the 0–5 wear scale (0 = as-new, 5 = failure). */
const STAGE_MAX = 5;

function stageTone(stageIndex: number): string {
  return stageIndex >= 4 ? TONE.Critical : stageIndex >= 3 ? TONE.Advisory : TONE.Normal;
}

const pct = (v: number) => Math.round(v);

/* ------------------------------------------------------------------ */
/* Monoline icons (16px, currentColor)                                */
/* ------------------------------------------------------------------ */

const ICON_PATHS: Record<Exclude<AnalysisPage, "overview">, React.ReactNode> = {
  source: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15" />
    </>
  ),
  fault: <path d="M1 8h3l1.5-4 3 8 2-6 1.5 2H15" />,
  degradation: <path d="M1.5 3.5h3v3h3v3h3v3h4" />,
  maintenance: (
    <path d="M10.2 2.2a3.2 3.2 0 0 0-3.9 4.3L2 10.8a1.3 1.3 0 0 0 1.8 1.8l4.3-4.3a3.2 3.2 0 0 0 4.3-3.9l-2 2-1.8-.4-.4-1.8z" />
  ),
  xai: (
    <>
      <circle cx="8" cy="3" r="1.6" />
      <circle cx="3.5" cy="12.5" r="1.6" />
      <circle cx="12.5" cy="12.5" r="1.6" />
      <path d="M7.1 4.3 4.4 11.1M8.9 4.3l2.7 6.8M5.1 12.5h5.8" />
    </>
  ),
};

function ModuleIcon({ id }: { id: Exclude<AnalysisPage, "overview"> }) {
  return (
    <span className="ano-icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        {ICON_PATHS[id]}
      </svg>
    </span>
  );
}

function Chevron() {
  return (
    <svg className="ano-chevron" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="ano-dot" style={{ background: color }} aria-hidden="true" />;
}

/* ------------------------------------------------------------------ */
/* Micro visuals                                                      */
/* ------------------------------------------------------------------ */

/** Ranked horizontal bar rows: label · bar · value. Values are percentages (0–100). */
function RankedBars({ rows, label, empty = "No data" }: { rows: { id: string; name: string; value: number; color: string }[]; label: string; empty?: string }) {
  if (!rows.length) return <div className="ano-empty">{empty}</div>;
  return (
    <div className="ano-bars" role="img" aria-label={label}>
      {rows.map((r) => (
        <div key={r.id} className="ano-bar-row">
          <span className="ano-bar-name">{r.name}</span>
          <svg className="ano-bar" width="100%" height="6" aria-hidden="true">
            <title>{`${r.name}: ${pct(r.value)} %`}</title>
            <rect className="ano-track" x="0" y="1" width="100%" height="4" rx="2" />
            <rect x="0" y="1" width={`${Math.max(2, Math.min(100, r.value))}%`} height="4" rx="2" fill={r.color} />
          </svg>
          <span className="ano-bar-val">
            {pct(r.value)}
            <small>%</small>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Five-segment wear strip — segments 1…stageIndex filled in the item's state colour. */
function StageStrip({ stageIndex, color }: { stageIndex: number; color: string }) {
  return (
    <svg className="ano-stage" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
      {Array.from({ length: STAGE_MAX }).map((_, i) => (
        <rect
          key={i}
          x={i * 20.4}
          y="0"
          width="18.4"
          height="6"
          rx="1"
          className={i < stageIndex ? undefined : "ano-track"}
          fill={i < stageIndex ? color : undefined}
        />
      ))}
    </svg>
  );
}

function DegradationRows({ items }: { items: DegradationItem[] }) {
  if (!items.length) return <div className="ano-empty">No data</div>;
  return (
    <div
      className="ano-bars"
      role="img"
      aria-label={`Wear stage by assembly: ${items.map((d) => `${d.name} stage ${d.stageIndex} of ${STAGE_MAX}`).join(", ")}`}
    >
      {items.map((d) => (
        <div key={d.id} className="ano-bar-row">
          <span className="ano-bar-name">{d.name}</span>
          <StageStrip stageIndex={d.stageIndex} color={stageTone(d.stageIndex)} />
          <span className="ano-bar-val">
            {d.stageIndex}
            <small>/{STAGE_MAX}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function PriorityDots({ actions }: { actions: MaintenanceAction[] }) {
  const counts = PRIORITIES.map((p) => ({ p, n: actions.filter((a) => a.priority === p).length }));
  return (
    <div
      className="ano-bars"
      role="img"
      aria-label={`Actions by priority: ${counts.map((c) => `${c.p} ${c.n}`).join(", ")}`}
    >
      {counts.map(({ p, n }) => (
        <div key={p} className="ano-bar-row">
          <span className="ano-bar-name">{p}</span>
          <span className="ano-dots" aria-hidden="true">
            {n === 0 ? (
              <i className="ano-dots-empty" />
            ) : (
              Array.from({ length: Math.min(n, 8) }).map((_, i) => <i key={i} style={{ background: PRIORITY_TONE[p] }} />)
            )}
          </span>
          <span className={`ano-bar-val ${n === 0 ? "is-zero" : ""}`}>{n}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                           */
/* ------------------------------------------------------------------ */

interface ModuleTile {
  id: Exclude<AnalysisPage, "overview">;
  title: string;
  value: string;
  unit: string;
  qualifier: string;
  visual: React.ReactNode;
}

export function AnalysisOverview({
  data,
  onOpen,
}: {
  data: AnalysisData;
  onOpen: (page: AnalysisPage) => void;
  onBack?: () => void;
}) {
  const topSource = data.sources[0];
  const topFault = data.faults[0];
  const wear = [...data.degradation.items].sort((a, b) => b.stageIndex - a.stageIndex || a.health - b.health);
  const worst = wear[0];
  const progressing = data.degradation.items.filter((d) => d.trend === "falling").length;
  const actions = [...data.actions].sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));
  const topAction = actions[0];
  const featureTotal = data.features.reduce((s, f) => s + f.weight, 0) || 1;
  const features = [...data.features].sort((a, b) => b.weight - a.weight);
  const topFeatureShare = features[0] ? (features[0].weight / featureTotal) * 100 : 0;
  const sevTone = (s: Severity | undefined) => (s ? TONE[s] : TONE.Normal);
  // Placeholder rows the builders add when nothing is wrong.
  const realSource = topSource && topSource.severity !== "Normal" && topSource.id !== "src-baseline" ? topSource : null;
  const realFault = topFault && topFault.id !== "nominal" ? topFault : null;
  const openActions = actions.filter((a) => a.id !== "routine");
  const hasDecision = Boolean(realFault || realSource);

  const modules: ModuleTile[] = [
    {
      id: "source",
      title: "Issue source",
      // Confidence in the leading cause; its share is 100 % whenever it is the only one.
      value: realSource ? `${pct(realSource.confidence)}` : "None",
      unit: realSource ? "%" : "",
      qualifier: realSource ? `confidence · ${realSource.subsystem}` : "no active cause",
      visual: (
        <RankedBars
          label={`Contribution by source: ${data.sources.slice(0, 3).map((s) => `${s.cause} ${pct(s.contribution)} %`).join(", ")}`}
          rows={(realSource ? data.sources.slice(0, 3) : []).map((s) => ({ id: s.id, name: s.cause, value: s.contribution, color: TONE[s.severity] }))}
          empty="Every signal follows the reference model"
        />
      ),
    },
    {
      id: "fault",
      title: "Fault diagnosis",
      value: realFault ? `${pct(realFault.probability)}` : "None",
      unit: realFault ? "%" : "",
      qualifier: realFault ? "most likely fault" : "no fault pattern",
      visual: (
        <RankedBars
          label={`Fault probability: ${data.faults.slice(0, 3).map((f) => `${f.label} ${pct(f.probability)} %`).join(", ")}`}
          rows={data.faults.filter((f) => f.id !== "nominal").slice(0, 3).map((f) => ({ id: f.id, name: f.label, value: f.probability, color: TONE[f.severity] }))}
          empty="No fault pattern above threshold"
        />
      ),
    },
    {
      id: "degradation",
      title: "Degradation",
      value: `${progressing}`,
      unit: `/${data.degradation.items.length}`,
      qualifier: "components wearing",
      visual: <DegradationRows items={wear.slice(0, 3)} />,
    },
    {
      id: "maintenance",
      title: "Maintenance",
      value: String(openActions.length),
      unit: openActions.length === 1 ? "action" : "actions",
      qualifier: openActions[0] ? `${openActions[0].priority} · ${openActions[0].window}` : "routine monitoring only",
      visual: <PriorityDots actions={openActions} />,
    },
    {
      id: "xai",
      title: "Explainable AI",
      // Only meaningful when there is a finding to explain; otherwise it would rank noise.
      value: hasDecision && features[0] ? `${pct(topFeatureShare)}` : "—",
      unit: hasDecision && features[0] ? "%" : "",
      qualifier: hasDecision && features[0] ? `from ${features[0].tag}` : "no finding to explain",
      visual: (
        <RankedBars
          label={`Feature attribution share: ${features.slice(0, 3).map((f) => `${f.tag} ${pct((f.weight / featureTotal) * 100)} %`).join(", ")}`}
          rows={(hasDecision ? features.slice(0, 3) : []).map((f) => ({ id: f.id, name: f.tag, value: (f.weight / featureTotal) * 100, color: "var(--signal-blue)" }))}
          empty="Nothing to explain while the plant is healthy"
        />
      ),
    },
  ];

  const chain: { key: string; label: string; name: string; meta: string; tone: string }[] = [
    {
      key: "cause",
      label: "Cause",
      name: topSource?.cause ?? "—",
      meta: topSource ? `${topSource.subsystem} · ${pct(topSource.contribution)} %` : "",
      tone: sevTone(topSource?.severity),
    },
    {
      key: "fault",
      label: "Fault",
      name: topFault?.label ?? "—",
      meta: topFault ? `${pct(topFault.probability)} % · ${topFault.band}` : "",
      tone: sevTone(topFault?.severity),
    },
    {
      key: "degradation",
      label: "Degradation",
      name: worst?.name ?? "—",
      meta: worst ? `Stage ${worst.stageIndex}/${STAGE_MAX} · ${pct(worst.health)} % health` : "",
      tone: worst ? stageTone(worst.stageIndex) : TONE.Normal,
    },
    {
      key: "action",
      label: "Action",
      name: topAction?.title ?? "Routine monitoring",
      meta: topAction ? `${topAction.priority} · ${topAction.window}` : "",
      tone: topAction ? PRIORITY_TONE[topAction.priority] : TONE.Normal,
    },
  ];

  return (
    <div className="ano-root">
      <section className="ano-grid" aria-label="Analysis modules">
        {modules.map((m) => (
          <button
            key={m.id}
            type="button"
            className="ano-card"
            onClick={() => onOpen(m.id)}
            aria-label={`Open ${m.title}: ${m.value}${m.unit ? ` ${m.unit}` : ""} ${m.qualifier}`.trim()}
          >
            <span className="ano-card-head">
              <ModuleIcon id={m.id} />
              <Chevron />
            </span>
            <span className="ano-card-visual">{m.visual}</span>
            <span className="ano-card-foot">
              <span className="ano-card-value">
                {m.value}
                {m.unit && <small>{m.unit}</small>}
                {m.qualifier && <em>{m.qualifier}</em>}
              </span>
              <span className="ano-card-title">{m.title}</span>
            </span>
          </button>
        ))}
      </section>

      <section className="ano-chain" aria-label="Linked finding chain">
        <ol className="ano-chain-list">
          {chain.map((c, i) => (
            <li key={c.key} className="ano-chain-node">
              {i > 0 && (
                <svg className="ano-chain-link" viewBox="0 0 24 10" width="24" height="10" fill="none" aria-hidden="true">
                  <path d="M0 5h21M18 2l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span className="ano-chain-body">
                <span className="ano-chain-label">
                  <Dot color={c.tone} />
                  {c.label}
                </span>
                <span className="ano-chain-name" title={c.name}>{c.name}</span>
                {c.meta && <span className="ano-chain-meta">{c.meta}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
