import { Hono } from "hono";
import { accessFail, readCookie, requestScope } from "@backend/http";
import { AccessError, assertCanChangeUser, assertCanDeleteUser, plantFilter, requireActor, scopedUser } from "@backend/services/access-service";
import { SESSION_COOKIE } from "@backend/services/auth-service";
import { CreateUserInput, UpdateUserInput, UserServiceError, createUser, deleteUser, getUserById, listUsers, updateUser } from "@backend/services/user-service";

/** /api/users */
export const users = new Hono();


users.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const plantId = new URL(request.url).searchParams.get("plantId") || undefined;
    const scope = await requestScope(request);
    plantFilter(scope, plantId);
    const data = (await listUsers(plantId)).map((u) => scopedUser(scope, u)).filter((u) => u !== null);
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load users";
    return Response.json({ error: { code: "USERS_FETCH_ERROR", message } }, { status: 500 });
  }
});

users.post("/", async (c) => {
  const request = c.req.raw;
  try {
    const actor = await requireActor(readCookie(request, SESSION_COOKIE));
    const body = (await request.json()) as CreateUserInput;
    await assertCanChangeUser(actor, null, body);
    const data = await createUser(body);
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    const status = error instanceof UserServiceError || error instanceof AccessError ? error.status : 500;
    const code = error instanceof AccessError ? error.code : "USER_CREATE_ERROR";
    const message = error instanceof Error ? error.message : "Failed to create user";
    return Response.json({ error: { code, message } }, { status });
  }
});

users.get("/:id", async (c) => {
  const request = c.req.raw;
  try {
    const { id } = c.req.param();
    const scope = await requestScope(request);
    const found = await getUserById(id);
    const data = found && scopedUser(scope, found);
    if (!data) {
      return Response.json({ error: { code: "USER_NOT_FOUND", message: `User '${id}' not found` } }, { status: 404 });
    }
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load user";
    return Response.json({ error: { code: "USER_FETCH_ERROR", message } }, { status: 500 });
  }
});

users.patch("/:id", async (c) => {
  const request = c.req.raw;
  try {
    const { id } = c.req.param();
    const token = readCookie(request, SESSION_COOKIE);
    const actor = await requireActor(token);
    const body = (await request.json()) as UpdateUserInput;
    await assertCanChangeUser(actor, id, body);
    const data = await updateUser(id, body, {
      // Access to plants the editor does not manage is left as it was.
      keepPlantIds: actor.allPlants ? undefined : (plantId) => !actor.plants.has(plantId),
      keepSessionToken: id === actor.id ? token : undefined,
    });
    return Response.json({ data });
  } catch (error) {
    const status = error instanceof UserServiceError || error instanceof AccessError ? error.status : 500;
    const code = error instanceof AccessError ? error.code : "USER_UPDATE_ERROR";
    const message = error instanceof Error ? error.message : "Failed to update user";
    return Response.json({ error: { code, message } }, { status });
  }
});

users.delete("/:id", async (c) => {
  const request = c.req.raw;
  try {
    const { id } = c.req.param();
    const actor = await requireActor(readCookie(request, SESSION_COOKIE));
    await assertCanDeleteUser(actor, id);
    await deleteUser(id);
    return Response.json({ data: { id, deleted: true } });
  } catch (error) {
    const status = error instanceof UserServiceError || error instanceof AccessError ? error.status : 500;
    const code = error instanceof AccessError ? error.code : "USER_DELETE_ERROR";
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return Response.json({ error: { code, message } }, { status });
  }
});
