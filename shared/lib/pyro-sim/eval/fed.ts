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
/** Six motorised silo outlet gates (opening %, OSW-PE-SNL-PYR-01 Rev. 02; manual and pneumatic gates are not monitored). */
const GATES = [1, 2, 3, 4, 5, 6].map((n) => `POS-FSL-0${n}`);
/** A gate is open above this opening (%) and closed below GATE_CLOSED. */
const GATE_OPEN = 5;
const GATE_CLOSED = 2;
/** The kiln feed bin rests on three load cells (Rev. 02 HP-03: WGT-KFS-02/03/04; WGT-KFS-01 is their calculated sum). */
const CELLS = ["WGT-KFS-02", "WGT-KFS-03", "WGT-KFS-04"];
/** Two solid-flow meters in parallel (slides A and B) with their pressure taps; kiln feed = A + B. */
const METERS: Array<[flow: string, prs: string, name: string]> = [
  ["FLO-KFS-01", "PRS-KFS-02", "SFM A"],
  ["FLO-KFS-02", "PRS-KFS-06", "SFM B"],
];
/** SFM tap pressure above its model that is back-flow (mbar, Rev. 02): beyond the ± 1 mbar nominal band Alert, at the +3 mbar H set-point Critical. */
const SFM_BACKFLOW = 1.0;
const SFM_BACKFLOW_CRIT = 3.0;
/** A stopped meter's tap reads ≈ 0: outside the ± 1 mbar nominal band it is suspect. */
const SFM_STOPPED_MAX = 1.0;
/** Bin tonnes per % of capacity. */
const BIN_T_PER_PCT = 1.207;

export function evalFed(c: EvalContext): void {
  const { s, measured, model, states, feedSp, feedSpSteady, transient, res, z, meanRes, good, H } = c;
  /** Mean residual over `n` samples as a share of the model. */
  const frac = (tag: string, n = 5) => meanRes(tag, n) / Math.max(1e-6, Math.abs(model[tag]));

  let refillPaused = false;

  // ================================================================ FSL-01
  {
    // Rev. 02 has no blower status point (STS-FSL-02 removed): which blower carries the header comes from the MCC run feedback.
    const duty = unitRun(c, "fsl-blower-duty") === "run" ? "DUTY RUN" : unitRun(c, "fsl-blower-standby") === "run" ? "STANDBY RUN" : "NOT AVAILABLE";
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
    const blowerTxt = `blower ${duty} (MCC run feedback) · header ${P.toFixed(0)} mbar (${pctTxt(pF)} vs model) · current ${I.toFixed(1)} % FLA (${pctTxt(iF)})`;

    // R-FSL-01 · FP-02 aeration loss: status, or both witnesses say no blower runs.
    const bothOff = pOk && iOk && !pOn && !iOn;
    if (duty !== "DUTY RUN" || bothOff) {
      H("PYR-FED-01", "R-FSL-01", {
        severity: duty === "NOT AVAILABLE" || bothOff || P <= 0.65 * Pd ? "Critical" : "Alert",
        evidence: `Aeration supply: ${blowerTxt}${bothOff && duty === "DUTY RUN" ? " — current and pressure both say no blower runs" : ""}`,
        tags: ["PRS-FSL-01", "ELE-FSL-01"],
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
          severity: Math.abs(pF) >= 0.35 ? "Critical" : "Alert",
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
        ["MCC run feedback", sRun],
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
          severity: "Alert",
          evidence: `${odd} suspect: ${why} (${blowerTxt})`,
          tags: [...(odd.startsWith("MCC") ? [] : [odd]), ...["ELE-FSL-01", "PRS-FSL-01"].filter((tg) => tg !== odd)],
          subs: ["fsl-aeration"],
        });
      }
    }

    // The six motorised gates as one extraction state from their openings: all open, all closed, or part open.
    const gs = GATES.map((g) => measured[g]);
    const gate = gs.every((x) => x > GATE_OPEN) ? "OPEN" : gs.every((x) => x < GATE_CLOSED) ? "CLOSED" : "PART OPEN";
    const openN = gs.filter((x) => x > GATE_OPEN).length;
    const gateTxt = `${gate} (${openN} of 6 open, mean ${(gs.reduce((a, b) => a + b, 0) / 6).toFixed(0)} %)`;
    const lvl = measured["LEV-FSL-01"];
    const sl = (slope(s.hist["LEV-FSL-01"], 30) ?? 0) * 60;
    const feeding = measured["FLO-KFS-01"] + measured["FLO-KFS-02"] > 0.2 * Math.max(1, feedSp);
    if ((good("LEV-FSL-01") && lvl < 30 && sl < 0) || (gate === "CLOSED" && feeding)) {
      H("PYR-FED-01", "R-FSL-02", {
        severity: lvl <= 15 || gate === "CLOSED" ? "Critical" : "Alert",
        evidence: `Silo level ${lvl.toFixed(1)} %, ${sl.toFixed(1)} %/h · outlet gates ${gateTxt}`,
        tags: ["LEV-FSL-01", ...GATES],
        lead: { tag: "LEV-FSL-01", target: lvl > 25 ? 25 : 15 },
      });
    }

    // Bin refill state, shared by R-FSL-03 (bridging) and R-FSL-V2 (silo radar). The weigh bin is held at its
    // set-point by the silo extraction, so a bin below its set-point or falling means the extraction cannot keep up.
    const binOk = good(...CELLS);
    const wSp = CELLS.reduce((acc, tg) => acc + PYRO_SIGNAL_BY_TAG[tg].base, 0);
    const wgt = CELLS.reduce((acc, tg) => acc + measured[tg], 0);
    const binSlW = CELLS.reduce((acc, tg) => acc + (slopePerHour(c, tg, 30) ?? 0), 0);
    // Every cell must carry its share of the trend: one cell alone moving is a load-cell fault (R-KFS-V1), not the bin.
    const cellsAgree = CELLS.every((tg) => Math.abs((slopePerHour(c, tg, 30) ?? 0) - binSlW / 3) < Math.max(2, 0.3 * Math.abs(binSlW / 3)));
    const deficit = binOk && wgt < 0.85 * wSp;
    const falling = binOk && binSlW < -8 && cellsAgree;
    const binNotRefilled = deficit || falling;
    const binFollows = binOk && Math.abs(wgt - wSp) < 0.08 * wSp && Math.abs(binSlW) < 5;
    const binTxt = `feed bin ${wgt.toFixed(1)} t on 3 load cells (set-point ${wSp.toFixed(0)} t, ${fmtSigned(binSlW, 1)} t/h${cellsAgree ? ", cells agreeing" : ""})`;

    // R-FSL-03 · FP-01 silo bridging: gate open, aeration on, meal in the silo, yet the bin is not refilled.
    const aerationOn = duty === "DUTY RUN" || duty === "STANDBY RUN";
    const flat = Math.abs(sl) < 1;
    const notDrawing = sl > -1;
    // Refill pause: the gate closed for the last 15 samples, so the bin-weight loss is the true kiln feed (FP-04 witness).
    refillPaused = gate === "CLOSED" && GATES.every((g) => last(s.hist[g], 15)?.every((v) => v < GATE_CLOSED) ?? false);
    if (gate === "OPEN" && aerationOn && good("LEV-FSL-01") && lvl > 15 && binNotRefilled) {
      const low = wgt / BIN_T_PER_PCT <= 30;
      H("PYR-FED-01", "R-FSL-03", {
        severity: low || (flat && deficit) ? "Critical" : "Alert",
        evidence: `Gates ${gateTxt}, aeration ${duty} · silo ${lvl.toFixed(1)} % ${flat ? "flat" : notDrawing ? "not drawing down" : "falling"} (${fmtSigned(sl, 1)} %/h) · ${binTxt} — bin not refilled`,
        tags: ["LEV-FSL-01", ...GATES, ...CELLS],
        subs: ["fsl-silo", "kfs-bin"],
        lead: { tag: "WGT-KFS-01", target: (wgt > 0.85 * wSp ? 0.85 * wSp : 30 * BIN_T_PER_PCT) / BIN_T_PER_PCT },
      });
    }

    // R-FSL-V2 · silo level flat while the bin is refilled normally (D5 Table 5.1.6).
    {
      const sl60 = slopePerHour(c, "LEV-FSL-01", 60);
      const sl60Model = slopePerHour(c, "LEV-FSL-01", 60, true);
      if (sl60 !== null && sl60Model !== null && gate === "OPEN" && good("LEV-FSL-01") && binFollows && Math.abs(sl60Model) >= 3 && Math.abs(sl60) < 0.6) {
        H("PYR-FED-01", "R-FSL-V2", {
          severity: "Alert",
          evidence: `LEV-FSL-01 suspect: flat (${fmtSigned(sl60, 1)} %/h over 60 min) while extraction and fill should move it ${fmtSigned(sl60Model, 1)} %/h — gates open and the feed bin is held at its set-point (${wgt.toFixed(1)} t)`,
          tags: ["LEV-FSL-01", ...GATES, ...CELLS],
          subs: ["fsl-silo"],
        });
      }
    }

    // R-FSL-V3 · gate position against its command (D5 Table 5.1.6; Rev. 02 ± 5 % vs command): one gate off the
    // extraction controller's command for 3 samples while the other gates follow it.
    {
      const off = (g: string) => {
        const h = last(s.hist[g], 3);
        const mh = last(s.modelHist[g], 3);
        return h && mh ? Math.min(...h.map((v, i) => Math.abs(v - mh[i]))) : 0;
      };
      const devs = GATES.map((g) => ({ g, d: off(g), r: res(g) }));
      const bad = devs.filter((x) => x.d > 5 && good(x.g));
      const followers = devs.filter((x) => x.d <= 2).length;
      if (bad.length && bad.length <= 2 && followers >= 4) {
        H("PYR-FED-01", "R-FSL-V3", {
          severity: "Alert",
          evidence: `${bad.map(({ g, r }) => `Gate ${g.slice(-1)} ${measured[g].toFixed(0)} % vs command ${model[g].toFixed(0)} % (${fmtSigned(r, 1)} %${Math.abs(r) >= 10 ? ", beyond ± 10 %" : ""})`).join(" · ")} while ${followers} gates follow the command — actuator or position feedback`,
          tags: bad.map(({ g }) => g),
          subs: ["fsl-silo"],
        });
      }
    }
  }

  // ================================================================ KFS-01
  {
    // Feed scatter as an equivalent σ from the median one-minute change of the residual: a surging feed moves every
    // minute, a single step (meter re-zero, set-point change) does not.
    // Kiln feed = SFM A + B: the scatter of the summed residual.
    const scatter = (() => {
      const [hA, hB] = METERS.map(([f]) => s.hist[f]);
      const [mA, mB] = METERS.map(([f]) => s.modelHist[f]);
      const n = Math.min(hA.length, hB.length);
      if (n < 16) return 0;
      const r = (i: number) => hA[hA.length - n + i] + hB[hB.length - n + i] - mA[mA.length - n + i] - mB[mB.length - n + i];
      const d: number[] = [];
      for (let i = n - 15; i < n; i++) d.push(Math.abs(r(i) - r(i - 1)));
      return median(d) / (0.6745 * Math.SQRT2 * Math.sqrt(1 - 0.75));
    })();
    const sNorm = Math.hypot(c.sig("FLO-KFS-01"), c.sig("FLO-KFS-02"));
    // The lower of the two bin air-slide pressures (slide A PRS-KFS-01, slide B PRS-KFS-03).
    const slideTag = z("PRS-KFS-03") < z("PRS-KFS-01") ? "PRS-KFS-03" : "PRS-KFS-01";
    const slideZ = z(slideTag);
    const feedRes10 = meanRes("FLO-KFS-01", 10) + meanRes("FLO-KFS-02", 10);
    // SW-KFS-01 · FP-03 air-slide cloth: rate deviation only counts at steady demand (feed set-point unchanged over the window).
    if (feedSpSteady && good("FLO-KFS-01", "FLO-KFS-02") && (scatter > 3 * sNorm || (good(slideTag) && slideZ < -6 && Math.abs(feedRes10) > 4))) {
      // Bin corroboration: the three load cells' trend (the bin has no level sensor).
      const binTxt = good(...CELLS)
        ? (() => {
            const w = CELLS.reduce((acc, tg) => acc + (slope(s.hist[tg], 15) ?? 0) * 60, 0);
            return ` · bin weight ${fmtSigned(w, 1)} t/h (3 load cells)`;
          })()
        : " · bin load cells not valid";
      H("PYR-FED-01", "SW-KFS-01", {
        severity: scatter > 5.5 * sNorm || measured[slideTag] <= 0.73 * Math.max(1, model[slideTag]) ? "Critical" : "Alert",
        evidence: `Feed scatter ±${scatter.toFixed(1)} t/h (normal ±${sNorm.toFixed(1)}) at a steady ${feedSp.toFixed(0)} t/h set-point (SFM A + B) · air slide ${slideTag === "PRS-KFS-01" ? "A" : "B"} ${measured[slideTag].toFixed(1)} mbar (${fmtZ(slideZ)})${binTxt}`,
        tags: ["FLO-KFS-01", "FLO-KFS-02", slideTag, ...CELLS],
        lead: { tag: slideTag, target: measured[slideTag] > 20 ? 20 : 10 },
      });
    }

    // R-KFS-02 · FP-06 elevator choke / chain break. Judged only with the drive on (run status). Rev. 02 HP-05: the
    // elevator has a zero-speed switch (no rpm), so belt slip is not measured.
    {
      const sw = states["SPD-KFS-01"];
      const I = measured["ELE-KFS-01"];
      const Im = Math.max(1, model["ELE-KFS-01"]);
      const iF = meanRes("ELE-KFS-01", 3) / Im;
      const driveOn = unitRun(c, "kfs-elevator") === "run";
      const sOk = good("SPD-KFS-01");
      const iOk = good("ELE-KFS-01");
      const stalled = sOk && sw === "STOPPED WHILE RUNNING";
      const base = `zero-speed switch ${sw} · motor current ${I.toFixed(0)} % FLA (${pctTxt(I / Im - 1)} vs model)`;
      let hit: { severity: "Alert" | "Critical"; what: string; stateRule?: boolean } | null = null;
      // Protection trip (run status): the kiln feed stops (D5 FP-06 effect, Table 9.4.5 row 2); the cause is checked before restart.
      if (unitRun(c, "kfs-elevator") === "tripped") hit = { severity: "Critical", what: "Elevator tripped: kiln feed stopped — check the boot for a choke and the chain / belt before restart", stateRule: true };
      else if (driveOn && iOk) {
        if (stalled && I > 0.1 * Im && I < 0.6 * Im) hit = { severity: "Critical", what: "Chain / belt break: shaft stopped with the motor at no-load current", stateRule: true };
        else if (stalled && I / Im - 1 >= 0.15) hit = { severity: "Critical", what: "Choke: elevator stalled with the motor loaded", stateRule: true };
        else if (iF >= 0.1 && sw === "RUNNING") hit = { severity: iF >= 0.2 ? "Critical" : "Alert", what: "Choke: motor current up over the load model" };
      }
      if (hit) {
        H("PYR-FED-01", "R-KFS-02", {
          severity: hit.severity,
          evidence: `${hit.what} · ${base}`,
          tags: ["SPD-KFS-01", "ELE-KFS-01"],
          subs: ["kfs-elevator"],
          stateRule: hit.stateRule,
          lead: { tag: "ELE-KFS-01", target: I < 1.1 * Im ? 1.1 * Im : 1.2 * Im },
        });
      }
    }

    // R-KFS-03 · FP-05 elevator head-drive degradation.
    bearingHit(
      c,
      "PYR-FED-01",
      "R-KFS-03",
      [
        ["VIB-KFS-01", "TMP-KFS-01", "kfs-elevator", "Elevator head drive DE"],
        ["VIB-KFS-04", "TMP-KFS-03", "kfs-elevator", "Elevator head drive NDE"],
      ],
      4.5,
      7.1,
    );

    // R-KFS-04 · bin inventory (process indication); the low switch counts only with the radar or the weight agreeing.
    {
      // Inventory from the three load cells (no level sensor); a flagged cell is replaced by the mean of the others.
      const ok = CELLS.filter((tg) => good(tg));
      if (ok.length >= 2) {
        const binT = (ok.reduce((acc, tg) => acc + measured[tg], 0) / ok.length) * 3;
        const pct = binT / BIN_T_PER_PCT;
        if (pct < 30) {
          H("PYR-FED-01", "R-KFS-04", {
            severity: pct <= 20 ? "Critical" : "Alert",
            evidence: `Process indication: feed bin ${binT.toFixed(1)} t ≈ ${pct.toFixed(0)} % of capacity (${ok.length} of 3 load cells valid)`,
            tags: CELLS,
          });
        }
      }
    }

    // R-KFS-05 · FP-04 solid-flow meter back-flow / drift.
    {
      const feedAB = measured["FLO-KFS-01"] + measured["FLO-KFS-02"];
      const flowing = good("FLO-KFS-01", "FLO-KFS-02") && feedAB > 0.2 * Math.max(1, feedSp);
      let hit: { severity: "Alert" | "Critical"; evidence: string; tags: string[]; lead: string } | null = null;
      // Back-flow at either meter: its pressure tap (P2 / P3) pulled below its feed-following model by more than the
      // nominal band (OSW-PE-SNL-PYR-01 Rev. 02: −1 … +1 mbar, back-flow reads high), Critical at the +3 mbar H set-point.
      const back = METERS.filter(([f, p]) => good(f, p) && measured[f] > 0.2 * Math.max(1, feedSp / 2) && measured[p] - model[p] > SFM_BACKFLOW);
      if (back.length) {
        const worst = Math.max(...back.map(([, p]) => measured[p] - model[p]));
        hit = {
          severity: worst >= SFM_BACKFLOW_CRIT ? "Critical" : "Alert",
          evidence: `Back-flow: ${back.map(([f, p, n]) => `${n} pressure ${measured[p].toFixed(2)} mbar (normal ${model[p].toFixed(2)}) at ${measured[f].toFixed(0)} t/h`).join(" · ")} — air-slide air through the meter`,
          tags: back.flatMap(([f, p]) => [p, f]),
          lead: back[0][1],
        };
      } else if (flowing && refillPaused && !transient && good(...CELLS)) {
        // Loss-in-weight during a refill pause (gates closed for 15 min): the bin then loses exactly the true kiln feed.
        const cellSl = CELLS.map((tg) => -(slopePerHour(c, tg, 15) ?? 0));
        const liw = cellSl.reduce((a, b) => a + b, 0);
        const meterErr = feedAB - liw;
        const share = meterErr / Math.max(1, feedSp);
        // The three cells must share the loss (one cell alone drifting is R-KFS-V1).
        const cellsAgree = cellSl.every((v) => Math.abs(v - liw / 3) < Math.max(2, 0.15 * Math.abs(liw / 3)));
        if (Math.abs(share) >= 0.05 && cellsAgree) {
          hit = {
            severity: Math.abs(share) >= 0.1 ? "Critical" : "Alert",
            evidence: `Drift: SFM A + B read ${feedAB.toFixed(0)} t/h while the bin loses ${liw.toFixed(0)} t/h with the gates closed (meters ${fmtSigned(meterErr, 1)} t/h, ${pctTxt(share)}) · all three load cells agree`,
            tags: ["FLO-KFS-01", "FLO-KFS-02", "PRS-KFS-02", "PRS-KFS-06", ...CELLS],
            lead: "PRS-KFS-02",
          };
        }
      }
      if (hit) {
        H("PYR-FED-01", "R-KFS-05", {
          severity: hit.severity,
          evidence: hit.evidence,
          tags: hit.tags,
          subs: ["kfs-sfm"],
          lead: { tag: hit.lead, target: SFM_BACKFLOW_CRIT },
        });
      }
    }

    // R-KFS-V1 · the three load cells carry fixed shares of one bin (D5 Table 5.2.6 "independent witnesses agree"):
    // a cell more than 8 % off its model while the other two agree within 3 % is suspect.
    if (good(...CELLS)) {
      const dev = CELLS.map((tg) => meanRes(tg, 5) / Math.max(1, model[tg]));
      const i = dev.reduce((bi, d, k) => (Math.abs(d) > Math.abs(dev[bi]) ? k : bi), 0);
      const others = dev.filter((_, k) => k !== i);
      // Absolute floor (1.5 t per cell): a nearly empty bin makes small offsets large percentages.
      const off = Math.abs(meanRes(CELLS[i], 5));
      if (Math.abs(dev[i]) > 0.08 && off > 1.5 && others.every((d) => Math.abs(d) < 0.03)) {
        const odd = CELLS[i];
        H("PYR-FED-01", "R-KFS-V1", {
          severity: "Alert",
          evidence: `${odd} suspect: load cell ${i + 1} ${measured[odd].toFixed(1)} t (${pctTxt(dev[i])} vs model) while cells ${others.length === 2 ? CELLS.filter((_, k) => k !== i).map((t) => t.slice(-1)).join(" and ") : ""} agree (${others.map(pctTxt).join(", ")}) — same bin, fixed shares`,
          tags: [odd, ...CELLS.filter((tg) => tg !== odd)],
          subs: ["kfs-bin"],
        });
      }
    }

    // R-KFS-V3 · air-slide pressures plausible with the flow and the blower (D5 Table 5.2.6: react to blower
    // start / stop, zero with flow stopped). Readings of a stopped unit (≈ 0) are the sensor-health screen's (R-DQ-02).
    {
      const odd: string[] = [];
      for (const [f, p, n] of METERS) {
        const fBase = PYRO_SIGNAL_BY_TAG[f].base;
        const flo = last(s.hist[f], 5);
        if (flo && good(f, p) && flo.every((v) => v < 0.05 * fBase) && measured[p] > SFM_STOPPED_MAX) odd.push(`${p} ${measured[p].toFixed(1)} mbar with ${n} stopped`);
      }
      const SLIDES: Array<[string, string, string]> = [
        ["PRS-KFS-01", "kfs-slide-blower-a", "air slide A"],
        ["PRS-KFS-03", "kfs-slide-blower-b", "air slide B"],
        ["PRS-KFS-04", "kfs-common-blower", "common air slide"],
        ["PRS-KFS-07", "kfs-top-blower", "preheater-top air slide"],
      ];
      for (const [p, unit, name] of SLIDES)
        if (good(p) && unitRun(c, unit) === "run" && c.running["PYR-FED-01"] && measured[p] < 0.2 * Math.max(1, model[p])) odd.push(`${p} ${measured[p].toFixed(1)} mbar with the ${name} blower running`);
      if (odd.length) {
        H("PYR-FED-01", "R-KFS-V3", {
          severity: "Alert",
          evidence: `Run-state check: ${odd.join(" · ")}`,
          tags: odd.map((o) => o.split(" ")[0]),
          subs: ["kfs-dosing", "kfs-sfm"],
        });
      }
    }
  }
}
