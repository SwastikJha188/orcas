/**
 * Prognosis and analysis, calculated from the database.
 *
 * - Forecasts: least-squares trend of the stored usable readings with a 95 %
 *   prediction interval; confidence is the fit's R².
 * - Correlation / influence: Pearson r and regression slope over readings
 *   aligned on their acquisition minute.
 * - Time to limit (RUL): when a measurement trends toward its alarm boundary,
 *   the projected time to reach it; nothing is projected without a trend.
 * - Anomalies: |z| of the latest reading against the accepted reference
 *   (expected value, noise σ), above the health model's free band.
 * - Risks, sources, fault classes, actions: the open findings, the rule library
 *   and the work-order priority table.
 * - Condition projection and degradation: trend of the stored health scores.
 *
 * Probabilities are not estimated by this evaluation and are returned as null.
 */
import { query } from "@backend/db";
import { readMachineCatalog } from "./asset-read-service";
import { setting } from "@backend/monitoring/settings";
import type {
  AnomalyItem,
  ConditionPoint,
  CorrelationPair,
  DegradationItem,
  FailureRisk,
  FaultClass,
  FeatureWeight,
  ForecastHorizon,
  ForecastSeries,
  InfluenceLink,
  InsightsResponse,
  IssueSource,
  MaintenanceAction,
  ReasoningStep,
  RulItem,
  SensorLocation,
  Severity,
} from "@shared/types/insights";

export type * from "@shared/types/insights";

/** Forecast windows offered by the Prognosis page (display choice: label, length and points drawn). */
export const FORECAST_HORIZONS: ForecastHorizon[] = [
  { id: "1h", label: "1H", hours: 1, steps: 14 },
  { id: "6h", label: "6H", hours: 6, steps: 18 },
  { id: "24h", label: "24H", hours: 24, steps: 24 },
  { id: "7d", label: "7D", hours: 168, steps: 26 },
  { id: "30d", label: "30D", hours: 720, steps: 30 },
];

/** Days ahead at which the health projection is drawn. */
export const CONDITION_HORIZONS = [0, 7, 30, 90, 180];

const HOUR = 3_600_000;
const RANK: Record<Severity, number> = { Normal: 0, Alert: 1, Critical: 2 };
const n = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ------------------------------------------------------------------ */
/* Statistics                                                          */
/* ------------------------------------------------------------------ */

interface Fit {
  n: number;
  /** Intercept at t = 0 (hours relative to `t0`) and slope per hour. */
  a: number;
  b: number;
  t0: number;
  tMean: number;
  sxx: number;
  /** Residual standard error. */
  s: number;
  r2: number;
}

/** Ordinary least squares of value on time (hours). */
function fitLine(points: Array<{ t: number; v: number }>): Fit | null {
  if (points.length < 3) return null;
  const t0 = points[points.length - 1].t;
  const xs = points.map((p) => (p.t - t0) / HOUR);
  const ys = points.map((p) => p.v);
  const N = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / N;
  const my = ys.reduce((a, b) => a + b, 0) / N;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < N; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0) return null;
  const b = sxy / sxx;
  const a = my - b * mx;
  let sse = 0;
  for (let i = 0; i < N; i++) sse += (ys[i] - (a + b * xs[i])) ** 2;
  const s = N > 2 ? Math.sqrt(sse / (N - 2)) : 0;
  return { n: N, a, b, t0, tMean: mx, sxx, s, r2: syy > 0 ? Math.max(0, 1 - sse / syy) : 0 };
}

/** Half-width of the 95 % prediction interval at `x` hours from the last reading. */
const band = (f: Fit, x: number) => 1.96 * f.s * Math.sqrt(1 + 1 / f.n + (x - f.tMean) ** 2 / f.sxx);

/** Readings in the shortest recent window the time-to-limit trend is also tested on (twice this is the next). */
const RECENT_TREND_SAMPLES = 30;

/** True when the trend over `hours` is larger than its own uncertainty. */
const significant = (f: Fit, hours: number) => Math.abs(f.b * hours) > band(f, hours);

function pearson(a: number[], b: number[]): number | null {
  const N = Math.min(a.length, b.length);
  if (N < 5) return null;
  const ma = a.reduce((x, y) => x + y, 0) / N;
  const mb = b.reduce((x, y) => x + y, 0) / N;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < N; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : null;
}

function dueLabel(hours: number): string {
  if (hours < 1) return "Less than an hour";
  if (hours < 48) return `${Math.round(hours)} h`;
  const d = hours / 24;
  return d < 45 ? `${Math.round(d)} d` : `${Math.round(d / 30)} mo`;
}

/* ------------------------------------------------------------------ */
/* Orchestration                                                       */
/* ------------------------------------------------------------------ */

/** Each sub-assembly's life: its own part record (component_service_lives) and the typical life for its kind (part_kind_lives). */
async function partLives(machineId: string) {
  const res = await query<{
    sa_id: string;
    label: string;
    k_life: number;
    k_shape: number;
    r_life: string | null;
    r_basis: "h" | "d" | null;
    r_used: string | null;
    r_shape: number | null;
    r_source: string | null;
  }>(
    `SELECT ms.id AS sa_id, k.label, k.life_h AS k_life, k.weibull_shape AS k_shape,
            c.life AS r_life, c.basis AS r_basis, c.used AS r_used, c.weibull_shape AS r_shape, c.record_source AS r_source
       FROM machine_subassemblies ms JOIN machine_systems sy ON sy.id = ms.machine_system_ref_id
       CROSS JOIN LATERAL (SELECT * FROM part_kind_lives WHERE ms.name ~* name_pattern ORDER BY sort_order LIMIT 1) k
       LEFT JOIN LATERAL (SELECT * FROM component_service_lives c WHERE c.subassembly_ref_id = ms.id ORDER BY c.sort_order LIMIT 1) c ON true
      WHERE sy.machine_id = $1`,
    [machineId],
  );
  return new Map(res.rows.map((r) => [r.sa_id, r]));
}

/** Time until the chance of failure reaches `q`, for a part of age `age` on a Weibull(η, β) life. */
function weibullLeft(eta: number, beta: number, age: number, q: number): number {
  return eta * ((age / eta) ** beta - Math.log(1 - q)) ** (1 / beta) - age;
}

export async function getMachineInsights(machineId: string): Promise<InsightsResponse> {
  const trendH = await setting("evaluation.trend_window_h");
  const minTrend = await setting("evaluation.min_trend_samples");
  const catalog = await readMachineCatalog(machineId);
  const analog = catalog.sensors.filter((s) => s.unit !== "state");
  const ids = analog.map((s) => s.id);

  const [raw, hourly, refs, findings, scores, subScores, model, priorities, readingsLastHour] = await Promise.all([
    query<{ measurement_id: string; t: Date; value: number }>(
      `SELECT r.measurement_id, r.acquired_at AS t, r.value FROM readings r JOIN quality_codes q ON q.id = r.quality_id AND q.usable
        WHERE r.measurement_id = ANY($1) AND r.value IS NOT NULL AND r.acquired_at > NOW() - make_interval(secs => $2)
        ORDER BY r.measurement_id, r.acquired_at`,
      [ids, trendH * 3600],
    ),
    query<{ measurement_id: string; t: Date; value: number }>(
      `SELECT measurement_id, hour_start + interval '30 minutes' AS t, v_sum / good_count AS value FROM reading_hourly
        WHERE measurement_id = ANY($1) AND good_count > 0 ORDER BY measurement_id, hour_start`,
      [ids],
    ),
    query<{ measurement_id: string; expected: number | null; lo: number | null; hi: number | null; sigma: number | null }>(
      `SELECT DISTINCT ON (v.measurement_id) v.measurement_id, v.expected, v.lo, v.hi, m.noise_sigma AS sigma
         FROM reference_sets s JOIN reference_values v ON v.reference_set_id = s.id JOIN measurements m ON m.id = v.measurement_id
         LEFT JOIN machine_state_periods p ON p.machine_id = s.machine_id AND p.ended_at IS NULL
        WHERE s.machine_id = $1 AND s.status = 'accepted' AND (s.state_id IS NULL OR s.state_id = p.state_id)
        ORDER BY v.measurement_id, (s.state_id IS NULL)`,
      [machineId],
    ),
    query<{ id: number; type: string; type_name: string; severity_id: Severity; measurement_id: string | null; tag: string | null; m_name: string | null; sub_id: string | null; sub_name: string | null; rule_code: string | null; rule_name: string | null; category: string | null; action: string | null; summary: string; opened_at: Date; cleared_at: Date | null }>(
      `SELECT f.id, f.finding_type_id AS type, ft.name AS type_name, f.severity_id, f.measurement_id, m.tag, m.name AS m_name,
              c.subassembly_code AS sub_id, c.subassembly_name AS sub_name, r.code AS rule_code, r.name AS rule_name, r.category_id AS category, r.action,
              f.summary, f.opened_at, f.cleared_at
         FROM findings f JOIN finding_types ft ON ft.id = f.finding_type_id
         LEFT JOIN measurements m ON m.id = f.measurement_id
         LEFT JOIN v_measurement_context c ON c.measurement_id = f.measurement_id
         LEFT JOIN rules r ON r.id = f.rule_id
        WHERE f.machine_id = $1 AND (f.cleared_at IS NULL OR f.opened_at > NOW() - interval '24 hours')
        ORDER BY f.opened_at`,
      [machineId],
    ),
    query<{ t: Date; score: number }>("SELECT scored_at AS t, score FROM machine_health_scores WHERE machine_id = $1 ORDER BY scored_at", [machineId]),
    query<{ subassembly_id: string; code: string; t: Date; score: number }>(
      `SELECT h.subassembly_id, sa.subassembly_id AS code, h.scored_at AS t, h.score
         FROM subassembly_health_scores h JOIN machine_subassemblies sa ON sa.id = h.subassembly_id
         JOIN machine_systems sy ON sy.id = sa.machine_system_ref_id
        WHERE sy.machine_id = $1 ORDER BY h.scored_at`,
      [machineId],
    ),
    query<{ name: string; key: string; value: number }>(
      `SELECT h.name, p.key, p.value FROM machines m JOIN health_models h ON h.id = m.health_model_id
         JOIN health_model_parameters p ON p.model_id = h.id WHERE m.id = $1`,
      [machineId],
    ),
    query<{ id: string; name: string; response_minutes: number | null; description: string }>("SELECT id, name, response_minutes, description FROM work_order_priorities ORDER BY sort_order"),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM readings r JOIN v_measurement_context c ON c.measurement_id = r.measurement_id
        WHERE c.machine_id = $1 AND r.acquired_at > NOW() - interval '1 hour'`,
      [machineId],
    ),
  ]);
  const severityOrder = (await query<{ id: Severity }>("SELECT id FROM severities ORDER BY rank")).rows.map((r) => r.id);

  const param = (k: string) => {
    const r = model.rows.find((x) => x.key === k);
    return r ? Number(r.value) : null;
  };
  const modelName = model.rows[0]?.name ?? null;
  const zFree = param("z_free");
  const prio = (sev: Severity) => (sev === "Critical" ? priorities.rows[0] : sev === "Alert" ? priorities.rows[Math.min(2, priorities.rows.length - 1)] : priorities.rows.at(-1));

  // Series per measurement: hourly means for long horizons, raw readings for the trend window.
  const rawBy = new Map<string, Array<{ t: number; v: number }>>();
  for (const r of raw.rows) (rawBy.get(r.measurement_id) ?? rawBy.set(r.measurement_id, []).get(r.measurement_id)!).push({ t: r.t.getTime(), v: Number(r.value) });
  const hourlyBy = new Map<string, Array<{ t: number; v: number }>>();
  for (const r of hourly.rows) (hourlyBy.get(r.measurement_id) ?? hourlyBy.set(r.measurement_id, []).get(r.measurement_id)!).push({ t: r.t.getTime(), v: Number(r.value) });
  const longSeries = (id: string) => {
    const r = rawBy.get(id) ?? [];
    const firstRaw = r[0]?.t ?? Infinity;
    return [...(hourlyBy.get(id) ?? []).filter((p) => p.t < firstRaw), ...r];
  };
  const refBy = new Map(refs.rows.map((r) => [r.measurement_id, { expected: n(r.expected), lo: n(r.lo), hi: n(r.hi), sigma: n(r.sigma) }]));
  const openFindings = findings.rows.filter((f) => f.cleared_at === null);

  /* ---------------- forecasts ---------------- */
  const forecasts: Record<string, Record<string, ForecastSeries>> = {};
  const fitShort = new Map<string, Fit | null>();
  for (const s of analog) {
    const short = rawBy.get(s.id) ?? [];
    const long = longSeries(s.id);
    const fShort = short.length >= minTrend ? fitLine(short) : null;
    const fLong = long.length >= minTrend ? fitLine(long) : null;
    fitShort.set(s.id, fShort);
    const current = short.at(-1)?.v ?? s.numericValue;
    if (current === null || current === undefined) continue;
    forecasts[s.tag] = {};
    for (const h of FORECAST_HORIZONS) {
      const f = h.hours <= trendH ? fShort : (fLong ?? fShort);
      const window = h.hours <= trendH ? short : long;
      const history = window.slice(-30).map((p) => p.v);
      // A trend larger than its own uncertainty is projected; otherwise the level holds (window mean ± 1.96 σ).
      const trending = f !== null && significant(f, h.hours);
      const values = window.map((p) => p.v);
      const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : current;
      const sd = values.length > 1 ? Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1)) : 0;
      const forecast: number[] = [];
      const lower: number[] = [];
      const upper: number[] = [];
      for (let j = 1; j <= h.steps; j++) {
        const x = (h.hours * j) / h.steps;
        const v = trending ? f!.a + f!.b * x : mean;
        const w = trending ? band(f!, x) : 1.96 * sd;
        forecast.push(round(v, 4));
        lower.push(round(v - w, 4));
        upper.push(round(v + w, 4));
      }
      const predicted = forecast.at(-1) ?? current;
      const deltaPct = current ? ((predicted - current) / Math.abs(current)) * 100 : 0;
      forecasts[s.tag][h.id] = {
        tag: s.tag,
        name: s.name,
        unit: s.unit,
        status: s.status,
        history: history.length ? history : [current],
        forecast,
        lower,
        upper,
        current,
        predicted,
        deltaPct: round(deltaPct, 2),
        trend: trending ? (f!.b > 0 ? "rising" : "falling") : "stable",
        warning: s.warningVal,
        alarm: s.alarmVal,
        horizonLabel: h.label,
        confidence: f ? Math.round(f.r2 * 100) : null,
      };
    }
  }

  /* ---------------- correlation and influence ---------------- */
  const minuteKey = (t: number) => Math.round(t / 60_000);
  const aligned = (a: string, b: string) => {
    const mb = new Map((rawBy.get(b) ?? []).map((p) => [minuteKey(p.t), p.v]));
    const xs: number[] = [];
    const ys: number[] = [];
    for (const p of rawBy.get(a) ?? []) {
      const v = mb.get(minuteKey(p.t));
      if (v !== undefined) {
        xs.push(p.v);
        ys.push(v);
      }
    }
    return { xs, ys };
  };
  const measured = analog.filter((s) => (rawBy.get(s.id)?.length ?? 0) >= 5);
  const pairs: CorrelationPair[] = [];
  const rOf = new Map<string, number>();
  for (let i = 0; i < measured.length; i++) {
    for (let j = i + 1; j < measured.length; j++) {
      const { xs, ys } = aligned(measured[i].id, measured[j].id);
      const r = pearson(xs, ys);
      if (r === null) continue;
      const cut = Math.floor((xs.length * 2) / 3);
      pairs.push({
        a: measured[i].tag,
        b: measured[j].tag,
        r: round(r, 3),
        n: xs.length,
        baseline: cut >= 6 ? (pearson(xs.slice(0, cut), ys.slice(0, cut)) ?? undefined) : undefined,
        recent: cut >= 6 ? (pearson(xs.slice(cut), ys.slice(cut)) ?? undefined) : undefined,
      });
      rOf.set(`${measured[i].tag}|${measured[j].tag}`, r);
      rOf.set(`${measured[j].tag}|${measured[i].tag}`, r);
    }
  }
  pairs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  const influences: Record<string, InfluenceLink[]> = {};
  for (const d of measured) {
    const dv = (rawBy.get(d.id) ?? []).map((p) => p.v);
    const dm = dv.reduce((a, b) => a + b, 0) / dv.length;
    const dSd = Math.sqrt(dv.reduce((a, v) => a + (v - dm) ** 2, 0) / dv.length);
    influences[d.tag] = measured
      .filter((s) => s.id !== d.id && rOf.has(`${d.tag}|${s.tag}`))
      .map((s) => {
        const r = rOf.get(`${d.tag}|${s.tag}`)!;
        const sv = (rawBy.get(s.id) ?? []).map((p) => p.v);
        const sm = sv.reduce((a, b) => a + b, 0) / sv.length;
        const sSd = Math.sqrt(sv.reduce((a, v) => a + (v - sm) ** 2, 0) / sv.length);
        // Expected change of this measurement for one σ of the driver: r · σ_s.
        return { tag: s.tag, name: s.name, unit: s.unit, coefficient: round(r, 3), delta: round(r * sSd, 4), direction: r >= 0 ? ("up" as const) : ("down" as const), _d: dSd };
      })
      .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
      .slice(0, 6)
      .map(({ _d, ...x }) => (void _d, x));
  }
  const keySensors = [...analog]
    .sort((a, b) => RANK[b.status] - RANK[a.status] || Math.abs(fitShort.get(b.id)?.b ?? 0) - Math.abs(fitShort.get(a.id)?.b ?? 0))
    .slice(0, 6)
    .map((s) => s.tag);
  const matrixTags = measured.map((s) => s.tag);
  const matrix = matrixTags.map((a, i) => matrixTags.map((b, j) => (i === j ? 1 : round(rOf.get(`${a}|${b}`) ?? 0, 3))));

  /* ---------------- time to limit ---------------- */
  const subs = catalog.subassemblies;
  const rul: RulItem[] = subs.map((sa) => {
    let best: { hours: number; r2: number; tag: string } | null = null;
    for (const s of analog.filter((x) => x.subassemblyId === sa.subassemblyId)) {
      const series = rawBy.get(s.id) ?? [];
      const current = series.at(-1)?.v;
      if (current === undefined || s.alarmVal === null) continue;
      const gap = s.alarmVal - current;
      if (gap === 0) continue;
      // The whole trend window first, then its recent part: a fault that started building a few readings ago
      // shows as a trend there long before it moves the line through the whole window.
      for (const k of [series.length, RECENT_TREND_SAMPLES * 2, RECENT_TREND_SAMPLES]) {
        if (k > series.length || k < minTrend) continue;
        const f = k === series.length ? fitShort.get(s.id) : fitLine(series.slice(-k));
        if (!f) continue;
        const span = (series[series.length - 1].t - series[series.length - k].t) / HOUR;
        if (!significant(f, Math.max(span, 0.25)) || Math.sign(gap) !== Math.sign(f.b)) continue;
        const hours = gap / f.b;
        if (hours > 0 && (!best || hours < best.hours)) best = { hours, r2: f.r2, tag: s.tag };
        break;
      }
    }
    return {
      id: sa.subassemblyId,
      name: sa.name,
      component: sa.name,
      health: sa.health,
      hours: best ? Math.max(1, Math.round(best.hours)) : null,
      days: best ? Math.round(best.hours / 24) : null,
      confidence: best ? Math.round(best.r2 * 100) : null,
      status: sa.status ?? "Normal",
      dueLabel: best ? dueLabel(best.hours) : "No reading is moving toward its limit",
      driver: best?.tag,
    };
  });
  // No reading moving toward a limit: the time left comes from the part's life instead.
  const lifeBy = await partLives(machineId);
  const maxScore = param("max_score") ?? 100;
  const critical = param("band_critical");
  for (const r of rul) {
    if (r.hours !== null) continue;
    const sa = subs.find((x) => x.subassemblyId === r.id);
    const lf = sa ? lifeBy.get(sa.id) : undefined;
    if (!lf) continue;
    const recorded = lf.r_life !== null && lf.r_used !== null;
    // A record estimated from the typical life of its kind of part (migration 057) says so.
    const typical = !recorded || /^Estimated from the typical life/i.test(lf.r_source ?? "");
    const unit = lf.r_basis === "d" ? 24 : 1;
    const eta = recorded ? Number(lf.r_life) * unit : Number(lf.k_life);
    const beta = Number((recorded ? lf.r_shape : null) ?? lf.k_shape);
    // Without the plant's record, the used share is read from the part's health between full health and the critical band.
    const share = recorded
      ? Number(lf.r_used) / Number(lf.r_life)
      : sa?.health != null && critical !== null && maxScore > critical
        ? clamp((maxScore - sa.health) / (maxScore - critical), 0.02, 0.95)
        : null;
    if (share === null || !(eta > 0) || !(beta > 0)) continue;
    const age = share * eta;
    const hours = weibullLeft(eta, beta, age, 0.5);
    r.hours = Math.max(1, Math.round(hours));
    r.days = Math.round(hours / 24);
    r.dueLabel = typical ? `From the typical life for a ${lf.label}, ${Math.round(share * 100)} % used` : `From its part record, ${Math.round(share * 100)} % used`;
    r.life = { source: typical ? "typical" : "recorded", kind: lf.label, lifeH: eta, shape: beta, ageH: round(age, 1), usedPct: Math.round(share * 100) };
  }
  rul.sort((a, b) => (a.hours ?? Infinity) - (b.hours ?? Infinity));

  /* ---------------- anomalies ---------------- */
  const anomalies: AnomalyItem[] = [];
  for (const s of analog) {
    const ref = refBy.get(s.id);
    const series = rawBy.get(s.id) ?? [];
    const latest = series.at(-1);
    if (!ref?.expected && ref?.expected !== 0) continue;
    if (!latest || !ref.sigma || ref.sigma <= 0 || zFree === null) continue;
    const z = (latest.v - ref.expected) / ref.sigma;
    if (Math.abs(z) <= zFree) continue;
    let onset = latest.t;
    for (let i = series.length - 1; i >= 0 && Math.abs((series[i].v - ref.expected) / ref.sigma) > zFree; i--) onset = series[i].t;
    anomalies.push({
      tag: s.tag,
      name: s.name,
      component: s.subAssembly ?? s.component ?? s.tag,
      score: round(clamp(Math.abs(z) / (2 * zFree), 0, 1), 3),
      severity: s.status,
      deviation: `${z >= 0 ? "+" : ""}${round(z, 1)} σ vs reference ${round(ref.expected, 3)} ${s.unit}`.trim(),
      onset: new Date(onset).toISOString(),
    });
  }
  anomalies.sort((a, b) => b.score - a.score);
  const timeline: number[] = Array.from({ length: 24 }, () => 0);
  for (const f of findings.rows) {
    const h = Math.floor((Date.now() - f.opened_at.getTime()) / HOUR);
    if (h >= 0 && h < 24 && f.type !== "data_unavailable") timeline[23 - h] += 1;
  }

  /* ---------------- findings-based analysis ---------------- */
  const active = openFindings.filter((f) => f.severity_id !== "Normal");
  const risks: FailureRisk[] = active.map((f) => {
    const r = rul.find((x) => x.driver && x.driver === f.tag);
    return {
      id: `F-${f.id}`,
      fault: f.rule_name ? `${f.rule_name} (${f.rule_code})` : f.type_name,
      component: f.sub_name ?? f.m_name ?? "",
      probability: null,
      severity: f.severity_id,
      window: r?.hours ? r.dueLabel : "—",
      priority: prio(f.severity_id)?.name ?? "",
    };
  });
  const weightOf = (sev: Severity) => RANK[sev];
  const groups = new Map<string, typeof active>();
  for (const f of active) (groups.get(f.sub_name ?? f.rule_name ?? "Machine") ?? groups.set(f.sub_name ?? f.rule_name ?? "Machine", []).get(f.sub_name ?? f.rule_name ?? "Machine")!).push(f);
  const totalWeight = active.reduce((a, f) => a + weightOf(f.severity_id), 0) || 1;
  const sources: IssueSource[] = [...groups.entries()].map(([key, list]) => {
    const worst = list.reduce<Severity>((a, f) => (RANK[f.severity_id] > RANK[a] ? f.severity_id : a), "Normal");
    return {
      id: key,
      cause: list.find((f) => f.rule_name)?.rule_name ?? list[0].type_name,
      subsystem: key,
      contribution: round((list.reduce((a, f) => a + weightOf(f.severity_id), 0) / totalWeight) * 100, 1),
      confidence: null,
      severity: worst,
      evidence: list
        .filter((f) => f.tag)
        .map((f) => ({ tag: f.tag!, label: f.m_name ?? f.tag!, detail: f.summary, severity: f.severity_id })),
    };
  });
  sources.sort((a, b) => b.contribution - a.contribution);
  const faults: FaultClass[] = active
    .filter((f) => f.rule_code)
    .map((f) => ({ id: `F-${f.id}`, label: `${f.rule_name} (${f.rule_code})`, probability: null, severity: f.severity_id, band: f.category ?? "" }));
  const actions: MaintenanceAction[] = active
    .filter((f) => f.action)
    .map((f) => {
      const p = prio(f.severity_id);
      return {
        id: `F-${f.id}`,
        title: f.rule_name ?? f.type_name,
        component: f.sub_name ?? "",
        priority: p?.name ?? "",
        window: p ? p.description : "—",
        eta: "—",
        confidence: null,
        rationale: f.action!,
      };
    });

  /* ---------------- health trend ---------------- */
  const lastScore = scores.rows.at(-1);
  const overallFit = fitLine(scores.rows.map((r) => ({ t: r.t.getTime(), v: Number(r.score) })));
  const sysOfSub = new Map(subs.map((s) => [s.subassemblyId, s.systemId]));
  const subFits = new Map<string, Fit | null>();
  for (const code of new Set(subScores.rows.map((r) => r.code))) {
    subFits.set(code, fitLine(subScores.rows.filter((r) => r.code === code).map((r) => ({ t: r.t.getTime(), v: Number(r.score) }))));
  }
  const project = (start: number | null, f: Fit | null, day: number) => (start === null ? null : clamp(f && significant(f, 24) ? start + f.b * day * 24 : start, 0, 100));
  const points: ConditionPoint[] = CONDITION_HORIZONS.map((day) => {
    const systems: Record<string, number> = {};
    for (const sy of catalog.systems) {
      const vals = subs
        .filter((s) => sysOfSub.get(s.subassemblyId) === sy.systemId && s.health !== null)
        .map((s) => project(s.health, subFits.get(s.subassemblyId) ?? null, day))
        .filter((v): v is number => v !== null);
      if (vals.length) systems[sy.systemId] = round(Math.min(...vals), 1);
    }
    return { day, overall: round(project(lastScore ? Number(lastScore.score) : null, overallFit, day) ?? 0, 1), systems };
  });
  const degradation: DegradationItem[] = subs.map((s) => {
    const f = subFits.get(s.subassemblyId) ?? null;
    return {
      id: s.subassemblyId,
      name: s.name,
      stageIndex: RANK[s.status ?? "Normal"],
      stageLabel: s.status ?? "No data",
      health: s.health,
      trend: f && significant(f, 24) ? (f.b > 0 ? "rising" : "falling") : "stable",
    };
  });
  degradation.sort((a, b) => b.stageIndex - a.stageIndex || (a.health ?? 101) - (b.health ?? 101));

  /* ---------------- features: what drives the health penalty ---------------- */
  const zWeight = param("z_weight") ?? 0;
  const contributions = analog
    .map((s) => {
      const ref = refBy.get(s.id);
      const v = rawBy.get(s.id)?.at(-1)?.v;
      if (v === undefined || !ref?.sigma || ref.expected === null || zFree === null) return null;
      const z = Math.abs((v - ref.expected) / ref.sigma);
      const limitPts = s.status === "Critical" ? (param("limit_critical") ?? 0) : s.status === "Alert" ? (param("limit_advisory") ?? 0) : 0;
      const pts = Math.min(param("z_cap") ?? 0, Math.max(0, z - zFree) * zWeight) + limitPts;
      return pts > 0 ? { s, pts } : null;
    })
    .filter((x): x is { s: (typeof analog)[number]; pts: number } => x !== null);
  const totalPts = contributions.reduce((a, c) => a + c.pts, 0) || 1;
  const features: FeatureWeight[] = contributions
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 6)
    .map((c) => ({ id: c.s.tag, tag: c.s.tag, label: c.s.name, weight: round((c.pts / totalPts) * 100, 1) }));

  /* ---------------- summary ---------------- */
  const coverage = catalog.sensors.length ? Math.round((catalog.sensors.filter((s) => s.quality !== "No data").length / catalog.sensors.length) * 100) : null;
  const worst = active.reduce<Severity>((a, f) => (RANK[f.severity_id] > RANK[a] ? f.severity_id : a), "Normal");
  const reasoning: ReasoningStep[] = [
    { id: "ingest", label: "Readings", detail: `${readingsLastHour.rows[0]?.n ?? 0} readings in the last hour from ${catalog.sensors.length} measurements`, status: coverage !== null && coverage < 100 ? "Alert" : "Normal" },
    { id: "validity", label: "Data validity", detail: coverage === null ? "No measurements" : `${coverage} % of measurements reporting`, status: "Normal" },
    { id: "limits", label: "Limits and references", detail: `${active.filter((f) => f.type === "limit_exceeded").length} limit, ${active.filter((f) => f.type === "behaviour_deviation").length} reference deviation finding(s)`, status: worst },
    { id: "rules", label: "Diagnostic rules", detail: `${active.filter((f) => f.type === "rule_pattern").length} active rule pattern(s)`, status: active.some((f) => f.type === "rule_pattern") ? worst : "Normal" },
    { id: "health", label: "Health index", detail: modelName ? `${modelName}${lastScore ? ` · ${round(Number(lastScore.score), 1)}` : ""}` : "No health model", status: "Normal" },
  ];

  const sysName = new Map(catalog.systems.map((s) => [s.systemId, s.name]));
  const locations: Record<string, SensorLocation> = {};
  for (const s of catalog.sensors) {
    locations[s.tag] = { systemId: s.systemId ?? "", system: sysName.get(s.systemId ?? "") ?? "", subassemblyId: s.subassemblyId ?? "", subassembly: s.subAssembly ?? "", component: s.component ?? "" };
  }

  return {
    machineId,
    generatedAt: new Date().toISOString(),
    keySensors,
    prognosis: {
      horizons: FORECAST_HORIZONS,
      forecasts,
      correlation: { tags: matrixTags, matrix, pairs },
      influences,
      condition: { horizons: CONDITION_HORIZONS, systems: catalog.systems.map((s) => ({ id: s.systemId, name: s.name })), points },
      locations,
      risks,
      rul,
      anomalies,
      anomalyTimeline: timeline,
    },
    analysis: {
      model: {
        healthIndex: lastScore ? round(Number(lastScore.score), 1) : null,
        confidence: coverage,
        inputs: catalog.sensors.length,
        condition: !lastScore ? "No data" : worst === "Critical" ? "Critical" : worst === "Alert" ? "Alert" : "Nominal",
        engine: modelName ?? "No health model",
      },
      sources,
      faults,
      degradation: { stages: severityOrder, items: degradation },
      actions,
      features,
      reasoning,
    },
  };
}
