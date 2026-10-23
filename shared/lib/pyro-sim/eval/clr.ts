/**
 * Grate cooler PYR-CLR-01 rule evaluation.
 *
 * Reads the minute's shared context (`./context`) and records findings with
 * `H`; rule definitions live in `../rules/clr.ts`.
 */
import { CLR_BASE, fmtSigned, median } from "../shared";
import { bearingHit, patterned, subsOf, unitRun, type EvalContext } from "./context";

const M = "PYR-CLR-01";
const FANS = [1, 2, 3, 4, 5, 6];
/** Latest handheld discharge reading older than this is not compared (min). */
const HANDHELD_MAX_AGE = 300;

export function evalClr(c: EvalContext): void {
  const { s, t, measured, model, res, meanRes, ratio, good, hits, transient, H } = c;
  const fanRun = (k: number) => unitRun(c, `clr-fan-${k}`) === "run";
  const ventRun = unitRun(c, "clr-vent-fan") === "run";
  const disR = good("TMP-CLR-08") ? meanRes("TMP-CLR-08", 5) : 0;
  /** Compartment pressure residual relative to its design value. */
  const rel = (k: number) => meanRes(`PRS-CLR-0${k}`, 5) / CLR_BASE[k - 1];
  /** Fan current residual relative to its model. */
  const relI = (k: number) => meanRes(`ELE-CLR-0${k}`, 5) / Math.max(1, model[`ELE-CLR-0${k}`]);

  /* ---- FP-35 SW-CLR-01: grate holes — pressure falling at constant fan, current up ---- */
  {
    let comp: { k: number; rel: number; relI: number } | null = null;
    for (const k of FANS) {
      if (!fanRun(k) || !good(`PRS-CLR-0${k}`, `ELE-CLR-0${k}`)) continue;
      const r = rel(k);
      const ri = relI(k);
      if (r < -0.18 && ri > 0.03 && (!comp || r < comp.rel)) comp = { k, rel: r, relI: ri };
    }
    if (comp) {
      const k = comp.k;
      // Suspicion only (Table 8.3): pressure change is multi-causal and the inputs to separate the causes do not exist.
      H(M, "SW-CLR-01", {
        severity: "Alert",
        evidence: `Compartment ${k} ${measured[`PRS-CLR-0${k}`].toFixed(0)} mbar (${fmtSigned(comp.rel * 100, 0)} % vs bed-corrected model) with fan ${k} current ${fmtSigned(res(`ELE-CLR-0${k}`), 1)} % FLA (${fmtSigned(comp.relI * 100, 0)} %) — air short-circuiting at a steady fan · discharge ${fmtSigned(disR, 0)} K${disR > 10 ? " (corroborates)" : ""} · secondary air ${good("TMP-BRN-02") ? `${measured["TMP-BRN-02"].toFixed(0)} °C (trend only)` : "not valid"} · missing inputs: cooling-air flow, bed depth, fan damper position, tap validation — suspicion only`,
        tags: [`PRS-CLR-0${k}`, `ELE-CLR-0${k}`, "TMP-CLR-08"],
        subs: [k <= 3 ? "clr-hot" : "clr-cold"],
        lead: { tag: `PRS-CLR-0${k}`, target: CLR_BASE[k - 1] * 0.6 },
      });
    }
  }

  /* ---- FP-37 R-CLR-02: cooling fan bearing defect, fans compared with each other ---- */
  {
    // OSW-PE-SNL-PYR-01 Rev. 02: every cooling fan has a vibration pickup (fans 4–6 included).
    const running = FANS.filter(fanRun);
    bearingHit(c, M, "R-CLR-02", running.map((k) => [`VIB-CLR-0${k}`, `TMP-CLR-0${k}`, k <= 3 ? "clr-fans13" : "clr-fans46", `Cooling fan ${k}`] as [string, string, string, string]), 4.5, 7.1);
    const h = hits[M]["R-CLR-02"];
    if (h) {
      const k = Number(h.tags[0].slice(-1));
      const others = running.filter((j) => j !== k && good(`VIB-CLR-0${j}`));
      if (others.length) h.evidence += ` · ×${(ratio(`VIB-CLR-0${k}`) / median(others.map((j) => ratio(`VIB-CLR-0${j}`)))).toFixed(2)} the other fans' vibration`;
      if (good(`ELE-CLR-0${k}`)) {
        h.evidence += ` · current ${fmtSigned(res(`ELE-CLR-0${k}`), 1)} % FLA`;
        // The fan load following the defect is part of the pattern (third witness).
        if (res(`ELE-CLR-0${k}`) > 1) h.tags = [...h.tags, `ELE-CLR-0${k}`];
      }
    }
  }

  /* ---- FP-38 R-CLR-03: grate drive jam / drive fault (motor-driven grate drives 1–3, Rev. 02 HP-05) ---- */
  {
    // Cold-end bed: compartments 4–6 against their model (bed build-up evidence).
    const bedNow = [4, 5, 6].filter((k) => good(`PRS-CLR-0${k}`)).map(rel);
    const bedRel = bedNow.length ? median(bedNow) : 0;
    type GrateHit = { score: number; sev: "Alert" | "Critical"; evidence: string; tags: string[]; lead: { tag: string; target: number }; stateRule?: boolean };
    let best: GrateHit | null = null;
    const offer = (g: GrateHit) => {
      if (!best || (g.sev === "Critical" ? 10 : 0) + g.score > (best.sev === "Critical" ? 10 : 0) + best.score) best = g;
    };
    for (const n of [1, 2, 3]) {
      const unit = `clr-grate-${n}`;
      const ele = `ELE-CLR-1${n}`;
      const spdTag = `SPD-CLR-1${n}`;
      const st = unitRun(c, unit);
      // A drive trip stops its grate: the bed builds behind it (D5 FP-38 effect).
      if (st === "tripped") {
        offer({ score: 1, sev: "Critical", evidence: `Grate drive ${n} tripped: its grate stops and the bed builds · cold-end compartments ${fmtSigned(bedRel * 100, 0)} % vs model`, tags: [ele, spdTag], lead: { tag: `PRS-CLR-0${n === 1 ? 1 : 4}`, target: CLR_BASE[n === 1 ? 0 : 3] * 1.35 }, stateRule: true });
        continue;
      }
      if (st !== "run" || !good(ele)) continue;
      const i = measured[ele];
      const im = Math.max(1, model[ele]);
      const iR = meanRes(ele, 5) / im;
      const spdOk = good(spdTag);
      const spd = measured[spdTag];
      const spdRef = Math.max(0.5, model[spdTag]);
      const spdR = spdOk ? meanRes(spdTag, 5) : 0;
      const rising = iR > 0.15;
      const slipping = iR < -0.2 && spdOk && spdR < -0.05 * spdRef;
      // Stroke rate off the controller's target (D5 Table 9.2: −5 %; the target follows the clinker reaching the cooler,
      // so a kiln that loses feed or stops lowers it too); below 10 % it needs a corroborating effect (drive current or
      // cold-end bed moving), since the stroke scatters about its target.
      const strokeOff = spdOk && Math.abs(spdR) > 0.05 * spdRef && (Math.abs(spdR) > 0.1 * spdRef || Math.abs(iR) > 0.06 || bedRel > 0.05);
      const stalled = spdOk && spd < 0.1 * spdRef && i > 0.5 * im;
      if (!(rising || slipping || strokeOff || stalled)) continue;
      const what = [
        rising ? `motor current ${i.toFixed(0)} % FLA, ${fmtSigned(iR * 100, 0)} % vs bed model (heavy bed / jam)` : null,
        slipping ? `motor current ${i.toFixed(0)} % FLA, ${fmtSigned(iR * 100, 0)} % vs bed model with the stroke slow (coupling / gearbox slip)` : null,
        strokeOff || stalled ? `stroke ${spd.toFixed(1)} /min vs ${spdRef.toFixed(1)} controller target (${fmtSigned((spdR / spdRef) * 100, 0)} %)${stalled ? " — grate stopped with the drive on" : ""}` : null,
      ].filter(Boolean);
      // OSW-PE-SNL-PYR-01 Rev. 02: drive current H 100 % FLA; stroke L 4 / H 20 /min.
      const crit = i >= 100 || stalled || (spdOk && (spd <= 4 || spd >= 20)) || iR > 0.35;
      offer({
        score: Math.max(Math.abs(iR), Math.abs(spdR) / spdRef),
        sev: crit ? "Critical" : "Alert",
        evidence: `Grate drive ${n} · ${what.join(" · ")} · cold-end compartments ${bedNow.length ? `${fmtSigned(bedRel * 100, 0)} % vs model` : "not valid"} (bed build-up)`,
        tags: [ele, spdTag],
        lead: strokeOff && !rising ? { tag: spdTag, target: spdR < 0 ? 4 : 20 } : { tag: ele, target: i < 100 ? 100 : 110 },
      });
    }
    const g = best as GrateHit | null;
    if (g) H(M, "R-CLR-03", { severity: g.sev, evidence: g.evidence, tags: g.tags, subs: ["clr-drive"], lead: g.lead, stateRule: g.stateRule });
  }

  /* ---- FP-39 R-CLR-04: vent fan degradation (vibration, bearing temperature, current) ---- */
  if (ventRun && good("VIB-CLR-07", "TMP-CLR-10")) {
    const vr = ratio("VIB-CLR-07");
    const dT = meanRes("TMP-CLR-10", 10);
    const iR = good("ELE-CLR-07") ? meanRes("ELE-CLR-07", 10) : 0;
    if (vr > 1.4 || (dT > 8 && vr > 1.15)) {
      const heating = dT > 1.5;
      const exh = good("TMP-CLR-09") ? meanRes("TMP-CLR-09", 10) : null;
      H(M, "R-CLR-04", {
        severity: measured["VIB-CLR-07"] >= 4.5 || measured["TMP-CLR-10"] >= 85 ? "Critical" : "Alert",
        evidence: `Vent exhaust fan vibration ×${vr.toFixed(2)} model · bearing ${fmtSigned(dT, 1)} K · current ${fmtSigned(iR, 1)} % FLA — ${heating ? "bearing defect" : iR < -1.5 ? "impeller build-up (less flow)" : "impeller build-up or looseness (current steady)"} · exhaust ${exh === null ? "not valid" : `${fmtSigned(exh, 0)} K vs model`}`,
        tags: heating ? ["VIB-CLR-07", "TMP-CLR-10", "ELE-CLR-07"] : ["VIB-CLR-07", "ELE-CLR-07"],
        subs: ["clr-vent"],
        lead: { tag: "VIB-CLR-07", target: measured["VIB-CLR-07"] < 4.5 ? 4.5 : 7.1 },
      });
    }
  }

  /* ---- FP-36 R-CLR-05: red river / snowman — hot-zone pressures diverging, discharge up ---- */
  {
    // A compartment with the grate-hole signature (pressure down, its fan current up — FP-35) is not a divergence.
    const holed = (k: number) => rel(k) < -0.18 && good(`ELE-CLR-0${k}`) && relI(k) > 0.03;
    const hot = [1, 2, 3].filter((k) => good(`PRS-CLR-0${k}`) && !holed(k)).map((k) => ({ k, r: rel(k) }));
    const spread = hot.length >= 2 ? Math.max(...hot.map((x) => x.r)) - Math.min(...hot.map((x) => x.r)) : 0;
    if (good("TMP-CLR-08") && (disR > 30 || (spread > 0.15 && disR > 15))) {
      const hi = hot.reduce((a, b) => (b.r > a.r ? b : a), hot[0]);
      const lo = hot.reduce((a, b) => (b.r < a.r ? b : a), hot[0]);
      H(M, "R-CLR-05", {
        severity: measured["TMP-CLR-08"] >= 200 || disR > 70 ? "Critical" : "Alert",
        evidence: `Discharge ${measured["TMP-CLR-08"].toFixed(0)} °C, ${fmtSigned(disR, 0)} K above the model at the same feed and air · hot-zone compartments ${hot.length >= 2 ? `diverging ${(spread * 100).toFixed(0)} % (C${hi.k} ${fmtSigned(hi.r * 100, 0)} %, C${lo.k} ${fmtSigned(lo.r * 100, 0)} %)` : "not valid"}`,
        tags: ["TMP-CLR-08", "PRS-CLR-01", "PRS-CLR-02", "PRS-CLR-03"],
        subs: ["clr-discharge", "clr-hot"],
        lead: { tag: "TMP-CLR-08", target: measured["TMP-CLR-08"] < 160 ? 160 : 200 },
      });
    }
  }

  /* ---- SV-CLR-01: D5 Table 5.6.6 sensor verification ---- */
  const sv: string[] = [];
  const svTags: string[] = [];
  const flag = (tag: string, note: string) => {
    sv.push(note);
    svTags.push(tag);
  };
  // "≈ 0 when stopped" is screened line-wide by the data-quality stage (R-DQ-02 physical neighbours).
  // Each compartment pressure agrees with its fan current: a real air-path change moves the fan load too.
  if (!transient && Math.abs(disR) < 10) {
    for (const k of FANS) {
      const prs = `PRS-CLR-0${k}`;
      if (!fanRun(k) || !good(prs, `ELE-CLR-0${k}`) || patterned(c, prs)) continue;
      const r = rel(k);
      if (Math.abs(r) > 0.2 && Math.abs(relI(k)) < 0.015) {
        flag(prs, `${prs} ${fmtSigned(r * 100, 0)} % vs model while fan ${k} current is unchanged (${fmtSigned(relI(k) * 100, 1)} %) — tap / transmitter`);
      }
    }
  }
  // Discharge IR against the latest handheld round, taken at a steady operating point.
  const hand = s.manual["MAN-CLR-01"];
  if (hand && hand.comparable && hand.scan !== undefined && t - hand.at <= HANDHELD_MAX_AGE && Math.abs(hand.scan - hand.value) > 25) {
    flag("TMP-CLR-08", `TMP-CLR-08 read ${hand.scan.toFixed(0)} °C against a handheld ${hand.value.toFixed(0)} °C ${t - hand.at} min ago (${fmtSigned(hand.scan - hand.value, 0)} K) — IR window dirty or misaligned`);
  }
  if (sv.length) H(M, "SV-CLR-01", { severity: "Alert", evidence: sv.join(" · "), tags: svTags, subs: subsOf(svTags), stateRule: svTags.includes("TMP-CLR-08") });
}
