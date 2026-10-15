"use client";

import type { CabinetChannel, ChannelStatus, MachineRackInfo } from "./rack-data";
import type { KilnSealsSensorData } from "./kiln-seals-types";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import type { MachineAcquisition } from "@/types/edge";

/* ------------------------------------------------------------------
   Live layers over the cabinet model. Structure always comes from
   /api/rack-units; only value, status and the channel LED change here.
   Precedence matches the Acquisition view: an MQTT reading wins, the
   live simulation (kiln fleet or pyro line) fills channels MQTT has nothing for.
   ------------------------------------------------------------------ */

type Override = Pick<CabinetChannel, "currentValue"> & Partial<Pick<CabinetChannel, "status" | "ledOk" | "quality">>;

function overlay(racks: MachineRackInfo[], pick: (ch: CabinetChannel) => Override | undefined): MachineRackInfo[] {
  return racks.map((rack) => ({
    ...rack,
    modules: rack.modules.map((m) => ({
      ...m,
      channels: m.channels.map((ch) => {
        const o = pick(ch);
        return o ? { ...ch, ...o } : ch;
      }),
    })),
  }));
}

/**
 * The full live frame of any live machine (kiln fleet or pyro line), by
 * channel tag: value, process status, and the signal quality the
 * acquisition chain flags (R-DQ-01): the LED goes dark for invalid / suspect
 * channels only — a process alarm is not a hardware fault.
 */
export function applyRackLive(racks: MachineRackInfo[], frame?: SimFrame | null): MachineRackInfo[] {
  if (!frame) return racks;
  return overlay(racks, (ch) => {
    const sig = frame.signals[ch.tag];
    if (!sig) return undefined;
    return { currentValue: sig.display, status: sig.status, ledOk: sig.quality === "Good", quality: sig.quality };
  });
}

/** Seals-only simulation (older demo pages, kiln-seal fleet only): the channels it models. */
export function applyRackSimulation(racks: MachineRackInfo[], d?: KilnSealsSensorData): MachineRackInfo[] {
  if (!d) return racks;
  const signed = (v: number, digits: number) => (v > 0 ? `+${v.toFixed(digits)}` : v.toFixed(digits));
  const by = (v: number, adv: number, crit: number): ChannelStatus => (v > crit ? "Critical" : v > adv ? "Advisory" : "Normal");
  const values: Record<string, Override> = {
    "POS-KLN-01": { currentValue: signed(d.lvdtPosition, 1), status: by(Math.abs(d.lvdtPosition), 30, 40) },
    "GAS-KLN-01": { currentValue: d.gasO2.toFixed(2), status: by(d.gasO2, 3.5, 5) },
    "GAS-KLN-02": { currentValue: `${d.gasCO}`, status: d.gasCO > 1000 ? "Advisory" : "Normal" },
    "TMP-KLN-13": { currentValue: `${d.inletGasTemp}`, status: d.inletGasTemp < 900 ? "Critical" : d.inletGasTemp < 950 ? "Advisory" : "Normal" },
    "PRS-KLN-01": { currentValue: d.inletDraft.toFixed(2), status: by(d.inletDraft, -1.5, -0.5) },
    "STS-KLN-06": { currentValue: d.gasAnalyserStatus, status: d.gasAnalyserStatus === "OK" ? "Normal" : "Advisory", ledOk: d.gasAnalyserStatus === "OK" },
    "FLO-KLN-01": { currentValue: `${d.kilnFeed}`, status: by(d.kilnFeed, 355, 380) },
    "FLO-KLN-02": { currentValue: d.kilnFuel.toFixed(2) },
    "PRS-KLN-03": { currentValue: signed(d.hoodPressure, 2), status: by(d.hoodPressure, 0, 0.3) },
    "SPD-KLN-01": { currentValue: d.kilnSpeed.toFixed(2) },
    "POS-KLN-02": { currentValue: d.travelLimitSwitch, status: d.travelLimitSwitch === "LIMIT" ? "Critical" : "Normal", ledOk: d.travelLimitSwitch === "CLEAR" },
    "STS-KLN-08": { currentValue: d.scannerCoverage.toFixed(1), status: d.scannerCoverage < 90 ? "Advisory" : "Normal" },
    "STS-KLN-10": { currentValue: d.outletFanStatus, status: d.outletFanStatus === "STOPPED" ? "Critical" : "Normal", ledOk: d.outletFanStatus === "RUNNING" },
  };
  return overlay(racks, (ch) => values[ch.tag]);
}

const fmt = (v: number) => {
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 100 ? 1 : 2);
};

/** MQTT readings from the acquisition chain (GET /api/edge/machines/<id>), by tag. */
export function applyRackMqtt(racks: MachineRackInfo[], acq?: MachineAcquisition | null): MachineRackInfo[] {
  if (!acq) return racks;
  const live = new Map(acq.points.filter((p) => p.live.state !== "nodata").map((p) => [p.tag, p.live]));
  if (live.size === 0) return racks;
  return overlay(racks, (ch) => {
    const l = live.get(ch.tag);
    if (!l) return undefined;
    const status: ChannelStatus = l.state === "danger" ? "Critical" : l.state === "alert" ? "Advisory" : "Normal";
    return {
      currentValue: l.value !== null ? fmt(l.value) : l.display ?? "—",
      status,
      ledOk: l.state !== "stale",
      ...(l.state === "stale" ? { quality: "Stale" } : {}),
    };
  });
}
