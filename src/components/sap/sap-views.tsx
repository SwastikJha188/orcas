"use client";

import React, { useMemo, useState } from "react";
import { ConfirmAction, Crumbs, Dialog, KpiStrip, NextActions, PillButton, PillNav, RestLine, TextInput, estimateOf, minutesIn, rowActivate, useFold, type NextAction, type Crumb, type KpiItem, type Tone } from "@/components/ui";
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
  notice: { tone: "good" | "bad"; text: string } | null;
  setNotice: (n: { tone: "good" | "bad"; text: string } | null) => void;
  /** The page's breadcrumbs (SAP / view / machine); a sheet adds its own level. */
  crumbs: Crumb[];
  setMachineId: (id: string | null) => void;
  openSettings: () => void;
  /** Reads SAP again now (the bar's Sync now). */
  sync: () => Promise<boolean>;
  goTo: (v: View) => void;
}

const H = 3600_000;
// SAP's unit codes in plain words (TO is tonnes, EA is pieces); unknown codes pass through.
const UNIT_WORD: Record<string, string> = { TO: "t", EA: "pcs", ST: "pcs", PC: "pcs", KG: "kg", KGM: "kg", M: "m", L: "l", H: "h" };
const unitWord = (u: string | null) => (u ? (UNIT_WORD[u.toUpperCase()] ?? u) : null);
const qty = (n: number | null, unit: string | null) => (n === null ? "—" : `${Number.isInteger(n) ? n.toLocaleString("en-GB") : n.toLocaleString("en-GB", { maximumFractionDigits: 1 })}${unit ? ` ${unitWord(unit)}` : ""}`);
const msWord = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`);
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

/** "4m 41s (3m 31s–6m 05s)": the estimate on top, its range under it. A word ("stable") is no time: muted, sentence case. */
function TimeToLimit({ value }: { value: string }) {
  if (!/\d/.test(value)) return <span className="pm-muted">{value.charAt(0).toUpperCase() + value.slice(1)}</span>;
  const m = /^(.*?)\s*\((.+)\)$/.exec(value);
  if (!m) return <>{value}</>;
  return (
    <span className="ast-cell-stack">
      <span>{m[1]}</span>
      <span className="ast-cell-sub">{m[2]}</span>
    </span>
  );
}

/* ---------------------------------------------------------- raise in SAP */

/** Raises one problem as an SAP notification; true when SAP took it. */
async function raiseNotification(ctx: ViewCtx, f: PmsFinding): Promise<boolean> {
  const out = await sapCall<{ id: number; state: string }>(
    "/notifications",
    "POST",
    { plantId: ctx.plantId, machineId: f.machineId, ruleCode: f.ruleId, title: f.plainTitle || f.name, detail: [f.plainWhat || f.evidence, f.plainTodo || f.action, f.timeToLimit && f.timeToLimit !== "—" ? `Limit in ${f.timeToLimit}` : null].filter(Boolean).join("\n"), priority: f.priority },
    "The notification was not sent",
  );
  if ("error" in out) ctx.setNotice({ tone: "bad", text: out.error });
  else ctx.setNotice(out.data.state === "completed" ? { tone: "good", text: "Notification created in SAP." } : { tone: "bad", text: "SAP did not take the notification yet; it will be tried again (see Sync & audit)." });
  return !("error" in out) && out.data.state === "completed";
}

/** Sends a write that SAP did not take once more. */
async function retryWrite(ctx: ViewCtx, id: number): Promise<boolean> {
  const out = await sapCall(`/outbox/${id}/retry`, "POST", { plantId: ctx.plantId }, "Could not send it again");
  if ("error" in out) ctx.setNotice({ tone: "bad", text: out.error });
  return !("error" in out);
}

function RaiseButton({ ctx, f, primary }: { ctx: ViewCtx; f: PmsFinding; primary?: boolean }) {
  return (
    <PillButton variant={primary ? "primary" : "secondary"} className={primary ? undefined : "pg-diag-sm"} onClick={() => raiseNotification(ctx, f)}>
      Raise notification in SAP
    </PillButton>
  );
}

/* ------------------------------------------------------------ the thread */

const STEPS = ["Problem found", "SAP notification", "Maintenance order", "Work done", "Checked after repair", "Closed"];

function ThreadSteps({ ctx, t, mapped }: { ctx: ViewCtx; t: Thread; mapped: boolean }) {
  const step = threadStep(t);
  const detail = [
    t.finding ? `${t.finding.priority} · ${machineName(t.machineId)}` : machineName(t.machineId),
    t.notification ? `${sapNumber(t.notification.number)} · ${t.notification.open ? "open" : "completed"}` : t.job ? OUTBOX_WORD[t.job.state].label : mapped ? "Not raised yet" : "Map the machine to its SAP equipment first",
    t.order ? `${sapNumber(t.order.number)} · ${ORDER_WORD[t.order.stage].toLowerCase()}` : t.notification ? "Waiting for the SAP planner" : null,
    t.order?.start ? `${t.order.stage === "created" || t.order.stage === "released" ? "Planned" : "Started"} ${ctx.when(t.order.start)}` : null,
    t.order?.finish && step >= 4 ? `ULTRON watches the readings since ${ctx.when(t.order.finish)}` : null,
    step >= 5 ? "Technically complete in SAP" : null,
  ];
  return (
    <ol className="sap-thread" aria-label="Where this problem stands">
      {STEPS.map((s, i) => (
        <li key={s} data-state={i < step ? "done" : i === step ? "current" : "todo"}>
          <span className="sap-thread-dot" aria-hidden="true" />
          <span className="ast-cell-stack">
            <span>{s}</span>
            {detail[i] && <span className="ast-cell-sub">{detail[i]}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------ next actions */

const PRIORITY_TONE = (p: string): NextAction["tone"] => (p === "P1" ? "bad" : p === "P2" ? "warn" : "info");

/** What to do in SAP now, from the same records the page shows: one action per thing, most urgent first. */
function sapNextActions(ctx: ViewCtx, m: SapModel, matches: Match[]): NextAction[] {
  const { dash, machineId } = ctx;
  const out: NextAction[] = [];
  const conn = dash.connection;
  if (conn?.lastTest && !conn.lastTest.ok) {
    out.push({ key: "conn", tone: "bad", rank: 0, what: "SAP does not answer", why: conn.lastTest.message ?? "the last connection test failed", label: "Check the connection", run: () => ctx.openSettings() });
  }
  const run = dash.syncRuns[0];
  if (run?.finishedAt && run.failed.length) {
    out.push({ key: "sync", tone: "warn", rank: 0, what: `Last sync could not read ${run.failed.map((f) => resourceLabel(dash, f.resource).toLowerCase()).join(", ")}`, why: [ctx.when(run.startedAt), run.failed[0].message].filter(Boolean).join(" · "), label: "Sync again", run: ctx.sync });
  }
  for (const o of dash.outbox.filter((x) => x.state === "failed" && (!machineId || x.machineId === machineId))) {
    out.push({ key: `out|${o.id}`, tone: "bad", rank: 1, what: `${o.title ?? resourceLabel(dash, o.resource)} did not reach SAP`, why: [`tried ${o.attempts} times`, o.lastError].filter(Boolean).join(" · "), label: "Send again", run: () => retryWrite(ctx, o.id) });
  }

  // Problems not raised yet. A mapped machine's problem is raised in one click; an unmapped
  // machine gets one action (map it) for all its problems, ranked by its most urgent one.
  const waiting = m.threads.filter((t) => !t.job && t.finding).sort((a, b) => a.finding!.priority.localeCompare(b.finding!.priority) || (minutesIn(a.finding!.timeToLimit) ?? Infinity) - (minutesIn(b.finding!.timeToLimit) ?? Infinity));
  const mapAsked = new Set<string>();
  for (const t of waiting) {
    const f = t.finding!;
    const mins = minutesIn(f.timeToLimit);
    const facts = [f.priority, mins !== null ? `limit in ${estimateOf(f.timeToLimit)}` : null, `${Math.round(f.confidence)} % sure`];
    if (m.eqOf(t.machineId)) {
      out.push({ key: `raise|${t.machineId}|${f.ruleId}`, tone: PRIORITY_TONE(f.priority), rank: mins ?? undefined, what: `${t.title} · ${machineName(t.machineId)}`, why: [...facts, "not in SAP yet"].filter(Boolean).join(" · "), label: "Raise notification", run: () => raiseNotification(ctx, f) });
    } else if (!mapAsked.has(t.machineId)) {
      mapAsked.add(t.machineId);
      const n = waiting.filter((x) => x.machineId === t.machineId).length;
      const x = matches.find((y) => y.e.machineId === t.machineId);
      const num = x ? sapNumber(field(x.r, "Equipment")) : null;
      out.push({
        key: `map|${t.machineId}`,
        tone: PRIORITY_TONE(f.priority),
        rank: mins ?? undefined,
        what: `${machineName(t.machineId)} has no SAP equipment`,
        why: [`${n} ${n === 1 ? "problem" : "problems"} can't be raised until it has`, `${f.priority} first`, x ? `SAP equipment ${num} matches ${Math.round(x.score * 100)} %` : "no likely SAP equipment found"].join(" · "),
        label: x ? `Confirm equipment ${num}` : "Map to SAP equipment",
        run: x ? () => confirmMatch(ctx, x) : () => ctx.goTo("mapping"),
      });
    }
  }

  // Orders SAP will start without all their parts.
  for (const o of m.orders.filter((x) => (x.stage === "created" || x.stage === "released" || x.stage === "working") && kitShare(x) < 1)) {
    const p = o.parts.find((x) => x.available < x.need)!;
    out.push({ key: `kit|${o.number}`, tone: "warn", rank: o.start ? (o.start - m.now) / 60_000 : undefined, what: `Order ${sapNumber(o.number)} is short of parts${o.machineId ? ` · ${machineName(o.machineId)}` : ""}`, why: [`${p.description ?? p.material}: need ${qty(p.need, p.unit)}, have ${qty(p.available, p.unit)}`, o.start ? `starts ${ctx.when(o.start)}` : null].filter(Boolean).join(" · "), label: "See the shortage", run: () => ctx.goTo("materials") });
  }
  return out;
}

/* ----------------------------------------------------------------- overview */

export function SapOverview(ctx: ViewCtx) {
  const { dash, pms } = ctx;
  const m = useSapModel(dash, pms.findings, ctx.machineId);
  const waiting = m.threads.filter((t) => !t.job && t.finding);
  const [selKey, setSelKey] = useState<string | null>(null);
  const keyOf = (t: Thread) => `${t.machineId}|${t.job?.id ?? t.finding?.ruleId}`;
  const sel = m.threads.find((t) => keyOf(t) === selKey) ?? null;
  const machines = dash.equipment.filter((e) => !ctx.machineId || e.machineId === ctx.machineId);
  const openN = m.notifications.filter((n) => n.open);
  const working = m.orders.filter((o) => o.stage !== "closed");
  const short = working.filter((o) => kitShare(o) < 1);
  const failedWrites = dash.outbox.filter((o) => o.state === "failed").length;
  const next = sapNextActions(ctx, m, suggestMatches(dash, m, ctx.machineId));

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
        {next.length > 0 && (
          <Section id="sap-next" title="Next actions">
            <NextActions items={next} />
          </Section>
        )}

        <Section id="sap-queue" title="Action queue">
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
                      <tr key={keyOf(t)} className={`is-clickable ${active ? "active" : ""}`} {...rowActivate(() => setSelKey(keyOf(t)), !!active)}>
                        <td className="pm-pri ast-num" data-tone={tone === "idle" ? undefined : tone}>
                          {t.finding?.priority ?? "—"}
                        </td>
                        <td className="pm-grow">
                          <ItemCell icon={PM_ICON.finding} tone={t.finding?.severity === "Critical" ? "bad" : t.finding ? "warn" : undefined} title={t.title} sub={`${machineName(t.machineId)}${t.finding?.subs[0] ? ` · ${t.finding.subs[0]}` : ""}`} />
                        </td>
                        <td className="ast-num">{t.finding?.timeToLimit && t.finding.timeToLimit !== "—" ? <TimeToLimit value={t.finding.timeToLimit} /> : "—"}</td>
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

        <Section id="sap-activity" title="Recent integration activity">
          {dash.audit.length === 0 ? (
            <Empty title="Nothing exchanged with SAP yet." />
          ) : (
            <LogTable ctx={ctx} rows={dash.audit.slice(0, 8)} />
          )}
        </Section>
      </div>

      <Dialog side open={sel !== null} onClose={() => setSelKey(null)} title={sel?.title ?? ""} crumbs={sel ? sheetCrumbs(ctx, () => setSelKey(null), machineName(sel.machineId)) : undefined} width={520}>
        {sel && (
          <>
            <SheetNotice ctx={ctx} />
            <div className="sap-facts">
              {sel.finding && (
                <>
                  <span>
                    <span className="ast-caption">Confidence</span>
                    <b className="ast-num">{Math.round(sel.finding.confidence)} %</b>
                  </span>
                  <span>
                    <span className="ast-caption">Time to limit</span>
                    <b className="ast-num">{sel.finding.timeToLimit && sel.finding.timeToLimit !== "—" ? <TimeToLimit value={sel.finding.timeToLimit} /> : "—"}</b>
                  </span>
                </>
              )}
              <span>
                <span className="ast-caption">SAP equipment</span>
                <b className="ast-num">{sapNumber(m.eqOf(sel.machineId)) ?? <span className="pm-muted">Not mapped</span>}</b>
              </span>
            </div>
            {sel.finding?.plainWhat && <p className="pm-note">{sel.finding.plainWhat}</p>}
            <ThreadSteps ctx={ctx} t={sel} mapped={!!m.eqOf(sel.machineId)} />
            <div className="sap-actions-row">
              {!sel.job && sel.finding && (m.eqOf(sel.machineId) ? <RaiseButton ctx={ctx} f={sel.finding} primary /> : <PillButton onClick={() => ctx.goTo("mapping")}>Map to SAP equipment</PillButton>)}
              {sel.order && (
                <PillButton variant="secondary" onClick={() => ctx.goTo("materials")}>
                  Parts for order {sapNumber(sel.order.number)}
                </PillButton>
              )}
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}

/** A sheet's breadcrumbs: the page's, with the page itself as a way back (closes the sheet), then the sheet. */
function sheetCrumbs(ctx: ViewCtx, close: () => void, label: string) {
  return <Crumbs items={[...ctx.crumbs.map((c, i, all) => (i === all.length - 1 ? { ...c, onClick: close } : c)), { label }]} />;
}

/** A sheet covers the page header, so it repeats the page's last message. */
function SheetNotice({ ctx }: { ctx: ViewCtx }) {
  if (!ctx.notice) return null;
  return (
    <p className="ui-form-note sap-notice" data-tone={ctx.notice.tone} role="status">
      {ctx.notice.text}
    </p>
  );
}

/** Exchanges with SAP, newest first; `full` adds the direction and the trace SAP support can look up. */
function LogTable({ ctx, rows, full }: { ctx: ViewCtx; rows: SapDashboard["audit"]; full?: boolean }) {
  const { dash, when } = ctx;
  return (
    <div className="ui-table-container ast-table pm-table">
      <table className="ui-table">
        <thead>
          <tr>
            <th>When</th>
            <th className="pm-grow">What</th>
            {full && <th>Direction</th>}
            <th>Answer</th>
            <th>Who</th>
            {full && <th title="Reference SAP support can look up">Trace</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td className="ast-num pm-muted">{when(a.at)}</td>
              <td className="pm-grow">
                <StateWord label={auditText(dash, a)} tone={a.status === "failed" ? "bad" : a.status === "warning" ? "warn" : undefined} />
              </td>
              {full && <td className="pm-muted">{a.direction === "to_sap" ? "To SAP" : a.direction === "from_sap" ? "From SAP" : "In ULTRON"}</td>}
              <td className="ast-num pm-muted">{a.status === "failed" ? (a.httpStatus ? `Failed · ${a.httpStatus}` : "Failed") : a.durationMs !== null ? msWord(a.durationMs) : "—"}</td>
              <td className="pm-muted">{a.user ?? "System"}</td>
              {full && (
                <td className="ast-num pm-muted" title={a.correlationId ?? undefined}>
                  {a.correlationId ? `${a.correlationId.slice(0, 8)}…` : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

type Match = { e: SapEquipmentMapping; r: Record<string, unknown>; score: number };

/** Unmapped machines with the SAP equipment that most likely is them (a person confirms). */
function suggestMatches(dash: SapDashboard, m: SapModel, machineId: string | null): Match[] {
  const taken = new Set(dash.equipment.map((e) => sapNumber(e.sapEquipmentId)).filter(Boolean));
  return dash.equipment
    .filter((e) => !e.sapEquipmentId && (!machineId || e.machineId === machineId))
    .map((e) => {
      const best = m.equipmentRecords
        .filter((r) => !taken.has(sapNumber(field(r, "Equipment"))))
        .map((r) => ({ r, score: matchScore(e, r) }))
        .sort((a, b) => b.score - a.score)[0];
      return best && best.score >= 0.5 ? { e, r: best.r, score: best.score } : null;
    })
    .filter((x): x is Match => x !== null);
}

/** Saves a suggested match as the machine's SAP equipment. */
async function confirmMatch(ctx: ViewCtx, x: Match): Promise<boolean> {
  const out = await sapCall("/mappings/equipment", "PUT", { plantId: ctx.plantId, machineId: x.e.machineId, sapEquipmentId: field(x.r, "Equipment"), functionalLocation: field(x.r, "FunctionalLocation"), workCenter: field(x.r, "MainWorkCenter", "WorkCenter"), costCenter: field(x.r, "CostCenter") }, "Could not save the mapping");
  if ("error" in out) ctx.setNotice({ tone: "bad", text: out.error });
  return !("error" in out);
}

export function SapMapping(ctx: ViewCtx) {
  const { dash, plantId, machineId } = ctx;
  const m = useSapModel(dash, ctx.pms.findings, machineId);
  const [edit, setEdit] = useState<SapEquipmentMapping | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pointsOf, setPointsOf] = useState<string | null>(null);
  const rows = dash.equipment.filter((e) => (!machineId || e.machineId === machineId) && (!q || `${e.machineName} ${e.machineId} ${e.sapEquipmentId ?? ""} ${e.functionalLocation ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const inSap = (eq: string | null) => m.equipmentRecords.some((r) => sameSapNumber(field(r, "Equipment"), eq));
  const suggestions = suggestMatches(dash, m, machineId);
  const suggestionOf = new Map(suggestions.map((x) => [x.e.machineId, x]));
  const conflicts = dash.equipment.filter((e) => e.sapEquipmentId && m.synced && !inSap(e.sapEquipmentId));

  const confirm = async (list: Match[]) => {
    setBusy("suggest");
    let ok = true;
    for (const x of list) if (!(ok = await confirmMatch(ctx, x))) break;
    setBusy(null);
    return ok;
  };
  const unmap = async (id: string) => {
    setBusy(id);
    const out = await sapCall(`/mappings/equipment/${encodeURIComponent(id)}`, "DELETE", { plantId }, "Could not remove the mapping");
    setBusy(null);
    if ("error" in out) ctx.setNotice({ tone: "bad", text: out.error });
  };

  const pointsLinked = dash.points.filter((p) => p.sapPoint).length;

  return (
    <>
      <KpiStrip
        page
        label="Mapping summary"
        items={[
          { label: "Mapped machines", value: `${dash.equipment.filter((e) => e.sapEquipmentId).length}`, unit: `of ${dash.equipment.length}`, bar: dash.equipment.length ? (dash.equipment.filter((e) => e.sapEquipmentId).length / dash.equipment.length) * 100 : 0, foot: suggestions.length ? `${suggestions.length} suggested, waiting for a person to confirm` : dash.equipment.every((e) => e.sapEquipmentId) ? "every machine has its SAP equipment" : "the rest are mapped by hand" },
          { label: "Measuring points", value: `${pointsLinked}`, unit: `of ${dash.points.length}`, foot: `readings written to SAP; ${m.measuringPoints.length} points in SAP` },
          { label: "Mapping conflicts", value: m.synced ? `${conflicts.length}` : "—", tone: conflicts.length ? "warn" : undefined, foot: conflicts.length ? "mapped numbers SAP does not know" : "every mapped number is in SAP" },
          { label: "Last master sync", value: dash.records.equipment[0] ? ctx.when(dash.records.equipment[0].syncedAt) : "—", text: true, foot: `${dash.records.equipment.length} equipment records` },
        ]}
      />
      <div className="pg-frame-body sap-stack">
        <Section
          id="sap-map"
          title="Machines and their SAP equipment"
          right={
            <span className="sap-actions">
              {suggestions.length > 1 && (
                <PillButton variant="secondary" loading={busy === "suggest"} onClick={() => confirm(suggestions)}>
                  Confirm {suggestions.length} suggested
                </PillButton>
              )}
              <TextInput id="sap-map-search" ariaLabel="Search machines, equipment or functional locations" value={q} onChange={setQ} placeholder="Search" />
            </span>
          }
        >
          <div className="ui-table-container ast-table pm-table">
            <table className="ui-table">
              <thead>
                <tr>
                  <th className="pm-grow">Machine</th>
                  <th>SAP equipment</th>
                  <th>Functional location</th>
                  <th>Work centre</th>
                  <th>In SAP</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  // An unmapped machine shows SAP's likely equipment in grey until a person confirms it.
                  const sug = suggestionOf.get(r.machineId);
                  const guess = (v: string | null | undefined) => (v ? <span className="pm-muted">{v}</span> : "—");
                  return (
                    <tr key={r.machineId} className={`is-clickable ${pointsOf === r.machineId ? "active" : ""}`} {...rowActivate(() => setPointsOf(r.machineId), pointsOf === r.machineId)}>
                      <td className="pm-grow">
                        <span className="ast-cell-title">{machineName(r.machineId)}</span>
                      </td>
                      <td className="ast-num">{sapNumber(r.sapEquipmentId) ?? guess(sug && sapNumber(field(sug.r, "Equipment")))}</td>
                      <td className="ast-num">{r.functionalLocation ?? guess(sug && field(sug.r, "FunctionalLocation"))}</td>
                      <td className="ast-num">{r.workCenter ?? guess(sug && field(sug.r, "MainWorkCenter", "WorkCenter"))}</td>
                      <td>
                        {r.sapEquipmentId ? (
                          !m.synced ? <span className="pm-muted">Not synced</span> : inSap(r.sapEquipmentId) ? <StateWord label="Found" /> : <StateWord label="Not in SAP" tone="warn" />
                        ) : sug ? (
                          <StateWord label={`Suggested · ${Math.round(sug.score * 100)} % match`} tone="warn" />
                        ) : (
                          <StateWord label="Not mapped" tone="warn" />
                        )}
                      </td>
                      <td className="sap-actions" onClick={(e) => e.stopPropagation()}>
                        {sug && (
                          <PillButton variant="secondary" className="pg-diag-sm" loading={busy === "suggest"} onClick={() => confirm([sug])}>
                            Confirm
                          </PillButton>
                        )}
                        <PillButton variant="secondary" className="pg-diag-sm" onClick={() => setEdit(r)}>
                          {r.sapEquipmentId ? "Edit" : sug ? "Other" : "Map"}
                        </PillButton>
                        {r.sapEquipmentId && <ConfirmAction label="Unmap" question="Remove this machine's SAP equipment?" confirmLabel="Unmap" busy={busy === r.machineId} onConfirm={() => void unmap(r.machineId)} ariaLabel={`Unmap ${r.machineName}`} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
      <Dialog side open={pointsOf !== null} onClose={() => setPointsOf(null)} title={pointsOf ? machineName(pointsOf) : ""} subtitle="Which SAP measuring point each reading is written to" crumbs={pointsOf ? sheetCrumbs(ctx, () => setPointsOf(null), "Measuring points") : undefined} width={720}>
        {pointsOf && <PointsPanel ctx={ctx} model={m} machine={pointsOf} onMap={() => setEdit(dash.equipment.find((e) => e.machineId === pointsOf) ?? null)} />}
      </Dialog>
      <EquipmentMappingDialog open={edit !== null} onClose={() => setEdit(null)} plantId={plantId} row={edit} />
    </>
  );
}

/** One machine's readings and the SAP measuring points they are written to (the body of the mapping sheet). */
function PointsPanel({ ctx, model, machine, onMap }: { ctx: ViewCtx; model: SapModel; machine: string; onMap: () => void }) {
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
    return !("error" in out);
  };
  const publish = async () => {
    setBusy("publish");
    const out = await sapCall<{ sent: number; failed: number; unchanged: number }>("/publish", "POST", { plantId }, "Could not write the readings");
    setBusy(null);
    if ("error" in out) ctx.setNotice({ tone: "bad", text: out.error });
    else ctx.setNotice({ tone: out.data.failed ? "bad" : "good", text: `${out.data.sent} readings written to SAP${out.data.failed ? `, ${out.data.failed} will be tried again` : ""}${out.data.unchanged ? `; ${out.data.unchanged} had no new reading` : ""}.` });
    return !("error" in out) && out.data.failed === 0;
  };
  const linked = points.filter((p) => p.sapPoint);
  return (
    <>
      <SheetNotice ctx={ctx} />
      {!eq ? (
        <Empty title="Map this machine to its SAP equipment first.">
          <span className="sap-empty-action">
            <PillButton onClick={onMap}>Map to SAP equipment</PillButton>
          </span>
        </Empty>
      ) : (
        <>
          {(linkable.length > 0 || dash.points.some((p) => p.sapPoint)) && (
            <div className="sap-actions-row sap-sheet-actions">
              {linkable.length > 0 && (
                <PillButton variant="secondary" loading={busy === "link"} onClick={link}>
                  Link {linkable.length} suggested
                </PillButton>
              )}
              {dash.points.some((p) => p.sapPoint) && (
                <PillButton variant="secondary" loading={busy === "publish"} onClick={publish}>
                  Write latest readings now
                </PillButton>
              )}
            </div>
          )}
          <p className="pm-note">
            {linked.length} of {points.length} readings go to SAP
            {dash.connection?.publishEveryMin ? `, every ${dash.connection.publishEveryMin} min` : " when written by hand (set an interval in Connection)"}.
          </p>
          <div className="ui-table-container ast-table pm-table">
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
    </>
  );
}

/* -------------------------------------------------------------- maintenance */

export function SapMaintenance(ctx: ViewCtx) {
  const { dash, when } = ctx;
  const m = useSapModel(dash, ctx.pms.findings, ctx.machineId);
  const [busy, setBusy] = useState<number | null>(null);
  const [selKey, setSelKey] = useState<string | null>(null);

  type Card = { key: string; name: string; machineId: string | null; detail: string; meta: string; tone?: Tone; thread?: Thread; order?: SapOrder };
  const review: Card[] = m.threads
    .filter((t) => !t.job && t.finding)
    .map((t) => ({ key: `r|${t.machineId}|${t.finding!.ruleId}`, name: t.title, machineId: t.machineId, detail: `Confidence ${Math.round(t.finding!.confidence)} %${/\d/.test(t.finding!.timeToLimit ?? "") ? ` · limit in ${t.finding!.timeToLimit.replace(/\s*\(.*\)$/, "")}` : ""}`, meta: t.finding!.priority, tone: priorityTone(t.finding!.priority) === "idle" ? undefined : priorityTone(t.finding!.priority), thread: t }));
  const notified: Card[] = m.notifications
    .filter((n) => n.open && !n.order)
    .map((n) => {
      const t = m.threads.find((x) => x.notification && sameSapNumber(x.notification.number, n.number));
      return { key: `n|${n.number}`, name: n.text, machineId: n.machineId, detail: `Notification ${sapNumber(n.number)}${n.priority ? ` · priority ${n.priority}` : ""}${t ? " · from ULTRON" : n.reportedBy ? ` · ${n.reportedBy}` : ""}`, meta: n.created ? when(n.created) : "—", thread: t };
    });
  const executing: Card[] = m.orders
    .filter((o) => o.stage === "created" || o.stage === "released" || o.stage === "working")
    .map((o) => ({ key: `o|${o.number}`, name: o.description, machineId: o.machineId, detail: `Order ${sapNumber(o.number)} · ${ORDER_WORD[o.stage].toLowerCase()}${o.parts.length ? ` · parts ${Math.round(kitShare(o) * 100)} % ready` : ""}`, meta: o.start ? `starts ${when(o.start)}` : "—", tone: kitShare(o) < 1 ? ("warn" as Tone) : undefined, order: o, thread: m.threads.find((x) => x.order?.number === o.number) }));
  const verifying: Card[] = m.orders
    .filter((o) => o.stage === "verifying")
    .map((o) => ({ key: `v|${o.number}`, name: o.description, machineId: o.machineId, detail: `Order ${sapNumber(o.number)} technically done`, meta: o.finish ? `since ${when(o.finish)}` : "—", tone: "info" as Tone, order: o, thread: m.threads.find((x) => x.order?.number === o.number) }));
  const lanes = [
    { title: "To raise in SAP", cards: review, tone: review.length ? ("warn" as Tone) : undefined },
    { title: "Notification open", cards: notified },
    { title: "Order in progress", cards: executing },
    { title: "Checking after repair", cards: verifying },
  ];
  const all = lanes.flatMap((l) => l.cards);
  const sel = all.find((c) => c.key === selKey) ?? null;
  // ULTRON's priority and SAP's disagree: the planner changed it in SAP.
  const mismatches = m.threads.filter((t) => t.finding && t.notification?.priority && t.notification.priority !== t.finding.priority.replace("P", ""));
  const sent = dash.outbox.filter((o) => o.resource === "notifications" && (!ctx.machineId || o.machineId === ctx.machineId) && o.state !== "completed");
  const retry = async (id: number) => {
    setBusy(id);
    const ok = await retryWrite(ctx, id);
    setBusy(null);
    return ok;
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
        <Section id="sap-lanes" title="Where each problem is">
          <div className="sap-lanes">
            {lanes.map((l) => (
              <div key={l.title} className="sap-lane">
                <div className="sap-lane-head">
                  <b>{l.title}</b>
                  <span className="ast-num sap-lane-count" data-tone={l.tone}>
                    {l.cards.length}
                  </span>
                </div>
                {l.cards.length === 0 ? (
                  <p className="pm-muted sap-lane-empty">Nothing here</p>
                ) : (
                  l.cards.slice(0, 6).map((c) => (
                    <button key={c.key} type="button" className="sap-lane-card" data-active={sel?.key === c.key || undefined} onClick={() => setSelKey(c.key)}>
                      <span className="sap-lane-title">{c.name}</span>
                      <span className="ast-cell-sub">{c.machineId ? machineName(c.machineId) : "Machine not known"}</span>
                      <span className="sap-lane-meta">
                        <StateWord label={c.meta} tone={c.tone} />
                        <span className="pm-muted">{c.detail}</span>
                      </span>
                    </button>
                  ))
                )}
                {l.cards.length > 6 && <p className="pm-muted sap-lane-empty">{l.cards.length - 6} more</p>}
              </div>
            ))}
          </div>
        </Section>

        {sent.length > 0 && (
          <Section id="sap-unsent" title="Notifications not in SAP yet">
            <Rows
              items={sent.map((o) => ({
                key: String(o.id),
                left: o.title ?? "Notification",
                sub: [o.machineId ? machineName(o.machineId) : null, o.lastError].filter(Boolean).join(" · "),
                tone: OUTBOX_WORD[o.state].tone,
                right: (
                  <PillButton variant="secondary" className="pg-diag-sm" loading={busy === o.id} onClick={() => retry(o.id)}>
                    Send again
                  </PillButton>
                ),
              }))}
            />
          </Section>
        )}
      </div>

      <Dialog side open={sel !== null} onClose={() => setSelKey(null)} title={sel?.name ?? ""} subtitle={sel?.machineId ? machineName(sel.machineId) : undefined} crumbs={sel ? sheetCrumbs(ctx, () => setSelKey(null), lanes.find((l) => l.cards.includes(sel))?.title ?? "") : undefined} width={520}>
        {sel && (
          <>
            <SheetNotice ctx={ctx} />
            {sel.thread ? (
              <>
                {sel.thread.finding?.plainWhat && <p className="pm-note">{sel.thread.finding.plainWhat}</p>}
                <ThreadSteps ctx={ctx} t={sel.thread} mapped={!!m.eqOf(sel.thread.machineId)} />
                {!sel.thread.job && sel.thread.finding && (
                  <div className="sap-actions-row">
                    {m.eqOf(sel.thread.machineId) ? <RaiseButton ctx={ctx} f={sel.thread.finding} primary /> : <PillButton onClick={() => ctx.goTo("mapping")}>Map to SAP equipment</PillButton>}
                  </div>
                )}
              </>
            ) : !sel.order ? (
              <p className="pm-note">{sel.detail}. Raised in SAP; the SAP planner makes the order.</p>
            ) : null}
            {(sel.order ?? sel.thread?.order) && (
              <div className="sap-sheet-part">
                <h3 className="sap-sheet-title">SAP order</h3>
                <OrderFacts ctx={ctx} o={(sel.order ?? sel.thread!.order)!} parts />
              </div>
            )}
          </>
        )}
      </Dialog>
    </>
  );
}

function OrderFacts({ ctx, o, parts }: { ctx: ViewCtx; o: SapOrder; parts?: boolean }) {
  return (
    <>
      <Rows
        items={[
          { key: "n", left: o.notification ? `Notification ${sapNumber(o.notification)}` : "No notification (planned in SAP)", sub: "Text written by ULTRON when raised from a problem" },
          { key: "o", left: `Order ${sapNumber(o.number)} · ${o.type ?? ""}`, sub: `Priority${o.priority ? ` ${o.priority}` : " —"} and schedule are SAP's`, right: <StateWord label={ORDER_WORD[o.stage]} tone={ORDER_TONE[o.stage]} /> },
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
        {shortPart ? (
          <div className="pm-split is-wide-side">
          <Section id="sap-kit" title={sel ? `Parts for order ${sapNumber(sel.number)}` : "Order parts"} right={sel ? <StateWord label={`${Math.round(kitShare(sel) * 100)} % ready`} tone={kitShare(sel) < 1 ? "warn" : undefined} /> : undefined}>
            {withParts.length > 1 && (
              <div className="sap-pick">
                <PillNav ariaLabel="Order" items={withParts.slice(0, 8).map((o) => ({ id: o.number, label: `${sapNumber(o.number)}${kitShare(o) < 1 ? " ·" : ""}` }))} activeId={sel?.number ?? ""} onChange={setSelNo} />
              </div>
            )}
            {!sel ? (
              <Empty title={m.synced ? "No open order needs parts." : "Sync to read SAP's orders."} />
            ) : (
              <>
                <p className="pm-note">
                  {[sel.description, sel.machineId ? machineName(sel.machineId) : null, ORDER_WORD[sel.stage].toLowerCase(), sel.start ? `starts ${ctx.when(sel.start)}` : null].filter(Boolean).join(" · ")}
                </p>
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
          <Section id="sap-shortage" title="Short of parts">
            {shortPart && (
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
        ) : (
          <>
          <Section id="sap-kit" title={sel ? `Parts for order ${sapNumber(sel.number)}` : "Order parts"} right={sel ? <StateWord label={`${Math.round(kitShare(sel) * 100)} % ready`} tone={kitShare(sel) < 1 ? "warn" : undefined} /> : undefined}>
            {withParts.length > 1 && (
              <div className="sap-pick">
                <PillNav ariaLabel="Order" items={withParts.slice(0, 8).map((o) => ({ id: o.number, label: `${sapNumber(o.number)}${kitShare(o) < 1 ? " ·" : ""}` }))} activeId={sel?.number ?? ""} onChange={setSelNo} />
              </div>
            )}
            {!sel ? (
              <Empty title={m.synced ? "No open order needs parts." : "Sync to read SAP's orders."} />
            ) : (
              <>
                <p className="pm-note">
                  {[sel.description, sel.machineId ? machineName(sel.machineId) : null, ORDER_WORD[sel.stage].toLowerCase(), sel.start ? `starts ${ctx.when(sel.start)}` : null].filter(Boolean).join(" · ")}
                </p>
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
          </>
        )}

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

  const running = orders.find((p) => p.start! <= now && p.end! > now) ?? null;
  // The week's orders: the next eight show, later ones fold away.
  const fold = useFold(orders, (o, i) => i >= 8 && o !== running);

  if (!m.synced) return <section className="ast-card"><Empty title="Sync to read SAP's production orders." /></section>;

  return (
    <>
      <KpiStrip
        page
        label="Production summary"
        items={[
          { label: "Time to first limit", value: boundary ? hoursWord((boundary - now) / H) : "No limit", text: true, tone: boundary ? "warn" : undefined, foot: boundary && worst ? `${machineName(worst.machineId)} · ${worst.plainTitle || worst.name}` : worst ? "open problems, none heading to a limit" : "no open problem on the machine" },
          { label: "Service window", value: window ? ctx.when(window.start) : "None", text: true, tone: window ? undefined : "warn", foot: window ? `${hoursWord((window.end - window.start) / H)} free; the service takes ${hoursWord(serviceHours)}` : "no free time before the first limit" },
          { label: "Orders after the limit", value: `${exposed.length}`, unit: `of ${orders.length}`, tone: exposed.length ? "warn" : undefined, foot: boundary ? "would run past the first limit" : "no limit this week" },
          { label: "Output at risk", value: qty(Math.round(exposedQty), null), unit: unitWord(unit) ?? undefined, tone: exposedQty ? "warn" : undefined, foot: exposedQty ? (window ? "unless serviced in the window" : "a planner has to move an order") : "nothing at risk" },
        ]}
      />
      <div className="pg-frame-body sap-stack">
        <Section id="sap-schedule" title="Next 7 days" right={boundary ? <StateWord label={`First limit ${ctx.when(boundary)}`} tone="warn" /> : undefined}>
          <div className="sap-timeline" role="img" aria-label="Production orders, the service window and the first limit over the next 7 days">
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
                  Service
                </span>
              )}
              {boundary && boundary < horizon && <span className="sap-tl-risk" style={{ left: pos(boundary), width: width(boundary, horizon) }} title="After the first limit" />}
            </div>
          </div>
          <p className="pm-note">
            {window
              ? `Best time to service: ${ctx.when(window.start)}. No order has to move.`
              : "No free time long enough before the first limit: a planner would have to move an order."}
          </p>
        </Section>

        <div className="pm-split is-wide-side">
          <Section id="sap-impact" title="Orders this week">
            {orders.length === 0 ? (
              <Empty title="SAP has no production orders this week." />
            ) : (
              <>
                <div className="ui-table-container ast-table pm-table">
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th className="pm-grow">Product</th>
                        <th className="ast-num">Quantity</th>
                        <th>Start</th>
                        <th>Done</th>
                        <th>Against the limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fold.shown.map((o) => {
                        const share = o.quantity ? (o.confirmed ?? 0) / o.quantity : 0;
                        const over = boundary !== null && o.end! > boundary;
                        const crosses = over && o.start! < boundary!;
                        return (
                          <tr key={o.number} className={o === running ? "active" : undefined}>
                            <td className="ast-num">{sapNumber(o.number)}</td>
                            <td className="pm-grow">
                              {o.description ?? o.material ?? "—"}
                              {o === running && <span className="pm-muted"> · running</span>}
                            </td>
                            <td className="ast-num">{qty(o.quantity, o.unit)}</td>
                            <td className="ast-num pm-muted">{ctx.when(o.start)}</td>
                            <td>
                              <span className="sap-progress">
                                <Bar share={share} />
                                <span className="ast-num pm-muted">{Math.round(share * 100)} %</span>
                              </span>
                            </td>
                            <td>{o.delivered ? <StateWord label="Delivered" /> : crosses ? <StateWord label="Crosses it" tone="bad" /> : over ? <StateWord label="After it" tone="warn" /> : <StateWord label="Before it" />}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <RestLine rest={fold.rest} shown={fold.shown.length} noun="order" note="later in the week" open={fold.open} onToggle={fold.toggle} />
              </>
            )}
          </Section>

          <Section id="sap-decision" title="For the planner">
            <Rows
              items={[
                { key: "run", left: "Run unchanged", sub: exposed.length ? `${qty(Math.round(exposedQty), unit)} made after the first limit` : "every order ends before it", right: <StateWord label={exposed.length ? `${exposed.length} at risk` : "Safe"} tone={exposed.length ? "bad" : undefined} /> },
                { key: "svc", left: "Service in the window", sub: window ? `${ctx.when(window.start)} · ${hoursWord(serviceHours)}` : "no window before the limit", right: <StateWord label={window ? "No order moves" : "Needs a planner"} tone={window ? undefined : "warn"} /> },
                { key: "ord", left: "Maintenance order in SAP", right: <StateWord label={openOrder ? `${sapNumber(openOrder.number)} · ${ORDER_WORD[openOrder.stage].toLowerCase()}` : "None yet"} tone={openOrder ? undefined : "warn"} /> },
                { key: "parts", left: "Parts for it", right: <StateWord label={openOrder ? `${Math.round(kitShare(openOrder) * 100)} % ready` : "—"} tone={openOrder && kitShare(openOrder) < 1 ? "warn" : undefined} /> },
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
    const ok = await retryWrite(ctx, id);
    setBusy(null);
    return ok;
  };
  const sendDue = async () => {
    setBusy("all");
    const out = await sapCall<{ processed: number }>("/outbox/process", "POST", { plantId }, "Could not send the waiting writes");
    setBusy(null);
    if ("error" in out) ctx.setNotice({ tone: "bad", text: out.error });
    else ctx.setNotice({ tone: "good", text: out.data.processed ? `Tried ${out.data.processed} waiting writes.` : "Nothing is due to send yet." });
    return !("error" in out);
  };
  // Newest first: the latest syncs and exchanges show, older ones that went through fold away.
  const runs = useFold(dash.syncRuns, (r, i) => i >= 5 && r.failed.length === 0 && r.truncated.length === 0);
  const log = useFold(dash.audit, (x, i) => i >= 12 && x.status === "success");
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
          { label: "Answered", value: recent.length ? `${Math.round((ok / recent.length) * 1000) / 10}` : "—", unit: "%", tone: recent.length && ok / recent.length < 0.95 ? "warn" : undefined, foot: `${ok} of ${recent.length} recent exchanges` },
          { label: "Typical answer time", value: median !== null ? msWord(median) : "—", text: true, foot: p95 !== null ? `95 % within ${msWord(p95)}` : "—" },
          { label: "Waiting to send", value: `${waiting.length}`, tone: waiting.some((o) => o.state === "failed") ? "bad" : waiting.length ? "warn" : undefined, foot: waiting.length ? "writes waiting or retrying" : "every write reached SAP" },
          { label: "Sync", value: dash.connection?.syncEveryMin ? `${dash.connection.syncEveryMin}` : "By hand", unit: dash.connection?.syncEveryMin ? "min" : undefined, text: !dash.connection?.syncEveryMin, foot: dash.syncRuns[0] ? `last ${when(dash.syncRuns[0].startedAt)}` : "never synced" },
        ]}
      />
      <div className="pg-frame-body sap-stack">
        {waiting.length > 0 && (
          <Section id="sap-outbox" title="Waiting to send" right={<PillButton variant="secondary" loading={busy === "all"} onClick={sendDue}>Send due now</PillButton>}>
            <Rows
              items={waiting.map((o) => ({
                key: String(o.id),
                left: `${o.title ?? resourceLabel(dash, o.resource)} · ${OUTBOX_WORD[o.state].label.toLowerCase()}`,
                sub: [`try ${o.attempts} of 6`, o.state !== "failed" && o.nextAttemptAt ? `next ${when(o.nextAttemptAt)}` : null, o.lastError].filter(Boolean).join(" · "),
                tone: OUTBOX_WORD[o.state].tone,
                right: (
                  <PillButton variant="secondary" className="pg-diag-sm" loading={busy === o.id} onClick={() => retry(o.id)}>
                    Send again
                  </PillButton>
                ),
              }))}
            />
          </Section>
        )}

        <Section id="sap-health" title="Interfaces">
          <div className="ui-table-container ast-table pm-table">
            <table className="ui-table">
              <thead>
                <tr>
                  <th className="pm-grow">What ULTRON reads or writes</th>
                  <th>State</th>
                  <th>Answer time</th>
                  <th>Last exchange</th>
                </tr>
              </thead>
              <tbody>
                {health.map(({ r, last }) => (
                  <tr key={r.id}>
                    <td className="pm-grow">
                      <span className="ast-cell-title" title={r.apiName}>
                        {r.label}
                      </span>
                    </td>
                    <td>
                      <StateWord label={!last ? "Not used yet" : last.status === "failed" ? `Failing${last.httpStatus ? ` · ${last.httpStatus}` : ""}` : last.status === "warning" ? "Partly" : "Working"} tone={last?.status === "failed" ? "bad" : last?.status === "warning" ? "warn" : undefined} />
                    </td>
                    <td className="ast-num pm-muted">{last?.durationMs != null ? msWord(last.durationMs) : "—"}</td>
                    <td className="ast-num pm-muted">{last ? when(last.at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="sap-runs" title="Syncs">
          {dash.syncRuns.length === 0 ? (
            <Empty title="No sync yet." />
          ) : (
            <>
              <div className="ui-table-container ast-table pm-table">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Started</th>
                      <th className="pm-grow">Result</th>
                      <th className="ast-num">Records</th>
                      <th>Started by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.shown.map((r) => (
                      <tr key={r.id}>
                        <td className="ast-num pm-muted">{when(r.startedAt)}</td>
                        <td className="pm-grow">
                          <StateWord
                            label={!r.finishedAt ? "Running" : r.failed.length ? `Could not read ${r.failed.map((f) => resourceLabel(dash, f.resource).toLowerCase()).join(", ")}` : r.truncated.length ? `Done; more ${r.truncated.map((x) => resourceLabel(dash, x).toLowerCase()).join(", ")} left in SAP` : "Done"}
                            tone={r.failed.length ? "bad" : r.truncated.length ? "warn" : undefined}
                          />
                        </td>
                        <td className="ast-num">{r.records.toLocaleString("en-GB")}</td>
                        <td className="pm-muted">{r.requestedBy ?? "Schedule"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <RestLine rest={runs.rest} shown={runs.shown.length} noun="sync" note="done, nothing missed" open={runs.open} onToggle={runs.toggle} />
            </>
          )}
        </Section>

        <Section id="sap-log" title="Log" right={dash.audit.length ? <PillButton variant="secondary" onClick={exportCsv}>Export CSV</PillButton> : undefined}>
          {dash.audit.length === 0 ? (
            <Empty title="Nothing logged yet." />
          ) : (
            <>
              <LogTable ctx={ctx} rows={log.shown} full />
              <RestLine rest={log.rest} shown={log.shown.length} noun="exchange" note="older, all answered" open={log.open} onToggle={log.toggle} />
            </>
          )}
        </Section>
      </div>
    </>
  );
}
