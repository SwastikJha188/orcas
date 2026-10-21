import { Hono } from "hono";
import { query } from "@backend/db";
import { failFrom, ok, readCookie } from "@backend/http";
import { requireActor } from "@backend/services/access-service";
import { SESSION_COOKIE } from "@backend/services/auth-service";

/** /api/assetiq/questions — the signed-in account's suggested AssetIQ questions (assetiq_questions), in order. */
export const assetiq = new Hono();

export interface AssetIqQuestion {
  id: number;
  question: string;
  intent: string;
  params: Record<string, unknown>;
}

assetiq.get("/questions", async (c) => {
  try {
    const actor = await requireActor(readCookie(c.req.raw, SESSION_COOKIE));
    const rows = await query<{ id: number; question: string; intent: string; params: Record<string, unknown> }>(
      "SELECT id, question, intent, params FROM assetiq_questions WHERE user_id = $1 ORDER BY sort_order",
      [actor.id],
    );
    return ok(rows.rows.map((r) => ({ id: r.id, question: r.question, intent: r.intent, params: r.params ?? {} })) satisfies AssetIqQuestion[]);
  } catch (error) {
    return failFrom(error, "ASSETIQ_QUESTIONS_FAILED");
  }
});
