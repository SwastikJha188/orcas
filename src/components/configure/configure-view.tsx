"use client";

import React, { useEffect, useState } from "react";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { PillButton, Table, type Column } from "@/components/ui";
import { StatusTag, type Tone } from "@/components/assets/assets-shell-ui";
import type { RackChassisRecord } from "@/components/assets/assets-data";
import "@/components/assets/assets-shell.css";
import "@/components/ui/page.css";

/* ==========================================================================
   Configure — the data behind the plant: is the database up, what does it
   hold, and which gateways feed it. Resetting the data asks twice.
   ========================================================================== */

type TableRow = { name: string; rows: number };

const tableColumns: Column<TableRow>[] = [
  { key: "name", header: "Table", render: (t) => <span className="ast-cell-title">{t.name}</span> },
  { key: "rows", header: "Rows", width: "120px", render: (t) => <span className="ast-num">{t.rows.toLocaleString()}</span> },
];

const gatewayColumns: Column<RackChassisRecord>[] = [
  {
    key: "machine",
    header: "Gateway",
    render: (r) => (
      <span className="ast-cell-stack">
        <span className="ast-cell-title">{r.machineId}</span>
        <span className="ast-cell-sub">{r.primaryRack.rackId}</span>
      </span>
    ),
  },
  { key: "ip", header: "Address", render: (r) => <span className="ast-num">{r.primaryRack.ipAddress}</span> },
  { key: "protocol", header: "Protocol", render: (r) => <span className="ast-cell-text pg-wrap">{r.primaryRack.protocol}</span> },
  { key: "clock", header: "Clock", render: (r) => <span className="ast-cell-text pg-wrap">{r.primaryRack.latency}</span> },
];

const CONFIRM_MS = 4000;

export function ConfigureView() {
  const { databaseStatus, isDbLive, reseedDatabase, refreshData, isLoading, racks } = useIndustrialData();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ tone: Tone; text: string } | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  const handleReset = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setResult({ tone: "info", text: "Resetting…" });
    const ok = await reseedDatabase();
    setResult(ok ? { tone: "good", text: "Data reset" } : { tone: "bad", text: "Reset failed — see server log" });
  };

  const tables: TableRow[] = Object.entries(databaseStatus?.counts ?? {})
    .map(([name, rows]) => ({ name, rows: Number(rows) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const records = tables.reduce((n, t) => n + t.rows, 0);
  const engine = databaseStatus?.version?.split(" ").slice(0, 2).join(" ");

  return (
    <div className="pg-root ast-root" aria-label="Configure">
      <header className="ast-head pg-head">
        <div className="ast-head-main">
          <ol className="ast-crumbs" aria-label="Location">
            <li>Configure</li>
            <li>Data</li>
          </ol>
          <div className="ast-title-row">
            <h1 className="ast-title">Database</h1>
            <StatusTag tone={isDbLive ? "good" : "bad"} label={isDbLive ? "Connected" : "Offline"} />
            {(databaseStatus?.database || engine) && (
              <span className="ast-caption ast-num">{[databaseStatus?.database, engine].filter(Boolean).join(" · ")}</span>
            )}
          </div>
        </div>
        <div className="pg-actions">
          {result && (
            <span className="pg-note" data-tone={result.tone} role="status">
              {result.text}
            </span>
          )}
          <PillButton variant="secondary" onClick={() => refreshData()} disabled={isLoading}>
            {isLoading ? "Checking…" : "Refresh"}
          </PillButton>
          <PillButton variant={confirming ? "primary" : "secondary"} onClick={handleReset} disabled={isLoading}>
            {confirming ? "Confirm reset" : "Reset data"}
          </PillButton>
        </div>
      </header>

      {!isDbLive && databaseStatus?.error && (
        <div className="ast-card pg-note" data-tone="bad" role="alert">
          {databaseStatus.error}
        </div>
      )}

      <section className="ast-card pg-table-card" aria-label="Tables">
        <div className="ast-card-head">
          <h2 className="ast-card-title">
            Tables{" "}
            {tables.length > 0 && (
              <span className="ast-caption ast-num">
                {tables.length} · {records.toLocaleString()} records
              </span>
            )}
          </h2>
        </div>
        {tables.length ? (
          <Table className="ast-table" columns={tableColumns} data={tables} keyExtractor={(t) => t.name} />
        ) : (
          <div className="ast-empty">No tables reported</div>
        )}
      </section>

      <section className="ast-card pg-table-card" aria-label="Gateways">
        <div className="ast-card-head">
          <h2 className="ast-card-title">Gateways</h2>
        </div>
        <Table className="ast-table" columns={gatewayColumns} data={racks} keyExtractor={(r) => r.primaryRack.rackId} />
      </section>
    </div>
  );
}
