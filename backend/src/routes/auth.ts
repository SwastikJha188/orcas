import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { readCookie } from "@backend/http";
import { SESSION_COOKIE, sessionDays, sessionUser, signIn, signOut } from "@backend/services/auth-service";

/** /api/auth */
export const auth = new Hono();

auth.post("/login", async (c) => {
  const request = c.req.raw;
  try {
    const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
    const email = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) {
      return Response.json({ error: { code: "INVALID_INPUT", message: "Email and password are required." } }, { status: 400 });
    }
    const session = await signIn(email, password);
    if (!session) {
      return Response.json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } }, { status: 401 });
    }
    setCookie(c, SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: (await sessionDays()) * 86_400,
    });
    return c.json({ data: { userId: session.userId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-in failed";
    return Response.json({ error: { code: "SIGN_IN_FAILED", message } }, { status: 500 });
  }
});

auth.post("/logout", async (c) => {
  const request = c.req.raw;
  try {
    await signOut(readCookie(request, SESSION_COOKIE));
  } catch {
    /* the cookie is cleared regardless */
  }
  setCookie(c, SESSION_COOKIE, "", { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 0 });
  return c.json({ data: { signedOut: true } });
});

auth.get("/session", async (c) => {
  const request = c.req.raw;
  try {
    const userId = await sessionUser(readCookie(request, SESSION_COOKIE));
    if (!userId) return Response.json({ error: { code: "NOT_SIGNED_IN", message: "Not signed in." } }, { status: 401 });
    return Response.json({ data: { userId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Session check failed";
    return Response.json({ error: { code: "SESSION_FAILED", message } }, { status: 500 });
  }
});
