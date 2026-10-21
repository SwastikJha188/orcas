import { Hono } from "hono";
import { query } from "@backend/db";
import { failFrom, ok, readCookie } from "@backend/http";
import { InputError, NotFoundError } from "@backend/errors";
import { AccessError, requireActor, type Actor } from "@backend/services/access-service";
import { SESSION_COOKIE } from "@backend/services/auth-service";
import { sendMail } from "@backend/services/mail-service";

/**
 * /api/support/tickets — a plant's people ask Oswar Teck for help.
 *
 *   GET            the super administrator: every ticket (optionally one plant);
 *                  anyone else: the tickets of their own plants
 *   POST           raise a ticket for one of your plants (role can_raise_tickets)
 *   PATCH /:id     the super administrator answers it or changes its status
 *
 * Each new ticket is emailed to SUPPORT_NOTIFY_TO (else DEMO_REQUEST_NOTIFY_TO)
 * with Reply-To set to the person who raised it; the outcome is stored on the
 * row (notified_at / notify_error).
 */
export const support = new Hono();

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export interface SupportTicket {
  id: number;
  plantId: string;
  plantName: string;
  machineId: string | null;
  machineName: string | null;
  subject: string;
  body: string;
  urgent: boolean;
  status: string;
  statusLabel: string;
  raisedBy: { id: string; name: string; email: string } | null;
  reply: string | null;
  repliedBy: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const SELECT = `
  SELECT t.*, p.name AS plant_name, m.name AS machine_name, s.label AS status_label,
         u.full_name AS raised_name, u.email AS raised_email, r.full_name AS replied_name
    FROM support_tickets t
    JOIN plants p ON p.id = t.plant_id
    JOIN support_ticket_statuses s ON s.id = t.status_id
    LEFT JOIN machines m ON m.id = t.machine_id
    LEFT JOIN users u ON u.id = t.raised_by_user_id
    LEFT JOIN users r ON r.id = t.replied_by_user_id`;

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

function mapTicket(r: Record<string, unknown>): SupportTicket {
  return {
    id: Number(r.id),
    plantId: String(r.plant_id),
    plantName: String(r.plant_name),
    machineId: (r.machine_id as string) ?? null,
    machineName: (r.machine_name as string) ?? null,
    subject: String(r.subject),
    body: String(r.body),
    urgent: Boolean(r.urgent),
    status: String(r.status_id),
    statusLabel: String(r.status_label),
    raisedBy: r.raised_by_user_id ? { id: String(r.raised_by_user_id), name: String(r.raised_name ?? ""), email: String(r.raised_email ?? "") } : null,
    reply: (r.reply as string) ?? null,
    repliedBy: (r.replied_name as string) ?? null,
    repliedAt: iso(r.replied_at),
    createdAt: iso(r.created_at)!,
    updatedAt: iso(r.updated_at)!,
  };
}

const actorOf = (request: Request) => requireActor(readCookie(request, SESSION_COOKIE));

async function canRaise(actor: Actor): Promise<boolean> {
  const row = (await query<{ ok: boolean }>("SELECT r.can_raise_tickets AS ok FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1", [actor.id])).rows[0];
  return Boolean(row?.ok);
}

async function getTicket(id: number): Promise<SupportTicket | null> {
  const row = (await query(`${SELECT} WHERE t.id = $1`, [id])).rows[0];
  return row ? mapTicket(row) : null;
}

/** Emails a new ticket to the support mailbox; never throws (the ticket is already stored). */
async function notify(t: SupportTicket): Promise<void> {
  try {
    const to = (process.env.SUPPORT_NOTIFY_TO ?? process.env.DEMO_REQUEST_NOTIFY_TO)?.trim();
    if (!to) throw new Error("SUPPORT_NOTIFY_TO is not set.");
    await sendMail({
      to,
      replyTo: t.raisedBy?.email || undefined,
      subject: `${t.urgent ? "[Urgent] " : ""}ULTRON support #${t.id}: ${t.subject}`,
      text: [
        `Plant: ${t.plantName}`,
        `Machine: ${t.machineName ?? "Not about one machine"}`,
        `Raised by: ${t.raisedBy ? `${t.raisedBy.name} <${t.raisedBy.email}>` : "Unknown"}`,
        `Urgent: ${t.urgent ? "Yes" : "No"}`,
        "",
        t.body,
        "",
        `Ticket #${t.id}. Answer it in ULTRON (Configure › Support) or reply to this email.`,
      ].join("\n"),
    });
    await query("UPDATE support_tickets SET notified_at = now(), notify_error = NULL WHERE id = $1", [t.id]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[api] support ticket #${t.id} not emailed:`, message);
    await query("UPDATE support_tickets SET notify_error = $2 WHERE id = $1", [t.id, message.slice(0, 1000)]).catch(() => undefined);
  }
}

support.get("/tickets", async (c) => {
  try {
    const actor = await actorOf(c.req.raw);
    const plantId = new URL(c.req.raw.url).searchParams.get("plantId");
    const plants = actor.allPlants ? (plantId ? [plantId] : null) : [...actor.plants.keys()].filter((p) => !plantId || p === plantId);
    const rows = await query(`${SELECT} WHERE ($1::varchar[] IS NULL OR t.plant_id = ANY($1)) ORDER BY (t.status_id = 'closed'), t.created_at DESC LIMIT 500`, [plants]);
    return ok(rows.rows.map(mapTicket));
  } catch (error) {
    return failFrom(error, "SUPPORT_TICKETS_FAILED");
  }
});

support.post("/tickets", async (c) => {
  try {
    const actor = await actorOf(c.req.raw);
    if (!(await canRaise(actor))) throw new AccessError("Your role may not raise support tickets.");
    const b = ((await c.req.raw.json().catch(() => null)) as Record<string, unknown> | null) ?? {};
    const plantId = text(b.plantId, 64);
    const subject = text(b.subject, 200);
    const body = text(b.body, 8000);
    const machineId = text(b.machineId, 64) || null;
    if (!subject) throw new InputError("Say in a few words what you need help with.");
    if (!body) throw new InputError("Describe the problem so the support team can help.");
    if (!plantId || (!actor.allPlants && !actor.plants.has(plantId))) throw new AccessError("You can only raise tickets for your own plants.");
    if (machineId) {
      const m = (await query<{ plant_id: string }>("SELECT plant_id FROM machines WHERE id = $1", [machineId])).rows[0];
      if (!m || m.plant_id !== plantId) throw new InputError("That machine is not in this plant.");
    }
    const id = (
      await query<{ id: number }>(
        "INSERT INTO support_tickets (plant_id, machine_id, raised_by_user_id, subject, body, urgent) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [plantId, machineId, actor.id, subject, body, Boolean(b.urgent)],
      )
    ).rows[0].id;
    const ticket = (await getTicket(id))!;
    void notify(ticket);
    return ok(ticket, { status: 201 });
  } catch (error) {
    return failFrom(error, "SUPPORT_TICKET_CREATE_FAILED");
  }
});

support.patch("/tickets/:id", async (c) => {
  try {
    const actor = await actorOf(c.req.raw);
    if (!actor.allPlants) throw new AccessError("Only the Oswar support team answers tickets.");
    const id = Number(c.req.param("id"));
    const current = Number.isInteger(id) ? await getTicket(id) : null;
    if (!current) throw new NotFoundError(`Ticket ${c.req.param("id")} not found`);
    const b = ((await c.req.raw.json().catch(() => null)) as Record<string, unknown> | null) ?? {};
    const status = b.status === undefined ? null : text(b.status, 16);
    const reply = b.reply === undefined ? null : text(b.reply, 8000);
    if (status && !["open", "answered", "closed"].includes(status)) throw new InputError("Status must be open, answered or closed.");
    await query(
      `UPDATE support_tickets
          SET status_id = COALESCE($2, CASE WHEN $3::text IS NOT NULL AND $3 <> '' THEN 'answered' ELSE status_id END),
              reply = COALESCE($3, reply),
              replied_by_user_id = CASE WHEN $3::text IS NOT NULL THEN $4 ELSE replied_by_user_id END,
              replied_at = CASE WHEN $3::text IS NOT NULL THEN now() ELSE replied_at END,
              updated_at = now()
        WHERE id = $1`,
      [id, status, reply, actor.id],
    );
    return ok(await getTicket(id));
  } catch (error) {
    return failFrom(error, "SUPPORT_TICKET_UPDATE_FAILED");
  }
});
