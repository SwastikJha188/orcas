import { readCookie } from "@backend/http";
import { SESSION_COOKIE, sessionUser } from "@backend/services/auth-service";
import { PmsInputError, PmsPermissionError } from "@backend/services/pms-service";

/** Shared envelope for the planned-maintenance routes. */
export function fail(error: unknown, code: string, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (error instanceof PmsPermissionError) return Response.json({ error: { code: "FORBIDDEN", message } }, { status: 403 });
  const bad = error instanceof PmsInputError;
  return Response.json({ error: { code: bad ? "INVALID_INPUT" : code, message } }, { status: bad ? 400 : 500 });
}

export const currentUser = (request: Request) => sessionUser(readCookie(request, SESSION_COOKIE));

export const signedOut = () => Response.json({ error: { code: "NOT_SIGNED_IN", message: "Sign in to change maintenance work." } }, { status: 401 });
