"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useMqttLive, type StreamState } from "@/providers/use-mqtt-live";
import type { ApiResponse } from "@/types/api";
import type { BrokerTestResult, EdgeCommissionInput, EdgeCommissionResult, EdgeEntityByKind, EdgeKind, EdgeMapInput, EdgeMapResult, EdgeRegistry, RawSample } from "@/types/edge";
import type { MqttSnapshot, MqttTrafficEntry } from "@/types/mqtt";

/* ==========================================================================
   Devices data: the edge registry (what is configured, from /api/edge) and
   the live MQTT fleet (what the brokers report, from /api/mqtt/stream).
   Mounted once by the Devices view so the hierarchy and MQTT pages share one
   fetch and one event stream.
   ========================================================================== */

export interface EdgeContextValue {
  registry: EdgeRegistry | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Each write resolves with the stored entity, or rejects with the server's message. */
  create: <K extends EdgeKind>(kind: K, input: Record<string, unknown>) => Promise<EdgeEntityByKind[K]>;
  update: <K extends EdgeKind>(kind: K, id: string, patch: Record<string, unknown>) => Promise<EdgeEntityByKind[K]>;
  remove: (kind: EdgeKind, id: string) => Promise<void>;
  /** Tries a broker's settings without saving them. `id` reuses its stored secrets. */
  testBroker: (input: Record<string, unknown>, id?: string) => Promise<BrokerTestResult>;
  /** Map a channel to a machine signal (creates the source / point / sensor as needed). */
  mapChannel: (input: EdgeMapInput) => Promise<EdgeMapResult>;
  /** Register a gateway with its sources and cards in one step. */
  commission: (input: EdgeCommissionInput) => Promise<EdgeCommissionResult>;
  /** Delete a tag (its card and points) under a gateway's rack and clear its live reading. */
  deleteTag: (input: { gatewayId: string; rack: string; card: string }) => Promise<void>;
  /** Raw messages kept by the runtime, newest first. */
  fetchSamples: (brokerId?: string) => Promise<RawSample[]>;
  /** Subscribe a broker to `filter` for `seconds` to capture samples. */
  listen: (brokerId: string, filter: string, seconds: number) => Promise<void>;

  snapshot: MqttSnapshot | null;
  traffic: MqttTrafficEntry[];
  /** Recent values per measurement key, for sparklines. */
  history: Record<string, number[]>;
  stream: StreamState;
  trafficPaused: boolean;
  setTrafficPaused: (paused: boolean) => void;
  clearTraffic: () => void;
}

const EdgeContext = createContext<EdgeContextValue | null>(null);

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body) throw new Error(`Request failed (${res.status}).`);
  if ("error" in body) throw new Error(body.error.message);
  return body.data;
}

export function EdgeProvider({ children }: { children: React.ReactNode }) {
  const [registry, setRegistry] = useState<EdgeRegistry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trafficPaused, setTrafficPaused] = useState(false);
  const live = useMqttLive({ paused: trafficPaused });

  const refresh = useCallback(async () => {
    try {
      const data = await call<EdgeRegistry>("/api/edge");
      setRegistry(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Writes re-read the whole registry: cascades (a deleted gateway takes its
  // sources and points) and server-side defaults then show exactly as stored.
  const create = useCallback(
    async <K extends EdgeKind>(kind: K, input: Record<string, unknown>) => {
      const data = await call<EdgeEntityByKind[K]>(`/api/edge/${kind}`, { method: "POST", body: JSON.stringify(input) });
      await refresh();
      return data;
    },
    [refresh],
  );

  const update = useCallback(
    async <K extends EdgeKind>(kind: K, id: string, patch: Record<string, unknown>) => {
      const data = await call<EdgeEntityByKind[K]>(`/api/edge/${kind}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
      await refresh();
      return data;
    },
    [refresh],
  );

  const remove = useCallback(
    async (kind: EdgeKind, id: string) => {
      await call<{ id: string }>(`/api/edge/${kind}/${encodeURIComponent(id)}`, { method: "DELETE" });
      await refresh();
    },
    [refresh],
  );

  const testBroker = useCallback(
    (input: Record<string, unknown>, id?: string) =>
      call<BrokerTestResult>("/api/edge/test-broker", { method: "POST", body: JSON.stringify({ ...input, ...(id ? { id } : {}) }) }),
    [],
  );

  const mapChannel = useCallback(
    async (input: EdgeMapInput) => {
      const data = await call<EdgeMapResult>("/api/edge/map", { method: "POST", body: JSON.stringify(input) });
      await refresh();
      return data;
    },
    [refresh],
  );

  const deleteTag = useCallback(
    async (input: { gatewayId: string; rack: string; card: string }) => {
      await call<unknown>("/api/edge/tags", { method: "DELETE", body: JSON.stringify(input) });
      await refresh();
    },
    [refresh],
  );

  const commission = useCallback(
    async (input: EdgeCommissionInput) => {
      const data = await call<EdgeCommissionResult>("/api/edge/commission", { method: "POST", body: JSON.stringify(input) });
      await refresh();
      return data;
    },
    [refresh],
  );

  const fetchSamples = useCallback(
    (brokerId?: string) => call<RawSample[]>(`/api/mqtt/samples${brokerId ? `?brokerId=${encodeURIComponent(brokerId)}` : ""}`),
    [],
  );

  const listen = useCallback(async (brokerId: string, filter: string, seconds: number) => {
    await call<unknown>("/api/mqtt/listen", { method: "POST", body: JSON.stringify({ brokerId, filter, seconds }) });
  }, []);

  const value = useMemo<EdgeContextValue>(
    () => ({
      registry,
      loading,
      error,
      refresh,
      create,
      update,
      remove,
      testBroker,
      mapChannel,
      commission,
      deleteTag,
      fetchSamples,
      listen,
      snapshot: live.snapshot,
      traffic: live.traffic,
      history: live.history,
      stream: live.stream,
      trafficPaused,
      setTrafficPaused,
      clearTraffic: live.clearTraffic,
    }),
    [registry, loading, error, refresh, create, update, remove, testBroker, mapChannel, commission, deleteTag, fetchSamples, listen, live.snapshot, live.traffic, live.history, live.stream, live.clearTraffic, trafficPaused],
  );

  return <EdgeContext.Provider value={value}>{children}</EdgeContext.Provider>;
}

export function useEdge(): EdgeContextValue {
  const ctx = useContext(EdgeContext);
  if (!ctx) throw new Error("useEdge() must be used inside <EdgeProvider>.");
  return ctx;
}
