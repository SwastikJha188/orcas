"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Dialog, Field, FormNote, PillButton, PillNav, Select, StatusTag, Table, TextArea, TextInput, Toggle, type Column, Loading } from "@/components/ui";
import { ACTION, ALARM_STATE, conditionTone, validityTone } from "@/components/ui/status";
import { Section } from "../analysis/an-ui";
import { formatLocalTime } from "@/lib/time";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import {
  ASSESSMENT_LABEL,
  CAUSE_LABEL,
  ENTRY_KINDS,
  ENTRY_LABEL,
  acknowledgeFinding,
  addInvestigationEntry,
  entryLabel,
  fmtNumber,
  useFindings,
  useMachineEvents,
  type EntryKind,
} from "@/lib/monitoring-client";
import type { FindingDto, MachineEventDto } from "@shared/types/monitoring";
import { plainWords } from "@/lib/plain-words";
import "./monitoring.css";

/* ==========================================================================
   Findings: the server evaluation's findings for one machine, from
   /api/findings, and the machine's event record from /api/machines/:id/events.
   Acknowledged and Cleared are separate columns: acknowledging records that
   someone has seen a finding, it never clears or resolves it.
   ========================================================================== */

type View = "open" | "all" | "events";

type Fmt = { time: (iso: string) => string; date: (iso: string) => string; stamp: (iso: string) => string };

function useFmt(machineId: string): Fmt {
  const tz = useSiteTimeZone({ machineId });
  return useMemo(
    () => ({
      time: (iso) => formatLocalTime(Date.parse(iso), { seconds: false, timeZone: tz.timeZone }),
      date: (iso) => formatLocalTime(Date.parse(iso), { date: true, timeZone: tz.timeZone }).split(",")[0],
      stamp: (iso) => formatLocalTime(Date.parse(iso), { date: true, seconds: false, timeZone: tz.timeZone }),
    }),
    [tz.timeZone],
  );
}

const unitOf = (f: FindingDto) => f.measurement?.unit ?? "";
const withUnit = (v: number | null, unit: string) => (v === null ? "—" : `${fmtNumber(v)}${unit ? ` ${unit}` : ""}`);

/** The accepted range as stored: both ends, one end, or nothing. */
function rangeText(lo: number | null, hi: number | null, unit: string): string | null {
  const u = unit ? ` ${unit}` : "";
  if (lo !== null && hi !== null) return `${fmtNumber(lo)} – ${fmtNumber(hi)}${u}`;
  if (hi !== null) return `≤ ${fmtNumber(hi)}${u}`;
  if (lo !== null) return `≥ ${fmtNumber(lo)}${u}`;
  return null;
}

const titleOf = (f: FindingDto) => f.rule?.plainTitle ?? f.rule?.name ?? (f.measurement ? plainWords(f.measurement.name) : f.typeName);
const idOf = (f: FindingDto) => f.rule?.code ?? f.measurement?.tag ?? null;

export function FindingsSection({ machineId }: { machineId: string }) {
  const [view, setView] = useState<View>("open");
  const open = useFindings(machineId, "open");
  const all = useFindings(machineId, view === "all" ? "all" : "open");
  const events = useMachineEvents(view === "events" ? machineId : null);
  const fmt = useFmt(machineId);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => (view === "all" ? all.data : open.data) ?? [], [view, all.data, open.data]);
  const openRows = useMemo(() => open.data ?? [], [open.data]);
  const unacked = openRows.filter((f) => !f.acknowledgement).length;
  const selected = useMemo(() => [...(all.data ?? []), ...openRows].find((f) => f.id === selectedId) ?? null, [all.data, openRows, selectedId]);

  const acknowledge = useCallback(async (f: FindingDto) => {
    setBusy(f.id);
    setError(null);
    try {
      await acknowledgeFinding(f.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Acknowledgement failed");
    } finally {
      setBusy(null);
    }
  }, []);

  const cols: Column<FindingDto>[] = [
    {
      key: "opened",
      header: "Opened",
      width: "112px",
      render: (f) => (
        <span className="ast-cell-stack">
          <span className="ast-num">{fmt.time(f.openedAt)}</span>
          <span className="ast-cell-sub">{fmt.date(f.openedAt)}</span>
        </span>
      ),
    },
    {
      key: "finding",
      header: "Finding",
      render: (f) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title" title={f.rule?.plainTitle ? f.rule.name : undefined}>{titleOf(f)}</span>
          <span className="ast-cell-sub">
            {f.typeName}
            {idOf(f) ? ` · ${idOf(f)}` : ""}
          </span>
        </span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      width: "104px",
      render: (f) => <StatusTag tone={conditionTone(f.severity)} label={f.severity} />,
    },
    {
      key: "observed",
      header: "Reading",
      width: "112px",
      render: (f) => <span className="ast-num">{withUnit(f.observed, unitOf(f))}</span>,
    },
    {
      key: "expected",
      header: "Expected",
      width: "128px",
      render: (f) => {
        const range = rangeText(f.expectedLo, f.expectedHi, unitOf(f));
        return (
          <span className="ast-cell-stack">
            <span className="ast-num">{withUnit(f.expected, unitOf(f))}</span>
            {range && <span className="ast-cell-sub ast-num">{range}</span>}
          </span>
        );
      },
    },
    {
      key: "limit",
      header: "Limit",
      width: "96px",
      render: (f) => <span className="ast-num">{withUnit(f.limitValue, unitOf(f))}</span>,
    },
    {
      key: "data",
      header: "Reading quality",
      width: "92px",
      render: (f) => <StatusTag tone={validityTone(ASSESSMENT_LABEL[f.dataAssessment])} label={ASSESSMENT_LABEL[f.dataAssessment]} />,
    },
    {
      key: "cause",
      header: "Cause",
      width: "132px",
      render: (f) => <span className={f.causeStatus === "not_established" ? "ast-muted mon-nowrap" : "mon-nowrap"}>{CAUSE_LABEL[f.causeStatus]}</span>,
    },
    {
      key: "ack",
      header: "Acknowledged",
      width: "150px",
      render: (f) =>
        f.acknowledgement ? (
          <span className="ast-cell-stack">
            <span className="ast-num">{fmt.time(f.acknowledgement.at)}</span>
            <span className="ast-cell-sub">{f.acknowledgement.by ?? fmt.date(f.acknowledgement.at)}</span>
          </span>
        ) : (
          <PillButton
            variant="secondary"
            className="pg-diag-sm"
            disabled={busy === f.id}
            onClick={(e) => {
              e.stopPropagation();
              void acknowledge(f);
            }}
          >
            {ACTION.acknowledge}
          </PillButton>
        ),
    },
    {
      key: "cleared",
      header: "Cleared",
      width: "112px",
      render: (f) =>
        f.clearedAt ? (
          <span className="ast-cell-stack">
            <span className="ast-num">{fmt.time(f.clearedAt)}</span>
            <span className="ast-cell-sub">{fmt.date(f.clearedAt)}</span>
          </span>
        ) : (
          <StatusTag tone={conditionTone(f.severity)} label={ALARM_STATE.active} />
        ),
    },
  ];

  const state = view === "all" ? all : open;
  const right = (
    <PillNav<View>
      ariaLabel="Findings view"
      activeId={view}
      onChange={setView}
      items={[
        { id: "open", label: "Open" },
        { id: "all", label: "All" },
        { id: "events", label: "Events" },
      ]}
    />
  );

  return (
    <Section id="dx-findings" title="Findings" right={right}>
      {view !== "events" && (
        <p className="mon-line">
          <span className="ast-num">{open.data ? openRows.length : "—"}</span> open · <span className="ast-num">{open.data ? unacked : "—"}</span> not yet acknowledged
        </p>
      )}
      {error && <p className="pg-diag-missing" role="alert">{error}</p>}
      {view === "events" ? (
        <EventsTable state={events} fmt={fmt} />
      ) : rows.length === 0 ? (
        state.isLoading ? (
          <Loading label="Loading findings…" rows={5} />
        ) : (
        <p className="pg-diag-missing">{state.error ? `Findings unavailable: ${state.error}` : view === "open" ? "No open findings." : "No findings recorded."}</p>
        )
      ) : (
        <Table
          className="pg-dx-table mon-table"
          columns={cols}
          data={rows}
          keyExtractor={(f) => String(f.id)}
          onRowClick={(f) => setSelectedId(f.id)}
          selectedId={selectedId !== null ? String(selectedId) : undefined}
        />
      )}
      {selected && <FindingDialog finding={selected} fmt={fmt} onClose={() => setSelectedId(null)} />}
    </Section>
  );
}

/* --------------------------------- Events -------------------------------- */

function EventsTable({ state, fmt }: { state: ReturnType<typeof useMachineEvents>; fmt: Fmt }) {
  const rows = state.data ?? [];
  if (rows.length === 0)
    return state.isLoading ? <Loading label="Loading events…" rows={5} /> : <p className="pg-diag-missing">{state.error ? `Events unavailable: ${state.error}` : "No events recorded."}</p>;
  const cols: Column<MachineEventDto>[] = [
    {
      key: "at",
      header: "Time",
      width: "112px",
      render: (e) => (
        <span className="ast-cell-stack">
          <span className="ast-num">{fmt.time(e.occurredAt)}</span>
          <span className="ast-cell-sub">{fmt.date(e.occurredAt)}</span>
        </span>
      ),
    },
    {
      key: "event",
      header: "Event",
      render: (e) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">{e.title}</span>
          {e.description && (
            <span className="ast-cell-sub mon-clamp" title={e.description}>
              {e.description}
            </span>
          )}
        </span>
      ),
    },
    { key: "type", header: "Type", width: "160px", render: (e) => e.typeName },
    {
      key: "severity",
      header: "Severity",
      width: "104px",
      render: (e) => (e.severity === "Normal" ? <span className="ast-muted">—</span> : <StatusTag tone={conditionTone(e.severity)} label={e.severity} />),
    },
    { key: "tag", header: "Sensor tag", width: "120px", render: (e) => (e.measurementTag ? <span className="ast-num">{e.measurementTag}</span> : <span className="ast-muted">—</span>) },
    {
      key: "source",
      header: "Source",
      width: "160px",
      render: (e) => (
        <span className="ast-cell-stack">
          <span>{e.source}</span>
          {e.actor && <span className="ast-cell-sub">{e.actor}</span>}
        </span>
      ),
    },
  ];
  return <Table className="pg-dx-table mon-table" columns={cols} data={rows} keyExtractor={(e) => String(e.id)} />;
}

/* ------------------------------ Finding detail ----------------------------- */

function FindingDialog({ finding: f, fmt, onClose }: { finding: FindingDto; fmt: Fmt; onClose: () => void }) {
  const unit = unitOf(f);
  const [ackNote, setAckNote] = useState("");
  const [kind, setKind] = useState<EntryKind>("observation");
  const [body, setBody] = useState("");
  const [suspected, setSuspected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (job: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await job();
      after?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const range = rangeText(f.expectedLo, f.expectedHi, unit);
  const facts: Array<[string, React.ReactNode]> = [
    ["Type", f.typeName],
    ["Severity", <StatusTag key="s" tone={conditionTone(f.severity)} label={f.severity} />],
    ...(f.measurement ? ([["Sensor", `${plainWords(f.measurement.name)} · ${f.measurement.tag}`]] as Array<[string, React.ReactNode]>) : []),
    ...(f.rule ? ([["Automatic check", `${f.rule.name} · ${f.rule.code}`]] as Array<[string, React.ReactNode]>) : []),
    // A rule pattern has no single value: its evidence is the summary below.
    ...((f.observed ?? f.expected ?? f.expectedLo ?? f.expectedHi ?? f.limitValue ?? f.change) === null
      ? []
      : ([
          ["Reading", <span key="o" className="ast-num">{withUnit(f.observed, unit)}</span>],
          ["Expected", <span key="e" className="ast-num">{withUnit(f.expected, unit)}{range ? ` (${range})` : ""}</span>],
          ["Limit", <span key="l" className="ast-num">{withUnit(f.limitValue, unit)}</span>],
          [
            "Change",
            <span key="c" className="ast-num">
              {f.change === null ? "—" : `${f.change >= 0 ? "+" : "−"}${withUnit(Math.abs(f.change), unit)}${f.changeWindowS ? ` over ${fmtNumber(f.changeWindowS / 3600, 1)} h` : ""}`}
            </span>,
          ],
        ] as Array<[string, React.ReactNode]>)),
    ["Machine was", f.operatingState ?? "—"],
    ["Compared against", f.reference ?? "—"],
    ["Reading quality", <StatusTag key="d" tone={validityTone(ASSESSMENT_LABEL[f.dataAssessment])} label={ASSESSMENT_LABEL[f.dataAssessment]} />],
    ["Cause", CAUSE_LABEL[f.causeStatus]],
    ["Opened", <span key="op" className="ast-num">{fmt.stamp(f.openedAt)}</span>],
    ["Last checked", <span key="le" className="ast-num">{fmt.stamp(f.lastEvaluatedAt)}</span>],
    ["Cleared", f.clearedAt ? <span key="cl" className="ast-num">{fmt.stamp(f.clearedAt)}</span> : <StatusTag key="cl" tone={conditionTone(f.severity)} label={ALARM_STATE.active} />],
  ];

  return (
    <Dialog open onClose={onClose} busy={busy} width={680} title={titleOf(f)} subtitle={`${f.typeName}${idOf(f) ? ` · ${idOf(f)}` : ""}`}>
      <dl className="mon-facts">
        {facts.map(([k, v]) => (
          <div key={k} className="mon-fact">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mon-evidence" title={f.rule?.plainWhat ? f.summary : undefined}>{f.rule?.plainWhat ?? f.summary}</p>
      {(f.rule?.plainTodo ?? f.rule?.action) && (
        <p className="mon-evidence" title={f.rule?.plainTodo ? f.rule.action : undefined}>
          <span className="mon-label">What to do</span> {f.rule?.plainTodo ?? f.rule?.action}
        </p>
      )}

      <h4 className="mon-head">Acknowledgement</h4>
      {f.acknowledgement ? (
        <p className="mon-line">
          <span className="ast-num">{fmt.stamp(f.acknowledgement.at)}</span>
          {f.acknowledgement.by ? ` · ${f.acknowledgement.by}` : ""}
          {f.acknowledgement.note ? ` · ${f.acknowledgement.note}` : ""}
        </p>
      ) : (
        <div className="mon-inline-form">
          <Field label="Note">{(id, d) => <TextInput id={id} describedBy={d} value={ackNote} onChange={setAckNote} placeholder="Optional" />}</Field>
          <PillButton variant="secondary" disabled={busy} onClick={() => void run(() => acknowledgeFinding(f.id, ackNote.trim() || null), () => setAckNote(""))}>
            {ACTION.acknowledge}
          </PillButton>
        </div>
      )}

      <h4 className="mon-head">Investigation</h4>
      {f.entries.length === 0 ? (
        <p className="mon-line ast-muted">Nothing recorded yet.</p>
      ) : (
        <ol className="mon-entries">
          {f.entries.map((e) => (
            <li key={e.id} className="mon-entry">
              <span className="mon-entry-meta">
                <span className="ast-num">{fmt.stamp(e.at)}</span>
                <span>{entryLabel(e.kind)}</span>
                {e.by && <span className="ast-muted">{e.by}</span>}
                {e.workOrderId !== null && <span className="ast-muted">Work order {e.workOrderId}</span>}
              </span>
              <span className="mon-entry-body">{e.body}</span>
            </li>
          ))}
        </ol>
      )}
      <form
        className="mon-entry-form"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!body.trim()) return;
          void run(
            () => addInvestigationEntry(f.id, { kind, body: body.trim(), suspected: kind === "observation" && suspected }),
            () => {
              setBody("");
              setSuspected(false);
            },
          );
        }}
      >
        <Field label="Entry">
          {(id, d) => <Select id={id} describedBy={d} value={kind} onChange={(v) => setKind(v as EntryKind)} options={ENTRY_KINDS.map((k) => ({ value: k, label: ENTRY_LABEL[k] }))} />}
        </Field>
        <Field label="Record" wide>
          {(id, d) => <TextArea id={id} describedBy={d} value={body} onChange={setBody} rows={3} />}
        </Field>
        {kind === "observation" && f.causeStatus === "not_established" && (
          <Toggle checked={suspected} onChange={setSuspected} label="Cause suspected" />
        )}
        <div className="mon-form-foot">
          <PillButton type="submit" variant="primary" disabled={busy || !body.trim()}>
            Add entry
          </PillButton>
        </div>
      </form>
      {error && <FormNote tone="bad">{error}</FormNote>}
    </Dialog>
  );
}
