"use client";

import React, { useState } from "react";
import { Crumbs, PillButton, StatusTag, type Crumb, type Tone } from "@/components/ui";
import { Empty } from "@/components/assets/analysis/an-ui";
import { Loading as LoadingState } from "@/components/ui";
import { useApi } from "@/lib/api-cache";
import { formatLocalTime } from "@/lib/time";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { usePmsLine } from "@/components/maintenance/pms-model";
import { usePlantMachineTabs } from "@/components/home/operator/machine-nav";
import { resourceLabel, sapCall, sapUrl, type SapDashboard, type SapResourceName } from "./sap-api";
import { SapConnectionDialog } from "./sap-dialogs";
import { SapAudit, SapMapping, SapMaintenance, SapMaterials, SapOverview, SapProduction, type ViewCtx } from "./sap-views";
import "@/components/assets/assets-shell.css";
import "@/components/assets/analysis/analysis-page.css";
import "@/components/ui/page.css";
import "@/components/home/plant-home.css";
import "@/components/home/operator/operator-console.css";
import "@/components/configure/configure.css";
import "@/components/maintenance/pms.css";
import "./sap.css";

/* ==========================================================================
   SAP — the plant's SAP S/4HANA system (rail tab below Maintenance), ported
   from the ULTRON console's SAP Integration page, in the Configure / Devices
   frame: section bar, machine bar with the connection and its actions, then
   the section.

     Overview            what needs a decision in SAP, one problem's thread
     Equipment mapping   machine ↔ SAP equipment, readings ↔ measuring points
     Maintenance         lanes: to raise → notification open → order in progress → checking after repair
     Materials           spare-part readiness of SAP's orders against stock
     Production          SAP production orders against the machines' risk
     Sync & audit        API health, writes waiting, the full log

   Everything comes from /api/sap (the cached SAP records, mappings, outbox and
   log) and the live problems; nothing is shown that SAP or the database did
   not give.
   ========================================================================== */

type View = "overview" | "mapping" | "maintenance" | "materials" | "production" | "audit";
const VIEWS: { id: View; label: string; title: string; context: string }[] = [
  { id: "overview", label: "Overview", title: "SAP overview", context: "What ULTRON found that needs a decision in SAP, and how each problem moves through it." },
  { id: "mapping", label: "Equipment mapping", title: "Equipment mapping", context: "Which SAP equipment each machine is, and which SAP measuring point each reading is written to." },
  { id: "maintenance", label: "Maintenance", title: "Maintenance in SAP", context: "Each problem ULTRON found, followed through its SAP notification, maintenance order and the check after the repair." },
  { id: "materials", label: "Materials", title: "Spare parts", context: "Spare parts SAP's maintenance orders need, against the stock in each store." },
  { id: "production", label: "Production", title: "Production", context: "SAP's production orders on the main machine against how long it can safely run. Suggestions only; a planner decides." },
  { id: "audit", label: "Sync & audit", title: "Sync & audit", context: "How each SAP interface answers, writes waiting to be sent, and every exchange." },
];
const FULL_LINE = "full-line";
const VIEW_KEY = "ultron.sap.view";

function storedView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (VIEWS.some((x) => x.id === v)) return v as View;
  } catch {
    /* storage unavailable */
  }
  return "overview";
}

export function SapWorkspace() {
  const { selectedPlantId, plants } = useIndustrialData();
  const plantName = plants.find((p) => p.id === selectedPlantId)?.name ?? "This plant";
  const api = useApi<SapDashboard>(selectedPlantId ? sapUrl(selectedPlantId) : null, { refreshMs: 60_000 });
  const dash = api.data;
  const pms = usePmsLine();
  const plantTabs = usePlantMachineTabs();
  const [view, setView] = useState<View>(storedView);
  const [machineId, setMachineId] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [busy, setBusy] = useState<"sync" | null>(null);
  const [notice, setNotice] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const tz = useSiteTimeZone({ machineId: dash?.equipment[0]?.machineId });
  const when = (t: string | number | null) => (t ? formatLocalTime(t, { date: true, seconds: false, timeZone: tz.timeZone }) : "—");

  const pick = (v: View) => {
    setView(v);
    setNotice(null);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* storage unavailable */
    }
  };

  const conn = dash?.connection ?? null;
  const lastRun = dash?.syncRuns[0] ?? null;
  const state: { label: string; tone: Tone } = !dash
    ? { label: "Loading", tone: "idle" }
    : !conn
      ? { label: "Not linked", tone: "idle" }
      : !conn.enabled
        ? { label: "Switched off", tone: "idle" }
        : conn.credentialStatus === "missing"
          ? { label: "Sign-in missing", tone: "warn" }
          : conn.lastTest && !conn.lastTest.ok
            ? { label: "Connection failing", tone: "bad" }
            : lastRun?.failed.length
              ? { label: "Partly synced", tone: "warn" }
              : { label: "Connected", tone: "good" };

  const sync = async () => {
    if (!selectedPlantId || !dash) return false;
    setBusy("sync");
    setNotice(null);
    const out = await sapCall<{ records: number; failed: { resource: SapResourceName; message: string }[] }>("/sync", "POST", { plantId: selectedPlantId }, "The sync failed");
    setBusy(null);
    if ("error" in out) setNotice({ tone: "bad", text: out.error });
    else if (out.data.failed.length) setNotice({ tone: "bad", text: `Read ${out.data.records} records. Not read: ${out.data.failed.map((f) => `${resourceLabel(dash, f.resource)} (${f.message})`).join(" · ")}` });
    else setNotice({ tone: "good", text: `Read ${out.data.records} records from SAP.` });
    return !("error" in out) && out.data.failed.length === 0;
  };

  const head = VIEWS.find((v) => v.id === view)!;
  const machinePills = plantTabs.map((t) => ({ id: t.machineId ?? FULL_LINE, label: t.label }));
  // SAP / section / machine: each level above the last goes back up to it.
  const crumbs: Crumb[] = [
    { label: "SAP", onClick: view !== "overview" || machineId ? () => { pick("overview"); setMachineId(null); } : undefined },
    { label: head.label, onClick: machineId ? () => setMachineId(null) : undefined },
    ...(machineId ? [{ label: machinePills.find((m) => m.id === machineId)?.label ?? machineId }] : []),
  ];
  const ctx: ViewCtx | null = dash && selectedPlantId ? { dash, plantId: selectedPlantId, pms, machineId, when, notice, setNotice, crumbs, setMachineId, openSettings: () => setSettings(true), sync, goTo: pick } : null;

  return (
    <div className="cfg-shell pm-shell" aria-label="SAP">
      <header className="opc-topbar cfg-topbar" aria-label="SAP sections">
        <div className="opc-stage-tabs">
          <div className="opc-pill-group" role="tablist" aria-label="SAP sections">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className="opc-pill-btn" data-active={view === v.id || undefined} onClick={() => pick(v.id)}>
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="opc-subbar cfg-subbar" role="region" aria-label="Machine and SAP connection">
        <div className="opc-stage-tabs">
          <div className="opc-pill-group opc-subassembly-pills" role="tablist" aria-label="Machine">
            {machinePills.map((m) => {
              const active = (machineId ?? FULL_LINE) === m.id;
              return (
                <button key={m.id} type="button" role="tab" aria-selected={active} className="opc-pill-btn" data-active={active || undefined} onClick={() => setMachineId(m.id === FULL_LINE ? null : m.id)}>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="opc-stage-toggles sap-bar-actions">
          <StatusTag tone={state.tone} label={state.label} title={conn?.lastTest?.message ?? undefined} />
          {conn && <span className="pm-muted sap-bar-meta">{lastRun ? `Synced ${when(lastRun.finishedAt ?? lastRun.startedAt)}` : "Never synced"}</span>}
          <PillButton variant="secondary" onClick={() => setSettings(true)} disabled={!dash}>
            {conn ? "Connection" : "Link SAP"}
          </PillButton>
          {conn && (
            <PillButton loading={busy === "sync"} onClick={sync}>
              Sync now
            </PillButton>
          )}
        </div>
      </div>

      <div className="pg-root ast-root cfg-root pm-workspace">
        <div className="cfg-main">
          <header className="ast-head pg-head">
            <div className="ast-head-main">
              <Crumbs items={crumbs} />
              <div className="ast-title-row">
                <h1 className="ast-title">{head.title}</h1>
              </div>
              <p className="pg-cfg-context">
                {conn ? `${conn.name}${conn.sapPlant ? ` · SAP plant ${conn.sapPlant}` : ""} · ${plantName}. ` : ""}
                {head.context}
              </p>
              {notice && (
                <p key={notice.text} className="ui-form-note sap-notice" data-tone={notice.tone} role="status">
                  {notice.text}
                </p>
              )}
            </div>
          </header>

          <div className="pm-workspace-body" key={`${view}-${machineId ?? FULL_LINE}`}>
            {!selectedPlantId ? (
              <Empty title="Pick a plant to see its SAP system." />
            ) : !ctx ? (
              <section className="ast-card">{api.error ? <Empty title="The SAP data could not be loaded.">{api.error}</Empty> : <LoadingState label="Loading SAP…" rows={5} />}</section>
            ) : !ctx.dash.connection ? (
              <section className="ast-card">
                <Empty title="This plant is not linked to SAP yet.">
                  Link the plant&apos;s SAP S/4HANA system to read its equipment, notifications, maintenance orders, stock and production orders, and to raise notifications from the problems ULTRON finds.
                  <span className="sap-empty-action">
                    <PillButton onClick={() => setSettings(true)}>Link SAP</PillButton>
                  </span>
                </Empty>
              </section>
            ) : (
              <div className="ast-root pg-frame pm-page">
                {view === "overview" && <SapOverview {...ctx} />}
                {view === "mapping" && <SapMapping {...ctx} />}
                {view === "maintenance" && <SapMaintenance {...ctx} />}
                {view === "materials" && <SapMaterials {...ctx} />}
                {view === "production" && <SapProduction {...ctx} />}
                {view === "audit" && <SapAudit {...ctx} />}
              </div>
            )}
          </div>
        </div>
      </div>

      {dash && selectedPlantId && <SapConnectionDialog open={settings} onClose={() => setSettings(false)} plantId={selectedPlantId} plantName={plantName} dash={dash} />}
    </div>
  );
}
