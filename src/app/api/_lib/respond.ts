import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/server/db";
import { SESSION_COOKIE, sessionUser } from "@/server/services/auth-service";
import { AccessError, scopeForToken, type Scope } from "@/server/services/access-service";
import { InputError, NotFoundError } from "@/server/errors";

/** `{ data }` envelope. */
export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json({ data }, init);

/** `{ error: { code, message } }` envelope. */
export function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
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

/** Which plants' data this request may read (see access-service `scopeForToken`). */
export const requestScope = (request: Request): Promise<Scope> => scopeForToken(sessionCookie(request));

/** The session cookie of a plain or Next request. */
function sessionCookie(request: Request): string | undefined {
  const next = (request as Partial<NextRequest>).cookies;
  if (next) return next.get(SESSION_COOKIE)?.value;
  const m = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export const currentUserId = (request: NextRequest) => sessionUser(request.cookies.get(SESSION_COOKIE)?.value);

/**
 * Allows database administration (migrations, specification import, seeding):
 * a signed-in user whose role may manage plants, or any caller on a
 * development server.
 */
export async function canAdminister(request: NextRequest): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  const userId = await currentUserId(request);
  if (!userId) return false;
  const res = await query<{ ok: boolean }>(
    "SELECT r.can_manage_plants AS ok FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1",
    [userId],
  );
  return Boolean(res.rows[0]?.ok);
}

export const forbidden = () => fail(403, "FORBIDDEN", "Your role may not administer the database.");

/** Numeric query parameter, or the fallback when missing / not a number. */
export function numParam(request: NextRequest, name: string, fallback: number): number {
  const raw = request.nextUrl.searchParams.get(name);
  if (raw === null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** ISO / epoch-ms time query parameter as a Date, or null. */
export function timeParam(request: NextRequest, name: string): Date | null {
  const raw = request.nextUrl.searchParams.get(name);
  if (!raw) return null;
  const d = /^\d+$/.test(raw) ? new Date(Number(raw)) : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
