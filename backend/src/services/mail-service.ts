import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outgoing email over SMTP. Settings come from the environment (.env.local):
 * SMTP_HOST, SMTP_PORT (587 STARTTLS, 465 TLS), SMTP_USER, SMTP_PASS and
 * MAIL_FROM (defaults to SMTP_USER). For oswarteck.com (Microsoft 365) that is
 * smtp.office365.com:587 with a mailbox that has SMTP AUTH enabled.
 */

export class MailNotConfiguredError extends Error {}

let transport: Transporter | null = null;

function transporter(): Transporter {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new MailNotConfiguredError("SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS).");
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({ host, port, secure: port === 465, requireTLS: port !== 465, auth: { user, pass } });
  }
  return transport;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

/** Sends one email; resolves once the SMTP server accepted it. */
export async function sendMail(message: MailMessage): Promise<void> {
  const t = transporter();
  const from = process.env.MAIL_FROM?.trim() || process.env.SMTP_USER!.trim();
  await t.sendMail({ from, ...message });
}
