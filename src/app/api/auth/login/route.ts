import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS, signIn } from "@/server/services/auth-service";

export const runtime = "nodejs";

/** POST /api/auth/login { email, password } → opens a session (httpOnly cookie). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
    const email = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Email and password are required." } }, { status: 400 });
    }
    const session = await signIn(email, password);
    if (!session) {
      return NextResponse.json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } }, { status: 401 });
    }
    const res = NextResponse.json({ data: { userId: session.userId } });
    res.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_DAYS * 86_400,
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-in failed";
    return NextResponse.json({ error: { code: "SIGN_IN_FAILED", message } }, { status: 500 });
  }
}
