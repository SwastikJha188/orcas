import { NextRequest, NextResponse } from "next/server";
import { UpdateUserInput, UserServiceError, deleteUser, getUserById, updateUser } from "@/server/services/user-service";
import { AccessError, assertCanChangeUser, assertCanDeleteUser, requireActor, scopedUser } from "@/server/services/access-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { SESSION_COOKIE } from "@/server/services/auth-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const scope = await requestScope(request);
    const found = await getUserById(id);
    const data = found && scopedUser(scope, found);
    if (!data) {
      return NextResponse.json({ error: { code: "USER_NOT_FOUND", message: `User '${id}' not found` } }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load user";
    return NextResponse.json({ error: { code: "USER_FETCH_ERROR", message } }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const actor = await requireActor(token);
    const body = (await request.json()) as UpdateUserInput;
    await assertCanChangeUser(actor, id, body);
    const data = await updateUser(id, body, {
      // Access to plants the editor does not manage is left as it was.
      keepPlantIds: actor.allPlants ? undefined : (plantId) => !actor.plants.has(plantId),
      keepSessionToken: id === actor.id ? token : undefined,
    });
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UserServiceError || error instanceof AccessError ? error.status : 500;
    const code = error instanceof AccessError ? error.code : "USER_UPDATE_ERROR";
    const message = error instanceof Error ? error.message : "Failed to update user";
    return NextResponse.json({ error: { code, message } }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requireActor(request.cookies.get(SESSION_COOKIE)?.value);
    await assertCanDeleteUser(actor, id);
    await deleteUser(id);
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    const status = error instanceof UserServiceError || error instanceof AccessError ? error.status : 500;
    const code = error instanceof AccessError ? error.code : "USER_DELETE_ERROR";
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return NextResponse.json({ error: { code, message } }, { status });
  }
}
