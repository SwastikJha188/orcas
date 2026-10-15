"use client";

import React from "react";
import type { AssetMachine } from "./assets-data";
import type { KilnSimulation } from "./kiln-seals-simulation";
import { OverviewPage } from "./overview-page";

/** Shared with the Home machine twin (re-exported for existing imports). */
export { useMachineOverview } from "./overview-data";

export interface MachineDiagramProps {
  machine: AssetMachine;
  /** Optional; the page navigates through the data context when omitted. */
  onNavigateToDiagnosis?: () => void;
  simulation?: KilnSimulation;
}

/**
 * Machine sub-page "Overview": what is this machine's condition at a glance,
 * and where on the machine is the problem.
 */
export function MachineDiagram({ machine, onNavigateToDiagnosis, simulation }: MachineDiagramProps) {
  return <OverviewPage machine={machine} sensorData={simulation?.sensorData} onNavigateToDiagnosis={onNavigateToDiagnosis} />;
}
