import { Hono } from "hono";
import { listRoles } from "@backend/services/user-service";

/** /api/roles */
export const roles = new Hono();


roles.get("/", async () => {
  try {
    const data = await listRoles();
    return Response.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load roles";
    return Response.json({ error: { code: "ROLES_FETCH_ERROR", message } }, { status: 500 });
  }
});
