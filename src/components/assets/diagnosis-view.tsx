"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NextActions, PillButton, Loading } from "@/components/ui";
import { usePmsLine } from "@/components/maintenance/pms-model";
import { ruleActions, sensorActions } from "./next-actions-model";
import type { AssetMachine } from "./assets-data";
import type { AssetsSubPage } from "./assets-view";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { isLiveMachine, useKilnSimulationFor, useLiveMachineStatus, useLivePlantStarting } from "@/providers/kiln-simulation-context";
import { conditionTone, toCondition } from "@/components/ui/status";
import { useKilnOps } from "@/providers/kiln-ops-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import { simTimeMs } from "@shared/lib/kiln-sim/engine";
import { journalState } from "@shared/lib/alarm-journal";
import { useMachineCatalog } from "./use-machine-catalog";
import { DIAGNOSIS_SUB_KEY, focusLayer, focusSensorOn, LAYER_FOCUS_EVENT, readLayerFocus, type LayerFocusPayload } from "./sensor-focus";
import { KpiStrip, PageHeader, Section, type KpiItem, type PageMetaItem } from "./analysis/an-ui";
import { ackedFromEvents, dxSensorsFromFrame, toDxSensors, useDiagnosisRecord } from "./diagnosis-model";
import { buildSensorRows, diagnosisTotals, inDefinitionOrder } from "./diagnosis-rows";
import { defsFor } from "@/lib/live-defs";
import { SensorDiagnosisTable } from "./diagnosis-sensor-table";
import { SubassemblyHealthTable, type SubRow } from "./diagnosis-subassemblies";
import { bandOf, kilnHealthModel, storedHealthModel } from "./health-derive";
import { useHealthBands } from "@/lib/reference-data";
import { FindingsSection } from "./monitoring/findings-section";
import "./diagnosis/overview-tab.css";
import "./analysis/analysis-page.css";
import "./prognosis/prognosis-page.css";
import "./diagnosis-page.css";

/* ==========================================================================
   Diagnosis — "What is wrong with this machine, how bad, and where?"

   Header · four totals (machine health, active alarms, unacknowledged,
   invalid sensors) · sub-assembly health in definition order (a row filters
   the sensors) · every mapped sensor in fixed order: reading now and over
   6 h, alarm limit, validity, and the faults it is evidence for with their
   match %. Rows in alarm are red. Alarm log last.

   The former Health page lives here now (machine and sub-assembly scores).
   Why a fault happens lives on Analysis; when it gets worse, on Prognosis.
   ========================================================================== */

export interface DiagnosisViewProps {
  machine: AssetMachine;
  /** Optional overrides; by default the page navigates through the data context. */
  onNavigateToTrends?: (metricKey?: string) => void;
  /** @deprecated Health is part of Diagnosis now; ignored. */
  onNavigateToHealth?: () => void;
  onNavigateToAnalysis?: (ruleId?: string | null, component?: string | null, tag?: string | null) => void;
  /** @deprecated Failure chance moved to Prognosis; Diagnosis no longer links there. Ignored. */
  onNavigateToPrognosis?: (ruleId?: string | null, component?: string | null, tag?: string | null) => void;
  externalScope?: { id: string; label: string; tags: string[] } | null;
  /** Component (sub-assembly id) the page is filtered to; undefined leaves the filter to the page. */
  componentId?: string | null;
  /** The page's own sub-assembly pick, so the machine's other pages follow it. */
  onComponentChange?: (subId: string | null) => void;
}

/** sessionStorage key another page can set to open Diagnosis at a section. */
export const DIAGNOSIS_SECTION_KEY = "ultron.diagnosis.section";
/** sessionStorage key another page (Copilot, alerts) sets to open Diagnosis on one rule. */
export const DIAGNOSIS_RULE_KEY = "ultron.diagnosis.rule";

export function DiagnosisView({
  machine,
  onNavigateToTrends,
  onNavigateToAnalysis,
  externalScope = null,
  componentId,
  onComponentChange,
}: DiagnosisViewProps) {
  const { setActiveSubPage, selectedComponentId, selectComponent } = useIndustrialData();
  // The machine's component filter (shared by its pages) unless the host passes one.
  const compId = componentId !== undefined ? componentId : selectedComponentId;
  const simulation = useKilnSimulationFor(machine.id);
  const frame = simulation?.frame ?? null;
  // A live machine whose plant is still starting has no frame yet: its live totals wait.
  const starting = useLivePlantStarting() && !frame && isLiveMachine(machine.id);
  const ops = useKilnOps();
  const opsOn = machine.id === ops.machineId && frame !== null;
  const tz = useSiteTimeZone({ machineId: machine.id });
  const bands = useHealthBands(machine.healthModelId);
  const catalog = useMachineCatalog(machine);
  const diagnosis = useDiagnosisRecord(machine.id, frame === null);

  /** Optimistic acknowledgements: rule id → the `since` they were made against. */
  const [localAcks, setLocalAcks] = useState<Map<string, number | null>>(new Map());
  const [onlyAlarm, setOnlyAlarm] = useState(false);
  const [scopeToPart, setScopeToPart] = useState(true);
  /** Rule another page asked to open on (filters the table to its sensors). */
  const [ruleFilter, setRuleFilter] = useState<string | null>(null);
  /** Sub-assembly picked in the health table (filters the sensor table). */
  const [subFilter, setSubFilter] = useState<string | null>(compId ?? null);
  // The component filter drives the sub-assembly filter; a pick here becomes the machine's component filter.
  useEffect(() => {
    setSubFilter(compId ?? null);
  }, [compId]);
  const chooseSub = (id: string | null) => {
    setSubFilter(id);
    if (onComponentChange) onComponentChange(id);
    else if (componentId === undefined) selectComponent(machine.id, id);
  };
  /** Sub-assembly name Prognosis asked for, until the sub-assemblies are known. */
  const [pendingSub, setPendingSub] = useState<string | null>(null);

  useEffect(() => {
    const { ruleId } = readLayerFocus(true);
    if (ruleId) setRuleFilter(ruleId);
    try {
      const sub = sessionStorage.getItem(DIAGNOSIS_SUB_KEY);
      if (sub) setPendingSub(sub);
      sessionStorage.removeItem(DIAGNOSIS_SUB_KEY);
      sessionStorage.removeItem(DIAGNOSIS_SECTION_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    const onFocus = (ev: Event) => {
      const detail = (ev as CustomEvent<LayerFocusPayload>).detail;
      if (detail?.ruleId) setRuleFilter(detail.ruleId);
    };
    window.addEventListener(LAYER_FOCUS_EVENT, onFocus);
    return () => window.removeEventListener(LAYER_FOCUS_EVENT, onFocus);
  }, []);

  /* ------------------------------ Navigation ----------------------------- */
  const go = useCallback((sub: AssetsSubPage) => setActiveSubPage(sub), [setActiveSubPage]);
  const openTrend = (tag?: string) => {
    focusSensorOn("trends", tag);
    if (onNavigateToTrends) onNavigateToTrends(tag);
    else go("trends");
  };
  const openReason = (ruleId?: string | null, component?: string | null, tag?: string | null) => {
    focusLayer({ ruleId, component, tag, section: "an-diagnosis" });
    if (onNavigateToAnalysis) onNavigateToAnalysis(ruleId, component, tag);
    else go("analysis");
  };

  const fmtT = useCallback(
    (t: number) => formatLocalTime(simTimeMs(t), { seconds: true, timeZone: tz.timeZone }),
    [tz.timeZone],
  );
  const fmtClock = useCallback((ms: number) => formatLocalTime(ms, { seconds: false, timeZone: tz.timeZone }), [tz.timeZone]);

  /* -------------------------------- Model -------------------------------- */
  // One fixed row order whichever source is loaded (engine first, DB catalog after).
  const orderDefs = frame?.defs ?? defsFor(machine.id);
  const sensors = useMemo(
    () =>
      inDefinitionOrder(
        catalog.sensors.length === 0 && frame ? dxSensorsFromFrame(frame) : toDxSensors(catalog.sensors, frame?.defs ?? null),
        orderDefs,
      ),
    [catalog.sensors, frame, orderDefs],
  );

  // Alarm journal (the server's rule findings): acknowledgements, and cleared alarms nobody acknowledged.
  const occurrences = ops.journal[machine.id];
  const journal = useMemo(() => journalState(frame, frame ? (occurrences ?? []) : []), [frame, occurrences]);

  const opsAcks = useMemo(
    () => (opsOn ? ops.alerts.filter((a) => a.acknowledged).map((a) => a.ruleId) : []),
    [opsOn, ops.alerts],
  );
  const acked = useMemo(() => {
    const s = frame ? ackedFromEvents(frame) : new Set<string>();
    for (const id of opsAcks) s.add(id);
    for (const id of journal.acked) s.add(id);
    if (frame) {
      for (const [id, since] of localAcks) {
        const r = frame.rules.find((x) => x.id === id);
        if (r && r.status !== "QUIET" && r.since === since) s.add(id);
      }
    }
    return s;
  }, [frame, opsAcks, localAcks, journal]);

  const acknowledge = useCallback(
    (ruleId: string) => {
      if (!simulation) return;
      const r = simulation.frame.rules.find((x) => x.id === ruleId);
      if (r && r.status !== "QUIET") setLocalAcks((m) => new Map(m).set(ruleId, r.since));
      // Raised or already cleared: the ops loop tells the engine (when raised) and records it in the journal.
      void ops.acknowledgeAlarm(machine.id, ruleId);
    },
    [simulation, ops, machine.id],
  );

  const rows = useMemo(() => buildSensorRows(sensors, frame, acked, journal.cleared), [sensors, frame, acked, journal]);

  // Machine health (merged from the former Health page): the same roll-up, per sub-assembly, in definition order.
  const health = useMemo(() => (frame ? kilnHealthModel(frame, catalog) : storedHealthModel(catalog)), [frame, catalog]);
  const subOf = useCallback(
    (r: { s: { tag: string; subAssembly: string } }) =>
      frame?.defs.signalByTag[r.s.tag]?.sub ?? health.subs.find((x) => x.name === r.s.subAssembly)?.id ?? null,
    [frame, health.subs],
  );
  // A part picked (Assets part bar): its rules and its sensors only, so the totals describe that part.
  const totals = useMemo(() => {
    if (!subFilter) return diagnosisTotals(frame, acked, sensors, journal.cleared);
    const subsOf = (id: string) => frame?.rules.find((r) => r.id === id)?.subs ?? frame?.defs.ruleById[id]?.subs ?? [];
    const mine = sensors.filter((s) => subOf({ s }) === subFilter);
    return diagnosisTotals(frame, acked, mine, journal.cleared, (id) => subsOf(id).includes(subFilter));
  }, [frame, acked, sensors, journal, subFilter, subOf]);
  const subRows = useMemo<SubRow[]>(
    () =>
      health.subs.map((sub) => {
        const mine = rows.filter((r) => subOf(r) === sub.id);
        return { sub, sensors: mine.length, inAlarm: mine.filter((r) => r.inAlarm).length };
      }),
    [health.subs, rows, subOf],
  );
  useEffect(() => {
    if (!pendingSub || health.subs.length === 0) return;
    const want = pendingSub.toLowerCase();
    const hit = health.subs.find((x) => x.name.toLowerCase() === want) ?? health.subs.find((x) => want.includes(x.name.toLowerCase()));
    if (hit) chooseSub(hit.id);
    setPendingSub(null);
  }, [pendingSub, health.subs]);

  const subName = subFilter ? (health.subs.find((x) => x.id === subFilter)?.name ?? subFilter) : null;

  const partTags = useMemo(
    () => (externalScope && scopeToPart && externalScope.tags.length > 0 ? new Set(externalScope.tags) : null),
    [externalScope, scopeToPart],
  );
  // A problem filter (sent from Analysis or a finding) only applies on the parts that problem covers:
  // on any other part it would empty the table, so it stays aside until you go back to one of them.
  const ruleSubs = ruleFilter ? (frame?.rules.find((r) => r.id === ruleFilter)?.subs ?? frame?.defs.ruleById[ruleFilter]?.subs ?? []) : [];
  const activeRule = ruleFilter && (!subFilter || ruleSubs.length === 0 || ruleSubs.includes(subFilter)) ? ruleFilter : null;
  const ruleDef = activeRule ? frame?.defs.ruleById[activeRule] : undefined;
  const ruleName = activeRule
    ? (rows.flatMap((r) => r.faults).find((f) => f.ruleId === activeRule)?.name ?? (ruleDef ? ruleDef.plainTitle || ruleDef.name : activeRule))
    : null;
  const shown = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!onlyAlarm || r.inAlarm) &&
          (!subFilter || subOf(r) === subFilter) &&
          (!partTags || partTags.has(r.s.tag)) &&
          (!activeRule || r.faults.some((f) => f.ruleId === activeRule) || (frame?.defs.ruleById[activeRule]?.inputs ?? []).includes(r.s.tag)),
      ),
    [rows, onlyAlarm, subFilter, subOf, partTags, activeRule, frame],
  );
  const inAlarm = rows.filter((r) => r.inAlarm).length;

  // Next actions: acknowledge, ask for a repair, check a doubtful sensor (the picked part only).
  const pms = usePmsLine();
  const ruleSubsOf = (id: string) => frame?.rules.find((r) => r.id === id)?.subs ?? frame?.defs.ruleById[id]?.subs ?? [];
  const inPart = (id: string) => !subFilter || ruleSubsOf(id).includes(subFilter);
  const next = [
    ...(frame
      ? ruleActions({
          machineId: machine.id,
          rules: frame.rules.filter((r) => inPart(r.id)),
          acked,
          cleared: new Map([...journal.cleared].filter(([id]) => inPart(id))),
          ruleName: (id) => frame.defs.ruleById[id]?.plainTitle || frame.defs.ruleById[id]?.name || id,
          acknowledge,
          pms,
        })
      : []),
    ...sensorActions(subFilter ? sensors.filter((x) => subOf({ s: x }) === subFilter) : sensors, openTrend),
  ];

  /* ------------------------------- Header -------------------------------- */
  // One machine condition everywhere: the same source as the header on every machine page.
  const live = useLiveMachineStatus(machine.id, { health: machine.health, status: machine.status });
  const condition = toCondition(live.status);

  const leadRow = rows.find((r) => r.inAlarm) ?? null;
  const leadTag = leadRow?.s.tag ?? null;
  const record = diagnosis.record;

  const meta: PageMetaItem[] = frame
    ? [
        subFilter
          ? { label: "Checks running", value: String(frame.rules.filter((r) => r.subs.includes(subFilter)).length), title: "Automatic checks (rules) watching this part" }
          : { label: "Checks running", value: String(frame.rules.length), title: "Automatic checks (rules) watching this machine" },
        { label: "Readings", value: "Every minute" },
        { label: "Last checked", value: fmtT(frame.t), title: tz.label },
        ...(subName ? [{ label: "Part", value: subName }] : []),
      ]
    : record
      ? [
          { label: "Source", value: "Last saved report" },
          { label: "Made by", value: record.engineVersion, title: "Version of the analysis that made the report" },
        ]
      : [{ label: "Source", value: diagnosis.loading ? "Loading diagnosis…" : "No saved report" }];

  const loading = catalog.isLoading && sensors.length === 0;
  const part = subFilter ? (health.subs.find((x) => x.id === subFilter) ?? null) : null;
  const partRow = part ? subRows.find((x) => x.sub.id === part.id) : undefined;
  const healthValue = subFilter ? (part?.health ?? null) : live.health;
  const score = healthValue === null ? null : Math.round(healthValue);
  const scoredSubs = health.subs.filter((x) => x.scored && x.health !== null);
  const below = bands ? scoredSubs.filter((x) => (x.health as number) < bands.advisory).length : null;
  const scoreBand = score === null ? null : bandOf(score, bands);
  const kpis: KpiItem[] = [
    {
      label: subFilter ? "Part health" : "Machine health",
      value: score === null ? "—" : String(score),
      unit: score === null ? undefined : "/100",
      bar: score ?? undefined,
      tone: scoreBand === "Critical" ? "bad" : scoreBand === "Alert" ? "warn" : undefined,
      foot: subFilter
        ? partRow
          ? `${partRow.sensors} sensors · ${partRow.inAlarm} in alarm`
          : "No score for this part yet"
        : !scoredSubs.length
          ? "No part scores yet"
          : bands && below !== null
            ? `${below} of ${scoredSubs.length} parts score below ${bands.advisory}`
            : `${scoredSubs.length} parts scored`,
    },
    {
      label: "Problems found",
      value: frame ? String(totals.active) : "—",
      foot: frame ? `${totals.confirming} being confirmed` : "No live checks",
      tone: totals.active ? (totals.critical ? "bad" : "warn") : undefined,
    },
    {
      label: "Not acknowledged",
      value: frame ? String(totals.unacked) : "—",
      foot: frame ? `${totals.activeUnacked} still on · ${totals.clearedUnacked} back to normal` : "No live checks",
      tone: totals.unacked ? (totals.critical ? "bad" : "warn") : undefined,
    },
    {
      label: "Doubtful readings",
      value: loading ? "…" : String(totals.invalid),
      unit: `of ${partRow ? partRow.sensors : sensors.length}`,
      foot: `${totals.stale} not updating · ${totals.suspect} may be wrong`,
      tone: totals.invalid ? "bad" : undefined,
    },
  ];

  const tableRight = (
    <span className="pg-dx-filters">
      <span className="ast-num pg-diag-muted">
        {partRow ? `${partRow.sensors} sensors · ${partRow.inAlarm} in alarm` : `${sensors.length} sensors · ${inAlarm} in alarm`}
      </span>
      {externalScope && (
        <button type="button" className="dxo-filter-chip" aria-pressed={scopeToPart} onClick={() => setScopeToPart((v) => !v)}>
          {scopeToPart ? `Part: ${externalScope.label}` : "Whole machine"}
        </button>
      )}
      {subName && componentId !== undefined && (
        <button type="button" className="dxo-filter-chip" onClick={() => chooseSub(null)} aria-label={`Clear filter ${subName}`}>
          {subName} <span aria-hidden="true">×</span>
        </button>
      )}
      {activeRule && (
        <button type="button" className="dxo-filter-chip" onClick={() => setRuleFilter(null)} aria-label={`Clear filter ${ruleName}`}>
          {ruleName} <span aria-hidden="true">×</span>
        </button>
      )}
      <button type="button" className="dxo-filter-chip" aria-pressed={onlyAlarm} onClick={() => setOnlyAlarm((v) => !v)}>
        Only in alarm
      </button>
    </span>
  );

  return (
    <div className="dxo-root ast-root pg-frame pg-diag" aria-label="Diagnosis">
      <PageHeader
        title="Diagnosis"
        status={{ label: condition, tone: conditionTone(condition) }}
        meta={meta}
        actions={
          // Page links and popups are in the machine bar above; this page's own trend stays.
          leadTag ? (
            <PillButton variant="secondary" onClick={() => openTrend(leadTag)}>
              {`Open trend: ${leadRow?.s.name ?? leadTag} ↗`}
            </PillButton>
          ) : undefined
        }
      />

      {/* Until the machine's sensors load, its totals wait instead of reading 0. */}
      <KpiStrip page items={loading || starting ? kpis.map((k) => ({ ...k, loading: true })) : kpis} label="Diagnosis totals" />

      {!loading && next.length > 0 && (
        <Section id="dx-next" title="Next actions">
          <NextActions items={next} />
        </Section>
      )}

      {subRows.length > 0 && !subFilter && (
        <Section id="dx-health" title="Parts">
          <SubassemblyHealthTable rows={subRows} selectedId={subFilter} onSelect={chooseSub} bands={bands} />
        </Section>
      )}

      <Section id="dx-diagnosis" title="Sensors" right={tableRight}>
        {loading ? (
          <Loading label="Loading sensors…" rows={6} />
        ) : sensors.length === 0 ? (
          <p className="pg-diag-missing">No sensors are linked to this machine yet.</p>
        ) : shown.length === 0 ? (
          <p className="pg-diag-missing">
            {subName && partRow?.sensors === 0
              ? `${subName} has no sensors, so nothing on it can be checked.`
              : onlyAlarm
                ? "No sensor is in alarm."
                : "No sensor matches this filter."}
          </p>
        ) : (
          <SensorDiagnosisTable
            rows={shown}
            frame={frame}
            fmtT={fmtT}
            fmtClock={fmtClock}
            workOrders={opsOn ? ops.workOrders : null}
            onAcknowledge={acknowledge}
            onWorkOrder={opsOn ? (id) => void ops.createWorkOrder(id) : undefined}
            onOpenTrend={openTrend}
            onWhy={(f, tag) => openReason(f.ruleId, f.where, tag)}
            hidePart={Boolean(subFilter || partTags)}
          />
        )}
      </Section>

      {/* Findings and events from the server evaluation; not in the Home console embed (externalScope). */}
      {!externalScope && <FindingsSection machineId={machine.id} />}
    </div>
  );
}
