import { Hono } from "hono";
import { routes } from "@backend/routes";

/**
 * The ULTRON API: every route under /api, with the `{ data }` /
 * `{ error: { code, message } }` envelope also for unknown paths and errors
 * no handler caught.
 */
export const app = new Hono();

for (const [path, router] of routes) app.route(`/api${path}`, router);

app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: `No API route ${c.req.method} ${c.req.path}` } }, 404));

app.onError((error, c) => {
  console.error(`[api] ${c.req.method} ${c.req.path}:`, error);
  return c.json({ error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Request failed" } }, 500);
});
