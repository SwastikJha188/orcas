"use client";

import React, { useEffect, useState } from "react";
import { invalidateApi, useApi } from "@/lib/api-cache";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { ConfirmAction, Field, FieldGrid, Loading, NumberInput, PillButton, Select } from "@/components/ui";
import { formatLocalTime } from "@/lib/time";
import type { SapSimStatus } from "@backend/sap/service";

/**
 * Simulation › SAP: the plant's simulated SAP S/4HANA system (backend
 * src/sap/sim). Starting it builds SAP's equipment, spare parts, stock and
 * measuring points from the plant's own machines and links the plant's SAP tab
 * to it; its planner then turns notifications into orders, issues parts and
 * plans production. These knobs set how SAP's people and interfaces behave.
 */

type Draft = Record<"plannerDelayMin" | "releaseDelayMin" | "workHours" | "verifyHours" | "preventiveEveryDays" | "productionHours" | "latencyMs" | "failurePct" | "stockLevel", string> & { slowResourceId: string };

const FIELDS: { key: keyof Draft; label: string; hint: string }[] = [
  { key: "plannerDelayMin", label: "Planner reacts after (min)", hint: "From a notification to its maintenance order." },
  { key: "releaseDelayMin", label: "Order released after (min)", hint: "From the order to its release; parts are issued then." },
  { key: "workHours", label: "Repair takes (h)", hint: "Typical length of a repair; each order varies ±25 %." },
  { key: "verifyHours", label: "Check after repair (h)", hint: "How long the order stays open while the readings are watched." },
  { key: "preventiveEveryDays", label: "Routine service every (days)", hint: "Per machine, planned a week ahead." },
  { key: "productionHours", label: "Production order length (h)", hint: "Typical; each order varies ±40 %." },
  { key: "latencyMs", label: "SAP answers in (ms)", hint: "Typical time for each request." },
  { key: "failurePct", label: "Requests failing (%)", hint: "Share of requests SAP answers 'temporarily unavailable'." },
  { key: "stockLevel", label: "Stock level (×)", hint: "1 = normal; 0 = empty stores, every order waits for parts." },
];

export function SimulationSap() {
  const { selectedPlantId, plants } = useIndustrialData();
  const url = selectedPlantId ? `/api/sap/simulation?plantId=${encodeURIComponent(selectedPlantId)}` : null;
  const { data, error, isLoading } = useApi<SapSimStatus>(url);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "good" | "bad" | "info"; text: string } | null>(null);
  const plantName = plants.find((p) => p.id === selectedPlantId)?.name ?? "this plant";
  const s = data?.settings ?? null;

  useEffect(() => {
    if (!s) return setDraft(null);
    setDraft({
      plannerDelayMin: String(s.plannerDelayMin),
      releaseDelayMin: String(s.releaseDelayMin),
      workHours: String(s.workHours),
      verifyHours: String(s.verifyHours),
      preventiveEveryDays: String(s.preventiveEveryDays),
      productionHours: String(s.productionHours),
      latencyMs: String(s.latencyMs),
      failurePct: String(Math.round(s.failureRate * 1000) / 10),
      stockLevel: String(s.stockLevel),
      slowResourceId: s.slowResourceId ?? "",
    });
  }, [s]);

  const call = async (what: string, method: string, path: string, body?: Record<string, unknown>) => {
    setBusy(what);
    setNote(null);
    try {
      const target = method === "DELETE" || method === "GET" ? `${path}?plantId=${encodeURIComponent(selectedPlantId!)}` : path;
      const res = await fetch(target, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify({ plantId: selectedPlantId, ...body }) : undefined });
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) throw new Error(json?.error?.message ?? "It did not work");
      invalidateApi("/api/sap");
      return true;
    } catch (e) {
      setNote({ tone: "bad", text: e instanceof Error ? e.message : "It did not work" });
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (!selectedPlantId) return <p className="pg-note">Pick a plant first.</p>;
  if (isLoading && !data) return <Loading label="Loading SAP…" rows={3} />;
  if (error && !data) return <p className="pg-note" data-tone="bad">{error}</p>;
  if (!data) return null;

  const save = async () => {
    if (!draft) return;
    const n = (k: keyof Draft) => Number(draft[k]);
    if (await call("save", "PUT", "/api/sap/simulation", { plannerDelayMin: n("plannerDelayMin"), releaseDelayMin: n("releaseDelayMin"), workHours: n("workHours"), verifyHours: n("verifyHours"), preventiveEveryDays: n("preventiveEveryDays"), productionHours: n("productionHours"), latencyMs: n("latencyMs"), failureRate: n("failurePct") / 100, stockLevel: n("stockLevel"), slowResourceId: draft.slowResourceId || null }))
      setNote({ tone: "good", text: "Saved. SAP behaves this way from now on; orders already planned keep their times." });
  };

  return (
    <div className="sim-grid">
      <section className="ast-card sim-card">
        <header className="sim-card-head">
          <h2 className="sim-card-title">SAP for {plantName}</h2>
          <span className="ast-caption">{s ? `Running since ${formatLocalTime(s.startedAt, { date: true, seconds: false })} · SAP plant ${s.plantCode}` : "Not running"}</span>
        </header>
        <p className="sim-context">
          A simulated SAP S/4HANA system built from this plant&apos;s machines, parts and measurements. It answers the SAP tab exactly as a real system would: its planner turns notifications into maintenance orders, issues spare parts and reorders stock, operators report faults now and then, and production orders fill the main machine&apos;s week.
        </p>
        {data.counts && (
          <p className="sim-context">
            {data.counts.equipment} equipment · {data.counts.materials} spare materials ({data.counts.shortMaterials} out of stock) · {data.counts.measuringPoints} measuring points · {data.counts.openNotifications} open notifications · {data.counts.openOrders} open orders · {data.counts.productionOrders} production orders running or planned
          </p>
        )}
        {data.realConnection && <p className="pg-note" data-tone="warn">This plant is linked to a real SAP system ({data.realConnection}). Starting the simulated one replaces that link.</p>}
        <div className="sim-actions">
          {!s ? (
            <PillButton loading={busy === "start"} onClick={() => void call("start", "POST", "/api/sap/simulation/start", { replace: Boolean(data.realConnection) }).then((ok) => ok && setNote({ tone: "good", text: "SAP is running and the plant's SAP tab is linked to it." }))}>
              Start SAP
            </PillButton>
          ) : (
            <>
              <ConfirmAction label="Start again from scratch" question="Throw away SAP's orders, stock and history and build it again?" confirmLabel="Start again" tone="secondary" busy={busy === "start"} onConfirm={() => void call("start", "POST", "/api/sap/simulation/start", {}).then((ok) => ok && setNote({ tone: "good", text: "SAP was built again from the plant." }))} />
              <ConfirmAction label="Stop SAP" question="Stop SAP and unlink the plant's SAP tab?" confirmLabel="Stop" busy={busy === "stop"} onConfirm={() => void call("stop", "DELETE", "/api/sap/simulation").then((ok) => ok && setNote({ tone: "info", text: "SAP stopped." }))} />
            </>
          )}
          {note && (
            <span className="pg-note" data-tone={note.tone} role="status">
              {note.text}
            </span>
          )}
        </div>
      </section>

      {s && draft && (
        <section className="ast-card sim-card">
          <header className="sim-card-head">
            <h2 className="sim-card-title">How SAP behaves</h2>
            <span className="ast-caption">{s.updatedBy ? `Changed ${formatLocalTime(s.updatedAt, { date: true, seconds: false })} by ${s.updatedBy}` : ""}</span>
          </header>
          <FieldGrid>
            {FIELDS.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint}>
                {(id, d) => <NumberInput id={id} describedBy={d} value={draft[f.key]} onChange={(v) => setDraft({ ...draft, [f.key]: v })} />}
              </Field>
            ))}
            <Field label="Interface that times out" hint="Pick one to watch partial syncs and retries.">
              {(id, d) => (
                <Select id={id} describedBy={d} value={draft.slowResourceId} onChange={(v) => setDraft({ ...draft, slowResourceId: v })} options={[{ value: "", label: "None" }, ...data.resources.map((r) => ({ value: r.id, label: r.label }))]} />
              )}
            </Field>
          </FieldGrid>
          <div className="sim-actions">
            <PillButton loading={busy === "save"} onClick={() => void save()}>
              Save
            </PillButton>
          </div>
        </section>
      )}
    </div>
  );
}
