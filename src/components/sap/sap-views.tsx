"use client";

import React, { useMemo, useState } from "react";
import { ConfirmAction, KpiStrip, PillButton, PillNav, TextInput, type KpiItem, type Tone } from "@/components/ui";
import { Empty, Section } from "@/components/assets/analysis/an-ui";
import { machineName, priorityTone, type PmsFinding, type PmsModel } from "@/components/maintenance/pms-model";
import { ItemCell, PM_ICON, StateWord } from "@/components/maintenance/pms-ui";
import { field, resourceLabel, sameSapNumber, sapCall, sapNumber, type SapDashboard, type SapEquipmentMapping, type SapMaterialMapping, type SapOutboxJob } from "./sap-api";
import { EquipmentMappingDialog, MaterialMappingDialog } from "./sap-dialogs";
import { ORDER_WORD, hoursIn, kitShare, threadStep, useSapModel, type SapModel, type SapOrder, type Thread } from "./sap-model";

/* ==========================================================================
   The six SAP views (see sap-workspace.tsx). Ported from the ULTRON console's
   SAP tabs; every number here is counted from the SAP records ULTRON read or
   from ULTRON's own data.
   ========================================================================== */

type View = "overview" | "mapping" | "maintenance" | "materials" | "production" | "audit";

export interface ViewCtx {
  dash: SapDashboard;
  plantId: string;
  pms: PmsModel;
  machineId: string | null;
  when: (t: string | number | null) => string;
  setNotice: (n: { tone: "good" | "bad"; text: string } | null) => void;
  setMachineId: (id: string | null) => void;
  openSettings: () => void;
  goTo: (v: View) => void;
}

const H = 3600_000;
const qty = (n: number | null, unit: string | null) => (n === null ? "—" : `${Number.isInteger(n) ? n.toLocaleString("en-GB") : n.toLocaleString("en-GB", { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}`);
const hoursWord = (h: number) => (h >= 48 ? `${Math.round(h / 24)} days` : h >= 1 ? `${Math.round(h)} h` : `${Math.round(h * 60)} min`);
const ORDER_TONE: Record<SapOrder["stage"], Tone | undefined> = { created: undefined, released: undefined, working: "info", verifying: "info", closed: undefined };
const OUTBOX_WORD: Record<SapOutboxJob["state"], { label: string; tone?: Tone }> = {
  pending: { label: "Waiting to send" },
  processing: { label: "Sending" },
  retry: { label: "Will try again", tone: "warn" },
  completed: { label: "In SAP" },
  failed: { label: "Not sent", tone: "bad" },
};

function Bar({ share, tone }: { share: number; tone?: Tone }) {
  return (
    <span className="sap-bar" aria-hidden="true">
      <span style={{ width: `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%` }} data-tone={tone} />
    </span>
  );
}

function Rows({ items }: { items: { key: string; left: React.ReactNode; right?: React.ReactNode; sub?: string; tone?: Tone }[] }) {
  return (
    <ul className="sap-list">
      {items.map((i) => (
        <li key={i.key}>
          <span className="ast-cell-stack">
            <StateWord label={i.left} tone={i.tone} />
            {i.sub && <span className="ast-cell-sub">{i.sub}</span>}
          </span>
          {i.right !== undefined && <span className="sap-list-right">{i.right}</span>}
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------- raise in SAP */

function RaiseButton({ ctx, f, primary }: { ctx: ViewCtx; f: PmsFinding; primary?: boolean }) {
  const [busy, setBusy] = useState(false);
  const raise = async () => {
    setBusy(true);
    const out = await sapCall<{ id: number; state: string }>(
      "/notifications",
      "POST",
      { plantId: ctx.plantId, machineId: f.machineId, ruleCode: f.ruleId, title: f.plainTitle || f.name, detail: [f.plainWhat || f.evidence, f.plainTodo || f.action, f.timeToLimit && f.timeToLimit !== "—" ? `Limit in ${f.timeToLimit}` : null].filter(Boolean).join("\n"), priority: f.priority },
      "The notification was not sent",
    );
    setBusy(false);
    if ("error" in out) ctx.setNotice({ tone: "bad", text: out.error });
    else ctx.setNotice(out.data.state === "completed" ? { tone: "good", text: "Notification created in SAP." } : { tone: "bad", text: "SAP did not take the notification yet; it will be tried again (see Sync & audit)." });
  };
  return (
    <PillButton variant={primary ? "primary" : "secondary"} className={primary ? undefined : "pg-diag-sm"} loading={busy} onClick={() => void raise()}>
      Raise notification in SAP
    </PillButton>
  );
}

/* ------------------------------------------------------------ the thread */

const STEPS = ["Problem found", "SAP notification", "Maintenance order", "Work done", "Checked after repair", "Closed"];

function ThreadSteps({ ctx, t }: { ctx: ViewCtx; t: Thread }) {
  const step = threadStep(t);
  const detail = [
    t.finding ? `${t.finding.priority} · ${machineName(t.machineId)}${t.finding.since ? "" : ""}` : machineName(t.machineId),
    t.notification ? `${sapNumber(t.notification.number)} · ${t.notification.open ? "open" : "completed"}` : t.job ? OUTBOX_WORD[t.job.state].label : "Not raised yet",
    t.order ? `${sapNumber(t.order.number)} · ${ORDER_WORD[t.order.stage].toLowerCase()}` : t.notification ? "Waiting for the SAP planner" : "—",
    t.order?.start ? `${t.order.stage === "created" || t.order.stage === "released" ? "Planned" : "Started"} ${ctx.when(t.order.start)}` : "—",
    t.order?.finish && step >= 4 ? `ULTRON watches the readings since ${ctx.when(t.order.finish)}` : "—",
    step >= 5 ? "Technically complete in SAP" : "—",
  ];
  return (
    <ol className="sap-thread" aria-label="Where this problem stands">
      {STEPS.map((s, i) => (
        <li key={s} data-state={i < step ? "done" : i === step ? "current" : "todo"}>
          <span className="sap-thread-dot" aria-hidden="true" />
          <span className="ast-cell-stack">
            <span>{s}</span>
            <span className="ast-cell-sub">{detail[i]}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ----------------------------------------------------------------- overview */

export function SapOverview(ctx: ViewCtx) {
  const { dash, pms } = ctx;
  const m = useSapModel(dash, pms.findings, ctx.machineId);
  const waiting = m.threads.filter((t) => !t.job && t.finding);
  const [selKey, setSelKey] = useState<string | null>(null);
  const keyOf = (t: Thread) => `${t.machineId}|${t.job?.id ?? t.finding?.ruleId}`;
  const sel = m.threads.find((t) => keyOf(t) === selKey) ?? waiting[0] ?? m.threads[0] ?? null;
  const machines = dash.equipment.filter((e) => !ctx.machineId || e.machineId === ctx.machineId);
  const openN = m.notifications.filter((n) => n.open);
  const working = m.orders.filter((o) => o.stage !== "closed");
  const short = working.filter((o) => kitShare(o) < 1);
  const failedWrites = dash.outbox.filter((o) => o.state === "failed").length;

  const kpis: KpiItem[] = [
    { label: "Equipment mapped", value: `${m.mapped.filter((e) => !ctx.machineId || e.machineId === ctx.machineId).length}`, unit: `of ${machines.length}`, bar: machines.length ? (m.mapped.filter((e) => !ctx.machineId || e.machineId === ctx.machineId).length / machines.length) * 100 : 0, foot: `${dash.records.equipment.length} SAP equipment read` },
    { label: "Open notifications", value: m.synced ? `${openN.length}` : "—", foot: `${openN.filter((n) => !n.order).length} without an order yet` },
    { label: "Maintenance orders", value: m.synced ? `${working.length}` : "—", foot: `${working.filter((o) => o.stage === "working").length} in progress now` },
    { label: "To raise in SAP", value: `${waiting.length}`, tone: failedWrites ? "bad" : waiting.length ? "warn" : undefined, foot: failedWrites ? `${failedWrites} not sent; see Sync & audit` : short.length ? `${short.length} orders short of parts` : "problems with no notification yet" },
  ];

  return (
    <>
      <KpiStrip page label="SAP summary" items={kpis} />
      <div className="pg-frame-body sap-stack">
        <div className="pm-split is-wide-side">
          <Section id="sap-queue" title="Action queue" right={<span className="pm-muted">Problems that need a decision in SAP</span>}>
            {m.threads.length === 0 ? (
              <Empty title="No open problems on the machines.">When ULTRON finds one, it shows here to raise as an SAP notification.</Empty>
            ) : (
              <div className="ui-table-container ast-table pm-table">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th title="P1 is the most urgent">Priority</th>
                      <th className="pm-grow">Problem</th>
                      <th>Time to limit</th>
                      <th>SAP equipment</th>
                      <th>In SAP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.threads.map((t) => {
                      const tone = t.finding ? priorityTone(t.finding.priority) : "idle";
                      const eq = m.eqOf(t.machineId);
                      const active = sel && keyOf(sel) === keyOf(t);
                      return (
                        <tr key={keyOf(t)} className={`is-clickable ${active ? "active" : ""}`} onClick={() => setSelKey(keyOf(t))} aria-current={active || undefined}>
                          <td className="pm-pri ast-num" data-tone={tone === "idle" ? undefined : tone}>
                            {t.finding?.priority ?? "—"}
                          </td>
                          <td className="pm-grow">
                            <ItemCell icon={PM_ICON.finding} tone={t.finding?.severity === "Critical" ? "bad" : t.finding ? "warn" : undefined} title={t.title} sub={`${machineName(t.machineId)}${t.finding?.subs[0] ? ` · ${t.finding.subs[0]}` : ""}`} />
                          </td>
                          <td className="ast-num">{t.finding?.timeToLimit && t.finding.timeToLimit !== "—" ? t.finding.timeToLimit : "—"}</td>
                          <td className="ast-num">{sapNumber(eq) ?? <span className="pm-muted">Not mapped</span>}</td>
                          <td>
                            {t.order ? (
                              <StateWord label={`Order ${sapNumber(t.order.number)} · ${ORDER_WORD[t.order.stage].toLowerCase()}`} tone={ORDER_TONE[t.order.stage]} />
                            ) : t.job ? (
                              <StateWord label={t.job.state === "completed" ? `Notification ${sapNumber(t.job.objectKey)}` : OUTBOX_WORD[t.job.state].label} tone={OUTBOX_WORD[t.job.state].tone} />
                            ) : (
                              <StateWord label="Not raised" tone="warn" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section id="sap-lifecycle" title={sel ? `${machineName(sel.machineId)} · one traceable thread` : "Problem thread"}>
            {!sel ? (
              <Empty title="Pick a problem to follow it through SAP." />
            ) : (
              <>
                <p className="sap-thread-title">{sel.title}</p>
                {sel.finding && (
                  <div className="sap-facts">
                    <span>
                      <span className="ast-caption">Confidence</span>
                      <b className="ast-num">{Math.round(sel.finding.confidence)} %</b>
                    </span>
                    <span>
                      <span className="ast-caption">Time to limit</span>
                      <b className="ast-num">{sel.finding.timeToLimit || "—"}</b>
                    </span>
                    <span>
                      <span className="ast-caption">SAP equipment</span>
                      <b className="ast-num">{sapNumber(m.eqOf(sel.machineId)) ?? "—"}</b>
                    </span>
                  </div>
                )}
                {sel.finding?.plainWhat && <p className="pm-note">{sel.finding.plainWhat}</p>}
                <ThreadSteps ctx={ctx} t={sel} />
                <div className="sap-actions-row">
                  {!sel.job && sel.finding && (m.eqOf(sel.machineId) ? <RaiseButton ctx={ctx} f={sel.finding} primary /> : <PillButton onClick={() => ctx.goTo("mapping")}>Map {machineName(sel.machineId)} first</PillButton>)}
                  {sel.order && (
                    <PillButton variant="secondary" onClick={() => ctx.goTo("materials")}>
                      Parts for order {sapNumber(sel.order.number)}
                    </PillButton>
                  )}
                </div>
              </>
            )}
          </Section>
        </div>

        <Section id="sap-activity" title="Recent integration activity">
          {dash.audit.length === 0 ? (
            <Empty title="Nothing exchanged with SAP yet." />
          ) : (
            <Rows items={dash.audit.slice(0, 8).map((a) => ({ key: String(a.id), left: auditText(dash, a), sub: [a.user ?? "System", a.durationMs !== null ? `${a.durationMs} ms` : null].filter(Boolean).join(" · "), right: <span className="pm-muted ast-num">{ctx.when(a.at)}</span>, tone: a.status === "failed" ? "bad" : a.status === "warning" ? "warn" : undefined }))} />
          )}
        </Section>
      </div>
    </>
  );
}

export function auditText(dash: SapDashboard, a: SapDashboard["audit"][number]): string {
  const what = a.resource ? resourceLabel(dash, a.resource).toLowerCase() : "";
  switch (a.action) {
    case "connection.test":
      return a.status === "success" ? "Connection tried: SAP answers" : `Connection tried: ${a.message ?? "failed"}`;
    case "connection.save":
      return a.message ?? "Connection settings saved";
    case "resource.sync":
      return a.status === "failed" ? `Could not read ${what}: ${a.message ?? "failed"}` : `Read ${what}: ${a.message ?? ""}`.trim();
    case "notification.create":
      return `Notification ${sapNumber(a.objectKey) ?? ""} created in SAP`;
    case "measurement.publish":
      return `Readings written to SAP: ${a.message ?? ""}`;
    case "outbox.write":
      return `Could not send to SAP: ${a.message ?? "failed"}`;
    case "mapping.equipment":
    case "mapping.material":
    case "mapping.point":
      return `Mapping changed: ${a.objectKey ?? ""}`;
    default:
      return `${a.action}${a.objectKey ? ` · ${a.objectKey}` : ""}`;
  }
}

/* -------------------------------------------------------- equipment mapping */

const words = (s: string) => new Set(s.toUpperCase().split(/[^A-Z0-9]+/).filter((w) => w.length > 1));

/** How well an SAP equipment record matches a machine (0–1): name, then id inside the functional location. */
function matchScore(m: SapEquipmentMapping, r: Record<string, unknown>): number {
  const name = (field(r, "EquipmentName", "EquipmentDescription") ?? "").toUpperCase();
  const floc = (field(r, "FunctionalLocation") ?? "").toUpperCase();
  if (name && m.machineName.toUpperCase().startsWith(name)) return 0.98;
  const a = words(m.machineName);
  const b = words(name);
  const common = [...a].filter((w) => b.has(w)).length;
  const short = m.machineId.replace(/^[A-Z]+-(?=[A-Z]+-\d)/, "");
  return Math.min(0.95, (common / Math.max(a.size, 1)) * 0.8 + (floc.includes(short) ? 0.3 : 0));
}

export function SapMapping(ctx: ViewCtx) {
  const { dash, plantId, machineId } = ctx;
  const m = useSapModel(dash, ctx.pms.findings, machineId);
  const [edit, setEdit] = useState<SapEquipmentMapping | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const rows = dash.equipment.filter((e) => (!machineId || e.machineId === machineId) && (!q || `${e.machineName} ${e.machineId} ${e.sapEquipmentId ?? ""} ${e.functionalLocation ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const inSap = (eq: string | null) => m.equipmentRecords.some((r) => sameSapNumber(field(r, "Equipment"), eq));
  const taken = new Set(dash.equipment.map((e) => sapNumber(e.sapEquipmentId)).filter(Boolean));
  const suggestions = dash.equipment
    .filter((e) => !e.sapEquipmentId && (!machineId || e.machineId === machineId))
    .map((e) => {
      const best = m.equipmentRecords
        .filter((r) => !taken.has(sapNumber(field(r, "Equipment"))))
        .map((r) => ({ r, score: matchScore(e, r) }))
        .sort((a, b) => b.score - a.score)[0];
      return best && best.score >= 0.5 ? { e, r: best.r, score: best.score } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const conflicts = dash.equipment.filter((e) => e.sapEquipmentId && m.synced && !inSap(e.sapEquipmentId));

  const confirm = async (list: typeof suggestions) => {
    setBusy("suggest");
    for (const s of list) {
      const out = await sapCall("/mappings/equipment", "PUT", { plantId, machineId: s.e.machineId, sapEquipmentId: field(s.r, "Equipment"), functionalLocation: field(s.r, "FunctionalLocation"), workCenter: field(s.r, "MainWorkCenter", "WorkCenter"), costCenter: field(s.r, "CostCenter") }, "Could not save the mapping");
      if ("error" in out) {
        ctx.setNotice({ tone: "bad", text: out.error });
        break;
      }
    }
    setBusy(null);
  };
  const unmap = async (id: string) => {
    setBusy(id);
    const out = await sapCall(`/mappings/equipment/${encodeURIComponent(id)}`, "DELETE", { plantId }, "Could not remove the mapping");
    setBusy(null);
    if ("error" in out) ctx.setNotice({ tone: "bad", text: out.error });
  };

  const focusMachine = machineId ?? rows.find((r) => r.sapEquipmentId)?.machineId ?? null;
  const pointsLinked = dash.points.filter((p) => p.sapPoint).length;

  return (
    <>
      <KpiStrip
        page
        label="Mapping summary"
        items={[
          { label: "Mapped machines", value: `${dash.equipment.filter((e) => e.sapEquipmentId).length}`, unit: `of ${dash.equipment.length}`, bar: dash.equipment.length ? (dash.equipment.filter((e) => e.sapEquipmentId).length / dash.equipment.length) * 100 : 0, foot: suggestions.length ? `${suggestions.length} suggested matches to confirm` : "every machine has its SAP equipment" },
          { label: "Measuring points", value: `${pointsLinked}`, unit: `of ${dash.points.length}`, foot: `readings written to SAP; ${m.measuringPoints.length} points in SAP` },
          { label: "Mapping conflicts", value: m.synced ? `${conflicts.length}` : "—", tone: conflicts.length ? "warn" : undefined, foot: conflicts.length ? "mapped numbers SAP does not know" : "every mapped number is in SAP" },
          { label: "Last master sync", value: dash.records.equipment[0] ? ctx.when(dash.records.equipment[0].syncedAt) : "—", text: true, foot: `${dash.records.equipment.length} equipment records` },
        ]}
      />
      <div className="pg-frame-body sap-stack">
        <div className="pm-split is-wide-side">
          <Section id="sap-map" title="Equipment mapping" right={<TextInput id="sap-map-search" ariaLabel="Search machines, equipment or functional locations" value={q} onChange={setQ} placeholder="Search machine, equipment or location" />}>
            <div className="ui-table-container ast-table pm-table">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th className="pm-grow">ULTRON machine</th>
                    <th>SAP equipment</th>
                    <th>Functional location</th>
                    <th>Work centre</th>
                    <th>In SAP?</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.machineId} className={`is-clickable ${focusMachine === r.machineId ? "active" : ""}`} onClick={() => ctx.setMachineId(r.machineId)}>
                      <td className="pm-grow">
                        <ItemCell icon={PM_ICON.wo} title={machineName(r.machineId)} sub={r.machineName} />
                      </td>
                      <td className="ast-num">{sapNumber(r.sapEquipmentId) ?? "—"}</td>
                      <td className="ast-num">{r.functionalLocation ?? "—"}</td>
                      <td className="ast-num">{r.workCenter ?? "—"}</td>
                      <td>{!r.sapEquipmentId ? <StateWord label="Not mapped" tone="warn" /> : !m.synced ? <span className="pm-muted">Not synced</span> : inSap(r.sapEquipmentId) ? <StateWord label="Found" /> : <StateWord label="Not in SAP" tone="warn" />}</td>
                      <td className="sap-actions" onClick={(e) => e.stopPropagation()}>
                        <PillButton variant="secondary" className="pg-diag-sm" onClick={() => setEdit(r)}>
                          {r.sapEquipmentId ? "Edit" : "Map"}
                        </PillButton>
                        {r.sapEquipmentId && <ConfirmAction label="Unmap" question="Remove this machine's SAP equipment?" confirmLabel="Unmap" busy={busy === r.machineId} onConfirm={() => void unmap(r.machineId)} ariaLabel={`Unmap ${r.machineName}`} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="sap-suggest" title="Suggested matches" right={suggestions.length > 1 ? <PillButton variant="secondary" loading={busy === "suggest"} onClick={() => void confirm(suggestions)}>Confirm all</PillButton> : undefined}>
            {!m.synced ? (
              <Empty title="Sync to read SAP's equipment list first." />
            ) : suggestions.length === 0 ? (
              <Empty title="No matches waiting.">Unmapped machines with no likely SAP equipment can be mapped by hand.</Empty>
            ) : (
              <ul className="sap-cards">
                {suggestions.map((s) => (
                  <li key={s.e.machineId}>
                    <div className="sap-card-head">
                      <b>
                        {machineName(s.e.machineId)} → {sapNumber(field(s.r, "Equipment"))}
                      </b>
                      <span className="ast-num pm-muted">{Math.round(s.score * 100)} % match</span>
                    </div>
                    <span className="ast-cell-sub">
                      {field(s.r, "EquipmentName")} · {field(s.r, "FunctionalLocation")}
                    </span>
                    <Bar share={s.score} />
                    <PillButton variant="secondary" className="pg-diag-sm" loading={busy === "suggest"} onClick={() => void confirm([s])}>
                      Confirm
                    </PillButton>
                  </li>
                ))}
              </ul>
            )}
            <p className="pm-note">A person always confirms a match: notifications go to the mapped equipment.</p>
          </Section>
        </div>

        {focusMachine && <PointsPanel ctx={ctx} model={m} machine={focusMachine} />}
      </div>
      <EquipmentMappingDialog open={edit !== null} onClose={() => setEdit(null)} plantId={plantId} row={edit} />
    </>
  );
}

/** One machine's readings and the SAP measuring points they are written to. */
function PointsPanel({ ctx, model, machine }: { ctx: ViewCtx; model: SapModel; machine: string }) {
  const { dash, plantId } = ctx;
  const [busy, setBusy] = useState<"link" | "publish" | null>(null);
  const eq = model.eqOf(machine);
  const points = dash.points.filter((p) => p.machineId === machine);
  const sapPoints = model.measuringPoints.filter((r) => eq && sameSapNumber(field(r, "TechnicalObject", "Equipment"), eq));
  const suggest = (name: string) => sapPoints.find((r) => (field(r, "MeasuringPointDescription") ?? "").toUpperCase() === name.slice(0, 40).toUpperCase());
  const linkable = points.filter((p) => !p.sapPoint && suggest(p.name));
  const link = async () => {
    setBusy("link");
    const out = await sapCall("/mappings/points", "PUT", { plantId, rows: linkable.map((p) => ({ measurementId: p.measurementId, sapPoint: field(suggest(p.name)!, "MeasuringPoint") })) }, "Could not link the readings");
    setBusy(null);
    if ("error" in out) ctx.setNotice({ tone: "bad", text: out.error });
  };
  const publish = async () => {
    setBusy("publish");
    const out = await sapCall<{ sent: number; failed: number; unchanged: number }>("/publish", "POST", { plantId }, "Could not write the readings");
    setBusy(null);
    if ("error" in out) ctx.setNotice({ tone: "bad", text: out.error });
    else ctx.setNotice({ tone: out.data.failed ? "bad" : "good", text: `${out.data.sent} readings written to SAP${out.data.failed ? `, ${out.data.failed} will be tried again` : ""}${out.data.unchanged ? `; ${out.data.unchanged} had no new reading` : ""}.` });
  };
  const linked = points.filter((p) => p.sapPoint);
  return (
    <Section
      id="sap-points"
      title={`${machineName(machine)} · readings to SAP measuring points`}
      right={
        <span className="sap-actions">
          {linkable.length > 0 && (
            <PillButton variant="secondary" loading={busy === "link"} onClick={() => void link()}>
              Link {linkable.length} suggested
            </PillButton>
          )}
          {dash.points.some((p) => p.sapPoint) && (
            <PillButton variant="secondary" loading={busy === "publish"} onClick={() => void publish()}>
              Write latest readings now
            </PillButton>
          )}
        </span>
      }
    >
      {!eq ? (
        <Empty title="Map this machine to its SAP equipment first." />
      ) : (
        <>
          <p className="pm-note">
            {linked.length} of {points.length} readings go to SAP
            {dash.connection?.publishEveryMin ? `, every ${dash.connection.publishEveryMin} min` : " when written by hand (set an interval in Connection)"}.
          </p>
          <div className="ui-table-container ast-table pm-table sap-scroll">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th className="pm-grow">Reading</th>
                  <th>SAP point</th>
                  <th>Last written</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => {
                  const s = !p.sapPoint ? suggest(p.name) : null;
                  return (
                    <tr key={p.measurementId}>
                      <td className="ast-num pm-muted">{p.tag}</td>
                      <td className="pm-grow">
                        {p.name}
                        {p.unit ? <span className="pm-muted"> · {p.unit}</span> : null}
                      </td>
                      <td className="ast-num">{p.sapPoint ?? (s ? <span className="pm-muted">{field(s, "MeasuringPoint")} suggested</span> : "—")}</td>
                      <td>{p.lastSentAt ? <StateWord label={p.lastSentState === "completed" ? ctx.when(p.lastSentAt) : OUTBOX_WORD[p.lastSentState ?? "pending"].label} tone={p.lastSentState === "completed" ? undefined : OUTBOX_WORD[p.lastSentState ?? "pending"].tone} /> : <span className="pm-muted">{p.sapPoint ? "Not yet" : "Not linked"}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

/* -------------------------------------------------------------- maintenance */

export function SapMaintenance(ctx: ViewCtx) {
  const { dash, plantId, when } = ctx;
  const m = useSapModel(dash, ctx.pms.findings, ctx.machineId);
  const [busy, setBusy] = useState<number | null>(null);
  const [selKey, setSelKey] = useState<string | null>(null);

  type Card = { key: string; title: string; detail: string; meta: string; tone?: Tone; thread?: Thread; order?: SapOrder };
  const review: Card[] = m.threads
    .filter((t) => !t.job && t.finding)
    .map((t) => ({ key: `r|${t.machineId}|${t.finding!.ruleId}`, title: `${machineName(t.machineId)} · ${t.title}`, detail: `Confidence ${Math.round(t.finding!.confidence)} %${t.finding!.timeToLimit && t.finding!.timeToLimit !== "—" ? ` · limit in ${t.finding!.timeToLimit}` : ""}`, meta: t.finding!.priority, tone: priorityTone(t.finding!.priority) === "idle" ? undefined : priorityTone(t.finding!.priority), thread: t }));
  const notified: Card[] = m.notifications
    .filter((n) => n.open && !n.order)
    .map((n) => {
      const t = m.threads.find((x) => x.notification && sameSapNumber(x.notification.number, n.number));
      return { key: `n|${n.number}`, title: `${n.machineId ? machineName(n.machineId) : "—"} · ${n.text}`, detail: `Notification ${sapNumber(n.number)}${n.priority ? ` · priority ${n.priority}` : ""}${t ? " · from ULTRON" : n.reportedBy ? ` · ${n.reportedBy}` : ""}`, meta: n.created ? when(n.created) : "—", thread: t };
    });
  const executing: Card[] = m.orders
    .filter((o) => o.stage === "created" || o.stage === "released" || o.stage === "working")
    .map((o) => ({ key: `o|${o.number}`, title: `${o.machineId ? machineName(o.machineId) : "—"} · ${o.description}`, detail: `Order ${sapNumber(o.number)} · ${ORDER_WORD[o.stage].toLowerCase()}${o.parts.length ? ` · parts ${Math.round(kitShare(o) * 100)} % ready` : ""}`, meta: o.start ? when(o.start) : "—", tone: kitShare(o) < 1 ? ("warn" as Tone) : undefined, order: o, thread: m.threads.find((x) => x.order?.number === o.number) }));
  const verifying: Card[] = m.orders
    .filter((o) => o.stage === "verifying")
    .map((o) => ({ key: `v|${o.number}`, title: `${o.machineId ? machineName(o.machineId) : "—"} · ${o.description}`, detail: `Order ${sapNumber(o.number)} technically done`, meta: o.finish ? `since ${when(o.finish)}` : "—", tone: "info" as Tone, order: o, thread: m.threads.find((x) => x.order?.number === o.number) }));
  const lanes = [
    { title: "ULTRON review", cards: review, tone: review.length ? ("warn" as Tone) : undefined },
    { title: "SAP notification", cards: notified },
    { title: "Order execution", cards: executing },
    { title: "Verification", cards: verifying },
  ];
  const all = lanes.flatMap((l) => l.cards);
  const sel = all.find((c) => c.key === selKey) ?? all[0] ?? null;
  // ULTRON's priority and SAP's disagree: the planner changed it in SAP.
  const mismatches = m.threads.filter((t) => t.finding && t.notification?.priority && t.notification.priority !== t.finding.priority.replace("P", ""));
  const sent = dash.outbox.filter((o) => o.resource === "notifications" && (!ctx.machineId || o.machineId === ctx.machineId) && o.state !== "completed");
  const retry = async (id: number) => {
    setBusy(id);
    const out = await sapCall(`/outbox/${id}/retry`, "POST", { plantId }, "Could not send it again");
    setBusy(null);
    if ("error" in out) ctx.setNotice({ tone: "bad", text: out.error });
  };

  return (
    <>
      <KpiStrip
        page
        label="Maintenance summary"
        items={[
          { label: "Awaiting a decision", value: `${review.length}`, tone: review.length ? "warn" : undefined, foot: "problems not raised in SAP" },
          { label: "SAP notifications", value: m.synced ? `${m.notifications.filter((n) => n.open).length}` : "—", foot: `${m.notifications.filter((n) => n.open && n.order).length} linked to orders` },
          { label: "Orders in execution", value: m.synced ? `${m.orders.filter((o) => o.stage === "working").length}` : "—", foot: `${m.orders.filter((o) => o.stage === "released" || o.stage === "created").length} planned next` },
          { label: "Status mismatches", value: `${mismatches.length}`, tone: mismatches.length ? "warn" : undefined, foot: mismatches.length ? "SAP planner changed the priority" : "ULTRON and SAP agree" },
        ]}
      />
      <div className="pg-frame-body sap-stack">
        <Section id="sap-lanes" title="Live maintenance lifecycle" right={<span className="pm-muted">Each card is one ULTRON → SAP thread</span>}>
          <div className="sap-lanes">
            {lanes.map((l) => (
              <div key={l.title} className="sap-lane">
                <div className="sap-lane-head">
                  <b>{l.title}</b>
                  <span className="opc-app-count" data-tone={l.tone}>
                    {l.cards.length}
                  </span>
                </div>
                {l.cards.length === 0 ? (
                  <p className="pm-muted sap-lane-empty">Nothing here</p>
                ) : (
                  l.cards.slice(0, 6).map((c) => (
                    <button key={c.key} type="button" className="sap-lane-card" data-active={sel?.key === c.key || undefined} onClick={() => setSelKey(c.key)}>
                      <span className="sap-lane-title">{c.title}</span>
                      <span className="ast-cell-sub">{c.detail}</span>
                      <span className="sap-lane-meta">
                        <StateWord label={c.meta} tone={c.tone} />
                      </span>
                    </button>
                  ))
                )}
                {l.cards.length > 6 && <p className="pm-muted sap-lane-empty">{l.cards.length - 6} more</p>}
              </div>
            ))}
          </div>
        </Section>

        <div className="pm-split is-even">
          <Section id="sap-selected" title={sel ? sel.title : "Selected"}>
            {!sel ? (
              <Empty title="Nothing to follow yet." />
            ) : sel.thread ? (
              <>
                {sel.thread.finding?.plainWhat && <p className="pm-note">{sel.thread.finding.plainWhat}</p>}
                <ThreadSteps ctx={ctx} t={sel.thread} />
                {!sel.thread.job && sel.thread.finding && m.eqOf(sel.thread.machineId) && <RaiseButton ctx={ctx} f={sel.thread.finding} primary />}
              </>
            ) : sel.order ? (
              <OrderFacts ctx={ctx} o={sel.order} />
            ) : (
              <p className="pm-note">{sel.detail}. Raised in SAP; the SAP planner makes the order.</p>
            )}
          </Section>

          <Section id="sap-object-thread" title="SAP objects">
            {sel?.order || sel?.thread?.order ? (
              <OrderFacts ctx={ctx} o={(sel.order ?? sel.thread!.order)!} parts />
            ) : sent.length ? (
              <Rows
                items={sent.map((o) => ({
                  key: String(o.id),
                  left: o.title ?? "Notification",
                  sub: [o.machineId ? machineName(o.machineId) : null, o.lastError].filter(Boolean).join(" · "),
                  tone: OUTBOX_WORD[o.state].tone,
                  right: (
                    <PillButton variant="secondary" className="pg-diag-sm" loading={busy === o.id} onClick={() => void retry(o.id)}>
                      Send again
                    </PillButton>
                  ),
                }))}
              />
            ) : (
              <Empty title="No order yet for this one." />
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

function OrderFacts({ ctx, o, parts }: { ctx: ViewCtx; o: SapOrder; parts?: boolean }) {
  return (
    <>
      <Rows
        items={[
          { key: "n", left: o.notification ? `Notification ${sapNumber(o.notification)}` : "No notification (planned in SAP)", sub: "Text written by ULTRON when raised from a problem" },
          { key: "o", left: `Order ${sapNumber(o.number)} · ${o.type ?? ""}`, sub: `Priority${o.priority ? ` ${o.priority}` : " —"} and schedule are SAP's`, right: <StateWord label={o.status ?? ORDER_WORD[o.stage]} tone={ORDER_TONE[o.stage]} /> },
          { key: "s", left: `Planned ${o.start ? ctx.when(o.start) : "—"} → ${o.finish ? ctx.when(o.finish) : "—"}`, sub: o.workCenter ? `Work centre ${o.workCenter}` : undefined, right: o.stage === "working" && o.start && o.finish ? <Bar share={(ctx.dash && Date.now() - o.start) / (o.finish - o.start)} tone="info" /> : undefined },
          { key: "v", left: o.stage === "verifying" ? "ULTRON watches the readings after the repair" : o.stage === "closed" ? "Closed in SAP" : "Check after the repair: once SAP confirms the work", tone: o.stage === "verifying" ? "info" : undefined },
        ]}
      />
      {parts && o.parts.length > 0 && (
        <p className="pm-note">
          Parts: {o.parts.filter((p) => p.available >= p.need).length} of {o.parts.length} ready ({o.parts.map((p) => `${p.description ?? p.material} ${qty(p.available, p.unit)}/${qty(p.need, p.unit)}`).join(", ")}).
        </p>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- materials */

export function SapMaterials(ctx: ViewCtx) {
  const { dash, plantId, machineId } = ctx;
  const m = useSapModel(dash, ctx.pms.findings, machineId);
  const [selNo, setSelNo] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ row: SapMaterialMapping | null } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const withParts = m.orders.filter((o) => o.stage !== "closed" && o.stage !== "verifying" && o.parts.length);
  const ready = withParts.filter((o) => kitShare(o) === 1);
  const partial = withParts.filter((o) => kitShare(o) < 1);
  const sel = withParts.find((o) => o.number === selNo) ?? partial[0] ?? withParts[0] ?? null;
  const shortPart = sel?.parts.find((p) => p.available < p.need) ?? null;
  const rows = dash.materials.filter((x) => !machineId || x.machineId === machineId);
  const remove = async (id: number) => {
    setBusy(id);
    const out = await sapCall(`/mappings/materials/${id}`, "DELETE", { plantId }, "Could not remove it");
    setBusy(null);
    if ("error" in out) ctx.setNotice({ tone: "bad", text: out.error });
  };
  const machinesWithKit = new Set(withParts.map((o) => o.machineId));
  const stockOf = (mat: string) => m.stock.get(sapNumber(mat) ?? mat) ?? null;

  return (
    <>
      <KpiStrip
        page
        label="Materials summary"
        items={[
          { label: "Ready orders", value: m.synced ? `${ready.length}` : "—", foot: "every part in stock or issued" },
          { label: "Partly ready", value: m.synced ? `${partial.length}` : "—", tone: partial.length ? "warn" : undefined, foot: partial.length ? `waiting for ${partial.flatMap((o) => o.parts.filter((p) => p.available < p.need)).length} parts` : "no order short of parts" },
          { label: "Materials in stock", value: m.synced ? `${[...m.stock.values()].filter((s) => s.total > 0).length}` : "—", unit: `of ${m.stock.size}`, foot: dash.connection?.sapPlant ? `SAP plant ${dash.connection.sapPlant}` : "all plants SAP returned" },
          { label: "Machines with work", value: `${machinesWithKit.size}`, foot: "orders that need parts" },
        ]}
      />
      <div className="pg-frame-body sap-stack">
        <div className="pm-split is-wide-side">
          <Section id="sap-kit" title={sel ? `${sel.machineId ? machineName(sel.machineId) : "—"} · order ${sapNumber(sel.number)} parts` : "Order parts"} right={sel ? <StateWord label={`${Math.round(kitShare(sel) * 100)} % ready`} tone={kitShare(sel) < 1 ? "warn" : undefined} /> : undefined}>
            {withParts.length > 1 && (
              <div className="sap-pick">
                <PillNav ariaLabel="Order" items={withParts.slice(0, 8).map((o) => ({ id: o.number, label: `${sapNumber(o.number)}${kitShare(o) < 1 ? " ·" : ""}` }))} activeId={sel?.number ?? ""} onChange={setSelNo} />
              </div>
            )}
            {!sel ? (
              <Empty title={m.synced ? "No open order needs parts." : "Sync to read SAP's orders."} />
            ) : (
              <>
                <p className="pm-note">{sel.description} · {ORDER_WORD[sel.stage].toLowerCase()}{sel.start ? ` · starts ${ctx.when(sel.start)}` : ""}</p>
                <div className="ui-table-container ast-table pm-table">
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th className="pm-grow">Part</th>
                        <th>SAP material</th>
                        <th>Available</th>
                        <th>Needed</th>
                        <th>Readiness</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sel.parts.map((p) => (
                        <tr key={`${p.material}-${p.sloc}`}>
                          <td className="pm-grow">{p.description ?? p.material}</td>
                          <td className="ast-num">
                            {p.material}
                            {p.sloc ? ` · ${p.sloc}` : ""}
                          </td>
                          <td className="ast-num">
                            {qty(p.available, p.unit)}
                            <Bar share={p.need ? p.available / p.need : 1} tone={p.available < p.need ? "bad" : undefined} />
                          </td>
                          <td className="ast-num">{qty(p.need, p.unit)}</td>
                          <td>{p.available >= p.need ? <StateWord label="Ready" /> : <StateWord label={`Short by ${qty(p.need - p.available, p.unit)}`} tone="bad" />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Section>

          <Section id="sap-shortage" title="Shortage" right={shortPart ? <StateWord label="Action needed" tone="bad" /> : undefined}>
            {!shortPart ? (
              <Empty title="Nothing short on this order." />
            ) : (
              <>
                <p className="pm-note">
                  {shortPart.description ?? shortPart.material}: need {qty(shortPart.need, shortPart.unit)}, available {qty(shortPart.available, shortPart.unit)}.
                </p>
                <Rows items={(stockOf(shortPart.material)?.bySloc ?? []).map((s) => ({ key: s.sloc, left: `Store ${s.sloc}`, right: <span className="ast-num">{qty(s.qty, shortPart.unit)}</span>, tone: s.qty <= 0 ? "bad" : undefined }))} />
                <p className="pm-note">Reservations, purchase orders and goods issues stay in SAP. ULTRON does not change stock.</p>
              </>
            )}
          </Section>
        </div>

        <Section
          id="sap-materials"
          title="Spare parts by machine"
          right={
            <PillButton variant="secondary" icon={PM_ICON.plan} onClick={() => setEdit({ row: null })}>
              Add a spare part
            </PillButton>
          }
        >
          {rows.length === 0 ? (
            <Empty title="No spare parts listed for the machines yet.">Add the SAP material numbers each machine&apos;s parts use to watch their stock.</Empty>
          ) : (
            <div className="ui-table-container ast-table pm-table">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th className="pm-grow">Part</th>
                    <th>Material</th>
                    <th>Needed</th>
                    <th>In stock</th>
                    <th>State</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((x) => {
                    const s = stockOf(x.sapMaterial);
                    const short = s && x.requiredQuantity !== null && s.total < x.requiredQuantity;
                    return (
                      <tr key={x.id}>
                        <td className="pm-grow">
                          <ItemCell icon={PM_ICON.wo} tone={short ? "warn" : undefined} title={x.description} sub={[machineName(x.machineId), x.partName].filter(Boolean).join(" · ")} />
                        </td>
                        <td className="ast-num">{x.sapMaterial}</td>
                        <td className="ast-num">{qty(x.requiredQuantity, x.unit)}</td>
                        <td className="ast-num">{s ? qty(s.total, s.unit) : "—"}</td>
                        <td>{!m.synced ? <span className="pm-muted">Not synced</span> : !s ? <StateWord label="Not in SAP stock" tone="warn" /> : short ? <StateWord label="Short" tone="warn" /> : <StateWord label="Enough" />}</td>
                        <td className="sap-actions">
                          <PillButton variant="secondary" className="pg-diag-sm" onClick={() => setEdit({ row: x })}>
                            Edit
                          </PillButton>
                          <ConfirmAction label="Remove" question="Remove this spare part?" confirmLabel="Remove" busy={busy === x.id} onConfirm={() => void remove(x.id)} ariaLabel={`Remove ${x.description}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
      <MaterialMappingDialog open={edit !== null} onClose={() => setEdit(null)} plantId={plantId} dash={dash} row={edit?.row ?? null} machineIds={dash.equipment.map((e) => e.machineId)} defaultMachine={machineId} />
    </>
  );
}

/* --------------------------------------------------------------- production */

const DAY = 24 * H;

export function SapProduction(ctx: ViewCtx) {
  const { dash, pms } = ctx;
  const m = useSapModel(dash, pms.findings, null);
  const now = m.now;
  const horizon = now + 7 * DAY;
  // The machine the orders run on (or the picked one).
  const lineMachine = ctx.machineId ?? m.production.find((p) => p.machineId)?.machineId ?? null;
  const orders = m.production.filter((p) => p.end !== null && p.start !== null && p.end > now - 6 * H && p.start < horizon);
  const active = orders.find((p) => p.start! <= now && p.end! > now) ?? orders.find((p) => p.start! > now) ?? null;
  const risks = pms.findings.filter((f) => f.status === "ACTIVE" && (!lineMachine || f.machineId === lineMachine));
  const worst = [...risks].sort((a, b) => a.priority.localeCompare(b.priority))[0] ?? null;
  const ttl = risks.map((f) => hoursIn(f.timeToLimit)).filter((h): h is number => h !== null);
  const boundary = ttl.length ? now + Math.min(...ttl) * H : null;
  const serviceHours = Math.max(1, ...m.orders.filter((o) => o.machineId === lineMachine && o.stage !== "closed" && o.start && o.finish).map((o) => (o.finish! - o.start!) / H));
  // Idle gaps between orders long enough for the service, before the risk boundary.
  const gaps: { start: number; end: number }[] = [];
  let t = now;
  for (const o of orders.filter((p) => p.end! > now)) {
    if (o.start! - t >= serviceHours * H) gaps.push({ start: t, end: o.start! });
    t = Math.max(t, o.end!);
  }
  if (horizon - t >= serviceHours * H) gaps.push({ start: t, end: horizon });
  const window = gaps.find((g) => boundary === null || g.start + serviceHours * H <= boundary) ?? null;
  const exposed = boundary === null ? [] : orders.filter((o) => o.end! > boundary);
  const exposedQty = exposed.reduce((s, o) => s + Math.max(0, (o.quantity ?? 0) - (o.confirmed ?? 0)), 0);
  const unit = orders[0]?.unit ?? null;
  const openOrder = m.orders.find((o) => o.machineId === lineMachine && (o.stage === "created" || o.stage === "released")) ?? null;
  const pos = (x: number) => `${((Math.max(now, Math.min(horizon, x)) - now) / (horizon - now)) * 100}%`;
  const width = (a: number, b: number) => `${((Math.min(horizon, b) - Math.max(now, a)) / (horizon - now)) * 100}%`;

  if (!m.synced) return <section className="ast-card"><Empty title="Sync to read SAP's production orders." /></section>;

  return (
    <>
      <div className="sap-signals">
        <div className="ast-card sap-signal">
          <span className="ast-caption">Machine constraint</span>
          <StateWord label={worst ? `${machineName(worst.machineId)} · ${worst.plainTitle || worst.name}` : lineMachine ? `${machineName(lineMachine)} · no open problem` : "—"} tone={worst ? (worst.severity === "Critical" ? "bad" : "warn") : undefined} />
        </div>
        <div className="ast-card sap-signal">
          <span className="ast-caption">Safe run envelope</span>
          <b>{boundary ? `${hoursWord((boundary - now) / H)} to the first limit` : "No limit in sight"}</b>
        </div>
        <div className="ast-card sap-signal">
          <span className="ast-caption">Service window</span>
          <StateWord label={window ? `${ctx.when(window.start)} · ${hoursWord((window.end - window.start) / H)} free` : "No free window this week"} tone={window ? undefined : "warn"} />
        </div>
      </div>
      <KpiStrip
        page
        label="Production summary"
        items={[
          { label: "Active SAP order", value: active ? (sapNumber(active.number) ?? "—") : "—", text: true, foot: active ? `${active.description ?? active.material ?? ""} · ${active.delivered ? "delivered" : active.released ? "released" : "created"}` : "no order running" },
          { label: "Order progress", value: active && active.quantity ? `${Math.round(((active.confirmed ?? 0) / active.quantity) * 100)}` : "—", unit: "%", bar: active && active.quantity ? ((active.confirmed ?? 0) / active.quantity) * 100 : 0, foot: active ? `${qty(active.confirmed, null)} / ${qty(active.quantity, active.unit)}` : "—" },
          { label: "Orders exposed", value: `${exposed.length}`, tone: exposed.length ? "warn" : undefined, foot: boundary ? "run past the first limit" : "no limit this week" },
          { label: "Output at risk", value: qty(Math.round(exposedQty), null), unit: unit ?? undefined, tone: exposedQty ? "warn" : undefined, foot: window ? "protected by servicing in the window" : "—" },
        ]}
      />
      <div className="pg-frame-body sap-stack">
        <Section id="sap-schedule" title="Schedule · next 7 days" right={boundary ? <StateWord label={`First limit ${ctx.when(boundary)}`} tone="warn" /> : undefined}>
          <div className="sap-timeline" role="img" aria-label="Production orders, free time, service window and risk boundary over the next 7 days">
            <div className="sap-tl-days">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} style={{ left: `${(i / 7) * 100}%` }}>
                  {i === 0 ? "Now" : new Date(now + i * DAY).toLocaleDateString("en-GB", { weekday: "short" })}
                </span>
              ))}
            </div>
            <div className="sap-tl-row">
              {orders.map((o) => (
                <span key={o.number} className="sap-tl-block" data-kind="production" style={{ left: pos(o.start!), width: width(o.start!, o.end!) }} title={`${sapNumber(o.number)} · ${o.description ?? o.material} · ${qty(o.quantity, o.unit)}`}>
                  {sapNumber(o.number)}
                </span>
              ))}
              {window && (
                <span className="sap-tl-block" data-kind="service" style={{ left: pos(window.start), width: width(window.start, window.start + serviceHours * H) }} title={`Service ${hoursWord(serviceHours)}`}>
                  Service {hoursWord(serviceHours)}
                </span>
              )}
              {boundary && boundary < horizon && <span className="sap-tl-risk" style={{ left: pos(boundary), width: width(boundary, horizon) }} title="Past the first limit" />}
            </div>
          </div>
          <p className="pm-note">
            {window
              ? `Best time to service: ${ctx.when(window.start)}. No order moves; ${hoursWord((window.end - window.start) / H)} free; ${exposed.length ? `${exposed.length} later orders protected` : "the week stays safe"}.`
              : "No free time long enough before the first limit: a planner would have to move an order."}
          </p>
        </Section>

        <div className="pm-split is-even">
          <Section id="sap-impact" title="Order impact">
            {orders.length === 0 ? (
              <Empty title="SAP has no production orders this week." />
            ) : (
              <div className="ui-table-container ast-table pm-table">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th className="pm-grow">Product</th>
                      <th>Window</th>
                      <th>Progress</th>
                      <th>Exposure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const share = o.quantity ? (o.confirmed ?? 0) / o.quantity : 0;
                      const over = boundary !== null && o.end! > boundary;
                      const crosses = over && o.start! < boundary!;
                      return (
                        <tr key={o.number}>
                          <td className="ast-num">{sapNumber(o.number)}</td>
                          <td className="pm-grow">
                            <span className="ast-cell-stack">
                              <span>{o.description ?? o.material ?? "—"}</span>
                              <span className="ast-cell-sub">{qty(o.quantity, o.unit)}</span>
                            </span>
                          </td>
                          <td className="ast-num pm-muted">{ctx.when(o.start)}</td>
                          <td>
                            <Bar share={share} />
                          </td>
                          <td>{o.delivered ? <StateWord label="Done" /> : crosses ? <StateWord label="Crosses the limit" tone="bad" /> : over ? <StateWord label="After the limit" tone="warn" /> : <StateWord label="Protected" />}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section id="sap-decision" title="Decision">
            <div className="sap-scenarios">
              <div className="sap-scenario" data-tone={exposed.length ? "bad" : undefined}>
                <b>Run unchanged</b>
                <span>{exposed.length} orders run past the first limit</span>
                <span>{qty(Math.round(exposedQty), unit)} output exposed</span>
              </div>
              <div className="sap-scenario" data-tone={window ? "good" : undefined}>
                <b>Service in the window{window ? " · suggested" : ""}</b>
                <span>{window ? "0 orders moved" : "No window before the limit"}</span>
                <span>{openOrder ? `SAP order ${sapNumber(openOrder.number)} parts ${Math.round(kitShare(openOrder) * 100)} % ready` : "No maintenance order in SAP yet"}</span>
              </div>
            </div>
            <Rows
              items={[
                { key: "c", left: "Production clearance", right: <StateWord label={window ? "No order moved" : "Needs a planner"} tone={window ? undefined : "warn"} /> },
                { key: "o", left: "Maintenance order in SAP", right: <StateWord label={openOrder ? `${sapNumber(openOrder.number)} · ${ORDER_WORD[openOrder.stage].toLowerCase()}` : "None yet"} tone={openOrder ? undefined : "warn"} /> },
                { key: "p", left: "Parts", right: <StateWord label={openOrder ? `${Math.round(kitShare(openOrder) * 100)} % ready` : "—"} tone={openOrder && kitShare(openOrder) < 1 ? "warn" : undefined} /> },
              ]}
            />
            <p className="pm-note">ULTRON never moves or releases an SAP order; the planner does.</p>
          </Section>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- sync & audit */

export function SapAudit(ctx: ViewCtx) {
  const { dash, plantId, when } = ctx;
  const [busy, setBusy] = useState<number | "all" | null>(null);
  const waiting = dash.outbox.filter((o) => o.state !== "completed");
  const recent = dash.audit.filter((a) => a.direction !== "internal");
  const ok = recent.filter((a) => a.status !== "failed").length;
  const lat = recent.map((a) => a.durationMs).filter((x): x is number => x !== null).sort((a, b) => a - b);
  const median = lat.length ? lat[Math.floor(lat.length / 2)] : null;
  const p95 = lat.length ? lat[Math.min(lat.length - 1, Math.floor(lat.length * 0.95))] : null;
  const health = useMemo(
    () =>
      dash.vocabulary.resources.map((r) => {
        const last = dash.audit.find((a) => a.resource === r.id && a.direction !== "internal");
        return { r, last };
      }),
    [dash],
  );
  const retry = async (id: number) => {
    setBusy(id);
    const out = await sapCall(`/outbox/${id}/retry`, "POST", { plantId }, "Could not send it again");
    setBusy(null);
    if ("error" in out) ctx.setNotice({ tone: "bad", text: out.error });
  };
  const sendDue = async () => {
    setBusy("all");
    const out = await sapCall<{ processed: number }>("/outbox/process", "POST", { plantId }, "Could not send the waiting writes");
    setBusy(null);
    if ("error" in out) ctx.setNotice({ tone: "bad", text: out.error });
    else ctx.setNotice({ tone: "good", text: out.data.processed ? `Tried ${out.data.processed} waiting writes.` : "Nothing is due to send yet." });
  };
  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["When", "What", "Direction", "Status", "HTTP", "ms", "Who", "Trace"].join(","), ...dash.audit.map((a) => [a.at, auditText(dash, a), a.direction, a.status, a.httpStatus, a.durationMs, a.user ?? "System", a.correlationId].map(esc).join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `sap-log-${plantId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <KpiStrip
        page
        label="Sync summary"
        items={[
          { label: "Success rate", value: recent.length ? `${Math.round((ok / recent.length) * 1000) / 10}` : "—", unit: "%", tone: recent.length && ok / recent.length < 0.95 ? "warn" : undefined, foot: `${ok} of ${recent.length} recent exchanges` },
          { label: "Median SAP time", value: median !== null ? `${median}` : "—", unit: "ms", foot: p95 !== null ? `95 % within ${p95} ms` : "—" },
          { label: "Queue", value: `${waiting.length}`, tone: waiting.some((o) => o.state === "failed") ? "bad" : waiting.length ? "warn" : undefined, foot: "writes waiting or retrying" },
          { label: "Sync", value: dash.connection?.syncEveryMin ? `${dash.connection.syncEveryMin}` : "By hand", unit: dash.connection?.syncEveryMin ? "min" : undefined, text: !dash.connection?.syncEveryMin, foot: dash.syncRuns[0] ? `last ${when(dash.syncRuns[0].startedAt)}` : "never synced" },
        ]}
      />
      <div className="pg-frame-body sap-stack">
        <Section id="sap-health" title="Interface health">
          <div className="sap-health">
            {health.map(({ r, last }) => (
              <div key={r.id} className="sap-health-tile">
                <b>{r.label}</b>
                <StateWord label={!last ? "Not used yet" : last.status === "failed" ? `Failing${last.httpStatus ? ` · ${last.httpStatus}` : ""}` : last.status === "warning" ? "Partly" : `${last.httpStatus ?? "OK"}${last.durationMs !== null ? ` · ${last.durationMs} ms` : ""}`} tone={last?.status === "failed" ? "bad" : last?.status === "warning" ? "warn" : undefined} />
                <span className="ast-cell-sub">
                  {r.apiName}
                  {last ? ` · ${when(last.at)}` : ""}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <div className="pm-split is-even">
          <Section id="sap-runs" title="Syncs">
            {dash.syncRuns.length === 0 ? (
              <Empty title="No sync yet." />
            ) : (
              <Rows
                items={dash.syncRuns.map((r) => ({
                  key: String(r.id),
                  left: !r.finishedAt ? "Running" : r.failed.length ? `Could not read ${r.failed.map((f) => resourceLabel(dash, f.resource).toLowerCase()).join(", ")}` : r.truncated.length ? `Done; more ${r.truncated.map((x) => resourceLabel(dash, x).toLowerCase()).join(", ")} left in SAP` : "Done",
                  sub: `${r.records} records · ${r.requestedBy ?? "Schedule"}`,
                  tone: r.failed.length ? "bad" : r.truncated.length ? "warn" : undefined,
                  right: <span className="pm-muted ast-num">{when(r.startedAt)}</span>,
                }))}
              />
            )}
          </Section>
          <Section id="sap-outbox" title="Waiting to send" right={waiting.length > 0 ? <PillButton variant="secondary" loading={busy === "all"} onClick={() => void sendDue()}>Send due now</PillButton> : undefined}>
            {waiting.length === 0 ? (
              <Empty title="Nothing waiting: every write reached SAP." />
            ) : (
              <Rows
                items={waiting.map((o) => ({
                  key: String(o.id),
                  left: `${o.title ?? resourceLabel(dash, o.resource)} · ${OUTBOX_WORD[o.state].label.toLowerCase()}`,
                  sub: [`try ${o.attempts} of 6`, o.state !== "failed" && o.nextAttemptAt ? `next ${when(o.nextAttemptAt)}` : null, o.lastError].filter(Boolean).join(" · "),
                  tone: OUTBOX_WORD[o.state].tone,
                  right: (
                    <PillButton variant="secondary" className="pg-diag-sm" loading={busy === o.id} onClick={() => void retry(o.id)}>
                      Send again
                    </PillButton>
                  ),
                }))}
              />
            )}
          </Section>
        </div>

        <Section id="sap-log" title="Log" right={dash.audit.length ? <PillButton variant="secondary" onClick={exportCsv}>Export CSV</PillButton> : undefined}>
          {dash.audit.length === 0 ? (
            <Empty title="Nothing logged yet." />
          ) : (
            <div className="ui-table-container ast-table pm-table">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th className="pm-grow">What</th>
                    <th>Direction</th>
                    <th>Answer</th>
                    <th>Who</th>
                    <th title="Reference SAP support can look up">Trace</th>
                  </tr>
                </thead>
                <tbody>
                  {dash.audit.map((a) => (
                    <tr key={a.id}>
                      <td className="ast-num">{when(a.at)}</td>
                      <td className="pm-grow">
                        <StateWord label={auditText(dash, a)} tone={a.status === "failed" ? "bad" : a.status === "warning" ? "warn" : undefined} />
                      </td>
                      <td className="pm-muted">{a.direction === "to_sap" ? "To SAP" : a.direction === "from_sap" ? "From SAP" : "In ULTRON"}</td>
                      <td className="ast-num pm-muted">{[a.httpStatus, a.durationMs !== null ? `${a.durationMs} ms` : null].filter((x) => x !== null).join(" · ") || "—"}</td>
                      <td className="pm-muted">{a.user ?? "System"}</td>
                      <td className="ast-num pm-muted" title={a.correlationId ?? undefined}>
                        {a.correlationId ? `${a.correlationId.slice(0, 8)}…` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
