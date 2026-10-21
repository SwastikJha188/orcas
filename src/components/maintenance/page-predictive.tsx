"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, Field, PillButton, PillNav, TextArea, TextInput, rowActivate, Loading as LoadingState } from "@/components/ui";
import { STAGE_LABEL, isOpenStage } from "@shared/lib/pms";
import { formatLocalTime } from "@/lib/time";
import { invalidateApi } from "@/lib/api-cache";
import { useWorkOrderPriorities } from "@/lib/reference-data";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { Empty, KpiStrip, Section } from "@/components/assets/analysis/an-ui";
import type { AlertCheck } from "@shared/types/maintenance-types";
import type { Outcome, PmsModel } from "./pms-model";
import { machineName, pmsCall, priorityTone, stageTone, woRef } from "./pms-model";
import { ALERT_CHECKS_URL, checkState, useAlertChecks } from "./maint-types-model";
import { Loading } from "./page-overview";
import { PlanJobDialog } from "./plan-job-dialog";
import { WorkOrderDetail } from "./work-order-detail";
import { DefList, ItemCell, Notice, PM_ICON, StateWord, setPmsFocus, usePmsFocus, usePmsNav } from "./pms-ui";

/* ==========================================================================
   Maintenance › Predictive & planned.
     Checks from alarms   every alarm the plant raises (a limit crossed, or a
                          diagnostic pattern) issues a "go and check" task on
                          its own, due within its priority's response time.
                          Whoever checks records what they found; a problem
                          becomes a repair request.
     Planned jobs         work engineers plan with a date.
   ========================================================================== */

type Filter = "open" | "done" | "all";
type Pick = { kind: "check"; id: number } | { kind: "job"; id: number };

const DAY_MS = 86_400_000;
const NUM = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

/** What to look at on site for a limit alarm (the reading itself is the check). */
function limitTodo(c: AlertCheck): string | null {
  const m = c.measurement;
  if (!m) return null;
  const v = (x: number | null) => (x === null ? "—" : `${NUM.format(x)}${m.unit ? ` ${m.unit}` : ""}`);
  return `Check ${m.name} on site: it read ${v(m.observed)} against its limit of ${v(m.limit)}. Confirm the reading with a local gauge or hand instrument, then look for the cause.`;
}

export function PagePredictive({ pms }: { pms: PmsModel }) {
  const { data, now } = pms;
  const checksApi = useAlertChecks();
  const nav = usePmsNav();
  const focus = usePmsFocus(["c:", "w:"]);
  const priorities = useWorkOrderPriorities();
  const [filter, setFilter] = useState<Filter>("open");
  const [picked, setPicked] = useState<Pick | null>(focus ? (focus.startsWith("c:") ? { kind: "check", id: Number(focus.slice(2)) } : { kind: "job", id: Number(focus.slice(2)) }) : null);
  const [planning, setPlanning] = useState(false);
  const [recording, setRecording] = useState<"fine" | "problem" | null>(null);
  const [notice, setNotice] = useState<Outcome | null>(null);
  const tz = useSiteTimeZone({ machineId: data?.machineIds[0] });

  const inPlant = useMemo(() => new Set(data?.machineIds ?? []), [data]);
  const checks = useMemo(() => (checksApi.data ?? []).filter((c) => inPlant.has(c.machineId)), [checksApi.data, inPlant]);
  const list = useMemo(() => {
    const open = (c: AlertCheck) => checkState(c, now).open;
    return checks
      .filter((c) => (filter === "open" ? open(c) : filter === "done" ? !open(c) : true))
      .sort((a, b) => Number(open(b)) - Number(open(a)) || (a.dueAt ?? "~").localeCompare(b.dueAt ?? "~") || b.raisedAt.localeCompare(a.raisedAt));
  }, [checks, filter, now]);

  // Jobs engineers planned by hand (not raised from a check, a sensor finding or an inspection).
  const jobs = useMemo(
    () =>
      (data?.workOrders ?? [])
        .filter((w) => w.maintenanceType === "predictive" && w.checkId === null && w.source.kind === "manual" && (isOpenStage(w.stage) || Date.parse(w.updatedAt) > now - 30 * DAY_MS))
        .sort((a, b) => Number(isOpenStage(b.stage)) - Number(isOpenStage(a.stage)) || (a.plannedStart ?? "~").localeCompare(b.plannedStart ?? "~")),
    [data, now],
  );

  if (!data) return <Loading pms={pms} what="the checks" />;
  const checksWait = checksApi.data === undefined && !checksApi.error;

  const open = checks.filter((c) => checkState(c, now).open);
  const overdue = open.filter((c) => checkState(c, now).overdue).length;
  const month = (c: AlertCheck) => c.checkedAt !== null && Date.parse(c.checkedAt) > now - 30 * DAY_MS;
  const problems = checks.filter((c) => c.result === "problem" && month(c)).length;
  const fine = checks.filter((c) => c.result === "fine" && month(c)).length;
  const openJobs = jobs.filter((w) => isOpenStage(w.stage));
  const nextJob = openJobs.find((w) => w.plannedStart && Date.parse(w.plannedStart) >= now);
  const when = (iso: string | null) => (iso ? formatLocalTime(iso, { date: true, seconds: false, timeZone: tz.timeZone }) : "—");

  const check = picked?.kind === "check" ? (checks.find((c) => c.id === picked.id) ?? null) : picked === null ? (list[0] ?? null) : null;
  const job = picked?.kind === "job" ? (data.workOrders.find((w) => w.id === picked.id) ?? null) : null;

  const record = async (result: "fine" | "problem" | null, note: string, title?: string): Promise<Outcome> => {
    if (!check) return { tone: "bad", text: "No check picked" };
    const out = await pmsCall<AlertCheck>(`/api/maintenance/alert-checks/${check.id}`, "POST", { result, note, title }, "Could not record the check");
    if ("error" in out) return { tone: "bad", text: out.error };
    invalidateApi(ALERT_CHECKS_URL);
    const text =
      result === null ? "Result taken back" : out.data.workOrderId ? `Problem recorded · ${woRef(out.data.workOrderId)} asked for` : "Recorded: nothing wrong found";
    setNotice({ tone: "good", text });
    return { tone: "good", text };
  };

  const priorityName = (id: string) => priorities?.find((p) => p.id === id)?.name ?? null;
  // A new pick drops the last outcome note; a just-planned job keeps its "planned" note.
  const pick = (p: Pick) => {
    setPicked(p);
    setNotice(null);
  };

  return (
    <div className="ast-root pg-frame pm-page" style={{ "--pm-side": "460px" } as React.CSSProperties}>
      <KpiStrip
        page
        label="Checks and planned jobs"
        items={[
          { label: "Checks to do", loading: checksWait, value: `${open.length}`, tone: overdue ? "bad" : open.length ? "warn" : undefined, foot: overdue ? `${overdue} past their response time` : open.length ? "raised by alarms, not checked yet" : "every alarm has been checked" },
          { label: "Problems found", loading: checksWait, value: `${problems}`, tone: problems ? "warn" : undefined, foot: "last 30 days · turned into repair requests" },
          { label: "Nothing wrong found", loading: checksWait, value: `${fine}`, foot: "last 30 days · alarm checked on site" },
          { label: "Planned jobs", value: `${openJobs.length}`, foot: nextJob ? `next ${when(nextJob.plannedStart)}` : "none coming up" },
        ]}
      />
      <div className="pg-frame-body">
        <div className="pm-split">
          <div className="pm-stack">
            <Section
              id="pm-checks"
              title="Checks from alarms"
              right={<PillNav ariaLabel="Show" items={[{ id: "open", label: "To do" }, { id: "done", label: "Done" }, { id: "all", label: "All" }]} activeId={filter} onChange={(id) => setFilter(id as Filter)} />}
            >
              {checksApi.isLoading && !checksApi.data ? (
                <LoadingState label="Loading the checks…" rows={5} />
              ) : list.length === 0 ? (
                <Empty title={filter === "open" ? "Nothing to check: every alarm has been looked at." : "No checks in the last 30 days."}>{checksApi.error ?? undefined}</Empty>
              ) : (
                <div className="ui-table-container ast-table pm-table">
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th title="P1 is the most urgent">Priority</th>
                        <th className="pm-grow">What to check</th>
                        <th>Raised</th>
                        <th>Check by</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((c) => {
                        const st = checkState(c, now);
                        const t = priorityTone(c.priority);
                        return (
                          <tr key={c.id} className={`is-clickable ${check?.id === c.id ? "active" : ""}`} {...rowActivate(() => pick({ kind: "check", id: c.id }), check?.id === c.id)}>
                            <td className="pm-pri ast-num" data-tone={st.open && t !== "idle" ? t : undefined}>
                              {c.priority}
                            </td>
                            <td className="pm-grow">
                              <ItemCell icon={PM_ICON.finding} tone={st.open ? (c.severity === "Critical" ? "bad" : "warn") : undefined} title={c.title} sub={[machineName(c.machineId), ...c.places].join(" · ")} />
                            </td>
                            <td className="pm-muted">{when(c.raisedAt)}</td>
                            <td className="pm-muted">{c.dueAt ? when(c.dueAt) : (priorityName(c.priority) ?? "—")}</td>
                            <td>
                              <StateWord label={st.label} tone={st.tone} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section id="pm-jobs" title="Planned jobs" right={<PillButton variant="secondary" icon={PM_ICON.plan} onClick={() => setPlanning(true)}>Plan a job</PillButton>}>
              {jobs.length === 0 ? (
                <Empty title="No jobs planned by hand. Plan one for work that is not on a checklist round." />
              ) : (
                <div className="ui-table-container ast-table pm-table">
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th>Start</th>
                        <th className="pm-grow">Job</th>
                        <th className="ast-num">Hours</th>
                        <th>Stage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((w) => (
                        <tr key={w.id} className={`is-clickable ${job?.id === w.id ? "active" : ""}`} {...rowActivate(() => pick({ kind: "job", id: w.id }), job?.id === w.id)}>
                          <td className="pm-muted">{when(w.plannedStart)}</td>
                          <td className="pm-grow">
                            <ItemCell icon={PM_ICON.plan} title={w.title} sub={`${woRef(w.id)} · ${machineName(w.machineId)}${w.component ? ` · ${w.component}` : ""}`} />
                          </td>
                          <td className="ast-num">{w.estimateHours ?? "—"}</td>
                          <td>
                            <StateWord label={STAGE_LABEL[w.stage]} tone={stageTone(w.stage)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>

          {job ? (
            <WorkOrderDetail key={job.id} wo={job} pms={pms} timeZone={tz.timeZone ?? null} notice={notice} setNotice={setNotice} />
          ) : check ? (
            <CheckDetail check={check} now={now} when={when} priorityName={priorityName} notice={notice} onRecord={(mode) => {
                // Keep this check picked once it leaves the "To do" list.
                setPicked({ kind: "check", id: check.id });
                setRecording(mode);
              }}
              onTakeBack={() => record(null, "")} onOpenWo={(id) => { setPmsFocus(`w:${id}`); nav("work"); }} />
          ) : (
            <Section id="pm-check" title="Check">
              <Empty title="Pick a check or a planned job to see its details." />
            </Section>
          )}
        </div>
      </div>

      <CheckDialog open={recording !== null} mode={recording ?? "fine"} check={check} onClose={() => setRecording(null)} onSave={(note, title) => record(recording ?? "fine", note, title)} />
      <PlanJobDialog
        open={planning}
        draft={{ type: "predictive" }}
        machineIds={data.machineIds}
        title="Plan a job"
        onClose={() => setPlanning(false)}
        onPropose={async (input) => {
          const out = await pms.propose(input);
          if (out.tone === "good" && out.id) setPicked({ kind: "job", id: out.id });
          setNotice(out);
          return out;
        }}
      />
    </div>
  );
}

function CheckDetail({
  check: c,
  now,
  when,
  priorityName,
  notice,
  onRecord,
  onTakeBack,
  onOpenWo,
}: {
  check: AlertCheck;
  now: number;
  when: (iso: string | null) => string;
  priorityName: (id: string) => string | null;
  notice: Outcome | null;
  onRecord: (mode: "fine" | "problem") => void;
  onTakeBack: () => Promise<Outcome>;
  onOpenWo: (id: number) => void;
}) {
  const [takingBack, setTakingBack] = useState(false);
  const st = checkState(c, now);
  const todo = c.todo ?? limitTodo(c);
  return (
    <Section id="pm-check" title={machineName(c.machineId)} right={<StateWord label={st.label} tone={st.tone} />}>
      <h4 className="pm-detail-title" title={c.ruleCode ?? c.measurement?.tag ?? undefined}>
        {c.title}
      </h4>
      <DefList
        rows={[
          ...(todo ? [{ label: "What to check", value: todo }] : []),
          ...(c.places.length ? [{ label: "Where", value: c.places.join(", ") }] : []),
          { label: "What is happening", value: c.summary },
          ...((c.readings ?? c.tags).length ? [{ label: "Readings behind it", value: (c.readings ?? c.tags).join(", ") }] : []),
          { label: "Raised", value: `${when(c.raisedAt)}${c.alarmActive ? " · alarm still on" : " · alarm has cleared"}` },
          { label: "Check by", value: c.dueAt ? `${when(c.dueAt)} · ${c.priority}${priorityName(c.priority) ? ` ${priorityName(c.priority)}` : ""}` : `${c.priority} · ${priorityName(c.priority) ?? "no fixed time"}`, tone: st.overdue ? "warn" : undefined },
          ...(c.consequence ? [{ label: "If nobody acts", value: c.consequence }] : []),
          ...(c.cause ? [{ label: "Likely cause", value: c.cause }] : []),
          ...(c.result
            ? [
                { label: "Found", value: c.note ? `${c.result === "fine" ? "Nothing wrong" : "Problem"} · ${c.note}` : c.result === "fine" ? "Nothing wrong" : "Problem" },
                { label: "Checked by", value: `${c.checkedBy ?? "—"} · ${when(c.checkedAt)}` },
              ]
            : []),
        ]}
      />
      <Notice outcome={notice} />
      <div className="pm-actions">
        {c.result === null ? (
          <>
            <PillButton onClick={() => onRecord("problem")}>Problem found</PillButton>
            <PillButton variant="secondary" onClick={() => onRecord("fine")}>
              Nothing wrong
            </PillButton>
          </>
        ) : c.workOrderId ? (
          <PillButton variant="secondary" onClick={() => onOpenWo(c.workOrderId!)}>
            Open {woRef(c.workOrderId).toLowerCase()}
          </PillButton>
        ) : (
          <PillButton
            variant="secondary"
            loading={takingBack}
            onClick={async () => {
              setTakingBack(true);
              await onTakeBack();
              setTakingBack(false);
            }}
          >
            Take back
          </PillButton>
        )}
      </div>
    </Section>
  );
}

function CheckDialog({
  open,
  mode,
  check,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "fine" | "problem";
  check: AlertCheck | null;
  onClose: () => void;
  onSave: (note: string, title?: string) => Promise<Outcome>;
}) {
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const firstTitle = check ? `Repair: ${check.title}` : "";
  useEffect(() => {
    if (!open) return;
    setNote("");
    setTitle(firstTitle);
    setErr(null);
    setTried(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const problem = mode === "problem";
  const need = (v: string, msg: string) => (tried && problem && !v.trim() ? msg : null);
  const submit = async () => {
    setTried(true);
    if (problem && (!title.trim() || !note.trim())) return;
    setErr(null);
    setBusy(true);
    const out = await onSave(note.trim(), problem ? title.trim() : undefined);
    setBusy(false);
    if (out.tone === "bad") setErr(out.text);
    else onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={problem ? "Problem found" : "Nothing wrong found"}
      subtitle={check ? `${machineName(check.machineId)} · ${check.title}` : undefined}
      busy={busy}
      dirty={note.trim() !== "" || (problem && title !== firstTitle)}
      onSubmit={() => void submit()}
      width={540}
      footer={
        <>
          <PillButton variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={busy}>
            {problem ? "Record and ask for a repair" : "Record"}
          </PillButton>
        </>
      }
    >
      {problem && (
        <Field label="Repair to ask for" required error={need(title, "Say what repair to ask for")}>
          {(fid, d) => <TextInput id={fid} describedBy={d} value={title} onChange={setTitle} />}
        </Field>
      )}
      <Field label={problem ? "What was found" : "Note"} hint={problem ? undefined : "Optional"} error={need(note, "Describe what was found")} required={problem}>
        {(fid, d) => <TextArea id={fid} describedBy={d} value={note} onChange={setNote} rows={4} />}
      </Field>
      {err && (
        <p className="ui-form-note" data-tone="bad" role="alert">
          {err}
        </p>
      )}
    </Dialog>
  );
}
