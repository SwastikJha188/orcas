"use client";

import { crossingsAt, durationText, rangeText, riskForRow, isBaselineRisk } from "./prognosis-derive";
import { toneFor, type KpiItem, type ProgSectionProps } from "./prog-ui";

/** Page KPI strip: the four most important prognosis figures (numbers only). */
export function progKpis({ data, rows }: Pick<ProgSectionProps, "data" | "rows">): KpiItem[] {
  const first = rows[0] ?? null;
  if (!first) return [];
  const mode = riskForRow(first, data);
  const c24 = crossingsAt(data, "24h");
  const tone = toneFor(first.status);
  return [
    {
      label: "Intervene within",
      value: rangeText(first.band.lo, first.hours),
      text: true,
      foot: "lower bound to estimate",
      tone: tone === "warn" || tone === "bad" ? tone : undefined,
    },
    {
      label: "Governing",
      value: first.name,
      text: true,
      foot: mode && !isBaselineRisk(mode) ? mode.fault : "Health-index trend",
    },
    { label: "RUL interval", value: rangeText(first.band.lo, first.band.hi), text: true, foot: `± ${100 - first.confidence} % of estimate` },
    {
      label: "Limit crossings · 24 h",
      value: String(c24.length),
      foot: c24[0] ? `First ${c24[0].s.tag} · ${c24[0].c.hours === 0 ? "now" : durationText(c24[0].c.hours)}` : "None forecast",
      tone: c24.length ? (c24.some((x) => x.c.level === "alarm") ? "bad" : "warn") : undefined,
    },
  ];
}

/** ISO 13381-1 §8-style plain-text prognosis report, downloaded on click. */
export function downloadReport({ machine, data, analysis, rows }: ProgSectionProps, stamp: string | null) {
  const lines = [
    `ULTRON prognosis report (ISO 13381-1 §8 fields)`,
    `Asset: ${machine.name} (${machine.id})`,
    `Generated: ${stamp ?? "—"}`,
    `Model: ${analysis?.model.engine ?? "—"}`,
    ``,
    `Sub-assembly\tRUL est.\tInterval\tConfidence %\tBasis\tFailure mode\tP %\tWithin`,
    ...rows.map((r) => {
      const k = riskForRow(r, data);
      return [
        r.name,
        durationText(r.hours),
        rangeText(r.band.lo, r.band.hi),
        r.confidence,
        r.basis === "finding" ? "rule time-to-limit" : "health-index trend",
        k ? k.fault : "—",
        k ? k.probability : "—",
        k ? k.window : "—",
      ].join("\t");
    }),
    ``,
    `Estimates are not calibrated against verified failures.`,
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `prognosis-${machine.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
