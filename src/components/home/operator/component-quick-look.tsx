"use client";

/**
 * Sub-assembly quick look — opened by clicking a component's health badge on
 * the PYR-0 line sheet (the machine's own chip / drawing opens the machine
 * quick look instead). Health, alarms and sensors of that one sub-assembly,
 * from the live frame; links to its sheet on the machine and to Diagnosis.
 */
import React, { useEffect, useMemo } from "react";
import { PillButton } from "@/components/ui";
import { StatusTag } from "@/components/ui/status-tag";
import { conditionTone, toCondition, type Tone } from "@/components/ui/status";
import type { AssetMachine } from "@/components/assets/assets-data";
import type { AssetsSubPage } from "@/components/assets/assets-view";
import { KpiStrip, Section, type KpiItem } from "@/components/assets/analysis/an-ui";
import { LINE_SHEET_BY_ID, lineSheetsForTags } from "@/components/assets/pyro/line-sheets";
import { useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { isConditionRule } from "@shared/lib/plant-defs";
import { defsFor } from "@/lib/live-defs";
import { displayName, nameIds } from "@/lib/display-name";
import "./machine-quick-look.css";

const sevTone = (s: string | null | undefined): Tone | undefined => (s === "Critical" ? "bad" : s === "Alert" ? "warn" : undefined);

export function ComponentQuickLook({
  machine,
  subId,
  onClose,
  onOpenMachine,
  onOpenPage,
  onOpenSheet,
}: {
  machine: AssetMachine;
  subId: string;
  onClose: () => void;
  /** The machine's own quick look. */
  onOpenMachine: () => void;
  onOpenPage: (page: AssetsSubPage) => void;
  /** Operator view of the machine on this sub-assembly's sheet. */
  onOpenSheet: (sheetId: string) => void;
}) {
  const frame = useKilnSimulationFor(machine.id)?.frame ?? null;
  const defs = frame?.defs ?? defsFor(machine.id);
  const cell = frame?.subs[subId] ?? null;
  const name = displayName(cell?.name ?? defs?.subassemblies.find((s) => s.id === subId)?.name ?? subId);
  const condition = toCondition(cell?.status ?? null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const signals = useMemo(() => (defs?.signals ?? []).filter((s) => s.sub === subId), [defs, subId]);
  const rows = signals.map((def) => {
    const live = frame?.signals[def.tag];
    const unit = def.unit === "state" ? "" : def.unit;
    return { def, display: live?.display ?? "—", unit: live ? unit : "", status: live?.status ?? null, quality: live?.quality ?? null };
  });
  const inAlarm = rows.filter((r) => r.status && r.status !== "Normal").length;
  const notGood = rows.filter((r) => r.quality && r.quality !== "Good").length;
  const alarms = (frame?.rules ?? []).filter((r) => r.status === "ACTIVE" && r.severity !== "Normal" && isConditionRule(r) && r.subs.includes(subId));
  const sheet = useMemo(
    () => lineSheetsForTags(signals.map((s) => s.tag)).find((id) => LINE_SHEET_BY_ID[id]?.kind === "detail") ?? null,
    [signals],
  );

  const health = cell ? Math.round(cell.health) : null;
  const kpis: KpiItem[] = [
    { label: "Health", value: health === null ? "—" : String(health), unit: health === null ? undefined : "/100", bar: health ?? undefined, tone: sevTone(cell?.status), foot: condition },
    { label: "Problems found", value: frame ? String(alarms.length) : "—", tone: alarms.length ? "bad" : undefined, foot: frame ? "By the system's automatic checks" : "No live checks on this machine" },
    { label: "Sensors out of range", value: String(inAlarm), unit: `/ ${rows.length}`, tone: inAlarm ? "bad" : undefined, foot: `${notGood} ${notGood === 1 ? "sensor" : "sensors"} with bad readings` },
  ];

  // The shared component selection (set by onOpenPage's caller) filters Diagnosis.
  const openDiagnosis = () => onOpenPage("diagnosis");

  return (
    <div
      className="opc-trend-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} summary`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="opc-detail-modal mql mql-part">
        <div className="opc-detail-modal-head">
          <div className="opc-detail-modal-title-wrap">
            <strong className="opc-detail-modal-title">{name}</strong>
            <button type="button" className="mql-open" onClick={onOpenMachine}>
              {displayName(machine.name)}
            </button>
            <StatusTag tone={conditionTone(condition)} label={condition} />
          </div>
          <div className="opc-detail-modal-actions">
            {sheet && (
              <PillButton variant="secondary" onClick={() => onOpenSheet(sheet)}>
                Show on machine →
              </PillButton>
            )}
            <PillButton variant="secondary" onClick={onClose}>
              Close ×
            </PillButton>
          </div>
        </div>

        <div className="opc-detail-modal-body assets-machine-workspace mql-body">
          <KpiStrip page items={kpis} label={`${name} summary`} />

          <div className="mql-grid mql-grid-part">
            <Section
              id="mql-part-sensors"
              title="Sensors"
              right={
                <button type="button" className="mql-open" onClick={openDiagnosis}>
                  See what is wrong →
                </button>
              }
            >
              {rows.length === 0 ? (
                <p className="mql-empty">No sensors on this part</p>
              ) : (
                <ul className="mql-list">
                  {rows.map((r) => (
                    <li key={r.def.tag} className="mql-row is-static mql-part-row" data-tone={sevTone(r.status)}>
                      <span className="mql-name" title={r.def.name}>
                        {displayName(r.def.name)}
                      </span>
                      <span className="mql-band ast-num" title={`Normal range: ${r.def.normalBand}`}>{r.def.normalBand}</span>
                      <span className="mql-val ast-num">
                        {r.display}
                        {r.unit && <small> {r.unit}</small>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section id="mql-part-alarms" title="Problems">
              {alarms.length === 0 ? (
                <p className="mql-empty">{frame ? "No problems right now" : "No live checks on this machine"}</p>
              ) : (
                <ul className="mql-list">
                  {alarms.map((r) => (
                    <li key={r.id} className="mql-row is-static is-issue" data-tone={sevTone(r.severity)}>
                      <span className="mql-issue">
                        <span className="mql-name" title={r.plainTitle ? r.name : undefined}>{r.plainTitle ?? r.name}</span>
                        <span className="mql-where">{nameIds(r.evidence, defs)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
