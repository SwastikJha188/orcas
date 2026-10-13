"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useKilnSimulation } from "@/providers/kiln-simulation-context";
import { useInferenceEngine, type InferenceEngine } from "@/components/assetiq/use-inference-engine";
import { usePredictionLedger, type PredictionLedger } from "@/components/assetiq/use-prediction-ledger";

/**
 * The AI stack's activity (model cards, inference ticker) and the prediction
 * ledger, run once at the app root so predictions are recorded and checked
 * against outcomes whichever page is open, not only while AssetIQ is shown.
 */
const AiEngineContext = createContext<{ engine: InferenceEngine; ledger: PredictionLedger } | null>(null);

export function AiEngineProvider({ children }: { children: React.ReactNode }) {
  const frame = useKilnSimulation()?.frame ?? null;
  const engine = useInferenceEngine(frame);
  const ledger = usePredictionLedger(frame, engine.push);
  const value = useMemo(() => ({ engine, ledger }), [engine, ledger]);
  return <AiEngineContext.Provider value={value}>{children}</AiEngineContext.Provider>;
}

/** The running AI engine and prediction ledger, or `null` outside the provider. */
export function useAiEngine() {
  return useContext(AiEngineContext);
}
