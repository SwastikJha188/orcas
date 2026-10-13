import { formatClock, formatDuration, parseDuration } from "@/lib/kiln-sim/engine";
import type {
  Prediction,
  PredictionStats,
} from "@/server/services/predictions-service";

export type { Prediction, PredictionStats };

/** Simulated minutes from an engine duration label ("3h 10m", "42s", "4 d"); null when unparsable. */
export function parseDurationMinutes(label: string | null): number | null {
  return parseDuration(label);
}

/** Local clock time a simulated minute is shown at. */
export function simStamp(t: number): string {
  return formatClock(t).clock;
}

export const leadLabel = (minutes: number | null): string =>
  minutes === null ? "—" : formatDuration(minutes);

export interface TickerEntry {
  id: number;
  t: number;
  clock: string;
  model: string;
  text: string;
  tone: "good" | "warn" | "bad" | "info";
}

export type PushTicker = (entry: Omit<TickerEntry, "id">) => void;
