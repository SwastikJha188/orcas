/**
 * Grate cooler PYR-CLR-01 rule definitions.
 * Evaluated in `../eval/clr.ts`.
 *
 * D5 §5.6.4 failure modes FP-35 … FP-39 (Table 9.4.3) and the §5.6.6 sensor
 * verification checks (SV-CLR-01).
 */
import { m, type PyroRuleDef } from "./common";

export const CLR_RULES: PyroRuleDef[] = [
  // ------------------------------------------------------------- CLR-01
  ...m("PYR-CLR-01", [
    {
      id: "SW-CLR-01",
      name: "Cooler air / grate condition suspicion",
      category: "Process",
      system: "GRT-CLR-01",
      subs: ["clr-hot", "clr-cold"],
      logic:
        "D5 FP-35: one compartment pressure > 18 % below its bed-corrected model with its fan current > 3 % above model (air short-circuits through the grate at a steady fan); discharge heating corroborates. Suspicion only (Advisory): no cooling-air flow, bed depth or fan damper input exists and tap validity is unchecked",
      cause: "Grate holes: worn, broken or missing grate plates; air short-circuit",
      consequence: "Poor cooling: cool secondary air (flame, fuel use), hot clinker downstream",
      action: "Inspect the grate through the side doors at the next stop; pressure change is multi-causal",
      inputs: ["PRS-CLR-01", "PRS-CLR-02", "PRS-CLR-03", "PRS-CLR-04", "PRS-CLR-05", "PRS-CLR-06", "ELE-CLR-01", "ELE-CLR-02", "ELE-CLR-03", "ELE-CLR-04", "ELE-CLR-05", "ELE-CLR-06", "TMP-CLR-08", "SPD-CLR-01", "TMP-BRN-02"],
      spec: "SW-CLR-01",
      fp: ["FP-35"],
      owner: "Process engineer (cooler)",
      alternatives: "Bed depth change (thin bed over the compartment), fan damper opened, blocked or leaking pressure tap (SV-CLR-01 checks pressure against fan current)",
      unproven: "The cause of the pressure change: bed depth, fan / damper and tap validity all move it; plate damage is confirmed only by inspection",
    },
    {
      id: "R-CLR-02",
      name: "Cooling fan bearing defect",
      category: "Rotating equipment",
      system: "FAN-CLR-01",
      subs: ["clr-fans13", "clr-fans46"],
      logic: "Fans 1–3: vibration ×1.4 with bearing heating. Fans 4–6 (no pickup): bearing > 6 K above model with current up. The fan is compared with its neighbours (vibration against the median of the other fans, bearing against the other bearings)",
      cause: "Cooling-fan bearing wear, lubrication loss or imbalance",
      consequence: "Fan trip reduces cooling air: red river, kiln output must drop",
      action: "Check the fan bearing and grease; plan the change before the trip limit",
      inputs: ["VIB-CLR-01", "VIB-CLR-02", "VIB-CLR-03", "TMP-CLR-01", "TMP-CLR-02", "TMP-CLR-03", "TMP-CLR-04", "TMP-CLR-05", "TMP-CLR-06"],
      spec: "SW-DQ-02",
      fp: ["FP-37"],
      owner: "Mechanical maintenance",
      alternatives: "Impeller dust build-up or imbalance (vibration without heating), coupling misalignment, hot-air recirculation to the bearing housing",
      unproven: "Bearing versus imbalance versus lubrication, until a spectrum is taken; fans 4–6 have no vibration pickup",
    },
    {
      id: "R-CLR-03",
      name: "Grate drive jam / hydraulic fault",
      category: "Material handling",
      system: "GRT-CLR-01",
      subs: ["clr-drive"],
      logic:
        "D5 FP-38 in both directions: working pressure > 25 bar above the bed-corrected model or oil > 8 K hot (heavy bed / jam); pressure > 20 % below model, Critical at ≤ 70 bar (hydraulic collapse); stroke rate > 5 % off the feed-following controller target, Critical at zero speed with the drive on",
      cause: "Rising: grate jamming (snowman, large clinker), heavy bed. Collapse / slow stroke: HPU pump or relief-valve wear, internal cylinder leak, oil loss",
      consequence: "Grate stops or runs slow: the bed builds, the kiln must slow or stop",
      action: "Rising: inspect for a snowman / blockage at the inlet and the HPU cooler. Collapse: check the HPU pump, relief valve, oil level and cylinder seals",
      inputs: ["PRS-CLR-07", "TMP-CLR-07", "SPD-CLR-01"],
      spec: "SW-CLR-01",
      fp: ["FP-38"],
      owner: "Mechanical maintenance (hydraulics)",
      alternatives: "Feed change not yet followed by the stroke controller, operator stroke override, stroke pickup fault",
      unproven: "No grate stroke command tag exists: SPD-CLR-01 is judged against the feed-following controller target, not a command; where the jam or the leak is, until inspected",
    },
    {
      id: "R-CLR-04",
      name: "Vent fan degradation",
      category: "Rotating equipment",
      system: "VNT-CLR-01",
      subs: ["clr-vent"],
      logic:
        "Vent fan vibration ×1.4 model, or bearing > 8 K above model with vibration ×1.15; bearing heating marks a bearing defect, falling current (< −8 A, less flow) an impeller build-up; exhaust temperature cited",
      cause: "Impeller dust build-up / wear or bearing defect",
      consequence: "Vent fan capacity falls or the fan trips: the cooler pressurises and the hood pressure rises",
      action: "Plan impeller cleaning or bearing work at the next stop",
      inputs: ["VIB-CLR-07", "TMP-CLR-10", "ELE-CLR-07", "TMP-CLR-09"],
      spec: "SW-DQ-02",
      fp: ["FP-39"],
      owner: "Mechanical maintenance",
      alternatives: "Damper or process change (current only), loose pickup mounting (vibration only — verify the sensor first, D5 Table 9.4.2)",
      unproven: "Build-up versus bearing versus looseness until a spectrum is taken; the vent fan has no speed point",
    },
    {
      id: "R-CLR-05",
      name: "Red river / snowman (hot clinker discharge)",
      category: "Process",
      system: "GRT-CLR-01",
      subs: ["clr-discharge"],
      logic: "D5 FP-36: hot-zone compartment pressures diverging (spread of compartments 1–3 > 15 % of model) with discharge IR > 15 K above model, or discharge > 30 K above the model at the same feed and cooling air",
      cause: "Red river: fine hot clinker channelling, air maldistribution; snowman: sticky material building at the inlet",
      consequence: "Hot clinker damages the crusher and pan conveyor; flame and secondary air disturbed",
      action: "Raise compartment air in the hot zone, check the bed depth and look for a snowman at the inlet",
      inputs: ["TMP-CLR-08", "PRS-CLR-01", "PRS-CLR-02", "PRS-CLR-03"],
      spec: "SW-CLR-01",
      fp: ["FP-36"],
      owner: "Kiln / cooler operator",
      alternatives: "Feed or burning-zone change, cooling-air reduction, IR window dirty or misaligned (SV-CLR-01 compares with the handheld)",
      unproven: "Red river versus snowman until the bed is viewed (no cooler camera, SW-CLR-02 not evaluated)",
    },
    {
      id: "SV-CLR-01",
      name: "Cooler sensor verification",
      category: "Data quality",
      system: "DQ",
      subs: [],
      logic:
        "D5 Table 5.6.6 working checks: each compartment pressure agrees with its fan current (> 20 % off with the current unchanged, discharge steady); the discharge IR agrees with the latest 4-hourly handheld round within 25 K at a steady operating point. Not while a condition rule already explains the deviation. A flat compartment pressure (blocked tap), ≈ 0 when stopped and current-moved-pressure-did-not are screened by R-DQ-02",
      cause: "Blocked or leaking pressure tap, transmitter drift, dirty or misaligned IR window, current transducer fault",
      consequence: "Cooler findings would judge a reading that no longer follows its physical neighbours",
      action: "Rod the tap and check the transmitter; clean and align the IR window, compare with a handheld; keep the reading out of diagnosis until it agrees",
      inputs: ["PRS-CLR-01", "PRS-CLR-02", "PRS-CLR-03", "PRS-CLR-04", "PRS-CLR-05", "PRS-CLR-06", "TMP-CLR-08"],
      spec: "SW-DQ-01",
      owner: "Instrument technician",
      alternatives: "Real bed-depth change local to one compartment, a fan stop / start in progress",
      unproven: "Which of the disagreeing readings is wrong: disagreement alone is a suspect flag, not proof of instrument failure",
    },
  ]),
];
