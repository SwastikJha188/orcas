/**
 * Feed system PYR-FED-01 (FSL-01 feed silo + KFS-01 kiln feed system) rule evaluation.
 *
 * Reads the minute's shared context (`./context`) and records findings with
 * `H`; rule definitions live in `../rules/fed.ts`. Pattern thresholds are
 * relative to the reference model (D5 Table 9.2 "% from model"), so they hold
 * at any operating point.
 */
import { PYRO_SIGNAL_BY_TAG } from "../signals";
import { fmtSigned, fmtZ, median, slope } from "../shared";
import { bearingHit, slopePerHour, unitRun, type EvalContext } from "./context";

const pctTxt = (f: number) => `${fmtSigned(f * 100, 0)} %`;
const last = (h: number[] | undefined, n: number) => (h && h.length >= n ? h.slice(-n) : null);

export function evalFed(c: EvalContext): void {
  const { s, measured, model, states, feedSp, feedSpSteady, transient, res, z, meanRes, good, H } = c;
  /** Mean residual over `n` samples as a share of the model. */
  const frac = (tag: string, n = 5) => meanRes(tag, n) / Math.max(1e-6, Math.abs(model[tag]));

  let refillPaused = false;

  // ================================================================ FSL-01
  {
    const duty = states["STS-FSL-02"];
    const P = measured["PRS-FSL-01"];
    const I = measured["ELE-FSL-01"];
    const Pm = Math.max(1, model["PRS-FSL-01"]);
    const pOk = good("PRS-FSL-01");
    const iOk = good("ELE-FSL-01");
    // Running evidence against the design values (the model follows the run state, so it cannot judge it).
    const Pd = PYRO_SIGNAL_BY_TAG["PRS-FSL-01"].base;
    const Id = PYRO_SIGNAL_BY_TAG["ELE-FSL-01"].base;
    const pOn = P > 0.3 * Pd;
    const iOn = I > 0.3 * Id;
    const pF = frac("PRS-FSL-01");
    const iF = frac("ELE-FSL-01");
    const blowerTxt = `blower ${duty} · header ${P.toFixed(0)} mbar (${pctTxt(pF)} vs model) · current ${I.toFixed(1)} A (${pctTxt(iF)})`;

    // R-FSL-01 · FP-02 aeration loss: status, or both witnesses say no blower runs.
    const bothOff = pOk && iOk && !pOn && !iOn;
    if (duty !== "DUTY RUN" || bothOff) {
      H("PYR-FED-01", "R-FSL-01", {
        severity: duty === "NOT AVAILABLE" || bothOff || P <= 0.65 * Pd ? "Critical" : "Advisory",
        evidence: `Aeration supply: ${blowerTxt}${bothOff && duty === "DUTY RUN" ? " — current and pressure both say no blower runs" : ""}`,
        tags: ["STS-FSL-02", "PRS-FSL-01", "ELE-FSL-01"],
        subs: ["fsl-aeration"],
        stateRule: true,
        lead: { tag: "PRS-FSL-01", target: P > 0.8 * Pd ? 0.8 * Pd : 0.65 * Pd },
      });
    }

    // R-FSL-04 · FP-02 pad blinding (pressure up, current up) / torn pad (pressure down, current down).
    if (duty === "DUTY RUN" && pOk && iOk && pOn && iOn) {
      const rise = pF >= 0.1 && iF >= 0.3 * pF;
      const drop = pF <= -0.1 && iF <= 0.3 * pF;
      if (rise || drop) {
        H("PYR-FED-01", "R-FSL-04", {
          severity: Math.abs(pF) >= 0.35 ? "Critical" : "Advisory",
          evidence: `${rise ? "Pads blinding" : "Torn pad / header leak"}: header ${P.toFixed(0)} mbar, ${pctTxt(pF)} vs model, with blower current ${pctTxt(iF)} moving with it (duty blower running)`,
          tags: ["PRS-FSL-01", "ELE-FSL-01"],
          subs: ["fsl-aeration"],
          lead: { tag: "PRS-FSL-01", target: Pm * (1 + Math.sign(pF) * (Math.abs(pF) < 0.2 ? 0.2 : 0.35)) },
        });
      }
    }

    // R-FSL-V1 · status vs current vs pressure (D5 Table 5.1.6), judged once the header and current have settled
    // (a header bleeding down after a trip is not a disagreement).
    const steady = (tag: string, d: number) => {
      const h = last(s.hist[tag], 5);
      return !!h && Math.max(...h) - Math.min(...h) < 0.1 * d;
    };
    if (pOk && iOk && steady("PRS-FSL-01", Pd) && steady("ELE-FSL-01", Id)) {
      const sRun = duty === "DUTY RUN" || duty === "STANDBY RUN";
      const votes: Array<[string, boolean]> = [
        ["STS-FSL-02", sRun],
        ["ELE-FSL-01", iOn],
        ["PRS-FSL-01", pOn],
      ];
      const nOn = votes.filter(([, v]) => v).length;
      let odd: string | null = null;
      let why = "";
      if (nOn === 1 || nOn === 2) {
        const majority = nOn === 2;
        odd = votes.find(([, v]) => v !== majority)![0];
        why = `${odd} says ${majority ? "stopped" : "running"} while the other two say ${majority ? "running" : "stopped"}`;
      } else if (nOn === 3 && duty === "DUTY RUN") {
        // Pressure moving without the current. (Current moving without the pressure is the generic
        // physical-neighbour check of the sensor-health screen, R-DQ-02.)
        if (Math.abs(pF) >= 0.15 && Math.abs(iF) < 0.03) {
          odd = "PRS-FSL-01";
          why = `header ${pctTxt(pF)} vs model while the blower current stays ${pctTxt(iF)} — the current does not follow the pressure`;
        }
      }
      if (odd) {
        H("PYR-FED-01", "R-FSL-V1", {
          severity: "Advisory",
          evidence: `${odd} suspect: ${why} (${blowerTxt})`,
          tags: [odd, ...["STS-FSL-02", "ELE-FSL-01", "PRS-FSL-01"].filter((tg) => tg !== odd)],
          subs: ["fsl-aeration"],
        });
      }
    }

    const gate = states["STS-FSL-01"];
    const lvl = measured["LEV-FSL-01"];
    const sl = (slope(s.hist["LEV-FSL-01"], 30) ?? 0) * 60;
    if ((good("LEV-FSL-01") && lvl < 30 && sl < 0) || gate === "CLOSED" || gate === "FAULT") {
      H("PYR-FED-01", "R-FSL-02", {
        severity: lvl <= 15 || gate !== "OPEN" ? "Critical" : "Advisory",
        evidence: `Silo level ${lvl.toFixed(1)} %, ${sl.toFixed(1)} %/h · gate ${gate}`,
        tags: ["LEV-FSL-01", "STS-FSL-01"],
        lead: { tag: "LEV-FSL-01", target: lvl > 25 ? 25 : 15 },
      });
    }

    // Bin refill state, shared by R-FSL-03 (bridging) and R-FSL-V2 (silo radar). The weigh bin is held at its
    // set-point by the silo extraction, so a bin below its set-point or falling means the extraction cannot keep up.
    const binOk = good("LEV-KFS-01", "WGT-KFS-01");
    const k = model["WGT-KFS-01"] / Math.max(1, model["LEV-KFS-01"]);
    const wSp = PYRO_SIGNAL_BY_TAG["WGT-KFS-01"].base;
    const wgt = measured["WGT-KFS-01"];
    const lvlW = measured["LEV-KFS-01"] * k;
    const binSlW = slopePerHour(c, "WGT-KFS-01", 30) ?? 0;
    const binSlL = (slopePerHour(c, "LEV-KFS-01", 30) ?? 0) * k;
    const deficit = binOk && wgt < 0.85 * wSp && lvlW < 0.88 * wSp;
    const falling = binOk && binSlW < -8 && binSlL < -5;
    const binNotRefilled = deficit || falling;
    const binFollows = binOk && Math.abs(wgt - wSp) < 0.08 * wSp && Math.abs(lvlW - wSp) < 0.1 * wSp && Math.abs(binSlW) < 5;
    const binTxt = `feed bin ${wgt.toFixed(1)} t (set-point ${wSp.toFixed(0)} t, ${fmtSigned(binSlW, 1)} t/h), radar ${measured["LEV-KFS-01"].toFixed(1)} % agreeing`;

    // R-FSL-03 · FP-01 silo bridging: gate open, aeration on, meal in the silo, yet the bin is not refilled.
    const aerationOn = duty === "DUTY RUN" || duty === "STANDBY RUN";
    const flat = Math.abs(sl) < 1;
    const notDrawing = sl > -1;
    // Refill pause: the gate closed for the last 15 samples, so the bin-weight loss is the true kiln feed (FP-04 witness).
    const gh = last(s.hist["STS-FSL-01"], 15);
    refillPaused = gate === "CLOSED" && !!gh && gh.every((v) => v === 0);
    if (gate === "OPEN" && aerationOn && good("LEV-FSL-01") && lvl > 15 && binNotRefilled) {
      const low = states["LEV-KFS-03"] === "LOW" || measured["LEV-KFS-01"] <= 30;
      H("PYR-FED-01", "R-FSL-03", {
        severity: low || (flat && deficit) ? "Critical" : "Advisory",
        evidence: `Gate OPEN, aeration ${duty} · silo ${lvl.toFixed(1)} % ${flat ? "flat" : notDrawing ? "not drawing down" : "falling"} (${fmtSigned(sl, 1)} %/h) · ${binTxt} — bin not refilled`,
        tags: ["LEV-FSL-01", "STS-FSL-01", "LEV-KFS-01", "WGT-KFS-01"],
        subs: ["fsl-silo", "kfs-bin"],
        lead: { tag: "WGT-KFS-01", target: wgt > 0.85 * wSp ? 0.85 * wSp : 30 * k },
      });
    }

    // R-FSL-V2 · silo level flat while the bin is refilled normally (D5 Table 5.1.6).
    {
      const sl60 = slopePerHour(c, "LEV-FSL-01", 60);
      const sl60Model = slopePerHour(c, "LEV-FSL-01", 60, true);
      if (sl60 !== null && sl60Model !== null && gate === "OPEN" && good("LEV-FSL-01") && binFollows && Math.abs(sl60Model) >= 3 && Math.abs(sl60) < 0.6) {
        H("PYR-FED-01", "R-FSL-V2", {
          severity: "Advisory",
          evidence: `LEV-FSL-01 suspect: flat (${fmtSigned(sl60, 1)} %/h over 60 min) while extraction and fill should move it ${fmtSigned(sl60Model, 1)} %/h — gate OPEN and the feed bin is held at its set-point (${wgt.toFixed(1)} t)`,
          tags: ["LEV-FSL-01", "STS-FSL-01", "LEV-KFS-01"],
          subs: ["fsl-silo"],
        });
      }
    }

    // R-FSL-V3 · gate travel time (D5 Table 5.1.6): nominal travel inside one sample.
    {
      const h = last(s.hist["STS-FSL-01"], 3);
      if (gate === "TRAVELLING" && h && h.every((v) => v === 0)) {
        let n = 0;
        const hh = s.hist["STS-FSL-01"];
        for (let i = hh.length - 1; i >= 0 && hh[i] === 0; i--) n++;
        H("PYR-FED-01", "R-FSL-V3", {
          severity: "Advisory",
          evidence: `Extraction gate TRAVELLING for ${n} min (nominal travel < 1 min) — limit switch or actuator`,
          tags: ["STS-FSL-01"],
          subs: ["fsl-silo"],
          stateRule: true,
        });
      }
    }
  }

  // ================================================================ KFS-01
  {
    // Feed scatter as an equivalent σ from the median one-minute change of the residual: a surging feed moves every
    // minute, a single step (meter re-zero, set-point change) does not.
    const scatter = (() => {
      const h = s.hist["FLO-KFS-01"];
      const mh = s.modelHist["FLO-KFS-01"];
      if (h.length < 16) return 0;
      const d: number[] = [];
      for (let i = h.length - 15; i < h.length; i++) d.push(Math.abs(h[i] - mh[i] - (h[i - 1] - mh[i - 1])));
      return median(d) / (0.6745 * Math.SQRT2 * Math.sqrt(1 - 0.75));
    })();
    const sNorm = c.sig("FLO-KFS-01");
    const slideZ = z("PRS-KFS-01");
    // SW-KFS-01 · FP-03 air-slide cloth: rate deviation only counts at steady demand (feed set-point unchanged over the window).
    if (feedSpSteady && good("FLO-KFS-01") && (scatter > 3 * sNorm || (good("PRS-KFS-01") && slideZ < -6 && Math.abs(meanRes("FLO-KFS-01", 10)) > 4))) {
      // Bin corroboration: the weigh-bin trend and the level-implied trend should agree (1 % ≈ 1.2 t).
      const binTxt = good("WGT-KFS-01", "LEV-KFS-01")
        ? (() => {
            const w = (slope(s.hist["WGT-KFS-01"], 15) ?? 0) * 60;
            const l = (slope(s.hist["LEV-KFS-01"], 15) ?? 0) * 60 * 1.207;
            return ` · bin weight ${fmtSigned(w, 1)} t/h, level-implied ${fmtSigned(l, 1)} t/h (${Math.abs(w - l) < 3 ? "agree" : "disagree"})`;
          })()
        : " · bin weight / level not valid";
      H("PYR-FED-01", "SW-KFS-01", {
        severity: scatter > 5.5 * sNorm || measured["PRS-KFS-01"] <= 0.73 * Math.max(1, model["PRS-KFS-01"]) ? "Critical" : "Advisory",
        evidence: `Feed scatter ±${scatter.toFixed(1)} t/h (normal ±${sNorm.toFixed(1)}) at a steady ${feedSp.toFixed(0)} t/h set-point · air-slide ${measured["PRS-KFS-01"].toFixed(1)} mbar (${fmtZ(slideZ)})${binTxt}`,
        tags: ["FLO-KFS-01", "PRS-KFS-01", "POS-KFS-01", "WGT-KFS-01", "LEV-KFS-01"],
        lead: { tag: "PRS-KFS-01", target: measured["PRS-KFS-01"] > 38 ? 38 : 30 },
      });
    }

    // R-KFS-02 · FP-06 elevator choke / slip / chain break. Judged only with the drive on (run status).
    {
      const S = measured["SPD-KFS-01"];
      const Sref = Math.max(0.1, model["SPD-KFS-01"]);
      const I = measured["ELE-KFS-01"];
      const Im = Math.max(1, model["ELE-KFS-01"]);
      const sF = res("SPD-KFS-01") / Sref;
      const iF = meanRes("ELE-KFS-01", 3) / Im;
      const driveOn = unitRun(c, "kfs-elevator") === "run";
      const sOk = good("SPD-KFS-01");
      const iOk = good("ELE-KFS-01");
      const stalled = sOk && S < 0.2 * Sref;
      const base = `head shaft ${S.toFixed(2)} rpm (${pctTxt(sF)} vs reference) · motor current ${I.toFixed(0)} A (${pctTxt(I / Im - 1)} vs model)`;
      let hit: { severity: "Advisory" | "Critical"; what: string; stateRule?: boolean } | null = null;
      // Protection trip (run status): the kiln feed stops (D5 FP-06 effect, Table 9.4.5 row 2); the cause is checked before restart.
      if (unitRun(c, "kfs-elevator") === "tripped") hit = { severity: "Critical", what: "Elevator tripped: kiln feed stopped — check the boot for a choke and the chain / belt before restart", stateRule: true };
      else if (driveOn && iOk) {
        if (stalled && I > 0.1 * Im && I < 0.6 * Im) hit = { severity: "Critical", what: "Chain / belt break: speed at zero with the motor at no-load current", stateRule: true };
        else if (stalled && I >= 0.6 * Im && I / Im - 1 >= 0.15) hit = { severity: "Critical", what: "Choke: elevator stalled with the motor loaded", stateRule: true };
        else if (iF >= 0.1 && (!sOk || sF <= 0.01)) hit = { severity: iF >= 0.2 ? "Critical" : "Advisory", what: "Choke: motor current up with the head-shaft speed not higher" };
        else if (sOk && z("SPD-KFS-01") < -6 && z("ELE-KFS-01") > -1) hit = { severity: sF <= -0.1 ? "Critical" : "Advisory", what: "Slip: head-shaft speed below reference while the motor still carries the load" };
      }
      if (hit) {
        H("PYR-FED-01", "R-KFS-02", {
          severity: hit.severity,
          evidence: `${hit.what} · ${base}`,
          tags: ["SPD-KFS-01", "ELE-KFS-01"],
          subs: ["kfs-elevator"],
          stateRule: hit.stateRule,
          lead: hit.what.startsWith("Slip") ? { tag: "SPD-KFS-01", target: S > 0.95 * Sref ? 0.95 * Sref : 0.9 * Sref } : { tag: "ELE-KFS-01", target: I < 1.1 * Im ? 1.1 * Im : 1.2 * Im },
        });
      }
    }

    // R-KFS-03 · FP-05 elevator head-drive degradation.
    bearingHit(c, "PYR-FED-01", "R-KFS-03", [["VIB-KFS-01", "TMP-KFS-01", "kfs-elevator", "Elevator head drive"]], 4.5, 7.1);

    // R-KFS-04 · bin inventory (process indication); the low switch counts only with the radar or the weight agreeing.
    {
      const k = model["WGT-KFS-01"] / Math.max(1, model["LEV-KFS-01"]);
      const wLvl = measured["WGT-KFS-01"] / k;
      const lowSw = states["LEV-KFS-03"] === "LOW" && ((good("LEV-KFS-01") && measured["LEV-KFS-01"] < 30) || (good("WGT-KFS-01") && wLvl < 30));
      if ((good("LEV-KFS-01") && measured["LEV-KFS-01"] < 30) || lowSw) {
        H("PYR-FED-01", "R-KFS-04", {
          severity: lowSw || measured["LEV-KFS-01"] <= 20 ? "Critical" : "Advisory",
          evidence: `Process indication: feed bin ${measured["LEV-KFS-01"].toFixed(1)} % · ${measured["WGT-KFS-01"].toFixed(1)} t · low switch ${states["LEV-KFS-03"]}`,
          tags: ["LEV-KFS-01", "LEV-KFS-03", "WGT-KFS-01"],
        });
      }
    }

    // R-KFS-05 · FP-04 solid-flow meter back-flow / drift.
    {
      const flowing = good("FLO-KFS-01") && measured["FLO-KFS-01"] > 0.2 * Math.max(1, feedSp);
      const p2 = measured["PRS-KFS-02"];
      const k = model["WGT-KFS-01"] / Math.max(1, model["LEV-KFS-01"]);
      let hit: { severity: "Advisory" | "Critical"; evidence: string } | null = null;
      if (flowing && good("PRS-KFS-02") && p2 < 0) {
        hit = { severity: p2 <= -2 ? "Critical" : "Advisory", evidence: `Back-flow: meter interface ${p2.toFixed(1)} mbar (normal ${model["PRS-KFS-02"].toFixed(1)}) — air-slide air through the meter · meter ${measured["FLO-KFS-01"].toFixed(0)} t/h` };
      } else if (flowing && refillPaused && !transient && good("WGT-KFS-01", "LEV-KFS-01")) {
        // Loss-in-weight during a refill pause (gate closed for 15 min): the bin then loses exactly the true kiln feed.
        const liw = -(slopePerHour(c, "WGT-KFS-01", 15) ?? 0);
        const liwL = -(slopePerHour(c, "LEV-KFS-01", 15) ?? 0) * k;
        const meterErr = measured["FLO-KFS-01"] - liw;
        const share = meterErr / Math.max(1, feedSp);
        const levelAgrees = Math.abs(liwL - liw) < Math.max(5, 0.15 * Math.abs(liw));
        if (Math.abs(share) >= 0.05 && levelAgrees) {
          hit = {
            severity: Math.abs(share) >= 0.1 ? "Critical" : "Advisory",
            evidence: `Drift: meter ${measured["FLO-KFS-01"].toFixed(0)} t/h while the bin loses ${liw.toFixed(0)} t/h with the gate closed (meter ${fmtSigned(meterErr, 1)} t/h, ${pctTxt(share)}) · bin level confirms (${liwL.toFixed(0)} t/h)`,
          };
        }
      }
      if (hit) {
        H("PYR-FED-01", "R-KFS-05", {
          ...hit,
          tags: ["PRS-KFS-02", "FLO-KFS-01", "WGT-KFS-01", "LEV-KFS-01"],
          subs: ["kfs-dosing"],
          lead: { tag: "PRS-KFS-02", target: -2 },
        });
      }
    }

    // R-KFS-V1 · bin level vs weight (D5 Table 5.2.6).
    if (good("LEV-KFS-01", "WGT-KFS-01")) {
      const k = model["WGT-KFS-01"] / Math.max(1, model["LEV-KFS-01"]);
      const dl = meanRes("LEV-KFS-01", 5);
      const dw = meanRes("WGT-KFS-01", 5) / k;
      if (Math.abs(dw - dl) > 8) {
        const odd = Math.abs(dw) > Math.abs(dl) ? "WGT-KFS-01" : "LEV-KFS-01";
        H("PYR-FED-01", "R-KFS-V1", {
          severity: "Advisory",
          evidence: `${odd} suspect: radar ${measured["LEV-KFS-01"].toFixed(1)} % (${fmtSigned(dl, 1)} % vs model) vs load cells ${measured["WGT-KFS-01"].toFixed(1)} t = ${(measured["WGT-KFS-01"] / k).toFixed(1)} % (${fmtSigned(dw, 1)} %) — same inventory, ${Math.abs(dw - dl).toFixed(1)} % apart`,
          tags: [odd, odd === "WGT-KFS-01" ? "LEV-KFS-01" : "WGT-KFS-01"],
          subs: ["kfs-bin"],
        });
      }
    }

    // R-KFS-V2 · level switches vs the continuous level at the switch height (D5 Table 5.2.6).
    {
      const k = model["WGT-KFS-01"] / Math.max(1, model["LEV-KFS-01"]);
      const radar = good("LEV-KFS-01") ? measured["LEV-KFS-01"] : null;
      const weight = good("WGT-KFS-01") ? measured["WGT-KFS-01"] / k : null;
      const witnesses = [radar, weight].filter((v): v is number => v !== null);
      const odd: string[] = [];
      // Both instruments valid: the engine derives the switches from the radar today, so a radar fault alone is not a switch fault.
      if (witnesses.length === 2) {
        const all = (f: (v: number) => boolean) => witnesses.every(f);
        if (states["LEV-KFS-02"] === "HIGH" && all((v) => v < 85)) odd.push("LEV-KFS-02 HIGH");
        if (states["LEV-KFS-02"] !== "HIGH" && all((v) => v > 91)) odd.push("LEV-KFS-02 CLEAR");
        if (states["LEV-KFS-03"] === "LOW" && all((v) => v > 25)) odd.push("LEV-KFS-03 LOW");
        if (states["LEV-KFS-03"] !== "LOW" && all((v) => v < 19)) odd.push("LEV-KFS-03 CLEAR");
      }
      if (odd.length) {
        H("PYR-FED-01", "R-KFS-V2", {
          severity: "Advisory",
          evidence: `Switch suspect: ${odd.join(", ")} while the radar reads ${radar === null ? "—" : `${radar.toFixed(1)} %`} and the load cells ${weight === null ? "—" : `${weight.toFixed(1)} %`} (switches at 88 % / 22 %)`,
          tags: [...odd.map((o) => o.split(" ")[0]), "LEV-KFS-01", "WGT-KFS-01"],
          subs: ["kfs-bin"],
        });
      }
    }

    // R-KFS-V3 · air-slide pressures plausible with the flow and the blower (D5 Table 5.2.6: react to blower
    // start / stop, zero with flow stopped). Readings of a stopped unit (≈ 0) are the sensor-health screen's (R-DQ-02).
    {
      const odd: string[] = [];
      const fBase = PYRO_SIGNAL_BY_TAG["FLO-KFS-01"].base;
      const flo = last(s.hist["FLO-KFS-01"], 5);
      if (flo && good("FLO-KFS-01", "PRS-KFS-02") && flo.every((v) => v < 0.05 * fBase) && measured["PRS-KFS-02"] > 2) odd.push(`PRS-KFS-02 ${measured["PRS-KFS-02"].toFixed(1)} mbar with the feed stopped`);
      if (good("PRS-KFS-01") && unitRun(c, "kfs-airslide-blower") === "run" && c.running["PYR-FED-01"] && measured["PRS-KFS-01"] < 0.2 * Math.max(1, model["PRS-KFS-01"]))
        odd.push(`PRS-KFS-01 ${measured["PRS-KFS-01"].toFixed(1)} mbar with the air-slide blower running`);
      if (odd.length) {
        H("PYR-FED-01", "R-KFS-V3", {
          severity: "Advisory",
          evidence: `Run-state check: ${odd.join(" · ")}`,
          tags: odd.map((o) => o.split(" ")[0]),
          subs: ["kfs-dosing", "kfs-elevator"],
        });
      }
    }
  }
}
