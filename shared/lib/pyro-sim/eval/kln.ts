/**
 * Rotary kiln PYR-KLN-01 rule evaluation (drive, lubrication, supports, thrust, shell, inlet, outlet).
 *
 * Reads the minute's shared context (`./context`) and records findings with
 * `H`; rule definitions live in `../rules/kln.ts`. Every D5 Table 5.4.4 /
 * 9.4.3 kiln fault pattern (FP-12 … FP-30) is judged here, the shell ones on
 * the thermal-map processing of D5 Table 9.5 (`c.thermal`), plus the
 * rule-like sensor working checks of D5 Table 5.4.6 (R-KLN-20).
 *
 * Persistence is the engine's (D5 §9.4.5): Alert after 3 samples, a state
 * rule after 2, Critical after 1; `stateRule` marks urgent evidence (switches,
 * hood pressure, travel limit) that a transient must not hold back.
 */
import { formatDuration } from "../../kiln-sim/engine";
import { SHELL_ALERT, SHELL_COVERAGE_ALARM, SHELL_COVERAGE_TARGET, SHELL_DANGER, SHELL_HOT_DELTA, SHELL_RATE_WARN } from "../../kiln-sim/shell-map";
import { HANDHELD_EMISSIVITY, SCANNER_EMISSIVITY, clockLabel, fmtSigned, fmtZ, median, slope } from "../shared";
import type { EvalContext } from "./context";

const M = "PYR-KLN-01";
/** A laboratory result older than this no longer counts as evidence (SW-KLN-05 "dated laboratory results"). */
const LAB_MAX_AGE = 24 * 60;
/** A handheld round stays the scanner cross-check until the next round (demo cadence 4 h). */
const HANDHELD_VALID = 250;
/** Girth-gear spray cycle (demo): a silent circuit misses one cycle per this many minutes. */
const SPRAY_CYCLE = 15;
/** ISO 20816-3 zone C/D (D5 Table 9.2 vibration alarm) and the OEM bearing limit (≈ 95 °C). */
const VIB_ALARM = 7.1;
const VIB_WARN = 4.5;
const BEARING_LIMIT = 95;
/** Support stations: roller bearing pairs (A / B of one roller); OSW-PE-SNL-PYR-01 Rev. 02 has no oil-bath level switches. */
const STATIONS = [
  { n: 1, sub: "kln-st1", pairs: [["TMP-KLN-01", "TMP-KLN-02"], ["TMP-KLN-03", "TMP-KLN-04"]] },
  { n: 2, sub: "kln-st2", pairs: [["TMP-KLN-05", "TMP-KLN-06"], ["TMP-KLN-07", "TMP-KLN-08"]] },
  { n: 3, sub: "kln-st3", pairs: [["TMP-KLN-09", "TMP-KLN-10"], ["TMP-KLN-11", "TMP-KLN-12"]] },
] as const;
/** Main motor stator winding RTDs (Rev. 02: six, two per phase). */
const WINDINGS = [1, 2, 3, 4, 5, 6].map((n) => `TMP-KLN-4${n}`);
/** Roller bearing OEM-type limit (Rev. 02 HH 80 °C). */
const ROLLER_LIMIT = 80;
const PRX = [1, 2, 3, 4, 5, 6].map((n) => `PRX-KLN-0${n}`);
const BRN_AIR = ["PRS-BRN-01", "PRS-BRN-02", "PRS-BRN-03"];

type Equipment = Record<string, string | undefined>;

export function evalKln(c: EvalContext): void {
  const { t, s, measured, model, states, thermal: th, shellRes, shellProfile, tyreIdx, scannerSuspect, steadyFeed, steadyCoal, res, sig, z, meanRes, resStd, ratio, good, H } = c;
  // Equipment run states (contract §1, CORE).
  const eq: Equipment = c.equipment ?? {};
  const hist = (tag: string) => s.hist[tag] ?? [];
  const meanOf = (tag: string, n: number) => {
    const h = hist(tag);
    const k = Math.min(n, h.length);
    if (!k) return measured[tag];
    let a = 0;
    for (let i = h.length - k; i < h.length; i++) a += h[i];
    return a / k;
  };
  /** 10-sample mean measured / model (vibration × baseline). */
  const ratio10 = (tag: string) => 1 + meanRes(tag, 10) / Math.max(0.05, model[tag]);
  const ratePerH = (tag: string, n = 30) => (slope(hist(tag), n) ?? 0) * 60;
  const zm = (tag: string, n = 10) => meanRes(tag, n) / sig(tag);
  const speed = measured["SPD-KLN-01"];
  const kilnTurning = speed > 0.2;
  // The six motor windings as one thermal witness: the valid ones' mean residual and their hottest reading.
  const wdgOk = WINDINGS.filter((tg) => good(tg));
  const wdgRes = (n = 10) => (wdgOk.length ? wdgOk.reduce((a, tg) => a + meanRes(tg, n), 0) / wdgOk.length : 0);
  const wdgNow = () => (wdgOk.length ? wdgOk.reduce((a, tg) => a + res(tg), 0) / wdgOk.length : 0);
  const wdgMax = wdgOk.length ? Math.max(...wdgOk.map((tg) => measured[tg])) : 0;
  const wdgHot = wdgOk.length ? wdgOk.reduce((a, b) => (measured[b] > measured[a] ? b : a)) : WINDINGS[0];

  /* ---------------- FP-24 tyre migration (SW-KLN-01) ---------------- */
  {
    let mig: { tag: string; r: number; n: number; v: number; score: number } | null = null;
    for (const n of [1, 2, 3]) {
      const tag = `MIG-KLN-0${n}`;
      if (!good(tag)) continue;
      const r = meanRes(tag, 10);
      const v = meanOf(tag, 10);
      // Both directions: against the hot baseline (−3 / +4 mm/rev) and outside the demo OEM band 4–16 mm/rev.
      const score = Math.max(r < -3 ? -r - 3 : 0, r > 4 ? r - 4 : 0, v < 4 ? 4 - v : 0, v > 16 ? v - 16 : 0);
      if (score > 0 && (!mig || score > mig.score)) mig = { tag, r, n, v, score };
    }
    if (mig) {
      const tyreShell = shellProfile[tyreIdx[mig.n - 1]];
      const band = mig.v < 4 || mig.v > 16 ? ` — outside the 4–16 mm/rev band${mig.v <= 2 || mig.v >= 22 ? ", far outside (would be critical once the OEM pickup and baseline are approved)" : ""}` : "";
      // MIG-KLN-01…03 are an OEM pickup HOLD (MOM 1.4.1): advisory evidence only.
      H(M, "SW-KLN-01", {
        severity: "Alert",
        evidence: `Tyre ${mig.n} migration ${mig.v.toFixed(1)} mm/rev, ${fmtSigned(mig.r)} mm/rev from the demo hot baseline (${mig.r < 0 || mig.v < 4 ? "tyre tight" : "tyre loose"}) at ${speed.toFixed(2)} rpm, tyre-zone shell ${tyreShell.toFixed(0)} °C${band}`,
        tags: [mig.tag, "SPD-KLN-01"],
        subs: [`kln-st${mig.n}`],
        lead: { tag: mig.tag, target: mig.r < 0 || mig.v < 4 ? (mig.v > 4 ? 4 : 2) : mig.v < 16 ? 16 : 22 },
      });
    }
  }

  /* ---------------- FP-19 spray circuit blocked (SW-KLN-02) ---------------- */
  const silent = PRX.filter((tag) => states[tag] === "NO CYCLE");
  const ctrl = states["STS-KLN-05"];
  if (silent.length || ctrl === "FAULT") {
    // Missed spray cycles from how long each circuit has been silent (history keeps 1 normal / 0 abnormal per minute).
    const missed = silent.map((tag) => {
      const h = hist(tag);
      let k = 0;
      for (let i = h.length - 1; i >= 0 && h[i] === 0; i--) k++;
      return { tag, missed: 1 + Math.floor(k / SPRAY_CYCLE), min: k };
    });
    const rt = good("VIB-KLN-04") ? ratio("VIB-KLN-04") : 1;
    const worst = missed.reduce((a, b) => Math.max(a, b.missed), 0);
    // PRX-KLN-01…06 are HOLD channels (no approved OEM metering proof): advisory evidence only.
    H(M, "SW-KLN-02", {
      severity: "Alert",
      evidence: `${ctrl === "FAULT" ? "Spray controller FAULT" : `${missed.map((x) => `Circuit ${x.tag.slice(-1)} silent ${x.min} min (${x.missed} missed cycle${x.missed > 1 ? "s" : ""})`).join(", ")} while the other circuits pulse (HOLD channels)`} · pinion vibration ×${rt.toFixed(2)} model${ctrl === "FAULT" || worst >= 2 ? " — would be critical (≥ 2 missed cycles) once metering proof is approved" : ""}`,
      tags: ["STS-KLN-05", ...silent, "VIB-KLN-04"],
      stateRule: true,
      lead: { tag: "VIB-KLN-04", target: measured["VIB-KLN-04"] < VIB_WARN ? VIB_WARN : VIB_ALARM },
    });
  }

  /* ---------------- FP-14 girth gear / pinion mesh (R-KLN-13) ---------------- */
  {
    const sprayOk = !silent.length && ctrl === "OK";
    if (sprayOk && good("VIB-KLN-04", "ELE-KLN-01")) {
      const r10 = ratio10("VIB-KLN-04");
      const steadyTorque = Math.abs(zm("ELE-KLN-01")) < 2.5 && resStd("ELE-KLN-01", 15) < 2 * sig("ELE-KLN-01");
      if (r10 >= 1.4 && steadyTorque) {
        const v = measured["VIB-KLN-04"];
        H(M, "R-KLN-13", {
          severity: v >= VIB_ALARM ? "Critical" : "Alert",
          evidence: `Pinion vibration ${v.toFixed(2)} mm/s, ×${r10.toFixed(2)} its load-corrected model (10-sample mean) at steady torque ${measured["ELE-KLN-01"].toFixed(0)} % (${fmtZ(zm("ELE-KLN-01"))}) · all six spray circuits pulsing, controller OK · rising ${fmtSigned(ratePerH("VIB-KLN-04", 60), 2)} mm/s per h`,
          tags: ["VIB-KLN-04", "ELE-KLN-01", "STS-KLN-05"],
          subs: ["kln-girth"],
          lead: { tag: "VIB-KLN-04", target: v < VIB_WARN ? VIB_WARN : VIB_ALARM },
        });
      }
    }
  }

  /* ---------------- FP-27 scanner cross-check (SW-KLN-03) ---------------- */
  // Scanner coverage is the scanner's own quality figure (not a Rev. 02 register point): its per-minute history.
  const covHist = s.thermal.coverageHist ?? [];
  {
    const cov5 = covHist.length ? covHist.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, covHist.length) : 100;
    const hand = s.manual["MAN-KLN-01"];
    const usable = hand && hand.comparable === true && t - hand.at <= HANDHELD_VALID ? (hand.points ?? []).filter((p) => p.gap !== null) : [];
    const worst = usable.reduce<(typeof usable)[number] | null>((w, p) => (!w || Math.abs(p.gap!) > Math.abs(w.gap!) ? p : w), null);
    const handBad = worst !== null && Math.abs(worst.gap!) > 25;
    if (cov5 < SHELL_COVERAGE_TARGET || handBad) {
      const parts: string[] = [];
      if (cov5 < SHELL_COVERAGE_TARGET)
        parts.push(`Scanner coverage ${cov5.toFixed(1)} % < ${SHELL_COVERAGE_TARGET} % target${cov5 < SHELL_COVERAGE_ALARM ? ` (< ${SHELL_COVERAGE_ALARM} % alarm)` : ""}, grey area ${fmtSigned((slope(covHist, 30) ?? 0) * 60, 1)} %/h — the map reads low where the window is fouled`);
      if (handBad)
        parts.push(
          `Handheld ${worst!.hand.toFixed(0)} °C vs scanner ${worst!.scan!.toFixed(0)} °C at ${worst!.m} m · ${worst!.angle}° (${fmtSigned(worst!.gap!, 0)} K, emissivity ${HANDHELD_EMISSIVITY.toFixed(2)} / ${SCANNER_EMISSIVITY.toFixed(2)} matched), round ${clockLabel(hand!.at)}, steady running kiln`,
        );
      H(M, "SW-KLN-03", {
        severity: cov5 < SHELL_COVERAGE_ALARM ? "Critical" : "Alert",
        evidence: `${parts.join(" · ")} — cleaning advisory`,
        tags: ["STS-KLN-08", "MAN-KLN-01"],
        stateRule: true,
      });
    }
  }

  /* ---------------- shell thermal map (D5 Table 9.5) ---------------- */
  const scanOk = !scannerSuspect && good("STS-KLN-08");
  const hotI = Math.round(th.hotPos * 2);
  const shellRate = ratePerH("STS-KLN-08", 20);
  const bz = good("TMP-KLN-14") ? meanRes("TMP-KLN-14", 10) : null;
  const bzTxt = bz === null ? "burning-zone pyrometer not valid" : `burning zone TMP-KLN-14 ${fmtSigned(bz, 0)} K vs model`;
  // FP-26 refractory hot spot (SW-KLN-04): local maximum ≥ model + 40 K, or rising > 15 K/h (provisional, D5 Table 9.5).
  if (scanOk) {
    const ring: number[] = [];
    for (let d = 6; d <= 10; d++) for (const i of [hotI - d, hotI + d]) if (i >= 0 && i < shellRes.length) ring.push(shellRes[i]);
    const grad = ring.length ? (shellRes[hotI] - ring.reduce((a, b) => a + b, 0) / ring.length) / 4 : 0;
    // Local = around the circumference: the hottest cell stands well above its own section mean (a band edge can have an
    // axial gradient, so the gradient is reported, not used to decide).
    const local = th.hotSpread >= 12;
    const r = th.hotResidual;
    const max = measured["STS-KLN-08"];
    if (local && (r >= SHELL_HOT_DELTA || (shellRate > SHELL_RATE_WARN && r > 10))) {
      const toDanger = shellRate > 0.5 && max < SHELL_DANGER ? (SHELL_DANGER - max) / shellRate : null;
      // Time to danger with a range from the rate's uncertainty (rate over 20 vs 60 samples, at least ± 25 %).
      const rate60 = ratePerH("STS-KLN-08", 60);
      const rLo = Math.max(0.5, Math.min(shellRate * 0.8, rate60));
      const rHi = Math.max(shellRate * 1.25, rate60);
      const ttd = toDanger === null ? "" : ` · danger ${SHELL_DANGER} °C in ${formatDuration(toDanger * 60)} (${formatDuration(((SHELL_DANGER - max) / rHi) * 60)}–${formatDuration(((SHELL_DANGER - max) / rLo) * 60)})`;
      const dA = th.areaAboveAlert1h === null ? "" : ` (${fmtSigned(th.areaAboveAlert - th.areaAboveAlert1h, 1)} m² in 1 h)`;
      const hand = s.manual["MAN-KLN-01"];
      const near = hand?.points?.find((p) => Math.abs(p.m - th.hotPos) <= 2);
      const handTxt = near && t - hand!.at <= HANDHELD_VALID ? ` · handheld ${near.m} m · ${near.angle}° ${near.hand.toFixed(0)} °C (${clockLabel(hand!.at)})` : "";
      H(M, "SW-KLN-04", {
        severity: max >= SHELL_DANGER || (max >= SHELL_ALERT && shellRate > SHELL_RATE_WARN) ? "Critical" : "Alert",
        evidence: `Shell max ${max.toFixed(0)} °C at ${th.hotPos.toFixed(1)} m · ${th.hotAngle}°, model ${th.hotModel.toFixed(0)} °C there: ${fmtSigned(r, 0)} K (D5 ≥ +${SHELL_HOT_DELTA} K or > ${SHELL_RATE_WARN} K/h) · local: ${th.hotSpread.toFixed(0)} K above its section mean, ${grad.toFixed(1)} K/m axial · rising ${fmtSigned(shellRate, 0)} K/h · ${th.areaAboveAlert.toFixed(1)} m² ≥ ${SHELL_ALERT} °C${dA}${ttd} · ${bzTxt}${bz !== null && bz > 25 ? " (hotter flame: coating loss likely)" : " (flame on model: lining loss likely)"}${handTxt}`,
        tags: ["STS-KLN-08", "MAN-KLN-01", "TMP-KLN-14"],
        subs: ["kln-shell"],
        lead: { tag: "STS-KLN-08", target: max < SHELL_DANGER ? SHELL_DANGER : SHELL_DANGER + 40 },
      });
    }
  }
  // Coating loss / flame impingement (D5 Table 5.4.7b): a broad warm band, whole circumference, in the burning zone.
  const brnAirSteady = BRN_AIR.every((tag) => !good(tag) || Math.abs(zm(tag)) < 4);
  if (scanOk && th.warmBand && th.warmBand.residual > 20 && brnAirSteady) {
    const wb = th.warmBand;
    // Band change over the last hour from the scan history (scans keep their model).
    const old = s.shellScans.find((sc) => sc.t >= t - 60 && sc.model?.length);
    let dHour: number | null = null;
    if (old && old.t <= t - 30) {
      let a = 0;
      let n = 0;
      for (let i = Math.round(wb.from * 2); i <= Math.round(wb.to * 2); i++) {
        a += old.profile[i] - old.model[i];
        n++;
      }
      dHour = n ? wb.residual - a / n : null;
    }
    let bandMax = -Infinity;
    for (let i = Math.round(wb.from * 2); i <= Math.round(wb.to * 2); i++) bandMax = Math.max(bandMax, shellProfile[i]);
    H(M, "R-KLN-19", {
      severity: bandMax >= SHELL_ALERT ? "Critical" : "Alert",
      evidence: `Warm band ${wb.from.toFixed(1)}–${wb.to.toFixed(1)} m ${fmtSigned(wb.residual, 0)} K above the model around the whole circumference (broad, not a local spot), band max ${bandMax.toFixed(0)} °C${dHour === null ? "" : `, ${fmtSigned(dHour, 0)} K in the last hour`} · ${bzTxt} · burner air pressures on model (not flame impingement)`,
      tags: ["STS-KLN-08", "TMP-KLN-14"],
      subs: ["kln-shell"],
      lead: { tag: "STS-KLN-08", target: SHELL_ALERT },
    });
  }
  // FP-18 ring vs mechanical drag: torque up with a cold band = ring; without, with winding and oil heating = drag.
  const cb = scanOk ? th.coldBand : null;
  if (cb && good("ELE-KLN-01") && zm("ELE-KLN-01") > 3) {
    const tq = measured["ELE-KLN-01"];
    H(M, "R-KLN-14", {
      severity: ratio("ELE-KLN-01") >= 1.2 || tq >= 90 ? "Critical" : "Alert",
      evidence: `Cold band ${cb.from.toFixed(1)}–${cb.to.toFixed(1)} m ${fmtSigned(cb.residual, 0)} K below the model across the whole circumference (transition zone) · torque ${tq.toFixed(0)} % (${fmtZ(zm("ELE-KLN-01"))}, ×${ratio("ELE-KLN-01").toFixed(2)} model) · windings ${fmtSigned(wdgNow())} K (mean of ${wdgOk.length}), oil ${fmtSigned(res("TMP-KLN-15"))} K following the load`,
      tags: ["STS-KLN-08", "ELE-KLN-01"],
      subs: ["kln-shell", "kln-motor"],
      lead: { tag: "ELE-KLN-01", target: tq < 90 ? 90 : 105 },
    });
  }
  if (!cb && wdgOk.length >= 3 && good("ELE-KLN-01", "TMP-KLN-15") && zm("ELE-KLN-01", 5) > 4 && wdgNow() > 4 && res("TMP-KLN-15") > 1.5) {
    const tq = measured["ELE-KLN-01"];
    H(M, "R-KLN-10", {
      severity: ratio("ELE-KLN-01") >= 1.2 || tq >= 90 || wdgMax >= 130 ? "Critical" : "Alert",
      evidence: `Torque ${tq.toFixed(0)} % (${fmtZ(zm("ELE-KLN-01", 5))}, ×${ratio("ELE-KLN-01").toFixed(2)} model) with the motor windings +${wdgNow().toFixed(1)} K (mean of ${wdgOk.length}, hottest ${wdgHot} ${wdgMax.toFixed(0)} °C) and oil +${res("TMP-KLN-15").toFixed(1)} K following · cooling fan ${states["STS-KLN-14"]} · ${scanOk ? `no cold band on the shell map (30–36 m ${fmtSigned(c.shellResMean(30, 36), 0)} K)` : "shell map not valid: a ring cannot be ruled out"}`,
      tags: ["ELE-KLN-01", ...wdgOk, "TMP-KLN-15"],
      subs: ["kln-motor", "kln-gearbox"],
      lead: { tag: "ELE-KLN-01", target: tq < 90 ? 90 : 105 },
    });
  }

  /* ---------------- FP-15 / 16 / 17 gearbox lubrication (SW-KLN-05) ---------------- */
  {
    const noFlow = states["FLO-KLN-05"] === "NO FLOW";
    const low = states["LEV-KLN-01"] === "LOW LEVEL";
    const pOk = good("PRS-KLN-04");
    const p = measured["PRS-KLN-04"];
    const pz = pOk ? z("PRS-KLN-04") : 0;
    // A switch counts when the supply pressure confirms it (D5 Table 5.4.6: oil pressure agrees with the flow switch).
    const pressLow = pOk && (meanRes("PRS-KLN-04", 3) / sig("PRS-KLN-04") < -4 || p <= 1.5);
    const noFlowConfirmed = noFlow && (pressLow || !pOk);
    const supply = pz < -5 || noFlowConfirmed || low;
    const oilHot = good("TMP-KLN-15", "ELE-KLN-01") && meanRes("TMP-KLN-15", 10) > 10 && Math.abs(zm("ELE-KLN-01")) < 2.5;
    const dpR = good("PRS-KLN-05") ? meanRes("PRS-KLN-05", 10) : 0;
    const dpRate = good("PRS-KLN-05") ? ratePerH("PRS-KLN-05") : 0;
    const filter = dpR > 0.35 || (dpRate > 0.15 && dpR > 0.1);
    // Dated laboratory result: it only counts while the record is recent enough.
    const lab = s.manual["LAB-KLN-01"];
    const labFresh = lab !== undefined && t - lab.at <= LAB_MAX_AGE;
    const fe = labFresh ? lab.value : null;
    const labFlags: string[] = [];
    if (labFresh && lab) {
      if (lab.value >= 60) labFlags.push(`Fe ${lab.value.toFixed(0)} ppm ≥ 60`);
      if (lab.prev && lab.value - lab.prev.value >= 15) labFlags.push(`Fe up ${(lab.value - lab.prev.value).toFixed(0)} ppm since ${clockLabel(lab.prev.at)}`);
      if (lab.visc !== undefined && (lab.visc < 288 || lab.visc > 352)) labFlags.push(`viscosity ${lab.visc.toFixed(0)} cSt outside 320 ± 10 %`);
      if (lab.water !== undefined && lab.water >= 500) labFlags.push(`water ${lab.water.toFixed(0)} ppm ≥ 500`);
    }
    if (supply || oilHot || filter || labFlags.length) {
      const parts: string[] = [];
      if (supply)
        parts.push(
          `Oil supply ${p.toFixed(2)} bar, ${fmtZ(pz)} below what oil at ${measured["TMP-KLN-15"].toFixed(0)} °C explains${noFlow ? (noFlowConfirmed ? " · flow switch NO FLOW" : " · flow switch NO FLOW not confirmed by pressure") : ""}${low ? " · tank LOW LEVEL" : ""}`,
        );
      if (oilHot) parts.push(`Oil ${measured["TMP-KLN-15"].toFixed(0)} °C, ${fmtSigned(meanRes("TMP-KLN-15", 10))} K above model at normal torque (cooler)`);
      if (filter) parts.push(`Filter ΔP ${measured["PRS-KLN-05"].toFixed(2)} bar (${fmtSigned(dpR, 2)} bar above what oil temperature explains, ${fmtSigned(dpRate, 2)} bar/h)`);
      parts.push(labFresh && lab ? `lab ${clockLabel(lab.at)} (${formatDuration(t - lab.at)} ago): ${labFlags.length ? labFlags.join(", ") : `Fe ${lab.value.toFixed(0)} ppm, in limits`}` : "no laboratory result within 24 h");
      const urgent = noFlowConfirmed || (low && pressLow);
      const crit = urgent || p <= 1.2 || measured["PRS-KLN-05"] >= 1.4 || measured["TMP-KLN-15"] >= 85 || (fe !== null && fe >= 120);
      H(M, "SW-KLN-05", {
        severity: crit ? "Critical" : "Alert",
        evidence: parts.join(" · "),
        tags: ["PRS-KLN-05", "PRS-KLN-04", "TMP-KLN-15", "FLO-KLN-05", "LEV-KLN-01", "LAB-KLN-01"],
        stateRule: noFlowConfirmed || low,
        lead: supply ? { tag: "PRS-KLN-04", target: p > 1.2 ? 1.2 : 0.8 } : oilHot ? { tag: "TMP-KLN-15", target: measured["TMP-KLN-15"] < 75 ? 75 : 85 } : filter ? { tag: "PRS-KLN-05", target: measured["PRS-KLN-05"] < 1.4 ? 1.4 : 2.0 } : undefined,
      });
    }
  }

  /* ---------------- FP-28 inlet false air (SW-KLN-06) ---------------- */
  // Normalised by operating mode: steady feed and coal, and the O₂ model already carries the measured feed and coal.
  // A steady flame too: coal surging after the weigh feeder (choking line, FP-32) swings the burning zone, O₂ and the
  // inlet gas together — the alternative cause D5 names, not air drawn in at the seal.
  const flameSteady = !good("TMP-KLN-14") || resStd("TMP-KLN-14", 15) < 2.5 * sig("TMP-KLN-14");
  if (states["STS-KLN-06"] === "OK" && good("GAS-KLN-01", "TMP-KLN-13") && meanRes("GAS-KLN-01", 5) / sig("GAS-KLN-01") > 3.5 && meanRes("TMP-KLN-13", 5) < -8 && steadyFeed && steadyCoal && flameSteady) {
    // Inlet false-air index: inlet O₂ above its feed- and coal-normalised model (computed here; no register value).
    const fa = res("GAS-KLN-01");
    const ctx = [
      good("GAS-KLN-02") ? `CO ${measured["GAS-KLN-02"].toFixed(0)} ppm` : "CO not valid",
      good("GAS-KLN-03") ? `NOₓ ${measured["GAS-KLN-03"].toFixed(0)} ppm (${fmtSigned(res("GAS-KLN-03"), 0)} vs model)` : "NOₓ not valid",
      good("PRS-KLN-01") ? `inlet draft ${fmtSigned(res("PRS-KLN-01"), 2)} mbar vs model` : "inlet draft not valid",
    ].join(", ");
    H(M, "SW-KLN-06", {
      severity: fa >= 1.0 ? "Critical" : "Alert",
      evidence: `O₂ +${res("GAS-KLN-01").toFixed(2)} vol% above the feed- and coal-normalised model (feed ${(measured["FLO-KFS-01"] + measured["FLO-KFS-02"]).toFixed(0)} t/h, coal ${measured["FLO-BRN-01"].toFixed(2)} t/h, both steady) with inlet ${Math.abs(res("TMP-KLN-13")).toFixed(0)} K below · false-air index ${fa.toFixed(2)} · analyser OK · context: ${ctx}`,
      tags: ["GAS-KLN-01", "TMP-KLN-13", "PRS-KLN-01", "GAS-KLN-02", "GAS-KLN-03"],
      lead: { tag: "GAS-KLN-01", target: model["GAS-KLN-01"] + (fa < 0.5 ? 0.5 : 1.0) },
    });
  }

  /* ---------------- supports: FP-21 / FP-22 / FP-23 ---------------- */
  // Thrust pressure rising above the model: the kiln is being pushed (skew), not a lubrication loss.
  const thrustRise = good("PRS-KLN-07") ? meanRes("PRS-KLN-07", 30) : 0;
  const thrustRising = thrustRise >= 3;
  {
    let best: { tag: string; r: number; st: (typeof STATIONS)[number] } | null = null;
    for (const st of STATIONS) {
      for (const [a, b] of st.pairs) {
        for (const [x, y] of [[a, b], [b, a]]) {
          if (!good(x, y)) continue;
          const r = meanRes(x, 5);
          // D5 FP-21: single bearing heating fast (> 5 K/h over the hour) while its pair follows, away from a rising thrust
          // (skew, FP-22). OSW-PE-SNL-PYR-01 Rev. 02 HP-05 removes the oil-level switches: the temperatures are the evidence.
          // A bearing already well above its pair (> 10 K) stays the finding once it stops climbing.
          const fast = !thrustRising && (ratePerH(x, 60) > 5 || r > 10);
          if (r > 6 && meanRes(y, 5) < 2.5 && fast && (!best || r > best.r)) best = { tag: x, r, st };
        }
      }
    }
    if (best) {
      const rate = ratePerH(best.tag);
      H(M, "R-KLN-07", {
        severity: rate > 10 || best.r > 14 || measured[best.tag] >= ROLLER_LIMIT ? "Critical" : "Alert",
        evidence: `${best.tag} +${best.r.toFixed(1)} K above model, heating ${fmtSigned(rate, 1)} K/h, its pair follows · thrust ${fmtSigned(thrustRise, 1)} bar vs model (not skew)`,
        tags: [best.tag],
        subs: [best.st.sub],
        lead: { tag: best.tag, target: measured[best.tag] < 70 ? 70 : ROLLER_LIMIT },
      });
    }
  }
  let skew = false;
  {
    let best: { a: string; b: string; split: number; st: (typeof STATIONS)[number] } | null = null;
    for (const st of STATIONS) {
      for (const [a, b] of st.pairs) {
        if (!good(a, b)) continue;
        const split = meanRes(a, 10) - meanRes(b, 10);
        if (Math.abs(split) > 10 && (!best || Math.abs(split) > Math.abs(best.split))) best = { a, b, split, st };
      }
    }
    if (best && thrustRising) {
      skew = true;
      const hot = best.split > 0 ? best.a : best.b;
      H(M, "R-KLN-15", {
        severity: Math.abs(best.split) > 20 || measured[hot] >= ROLLER_LIMIT ? "Critical" : "Alert",
        evidence: `Station ${best.st.n} roller bearings ${best.a} / ${best.b} split ${Math.abs(best.split).toFixed(1)} K (> 10 K, ${hot} hotter) · thrust pressure ${measured["PRS-KLN-07"].toFixed(0)} bar, ${fmtSigned(thrustRise, 1)} bar above model over 30 min · axial ${measured["POS-KLN-01"].toFixed(1)} mm`,
        tags: [best.a, best.b, "PRS-KLN-07", "POS-KLN-01"],
        subs: [best.st.sub, "kln-thrust"],
        lead: { tag: hot, target: measured[hot] < 70 ? 70 : ROLLER_LIMIT },
      });
    }
  }
  {
    const means = STATIONS.map((st) => {
      const tags = st.pairs.flatMap(([a, b]) => [a, b]);
      const ok = tags.every((tg) => good(tg));
      const r = tags.map((tg) => meanRes(tg, 10));
      return { st, tags, ok, r, mean: r.reduce((x, y) => x + y, 0) / r.length };
    });
    for (const m of means) {
      if (!m.ok || !m.r.every((x) => x > 4) || m.mean <= 5) continue;
      const others = means.filter((o) => o !== m && o.ok);
      if (!others.length || !others.every((o) => o.mean < 2)) continue;
      const hottest = m.tags.reduce((a, b) => (measured[b] > measured[a] ? b : a));
      H(M, "R-KLN-16", {
        severity: m.mean > 15 || measured[hottest] >= ROLLER_LIMIT ? "Critical" : "Alert",
        evidence: `All four station ${m.st.n} bearings warming: ${m.tags.map((tg, k) => `${tg.slice(-2)} ${fmtSigned(m.r[k])}`).join(", ")} K (mean ${fmtSigned(m.mean)} K) while stations ${others.map((o) => `${o.st.n} ${fmtSigned(o.mean)} K`).join(", ")} follow the model (ambient ${c.drivers.ambient.toFixed(1)} °C, speed in the model)`,
        tags: m.tags,
        subs: [m.st.sub],
        lead: { tag: hottest, target: measured[hottest] < 70 ? 70 : ROLLER_LIMIT },
      });
      break;
    }
  }

  /* ---------------- FP-12 drive bearing / FP-13 misalignment ---------------- */
  {
    const groups: Array<[string, string, string, string]> = [
      ["VIB-KLN-01", "TMP-KLN-19", "kln-motor", "Motor DE"],
      ["VIB-KLN-05", "TMP-KLN-20", "kln-motor", "Motor NDE"],
      ["VIB-KLN-02", "TMP-KLN-22", "kln-gearbox", "Gearbox input"],
      ["VIB-KLN-03", "TMP-KLN-23", "kln-gearbox", "Gearbox output"],
    ];
    // Both coupling sides up together (FP-13 misalignment): a coupling-side bearing must heat clearly (above the
    // 3 K the misalignment pattern still calls cool) before it reads as a bearing defect (FP-12).
    const coupled = good("VIB-KLN-01", "VIB-KLN-02") && ratio10("VIB-KLN-01") >= 1.35 && ratio10("VIB-KLN-02") >= 1.35 && Math.abs(ratio10("VIB-KLN-01") - ratio10("VIB-KLN-02")) < 0.5;
    let best: { vib: string; tmp: string; sub: string; label: string; rt: number; dt: number } | null = null;
    for (const [vib, tmp, sub, label] of groups) {
      if (!good(vib, tmp)) continue;
      const rt = ratio(vib);
      const dt = meanRes(tmp, 10);
      const heat = coupled && (vib === "VIB-KLN-01" || vib === "VIB-KLN-02") ? 3 : 1.5;
      if (rt > 1.4 && dt > heat && (!best || rt > best.rt)) best = { vib, tmp, sub, label, rt, dt };
    }
    if (best) {
      const v = measured[best.vib];
      H(M, "R-KLN-08", {
        severity: v >= VIB_ALARM || measured[best.tmp] >= BEARING_LIMIT ? "Critical" : "Alert",
        evidence: `${best.label} vibration ${v.toFixed(2)} mm/s, ×${best.rt.toFixed(2)} its load-corrected model, with ${best.tmp} +${best.dt.toFixed(1)} K (two independent signals)${v >= VIB_WARN ? ` · ≥ ${VIB_WARN} mm/s` : ""}`,
        tags: [best.vib, best.tmp],
        subs: [best.sub],
        lead: { tag: best.vib, target: v < VIB_WARN ? VIB_WARN : VIB_ALARM },
      });
    }
    if (good("VIB-KLN-01", "VIB-KLN-02")) {
      const r1 = ratio10("VIB-KLN-01");
      const r2 = ratio10("VIB-KLN-02");
      const cool = (tag: string) => !good(tag) || meanRes(tag, 10) < 3;
      if (r1 >= 1.35 && r2 >= 1.35 && Math.abs(r1 - r2) < 0.5 && cool("TMP-KLN-19") && cool("TMP-KLN-22") && (!good("ELE-KLN-01") || zm("ELE-KLN-01") < 2)) {
        const v = Math.max(measured["VIB-KLN-01"], measured["VIB-KLN-02"]);
        const lead = measured["VIB-KLN-01"] >= measured["VIB-KLN-02"] ? "VIB-KLN-01" : "VIB-KLN-02";
        H(M, "R-KLN-12", {
          severity: v >= VIB_ALARM ? "Critical" : "Alert",
          evidence: `Both coupling sides up together: motor DE ×${r1.toFixed(2)} (${measured["VIB-KLN-01"].toFixed(2)} mm/s) and gearbox input ×${r2.toFixed(2)} (${measured["VIB-KLN-02"].toFixed(2)} mm/s) their models · bearings not heating (DE ${fmtSigned(meanRes("TMP-KLN-19", 10))} K, input ${fmtSigned(meanRes("TMP-KLN-22", 10))} K) · torque on model`,
          tags: ["VIB-KLN-01", "VIB-KLN-02", "TMP-KLN-19", "TMP-KLN-22"],
          subs: ["kln-motor", "kln-gearbox"],
          lead: { tag: lead, target: v < VIB_WARN ? VIB_WARN : VIB_ALARM },
        });
      }
    }
  }

  /* ---------------- FP-25 thrust hydraulics / not floating (R-KLN-09) ---------------- */
  // Floating check: 30-min means of the axial position and the thrust pressure over the last 4 h (one float cycle).
  const blockRange = (tag: string) => {
    const h = hist(tag);
    if (h.length < 240) return null;
    const means: number[] = [];
    for (let b = 0; b < 8; b++) {
      let a = 0;
      for (let i = h.length - 240 + b * 30; i < h.length - 240 + (b + 1) * 30; i++) a += h[i];
      means.push(a / 30);
    }
    return Math.max(...means) - Math.min(...means);
  };
  const posRange = good("POS-KLN-01") ? blockRange("POS-KLN-01") : null;
  const presRange = good("PRS-KLN-07") ? blockRange("PRS-KLN-07") : null;
  {
    const pos = measured["POS-KLN-01"];
    const pr = measured["PRS-KLN-07"];
    const pm = Math.max(1, model["PRS-KLN-07"]);
    const limit = states["POS-KLN-02"] === "LIMIT";
    const drift = good("PRS-KLN-07") ? meanRes("PRS-KLN-07", 10) / pm : 0;
    const parts: string[] = [];
    let crit = false;
    let lead: { tag: string; target: number } | undefined;
    const hpu = eq["kln-thrust-hpu"];
    const hpuDown = hpu === "tripped" || hpu === "stopped";
    if (hpuDown) {
      parts.push(`Thrust HPU ${hpu}: the kiln is no longer held axially (thrust pressure ${pr.toFixed(0)} bar)`);
      crit = true;
    }
    // D5 Table 9.2: ± 20 % from the model is the warning, a collapse (or the OEM maximum) the alarm.
    if (good("PRS-KLN-07") && (pr <= 0.5 * pm || pr <= 30)) {
      parts.push(`Thrust pressure ${pr.toFixed(0)} bar (${fmtSigned(drift * 100, 0)} % vs model) — collapse`);
      crit = true;
      lead = { tag: "PRS-KLN-07", target: 20 };
    } else if (Math.abs(drift) >= 0.2 && !(drift > 0 && skew)) {
      parts.push(`Thrust pressure ${pr.toFixed(0)} bar, ${fmtSigned(drift * 100, 0)} % ${drift > 0 ? "above" : "below"} the model (beyond ± 20 %)`);
      lead = { tag: "PRS-KLN-07", target: drift > 0 ? 150 : 30 };
    }
    if (good("POS-KLN-01") && (Math.abs(pos) >= 30 || limit)) {
      parts.push(`Axial position ${pos.toFixed(1)} mm${limit ? " · travel limit switch LIMIT" : " beyond ± 30 mm"}`);
      crit ||= Math.abs(pos) >= 40 || limit;
      lead ??= { tag: "POS-KLN-01", target: pos < 0 ? -40 : 40 };
    } else if (limit) {
      parts.push("Travel limit switch LIMIT");
      crit = true;
    }
    if (kilnTurning && posRange !== null && presRange !== null && posRange < 1 && presRange < 2) parts.push(`Kiln not floating: axial position moved ${posRange.toFixed(1)} mm and thrust pressure ${presRange.toFixed(1)} bar over 4 h (30-min means)`);
    if (parts.length) {
      H(M, "R-KLN-09", {
        severity: crit ? "Critical" : "Alert",
        evidence: `${parts.join(" · ")} · axial ${pos.toFixed(1)} mm`,
        tags: ["PRS-KLN-07", "POS-KLN-01", "POS-KLN-02"],
        stateRule: limit || hpuDown,
        lead,
      });
    }
  }

  /* ---------------- FP-20 auxiliary drive / brake (R-KLN-11) ---------------- */
  // The auxiliary drive is available when READY, or already RUNNING (turning the kiln after a main-drive trip).
  const auxAvailable = (states["STS-KLN-11"] === "READY" || states["STS-KLN-11"] === "RUNNING") && eq["kln-aux-drive"] !== "tripped";
  if (!auxAvailable || states["LIM-KLN-01"] !== "OK") {
    const mainDown = eq["kln-main-drive"] === "tripped" || eq["kln-main-drive"] === "stopped" || !kilnTurning;
    const auxDown = !auxAvailable;
    H(M, "R-KLN-11", {
      severity: mainDown && auxDown ? "Critical" : "Alert",
      evidence: `Auxiliary drive ${states["STS-KLN-11"]} · brake pads ${states["LIM-KLN-01"]}${mainDown ? ` · main drive ${eq["kln-main-drive"] ?? "stopped"}, kiln ${speed.toFixed(2)} rpm${auxDown ? " — the hot kiln cannot be turned" : ""}` : " · main drive running"}`,
      tags: ["STS-KLN-11", "LIM-KLN-01", "SPD-KLN-01"],
      stateRule: true,
    });
  }

  /* ---------------- FP-29 outlet cooling loss (R-KLN-17) ---------------- */
  {
    const r25 = good("TMP-KLN-25") ? meanRes("TMP-KLN-25", 10) : 0;
    const r26 = good("TMP-KLN-26") ? meanRes("TMP-KLN-26", 10) : 0;
    const fan = eq["kln-outlet-fan"];
    const fanDown = fan === "tripped" || fan === "stopped";
    // A tripped outlet fan is a cooling loss even though the reference model (which knows the fan state) explains the heat-up.
    if (r25 > 15 || r26 > 25 || fanDown) {
      const flame = bz !== null && bz > 25;
      H(M, "R-KLN-17", {
        severity: r26 > 50 || measured["TMP-KLN-26"] >= 400 || measured["TMP-KLN-25"] >= 180 || fanDown ? "Critical" : "Alert",
        evidence: `Sector-plate cooling air ${measured["TMP-KLN-25"].toFixed(0)} °C (${fmtSigned(r25)} K vs baseline, ${fmtSigned(ratePerH("TMP-KLN-25"), 1)} K/h) · cow shell ${measured["TMP-KLN-26"].toFixed(0)} °C (${fmtSigned(r26, 0)} K vs model) · outlet end 66–74 m ${scanOk ? `${fmtSigned(th.outletResidual, 0)} K on the shell map` : "shell map not valid"}${fan ? ` · outlet cooling fan ${fan}` : ""}${flame ? ` · burning zone also ${fmtSigned(bz!, 0)} K: check the flame length` : ""}`,
        tags: ["TMP-KLN-25", "TMP-KLN-26", "STS-KLN-08"],
        subs: ["kln-outlet"],
        lead: r26 > 25 ? { tag: "TMP-KLN-26", target: measured["TMP-KLN-26"] < 350 ? 350 : 400 } : { tag: "TMP-KLN-25", target: measured["TMP-KLN-25"] < 150 ? 150 : 180 },
      });
    }
  }

  /* ---------------- FP-30 hood pressure toward positive (R-KLN-18) ---------------- */
  if (good("PRS-KLN-03") && measured["PRS-KLN-03"] >= 0) {
    const ph = measured["PRS-KLN-03"];
    const fanTxt = eq["phc-idfan"] ? `ID fan ${eq["phc-idfan"]}` : `ID fan ${measured["SPD-PHC-01"].toFixed(0)} rpm (${fmtSigned(res("SPD-PHC-01"), 0)} vs reference)`;
    H(M, "R-KLN-18", {
      severity: ph >= 0.098 ? "Critical" : "Alert",
      evidence: `Hood pressure ${fmtSigned(ph, 3)} mbar (OSW-PE-SNL-PYR-01: ≥ 0 warning, ≥ +0.098 mbar / +1 mmWG alarm) · hood ${measured["TMP-KLN-27"].toFixed(0)} °C (${fmtSigned(res("TMP-KLN-27"), 0)} K vs model) · inlet draft ${measured["PRS-KLN-01"].toFixed(2)} mbar (${fmtSigned(res("PRS-KLN-01"), 2)} vs model) · ${fanTxt} — hot gas / dust blow-out risk at the kiln front`,
      tags: ["PRS-KLN-03", "TMP-KLN-27", "PRS-KLN-01"],
      subs: ["kln-outlet"],
      stateRule: true,
      lead: { tag: "PRS-KLN-03", target: ph < 0.098 ? 0.098 : 0.49 },
    });
  }

  /* ---------------- D5 Table 5.4.6 instrument working checks (R-KLN-20) ---------------- */
  {
    const bad: Array<{ tag: string; note: string }> = [];
    // Drive vibration ≈ 0 when stopped.
    if (!kilnTurning) for (const tag of ["VIB-KLN-01", "VIB-KLN-05", "VIB-KLN-02", "VIB-KLN-03", "VIB-KLN-04"]) if (measured[tag] > 0.5) bad.push({ tag, note: `${measured[tag].toFixed(2)} mm/s while the kiln is stopped` });
    // Comparisons only in a comparable running state (D5 Table 9.4.2 operating mode): not while the operating point moves.
    if (kilnTurning && c.running[M] && !c.transient) {
      // Speed feedback matches the VFD reference: the drive vibration (∝ speed) is the witness.
      const ref = model["SPD-KLN-01"];
      const nM = meanOf("SPD-KLN-01", 3);
      const vibs = ["VIB-KLN-01", "VIB-KLN-05", "VIB-KLN-02", "VIB-KLN-03"].filter((tg) => good(tg));
      if (good("SPD-KLN-01") && ref > 0.5 && vibs.length >= 2) {
        const nVib = nM * median(vibs.map((tg) => ratio10(tg)));
        if (Math.abs(nM - ref) / ref > 0.05 && Math.abs(nVib - ref) / ref < 0.03)
          bad.push({ tag: "SPD-KLN-01", note: `speed ${nM.toFixed(2)} rpm vs VFD reference ${ref.toFixed(2)} rpm while drive vibration implies ${nVib.toFixed(2)} rpm` });
      }
      // Torque agrees with winding and oil temperature.
      if (wdgOk.length >= 3 && good("ELE-KLN-01", "TMP-KLN-15") && hist("ELE-KLN-01").length >= 60 && zm("ELE-KLN-01", 30) > 4 && wdgRes(30) < 1 && meanRes("TMP-KLN-15", 30) < 0.5)
        bad.push({ tag: "ELE-KLN-01", note: `torque ${fmtZ(zm("ELE-KLN-01", 30))} over 30 min with the windings ${fmtSigned(wdgRes(30))} K and oil ${fmtSigned(meanRes("TMP-KLN-15", 30))} K flat` });
      // Bearing pairs agree (DE / NDE, input / output) while the vibration is on its model.
      for (const [a, b, vib] of [["TMP-KLN-19", "TMP-KLN-20", "VIB-KLN-01"], ["TMP-KLN-22", "TMP-KLN-23", "VIB-KLN-02"]]) {
        if (!good(a, b, vib)) continue;
        const split = meanRes(a, 30) - meanRes(b, 30);
        if (Math.abs(split) > 10 && ratio10(vib) < 1.15) bad.push({ tag: split > 0 ? a : b, note: `${a} / ${b} split ${Math.abs(split).toFixed(1)} K with ${vib} on model` });
      }
      // Pyrometer window clean: burning zone far below what the hood and burner explain.
      if (good("TMP-KLN-14", "TMP-KLN-27") && meanRes("TMP-KLN-14", 10) < -40 && Math.abs(meanRes("TMP-KLN-27", 10)) < 15 && steadyCoal && brnAirSteady)
        bad.push({ tag: "TMP-KLN-14", note: `${fmtSigned(meanRes("TMP-KLN-14", 10), 0)} K vs model with hood ${fmtSigned(meanRes("TMP-KLN-27", 10), 0)} K and burner on model (window dirty?)` });
      // Inlet gas temperature above the C6 riser duct gas (the calciner cools it).
      if (good("TMP-KLN-13", "TMP-PHC-06") && measured["TMP-KLN-13"] <= measured["TMP-PHC-06"])
        bad.push({ tag: "TMP-KLN-13", note: `${measured["TMP-KLN-13"].toFixed(0)} °C not above the C6 riser duct ${measured["TMP-PHC-06"].toFixed(0)} °C` });
      // The six windings agree (two per phase): one far from the others while they follow the torque.
      if (wdgOk.length >= 4) {
        const rs = wdgOk.map((tg) => [tg, meanRes(tg, 10)] as const);
        const med = median(rs.map(([, r]) => r));
        const odd = rs.filter(([, r]) => Math.abs(r - med) > 12);
        if (odd.length === 1) bad.push({ tag: odd[0][0], note: `${fmtSigned(odd[0][1])} K vs model while the other windings sit at ${fmtSigned(med)} K` });
      }
      // The LVDT moves while the thrust pressure cycles with the floating.
      if (posRange !== null && presRange !== null && posRange < 1 && presRange >= 4) bad.push({ tag: "POS-KLN-01", note: `static (${posRange.toFixed(1)} mm over 4 h) while thrust pressure cycles ${presRange.toFixed(0)} bar` });
    }
    // Oil flow switch agrees with the supply pressure.
    if (good("PRS-KLN-04")) {
      const p = measured["PRS-KLN-04"];
      if (states["FLO-KLN-05"] === "NO FLOW" && p > 1.5 && meanRes("PRS-KLN-04", 3) / sig("PRS-KLN-04") >= -4) bad.push({ tag: "FLO-KLN-05", note: `NO FLOW while supply pressure ${p.toFixed(2)} bar is on model` });
      else if (states["FLO-KLN-05"] === "FLOW OK" && p < 0.5 && kilnTurning) bad.push({ tag: "PRS-KLN-04", note: `${p.toFixed(2)} bar while the flow switch reads FLOW OK` });
    }
    if (bad.length) {
      H(M, "R-KLN-20", {
        severity: "Alert",
        evidence: `Working check failed (D5 Table 5.4.6): ${bad.map((b) => `${b.tag} ${b.note}`).join(" · ")} — verify the instrument before acting on it`,
        tags: [...new Set(bad.map((b) => b.tag))],
      });
    }
  }
}
