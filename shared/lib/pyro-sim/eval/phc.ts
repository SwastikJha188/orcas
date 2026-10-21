/**
 * Preheater tower PYR-PHC-01 rule evaluation.
 *
 * Reads the minute's shared context (`./context`) and records findings with
 * `H`; rule definitions live in `../rules/phc.ts`. Pattern thresholds are
 * relative to the reference model (D5 Table 9.2 "% / K from model").
 */
import { PYRO_SIGNAL_BY_TAG } from "../signals";
import { fmtSigned, median } from "../shared";
import { bearingHit, unitRun, type EvalContext } from "./context";

type Sev = "Alert" | "Critical";

/** C4–C6 cone taps with the gas outlet of the same stage (D5 FP-07 signals PRS-PHC-07…09, TMP-PHC-04…06). */
const CONES: Array<[string, string, string]> = [
  ["PRS-PHC-07", "C4", "TMP-PHC-04"],
  ["PRS-PHC-08", "C5", "TMP-PHC-05"],
  ["PRS-PHC-09", "C6", "TMP-PHC-06"],
];
/** Draft taps from the fan side down the tower to the kiln inlet: stage ΔP sections (D5 FP-08) and the staircase (Table 5.3.6). */
const STAIR = ["PRS-PHC-01", "PRS-PHC-02", "PRS-PHC-03", "PRS-PHC-04", "PRS-PHC-05", "PRS-PHC-06", "PRS-KLN-01"];
const SECTIONS: Array<{ a: string; b: string; label: string; temps: string[]; tempMin: number }> = [
  ...[1, 2, 3, 4, 5].map((n) => ({ a: `PRS-PHC-0${n}`, b: `PRS-PHC-0${n + 1}`, label: `C${n}/C${n + 1}`, temps: [`TMP-PHC-0${n}`, `TMP-PHC-0${n + 1}`], tempMin: 10 })),
  { a: "PRS-PHC-06", b: "PRS-KLN-01", label: "C6 riser", temps: ["TMP-PHC-08"], tempMin: 15 },
];
/** Gas temperatures up the tower must fall stage by stage (riser hottest). */
const TEMP_ORDER = ["TMP-PHC-01", "TMP-PHC-02", "TMP-PHC-03", "TMP-PHC-04", "TMP-PHC-05", "TMP-PHC-06", "TMP-PHC-08"];
const DRAFT_TAPS = ["PRS-PHC-01", "PRS-PHC-02", "PRS-PHC-03", "PRS-PHC-04", "PRS-PHC-05", "PRS-PHC-06", "PRS-PHC-07", "PRS-PHC-08", "PRS-PHC-09"];
const phiOf = (tag: string) => (tag.startsWith("VIB") ? 0.6 : 0.75);

export function evalPhc(c: EvalContext): void {
  const { s, measured, model, states, res, z, sig, meanRes, ratio, good, hits, H } = c;
  const lineStop = (c as { lineStop?: boolean }).lineStop === true;
  const fanOn = unitRun(c, "phc-idfan") === "run" && c.running["PYR-PHC-01"] && !lineStop;
  // Draft present: the reference draft at the exit above 30 % of design (the staircase and ΔP need suction).
  const drafted = fanOn && Math.abs(model["PRS-PHC-01"]) > 0.3 * Math.abs(PYRO_SIGNAL_BY_TAG["PRS-PHC-01"].base);

  // ================================================================ SW-PHC-01 (FP-07 / FP-08)
  {
    const cands: Array<{ sev: Sev; score: number; evidence: string; tags: string[]; subs: string[]; lead: { tag: string; target: number } }> = [];
    const offer = (b: (typeof cands)[number]) => cands.push(b);
    const mealRes = good("TMP-PHC-07") ? meanRes("TMP-PHC-07", 5) : 0;

    // FP-07 cyclone cone blockage: cone pressure rising toward zero, plus pulsation fading / stage gas hot / hot meal cold.
    if (drafted) {
      for (const [cone, stage, tmp] of CONES) {
        if (!good(cone)) continue;
        const r = meanRes(cone, 5);
        const f = r / Math.max(0.5, Math.abs(model[cone]));
        if (f < 0.2 || r < 4 * sig(cone)) continue;
        const why: string[] = [];
        const hot = good(tmp) ? meanRes(tmp, 10) : 0;
        if (hot >= 8) why.push(`${stage} gas ${fmtSigned(hot, 0)} K`);
        const h = s.hist[cone];
        const mh = s.modelHist[cone];
        if (h.length >= 16) {
          const d: number[] = [];
          for (let i = h.length - 15; i < h.length; i++) d.push(Math.abs(h[i] - mh[i] - (h[i - 1] - mh[i - 1])));
          const normal = 0.6745 * sig(cone) * Math.sqrt(2 * (1 - phiOf(cone)));
          const pr = median(d) / normal;
          if (pr < 0.45) why.push(`pulsation fading (${(pr * 100).toFixed(0)} % of normal)`);
        }
        if (mealRes <= -8) why.push(`hot meal ${fmtSigned(mealRes, 0)} K`);
        if (!why.length) continue;
        offer({
          sev: f >= 0.35 || (why.length >= 2 && f >= 0.25) ? "Critical" : "Alert",
          score: f,
          evidence: `FP-07 ${stage} cone blockage: cone ${measured[cone].toFixed(1)} mbar, ${fmtSigned(r)} mbar toward zero (${(f * 100).toFixed(0)} % of model) · ${why.join(" · ")}`,
          tags: [cone, tmp, "TMP-PHC-07"],
          subs: ["phc-lower"],
          lead: { tag: cone, target: model[cone] * (f < 0.35 ? 0.65 : 0.5) },
        });
      }

      // FP-08 riser / lower-stage build-up: a section's pressure loss above model with its gas temperature pattern shifted.
      const inletLoss = good("PRS-KLN-01") ? meanRes("PRS-KLN-01", 10) / Math.max(0.5, Math.abs(model["PRS-KLN-01"])) : 0;
      for (const sec of SECTIONS) {
        if (!good(sec.a, sec.b)) continue;
        const lm = model[sec.b] - model[sec.a];
        if (lm < 0.5) continue;
        const lres = meanRes(sec.b, 10) - meanRes(sec.a, 10);
        const rise = lres / lm;
        if (rise < 0.2) continue;
        const shifts = sec.temps.filter((tg) => good(tg)).map((tg) => [tg, meanRes(tg, 10)] as const);
        const tMax = shifts.reduce((m, [, v]) => (Math.abs(v) > Math.abs(m) ? v : m), 0);
        const tShift = Math.abs(tMax) >= sec.tempMin;
        const draftLoss = inletLoss >= 0.2;
        if (!tShift && !draftLoss) continue;
        const critical = rise >= 0.35 && (Math.abs(tMax) >= 30 || inletLoss >= 0.35);
        const tTag = shifts.find(([, v]) => v === tMax)?.[0];
        offer({
          sev: critical ? "Critical" : "Alert",
          score: rise,
          evidence: `FP-08 ${sec.label} build-up: section ΔP ${lm.toFixed(1)} → ${(lm + lres).toFixed(1)} mbar (${fmtSigned(rise * 100, 0)} % vs model)${tShift && tTag ? ` · ${tTag} ${fmtSigned(tMax, 0)} K` : ""}${draftLoss ? ` · kiln-inlet draft ${(inletLoss * 100).toFixed(0)} % weaker` : ""}`,
          tags: [sec.a, sec.b, ...sec.temps, ...(draftLoss ? ["PRS-KLN-01"] : [])],
          subs: [sec.label === "C6 riser" ? "phc-riser" : sec.temps.some((tg) => ["TMP-PHC-04", "TMP-PHC-05", "TMP-PHC-06"].includes(tg)) ? "phc-lower" : "phc-upper"],
          lead: tTag ? { tag: tTag, target: model[tTag] + Math.sign(tMax || 1) * (Math.abs(tMax) < 25 ? 25 : 50) } : { tag: sec.b, target: model[sec.b] * 0.65 },
        });
      }
    }
    // The most severe branch, then the largest deviation.
    const rank = (b: (typeof cands)[number]) => (b.sev === "Critical" ? 10 : 0) + b.score;
    const b = cands.sort((x, y) => rank(y) - rank(x))[0];
    if (b) {
      H("PYR-PHC-01", "SW-PHC-01", { severity: b.sev, evidence: b.evidence, tags: [...new Set(b.tags)], subs: b.subs, lead: b.lead });
    }
  }

  // ================================================================ SW-PHC-02 (CO / O₂ / NOₓ context)
  {
    const coIn = good("GAS-KLN-02") ? measured["GAS-KLN-02"] : 0;
    const coEx = good("GAS-PHC-02") ? measured["GAS-PHC-02"] : 0;
    const o2Low = (good("GAS-KLN-01") && measured["GAS-KLN-01"] < 1.6) || (good("GAS-PHC-01") && measured["GAS-PHC-01"] < 2.6);
    if ((coIn > 1500 || coEx > 1000) && o2Low) {
      // Context, not a burning verdict (D4 Table 8.3, MOM 1.3.2): NOₓ responds to fuel, temperature, air and sample validity.
      const noxTxt = good("GAS-KLN-03")
        ? `NOₓ ${measured["GAS-KLN-03"].toFixed(0)} ppm (${fmtSigned(res("GAS-KLN-03"), 0)} vs model) at coal ${measured["FLO-BRN-01"].toFixed(2)} t/h, burning zone ${measured["TMP-KLN-14"].toFixed(0)} °C, inlet O₂ ${measured["GAS-KLN-01"].toFixed(2)} vol%`
        : "NOₓ not valid";
      H("PYR-PHC-01", "SW-PHC-02", {
        severity: "Alert",
        evidence: `CO inlet ${coIn.toFixed(0)} ppm, exit ${coEx.toFixed(0)} ppm with O₂ ${measured["GAS-KLN-01"].toFixed(2)} / ${measured["GAS-PHC-01"].toFixed(2)} vol% · ${noxTxt} · inlet analyser ${states["STS-KLN-06"]} — context, not a burning-quality verdict`,
        tags: ["GAS-PHC-02", "GAS-PHC-01", "GAS-KLN-02", "GAS-KLN-01", "GAS-KLN-03"],
        lead: { tag: "GAS-PHC-02", target: coEx < 1200 ? 1200 : 2500 },
      });
    }
  }

  // ================================================================ ID fan (FP-10 / FP-11)
  bearingHit(c, "PYR-PHC-01", "R-PHC-03", [["VIB-PHC-01", "TMP-PHC-09", "phc-idfan", "ID fan DE"], ["VIB-PHC-02", "TMP-PHC-10", "phc-idfan", "ID fan NDE"]], 4.5, 7.1);
  if (!hits["PYR-PHC-01"]["R-PHC-03"] && fanOn && good("VIB-PHC-01", "VIB-PHC-02", "TMP-PHC-09", "TMP-PHC-10", "SPD-PHC-01")) {
    const r1 = ratio("VIB-PHC-01");
    const r2 = ratio("VIB-PHC-02");
    const spdDev = Math.abs(res("SPD-PHC-01")) / Math.max(1, model["SPD-PHC-01"]);
    if (r1 > 1.35 && r2 > 1.35 && spdDev < 0.015 && meanRes("TMP-PHC-09", 10) < 1.5 && meanRes("TMP-PHC-10", 10) < 1.5) {
      H("PYR-PHC-01", "R-PHC-04", {
        severity: Math.max(measured["VIB-PHC-01"], measured["VIB-PHC-02"]) >= 4.5 ? "Critical" : "Alert",
        evidence: `DE ×${r1.toFixed(2)} and NDE ×${r2.toFixed(2)} model together at a constant ${measured["SPD-PHC-01"].toFixed(0)} rpm · bearings not heating`,
        tags: ["VIB-PHC-01", "VIB-PHC-02", "SPD-PHC-01"],
        subs: ["phc-idfan"],
        lead: { tag: "VIB-PHC-01", target: measured["VIB-PHC-01"] < 4.5 ? 4.5 : 7.1 },
      });
    }
  }

  // ================================================================ R-PHC-05 (FP-09 false air)
  if (fanOn && good("CAL-PHC-01") && meanRes("CAL-PHC-01", 10) > 0.6) {
    const pw = good("ELE-PHC-01") ? meanRes("ELE-PHC-01", 10) / Math.max(1, model["ELE-PHC-01"]) : 0;
    const c1 = good("TMP-PHC-01") ? meanRes("TMP-PHC-01", 10) : 0;
    if (pw >= 0.02 || c1 <= -6) {
      H("PYR-PHC-01", "R-PHC-05", {
        severity: measured["CAL-PHC-01"] >= 2.8 ? "Critical" : "Alert",
        evidence: `Exit − inlet O₂ ${measured["CAL-PHC-01"].toFixed(2)} vol% (${fmtSigned(meanRes("CAL-PHC-01", 10), 2)} above model) · ID fan power ${fmtSigned(pw * 100, 1)} % vs fan law · C1 gas ${fmtSigned(c1, 0)} K`,
        tags: ["CAL-PHC-01", "GAS-PHC-01", "ELE-PHC-01", "TMP-PHC-01"],
        subs: ["phc-upper"],
        lead: { tag: "CAL-PHC-01", target: measured["CAL-PHC-01"] < 2.0 ? 2.0 : 2.8 },
      });
    }
  }

  // ================================================================ Sensor checks (D5 Table 5.3.6)
  if (!fanOn) return;

  // R-PHC-V1 · stage temperature order; the hot meal between the C4 gas and the riser gas.
  {
    const odd = new Set<string>();
    const pairs: string[] = [];
    const tg = TEMP_ORDER.filter((t) => good(t));
    for (let i = 0; i + 1 < tg.length; i++) {
      if (measured[tg[i]] >= measured[tg[i + 1]]) {
        pairs.push(`${tg[i]} ${measured[tg[i]].toFixed(0)} ≥ ${tg[i + 1]} ${measured[tg[i + 1]].toFixed(0)} °C`);
        odd.add(Math.abs(z(tg[i])) >= Math.abs(z(tg[i + 1])) ? tg[i] : tg[i + 1]);
      }
    }
    if (good("TMP-PHC-07", "TMP-PHC-04", "TMP-PHC-08")) {
      const meal = measured["TMP-PHC-07"];
      const lo = measured["TMP-PHC-04"];
      const hi = measured["TMP-PHC-08"];
      if (meal <= lo || meal >= hi) {
        pairs.push(`hot meal ${meal.toFixed(0)} °C outside C4 gas ${lo.toFixed(0)} … riser ${hi.toFixed(0)} °C`);
        const nb = meal <= lo ? "TMP-PHC-04" : "TMP-PHC-08";
        odd.add(Math.abs(z("TMP-PHC-07")) >= Math.abs(z(nb)) ? "TMP-PHC-07" : nb);
      }
    }
    if (odd.size) {
      const sus = [...odd];
      H("PYR-PHC-01", "R-PHC-V1", {
        severity: "Alert",
        evidence: `${sus.map((t) => `${t} (${fmtSigned(res(t), 0)} K vs model)`).join(", ")} suspect: ${pairs.join(" · ")}`,
        tags: sus,
        subs: ["phc-upper", "phc-lower"],
      });
    }
  }

  // R-PHC-V2 · draft staircase and response to the operating change (blocked tap / no purge).
  if (drafted) {
    const odd = new Set<string>();
    const why: string[] = [];
    const tg = STAIR.filter((t) => good(t));
    for (let i = 0; i + 1 < tg.length; i++) {
      if (measured[tg[i]] >= measured[tg[i + 1]]) {
        why.push(`${tg[i]} ${measured[tg[i]].toFixed(1)} not below ${tg[i + 1]} ${measured[tg[i + 1]].toFixed(1)} mbar`);
        odd.add(Math.abs(z(tg[i])) >= Math.abs(z(tg[i + 1])) ? tg[i] : tg[i + 1]);
      }
    }
    const mean = (a: number[], from: number, to: number) => a.slice(a.length - from, a.length - to).reduce((x, y) => x + y, 0) / (from - to);
    // D5 Table 5.3.6 "react to ID fan speed": the response test runs on an ID-fan speed change (≥ 1.5 % in 20 min), whose
    // draft response is large against the tap noise; a slow feed ramp moves the drafts too little to judge a tap on.
    const spd = s.hist["SPD-PHC-01"] ?? [];
    const fanMoved = good("SPD-PHC-01") && spd.length >= 25 && Math.abs(mean(spd, 5, 0) - mean(spd, 25, 20)) >= 0.015 * PYRO_SIGNAL_BY_TAG["SPD-PHC-01"].base;
    for (const tap of fanMoved ? DRAFT_TAPS : []) {
      const h = s.hist[tap];
      const mh = s.modelHist[tap];
      if (!good(tap) || h.length < 25 || mh.length < 25) continue;
      const dModel = mean(mh, 5, 0) - mean(mh, 25, 20);
      if (Math.abs(dModel) < Math.max(4 * sig(tap), 0.04 * Math.abs(model[tap]))) continue;
      const dMeas = mean(h, 5, 0) - mean(h, 25, 20);
      if (dMeas / dModel < 0.3) {
        why.push(`${tap} moved ${fmtSigned(dMeas, 1)} mbar in 20 min where the model moved ${fmtSigned(dModel, 1)}`);
        odd.add(tap);
      }
    }
    if (odd.size) {
      H("PYR-PHC-01", "R-PHC-V2", {
        severity: "Alert",
        evidence: `${[...odd].join(", ")} suspect (blocked tap / purge / transmitter): ${why.join(" · ")} · ID fan ${measured["SPD-PHC-01"].toFixed(0)} rpm`,
        tags: [...odd],
        subs: ["phc-upper", "phc-lower"],
      });
    }
  }

  // R-PHC-V3 · exit O₂ above kiln-inlet O₂.
  if (good("GAS-PHC-01", "GAS-KLN-01") && measured["GAS-PHC-01"] < measured["GAS-KLN-01"]) {
    const odd = Math.abs(z("GAS-PHC-01")) >= Math.abs(z("GAS-KLN-01")) ? "GAS-PHC-01" : "GAS-KLN-01";
    H("PYR-PHC-01", "R-PHC-V3", {
      severity: "Alert",
      evidence: `${odd} suspect: exit O₂ ${measured["GAS-PHC-01"].toFixed(2)} vol% (${fmtSigned(res("GAS-PHC-01"), 2)} vs model) below kiln-inlet O₂ ${measured["GAS-KLN-01"].toFixed(2)} vol% (${fmtSigned(res("GAS-KLN-01"), 2)}) — air only enters the tower`,
      tags: [odd, odd === "GAS-PHC-01" ? "GAS-KLN-01" : "GAS-PHC-01", "CAL-PHC-01"],
      subs: ["phc-exitgas"],
    });
  }

  // R-PHC-V4 · fan power vs speed / damper (no false air to explain it).
  if (good("ELE-PHC-01", "SPD-PHC-01", "POS-PHC-01")) {
    const f = meanRes("ELE-PHC-01", 5) / Math.max(1, model["ELE-PHC-01"]);
    const falseAir = good("CAL-PHC-01") && meanRes("CAL-PHC-01", 10) > 0.3;
    if (Math.abs(f) > 0.1 && !falseAir) {
      H("PYR-PHC-01", "R-PHC-V4", {
        severity: "Alert",
        evidence: `ELE-PHC-01 suspect: ${measured["ELE-PHC-01"].toFixed(0)} kW, ${fmtSigned(f * 100, 0)} % vs the fan-law model at ${measured["SPD-PHC-01"].toFixed(0)} rpm and damper ${measured["POS-PHC-01"].toFixed(0)} % · exit − inlet O₂ at model (no false air)`,
        tags: ["ELE-PHC-01", "SPD-PHC-01", "POS-PHC-01"],
        subs: ["phc-idfan"],
      });
    }
  }
}
