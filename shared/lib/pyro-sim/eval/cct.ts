/**
 * Clinker transport PYR-CCT-01 (HMR-01 crusher + CSL-01 pan conveyor and silo) rule evaluation.
 *
 * Reads the minute's shared context (`./context`) and records findings with
 * `H`; rule definitions live in `../rules/cct.ts`.
 */
import { fmtSigned } from "../shared";
import { bearingHit, patterned, slopePerHour, subsOf, unitRun, type EvalContext } from "./context";

const M = "PYR-CCT-01";
/** Pan-conveyor head-drive current running empty (A): 45 % of the 74 A loaded design current. */
const CSL_NO_LOAD = 0.45 * 74;

/** Measured / model over the last `n` samples (steadier than one sample). */
function ratioN(c: EvalContext, tag: string, n = 5): number {
  const h = c.s.hist[tag];
  const mh = c.s.modelHist[tag];
  const k = Math.min(n, h.length);
  let a = 0;
  let b = 0;
  for (let i = h.length - k; i < h.length; i++) {
    a += h[i];
    b += mh[i];
  }
  return a / Math.max(0.05 * k, b);
}

/** Largest jump of a 3-sample mean above the preceding 10-sample mean within the last `lookback` samples. */
function stepJump(c: EvalContext, tag: string, lookback = 240): number {
  const h = c.s.hist[tag];
  let best = 0;
  for (let i = Math.max(10, h.length - lookback); i <= h.length - 3; i++) {
    let pre = 0;
    for (let j = i - 10; j < i; j++) pre += h[j];
    const post = (h[i] + h[i + 1] + h[i + 2]) / 3;
    best = Math.max(best, post - pre / 10);
  }
  return best;
}

/** Peak-to-peak of the last `n` recorded samples (or of the reference model). */
function p2p(c: EvalContext, tag: string, n: number, model = false): number {
  const w = (model ? c.s.modelHist : c.s.hist)[tag].slice(-n);
  return w.length ? Math.max(...w) - Math.min(...w) : 0;
}

export function evalCct(c: EvalContext): void {
  const { measured, model, meanRes, ratio, good, transient, H } = c;
  const crusherRun = unitRun(c, "hmr-crusher") === "run";
  const conveyorRun = unitRun(c, "csl-conveyor") === "run";
  const dustFanRun = unitRun(c, "csl-dust-fan") === "run";
  const iHmr = good("ELE-HMR-01") ? meanRes("ELE-HMR-01", 10) : 0;

  // HMR-01
  if (crusherRun) {
    /* ---- FP-41 R-HMR-01: rotor bearing (vibration + heating, or heating with load before vibration) ---- */
    bearingHit(c, M, "R-HMR-01", [["VIB-HMR-01", "TMP-HMR-01", "hmr-rotor", "Rotor DE"], ["VIB-HMR-02", "TMP-HMR-02", "hmr-rotor", "Rotor NDE"]], 7.1, 11);
    if (!c.hits[M]["R-HMR-01"]) {
      for (const [vib, tmp, label] of [["VIB-HMR-01", "TMP-HMR-01", "DE"], ["VIB-HMR-02", "TMP-HMR-02", "NDE"]]) {
        if (!good(vib, tmp, "ELE-HMR-01")) continue;
        const dT = meanRes(tmp, 10);
        if (dT > 8 && iHmr > 4 && ratio(vib) < 1.4) {
          H(M, "R-HMR-01", {
            severity: measured[tmp] >= 85 || dT > 16 ? "Critical" : "Alert",
            evidence: `Rotor ${label} bearing +${dT.toFixed(1)} K above model with motor current ${fmtSigned(iHmr, 0)} A, vibration ×${ratio(vib).toFixed(2)} — heating before vibration (lubrication)`,
            tags: [tmp, "ELE-HMR-01", vib],
            subs: ["hmr-rotor"],
            lead: { tag: tmp, target: measured[tmp] < 85 ? 85 : 95 },
          });
          break;
        }
      }
    }

    /* ---- FP-41 R-HMR-02: jam / overload (speed falling, current high; winding corroborates) ---- */
    if (good("SPD-HMR-01", "ELE-HMR-01") && meanRes("SPD-HMR-01", 3) < -8 && meanRes("ELE-HMR-01", 3) > 15) {
      const wdg = good("TMP-HMR-03") ? meanRes("TMP-HMR-03", 10) : null;
      H(M, "R-HMR-02", {
        severity: measured["SPD-HMR-01"] <= 325 || measured["ELE-HMR-01"] >= 135 ? "Critical" : "Alert",
        evidence: `Rotor ${measured["SPD-HMR-01"].toFixed(0)} rpm (${fmtSigned(meanRes("SPD-HMR-01", 3), 0)}) with current ${measured["ELE-HMR-01"].toFixed(0)} A (${fmtSigned(meanRes("ELE-HMR-01", 3), 0)}) · winding ${wdg === null ? "not valid" : `${fmtSigned(wdg, 0)} K vs model${wdg > 8 ? " (corroborates)" : ""}`}`,
        tags: ["SPD-HMR-01", "ELE-HMR-01", "TMP-HMR-03"],
        subs: ["hmr-rotor", "hmr-motor"],
        lead: { tag: "ELE-HMR-01", target: measured["ELE-HMR-01"] < 135 ? 135 : 155 },
      });
    }

    /* ---- FP-40 R-HMR-03: hammer loss — step increase in rotor vibration, no heating ---- */
    if (good("VIB-HMR-01", "VIB-HMR-02", "TMP-HMR-01", "TMP-HMR-02")) {
      const rDe = ratioN(c, "VIB-HMR-01");
      const rNde = ratioN(c, "VIB-HMR-02");
      const heat = Math.max(meanRes("TMP-HMR-01", 10), meanRes("TMP-HMR-02", 10));
      if (Math.min(rDe, rNde) > 1.3 && Math.max(rDe, rNde) > 1.4 && heat < 1.5) {
        const jDe = stepJump(c, "VIB-HMR-01");
        const jNde = stepJump(c, "VIB-HMR-02");
        if (Math.max(jDe, jNde) >= 1.2 && Math.min(jDe, jNde) >= 0.8) {
          const vmax = Math.max(measured["VIB-HMR-01"], measured["VIB-HMR-02"]);
          const tag = measured["VIB-HMR-01"] >= measured["VIB-HMR-02"] ? "VIB-HMR-01" : "VIB-HMR-02";
          H(M, "R-HMR-03", {
            severity: vmax >= 7.1 || Math.max(rDe, rNde) > 2.2 ? "Critical" : "Alert",
            evidence: `Rotor vibration stepped up +${jDe.toFixed(1)} mm/s DE and +${jNde.toFixed(1)} mm/s NDE (now ×${rDe.toFixed(2)} / ×${rNde.toFixed(2)} model) with bearings ${fmtSigned(heat, 1)} K — imbalance without bearing heating`,
            tags: ["VIB-HMR-01", "VIB-HMR-02"],
            subs: ["hmr-rotor"],
            lead: { tag, target: vmax < 7.1 ? 7.1 : 11 },
          });
        }
      }
    }
  }

  // CSL-01
  if (conveyorRun) {
    const dragI = good("ELE-CSL-01") ? meanRes("ELE-CSL-01", 5) : 0;
    const dragS = good("SPD-CSL-01") ? meanRes("SPD-CSL-01", 5) : 0;
    const vr = good("VIB-CSL-01") ? ratio("VIB-CSL-01") : 1;

    /* ---- FP-43 R-CSL-01: drag / overload (current up, chain speed sagging) ---- */
    if (dragI > 8 && dragS < -0.12) {
      H(M, "R-CSL-01", {
        severity: measured["ELE-CSL-01"] >= 95 || measured["SPD-CSL-01"] <= 5.6 ? "Critical" : "Alert",
        evidence: `Motor ${fmtSigned(dragI, 0)} A above model, chain ${fmtSigned(dragS, 2)} rpm · drive vibration ×${vr.toFixed(2)}`,
        tags: ["ELE-CSL-01", "SPD-CSL-01"],
        subs: ["csl-conveyor"],
        lead: { tag: "ELE-CSL-01", target: measured["ELE-CSL-01"] < 95 ? 95 : 108 },
      });
    }

    /* ---- FP-43 R-CSL-04: head-drive degradation (vibration up; overload corroborates) ---- */
    if (vr > 1.4) {
      H(M, "R-CSL-04", {
        severity: measured["VIB-CSL-01"] >= 4.5 || measured["ELE-CSL-01"] >= 95 ? "Critical" : "Alert",
        evidence: `Head-drive vibration ×${vr.toFixed(2)} model (${measured["VIB-CSL-01"].toFixed(2)} mm/s) · motor ${fmtSigned(dragI, 0)} A vs model${dragI > 3 ? " (overload — corroborates)" : ""}`,
        tags: dragI > 3 ? ["VIB-CSL-01", "ELE-CSL-01"] : ["VIB-CSL-01"],
        subs: ["csl-conveyor"],
        lead: { tag: "VIB-CSL-01", target: measured["VIB-CSL-01"] < 4.5 ? 4.5 : 7.1 },
      });
    }

    /* ---- FP-42 R-CSL-05: chain break — tail speed zero with the drive running and unloaded ---- */
    if (good("SPD-CSL-01", "ELE-CSL-01")) {
      const spdRef = Math.max(0.5, model["SPD-CSL-01"]);
      const iRef = Math.max(1, model["ELE-CSL-01"]);
      const i = measured["ELE-CSL-01"];
      // Unloaded: well below the loaded model, or at no-load when the model itself expects an empty conveyor (kiln
      // stopped): the tail shaft standing still with the head drive on is the break either way (D5 FP-42).
      const unloaded = i < 0.6 * iRef || i < 1.15 * CSL_NO_LOAD;
      if (measured["SPD-CSL-01"] < 0.2 * spdRef && i > 0.15 * iRef && unloaded) {
        H(M, "R-CSL-05", {
          severity: "Critical",
          evidence: `Tail speed ${measured["SPD-CSL-01"].toFixed(2)} rpm (reference ${spdRef.toFixed(1)}) while the head drive runs at ${i.toFixed(0)} A, ${((i / iRef) * 100).toFixed(0)} % of its ${iRef < 1.15 * CSL_NO_LOAD ? "no-load" : "loaded"} model — drive unloaded, chain broken`,
          tags: ["SPD-CSL-01", "ELE-CSL-01"],
          subs: ["csl-conveyor"],
          stateRule: true,
        });
      }
    }
  }

  /* ---- FP-44 R-CSL-02: baghouse blinding (ΔP up, flow down) or torn bag (ΔP down, flow up) ---- */
  if (dustFanRun && good("PRS-CSL-01", "ELE-CSL-02")) {
    const dp = meanRes("PRS-CSL-01", 10);
    const fi = meanRes("ELE-CSL-02", 10);
    const blind = dp > 2.5 && fi < -1.5;
    const torn = dp < -2.5 && fi > 1;
    if (blind || torn) {
      const lvl = good("LEV-CSL-01") ? slopePerHour(c, "LEV-CSL-01", 30) : null;
      H(M, "R-CSL-02", {
        severity: blind ? (measured["PRS-CSL-01"] >= 18 ? "Critical" : "Alert") : dp < -6 ? "Critical" : "Alert",
        evidence: `Baghouse ΔP ${measured["PRS-CSL-01"].toFixed(1)} mbar, ${fmtSigned(dp)} mbar ${blind ? "above" : "below"} the cleaning-cycle model · dust-fan current ${fmtSigned(fi)} A vs model (flow ${blind ? "falling — blinding" : "rising — air bypassing a torn bag"}) · silo level ${lvl === null ? "not valid" : `${fmtSigned(lvl, 1)} %/h${lvl > 0.5 ? " (filling: displaced air through the filter)" : ""}`}`,
        tags: ["PRS-CSL-01", "ELE-CSL-02"],
        subs: ["csl-silo"],
        lead: blind ? { tag: "PRS-CSL-01", target: measured["PRS-CSL-01"] < 18 ? 18 : 22 } : { tag: "PRS-CSL-01", target: Math.max(0, model["PRS-CSL-01"] - 6) },
      });
    }
  }

  if (good("LEV-CSL-01") && measured["LEV-CSL-01"] >= 88) {
    H(M, "R-CSL-03", {
      severity: measured["LEV-CSL-01"] >= 94 ? "Critical" : "Alert",
      evidence: `Process indication: clinker silo ${measured["LEV-CSL-01"].toFixed(1)} %`,
      tags: ["LEV-CSL-01"],
      lead: { tag: "LEV-CSL-01", target: 94 },
    });
  }

  /* ---- SV-HMR-01 / SV-CSL-01: D5 Tables 5.7.6 and 5.8.6 sensor verification ---- */
  const verify = (id: "SV-HMR-01" | "SV-CSL-01", checks: Array<[string, string]>) => {
    const kept = checks.filter(([tag]) => !patterned(c, tag));
    if (kept.length) H(M, id, { severity: "Alert", evidence: kept.map(([, n]) => n).join(" · "), tags: kept.map(([t]) => t), subs: subsOf(kept.map(([t]) => t)) });
  };
  // "≈ 0 when stopped" is screened line-wide by the data-quality stage (R-DQ-02 physical neighbours).

  {
    const hmr: Array<[string, string]> = [];
    if (crusherRun && !transient) {
      // DE / NDE vibration trend together: one pickup up alone, its bearing flat → pickup / mounting.
      const pair: Array<[string, string, string, string]> = [["VIB-HMR-01", "VIB-HMR-02", "TMP-HMR-01", "DE"], ["VIB-HMR-02", "VIB-HMR-01", "TMP-HMR-02", "NDE"]];
      for (const [v, other, tmp, label] of pair) {
        if (!good(v, other, tmp)) continue;
        const r = ratioN(c, v);
        const ro = ratioN(c, other);
        if (r > 1.6 && ro < 1.15 && meanRes(tmp, 10) < 1.5) hmr.push([v, `${v} ×${r.toFixed(2)} model while the other rotor bearing reads ×${ro.toFixed(2)} and the ${label} bearing is flat — DE / NDE do not trend together (pickup / mounting)`]);
      }
      // DE / NDE bearing temperatures trend together at a steady load.
      if (good("TMP-HMR-01", "TMP-HMR-02", "VIB-HMR-01", "VIB-HMR-02", "ELE-HMR-01")) {
        const d1 = meanRes("TMP-HMR-01", 10);
        const d2 = meanRes("TMP-HMR-02", 10);
        if (Math.abs(d1 - d2) > 8 && ratioN(c, "VIB-HMR-01") < 1.2 && ratioN(c, "VIB-HMR-02") < 1.2 && Math.abs(iHmr) < 2) {
          const tag = Math.abs(d1) > Math.abs(d2) ? "TMP-HMR-01" : "TMP-HMR-02";
          hmr.push([tag, `DE ${fmtSigned(d1, 1)} K and NDE ${fmtSigned(d2, 1)} K vs model diverge without vibration or load change — check the ${tag} RTD`]);
        }
      }
      // Winding follows the current.
      if (good("TMP-HMR-03", "ELE-HMR-01")) {
        const w = meanRes("TMP-HMR-03", 10);
        if (Math.abs(w) > 12 && Math.abs(iHmr) < 3) hmr.push(["TMP-HMR-03", `Winding ${fmtSigned(w, 0)} K vs model while the current is unchanged (${fmtSigned(iHmr, 1)} A) — winding RTD, or motor cooling`]);
      }
    }
    verify("SV-HMR-01", hmr);
  }

  {
    const csl: Array<[string, string]> = [];
    if (!transient) {
      // The silo level rises with conveying.
      // Conveying: the conveyor runs at speed and its drive carries the clinker the model expects over the hour. An empty
      // conveyor (cooler backed up behind a stopped grate, crusher or broken chain) does not fill the silo.
      const loadShare = (xs: number[]) => xs.reduce((a, x) => a + Math.max(0, (x - CSL_NO_LOAD) / (74 - CSL_NO_LOAD)), 0) / Math.max(1, xs.length);
      const carried = loadShare(c.s.hist["ELE-CSL-01"].slice(-60)) >= 0.7 * loadShare(c.s.modelHist["ELE-CSL-01"].slice(-60));
      const conveying = conveyorRun && good("ELE-CSL-01", "SPD-CSL-01") && measured["SPD-CSL-01"] > 0.8 * Math.max(0.5, model["SPD-CSL-01"]) && carried;
      if (conveying && good("LEV-CSL-01")) {
        const ms = slopePerHour(c, "LEV-CSL-01", 60, true);
        const ls = slopePerHour(c, "LEV-CSL-01", 60);
        if (ms !== null && ls !== null && ms >= 0.5 && ls <= 0 && ls < ms - 1.5) csl.push(["LEV-CSL-01", `Silo level ${fmtSigned(ls, 1)} %/h over 1 h while conveying should raise it ${fmtSigned(ms, 1)} %/h — level does not rise with conveying (radar echo / antenna)`]);
      }
      // The baghouse ΔP cycles with bag cleaning.
      if (dustFanRun && good("PRS-CSL-01")) {
        const mp = p2p(c, "PRS-CSL-01", 40, true);
        const pp = p2p(c, "PRS-CSL-01", 40);
        if (mp > 1 && pp < 0.4 * mp) csl.push(["PRS-CSL-01", `Baghouse ΔP peak-to-peak ${pp.toFixed(2)} mbar over 40 min against a ${mp.toFixed(1)} mbar cleaning cycle — ΔP not cycling with bag cleaning (impulse line, or pulse-jet stopped)`]);
      }
    }
    verify("SV-CSL-01", csl);
  }
}
