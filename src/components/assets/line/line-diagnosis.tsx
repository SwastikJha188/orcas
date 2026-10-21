"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Table, type Column } from "@/components/ui";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { conditionTone, type Condition } from "@/components/ui/status";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useKilnOps } from "@/providers/kiln-ops-context";
import { useLivePlantStarting } from "@/providers/kiln-simulation-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { useHealthBands } from "@/lib/reference-data";
import { formatLocalTime } from "@/lib/time";
import { simTimeMs } from "@shared/lib/kiln-sim/engine";
import type { AssetMachine } from "../assets-data";
import { KpiStrip, PageHeader, Section, type KpiItem } from "../analysis/an-ui";
import { SensorDiagnosisTable } from "../diagnosis-sensor-table";
import { HealthBar } from "../diagnosis-subassemblies";
import { bandOf } from "../health-derive";
import { focusLayer, focusSensorOn } from "../sensor-focus";
import type { SensorRow } from "../diagnosis-rows";
import { type LineDiagnosisMachine, sum, useLineDiagnosis, useLineMachines } from "./line-model";
import "../diagnosis/overview-tab.css";
import "../analysis/analysis-page.css";
import "../prognosis/prognosis-page.css";
import "../diagnosis-page.css";

/* ==========================================================================
   Full line · Diagnosis — "what is wrong on the line now".
     KPIs      line health · problems found · not acknowledged · doubtful readings
     Machines  one row per machine (health, problems, sensors out of range);
               a row filters the sensor table, its name opens the machine
     Sensors   every machine's sensors in one table, in plant then definition
               order; only the ones in alarm unless asked for all
   Each number is the sum of the machines' own Diagnosis numbers.
   ========================================================================== */

export function LineDiagnosis({ units, names, health }: { units: AssetMachine[]; names: Record<string, string>; health: number | null }) {
  const { navigateToMachine } = useIndustrialData();
  const ops = useKilnOps();
  const machines = useLineDiagnosis(useLineMachines(units));
  const bands = useHealthBands(units[0]?.healthModelId ?? null);
  const tz = useSiteTimeZone({ machineId: units[0]?.id ?? null });
  const [machineFilter, setMachineFilter] = useState<string | null>(null);
  const [onlyAlarm, setOnlyAlarm] = useState(true);

  const fmtT = useCallback((t: number) => formatLocalTime(simTimeMs(t), { seconds: true, timeZone: tz.timeZone }), [tz.timeZone]);
  const fmtClock = useCallback((ms: number) => formatLocalTime(ms, { seconds: false, timeZone: tz.timeZone }), [tz.timeZone]);

  // Which machine each row and rule belongs to (rule ids and tags are per machine).
  const { rows, ofRow, ofRule } = useMemo(() => {
    const ofRow = new Map<SensorRow, LineDiagnosisMachine>();
    const ofRule = new Map<string, string>();
    for (const lm of machines) {
      for (const r of lm.rows) ofRow.set(r, lm);
      for (const rule of lm.frame?.rules ?? []) ofRule.set(rule.id, lm.m.id);
    }
    const rows = machines.filter((lm) => !machineFilter || lm.m.id === machineFilter).flatMap((lm) => lm.rows);
    return { rows, ofRow, ofRule };
  }, [machines, machineFilter]);
  const shown = onlyAlarm ? rows.filter((r) => r.inAlarm) : rows;
  const picked = machines.find((lm) => lm.m.id === machineFilter) ?? null;

  const machineOfRow = (r: SensorRow) => ofRow.get(r)?.m.id ?? null;
  const openTrend = (r: SensorRow) => {
    const id = machineOfRow(r);
    if (!id) return;
    focusSensorOn("trends", r.s.tag);
    navigateToMachine(id, "trends");
  };

  const live = machines.filter((lm) => lm.frame);
  const starting = useLivePlantStarting();
  const totalSensors = sum(machines, (lm) => lm.sensors.length);
  const active = sum(machines, (lm) => lm.totals.active);
  const critical = sum(machines, (lm) => lm.totals.critical);
  const unacked = sum(machines, (lm) => lm.totals.unacked);
  const invalid = sum(machines, (lm) => lm.totals.invalid);
  const below = bands ? machines.filter((lm) => lm.health !== null && lm.health < bands.advisory).length : null;
  const band = health === null ? null : bandOf(health, bands);

  // While the live plant is still starting, its numbers wait instead of reading "—".
  const waiting = starting && live.length === 0;
  const kpis: KpiItem[] = [
    {
      label: "Line health",
      loading: waiting && health === null,
      value: health === null ? "—" : String(health),
      unit: health === null ? undefined : "/100",
      bar: health ?? undefined,
      tone: band === "Critical" ? "bad" : band === "Alert" ? "warn" : undefined,
      foot: below === null ? `${machines.length} machines` : `${below} of ${machines.length} machines score below ${bands!.advisory}`,
    },
    {
      label: "Problems found",
      loading: waiting,
      value: live.length ? String(active) : "—",
      foot: live.length ? `${sum(machines, (lm) => lm.totals.confirming)} being confirmed` : "No live checks",
      tone: active ? (critical ? "bad" : "warn") : undefined,
    },
    {
      label: "Not acknowledged",
      loading: waiting,
      value: live.length ? String(unacked) : "—",
      foot: live.length
        ? `${sum(machines, (lm) => lm.totals.activeUnacked)} still on · ${sum(machines, (lm) => lm.totals.clearedUnacked)} back to normal`
        : "No live checks",
      tone: unacked ? (critical ? "bad" : "warn") : undefined,
    },
    {
      label: "Doubtful readings",
      loading: waiting,
      value: String(invalid),
      unit: `of ${totalSensors}`,
      foot: `${sum(machines, (lm) => lm.totals.stale)} not updating · ${sum(machines, (lm) => lm.totals.suspect)} may be wrong`,
      tone: invalid ? "bad" : undefined,
    },
  ];

  const machineCols: Column<LineDiagnosisMachine>[] = [
    {
      key: "machine",
      header: "Machine",
      width: "340px",
      render: (lm) => (
        <span className="ast-cell-stack">
          <button
            type="button"
            className="ast-cell-title pg-dx-tag"
            onClick={(e) => {
              e.stopPropagation();
              navigateToMachine(lm.m.id, "diagnosis");
            }}
            title={`Open the Diagnosis page of ${lm.m.name}`}
          >
            {lm.m.name} <span aria-hidden="true">↗</span>
          </button>
          <span className="ast-cell-sub ast-num">{lm.m.id}</span>
        </span>
      ),
    },
    {
      key: "health",
      header: "Health",
      render: (lm) =>
        lm.health !== null ? (
          <span className="pg-dx-health">
            <span className="ast-num pg-dx-health-num" data-tone={toneOf(bandOf(lm.health, bands))}>
              {lm.health}
            </span>
            <HealthBar value={lm.health} bands={bands} />
          </span>
        ) : (
          <span className="ast-muted">No score</span>
        ),
    },
    { key: "condition", header: "Condition", width: "120px", render: (lm) => <StatusTag tone={conditionTone(lm.condition)} label={lm.condition} /> },
    {
      key: "problems",
      header: "Problems found",
      width: "190px",
      render: (lm) =>
        lm.frame ? (
          <span className="ast-cell-stack">
            <span className="ast-num" data-alarm={lm.totals.active > 0 || undefined}>
              {lm.totals.active}
            </span>
            {lm.totals.unacked > 0 && <span className="ast-cell-sub">{lm.totals.unacked} not acknowledged</span>}
          </span>
        ) : (
          <span className="ast-muted">No live checks</span>
        ),
    },
    {
      key: "alarm",
      header: "Sensors out of range",
      width: "170px",
      render: (lm) => (
        <span className="ast-num" data-alarm={lm.inAlarm > 0 || undefined}>
          {lm.inAlarm} <span className="ast-muted">of {lm.sensors.length}</span>
        </span>
      ),
    },
  ];

  const tableRight = (
    <span className="pg-dx-filters">
      <span className="ast-num pg-diag-muted">
        {picked ? `${picked.sensors.length} sensors · ${picked.inAlarm} in alarm` : `${totalSensors} sensors · ${sum(machines, (lm) => lm.inAlarm)} in alarm`}
      </span>
      {picked && (
        <button type="button" className="dxo-filter-chip" onClick={() => setMachineFilter(null)} aria-label={`Show every machine, not only ${picked.m.name}`}>
          {names[picked.m.id] ?? picked.m.name} <span aria-hidden="true">×</span>
        </button>
      )}
      <button type="button" className="dxo-filter-chip" aria-pressed={onlyAlarm} onClick={() => setOnlyAlarm((v) => !v)}>
        Only in alarm
      </button>
    </span>
  );

  const condition: Condition = machines.some((lm) => lm.condition === "Critical")
    ? "Critical"
    : machines.some((lm) => lm.condition === "Alert")
      ? "Alert"
      : machines.length && machines.every((lm) => lm.condition === "No data")
        ? "No data"
        : "Normal";

  return (
    <div className="dxo-root ast-root pg-frame pg-diag" aria-label="Full line diagnosis">
      <PageHeader
        title="Diagnosis"
        status={{ label: condition, tone: conditionTone(condition) }}
        meta={[
          { label: "Machines", value: String(machines.length) },
          { label: "Checks running", value: String(sum(machines, (lm) => lm.frame?.rules.length ?? 0)), title: "Automatic checks (rules) watching the line" },
          { label: "Readings", value: "Every minute" },
        ]}
      />

      <KpiStrip page items={kpis} label="Full line diagnosis totals" />

      <Section id="dx-health" title="Machines">
        <Table
          className="pg-dx-subs"
          columns={machineCols}
          data={machines}
          keyExtractor={(lm) => lm.m.id}
          selectedKey={machineFilter ?? undefined}
          onRowClick={(lm) => setMachineFilter((id) => (id === lm.m.id ? null : lm.m.id))}
        />
      </Section>

      <Section id="dx-diagnosis" title="Sensors" right={tableRight}>
        {totalSensors === 0 ? (
          <p className="pg-diag-missing">No live sensor readings on this line yet.</p>
        ) : shown.length === 0 ? (
          <p className="pg-diag-missing">{onlyAlarm ? "No sensor on this line is in alarm." : "No sensor matches this filter."}</p>
        ) : (
          <SensorDiagnosisTable
            rows={shown}
            frame={null}
            frameOf={(r) => ofRow.get(r)?.frame ?? null}
            machineOf={(r) => {
              const m = ofRow.get(r)?.m;
              return m ? (names[m.id] ?? m.name) : null;
            }}
            rowKey={(r) => `${machineOfRow(r)}/${r.s.tag}`}
            hidePart={false}
            fmtT={fmtT}
            fmtClock={fmtClock}
            workOrders={null}
            onAcknowledge={(ruleId) => {
              const id = ofRule.get(ruleId);
              if (id) void ops.acknowledgeAlarm(id, ruleId);
            }}
            onOpenTrend={(tag) => {
              const r = shown.find((x) => x.s.tag === tag);
              if (r) openTrend(r);
            }}
            onWhy={(f, tag) => {
              const id = ofRule.get(f.ruleId);
              if (!id) return;
              focusLayer({ ruleId: f.ruleId, component: f.where, tag, section: "an-diagnosis" });
              navigateToMachine(id, "analysis");
            }}
          />
        )}
      </Section>
    </div>
  );
}

function toneOf(band: ReturnType<typeof bandOf>): "bad" | "warn" | undefined {
  return band === "Critical" ? "bad" : band === "Alert" ? "warn" : undefined;
}
