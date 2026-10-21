"use client";

import React, { useMemo, useState } from "react";
import { Dialog, Field, FieldGrid, FormNote, PillButton, Select, Table, TextArea, TextInput, Toggle, type Column } from "@/components/ui";
import { StatusTag, type Tone } from "@/components/assets/assets-shell-ui";
import { invalidateApi, useApi } from "@/lib/api-cache";
import { formatLocalTime } from "@/lib/time";
import { useIndustrialData } from "@/providers/industrial-data-context";
import type { SupportTicket } from "@backend/routes/support";

/* ==========================================================================
   Configure › Support — a plant asks Oswar Teck for help.
     Plant people (role can_raise_tickets): raise a ticket for their plant
     (optionally about one machine) and follow its answer.
     The Oswar super administrator: every plant's tickets; answers them and
     sets their status (open → answered → closed).
   Tickets live in support_tickets; each new one is also emailed to support.
   ========================================================================== */

export const SUPPORT_URL = "/api/support/tickets";

const STATUS_TONE: Record<string, Tone> = { open: "warn", answered: "info", closed: "idle" };

async function call(url: string, method: "POST" | "PATCH", body: unknown): Promise<SupportTicket> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => null)) as { data?: SupportTicket; error?: { message: string } } | null;
  if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? `Request failed (${res.status}).`);
  invalidateApi(SUPPORT_URL);
  return json.data;
}

export function useSupportTickets() {
  return useApi<SupportTicket[]>(SUPPORT_URL);
}

export function SupportSection({ raiseOpen, onRaiseClose }: { raiseOpen: boolean; onRaiseClose: () => void }) {
  const { currentUser } = useIndustrialData();
  const superAdmin = Boolean(currentUser?.role.allPlants);
  const tickets = useSupportTickets();
  const [openId, setOpenId] = useState<number | null>(null);
  const opened = tickets.data?.find((t) => t.id === openId) ?? null;
  const when = (iso: string) => formatLocalTime(iso, { date: true, seconds: false });

  const cols: Column<SupportTicket>[] = [
    { key: "id", header: "Ticket", width: "90px", render: (t) => <span className="ast-num">#{t.id}</span> },
    {
      key: "subject",
      header: "What it is about",
      render: (t) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">{t.subject}</span>
          <span className="ast-cell-sub">{t.machineName ?? "The whole plant"}</span>
        </span>
      ),
    },
    ...(superAdmin ? [{ key: "plant", header: "Plant", width: "220px", render: (t: SupportTicket) => <span className="ast-cell-text">{t.plantName}</span> }] : []),
    {
      key: "by",
      header: "Raised by",
      width: "200px",
      render: (t) => <span className="ast-cell-text">{t.raisedBy?.name ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "160px",
      render: (t) => (
        <span className="cfg-ticket-state">
          <StatusTag tone={STATUS_TONE[t.status] ?? "idle"} label={t.statusLabel} />
          {t.urgent && t.status !== "closed" && <StatusTag tone="bad" label="Urgent" />}
        </span>
      ),
    },
    { key: "updated", header: "Updated", width: "170px", render: (t) => <span className="ast-cell-text">{when(t.updatedAt)}</span> },
  ];

  return (
    <>
      <section className="ast-card pg-table-card" aria-label="Support tickets">
        <div className="ast-card-head">
          <h2 className="ast-card-title">
            Tickets
            <span className="ast-caption">{tickets.data ? `${tickets.data.filter((t) => t.status !== "closed").length} open or answered` : ""}</span>
          </h2>
        </div>
        {!tickets.data ? (
          <div className="ast-empty">{tickets.error ? "The tickets could not be loaded. Try again." : "Loading tickets…"}</div>
        ) : tickets.data.length === 0 ? (
          <div className="ast-empty">
            {superAdmin ? "No plant has raised a ticket yet." : "No tickets yet. Raise one when you need help from the Oswar Teck support team."}
          </div>
        ) : (
          <Table className="ast-table" columns={cols} data={tickets.data} keyExtractor={(t) => String(t.id)} onRowClick={(t) => setOpenId(t.id)} />
        )}
      </section>

      {raiseOpen && <RaiseDialog onClose={onRaiseClose} onRaised={(t) => setOpenId(t.id)} />}
      {opened && <TicketDialog key={opened.id} ticket={opened} superAdmin={superAdmin} onClose={() => setOpenId(null)} />}
    </>
  );
}

function RaiseDialog({ onClose, onRaised }: { onClose: () => void; onRaised: (t: SupportTicket) => void }) {
  const { currentUser, plants, machines, selectedPlantId } = useIndustrialData();
  const myPlants = useMemo(() => {
    const ids = new Set((currentUser?.plantAccess ?? []).map((a) => a.plantId));
    return plants.filter((p) => currentUser?.role.allPlants || ids.has(p.id));
  }, [plants, currentUser]);
  const [plantId, setPlantId] = useState(myPlants.find((p) => p.id === selectedPlantId)?.id ?? myPlants[0]?.id ?? "");
  const [machineId, setMachineId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plantMachines = machines.filter((m) => m.plantId === plantId);

  const submit = async () => {
    if (!subject.trim() || !body.trim()) {
      setError("Write what it is about and describe the problem.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const t = await call(SUPPORT_URL, "POST", { plantId, machineId: machineId || null, subject, body, urgent });
      onClose();
      onRaised(t);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Raise a support ticket"
      subtitle="The Oswar Teck support team gets it by email and answers it here."
      busy={busy}
      dirty={Boolean(subject || body)}
      onSubmit={() => void submit()}
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton variant="primary" onClick={() => void submit()} loading={busy}>
            Send ticket
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        {myPlants.length > 1 && (
          <Field label="Plant" required>
            {(id, d) => <Select id={id} describedBy={d} value={plantId} onChange={(v) => { setPlantId(v); setMachineId(""); }} options={myPlants.map((p) => ({ value: p.id, label: p.name }))} />}
          </Field>
        )}
        <Field label="Machine" hint="Leave it on the whole plant when the question is not about one machine">
          {(id, d) => (
            <Select
              id={id}
              describedBy={d}
              value={machineId}
              onChange={setMachineId}
              options={[{ value: "", label: "The whole plant" }, ...plantMachines.map((m) => ({ value: m.id, label: m.name }))]}
            />
          )}
        </Field>
        <Field label="What it is about" required wide>
          {(id, d) => <TextInput id={id} describedBy={d} value={subject} onChange={setSubject} placeholder="Gateway stopped sending readings" />}
        </Field>
        <Field label="What is happening" required wide hint="What you see, since when, and what you have tried">
          {(id, d) => <TextArea id={id} describedBy={d} value={body} onChange={setBody} rows={6} maxLength={8000} />}
        </Field>
      </FieldGrid>
      <Toggle checked={urgent} onChange={setUrgent} label="Urgent" description="Production is stopped or at risk" />
      {error && <FormNote tone="bad">{error}</FormNote>}
    </Dialog>
  );
}

function TicketDialog({ ticket, superAdmin, onClose }: { ticket: SupportTicket; superAdmin: boolean; onClose: () => void }) {
  const [reply, setReply] = useState(ticket.reply ?? "");
  const [status, setStatus] = useState(ticket.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const when = (iso: string | null) => (iso ? formatLocalTime(iso, { date: true, seconds: false }) : "—");
  const dirty = superAdmin && (reply !== (ticket.reply ?? "") || status !== ticket.status);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await call(`${SUPPORT_URL}/${ticket.id}`, "PATCH", { status, ...(reply !== (ticket.reply ?? "") ? { reply } : {}) });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`#${ticket.id} · ${ticket.subject}`}
      subtitle={`${ticket.plantName} · ${ticket.machineName ?? "The whole plant"} · raised by ${ticket.raisedBy?.name ?? "—"} on ${when(ticket.createdAt)}`}
      width={640}
      busy={busy}
      dirty={dirty}
      footer={
        superAdmin ? (
          <>
            <PillButton variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </PillButton>
            <PillButton variant="primary" onClick={() => void save()} loading={busy} disabled={!dirty}>
              Save
            </PillButton>
          </>
        ) : (
          <PillButton variant="secondary" onClick={onClose}>
            Close
          </PillButton>
        )
      }
    >
      <div className="cfg-ticket-body">{ticket.body}</div>
      {superAdmin ? (
        <FieldGrid>
          <Field label="Answer" wide hint="Saving an answer marks the ticket answered">
            {(id, d) => <TextArea id={id} describedBy={d} value={reply} onChange={setReply} rows={5} maxLength={8000} />}
          </Field>
          <Field label="Status">
            {(id, d) => (
              <Select
                id={id}
                describedBy={d}
                value={status}
                onChange={setStatus}
                options={[
                  { value: "open", label: "Open" },
                  { value: "answered", label: "Answered" },
                  { value: "closed", label: "Closed" },
                ]}
              />
            )}
          </Field>
        </FieldGrid>
      ) : ticket.reply ? (
        <div className="cfg-ticket-reply">
          <span className="ast-caption">
            Answer from {ticket.repliedBy ?? "Oswar Teck"} · {when(ticket.repliedAt)}
          </span>
          <p>{ticket.reply}</p>
        </div>
      ) : (
        <p className="ast-caption">No answer yet. The support team has it by email.</p>
      )}
      {error && <FormNote tone="bad">{error}</FormNote>}
    </Dialog>
  );
}
