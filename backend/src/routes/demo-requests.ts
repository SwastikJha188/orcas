import { Hono } from "hono";
import { query } from "@backend/db";
import { fail, failFrom, ok } from "@backend/http";
import { sendMail } from "@backend/services/mail-service";

/** /api/demo-requests — the sign-in page's "Request a demo" form; open to visitors without an account. */
export const demoRequests = new Hono();

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

interface DemoRequest {
  id: number;
  name: string;
  email: string;
  company: string;
  industry: string | null;
  message: string | null;
}

/**
 * Emails a new request to DEMO_REQUEST_NOTIFY_TO, with Reply-To set to the
 * visitor, and records the outcome on the row (notified_at / notify_error).
 * Never throws: the visitor's request is already stored.
 */
async function notify(r: DemoRequest): Promise<void> {
  try {
    const to = process.env.DEMO_REQUEST_NOTIFY_TO?.trim();
    if (!to) throw new Error("DEMO_REQUEST_NOTIFY_TO is not set.");
    await sendMail({
      to,
      replyTo: r.email,
      subject: `ULTRON demo request: ${r.company}`,
      text: [
        `Name: ${r.name}`,
        `Work email: ${r.email}`,
        `Company: ${r.company}`,
        `Industry: ${r.industry ?? "Not given"}`,
        "",
        "Machines to watch:",
        r.message ?? "Not given",
        "",
        `Request #${r.id}, sent from the ULTRON sign-in page. Reply to this email to answer the visitor.`,
      ].join("\n"),
    });
    await query("UPDATE demo_requests SET notified_at = now(), notify_error = NULL WHERE id = $1", [r.id]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[api] demo request #${r.id} not emailed:`, message);
    await query("UPDATE demo_requests SET notify_error = $2 WHERE id = $1", [r.id, message.slice(0, 1000)]).catch(() => undefined);
  }
}

demoRequests.post("/", async (c) => {
  try {
    const body = (await c.req.raw.json().catch(() => null)) as Record<string, unknown> | null;
    const name = text(body?.name, 200);
    const email = text(body?.email, 320).toLowerCase();
    const company = text(body?.company, 200);
    const industry = text(body?.industry, 100) || null;
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, 4000) || null : null;
    if (!name || !company) return fail(400, "INVALID_INPUT", "Name and company are required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, "INVALID_INPUT", "Enter a valid work email.");
    const res = await query<{ id: string }>(
      "INSERT INTO demo_requests (full_name, email, company, industry, message) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [name, email, company, industry, message],
    );
    const id = Number(res.rows[0].id);
    // The visitor does not wait on the mail server.
    void notify({ id, name, email, company, industry, message });
    return ok({ id }, { status: 201 });
  } catch (error) {
    return failFrom(error, "DEMO_REQUEST_FAILED");
  }
});
