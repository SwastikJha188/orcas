import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, signOut } from "@/server/services/auth-service";

export const runtime = "nodejs";

/** POST /api/auth/logout → ends the session and clears the cookie. */
export async function POST(request: NextRequest) {
  try {
    await signOut(request.cookies.get(SESSION_COOKIE)?.value);
  } catch {
    /* the cookie is cleared regardless */
  }
  const res = NextResponse.json({ data: { signedOut: true } });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
