/**
 * Kiln burner and coal firing PYR-BRN-01 rule evaluation.
 *
 * Reads the minute's shared context (`./context`) and records findings with
 * `H`; rule definitions live in `../rules/brn.ts`.
 */
import { fmtSigned, fmtZ } from "../shared";
import { bearingHit, patterned, slopePerHour, subsOf, unitRun, type EvalContext } from "./context";

const M = "PYR-BRN-01";

export function evalBrn(c: EvalContext): void {
  const { measured, states, res, sig, meanRes, ratio, good, quality, shellResMean, transient, H } = c;
  const paFanRun = unitRun(c, "brn-pafan") === "run";
  const blowerRun = unitRun(c, "brn-coal-blower") === "run";

  // The flame camera is operator visual evidence (D4: no unvalidated automatic classifier): it is
  // cited for review, never used to raise or grade a finding.
  const camLive = states["CAM-BRN-01"] === "FEED LIVE";
  const bzR = good("TMP-KLN-14") ? meanRes("TMP-KLN-14", 10) : 0;
  // Fuel: the coal rate holds its set-point, so the air channel — not a fuel change — explains the flame change.
  const coalDev = good("FLO-BRN-01") ? meanRes("FLO-BRN-01", 10) : 0;
  const coalAtSp = good("FLO-BRN-01") && Math.abs(coalDev) < 0.03 * Math.max(1, c.coalSp);
  // Shell effect: burning-zone shell residual (45–60 m) from the scanner map.
  const bzShell = quality("CAL-KLN-03") === "Good" ? shellResMean(45, 60) : null;
  const flameCtx = `coal ${measured["FLO-BRN-01"].toFixed(2)} t/h (${fmtSigned(coalDev, 2)} vs set-point) · burning zone ${fmtSigned(bzR, 0)} K · burning-zone shell ${bzShell === null ? "not valid" : `${fmtSigned(bzShell, 0)} K vs profile`} · flame camera ${camLive ? "live — operator review" : "feed lost"}`;

  /* ---- FP-31 SW-BRN-01: burner air channel blockage or leak (either direction) ---- */
  // Channel residuals over 3 samples (σ units); header residual over 5 samples (mbar).
  const chZ = (tag: string) => meanRes(tag, 3) / sig(tag);
  const swirlZ = chZ("PRS-BRN-01");
  const axialZ = chZ("PRS-BRN-02");
  const hdrR = meanRes("PRS-BRN-03", 5);
  const hdrZ = hdrR / sig("PRS-BRN-03");
  const paI = meanRes("ELE-BRN-01", 5);
  if (paFanRun && good("PRS-BRN-01", "PRS-BRN-02", "PRS-BRN-03") && coalAtSp) {
    // Header supply / restriction: the header moves and the channels downstream follow it (same sign).
    const chFollow = Math.sign(swirlZ) === Math.sign(hdrR) && Math.sign(axialZ) === Math.sign(hdrR) && Math.min(Math.abs(swirlZ), Math.abs(axialZ)) > 3;
    if (Math.abs(hdrR) > 15 && chFollow) {
      const p = measured["PRS-BRN-03"];
      H(M, "SW-BRN-01", {
        severity: p <= 215 || p >= 300 || bzR < -30 ? "Critical" : "Advisory",
        evidence: `Primary-air header ${p.toFixed(0)} mbar (${fmtSigned(hdrR, 0)} mbar, ${fmtZ(hdrZ)}) ${hdrR < 0 ? "falling — leak or supply loss" : "rising — restriction downstream"}; swirl ${fmtZ(swirlZ)} and axial ${fmtZ(axialZ)} follow it · PA fan current ${fmtSigned(paI, 0)} A vs model · ${flameCtx}`,
        tags: ["PRS-BRN-03", "PRS-BRN-01", "PRS-BRN-02", "ELE-BRN-01", "TMP-KLN-14", "FLO-BRN-01"],
        subs: ["brn-burner", "brn-pafan"],
        lead: { tag: "PRS-BRN-03", target: hdrR < 0 ? (p > 215 ? 215 : 190) : p < 300 ? 300 : 320 },
      });
    } else if ((Math.abs(swirlZ) > 6 || Math.abs(axialZ) > 6) && Math.abs(hdrZ) < 4) {
      const swirl = Math.abs(swirlZ) >= Math.abs(axialZ);
      const tag = swirl ? "PRS-BRN-01" : "PRS-BRN-02";
      const zz = swirl ? swirlZ : axialZ;
      const v = measured[tag];
      const [wLo, wHi, aLo, aHi] = swirl ? [135, 200, 115, 220] : [195, 280, 170, 300];
      H(M, "SW-BRN-01", {
        severity: v <= wLo || v >= wHi || bzR < -30 ? "Critical" : "Advisory",
        evidence: `${swirl ? "Swirl" : "Axial"} air ${v.toFixed(0)} mbar (${fmtZ(zz)}) ${zz > 0 ? "rising — tip / channel blockage downstream of the tap" : "falling — channel leak or blockage upstream of the tap"} at a steady header ${measured["PRS-BRN-03"].toFixed(0)} mbar · ${flameCtx}`,
        tags: [tag, "PRS-BRN-03", "TMP-KLN-14", "FLO-BRN-01"],
        lead: { tag, target: zz < 0 ? (v > wLo ? wLo : aLo) : v < wHi ? wHi : aHi },
      });
    }
  }

  /* ---- FP-34 SW-BRN-02: coal-bin smouldering (steady rise with CO) ---- */
  if (good("TMP-BRN-04", "GAS-BRN-01")) {
    const binR = meanRes("TMP-BRN-04", 10);
    const binRate = slopePerHour(c, "TMP-BRN-04", 60) ?? 0;
    const gasR = meanRes("GAS-BRN-01", 10);
    const gasRate = slopePerHour(c, "GAS-BRN-01", 60) ?? 0;
    const level = good("LEV-BRN-01") ? measured["LEV-BRN-01"] : null;
    const byLevel = binR > 5 && measured["GAS-BRN-01"] > 60;
    const byRate = binRate > 5 && gasR > 15 && gasRate > 0;
    if (byLevel || byRate) {
      // HOLD (Table 8.3 / 10.1): gas species and certified monitoring architecture unconfirmed — advisory evidence only.
      H(M, "SW-BRN-02", {
        severity: "Advisory",
        evidence: `Coal bin ${measured["TMP-BRN-04"].toFixed(1)} °C (${fmtSigned(binR)} K vs model, rising ${binRate.toFixed(1)} K/h over 1 h) with gas indication ${measured["GAS-BRN-01"].toFixed(0)} (${fmtSigned(gasR, 0)} vs model; ppm if CO / vol% if CO₂: species HOLD; no analyser-status point) · bin level ${level === null ? "not valid" : `${level.toFixed(0)} %${level > 75 ? " — high level, long residence" : ""}`} — EHS / SIS governs inerting`,
        tags: ["TMP-BRN-04", "GAS-BRN-01", "LEV-BRN-01"],
        subs: ["brn-coalbin"],
        lead: { tag: "GAS-BRN-01", target: measured["GAS-BRN-01"] < 80 ? 80 : 200 },
      });
    }
  }

  /* ---- FP-33 R-BRN-03 / R-BRN-05: PA fan or coal blower degradation ---- */
  if (paFanRun) {
    bearingHit(c, M, "R-BRN-03", [["VIB-BRN-01", "TMP-BRN-01", "brn-pafan", "Primary-air fan"]], 4.5, 7.1);
    const h = c.hits[M]["R-BRN-03"];
    // Third witness: the fan current (load deviation with mode context).
    if (h && good("ELE-BRN-01")) {
      h.evidence += ` · fan current ${fmtSigned(paI, 0)} A vs model${paI > 4 ? " (load up — corroborates)" : ""}`;
      h.tags = [...h.tags, "ELE-BRN-01"];
    }
  }
  if (blowerRun && good("VIB-BRN-02", "ELE-BRN-02") && ratio("VIB-BRN-02") > 1.5 && res("ELE-BRN-02") > 6) {
    H(M, "R-BRN-05", {
      severity: measured["VIB-BRN-02"] >= 6.3 || measured["ELE-BRN-02"] >= 245 ? "Critical" : "Advisory",
      evidence: `Blower vibration ×${ratio("VIB-BRN-02").toFixed(2)} model with current ${fmtSigned(res("ELE-BRN-02"), 0)} A`,
      tags: ["VIB-BRN-02", "ELE-BRN-02"],
      lead: { tag: "VIB-BRN-02", target: measured["VIB-BRN-02"] < 6.3 ? 6.3 : 9 },
    });
  }

  /* ---- FP-32 R-BRN-04: coal line choke (rising) / blower weakening (falling) ---- */
  const lineR = meanRes("PRS-BRN-04", 5);
  // Roots blower load follows the line pressure (≈ 0.15 A/mbar at the design point); 15-sample mean against the current noise.
  const blowI = meanRes("ELE-BRN-02", 15);
  const blowNeed = Math.max(4.5, 0.07 * Math.abs(lineR));
  if (blowerRun && good("PRS-BRN-04", "FLO-BRN-01", "ELE-BRN-02")) {
    const p = measured["PRS-BRN-04"];
    const choke = lineR > 50 && blowI > blowNeed;
    const weak = lineR < -50 && blowI < -blowNeed;
    if (choke || weak) {
      H(M, "R-BRN-04", {
        severity: choke ? (p >= 540 || lineR > 120 ? "Critical" : "Advisory") : p <= 300 || lineR < -120 ? "Critical" : "Advisory",
        evidence: `Line ${p.toFixed(0)} mbar, ${fmtSigned(lineR, 0)} mbar ${choke ? "above" : "below"} what ${measured["FLO-BRN-01"].toFixed(2)} t/h explains, blower current ${fmtSigned(blowI, 0)} A — ${choke ? "line choking" : "blower weakening"}`,
        tags: ["PRS-BRN-04", "FLO-BRN-01", "ELE-BRN-02"],
        lead: { tag: "PRS-BRN-04", target: choke ? (p < 540 ? 540 : 620) : p > 300 ? 300 : 250 },
      });
    }
  }

  /* ---- SV-BRN-01: D5 Table 5.5.6 sensor verification ---- */
  // "≈ 0 when stopped" is screened line-wide by the data-quality stage (R-DQ-02 physical neighbours).
  const sv: string[] = [];
  const svTags: string[] = [];
  if (!transient) {
    // Header vs channels and fan current: a real header change moves the channels downstream or the fan load.
    if (paFanRun && good("PRS-BRN-03") && !patterned(c, "PRS-BRN-03") && Math.abs(hdrR) > 15 && Math.abs(meanRes("PRS-BRN-01", 5)) < 3 * sig("PRS-BRN-01") && Math.abs(meanRes("PRS-BRN-02", 5)) < 3 * sig("PRS-BRN-02") && Math.abs(paI) < 3) {
      sv.push(`PRS-BRN-03 ${fmtSigned(hdrR, 0)} mbar vs model while swirl, axial and the PA fan current (${fmtSigned(paI, 1)} A) are unchanged — header tap / transmitter`);
      svTags.push("PRS-BRN-03");
    }
    // Line pressure vs blower current: a choke or a weakening blower moves the Roots blower load with the pressure.
    // Pressure and current over the same 15-sample window, so a pressure rising through the window is not read ahead of the current.
    const lineR15 = meanRes("PRS-BRN-04", 15);
    if (blowerRun && good("PRS-BRN-04", "ELE-BRN-02") && !patterned(c, "PRS-BRN-04") && Math.abs(lineR15) > 50 && Math.abs(blowI) < 3) {
      sv.push(`PRS-BRN-04 ${fmtSigned(lineR15, 0)} mbar vs model while the blower current is unchanged (${fmtSigned(blowI, 1)} A) — line-pressure tap / transmitter`);
      svTags.push("PRS-BRN-04");
    }
  }
  if (sv.length) H(M, "SV-BRN-01", { severity: "Advisory", evidence: sv.join(" · "), tags: svTags, subs: subsOf(svTags) });
}
