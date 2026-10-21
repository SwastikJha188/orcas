"use client";

/**
 * Pyro line directory: four line figures (KpiStrip) → the line drawing (PYR-0)
 * → latest confirmed problems → the plant's areas (passed in) → condition
 * report → planned checks → what moves together. All read from the running line.
 */

import React, { useMemo } from "react";
import { KpiStrip, Table, type Column, type KpiItem } from "@/components/ui";
import { conditionTone, toCondition, worstCondition } from "@/components/ui/status";
import { useKilnFleet } from "@/providers/kiln-simulation-context";
import { PYRO_MACHINES, PYRO_SIGNAL_BY_TAG } from "@shared/lib/pyro-sim/signals";
import type { SimFrame } from "@shared/lib/kiln-sim/engine";
import type { AssetsSubPage } from "../assets-view";
import { pyroRule } from "@shared/lib/pyro-sim/rules";
import { SPEC_RULES, type SpecRule } from "@/lib/pyro-sim/spec-rules";
import { displayName, nameIds } from "@/lib/display-name";
import { QUALITY_LABEL, limitsApprovalText } from "../sensors-model";
import { useApi } from "@/lib/api-cache";
import type { MeasurementDto } from "@shared/types/monitoring";
import { ConditionReport } from "./condition-report";
import { LineSheet } from "./line-sheets/line-sheet";
import { LINE_SHEET_ART, LINE_SHEET_BY_ID, LINE_SHEET_FOCUS_KEY } from "./line-sheets";
import { OV_SECTIONS, OVERVIEW_SECTION_KEY } from "../overview-sections";
import "../analysis/analysis-page.css";

function corr(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 30) return null;
  const xa = a.slice(-n);
  const xb = b.slice(-n);
  const ma = xa.reduce((s, v) => s + v, 0) / n;
  const mb = xb.reduce((s, v) => s + v, 0) / n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    sab += (xa[i] - ma) * (xb[i] - mb);
    saa += (xa[i] - ma) ** 2;
    sbb += (xb[i] - mb) ** 2;
  }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : null;
}

/** Drivers (rows) and the downstream signals they move (columns), D4 Table 8.1. */
const DRIVERS = ["FLO-KFS-01", "FLO-BRN-01", "PRS-BRN-03", "SPD-PHC-01", "ELE-PHC-01", "SPD-KLN-01"];
/** Driver rows that need their own reading note. */
const DRIVER_NOTE: Record<string, string> = { "ELE-PHC-01": "Oxygen against exhaust fan power · context only, not a cause" };
const EFFECTS = ["TMP-KLN-13", "PRS-KLN-01", "GAS-KLN-01", "TMP-KLN-14", "GAS-PHC-01", "ELE-PHC-01", "ELE-KLN-01", "PRS-PHC-01", "PRS-CLR-01", "TMP-CLR-08", "ELE-HMR-01", "ELE-CSL-01"];

export function PyroLineOverview({
  plantId,
  onOpenMachine,
  areas = null,
}: {
  plantId: string;
  onOpenMachine: (machineId: string, subPage: AssetsSubPage) => void;
  /** The plant's area cards, placed after the latest problems. */
  areas?: React.ReactNode;
}) {
  const fleet = useKilnFleet();
  // Whether the line's Alert / Critical limits are approved: the DB limit rows of the plant's measurements.
  const { data: measurements } = useApi<MeasurementDto[]>(`/api/measurements?plantId=${encodeURIComponent(plantId)}`);
  const limitsNote = useMemo(() => (Array.isArray(measurements) ? limitsApprovalText(measurements.map((m) => m.limit)) : null), [measurements]);
  const frames = useMemo(() => Object.fromEntries(PYRO_MACHINES.map((m) => [m.id, fleet[m.id]?.frame ?? null])), [fleet]);
  const live = Object.values(frames).some(Boolean);

  const value = (tag: string) => {
    const def = PYRO_SIGNAL_BY_TAG[tag];
    const f = def ? frames[def.machine] : null;
    return f?.signals[tag] ?? null;
  };
  const series = (tag: string) => {
    const def = PYRO_SIGNAL_BY_TAG[tag];
    const f = def ? frames[def.machine] : null;
    return f?.history[tag] ?? [];
  };

  const findings = useMemo(() => {
    const out: Array<{ key: string; t: number; clock: string; machine: string; code: string; machineName: string; title: string; detail: string; severity: string; defs: SimFrame["defs"] }> = [];
    for (const m of PYRO_MACHINES) {
      const f = frames[m.id];
      if (!f) continue;
      // Machine findings only: data-quality flags (R-DQ-*, R-ANM-01) are input validity, not condition.
      for (const e of f.events)
        if (e.kind === "rule" && e.severity !== "Normal" && !/^R-(DQ|ANM)-/.test(e.title))
          out.push({ key: `${m.id}-${e.t}-${e.title}`, t: e.t, clock: e.clock, machine: m.id, code: m.code, machineName: m.shortName, title: e.title.replace(/ confirmed$/, ""), detail: e.detail, severity: e.severity, defs: f.defs });
    }
    return out.sort((a, b) => b.t - a.t).slice(0, 6);
  }, [frames]);

  const influence = useMemo(
    () =>
      DRIVERS.map((d) => ({
        driver: d,
        cells: EFFECTS.map((e) => (e === d ? null : corr(series(d), series(e)))),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frames],
  );

  // No live line yet: the areas still show.
  if (!live) return <>{areas}</>;

  const ruleCols: Column<SpecRule>[] = [
    {
      key: "id",
      header: "Planned check",
      width: "260px",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title" title={r.id}>
            {r.purpose}
          </span>
        </span>
      ),
    },
    {
      key: "inputs",
      header: "Uses and conditions",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-text">{r.inputs}</span>
          <span className="ast-cell-sub">{r.qualification}</span>
          {r.note && <span className="ast-cell-sub">Note: {r.note}</span>}
        </span>
      ),
    },
    {
      key: "impl",
      header: "Checks running",
      width: "220px",
      render: (r) => {
        const parts = Object.entries(r.implementation);
        if (!parts.length) return <span className="ast-cell-sub">{r.state === "inherent" ? "Every finding" : "—"}</span>;
        const machines = parts.length === PYRO_MACHINES.length ? `All ${PYRO_MACHINES.length} machines` : parts.map(([m]) => PYRO_MACHINES.find((p) => p.id === m)?.shortName ?? m).join(", ");
        const named = [...new Map(parts.flatMap(([m, ids]) => ids.map((id) => [id, pyroRule(m, id)?.plainTitle ?? pyroRule(m, id)?.name ?? id] as const))).entries()];
        const ids = named.map(([id]) => id).join(", ");
        // Up to three rules by name; longer lists as a count (names and IDs in the tooltip).
        const text = named.length <= 3 ? named.map(([, n]) => n).join(", ") : `${named.length} checks`;
        return (
          <span className="ast-cell-stack">
            <span className="ast-cell-text" title={named.map(([id, n]) => `${id} ${n}`).join("\n") || ids}>
              {text}
            </span>
            <span className="ast-cell-sub">{machines}</span>
          </span>
        );
      },
    },
    {
      key: "state",
      header: "Now",
      width: "118px",
      render: (r) => {
        if (r.state === "inherent" || r.state === "not evaluated" || !Object.keys(r.implementation).length)
          return (
            <span className="ast-badge" data-tone="idle">
              {r.state === "inherent" ? "Built in" : r.state === "hold" ? "On hold" : "Not running"}
            </span>
          );
        // Count the D4 rule itself, not the extra engine rules mapped beside it.
        let active = 0;
        let critical = false;
        for (const [m, ids] of Object.entries(r.implementation)) {
          for (const rs of frames[m]?.rules ?? []) {
            if (!ids.includes(rs.id) || rs.status !== "ACTIVE" || pyroRule(m, rs.id)?.spec !== r.id) continue;
            active++;
            if (rs.severity === "Critical") critical = true;
          }
        }
        const hold = r.state === "hold" ? "On hold · " : "";
        return active ? (
          <span className="ast-badge" data-tone={critical ? "bad" : "warn"}>
            {hold}
            {active} active
          </span>
        ) : (
          <span className="ast-badge" data-tone={hold ? "idle" : "good"}>
            {hold}Nothing found
          </span>
        );
      },
    },
  ];

  // Line figures from the running machines: which need attention, the lowest health, the kiln feed and doubtful readings.
  const running = PYRO_MACHINES.flatMap((m) => (frames[m.id] ? [{ m, f: frames[m.id]! }] : []));
  const offNormal = running.filter(({ f }) => toCondition(f.condition) !== "Normal");
  const lowest = [...running].sort((a, b) => a.f.overall - b.f.overall)[0] ?? null;
  const doubtful = running.reduce((n, { f }) => n + f.pipeline.invalid + f.pipeline.suspect, 0);
  const feed = value("FLO-KFS-01");
  const feedSp = frames["PYR-FED-01"]?.drivers.feedSp;
  const kpis: KpiItem[] = [
    {
      label: "Machines needing attention",
      value: String(offNormal.length),
      unit: `of ${running.length}`,
      tone: conditionTone(worstCondition(offNormal.map(({ f }) => f.condition))),
      foot: offNormal.length ? offNormal.map(({ m }) => m.shortName).join(", ") : "All machines Normal",
    },
    {
      label: "Lowest machine health",
      value: lowest ? String(lowest.f.overall) : "—",
      unit: lowest ? "%" : undefined,
      bar: lowest?.f.overall,
      tone: lowest ? conditionTone(lowest.f.condition) : undefined,
      foot: lowest?.m.shortName,
    },
    {
      label: "Kiln feed",
      value: feed?.display ?? "—",
      unit: PYRO_SIGNAL_BY_TAG["FLO-KFS-01"]?.unit,
      tone: feed && feed.quality !== "Good" ? "warn" : undefined,
      foot:
        feed && feed.quality !== "Good"
          ? `Reading ${((QUALITY_LABEL as Record<string, string>)[feed.quality] ?? feed.quality).toLowerCase()}`
          : feedSp !== undefined
            ? `Target ${feedSp.toFixed(0)}`
            : undefined,
    },
    {
      label: "Doubtful readings",
      value: String(doubtful),
      tone: doubtful ? "warn" : undefined,
      foot: doubtful ? "Not used for problem checks" : "Every reading trusted",
    },
  ];

  const findingCols: Column<(typeof findings)[number]>[] = [
    { key: "clock", header: "Time", width: "84px", render: (r) => <span className="ast-num">{r.clock}</span> },
    { key: "code", header: "Machine", width: "120px", render: (r) => <span title={r.code}>{r.machineName}</span> },
    {
      key: "title",
      header: "Problem",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title" title={r.title}>
            {r.defs.ruleById[r.title.split(" ")[0]]?.plainTitle ?? nameIds(r.title, r.defs)}
          </span>
          <span className="ast-cell-sub" title={r.detail}>
            {nameIds(r.detail, r.defs)}
          </span>
        </span>
      ),
    },
    {
      key: "sev",
      header: "Severity",
      width: "96px",
      render: (r) => (
        <span className="ast-badge" data-tone={r.severity === "Critical" ? "bad" : "warn"}>
          {r.severity === "Critical" ? "Critical" : "Alert"}
        </span>
      ),
    },
  ];

  // Sheet index: open the sheet's (first) machine on its Overview at that sheet (detail sheets open their component).
  const openSheet = (id: string) => {
    const machineId = LINE_SHEET_BY_ID[id]?.machines[0];
    if (!machineId) return;
    try {
      sessionStorage.setItem(LINE_SHEET_FOCUS_KEY, id);
      sessionStorage.setItem(OVERVIEW_SECTION_KEY, OV_SECTIONS.machine);
    } catch {
      /* storage unavailable: the machine still opens */
    }
    onOpenMachine(machineId, "overview");
  };

  return (
    <>
      <KpiStrip page items={kpis} label="Line figures" />

      {LINE_SHEET_ART["PYR-0"]?.ready && (
        <section className="ast-card" aria-label="Pyro line diagram">
          <div className="ast-card-head">
            <h2 className="ast-card-title">PYR-0 · Feed silo to clinker silo</h2>
          </div>
          <LineSheet sheetId="PYR-0" onOpenMachine={(id) => onOpenMachine(id, "overview")} onOpenSheet={openSheet} />
        </section>
      )}

      <section className="ast-card pg-table-card" aria-label="Latest confirmed problems">
        <div className="ast-card-head ast-card-head--stack">
          <h2 className="ast-card-title">Latest confirmed problems</h2>
          <p className="ast-caption">
            {[findings.length ? `${findings.length} most recent across the line` : "none confirmed in this time", limitsNote]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {findings.length > 0 && <Table columns={findingCols} data={findings} keyExtractor={(r) => r.key} onRowClick={(r) => onOpenMachine(r.machine, "diagnosis")} />}
      </section>

      {areas}

      <ConditionReport />

      <section className="ast-card pg-table-card" aria-label="Planned checks">
        <div className="ast-card-head ast-card-head--stack">
          <h2 className="ast-card-title">Planned checks</h2>
          <p className="ast-caption">{SPEC_RULES.length} checks · proposed, not yet approved · advice only</p>
        </div>
        <Table columns={ruleCols} data={SPEC_RULES} keyExtractor={(r) => r.id} />
      </section>

      <section className="ast-card pg-table-card" aria-label="Process influence">
        <div className="ast-card-head ast-card-head--stack">
          <h2 className="ast-card-title">What moves together</h2>
          <p className="ast-caption">Last 6 h · +1 = rise and fall together · −1 = opposite</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="ui-table" style={{ minWidth: 820 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Setting</th>
                {EFFECTS.map((e) => (
                  <th key={e} title={`${e} · ${PYRO_SIGNAL_BY_TAG[e]?.name ?? ""}`}>
                    {displayName(PYRO_SIGNAL_BY_TAG[e]?.name ?? e)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {influence.map((row) => (
                <tr key={row.driver}>
                  <td style={{ minWidth: 200, whiteSpace: "nowrap" }}>
                    <span className="ast-cell-stack">
                      <span className="ast-cell-title" title={row.driver}>
                        {displayName(PYRO_SIGNAL_BY_TAG[row.driver]?.name ?? row.driver)}
                      </span>
                      {DRIVER_NOTE[row.driver] && <span className="ast-cell-sub">{DRIVER_NOTE[row.driver]}</span>}
                    </span>
                  </td>
                  {row.cells.map((r, i) => (
                    <td key={EFFECTS[i]} className="ast-num pyro-corr" data-strength={r === null || Math.abs(r) < 0.3 ? "weak" : Math.abs(r) >= 0.5 ? "strong" : undefined}>
                      {r === null ? "—" : `${r >= 0 ? "+" : "−"}${Math.abs(r).toFixed(2)}`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
