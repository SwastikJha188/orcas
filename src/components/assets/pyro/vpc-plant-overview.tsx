"use client";

import React from "react";
import { useKilnFleet } from "@/providers/kiln-simulation-context";
import type { AssetsSubPage } from "../assets-view";
import { focusSensorOn } from "../sensor-focus";
import { VPC_MACHINE_ID } from "@/lib/vpc-sim/signals";
import { LineSheet, lineSheetCaption, lineSheetHeading } from "./line-sheets/line-sheet";

export function VpcPlantOverview({ onOpenMachine }: { onOpenMachine: (machineId: string, subPage: AssetsSubPage) => void }) {
  const fleet = useKilnFleet();
  const selectedMachineId = VPC_MACHINE_ID;
  const frame = fleet[selectedMachineId]?.frame ?? null;
  const sheetId = "V-0";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Schematic Diagram */}
      <section className="ast-card" aria-label="VPC 066 schematic">
        <div className="ast-card-head">
          <div>
            <h2 className="ast-card-title">
              {selectedMachineId} · {lineSheetHeading(sheetId).replace(/^VPC-066 · /, "")}
            </h2>
            <div className="ast-caption">{lineSheetCaption(sheetId)}</div>
          </div>
        </div>
        <div className="lsh-host">
          <div className="lsh lsh-overview">
            <div className="lsh-draw mx-canvas">
              <LineSheet
                sheetId={sheetId}
                machineId={selectedMachineId}
                frame={frame}
                drawingOnly
                onOpenMachine={(mId) => onOpenMachine(mId, "overview")}
                onSelectTag={(tag) => {
                  if (tag) focusSensorOn("sensors", tag);
                  onOpenMachine(selectedMachineId, "sensors");
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
