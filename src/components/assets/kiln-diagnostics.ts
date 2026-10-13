/**
 * Client-safe kiln diagnostics vocabulary.
 *
 * The merge in `src/server/db/seed-data/kiln.ts` owns the canonical sensor
 * catalog and lives on the server. This module holds only the diagnostics
 * lookup the client screens need (limits, nominal bands, failure reasons),
 * derived from the PDF diagnostics metadata — no sensor catalog, so it stays
 * on the client side of the module boundary.
 */

import {
  KILN_ALL_HOTSPOTS,
  KILN_DRV_HOTSPOTS,
  KILN_SUP_HOTSPOTS,
  KILN_SHL_HOTSPOTS,
} from "./assets-data";
import {
  KILN_DIAGNOSTICS_METADATA,
  type KilnSensorDiagnosticsMeta,
} from "./diagnostics-pdf-data";

export type SystemId = "DRV-KLN-01" | "SUP-KLN-01" | "SHL-KLN-01" | "PRC-KLN-01";

export function systemForTag(tag: string): SystemId {
  if (KILN_DRV_HOTSPOTS.some((h) => h.parameter === tag || h.id === tag)) return "DRV-KLN-01";
  if (KILN_SUP_HOTSPOTS.some((h) => h.parameter === tag || h.id === tag)) return "SUP-KLN-01";
  if (KILN_SHL_HOTSPOTS.some((h) => h.parameter === tag || h.id === tag)) return "SHL-KLN-01";
  return "PRC-KLN-01";
}

export function fallbackDiagnostics(
  tag: string,
  subId: SystemId
): KilnSensorDiagnosticsMeta | undefined {
  const existing = (KILN_DIAGNOSTICS_METADATA as Record<string, KilnSensorDiagnosticsMeta>)[tag];
  if (existing) return existing;
  // Generate generic support-bearing diagnostics for the 9 missing station RTDs
  // (TMP-02/03/04/06/07/08/09/11/12) using the TMP-01 pattern.
  const station = tag >= "TMP-KLN-09" ? "Station 3" : tag >= "TMP-KLN-05" ? "Station 2" : "Station 1";
  const numVal = parseFloat(
    KILN_ALL_HOTSPOTS.find((h) => h.parameter === tag || h.id === tag)?.value || "58"
  );
  return {
    tag,
    point: "Px",
    name: `Support Bearing Temperature (${tag})`,
    subAssemblyTag: subId,
    subAssemblyName: station,
    component: `${station} Support Pier`,
    sensorType: "Pt100 RTD (Embedded)",
    unit: "°C",
    nominalBand: "40 – 65 °C",
    warningAlertLimit: 75,
    alarmDangerLimit: 85,
    warningAlertLabel: "≥ 75 °C or split > 10 K (Alert)",
    alarmDangerLabel: "≥ 85 °C (Danger / Trip)",
    standard: "OEM / Plant Limit",
    criticality: "A",
    priority: "Required",
    defaultBaseline: Number.isFinite(numVal) ? numVal : 58,
    reasons: [
      {
        ruleId: "R-SUP-01",
        ruleName: `Roller Skew Imbalance — ${station}`,
        primaryCause:
          "Support roller skew angle incorrect or pier settlement causing uneven thrust loading",
        mechanism:
          "Roller axis not parallel to kiln axis; bearing pair experiences heavy axial thrust collar rubbing.",
        symptomSignature: `Bearing-pair split (A vs B) > 10 K accompanied by thrust hydraulic pressure (PRS-KLN-07) rise.`,
        consequence:
          "Tyre flank cutting, concave roller surface wear, bronze liner wiping, kiln axial instability.",
        prescriptiveAction:
          "Inspect roller skew adjustment screws; re-align roller parallel to kiln axis; verify thrust pressure balance.",
        crossCheckSensors: ["PRS-KLN-07"],
      },
      {
        ruleId: "R-SUP-02",
        ruleName: `Support Bearing Lubrication Loss — ${station}`,
        primaryCause:
          "Oil bath water contamination, bronze oil scraper failure, or cooling water blockage",
        mechanism: "Hydrodynamic oil wedge collapses, causing boundary friction on journal.",
        symptomSignature:
          "Fast single-bearing heating while thrust pressure remains normal and opposite bearing stays cool.",
        consequence: "Seized support roller bearing, journal shaft scoring, risk of bearing oil fire.",
        prescriptiveAction:
          "Inspect oil level and oil scraper rotation in bearing housing; flush oil bath; verify cooling coil flow.",
        crossCheckSensors: ["PRS-KLN-07"],
      },
    ],
  };
}

export function getDiagnosticsForSensor(tag: string): KilnSensorDiagnosticsMeta {
  const sysId = systemForTag(tag);
  return fallbackDiagnostics(tag, sysId)!;
}
