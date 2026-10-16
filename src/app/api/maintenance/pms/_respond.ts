import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionUser } from "@/server/services/auth-service";
import { PmsInputError, PmsPermissionError } from "@/server/services/pms-service";

/** Shared envelope for the planned-maintenance routes. */
export function fail(error: unknown, code: string, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (error instanceof PmsPermissionError) return NextResponse.json({ error: { code: "FORBIDDEN", message } }, { status: 403 });
  const bad = error instanceof PmsInputError;
  return NextResponse.json({ error: { code: bad ? "INVALID_INPUT" : code, message } }, { status: bad ? 400 : 500 });
}

export const currentUser = (request: NextRequest) => sessionUser(request.cookies.get(SESSION_COOKIE)?.value);

export const signedOut = () => NextResponse.json({ error: { code: "NOT_SIGNED_IN", message: "Sign in to change maintenance work." } }, { status: 401 });
