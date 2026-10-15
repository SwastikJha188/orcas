"use client";

import { crossingsAt, windowFor, windowHours, type AnalysisPayload, type PrognosisData, type RulRow } from "./prognosis-derive";

type Priority = "Immediate" | "High" | "Medium" | "Low";

export interface Rec {
  id: string;
  title: string;
  component: string;
  priority: Priority;
  window: string;
  /** Hours by which the work should be done, when known (est.). */
  due: number | null;
  supports: string[];
  tags: string[];
}

const RANK: Record<Priority, number> = { Immediate: 0, High: 1, Medium: 2, Low: 3 };

/** Maintenance recommendations from findings' actions and RUL estimates needing attention. */
export function buildRecs(data: PrognosisData, analysis: AnalysisPayload | null, rows: RulRow[]): Rec[] {
  const crossTags = new Set(crossingsAt(data, "7d").map((x) => x.s.tag));
  const out: Rec[] = [];
  const covered = new Set<string>();
  for (const a of analysis?.actions ?? []) {
    if (a.id === "routine") continue;
    const comp = a.component.toLowerCase();
    const rul = rows.filter((r) => comp.includes(r.name.toLowerCase()));
    rul.forEach((r) => covered.add(r.id));
    const due = a.window === "Now" ? 0 : rul.length ? Math.min(...rul.map((r) => r.hours)) : windowHours(a.window);
    const tags = [...new Set(analysis?.sources.find((s) => s.id === a.id)?.evidence.map((e) => e.tag) ?? [])];
    const supports = [
      ...(rul.length ? ["RUL"] : []),
      ...(data.risks.some((r) => r.id === a.id) ? ["Risk"] : []),
      ...(tags.some((t) => crossTags.has(t)) ? ["Forecast"] : []),
    ];
    out.push({ id: a.id, title: a.title, component: a.component, priority: a.priority, window: a.window, due, supports: supports.length ? supports : ["Finding"], tags });
  }
  for (const r of rows) {
    if (r.status === "Normal" || covered.has(r.id)) continue;
    out.push({
      id: `rul-${r.id}`,
      title: `Inspect ${r.name}`,
      component: r.name,
      priority: r.status === "Critical" ? "High" : "Medium",
      window: windowFor(r.hours),
      due: r.hours,
      supports: ["RUL"],
      tags: r.tags,
    });
  }
  return out.sort((a, b) => (a.due ?? Infinity) - (b.due ?? Infinity) || RANK[a.priority] - RANK[b.priority]);
}

