"use client";

import React, { useMemo } from "react";
import { useApi } from "@/lib/api-cache";
import type { Prediction, PredictionStats } from "@/server/services/predictions-service";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useAiEngine } from "@/providers/ai-engine-context";
import { summarizeLedger } from "@/components/assetiq/use-prediction-ledger";
import { openAssetIqAccuracy } from "@/components/assetiq/model-accuracy-view";
import { EvidenceChip, MissingNote, Panel, PointerCard, Section } from "./an-ui";
import { SECTION_IDS, detectionRows, type SectionProps } from "./an-derive";

export interface Ledger {
  items: Prediction[];
  stats: PredictionStats | null;
  loading: boolean;
  error: string | null;
}

/**
 * The prediction ledger for one machine. The active plant's primary machine
 * (KLN-01 / PYR-KLN-01) reads the one ledger the AI engine keeps at the app
 * root (the same object AssetIQ · Accuracy shows), so every page reports
 * identical counts; other machines read the stored ledger.
 */
export function useMachineLedger(machineId: string): Ledger {
  const ai = useAiEngine();
  const shared = ai && machineId === ai.ledger.machineId ? ai.ledger : null;
  const { data, isLoading, error } = useApi<{ items: Prediction[]; stats: PredictionStats }>(
    shared ? null : `/api/predictions?machineId=${encodeURIComponent(machineId)}&limit=200`,
    { refreshMs: 60_000 },
  );
  return useMemo(
    () =>
      shared
        ? { items: shared.items, stats: shared.stats, loading: shared.isLoading, error: shared.error }
        : { items: data?.items ?? [], stats: data?.stats ?? null, loading: isLoading, error },
    [shared, data, isLoading, error],
  );
}

/** Read-only view of the prediction ledger for one machine (kept for existing callers). */
export const useLedger = useMachineLedger;

/**
 * Compact accuracy summary (the same four figures on Prognosis and Analysis)
 * with a link to AssetIQ · Accuracy, which holds the ledger, calibration and
 * per-event detail.
 */
export function LedgerPointer({ ledger }: { ledger: Ledger }) {
  const { setActiveTab } = useIndustrialData();
  const s = summarizeLedger(ledger.stats);
  if (ledger.loading && !ledger.stats) return <MissingNote title="Loading accuracy…" />;
  if (!ledger.stats && ledger.error) return <MissingNote title="Accuracy unavailable. Retry." />;
  if (s.made === 0) return <MissingNote title="No predictions recorded for this machine." />;
  return (
    <PointerCard
      title="Prediction accuracy"
      facts={[
        { label: "Predictions", value: String(s.made), foot: `${s.pending} awaiting outcome` },
        {
          label: "Precision",
          value: s.precision === null ? "—" : String(s.precision),
          unit: s.precision === null ? undefined : "%",
          foot: `${s.confirmed} of ${s.resolved} came true`,
          tone: s.precision !== null && s.precision < 50 ? "warn" : undefined,
        },
        { label: "Mean lead", value: s.meanLead, foot: "before the event" },
      ]}
      action="Accuracy in AssetIQ"
      onOpen={() => openAssetIqAccuracy(setActiveTab)}
    />
  );
}

/** Model quality — accuracy summary (home: AssetIQ) and input health. */
export function AnQuality({ insights, frame, ledger }: SectionProps & { ledger: Ledger }) {
  const rows = useMemo(() => (frame ? detectionRows(frame) : []), [frame]);
  const flagged = rows.filter((r) => r.quality !== "Good");

  return (
    <Section id={SECTION_IDS.quality} title="Model quality">
      <LedgerPointer ledger={ledger} />

      {flagged.length > 0 ? (
        <Panel title="Inputs excluded by validation">
          <span className="pg-analysis-evidence-chips">
            {flagged.map((r) => (
              <EvidenceChip key={r.tag} tag={r.tag} detail={r.qualityNote ?? r.quality} tone={r.quality === "Invalid" ? "bad" : "warn"} page="sensors" />
            ))}
          </span>
        </Panel>
      ) : (
        insights.analysis.reasoning.length > 0 && (
          <Panel title="Pipeline">
            <dl className="pg-analysis-dl">
              {insights.analysis.reasoning.map((r) => (
                <React.Fragment key={r.id}>
                  <dt>{r.label.replace(/^\d+\s*·\s*/, "")}</dt>
                  <dd className="ast-num">{r.detail}</dd>
                </React.Fragment>
              ))}
            </dl>
          </Panel>
        )
      )}
    </Section>
  );
}
