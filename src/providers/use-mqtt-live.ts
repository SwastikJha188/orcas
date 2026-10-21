"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MqttCommandResult, MqttSnapshot, MqttTick, MqttTrafficEntry } from "@shared/types/mqtt";
import type { ApiResponse } from "@shared/types/api";

const TRAFFIC_LIMIT = 300;
/** Points kept per reading for its trend line (about a minute at 2 Hz). */
const HISTORY_LIMIT = 120;

export type StreamState = "connecting" | "open" | "retrying";

/**
 * Subscribes to /api/mqtt/stream. EventSource reconnects on its own (the server
 * sends `retry: 3000`); every tick carries the full state, so a reconnect needs
 * no merge and cannot drift.
 */
export function useMqttLive({ paused = false }: { paused?: boolean } = {}) {
  const [snapshot, setSnapshot] = useState<MqttSnapshot | null>(null);
  const [traffic, setTraffic] = useState<MqttTrafficEntry[]>([]);
  const [stream, setStream] = useState<StreamState>("connecting");
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const source = new EventSource("/api/mqtt/stream");
    let lastId = 0;
    const seenAt: Record<string, string> = {};
    const series: Record<string, number[]> = {};
    source.onopen = () => setStream("open");
    source.onerror = () => setStream(source.readyState === EventSource.CLOSED ? "retrying" : "connecting");
    source.addEventListener("tick", (e) => {
      let tick: MqttTick;
      try {
        tick = JSON.parse((e as MessageEvent<string>).data);
      } catch {
        return;
      }
      setSnapshot(tick.snapshot);
      // One point per new sample, not per tick: ticks also fire on sweeps.
      let grew = false;
      for (const m of tick.snapshot.measurements) {
        if (m.value === null || seenAt[m.key] === m.updatedAt) continue;
        seenAt[m.key] = m.updatedAt;
        series[m.key] = [...(series[m.key] ?? []), m.value].slice(-HISTORY_LIMIT);
        grew = true;
      }
      if (grew) setHistory({ ...series });
      // A reconnect replays the server's recent traffic; ids keep it from doubling.
      const incoming = tick.traffic.filter((t) => t.id > lastId);
      if (incoming.length === 0) return;
      lastId = incoming[incoming.length - 1].id;
      if (pausedRef.current) return;
      setTraffic((prev) => [...incoming.reverse(), ...prev].slice(0, TRAFFIC_LIMIT));
    });
    return () => source.close();
  }, []);

  const clearTraffic = useCallback(() => setTraffic([]), []);
  return { snapshot, traffic, history, stream, clearTraffic };
}

/** `brokerId` pins the broker; without it the server uses the one that has seen this gateway / rack. */
export async function sendMqttCommand(gatewayId: string, rackId: string, command: string, brokerId?: string): Promise<MqttCommandResult> {
  const res = await fetch("/api/mqtt/command", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ gatewayId, rackId, command, ...(brokerId ? { brokerId } : {}) }),
  });
  const body = (await res.json().catch(() => null)) as ApiResponse<MqttCommandResult> | null;
  if (!body) throw new Error(`Command failed (${res.status}).`);
  if ("error" in body) throw new Error(body.error.message);
  return body.data;
}
