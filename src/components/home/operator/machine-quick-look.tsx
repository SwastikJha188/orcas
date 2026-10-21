"use client";

import React, { useEffect, useMemo } from "react";
import { Loading, PillButton } from "@/components/ui";
import { StatusTag } from "@/components/ui/status-tag";
import { conditionTone, toCondition, type Tone, VALIDITY_WORDS } from "@/components/ui/status";
import type { AssetMachine } from "@/components/assets/assets-data";
import type { AssetsSubPage } from "@/components/assets/assets-view";
import { KpiStrip, Section, type KpiItem } from "@/components/assets/analysis/an-ui";
import { useMachineCatalog } from "@/components/assets/use-machine-catalog";
import { useMachineInsights } from "@/components/assets/use-machine-insights";
import { dxSensorsFromFrame, toDxSensors } from "@/components/assets/diagnosis-model";
import { buildSensorRows, diagnosisTotals, inDefinitionOrder } from "@/components/assets/diagnosis-rows";
import { bandOf, kilnHealthModel, storedHealthModel } from "@/components/assets/health-derive";
import { buildIssues, unexplained } from "@/components/assets/analysis/an-issues";
import {
  durationText,
  failureChance,
  FAILURE_HORIZONS,
  rangeText,
  rulRows,
} from "@/components/assets/prognosis/prognosis-derive";
import { DIAGNOSIS_SUB_KEY, focusLayer } from "@/components/assets/sensor-focus";
import { isLiveMachine, useKilnSimulationFor, useLiveMachineStatus, useLivePlantStarting } from "@/providers/kiln-simulation-context";
import { useHealthBands } from "@/lib/reference-data";
import { defsFor } from "@/lib/live-defs";
import { displayName } from "@/lib/display-name";
import "./machine-quick-look.css";

/* ==========================================================================
   Machine quick look — opened by clicking a machine on the PYR-0 line sheet.

   One glance at the four machine pages without leaving the line: health,
   alarms, sensors in alarm, next failure (KPI strip), then one card per page
   — Diagnosis (sub-assembly health), Sensors (validity + those in alarm),
   Prognosis (failure chance, next failure, health ahead), Analysis (open
   issues). Every number comes from the same derivations as the full pages.
   ========================================================================== */

const LIST_CAP = 5;

export function MachineQuickLook({
  machine,
  onClose,
  onOpenPage,
  onOpenOperator,
}: {
  machine: AssetMachine;
  onClose: () => void;
  onOpenPage: (page: AssetsSubPage) => void;
  onOpenOperator: () => void;
}) {
  const frame = useKilnSimulationFor(machine.id)?.frame ?? null;
  const live = useLiveMachineStatus(machine.id, { health: machine.health, status: machine.status });
  const condition = toCondition(live.status);
  const bands = useHealthBands(machine.healthModelId);
  const catalog = useMachineCatalog(machine);
  const insights = useMachineInsights(machine);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* ----------------------------- Diagnosis ------------------------------ */
  const defs = frame?.defs ?? defsFor(machine.id);
  const sensors = useMemo(
    () =>
      inDefinitionOrder(
        catalog.sensors.length === 0 && frame ? dxSensorsFromFrame(frame) : toDxSensors(catalog.sensors, frame?.defs ?? null),
        defs,
      ),
    [catalog.sensors, frame, defs],
  );
  const noAcks = useMemo(() => new Set<string>(), []);
  const rows = useMemo(() => buildSensorRows(sensors, frame, noAcks), [sensors, frame, noAcks]);
  const totals = useMemo(() => diagnosisTotals(frame, noAcks, sensors), [frame, noAcks, sensors]);
  const health = useMemo(() => (frame ? kilnHealthModel(frame, catalog) : storedHealthModel(catalog)), [frame, catalog]);
  const alarmRows = rows.filter((r) => r.inAlarm);

  /* ----------------------------- Prognosis ------------------------------ */
  const data = insights.data?.prognosis ?? null;
  const analysis = insights.data?.analysis ?? null;
  // A live machine shows the stored snapshot until its engine starts: wait for the live estimate.
  const rul = useMemo(
    () => (data && (frame || !isLiveMachine(machine.id)) ? rulRows(data, analysis) : []),
    [data, analysis, frame, machine.id],
  );
  const timed = rul.flatMap((r) => (r.hours !== null && r.band ? [{ ...r, hours: r.hours, band: r.band }] : []));
  const next = timed.length ? timed.reduce((a, r) => (r.hours < a.hours ? r : a), timed[0]) : null;
  const chance = timed.length ? FAILURE_HORIZONS.map((h) => Math.max(...timed.map((r) => failureChance(r.band, h.hours)))) : null;
  const pts = data?.condition.points ?? [];
  const at30 = pts.find((p) => p.day >= 30) ?? pts[pts.length - 1] ?? null;

  /* ------------------------------ Analysis ------------------------------ */
  const issues = useMemo(() => buildIssues(frame, rul, defs), [frame, rul, defs]);
  const unknown = useMemo(() => (frame ? unexplained(frame) : []), [frame]);

  /* ------------------------------ Loading ------------------------------- */
  // Until the readings, the live checks and the estimates are in, nothing here reads as "none" or 0.
  const starting = useLivePlantStarting() && !frame && isLiveMachine(machine.id);
  const sensorsLoading = (catalog.isLoading && catalog.sensors.length === 0) || starting;
  const estimatesLoading = (insights.isLoading && !insights.data) || (isLiveMachine(machine.id) && !frame && Boolean(data));

  /* -------------------------------- KPIs -------------------------------- */
  const score = live.health === null ? null : Math.round(live.health);
  const scoreBand = score === null ? null : bandOf(score, bands);
  const kpis: KpiItem[] = [
    {
      label: "Health",
      value: score === null ? "—" : String(score),
      unit: score === null ? undefined : "/100",
      bar: score ?? undefined,
      tone: scoreBand === "Critical" ? "bad" : scoreBand === "Alert" ? "warn" : undefined,
      foot: condition,
      loading: score === null && sensorsLoading,
    },
    {
      label: "Problems found",
      value: frame ? String(totals.active) : "—",
      foot: frame ? `${totals.confirming} more being checked` : "No live checks on this machine",
      tone: totals.active ? "bad" : undefined,
      loading: starting,
    },
    {
      label: "Sensors out of range",
      value: String(alarmRows.length),
      unit: `/ ${sensors.length}`,
      foot: `${totals.invalid} with bad readings · ${totals.suspect} doubtful`,
      tone: alarmRows.length ? "bad" : undefined,
      loading: sensorsLoading,
    },
    next
      ? { label: "Next likely failure", value: durationText(next.hours), text: true, foot: displayName(next.name), tone: next.status === "Critical" ? "bad" : next.status === "Alert" ? "warn" : undefined }
      : { label: "Next likely failure", value: "—", text: true, foot: rul.length ? "Nothing is wearing out" : "No estimate yet", loading: estimatesLoading },
  ];

  const openSub = (name: string) => {
    try {
      sessionStorage.setItem(DIAGNOSIS_SUB_KEY, name);
    } catch {
      /* storage unavailable */
    }
    onOpenPage("diagnosis");
  };
  const openIssue = (ruleId: string | null, where: string) => {
    if (ruleId) focusLayer({ ruleId, component: where, section: "an-diagnosis" });
    else focusLayer({ component: where, section: "an-diagnosis" });
    onOpenPage("analysis");
  };
  const openLink = (page: AssetsSubPage, label: string) => (
    <button type="button" className="mql-open" onClick={() => onOpenPage(page)}>
      {label} →
    </button>
  );

  const validity = [
    { key: "valid", label: VALIDITY_WORDS.Valid, n: sensors.length - totals.invalid - totals.suspect, tone: "idle" as Tone },
    { key: "suspect", label: VALIDITY_WORDS.Suspect, n: totals.suspect, tone: "warn" as Tone },
    { key: "invalid", label: VALIDITY_WORDS.Invalid, n: totals.invalid - totals.stale, tone: "bad" as Tone },
    { key: "stale", label: VALIDITY_WORDS.Stale, n: totals.stale, tone: "bad" as Tone },
  ];

  return (
    <div
      className="opc-trend-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${machine.name} summary`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="opc-detail-modal mql">
        <div className="opc-detail-modal-head">
          <div className="opc-detail-modal-title-wrap">
            <strong className="opc-detail-modal-title">{displayName(machine.name)}</strong>
            <span className="mql-code ast-num">{machine.id}</span>
            <StatusTag tone={conditionTone(condition)} label={condition} />
          </div>
          <div className="opc-detail-modal-actions">
            <PillButton variant="secondary" onClick={onOpenOperator}>
              Go to machine →
            </PillButton>
            <PillButton variant="secondary" onClick={onClose}>
              Close ×
            </PillButton>
          </div>
        </div>

        <div className="opc-detail-modal-body assets-machine-workspace mql-body">
          <KpiStrip page items={kpis} label={`${machine.name} summary`} />

          <div className="mql-grid">
            <Section id="mql-diagnosis" title="Health of each part" right={openLink("diagnosis", "Diagnosis")}>
              {health.subs.length === 0 ? (
                sensorsLoading ? <Loading label="Loading the parts…" rows={3} /> : <p className="mql-empty">No part has a health score yet</p>
              ) : (
                <ul className="mql-list is-cols">
                  {health.subs.map((sub) => {
                    const h = sub.scored && sub.health !== null ? Math.round(sub.health) : null;
                    const b = h === null ? null : bandOf(h, bands);
                    const tone = b === "Critical" ? "bad" : b === "Alert" ? "warn" : undefined;
                    return (
                      <li key={sub.id}>
                        <button type="button" className="mql-row" data-tone={tone} onClick={() => openSub(sub.name)}>
                          <span className="mql-name">{displayName(sub.name)}</span>
                          <span className="mql-bar" aria-hidden="true">
                            <i style={{ width: `${h ?? 0}%` }} />
                          </span>
                          <span className="mql-val ast-num">{h ?? "—"}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Section id="mql-sensors" title="Sensors" right={openLink("sensors", "Sensors")}>
              <div className="mql-validity" role="img" aria-label={validity.map((v) => `${v.n} ${v.label}`).join(", ")}>
                {validity.map((v) =>
                  v.n > 0 ? <i key={v.key} data-tone={v.tone} style={{ flexGrow: v.n }} /> : null,
                )}
              </div>
              <div className="mql-legend">
                {validity.map((v) => (
                  <span key={v.key} data-tone={v.n > 0 && v.tone !== "idle" ? v.tone : undefined}>
                    <b className="ast-num">{v.n}</b> {v.label}
                  </span>
                ))}
              </div>
              {alarmRows.length === 0 ? (
                sensorsLoading ? <Loading label="Loading the readings…" rows={2} /> : <p className="mql-empty">All sensors are in their normal range</p>
              ) : (
                <ul className="mql-list">
                  {alarmRows.slice(0, LIST_CAP).map((r) => (
                    <li key={r.s.tag} className="mql-row is-static" data-tone="bad">
                      <span className="mql-name">{displayName(r.s.name)}</span>
                      <span className="mql-val ast-num">
                        {r.s.display}
                        {r.s.unit && <small> {r.s.unit}</small>}
                      </span>
                    </li>
                  ))}
                  {alarmRows.length > LIST_CAP && <li className="mql-more">{alarmRows.length - LIST_CAP} more {alarmRows.length - LIST_CAP === 1 ? "sensor" : "sensors"} out of range</li>}
                </ul>
              )}
            </Section>

            <Section id="mql-prognosis" title="What may fail next" right={openLink("prognosis", "Prognosis")}>
              <span className="mql-caption">Chance of a breakdown within</span>
              <div className="mql-facts">
                {FAILURE_HORIZONS.map((h, i) => {
                  const v = chance ? chance[i] : null;
                  const tone = v === null ? undefined : v >= 50 ? "bad" : v > 0 ? "warn" : undefined;
                  return (
                    <div key={h.id} className="mql-fact" data-tone={tone}>
                      <span className="mql-fact-label">{h.label}</span>
                      <span className="mql-fact-value ast-num">
                        {v === null ? "—" : v}
                        {v !== null && <small>%</small>}
                      </span>
                    </div>
                  );
                })}
              </div>
              <dl className="mql-dl">
                <div>
                  <dt>Next likely failure</dt>
                  <dd>{next ? `${displayName(next.name)} · ${rangeText(next.band.lo, next.band.hi)}` : "—"}</dd>
                </div>
                <div>
                  <dt>Health in {at30?.day ?? 30} days</dt>
                  <dd className="ast-num">
                    {at30 ? `${Math.round(pts[0]?.overall ?? at30.overall)} → ${Math.round(at30.overall)}` : "—"}
                  </dd>
                </div>
              </dl>
            </Section>

            <Section id="mql-analysis" title="Why it is happening" right={openLink("analysis", "Analysis")}>
              {issues.length === 0 ? (
                starting || estimatesLoading ? (
                  <Loading label="Loading the analysis…" rows={2} />
                ) : (
                  <p className="mql-empty">{frame ? "No problems found or expected" : "No live checks on this machine"}</p>
                )
              ) : (
                <ul className="mql-list">
                  {issues.slice(0, LIST_CAP).map((i) => (
                    <li key={i.key}>
                      <button
                        type="button"
                        className="mql-row is-issue"
                        data-tone={i.kind === "fault" ? "bad" : "warn"}
                        onClick={() => openIssue(i.rule?.id ?? null, i.where)}
                      >
                        <span className="ast-chip-dot" aria-hidden="true" />
                        <span className="mql-issue">
                          <span className="mql-name" title={i.kind === "fault" && i.rule?.plainTitle ? i.title : undefined}>{i.kind === "fault" ? (i.rule?.plainTitle ?? i.title) : `May wear out soon: ${displayName(i.title)}`}</span>
                          {i.kind === "fault" && <span className="mql-where">{displayName(i.where)}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                  {issues.length > LIST_CAP && <li className="mql-more">{issues.length - LIST_CAP} more {issues.length - LIST_CAP === 1 ? "problem" : "problems"}</li>}
                </ul>
              )}
              <dl className="mql-dl">
                <div>
                  <dt>Odd readings with no known cause</dt>
                  <dd className="ast-num">{frame ? `${unknown.length} sensors` : "—"}</dd>
                </div>
              </dl>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
