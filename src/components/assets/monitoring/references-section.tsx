"use client";

import React, { useMemo, useState } from "react";
import { Dialog, Field, FieldGrid, FormNote, PillButton, Select, StatusTag, Table, TextInput, type Column } from "@/components/ui";
import type { Tone } from "@/components/ui/status";
import { formatLocalTime, zonedParts, zoneOffsetMs } from "@/lib/time";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { deriveReference, fmtNumber, reviewReference, useMeasurements, useOperatingStates, useReferenceSets } from "@/lib/monitoring-client";
import type { MeasurementDto, ReferenceSetDto } from "@/types/monitoring";
import { Section } from "../analysis/an-ui";
import { plainWords } from "@/lib/plain-words";
import "./monitoring.css";

/* ==========================================================================
   Reference sets per operating state, from /api/machines/:id/references.
   A draft is derived from stored readings in a window, reviewed here and only
   used by the evaluation once accepted (accepting retires the set it replaces
   for the same state).
   ========================================================================== */

export const REFERENCES_SECTION_ID = "sensors-references";

const STATUS: Record<ReferenceSetDto["status"], { label: string; tone: Tone }> = {
  accepted: { label: "Accepted", tone: "good" },
  draft: { label: "Draft, not used yet", tone: "info" },
  retired: { label: "No longer used", tone: "idle" },
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Instant → "YYYY-MM-DDTHH:mm" on the plant clock, for a datetime-local input. */
function toInput(ms: number, timeZone: string | null | undefined): string {
  const p = zonedParts(ms, timeZone);
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** "YYYY-MM-DDTHH:mm" on the plant clock → ISO instant; null when not a valid time. */
function fromInput(v: string, timeZone: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let t = wall - zoneOffsetMs(wall, timeZone);
  t = wall - zoneOffsetMs(t, timeZone);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** `tags`: one part's sensors — each set shows only their values (sets stay the machine's: Accept / Stop using act on the whole set). */
export function ReferencesSection({ machineId, index, tags = null }: { machineId: string; index?: number; tags?: ReadonlySet<string> | null }) {
  const sets = useReferenceSets(machineId);
  const states = useOperatingStates(machineId);
  const measurements = useMeasurements(machineId);
  const tz = useSiteTimeZone({ machineId });
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [deriveOpen, setDeriveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => sets.data ?? [], [sets.data]);
  // Default selection: a draft waiting for review, else the first accepted set.
  const selected = list.find((s) => s.id === pickedId) ?? list.find((s) => s.status === "draft") ?? list.find((s) => s.status === "accepted") ?? null;
  const byMeasurement = useMemo(() => new Map((measurements.data ?? []).map((m) => [m.id, m])), [measurements.data]);

  const stamp = (iso: string | null) => (iso ? formatLocalTime(Date.parse(iso), { date: true, seconds: false, timeZone: tz.timeZone }) : "—");

  const review = async (set: ReferenceSetDto, status: "accepted" | "retired") => {
    setBusy(true);
    setError(null);
    try {
      await reviewReference(machineId, set.id, status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the decision");
    } finally {
      setBusy(false);
    }
  };

  const setCols: Column<ReferenceSetDto>[] = [
    {
      key: "name",
      header: "Set of normal values",
      render: (s) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">{s.name}</span>
          <span className="ast-cell-sub mon-one-line" title={s.basis}>
            {s.basis}
          </span>
        </span>
      ),
    },
    { key: "state", header: "Machine state", width: "140px", render: (s) => s.state?.name ?? <span className="ast-muted">—</span> },
    { key: "status", header: "Status", width: "140px", render: (s) => <StatusTag tone={STATUS[s.status].tone} label={STATUS[s.status].label} /> },
    {
      key: "window",
      header: "From readings taken",
      width: "190px",
      render: (s) =>
        s.windowFrom ? (
          <span className="ast-cell-stack mon-nowrap">
            <span className="ast-num">{stamp(s.windowFrom)}</span>
            <span className="ast-cell-sub ast-num">to {stamp(s.windowTo)}</span>
          </span>
        ) : (
          <span className="ast-muted">—</span>
        ),
    },
    {
      key: "values",
      header: "Sensors",
      width: "72px",
      render: (s) => <span className="ast-num">{tags ? s.values.filter((v) => tags.has(v.tag)).length : s.values.length}</span>,
    },
    {
      key: "created",
      header: "Created",
      width: "170px",
      render: (s) => (
        <span className="ast-cell-stack mon-nowrap">
          <span className="ast-num">{stamp(s.createdAt)}</span>
          <span className="ast-cell-sub">{s.createdBy ?? "—"}</span>
        </span>
      ),
    },
    {
      key: "accepted",
      header: "Accepted",
      width: "170px",
      render: (s) =>
        s.acceptedAt ? (
          <span className="ast-cell-stack mon-nowrap">
            <span className="ast-num">{stamp(s.acceptedAt)}</span>
            <span className="ast-cell-sub">{s.acceptedBy ?? "—"}</span>
          </span>
        ) : (
          <span className="ast-muted">—</span>
        ),
    },
  ];

  return (
    <Section
      id={REFERENCES_SECTION_ID}
      index={index}
      title="Normal values"
      right={
        <PillButton variant="secondary" disabled={!states.data?.states.length} onClick={() => setDeriveOpen(true)}>
          Work out from readings
        </PillButton>
      }
    >
      {error && (
        <p className="pg-diag-missing" role="alert">
          {error}
        </p>
      )}
      {list.length === 0 ? (
        <p className="pg-diag-missing">{sets.isLoading ? "Loading normal values…" : sets.error ? `Normal values could not load: ${sets.error}` : "No normal values saved yet."}</p>
      ) : (
        <Table
          className="pg-dx-table mon-table"
          columns={setCols}
          data={list}
          keyExtractor={(s) => String(s.id)}
          onRowClick={(s) => setPickedId(s.id)}
          selectedId={selected ? String(selected.id) : undefined}
        />
      )}
      {selected && (
        <ReferenceValues
          set={selected}
          accepted={selected.status === "draft" ? (list.find((s) => s.status === "accepted" && s.state?.id === selected.state?.id) ?? null) : null}
          byMeasurement={byMeasurement}
          tags={tags}
          actions={
            <div className="mon-actions">
              {selected.status === "draft" && (
                <PillButton variant="primary" disabled={busy || selected.values.length === 0} onClick={() => void review(selected, "accepted")}>
                  Accept
                </PillButton>
              )}
              {selected.status !== "retired" && (
                <PillButton variant="secondary" disabled={busy} onClick={() => void review(selected, "retired")}>
                  Stop using
                </PillButton>
              )}
            </div>
          }
        />
      )}
      {deriveOpen && states.data && (
        <DeriveDialog
          machineId={machineId}
          states={states.data.states}
          currentStateId={states.data.periods.find((p) => p.endedAt === null)?.stateId ?? null}
          timeZone={tz.timeZone}
          onClose={() => setDeriveOpen(false)}
          onDerived={(s) => {
            setPickedId(s.id);
            setDeriveOpen(false);
          }}
        />
      )}
    </Section>
  );
}

/* ---------------------------------- Values --------------------------------- */

type ValueRow = ReferenceSetDto["values"][number] & { m: MeasurementDto | undefined; now: ReferenceSetDto["values"][number] | undefined };

function ReferenceValues({
  set,
  accepted,
  byMeasurement,
  tags,
  actions,
}: {
  set: ReferenceSetDto;
  /** For a draft: the accepted set of the same state it would replace. */
  accepted: ReferenceSetDto | null;
  byMeasurement: Map<string, MeasurementDto>;
  tags: ReadonlySet<string> | null;
  actions: React.ReactNode;
}) {
  const nowBy = useMemo(() => new Map((accepted?.values ?? []).map((v) => [v.measurementId, v])), [accepted]);
  const rows: ValueRow[] = set.values.filter((v) => !tags || tags.has(v.tag)).map((v) => ({ ...v, m: byMeasurement.get(v.measurementId), now: nowBy.get(v.measurementId) }));
  const num = (v: number | null, r: ValueRow) => fmtNumber(v, r.m?.decimals);
  const unit = (r: ValueRow) => (r.m?.unit && r.m.unit !== "state" ? ` ${r.m.unit}` : "");
  const range = (lo: number | null, hi: number | null, r: ValueRow) =>
    lo === null && hi === null ? "—" : lo === null ? `up to ${num(hi!, r)}` : hi === null ? `${num(lo, r)} or more` : `${num(lo, r)} – ${num(hi, r)}`;

  const cols: Column<ValueRow>[] = [
    {
      key: "m",
      header: "Sensor",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">{r.m?.name ? plainWords(r.m.name) : r.tag}</span>
          <span className="ast-cell-sub ast-num">{r.tag}</span>
        </span>
      ),
    },
    { key: "expected", header: "Expected", width: "130px", render: (r) => <span className="ast-num">{r.expected === null ? "—" : `${num(r.expected, r)}${unit(r)}`}</span> },
    { key: "range", header: "Normal range", width: "170px", render: (r) => <span className="ast-num">{range(r.lo, r.hi, r)}</span> },
    { key: "samples", header: "Readings used", width: "84px", render: (r) => <span className="ast-num">{r.samples ?? "—"}</span> },
    ...(accepted
      ? ([
          {
            key: "now",
            header: "In use now",
            width: "170px",
            render: (r) =>
              r.now ? (
                <span className="ast-cell-stack">
                  <span className="ast-num">{r.now.expected === null ? "—" : `${num(r.now.expected, r)}${unit(r)}`}</span>
                  <span className="ast-cell-sub ast-num">{range(r.now.lo, r.now.hi, r)}</span>
                </span>
              ) : (
                <span className="ast-muted">—</span>
              ),
          },
          {
            key: "delta",
            header: "Change",
            width: "110px",
            render: (r) => {
              if (r.expected === null || r.now?.expected == null) return <span className="ast-muted">—</span>;
              const d = r.expected - r.now.expected;
              return <span className="ast-num">{`${d >= 0 ? "+" : "−"}${num(Math.abs(d), r)}${unit(r)}`}</span>;
            },
          },
        ] as Column<ValueRow>[])
      : []),
  ];

  return (
    <>
      <div className="mon-subhead">
        <h4 className="mon-subhead-title">
          {set.name}
          {set.state ? ` · ${set.state.name}` : ""}
          {accepted ? ` · compared with ${accepted.name}` : ""}
        </h4>
        {actions}
      </div>
      {rows.length === 0 ? (
        <p className="pg-diag-missing">No values: no usable readings in this window while the machine was in this state.</p>
      ) : (
        <Table className="pg-dx-table mon-table" columns={cols} data={rows} keyExtractor={(r) => r.measurementId} />
      )}
    </>
  );
}

/* ---------------------------------- Derive --------------------------------- */

function DeriveDialog({
  machineId,
  states,
  currentStateId,
  timeZone,
  onClose,
  onDerived,
}: {
  machineId: string;
  states: Array<{ id: number; name: string }>;
  /** The state the machine is in now (its open state period): the default choice. */
  currentStateId: number | null;
  timeZone: string | null | undefined;
  onClose: () => void;
  onDerived: (s: ReferenceSetDto) => void;
}) {
  const [stateId, setStateId] = useState(String(currentStateId ?? states[0]?.id ?? ""));
  const [from, setFrom] = useState(() => toInput(Date.now() - 24 * 3_600_000, timeZone));
  const [to, setTo] = useState(() => toInput(Date.now(), timeZone));
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const f = fromInput(from, timeZone);
    const t = fromInput(to, timeZone);
    if (!f || !t || Date.parse(f) >= Date.parse(t)) {
      setError("Pick a window: From must be before To.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onDerived(await deriveReference(machineId, { stateId: Number(stateId), from: f, to: t, name: name.trim() || undefined }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not work out the values");
    } finally {
      setBusy(false);
    }
  };

  const input = (value: string, set: (v: string) => void) =>
    function DateTimeInput(id: string, d: string | undefined) {
      return <input id={id} aria-describedby={d} className="ui-input" type="datetime-local" value={value} onChange={(e) => set(e.target.value)} />;
    };

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title="Work out normal values from past readings"
      subtitle="Takes the average and usual spread of good readings between the two times, counting only while the machine was in the chosen state. Not used until someone accepts it."
      onSubmit={() => void submit()}
      footer={
        <>
          <PillButton type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" variant="primary" disabled={busy || !stateId}>
            Work out
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="Machine state" required>
          {(id, d) => <Select id={id} describedBy={d} value={stateId} onChange={setStateId} options={states.map((s) => ({ value: String(s.id), label: s.name }))} />}
        </Field>
        <Field label="Name">{(id, d) => <TextInput id={id} describedBy={d} value={name} onChange={setName} placeholder="Made from the time range" />}</Field>
        <Field label="From" required>
          {input(from, setFrom)}
        </Field>
        <Field label="To" required>
          {input(to, setTo)}
        </Field>
      </FieldGrid>
      {error && <FormNote tone="bad">{error}</FormNote>}
    </Dialog>
  );
}
