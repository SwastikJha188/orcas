"use client";

import { crossingsAt, failureChance, FAILURE_HORIZONS, windowFor, windowHours, type AnalysisPayload, type PrognosisData, type RulRow } from "./prognosis-derive";
import { priorityRank } from "../analysis/an-ui";
import type { WorkOrderPriorityDto } from "@shared/types/monitoring";

export interface Rec {
  id: string;
  title: string;
  component: string;
  /** Work-order priority name (DB order ranks it; unknown names sort last). */
  priority: string;
  /** When it should be done; "" when there is no estimate. */
  window: string;
  /** Hours by which the work should be done, when known (est.). */
  due: number | null;
  supports: string[];
  tags: string[];
}

/** Maintenance recommendations from findings' actions and RUL estimates needing attention; ties on due time go most urgent priority first (DB order). */
export function buildRecs(data: PrognosisData, analysis: AnalysisPayload | null, rows: RulRow[], priorities: readonly WorkOrderPriorityDto[] | null): Rec[] {
  const rankOf = (p: string) => priorityRank(p, priorities);
  const crossTags = new Set(crossingsAt(data, "7d").map((x) => x.s.tag));
  const out: Rec[] = [];
  const covered = new Set<string>();
  for (const a of analysis?.actions ?? []) {
    if (a.id === "routine") continue;
    const comp = a.component.toLowerCase();
    const rul = rows.filter((r) => comp.includes(r.name.toLowerCase()));
    rul.forEach((r) => covered.add(r.id));
    // Earliest RUL among rows that have one; rows with no estimate are left out.
    const timed = rul.flatMap((r) => (r.hours === null ? [] : [r.hours]));
    const due = a.window === "Now" ? 0 : timed.length ? Math.min(...timed) : windowHours(a.window);
    const tags = [...new Set(analysis?.sources.find((s) => s.id === a.id)?.evidence.map((e) => e.tag) ?? [])];
    const supports = [
      ...(rul.length ? ["RUL"] : []),
      ...(data.risks.some((r) => r.id === a.id) ? ["Risk"] : []),
      ...(tags.some((t) => crossTags.has(t)) ? ["Forecast"] : []),
    ];
    out.push({ id: a.id, title: a.title, component: a.component, priority: a.priority, window: a.window, due, supports: supports.length ? supports : ["Finding"], tags });
  }
  const sixMonths = FAILURE_HORIZONS[FAILURE_HORIZONS.length - 1].hours;
  for (const r of rows) {
    if (covered.has(r.id)) continue;
    // A healthy part whose life makes failure more likely than not within 6 months: plan its replacement.
    if (r.status === "Normal" && r.life && r.band && r.hours !== null && failureChance(r.band, sixMonths) >= 50) {
      out.push({
        id: `life-${r.id}`,
        title: `Plan the replacement of ${r.name}`,
        component: r.name,
        priority: "Low",
        window: windowFor(r.band.lo),
        due: r.band.lo,
        supports: ["RUL"],
        tags: r.tags,
      });
      continue;
    }
    if (r.status === "Normal") continue;
    out.push({
      id: `rul-${r.id}`,
      title: `Send someone to inspect ${r.name}`,
      component: r.name,
      priority: r.status === "Critical" ? "High" : "Medium",
      window: r.hours === null ? "" : windowFor(r.hours),
      due: r.hours,
      supports: ["RUL"],
      tags: r.tags,
    });
  }
  return out.sort((a, b) => (a.due ?? Infinity) - (b.due ?? Infinity) || rankOf(a.priority) - rankOf(b.priority));
}

