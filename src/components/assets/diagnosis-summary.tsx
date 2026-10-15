"use client";

import type { SimFrame } from "@/lib/kiln-sim/engine";
import type { Tone } from "./assets-shell-ui";
import type { KpiItem } from "./analysis/an-ui";
import { isoBounds, isoZone, toneOf, type DxAlarm, type DxSensor, type Finding } from "./diagnosis-model";

/* ==========================================================================
   Diagnosis KPI strip (4 tiles, numbers only) and small shared formatters.
   ========================================================================== */

export function zText(z: number | null): string | undefined {
  if (z === null || !Number.isFinite(z)) return undefined;
  return `${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(1)}σ`;
}

/** Status tone for a sensor, only when it is actually in warning / alarm or not trusted. */
export function sensorTone(s: DxSensor | undefined): Tone | undefined {
  if (!s) return undefined;
  if (s.validity === "invalid" || s.validity === "stale" || s.severity === "Critical") return "bad";
  if (s.severity === "Advisory" || s.validity === "suspect") return "warn";
  return undefined;
}

export function diagnosisKpis({
  frame,
  alarms,
  open,
  sensors,
  loading,
}: {
  frame: SimFrame | null;
  alarms: DxAlarm[];
  open: Finding[];
  sensors: DxSensor[];
  loading: boolean;
}): KpiItem[] {
  const lead = open[0] ?? null;
  const leadTile: KpiItem = lead
    ? {
        label: "Lead finding",
        value: lead.ruleId ?? lead.name,
        text: true,
        foot: [lead.name !== lead.ruleId ? lead.name : null, lead.priority].filter(Boolean).join(" · "),
        tone: lead.state === "confirming" || lead.state === "matching" ? undefined : toneOf(lead.severity),
      }
    : { label: "Lead finding", value: loading ? "…" : "None", text: true, foot: loading ? "Loading findings…" : "No pattern matches" };

  if (frame) {
    const raised = alarms.filter((a) => a.state !== "confirming");
    const critical = raised.filter((a) => a.severity === "Critical").length;
    const byP = (p: string) => raised.filter((a) => a.priority === p).length;
    const worst = sensors
      .filter((s) => s.z !== null && s.validity === "valid")
      .reduce<DxSensor | null>((acc, s) => (!acc || Math.abs(s.z as number) > Math.abs(acc.z as number) ? s : acc), null);
    const notValid = frame.pipeline.suspect + frame.pipeline.invalid;
    return [
      {
        label: "Active alarms",
        value: String(raised.length),
        foot: `P1 ${byP("P1")} · P2 ${byP("P2")} · P3 ${byP("P3")} · ${raised.filter((a) => !a.acknowledged).length} unack`,
        tone: critical ? "bad" : raised.length ? "warn" : undefined,
      },
      {
        label: "Rules firing",
        value: String(frame.pipeline.matching),
        unit: `/ ${frame.rules.length}`,
        foot: `${frame.pipeline.confirmed} confirmed · ${frame.pipeline.pending} pending`,
      },
      lead
        ? {
            ...leadTile,
            label: "Top fault",
            foot: `${lead.name}${lead.probability !== null ? (lead.basis === "Rule engine" ? ` · persistence score ${Math.round(lead.probability)}` : ` · ${Math.round(lead.probability)} %`) : ""}`,
          }
        : { ...leadTile, label: "Top fault" },
      worst
        ? {
            label: "Worst residual",
            value: zText(worst.z) ?? "—",
            text: true,
            foot: `${worst.tag} · ${notValid} of ${frame.pipeline.valid + notValid} signals not valid`,
            tone: notValid ? "warn" : Math.abs(worst.z as number) > 3 ? "warn" : undefined,
          }
        : { label: "Worst residual", value: "—", text: true, foot: `${notValid} signals not valid` },
    ];
  }

  const excursion = sensors.filter((s) => s.severity !== "Normal").length;
  const vib = sensors.filter((s) => s.isVibration && s.value !== null);
  const worst = vib.reduce<{ s: DxSensor; z: string } | null>((acc, s) => {
    const z = isoZone(s.value as number, isoBounds(s));
    return !acc || z > acc.z ? { s, z } : acc;
  }, null);
  return [
    {
      label: "Findings",
      value: String(open.length),
      foot: open.length ? `${open.filter((f) => f.state === "recorded").length} recorded · ${open.filter((f) => f.state === "matching").length} signature match` : "None present",
      tone: open.some((f) => f.severity === "Critical" && f.state === "recorded") ? "bad" : open.some((f) => f.state === "recorded") ? "warn" : undefined,
    },
    {
      label: "Sensors in excursion",
      value: String(excursion),
      unit: `/ ${sensors.length}`,
      foot: "at alert or alarm limit",
      tone: sensors.some((s) => s.severity === "Critical") ? "bad" : excursion ? "warn" : undefined,
    },
    leadTile,
    worst
      ? {
          label: "Vibration zone",
          value: worst.z,
          foot: `${worst.s.tag} · ${(worst.s.value as number).toFixed(2)} mm/s`,
          tone: worst.z === "D" ? "bad" : worst.z === "C" ? "warn" : undefined,
        }
      : { label: "Mapped sensors", value: String(sensors.length), foot: "no live validation" },
  ];
}
