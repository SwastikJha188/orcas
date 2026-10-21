"use client";

import React, { useMemo } from "react";
import { PillNav, Table, type Column, Loading } from "@/components/ui";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { defsFor } from "@/lib/live-defs";
import { formatDuration } from "@shared/lib/kiln-sim/engine";
import type { AssetMachine } from "../assets-data";
import { Chevron, KpiStrip, PageHeader, Section, type KpiItem } from "../analysis/an-ui";
import { buildIssues, deviationOrder, unexplained, type Issue } from "../analysis/an-issues";
import { focusLayer, focusSensorOn } from "../sensor-focus";
import { failureChance, FAILURE_HORIZONS, rulRows } from "../prognosis/prognosis-derive";
import { toneFor } from "../prognosis/prog-ui";
import { useLineInsights } from "./line-insights";
import { useLineMachines } from "./line-model";
import "../analysis/analysis-page.css";
import "../prognosis/prognosis-page.css";
import { useLivePlantStarting } from "@/providers/kiln-simulation-context";

/* ==========================================================================
   Full line · Analysis — "why is it happening, and where on the line".
     KPIs      problems now · parts that may fail in 6 months · where it
               started · unusual readings with no known cause
     Problems  every machine's issues in one list: problems happening now
               (rule-library order), then parts predicted to fail; a row
               opens that issue on the machine's own Analysis page
     Unusual   readings off expected that no known problem explains
   ========================================================================== */

interface LineIssue {
  key: string;
  machine: AssetMachine;
  issue: Issue;
}

interface UnknownRow {
  key: string;
  machine: AssetMachine;
  tag: string;
  name: string;
  where: string;
}

type View = "all" | "fault" | "predicted";

const SIX_MONTHS = FAILURE_HORIZONS[FAILURE_HORIZONS.length - 1].hours;

export function LineAnalysis({ units, names }: { units: AssetMachine[]; names: Record<string, string> }) {
  const { navigateToMachine } = useIndustrialData();
  const machines = useLineMachines(units);
  const ins = useLineInsights(units);
  const [view, setView] = React.useState<View>("all");

  const { issues, unknown, first } = useMemo(() => {
    const issues: LineIssue[] = [];
    const unknown: UnknownRow[] = [];
    let first: { name: string; minutesAgo: number; tags: string[]; machine: AssetMachine } | null = null;
    for (const lm of machines) {
      const d = ins.byMachine[lm.m.id];
      const rul = d ? rulRows(d.prognosis, d.analysis) : [];
      const defs = lm.frame?.defs ?? defsFor(lm.m.id);
      for (const issue of buildIssues(lm.frame, rul, defs)) issues.push({ key: `${lm.m.id}/${issue.key}`, machine: lm.m, issue });
      if (lm.frame) {
        for (const u of unexplained(lm.frame)) {
          unknown.push({ key: `${lm.m.id}/${u.tag}`, machine: lm.m, tag: u.tag, name: u.name, where: u.sub });
        }
        // The line's first deviation: the one that has been going on longest.
        const c = deviationOrder(lm.frame).reduce<ReturnType<typeof deviationOrder>[number] | null>((a, n) => (!a || n.minutesAgo > a.minutesAgo ? n : a), null);
        if (c && (!first || c.minutesAgo > first.minutesAgo)) first = { name: c.name, minutesAgo: c.minutesAgo, tags: c.tags, machine: lm.m };
      }
    }
    // Problems now first (machine by machine), then predicted failures, soonest first.
    const faults = issues.filter((x) => x.issue.kind === "fault");
    const predicted = issues
      .filter((x) => x.issue.kind === "predicted")
      .sort((a, b) => (a.issue.life[0]?.hours ?? Infinity) - (b.issue.life[0]?.hours ?? Infinity));
    return { issues: [...faults, ...predicted], unknown, first };
  }, [machines, ins.byMachine]);

  const faults = issues.filter((x) => x.issue.kind === "fault");
  const predicted = issues.filter((x) => x.issue.kind === "predicted");
  const confirming = faults.filter((x) => x.issue.rule?.status === "PENDING").length;
  const live = machines.some((lm) => lm.frame);
  const shown = view === "all" ? issues : issues.filter((x) => x.issue.kind === view);

  const starting = useLivePlantStarting();
  const kpis: KpiItem[] = [
    {
      label: "Problems now",
      loading: starting && !live,
      value: live ? String(faults.length) : "—",
      foot: live ? `${faults.length - confirming} confirmed · ${confirming} being checked` : "No live data for this line",
      tone:
        faults.length - confirming > 0
          ? faults.some((x) => x.issue.rule?.status !== "PENDING" && x.issue.rule?.severity === "Critical")
            ? "bad"
            : "warn"
          : undefined,
    },
    {
      label: "Parts that may fail in 6 months",
      // Forecasts arrive per machine; until the first one, the count waits.
      loading: ins.loading === units.length,
      value: String(predicted.length),
      unit: "parts",
      foot: predicted[0] ? `First: ${predicted[0].issue.where} on ${names[predicted[0].machine.id] ?? predicted[0].machine.name}` : "None apart from the problems now",
      tone: predicted.length ? "warn" : undefined,
    },
    {
      label: "Where it started",
      value: first ? first.name : "None",
      text: true,
      foot: first
        ? `${names[first.machine.id] ?? first.machine.name} · ${first.minutesAgo > 0 ? `${formatDuration(first.minutesAgo)} ago` : "just now"}`
        : "Every sensor on the line reads as expected",
    },
    {
      label: "Unusual readings, cause unknown",
      loading: starting && !live,
      value: live ? String(unknown.length) : "—",
      unit: "sensors",
      foot: "Off expected, and no known problem explains them",
      tone: unknown.length ? "warn" : undefined,
    },
  ];

  const openIssue = (x: LineIssue) => {
    focusLayer({ ruleId: x.issue.rule?.id ?? null, component: x.issue.where, section: "an-diagnosis" });
    navigateToMachine(x.machine.id, "analysis");
  };
  const openTrend = (r: UnknownRow) => {
    focusSensorOn("trends", r.tag);
    navigateToMachine(r.machine.id, "trends");
  };

  const issueCols: Column<LineIssue>[] = [
    {
      key: "problem",
      header: "Problem",
      render: (x) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">{x.issue.kind === "fault" ? x.issue.title : `${x.issue.title} may fail`}</span>
          <span className="ast-cell-sub">{x.issue.where}</span>
        </span>
      ),
    },
    { key: "machine", header: "Machine", width: "160px", render: (x) => <span className="ast-cell-text">{names[x.machine.id] ?? x.machine.name}</span> },
    {
      key: "state",
      header: "Status",
      width: "240px",
      render: (x) =>
        x.issue.kind === "fault" && x.issue.rule ? (
          x.issue.rule.status === "PENDING" ? (
            <StatusTag tone="idle" label="Being checked" />
          ) : (
            <StatusTag tone={toneFor(x.issue.rule.severity)} label={x.issue.rule.severity} />
          )
        ) : x.issue.life[0]?.band ? (
          <span className="ast-cell-text" title="Share of the part's estimated remaining life that ends within 6 months">
            {failureChance(x.issue.life[0].band, SIX_MONTHS)} % chance within 6 months
          </span>
        ) : (
          <span className="ast-muted">—</span>
        ),
    },
    {
      key: "open",
      header: "",
      width: "40px",
      render: () => (
        <span className="pg-chev" aria-hidden="true">
          <Chevron />
        </span>
      ),
    },
  ];

  const unknownCols: Column<UnknownRow>[] = [
    {
      key: "sensor",
      header: "Sensor",
      render: (r) => (
        <span className="ast-cell-stack">
          <button type="button" className="ast-cell-title pg-dx-tag" onClick={() => openTrend(r)} title={`Open the trend chart of this sensor (tag ${r.tag})`}>
            {r.name} <span aria-hidden="true">↗</span>
          </button>
          {r.where && <span className="ast-cell-sub">{r.where}</span>}
        </span>
      ),
    },
    { key: "machine", header: "Machine", width: "160px", render: (r) => <span className="ast-cell-text">{names[r.machine.id] ?? r.machine.name}</span> },
  ];

  return (
    <div className="ast-root pg-frame pg-analysis" aria-label="Full line analysis">
      {ins.readers}
      <PageHeader title="Analysis" meta={[{ label: "Machines", value: String(units.length) }]} />

      <KpiStrip page items={kpis} label="Full line analysis summary" />

      <Section
        id="an-issues"
        title="Problems on the line"
        right={
          <PillNav
            ariaLabel="Show problems"
            activeId={view}
            onChange={setView}
            items={[
              { id: "all", label: "All", suffix: <span className="pg-sf-count">{issues.length}</span> },
              { id: "fault", label: "Happening now", suffix: <span className="pg-sf-count">{faults.length}</span> },
              { id: "predicted", label: "May fail", suffix: <span className="pg-sf-count">{predicted.length}</span> },
            ]}
          />
        }
      >
        {shown.length ? (
          <Table className="pg-dx-subs pg-an-line" columns={issueCols} data={shown} keyExtractor={(x) => x.key} onRowClick={openIssue} />
        ) : ins.loading && view !== "fault" ? (
          <Loading label="Loading the forecasts…" rows={5} />
        ) : (
          <p className="pg-analysis-empty">
            {view === "fault" ? "No problem is happening on the line now." : "No problem found on the line."}
          </p>
        )}
      </Section>

      {unknown.length > 0 && (
        <Section id="an-unknown" title="Unusual readings, cause unknown">
          <Table className="pg-dx-subs" columns={unknownCols} data={unknown} keyExtractor={(r) => r.key} />
        </Section>
      )}
    </div>
  );
}
