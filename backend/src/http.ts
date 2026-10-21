import { query } from "@backend/db";
import { SESSION_COOKIE, sessionUser } from "@backend/services/auth-service";
import { AccessError, scopeForToken, type Scope } from "@backend/services/access-service";
import { InputError, NotFoundError } from "@backend/errors";

/** `{ data }` envelope. */
export const ok = <T>(data: T, init?: ResponseInit) => Response.json({ data }, init);

/** `{ error: { code, message } }` envelope. */
export function fail(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

/** Maps a thrown error onto the envelope. */
export function failFrom(error: unknown, code: string) {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof InputError) return fail(400, "INVALID_INPUT", message);
  if (error instanceof NotFoundError) return fail(404, "NOT_FOUND", message);
  if (error instanceof AccessError) return fail(error.status, error.code, message);
  console.error(`[api] ${code}:`, message);
  return fail(500, code, message);
}

/** The access failure of `error` as a response, or null when it is another error. */
export const accessFail = (error: unknown) => (error instanceof AccessError ? fail(error.status, error.code, error.message) : null);

/** A cookie of the request, or undefined. */
export function readCookie(request: Request, name: string): string | undefined {
  const m = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** Which plants' data this request may read (see access-service `scopeForToken`). */
export const requestScope = (request: Request): Promise<Scope> => scopeForToken(readCookie(request, SESSION_COOKIE));

export const currentUserId = (request: Request) => sessionUser(readCookie(request, SESSION_COOKIE));

/**
 * Allows database administration (migrations, specification import, seeding):
 * a signed-in user whose role may manage plants, or any caller on a
 * development server.
 */
export async function canAdminister(request: Request): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  const userId = await currentUserId(request);
  if (!userId) return false;
  const res = await query<{ ok: boolean }>(
    "SELECT r.can_manage_plants AS ok FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1",
    [userId],
  );
  return Boolean(res.rows[0]?.ok);
}

/**
 * The Oswar super administrator (a role with all_plants), or a signed-out script on a
 * development server. Simulation controls belong to it alone.
 */
export async function isSuperAdmin(request: Request): Promise<boolean> {
  const userId = await currentUserId(request);
  if (!userId) return process.env.NODE_ENV !== "production";
  const res = await query<{ ok: boolean }>("SELECT r.all_plants AS ok FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1", [userId]);
  return Boolean(res.rows[0]?.ok);
}

export const forbidden = () => fail(403, "FORBIDDEN", "Your role may not administer the database.");

/** Numeric query parameter, or the fallback when missing / not a number. */
export function numParam(request: Request, name: string, fallback: number): number {
  const raw = new URL(request.url).searchParams.get(name);
  if (raw === null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** ISO / epoch-ms time query parameter as a Date, or null. */
export function timeParam(request: Request, name: string): Date | null {
  const raw = new URL(request.url).searchParams.get(name);
  if (!raw) return null;
  const d = /^\d+$/.test(raw) ? new Date(Number(raw)) : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
