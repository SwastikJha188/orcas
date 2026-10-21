// A machine's acquisition chain, resolved on the server: its mapped points
// (registry) joined with what the brokers report now (runtime snapshot).

import { getMqttRuntime } from "@backend/mqtt/runtime";
import { getMachinePointRows } from "@backend/services/edge-service";
import { measurementSeverityNow } from "@backend/monitoring/condition";
import type { MachineAcquisition, MachineLivePoint } from "@shared/types/edge";
import type { MqttSnapshot } from "@shared/types/mqtt";

const sep = "\u0000";

export async function getMachineAcquisition(machineId: string): Promise<MachineAcquisition> {
  const [rows, severity] = await Promise.all([getMachinePointRows(machineId), measurementSeverityNow([machineId])]);
  const snap: MqttSnapshot = getMqttRuntime().snapshot();
  const brokers = new Map(snap.brokers.map((b) => [b.brokerId, b]));
  const liveGw = new Map(snap.gateways.map((g) => [`${g.brokerId}${sep}${g.gatewayId}`, g]));
  const measurements = new Map(snap.measurements.map((m) => [`${m.brokerId}${sep}${m.gatewayId}${sep}${m.rackId}${sep}${m.slot}${sep}${m.channel}`, m]));
  const findGw = (code: string, brokerId: string | null) =>
    brokerId ? liveGw.get(`${brokerId}${sep}${code}`) : snap.gateways.find((g) => g.gatewayId === code);

  const gateways = new Map<string, MachineAcquisition["gateways"][number]>();
  const points: MachineLivePoint[] = rows.map(({ point, source, gateway, card, brokerName }) => {
    const g = findGw(gateway.code, gateway.brokerId);
    if (!gateways.has(gateway.id)) {
      const broker = gateway.brokerId ? brokers.get(gateway.brokerId) : undefined;
      const state: MachineAcquisition["gateways"][number]["state"] = !gateway.enabled
        ? "disabled"
        : !g
          ? "waiting"
          : broker && broker.state !== "connected" && g.state === "ONLINE"
            ? "stale"
            : g.state === "ONLINE"
              ? "online"
              : g.state === "STALE"
                ? "stale"
                : "offline";
      gateways.set(gateway.id, { id: gateway.id, code: gateway.code, name: gateway.name, brokerName, state, lastSeenAt: g?.lastSeenAt ?? null, ip: g?.ip || gateway.ipAddress, securityZone: gateway.securityZone ?? null });
    }
    const m = g ? measurements.get(`${g.brokerId}${sep}${g.gatewayId}${sep}${source.code}${sep}${point.slot}${sep}${point.channel}`) : undefined;
    // Tone: the payload's own alarm flags, else the evaluator's verdict on the
    // measurement (measurement_limits with raise / clear persistence), the same
    // severity the machine's sensor and rack pages show.
    const sev = point.measurementId ? severity.get(point.measurementId) : undefined;
    const state: MachineLivePoint["live"]["state"] = !m
      ? "nodata"
      : !m.valid || !m.fresh
        ? "stale"
        : m.dangerActive || sev === "Critical"
          ? "danger"
          : m.alertActive || sev === "Alert"
            ? "alert"
            : "normal";
    return {
      pointId: point.id,
      tag: point.tag ?? point.sourceTag ?? `${source.code}/${point.slot}/${point.channel}`,
      name: point.name,
      signalTag: point.tag,
      sourceTag: point.sourceTag ?? null,
      unit: point.unit,
      gateway: { id: gateway.id, code: gateway.code, name: gateway.name, brokerId: gateway.brokerId, securityZone: gateway.securityZone ?? null },
      source: { id: source.id, code: source.code, name: source.name, kind: source.kind, protocol: source.protocol, securityZone: source.securityZone ?? null },
      card: point.slot,
      cardInfo: card
        ? { type: card.cardType, model: card.model, note: card.notes, channelCount: card.channelCount }
        : { type: null, model: null, note: null, channelCount: null },
      channel: point.channel,
      address: point.address,
      live: {
        state,
        value: m?.value ?? null,
        display: m?.display ?? null,
        unit: m?.unit || point.unit,
        updatedAt: m?.updatedAt ?? null,
        cardType: m?.cardType ?? null,
      },
    };
  });

  return { machineId, serverNow: snap.serverNow, points, gateways: [...gateways.values()] };
}
