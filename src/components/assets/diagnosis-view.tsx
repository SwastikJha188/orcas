"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PillButton } from "@/components/ui";
import type { AssetMachine } from "./assets-data";
import type { AssetsSubPage } from "./assets-view";
import type { Tone } from "./assets-shell-ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useKilnSimulationFor, useLiveMachineStatus } from "@/providers/kiln-simulation-context";
import { conditionTone as toneOfCondition, toCondition } from "@/components/ui/status";
import { useKilnOps } from "@/providers/kiln-ops-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import { simTimeMs } from "@/lib/kiln-sim/engine";
import { defsFor } from "@/lib/live-defs";
import { useMachineCatalog } from "./use-machine-catalog";
import { focusSensorOn } from "./sensor-focus";
import { KpiStrip, PageHeader, SectionIndex, Section, scrollToSection, type PageMetaItem, type SectionIndexItem } from "./analysis/an-ui";
import {
  ackedFromEvents,
  buildAlarms,
  buildFindings,
  type Finding,
  dxSensorsFromFrame,
  faultModesFromCatalog,
  isOpenFinding,
  ruleInputs,
  toDxSensors,
  useDiagnosisRecord,
  type DxSensor,
} from "./diagnosis-model";
import { diagnosisKpis } from "./diagnosis-summary";
import { AlarmCards, type Shelf } from "./diagnosis-alarms";
import { FaultCandidates, type Feedback } from "./diagnosis-findings";
import { EvidenceCards } from "./diagnosis-evidence";
import "./diagnosis/overview-tab.css";
import "./analysis/analysis-page.css";
import "./diagnosis-page.css";

/* ==========================================================================
   Diagnosis — "What is wrong with this machine now, and what should be done
   now?" One scrolling page with a sticky section index:

   Alarms · Diagnosis (machine faults, then data-quality / service items)
   · Evidence (signal validity)

   Live machines (kiln fleet, pyro line) read the live rule engine and the
   rule library in `frame.defs` (persistence 2–4 samples / 1 critical,
   hysteresis 4 clean samples, sensor validation). Other machines read the
   stored AssetIQ record and the DB failure-mode library; what they lack is
   named in each section. The work-order loop (KilnOps) runs on the
   active plant's primary machine (KLN-01 / PYR-KLN-01); other live machines
   acknowledge through their engine. Why (root cause, XAI)
   lives on Analysis and what next (RUL, forecasts) on Prognosis — linked.
   ========================================================================== */

export interface DiagnosisViewProps {
  machine: AssetMachine;
  /** Optional overrides; by default the page navigates through the data context. */
  onNavigateToSensors?: () => void;
  onNavigateToTrends?: (metricKey?: string) => void;
  onNavigateToHealth?: () => void;
}

/** sessionStorage key another page can set to open Diagnosis at a section. */
export const DIAGNOSIS_SECTION_KEY = "ultron.diagnosis.section";
/** sessionStorage key another page (Copilot, alerts) sets to open Diagnosis on one rule. */
export const DIAGNOSIS_RULE_KEY = "ultron.diagnosis.rule";

const SEV_RANK = { Critical: 0, Advisory: 1, Normal: 2 } as const;

export function DiagnosisView({ machine, onNavigateToSensors, onNavigateToTrends }: DiagnosisViewProps) {
  const { setActiveSubPage } = useIndustrialData();
  const simulation = useKilnSimulationFor(machine.id);
  const frame = simulation?.frame ?? null;
  const ops = useKilnOps();
  const opsOn = machine.id === ops.machineId && frame !== null;
  const tz = useSiteTimeZone({ machineId: machine.id });
  const catalog = useMachineCatalog(machine);
  const diagnosis = useDiagnosisRecord(machine.id);

  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  /** Optimistic acknowledgements: rule id → the `since` they were made against. */
  const [localAcks, setLocalAcks] = useState<Map<string, number | null>>(new Map());
  /** Shelved alarms and fault feedback: kept in this browser only (no backend yet). */
  const [shelved, setShelved] = useState<Map<string, Shelf>>(new Map());
  const [feedback, setFeedback] = useState<Map<string, Feedback>>(new Map());
  /** Rule requested by another page on arrival (read once, then cleared). */
  const [focusRuleId, setFocusRuleId] = useState<string | null>(null);
  useEffect(() => {
    let id: string | null = null;
    try {
      id = sessionStorage.getItem(DIAGNOSIS_RULE_KEY);
      if (id) sessionStorage.removeItem(DIAGNOSIS_RULE_KEY);
    } catch {
      /* storage unavailable */
    }
    if (!id) return;
    const rule = id;
    // Deferred so the sections exist before scrolling.
    const timer = window.setTimeout(() => {
      setFocusRuleId(rule);
      setSelectedRuleId(rule);
      scrollToSection("dx-diagnosis");
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);

  /* ------------------------------ Navigation ----------------------------- */
  const go = useCallback((sub: AssetsSubPage) => setActiveSubPage(sub), [setActiveSubPage]);
  const openTrend = (tag?: string) => {
    focusSensorOn("trends", tag);
    if (onNavigateToTrends) onNavigateToTrends(tag);
    else go("trends");
  };
  const openSensor = (tag?: string) => {
    focusSensorOn("sensors", tag);
    if (onNavigateToSensors) onNavigateToSensors();
    else go("sensors");
  };

  const fmtT = useCallback(
    (t: number) => formatLocalTime(simTimeMs(t), { seconds: true, timeZone: tz.timeZone }),
    [tz.timeZone],
  );

  /* -------------------------------- Model -------------------------------- */
  const sensors = useMemo(
    () => (catalog.sensors.length === 0 && frame ? dxSensorsFromFrame(frame) : toDxSensors(catalog.sensors, frame?.defs ?? null)),
    [catalog.sensors, frame],
  );
  const byTag = useMemo(() => new Map(sensors.map((s) => [s.tag, s])), [sensors]);
  const modes = useMemo(() => (frame ? [] : faultModesFromCatalog(sensors)), [frame, sensors]);
  const findings = useMemo(
    () => buildFindings(frame, diagnosis.record, modes, sensors, frame?.defs ?? defsFor(machine.id)),
    [frame, diagnosis.record, modes, sensors, machine.id],
  );
  const open = useMemo(() => findings.filter(isOpenFinding), [findings]);
  const lead = open[0] ?? null;

  const opsAcks = useMemo(
    () => (opsOn ? ops.alerts.filter((a) => a.acknowledged).map((a) => a.ruleId) : []),
    [opsOn, ops.alerts],
  );
  const acked = useMemo(() => {
    const s = frame ? ackedFromEvents(frame) : new Set<string>();
    for (const id of opsAcks) s.add(id);
    if (frame) {
      for (const [id, since] of localAcks) {
        const r = frame.rules.find((x) => x.id === id);
        if (r && r.status !== "QUIET" && r.since === since) s.add(id);
      }
    }
    return s;
  }, [frame, opsAcks, localAcks]);

  const alarms = useMemo(() => (frame ? buildAlarms(frame, acked) : []), [frame, acked]);

  // Shelves auto-return when their time is up or the alarm has cleared.
  const activeShelves = useMemo(() => {
    const now = Date.now();
    const m = new Map<string, Shelf>();
    for (const [id, sh] of shelved) if (sh.until > now && alarms.some((a) => a.ruleId === id && a.since === sh.since)) m.set(id, sh);
    return m;
  }, [shelved, alarms]);

  const shelve = (ruleId: string, ms: number, reason: string) => {
    const a = alarms.find((x) => x.ruleId === ruleId);
    setShelved((m) => new Map(m).set(ruleId, { until: Date.now() + ms, reason, since: a?.since ?? null }));
  };
  const unshelve = (ruleId: string) => {
    setShelved((m) => {
      const n = new Map(m);
      n.delete(ruleId);
      return n;
    });
  };
  const giveFeedback = (f: Finding, v: Feedback) => setFeedback((m) => new Map(m).set(f.key, v));
  const onsetOf = (f: Finding) => {
    if (!frame || !f.ruleId) return null;
    const a = alarms.find((x) => x.ruleId === f.ruleId);
    if (!a) return null;
    if (a.state === "confirming") return `${a.persistence} sample${a.persistence === 1 ? "" : "s"} ago`;
    return a.since !== null ? fmtT(a.since) : null;
  };

  const acknowledge = useCallback(
    (ruleId: string) => {
      if (!simulation) return;
      const r = simulation.frame.rules.find((x) => x.id === ruleId);
      setLocalAcks((m) => new Map(m).set(ruleId, r?.since ?? null));
      if (opsOn) void ops.acknowledge(ruleId);
      else simulation.performAction(ruleId, "acknowledge");
    },
    [simulation, opsOn, ops],
  );

  // Which open rules cite each sensor as evidence.
  const citedBy = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const f of open) {
      if (!f.ruleId) continue;
      for (const t of f.tags) m.set(t, [...(m.get(t) ?? []), f.ruleId]);
    }
    return m;
  }, [open]);

  // Evidence scope: the selected rule's sensors, else everything cited, in excursion or not trusted.
  const scopeTags = useMemo<string[] | null>(() => {
    if (!selectedRuleId) return null;
    const f = findings.find((x) => x.ruleId === selectedRuleId && x.tags.length > 0);
    if (f) return f.tags;
    if (frame) return ruleInputs(selectedRuleId, frame.defs);
    return modes.find((m) => m.id === selectedRuleId)?.signature ?? [];
  }, [selectedRuleId, findings, frame, modes]);

  const evidence = useMemo<DxSensor[]>(() => {
    if (scopeTags) return scopeTags.map((t) => byTag.get(t)).filter((s): s is DxSensor => !!s);
    const list = sensors.filter(
      (s) => citedBy.has(s.tag) || s.severity !== "Normal" || s.validity === "suspect" || s.validity === "invalid" || s.validity === "stale",
    );
    const flagged = (x: DxSensor) => (x.validity === "invalid" || x.validity === "stale" ? 0 : x.validity === "suspect" ? 1 : 2);
    return list.sort((a, b) => flagged(a) - flagged(b) || SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  }, [scopeTags, sensors, byTag, citedBy]);

  const selectRule = (ruleId: string | null) => setSelectedRuleId(ruleId);

  /* ------------------------------- Header -------------------------------- */
  const record = diagnosis.record;
  // One machine condition everywhere: the same source as the header on every machine page.
  const live = useLiveMachineStatus(machine.id, { health: machine.health, status: machine.status });
  const condition = toCondition(live.status);
  const conditionTone: Tone = toneOfCondition(condition);

  const leadTag = lead?.tags[0] ?? null;
  const kpis = diagnosisKpis({ frame, alarms, open, sensors, loading: (diagnosis.loading && !frame) || catalog.isLoading });

  const raised = alarms.filter((a) => a.state !== "confirming");
  const alarmTone: Tone = raised.some((a) => a.severity === "Critical") ? "bad" : raised.length ? "warn" : "idle";
  const evidenceTone: Tone = sensors.some((x) => x.validity === "invalid" || x.validity === "stale")
    ? "bad"
    : sensors.some((x) => x.validity === "suspect")
      ? "warn"
      : "idle";

  const show = {
    alarms: frame !== null,
    diagnosis: open.length > 0 || frame !== null || modes.length > 0,
    evidence: sensors.length > 0,
  };
  const indexItems: SectionIndexItem[] = [
    ...(show.alarms ? [{ id: "dx-alarms", label: "Alarms", tone: alarmTone }] : []),
    ...(show.diagnosis ? [{ id: "dx-diagnosis", label: "Diagnosis" }] : []),
    ...(show.evidence ? [{ id: "dx-evidence", label: "Evidence", tone: evidenceTone }] : []),
  ];

  const scopeChip = selectedRuleId ? (
    <span className="pg-diag-scope">
      <button type="button" className="dxo-filter-chip" onClick={() => scrollToSection("dx-evidence")} title="Show the evidence for this rule">
        {selectedRuleId}
      </button>
      <button type="button" className="dxo-icon-btn" aria-label={`Clear selection ${selectedRuleId}`} onClick={() => setSelectedRuleId(null)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </span>
  ) : null;

  const meta: PageMetaItem[] = frame
    ? [
        { label: "Rules", value: String(frame.rules.length) },
        { label: "Sampling", value: "1 / plant min (sim.)" },
        { label: "Evaluated", value: fmtT(frame.t), title: tz.label },
      ]
    : record
      ? [
          { label: "Source", value: "Stored AssetIQ record" },
          { label: "Engine", value: record.engineVersion },
        ]
      : [{ label: "Source", value: diagnosis.loading ? "Loading diagnosis…" : "None" }];

  return (
    <div className="dxo-root ast-root pg-frame pg-diag" aria-label="Diagnosis">
      <PageHeader
        title="Diagnosis"
        status={{ label: condition, tone: conditionTone }}
        meta={meta}
        actions={
          leadTag ? (
            <PillButton variant="secondary" onClick={() => openTrend(leadTag)}>
              {`Trend ${leadTag}`}
            </PillButton>
          ) : undefined
        }
      />

      <KpiStrip page items={kpis} label="Diagnosis status" />

      {indexItems.length > 1 && <SectionIndex items={indexItems} label="Diagnosis sections" pendingKey={DIAGNOSIS_SECTION_KEY} right={scopeChip} />}

      {show.alarms && frame && (
        <Section bare id="dx-alarms" title="Alarms">
          <AlarmCards
            alarms={alarms}
            shelved={activeShelves}
            t={frame.t}
            fmtT={fmtT}
            byTag={byTag}
            selectedRuleId={selectedRuleId}
            onSelect={(id) => selectRule(id)}
            onAcknowledge={acknowledge}
            onShelve={shelve}
            onUnshelve={unshelve}
            workOrders={opsOn ? ops.workOrders : null}
            onWorkOrder={opsOn ? (id) => void ops.createWorkOrder(id) : undefined}
          />
        </Section>
      )}

      {show.diagnosis && (
        <Section bare id="dx-diagnosis" title="Diagnosis">
          {open.length > 0 ? (
            <FaultCandidates
              findings={open}
              live={frame !== null}
              byTag={byTag}
              onsetOf={onsetOf}
              focusRuleId={focusRuleId}
              selectedRuleId={selectedRuleId}
              onSelect={(id) => selectRule(id)}
              feedback={feedback}
              onFeedback={giveFeedback}
              onAnalysis={() => go("analysis")}
              onPrognosis={() => go("prognosis")}
            />
          ) : (
            <p className="pg-diag-missing">No machine fault present.</p>
          )}
        </Section>
      )}

      {show.evidence && (
        <Section bare id="dx-evidence" title="Evidence">
          <EvidenceCards
            sensors={evidence}
            allSensors={sensors}
            frame={frame}
            scopeLabel={selectedRuleId}
            citedBy={citedBy}
            onClearScope={() => setSelectedRuleId(null)}
            onOpenTrend={openTrend}
            onOpenSensor={openSensor}
            loading={catalog.isLoading}
          />
        </Section>
      )}

      {!frame && !diagnosis.loading && !catalog.isLoading && sensors.length === 0 && !record && (
        <p className="pg-diag-missing">No mapped sensors, live rule engine or stored diagnosis record for this machine.</p>
      )}
    </div>
  );
}
