"use client";

import React, { useMemo, useState } from "react";
import { PillNav, Table, type Column } from "@/components/ui";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useHealthBands } from "@/lib/reference-data";
import { defsFor } from "@/lib/live-defs";
import type { AssetMachine } from "../assets-data";
import { KpiStrip, PageHeader, Section, type KpiItem } from "../analysis/an-ui";
import { focusLayer, focusSensorOn } from "../sensor-focus";
import { FailureChance, FAILURE_CHANCE_HEADER } from "../prognosis/prog-chance";
import { reachesAlarm, SignalForecastTable, signalForecastRows, type SignalForecastRow } from "../prognosis/prog-signals";
import { crossingsAt, durationText, failureChance, FAILURE_HORIZONS, healthStatus, rangeText, rulRows, type RulRow } from "../prognosis/prognosis-derive";
import { toneFor } from "../prognosis/prog-ui";
import { useLineInsights } from "./line-insights";
import "../analysis/analysis-page.css";
import "../prognosis/prognosis-page.css";

/* ==========================================================================
   Full line · Prognosis — "what will happen on the line next".
     KPIs        next repair anywhere · highest chance of failure ·
                 sensors reaching alarm in 7 d · lowest health in 30 d
     Time left   every part with an estimate, soonest first, with its machine
     Forecasts   every machine's sensor forecasts; the ones reaching their
                 alarm limit on top, with an alarm-only filter
   Rows open the machine's own Prognosis.
   ========================================================================== */

interface LifeRow {
  key: string;
  machine: AssetMachine;
  r: RulRow;
}

const alert = (t: ReturnType<typeof toneFor>) => (t === "warn" || t === "bad" ? t : undefined);

export function LinePrognosis({ units, names }: { units: AssetMachine[]; names: Record<string, string> }) {
  const { navigateToMachine } = useIndustrialData();
  const ins = useLineInsights(units);
  const bands = useHealthBands(units[0]?.healthModelId ?? null);
  const [view, setView] = useState<"all" | "alarm">("all");

  const { life, untimed, forecasts, tagMachine, kpis } = useMemo(() => {
    const life: LifeRow[] = [];
    let untimed = 0;
    const forecasts: SignalForecastRow[] = [];
    const tagMachine = new Map<string, AssetMachine>();
    let alarms: { name: string; hours: number; machine: AssetMachine }[] = [];
    let lowest: { value: number; day: number; machine: AssetMachine } | null = null;
    for (const m of units) {
      const d = ins.byMachine[m.id];
      if (!d) continue;
      for (const r of rulRows(d.prognosis, d.analysis)) {
        if (r.hours !== null && r.band) life.push({ key: `${m.id}/${r.id}`, machine: m, r });
        else untimed += 1;
      }
      for (const f of signalForecastRows(d.prognosis, defsFor(m.id))) {
        const short = names[m.id] ?? m.name;
        forecasts.push({ ...f, where: f.where ? `${short} · ${f.where}` : short });
        tagMachine.set(f.tag, m);
      }
      alarms = alarms.concat(
        crossingsAt(d.prognosis, "7d")
          .filter((x) => x.c.level === "alarm")
          .map((x) => ({ name: x.s.name, hours: x.c.hours, machine: m })),
      );
      const pts = d.prognosis.condition.points;
      const at30 = pts.find((p) => p.day >= 30) ?? pts[pts.length - 1];
      if (at30 && (!lowest || at30.overall < lowest.value)) lowest = { value: at30.overall, day: at30.day, machine: m };
    }
    life.sort((a, b) => (a.r.hours ?? 0) - (b.r.hours ?? 0));
    alarms.sort((a, b) => a.hours - b.hours);

    const next = life[0] ?? null;
    const worst = life.length ? FAILURE_HORIZONS.map((h) => Math.max(...life.map((x) => failureChance(x.r.band!, h.hours)))) : null;
    const chanceLabel = `Chance of failure in ${FAILURE_HORIZONS.map((h) => h.label).join(" · ")}`;
    const lowStatus = lowest ? healthStatus(lowest.value, bands) : null;
    const kpis: KpiItem[] = [
      next
        ? {
            label: "Next repair needed in",
            value: durationText(next.r.hours!),
            text: true,
            foot: `${next.r.name} on ${names[next.machine.id] ?? next.machine.name}, likely ${rangeText(next.r.band!.lo, next.r.band!.hi)}`,
            tone: alert(toneFor(next.r.status)),
          }
        : { label: "Next repair needed in", value: "—", text: true, foot: "No reading on the line is heading toward a limit" },
      worst
        ? {
            label: chanceLabel,
            value: worst.join(" · "),
            unit: "%",
            text: true,
            foot: "Highest of any part on the line, for each period",
            tone: worst[0] >= 50 ? "bad" : worst[1] >= 50 ? "warn" : undefined,
          }
        : { label: chanceLabel, value: "—", text: true, foot: "No reading is heading toward a limit" },
      {
        label: "Sensors to reach alarm in 7 d",
        value: String(alarms.length),
        unit: "sensors",
        foot: alarms[0] ? `First: ${alarms[0].name} on ${names[alarms[0].machine.id] ?? alarms[0].machine.name}, ${alarms[0].hours === 0 ? "already there" : `in ${durationText(alarms[0].hours)}`}` : "None expected",
        tone: alarms.length ? "bad" : undefined,
      },
      lowest
        ? {
            label: `Lowest health in ${lowest.day} days`,
            value: String(Math.round(lowest.value)),
            unit: "/100",
            bar: lowest.value,
            foot: names[lowest.machine.id] ?? lowest.machine.name,
            tone: lowStatus === null ? undefined : alert(toneFor(lowStatus)),
          }
        : { label: "Lowest health in 30 days", value: "—", foot: "No forecast available" },
    ];
    return { life, untimed, forecasts, tagMachine, kpis };
  }, [units, ins.byMachine, bands, names]);

  const alarmRows = forecasts.filter(reachesAlarm);

  const openLife = (x: LifeRow) => {
    focusLayer({ ruleId: null, component: x.r.name, section: "prog-life" });
    navigateToMachine(x.machine.id, "prognosis");
  };
  const openTrend = (tag: string) => {
    const m = tagMachine.get(tag);
    if (!m) return;
    focusSensorOn("trends", tag);
    navigateToMachine(m.id, "trends");
  };

  const lifeCols: Column<LifeRow>[] = [
    {
      key: "part",
      header: "Part",
      render: (x) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">{x.r.name}</span>
          <span className="ast-cell-sub">{names[x.machine.id] ?? x.machine.name}</span>
        </span>
      ),
    },
    {
      key: "left",
      header: "Time left before repair",
      width: "220px",
      render: (x) => (
        <span className="ast-cell-stack ast-num">
          <span>{durationText(x.r.hours!)}</span>
          <span className="ast-cell-sub">likely {rangeText(x.r.band!.lo, x.r.band!.hi)}</span>
        </span>
      ),
    },
    {
      key: "chance",
      header: FAILURE_CHANCE_HEADER,
      width: "220px",
      render: (x) => <FailureChance band={x.r.band} name={x.r.name} />,
    },
    { key: "status", header: "Status", width: "110px", render: (x) => <StatusTag tone={toneFor(x.r.status)} label={x.r.status} /> },
  ];

  const loadingText = ins.loading === units.length ? "Loading the forecasts…" : null;

  return (
    <div className="ast-root pg-frame pg-prog" aria-label="Full line prognosis">
      {ins.readers}
      <PageHeader
        title="Prognosis"
        meta={[
          { label: "Machines", value: String(units.length) },
          ...(ins.loading ? [{ label: "Forecasts", value: `${units.length - ins.loading} of ${units.length} loaded` }] : []),
        ]}
      />

      {loadingText ? (
        <section className="ast-card">
          <p className="pg-analysis-empty">{loadingText}</p>
        </section>
      ) : (
        <>
          <KpiStrip page items={kpis} label="Full line forecast summary" />

          <Section id="prog-life" title="Time left before repair">
            {life.length ? (
              <Table className="pg-dx-subs" columns={lifeCols} data={life} keyExtractor={(x) => x.key} onRowClick={openLife} />
            ) : (
              <p className="pg-analysis-empty">No part on the line has a reading heading toward a limit.</p>
            )}
            {untimed > 0 && (
              <p className="pg-table-rest">
                {untimed === 1 ? "1 other part has" : `${untimed} other parts have`} no reading heading toward a limit, so no time to repair.
              </p>
            )}
          </Section>

          {forecasts.length > 0 && (
            <Section
              id="prog-forecast"
              title="Sensor reading forecasts"
              right={
                <PillNav
                  ariaLabel="Show sensors"
                  activeId={view}
                  onChange={setView}
                  items={[
                    { id: "all", label: "All", suffix: <span className="pg-sf-count">{forecasts.length}</span> },
                    {
                      id: "alarm",
                      label: "Reaching alarm",
                      prefix: alarmRows.length ? <span className="ast-chip-dot" data-tone="bad" aria-hidden="true" /> : undefined,
                      suffix: <span className="pg-sf-count">{alarmRows.length}</span>,
                    },
                  ]}
                />
              }
            >
              {view === "alarm" && alarmRows.length === 0 ? (
                <p className="pg-analysis-empty">No sensor reading on the line reaches its alarm limit in the next 30 days.</p>
              ) : (
                <SignalForecastTable rows={view === "alarm" ? alarmRows : forecasts} onOpenTrend={openTrend} />
              )}
            </Section>
          )}
        </>
      )}
    </div>
  );
}
