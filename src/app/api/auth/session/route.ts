import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionUser } from "@/server/services/auth-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/auth/session → the signed-in user id, or 401. */
export async function GET(request: NextRequest) {
  try {
    const userId = await sessionUser(request.cookies.get(SESSION_COOKIE)?.value);
    if (!userId) return NextResponse.json({ error: { code: "NOT_SIGNED_IN", message: "Not signed in." } }, { status: 401 });
    return NextResponse.json({ data: { userId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Session check failed";
    return NextResponse.json({ error: { code: "SESSION_FAILED", message } }, { status: 500 });
  }
}
