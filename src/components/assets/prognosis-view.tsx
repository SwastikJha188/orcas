"use client";

import React from "react";
import { InsightsState } from "./insights-ui";
import { PrognosisOverview, type PrognosisPage } from "./prognosis-overview";
import type { InsightsResponse } from "@/server/services/insights-service";

export type { PrognosisPage };

export interface PrognosisViewProps {
  insights: InsightsResponse | null;
  isLoading: boolean;
  isError: boolean;
  error?: string | null;
  /** The detailed prognosis modules live under Analysis; tiles open them there. */
  onOpenModule?: (page: Exclude<PrognosisPage, "overview">) => void;
}

export function PrognosisView({ insights, isLoading, isError, error, onOpenModule }: PrognosisViewProps) {
  return (
    <div className="ins-page ins-page--hub">
      <InsightsState isLoading={isLoading} isError={isError} error={error} />

      {insights && !isLoading && !isError && (
        <PrognosisOverview
          data={insights.prognosis}
          onOpen={(page) => {
            if (page !== "overview") onOpenModule?.(page);
          }}
        />
      )}
    </div>
  );
}
