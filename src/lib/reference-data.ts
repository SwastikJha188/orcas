"use client";

/**
 * Reference data the pages share, read from the database through the API:
 * Machine Health Index bands, work-order priorities and their response times,
 * each plant's primary machine. Pages use these hooks instead of compiling the
 * numbers in.
 */
import { useMemo } from "react";
import { useApi } from "@/lib/api-cache";
import type { HealthModelDto, SeverityId, WorkOrderPriorityDto } from "@shared/types/monitoring";

export interface HealthBands {
  /** Scores below this are Alert. */
  advisory: number;
  /** Scores below this are Critical. */
  critical: number;
}

/** Every health model with its parameters and bands (null while loading). */
export function useHealthModels(): HealthModelDto[] | null {
  return useApi<HealthModelDto[]>("/api/health-models").data ?? null;
}

/** Status bands of a health model (the machine's `healthModelId`); null while loading or when the model has none. */
export function useHealthBands(modelId: string | null | undefined): HealthBands | null {
  const models = useHealthModels();
  return useMemo(() => {
    const m = models?.find((x) => x.id === modelId) ?? null;
    const advisory = m?.bands.find((b) => b.severity === "Alert")?.below;
    const critical = m?.bands.find((b) => b.severity === "Critical")?.below;
    return advisory != null && critical != null ? { advisory, critical } : null;
  }, [models, modelId]);
}

/** Status of a score under the given bands; null when either is unknown. */
export function bandOf(score: number | null | undefined, bands: HealthBands | null): SeverityId | null {
  if (score === null || score === undefined || !bands) return null;
  return score < bands.critical ? "Critical" : score < bands.advisory ? "Alert" : "Normal";
}

/** Work-order priorities, most urgent first (null while loading). */
export function useWorkOrderPriorities(): WorkOrderPriorityDto[] | null {
  return useApi<WorkOrderPriorityDto[]>("/api/work-order-priorities").data ?? null;
}
