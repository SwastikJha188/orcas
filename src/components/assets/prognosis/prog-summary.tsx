"use client";

import { crossingsAt, durationText, failureChance, FAILURE_HORIZONS, healthStatus, rangeText, riskForRow, isBaselineRisk } from "./prognosis-derive";
import { toneFor, type KpiItem, type ProgSectionProps } from "./prog-ui";
import type { HealthBands } from "@/lib/reference-data";

const alert = (t: ReturnType<typeof toneFor>) => (t === "warn" || t === "bad" ? t : undefined);

/**
 * Page KPI strip: next failure, failure chance, alarm limits ahead, health in 30 d.
 * For one part: its sensors' alarm crossings, and its health now (the health forecast is machine-wide).
 */
export function progKpis(
  { data, rows }: Pick<ProgSectionProps, "data" | "rows">,
  bands: HealthBands | null,
  part: { tags: Set<string>; health: number | null } | null = null,
): KpiItem[] {
  if (rows.length === 0) return [];
  // Only rows with an estimate (a measurement trending toward a limit) count; the rest have no time to failure.
  const timed = rows.flatMap((r) => (r.hours !== null && r.band ? [{ ...r, hours: r.hours, band: r.band }] : []));
  const next = timed.length ? timed.reduce((a, r) => (r.hours < a.hours ? r : a), timed[0]) : null;
  const worst = timed.length ? FAILURE_HORIZONS.map((h) => Math.max(...timed.map((r) => failureChance(r.band, h.hours)))) : null;
  const alarms = crossingsAt(data, "7d").filter((x) => x.c.level === "alarm" && (!part || part.tags.has(x.s.tag)));
  const pts = data.condition.points;
  const at30 = pts.find((p) => p.day >= 30) ?? pts[pts.length - 1] ?? null;
  const now = pts[0] ?? null;
  const at30Status = at30 ? healthStatus(at30.overall, bands) : null;
  const partStatus = part?.health != null ? healthStatus(part.health, bands) : null;
  const chanceLabel = `Chance of failure in ${FAILURE_HORIZONS.map((h) => h.label).join(" · ")}`;
  return [
    next
      ? {
          label: "Next repair needed in",
          value: durationText(next.hours),
          text: true,
          foot: `${next.name}, likely ${rangeText(next.band.lo, next.band.hi)}`,
          tone: alert(toneFor(next.status)),
        }
      : { label: "Next repair needed in", value: "—", text: true, foot: rows[0].dueLabel },
    worst
      ? {
          label: chanceLabel,
          value: worst.map((v) => `${v}`).join(" · "),
          unit: "%",
          text: true,
          foot: timed.length === 1 && timed[0].life ? timed[0].dueLabel : "Highest of any part, for each period",
          tone: worst[0] >= 50 ? "bad" : worst[1] >= 50 ? "warn" : undefined,
        }
      : { label: chanceLabel, value: "—", text: true, foot: "No reading is heading toward a limit" },
    {
      label: "Sensors to reach alarm in 7 d",
      value: String(alarms.length),
      unit: "sensors",
      foot: alarms[0] ? `First: ${alarms[0].s.name}, ${alarms[0].c.hours === 0 ? "already there" : `in ${durationText(alarms[0].c.hours)}`}` : "None expected",
      tone: alarms.length ? "bad" : undefined,
    },
    part
      ? {
          label: "Part health now",
          value: part.health === null ? "—" : String(part.health),
          unit: part.health === null ? undefined : "/100",
          bar: part.health ?? undefined,
          foot: "The 30-day health forecast covers the whole machine",
          tone: partStatus === null ? undefined : alert(toneFor(partStatus)),
        }
      : at30
      ? {
          label: `Health score in ${at30.day} days`,
          value: String(Math.round(at30.overall)),
          unit: "/100",
          bar: at30.overall,
          foot: now ? `Today ${Math.round(now.overall)} of 100` : undefined,
          tone: at30Status === null ? undefined : alert(toneFor(at30Status)),
        }
      : { label: "Health score in 30 days", value: "—", foot: "No forecast available" },
  ];
}

/** ISO 13381-1 §8-style plain-text prognosis report, downloaded on click. */
export function downloadReport({ machine, data, analysis, rows }: ProgSectionProps, stamp: string | null) {
  const lines = [
    `ULTRON forecast report: what happens next (fields follow ISO 13381-1 §8)`,
    `Machine: ${machine.name} (${machine.id})`,
    `Created: ${stamp ?? "—"}`,
    `Calculated by: ${analysis?.model.engine ?? "—"}`,
    ``,
    `Part\tTime left before repair (est.)\tLikely range\tConfidence %\tBased on\tWhat may fail\t${FAILURE_HORIZONS.map((h) => `Chance of failure in ${h.label} %`).join("\t")}`,
    ...rows.map((r) => {
      const k = riskForRow(r, data);
      return [
        r.name,
        r.hours === null ? r.dueLabel : durationText(r.hours),
        r.band ? rangeText(r.band.lo, r.band.hi) : "—",
        r.confidence ?? "—",
        r.life ? (r.life.source === "recorded" ? "the part's recorded life" : `typical life for a ${r.life.kind}`) : r.basis === "finding" ? "a reading heading toward its limit" : "health score trend",
        k && !isBaselineRisk(k) ? k.fault : "—",
        ...FAILURE_HORIZONS.map((h) => (r.band ? failureChance(r.band, h.hours) : "—")),
      ].join("\t");
    }),
    ``,
    `Chance of failure = how much of the likely range of time left falls within that period; for a part with no reading moving toward its limit, the Weibull chance from its life (its recorded life, else the typical life for its kind of part). These estimates have not yet been checked against real failures.`,
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `prognosis-${machine.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
