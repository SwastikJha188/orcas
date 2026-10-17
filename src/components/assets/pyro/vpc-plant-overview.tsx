"use client";

import React, { useState } from "react";
import { PillButton, Table, type Column } from "@/components/ui";
import { StatusTag } from "../assets-shell-ui";
import { useKilnFleet } from "@/providers/kiln-simulation-context";
import type { AssetsSubPage } from "../assets-view";
import { focusSensorOn } from "../sensor-focus";
import { DIAGNOSIS_RULE_KEY } from "../diagnosis-view";
import {
  VPC_CRITICAL_AREAS,
  VPC_DEMO_OPERATING_CASE,
  VPC_MACHINE_ID,
  VPC_MACHINES,
  VPC_PROCESS_STAGES,
  VPC_VARIANTS,
  type VpcCriticalAreaSpec,
  type VpcProcessStageSpec,
  type VpcVariantRow,
} from "@/lib/vpc-sim/signals";
import { conditionTone, toCondition } from "@/components/ui/status";
import { VPC_COMBINED_FAULT_TABLE, type VpcCombinedRuleSpec } from "@/lib/vpc-sim/rules";
import { LineSheet, lineSheetCaption, lineSheetHeading } from "./line-sheets/line-sheet";
import { LINE_SHEETS } from "./line-sheets";

const VPC_SHEETS = LINE_SHEETS.filter((s) => s.group === "V");

const OPERATING_CASE_ROWS = [
  { key: "Machine basis", value: VPC_DEMO_OPERATING_CASE.machineBasis },
  { key: "Alloy & batch", value: VPC_DEMO_OPERATING_CASE.alloyBatch },
  { key: "Melt target", value: VPC_DEMO_OPERATING_CASE.meltTarget },
  { key: "Flask vacuum", value: VPC_DEMO_OPERATING_CASE.flaskVacuum },
  { key: "Upper casting pressure", value: VPC_DEMO_OPERATING_CASE.upperPressure },
  { key: "Gas regulation", value: VPC_DEMO_OPERATING_CASE.gasRegulation },
  { key: "Cooling-water loop", value: VPC_DEMO_OPERATING_CASE.cooling },
  { key: "Vacuum pump baseline", value: VPC_DEMO_OPERATING_CASE.pumpCondition },
  { key: "Induction heating power", value: VPC_DEMO_OPERATING_CASE.inductionPower },
];

const OPERATING_CASE_COLS: Column<(typeof OPERATING_CASE_ROWS)[number]>[] = [
  { key: "k", header: "Parameter", width: "180px", render: (r) => <strong>{r.key}</strong> },
  { key: "v", header: "Target / Baseline", render: (r) => <span className="ast-num">{r.value}</span> },
];

const VARIANT_COLS: Column<VpcVariantRow>[] = [
  { key: "item", header: "Specification", render: (r) => <strong>{r.item}</strong> },
  { key: "classic", header: "VPC 066 Classic", render: (r) => <span className="ast-num">{r.classic}</span> },
  { key: "power", header: "VPC 066 Power", render: (r) => <span className="ast-num">{r.power}</span> },
  { key: "supreme", header: "VPC 066 Supreme", render: (r) => <span className="ast-num">{r.supreme}</span> },
];

const STAGE_COLS: Column<VpcProcessStageSpec>[] = [
  { key: "step", header: "Stage", width: "70px", render: (r) => <span className="ast-num">{r.step}</span> },
  { key: "stage", header: "Process stage", width: "170px", render: (r) => <strong>{r.stage}</strong> },
  { key: "subsystem", header: "Subsystem", width: "220px", render: (r) => r.subsystem },
  { key: "action", header: "Operation", render: (r) => r.action },
  { key: "evidence", header: "Monitored sensors", width: "230px", render: (r) => <span className="ast-num">{r.evidence}</span> },
];

const CRITICAL_COLS: Column<VpcCriticalAreaSpec>[] = [
  { key: "area", header: "Subsystem", width: "170px", render: (r) => <strong>{r.area}</strong> },
  { key: "role", header: "Role in casting", render: (r) => r.role },
  { key: "failureModes", header: "What can go wrong & impact", render: (r) => r.failureModes },
  { key: "evidence", header: "Sensors", render: (r) => <span className="ast-num">{r.evidence}</span> },
];

export function VpcPlantOverview({ onOpenMachine }: { onOpenMachine: (machineId: string, subPage: AssetsSubPage) => void }) {
  const fleet = useKilnFleet();
  const [selectedMachineId, setSelectedMachineId] = useState<string>(VPC_MACHINE_ID);
  const frame = fleet[selectedMachineId]?.frame ?? fleet[VPC_MACHINE_ID]?.frame ?? null;
  const [sheetId, setSheetId] = useState<string>("V-0");

  const unitRows = VPC_MACHINES.map((m) => {
    const f = fleet[m.id]?.frame;
    const activeRule = f?.rules.find((r) => r.status === "ACTIVE" && r.category !== "Service life");
    return {
      id: m.id,
      name: m.name,
      health: f ? Math.round(f.overall) : 99,
      condition: f?.condition ?? "Healthy",
      t1: f?.signals.T1?.display ?? "1000",
      p2: f?.signals.P2?.display ?? "-0.90",
      p1: f?.signals.P1?.display ?? "1.80",
      f1: f?.signals.F1?.display ?? "4.5",
      activeAlert: activeRule ? `${activeRule.id} · ${activeRule.name}` : "All 16 signals within normal limits",
    };
  });

  const unitCols: Column<(typeof unitRows)[number]>[] = [
    { key: "id", header: "Unit", width: "100px", render: (r) => <strong className="ast-mono">{r.id}</strong> },
    { key: "name", header: "Machine", width: "250px", render: (r) => r.name },
    {
      key: "cond",
      header: "Condition",
      width: "120px",
      render: (r) => <StatusTag tone={conditionTone(r.condition)} label={toCondition(r.condition)} />,
    },
    { key: "health", header: "Health", width: "90px", render: (r) => <span className="ast-num">{r.health}%</span> },
    { key: "t1", header: "Melt T1", width: "95px", render: (r) => <span className="ast-num">{r.t1} °C</span> },
    { key: "p2", header: "Flask P2", width: "105px", render: (r) => <span className="ast-num">{r.p2} bar</span> },
    { key: "p1", header: "Upper P1", width: "105px", render: (r) => <span className="ast-num">{r.p1} bar</span> },
    { key: "f1", header: "Water F1", width: "105px", render: (r) => <span className="ast-num">{r.f1} L/min</span> },
    { key: "alert", header: "Live status / active rule", render: (r) => r.activeAlert },
  ];

  const ruleCols: Column<VpcCombinedRuleSpec>[] = [
    {
      key: "id",
      header: "Rule",
      width: "120px",
      render: (r) => {
        const live = frame?.rules.find((x) => x.id === r.id);
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span className="ast-mono">{r.id}</span>
            {live?.status === "ACTIVE" && <StatusTag tone={live.severity === "Critical" ? "bad" : "warn"} label={live.severity} />}
          </span>
        );
      },
    },
    { key: "pattern", header: "Sensor condition", width: "250px", render: (r) => <span className="ast-num">{r.pattern}</span> },
    { key: "meaning", header: "What is wrong", width: "240px", render: (r) => <strong>{r.meaning}</strong> },
    { key: "action", header: "Action to take", render: (r) => r.action },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* 3-Machine Casting Cell Fleet Table */}
      <section className="ast-card pg-table-card" aria-label="Casting Cell Machines">
        <div className="ast-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <h2 className="ast-card-title">Casting Cell Units (3 × Schultheiss VPC 066)</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {VPC_MACHINES.map((m) => {
              const cond = fleet[m.id]?.frame?.condition ?? "Healthy";
              return (
                <PillButton
                  key={m.id}
                  variant={selectedMachineId === m.id ? "primary" : "secondary"}
                  onClick={() => setSelectedMachineId(m.id)}
                >
                  {m.id} · {toCondition(cond)}
                </PillButton>
              );
            })}
          </div>
        </div>
        <Table
          columns={unitCols}
          data={unitRows}
          keyExtractor={(r) => r.id}
          onRowClick={(r) => onOpenMachine(r.id, "overview")}
        />
      </section>

      {/* Interactive V-0 … V-7 Diagram Pack */}
      <section className="ast-card" aria-label="VPC 066 schematic and detail sheets">
        <div className="ast-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 className="ast-card-title">
              {selectedMachineId} · {lineSheetHeading(sheetId).replace(/^VPC-066 · /, "")}
            </h2>
            <div className="ast-caption">{lineSheetCaption(sheetId)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <PillButton variant="primary" onClick={() => onOpenMachine(selectedMachineId, "overview")}>
              Machine Overview
            </PillButton>
            <PillButton variant="secondary" onClick={() => onOpenMachine(selectedMachineId, "sensors")}>
              Sensors
            </PillButton>
            <PillButton variant="secondary" onClick={() => onOpenMachine(selectedMachineId, "diagnosis")}>
              Diagnosis
            </PillButton>
            <PillButton variant="secondary" onClick={() => onOpenMachine(selectedMachineId, "prognosis")}>
              Prognosis
            </PillButton>
            <PillButton variant="secondary" onClick={() => onOpenMachine(selectedMachineId, "analysis")}>
              Analysis
            </PillButton>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {VPC_SHEETS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="hx-crumb"
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                background: sheetId === s.id ? "var(--surface-raised)" : "transparent",
                fontWeight: sheetId === s.id ? 600 : 400,
              }}
              onClick={() => setSheetId(s.id)}
            >
              {s.id} · {s.kind === "overview" ? "Overview" : s.title.split(":")[0]}
            </button>
          ))}
        </div>
        <LineSheet
          sheetId={sheetId}
          machineId={selectedMachineId}
          frame={frame}
          onOpenSheet={(id) => setSheetId(id)}
          onOpenMachine={(mId) => onOpenMachine(mId, "overview")}
          onSelectTag={(tag) => {
            if (tag) focusSensorOn("sensors", tag);
            onOpenMachine(selectedMachineId, "sensors");
          }}
        />
      </section>

      {/* Operating Case Table + Machine Variants Table */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
        <section className="ast-card pg-table-card" aria-label="Operating Case">
          <div className="ast-card-head">
            <h2 className="ast-card-title">Operating Baseline (VPC 066 Power · 18 kt Gold)</h2>
          </div>
          <Table columns={OPERATING_CASE_COLS} data={OPERATING_CASE_ROWS} keyExtractor={(r) => r.key} />
        </section>

        <section className="ast-card pg-table-card" aria-label="Machine Variants">
          <div className="ast-card-head">
            <h2 className="ast-card-title">Machine Variants (Classic · Power · Supreme)</h2>
          </div>
          <Table columns={VARIANT_COLS} data={[...VPC_VARIANTS]} keyExtractor={(r) => r.item} />
        </section>
      </div>

      {/* 8 Process Stages Table */}
      <section className="ast-card pg-table-card" aria-label="Process Stages">
        <div className="ast-card-head">
          <h2 className="ast-card-title">Casting Process Sequence (8 Stages)</h2>
        </div>
        <Table columns={STAGE_COLS} data={[...VPC_PROCESS_STAGES]} keyExtractor={(r) => String(r.step)} />
      </section>

      {/* Critical Subsystems & Failure Modes Table */}
      <section className="ast-card pg-table-card" aria-label="Critical Subsystems">
        <div className="ast-card-head">
          <h2 className="ast-card-title">Critical Subsystems &amp; Failure Modes</h2>
        </div>
        <Table columns={CRITICAL_COLS} data={[...VPC_CRITICAL_AREAS]} keyExtractor={(r) => r.area} />
      </section>

      {/* Diagnostic Rules Table */}
      <section className="ast-card pg-table-card" aria-label="Diagnostic Rules">
        <div className="ast-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <h2 className="ast-card-title">Diagnostic Rules (R-VPC-01 – R-VPC-10) · {selectedMachineId}</h2>
          <PillButton variant="secondary" onClick={() => onOpenMachine(selectedMachineId, "diagnosis")}>
            Open Diagnosis
          </PillButton>
        </div>
        <Table
          columns={ruleCols}
          data={[...VPC_COMBINED_FAULT_TABLE]}
          keyExtractor={(r) => r.id}
          onRowClick={(r) => {
            try {
              sessionStorage.setItem(DIAGNOSIS_RULE_KEY, r.id);
            } catch {
              /* storage unavailable */
            }
            onOpenMachine(selectedMachineId, "diagnosis");
          }}
        />
      </section>
    </div>
  );
}
