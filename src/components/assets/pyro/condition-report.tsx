"use client";

/**
 * Condition report for the pyro line (D4-OSW-PE-PYR Rev. 02 Table 11.1,
 * outputs: "monthly condition report"). Per machine over the report period:
 * health, time in each condition, confirmed findings, operator actions, data
 * availability and service-life advisories. Running totals come from
 * `src/lib/condition-report.ts`, fed every simulated minute.
 */

import React, { useMemo } from "react";
import { ACTION, PillButton, Table, type Column } from "@/components/ui";
import { conditionReport, type MachineReport } from "@shared/lib/condition-report";
import { formatDuration, simTimeMs } from "@shared/lib/kiln-sim/engine";
import { PYRO_MACHINES, PYRO_MACHINE_BY_ID } from "@shared/lib/pyro-sim/signals";
import { formatLocalTime } from "@/lib/time";
import { useKilnFleet, usePrimaryMachineId } from "@/providers/kiln-simulation-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";

const pct = (x: number) => `${(x * 100).toFixed(1)} %`;

export function ConditionReport() {
  const fleet = useKilnFleet();
  const primaryId = usePrimaryMachineId();
  const { timeZone } = useSiteTimeZone({ machineId: primaryId || null });
  const frames = Object.fromEntries(PYRO_MACHINES.map((m) => [m.id, fleet[m.id]?.frame ?? null]));
  const rows = conditionReport(
    PYRO_MACHINES.map((m) => m.id),
    frames,
  );
  const code = useMemo(() => Object.fromEntries(PYRO_MACHINES.map((m) => [m.id, m.code])), []);
  if (!rows.length) return null;

  const from = Math.min(...rows.map((r) => r.fromT));
  const to = Math.max(...rows.map((r) => r.toT));
  const when = (t: number) => formatLocalTime(simTimeMs(t), { date: true, seconds: false, timeZone });

  const cols: Column<MachineReport>[] = [
    {
      key: "m",
      header: "Machine",
      width: "120px",
      render: (r) => (
        <span className="ast-cell-title" title={code[r.machineId]}>
          {PYRO_MACHINE_BY_ID[r.machineId]?.shortName ?? code[r.machineId]}
        </span>
      ),
    },
    {
      key: "health",
      header: "Health start → now",
      width: "150px",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-num">
            {Math.round(r.healthStart)} → {Math.round(r.healthNow)}
          </span>
          <span className="ast-cell-sub ast-num">
            min {Math.round(r.healthMin)} · mean {Math.round(r.healthMean)}
          </span>
        </span>
      ),
    },
    {
      key: "time",
      header: "Time in condition",
      width: "170px",
      render: (r) => (
        <span className="ast-cell-stack ast-num">
          <span>Healthy {pct(r.minutesIn.Healthy / Math.max(1, r.minutes))}</span>
          <span className="ast-cell-sub">
            Alert {pct(r.minutesIn.Alert / Math.max(1, r.minutes))} · Critical {pct(r.minutesIn.Critical / Math.max(1, r.minutes))}
          </span>
        </span>
      ),
    },
    {
      key: "findings",
      header: "Confirmed problems",
      render: (r) =>
        r.findings.length ? (
          <span className="ast-cell-stack">
            {r.findings.slice(0, 3).map((f) => (
              <span key={f.id} className="ast-cell-text" title={`${f.id} · ${f.name}`}>
                {frames[r.machineId]?.defs.ruleById[f.id]?.plainTitle ?? f.name} · {f.worst} · {f.confirmed} time{f.confirmed === 1 ? "" : "s"}
              </span>
            ))}
            {r.findings.length > 3 && <span className="ast-cell-sub">and {r.findings.length - 3} more</span>}
          </span>
        ) : (
          <span className="ast-cell-sub">None confirmed</span>
        ),
    },
    {
      key: "actions",
      header: "Operator actions",
      width: "80px",
      render: (r) => <span className="ast-num">{r.actions}</span>,
    },
    {
      key: "data",
      header: "Good readings",
      width: "120px",
      render: (r) => (
        <span className="ast-cell-stack ast-num">
          <span>{pct(r.availability)}</span>
          <span className="ast-cell-sub">of live readings</span>
        </span>
      ),
    },
    {
      key: "svc",
      header: "Parts due for replacement",
      width: "200px",
      render: (r) => (r.serviceDue ? <span className="ast-cell-sub">{r.serviceDue}</span> : <span className="ast-cell-sub">None due</span>),
    },
  ];

  const download = () => {
    const head = ["Machine", "From", "To", "Plant minutes", "Health start", "Health now", "Health min", "Health mean", "Healthy %", "Alert %", "Critical %", "Confirmed findings", "Actions", "Data availability %", "Service life due"];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [
        code[r.machineId],
        when(r.fromT),
        when(r.toT),
        r.minutes,
        Math.round(r.healthStart),
        Math.round(r.healthNow),
        Math.round(r.healthMin),
        Math.round(r.healthMean),
        ((r.minutesIn.Healthy / Math.max(1, r.minutes)) * 100).toFixed(1),
        ((r.minutesIn.Alert / Math.max(1, r.minutes)) * 100).toFixed(1),
        ((r.minutesIn.Critical / Math.max(1, r.minutes)) * 100).toFixed(1),
        r.findings.map((f) => `${f.id} ${f.name} (${f.worst}, x${f.confirmed})`).join("; "),
        r.actions,
        (r.availability * 100).toFixed(1),
        r.serviceDue ?? "",
      ]
        .map(esc)
        .join(","),
    );
    const csv = [`# ULTRON condition report, pyro line · D4-OSW-PE-PYR Rev. 02 Table 11.1`, head.map(esc).join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "pyro-line-condition-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="ast-card pg-table-card" aria-label="Condition report">
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          Condition report
          <span className="ast-caption">
            {when(from)} – {when(to)} · {formatDuration(to - from)}
          </span>
        </h2>
        <PillButton variant="secondary" onClick={download}>
          {ACTION.exportCsv}
        </PillButton>
      </div>
      <Table columns={cols} data={rows} keyExtractor={(r) => r.machineId} />
    </section>
  );
}
