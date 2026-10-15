/**
 * Prognosis page · pure derivations over the insights payload.
 * Nothing here invents data: every value comes from `InsightsResponse["prognosis"]`;
 * values computed on the page are named in each section's Method disclosure.
 */
import { parseDuration } from "@/lib/kiln-sim/engine";
import type {
  FailureRisk,
  ForecastHorizon,
  ForecastSeries,
  InsightsResponse,
  RulItem,
  Severity,
} from "@/server/services/insights-service";

export type PrognosisData = InsightsResponse["prognosis"];

export const SEVERITY_RANK: Record<Severity, number> = { Normal: 0, Advisory: 1, Critical: 2 };

export const toneOf = (s: Severity): "good" | "warn" | "bad" =>
  s === "Critical" ? "bad" : s === "Advisory" ? "warn" : "good";

export function worst(list: Severity[]): Severity {
  return list.reduce<Severity>((acc, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[acc] ? s : acc), "Normal");
}

/** Plant hours as value + unit on the one prognosis scale: h below 2 d, d to 30 d, wk beyond (see `formatRulHours`). */
export function duration(hours: number): { value: string; unit: string } {
  const [value, unit] = formatRulHours(hours).split(" ");
  return { value, unit };
}

/** Plant hours as "5 h" / "9 d" / "6 wk" (same scale as every RUL and interval). */
export const durationText = (hours: number) => formatRulHours(hours);

/** "24h" → "24 h". */
export const horizonText = (id: string) => id.replace(/^(\d+)([a-z]+)$/i, "$1 $2");

/** Number with sensible precision for an engineering value. */
export function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1000) return Math.round(v).toLocaleString();
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

/* ------------------------------------------------------------------ */
/* RUL                                                                */
/* ------------------------------------------------------------------ */

/**
 * Confidence-scaled band around a RUL estimate (calc.): the estimate
 * ± (100 − confidence) %. Used to show how firm each estimate is.
 */
export function rulBand(r: RulItem): { lo: number; hi: number } {
  const spread = Math.max(0, Math.min(0.9, (100 - r.confidence) / 100));
  return { lo: Math.max(1, r.hours * (1 - spread)), hi: r.hours * (1 + spread) };
}

export function firstIntervention(rul: RulItem[]): RulItem | null {
  return rul.reduce<RulItem | null>((m, r) => (m === null || r.hours < m.hours ? r : m), null);
}

/* ------------------------------------------------------------------ */
/* Forecast vs limits                                                 */
/* ------------------------------------------------------------------ */

export interface LimitCrossing {
  level: "warning" | "alarm";
  /** Hours from now when the forecast first reaches the limit. */
  hours: number;
}

/** True when the limit pair is a high limit (alarm above warning). */
function isHigh(s: ForecastSeries): boolean {
  if (s.warning !== null && s.alarm !== null) return s.alarm >= s.warning;
  return true;
}

/** Typical operating value: median of the measured history, else the current value. */
function referenceOf(s: ForecastSeries): number {
  const h = s.history.filter(Number.isFinite);
  if (!h.length) return s.current;
  const v = [...h].sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
}

/**
 * Whether a limit is breached from above (high limit) or below (low limit).
 * Normally the pair decides (alarm above warning = high). When the two limits
 * straddle the operating value, they are different sides of a band (e.g. a low
 * warning "< 950" with a high alarm "> 1,250"): each limit then takes its own
 * side relative to the operating value.
 */
export function limitIsHigh(s: ForecastSeries, limit: number): boolean {
  if (s.warning !== null && s.alarm !== null && Number.isFinite(s.warning) && Number.isFinite(s.alarm)) {
    const ref = referenceOf(s);
    const lo = Math.min(s.warning, s.alarm);
    const hi = Math.max(s.warning, s.alarm);
    if (lo < ref && ref < hi) return limit > ref;
  }
  return isHigh(s);
}

function beyond(v: number, limit: number, high: boolean): boolean {
  return high ? v >= limit : v <= limit;
}

/** First forecast step that reaches the alarm, else the warning limit (calc.). */
export function limitCrossing(s: ForecastSeries, h: ForecastHorizon): LimitCrossing | null {
  const steps = s.forecast.length || h.steps || 1;
  const find = (limit: number | null) => {
    if (limit === null || !Number.isFinite(limit)) return null;
    const high = limitIsHigh(s, limit);
    if (beyond(s.current, limit, high)) return 0;
    const i = s.forecast.findIndex((v) => beyond(v, limit, high));
    return i < 0 ? null : (h.hours * (i + 1)) / steps;
  };
  const alarm = find(s.alarm);
  if (alarm !== null) return { level: "alarm", hours: alarm };
  const warn = find(s.warning);
  if (warn !== null) return { level: "warning", hours: warn };
  return null;
}

/** Headroom to the nearest limit at the end of the horizon, % of the limit (calc.). */
export function headroomPct(s: ForecastSeries): number | null {
  const limit = s.warning ?? s.alarm;
  if (limit === null || !Number.isFinite(limit) || limit === 0) return null;
  const high = limitIsHigh(s, limit);
  const gap = high ? limit - s.predicted : s.predicted - limit;
  return (gap / Math.abs(limit)) * 100;
}

export function seriesFor(data: PrognosisData, horizonId: string): ForecastSeries[] {
  return Object.keys(data.forecasts)
    .map((t) => data.forecasts[t]?.[horizonId])
    .filter((s): s is ForecastSeries => Boolean(s));
}

/* ------------------------------------------------------------------ */
/* Condition                                                          */
/* ------------------------------------------------------------------ */

type Points = PrognosisData["condition"]["points"];

/** Value at `day`, linearly interpolated between projection points. */
export function valueAt(points: Points, day: number, pick: (p: Points[number]) => number | undefined): number | null {
  const pts = points.filter((p) => Number.isFinite(pick(p) ?? NaN));
  if (!pts.length) return null;
  if (day <= pts[0].day) return pick(pts[0]) ?? null;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    if (day <= p1.day) {
      const f = (day - p0.day) / (p1.day - p0.day || 1);
      return (pick(p0) as number) + f * ((pick(p1) as number) - (pick(p0) as number));
    }
  }
  return pick(pts[pts.length - 1]) ?? null;
}

export function healthStatus(pct: number): Severity {
  return pct >= 85 ? "Normal" : pct >= 70 ? "Advisory" : "Critical";
}

/* ------------------------------------------------------------------ */
/* Page-level derivations (one-page Prognosis)                        */
/* ------------------------------------------------------------------ */

export type AnalysisPayload = InsightsResponse["analysis"];

/** Baseline exposure rows carry no finding; they are health-index estimates. */
export const isBaselineRisk = (r: FailureRisk) => r.id.startsWith("base-");

/** How a RUL estimate was produced, so the page can say so. */
export type RulBasis = "finding" | "health";

export interface RulRow extends RulItem {
  basis: RulBasis;
  /** Failure mode setting the estimate (finding-based rows only). */
  driver: FailureRisk | null;
  /** Sensor tags behind the driver. */
  tags: string[];
  band: { lo: number; hi: number };
}

const norm = (s: string) => s.toLowerCase();

/** Sensor tags that support a failure mode: its rule evidence, else the risk id when it is itself a tag. */
export function tagsForRisk(r: FailureRisk, analysis: AnalysisPayload | null, data: PrognosisData): string[] {
  const src = analysis?.sources.find((s) => s.id === r.id);
  if (src && src.evidence.length) return [...new Set(src.evidence.map((e) => e.tag))];
  return data.locations[r.id] || data.forecasts[r.id] ? [r.id] : [];
}

const SEV_RANK: Record<Severity, number> = { Critical: 0, Advisory: 1, Normal: 2 };

/** Non-baseline failure modes that cite this sub-assembly, most severe first. */
export function findingsFor(name: string, data: PrognosisData): FailureRisk[] {
  const n = norm(name);
  return data.risks
    .filter((r) => !isBaselineRisk(r) && r.severity !== "Normal" && norm(r.component).split(/,\s*/).some((c) => c === n || c.includes(n)))
    .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
}

export function rulRows(data: PrognosisData, analysis: AnalysisPayload | null): RulRow[] {
  return [...data.rul]
    .sort((a, b) => SEV_RANK[a.status] - SEV_RANK[b.status])
    .map((r) => {
      const driver = findingsFor(r.name, data)[0] ?? null;
      return {
        ...r,
        basis: driver ? "finding" : "health",
        driver,
        tags: driver ? tagsForRisk(driver, analysis, data) : [],
        band: rulBand(r),
      } satisfies RulRow;
    });
}

/** Every forecast series that reaches a limit within the horizon, alarm first. */
export function crossingsAt(data: PrognosisData, horizonId: string) {
  const h = data.horizons.find((x) => x.id === horizonId);
  if (!h) return [];
  return seriesFor(data, horizonId)
    .filter((s) => s.confidence > 0)
    .map((s) => ({ s, c: limitCrossing(s, h) }))
    .filter((x): x is { s: ForecastSeries; c: LimitCrossing } => x.c !== null)
    .sort((a, b) => (a.c.level === "alarm" ? 0 : 1) - (b.c.level === "alarm" ? 0 : 1));
}

/** Plain-language window for an hour count. */
export function windowFor(hours: number): string {
  if (hours <= 24) return "within 24 h";
  if (hours <= 168) return "within 7 d";
  if (hours <= 720) return "within 30 d";
  if (hours <= 2160) return "within 90 d";
  return "at the next planned stop";
}

/** Log-time axis from 1 h to `maxH`, as 0–100 %. */
export function logPos(h: number, maxH: number): number {
  return (Math.log10(Math.max(1, h)) / Math.log10(Math.max(10, maxH))) * 100;
}

export const TIME_TICKS: { h: number; label: string }[] = [
  { h: 1, label: "1 h" },
  { h: 6, label: "6 h" },
  { h: 24, label: "24 h" },
  { h: 168, label: "7 d" },
  { h: 720, label: "30 d" },
  { h: 2160, label: "90 d" },
  { h: 8760, label: "1 y" },
];

/** Hours from a window label such as "< 72 h", "< 30 d", "< 3h 10m", "< 2s"; null when unparsable. */
export function windowHours(label: string): number | null {
  const exact = riskWindowHours(label);
  if (exact !== null) return exact;
  const d = label.match(/(\d+(?:\.\d+)?)\s*d\b/);
  const h = label.match(/(\d+(?:\.\d+)?)\s*h/);
  const m = label.match(/(\d+)\s*m(?:in)?\b/);
  const sec = label.match(/(\d+)\s*s\b/);
  if (!d && !h && !m && !sec) return null;
  return (d ? Number(d[1]) * 24 : 0) + (h ? Number(h[1]) : 0) + (m ? Number(m[1]) / 60 : 0) + (sec ? Number(sec[1]) / 3600 : 0);
}

/** The failure mode that applies to a sub-assembly: its strongest finding, else its baseline exposure row. */
export function riskForRow(r: RulItem, data: PrognosisData): FailureRisk | null {
  return findingsFor(r.name, data)[0] ?? data.risks.find((x) => x.id === `base-${r.id}`) ?? null;
}

/**
 * The one prognosis duration scale. RUL, intervals, horizons and lead times
 * are plant hours (simulated minutes / 60 on the live kiln), shown at the
 * precision an estimate supports: h below 2 d, days to 30 d, weeks beyond.
 * Other pages reuse `formatRulHours` / `formatRulInterval` / `formatRiskWindow`.
 */
export function formatRulHours(hours: number): string {
  if (!Number.isFinite(hours)) return "—";
  if (hours < 48) return `${Math.max(1, Math.round(hours))} h`;
  if (hours <= 720) return `${Math.round(hours / 24)} d`;
  return `${Math.round(hours / 168)} wk`;
}

/** "9–23 d" style interval (plant hours) in a shared unit where possible; "5 h – 2 d" otherwise. */
export function formatRulInterval(lo: number, hi: number): string {
  const a = formatRulHours(lo);
  const b = formatRulHours(hi);
  const [va, ua] = a.split(" ");
  const ub = b.split(" ")[1];
  return ua === ub ? `${va}–${b}` : `${a} – ${b}`;
}

/** Plant hours behind a risk-window label: "< 72 h" / "< 30 d" (plant time) or an engine duration ("< 3s", "< 2h 10m"). */
export function riskWindowHours(label: string): number | null {
  const x = label.replace(/^\s*[<≤]\s*/, "").trim();
  const plant = /^(\d+(?:\.\d+)?)\s+(h|d)$/.exec(x);
  if (plant) return Number(plant[1]) * (plant[2] === "d" ? 24 : 1);
  const minutes = parseDuration(x);
  return minutes === null ? null : minutes / 60;
}

/** A failure mode's horizon on the prognosis scale ("< 1 h", "< 3 d"); non-duration labels pass through. */
export function formatRiskWindow(label: string): string {
  const h = riskWindowHours(label);
  return h === null ? label : `< ${formatRulHours(h)}`;
}

/** Same as `formatRulHours` (kept for existing callers). */
export const roundHours = formatRulHours;

/** Same as `formatRulInterval` (kept for existing callers). */
export const rangeText = formatRulInterval;
